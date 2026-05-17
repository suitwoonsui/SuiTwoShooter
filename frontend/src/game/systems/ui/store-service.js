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

/** @param {string} ctx */
function _storeServiceIsPrepLoadout(ctx) {
  return typeof window !== 'undefined' && typeof window.isPrepLoadoutStoreContext === 'function'
    ? window.isPrepLoadoutStoreContext(ctx)
    : ctx === 'tournament-entry' || ctx === 'regular-entry';
}

const StoreService = {
  // State
  _initialized: false,
  _isVisible: false,
  _clickOutsideHandler: null,
  
  // Store state
  _state: {
    selectedOffers: {}, // Preferred: { offerId: quantity }
    paymentToken: 'mews', // 'mews', 'sui', or 'usdc'
    isLoading: false,
    tokenPrices: null,
    tokenPricesTimestamp: null,
    storeItems: null, // Items from backend (has correct USD prices)
    storeOffers: null, // Offers map from backend (Stockroom offerId -> offer data)
    context: 'main-menu' // 'main-menu' | 'regular-entry' | 'tournament-entry' | 'credits-only' | …
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
      selectedOffers: {},
      paymentToken: 'mews',
      isLoading: false,
      tokenPrices: null,
      tokenPricesTimestamp: null,
      storeItems: null, // Items from backend (has correct USD prices)
      storeOffers: null,
      context: 'main-menu'
    };
    
    this._initialized = true;
    log.debug('STORE SERVICE', 'Initialized');
  },
  
  /**
   * Get store state (for external access)
   */
  getState() {
    // MVP: return the live mutable state reference so UI modules can update it.
    // (Some modules intentionally mutate state via getStoreState()/updateStoreStateReference().)
    return this._state;
  },
  
  /**
   * Get selected offers
   */
  getSelectedOffers() {
    return { ...this._state.selectedOffers };
  },
  
  /**
   * Get payment token
   */
  getPaymentToken() {
    return this._state.paymentToken;
  },
  
  /**
   * Show store modal
   * Main entry point - checks wallet connection
   * Pending badge upgrades are handled only during main-menu data load (bootstrap / after game), not from the store.
   * @param {string} context - Context for showing store ('main-menu' | 'gameplay-paywall' | 'gamePass')
   * @param {boolean} [_skipUpgradeCheck] - Deprecated, ignored (kept for call-site compatibility)
   */
  async show(context = 'main-menu', _skipUpgradeCheck = false) {
    log.debug('STORE SERVICE', 'show() called', { context });
    this._state.context = context;
    
    // Check if wallet is connected
    let walletAddress = null;
    if (typeof getWalletAddress === 'function') {
      walletAddress = getWalletAddress();
    } else if (window.walletAPIInstance && window.walletAPIInstance.isConnected()) {
      walletAddress = window.walletAPIInstance.getAddress();
    }
    
    if (!walletAddress) {
      // showStore() shows MenuPanelLoading first; dismiss it when we only open the wallet gate
      if (typeof MenuPanelLoading !== 'undefined' && MenuPanelLoading.hide) {
        MenuPanelLoading.hide();
      }
      if (typeof showStoreWalletConnectModal === 'function') {
        showStoreWalletConnectModal();
      }
      return;
    }
    
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
        if (typeof MenuPanelLoading !== 'undefined' && MenuPanelLoading.show) {
          MenuPanelLoading.show('Refreshing store... Please wait');
        }
        // Wait for cards to exist, then load inventory and balance
        setTimeout(async () => {
          try {
            if (typeof window.applyStoreContextChrome === 'function') {
              window.applyStoreContextChrome(context);
            }
            if (
              (context === 'tournament-entry' || context === 'regular-entry') &&
              typeof window.switchStoreTab === 'function'
            ) {
              await window.switchStoreTab('inventory');
            }
            if (typeof window.updateStoreButtons === 'function') {
              window.updateStoreButtons('inventory', context);
            }
            await this._loadInventoryDisplay();
            await this._updateBalance();
            await this._updateUI();
          } finally {
            // Hide loading modal when refresh is complete
            if (typeof MenuPanelLoading !== 'undefined' && MenuPanelLoading.hide) {
              MenuPanelLoading.hide();
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
    if (typeof MenuPanelLoading !== 'undefined' && MenuPanelLoading.hide) {
      MenuPanelLoading.hide();
    }
  },
  
  /**
   * Hide store modal
   * @param {{ returnToTournaments?: boolean; skipMainMenuReveal?: boolean }} [options]
   */
  hide(options = {}) {
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
    
    const context = this._state.context || 'main-menu';
    this._state.context = 'main-menu';
    this._isVisible = false;

    if (options.returnToTournaments) {
      if (typeof showTournaments === 'function') {
        showTournaments();
      } else if (typeof window.showTournaments === 'function') {
        window.showTournaments();
      }
      return;
    }

    if (options.skipMainMenuReveal) {
      return;
    }

    // Check context - don't show main menu if in credits-only mode (from End Demo modal)
    if (context !== 'credits-only') {
      // Show main menu again after closing store (only if not in credits-only mode)
      if (typeof MenuService !== 'undefined' && MenuService.show) {
        MenuService.show({ fromMenuPanel: true });
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
        const ctx = this._state.context || 'main-menu';
        if (ctx === 'credits-only' || _storeServiceIsPrepLoadout(ctx)) {
          log.debug('STORE SERVICE', 'Click outside ignored (credits-only or prep loadout)');
          return;
        }
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
    const bundlesTab = document.getElementById('storeTabContentBundles');
    const gamePassTab = document.getElementById('storeTabContentGamePass');
    const ticketsTab = document.getElementById('storeTabContentTickets');
    const inventoryTab = document.getElementById('storeTabContentInventory');
    
    let activeTab = null;
    if (itemsTab && itemsTab.classList.contains('active')) {
      activeTab = 'items';
    } else if (bundlesTab && bundlesTab.classList.contains('active')) {
      activeTab = 'bundles';
    } else if (gamePassTab && gamePassTab.classList.contains('active')) {
      activeTab = 'gamePass';
    } else if (ticketsTab && ticketsTab.classList.contains('active')) {
      activeTab = 'tickets';
    } else if (inventoryTab && inventoryTab.classList.contains('active')) {
      activeTab = 'inventory';
    }
    
    // Refresh tabs that need re-rendering (Items tab updates via updateItemPrices)
    if (activeTab === 'bundles' || activeTab === 'gamePass' || activeTab === 'tickets' || activeTab === 'inventory') {
      log.debug('STORE SERVICE', `Refreshing ${activeTab} tab after payment token change`);
      if (typeof switchStoreTab === 'function') {
        // Re-render the active tab with new payment token
        await switchStoreTab(activeTab);
      }
    }
  },
  
  /**
   * Add offer to selection
   */
  async addOfferToSelection(offerId) {
    const id = String(offerId || '').trim();
    if (!id) return;
    const currentQuantity = this._state.selectedOffers[id] || 0;
    this._state.selectedOffers[id] = currentQuantity + 1;
    await this._updateUI();
  },
  
  /**
   * Remove offer from selection
   * @param {Event} event - Click event (optional, used to stop propagation)
   */
  async removeOfferFromSelection(offerId, event) {
    // Stop event propagation to prevent click-outside handler from closing the store
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    
    const id = String(offerId || '').trim();
    const currentQuantity = this._state.selectedOffers[id] || 0;
    if (currentQuantity > 0) {
      this._state.selectedOffers[id] = currentQuantity - 1;
      if (this._state.selectedOffers[id] === 0) {
        delete this._state.selectedOffers[id];
      }
      await this._updateUI();
    }
  },
  
  /**
   * Set offer quantity
   */
  async setOfferQuantity(offerId, quantity) {
    const key = String(offerId || '').trim();
    if (quantity <= 0) {
      delete this._state.selectedOffers[key];
    } else {
      this._state.selectedOffers[key] = quantity;
    }
    await this._updateUI();
  },
  
  /**
   * Clear selection for an offer (remove all quantity)
   */
  clearOfferSelection(offerId, event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    const key = String(offerId || '').trim();
    delete this._state.selectedOffers[key];
    this._updateUI();
  },
  
  /**
   * Clear all selections
   */
  clearStoreSelection() {
    this._state.selectedOffers = {};
    this._updateUI();
  },
  
  /**
   * Get offer quantity
   */
  getOfferQuantity(offerId) {
    const key = String(offerId || '').trim();
    return this._state.selectedOffers[key] || 0;
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

