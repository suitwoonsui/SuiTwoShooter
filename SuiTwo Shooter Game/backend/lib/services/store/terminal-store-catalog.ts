// ==========================================
// Terminal store catalog — shared builder for GET /api/store/catalog and menu bootstrap.
// Single in-memory cache lives in @/lib/cache/public-nonuser-data-cache.
// ==========================================

import { priceConverter } from '@/lib/services/payments/converter/price-converter';
import { platformStoreClient } from '@/lib/services/platform/client/platform-client';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';

export type StoreCatalogPayload = {
  success: true;
  catalogSource: 'terminal/store-catalog';
  flow: unknown;
  items: unknown[];
  offers: Record<string, unknown>;
  bundleAndPackSkus: unknown[];
  offerOrder: string[];
  prices: {
    sui: number;
    mews: number;
    usdc: number;
  };
  timestamp: number;
};

const TERMINAL_STORE_CATALOG_TIMEOUT_MS = 30_000;
const TERMINAL_STORE_CATALOG_RETRY_ON_TIMEOUT = 2;
const REQUIRED_CORE_ITEM_IDS = new Set([
  'extra_lives',
  'force_field',
  'orb_level',
  'coin_tractor_beam',
  'slow_time',
  'destroy_all',
  'boss_kill_shot',
  'credits',
  'tickets',
]);

