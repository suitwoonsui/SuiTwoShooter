// ==========================================
// Provisions (Terminal item definitions)
// Catalog from platform only; no runtime fallback to chain or static data.
// DEFAULT_PROVISIONS_SEED is only for Admin “initialize catalog” (bootstrap on-chain); not used when reading the live catalog.
// Sell prices are in Stockroom only — use stockroom-pricing / Terminal store-catalog for USD amounts.
// ==========================================

import { getProvisionsService } from '@/lib/services/store/catalog/provisions-service';
import { toDynamicProvisionKey } from '@/lib/services/store/catalog/item-id';
import {
  fetchStockroomOffersMap,
  getStockroomUsdPriceForLevel,
} from '@/lib/services/store/stockroom-pricing';

export interface ItemLevel {
  level: number;
  effect: string;
  description: string;
}

export interface StoreItem {
  id: string;
  name: string;
  description: string;
  category: 'defensive' | 'offensive' | 'tactical' | 'utility';
  icon: string;
  /** Optional: items may be non-leveled (single-purchase) and omit levels. */
  levels?: ItemLevel[];
}

export interface ProvisionsCatalog {
  [key: string]: StoreItem;
}

/**
 * Default item definitions for bootstrapping the on-chain catalog (Admin initialize / batched_init).
 * Not used when reading the live catalog — that always comes from the platform API.
 */
export const DEFAULT_PROVISIONS_SEED: ProvisionsCatalog = {
  extra_lives: {
    id: 'extra_lives',
    name: 'Extra Lives',
    description: 'Start with additional lives beyond the default 3',
    category: 'defensive',
    icon: '❤️',
    levels: [
      { level: 1, effect: '+1 life', description: 'Start with 4 total lives (3 base + 1 purchased)' },
      { level: 2, effect: '+2 lives', description: 'Start with 5 total lives (3 base + 2 purchased)' },
      { level: 3, effect: '+3 lives', description: 'Start with 6 total lives (3 base + 3 purchased)' },
    ],
  },
  force_field: {
    id: 'force_field',
    name: 'Force Field Start',
    description: 'Begin the game with an active force field at a specified level',
    category: 'defensive',
    icon: '🛡️',
    levels: [
      { level: 1, effect: 'Level 1 force field', description: 'Start with Level 1 force field active (normally requires 5 coin streak)' },
      { level: 2, effect: 'Level 2 force field', description: 'Start with Level 2 force field active (normally requires 12 coin streak)' },
      { level: 3, effect: 'Level 3 force field', description: 'Start with Level 3 force field active (normally requires 30 coin streak)' },
    ],
  },
  orb_level: {
    id: 'orb_level',
    name: 'Orb Level Start',
    description: 'Begin the game with a higher magic orb level',
    category: 'offensive',
    icon: '🔮',
    levels: [
      { level: 1, effect: 'Start at Level 2', description: 'Begin at Orb Level 2 (skip initial grind)' },
      { level: 2, effect: 'Start at Level 3', description: 'Begin at Orb Level 3 (stronger starting power)' },
      { level: 3, effect: 'Start at Level 4', description: 'Begin at Orb Level 4 (very strong starting power)' },
    ],
  },
  coin_tractor_beam: {
    id: 'coin_tractor_beam',
    name: 'Coin Tractor Beam',
    description: 'Pull all coins on screen toward the player automatically',
    category: 'utility',
    icon: '🧲',
    levels: [
      { level: 1, effect: '4 seconds, 30% range', description: 'Pull coins from 30% of screen range for 4 seconds' },
      { level: 2, effect: '6 seconds, 60% range', description: 'Pull coins from 60% of screen range for 6 seconds' },
      { level: 3, effect: '8 seconds, 90% range', description: 'Pull coins from 90% of screen range for 8 seconds' },
    ],
  },
  slow_time: {
    id: 'slow_time',
    name: 'Slow Time Power',
    description: 'Activate a power that slows game speed for a short duration',
    category: 'tactical',
    icon: '⏱️',
    levels: [
      { level: 1, effect: '4 seconds duration', description: 'Slow time for 4 seconds (50% speed reduction)' },
      { level: 2, effect: '6 seconds duration', description: 'Slow time for 6 seconds (50% speed reduction)' },
      { level: 3, effect: '8 seconds duration', description: 'Slow time for 8 seconds (50% speed reduction)' },
    ],
  },
  destroy_all: {
    id: 'destroy_all',
    name: 'Destroy All Enemies',
    description: 'Launch seeking missiles that automatically destroy all enemies on screen',
    category: 'tactical',
    icon: '💥',
    levels: [],
  },
  boss_kill_shot: {
    id: 'boss_kill_shot',
    name: 'Boss Kill Shot',
    description: 'Instant kill the current boss with a powerful screen-wide attack',
    category: 'tactical',
    icon: '🎯',
    levels: [],
  },
};

// Cache for loaded provisions
let _catalogCache: ProvisionsCatalog | null = null;
let _catalogCacheTimestamp: number = 0;
const _catalogCacheTTL = 60000; // 1 minute

/**
 * Get the current provisions catalog. Catalog from platform only; no fallback to chain or static data.
 * When platform is not configured or the request fails, returns empty catalog (cache cleared).
 */
