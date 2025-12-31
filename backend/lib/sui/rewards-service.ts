// ==========================================
// Universal Rewards Service
// ==========================================
// Handles reward distribution for tournaments, achievements, and other systems

import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { getAdminWalletService } from './admin-wallet-service';
import { getConfig } from '../../config/config';
import { BadgeLogger } from './badge-logger';
import { StoreService } from './store-service';
import { priceConverter } from '../services/price-converter';

export interface RewardItem {
  itemId: string;
  level: number;
  quantity: number;
}

export interface TournamentRewardDistribution {
  rank: number;
  playerAddress: string;
  playerName?: string;
  tokenRewardUsdCents?: number; // Token reward value in USD cents (for top 3 only)
  tokenRewardMewsAmount?: string; // MEWS token amount (raw units with decimals) - deprecated, use tokenRewardAmount
  tokenRewardAmount?: string; // Token amount (raw units with decimals) - works for any token type
  rewardToken?: 'SUI' | 'MEWS' | 'USDC'; // Token type for rewards
  items: RewardItem[]; // Item rewards (separate from token rewards)
  rewardValueUsdCents: number; // Total reward value in USD cents (tokens + items)
}

export interface TournamentRewardResult {
  success: boolean;
  distributions?: TournamentRewardDistribution[];
  digest?: string;
  error?: string;
}

export class RewardsService {
  private client: SuiClient;
  private storeService: StoreService;
  private config: ReturnType<typeof getConfig>;

  constructor() {
    this.config = getConfig();
    this.client = new SuiClient({ url: this.config.sui.rpcUrl });
    this.storeService = new StoreService();
  }

  /**
   * Calculate tournament rewards based on prize pool and leaderboard
   * 
   * Supports variable player rewards:
   * - 1-10 entries: 25% of prize pool to players
   * - 11+ entries: 50% of prize pool to players (DOUBLES!)
   * 
   * Also supports custom reward configs (if provided)
   * 
   * @param prizePoolUsdCents - Total prize pool in USD cents
   * @param leaderboard - Top players from leaderboard
   * @param participantCount - Number of participants (for variable rewards)
   * @param rewardConfig - Optional custom reward config (null = default rewards)
   * @returns Array of reward distributions
   */
  async calculateTournamentRewards(
    prizePoolUsdCents: number,
    leaderboard: Array<{
      rank: number;
      playerAddress: string;
      playerName?: string;
      value: number;
    }>,
    participantCount?: number,
    rewardConfig?: any | null, // TournamentRewardConfig | null
    rewardToken: 'SUI' | 'MEWS' | 'USDC' = 'MEWS' // Token type for rewards (defaults to MEWS for backward compatibility)
  ): Promise<TournamentRewardDistribution[]> {
    // If custom reward config provided, use custom calculation
    if (rewardConfig) {
      return this.calculateCustomRewards(prizePoolUsdCents, leaderboard, rewardConfig, rewardToken);
    }

    // Default reward system with variable player rewards
    // Variable player rewards: 25% for 1-10 entries, 50% for 11+ entries
    const participantCountForCalc = participantCount || leaderboard.length;
    const playerRewardsPercentage = participantCountForCalc <= 10 ? 0.25 : 0.50; // 25% or 50%
    const playerRewardsPoolUsdCents = Math.floor(prizePoolUsdCents * playerRewardsPercentage);
    
    // Top 3 token distribution percentages (50% of prize pool split among top 3)
    // Top player gets biggest chunk, then 2nd, then 3rd
    const tokenDistributionPercentages = [
      0.50, // 1st: 50% of player rewards pool (biggest chunk)
      0.30, // 2nd: 30% of player rewards pool
      0.20, // 3rd: 20% of player rewards pool
    ];

    const distributions: TournamentRewardDistribution[] = [];

    // Calculate token rewards for top 3 players
    for (let i = 0; i < Math.min(leaderboard.length, 3); i++) {
      const player = leaderboard[i];
      const rank = i + 1;
      const percentage = tokenDistributionPercentages[i];
      const tokenRewardUsdCents = Math.floor(playerRewardsPoolUsdCents * percentage);

      // Convert USD cents to tokens (using selected reward token type)
      const usdAmount = tokenRewardUsdCents / 100; // Convert cents to USD
      const tokenConversion = await priceConverter.convertUSDToToken(usdAmount, rewardToken);
      
      if (!tokenConversion.success) {
        BadgeLogger.error(`🎁 [REWARDS SERVICE] Failed to convert USD to ${rewardToken} tokens`, {
          rank,
          tokenRewardUsdCents,
          rewardToken,
          error: tokenConversion.error,
        });
        // Continue without token amount - will be handled in distribution
      }

      // Calculate items separately (items are given to all players, not just top 3)
      const items = this.calculateItemsForRank(rank, 0); // Items are separate, not based on token value

      distributions.push({
        rank,
        playerAddress: player.playerAddress,
        playerName: player.playerName,
        tokenRewardUsdCents,
        tokenRewardMewsAmount: rewardToken === 'MEWS' ? tokenConversion.tokenAmount : undefined,
        tokenRewardAmount: tokenConversion.tokenAmount, // Generic token amount
        rewardToken: rewardToken, // Store token type
        items,
        rewardValueUsdCents: tokenRewardUsdCents, // Total value (tokens only for top 3)
      });
    }

    // Add item-only rewards for ranks 4-10 (no tokens, just items)
    for (let i = 3; i < Math.min(leaderboard.length, 10); i++) {
      const player = leaderboard[i];
      const rank = i + 1;
      
      // Calculate items for these ranks (no token rewards)
      const items = this.calculateItemsForRank(rank, 0);

      distributions.push({
        rank,
        playerAddress: player.playerAddress,
        playerName: player.playerName,
        items,
        rewardValueUsdCents: 0, // No token rewards for ranks 4-10
      });
    }

    return distributions;
  }

