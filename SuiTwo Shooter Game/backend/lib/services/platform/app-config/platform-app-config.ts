// ==========================================
// Platform App Config - Use platform as the single source for game config (apps define; platform stores).
// When enabled: GET /api/game-config returns platform config; admin pack/ticket/minBalance/badge proxy to platform.
// Packs/ticket bundles: Stockroom. minTokenBalance: Helm. Badge: discounts+thresholds in Aquifer (badge_discounts_and_thresholds), minting fee in Helm (badge_minting_fee).
// Pack/ticket writes use Channel item SKUs (stockroom-admin-set-item-listing / remove-item-listing). Bundle-only rows use stockroom-admin-set-offer (type 1). Helm writes use app-config-set/app-config-remove.
//
// Env: PLATFORM_APP_CONFIG_URL | PLATFORM_BACKEND_URL | API_BASE_URL (platform base),
//      optional API key override (PLATFORM_API_KEY / PLATFORM_ECOSYSTEM_API_KEY),
//      corridor caps via CORRIDOR_CAPABILITY_OBJECT_ID_*, CORRIDOR_ADMIN_CAP_OBJECT_ID_*.
// ==========================================

import { getApiKeyForEcosystem, getCorridorCapabilityObjectIdFromEnv, getCorridorAdminCapabilityObjectIdFromEnv, getEcosystemIdFromEnv, getSonarClient, buildBatchViaChannel, platformTxClient, platformMilestonesClient } from '@/lib/services/platform/client/platform-client';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { toDynamicProvisionKey } from '@/lib/services/store/catalog/item-id';
import { getConfig } from '@/config/config';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { priceConverter } from '@/lib/services/payments/converter/price-converter';

const PLATFORM_APP_CONFIG_URL = process.env.PLATFORM_APP_CONFIG_URL
  || process.env.PLATFORM_BACKEND_URL
  || process.env.NEXT_PUBLIC_PLATFORM_BACKEND_URL
  || process.env.API_BASE_URL
  || '';
const PLATFORM_ECOSYSTEM_ID = process.env.PLATFORM_ECOSYSTEM_ID || process.env.ECOSYSTEM_ID || '';
const PLATFORM_APP_ID = process.env.PLATFORM_APP_ID || process.env.APP_ID || '';
const PLATFORM_API_KEY_OVERRIDE = process.env.PLATFORM_API_KEY || '';
const PLATFORM_ECOSYSTEM_API_KEY_OVERRIDE = process.env.PLATFORM_ECOSYSTEM_API_KEY || '';

/**
 * In-memory cache for platform app config (Stockroom + Helm + Aquifer badge key in one fetch).
 * Default 30 minutes — aligns with long-lived store/tier config; override with PLATFORM_APP_CONFIG_CACHE_TTL_MS (milliseconds).
 * Call invalidatePlatformAppConfigCache() after admin pack/helm/stockroom updates.
 */
function readMsFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
const APP_CONFIG_CACHE_TTL_MS = readMsFromEnv('PLATFORM_APP_CONFIG_CACHE_TTL_MS', 30 * 60 * 1000);
type PlatformAppConfigResult = {
  packs: Array<{ packType: number; priceUsdCents: number; games: number; name: string; description: string }>;
  ticketBundles: Array<{ packType: number; quantity: number; priceUsdCents: number; name: string; description: string }>;
  minTokenBalance?: number;
  badgeConfig?: BadgeConfigFromPlatform;
  tournamentCreationFeeUsdCents?: number;
  tournamentCreationFeeToken?: 'SUI' | 'MEWS' | 'USDC';
  tournamentCreationFeeTokenAmount?: number;
  configSource: 'platform' | 'none';
  platformDebug?: PlatformAppConfigDebug;
} | null;
let appConfigCache: { value: PlatformAppConfigResult; expiresAt: number } | null = null;
let appConfigInFlight: Promise<{
  packs: Array<{ packType: number; priceUsdCents: number; games: number; name: string; description: string }>;
  ticketBundles: Array<{ packType: number; quantity: number; priceUsdCents: number; name: string; description: string }>;
  stockroomOffers?: Record<string, StockroomOfferDef>;
  minTokenBalance?: number;
  badgeConfig?: BadgeConfigFromPlatform;
  tournamentCreationFeeUsdCents?: number;
  tournamentCreationFeeToken?: 'SUI' | 'MEWS' | 'USDC';
  tournamentCreationFeeTokenAmount?: number;
  configSource: 'platform' | 'none';
  platformDebug?: PlatformAppConfigDebug;
} | null> | null = null;

/** Invalidate the platform app-config cache (call after admin updates packs/helm/badge). */
export function invalidatePlatformAppConfigCache(): void {
  appConfigCache = null;
  appConfigInFlight = null;
  import('@/lib/cache/public-nonuser-data-cache')
    .then((m) => m.invalidateGameConfigPublicCache())
    .catch((e) =>
      PlatformLogger.warn('invalidateGameConfigPublicCache failed', { error: String(e) })
    );
}

export function isPlatformAppConfigEnabled(): boolean {
  const corridorCapId = getCorridorCapabilityObjectIdFromEnv();
  return Boolean(
    PLATFORM_APP_CONFIG_URL &&
    PLATFORM_APP_CONFIG_URL !== '' &&
    corridorCapId &&
    corridorCapId !== ''
  );
}

export function getPlatformAppConfigUrl(): string {
  return PLATFORM_APP_CONFIG_URL.replace(/\/$/, '');
}

export function getPlatformEcosystemId(): string {
  return PLATFORM_ECOSYSTEM_ID;
}

export function getPlatformAppId(): string {
  return PLATFORM_APP_ID;
}

export function getPlatformEcosystemApiKey(): string {
  if (PLATFORM_API_KEY_OVERRIDE) return PLATFORM_API_KEY_OVERRIDE;
  if (PLATFORM_ECOSYSTEM_API_KEY_OVERRIDE) return PLATFORM_ECOSYSTEM_API_KEY_OVERRIDE;
  // Backward-compatible fallback: use ecosystem-specific key when ecosystem env is set.
  const ecoFromEnv = getEcosystemIdFromEnv() || PLATFORM_ECOSYSTEM_ID;
  return getApiKeyForEcosystem(ecoFromEnv) || '';
}

/** Key prefix for credit/ticket pack config. This game uses "pack:N" (N = packType). */
const PACK_KEY_PREFIX = 'pack:';

function packConfigKey(packType: number): string {
  return `${PACK_KEY_PREFIX}${packType}`;
}

function toBase64(str: string): string {
  return Buffer.from(str, 'utf8').toString('base64');
}

function fromBase64(base64: string): string {
  return Buffer.from(base64, 'base64').toString('utf8');
}

