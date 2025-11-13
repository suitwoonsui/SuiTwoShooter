// ==========================================
// STORE UI SYSTEM
// ==========================================
// Premium store modal for purchasing game items
// Follows the leaderboard modal pattern

// Store state
let storeState = {
  selectedItems: {
    // Format: { itemId_level: quantity }
    // Example: { 'extraLives_1': 3, 'extraLives_2': 1, 'forceField_3': 2 }
  },
  paymentToken: 'mews',      // 'mews' or 'sui'
  isLoading: false
};

/**
 * Show store modal
 * Follows the leaderboard modal pattern
 */
async function showStore() {
  console.log('🛒 showStore() called');
  
  // Hide main menu
  const mainMenu = document.getElementById('mainMenuOverlay');
  if (mainMenu) {
    mainMenu.classList.add('main-menu-overlay-hidden');
    mainMenu.classList.remove('main-menu-overlay-visible');
  }
  
  // Create store modal using dedicated store-modal class
  // Append to viewport-container like other panels (settings, instructions, leaderboard)
  const viewportContainer = document.querySelector('.viewport-container');
  if (!viewportContainer) {
    console.error('❌ [STORE] Viewport container not found!');
    return;
  }
  
  // Check if store modal already exists
  let storeModal = document.getElementById('storeModal');
  if (storeModal) {
    // Modal already exists, just show it and refresh inventory
    storeModal.classList.add('store-modal-visible');
    storeModal.classList.remove('store-modal-hidden');
    loadInventoryDisplay();
    updateStoreUI();
    return;
  }
  
  // Create new store modal
  storeModal = document.createElement('div');
  storeModal.className = 'store-modal store-modal-visible';
  storeModal.setAttribute('id', 'storeModal');
  
  const storeContent = document.createElement('div');
  storeContent.className = 'store';
  
  storeContent.innerHTML = `
    <!-- Store Header -->
    <div class="store-header">
      <h2 id="storeTitle">🛒 Premium Store</h2>
    </div>
    
    <!-- Payment Token Selector -->
    <div class="store-payment-selector">
      <label>Payment Method:</label>
      <div class="payment-token-buttons">
        <button class="payment-token-btn ${storeState.paymentToken === 'mews' ? 'active' : ''}" 
                onclick="setPaymentToken('mews')" id="paymentTokenMews">
          <img src="assets/tokens/mews.webp" alt="$MEWS" class="token-icon" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';">
          <span class="token-fallback" style="display: none;">💰</span>
          <span>$MEWS</span>
        </button>
        <button class="payment-token-btn ${storeState.paymentToken === 'sui' ? 'active' : ''}" 
                onclick="setPaymentToken('sui')" id="paymentTokenSui">
          <img src="assets/tokens/sui.webp" alt="SUI" class="token-icon" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';">
          <span class="token-fallback" style="display: none;">💎</span>
          <span>SUI</span>
        </button>
      </div>
    </div>
    
    <!-- Store Items Container -->
    <div class="store-items-container" id="storeItemsContainer">
      <div class="store-loading" id="storeLoading">
        <span class="btn-icon">⏳</span> Loading store items...
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
    <div class="store-actions">
      <button class="menu-btn" onclick="clearStoreSelection()">
        <span class="btn-icon">🗑️</span> Clear Selection
      </button>
      <button class="menu-btn primary" onclick="proceedToPurchase()" id="proceedToPurchaseBtn" disabled>
        <span class="btn-icon">💳</span> Proceed to Purchase
      </button>
      <button class="menu-btn" onclick="hideStore()">
        <span class="btn-icon">←</span> Back to Menu
      </button>
    </div>
  `;
  
  storeModal.appendChild(storeContent);
  viewportContainer.appendChild(storeModal);
  
  // Load store items
  await loadStoreItems();
  
  // Load and display inventory
  loadInventoryDisplay();
  
  // Update UI
  updateStoreUI();
}

/**
 * Hide store modal
 */
