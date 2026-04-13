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
    // Local leaderboard (localStorage)
    leaderboard: [],
    
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
    // Load local leaderboard from localStorage
    try {
      const stored = localStorage.getItem('gameLeaderboard');
      this._state.leaderboard = stored ? JSON.parse(stored) : [];
    } catch (error) {
      log.warn('⚠️ [LEADERBOARD SERVICE] Failed to load local leaderboard:', error);
      this._state.leaderboard = [];
    }
    
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
   * Add score to local leaderboard
   */
  addLocalScore(name, score) {
    this._state.leaderboard.push({ 
      name, 
      score, 
      date: new Date().toLocaleDateString() 
    });
    
    // Sort and keep only top 10
    this._state.leaderboard.sort((a, b) => b.score - a.score);
    this._state.leaderboard = this._state.leaderboard.slice(0, 10);
    
    // Save to localStorage
    try {
      localStorage.setItem('gameLeaderboard', JSON.stringify(this._state.leaderboard));
    } catch (error) {
      log.warn('⚠️ [LEADERBOARD SERVICE] Failed to save local leaderboard:', error);
    }
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

