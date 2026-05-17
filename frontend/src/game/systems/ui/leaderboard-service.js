// ==========================================
// LEADERBOARD SERVICE - State Management
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

log.info('LEADERBOARD SERVICE', 'Leaderboard service module loaded');

const LeaderboardService = {
  // State
  _state: {
    // Current game score
    currentGameScore: 0,
    
    // Game stats from game over
    currentGameStats: null,
    
    // Category definitions
    categories: [
      { id: 'score', name: 'Overall Score', icon: '🏆', primaryField: 'score' },
      { id: 'distance', name: 'Distance Traveled', icon: '📏', primaryField: 'distance' },
      { id: 'bosses', name: 'Bosses Defeated', icon: '👹', primaryField: 'bossesDefeated' },
      { id: 'enemies', name: 'Enemies Defeated', icon: '💀', primaryField: 'enemiesDefeated' },
      { id: 'coins', name: 'Coins Collected', icon: '💰', primaryField: 'coins' },
      { id: 'streak', name: 'Longest Coin Streak', icon: '🔥', primaryField: 'longestCoinStreak' }
    ],
    
    // Current category index
    currentCategoryIndex: 0,
    
    // Blockchain leaderboard data
    currentLeaderboardData: [],

    // Full per-stat leaderboard maps from backend/platform (optional)
    currentLeaderboardByStat: null,
    
    // Loading state
    isLoadingLeaderboard: false,
    
    // Pagination state
    itemsPerPage: 20,
    displayedItemsCount: 0,
    
    // Wallet state
    currentWalletAddress: null,
    currentWalletRank: null,
    currentWalletEntry: null
  },
  
  /**
   * Initialize the service
   */
  init() {
    // Get current wallet address if connected
    if (window.walletAPIInstance && window.walletAPIInstance.isConnected()) {
      this._state.currentWalletAddress = window.walletAPIInstance.getAddress();
    }
  },
  
  /**
   * Get current state
   */
  getState() {
    return this._state;
  },
  
  /**
   * Get current category
   */
  getCurrentCategory() {
    return this._state.categories[this._state.currentCategoryIndex];
  },
  
  /**
   * Set current category index
   */
  setCategoryIndex(index) {
    if (index >= 0 && index < this._state.categories.length) {
      this._state.currentCategoryIndex = index;
      // Reset pagination when changing category
      this._state.displayedItemsCount = this._state.itemsPerPage;

      // If we have a per-stat map, swap displayed list immediately
      const byStat = this._state.currentLeaderboardByStat;
      if (byStat) {
        const cat = this.getCurrentCategory();
        const key =
          cat && cat.id === 'score'
            ? 'bestScore'
            : cat && cat.id === 'distance'
              ? 'bestDistance'
              : cat && cat.id === 'bosses'
                ? 'bestBossesDefeated'
                : cat && cat.id === 'enemies'
                  ? 'bestEnemiesDefeated'
                  : cat && cat.id === 'coins'
                    ? 'bestCoins'
                    : cat && cat.id === 'streak'
                      ? 'bestCoinStreak'
                      : null;
        if (key && Array.isArray(byStat[key])) {
          this._state.currentLeaderboardData = byStat[key];
        }
      }
    }
  },
  
  /**
   * Get next category index
   */
  getNextCategoryIndex() {
    return (this._state.currentCategoryIndex + 1) % this._state.categories.length;
  },
  
  /**
   * Get previous category index
   */
  getPrevCategoryIndex() {
    return (this._state.currentCategoryIndex - 1 + this._state.categories.length) % this._state.categories.length;
  },
  
  /**
   * Set wallet address
   */
  setWalletAddress(address) {
    this._state.currentWalletAddress = address;
  },
  
  /**
   * Set current game score
   */
  setCurrentGameScore(score) {
    this._state.currentGameScore = score;
  },
  
  /**
   * Set current game stats
   */
  setCurrentGameStats(stats) {
    this._state.currentGameStats = stats;
  },
  
  /**
   * Set blockchain leaderboard data
   */
  setLeaderboardData(data) {
    this._state.currentLeaderboardData = data;
    // Reset pagination when fetching new data
    this._state.displayedItemsCount = this._state.itemsPerPage;
  },

  /**
   * Store full per-stat leaderboard map and align current list.
   */
  setLeaderboardByStat(byStat) {
    this._state.currentLeaderboardByStat = byStat || null;
    // Align immediately to current category
    if (byStat) {
      try {
        const cat = this.getCurrentCategory();
        const key =
          cat && cat.id === 'score'
            ? 'bestScore'
            : cat && cat.id === 'distance'
              ? 'bestDistance'
              : cat && cat.id === 'bosses'
                ? 'bestBossesDefeated'
                : cat && cat.id === 'enemies'
                  ? 'bestEnemiesDefeated'
                  : cat && cat.id === 'coins'
                    ? 'bestCoins'
                    : cat && cat.id === 'streak'
                      ? 'bestCoinStreak'
                      : null;
        if (key && Array.isArray(byStat[key])) {
          this.setLeaderboardData(byStat[key]);
        }
      } catch (_) {}
    }
  },
  
  /**
   * Set loading state
   */
  setLoading(loading) {
    this._state.isLoadingLeaderboard = loading;
  },
  
  /**
   * Load more items
   */
  loadMore() {
    this._state.displayedItemsCount += this._state.itemsPerPage;
  },
  
  /**
   * Set wallet rank and entry
   */
  setWalletRank(rank, entry) {
    this._state.currentWalletRank = rank;
    this._state.currentWalletEntry = entry;
  },
  
  /**
   * Reset pagination
   */
  resetPagination() {
    this._state.displayedItemsCount = this._state.itemsPerPage;
  }
};

// Initialize on load
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      LeaderboardService.init();
    });
  } else {
    LeaderboardService.init();
  }
  
  // Expose globally
  window.LeaderboardService = LeaderboardService;
}