function hideStore() {
  const storeModal = document.getElementById('storeModal');
  if (storeModal) {
    storeModal.classList.remove('store-modal-visible');
    storeModal.classList.add('store-modal-hidden');
    // Remove from DOM after animation
    setTimeout(() => {
      storeModal.remove();
    }, 300);
  }
  
  // Show main menu
  const mainMenu = document.getElementById('mainMenuOverlay');
  if (mainMenu) {
    mainMenu.classList.add('main-menu-overlay-visible');
    mainMenu.classList.remove('main-menu-overlay-hidden');
  }
}

/**
 * Convert USD price to token amount
 * TODO: Phase 5 - Integrate with CoinGecko API for real-time rates
 * For now, using placeholder conversion rates
 */
function convertUsdToToken(usdPrice, tokenType) {
  // Placeholder conversion rates (will be replaced with real API in Phase 5)
  const conversionRates = {
    mews: 0.000002,  // $0.000002 per MEWS (placeholder)
    sui: 2.17        // $2.17 per SUI (placeholder)
  };
  
  const rate = conversionRates[tokenType] || conversionRates.mews;
  const tokenAmount = usdPrice / rate;
  
  return {
    amount: tokenAmount,
    formatted: formatTokenAmount(tokenAmount, tokenType)
  };
}

/**
 * Format token amount for display
 */
function formatTokenAmount(amount, tokenType) {
  if (tokenType === 'sui') {
    // SUI: Show 2-4 decimal places
    if (amount < 0.01) {
      return amount.toFixed(4);
    } else if (amount < 1) {
      return amount.toFixed(3);
    } else {
      return amount.toFixed(2);
    }
  } else {
    // MEWS: Show whole numbers or 1 decimal place for large amounts
    if (amount < 1000) {
      return Math.round(amount).toLocaleString();
    } else if (amount < 1000000) {
      return (amount / 1000).toFixed(1) + 'K';
    } else {
      return (amount / 1000000).toFixed(1) + 'M';
    }
  }
}

/**
 * Format USD price for display
 */
function formatUsdPrice(usdPrice) {
  return `$${usdPrice.toFixed(2)}`;
}

/**
 * Load store items from catalog
 */
async function loadStoreItems() {
  console.log('📦 [STORE] Loading store items...');
  
  const container = document.getElementById('storeItemsContainer');
  const loading = document.getElementById('storeLoading');
  
  if (!container || !loading) return;
  
  // Check if catalog is available
  if (typeof getAllItems === 'undefined' || typeof ITEM_CATALOG === 'undefined') {
    console.error('❌ [STORE] Item catalog not loaded!');
    loading.style.display = 'none';
    container.innerHTML = `
      <div class="store-placeholder">
        <p>⚠️ Item catalog not found</p>
        <p style="font-size: 0.9em; color: #888; margin-top: 10px;">
          Please ensure item-catalog.js is loaded
        </p>
      </div>
    `;
    return;
  }
  
  // Show loading state
  storeState.isLoading = true;
  loading.style.display = 'block';
  container.innerHTML = '';
  container.appendChild(loading);
  
  // Simulate loading delay (remove in production)
  await new Promise(resolve => setTimeout(resolve, 300));
  
  try {
    // Get all items from catalog
    const items = getAllItems();
    
    // Clear loading
    loading.style.display = 'none';
    container.innerHTML = '';
    
    // Render each item
    items.forEach(item => {
      const itemCard = createItemCard(item);
      container.appendChild(itemCard);
    });
    
    storeState.isLoading = false;
    console.log(`✅ [STORE] Loaded ${items.length} items`);
  } catch (error) {
    console.error('❌ [STORE] Error loading items:', error);
    loading.style.display = 'none';
    container.innerHTML = `
      <div class="store-placeholder">
        <p>❌ Error loading store items</p>
        <p style="font-size: 0.9em; color: #888; margin-top: 10px;">
          ${error.message || 'Unknown error'}
        </p>
      </div>
    `;
    storeState.isLoading = false;
  }
}

