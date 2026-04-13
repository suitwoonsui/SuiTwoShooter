// ==========================================
// STORE OFFER UTILITIES - Shared Offer Resolution
// ==========================================
// Shared helpers used by cart + item cards + tabs.

console.log('✅ [STORE OFFER UTILS] Store offer utilities module loaded');

function toDynamicProvisionKey(raw) {
  return String(raw || '')
    .trim()
    .replace(/[-\s]+/g, '_')
    .replace(/([A-Z])/g, '_$1')
    .replace(/^_+/, '')
    .toLowerCase();
}

function getStoreStateSafe() {
  try {
    return typeof getStoreState === 'function' ? getStoreState() : null;
  } catch (_) {
    return null;
  }
}

function getStoreOffersMap() {
  const state = getStoreStateSafe();
  return state?.storeOffers && typeof state.storeOffers === 'object' ? state.storeOffers : null;
}

function coerceOfferUsdPrice(offer) {
  if (!offer || typeof offer !== 'object') return null;
  const raw = offer.priceUsdCents ?? offer.price_usd_cents;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw / 100;
  if (typeof raw === 'string' && raw.trim() !== '') {
    const n = Number(raw);
    if (Number.isFinite(n)) return n / 100;
  }
  return null;
}

/**
 * Resolve offerId for an item+level.
 * - leveled items: prefer "<dyn>:lN" then "<raw>:lN"
 * - no-level items: prefer "<raw>" then "<dyn>"
 */
function resolveOfferIdForItemLevel(itemId, level) {
  const offers = getStoreOffersMap();
  if (!offers || typeof offers !== 'object') return null;
  const id = String(itemId || '').trim();
  const dyn = toDynamicProvisionKey(id);
  const lvl = Number(level || 1);
  const canonical = `${dyn}:l${lvl}`;
  if (offers[canonical]) return canonical;
  const rawLeveled = `${id}:l${lvl}`;
  if (offers[rawLeveled]) return rawLeveled;
  if (offers[id]) return id;
  if (offers[dyn]) return dyn;
  return null;
}

/**
 * Resolve the USD unit price for a store row.
 * Works for:
 * - offerId rows (cart lines, packs, bundles)
 * - no-level items where price only exists in `storeOffers[itemId]`
 * - leveled items if you pass itemId+level (will resolve offerId and use its priceUsdCents)
 */
function resolveUsdUnitPrice(params) {
  const p = params && typeof params === 'object' ? params : {};
  const offers = getStoreOffersMap();
  if (!offers) return null;

  if (p.offerId) {
    const oid = String(p.offerId || '').trim();
    const offer = offers[oid];
    return coerceOfferUsdPrice(offer);
  }

  if (p.itemId) {
    const id = String(p.itemId || '').trim();
    const lvl = p.level == null ? null : Number(p.level);
    const offerId = resolveOfferIdForItemLevel(id, lvl == null ? 1 : lvl);
    if (offerId && offers[offerId]) {
      const usd = coerceOfferUsdPrice(offers[offerId]);
      if (usd != null) return usd;
    }
    // Base listing might be keyed by raw id or dyn id.
    const dyn = toDynamicProvisionKey(id);
    const usd = coerceOfferUsdPrice(offers[id] || offers[dyn]);
    if (usd != null) return usd;
  }

  return null;
}

if (typeof window !== 'undefined') {
  window.StoreOfferUtils = {
    toDynamicProvisionKey,
    resolveOfferIdForItemLevel,
    resolveUsdUnitPrice,
  };
}

