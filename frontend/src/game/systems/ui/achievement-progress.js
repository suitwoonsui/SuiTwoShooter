// ==========================================
// ACHIEVEMENT PROGRESS - Milestone Progress Display
// ==========================================
// Shows milestone progress in leaderboard area with per-game and cumulative tabs

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

log.info('ACHIEVEMENT PROGRESS', 'Achievement progress module loaded');

function _shortAddr(a) {
  const s = typeof a === 'string' ? a : '';
  return s && s.startsWith('0x') ? `${s.slice(0, 10)}…${s.slice(-6)}` : s;
}

function _milestoneLogEnabled() {
  try {
    return (
      (typeof window !== 'undefined' && window.GAME_CONFIG && window.GAME_CONFIG.DEBUG_MILESTONES === true) ||
      (typeof localStorage !== 'undefined' && localStorage.getItem('DEBUG_MILESTONES') === '1')
    );
  } catch (_) {
    return false;
  }
}

function mlog(level, msg, data) {
  if (!_milestoneLogEnabled()) return;
  const payload = data && typeof data === 'object' ? data : (data != null ? { data } : undefined);
  if (level === 'error') log.error('ACHIEVEMENT PROGRESS', msg, payload);
  else if (level === 'warn') log.warn('ACHIEVEMENT PROGRESS', msg, payload);
  else if (level === 'info') log.info('ACHIEVEMENT PROGRESS', msg, payload);
  else log.debug('ACHIEVEMENT PROGRESS', msg, payload);
}

/** Client-side freshness for milestone definitions + prefetched progress (invalidated on score submit, claim, wallet change). */
const MILESTONE_DEFINITIONS_CACHE_TTL = 24 * 60 * 60 * 1000;
const MILESTONE_PROGRESS_PREFETCH_TTL_MS = MILESTONE_DEFINITIONS_CACHE_TTL;

/** Dedupe concurrent prefetch; skip if __prefetchedMilestoneProgress is still fresh. */
var milestoneProgressPrefetchInFlight = null;
var milestoneProgressPrefetchInflightKey = null;

/**
 * Add milestone progress tabs to leaderboard modal
 */
function addMilestoneProgressToLeaderboard() {
  log.debug('ACHIEVEMENT PROGRESS', 'addMilestoneProgressToLeaderboard() called');

  const leaderboardModal = document.getElementById('leaderboardModal');
  if (!leaderboardModal) {
    log.warn('ACHIEVEMENT PROGRESS', 'Leaderboard modal not found');
    return;
  }

  // Leaderboard modal may embed tabs in HTML (leaderboard-modal.js); only refresh badge.
  if (document.getElementById('leaderboardMilestoneTabs')) {
    log.debug('ACHIEVEMENT PROGRESS', 'Milestone tabs already in DOM (modal template)');
    if (typeof updateClaimCountBadge === 'function') {
      updateClaimCountBadge();
    }
    return;
  }

  // Find the leaderboard header to insert tabs after
  const leaderboardHeader = leaderboardModal.querySelector('.leaderboard-header');
  if (!leaderboardHeader) {
    log.warn('ACHIEVEMENT PROGRESS', 'Leaderboard header not found');
    return;
  }

  // Create tabs container
  const tabsContainer = document.createElement('div');
  tabsContainer.className = 'leaderboard-milestone-tabs';
  tabsContainer.setAttribute('id', 'leaderboardMilestoneTabs');

   tabsContainer.innerHTML = `
     <div class="milestone-tabs">
       <button class="milestone-tab active" onclick="switchMilestoneTab('leaderboard')" id="milestoneTabLeaderboard">
         <span class="tab-icon">🏆</span> Leaderboard
       </button>
       <button class="milestone-tab" onclick="switchMilestoneTab('milestones')" id="milestoneTabMilestones">
         <span class="tab-icon">⭐</span> Milestones
         <span class="milestone-tab-claim-count-badge" id="milestonesTabClaimCountBadge" style="display: none;">0</span>
       </button>
     </div>
   `;

  // Insert tabs after header
  leaderboardHeader.insertAdjacentElement('afterend', tabsContainer);

  // Create tab content containers
  const leaderboardContent = leaderboardModal.querySelector('.leaderboard');
  if (leaderboardContent) {
    // Find specific elements to move (exclude the tabs container we just added)
    const carousel = leaderboardContent.querySelector('.leaderboard-carousel');
    const loadMore = leaderboardContent.querySelector('.leaderboard-load-more-container');
    const actions = leaderboardContent.querySelector('.leaderboard-actions');
    
    // Wrap existing leaderboard content
    const leaderboardTabContent = document.createElement('div');
    leaderboardTabContent.className = 'milestone-tab-content active';
    leaderboardTabContent.setAttribute('id', 'milestoneTabContentLeaderboard');
    
    // Move only the content elements (not the tabs) into leaderboard tab
    if (carousel) leaderboardTabContent.appendChild(carousel);
    if (loadMore) leaderboardTabContent.appendChild(loadMore);
    if (actions) leaderboardTabContent.appendChild(actions);
    
    leaderboardContent.appendChild(leaderboardTabContent);

     // Create milestones tab content (with nested tabs for per-game and cumulative)
     const milestonesTabContent = document.createElement('div');
     milestonesTabContent.className = 'milestone-tab-content';
     milestonesTabContent.setAttribute('id', 'milestoneTabContentMilestones');
     milestonesTabContent.innerHTML = `
       <!-- Nested tabs for Per Game and Cumulative -->
       <div class="milestone-sub-tabs">
         <button class="milestone-sub-tab active" onclick="switchMilestoneSubTab('per-game')" id="milestoneSubTabPerGame">
           <span class="tab-icon">⭐</span> Per Game
         </button>
         <button class="milestone-sub-tab" onclick="switchMilestoneSubTab('cumulative')" id="milestoneSubTabCumulative">
           <span class="tab-icon">📊</span> Cumulative
         </button>
       </div>
       <div class="milestone-claim-all-bar" id="milestoneClaimAllBar" style="display: none;">
         <button type="button" class="milestone-claim-all-btn menu-btn primary" id="milestoneClaimAllBtn" onclick="return claimAllMilestoneRewards(event)">
           <span class="btn-icon">🎁</span> Claim all
         </button>
       </div>
       
       <!-- Per Game Content -->
       <div class="milestone-sub-tab-content active" id="milestoneSubTabContentPerGame">
         <div class="milestone-progress-container">
           <div class="milestone-loading" id="milestoneLoadingPerGame">
             <p>Loading milestone progress...</p>
           </div>
           <div class="milestone-list" id="milestoneListPerGame" style="display: none;">
             <!-- Per-game milestones will be loaded here -->
           </div>
         </div>
       </div>
       
       <!-- Cumulative Content -->
       <div class="milestone-sub-tab-content" id="milestoneSubTabContentCumulative">
         <div class="milestone-progress-container">
           <div class="milestone-loading" id="milestoneLoadingCumulative">
             <p>Loading milestone progress...</p>
           </div>
           <div class="milestone-list" id="milestoneListCumulative" style="display: none;">
             <!-- Cumulative milestones will be loaded here -->
           </div>
         </div>
       </div>
       
       <!-- Actions (same footer as leaderboard) -->
       <div class="leaderboard-actions">
         <button class="menu-btn" id="milestoneRefreshBtn" onclick="refreshMilestoneProgress()">
           <span class="btn-icon">🔄</span> Refresh
         </button>
         <button class="menu-btn primary" onclick="hideLeaderboard()">
           <span class="btn-icon">←</span> Back to Menu
         </button>
       </div>
     `;
     leaderboardContent.appendChild(milestonesTabContent);
  }

  // Update the milestone tab badge when tabs are created
  if (typeof updateClaimCountBadge === 'function') {
    updateClaimCountBadge();
  }

  log.info('ACHIEVEMENT PROGRESS', 'Milestone tabs added to leaderboard');
}

