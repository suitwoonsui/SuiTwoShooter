// ==========================================
// API REQUEST CACHE - Centralized API Response Caching
// ==========================================
// Provides caching, invalidation, and transaction tracking for API requests
// ==========================================

// Use FrontendLogger if available, fallback to console
var log = (typeof window !== 'undefined' && window.FrontendLogger) 
  ? {
      debug: (cat, msg, data) => window.FrontendLogger.debug(cat, msg, data),
      info: (cat, msg, data) => window.FrontendLogger.info(cat, msg, data),
      warn: (cat, msg, data) => window.FrontendLogger.warn(cat, msg, data),
      error: (cat, msg, data) => window.FrontendLogger.error(cat, msg, data),
    }
  : {
      debug: () => {},
      info: (cat, msg, data) => console.log(`[${cat}] ${msg}`, data || ''),
      warn: (cat, msg, data) => console.warn(`[${cat}] ${msg}`, data || ''),
      error: (cat, msg, data) => console.error(`[${cat}] ${msg}`, data || ''),
    };

/**
 * API Request Cache Class
 * Manages caching, invalidation, and transaction tracking for API requests
 */
class ApiRequestCache {
  constructor(defaultTTL = 30000) {
    // Cache storage: key → { data, timestamp, ttl, version }
    this.cache = new Map();

    /** Same-key concurrent callers share one fetcher() promise. */
    this._inFlightGet = new Map();

    /** staleWhileRevalidate: at most one background refresh per key at a time. */
    this._inFlightSwr = new Map();

    /** Per-key epoch; incremented on invalidate so in-flight writes do not repopulate stale entries. */
    this._fetchGeneration = new Map();
    
    // Transaction tracking: walletAddress → [{ digest, type, timestamp }, ...]
    this.transactionDigests = new Map();
    
    // Cache version (incremented on major invalidations)
    this.version = 0;
    
    // Default TTL (30 seconds)
    this.defaultTTL = defaultTTL;
    
    // Default TTLs by data type (user-mutable data relies on explicit invalidation; TTL is a safety net.)
    this.ttlByType = {
      inventory: 900000,     // 15 minutes (aligned with PlayerInventoryCache)
      badge: 86400000,       // 24 hours (mint/upgrade invalidates badge:)
      stats: 86400000,       // 24 hours (invalidated on game over / score pipeline)
      leaderboard: 30000,    // 30 seconds (off-chain list; catch new submissions)
      balance: 10000,        // 10 seconds
      storeItems: 900000,    // 15 minutes (aligned with STORE_CATALOG_CACHE_TTL_MS / menu bootstrap store)
      tournamentEntry: 15000 // 15 seconds (player mutable; explicit invalidation on enter/score)
    };
  }

  /** Bump generation so in-flight fetches skip set() for this key (invalidate / pattern clear). */
  _bumpFetchGeneration(key) {
    this._fetchGeneration.set(key, (this._fetchGeneration.get(key) || 0) + 1);
  }

  /**
   * Single shared fetch for a key (dedupes concurrent get/bypass callers).
   * @private
   */
  _getDedupedFetch(key, fetcher, ttl, walletAddress) {
    const existing = this._inFlightGet.get(key);
    if (existing) {
      log.debug('API CACHE', `Joining in-flight fetch: ${key}`);
      return existing;
    }

    const cacheTTL = ttl || this._getTTLForKey(key) || this.defaultTTL;
    const genAtStart = this._fetchGeneration.get(key) || 0;

    const p = (async () => {
      try {
        const data = await fetcher();
        if ((this._fetchGeneration.get(key) || 0) === genAtStart) {
          this.set(key, data, cacheTTL, walletAddress);
        } else {
          log.debug('API CACHE', `Skipped cache set (superseded): ${key}`);
        }
        return data;
      } catch (error) {
        const entry = this.cache.get(key);
        if (entry) {
          log.warn('API CACHE', 'Fetch failed, using stale cache', { key, error });
          return entry.data;
        }
        throw error;
      } finally {
        this._inFlightGet.delete(key);
      }
    })();

    this._inFlightGet.set(key, p);
    return p;
  }

