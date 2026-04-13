// ==========================================
// ITEM CONSUMPTION SYSTEM
// ==========================================
// Handles item selection and consumption before game start
// Enforces "one item type per game" rule

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

// Game item selection state (for consumption, not purchase)
// Format: { itemId: level } or { itemId: true } for single-level items
let gameItemSelection = {
  extra_lives: null,        // null or level (1, 2, or 3)
  force_field: null,        // null or level (1, 2, or 3)
  orb_level: null,          // null or level (1, 2, or 3)
  slow_time: null,         // null or level (1, 2, or 3)
  destroy_all: false,       // boolean (single level)
  boss_kill_shot: false,     // boolean (single level)
  coin_tractor_beam: null    // null or level (1, 2, or 3)
};

let _lastPrepConsumptionMountGen = -1;

/**
 * DOM scope for consumption modal only (prep loadout uses inventory rows, not a second list).
 * @returns {HTMLElement | null}
 */
function _getConsumptionDOMRoot() {
  const modal = document.getElementById('itemConsumptionModal');
  return modal || null;
}

/**
 * New prep store open: reset run item selection. Caller should clear StoreInventoryTab._selected.
 * @returns {boolean} True if this open was a new session (selection was reset).
 */
function prepLoadoutOnInventoryRenderMaybeResetSession() {
  if (typeof window === 'undefined') return false;
  const gen = window.__prepLoadoutStoreOpenGeneration || 0;
  if (gen !== _lastPrepConsumptionMountGen) {
    _lastPrepConsumptionMountGen = gen;
    gameItemSelection = _defaultGameItemSelection();
    return true;
  }
  return false;
}

/** Prep: one inventory row = run loadout for that stack (single type/level). */
function setPrepLoadoutGameItemSelectionFromRow(itemType, levelNum) {
  gameItemSelection = _defaultGameItemSelection();
  if (itemType === 'destroy_all' || itemType === 'boss_kill_shot') {
    gameItemSelection[itemType] = true;
  } else {
    gameItemSelection[itemType] = levelNum;
  }
}

function clearPrepLoadoutGameItemSelection() {
  gameItemSelection = _defaultGameItemSelection();
}

function _defaultGameItemSelection() {
  return {
    extra_lives: null,
    force_field: null,
    orb_level: null,
    slow_time: null,
    destroy_all: false,
    boss_kill_shot: false,
    coin_tractor_beam: null,
  };
}

/**
 * Refresh inventory from backend for validating checkout (same as confirm path).
 * @param {string | null} walletAddress
 * @returns {Promise<Record<string, number>>}
 */
async function fetchFreshBlockchainInventoryForConsumption(walletAddress) {
  let blockchainInventory = {};
  if (!walletAddress) return blockchainInventory;
  try {
    if (window.PlayerInventoryCache && typeof window.PlayerInventoryCache.fetchReservoirBundleAndCache === 'function') {
      await window.PlayerInventoryCache.fetchReservoirBundleAndCache(walletAddress, { forceRefresh: true }).catch(() => null);
      const inv = window.PlayerInventoryCache.getFreshOrNull ? window.PlayerInventoryCache.getFreshOrNull(walletAddress) : null;
      blockchainInventory = inv || {};
    } else {
      const base = window.GameApi ? window.GameApi.getBaseUrl() : (window.GAME_CONFIG?.GAME_BACKEND_URL || window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3001/api');
      const inventoryUrl = `${base}/inventory/${walletAddress}?contract=new`;
      const response = await fetch(inventoryUrl);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.inventory != null) blockchainInventory = data.inventory;
      }
    }
  } catch (error) {
    log.warn('CONSUMPTION', 'Error fetching inventory for validation', error);
  }
  return blockchainInventory;
}

/**
 * Build items to consume from current gameItemSelection and validate against inventory.
 * @param {string | null} walletAddress
 * @returns {Promise<{ itemsToConsume: Record<string, number>; errors: string[] }>}
 */
