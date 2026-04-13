// ==========================================
// Reward Cost Calculator Service
// Calculates the cost of custom tournament rewards
// ==========================================

import { fetchStockroomOffersMap, getStockroomUsdPriceForLevel } from '@/lib/services/store/stockroom-pricing';
import { getBadgeService } from '@/lib/services/badge/core/badge-service';
import { getDiscounts } from '@/lib/services/badge/utilities/badge-utilities';
import { getGameConfigService } from '@/lib/services/config/game-config/game-config-service';

/**
 * Tournament reward configuration (TypeScript interface)
 * Matches the Move contract structure
 * 
 * Note: itemRewards can be either Map<number, ItemReward[]> or Record<number, ItemReward[]>
 * for easier JSON serialization from API
 */
export interface TournamentRewardConfig {
  rewardDepth: number;              // How many players get item rewards (1-255)
  poolDepth: number;                 // How many players get pool rewards (MEWS tokens)
  poolDistribution: number[];        // Percentages for pool distribution (must sum to 100)
  poolSource: number;                // 0=Prize Pool, 1=Fixed, 2=Custom
  itemRewards: Map<number, ItemReward[]> | Record<number, ItemReward[]>; // rank -> items (rank 1-255)
}

/**
 * Item reward entry
 */
export interface ItemReward {
  itemId: string;      // Item type: 'orb_level', 'force_field', 'extra_lives', 'slow_time', 'coin_tractor_beam', 'destroy_all', 'boss_kill_shot'
  level: number;        // Item level (1, 2, or 3)
  quantity: number;     // Number of items
}

/**
 * Reward cost calculation result
 */
export interface RewardCostCalculation {
  baseCost: number;                  // Reward depth × average price × discounts
  specialItemCost: number;            // Sum of special item prices (with badge discount only)
  level2PlusCost: number;             // Sum of level 2+ price differences (with badge discount only)
  totalCost: number;                  // Total reward cost in USD
  totalCostUSDCents: number;          // Total reward cost in USD cents
  discountApplied: number;           // Base discount percentage (25%)
  badgeDiscountApplied: number;      // Badge discount percentage (0-25%)
}

/**
 * Constants
 */
const AVERAGE_LEVEL_1_PRICE = 0.67;  // Average Level 1 item price (excluding special items)
const BASE_DISCOUNT_PERCENT = 25;    // 25% base discount for adding reward depth
const CREATION_FEE_USD_CENTS = 500;  // $5.00 creation fee

/**
 * Special items (don't get base discount, only badge discount)
 */
const SPECIAL_ITEMS = ['destroy_all', 'boss_kill_shot'];

/**
 * RewardCostCalculator - Calculates the cost of custom tournament rewards
 */
export class RewardCostCalculator {
  /**
   * Average Level 1 shelf price from Stockroom (staple items only). Falls back if SKUs missing.
   */
  static averageLevel1PriceFromOffers(offers: Record<string, Record<string, unknown>>): number {
    const keys = ['extra_lives', 'force_field', 'orb_level', 'coin_tractor_beam', 'slow_time'] as const;
    const prices = keys
      .map((k) => getStockroomUsdPriceForLevel(offers, k, 1))
      .filter((p): p is number => p != null && Number.isFinite(p) && p >= 0);
    if (prices.length === 0) return AVERAGE_LEVEL_1_PRICE;
    return prices.reduce((a, b) => a + b, 0) / prices.length;
  }

