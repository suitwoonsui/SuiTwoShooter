// ==========================================
// GAME STATE MANAGEMENT (EXACT COPY FROM HTML)
// ==========================================

// UI state management (separate from game state in game-state.js)
// This tracks UI visibility states (menu, game, pause, game over)
let uiGameState = {
  isMenuVisible: true,
  isGameRunning: false,
  isPaused: false,
  isGameOver: false
};

// NOTE: gameState is now defined in game-state.js (the GameState class instance)
// We use uiGameState here to avoid conflicts
// For backward compatibility, we'll create a reference after game-state.js loads

// Expose uiGameState globally for menu-system.js to use
if (typeof window !== 'undefined') {
  window.uiGameState = uiGameState;
}

// Game settings
let gameSettings = {
  mouseSensitivity: 0.2,
  particleEffects: true,
  screenShake: true,
  trailEffects: true,
  masterVolume: 70,
  soundEffectsVolume: 80,
  backgroundMusicVolume: 60,
  soundEffects: true,
  backgroundMusic: true
};

// Game statistics
let gameStats = {
  bestScore: 0,
  gamesPlayed: 0,
  totalCoins: 0,
  bossesDefeated: 0
};

// Load settings and stats from localStorage
function loadGameData() {
  const savedSettings = localStorage.getItem('gameSettings');
  if (savedSettings) {
    gameSettings = { ...gameSettings, ...JSON.parse(savedSettings) };
  }
  
  const savedStats = localStorage.getItem('gameStats');
  if (savedStats) {
    gameStats = { ...gameStats, ...JSON.parse(savedStats) };
  }
  // Do not load player stats on front page — no wallet is logged in yet.
  // Stats are loaded when the user connects a wallet (GameDataFlow) and when the main menu is shown.
  applySettings();
}

// Save settings and stats to localStorage
function saveGameData() {
  localStorage.setItem('gameSettings', JSON.stringify(gameSettings));
  localStorage.setItem('gameStats', JSON.stringify(gameStats));
}

// After stats are updated, prefetch milestone progress once the session loader is not blocking
function maybePrefetchMilestoneProgressAfterStats() {
  if (typeof window.scheduleMilestoneProgressPrefetchAfterLoadingUi === 'function') {
    window.scheduleMilestoneProgressPrefetchAfterLoadingUi();
  } else if (
    typeof window.LoadingManager !== 'undefined' &&
    !window.LoadingManager.isVisible &&
    typeof window.prefetchMilestoneProgress === 'function'
  ) {
    window.prefetchMilestoneProgress();
  }
}

/**
 * Load player stats JSON — single path for menu + milestones (apiRequestCache key stats:${address}, retries).
 * @param {string} walletAddress
 * @param {{ forceRefresh?: boolean }} [options]
 * @returns {Promise<object|null>}
 */
