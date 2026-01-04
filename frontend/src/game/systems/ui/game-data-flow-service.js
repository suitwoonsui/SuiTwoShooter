// ==========================================
// GAME DATA FLOW SERVICE - State Management and Main Coordination
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

const GameDataFlowService = {
  // Track in-flight loads to prevent duplicates
  _activeLoads: new Map(), // Map<address, Promise>
  
  // Track last processed wallet event to prevent duplicate processing
  _lastProcessedEvent: null, // { type, address, timestamp }
  _eventDebounceMs: 500, // Ignore duplicate events within 500ms
  
  /**
   * Check if we should process this wallet event (deduplication)
   * @private
   */
  _shouldProcessEvent(event) {
    const now = Date.now();
    const eventKey = `${event.type}_${event.address || 'null'}`;
    
    if (this._lastProcessedEvent) {
      const lastKey = `${this._lastProcessedEvent.type}_${this._lastProcessedEvent.address || 'null'}`;
      const timeSinceLastEvent = now - this._lastProcessedEvent.timestamp;
      
      // If same event within debounce window, skip it
      if (eventKey === lastKey && timeSinceLastEvent < this._eventDebounceMs) {
        log.debug('FLOW SERVICE', `Duplicate wallet event detected (${timeSinceLastEvent}ms ago) - skipping`, event);
        return false;
      }
    }
    
    // Record this event
    this._lastProcessedEvent = {
      type: event.type,
      address: event.address,
      timestamp: now
    };
    
    return true;
  },
  
  /**
   * Clear active loads (for cleanup/testing)
   */
  clearActiveLoads() {
    this._activeLoads.clear();
  },
  
  /**
   * Check if there's an active load for an address
   */
  hasActiveLoad(address) {
    return this._activeLoads.has(address);
  },
  
  /**
   * Get active load promise for an address
   */
  getActiveLoad(address) {
    return this._activeLoads.get(address);
  },
  
  /**
   * Set active load promise for an address
   */
  setActiveLoad(address, promise) {
    this._activeLoads.set(address, promise);
  },
  
  /**
   * Remove active load for an address
   */
  removeActiveLoad(address) {
    this._activeLoads.delete(address);
  },
  
  /**
   * Main entry point for loading game data
   * @param {string} walletAddress - Wallet address to load data for
   * @param {Object} options - Options { skipBalance: boolean, skipBadge: boolean }
   * @returns {Promise<void>}
   */
  async load(walletAddress, options = {}) {
    if (!walletAddress) {
      log.warn('FLOW SERVICE', 'No wallet address provided');
      return;
    }
    
    // Check if there's already an active load for this address
    if (this.hasActiveLoad(walletAddress)) {
      log.debug('FLOW SERVICE', 'Load already in progress for this address - waiting for existing load to complete');
      try {
        await this.getActiveLoad(walletAddress);
        log.debug('FLOW SERVICE', 'Existing load completed');
      } catch (error) {
        log.error('FLOW SERVICE', 'Existing load failed', error);
      }
      return;
    }
    
    log.debug('FLOW SERVICE', 'Loading game data', { walletAddress, options });
    
    // Check if we can load
    if (!GameDataState.canLoad()) {
      log.debug('FLOW SERVICE', 'Cannot load - waiting for conditions', {
        isLoading: GameDataState.isLoading,
        badgeModalVisible: GameDataState.badgeModalVisible,
        walletAddress: GameDataState.walletAddress
      });
      // If badge modal is visible, don't show loading modal - wait for modal to close
      // If already loading, don't show another loading modal
      return;
    }
    
    // Check if already loaded for this address (BEFORE showing loading modal)
    if (GameDataState.isLoadedForAddress(walletAddress)) {
      log.debug('FLOW SERVICE', 'Already loaded for this address');
      return; // No need to show loading modal
    }
    
    // Check if badge is loaded but display is hidden (e.g., after returning from game)
    // Do this BEFORE showing loading modal
    if (GameDataState.isBadgeLoadedButHidden(walletAddress)) {
      log.debug('FLOW SERVICE', 'Badge loaded but display hidden - making visible');
      if (typeof window.showBadgeDisplay === 'function') {
        window.showBadgeDisplay();
      }
      GameDataState.markDataLoaded();
      
      // Sync readiness state to local gameReadinessState (for backward compatibility)
      if (typeof gameReadinessState !== 'undefined') {
        const readiness = GameDataState.getReadinessState();
        gameReadinessState.dataLoaded = readiness.dataLoaded;
        gameReadinessState.migrationCheckComplete = readiness.migrationCheckComplete;
        gameReadinessState.migrationModalClosed = readiness.migrationModalClosed;
      }
      
      if (typeof updateGameReadiness === 'function') {
        updateGameReadiness();
      }
      return; // No need to show loading modal
    }
    
    // Check for badge modals BEFORE showing loading modal
    if (typeof window.isBadgeModalVisible === 'function' && window.isBadgeModalVisible()) {
      log.debug('FLOW SERVICE', 'Badge modal is visible - waiting for it to close before loading');
      return; // Don't show loading modal while badge modal is visible
    }
    
    // All checks passed - now show loading modal
    // This ensures we only show it when we actually need to load
    // The loading modal will stay visible during all async operations (balance check, badge fetch, etc.)
    LoadingManager.show('Loading game data... Please wait');
    
    // Create load promise and track it
    // The loading modal will remain visible throughout _performLoad() which contains all async operations
    const loadPromise = this._performLoad(walletAddress, options);
    this.setActiveLoad(walletAddress, loadPromise);
    
    try {
      // Await the load - loading modal stays visible during this entire async operation
      await loadPromise;
    } finally {
      // Remove from active loads when done
      this.removeActiveLoad(walletAddress);
    }
  },
  
  /**
   * Internal method to perform the actual load
   * @private
   */
  async _performLoad(walletAddress, options) {
    // Set loading state
    GameDataState.setLoading(true);
    GameDataState.setWalletAddress(walletAddress);
    
    // Clear badge display if wallet address changed (wallet switch)
    if (GameDataState.lastLoadedAddress && GameDataState.lastLoadedAddress !== walletAddress) {
      log.debug('FLOW SERVICE', 'Wallet address changed - clearing previous badge display');
      const badgeDisplay = document.getElementById('menuBadgeDisplay');
      if (badgeDisplay) {
        badgeDisplay.style.display = 'none';
        badgeDisplay.innerHTML = ''; // Clear old badge HTML
      }
      GameDataState.setBadge(null);
      GameDataState.setBadgeDisplayVisible(false);
    }
    
    // Double-check for badge modals (should have been checked in load(), but safety check)
    if (typeof window.isBadgeModalVisible === 'function' && window.isBadgeModalVisible()) {
      log.debug('FLOW SERVICE', 'Badge modal is visible in _performLoad - hiding loading modal and returning');
      LoadingManager.hide(); // Hide loading modal that was shown in load()
      GameDataState.setLoading(false);
      return; // Don't load while badge modal is visible
    }
    
    try {
      // Loading modal should already be shown in load() before _performLoad is called
      // Only show it here if it's not already visible (safety check)
      if (!LoadingManager.isVisible) {
        log.warn('FLOW SERVICE', 'Loading modal not visible - showing it now (should have been shown in load())');
        LoadingManager.show('Loading game data... Please wait');
      }
      
      // ==========================================
      // ASYNC OPERATIONS START - Loading modal is visible
      // ==========================================
      // Load balance, badge, stats, and game pass credits in parallel
      // Loading modal stays visible throughout these async operations
      // LoadingManager.update() is called during these operations to update the message
      const results = await Promise.allSettled([
        options.skipBalance ? Promise.resolve(null) : (typeof window.loadBalance === 'function' ? window.loadBalance(walletAddress) : Promise.resolve(null)),
        options.skipBadge ? Promise.resolve(null) : (typeof window.loadBadge === 'function' ? window.loadBadge(walletAddress) : Promise.resolve(null)),
        typeof window.loadStats === 'function' ? window.loadStats(walletAddress) : Promise.resolve(null), // Always load stats (no skip option)
        // Load game pass credits
        (window.GamePassDisplay && typeof window.GamePassDisplay.refresh === 'function') 
          ? window.GamePassDisplay.refresh(walletAddress, true, false).catch(err => {
              log.warn('FLOW SERVICE', 'Game pass credits load failed (non-critical)', err);
              return null;
            })
          : Promise.resolve(null)
      ]);
      // ==========================================
      // ASYNC OPERATIONS COMPLETE - Still processing results
      // ==========================================
      
      const balanceResult = results[0];
      const badgeResult = results[1];
      const statsResult = results[2];
      const gamePassResult = results[3];
      
      // Handle balance result
      if (balanceResult.status === 'fulfilled' && balanceResult.value) {
        GameDataState.setBalance(balanceResult.value);
        if (typeof window.updateBalanceUIFromFlow === 'function') {
          window.updateBalanceUIFromFlow(balanceResult.value);
        }
      } else if (balanceResult.status === 'rejected') {
        log.error('FLOW SERVICE', 'Balance load failed', balanceResult.reason);
      }
      
      // Handle badge result
      if (badgeResult.status === 'fulfilled' && badgeResult.value) {
        const badgeData = badgeResult.value;
        
        if (badgeData.success && badgeData.hasBadge && badgeData.badge) {
          // Player has a badge - check for pending upgrade first
          // This is an async operation - loading modal stays visible during check
          const upgradeHandled = typeof window.handlePendingUpgrade === 'function'
            ? await window.handlePendingUpgrade(walletAddress, badgeData)
            : false;
          if (upgradeHandled) {
            // Upgrade modal was shown, don't display badge yet
            // Don't mark as loaded - wait for upgrade to complete
            // Loading modal is hidden by handlePendingUpgrade when upgrade modal is shown
            GameDataState.setLoading(false);
            return;
          }
          
          // No upgrade needed, display badge
          GameDataState.setBadge(badgeData);
          GameDataState.markDataLoaded();
          if (typeof window.displayBadge === 'function') {
            await window.displayBadge(badgeData);
          }
        } else {
          // Player doesn't have a badge - check for migration
          // This is an async operation - loading modal stays visible during migration check
          if (typeof window.handleNoBadge === 'function') {
            await window.handleNoBadge(walletAddress);
          }
          // handleNoBadge should have set all flags via markDataLoaded()
          // But ensure dataLoaded is true if migration check completed
          if (GameDataState.migrationCheckComplete && GameDataState.migrationModalClosed && !GameDataState.dataLoaded) {
            GameDataState.dataLoaded = true;
          }
        }
      } else if (badgeResult.status === 'rejected') {
        log.error('FLOW SERVICE', 'Badge load failed', badgeResult.reason);
        // Still mark as loaded to allow game to proceed
        GameDataState.markDataLoaded();
      }
      
      // Handle stats result (non-critical - don't block on failure)
      if (statsResult.status === 'fulfilled') {
        log.debug('FLOW SERVICE', 'Stats loaded successfully');
      } else if (statsResult.status === 'rejected') {
        log.warn('FLOW SERVICE', 'Stats load failed (non-critical)', statsResult.reason);
      }
      
      // Handle game pass credits result (non-critical - don't block on failure)
      if (gamePassResult.status === 'fulfilled') {
        log.debug('FLOW SERVICE', 'Game pass credits loaded successfully');
      } else if (gamePassResult.status === 'rejected') {
        log.warn('FLOW SERVICE', 'Game pass credits load failed (non-critical)', gamePassResult.reason);
      }
      
      // ==========================================
      // ALL ASYNC OPERATIONS COMPLETE
      // ==========================================
      // Sync readiness state to local gameReadinessState (for backward compatibility)
      if (typeof gameReadinessState !== 'undefined') {
        const readiness = GameDataState.getReadinessState();
        gameReadinessState.dataLoaded = readiness.dataLoaded;
        gameReadinessState.migrationCheckComplete = readiness.migrationCheckComplete;
        gameReadinessState.migrationModalClosed = readiness.migrationModalClosed;
      }
      
      // Hide loading modal AFTER all async operations complete
      // Small delay to ensure badge is rendered before hiding loading modal
      await new Promise(resolve => setTimeout(resolve, 100));
      LoadingManager.hide();
      
      // Update readiness AFTER loading modal is hidden
      // This ensures buttons are enabled only after loading is complete and modal is hidden
      if (typeof updateGameReadiness === 'function') {
        updateGameReadiness();
      }
      
    } catch (error) {
      log.error('FLOW SERVICE', 'Error loading game data', error);
      // Hide loading modal on error
      LoadingManager.hide();
      // Still sync state and update readiness even on error (so buttons can be disabled)
      if (typeof gameReadinessState !== 'undefined') {
        const readiness = GameDataState.getReadinessState();
        gameReadinessState.dataLoaded = readiness.dataLoaded;
        gameReadinessState.migrationCheckComplete = readiness.migrationCheckComplete;
        gameReadinessState.migrationModalClosed = readiness.migrationModalClosed;
      }
      if (typeof updateGameReadiness === 'function') {
        updateGameReadiness();
      }
      throw error;
    } finally {
      GameDataState.setLoading(false);
      // Ensure loading modal is hidden even if there was an early return
      // (e.g., upgrade modal shown, badge modal visible, etc.)
      if (LoadingManager.isVisible) {
        LoadingManager.hide();
      }
    }
  }
};

// Expose globally
if (typeof window !== 'undefined') {
  window.GameDataFlowService = GameDataFlowService;
}