/** Platform app-config debug when config is empty (for admin troubleshooting). */
export type PlatformAppConfigDebug = {
  appIdTruncated: string;
  appsTableDynamicFieldCount?: number;
  ecosystemsTableDynamicFieldCount?: number;
  storeFound: boolean;
  entryCount?: number;
  /** When store not found and game sent X-Corridor-Capability-Object-Id: identity stored in the cap on-chain (compare with .env). */
  capEcosystemId?: string;
  capAppId?: string;
  /** True when platform used the cap's on-chain identity for lookup (same as write). */
  usedCapIdentity?: boolean;
  lookupEcosystemIdTruncated?: string;
  lookupAppIdTruncated?: string;
};

/** Badge config: discounts + thresholds from Aquifer (key badge_discounts_and_thresholds), mint/upgrade fees from Helm. Only chain-sourced; fee fields omitted when not set on Helm. */
export type BadgeConfigFromPlatform = {
  storeDiscounts: number[];
  gameplayDiscounts: number[];
  thresholds: number[];
  /** Present only when loaded from Helm (on-chain). */
  mintingFeeUsdCents?: number;
  /** Optional game fee for badge tier upgrade (Helm key badge_upgrade_fee). */
  upgradeFeeUsdCents?: number;
  version: number;
};

/** Aquifer key for badge discounts and thresholds (storeDiscounts, gameplayDiscounts, thresholds, version). */
export const AQUIFER_BADGE_DISCOUNTS_AND_THRESHOLDS_KEY = 'badge_discounts_and_thresholds';
/** Helm key for badge minting fee only (value = base64 JSON { mintingFeeUsdCents }). */
export const HELM_BADGE_MINTING_FEE_KEY = 'badge_minting_fee';
/** Helm key for badge upgrade game fee (value = base64 JSON { upgradeFeeUsdCents }). */
export const HELM_BADGE_UPGRADE_FEE_KEY = 'badge_upgrade_fee';
/** Helm key for regatta (tournament) creation fee — app fee in USD cents (value = base64 JSON { tournamentCreationFeeUsdCents }). */
export const HELM_REGATTA_CREATION_FEE_KEY = 'regatta_creation_fee';

/** Use app-scoped Aquifer key to prevent cross-app badge config leakage. */
function getAppScopedBadgeDiscountsThresholdsKey(): string {
  const appId = getPlatformAppId().trim().toLowerCase();
  return appId ? `${AQUIFER_BADGE_DISCOUNTS_AND_THRESHOLDS_KEY}:${appId}` : AQUIFER_BADGE_DISCOUNTS_AND_THRESHOLDS_KEY;
}

type StockroomOfferDef = {
  offerType?: number;
  amount?: number;
  priceUsdCents?: number;
  description?: string;
  additionalData?: string;
  listingSource?: string;
  itemKey?: string;
  level?: number;
  bundleLines?: Array<{ balanceKey?: string; balance_key?: string; amount?: number | string }>;
};

function displayNameFromStockroomDef(def: StockroomOfferDef): string {
  let name = '';
  if (def.additionalData) {
    try {
      const extra = JSON.parse(def.additionalData) as { name?: string };
      if (typeof extra.name === 'string') name = extra.name;
    } catch {
      /* ignore */
    }
  }
  if (!name && def.description) name = String(def.description).slice(0, 80);
  return name;
}

/**
 * Credit packs: credits-only stockroom rows.
 * - Single credit is a standalone Stockroom item listing (`credits`) and should be read from `stockroomOffers` (`storeSkus` in game-config),
 *   not synthesized into the packs array.
 * - Credit packs are bundle offers with ids like `credit_pack_11`, lines `credits × N`.
 */
function packsFromStockroomOffers(offers: Record<string, StockroomOfferDef>): Array<{ packType: number; priceUsdCents: number; games: number; name: string; description: string }> {
  const packs: Array<{ packType: number; priceUsdCents: number; games: number; name: string; description: string }> = [];
  for (const [offerId, def] of Object.entries(offers)) {
    const src = (def.listingSource || 'offer').toLowerCase();
    if (src === 'item_sku' || src === 'item_listing') {
      const ik = String(def.itemKey || '').trim().toLowerCase();
      if (ik !== 'credits') continue;
      const level = typeof def.level === 'number' ? def.level : NaN;
      if (!Number.isFinite(level)) {
        // Base `credits` listing is the single-credit SKU; do not include in packs[].
        continue;
      }
      if (level < 1 || level > 10) continue;
      packs.push({
        packType: level - 1,
        priceUsdCents: Number(def.priceUsdCents ?? 0),
        games: Number(def.amount ?? 0),
        name: displayNameFromStockroomDef(def),
        description: String(def.description ?? ''),
      });
      continue;
    }
    // New schema: bundle offers with IDs like `credit_pack_11`, lines include `credits` × N.
    if (def?.offerType === 1) {
      const lowerOfferId = offerId.trim().toLowerCase();
      if (!lowerOfferId.startsWith('credit_pack_')) continue;
      const qtyFromId = Number.parseInt(lowerOfferId.replace('credit_pack_', ''), 10);
      const lineQty =
        (def.bundleLines ?? []).reduce((sum, line) => {
          const bk = String(line.balanceKey ?? line.balance_key ?? '').trim().toLowerCase();
          if (bk !== 'credits') return sum;
          const n = typeof line.amount === 'number' ? line.amount : Number(line.amount ?? 0);
          return sum + (Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0);
        }, 0) || (Number.isFinite(qtyFromId) ? qtyFromId : 0);
      // Keep legacy packType mapping so existing game-store purchase path continues to work.
      // If quantity is unknown, fall back to deterministic 1..9 bucket.
      const inferredPackType =
        lineQty === 11 ? 1 :
        lineQty === 60 ? 2 :
        lineQty === 150 ? 3 :
        lineQty === 350 ? 4 :
        (lineQty <= 1 ? 0 : Math.max(1, Math.min(9, packs.length + 1)));
      packs.push({
        packType: inferredPackType,
        priceUsdCents: Number(def.priceUsdCents ?? 0),
        games: Math.max(1, lineQty),
        name: displayNameFromStockroomDef(def),
        description: String(def.description ?? ''),
      });
      continue;
    }
    // Do not read generic/legacy offer ids here; credits tab should only reflect credits-specific schema.
    continue;
  }
  packs.sort((a, b) => a.packType - b.packType);
  return packs;
}

/**
 * Ticket bundles: tickets-only stockroom rows.
 * - Single ticket is a standalone Stockroom item listing (`tickets`) and should be read from `stockroomOffers` (`storeSkus` in game-config),
 *   not synthesized into the ticketBundles array.
 * - Multi-ticket volume are bundle offers `ticket_pack_N`, offer_type 1.
 * - Optional leveled ticket SKUs (if used) remain mapped to a packType for backwards compatibility.
 */
