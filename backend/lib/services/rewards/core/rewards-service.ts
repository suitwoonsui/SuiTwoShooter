// ==========================================
// Universal Rewards Service
// ==========================================
// Handles reward distribution for tournaments, achievements, and other systems.
// Uses platform Channel sustain-build-distribute for all payouts; no local store/inventory tx building.
//
// Inputs: getConfig() (sui.rpcUrl); priceConverter (Gauge when platform configured);
// buildBatchViaChannel / platform-client (PLATFORM_BACKEND_URL, corridor cap from env);
// signAndSubmitRewardTransactions → getAdminWalletService (GAME_WALLET_PRIVATE_KEY), platformTxClient.

import { SuiClient } from '@mysten/sui/client';
import { getConfig } from '@/config/config';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { priceConverter } from '@/lib/services/payments/converter/price-converter';
import { signAndSubmitRewardTransactions } from '@/lib/services/rewards/executor/rewards-platform-executor';

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
  private config: ReturnType<typeof getConfig>;

  constructor() {
    this.config = getConfig();
    this.client = new SuiClient({ url: this.config.sui.rpcUrl });
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
        PlatformLogger.error(`🎁 [REWARDS SERVICE] Failed to convert USD to ${rewardToken} tokens`, {
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
        tokenRewardAmount: tokenConversion.tokenAmount,
        rewardToken: rewardToken,
        items,
        rewardValueUsdCents: tokenRewardUsdCents,
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
        PlatformLogger.error(`🎁 [REWARDS SERVICE] Failed to convert USD to ${rewardToken} tokens`, {
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
        tokenRewardAmount: tokenConversion.tokenAmount,
        rewardToken: rewardToken,
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
      items.push({ itemId: 'destroy_all', level: 1, quantity: 1 });
      items.push({ itemId: 'boss_kill_shot', level: 1, quantity: 1 });
      items.push(...this.getRandomLevel1Item());
    } else if (rank === 2) {
      // 2nd Place: Boss Kill Shot + 1 random Level 1 item
      items.push({ itemId: 'boss_kill_shot', level: 1, quantity: 1 });
      items.push(...this.getRandomLevel1Item());
    } else if (rank === 3) {
      // 3rd Place: Destroy All + 1 random Level 1 item
      items.push({ itemId: 'destroy_all', level: 1, quantity: 1 });
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
      'orb_level',
      'force_field',
      'extra_lives',
      'slow_time',
      'coin_tractor_beam',
    ];

    const randomIndex = Math.floor(Math.random() * randomItems.length);
    const itemId = randomItems[randomIndex];

    return [{ itemId, level: 1, quantity: 1 }];
  }

  /**
   * Distribute tournament rewards via platform Channel sustain-build-distribute (batch only).
   * Identity is sent via corridor cap (env); do not pass ecosystem/app IDs.
   *
   * @param tournamentId - Tournament ID
   * @param distributions - Reward distributions to apply
   * @param adminWalletAddress - Required; game admin wallet signs and pays
   * @returns Result with success status and transaction digest
   */
  async distributeTournamentRewards(
    tournamentId: number,
    distributions: TournamentRewardDistribution[],
    adminWalletAddress?: string
  ): Promise<TournamentRewardResult> {
    if (distributions.length === 0) {
      return { success: false, error: 'No distributions to apply' };
    }
    if (!adminWalletAddress?.startsWith('0x')) {
      return { success: false, error: 'adminWalletAddress is required for reward distribution' };
    }

    const { getBatchRewardDistributionService } = await import('@/lib/services/rewards/batch/batch-reward-distribution');
    const batchService = getBatchRewardDistributionService();
    const batchResult = await batchService.distributeRewardsBatch(distributions, tournamentId, adminWalletAddress);

    if (batchResult.success) {
      return {
        success: true,
        distributions,
        digest: batchResult.transactionDigest,
        error: batchResult.errors?.length ? batchResult.errors.join('; ') : undefined,
      };
    }
    return {
      success: false,
      error: batchResult.error ?? 'Batch distribution failed',
    };
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

