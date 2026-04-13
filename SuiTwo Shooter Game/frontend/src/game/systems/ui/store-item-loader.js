// ==========================================
// STORE ITEM LOADER - Load Items from Backend
// ==========================================
// Fetches store catalog from the game backend (which in turn reflects on-chain Provisions).
// The frontend must not "define" items or variants; it only renders the catalog returned.

console.log('✅ [STORE ITEM LOADER] Store item loader module loaded');

function getStoreCatalogCacheTtlMs() {
  if (typeof window !== 'undefined' && typeof window.STORE_CATALOG_CACHE_TTL_MS === 'number' && window.STORE_CATALOG_CACHE_TTL_MS > 0) {
    return window.STORE_CATALOG_CACHE_TTL_MS;
  }
  return 15 * 60 * 1000;
}

// These are special "currency" SKUs that should not appear in the Items tab.
// (They are rendered by dedicated tabs instead.)
const STORE_STANDALONE_ITEM_IDS = new Set(['credits', 'tickets']);

function mergeItemLevelsPreferComplete(currentLevels, previousLevels) {
  const byLevel = new Map();
  for (const lvl of Array.isArray(previousLevels) ? previousLevels : []) {
    const n = Number(lvl?.level);
    if (Number.isFinite(n) && n > 0) byLevel.set(n, { ...lvl });
  }
  for (const lvl of Array.isArray(currentLevels) ? currentLevels : []) {
    const n = Number(lvl?.level);
    if (!Number.isFinite(n) || n <= 0) continue;
    const prev = byLevel.get(n) || {};
    // Prefer fresh fields from current response, but keep any fields previously known.
    byLevel.set(n, { ...prev, ...lvl });
  }
  return Array.from(byLevel.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, lvl]) => lvl);
}

function mergeItemsPreferComplete(currentItems, previousItems) {
  const curr = Array.isArray(currentItems) ? currentItems : [];
  const prev = Array.isArray(previousItems) ? previousItems : [];
  const prevById = new Map(prev.map((it) => [String(it?.id || ''), it]));
  const mergedCurrent = curr.map((item) => {
    const id = String(item?.id || '');
    const prevItem = prevById.get(id);
    if (!prevItem) return item;
    return {
      ...prevItem,
      ...item,
      levels: mergeItemLevelsPreferComplete(item?.levels, prevItem?.levels),
    };
  });

  // If current payload is partial, keep previously-known items that disappeared.
  if (prev.length > curr.length) {
    const currentIds = new Set(mergedCurrent.map((it) => String(it?.id || '')));
    for (const p of prev) {
      const id = String(p?.id || '');
      if (id && !currentIds.has(id)) mergedCurrent.push(p);
    }
  }
  return mergedCurrent;
}