async function loadStatsPayloadForWallet(walletAddress, options = {}) {
  const forceRefresh = Boolean(options && options.forceRefresh);
  if (!walletAddress) return null;

  const statsBase = window.GameApi ? window.GameApi.getBaseUrl() : (window.GAME_CONFIG?.GAME_BACKEND_URL || window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3001/api');
  const cacheKey = `stats:${walletAddress}`;
  const maxRetries = 3;
  const baseDelay = 1500;

  const fetchStatsWithRetries = async () => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = baseDelay * Math.pow(2, attempt - 1);
          console.log(`📊 [MENU] Stats API failed, retry ${attempt + 1}/${maxRetries} in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        const url =
          forceRefresh
            ? `${statsBase}/stats/${walletAddress}?_refresh=1&_t=${Date.now()}`
            : `${statsBase}/stats/${walletAddress}`;
        const response = await fetch(url, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: forceRefresh ? 'no-store' : 'default',
        });

        if (!response.ok) {
          if (attempt < maxRetries - 1) {
            console.warn(`⚠️ [MENU] Stats API failed (attempt ${attempt + 1}), will retry...`);
            continue;
          }
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (!data.success) {
          if (attempt < maxRetries - 1) {
            console.warn(`⚠️ [MENU] Stats API failed (attempt ${attempt + 1}), will retry...`);
            continue;
          }
          throw new Error(data.error || 'Invalid response');
        }
        // High-signal debug: helps validate whether milestones are reading derived totals vs aggregate.
        // Keep compact to avoid console spam.
        try {
          console.log('📊 [MENU] Stats payload', {
            totalGames: data.totalGames,
            bestScore: data.bestScore,
            totalsSource: data.totalsSource,
            totalCoins: data.totalCoins,
            totalEnemiesDefeated: data.totalEnemiesDefeated,
            totalBossesDefeated: data.totalBossesDefeated,
          });
        } catch (_) {}
        return data;
      } catch (error) {
        if (attempt < maxRetries - 1) {
          console.warn(`⚠️ [MENU] Stats fetch error (attempt ${attempt + 1}), will retry:`, error);
          continue;
        }
        throw error;
      }
    }
    throw new Error('Stats fetch exhausted retries');
  };

  try {
    if (window.apiRequestCache) {
      return await window.apiRequestCache.get(cacheKey, fetchStatsWithRetries, {
        walletAddress,
        bypassCache: forceRefresh,
      });
    }
    return await fetchStatsWithRetries();
  } catch (error) {
    console.warn('⚠️ [MENU] Stats fetch failed after retries:', error);
    return null;
  }
}

/**
 * Update best score / games played on the main menu (same cache key as fetchRegistryGames: stats:${address}).
 * @param {{ forceRefresh?: boolean }} [options] - When true, bypass apiRequestCache (e.g. after a run or forced GameDataFlow load).
 */
async function updateMenuStats(options = {}) {
  const forceRefresh = Boolean(options && options.forceRefresh);
  const bestScoreElement = document.getElementById('bestScoreDisplay');
  const gamesPlayedElement = document.getElementById('gamesPlayedDisplay');

  let walletAddress = null;
  if (window.walletAPIInstance && window.walletAPIInstance.isConnected()) {
    walletAddress = window.walletAPIInstance.getAddress();
  }

  if (!walletAddress) {
    if (bestScoreElement) {
      bestScoreElement.textContent = '--';
    }
    if (gamesPlayedElement) {
      gamesPlayedElement.textContent = '--';
    }
    return;
  }

  const applySuccessToDom = (data) => {
    if (!data || !data.success) {
      return false;
    }
    const best = (data.bestScore ?? 0);
    const total = (data.totalGames ?? 0);
    if (bestScoreElement) bestScoreElement.textContent = best.toLocaleString();
    if (gamesPlayedElement) gamesPlayedElement.textContent = String(total);
    if (data.hasStats && total > 0) {
      console.log('✅ [MENU] Stats updated', { bestScore: best, totalGames: total });
    }
    maybePrefetchMilestoneProgressAfterStats();
    return true;
  };

  try {
    const data = await loadStatsPayloadForWallet(walletAddress, { forceRefresh });
    if (applySuccessToDom(data)) {
      return;
    }
  } catch (error) {
    console.warn('⚠️ [MENU] Stats update failed:', error);
  }

  if (bestScoreElement) bestScoreElement.textContent = '0';
  if (gamesPlayedElement) gamesPlayedElement.textContent = '0';
  maybePrefetchMilestoneProgressAfterStats();
}

/** Drop cached GET /stats for the connected wallet (call after a finished run so the next read is fresh). */
function invalidateMenuStatsCacheForConnectedWallet() {
  try {
    if (!window.walletAPIInstance?.isConnected?.()) return;
    const addr = window.walletAPIInstance.getAddress();
    if (addr && window.apiRequestCache?.invalidate) {
      window.apiRequestCache.invalidate(`stats:${addr}`);
    }
  } catch (_) {
    /* ignore */
  }
}

if (typeof window !== 'undefined') {
  window.invalidateMenuStatsCacheForConnectedWallet = invalidateMenuStatsCacheForConnectedWallet;
  window.loadStatsPayloadForWallet = loadStatsPayloadForWallet;
}

// Apply settings to the game
function applySettings() {
  if (typeof game !== 'undefined') {
    if (player) {
      player.moveSpeed = gameSettings.mouseSensitivity;
    }
  }
  
  // Apply audio settings
  if (typeof updateAudioSettings === 'function') {
    updateAudioSettings();
  }
}
