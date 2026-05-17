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

/** Right column (≈1/3): cart panel on commerce tabs — duplicated markup, synced by updateStoreUI */
const _STORE_COMMERCE_CART_ASIDE_HTML = `
<aside class="store-commerce-cart" aria-label="Shopping cart">
  <div class="store-cart-sticky">
    <section class="store-selected-summary store-cart-panel" data-store-cart-panel>
      <h3 class="store-cart-heading">Cart</h3>
      <p class="store-cart-empty-hint" data-store-cart-empty>Your cart is empty. Add items or bundles from the list. Credit and ticket packs use Purchase on each card.</p>
      <div class="store-selected-items-list" data-selected-items-list></div>
      <div class="store-total store-cart-total" data-store-cart-total><span>Total: $0.00 (0 MEWS)</span></div>
      <button type="button" class="menu-btn primary store-cart-purchase-btn" data-store-cart-purchase onclick="proceedToPurchase()" style="display: none;" disabled>
        <span class="btn-icon">💳</span> Purchase
      </button>
    </section>
  </div>
</aside>`;

/**
 * Ordered phases for the full-store load (matches showStoreInternal sequence).
 * @param {string} context - 'main-menu' | 'credits-only' | etc.
 * @returns {Array<{ id: string, label: string }>}
 */
function buildStoreLoadSteps(context) {
  const surf = getStoreSurfaceRulesResolved(context);
  const steps = [];
  if (typeof window !== 'undefined' && window.StoreDataSources && window.StoreDataSources.fetchStoreCatalogRaw) {
    steps.push({ id: 'catalog', label: 'Syncing store catalog' });
  }
  if (context !== 'credits-only' && surf.loadItemsCatalog) {
    steps.push({ id: 'items', label: 'Loading store items' });
  }
  if (context !== 'credits-only') {
    steps.push({ id: 'inventory', label: 'Loading inventory' });
  }
  steps.push({ id: 'gamepass', label: 'Loading credits and tickets' });
  if (surf.preloadTicketsTab) {
    steps.push({ id: 'tickets', label: 'Loading tournament tickets' });
  }
  steps.push({ id: 'balance', label: 'Loading wallet balance' });
  steps.push({ id: 'badge', label: 'Loading badge' });
  if (surf.commerceFinalize) {
    steps.push({ id: 'finalize', label: 'Finalizing store' });
  }
  return steps;
}

function storeLoadingGoToStep(stepId) {
  // Store step-list/checklist loading UI removed for consistency with other loaders.
}

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
 * @returns {string}
 */
function getStoreUiContext() {
  let ctx = 'main-menu';
  if (typeof getStoreState === 'function') {
    const state = getStoreState();
    ctx = state?.context || 'main-menu';
  } else if (typeof StoreService !== 'undefined' && StoreService._state) {
    ctx = StoreService._state.context || 'main-menu';
  }
  return ctx;
}

/** @param {string} ctx */
function isPrepLoadoutContext(ctx) {
  if (typeof window !== 'undefined' && typeof window.isPrepLoadoutStoreContext === 'function') {
    return window.isPrepLoadoutStoreContext(ctx);
  }
  if (typeof window !== 'undefined' && window.StoreContextRules && typeof window.StoreContextRules.isPrepLoadoutContext === 'function') {
    return window.StoreContextRules.isPrepLoadoutContext(ctx);
  }
  return ctx === 'tournament-entry' || ctx === 'regular-entry';
}

/** New prep loadout store open: reset embedded item-selection state on next inventory mount. */
function bumpPrepLoadoutStoreSessionIfNeeded(context) {
  if (typeof window === 'undefined' || !isPrepLoadoutContext(context)) return;
  window.__prepLoadoutStoreOpenGeneration = (window.__prepLoadoutStoreOpenGeneration || 0) + 1;
}

/**
 * Resolved surface rules (delegates to StoreContextRules, or mirrors it if that module is unavailable).
 * @param {string} context
 */
function getStoreSurfaceRulesResolved(context) {
  if (typeof window !== 'undefined' && window.StoreContextRules && typeof window.StoreContextRules.getStoreSurfaceRules === 'function') {
    return window.StoreContextRules.getStoreSurfaceRules(context);
  }
  const prep = isPrepLoadoutContext(context);
  return {
    allowedTabKeys: prep ? ['inventory', 'items', 'bundles'] : null,
    showPaymentSelector: true,
    loadItemsCatalog: context !== 'credits-only',
    preloadTicketsTab: context !== 'credits-only' && !prep,
    commerceFinalize: context !== 'credits-only',
    useTournamentChrome: context === 'tournament-entry',
  };
}

/**
 * Tab strip, payment row, header/back labels, and tournament gold chrome.
 * Commerce tab visibility is driven by {@link StoreContextRules} (inventory / items / bundles vs full store).
 * @param {string} context
 */