function getStoreApiBase() {
  if (typeof StoreDataSources !== 'undefined' && StoreDataSources.getShooterGameApiBase) {
    return StoreDataSources.getShooterGameApiBase();
  }
  const raw = window.GameApi ? window.GameApi.getBaseUrl() : (window.GAME_CONFIG?.GAME_BACKEND_URL || window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3001/api');
  return String(raw).replace(/\/$/, '');
}

function normalizeCatalogItems(items) {
  return (Array.isArray(items) ? items : []).map((item) => {
    const rawLevels = Array.isArray(item?.levels) ? item.levels : [];
    const levels = rawLevels.map((lvl) => ({
      ...lvl,
      // Terminal uses priceUsdCents; item cards expect level.usdPrice.
      usdPrice: (lvl?.priceUsdCents != null && Number(lvl.priceUsdCents) >= 0) ? Number(lvl.priceUsdCents) / 100 : 0,
    }));
    return { ...item, levels };
  });
}

function toDynamicProvisionKey(raw) {
  return String(raw || '')
    .trim()
    .replace(/[-\s]+/g, '_')
    .replace(/([A-Z])/g, '_$1')
    .replace(/^_+/, '')
    .toLowerCase();
}

function deriveItemOrderFromOfferOrder(offerOrder) {
  if (!Array.isArray(offerOrder) || offerOrder.length === 0) return null;
  const seen = new Set();
  const out = [];
  for (const raw of offerOrder) {
    const s = String(raw || '').trim();
    if (!s) continue;
    // canonical leveled key: "item_key:l2" → base item id "item_key"
    const base = s.replace(/:l\d+$/i, '');
    const key = toDynamicProvisionKey(base);
    if (!key) continue;
    if (STORE_STANDALONE_ITEM_IDS.has(key)) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out.length ? out : null;
}

function previewList(arr, n) {
  const a = Array.isArray(arr) ? arr : [];
  const max = Math.max(0, Math.floor(Number(n) || 0));
  return a.slice(0, max);
}

/**
 * Ensure store catalog (storeItems) is loaded into state without requiring Store modal DOM.
 * Used by item-consumption modal so getAllItems() works when user starts game without opening Store first.
 * @returns {Promise<boolean>} true if catalog is available (was already loaded or just loaded)
 */
async function ensureStoreCatalogLoaded() {
  try {
    if (typeof getBackendItems === 'function') {
      const existing = getBackendItems();
      if (existing && Array.isArray(existing) && existing.length > 0) return true;
    }
  } catch (_) { /* ignore */ }

  const prefetched = window.__prefetchedStoreCatalog;
  const ttlOk = prefetched && prefetched.success && prefetched.at && (Date.now() - prefetched.at) < getStoreCatalogCacheTtlMs();
  const hasRows =
    ttlOk &&
    ((Array.isArray(prefetched.items) && prefetched.items.length > 0) ||
      (prefetched.offers && typeof prefetched.offers === 'object' && Object.keys(prefetched.offers).length > 0));
  if (hasRows) {
    const baseItems = Array.isArray(prefetched.items) ? prefetched.items : [];
    const merged =
      typeof window !== 'undefined' &&
      window.StoreDataSources &&
      typeof window.StoreDataSources.mergeBundlesIntoStoreItems === 'function'
        ? window.StoreDataSources.mergeBundlesIntoStoreItems(baseItems, prefetched)
        : baseItems;
    if (typeof StoreService !== 'undefined' && StoreService._state) {
      StoreService._state.storeItems = merged;
      StoreService._state.storeOffers = prefetched.offers || StoreService._state.storeOffers || null;
      StoreService._state.tokenPrices = prefetched.prices || StoreService._state.tokenPrices;
      StoreService._state.tokenPricesTimestamp = prefetched.at;
    }
    return true;
  }

  try {
    const data =
      (typeof window !== 'undefined' && window.StoreDataSources && window.StoreDataSources.fetchStoreCatalogRaw)
        ? await window.StoreDataSources.fetchStoreCatalogRaw({ maxAgeMs: getStoreCatalogCacheTtlMs() })
        : await (async () => {
            const response = await fetch(`${getStoreApiBase()}/store/catalog`, { cache: 'no-store' });
            if (!response.ok) throw new Error(`Store catalog: ${response.status}`);
            return await response.json();
          })();
    if (!data.success) return false;
    const rawItems = Array.isArray(data.items) ? data.items : [];
    const offerCount = data.offers && typeof data.offers === 'object' ? Object.keys(data.offers).length : 0;
    if (rawItems.length === 0 && offerCount === 0) return false;

    const normalizedItems = normalizeCatalogItems(rawItems);
    const previousItems =
      (typeof StoreService !== 'undefined' && StoreService._state && Array.isArray(StoreService._state.storeItems))
        ? StoreService._state.storeItems
        : [];
    const mergedItems = mergeItemsPreferComplete(normalizedItems, previousItems);

    const mergedWithBundles =
      typeof window !== 'undefined' &&
      window.StoreDataSources &&
      typeof window.StoreDataSources.mergeBundlesIntoStoreItems === 'function'
        ? window.StoreDataSources.mergeBundlesIntoStoreItems(mergedItems, data)
        : mergedItems;
    if (typeof StoreService !== 'undefined' && StoreService._state) {
      StoreService._state.storeItems = mergedWithBundles;
      StoreService._state.storeOffers = data.offers || StoreService._state.storeOffers || null;
      StoreService._state.tokenPrices = data.prices || StoreService._state.tokenPrices;
      StoreService._state.tokenPricesTimestamp = Date.now();
    }
    return true;
  } catch (e) {
    console.warn('[STORE ITEM LOADER] ensureStoreCatalogLoaded failed', e);
    return false;
  }
}

/**
 * Load store items from backend API and render the Items tab.
 */
async function loadStoreItems() {
  console.log('📦 [STORE ITEM LOADER] Loading store items from backend...');

  const container = document.getElementById('storeItemsContainer');
  const loading = document.getElementById('storeLoading');

  if (!container || !loading) return;

  // Update local state reference
  if (typeof updateStoreStateReference === 'function') {
    updateStoreStateReference();
  }
  const state = typeof getStoreState === 'function' ? getStoreState() : null;

  // Show loading state
  if (state) {
    state.isLoading = true;
    if (typeof StoreService !== 'undefined' && StoreService._state) {
      StoreService._state.isLoading = true;
    }
  }
  loading.style.display = 'block';
  container.innerHTML = '';
  container.appendChild(loading);

  try {
    let data = null;
    let retrievalMethod = 'http';
    let retrievalSource = `${getStoreApiBase()}/store/catalog`;

    const prefetched = window.__prefetchedStoreCatalog;
    if (prefetched && prefetched.success && (Date.now() - prefetched.at) < getStoreCatalogCacheTtlMs()) {
      data = prefetched;
      retrievalMethod = 'prefetch';
      retrievalSource = 'window.__prefetchedStoreCatalog';
    }

    if (!data && typeof window !== 'undefined' && window.StoreDataSources && window.StoreDataSources.fetchStoreCatalogRaw) {
      data = await window.StoreDataSources.fetchStoreCatalogRaw({ maxAgeMs: getStoreCatalogCacheTtlMs() });
      if (data?.success && data?.items) {
        retrievalMethod = 'store-data-sources-cache';
        retrievalSource = 'StoreDataSources.fetchStoreCatalogRaw(maxAgeMs)';
      } else {
        data = null;
      }
    }

    if (!data) {
      const response = await fetch(`${getStoreApiBase()}/store/catalog`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Failed to load store items: ${response.status} ${response.statusText}`);
      data = await response.json();
      if (!data.success || !data.items) throw new Error(data.error || 'Invalid response from server');
      retrievalMethod = 'http';
      retrievalSource = `${getStoreApiBase()}/store/catalog`;
    }

    // Empty/missing offerOrder: use stable fallback sort below. Do not force-fetch here — that bypassed the
    // catalog TTL (e.g. menu bootstrap prefetch) and caused redundant /store/catalog calls seconds after load.

    const timestamp = Date.now();
    const normalizedItems = normalizeCatalogItems(data.items || []);
    const previousItems = (state && Array.isArray(state.storeItems))
      ? state.storeItems
      : ((typeof StoreService !== 'undefined' && StoreService._state && Array.isArray(StoreService._state.storeItems))
        ? StoreService._state.storeItems
        : []);

    const stabilizedItems = mergeItemsPreferComplete(normalizedItems, previousItems);

    const missingLevels = stabilizedItems
      .filter((item) => !Array.isArray(item?.levels) || item.levels.length === 0)
      .map((item) => item?.id)
      .filter(Boolean);
    if (missingLevels.length > 0) {
      console.warn('[STORE ITEM LOADER] Catalog items missing levels (expected for some Provisions items)', { ids: missingLevels });
    }

    const filteredItems = stabilizedItems.filter((item) => {
      const id = String(item?.id || '').trim().toLowerCase();
      return !STORE_STANDALONE_ITEM_IDS.has(id);
    });

    const itemOrder = deriveItemOrderFromOfferOrder(data.offerOrder);
    const indexById = itemOrder
      ? new Map(itemOrder.map((id, idx) => [toDynamicProvisionKey(id), idx]))
      : null;

    const orderedItems = [...filteredItems].sort((a, b) => {
      // Preferred: on-chain saved Stockroom order via Terminal offerOrder.
      if (indexById) {
        const ai = indexById.get(toDynamicProvisionKey(a?.id)) ?? Number.POSITIVE_INFINITY;
        const bi = indexById.get(toDynamicProvisionKey(b?.id)) ?? Number.POSITIVE_INFINITY;
        if (ai !== bi) return ai - bi;
      }

      // Fallback: stable / legacy ordering when offerOrder isn't present.
      const aPri = Number(a?.uiPriority ?? a?.sortOrder ?? Number.NaN);
      const bPri = Number(b?.uiPriority ?? b?.sortOrder ?? Number.NaN);
      const aHas = Number.isFinite(aPri);
      const bHas = Number.isFinite(bPri);
      if (aHas && bHas && aPri !== bPri) return aPri - bPri;
      if (aHas !== bHas) return aHas ? -1 : 1;
      const aName = String(a?.name || '').trim().toLowerCase();
      const bName = String(b?.name || '').trim().toLowerCase();
      if (aName && bName && aName !== bName) return aName.localeCompare(bName);
      const aId = String(a?.id || '').trim().toLowerCase();
      const bId = String(b?.id || '').trim().toLowerCase();
      return aId.localeCompare(bId);
    });

    const orderDebug = orderedItems.map((it) => {
      const id = String(it?.id || '').trim();
      const dyn = toDynamicProvisionKey(id);
      const orderIdx = indexById ? (indexById.get(dyn) ?? null) : null;
      const priRaw = it?.uiPriority ?? it?.sortOrder;
      const pri = Number(priRaw);
      return {
        id,
        dyn,
        orderIdx,
        uiPriority: Number.isFinite(pri) ? pri : null,
        name: String(it?.name || '').trim() || null,
        hasLevels: Array.isArray(it?.levels) ? it.levels.length : 0,
      };
    });

    console.log('[STORE ITEM LOADER] items retrieval', {
      method: retrievalMethod,
      source: retrievalSource,
      retrievedCountRaw: Array.isArray(data.items) ? data.items.length : 0,
      stabilizedCountRaw: stabilizedItems.length,
      missingLevelsCount: missingLevels.length,
      offerOrderCount: Array.isArray(data.offerOrder) ? data.offerOrder.length : 0,
      usedOfferOrder: !!indexById,
      itemsTabCount: orderedItems.length,
      itemsTabIds: orderedItems.map((i) => i?.id),
    });

    console.log('[STORE ITEM LOADER] ordering debug', {
      offerOrderPreview: previewList(data.offerOrder, 25),
      derivedItemOrder: itemOrder,
      derivedItemOrderCount: Array.isArray(itemOrder) ? itemOrder.length : 0,
      first10Rendered: previewList(orderDebug, 10),
      // Full ranks for deep troubleshooting (kept compact and structured).
      renderedOrderRanks: orderDebug.map((x) => ({ id: x.id, orderIdx: x.orderIdx })),
    });

    const mergedStoreItems =
      typeof window !== 'undefined' &&
      window.StoreDataSources &&
      typeof window.StoreDataSources.mergeBundlesIntoStoreItems === 'function'
        ? window.StoreDataSources.mergeBundlesIntoStoreItems(orderedItems, data)
        : orderedItems;

    if (state) {
      state.tokenPrices = data.prices;
      state.tokenPricesTimestamp = timestamp;
      state.storeItems = mergedStoreItems;
      state.storeOffers = data.offers || state.storeOffers || null;
      state.offerOrder = Array.isArray(data.offerOrder) ? data.offerOrder : state.offerOrder || null;
    }
    if (typeof StoreService !== 'undefined' && StoreService._state) {
      StoreService._state.tokenPrices = data.prices;
      StoreService._state.tokenPricesTimestamp = timestamp;
      StoreService._state.storeItems = mergedStoreItems;
      StoreService._state.storeOffers = data.offers || StoreService._state.storeOffers || null;
      StoreService._state.offerOrder = Array.isArray(data.offerOrder) ? data.offerOrder : StoreService._state.offerOrder || null;
    }
    if (!data.prices) {
      console.warn('⚠️ [STORE ITEM LOADER] No prices in response, items may show incorrect prices');
    }

    // Ensure prices are available before rendering (tick to allow state propagation)
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Clear loading
    loading.style.display = 'none';
    container.innerHTML = '';

    if (typeof createItemCard === 'function') {
      for (const item of orderedItems) {
        const itemCard = await createItemCard(item);
        container.appendChild(itemCard);
      }
    } else {
      console.error('❌ [STORE ITEM LOADER] createItemCard() not available');
    }

    if (state) {
      state.isLoading = false;
      if (typeof StoreService !== 'undefined' && StoreService._state) {
        StoreService._state.isLoading = false;
      }
    }
    console.log(`✅ [STORE ITEM LOADER] Loaded ${orderedItems.length} items for Items tab (standalone credits/tickets excluded)`);
  } catch (error) {
    console.error('❌ [STORE ITEM LOADER] Error loading items:', error);
    loading.style.display = 'none';
    container.innerHTML = `
      <div class="store-placeholder">
        <p>❌ Error loading store items</p>
        <p style="font-size: 0.9em; color: #888; margin-top: 10px;">
          ${error.message || 'Unknown error'}
        </p>
        <button class="menu-btn" onclick="loadStoreItems()" style="margin-top: 10px;">
          <span class="btn-icon">🔄</span> Retry
        </button>
      </div>
    `;
    if (state) {
      state.isLoading = false;
      if (typeof StoreService !== 'undefined' && StoreService._state) {
        StoreService._state.isLoading = false;
      }
    }
  }
}

// Expose globally
if (typeof window !== 'undefined') {
  window.loadStoreItems = loadStoreItems;
  window.ensureStoreCatalogLoaded = ensureStoreCatalogLoaded;
}