function ticketBundlesFromStockroomOffers(offers: Record<string, StockroomOfferDef>): Array<{ packType: number; quantity: number; priceUsdCents: number; name: string; description: string }> {
  const ticketBundles: Array<{ packType: number; quantity: number; priceUsdCents: number; name: string; description: string }> = [];
  for (const [offerId, def] of Object.entries(offers)) {
    const src = (def.listingSource || 'offer').toLowerCase();
    if (src === 'item_sku' || src === 'item_listing') {
      const ik = String(def.itemKey || '').trim().toLowerCase();
      if (ik !== 'tickets') continue;
      const level = typeof def.level === 'number' ? def.level : NaN;
      if (!Number.isFinite(level)) {
        // Base `tickets` listing is the single-ticket SKU; do not include in ticketBundles[].
        continue;
      }
      if (level < 1) continue;
      const packType = level - 1;
      ticketBundles.push({
        packType,
        quantity: Number(def.amount ?? 0),
        priceUsdCents: Number(def.priceUsdCents ?? 0),
        name: displayNameFromStockroomDef(def),
        description: String(def.description ?? ''),
      });
      continue;
    }
    // New schema: bundle offers with IDs like `ticket_pack_10`, lines include `tickets` × N.
    if (Number(def?.offerType) === 1) {
      const lowerOfferId = offerId.trim().toLowerCase();
      if (!lowerOfferId.startsWith('ticket_pack_')) continue;
      const qtyFromId = Number.parseInt(lowerOfferId.replace('ticket_pack_', ''), 10);
      const lineQty =
        (def.bundleLines ?? []).reduce((sum, line) => {
          const bk = String(line.balanceKey ?? line.balance_key ?? '').trim().toLowerCase();
          if (bk !== 'tickets') return sum;
          const n = typeof line.amount === 'number' ? line.amount : Number(line.amount ?? 0);
          return sum + (Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0);
        }, 0) || (Number.isFinite(qtyFromId) ? qtyFromId : 0);
      ticketBundles.push({
        packType: Math.max(1, Math.min(255, Math.max(1, lineQty))),
        quantity: Math.max(1, lineQty),
        priceUsdCents: Number(def.priceUsdCents ?? 0),
        name: displayNameFromStockroomDef(def),
        description: String(def.description ?? ''),
      });
      continue;
    }
    // Do not read generic offer ids here; tickets tab uses base `tickets`, optional leveled listings, and ticket_pack_* bundles.
    continue;
  }
  ticketBundles.sort((a, b) => a.packType - b.packType);
  return ticketBundles;
}

/** Fetch app config from platform. Packs/ticket bundles: Stockroom. minTokenBalance: Helm. Badge: discounts+thresholds from Aquifer (badge_discounts_thresholds), minting fee from Helm (badge_minting_fee). Regatta: app creation fee from Helm (regatta_creation_fee). Runs Stockroom, Helm, and Aquifer in parallel for lower latency. */
export async function fetchPlatformAppConfig(): Promise<{
  packs: Array<{ packType: number; priceUsdCents: number; games: number; name: string; description: string }>;
  ticketBundles: Array<{ packType: number; quantity: number; priceUsdCents: number; name: string; description: string }>;
  /** Raw Stockroom SKU map (source-of-truth for store pricing). Keys are SKU ids (e.g. credits, tickets, pack:1, starter_bundle). */
  stockroomOffers?: Record<string, StockroomOfferDef>;
  /** Minimum token balance to play (smallest unit). Undefined when not set. */
  minTokenBalance?: number;
  /** Badge config (discounts, thresholds, minting fee). Undefined when not set. */
  badgeConfig?: BadgeConfigFromPlatform;
  /** Tournament creation fee — app fee in USD cents. From Helm (regatta_creation_fee). Undefined when not set. */
  tournamentCreationFeeUsdCents?: number;
  /** Optional token-denominated source for tournament creation fee. */
  tournamentCreationFeeToken?: 'SUI' | 'MEWS' | 'USDC';
  tournamentCreationFeeTokenAmount?: number;
  configSource: 'platform' | 'none';
  /** Set when platform returned empty config (helps diagnose app_id / store match). */
  platformDebug?: PlatformAppConfigDebug;
} | null> {
  if (!isPlatformAppConfigEnabled()) return null;
  if (appConfigCache && Date.now() < appConfigCache.expiresAt) {
    return appConfigCache.value;
  }
  if (appConfigInFlight) {
    return appConfigInFlight;
  }
  appConfigInFlight = fetchPlatformAppConfigUncached();
  try {
    return await appConfigInFlight;
  } finally {
    appConfigInFlight = null;
  }
}