function getLeaderboardModalScope() {
  return document.getElementById('leaderboardModal') || document;
}

 /**
  * Switch between milestone tabs (Leaderboard or Milestones)
  */
 function switchMilestoneTab(tab) {
   log.debug('ACHIEVEMENT PROGRESS', 'switchMilestoneTab() called', { tab });

   const scope = getLeaderboardModalScope();

   // Update tab buttons (scoped so we never toggle tabs outside this modal)
   scope.querySelectorAll('.milestone-tab').forEach((t) => {
     t.classList.remove('active');
     t.setAttribute('aria-selected', 'false');
   });

   const activeTab = document.getElementById(`milestoneTab${tab === 'leaderboard' ? 'Leaderboard' : 'Milestones'}`);
   if (activeTab) {
     activeTab.classList.add('active');
     activeTab.setAttribute('aria-selected', 'true');
   }

   // Category label lives inside the leaderboard panel only (hidden with that panel on Milestones)
   const headerTitleEl = document.getElementById('leaderboardCategoryTitle');
   if (headerTitleEl && tab === 'leaderboard') {
     if (window.LeaderboardService && typeof window.LeaderboardService.getCurrentCategory === 'function') {
       const cat = window.LeaderboardService.getCurrentCategory();
       headerTitleEl.textContent = `${cat.icon} ${cat.name}`;
     } else {
       headerTitleEl.textContent = '🏆 Leaderboard';
     }
   }

   // Update tab content
   scope.querySelectorAll('.milestone-tab-content').forEach((c) => c.classList.remove('active'));

   const activeContent = document.getElementById(`milestoneTabContent${tab === 'leaderboard' ? 'Leaderboard' : 'Milestones'}`);
   if (activeContent) {
     activeContent.classList.add('active');
   }

   // Load milestone data if switching to milestones tab (default to per-game)
   if (tab === 'milestones') {
     // Set default sub-tab to per-game if not already set
     const currentSubTab = window._currentMilestoneSubTab || 'per-game';
     switchMilestoneSubTab(currentSubTab);
   }
 }

 /**
  * Switch between milestone sub-tabs (Per Game or Cumulative within Milestones tab)
  */
 function switchMilestoneSubTab(subTab) {
   log.debug('ACHIEVEMENT PROGRESS', 'switchMilestoneSubTab() called', { subTab });

   // Store current sub-tab
   window._currentMilestoneSubTab = subTab;

   const scope = getLeaderboardModalScope();

   // Update sub-tab buttons
   scope.querySelectorAll('.milestone-sub-tab').forEach((t) => t.classList.remove('active'));

   const activeSubTab = document.getElementById(`milestoneSubTab${subTab === 'per-game' ? 'PerGame' : 'Cumulative'}`);
   if (activeSubTab) {
     activeSubTab.classList.add('active');
   }

   // Update sub-tab content
   scope.querySelectorAll('.milestone-sub-tab-content').forEach((c) => c.classList.remove('active'));

   const activeSubContent = document.getElementById(`milestoneSubTabContent${subTab === 'per-game' ? 'PerGame' : 'Cumulative'}`);
   if (activeSubContent) {
     activeSubContent.classList.add('active');
   }

   // Load milestone data for the selected sub-tab
   loadMilestoneProgress(subTab);
 }

/**
 * Refresh milestone progress for current sub-tab (stats via menu path + claims fetch)
 */
async function refreshMilestoneProgress() {
  const currentSubTab = window._currentMilestoneSubTab || 'per-game';
  try {
    if (typeof updateMenuStats === 'function') {
      await updateMenuStats({ forceRefresh: true });
    }
    await loadMilestoneProgress(currentSubTab);
  } catch (err) {
    log.warn('ACHIEVEMENT PROGRESS', 'refreshMilestoneProgress failed', { error: err?.message });
  }

  if (window.walletAPIInstance && window.walletAPIInstance.isConnected()) {
    if (typeof window.updateClaimCountBadge === 'function') {
      if (typeof window.clearEligibleMilestonesCache === 'function') {
        window.clearEligibleMilestonesCache();
      }
      window.updateClaimCountBadge(null, true).catch((e) => {
        console.warn('⚠️ [ACHIEVEMENT PROGRESS] Failed to update badge on refresh:', e);
      });
    }
  }
}

// Milestone category state
if (!window._milestoneCategoryIndex) {
  window._milestoneCategoryIndex = {
    'per-game': 0,
    'cumulative': 0,
  };
}

// Milestone category definitions
const MILESTONE_CATEGORIES = {
  'per-game': [
    { key: 'scorePerGame', name: 'Score', value: 'bestScore', icon: '🎯' },
    { key: 'distancePerGame', name: 'Distance', value: 'bestDistance', icon: '📏' },
    { key: 'coinsPerGame', name: 'Coins Collected', value: 'bestCoins', icon: '🪙' },
    { key: 'bossesPerGame', name: 'Bosses Defeated', value: 'bestBossesDefeated', icon: '👹' },
    { key: 'enemiesPerGame', name: 'Enemies Defeated', value: 'bestEnemiesDefeated', icon: '💀' },
    { key: 'coinStreak', name: 'Coin Streak', value: 'bestCoinStreak', icon: '🔥' },
  ],
  'cumulative': [
    { key: 'gamesPlayed', name: 'Games Played', value: 'totalGames', icon: '🎮' },
    { key: 'scoreCumulative', name: 'Total Score', value: 'totalScore', icon: '📊' },
    { key: 'distanceCumulative', name: 'Total Distance', value: 'totalDistance', icon: '🗺️' },
    { key: 'coinsCumulative', name: 'Total Coins', value: 'totalCoins', icon: '💰' },
    { key: 'bossesCumulative', name: 'Total Bosses', value: 'totalBossesDefeated', icon: '👹' },
    { key: 'enemiesCumulative', name: 'Total Enemies', value: 'totalEnemiesDefeated', icon: '💀' },
  ],
};

/**
 * Numeric threshold from a definition row (API returns objects; legacy may use bare numbers).
 */
function milestoneEntryThreshold(entry) {
  if (entry == null) return null;
  if (typeof entry === 'number' && Number.isFinite(entry)) return entry;
  if (typeof entry === 'string') {
    const n = Number(entry);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof entry === 'object') {
    const t = entry.threshold;
    if (typeof t === 'number' && Number.isFinite(t)) return t;
    if (typeof t === 'string') {
      const n = Number(t);
      return Number.isFinite(n) ? n : null;
    }
  }
  return null;
}

/**
 * Sorted list of { threshold, def } for one category (def is the raw row for milestoneId, rewards, etc.).
 */
function normalizeMilestoneDefinitionList(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const entry of raw) {
    const threshold = milestoneEntryThreshold(entry);
    if (threshold == null) continue;
    const def = typeof entry === 'object' && entry !== null ? entry : { threshold };
    out.push({ threshold, def });
  }
  out.sort((a, b) => a.threshold - b.threshold);
  return out;
}

// Cache for milestone definitions (static – only player stats and claimed state change)
let milestoneDefinitionsCache = null;
let milestoneDefinitionsCacheTimestamp = 0;

// Request deduplication: prevent multiple concurrent fetches
let milestoneDefinitionsFetchPromise = null;

// Cache for eligible milestones count (for badge updates)
let eligibleMilestonesCache = null;
let eligibleMilestonesCacheTimestamp = 0;
let eligibleMilestonesFetchPromise = null;
const ELIGIBLE_MILESTONES_CACHE_TTL = 30 * 60 * 1000; // 30 minutes (invalidate after game/claim)

