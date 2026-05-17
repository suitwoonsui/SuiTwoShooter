// ==========================================
// Transaction execution helpers (game-owned)
// ==========================================
// Execution goes through platform channel (POST /api/channel/execute). Reads/wait use getSonarClient() where used.

import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { getSonarClient, platformTxClient, platformSonarClient } from '@/lib/services/platform/client/platform-client';

export interface ExecuteTransactionOptions {
  retries?: number;
  timeout?: number;
  verifyStatus?: boolean;
  logger?: {
    info?: (message: string, data?: unknown) => void;
    warn?: (message: string, data?: unknown) => void;
    error?: (message: string, data?: unknown) => void;
  };
  excludeCoinIds?: string[];
  minBalanceForGas?: number | bigint;
}

export interface ExecuteTransactionResult {
  digest: string;
  effects: unknown;
  events?: unknown[];
  objectChanges?: unknown[];
}

export interface EstimateGasBudgetOptions {
  bufferPercent?: number;
  maxBudget?: number;
  minBudget?: number;
  provisionalBudget?: number;
}

const DEFAULT_BUFFER = 1.2;
const DEFAULT_MAX_BUDGET = 100_000_000;
const DEFAULT_MIN_BUDGET = 50_000_000;
const DEFAULT_PROVISIONAL_BUDGET = 100_000_000;

export async function estimateGasBudgetFromDryRun(
  client: SuiClient,
  txb: Transaction,
  options: EstimateGasBudgetOptions = {}
): Promise<number> {
  const bufferMult = options.bufferPercent != null ? 1 + options.bufferPercent / 100 : DEFAULT_BUFFER;
  const maxBudget = options.maxBudget ?? DEFAULT_MAX_BUDGET;
  const minBudget = options.minBudget ?? DEFAULT_MIN_BUDGET;
  const provisionalBudget = options.provisionalBudget ?? DEFAULT_PROVISIONAL_BUDGET;

  txb.setGasBudget(provisionalBudget);
  try {
    const built = await txb.build({ client });
    const dryRunResult = await client.dryRunTransactionBlock({ transactionBlock: built });
    const effects = dryRunResult?.effects as { gasUsed?: { computationCost?: string; storageCost?: string; storageRebate?: string }; status?: { status?: string } } | undefined;
    if (effects?.gasUsed) {
      const g = effects.gasUsed;
      const computation = BigInt(g.computationCost ?? 0);
      const storage = BigInt(g.storageCost ?? 0);
      const rebate = BigInt(g.storageRebate ?? 0);
      const totalMist = computation + storage - rebate;
      const withBuffer = Math.ceil(Number(totalMist) * bufferMult);
      const budget = Math.min(maxBudget, Math.max(minBudget, withBuffer));
      txb.setGasBudget(budget);
      return budget;
    }
  } catch {
    // Dry run can fail; use min budget
  }
  txb.setGasBudget(minBudget);
  return minBudget;
}

const KNOWN_LOCKED_COINS = [
  '0x5e8987f1d1a89953d239f6be8c5ae53c401b25a253fc00dd25cba64a7772fc3a',
  '0x059b1843b59dd50f48aa1f810a51624e1b41b57c7ab9bc6f65ffb1d4397f6c31',
];

