// ==========================================
// STORE CONTEXT RULES — inventory / items / bundles surface per flow
// ==========================================
// One place to define: which tab buttons show, whether the catalog/cart finalize runs,
// and whether the tournament tickets tab is preloaded. Prep loadouts (regular-entry, tournament-entry)
// share commerce rules; tournament-entry alone uses gold chrome in the modal.

(function initStoreContextRules(global) {
  const TAB_IDS = Object.freeze({
    inventory: 'storeTabInventory',
    items: 'storeTabItems',
    bundles: 'storeTabBundles',
    gamePass: 'storeTabGamePass',
    tickets: 'storeTabTickets',
  });

  const ALL_TAB_KEYS = Object.freeze(Object.keys(TAB_IDS));

  /**
   * @typedef {Object} StoreSurfaceRules
   * @property {string[] | null} allowedTabKeys — null = show all tab buttons (credits-only flow still applies its own hides afterward)
   * @property {boolean} showPaymentSelector
   * @property {boolean} loadItemsCatalog — Items tab grid + cart SKUs
   * @property {boolean} preloadTicketsTab — network/render for Tournament Tickets tab
   * @property {boolean} commerceFinalize — updateStoreUI() after open (cart mirrors, etc.)
   * @property {boolean} useTournamentChrome — gold frame + tournament back/title (false = default blue store look)
   */

  const PREP_LOADOUT_SURFACE = Object.freeze({
    allowedTabKeys: ['inventory', 'items', 'bundles'],
    showPaymentSelector: true,
    loadItemsCatalog: true,
    preloadTicketsTab: false,
    commerceFinalize: true,
  });

  /** @param {string} context */
  function getStoreSurfaceRules(context) {
    if (context === 'tournament-entry') {
      return {
        ...PREP_LOADOUT_SURFACE,
        useTournamentChrome: true,
      };
    }
    if (context === 'regular-entry') {
      return {
        ...PREP_LOADOUT_SURFACE,
        useTournamentChrome: false,
      };
    }
    if (context === 'credits-only') {
      return {
        allowedTabKeys: null,
        showPaymentSelector: true,
        loadItemsCatalog: false,
        preloadTicketsTab: false,
        commerceFinalize: false,
        useTournamentChrome: false,
      };
    }
    return {
      allowedTabKeys: null,
      showPaymentSelector: true,
      loadItemsCatalog: true,
      preloadTicketsTab: true,
      commerceFinalize: true,
      useTournamentChrome: false,
    };
  }

  /** @param {string} context @param {string} tabName */
  function isTabAllowed(context, tabName) {
    const r = getStoreSurfaceRules(context);
    if (!r.allowedTabKeys) return true;
    return r.allowedTabKeys.includes(tabName);
  }

  /** Inventory + Items + Bundles prep surface (regular run vs tournament). */
  function isPrepLoadoutContext(context) {
    return context === 'tournament-entry' || context === 'regular-entry';
  }

  /**
   * Show/hide tab *buttons* only. Tab panels stay in DOM; switchStoreTab controls .active.
   * @param {string} context
   */
  function applyCommerceTabStrip(context) {
    const doc = global.document;
    if (!doc) return;

    const r = getStoreSurfaceRules(context);
    const bar = doc.getElementById('storeTabs');

    if (!r.allowedTabKeys) {
      ALL_TAB_KEYS.forEach((key) => {
        const el = doc.getElementById(TAB_IDS[key]);
        if (el) el.style.display = '';
      });
      if (bar) {
        bar.style.display = '';
        bar.style.justifyContent = '';
      }
      return;
    }

    ALL_TAB_KEYS.forEach((key) => {
      const el = doc.getElementById(TAB_IDS[key]);
      if (!el) return;
      el.style.display = r.allowedTabKeys.includes(key) ? '' : 'none';
    });

    if (bar) {
      bar.style.display = r.allowedTabKeys.length ? '' : 'none';
      bar.style.justifyContent = r.allowedTabKeys.length <= 3 ? 'flex-start' : '';
    }
  }

  global.StoreContextRules = {
    TAB_IDS,
    PREP_LOADOUT_SURFACE,
    getStoreSurfaceRules,
    isTabAllowed,
    isPrepLoadoutContext,
    applyCommerceTabStrip,
  };

  // Global helper so store-service / store-wallet (and store-modal) don't repeat context id pairs.
  // lazy-loader lists this file before store-service.js and store-wallet-connection.js.
  global.isPrepLoadoutStoreContext = isPrepLoadoutContext;
})(typeof window !== 'undefined' ? window : globalThis);
