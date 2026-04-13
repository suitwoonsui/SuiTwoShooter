// ==========================================
// STORE UI SYSTEM
// ==========================================
// Premium store modal for purchasing game items
// Follows the leaderboard modal pattern
// Now delegates to StoreService for state management

// Store state - now managed by StoreService
// Keep local reference for backward compatibility
let storeState = null;

// Initialize storeState from StoreService if available
function getStoreState() {
  if (typeof StoreService !== 'undefined' && StoreService.getState) {
    return StoreService.getState();
  }
  // Fallback: create local state if StoreService not available
  if (!storeState) {
    storeState = {
      selectedOffers: {},
      paymentToken: 'mews',
      isLoading: false,
      tokenPrices: null,
      tokenPricesTimestamp: null,
      storeItems: null, // Items from backend (has correct USD prices)
      storeOffers: null
    };
  }
  return storeState;
}

// Helper to update storeState reference
function updateStoreStateReference() {
  if (typeof StoreService !== 'undefined' && StoreService.getState) {
    const serviceState = StoreService.getState();
    storeState = serviceState;
  }
}

/**
 * Show store modal
 * Follows the leaderboard modal pattern
 * Now delegates to StoreService
 */
async function showStore(context = 'main-menu', skipUpgradeCheck = false) {
  console.log('🛒 showStore() called', { context });
  
  // Update local state reference
  updateStoreStateReference();
  
  // Show loading dialog immediately so the user gets instant feedback
  if (typeof MenuPanelLoading !== 'undefined' && MenuPanelLoading.show) {
    MenuPanelLoading.show('Loading store... Please wait');
  }
  
  // Delegate to StoreService if available
  if (typeof StoreService !== 'undefined' && StoreService.show) {
    await StoreService.show(context, skipUpgradeCheck);
    // Update local reference after service call
    updateStoreStateReference();
    return;
  }
  
  // Fallback: original implementation
  console.warn('⚠️ [STORE] StoreService not available, using fallback');
  
  // Check if wallet is connected
  let walletAddress = null;
  if (typeof getWalletAddress === 'function') {
    walletAddress = getWalletAddress();
  } else if (window.walletAPIInstance && window.walletAPIInstance.isConnected()) {
    walletAddress = window.walletAPIInstance.getAddress();
  }
  
  if (!walletAddress) {
    // Show wallet connection modal
    showStoreWalletConnectModal();
    if (typeof MenuPanelLoading !== 'undefined' && MenuPanelLoading.hide) {
      MenuPanelLoading.hide();
    }
    return;
  }
  
  await showStoreInternal(context);
}

/**
 * Internal function to show the store (after wallet is confirmed connected)
 */
// ==========================================
// MODAL CREATION AND MANAGEMENT
// ==========================================
// Moved to: src/game/systems/ui/store-modal.js
// Functions: showStoreInternal, loadStoreBadgeDisplay
// These functions are now loaded from the store-modal.js module

// showStoreInternal() and loadStoreBadgeDisplay() are now in store-modal.js (see comment above)

// ==========================================
// WALLET CONNECTION MODAL
// ==========================================
// Moved to: src/game/systems/ui/store-wallet-connection.js
// Functions: showStoreWalletConnectModal, handleStoreWalletConnect, 
//           cancelStoreWalletConnect, closeStoreWalletConnectModal
// These functions are now loaded from the store-wallet-connection.js module

/**
 * Hide store modal
 * @param {{ returnToTournaments?: boolean; skipMainMenuReveal?: boolean }} [options]
 */
function hideStore(options = {}) {
  // Delegate to StoreService if available
  if (typeof StoreService !== 'undefined' && StoreService.hide) {
    StoreService.hide(options);
    // Update local reference after service call
    updateStoreStateReference();
    return;
  }
  
  // Fallback: original implementation
  const storeModal = document.getElementById('storeModal');
  if (storeModal) {
    storeModal.classList.remove('store-modal-visible');
    storeModal.classList.add('store-modal-hidden');
    // Remove from DOM after animation
    setTimeout(() => {
      storeModal.remove();
    }, 300);
  }
  
  let context = 'main-menu';
  if (typeof getStoreState === 'function') {
    const state = getStoreState();
    context = state.context || 'main-menu';
    if (state) state.context = 'main-menu';
  } else if (typeof StoreService !== 'undefined' && StoreService._state) {
    context = StoreService._state.context || 'main-menu';
    StoreService._state.context = 'main-menu';
  }

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

  if (context !== 'credits-only') {
    if (typeof MenuService !== 'undefined' && MenuService.show) {
      MenuService.show({ fromMenuPanel: true });
    } else {
      const mainMenu = document.getElementById('mainMenuOverlay');
      if (mainMenu) {
        mainMenu.classList.add('main-menu-overlay-visible');
        mainMenu.classList.remove('main-menu-overlay-hidden');
      }
    }
  } else {
    console.log('🔄 [STORE UI] Store closed in credits-only mode - staying in game');
  }
}

