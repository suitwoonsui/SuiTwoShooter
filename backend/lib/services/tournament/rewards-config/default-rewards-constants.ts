// ==========================================
// Default reward config — single source (no file, no Node deps).
// Used by backend (Initialize, normalize) and admin UI (form defaults).
// ==========================================

import type { AdminInventoryItemInput } from '@/lib/services/inventory/admin-inventory-item';

export type DefaultRewardConfig = {
  rewardDepth: number;
  poolDepth: number;
  poolDistribution: number[];
  poolSource: number;
  itemRewards: Record<number, AdminInventoryItemInput[]>;
};

/**
 * System default rewards (documented structure).
 * 1st: Destroy All + Boss Kill Shot + Random L1; 2nd: Boss Kill Shot + Random L1; 3rd: Destroy All + Random L1; 4th–10th: Random L1 each.
 */
export const DEFAULT_REWARD_CONFIG: DefaultRewardConfig = {
  rewardDepth: 10,
  poolDepth: 3,
  poolDistribution: [50, 30, 20],
  poolSource: 0,
  itemRewards: {
    1: [
      { itemId: 'destroy_all', quantity: 1 },
      { itemId: 'boss_kill_shot', quantity: 1 },
      { itemId: 'random', level: 1, quantity: 1 },
    ],
    2: [
      { itemId: 'boss_kill_shot', quantity: 1 },
      { itemId: 'random', level: 1, quantity: 1 },
    ],
    3: [
      { itemId: 'destroy_all', quantity: 1 },
      { itemId: 'random', level: 1, quantity: 1 },
    ],
    4: [{ itemId: 'random', level: 1, quantity: 1 }],
    5: [{ itemId: 'random', level: 1, quantity: 1 }],
    6: [{ itemId: 'random', level: 1, quantity: 1 }],
    7: [{ itemId: 'random', level: 1, quantity: 1 }],
    8: [{ itemId: 'random', level: 1, quantity: 1 }],
    9: [{ itemId: 'random', level: 1, quantity: 1 }],
    10: [{ itemId: 'random', level: 1, quantity: 1 }],
  },
};

/** Return a deep copy for use as form default (avoids mutating shared constant). */
export function getSystemDefaultRewards(): DefaultRewardConfig {
  return JSON.parse(JSON.stringify(DEFAULT_REWARD_CONFIG));
}