function applyStoreContextChrome(context) {
  const storeModal = document.getElementById('storeModal');
  if (!storeModal) return;

  const surf = getStoreSurfaceRulesResolved(context);

  if (surf.useTournamentChrome) {
    storeModal.classList.add('store-modal--tournament-entry');
  } else {
    storeModal.classList.remove('store-modal--tournament-entry');
  }

  if (typeof window !== 'undefined' && window.StoreContextRules && window.StoreContextRules.applyCommerceTabStrip) {
    window.StoreContextRules.applyCommerceTabStrip(context);
  }

  const pay = document.querySelector('.store-modal .store-payment-selector');
  if (pay) pay.style.display = surf.showPaymentSelector ? '' : 'none';

  const back = document.getElementById('backToMenuBtn');
  const title = document.getElementById('storeTitle');

  if (surf.useTournamentChrome) {
    if (title) {
      const first = title.querySelector('span:first-child');
      if (first) first.textContent = '🏆 Tournament — loadout & purchases';
    }
    if (back) {
      back.setAttribute('onclick', 'cancelTournamentEntryStore()');
      back.innerHTML = '<span class="btn-icon">←</span> Back to Tournaments';
    }
  } else if (context === 'regular-entry') {
    if (title) {
      const first = title.querySelector('span:first-child');
      if (first) first.textContent = '🎮 Get ready — loadout & purchases';
    }
    if (back) {
      back.setAttribute('onclick', 'hideStore()');
      back.innerHTML = '<span class="btn-icon">←</span> Back to Menu';
    }
  } else {
    if (title) {
      const first = title.querySelector('span:first-child');
      if (first) first.textContent = '🛒 Store & Inventory';
    }
    if (back) {
      back.setAttribute('onclick', 'hideStore()');
      back.innerHTML = '<span class="btn-icon">←</span> Back to Menu';
    }
  }
}

function cancelTournamentEntryStore() {
  if (window.TournamentContext && typeof window.TournamentContext.clear === 'function') {
    window.TournamentContext.clear();
  }
  if (typeof hideStore === 'function') {
    hideStore({ returnToTournaments: true });
  }
}

async function startGameFromPrepLoadoutStore() {
  const btn = document.getElementById('continueToGameBtn');
  const originalHtml = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-icon">⏳</span> Starting...';
  }
  try {
    if (typeof window.checkoutPrepLoadoutItemSelection !== 'function') {
      alert('Item selection is not ready. Please refresh the page and try again.');
      return;
    }
    const ctx = getStoreUiContext();
    const isTournamentMode = ctx === 'tournament-entry';
    const checkout = await window.checkoutPrepLoadoutItemSelection({ isTournamentMode });
    if (!checkout || !checkout.ok) {
      return;
    }
    if (window.GameService && typeof window.GameService.startGame === 'function') {
      window.GameService._pendingPrepItemModalResult = {
        confirmed: true,
        items: checkout.items && typeof checkout.items === 'object' ? checkout.items : {},
      };
      const useTestMode = !!window.GameService._pendingPrepStartIsTest;
      if (useTestMode) {
        window.GameService._pendingPrepStartIsTest = false;
      }
      if (typeof showLoadingModal === 'function') {
        showLoadingModal('Starting game... Please wait', 'gameStartLoadingModal');
      }
      if (typeof hideStore === 'function') {
        hideStore({ skipMainMenuReveal: true });
      }
      if (useTestMode && typeof window.GameService.startGameTest === 'function') {
        await window.GameService.startGameTest();
      } else {
        await window.GameService.startGame();
      }
    } else {
      alert('Game could not be started. Please try Start Game from the main menu.');
    }
  } catch (e) {
    log.error('STORE MODAL', 'startGameFromPrepLoadoutStore failed', e);
    alert(e && e.message ? e.message : 'Could not start the game.');
    if (typeof hideLoadingModal === 'function') {
      hideLoadingModal('gameStartLoadingModal');
    }
    if (typeof MenuService !== 'undefined' && MenuService.show) {
      MenuService.show({ fromMenuPanel: true });
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      if (originalHtml) btn.innerHTML = originalHtml;
    }
  }
}