/**
 * Fetch milestone definitions from API
 * Returns null if API fails (caller should handle error gracefully)
 */
async function fetchMilestoneDefinitions() {
  const now = Date.now();

  // Use prefetch from game start page if still valid (definitions are static)
  const prefetched = typeof window !== 'undefined' && window.__prefetchedMilestoneDefinitions;
  const prefetchedAt = typeof window !== 'undefined' && window.__prefetchedMilestoneDefinitionsTimestamp;
  if (prefetched && prefetchedAt && (now - prefetchedAt) < MILESTONE_DEFINITIONS_CACHE_TTL) {
    milestoneDefinitionsCache = prefetched;
    milestoneDefinitionsCacheTimestamp = prefetchedAt;
    log.info('ACHIEVEMENT PROGRESS', 'Using milestone definitions from menu bootstrap prefetch', {
      categoryKeys: prefetched && typeof prefetched === 'object' ? Object.keys(prefetched).length : 0,
    });
    return milestoneDefinitionsCache;
  }

  // Return cached definitions if still valid
  if (milestoneDefinitionsCache && (now - milestoneDefinitionsCacheTimestamp) < MILESTONE_DEFINITIONS_CACHE_TTL) {
    log.debug('ACHIEVEMENT PROGRESS', 'Using cached milestone definitions');
    return milestoneDefinitionsCache;
  }

  // If a fetch is already in progress, wait for it
  if (milestoneDefinitionsFetchPromise) {
    log.debug('ACHIEVEMENT PROGRESS', 'Milestone definitions fetch already in progress, waiting for existing request');
    return milestoneDefinitionsFetchPromise;
  }
  
  // Start new fetch
  milestoneDefinitionsFetchPromise = (async () => {
    try {
      // Milestone definitions: call game backend (it proxies to platform using env APP_ID/ECOSYSTEM_ID so keys stay server-side)
      const DEFINITIONS_API_BASE = window.GameApi ? window.GameApi.getBaseUrl() : (window.GAME_CONFIG?.GAME_BACKEND_URL || window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3001/api');
      log.debug('ACHIEVEMENT PROGRESS', 'Fetching milestone definitions from API', { DEFINITIONS_API_BASE });
      
      const response = await fetch(`${DEFINITIONS_API_BASE}/milestones/definitions`);
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.definitions) {
        milestoneDefinitionsCache = data.definitions;
        milestoneDefinitionsCacheTimestamp = Date.now();
        log.info('ACHIEVEMENT PROGRESS', 'Milestone definitions fetched successfully', {
          categories: Object.keys(data.definitions),
        });
        return data.definitions;
      } else {
        throw new Error('Invalid API response format: missing definitions data');
      }
    } catch (error) {
      log.error('ACHIEVEMENT PROGRESS', 'Error fetching milestone definitions', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      // Clear cache on error to force retry on next attempt
      milestoneDefinitionsCache = null;
      milestoneDefinitionsCacheTimestamp = 0;
      
      // Return null to indicate error (caller should handle gracefully)
      return null;
    } finally {
      // Clear the promise so future calls can start a new fetch if needed
      milestoneDefinitionsFetchPromise = null;
    }
  })();
  
  return milestoneDefinitionsFetchPromise;
}

/**
 * Get current milestone category
 */
function getCurrentMilestoneCategory(type) {
  const categories = MILESTONE_CATEGORIES[type] || [];
  const index = window._milestoneCategoryIndex[type] || 0;
  return categories[index] || categories[0] || null;
}

/**
 * Navigate to next milestone category
 */
function milestoneNextCategory(type) {
  const categories = MILESTONE_CATEGORIES[type] || [];
  if (categories.length === 0) return;
  
  const currentIndex = window._milestoneCategoryIndex[type] || 0;
  const nextIndex = (currentIndex + 1) % categories.length;
  window._milestoneCategoryIndex[type] = nextIndex;
  
  // Update display
  updateMilestoneCategoryDisplay(type);
}

/**
 * Navigate to previous milestone category
 */
function milestonePrevCategory(type) {
  const categories = MILESTONE_CATEGORIES[type] || [];
  if (categories.length === 0) return;
  
  const currentIndex = window._milestoneCategoryIndex[type] || 0;
  const prevIndex = (currentIndex - 1 + categories.length) % categories.length;
  window._milestoneCategoryIndex[type] = prevIndex;
  
  // Update display
  updateMilestoneCategoryDisplay(type);
}

/**
 * Update milestone category display
 */
function updateMilestoneCategoryDisplay(type) {
  const category = getCurrentMilestoneCategory(type);
  if (!category) return;
  
  // Update category title
  const titleEl = document.getElementById(`milestoneCategoryTitle${type === 'per-game' ? 'PerGame' : 'Cumulative'}`);
  if (titleEl) {
    const h3 = titleEl.querySelector('h3');
    if (h3) {
      h3.textContent = `${category.icon} ${category.name}`;
    } else {
      titleEl.innerHTML = `<h3>${category.icon} ${category.name}</h3>`;
    }
  }
  
  // Re-render current category if data is loaded
  const listEl = document.getElementById(`milestoneList${type === 'per-game' ? 'PerGame' : 'Cumulative'}`);
  if (listEl && listEl.style.display !== 'none' && window._milestoneStats) {
    const pending =
      window._milestoneClaimsPendingByType && window._milestoneClaimsPendingByType[type] === true;
    renderMilestoneProgress(
      listEl,
      window._milestoneStats,
      type,
      window._milestoneClaimedIds || [],
      window._milestoneEligible || [],
      { claimsPending: pending }
    ).catch(err => {
      log.error('ACHIEVEMENT PROGRESS', 'Error re-rendering milestone progress', { error: err });
    });
  }
}

/**
 * Build stats object for per-game or cumulative from raw API stats response
 */
function buildStatsFromRawStatsData(type, statsData) {
  const hasStats = statsData && statsData.success && statsData.hasStats;
  if (type === 'per-game') {
    return hasStats ? {
      bestScore: statsData.bestScore || 0,
      bestDistance: statsData.bestDistance || 0,
      bestCoins: statsData.bestCoins || 0,
      bestBossesDefeated: statsData.bestBossesDefeated || 0,
      bestEnemiesDefeated: statsData.bestEnemiesDefeated || 0,
      bestCoinStreak: statsData.bestCoinStreak || 0,
    } : {
      bestScore: 0, bestDistance: 0, bestCoins: 0,
      bestBossesDefeated: 0, bestEnemiesDefeated: 0, bestCoinStreak: 0,
    };
  }
  return hasStats ? {
    totalGames: statsData.totalGames || 0,
    totalScore: statsData.totalScore || 0,
    totalDistance: statsData.totalDistance || 0,
    totalCoins: statsData.totalCoins || 0,
    totalBossesDefeated: statsData.totalBossesDefeated || 0,
    totalEnemiesDefeated: statsData.totalEnemiesDefeated || 0,
    bestScore: statsData.bestScore || 0,
    bestDistance: statsData.bestDistance || 0,
    bestCoins: statsData.bestCoins || 0,
    bestBossesDefeated: statsData.bestBossesDefeated || 0,
    bestEnemiesDefeated: statsData.bestEnemiesDefeated || 0,
    bestCoinStreak: statsData.bestCoinStreak || 0,
  } : {
    totalGames: 0, totalScore: 0, totalDistance: 0,
    totalCoins: 0, totalBossesDefeated: 0, totalEnemiesDefeated: 0,
    bestScore: 0, bestDistance: 0, bestCoins: 0,
    bestBossesDefeated: 0, bestEnemiesDefeated: 0, bestCoinStreak: 0,
  };
}

/**
 * Load milestone progress for a tab
 */
async function loadMilestoneProgress(type) {
  log.debug('ACHIEVEMENT PROGRESS', 'loadMilestoneProgress() called', { type });

  const loadingEl = document.getElementById(`milestoneLoading${type === 'per-game' ? 'PerGame' : 'Cumulative'}`);
  const listEl = document.getElementById(`milestoneList${type === 'per-game' ? 'PerGame' : 'Cumulative'}`);

  if (!loadingEl || !listEl) {
    log.warn('ACHIEVEMENT PROGRESS', 'Milestone elements not found', { type });
    return;
  }

  loadingEl.style.display = 'block';
  listEl.style.display = 'none';

  try {
    // Get player address (using same pattern as leaderboard)
    let playerAddress = null;
    if (window.walletAPIInstance && window.walletAPIInstance.isConnected()) {
      playerAddress = window.walletAPIInstance.getAddress();
    }
    mlog('info', 'Milestones load start', {
      type,
      player: _shortAddr(playerAddress),
      hasApiRequestCache: Boolean(window.apiRequestCache),
      hasLoadStatsPayloadForWallet: typeof window.loadStatsPayloadForWallet === 'function',
      hasPrefetched: Boolean(window.__prefetchedMilestoneProgress),
    });

    log.debug('ACHIEVEMENT PROGRESS', 'Wallet address check', {
      hasWalletAPI: !!window.walletAPIInstance,
      isConnected: window.walletAPIInstance?.isConnected?.(),
      address: playerAddress,
      addressLength: playerAddress?.length,
    });

    if (!playerAddress) {
      listEl.innerHTML = '<div class="milestone-error"><p>Please connect your wallet to view milestone progress.</p></div>';
      loadingEl.style.display = 'none';
      listEl.style.display = 'block';
      return;
    }

    const API_BASE_URL = window.GameApi
      ? window.GameApi.getBaseUrl()
      : (window.GAME_CONFIG?.GAME_BACKEND_URL || window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3001/api');

    window._milestoneClaimsPendingByType = window._milestoneClaimsPendingByType || {};
    window._milestoneClaimsPendingByType[type] = true;

    // Show skeleton quickly (no claim buttons until we know eligible).
    await renderMilestoneProgress(listEl, {}, type, [], [], { claimsPending: true, claimsVerified: true });
    loadingEl.style.display = 'none';
    listEl.style.display = 'block';

    const progressUrl = `${API_BASE_URL}/achievements/progress?address=${encodeURIComponent(playerAddress)}`;
    mlog('info', 'Milestones fetching progress', { type, player: _shortAddr(playerAddress), progressUrl });

    const response = await fetch(progressUrl);
    const data = response.ok ? await response.json().catch(() => null) : null;
    const stats = data?.stats || {};
    const claimedIds = Array.isArray(data?.claimedIds) ? data.claimedIds : [];
    const eligible = Array.isArray(data?.eligible) ? data.eligible : [];
    const claimsVerified = data?.claimsVerified !== false;

    window._milestoneClaimsPendingByType[type] = false;
    await renderMilestoneProgress(listEl, stats, type, claimedIds, eligible, { claimsPending: false, claimsVerified });
  } catch (error) {
    log.error('ACHIEVEMENT PROGRESS', 'Error loading milestone progress', { type, error: error.message });
    
    // Check if it's a network/404 error (contract not deployed)
    if (error.message.includes('404') || error.message.includes('Failed to fetch')) {
      listEl.innerHTML = `
        <div class="milestone-error">
          <p>🎯 Milestone system is being set up!</p>
          <p style="margin-top: 1em; font-size: 0.9em; color: #888;">
            The achievement contract is not yet deployed. Milestone progress will be available once the contract is live.
          </p>
        </div>
      `;
    } else {
      listEl.innerHTML = `<div class="milestone-error"><p>Error loading milestones: ${error.message}</p></div>`;
    }
    
    loadingEl.style.display = 'none';
    listEl.style.display = 'block';
  }
}

/**
 * Render milestone progress
 */
async function renderMilestoneProgress(container, stats, type, claimedIds = [], eligible = [], options = {}) {
  const claimsPending = options.claimsPending === true;
  const claimsVerified = options.claimsVerified !== false;
  log.debug('ACHIEVEMENT PROGRESS', 'renderMilestoneProgress() called', {
    type,
    claimedIdsCount: claimedIds.length,
    eligibleCount: eligible.length,
    claimsPending,
    claimsVerified,
  });
  mlog('info', 'Milestones render', {
    type,
    claimsPending,
    stats,
    claimedIdsCount: Array.isArray(claimedIds) ? claimedIds.length : null,
    eligibleCount: Array.isArray(eligible) ? eligible.length : null,
  });

  // Store stats and claimed
  window._milestoneStats = stats;
  window._milestoneClaimedIds = claimedIds;
  window._milestoneEligible = eligible;

  // Get all categories for this type
  const categories = MILESTONE_CATEGORIES[type] || [];
  if (categories.length === 0) {
    log.warn('ACHIEVEMENT PROGRESS', 'No categories found for type', { type });
    container.innerHTML = '<div class="milestone-empty"><p>No milestones available for this category.</p></div>';
    syncMilestoneClaimAllBar(eligible, claimsPending);
    return;
  }
  try {
    const rows = categories.map((c) => ({
      key: c.key,
      valueKey: c.value,
      currentValue: stats ? stats[c.value] : undefined,
    }));
    mlog('info', 'Milestones category values', { type, rows });
  } catch (_) {}

  await renderAllMilestoneCategories(container, stats, type, categories, claimedIds, eligible, {
    claimsPending,
    claimsVerified,
  });
  syncMilestoneClaimAllBar(eligible, claimsPending);
}

/**
 * Render all milestone categories
 */
async function renderAllMilestoneCategories(
  container,
  stats,
  type,
  categories,
  claimedIds = [],
  eligible = [],
  renderOpts = {}
) {
  const claimsPending = renderOpts.claimsPending === true;
  const claimsVerified = renderOpts.claimsVerified !== false;
  // Fetch milestone definitions from API
  const milestoneDefinitions = await fetchMilestoneDefinitions();
  
  // Handle error case gracefully
  if (!milestoneDefinitions) {
    container.innerHTML = `
      <div class="milestone-error-message" style="padding: 2rem; text-align: center; color: #ff6b6b;">
        <h3 style="margin-bottom: 1rem;">⚠️ Unable to Load Milestone Definitions</h3>
        <p style="margin-bottom: 0.5rem;">Failed to fetch milestone data from the server.</p>
        <p style="font-size: 0.9em; opacity: 0.8;">Please check your connection and try again later.</p>
      </div>
    `;
    return;
  }
  
  // Create a Set of claimed milestone IDs for fast lookup
  const claimedIdsSet = new Set(claimedIds);
  
  // Group eligible milestones by category
  const eligibleByCategory = {};
  eligible.forEach(milestone => {
    if (!eligibleByCategory[milestone.category]) {
      eligibleByCategory[milestone.category] = [];
    }
    eligibleByCategory[milestone.category].push(milestone);
  });

  const categoriesHtml = categories.map(category => {
    // Get current value from stats
    const lookupKey = category.value;
    const statsValue = stats ? stats[lookupKey] : undefined;
    const currentValue = statsValue !== undefined && statsValue !== null ? statsValue : 0;
    
    const normalizedDefs = normalizeMilestoneDefinitionList(milestoneDefinitions[category.key] || []);
    
    // Get eligible milestones for this category (from API, which uses milestoneId for stable tracking)
    // The API already filters out claimed milestones using milestoneId, so this is the source of truth
    const eligibleForCategory = eligibleByCategory[category.key] || [];
    const eligibleCount = eligibleForCategory.length;
    
    // Next target is purely progress-based (next threshold above current value).
    const nextEntry = normalizedDefs.find(({ threshold }) => currentValue < threshold);
    const nextThreshold = nextEntry ? nextEntry.threshold : null;
    
    const hasEligibleMilestones = !claimsPending && claimsVerified && eligibleCount > 0;

    let claimButtonHtml = '';
    if (claimsPending) {
      claimButtonHtml = `<button type="button" class="milestone-claim-btn milestone-claim-btn--pending" disabled data-category="${category.key}" title="Loading claim status…"><span class="btn-icon">⏳</span> Loading…</button>`;
    } else if (!claimsVerified) {
      claimButtonHtml = `<button type="button" class="milestone-claim-btn milestone-claim-btn--pending" disabled data-category="${category.key}" title="Claim state unavailable (could not verify claimed milestones)."><span class="btn-icon">⏳</span> Verifying…</button>`;
    } else if (hasEligibleMilestones) {
      // IMPORTANT: stop click bubbling so the leaderboard/modal "click outside" handler doesn't fire.
      // Inline handlers have access to `event` in browsers.
      claimButtonHtml = `<button type="button" class="milestone-claim-btn" data-category="${category.key}" onclick="return claimMilestoneRewards(event, '${category.key}')" title="Claim ${eligibleCount} milestone reward${eligibleCount > 1 ? 's' : ''}"><span class="btn-icon">🎁</span> Claim ${eligibleCount}</button>`;
    }

    log.debug('ACHIEVEMENT PROGRESS', 'Rendering milestone category', {
      category: category.name,
      categoryKey: category.key,
      categoryValue: category.value,
      currentValue,
      nextThreshold,
      milestonesCount: normalizedDefs.length,
      eligibleCount,
    });

    // Calculate progress percentage (must be a finite number — invalid CSS width can look "full")
    const hasMilestones = normalizedDefs.length > 0;
    const lastThreshold = hasMilestones ? normalizedDefs[normalizedDefs.length - 1].threshold : 0;
    let progress = 0;
    if (hasMilestones) {
      if (nextThreshold != null && nextThreshold > 0) {
        const pct = (currentValue / nextThreshold) * 100;
        progress = Math.min(100, Number.isFinite(pct) ? pct : 0);
      } else {
        progress = currentValue >= lastThreshold ? 100 : 0;
      }
    }

    const targetLabel = !hasMilestones
      ? '<span class="milestone-target-none">—</span>'
      : nextThreshold != null
        ? `<span class="milestone-target-number">${formatValue(nextThreshold)}</span>`
        : '<span class="milestone-target-complete">🏆 Complete</span>';

    return `
      <div class="milestone-category-row">
        <div class="milestone-current-value-box">
          <span class="milestone-value-number">${formatValue(currentValue)}</span>
        </div>
        <div class="milestone-middle-section">
          <div class="milestone-category-header">
            <div class="milestone-category-name-wrapper">
              <span class="milestone-category-icon">${category.icon}</span>
              <h3 class="milestone-category-name">${category.name}</h3>
            </div>
            ${claimButtonHtml}
          </div>
          <div class="milestone-progress-bar">
            <div class="milestone-progress-fill" style="width: ${progress}%"></div>
          </div>
        </div>
        <div class="milestone-next-target-box">
          ${targetLabel}
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = categoriesHtml || '<div class="milestone-empty"><p>No milestones available.</p></div>';
}

/**
 * Format value for display
 */
function formatValue(value) {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return '—';
  if (n >= 1000000) {
    return (n / 1000000).toFixed(1) + 'M';
  }
  if (n >= 1000) {
    return (n / 1000).toFixed(1) + 'K';
  }
  return n.toLocaleString();
}

function getMilestoneGameApiBaseUrl() {
  return window.GameApi
    ? window.GameApi.getBaseUrl()
    : window.GAME_CONFIG?.GAME_BACKEND_URL || window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3001/api';
}

/**
 * Show or hide the global "Claim all" action based on eligibility from the last progress/check payload.
 */
function syncMilestoneClaimAllBar(eligible, claimsPending) {
  const bar = document.getElementById('milestoneClaimAllBar');
  const btn = document.getElementById('milestoneClaimAllBtn');
  if (!bar || !btn) return;
  if (claimsPending) {
    bar.style.display = 'none';
    return;
  }
  const n = Array.isArray(eligible) ? eligible.length : 0;
  if (n <= 0) {
    bar.style.display = 'none';
    btn.disabled = false;
    btn.innerHTML = '<span class="btn-icon">🎁</span> Claim all';
    return;
  }
  bar.style.display = '';
  btn.innerHTML = `<span class="btn-icon">🎁</span> Claim all (${n})`;
}

async function fetchEligibleMilestonesFromCheck(playerAddress) {
  const API_BASE_URL = getMilestoneGameApiBaseUrl();
  const checkResponse = await fetch(`${API_BASE_URL}/achievements/check?address=${playerAddress}`);
  if (!checkResponse.ok) {
    throw new Error(`Failed to check eligibility: ${checkResponse.status} ${checkResponse.statusText}`);
  }
  const checkData = await checkResponse.json();
  if (!checkData.success) {
    throw new Error(checkData.error || 'Failed to check eligibility');
  }
  return checkData.eligible || [];
}

/**
 * POST /achievements/claim for a list of { category, threshold } rows (batch mode).
 */
async function postBatchMilestoneClaim(playerAddress, eligibleList, logCtx) {
  const claimed = [];
  const errors = [];
  const rewardsNotDistributed = [];
  if (!eligibleList.length) {
    return { claimed, errors, rewardsNotDistributed };
  }
  const API_BASE_URL = getMilestoneGameApiBaseUrl();
  const milestones = eligibleList.map((m) => ({
    category: m.category,
    threshold: m.threshold,
  }));
  log.debug('ACHIEVEMENT PROGRESS', 'postBatchMilestoneClaim', {
    ...logCtx,
    count: eligibleList.length,
    milestones,
  });
  try {
    const claimResponse = await fetch(`${API_BASE_URL}/achievements/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerAddress,
        milestones,
      }),
    });
    const claimData = await claimResponse.json();
    if (claimData.success) {
      if (claimData.rewardsDistributed === false) {
        rewardsNotDistributed.push({
          milestones: claimData.claimed || [],
          error: claimData.rewardsError || 'Admin wallet issue',
        });
      }
      claimed.push(...(claimData.claimed || []));
      log.info('ACHIEVEMENT PROGRESS', 'Batch milestone claim completed', {
        ...logCtx,
        count: claimData.claimed?.length || 0,
        rewardsDistributed: claimData.rewardsDistributed,
      });
    } else {
      log.warn('ACHIEVEMENT PROGRESS', 'Batch claim failed', {
        ...logCtx,
        error: claimData.error,
        milestoneCount: eligibleList.length,
      });
      for (const milestone of eligibleList) {
        errors.push({ milestone, error: claimData.error || 'Batch claim failed' });
      }
    }
  } catch (err) {
    log.error('ACHIEVEMENT PROGRESS', 'Batch claim request failed', {
      ...logCtx,
      error: err.message,
      milestoneCount: eligibleList.length,
    });
    for (const milestone of eligibleList) {
      errors.push({ milestone, error: err.message });
    }
  }
  return { claimed, errors, rewardsNotDistributed };
}

