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
  extraLives: null,        // null or level (1, 2, or 3)
  forceField: null,        // null or level (1, 2, or 3)
  orbLevel: null,          // null or level (1, 2, or 3)
  slowTime: null,         // null or level (1, 2, or 3)
  destroyAll: false,       // boolean (single level)
  bossKillShot: false,     // boolean (single level)
  coinTractorBeam: null    // null or level (1, 2, or 3)
};

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
    gameItemSelection = {
      extraLives: null,
      forceField: null,
      orbLevel: null,
      slowTime: null,
      destroyAll: false,
      bossKillShot: false,
      coinTractorBeam: null
    };
    
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
    
    // Get inventory from blockchain API (not localStorage) - LOAD FIRST
    // Use cache if available
    let inventory = {};
    try {
      const API_BASE_URL = window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3000/api';
      
      if (window.apiRequestCache) {
        // Use cache with 30 second TTL
        inventory = await window.apiRequestCache.get(
          `inventory:${walletAddress}`,
          async () => {
            const response = await fetch(`${API_BASE_URL}/store/inventory/${walletAddress}`);
            
            if (!response.ok) {
              throw new Error(`Failed to load inventory: ${response.status}`);
            }
            
            const data = await response.json();
            if (!data.success || !data.inventory) {
              throw new Error(data.error || 'Invalid response from server');
            }
            
            return data.inventory || {};
          },
          {
            ttl: 30000, // 30 seconds
            walletAddress: walletAddress
          }
        );
        log.debug('CONSUMPTION', 'Loaded inventory from blockchain (cached)', inventory);
      } else {
        // Fallback to direct fetch if cache not available
        const response = await fetch(`${API_BASE_URL}/store/inventory/${walletAddress}`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.inventory) {
            inventory = data.inventory;
            log.debug('CONSUMPTION', 'Loaded inventory from blockchain', inventory);
          } else {
            log.warn('CONSUMPTION', 'Failed to load inventory from blockchain', data.error);
          }
        } else {
          log.warn('CONSUMPTION', 'Inventory API error', response.status);
        }
      }
    } catch (error) {
      log.error('CONSUMPTION', 'Error loading inventory from blockchain', error);
      // Fall back to localStorage if blockchain query fails
      if (typeof getAllInventoryItems !== 'undefined') {
        inventory = getAllInventoryItems(walletAddress);
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
  if (typeof getAllItems === 'undefined' || typeof ITEM_CATALOG === 'undefined') {
    return '<p>Item catalog not available</p>';
  }
  
  const items = getAllItems();
  let html = '';
  
  items.forEach(item => {
    // Check if player has any level of this item
    const hasAnyLevel = item.levels.some(levelData => {
      const key = `${item.id}_${levelData.level}`;
      return inventory[key] > 0;
    });
    
    if (!hasAnyLevel) {
      return; // Skip items not in inventory
    }
    
    // Build level buttons
    let levelsHTML = '';
    item.levels.forEach(levelData => {
      const level = levelData.level || 1;
      const key = `${item.id}_${level}`;
      const quantity = inventory[key] || 0;
      
      if (quantity > 0) {
        const isSelected = gameItemSelection[item.id] === level || 
                          (item.id === 'destroyAll' && gameItemSelection[item.id] === true) ||
                          (item.id === 'bossKillShot' && gameItemSelection[item.id] === true);
        
        const selectedClass = isSelected ? 'selected' : '';
        const levelName = item.levels.length > 1 ? `Level ${level}` : item.name;
        
        levelsHTML += `
          <button class="consumption-level-btn ${selectedClass}" 
                  onclick="selectConsumptionItem('${item.id}', ${level})"
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
  if (itemId === 'destroyAll' || itemId === 'bossKillShot') {
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
  const cards = document.querySelectorAll('.consumption-item-card');
  
  cards.forEach(card => {
    const itemId = card.getAttribute('data-item-id');
    const buttons = card.querySelectorAll('.consumption-level-btn');
    
    buttons.forEach(button => {
      const level = parseInt(button.getAttribute('data-level')) || 1;
      const isSelected = gameItemSelection[itemId] === level ||
                        (itemId === 'destroyAll' && gameItemSelection[itemId] === true && level === 1) ||
                        (itemId === 'bossKillShot' && gameItemSelection[itemId] === true && level === 1);
      
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
  
  // Get wallet address
  let walletAddress = null;
  if (typeof getWalletAddress === 'function') {
    walletAddress = getWalletAddress();
  } else if (window.walletAPIInstance && window.walletAPIInstance.isConnected()) {
    walletAddress = window.walletAPIInstance.getAddress();
  }
  
  // Fetch inventory from blockchain for validation
  // Use cache if available
  let blockchainInventory = {};
  if (walletAddress) {
    try {
      const API_BASE_URL = window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3000/api';
      
      if (window.apiRequestCache) {
        // Use cache with 30 second TTL
        blockchainInventory = await window.apiRequestCache.get(
          `inventory:${walletAddress}`,
          async () => {
            const response = await fetch(`${API_BASE_URL}/store/inventory/${walletAddress}`);
            if (!response.ok) {
              throw new Error(`Failed to load inventory: ${response.status}`);
            }
            const data = await response.json();
            if (!data.success || !data.inventory) {
              throw new Error(data.error || 'Invalid response');
            }
            return data.inventory || {};
          },
          {
            ttl: 30000,
            walletAddress: walletAddress
          }
        );
      } else {
        // Fallback to direct fetch
        const response = await fetch(`${API_BASE_URL}/store/inventory/${walletAddress}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.inventory) {
            blockchainInventory = data.inventory;
          }
        }
      }
    } catch (error) {
      log.warn('CONSUMPTION', 'Error fetching inventory for validation', error);
    }
  }
  
  // Validate and consume items
  const itemsToConsume = {};
  const errors = [];
  
  for (const [itemId, level] of Object.entries(gameItemSelection)) {
    // Only validate items that are actually selected (not null, not false)
    if (level !== null && level !== false) {
      const actualLevel = level === true ? 1 : level;
      const itemKey = `${itemId}_${actualLevel}`;
      
      // Check if item exists in blockchain inventory
      let count = blockchainInventory[itemKey] || 0;
      
      // Fallback to localStorage if blockchain check failed
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
  
  if (errors.length > 0) {
    alert('Error: ' + errors.join('\n'));
    return;
  }
  
  // DON'T consume items here - just "check out" items for use in this game
  // Items will be consumed when:
  // - Start items (extraLives, forceField, orbLevel): Consumed at game start
  // - Consumable items (coinTractorBeam, slowTime, destroyAll, bossKillShot): Consumed when activated during gameplay
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
  
  // Reset selection
  gameItemSelection = {
    extraLives: null,
    forceField: null,
    orbLevel: null,
    slowTime: null,
    destroyAll: false,
    bossKillShot: false,
    coinTractorBeam: null
  };
  
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
}

