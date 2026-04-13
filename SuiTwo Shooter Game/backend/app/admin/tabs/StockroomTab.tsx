'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AdminStyles } from '../types';
import { getApiUrl } from '../utils/get-api-url';
import { toDynamicProvisionKey } from '@/lib/services/store/catalog/item-id';

interface StockroomTabProps {
  isAdminWalletConnected: boolean;
  connectedAddress: string | null;
  adminAddress: string | null;
  styles: AdminStyles;
}

type OfferMap = Record<string, Record<string, unknown>>;
type CatalogMap = Record<string, { id: string; name: string; description: string; levels?: Array<{ level: number }> }>;
type BundleBucketItem = { itemId: string; level: number; quantity: number };
const STANDALONE_ITEM_IDS = new Set(['credits', 'tickets']);
function packKindForOfferId(offerId: string): 'credits' | 'tickets' | null {
  const id = String(offerId || '').trim().toLowerCase();
  if (!id) return null;
  if (id.startsWith('credit_pack_')) return 'credits';
  if (id.startsWith('ticket_pack_')) return 'tickets';
  // Legacy / alternate naming: pack:<n> where we historically mapped credits to pack:0..9 and tickets to pack:10..*
  if (id.startsWith('pack:')) {
    const n = Number(id.slice('pack:'.length));
    if (Number.isFinite(n)) return n >= 10 ? 'tickets' : 'credits';
    return 'credits';
  }
  return null;
}

function resolveSingleSkuOfferId(kind: 'credits' | 'tickets', offers: OfferMap | null | undefined): string | null {
  const o = offers || {};
  if (kind === 'credits') {
    if (o.credits) return 'credits';
    if (o['pack:0']) return 'pack:0';
    if (o['credits:l1']) return 'credits:l1';
    return null;
  }
  if (o.tickets) return 'tickets';
  if (o['pack:10']) return 'pack:10';
  if (o['tickets:l1']) return 'tickets:l1';
  return null;
}