async function validateGameItemSelectionAgainstInventory(walletAddress) {
  const blockchainInventory = await fetchFreshBlockchainInventoryForConsumption(walletAddress);
  const itemsToConsume = {};
  const errors = [];

  for (const [itemId, level] of Object.entries(gameItemSelection)) {
    if (level !== null && level !== false) {
      const actualLevel = level === true ? 1 : level;
      const itemKey = `${itemId}_${actualLevel}`;

      let count = blockchainInventory[itemKey] || 0;

      if (count === 0 && typeof getItemCount === 'function') {
        count = getItemCount(itemId, actualLevel, walletAddress);
      }

      if (count <= 0) {
        const errorMsg = `${getItemName(itemId)} Level ${actualLevel} not in inventory`;
        log.error('CONSUMPTION', errorMsg);
        errors.push(errorMsg);
        continue;
      }

      itemsToConsume[itemId] = actualLevel;
    }
  }

  return { itemsToConsume, errors };
}

/**
 * Prep loadout store: validate current embedded selections (no modal). Used before GameService.startGame.
 * @returns {Promise<{ ok: boolean; items: Record<string, number> }>}
 */
async function checkoutPrepLoadoutItemSelection(options = {}) {
  void options;
  let walletAddress = null;
  if (typeof getWalletAddress === 'function') {
    walletAddress = getWalletAddress();
  } else if (window.walletAPIInstance && window.walletAPIInstance.isConnected()) {
    walletAddress = window.walletAPIInstance.getAddress();
  }

  if (!walletAddress) {
    return { ok: true, items: {} };
  }

  const { itemsToConsume, errors } = await validateGameItemSelectionAgainstInventory(walletAddress);
  if (errors.length > 0) {
    alert('Error: ' + errors.join('\n'));
    return { ok: false, items: {} };
  }

  return { ok: true, items: itemsToConsume };
}

/**
 * Show item consumption/selection modal before game start
 * Returns a promise that resolves when user confirms or cancels
 * @param {Object} options - Optional configuration
 * @param {boolean} options.isTournamentMode - Whether this is for a tournament game (gold theme)
 */