/**
 * Convert USD price to token amount
 * Uses prices from backend API (should always be available)
 * 
 * @param {number} usdPrice - Price in USD
 * @param {string} tokenType - 'sui', 'mews', or 'usdc'
 * @returns {Object} { amount: number, formatted: string, error?: string }
 */
// ==========================================
// PRICE CONVERSION AND FORMATTING UTILITIES
// ==========================================
// Moved to: src/game/systems/ui/store-utils.js
// Functions: convertUsdToToken, formatTokenAmount, formatUsdPrice
// These functions are now loaded from the store-utils.js module

// ==========================================
// ITEM LOADING
// ==========================================
// Moved to: src/game/systems/ui/store-item-loader.js
// Function: loadStoreItems
// This function is now loaded from the store-item-loader.js module

/**
 * Create item card element
 */
// ==========================================
// ITEM CARD RENDERING
// ==========================================
// Moved to: src/game/systems/ui/store-item-rendering.js
// Functions: createItemCard, updateItemCardStates
// These functions are now loaded from the store-item-rendering.js module

/**
 * Set payment token (MEWS or SUI)
 */
async function setPaymentToken(token) {
  // Update local state reference
  updateStoreStateReference();
  
  // Delegate to StoreService if available
  if (typeof StoreService !== 'undefined' && StoreService.setPaymentToken) {
    await StoreService.setPaymentToken(token);
    // Update local reference after service call
    updateStoreStateReference();
    return;
  }
  
  // Fallback: original implementation
  if (token !== 'mews' && token !== 'sui' && token !== 'usdc') {
    console.warn('⚠️ [STORE] Invalid payment token:', token);
    return;
  }
  
  console.log('💱 [STORE] Switching payment token to:', token);
  const state = getStoreState();
  state.paymentToken = token;
  
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
  await updateItemPrices();
  
  // Also update the selected items summary
  await updateStoreUI();
  
  // Update balance display for selected token
  await updateStoreBalance();
  
  // Re-render active tab if it's Game Pass or Tournament Tickets
  const itemsTab = document.getElementById('storeTabContentItems');
  const bundlesTab = document.getElementById('storeTabContentBundles');
  const gamePassTab = document.getElementById('storeTabContentGamePass');
  const ticketsTab = document.getElementById('storeTabContentTickets');
  
  let activeTab = null;
  if (itemsTab && itemsTab.classList.contains('active')) {
    activeTab = 'items';
  } else if (bundlesTab && bundlesTab.classList.contains('active')) {
    activeTab = 'bundles';
  } else if (gamePassTab && gamePassTab.classList.contains('active')) {
    activeTab = 'gamePass';
  } else if (ticketsTab && ticketsTab.classList.contains('active')) {
    activeTab = 'tickets';
  }
  
  // Only refresh non-Items tabs (Items tab updates via updateItemPrices)
  if ((activeTab === 'bundles' || activeTab === 'gamePass' || activeTab === 'tickets') && typeof switchStoreTab === 'function') {
    console.log(`💱 [STORE] Refreshing ${activeTab} tab after payment token change`);
    await switchStoreTab(activeTab);
  }
}

// ==========================================
// ITEM SELECTION MANAGEMENT
// ==========================================
// Moved to: src/game/systems/ui/store-item-selection.js
// Functions: getItemKey, getItemQuantity, addItemToSelection, removeItemFromSelection,
//           setItemQuantity, selectStoreItem, clearLevelSelection, clearStoreSelection
// These functions are now loaded from the store-item-selection.js module

// ==========================================
// UI UPDATE FUNCTIONS
// ==========================================
// Moved to: src/game/systems/ui/store-ui-updates.js
// Functions: updateStoreUI, updateStoreBalance, updateItemPrices
// These functions are now loaded from the store-ui-updates.js module

// updateStoreUI(), updateStoreBalance(), and updateItemPrices() are now in store-ui-updates.js (see comment above)

// Make functions globally accessible for onclick handlers
if (typeof window !== 'undefined') {
  window.showStore = showStore;
  window.hideStore = hideStore;
  window.setPaymentToken = setPaymentToken;
  window.selectStoreItem = selectStoreItem;
  window.addItemToSelection = addItemToSelection;
  window.removeItemFromSelection = removeItemFromSelection;
  window.setItemQuantity = setItemQuantity;
  window.clearLevelSelection = clearLevelSelection;
  window.clearStoreSelection = clearStoreSelection;
  // Note: Many functions are now exposed from their respective modules:
  // - proceedToPurchase, showInsufficientBalanceModal, closeInsufficientBalanceModal (store-purchase-flow.js)
  // - convertUsdToToken, formatTokenAmount, formatUsdPrice (store-utils.js)
  // - StoreDataSources: /api/store/catalog, token prices (store-data-sources.js)
  // - loadStoreItems (store-item-loader.js)
  // - loadInventoryDisplay (store-inventory.js)
  // - handleStoreWalletConnect, cancelStoreWalletConnect (store-wallet-connection.js)
  // These are exposed globally by their respective modules
}

