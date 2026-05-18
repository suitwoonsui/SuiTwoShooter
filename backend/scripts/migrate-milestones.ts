// ==========================================
// Initialize on-chain milestone definitions from factory defaults
// Run from backend/scripts: npx tsx migrate-milestones.ts
// Or invoked by game deploy (apps/shooter-game/contracts/suitwo_game/deploy.js)
// ==========================================

import path from 'path';
import { config } from 'dotenv';

// Load backend .env when run from backend/scripts
config({ path: path.resolve(__dirname, '../.env') });

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromHEX } from '@mysten/sui/utils';
import { Transaction } from '@mysten/sui/transactions';
import { bech32 } from 'bech32';
import { MILESTONE_DEFINITIONS } from '../data/initialization-data';
import { normalizeAdminInventoryItemForPlatform } from '../lib/services/inventory/admin-inventory-item';

const CATEGORY_CODES: Record<string, number> = {
  gamesPlayed: 1,
  bossesPerGame: 2,
  bossesCumulative: 3,
  scorePerGame: 4,
  scoreCumulative: 5,
  distancePerGame: 6,
  distanceCumulative: 7,
  coinsPerGame: 8,
  coinsCumulative: 9,
  enemiesPerGame: 10,
  enemiesCumulative: 11,
  coinStreak: 12,
};

const ITEM_ID_TO_U8: Record<string, number> = {
  orb_level: 0,
  force_field: 1,
  extra_lives: 2,
  slow_time: 3,
  coin_tractor_beam: 4,
  destroy_all: 5,
  boss_kill_shot: 6,
};

const CLOCK_OBJECT_ID = '0x6';

function decodePrivateKey(privateKey: string): Uint8Array {
  if (privateKey.startsWith('suiprivkey1')) {
    const decoded = bech32.decode(privateKey);
    const bytes = bech32.fromWords(decoded.words);
    if (bytes.length === 33) {
      return new Uint8Array(bytes.slice(1));
    } else if (bytes.length === 32) {
      return new Uint8Array(bytes);
    }
    throw new Error(`Unexpected key length: ${bytes.length} bytes`);
  }
  let hexKey = privateKey.trim();
  if (hexKey.startsWith('0x') || hexKey.startsWith('0X')) {
    hexKey = hexKey.slice(2);
  }
  return fromHEX(hexKey);
}

async function main() {
  const privateKey =
    process.env.ADMIN_WALLET_PRIVATE_KEY ||
    process.env.GAME_WALLET_PRIVATE_KEY;
  if (!privateKey) {
    console.error('Set ADMIN_WALLET_PRIVATE_KEY or GAME_WALLET_PRIVATE_KEY in backend/.env');
    process.exit(1);
  }

  const packageId =
    process.env.GAME_PACKAGE_ID_TESTNET ||
    process.env.GAME_SCORE_CONTRACT_TESTNET ||
    process.env.GAME_PACKAGE_ID ||
    process.env.GAME_SCORE_CONTRACT ||
    process.env.PACKAGE_ID_TESTNET;
  const registryId =
    process.env.ACHIEVEMENT_REGISTRY_OBJECT_ID_TESTNET ||
    process.env.ACHIEVEMENT_REGISTRY_OBJECT_ID;
  const adminCapId =
    process.env.ACHIEVEMENT_ADMIN_CAPABILITY_OBJECT_ID_TESTNET ||
    process.env.ACHIEVEMENT_ADMIN_CAPABILITY_OBJECT_ID;

  if (!packageId || !registryId || !adminCapId) {
    console.error(
      'Set GAME_PACKAGE_ID_TESTNET (or GAME_SCORE_CONTRACT_TESTNET), ACHIEVEMENT_REGISTRY_OBJECT_ID_TESTNET, ACHIEVEMENT_ADMIN_CAPABILITY_OBJECT_ID_TESTNET in backend/.env'
    );
    process.exit(1);
  }

  const network = process.env.SUI_NETWORK || 'testnet';
  const client = new SuiClient({
    url: getFullnodeUrl(network as 'testnet' | 'mainnet'),
  });
  const keypair = Ed25519Keypair.fromSecretKey(decodePrivateKey(privateKey));

  const categories: number[] = [];
  const levels: number[] = [];
  const thresholds: bigint[] = [];
  const creditsVec: bigint[] = [];
  const itemIdsFlat: number[] = [];
  const itemLevelsFlat: number[] = [];
  const itemQuantitiesFlat: bigint[] = [];
  const itemCounts: number[] = [];

  for (const [categoryName, definitions] of Object.entries(MILESTONE_DEFINITIONS)) {
    const categoryCode = CATEGORY_CODES[categoryName];
    if (categoryCode === undefined) continue;

    for (let i = 0; i < definitions.length; i++) {
      const def = definitions[i];
      const level = i + 1;
      const itemIds: number[] = [];
      const itemLevels: number[] = [];
      const itemQuantities: bigint[] = [];
      let valid = true;
      for (const item of def.items) {
        const norm = normalizeAdminInventoryItemForPlatform(item);
        const u8 = ITEM_ID_TO_U8[norm.itemId];
        if (u8 === undefined) {
          console.warn(`Invalid itemId: ${norm.itemId} in ${categoryName} level ${level}`);
          valid = false;
          break;
        }
        itemIds.push(u8);
        itemLevels.push(norm.level);
        itemQuantities.push(BigInt(norm.quantity));
      }
      if (!valid) continue;
      categories.push(categoryCode);
      levels.push(level);
      thresholds.push(BigInt(def.threshold));
      creditsVec.push(BigInt(def.credits));
      itemIdsFlat.push(...itemIds);
      itemLevelsFlat.push(...itemLevels);
      itemQuantitiesFlat.push(...itemQuantities);
      itemCounts.push(itemIds.length);
    }
  }

  const totalDefinitions = categories.length;
  console.log(`Adding ${totalDefinitions} milestone definitions...`);

  const txb = new Transaction();
  txb.moveCall({
    target: `${packageId}::achievement_system::add_milestone_definition_entries`,
    arguments: [
      txb.object(adminCapId),
      txb.object(registryId),
      txb.pure.vector('u8', new Uint8Array(categories)),
      txb.pure.vector('u8', new Uint8Array(levels)),
      txb.pure.vector('u64', thresholds),
      txb.pure.vector('u64', creditsVec),
      txb.pure.vector('u8', new Uint8Array(itemIdsFlat)),
      txb.pure.vector('u8', new Uint8Array(itemLevelsFlat)),
      txb.pure.vector('u64', itemQuantitiesFlat),
      txb.pure.vector('u64', itemCounts.map((c) => BigInt(c))),
      txb.object(CLOCK_OBJECT_ID),
    ],
  });
  txb.setSender(keypair.getPublicKey().toSuiAddress());
  const batchGas = Math.min(
    100_000_000 * Math.max(totalDefinitions, 1) + 50_000_000,
    1_000_000_000
  );
  txb.setGasBudget(Math.max(batchGas, 50_000_000));

  try {
    const transactionBytes = await txb.build({ client });
    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: transactionBytes,
      options: { showEffects: true, showEvents: true },
    });

    const status = result.effects?.status as { status?: string; error?: string } | undefined;
    if (status?.status === 'success') {
      console.log(`✅ Milestone definitions added. TX: ${result.digest}`);
      return;
    }
    const errMsg = status?.error ?? 'Transaction failed';
    if (
      errMsg.includes('No function was found with function name add_milestone_definition_entries')
    ) {
      console.log('Batch API not available; falling back to single-entry per definition...');
      await runFallbackSingleEntry(
        client,
        keypair,
        packageId,
        registryId,
        adminCapId,
        categories,
        levels,
        thresholds,
        creditsVec,
        itemIdsFlat,
        itemLevelsFlat,
        itemQuantitiesFlat,
        itemCounts
      );
      return;
    }
    console.error('Transaction failed:', errMsg);
    process.exit(1);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (
      /No function was found with function name add_milestone_definition_entries/i.test(message)
    ) {
      console.log('Batch API not available; falling back to single-entry per definition...');
      await runFallbackSingleEntry(
        client,
        keypair,
        packageId,
        registryId,
        adminCapId,
        categories,
        levels,
        thresholds,
        creditsVec,
        itemIdsFlat,
        itemLevelsFlat,
        itemQuantitiesFlat,
        itemCounts
      );
      return;
    }
    console.error('Error:', message);
    process.exit(1);
  }
}