  /** One background SWR refresh per key at a time. */
  _scheduleSwrRefresh(key, fetcher, cacheTTL, walletAddress) {
    if (this._inFlightSwr.has(key)) return;

    const genAtStart = this._fetchGeneration.get(key) || 0;
    const bg = fetcher()
      .then((freshData) => {
        if ((this._fetchGeneration.get(key) || 0) === genAtStart) {
          this.set(key, freshData, cacheTTL, walletAddress);
          log.debug('API CACHE', `Background refresh complete: ${key}`);
        }
      })
      .catch((error) => {
        log.warn('API CACHE', 'Background refresh failed, keeping stale cache', { key, error });
      })
      .finally(() => {
        this._inFlightSwr.delete(key);
      });

    this._inFlightSwr.set(key, bg);
  }

  /**
   * Get data from cache or fetch if not available/stale
   * @param {string} key - Cache key
   * @param {Function} fetcher - Function that returns Promise with fresh data
   * @param {Object} options - Options { ttl, walletAddress, bypassCache, staleWhileRevalidate }
   * @returns {Promise<any>} Cached or fresh data
   */
  async get(key, fetcher, options = {}) {
    if (!fetcher || typeof fetcher !== 'function') {
      throw new Error('Fetcher function is required');
    }

    const {
      ttl = null,
      walletAddress = null,
      bypassCache = false,
      staleWhileRevalidate = false
    } = options;

    const cacheTTL = ttl || this._getTTLForKey(key) || this.defaultTTL;

    // Bypass read cache but dedupe concurrent bypass calls for the same key
    if (bypassCache) {
      log.debug('API CACHE', `Bypassing read cache (deduped fetch): ${key}`);
      return this._getDedupedFetch(key, fetcher, ttl, walletAddress);
    }

    const cached = this.cache.get(key);
    const now = Date.now();
    const isStale = cached && (now - cached.timestamp > cacheTTL);

    // Check if cache is stale due to recent transactions
    if (cached && walletAddress && this._isCacheStaleByTransaction(key, walletAddress, cached.timestamp)) {
      log.debug('API CACHE', `Cache stale due to recent transaction: ${key}`);
      this.cache.delete(key);
      // Continue to fetch fresh data
    } else if (cached && !isStale) {
      // Cache is valid and fresh
      log.debug('API CACHE', `Cache hit: ${key}`);
      return cached.data;
    } else if (cached && isStale && staleWhileRevalidate) {
      // Return stale data immediately, refresh in background
      log.debug('API CACHE', `Returning stale cache, refreshing in background: ${key}`);
      const staleData = cached.data;
      this._scheduleSwrRefresh(key, fetcher, cacheTTL, walletAddress);
      return staleData;
    }

    return this._getDedupedFetch(key, fetcher, ttl, walletAddress);
  }