async function fetchPlatformAppConfigUncached(): Promise<{
  packs: Array<{ packType: number; priceUsdCents: number; games: number; name: string; description: string }>;
  ticketBundles: Array<{ packType: number; quantity: number; priceUsdCents: number; name: string; description: string }>;
  /** Raw Stockroom SKU map (source-of-truth for store pricing). Keys are SKU ids (e.g. credits, tickets, pack:1, starter_bundle). */
  stockroomOffers?: Record<string, StockroomOfferDef>;
  /** Minimum token balance to play (smallest unit). Undefined when not set. */
  minTokenBalance?: number;
  /** Badge config (discounts, thresholds, minting fee). Undefined when not set. */
  badgeConfig?: BadgeConfigFromPlatform;
  /** Tournament creation fee — app fee in USD cents. From Helm (regatta_creation_fee). Undefined when not set. */
  tournamentCreationFeeUsdCents?: number;
  /** Optional token-denominated source for tournament creation fee. */
  tournamentCreationFeeToken?: 'SUI' | 'MEWS' | 'USDC';
  tournamentCreationFeeTokenAmount?: number;
  configSource: 'platform' | 'none';
  /** Set when platform returned empty config (helps diagnose app_id / store match). */
  platformDebug?: PlatformAppConfigDebug;
} | null> {
  PlatformLogger.info('[APP_CONFIG] READ (game→platform API): corridor identity mode', {
    source: 'X-Corridor-Capability-Object-Id',
  });
  const base = getPlatformAppConfigUrl();
  const headers = platformAppConfigHeaders();
  const sentCapId = headers['X-Corridor-Capability-Object-Id'];
  if (!sentCapId) {
    PlatformLogger.warn('[APP_CONFIG] Not sending X-Corridor-Capability-Object-Id. Set CORRIDOR_CAPABILITY_OBJECT_ID or CORRIDOR_CAPABILITY_OBJECT_ID_TESTNET in game backend config/contracts.<network>.json so platform can look up by cap identity (credit packs may be empty otherwise).');
  }

  const stockroomUrl = `${base}/api/stockroom/offers`;
  const helmUrl = `${base}/api/helm`;

  const badgeDefinitionKey = getAppScopedBadgeDiscountsThresholdsKey();
  const [stockroomResult, helmResult, aquiferResult] = await Promise.all([
    fetch(stockroomUrl, { method: 'GET', headers })
      .then(async (res) => ({ res, data: await res.json().catch(() => null) }))
      .catch((e) => ({ res: null, data: null, error: e instanceof Error ? e.message : String(e) })),
    fetch(helmUrl, { method: 'GET', headers })
      .then(async (res) => ({ res, data: await res.json().catch(() => null) }))
      .catch((e) => ({ res: null, data: null, error: e instanceof Error ? e.message : String(e) })),
    platformMilestonesClient.getDefinition(badgeDefinitionKey).catch(() => ({ success: false as const, value: null })),
  ]);

  let packs: Array<{ packType: number; priceUsdCents: number; games: number; name: string; description: string }> = [];
  let ticketBundles: Array<{ packType: number; quantity: number; priceUsdCents: number; name: string; description: string }> = [];
  let stockroomOffers: Record<string, StockroomOfferDef> | undefined;
  let configSource: 'platform' | 'none' = 'platform';
  let platformDebug: PlatformAppConfigDebug | undefined;
  let config: Record<string, string> = {};

  if (stockroomResult.res && stockroomResult.data !== undefined && !('error' in stockroomResult)) {
    const { res: stockroomRes, data: stockroomData } = stockroomResult;
    if (stockroomRes.ok && stockroomData?.success && stockroomData.offers && typeof stockroomData.offers === 'object') {
      const offerMap = stockroomData.offers as Record<string, StockroomOfferDef>;
      stockroomOffers = offerMap;
      packs = packsFromStockroomOffers(offerMap);
      ticketBundles = ticketBundlesFromStockroomOffers(offerMap);
      if (packs.length > 0 || ticketBundles.length > 0) {
        PlatformLogger.info('[APP_CONFIG] Packs/ticket bundles loaded from Stockroom', { packCount: packs.length, ticketBundleCount: ticketBundles.length });
      }
    } else if (!stockroomRes.ok) {
      PlatformLogger.warn('[APP_CONFIG] Stockroom offers request failed; packs/ticket bundles will be empty', { status: stockroomRes.status });
    }
  } else {
    PlatformLogger.warn('[APP_CONFIG] Stockroom offers fetch error; packs/ticket bundles will be empty', { error: (stockroomResult as { error?: string }).error ?? 'unknown' });
  }

  if (helmResult.res && helmResult.data !== undefined && !('error' in helmResult)) {
    const { res, data } = helmResult;
    if (res.ok && data?.success) {
      config = (data.config ?? {}) as Record<string, string>;
      configSource = data.configSource === 'platform' ? 'platform' : 'none';
      platformDebug = data.debug as PlatformAppConfigDebug | undefined;
    }
  } else {
    PlatformLogger.warn('[APP_CONFIG] Helm config fetch failed; minTokenBalance/badgeConfig may be missing', { error: (helmResult as { error?: string }).error ?? 'unknown' });
  }

  try {
    const minTokenRaw = config.minTokenBalance ?? config.min_token_balance;
    let minTokenBalance: number | undefined;
    if (minTokenRaw != null) {
      const decoded = fromBase64(minTokenRaw);
      const n = Number(decoded);
      if (!Number.isNaN(n)) {
        minTokenBalance = n;
      } else {
        try {
          const j = JSON.parse(decoded) as { minTokenBalance?: number };
          if (typeof j.minTokenBalance === 'number') minTokenBalance = j.minTokenBalance;
        } catch {
          /* ignore */
        }
      }
    }

    let badgeConfig: BadgeConfigFromPlatform | undefined;
    const mintingFeeRaw = config[HELM_BADGE_MINTING_FEE_KEY];
    const upgradeFeeRaw = config[HELM_BADGE_UPGRADE_FEE_KEY];
    let aquiferPart: { storeDiscounts: number[]; gameplayDiscounts: number[]; thresholds: number[]; version: number } | null = null;
    let mintingFeeUsdCents: number | undefined;
    let upgradeFeeUsdCents: number | undefined;
    if (aquiferResult.success && aquiferResult.value) {
      try {
        const decoded = Buffer.from(aquiferResult.value, 'base64').toString('utf8');
        const parsed = JSON.parse(decoded) as { storeDiscounts?: number[]; gameplayDiscounts?: number[]; thresholds?: number[]; version?: number };
    // Only include badgeConfig when loaded from chain. No default minting fee; include mintingFeeUsdCents only when from Helm.
        if (Array.isArray(parsed.storeDiscounts) && Array.isArray(parsed.gameplayDiscounts) && Array.isArray(parsed.thresholds) && typeof parsed.version === 'number') {
          aquiferPart = {
            storeDiscounts: parsed.storeDiscounts,
            gameplayDiscounts: parsed.gameplayDiscounts,
            thresholds: parsed.thresholds,
            version: parsed.version,
          };
        }
      } catch {
        PlatformLogger.warn('[APP_CONFIG] Aquifer badge_discounts_and_thresholds parse failed; badge config may be partial', { key: badgeDefinitionKey });
      }
    } else {
      PlatformLogger.warn('[APP_CONFIG] Aquifer badge_discounts_and_thresholds unavailable; badge config may be partial', { key: badgeDefinitionKey });
    }
    if (mintingFeeRaw) {
      try {
        const decoded = fromBase64(mintingFeeRaw);
        const parsed = JSON.parse(decoded) as { mintingFeeUsdCents?: number };
        if (typeof parsed.mintingFeeUsdCents === 'number') mintingFeeUsdCents = parsed.mintingFeeUsdCents;
      } catch {
        const n = Number(fromBase64(mintingFeeRaw));
        if (!Number.isNaN(n)) mintingFeeUsdCents = n;
      }
    }
    if (upgradeFeeRaw) {
      try {
        const decoded = fromBase64(upgradeFeeRaw);
        const parsed = JSON.parse(decoded) as { upgradeFeeUsdCents?: number };
        if (typeof parsed.upgradeFeeUsdCents === 'number') upgradeFeeUsdCents = parsed.upgradeFeeUsdCents;
      } catch {
        const n = Number(fromBase64(upgradeFeeRaw));
        if (!Number.isNaN(n)) upgradeFeeUsdCents = n;
      }
    }
    if (aquiferPart) {
      badgeConfig = {
        ...aquiferPart,
        ...(typeof mintingFeeUsdCents === 'number' && { mintingFeeUsdCents }),
        ...(typeof upgradeFeeUsdCents === 'number' && { upgradeFeeUsdCents }),
      };
    }

    let tournamentCreationFeeUsdCents: number | undefined;
    let tournamentCreationFeeToken: 'SUI' | 'MEWS' | 'USDC' | undefined;
    let tournamentCreationFeeTokenAmount: number | undefined;
    const regattaFeeRaw = config[HELM_REGATTA_CREATION_FEE_KEY];
    if (regattaFeeRaw) {
      try {
        const decoded = fromBase64(regattaFeeRaw);
        const parsed = JSON.parse(decoded) as {
          tournamentCreationFeeUsdCents?: number;
          tournamentCreationFeeToken?: 'SUI' | 'MEWS' | 'USDC';
          tournamentCreationFeeTokenAmount?: number;
        };
        if (typeof parsed.tournamentCreationFeeUsdCents === 'number') {
          tournamentCreationFeeUsdCents = parsed.tournamentCreationFeeUsdCents;
        } else if (
          (parsed.tournamentCreationFeeToken === 'SUI' || parsed.tournamentCreationFeeToken === 'MEWS' || parsed.tournamentCreationFeeToken === 'USDC') &&
          typeof parsed.tournamentCreationFeeTokenAmount === 'number' &&
          parsed.tournamentCreationFeeTokenAmount >= 0
        ) {
          tournamentCreationFeeToken = parsed.tournamentCreationFeeToken;
          tournamentCreationFeeTokenAmount = parsed.tournamentCreationFeeTokenAmount;
          const pricesResult = await priceConverter.getTokenPrices();
          if (pricesResult.success && pricesResult.prices) {
            const price =
              tournamentCreationFeeToken === 'SUI'
                ? pricesResult.prices.sui
                : tournamentCreationFeeToken === 'MEWS'
                  ? pricesResult.prices.mews
                  : pricesResult.prices.usdc;
            if (typeof price === 'number' && price > 0) {
              tournamentCreationFeeUsdCents = Math.round(tournamentCreationFeeTokenAmount * price * 100);
            }
          }
        }
      } catch {
        const n = Number(fromBase64(regattaFeeRaw));
        if (!Number.isNaN(n)) tournamentCreationFeeUsdCents = n;
      }
    }

    const result: NonNullable<PlatformAppConfigResult> = {
      packs,
      ticketBundles,
      ...(stockroomOffers && { stockroomOffers }),
      ...(minTokenBalance !== undefined && { minTokenBalance }),
      ...(badgeConfig && { badgeConfig }),
      ...(tournamentCreationFeeUsdCents !== undefined && { tournamentCreationFeeUsdCents }),
      ...(tournamentCreationFeeToken !== undefined && { tournamentCreationFeeToken }),
      ...(tournamentCreationFeeTokenAmount !== undefined && { tournamentCreationFeeTokenAmount }),
      configSource,
      ...(platformDebug && { platformDebug }),
    };
    appConfigCache = { value: result, expiresAt: Date.now() + APP_CONFIG_CACHE_TTL_MS };
    return result;
  } catch {
    return null;
  }
}

