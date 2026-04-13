// ==========================================
// Badge Utilities - Pure helper functions
// ==========================================

/**
 * Calculate badge tier from games played
 * Public method for external use (e.g., reconciliation)
 */
export function calculateTierFromGames(gamesPlayed: number): number {
  // Updated thresholds: Standard (1-4), Common (5-14), Uncommon (15-34), Rare (35-74), Epic (75-149), Legendary (150+)
  if (gamesPlayed >= 150) return 5; // Legendary
  if (gamesPlayed >= 75) return 4;  // Epic
  if (gamesPlayed >= 35) return 3;  // Rare
  if (gamesPlayed >= 15) return 2;  // Uncommon
  if (gamesPlayed >= 5) return 1;   // Common
  return 0; // Standard (1-4 games)
}

/** Badge discount config (storeDiscounts[tier], gameplayDiscounts[tier]). Source: platform Aquifer key badge_discounts_and_thresholds. */
export type BadgeDiscountConfig = {
  storeDiscounts: number[];
  gameplayDiscounts: number[];
};

/**
 * Get discount percentages for a badge tier from config only.
 * When config is missing or tier out of range, returns 0/0 (no discount).
 */
export function getDiscounts(
  tier: number,
  config?: BadgeDiscountConfig | null
): { store: number; gameplay: number } {
  if (
    config &&
    Array.isArray(config.storeDiscounts) &&
    Array.isArray(config.gameplayDiscounts) &&
    tier >= 0 &&
    tier < config.storeDiscounts.length &&
    tier < config.gameplayDiscounts.length
  ) {
    return {
      store: config.storeDiscounts[tier] ?? 0,
      gameplay: config.gameplayDiscounts[tier] ?? 0,
    };
  }
  return { store: 0, gameplay: 0 };
}
