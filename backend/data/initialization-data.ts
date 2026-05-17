// ==========================================
// Centralized Initialization Data
// ==========================================
// This file contains all default data used for initializing on-chain contracts
// All initialization scripts should import from here instead of hardcoding data

import { DEFAULT_PROVISIONS_SEED } from '../lib/services/store/catalog/provisions';

/** Re-export: on-chain catalog bootstrap template (Admin initialize). Not the runtime catalog. */
export { DEFAULT_PROVISIONS_SEED };

// Pack configurations (matching frontend and game_config.move constants)
export const PACK_CONFIGS = [
  {
    packType: 0, // PACK_SINGLE - Single game (1 credit)
    name: 'Single Game',
    description: 'Pay-per-game - Purchase one credit',
    priceUsdCents: 10,  // $0.10
    games: 1,
  },
  {
    packType: 1, // PACK_STARTER
    name: 'Starter',
    description: '9.1% off - Perfect for trying out the game',
    priceUsdCents: 100,  // $1.00
    games: 11,
  },
  {
    packType: 2, // PACK_REGULAR
    name: 'Regular',
    description: '11% off - Great value for regular players',
    priceUsdCents: 500,  // $5.00
    games: 56,
  },
  {
    packType: 3, // PACK_VALUE
    name: 'Value',
    description: '13% off - Best value for dedicated players',
    priceUsdCents: 1000, // $10.00
    games: 115,
  },
  {
    packType: 4, // PACK_MEGA
    name: 'Mega',
    description: '15% off - Maximum value for power players',
    priceUsdCents: 2000, // $20.00
    games: 235,
  },
];

/** One tournament ticket: Stockroom base item listing `tickets` (priced SKU), not a `ticket_pack_*` bundle. */
export const SINGLE_TICKET_STOCKROOM = {
  priceUsdCents: 100, // $1.00
  name: 'Single Ticket',
  description: 'One tournament entry',
};

// Ticket bundle configurations (multi-qty only; single ticket uses SINGLE_TICKET_STOCKROOM listing)
export const TICKET_BUNDLES = [
  {
    quantity: 6,
    priceUsdCents: 550, // $5.50
    name: '6 Tickets',
    description: '6 tournament tickets',
  },
  {
    quantity: 12,
    priceUsdCents: 1000, // $10.00
    name: '12 Tickets',
    description: '12 tournament tickets',
  },
  {
    quantity: 25,
    priceUsdCents: 2000, // $20.00
    name: '25 Tickets',
    description: '25 tournament tickets',
  },
];

// Minimum token balance required to play (in smallest unit with 9 decimals)
// Default: 500,000 $MEWS = 500000000 (with 9 decimals)
export const MIN_TOKEN_BALANCE = 500_000_000;

// Milestone defaults for Aquifer seeding only. Runtime definitions come from platform Aquifer.
// - Full initialize (admin route): uses structure-only snapshot (no credits/items); see milestoneDefinitionsStructureOnly().
// - initialize-rewards: merges credits/items from MILESTONE_DEFINITIONS onto live rows.
export interface MilestoneDefinition {
  milestoneId?: number; // Stable unique ID (stored on chain; used for claim/unclaim)
  threshold: number;
  credits: number;
  items: Array<{ itemId: string; level: number; quantity: number }>;
}

