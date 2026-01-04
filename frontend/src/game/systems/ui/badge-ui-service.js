// ==========================================
// BADGE UI SERVICE - State Management
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

log.info('BADGE UI SERVICE', 'Badge UI service module loaded');

const BadgeUIService = {
  // State
  _state: {
    // Modal visibility
    mintingModalVisible: false,
    upgradeModalVisible: false,
    migrationModalVisible: false,
    
    // Transaction state
    mintingInProgress: false,
    upgradingInProgress: false,
    migratingInProgress: false,
    
    // Last processed events (for deduplication)
    lastMintTime: null,
    lastUpgradeTime: null,
    lastMigrationTime: null
  },
  
  /**
   * Initialize the service
   */
  init() {
    // Service initialized
  },
  
  /**
   * Get current state
   */
  getState() {
    return this._state;
  },
  
  /**
   * Set modal visibility
   */
  setModalVisible(modalType, visible) {
    switch (modalType) {
      case 'minting':
        this._state.mintingModalVisible = visible;
        break;
      case 'upgrade':
        this._state.upgradeModalVisible = visible;
        break;
      case 'migration':
        this._state.migrationModalVisible = visible;
        break;
    }
  },
  
  /**
   * Set transaction in progress
   */
  setTransactionInProgress(transactionType, inProgress) {
    switch (transactionType) {
      case 'mint':
        this._state.mintingInProgress = inProgress;
        break;
      case 'upgrade':
        this._state.upgradingInProgress = inProgress;
        break;
      case 'migration':
        this._state.migratingInProgress = inProgress;
        break;
    }
  },
  
  /**
   * Check if transaction is in progress
   */
  isTransactionInProgress(transactionType) {
    switch (transactionType) {
      case 'mint':
        return this._state.mintingInProgress;
      case 'upgrade':
        return this._state.upgradingInProgress;
      case 'migration':
        return this._state.migratingInProgress;
      default:
        return false;
    }
  },
  
  /**
   * Set last transaction time (for preventing duplicate checks)
   */
  setLastTransactionTime(transactionType, time) {
    switch (transactionType) {
      case 'mint':
        this._state.lastMintTime = time;
        break;
      case 'upgrade':
        this._state.lastUpgradeTime = time;
        break;
      case 'migration':
        this._state.lastMigrationTime = time;
        break;
    }
  }
};

// Initialize on load
if (typeof window !== 'undefined') {
  BadgeUIService.init();
  window.BadgeUIService = BadgeUIService;
}