/** Corridor only: do not send X-Ecosystem-Id or X-App-Id; platform derives identity from the cap. */
function platformAppConfigHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const apiKey = getPlatformEcosystemApiKey();
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
    headers['X-Api-Key'] = apiKey;
  }
  const appCapId = getCorridorCapabilityObjectIdFromEnv();
  if (appCapId) {
    headers['X-Corridor-Capability-Object-Id'] = appCapId;
  }
  const corridorAdminCapId = getCorridorAdminCapabilityObjectIdFromEnv();
  if (corridorAdminCapId) {
    headers['X-Corridor-Admin-Capability-Object-Id'] = corridorAdminCapId;
  }
  return headers;
}

/** Build platform call options with identity-from-cap only (same shape as buildPlatformCallOptions). Used for Helm admin Channel/execute calls. */
function getPlatformCallOptionsForHelmAdmin(): {
  identityFromCapOnly: true;
  corridorCapabilityObjectId?: string;
  corridorAdminCapabilityObjectId?: string;
} {
  const corridorCapId = getCorridorCapabilityObjectIdFromEnv();
  const corridorAdminCapId = getCorridorAdminCapabilityObjectIdFromEnv();
  return {
    identityFromCapOnly: true,
    ...(corridorCapId ? { corridorCapabilityObjectId: corridorCapId } : {}),
    ...(corridorAdminCapId ? { corridorAdminCapabilityObjectId: corridorAdminCapId } : {}),
  };
}

/**
 * Set one credit/ticket pack as a Stockroom **item listing**, not an `offers`-table row.
 * packType 0 → `credits` base listing (no level) with balance_key `credits`.
 * packType 1–9 → `credits` with on-chain level packType+1 and balance_key `credits`.
 * packType ≥10 → `tickets` with level packType−9 and balance_key `tickets:l{level}`.
 */
export async function platformSetPack(body: {
  packType: number;
  priceUsdCents: number;
  games: number;
  name: string;
  description: string;
  provisionItemKey?: string;
}): Promise<{ success: boolean; digest?: string; error?: string }> {
  if (!isPlatformAppConfigEnabled()) {
    return { success: false, error: 'Platform app config not enabled' };
  }
  const corridorAdminCapId = getCorridorAdminCapabilityObjectIdFromEnv();
  if (!corridorAdminCapId?.startsWith('0x')) {
    return { success: false, error: 'App config write requires Channel. Set CORRIDOR_ADMIN_CAP_OBJECT_ID (or _TESTNET/_MAINNET) in game backend config/contracts.<network>.json.' };
  }
  const provision =
    body.provisionItemKey?.trim() ||
    (body.packType >= 10 ? 'tickets' : 'credits');
  const itemKey = toDynamicProvisionKey(provision);
  const level =
    itemKey === 'credits' && body.packType === 0
      ? undefined
      : body.packType >= 10
        ? body.packType - 9
        : body.packType + 1;
  if (level !== undefined) {
    if (!Number.isFinite(level) || level < 1 || level > 255) {
      return { success: false, error: 'Invalid packType for item listing' };
    }
  }
  const balanceKey =
    itemKey === 'credits'
      ? 'credits'
      : level === undefined
        ? itemKey
        : `${itemKey}:l${level}`;
  return platformSetStockroomItemListing({
    itemKey,
    ...(level !== undefined ? { level } : {}),
    priceUsdCents: Math.round(body.priceUsdCents),
    description: body.description,
    balanceKey,
    creditAmount: Math.max(1, Math.floor(body.games)),
    maxSupply: 0,
    active: true,
    additionalData: JSON.stringify({ name: body.name, packType: body.packType }),
  });
}

/** Set any Stockroom offer via Channel (Corridor admin cap). Type 1 = bundle: pass bundleLines. */
export async function platformSetStockroomOffer(body: {
  offerId: string;
  offerType: number;
  amount: number;
  priceUsdCents: number;
  description: string;
  additionalData?: string;
  maxSupply?: number;
  provisionItemKey?: string;
  active?: boolean;
  bundleLines?: Array<{ balanceKey: string; amount: number }>;
}): Promise<{ success: boolean; digest?: string; error?: string }> {
  if (!isPlatformAppConfigEnabled()) {
    return { success: false, error: 'Platform app config not enabled' };
  }
  const adminWallet = getAdminWalletService();
  const adminWalletAddress = adminWallet.getAddress();
  const corridorAdminCapId = getCorridorAdminCapabilityObjectIdFromEnv();
  const platformOptions = getPlatformCallOptionsForHelmAdmin();

  if (!corridorAdminCapId?.startsWith('0x')) {
    return { success: false, error: 'Stockroom write requires Channel. Set CORRIDOR_ADMIN_CAP_OBJECT_ID (or _TESTNET/_MAINNET) in game backend config/contracts.<network>.json.' };
  }

  try {
    const offerParams: Record<string, unknown> = {
      offerId: body.offerId,
      offerType: body.offerType,
      amount: body.amount,
      priceUsdCents: body.priceUsdCents,
      description: body.description,
      additionalData: body.additionalData || '',
      senderAddress: adminWalletAddress,
      corridorAdminCapId,
      maxSupply: body.maxSupply ?? 0,
      ...(body.provisionItemKey ? { provisionItemKey: body.provisionItemKey } : {}),
    };
    if (body.active !== undefined && body.active !== null) {
      offerParams.active = body.active;
    }
    if (body.offerType === 1 && body.bundleLines && body.bundleLines.length > 0) {
      offerParams.bundleLines = body.bundleLines;
    }
    const build = await buildBatchViaChannel(
      {
        operations: [
          {
            operationId: 'stockroom-admin-set-offer',
            params: offerParams,
          },
        ],
      },
      platformOptions
    );
    if (!build.success || !build.transactions?.[0]) {
      return { success: false, error: build.errors?.[0] ?? build.error ?? 'Channel build failed' };
    }
    const signed = await adminWallet.getKeypair().signTransaction(Buffer.from(build.transactions[0], 'base64'));
    const result = await platformTxClient.executeSigned(
      { transactionBytesBase64: build.transactions[0], signature: signed.signature },
      platformOptions
    );
    if (!result.success) return { success: false, error: result.error ?? 'Transaction failed' };
    invalidatePlatformAppConfigCache();
    const readClient = getSonarClient();
    await readClient.waitForTransaction({ digest: result.digest!, timeout: 15_000, pollInterval: 500 });
    return { success: true, digest: result.digest };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg };
  }
}

