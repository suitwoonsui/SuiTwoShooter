// ==========================================
// STORE DATA SOURCES — single place for store API reads
// ==========================================
// Game Pass / Tickets tabs and inventory should not each reimplement:
// - which base URL to use (shooter game backend)
// - token spot prices: GET /prices/tokens only (not bundled in /store/catalog)

(function initStoreDataSources() {
  const TOKEN_PRICES_MAX_AGE_MS = 5 * 60 * 1000;
  let _tokenPricesInFlight = null;
  let _storeCatalogCache = null; // { at, data }
  let _storeCatalogInFlight = null;

  function getShooterGameApiBase() {
    const raw =
      (typeof window !== 'undefined' && window.GameApi && typeof window.GameApi.getBaseUrl === 'function')
        ? window.GameApi.getBaseUrl()
        : ((typeof window !== 'undefined' && window.GAME_CONFIG &&
            (window.GAME_CONFIG.GAME_BACKEND_URL || window.GAME_CONFIG.API_BASE_URL)) ||
          'http://localhost:3001/api');
    return String(raw).replace(/\/$/, '');
  }

  function readTokenPricesFromState(maxAgeMs) {
    const now = Date.now();
    const tryState = (tokenPrices, ts) => {
      if (!tokenPrices) return null;
      if (ts && now - ts < maxAgeMs) return tokenPrices;
      if (!ts) return tokenPrices;
      return null;
    };
    if (typeof getStoreState === 'function') {
      const s = getStoreState();
      const p = tryState(s?.tokenPrices, s?.tokenPricesTimestamp);
      if (p) return p;
    }
    if (typeof StoreService !== 'undefined' && StoreService._state) {
      const s = StoreService._state;
      return tryState(s.tokenPrices, s.tokenPricesTimestamp);
    }
    return null;
  }

  /**
   * Shared spot MEWS/SUI/USDC (USD) — GET /api/prices/tokens (same base fields as tournaments/prices without query).
   * @returns {Promise<{ success: boolean, prices?: object }|null>}
   */
  async function fetchTokenPricesPayload() {
    try {
      const res = await fetch(`${getShooterGameApiBase()}/prices/tokens`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({ success: false }));
      if (data && data.success && data.prices) return data;
    } catch {
      /* ignore */
    }
    return null;
  }

  function writeTokenPricesToState(prices) {
    const ts = Date.now();
    if (typeof getStoreState === 'function') {
      const state = getStoreState();
      if (state) {
        state.tokenPrices = prices;
        state.tokenPricesTimestamp = ts;
      }
    }
    if (typeof StoreService !== 'undefined' && StoreService._state) {
      StoreService._state.tokenPrices = prices;
      StoreService._state.tokenPricesTimestamp = ts;
    }
  }

  /**
   * Terminal-merged store catalog: Provisions items + Stockroom offers (no spot `prices`; use ensureStoreTokenPrices).
   * @param {{ forceFetch?: boolean, maxAgeMs?: number }} options
   */
  async function fetchStoreCatalogRaw(options) {
    const now = Date.now();
    // Single catalog freshness window (see window.STORE_CATALOG_CACHE_TTL_MS from ui-initialization).
    const maxAgeMs =
      options?.maxAgeMs ??
      (typeof window !== 'undefined' && typeof window.STORE_CATALOG_CACHE_TTL_MS === 'number' && window.STORE_CATALOG_CACHE_TTL_MS > 0
        ? window.STORE_CATALOG_CACHE_TTL_MS
        : 15 * 60 * 1000);
    const forceFetch = Boolean(options?.forceFetch);

    if (!forceFetch && !_storeCatalogCache && typeof window !== 'undefined') {
      const prefetched = window.__prefetchedStoreCatalog;
      if (prefetched && prefetched.success && prefetched.at && (now - prefetched.at < maxAgeMs)) {
        _storeCatalogCache = { at: prefetched.at, data: prefetched };
      }
    }

    if (!forceFetch && _storeCatalogCache && now - _storeCatalogCache.at < maxAgeMs) {
      return _storeCatalogCache.data;
    }
    if (_storeCatalogInFlight) return _storeCatalogInFlight;

    _storeCatalogInFlight = (async () => {
      try {
        const res = await fetch(`${getShooterGameApiBase()}/store/catalog`, { cache: 'no-store' });
        const data = await res.json().catch(() => ({ success: false }));
        if (data && data.success) {
          const at = Date.now();
          _storeCatalogCache = { at, data };
          if (typeof window !== 'undefined') {
            window.__prefetchedStoreCatalog = { ...data, at };
          }
        }
        return data;
      } finally {
        _storeCatalogInFlight = null;
      }
    })();

    return _storeCatalogInFlight;
  }

  function invalidateStoreCatalogCache() {
    _storeCatalogCache = null;
    _storeCatalogInFlight = null;
  }

  /**
   * Token USD rates for MEWS/SUI/USDC — GET /prices/tokens (decoupled from store catalog TTL).
   * On failure, returns last known in-memory prices if any.
   * @param {{ maxAgeMs?: number, forceFetch?: boolean }} options
   * @returns {Promise<object|null>} prices object or null
   */
  async function ensureStoreTokenPrices(options) {
    const maxAgeMs = options?.maxAgeMs ?? TOKEN_PRICES_MAX_AGE_MS;
    const forceFetch = Boolean(options?.forceFetch);
    if (!forceFetch) {
      const cached = readTokenPricesFromState(maxAgeMs);
      if (cached) return cached;
    }
    if (_tokenPricesInFlight) return _tokenPricesInFlight;
    try {
      _tokenPricesInFlight = (async () => {
        const fromApi = await fetchTokenPricesPayload();
        if (fromApi?.prices) {
          writeTokenPricesToState(fromApi.prices);
          return fromApi.prices;
        }
        return readTokenPricesFromState(Infinity) || null;
      })();
      return await _tokenPricesInFlight;
    } catch {
      return readTokenPricesFromState(Infinity) || null;
    } finally {
      _tokenPricesInFlight = null;
    }
  }

  // Storefront source-of-truth: Terminal merged catalog via /api/store/catalog (Provisions + Stockroom).

  function parseAdditionalDataName(additionalData) {
    if (typeof additionalData !== 'string' || !additionalData.trim()) return '';
    try {
      const j = JSON.parse(additionalData);
      if (j && typeof j.name === 'string' && j.name.trim()) return j.name.trim();
    } catch {
      /* ignore */
    }
    return '';
  }

  /** Stockroom bundle editor persists display discount as `discountPct` (0–100) in additionalData. */
  function parseAdditionalDataDiscountPct(additionalData) {
    if (typeof additionalData !== 'string' || !additionalData.trim()) return null;
    try {
      const j = JSON.parse(additionalData);
      const raw = j?.discountPct ?? j?.bundleDiscountPct;
      if (typeof raw === 'number' && Number.isFinite(raw)) {
        return Math.max(0, Math.min(100, Math.round(raw)));
      }
    } catch {
      /* ignore */
    }
    return null;
  }

  function skuPriceUsd(sku) {
    const raw =
      sku && typeof sku === 'object'
        ? (sku.priceUsdCents ?? sku.price_usd_cents ?? sku.price_usd ?? sku.priceUsd ?? sku.price)
        : undefined;
    const cents = typeof raw !== 'undefined' ? Number(raw) : NaN;
    if (!Number.isFinite(cents)) return 0;
    return cents / 100;
  }

  function pickSku(storeSkus, keys) {
    if (!storeSkus || typeof storeSkus !== 'object') return null;
    for (const k of keys) {
      if (k && storeSkus[k] && typeof storeSkus[k] === 'object') return storeSkus[k];
    }
    return null;
  }

  function findStandaloneStockroomSku(storeSkus, balanceKey) {
    if (!storeSkus || typeof storeSkus !== 'object') return null;
    const wanted = String(balanceKey || '').trim().toLowerCase();
    if (!wanted) return null;

    // 1) Exact key match first (common case: `credits`, `tickets`)
    const exact = pickSku(storeSkus, [wanted]);
    if (exact) return exact;

    // 2) Standalone Stockroom item listing for the requested item key.
    // Keep this simple: item listing + matching itemKey + not a bundle + no level.
    let fallbackMatch = null;
    for (const def of Object.values(storeSkus)) {
      if (!def || typeof def !== 'object') continue;
      const listingSource = String(def.listingSource || '').trim().toLowerCase();
      const itemKey = String(def.itemKey || '').trim().toLowerCase();
      const isItemListing = listingSource === 'item_sku' || listingSource === 'item_listing';
      if (!isItemListing) continue;
      if (itemKey !== wanted) continue;
      if (Number(def.offerType) === 1) continue; // bundle, not standalone item
      const hasLevel = typeof def.level !== 'undefined' && def.level !== null && String(def.level).trim() !== '';
      if (!hasLevel) return def; // standalone/base listing
      if (!fallbackMatch) fallbackMatch = def;
    }
    return fallbackMatch;
  }

  function normalizeBalanceKey(line) {
    return String(line?.balanceKey ?? line?.balance_key ?? '').trim().toLowerCase();
  }

  function parseLineAmount(line) {
    const raw = line?.amount;
    const num = typeof raw === 'number' ? raw : Number(raw ?? 0);
    if (!Number.isFinite(num)) return 0;
    return Math.max(0, Math.trunc(num));
  }

  function getSingleLineBundleInfo(def) {
    if (!def || Number(def.offerType) !== 1) return null;
    if (def.active === false) return null;
    const lines = Array.isArray(def.bundleLines) ? def.bundleLines : [];
    if (lines.length !== 1) return null;
    const line = lines[0];
    const balanceKey = normalizeBalanceKey(line);
    const amount = parseLineAmount(line);
    if (!balanceKey || !(amount > 0)) return null;
    return { balanceKey, amount };
  }

  function isAllowedStoreBundle(def) {
    if (!def || Number(def.offerType) !== 1) return false;
    if (def.active === false) return false;
    const lines = Array.isArray(def.bundleLines) ? def.bundleLines : [];
    if (lines.length === 0) return false;

    let creditsCount = 0;
    let ticketsCount = 0;
    let otherCount = 0;

    for (const line of lines) {
      const amount = parseLineAmount(line);
      if (amount <= 0) continue;
      const balanceKey = normalizeBalanceKey(line);
      if (balanceKey === 'credits') {
        creditsCount += amount;
      } else if (balanceKey === 'tickets') {
        ticketsCount += amount;
      } else {
        otherCount += amount;
      }
    }

    // Exclude credits-only and tickets-only. Everything else is allowed:
    // - credits + tickets
    // - credits/tickets + any other item
    // - non-credit/ticket bundles
    const isCreditsOnly = creditsCount > 0 && ticketsCount === 0 && otherCount === 0;
    const isTicketsOnly = ticketsCount > 0 && creditsCount === 0 && otherCount === 0;
    return !isCreditsOnly && !isTicketsOnly && (creditsCount + ticketsCount + otherCount) > 0;
  }

  function buildOfferOrderIndex(catalog) {
    const oo = Array.isArray(catalog?.offerOrder) ? catalog.offerOrder : [];
    const idx = new Map();
    for (let i = 0; i < oo.length; i++) {
      const id = String(oo[i] ?? '').trim();
      if (!id) continue;
      if (!idx.has(id)) idx.set(id, i);
    }
    return idx;
  }

  /**
   * Credit packs for Game Pass tab: { type, name, games, price (USD), description }[]
   */
  async function getStoreCreditPacks() {
    const catalog = await fetchStoreCatalogRaw();
    if (!catalog?.success) return null;

    const offers = catalog.offers && typeof catalog.offers === 'object' ? catalog.offers : null;
    if (!offers) return null;

    const packs = [];
    const creditsSku = offers['credits'];
    const singlePrice = skuPriceUsd(creditsSku);
    if (creditsSku && singlePrice > 0) {
      const additionalData = creditsSku?.additionalData ?? creditsSku?.additional_data ?? '';
      const singleName = parseAdditionalDataName(additionalData) || String(creditsSku?.description || '').trim() || 'Single Credit';
      packs.push({
        isSingle: true,
        skuKey: 'credits',
        offerId: 'credits',
        type: null,
        name: singleName,
        games: Number(creditsSku?.amount ?? 1) || 1,
        price: singlePrice,
        description: String(creditsSku?.description || '').trim(),
      });
    }

    // Credits packs are offerType=1 rows with exactly one bundle line: { balanceKey:'credits', amount:n }.
    const creditBundleOffers = Object.entries(offers)
      .map(([offerId, def]) => ({ offerId, def }))
      .filter(({ def }) => {
        const info = getSingleLineBundleInfo(def);
        return info?.balanceKey === 'credits';
      });

    for (const row of creditBundleOffers) {
      const info = getSingleLineBundleInfo(row.def);
      if (!info) continue;
      const priceUsd = skuPriceUsd(row.def);
      const games = Number(info.amount) || 0;
      if (!(priceUsd > 0) || !(games > 0)) continue;
      const extraName = parseAdditionalDataName(row.def?.additionalData ?? row.def?.additional_data ?? '');
      const name = extraName || String(row.def?.description || '').trim() || `${games} Credits`;

      packs.push({
        isSingle: false,
        offerId: String(row.offerId),
        type: games,
        name,
        games,
        price: priceUsd,
        description: String(row.def?.description || '').trim(),
      });
    }

    // Primary ordering: on-chain Stockroom order (Terminal offerOrder).
    // Fallback: single first, then by pack size.
    const orderIdx = buildOfferOrderIndex(catalog);
    packs.sort((a, b) => {
      const ai = orderIdx.get(String(a.offerId ?? '')) ?? Number.POSITIVE_INFINITY;
      const bi = orderIdx.get(String(b.offerId ?? '')) ?? Number.POSITIVE_INFINITY;
      if (ai !== bi) return ai - bi;
      const aSingle = a.isSingle ? 0 : 1;
      const bSingle = b.isSingle ? 0 : 1;
      if (aSingle !== bSingle) return aSingle - bSingle;
      return Number(a.type || 0) - Number(b.type || 0);
    });
    return packs.length ? packs : null;
  }

  /**
   * Tournament ticket bundles: { quantity, name, price (USD), description }[]
   */
  async function getStoreTicketBundles() {
    const catalog = await fetchStoreCatalogRaw();
    if (!catalog?.success) return [];

    const offers = catalog.offers && typeof catalog.offers === 'object' ? catalog.offers : null;
    if (!offers) return [];

    const bundles = [];

    // Single ticket
    const ticketsSku = offers['tickets'];
    const singlePrice = skuPriceUsd(ticketsSku);
    const additionalData = ticketsSku?.additionalData ?? ticketsSku?.additional_data ?? '';
    const singleName = parseAdditionalDataName(additionalData) || String(ticketsSku?.description || '').trim() || 'Single Ticket';
    if (ticketsSku && singlePrice > 0) {
      bundles.push({
        isSingle: true,
        skuKey: 'tickets',
        offerId: 'tickets',
        quantity: 1,
        name: singleName,
        price: singlePrice,
        description: String(ticketsSku?.description || '').trim(),
      });
    }

    // Ticket bundles are offerType=1 rows with exactly one bundle line: { balanceKey:'tickets', amount:n }.
    const ticketBundleOffers = Object.entries(offers)
      .map(([offerId, def]) => ({ offerId, def }))
      .filter(({ def }) => {
        const info = getSingleLineBundleInfo(def);
        return info?.balanceKey === 'tickets';
      });

    for (const row of ticketBundleOffers) {
      const info = getSingleLineBundleInfo(row.def);
      if (!info) continue;
      const qty = Number(info.amount) || 0;
      const priceUsd = skuPriceUsd(row.def);
      if (!(qty > 0) || !(priceUsd > 0)) continue;

      const extraName = parseAdditionalDataName(row.def?.additionalData ?? row.def?.additional_data ?? '');
      const name = extraName || `${qty} Tickets`;
      bundles.push({
        isSingle: false,
        offerId: String(row.offerId),
        quantity: qty,
        name,
        price: priceUsd,
        description: String(row.def?.description || '').trim(),
      });
    }

    // Primary ordering: on-chain Stockroom order (Terminal offerOrder).
    // Fallback: by quantity.
    const orderIdx = buildOfferOrderIndex(catalog);
    bundles.sort((a, b) => {
      const ai = orderIdx.get(String(a.offerId ?? '')) ?? Number.POSITIVE_INFINITY;
      const bi = orderIdx.get(String(b.offerId ?? '')) ?? Number.POSITIVE_INFINITY;
      if (ai !== bi) return ai - bi;
      return Number(a.quantity) - Number(b.quantity);
    });
    return bundles;
  }

  /**
   * Stockroom bundle offer IDs (offerType=1), excluding credits-only and tickets-only bundles.
   * @returns {Promise<string[]>}
   */
  async function getStoreBundleOfferIds() {
    const catalog = await fetchStoreCatalogRaw();
    if (!catalog?.success) return [];
    const storeSkus = catalog.offers && typeof catalog.offers === 'object' ? catalog.offers : null;
    if (!storeSkus) return [];

    return Object.entries(storeSkus)
      .filter(([, def]) => isAllowedStoreBundle(def))
      .map(([offerId]) => String(offerId));
  }

  function describeBundleLines(bundleLines) {
    const parts = [];
    for (const line of Array.isArray(bundleLines) ? bundleLines : []) {
      const amount = parseLineAmount(line);
      if (amount <= 0) continue;
      const key = normalizeBalanceKey(line) || 'item';
      let label = key.replace(/_/g, ' ');
      if (key === 'credits') label = amount === 1 ? 'credit' : 'credits';
      else if (key === 'tickets') label = amount === 1 ? 'ticket' : 'tickets';
      parts.push(`${amount} ${label}`);
    }
    return parts.join(', ');
  }

  function prettyBundleLine(line) {
    const qty = parseLineAmount(line);
    if (qty <= 0) return '';
    const rawKey = normalizeBalanceKey(line);
    if (!rawKey) return '';

    const [baseKey, levelPart] = rawKey.split(':');
    const levelNum = levelPart && /^l\d+$/i.test(levelPart) ? Number(levelPart.slice(1)) : null;
    const withCount = (label) => `${label} x${qty}`;

    if (baseKey === 'credits') return withCount('Credits');
    if (baseKey === 'tickets') return withCount('Tickets');
    if (baseKey === 'extra_lives') return withCount(levelNum ? `Extra Lives +${levelNum}` : 'Extra Lives');
    if (baseKey === 'force_field') return withCount(levelNum ? `Force Field Lvl ${levelNum}` : 'Force Field');
    if (baseKey === 'orb_level') return withCount(levelNum ? `Orb Lvl ${levelNum}` : 'Orb');
    if (baseKey === 'slow_time') return withCount(levelNum ? `Slow Time Lvl ${levelNum}` : 'Slow Time');
    if (baseKey === 'coin_tractor_beam') return withCount(levelNum ? `Coin Tractor Beam Lvl ${levelNum}` : 'Coin Tractor Beam');
    if (baseKey === 'destroy_all') return withCount('Destroy All');
    if (baseKey === 'boss_kill_shot') return withCount('Boss Kill Shot');

    const generic = baseKey.replace(/_/g, ' ').trim();
    const title = generic ? generic.charAt(0).toUpperCase() + generic.slice(1) : 'Item';
    return withCount(levelNum ? `${title} Lvl ${levelNum}` : title);
  }

  function computeBundleDiscountPct(bundleDef, storeSkus) {
    const bundlePrice = skuPriceUsd(bundleDef);
    if (!(bundlePrice > 0)) return null;
    const lines = Array.isArray(bundleDef?.bundleLines) ? bundleDef.bundleLines : [];
    if (!lines.length) return null;

    let componentUsd = 0;
    for (const line of lines) {
      const qty = parseLineAmount(line);
      if (qty <= 0) continue;
      const balanceKey = normalizeBalanceKey(line);
      const baseSku = findStandaloneStockroomSku(storeSkus, balanceKey);
      const unitUsd = skuPriceUsd(baseSku);
      if (!(unitUsd > 0)) return null;
      componentUsd += unitUsd * qty;
    }
    if (!(componentUsd > 0)) return null;
    if (bundlePrice >= componentUsd) return 0;
    return Math.max(0, Math.round((1 - (bundlePrice / componentUsd)) * 100));
  }

  /**
   * Stockroom bundle rows from an already-loaded catalog (bootstrap prefetch, same payload as GET /store/catalog).
   */
  function getStoreBundlesFromCatalogSnapshot(catalog) {
    if (!catalog?.success) return [];
    const storeSkus = catalog.offers && typeof catalog.offers === 'object' ? catalog.offers : null;
    if (!storeSkus) return [];

    const bundles = Object.entries(storeSkus)
      .filter(([, def]) => isAllowedStoreBundle(def))
      .map(([offerId, def]) => {
        const priceUsd = skuPriceUsd(def);
        const extraName = parseAdditionalDataName(def?.additionalData ?? def?.additional_data ?? '');
        const lineDescription = describeBundleLines(def?.bundleLines);
        const lineItems = (Array.isArray(def?.bundleLines) ? def.bundleLines : [])
          .map(prettyBundleLine)
          .filter(Boolean);
        const fromAdditional = parseAdditionalDataDiscountPct(def?.additionalData ?? def?.additional_data ?? '');
        const computedPct = computeBundleDiscountPct(def, storeSkus);
        const discountPct = fromAdditional != null ? fromAdditional : computedPct;
        const name = extraName || String(def?.description || '').trim() || `Bundle ${offerId}`;
        const baseDescription = String(def?.description || '').trim();
        const description = baseDescription || 'Stockroom bundle';
        return {
          id: String(offerId),
          name,
          description,
          bundleLineItems: lineItems,
          bundleDiscountPct: Number.isFinite(discountPct) ? discountPct : null,
          icon: '📦',
          category: 'bundle',
          levels: [
            {
              level: 1,
              effect: lineDescription || 'Bundle contents',
              description,
              usdPrice: priceUsd,
              prices: null,
            },
          ],
        };
      })
      .filter((item) => Number(item?.levels?.[0]?.usdPrice) > 0);

    const orderIdx = buildOfferOrderIndex(catalog);
    bundles.sort((a, b) => {
      const ai = orderIdx.get(String(a?.id ?? '')) ?? Number.POSITIVE_INFINITY;
      const bi = orderIdx.get(String(b?.id ?? '')) ?? Number.POSITIVE_INFINITY;
      if (ai !== bi) return ai - bi;
      return String(a?.id ?? '').localeCompare(String(b?.id ?? ''));
    });

    console.log('[STORE DATA SOURCES] bundles retrieval', {
      method: 'store-catalog snapshot',
      filter: 'offerType=1 && not credits-only && not tickets-only && price>0',
      storeSkuCount: Object.keys(storeSkus).length,
      retrievedCount: bundles.length,
      retrievedIds: bundles.map((b) => b.id),
    });
    return bundles;
  }

  /**
   * Merge Stockroom bundle SKUs into storeItems for cart/selection (same as Bundles tab).
   * Provisions-only array should be passed; bundle rows are appended without duplicating ids.
   */
  function mergeBundlesIntoStoreItems(provisionItems, catalog) {
    const existingItems = Array.isArray(provisionItems) ? provisionItems : [];
    const bundleItems = getStoreBundlesFromCatalogSnapshot(catalog);
    if (!bundleItems.length) return existingItems;
    const byId = new Map(existingItems.map((item) => [String(item?.id || ''), item]));
    for (const bundle of bundleItems) {
      byId.set(String(bundle.id), bundle);
    }
    return Array.from(byId.values());
  }

  /**
   * Eligible stockroom bundle offers formatted as store items.
   */
  async function getStoreBundles() {
    const catalog = await fetchStoreCatalogRaw();
    return getStoreBundlesFromCatalogSnapshot(catalog);
  }

  const StoreDataSources = {
    getShooterGameApiBase,
    ensureStoreTokenPrices,
    fetchStoreCatalogRaw,
    invalidateStoreCatalogCache,
    getStoreCreditPacks,
    getStoreTicketBundles,
    getStoreBundleOfferIds,
    getStoreBundles,
    getStoreBundlesFromCatalogSnapshot,
    mergeBundlesIntoStoreItems,
    TOKEN_PRICES_MAX_AGE_MS,
  };

  if (typeof window !== 'undefined') {
    window.StoreDataSources = StoreDataSources;
  }
})();