/**
 * Create item card element
 */
function createItemCard(item) {
  const card = document.createElement('div');
  card.className = 'store-item-card';
  card.setAttribute('data-item-id', item.id);
  
  // Check if item has multiple levels
  const hasMultipleLevels = item.levels.length > 1;
  
  // Build level buttons HTML
  let levelsHTML = '';
  item.levels.forEach(levelData => {
    const level = levelData.level || 1;
    const quantity = getItemQuantity(item.id, level);
    const hasQuantity = quantity > 0;
    
    const usdPrice = formatUsdPrice(levelData.usdPrice);
    const tokenConversion = convertUsdToToken(levelData.usdPrice, storeState.paymentToken);
    const tokenSymbol = storeState.paymentToken === 'sui' ? 'SUI' : '$MEWS';
    
    const levelClass = hasMultipleLevels ? 'item-level-btn' : 'item-single-btn';
    const selectedClass = hasQuantity ? 'selected' : '';
    
    levelsHTML += `
      <div class="item-level-container ${selectedClass}" data-item-id="${item.id}" data-level="${level}">
        <div class="level-button-wrapper">
          <button class="${levelClass} ${selectedClass}" 
                  onclick="selectStoreItem('${item.id}', ${level})"
                  data-item-id="${item.id}"
                  data-level="${level}">
            <div class="level-info">
              <div class="level-name">${hasMultipleLevels ? `Level ${level}` : item.name}</div>
              <div class="level-effect">${levelData.effect}</div>
            </div>
            <div class="level-price">
              <div class="price-usd">${usdPrice}</div>
              <div class="price-token">${tokenConversion.formatted} ${tokenSymbol}</div>
            </div>
          </button>
          ${hasQuantity ? `
            <button class="level-clear-btn" onclick="clearLevelSelection('${item.id}', ${level})" title="Clear this level">
              ✕
            </button>
          ` : ''}
        </div>
        ${hasQuantity ? `
          <div class="item-quantity-controls">
            <button class="quantity-btn quantity-decrease" onclick="removeItemFromSelection('${item.id}', ${level})" title="Decrease quantity">−</button>
            <span class="quantity-display">${quantity}</span>
            <button class="quantity-btn quantity-increase" onclick="addItemToSelection('${item.id}', ${level})" title="Increase quantity">+</button>
          </div>
        ` : ''}
      </div>
    `;
  });
  
  card.innerHTML = `
    <div class="item-header">
      <div class="item-icon">${item.icon}</div>
      <div class="item-info">
        <h3 class="item-name">${item.name}</h3>
        <p class="item-description">${item.description}</p>
      </div>
    </div>
    <div class="item-levels">
      ${levelsHTML}
    </div>
  `;
  
  return card;
}

/**
 * Set payment token (MEWS or SUI)
 */
function setPaymentToken(token) {
  if (token !== 'mews' && token !== 'sui') {
    console.warn('⚠️ [STORE] Invalid payment token:', token);
    return;
  }
  
  console.log('💱 [STORE] Switching payment token to:', token);
  storeState.paymentToken = token;
  
  // Update button states
  const mewsBtn = document.getElementById('paymentTokenMews');
  const suiBtn = document.getElementById('paymentTokenSui');
  
  if (mewsBtn && suiBtn) {
    if (token === 'mews') {
      mewsBtn.classList.add('active');
      suiBtn.classList.remove('active');
    } else {
      suiBtn.classList.add('active');
      mewsBtn.classList.remove('active');
    }
  }
  
  // Update prices in existing item cards without reloading
  updateItemPrices();
  
  // Also update the selected items summary
  updateStoreUI();
}

/**
 * Update prices in all item cards for current payment token
 */
