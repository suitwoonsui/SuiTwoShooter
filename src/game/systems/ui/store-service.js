// ==========================================
// STORE SERVICE - Store Modal and Purchase Management
// ==========================================
// Handles store display, item selection, payment processing, and inventory management
// Follows the same pattern as MenuService, WalletService, and GameService

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

const StoreService = {
  // State
  _initialized: false,
  _isVisible: false,
  _clickOutsideHandler: null,
  
  // Store state
  _state: {
    selectedItems: {}, // Format: { itemId_level: quantity }
    paymentToken: 'mews', // 'mews', 'sui', or 'usdc'
    isLoading: false,
    tokenPrices: null,
    context: 'main-menu' // Store context: 'main-menu', 'credits-only', 'gamePass'
  },
  
  /**
   * Initialize the store service
   */
  init() {
    if (this._initialized) {
      log.warn('STORE SERVICE', 'Already initialized');
      return;
    }
    
    // Reset state
    this._state = {
      selectedItems: {},
      paymentToken: 'mews',
      isLoading: false,
      tokenPrices: null,
      context: 'main-menu'
    };
    
    this._initialized = true;
    log.debug('STORE SERVICE', 'Initialized');
  },
  
  /**
   * Get store state (for external access)
   */
  getState() {
    return { ...this._state };
  },
  
  /**
   * Get selected items
   */
  getSelectedItems() {
    return { ...this._state.selectedItems };
  },
  
  /**
   * Get payment token
   */
  getPaymentToken() {
    return this._state.paymentToken;
  },
  
  /**
   * Show store modal
   * Main entry point - checks wallet connection and badge upgrades
   * @param {string} context - Context for showing store ('main-menu' | 'gameplay-paywall' | 'gamePass')
   */
  async show(context = 'main-menu') {
    log.debug('STORE SERVICE', 'show() called');
    
    // Check if wallet is connected
    let walletAddress = null;
    if (typeof getWalletAddress === 'function') {
      walletAddress = getWalletAddress();
    } else if (window.walletAPIInstance && window.walletAPIInstance.isConnected()) {
      walletAddress = window.walletAPIInstance.getAddress();
    }
    
    if (!walletAddress) {
      // Show wallet connection modal
      if (typeof showStoreWalletConnectModal === 'function') {
        showStoreWalletConnectModal();
      }
      return;
    }
    
    // Check for pending badge upgrade BEFORE showing store
    if (window.BadgeService && window.BadgeService.checkPendingUpgrade) {
      const upgradeCheck = await window.BadgeService.checkPendingUpgrade(walletAddress);
      if (upgradeCheck.success && upgradeCheck.hasPendingUpgrade && upgradeCheck.badgeId) {
        log.debug('STORE SERVICE', 'Pending badge upgrade detected - showing upgrade modal first');
        
        // Get current badge to get old tier
        const badgeData = await window.BadgeService.getBadge(walletAddress);
        if (badgeData && badgeData.success && badgeData.hasBadge && badgeData.badge) {
          const oldTier = badgeData.badge.tier;
          const newTier = upgradeCheck.newTier || oldTier + 1;
          const newTierName = window.BadgeService.getTierName(newTier);
          
          // Generate session ID for upgrade transaction
          const sessionId = `upgrade_${walletAddress}_${Date.now()}`;
          
          // Show upgrade modal with callback to show store after upgrade
          if (window.BadgeUI && window.BadgeUI.showTierUpgradeModal) {
            window.BadgeUI.showTierUpgradeModal({
              oldTier,
              newTier,
              newTierName,
              badgeId: upgradeCheck.badgeId,
              sessionId: sessionId,
              onUpgradeComplete: async (upgraded) => {
                // After upgrade modal closes (whether upgraded or declined), show store
                if (upgraded) {
                  // Small delay to let badge cache clear
                  await new Promise(resolve => setTimeout(resolve, 500));
                }
                await this._showInternal(context);
              },
            });
            
            // Return early - store will be shown via callback
            return;
          }
        }
      }
    }
    
    // Wallet is connected, proceed to show store
    await this._showInternal(context);
  },
  
  /**
   * Internal function to show the store (after wallet is confirmed connected)
   * @private
   * @param {string} context - Context for showing store
   */
  async _showInternal(context = 'main-menu') {
    // Hide main menu
    if (typeof MenuService !== 'undefined' && MenuService.hide) {
      MenuService.hide();
    } else {
      // Fallback: manual hide
      const mainMenu = document.getElementById('mainMenuOverlay');
      if (mainMenu) {
        mainMenu.classList.add('main-menu-overlay-hidden');
        mainMenu.classList.remove('main-menu-overlay-visible');
      }
    }
    
    // Create store modal using dedicated store-modal class
    // Append to viewport-container like other panels (settings, instructions, leaderboard)
    const viewportContainer = document.querySelector('.viewport-container');
    if (!viewportContainer) {
      log.error('STORE SERVICE', 'Viewport container not found!');
      return;
    }
    
    // Check if store modal already exists
    let storeModal = document.getElementById('storeModal');
    if (storeModal) {
      // Check if items container is empty (modal was closed and items were removed)
      const itemsContainer = document.getElementById('storeItemsContainer');
      const hasItems = itemsContainer && itemsContainer.children.length > 0;
      
      // If items are missing, we need to fully reload the store
      if (!hasItems) {
        // Remove the existing modal and recreate it
        storeModal.remove();
        // Continue to create new modal below
      } else {
        // Modal already exists with items, just show it and refresh inventory
        storeModal.classList.add('store-modal-visible');
        storeModal.classList.remove('store-modal-hidden');
        
        // Setup click-outside handler for existing modal
        this._setupClickOutsideHandler(storeModal);
        
        // Show loading modal while refreshing
        if (typeof showLoadingModal === 'function') {
          showLoadingModal('Refreshing store... Please wait', 'storeLoadingModal');
        }
        // Wait for cards to exist, then load inventory and balance
        setTimeout(async () => {
          try {
            await this._loadInventoryDisplay();
            await this._updateBalance();
            await this._updateUI();
          } finally {
            // Hide loading modal when refresh is complete
            if (typeof hideLoadingModal === 'function') {
              hideLoadingModal('storeLoadingModal');
            }
          }
        }, 100);
        return;
      }
    }
    
    // Delegate to store-ui.js's showStoreInternal() to create the modal
    // This function handles all the complex HTML generation and loading
    if (typeof showStoreInternal === 'function') {
      await showStoreInternal(context);
      this._isVisible = true;
      return;
    }
    
    // Fallback: If showStoreInternal is not available, show error
    log.error('STORE SERVICE', 'showStoreInternal() not available');
    if (typeof hideLoadingModal === 'function') {
      hideLoadingModal('storeLoadingModal');
    }
  },
  
  /**
   * Hide store modal
   */
  hide() {
    const storeModal = document.getElementById('storeModal');
    if (storeModal) {
      storeModal.classList.remove('store-modal-visible');
      storeModal.classList.add('store-modal-hidden');
      // Remove from DOM after animation
      setTimeout(() => {
        storeModal.remove();
      }, 300);
    }
    
    // Remove click-outside handler
    if (this._clickOutsideHandler) {
      document.removeEventListener('click', this._clickOutsideHandler);
      this._clickOutsideHandler = null;
    }
    
    // Check context - don't show main menu if in credits-only mode (from End Demo modal)
    const context = this._state.context || 'main-menu';
    
    if (context !== 'credits-only') {
      // Show main menu again after closing store (only if not in credits-only mode)
      if (typeof MenuService !== 'undefined' && MenuService.show) {
        MenuService.show();
      } else {
        // Fallback: manual show
        const mainMenu = document.getElementById('mainMenuOverlay');
        if (mainMenu) {
          mainMenu.classList.add('main-menu-overlay-visible');
          mainMenu.classList.remove('main-menu-overlay-hidden');
        }
      }
    } else {
      // In credits-only mode, don't show main menu - stay in game
      // The End Demo modal should handle showing itself again if needed
      log.debug('STORE SERVICE', 'Store closed in credits-only mode - staying in game');
    }
    
    this._isVisible = false;
  },
  
  /**
   * Setup click-outside handler for store modal
   * @private
   */
  _setupClickOutsideHandler(storeModal) {
    // Remove any existing handler first
    if (this._clickOutsideHandler) {
      document.removeEventListener('click', this._clickOutsideHandler);
    }
    
    const handleClickOutside = (event) => {
      // Only process if store modal is actually visible
      if (!storeModal.classList.contains('store-modal-visible')) {
        return; // Modal is not visible, ignore this event
      }
      
      // Don't close if clicking on clear button (X button on items)
      if (event.target.classList.contains('level-clear-btn') || 
          event.target.closest('.level-clear-btn')) {
        return; // Ignore clicks on clear buttons
      }
      
      // Don't close if clicking on selected items (they have click handlers to reduce quantity)
      if (event.target.classList.contains('selected-item') || 
          event.target.closest('.selected-item')) {
        return; // Ignore clicks on selected items
      }
      
      // Don't close if clicking on quantity decrease button
      if (event.target.classList.contains('quantity-decrease') ||
          event.target.closest('.quantity-decrease')) {
        // Ignore clicks on quantity decrease buttons
        return; // Ignore clicks on quantity decrease buttons
      }
      
      // Don't close if clicking on insufficient balance modal
      if (event.target.closest('#insufficientBalanceModal') ||
          event.target.closest('.store-balance-error-modal')) {
        // Ignore clicks on insufficient balance modal
        return; // Ignore clicks on insufficient balance modal
      }
      
      // Check if click is outside the modal
      if (!storeModal.contains(event.target)) {
        log.debug('STORE SERVICE', 'Click was outside store modal - closing');
        this.hide();
      }
    };
    
    this._clickOutsideHandler = handleClickOutside;
    
    // Use setTimeout to avoid immediate firing
    setTimeout(() => {
      log.debug('STORE SERVICE', 'Adding click outside listener');
      document.addEventListener('click', handleClickOutside);
    }, 0);
  },
  
  /**
   * Set payment token (mews, sui, or usdc)
   */
  async setPaymentToken(token) {
    if (token !== 'mews' && token !== 'sui' && token !== 'usdc') {
      log.warn('STORE SERVICE', 'Invalid payment token', token);
      return;
    }
    
    log.debug('STORE SERVICE', 'Switching payment token', token);
    this._state.paymentToken = token;
    
    // Update button states
    const mewsBtn = document.getElementById('paymentTokenMews');
    const suiBtn = document.getElementById('paymentTokenSui');
    const usdcBtn = document.getElementById('paymentTokenUsdc');
    
    if (mewsBtn && suiBtn && usdcBtn) {
      // Remove active class from all buttons
      mewsBtn.classList.remove('active');
      suiBtn.classList.remove('active');
      usdcBtn.classList.remove('active');
      
      // Add active class to selected button
      if (token === 'mews') {
        mewsBtn.classList.add('active');
      } else if (token === 'sui') {
        suiBtn.classList.add('active');
      } else if (token === 'usdc') {
        usdcBtn.classList.add('active');
      }
    }
    
    // Update prices in existing item cards without reloading
    await this._updateItemPrices();
    
    // Also update the selected items summary
    await this._updateUI();
    
    // Update balance display for selected token
    await this._updateBalance();
    
    // Re-render active tab if it's Game Pass or Tournament Tickets
    await this._refreshActiveTab(token);
  },
  
  /**
   * Refresh the currently active tab when payment token changes
   * @private
   */
  async _refreshActiveTab(paymentToken) {
    // Check which tab is currently active
    const itemsTab = document.getElementById('storeTabContentItems');
    const gamePassTab = document.getElementById('storeTabContentGamePass');
    const ticketsTab = document.getElementById('storeTabContentTickets');
    const inventoryTab = document.getElementById('storeTabContentInventory');
    
    let activeTab = null;
    if (itemsTab && itemsTab.classList.contains('active')) {
      activeTab = 'items';
    } else if (gamePassTab && gamePassTab.classList.contains('active')) {
      activeTab = 'gamePass';
    } else if (ticketsTab && ticketsTab.classList.contains('active')) {
      activeTab = 'tickets';
    } else if (inventoryTab && inventoryTab.classList.contains('active')) {
      activeTab = 'inventory';
    }
    
    // Refresh tabs that need re-rendering (Items tab updates via updateItemPrices)
    if (activeTab === 'gamePass' || activeTab === 'tickets' || activeTab === 'inventory') {
      log.debug('STORE SERVICE', `Refreshing ${activeTab} tab after payment token change`);
      if (typeof switchStoreTab === 'function') {
        // Re-render the active tab with new payment token
        await switchStoreTab(activeTab);
      }
    }
  },
  
  /**
   * Add item to selection
   */
  async addItemToSelection(itemId, level) {
    const key = this._getItemKey(itemId, level);
    const currentQuantity = this._state.selectedItems[key] || 0;
    this._state.selectedItems[key] = currentQuantity + 1;
    await this._updateUI();
  },
  
  /**
   * Remove item from selection
   * @param {string} itemId - Item ID
   * @param {number} level - Item level
   * @param {Event} event - Click event (optional, used to stop propagation)
   */
  async removeItemFromSelection(itemId, level, event) {
    // Stop event propagation to prevent click-outside handler from closing the store
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    
    const key = this._getItemKey(itemId, level);
    const currentQuantity = this._state.selectedItems[key] || 0;
    if (currentQuantity > 0) {
      this._state.selectedItems[key] = currentQuantity - 1;
      if (this._state.selectedItems[key] === 0) {
        delete this._state.selectedItems[key];
      }
      await this._updateUI();
    }
  },
  
  /**
   * Set item quantity
   */
  async setItemQuantity(itemId, level, quantity) {
    const key = this._getItemKey(itemId, level);
    if (quantity <= 0) {
      delete this._state.selectedItems[key];
    } else {
      this._state.selectedItems[key] = quantity;
    }
    await this._updateUI();
  },
  
  /**
   * Clear level selection (remove all of a specific item/level)
   */
  clearLevelSelection(itemId, level, event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    const key = this._getItemKey(itemId, level);
    delete this._state.selectedItems[key];
    this._updateUI();
  },
  
  /**
   * Clear all selections
   */
  clearStoreSelection() {
    this._state.selectedItems = {};
    this._updateUI();
  },
  
  /**
   * Get item quantity
   */
  getItemQuantity(itemId, level) {
    const key = this._getItemKey(itemId, level);
    return this._state.selectedItems[key] || 0;
  },
  
  /**
   * Get item key (itemId_level format)
   * @private
   */
  _getItemKey(itemId, level) {
    return `${itemId}_${level}`;
  },
  
  /**
   * Delegate methods to store-ui.js functions (these are complex and stay in store-ui.js)
   * These will be called from store-ui.js but can access StoreService state
   */
  
  // Load store items - delegates to store-ui.js
  async _loadStoreItems() {
    if (typeof loadStoreItems === 'function') {
      await loadStoreItems();
    }
  },
  
  // Load inventory display - delegates to store-ui.js
  async _loadInventoryDisplay() {
    if (typeof loadInventoryDisplay === 'function') {
      await loadInventoryDisplay();
    }
  },
  
  // Update balance - delegates to store-ui.js
  async _updateBalance() {
    if (typeof updateStoreBalance === 'function') {
      await updateStoreBalance();
    }
  },
  
  // Update UI - delegates to store-ui.js
  async _updateUI() {
    if (typeof updateStoreUI === 'function') {
      await updateStoreUI();
    }
  },
  
  // Update item prices - delegates to store-ui.js
  async _updateItemPrices() {
    if (typeof updateItemPrices === 'function') {
      await updateItemPrices();
    }
  },
  
  // Load badge display - delegates to store-ui.js
  async _loadBadgeDisplay() {
    if (typeof loadStoreBadgeDisplay === 'function') {
      await loadStoreBadgeDisplay();
    }
  },
  
};

// Expose globally
if (typeof window !== 'undefined') {
  window.StoreService = StoreService;
}

// Initialize on load
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      StoreService.init();
    });
  } else {
    StoreService.init();
  }
}

