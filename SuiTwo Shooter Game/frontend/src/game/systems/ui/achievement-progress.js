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
  if (listEl && listEl.style.display !== 'none' && window._milestoneStats && window._milestoneClaimed) {
    const pending =
      window._milestoneClaimsPendingByType && window._milestoneClaimsPendingByType[type] === true;
    renderMilestoneProgress(
      listEl,
      window._milestoneStats,
      window._milestoneClaimed,
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

function emptyClaimedStateForMilestoneType(type) {
  return type === 'per-game'
    ? {
        scorePerGame: [],
        distancePerGame: [],
        coinsPerGame: [],
        bossesPerGame: [],
        enemiesPerGame: [],
        coinStreak: [],
      }
    : {
        gamesPlayed: [],
        scoreCumulative: [],
        distanceCumulative: [],
        coinsCumulative: [],
        bossesCumulative: [],
        enemiesCumulative: [],
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

    // Use prefetched progress (loaded after wallet login) if valid
    const prefetched = window.__prefetchedMilestoneProgress;
    if (prefetched && prefetched.address === playerAddress && (Date.now() - prefetched.at) < MILESTONE_PROGRESS_PREFETCH_TTL_MS) {
      const stats = buildStatsFromRawStatsData(type, prefetched.statsData);
      const claimed = prefetched.claimed || emptyClaimedStateForMilestoneType(type);
      const claimedIds = prefetched.claimedIds || [];
      const eligible = prefetched.eligible || [];
      window._milestoneClaimsPendingByType = window._milestoneClaimsPendingByType || {};
      window._milestoneClaimsPendingByType[type] = false;
      await renderMilestoneProgress(listEl, stats, claimed, type, claimedIds, eligible, { claimsPending: false });
      loadingEl.style.display = 'none';
      listEl.style.display = 'block';
      return;
    }

    // Stats: only from apiRequestCache peek or shared menu path (loadStatsPayloadForWallet) — no separate /stats fetch here
    const statsKey = `stats:${playerAddress}`;
    let stats;

    try {
      let statsData =
        window.apiRequestCache && typeof window.apiRequestCache.peekFresh === 'function'
          ? window.apiRequestCache.peekFresh(statsKey, playerAddress)
          : null;
      if (statsData == null && typeof window.loadStatsPayloadForWallet === 'function') {
        statsData = await window.loadStatsPayloadForWallet(playerAddress, { forceRefresh: false });
        log.debug('ACHIEVEMENT PROGRESS', 'Loaded stats via menu stats path for milestones', { type });
      } else if (statsData != null) {
        log.debug('ACHIEVEMENT PROGRESS', 'Using peek-cached stats for milestones', { type });
      }
      stats = buildStatsFromRawStatsData(type, statsData);
      if (!(statsData && statsData.success && statsData.hasStats)) {
        log.warn('ACHIEVEMENT PROGRESS', 'No stats available for player');
      }
    } catch (error) {
      log.error('ACHIEVEMENT PROGRESS', 'Failed to load stats for milestones', { error: error.message });
      stats = buildStatsFromRawStatsData(type, null);
    }

    const API_BASE_URL = window.GameApi ? window.GameApi.getBaseUrl() : (window.GAME_CONFIG?.GAME_BACKEND_URL || window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3001/api');
    const emptyClaimed = emptyClaimedStateForMilestoneType(type);

    window._milestoneClaimsGenByType = window._milestoneClaimsGenByType || {};
    window._milestoneClaimsGenByType[type] = (window._milestoneClaimsGenByType[type] || 0) + 1;
    const claimsGen = window._milestoneClaimsGenByType[type];

    window._milestoneClaimsPendingByType = window._milestoneClaimsPendingByType || {};
    window._milestoneClaimsPendingByType[type] = true;

    await renderMilestoneProgress(listEl, stats, emptyClaimed, type, [], [], { claimsPending: true });
    loadingEl.style.display = 'none';
    listEl.style.display = 'block';

    const timestamp = Date.now();
    const progressUrl = `${API_BASE_URL}/achievements/progress?address=${playerAddress}&clearCache=true&_t=${timestamp}`;
    fetch(progressUrl)
      .then((response) => {
        if (!response.ok) return null;
        return response.json().catch(() => null);
      })
      .catch(() => null)
      .then(async (data) => {
        if (window._milestoneClaimsGenByType[type] !== claimsGen) return;

        let claimed = emptyClaimed;
        let claimedIds = [];
        let eligible = [];
        if (data && data.success) {
          claimed = data.claimed || emptyClaimed;
          claimedIds = data.claimedIds || [];
          eligible = data.eligible || [];
          log.debug('ACHIEVEMENT PROGRESS', 'Fetched milestone claims from API', {
            claimedKeys: Object.keys(claimed),
            claimedIdsCount: claimedIds.length,
            eligibleCount: eligible.length,
          });
        }

        window._milestoneClaimsPendingByType[type] = false;

        const list = document.getElementById(`milestoneList${type === 'per-game' ? 'PerGame' : 'Cumulative'}`);
        if (!list || window._milestoneClaimsGenByType[type] !== claimsGen) return;

        await renderMilestoneProgress(list, stats, claimed, type, claimedIds, eligible, { claimsPending: false });
      })
      .catch(async (error) => {
        log.warn('ACHIEVEMENT PROGRESS', 'Failed to fetch milestone claims', { error: error.message });
        if (window._milestoneClaimsGenByType[type] !== claimsGen) return;
        window._milestoneClaimsPendingByType[type] = false;
        const list = document.getElementById(`milestoneList${type === 'per-game' ? 'PerGame' : 'Cumulative'}`);
        if (!list || window._milestoneClaimsGenByType[type] !== claimsGen) return;
        await renderMilestoneProgress(list, stats, emptyClaimed, type, [], [], { claimsPending: false });
      });
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
async function renderMilestoneProgress(container, stats, claimed, type, claimedIds = [], eligible = [], options = {}) {
  const claimsPending = options.claimsPending === true;
  log.debug('ACHIEVEMENT PROGRESS', 'renderMilestoneProgress() called', {
    type,
    claimedIdsCount: claimedIds.length,
    eligibleCount: eligible.length,
    claimsPending,
  });

  // Store stats and claimed
  window._milestoneStats = stats;
  window._milestoneClaimed = claimed;
  window._milestoneClaimedIds = claimedIds;
  window._milestoneEligible = eligible;

  // Get all categories for this type
  const categories = MILESTONE_CATEGORIES[type] || [];
  if (categories.length === 0) {
    log.warn('ACHIEVEMENT PROGRESS', 'No categories found for type', { type });
    container.innerHTML = '<div class="milestone-empty"><p>No milestones available for this category.</p></div>';
    return;
  }

  await renderAllMilestoneCategories(container, stats, claimed, type, categories, claimedIds, eligible, {
    claimsPending,
  });
}

/**
 * Render all milestone categories
 */
async function renderAllMilestoneCategories(
  container,
  stats,
  claimed,
  type,
  categories,
  claimedIds = [],
  eligible = [],
  renderOpts = {}
) {
  const claimsPending = renderOpts.claimsPending === true;
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
    const claimedList = claimed[category.key] || []; // Keep for backward compatibility
    
    // Get eligible milestones for this category (from API, which uses milestoneId for stable tracking)
    // The API already filters out claimed milestones using milestoneId, so this is the source of truth
    const eligibleForCategory = eligibleByCategory[category.key] || [];
    const eligibleCount = eligibleForCategory.length;
    
    // Next target: first tier where stat is below threshold and that tier is not yet claimed
    const nextEntry = normalizedDefs.find(({ threshold, def }) => {
      if (currentValue >= threshold) return false;
      const milestoneId = def && def.milestoneId;
      if (milestoneId !== undefined && milestoneId !== null) {
        return !claimedIdsSet.has(milestoneId);
      }
      return !claimedList.includes(threshold);
    });
    const nextThreshold = nextEntry ? nextEntry.threshold : null;
    
    const hasEligibleMilestones = !claimsPending && eligibleCount > 0;

    let claimButtonHtml = '';
    if (claimsPending) {
      claimButtonHtml = `<button type="button" class="milestone-claim-btn milestone-claim-btn--pending" disabled data-category="${category.key}" title="Loading claim status…"><span class="btn-icon">⏳</span> Loading…</button>`;
    } else if (hasEligibleMilestones) {
      claimButtonHtml = `<button type="button" class="milestone-claim-btn" data-category="${category.key}" onclick="claimMilestoneRewards('${category.key}')" title="Claim ${eligibleCount} milestone reward${eligibleCount > 1 ? 's' : ''}"><span class="btn-icon">🎁</span> Claim ${eligibleCount}</button>`;
    }

    log.debug('ACHIEVEMENT PROGRESS', 'Rendering milestone category', {
      category: category.name,
      categoryKey: category.key,
      categoryValue: category.value,
      currentValue,
      nextThreshold,
      milestonesCount: normalizedDefs.length,
      claimedCount: claimedList.length,
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

/**
 * Claim milestone rewards for a specific category
 * @param {string} category - The category key (e.g., 'gamesPlayed', 'scorePerGame')
 */
async function claimMilestoneRewards(category) {
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
    const API_BASE_URL = window.GameApi ? window.GameApi.getBaseUrl() : (window.GAME_CONFIG?.GAME_BACKEND_URL || window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3001/api');
    
    // First, get eligible milestones
    log.debug('ACHIEVEMENT PROGRESS', 'Getting eligible milestones', { playerAddress, API_BASE_URL });
    
    const checkResponse = await fetch(`${API_BASE_URL}/achievements/check?address=${playerAddress}`);
    
    if (!checkResponse.ok) {
      throw new Error(`Failed to check eligibility: ${checkResponse.status} ${checkResponse.statusText}`);
    }

    const checkData = await checkResponse.json();
    
    if (!checkData.success) {
      throw new Error(checkData.error || 'Failed to check eligibility');
    }

    // Filter eligible milestones for this category
    const eligibleForCategory = (checkData.eligible || []).filter(m => m.category === category);
    
    if (eligibleForCategory.length === 0) {
      alert('No eligible milestones to claim for this category.');
      return;
    }

    log.debug('ACHIEVEMENT PROGRESS', 'Eligible milestones for category', { 
      category, 
      count: eligibleForCategory.length,
      milestones: eligibleForCategory 
    });

    // Claim all eligible milestones in a single batch transaction (more efficient)
    const claimed = [];
    const errors = [];
    const rewardsNotDistributed = []; // Track milestones where rewards couldn't be distributed

    try {
      log.debug('ACHIEVEMENT PROGRESS', 'Claiming milestones in batch', { 
        category, 
        count: eligibleForCategory.length,
        milestones: eligibleForCategory.map(m => ({ category: m.category, threshold: m.threshold }))
      });

      // Prepare batch claim request
      const milestones = eligibleForCategory.map(m => ({
        category: m.category,
        threshold: m.threshold,
      }));

      const claimResponse = await fetch(`${API_BASE_URL}/achievements/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerAddress,
          milestones, // Batch claim mode
        }),
      });

      const claimData = await claimResponse.json();

      if (claimData.success) {
        // Batch claim completed (admin wallet signed and paid for gas)
        // All milestones claimed in a single transaction
        
        // Track if rewards weren't distributed
        if (claimData.rewardsDistributed === false) {
          // All milestones had the same rewards distribution status
          rewardsNotDistributed.push({
            milestones: claimData.claimed || [],
            error: claimData.rewardsError || 'Admin wallet issue',
          });
        }

        // On-chain claims completed by admin wallet in single transaction
        // Rewards may or may not have been distributed (depending on admin wallet status)
        claimed.push(...(claimData.claimed || []));
        
        log.info('ACHIEVEMENT PROGRESS', 'Batch milestone claim completed successfully', { 
          category, 
          count: claimData.claimed?.length || 0,
          milestones: claimData.claimed?.map(c => ({ category: c.category, threshold: c.threshold })),
          rewardsDistributed: claimData.rewardsDistributed,
        });
      } else {
        log.warn('ACHIEVEMENT PROGRESS', 'Batch claim failed', {
          error: claimData.error,
          milestoneCount: eligibleForCategory.length,
        });
        for (const milestone of eligibleForCategory) {
          errors.push({ milestone, error: claimData.error || 'Batch claim failed' });
        }
      }
    } catch (err) {
      log.error('ACHIEVEMENT PROGRESS', 'Batch claim request failed', {
        error: err.message,
        milestoneCount: eligibleForCategory.length,
      });
      for (const milestone of eligibleForCategory) {
        errors.push({ milestone, error: err.message });
      }
    }

    // Show results
    if (claimed.length > 0) {
      // Build reward summary
      const totalCredits = claimed.reduce((sum, c) => sum + (c?.credits || 0), 0);
      const totalItems = claimed.reduce((sum, c) => sum + (c?.items?.length || 0), 0);
      
      let message = `🎉 Successfully claimed ${claimed.length} milestone${claimed.length > 1 ? 's' : ''}!`;
      
      // Show warning if rewards weren't distributed
      if (rewardsNotDistributed.length > 0) {
        const affectedCount = rewardsNotDistributed.reduce((sum, r) => {
          return sum + (Array.isArray(r.milestones) ? r.milestones.length : 1);
        }, 0);
        message += `\n⚠️ Note: Rewards for ${affectedCount} milestone${affectedCount > 1 ? 's' : ''} could not be automatically distributed and will be processed separately.`;
      } else {
        // Only show rewards if they were distributed
        if (totalCredits > 0) {
          message += `\n💰 +${totalCredits} free credit${totalCredits > 1 ? 's' : ''}`;
        }
        if (totalItems > 0) {
          message += `\n🎁 +${totalItems} item${totalItems > 1 ? 's' : ''}`;
        }
      }
      
      // Show achievement popup if available
      if (typeof window.showAchievementPopup === 'function' && claimed.length > 0) {
        window.showAchievementPopup(claimed.filter(c => c));
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

    // Clear caches after successful claims to force fresh data
    if (claimed.length > 0) {
      if (typeof window.invalidateMilestoneProgressCaches === 'function') {
        window.invalidateMilestoneProgressCaches();
      } else {
        eligibleMilestonesCache = null;
        eligibleMilestonesCacheTimestamp = 0;
        eligibleMilestonesFetchPromise = null;
        try {
          delete window.__prefetchedMilestoneProgress;
        } catch (_) {}
      }
      if (typeof window.prefetchMilestoneProgress === 'function') {
        void window.prefetchMilestoneProgress();
      }
      log.debug('ACHIEVEMENT PROGRESS', 'Invalidated milestone progress + eligible caches after successful claims');
      
      // Clear local cached state to force fresh render
      window._milestoneClaimedIds = null;
      window._milestoneClaimed = null;
      window._milestoneEligible = null;
      
      // Check if leaderboard modal is open and on Milestones tab - refresh immediately if so
      const leaderboardModal = document.getElementById('leaderboardModal');
      const isLeaderboardOpen = leaderboardModal && leaderboardModal.classList.contains('leaderboard-modal-visible');
      const milestonesTab = document.getElementById('milestoneTabMilestones');
      const isMilestonesTabActive = milestonesTab && milestonesTab.classList.contains('active');
      const currentSubTab = window._currentMilestoneSubTab || 'per-game';
      
      // If leaderboard modal is open on Milestones tab, refresh immediately for instant UI update
      if (isLeaderboardOpen && isMilestonesTabActive) {
        log.info('ACHIEVEMENT PROGRESS', 'Leaderboard modal is open on Milestones tab - refreshing immediately', {
          currentSubTab
        });
        // Refresh the milestone progress immediately to update claim buttons
        await loadMilestoneProgress(currentSubTab);
      }
      
      // Wait a moment for blockchain transaction to finalize before refreshing again
      // This ensures the claimed milestones are visible when we refresh (for accuracy)
      log.debug('ACHIEVEMENT PROGRESS', 'Waiting for transaction finalization before refresh');
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      
      // Refresh milestone progress to update claimed status in the modal
      // This will fetch fresh data from the API with cache-busting
      log.info('ACHIEVEMENT PROGRESS', 'Refreshing milestone progress after claim', { 
        currentSubTab, 
        claimedCount: claimed.length 
      });
      await loadMilestoneProgress(currentSubTab);

      // Milestones can grant items / credits — refresh reservoir inventory cache + store UI (same idea as post-purchase).
      if (playerAddress && window.PlayerInventoryCache?.refreshAfterRewardBackground) {
        window.PlayerInventoryCache.refreshAfterRewardBackground(playerAddress);
      }
      
      // Force a fresh fetch for the badge count (don't use cache)
      // Clear cache again before fetching to ensure fresh data
      eligibleMilestonesCache = null;
      eligibleMilestonesCacheTimestamp = 0;
      eligibleMilestonesFetchPromise = null;
      
      // Update the leaderboard badge with forced fresh fetch (bypass cache)
      // Add a small delay to ensure DOM is ready
      await new Promise(resolve => setTimeout(resolve, 100));
      await updateClaimCountBadge(null, true);
      
      // Also update again after a short delay to ensure badges are visible
      setTimeout(async () => {
        await updateClaimCountBadge(null, true);
      }, 500);
      
      // Additional refresh after a longer delay to ensure blockchain data is fully indexed
      // Only if leaderboard modal is still open
      setTimeout(async () => {
        const modalStillOpen = document.getElementById('leaderboardModal') && 
                               document.getElementById('leaderboardModal').classList.contains('leaderboard-modal-visible');
        if (modalStillOpen) {
          log.debug('ACHIEVEMENT PROGRESS', 'Performing additional refresh after delay');
          await loadMilestoneProgress(currentSubTab);
        }
      }, 3000);
    }
    
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
              const response = await fetch(`${API_BASE_URL}/achievements/check?address=${playerAddress}`);
              
              let fetchedCount = 0;
              if (response.ok) {
                const data = await response.json();
                console.log('🏆 [Claim count] API response:', data);
                fetchedCount = data.eligible?.length || data.count || 0;
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

