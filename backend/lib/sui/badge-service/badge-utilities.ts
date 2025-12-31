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

/**
 * Get discount percentages for a badge tier
 */
export function getDiscounts(tier: number): {
  store: number;
  gameplay: number;
} {
  const discounts = [
    { store: 0, gameplay: 0 },    // Standard
    { store: 5, gameplay: 0 },     // Common
    { store: 10, gameplay: 5 },    // Uncommon
    { store: 15, gameplay: 10 },   // Rare
    { store: 20, gameplay: 15 },   // Epic
    { store: 25, gameplay: 20 },   // Legendary
  ];
  return discounts[tier] || discounts[0];
}

