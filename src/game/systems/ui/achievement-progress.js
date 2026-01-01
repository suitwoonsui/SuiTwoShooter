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

  // Check if tabs already exist
  if (document.getElementById('leaderboardMilestoneTabs')) {
    log.debug('ACHIEVEMENT PROGRESS', 'Milestone tabs already exist');
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
         <span class="milestone-tab-badge" id="milestonesTabBadge" style="display: none;">0</span>
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
  if (typeof updateLeaderboardClaimBadge === 'function') {
    updateLeaderboardClaimBadge();
  }

  log.info('ACHIEVEMENT PROGRESS', 'Milestone tabs added to leaderboard');
}

 /**
  * Switch between milestone tabs (Leaderboard or Milestones)
  */
 function switchMilestoneTab(tab) {
   log.debug('ACHIEVEMENT PROGRESS', 'switchMilestoneTab() called', { tab });

   // Update tab buttons
   const tabs = document.querySelectorAll('.milestone-tab');
   tabs.forEach(t => t.classList.remove('active'));
   
   const activeTab = document.getElementById(`milestoneTab${tab === 'leaderboard' ? 'Leaderboard' : 'Milestones'}`);
   if (activeTab) {
     activeTab.classList.add('active');
   }

   // Update main header title
   const mainTitleElement = document.getElementById('leaderboardMainTitle');
   if (mainTitleElement) {
     if (tab === 'leaderboard') {
       mainTitleElement.textContent = '🏆 Leaderboard';
     } else {
       mainTitleElement.textContent = '⭐ Milestones';
     }
   }

   // Update tab content
   const contents = document.querySelectorAll('.milestone-tab-content');
   contents.forEach(c => c.classList.remove('active'));

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

   // Update sub-tab buttons
   const subTabs = document.querySelectorAll('.milestone-sub-tab');
   subTabs.forEach(t => t.classList.remove('active'));
   
   const activeSubTab = document.getElementById(`milestoneSubTab${subTab === 'per-game' ? 'PerGame' : 'Cumulative'}`);
   if (activeSubTab) {
     activeSubTab.classList.add('active');
   }

   // Update sub-tab content
   const subContents = document.querySelectorAll('.milestone-sub-tab-content');
   subContents.forEach(c => c.classList.remove('active'));

   const activeSubContent = document.getElementById(`milestoneSubTabContent${subTab === 'per-game' ? 'PerGame' : 'Cumulative'}`);
   if (activeSubContent) {
     activeSubContent.classList.add('active');
   }

   // Load milestone data for the selected sub-tab
   loadMilestoneProgress(subTab);
 }

/**
 * Refresh milestone progress for current sub-tab
 */
