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
    
    // Transaction tracking: walletAddress → [{ digest, type, timestamp }, ...]
    this.transactionDigests = new Map();
    
    // Cache version (incremented on major invalidations)
    this.version = 0;
    
    // Default TTL (30 seconds)
    this.defaultTTL = defaultTTL;
    
    // Default TTLs by data type
    this.ttlByType = {
      inventory: 30000,      // 30 seconds
      badge: 60000,          // 60 seconds
      stats: 30000,          // 30 seconds
      leaderboard: 60000,    // 60 seconds
      balance: 10000,         // 10 seconds
      storeItems: 300000,    // 5 minutes
    };
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

    // If bypassing cache, fetch fresh data
    if (bypassCache) {
      log.debug('API CACHE', `Bypassing cache for key: ${key}`);
      try {
        const data = await fetcher();
        this.set(key, data, ttl, walletAddress);
        return data;
      } catch (error) {
        // If fetch fails and we have stale cache, use it
        const cached = this.cache.get(key);
        if (cached) {
          log.warn('API CACHE', 'Fetch failed, using stale cache', { key, error });
          return cached.data;
        }
        throw error;
      }
    }

    const cached = this.cache.get(key);
    const now = Date.now();
    const cacheTTL = ttl || this._getTTLForKey(key) || this.defaultTTL;
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
      
      // Refresh in background (don't await)
      fetcher().then(freshData => {
        this.set(key, freshData, cacheTTL, walletAddress);
        log.debug('API CACHE', `Background refresh complete: ${key}`);
      }).catch(error => {
        log.warn('API CACHE', 'Background refresh failed, keeping stale cache', { key, error });
      });
      
      return staleData;
    }

    // No valid cache, fetch fresh data
    try {
      const data = await fetcher();
      this.set(key, data, cacheTTL, walletAddress);
      return data;
    } catch (error) {
      // Fallback to stale cache if available
      if (cached) {
        log.warn('API CACHE', 'Fetch failed, using stale cache', { key, error });
        return cached.data;
      }
      throw error;
    }
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
  }

  /**
   * Invalidate all entries matching pattern
   * @param {string} pattern - Pattern to match (checks if key includes pattern)
   */
  invalidateByPattern(pattern) {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        count++;
      }
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
        this.invalidate(`stats:${walletAddress}`);
        log.debug('API CACHE', `Invalidated badge and stats for transaction: ${transactionType}`);
        break;
        
      case 'store_purchase':
        this.invalidate(`inventory:${walletAddress}`);
        this.invalidate(`balance:${walletAddress}`);
        log.debug('API CACHE', `Invalidated inventory and balance for purchase`);
        break;
        
      case 'item_consume':
        this.invalidate(`inventory:${walletAddress}`);
        this.invalidate(`stats:${walletAddress}`);
        log.debug('API CACHE', `Invalidated inventory and stats for item consumption`);
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
      badge_upgrade: ['badge:', 'stats:'],
      badge_mint: ['badge:', 'stats:'],
      badge_migration: ['badge:', 'stats:'],
      store_purchase: ['inventory:', 'balance:'],
      item_consume: ['inventory:', 'stats:']
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
    return null;
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
    this.transactionDigests.clear();
    this.version = 0;
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

