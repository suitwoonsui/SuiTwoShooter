// ==========================================
// GAME PASS SERVICE - Game Pass API Integration
// ==========================================
// Handles game pass status, purchases, and credit consumption

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

const GamePassService = {
  // State
  _initialized: false,
  _statusCache: null,
  _cacheTimestamp: null,
  _cacheTTL: 30000, // 30 seconds cache TTL

  /**
   * Initialize the game pass service
   */
  init() {
    if (this._initialized) {
      log.warn('GAME PASS SERVICE', 'Already initialized');
      return;
    }
    
    this._statusCache = null;
    this._cacheTimestamp = null;
    this._initialized = true;
    log.debug('GAME PASS SERVICE', 'Initialized');
  },

  /**
   * Get API base URL
   */
  _getApiBaseUrl() {
    return window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3000/api';
  },

  /**
   * Get game pass status for a player
   * @param {string} playerAddress - Player's wallet address
   * @param {boolean} forceRefresh - Force refresh (bypass cache)
   * @returns {Promise<{success: boolean, hasPass?: boolean, gamesRemaining?: number, isActive?: boolean, packType?: number, ticketCount?: number, error?: string}>}
   */
  async getGamePassStatus(playerAddress, forceRefresh = false) {
    if (!playerAddress) {
      return {
        success: false,
        error: 'Player address is required'
      };
    }

    // Check cache if not forcing refresh
    if (!forceRefresh && this._statusCache && this._cacheTimestamp) {
      const cacheAge = Date.now() - this._cacheTimestamp;
      if (cacheAge < this._cacheTTL && this._statusCache.playerAddress === playerAddress) {
        log.debug('GAME PASS SERVICE', 'Returning cached status', this._statusCache);
        return this._statusCache;
      }
    }

    try {
      const API_BASE_URL = this._getApiBaseUrl();
      const response = await fetch(`${API_BASE_URL}/game-pass/${playerAddress}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to get game pass status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to get game pass status');
      }

      // Cache the result
      this._statusCache = {
        success: true,
        playerAddress,
        hasPass: data.hasPass || false,
        gamesRemaining: data.gamesRemaining || 0,
        isActive: data.isActive || false,
        packType: data.packType || 1,
        ticketCount: data.ticketCount || 0,
      };
      this._cacheTimestamp = Date.now();

      log.debug('GAME PASS SERVICE', 'Game pass status retrieved', this._statusCache);
      return this._statusCache;
    } catch (error) {
      log.error('GAME PASS SERVICE', 'Error getting game pass status', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Purchase a credit pack
   * @param {string} playerAddress - Player's wallet address
   * @param {number} packType - Pack type (1=Starter, 2=Regular, 3=Value, 4=Mega)
   * @param {string} paymentToken - Payment token ('SUI', 'MEWS', or 'USDC')
   * @param {number} badgeDiscount - Badge discount percentage (0-25)
   * @returns {Promise<{success: boolean, transaction?: string, gasEstimate?: string, error?: string}>}
   */
  async purchaseCreditPack(playerAddress, packType, paymentToken, badgeDiscount = 0) {
    if (!playerAddress) {
      return {
        success: false,
        error: 'Player address is required'
      };
    }

    if (packType < 1 || packType > 4) {
      return {
        success: false,
        error: 'Invalid pack type. Must be 1-4 (Starter, Regular, Value, Mega)'
      };
    }

    if (!['SUI', 'MEWS', 'USDC'].includes(paymentToken)) {
      return {
        success: false,
        error: 'Invalid payment token. Must be SUI, MEWS, or USDC'
      };
    }

    try {
      const API_BASE_URL = this._getApiBaseUrl();
      const response = await fetch(`${API_BASE_URL}/game-pass/purchase-pack`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerAddress,
          packType,
          paymentToken,
          badgeDiscount: badgeDiscount > 0 ? badgeDiscount : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Purchase failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success || !data.transaction) {
        throw new Error(data.error || 'Failed to build purchase transaction');
      }

      log.info('GAME PASS SERVICE', 'Credit pack purchase transaction built', {
        packType,
        paymentToken,
        totalUSD: data.totalUSD,
        totalToken: data.totalToken,
      });

      // Invalidate cache after purchase
      this._statusCache = null;
      this._cacheTimestamp = null;

      return {
        success: true,
        transaction: data.transaction,
        gasEstimate: data.gasEstimate,
        totalUSD: data.totalUSD,
        originalTotalUSD: data.originalTotalUSD,
        discountApplied: data.discountApplied || 0,
        totalToken: data.totalToken,
        paymentToken: data.paymentToken,
        packType: data.packType,
        gamesIncluded: data.gamesIncluded,
      };
    } catch (error) {
      log.error('GAME PASS SERVICE', 'Error purchasing credit pack', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Purchase a single game (pay-per-game)
   * @param {string} playerAddress - Player's wallet address
   * @param {string} paymentToken - Payment token ('SUI', 'MEWS', or 'USDC')
   * @param {number} badgeDiscount - Badge discount percentage (0-25)
   * @returns {Promise<{success: boolean, transaction?: string, gasEstimate?: string, error?: string}>}
   */
  async purchaseSingleGame(playerAddress, paymentToken, badgeDiscount = 0) {
    if (!playerAddress) {
      return {
        success: false,
        error: 'Player address is required'
      };
    }

    if (!['SUI', 'MEWS', 'USDC'].includes(paymentToken)) {
      return {
        success: false,
        error: 'Invalid payment token. Must be SUI, MEWS, or USDC'
      };
    }

    try {
      const API_BASE_URL = this._getApiBaseUrl();
      const response = await fetch(`${API_BASE_URL}/game-pass/purchase-single`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerAddress,
          paymentToken,
          badgeDiscount: badgeDiscount > 0 ? badgeDiscount : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Purchase failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success || !data.transaction) {
        throw new Error(data.error || 'Failed to build purchase transaction');
      }

      log.info('GAME PASS SERVICE', 'Single game purchase transaction built', {
        paymentToken,
        totalUSD: data.totalUSD,
        totalToken: data.totalToken,
      });

      // Invalidate cache after purchase
      this._statusCache = null;
      this._cacheTimestamp = null;

      return {
        success: true,
        transaction: data.transaction,
        gasEstimate: data.gasEstimate,
        totalUSD: data.totalUSD,
        originalTotalUSD: data.originalTotalUSD,
        discountApplied: data.discountApplied || 0,
        totalToken: data.totalToken,
        paymentToken: data.paymentToken,
        gamesIncluded: data.gamesIncluded,
      };
    } catch (error) {
      log.error('GAME PASS SERVICE', 'Error purchasing single game', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Consume a game credit (called by backend when game starts)
   * @param {string} playerAddress - Player's wallet address
   * @returns {Promise<{success: boolean, digest?: string, gamesRemaining?: number, error?: string}>}
   */
  async consumeGameCredit(playerAddress) {
    if (!playerAddress) {
      return {
        success: false,
        error: 'Player address is required'
      };
    }

    try {
      const API_BASE_URL = this._getApiBaseUrl();
      const response = await fetch(`${API_BASE_URL}/game-pass/consume-credit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerAddress,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to consume credit: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to consume game credit');
      }

      log.info('GAME PASS SERVICE', 'Game credit consumed', {
        digest: data.digest,
        gamesRemaining: data.gamesRemaining,
      });

      // Invalidate cache after consumption
      this._statusCache = null;
      this._cacheTimestamp = null;

      return {
        success: true,
        digest: data.digest,
        gamesRemaining: data.gamesRemaining || 0,
      };
    } catch (error) {
      log.error('GAME PASS SERVICE', 'Error consuming game credit', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Purchase tournament tickets
   * @param {string} playerAddress - Player's wallet address
   * @param {number} quantity - Number of tickets to purchase (1, 6, 12, or 25)
   * @param {string} paymentToken - Payment token ('SUI', 'MEWS', or 'USDC')
   * @param {number} badgeDiscount - Badge discount percentage (0-25)
   * @returns {Promise<{success: boolean, transaction?: string, gasEstimate?: string, error?: string}>}
   */
  async purchaseTickets(playerAddress, quantity, paymentToken, badgeDiscount = 0) {
    if (!playerAddress) {
      return {
        success: false,
        error: 'Player address is required'
      };
    }

    if (![1, 6, 12, 25].includes(quantity)) {
      return {
        success: false,
        error: 'Invalid quantity. Must be 1, 6, 12, or 25 tickets'
      };
    }

    if (!['SUI', 'MEWS', 'USDC'].includes(paymentToken)) {
      return {
        success: false,
        error: 'Invalid payment token. Must be SUI, MEWS, or USDC'
      };
    }

    try {
      const API_BASE_URL = this._getApiBaseUrl();
      const response = await fetch(`${API_BASE_URL}/game-pass/purchase-tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerAddress,
          quantity,
          paymentToken,
          badgeDiscount: badgeDiscount > 0 ? badgeDiscount : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Purchase failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success || !data.transaction) {
        throw new Error(data.error || 'Failed to build purchase transaction');
      }

      log.info('GAME PASS SERVICE', 'Tournament ticket purchase transaction built', {
        quantity,
        paymentToken,
        totalUSD: data.totalUSD,
        totalToken: data.totalToken,
      });

      // Invalidate cache after purchase
      this._statusCache = null;
      this._cacheTimestamp = null;

      return {
        success: true,
        transaction: data.transaction,
        gasEstimate: data.gasEstimate,
        totalUSD: data.totalUSD,
        originalTotalUSD: data.originalTotalUSD,
        bundleDiscount: data.bundleDiscount || 0,
        badgeDiscount: data.badgeDiscount || 0,
        totalToken: data.totalToken,
        paymentToken: data.paymentToken,
        quantity: data.quantity,
      };
    } catch (error) {
      log.error('GAME PASS SERVICE', 'Error purchasing tournament tickets', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Invalidate cache (call after purchases/consumption)
   */
  invalidateCache() {
    this._statusCache = null;
    this._cacheTimestamp = null;
    log.debug('GAME PASS SERVICE', 'Cache invalidated');
  },
};

// Export to window for global access
if (typeof window !== 'undefined') {
  window.GamePassService = GamePassService;
}