function updateItemPrices() {
  const cards = document.querySelectorAll('.store-item-card');
  
  cards.forEach(card => {
    const itemId = card.getAttribute('data-item-id');
    const item = getItemById(itemId);
    if (!item) return;
    
    // Get all level buttons
    const levelButtons = card.querySelectorAll('.item-level-btn, .item-single-btn');
    
    levelButtons.forEach(button => {
      const level = parseInt(button.getAttribute('data-level')) || 1;
      const levelData = getItemLevelData(itemId, level);
      
      if (levelData) {
        const tokenConversion = convertUsdToToken(levelData.usdPrice, storeState.paymentToken);
        const tokenSymbol = storeState.paymentToken === 'sui' ? 'SUI' : '$MEWS';
        
        // Update price display
        const priceContainer = button.querySelector('.level-price');
        if (priceContainer) {
          const priceToken = priceContainer.querySelector('.price-token');
          if (priceToken) {
            priceToken.textContent = `${tokenConversion.formatted} ${tokenSymbol}`;
          }
        }
      }
    });
  });
}

/**
 * Get item selection key (itemId_level)
 */
function getItemKey(itemId, level) {
  return `${itemId}_${level}`;
}

/**
 * Get quantity for an item/level
 */
function getItemQuantity(itemId, level) {
  const key = getItemKey(itemId, level);
  return storeState.selectedItems[key] || 0;
}

/**
 * Add item to selection (increment quantity)
 */
function addItemToSelection(itemId, level) {
  const key = getItemKey(itemId, level);
  const currentQty = getItemQuantity(itemId, level);
  storeState.selectedItems[key] = currentQty + 1;
  console.log('➕ [STORE] Added item:', key, 'quantity:', storeState.selectedItems[key]);
  updateStoreUI();
}

/**
 * Remove item from selection (decrement quantity)
 */
function removeItemFromSelection(itemId, level) {
  const key = getItemKey(itemId, level);
  const currentQty = getItemQuantity(itemId, level);
  if (currentQty > 0) {
    storeState.selectedItems[key] = currentQty - 1;
    if (storeState.selectedItems[key] === 0) {
      delete storeState.selectedItems[key];
    }
    console.log('➖ [STORE] Removed item:', key, 'quantity:', storeState.selectedItems[key] || 0);
    updateStoreUI();
  }
}

/**
 * Set item quantity directly
 */
function setItemQuantity(itemId, level, quantity) {
  const key = getItemKey(itemId, level);
  if (quantity <= 0) {
    delete storeState.selectedItems[key];
  } else {
    storeState.selectedItems[key] = quantity;
  }
  console.log('🔢 [STORE] Set quantity:', key, '=', quantity);
  updateStoreUI();
}

/**
 * Select item (adds one to quantity)
 * Users can select multiple of the same item/level for purchase
 */
function selectStoreItem(itemId, level) {
  console.log('🛒 [STORE] Selecting item:', itemId, 'level:', level);
  
  // Validate item type
  const validItemTypes = ['extraLives', 'forceField', 'orbLevel', 'slowTime', 'destroyAll', 'bossKillShot', 'coinTractorBeam'];
  if (!validItemTypes.includes(itemId)) {
    console.error('❌ [STORE] Invalid item type:', itemId);
    return;
  }
  
  // Handle single-level items (level defaults to 1)
  if (itemId === 'destroyAll' || itemId === 'bossKillShot') {
    level = 1;
  }
  
  if (level === undefined || level === null) {
    console.error('❌ [STORE] Level required for item type:', itemId);
    return;
  }
  
  // Add one to quantity
  addItemToSelection(itemId, level);
}

/**
 * Clear selection for a specific item/level
 */
function clearLevelSelection(itemId, level) {
  console.log('🗑️ [STORE] Clearing selection for:', itemId, 'level:', level);
  
  const key = getItemKey(itemId, level);
  delete storeState.selectedItems[key];
  
  // Reload items to update UI
  loadStoreItems().then(() => {
    updateStoreUI();
  });
}

/**
 * Clear all selections
 */
function clearStoreSelection() {
  console.log('🗑️ [STORE] Clearing all selections');
  
  storeState.selectedItems = {};
  
  // Reload items to update UI
  loadStoreItems().then(() => {
    updateStoreUI();
  });
}

