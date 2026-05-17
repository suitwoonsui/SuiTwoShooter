// ==========================================
// Provisions Service - Terminal item definitions (platform-only)
// Catalog: read from platform API only. Catalog admin: build via Channel only (game API routes use buildBatchViaChannel + platformTxClient.executeSigned).
// Env: PLATFORM_BACKEND_URL, ECOSYSTEM_ID, APP_ID; catalog admin cap: CORRIDOR_ADMIN_CAP_OBJECT_ID_* in config/contracts.<network>.json.
// ==========================================

import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { platformStoreClient } from '@/lib/services/platform/client/platform-client';
import { CATALOG_ITEM_ORDER } from '@/lib/services/store/catalog/catalog-order';
import { toDynamicProvisionKey } from '@/lib/services/store/catalog/item-id';

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
  /** Optional: some items are non-leveled (single purchase). */
  levels?: ItemLevel[];
}

export interface ProvisionsCatalog {
  [key: string]: StoreItem;
}

const NON_LEVELED_ITEM_IDS = new Set(['destroy_all', 'boss_kill_shot']);

/** Return a new catalog with keys in CATALOG_ITEM_ORDER; any extra items are appended. */
export function sortCatalogByOrder(catalog: ProvisionsCatalog): ProvisionsCatalog {
  const sorted: ProvisionsCatalog = {};
  for (const itemId of CATALOG_ITEM_ORDER) {
    const item = catalog[toDynamicProvisionKey(itemId)];
    if (item) sorted[item.id] = item;
  }
  for (const [itemId, item] of Object.entries(catalog)) {
    if (!sorted[itemId]) sorted[itemId] = item;
  }
  return sorted;
}

/**
 * ProvisionsService - Provisions (Terminal item definitions): catalog read from platform; catalog admin via Channel (API routes use buildBatchViaChannel).
 */
export class ProvisionsService {
  private _catalogCache: ProvisionsCatalog | null = null;
  private _catalogCacheTimestamp: number = 0;
  private _catalogVersion: number = 0;
  private readonly _catalogCacheTTL = 60000; // 1 minute

  constructor() {
    PlatformLogger.info('ProvisionsService initialized (platform catalog only)');
  }

  /**
   * Get item catalog from platform store/catalog API.
   */
  private async getCatalogFromPlatform(): Promise<{
    success: boolean;
    catalog?: ProvisionsCatalog;
    version?: number;
    error?: string;
  }> {
    try {
      const res = await platformStoreClient.getCatalog();
      if (!res.success || !res.catalog) {
        return { success: false, error: res.error || 'Platform catalog failed' };
      }
      const catalog: ProvisionsCatalog = {};
      const categoryMap = (s: string): 'defensive' | 'offensive' | 'tactical' | 'utility' => {
        if (s === 'defensive' || s === 'offensive' || s === 'tactical' || s === 'utility') return s;
        return 'utility';
      };
      for (const [id, def] of Object.entries(res.catalog)) {
        const normalizedId = toDynamicProvisionKey(def.id ?? id);
        const mappedLevels = (def.levels ?? []).map((l) => ({
          level: l.level ?? 0,
          effect: l.effect ?? '',
          description: l.description ?? '',
        }));
        // Legacy catalogs model single-purchase items as a single "level 1".
        // Normalize those to non-leveled items so UIs don't show "Level 1" blocks.
        const levels =
          NON_LEVELED_ITEM_IDS.has(normalizedId) && mappedLevels.length === 1 && mappedLevels[0]?.level === 1
            ? []
            : mappedLevels;
        catalog[id] = {
          id: def.id ?? id,
          name: def.name ?? '',
          description: def.description ?? '',
          category: categoryMap(def.category ?? ''),
          icon: def.icon ?? '',
          levels,
        };
      }
      return { success: true, catalog: sortCatalogByOrder(catalog), version: 1 };
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e);
      PlatformLogger.warn('getCatalogFromPlatform error', { error: err });
      return { success: false, error: err };
    }
  }

  /**
   * Get the full item catalog from blockchain
   * Returns all active items with their levels and prices
   */
  async getCatalog(): Promise<{
    success: boolean;
    catalog?: ProvisionsCatalog;
    version?: number;
    error?: string;
  }> {
    try {
      const platformResult = await this.getCatalogFromPlatform();
      if (platformResult.success && platformResult.catalog) {
        return {
          success: true,
          catalog: platformResult.catalog,
          version: platformResult.version ?? 0,
        };
      }
      return {
        success: false,
        error: platformResult.error || 'Platform catalog failed',
      };
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e);
      PlatformLogger.warn('getCatalog error', { error: err });
      return { success: false, error: err };
    }
  }

  /**
   * Clear the catalog cache
   * Call this after updating the catalog to force a fresh fetch
   */
  clearCache(): void {
    this._catalogCache = null;
    this._catalogCacheTimestamp = 0;
    PlatformLogger.info('📦 [CATALOG] Cache cleared');
  }

  /** Catalog is from platform only; no chain read. Returns version 0. */
  async getVersion(): Promise<{
    success: boolean;
    version?: number;
    error?: string;
  }> {
    return { success: true, version: 0 };
  }
}

// Singleton instance
let provisionsServiceInstance: ProvisionsService | null = null;

export function getProvisionsService(): ProvisionsService {
  if (!provisionsServiceInstance) {
    provisionsServiceInstance = new ProvisionsService();
  }
  return provisionsServiceInstance;
}
