// ==========================================
// GAME DATA STATE MANAGER
// ==========================================
// Centralized state management for game data loading

console.log('✅ [STATE] GameDataState module loaded - NEW REFACTORED SYSTEM ACTIVE');

const GameDataState = {
  // Loading states
  isLoading: false,
  isLoadingBalance: false,
  isLoadingBadge: false,
  isLoadingStats: false,
  
  // Current data
  walletAddress: null,
  balance: null,
  badge: null,
  lastLoadedAddress: null,
  
  // UI state
  badgeDisplayVisible: false,
  badgeModalVisible: false,
  
  // Readiness flags (for backward compatibility with existing code)
  dataLoaded: false,
  migrationCheckComplete: false,
  migrationModalClosed: true,
  
  // Flag to skip upgrade check on next reload (after dismissing upgrade)
  skipUpgradeCheck: false,
  
  /**
   * Set flag to skip upgrade check on next reload
   */
  setSkipUpgradeCheck(skip) {
    this.skipUpgradeCheck = skip;
  },
  
  /**
   * Check if we should skip upgrade check
   * @returns {boolean}
   */
  shouldSkipUpgradeCheck() {
    return this.skipUpgradeCheck;
  },
  
  /**
   * Check if we can load game data
   * @returns {boolean}
   */
  canLoad() {
    return !this.isLoading && 
           !this.badgeModalVisible && 
           this.walletAddress !== null;
  },
  
  /**
   * Check if data is already loaded for the given address
   * @param {string} address - Wallet address
   * @returns {boolean}
   */
  isLoadedForAddress(address) {
    return this.lastLoadedAddress === address && 
           this.badge !== null && 
           this.badgeDisplayVisible;
  },
  
  /**
   * Check if badge is loaded but display is hidden
   * @param {string} address - Wallet address
   * @returns {boolean}
   */
  isBadgeLoadedButHidden(address) {
    return this.lastLoadedAddress === address && 
           this.badge !== null && 
           !this.badgeDisplayVisible;
  },
  
  /**
   * Reset all state (for wallet disconnect)
   */
  reset() {
    this.isLoading = false;
    this.isLoadingBalance = false;
    this.isLoadingBadge = false;
    this.isLoadingStats = false;
    this.walletAddress = null;
    this.balance = null;
    this.badge = null;
    this.lastLoadedAddress = null;
    this.badgeDisplayVisible = false;
    this.badgeModalVisible = false;
    this.dataLoaded = false;
    this.migrationCheckComplete = false;
    this.migrationModalClosed = true;
    this.skipUpgradeCheck = false;
  },
  
  /**
   * Set loading state
   * @param {boolean} loading - Whether loading is in progress
   */
  setLoading(loading) {
    this.isLoading = loading;
  },
  
  /**
   * Set balance loading state
   * @param {boolean} loading - Whether balance is loading
   */
  setLoadingBalance(loading) {
    this.isLoadingBalance = loading;
  },
  
  /**
   * Set badge loading state
   * @param {boolean} loading - Whether badge is loading
   */
  setLoadingBadge(loading) {
    this.isLoadingBadge = loading;
  },
  
  /**
   * Set stats loading state
   * @param {boolean} loading - Whether stats are loading
   */
  setLoadingStats(loading) {
    this.isLoadingStats = loading;
  },
  
  /**
   * Set wallet address
   * @param {string} address - Wallet address
   */
  setWalletAddress(address) {
    this.walletAddress = address;
  },
  
  /**
   * Set balance data
   * @param {Object} balance - Balance data
   */
  setBalance(balance) {
    this.balance = balance;
  },
  
  /**
   * Set badge data
   * @param {Object} badge - Badge data
   */
  setBadge(badge) {
    this.badge = badge;
    if (badge && this.walletAddress) {
      this.lastLoadedAddress = this.walletAddress;
    }
  },
  
  /**
   * Set badge display visibility
   * @param {boolean} visible - Whether badge display is visible
   */
  setBadgeDisplayVisible(visible) {
    this.badgeDisplayVisible = visible;
  },
  
  /**
   * Set badge modal visibility
   * @param {boolean} visible - Whether badge modal is visible
   */
  setBadgeModalVisible(visible) {
    this.badgeModalVisible = visible;
  },
  
  /**
   * Mark data as loaded (for readiness checks)
   */
  markDataLoaded() {
    this.dataLoaded = true;
    this.migrationCheckComplete = true;
    this.migrationModalClosed = true;
  },
  
  /**
   * Get readiness state (for backward compatibility)
   * @returns {Object}
   */
  getReadinessState() {
    return {
      dataLoaded: this.dataLoaded,
      migrationCheckComplete: this.migrationCheckComplete,
      migrationModalClosed: this.migrationModalClosed
    };
  }
};

// Expose to window for debugging
if (typeof window !== 'undefined') {
  window.GameDataState = GameDataState;
}