/**
 * Alerts, achievement popup, cache invalidation, progress reload, inventory refresh, badges.
 * @param {'current'|'both'} refreshSubTabs
 */
async function handleMilestoneClaimSuccessUI(playerAddress, result, refreshSubTabs) {
  const { claimed, errors, rewardsNotDistributed } = result;

  if (claimed.length > 0) {
    const totalCredits = claimed.reduce((sum, c) => sum + (c?.credits || 0), 0);
    const totalItems = claimed.reduce((sum, c) => sum + (c?.items?.length || 0), 0);

    let message = `🎉 Successfully claimed ${claimed.length} milestone${claimed.length > 1 ? 's' : ''}!`;

    if (rewardsNotDistributed.length > 0) {
      const affectedCount = rewardsNotDistributed.reduce((sum, r) => {
        return sum + (Array.isArray(r.milestones) ? r.milestones.length : 1);
      }, 0);
      message += `\n⚠️ Note: Rewards for ${affectedCount} milestone${affectedCount > 1 ? 's' : ''} could not be automatically distributed and will be processed separately.`;
    } else {
      if (totalCredits > 0) {
        message += `\n💰 +${totalCredits} free credit${totalCredits > 1 ? 's' : ''}`;
      }
      if (totalItems > 0) {
        message += `\n🎁 +${totalItems} item${totalItems > 1 ? 's' : ''}`;
      }
    }

    if (typeof window.showAchievementPopup === 'function' && claimed.length > 0) {
      window.showAchievementPopup(claimed.filter((c) => c));
    } else {
      alert(message);
    }
  }

  if (errors.length > 0) {
    log.warn('ACHIEVEMENT PROGRESS', 'Some milestones failed to claim', { errors });
    if (claimed.length === 0) {
      alert(`Failed to claim milestones: ${errors[0]?.error || 'Unknown error'}`);
    }
  }

  if (claimed.length > 0) {
    if (typeof window.invalidateMilestoneProgressCaches === 'function') {
      window.invalidateMilestoneProgressCaches();
    }
    eligibleMilestonesCache = null;
    eligibleMilestonesCacheTimestamp = 0;
    eligibleMilestonesFetchPromise = null;
    try {
      delete window.__prefetchedMilestoneProgress;
    } catch (_) {}

    if (refreshSubTabs === 'both') {
      await loadMilestoneProgress('per-game');
      await loadMilestoneProgress('cumulative');
    } else {
      const currentSubTab = window._currentMilestoneSubTab || 'per-game';
      await loadMilestoneProgress(currentSubTab);
    }

    if (playerAddress && window.PlayerInventoryCache?.refreshAfterRewardBackground) {
      window.PlayerInventoryCache.refreshAfterRewardBackground(playerAddress);
    }

    await updateClaimCountBadge(null, true);
  }

  if (claimed.length === 0 && errors.length > 0 && typeof refreshMilestoneProgress === 'function') {
    await refreshMilestoneProgress();
  }
}

