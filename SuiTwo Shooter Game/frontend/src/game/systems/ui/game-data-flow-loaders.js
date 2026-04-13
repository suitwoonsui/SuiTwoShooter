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
 * NOTE: Gatekeeping/display uses MAINNET MEWS (separate from testnet store testing).
 * @param {string} address - Wallet address
 * @param {{ silent?: boolean }} [opts] - If silent, do not touch LoadingManager (use after main load modal is dismissed)
 * @returns {Promise<Object>}
 */
async function loadBalance(address, opts = {}) {
  if (!window.walletAPIInstance) {
    throw new Error('Wallet API not available');
  }
  
  GameDataState.setLoadingBalance(true);
  if (!opts.silent) {
    LoadingManager.update('Checking balance... Please wait');
  }
  
  try {
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
 * @param {{ updateLoadingMessage?: boolean, forceRefresh?: boolean }} options - If updateLoadingMessage is false, do not change LoadingManager message (caller controls it). forceRefresh bypasses stats cache.
 * @returns {Promise<void>}
 */
async function loadStats(address, options = {}) {
  if (!address) {
    return;
  }
  
  GameDataState.setLoadingStats(true);
  if (options.updateLoadingMessage !== false) {
    LoadingManager.update('Loading game stats... Please wait');
  }
  
  try {
    // Call updateMenuStats if available (from game-state-manager.js)
    if (typeof updateMenuStats === 'function') {
      await updateMenuStats({ forceRefresh: options.forceRefresh === true });
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

// Prefetched badge (same pattern as milestone progress). Short warm TTL; on-chain badge uses long apiRequestCache TTL.
const BADGE_PREFETCH_TTL_MS = 2 * 60 * 1000;

/**
 * Get badge API base URL (same source as BadgeService / milestone: game backend).
 * @returns {string}
 */
function getBadgeApiBase() {
  if (typeof window !== 'undefined' && window.GAME_CONFIG?.getBackendUrl) {
    return window.GAME_CONFIG.getBackendUrl('/api/badges/').replace(/\/?$/, '');
  }
  // Frontend should always talk to the game backend. Avoid BASE_BACKEND_URL (platform backend).
  return window.GameApi ? window.GameApi.getBaseUrl() : (window.GAME_CONFIG?.GAME_BACKEND_URL || window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3001/api');
}

/**
 * Prefetch badge for address (same way as milestone progress: single API call, store for flow/tab use).
 * Call before prefetchMilestoneProgress so badge is ready first.
 * @param {string} address - Wallet address
 */
function prefetchBadge(address) {
  if (!address) return;
  // Reuse BadgeService in-flight dedupe + PU cache (same as loadBadge / prefetchBadgeIfStale).
  if (window.BadgeService && typeof window.BadgeService.getBadge === 'function') {
    window.BadgeService.getBadge(address, { includePendingUpgrade: true })
      .then((data) => {
        const at = Date.now();
        window.__prefetchedBadge = {
          address,
          data: data && typeof data === 'object' ? data : { success: false, hasBadge: false },
          at,
        };
      })
      .catch((err) => {
        log.warn('FLOW LOADERS', 'Badge prefetch failed', err?.message);
        window.__prefetchedBadge = {
          address,
          data: { success: false, hasBadge: false, error: err?.message },
          at: Date.now(),
        };
      });
    return;
  }
  const API_BASE = getBadgeApiBase();
  const url = `${API_BASE}/badges/${address}?includePendingUpgrade=1`;
  fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } })
    .then((r) => (r.ok ? r.json() : r.json().catch(() => ({ success: false, error: `HTTP ${r.status}` }))))
    .then((data) => {
      const at = Date.now();
      window.__prefetchedBadge = { address, data: data && typeof data === 'object' ? data : { success: false, hasBadge: false }, at };
    })
    .catch((err) => {
      log.warn('FLOW LOADERS', 'Badge prefetch failed', err?.message);
      window.__prefetchedBadge = { address, data: { success: false, hasBadge: false, error: err?.message }, at: Date.now() };
    });
}

/**
 * Load badge for wallet address. Uses prefetched badge when valid (same pattern as milestone progress).
 * Never throws for "no badge" or API errors; returns { success, hasBadge, error? }.
 * @param {string} address - Wallet address
 * @returns {Promise<Object>}
 */
async function loadBadge(address) {
  if (!address) {
    return { success: false, hasBadge: false, error: 'No address' };
  }

  // Use prefetched badge if valid (same TTL as milestone progress)
  const prefetched = window.__prefetchedBadge;
  if (prefetched && prefetched.address === address && (Date.now() - prefetched.at) < BADGE_PREFETCH_TTL_MS && prefetched.data) {
    log.debug('FLOW LOADERS', 'Using prefetched badge');
    return prefetched.data;
  }

  if (!window.BadgeService || !window.BadgeService.getBadge) {
    return { success: false, hasBadge: false, error: 'BadgeService not available' };
  }

  if (typeof window.isBadgeModalVisible === 'function' && window.isBadgeModalVisible()) {
    return { success: false, hasBadge: false, error: 'Badge modal visible' };
  }

  GameDataState.setLoadingBadge(true);
  LoadingManager.update('Loading badge... Please wait');

  try {
    const badgeData = await window.BadgeService.getBadge(address, { includePendingUpgrade: true });
    return badgeData && typeof badgeData === 'object' ? badgeData : { success: false, hasBadge: false };
  } catch (err) {
    log.warn('FLOW LOADERS', 'Badge load error', err?.message);
    return { success: false, hasBadge: false, error: err?.message || 'Badge load failed' };
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
    // Stats from game backend (proxies to platform using env keys, then blockchain)
    const statsApiUrl = window.GameApi ? window.GameApi.getBaseUrl() : (window.GAME_CONFIG?.GAME_BACKEND_URL || window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3001/api');
    if (window.apiRequestCache) {
      // Use cache with 30 second TTL
      const data = await window.apiRequestCache.get(
        `stats:${walletAddress}`,
        async () => {
          const response = await fetch(`${statsApiUrl}/stats/${walletAddress}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
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
          walletAddress: walletAddress,
        }
      );
      
      if (data && data.hasStats) {
        return data.totalGames || 0;
      }
    } else {
      // Fallback to direct fetch
      const response = await fetch(`${statsApiUrl}/stats/${walletAddress}`, {
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

/**
 * Warm game-backend caches for Hydroscope stats + game pass (same keys as GET /api/stats/:addr and /api/game-pass/:addr).
 * Call on wallet connect before parallel menu loads so follow-up fetches hit server cache within TTL.
 * @param {string} address
 * @param {{ forceRefresh?: boolean }} [opts] - When true, server busts caches before refetch (aligned with GameDataFlow force).
 */
async function warmPlayerSessionOnBackend(address, opts = {}) {
  if (!address) return;
  const z = '0x0000000000000000000000000000000000000000000000000000000000000000';
  if (address === z || String(address).toLowerCase() === z) return;

  const base =
    (window.GAME_CONFIG?.getBackendUrl && window.GAME_CONFIG.getBackendUrl('/api/menu/').replace(/\/?$/, '')) ||
    (window.GameApi ? window.GameApi.getBaseUrl() : (window.GAME_CONFIG?.GAME_BACKEND_URL || window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3001/api'));

  const params = new URLSearchParams({ address });
  if (opts.forceRefresh) params.set('refresh', '1');
  const url = `${base}/menu/player-warm?${params.toString()}`;

  try {
    const r = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (!r.ok) {
      log.debug('FLOW LOADERS', 'player-warm HTTP not ok', r.status);
      return;
    }
    await r.json().catch(() => {});
  } catch (e) {
    log.debug('FLOW LOADERS', 'player-warm failed (non-critical)', e?.message);
  }
}

// Expose globally
if (typeof window !== 'undefined') {
  window.loadBalance = loadBalance;
  window.loadStats = loadStats;
  window.loadBadge = loadBadge;
  window.prefetchBadge = prefetchBadge;
  window.fetchRegistryGames = fetchRegistryGames;
  window.warmPlayerSessionOnBackend = warmPlayerSessionOnBackend;
}

