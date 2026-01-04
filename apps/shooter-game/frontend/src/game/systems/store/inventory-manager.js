// ==========================================
// INVENTORY MANAGER
// ==========================================
// Manages player inventory using localStorage (Phase 3: Mock Purchase Flow)
// Will be replaced with blockchain integration in Phase 7-8

const INVENTORY_STORAGE_KEY = 'shootergame_inventory';

/**
 * Get wallet address for inventory storage
 * Uses wallet connection if available, otherwise uses a default key
 */
function getInventoryKey() {
  // Try to get wallet address from wallet connection
  if (typeof getWalletAddress === 'function') {
    const address = getWalletAddress();
    if (address) {
      return `${INVENTORY_STORAGE_KEY}_${address}`;
    }
  }
  
  // Fallback: use a default key for testing without wallet
  return `${INVENTORY_STORAGE_KEY}_default`;
}

/**
 * Get player inventory from localStorage
 * @param {string} walletAddress - Optional wallet address (if not provided, uses current wallet)
 * @returns {Object} Inventory object with item counts
 */
function getInventory(walletAddress = null) {
  const storageKey = walletAddress 
    ? `${INVENTORY_STORAGE_KEY}_${walletAddress}`
    : getInventoryKey();
  
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const inventory = JSON.parse(stored);
      // Ensure structure is correct
      return {
        walletAddress: inventory.walletAddress || walletAddress || 'default',
        items: inventory.items || {},
        lastUpdated: inventory.lastUpdated || Date.now()
      };
    }
  } catch (error) {
    console.error('❌ [INVENTORY] Error reading inventory:', error);
  }
  
  // Return empty inventory if nothing found
  return {
    walletAddress: walletAddress || 'default',
    items: {},
    lastUpdated: Date.now()
  };
}

/**
 * Save inventory to localStorage
 * @param {Object} inventory - Inventory object to save
 */
function saveInventory(inventory) {
  const storageKey = inventory.walletAddress 
    ? `${INVENTORY_STORAGE_KEY}_${inventory.walletAddress}`
    : getInventoryKey();
  
  try {
    inventory.lastUpdated = Date.now();
    localStorage.setItem(storageKey, JSON.stringify(inventory));
    console.log('💾 [INVENTORY] Saved inventory:', storageKey);
  } catch (error) {
    console.error('❌ [INVENTORY] Error saving inventory:', error);
    throw error;
  }
}

/**
 * Add item to inventory
 * @param {string} itemId - Item ID (e.g., 'extraLives')
 * @param {number} level - Item level (1, 2, or 3)
 * @param {number} quantity - Quantity to add (default: 1)
 * @param {string} walletAddress - Optional wallet address
 * @returns {Object} Updated inventory
 */
function addItemToInventory(itemId, level, quantity = 1, walletAddress = null) {
  console.log(`➕ [INVENTORY] Adding ${quantity}x ${itemId}_${level}`);
  
  const inventory = getInventory(walletAddress);
  const key = `${itemId}_${level}`;
  
  // Initialize items object if needed
  if (!inventory.items) {
    inventory.items = {};
  }
  
  // Add to existing quantity
  const currentQuantity = inventory.items[key] || 0;
  inventory.items[key] = currentQuantity + quantity;
  
  // Update wallet address if provided
  if (walletAddress) {
    inventory.walletAddress = walletAddress;
  } else if (!inventory.walletAddress) {
    // Try to get from wallet connection
    if (typeof getWalletAddress === 'function') {
      const address = getWalletAddress();
      if (address) {
        inventory.walletAddress = address;
      }
    }
  }
  
  saveInventory(inventory);
  console.log(`✅ [INVENTORY] Added ${quantity}x ${itemId}_${level}. New total: ${inventory.items[key]}`);
  
  return inventory;
}

/**
 * Remove item from inventory (consume)
 * @param {string} itemId - Item ID
 * @param {number} level - Item level
 * @param {number} quantity - Quantity to remove (default: 1)
 * @param {string} walletAddress - Optional wallet address
 * @returns {Object} Updated inventory
 */
function removeItemFromInventory(itemId, level, quantity = 1, walletAddress = null) {
  console.log(`➖ [INVENTORY] Removing ${quantity}x ${itemId}_${level}`);
  
  const inventory = getInventory(walletAddress);
  const key = `${itemId}_${level}`;
  
  if (!inventory.items || !inventory.items[key]) {
    console.warn(`⚠️ [INVENTORY] Item not found: ${key}`);
    return inventory;
  }
  
  const currentQuantity = inventory.items[key];
  const newQuantity = Math.max(0, currentQuantity - quantity);
  
  if (newQuantity === 0) {
    delete inventory.items[key];
  } else {
    inventory.items[key] = newQuantity;
  }
  
  saveInventory(inventory);
  console.log(`✅ [INVENTORY] Removed ${quantity}x ${itemId}_${level}. New total: ${newQuantity}`);
  
  return inventory;
}

/**
 * Check if player has item
 * @param {string} itemId - Item ID
 * @param {number} level - Item level
 * @param {string} walletAddress - Optional wallet address
 * @returns {boolean} True if player has at least one of this item
 */
function hasItem(itemId, level, walletAddress = null) {
  const inventory = getInventory(walletAddress);
  const key = `${itemId}_${level}`;
  return (inventory.items && inventory.items[key] > 0) || false;
}

/**
 * Get item count
 * @param {string} itemId - Item ID
 * @param {number} level - Item level
 * @param {string} walletAddress - Optional wallet address
 * @returns {number} Quantity of item in inventory
 */
function getItemCount(itemId, level, walletAddress = null) {
  const inventory = getInventory(walletAddress);
  const key = `${itemId}_${level}`;
  return (inventory.items && inventory.items[key]) || 0;
}

/**
 * Get all items in inventory
 * @param {string} walletAddress - Optional wallet address
 * @returns {Object} Object with item counts (format: { itemId_level: quantity })
 */
function getAllInventoryItems(walletAddress = null) {
  const inventory = getInventory(walletAddress);
  return inventory.items || {};
}

/**
 * Clear all inventory (for testing)
 * @param {string} walletAddress - Optional wallet address
 */
function clearInventory(walletAddress = null) {
  const storageKey = walletAddress 
    ? `${INVENTORY_STORAGE_KEY}_${walletAddress}`
    : getInventoryKey();
  
  try {
    localStorage.removeItem(storageKey);
    console.log('🗑️ [INVENTORY] Cleared inventory:', storageKey);
  } catch (error) {
    console.error('❌ [INVENTORY] Error clearing inventory:', error);
  }
}

// Make functions globally accessible
if (typeof window !== 'undefined') {
  window.getInventory = getInventory;
  window.saveInventory = saveInventory;
  window.addItemToInventory = addItemToInventory;
  window.removeItemFromInventory = removeItemFromInventory;
  window.hasItem = hasItem;
  window.getItemCount = getItemCount;
  window.getAllInventoryItems = getAllInventoryItems;
  window.clearInventory = clearInventory;
}

