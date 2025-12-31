// ==========================================
// STORE MODAL - Modal Creation and Management
// ==========================================
// Handles creating the store modal HTML and managing its display

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

// DOM element cache for store modal
let _storeModalCache = {
  mainMenu: null,
  viewportContainer: null,
  storeModal: null
};

/**
 * Get cached main menu element
 * @private
 */
function _getMainMenu() {
  if (!_storeModalCache.mainMenu) {
    _storeModalCache.mainMenu = document.getElementById('mainMenuOverlay');
  }
  return _storeModalCache.mainMenu;
}

/**
 * Get cached viewport container element
 * @private
 */
function _getViewportContainer() {
  if (!_storeModalCache.viewportContainer) {
    _storeModalCache.viewportContainer = document.querySelector('.viewport-container');
  }
  return _storeModalCache.viewportContainer;
}

/**
 * Get cached store modal element
 * @private
 */
function _getStoreModal() {
  if (!_storeModalCache.storeModal) {
    _storeModalCache.storeModal = document.getElementById('storeModal');
  }
  return _storeModalCache.storeModal;
}

/**
 * Invalidate store modal cache (call when elements are removed/recreated)
 * @private
 */
function _invalidateStoreModalCache() {
  _storeModalCache.mainMenu = null;
  _storeModalCache.viewportContainer = null;
  _storeModalCache.storeModal = null;
}

/**
 * Show store modal (internal implementation)
 * Creates the modal HTML and sets up event handlers
 * @param {string} context - Context for showing store ('main-menu' | 'gameplay-paywall' | 'gamePass')
 */
