// ==========================================
// STORE ITEM SELECTION - Item Selection Management
// ==========================================
// Handles adding, removing, and managing selected items in the store cart

console.log('✅ [STORE ITEM SELECTION] Store item selection module loaded');

// Items that are non-leveled (single SKU, base key only).
const NON_LEVELED_ITEM_IDS = new Set(['destroy_all', 'boss_kill_shot']);

function toDynamicProvisionKey(raw) {
  return String(raw || '')
    .trim()
    .replace(/[-\s]+/g, '_')
    .replace(/([A-Z])/g, '_$1')
    .replace(/^_+/, '')
    .toLowerCase();
}

function getStoreOffersMap() {
  if (typeof StoreService !== 'undefined' && StoreService._state && StoreService._state.storeOffers) {
    return StoreService._state.storeOffers;
  }
  const state = typeof getStoreState === 'function' ? getStoreState() : null;
  return state?.storeOffers || null;
}

function resolveOfferIdForItemLevel(itemId, level) {
  const offers = getStoreOffersMap();
  if (!offers || typeof offers !== 'object') return null;
  const id = String(itemId || '').trim();
  const lvl = Number(level || 1);

  // Non-leveled items should resolve to the base offer id (no :l1 suffix).
  // These SKUs are modeled as a single listing and should not create/require leveled offerIds.
  if (NON_LEVELED_ITEM_IDS.has(toDynamicProvisionKey(id))) {
    if (offers[id]) return id;
    const dyn = toDynamicProvisionKey(id);
    if (offers[dyn]) return dyn;
    return null;
  }

  // Prefer canonical leveled offerIds for item listings.
  // Some direct keys (e.g. "boss_kill_shot") may point to a non-item_listing offer shape that
  // the paid checkout path can't fulfill (missing itemKey/level). The canonical leveled offerId
  // is the most stable for single-item SKUs.
  const canonical = `${toDynamicProvisionKey(id)}:l${lvl}`;
  if (offers[canonical]) return canonical;
  const rawLeveled = `${id}:l${lvl}`;
  if (offers[rawLeveled]) return rawLeveled;

  // Fallback: direct offer id (bundles / standalone SKUs like credits/tickets).
  if (offers[id]) return id;
  return null;
}

function getSelectedOffersState() {
  if (typeof StoreService !== 'undefined' && StoreService._state && StoreService._state.selectedOffers) {
    return StoreService._state.selectedOffers;
  }
  const state = typeof getStoreState === 'function' ? getStoreState() : null;
  if (state && state.selectedOffers) return state.selectedOffers;
  return null;
}

function getSelectedOfferQuantity(offerId) {
  const sel = getSelectedOffersState();
  if (!sel) return 0;
  return sel[String(offerId || '').trim()] || 0;
}

async function addOfferToSelection(offerId) {
  const sel = getSelectedOffersState();
  if (!sel) return;
  const id = String(offerId || '').trim();
  if (!id) return;
  sel[id] = (sel[id] || 0) + 1;
  if (typeof updateStoreUI === 'function') {
    await updateStoreUI();
  }
}

async function removeOfferFromSelection(offerId, event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  const sel = getSelectedOffersState();
  if (!sel) return;
  const id = String(offerId || '').trim();
  const current = sel[id] || 0;
  if (current > 1) sel[id] = current - 1;
  else delete sel[id];
  if (typeof updateStoreUI === 'function') {
    await updateStoreUI();
  }
}

function selectStoreOffer(offerId) {
  console.log('🛒 [STORE ITEM SELECTION] Selecting offer:', offerId);
  void addOfferToSelection(offerId);
}

/**
 * Get quantity for an item/level
 */
function getItemQuantity(itemId, level) {
  const offerId = resolveOfferIdForItemLevel(itemId, level);
  if (!offerId) return 0;
  return getSelectedOfferQuantity(offerId);
}

/**
 * Add item to selection (increment quantity)
 */
async function addItemToSelection(itemId, level) {
  const offerId = resolveOfferIdForItemLevel(itemId, level);
  if (!offerId) return;
  await addOfferToSelection(offerId);
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

  const offerId = resolveOfferIdForItemLevel(itemId, level);
  if (!offerId) return;
  await removeOfferFromSelection(offerId, event);
}

/**
 * Set item quantity directly
 */
async function setItemQuantity(itemId, level, quantity) {
  const offerId = resolveOfferIdForItemLevel(itemId, level);
  if (!offerId) return;
  const sel = getSelectedOffersState();
  if (!sel) return;
  const id = String(offerId).trim();
  if (quantity <= 0) delete sel[id];
  else sel[id] = quantity;
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
  
  // Validate known core items OR dynamic catalog items (e.g. stockroom bundles).
  const validItemTypes = ['extra_lives', 'force_field', 'orb_level', 'coin_tractor_beam', 'slow_time', 'destroy_all', 'boss_kill_shot'];
  const itemExists = typeof getItemById === 'function' ? !!getItemById(itemId) : false;
  if (!validItemTypes.includes(itemId) && !itemExists) {
    console.error('❌ [STORE ITEM SELECTION] Unknown item type:', itemId);
    return;
  }
  
  // Data-driven level default:
  // If caller didn't provide a level (or item has no levels), treat it as level 1.
  if (level === undefined || level === null) {
    const dyn = toDynamicProvisionKey(itemId);
    level = NON_LEVELED_ITEM_IDS.has(dyn) ? null : 1;
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

  const refreshSelectionUi = async () => {
    if (typeof updateItemCardStates === 'function') {
      updateItemCardStates();
    }
    if (typeof updateStoreUI === 'function') {
      await updateStoreUI();
    }
  };

  const offerId = resolveOfferIdForItemLevel(itemId, level);
  if (offerId) {
    const sel = getSelectedOffersState();
    if (sel) delete sel[String(offerId).trim()];
    void refreshSelectionUi();
    return;
  }
  
  void refreshSelectionUi();
}

/**
 * Clear all selections
 */
function clearStoreSelection() {
  const refreshSelectionUi = async () => {
    if (typeof updateItemCardStates === 'function') {
      updateItemCardStates();
    }
    if (typeof updateStoreUI === 'function') {
      await updateStoreUI();
    }
  };

  console.log('🗑️ [STORE ITEM SELECTION] Clearing all selections');
  const state = typeof getStoreState === 'function' ? getStoreState() : null;
  if (!state) return;
  
  state.selectedOffers = {};

  void refreshSelectionUi();
}

// Expose globally
if (typeof window !== 'undefined') {
  window.getItemQuantity = getItemQuantity; // used by item cards (resolve to offerId under the hood)
  window.addItemToSelection = addItemToSelection;
  window.removeItemFromSelection = removeItemFromSelection;
  window.setItemQuantity = setItemQuantity;
  window.selectStoreItem = selectStoreItem;
  window.selectStoreOffer = selectStoreOffer;
  window.addOfferToSelection = addOfferToSelection;
  window.removeOfferFromSelection = removeOfferFromSelection;
  window.clearLevelSelection = clearLevelSelection;
  window.clearStoreSelection = clearStoreSelection;
}