// Source data. May optionally include explicit milestoneId values (recommended for long-term stability).
// If milestoneId is omitted for a new milestone, it will be assigned in an append-only manner (max+1).
const MILESTONE_DEFINITIONS_RAW: Record<string, MilestoneDefinition[]> = {
  gamesPlayed: [
    { threshold: 5, credits: 1, items: [{ itemId: 'extra_lives', level: 1, quantity: 1 }, { itemId: 'orb_level', level: 1, quantity: 1 }] },
    { threshold: 15, credits: 2, items: [{ itemId: 'extra_lives', level: 1, quantity: 1 }, { itemId: 'force_field', level: 1, quantity: 1 }, { itemId: 'orb_level', level: 1, quantity: 1 }] },
    { threshold: 35, credits: 3, items: [{ itemId: 'extra_lives', level: 1, quantity: 1 }, { itemId: 'force_field', level: 1, quantity: 1 }, { itemId: 'orb_level', level: 1, quantity: 1 }, { itemId: 'coin_tractor_beam', level: 1, quantity: 1 }] },
    { threshold: 75, credits: 5, items: [{ itemId: 'extra_lives', level: 1, quantity: 1 }, { itemId: 'force_field', level: 1, quantity: 1 }, { itemId: 'orb_level', level: 2, quantity: 1 }, { itemId: 'slow_time', level: 1, quantity: 1 }, { itemId: 'coin_tractor_beam', level: 1, quantity: 1 }] },
    { threshold: 150, credits: 10, items: [{ itemId: 'extra_lives', level: 1, quantity: 1 }, { itemId: 'force_field', level: 2, quantity: 1 }, { itemId: 'orb_level', level: 2, quantity: 1 }, { itemId: 'slow_time', level: 1, quantity: 1 }, { itemId: 'coin_tractor_beam', level: 1, quantity: 1 }, { itemId: 'destroy_all', level: 1, quantity: 1 }] },
    { threshold: 300, credits: 15, items: [{ itemId: 'extra_lives', level: 2, quantity: 1 }, { itemId: 'force_field', level: 2, quantity: 1 }, { itemId: 'orb_level', level: 3, quantity: 1 }, { itemId: 'slow_time', level: 1, quantity: 1 }, { itemId: 'coin_tractor_beam', level: 2, quantity: 1 }, { itemId: 'destroy_all', level: 1, quantity: 1 }] },
    { threshold: 500, credits: 20, items: [{ itemId: 'extra_lives', level: 3, quantity: 1 }, { itemId: 'force_field', level: 3, quantity: 1 }, { itemId: 'orb_level', level: 3, quantity: 1 }, { itemId: 'slow_time', level: 3, quantity: 1 }, { itemId: 'coin_tractor_beam', level: 3, quantity: 1 }, { itemId: 'destroy_all', level: 1, quantity: 1 }, { itemId: 'boss_kill_shot', level: 1, quantity: 1 }] },
  ],
  bossesPerGame: [
    { threshold: 2, credits: 0, items: [{ itemId: 'orb_level', level: 1, quantity: 1 }] },
    { threshold: 4, credits: 1, items: [{ itemId: 'orb_level', level: 1, quantity: 1 }, { itemId: 'force_field', level: 1, quantity: 1 }] },
    { threshold: 6, credits: 2, items: [{ itemId: 'extra_lives', level: 1, quantity: 1 }, { itemId: 'orb_level', level: 1, quantity: 1 }, { itemId: 'force_field', level: 1, quantity: 1 }] },
    { threshold: 8, credits: 3, items: [{ itemId: 'extra_lives', level: 1, quantity: 1 }, { itemId: 'force_field', level: 1, quantity: 1 }, { itemId: 'orb_level', level: 2, quantity: 1 }] },
    { threshold: 10, credits: 5, items: [{ itemId: 'extra_lives', level: 2, quantity: 1 }, { itemId: 'force_field', level: 2, quantity: 1 }, { itemId: 'orb_level', level: 2, quantity: 1 }, { itemId: 'boss_kill_shot', level: 1, quantity: 1 }] },
    { threshold: 12, credits: 8, items: [{ itemId: 'extra_lives', level: 2, quantity: 1 }, { itemId: 'force_field', level: 2, quantity: 1 }, { itemId: 'orb_level', level: 3, quantity: 1 }, { itemId: 'boss_kill_shot', level: 1, quantity: 1 }] },
  ],
  bossesCumulative: [
    { threshold: 5, credits: 1, items: [{ itemId: 'extra_lives', level: 1, quantity: 1 }] },
    { threshold: 10, credits: 1, items: [{ itemId: 'force_field', level: 1, quantity: 1 }, { itemId: 'orb_level', level: 1, quantity: 1 }] },
    { threshold: 25, credits: 2, items: [{ itemId: 'extra_lives', level: 1, quantity: 1 }, { itemId: 'force_field', level: 1, quantity: 1 }, { itemId: 'orb_level', level: 1, quantity: 1 }] },
    { threshold: 50, credits: 3, items: [{ itemId: 'extra_lives', level: 2, quantity: 1 }, { itemId: 'force_field', level: 2, quantity: 1 }, { itemId: 'orb_level', level: 2, quantity: 1 }] },
    { threshold: 100, credits: 5, items: [{ itemId: 'extra_lives', level: 2, quantity: 1 }, { itemId: 'force_field', level: 2, quantity: 1 }, { itemId: 'orb_level', level: 2, quantity: 1 }, { itemId: 'boss_kill_shot', level: 1, quantity: 1 }] },
    { threshold: 200, credits: 8, items: [{ itemId: 'extra_lives', level: 2, quantity: 1 }, { itemId: 'force_field', level: 2, quantity: 1 }, { itemId: 'orb_level', level: 3, quantity: 1 }, { itemId: 'boss_kill_shot', level: 1, quantity: 1 }] },
    { threshold: 500, credits: 10, items: [{ itemId: 'extra_lives', level: 3, quantity: 1 }, { itemId: 'force_field', level: 3, quantity: 1 }, { itemId: 'orb_level', level: 3, quantity: 1 }, { itemId: 'boss_kill_shot', level: 1, quantity: 1 }] },
  ],
  scorePerGame: [
    { threshold: 10000, credits: 0, items: [{ itemId: 'orb_level', level: 1, quantity: 1 }] },
    { threshold: 25000, credits: 1, items: [{ itemId: 'orb_level', level: 1, quantity: 1 }, { itemId: 'force_field', level: 1, quantity: 1 }] },
    { threshold: 50000, credits: 1, items: [{ itemId: 'orb_level', level: 2, quantity: 1 }, { itemId: 'force_field', level: 1, quantity: 1 }, { itemId: 'extra_lives', level: 1, quantity: 1 }] },
    { threshold: 100000, credits: 2, items: [{ itemId: 'orb_level', level: 2, quantity: 1 }, { itemId: 'force_field', level: 1, quantity: 1 }, { itemId: 'extra_lives', level: 1, quantity: 1 }, { itemId: 'slow_time', level: 1, quantity: 1 }] },
    { threshold: 150000, credits: 3, items: [{ itemId: 'orb_level', level: 2, quantity: 1 }, { itemId: 'force_field', level: 2, quantity: 1 }, { itemId: 'extra_lives', level: 1, quantity: 1 }, { itemId: 'slow_time', level: 1, quantity: 1 }] },
    { threshold: 200000, credits: 5, items: [{ itemId: 'orb_level', level: 3, quantity: 1 }, { itemId: 'force_field', level: 2, quantity: 1 }, { itemId: 'extra_lives', level: 2, quantity: 1 }, { itemId: 'slow_time', level: 2, quantity: 1 }, { itemId: 'destroy_all', level: 1, quantity: 1 }] },
  ],
  scoreCumulative: [
    { threshold: 50000, credits: 0, items: [{ itemId: 'orb_level', level: 1, quantity: 1 }] },
    { threshold: 100000, credits: 1, items: [{ itemId: 'extra_lives', level: 1, quantity: 1 }, { itemId: 'orb_level', level: 1, quantity: 1 }] },
    { threshold: 250000, credits: 1, items: [{ itemId: 'extra_lives', level: 1, quantity: 1 }, { itemId: 'force_field', level: 1, quantity: 1 }, { itemId: 'orb_level', level: 1, quantity: 1 }] },
    { threshold: 500000, credits: 2, items: [{ itemId: 'extra_lives', level: 1, quantity: 1 }, { itemId: 'force_field', level: 1, quantity: 1 }, { itemId: 'orb_level', level: 2, quantity: 1 }, { itemId: 'slow_time', level: 1, quantity: 1 }] },
    { threshold: 1000000, credits: 3, items: [{ itemId: 'extra_lives', level: 2, quantity: 1 }, { itemId: 'force_field', level: 2, quantity: 1 }, { itemId: 'orb_level', level: 2, quantity: 1 }, { itemId: 'slow_time', level: 1, quantity: 1 }] },
    { threshold: 2500000, credits: 5, items: [{ itemId: 'extra_lives', level: 2, quantity: 1 }, { itemId: 'force_field', level: 2, quantity: 1 }, { itemId: 'orb_level', level: 2, quantity: 1 }, { itemId: 'slow_time', level: 2, quantity: 1 }] },
    { threshold: 5000000, credits: 10, items: [{ itemId: 'extra_lives', level: 2, quantity: 1 }, { itemId: 'force_field', level: 2, quantity: 1 }, { itemId: 'orb_level', level: 3, quantity: 1 }, { itemId: 'slow_time', level: 2, quantity: 1 }, { itemId: 'destroy_all', level: 1, quantity: 1 }] },
  ],
  distancePerGame: [
    { threshold: 5000, credits: 0, items: [{ itemId: 'orb_level', level: 1, quantity: 1 }] },
    { threshold: 10000, credits: 0, items: [{ itemId: 'orb_level', level: 1, quantity: 1 }, { itemId: 'force_field', level: 1, quantity: 1 }] },
    { threshold: 15000, credits: 1, items: [{ itemId: 'orb_level', level: 1, quantity: 1 }, { itemId: 'force_field', level: 1, quantity: 1 }, { itemId: 'extra_lives', level: 1, quantity: 1 }] },
    { threshold: 25000, credits: 2, items: [{ itemId: 'orb_level', level: 2, quantity: 1 }, { itemId: 'force_field', level: 1, quantity: 1 }, { itemId: 'extra_lives', level: 1, quantity: 1 }, { itemId: 'slow_time', level: 1, quantity: 1 }] },
    { threshold: 40000, credits: 3, items: [{ itemId: 'orb_level', level: 2, quantity: 1 }, { itemId: 'force_field', level: 2, quantity: 1 }, { itemId: 'extra_lives', level: 1, quantity: 1 }, { itemId: 'slow_time', level: 1, quantity: 1 }] },
    { threshold: 60000, credits: 5, items: [{ itemId: 'orb_level', level: 3, quantity: 1 }, { itemId: 'force_field', level: 3, quantity: 1 }, { itemId: 'extra_lives', level: 2, quantity: 1 }, { itemId: 'slow_time', level: 2, quantity: 1 }, { itemId: 'destroy_all', level: 1, quantity: 1 }] },
  ],
  distanceCumulative: [
    { threshold: 25000, credits: 0, items: [{ itemId: 'orb_level', level: 1, quantity: 1 }] },
    { threshold: 50000, credits: 1, items: [{ itemId: 'extra_lives', level: 1, quantity: 1 }, { itemId: 'orb_level', level: 1, quantity: 1 }] },
    { threshold: 100000, credits: 1, items: [{ itemId: 'extra_lives', level: 1, quantity: 1 }, { itemId: 'force_field', level: 1, quantity: 1 }, { itemId: 'orb_level', level: 1, quantity: 1 }] },
    { threshold: 250000, credits: 2, items: [{ itemId: 'extra_lives', level: 1, quantity: 1 }, { itemId: 'force_field', level: 1, quantity: 1 }, { itemId: 'orb_level', level: 1, quantity: 1 }, { itemId: 'slow_time', level: 1, quantity: 1 }] },
    { threshold: 500000, credits: 3, items: [{ itemId: 'extra_lives', level: 1, quantity: 1 }, { itemId: 'force_field', level: 1, quantity: 1 }, { itemId: 'orb_level', level: 2, quantity: 1 }, { itemId: 'slow_time', level: 1, quantity: 1 }] },
    { threshold: 1000000, credits: 5, items: [{ itemId: 'extra_lives', level: 2, quantity: 1 }, { itemId: 'force_field', level: 2, quantity: 1 }, { itemId: 'orb_level', level: 2, quantity: 1 }, { itemId: 'slow_time', level: 2, quantity: 1 }] },
    { threshold: 2500000, credits: 10, items: [{ itemId: 'extra_lives', level: 3, quantity: 1 }, { itemId: 'force_field', level: 3, quantity: 1 }, { itemId: 'orb_level', level: 3, quantity: 1 }, { itemId: 'slow_time', level: 3, quantity: 1 }, { itemId: 'destroy_all', level: 1, quantity: 1 }] },
  ],
  coinsPerGame: [
    { threshold: 25, credits: 0, items: [{ itemId: 'force_field', level: 1, quantity: 1 }] },
    { threshold: 50, credits: 0, items: [{ itemId: 'force_field', level: 1, quantity: 1 }, { itemId: 'coin_tractor_beam', level: 1, quantity: 1 }] },
    { threshold: 75, credits: 1, items: [{ itemId: 'force_field', level: 1, quantity: 1 }, { itemId: 'coin_tractor_beam', level: 1, quantity: 1 }, { itemId: 'extra_lives', level: 1, quantity: 1 }] },
    { threshold: 100, credits: 2, items: [{ itemId: 'force_field', level: 2, quantity: 1 }, { itemId: 'coin_tractor_beam', level: 1, quantity: 1 }, { itemId: 'extra_lives', level: 1, quantity: 1 }, { itemId: 'slow_time', level: 1, quantity: 1 }] },
    { threshold: 125, credits: 3, items: [{ itemId: 'force_field', level: 2, quantity: 1 }, { itemId: 'coin_tractor_beam', level: 2, quantity: 1 }, { itemId: 'extra_lives', level: 1, quantity: 1 }, { itemId: 'slow_time', level: 1, quantity: 1 }] },
    { threshold: 150, credits: 5, items: [{ itemId: 'force_field', level: 3, quantity: 1 }, { itemId: 'coin_tractor_beam', level: 3, quantity: 1 }, { itemId: 'extra_lives', level: 2, quantity: 1 }, { itemId: 'slow_time', level: 2, quantity: 1 }] },
  ],
  coinsCumulative: [
    { threshold: 250, credits: 0, items: [{ itemId: 'force_field', level: 1, quantity: 1 }] },
    { threshold: 500, credits: 1, items: [{ itemId: 'force_field', level: 1, quantity: 1 }, { itemId: 'coin_tractor_beam', level: 1, quantity: 1 }] },
    { threshold: 1000, credits: 1, items: [{ itemId: 'force_field', level: 1, quantity: 1 }, { itemId: 'coin_tractor_beam', level: 1, quantity: 1 }, { itemId: 'extra_lives', level: 1, quantity: 1 }] },
    { threshold: 2500, credits: 1, items: [{ itemId: 'force_field', level: 1, quantity: 1 }, { itemId: 'coin_tractor_beam', level: 1, quantity: 1 }, { itemId: 'extra_lives', level: 1, quantity: 1 }, { itemId: 'slow_time', level: 1, quantity: 1 }] },
    { threshold: 5000, credits: 2, items: [{ itemId: 'force_field', level: 2, quantity: 1 }, { itemId: 'coin_tractor_beam', level: 1, quantity: 1 }, { itemId: 'extra_lives', level: 1, quantity: 1 }, { itemId: 'slow_time', level: 1, quantity: 1 }] },
    { threshold: 10000, credits: 3, items: [{ itemId: 'force_field', level: 2, quantity: 1 }, { itemId: 'coin_tractor_beam', level: 2, quantity: 1 }, { itemId: 'extra_lives', level: 2, quantity: 1 }, { itemId: 'slow_time', level: 1, quantity: 1 }] },
    { threshold: 25000, credits: 10, items: [{ itemId: 'force_field', level: 3, quantity: 1 }, { itemId: 'coin_tractor_beam', level: 3, quantity: 1 }, { itemId: 'extra_lives', level: 3, quantity: 1 }, { itemId: 'slow_time', level: 3, quantity: 1 }] },
  ],
  enemiesPerGame: [
    { threshold: 25, credits: 0, items: [{ itemId: 'orb_level', level: 1, quantity: 1 }] },
    { threshold: 50, credits: 0, items: [{ itemId: 'orb_level', level: 1, quantity: 1 }, { itemId: 'force_field', level: 1, quantity: 1 }] },
    { threshold: 100, credits: 1, items: [{ itemId: 'orb_level', level: 1, quantity: 1 }, { itemId: 'force_field', level: 1, quantity: 1 }, { itemId: 'extra_lives', level: 1, quantity: 1 }] },
    { threshold: 250, credits: 2, items: [{ itemId: 'orb_level', level: 1, quantity: 1 }, { itemId: 'force_field', level: 1, quantity: 1 }, { itemId: 'extra_lives', level: 1, quantity: 1 }, { itemId: 'destroy_all', level: 1, quantity: 1 }, { itemId: 'slow_time', level: 1, quantity: 1 }] },
    { threshold: 400, credits: 3, items: [{ itemId: 'orb_level', level: 2, quantity: 1 }, { itemId: 'force_field', level: 2, quantity: 1 }, { itemId: 'extra_lives', level: 2, quantity: 1 }, { itemId: 'destroy_all', level: 1, quantity: 1 }, { itemId: 'slow_time', level: 2, quantity: 1 }] },
    { threshold: 500, credits: 5, items: [{ itemId: 'orb_level', level: 3, quantity: 1 }, { itemId: 'force_field', level: 3, quantity: 1 }, { itemId: 'extra_lives', level: 2, quantity: 1 }, { itemId: 'destroy_all', level: 1, quantity: 1 }, { itemId: 'slow_time', level: 3, quantity: 1 }] },
  ],
  enemiesCumulative: [
    { threshold: 100, credits: 0, items: [{ itemId: 'orb_level', level: 1, quantity: 1 }] },
    { threshold: 250, credits: 1, items: [{ itemId: 'orb_level', level: 1, quantity: 1 }] },
    { threshold: 500, credits: 1, items: [{ itemId: 'extra_lives', level: 1, quantity: 1 }, { itemId: 'orb_level', level: 1, quantity: 1 }] },
    { threshold: 1000, credits: 2, items: [{ itemId: 'extra_lives', level: 1, quantity: 1 }, { itemId: 'force_field', level: 1, quantity: 1 }, { itemId: 'orb_level', level: 1, quantity: 1 }] },
    { threshold: 2500, credits: 2, items: [{ itemId: 'extra_lives', level: 1, quantity: 1 }, { itemId: 'force_field', level: 1, quantity: 1 }, { itemId: 'orb_level', level: 2, quantity: 1 }, { itemId: 'destroy_all', level: 1, quantity: 1 }] },
    { threshold: 5000, credits: 3, items: [{ itemId: 'extra_lives', level: 2, quantity: 1 }, { itemId: 'force_field', level: 2, quantity: 1 }, { itemId: 'orb_level', level: 2, quantity: 1 }, { itemId: 'destroy_all', level: 1, quantity: 1 }, { itemId: 'slow_time', level: 1, quantity: 1 }] },
    { threshold: 10000, credits: 5, items: [{ itemId: 'extra_lives', level: 3, quantity: 1 }, { itemId: 'force_field', level: 3, quantity: 1 }, { itemId: 'orb_level', level: 3, quantity: 1 }, { itemId: 'destroy_all', level: 1, quantity: 1 }, { itemId: 'slow_time', level: 3, quantity: 1 }] },
  ],
  coinStreak: [
    { threshold: 10, credits: 0, items: [{ itemId: 'force_field', level: 1, quantity: 1 }] },
    { threshold: 20, credits: 0, items: [{ itemId: 'force_field', level: 1, quantity: 1 }, { itemId: 'coin_tractor_beam', level: 1, quantity: 1 }] },
    { threshold: 30, credits: 1, items: [{ itemId: 'force_field', level: 2, quantity: 1 }, { itemId: 'coin_tractor_beam', level: 1, quantity: 1 }] },
    { threshold: 40, credits: 2, items: [{ itemId: 'force_field', level: 2, quantity: 1 }, { itemId: 'coin_tractor_beam', level: 2, quantity: 1 }] },
    { threshold: 50, credits: 3, items: [{ itemId: 'force_field', level: 3, quantity: 1 }, { itemId: 'coin_tractor_beam', level: 3, quantity: 1 }] },
  ],
};