/**
 * Claim milestone rewards for a specific category
 * @param {string} category - The category key (e.g., 'gamesPlayed', 'scorePerGame')
 */
async function claimMilestoneRewards(event, category) {
  // Prevent the click from closing the leaderboard modal (backdrop click handler).
  try {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
  } catch (_) {}

  log.debug('ACHIEVEMENT PROGRESS', 'claimMilestoneRewards() called', { category });

  // Get player address
  let playerAddress = null;
  if (window.walletAPIInstance && window.walletAPIInstance.isConnected()) {
    playerAddress = window.walletAPIInstance.getAddress();
  }

  if (!playerAddress) {
    alert('Please connect your wallet to claim milestone rewards.');
    return;
  }

  // Find and disable the claim button to prevent double-clicks (skip loading placeholder)
  const claimBtns = document.querySelectorAll(
    `.milestone-claim-btn[data-category="${category}"]:not(.milestone-claim-btn--pending)`
  );
  claimBtns.forEach(btn => {
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-icon">⏳</span> Claiming...';
  });

  try {
    log.debug('ACHIEVEMENT PROGRESS', 'Getting eligible milestones', {
      playerAddress,
      API_BASE_URL: getMilestoneGameApiBaseUrl(),
    });

    const eligibleAll = await fetchEligibleMilestonesFromCheck(playerAddress);
    const eligibleForCategory = eligibleAll.filter((m) => m.category === category);

    if (eligibleForCategory.length === 0) {
      alert('No eligible milestones to claim for this category.');
      return;
    }

    log.debug('ACHIEVEMENT PROGRESS', 'Eligible milestones for category', {
      category,
      count: eligibleForCategory.length,
      milestones: eligibleForCategory,
    });

    const result = await postBatchMilestoneClaim(playerAddress, eligibleForCategory, { category });
    await handleMilestoneClaimSuccessUI(playerAddress, result, 'current');
  } catch (error) {
    log.error('ACHIEVEMENT PROGRESS', 'Error claiming milestone rewards', { category, error: error.message });
    alert(`Error claiming rewards: ${error.message}`);
  } finally {
    // Re-enable claim buttons (they'll be re-rendered on refresh anyway)
    claimBtns.forEach(btn => {
      btn.disabled = false;
      btn.innerHTML = '<span class="btn-icon">🎁</span> Claim';
    });
  }
}

