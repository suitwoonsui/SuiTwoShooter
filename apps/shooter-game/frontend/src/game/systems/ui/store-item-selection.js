// ==========================================
// STORE ITEM SELECTION - Item Selection Management
// ==========================================
// Handles adding, removing, and managing selected items in the store cart

console.log('✅ [STORE ITEM SELECTION] Store item selection module loaded');

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
  // Delegate to StoreService if available
  if (typeof StoreService !== 'undefined' && StoreService.getItemQuantity) {
    return StoreService.getItemQuantity(itemId, level);
  }
  
  // Fallback: original implementation
  if (typeof updateStoreStateReference === 'function') {
    updateStoreStateReference();
  }
  const state = typeof getStoreState === 'function' ? getStoreState() : null;
  if (!state) return 0;
  
  const key = getItemKey(itemId, level);
  return state.selectedItems[key] || 0;
}

/**
 * Add item to selection (increment quantity)
 */
async function addItemToSelection(itemId, level) {
  // Delegate to StoreService if available
  if (typeof StoreService !== 'undefined' && StoreService.addItemToSelection) {
    await StoreService.addItemToSelection(itemId, level);
    // Update local reference after service call
    if (typeof updateStoreStateReference === 'function') {
      updateStoreStateReference();
    }
    return;
  }
  
  // Fallback: original implementation
  if (typeof updateStoreStateReference === 'function') {
    updateStoreStateReference();
  }
  const state = typeof getStoreState === 'function' ? getStoreState() : null;
  if (!state) return;
  
  const key = getItemKey(itemId, level);
  const currentQty = getItemQuantity(itemId, level);
  state.selectedItems[key] = currentQty + 1;
  console.log('➕ [STORE ITEM SELECTION] Added item:', key, 'quantity:', state.selectedItems[key]);
  
  if (typeof updateStoreUI === 'function') {
    await updateStoreUI();
  }
}

/**
 * Remove item from selection (decrement quantity)
 * @param {string} itemId - Item ID
 * @param {number} level - Item level
 * @param {Event} event - Click event (optional, used to stop propagation)
 */
async function removeItemFromSelection(itemId, level, event) {
  // Stop event propagation to prevent click-outside handler from closing the store
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  
  // Delegate to StoreService if available
  if (typeof StoreService !== 'undefined' && StoreService.removeItemFromSelection) {
    await StoreService.removeItemFromSelection(itemId, level);
    // Update local reference after service call
    if (typeof updateStoreStateReference === 'function') {
      updateStoreStateReference();
    }
    return;
  }
  
  // Fallback: original implementation
  if (typeof updateStoreStateReference === 'function') {
    updateStoreStateReference();
  }
  const state = typeof getStoreState === 'function' ? getStoreState() : null;
  if (!state) return;
  
  const key = getItemKey(itemId, level);
  const currentQty = getItemQuantity(itemId, level);
  if (currentQty > 0) {
    state.selectedItems[key] = currentQty - 1;
    if (state.selectedItems[key] === 0) {
      delete state.selectedItems[key];
    }
    console.log('➖ [STORE ITEM SELECTION] Removed item:', key, 'quantity:', state.selectedItems[key] || 0);
    
    if (typeof updateStoreUI === 'function') {
      await updateStoreUI();
    }
  }
}

/**
 * Set item quantity directly
 */
async function setItemQuantity(itemId, level, quantity) {
  // Delegate to StoreService if available
  if (typeof StoreService !== 'undefined' && StoreService.setItemQuantity) {
    await StoreService.setItemQuantity(itemId, level, quantity);
    // Update local reference after service call
    if (typeof updateStoreStateReference === 'function') {
      updateStoreStateReference();
    }
    return;
  }
  
  // Fallback: original implementation
  if (typeof updateStoreStateReference === 'function') {
    updateStoreStateReference();
  }
  const state = typeof getStoreState === 'function' ? getStoreState() : null;
  if (!state) return;
  
  const key = getItemKey(itemId, level);
  if (quantity <= 0) {
    delete state.selectedItems[key];
  } else {
    state.selectedItems[key] = quantity;
  }
  console.log('🔢 [STORE ITEM SELECTION] Set quantity:', key, '=', quantity);
  
  if (typeof updateStoreUI === 'function') {
    await updateStoreUI();
  }
}