  /**
   * Get badge discount for a player from platform config only.
   * Returns store discount percentage (0-25% when config present).
   */
  static async getBadgeDiscountForPlayer(playerAddress: string): Promise<number> {
    try {
      const badgeService = getBadgeService();
      const badgeData = await badgeService.getBadge(playerAddress);
      const gameConfigRes = await getGameConfigService().getConfig();
      const badgeConfig = gameConfigRes.config?.badgeConfig;
      if (
        badgeData &&
        badgeData.badgeId &&
        typeof badgeData.tier === 'number' &&
        Number.isFinite(badgeData.tier) &&
        badgeData.tier >= 0
      ) {
        const discounts = getDiscounts(badgeData.tier, badgeConfig);
        return discounts.store;
      }
      return 0;
    } catch (error) {
      console.warn('Error getting badge discount for player', {
        playerAddress,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return 0;
    }
  }

  /**
   * Calculate reward cost for custom tournament rewards
   * 
   * @param rewardConfig - Tournament reward configuration (null for default rewards = $0)
   * @param playerAddress - Optional player address to get badge discount
   * @param badgeDiscountPercent - Optional badge discount (0-25%). If not provided and playerAddress is provided, will fetch from badge service
   * @returns Reward cost calculation
   */
  static async calculateRewardCost(
    rewardConfig: TournamentRewardConfig | null,
    playerAddress?: string,
    badgeDiscountPercent?: number
  ): Promise<RewardCostCalculation> {
    // If no custom config, return $0 (default rewards are free)
    if (!rewardConfig) {
      return {
        baseCost: 0,
        specialItemCost: 0,
        level2PlusCost: 0,
        totalCost: 0,
        totalCostUSDCents: 0,
        discountApplied: 0,
        badgeDiscountApplied: 0,
      };
    }

    // Get badge discount if player address provided and not explicitly passed
    let actualBadgeDiscount = badgeDiscountPercent ?? 0;
    if (playerAddress && badgeDiscountPercent === undefined) {
      actualBadgeDiscount = await this.getBadgeDiscountForPlayer(playerAddress);
    }

    // Calculate total discount factor (multiplicative stacking)
    const baseDiscountFactor = 1 - (BASE_DISCOUNT_PERCENT / 100); // 0.75 (25% off)
    const badgeDiscountFactor = 1 - (actualBadgeDiscount / 100); // 0.75-1.00 (0-25% off)
    const totalDiscountFactor = baseDiscountFactor * badgeDiscountFactor;

    const stockRes = await fetchStockroomOffersMap();
    const offers = stockRes.success && stockRes.offers ? stockRes.offers : {};
    const avgLevel1 = this.averageLevel1PriceFromOffers(offers);

    // Base cost: reward depth × average Level 1 price × total discount
    const baseCost = (rewardConfig.rewardDepth * avgLevel1) * totalDiscountFactor;

    // Calculate costs for actual items configured
    // Special items and level 2+ items get badge discount but NOT base discount
    let specialItemCost = 0;
    let level2PlusCost = 0;

    // Convert itemRewards to Map if it's a Record (from JSON)
    let itemRewardsMap: Map<number, ItemReward[]>;
    if (rewardConfig.itemRewards instanceof Map) {
      itemRewardsMap = rewardConfig.itemRewards;
    } else {
      // Convert Record to Map
      itemRewardsMap = new Map();
      for (const [rankStr, items] of Object.entries(rewardConfig.itemRewards)) {
        const rank = parseInt(rankStr, 10);
        if (!isNaN(rank) && Array.isArray(items)) {
          itemRewardsMap.set(rank, items);
        }
      }
    }

    // Iterate through item rewards by rank
    for (const [rank, items] of itemRewardsMap.entries()) {
      
      for (const item of items) {
        const itemPrice = getStockroomUsdPriceForLevel(offers, item.itemId, item.level);
        if (itemPrice == null) {
          console.warn(`Missing Stockroom price for ${item.itemId} level ${item.level}`);
          continue;
        }

        const quantity = item.quantity || 1;

        // Check if special item (apply badge discount only, no base discount)
        if (SPECIAL_ITEMS.includes(item.itemId)) {
          specialItemCost += itemPrice * quantity * badgeDiscountFactor;
        }
        // Check if level 2+ (apply badge discount only to price difference)
        else if (item.level > 1) {
          const level1Price = getStockroomUsdPriceForLevel(offers, item.itemId, 1) ?? avgLevel1;
          const priceDifference = itemPrice - level1Price;
          level2PlusCost += priceDifference * quantity * badgeDiscountFactor;
        }
        // Level 1 items are covered by base cost (no additional charge)
      }
    }

    const totalCost = baseCost + specialItemCost + level2PlusCost;
    const totalCostUSDCents = Math.round(totalCost * 100);

    return {
      baseCost,
      specialItemCost,
      level2PlusCost,
      totalCost,
      totalCostUSDCents,
      discountApplied: BASE_DISCOUNT_PERCENT,
      badgeDiscountApplied: actualBadgeDiscount,
    };
  }

  /**
   * Calculate total payment for tournament creation
   * Includes: creation fee + starting ante + reward cost
   * 
   * @param startingAnteUSDCents - Starting ante in USD cents
   * @param rewardCostUSDCents - Reward cost in USD cents (from calculateRewardCost)
   * @returns Total payment breakdown
   */
  static calculateTotalPayment(
    startingAnteUSDCents: number,
    rewardCostUSDCents: number,
    creationFeeUSDCentsOverride?: number
  ): {
    creationFeeUSDCents: number;
    startingAnteUSDCents: number;
    rewardCostUSDCents: number;
    totalUSDCents: number;
    totalUSD: number;
  } {
    const creationFeeUSDCents =
      typeof creationFeeUSDCentsOverride === 'number' && creationFeeUSDCentsOverride >= 0
        ? Math.round(creationFeeUSDCentsOverride)
        : CREATION_FEE_USD_CENTS;
    const totalUSDCents = creationFeeUSDCents + startingAnteUSDCents + rewardCostUSDCents;
    const totalUSD = totalUSDCents / 100;

    return {
      creationFeeUSDCents,
      startingAnteUSDCents,
      rewardCostUSDCents,
      totalUSDCents,
      totalUSD,
    };
  }
}

// Export convenience functions
export async function calculateRewardCost(
  rewardConfig: TournamentRewardConfig | null,
  playerAddress?: string,
  badgeDiscountPercent?: number
): Promise<RewardCostCalculation> {
  return RewardCostCalculator.calculateRewardCost(rewardConfig, playerAddress, badgeDiscountPercent);
}

export function calculateTotalPayment(
  startingAnteUSDCents: number,
  rewardCostUSDCents: number,
  creationFeeUSDCentsOverride?: number
) {
  return RewardCostCalculator.calculateTotalPayment(startingAnteUSDCents, rewardCostUSDCents, creationFeeUSDCentsOverride);
}

export async function getAverageLevel1Price(): Promise<number> {
  const stock = await fetchStockroomOffersMap();
  const offers = stock.success && stock.offers ? stock.offers : {};
  return RewardCostCalculator.averageLevel1PriceFromOffers(offers);
}