  /**
   * Calculate rewards using custom reward config
   * 
   * @param prizePoolUsdCents - Total prize pool in USD cents
   * @param leaderboard - Top players from leaderboard
   * @param rewardConfig - Custom reward configuration
   * @returns Array of reward distributions
   */
  private async calculateCustomRewards(
    prizePoolUsdCents: number,
    leaderboard: Array<{
      rank: number;
      playerAddress: string;
      playerName?: string;
      value: number;
    }>,
    rewardConfig: any, // TournamentRewardConfig
    rewardToken: 'SUI' | 'MEWS' | 'USDC' = 'MEWS'
  ): Promise<TournamentRewardDistribution[]> {
    const distributions: TournamentRewardDistribution[] = [];
    
    // Get pool depth and reward depth from config
    const poolDepth = rewardConfig.poolDepth || 3; // Default to top 3
    const rewardDepth = rewardConfig.rewardDepth || 10; // Default to top 10
    const poolDistribution = rewardConfig.poolDistribution || [50, 30, 20]; // Default percentages
    const poolSource = rewardConfig.poolSource || 0; // 0 = Prize Pool, 1 = Fixed, 2 = Custom
    const itemRewards = rewardConfig.itemRewards || {}; // Map<rank, ItemReward[]>

    // Calculate pool rewards (MEWS tokens)
    let poolRewardsPoolUsdCents = 0;
    if (poolSource === 0) {
      // Prize pool source: use 50% of prize pool (standard)
      poolRewardsPoolUsdCents = Math.floor(prizePoolUsdCents * 0.5);
    } else if (poolSource === 1) {
      // Fixed source: use fixed amount (would need to be specified in config)
      // For now, default to 50% of prize pool
      poolRewardsPoolUsdCents = Math.floor(prizePoolUsdCents * 0.5);
    } else {
      // Custom source: would need custom calculation
      poolRewardsPoolUsdCents = Math.floor(prizePoolUsdCents * 0.5);
    }

    // Distribute pool rewards (tokens) to top pool_depth players
    for (let i = 0; i < Math.min(leaderboard.length, poolDepth); i++) {
      const player = leaderboard[i];
      const rank = i + 1;
      const percentage = poolDistribution[i] || 0; // Get percentage for this rank
      const tokenRewardUsdCents = Math.floor(poolRewardsPoolUsdCents * (percentage / 100));

      // Convert USD cents to tokens (using selected reward token type)
      const usdAmount = tokenRewardUsdCents / 100;
      const tokenConversion = await priceConverter.convertUSDToToken(usdAmount, rewardToken);
      
      if (!tokenConversion.success) {
        BadgeLogger.error(`🎁 [REWARDS SERVICE] Failed to convert USD to ${rewardToken} tokens`, {
          rank,
          tokenRewardUsdCents,
          rewardToken,
          error: tokenConversion.error,
        });
      }

      // Get items for this rank from config
      const items = this.getItemsFromConfig(rank, itemRewards);

      distributions.push({
        rank,
        playerAddress: player.playerAddress,
        playerName: player.playerName,
        tokenRewardUsdCents,
        tokenRewardMewsAmount: rewardToken === 'MEWS' ? tokenConversion.tokenAmount : undefined,
        tokenRewardAmount: tokenConversion.tokenAmount, // Generic token amount
        rewardToken: rewardToken, // Store token type
        items,
        rewardValueUsdCents: tokenRewardUsdCents,
      });
    }

    // Distribute item-only rewards for ranks (poolDepth + 1) to rewardDepth
    for (let i = poolDepth; i < Math.min(leaderboard.length, rewardDepth); i++) {
      const player = leaderboard[i];
      const rank = i + 1;
      
      // Get items for this rank from config
      const items = this.getItemsFromConfig(rank, itemRewards);

      distributions.push({
        rank,
        playerAddress: player.playerAddress,
        playerName: player.playerName,
        items,
        rewardValueUsdCents: 0, // No token rewards for these ranks
      });
    }

    return distributions;
  }