/**
 * Update store UI based on current state
 */
function updateStoreUI() {
  const summary = document.getElementById('storeSelectedSummary');
  const selectedList = document.getElementById('selectedItemsList');
  const totalElement = document.getElementById('storeTotal');
  const proceedBtn = document.getElementById('proceedToPurchaseBtn');
  
  if (!summary || !selectedList) return;
  
  // Count selected items and calculate total
  let selectedCount = 0;
  const selectedItems = [];
  let totalUsd = 0;
  
  // Process all selected items (format: itemId_level: quantity)
  for (const [key, quantity] of Object.entries(storeState.selectedItems)) {
    if (quantity > 0) {
      // Parse key (format: "itemId_level")
      const [itemId, levelStr] = key.split('_');
      const level = parseInt(levelStr) || 1;
      
      const item = getItemById(itemId);
      if (item) {
        const levelData = getItemLevelData(itemId, level);
        if (levelData) {
          const itemName = item.levels.length > 1 ? `${item.name} Level ${level}` : item.name;
          const itemTotal = levelData.usdPrice * quantity;
          
          totalUsd += itemTotal;
          selectedItems.push({
            name: itemName,
            quantity: quantity,
            unitPrice: levelData.usdPrice,
            totalPrice: itemTotal
          });
          selectedCount += quantity;
        }
      }
    }
  }
  
  // Show/hide summary based on selections
  if (selectedCount > 0) {
    summary.style.display = 'block';
    
    // Update selected items list
    selectedList.innerHTML = selectedItems.map(item => 
      `<div class="selected-item">
        <span class="selected-item-name">${item.name}${item.quantity > 1 ? ` × ${item.quantity}` : ''}</span>
        <span class="selected-item-price">${formatUsdPrice(item.totalPrice)}${item.quantity > 1 ? ` (${formatUsdPrice(item.unitPrice)} each)` : ''}</span>
      </div>`
    ).join('');
    
    // Update total
    const tokenConversion = convertUsdToToken(totalUsd, storeState.paymentToken);
    const tokenSymbol = storeState.paymentToken === 'sui' ? 'SUI' : '$MEWS';
    
    if (totalElement) {
      totalElement.innerHTML = `
        <span>Total: ${formatUsdPrice(totalUsd)} (${tokenConversion.formatted} ${tokenSymbol})</span>
      `;
    }
    
    // Enable proceed button
    if (proceedBtn) {
      proceedBtn.disabled = false;
    }
    
    // Update item card visual states
    updateItemCardStates();
  } else {
    summary.style.display = 'none';
    
    // Disable proceed button
    if (proceedBtn) {
      proceedBtn.disabled = true;
    }
    
    // Update item card visual states
    updateItemCardStates();
  }
}

/**
 * Update visual states of item cards (selected/disabled)
 */