export async function executeTransactionWithFinalization(
  signer: Ed25519Keypair,
  txb: Transaction,
  options: ExecuteTransactionOptions = {}
): Promise<ExecuteTransactionResult> {
  const {
    retries = 3,
    timeout = 60_000,
    verifyStatus = true,
    logger,
    minBalanceForGas,
  } = options;

  const log = {
    info: logger?.info ?? (() => {}),
    warn: logger?.warn ?? (() => {}),
    error: logger?.error ?? (() => {}),
  };

  const excludeCoinIds = options.excludeCoinIds ?? KNOWN_LOCKED_COINS;
  const attemptedCoins = new Set<string>();
  let attempts = retries;
  let result: { digest: string; effects: unknown; events?: unknown[]; objectChanges?: unknown[] } | null = null;
  let lastError: string | null = null;
  let allow504Retry = true;
  let selectedCoin: { coinObjectId: string; version: string; digest: string; balance: string } | null = null;

  while (attempts > 0 || allow504Retry) {
    try {
      const senderAddress = signer.toSuiAddress();
      txb.setSender(senderAddress);
      const sonar = getSonarClient();
      const coins = (await sonar.getCoins({
        owner: senderAddress,
        coinType: '0x2::sui::SUI',
      })) as { data?: Array<{ coinObjectId: string; version: string; digest: string; balance: string }> };

      if (attempts < retries) attemptedCoins.clear();
      if (!coins.data?.length) throw new Error('No SUI coins available for gas');

      const txData = (txb as Transaction & { getData?: () => { gasData?: { budget?: string | number | bigint } } }).getData?.();
      const rawBudget = txData?.gasData?.budget != null ? BigInt(txData.gasData.budget) : null;
      const budgetFromTx = rawBudget != null && rawBudget > 0n ? rawBudget : null;
      const requiredBalanceForGas =
        minBalanceForGas != null && BigInt(minBalanceForGas) > 0n ? BigInt(minBalanceForGas)
        : (budgetFromTx ?? 400_000_000n);
      const effectiveMinBalance = requiredBalanceForGas > 0n ? requiredBalanceForGas : 1n;

      let availableCoins = coins.data.filter(coin => {
        const balance = BigInt(coin.balance);
        return (
          balance > 0n &&
          !excludeCoinIds.includes(coin.coinObjectId) &&
          !attemptedCoins.has(coin.coinObjectId) &&
          balance >= effectiveMinBalance
        );
      });

      if (availableCoins.length === 0) {
        const excludedCoins = coins.data.filter(c =>
          BigInt(c.balance) > 0n &&
          excludeCoinIds.includes(c.coinObjectId) &&
          !attemptedCoins.has(c.coinObjectId) &&
          BigInt(c.balance) >= effectiveMinBalance
        );
        if (excludedCoins.length > 0) availableCoins = excludedCoins;
        else {
          log.error('No SUI coin with balance >= gas budget available for gas', {
            totalCoins: coins.data.length,
            gasBudgetMist: requiredBalanceForGas.toString(),
          });
          throw new Error(`No SUI coin with balance >= gas budget (${requiredBalanceForGas} MIST) available.`);
        }
      }

      const sortedCoins = [...availableCoins].sort((a, b) => {
        const balA = BigInt(a.balance);
        const balB = BigInt(b.balance);
        if (balB !== balA) return balB > balA ? 1 : -1;
        return parseInt(a.version) - parseInt(b.version);
      });

      const minRequired = minBalanceForGas != null ? BigInt(minBalanceForGas) : null;
      selectedCoin = (minRequired != null && minRequired > 0n ? sortedCoins.find(c => BigInt(c.balance) >= minRequired) : null)
        ?? sortedCoins.find(c => BigInt(c.balance) >= 100_000_000n)
        ?? sortedCoins.find(c => BigInt(c.balance) >= 10_000_000n)
        ?? sortedCoins[0] ?? null;

      if (!selectedCoin) throw new Error('No SUI coin available for gas');
      attemptedCoins.add(selectedCoin.coinObjectId);

      let gasCoinData: { objectId: string; version: string; digest: string };
      try {
        const sonar = getSonarClient();
        const coinObject = await sonar.getObject({
          id: selectedCoin.coinObjectId,
          options: { showType: true, showOwner: true, showPreviousTransaction: true },
        }) as { error?: { code?: string }; data?: { version: string; digest: string } };
        if (coinObject?.error || !coinObject?.data) throw new Error(`Failed to fetch coin: ${coinObject?.error?.code ?? 'Unknown'}`);
        gasCoinData = {
          objectId: selectedCoin.coinObjectId,
          version: coinObject.data.version,
          digest: coinObject.data.digest,
        };
      } catch {
        gasCoinData = {
          objectId: selectedCoin.coinObjectId,
          version: selectedCoin.version,
          digest: selectedCoin.digest,
        };
      }

      txb.setGasPayment([gasCoinData]);
      const kindBytes = await (txb as Transaction & { build: (opts: { onlyTransactionKind?: boolean }) => Promise<Uint8Array> }).build({ onlyTransactionKind: true });
      const gasBudget = (txb as Transaction & { getData?: () => { gasData?: { budget?: number } } }).getData?.()?.gasData?.budget ?? 50_000_000;
      const built = await platformSonarClient.buildTransaction({
        transactionKindBytesBase64: Buffer.from(kindBytes).toString('base64'),
        sender: senderAddress,
        gasBudget: typeof gasBudget === 'number' ? gasBudget : Number(gasBudget),
      });
      const transactionBytesBase64 = built.transactionBytesBase64;
      const transactionBytes = Buffer.from(transactionBytesBase64, 'base64');
      const signed = await signer.signTransaction(transactionBytes);
      const signature = typeof signed === 'object' && signed !== null && 'signature' in signed
        ? (signed as { signature: string }).signature
        : String(signed);
      const execRes = await platformTxClient.executeSigned({
        transactionBytesBase64,
        signature,
      });
      if (!execRes.success || !execRes.digest) {
        throw new Error(execRes.error ?? 'Channel execute failed');
      }
      const res = execRes as { digest?: string; effects?: unknown; events?: unknown[]; objectChanges?: unknown[] };
      result = {
        digest: res.digest!,
        effects: res.effects ?? {},
        events: res.events ?? undefined,
        objectChanges: res.objectChanges ?? undefined,
      };

      if ((result.effects as { status?: { status?: string } })?.status?.status === 'success') break;

      const errorMsg = (result.effects as { status?: { error?: string } })?.status?.error ?? 'Unknown error';
      if (errorMsg.includes('already locked') && attempts > 1) {
        await new Promise(r => setTimeout(r, Math.pow(2, retries - attempts) * 1000));
        attempts--;
        continue;
      }
      const isVersionMismatch = errorMsg.includes('is not available for consumption') || errorMsg.includes('current version');
      if (isVersionMismatch && attempts > 0) {
        attemptedCoins.delete(selectedCoin.coinObjectId);
        await new Promise(r => setTimeout(r, 100));
        attempts--;
        continue;
      }
      lastError = errorMsg;
      break;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      if (errorMsg.includes('504') || errorMsg.includes('timeout') || errorMsg.includes('Gateway')) {
        await new Promise(r => setTimeout(r, 5000));
        if (attempts > 0) { attempts--; continue; }
        if (allow504Retry) { allow504Retry = false; continue; }
      }
      if (errorMsg.includes('already locked') && attempts > 1) {
        await new Promise(r => setTimeout(r, Math.pow(2, retries - attempts) * 1000));
        attempts--;
        continue;
      }
      const isVersionMismatch = errorMsg.includes('is not available for consumption') || errorMsg.includes('current version');
      if (isVersionMismatch && attempts > 0 && selectedCoin) {
        attemptedCoins.delete(selectedCoin.coinObjectId);
        await new Promise(r => setTimeout(r, 100));
        attempts--;
        continue;
      }
      lastError = errorMsg;
      break;
    }
  }

  if (!result || (result.effects as { status?: { status?: string } })?.status?.status !== 'success') {
    const attemptsMade = attempts > 0 ? retries - attempts : retries;
    throw new Error(`Transaction failed after ${attemptsMade} attempt(s): ${lastError ?? 'Unknown'}`);
  }

  const sonar = getSonarClient();
  await sonar.waitForTransaction({ digest: result.digest, options: { showEffects: true }, timeout });
  if (verifyStatus) {
    const txStatus = await sonar.getTransactionBlock({ digest: result.digest, options: { showEffects: true } });
    if ((txStatus as { effects?: { status?: { status?: string } } })?.effects?.status?.status !== 'success') {
      throw new Error(`Transaction ${result.digest} did not succeed`);
    }
  }

  return {
    digest: result.digest,
    effects: result.effects,
    events: result.events,
    objectChanges: result.objectChanges,
  };
}