/** Milestone definitions with stable milestoneIds for on-chain storage and claim tracking. */
export const MILESTONE_DEFINITIONS: Record<string, MilestoneDefinition[]> = (() => {
  const out: Record<string, MilestoneDefinition[]> = {};
  // Append-only assignment:
  // - If a milestone already has milestoneId, keep it.
  // - Otherwise, assign nextId = (max existing milestoneId) + 1.
  let maxId = 0;
  for (const list of Object.values(MILESTONE_DEFINITIONS_RAW)) {
    for (const m of list ?? []) {
      if (typeof m?.milestoneId === 'number' && Number.isFinite(m.milestoneId)) {
        maxId = Math.max(maxId, m.milestoneId);
      }
    }
  }
  let nextId = maxId + 1;

  for (const [category, list] of Object.entries(MILESTONE_DEFINITIONS_RAW)) {
    out[category] = (list ?? []).map((m) => ({
      ...m,
      milestoneId: m.milestoneId != null ? m.milestoneId : nextId++,
    }));
  }
  return out;
})();

/**
 * Same categories, thresholds, and milestoneIds as {@link MILESTONE_DEFINITIONS}, but credits cleared and items empty.
 * Used by POST /api/admin/milestones/initialize so definition init does not apply reward payloads (use initialize-rewards for that).
 */
export function milestoneDefinitionsStructureOnly(): Record<string, MilestoneDefinition[]> {
  const out: Record<string, MilestoneDefinition[]> = {};
  for (const [category, list] of Object.entries(MILESTONE_DEFINITIONS)) {
    out[category] = (list ?? []).map((m) => ({
      ...m,
      credits: 0,
      items: [],
    }));
  }
  return out;
}

