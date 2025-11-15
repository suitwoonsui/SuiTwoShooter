// ==========================================
// ITEM CONSUMPTION SYSTEM
// ==========================================
// Handles item selection and consumption before game start
// Enforces "one item type per game" rule

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
 */
async function showItemConsumptionModal() {
  return new Promise(async (resolve) => {
    console.log('🎮 [CONSUMPTION] Showing item consumption modal');
    
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
    console.log('🧹 [CONSUMPTION] Reset item selection state for new game');
    
    // Also clear game.selectedItems if it exists (from previous game)
    if (typeof game !== 'undefined' && game.selectedItems) {
      console.log('🧹 [CONSUMPTION] Clearing game.selectedItems from previous game:', game.selectedItems);
      game.selectedItems = null;
    }
    if (typeof game !== 'undefined' && game.checkedOutItems) {
      console.log('🧹 [CONSUMPTION] Clearing game.checkedOutItems from previous game:', game.checkedOutItems);
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
      console.log('⚠️ [CONSUMPTION] No wallet connected, skipping item selection');
      resolve({ confirmed: true, items: {} });
      return;
    }
    
    // Get inventory from blockchain API (not localStorage)
    let inventory = {};
    try {
      const API_BASE_URL = window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3000/api';
      const response = await fetch(`${API_BASE_URL}/store/inventory/${walletAddress}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.inventory) {
          inventory = data.inventory;
          console.log('✅ [CONSUMPTION] Loaded inventory from blockchain:', inventory);
        } else {
          console.warn('⚠️ [CONSUMPTION] Failed to load inventory from blockchain:', data.error);
        }
      } else {
        console.warn('⚠️ [CONSUMPTION] Inventory API error:', response.status);
      }
    } catch (error) {
      console.error('❌ [CONSUMPTION] Error loading inventory from blockchain:', error);
      // Fall back to localStorage if blockchain query fails
      if (typeof getAllInventoryItems !== 'undefined') {
        inventory = getAllInventoryItems(walletAddress);
        console.log('⚠️ [CONSUMPTION] Using localStorage inventory as fallback');
      }
    }
    
    const hasItems = Object.keys(inventory).some(key => inventory[key] > 0);
    
    // If no items in inventory, skip modal
    if (!hasItems) {
      console.log('📦 [CONSUMPTION] No items in inventory, skipping selection');
      resolve({ confirmed: true, items: {} });
      return;
    }
    
    // Create modal
    const viewportContainer = document.querySelector('.viewport-container');
    if (!viewportContainer) {
      console.error('❌ [CONSUMPTION] Viewport container not found');
      resolve({ confirmed: false, items: {} });
      return;
    }
    
    // Check if modal already exists
    let modal = document.getElementById('itemConsumptionModal');
    if (modal) {
      modal.remove();
    }
    
    // Create modal
    modal = document.createElement('div');
    modal.className = 'item-consumption-modal item-consumption-modal-visible';
    modal.setAttribute('id', 'itemConsumptionModal');
    
    // Build items HTML
    const itemsHTML = buildConsumptionItemsHTML(inventory);
    
    modal.innerHTML = `
      <div class="item-consumption-content">
        <div class="item-consumption-header">
          <h2>🎮 Select Items for This Game</h2>
          <p class="item-consumption-subtitle">Choose items from your inventory to use in this game session</p>
        </div>
        
        <div class="item-consumption-items" id="consumptionItemsList">
          ${itemsHTML}
        </div>
        
        <div class="item-consumption-actions">
          <button class="menu-btn" onclick="cancelItemConsumption()">
            <span class="btn-icon">←</span> Cancel
          </button>
          <button class="menu-btn primary" onclick="confirmItemConsumption()" id="confirmConsumptionBtn">
            <span class="btn-icon">▶️</span> Start Game
          </button>
        </div>
      </div>
    `;
    
    viewportContainer.appendChild(modal);
    
    // Store resolve function for later
    window._consumptionResolve = resolve;
    
    // Update UI
    updateConsumptionUI();
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
  console.log('🎯 [CONSUMPTION] Selecting item:', itemId, 'level:', level);
  
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
  console.log('✅ [CONSUMPTION] Confirming item consumption');
  console.log('Selected items:', gameItemSelection);
  
  // Get wallet address
  let walletAddress = null;
  if (typeof getWalletAddress === 'function') {
    walletAddress = getWalletAddress();
  } else if (window.walletAPIInstance && window.walletAPIInstance.isConnected()) {
    walletAddress = window.walletAPIInstance.getAddress();
  }
  
  // Fetch inventory from blockchain for validation
  let blockchainInventory = {};
  if (walletAddress) {
    try {
      const API_BASE_URL = window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3000/api';
      const response = await fetch(`${API_BASE_URL}/store/inventory/${walletAddress}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.inventory) {
          blockchainInventory = data.inventory;
        }
      }
    } catch (error) {
      console.warn('⚠️ [CONSUMPTION] Error fetching inventory for validation:', error);
    }
  }
  
  // Validate and consume items
  const itemsToConsume = {};
  const errors = [];
  
  console.log('🔍 [CONSUMPTION] Validating items from gameItemSelection:', gameItemSelection);
  console.log('🔍 [CONSUMPTION] Current blockchain inventory:', blockchainInventory);
  
  for (const [itemId, level] of Object.entries(gameItemSelection)) {
    // Only validate items that are actually selected (not null, not false)
    if (level !== null && level !== false) {
      const actualLevel = level === true ? 1 : level;
      const itemKey = `${itemId}_${actualLevel}`;
      
      console.log(`🔍 [CONSUMPTION] Validating ${itemId} level ${actualLevel} (key: ${itemKey})`);
      
      // Check if item exists in blockchain inventory
      let count = blockchainInventory[itemKey] || 0;
      
      // Fallback to localStorage if blockchain check failed
      if (count === 0 && typeof getItemCount === 'function') {
        count = getItemCount(itemId, actualLevel, walletAddress);
        console.log(`🔍 [CONSUMPTION] Fallback to localStorage: ${itemId} level ${actualLevel} = ${count}`);
      }
      
      console.log(`🔍 [CONSUMPTION] ${itemId} level ${actualLevel}: Found ${count} in inventory`);
      
      if (count <= 0) {
        const errorMsg = `${getItemName(itemId)} Level ${actualLevel} not in inventory`;
        console.error(`❌ [CONSUMPTION] ${errorMsg}`);
        errors.push(errorMsg);
        continue;
      }
      
      itemsToConsume[itemId] = actualLevel;
      console.log(`✅ [CONSUMPTION] ${itemId} level ${actualLevel} validated and added to consume list`);
    } else {
      console.log(`⏭️ [CONSUMPTION] Skipping ${itemId} (not selected: ${level})`);
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
    console.log('💾 [CONSUMPTION] Checked out items for game (not consumed yet):', game.selectedItems);
    
    // Initialize consumable system after selectedItems is set
    if (typeof ConsumableSystem !== 'undefined' && ConsumableSystem.initializeConsumables) {
      ConsumableSystem.initializeConsumables();
    }
  }
  
  // Hide modal
  hideItemConsumptionModal();
  
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
  console.log('❌ [CONSUMPTION] Cancelled item consumption');
  
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