function handleStoreContinueToGameClick() {
  const ctx = getStoreUiContext();
  if (isPrepLoadoutContext(ctx)) {
    void startGameFromPrepLoadoutStore();
    return;
  }
  if (typeof continueToGameAfterPurchase === 'function') {
    void continueToGameAfterPurchase();
  }
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
      bumpPrepLoadoutStoreSessionIfNeeded(context);

      // Handle special contexts
      if (context === 'gamePass' || context === 'credits-only') {
        // Hide Items/Bundles/Tickets tabs for credits-only mode
        const itemsTab = document.getElementById('storeTabItems');
        const bundlesTab = document.getElementById('storeTabBundles');
        const ticketsTab = document.getElementById('storeTabTickets');
        const storeTabsContainer = document.getElementById('storeTabs');
        
        if (context === 'credits-only') {
          // Credits-only mode: hide Items, Bundles, and Tickets tabs
          if (itemsTab) itemsTab.style.display = 'none';
          if (bundlesTab) bundlesTab.style.display = 'none';
          if (ticketsTab) ticketsTab.style.display = 'none';
          if (storeTabsContainer) storeTabsContainer.style.justifyContent = 'center'; // Center the single tab
        } else {
          // Ensure tabs are visible if not in credits-only mode
          if (itemsTab) itemsTab.style.display = '';
          if (bundlesTab) bundlesTab.style.display = '';
          if (ticketsTab) ticketsTab.style.display = '';
          if (storeTabsContainer) storeTabsContainer.style.justifyContent = '';
        }
        
        // Switch to Game Pass tab and update buttons
        setTimeout(() => {
          switchStoreTab('gamePass');
        }, 100);
      } else {
        applyStoreContextChrome(context);
        updateStoreButtons('inventory', context);
        if (typeof switchStoreTab === 'function') {
          await switchStoreTab('inventory');
        }
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
        if (isPrepLoadoutContext(currentContext)) {
          log.debug('STORE MODAL', 'Click outside ignored in prep loadout — use Back or Start game');
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
    if (typeof MenuPanelLoading !== 'undefined' && MenuPanelLoading.show) {
      MenuPanelLoading.show('Refreshing store... Please wait');
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
        if (typeof MenuPanelLoading !== 'undefined' && MenuPanelLoading.hide) {
          MenuPanelLoading.hide();
        }
      }
    }, 100);
    return;
    }
  }
  
  // Show loading modal FIRST - before any loading starts
  if (typeof MenuPanelLoading !== 'undefined' && MenuPanelLoading.show) {
    MenuPanelLoading.show('Loading store... Please wait');
  }
  const storeLoadSteps = buildStoreLoadSteps(context);
  // Step-list/checklist loading UI removed for consistency with other loaders.

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
      <div class="store-header-spacer" aria-hidden="true"></div>
      <h2 id="storeTitle" class="store-header-title">
        <span>🛒 Store & Inventory</span>
        <span id="storeBadgeDisplay" class="store-badge-icon" style="display: none;"></span>
      </h2>
      <div class="store-header-actions">
        <button type="button" class="menu-btn store-header-back" onclick="hideStore()" id="backToMenuBtn">
          <span class="btn-icon">←</span> Back to Menu
        </button>
      </div>
    </div>
    
    <!-- Store Tabs -->
    <div class="store-tabs" id="storeTabs">
      <button class="store-tab active" onclick="switchStoreTab('inventory')" id="storeTabInventory">Inventory</button>
      <button class="store-tab" onclick="switchStoreTab('items')" id="storeTabItems">Items</button>
      <button class="store-tab" onclick="switchStoreTab('bundles')" id="storeTabBundles">Bundles</button>
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
            <img src="assets/SuiTwo_Profile.webp" alt="MEWS" class="token-icon" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';">
            <span class="token-fallback" style="display: none;">💰</span>
            <span>MEWS</span>
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
      <!-- Inventory Tab Content -->
      <div class="store-tab-content active" id="storeTabContentInventory">
        <div class="store-commerce-layout">
          <div class="store-commerce-products">
            <div id="storeInventoryTabContent">
              <div class="store-loading">
                <span class="btn-icon">⏳</span> Loading Inventory...
              </div>
            </div>
          </div>
          <aside class="store-commerce-cart inventory-merge-aside" aria-label="Item merge">
            <div class="store-cart-sticky">
              <section class="store-selected-summary store-cart-panel inventory-merge-panel" data-inventory-merge-panel>
                <h3 class="store-cart-heading">Merge</h3>
                <p class="store-cart-empty-hint" data-inventory-merge-hint>
                  Select an item level on the left to see merge options.
                </p>
                <div class="store-selected-items-list" data-inventory-merge-body></div>
              </section>
            </div>
          </aside>
        </div>
      </div>
      
      <!-- Items Tab Content -->
      <div class="store-tab-content store-tab-content-commerce" id="storeTabContentItems">
        <div class="store-commerce-layout">
          <div class="store-commerce-products">
            <div class="store-items-container" id="storeItemsContainer">
              <div class="store-loading" id="storeLoading">
                <span class="btn-icon">⏳</span> Loading store items...
              </div>
            </div>
          </div>
          ${_STORE_COMMERCE_CART_ASIDE_HTML}
        </div>
      </div>

      <!-- Bundles Tab Content -->
      <div class="store-tab-content store-tab-content-commerce" id="storeTabContentBundles">
        <div class="store-commerce-layout">
          <div class="store-commerce-products">
            <div id="storeBundlesTabContent">
              <div class="store-loading">
                <span class="btn-icon">⏳</span> Loading Bundles...
              </div>
            </div>
          </div>
          ${_STORE_COMMERCE_CART_ASIDE_HTML}
        </div>
      </div>
      
      <!-- Game Pass Tab Content -->
      <div class="store-tab-content store-tab-content-commerce" id="storeTabContentGamePass">
        <div class="store-commerce-layout store-commerce-layout--single-column">
          <div class="store-commerce-products">
            <div id="storeGamePassTabContent">
              <div class="store-loading">
                <span class="btn-icon">⏳</span> Loading credits and options...
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Tournament Tickets Tab Content -->
      <div class="store-tab-content store-tab-content-commerce" id="storeTabContentTickets">
        <div class="store-commerce-layout store-commerce-layout--single-column">
          <div class="store-commerce-products">
            <div id="storeTournamentTicketsTabContent">
              <div class="store-loading">
                <span class="btn-icon">⏳</span> Loading Tournament Tickets...
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Store Actions -->
    <div class="store-actions" id="storeActions">
      <button class="menu-btn" onclick="clearStoreSelection()" id="clearSelectionBtn" style="display: none;">
        <span class="btn-icon">🗑️</span> Clear Selection
      </button>
      <button class="menu-btn primary" onclick="handleStoreContinueToGameClick()" id="continueToGameBtn" style="display: none;">
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

    // Don't close if clicking merge controls (merge buttons live inside the Inventory tab,
    // but can be re-rendered during the click, making `storeModal.contains(event.target)` unreliable).
    if (
      event.target.closest('.inventory-merge-btn') ||
      event.target.closest('[data-inventory-merge-panel]') ||
      event.target.closest('[data-inventory-merge-zone]')
    ) {
      return;
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
      if (isPrepLoadoutContext(context)) {
        log.debug('STORE MODAL', 'Click outside ignored in prep loadout — use Back or Start game');
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
    // Warm catalog for store tabs. Use short-lived cache for fast modal open,
    // and avoid forced refreshes during store open (cached store should open without network).
    if (typeof window !== 'undefined' && window.StoreDataSources && window.StoreDataSources.fetchStoreCatalogRaw) {
      try {
        storeLoadingGoToStep('catalog');
        // Uses `window.STORE_CATALOG_CACHE_TTL_MS` (set in ui-initialization.js, default 1h); often a hit after menu bootstrap prefetch.
        const catalog = await window.StoreDataSources.fetchStoreCatalogRaw();
        // If cache was missing or the cached call failed, do a single forced fetch (still awaited)
        // so the store has usable catalog data.
        if (!catalog || catalog.success !== true) {
          await window.StoreDataSources.fetchStoreCatalogRaw({ forceFetch: true });
        }
      } catch (e) {
        // Non-fatal: store can still open; tabs will fallback to empty states.
        console.warn('[STORE MODAL] Failed to refresh store catalog', e);
      }
    }

    let walletAddress = null;
    if (typeof getWalletAddress === 'function') {
      walletAddress = getWalletAddress();
    } else if (window.walletAPIInstance && window.walletAPIInstance.isConnected()) {
      walletAddress = window.walletAPIInstance.getAddress();
    }

    /** When true, inventory + game pass UI were hydrated from cache or combined menu snapshot for this open */
    let storeBundleLoadedGamePass = false;

    const surf = getStoreSurfaceRulesResolved(context);

    if (context === 'credits-only') {
      storeLoadingGoToStep('gamepass');
    } else {
      storeLoadingGoToStep('items');
    }

    if (surf.loadItemsCatalog) {
      if (typeof loadStoreItems === 'function') {
        await loadStoreItems();
      }
    }

    if (context !== 'credits-only') {
      storeLoadingGoToStep('inventory');
      if (walletAddress) {
        try {
          // If we already have fresh inventory + cached credits/tickets, skip extra network calls.
          const cachedInv = window.PlayerInventoryCache?.getFreshOrNull?.(walletAddress) || null;
          const cachedGp =
            (window._preloadedGamePassStatus && window._preloadedGamePassStatus[walletAddress]) || null;

          if (cachedInv && typeof loadInventoryDisplay === 'function') {
            await loadInventoryDisplay(cachedInv);
          }
          if (cachedGp && cachedGp.success) {
            const credits = cachedGp.gamesRemaining ?? cachedGp.credits ?? 0;
            const tickets = cachedGp.ticketCount ?? 0;
            if (window.GamePassDisplay) {
              if (typeof window.GamePassDisplay.updateMainMenuDisplay === 'function') {
                window.GamePassDisplay.updateMainMenuDisplay(credits, tickets);
              }
              if (typeof window.GamePassDisplay.updateStoreDisplay === 'function') {
                window.GamePassDisplay.updateStoreDisplay(credits, tickets);
              }
            }
            storeBundleLoadedGamePass = true;
          }

          if (!cachedInv || !storeBundleLoadedGamePass) {
            const bundle =
              window.PlayerInventoryCache?.fetchPlayerInventoryAndCache
                ? await window.PlayerInventoryCache.fetchPlayerInventoryAndCache(walletAddress)
                : await (async () => {
                    const baseRaw = window.GameApi ? window.GameApi.getBaseUrl() : (window.GAME_CONFIG?.GAME_BACKEND_URL || window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3001/api');
                    const base = String(baseRaw).replace(/\/?$/, '');
                    // Combined inventory + game pass (legacy route segment on game backend)
                    const res = await fetch(`${base}/player/reservoir-bundle/${walletAddress}?contract=new`);
                    return await res.json().catch(() => null);
                  })();
            if (bundle && bundle.success && bundle.gamePass) {
              if (typeof loadInventoryDisplay === 'function') {
                await loadInventoryDisplay(bundle.inventory || {});
              }
              const gp = bundle.gamePass;
              const credits = gp.gamesRemaining ?? 0;
              const tickets = gp.ticketCount ?? 0;
              if (window.GamePassDisplay) {
                if (typeof window.GamePassDisplay.updateMainMenuDisplay === 'function') {
                  window.GamePassDisplay.updateMainMenuDisplay(credits, tickets);
                }
                if (typeof window.GamePassDisplay.updateStoreDisplay === 'function') {
                  window.GamePassDisplay.updateStoreDisplay(credits, tickets);
                }
              }
              if (!window._preloadedGamePassStatus) window._preloadedGamePassStatus = {};
              window._preloadedGamePassStatus[walletAddress] = {
                success: true,
                gamesRemaining: credits,
                ticketCount: tickets,
                hasPass: gp.hasPass,
                isActive: gp.isActive,
                packType: gp.packType,
              };
              storeBundleLoadedGamePass = true;
            } else if (typeof loadInventoryDisplay === 'function') {
              await loadInventoryDisplay();
            }
          }
        } catch (e) {
          log.warn('STORE MODAL', 'Menu snapshot / inventory hydrate failed; falling back to inventory + reservoir APIs', e);
          if (typeof loadInventoryDisplay === 'function') {
            await loadInventoryDisplay();
          }
        }
      } else if (typeof loadInventoryDisplay === 'function') {
        await loadInventoryDisplay();
      }
    }

    storeLoadingGoToStep('gamepass');

    if (walletAddress && typeof GamePassService !== 'undefined' && GamePassService.getGamePassStatus && !storeBundleLoadedGamePass) {
      try {
        // Balances are wallet-specific and should already be prefetched on wallet connect and on main menu load.
        // Do not force-refresh here; it causes redundant backend calls when user goes menu -> store -> menu.
        let gamePassStatus =
          (window._preloadedGamePassStatus && window._preloadedGamePassStatus[walletAddress]) || null;
        if (gamePassStatus) {
          log.debug('STORE MODAL', 'Using cached game pass status', { success: gamePassStatus.success });
        } else {
          gamePassStatus = await GamePassService.getGamePassStatus(walletAddress, false);
          log.debug('STORE MODAL', 'Game pass status fetched (no cache present)', gamePassStatus);
        }
        
        // Store the status for use by Game Pass tab and display
        if (gamePassStatus.success) {
          const credits = gamePassStatus.gamesRemaining ?? gamePassStatus.credits ?? 0;
          const tickets = gamePassStatus.ticketCount ?? 0;
          if (window.GamePassDisplay) {
            if (typeof window.GamePassDisplay.updateMainMenuDisplay === 'function') {
              window.GamePassDisplay.updateMainMenuDisplay(credits, tickets);
            }
            if (typeof window.GamePassDisplay.updateStoreDisplay === 'function') {
              window.GamePassDisplay.updateStoreDisplay(credits, tickets);
            }
          }
          if (!window._preloadedGamePassStatus) window._preloadedGamePassStatus = {};
          window._preloadedGamePassStatus[walletAddress] = gamePassStatus;
        }
      } catch (error) {
        log.warn('STORE MODAL', 'Error loading game pass status', error);
        // Don't fail the entire store load if game pass fails
      }
    }
    
    // Tournament Tickets tab content — only when that tab exists in this surface (see StoreContextRules)
    if (surf.preloadTicketsTab) {
      storeLoadingGoToStep('tickets');
      // Note: Tournament tickets are stored in the GamePass object's tournament_tickets field
      // The backend's getGamePassStatus() currently doesn't extract tickets, but when it does,
      // they will be available in the gamePassStatus object above
      // For now, tickets are prepared to be loaded as part of game pass status
      // Future: Backend needs to extract tournament_tickets Table from GamePass object and return it
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
    bumpPrepLoadoutStoreSessionIfNeeded(context);

    // All data loaded - now show the modal
    storeModal.classList.remove('store-modal-hidden');
    storeModal.classList.add('store-modal-visible');
    
    applyStoreContextChrome(context);
    
    // Update buttons based on initial tab (inventory is default)
    updateStoreButtons('inventory', context);
    
    // Initialize inventory tab content
    if (typeof switchStoreTab === 'function') {
      await switchStoreTab('inventory');
    }

    // Dismiss the full-store loading overlay as soon as the modal + default tab are usable.
    // Balance and pending-upgrade badge checks are quick follow-ups (network); they should not block the overlay.
    storeLoadingGoToStep('balance');
    if (typeof MenuPanelLoading !== 'undefined' && MenuPanelLoading.hide) {
      MenuPanelLoading.hide();
    }
    if (typeof updateStoreBalance === 'function') {
      void updateStoreBalance().catch((e) =>
        log.warn('STORE MODAL', 'Balance update after store open failed', e)
      );
    }

    storeLoadingGoToStep('badge');
    const defaultTabForBadge =
      context === 'credits-only' ? 'gamePass' : isPrepLoadoutContext(context) ? 'inventory' : 'items';
    if (typeof loadStoreBadgeDisplay === 'function') {
      void loadStoreBadgeDisplay(defaultTabForBadge).catch((e) =>
        log.warn('STORE MODAL', 'Badge display load failed', e)
      );
    }

    if (surf.commerceFinalize) {
      storeLoadingGoToStep('finalize');
      if (typeof updateStoreUI === 'function') {
        await updateStoreUI();
      }
    }
    
    // Handle special contexts (credits-only or gamePass)
    if (context === 'gamePass' || context === 'credits-only') {
      // Hide Items/Bundles/Tickets tabs for credits-only mode
      const itemsTab = document.getElementById('storeTabItems');
      const bundlesTab = document.getElementById('storeTabBundles');
      const ticketsTab = document.getElementById('storeTabTickets');
      const storeTabsContainer = document.getElementById('storeTabs');
      
      if (context === 'credits-only') {
        // Credits-only mode: hide Items, Bundles, Inventory, and Tickets tabs
        const inventoryTab = document.getElementById('storeTabInventory');
        if (itemsTab) itemsTab.style.display = 'none';
        if (bundlesTab) bundlesTab.style.display = 'none';
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
        // Hide Items/Bundles/Tickets tabs for credits-only mode
        const itemsTab = document.getElementById('storeTabItems');
        const bundlesTab = document.getElementById('storeTabBundles');
        const ticketsTab = document.getElementById('storeTabTickets');
        const storeTabsContainer = document.getElementById('storeTabs');
        
        if (context === 'credits-only') {
          // Credits-only mode: hide Items, Bundles, and Tickets tabs
          if (itemsTab) itemsTab.style.display = 'none';
          if (bundlesTab) bundlesTab.style.display = 'none';
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
    if (typeof MenuPanelLoading !== 'undefined' && MenuPanelLoading.hide) {
      MenuPanelLoading.hide();
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
        const tier =
          typeof window.normalizeStoreBadgeTier === 'function'
            ? (window.normalizeStoreBadgeTier(badge.tier) ?? 0)
            : (Number.isFinite(Number(badge.tier)) ? Math.max(0, Math.floor(Number(badge.tier))) : 0);
        const badgeTitle = badge.name || `Tier ${tier} Badge`;
        
        // Get badge image URL - follow same pattern as badge-ui.js
        let imageSrc = null;
        const tierNames = ['Standard', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
        const tierName = tierNames[tier] || 'Standard';
        // Badge images are served from the frontend origin (same app)
        const badgeBase = window.GAME_CONFIG?.BADGE_IMAGE_BASE_URL || window.location?.origin || '';
        const baseUrl = badgeBase.replace(/\/api\/?$/, '');
        
        // First, try to use imageUrl from badge
        if (badge.imageUrl && typeof badge.imageUrl === 'string' && (badge.imageUrl.startsWith('http://') || badge.imageUrl.startsWith('https://'))) {
          imageSrc = badge.imageUrl;
          log.debug('STORE MODAL', 'Using badge imageUrl', imageSrc);
        } else {
          // Fallback: Construct URL from tier
          const constructedUrl = baseUrl ? `${baseUrl}/Badges/${tierName}.webp` : '';
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
        
        const discounts = badge.discounts && typeof badge.discounts === 'object' ? badge.discounts : { store: 0, gameplay: 0 };
        const tabDiscount =
          activeTab === 'gamePass' || activeTab === 'tickets'
            ? (typeof discounts.gameplay === 'number' ? discounts.gameplay : 0)
            : typeof window.getStoreBadgeDiscountPercent === 'function'
              ? window.getStoreBadgeDiscountPercent(badge)
              : (typeof discounts.store === 'number' ? discounts.store : 0);

        const fallbackUrl = baseUrl ? `${baseUrl}/Badges/${tierName}.webp` : '';

        const emb =
          badgeData.pendingUpgrade ||
          (typeof GameDataState !== 'undefined' &&
            GameDataState.walletAddress === walletAddress &&
            GameDataState.badge &&
            GameDataState.badge.pendingUpgrade) ||
          null;
        const hasEmbeddedPending = emb && typeof emb === 'object' && typeof emb.success === 'boolean';
        let hasPendingUpgrade = false;
        let upgradeData = null;
        if (hasEmbeddedPending && emb.success && emb.hasPendingUpgrade && emb.badgeId && walletAddress) {
          hasPendingUpgrade = true;
          const oldTier = badge.tier;
          const newTier = emb.newTier != null ? emb.newTier : oldTier + 1;
          const newTierName = window.BadgeService ? window.BadgeService.getTierName(newTier) : 'Unknown';
          upgradeData = {
            oldTier,
            newTier,
            newTierName,
            badgeId: emb.badgeId,
            sessionId: `upgrade_${walletAddress}_${Date.now()}`,
          };
        }

        const paintStoreBadgeHeader = (hasPH, upg) => {
          let imageHTML = '';
          if (imageSrc) {
            const imgTag = `<img src="${imageSrc}" alt="${badgeTitle}" class="store-badge-icon-image" 
                 onerror="this.onerror=null; this.src='${fallbackUrl}';" />`;
            imageHTML = typeof window.wrapBadgeImageWithUpgrade === 'function'
              ? window.wrapBadgeImageWithUpgrade(imgTag, hasPH, 'store-badge-image-container', 'store-badge-icon-image')
              : `<div class="store-badge-image-container">${imgTag}</div>`;
          } else {
            imageHTML = `<span class="store-badge-icon-placeholder">🎖️</span>`;
          }

          badgeDisplayContainer.innerHTML = `
          <div class="store-badge-icon-wrapper ${hasPH ? 'store-badge-has-upgrade store-badge-clickable' : ''}" ${hasPH && upg ? `title="Click to upgrade your badge to ${upg.newTierName}"` : ''}>
            ${imageHTML}
            <div class="store-badge-content">
              <div class="store-badge-text">
                <div class="store-badge-tier">${tierName}</div>
                ${tabDiscount > 0 ? `<div class="store-badge-discount">${tabDiscount}% off</div>` : ''}
              </div>
            </div>
          </div>
        `;

          badgeDisplayContainer.style.display = 'inline-block';
          badgeDisplayContainer.title = badgeTitle;

          if (hasPH && upg) {
            const badgeWrapper = badgeDisplayContainer.querySelector('.store-badge-icon-wrapper');
            if (badgeWrapper) {
              badgeWrapper.style.cursor = 'pointer';
              badgeWrapper.addEventListener('click', async () => {
                log.debug('STORE MODAL', 'Store badge display clicked for upgrade', upg);

                let storeContext = 'main-menu';
                if (typeof StoreService !== 'undefined' && StoreService._state) {
                  storeContext = StoreService._state.context || 'main-menu';
                }

                const storeModal = document.getElementById('storeModal');
                if (storeModal) {
                  if (typeof StoreService !== 'undefined') {
                    if (StoreService._clickOutsideHandler) {
                      document.removeEventListener('click', StoreService._clickOutsideHandler);
                      StoreService._clickOutsideHandler = null;
                      log.debug('STORE MODAL', 'Removed click-outside handler before showing badge upgrade modal');
                    }
                  }

                  storeModal.classList.remove('store-modal-visible');
                  storeModal.classList.add('store-modal-hidden');
                  log.debug('STORE MODAL', 'Hiding store modal for badge upgrade');
                }

                if (window.BadgeUI && window.BadgeUI.showTierUpgradeModal) {
                  window.BadgeUI.showTierUpgradeModal({
                    oldTier: upg.oldTier,
                    newTier: upg.newTier,
                    newTierName: upg.newTierName,
                    badgeId: upg.badgeId,
                    sessionId: upg.sessionId,
                    context: 'store',
                    onUpgradeComplete: async (upgraded) => {
                      log.debug('STORE MODAL', 'Badge upgrade modal closed, reopening store', { upgraded });

                      if (upgraded) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                        if (window.BadgeService && typeof window.BadgeService.clearBadgeCache === 'function') {
                          window.BadgeService.clearBadgeCache();
                        }
                        if (typeof GameDataState !== 'undefined' && GameDataState.badge?.pendingUpgrade) {
                          const { pendingUpgrade: _omit, ...rest } = GameDataState.badge;
                          GameDataState.setBadge(rest);
                        }
                      }

                      const mainMenu = document.getElementById('mainMenuOverlay');
                      if (mainMenu) {
                        mainMenu.classList.add('main-menu-overlay-hidden');
                        mainMenu.classList.remove('main-menu-overlay-visible');
                      }

                      await new Promise(resolve => setTimeout(resolve, 100));

                      let storeModalAfter = document.getElementById('storeModal');
                      if (storeModalAfter) {
                        log.debug('STORE MODAL', 'Store modal exists, showing and refreshing');
                        storeModalAfter.classList.remove('store-modal-hidden');
                        storeModalAfter.classList.add('store-modal-visible');

                        setTimeout(() => {
                          if (typeof StoreService !== 'undefined' && StoreService._setupClickOutsideHandler) {
                            StoreService._setupClickOutsideHandler(storeModalAfter);
                          }
                        }, 50);

                        if (typeof StoreService !== 'undefined') {
                          if (typeof MenuPanelLoading !== 'undefined' && MenuPanelLoading.show) {
                            MenuPanelLoading.show('Refreshing store... Please wait');
                          }
                          try {
                            if (StoreService._loadInventoryDisplay) {
                              await StoreService._loadInventoryDisplay();
                            }
                            if (StoreService._updateBalance) {
                              await StoreService._updateBalance();
                            }
                            if (StoreService._updateUI) {
                              await StoreService._updateUI();
                            }
                          } finally {
                            if (typeof MenuPanelLoading !== 'undefined' && MenuPanelLoading.hide) {
                              MenuPanelLoading.hide();
                            }
                          }
                        }
                      } else {
                        log.debug('STORE MODAL', 'Store modal not found, recreating');
                        if (typeof StoreService !== 'undefined' && StoreService._showInternal) {
                          await StoreService._showInternal(storeContext);
                        } else if (typeof showStoreInternal === 'function') {
                          await showStoreInternal(storeContext);
                        } else if (typeof showStore === 'function') {
                          await showStore(storeContext, true);
                        }
                      }

                      await new Promise(resolve => setTimeout(resolve, 200));

                      if (typeof loadStoreBadgeDisplay === 'function') {
                        await loadStoreBadgeDisplay(activeTab);
                      }
                    },
                  });
                }
              });
            }
          }
        };

        paintStoreBadgeHeader(hasPendingUpgrade, upgradeData);
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
      const d = badge.badge.discounts && typeof badge.badge.discounts === 'object' ? badge.badge.discounts : null;
      if (!d) return 0;
      if (tabName === 'gamePass' || tabName === 'tickets') {
        return typeof d.gameplay === 'number' && Number.isFinite(d.gameplay) ? Math.max(0, d.gameplay) : 0;
      }
      return typeof d.store === 'number' && Number.isFinite(d.store) ? Math.max(0, d.store) : 0;
    }
  } catch (error) {
    log.warn('STORE MODAL', `Failed to get badge discount for ${tabName} tab`, error);
  }
  
  return 0;
}

/**
 * Switch between store tabs
 * @param {string} tabName - Tab name ('inventory', 'items', 'bundles', 'gamePass', 'tickets')
 */
async function switchStoreTab(tabName) {
  console.log('🔄 [STORE MODAL] switchStoreTab called', tabName);
  
  const context = getStoreUiContext();
  if (
    typeof window !== 'undefined' &&
    window.StoreContextRules &&
    typeof window.StoreContextRules.isTabAllowed === 'function' &&
    !window.StoreContextRules.isTabAllowed(context, tabName)
  ) {
    log.debug('STORE MODAL', 'Tab not allowed for store context', { context, tabName });
    return;
  }
  
  // Update buttons based on active tab
  updateStoreButtons(tabName, context);
  
  // For credits-only mode, ensure only Game Pass tab is accessible
  const itemsTab = document.getElementById('storeTabItems');
  const bundlesTab = document.getElementById('storeTabBundles');
  const inventoryTab = document.getElementById('storeTabInventory');
  const ticketsTab = document.getElementById('storeTabTickets');
  const gamePassTab = document.getElementById('storeTabGamePass');
  
  // If tabs are hidden (credits-only mode), prevent switching to them
  if (tabName === 'items' && itemsTab && itemsTab.style.display === 'none') {
    console.warn('🔄 [STORE MODAL] Items tab is hidden in credits-only mode');
    return;
  }
  if (tabName === 'bundles' && bundlesTab && bundlesTab.style.display === 'none') {
    console.warn('🔄 [STORE MODAL] Bundles tab is hidden in credits-only mode');
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
  } else if (tabName === 'bundles') {
    const bundlesTab = document.getElementById('storeTabContentBundles');
    const bundlesTabBtn = document.getElementById('storeTabBundles');
    if (bundlesTab) bundlesTab.classList.add('active');
    if (bundlesTabBtn) bundlesTabBtn.classList.add('active');

    if (window.StoreBundlesTab) {
      try {
        await window.StoreBundlesTab.render();
        if (typeof loadStoreBadgeDisplay === 'function') {
          await loadStoreBadgeDisplay('bundles');
        }
      } catch (error) {
        log.error('STORE MODAL', 'Error loading Bundles tab', error);
        const container = document.getElementById('storeBundlesTabContent');
        if (container) {
          container.innerHTML = `
            <div class="store-placeholder">
              <p>❌ Error loading Bundles</p>
              <p style="font-size: 0.9em; color: #888; margin-top: 10px;">
                ${error.message || 'Unknown error'}
              </p>
            </div>
          `;
        }
      }
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
              <p>❌ Error loading credits and tickets</p>
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
 * @param {string} activeTab - Active tab name ('items', 'bundles', 'gamePass', 'tickets')
 * @param {string} context - Store context ('main-menu', 'credits-only', 'gamePass')
 */
function updateStoreButtons(activeTab = 'items', context = 'main-menu') {
  const clearBtn = document.getElementById('clearSelectionBtn');
  const backToMenuBtn = document.getElementById('backToMenuBtn');
  const continueToGameBtn = document.getElementById('continueToGameBtn');
  const backToPreviousModalBtn = document.getElementById('backToPreviousModalBtn');
  const cartPurchaseBtns = document.querySelectorAll('[data-store-cart-purchase]');

  const setCartPurchaseVisible = (on) => {
    cartPurchaseBtns.forEach((b) => {
      b.style.display = on ? '' : 'none';
    });
  };

  // Hide all buttons first
  if (clearBtn) clearBtn.style.display = 'none';
  if (backToMenuBtn) backToMenuBtn.style.display = 'none';
  if (continueToGameBtn) continueToGameBtn.style.display = 'none';
  if (backToPreviousModalBtn) backToPreviousModalBtn.style.display = 'none';
  setCartPurchaseVisible(false);

  // Show buttons based on active tab and context
  if (activeTab === 'items' || activeTab === 'bundles') {
    if (clearBtn) clearBtn.style.display = '';
    if (backToMenuBtn) backToMenuBtn.style.display = '';
    setCartPurchaseVisible(true);
    if (isPrepLoadoutContext(context) && continueToGameBtn) {
      continueToGameBtn.style.display = '';
      continueToGameBtn.innerHTML = '<span class="btn-icon">▶️</span> Start game';
    }
  } else if (activeTab === 'inventory') {
    if (isPrepLoadoutContext(context)) {
      if (backToMenuBtn) backToMenuBtn.style.display = '';
      if (continueToGameBtn) {
        continueToGameBtn.style.display = '';
        continueToGameBtn.innerHTML = '<span class="btn-icon">▶️</span> Start game';
      }
    } else if (backToMenuBtn) {
      backToMenuBtn.style.display = '';
    }
  } else if (activeTab === 'gamePass' || activeTab === 'tickets') {
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
          window.GamePassService.getCreditsAndTickets(walletAddress, true).then((status) => {
            hasCredits = status.success && (status.credits || 0) > 0;
            
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
  window.applyStoreContextChrome = applyStoreContextChrome;
  window.getStoreUiContext = getStoreUiContext;
  window.cancelTournamentEntryStore = cancelTournamentEntryStore;
  window.startGameFromPrepLoadoutStore = startGameFromPrepLoadoutStore;
  window.startGameFromTournamentEntryStore = startGameFromPrepLoadoutStore;
  window.handleStoreContinueToGameClick = handleStoreContinueToGameClick;
}