function refreshMilestoneProgress() {
  const currentSubTab = window._currentMilestoneSubTab || 'per-game';
  loadMilestoneProgress(currentSubTab);
  
  // Also refresh the badge count when manually refreshing milestone progress
  if (window.walletAPIInstance && window.walletAPIInstance.isConnected()) {
    if (typeof window.updateLeaderboardClaimBadge === 'function') {
      // Clear cache and force refresh to get latest count
      if (typeof window.clearEligibleMilestonesCache === 'function') {
        window.clearEligibleMilestonesCache();
      }
      window.updateLeaderboardClaimBadge(null, true).catch(err => {
        console.warn('⚠️ [ACHIEVEMENT PROGRESS] Failed to update badge on refresh:', err);
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

// Cache for milestone definitions fetched from API
let milestoneDefinitionsCache = null;
let milestoneDefinitionsCacheTimestamp = 0;
const MILESTONE_DEFINITIONS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Request deduplication: prevent multiple concurrent fetches
let milestoneDefinitionsFetchPromise = null;

// Cache for eligible milestones count (for badge updates)
let eligibleMilestonesCache = null;
let eligibleMilestonesCacheTimestamp = 0;
let eligibleMilestonesFetchPromise = null;
const ELIGIBLE_MILESTONES_CACHE_TTL = 30 * 1000; // 30 seconds (shorter since this changes more frequently)

/**
 * Fetch milestone definitions from API
 */
async function fetchMilestoneDefinitions() {
  const now = Date.now();
  
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
      const API_BASE_URL = window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3000/api';
      log.debug('ACHIEVEMENT PROGRESS', 'Fetching milestone definitions from API', { API_BASE_URL });
      
      const response = await fetch(`${API_BASE_URL}/milestones/definitions`);
      
      if (!response.ok) {
        log.warn('ACHIEVEMENT PROGRESS', 'Failed to fetch milestone definitions, using fallback', {
          status: response.status,
          statusText: response.statusText,
        });
        // Return fallback definitions if API fails
        return getFallbackMilestoneDefinitions();
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
        log.warn('ACHIEVEMENT PROGRESS', 'API response missing definitions, using fallback');
        return getFallbackMilestoneDefinitions();
      }
    } catch (error) {
      log.error('ACHIEVEMENT PROGRESS', 'Error fetching milestone definitions, using fallback', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return getFallbackMilestoneDefinitions();
    } finally {
      // Clear the promise so future calls can start a new fetch if needed
      milestoneDefinitionsFetchPromise = null;
    }
  })();
  
  return milestoneDefinitionsFetchPromise;
}

/**
 * Get fallback milestone definitions (used when API is unavailable)
 */
function getFallbackMilestoneDefinitions() {
  return {
    gamesPlayed: [5, 15, 35, 75, 150, 300, 500],
    scorePerGame: [10000, 25000, 50000, 100000, 150000, 200000],
    scoreCumulative: [50000, 100000, 250000, 500000, 1000000, 2500000, 5000000],
    distancePerGame: [5000, 10000, 15000, 25000, 40000, 60000],
    distanceCumulative: [25000, 50000, 100000, 250000, 500000, 1000000, 2500000],
    coinsPerGame: [25, 50, 75, 100, 125, 150],
    coinsCumulative: [250, 500, 1000, 2500, 5000, 10000, 25000],
    bossesPerGame: [2, 4, 6, 8, 10, 12],
    bossesCumulative: [5, 10, 25, 50, 100, 200, 500],
    enemiesPerGame: [25, 50, 100, 250, 400, 500],
    enemiesCumulative: [100, 250, 500, 1000, 2500, 5000, 10000],
    coinStreak: [10, 20, 30, 40, 50],
  };
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
    // Data is already loaded, just re-render all categories (will use cached definitions)
    renderMilestoneProgress(
      listEl, 
      window._milestoneStats, 
      window._milestoneClaimed, 
      type,
      window._milestoneClaimedIds || [],
      window._milestoneEligible || []
    ).catch(err => {
      log.error('ACHIEVEMENT PROGRESS', 'Error re-rendering milestone progress', { error: err });
    });
  }
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

    // For per-game milestones, extract best stats from leaderboard data (same as leaderboard does)
    if (type === 'per-game') {
      if (!window.LeaderboardService) {
        throw new Error('LeaderboardService not available');
      }

      // Ensure leaderboard data is loaded (same as leaderboard modal does)
      const state = window.LeaderboardService.getState();
      
      // If leaderboard data is empty, trigger a load
      if (!state.currentLeaderboardData || state.currentLeaderboardData.length === 0) {
        log.debug('ACHIEVEMENT PROGRESS', 'Leaderboard data not loaded, triggering load');
        if (typeof window.fetchBlockchainLeaderboard === 'function') {
          await window.fetchBlockchainLeaderboard();
          // Wait a bit for data to load
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      const leaderboardData = window.LeaderboardService.getState().currentLeaderboardData || [];
      
      log.debug('ACHIEVEMENT PROGRESS', 'Extracting stats from leaderboard', {
        totalEntries: leaderboardData.length,
        playerAddress,
      });
      
      // Find all entries for this player and extract best values
      const playerEntries = leaderboardData.filter(entry => {
        const entryAddress = entry.walletAddress || entry.playerAddress || '';
        return entryAddress.toLowerCase() === playerAddress.toLowerCase();
      });

      log.debug('ACHIEVEMENT PROGRESS', 'Player entries found', {
        entryCount: playerEntries.length,
        entries: playerEntries.map(e => ({
          score: e.score,
          distance: e.distance,
          coins: e.coins,
        })),
      });

      // Extract best values from player's entries
      const stats = {
        bestScore: playerEntries.length > 0 ? Math.max(...playerEntries.map(e => e.score || 0)) : 0,
        bestDistance: playerEntries.length > 0 ? Math.max(...playerEntries.map(e => e.distance || 0)) : 0,
        bestCoins: playerEntries.length > 0 ? Math.max(...playerEntries.map(e => e.coins || 0)) : 0,
        bestBossesDefeated: playerEntries.length > 0 ? Math.max(...playerEntries.map(e => e.bossesDefeated || 0)) : 0,
        bestEnemiesDefeated: playerEntries.length > 0 ? Math.max(...playerEntries.map(e => e.enemiesDefeated || 0)) : 0,
        bestCoinStreak: playerEntries.length > 0 ? Math.max(...playerEntries.map(e => e.longestCoinStreak || 0)) : 0,
      };

      log.debug('ACHIEVEMENT PROGRESS', 'Extracted best stats', stats);

      // Fetch claimed milestones and eligible milestones from API
      const API_BASE_URL = window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3000/api';
      let claimed = {
        scorePerGame: [],
        distancePerGame: [],
        coinsPerGame: [],
        bossesPerGame: [],
        enemiesPerGame: [],
        coinStreak: [],
      };
      let claimedIds = [];
      let eligible = [];

      try {
        const response = await fetch(`${API_BASE_URL}/achievements/progress?address=${playerAddress}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            claimed = data.claimed || claimed;
            claimedIds = data.claimedIds || [];
            eligible = data.eligible || [];
            log.debug('ACHIEVEMENT PROGRESS', 'Fetched milestone data from API', {
              claimedKeys: Object.keys(claimed),
              claimedIdsCount: claimedIds.length,
              eligibleCount: eligible.length,
            });
          }
        }
      } catch (error) {
        log.warn('ACHIEVEMENT PROGRESS', 'Failed to fetch milestone data, using empty', { error: error.message });
      }

      // Render milestones with stats from leaderboard and claimed/eligible from API
      await renderMilestoneProgress(listEl, stats, claimed, type, claimedIds, eligible);
      loadingEl.style.display = 'none';
      listEl.style.display = 'block';
      return;
    }

    // For cumulative milestones, calculate from leaderboard entries (same data source)
    if (type === 'cumulative') {
      if (!window.LeaderboardService) {
        throw new Error('LeaderboardService not available');
      }

      // Ensure leaderboard data is loaded
      const state = window.LeaderboardService.getState();
      
      // If leaderboard data is empty, trigger a load
      if (!state.currentLeaderboardData || state.currentLeaderboardData.length === 0) {
        log.debug('ACHIEVEMENT PROGRESS', 'Leaderboard data not loaded, triggering load');
        if (typeof window.fetchBlockchainLeaderboard === 'function') {
          await window.fetchBlockchainLeaderboard();
          // Wait a bit for data to load
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      const leaderboardData = window.LeaderboardService.getState().currentLeaderboardData || [];
      
      log.debug('ACHIEVEMENT PROGRESS', 'Calculating cumulative stats from leaderboard', {
        totalEntries: leaderboardData.length,
        playerAddress,
      });
      
      // Find all entries for this player and sum them up
      const playerEntries = leaderboardData.filter(entry => {
        const entryAddress = entry.walletAddress || entry.playerAddress || '';
        return entryAddress.toLowerCase() === playerAddress.toLowerCase();
      });

      log.debug('ACHIEVEMENT PROGRESS', 'Player entries for cumulative stats', {
        entryCount: playerEntries.length,
      });

      // Calculate cumulative stats by summing all player entries
      const stats = {
        totalGames: playerEntries.length,
        totalScore: playerEntries.reduce((sum, e) => sum + (e.score || 0), 0),
        totalDistance: playerEntries.reduce((sum, e) => sum + (e.distance || 0), 0),
        totalCoins: playerEntries.reduce((sum, e) => sum + (e.coins || 0), 0),
        totalBossesDefeated: playerEntries.reduce((sum, e) => sum + (e.bossesDefeated || 0), 0),
        totalEnemiesDefeated: playerEntries.reduce((sum, e) => sum + (e.enemiesDefeated || 0), 0),
        // Also include best values (needed for the stats object structure)
        bestScore: playerEntries.length > 0 ? Math.max(...playerEntries.map(e => e.score || 0)) : 0,
        bestDistance: playerEntries.length > 0 ? Math.max(...playerEntries.map(e => e.distance || 0)) : 0,
        bestCoins: playerEntries.length > 0 ? Math.max(...playerEntries.map(e => e.coins || 0)) : 0,
        bestBossesDefeated: playerEntries.length > 0 ? Math.max(...playerEntries.map(e => e.bossesDefeated || 0)) : 0,
        bestEnemiesDefeated: playerEntries.length > 0 ? Math.max(...playerEntries.map(e => e.enemiesDefeated || 0)) : 0,
        bestCoinStreak: playerEntries.length > 0 ? Math.max(...playerEntries.map(e => e.longestCoinStreak || 0)) : 0,
      };

      log.debug('ACHIEVEMENT PROGRESS', 'Calculated cumulative stats', stats);

      // Fetch claimed milestones and eligible milestones from API
      const API_BASE_URL = window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3000/api';
      let claimed = {
        gamesPlayed: [],
        scoreCumulative: [],
        distanceCumulative: [],
        coinsCumulative: [],
        bossesCumulative: [],
        enemiesCumulative: [],
      };
      let claimedIds = [];
      let eligible = [];

      try {
        const response = await fetch(`${API_BASE_URL}/achievements/progress?address=${playerAddress}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            claimed = data.claimed || claimed;
            claimedIds = data.claimedIds || [];
            eligible = data.eligible || [];
            log.debug('ACHIEVEMENT PROGRESS', 'Fetched milestone data from API', {
              claimedKeys: Object.keys(claimed),
              claimedIdsCount: claimedIds.length,
              eligibleCount: eligible.length,
            });
          }
        }
      } catch (error) {
        log.warn('ACHIEVEMENT PROGRESS', 'Failed to fetch milestone data, using empty', { error: error.message });
      }

      // Render milestones with cumulative stats from leaderboard and claimed/eligible from API
      await renderMilestoneProgress(listEl, stats, claimed, type, claimedIds, eligible);
      loadingEl.style.display = 'none';
      listEl.style.display = 'block';
      return;
    }

    // Fallback: If we somehow get here, fetch from API
    const API_BASE_URL = window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3000/api';
    log.debug('ACHIEVEMENT PROGRESS', 'Fetching milestone progress from API (fallback)', { playerAddress, type, API_BASE_URL });
    
    const response = await fetch(`${API_BASE_URL}/achievements/progress?address=${playerAddress}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      log.error('ACHIEVEMENT PROGRESS', 'API response not OK', {
        status: response.status,
        statusText: response.statusText,
        errorText,
      });
      
      // Handle 404 - contract not deployed yet
      if (response.status === 404) {
        listEl.innerHTML = `
          <div class="milestone-error">
            <p>🎯 Milestone system is being set up!</p>
            <p style="margin-top: 1em; font-size: 0.9em; color: #888;">
              The achievement contract is not yet deployed. Milestone progress will be available once the contract is live.
            </p>
          </div>
        `;
        loadingEl.style.display = 'none';
        listEl.style.display = 'block';
        return;
      }
      
      throw new Error(`Failed to fetch progress: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    log.debug('ACHIEVEMENT PROGRESS', 'API response received', {
      success: data.success,
      hasStats: !!data.stats,
      hasClaimed: !!data.claimed,
      statsKeys: data.stats ? Object.keys(data.stats) : [],
      claimedKeys: data.claimed ? Object.keys(data.claimed) : [],
      stats: data.stats ? {
        totalGames: data.stats.totalGames,
        bestScore: data.stats.bestScore,
        totalScore: data.stats.totalScore,
        bestCoins: data.stats.bestCoins,
        totalCoins: data.stats.totalCoins,
      } : null,
    });

    if (!data.success) {
      // Check if it's a contract not configured error
      const errorMsg = data.error || 'Failed to load progress';
      if (errorMsg.includes('not configured') || errorMsg.includes('not found') || errorMsg.includes('registry')) {
        listEl.innerHTML = `
          <div class="milestone-error">
            <p>🎯 Milestone system is being set up!</p>
            <p style="margin-top: 1em; font-size: 0.9em; color: #888;">
              The achievement contract is not yet deployed. Milestone progress will be available once the contract is live.
            </p>
          </div>
        `;
        loadingEl.style.display = 'none';
        listEl.style.display = 'block';
        return;
      }
      throw new Error(errorMsg);
    }

    if (!data.stats || !data.claimed) {
      throw new Error('Invalid response format: missing stats or claimed data');
    }

    // EXTENSIVE LOGGING
    console.log('🔍 [FRONTEND] Fetched milestone data from API (fallback):', {
      playerAddress,
      claimed: data.claimed,
      claimedIds: data.claimedIds || [],
      claimedIdsCount: (data.claimedIds || []).length,
      eligible: data.eligible || [],
      eligibleCount: (data.eligible || []).length,
      eligibleDetails: (data.eligible || []).map(e => ({
        category: e.category,
        milestoneId: e.milestoneId,
        threshold: e.threshold,
      })),
    });

    // Render milestones with claimedIds and eligible from API
    await renderMilestoneProgress(
      listEl, 
      data.stats, 
      data.claimed, 
      type, 
      data.claimedIds || [], 
      data.eligible || []
    );

    loadingEl.style.display = 'none';
    listEl.style.display = 'block';
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
async function renderMilestoneProgress(container, stats, claimed, type, claimedIds = [], eligible = []) {
  log.debug('ACHIEVEMENT PROGRESS', 'renderMilestoneProgress() called', { type, claimedIdsCount: claimedIds.length, eligibleCount: eligible.length });

  // Store stats and claimed
  window._milestoneStats = stats;
  window._milestoneClaimed = claimed;
  window._milestoneClaimedIds = claimedIds;
  window._milestoneEligible = eligible;

  // Get all categories for this type
  const categories = MILESTONE_CATEGORIES[type] || [];
  if (categories.length === 0) {
    container.innerHTML = '<div class="milestone-empty"><p>No milestones available for this category.</p></div>';
    return;
  }

  // Render all categories (now async to fetch definitions)
  await renderAllMilestoneCategories(container, stats, claimed, type, categories, claimedIds, eligible);
}

/**
 * Render all milestone categories
 */
async function renderAllMilestoneCategories(container, stats, claimed, type, categories, claimedIds = [], eligible = []) {
  // Fetch milestone definitions from API (or use cached/fallback)
  const milestoneDefinitions = await fetchMilestoneDefinitions();
  
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
    const currentValue = stats[category.value] || 0;
    const milestones = milestoneDefinitions[category.key] || [];
    const claimedList = claimed[category.key] || []; // Keep for backward compatibility
    
    // Get eligible milestones for this category (from API, which uses milestoneId for stable tracking)
    // The API already filters out claimed milestones using milestoneId, so this is the source of truth
    const eligibleForCategory = eligibleByCategory[category.key] || [];
    
    // EXTENSIVE LOGGING
    console.log(`🔍 [RENDER] Rendering category: ${category.key}`, {
      categoryName: category.name,
      currentValue,
      milestonesCount: milestones.length,
      milestones: milestones,
      claimedList: claimedList,
      claimedIds: Array.from(claimedIdsSet),
      eligibleForCategory: eligibleForCategory,
      eligibleForCategoryCount: eligibleForCategory.length,
    });
    
    // Use the eligible array from API as primary source (already filtered by milestoneId)
    // This ensures we show the correct claimable milestones even if levels are reorganized
    const eligibleMilestones = eligibleForCategory.map(e => e.threshold);
    
    console.log(`🔍 [RENDER] Eligible milestones (thresholds) for ${category.key}:`, eligibleMilestones);
    
    // Find next unclaimed milestone (using milestoneId check)
    const nextMilestone = milestones.find(milestoneThreshold => {
      if (currentValue >= milestoneThreshold) return false; // Already reached
      
      const definition = milestoneDefinitions[category.key]?.find(d => d.threshold === milestoneThreshold);
      if (!definition) return true; // Include if definition not found
      
      // Check if claimed using milestoneId (preferred) or threshold (fallback)
      if (definition.milestoneId !== undefined && definition.milestoneId !== null) {
        return !claimedIdsSet.has(definition.milestoneId);
      } else {
        return !claimedList.includes(milestoneThreshold);
      }
    });
    
    const hasEligibleMilestones = eligibleMilestones.length > 0;
    
    log.debug('ACHIEVEMENT PROGRESS', 'Rendering milestone category', {
      category: category.name,
      categoryKey: category.key,
      categoryValue: category.value,
      currentValue,
      nextMilestone,
      milestonesCount: milestones.length,
      claimedCount: claimedList.length,
      eligibleCount: eligibleMilestones.length,
    });

    // Calculate progress percentage
    const progress = nextMilestone 
      ? Math.min(100, (currentValue / nextMilestone) * 100)
      : currentValue >= (milestones[milestones.length - 1] || 0) ? 100 : 0;

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
            ${hasEligibleMilestones ? `
              <button class="milestone-claim-btn" data-category="${category.key}" onclick="claimMilestoneRewards('${category.key}')" title="Claim ${eligibleMilestones.length} milestone reward${eligibleMilestones.length > 1 ? 's' : ''}">
                <span class="btn-icon">🎁</span> Claim ${eligibleMilestones.length}
              </button>
            ` : ''}
          </div>
          <div class="milestone-progress-bar">
            <div class="milestone-progress-fill" style="width: ${progress}%"></div>
          </div>
        </div>
        <div class="milestone-next-target-box">
          ${nextMilestone ? `<span class="milestone-target-number">${formatValue(nextMilestone)}</span>` : '<span class="milestone-target-complete">🏆 Complete</span>'}
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
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1) + 'M';
  } else if (value >= 1000) {
    return (value / 1000).toFixed(1) + 'K';
  }
  return value.toLocaleString();
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

  // Find and disable the claim button to prevent double-clicks
  const claimBtns = document.querySelectorAll(`.milestone-claim-btn[data-category="${category}"]`);
  claimBtns.forEach(btn => {
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-icon">⏳</span> Claiming...';
  });

  try {
    const API_BASE_URL = window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3000/api';
    
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
        // Batch claim failed - fall back to individual claims
        log.warn('ACHIEVEMENT PROGRESS', 'Batch claim failed, falling back to individual claims', {
          error: claimData.error,
          milestoneCount: eligibleForCategory.length,
        });

        // Fallback: claim one by one
        for (const milestone of eligibleForCategory) {
          try {
            log.debug('ACHIEVEMENT PROGRESS', 'Claiming milestone individually (fallback)', { 
              category: milestone.category, 
              threshold: milestone.threshold 
            });

            const individualResponse = await fetch(`${API_BASE_URL}/achievements/claim`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                playerAddress,
                category: milestone.category,
                threshold: milestone.threshold,
              }),
            });

            const individualData = await individualResponse.json();

            if (individualData.success) {
              // API returns claimed as array (for consistency), but single claim has one item
              const claimedMilestone = Array.isArray(individualData.claimed) 
                ? individualData.claimed[0] 
                : individualData.claimed;
              
              if (individualData.rewardsDistributed === false) {
                rewardsNotDistributed.push({
                  milestone: claimedMilestone,
                  error: individualData.rewardsError || 'Admin wallet issue',
                });
              }
              if (claimedMilestone) {
                claimed.push(claimedMilestone);
              }
            } else {
              errors.push({ milestone, error: individualData.error });
            }
          } catch (err) {
            errors.push({ milestone, error: err.message });
          }
        }
      }
    } catch (err) {
      // Network or other error - try individual claims as fallback
      log.error('ACHIEVEMENT PROGRESS', 'Batch claim request failed, falling back to individual claims', {
        error: err.message,
        milestoneCount: eligibleForCategory.length,
      });

      for (const milestone of eligibleForCategory) {
        try {
          const individualResponse = await fetch(`${API_BASE_URL}/achievements/claim`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              playerAddress,
              category: milestone.category,
              threshold: milestone.threshold,
            }),
          });

          const individualData = await individualResponse.json();
          if (individualData.success) {
            // API returns claimed as array (for consistency), but single claim has one item
            const claimedMilestone = Array.isArray(individualData.claimed) 
              ? individualData.claimed[0] 
              : individualData.claimed;
            
            if (individualData.rewardsDistributed === false) {
              rewardsNotDistributed.push({
                milestone: claimedMilestone,
                error: individualData.rewardsError || 'Admin wallet issue',
              });
            }
            if (claimedMilestone) {
              claimed.push(claimedMilestone);
            }
          } else {
            errors.push({ milestone, error: individualData.error });
          }
        } catch (individualErr) {
          errors.push({ milestone, error: individualErr.message });
        }
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
      // Clear cache immediately to force fresh fetch
      eligibleMilestonesCache = null;
      eligibleMilestonesCacheTimestamp = 0;
      eligibleMilestonesFetchPromise = null; // Clear any pending fetch promise
      log.debug('ACHIEVEMENT PROGRESS', 'Cleared eligible milestones cache after successful claims');
      
      // Wait a moment for blockchain transaction to finalize before refreshing
      // This ensures the claimed milestones are visible when we refresh
      log.debug('ACHIEVEMENT PROGRESS', 'Waiting for transaction finalization before refresh');
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      
      // Refresh milestone progress to update claimed status in the modal
      const currentSubTab = window._currentMilestoneSubTab || 'per-game';
      await loadMilestoneProgress(currentSubTab);
      
      // Force a fresh fetch for the badge count (don't use cache)
      // Clear cache again before fetching to ensure fresh data
      eligibleMilestonesCache = null;
      eligibleMilestonesCacheTimestamp = 0;
      eligibleMilestonesFetchPromise = null;
      
      // Update the leaderboard badge with forced fresh fetch (bypass cache)
      // Add a small delay to ensure DOM is ready
      await new Promise(resolve => setTimeout(resolve, 100));
      await updateLeaderboardClaimBadge(null, true);
      
      // Also update again after a short delay to ensure badges are visible
      setTimeout(async () => {
        await updateLeaderboardClaimBadge(null, true);
      }, 500);
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
 * Update the claim badge on the Leaderboard button
 * @param {number|null} count - Number of eligible milestones (or null to fetch)
 * @param {boolean} forceRefresh - If true, bypass cache and force fresh fetch
 */