async function showStoreInternal(context = 'main-menu') {
  // Hide main menu
  const mainMenu = _getMainMenu();
  if (mainMenu) {
    mainMenu.classList.add('main-menu-overlay-hidden');
    mainMenu.classList.remove('main-menu-overlay-visible');
  }
  
  // Create store modal using dedicated store-modal class
  // Append to viewport-container like other panels (settings, instructions, leaderboard)
  const viewportContainer = _getViewportContainer();
  if (!viewportContainer) {
    log.error('STORE MODAL', 'Viewport container not found!');
    return;
  }
  
  // Check if store modal already exists
  let storeModal = _getStoreModal();
  if (storeModal) {
    // Check if items container is empty (modal was closed and items were removed)
    const itemsContainer = document.getElementById('storeItemsContainer');
    const hasItems = itemsContainer && itemsContainer.children.length > 0;
    
    // If items are missing, we need to fully reload the store
    if (!hasItems) {
      // Remove the existing modal and recreate it
      log.debug('STORE MODAL', 'Modal exists but items are missing, recreating modal');
      storeModal.remove();
      _invalidateStoreModalCache();
      // Continue to create new modal below
    } else {
      // Modal already exists with items, just show it and refresh inventory
    storeModal.classList.add('store-modal-visible');
    storeModal.classList.remove('store-modal-hidden');
      
      // Store context in state for later use
      if (typeof StoreService !== 'undefined' && StoreService._state) {
        StoreService._state.context = context;
      }
      if (typeof getStoreState === 'function') {
        const state = getStoreState();
        if (state) {
          state.context = context;
        }
      }
      
      // Handle special contexts
      if (context === 'gamePass' || context === 'credits-only') {
        // Hide Items and Tickets tabs for credits-only mode
        const itemsTab = document.getElementById('storeTabItems');
        const ticketsTab = document.getElementById('storeTabTickets');
        const storeTabsContainer = document.getElementById('storeTabs');
        
        if (context === 'credits-only') {
          // Credits-only mode: hide Items and Tickets tabs
          if (itemsTab) itemsTab.style.display = 'none';
          if (ticketsTab) ticketsTab.style.display = 'none';
          if (storeTabsContainer) storeTabsContainer.style.justifyContent = 'center'; // Center the single tab
        } else {
          // Ensure tabs are visible if not in credits-only mode
          if (itemsTab) itemsTab.style.display = '';
          if (ticketsTab) ticketsTab.style.display = '';
          if (storeTabsContainer) storeTabsContainer.style.justifyContent = '';
        }
        
        // Switch to Game Pass tab and update buttons
        setTimeout(() => {
          switchStoreTab('gamePass');
        }, 100);
      } else {
        // Normal mode: ensure all tabs are visible
        const itemsTab = document.getElementById('storeTabItems');
        const ticketsTab = document.getElementById('storeTabTickets');
        const storeTabsContainer = document.getElementById('storeTabs');
        if (itemsTab) itemsTab.style.display = '';
        if (ticketsTab) ticketsTab.style.display = '';
        if (storeTabsContainer) storeTabsContainer.style.justifyContent = '';
        // Update buttons for items tab
        updateStoreButtons('items', context);
      }
    
    // Setup click-outside handler for existing modal
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
      
      // Check if click is outside the modal
      if (!storeModal.contains(event.target)) {
        // Check context - if credits-only mode, don't close or return to menu
        let currentContext = 'main-menu';
        if (typeof getStoreState === 'function') {
          const state = getStoreState();
          currentContext = state.context || 'main-menu';
        } else if (typeof StoreService !== 'undefined' && StoreService._state) {
          currentContext = StoreService._state.context || 'main-menu';
        }
        
        if (currentContext === 'credits-only') {
          // In credits-only mode (from End Demo modal), don't allow closing by clicking outside
          // User must use the buttons to continue or go back
          log.debug('STORE MODAL', 'Click outside ignored in credits-only mode - use buttons to navigate');
          return;
        }
        
        log.debug('STORE MODAL', 'Click was outside store modal - closing');
        if (typeof hideStore === 'function') {
          hideStore();
        }
        document.removeEventListener('click', handleClickOutside);
      }
    };
    
    // Remove any existing click-outside handler first
    // (We'll add a new one, but this ensures we don't have duplicates)
    setTimeout(() => {
      log.debug('STORE MODAL', 'Adding click outside listener for existing modal');
      document.addEventListener('click', handleClickOutside);
    }, 0);
    
    // Show loading modal while refreshing
    if (typeof showLoadingModal === 'function') {
      showLoadingModal('Refreshing store... Please wait', 'storeLoadingModal');
    }
    // Wait for cards to exist, then load inventory and balance
    setTimeout(async () => {
      try {
        if (typeof loadInventoryDisplay === 'function') {
          await loadInventoryDisplay();
        }
        if (typeof updateStoreBalance === 'function') {
          await updateStoreBalance();
        }
        if (typeof updateStoreUI === 'function') {
          await updateStoreUI();
        }
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
  
  // Show loading modal FIRST - before any loading starts
  if (typeof showLoadingModal === 'function') {
    showLoadingModal('Loading store... Please wait', 'storeLoadingModal');
  }
  
  // Get payment token from state (needed for modal HTML)
  let paymentToken = 'mews';
  if (typeof getStoreState === 'function') {
    const state = getStoreState();
    paymentToken = state.paymentToken || 'mews';
  } else if (typeof StoreService !== 'undefined' && StoreService.getState) {
    const state = StoreService.getState();
    paymentToken = state.paymentToken || 'mews';
  }
  
  // Create modal structure but keep it hidden until everything is loaded
  storeModal = document.createElement('div');
  storeModal.className = 'store-modal store-modal-hidden'; // Start hidden
  storeModal.setAttribute('id', 'storeModal');
  
  // Update cache with new modal
  _storeModalCache.storeModal = storeModal;
  
  const storeContent = document.createElement('div');
  storeContent.className = 'store';
  
  storeContent.innerHTML = `
    <!-- Store Header -->
    <div class="store-header">
      <h2 id="storeTitle">
        <span>🛒 Store & Inventory</span>
        <span id="storeBadgeDisplay" class="store-badge-icon" style="display: none;"></span>
      </h2>
    </div>
    
    <!-- Store Tabs -->
    <div class="store-tabs" id="storeTabs">
      <button class="store-tab active" onclick="switchStoreTab('items')" id="storeTabItems">Items</button>
      <button class="store-tab" onclick="switchStoreTab('inventory')" id="storeTabInventory">Inventory</button>
      <button class="store-tab" onclick="switchStoreTab('gamePass')" id="storeTabGamePass">Game Pass</button>
      <button class="store-tab" onclick="switchStoreTab('tickets')" id="storeTabTickets">Tournament Tickets</button>
    </div>
    
    <!-- Payment Token Selector -->
    <div class="store-payment-selector">
      <div>
        <label>Payment Method:</label>
        <div class="payment-token-buttons">
          <button class="payment-token-btn ${(paymentToken === 'mews') ? 'active' : ''}" 
                  onclick="setPaymentToken('mews')" id="paymentTokenMews">
            <img src="assets/SuiTwo_Profile.webp" alt="$MEWS" class="token-icon" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';">
            <span class="token-fallback" style="display: none;">💰</span>
            <span>$MEWS</span>
          </button>
          <button class="payment-token-btn ${(paymentToken === 'sui') ? 'active' : ''}" 
                  onclick="setPaymentToken('sui')" id="paymentTokenSui">
            <img src="assets/sui.svg" alt="SUI" class="token-icon" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';">
            <span class="token-fallback" style="display: none;">💎</span>
            <span>SUI</span>
          </button>
          <button class="payment-token-btn ${(paymentToken === 'usdc') ? 'active' : ''}" 
                  onclick="setPaymentToken('usdc')" id="paymentTokenUsdc">
            <img src="assets/usdc.svg" alt="USDC" class="token-icon" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';">
            <span class="token-fallback" style="display: none;">💵</span>
            <span>USDC</span>
          </button>
        </div>
      </div>
      <!-- Balance display -->
      <div class="store-wallet-balance-display" id="storeBalanceDisplay" style="display: none;">
        <span class="store-balance-label">Balance: </span>
        <span class="store-balance-value" id="storeBalanceValue">--</span>
      </div>
    </div>
    
    <!-- Tab Content Container -->
    <div class="store-tab-content-container">
      <!-- Items Tab Content -->
      <div class="store-tab-content active" id="storeTabContentItems">
    <!-- Store Items Container -->
    <div class="store-items-container" id="storeItemsContainer">
      <div class="store-loading" id="storeLoading">
        <span class="btn-icon">⏳</span> Loading store items...
          </div>
        </div>
      </div>
      
      <!-- Game Pass Tab Content -->
      <div class="store-tab-content" id="storeTabContentGamePass">
        <div id="storeGamePassTabContent">
          <div class="store-loading">
            <span class="btn-icon">⏳</span> Loading Game Pass options...
          </div>
        </div>
      </div>
      
      <!-- Inventory Tab Content -->
      <div class="store-tab-content" id="storeTabContentInventory">
        <div id="storeInventoryTabContent">
          <div class="store-loading">
            <span class="btn-icon">⏳</span> Loading Inventory...
          </div>
        </div>
      </div>
      
      <!-- Tournament Tickets Tab Content -->
      <div class="store-tab-content" id="storeTabContentTickets">
        <div id="storeTournamentTicketsTabContent">
          <div class="store-loading">
            <span class="btn-icon">⏳</span> Loading Tournament Tickets...
          </div>
        </div>
      </div>
    </div>
    
    <!-- Selected Items Summary -->
    <div class="store-selected-summary" id="storeSelectedSummary" style="display: none;">
      <h3>Selected Items</h3>
      <div id="selectedItemsList"></div>
      <div class="store-total" id="storeTotal">
        <span>Total: $0.00 (0 $MEWS)</span>
      </div>
    </div>
    
    <!-- Store Actions -->
    <div class="store-actions" id="storeActions">
      <button class="menu-btn" onclick="clearStoreSelection()" id="clearSelectionBtn" style="display: none;">
        <span class="btn-icon">🗑️</span> Clear Selection
      </button>
      <button class="menu-btn primary" onclick="proceedToPurchase()" id="proceedToPurchaseBtn" style="display: none;" disabled>
        <span class="btn-icon">💳</span> Proceed to Purchase
      </button>
      <button class="menu-btn" onclick="hideStore()" id="backToMenuBtn">
        <span class="btn-icon">←</span> Back to Menu
      </button>
      <button class="menu-btn primary" onclick="continueToGameAfterPurchase()" id="continueToGameBtn" style="display: none;">
        <span class="btn-icon">▶️</span> Continue to Game
      </button>
      <button class="menu-btn" onclick="backToPreviousModal()" id="backToPreviousModalBtn" style="display: none;">
        <span class="btn-icon">←</span> Back to Previous Modal
      </button>
    </div>
  `;
  
  storeModal.appendChild(storeContent);
  viewportContainer.appendChild(storeModal);
  
  // Setup click-outside handler to close store
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
      // Check context - if credits-only mode, don't close or return to menu
      if (context === 'credits-only') {
        // In credits-only mode (from End Demo modal), don't allow closing by clicking outside
        // User must use the buttons to continue or go back
        log.debug('STORE MODAL', 'Click outside ignored in credits-only mode - use buttons to navigate');
        return;
      }
      
      console.log('🟠 [STORE MODAL] Click was outside store modal - closing');
      if (typeof hideStore === 'function') {
        hideStore();
      }
      document.removeEventListener('click', handleClickOutside);
    }
  };
  
  // Load all data BEFORE showing the modal
  try {
    // Skip loading items and inventory for credits-only mode (faster loading)
    if (context !== 'credits-only') {
      // Update loading message
      if (typeof updateLoadingModalMessage === 'function') {
        updateLoadingModalMessage('Loading store items... Please wait', 'storeLoadingModal');
      }
      
      // Step 1: Load store items (renders into hidden modal)
      if (typeof loadStoreItems === 'function') {
        await loadStoreItems();
      }
      
      // Update loading message
      if (typeof updateLoadingModalMessage === 'function') {
        updateLoadingModalMessage('Loading inventory... Please wait', 'storeLoadingModal');
      }
      
      // Step 2: Load and display inventory (after cards are created)
      if (typeof loadInventoryDisplay === 'function') {
        await loadInventoryDisplay();
      }
    }
    
    // Update loading message (context-aware)
    if (typeof updateLoadingModalMessage === 'function') {
      const loadingMessage = context === 'credits-only' 
        ? 'Loading game pass credits... Please wait'
        : 'Loading game pass credits... Please wait';
      updateLoadingModalMessage(loadingMessage, 'storeLoadingModal');
    }
    
    // Step 2.5: Load game pass status (credits and tickets)
    // Get wallet address first
    let walletAddress = null;
    if (typeof getWalletAddress === 'function') {
      walletAddress = getWalletAddress();
    } else if (window.walletAPIInstance && window.walletAPIInstance.isConnected()) {
      walletAddress = window.walletAPIInstance.getAddress();
    }
    
    if (walletAddress && typeof GamePassService !== 'undefined' && GamePassService.getGamePassStatus) {
      try {
        const gamePassStatus = await GamePassService.getGamePassStatus(walletAddress, true); // Force refresh
        log.debug('STORE MODAL', 'Game pass status loaded', gamePassStatus);
        
        // Store the status for use by Game Pass tab and display
        if (gamePassStatus.success) {
          // Update display with loaded status (avoid another API call)
          if (window.GamePassDisplay) {
            if (typeof window.GamePassDisplay.updateStoreDisplay === 'function') {
              window.GamePassDisplay.updateStoreDisplay(
                gamePassStatus.gamesRemaining || 0,
                gamePassStatus.ticketCount || 0,
                gamePassStatus.hasPass || false,
                gamePassStatus.isActive || false
              );
            }
          }
          
          // Store status globally for Game Pass tab to use
          if (!window._preloadedGamePassStatus) {
            window._preloadedGamePassStatus = {};
          }
          window._preloadedGamePassStatus[walletAddress] = gamePassStatus;
        }
      } catch (error) {
        log.warn('STORE MODAL', 'Error loading game pass status', error);
        // Don't fail the entire store load if game pass fails
      }
    }
    
    // Skip tournament tickets loading for credits-only mode
    if (context !== 'credits-only') {
      // Update loading message
      if (typeof updateLoadingModalMessage === 'function') {
        updateLoadingModalMessage('Loading tournament tickets... Please wait', 'storeLoadingModal');
      }
      
      // Step 2.6: Load tournament tickets
      // Note: Tournament tickets are stored in the GamePass object's tournament_tickets field
      // The backend's getGamePassStatus() currently doesn't extract tickets, but when it does,
      // they will be available in the gamePassStatus object above
      // For now, tickets are prepared to be loaded as part of game pass status
      // Future: Backend needs to extract tournament_tickets Table from GamePass object and return it
    }
    
    // Update loading message
    if (typeof updateLoadingModalMessage === 'function') {
      updateLoadingModalMessage('Loading balance... Please wait', 'storeLoadingModal');
    }
    
    // Step 3: Update balance display
    if (typeof updateStoreBalance === 'function') {
      await updateStoreBalance();
    }
    
    // Update loading message
    if (typeof updateLoadingModalMessage === 'function') {
      updateLoadingModalMessage('Loading badge... Please wait', 'storeLoadingModal');
    }
    
    // Step 4: Load and display badge (if player has one)
    // Use 'gamePass' tab for credits-only mode, 'items' for normal mode
    const defaultTabForBadge = context === 'credits-only' ? 'gamePass' : 'items';
    if (typeof loadStoreBadgeDisplay === 'function') {
      await loadStoreBadgeDisplay(defaultTabForBadge);
    }
    
    // Skip UI updates for credits-only mode (no items to update prices for)
    if (context !== 'credits-only') {
      // Update loading message
      if (typeof updateLoadingModalMessage === 'function') {
        updateLoadingModalMessage('Finalizing store... Please wait', 'storeLoadingModal');
      }
      
      // Step 5: Update UI (including prices with badge discount)
      if (typeof updateStoreUI === 'function') {
        await updateStoreUI();
      }
    }
    
    // Store context in state for later use
    if (typeof StoreService !== 'undefined' && StoreService._state) {
      StoreService._state.context = context;
    }
    if (typeof getStoreState === 'function') {
      const state = getStoreState();
      if (state) {
        state.context = context;
      }
    }
    
    // All data loaded - now show the modal
    storeModal.classList.remove('store-modal-hidden');
    storeModal.classList.add('store-modal-visible');
    
    // Update buttons based on initial tab (items is default)
    updateStoreButtons('items', context);
    
    // Handle special contexts (credits-only or gamePass)
    if (context === 'gamePass' || context === 'credits-only') {
      // Hide Items and Tickets tabs for credits-only mode
      const itemsTab = document.getElementById('storeTabItems');
      const ticketsTab = document.getElementById('storeTabTickets');
      const storeTabsContainer = document.getElementById('storeTabs');
      
      if (context === 'credits-only') {
        // Credits-only mode: hide Items, Inventory, and Tickets tabs
        const inventoryTab = document.getElementById('storeTabInventory');
        if (itemsTab) itemsTab.style.display = 'none';
        if (inventoryTab) inventoryTab.style.display = 'none';
        if (ticketsTab) ticketsTab.style.display = 'none';
        if (storeTabsContainer) storeTabsContainer.style.justifyContent = 'center'; // Center the single tab
      }
      
      // Switch to Game Pass tab
      setTimeout(() => {
        switchStoreTab('gamePass');
      }, 200);
    }
    
    // Setup click-outside handler after modal is visible
    setTimeout(() => {
      log.debug('STORE MODAL', 'Adding click outside listener for new modal');
      document.addEventListener('click', handleClickOutside);
    }, 0);
    
  } catch (error) {
    log.error('STORE MODAL', 'Error loading store data', error);
    // Ensure modal exists before trying to show error
    if (!storeModal) {
      log.error('STORE MODAL', 'Store modal was not created before error occurred');
      // Try to get existing modal
      storeModal = document.getElementById('storeModal');
    }
    
    // Show error in modal if it exists
    const container = document.getElementById('storeItemsContainer');
    if (container) {
      container.innerHTML = `
        <div class="store-placeholder">
          <p>❌ Error loading store</p>
          <p style="font-size: 0.9em; color: #888; margin-top: 10px;">
            ${error.message || 'Unknown error'}
          </p>
          <button class="menu-btn" onclick="hideStore(); showStore();" style="margin-top: 10px;">
            <span class="btn-icon">🔄</span> Retry
          </button>
        </div>
      `;
    }
    
    // Still show the modal even if there was an error
    if (storeModal) {
    storeModal.classList.remove('store-modal-hidden');
    storeModal.classList.add('store-modal-visible');
      
      // Handle special contexts (credits-only or gamePass)
      if (context === 'gamePass' || context === 'credits-only') {
        // Hide Items and Tickets tabs for credits-only mode
        const itemsTab = document.getElementById('storeTabItems');
        const ticketsTab = document.getElementById('storeTabTickets');
        const storeTabsContainer = document.getElementById('storeTabs');
        
        if (context === 'credits-only') {
          // Credits-only mode: hide Items and Tickets tabs
          if (itemsTab) itemsTab.style.display = 'none';
          if (ticketsTab) ticketsTab.style.display = 'none';
          if (storeTabsContainer) storeTabsContainer.style.justifyContent = 'center'; // Center the single tab
        }
        
        // Switch to Game Pass tab
        setTimeout(() => {
          switchStoreTab('gamePass');
        }, 200);
      }
    } else {
      log.error('STORE MODAL', 'Cannot show modal - modal element not found');
    }
  } finally {
    // Hide loading modal when store is fully loaded (or errored)
    if (typeof hideLoadingModal === 'function') {
      hideLoadingModal('storeLoadingModal');
    }
  }
}

/**
 * Load and display badge icon in store header (if player has one)
 * Shows only the badge image/icon to the right of "Premium Store" title
 * @param {string} activeTab - Active tab name ('items', 'gamePass', or 'tickets') to show correct discount
 */
async function loadStoreBadgeDisplay(activeTab = 'items') {
  const badgeDisplayContainer = document.getElementById('storeBadgeDisplay');
  if (!badgeDisplayContainer) {
    log.warn('STORE MODAL', 'Badge display container not found');
    return;
  }
  
  // Get wallet address
  let walletAddress = null;
  if (typeof getWalletAddress === 'function') {
    walletAddress = getWalletAddress();
  } else if (window.walletAPIInstance && window.walletAPIInstance.isConnected()) {
    walletAddress = window.walletAPIInstance.getAddress();
  }
  
  if (!walletAddress) {
    badgeDisplayContainer.style.display = 'none';
    return;
  }
  
  try {
    // Get badge data from BadgeService
    if (window.BadgeService && window.BadgeService.getBadge) {
      const badgeData = await window.BadgeService.getBadge(walletAddress);
      
      if (badgeData.success && badgeData.hasBadge && badgeData.badge) {
        const badge = badgeData.badge;
        const tier = badge.tier || 1;
        const badgeTitle = badge.name || `Tier ${tier} Badge`;
        
        // Get badge image URL - follow same pattern as badge-ui.js
        let imageSrc = null;
        const tierNames = ['Standard', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
        const tierName = tierNames[tier] || 'Standard';
        const apiBaseUrl = window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3000/api';
        const baseUrl = apiBaseUrl.replace(/\/api$/, '');
        
        // First, try to use imageUrl from badge
        if (badge.imageUrl && typeof badge.imageUrl === 'string' && (badge.imageUrl.startsWith('http://') || badge.imageUrl.startsWith('https://'))) {
          imageSrc = badge.imageUrl;
          log.debug('STORE MODAL', 'Using badge imageUrl', imageSrc);
        } else {
          // Fallback: Construct URL from tier
          const constructedUrl = `${baseUrl}/Badges/${tierName}.webp`;
          imageSrc = constructedUrl;
          log.debug('STORE MODAL', 'Constructed image URL from tier', imageSrc);
          
          // Fallback 2: If we have imageData, use it as base64
          if (badge.imageData && badge.imageData.length > 0) {
            try {
              // Use arrayBufferToBase64 from BadgeUI if available
              if (window.BadgeUI && typeof window.BadgeUI.arrayBufferToBase64 === 'function') {
                imageSrc = `data:image/webp;base64,${window.BadgeUI.arrayBufferToBase64(badge.imageData)}`;
              } else {
                // Manual conversion
                let base64;
                if (Array.isArray(badge.imageData)) {
                  const bytes = new Uint8Array(badge.imageData);
                  const binary = String.fromCharCode.apply(null, Array.from(bytes));
                  base64 = btoa(binary);
                } else if (badge.imageData instanceof Uint8Array) {
                  const binary = String.fromCharCode.apply(null, Array.from(badge.imageData));
                  base64 = btoa(binary);
                } else {
                  const binary = String.fromCharCode.apply(null, Array.from(new Uint8Array(badge.imageData)));
                  base64 = btoa(binary);
                }
                imageSrc = `data:image/webp;base64,${base64}`;
              }
              log.debug('STORE MODAL', 'Using badge imageData (base64) instead of constructed URL');
            } catch (error) {
              log.warn('STORE MODAL', 'Failed to convert badge imageData, using constructed URL', error);
            }
          }
        }
        
        // Get discount information for the active tab
        // Game Pass and Tickets use gameplay discount, Items use store discount
        const discounts = window.BadgeService ? window.BadgeService.getDiscountsForTier(tier) : { store: 0, gameplay: 0 };
        const tabDiscount = (activeTab === 'gamePass' || activeTab === 'tickets') 
          ? (discounts.gameplay || 0)
          : (discounts.store || 0);
        
        // Construct fallback URL from tier in case image fails to load
        const fallbackUrl = `${baseUrl}/Badges/${tierName}.webp`;
        
        // Display badge icon with tier name and discount - use wrapper structure
        let imageHTML = '';
        if (imageSrc) {
          imageHTML = `<img src="${imageSrc}" alt="${badgeTitle}" class="store-badge-icon-image" 
                 onerror="this.onerror=null; this.src='${fallbackUrl}';" />`;
        } else {
          // No image available, use emoji as text (not as image source)
          imageHTML = `<span class="store-badge-icon-placeholder">🎖️</span>`;
        }
        
        // Build the badge display with wrapper, image, and text (tier + discount)
        badgeDisplayContainer.innerHTML = `
          <div class="store-badge-icon-wrapper">
            ${imageHTML}
            <div class="store-badge-text">
              <div class="store-badge-tier">${tierName}</div>
              ${tabDiscount > 0 ? `<div class="store-badge-discount">${tabDiscount}% off</div>` : ''}
            </div>
          </div>
        `;
        
        badgeDisplayContainer.style.display = 'inline-block';
        badgeDisplayContainer.title = badgeTitle;
      } else {
        // No badge, hide display
        badgeDisplayContainer.style.display = 'none';
      }
    } else {
      // BadgeService not available, hide display
      badgeDisplayContainer.style.display = 'none';
    }
  } catch (error) {
    log.warn('STORE MODAL', 'Failed to load badge display', error);
    badgeDisplayContainer.style.display = 'none';
  }
}

/**
 * Get badge discount for a specific store tab
 * @param {string} tabName - Tab name ('items', 'gamePass', or 'tickets')
 * @param {string} walletAddress - Player's wallet address
 * @returns {Promise<number>} Discount percentage (0-25)
 */
async function getTabDiscount(tabName, walletAddress) {
  if (!walletAddress || !window.BadgeService) {
    return 0;
  }
  
  try {
    const badge = await window.BadgeService.getBadge(walletAddress);
    if (badge && badge.success && badge.hasBadge && badge.badge) {
      // Use getDiscountsForTier for consistency
      if (typeof window.BadgeService.getDiscountsForTier === 'function') {
        const discounts = window.BadgeService.getDiscountsForTier(badge.badge.tier);
        // Game Pass and Tickets use gameplay discount, Items use store discount
        if (tabName === 'gamePass' || tabName === 'tickets') {
          return discounts.gameplay || 0;
        } else {
          // Items tab uses store discount
          return discounts.store || 0;
        }
      } else if (typeof window.BadgeService.getDiscounts === 'function') {
        // Fallback to getDiscounts if getDiscountsForTier not available
        const discounts = window.BadgeService.getDiscounts(badge.badge.tier);
        if (tabName === 'gamePass' || tabName === 'tickets') {
          return discounts.gameplay || 0;
        } else {
          return discounts.store || 0;
        }
      }
    }
  } catch (error) {
    log.warn('STORE MODAL', `Failed to get badge discount for ${tabName} tab`, error);
  }
  
  return 0;
}

/**
 * Switch between store tabs
 * @param {string} tabName - Tab name ('items' or 'gamePass')
 */
async function switchStoreTab(tabName) {
  console.log('🔄 [STORE MODAL] switchStoreTab called', tabName);
  
  // Get current context
  let context = 'main-menu';
  if (typeof getStoreState === 'function') {
    const state = getStoreState();
    context = state.context || 'main-menu';
  }
  
  // Update buttons based on active tab
  updateStoreButtons(tabName, context);
  
  // For credits-only mode, ensure only Game Pass tab is accessible
  const itemsTab = document.getElementById('storeTabItems');
  const inventoryTab = document.getElementById('storeTabInventory');
  const ticketsTab = document.getElementById('storeTabTickets');
  const gamePassTab = document.getElementById('storeTabGamePass');
  
  // If Items, Inventory, or Tickets tabs are hidden (credits-only mode), prevent switching to them
  if (tabName === 'items' && itemsTab && itemsTab.style.display === 'none') {
    console.warn('🔄 [STORE MODAL] Items tab is hidden in credits-only mode');
    return;
  }
  if (tabName === 'inventory' && inventoryTab && inventoryTab.style.display === 'none') {
    console.warn('🔄 [STORE MODAL] Inventory tab is hidden in credits-only mode');
    return;
  }
  if (tabName === 'tickets' && ticketsTab && ticketsTab.style.display === 'none') {
    console.warn('🔄 [STORE MODAL] Tickets tab is hidden in credits-only mode');
    return;
  }
  
  // Hide all tab contents
  const allTabContents = document.querySelectorAll('.store-tab-content');
  allTabContents.forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Remove active class from all tabs
  const allTabs = document.querySelectorAll('.store-tab');
  allTabs.forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Show selected tab
  if (tabName === 'items') {
    const itemsTab = document.getElementById('storeTabContentItems');
    const itemsTabBtn = document.getElementById('storeTabItems');
    if (itemsTab) itemsTab.classList.add('active');
    if (itemsTabBtn) itemsTabBtn.classList.add('active');
    
    // Update item prices with current discount when switching to Items tab
    // This ensures discounts are up-to-date if badge changed
    if (typeof updateItemPrices === 'function') {
      await updateItemPrices();
    }
    
    // Update badge display to show store discount for Items tab
    if (typeof loadStoreBadgeDisplay === 'function') {
      await loadStoreBadgeDisplay('items');
    }
  } else if (tabName === 'inventory') {
    console.log('📦 [STORE MODAL] Switching to Inventory tab');
    const inventoryTab = document.getElementById('storeTabContentInventory');
    const inventoryTabBtn = document.getElementById('storeTabInventory');
    if (inventoryTab) inventoryTab.classList.add('active');
    if (inventoryTabBtn) inventoryTabBtn.classList.add('active');
    
    // Load Inventory tab content
    if (window.StoreInventoryTab) {
      try {
        // Get wallet address
        let walletAddress = null;
        if (typeof getWalletAddress === 'function') {
          walletAddress = getWalletAddress();
        } else if (window.walletAPIInstance && window.walletAPIInstance.isConnected()) {
          walletAddress = window.walletAPIInstance.getAddress();
        }
        
        if (!walletAddress) {
          log.warn('STORE MODAL', 'No wallet address for Inventory tab');
          const container = document.getElementById('storeInventoryTabContent');
          if (container) {
            container.innerHTML = `
              <div class="store-placeholder">
                <p>⚠️ Please connect your wallet to view inventory</p>
              </div>
            `;
          }
          return;
        }
        
        // Get payment token from state
        let paymentToken = 'mews';
        if (typeof StoreService !== 'undefined' && StoreService.getPaymentToken) {
          paymentToken = StoreService.getPaymentToken();
        } else if (typeof getStoreState === 'function') {
          const state = getStoreState();
          paymentToken = state?.paymentToken || 'mews';
        }
        
        // Render Inventory tab with payment token
        await window.StoreInventoryTab.render(walletAddress, paymentToken);
      } catch (error) {
        log.error('STORE MODAL', 'Error loading Inventory tab', error);
        const container = document.getElementById('storeInventoryTabContent');
        if (container) {
          container.innerHTML = `
            <div class="store-placeholder">
              <p>❌ Error loading Inventory</p>
              <p style="font-size: 0.9em; color: #888; margin-top: 10px;">
                ${error.message || 'Unknown error'}
              </p>
            </div>
          `;
        }
      }
    } else {
      log.error('STORE MODAL', 'StoreInventoryTab not loaded! Script may not be loaded yet.');
      const container = document.getElementById('storeInventoryTabContent');
      if (container) {
        container.innerHTML = `
          <div class="store-placeholder">
            <p>❌ Inventory module not loaded</p>
            <p style="font-size: 0.9em; color: #888; margin-top: 10px;">
              The inventory script may not be loaded yet. Please wait a moment and try again, or refresh the page.
            </p>
            <button class="menu-btn" onclick="switchStoreTab('inventory')" style="margin-top: 10px;">
              <span class="btn-icon">🔄</span> Retry
            </button>
          </div>
        `;
      }
    }
  } else if (tabName === 'gamePass') {
    const gamePassTab = document.getElementById('storeTabContentGamePass');
    const gamePassTabBtn = document.getElementById('storeTabGamePass');
    if (gamePassTab) gamePassTab.classList.add('active');
    if (gamePassTabBtn) gamePassTabBtn.classList.add('active');
    
    // Load Game Pass tab content
    if (window.StoreGamePassTab) {
      try {
        // Get wallet address
        let walletAddress = null;
        if (typeof getWalletAddress === 'function') {
          walletAddress = getWalletAddress();
        } else if (window.walletAPIInstance && window.walletAPIInstance.isConnected()) {
          walletAddress = window.walletAPIInstance.getAddress();
        }
        
        if (!walletAddress) {
          log.warn('STORE MODAL', 'No wallet address for Game Pass tab');
          return;
        }
        
        // Get payment token
        let paymentToken = 'mews';
        if (typeof getStoreState === 'function') {
          const state = getStoreState();
          paymentToken = state.paymentToken || 'mews';
        } else if (typeof StoreService !== 'undefined' && StoreService.getState) {
          const state = StoreService.getState();
          paymentToken = state.paymentToken || 'mews';
        }
        
        // Get badge discount for Game Pass tab (uses store discount)
        const badgeDiscount = await getTabDiscount('gamePass', walletAddress);
        
        // Get game pass status - use preloaded status if available
        let gamePassStatus = null;
        if (window._preloadedGamePassStatus && window._preloadedGamePassStatus[walletAddress]) {
          // Use preloaded status (loaded during store initialization)
          gamePassStatus = window._preloadedGamePassStatus[walletAddress];
          log.debug('STORE MODAL', 'Using preloaded game pass status');
        } else if (window.GamePassService) {
          // Fallback: load status if not preloaded
          try {
            const status = await window.GamePassService.getGamePassStatus(walletAddress);
            if (status.success) {
              gamePassStatus = status;
            }
          } catch (error) {
            log.warn('STORE MODAL', 'Failed to get game pass status', error);
          }
        }
        
        // Render Game Pass tab
        await window.StoreGamePassTab.render(walletAddress, paymentToken, badgeDiscount, gamePassStatus);
        
        // Update badge display to show gameplay discount for Game Pass tab
        if (typeof loadStoreBadgeDisplay === 'function') {
          await loadStoreBadgeDisplay('gamePass');
        }
      } catch (error) {
        log.error('STORE MODAL', 'Error loading Game Pass tab', error);
        const container = document.getElementById('storeGamePassTabContent');
        if (container) {
          container.innerHTML = `
            <div class="store-placeholder">
              <p>❌ Error loading Game Pass</p>
              <p style="font-size: 0.9em; color: #888; margin-top: 10px;">
                ${error.message || 'Unknown error'}
              </p>
            </div>
          `;
        }
      }
    }
  } else if (tabName === 'tickets') {
    console.log('🎫 [STORE MODAL] Switching to Tournament Tickets tab');
    const ticketsTab = document.getElementById('storeTabContentTickets');
    const ticketsTabBtn = document.getElementById('storeTabTickets');
    
    console.log('🎫 [STORE MODAL] Tickets tab elements:', {
      ticketsTabExists: !!ticketsTab,
      ticketsTabBtnExists: !!ticketsTabBtn,
      storeTournamentTicketsTabExists: !!window.StoreTournamentTicketsTab,
    });
    
    if (ticketsTab) {
      ticketsTab.classList.add('active');
      console.log('✅ [STORE MODAL] Added active class to tickets tab content');
    } else {
      console.warn('⚠️ [STORE MODAL] Tickets tab content not found');
    }
    
    if (ticketsTabBtn) {
      ticketsTabBtn.classList.add('active');
      console.log('✅ [STORE MODAL] Added active class to tickets tab button');
    } else {
      console.warn('⚠️ [STORE MODAL] Tickets tab button not found');
    }
    
    // Load Tournament Tickets tab content
    if (!window.StoreTournamentTicketsTab) {
        log.error('STORE MODAL', 'StoreTournamentTicketsTab not loaded! Script may not be loaded yet.');
        const container = document.getElementById('storeTournamentTicketsTabContent');
        if (container) {
          container.innerHTML = `
            <div class="store-placeholder">
              <p>❌ Tournament Tickets module not loaded</p>
              <p style="font-size: 0.9em; color: #888; margin-top: 10px;">
                The tournament tickets script may not be loaded yet. Please wait a moment and try again, or refresh the page.
              </p>
              <button class="menu-btn" onclick="switchStoreTab('tickets')" style="margin-top: 10px;">
                <span class="btn-icon">🔄</span> Retry
              </button>
            </div>
          `;
        }
        return;
      }
      
      try {
        // Get wallet address
        let walletAddress = null;
        if (typeof getWalletAddress === 'function') {
          walletAddress = getWalletAddress();
        } else if (window.walletAPIInstance && window.walletAPIInstance.isConnected()) {
          walletAddress = window.walletAPIInstance.getAddress();
        }
        
        if (!walletAddress) {
          log.warn('STORE MODAL', 'No wallet address for Tournament Tickets tab');
          return;
        }
        
        // Get payment token
        let paymentToken = 'mews';
        if (typeof getStoreState === 'function') {
          const state = getStoreState();
          paymentToken = state.paymentToken || 'mews';
        } else if (typeof StoreService !== 'undefined' && StoreService.getState) {
          const state = StoreService.getState();
          paymentToken = state.paymentToken || 'mews';
        }
        
        // Get badge discount for Tickets tab (uses gameplay discount)
        const badgeDiscount = await getTabDiscount('tickets', walletAddress);
        
        // Get game pass status - use preloaded status if available
        let gamePassStatus = null;
        if (window._preloadedGamePassStatus && window._preloadedGamePassStatus[walletAddress]) {
          // Use preloaded status (loaded during store initialization)
          gamePassStatus = window._preloadedGamePassStatus[walletAddress];
          log.debug('STORE MODAL', 'Using preloaded game pass status for tickets');
        } else if (window.GamePassService) {
          // Fallback: load status if not preloaded
          try {
            const status = await window.GamePassService.getGamePassStatus(walletAddress);
            if (status.success) {
              gamePassStatus = status;
            }
          } catch (error) {
            log.warn('STORE MODAL', 'Failed to get game pass status for tickets', error);
          }
        }
        
        // Render Tournament Tickets tab
        console.log('🎫 [STORE MODAL] Calling StoreTournamentTicketsTab.render', {
          walletAddress,
          paymentToken,
          badgeDiscount,
          hasGamePassStatus: !!gamePassStatus,
        });
        await window.StoreTournamentTicketsTab.render(walletAddress, paymentToken, badgeDiscount, gamePassStatus);
        console.log('✅ [STORE MODAL] StoreTournamentTicketsTab.render completed');
        
        // Update badge display to show gameplay discount for Tickets tab
        if (typeof loadStoreBadgeDisplay === 'function') {
          await loadStoreBadgeDisplay('tickets');
        }
      } catch (error) {
        log.error('STORE MODAL', 'Error loading Tournament Tickets tab', error);
        const container = document.getElementById('storeTournamentTicketsTabContent');
        if (container) {
          container.innerHTML = `
            <div class="store-placeholder">
              <p>❌ Error loading Tournament Tickets</p>
              <p style="font-size: 0.9em; color: #888; margin-top: 10px;">
                ${error.message || 'Unknown error'}
              </p>
            </div>
          `;
        }
      }
  }
}

/**
 * Update store action buttons based on active tab and context
 * @param {string} activeTab - Active tab name ('items', 'gamePass', 'tickets')
 * @param {string} context - Store context ('main-menu', 'credits-only', 'gamePass')
 */
function updateStoreButtons(activeTab = 'items', context = 'main-menu') {
  const clearBtn = document.getElementById('clearSelectionBtn');
  const proceedBtn = document.getElementById('proceedToPurchaseBtn');
  const backToMenuBtn = document.getElementById('backToMenuBtn');
  const continueToGameBtn = document.getElementById('continueToGameBtn');
  const backToPreviousModalBtn = document.getElementById('backToPreviousModalBtn');
  
  // Hide all buttons first
  if (clearBtn) clearBtn.style.display = 'none';
  if (proceedBtn) proceedBtn.style.display = 'none';
  if (backToMenuBtn) backToMenuBtn.style.display = 'none';
  if (continueToGameBtn) continueToGameBtn.style.display = 'none';
  if (backToPreviousModalBtn) backToPreviousModalBtn.style.display = 'none';
  
  // Show buttons based on active tab and context
  if (activeTab === 'items') {
    // Items tab: show Clear Selection, Proceed to Purchase, and Back to Menu
    if (clearBtn) clearBtn.style.display = '';
    if (proceedBtn) proceedBtn.style.display = '';
    if (backToMenuBtn) backToMenuBtn.style.display = '';
  } else if (activeTab === 'inventory') {
    // Inventory tab: just show Back to Menu
    if (backToMenuBtn) backToMenuBtn.style.display = '';
  } else if (activeTab === 'gamePass' || activeTab === 'tickets') {
    // Game Pass or Tickets tabs: direct purchases, no proceed button needed
    
    // If in credits-only mode (from End Demo modal), check if we should show Continue/Back options
    if (context === 'credits-only' && window._endDemoPurchaseContext) {
      // Check if player now has credits (after purchase)
      let hasCredits = false;
      if (window.GamePassDisplay && window.GamePassDisplay._currentCredits > 0) {
        hasCredits = true;
      } else if (window._endDemoPurchaseContext.game) {
        // Check game state - if not in demo mode, they have credits
        hasCredits = !window._endDemoPurchaseContext.game.isDemoMode;
      }
      
      if (hasCredits) {
        // Show Continue to Game button
        if (continueToGameBtn) continueToGameBtn.style.display = '';
      } else {
        // Show Back to Previous Modal button
        if (backToPreviousModalBtn) backToPreviousModalBtn.style.display = '';
      }
    } else {
      // Normal mode: just show Back to Menu
      if (backToMenuBtn) backToMenuBtn.style.display = '';
    }
  }
}

/**
 * Continue to game after purchasing credits (from End Demo modal)
 */
async function continueToGameAfterPurchase() {
  if (window._endDemoPurchaseContext && typeof window._endDemoPurchaseContext.checkCreditsAndContinue === 'function') {
    await window._endDemoPurchaseContext.checkCreditsAndContinue();
    // Context will be cleared by checkCreditsAndContinue
  } else {
    // Fallback: just close store and return to game
    if (typeof hideStore === 'function') {
      hideStore();
    }
  }
}

/**
 * Back to previous modal (End Demo modal)
 */
function backToPreviousModal() {
  // Close store (won't show main menu in credits-only mode)
  if (typeof hideStore === 'function') {
    hideStore();
  }
  
  // The End Demo modal should be shown again by the context handler
  // This is handled in game-update.js when the store closes
  // The game should still be paused, so we can show the End Demo modal again
  if (window._endDemoPurchaseContext && window._endDemoPurchaseContext.game) {
    const game = window._endDemoPurchaseContext.game;
    const walletAddress = window._endDemoPurchaseContext.walletAddress;
    
    // Ensure game is still paused
    game.paused = true;
    
    // Show End Demo modal again after store closes
    setTimeout(() => {
      if (window.EndDemoModal && walletAddress) {
        // Re-check credits status
        let hasCredits = false;
        if (window.GamePassService) {
          window.GamePassService.getGamePassStatus(walletAddress, true).then((status) => {
            hasCredits = status.success && status.hasPass && status.isActive && (status.gamesRemaining || 0) > 0;
            
            // Get score using the same logic as the game UI overlay
            // Priority: _fallbackScore > secureGame.score > game.score getter
            let currentScore = 0;
            
            // First check _fallbackScore (most reliable after boss defeat)
            if (game._fallbackScore !== undefined && game._fallbackScore !== null && game._fallbackScore > 0) {
              currentScore = game._fallbackScore;
            }
            // Then check secureGame directly (from window.secureGame)
            else if (currentScore === 0 && typeof window !== 'undefined' && window.secureGame) {
              try {
                const directScore = window.secureGame.score;
                if (directScore > 0) {
                  currentScore = directScore;
                }
              } catch (e) {
                // Ignore errors accessing secureGame.score
              }
            }
            // Finally use game.score getter
            else if (currentScore === 0) {
              const getterScore = game.score;
              currentScore = (getterScore !== undefined && getterScore !== null && getterScore > 0) ? getterScore : 0;
            }
            
            window.EndDemoModal.show({
              playerAddress: walletAddress,
              score: currentScore,
              bossesDefeated: game.bossesDefeated,
              hasCredits: hasCredits,
            }).then((result) => {
              // Handle result - this will be processed by game-update.js logic
              // For now, just ensure game stays paused if they choose to purchase again
              if (result.action === 'purchase') {
                game.paused = true;
                if (typeof showStore === 'function') {
                  showStore('credits-only');
                }
              }
            });
          }).catch((error) => {
            console.warn('Error checking credits for End Demo modal', error);
            // Get score using the same logic as the game UI overlay
            // Priority: _fallbackScore > secureGame.score > game.score getter
            let currentScore = 0;
            
            // First check _fallbackScore (most reliable after boss defeat)
            if (game._fallbackScore !== undefined && game._fallbackScore !== null && game._fallbackScore > 0) {
              currentScore = game._fallbackScore;
            }
            // Then check secureGame directly (from window.secureGame)
            else if (currentScore === 0 && typeof window !== 'undefined' && window.secureGame) {
              try {
                const directScore = window.secureGame.score;
                if (directScore > 0) {
                  currentScore = directScore;
                }
              } catch (e) {
                // Ignore errors accessing secureGame.score
              }
            }
            // Finally use game.score getter
            else if (currentScore === 0) {
              const getterScore = game.score;
              currentScore = (getterScore !== undefined && getterScore !== null && getterScore > 0) ? getterScore : 0;
            }
            
            // Show modal anyway
            window.EndDemoModal.show({
              playerAddress: walletAddress,
              score: currentScore,
              bossesDefeated: game.bossesDefeated,
              hasCredits: false,
            });
          });
        } else {
          // Get score using the same logic as the game UI overlay
          let currentScore = game.score;
          if (currentScore === 0 && typeof secureGame !== 'undefined' && secureGame) {
            // Try to get score directly from secureGame if getter returns 0
            try {
              const directScore = secureGame.score;
              if (directScore > 0) {
                currentScore = directScore;
              }
            } catch (e) {
              // Ignore errors accessing secureGame.score
            }
          }
          if (currentScore === 0 && game._fallbackScore) {
            currentScore = game._fallbackScore;
          }
          
          // No GamePassService, show modal without credits
          window.EndDemoModal.show({
            playerAddress: walletAddress,
            score: currentScore,
            bossesDefeated: game.bossesDefeated,
            hasCredits: false,
          });
        }
      }
    }, 350); // Wait for store modal to finish closing
  }
}

// Expose globally
if (typeof window !== 'undefined') {
  window.showStoreInternal = showStoreInternal;
  window.loadStoreBadgeDisplay = loadStoreBadgeDisplay;
  window.switchStoreTab = switchStoreTab;
  window.updateStoreButtons = updateStoreButtons;
  window.continueToGameAfterPurchase = continueToGameAfterPurchase;
  window.backToPreviousModal = backToPreviousModal;
}