  /**
   * Return cached data if entry exists and is still fresh (same rules as get() read path), without fetching.
   * @param {string} key
   * @param {string|null} walletAddress - When set, respects transaction-based staleness for this wallet.
   * @returns {any|null}
   */
  peekFresh(key, walletAddress = null) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    const cacheTTL = cached.ttl || this._getTTLForKey(key) || this.defaultTTL;
    const now = Date.now();
    if (now - cached.timestamp > cacheTTL) return null;
    if (walletAddress && this._isCacheStaleByTransaction(key, walletAddress, cached.timestamp)) {
      return null;
    }
    return cached.data;
  }

  /**
   * Set cache entry
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number|null} ttl - Time to live in milliseconds
   * @param {string|null} walletAddress - Wallet address (for transaction tracking)
   */
  set(key, data, ttl = null, walletAddress = null) {
    const cacheTTL = ttl || this._getTTLForKey(key) || this.defaultTTL;
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: cacheTTL,
      version: this.version,
      walletAddress
    });
    log.debug('API CACHE', `Cache set: ${key}`, { ttl: cacheTTL });
  }

  /**
   * Invalidate specific cache entry
   * @param {string} key - Cache key to invalidate
   */
  invalidate(key) {
    if (this.cache.delete(key)) {
      log.debug('API CACHE', `Invalidated: ${key}`);
    }
    this._bumpFetchGeneration(key);
  }

  /**
   * Invalidate all entries matching pattern
   * @param {string} pattern - Pattern to match (checks if key includes pattern)
   */
  invalidateByPattern(pattern) {
    let count = 0;
    const keysToBump = new Set();
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        keysToBump.add(key);
        count++;
      }
    }
    for (const key of this._inFlightGet.keys()) {
      if (key.includes(pattern)) keysToBump.add(key);
    }
    for (const key of keysToBump) {
      this._bumpFetchGeneration(key);
    }
    if (count > 0) {
      log.debug('API CACHE', `Invalidated ${count} entries matching pattern: ${pattern}`);
    }
  }

  /**
   * Invalidate all entries for a wallet address
   * @param {string} walletAddress - Wallet address
   */
  invalidateByWallet(walletAddress) {
    this.invalidateByPattern(walletAddress);
  }

  /**
   * Invalidate cache based on transaction type
   * @param {string} transactionType - Type of transaction (badge_upgrade, store_purchase, etc.)
   * @param {string} walletAddress - Wallet address
   */
  invalidateByTransaction(transactionType, walletAddress) {
    this.version++; // Increment version to mark cache as stale
    
    switch (transactionType) {
      case 'badge_upgrade':
      case 'badge_mint':
      case 'badge_migration':
        this.invalidate(`badge:${walletAddress}`);
        log.debug('API CACHE', `Invalidated badge for transaction: ${transactionType}`);
        break;
        
      case 'store_purchase':
      case 'store_cart_purchase':
        this.invalidate(`inventory:${walletAddress}`);
        this.invalidate(`balance:${walletAddress}`);
        log.debug('API CACHE', `Invalidated inventory and balance for purchase`);
        break;
        
      case 'item_consume':
        // On-chain consume is immediate; UI uses optimistic cache updates.
        // Full refetch runs on game over (see PlayerInventoryCache.runPendingGameOverRefetchIfAny).
        log.debug('API CACHE', 'item_consume: skipping inventory/stats invalidation (game-over refetch)');
        break;
        
      default:
        log.warn('API CACHE', `Unknown transaction type: ${transactionType}`);
    }
  }

  /**
   * Record a transaction digest for tracking
   * @param {string} walletAddress - Wallet address
   * @param {string} digest - Transaction digest
   * @param {string} transactionType - Type of transaction
   */
  recordTransaction(walletAddress, digest, transactionType) {
    if (!this.transactionDigests.has(walletAddress)) {
      this.transactionDigests.set(walletAddress, []);
    }
    
    this.transactionDigests.get(walletAddress).push({
      digest,
      type: transactionType,
      timestamp: Date.now()
    });
    
    // Invalidate relevant cache entries
    this.invalidateByTransaction(transactionType, walletAddress);
    
    log.debug('API CACHE', `Recorded transaction: ${transactionType}`, { walletAddress, digest });
  }

  /**
   * Check if cache is stale based on recent transactions
   * @private
   */
  _isCacheStaleByTransaction(key, walletAddress, cacheTimestamp) {
    const transactions = this.transactionDigests.get(walletAddress) || [];
    const relevantTransactions = transactions.filter(tx => 
      tx.timestamp > cacheTimestamp &&
      this._isTransactionRelevant(tx.type, key)
    );
    
    return relevantTransactions.length > 0;
  }

  /**
   * Check if transaction type is relevant to cache key
   * @private
   */
  _isTransactionRelevant(transactionType, key) {
    const relevantTypes = {
      badge_upgrade: ['badge:'],
      badge_mint: ['badge:'],
      badge_migration: ['badge:'],
      store_purchase: ['inventory:', 'balance:'],
      store_cart_purchase: ['inventory:', 'balance:'],
      item_consume: []
    };
    
    const patterns = relevantTypes[transactionType] || [];
    return patterns.some(pattern => key.includes(pattern));
  }

  /**
   * Get TTL for a cache key based on its type
   * @private
   */
  _getTTLForKey(key) {
    if (key.includes('inventory:')) return this.ttlByType.inventory;
    if (key.includes('badge:')) return this.ttlByType.badge;
    if (key.includes('stats:')) return this.ttlByType.stats;
    if (key.includes('leaderboard:')) return this.ttlByType.leaderboard;
    if (key.includes('balance:')) return this.ttlByType.balance;
    if (key.includes('storeItems:')) return this.ttlByType.storeItems;
    if (key.includes('tournamentEntry:')) return this.ttlByType.tournamentEntry;
    return null;
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
    this.transactionDigests.clear();
    this.version = 0;
    this._fetchGeneration.clear();
    this._inFlightSwr.clear();
    log.info('API CACHE', 'Cache cleared');
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getStats() {
    return {
      size: this.cache.size,
      version: this.version,
      transactionCount: Array.from(this.transactionDigests.values())
        .reduce((sum, txs) => sum + txs.length, 0)
    };
  }
}

// Create singleton instance
const apiRequestCache = new ApiRequestCache();

// Expose globally
if (typeof window !== 'undefined') {
  window.apiRequestCache = apiRequestCache;
  window.ApiRequestCache = apiRequestCache; // Also expose class for testing
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = apiRequestCache;
}

log.info('API CACHE', 'API request cache module loaded');