function updateItemCardStates() {
  const cards = document.querySelectorAll('.store-item-card');
  
  cards.forEach(card => {
    const itemId = card.getAttribute('data-item-id');
    const item = getItemById(itemId);
    if (!item) return;
    
    // Get all level containers for this item
    const levelContainers = card.querySelectorAll('.item-level-container');
    let hasAnySelection = false;
    
    levelContainers.forEach(container => {
      const level = parseInt(container.getAttribute('data-level')) || 1;
      const quantity = getItemQuantity(itemId, level);
      const hasQuantity = quantity > 0;
      
      const button = container.querySelector('.item-level-btn, .item-single-btn');
      const quantityControls = container.querySelector('.item-quantity-controls');
      
      // Update selected state
      if (hasQuantity) {
        button.classList.add('selected');
        container.classList.add('selected');
        hasAnySelection = true;
        
        // Show quantity controls if not already shown
        if (!quantityControls) {
          // Recreate the level container with quantity controls
          // This will be handled by reloading items, but for now just update display
          const levelData = getItemLevelData(itemId, level);
          if (levelData) {
            const controlsHTML = `
              <div class="item-quantity-controls">
                <button class="quantity-btn quantity-decrease" onclick="removeItemFromSelection('${itemId}', ${level})" title="Decrease quantity">−</button>
                <span class="quantity-display">${quantity}</span>
                <button class="quantity-btn quantity-increase" onclick="addItemToSelection('${itemId}', ${level})" title="Increase quantity">+</button>
              </div>
            `;
            container.insertAdjacentHTML('beforeend', controlsHTML);
          }
        } else {
          // Update existing quantity display
          const quantityDisplay = quantityControls.querySelector('.quantity-display');
          if (quantityDisplay) {
            quantityDisplay.textContent = quantity;
          }
        }
      } else {
        button.classList.remove('selected');
        container.classList.remove('selected');
        
        // Remove quantity controls if they exist
        if (quantityControls) {
          quantityControls.remove();
        }
      }
      
      // No disabled state needed - users can select multiple items/levels
      button.classList.remove('disabled');
    });
    
    // Update card selected state
    if (hasAnySelection) {
      card.classList.add('selected');
    } else {
      card.classList.remove('selected');
    }
    
    // Update clear buttons for each level
    levelContainers.forEach(container => {
      const level = parseInt(container.getAttribute('data-level')) || 1;
      const quantity = getItemQuantity(itemId, level);
      const hasQuantity = quantity > 0;
      
      const levelButtonWrapper = container.querySelector('.level-button-wrapper');
      const existingClearBtn = container.querySelector('.level-clear-btn');
      
      if (hasQuantity && !existingClearBtn && levelButtonWrapper) {
        // Add clear button
        const clearBtnHTML = `<button class="level-clear-btn" onclick="clearLevelSelection('${itemId}', ${level})" title="Clear this level">✕</button>`;
        levelButtonWrapper.insertAdjacentHTML('beforeend', clearBtnHTML);
      } else if (!hasQuantity && existingClearBtn) {
        // Remove clear button
        existingClearBtn.remove();
      }
    });
  });
}

/**
 * Proceed to purchase confirmation
 * Phase 3: Mock purchase flow using localStorage
 * Phase 5: Will be replaced with backend API + blockchain
 */
async function proceedToPurchase() {
  console.log('💳 [STORE] Proceeding to purchase...');
  console.log('Selected items:', storeState.selectedItems);
  
  // Check if inventory manager is available
  if (typeof addItemToInventory === 'undefined') {
    console.error('❌ [STORE] Inventory manager not loaded!');
    if (typeof showToast === 'function') {
      showToast('Error: Inventory system not available', 'error');
    } else {
      alert('Error: Inventory system not available');
    }
    return;
  }
  
  // Validate selections
  const selectedCount = Object.keys(storeState.selectedItems).filter(
    key => storeState.selectedItems[key] > 0
  ).length;
  
  if (selectedCount === 0) {
    if (typeof showToast === 'function') {
      showToast('Please select items to purchase', 'warning');
    } else {
      alert('Please select items to purchase');
    }
    return;
  }
  
  // Get wallet address (if available)
  let walletAddress = null;
  if (typeof getWalletAddress === 'function') {
    walletAddress = getWalletAddress();
  }
  
  // Show loading state
  storeState.isLoading = true;
  const proceedBtn = document.getElementById('proceedToPurchaseBtn');
  if (proceedBtn) {
    proceedBtn.disabled = true;
    proceedBtn.innerHTML = '<span class="btn-icon">⏳</span> Processing...';
  }
  
  try {
    // Process each selected item
    const purchasedItems = [];
    let totalUsd = 0;
    
    for (const [key, quantity] of Object.entries(storeState.selectedItems)) {
      if (quantity > 0) {
        // Parse key (format: "itemId_level")
        const [itemId, levelStr] = key.split('_');
        const level = parseInt(levelStr) || 1;
        
        // Get item info for display
        const item = getItemById(itemId);
        if (item) {
          const levelData = getItemLevelData(itemId, level);
          if (levelData) {
            // Add to inventory
            addItemToInventory(itemId, level, quantity, walletAddress);
            
            const itemName = item.levels.length > 1 
              ? `${item.name} Level ${level}` 
              : item.name;
            const itemTotal = levelData.usdPrice * quantity;
            
            purchasedItems.push({
              name: itemName,
              quantity: quantity,
              totalPrice: itemTotal
            });
            
            totalUsd += itemTotal;
          }
        }
      }
    }
    
    // Clear selection after successful purchase
    storeState.selectedItems = {};
    
    // Reload items to update inventory display
    await loadStoreItems();
    loadInventoryDisplay();
    updateStoreUI();
    
    // Show success message
    const itemsList = purchasedItems.map(item => 
      `  • ${item.name}${item.quantity > 1 ? ` × ${item.quantity}` : ''}`
    ).join('\n');
    
    const successMessage = `Purchase Successful!\n\nItems added to inventory:\n${itemsList}\n\nTotal: ${formatUsdPrice(totalUsd)}`;
    
    if (typeof showToast === 'function') {
      showToast('Purchase completed! Items added to inventory.', 'success');
    } else {
      alert(successMessage);
    }
    
    console.log('✅ [STORE] Purchase completed:', purchasedItems);
    
  } catch (error) {
    console.error('❌ [STORE] Purchase error:', error);
    
    if (typeof showToast === 'function') {
      showToast('Purchase failed: ' + (error.message || 'Unknown error'), 'error');
    } else {
      alert('Purchase failed: ' + (error.message || 'Unknown error'));
    }
  } finally {
    // Reset loading state
    storeState.isLoading = false;
    if (proceedBtn) {
      proceedBtn.disabled = false;
      proceedBtn.innerHTML = '<span class="btn-icon">💳</span> Proceed to Purchase';
    }
  }
}

