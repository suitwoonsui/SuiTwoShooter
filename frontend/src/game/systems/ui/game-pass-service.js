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

/**
 * Single read of response body; parse JSON error or fall back from status when the body is HTML (e.g. gateway 502).
 * @param {Response} response
 * @param {string} bodyText
 * @returns {string}
 */
function httpErrorMessageFromResponse(response, bodyText) {
  try {
    const data = JSON.parse(bodyText);
    if (data && typeof data.error === 'string' && data.error.trim()) {
      return data.error.trim();
    }
  } catch (_) {
    // non-JSON body
  }
  if (response.status === 502 || response.status === 503) {
    return `The game server could not complete the transaction (${response.status}). This is often temporary—try again in a few seconds.`;
  }
  return `Request failed (${response.status}).`;
}

const GamePassService = {
  // State
  _initialized: false,
  _statusCache: null,
  _cacheTimestamp: null,
  /** Long TTL; cleared on purchase complete, start-game consume, credit consume, tournament ticket entry. */
  _cacheTTL: 15 * 60 * 1000, // 15 minutes
  _inFlightByAddress: new Map(),

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
    this._inFlightByAddress = new Map();
    this._initialized = true;
    log.debug('GAME PASS SERVICE', 'Initialized');
  },

  /**
   * Get API base URL - routes to correct backend based on endpoint
   */
  _getApiBaseUrl(endpoint = '/api/reservoir/') {
    // Use getBackendUrl helper if available (credits/tickets proxied at /api/reservoir on game backend)
    if (window.GAME_CONFIG?.getBackendUrl) {
      return window.GAME_CONFIG.getBackendUrl(endpoint);
    }
    // Frontend should always talk to the game backend.
    return window.GameApi ? window.GameApi.getBaseUrl() : (window.GAME_CONFIG?.GAME_BACKEND_URL || window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3001/api');
  },

  async _buildStorePurchase(playerAddress, offerId, paymentToken, badgeDiscount = 0) {
    const API_BASE_URL = this._getApiBaseUrl('/api/store/');
    const response = await fetch(`${API_BASE_URL}/store/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerAddress,
        // Backend expects Stockroom "cart lines" (offerId + redeemCount), not Provisions "items".
        // Keep returning `items` from this helper for compatibility with existing UI code.
        lines: [{ offerId: String(offerId), redeemCount: 1 }],
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
    return { ...data, items: [{ itemId: String(offerId), level: 1, quantity: 1 }] };
  },

  async completeStorePurchase(playerAddress, items, paymentDigest) {
    const API_BASE_URL = this._getApiBaseUrl('/api/store/');
    let confirmed = false;
    for (let attempt = 0; attempt < 30; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      try {
        const statusResponse = await fetch(`${API_BASE_URL}/store/transaction/${paymentDigest}`);
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          if (statusData?.confirmed) {
            confirmed = true;
            break;
          }
        }
      } catch (_) {
        // Keep polling.
      }
    }
    if (!confirmed) {
      throw new Error('Payment submitted but confirmation timed out');
    }
    this._statusCache = null;
    this._cacheTimestamp = null;
    return { success: true, digest: paymentDigest, confirmed: true, items };
  },

  /**
   * Get credit count and ticket count for a player (game uses only these).
   * Same request as getGamePassStatus; returns { success, credits, ticketCount }.
   * @param {string} playerAddress - Player's wallet address
   * @param {boolean} forceRefresh - Force refresh (bypass cache)
   * @returns {Promise<{success: boolean, credits: number, ticketCount: number, error?: string}>}
   */
  async getCreditsAndTickets(playerAddress, forceRefresh = false) {
    const result = await this.getGamePassStatus(playerAddress, forceRefresh);
    if (!result.success) return { success: false, credits: 0, ticketCount: 0, error: result.error };
    return {
      success: true,
      credits: result.gamesRemaining ?? result.credits ?? 0,
      ticketCount: result.ticketCount ?? 0,
    };
  },

  /**
   * Get game pass status (legacy). Prefer getCreditsAndTickets in game code.
   * @param {string} playerAddress - Player's wallet address
   * @param {boolean} forceRefresh - Force refresh (bypass cache)
   * @returns {Promise<{success: boolean, credits?: number, gamesRemaining?: number, ticketCount?: number, error?: string}>}
   */
  async getGamePassStatus(playerAddress, forceRefresh = false) {
    const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000000000000000000000000000';
    if (!playerAddress || playerAddress === ZERO_ADDRESS || playerAddress.toLowerCase() === ZERO_ADDRESS) {
      log.info('TICKET-FLOW', 'getGamePassStatus: no/zero address, returning zeros', { playerAddress: playerAddress || null });
      return {
        success: true,
        playerAddress: playerAddress || null,
        credits: 0,
        ticketCount: 0,
        gamesRemaining: 0,
        hasPass: false,
        isActive: false,
      };
    }

    // Check cache if not forcing refresh
    if (!forceRefresh && this._statusCache && this._cacheTimestamp) {
      const cacheAge = Date.now() - this._cacheTimestamp;
      if (cacheAge < this._cacheTTL && this._statusCache.playerAddress === playerAddress) {
        log.info('TICKET-FLOW', 'getGamePassStatus: returning cached', { ticketCount: this._statusCache.ticketCount, credits: this._statusCache.credits });
        return this._statusCache;
      }
    }

    // In-flight dedupe (avoid duplicate fetches when called from wallet connect + menu load + store open)
    const inFlight = this._inFlightByAddress.get(playerAddress);
    if (inFlight) {
      log.debug('TICKET-FLOW', 'getGamePassStatus: returning in-flight promise', { playerAddress: playerAddress.slice(0, 10) + '...' });
      return inFlight;
    }

    const requestPromise = (async () => {
      // Split read path: credits/tickets from /api/reservoir (inventory loads separately via /api/inventory).
      const API_BASE_URL = this._getApiBaseUrl('/api/reservoir/');
      const url = `${API_BASE_URL}/reservoir/${playerAddress}?contract=new${forceRefresh ? '&_refresh=1' : ''}`;
      log.info('TICKET-FLOW', 'getGamePassStatus: fetching', { url, playerAddress: playerAddress.slice(0, 10) + '...' });
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to get game pass status: ${response.status}`);
      }

      const data = await response.json();
      log.info('TICKET-FLOW', 'getGamePassStatus: response', {
        success: data.success,
        ticketCount: data.ticketCount,
        gamesRemaining: data.gamesRemaining,
        hasPass: data.hasPass,
        rawTicketCount: data.ticketCount,
      });

      if (!data.success) {
        throw new Error(data.error || 'Failed to get game pass status');
      }

      // Cache: game uses credit count and ticket count only (plus pass flags for UI state)
      const credits = data.gamesRemaining ?? data.credits ?? 0;
      const ticketCount = data.ticketCount ?? 0;
      this._statusCache = {
        success: true,
        playerAddress,
        credits,
        ticketCount,
        gamesRemaining: credits,
        hasPass: data.hasPass || false,
        isActive: data.isActive || false,
        packType: data.packType,
      };
      this._cacheTimestamp = Date.now();

      log.debug('GAME PASS SERVICE', 'Credits and tickets retrieved', { credits, ticketCount });
      return this._statusCache;
    })();

    this._inFlightByAddress.set(playerAddress, requestPromise);
    try {
      return await requestPromise;
    } catch (error) {
      log.error('GAME PASS SERVICE', 'Error getting game pass status', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    } finally {
      this._inFlightByAddress.delete(playerAddress);
    }
  },

  /**
   * Purchase a credit offer by Stockroom offer id
   * @param {string} playerAddress - Player's wallet address
   * @param {string} offerId - Stockroom offer id
   * @param {string} paymentToken - Payment token ('SUI', 'MEWS', or 'USDC')
   * @param {number} badgeDiscount - Badge discount percentage (0-25)
   * @returns {Promise<{success: boolean, transaction?: string, gasEstimate?: string, error?: string}>}
   */
  async purchaseCreditPack(playerAddress, offerId, paymentToken, badgeDiscount = 0) {
    if (!playerAddress) {
      return {
        success: false,
        error: 'Player address is required'
      };
    }

    if (!offerId || typeof offerId !== 'string') {
      return {
        success: false,
        error: 'Invalid offer id for credit purchase.'
      };
    }

    if (!['SUI', 'MEWS', 'USDC'].includes(paymentToken)) {
      return {
        success: false,
        error: 'Invalid payment token. Must be SUI, MEWS, or USDC'
      };
    }

    try {
      const data = await this._buildStorePurchase(playerAddress, offerId, paymentToken, badgeDiscount);
      return { success: true, ...data };
    } catch (error) {
      log.error('GAME PASS SERVICE', 'Error purchasing credit pack', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Purchase standalone single credit SKU (not a pack)
   * @param {string} playerAddress - Player's wallet address
   * @param {string} paymentToken - Payment token ('SUI', 'MEWS', or 'USDC')
   * @param {number} badgeDiscount - Badge discount percentage (0-25)
   * @returns {Promise<{success: boolean, transaction?: string, gasEstimate?: string, error?: string}>}
   */
  async purchaseSingleCredit(playerAddress, paymentToken, badgeDiscount = 0) {
    if (!playerAddress) return { success: false, error: 'Player address is required' };
    if (!['SUI', 'MEWS', 'USDC'].includes(paymentToken)) {
      return { success: false, error: 'Invalid payment token. Must be SUI, MEWS, or USDC' };
    }
    try {
      const data = await this._buildStorePurchase(playerAddress, 'credits', paymentToken, badgeDiscount);
      return { success: true, ...data };
    } catch (error) {
      log.error('GAME PASS SERVICE', 'Error purchasing single credit', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async purchaseSingleTicket(playerAddress, paymentToken, badgeDiscount = 0) {
    if (!playerAddress) return { success: false, error: 'Player address is required' };
    if (!['SUI', 'MEWS', 'USDC'].includes(paymentToken)) {
      return { success: false, error: 'Invalid payment token. Must be SUI, MEWS, or USDC' };
    }
    try {
      const data = await this._buildStorePurchase(playerAddress, 'tickets', paymentToken, badgeDiscount);
      return { success: true, ...data };
    } catch (error) {
      log.error('GAME PASS SERVICE', 'Error purchasing single ticket', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async purchaseSingleGame(playerAddress, paymentToken, badgeDiscount = 0) {
    // Compatibility alias; single credit is a standalone SKU.
    return this.purchaseSingleCredit(playerAddress, paymentToken, badgeDiscount);
  },

  /**
   * Start game: consume 1 credit + optional items in one atomic tx via Channel batch.
   * Use this when starting a paid game (with or without selected items).
   * @param {string} playerAddress - Player's wallet address
   * @param {Array<{itemId: string, level: number, quantity: number}>} items - Start items to consume (orb_level, extra_lives, force_field). Empty if none.
   * @returns {Promise<{success: boolean, digest?: string, error?: string}>}
   */
  async startGame(playerAddress, items = []) {
    if (!playerAddress) {
      return { success: false, error: 'Player address is required' };
    }
    try {
      const API_BASE_URL = this._getApiBaseUrl('/api/reservoir/');
      const response = await fetch(`${API_BASE_URL}/reservoir/start-game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerAddress, items: Array.isArray(items) ? items : [] }),
      });
      const responseText = await response.text();
      if (!response.ok) {
        throw new Error(httpErrorMessageFromResponse(response, responseText));
      }
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error('Invalid JSON response from start-game.');
      }
      if (!data.success) throw new Error(data.error || 'Failed to start game');
      this._statusCache = null;
      this._cacheTimestamp = null;
      log.info('GAME PASS SERVICE', 'Start game (credit + items) consumed via channel batch', { digest: data.digest });
      return { success: true, digest: data.digest };
    } catch (error) {
      log.error('GAME PASS SERVICE', 'Error starting game', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  /**
   * Consume a game credit only (Channel batch). For start game with/without items use startGame() instead.
   * @param {string} playerAddress - Player's wallet address
   * @returns {Promise<{success: boolean, digest?: string, gamesRemaining?: number, error?: string}>}
   */
  async consumeGameCredit(playerAddress) {
    if (!playerAddress) {
      return { success: false, error: 'Player address is required' };
    }
    try {
      const API_BASE_URL = this._getApiBaseUrl('/api/reservoir/');
      const response = await fetch(`${API_BASE_URL}/reservoir/consume-credit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerAddress, balanceKey: 'credits' }),
      });
      const responseText = await response.text();
      if (!response.ok) {
        throw new Error(httpErrorMessageFromResponse(response, responseText));
      }
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error('Invalid JSON response from consume-credit.');
      }
      if (!data.success) throw new Error(data.error || 'Failed to consume game credit');
      this._statusCache = null;
      this._cacheTimestamp = null;
      return { success: true, digest: data.digest, gamesRemaining: data.gamesRemaining || 0 };
    } catch (error) {
      log.error('GAME PASS SERVICE', 'Error consuming game credit', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
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
  async purchaseTickets(playerAddress, offerId, paymentToken, badgeDiscount = 0) {
    if (!playerAddress) {
      return {
        success: false,
        error: 'Player address is required'
      };
    }

    if (!offerId || typeof offerId !== 'string') {
      return {
        success: false,
        error: 'Invalid offer id for ticket purchase.'
      };
    }

    if (!['SUI', 'MEWS', 'USDC'].includes(paymentToken)) {
      return {
        success: false,
        error: 'Invalid payment token. Must be SUI, MEWS, or USDC'
      };
    }

    try {
      const data = await this._buildStorePurchase(playerAddress, offerId, paymentToken, badgeDiscount);
      return { success: true, ...data };
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