async function showItemConsumptionModal(options = {}) {
  const isTournamentMode = options.isTournamentMode || false;
  
  return new Promise(async (resolve) => {
    log.debug('CONSUMPTION', 'Showing item consumption modal');
    
    // Reset item selection state for new game
    // This ensures selections from previous games don't carry over
    gameItemSelection = _defaultGameItemSelection();
    
    // Also clear game.selectedItems if it exists (from previous game)
    if (typeof game !== 'undefined' && game.selectedItems) {
      game.selectedItems = null;
    }
    if (typeof game !== 'undefined' && game.checkedOutItems) {
      game.checkedOutItems = null;
    }
    
    // Get wallet address (if available)
    let walletAddress = null;
    if (typeof getWalletAddress === 'function') {
      walletAddress = getWalletAddress();
    } else if (window.walletAPIInstance && window.walletAPIInstance.isConnected()) {
      walletAddress = window.walletAPIInstance.getAddress();
    }
    
    if (!walletAddress) {
      log.warn('CONSUMPTION', 'No wallet connected, skipping item selection');
      resolve({ confirmed: true, items: {} });
      return;
    }
    
    // Update loading message (if loading modal is visible)
    if (typeof updateLoadingModalMessage === 'function') {
      updateLoadingModalMessage('Loading inventory... Please wait', 'gameStartLoadingModal');
    }
    
    // Ensure store catalog is in state so getAllItems() works (user may not have opened Store yet)
    if (typeof ensureStoreCatalogLoaded === 'function') {
      await ensureStoreCatalogLoaded();
    }
    
    // Prefer reservoir-bundle cache from wallet/menu load (15m TTL). No refetch at game start when fresh.
    let inventory = {};
    try {
      const cached = window.PlayerInventoryCache?.getFreshOrNull?.(walletAddress);
      if (cached) {
        inventory = cached;
        log.debug('CONSUMPTION', 'Using cached reservoir inventory (no start refetch)', Object.keys(inventory).length);
      } else if (window.PlayerInventoryCache) {
        await window.PlayerInventoryCache.fetchReservoirBundleAndCache(walletAddress);
        const inv = window.PlayerInventoryCache.getFreshOrNull(walletAddress);
        inventory = inv || {};
        log.debug('CONSUMPTION', 'Loaded inventory via reservoir-bundle', Object.keys(inventory).length);
      } else {
        const base = window.GameApi ? window.GameApi.getBaseUrl() : (window.GAME_CONFIG?.GAME_BACKEND_URL || window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3001/api');
        const response = await fetch(`${base}/inventory/${walletAddress}?contract=new`);
        if (!response.ok) throw new Error(`Failed to load inventory: ${response.status}`);
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Invalid response from server');
        inventory = data.inventory != null ? data.inventory : {};
        log.debug('CONSUMPTION', 'Loaded inventory from /inventory (no cache module)', Object.keys(inventory).length);
      }
    } catch (error) {
      log.error('CONSUMPTION', 'Error loading inventory', error);
      if (typeof getAllInventoryItems === 'function') {
        inventory = getAllInventoryItems(walletAddress) || {};
        log.warn('CONSUMPTION', 'Using localStorage inventory as fallback');
      }
    }
    
    const hasItems = Object.keys(inventory).some(key => inventory[key] > 0);
    
    // If no items in inventory, skip modal
    if (!hasItems) {
      log.debug('CONSUMPTION', 'No items in inventory, skipping selection');
      resolve({ confirmed: true, items: {} });
      return;
    }
    
    // Update loading message
    if (typeof updateLoadingModalMessage === 'function') {
      updateLoadingModalMessage('Preparing item selection... Please wait', 'gameStartLoadingModal');
    }
    
    // Create modal structure but keep it hidden until ready
    const viewportContainer = document.querySelector('.viewport-container');
    if (!viewportContainer) {
      log.error('CONSUMPTION', 'Viewport container not found');
      resolve({ confirmed: false, items: {} });
      return;
    }
    
    // Check if modal already exists
    let modal = document.getElementById('itemConsumptionModal');
    if (modal) {
      modal.remove();
    }
    
    // Create modal (hidden initially)
    modal = document.createElement('div');
    // Add tournament mode class for gold styling
    const tournamentClass = isTournamentMode ? ' item-consumption-tournament' : '';
    modal.className = `item-consumption-modal item-consumption-modal-hidden${tournamentClass}`; // Start hidden
    modal.setAttribute('id', 'itemConsumptionModal');
    
    // Build items HTML
    const itemsHTML = buildConsumptionItemsHTML(inventory);
    
    // Title varies for tournament mode
    const headerTitle = isTournamentMode ? '🏆 Select Items for Tournament Game' : '🎮 Select Items for This Game';
    const headerSubtitle = isTournamentMode 
      ? 'Choose items from your inventory to use in this tournament game'
      : 'Choose items from your inventory to use in this game session';
    
    modal.innerHTML = `
      <div class="item-consumption-content">
        <div class="item-consumption-header">
          <h2>${headerTitle}</h2>
          <p class="item-consumption-subtitle">${headerSubtitle}</p>
        </div>
        
        <div class="item-consumption-items" id="consumptionItemsList">
          ${itemsHTML}
        </div>
        
        <div class="item-consumption-footer">
          <div class="item-consumption-actions">
            <button class="menu-btn" onclick="cancelItemConsumption()">
              <span class="btn-icon">←</span> Cancel
            </button>
            <button class="menu-btn primary" onclick="confirmItemConsumption()" id="confirmConsumptionBtn">
              <span class="btn-icon">▶️</span> Start Game
            </button>
          </div>
        </div>
      </div>
    `;
    
    // Append to DOM but keep hidden
    viewportContainer.appendChild(modal);

    // Update UI
    updateConsumptionUI();
    
    // Hide loading modal now that inventory is loaded and modal is ready
    if (typeof hideLoadingModal === 'function') {
      hideLoadingModal('gameStartLoadingModal');
    }
    
    // Now show the modal (after everything is loaded)
    modal.classList.remove('item-consumption-modal-hidden');
    modal.classList.add('item-consumption-modal-visible');
    
    // Store resolve function for later
    window._consumptionResolve = resolve;
  });
}

/**
 * Build HTML for consumption items list
 */
function buildConsumptionItemsHTML(inventory) {
  if (typeof getAllItems === 'undefined') {
    return '<p>Item catalog not available</p>';
  }
  
  const items = getAllItems();
  if (!items || items.length === 0) {
    return '<p>No items available. Please load the store first.</p>';
  }
  let html = '';
  
  items.forEach(item => {
    const levels = Array.isArray(item.levels) ? item.levels : [];
    // Leveled items: check any level key. Non-leveled items: check base key (e.g. boss_kill_shot).
    const hasAnyLevel = levels.length > 0
      ? levels.some(levelData => {
          const key = `${item.id}_${levelData.level}`;
          return inventory[key] > 0;
        })
      : (inventory[item.id] > 0);
    
    if (!hasAnyLevel) {
      return; // Skip items not in inventory
    }
    
    // Build level buttons
    let levelsHTML = '';
    if (levels.length === 0) {
      const quantity = inventory[item.id] || 0;
      if (quantity > 0) {
        const isSelected =
          (item.id === 'destroy_all' && gameItemSelection[item.id] === true) ||
          (item.id === 'boss_kill_shot' && gameItemSelection[item.id] === true);
        const selectedClass = isSelected ? 'selected' : '';
        levelsHTML += `
          <button type="button" class="consumption-level-btn ${selectedClass}" 
                  onclick="event.stopPropagation(); selectConsumptionItem('${item.id}', 1)"
                  data-item-id="${item.id}"
                  data-level="1">
            <div class="consumption-level-info">
              <div class="consumption-level-name">${item.name}</div>
              <div class="consumption-level-effect">${item.description}</div>
            </div>
            <div class="consumption-level-badge">
              <span class="consumption-quantity">Owned: ${quantity}</span>
            </div>
          </button>
        `;
      }
    } else {
      levels.forEach(levelData => {
        const level = levelData.level || 1;
        const key = `${item.id}_${level}`;
        const quantity = inventory[key] || 0;
      
        if (quantity > 0) {
          const isSelected = gameItemSelection[item.id] === level || 
                            (item.id === 'destroy_all' && gameItemSelection[item.id] === true) ||
                            (item.id === 'boss_kill_shot' && gameItemSelection[item.id] === true);
        
          const selectedClass = isSelected ? 'selected' : '';
          const levelName = levels.length > 1 ? `Level ${level}` : item.name;
        
          levelsHTML += `
          <button type="button" class="consumption-level-btn ${selectedClass}" 
                  onclick="event.stopPropagation(); selectConsumptionItem('${item.id}', ${level})"
                  data-item-id="${item.id}"
                  data-level="${level}">
            <div class="consumption-level-info">
              <div class="consumption-level-name">${levelName}</div>
              <div class="consumption-level-effect">${levelData.effect}</div>
            </div>
            <div class="consumption-level-badge">
              <span class="consumption-quantity">Owned: ${quantity}</span>
            </div>
          </button>
        `;
        }
      });
    }
    
    if (levelsHTML) {
      html += `
        <div class="consumption-item-card" data-item-id="${item.id}">
          <div class="consumption-item-header">
            <div class="consumption-item-icon">${item.icon}</div>
            <div class="consumption-item-info">
              <h3 class="consumption-item-name">${item.name}</h3>
              <p class="consumption-item-description">${item.description}</p>
            </div>
          </div>
          <div class="consumption-item-levels">
            ${levelsHTML}
          </div>
        </div>
      `;
    }
  });
  
  if (!html) {
    return '<p class="consumption-empty">No items available in inventory</p>';
  }
  
  return html;
}

/**
 * Select item for consumption (enforces one type per game rule)
 */
function selectConsumptionItem(itemId, level) {
  log.debug('CONSUMPTION', 'Selecting item', { itemId, level });
  
  // Handle single-level items
  if (itemId === 'destroy_all' || itemId === 'boss_kill_shot') {
    level = 1;
    // Toggle selection
    if (gameItemSelection[itemId] === true) {
      gameItemSelection[itemId] = false;
    } else {
      gameItemSelection[itemId] = true;
    }
  } else {
    // Multi-level items: if same level selected, deselect; otherwise select new level
    if (gameItemSelection[itemId] === level) {
      gameItemSelection[itemId] = null; // Deselect
    } else {
      gameItemSelection[itemId] = level; // Select new level
    }
  }
  
  updateConsumptionUI();
}

/**
 * Update consumption UI to reflect current selections
 */
function updateConsumptionUI() {
  const root = _getConsumptionDOMRoot();
  if (!root) return;
  const cards = root.querySelectorAll('.consumption-item-card');
  
  cards.forEach(card => {
    const itemId = card.getAttribute('data-item-id');
    const buttons = card.querySelectorAll('.consumption-level-btn');
    
    buttons.forEach(button => {
      const level = parseInt(button.getAttribute('data-level')) || 1;
      const isSelected = gameItemSelection[itemId] === level ||
                        (itemId === 'destroy_all' && gameItemSelection[itemId] === true && level === 1) ||
                        (itemId === 'boss_kill_shot' && gameItemSelection[itemId] === true && level === 1);
      
      if (isSelected) {
        button.classList.add('selected');
      } else {
        button.classList.remove('selected');
      }
    });
  });
}

/**
 * Confirm item consumption and start game
 */
async function confirmItemConsumption() {
  log.debug('CONSUMPTION', 'Confirming item consumption', gameItemSelection);

  let walletAddress = null;
  if (typeof getWalletAddress === 'function') {
    walletAddress = getWalletAddress();
  } else if (window.walletAPIInstance && window.walletAPIInstance.isConnected()) {
    walletAddress = window.walletAPIInstance.getAddress();
  }

  const { itemsToConsume, errors } = await validateGameItemSelectionAgainstInventory(walletAddress);

  if (errors.length > 0) {
    alert('Error: ' + errors.join('\n'));
    return;
  }
  
  // DON'T consume items here - just "check out" items for use in this game
  // Items will be consumed when:
  // - Start items (extra_lives, force_field, orb_level): Consumed at game start
  // - Consumable items (coin_tractor_beam, slow_time, destroy_all, boss_kill_shot): Consumed when activated during gameplay
  // This way, if game crashes or item is not used, it remains in inventory
  
  // Store selected items in game state (checked out, not consumed yet)
  if (typeof game !== 'undefined') {
    game.selectedItems = itemsToConsume;
    game.checkedOutItems = itemsToConsume; // Track checked-out items separately
    log.debug('CONSUMPTION', 'Checked out items for game', game.selectedItems);
    
    // Initialize consumable system after selectedItems is set
    if (typeof ConsumableSystem !== 'undefined' && ConsumableSystem.initializeConsumables) {
      ConsumableSystem.initializeConsumables();
    }
  }
  
  // Hide modal
  hideItemConsumptionModal();
  
  // Show loading modal again for game initialization (with progress message)
  if (typeof showLoadingModal === 'function') {
    showLoadingModal('Preparing game with selected items... Please wait', 'gameStartLoadingModal');
  } else if (typeof updateLoadingModalMessage === 'function') {
    // If modal is already visible, just update the message
    updateLoadingModalMessage('Preparing game with selected items... Please wait', 'gameStartLoadingModal');
  }
  
  // Resolve promise
  if (window._consumptionResolve) {
    window._consumptionResolve({ confirmed: true, items: itemsToConsume });
    window._consumptionResolve = null;
  }
}

/**
 * Cancel item consumption
 */
function cancelItemConsumption() {
  log.debug('CONSUMPTION', 'Cancelled item consumption');

  gameItemSelection = _defaultGameItemSelection();
  
  // Hide modal
  hideItemConsumptionModal();
  
  // Hide loading modal on cancel (game won't start)
  if (typeof hideLoadingModal === 'function') {
    hideLoadingModal('gameStartLoadingModal');
  }
  
  // Resolve promise with cancelled
  if (window._consumptionResolve) {
    window._consumptionResolve({ confirmed: false, items: {} });
    window._consumptionResolve = null;
  }
}

/**
 * Hide item consumption modal
 */
function hideItemConsumptionModal() {
  const modal = document.getElementById('itemConsumptionModal');
  if (modal) {
    modal.classList.remove('item-consumption-modal-visible');
    modal.classList.add('item-consumption-modal-hidden');
    setTimeout(() => {
      modal.remove();
      updateConsumptionUI();
    }, 300);
  }
}

/**
 * Get item name for display
 */
function getItemName(itemId) {
  if (typeof getItemById === 'function') {
    const item = getItemById(itemId);
    return item ? item.name : itemId;
  }
  return itemId;
}

// Make functions globally accessible
if (typeof window !== 'undefined') {
  window.showItemConsumptionModal = showItemConsumptionModal;
  window.selectConsumptionItem = selectConsumptionItem;
  window.confirmItemConsumption = confirmItemConsumption;
  window.cancelItemConsumption = cancelItemConsumption;
  window.hideItemConsumptionModal = hideItemConsumptionModal;
  window.checkoutPrepLoadoutItemSelection = checkoutPrepLoadoutItemSelection;
  window.prepLoadoutOnInventoryRenderMaybeResetSession = prepLoadoutOnInventoryRenderMaybeResetSession;
  window.setPrepLoadoutGameItemSelectionFromRow = setPrepLoadoutGameItemSelectionFromRow;
  window.clearPrepLoadoutGameItemSelection = clearPrepLoadoutGameItemSelection;
}

