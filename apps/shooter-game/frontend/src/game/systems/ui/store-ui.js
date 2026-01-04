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
      selectedItems: {},
      paymentToken: 'mews',
      isLoading: false,
      tokenPrices: null
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
async function showStore(context = 'main-menu') {
  console.log('🛒 showStore() called', { context });
  
  // Update local state reference
  updateStoreStateReference();
  
  // Delegate to StoreService if available
  if (typeof StoreService !== 'undefined' && StoreService.show) {
    await StoreService.show(context);
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
    return;
  }
  
  // Check for pending badge upgrade BEFORE showing store
  if (window.BadgeService && window.BadgeService.checkPendingUpgrade) {
    const upgradeCheck = await window.BadgeService.checkPendingUpgrade(walletAddress);
    if (upgradeCheck.success && upgradeCheck.hasPendingUpgrade && upgradeCheck.badgeId) {
      console.log('🎖️ [STORE] Pending badge upgrade detected - showing upgrade modal first');
      
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
              await showStoreInternal(context);
            },
          });
          
          // Return early - store will be shown via callback
          return;
        }
      }
    }
  }
  
  // Wallet is connected, proceed to show store
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
 */
function hideStore() {
  // Delegate to StoreService if available
  if (typeof StoreService !== 'undefined' && StoreService.hide) {
    StoreService.hide();
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
  
  // Check context - don't show main menu if in credits-only mode (from End Demo modal)
  let context = 'main-menu';
  if (typeof getStoreState === 'function') {
    const state = getStoreState();
    context = state.context || 'main-menu';
  } else if (typeof StoreService !== 'undefined' && StoreService._state) {
    context = StoreService._state.context || 'main-menu';
  }
  
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
  const gamePassTab = document.getElementById('storeTabContentGamePass');
  const ticketsTab = document.getElementById('storeTabContentTickets');
  
  let activeTab = null;
  if (itemsTab && itemsTab.classList.contains('active')) {
    activeTab = 'items';
  } else if (gamePassTab && gamePassTab.classList.contains('active')) {
    activeTab = 'gamePass';
  } else if (ticketsTab && ticketsTab.classList.contains('active')) {
    activeTab = 'tickets';
  }
  
  // Only refresh Game Pass or Tournament Tickets tabs (Items tab updates via updateItemPrices)
  if ((activeTab === 'gamePass' || activeTab === 'tickets') && typeof switchStoreTab === 'function') {
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
  // - loadStoreItems (store-item-loader.js)
  // - loadInventoryDisplay (store-inventory.js)
  // - handleStoreWalletConnect, cancelStoreWalletConnect (store-wallet-connection.js)
  // These are exposed globally by their respective modules
}

