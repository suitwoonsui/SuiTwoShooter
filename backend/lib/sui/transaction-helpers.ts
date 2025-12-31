// ==========================================
// Transaction Execution Helpers
// ==========================================
// Reusable functions for executing Sui transactions with proper finalization
// and retry logic to prevent coin locks

import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

export interface ExecuteTransactionOptions {
  /**
   * Number of retry attempts for lock errors (default: 3)
   */
  retries?: number;
  
  /**
   * Timeout for transaction finalization in milliseconds (default: 60000)
   */
  timeout?: number;
  
  /**
   * Whether to verify transaction status after finalization (default: true)
   */
  verifyStatus?: boolean;
  
  /**
   * Custom logger function for logging (optional)
   */
  logger?: {
    info?: (message: string, data?: any) => void;
    warn?: (message: string, data?: any) => void;
    error?: (message: string, data?: any) => void;
  };
  
  /**
   * Known locked coin IDs to exclude from gas selection (default: includes the known locked coin)
   */
  excludeCoinIds?: string[];
}

export interface ExecuteTransactionResult {
  digest: string;
  effects: any;
  events?: any[];
  objectChanges?: any[];
}

/**
 * Execute a transaction with retry logic and finalization wait
 * 
 * This function:
 * 1. Executes the transaction with retry logic for lock errors
 * 2. Waits for transaction finalization
 * 3. Verifies transaction status
 * 
 * @param client - Sui client instance
 * @param signer - Keypair to sign the transaction
 * @param txb - Transaction builder
 * @param options - Execution options
 * @returns Transaction result with digest and effects
 * @throws Error if transaction fails after retries or doesn't finalize
 */