/**
 * Load and display inventory in store modal
 */
function loadInventoryDisplay() {
  // Check if inventory manager is available
  if (typeof getAllInventoryItems === 'undefined' || typeof getItemCount === 'undefined') {
    return;
  }
  
  // Get wallet address (if available)
  let walletAddress = null;
  if (typeof getWalletAddress === 'function') {
    walletAddress = getWalletAddress();
  }
  
  // Get all items in inventory
  const inventory = getAllInventoryItems(walletAddress);
  
  // Update item cards to show inventory counts (badges)
  updateItemCardsInventory(inventory);
}

/**
 * Update item cards to show inventory counts
 */
function updateItemCardsInventory(inventory) {
  const cards = document.querySelectorAll('.store-item-card');
  
  cards.forEach(card => {
    const itemId = card.getAttribute('data-item-id');
    const item = getItemById(itemId);
    if (!item) return;
    
    // Get all level containers
    const levelContainers = card.querySelectorAll('.item-level-container');
    
    levelContainers.forEach(container => {
      const level = parseInt(container.getAttribute('data-level')) || 1;
      const key = `${itemId}_${level}`;
      const quantity = inventory[key] || 0;
      
      // Find or create inventory badge
      let inventoryBadge = container.querySelector('.inventory-badge');
      
      if (quantity > 0) {
        if (!inventoryBadge) {
          inventoryBadge = document.createElement('div');
          inventoryBadge.className = 'inventory-badge';
          const levelButtonWrapper = container.querySelector('.level-button-wrapper');
          if (levelButtonWrapper) {
            // Position badge relative to the wrapper
            levelButtonWrapper.style.position = 'relative';
            levelButtonWrapper.appendChild(inventoryBadge);
          }
        }
        inventoryBadge.textContent = `Owned: ${quantity}`;
        inventoryBadge.style.display = 'block';
      } else if (inventoryBadge) {
        inventoryBadge.style.display = 'none';
      }
    });
  });
}

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
  window.proceedToPurchase = proceedToPurchase;
  window.convertUsdToToken = convertUsdToToken;
  window.formatTokenAmount = formatTokenAmount;
  window.formatUsdPrice = formatUsdPrice;
  window.getItemQuantity = getItemQuantity;
}