  /**
   * Get items from custom reward config for a specific rank
   * Resolves "random" itemIds to actual random Level 1 items at distribution time
   * 
   * @param rank - Player rank (1-based)
   * @param itemRewards - Item rewards map from config (Map<rank, ItemReward[]> or Record<rank, ItemReward[]>)
   * @returns Array of items for this rank
   */
  private getItemsFromConfig(rank: number, itemRewards: any): RewardItem[] {
    const items: RewardItem[] = [];

    // Handle both Map and Record formats
    let rankItems: any[] = [];
    if (itemRewards instanceof Map) {
      rankItems = itemRewards.get(rank) || [];
    } else if (typeof itemRewards === 'object' && itemRewards !== null) {
      rankItems = itemRewards[rank] || [];
    }

    // Convert to RewardItem format, resolving "random" to actual items
    for (const item of rankItems) {
      if (item.itemId && item.level && item.quantity) {
        // Resolve "random" to an actual random Level 1 item
        if (item.itemId === 'random') {
          // Get random items for each quantity requested
          for (let i = 0; i < item.quantity; i++) {
            items.push(...this.getRandomLevel1Item());
          }
        } else {
          items.push({
            itemId: item.itemId,
            level: item.level,
            quantity: item.quantity,
          });
        }
      }
    }

    return items;
  }

  /**
   * Calculate items for a given rank and reward value
   * Based on the reward structure from documentation
   * 
   * @param rank - Player rank (1-10)
   * @param rewardValueUsdCents - Reward value in USD cents
   * @returns Array of items to award
   */
  private calculateItemsForRank(rank: number, rewardValueUsdCents: number): RewardItem[] {
    const items: RewardItem[] = [];

    // Top 3 get special items
    if (rank === 1) {
      // 1st Place: Destroy All + Boss Kill Shot + 1 random Level 1 item
      items.push({ itemId: 'destroyAll', level: 1, quantity: 1 });
      items.push({ itemId: 'bossKillShot', level: 1, quantity: 1 });
      items.push(...this.getRandomLevel1Item());
    } else if (rank === 2) {
      // 2nd Place: Boss Kill Shot + 1 random Level 1 item
      items.push({ itemId: 'bossKillShot', level: 1, quantity: 1 });
      items.push(...this.getRandomLevel1Item());
    } else if (rank === 3) {
      // 3rd Place: Destroy All + 1 random Level 1 item
      items.push({ itemId: 'destroyAll', level: 1, quantity: 1 });
      items.push(...this.getRandomLevel1Item());
    } else {
      // 4th-10th Place: 1 random Level 1 item
      items.push(...this.getRandomLevel1Item());
    }

    return items;
  }