async function runFallbackSingleEntry(
  client: SuiClient,
  keypair: Ed25519Keypair,
  packageId: string,
  registryId: string,
  adminCapId: string,
  categories: number[],
  levels: number[],
  thresholds: bigint[],
  creditsVec: bigint[],
  itemIdsFlat: number[],
  itemLevelsFlat: number[],
  itemQuantitiesFlat: bigint[],
  itemCounts: number[]
): Promise<void> {
  let added = 0;
  for (let j = 0; j < categories.length; j++) {
    const count = Number(itemCounts[j]);
    const start = j === 0 ? 0 : itemCounts.slice(0, j).reduce((a, c) => a + Number(c), 0);
    const itemIds = itemIdsFlat.slice(start, start + count);
    const itemLevels = itemLevelsFlat.slice(start, start + count);
    const itemQuantities = itemQuantitiesFlat.slice(start, start + count);

    const txb = new Transaction();
    txb.setSender(keypair.getPublicKey().toSuiAddress());
    txb.moveCall({
      target: `${packageId}::achievement_system::add_milestone_definition_entry`,
      arguments: [
        txb.object(adminCapId),
        txb.object(registryId),
        txb.pure.u8(categories[j]),
        txb.pure.u8(levels[j]),
        txb.pure.u64(thresholds[j]),
        txb.pure.u64(creditsVec[j]),
        txb.pure.vector('u8', new Uint8Array(itemIds)),
        txb.pure.vector('u8', new Uint8Array(itemLevels)),
        txb.pure.vector('u64', itemQuantities),
        txb.object(CLOCK_OBJECT_ID),
      ],
    });
    txb.setGasBudget(100_000_000);

    try {
      const txBytes = await txb.build({ client });
      const res = await client.signAndExecuteTransaction({
        signer: keypair,
        transaction: txBytes,
        options: { showEffects: true },
      });
      const st = res.effects?.status as { status?: string; error?: string } | undefined;
      if (st?.status === 'success') {
        added++;
      } else {
        const errMsg = st?.error ?? 'Transaction failed';
        if (
          errMsg.includes('E_MILESTONE_ALREADY_EXISTS') ||
          errMsg.includes('already exists')
        ) {
          // skip
        } else {
          console.warn(`Entry ${j + 1} failed:`, errMsg);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`Entry ${j + 1} error:`, msg);
    }
  }
  console.log(`✅ Milestone definitions added (fallback): ${added}/${categories.length}`);
}

main();