export async function executeTransactionWithFinalization(
  client: SuiClient,
  signer: Ed25519Keypair,
  txb: Transaction,
  options: ExecuteTransactionOptions = {}
): Promise<ExecuteTransactionResult> {
  const {
    retries = 3,
    timeout = 60_000,
    verifyStatus = true,
    logger,
  } = options;

  const log = {
    info: logger?.info || (() => {}),
    warn: logger?.warn || (() => {}),
    error: logger?.error || (() => {}),
  };

  // Known locked coins (from pruned transactions - cannot be used)
  const KNOWN_LOCKED_COINS = [
    '0x5e8987f1d1a89953d239f6be8c5ae53c401b25a253fc00dd25cba64a7772fc3a', // Original locked coin
    '0x059b1843b59dd50f48aa1f810a51624e1b41b57c7ab9bc6f65ffb1d4397f6c31', // Also locked (from 504 timeout)
  ];
  const excludeCoinIds = options.excludeCoinIds || KNOWN_LOCKED_COINS;
  
  // Track coins we've attempted to use (to avoid retrying with locked ones)
  const attemptedCoins = new Set<string>();

  // Retry logic for lock errors
  let attempts = retries;
  let result: any = null;
  let lastError: any = null;
  let allow504Retry = true; // Allow one extra retry for 504 errors even if retries: 1
  let selectedCoin: { coinObjectId: string; version: string; digest: string; balance: string } | null = null; // Declare outside try block for catch block access

  while (attempts > 0 || allow504Retry) {
    try {
      // Before building, manually select an unlocked gas coin
      // This ensures we don't use known locked coins
      // IMPORTANT: Fetch fresh coins on each retry to catch newly available coins
      const senderAddress = signer.toSuiAddress();
      const coins = await client.getCoins({
        owner: senderAddress,
        coinType: '0x2::sui::SUI',
      });
      
      // On retries, only exclude coins that failed with lock errors, not all attempted coins
      // This allows us to retry with coins that might have been locked temporarily
      if (attempts < retries) {
        // On retry, clear attempted coins to allow retrying with coins that might be unlocked now
        // Only keep coins that we know are permanently locked (in excludeCoinIds)
        attemptedCoins.clear();
        log.info('Retry attempt - cleared attempted coins to allow retry with potentially unlocked coins');
      }

      if (!coins.data || coins.data.length === 0) {
        throw new Error('No SUI coins available for gas');
      }

      // Log all coins for debugging
      log.info('Gas coin selection', {
        totalCoins: coins.data.length,
        excludedCoinIds: excludeCoinIds.length,
        attemptedCoins: attemptedCoins.size,
        coinDetails: coins.data.map(c => ({
          id: c.coinObjectId.substring(0, 10) + '...',
          balance: (BigInt(c.balance) / BigInt(1_000_000_000)).toString() + ' SUI',
          version: c.version,
          isExcluded: excludeCoinIds.includes(c.coinObjectId),
          isAttempted: attemptedCoins.has(c.coinObjectId),
        })),
      });

      // Filter out known locked coins and previously attempted coins
      let availableCoins = coins.data.filter(coin => 
        !excludeCoinIds.includes(coin.coinObjectId) &&
        !attemptedCoins.has(coin.coinObjectId)
      );

      // Last resort: if no available coins, try using excluded coins with sufficient balance
      // They might have been unlocked since being added to the excluded list
      if (availableCoins.length === 0) {
        const excludedCoins = coins.data.filter(c => 
          excludeCoinIds.includes(c.coinObjectId) && 
          !attemptedCoins.has(c.coinObjectId)
        );
        
        if (excludedCoins.length > 0) {
          const minBalance = 100_000_000; // 0.1 SUI
          const usableExcluded = excludedCoins.filter(c => 
            BigInt(c.balance) >= BigInt(minBalance)
          );
          
          if (usableExcluded.length > 0) {
            log.warn('No available coins found, attempting to use previously excluded coin as last resort', {
              excludedCoinsCount: usableExcluded.length,
              coinIds: usableExcluded.map(c => c.coinObjectId.substring(0, 10) + '...'),
              balances: usableExcluded.map(c => (BigInt(c.balance) / BigInt(1_000_000_000)).toString() + ' SUI'),
              warning: 'These coins were previously marked as locked but have sufficient balance. Attempting to use them.',
            });
            
            // Add usable excluded coins to available coins as last resort
            availableCoins = usableExcluded;
          }
        }
        
        // If still no coins available, throw error
        if (availableCoins.length === 0) {
          const allExcluded = coins.data.filter(c => excludeCoinIds.includes(c.coinObjectId));
          const allAttempted = coins.data.filter(c => attemptedCoins.has(c.coinObjectId));
          const errorDetails = {
            totalCoins: coins.data.length,
            excludedCount: allExcluded.length,
            attemptedCount: allAttempted.length,
            excludedIds: allExcluded.map(c => c.coinObjectId.substring(0, 10) + '...'),
            attemptedIds: allAttempted.map(c => c.coinObjectId.substring(0, 10) + '...'),
          };
          log.error('No unlocked SUI coins available for gas', errorDetails);
          throw new Error(`No unlocked SUI coins available for gas. Total coins: ${coins.data.length}, Excluded: ${allExcluded.length}, Attempted: ${allAttempted.length}`);
        }
      }

      // Sort by version (prefer lower versions - newer coins from faucet)
      const sortedCoins = [...availableCoins].sort((a, b) => 
        parseInt(a.version) - parseInt(b.version)
      );

      // Select coin with sufficient balance (at least 0.1 SUI)
      const minBalance = 100_000_000; // 0.1 SUI
      selectedCoin = sortedCoins.find(c => BigInt(c.balance) >= BigInt(minBalance)) || null;

      // If no coin has 0.1 SUI, try with lower threshold (0.01 SUI) for small transactions
      if (!selectedCoin) {
        const lowerMinBalance = 10_000_000; // 0.01 SUI
        selectedCoin = sortedCoins.find(c => BigInt(c.balance) >= BigInt(lowerMinBalance)) || null;
        
        if (selectedCoin) {
          log.warn('Using coin with lower balance than recommended', {
            coinId: selectedCoin.coinObjectId.substring(0, 10) + '...',
            balance: (BigInt(selectedCoin.balance) / BigInt(1_000_000_000)).toString() + ' SUI',
            recommended: '0.1 SUI',
            actual: (BigInt(selectedCoin.balance) / BigInt(1_000_000_000)).toString() + ' SUI',
          });
        }
      }

      if (!selectedCoin) {
        // Last resort: use the coin with the highest balance, even if it's below minimum
        // This allows transactions to proceed if coins just have small balances
        if (sortedCoins.length > 0) {
          // Sort by balance descending for fallback
          const sortedByBalance = [...sortedCoins].sort((a, b) => 
            BigInt(b.balance) > BigInt(a.balance) ? 1 : -1
          );
          selectedCoin = sortedByBalance[0];
          
          log.warn('Using coin with low balance as fallback', {
            coinId: selectedCoin.coinObjectId.substring(0, 10) + '...',
            balance: (BigInt(selectedCoin.balance) / BigInt(1_000_000_000)).toString() + ' SUI',
            warning: 'Balance may be insufficient for transaction',
          });
        } else {
          const balances = sortedCoins.map(c => (BigInt(c.balance) / BigInt(1_000_000_000)).toString() + ' SUI');
          log.error('No SUI coin available for gas', {
            availableCoins: sortedCoins.length,
            balances: balances.length > 0 ? balances : 'N/A',
            minRequired: '0.01 SUI',
          });
          throw new Error(`No SUI coin available for gas. Available coins: ${sortedCoins.length}, Balances: ${balances.length > 0 ? balances.join(', ') : 'N/A'}`);
        }
      }

      // Track this coin as attempted
      attemptedCoins.add(selectedCoin.coinObjectId);

      // Log coin selection for debugging
      const isExcludedCoin = excludeCoinIds.includes(selectedCoin.coinObjectId);
      log.info(`Using gas coin for transaction`, {
        coinId: selectedCoin.coinObjectId.substring(0, 10) + '...',
        balance: (BigInt(selectedCoin.balance) / BigInt(1_000_000_000)).toString() + ' SUI',
        isRetry: attempts < retries,
        isExcludedCoin: isExcludedCoin,
        attemptedCoinsCount: attemptedCoins.size,
        availableCoinsCount: availableCoins.length,
        excludedCoinsCount: excludeCoinIds.length,
        note: isExcludedCoin ? 'Using previously excluded coin as last resort' : undefined,
      });

      // Fetch the latest coin data RIGHT before building to minimize version change window
      // This is critical because the coin version changes after each transaction
      // We fetch it as late as possible to reduce the chance of version mismatch
      let gasCoinData;
      try {
        const coinObject = await client.getObject({
          id: selectedCoin.coinObjectId,
          options: {
            showType: true,
            showOwner: true,
            showPreviousTransaction: true,
          },
        });

        if (coinObject.error || !coinObject.data) {
          throw new Error(`Failed to fetch coin object: ${coinObject.error?.code || 'Unknown error'}`);
        }

        gasCoinData = {
          objectId: selectedCoin.coinObjectId,
          version: coinObject.data.version,
          digest: coinObject.data.digest,
        };

        log.info('Fetched latest coin version for gas payment', {
          coinId: selectedCoin.coinObjectId.substring(0, 10) + '...',
          version: gasCoinData.version,
          previousVersion: selectedCoin.version,
          versionChanged: gasCoinData.version !== selectedCoin.version,
        });
      } catch (error) {
        // Fallback to using the version we fetched earlier if we can't get the latest
        log.warn('Failed to fetch latest coin version, using cached version', {
          coinId: selectedCoin.coinObjectId.substring(0, 10) + '...',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        gasCoinData = {
          objectId: selectedCoin.coinObjectId,
          version: selectedCoin.version,
          digest: selectedCoin.digest,
        };
      }

      // Explicitly set gas payment to the selected unlocked coin with latest version
      txb.setGasPayment([gasCoinData]);

      // Build transaction immediately after setting gas payment to minimize version change window
      const transactionBytes = await txb.build({ client });
      
      result = await client.signAndExecuteTransaction({
        signer,
        transaction: transactionBytes,
        options: {
          showEffects: true,
          showEvents: true,
          showObjectChanges: true,
        },
      });

      if (result.effects?.status?.status === 'success') {
        break; // Success!
      }

      const errorMsg = result.effects?.status?.error || 'Unknown error';

      // Check if it's an "already locked" error - retry with backoff
      if (errorMsg.includes('already locked') && attempts > 1) {
        const waitTime = Math.pow(2, retries - attempts) * 1000; // 1s, 2s, 4s
        log.warn(`Coin locked, waiting ${waitTime}ms before retry (${attempts - 1} attempts remaining)...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        attempts--;
        continue;
      }

      // Check if it's a version mismatch error - retry with fresh coin version
      // Error format: "Version 0x... is not available for consumption, current version: 0x..."
      const isVersionMismatch = errorMsg.includes('is not available for consumption') || 
                                errorMsg.includes('current version') ||
                                (errorMsg.includes('Version') && errorMsg.includes('not available'));
      
      if (isVersionMismatch && attempts > 0) {
        log.warn(`Coin version mismatch detected in transaction effects, retrying with fresh coin version (${attempts} attempts remaining)...`, {
          error: errorMsg.substring(0, 200), // Log first 200 chars of error
        });
        // Clear attempted coins to allow retrying with the same coin (but with fresh version)
        attemptedCoins.delete(selectedCoin.coinObjectId);
        // Small delay to allow any pending transactions to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts--;
        continue; // This will fetch fresh coins and get the latest version
      }

      // Other error or out of retries
      lastError = errorMsg;
      break;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';

      // Handle 504 gateway timeout - transaction might have been submitted
      // This is a special case: we should always retry with a different coin
      if (errorMsg.includes('504') || errorMsg.includes('timeout') || errorMsg.includes('Gateway') || errorMsg.includes('Unexpected status code: 504')) {
        log.warn(`Gateway timeout (504) - transaction may have been submitted. Will retry with different coin...`);
        
        // Wait a bit for transaction to propagate
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // The coin we just used might be locked now - exclude it from retries
        // (It's already in attemptedCoins, so it will be filtered out on next iteration)
        // Allow one retry for 504 even if we're out of normal retries
        if (attempts > 0) {
          log.warn(`Retrying with different coin after timeout (${attempts} attempts remaining)...`);
          attempts--;
          continue; // This will fetch fresh coins and exclude the attempted one
        } else if (allow504Retry) {
          // Special case: allow one retry for 504 even if retries: 1
          log.warn(`Retrying with different coin after timeout (special 504 retry)...`);
          allow504Retry = false; // Only allow one 504 retry
          continue; // This will fetch fresh coins and exclude the attempted one
        }
        
        // Out of retries - throw error
        lastError = errorMsg;
        break;
      }

      // Check if it's a lock error in the exception
      if (errorMsg.includes('already locked') && attempts > 1) {
        const waitTime = Math.pow(2, retries - attempts) * 1000;
        log.warn(`Lock error in exception, waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        attempts--;
        continue;
      }

      // Check if it's a version mismatch error in the exception - retry with fresh coin version
      // Error format: "Version 0x... is not available for consumption, current version: 0x..."
      const isVersionMismatch = errorMsg.includes('is not available for consumption') || 
                                errorMsg.includes('current version') ||
                                (errorMsg.includes('Version') && errorMsg.includes('not available'));
      
      if (isVersionMismatch && attempts > 0) {
        log.warn(`Coin version mismatch in exception, retrying with fresh coin version (${attempts} attempts remaining)...`, {
          error: errorMsg.substring(0, 200), // Log first 200 chars of error
        });
        // Clear attempted coins to allow retrying with the same coin (but with fresh version)
        if (selectedCoin) {
          attemptedCoins.delete(selectedCoin.coinObjectId);
        }
        // Small delay to allow any pending transactions to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts--;
        continue; // This will fetch fresh coins and get the latest version
      }

      lastError = errorMsg;
      break;
    }
  }

  if (!result || result.effects?.status?.status !== 'success') {
    const errorMsg = lastError || result?.effects?.status?.error || 'Unknown error';
    // Calculate actual attempts made: if we exhausted retries, we made retries attempts
    // If we still have attempts left, we made (retries - attempts) attempts
    const attemptsMade = attempts > 0 ? (retries - attempts) : retries;
    throw new Error(`Transaction failed after ${attemptsMade} attempt(s): ${errorMsg}`);
  }

  // CRITICAL: Wait for transaction to be finalized - FAIL HARD if it doesn't
  // This prevents the next transaction from using a still-locked coin
  try {
    log.info(`Waiting for transaction ${result.digest} to finalize...`);

    await client.waitForTransaction({
      digest: result.digest,
      options: {
        showEffects: true,
      },
      timeout,
    });

    log.info(`Transaction ${result.digest} finalized`);

    // Verify transaction actually succeeded
    if (verifyStatus) {
      const txStatus = await client.getTransactionBlock({
        digest: result.digest,
        options: { showEffects: true },
      });

      if (txStatus.effects?.status?.status !== 'success') {
        throw new Error(
          `Transaction ${result.digest} did not succeed: ${txStatus.effects?.status?.error || 'Unknown error'}`
        );
      }

      log.info(`Transaction ${result.digest} verified as successful`);
    }
  } catch (waitError) {
    // This is a CRITICAL error - don't continue!
    const errorMsg = waitError instanceof Error ? waitError.message : 'Unknown error';
    throw new Error(
      `Transaction ${result.digest} did not finalize: ${errorMsg}. ` +
      `Cannot proceed as coin may still be locked.`
    );
  }

  return {
    digest: result.digest,
    effects: result.effects,
    events: result.events,
    objectChanges: result.objectChanges,
  };
}