/** offer_type / offerType may arrive as string from JSON transports. */
function coerceOfferType(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.trunc(raw);
  if (typeof raw === 'bigint') return Number(raw);
  if (typeof raw === 'string' && raw.trim() !== '') {
    const n = parseInt(raw, 10);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function coerceListingSource(raw: unknown): 'offer' | 'item_listing' {
  const s = typeof raw === 'string' ? raw.trim().toLowerCase().replace(/\s+/g, '_') : '';
  if (s === 'item_sku' || s === 'item_listing') return 'item_listing';
  return 'offer';
}

function offerBundleLinesRaw(offer: Record<string, unknown>): unknown[] | undefined {
  const a = offer.bundleLines ?? offer.bundle_lines;
  return Array.isArray(a) ? a : undefined;
}

/** Stockroom offers expose price in USD cents; tolerate string/bigint from JSON-RPC shapes. */
function offerPriceUsd(offer: Record<string, unknown> | undefined): number {
  if (!offer) return 0;
  const raw = offer.priceUsdCents ?? offer.price_usd_cents;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw / 100;
  if (typeof raw === 'string' && raw.trim() !== '') {
    const n = Number(raw);
    if (Number.isFinite(n)) return n / 100;
  }
  return 0;
}

function balanceKeyToCatalogItemId(balanceKey: string, catalog: CatalogMap): string {
  const bk = balanceKey.trim();
  if (!bk) return '';
  if (catalog[bk]) return bk;
  for (const id of Object.keys(catalog)) {
    if (toDynamicProvisionKey(id) === bk) return id;
  }
  return bk;
}

function bundleEditorItemsFromOffer(offer: Record<string, unknown>, catalog: CatalogMap): BundleBucketItem[] {
  const additionalData = typeof offer.additionalData === 'string' ? offer.additionalData : '';
  try {
    const j = JSON.parse(additionalData) as { bundleItems?: Array<{ itemId?: string; level?: number; quantity?: number }> };
    if (Array.isArray(j?.bundleItems)) {
      return j.bundleItems
        .filter((x) => x && typeof x.itemId === 'string' && x.itemId.trim())
        .map((x) => ({
          itemId: String(x.itemId).trim(),
          level: Math.max(0, Math.floor(Number(x.level) || 0)),
          quantity: Math.max(1, Math.floor(Number(x.quantity) || 1)),
        }));
    }
  } catch {
    /* use bundleLines */
  }
  const lines = offerBundleLinesRaw(offer);
  if (lines) {
    return (lines as Record<string, unknown>[])
      .map((l) => {
        const balanceKey = String(l.balanceKey ?? l.balance_key ?? '').trim();
        if (!balanceKey) return null;
        const amount = Math.max(1, Math.floor(Number(l.amount) || 1));
        // Parse `foo:l2` -> { itemId: foo, level: 2 }, otherwise base -> level 0
        const m = balanceKey.match(/^(.*):l(\d+)$/);
        const level = m ? Math.max(1, Math.floor(Number(m[2]) || 1)) : 0;
        const itemId = balanceKeyToCatalogItemId(m ? m[1] : balanceKey, catalog);
        return { itemId, level, quantity: amount };
      })
      .filter((x): x is BundleBucketItem => x != null);
  }
  return [];
}

function getAvailableLevelsForItem(catalog: CatalogMap, itemId: string): number[] {
  const item = catalog[toDynamicProvisionKey(itemId)];
  const levels = Array.isArray(item?.levels)
    ? item.levels
        .map((l) => Number(l.level))
        .filter((n) => Number.isFinite(n) && n > 0)
    : [];
  const uniq = Array.from(new Set(levels));
  uniq.sort((a, b) => a - b);
  return uniq;
}

function ensureValidLevel(catalog: CatalogMap, itemId: string, level: number): number {
  const avail = getAvailableLevelsForItem(catalog, itemId);
  if (avail.length === 0) return 0; // non-leveled item => base listing
  const lv = Math.max(1, Math.floor(level || 1));
  return avail.includes(lv) ? lv : (avail[0] ?? 1);
}

function parseBundleDisplayName(offer: Record<string, unknown>, offerId: string): string {
  const additionalData = typeof offer.additionalData === 'string' ? offer.additionalData : '';
  try {
    const j = JSON.parse(additionalData) as { name?: string };
    if (typeof j?.name === 'string' && j.name.trim()) return j.name.trim();
  } catch {
    /* fall through */
  }
  const desc = typeof offer.description === 'string' ? offer.description.trim() : '';
  return desc || offerId;
}

export function StockroomTab({ isAdminWalletConnected, connectedAddress, adminAddress, styles }: StockroomTabProps) {
  const [offers, setOffers] = useState<OfferMap>({});
  const [offerOrder, setOfferOrder] = useState<string[] | null>(null);
  const [catalog, setCatalog] = useState<CatalogMap>({});
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastLoadedAt, setLastLoadedAt] = useState<string | null>(null);
  const [itemPrices, setItemPrices] = useState<Record<string, number>>({});
  const [standaloneItemPrices, setStandaloneItemPrices] = useState<Record<string, number>>({});
  const [bundleId, setBundleId] = useState('');
  const [bundleName, setBundleName] = useState('');
  const [bundleDescription, setBundleDescription] = useState('');
  const [bundlePriceUsd, setBundlePriceUsd] = useState(0);
  const [bundleDiscountPct, setBundleDiscountPct] = useState(0);
  const suppressNextBundleAutoFillRef = useRef(false);
  const [bundleItems, setBundleItems] = useState<BundleBucketItem[]>([]);
  const [bundleActive, setBundleActive] = useState(true);
  const [savingBundle, setSavingBundle] = useState(false);
  const [savingStandaloneItemId, setSavingStandaloneItemId] = useState<string | null>(null);
  const [stockroomActionKey, setStockroomActionKey] = useState<string | null>(null);
  const [hoveredDragItemId, setHoveredDragItemId] = useState<string | null>(null);
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [itemOrder, setItemOrder] = useState<string[] | null>(null);
  const [creditPackOfferOrder, setCreditPackOfferOrder] = useState<string[] | null>(null);
  const [ticketPackOfferOrder, setTicketPackOfferOrder] = useState<string[] | null>(null);
  const [bundleOfferOrder, setBundleOfferOrder] = useState<string[] | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [stockroomViewTab, setStockroomViewTab] = useState<'items' | 'credits' | 'tickets' | 'bundles'>('items');
  const [creditTabOfferOrder, setCreditTabOfferOrder] = useState<string[] | null>(null);
  const [ticketTabOfferOrder, setTicketTabOfferOrder] = useState<string[] | null>(null);

  const getCatalogItem = (itemId: string) => {
    return catalog[toDynamicProvisionKey(itemId)];
  };

  const offerEntries = useMemo(() => Object.entries(offers), [offers]);
  /** On-chain list at bottom: bundle SKUs only (type 1 / bundle lines). Item prices live in the item columns above, not here. */
      const chainBundleOnlyEntries = useMemo(() => {
    return offerEntries.filter(([, raw]) => {
      const offer = raw as Record<string, unknown>;
      const listingSource = coerceListingSource(offer.listingSource ?? offer.listing_source);
      if (listingSource === 'item_listing') return false;
      const offerType = coerceOfferType(offer.offerType ?? offer.offer_type);
      const bundleLinesArr = offerBundleLinesRaw(offer);
      return offerType === 1 || (bundleLinesArr != null && bundleLinesArr.length > 0);
    });
  }, [offerEntries]);
  const sortedChainOfferEntries = useMemo(() => {
    // Legacy fallback sorting for bundle rows when no explicit order is available.
    const e = [...chainBundleOnlyEntries];
    e.sort(([aId, a], [bId, b]) => {
      const ta = coerceOfferType(a?.offerType ?? a?.offer_type);
      const tb = coerceOfferType(b?.offerType ?? b?.offer_type);
      if (ta === 1 && tb !== 1) return -1;
      if (ta !== 1 && tb === 1) return 1;
      return aId.localeCompare(bId);
    });
    return e;
  }, [chainBundleOnlyEntries]);

  const creditPackOfferEntries = useMemo(() => {
    return chainBundleOnlyEntries.filter(([id]) => packKindForOfferId(id) === 'credits');
  }, [chainBundleOnlyEntries]);

  const ticketPackOfferEntries = useMemo(() => {
    return chainBundleOnlyEntries.filter(([id]) => packKindForOfferId(id) === 'tickets');
  }, [chainBundleOnlyEntries]);

  const bundleOfferEntries = useMemo(() => {
    return chainBundleOnlyEntries.filter(([id]) => packKindForOfferId(id) == null);
  }, [chainBundleOnlyEntries]);

  const sortedCreditPackOfferEntries = useMemo(() => {
    const base = [...creditPackOfferEntries];
    const order = Array.isArray(creditPackOfferOrder) && creditPackOfferOrder.length ? creditPackOfferOrder : null;
    const idxFromOfferOrder = Array.isArray(offerOrder) && offerOrder.length ? new Map(offerOrder.map((id, i) => [String(id), i])) : null;
    const idx = order ? new Map(order.map((id, i) => [String(id), i])) : null;
    base.sort(([aId], [bId]) => {
      if (idx) {
        const ai = idx.get(aId) ?? Number.POSITIVE_INFINITY;
        const bi = idx.get(bId) ?? Number.POSITIVE_INFINITY;
        if (ai !== bi) return ai - bi;
      } else if (idxFromOfferOrder) {
        const ai = idxFromOfferOrder.get(aId) ?? Number.POSITIVE_INFINITY;
        const bi = idxFromOfferOrder.get(bId) ?? Number.POSITIVE_INFINITY;
        if (ai !== bi) return ai - bi;
      }
      return aId.localeCompare(bId);
    });
    return base;
  }, [creditPackOfferEntries, creditPackOfferOrder, offerOrder]);

  const sortedTicketPackOfferEntries = useMemo(() => {
    const base = [...ticketPackOfferEntries];
    const order = Array.isArray(ticketPackOfferOrder) && ticketPackOfferOrder.length ? ticketPackOfferOrder : null;
    const idxFromOfferOrder = Array.isArray(offerOrder) && offerOrder.length ? new Map(offerOrder.map((id, i) => [String(id), i])) : null;
    const idx = order ? new Map(order.map((id, i) => [String(id), i])) : null;
    base.sort(([aId], [bId]) => {
      if (idx) {
        const ai = idx.get(aId) ?? Number.POSITIVE_INFINITY;
        const bi = idx.get(bId) ?? Number.POSITIVE_INFINITY;
        if (ai !== bi) return ai - bi;
      } else if (idxFromOfferOrder) {
        const ai = idxFromOfferOrder.get(aId) ?? Number.POSITIVE_INFINITY;
        const bi = idxFromOfferOrder.get(bId) ?? Number.POSITIVE_INFINITY;
        if (ai !== bi) return ai - bi;
      }
      return aId.localeCompare(bId);
    });
    return base;
  }, [ticketPackOfferEntries, ticketPackOfferOrder, offerOrder]);

  const sortedCreditTabOfferIds = useMemo(() => {
    const singleId = resolveSingleSkuOfferId('credits', offers);
    const single = singleId ? [singleId] : [];
    const packIds = sortedCreditPackOfferEntries.map(([id]) => id);
    const base = Array.from(new Set([...single, ...packIds])).filter((id) => !!offers?.[id]);

    // If the user has explicitly reordered within the tab, render exactly that order (stable),
    // then append any new/missing ids at the end.
    const explicit = Array.isArray(creditTabOfferOrder) && creditTabOfferOrder.length ? creditTabOfferOrder : null;
    if (explicit) {
      const out: string[] = [];
      const seen = new Set<string>();
      for (const raw of explicit) {
        const id = String(raw ?? '').trim();
        if (!id || !offers?.[id] || seen.has(id)) continue;
        seen.add(id);
        out.push(id);
      }
      for (const id of base) {
        if (!seen.has(id)) out.push(id);
      }
      return out;
    }

    // Otherwise, follow on-chain offerOrder where possible, then fall back to alpha.
    const idxFromOfferOrder =
      Array.isArray(offerOrder) && offerOrder.length ? new Map(offerOrder.map((id, i) => [String(id), i])) : null;
    base.sort((a, b) => {
      if (idxFromOfferOrder) {
        const ai = idxFromOfferOrder.get(a) ?? Number.POSITIVE_INFINITY;
        const bi = idxFromOfferOrder.get(b) ?? Number.POSITIVE_INFINITY;
        if (ai !== bi) return ai - bi;
      }
      return a.localeCompare(b);
    });
    return base;
  }, [offers, sortedCreditPackOfferEntries, creditTabOfferOrder, offerOrder]);

  const sortedTicketTabOfferIds = useMemo(() => {
    const singleId = resolveSingleSkuOfferId('tickets', offers);
    const single = singleId ? [singleId] : [];
    const packIds = sortedTicketPackOfferEntries.map(([id]) => id);
    const base = Array.from(new Set([...single, ...packIds])).filter((id) => !!offers?.[id]);

    const explicit = Array.isArray(ticketTabOfferOrder) && ticketTabOfferOrder.length ? ticketTabOfferOrder : null;
    if (explicit) {
      const out: string[] = [];
      const seen = new Set<string>();
      for (const raw of explicit) {
        const id = String(raw ?? '').trim();
        if (!id || !offers?.[id] || seen.has(id)) continue;
        seen.add(id);
        out.push(id);
      }
      for (const id of base) {
        if (!seen.has(id)) out.push(id);
      }
      return out;
    }

    const idxFromOfferOrder =
      Array.isArray(offerOrder) && offerOrder.length ? new Map(offerOrder.map((id, i) => [String(id), i])) : null;
    base.sort((a, b) => {
      if (idxFromOfferOrder) {
        const ai = idxFromOfferOrder.get(a) ?? Number.POSITIVE_INFINITY;
        const bi = idxFromOfferOrder.get(b) ?? Number.POSITIVE_INFINITY;
        if (ai !== bi) return ai - bi;
      }
      return a.localeCompare(b);
    });
    return base;
  }, [offers, sortedTicketPackOfferEntries, ticketTabOfferOrder, offerOrder]);

  const sortedBundleOfferEntries = useMemo(() => {
    const base = [...bundleOfferEntries];
    const order = Array.isArray(bundleOfferOrder) && bundleOfferOrder.length ? bundleOfferOrder : null;
    const idxFromOfferOrder = Array.isArray(offerOrder) && offerOrder.length ? new Map(offerOrder.map((id, i) => [String(id), i])) : null;
    const idx = order ? new Map(order.map((id, i) => [String(id), i])) : null;
    base.sort(([aId], [bId]) => {
      if (idx) {
        const ai = idx.get(aId) ?? Number.POSITIVE_INFINITY;
        const bi = idx.get(bId) ?? Number.POSITIVE_INFINITY;
        if (ai !== bi) return ai - bi;
      } else if (idxFromOfferOrder) {
        const ai = idxFromOfferOrder.get(aId) ?? Number.POSITIVE_INFINITY;
        const bi = idxFromOfferOrder.get(bId) ?? Number.POSITIVE_INFINITY;
        if (ai !== bi) return ai - bi;
      }
      return aId.localeCompare(bId);
    });
    return base;
  }, [bundleOfferEntries, bundleOfferOrder, offerOrder]);
  const catalogEntries = useMemo(() => Object.entries(catalog), [catalog]);
  const standaloneCatalogEntries = useMemo(
    () => catalogEntries.filter(([itemId]) => STANDALONE_ITEM_IDS.has(itemId)),
    [catalogEntries]
  );
  const consumableCatalogEntries = useMemo(() => {
    const base = catalogEntries.filter(([itemId]) => !STANDALONE_ITEM_IDS.has(itemId));
    const order = Array.isArray(itemOrder) && itemOrder.length ? itemOrder : null;
    if (!order) return base;
    const idx = new Map<string, number>();
    order.forEach((id, i) => {
      const k = toDynamicProvisionKey(String(id));
      if (!idx.has(k)) idx.set(k, i);
    });
    const sorted = [...base];
    sorted.sort(([aId], [bId]) => {
      const ai = idx.get(toDynamicProvisionKey(aId)) ?? Number.POSITIVE_INFINITY;
      const bi = idx.get(toDynamicProvisionKey(bId)) ?? Number.POSITIVE_INFINITY;
      if (ai !== bi) return ai - bi;
      return aId.localeCompare(bId);
    });
    return sorted;
  }, [catalogEntries, itemOrder]);

  const bucketTotalUsd = useMemo(() => {
    return bundleItems.reduce((sum, e) => {
      const avail = getAvailableLevelsForItem(catalog, e.itemId);
      const hasLv = avail.length > 0;
      const k = hasLv ? `${e.itemId}:l${e.level}` : `${e.itemId}:base`;
      const u = STANDALONE_ITEM_IDS.has(e.itemId) ? Number(standaloneItemPrices[e.itemId] ?? 0) : Number(itemPrices[k] ?? 0);
      const q = Math.max(1, Math.floor(Number(e.quantity) || 1));
      return sum + u * q;
    }, 0);
  }, [bundleItems, catalog, itemPrices, standaloneItemPrices]);

  useEffect(() => {
    if (suppressNextBundleAutoFillRef.current) {
      suppressNextBundleAutoFillRef.current = false;
      return;
    }
    // Keep bundle price in sync with current bucket sum, optionally applying a discount.
    const pct = Number.isFinite(bundleDiscountPct) ? Math.max(0, Math.min(100, Math.round(bundleDiscountPct))) : 0;
    const discounted = bucketTotalUsd * (1 - pct / 100);
    setBundlePriceUsd(Math.max(0, Math.round(discounted * 100) / 100));
  }, [bucketTotalUsd, bundleDiscountPct]);

  const loadOffers = async (): Promise<string[] | null> => {
    setLoading(true);
    setError(null);
    try {
      const [offersRes, catalogRes] = await Promise.all([
        fetch(getApiUrl('api/store/admin/stockroom/offers')),
        fetch(getApiUrl('api/store/admin/catalog')),
      ]);
      const offersData = await offersRes.json();
      const catalogData = await catalogRes.json();
      if (!offersRes.ok || !offersData.success) throw new Error(offersData.error || 'Failed to load stockroom data');
      if (!catalogRes.ok || !catalogData.success) throw new Error(catalogData.error || 'Failed to load provisions catalog');

      const loadedOffers: OfferMap = offersData.offers || {};
      const loadedOfferOrder: string[] | null = Array.isArray(offersData.offerOrder) ? offersData.offerOrder : null;
      const loadedCatalog: CatalogMap = catalogData.catalog || {};
      const nextPrices: Record<string, number> = {};
      const nextStandalonePrices: Record<string, number> = {};
      for (const [itemId, item] of Object.entries(loadedCatalog)) {
        if (STANDALONE_ITEM_IDS.has(itemId)) {
          const standaloneOffer =
            itemId === 'credits'
              ? loadedOffers['credits'] ?? loadedOffers['pack:0'] ?? loadedOffers[`${itemId}:l1`]
              : itemId === 'tickets'
                ? loadedOffers['tickets'] ?? loadedOffers['pack:10'] ?? loadedOffers[`${itemId}:l1`]
                : loadedOffers[itemId] ?? loadedOffers[`${itemId}:l1`];
          nextStandalonePrices[itemId] = offerPriceUsd(standaloneOffer);
          continue;
        }
        const levels = Array.isArray(item?.levels) && item.levels.length > 0
          ? item.levels.map((l) => Number(l.level)).filter((l) => Number.isFinite(l) && l > 0)
          : [];
        if (levels.length === 0) {
          const baseOffer = loadedOffers[itemId];
          nextPrices[`${itemId}:base`] = offerPriceUsd(baseOffer);
          continue;
        }
        for (const level of levels) {
          const key = `${itemId}:l${level}`;
          nextPrices[key] = offerPriceUsd(loadedOffers[key]);
        }
      }

      setOffers(loadedOffers);
      setOfferOrder(loadedOfferOrder);
      setCatalog(loadedCatalog);

      // Seed editable ordering state from on-chain offerOrder so the admin UI reflects the same authoritative order.
      // - Items: derive from offerOrder (strip :lN) and dedupe.
      // - Bundle offers: partition into credit packs vs ticket packs vs bundles so the UI matches store tabs.
      if (Array.isArray(loadedOfferOrder) && loadedOfferOrder.length) {
        const offerKeys = new Set(Object.keys(loadedOffers || {}));
        const bundleIdsInOrder = loadedOfferOrder.filter((id) => {
          const key = String(id ?? '').trim();
          if (!key) return false;
          if (!offerKeys.has(key)) return false;
          const o = loadedOffers[key] as Record<string, unknown> | undefined;
          if (!o) return false;
          const listingSource = coerceListingSource(o.listingSource ?? o.listing_source);
          if (listingSource === 'item_listing') return false;
          const offerType = coerceOfferType(o.offerType ?? o.offer_type);
          const lines = offerBundleLinesRaw(o);
          return offerType === 1 || (lines && lines.length > 0);
        });
        const creditPackIds: string[] = [];
        const ticketPackIds: string[] = [];
        const bundleIds: string[] = [];
        const seenC = new Set<string>();
        const seenT = new Set<string>();
        const seenB = new Set<string>();
        for (const id of bundleIdsInOrder) {
          const kind = packKindForOfferId(id);
          if (kind === 'credits') {
            if (!seenC.has(id)) {
              seenC.add(id);
              creditPackIds.push(id);
            }
            continue;
          }
          if (kind === 'tickets') {
            if (!seenT.has(id)) {
              seenT.add(id);
              ticketPackIds.push(id);
            }
            continue;
          }
          if (!seenB.has(id)) {
            seenB.add(id);
            bundleIds.push(id);
          }
        }
        setCreditPackOfferOrder(creditPackIds);
        setTicketPackOfferOrder(ticketPackIds);
        setBundleOfferOrder(bundleIds);

        // Also seed the tab-visible order lists including single credits/tickets.
        const creditTabIds: string[] = [];
        const ticketTabIds: string[] = [];
        const seenCreditTab = new Set<string>();
        const seenTicketTab = new Set<string>();
        for (const raw of loadedOfferOrder) {
          const id = String(raw ?? '').trim();
          if (!id) continue;
          if (!offerKeys.has(id)) continue;
          if (id === 'credits' || packKindForOfferId(id) === 'credits') {
            if (!seenCreditTab.has(id)) {
              seenCreditTab.add(id);
              creditTabIds.push(id);
            }
          }
          if (id === 'tickets' || packKindForOfferId(id) === 'tickets') {
            if (!seenTicketTab.has(id)) {
              seenTicketTab.add(id);
              ticketTabIds.push(id);
            }
          }
        }
        // Ensure singles are present first when available.
        const singleCreditsId = resolveSingleSkuOfferId('credits', loadedOffers);
        const singleTicketsId = resolveSingleSkuOfferId('tickets', loadedOffers);
        // Do NOT pin singles to the top. We want the UI to reflect on-chain saved ordering exactly
        // so admins can reorder singles in the same list without "snap back" behavior.
        if (singleCreditsId && !creditTabIds.includes(singleCreditsId)) creditTabIds.push(singleCreditsId);
        if (singleTicketsId && !ticketTabIds.includes(singleTicketsId)) ticketTabIds.push(singleTicketsId);
        setCreditTabOfferOrder(creditTabIds.length ? creditTabIds : null);
        setTicketTabOfferOrder(ticketTabIds.length ? ticketTabIds : null);
      } else {
        setCreditPackOfferOrder(null);
        setTicketPackOfferOrder(null);
        setBundleOfferOrder(null);
        setCreditTabOfferOrder(null);
        setTicketTabOfferOrder(null);
      }
      setItemPrices(nextPrices);
      setStandaloneItemPrices(nextStandalonePrices);
      setLastLoadedAt(new Date().toLocaleString());
    console.log('[STOCKROOM ADMIN] loadOffers loaded', {
      offerCount: Object.keys(loadedOffers || {}).length,
      offerOrderCount: loadedOfferOrder?.length ?? 0,
      offerOrderPreview: (loadedOfferOrder || []).slice(0, 25),
      offerOrderTailPreview: (loadedOfferOrder || []).slice(-10),
    });

      // Derive per-item order from on-chain offer order (best-effort).
      if (loadedOfferOrder && loadedOfferOrder.length) {
        const seen = new Set<string>();
        const derived: string[] = [];
        for (const raw of loadedOfferOrder) {
          const s = String(raw || '').trim();
          if (!s) continue;
          const base = s.replace(/:l\d+$/, '');
          const key = toDynamicProvisionKey(base);
          if (!key || STANDALONE_ITEM_IDS.has(key)) continue;
          if (!seen.has(key)) {
            seen.add(key);
            derived.push(key);
          }
        }
        setItemOrder(derived.length ? derived : null);
      } else {
        setItemOrder(null);
      }
      return loadedOfferOrder;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Network error');
      setOffers({});
      setCatalog({});
      return null;
    } finally {
      setLoading(false);
    }
  };

  const moveItemInOrder = (itemId: string, dir: -1 | 1) => {
    const key = toDynamicProvisionKey(itemId);
    if (!key) return;
    setItemOrder((prev) => {
      const current =
        Array.isArray(prev) && prev.length
          ? [...prev]
          : consumableCatalogEntries.map(([id]) => toDynamicProvisionKey(id)).filter(Boolean);
      const idx = current.indexOf(key);
      if (idx < 0) return current;
      const nextIdx = idx + dir;
      if (nextIdx < 0 || nextIdx >= current.length) return current;
      const tmp = current[idx];
      current[idx] = current[nextIdx];
      current[nextIdx] = tmp;
      return current;
    });
  };

  const moveBundleOfferInOrder = (offerId: string, dir: -1 | 1) => {
    const id = String(offerId || '').trim();
    if (!id) return;
    const kind = packKindForOfferId(id);
    const sourceEntries =
      kind === 'credits'
        ? sortedCreditPackOfferEntries
        : kind === 'tickets'
          ? sortedTicketPackOfferEntries
          : sortedBundleOfferEntries;
    const fallback = sourceEntries.map(([k]) => k);
    const setter =
      kind === 'credits'
        ? setCreditPackOfferOrder
        : kind === 'tickets'
          ? setTicketPackOfferOrder
          : setBundleOfferOrder;
    setter((prev) => {
      const current = Array.isArray(prev) && prev.length ? [...prev] : [...fallback];
      const idx = current.indexOf(id);
      if (idx < 0) return current;
      const nextIdx = idx + dir;
      if (nextIdx < 0 || nextIdx >= current.length) return current;
      const tmp = current[idx];
      current[idx] = current[nextIdx];
      current[nextIdx] = tmp;
      return current;
    });
  };

  const moveCreditTabOfferInOrder = (offerId: string, dir: -1 | 1) => {
    const id = String(offerId || '').trim();
    if (!id) return;
    const fallback = [...sortedCreditTabOfferIds];
    setCreditTabOfferOrder((prev) => {
      const current = Array.isArray(prev) && prev.length ? [...prev] : [...fallback];
      const before = [...current];
      const idx = current.indexOf(id);
      if (idx < 0) return current;
      const nextIdx = idx + dir;
      if (nextIdx < 0 || nextIdx >= current.length) return current;
      const tmp = current[idx];
      current[idx] = current[nextIdx];
      current[nextIdx] = tmp;
      console.log('[STOCKROOM ADMIN] credits move', { offerId: id, dir, before, after: [...current] });
      return current;
    });
  };

  const moveTicketTabOfferInOrder = (offerId: string, dir: -1 | 1) => {
    const id = String(offerId || '').trim();
    if (!id) return;
    const fallback = [...sortedTicketTabOfferIds];
    setTicketTabOfferOrder((prev) => {
      const current = Array.isArray(prev) && prev.length ? [...prev] : [...fallback];
      const before = [...current];
      const idx = current.indexOf(id);
      if (idx < 0) return current;
      const nextIdx = idx + dir;
      if (nextIdx < 0 || nextIdx >= current.length) return current;
      const tmp = current[idx];
      current[idx] = current[nextIdx];
      current[nextIdx] = tmp;
      console.log('[STOCKROOM ADMIN] tickets move', { offerId: id, dir, before, after: [...current] });
      return current;
    });
  };

  const saveCatalogOrder = async () => {
    if (savingOrder) return;
    // Persist whatever ordering the UI is currently using.
    // If we don't have an explicit editable `itemOrder` yet (e.g. offerOrder missing/empty on-chain),
    // fall back to the current rendered list order so admins can "seed" ordering explicitly.
    const order =
      Array.isArray(itemOrder) && itemOrder.length
        ? itemOrder
        : consumableCatalogEntries.map(([id]) => toDynamicProvisionKey(id)).filter(Boolean);
    if (!order.length) {
      setError('No items available to order.');
      return;
    }
    setSavingOrder(true);
    setError(null);
    try {
      // Persist as representative offerIds:
      // - leveled items: "<itemId>:l1" if present
      // - non-leveled items: "<itemId>"
      const offerKeys = new Set(Object.keys(offers || {}));
      const offerIdsToSave: string[] = [];
      for (const raw of order) {
        const dyn = toDynamicProvisionKey(String(raw));
        if (!dyn || STANDALONE_ITEM_IDS.has(dyn)) continue;
        offerIdsToSave.push(offerKeys.has(`${dyn}:l1`) ? `${dyn}:l1` : dyn);
      }

      // Append bundle offer IDs after items, but keep packs separated from bundles
      // to match how the game store UI renders them in separate tabs.
      const creditIds =
        Array.isArray(creditTabOfferOrder) && creditTabOfferOrder.length
          ? creditTabOfferOrder
          : (resolveSingleSkuOfferId('credits', offers) ? [resolveSingleSkuOfferId('credits', offers) as string] : []).concat(
              sortedCreditPackOfferEntries.map(([id]) => id)
            );
      const ticketIds =
        Array.isArray(ticketTabOfferOrder) && ticketTabOfferOrder.length
          ? ticketTabOfferOrder
          : (resolveSingleSkuOfferId('tickets', offers) ? [resolveSingleSkuOfferId('tickets', offers) as string] : []).concat(
              sortedTicketPackOfferEntries.map(([id]) => id)
            );
      const bundleIds =
        Array.isArray(bundleOfferOrder) && bundleOfferOrder.length
          ? bundleOfferOrder
          : sortedBundleOfferEntries.map(([id]) => id);

      console.log('[STOCKROOM ADMIN] saveCatalogOrder computed', {
        itemCount: offerIdsToSave.length,
        creditIds,
        ticketIds,
        bundleIdsCount: bundleIds.length,
        offerOrderCount: offerIdsToSave.length + creditIds.length + ticketIds.length + bundleIds.length,
      });

      // Ensure pack/bundle ordering is authoritative even if these ids already appear in the base list.
      // (We remove them first, then append in tab order.)
      const tailIds = [...creditIds, ...ticketIds, ...bundleIds].map((s) => String(s ?? '').trim()).filter(Boolean);
      const tailSet = new Set(tailIds);
      const baseOnly = offerIdsToSave.filter((id) => !tailSet.has(id));
      offerIdsToSave.length = 0;
      offerIdsToSave.push(...baseOnly);
      for (const id of tailIds) {
        if (!offerIdsToSave.includes(id)) offerIdsToSave.push(id);
      }

      console.log('[STOCKROOM ADMIN] saveCatalogOrder POST offerOrder', {
        offerOrderCount: offerIdsToSave.length,
        offerOrderPreview: offerIdsToSave.slice(0, 25),
        offerOrderTailPreview: offerIdsToSave.slice(-10),
      });

      const res = await fetch(getApiUrl('api/store/admin/stockroom/order'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(adminAddress ? { adminWalletAddress: adminAddress } : {}),
          offerOrder: offerIdsToSave,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save order');
      // The on-chain write may take a moment to be reflected by the read path.
      // Poll a few times so the admin doesn't see the old order "snap back".
      const wantAll = offerIdsToSave.map((s) => String(s));
      const matchesExactly = (arr: unknown) => {
        if (!Array.isArray(arr)) return false;
        if (arr.length !== wantAll.length) return false;
        for (let i = 0; i < wantAll.length; i++) {
          if (String(arr[i] ?? '') !== wantAll[i]) return false;
        }
        return true;
      };
      let ok = false;
      for (let attempt = 0; attempt < 6; attempt++) {
        const current = await loadOffers();
        console.log('[STOCKROOM ADMIN] saveCatalogOrder poll read-back', {
          attempt,
          wantCount: wantAll.length,
          gotCount: Array.isArray(current) ? current.length : null,
          gotPreview: Array.isArray(current) ? current.slice(0, 25) : null,
          gotTailPreview: Array.isArray(current) ? current.slice(-10) : null,
        });
        if (matchesExactly(current)) {
          ok = true;
          break;
        }
        // Backoff: 250ms, 500ms, 1s, 2s...
        const ms = Math.min(4000, 250 * 2 ** attempt);
        await new Promise((r) => setTimeout(r, ms));
      }
      if (!ok) {
        // Still proceed; order likely persisted but not reflected yet.
        setError((prev) => prev || 'Order saved, but read-back is still catching up. Refresh in a few seconds.');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save order');
    } finally {
      setSavingOrder(false);
    }
  };

  const saveItemLevels = async (itemId: string) => {
    if (!isAdminWalletConnected) return;
    setSavingItemId(itemId);
    setError(null);
    try {
      const item = getCatalogItem(itemId);
      const existingLevels = new Set(
        (item?.levels || [])
          .map((l) => Number(l.level))
          .filter((l) => Number.isFinite(l) && l > 0)
      );

      const writes: Promise<Response>[] = [];
      // Non-leveled item: write base listing (level 0).
      if (existingLevels.size === 0) {
        const priceUsdCents = Math.max(0, Math.round(Number(itemPrices[`${itemId}:base`] ?? 0) * 100));
        writes.push(
          fetch(getApiUrl('api/store/admin/stockroom/item-offer'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              adminWalletAddress: connectedAddress || adminAddress,
              itemId,
              level: 0,
              priceUsdCents,
              amount: 1,
              name: item?.name || itemId,
              description: item?.description || itemId,
            }),
          })
        );
      }
      for (const level of [1, 2, 3]) {
        if (!existingLevels.has(level)) continue;
        const key = `${itemId}:l${level}`;
        const priceUsdCents = Math.max(0, Math.round(Number(itemPrices[key] ?? 0) * 100));
        writes.push(
          fetch(getApiUrl('api/store/admin/stockroom/item-offer'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              adminWalletAddress: connectedAddress || adminAddress,
              itemId,
              level,
              priceUsdCents,
              amount: 1,
              name: item?.name || itemId,
              description: `${item?.description || itemId} (L${level})`,
            }),
          })
        );
      }

      const responses = await Promise.all(writes);
      for (const response of responses) {
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || `Failed to save prices for ${itemId}`);
        }
      }

      await loadOffers();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save item prices');
    } finally {
      setSavingItemId(null);
    }
  };

  const saveStandaloneItem = async (itemId: string) => {
    if (!isAdminWalletConnected) return;
    setSavingStandaloneItemId(itemId);
    setError(null);
    try {
      const item = getCatalogItem(itemId);
      const payload: Record<string, unknown> = {
        adminWalletAddress: connectedAddress || adminAddress,
        itemId,
        priceUsdCents: Math.max(0, Math.round(Number(standaloneItemPrices[itemId] ?? 0) * 100)),
        amount: 1,
        name: item?.name || itemId,
        description: item?.description || itemId,
      };
      if (itemId !== 'credits') {
        payload.level = 1;
      }
      const response = await fetch(getApiUrl('api/store/admin/stockroom/item-offer'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || `Failed to save price for ${itemId}`);
      }
      await loadOffers();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save standalone item offer');
    } finally {
      setSavingStandaloneItemId(null);
    }
  };

  const onDropItemIntoBundle = (itemId: string) => {
    setBundleItems((prev) => {
      const level = ensureValidLevel(catalog, itemId, 1);
      const idx = prev.findIndex((i) => i.itemId === itemId && i.level === level);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + 1 };
        return copy;
      }
      return [...prev, { itemId, level, quantity: 1 }];
    });
  };

  const updateBundleQuantity = (itemId: string, level: number, quantity: number) => {
    setBundleItems((prev) =>
      prev
        .map((i) => (i.itemId === itemId && i.level === level ? { ...i, quantity: Math.max(1, Math.floor(quantity || 1)) } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const updateBundleLevel = (itemId: string, fromLevel: number, toLevel: number) => {
    setBundleItems((prev) => {
      const nextLevel = ensureValidLevel(catalog, itemId, toLevel);
      const fromIdx = prev.findIndex((i) => i.itemId === itemId && i.level === fromLevel);
      if (fromIdx < 0) return prev;
      const toIdx = prev.findIndex((i) => i.itemId === itemId && i.level === nextLevel);
      const copy = [...prev];
      const qty = copy[fromIdx]?.quantity ?? 1;
      if (toIdx >= 0) {
        copy[toIdx] = { ...copy[toIdx], quantity: (copy[toIdx]?.quantity ?? 0) + qty };
        copy.splice(fromIdx, 1);
        return copy;
      }
      copy[fromIdx] = { ...copy[fromIdx], level: nextLevel };
      return copy;
    });
  };

  const removeBundleItem = (itemId: string, level: number) => {
    setBundleItems((prev) => prev.filter((i) => !(i.itemId === itemId && i.level === level)));
  };

  const clearBundleForm = () => {
    setBundleId('');
    setBundleName('');
    setBundleDescription('');
    setBundlePriceUsd(0);
    setBundleDiscountPct(0);
    setBundleItems([]);
    setBundleActive(true);
  };

  const computeBucketTotalUsd = (items: BundleBucketItem[]): number => {
    return items.reduce((sum, e) => {
      const avail = getAvailableLevelsForItem(catalog, e.itemId);
      const hasLv = avail.length > 0;
      const k = hasLv ? `${e.itemId}:l${e.level}` : `${e.itemId}:base`;
      const u = STANDALONE_ITEM_IDS.has(e.itemId)
        ? Number(standaloneItemPrices[e.itemId] ?? 0)
        : Number(itemPrices[k] ?? 0);
      const q = Math.max(1, Math.floor(Number(e.quantity) || 1));
      return sum + u * q;
    }, 0);
  };

  const loadBundleIntoEditor = (offerId: string, offer: Record<string, unknown>) => {
    const priceUsdCents =
      typeof offer.priceUsdCents === 'number'
        ? Number(offer.priceUsdCents)
        : typeof offer.price_usd_cents === 'number'
          ? Number(offer.price_usd_cents)
          : Math.max(0, Math.round(offerPriceUsd(offer) * 100));
    setBundleId(offerId);
    setBundleName(parseBundleDisplayName(offer, offerId));
    const desc = typeof offer.description === 'string' ? offer.description : '';
    setBundleDescription(desc);
    suppressNextBundleAutoFillRef.current = true;
    const items = bundleEditorItemsFromOffer(offer, catalog);
    setBundleItems(items);
    const offerPriceUsdValue = Math.max(0, priceUsdCents / 100);
    setBundlePriceUsd(offerPriceUsdValue);
    const a = offer.active;
    setBundleActive(a !== false && a !== 0 && a !== 'false');

    // Prefer discount saved on-chain in additionalData; else derive from current bucket vs offer price.
    let pctFromMeta: number | null = null;
    const adRaw = typeof offer.additionalData === 'string' ? offer.additionalData : '';
    if (adRaw.trim()) {
      try {
        const j = JSON.parse(adRaw) as { discountPct?: unknown; bundleDiscountPct?: unknown };
        const raw = j.discountPct ?? j.bundleDiscountPct;
        if (typeof raw === 'number' && Number.isFinite(raw)) {
          pctFromMeta = Math.max(0, Math.min(100, Math.round(raw)));
        }
      } catch {
        /* ignore */
      }
    }
    if (pctFromMeta != null) {
      setBundleDiscountPct(pctFromMeta);
    } else {
      const totalUsd = computeBucketTotalUsd(items);
      const pct =
        totalUsd > 0
          ? Math.max(0, Math.min(100, Math.round((1 - offerPriceUsdValue / totalUsd) * 100)))
          : 0;
      setBundleDiscountPct(pct);
    }
  };

  const postStockroomAdmin = async (path: string, payload: Record<string, unknown>) => {
    const response = await fetch(getApiUrl(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminWalletAddress: connectedAddress || adminAddress,
        ...payload,
      }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Stockroom admin request failed');
    }
    return data as { message?: string; digest?: string };
  };

  const setRowActiveFlag = async (offerId: string, offer: Record<string, unknown>, active: boolean) => {
    if (!isAdminWalletConnected) return;
    const listingSource = coerceListingSource(offer.listingSource ?? offer.listing_source);
    const key = `active:${offerId}`;
    setStockroomActionKey(key);
    setError(null);
    try {
      if (listingSource === 'item_listing') {
        const itemKey = typeof offer.itemKey === 'string' ? offer.itemKey : '';
        const level = typeof offer.level === 'number' ? offer.level : 1;
        if (!itemKey) throw new Error('Missing itemKey on item SKU row');
        await postStockroomAdmin('api/store/admin/stockroom/item-listing-active', { itemKey, level, active });
      } else {
        await postStockroomAdmin('api/store/admin/stockroom/offer-active', { offerId, active });
      }
      await loadOffers();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update listing');
    } finally {
      setStockroomActionKey(null);
    }
  };

  const removeStockroomRow = async (offerId: string, offer: Record<string, unknown>) => {
    if (!isAdminWalletConnected) return;
    const listingSource = coerceListingSource(offer.listingSource ?? offer.listing_source);
    const key = `remove:${offerId}`;
    setStockroomActionKey(key);
    setError(null);
    try {
      if (listingSource === 'item_listing') {
        const itemKey = typeof offer.itemKey === 'string' ? offer.itemKey : '';
        if (!itemKey) throw new Error('Missing itemKey on item SKU row');
        const level = typeof offer.level === 'number' ? offer.level : undefined;
        await postStockroomAdmin('api/store/admin/stockroom/remove-item-listing', { itemKey, ...(level !== undefined ? { level } : {}) });
      } else {
        await postStockroomAdmin('api/store/admin/stockroom/remove-offer', { offerId });
      }
      await loadOffers();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to remove listing');
    } finally {
      setStockroomActionKey(null);
    }
  };

  const saveBundleOffer = async () => {
    if (!isAdminWalletConnected) return;
    if (!bundleId.trim()) {
      setError('Bundle ID is required.');
      return;
    }
    if (!bundleName.trim()) {
      setError('Bundle name is required.');
      return;
    }
    if (bundleItems.length === 0) {
      setError('Drop at least one item into the bundle bucket.');
      return;
    }
    setSavingBundle(true);
    setError(null);
    try {
      const response = await fetch(getApiUrl('api/store/admin/stockroom/bundle-offer'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminWalletAddress: connectedAddress || adminAddress,
          bundleId: bundleId.trim(),
          bundleName: bundleName.trim(),
          bundleDescription: bundleDescription.trim(),
          priceUsdCents: Math.max(0, Math.round(bundlePriceUsd * 100)),
          items: bundleItems,
          active: bundleActive,
          bundleDiscountPct: Math.max(0, Math.min(100, Math.round(Number(bundleDiscountPct) || 0))),
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to save bundle offer');
      }
      alert(`✅ ${data.message}`);
      await loadOffers();
      clearBundleForm();
    } catch (e: unknown) {
      const anyErr = e as any;
      const msg = typeof anyErr?.message === 'string' ? String(anyErr.message) : 'Failed to save bundle offer';
      setError(msg);
    } finally {
      setSavingBundle(false);
    }
  };

  const initializeDefaultOffers = async () => {
    if (!isAdminWalletConnected) return;
    if (!confirm('Initialize item prices in Stockroom for leveled Provisions items (excludes credits/tickets)?')) return;

    setInitializing(true);
    setError(null);
    try {
      const response = await fetch(getApiUrl('api/store/admin/stockroom/initialize'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminWalletAddress: connectedAddress || adminAddress,
          includePricing: true,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to initialize stockroom item listings');
      }
      alert(`✅ ${data.message}`);
      await loadOffers();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to initialize stockroom item listings');
    } finally {
      setInitializing(false);
    }
  };

  useEffect(() => {
    if (isAdminWalletConnected) {
      loadOffers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminWalletConnected]);

  return (
    <div>
      <h2 style={{ marginBottom: '1rem' }}>📦 Stockroom</h2>
      <p style={{ color: styles.textSecondary, marginBottom: '1rem' }}>
        Manage the pricing authority transition by validating Stockroom pricing. Product definitions stay in Provisions; per-item prices and bundle offers belong here.
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
        <button
          type="button"
          onClick={loadOffers}
          disabled={!isAdminWalletConnected || loading || initializing}
          style={{
            ...styles.button,
            opacity: !isAdminWalletConnected || loading || initializing ? 0.6 : 1,
            cursor: !isAdminWalletConnected || loading || initializing ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Loading...' : 'Refresh Offers'}
        </button>
        <button
          type="button"
          onClick={initializeDefaultOffers}
          disabled={!isAdminWalletConnected || loading || initializing}
          style={{
            ...styles.button,
            backgroundColor: styles.buttonSuccess,
            color: 'white',
            opacity: !isAdminWalletConnected || loading || initializing ? 0.6 : 1,
            cursor: !isAdminWalletConnected || loading || initializing ? 'not-allowed' : 'pointer',
          }}
        >
          {initializing ? 'Initializing...' : 'Initialize item prices'}
        </button>
        {lastLoadedAt && (
          <span style={{ color: styles.textSecondary, fontSize: '0.9rem' }}>
            Last loaded: {lastLoadedAt}
          </span>
        )}
      </div>

      {error && (
        <div style={{ padding: '0.75rem', marginBottom: '1rem', background: styles.bgError, border: `1px solid ${styles.borderError}`, borderRadius: 6 }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {!isAdminWalletConnected && (
        <div style={{ padding: '0.75rem', marginBottom: '1rem', background: styles.bgWarning, border: `1px solid ${styles.border}`, borderRadius: 6 }}>
          Connect admin wallet to use Stockroom admin tools.
        </div>
      )}

      <div style={{ padding: '1rem', border: `1px solid ${styles.border}`, borderRadius: 8, background: styles.bgSecondary }}>
        <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Stockroom prices & bundle offers</h3>
        <p style={{ marginTop: 0, color: styles.textSecondary }}>
          Set <strong>item prices</strong> here (what the in-game store charges). <strong>Bundle offers</strong> are separate SKUs with their own price and composition. Provisions only defines what exists; Stockroom sets sell price. All amounts are <strong>USD dollars</strong> (e.g. 9.99).
        </p>
        <div
          style={{
            display: 'grid',
            // Always keep bundle editor/bucket on the right; left panel changes with tab.
            gridTemplateColumns: '1.1fr 0.9fr',
            gap: '1rem',
            marginBottom: '1.25rem',
          }}
        >
          <div
            style={{
              border: `1px solid ${styles.border}`,
              borderRadius: 8,
              padding: '0.75rem',
              background: styles.bgPrimary,
              minHeight: 220,
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
                {([
                  { key: 'items', label: 'Items' },
                  { key: 'credits', label: 'Credits' },
                  { key: 'tickets', label: 'Tickets' },
                  { key: 'bundles', label: 'Bundles' },
                ] as const).map((t) => (
                  <button
                    key={`stockroom-view-${t.key}`}
                    type="button"
                    onClick={() => setStockroomViewTab(t.key)}
                    style={{
                      ...styles.button,
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      backgroundColor: stockroomViewTab === t.key ? styles.buttonPrimary : styles.bgSecondary,
                      color: stockroomViewTab === t.key ? 'white' : styles.text,
                      border: `1px solid ${styles.border}`,
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={saveCatalogOrder}
                disabled={!isAdminWalletConnected || savingOrder || loading}
                style={{
                  ...styles.button,
                  backgroundColor: styles.buttonSuccess,
                  color: 'white',
                  opacity: !isAdminWalletConnected || savingOrder || loading ? 0.6 : 1,
                  cursor: !isAdminWalletConnected || savingOrder || loading ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                }}
                title="Persist the current ordering to Stockroom on-chain catalog_order"
              >
                {savingOrder ? 'Saving order...' : 'Save order'}
              </button>
            </div>

            {stockroomViewTab === 'credits' || stockroomViewTab === 'tickets' ? (
              <>
                <div style={{ fontWeight: 700, marginTop: '0.8rem', marginBottom: '0.15rem' }}>
                  {stockroomViewTab === 'credits' ? 'Credits (single)' : 'Tickets (single)'}
                </div>
                <div style={{ fontSize: '0.8rem', color: styles.textSecondary, marginBottom: '0.5rem' }}>
                  Standalone item priced directly in USD (e.g. 9.99).
                </div>
              </>
            ) : stockroomViewTab === 'items' ? (
              <>
                <div style={{ fontWeight: 700, marginTop: '0.8rem', marginBottom: '0.15rem' }}>Game items (per-level price)</div>
                <div style={{ fontSize: '0.8rem', color: styles.textSecondary, marginBottom: '0.5rem' }}>
                  Prices here are what players pay per item level in the store. Drag into the bundle bucket to build a <strong>bundle offer</strong>.
                </div>
              </>
            ) : (
              <>
                <div style={{ fontWeight: 700, marginTop: '0.8rem', marginBottom: '0.15rem' }}>Bundles</div>
                <div style={{ fontSize: '0.8rem', color: styles.textSecondary, marginBottom: '0.5rem' }}>
                  Use the bundle editor on the right to create/edit bundles. Existing offers are listed in the section below.
                </div>
              </>
            )}
            {stockroomViewTab === 'credits' || stockroomViewTab === 'tickets' ? (
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {standaloneCatalogEntries
                  .filter(([itemId]) => itemId === (stockroomViewTab === 'credits' ? 'credits' : 'tickets'))
                  .map(([itemId, item]) => {
                const isBundleEligibleStandalone = true;
                return (
                  <div
                    key={`standalone-item-${itemId}`}
                    style={{
                      border: `1px solid ${styles.border}`,
                      borderRadius: 6,
                      padding: '0.55rem',
                      background: styles.bgSecondary,
                      display: 'grid',
                      gridTemplateColumns: 'minmax(12rem, 1fr) max-content minmax(4.75rem, max-content)',
                      gap: '0.6rem',
                      alignItems: 'center',
                    }}
                  >
                    <div
                      draggable={isBundleEligibleStandalone}
                      title={
                        'Drag this item into the bundle bucket to add it. The card is the drag handle.'
                      }
                      onDragStart={(e) => {
                        if (!isBundleEligibleStandalone) return;
                        e.dataTransfer.setData('text/plain', itemId);
                        e.dataTransfer.effectAllowed = 'copy';
                        setDraggingItemId(itemId);
                        setHoveredDragItemId(null);
                      }}
                      onDragEnd={() => setDraggingItemId(null)}
                      onMouseEnter={() => setHoveredDragItemId(itemId)}
                      onMouseLeave={() => setHoveredDragItemId((id) => (id === itemId ? null : id))}
                      style={{
                        border: `1px solid ${
                          hoveredDragItemId === itemId && draggingItemId !== itemId && isBundleEligibleStandalone
                            ? styles.buttonPrimary
                            : styles.border
                        }`,
                        borderRadius: 6,
                        padding: '0.45rem',
                        background: styles.bgPrimary,
                        cursor: isBundleEligibleStandalone ? (draggingItemId === itemId ? 'grabbing' : 'grab') : 'default',
                        userSelect: 'none',
                        boxShadow:
                          hoveredDragItemId === itemId && draggingItemId !== itemId && isBundleEligibleStandalone
                            ? '0 2px 10px rgba(0, 0, 0, 0.12)'
                            : undefined,
                        transform:
                          hoveredDragItemId === itemId && draggingItemId !== itemId && isBundleEligibleStandalone
                            ? 'translateY(-1px)'
                            : undefined,
                        transition: 'box-shadow 0.15s ease, border-color 0.15s ease, transform 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.35rem' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600 }}>{item.name || itemId}</div>
                        </div>
                        <span
                          aria-hidden
                          style={{
                            flexShrink: 0,
                            fontSize: '0.7rem',
                            color: styles.textSecondary,
                            opacity: isBundleEligibleStandalone && hoveredDragItemId === itemId ? 1 : 0.45,
                            lineHeight: 1.2,
                            paddingTop: '0.1rem',
                            fontWeight: 600,
                            letterSpacing: '0.02em',
                          }}
                        >
                          ⋮⋮
                        </span>
                      </div>
                    </div>
                    <div style={{ minWidth: 'calc(3 * 4.5rem + 2 * 0.35rem)' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: styles.textSecondary, marginBottom: '0.15rem' }}>Price</label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={standaloneItemPrices[itemId] ?? 0}
                        onChange={(e) =>
                          setStandaloneItemPrices((prev) => ({
                            ...prev,
                            [itemId]: Math.max(0, Math.round(Number(e.target.value || 0) * 100) / 100),
                          }))
                        }
                        style={{
                          width: 'clamp(2.8rem, 4ch, 4.5rem)',
                          padding: '0.35rem',
                          border: `1px solid ${styles.border}`,
                          borderRadius: 4,
                          backgroundColor: styles.inputBg,
                          color: styles.text,
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => saveStandaloneItem(itemId)}
                      disabled={!isAdminWalletConnected || savingStandaloneItemId === itemId || loading}
                      style={{
                        ...styles.button,
                        backgroundColor: styles.buttonPrimary,
                        color: 'white',
                        opacity: !isAdminWalletConnected || savingStandaloneItemId === itemId || loading ? 0.6 : 1,
                        cursor: !isAdminWalletConnected || savingStandaloneItemId === itemId || loading ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap',
                        minWidth: '4.75rem',
                        justifySelf: 'end',
                      }}
                    >
                      {savingStandaloneItemId === itemId ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                );
                })}
              </div>
            ) : null}

            {stockroomViewTab === 'credits' ? (
              <div style={{ display: 'grid', gap: '0.4rem', marginTop: '0.75rem' }}>
                <div style={{ fontWeight: 700 }}>Credits ordering (single + packs)</div>
                <div style={{ fontSize: '0.8rem', color: styles.textSecondary }}>
                  This is the order players see in the Credits tab. It’s persisted on-chain in Stockroom `catalog_order`.
                </div>
                {sortedCreditPackOfferEntries.length === 0 ? (
                  <div style={{ color: styles.textSecondary, fontSize: '0.85rem' }}>None loaded.</div>
                ) : (
                  sortedCreditTabOfferIds.map((offerId, idx) => {
                    const offer = (offers?.[offerId] || {}) as Record<string, unknown>;
                    const busy = stockroomActionKey?.startsWith(`active:${offerId}`) || stockroomActionKey === `remove:${offerId}`;
                    const isActive = offer.active !== false && offer.active !== 0 && offer.active !== 'false';
                    const displayName = parseBundleDisplayName(offer, offerId);
                    const priceUsdCents =
                      typeof offer?.priceUsdCents === 'number'
                        ? Number(offer.priceUsdCents)
                        : typeof offer?.price_usd_cents === 'number'
                          ? Number(offer.price_usd_cents)
                          : Math.round(offerPriceUsd(offer) * 100);
                    const offerPriceUsdValue = Math.max(0, priceUsdCents / 100);
                    return (
                      <div
                        key={`credit-pack-${offerId}`}
                        style={{
                          border: `1px solid ${styles.border}`,
                          borderRadius: 6,
                          padding: '0.5rem',
                          background: styles.bgSecondary,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700 }} title={offerId}>
                            {displayName}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: styles.textSecondary }}>${offerPriceUsdValue.toFixed(2)}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                          <div style={{ display: 'grid', gap: '0.15rem' }}>
                            <button
                              type="button"
                              disabled={!isAdminWalletConnected || busy || loading || idx === 0}
                              onClick={() => moveCreditTabOfferInOrder(offerId, -1)}
                              title="Move up"
                              style={{
                                ...styles.button,
                                padding: '0.1rem 0.35rem',
                                minHeight: '1.25rem',
                                lineHeight: 1,
                                fontSize: '0.7rem',
                                opacity: !isAdminWalletConnected || busy || loading || idx === 0 ? 0.5 : 1,
                              }}
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              disabled={!isAdminWalletConnected || busy || loading || idx === sortedCreditTabOfferIds.length - 1}
                              onClick={() => moveCreditTabOfferInOrder(offerId, 1)}
                              title="Move down"
                              style={{
                                ...styles.button,
                                padding: '0.1rem 0.35rem',
                                minHeight: '1.25rem',
                                lineHeight: 1,
                                fontSize: '0.7rem',
                                opacity: !isAdminWalletConnected || busy || loading ? 0.5 : 1,
                              }}
                            >
                              ▼
                            </button>
                          </div>
                          <button
                            type="button"
                            disabled={!isAdminWalletConnected || busy || loading || offerId === 'credits'}
                            onClick={() => setRowActiveFlag(offerId, offer, !isActive)}
                            title={offerId === 'credits' ? 'The base "credits" SKU is managed separately' : isActive ? 'Deactivate offer' : 'Activate offer'}
                            style={{
                              ...styles.button,
                              backgroundColor: isActive ? styles.buttonDanger : styles.buttonSuccess,
                              color: 'white',
                              border: 'none',
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.75rem',
                              minHeight: '2rem',
                              lineHeight: 1,
                              fontWeight: 700,
                              opacity: !isAdminWalletConnected || busy || loading || offerId === 'credits' ? 0.6 : 1,
                              whiteSpace: 'nowrap',
                              boxShadow: '0 1px 0 rgba(0,0,0,0.12)',
                            }}
                          >
                            {busy && stockroomActionKey?.startsWith(`active:${offerId}`) ? 'Saving...' : isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            type="button"
                            disabled={!isAdminWalletConnected || busy || loading || offerId === 'credits'}
                            onClick={() => {
                              if (!confirm(`Remove offer "${offerId}" from Stockroom?\n\nThis is on-chain and affects what players can buy.`)) return;
                              void removeStockroomRow(offerId, offer);
                            }}
                            title={offerId === 'credits' ? 'The base "credits" SKU is managed separately' : 'Remove offer from Stockroom'}
                            style={{
                              ...styles.button,
                              backgroundColor: styles.buttonDanger,
                              color: 'white',
                              padding: '0.25rem 0.5rem',
                              fontSize: '0.75rem',
                              minHeight: '2rem',
                              lineHeight: 1,
                              fontWeight: 700,
                              opacity: !isAdminWalletConnected || busy || loading || offerId === 'credits' ? 0.6 : 1,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {busy && stockroomActionKey === `remove:${offerId}` ? 'Removing...' : 'Remove'}
                          </button>
                          {offerId !== 'credits' ? (
                            <button
                              type="button"
                              disabled={!isAdminWalletConnected || busy || loading}
                              onClick={() => loadBundleIntoEditor(offerId, offer)}
                              style={{
                                ...styles.button,
                                backgroundColor: styles.buttonPrimary,
                                color: 'white',
                                padding: '0.25rem 0.5rem',
                                fontSize: '0.75rem',
                                minHeight: '2rem',
                                lineHeight: 1,
                                fontWeight: 600,
                                opacity: !isAdminWalletConnected || busy || loading ? 0.6 : 1,
                              }}
                            >
                              Edit offer
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : null}

            {stockroomViewTab === 'tickets' ? (
              <div style={{ display: 'grid', gap: '0.4rem', marginTop: '0.75rem' }}>
                <div style={{ fontWeight: 700 }}>Tickets ordering (single + packs)</div>
                <div style={{ fontSize: '0.8rem', color: styles.textSecondary }}>
                  This is the order players see in the Tickets tab. It’s persisted on-chain in Stockroom `catalog_order`.
                </div>
                {sortedTicketPackOfferEntries.length === 0 ? (
                  <div style={{ color: styles.textSecondary, fontSize: '0.85rem' }}>None loaded.</div>
                ) : (
                  sortedTicketTabOfferIds.map((offerId, idx) => {
                    const offer = (offers?.[offerId] || {}) as Record<string, unknown>;
                    const busy = stockroomActionKey?.startsWith(`active:${offerId}`) || stockroomActionKey === `remove:${offerId}`;
                    const isActive = offer.active !== false && offer.active !== 0 && offer.active !== 'false';
                    const displayName = parseBundleDisplayName(offer, offerId);
                    const priceUsdCents =
                      typeof offer?.priceUsdCents === 'number'
                        ? Number(offer.priceUsdCents)
                        : typeof offer?.price_usd_cents === 'number'
                          ? Number(offer.price_usd_cents)
                          : Math.round(offerPriceUsd(offer) * 100);
                    const offerPriceUsdValue = Math.max(0, priceUsdCents / 100);
                    return (
                      <div
                        key={`ticket-pack-${offerId}`}
                        style={{
                          border: `1px solid ${styles.border}`,
                          borderRadius: 6,
                          padding: '0.5rem',
                          background: styles.bgSecondary,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700 }} title={offerId}>
                            {displayName}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: styles.textSecondary }}>${offerPriceUsdValue.toFixed(2)}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                          <div style={{ display: 'grid', gap: '0.15rem' }}>
                            <button
                              type="button"
                              disabled={!isAdminWalletConnected || busy || loading || idx === 0}
                              onClick={() => moveTicketTabOfferInOrder(offerId, -1)}
                              title="Move up"
                              style={{
                                ...styles.button,
                                padding: '0.1rem 0.35rem',
                                minHeight: '1.25rem',
                                lineHeight: 1,
                                fontSize: '0.7rem',
                                opacity: !isAdminWalletConnected || busy || loading || idx === 0 ? 0.5 : 1,
                              }}
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              disabled={!isAdminWalletConnected || busy || loading || idx === sortedTicketTabOfferIds.length - 1}
                              onClick={() => moveTicketTabOfferInOrder(offerId, 1)}
                              title="Move down"
                              style={{
                                ...styles.button,
                                padding: '0.1rem 0.35rem',
                                minHeight: '1.25rem',
                                lineHeight: 1,
                                fontSize: '0.7rem',
                                opacity: !isAdminWalletConnected || busy || loading ? 0.5 : 1,
                              }}
                            >
                              ▼
                            </button>
                          </div>
                          <button
                            type="button"
                            disabled={!isAdminWalletConnected || busy || loading || offerId === 'tickets'}
                            onClick={() => setRowActiveFlag(offerId, offer, !isActive)}
                            title={offerId === 'tickets' ? 'The base "tickets" SKU is managed separately' : isActive ? 'Deactivate offer' : 'Activate offer'}
                            style={{
                              ...styles.button,
                              backgroundColor: isActive ? styles.buttonDanger : styles.buttonSuccess,
                              color: 'white',
                              border: 'none',
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.75rem',
                              minHeight: '2rem',
                              lineHeight: 1,
                              fontWeight: 700,
                              opacity: !isAdminWalletConnected || busy || loading || offerId === 'tickets' ? 0.6 : 1,
                              whiteSpace: 'nowrap',
                              boxShadow: '0 1px 0 rgba(0,0,0,0.12)',
                            }}
                          >
                            {busy && stockroomActionKey?.startsWith(`active:${offerId}`) ? 'Saving...' : isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            type="button"
                            disabled={!isAdminWalletConnected || busy || loading || offerId === 'tickets'}
                            onClick={() => {
                              if (!confirm(`Remove offer "${offerId}" from Stockroom?\n\nThis is on-chain and affects what players can buy.`)) return;
                              void removeStockroomRow(offerId, offer);
                            }}
                            title={offerId === 'tickets' ? 'The base "tickets" SKU is managed separately' : 'Remove offer from Stockroom'}
                            style={{
                              ...styles.button,
                              backgroundColor: styles.buttonDanger,
                              color: 'white',
                              padding: '0.25rem 0.5rem',
                              fontSize: '0.75rem',
                              minHeight: '2rem',
                              lineHeight: 1,
                              fontWeight: 700,
                              opacity: !isAdminWalletConnected || busy || loading || offerId === 'tickets' ? 0.6 : 1,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {busy && stockroomActionKey === `remove:${offerId}` ? 'Removing...' : 'Remove'}
                          </button>
                          {offerId !== 'tickets' ? (
                            <button
                              type="button"
                              disabled={!isAdminWalletConnected || busy || loading}
                              onClick={() => loadBundleIntoEditor(offerId, offer)}
                              style={{
                                ...styles.button,
                                backgroundColor: styles.buttonPrimary,
                                color: 'white',
                                padding: '0.25rem 0.5rem',
                                fontSize: '0.75rem',
                                minHeight: '2rem',
                                lineHeight: 1,
                                fontWeight: 600,
                                opacity: !isAdminWalletConnected || busy || loading ? 0.6 : 1,
                              }}
                            >
                              Edit offer
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : null}

            {stockroomViewTab === 'bundles' ? (
              <div style={{ display: 'grid', gap: '0.4rem', marginTop: '0.75rem' }}>
                <div style={{ fontWeight: 700 }}>Bundles</div>
                {sortedBundleOfferEntries.length === 0 ? (
                  <div style={{ color: styles.textSecondary, fontSize: '0.85rem' }}>None loaded.</div>
                ) : (
                  sortedBundleOfferEntries.map(([offerId, raw], idx) => {
                    const offer = raw as Record<string, unknown>;
                    const busy = stockroomActionKey?.startsWith(`active:${offerId}`) || stockroomActionKey === `remove:${offerId}`;
                    const isActive = offer.active !== false && offer.active !== 0 && offer.active !== 'false';
                    const displayName = parseBundleDisplayName(offer, offerId);
                    const priceUsdCents =
                      typeof offer?.priceUsdCents === 'number'
                        ? Number(offer.priceUsdCents)
                        : typeof offer?.price_usd_cents === 'number'
                          ? Number(offer.price_usd_cents)
                          : Math.round(offerPriceUsd(offer) * 100);
                    const offerPriceUsdValue = Math.max(0, priceUsdCents / 100);
                    return (
                      <div
                        key={`bundle-offer-${offerId}`}
                        style={{
                          border: `1px solid ${styles.border}`,
                          borderRadius: 6,
                          padding: '0.5rem',
                          background: styles.bgSecondary,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700 }} title={offerId}>
                            {displayName}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: styles.textSecondary }}>${offerPriceUsdValue.toFixed(2)}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                          <div style={{ display: 'grid', gap: '0.15rem' }}>
                            <button
                              type="button"
                              disabled={!isAdminWalletConnected || busy || loading || idx === 0}
                              onClick={() => moveBundleOfferInOrder(offerId, -1)}
                              title="Move up"
                              style={{
                                ...styles.button,
                                padding: '0.1rem 0.35rem',
                                minHeight: '1.25rem',
                                lineHeight: 1,
                                fontSize: '0.7rem',
                                opacity: !isAdminWalletConnected || busy || loading || idx === 0 ? 0.5 : 1,
                              }}
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              disabled={!isAdminWalletConnected || busy || loading || idx === sortedBundleOfferEntries.length - 1}
                              onClick={() => moveBundleOfferInOrder(offerId, 1)}
                              title="Move down"
                              style={{
                                ...styles.button,
                                padding: '0.1rem 0.35rem',
                                minHeight: '1.25rem',
                                lineHeight: 1,
                                fontSize: '0.7rem',
                                opacity: !isAdminWalletConnected || busy || loading ? 0.5 : 1,
                              }}
                            >
                              ▼
                            </button>
                          </div>
                          <button
                            type="button"
                            disabled={!isAdminWalletConnected || busy || loading}
                            onClick={() => setRowActiveFlag(offerId, offer, !isActive)}
                            title={isActive ? 'Deactivate bundle' : 'Activate bundle'}
                            style={{
                              ...styles.button,
                              backgroundColor: isActive ? styles.buttonDanger : styles.buttonSuccess,
                              color: 'white',
                              border: 'none',
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.75rem',
                              minHeight: '2rem',
                              lineHeight: 1,
                              fontWeight: 700,
                              opacity: !isAdminWalletConnected || busy || loading ? 0.6 : 1,
                              whiteSpace: 'nowrap',
                              boxShadow: '0 1px 0 rgba(0,0,0,0.12)',
                            }}
                          >
                            {busy && stockroomActionKey?.startsWith(`active:${offerId}`) ? 'Saving...' : isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            type="button"
                            disabled={!isAdminWalletConnected || busy || loading}
                            onClick={() => {
                              if (!confirm(`Remove offer "${offerId}" from Stockroom?\n\nThis is on-chain and affects what players can buy.`)) return;
                              void removeStockroomRow(offerId, offer);
                            }}
                            title="Remove bundle from Stockroom"
                            style={{
                              ...styles.button,
                              backgroundColor: styles.buttonDanger,
                              color: 'white',
                              padding: '0.25rem 0.5rem',
                              fontSize: '0.75rem',
                              minHeight: '2rem',
                              lineHeight: 1,
                              fontWeight: 700,
                              opacity: !isAdminWalletConnected || busy || loading ? 0.6 : 1,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {busy && stockroomActionKey === `remove:${offerId}` ? 'Removing...' : 'Remove'}
                          </button>
                          <button
                            type="button"
                            disabled={!isAdminWalletConnected || busy || loading}
                            onClick={() => loadBundleIntoEditor(offerId, offer)}
                            style={{
                              ...styles.button,
                              backgroundColor: styles.buttonPrimary,
                              color: 'white',
                              padding: '0.25rem 0.5rem',
                              fontSize: '0.75rem',
                              minHeight: '2rem',
                              lineHeight: 1,
                              fontWeight: 600,
                              opacity: !isAdminWalletConnected || busy || loading ? 0.6 : 1,
                            }}
                          >
                            Edit offer
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : null}

            {stockroomViewTab === 'items' ? (
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {consumableCatalogEntries.map(([itemId, item]) => {
                const existingLevels = new Set(
                  (item?.levels || [])
                    .map((l) => Number(l.level))
                    .filter((l) => Number.isFinite(l) && l > 0)
                );
                const sortedLevels = Array.from(existingLevels).sort((a, b) => a - b);
                const isSingleLevel = sortedLevels.length === 1 && sortedLevels[0] === 1;
                const hasLevels = existingLevels.size > 0;
                return (
                  <div
                    key={`drag-item-${itemId}`}
                    style={{
                      border: `1px solid ${styles.border}`,
                      borderRadius: 6,
                      padding: '0.55rem',
                      background: styles.bgSecondary,
                      display: 'grid',
                      gridTemplateColumns: 'minmax(12rem, 1fr) max-content max-content minmax(4.75rem, max-content)',
                      gap: '0.6rem',
                      alignItems: 'center',
                    }}
                  >
                    <div
                      draggable
                      title="Drag this item into the bundle bucket to add it. The card is the drag handle."
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', itemId);
                        e.dataTransfer.effectAllowed = 'copy';
                        setDraggingItemId(itemId);
                        setHoveredDragItemId(null);
                      }}
                      onDragEnd={() => setDraggingItemId(null)}
                      onMouseEnter={() => setHoveredDragItemId(itemId)}
                      onMouseLeave={() => setHoveredDragItemId((id) => (id === itemId ? null : id))}
                      style={{
                        border: `1px solid ${
                          hoveredDragItemId === itemId && draggingItemId !== itemId ? styles.buttonPrimary : styles.border
                        }`,
                        borderRadius: 6,
                        padding: '0.45rem',
                        background: styles.bgPrimary,
                        cursor: draggingItemId === itemId ? 'grabbing' : 'grab',
                        userSelect: 'none',
                        boxShadow:
                          hoveredDragItemId === itemId && draggingItemId !== itemId
                            ? '0 2px 10px rgba(0, 0, 0, 0.12)'
                            : undefined,
                        transform:
                          hoveredDragItemId === itemId && draggingItemId !== itemId ? 'translateY(-1px)' : undefined,
                        transition: 'box-shadow 0.15s ease, border-color 0.15s ease, transform 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.35rem' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600 }}>{item.name || itemId}</div>
                        </div>
                        <span
                          aria-hidden
                          style={{
                            flexShrink: 0,
                            fontSize: '0.7rem',
                            color: styles.textSecondary,
                            opacity: hoveredDragItemId === itemId ? 1 : 0.45,
                            lineHeight: 1.2,
                            paddingTop: '0.1rem',
                            fontWeight: 600,
                            letterSpacing: '0.02em',
                          }}
                        >
                          ⋮⋮
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => moveItemInOrder(itemId, -1)}
                        disabled={!isAdminWalletConnected || loading}
                        style={{
                          ...styles.button,
                          padding: '0.15rem 0.35rem',
                          minWidth: 0,
                          lineHeight: 1,
                        }}
                        title="Move up"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItemInOrder(itemId, 1)}
                        disabled={!isAdminWalletConnected || loading}
                        style={{
                          ...styles.button,
                          padding: '0.15rem 0.35rem',
                          minWidth: 0,
                          lineHeight: 1,
                        }}
                        title="Move down"
                      >
                        ▼
                      </button>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-end',
                        gap: '0.35rem',
                        whiteSpace: 'nowrap',
                        minWidth: 'calc(3 * 4.5rem + 2 * 0.35rem)',
                      }}
                    >
                      {!hasLevels ? (
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', color: styles.textSecondary, marginBottom: '0.15rem' }}>
                            Price
                          </label>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={itemPrices[`${itemId}:base`] ?? 0}
                            onChange={(e) =>
                              setItemPrices((prev) => ({
                                ...prev,
                                [`${itemId}:base`]: Math.max(0, Math.round(Number(e.target.value || 0) * 100) / 100),
                              }))
                            }
                            style={{
                              width: 'clamp(2.8rem, 4ch, 4.5rem)',
                              padding: '0.35rem',
                              border: `1px solid ${styles.border}`,
                              borderRadius: 4,
                              backgroundColor: styles.inputBg,
                              color: styles.text,
                            }}
                          />
                        </div>
                      ) : null}
                      {sortedLevels.map((level) => {
                        const key = `${itemId}:l${level}`;
                        return (
                          <div key={key}>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: styles.textSecondary, marginBottom: '0.15rem' }}>
                              {isSingleLevel ? 'Price' : `L${level}`}
                            </label>
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              value={itemPrices[key] ?? 0}
                              onChange={(e) =>
                                setItemPrices((prev) => ({
                                  ...prev,
                                  [key]: Math.max(0, Math.round(Number(e.target.value || 0) * 100) / 100),
                                }))
                              }
                              style={{
                                width: 'clamp(2.8rem, 4ch, 4.5rem)',
                                padding: '0.35rem',
                                border: `1px solid ${styles.border}`,
                                borderRadius: 4,
                                backgroundColor: styles.inputBg,
                                color: styles.text,
                              }}
                            />
                          </div>
                        );
                      })}
                      {/* Non-leveled items render a single Price input above */}
                    </div>
                    <button
                      type="button"
                      onClick={() => saveItemLevels(itemId)}
                      disabled={!isAdminWalletConnected || savingItemId === itemId || loading}
                      style={{
                        ...styles.button,
                        backgroundColor: styles.buttonPrimary,
                        color: 'white',
                        opacity: !isAdminWalletConnected || savingItemId === itemId || loading ? 0.6 : 1,
                        cursor: !isAdminWalletConnected || savingItemId === itemId || loading ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap',
                        minWidth: '4.75rem',
                        justifySelf: 'end',
                      }}
                    >
                      {savingItemId === itemId ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                );
                })}
              </div>
            ) : null}
          </div>

          {/* Right-side bundle editor/bucket is always visible by design */}
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
            <div style={{ marginBottom: '0.35rem' }}>
              <div style={{ fontWeight: 700 }}>Bundle offer (SKU)</div>
              <div style={{ fontSize: '0.8rem', color: styles.textSecondary }}>
                One Stockroom offer ID for the whole bundle. Re-use the same ID and save to update (edit). USD price is for the bundle, not per-line catalog math.
              </div>
            </div>
            <div
              style={{
                border: `1px solid ${styles.border}`,
                borderRadius: 8,
                padding: '0.75rem',
                background: styles.bgPrimary,
                marginBottom: '0.75rem',
                display: 'grid',
                gridTemplateColumns: '1fr',
                gap: '0.5rem',
                minWidth: 0,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', color: styles.textSecondary }}>Bundle ID</label>
                <input
                  type="text"
                  value={bundleId}
                  onChange={(e) => setBundleId(e.target.value)}
                  placeholder="e.g. starter_bundle"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '0.45rem', border: `1px solid ${styles.border}`, borderRadius: 4, background: styles.inputBg, color: styles.text }}
                />
              </div>
              <div style={{ minWidth: 0 }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', color: styles.textSecondary }}>Bundle name</label>
                <input
                  type="text"
                  value={bundleName}
                  onChange={(e) => setBundleName(e.target.value)}
                  placeholder="Bundle name"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '0.45rem', border: `1px solid ${styles.border}`, borderRadius: 4, background: styles.inputBg, color: styles.text }}
                />
              </div>
              <div style={{ minWidth: 0 }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', color: styles.textSecondary }}>Description</label>
                <input
                  type="text"
                  value={bundleDescription}
                  onChange={(e) => setBundleDescription(e.target.value)}
                  placeholder="Optional"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '0.45rem', border: `1px solid ${styles.border}`, borderRadius: 4, background: styles.inputBg, color: styles.text }}
                />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={bundleActive}
                  onChange={(e) => setBundleActive(e.target.checked)}
                  disabled={!isAdminWalletConnected || savingBundle}
                />
                <span>Listing active (players can purchase)</span>
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '7.25rem minmax(9rem, 11rem)',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  alignItems: 'start',
                  minWidth: 0,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', color: styles.textSecondary }}>Discount %</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '3.1rem 1.6rem', alignItems: 'stretch', width: 'fit-content' }}>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={bundleDiscountPct}
                      onChange={(e) => setBundleDiscountPct(Math.max(0, Math.min(100, Math.round(Number(e.target.value || 0)))))}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '0.45rem',
                        height: '2.25rem',
                        border: `1px solid ${styles.border}`,
                        borderRight: 'none',
                        borderRadius: '4px 0 0 4px',
                        backgroundColor: styles.inputBg,
                        color: styles.text,
                        textAlign: 'center',
                        appearance: 'textfield',
                        MozAppearance: 'textfield',
                        WebkitAppearance: 'none',
                      }}
                    />
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateRows: '1fr 1fr',
                        border: `1px solid ${styles.border}`,
                        borderRadius: '0 4px 4px 0',
                        overflow: 'hidden',
                        background: styles.bgTertiary,
                        height: '2.25rem',
                        boxSizing: 'border-box',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setBundleDiscountPct((p) => Math.max(0, Math.min(100, Math.round((Number(p) || 0) + 1))))}
                        style={{
                          ...styles.button,
                          padding: 0,
                          minWidth: 0,
                          border: 'none',
                          borderBottom: `1px solid ${styles.border}`,
                          background: 'transparent',
                          color: styles.text,
                          lineHeight: 1,
                          fontSize: '0.7rem',
                        }}
                        title="Increase discount"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => setBundleDiscountPct((p) => Math.max(0, Math.min(100, Math.round((Number(p) || 0) - 1))))}
                        style={{
                          ...styles.button,
                          padding: 0,
                          minWidth: 0,
                          border: 'none',
                          background: 'transparent',
                          color: styles.text,
                          lineHeight: 1,
                          fontSize: '0.7rem',
                        }}
                        title="Decrease discount"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ minWidth: 0 }}>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', color: styles.textSecondary }}>Price (USD)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={bundlePriceUsd}
                    onChange={(e) => {
                      setBundlePriceUsd(Math.max(0, Math.round(Number(e.target.value || 0) * 100) / 100));
                    }}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '0.45rem',
                      height: '2.25rem',
                      border: `1px solid ${styles.border}`,
                      borderRadius: 4,
                      background: styles.inputBg,
                      color: styles.text,
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'end', gridColumn: '1 / -1', marginTop: '0.25rem' }}>
                  <button
                    type="button"
                    onClick={clearBundleForm}
                    disabled={!isAdminWalletConnected || savingBundle || loading}
                    style={{
                      ...styles.button,
                      opacity: !isAdminWalletConnected || savingBundle || loading ? 0.6 : 1,
                      cursor: !isAdminWalletConnected || savingBundle || loading ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Clear form
                  </button>
                  <button
                    type="button"
                    onClick={saveBundleOffer}
                    disabled={!isAdminWalletConnected || savingBundle || loading}
                    style={{
                      ...styles.button,
                      backgroundColor: styles.buttonSuccess,
                      color: 'white',
                      opacity: !isAdminWalletConnected || savingBundle || loading ? 0.6 : 1,
                      cursor: !isAdminWalletConnected || savingBundle || loading ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {savingBundle ? 'Saving...' : 'Save bundle'}
                  </button>
                </div>
              </div>
            </div>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const itemId = e.dataTransfer.getData('text/plain');
                if (itemId) onDropItemIntoBundle(itemId);
              }}
              style={{
                border: `2px dashed ${styles.border}`,
                borderRadius: 8,
                padding: '0.75rem',
                background: styles.bgPrimary,
                flex: 1,
                minHeight: 220,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Bundle bucket (drop here)</div>
              {bundleItems.length === 0 ? (
                <div style={{ color: styles.textSecondary, fontSize: '0.9rem' }}>
                  Drop items here to build a bundle.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {bundleItems.map((entry) => {
                    const itemId = entry.itemId;
                    const item = getCatalogItem(itemId);
                    const availableLevels = getAvailableLevelsForItem(catalog, itemId);
                    const hasLevels = availableLevels.length > 0;
                    const priceKey = hasLevels ? `${itemId}:l${entry.level}` : `${itemId}:base`;
                    const unitUsd = STANDALONE_ITEM_IDS.has(itemId)
                      ? Number(standaloneItemPrices[itemId] ?? 0)
                      : Number(itemPrices[priceKey] ?? 0);
                    const lineTotalUsd = unitUsd * Math.max(1, Math.floor(Number(entry.quantity) || 1));
                    return (
                      <div
                        key={`bucket-${itemId}-${entry.level}`}
                        style={{
                          border: `1px solid ${styles.border}`,
                          borderRadius: 6,
                          padding: '0.55rem',
                          background: styles.bgSecondary,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                          <div>
                            <div style={{ fontWeight: 600 }}>{item?.name || itemId}</div>
                            <div style={{ fontSize: '0.85rem', color: styles.textSecondary, marginTop: '0.15rem' }}>
                              <div>${unitUsd.toFixed(2)} each</div>
                              <div>${lineTotalUsd.toFixed(2)} total</div>
                            </div>
                            {hasLevels ? (
                              <div
                                style={{
                                  marginTop: '0.35rem',
                                  display: 'flex',
                                  gap: '0.25rem',
                                  alignItems: 'center',
                                  flexWrap: 'wrap',
                                }}
                                title="Select item level for this bundle line"
                              >
                                {availableLevels.map((lv) => {
                                  const selected = lv === entry.level;
                                  return (
                                    <button
                                      key={`bucket-level-${itemId}-${lv}`}
                                      type="button"
                                      onClick={() => updateBundleLevel(itemId, entry.level, lv)}
                                      style={{
                                        ...styles.button,
                                        padding: '0.2rem 0.45rem',
                                        fontSize: '0.75rem',
                                        borderRadius: 6,
                                        backgroundColor: selected ? styles.buttonPrimary : styles.bgTertiary,
                                        color: selected ? 'white' : styles.text,
                                        border: selected ? `1px solid ${styles.buttonPrimary}` : `1px solid ${styles.border}`,
                                        opacity: selected ? 1 : 0.9,
                                      }}
                                    >
                                      L{lv}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : null}
                          </div>
                          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                            <label style={{ fontSize: '0.75rem', color: styles.textSecondary }}>
                              Qty
                            </label>
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr auto',
                                alignItems: 'stretch',
                                width: 'clamp(3.6rem, 7ch, 5.4rem)',
                              }}
                              title="Bundle quantity"
                            >
                              <input
                                type="number"
                                min={1}
                                value={entry.quantity}
                                onChange={(e) => updateBundleQuantity(itemId, entry.level, Number(e.target.value))}
                                style={{
                                  width: '100%',
                                  padding: '0.35rem',
                                  border: `1px solid ${styles.border}`,
                                  borderRight: 'none',
                                  borderRadius: '4px 0 0 4px',
                                  backgroundColor: styles.inputBg,
                                  color: styles.text,
                                }}
                              />
                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateRows: '1fr 1fr',
                                  border: `1px solid ${styles.border}`,
                                  borderRadius: '0 4px 4px 0',
                                  overflow: 'hidden',
                                  background: styles.bgTertiary,
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() => updateBundleQuantity(itemId, entry.level, (Number(entry.quantity) || 1) + 1)}
                                  style={{
                                    ...styles.button,
                                    padding: 0,
                                    minWidth: 0,
                                    border: 'none',
                                    borderBottom: `1px solid ${styles.border}`,
                                    background: 'transparent',
                                    color: styles.text,
                                    lineHeight: 1,
                                    fontSize: '0.7rem',
                                  }}
                                  title="Increase quantity"
                                >
                                  ▲
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateBundleQuantity(itemId, entry.level, Math.max(1, (Number(entry.quantity) || 1) - 1))}
                                  style={{
                                    ...styles.button,
                                    padding: 0,
                                    minWidth: 0,
                                    border: 'none',
                                    background: 'transparent',
                                    color: styles.text,
                                    lineHeight: 1,
                                    fontSize: '0.7rem',
                                  }}
                                  title="Decrease quantity"
                                >
                                  ▼
                                </button>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeBundleItem(itemId, entry.level)}
                              style={{
                                ...styles.button,
                                backgroundColor: styles.buttonDanger,
                                color: 'white',
                                padding: '0.35rem 0.5rem',
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.25rem' }}>
                    <div style={{ fontWeight: 700 }}>Bucket total</div>
                    <div style={{ fontWeight: 700 }}>
                      ${bucketTotalUsd.toFixed(2)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Removed redundant bottom "bundle offers on chain" sections.
            Each Stockroom tab now renders its relevant on-chain offers in the left panel. */}
      </div>
    </div>
  );
}

