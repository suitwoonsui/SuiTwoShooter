// ==========================================
// Batch Reward Distribution Service
// Distributes rewards to multiple players in a single transaction
// ==========================================

import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { getAdminWalletService } from '../sui/admin-wallet-service';
import { getConfig } from '../../config/config';
import { BadgeLogger } from '../sui/badge-logger';
import { StoreService } from '../sui/store-service';
import { priceConverter } from './price-converter';
import { TournamentRewardDistribution } from '../sui/rewards-service';

/**
 * Batch reward distribution result
 */
export interface BatchRewardDistributionResult {
  success: boolean;
  transactionDigest?: string;
  distributions?: TournamentRewardDistribution[];
  errors?: string[];
  error?: string;
}

/**
 * BatchRewardDistributionService - Distributes rewards in batches
 */
export class BatchRewardDistributionService {
  private client: SuiClient;
  private config: ReturnType<typeof getConfig>;
  private storeService: StoreService;

  constructor() {
    this.config = getConfig();
    this.client = new SuiClient({ url: this.config.sui.rpcUrl });
    this.storeService = new StoreService();
  }

  /**
   * Distribute rewards to multiple players in a single batch transaction
   * 
   * This batches:
   * - Multiple token transfers from admin wallet (MEWS, SUI, USDC for top players)
   * - Multiple item distributions (for all winners)
   * 
   * @param distributions - Array of reward distributions
   * @param tournamentId - Tournament ID (for logging)
   * @returns Batch distribution result
   */
  async distributeRewardsBatch(
    distributions: TournamentRewardDistribution[],
    tournamentId?: number
  ): Promise<BatchRewardDistributionResult> {
    try {
      BadgeLogger.info('🎁 [BATCH REWARDS] Starting batch reward distribution', {
        tournamentId,
        distributionCount: distributions.length,
      });

      const adminWallet = getAdminWalletService();
      const network = this.config.sui.network;
      const client = network === 'testnet'
        ? adminWallet.getTestnetClient()
        : adminWallet.getMainnetClient();

      // Build batch transaction
      const txb = new Transaction();

      // Get required object IDs
      const storeObjectId = this.config.contracts.premiumStoreObject;
      const adminCapabilityObjectId = this.config.contracts.premiumStoreAdminCapability;

      if (!storeObjectId || !adminCapabilityObjectId) {
        return {
          success: false,
          error: 'Store object or Admin capability not configured',
        };
      }

      const errors: string[] = [];
      let tokenTransferCount = 0;
      let itemDistributionCount = 0;

      // Calculate total tokens needed for transfers
      const tokenDistributions = distributions.filter(
        d => d.rank <= 3 && d.tokenRewardAmount && d.rewardToken
      );

      // Group by token type for efficient coin handling
      const tokensByType = new Map<string, Array<{ playerAddress: string; amount: string; rank: number }>>();
      for (const dist of tokenDistributions) {
        const tokenType = dist.rewardToken || 'MEWS';
        const existing = tokensByType.get(tokenType) || [];
        existing.push({
          playerAddress: dist.playerAddress,
          amount: dist.tokenRewardAmount!,
          rank: dist.rank,
        });
        tokensByType.set(tokenType, existing);
      }

      // Add token transfers for each token type
      for (const [tokenType, transfers] of tokensByType.entries()) {
        try {
          // Get coin type based on token
          let coinType: string;
          if (tokenType === 'SUI') {
            coinType = '0x2::sui::SUI';
          } else if (tokenType === 'MEWS') {
            coinType = this.config.token.mewsTokenTypeId || '';
            if (!coinType) {
              errors.push(`MEWS token type ID not configured`);
              continue;
            }
          } else if (tokenType === 'USDC') {
            coinType = this.config.token.usdcTokenTypeId || '';
            if (!coinType) {
              errors.push(`USDC token type ID not configured`);
              continue;
            }
          } else {
            errors.push(`Unsupported token type: ${tokenType}`);
            continue;
          }

          // Get admin's coins for this token type
          const coins = await client.getCoins({
            owner: adminWallet.getAddress(),
            coinType,
          });

          if (!coins.data || coins.data.length === 0) {
            errors.push(`No ${tokenType} coins found in admin wallet`);
            continue;
          }

          // Calculate total needed
          const totalNeeded = transfers.reduce((sum, t) => sum + BigInt(t.amount), BigInt(0));
          const totalAvailable = coins.data.reduce((sum, c) => sum + BigInt(c.balance), BigInt(0));

          if (totalAvailable < totalNeeded) {
            errors.push(`Insufficient ${tokenType} balance: need ${totalNeeded}, have ${totalAvailable}`);
            continue;
          }

          // Add coin objects to transaction and merge if needed
          const coinObjects = coins.data.map(coin => txb.object(coin.coinObjectId));
          let sourceCoin = coinObjects[0];
          if (coinObjects.length > 1) {
            txb.mergeCoins(sourceCoin, coinObjects.slice(1));
          }

          // Split and transfer to each player
          for (const transfer of transfers) {
            const amountBigInt = BigInt(transfer.amount);
            const splitCoin = txb.splitCoins(sourceCoin, [amountBigInt]);
            txb.transferObjects([splitCoin], transfer.playerAddress);

            tokenTransferCount++;
            BadgeLogger.debug('🎁 [BATCH REWARDS] Added token transfer to batch', {
              rank: transfer.rank,
              playerAddress: transfer.playerAddress,
              amount: transfer.amount,
              tokenType,
            });
          }
        } catch (error) {
          const errorMsg = `${tokenType} transfers: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          BadgeLogger.error('🎁 [BATCH REWARDS] Failed to add token transfers', {
            tokenType,
            error: errorMsg,
          });
        }
      }

      // Add item distributions for all players
      // Group items by player to batch admin_add_items calls
      const itemsByPlayer = new Map<string, Array<{ itemId: string; level: number; quantity: number }>>();

      for (const distribution of distributions) {
        if (distribution.items && distribution.items.length > 0) {
          const existingItems = itemsByPlayer.get(distribution.playerAddress) || [];
          itemsByPlayer.set(distribution.playerAddress, [...existingItems, ...distribution.items]);
        }
      }

      // Add admin_add_items calls for each player
      for (const [playerAddress, items] of itemsByPlayer.entries()) {
        try {
          // Use StoreService's adminAddItems logic but in batch
          // We'll call the contract function directly in the batch transaction
          const storePackageId = this.config.contracts.gameScore?.split('::')[0] || this.config.contracts.gameScore;
          
          // Group items by type and level for efficient batching
          const itemGroups = new Map<string, { level: number; quantity: number }>();
          
          for (const item of items) {
            const key = `${item.itemId}_${item.level}`;
            const existing = itemGroups.get(key);
            if (existing) {
              existing.quantity += item.quantity;
            } else {
              itemGroups.set(key, { level: item.level, quantity: item.quantity });
            }
          }

          // Add one admin_add_items call per item type/level combination
          // Note: The contract might support batch items in one call, but for safety we'll call per item
          // If the contract supports it, we can optimize this later
          for (const [key, itemData] of itemGroups.entries()) {
            const [itemId, levelStr] = key.split('_');
            const level = parseInt(levelStr);
            
            // Map itemId to contract item type
            const itemTypeMap: Record<string, number> = {
              orbLevel: 0,
              forceField: 1,
              extraLives: 2,
              slowTime: 3,
              coinTractorBeam: 4,
              destroyAll: 5,
              bossKillShot: 6,
            };

            const itemType = itemTypeMap[itemId];
            if (itemType === undefined) {
              errors.push(`Unknown item ID: ${itemId} for player ${playerAddress}`);
              continue;
            }

            txb.moveCall({
              target: `${storePackageId}::premium_store::admin_add_items`,
              arguments: [
                txb.object(adminCapabilityObjectId),
                txb.object(storeObjectId),
                txb.object('0x6'), // Clock
                txb.pure.address(playerAddress),
                txb.pure.u8(itemType),
                txb.pure.u8(level),
                txb.pure.u64(itemData.quantity),
              ],
            });

            itemDistributionCount++;
          }
        } catch (error) {
          const errorMsg = `Player ${playerAddress} items: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          BadgeLogger.error('🎁 [BATCH REWARDS] Failed to add item distribution', {
            playerAddress,
            error: errorMsg,
          });
        }
      }

      if (tokenTransferCount === 0 && itemDistributionCount === 0) {
        return {
          success: false,
          error: 'No rewards to distribute',
        };
      }

      // Set gas budget (higher for batch transaction)
      const baseGasBudget = this.config.sui.gasBudget;
      const batchGasBudget = Math.max(
        baseGasBudget,
        baseGasBudget + (tokenTransferCount * 50_000_000) + (itemDistributionCount * 30_000_000)
      );
      txb.setGasBudget(batchGasBudget);

      txb.setSender(adminWallet.getAddress());

      BadgeLogger.info('🎁 [BATCH REWARDS] Executing batch transaction', {
        tournamentId,
        tokenTransferCount,
        itemDistributionCount,
        totalCalls: tokenTransferCount + itemDistributionCount,
        gasBudget: batchGasBudget,
      });

      // Build and execute transaction
      const transactionBytes = await txb.build({ client });

      const result = await client.signAndExecuteTransaction({
        signer: adminWallet.getKeypair(),
        transaction: transactionBytes,
        options: {
          showEffects: true,
          showEvents: true,
          showObjectChanges: true,
        },
      });

      if (result.effects?.status?.status === 'success') {
        BadgeLogger.info('🎁 [BATCH REWARDS] Batch distribution successful', {
          tournamentId,
          digest: result.digest,
          tokenTransferCount,
          itemDistributionCount,
        });

        return {
          success: true,
          transactionDigest: result.digest,
          distributions,
          errors: errors.length > 0 ? errors : undefined,
        };
      } else {
        const errorMessage = result.effects?.status?.error || 'Unknown transaction error';
        BadgeLogger.error('🎁 [BATCH REWARDS] Batch transaction failed', {
          tournamentId,
          error: errorMessage,
        });

        return {
          success: false,
          error: errorMessage,
          errors,
        };
      }
    } catch (error) {
      BadgeLogger.error('🎁 [BATCH REWARDS] Error in batch distribution', {
        tournamentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Distribute rewards in smaller batches (if transaction is too large)
   * 
   * @param distributions - Array of reward distributions
   * @param batchSize - Maximum number of operations per batch
   * @param tournamentId - Tournament ID (for logging)
   * @returns Array of batch results
   */
  async distributeRewardsInBatches(
    distributions: TournamentRewardDistribution[],
    batchSize: number = 20, // Max operations per batch
    tournamentId?: number
  ): Promise<Array<BatchRewardDistributionResult>> {
    const results: Array<BatchRewardDistributionResult> = [];

    // Estimate operations per distribution (1 token mint + N item calls)
    // For simplicity, we'll process in chunks
    const chunkSize = Math.floor(batchSize / 3); // Rough estimate: ~3 operations per player

    for (let i = 0; i < distributions.length; i += chunkSize) {
      const chunk = distributions.slice(i, i + chunkSize);
      const result = await this.distributeRewardsBatch(chunk, tournamentId);
      results.push(result);

      // Wait a bit between batches to avoid object version conflicts
      if (i + chunkSize < distributions.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }
}

// Singleton instance
let batchRewardDistributionServiceInstance: BatchRewardDistributionService | null = null;

export function getBatchRewardDistributionService(): BatchRewardDistributionService {
  if (!batchRewardDistributionServiceInstance) {
    batchRewardDistributionServiceInstance = new BatchRewardDistributionService();
  }
  return batchRewardDistributionServiceInstance;
}