export async function getProvisions(): Promise<ProvisionsCatalog> {
  const now = Date.now();

  if (_catalogCache && (now - _catalogCacheTimestamp) < _catalogCacheTTL) {
    return _catalogCache;
  }

  const provisionsService = getProvisionsService();
  const result = await provisionsService.getCatalog();
  if (result.success && result.catalog && Object.keys(result.catalog).length > 0) {
    _catalogCache = result.catalog;
    _catalogCacheTimestamp = now;
    return result.catalog;
  }

  _catalogCache = {};
  _catalogCacheTimestamp = now;
  return {};
}

/**
 * Clear the provisions cache. Call after updating catalog to force a fresh fetch.
 */
export function clearProvisionsCache(): void {
  _catalogCache = null;
  _catalogCacheTimestamp = 0;
}

/**
 * Get provisions catalog synchronously (uses cache). Returns empty if not initialized.
 */
export function getProvisionsSync(): ProvisionsCatalog {
  return _catalogCache || {};
}

/**
 * Get item by ID (async)
 */
export async function getItemById(itemId: string): Promise<StoreItem | undefined> {
  const catalog = await getProvisions();
  return catalog[toDynamicProvisionKey(itemId)];
}

/**
 * Get item by ID (synchronous, uses cache)
 */
export function getItemByIdSync(itemId: string): StoreItem | undefined {
  const catalog = getProvisionsSync();
  return catalog[toDynamicProvisionKey(itemId)];
}

/** USD sell price from Stockroom for this item level, or null if missing. */
export async function getItemPrice(itemId: string, level: number): Promise<number | null> {
  const stock = await fetchStockroomOffersMap();
  if (!stock.success || !stock.offers) return null;
  return getStockroomUsdPriceForLevel(stock.offers, itemId, level);
}

/** Sync: returns null (use getItemPrice or pass a pre-fetched offers map). */
export function getItemPriceSync(_itemId: string, _level: number): number | null {
  return null;
}

/**
 * Get all items (async)
 */
export async function getAllItems(): Promise<StoreItem[]> {
  const catalog = await getProvisions();
  return Object.values(catalog);
}

/**
 * Get all items (synchronous, uses cache)
 */
export function getAllItemsSync(): StoreItem[] {
  const catalog = getProvisionsSync();
  return Object.values(catalog);
}

/**
 * Get items by category (async)
 */
export async function getItemsByCategory(category: StoreItem['category']): Promise<StoreItem[]> {
  const catalog = await getProvisions();
  return Object.values(catalog).filter(item => item.category === category);
}

/**
 * Get items by category (synchronous, uses cache)
 */
export function getItemsByCategorySync(category: StoreItem['category']): StoreItem[] {
  const catalog = getProvisionsSync();
  return Object.values(catalog).filter(item => item.category === category);
}

/**
 * Validate item and level combination (async): level exists on catalog item.
 */
export async function isValidItemLevel(itemId: string, level: number): Promise<boolean> {
  const item = await getItemById(itemId);
  if (!item) return false;
  return (item.levels ?? []).some((l) => l.level === level);
}

/** Validate item and level (sync, cache): level exists on catalog item. */
export function isValidItemLevelSync(itemId: string, level: number): boolean {
  const item = getItemByIdSync(itemId);
  if (!item) return false;
  return (item.levels ?? []).some((l) => l.level === level);
}

/**
 * Cart total in USD from Stockroom SKUs (same rules as checkout).
 */
export async function calculateTotalUSD(
  items: Array<{ itemId: string; level: number; quantity: number }>
): Promise<{ success: boolean; totalUSD?: number; error?: string }> {
  const offersRes = await fetchStockroomOffersMap();
  if (!offersRes.success || !offersRes.offers) {
    return { success: false, error: offersRes.error || 'Failed to load Stockroom offers.' };
  }
  let totalUSD = 0;
  for (const it of items) {
    const unit = getStockroomUsdPriceForLevel(offersRes.offers, it.itemId, it.level);
    if (unit === null) {
      return { success: false, error: `No Stockroom price for "${it.itemId}" (level ${it.level}).` };
    }
    totalUSD += unit * it.quantity;
  }
  return { success: true, totalUSD };
}

/**
 * @deprecated Provisions no longer carries prices; use calculateTotalUSD (Stockroom) or pre-fetch offers.
 */
export function calculateTotalUSDSync(
  _items: Array<{ itemId: string; level: number; quantity: number }>
): { success: boolean; totalUSD?: number; error?: string } {
  return {
    success: false,
    error: 'calculateTotalUSDSync is not supported; use async calculateTotalUSD (Stockroom pricing).',
  };
}

/** Proxy for synchronous access to current provisions catalog (cache). */
export const PROVISIONS = new Proxy({} as ProvisionsCatalog, {
  get: (target, prop) => {
    const catalog = getProvisionsSync();
    return catalog[prop as string];
  },
  ownKeys: () => {
    const catalog = getProvisionsSync();
    return Object.keys(catalog);
  },
  has: (target, prop) => {
    const catalog = getProvisionsSync();
    return prop in catalog;
  },
});