/**
 * Select item (adds one to quantity)
 * Users can select multiple of the same item/level for purchase
 */
function selectStoreItem(itemId, level) {
  console.log('🛒 [STORE ITEM SELECTION] Selecting item:', itemId, 'level:', level);
  
  // Validate item type (order: coinTractorBeam before slowTime)
  const validItemTypes = ['extraLives', 'forceField', 'orbLevel', 'coinTractorBeam', 'slowTime', 'destroyAll', 'bossKillShot'];
  if (!validItemTypes.includes(itemId)) {
    console.error('❌ [STORE ITEM SELECTION] Invalid item type:', itemId);
    return;
  }
  
  // Handle single-level items (level defaults to 1)
  if (itemId === 'destroyAll' || itemId === 'bossKillShot') {
    level = 1;
  }
  
  if (level === undefined || level === null) {
    console.error('❌ [STORE ITEM SELECTION] Level required for item type:', itemId);
    return;
  }
  
  // Add one to quantity
  if (typeof addItemToSelection === 'function') {
    addItemToSelection(itemId, level);
  }
}

/**
 * Clear selection for a specific item/level
 */
function clearLevelSelection(itemId, level, event) {
  // Stop event propagation to prevent closing the store
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  
  console.log('🗑️ [STORE ITEM SELECTION] Clearing selection for:', itemId, 'level:', level);
  
  // Delegate to StoreService if available
  if (typeof StoreService !== 'undefined' && StoreService.clearLevelSelection) {
    StoreService.clearLevelSelection(itemId, level, event);
    // Update local reference after service call
    if (typeof updateStoreStateReference === 'function') {
      updateStoreStateReference();
    }
    // Reload items to update UI
    if (typeof loadStoreItems === 'function') {
      loadStoreItems().then(async () => {
        if (typeof updateStoreUI === 'function') {
          await updateStoreUI();
        }
      });
    }
    return;
  }
  
  // Fallback: original implementation
  const state = typeof getStoreState === 'function' ? getStoreState() : null;
  if (!state) return;
  
  const key = getItemKey(itemId, level);
  delete state.selectedItems[key];
  
  // Reload items to update UI
  if (typeof loadStoreItems === 'function') {
    loadStoreItems().then(async () => {
      if (typeof updateStoreUI === 'function') {
        await updateStoreUI();
      }
    });
  }
}

/**
 * Clear all selections
 */
function clearStoreSelection() {
  // Delegate to StoreService if available
  if (typeof StoreService !== 'undefined' && StoreService.clearStoreSelection) {
    StoreService.clearStoreSelection();
    // Update local reference after service call
    if (typeof updateStoreStateReference === 'function') {
      updateStoreStateReference();
    }
    // Reload items to update UI
    if (typeof loadStoreItems === 'function') {
      loadStoreItems().then(async () => {
        if (typeof updateStoreUI === 'function') {
          await updateStoreUI();
        }
      });
    }
    return;
  }
  
  // Fallback: original implementation
  console.log('🗑️ [STORE ITEM SELECTION] Clearing all selections');
  const state = typeof getStoreState === 'function' ? getStoreState() : null;
  if (!state) return;
  
  state.selectedItems = {};
  
  // Reload items to update UI
  if (typeof loadStoreItems === 'function') {
    loadStoreItems().then(async () => {
      if (typeof updateStoreUI === 'function') {
        await updateStoreUI();
      }
    });
  }
}

// Expose globally
if (typeof window !== 'undefined') {
  window.getItemKey = getItemKey;
  window.getItemQuantity = getItemQuantity;
  window.addItemToSelection = addItemToSelection;
  window.removeItemFromSelection = removeItemFromSelection;
  window.setItemQuantity = setItemQuantity;
  window.selectStoreItem = selectStoreItem;
  window.clearLevelSelection = clearLevelSelection;
  window.clearStoreSelection = clearStoreSelection;
}