/**
 * Claim every eligible milestone (all categories / sub-tabs) in one batch request.
 */
async function claimAllMilestoneRewards(event) {
  try {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
  } catch (_) {}

  log.debug('ACHIEVEMENT PROGRESS', 'claimAllMilestoneRewards() called');

  let playerAddress = null;
  if (window.walletAPIInstance && window.walletAPIInstance.isConnected()) {
    playerAddress = window.walletAPIInstance.getAddress();
  }

  if (!playerAddress) {
    alert('Please connect your wallet to claim milestone rewards.');
    return;
  }

  const claimAllBtn = document.getElementById('milestoneClaimAllBtn');
  const categoryBtns = document.querySelectorAll('.milestone-claim-btn:not(.milestone-claim-btn--pending)');

  if (claimAllBtn) {
    claimAllBtn.disabled = true;
    claimAllBtn.innerHTML = '<span class="btn-icon">⏳</span> Claiming…';
  }
  categoryBtns.forEach((btn) => {
    btn.disabled = true;
  });

  try {
    const eligibleAll = await fetchEligibleMilestonesFromCheck(playerAddress);
    if (eligibleAll.length === 0) {
      alert('No eligible milestones to claim right now.');
      return;
    }
    const result = await postBatchMilestoneClaim(playerAddress, eligibleAll, { scope: 'all' });
    await handleMilestoneClaimSuccessUI(playerAddress, result, 'both');
  } catch (error) {
    log.error('ACHIEVEMENT PROGRESS', 'Error in claimAllMilestoneRewards', { error: error.message });
    alert(`Error claiming rewards: ${error.message}`);
    if (typeof refreshMilestoneProgress === 'function') {
      await refreshMilestoneProgress();
    }
  } finally {
    if (claimAllBtn) {
      claimAllBtn.disabled = false;
      claimAllBtn.innerHTML = '<span class="btn-icon">🎁</span> Claim all';
    }
    categoryBtns.forEach((btn) => {
      btn.disabled = false;
    });
    syncMilestoneClaimAllBar(window._milestoneEligible || [], false);
  }
}

/**
 * Update the claim count badge on the Leaderboard button (pending rewards to claim)
 * @param {number|null} count - Number of eligible milestones (or null to fetch)
 * @param {boolean} forceRefresh - If true, bypass cache and force fresh fetch
 */
