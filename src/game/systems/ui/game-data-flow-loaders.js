// ==========================================
// GAME DATA FLOW LOADERS - Data Loading Operations
// ==========================================

// Use FrontendLogger if available, fallback to console
// Use var to allow redeclaration when multiple scripts are loaded
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
 * Load balance for wallet address
 * NOTE: This is for gatekeeping/display - uses MAINNET MEWS
 * Store and tournament payments use TESTNET MEWS (via backend)
 * @param {string} address - Wallet address
 * @returns {Promise<Object>}
 */
async function loadBalance(address) {
  if (!window.walletAPIInstance) {
    throw new Error('Wallet API not available');
  }
  
  GameDataState.setLoadingBalance(true);
  LoadingManager.update('Checking balance... Please wait');
  
  try {
    // Gatekeeping uses MAINNET MEWS (for balance display/requirements)
    const result = await window.walletAPIInstance.checkMEWSBalance(address, 'mainnet');
    
    if (!result.success) {
      throw new Error(result.error || 'Balance check failed');
    }
    
    return result;
  } finally {
    GameDataState.setLoadingBalance(false);
  }
}

/**
 * Load game stats for wallet address
 * @param {string} address - Wallet address
 * @returns {Promise<void>}
 */
async function loadStats(address) {
  if (!address) {
    return;
  }
  
  GameDataState.setLoadingStats(true);
  LoadingManager.update('Loading game stats... Please wait');
  
  try {
    // Call updateMenuStats if available (from game-state-manager.js)
    if (typeof updateMenuStats === 'function') {
      await updateMenuStats();
    } else {
      log.warn('FLOW LOADERS', 'updateMenuStats function not available');
    }
  } catch (error) {
    log.error('FLOW LOADERS', 'Error loading stats', error);
    // Don't throw - stats loading is non-critical
  } finally {
    GameDataState.setLoadingStats(false);
  }
}

/**
 * Load badge for wallet address
 * @param {string} address - Wallet address
 * @returns {Promise<Object>}
 */
async function loadBadge(address) {
  if (!window.BadgeService || !window.BadgeService.getBadge) {
    throw new Error('BadgeService not available');
  }
  
  // Check for badge modal
  if (typeof window.isBadgeModalVisible === 'function' && window.isBadgeModalVisible()) {
    throw new Error('Badge modal is visible - cannot load badge');
  }
  
  GameDataState.setLoadingBadge(true);
  LoadingManager.update('Loading badge... Please wait');
  
  try {
    // Clear cache first
    if (window.BadgeService.clearBadgeCache) {
      window.BadgeService.clearBadgeCache();
    }
    
    const badgeData = await window.BadgeService.getBadge(address);
    return badgeData;
  } finally {
    GameDataState.setLoadingBadge(false);
  }
}

/**
 * Fetch total games from statistics registry
 * @param {string} walletAddress - Wallet address
 * @returns {Promise<number>} Total games from registry
 */
async function fetchRegistryGames(walletAddress) {
  if (!walletAddress) {
    return 0;
  }
  
  try {
    const API_BASE_URL = window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3000/api';
    
    if (window.apiRequestCache) {
      // Use cache with 30 second TTL
      const data = await window.apiRequestCache.get(
        `stats:${walletAddress}`,
        async () => {
          const response = await fetch(`${API_BASE_URL}/stats/${walletAddress}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error(`Failed to load stats: ${response.status}`);
          }

          const result = await response.json();
          if (!result.success) {
            throw new Error(result.error || 'Invalid response');
          }

          return result;
        },
        {
          ttl: 30000, // 30 seconds
          walletAddress: walletAddress
        }
      );
      
      if (data && data.hasStats) {
        return data.totalGames || 0;
      }
    } else {
      // Fallback to direct fetch
      const response = await fetch(`${API_BASE_URL}/stats/${walletAddress}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.hasStats) {
          return data.totalGames || 0;
        }
      }
    }
  } catch (error) {
    log.warn('FLOW LOADERS', 'Error fetching registry games', error);
  }
  
  return 0;
}

// Expose globally
if (typeof window !== 'undefined') {
  window.loadBalance = loadBalance;
  window.loadStats = loadStats;
  window.loadBadge = loadBadge;
  window.fetchRegistryGames = fetchRegistryGames;
}

