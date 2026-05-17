// ==========================================
// ITEM CATALOG - Backend Items Only
// ==========================================
// This module provides helper functions to access items from the backend API.
// All item data (including USD prices) comes from the backend via state.storeItems.
// The backend is the single source of truth for item definitions and pricing.

/**
 * Get backend items from state
 * @returns {Array|null} Array of items from backend or null if not available
 */
function getBackendItems() {
  if (typeof StoreService !== 'undefined' && StoreService.getState) {
    const state = StoreService.getState();
    if (state.storeItems && Array.isArray(state.storeItems)) {
      return state.storeItems;
    }
  } else if (typeof getStoreState === 'function') {
    const state = getStoreState();
    if (state?.storeItems && Array.isArray(state.storeItems)) {
      return state.storeItems;
    }
  }
  return null;
}

/**
 * Get item by ID from backend items
 * @param {string} itemId - Item ID (e.g., 'extra_lives', 'force_field')
 * @returns {Object|null} Item object or null if not found
 */
function getItemById(itemId) {
  const items = getBackendItems();
  if (!items) {
    console.warn(`⚠️ [ITEM CATALOG] Backend items not available. Cannot get item: ${itemId}`);
    return null;
  }
  return items.find(i => i.id === itemId) || null;
}

/**
 * Get item price in USD from backend items
 * @param {string} itemId - Item ID
 * @param {number} level - Item level (1, 2, or 3)
 * @returns {number|null} USD price or null if not found
 */
function getItemPrice(itemId, level) {
  const item = getItemById(itemId);
  if (!item) return null;
  
  const levelData = getItemLevelData(itemId, level);
  return levelData ? levelData.usdPrice : null;
}

/**
 * Get all items from backend
 * @returns {Array} Array of all item objects (empty array if backend items not available)
 */
function getAllItems() {
  const items = getBackendItems();
  return items || [];
}

/**
 * Get items by category from backend
 * @param {string} category - Category name ('defensive', 'offensive', 'tactical', 'utility')
 * @returns {Array} Array of items in the specified category
 */
function getItemsByCategory(category) {
  return getAllItems().filter(item => item.category === category);
}

/**
 * Get level data for an item from backend
 * @param {string} itemId - Item ID
 * @param {number} level - Item level
 * @returns {Object|null} Level data object or null if not found
 */
function getItemLevelData(itemId, level) {
  const item = getItemById(itemId);
  if (!item) return null;

  const levels = Array.isArray(item.levels) ? item.levels : [];
  if (levels.length > 0) {
    return levels.find(l => l.level === level) || null;
  }

  // Some Provisions items have no `levels`. Treat them as a single-variant item for UI + purchase math.
  // This does NOT invent new on-chain variants; it just provides a consistent shape for the frontend.
  if (level !== undefined && level !== null && Number(level) !== 1) return null;

  const usdPrice =
    (item?.usdPrice != null && Number(item.usdPrice) >= 0)
      ? Number(item.usdPrice)
      : ((item?.priceUsdCents != null && Number(item.priceUsdCents) >= 0)
        ? Number(item.priceUsdCents) / 100
        : 0);

  return {
    level: 1,
    effect: item?.effect || item?.description || '',
    usdPrice,
    priceUsdCents: (item?.priceUsdCents != null ? Number(item.priceUsdCents) : Math.round(usdPrice * 100)),
    prices: item?.prices,
  };
}

/**
 * Check if item has multiple levels
 * @param {string} itemId - Item ID
 * @returns {boolean} True if item has multiple levels
 */
function hasMultipleLevels(itemId) {
  const item = getItemById(itemId);
  const levels = item && Array.isArray(item.levels) ? item.levels : [];
  return levels.length > 1;
}

/**
 * Get max level for an item
 * @param {string} itemId - Item ID
 * @returns {number} Maximum level (or 1 if single-level item)
 */
function getMaxLevel(itemId) {
  const item = getItemById(itemId);
  const levels = item && Array.isArray(item.levels) ? item.levels : [];
  return levels.length > 0 ? levels.length : 1;
}

// Make functions globally accessible
if (typeof window !== 'undefined') {
  window.getItemById = getItemById;
  window.getItemPrice = getItemPrice;
  window.getAllItems = getAllItems;
  window.getItemsByCategory = getItemsByCategory;
  window.getItemLevelData = getItemLevelData;
  window.hasMultipleLevels = hasMultipleLevels;
  window.getMaxLevel = getMaxLevel;
  // Note: ITEM_CATALOG is no longer exposed - use getAllItems() to get items from backend
}