async function updateClaimCountBadge(count = null, forceRefresh = false) {
  console.log('🏆 [Claim count] updateClaimCountBadge called', { count, forceRefresh });
  
  const menuBadge = document.getElementById('leaderboardClaimCountBadge');
  const tabBadge = document.getElementById('milestonesTabClaimCountBadge');

  // If count not provided, fetch from API (with caching and deduplication)
  if (count === null) {
    try {
      // Get player address
      let playerAddress = null;
      if (window.walletAPIInstance && window.walletAPIInstance.isConnected()) {
        playerAddress = window.walletAPIInstance.getAddress();
      }

      if (!playerAddress) {
        console.log('🏆 [Claim count] No wallet connected, hiding badges');
        if (menuBadge) menuBadge.style.display = 'none';
        if (tabBadge) tabBadge.style.display = 'none';
        return;
      }

      // Check cache first (unless forceRefresh is true)
      const now = Date.now();
      if (!forceRefresh && eligibleMilestonesCache !== null && 
          (now - eligibleMilestonesCacheTimestamp) < ELIGIBLE_MILESTONES_CACHE_TTL) {
        console.log('🏆 [Claim count] Using cached eligible milestones count:', eligibleMilestonesCache);
        count = eligibleMilestonesCache;
      } else {
        // If forceRefresh is true, clear any pending fetch and cache
        if (forceRefresh) {
          eligibleMilestonesFetchPromise = null;
          eligibleMilestonesCache = null;
          eligibleMilestonesCacheTimestamp = 0;
        }
        
        // If a fetch is already in progress and not forcing refresh, wait for it
        if (eligibleMilestonesFetchPromise && !forceRefresh) {
          console.log('🏆 [Claim count] Fetch already in progress, waiting for existing request');
          count = await eligibleMilestonesFetchPromise;
        } else {
          // Start new fetch
          eligibleMilestonesFetchPromise = (async () => {
            try {
              console.log('🏆 [Claim count] Fetching eligible milestones for', playerAddress);
              const API_BASE_URL = window.GameApi ? window.GameApi.getBaseUrl() : (window.GAME_CONFIG?.GAME_BACKEND_URL || window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3001/api');
              const response = await fetch(`${API_BASE_URL}/achievements/progress?address=${playerAddress}`);
              
              let fetchedCount = 0;
              if (response.ok) {
                const data = await response.json();
                console.log('🏆 [Claim count] API response:', data);
                fetchedCount = data.eligibleCount || data.eligible?.length || 0;
              } else {
                console.warn('🏆 [Claim count] API error:', response.status);
                fetchedCount = 0;
              }
              
              // Update cache
              eligibleMilestonesCache = fetchedCount;
              eligibleMilestonesCacheTimestamp = Date.now();
              
              return fetchedCount;
            } catch (error) {
              console.error('🏆 [Claim count] Error fetching eligible count:', error);
              log.warn('ACHIEVEMENT PROGRESS', 'Error fetching eligible count for badge', { error: error.message });
              eligibleMilestonesCache = 0;
              eligibleMilestonesCacheTimestamp = Date.now();
              return 0;
            } finally {
              eligibleMilestonesFetchPromise = null;
            }
          })();
          
          count = await eligibleMilestonesFetchPromise;
        }
      }
    } catch (error) {
      console.error('🏆 [Claim count] Error in updateClaimCountBadge:', error);
      log.warn('ACHIEVEMENT PROGRESS', 'Error in updateClaimCountBadge', { error: error.message });
      count = 0;
    }
  }

  // Ensure count is a number
  if (count === null || count === undefined) {
    console.warn('🏆 [Claim count] Count is null/undefined, defaulting to 0');
    count = 0;
  }
  
  // Convert to number if it's not already
  count = Number(count);
  if (isNaN(count)) {
    console.warn('🏆 [Claim count] Count is NaN, defaulting to 0');
    count = 0;
  }

  // Update badge visibility and count
  console.log('🏆 [Claim count] Setting badge count:', count, {
    menuBadgeExists: !!menuBadge,
    tabBadgeExists: !!tabBadge,
    menuBadgeId: menuBadge?.id,
    tabBadgeId: tabBadge?.id,
  });
  
  const badgeText = count > 99 ? '99+' : count.toString();
  
  // Update main menu Leaderboard button badge
  if (menuBadge) {
    if (count > 0) {
      menuBadge.textContent = badgeText;
      menuBadge.style.display = 'flex';
      console.log('🏆 [Claim count] Updated menu badge:', badgeText);
    } else {
      menuBadge.style.display = 'none';
      console.log('🏆 [Claim count] Hid menu badge (count is 0)');
    }
  } else {
    console.warn('🏆 [Claim count] Menu badge element not found (id: leaderboardClaimCountBadge)');
  }
  
  // Update Milestones tab badge (inside leaderboard modal)
  if (tabBadge) {
    if (count > 0) {
      tabBadge.textContent = badgeText;
      tabBadge.style.display = 'flex';
      console.log('🏆 [Claim count] Updated tab badge:', badgeText);
    } else {
      tabBadge.style.display = 'none';
      console.log('🏆 [Claim count] Hid tab badge (count is 0)');
    }
  } else {
    // Tab badge lives inside leaderboard modal; may not be in DOM until that tab is opened
    log.debug('ACHIEVEMENT PROGRESS', 'Tab badge element not in DOM (id: milestonesTabClaimCountBadge)');
  }
  
  log.debug('ACHIEVEMENT PROGRESS', 'Claim badges updated', { count, menuBadgeExists: !!menuBadge, tabBadgeExists: !!tabBadge });
}

/**
 * Show a non-blocking notification that milestone rewards are available
 * @param {number} count - Number of eligible milestones
 */
function showMilestoneNotification(count) {
  log.debug('ACHIEVEMENT PROGRESS', 'showMilestoneNotification() called', { count });
  
  // Always update the badge
  updateClaimCountBadge(count);
  
  if (count <= 0) return;
  
  // Remove existing notification if present
  const existingNotification = document.getElementById('milestoneNotification');
  if (existingNotification) {
    existingNotification.remove();
  }
  
  // Create notification element
  const notification = document.createElement('div');
  notification.id = 'milestoneNotification';
  notification.className = 'milestone-notification';
  notification.innerHTML = `
    <div class="milestone-notification-content">
      <span class="notification-icon">🎁</span>
      <div class="notification-text">
        <strong>${count} Milestone Reward${count > 1 ? 's' : ''} Available!</strong>
        <span>Check Leaderboard → Milestones to claim</span>
      </div>
      <button class="notification-close" onclick="closeMilestoneNotification()">×</button>
    </div>
  `;
  
  // Add styles if not already present
  if (!document.getElementById('milestoneNotificationStyles')) {
    const styles = document.createElement('style');
    styles.id = 'milestoneNotificationStyles';
    styles.textContent = `
      .milestone-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        animation: slideInRight 0.3s ease-out;
      }
      
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      .milestone-notification-content {
        display: flex;
        align-items: center;
        gap: 12px;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border: 2px solid #f1c40f;
        border-radius: 12px;
        padding: 12px 16px;
        box-shadow: 0 4px 20px rgba(241, 196, 15, 0.3);
        max-width: 320px;
      }
      
      .notification-icon {
        font-size: 28px;
      }
      
      .notification-text {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      
      .notification-text strong {
        color: #f1c40f;
        font-size: 14px;
      }
      
      .notification-text span {
        color: #bbb;
        font-size: 12px;
      }
      
      .notification-close {
        background: none;
        border: none;
        color: #888;
        font-size: 20px;
        cursor: pointer;
        padding: 0 4px;
        line-height: 1;
      }
      
      .notification-close:hover {
        color: #fff;
      }
    `;
    document.head.appendChild(styles);
  }
  
  // Add to viewport
  const viewportContainer = document.querySelector('.viewport-container') || document.body;
  viewportContainer.appendChild(notification);
  
  // Auto-dismiss after 8 seconds
  setTimeout(() => {
    closeMilestoneNotification();
  }, 8000);
}

/**
 * Close the milestone notification
 */
function closeMilestoneNotification() {
  const notification = document.getElementById('milestoneNotification');
  if (notification) {
    notification.style.animation = 'slideInRight 0.3s ease-out reverse';
    setTimeout(() => {
      notification.remove();
    }, 300);
  }
}

 /**
  * Copy menu-bootstrap milestone definitions into this module's cache (when achievement-progress
  * loads after bootstrap has already written window.__prefetchedMilestoneDefinitions).
  */
 function syncMilestoneDefinitionsCacheFromBootstrap() {
   const prefetched = typeof window !== 'undefined' && window.__prefetchedMilestoneDefinitions;
   const prefetchedAt = typeof window !== 'undefined' && window.__prefetchedMilestoneDefinitionsTimestamp;
   if (!prefetched || !prefetchedAt) return;
   const age = Date.now() - prefetchedAt;
   if (age < 0 || age >= MILESTONE_DEFINITIONS_CACHE_TTL) return;
   milestoneDefinitionsCache = prefetched;
   milestoneDefinitionsCacheTimestamp = prefetchedAt;
 }

 /** Prefetch definitions from API (fallback if menu bootstrap did not cache them). */
 function prefetchMilestoneDefinitions() {
   fetchMilestoneDefinitions().catch(() => {});
 }

 /**
  * Wait until the session loading overlay is gone, then prefetch stats + achievements/progress
  * so the Milestones tab can render from cache without waiting on first open.
  */
 function scheduleMilestoneProgressPrefetchAfterLoadingUi() {
   if (typeof window === 'undefined') return;
   if (!window.walletAPIInstance || !window.walletAPIInstance.isConnected()) return;

   const run = () => {
     try {
       if (typeof window.prefetchMilestoneProgress === 'function') {
         window.prefetchMilestoneProgress();
       }
     } catch (_) {}
   };

   let frames = 0;
   const maxFrames = 180;
   const tick = () => {
     const busy =
       typeof window.LoadingManager !== 'undefined' && window.LoadingManager.isVisible;
     if (!busy || frames >= maxFrames) {
       if (typeof queueMicrotask === 'function') {
         queueMicrotask(run);
       } else {
         setTimeout(run, 0);
       }
       return;
     }
     frames += 1;
     if (typeof requestAnimationFrame === 'function') {
       requestAnimationFrame(tick);
     } else {
       setTimeout(tick, 32);
     }
   };

   if (typeof requestAnimationFrame === 'function') {
     requestAnimationFrame(tick);
   } else {
     tick();
   }
 }

 /**
  * Prefetch milestone progress (stats + claimed/eligible) after wallet login.
  * Prefer scheduleMilestoneProgressPrefetchAfterLoadingUi so work starts after the loading modal closes.
  */
 function prefetchMilestoneProgress() {
   if (!window.walletAPIInstance || !window.walletAPIInstance.isConnected()) return;
   const playerAddress = window.walletAPIInstance.getAddress();
   if (!playerAddress) return;

   const prev = window.__prefetchedMilestoneProgress;
   if (prev && prev.address === playerAddress && (Date.now() - prev.at) < MILESTONE_PROGRESS_PREFETCH_TTL_MS) {
     return;
   }

   if (milestoneProgressPrefetchInFlight && milestoneProgressPrefetchInflightKey === playerAddress) {
     return milestoneProgressPrefetchInFlight;
   }

  const API_BASE = window.GameApi ? window.GameApi.getBaseUrl() : (window.GAME_CONFIG?.GAME_BACKEND_URL || window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3001/api');
   const inflightKey = playerAddress;
   const statsKey = `stats:${playerAddress}`;
   const statsP = (async () => {
     if (window.apiRequestCache && typeof window.apiRequestCache.peekFresh === 'function') {
       const hit = window.apiRequestCache.peekFresh(statsKey, playerAddress);
       if (hit != null) return hit;
     }
     if (typeof window.loadStatsPayloadForWallet === 'function') {
       return await window.loadStatsPayloadForWallet(playerAddress, { forceRefresh: false });
     }
     return null;
   })();
   const p = Promise.all([
     statsP,
    fetch(`${API_BASE}/achievements/progress?address=${playerAddress}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
   ])
     .then(([statsData, progressData]) => {
       const statsOk = statsData != null;
       const progressOk = !!(progressData && progressData.success);
       if (!statsOk && !progressOk) return;
       const at = Date.now();
       window.__prefetchedMilestoneProgress = {
         address: playerAddress,
         statsData: statsOk ? statsData : { success: true, hasStats: false },
         claimed: progressOk ? progressData.claimed || {} : {},
         claimedIds: progressOk ? progressData.claimedIds || [] : [],
         eligible: progressOk ? progressData.eligible || [] : [],
         at,
       };
     })
     .catch(() => {})
     .finally(() => {
       if (milestoneProgressPrefetchInflightKey === inflightKey) {
         milestoneProgressPrefetchInFlight = null;
         milestoneProgressPrefetchInflightKey = null;
       }
     });

   milestoneProgressPrefetchInFlight = p;
   milestoneProgressPrefetchInflightKey = inflightKey;
   return p;
 }

 // Make functions globally available
 syncMilestoneDefinitionsCacheFromBootstrap();
 window.__syncMilestoneDefinitionsFromBootstrapCache = syncMilestoneDefinitionsCacheFromBootstrap;
 window.scheduleMilestoneProgressPrefetchAfterLoadingUi = scheduleMilestoneProgressPrefetchAfterLoadingUi;
 window.prefetchMilestoneDefinitions = prefetchMilestoneDefinitions;
 window.prefetchMilestoneProgress = prefetchMilestoneProgress;
 window.addMilestoneProgressToLeaderboard = addMilestoneProgressToLeaderboard;
 window.__switchMilestoneTabImpl = switchMilestoneTab;
 window.__switchMilestoneSubTabImpl = switchMilestoneSubTab;
 if (typeof window.__bindMilestoneTabImplementations === 'function') {
   window.__bindMilestoneTabImplementations();
 }
 if (typeof window.switchMilestoneTab !== 'function') {
   window.switchMilestoneTab = switchMilestoneTab;
   window.switchMilestoneSubTab = switchMilestoneSubTab;
 }
 window.loadMilestoneProgress = loadMilestoneProgress;
 window.refreshMilestoneProgress = refreshMilestoneProgress;
 window.claimMilestoneRewards = claimMilestoneRewards;
 window.claimAllMilestoneRewards = claimAllMilestoneRewards;
 window.showMilestoneNotification = showMilestoneNotification;
 window.closeMilestoneNotification = closeMilestoneNotification;
 /**
 * Clear the eligible milestones cache
 * Called when wallet changes to ensure fresh data
 */
function clearEligibleMilestonesCache() {
  eligibleMilestonesCache = null;
  eligibleMilestonesCacheTimestamp = 0;
  eligibleMilestonesFetchPromise = null;
  milestoneProgressPrefetchInFlight = null;
  milestoneProgressPrefetchInflightKey = null;
  try {
    delete window.__prefetchedMilestoneProgress;
    delete window.__prefetchedInventory;
    delete window.__prefetchedBadge;
    if (window.PlayerInventoryCache) window.PlayerInventoryCache.invalidate(null);
  } catch (_) {}
  console.log('🏆 [Claim count] Cleared eligible milestones cache');
}

window.updateClaimCountBadge = updateClaimCountBadge;
window.clearEligibleMilestonesCache = clearEligibleMilestonesCache;

/**
 * Game-over / post-claim invalidation (milestones only).
 * Keep this narrowly scoped so we don't blow away inventory/badge caches.
 */
function invalidateMilestoneProgressCaches() {
  eligibleMilestonesCache = null;
  eligibleMilestonesCacheTimestamp = 0;
  eligibleMilestonesFetchPromise = null;
  milestoneProgressPrefetchInFlight = null;
  milestoneProgressPrefetchInflightKey = null;
  try {
    delete window.__prefetchedMilestoneProgress;
  } catch (_) {}
}

window.invalidateMilestoneProgressCaches = invalidateMilestoneProgressCaches;