/** Set Stockroom item SKU (catalog key × level) — not a bundle offer row. */
export async function platformSetStockroomItemListing(body: {
  itemKey: string;
  /** Optional. When omitted, platform treats as base listing (no level). */
  level?: number;
  priceUsdCents: number;
  description: string;
  balanceKey: string;
  creditAmount?: number;
  maxSupply?: number;
  active?: boolean;
  additionalData?: string;
}): Promise<{ success: boolean; digest?: string; error?: string }> {
  if (!isPlatformAppConfigEnabled()) {
    return { success: false, error: 'Platform app config not enabled' };
  }
  const adminWallet = getAdminWalletService();
  const adminWalletAddress = adminWallet.getAddress();
  const corridorAdminCapId = getCorridorAdminCapabilityObjectIdFromEnv();
  const platformOptions = getPlatformCallOptionsForHelmAdmin();

  if (!corridorAdminCapId?.startsWith('0x')) {
    return { success: false, error: 'Stockroom write requires Channel. Set CORRIDOR_ADMIN_CAP_OBJECT_ID in game backend config/contracts.<network>.json.' };
  }

  try {
    const build = await buildBatchViaChannel(
      {
        operations: [
          {
            operationId: 'stockroom-admin-set-item-listing',
            params: {
              itemKey: body.itemKey,
              ...(typeof body.level === 'number' && Number.isFinite(body.level)
                ? { level: Math.trunc(body.level) }
                : {}),
              priceUsdCents: body.priceUsdCents,
              description: body.description,
              balanceKey: body.balanceKey,
              creditAmount: body.creditAmount ?? 1,
              maxSupply: body.maxSupply ?? 0,
              active: body.active !== false,
              additionalData: body.additionalData || '',
              senderAddress: adminWalletAddress,
              corridorAdminCapId,
            },
          },
        ],
      },
      platformOptions
    );
    if (!build.success || !build.transactions?.[0]) {
      return { success: false, error: build.errors?.[0] ?? build.error ?? 'Channel build failed' };
    }
    const signed = await adminWallet.getKeypair().signTransaction(Buffer.from(build.transactions[0], 'base64'));
    const result = await platformTxClient.executeSigned(
      { transactionBytesBase64: build.transactions[0], signature: signed.signature },
      platformOptions
    );
    if (!result.success) return { success: false, error: result.error ?? 'Transaction failed' };
    invalidatePlatformAppConfigCache();
    const readClient = getSonarClient();
    await readClient.waitForTransaction({ digest: result.digest!, timeout: 15_000, pollInterval: 500 });
    return { success: true, digest: result.digest };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg };
  }
}