async function updateLeaderboardClaimBadge(count = null, forceRefresh = false) {
  console.log('🏆 [CLAIM BADGE] updateLeaderboardClaimBadge called', { count, forceRefresh });
  
  const menuBadge = document.getElementById('leaderboardClaimBadge');
  const tabBadge = document.getElementById('milestonesTabBadge');

  // If count not provided, fetch from API (with caching and deduplication)
  if (count === null) {
    try {
      // Get player address
      let playerAddress = null;
      if (window.walletAPIInstance && window.walletAPIInstance.isConnected()) {
        playerAddress = window.walletAPIInstance.getAddress();
      }

      if (!playerAddress) {
        console.log('🏆 [CLAIM BADGE] No wallet connected, hiding badges');
        if (menuBadge) menuBadge.style.display = 'none';
        if (tabBadge) tabBadge.style.display = 'none';
        return;
      }

      // Check cache first (unless forceRefresh is true)
      const now = Date.now();
      if (!forceRefresh && eligibleMilestonesCache !== null && 
          (now - eligibleMilestonesCacheTimestamp) < ELIGIBLE_MILESTONES_CACHE_TTL) {
        console.log('🏆 [CLAIM BADGE] Using cached eligible milestones count:', eligibleMilestonesCache);
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
          console.log('🏆 [CLAIM BADGE] Fetch already in progress, waiting for existing request');
          count = await eligibleMilestonesFetchPromise;
        } else {
          // Start new fetch
          eligibleMilestonesFetchPromise = (async () => {
            try {
              console.log('🏆 [CLAIM BADGE] Fetching eligible milestones for', playerAddress);
              const API_BASE_URL = window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3000/api';
              const response = await fetch(`${API_BASE_URL}/achievements/check?address=${playerAddress}`);
              
              let fetchedCount = 0;
              if (response.ok) {
                const data = await response.json();
                console.log('🏆 [CLAIM BADGE] API response:', data);
                fetchedCount = data.eligible?.length || data.count || 0;
              } else {
                console.warn('🏆 [CLAIM BADGE] API error:', response.status);
                fetchedCount = 0;
              }
              
              // Update cache
              eligibleMilestonesCache = fetchedCount;
              eligibleMilestonesCacheTimestamp = Date.now();
              
              return fetchedCount;
            } catch (error) {
              console.error('🏆 [CLAIM BADGE] Error fetching eligible count:', error);
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
      console.error('🏆 [CLAIM BADGE] Error in updateLeaderboardClaimBadge:', error);
      log.warn('ACHIEVEMENT PROGRESS', 'Error in updateLeaderboardClaimBadge', { error: error.message });
      count = 0;
    }
  }

  // Ensure count is a number
  if (count === null || count === undefined) {
    console.warn('🏆 [CLAIM BADGE] Count is null/undefined, defaulting to 0');
    count = 0;
  }
  
  // Convert to number if it's not already
  count = Number(count);
  if (isNaN(count)) {
    console.warn('🏆 [CLAIM BADGE] Count is NaN, defaulting to 0');
    count = 0;
  }

  // Update badge visibility and count
  console.log('🏆 [CLAIM BADGE] Setting badge count:', count, {
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
      console.log('🏆 [CLAIM BADGE] Updated menu badge:', badgeText);
    } else {
      menuBadge.style.display = 'none';
      console.log('🏆 [CLAIM BADGE] Hid menu badge (count is 0)');
    }
  } else {
    console.warn('🏆 [CLAIM BADGE] Menu badge element not found (id: leaderboardClaimBadge)');
  }
  
  // Update Milestones tab badge (inside leaderboard modal)
  if (tabBadge) {
    if (count > 0) {
      tabBadge.textContent = badgeText;
      tabBadge.style.display = 'flex';
      console.log('🏆 [CLAIM BADGE] Updated tab badge:', badgeText);
    } else {
      tabBadge.style.display = 'none';
      console.log('🏆 [CLAIM BADGE] Hid tab badge (count is 0)');
    }
  } else {
    console.warn('🏆 [CLAIM BADGE] Tab badge element not found (id: milestonesTabBadge)');
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
  updateLeaderboardClaimBadge(count);
  
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

 // Make functions globally available
 window.addMilestoneProgressToLeaderboard = addMilestoneProgressToLeaderboard;
 window.switchMilestoneTab = switchMilestoneTab;
 window.switchMilestoneSubTab = switchMilestoneSubTab;
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
  console.log('🏆 [CLAIM BADGE] Cleared eligible milestones cache');
}

window.updateLeaderboardClaimBadge = updateLeaderboardClaimBadge;
window.clearEligibleMilestonesCache = clearEligibleMilestonesCache;