function makeStoreCatalogTraceId(): string {
  return `sc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function withTimeout<T>(p: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let t: NodeJS.Timeout | null = null;
  try {
    const timeout = new Promise<never>((_, reject) => {
      t = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
    });
    return await Promise.race([p, timeout]);
  } finally {
    if (t) clearTimeout(t);
  }
}

async function getTerminalStoreCatalogWithRetry(): Promise<any> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt <= TERMINAL_STORE_CATALOG_RETRY_ON_TIMEOUT; attempt++) {
    try {
      return await withTimeout(
        platformStoreClient.getTerminalStoreCatalog(),
        TERMINAL_STORE_CATALOG_TIMEOUT_MS,
        'terminal/store-catalog'
      );
    } catch (e) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);
      const isTimeout = msg.toLowerCase().includes('timed out');
      if (!isTimeout || attempt >= TERMINAL_STORE_CATALOG_RETRY_ON_TIMEOUT) break;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr ?? 'terminal/store-catalog failed'));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeOfferOrder(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((s) => String(s ?? '').trim()).filter(Boolean);
}

function buildFallbackOfferOrder(payload: StoreCatalogPayload): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  const offers =
    payload.offers && typeof payload.offers === 'object' ? (payload.offers as Record<string, unknown>) : {};
  const offerKeys = Object.keys(offers).filter(Boolean);
  const offerPriority = (k: string) => {
    const l = k.toLowerCase();
    if (l === 'credits') return 0;
    if (l === 'tickets') return 1;
    return 2;
  };
  offerKeys.sort((a, b) => {
    const d = offerPriority(a) - offerPriority(b);
    if (d !== 0) return d;
    return a.localeCompare(b);
  });
  for (const k of offerKeys) {
    if (!seen.has(k)) {
      seen.add(k);
      out.push(k);
    }
  }

  const items = Array.isArray(payload.items) ? payload.items : [];
  const standaloneItemIds = new Set(['credits', 'tickets']);

  const sortedItems = [...items].sort((a: unknown, b: unknown) => {
    const ia = a as Record<string, unknown>;
    const ib = b as Record<string, unknown>;
    const aPri = Number(ia?.uiPriority ?? ia?.sortOrder ?? Number.NaN);
    const bPri = Number(ib?.uiPriority ?? ib?.sortOrder ?? Number.NaN);
    const aHas = Number.isFinite(aPri);
    const bHas = Number.isFinite(bPri);
    if (aHas && bHas && aPri !== bPri) return aPri - bPri;
    if (aHas !== bHas) return aHas ? -1 : 1;
    const aName = String(ia?.name ?? '')
      .trim()
      .toLowerCase();
    const bName = String(ib?.name ?? '')
      .trim()
      .toLowerCase();
    if (aName && bName && aName !== bName) return aName.localeCompare(bName);
    return String(ia?.id ?? '')
      .trim()
      .toLowerCase()
      .localeCompare(String(ib?.id ?? '').trim().toLowerCase());
  });

  for (const row of sortedItems) {
    const it = row as Record<string, unknown>;
    const id = String(it?.id ?? '').trim();
    if (!id) continue;
    if (standaloneItemIds.has(id.toLowerCase())) continue;
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }

  return out;
}

function ensureCatalogOfferOrder(terminalRes: { offerOrder?: unknown }, payload: StoreCatalogPayload): void {
  const fromTerminal = sanitizeOfferOrder(terminalRes.offerOrder);
  if (fromTerminal.length > 0) {
    payload.offerOrder = fromTerminal;
    return;
  }
  payload.offerOrder = buildFallbackOfferOrder(payload);
}

export function withGuaranteedOfferOrder(data: StoreCatalogPayload): StoreCatalogPayload {
  const oo = Array.isArray(data.offerOrder) ? sanitizeOfferOrder(data.offerOrder) : [];
  if (oo.length > 0) {
    return data.offerOrder === oo ? data : { ...data, offerOrder: oo };
  }
  const filled = buildFallbackOfferOrder(data);
  return { ...data, offerOrder: filled };
}

function isCatalogCompleteEnough(payload: StoreCatalogPayload): boolean {
  const items = Array.isArray(payload.items) ? payload.items : [];
  const idSet = new Set(
    items
      .map((it: any) => String(it?.id || '').trim().toLowerCase())
      .filter(Boolean)
  );
  for (const id of REQUIRED_CORE_ITEM_IDS) {
    if (!idSet.has(id)) return false;
  }

  const multi = new Map<string, number>([
    ['extra_lives', 3],
    ['force_field', 3],
    ['orb_level', 3],
    ['coin_tractor_beam', 3],
    ['slow_time', 3],
  ]);
  for (const [id, minLevels] of multi.entries()) {
    const row = items.find((it: any) => String(it?.id || '').trim().toLowerCase() === id);
    const n = Array.isArray((row as any)?.levels) ? (row as any).levels.length : 0;
    if (n < minLevels) return false;
  }

  const offerKeys = new Set(Object.keys(payload.offers || {}));
  if (!offerKeys.has('credits') || !offerKeys.has('tickets')) return false;

  const ord = Array.isArray(payload.offerOrder) ? payload.offerOrder.length : 0;
  if (ord === 0) return false;

  return true;
}

function getCatalogCompletenessDiagnostics(payload: StoreCatalogPayload): {
  itemCount: number;
  offerCount: number;
  hasSingles: { credits: boolean; tickets: boolean };
  missingCoreIds: string[];
  levelCounts: Record<string, number>;
  underleveled: Array<{ id: string; expected: number; actual: number }>;
} {
  const items = Array.isArray(payload.items) ? payload.items : [];
  const itemCount = items.length;
  const offerCount = offersKeyCount(payload.offers);
  const idSet = new Set(
    items.map((it: any) => String(it?.id || '').trim().toLowerCase()).filter(Boolean)
  );
  const missingCoreIds = Array.from(REQUIRED_CORE_ITEM_IDS).filter((id) => !idSet.has(id));

  const expectedLevels = new Map<string, number>([
    ['extra_lives', 3],
    ['force_field', 3],
    ['orb_level', 3],
    ['coin_tractor_beam', 3],
    ['slow_time', 3],
  ]);

  const levelCounts: Record<string, number> = {};
  const underleveled: Array<{ id: string; expected: number; actual: number }> = [];
  for (const [id, expected] of expectedLevels.entries()) {
    const row = items.find((it: any) => String(it?.id || '').trim().toLowerCase() === id);
    const actual = Array.isArray((row as any)?.levels) ? (row as any).levels.length : 0;
    levelCounts[id] = actual;
    if (actual < expected) underleveled.push({ id, expected, actual });
  }

  const hasSingles = {
    credits: Object.prototype.hasOwnProperty.call(payload.offers || {}, 'credits'),
    tickets: Object.prototype.hasOwnProperty.call(payload.offers || {}, 'tickets'),
  };

  return {
    itemCount,
    offerCount,
    hasSingles,
    missingCoreIds,
    levelCounts,
    underleveled,
  };
}

function offersKeyCount(o: unknown): number {
  if (!o || typeof o !== 'object') return 0;
  return Object.keys(o as Record<string, unknown>).length;
}

export function shouldAcceptAsNewSnapshot(next: StoreCatalogPayload, prev: StoreCatalogPayload | null): boolean {
  if (!prev) return true;

  const prevOfferOrderCount = Array.isArray(prev.offerOrder) ? prev.offerOrder.length : 0;
  const nextOfferOrderCount = Array.isArray(next.offerOrder) ? next.offerOrder.length : 0;
  if (prevOfferOrderCount > 0 && nextOfferOrderCount === 0) return false;

  const nextItems = Array.isArray(next.items) ? next.items.length : 0;
  const prevItems = Array.isArray(prev.items) ? prev.items.length : 0;
  const nextOffers = offersKeyCount(next.offers);
  const prevOffers = offersKeyCount(prev.offers);

  if (prevItems > 0 && nextItems === 0) return false;
  if (prevItems >= 6 && nextItems > 0 && nextItems < Math.ceil(prevItems * 0.8)) return false;
  if (prevOffers >= 10 && nextOffers > 0 && nextOffers < Math.ceil(prevOffers * 0.8)) return false;

  return true;
}

function previewList<T>(arr: T[] | undefined, n: number): T[] {
  const a = Array.isArray(arr) ? arr : [];
  const max = Math.max(0, Math.floor(Number(n) || 0));
  return a.slice(0, max);
}

async function fetchFreshStoreCatalog(): Promise<StoreCatalogPayload> {
  const startedAt = Date.now();

  const pricesStartedAt = Date.now();
  const pricesPromise = priceConverter.getTokenPrices().then((result) => ({
    result,
    elapsedMs: Date.now() - pricesStartedAt,
  }));

  const terminalStartedAt = Date.now();
  const terminalPromise = getTerminalStoreCatalogWithRetry().then((result) => ({
    result,
    elapsedMs: Date.now() - terminalStartedAt,
  }));

  const [pricesWrapped, terminalWrapped] = await Promise.all([pricesPromise, terminalPromise]);
  const pricesResult = pricesWrapped.result;
  const terminalRes = terminalWrapped.result;

  if (!pricesResult.success || !pricesResult.prices) {
    throw new Error(pricesResult.error || 'Failed to fetch token prices');
  }
  if (!terminalRes?.success) {
    throw new Error(terminalRes?.error || 'Terminal store-catalog failed');
  }

  const payload: StoreCatalogPayload = {
    success: true,
    catalogSource: 'terminal/store-catalog' as const,
    flow: terminalRes.flow,
    items: Array.isArray(terminalRes.items) ? terminalRes.items : [],
    offers: terminalRes.offers && typeof terminalRes.offers === 'object' ? terminalRes.offers : {},
    bundleAndPackSkus: Array.isArray(terminalRes.bundleAndPackSkus) ? terminalRes.bundleAndPackSkus : [],
    offerOrder: [],
    prices: {
      sui: pricesResult.prices.sui,
      mews: pricesResult.prices.mews,
      usdc: pricesResult.prices.usdc,
    },
    timestamp: typeof pricesResult.timestamp === 'number' ? pricesResult.timestamp : Date.now(),
  };
  ensureCatalogOfferOrder(terminalRes, payload);
  const assemblyElapsedMs = Date.now() - startedAt - Math.max(pricesWrapped.elapsedMs, terminalWrapped.elapsedMs);
  PlatformLogger.info('[STORE CATALOG] Fresh payload fetched', {
    totalElapsedMs: Date.now() - startedAt,
    pricesFetchElapsedMs: pricesWrapped.elapsedMs,
    terminalFetchElapsedMs: terminalWrapped.elapsedMs,
    payloadAssemblyElapsedMs: Math.max(0, assemblyElapsedMs),
    itemCount: Array.isArray(payload.items) ? payload.items.length : 0,
    offerCount: offersKeyCount(payload.offers),
    bundleAndPackSkuCount: Array.isArray(payload.bundleAndPackSkus) ? payload.bundleAndPackSkus.length : 0,
    offerOrderPresent: Array.isArray(payload.offerOrder),
    offerOrderCount: Array.isArray(payload.offerOrder) ? payload.offerOrder.length : 0,
    offerOrderPreview: previewList(payload.offerOrder, 12),
    terminalStoreReady: terminalRes?.storeReady,
    terminalMissing: terminalRes?.missing,
    terminalDefinitionCount: terminalRes?.definitions && typeof terminalRes.definitions === 'object'
      ? Object.keys(terminalRes.definitions).length
      : undefined,
  });
  return payload;
}

function catalogCompletenessScore(p: StoreCatalogPayload): number {
  const items = Array.isArray(p.items) ? p.items.length : 0;
  const offers = offersKeyCount(p.offers);
  const singles =
    Object.prototype.hasOwnProperty.call(p.offers || {}, 'credits') &&
    Object.prototype.hasOwnProperty.call(p.offers || {}, 'tickets')
      ? 1
      : 0;
  return items * 1000 + offers * 10 + singles;
}

/** Full completeness retry sequence — used as loader for public cache. */
export async function fetchCompleteStoreCatalogWithRetry(): Promise<StoreCatalogPayload> {
  const attempts = 5;
  let last: StoreCatalogPayload | null = null;
  let best: StoreCatalogPayload | null = null;
  let bestScore = -1;
  const traceId = makeStoreCatalogTraceId();
  PlatformLogger.info('[STORE CATALOG] Starting completeness fetch sequence', { traceId, attempts });
  for (let i = 0; i < attempts; i++) {
    const attemptNo = i + 1;
    const attemptStartedAt = Date.now();
    const payload = await fetchFreshStoreCatalog();
    const score = catalogCompletenessScore(payload);
    if (score > bestScore) {
      bestScore = score;
      best = payload;
    }
    last = payload;
    const diag = getCatalogCompletenessDiagnostics(payload);
    const complete = isCatalogCompleteEnough(payload);
    PlatformLogger.info('[STORE CATALOG] Attempt result', {
      traceId,
      attempt: attemptNo,
      complete,
      elapsedMs: Date.now() - attemptStartedAt,
      ...diag,
    });
    if (complete) return payload;
    if (i < attempts - 1) {
      const backoffMs = Math.min(8000, 1200 * 2 ** i);
      await sleep(backoffMs);
    }
  }
  const report = best || last;
  if (report) {
    PlatformLogger.error('[STORE CATALOG] Incomplete after retries', {
      traceId,
      attempts,
      note: 'Best attempt (by item/offer score) logged for diagnostics; last attempt may have been emptier due to RPC.',
      ...getCatalogCompletenessDiagnostics(report),
    });
  }
  throw new Error(
    `Store catalog incomplete after retries (items=${Array.isArray(report?.items) ? report.items.length : 0}, offers=${offersKeyCount(report?.offers)})`
  );
}
