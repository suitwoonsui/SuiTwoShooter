// ==========================================
// Reward Cost Calculator Service
// Calculates the cost of custom tournament rewards
// ==========================================

import { getItemPrice, ITEM_CATALOG } from './item-catalog';
import { getBadgeService } from '../sui/badge-service';
import { getDiscounts } from '../sui/badge-service/badge-utilities';

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
  itemId: string;      // Item type: 'orbLevel', 'forceField', 'extraLives', 'slowTime', 'coinTractorBeam', 'destroyAll', 'bossKillShot'
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
const SPECIAL_ITEMS = ['destroyAll', 'bossKillShot'];

/**
 * RewardCostCalculator - Calculates the cost of custom tournament rewards
 */
export class RewardCostCalculator {
  /**
   * Get average Level 1 item price
   * Excludes special items (destroyAll, bossKillShot)
   */
  static getAverageLevel1Price(): number {
    const level1Items = [
      ITEM_CATALOG.extraLives.levels[0].usdPrice,      // $0.35
      ITEM_CATALOG.forceField.levels[0].usdPrice,     // $0.75
      ITEM_CATALOG.orbLevel.levels[0].usdPrice,       // $0.50
      ITEM_CATALOG.coinTractorBeam.levels[0].usdPrice, // $0.75
      ITEM_CATALOG.slowTime.levels[0].usdPrice,      // $1.00
    ];
    
    const sum = level1Items.reduce((acc, price) => acc + price, 0);
    return sum / level1Items.length; // $0.67
  }

  /**
   * Get badge discount for a player
   * Returns store discount percentage (0-25%)
   */
  static async getBadgeDiscountForPlayer(playerAddress: string): Promise<number> {
    try {
      const badgeService = getBadgeService();
      const badgeData = await badgeService.getBadge(playerAddress);
      
      if (badgeData && badgeData.badgeId && badgeData.tier) {
        const discounts = getDiscounts(badgeData.tier);
        return discounts.store; // Use store discount (0-25%)
      }
      
      return 0; // No badge = 0% discount
    } catch (error) {
      console.warn('Error getting badge discount for player', {
        playerAddress,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return 0; // Default to 0% on error
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

    // Base cost: reward depth × average Level 1 price × total discount
    const baseCost = (rewardConfig.rewardDepth * AVERAGE_LEVEL_1_PRICE) * totalDiscountFactor;

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
        const itemPrice = getItemPrice(item.itemId, item.level);
        if (!itemPrice) {
          console.warn(`Invalid item price for ${item.itemId} level ${item.level}`);
          continue;
        }

        const quantity = item.quantity || 1;

        // Check if special item (apply badge discount only, no base discount)
        if (SPECIAL_ITEMS.includes(item.itemId)) {
          specialItemCost += itemPrice * quantity * badgeDiscountFactor;
        }
        // Check if level 2+ (apply badge discount only to price difference)
        else if (item.level > 1) {
          const level1Price = getItemPrice(item.itemId, 1) || AVERAGE_LEVEL_1_PRICE;
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
    rewardCostUSDCents: number
  ): {
    creationFeeUSDCents: number;
    startingAnteUSDCents: number;
    rewardCostUSDCents: number;
    totalUSDCents: number;
    totalUSD: number;
  } {
    const creationFeeUSDCents = CREATION_FEE_USD_CENTS;
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
  rewardCostUSDCents: number
) {
  return RewardCostCalculator.calculateTotalPayment(startingAnteUSDCents, rewardCostUSDCents);
}

export function getAverageLevel1Price(): number {
  return RewardCostCalculator.getAverageLevel1Price();
}