/** Replace Stockroom on-chain catalog order (authoritative store/admin ordering). */
export async function platformSetStockroomCatalogOrder(body: {
  offerOrder: string[];
}): Promise<{ success: boolean; digest?: string; error?: string }> {
  if (!isPlatformAppConfigEnabled()) {
    return { success: false, error: 'Platform app config not enabled' };
  }
  const adminWallet = getAdminWalletService();
  const adminWalletAddress = adminWallet.getAddress();
  const corridorAdminCapId = getCorridorAdminCapabilityObjectIdFromEnv();
  const platformOptions = getPlatformCallOptionsForHelmAdmin();

  if (!corridorAdminCapId?.startsWith('0x')) {
    return { success: false, error: 'Stockroom write requires Channel. Set CORRIDOR_ADMIN_CAP_OBJECT_ID in game backend config/contracts.<network>.json.' };
  }
  const offerOrder = Array.isArray(body.offerOrder) ? body.offerOrder.map((s) => String(s ?? '').trim()).filter(Boolean) : [];
  if (offerOrder.length === 0) return { success: false, error: 'offerOrder must be a non-empty string[]' };

  try {
    const build = await buildBatchViaChannel(
      {
        operations: [
          {
            operationId: 'stockroom-admin-set-catalog-order',
            params: {
              offerOrder,
              senderAddress: adminWalletAddress,
              corridorAdminCapId,
            },
          },
        ],
      },
      platformOptions
    );
    if (!build.success || !build.transactions?.[0]) {
      return { success: false, error: build.errors?.[0] ?? build.error ?? 'Channel build failed' };
    }
    const signed = await adminWallet.getKeypair().signTransaction(Buffer.from(build.transactions[0], 'base64'));
    const result = await platformTxClient.executeSigned(
      { transactionBytesBase64: build.transactions[0], signature: signed.signature },
      platformOptions
    );
    if (!result.success) return { success: false, error: result.error ?? 'Transaction failed' };
    invalidatePlatformAppConfigCache();
    const readClient = getSonarClient();
    await readClient.waitForTransaction({ digest: result.digest!, timeout: 15_000, pollInterval: 500 });
    return { success: true, digest: result.digest };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Toggle Stockroom bundle/legacy offer active. */
export async function platformSetStockroomOfferActive(body: { offerId: string; active: boolean }): Promise<{
  success: boolean;
  digest?: string;
  error?: string;
}> {
  if (!isPlatformAppConfigEnabled()) {
    return { success: false, error: 'Platform app config not enabled' };
  }
  const adminWallet = getAdminWalletService();
  const adminWalletAddress = adminWallet.getAddress();
  const corridorAdminCapId = getCorridorAdminCapabilityObjectIdFromEnv();
  const platformOptions = getPlatformCallOptionsForHelmAdmin();
  if (!corridorAdminCapId?.startsWith('0x')) {
    return { success: false, error: 'CorridorAdminCap not configured' };
  }
  try {
    const build = await buildBatchViaChannel(
      {
        operations: [
          {
            operationId: 'stockroom-admin-set-offer-active',
            params: {
              offerId: body.offerId,
              active: body.active,
              senderAddress: adminWalletAddress,
              corridorAdminCapId,
            },
          },
        ],
      },
      platformOptions
    );
    if (!build.success || !build.transactions?.[0]) {
      return { success: false, error: build.errors?.[0] ?? build.error ?? 'Channel build failed' };
    }
    const signed = await adminWallet.getKeypair().signTransaction(Buffer.from(build.transactions[0], 'base64'));
    const result = await platformTxClient.executeSigned(
      { transactionBytesBase64: build.transactions[0], signature: signed.signature },
      platformOptions
    );
    if (!result.success) return { success: false, error: result.error ?? 'Transaction failed' };
    invalidatePlatformAppConfigCache();
    const readClient = getSonarClient();
    await readClient.waitForTransaction({ digest: result.digest!, timeout: 15_000, pollInterval: 500 });
    return { success: true, digest: result.digest };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Toggle Stockroom item listing active (base or level). */
export async function platformSetStockroomItemListingActive(body: {
  itemKey: string;
  level: number;
  active: boolean;
}): Promise<{ success: boolean; digest?: string; error?: string }> {
  if (!isPlatformAppConfigEnabled()) {
    return { success: false, error: 'Platform app config not enabled' };
  }
  const adminWallet = getAdminWalletService();
  const adminWalletAddress = adminWallet.getAddress();
  const corridorAdminCapId = getCorridorAdminCapabilityObjectIdFromEnv();
  const platformOptions = getPlatformCallOptionsForHelmAdmin();
  if (!corridorAdminCapId?.startsWith('0x')) {
    return { success: false, error: 'CorridorAdminCap not configured' };
  }
  try {
    const build = await buildBatchViaChannel(
      {
        operations: [
          {
            operationId: 'stockroom-admin-set-item-listing-active',
            params: {
              itemKey: body.itemKey,
              level: body.level,
              active: body.active,
              senderAddress: adminWalletAddress,
              corridorAdminCapId,
            },
          },
        ],
      },
      platformOptions
    );
    if (!build.success || !build.transactions?.[0]) {
      return { success: false, error: build.errors?.[0] ?? build.error ?? 'Channel build failed' };
    }
    const signed = await adminWallet.getKeypair().signTransaction(Buffer.from(build.transactions[0], 'base64'));
    const result = await platformTxClient.executeSigned(
      { transactionBytesBase64: build.transactions[0], signature: signed.signature },
      platformOptions
    );
    if (!result.success) return { success: false, error: result.error ?? 'Transaction failed' };
    invalidatePlatformAppConfigCache();
    const readClient = getSonarClient();
    await readClient.waitForTransaction({ digest: result.digest!, timeout: 15_000, pollInterval: 500 });
    return { success: true, digest: result.digest };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Remove one Stockroom offer row from the `offers` table (bundle or legacy type-0). */
export async function platformRemoveStockroomOffer(offerId: string): Promise<{ success: boolean; digest?: string; error?: string }> {
  const trimmed = typeof offerId === 'string' ? offerId.trim() : '';
  if (!trimmed) {
    return { success: false, error: 'offerId is required' };
  }
  if (!isPlatformAppConfigEnabled()) {
    return { success: false, error: 'Platform app config not enabled' };
  }
  const adminWallet = getAdminWalletService();
  const adminWalletAddress = adminWallet.getAddress();
  const corridorAdminCapId = getCorridorAdminCapabilityObjectIdFromEnv();
  const platformOptions = getPlatformCallOptionsForHelmAdmin();

  if (!corridorAdminCapId?.startsWith('0x')) {
    return { success: false, error: 'App config remove requires Channel. Set CORRIDOR_ADMIN_CAP_OBJECT_ID (or _TESTNET/_MAINNET) in game backend config/contracts.<network>.json.' };
  }
  try {
    const build = await buildBatchViaChannel(
      {
        operations: [
          {
            operationId: 'stockroom-admin-remove-offer',
            params: { offerId: trimmed, senderAddress: adminWalletAddress, corridorAdminCapId },
          },
        ],
      },
      platformOptions
    );
    if (!build.success || !build.transactions?.[0]) {
      return { success: false, error: build.errors?.[0] ?? build.error ?? 'Channel build failed' };
    }
    const signed = await adminWallet.getKeypair().signTransaction(Buffer.from(build.transactions[0], 'base64'));
    const result = await platformTxClient.executeSigned(
      { transactionBytesBase64: build.transactions[0], signature: signed.signature },
      platformOptions
    );
    if (!result.success) return { success: false, error: result.error ?? 'Transaction failed' };
    invalidatePlatformAppConfigCache();
    const readClient = getSonarClient();
    await readClient.waitForTransaction({ digest: result.digest!, timeout: 15_000, pollInterval: 500 });
    return { success: true, digest: result.digest };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg };
  }
}

/** Remove one item listing row (base or level). */
export async function platformRemoveStockroomItemListing(body: {
  itemKey: string;
  /** Optional. When omitted, removes base listing (no level). */
  level?: number;
}): Promise<{ success: boolean; digest?: string; error?: string }> {
  if (!isPlatformAppConfigEnabled()) {
    return { success: false, error: 'Platform app config not enabled' };
  }
  const adminWallet = getAdminWalletService();
  const adminWalletAddress = adminWallet.getAddress();
  const corridorAdminCapId = getCorridorAdminCapabilityObjectIdFromEnv();
  const platformOptions = getPlatformCallOptionsForHelmAdmin();
  if (!corridorAdminCapId?.startsWith('0x')) {
    return { success: false, error: 'CorridorAdminCap not configured' };
  }
  try {
    const build = await buildBatchViaChannel(
      {
        operations: [
          {
            operationId: 'stockroom-admin-remove-item-listing',
            params: {
              itemKey: body.itemKey,
              ...(typeof body.level === 'number' && Number.isFinite(body.level)
                ? { level: Math.trunc(body.level) }
                : {}),
              senderAddress: adminWalletAddress,
              corridorAdminCapId,
            },
          },
        ],
      },
      platformOptions
    );
    if (!build.success || !build.transactions?.[0]) {
      return { success: false, error: build.errors?.[0] ?? build.error ?? 'Channel build failed' };
    }
    const signed = await adminWallet.getKeypair().signTransaction(Buffer.from(build.transactions[0], 'base64'));
    const result = await platformTxClient.executeSigned(
      { transactionBytesBase64: build.transactions[0], signature: signed.signature },
      platformOptions
    );
    if (!result.success) return { success: false, error: result.error ?? 'Transaction failed' };
    invalidatePlatformAppConfigCache();
    const readClient = getSonarClient();
    await readClient.waitForTransaction({ digest: result.digest!, timeout: 15_000, pollInterval: 500 });
    return { success: true, digest: result.digest };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Set one config key via platform (key-value). Uses Channel when corridor admin cap is set; otherwise platform API. */
export async function platformSetConfigKey(key: string, valueBase64: string): Promise<{ success: boolean; digest?: string; error?: string }> {
  if (!isPlatformAppConfigEnabled()) {
    return { success: false, error: 'Platform app config not enabled' };
  }
  const adminWallet = getAdminWalletService();
  const adminWalletAddress = adminWallet.getAddress();
  const corridorAdminCapId = getCorridorAdminCapabilityObjectIdFromEnv();
  const platformOptions = getPlatformCallOptionsForHelmAdmin();

  if (!corridorAdminCapId?.startsWith('0x')) {
    return { success: false, error: 'App config write requires Channel. Set CORRIDOR_ADMIN_CAP_OBJECT_ID (or _TESTNET/_MAINNET) in game backend config/contracts.<network>.json.' };
  }
  try {
    const build = await buildBatchViaChannel(
      {
        operations: [
          {
            operationId: 'app-config-set',
            params: { key, value: valueBase64, senderAddress: adminWalletAddress, corridorAdminCapId },
          },
        ],
      },
      platformOptions
    );
    if (!build.success || !build.transactions?.[0]) {
      return { success: false, error: build.errors?.[0] ?? build.error ?? 'Channel build failed' };
    }
    const signed = await adminWallet.getKeypair().signTransaction(Buffer.from(build.transactions[0], 'base64'));
    const result = await platformTxClient.executeSigned(
      { transactionBytesBase64: build.transactions[0], signature: signed.signature },
      platformOptions
    );
    if (!result.success) return { success: false, error: result.error ?? 'Transaction failed' };
    invalidatePlatformAppConfigCache();
    const client = getConfig().sui?.network === 'testnet' ? adminWallet.getTestnetClient() : adminWallet.getMainnetClient();
    const readClient = getSonarClient();
    await readClient.waitForTransaction({ digest: result.digest!, timeout: 15_000, pollInterval: 500 });
    return { success: true, digest: result.digest };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg };
  }
}

/** Set min token balance via platform app-config key "minTokenBalance" (Corridor only). */
export async function platformSetMinTokenBalance(minTokenBalance: number): Promise<{ success: boolean; digest?: string; error?: string }> {
  const valueBase64 = toBase64(JSON.stringify({ minTokenBalance }));
  return platformSetConfigKey('minTokenBalance', valueBase64);
}

/** Set badge discounts and thresholds in Aquifer (key badge_discounts_thresholds). Corridor only. */
export async function platformSetBadgeDiscountsThresholds(payload: {
  storeDiscounts: number[];
  gameplayDiscounts: number[];
  thresholds: number[];
  version: number;
}): Promise<{ success: boolean; digest?: string; error?: string }> {
  if (!isPlatformAppConfigEnabled()) {
    return { success: false, error: 'Platform app config not enabled' };
  }
  const adminWallet = getAdminWalletService();
  const adminWalletAddress = adminWallet.getAddress();
  const corridorAdminCapId = getCorridorAdminCapabilityObjectIdFromEnv();
  const platformOptions = getPlatformCallOptionsForHelmAdmin();
  if (!corridorAdminCapId?.startsWith('0x')) {
    return { success: false, error: 'Aquifer set requires Channel. Set CORRIDOR_ADMIN_CAP_OBJECT_ID (or _TESTNET/_MAINNET) in game backend config/contracts.<network>.json.' };
  }
  const valueBase64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
  const badgeDefinitionKey = getAppScopedBadgeDiscountsThresholdsKey();
  try {
    const build = await buildBatchViaChannel(
      {
        operations: [
          {
            operationId: 'aquifer-set-definition',
            params: {
              key: badgeDefinitionKey,
              value: valueBase64,
              corridorAdminCapabilityObjectId: corridorAdminCapId,
              senderAddress: adminWalletAddress,
            },
          },
        ],
      },
      platformOptions
    );
    if (!build.success || !build.transactions?.[0]) {
      return { success: false, error: build.errors?.[0] ?? build.error ?? 'Channel build failed' };
    }
    const signed = await adminWallet.getKeypair().signTransaction(Buffer.from(build.transactions[0], 'base64'));
    const result = await platformTxClient.executeSigned(
      { transactionBytesBase64: build.transactions[0], signature: signed.signature },
      platformOptions
    );
    if (!result.success) return { success: false, error: result.error ?? 'Transaction failed' };
    invalidatePlatformAppConfigCache();
    const readClient = getSonarClient();
    await readClient.waitForTransaction({ digest: result.digest!, timeout: 15_000, pollInterval: 500 });
    return { success: true, digest: result.digest };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Set badge minting fee in Helm (key badge_minting_fee). Corridor only. */
export async function platformSetBadgeMintingFee(mintingFeeUsdCents: number): Promise<{ success: boolean; digest?: string; error?: string }> {
  const valueBase64 = toBase64(JSON.stringify({ mintingFeeUsdCents }));
  return platformSetConfigKey(HELM_BADGE_MINTING_FEE_KEY, valueBase64);
}

/** Set badge upgrade game fee in Helm (key badge_upgrade_fee). Corridor only. */
export async function platformSetBadgeUpgradeFee(upgradeFeeUsdCents: number): Promise<{ success: boolean; digest?: string; error?: string }> {
  const valueBase64 = toBase64(JSON.stringify({ upgradeFeeUsdCents }));
  return platformSetConfigKey(HELM_BADGE_UPGRADE_FEE_KEY, valueBase64);
}

/** Set tournament (regatta) creation fee — app fee in USD cents — in Helm (key regatta_creation_fee). Corridor only. */
export async function platformSetTournamentCreationFee(
  fee:
    | { mode: 'usd'; tournamentCreationFeeUsdCents: number }
    | { mode: 'token'; tournamentCreationFeeToken: 'SUI' | 'MEWS' | 'USDC'; tournamentCreationFeeTokenAmount: number }
): Promise<{ success: boolean; digest?: string; error?: string }> {
  const payload =
    fee.mode === 'usd'
      ? { tournamentCreationFeeUsdCents: fee.tournamentCreationFeeUsdCents }
      : {
          tournamentCreationFeeToken: fee.tournamentCreationFeeToken,
          tournamentCreationFeeTokenAmount: fee.tournamentCreationFeeTokenAmount,
        };
  const valueBase64 = toBase64(JSON.stringify(payload));
  return platformSetConfigKey(HELM_REGATTA_CREATION_FEE_KEY, valueBase64);
}

/** Remove one pack: prefer **item SKU** row for this packType; fall back to legacy `offers` id (numeric string). */
export async function platformRemovePack(packType: number): Promise<{ success: boolean; digest?: string; error?: string }> {
  if (!Number.isFinite(packType)) {
    return { success: false, error: 'Invalid packType' };
  }
  if (packType >= 0 && packType <= 9) {
    const r = await platformRemoveStockroomItemListing({
      itemKey: toDynamicProvisionKey('credits'),
      level: packType + 1,
    });
    if (r.success) return r;
  } else if (packType >= 10) {
    const r = await platformRemoveStockroomItemListing({
      itemKey: toDynamicProvisionKey('tickets'),
      level: packType - 9,
    });
    if (r.success) return r;
  }
  return platformRemoveStockroomOffer(String(packType));
}
