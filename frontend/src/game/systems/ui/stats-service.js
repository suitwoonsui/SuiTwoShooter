// ==========================================
// STATS SERVICE - Central stats read surface
// ==========================================
// Single source of truth for reading menu stats (bestScore/totalGames) and
// related derived reads like total games for badge UI.
//
// Design goals:
// - One canonical cache key (`stats:${address}`) and one cache/invalidation story (apiRequestCache).
// - Stable global surface (StatsService) with backwards-compatible `window.fetchRegistryGames`.
// - Cache bypass option for “after game” refreshes.

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

log.info('STATS SERVICE', 'StatsService module loaded');

function _getStatsApiBaseUrl() {
  return window.GameApi
    ? window.GameApi.getBaseUrl()
    : (window.GAME_CONFIG?.GAME_BACKEND_URL || window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3001/api');
}

/**
 * Fetch stats payload from game backend (bestScore/totalGames/etc).
 * Uses apiRequestCache when available; bypassable for after-game refresh.
 * @param {string} walletAddress
 * @param {{ forceRefresh?: boolean }} [opts]
 * @returns {Promise<any|null>}
 */
async function fetchStatsPayload(walletAddress, opts = {}) {
  const addr = (walletAddress || '').trim();
  if (!addr) return null;
  const forceRefresh = Boolean(opts && opts.forceRefresh);
  const statsApiUrl = _getStatsApiBaseUrl();

  const fetcher = async () => {
    const r = await fetch(`${statsApiUrl}/stats/${addr}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: forceRefresh ? 'no-store' : 'default',
    });
    if (!r.ok) throw new Error(`Failed to load stats: ${r.status}`);
    const data = await r.json();
    if (!data || data.success !== true) {
      throw new Error(data?.error || 'Invalid stats response');
    }
    return data;
  };

  try {
    if (window.apiRequestCache && typeof window.apiRequestCache.get === 'function') {
      return await window.apiRequestCache.get(
        `stats:${addr}`,
        fetcher,
        {
          walletAddress: addr,
          bypassCache: forceRefresh,
        }
      );
    }
    return await fetcher();
  } catch (e) {
    log.warn('STATS SERVICE', 'fetchStatsPayload failed', e?.message || e);
    return null;
  }
}

/**
 * Fetch total games played (totalGames) for an address.
 * @param {string} walletAddress
 * @param {{ forceRefresh?: boolean }} [opts]
 * @returns {Promise<number>}
 */
async function fetchRegistryGames(walletAddress, opts = {}) {
  const data = await fetchStatsPayload(walletAddress, opts);
  if (data && data.success && data.totalGames != null) {
    return Number(data.totalGames) || 0;
  }
  return 0;
}

// Expose globally
if (typeof window !== 'undefined') {
  if (!window.StatsService) {
    window.StatsService = {};
  }
  window.StatsService.fetchStatsPayload = fetchStatsPayload;
  window.StatsService.fetchRegistryGames = fetchRegistryGames;

  // Backwards compatibility: legacy callers still use window.fetchRegistryGames
  // Prefer using window.StatsService.fetchRegistryGames in new code.
  window.fetchRegistryGames = fetchRegistryGames;
}