  /**
   * Get a random Level 1 item
   * Randomly selected from: Orb Level, Force Field, Extra Lives, Slow Time, Coin Tractor Beam
   * 
   * @returns Array with one random Level 1 item
   */
  private getRandomLevel1Item(): RewardItem[] {
    const randomItems = [
      'orbLevel',
      'forceField',
      'extraLives',
      'slowTime',
      'coinTractorBeam',
    ];

    const randomIndex = Math.floor(Math.random() * randomItems.length);
    const itemId = randomItems[randomIndex];

    return [{ itemId, level: 1, quantity: 1 }];
  }

  /**
   * Distribute tournament rewards to players
   * - Top 3: MEWS tokens + items
   * - Ranks 4-10: Items only
   * 
   * Supports batch distribution for efficiency
   * 
   * @param tournamentId - Tournament ID
   * @param distributions - Reward distributions to apply
   * @param useBatch - Whether to use batch transaction (default: true)
   * @returns Result with success status and transaction digest
   */
  async distributeTournamentRewards(
    tournamentId: number,
    distributions: TournamentRewardDistribution[],
    useBatch: boolean = true
  ): Promise<TournamentRewardResult> {
    // Use batch distribution if enabled and available
    if (useBatch && distributions.length > 1) {
      try {
        const { getBatchRewardDistributionService } = await import('../services/batch-reward-distribution');
        const batchService = getBatchRewardDistributionService();
        const batchResult = await batchService.distributeRewardsBatch(distributions, tournamentId);
        
        if (batchResult.success) {
          return {
            success: true,
            distributions,
            digest: batchResult.transactionDigest,
            error: batchResult.errors?.length ? batchResult.errors.join('; ') : undefined,
          };
        } else {
          // Fall back to individual distribution if batch fails
          BadgeLogger.warn('🎁 [REWARDS SERVICE] Batch distribution failed, falling back to individual', {
            tournamentId,
            error: batchResult.error,
          });
        }
      } catch (error) {
        BadgeLogger.warn('🎁 [REWARDS SERVICE] Batch distribution error, falling back to individual', {
          tournamentId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    try {
      BadgeLogger.info('🎁 [REWARDS SERVICE] Distributing tournament rewards', {
        tournamentId,
        distributionCount: distributions.length,
      });

      const digests: string[] = [];
      const errors: string[] = [];
      const adminWallet = getAdminWalletService();

      // Distribute rewards to each player
      for (const distribution of distributions) {
        try {
          BadgeLogger.info('🎁 [REWARDS SERVICE] Distributing reward to player', {
            tournamentId,
            rank: distribution.rank,
            playerAddress: distribution.playerAddress,
            playerName: distribution.playerName,
            tokenRewardUsdCents: distribution.tokenRewardUsdCents,
            tokenRewardMewsAmount: distribution.tokenRewardMewsAmount,
            itemCount: distribution.items.length,
          });

          // Distribute tokens to top 3 players
          if (distribution.rank <= 3 && distribution.tokenRewardAmount && distribution.rewardToken) {
            try {
              let tokenDigest: string | null = null;
              
              // All token types (MEWS, SUI, USDC) are transferred from admin wallet
              tokenDigest = await this.transferTokenReward(
                distribution.playerAddress,
                distribution.tokenRewardAmount,
                distribution.rewardToken
              );

              if (tokenDigest) {
                digests.push(tokenDigest);
                BadgeLogger.info('🎁 [REWARDS SERVICE] Token reward distributed successfully', {
                  tournamentId,
                  rank: distribution.rank,
                  playerAddress: distribution.playerAddress,
                  tokenAmount: distribution.tokenRewardAmount,
                  rewardToken: distribution.rewardToken,
                  digest: tokenDigest,
                });
              } else {
                errors.push(`Rank ${distribution.rank} (${distribution.playerAddress}): Failed to distribute ${distribution.rewardToken} tokens`);
              }
            } catch (tokenError) {
              const errorMsg = tokenError instanceof Error ? tokenError.message : 'Unknown error';
              errors.push(`Rank ${distribution.rank} (${distribution.playerAddress}): Token distribution failed: ${errorMsg}`);
              BadgeLogger.error('🎁 [REWARDS SERVICE] Failed to distribute token reward', {
                tournamentId,
                rank: distribution.rank,
                playerAddress: distribution.playerAddress,
                rewardToken: distribution.rewardToken,
                error: errorMsg,
              });
            }
          }

          // Distribute items to all players (top 3 and 4-10)
          if (distribution.items && distribution.items.length > 0) {
            const itemResult = await this.storeService.adminAddItems(
              distribution.playerAddress,
              distribution.items
            );

            if (itemResult.success && itemResult.digest) {
              digests.push(itemResult.digest);
              BadgeLogger.info('🎁 [REWARDS SERVICE] Item reward distributed successfully', {
                tournamentId,
                rank: distribution.rank,
                playerAddress: distribution.playerAddress,
                itemCount: distribution.items.length,
                digest: itemResult.digest,
              });
            } else {
              const errorMsg = itemResult.error || 'Unknown error';
              errors.push(`Rank ${distribution.rank} (${distribution.playerAddress}): Item distribution failed: ${errorMsg}`);
              BadgeLogger.error('🎁 [REWARDS SERVICE] Failed to distribute item reward', {
                tournamentId,
                rank: distribution.rank,
                playerAddress: distribution.playerAddress,
                error: errorMsg,
              });
            }
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Rank ${distribution.rank} (${distribution.playerAddress}): ${errorMsg}`);
          BadgeLogger.error('🎁 [REWARDS SERVICE] Error distributing reward', {
            tournamentId,
            rank: distribution.rank,
            playerAddress: distribution.playerAddress,
            error: errorMsg,
          });
        }
      }

      // Return result
      if (errors.length === 0) {
        return {
          success: true,
          distributions,
          digest: digests.join(','), // Multiple digests for multiple transactions
        };
      } else if (digests.length > 0) {
        // Partial success
        return {
          success: true,
          distributions,
          digest: digests.join(','),
          error: `Some rewards failed: ${errors.join('; ')}`,
        };
      } else {
        // Complete failure
        return {
          success: false,
          error: `All rewards failed: ${errors.join('; ')}`,
        };
      }
    } catch (error) {
      BadgeLogger.error('🎁 [REWARDS SERVICE] Error distributing tournament rewards', {
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
   * Transfer tokens (MEWS, SUI, or USDC) to a player address from admin wallet
   * 
   * @param recipientAddress - Player address to receive tokens
   * @param amountRaw - Token amount in raw units (with decimals)
   * @param tokenType - Token type ('MEWS', 'SUI', or 'USDC')
   * @returns Transaction digest if successful, null otherwise
   */
  private async transferTokenReward(
    recipientAddress: string,
    amountRaw: string,
    tokenType: 'SUI' | 'MEWS' | 'USDC'
  ): Promise<string | null> {
    try {
      const adminWallet = getAdminWalletService();
      const client = this.config.sui.network === 'testnet'
        ? adminWallet.getTestnetClient()
        : adminWallet.getMainnetClient();

      // Get token type info from config (supports testnet/mainnet)
      let coinType: string;
      if (tokenType === 'SUI') {
        coinType = '0x2::sui::SUI';
      } else if (tokenType === 'MEWS') {
        coinType = this.config.token.mewsTokenTypeId || '';
        if (!coinType) {
          BadgeLogger.error(`🎁 [REWARDS SERVICE] MEWS token type ID not configured. Please set MEWS_TOKEN_TYPE_ID_TESTNET or MEWS_TOKEN_TYPE_ID_MAINNET in environment variables.`, {
            recipientAddress,
            amountRaw,
            tokenType,
            network: this.config.sui.network,
          });
          return null;
        }
      } else if (tokenType === 'USDC') {
        coinType = this.config.token.usdcTokenTypeId || '';
        if (!coinType) {
          BadgeLogger.error(`🎁 [REWARDS SERVICE] USDC token type ID not configured. Please set USDC_TOKEN_TYPE_ID_TESTNET or USDC_TOKEN_TYPE_ID_MAINNET in environment variables.`, {
            recipientAddress,
            amountRaw,
            tokenType,
            network: this.config.sui.network,
          });
          return null;
        }
      } else {
        BadgeLogger.error(`🎁 [REWARDS SERVICE] Unsupported token type for transfer: ${tokenType}`, {
          recipientAddress,
          amountRaw,
          tokenType,
        });
        return null;
      }

      // Get admin's coins
      const coins = await client.getCoins({
        owner: adminWallet.getAddress(),
        coinType,
      });

      if (!coins.data || coins.data.length === 0) {
        BadgeLogger.error(`🎁 [REWARDS SERVICE] No ${tokenType} coins found in admin wallet`, {
          recipientAddress,
          amountRaw,
          tokenType,
        });
        return null;
      }

      const amountBigInt = BigInt(amountRaw);
      
      // Check if any single coin has sufficient balance
      const coinWithEnoughBalance = coins.data.find(
        coin => BigInt(coin.balance) >= amountBigInt
      );

      if (!coinWithEnoughBalance) {
        // Check total balance
        const totalBalance = coins.data.reduce((sum, coin) => sum + BigInt(coin.balance), BigInt(0));
        if (totalBalance < amountBigInt) {
          BadgeLogger.error(`🎁 [REWARDS SERVICE] Insufficient ${tokenType} balance in admin wallet`, {
            recipientAddress,
            amountRaw,
            tokenType,
            availableBalance: totalBalance.toString(),
            requiredAmount: amountBigInt.toString(),
          });
          return null;
        }
      }

      const txb = new Transaction();

      if (coinWithEnoughBalance) {
        // Use a single coin that has enough balance
        const coin = txb.object(coinWithEnoughBalance.coinObjectId);
        const splitCoin = txb.splitCoins(coin, [amountBigInt]);
        txb.transferObjects([splitCoin], recipientAddress);
      } else {
        // Merge coins and split
        const coinObjects = coins.data.map(coin => txb.object(coin.coinObjectId));
        const primaryCoin = coinObjects[0];
        if (coinObjects.length > 1) {
          txb.mergeCoins(primaryCoin, coinObjects.slice(1));
        }
        const splitCoin = txb.splitCoins(primaryCoin, [amountBigInt]);
        txb.transferObjects([splitCoin], recipientAddress);
      }

      txb.setSender(adminWallet.getAddress());
      txb.setGasBudget(this.config.sui.gasBudget);

      const { executeTransactionWithFinalization } = await import('./transaction-helpers');
      
      const result = await executeTransactionWithFinalization(
        client,
        adminWallet.getKeypair(),
        txb,
        {
          logger: {
            info: (msg, data) => BadgeLogger.info(`🎁 [REWARDS] ${msg}`, data),
            warn: (msg, data) => BadgeLogger.warn(`🎁 [REWARDS WARN] ${msg}`, data),
            error: (msg, data) => BadgeLogger.error(`🎁 [REWARDS ERROR] ${msg}`, data),
          },
        }
      );

      return result.digest;
    } catch (error) {
      BadgeLogger.error(`🎁 [REWARDS SERVICE] Error transferring ${tokenType} tokens`, {
        recipientAddress,
        amountRaw,
        tokenType,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }
}

// Singleton instance
let rewardsServiceInstance: RewardsService | null = null;

export function getRewardsService(): RewardsService {
  if (!rewardsServiceInstance) {
    rewardsServiceInstance = new RewardsService();
  }
  return rewardsServiceInstance;
}

