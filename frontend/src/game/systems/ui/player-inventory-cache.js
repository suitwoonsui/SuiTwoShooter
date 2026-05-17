// ==========================================
// PLAYER INVENTORY CACHE (menu + store item selection)
// ==========================================
// Populated via GET /api/inventory/:addr (normalized keys, 15m TTL).
// Store modal may call the game backend combined snapshot route (inventory + game pass in one response) when needed — see store-modal fallback fetch.
// TTL 15 minutes; invalidated on purchase; after each successful on-chain consume we force-refetch from /inventory.

const PLAYER_INVENTORY_TTL_MS = 15 * 60 * 1000;

function normalizeInventoryKeys(inventory) {
  const out = {};
  const source = inventory && typeof inventory === 'object' ? inventory : {};
  for (const [key, value] of Object.entries(source)) {
    if (typeof value !== 'number' || value <= 0) continue;
    const k = String(key);
    let normalizedKey = k;
    const m = /^(.+)_level_(\d+)$/i.exec(k);
    if (m) {
      const base = String(m[1] || '');
      const level = String(m[2] || '');
      normalizedKey = base.includes('_') ? `${base}_${level}` : k;
    }
    out[normalizedKey] = (out[normalizedKey] || 0) + value;
  }
  return out;
}

function gameBackendBase() {
  const raw = window.GameApi ? window.GameApi.getBaseUrl() : (window.GAME_CONFIG?.GAME_BACKEND_URL || window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3001/api');
  return String(raw).replace(/\/?$/, '');
}

const PlayerInventoryCache = {
  _entry: null,
  /** @type {string|null} */
  _pendingGameOverRefetchAddress: null,
  /** @type {Map<string, Promise<any>>} */
  _inventoryFetchInFlightByAddress: new Map(),

  ttlMs: PLAYER_INVENTORY_TTL_MS,

  isFreshForAddress(address) {
    if (!address || !this._entry || this._entry.address !== address) return false;
    return Date.now() - this._entry.at < PLAYER_INVENTORY_TTL_MS;
  },

  /**
   * @returns {Record<string, number>|null} clone of cached inventory or null
   */
  getFreshOrNull(address) {
    if (!this.isFreshForAddress(address)) return null;
    return { ...this._entry.inventory };
  },

  /**
   * @param {string} address
   * @param {Record<string, unknown>} inventoryObj
   * @param {{ source?: string }} [meta]
   */
  setInventory(address, inventoryObj, meta = {}) {
    const inventory = normalizeInventoryKeys(inventoryObj || {});
    const at = Date.now();
    this._entry = {
      address,
      inventory,
      at,
      source: meta.source || 'unknown',
    };
    window.__prefetchedInventory = { address, inventory, at };
    if (window.apiRequestCache) {
      window.apiRequestCache.set(`inventory:${address}`, inventory, PLAYER_INVENTORY_TTL_MS, address);
    }
  },

  invalidate(address) {
    if (this._entry && (!address || this._entry.address === address)) {
      this._entry = null;
    }
    if (address && window.apiRequestCache) {
      window.apiRequestCache.invalidate(`inventory:${address}`);
    }
    try {
      if (window.__prefetchedInventory && (!address || window.__prefetchedInventory.address === address)) {
        delete window.__prefetchedInventory;
      }
    } catch (_) {}
  },

  async fetchPlayerInventoryAndCache(address, opts) {
    const addr = String(address || '').trim();
    if (!addr) throw new Error('player-inventory: missing wallet address');
    const forceRefresh = Boolean(opts && opts.forceRefresh);
    if (forceRefresh) {
      this.invalidate(addr);
    }

    // In-flight dedupe: avoid duplicate network calls (prefetch + store open, etc.)
    const existing = this._inventoryFetchInFlightByAddress.get(addr);
    if (existing) return existing;

    // GET /api/inventory — item quantities for store + prep loadout. Credits/tickets use GET /api/reservoir.
    const p = (async () => {
      const base = gameBackendBase();
      const refreshQ = forceRefresh ? '&_refresh=1' : '';
      const res = await fetch(
        `${base}/inventory/${encodeURIComponent(addr)}?contract=new${refreshQ}`,
        { cache: 'no-store' }
      );
      const data = await res.json().catch(() => null);
      if (!data || !data.success) {
        throw new Error(data?.error || 'inventory failed');
      }
      this.setInventory(addr, data.inventory || {}, { source: 'inventory-api' });
      return { success: true, inventory: data.inventory || {} };
    })().finally(() => {
      this._inventoryFetchInFlightByAddress.delete(addr);
    });

    this._inventoryFetchInFlightByAddress.set(addr, p);
    return p;
  },

  async fetchInventoryEndpointAndCache(address) {
    const base = gameBackendBase();
    const res = await fetch(
      `${base}/inventory/${encodeURIComponent(address)}?contract=new`,
      { cache: 'no-store' }
    );
    if (!res.ok) throw new Error(`inventory HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'inventory failed');
    this.setInventory(address, data.inventory || {}, { source: 'inventory-api' });
    return data;
  },

  markPendingRefetchOnGameOver(address) {
    if (address) this._pendingGameOverRefetchAddress = address;
  },

  /**
   * Force network refetch after a successful consume (start-game items, mid-game consumable, tournament entry, etc.).
   * Keeps store + item-selection UI aligned with chain state.
   * @param {string} address
   */
  refreshInventoryAfterConsumption(address) {
    if (!address || typeof window === 'undefined') return;
    void this.fetchPlayerInventoryAndCache(address, { forceRefresh: true })
      .then(() => {
        const inv = this.getFreshOrNull(address);
        if (inv && typeof window.loadInventoryDisplay === 'function') {
          return window.loadInventoryDisplay(inv);
        }
        return undefined;
      })
      .catch((e) => {
        console.warn('[PlayerInventoryCache] refreshInventoryAfterConsumption failed', e?.message || e);
      });
  },

  async runPendingGameOverRefetchIfAny() {
    const addr = this._pendingGameOverRefetchAddress;
    if (!addr) return;
    this._pendingGameOverRefetchAddress = null;
    try {
      await this.fetchPlayerInventoryAndCache(addr);
      if (typeof updateItemCardsInventory === 'function' && this._entry) {
        updateItemCardsInventory(this._entry.inventory);
      }
    } catch (e) {
      console.warn('[PlayerInventoryCache] Game-over inventory refetch failed', e?.message || e);
    }
  },

  /**
   * Invalidate + inventory refetch + store inventory UI + game-pass refresh (non-blocking).
   * Use after milestone claims, tournament reward moments, store purchase, etc.
   * @param {string} address
   */
  refreshAfterRewardBackground(address, options) {
    if (!address || typeof window === 'undefined') return;
    const refreshInventory = options?.inventory !== false;
    const refreshGamePass = options?.gamePass !== false;
    if (refreshInventory) this.invalidate(address);
    void (async () => {
      try {
        if (refreshInventory) {
          await this.fetchPlayerInventoryAndCache(address);
          const inv = this.getFreshOrNull(address);
          if (inv && typeof window.loadInventoryDisplay === 'function') {
            await window.loadInventoryDisplay(inv);
          }
        }
        if (refreshGamePass && window.GamePassDisplay && typeof window.GamePassDisplay.refresh === 'function') {
          await window.GamePassDisplay.refresh(address, true, false).catch(() => {});
        }
      } catch (e) {
        console.warn('[PlayerInventoryCache] refreshAfterRewardBackground failed', e?.message || e);
      }
    })();
  },

  /**
   * @param {Array<{ itemId: string, level: number, quantity?: number }>} items
   */
  applyOptimisticConsume(address, items) {
    if (!this._entry || this._entry.address !== address || !Array.isArray(items)) return;
    for (const it of items) {
      const level = typeof it.level === 'number' ? it.level : 1;
      const q = typeof it.quantity === 'number' && it.quantity > 0 ? it.quantity : 1;
      const key = `${it.itemId}_${level}`;
      const cur = this._entry.inventory[key] || 0;
      this._entry.inventory[key] = Math.max(0, cur - q);
    }
    this._entry.at = Date.now();
    window.__prefetchedInventory = {
      address,
      inventory: { ...this._entry.inventory },
      at: this._entry.at,
    };
    if (window.apiRequestCache) {
      window.apiRequestCache.set(`inventory:${address}`, this._entry.inventory, PLAYER_INVENTORY_TTL_MS, address);
    }
  },
};

if (typeof window !== 'undefined') {
  window.PlayerInventoryCache = PlayerInventoryCache;
  window.prefetchPlayerInventory = function prefetchPlayerInventory(address) {
    if (!address) return Promise.resolve();
    return PlayerInventoryCache.fetchPlayerInventoryAndCache(address).catch((err) => {
      console.warn('[prefetchPlayerInventory]', err?.message || err);
    });
  };
}
