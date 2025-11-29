// ==========================================
// GAME DATA FLOW CONTROLLER
// ==========================================
// Single entry point for loading game data (balance + badge)
// Replaces scattered checkMEWSBalanceAndUpdateUI and loadMenuBadgeDisplay logic

// Dependencies: GameDataState, LoadingManager must be loaded first

console.log('✅ [FLOW] GameDataFlow module loaded - NEW REFACTORED SYSTEM ACTIVE');

const GameDataFlow = {
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
        console.log(`⏭️ [FLOW] Duplicate wallet event detected (${timeSinceLastEvent}ms ago) - skipping:`, event);
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
   * Main entry point for loading game data
   * @param {string} walletAddress - Wallet address to load data for
   * @param {Object} options - Options { skipBalance: boolean, skipBadge: boolean }
   * @returns {Promise<void>}
   */
  async load(walletAddress, options = {}) {
    if (!walletAddress) {
      console.warn('⚠️ [FLOW] No wallet address provided');
      return;
    }
    
    // Check if there's already an active load for this address
    if (this._activeLoads.has(walletAddress)) {
      console.log('⏭️ [FLOW] Load already in progress for this address - waiting for existing load to complete');
      try {
        await this._activeLoads.get(walletAddress);
        console.log('✅ [FLOW] Existing load completed');
      } catch (error) {
        console.error('❌ [FLOW] Existing load failed:', error);
      }
      return;
    }
    
    console.log('🔄 [FLOW] ========== NEW SYSTEM: Loading game data ==========');
    console.log('🔄 [FLOW] Wallet address:', walletAddress);
    console.log('🔄 [FLOW] Options:', options);
    
    // Check if we can load
    if (!GameDataState.canLoad()) {
      console.log('⏳ [FLOW] Cannot load - waiting for conditions', {
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
      console.log('✅ [FLOW] Already loaded for this address');
      return; // No need to show loading modal
    }
    
    // Check if badge is loaded but display is hidden (e.g., after returning from game)
    // Do this BEFORE showing loading modal
    if (GameDataState.isBadgeLoadedButHidden(walletAddress)) {
      console.log('🔄 [FLOW] Badge loaded but display hidden - making visible');
      this.showBadgeDisplay();
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
    if (this.isBadgeModalVisible()) {
      console.log('⏳ [FLOW] Badge modal is visible - waiting for it to close before loading');
      return; // Don't show loading modal while badge modal is visible
    }
    
    // All checks passed - now show loading modal
    // This ensures we only show it when we actually need to load
    // The loading modal will stay visible during all async operations (balance check, badge fetch, etc.)
    LoadingManager.show('Loading game data... Please wait');
    
    // Create load promise and track it
    // The loading modal will remain visible throughout _performLoad() which contains all async operations
    const loadPromise = this._performLoad(walletAddress, options);
    this._activeLoads.set(walletAddress, loadPromise);
    
    try {
      // Await the load - loading modal stays visible during this entire async operation
      await loadPromise;
    } finally {
      // Remove from active loads when done
      this._activeLoads.delete(walletAddress);
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
      console.log('🔄 [FLOW] Wallet address changed - clearing previous badge display');
      const badgeDisplay = document.getElementById('menuBadgeDisplay');
      if (badgeDisplay) {
        badgeDisplay.style.display = 'none';
        badgeDisplay.innerHTML = ''; // Clear old badge HTML
      }
      GameDataState.setBadge(null);
      GameDataState.setBadgeDisplayVisible(false);
    }
    
    // Double-check for badge modals (should have been checked in load(), but safety check)
    if (this.isBadgeModalVisible()) {
      console.log('⏳ [FLOW] Badge modal is visible in _performLoad - hiding loading modal and returning');
      LoadingManager.hide(); // Hide loading modal that was shown in load()
      GameDataState.setLoading(false);
      return; // Don't load while badge modal is visible
    }
    
    try {
      // Loading modal should already be shown in load() before _performLoad is called
      // Only show it here if it's not already visible (safety check)
      if (!LoadingManager.isVisible) {
        console.log('⚠️ [FLOW] Loading modal not visible - showing it now (should have been shown in load())');
        LoadingManager.show('Loading game data... Please wait');
      }
      
      // ==========================================
      // ASYNC OPERATIONS START - Loading modal is visible
      // ==========================================
      // Load balance, badge, and stats in parallel
      // Loading modal stays visible throughout these async operations
      // LoadingManager.update() is called during these operations to update the message
      const results = await Promise.allSettled([
        options.skipBalance ? Promise.resolve(null) : this.loadBalance(walletAddress),
        options.skipBadge ? Promise.resolve(null) : this.loadBadge(walletAddress),
        this.loadStats(walletAddress) // Always load stats (no skip option)
      ]);
      // ==========================================
      // ASYNC OPERATIONS COMPLETE - Still processing results
      // ==========================================
      
      const balanceResult = results[0];
      const badgeResult = results[1];
      const statsResult = results[2];
      
      // Handle balance result
      if (balanceResult.status === 'fulfilled' && balanceResult.value) {
        GameDataState.setBalance(balanceResult.value);
        this.updateBalanceUI(balanceResult.value);
      } else if (balanceResult.status === 'rejected') {
        console.error('❌ [FLOW] Balance load failed:', balanceResult.reason);
      }
      
      // Handle badge result
      if (badgeResult.status === 'fulfilled' && badgeResult.value) {
        const badgeData = badgeResult.value;
        
        if (badgeData.success && badgeData.hasBadge && badgeData.badge) {
          // Player has a badge - check for pending upgrade first
          // This is an async operation - loading modal stays visible during check
          const upgradeHandled = await this.handlePendingUpgrade(walletAddress, badgeData);
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
          await this.displayBadge(badgeData);
        } else {
          // Player doesn't have a badge - check for migration
          // This is an async operation - loading modal stays visible during migration check
          await this.handleNoBadge(walletAddress);
          // handleNoBadge should have set all flags via markDataLoaded()
          // But ensure dataLoaded is true if migration check completed
          if (GameDataState.migrationCheckComplete && GameDataState.migrationModalClosed && !GameDataState.dataLoaded) {
            GameDataState.dataLoaded = true;
          }
        }
      } else if (badgeResult.status === 'rejected') {
        console.error('❌ [FLOW] Badge load failed:', badgeResult.reason);
        // Still mark as loaded to allow game to proceed
        GameDataState.markDataLoaded();
      }
      
      // Handle stats result (non-critical - don't block on failure)
      if (statsResult.status === 'fulfilled') {
        console.log('✅ [FLOW] Stats loaded successfully');
      } else if (statsResult.status === 'rejected') {
        console.warn('⚠️ [FLOW] Stats load failed (non-critical):', statsResult.reason);
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
      console.error('❌ [FLOW] Error loading game data:', error);
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
  },
  
  /**
   * Clear active loads (for cleanup/testing)
   */
  clearActiveLoads() {
    this._activeLoads.clear();
  },
  
  /**
   * Load balance for wallet address
   * @param {string} address - Wallet address
   * @returns {Promise<Object>}
   */
  async loadBalance(address) {
    if (!window.walletAPIInstance) {
      throw new Error('Wallet API not available');
    }
    
    GameDataState.setLoadingBalance(true);
    LoadingManager.update('Checking balance... Please wait');
    
    try {
      const result = await window.walletAPIInstance.checkMEWSBalance(address, 'mainnet');
      
      if (!result.success) {
        throw new Error(result.error || 'Balance check failed');
      }
      
      return result;
    } finally {
      GameDataState.setLoadingBalance(false);
    }
  },
  
  /**
   * Load game stats for wallet address
   * @param {string} address - Wallet address
   * @returns {Promise<void>}
   */
  async loadStats(address) {
    if (!address) {
      return;
    }
    
    GameDataState.setLoadingStats(true);
    LoadingManager.update('Loading game stats... Please wait');
    
    try {
      // Call updateMenuStats if available (from game-state-manager.js)
      if (typeof updateMenuStats === 'function') {
        await updateMenuStats();
      } else {
        console.warn('⚠️ [FLOW] updateMenuStats function not available');
      }
    } catch (error) {
      console.error('❌ [FLOW] Error loading stats:', error);
      // Don't throw - stats loading is non-critical
    } finally {
      GameDataState.setLoadingStats(false);
    }
  },
  
  /**
   * Load badge for wallet address
   * @param {string} address - Wallet address
   * @returns {Promise<Object>}
   */
  async loadBadge(address) {
    if (!window.BadgeService || !window.BadgeService.getBadge) {
      throw new Error('BadgeService not available');
    }
    
    // Check for badge modal
    if (this.isBadgeModalVisible()) {
      throw new Error('Badge modal is visible - cannot load badge');
    }
    
    GameDataState.setLoadingBadge(true);
    LoadingManager.update('Loading badge... Please wait');
    
    try {
      // Clear cache first
      if (window.BadgeService.clearBadgeCache) {
        window.BadgeService.clearBadgeCache();
      }
      
      const badgeData = await window.BadgeService.getBadge(address);
      return badgeData;
    } finally {
      GameDataState.setLoadingBadge(false);
    }
  },
  
  /**
   * Handle pending badge upgrade
   * @param {string} walletAddress - Wallet address
   * @param {Object} badgeData - Current badge data
   * @returns {Promise<boolean>} - True if upgrade modal was shown
   */
  async handlePendingUpgrade(walletAddress, badgeData) {
    // Skip upgrade check if flag is set (user just dismissed upgrade)
    if (GameDataState.shouldSkipUpgradeCheck()) {
      console.log('⏭️ [FLOW] Skipping upgrade check - user dismissed upgrade');
      GameDataState.setSkipUpgradeCheck(false); // Reset flag after use
      return false;
    }
    
    if (!window.BadgeService?.checkPendingUpgrade) {
      return false;
    }
    
    try {
      // Update loading message during upgrade check (data loading operation)
      LoadingManager.update('Checking for badge upgrade... Please wait');
      
      // This is a data loading operation - loading modal should be visible
      const upgradeCheck = await window.BadgeService.checkPendingUpgrade(walletAddress);
      
      if (upgradeCheck.success && upgradeCheck.hasPendingUpgrade && upgradeCheck.badgeId) {
        console.log('🎖️ [FLOW] Pending badge upgrade detected');
        
        LoadingManager.hide();
        
        const oldTier = badgeData.badge.tier;
        const newTier = upgradeCheck.newTier || oldTier + 1;
        const newTierName = window.BadgeService.getTierName(newTier);
        const sessionId = `upgrade_${walletAddress}_${Date.now()}`;
        
        // Show upgrade modal
        if (window.BadgeUI?.showTierUpgradeModal) {
          window.BadgeUI.showTierUpgradeModal({
            oldTier,
            newTier,
            newTierName,
            badgeId: upgradeCheck.badgeId,
            sessionId: sessionId,
          });
          return true; // Upgrade modal shown
        }
      }
    } catch (error) {
      console.error('❌ [FLOW] Error checking pending upgrade:', error);
    }
    
    return false; // No upgrade needed
  },
  
  /**
   * Handle case when player has no badge (check for migration)
   * @param {string} walletAddress - Wallet address
   */
  async handleNoBadge(walletAddress) {
    // Mark data as loaded first
    GameDataState.dataLoaded = true;
    
    // Check if we should check for migration
    const recentMintTime = window.BadgeService?._lastMintTime || 0;
    const timeSinceMint = Date.now() - recentMintTime;
    const shouldCheckMigration = timeSinceMint > 10000; // Wait 10 seconds after mint
    
    if (!shouldCheckMigration) {
      console.log('⏳ [FLOW] Recent badge mint detected, skipping migration check');
      GameDataState.markDataLoaded(); // Use markDataLoaded to set all flags properly
      // Clear badge display (no badge)
      const badgeDisplay = document.getElementById('menuBadgeDisplay');
      if (badgeDisplay) {
        badgeDisplay.style.display = 'none';
        badgeDisplay.innerHTML = ''; // Clear any old badge HTML
      }
      GameDataState.setBadge(null);
      GameDataState.setBadgeDisplayVisible(false);
      return;
    }
    
    if (!window.BadgeService?.checkBadgeMigration) {
      GameDataState.markDataLoaded(); // Use markDataLoaded to set all flags properly
      // Clear badge display (no badge)
      const badgeDisplay = document.getElementById('menuBadgeDisplay');
      if (badgeDisplay) {
        badgeDisplay.style.display = 'none';
        badgeDisplay.innerHTML = ''; // Clear any old badge HTML
      }
      GameDataState.setBadge(null);
      GameDataState.setBadgeDisplayVisible(false);
      return;
    }
    
    // Perform migration check (skip if user already dismissed migration modal)
    if (GameDataState.migrationCheckComplete && GameDataState.migrationModalClosed) {
      console.log('⏭️ [FLOW] Migration check already completed and dismissed - skipping');
      GameDataState.markDataLoaded(); // Use markDataLoaded to set all flags properly
      // Clear badge display (no badge)
      const badgeDisplay = document.getElementById('menuBadgeDisplay');
      if (badgeDisplay) {
        badgeDisplay.style.display = 'none';
        badgeDisplay.innerHTML = ''; // Clear any old badge HTML
      }
      GameDataState.setBadge(null);
      GameDataState.setBadgeDisplayVisible(false);
      return;
    }
    
    try {
      LoadingManager.update('Checking for badge migration... Please wait');
      
      const migrationCheckPromise = window.BadgeService.checkBadgeMigration(walletAddress);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Migration check timeout')), 10000)
      );
      
      const migrationCheck = await Promise.race([migrationCheckPromise, timeoutPromise]);
      
      GameDataState.migrationCheckComplete = true;
      
      if (migrationCheck.success && migrationCheck.needsMigration && migrationCheck.migrationData) {
        // Player needs to migrate
        console.log('🔄 [FLOW] Player needs to migrate badge');
        
        LoadingManager.hide();
        GameDataState.migrationModalClosed = false;
        
        // Show migration modal
        if (window.BadgeUI?.showBadgeMigrationModal) {
          let imageData = migrationCheck.migrationData.imageData;
          if (Array.isArray(imageData)) {
            imageData = new Uint8Array(imageData);
          }
          
          window.BadgeUI.showBadgeMigrationModal({
            oldBadgeId: migrationCheck.migrationData.oldBadgeId,
            oldTier: migrationCheck.migrationData.oldTier,
            oldGamesPlayed: migrationCheck.migrationData.oldGamesPlayed,
            oldMintDate: migrationCheck.migrationData.oldMintDate,
            imageData: imageData,
          });
        }
        
        // Hide badge display
        const badgeDisplay = document.getElementById('menuBadgeDisplay');
        if (badgeDisplay) {
          badgeDisplay.style.display = 'none';
        }
        
        return; // Don't mark as fully loaded - wait for migration
      } else {
        // No migration needed
        GameDataState.markDataLoaded(); // Use markDataLoaded to set all flags properly
        console.log('✅ [FLOW] Migration check complete - no migration needed');
      }
    } catch (error) {
      console.error('❌ [FLOW] Migration check error:', error);
      // Allow game to proceed (migration is optional)
      GameDataState.markDataLoaded(); // Use markDataLoaded to set all flags properly
    }
    
    // Clear badge display (no badge for this wallet)
    const badgeDisplay = document.getElementById('menuBadgeDisplay');
    if (badgeDisplay) {
      badgeDisplay.style.display = 'none';
      badgeDisplay.innerHTML = ''; // Clear any old badge HTML from previous wallet
    }
    
    // Clear badge from state
    GameDataState.setBadge(null);
    GameDataState.setBadgeDisplayVisible(false);
  },
  
  /**
   * Display badge in UI
   * @param {Object} badgeData - Badge data from BadgeService
   */
  async displayBadge(badgeData) {
    const badgeDisplay = document.getElementById('menuBadgeDisplay');
    if (!badgeDisplay) {
      console.warn('⚠️ [FLOW] Badge display container not found');
      return;
    }
    
    // Get wallet address for fetching registry games
    const walletAddress = GameDataState.walletAddress || (window.walletAPIInstance?.isConnected() ? window.walletAPIInstance.getAddress() : null);
    
    // Use BadgeUI.displayBadgeInUI if available
    if (window.BadgeUI?.displayBadgeInUI) {
      await window.BadgeUI.displayBadgeInUI(badgeDisplay, badgeData, walletAddress);
      badgeDisplay.style.display = 'block';
      void badgeDisplay.offsetHeight; // Force reflow
    } else {
      // Fallback: create custom display
      await this.createBadgeDisplay(badgeDisplay, badgeData);
    }
    
    GameDataState.setBadgeDisplayVisible(true);
    console.log('✅ [FLOW] Badge displayed');
  },
  
  /**
   * Fetch total games from statistics registry
   * @param {string} walletAddress - Wallet address
   * @returns {Promise<number>} Total games from registry
   */
  async fetchRegistryGames(walletAddress) {
    if (!walletAddress) {
      return 0;
    }
    
    try {
      const API_BASE_URL = window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3000/api';
      const response = await fetch(`${API_BASE_URL}/stats/${walletAddress}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.hasStats) {
          return data.totalGames || 0;
        }
      }
    } catch (error) {
      console.warn('⚠️ [FLOW] Error fetching registry games:', error);
    }
    
    return 0;
  },
  
  /**
   * Create badge display HTML (fallback)
   * @param {HTMLElement} badgeDisplay - Badge display container
   * @param {Object} badgeData - Badge data
   */
  async createBadgeDisplay(badgeDisplay, badgeData) {
    const { badge } = badgeData;
    const tierName = window.BadgeService.getTierName(badge.tier);
    const discounts = window.BadgeService.getDiscountsForTier(badge.tier);
    
    // Get image source
    let imageSrc = null;
    if (badge.imageUrl && (badge.imageUrl.startsWith('http://') || badge.imageUrl.startsWith('https://'))) {
      imageSrc = badge.imageUrl;
    } else {
      const tierNames = ['Standard', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
      const tierNameForUrl = tierNames[badge.tier] || 'Standard';
      const apiBaseUrl = window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3000/api';
      const baseUrl = apiBaseUrl.replace(/\/api$/, '');
      imageSrc = `${baseUrl}/Badges/${tierNameForUrl}.webp`;
    }
    
    const fallbackUrl = imageSrc;
    
    // Fetch total games from registry (source of truth)
    const walletAddress = GameDataState.walletAddress || (window.walletAPIInstance?.isConnected() ? window.walletAPIInstance.getAddress() : null);
    const totalGames = await this.fetchRegistryGames(walletAddress);
    
    const badgeHTML = `
      <div class="menu-badge-info">
        <h3>🎖️ Your ${tierName} Badge</h3>
        ${imageSrc ? `<img src="${imageSrc}" alt="Badge" class="menu-badge-image" onerror="this.onerror=null; this.src='${fallbackUrl}';" />` : '<div class="menu-badge-placeholder">🎖️</div>'}
        <div class="menu-badge-details">
          <p>Games Played: ${totalGames}</p>
          ${discounts.store > 0 ? `<p>Store: ${discounts.store}% off</p>` : ''}
          ${discounts.gameplay > 0 ? `<p>Gameplay: ${discounts.gameplay}% off</p>` : ''}
        </div>
      </div>
    `;
    
    badgeDisplay.innerHTML = badgeHTML;
    badgeDisplay.style.display = 'block';
    void badgeDisplay.offsetHeight; // Force reflow
  },
  
  /**
   * Update balance UI
   * @param {Object} balanceResult - Balance check result
   */
  updateBalanceUI(balanceResult) {
    if (typeof updateBalanceUI === 'function') {
      updateBalanceUI(balanceResult.formattedBalance, balanceResult.hasMinimumBalance);
    }
    if (typeof updateWalletRequirementsUI === 'function') {
      updateWalletRequirementsUI(true, balanceResult.hasMinimumBalance);
    }
  },
  
  /**
   * Show badge display (if already loaded)
   */
  showBadgeDisplay() {
    const badgeDisplay = document.getElementById('menuBadgeDisplay');
    if (badgeDisplay && badgeDisplay.innerHTML.trim() !== '') {
      badgeDisplay.style.display = 'block';
      GameDataState.setBadgeDisplayVisible(true);
    }
  },
  
  /**
   * Check if badge modal is visible
   * @returns {boolean}
   */
  isBadgeModalVisible() {
    const modals = ['badgeMintingModal', 'badgeMigrationModal', 'badgeUpgradeModal'];
    return modals.some(id => {
      const modal = document.getElementById(id);
      return modal && modal.classList.contains('badge-modal-visible');
    });
  },
  
  /**
   * Handle badge modal shown
   */
  onBadgeModalShown() {
    GameDataState.setBadgeModalVisible(true);
  },
  
  /**
   * Handle badge modal hidden
   */
  onBadgeModalHidden() {
    GameDataState.setBadgeModalVisible(false);
    
    // If migration modal was closed with "Maybe Later", don't reload
    // This prevents the migration check from running again
    if (GameDataState.migrationCheckComplete && GameDataState.migrationModalClosed) {
      console.log('⏭️ [FLOW] Migration modal was dismissed - skipping reload to prevent loop');
      return;
    }
    
    // If we have a wallet address, reload data after badge modal is fully closed
    // Use a longer delay to ensure badge modal is completely hidden before showing loading modal
    // Deduplication handled in load()
    if (GameDataState.walletAddress) {
      setTimeout(() => {
        // Double-check that badge modal is actually closed before loading
        if (!this.isBadgeModalVisible()) {
          console.log('✅ [FLOW] Badge modal closed - starting game data load');
          this.load(GameDataState.walletAddress).catch(err => {
            console.error('❌ [FLOW] Error reloading after badge modal hidden:', err);
          });
        } else {
          console.log('⏳ [FLOW] Badge modal still visible - skipping load');
        }
      }, 200); // Increased delay to ensure modal is fully closed
    }
  },
  
  /**
   * Handle wallet connected
   * @param {string} address - Wallet address
   */
  onWalletConnected(address) {
    // Check for duplicate events
    const event = { type: 'connected', address };
    if (!this._shouldProcessEvent(event)) {
      return; // Duplicate event, skip processing
    }
    
    console.log('🔄 [FLOW] Processing wallet connected event:', address);
    
    // Clear any active loads for other addresses
    if (this._activeLoads.size > 0) {
      console.log('🔄 [FLOW] Clearing active loads due to wallet change');
      this.clearActiveLoads();
    }
    
    // Clear previous state
    const badgeDisplay = document.getElementById('menuBadgeDisplay');
    if (badgeDisplay) {
      badgeDisplay.style.display = 'none';
      badgeDisplay.innerHTML = '';
    }
    
    GameDataState.reset();
    GameDataState.setWalletAddress(address);
    
    // Load game data (deduplication handled in load())
    this.load(address).catch(err => {
      console.error('❌ [FLOW] Error in onWalletConnected:', err);
    });
  },
  
  /**
   * Handle wallet disconnected
   */
  onWalletDisconnected() {
    // Check for duplicate events
    const event = { type: 'disconnected', address: null };
    if (!this._shouldProcessEvent(event)) {
      return; // Duplicate event, skip processing
    }
    
    console.log('🔄 [FLOW] Processing wallet disconnected event');
    
    // Clear any active loads
    this.clearActiveLoads();
    
    GameDataState.reset();
    LoadingManager.reset();
    
    const badgeDisplay = document.getElementById('menuBadgeDisplay');
    if (badgeDisplay) {
      badgeDisplay.style.display = 'none';
      badgeDisplay.innerHTML = '';
    }
    
    if (typeof disableStartGameButton === 'function') {
      disableStartGameButton();
    }
  },
  
  /**
   * Handle returning to menu from game
   */
  onReturnToMenu() {
    // If badge is already loaded, re-render it so registry games are fresh
    // This ensures the badge's "Games" count matches the main menu stats
    if (GameDataState.badge && GameDataState.walletAddress) {
      const badgeDisplay = document.getElementById('menuBadgeDisplay');
      if (badgeDisplay) {
        // Clear existing contents so we don't show stale game count
        badgeDisplay.innerHTML = '';
      }
      
      // Re-display badge using latest registry stats (async, no loading modal)
      this.displayBadge(GameDataState.badge).catch(err => {
        console.error('❌ [FLOW] Error re-displaying badge on return to menu:', err);
      });
      return;
    }
    
    // Otherwise, reload everything (deduplication handled in load())
    if (GameDataState.walletAddress) {
      this.load(GameDataState.walletAddress).catch(err => {
        console.error('❌ [FLOW] Error reloading on return to menu:', err);
      });
    }
  }
};

// Expose to window for debugging and integration
if (typeof window !== 'undefined') {
  window.GameDataFlow = GameDataFlow;
}

