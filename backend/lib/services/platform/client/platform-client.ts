// ==========================================
// Platform Backend API Client
// Utility for game backend to call platform backend APIs
// Uses env PLATFORM_BACKEND_URL, ECOSYSTEM_ID, APP_ID,
// ECOSYSTEM_<id>_APP_<app>_API_KEY (preferred) or ECOSYSTEM_<id>_API_KEY / API_KEY.
//
// Read-only chain access: games use this client only — POST api/sonar/batch (single-op or multi-op).
// Higher-level batching (e.g. terminal store-catalog, station tournament lists) is implemented on
// the platform so every app reuses the same routes and Sonar batch executor, not per-app batch logic.
// ==========================================

import { gzipSync, gunzipSync } from 'zlib';
import { toBase64 } from '@mysten/bcs';
import { isTransaction } from '@mysten/sui/transactions';
import { getConfig } from '@/config/config';
import { fetchPlatformAppConfig } from '@/lib/services/platform/app-config/platform-app-config';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { getHeader, normalizeHeaders } from '@/lib/http/headers';
import { getOrCreateRequestId, makeRequestId } from '@/lib/http/request-id';

/** Decode a definition value (base64): if gzip magic, gunzip then utf8; else base64→utf8. Backward compatible with uncompressed stored values. */
export function decodeDefinitionValue(base64: string): string {
  const buf = Buffer.from(base64, 'base64');
  if (buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b) {
    return gunzipSync(buf).toString('utf8');
  }
  return buf.toString('utf8');
}

/** Encode definition value for storage: gzip then base64 to reduce on-chain size and gas. */
export function encodeDefinitionValue(jsonString: string): string {
  return gzipSync(Buffer.from(jsonString, 'utf8')).toString('base64');
}

function normalizePlatformBackendBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

/**
 * Get the platform backend base URL from env only (no hardcoded production URL).
 * PLATFORM_BACKEND_URL, PLATFORM_APP_CONFIG_URL, API_BASE_URL, NEXT_PUBLIC_PLATFORM_BACKEND_URL.
 * Local dev defaults to http://localhost:3000 when unset. Production on Vercel must set env vars.
 */
export function getPlatformBackendUrl(): string {
  const fromEnv =
    (typeof process !== 'undefined' &&
      (process.env.PLATFORM_BACKEND_URL ||
        process.env.PLATFORM_APP_CONFIG_URL ||
        process.env.NEXT_PUBLIC_PLATFORM_BACKEND_URL ||
        process.env.API_BASE_URL)) ||
    (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_PLATFORM_BACKEND_URL);

  if (fromEnv) {
    return normalizePlatformBackendBaseUrl(fromEnv);
  }

  // Client-side on localhost: default to local platform backend
  if (typeof window !== 'undefined') {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalhost) {
      return 'http://localhost:3000';
    }
  }

  // Server-side in development (no Vercel): default to local platform backend
  if (typeof process !== 'undefined' && (process.env.NODE_ENV === 'development' || !process.env.VERCEL)) {
    return 'http://localhost:3000';
  }

  return '';
}

/**
 * Options for platform backend calls. Every submission to the platform must include Corridor for proper routing; the platform requires it for every interaction.
 * - corridorCapabilityObjectId: from config file (contracts.<network>.json) when not passed; sent as X-Corridor-Capability-Object-Id. Required for all calls.
 * - corridorAdminCapabilityObjectId: for admin-only routes (e.g. regatta/create, execute-vault-release, catalog build). From config file or pass here.
 * - senderAddress / adminWalletAddress: wallet that will sign when platform returns a tx (e.g. add-credits). Sent as senderAddress to platform.
 * Identity is from corridor cap only (X-Corridor-Capability-Object-Id); do not pass ecosystemId or appId.
 */
export type CallPlatformBackendOptions = RequestInit & {
  /** @deprecated Not sent; identity from corridor cap only. */
  ecosystemId?: string;
  /** @deprecated Not sent; identity from corridor cap only. */
  appId?: string;
  corridorCapabilityObjectId?: string;
  corridorAdminCapabilityObjectId?: string;
  /** Signer when platform returns a tx to sign. Sent as senderAddress to platform. */
  senderAddress?: string;
  /** @deprecated Use senderAddress. Still supported; sent as senderAddress to platform. */
  adminWalletAddress?: string;
  identityFromCapOnly?: boolean;
  /**
   * Which env API key to send. Default `app` matches platform `requireApiKey` / `verifyApiKeyForEcosystemApp`
   * (expects app-scoped key when configured). Use `ecosystem` only for routes that call `verifyApiKeyForEcosystem`.
   */
  apiKeyScope?: 'app' | 'ecosystem';
};

/** Stripped before fetch; used only for game-backend logging around Channel execute. */
export type ChannelExecuteSignedOptions = CallPlatformBackendOptions & {
  channelExecuteLogContext?: Record<string, string | number | boolean | null | undefined>;
};

/**
 * Prefer corridor cap(s) from the incoming request. This allows the *player/app* to supply its own CorridorCap,
 * instead of relying on server config defaults.
 */
export function getCorridorCapabilityObjectIdFromRequest(
  request?: Request | null,
  body?: { corridorCapabilityObjectId?: string } | null
): string | undefined {
  const h =
    request?.headers.get('x-corridor-capability-object-id') ||
    request?.headers.get('X-Corridor-Capability-Object-Id') ||
    '';
  if (h && h.trim().startsWith('0x')) return h.trim();
  const b = body?.corridorCapabilityObjectId;
  if (typeof b === 'string' && b.trim().startsWith('0x')) return b.trim();
  return undefined;
}

export function getCorridorAdminCapabilityObjectIdFromRequest(
  request?: Request | null,
  body?: { corridorAdminCapabilityObjectId?: string } | null
): string | undefined {
  const h =
    request?.headers.get('x-corridor-admin-capability-object-id') ||
    request?.headers.get('X-Corridor-Admin-Capability-Object-Id') ||
    '';
  if (h && h.trim().startsWith('0x')) return h.trim();
  const b = body?.corridorAdminCapabilityObjectId;
  if (typeof b === 'string' && b.trim().startsWith('0x')) return b.trim();
  return undefined;
}

/**
 * Corridor cap (CorridorCap) object ID. From config file only (config/contracts.<network>.json). Do not set in .env.
 */
export function getCorridorCapabilityObjectIdFromEnv(): string {
  const fromConfig = getConfig().contracts.corridorCapabilityObjectId?.trim();
  return fromConfig && fromConfig.startsWith('0x') ? fromConfig : '';
}

/**
 * Corridor admin cap (CorridorAdminCap) object ID. From config file only (config/contracts.<network>.json). Do not set in .env.
 */
export function getCorridorAdminCapabilityObjectIdFromEnv(): string {
  // Shooter-game backend config uses CORRIDOR_ADMIN_CAP_OBJECT_ID_*; it's mapped to old "appAdminCapId" in typed config.
  // Keep backwards compatibility with both field names.
  const cfg = getConfig().contracts as { appAdminCapId?: string; corridorAdminCapObjectId?: string };
  const fromConfig = (cfg.corridorAdminCapObjectId ?? cfg.appAdminCapId ?? '').trim();
  return fromConfig && fromConfig.startsWith('0x') ? fromConfig : '';
}

/**
 * Old corridor admin cap from contract config (config/contracts.<network>.json).
 * Used by admin vault release when contract selection is "old".
 */
export function getOldCorridorAdminCapabilityObjectIdFromEnv(): string {
  const v = getConfig().contracts.oldCorridorAdminCapObjectId?.trim();
  return v && v.startsWith('0x') ? v : '';
}

/**
 * App/ecosystem identity from env (generated keys). Only this backend knows these values; frontend never sees them.
 * Returns empty string when not set — callPlatformBackend will fail with a clear error instead of using defaults.
 * Set in .env, e.g.:
 *   APP_ID=<generated key>        # e.g. openssl rand -hex 16 or UUID
 *   ECOSYSTEM_ID=<generated key>  # e.g. openssl rand -hex 16 or UUID
 */
export function getAppIdFromEnv(): string {
  const v = typeof process !== 'undefined' && process.env.APP_ID?.trim();
  return v ? v.toLowerCase() : '';
}

export function getEcosystemIdFromEnv(): string {
  const v = typeof process !== 'undefined' && process.env.ECOSYSTEM_ID?.trim();
  return v ? v.toLowerCase() : '';
}

const MISSING_ECOSYSTEM_MESSAGE =
  'ECOSYSTEM_ID must be set in .env for platform calls (read and write).';
const MISSING_APP_MESSAGE =
  'APP_ID must be set in .env for platform write operations. Generate a key (e.g. openssl rand -hex 16) and add it.';

/** Throws if ECOSYSTEM_ID is missing. */
export function requireEcosystemId(): void {
  if (!getEcosystemIdFromEnv()) throw new Error(MISSING_ECOSYSTEM_MESSAGE);
}

/** Throws if APP_ID or ECOSYSTEM_ID are missing (for writes). */
export function requirePlatformIds(): void {
  if (!getEcosystemIdFromEnv()) throw new Error(MISSING_ECOSYSTEM_MESSAGE);
  if (!getAppIdFromEnv()) throw new Error(MISSING_APP_MESSAGE);
}

/** True when ECOSYSTEM_ID and APP_ID are set (platform calls will use env for identity). */
export function isPlatformConfigured(): boolean {
  return Boolean(getEcosystemIdFromEnv() && getAppIdFromEnv());
}

function normalizeEnvId(id: string): string {
  return id.trim().replace(/-/g, '_');
}

/**
 * Get the platform API key for an ecosystem (for X-API-Key when calling the platform).
 * Uses env only: ECOSYSTEM_<id>_API_KEY for that ecosystem, or API_KEY / ADMIN_API_KEY when ecosystem id is empty (single-tenant).
 */
export function getApiKeyForEcosystem(ecosystemId: string): string | undefined {
  if (typeof process === 'undefined') return undefined;
  const id = (ecosystemId ?? '').trim().toLowerCase();
  if (id) {
    const keysToTry = [
      `ECOSYSTEM_${normalizeEnvId(id.toUpperCase())}_API_KEY`,
      `ECOSYSTEM_${normalizeEnvId(id)}_API_KEY`,
    ];
    for (const envKey of keysToTry) {
      const perEco = process.env[envKey];
      if (perEco != null && perEco !== '') return perEco;
    }
    return undefined;
  }
  try {
    const key = getConfig().security.apiKey;
    if (key && key !== '') return key;
  } catch { /* ignore */ }
  return process.env.ADMIN_API_KEY || process.env.API_KEY || undefined;
}

/**
 * API key for corridor-scoped platform routes. Prefers ECOSYSTEM_<eco>_APP_<app>_API_KEY, then
 * ECOSYSTEM_<eco>_API_KEY. Matches platform `getApiKeyForEcosystemApp` / `requireApiKey`.
 * Required for app-only routes (`verifyAppScopedApiKeyOnly`: Anchor, Helm writes, Terminal purchase, Regatta enter, Reservoir balance, etc.).
 */
export function getApiKeyForEcosystemApp(ecosystemId: string, appId: string): string | undefined {
  if (typeof process === 'undefined') return undefined;
  const eco = (ecosystemId ?? '').trim().toLowerCase();
  if (!eco) return undefined;
  if (!(appId ?? '').trim()) return getApiKeyForEcosystem(eco);
  const app = appId.trim().toLowerCase();
  const keysToTry = [
    `ECOSYSTEM_${normalizeEnvId(eco.toUpperCase())}_APP_${normalizeEnvId(app.toUpperCase())}_API_KEY`,
    `ECOSYSTEM_${normalizeEnvId(eco)}_APP_${normalizeEnvId(app)}_API_KEY`,
  ];
  for (const envKey of keysToTry) {
    const perApp = process.env[envKey];
    if (perApp != null && perApp !== '') return perApp;
  }
  return getApiKeyForEcosystem(eco);
}

/** Resolve X-API-Key for outbound platform calls (default: app-scoped). */
export function getPlatformApiKeyForCall(options?: { apiKeyScope?: 'app' | 'ecosystem' }): string | undefined {
  const scope = options?.apiKeyScope ?? 'app';
  const ecoId = getEcosystemIdFromEnv();
  if (scope === 'ecosystem') return getApiKeyForEcosystem(ecoId);
  return getApiKeyForEcosystemApp(ecoId, getAppIdFromEnv());
}

/**
 * Make a request to the platform backend. Identity is corridor-only: we send X-Corridor-Capability-Object-Id
 * (and X-Corridor-Admin-Capability-Object-Id when required). We do not send X-Ecosystem-Id or X-App-Id;
 * the platform derives ecosystem/app from the cap. Sends X-API-Key from env (app-scoped when configured).
 */
export async function callPlatformBackend<T = any>(
  path: string,
  options: CallPlatformBackendOptions = {}
): Promise<T> {
  const baseUrl = getPlatformBackendUrl();
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  const url = `${baseUrl}/${cleanPath}`;

  const { ecosystemId: _eco, appId: _app, ...init } = options;
  const initHeadersObj = normalizeHeaders(init.headers);
  const { 'X-Ecosystem-Id': _xEco, 'X-App-Id': _xApp, ...restHeaders } = initHeadersObj;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...restHeaders,
  };
  if (!getHeader(headers, 'X-Request-Id')) {
    headers['X-Request-Id'] = makeRequestId();
  }

  // Corridor only: send Corridor cap (+ optional admin cap) and API key. Platform derives ecosystem/app from the cap. Do not send X-Ecosystem-Id or X-App-Id.
  const appCapFromOptions = Boolean((options as CallPlatformBackendOptions).corridorCapabilityObjectId);
  const appCapId = (options as CallPlatformBackendOptions).corridorCapabilityObjectId ?? getCorridorCapabilityObjectIdFromEnv();
  if (!appCapId) {
    PlatformLogger.error('[CORRIDOR] Missing CorridorCap for platform call', {
      path: cleanPath,
      method: (init as RequestInit)?.method ?? 'GET',
      baseUrl,
      source: appCapFromOptions ? 'options' : 'config',
      configCapPresent: Boolean(getCorridorCapabilityObjectIdFromEnv()),
    });
    throw new Error('Platform calls require corridorCapabilityObjectId (set CORRIDOR_CAPABILITY_OBJECT_ID_* in config/contracts.<network>.json).');
  }
  headers['X-Corridor-Capability-Object-Id'] = appCapId;
  const adminCapFromOptions = Boolean((options as CallPlatformBackendOptions).corridorAdminCapabilityObjectId);
  const adminCapId = (options as CallPlatformBackendOptions).corridorAdminCapabilityObjectId ?? getCorridorAdminCapabilityObjectIdFromEnv();
  if (adminCapId) headers['X-Corridor-Admin-Capability-Object-Id'] = adminCapId;
  const apiKeyScope = options.apiKeyScope ?? 'app';
  const apiKey = getPlatformApiKeyForCall({ apiKeyScope });
  if (apiKey) headers['X-API-Key'] = apiKey;

  // Detailed corridor logging (intermittent corridor routing issues).
  PlatformLogger.info('[CORRIDOR] Platform call headers resolved', {
    path: cleanPath,
    method: (init as RequestInit)?.method ?? 'GET',
    baseUrl,
    corridorCapabilityObjectId: appCapId,
    corridorCapabilitySource: appCapFromOptions ? 'options' : 'config',
    corridorAdminCapabilityObjectId: adminCapId || null,
    corridorAdminCapabilitySource: adminCapId ? (adminCapFromOptions ? 'options' : 'config') : null,
    apiKeyPresent: Boolean(apiKey),
    apiKeyScope,
    requestId: getHeader(headers, 'X-Request-Id') || null,
    headerKeys: Object.keys(headers),
  });

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const cause = (e as { cause?: unknown })?.cause;
    PlatformLogger.error('[CORRIDOR] Platform call fetch failed', {
      url,
      baseUrl,
      path: cleanPath,
      method: (init as RequestInit)?.method ?? 'GET',
      requestId: getHeader(headers, 'X-Request-Id') || null,
      error: msg,
      ...(cause ? { cause: String(cause) } : {}),
    });
    throw new Error(`Platform backend fetch failed for ${cleanPath}: ${msg}`);
  }

  if (!response.ok) {
    const errorText = await response.text();
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { error: errorText };
    }
    throw new Error(errorData.error || `Platform backend request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Extract ecosystem id from request. No default: returns '' when missing. Use getEcosystemIdFromEnv() for env value.
 */
export function getEcosystemIdFromRequest(
  request: Request,
  body?: { ecosystemId?: string; appId?: string }
): string {
  const h = request.headers.get('x-ecosystem-id') || request.headers.get('X-Ecosystem-Id') || '';
  if (h && h.trim()) return h.trim().toLowerCase();
  try {
    const u = new URL(request.url);
    const q = u.searchParams.get('ecosystemId');
    if (q && q.trim()) return q.trim().toLowerCase();
  } catch {
    /* ignore */
  }
  if (body?.ecosystemId != null && String(body.ecosystemId).trim()) {
    return String(body.ecosystemId).trim().toLowerCase();
  }
  return '';
}

/**
 * Extract app id from request. No default: returns '' when missing. Use getAppIdFromEnv() for env value.
 */
export function getAppIdFromRequest(
  request: Request,
  body?: { ecosystemId?: string; appId?: string }
): string {
  const h = request.headers.get('x-app-id') || request.headers.get('X-App-Id') || '';
  if (h && h.trim()) return h.trim().toLowerCase();
  try {
    const u = new URL(request.url);
    const q = u.searchParams.get('appId');
    if (q && q.trim()) return q.trim().toLowerCase();
  } catch {
    /* ignore */
  }
  if (body?.appId != null && String(body.appId).trim()) {
    return String(body.appId).trim().toLowerCase();
  }
  return '';
}

/**
 * Build platform options with only request/body overrides. Use when a route needs to pass
 * ecosystemId (or appId) from the request; otherwise omit options and callPlatformBackend uses env.
 */
export function getPlatformOptionsFromRequest(
  request?: Request | null,
  body?: { ecosystemId?: string; appId?: string } | null
): Partial<CallPlatformBackendOptions> {
  const ecosystemId = request ? getEcosystemIdFromRequest(request, body ?? undefined)?.trim() : '';
  const appId = request ? getAppIdFromRequest(request, body ?? undefined)?.trim() : '';
  const opts: Partial<CallPlatformBackendOptions> = {};
  if (ecosystemId) opts.ecosystemId = ecosystemId;
  if (appId) opts.appId = appId;
  return opts;
}

/**
 * Single place for all routes to build options for platform calls. Use this for every route that
 * calls the platform so identity is corridor-only (platform derives ecosystem/app from the cap).
 * Do not send ecosystemId or appId; send only corridor cap(s) and API key.
 * - corridorCapabilityObjectId from env when set
 * - Any route-specific extra (adminWalletAddress, corridorAdminCapabilityObjectId, contract, etc.) via third argument
 * Example: platformGamePassClient.getGamePassStatus(addr, buildPlatformCallOptions(request, undefined, { contract: 'new' }))
 */
export function buildPlatformCallOptions(
  request?: Request | null,
  _body?: { ecosystemId?: string; appId?: string; [k: string]: unknown } | null,
  extra?: Partial<CallPlatformBackendOptions> & { contract?: string }
): Partial<CallPlatformBackendOptions> & { contract?: string } {
  const body = (_body ?? null) as { corridorCapabilityObjectId?: string; corridorAdminCapabilityObjectId?: string } | null;
  const appCapId = getCorridorCapabilityObjectIdFromRequest(request, body) ?? (getCorridorCapabilityObjectIdFromEnv() || undefined);
  const adminCapId = getCorridorAdminCapabilityObjectIdFromRequest(request, body) ?? undefined;
  const requestId = getOrCreateRequestId(request);
  return {
    ...(appCapId ? { corridorCapabilityObjectId: appCapId } : {}),
    ...(adminCapId ? { corridorAdminCapabilityObjectId: adminCapId } : {}),
    ...(requestId ? { headers: { 'X-Request-Id': requestId } } : {}),
    ...extra,
  };
}

/**
 * Catalog build overrides. Platform supplies PROVISIONS_PACKAGE_ID_* and PROVISIONS_REGISTRY_ID_* from platform contract config (JSON).
 * Game: CORRIDOR_ADMIN_CAP_OBJECT_ID_* in config/contracts.<network>.json. Do not send catalogPackageId/catalogRegistryId
 * (would override with game package and cause "No module found with module name provisions").
 * Catalog build requires CorridorAdminCap only (Move expects &CorridorAdminCap). We do not fall back to CorridorCap
 * (CORRIDOR_CAPABILITY_OBJECT_ID_*) here—using a CorridorCap object ID causes TypeMismatch on arg 0.
 */
export function getCatalogBuildOverrides(): {
  catalogPackageId?: string;
  catalogRegistryId?: string;
  catalogAdminCapId?: string;
} {
  const capId = (getCorridorAdminCapabilityObjectIdFromEnv() || getConfig().contracts.appAdminCapId || getConfig().contracts.provisionsAdminCap || '').trim();
  if (!capId || !capId.startsWith('0x')) return {};
  return { catalogAdminCapId: capId };
}

type ReservoirStatusShape = {
  success: boolean;
  hasPass?: boolean;
  balance?: number;
  gamesRemaining?: number;
  isActive?: boolean;
  packType?: number;
  ticketCount?: number;
  itemCount?: number;
  error?: string;
};

export function mergeTicketUnitsIntoReservoirStatus(
  status: ReservoirStatusShape,
  ticketUnits: { success: boolean; tickets?: Array<unknown>; error?: string }
): void {
  if (!ticketUnits.success || !Array.isArray(ticketUnits.tickets)) return;
  const unitsCount = ticketUnits.tickets.length;
  const reportedCount =
    typeof status.ticketCount === 'number'
      ? status.ticketCount
      : typeof status.itemCount === 'number'
        ? status.itemCount
        : 0;
  status.ticketCount = Math.max(reportedCount, unitsCount);
  console.log('[TICKET-FLOW] merge ticket-units into reservoir status', {
    unitsCount,
    reportedCount,
    finalTicketCount: status.ticketCount,
  });
}

/**
 * Parallel reservoir + ticket-units (+ optional holdings) for menu/store batching.
 * Holdings failure is non-fatal (returns success: false shape).
 */
export async function fetchReservoirBundleFromPlatform(
  playerAddress: string,
  options?: CallPlatformBackendOptions & { contract?: string; includeHoldings?: boolean }
): Promise<{
  reservoir: ReservoirStatusShape;
  ticketUnits: { success: boolean; tickets?: Array<unknown>; error?: string };
  holdings?: { success: boolean; address?: string; inventory?: Record<string, number>; error?: string };
}> {
  const { contract, includeHoldings, ...rest } = options ?? {};
  const reservoirPath = contract
    ? `api/reservoir/${playerAddress}?contract=${encodeURIComponent(contract)}`
    : `api/reservoir/${playerAddress}`;
  const holdingsPath = contract
    ? `api/reservoir/holdings/${playerAddress}?contract=${encodeURIComponent(contract)}`
    : `api/reservoir/holdings/${playerAddress}`;
  const ticketPath = `api/reservoir/ticket-units/${playerAddress}`;

  const [reservoir, ticketUnits, holdings] = await Promise.all([
    callPlatformBackend(reservoirPath, { method: 'GET', ...rest }) as Promise<ReservoirStatusShape>,
    callPlatformBackend(ticketPath, { method: 'GET', ...rest }).catch((err) => {
      console.log('[TICKET-FLOW] ticket-units parallel fetch failed', { error: err instanceof Error ? err.message : String(err) });
      return { success: false as const, error: err instanceof Error ? err.message : String(err) };
    }) as Promise<{ success: boolean; tickets?: Array<unknown>; error?: string }>,
    includeHoldings
      ? (callPlatformBackend(holdingsPath, { method: 'GET', ...rest }).catch((err) => ({
          success: false as const,
          error: err instanceof Error ? err.message : String(err),
        })) as Promise<{ success: boolean; address?: string; inventory?: Record<string, number>; error?: string }>)
      : Promise.resolve(undefined as undefined),
  ]);

  return { reservoir, ticketUnits, holdings };
}

type GamePassStatusResult = {
  success: boolean;
  hasPass?: boolean;
  gamesRemaining?: number;
  isActive?: boolean;
  packType?: number;
  ticketCount?: number;
  error?: string;
};

function readPlayerSideCacheTtlMs(envName: string, fallback: number): number {
  const raw = typeof process !== 'undefined' ? process.env[envName] : undefined;
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Shared default for Hydroscope stats + game pass in-memory cache (milliseconds). */
const PLAYER_STATS_CACHE_TTL_MS = readPlayerSideCacheTtlMs('PLAYER_HYDROSCOPE_STATS_CACHE_TTL_MS', 30_000);
const PLAYER_GAME_PASS_CACHE_TTL_MS = readPlayerSideCacheTtlMs('PLAYER_GAME_PASS_CACHE_TTL_MS', PLAYER_STATS_CACHE_TTL_MS);

const playerGamePassCacheByKey = new Map<string, { at: number; value: GamePassStatusResult }>();
const playerGamePassInflightByKey = new Map<string, Promise<GamePassStatusResult>>();

export function invalidatePlayerGamePassCacheForAddress(address: string): void {
  const prefix = `${address.toLowerCase()}|`;
  for (const k of playerGamePassCacheByKey.keys()) {
    if (k.startsWith(prefix)) playerGamePassCacheByKey.delete(k);
  }
}

async function fetchGamePassStatusUncached(
  playerAddress: string,
  options?: CallPlatformBackendOptions & { contract?: string }
): Promise<GamePassStatusResult> {
  const { contract, ...rest } = options ?? {};
  const basePath = contract
    ? `api/reservoir/${playerAddress}?contract=${encodeURIComponent(contract)}`
    : `api/reservoir/${playerAddress}`;

  console.log('[TICKET-FLOW] platform getGamePassStatus: parallel reservoir + ticket-units', {
    path: basePath,
    playerAddress: playerAddress.slice(0, 10) + '...',
  });

  const [status, ticketUnits] = await Promise.all([
    callPlatformBackend(basePath, { method: 'GET', ...rest }) as Promise<ReservoirStatusShape>,
    callPlatformBackend(`api/reservoir/ticket-units/${playerAddress}`, { method: 'GET', ...rest }).catch((err) => {
      console.log('[TICKET-FLOW] platform ticket-units failed (parallel)', { error: err instanceof Error ? err.message : String(err) });
      return { success: false as const, error: err instanceof Error ? err.message : String(err) };
    }) as Promise<{ success: boolean; tickets?: Array<unknown>; error?: string }>,
  ]);

  console.log('[TICKET-FLOW] platform reservoir response', {
    success: status.success,
    balance: status.balance,
    itemCount: status.itemCount,
    ticketCount: status.ticketCount,
    hasPass: status.hasPass,
  });

  if (!status.success) {
    return status;
  }

  if (status.gamesRemaining === undefined && typeof status.balance === 'number') {
    status.gamesRemaining = status.balance;
  }

  mergeTicketUnitsIntoReservoirStatus(status, ticketUnits);

  if (status.ticketCount === undefined && typeof status.itemCount === 'number') {
    status.ticketCount = status.itemCount;
    console.log('[TICKET-FLOW] platform getGamePassStatus: fallback ticketCount from itemCount', { itemCount: status.itemCount });
  }

  console.log('[TICKET-FLOW] platform getGamePassStatus: returning', { ticketCount: status.ticketCount, gamesRemaining: status.gamesRemaining });
  return status;
}

/**
 * Game Pass API Client
 * Provides methods to call platform backend game pass APIs
 */
export const platformGamePassClient = {
  /**
   * Get game pass status for a player.
   * Pass options.ecosystemId for multi-ecosystem (sends X-Ecosystem-Id and uses that ecosystem's API key).
   * Pass options.contract ('new' | 'old' | 'both') to forward to platform.
   * Cached per address + corridor + contract (same TTL as Hydroscope stats; see PLAYER_GAME_PASS_CACHE_TTL_MS).
   */
  async getGamePassStatus(playerAddress: string, options?: CallPlatformBackendOptions & { contract?: string }): Promise<{
    success: boolean;
    hasPass?: boolean;
    gamesRemaining?: number;
    isActive?: boolean;
    packType?: number;
    ticketCount?: number;
    error?: string;
  }> {
    const { contract, ...rest } = options ?? {};
    const contractEff = contract ?? '';
    const effCap =
      (rest as CallPlatformBackendOptions | undefined)?.corridorCapabilityObjectId ??
      getCorridorCapabilityObjectIdFromEnv() ??
      '';
    const key = `${playerAddress.toLowerCase()}|${effCap}|${contractEff}`;
    const cached = playerGamePassCacheByKey.get(key);
    if (cached && Date.now() - cached.at < PLAYER_GAME_PASS_CACHE_TTL_MS) {
      return { ...cached.value };
    }
    if (cached) playerGamePassCacheByKey.delete(key);

    const existing = playerGamePassInflightByKey.get(key);
    if (existing) return existing;

    const promise = fetchGamePassStatusUncached(playerAddress, options)
      .then((mapped) => {
        if (mapped.success) {
          playerGamePassCacheByKey.set(key, { at: Date.now(), value: mapped });
        }
        return mapped;
      })
      .finally(() => {
        playerGamePassInflightByKey.delete(key);
      });

    playerGamePassInflightByKey.set(key, promise);
    return promise;
  },

  /**
   * List players with game passes. Supports server-side pagination when the platform accepts offset/limit.
   * Pass options.offset and options.limit to request a page; platform may return only that page and totalCount.
   */
  async listPlayers(
    options?: CallPlatformBackendOptions & { offset?: number; limit?: number }
  ): Promise<{
    success: boolean;
    players?: Array<{
      address: string;
      gamesRemaining: number;
      isActive: boolean;
      packType?: number;
      ticketCount?: number;
    }>;
    totalCount?: number;
    error?: string;
  }> {
    const { offset, limit, ...rest } = options ?? {};
    const q = new URLSearchParams();
    if (offset != null && Number.isFinite(offset)) q.set('offset', String(Math.max(0, offset)));
    if (limit != null && Number.isFinite(limit)) q.set('limit', String(Math.max(1, limit)));
    const path = q.toString() ? `api/admin/reservoir/list-players?${q.toString()}` : 'api/admin/reservoir/list-players';
    return callPlatformBackend(path, {
      method: 'GET',
      ...rest,
    });
  },

  /**
   * Admin: Add credits to a player's game pass.
   * Uses platform generic balance API. Pass options.ecosystemId for multi-ecosystem.
   */
  async adminAddCredits(playerAddress: string, amount: number, options?: CallPlatformBackendOptions): Promise<{
    success: boolean;
    digest?: string;
    gamesRemaining?: number;
    transactionBytesBase64?: string;
    message?: string;
    error?: string;
  }> {
    const signer = options?.senderAddress ?? options?.adminWalletAddress;
    const body: { playerAddress: string; amount: number; balanceKey?: string; senderAddress?: string } = { playerAddress, amount, balanceKey: 'credits' };
    if (signer) body.senderAddress = signer;
    return callPlatformBackend('api/reservoir/balance/add', {
      method: 'POST',
      body: JSON.stringify(body),
      ...options,
    });
  },

  /**
   * Admin: Set credits to a specific amount.
   * Uses platform generic balance API. Pass options.ecosystemId for multi-ecosystem.
   */
  async adminSetCredits(playerAddress: string, amount: number, options?: CallPlatformBackendOptions): Promise<{
    success: boolean;
    digest?: string;
    gamesRemaining?: number;
    transactionBytesBase64?: string;
    message?: string;
    error?: string;
  }> {
    const signer = options?.senderAddress ?? options?.adminWalletAddress;
    const body: { playerAddress: string; amount: number; balanceKey?: string; senderAddress?: string } = { playerAddress, amount, balanceKey: 'credits' };
    if (signer) body.senderAddress = signer;
    return callPlatformBackend('api/reservoir/balance/set', {
      method: 'POST',
      body: JSON.stringify(body),
      ...options,
    });
  },

  /**
   * Admin: Remove credits from a player's game pass.
   * Uses platform generic balance API. Pass options.ecosystemId for multi-ecosystem.
   */
  async adminRemoveCredits(playerAddress: string, amount: number, options?: CallPlatformBackendOptions): Promise<{
    success: boolean;
    digest?: string;
    gamesRemaining?: number;
    transactionBytesBase64?: string;
    message?: string;
    error?: string;
  }> {
    const signer = options?.senderAddress ?? options?.adminWalletAddress;
    const body: { playerAddress: string; amount: number; balanceKey?: string; senderAddress?: string } = { playerAddress, amount, balanceKey: 'credits' };
    if (signer) body.senderAddress = signer;
    return callPlatformBackend('api/reservoir/balance/remove', {
      method: 'POST',
      body: JSON.stringify(body),
      ...options,
    });
  },

  /**
   * Build unsigned purchase-pack transaction via Channel batch (`terminal-purchase-balance`).
   * Pass options.ecosystemId for multi-ecosystem. Returns first transaction from batch.
   */
  async buildPurchasePackTransaction(
    playerAddress: string,
    creditsAmount: number,
    priceUsdCents: number,
    paymentToken: 'SUI' | 'MEWS' | 'USDC',
    options?: CallPlatformBackendOptions & { badgeDiscount?: number; packType?: number; totalTokenAmount?: string }
  ): Promise<{
    success: boolean;
    transaction?: string;
    gasEstimate?: string;
    totalUSD?: string;
    originalTotalUSD?: string;
    discountApplied?: number;
    totalToken?: string;
    paymentToken?: string;
    packType?: number;
    creditsAmount?: number;
    playerAddress?: string;
    error?: string;
  }> {
    const totalTokenAmount = options?.totalTokenAmount ?? String(priceUsdCents / 100);
    const params: Record<string, unknown> = {
      playerAddress,
      amount: creditsAmount,
      pricePaidUsdCents: priceUsdCents,
      paymentToken,
      totalTokenAmount,
    };
    if (options?.packType != null) params.packType = options.packType;
    const batchRes = await callPlatformBackend('api/channel/batch', {
      method: 'POST',
      body: JSON.stringify({
        operations: [{ operationId: 'terminal-purchase-balance', params }],
      }),
      ...options,
    }) as { success?: boolean; transactions?: string[]; errors?: string[]; gasEstimateMist?: number };
    if (!batchRes.success || !batchRes.transactions?.length) {
      return { success: false, error: batchRes.errors?.[0] ?? 'Build failed' };
    }
    return {
      success: true,
      transaction: batchRes.transactions[0],
      gasEstimate: batchRes.gasEstimateMist?.toString(),
      creditsAmount,
      playerAddress,
      paymentToken,
    };
  },

  /**
   * Consume (spend) balance — builds unsigned tx. Separate from admin balance/remove.
   * Pass balanceKey (app-defined, e.g. "lives", "entries"). Caller signs and submits.
   */
  async consumeBalance(
    playerAddress: string,
    amount: number,
    balanceKey: string,
    options?: CallPlatformBackendOptions
  ): Promise<{
    success: boolean;
    digest?: string;
    transactionBytesBase64?: string;
    /** @deprecated Use transactionBytesBase64. Alias for backward compat. */
    transactionBytes?: string;
    message?: string;
    balance?: number;
    playerAddress?: string;
    error?: string;
  }> {
    const signer = options?.senderAddress ?? options?.adminWalletAddress;
    const body: { playerAddress: string; amount: number; balanceKey: string; senderAddress?: string } = {
      playerAddress,
      amount,
      balanceKey,
    };
    if (signer) body.senderAddress = signer;
    const res = await callPlatformBackend('api/reservoir/balance/consume', {
      method: 'POST',
      body: JSON.stringify(body),
      ...options,
    }) as { success: boolean; digest?: string; transactionBytesBase64?: string; message?: string; balance?: number; playerAddress?: string; error?: string };
    return {
      ...res,
      transactionBytes: res.transactionBytesBase64,
    };
  },

  /**
   * Admin: Add tournament tickets to a player. Identity from corridor cap only.
   */
  async adminAddTickets(
    playerAddress: string,
    quantity: number,
    valuePerTicketUsdCents?: number,
    options?: CallPlatformBackendOptions
  ): Promise<{ success: boolean; digest?: string; transactionBytesBase64?: string; message?: string; error?: string }> {
    const signer = options?.senderAddress ?? options?.adminWalletAddress;
    const body: { playerAddress: string; quantity: number; valuePerTicketUsdCents: number; senderAddress?: string } = {
      playerAddress,
      quantity,
      valuePerTicketUsdCents: valuePerTicketUsdCents ?? 0,
    };
    if (signer) body.senderAddress = signer;
    return callPlatformBackend('api/admin/reservoir/tickets/add', {
      method: 'POST',
      body: JSON.stringify(body),
      ...options,
    });
  },

  /**
   * Admin: Remove a tournament ticket from a player. Identity from corridor cap only.
   */
  async adminRemoveTicket(
    playerAddress: string,
    ticketId: number,
    options?: CallPlatformBackendOptions
  ): Promise<{ success: boolean; digest?: string; transactionBytesBase64?: string; message?: string; error?: string }> {
    const signer = options?.senderAddress ?? options?.adminWalletAddress;
    const body: { playerAddress: string; ticketId: number; senderAddress?: string } = { playerAddress, ticketId };
    if (signer) body.senderAddress = signer;
    return callPlatformBackend('api/admin/reservoir/tickets/remove', {
      method: 'POST',
      body: JSON.stringify(body),
      ...options,
    });
  },

  /**
   * Admin: Fix ticket count (set ticket_count to match actual table count). Identity from corridor cap only.
   */
  async fixTickets(
    playerAddress: string,
    correctCount: number,
    contract?: 'new' | 'old',
    options?: CallPlatformBackendOptions
  ): Promise<{ success: boolean; digest?: string; error?: string }> {
    return callPlatformBackend('api/admin/reservoir/fix-tickets', {
      method: 'POST',
      body: JSON.stringify({
        playerAddress,
        correctCount,
        ...(contract ? { contract } : {}),
      }),
      ...options,
    });
  },

  /**
   * Get reservoir status for a player (balance, itemCount).
   */
  async getReservoirStatus(
    playerAddress: string,
    options?: CallPlatformBackendOptions
  ): Promise<{ success: boolean; hasPass?: boolean; balance?: number; isActive?: boolean; itemCount?: number; error?: string }> {
    return callPlatformBackend(`api/reservoir/${encodeURIComponent(playerAddress)}`, {
      method: 'GET',
      ...options,
    }) as Promise<{ success: boolean; hasPass?: boolean; balance?: number; isActive?: boolean; itemCount?: number; error?: string }>;
  },

  /**
   * Get available ticket units for a player with value metadata. Use to pick highest-value ticket for tournament entry.
   * Platform: GET api/reservoir/ticket-units/[address].
   */
  async getAvailableTicketUnits(
    playerAddress: string,
    options?: CallPlatformBackendOptions
  ): Promise<{
    success: boolean;
    tickets?: Array<{ ticketId: number; valuePaidUsdCents: number; purchasedAt?: number }>;
    error?: string;
  }> {
    return callPlatformBackend(`api/reservoir/ticket-units/${encodeURIComponent(playerAddress)}`, {
      method: 'GET',
      ...options,
    });
  },
};

/**
 * Events API Client
 * List events (tournaments) from platform; platform has PLATFORM_WALLET for app registry.
 */
export const platformEventsClient = {
  /**
   * Get a single event by object ID. Use to obtain vaultId (event.poolVault?.vaultId or event.metadata?.vaultId) for Glacier calls.
   */
  async getEvent(
    eventObjectId: string,
    options?: CallPlatformBackendOptions
  ): Promise<{ success: boolean; event?: any; error?: string }> {
    return callPlatformBackend(`api/station/${eventObjectId}`, {
      method: 'GET',
      ...options,
    });
  },

  /**
   * Get events for an app (used by game to list tournaments without needing platform wallet in game backend).
   * Does not include past events; use getPastEvents for those to reduce load.
   *
   * Platform Station has separate upcoming vs active tables; pass `status` to target the table explicitly.
   * - status=upcoming → upcoming_events table
   * - status=active   → active_events table
   * - status=all/omit → both (upcoming + active)
   */
  /**
   * Get events. Identity from corridor cap (no appId/ecosystemId).
   */
  async getEvents(
    params?: { status?: 'upcoming' | 'active' | 'all' } & CallPlatformBackendOptions
  ): Promise<{ success: boolean; events?: any[]; error?: string }> {
    const status = params?.status;
    const q = new URLSearchParams();
    if (status && status !== 'all') q.set('status', status);
    const path = q.toString() ? `api/station?${q.toString()}` : 'api/station';
    return callPlatformBackend(path, {
      method: 'GET',
      ...params,
    });
  },

  async getUpcomingEvents(
    options?: CallPlatformBackendOptions
  ): Promise<{ success: boolean; events?: any[]; error?: string }> {
    return this.getEvents({ status: 'upcoming', ...(options ?? {}) });
  },

  async getActiveEvents(
    options?: CallPlatformBackendOptions
  ): Promise<{ success: boolean; events?: any[]; error?: string }> {
    return this.getEvents({ status: 'active', ...(options ?? {}) });
  },

  /**
   * Get past events (ended and moved to past_events). Identity from corridor cap.
   */
  async getPastEvents(
    limit: number = 50,
    options?: CallPlatformBackendOptions
  ): Promise<{ success: boolean; events?: any[]; error?: string }> {
    return callPlatformBackend(
      `api/station/past?limit=${Math.min(Math.max(1, limit), 200)}`,
      { method: 'GET', ...options }
    );
  },

  /**
   * Get event entries (participants who entered). Platform API: GET api/station/[id]/entries.
   */
  async getEventEntries(
    eventObjectId: string,
    options?: CallPlatformBackendOptions
  ): Promise<{ success: boolean; entries?: Array<{ participantAddress?: string; enteredAt?: number; entryData?: Record<string, unknown>; participant?: string }>; error?: string }> {
    return callPlatformBackend(`api/station/${eventObjectId}/entries`, {
      method: 'GET',
      ...options,
    });
  },

  /**
   * Get event submissions. Platform API: GET api/station/[id]/submissions.
   */
  async getSubmissions(
    eventObjectId: string,
    options?: CallPlatformBackendOptions
  ): Promise<{ success: boolean; submissions?: Array<{ participant: string; submissionData?: Record<string, unknown>; submittedAt?: number }>; error?: string }> {
    return callPlatformBackend(`api/station/${eventObjectId}/submissions`, {
      method: 'GET',
      ...options,
    });
  },

  /**
   * Prepare reward distribution for an ended event (leaderboard, rewards, vaultReleaseParams or closeVaultEmpty, item/credit tx(s)).
   * Sustain API. When vaultReleaseParams is present, call executeVaultRelease; when closeVaultEmpty is present, call glacier-release-vault-empty; then sign/submit transactions; then markRewardsDistributed.
   */
  async prepareDistribution(
    eventObjectId: string,
    options?: CallPlatformBackendOptions
  ): Promise<{
    success: boolean;
    event?: any;
    leaderboard?: any[];
    rewards?: any[];
    transactions?: Array<{ type: string; bytesBase64: string; recipientAddress: string; tokenType?: string; tokenAmount?: string; itemCount?: number; credits?: number }>;
    payerAddress?: string;
    vaultReleaseParams?: { vaultId: string; recipients: string[]; amounts: string[]; coinType: string; coinTypeId?: string };
    /** When vault has no balance: close via glacier-release-vault-empty. */
    closeVaultEmpty?: { vaultId: string; coinTypeId: string };
    message?: string;
    error?: string;
  }> {
    return callPlatformBackend(`api/sustain/events/${eventObjectId}/prepare-distribution`, {
      method: 'POST',
      body: JSON.stringify({}),
      ...options,
    });
  },

  /**
   * Build distribution tx(s) for an event (prepare + vault release or close empty + sustain). Platform does prepare and Channel build; game signs and submits, then calls markRewardsDistributed.
   * Use this for manual distribution to centralize build logic on the platform.
   */
  async buildDistribution(
    eventObjectId: string,
    options?: CallPlatformBackendOptions & { adminWalletAddress?: string; corridorAdminCapId?: string }
  ): Promise<{
    success: boolean;
    eventObjectId?: string;
    transactions?: string[];
    /** True when creator was paid from pool (Phase 3). Skip separate distributeCreatorReward. */
    creatorPaidFromPool?: boolean;
    message?: string;
    error?: string;
  }> {
    const body: { adminWalletAddress?: string; corridorAdminCapId?: string } = {};
    if (options?.adminWalletAddress?.startsWith('0x')) {
      body.adminWalletAddress = options.adminWalletAddress;
    }
    if (options?.corridorAdminCapId?.startsWith('0x')) {
      body.corridorAdminCapId = options.corridorAdminCapId;
    }
    return callPlatformBackend(`api/sustain/events/${eventObjectId}/distribute-build`, {
      method: 'POST',
      body: JSON.stringify(body),
      ...options,
    });
  },

  /**
   * Get distribution state for an event (Phase 4). Returns state, retryCount, lastError, digests, etc.
   */
  async getDistributionStatus(
    eventObjectId: string,
    options?: CallPlatformBackendOptions
  ): Promise<{
    success: boolean;
    eventObjectId?: string;
    distribution?: { state: string; retryCount: number; lastError?: string; updatedAt: number; completedAt?: number; digests?: string[] } | null;
    error?: string;
  }> {
    return callPlatformBackend(`api/sustain/events/${eventObjectId}/distribution-status`, {
      method: 'GET',
      ...options,
    });
  },

  /**
   * Report that distribution completed successfully (Phase 4). Call after sign, execute, markRewardsDistributed.
   */
  async reportDistributionComplete(
    eventObjectId: string,
    params?: { digests?: string[] },
    options?: CallPlatformBackendOptions
  ): Promise<{ success: boolean; distribution?: unknown; error?: string }> {
    return callPlatformBackend(`api/sustain/events/${eventObjectId}/distribution-complete`, {
      method: 'POST',
      body: JSON.stringify(params ?? {}),
      ...options,
    });
  },

  /**
   * Report that distribution failed (Phase 4). Call when sign/execute/mark fails after build succeeded.
   */
  async reportDistributionFailed(
    eventObjectId: string,
    params: { error: string },
    options?: CallPlatformBackendOptions
  ): Promise<{ success: boolean; distribution?: unknown; error?: string }> {
    return callPlatformBackend(`api/sustain/events/${eventObjectId}/distribution-failed`, {
      method: 'POST',
      body: JSON.stringify(params),
      ...options,
    });
  },

  /**
   * Set distribution state to SCHEDULED for retry (Phase 4). Fails if retryCount >= max_retries from Helm.
   */
  async retryDistribution(
    eventObjectId: string,
    options?: CallPlatformBackendOptions
  ): Promise<{ success: boolean; distribution?: unknown; error?: string }> {
    return callPlatformBackend(`api/sustain/events/${eventObjectId}/distribution-retry`, {
      method: 'POST',
      body: JSON.stringify({}),
      ...options,
    });
  },

  /**
   * Get per-event distribution overrides (override_auto_distribute, override_grace_period_ms).
   */
  async getDistributionOverrides(
    eventObjectId: string,
    options?: CallPlatformBackendOptions
  ): Promise<{
    success: boolean;
    override_auto_distribute?: boolean;
    override_grace_period_ms?: number;
    error?: string;
  }> {
    return callPlatformBackend(`api/sustain/events/${eventObjectId}/distribution-overrides`, {
      method: 'GET',
      ...options,
    });
  },

  /**
   * Set per-event distribution overrides. Partial update (only sent fields are updated).
   */
  async setDistributionOverrides(
    eventObjectId: string,
    body: { override_auto_distribute?: boolean; override_grace_period_ms?: number },
    options?: CallPlatformBackendOptions
  ): Promise<{
    success: boolean;
    override_auto_distribute?: boolean;
    override_grace_period_ms?: number;
    error?: string;
  }> {
    return callPlatformBackend(`api/sustain/events/${eventObjectId}/distribution-overrides`, {
      method: 'POST',
      body: JSON.stringify(body),
      ...options,
    });
  },

  /**
   * Execute vault release via Glacier: build (returns unsigned tx for game to sign) or execute (submits game-signed tx).
   * Gets vaultId and recipients/amounts from prepareDistribution; then calls Glacier POST /api/glacier/[vaultId]/release-distribute.
   * X-Corridor-Admin-Capability-Object-Id required (from contract config: CORRIDOR_ADMIN_CAP_OBJECT_ID_*).
   */
  async executeVaultRelease(
    eventObjectId: string,
    params: { senderAddress?: string; signedTransactionBlock?: string; signature?: string },
    options?: CallPlatformBackendOptions
  ): Promise<{
    success: boolean;
    transaction?: string;
    digest?: string;
    message?: string;
    error?: string;
  }> {
    const opts = {
      ...options,
      corridorAdminCapabilityObjectId: options?.corridorAdminCapabilityObjectId ?? getCorridorAdminCapabilityObjectIdFromEnv(),
    };
    if (params.signedTransactionBlock && params.signature) {
      const prep = await this.prepareDistribution(eventObjectId, opts);
      if (!prep.success || !prep.vaultReleaseParams?.vaultId) {
        return { success: false, error: prep.error ?? 'prepare-distribution failed or no vaultReleaseParams' };
      }
      const vaultId = prep.vaultReleaseParams.vaultId;
      return callPlatformBackend(`api/glacier/${vaultId}/release-distribute`, {
        method: 'POST',
        body: JSON.stringify({
          signedTransactionBlock: params.signedTransactionBlock,
          signature: params.signature,
        }),
        ...opts,
      });
    }
    const prep = await this.prepareDistribution(eventObjectId, opts);
    if (!prep.success || !prep.vaultReleaseParams) {
      return { success: false, error: prep.error ?? 'prepare-distribution failed or no vaultReleaseParams' };
    }
    const { vaultId, recipients, amounts, coinTypeId } = prep.vaultReleaseParams;
    const coinType = coinTypeId ?? prep.vaultReleaseParams.coinType;
    if (!vaultId || !recipients?.length || !amounts?.length || !coinType) {
      return { success: false, error: 'vaultReleaseParams missing vaultId, recipients, amounts, or coinTypeId' };
    }
    const res = await callPlatformBackend<{ success: boolean; transactionBytesBase64?: string; transaction?: string; digest?: string; message?: string; error?: string }>(
      `api/glacier/${vaultId}/release-distribute`,
      {
        method: 'POST',
        body: JSON.stringify({
          senderAddress: params.senderAddress,
          recipients,
          amounts,
          coinTypeId: coinType,
          ...(opts.corridorAdminCapabilityObjectId ? { corridorAdminCapabilityObjectId: opts.corridorAdminCapabilityObjectId } : {}),
        }),
        ...opts,
      }
    );
    return { ...res, transaction: res.transactionBytesBase64 ?? res.transaction };
  },

  /**
   * Mark that rewards have been distributed for this event (on-chain, Sustain Rain status). Call after vault release and item/credit txs are done.
   * Aqueduct Platform: POST /api/sustain/events/[id]/mark-distribution-complete
   */
  async markRewardsDistributed(
    eventObjectId: string,
    options?: CallPlatformBackendOptions
  ): Promise<{ success: boolean; digest?: string; message?: string; error?: string }> {
    return callPlatformBackend(`api/sustain/events/${eventObjectId}/mark-distribution-complete`, {
      method: 'POST',
      body: JSON.stringify({}),
      ...options,
    });
  },

  /**
   * Cancel an event (before start, no participants). Platform admin signs.
   */
  async cancelEvent(
    eventObjectId: string,
    options?: CallPlatformBackendOptions
  ): Promise<{ success: boolean; digest?: string; message?: string; error?: string }> {
    return callPlatformBackend(`api/station/${eventObjectId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({}),
      ...options,
    });
  },
};

/**
 * Tournament API Client
 * Provides methods to call platform backend tournament APIs
 */
export const platformTournamentClient = {
  /**
   * Get tournament creation fee from the platform. Platform performs on-chain lookup (Sonar) and returns MIST.
   * Call this first when user clicks create.
   */
  async getTournamentFee(
    options?: CallPlatformBackendOptions
  ): Promise<{ success: boolean; tournamentCreationFeeMist?: number; error?: string }> {
    return callPlatformBackend('api/regatta/tournament-fee', { method: 'GET', ...options });
  },

  /**
   * Get vault creation fee from the platform. Platform performs on-chain lookup (Sonar) and returns MIST.
   * Call this after getTournamentFee when user clicks create.
   */
  async getVaultFee(
    options?: CallPlatformBackendOptions
  ): Promise<{ success: boolean; vaultCreationFeeMist?: number; error?: string }> {
    return callPlatformBackend('api/regatta/vault-fee', { method: 'GET', ...options });
  },

  /**
   * Get platform payment address and gas reserve. Use with tournament + vault fees to build total payment amount.
   */
  async getGasPaymentAddress(
    options?: CallPlatformBackendOptions
  ): Promise<{
    success: boolean;
    address?: string;
    gasMist?: number;
    vaultCreationFeeMist?: number;
    tournamentCreationFeeMist?: number;
    totalMist?: number;
    error?: string;
  }> {
    return callPlatformBackend('api/regatta/gas-payment-address', {
      method: 'GET',
      ...options,
    });
  },

  /**
   * Create a tournament.
   * Multi-phase when game pays for vault+ante: transfer_ante → vault (app admin signs create_glacier_vault*) → tournament. Glacier uses single signer (CorridorAdminCap), not multisig.
   */
  async createTournament(
    params: {
      name: string;
      category: 'totalCoins' | 'longestStreak' | 'highestScore' | 'longestDistance' | 'mostBosses' | 'mostEnemies';
      /** Competition type (e.g. 'all-vs-all'). Required by platform. */
      competitionType: string;
      startTime: number;  // Unix timestamp (milliseconds)
      endTime: number;    // Unix timestamp (milliseconds)
      entryFeeTickets: number;   // Number of tournament tickets required (typically 1)
      /** Value per ticket in USD cents; when a user enters, this × entryFeeTickets is added to the pool. Required by platform. */
      ticketValueUSDCents: number;
      /** 'individual' or 'team'. Required by platform. */
      participationMode: 'individual' | 'team';
      startingAnteUSDCents?: number;  // Optional starting ante in USD cents (default: 0)
      /** Optional: raw token amount for vault+ante (e.g. MIST for SUI). When set with senderAddress, phase 1 returns vault tx. */
      startingAnteAmountRaw?: string;
      rewardToken?: 'SUI' | 'MEWS' | 'USDC';  // Optional token type for reward distribution
      /** Full Move coin type for pool vault. When set, a vault is created for the tournament. */
      rewardTokenTypeId?: string;
      rewardConfig?: any;  // Optional custom reward configuration
      createdBy?: string;  // Optional creator address (defaults to admin wallet)
      createdByApiKey?: string;  // Optional API key for creator tracking
      appId?: string;  // Optional app identifier (for multi-tenant tracking)
      /** Game/app wallet that will sign and pay for vault+ante (phase 1). */
      senderAddress?: string;
      /** Phase 2: base64 signed transfer (ante) transaction. */
      signedTransactionBlock?: string;
      /** Phase 2: signature for the transfer. */
      signature?: string;
      /** Phase 3 (vault): base64 create_glacier_vault or create_glacier_vault_with_coin from platform; app admin signs (single signer). */
      vaultTransactionBlock?: string;
      /** Phase 3 (vault): app admin signature for the vault tx. */
      vaultPartialSignature?: string;
      /** Phase 3 result: vaultId created by Glacier. Must be sent back for create_event_corridor so platform doesn't rebuild another vault. */
      vaultId?: string;
      /** Phase 4 (Corridor): signed create_tournament_event_corridor tx; platform submits via Channel. */
      signedCreateEventTransactionBlock?: string;
      /** Phase 4: app admin signature for the create_event tx. */
      createEventSignature?: string;
      /** Signed SUI transfer (gas + vault + tournament fee). Platform submits via Channel (all token transfers through Channel). */
      signedGasPaymentTransactionBlock?: string;
      /** Signature for the gas payment transaction. */
      gasPaymentSignature?: string;
      /** App admin address (holds CorridorAdminCap; signs vault and event create). Required for vault pool (Glacier) in admin-created flow. */
      appAdminAddress?: string;
      /** Tournament creation fee in MIST (from GET tournament-fee). Platform uses this when performing the transaction. */
      tournamentCreationFeeMist?: number;
      /** Vault creation fee in MIST (from GET vault-fee). Platform uses this when performing the transaction. */
      vaultCreationFeeMist?: number;
    },
    options?: CallPlatformBackendOptions
  ): Promise<{
    success: boolean;
    tournament?: any;
    transaction?: string;
    phase?: string;
    message?: string;
    amountRaw?: string;
    coinTypeId?: string;
    vaultId?: string;
    error?: string;
  }> {
    // Platform expects createVaultTransactionBlock + createVaultSignature for vault phase; game uses vaultTransactionBlock + vaultPartialSignature.
    const body: Record<string, unknown> = { ...params };
    if (params.vaultTransactionBlock !== undefined) body.createVaultTransactionBlock = params.vaultTransactionBlock;
    if (params.vaultPartialSignature !== undefined) body.createVaultSignature = params.vaultPartialSignature;
    const res = await callPlatformBackend<{
      success: boolean;
      tournament?: any;
      transactionBytesBase64?: string;
      transaction?: string;
      phase?: string;
      message?: string;
      amountRaw?: string;
      coinTypeId?: string;
      vaultId?: string;
      error?: string;
    }>('api/regatta/create', {
      method: 'POST',
      body: JSON.stringify(body),
      ...options,
    });
    // Normalize: platform returns transactionBytesBase64; game loop expects transaction.
    return { ...res, transaction: res.transactionBytesBase64 ?? res.transaction };
  },

  /**
   * Enter a tournament (with ticket consumption)
   */
  async enterTournament(
    params: {
      tournamentObjectId: string;
      playerAddress: string;
      ticketId: number;
      appId?: string;  // Optional app identifier (for multi-tenant tracking)
    },
    options?: CallPlatformBackendOptions
  ): Promise<{
    success: boolean;
    digest?: string;
    tournamentObjectId?: string;
    playerAddress?: string;
    ticketId?: number;
    error?: string;
  }> {
    return callPlatformBackend('api/regatta/enter', {
      method: 'POST',
      body: JSON.stringify(params),
      ...options,
    });
  },

  /**
   * Add to pool via Glacier: build (platform builds unsigned tx for game to sign).
   * Resolves event → vaultId, then calls Glacier POST /api/glacier/[vaultId]/add. Game signs then calls addToPoolExecute.
   */
  async addToPoolBuild(
    eventObjectId: string,
    params: { amountRaw: string; coinTypeId: string; senderAddress: string },
    options?: CallPlatformBackendOptions
  ): Promise<{
    success: boolean;
    transactionBytesBase64?: string;
    transaction?: string;
    amountRaw?: string;
    coinTypeId?: string;
    message?: string;
    error?: string;
  }> {
    const eventRes = await platformEventsClient.getEvent(eventObjectId, options);
    if (!eventRes.success || !eventRes.event) {
      return { success: false, error: eventRes.error ?? 'Event not found' };
    }
    const vaultId =
      eventRes.event.poolVault?.vaultId ??
      (eventRes.event.metadata?.vaultId && typeof eventRes.event.metadata.vaultId === 'string'
        ? eventRes.event.metadata.vaultId
        : undefined);
    if (!vaultId) {
      return { success: false, error: 'Event has no pool vault' };
    }
    const res = await callPlatformBackend<{ success: boolean; transactionBytesBase64?: string; transaction?: string; amountRaw?: string; coinTypeId?: string; message?: string; error?: string }>(
      `api/glacier/${vaultId}/add`,
      {
        method: 'POST',
        body: JSON.stringify({
          amountRaw: params.amountRaw,
          coinTypeId: params.coinTypeId,
          senderAddress: params.senderAddress,
        }),
        ...options,
      }
    );
    return { ...res, transaction: res.transactionBytesBase64 ?? res.transaction, transactionBytesBase64: res.transactionBytesBase64 };
  },

  /**
   * Add to pool via Glacier: execute (platform submits game-signed transaction).
   * Resolves event → vaultId, then calls Glacier POST /api/glacier/[vaultId]/add.
   */
  async addToPoolExecute(
    eventObjectId: string,
    params: { signedTransactionBlock: string; signature: string },
    options?: CallPlatformBackendOptions
  ): Promise<{
    success: boolean;
    digest?: string;
    message?: string;
    error?: string;
  }> {
    const eventRes = await platformEventsClient.getEvent(eventObjectId, options);
    if (!eventRes.success || !eventRes.event) {
      return { success: false, error: eventRes.error ?? 'Event not found' };
    }
    const vaultId =
      eventRes.event.poolVault?.vaultId ??
      (eventRes.event.metadata?.vaultId && typeof eventRes.event.metadata.vaultId === 'string'
        ? eventRes.event.metadata.vaultId
        : undefined);
    if (!vaultId) {
      return { success: false, error: 'Event has no pool vault' };
    }
    return callPlatformBackend(`api/glacier/${vaultId}/add`, {
      method: 'POST',
      body: JSON.stringify({
        signedTransactionBlock: params.signedTransactionBlock,
        signature: params.signature,
      }),
      ...options,
    });
  },
};

/**
 * Store API Client
 * Provides methods to call platform backend store APIs
 */
export const platformStoreClient = {
  /**
   * Build purchase transaction
   * Game backend validates items/catalog, then calls this.
   * Pass options.ecosystemId for multi-ecosystem (sends X-Ecosystem-Id and API key).
   */
  async purchase(
    params: {
      playerAddress: string;
      items: Array<{ itemType: number; level: number; quantity: number }>;
      paymentToken: 'SUI' | 'MEWS' | 'USDC';
      totalTokenAmount: string;
      adminAddress?: string;
    },
    options?: CallPlatformBackendOptions
  ): Promise<{
    success: boolean;
    transaction?: string;
    gasEstimate?: string;
    totalTokenAmount?: string;
    paymentToken?: string;
    items?: Array<{ itemType: number; level: number; quantity: number }>;
    playerAddress?: string;
    error?: string;
  }> {
    return callPlatformBackend('api/terminal/purchase', {
      method: 'POST',
      body: JSON.stringify(params),
      ...options,
    });
  },

  /**
   * Build merge transaction
   * Game backend validates merge rules/catalog, then calls this.
   * Pass options.ecosystemId for multi-ecosystem.
   */
  async merge(
    params: {
      playerAddress: string;
      itemType: number;
      sourceLevel: number;
      targetLevel: number;
      paymentToken: 'SUI' | 'MEWS' | 'USDC';
      totalTokenAmount: string;
      isHyperMerge?: boolean;
      adminAddress?: string;
    },
    options?: CallPlatformBackendOptions
  ): Promise<{
    success: boolean;
    transaction?: string;
    gasEstimate?: string;
    totalTokenAmount?: string;
    paymentToken?: string;
    itemType?: number;
    sourceLevel?: number;
    targetLevel?: number;
    isHyperMerge?: boolean;
    playerAddress?: string;
    error?: string;
  }> {
    return callPlatformBackend('api/terminal/merge', {
      method: 'POST',
      body: JSON.stringify(params),
      ...options,
    });
  },

  /**
   * Consume items (admin wallet). Platform builds only; caller must sign and submit.
   * Use consumeBuild + sign + platformTxClient.executeSigned, or pass options.senderAddress (or adminWalletAddress)
   * and have the caller sign the returned transactionBytesBase64 and submit.
   * Reservoir: POST /api/reservoir/items/consume (build-only).
   */
  async consume(
    params: {
      playerAddress: string;
      items: Array<{ itemType: number; level: number; quantity: number }>;
      appId?: string;
    },
    options?: CallPlatformBackendOptions & { senderAddress?: string; adminWalletAddress?: string }
  ): Promise<{
    success: boolean;
    digest?: string;
    transactionBytesBase64?: string;
    playerAddress?: string;
    items?: Array<{ itemType: number; level: number; quantity: number }>;
    appId?: string;
    gasPaidBy?: string;
    message?: string;
    error?: string;
  }> {
    const senderAddress = options?.senderAddress ?? options?.adminWalletAddress;
    if (!senderAddress) {
      return { success: false, error: 'consume requires options.senderAddress or options.adminWalletAddress (signer of the consume tx). Use consumeBuild then sign and platformTxClient.executeSigned.' };
    }
    const res = await callPlatformBackend<{
      success: boolean;
      transactionBytesBase64?: string;
      playerAddress?: string;
      items?: Array<{ itemType: number; level: number; quantity: number }>;
      message?: string;
      error?: string;
    }>('api/reservoir/items/consume', {
      method: 'POST',
      body: JSON.stringify({ ...params, senderAddress }),
      ...options,
    });
    return { ...res, transactionBytesBase64: res.transactionBytesBase64 };
  },

  /**
   * Build unsigned consume transaction. Reservoir: POST /api/reservoir/items/consume.
   * Game backend signs and submits the returned transactionBytes (e.g. for admin remove-items).
   */
  async consumeBuild(
    params: {
      playerAddress: string;
      items: Array<{ itemType: number; level: number; quantity: number }>;
      senderAddress: string;
    },
    options?: CallPlatformBackendOptions
  ): Promise<{
    success: boolean;
    transactionBytes?: string;
    message?: string;
    error?: string;
  }> {
    const res = await callPlatformBackend<{
      success: boolean;
      transactionBytesBase64?: string;
      message?: string;
      error?: string;
    }>('api/reservoir/items/consume', {
      method: 'POST',
      body: JSON.stringify(params),
      ...options,
    });
    return {
      success: res.success,
      transactionBytes: res.transactionBytesBase64,
      message: res.message,
      error: res.error,
    };
  },

  /**
   * Get transaction status.
   * Pass options.ecosystemId for multi-ecosystem.
   */
  async getTransactionStatus(
    digest: string,
    options?: CallPlatformBackendOptions
  ): Promise<{
    success: boolean;
    digest?: string;
    exists?: boolean;
    confirmed?: boolean;
    error?: string;
  }> {
    return callPlatformBackend(`api/terminal/transaction/${digest}`, {
      method: 'GET',
      ...options,
    });
  },

  /**
   * Settle a store purchase: forward MEWS/USDC received by the platform wallet
   * to the app's configured admin wallet (platform signs settlement tx).
   */
  async settlePurchase(
    digest: string,
    options?: CallPlatformBackendOptions
  ): Promise<{
    success: boolean;
    digest?: string;
    settled?: boolean;
    recipient?: string;
    platformAddress?: string;
    settlement?: Array<{ coinType: string; amountRaw: string }>;
    settleDigest?: string;
    message?: string;
    error?: string;
  }> {
    return callPlatformBackend(`api/store/settle/${digest}`, {
      method: 'POST',
      ...options,
    });
  },

  /**
   * Get provisions catalog from platform (same shape as game ProvisionsCatalog).
   */
  async getCatalog(
    options?: CallPlatformBackendOptions
  ): Promise<{
    success: boolean;
    catalog?: Record<string, { id: string; name: string; description: string; category: string; icon: string; levels: Array<{ level: number; effect: string; description: string }> }>;
    error?: string;
  }> {
    return callPlatformBackend('api/provisions/catalog', {
      method: 'GET',
      ...options,
    });
  },

  /**
   * Terminal storefront: Provisions definitions merged with Stockroom prices (flow provisions → stockroom → terminal).
   * Prefer this over getCatalog + separate stockroom reads for store UI.
   */
  async getTerminalStoreCatalog(
    options?: CallPlatformBackendOptions
  ): Promise<{
    success: boolean;
    flow?: readonly string[];
    definitions?: Record<string, unknown>;
    /** On-chain Stockroom display order (SKU keys); game fills fallback if missing. */
    offerOrder?: string[];
    offers?: Record<string, Record<string, unknown>>;
    items?: Array<{
      id: string;
      name: string;
      description: string;
      category: string;
      icon: string;
      levels: Array<{
        level: number;
        effect: string;
        description: string;
        stockroomSku: string;
        priceUsdCents: number | null;
      }>;
    }>;
    bundleAndPackSkus?: unknown[];
    error?: string;
  }> {
    return callPlatformBackend('api/terminal/store-catalog', {
      method: 'GET',
      ...options,
    });
  },

  /**
   * Build provisions admin transaction (platform builds, game signs and submits).
   * action: set_definition | set_level | set_status | remove_level | batched_init.
   * Pass catalogPackageId, catalogRegistryId, catalogAdminCapId when the app has its own provisions registry/cap so the platform builds for that catalog.
   */
  async buildCatalogAdmin(
    params: {
      action: 'set_definition' | 'set_level' | 'set_status' | 'remove_level' | 'batched_init';
      ecosystemId?: string;
      itemId?: string;
      name?: string;
      description?: string;
      category?: 'defensive' | 'offensive' | 'tactical' | 'utility';
      icon?: string;
      active?: boolean;
      level?: number;
      effect?: string;
      levels?: Array<{ level: number; effect?: string; description?: string }>;
      items?: Array<{
        itemId: string;
        name: string;
        description: string;
        category: 'defensive' | 'offensive' | 'tactical' | 'utility';
        icon: string;
        levels: Array<{ level: number; effect?: string; description?: string }>;
      }>;
      /** Client-provided catalog contract IDs. When set, platform builds the tx for this registry/cap (app's catalog). */
      catalogPackageId?: string;
      catalogRegistryId?: string;
      catalogAdminCapId?: string;
      catalogSender?: string;
    },
    options?: CallPlatformBackendOptions
  ): Promise<{
    success: boolean;
    transactionBytesBase64?: string;
    transaction?: string;
    operationCount?: number;
    message?: string;
    error?: string;
  }> {
    const { ecosystemId: _eco, ...rest } = params;
    const res = await callPlatformBackend<{ success: boolean; transactionBytesBase64?: string; transaction?: string; operationCount?: number; message?: string; error?: string }>(
      'api/provisions/admin/catalog/build',
      { method: 'POST', body: JSON.stringify(rest), ...options }
    );
    return { ...res, transaction: res.transactionBytesBase64 ?? res.transaction };
  },
};

/**
 * Inventory API Client
 * Inventory is separated from Store: inventory = reads + admin add-items; store = purchase/consume/merge.
 * Supports multi-ecosystem via options.ecosystemId (X-Ecosystem-Id).
 * Pass options.contract ('new' | 'old' | 'both') to include legacy store when platform has it configured.
 */
export const platformInventoryClient = {
  /**
   * Get player inventory from platform.
   * options.contract: 'new' (default) | 'old' | 'both' to include legacy store.
   */
  async getInventory(
    playerAddress: string,
    options?: CallPlatformBackendOptions & { contract?: 'new' | 'old' | 'both'; debug?: boolean }
  ): Promise<{
    success: boolean;
    address?: string;
    inventory?: Record<string, number>;
    error?: string;
  }> {
    const { contract, debug, ...rest } = options ?? {};
    const qs = new URLSearchParams();
    if (contract) qs.set('contract', contract);
    if (debug) qs.set('debug', '1');
    const path = qs.size
      ? `api/reservoir/holdings/${playerAddress}?${qs.toString()}`
      : `api/reservoir/holdings/${playerAddress}`;
    return callPlatformBackend(path, {
      method: 'GET',
      ...rest,
    });
  },

  /**
   * Admin: build unsigned register_item_keys transaction. Registers the app's item keys (catalog)
   * with the platform store so purchase/add/consume can use them. Call once per app.
   * Game backend signs and submits the returned transactionBytes.
   */
  async registerItemKeysBuild(
    params: {
      itemKeys: string[];
      senderAddress: string;
    },
    options?: CallPlatformBackendOptions
  ): Promise<{
    success: boolean;
    transactionBytesBase64?: string;
    transactionBytes?: string;
    message?: string;
    error?: string;
  }> {
    const res = await callPlatformBackend<{ success: boolean; transactionBytesBase64?: string; message?: string; error?: string }>(
      'api/admin/inventory/register-item-keys/build',
      { method: 'POST', body: JSON.stringify(params), ...options }
    );
    return { ...res, transactionBytes: res.transactionBytesBase64 };
  },

  /**
   * Admin: build unsigned add-items transaction. Platform does not hold app/game keys.
   * Game backend signs and submits the returned transactionBytes.
   */
  async adminAddItemsBuild(
    params: {
      playerAddress: string;
      items: Array<{ itemId: string; level: number; quantity: number }>;
      senderAddress: string;
    },
    options?: CallPlatformBackendOptions
  ): Promise<{
    success: boolean;
    transactionBytesBase64?: string;
    transactionBytes?: string;
    message?: string;
    error?: string;
  }> {
    const res = await callPlatformBackend<{ success: boolean; transactionBytesBase64?: string; message?: string; error?: string }>(
      'api/admin/inventory/add-items/build',
      { method: 'POST', body: JSON.stringify(params), ...options }
    );
    return { ...res, transactionBytes: res.transactionBytesBase64 };
  },

  /**
   * Admin: add items (execute). Only works when platform signs (legacy AdminCapability path).
   * For AppCapability path use adminAddItemsBuild and sign/submit from game backend.
   */
  async adminAddItems(
    params: {
      playerAddress: string;
      items: Array<{ itemId: string; level: number; quantity: number }>;
    },
    options?: CallPlatformBackendOptions
  ): Promise<{
    success: boolean;
    digest?: string;
    message?: string;
    error?: string;
  }> {
    return callPlatformBackend('api/admin/inventory/add-items', {
      method: 'POST',
      body: JSON.stringify(params),
      ...options,
    });
  },
};

/**
 * Rewards API Client (Aqueduct: Sustain)
 * Only Channel builds. buildDistribute returns params then calls Channel batch to get tx(s).
 */
export const platformRewardsClient = {
  /**
   * Build unsigned reward distribution transaction(s).
   * Calls sustain/build-distribute (params only), then Channel batch to get tx(s). Game signs with payerAddress and submits.
   */
  async buildDistribute(
    params: {
      rewards: Array<{
        recipientAddress: string;
        tokenType?: 'SUI' | 'MEWS' | 'USDC';
        tokenAmount?: string;
        credits?: number;
        amount?: number;
        items?: Array<{ itemId: string; level: number; quantity: number }>;
      }>;
      idempotencyKey?: string;
      source?: string;
      adminWalletAddress?: string;
    },
    options?: CallPlatformBackendOptions
  ): Promise<{
    success: boolean;
    transactions?: string[];
    payerAddress?: string;
    errors?: string[];
    message?: string;
    error?: string;
  }> {
    const body = {
      ...params,
      rewards: (params.rewards ?? []).map((r) => ({
        recipientAddress: r.recipientAddress,
        tokenType: r.tokenType,
        tokenAmount: r.tokenAmount,
        amount: (r as { amount?: number }).amount ?? (r as { credits?: number }).credits,
        items: r.items,
      })),
    };
    if (options?.adminWalletAddress) body.adminWalletAddress = options.adminWalletAddress;
    const buildRes = await callPlatformBackend('api/sustain/build-distribute', {
      method: 'POST',
      body: JSON.stringify(body),
      ...options,
    }) as {
      success: boolean;
      channelBuildParams?: { operationId: string; params: Record<string, unknown> };
      payerAddress?: string;
      message?: string;
      error?: string;
    };
    if (!buildRes.success || !buildRes.channelBuildParams) {
      return buildRes;
    }
    const batchRes = await callPlatformBackend('api/channel/batch', {
      method: 'POST',
      body: JSON.stringify({
        operations: [{
          operationId: buildRes.channelBuildParams.operationId,
          params: buildRes.channelBuildParams.params,
        }],
      }),
      ...options,
    }) as { success?: boolean; transactions?: string[]; errors?: string[] };
    return {
      ...buildRes,
      transactions: batchRes.transactions ?? [],
      errors: batchRes.errors,
      message: batchRes.transactions?.length
        ? `Built ${batchRes.transactions.length} transaction(s). Sign with payerAddress and submit via POST /api/channel/execute.`
        : buildRes.message,
    };
  },
};

/**
 * Stats API Client (Hydroscope HTTP API).
 * On-chain persistence is **Wake** (`aqueduct_wake::wake`): the contract is an on-chain **footprint store (stats + marks)** —
 * the same `submit_wake_stats` / `PlayerStatStore` machinery, with app-defined UTF-8 keys. **Stats** are the usual
 * cumulative/max metrics (e.g. totalGames, bestScore). **Marks** are the other key family (one-shot flags, per-id
 * claimed rows under keys like `wake_mark_*`, etc.—app-defined UTF-8 keys). Hydroscope is the HTTP read/write surface for that Wake registry.
 * **Anchor** remains separate: session + verifiable **claim attestations**, not the Wake u64 key/value store.
 */
export const platformStatsClient = {
  async getStats(address: string, options?: CallPlatformBackendOptions): Promise<{
    success: boolean;
    address?: string;
    ecosystemId?: string;
    stats?: Record<string, unknown>;
    error?: string;
  }> {
    return callPlatformBackend(`api/hydroscope/${address}`, {
      method: 'GET',
      ...options,
    });
  },

  async updateStats(
    params: { address: string; stats: Record<string, unknown>; sessionId?: string | null },
    options?: CallPlatformBackendOptions
  ): Promise<{
    success: boolean;
    address?: string;
    ecosystemId?: string;
    updated?: boolean;
    error?: string;
  }> {
    return callPlatformBackend('api/hydroscope/update', {
      method: 'POST',
      body: JSON.stringify(params),
      ...options,
    });
  },

  /**
   * Get leaderboard (top players by bestScore) from platform stats storage.
   * Pass options.ecosystemId for multi-ecosystem.
   */
  async getLeaderboard(
    limit: number = 100,
    options?: CallPlatformBackendOptions
  ): Promise<{
    success: boolean;
    leaderboard?: Array<{
      walletAddress: string;
      playerAddress: string;
      playerName?: string;
      score: number;
      distance: number;
      coins: number;
      bossesDefeated: number;
      enemiesDefeated: number;
      longestCoinStreak: number;
      timestamp: number;
    }>;
    count?: number;
    limit?: number;
    error?: string;
  }> {
    const limitClamped = Math.min(Math.max(limit, 1), 1000);
    return callPlatformBackend(`api/hydroscope/leaderboard?limit=${limitClamped}`, {
      method: 'GET',
      ...options,
    });
  },

  /**
   * Get per-game (append-only) results feed from Wake events.
   * Platform API: GET api/hydroscope/game-results?limit=...
   */
  async getGameResults(
    limit: number = 200,
    options?: CallPlatformBackendOptions
  ): Promise<{
    success: boolean;
    leaderboard?: Array<{
      walletAddress: string;
      playerAddress: string;
      playerName?: string;
      score: number;
      distance: number;
      coins: number;
      bossesDefeated: number;
      enemiesDefeated: number;
      longestCoinStreak: number;
      timestamp: number;
      sessionId?: unknown;
    }>;
    count?: number;
    limit?: number;
    error?: string;
    source?: string;
  }> {
    const limitClamped = Math.min(Math.max(limit, 1), 1000);
    return callPlatformBackend(`api/hydroscope/game-results?limit=${limitClamped}`, {
      method: 'GET',
      ...options,
    });
  },
};

/** Normalized Hydroscope read for one player (shared cache + in-flight dedupe). */
type PlayerHydroStatsResult = {
  success: boolean;
  hasStats?: boolean;
  totalGames?: number;
  bestScore?: number;
  bestDistance?: number;
  bestCoins?: number;
  bestBossesDefeated?: number;
  bestEnemiesDefeated?: number;
  bestCoinStreak?: number;
  totalScore?: number;
  totalDistance?: number;
  totalCoins?: number;
  totalBossesDefeated?: number;
  totalEnemiesDefeated?: number;
  totalCoinStreak?: number;
  firstGameDate?: number;
  lastGameDate?: number;
  averageScore?: number;
  averageDistance?: number;
  averageCoins?: number;
  averageBossesDefeated?: number;
  averageEnemiesDefeated?: number;
  averageCoinStreak?: number;
  error?: string;
};

/**
 * Concurrent GETs for the same player share one Hydroscope request (e.g. /api/stats and
 * /api/badges?includePendingUpgrade=1 in parallel on menu load).
 * Successful responses are also kept briefly so back-to-back routes avoid a second Hydroscope hit.
 * TTL: PLAYER_HYDROSCOPE_STATS_CACHE_TTL_MS (default 30s), defined with game pass cache above.
 */
const playerStatsCacheByKey = new Map<string, { at: number; value: PlayerHydroStatsResult }>();
const playerStatsInflightByAddress = new Map<string, Promise<PlayerHydroStatsResult>>();

export function invalidatePlayerStatsCacheForAddress(address: string): void {
  const prefix = `${address.toLowerCase()}|`;
  for (const k of playerStatsCacheByKey.keys()) {
    if (k.startsWith(prefix)) playerStatsCacheByKey.delete(k);
  }
}

/**
 * Game score / stats / trace / verify — uses generic platform modules (Hydroscope, Anchor).
 * No api/game on platform; game client maps request/response shapes.
 */
export const platformGameScoreClient = {
  /**
   * Submit score via Hydroscope update. Fetches current stats, merges scoreData, POST api/hydroscope/update.
   * If platform returns buildOnly + transactionBytesBase64, caller must sign and submit via platformTxClient.executeSigned; digest then comes from that.
   */
  async submitScore(
    params: {
      playerAddress: string;
      scoreData: {
        score: number;
        distance: number;
        coins: number;
        bossesDefeated: number;
        enemiesDefeated: number;
        longestCoinStreak: number;
        bossTiers?: number[];
        enemyTypes?: number[];
        bossHits?: number;
      };
      playerName?: string;
      sessionId?: string | null;
    },
    options?: CallPlatformBackendOptions
  ): Promise<{
    success: boolean;
    digest?: string;
    buildOnly?: boolean;
    transactionBytesBase64?: string;
    updated?: boolean;
    error?: string;
  }> {
    const opts = { ...options };
    const toNum = (v: unknown): number => {
      if (typeof v === 'number' && Number.isFinite(v)) return v;
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };
    let existing: { success?: boolean; stats?: Record<string, unknown>; totalGames?: number; totalScore?: number; totalDistance?: number; totalCoins?: number; totalBossesDefeated?: number; totalEnemiesDefeated?: number; totalCoinStreak?: number; bestScore?: number; bestDistance?: number; bestCoins?: number; bestBossesDefeated?: number; bestEnemiesDefeated?: number; bestCoinStreak?: number; firstGameDate?: number; lastGameDate?: number } | null = null;
    try {
      existing = await callPlatformBackend(`api/hydroscope/${encodeURIComponent(params.playerAddress)}`, { method: 'GET', ...opts });
    } catch {
      existing = null;
    }
    const prev = existing?.stats ?? {};
    const totalGames = toNum(prev.totalGames) + 1;
    // Wake `total*` keys use OP_ADD on-chain: stored += submitted. Submitted values must be **this run only**
    // (deltas), not pre-merged cumulative totals — otherwise game 2 sends (g1+g2) and chain does prev+(g1+g2).
    const d = params.scoreData;
    const stats: Record<string, unknown> = {
      totalGames,
      totalScore: d.score,
      totalDistance: d.distance,
      totalCoins: d.coins,
      totalBossesDefeated: d.bossesDefeated,
      totalEnemiesDefeated: d.enemiesDefeated,
      totalCoinStreak: d.longestCoinStreak,
      // `best*` uses OP_MAX on-chain: stored = max(stored, submitted). Submit this run's values only.
      bestScore: d.score,
      bestDistance: d.distance,
      bestCoins: d.coins,
      bestBossesDefeated: d.bossesDefeated,
      bestEnemiesDefeated: d.enemiesDefeated,
      bestCoinStreak: d.longestCoinStreak,
      lastGameDate: Date.now(),
    };
    if (totalGames === 1) stats.firstGameDate = Date.now();
    // Compact debug log for aggregation correctness (prev + delta = next).
    PlatformLogger.info('[SCORE][AGG] merge', {
      addressPrefix: params.playerAddress.slice(0, 10),
      sessionIdPrefix: (params.sessionId ?? '').slice(0, 12),
      note: 'Wake total* = ADD(deltas); best* = MAX(run); totals in log are expected-on-chain after tx',
      prev: {
        totalGames: toNum(prev.totalGames),
        totalScore: toNum(prev.totalScore),
        totalCoins: toNum(prev.totalCoins),
        totalEnemiesDefeated: toNum(prev.totalEnemiesDefeated),
      },
      submittedDeltas: {
        score: d.score,
        coins: d.coins,
        enemiesDefeated: d.enemiesDefeated,
      },
      expectedNextTotals: {
        totalGames,
        totalScore: toNum(prev.totalScore) + d.score,
        totalCoins: toNum(prev.totalCoins) + d.coins,
        totalEnemiesDefeated: toNum(prev.totalEnemiesDefeated) + d.enemiesDefeated,
      },
      prevTypes: {
        totalCoins: typeof (prev as any).totalCoins,
        totalEnemiesDefeated: typeof (prev as any).totalEnemiesDefeated,
      },
    });
    // Allow empty display names: omit key only when the client did not send playerName at all.
    // When playerName is "" (or whitespace-only), store trimmed "" so callers can clear a previous name.
    if (params.playerName !== undefined && params.playerName !== null) {
      stats.playerName = typeof params.playerName === 'string' ? params.playerName.trim() : '';
    }

    // Canonical on-chain write path: build via Channel batch (hydroscope-submit-stats), then caller signs and executes.
    const effCap =
      (opts as CallPlatformBackendOptions | undefined)?.corridorCapabilityObjectId ??
      getCorridorCapabilityObjectIdFromEnv() ??
      '';
    const senderAddress =
      (opts as CallPlatformBackendOptions | undefined)?.senderAddress ??
      (opts as CallPlatformBackendOptions | undefined)?.adminWalletAddress ??
      '';
    if (!senderAddress || !senderAddress.startsWith('0x')) {
      return { success: false, error: 'senderAddress is required for Hydroscope submit (game wallet address that will sign and pay gas).' };
    }

    const batchRes = await buildBatchViaChannel(
      {
        operations: [
          {
            operationId: 'hydroscope-submit-stats',
            params: {
              address: params.playerAddress,
              stats,
              sessionId: params.sessionId ?? '',
              corridorCapabilityObjectId: effCap,
              senderAddress,
              // Append-only, on-chain "every game is a row" event in Wake.
              // This is separate from the per-wallet aggregate stats above.
              gameResult: {
                score: params.scoreData.score,
                distance: params.scoreData.distance,
                coins: params.scoreData.coins,
                bossesDefeated: params.scoreData.bossesDefeated,
                enemiesDefeated: params.scoreData.enemiesDefeated,
                longestCoinStreak: params.scoreData.longestCoinStreak,
                // Per-run display name on Wake `GameResultSubmitted` (separate from optional aggregate name update).
                playerName:
                  params.playerName !== undefined && params.playerName !== null
                    ? String(params.playerName).trim()
                    : '',
              },
            },
          },
        ],
      },
      opts
    );

    if (!batchRes.success || !batchRes.transactions?.length) {
      const err = batchRes.errors?.[0] ?? batchRes.error ?? 'Hydroscope submit stats build failed';
      return { success: false, error: err };
    }

    // Return build-only tx bytes; caller signs and executes via platformTxClient.executeSigned.
    return { success: true, buildOnly: true, transactionBytesBase64: batchRes.transactions[0] };
  },

  /** Get player stats from Hydroscope (GET api/hydroscope/[address]). */
  async getPlayerStats(
    address: string,
    options?: CallPlatformBackendOptions
  ): Promise<{
    success: boolean;
    hasStats?: boolean;
    totalGames?: number;
    bestScore?: number;
    bestDistance?: number;
    bestCoins?: number;
    bestBossesDefeated?: number;
    bestEnemiesDefeated?: number;
    bestCoinStreak?: number;
    totalScore?: number;
    totalDistance?: number;
    totalCoins?: number;
    totalBossesDefeated?: number;
    totalEnemiesDefeated?: number;
    totalCoinStreak?: number;
    firstGameDate?: number;
    lastGameDate?: number;
    averageScore?: number;
    averageDistance?: number;
    averageCoins?: number;
    averageBossesDefeated?: number;
    averageEnemiesDefeated?: number;
    averageCoinStreak?: number;
    error?: string;
  }> {
    const effCap =
      (options as CallPlatformBackendOptions | undefined)?.corridorCapabilityObjectId ??
      getCorridorCapabilityObjectIdFromEnv() ??
      '';
    const key = `${address.toLowerCase()}|${effCap}`;
    const cached = playerStatsCacheByKey.get(key);
    if (cached && Date.now() - cached.at < PLAYER_STATS_CACHE_TTL_MS) {
      return { ...cached.value };
    }
    if (cached) playerStatsCacheByKey.delete(key);

    const existing = playerStatsInflightByAddress.get(key);
    if (existing) return existing;

    const promise = (async (): Promise<PlayerHydroStatsResult> => {
      const res = await callPlatformBackend<{
        success: boolean;
        hasStats?: boolean;
        totalGames?: number;
        bestScore?: number;
        bestDistance?: number;
        bestCoins?: number;
        bestBossesDefeated?: number;
        bestEnemiesDefeated?: number;
        bestCoinStreak?: number;
        totalScore?: number;
        totalDistance?: number;
        totalCoins?: number;
        totalBossesDefeated?: number;
        totalEnemiesDefeated?: number;
        totalCoinStreak?: number;
        firstGameDate?: number;
        lastGameDate?: number;
        stats?: Record<string, unknown>;
        error?: string;
      }>(`api/hydroscope/${encodeURIComponent(address)}`, { method: 'GET', ...options });

      if (!res.success) return { success: false, error: res.error };
      const totalGames = res.totalGames ?? 0;
      return {
        success: true,
        hasStats: res.hasStats,
        totalGames: res.totalGames,
        bestScore: res.bestScore,
        bestDistance: res.bestDistance,
        bestCoins: res.bestCoins,
        bestBossesDefeated: res.bestBossesDefeated,
        bestEnemiesDefeated: res.bestEnemiesDefeated,
        bestCoinStreak: res.bestCoinStreak,
        totalScore: res.totalScore,
        totalDistance: res.totalDistance,
        totalCoins: res.totalCoins,
        totalBossesDefeated: res.totalBossesDefeated,
        totalEnemiesDefeated: res.totalEnemiesDefeated,
        totalCoinStreak: res.totalCoinStreak,
        firstGameDate: res.firstGameDate,
        lastGameDate: res.lastGameDate,
        averageScore: totalGames > 0 && res.totalScore != null ? res.totalScore / totalGames : undefined,
        averageDistance: totalGames > 0 && res.totalDistance != null ? res.totalDistance / totalGames : undefined,
        averageCoins: totalGames > 0 && res.totalCoins != null ? res.totalCoins / totalGames : undefined,
        averageBossesDefeated: totalGames > 0 && res.totalBossesDefeated != null ? res.totalBossesDefeated / totalGames : undefined,
        averageEnemiesDefeated: totalGames > 0 && res.totalEnemiesDefeated != null ? res.totalEnemiesDefeated / totalGames : undefined,
        averageCoinStreak: totalGames > 0 && res.totalCoinStreak != null ? res.totalCoinStreak / totalGames : undefined,
      };
    })()
      .then((mapped) => {
        if (mapped.success) {
          playerStatsCacheByKey.set(key, { at: Date.now(), value: mapped });
        }
        return mapped;
      })
      .finally(() => {
        playerStatsInflightByAddress.delete(key);
      });

    playerStatsInflightByAddress.set(key, promise);
    return promise;
  },

  /**
   * Trace: Hydroscope `participants/.../claims` returns **Anchor claim** records (attestation / audit trail),
   * not Wake stats rows. `regularGameScores` here is that claim-derived trace only.
   * Canonical per-game aggregates live in **Wake** via `api/hydroscope/{address}` (see platformStatsClient.getStats).
   * Tournament scores go through Channel batch (regatta-submit-score) and POST /api/channel/execute;
   * they are not in the generic Hydroscope claims list. tournamentScores left empty unless platform adds a per-player regatta/station trace.
   */
  async trace(
    address: string,
    options?: CallPlatformBackendOptions
  ): Promise<{
    success: boolean;
    playerAddress: string;
    regularGameScores: unknown[];
    tournamentScores: unknown[];
    summary: { totalRegularScores: number; totalTournamentScores: number; latestRegularScore: unknown; latestTournamentScore: unknown };
    message?: string;
  }> {
    // Note: best-effort composite trace. Claim rows here are Anchor attestations exposed by Hydroscope;
    // authoritative stats for gameplay/leaderboards come from Wake via Hydroscope GET /api/hydroscope/{address}.
    // Tournament scores are derived from Station submissions (Regatta records submissions to Station).
    const claimsRes = await callPlatformBackend<{ success: boolean; participant?: string; claims?: unknown[]; error?: string }>(
      `api/hydroscope/participants/${encodeURIComponent(address)}/claims`,
      { method: 'GET', ...options }
    );
    if (!claimsRes.success) {
      return {
        success: false,
        playerAddress: address,
        regularGameScores: [],
        tournamentScores: [],
        summary: { totalRegularScores: 0, totalTournamentScores: 0, latestRegularScore: null, latestTournamentScore: null },
        message: claimsRes.error,
      };
    }
    const claims = claimsRes.claims ?? [];
    const regularGameScores = claims;

    let tournamentScores: unknown[] = [];
    try {
      const [upcomingRes, activeRes, pastRes] = await Promise.all([
        platformEventsClient.getUpcomingEvents(options),
        platformEventsClient.getActiveEvents(options),
        platformEventsClient.getPastEvents(30, options),
      ]);

      const events = [
        ...(upcomingRes.success && Array.isArray(upcomingRes.events) ? upcomingRes.events : []),
        ...(activeRes.success && Array.isArray(activeRes.events) ? activeRes.events : []),
        ...(pastRes.success && Array.isArray(pastRes.events) ? pastRes.events : []),
      ]
        .filter((e: { type?: number; objectId?: string }) => e && e.type === 0 && typeof e.objectId === 'string')
        .slice(0, 40);

      const norm = String(address).trim().toLowerCase();
      const perEvent = await Promise.all(
        events.map(async (e: { objectId: string; eventId?: number }) => {
          const sub = await platformEventsClient.getSubmissions(e.objectId, options);
          if (!sub.success || !Array.isArray(sub.submissions)) return [];
          return sub.submissions
            .filter((s: { participant?: string }) => String(s.participant ?? '').trim().toLowerCase() === norm)
            .map((s: { submittedAt?: number; submissionData?: unknown }) => ({
              tournamentObjectId: e.objectId,
              tournamentId: e.eventId,
              submittedAt: s.submittedAt,
              submission: s.submissionData,
            }));
        })
      );
      tournamentScores = perEvent.flat().sort((a: { submittedAt?: number }, b: { submittedAt?: number }) => (a.submittedAt ?? 0) - (b.submittedAt ?? 0));
    } catch {
      // Non-fatal: keep tournamentScores empty if platform API calls fail.
    }

    return {
      success: true,
      playerAddress: address,
      regularGameScores,
      tournamentScores,
      summary: {
        totalRegularScores: regularGameScores.length,
        totalTournamentScores: tournamentScores.length,
        latestRegularScore: regularGameScores[regularGameScores.length - 1] ?? null,
        latestTournamentScore: tournamentScores[tournamentScores.length - 1] ?? null,
      },
    };
  },

  /** Verify by digest via Anchor (GET api/anchor/verify?digest=). Map response to game shape. */
  async verifyByDigest(
    digest: string,
    options?: CallPlatformBackendOptions
  ): Promise<{
    success: boolean;
    transaction?: { digest: string; status?: string; timestamp?: number };
    gameSession?: { objectId: string; objectType: string } | null;
    event?: Record<string, unknown> | null;
    explorerUrl?: string;
    error?: string;
  }> {
    const q = new URLSearchParams({ digest });
    const res = await callPlatformBackend<{
      success: boolean;
      verified?: boolean;
      claimId?: string;
      sessionId?: number;
      participant?: string;
      registryId?: string;
      submittedAtMs?: number;
      error?: string;
    }>(`api/anchor/verify?${q.toString()}`, { method: 'GET', ...options });

    if (!res.success) return { success: false, error: res.error };
    return {
      success: true,
      transaction: { digest, ...(res.submittedAtMs != null && { timestamp: res.submittedAtMs }) },
      gameSession: res.claimId != null ? { objectId: res.claimId, objectType: 'claim' } : null,
      event: res.sessionId != null || res.participant ? { sessionId: res.sessionId, participant: res.participant } : null,
    };
  },

  /** Verify by txHash: on Sui txHash is the digest; call Anchor verify with digest=txHash. */
  async verifyByTxHash(
    txHash: string,
    options?: CallPlatformBackendOptions
  ): Promise<{
    success: boolean;
    transaction?: { digest: string; status?: string; timestamp?: number };
    gameSession?: { objectId: string; objectType: string } | null;
    event?: Record<string, unknown> | null;
    explorerUrl?: string;
    error?: string;
  }> {
    return this.verifyByDigest(txHash, options);
  },
};

/**
 * Anchor — session + **claim attestation** (e.g. milestone completion payloads). On-chain claim records; not the Wake stats store.
 * Audit-style trace is often consumed through Hydroscope list routes; build submit_claim via POST /api/anchor/claims.
 */
export const platformAnchorClient = {
  /**
   * List Anchor claim records for a participant (Hydroscope HTTP surface over claim attestation data).
   * Use for "claimed milestone IDs" by filtering claimType. Player **stats** for eligibility come from Wake via platformStatsClient.
   * When submittedByAddress is the game admin (game submits claims on behalf of players), set payloadPlayerAddress to the player address to filter.
   */
  async listParticipantClaims(
    address: string,
    options?: CallPlatformBackendOptions & { limit?: number; payloadPlayerAddress?: string; debug?: boolean }
  ): Promise<{
    success: boolean;
    participant?: string;
    debug?: any;
    claims?: Array<{
      claimId?: number;
      sessionId?: number;
      participant?: string;
      submittedAtMs?: number;
      digest?: string;
      claimType?: string;
      payload?: Record<string, unknown>;
    }>;
    error?: string;
  }> {
    const limit = Math.min(Math.max(options?.limit ?? 100, 1), 100);
    // Hydroscope claims endpoint supports enrich=1 to include claimType + payload (via get_claim).
    // Admin discovery and "claimed milestone IDs" require payloadJson to extract playerAddress/milestoneId.
    const params = new URLSearchParams({ limit: String(limit), enrich: '1' });
    if (options?.payloadPlayerAddress?.trim().startsWith('0x')) {
      params.set('payloadPlayerAddress', options.payloadPlayerAddress.trim());
    }
    if (options?.debug === true) {
      params.set('debug', '1');
    }
    type ClaimsResponse = {
      success: boolean;
      participant?: string;
      debug?: any;
      claims?: Array<{
        claimId?: number;
        sessionId?: number;
        participant?: string;
        submittedAtMs?: number;
        digest?: string;
        claimType?: string;
        payload?: Record<string, unknown>;
      }>;
      error?: string;
    };
    const res = await callPlatformBackend<{
      success: boolean;
      participant?: string;
      debug?: any;
      claims?: unknown[];
      error?: string;
    }>(`api/hydroscope/participants/${encodeURIComponent(address)}/claims?${params.toString()}`, { method: 'GET', ...options });
    if (!res.success) return res as ClaimsResponse;
    return {
      ...res,
      claims: Array.isArray(res.claims) ? (res.claims as Array<{ claimId?: number; sessionId?: number; participant?: string; submittedAtMs?: number; digest?: string; claimType?: string; payload?: Record<string, unknown> }>) : [],
    };
  },

  /**
   * Build create_session transaction for Anchor. Used for tournament score submission: create a session for the player, then pass sessionId to regatta submit-score.
   * Returns transaction (base64) for the corridor cap holder to sign and submit via platformTxClient.executeSigned.
   * After execution, parse sessionId from the transaction effects (return value of create_session).
   */
  async buildCreateSession(
    params: {
      participant: string;
      ttlMs: number;
      maxUses: number;
      stationEventId?: string | null;
      senderAddress?: string;
    },
    options?: CallPlatformBackendOptions
  ): Promise<{ success: boolean; transactionBytesBase64?: string; transaction?: string; message?: string; error?: string }> {
    const senderAddress = params.senderAddress ?? options?.senderAddress ?? options?.adminWalletAddress;
    const body = { ...params, ...(senderAddress ? { senderAddress } : {}) };
    const res = await callPlatformBackend<{ success: boolean; transactionBytesBase64?: string; message?: string; error?: string }>(
      'api/anchor/sessions',
      { method: 'POST', body: JSON.stringify(body), ...options }
    );
    return {
      ...res,
      transaction: res.transactionBytesBase64,
    };
  },

  /**
   * Build create_anchor_registry_ecosystem transaction for this app (one-time init).
   * Returns transaction (base64) for the corridor admin cap holder to sign and submit via platformTxClient.executeSigned.
   */
  async buildCreateRegistry(
    params: { senderAddress?: string },
    options?: CallPlatformBackendOptions
  ): Promise<{ success: boolean; transactionBytesBase64?: string; transaction?: string; message?: string; error?: string }> {
    const senderAddress = params.senderAddress ?? options?.senderAddress ?? options?.adminWalletAddress;
    const body = { ...(senderAddress ? { senderAddress } : {}) };
    const res = await callPlatformBackend<{ success: boolean; transactionBytesBase64?: string; message?: string; error?: string }>(
      'api/anchor/registry',
      { method: 'POST', body: JSON.stringify(body), ...options }
    );
    return { ...res, transaction: res.transactionBytesBase64 };
  },

  /**
   * Build submit_claim transaction. Game admin can sign and pay: use game's corridor cap and sessionId; pass senderAddress (or gasOwnerAddress) as signer.
   * Returns transaction (base64) for the cap holder to sign (game admin when using game-held cap) and submit via platformTxClient.executeSigned.
   */
  async buildSubmitClaim(
    params: { sessionId: number; claimType: string; payload: Record<string, unknown> | string; gasOwnerAddress?: string; senderAddress?: string },
    options?: CallPlatformBackendOptions
  ): Promise<{ success: boolean; transactionBytesBase64?: string; transaction?: string; message?: string; error?: string }> {
    const senderAddress = params.senderAddress ?? params.gasOwnerAddress ?? options?.senderAddress ?? options?.adminWalletAddress;
    const body = { sessionId: params.sessionId, claimType: params.claimType, payload: params.payload, ...(senderAddress ? { senderAddress } : {}) };
    const res = await callPlatformBackend<{ success: boolean; transactionBytesBase64?: string; message?: string; error?: string }>(
      'api/anchor/claims',
      { method: 'POST', body: JSON.stringify(body), ...options }
    );
    return {
      ...res,
      transaction: res.transactionBytesBase64,
    };
  },
};

/**
 * Aquifer is the generic platform component for milestone definitions, achievement definitions, and the like.
 * Read/write definitions via these methods; evaluate/claim/claimed are implemented by the app/game.
 */
/** Full definitions shape: category -> list of { milestoneId?, threshold, credits, items }. Parsed from Aquifer key "milestone_definitions". */
export type MilestoneFullDefinitions = Record<string, Array<{ milestoneId?: number; threshold: number; credits: number; items?: Array<{ itemId: string; level: number; quantity: number }> }>>;

export const platformMilestonesClient = {
  /**
   * List definitions from Aquifer and return as fullDefinitions.
   * Expects key "milestone_definitions" with base64-encoded JSON of category -> definitions[].
   */
  async getDefinitions(options?: CallPlatformBackendOptions): Promise<{
    success: boolean;
    definitions?: Array<{ key: string; value: string }>;
    fullDefinitions?: MilestoneFullDefinitions;
    error?: string;
  }> {
    const res = await callPlatformBackend<{ success: boolean; definitions?: Array<{ key: string; value: string }>; error?: string }>(
      'api/aquifer/definitions',
      { method: 'GET', ...options }
    );
    if (!res.success || !res.definitions) {
      return res;
    }
    const entry = res.definitions.find((d) => d.key === 'milestone_definitions');
    if (!entry?.value) {
      return { ...res, fullDefinitions: {} };
    }
    try {
      const json = decodeDefinitionValue(entry.value);
      const fullDefinitions = JSON.parse(json) as MilestoneFullDefinitions;
      return { ...res, fullDefinitions: fullDefinitions && typeof fullDefinitions === 'object' ? fullDefinitions : {} };
    } catch {
      return { ...res, fullDefinitions: {} };
    }
  },

  /** Get one definition by key from Aquifer. */
  async getDefinition(
    key: string,
    options?: CallPlatformBackendOptions
  ): Promise<{ success: boolean; key?: string; value?: string; error?: string }> {
    return callPlatformBackend(`api/aquifer/definitions/${encodeURIComponent(key)}`, { method: 'GET', ...options });
  },

  /**
   * Set milestone (or other) definitions in Aquifer. Serializes definitions under key "milestone_definitions".
   * Builds via Channel (aquifer-set-definition), game signs and submits via Channel execute.
   */
  async setDefinitions(
    definitions: Record<string, unknown>,
    options?: CallPlatformBackendOptions
  ): Promise<{ success: boolean; error?: string }> {
    const opts = {
      identityFromCapOnly: true,
      corridorCapabilityObjectId: (options as CallPlatformBackendOptions)?.corridorCapabilityObjectId ?? getCorridorCapabilityObjectIdFromEnv(),
      corridorAdminCapabilityObjectId: (options as CallPlatformBackendOptions)?.corridorAdminCapabilityObjectId ?? getCorridorAdminCapabilityObjectIdFromEnv(),
      ...options,
    };
    const adminCapId = (opts as CallPlatformBackendOptions).corridorAdminCapabilityObjectId;
    if (!adminCapId?.startsWith('0x')) {
      return { success: false, error: 'Aquifer set definitions requires CorridorAdminCap. Set CORRIDOR_ADMIN_CAP_OBJECT_ID_* in game backend config/contracts.<network>.json.' };
    }
    const { getAdminWalletService } = await import('@/lib/services/wallet/admin/admin-wallet-service');
    const adminWallet = getAdminWalletService();
    const senderAddress = adminWallet.getAddress();
    const key = 'milestone_definitions';
    const value = encodeDefinitionValue(JSON.stringify(definitions));
    const batchRes = await buildBatchViaChannel(
      {
        operations: [
          {
            operationId: 'aquifer-set-definition',
            params: {
              key,
              value,
              corridorAdminCapabilityObjectId: adminCapId,
              senderAddress,
            },
          },
        ],
      },
      opts
    );
    if (!batchRes.success || !batchRes.transactions?.length) {
      return { success: false, error: batchRes.error ?? batchRes.errors?.[0] ?? 'Channel build failed' };
    }
    const transactionBytesBase64 = batchRes.transactions[0];
    const txBytes = Buffer.from(transactionBytesBase64, 'base64');
    const signed = await adminWallet.getKeypair().signTransaction(txBytes);
    const signature = typeof signed === 'object' && signed !== null && 'signature' in signed
      ? (signed as { signature: string }).signature
      : String(signed);
    const result = await platformTxClient.executeSigned(
      { transactionBytesBase64, signature },
      opts
    );
    return result.success ? { success: true } : { success: false, error: result.error };
  },

  /** Get claimed IDs for a player (Sustain). */
  async getClaimed(
    address: string,
    options?: CallPlatformBackendOptions
  ): Promise<{ success: boolean; claimedIds?: string[]; error?: string }> {
    const q = new URLSearchParams({ address });
    return callPlatformBackend(`api/sustain/claimed?${q.toString()}`, { method: 'GET', ...options });
  },

  async evaluate(
    params: {
      address: string;
      definitionKey: string;
      stats?: Record<string, unknown>;
    },
    options?: CallPlatformBackendOptions
  ): Promise<{
    success: boolean;
    eligible?: boolean;
    error?: string;
  }> {
    return callPlatformBackend('api/sustain/evaluate', {
      method: 'POST',
      body: JSON.stringify(params),
      ...options,
    });
  },

  async claim(
    params: {
      address: string;
      claimId: string;
      definitionKey: string;
      stats?: Record<string, unknown>;
      adminWalletAddress?: string;
    },
    options?: CallPlatformBackendOptions
  ): Promise<{
    success: boolean;
    address?: string;
    claimId?: string;
    definitionKey?: string;
    ecosystemId?: string;
    /** Unsigned tx(s) base64 — from Channel batch (only Channel builds). Sign with payerAddress and submit via channel execute. */
    transactions?: string[];
    payerAddress?: string;
    message?: string;
    error?: string;
  }> {
    const body = { ...params };
    if (options?.adminWalletAddress) body.adminWalletAddress = options.adminWalletAddress;
    const claimRes = await callPlatformBackend('api/sustain/claim', {
      method: 'POST',
      body: JSON.stringify(body),
      ...options,
    }) as {
      success: boolean;
      channelBuildParams?: { operationId: string; params: Record<string, unknown> };
      payerAddress?: string;
      message?: string;
      error?: string;
    };
    if (!claimRes.success || !claimRes.channelBuildParams) {
      return claimRes;
    }
    const batchRes = await callPlatformBackend('api/channel/batch', {
      method: 'POST',
      body: JSON.stringify({
        operations: [{
          operationId: claimRes.channelBuildParams.operationId,
          params: claimRes.channelBuildParams.params,
        }],
      }),
      ...options,
    }) as { success?: boolean; transactions?: string[]; errors?: string[] };
    return {
      ...claimRes,
      transactions: batchRes.transactions ?? [],
      message: batchRes.transactions?.length
        ? 'Sign each transaction with payerAddress and submit via POST /api/channel/execute.'
        : claimRes.message,
    };
  },
};

/**
 * Insignia API Client — per-wallet progression state for the corridor app (opaque key → value, base64).
 * GET `api/insignia/{address}`. Definitions belong in Aquifer; app tuning in Helm.
 */
export const platformInsigniaClient = {
  async getPlayerConfig(
    walletAddress: string,
    options?: CallPlatformBackendOptions
  ): Promise<{
    success: boolean;
    address?: string;
    config?: Record<string, string>;
    configSource?: string;
    error?: string;
  }> {
    const addr = walletAddress.trim();
    if (!addr.startsWith('0x')) {
      return { success: false, error: 'walletAddress must be a 0x Sui address' };
    }
    return callPlatformBackend(`api/insignia/${encodeURIComponent(addr)}`, { method: 'GET', ...options });
  },

  /**
   * Build (do not execute) a CorridorAdminCap-gated write to Insignia (per-wallet per-app).
   * Returns unsigned tx bytes (base64) which must be signed by `senderAddress` and submitted via Channel execute.
   *
   * Platform endpoint: POST /api/insignia/{address}
   * Body: { key, value, senderAddress } where value is base64 string (opaque).
   */
  async buildSetPlayerEntry(
    walletAddress: string,
    params: { key: string; valueBase64: string; senderAddress: string },
    options?: CallPlatformBackendOptions
  ): Promise<{ success: boolean; transaction?: string; error?: string }> {
    const addr = walletAddress.trim();
    if (!addr.startsWith('0x')) return { success: false, error: 'walletAddress must be a 0x Sui address' };
    const key = (params.key || '').trim();
    const value = (params.valueBase64 || '').trim();
    const senderAddress = (params.senderAddress || '').trim();
    if (!key) return { success: false, error: 'key is required' };
    if (!value) return { success: false, error: 'valueBase64 is required' };
    if (!senderAddress.startsWith('0x')) return { success: false, error: 'senderAddress must be a 0x Sui address' };
    const res = await callPlatformBackend(`api/insignia/${encodeURIComponent(addr)}`, {
      method: 'POST',
      body: JSON.stringify({ key, value, senderAddress }),
      ...options,
    }) as { success?: boolean; transaction?: string; transactionBytesBase64?: string; error?: string };

    // Platform returns `transactionBytesBase64`; normalize to `transaction` for game-side helpers.
    if (res && res.success === true) {
      return {
        success: true,
        transaction: (res.transaction ?? res.transactionBytesBase64) as string | undefined,
      };
    }
    return { success: false, error: res?.error ?? 'Failed to build insignia set tx' };
  },

  /**
   * Build (do not execute) a CorridorAdminCap-gated delete from Insignia (per-wallet per-app).
   * Returns unsigned tx bytes (base64) which must be signed by `senderAddress` and submitted via Channel execute.
   *
   * Platform endpoint: DELETE /api/insignia/{address}?key=...
   */
  async buildRemovePlayerEntry(
    walletAddress: string,
    params: { key: string; senderAddress: string },
    options?: CallPlatformBackendOptions
  ): Promise<{ success: boolean; transaction?: string; error?: string }> {
    const addr = walletAddress.trim();
    if (!addr.startsWith('0x')) return { success: false, error: 'walletAddress must be a 0x Sui address' };
    const key = (params.key || '').trim();
    const senderAddress = (params.senderAddress || '').trim();
    if (!key) return { success: false, error: 'key is required' };
    if (!senderAddress.startsWith('0x')) return { success: false, error: 'senderAddress must be a 0x Sui address' };
    const q = new URLSearchParams({ key });
    const res = await callPlatformBackend(`api/insignia/${encodeURIComponent(addr)}?${q.toString()}`, {
      method: 'DELETE',
      body: JSON.stringify({ senderAddress }),
      ...options,
    }) as { success?: boolean; transaction?: string; transactionBytesBase64?: string; error?: string };

    if (res && res.success === true) {
      return {
        success: true,
        transaction: (res.transaction ?? res.transactionBytesBase64) as string | undefined,
      };
    }
    return { success: false, error: res?.error ?? 'Failed to build insignia remove tx' };
  },
};

/**
 * App Config API Client (Helm)
 * App-, game-, and utility-level behavior config (how the app behaves). GET returns all config entries; values are base64.
 * Use for pack_configs, min_token_balance, ticket_bundles, feature flags, etc. Definitions → Aquifer; player state → Insignia.
 */
/** Decoded event distribution config from Helm (Phase 2). */
export interface EventDistributionConfigFromPlatform {
  grace_period_ms?: number;
  auto_distribute?: boolean;
  max_retries?: number;
  max_concurrent_distributions?: number;
}

export const platformAppConfigClient = {
  async getAppConfig(options?: CallPlatformBackendOptions): Promise<{
    success: boolean;
    config?: Record<string, string>;
    configSource?: string;
    error?: string;
  }> {
    return callPlatformBackend('api/helm', { method: 'GET', ...options });
  },

  /**
   * Get decoded event_distribution_config from platform (Helm). Used for grace period and distribution policy.
   * Returns null when platform is unavailable or key is not set.
   */
  async getEventDistributionConfig(options?: CallPlatformBackendOptions): Promise<{
    success: boolean;
    eventDistributionConfig?: EventDistributionConfigFromPlatform | null;
    error?: string;
  }> {
    try {
      const res = await callPlatformBackend('api/helm/event-distribution-config', { method: 'GET', ...options });
      return {
        success: res.success === true,
        eventDistributionConfig: res.eventDistributionConfig ?? null,
      };
    } catch (e) {
      return { success: false, eventDistributionConfig: null, error: e instanceof Error ? e.message : String(e) };
    }
  },

  /**
   * Get decoded creator_reward_config from platform (Helm). Used for creator reward policy (pay from pool first).
   */
  async getCreatorRewardConfig(options?: CallPlatformBackendOptions): Promise<{
    success: boolean;
    creatorRewardConfig?: {
      creator_reward_enabled?: boolean;
      creator_reward_creation_fee_usd_cents?: number;
      creator_reward_boost_percentage?: number;
      creator_reward_standard_percentage?: number;
      creator_reward_token?: 'MEWS' | 'SUI' | 'USDC';
    } | null;
    error?: string;
  }> {
    try {
      const res = await callPlatformBackend('api/helm/creator-reward-config', { method: 'GET', ...options });
      return {
        success: res.success === true,
        creatorRewardConfig: res.creatorRewardConfig ?? null,
      };
    } catch (e) {
      return { success: false, creatorRewardConfig: null, error: e instanceof Error ? e.message : String(e) };
    }
  },

  /**
   * Get decoded tide_callback_config from platform (Helm). Used for per-app Tide callback URL.
   */
  async getTideCallbackConfig(options?: CallPlatformBackendOptions): Promise<{
    success: boolean;
    tideCallbackConfig?: { callback_url?: string } | null;
    error?: string;
  }> {
    try {
      const res = await callPlatformBackend('api/helm/tide-callback-config', { method: 'GET', ...options });
      return {
        success: res.success === true,
        tideCallbackConfig: res.tideCallbackConfig ?? null,
      };
    } catch (e) {
      return { success: false, tideCallbackConfig: null, error: e instanceof Error ? e.message : String(e) };
    }
  },

  /**
   * Set one app config entry. Body: { key, value } (value base64). Requires ecosystem API key and sender (adminWalletAddress or senderAddress).
   * Platform expects senderAddress in body when returning a tx to sign.
   */
  async setAppConfig(
    params: { key: string; value: string; adminWalletAddress?: string; senderAddress?: string },
    options?: CallPlatformBackendOptions
  ): Promise<{ success: boolean; transactionBytesBase64?: string; message?: string; digest?: string; error?: string }> {
    const senderAddress = params.senderAddress ?? params.adminWalletAddress;
    const body = { key: params.key, value: params.value, ...(senderAddress ? { senderAddress } : {}) };
    return callPlatformBackend('api/helm', {
      method: 'POST',
      body: JSON.stringify(body),
      ...options,
    });
  },
};

/**
 * Config API Client
 * Platform config (network, rpcUrl, walletModuleUrl, etc.) for frontend or game.
 * Pass options.ecosystemId or rely on ECOSYSTEM_ID from env (no default).
 */
export const platformConfigClient = {
  async getConfig(options?: CallPlatformBackendOptions): Promise<{
    success: boolean;
    network?: string;
    rpcUrl?: string;
    walletModuleUrl?: string;
    storageKey?: string;
    error?: string;
  }> {
    return callPlatformBackend('api/estuary/connect', { method: 'GET', ...options });
  },
};

/** Aligns with platform `getWalletBalance` default when `coinType` is omitted. */
const SONAR_BALANCE_DEFAULT_COIN_TYPE = '0x2::sui::SUI';

/**
 * Sonar balance (read-only chain query) via POST /api/sonar/batch (getBalance leg).
 * Same response shape as the legacy GET /api/sonar/balance/[address] helper for callers.
 * Gatekeeping (min balance) is game-specific — apply in game routes.
 */
export const platformSonarBalanceClient = {
  async getBalance(
    address: string,
    options?: CallPlatformBackendOptions & { coinType?: string }
  ): Promise<{
    success: boolean;
    address: string;
    totalBalance: string;
    coinType: string;
    error?: string;
  }> {
    const { coinType: coinTypeOpt, ...rest } = options ?? {};
    const trimmed = coinTypeOpt?.trim();
    const params: Record<string, unknown> = { owner: address };
    if (trimmed) params.coinType = trimmed;
    const coinTypeLabel = trimmed || SONAR_BALANCE_DEFAULT_COIN_TYPE;

    const batch = await callPlatformSonarBatch([{ id: 'balance', method: 'getBalance', params }], rest);
    if (!batch.success) {
      return {
        success: false,
        address,
        totalBalance: '0',
        coinType: coinTypeLabel,
        error: batch.error,
      };
    }
    const item = batch.results.find((r) => r.id === 'balance') ?? batch.results[0];
    if (!item) {
      return {
        success: false,
        address,
        totalBalance: '0',
        coinType: coinTypeLabel,
        error: 'Sonar batch: empty results',
      };
    }
    if (!item.success) {
      return {
        success: false,
        address,
        totalBalance: '0',
        coinType: coinTypeLabel,
        error: item.error,
      };
    }
    const data = item.data as { totalBalance?: string; coinType?: string };
    const totalBalance = data?.totalBalance != null ? String(data.totalBalance) : '0';
    const coinType =
      typeof data?.coinType === 'string' && data.coinType.trim() !== '' ? data.coinType : coinTypeLabel;
    return {
      success: true,
      address,
      totalBalance,
      coinType,
    };
  },
};

/** @deprecated Use platformSonarBalanceClient.getBalance; kept for compatibility. */
export const platformTokensClient = platformSonarBalanceClient;

/**
 * Sign pre-built transaction bytes and submit via platform (POST /api/channel/execute).
 * All transaction execution goes through the channel; use this when you have bytes from buildBatchViaChannel or buildTransactionBytesWithClient.
 */
export async function signAndExecuteSigned(params: {
  keypair: import('@mysten/sui/cryptography').Keypair;
  transactionBytesBase64: string;
  options?: CallPlatformBackendOptions;
}): Promise<{ success: boolean; digest?: string; error?: string }> {
  const { keypair, transactionBytesBase64, options } = params;
  const txBytesBuf = Buffer.from(transactionBytesBase64, 'base64');
  const signed = await keypair.signTransaction(txBytesBuf);
  const signature = typeof signed === 'object' && signed !== null && 'signature' in signed
    ? (signed as { signature: string }).signature
    : String(signed);
  return platformTxClient.executeSigned(
    { transactionBytesBase64, signature },
    options
  );
}

/**
 * Build a transaction using the given client (e.g. for gas price). Use only when no channel build exists for this operation.
 * Prefer buildBatchViaChannel so building also goes through the platform.
 */
export async function buildTransactionBytesWithClient(
  txb: import('@mysten/sui/transactions').Transaction,
  client: import('@mysten/sui/client').SuiClient
): Promise<string> {
  const txBytes = await txb.build({ client });
  const buf = Buffer.isBuffer(txBytes)
    ? txBytes
    : Buffer.from(txBytes instanceof Uint8Array ? txBytes : new Uint8Array(txBytes as ArrayBuffer));
  return buf.toString('base64');
}

/**
 * Build a transaction via platform (or with client if provided), sign with keypair, and submit via platform (POST /api/channel/execute).
 * When client is omitted, builds transaction kind bytes locally and uses platform Sonar buildTransaction (no direct chain). Prefer omitting client.
 */
export async function signAndSubmitViaPlatform(params: {
  /** Optional: use only when platform build fails (e.g. unresolved refs). When omitted, build goes through platform Sonar buildTransaction. */
  client?: import('@mysten/sui/client').SuiClient;
  keypair: import('@mysten/sui/cryptography').Keypair;
  /** Transaction to build and submit */
  txb: import('@mysten/sui/transactions').Transaction;
  options?: CallPlatformBackendOptions;
}): Promise<{ success: boolean; digest?: string; error?: string }> {
  const { client, keypair, txb, options } = params;
  let transactionBytesBase64: string;
  if (client) {
    transactionBytesBase64 = await buildTransactionBytesWithClient(txb, client);
  } else {
    const sender = (keypair as { toSuiAddress: () => string }).toSuiAddress();
    const kindBytes = await (txb as { build: (opts: { onlyTransactionKind?: boolean }) => Promise<Uint8Array> }).build({ onlyTransactionKind: true });
    const gasBudget = (txb as { getData?: () => { gasData?: { budget?: number } } }).getData?.()?.gasData?.budget;
    const built = await platformSonarClient.buildTransaction({
      transactionKindBytesBase64: toBase64(kindBytes),
      sender,
      gasBudget: typeof gasBudget === 'number' ? gasBudget : undefined,
    });
    transactionBytesBase64 = built.transactionBytesBase64;
  }
  return signAndExecuteSigned({ keypair, transactionBytesBase64, options });
}

/**
 * Build one or more transactions via Aqueduct Channel (POST /api/channel/batch).
 * Uses dry-run for gas estimation. Returns unsigned tx(s) for the game to sign and submit via executeSigned.
 */
export async function buildBatchViaChannel(
  params: {
    operations: Array<{ operationId: string; params: Record<string, unknown> }>;
  },
  options?: CallPlatformBackendOptions
): Promise<{
  success: boolean;
  transactions?: string[];
  errors?: string[];
  gasEstimateMist?: number;
  error?: string;
}> {
  const body: { operations: typeof params.operations } = {
    operations: params.operations,
  };
  return callPlatformBackend('api/channel/batch', {
    method: 'POST',
    body: JSON.stringify(body),
    ...options,
  });
}

/**
 * Submit a signed transaction via platform (POST /api/channel/execute).
 * Use when platform returns tx bytes and game signs; game sends signed tx to platform to submit (no direct SuiClient).
 */
export const platformTxClient = {
  async executeSigned(
    params: { transactionBytesBase64: string; signature: string },
    options?: ChannelExecuteSignedOptions
  ): Promise<{
    success: boolean;
    digest?: string;
    effects?: unknown;
    objectChanges?: unknown;
    results?: unknown;
    events?: Array<{ type: string; parsedJson?: Record<string, unknown> }>;
    error?: string;
  }> {
    const { channelExecuteLogContext, ...restOptions } = options ?? {};
    const txLen = params.transactionBytesBase64?.length ?? 0;
    const ctx = channelExecuteLogContext;
    if (ctx && Object.keys(ctx).length > 0) {
      PlatformLogger.info('[CHANNEL] executeSigned request', {
        ...ctx,
        transactionBytesBase64Length: txLen,
      });
    }

    const result = await callPlatformBackend<{
      success: boolean;
      digest?: string;
      effects?: unknown;
      objectChanges?: unknown;
      results?: unknown;
      events?: Array<{ type: string; parsedJson?: Record<string, unknown> }>;
      error?: string;
    }>('api/channel/execute', {
      method: 'POST',
      body: JSON.stringify({
        transactionBytesBase64: params.transactionBytesBase64,
        signature: params.signature,
      }),
      ...restOptions,
    });

    if (!result.success) {
      const err = String(result.error ?? '');
      const errLower = err.toLowerCase();
      PlatformLogger.error('[CHANNEL] executeSigned failed', {
        ...(ctx ?? {}),
        transactionBytesBase64Length: txLen,
        errorLength: err.length,
        errorPrefix: err.slice(0, 800),
        looksLikeDynamicFieldAddAbort:
          errLower.includes('identifier("dynamic_field")') &&
          errLower.includes('function_name: some("add")') &&
          errLower.includes(' in command'),
      });
    } else if (ctx && Object.keys(ctx).length > 0) {
      PlatformLogger.transaction('[CHANNEL] executeSigned ok', {
        ...ctx,
        digest: result.digest,
      });
    }

    return result;
  },
};

/**
 * Gauge: price discovery from the platform (single source of truth for token USD values).
 * GET /api/gauge. Use when the game should align token values with the platform (e.g. ticket value, store).
 */
export const platformGaugeClient = {
  async getTokenPrices(
    options?: CallPlatformBackendOptions
  ): Promise<{
    success: boolean;
    prices?: { sui: number; mews: number; usdc: number };
    sources?: { sui: string; mews: string; usdc: string };
    timestamp?: number;
    error?: string;
  }> {
    return callPlatformBackend('api/gauge', { method: 'GET', ...options });
  },
};

export function getDefaultBadgeCollectionId(_ecosystemId?: string): string {
  // Primary source: backend config (contracts.badgeCollectionName), which comes from
  // config/contracts.<network>.json via BADGE_COLLECTION_NAME, without requiring .env.
  const fromConfig = getConfig().contracts.badgeCollectionName?.trim();
  if (fromConfig) return fromConfig;

  // Optional override: env var, if explicitly set.
  const fromEnv =
    typeof process !== 'undefined' && process.env.BADGE_COLLECTION_NAME?.trim();
  if (fromEnv) return fromEnv;

  // Final fallback: baked-in default to keep behavior stable if config is missing.
  return 'SuiTwo Shooter Game Player Badges';
}

/**
 * Check if an address owns a platform-minted soulbound badge (ShipyardNFT).
 * Sends only X-Corridor-Capability-Object-Id and X-API-Key; platform derives ecosystem/app from the cap.
 * IMPORTANT: collectionId filtering is OPTIONAL.
 * Historically, the game treated "any Shipyard soulbound badge for this corridor/app" as valid.
 * Passing a collectionId can break previously-minted badges if the collection name/config changes.
 */
export async function getHasSoulboundBadge(
  address: string,
  options?: CallPlatformBackendOptions & { collectionId?: string }
): Promise<{ success: boolean; hasBadge: boolean; badgeId?: string; error?: string }> {
  const q = new URLSearchParams({ address });
  const collectionId = options?.collectionId;
  if (typeof collectionId === 'string' && collectionId.trim() !== '') {
    q.set('collectionId', collectionId.trim());
  }
  return callPlatformBackend(`api/shipyard/has-badge?${q.toString()}`, {
    ...options,
    method: 'GET',
    identityFromCapOnly: true,
    corridorCapabilityObjectId: options?.corridorCapabilityObjectId ?? (getCorridorCapabilityObjectIdFromEnv() || undefined),
  });
}

/** Match `SoulboundMintPermit` in Sui `objectChanges` after `issue_soulbound_mint_permit`. */
const SOULBOUND_MINT_PERMIT_TYPE_FRAGMENT = '::shipyard::SoulboundMintPermit';

export function findSoulboundMintPermitCreatedObjectId(objectChanges: unknown): string | undefined {
  if (!Array.isArray(objectChanges)) return undefined;
  for (const raw of objectChanges) {
    if (!raw || typeof raw !== 'object') continue;
    const ch = raw as Record<string, unknown>;
    if (ch.type !== 'created') continue;
    const objectType = String(ch.objectType ?? ch.object_type ?? '');
    if (!objectType.includes(SOULBOUND_MINT_PERMIT_TYPE_FRAGMENT)) continue;
    const id = ch.objectId ?? ch.object_id;
    if (typeof id === 'string' && id.startsWith('0x')) return id;
  }
  return undefined;
}

/**
 * Build tx that issues a `SoulboundMintPermit` to the player. Game admin wallet must sign and execute (owns `CorridorAdminCap`).
 */
export async function buildShipyardIssueSoulboundMintPermit(
  params: {
    recipient: string;
    sender: string;
    metadata?: Record<string, unknown>;
    collectionId?: string;
  },
  options?: CallPlatformBackendOptions
): Promise<{ success: boolean; transaction?: string; error?: string }> {
  if (!params.recipient.startsWith('0x')) {
    return { success: false, error: 'recipient is required and must be a valid Sui address (0x...)' };
  }
  if (!params.sender.startsWith('0x')) {
    return { success: false, error: 'sender must be the game admin address (0x...) that owns CorridorAdminCap' };
  }
  const metadata = params.metadata ?? {};
  const name = typeof metadata.name === 'string' ? metadata.name.trim() : '';
  const imageUrl = typeof metadata.image_url === 'string' ? metadata.image_url.trim() : '';
  if (!name || !imageUrl) {
    return {
      success: false,
      error: 'metadata.name and metadata.image_url are required (non-empty strings) for Shipyard permit issue.',
    };
  }
  const corridorAdminCapId = (options?.corridorAdminCapabilityObjectId ?? getCorridorAdminCapabilityObjectIdFromEnv())?.trim();
  if (!corridorAdminCapId?.startsWith('0x')) {
    return {
      success: false,
      error:
        'CORRIDOR_ADMIN_CAP_OBJECT_ID (or corridorAdminCapabilityObjectId in options) is required for shipyard-issue-soulbound-mint-permit.',
    };
  }
  const collectionId =
    typeof params.collectionId === 'string' && params.collectionId.trim() !== ''
      ? params.collectionId.trim()
      : undefined;
  const opts = {
    identityFromCapOnly: true,
    corridorCapabilityObjectId: options?.corridorCapabilityObjectId ?? (getCorridorCapabilityObjectIdFromEnv() || undefined),
    ...options,
  };
  const res = await buildBatchViaChannel(
    {
      operations: [
        {
          operationId: 'shipyard-issue-soulbound-mint-permit',
          params: {
            recipient: params.recipient,
            sender: params.sender,
            ...(collectionId ? { collectionId } : {}),
            corridorAdminCapId,
            metadata: params.metadata ?? {},
          },
        },
      ],
    },
    opts
  );
  if (!res.success) {
    return { success: false, error: res.error ?? res.errors?.[0] ?? 'Build failed' };
  }
  const transaction = res.transactions?.[0];
  if (!transaction) {
    return { success: false, error: res.errors?.[0] ?? 'No transaction returned' };
  }
  return { success: true, transaction };
}

/**
 * Build tx that consumes a `SoulboundMintPermit` and mints the soulbound NFT. **Player** (`sender`) signs.
 */
export async function buildShipyardMintSoulboundWithPermit(
  params: { sender: string; permitObjectId: string; embeddedImage?: boolean },
  options?: CallPlatformBackendOptions
): Promise<{ success: boolean; transaction?: string; error?: string }> {
  if (!params.sender.startsWith('0x')) {
    return { success: false, error: 'sender (player 0x address) is required' };
  }
  if (!params.permitObjectId.startsWith('0x')) {
    return { success: false, error: 'permitObjectId (0x...) is required' };
  }
  const opts = {
    identityFromCapOnly: true,
    corridorCapabilityObjectId: options?.corridorCapabilityObjectId ?? (getCorridorCapabilityObjectIdFromEnv() || undefined),
    ...options,
  };
  const res = await buildBatchViaChannel(
    {
      operations: [
        {
          operationId: 'shipyard-mint-soulbound-with-permit',
          params: {
            sender: params.sender,
            permitObjectId: params.permitObjectId,
            embeddedImage: params.embeddedImage === true,
          },
        },
      ],
    },
    opts
  );
  if (!res.success) {
    return { success: false, error: res.error ?? res.errors?.[0] ?? 'Build failed' };
  }
  const transaction = res.transactions?.[0];
  if (!transaction) {
    return { success: false, error: res.errors?.[0] ?? 'No transaction returned' };
  }
  return { success: true, transaction };
}

/**
 * Build a single PTB for badge mint that includes **game fee payment** (player → game admin) and **Shipyard mint** (consume permit).
 * Player signs once.
 */
/**
 * Build Shipyard soulbound badge mint transaction via Channel (shipyard-mint).
 * Returns unsigned tx (base64) for the signer to sign; then submit via platformTxClient.executeSigned.
 * Sends only X-Corridor-Capability-Object-Id and X-API-Key; platform derives ecosystem/app from the cap.
 *
 * Shipyard requires: recipient (0x), metadata.name (non-empty), metadata.image_url (non-empty).
 * Channel `shipyard-mint` uses `mint_with_corridor_admin_cap`; the **signer must own `corridorAdminCapId`** (e.g. game admin self-mint).
 * **Player** badge mint from the app uses permit issue + `buildShipyardMintSoulboundWithPermit` inside `BadgeService.buildMintBadgeTransaction`.
 * Optional: collectionId, metadata.description, metadata.attributes, etc.
 */
export async function buildShipyardBadgeMint(
  params: { recipient: string; sender?: string; metadata?: Record<string, unknown>; collectionId?: string },
  options?: CallPlatformBackendOptions
): Promise<{ success: boolean; transaction?: string; error?: string }> {
  if (!params.recipient || !params.recipient.startsWith('0x')) {
    return { success: false, error: 'recipient is required and must be a valid Sui address (0x...)' };
  }
  const metadata = params.metadata ?? {};
  const name = typeof metadata.name === 'string' ? metadata.name.trim() : '';
  const imageUrl = typeof metadata.image_url === 'string' ? metadata.image_url.trim() : '';
  if (!name || !imageUrl) {
    return {
      success: false,
      error: 'metadata.name and metadata.image_url are required (non-empty strings) for Shipyard mint.',
    };
  }
  const corridorAdminCapId = (options?.corridorAdminCapabilityObjectId ?? getCorridorAdminCapabilityObjectIdFromEnv())?.trim();
  if (!corridorAdminCapId?.startsWith('0x')) {
    return {
      success: false,
      error:
        'CORRIDOR_ADMIN_CAP_OBJECT_ID (or corridorAdminCapabilityObjectId in options) is required for shipyard-mint; platform builds mint_with_corridor_admin_cap.',
    };
  }
  const collectionId =
    typeof params.collectionId === 'string' && params.collectionId.trim() !== ''
      ? params.collectionId.trim()
      : undefined;
  const sender = params.sender && params.sender.startsWith('0x') ? params.sender : params.recipient;
  const opts = {
    identityFromCapOnly: true,
    corridorCapabilityObjectId: options?.corridorCapabilityObjectId ?? (getCorridorCapabilityObjectIdFromEnv() || undefined),
    ...options,
  };
  const res = await buildBatchViaChannel(
    {
      operations: [
        {
          operationId: 'shipyard-mint',
          params: {
            recipient: params.recipient,
            sender,
            soulbound: true,
            ...(collectionId ? { collectionId } : {}),
            corridorAdminCapId,
            metadata: params.metadata ?? {},
          },
        },
      ],
    },
    opts
  );
  if (!res.success) {
    return { success: false, error: res.error ?? res.errors?.[0] ?? 'Build failed' };
  }
  const transaction = res.transactions?.[0];
  if (!transaction) {
    return { success: false, error: res.errors?.[0] ?? 'No transaction returned' };
  }
  return { success: true, transaction };
}

/**
 * Build Shipyard soulbound badge upgrade transaction. Returns unsigned tx (base64) for the player to sign and submit.
 * Tier definitions (name, image_url for metadata) should come from platform app-config (badgeConfig derived from Aquifer badge_discounts_and_thresholds); see docs/platform/nft/BADGE_TIER_PLATFORM_FLOW.md.
 * Sends only X-Corridor-Capability-Object-Id and X-API-Key; platform derives ecosystem/app from the cap.
 */
export async function buildShipyardBadgeUpgrade(
  params: {
    sender: string;
    nftObjectId: string;
    metadata: { name: string; image_url: string; description?: string; [k: string]: unknown };
  },
  options?: CallPlatformBackendOptions
): Promise<{ success: boolean; transactionBytesBase64?: string; transaction?: string; message?: string; error?: string }> {
  const res = await callPlatformBackend<{ success: boolean; transactionBytesBase64?: string; message?: string; error?: string }>(
    'api/shipyard/upgrade',
    {
      ...options,
      method: 'POST',
      identityFromCapOnly: true,
      corridorCapabilityObjectId: options?.corridorCapabilityObjectId ?? (getCorridorCapabilityObjectIdFromEnv() || undefined),
      body: JSON.stringify({
        sender: params.sender,
        nftObjectId: params.nftObjectId,
        soulbound: true,
        metadata: params.metadata,
      }),
    }
  );
  return { ...res, transaction: res.transactionBytesBase64 };
}

/**
 * Badge tier config used by NFT metadata / upgrade flows.
 * For MVP, we derive it from the same Aquifer definition that powers badgeConfig (badge_discounts_and_thresholds).
 */
export interface BadgeTierConfig {
  thresholds: number[];
  tiers: Array<{
    tier: number;
    label: string;
    minGames: number;
    imageUrl: string;
    storeDiscount: number;
    gameplayDiscount: number;
  }>;
}

/** Same shape as platform / game `badgeConfig` (Aquifer badge_discounts_and_thresholds). */
export type BadgeConfigThresholdInput = {
  thresholds?: number[];
  storeDiscounts?: number[];
  gameplayDiscounts?: number[];
};

/**
 * Pure: build tier upgrade thresholds from badgeConfig (no I/O).
 * Matches GET /api/game-config and menu bootstrap `gameConfig.config.badgeConfig`.
 */
export function badgeConfigToBadgeTierConfig(
  cfg: BadgeConfigThresholdInput | null | undefined
): BadgeTierConfig | null {
  if (!cfg) return null;
  const thresholds = Array.isArray(cfg.thresholds) ? cfg.thresholds : [];
  const tiers: BadgeTierConfig['tiers'] = thresholds.map((minGames, idx) => ({
    tier: idx + 1,
    label: ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'][idx] ?? `Tier ${idx + 1}`,
    minGames,
    imageUrl: '',
    storeDiscount: Array.isArray(cfg.storeDiscounts) ? cfg.storeDiscounts[idx] ?? 0 : 0,
    gameplayDiscount: Array.isArray(cfg.gameplayDiscounts) ? cfg.gameplayDiscounts[idx] ?? 0 : 0,
  }));
  return { thresholds, tiers };
}

/**
 * Get badge tier definitions from the platform by reusing the badgeConfig already loaded via app-config.
 * Returns null if badgeConfig is missing, so callers can fall back to defaults.
 */
export async function getBadgeTierConfigFromPlatform(
  options?: CallPlatformBackendOptions
): Promise<BadgeTierConfig | null> {
  const appConfig = await fetchPlatformAppConfig().catch(() => null);
  return badgeConfigToBadgeTierConfig(appConfig?.badgeConfig ?? null);
}

export type PlatformSonarBatchItemResult =
  | { id: string; success: true; data: unknown }
  | { id: string; success: false; error: string };

export type PlatformSonarBatchResponse =
  | { success: true; results: PlatformSonarBatchItemResult[] }
  | { success: false; error: string };

/** One leg for POST api/sonar/batch (matches platform SonarBatchOperationInput). */
export type PlatformSonarBatchOperationInput = {
  id: string;
  method: string;
  params?: Record<string, unknown>;
  /** Platform merges all pages for getDynamicFields, getCoins, getOwnedObjects, queryEvents. */
  autoPaginate?: boolean;
  maxPages?: number;
  maxRows?: number;
};

function isLogSonarBatchLoud(): boolean {
  const v = process.env.LOG_SONAR_BATCH?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

/**
 * Multiple independent Sonar reads in one HTTP round-trip (platform POST /api/sonar/batch).
 * Platform enforces a per-request operation cap (currently 32).
 *
 * Prefer platform-owned HTTP endpoints when a flow is shared across apps (catalog, events list, etc.);
 * use this from the game for ad-hoc multi-reads that are game-specific. The platform runs the same
 * `executeSonarBatch` in-process for those routes.
 *
 * Per-operation `autoPaginate` (getDynamicFields, getCoins, getOwnedObjects, queryEvents): platform
 * follows cursors server-side and returns merged `data` (see platform `sonar-batch.ts` caps).
 *
 * Verification: set `LOG_SONAR_BATCH=true` in the game backend `.env` and grep logs for `[SONAR_BATCH]`.
 * On the platform, set the same env to log when the batch route handles a request.
 */
export async function callPlatformSonarBatch(
  operations: ReadonlyArray<PlatformSonarBatchOperationInput>,
  options?: CallPlatformBackendOptions
): Promise<PlatformSonarBatchResponse> {
  const summary = {
    path: 'api/sonar/batch',
    opCount: operations.length,
    methods: operations.map((o) => o.method),
    ids: operations.map((o) => o.id),
  };
  if (isLogSonarBatchLoud()) {
    PlatformLogger.info('[SONAR_BATCH] game → platform', summary);
  } else {
    PlatformLogger.debug('[SONAR_BATCH] game → platform', summary);
  }

  return callPlatformBackend<PlatformSonarBatchResponse>('api/sonar/batch', {
    method: 'POST',
    body: JSON.stringify({ operations: [...operations] }),
    ...options,
  });
}

async function sonarSingleOp(
  method: string,
  params: Record<string, unknown>,
  options?: CallPlatformBackendOptions
): Promise<unknown> {
  const res = await callPlatformSonarBatch([{ id: '0', method, params }], options);
  if (!res.success) throw new Error(res.error || 'Sonar batch failed');
  const item = res.results[0];
  if (!item) throw new Error('Sonar batch: empty results');
  if (!item.success) throw new Error(item.error || `${method} failed`);
  return item.data;
}

/**
 * Aqueduct Sonar — read-only chain queries via platform POST /api/sonar/batch (one op per call; same path as multi-op batching).
 */
export const platformSonarClient = {
  async getObject(
    id: string,
    options?: { showContent?: boolean; showOwner?: boolean; showType?: boolean; showDisplay?: boolean; showPreviousTransaction?: boolean; showStorageRebate?: boolean; showBcs?: boolean }
  ): Promise<unknown> {
    return sonarSingleOp('getObject', { id, options: options ?? {} });
  },

  async getDynamicFields(params: { parentId: string; limit?: number; cursor?: string }): Promise<unknown> {
    return sonarSingleOp('getDynamicFields', {
      parentId: params.parentId,
      limit: params.limit ?? 50,
      cursor: params.cursor,
    });
  },

  async getTransactionBlock(params: { digest: string; options?: Record<string, unknown> }): Promise<unknown> {
    return sonarSingleOp('getTransactionBlock', { digest: params.digest, options: params.options });
  },

  async getDynamicFieldObject(params: { parentId: string; name: unknown }): Promise<unknown> {
    return sonarSingleOp('getDynamicFieldObject', { parentId: params.parentId, name: params.name });
  },

  async waitForTransaction(params: {
    digest: string;
    options?: Record<string, unknown>;
    timeout?: number;
    pollInterval?: number;
  }): Promise<unknown> {
    return sonarSingleOp('waitForTransaction', {
      digest: params.digest,
      options: params.options,
      timeout: params.timeout,
      pollInterval: params.pollInterval,
    });
  },

  /** Call with transactionBlockBytes (base64). For Transaction objects use getSonarClient().devInspectTransactionBlock. */
  async devInspectTransactionBlock(params: { sender: string; transactionBlockBytes: string }): Promise<unknown> {
    return sonarSingleOp('devInspectTransactionBlock', {
      sender: params.sender,
      transactionBlockBytes: params.transactionBlockBytes,
    });
  },

  async getCoins(params: { owner: string; coinType?: string; limit?: number; cursor?: string }): Promise<unknown> {
    return sonarSingleOp('getCoins', {
      owner: params.owner,
      coinType: params.coinType,
      limit: params.limit ?? 50,
      cursor: params.cursor,
    });
  },

  async getBalance(params: { owner: string; coinType?: string }): Promise<unknown> {
    return sonarSingleOp('getBalance', { owner: params.owner, coinType: params.coinType });
  },

  async queryEvents(params: {
    query: Record<string, unknown>;
    limit?: number;
    order?: 'ascending' | 'descending';
    cursor?: unknown;
  }): Promise<unknown> {
    return sonarSingleOp('queryEvents', {
      query: params.query,
      limit: params.limit ?? 50,
      order: params.order ?? 'descending',
      ...(params.cursor != null ? { cursor: params.cursor } : {}),
    });
  },

  async getOwnedObjects(params: {
    owner: string;
    options?: Record<string, unknown>;
    cursor?: string;
    limit?: number;
  }): Promise<unknown> {
    return sonarSingleOp('getOwnedObjects', {
      owner: params.owner,
      options: params.options,
      cursor: params.cursor,
      limit: params.limit ?? 50,
    });
  },

  async getNormalizedMoveModule(params: { package: string; module: string }): Promise<unknown> {
    return sonarSingleOp('getNormalizedMoveModule', { packageId: params.package, module: params.module });
  },

  /** Build full transaction from kind bytes (platform adds gas via Channel). Returns { transactionBytesBase64 }. Uses Channel, not Sonar; Sonar is read-only. */
  async buildTransaction(
    params: {
      transactionKindBytesBase64: string;
      sender: string;
      gasBudget?: number;
      minBalanceForGasMist?: number;
    },
    options?: CallPlatformBackendOptions
  ): Promise<{ transactionBytesBase64: string }> {
    const res = await buildBatchViaChannel(
      {
        operations: [
          {
            operationId: 'build-transaction-from-kind',
            params: {
              transactionKindBytesBase64: params.transactionKindBytesBase64,
              sender: params.sender,
              gasBudget: params.gasBudget,
              ...(params.minBalanceForGasMist != null ? { minBalanceForGasMist: params.minBalanceForGasMist } : {}),
            },
          },
        ],
      },
      options
    );
    if (!res.success || !res.transactions?.[0]) throw new Error(res.error || res.errors?.[0] || 'buildTransaction failed');
    return { transactionBytesBase64: res.transactions[0] };
  },
};

/** Sonar client interface — same shape as SuiClient for reads + waitForTransaction + devInspectTransactionBlock + getCoins + getBalance + queryEvents. */
export type SonarClient = {
  getObject: (params: { id: string; options?: object }) => Promise<unknown>;
  getDynamicFields: (params: { parentId: string; limit?: number; cursor?: string }) => Promise<unknown>;
  getTransactionBlock: (params: { digest: string; options?: object }) => Promise<unknown>;
  getDynamicFieldObject: (params: { parentId: string; name: unknown }) => Promise<unknown>;
  waitForTransaction: (params: { digest: string; options?: object; timeout?: number; pollInterval?: number }) => Promise<unknown>;
  devInspectTransactionBlock: (params: { sender: string; transactionBlock: import('@mysten/sui/transactions').Transaction | string | Uint8Array }) => Promise<unknown>;
  getCoins: (params: { owner: string; coinType?: string; limit?: number; cursor?: string }) => Promise<unknown>;
  getBalance: (params: { owner: string; coinType?: string }) => Promise<unknown>;
  queryEvents: (params: { query: Record<string, unknown>; limit?: number; order?: 'ascending' | 'descending'; cursor?: unknown }) => Promise<unknown>;
  getOwnedObjects: (params: { owner: string; options?: Record<string, unknown>; cursor?: string; limit?: number }) => Promise<unknown>;
  getNormalizedMoveModule: (params: { package: string; module: string }) => Promise<unknown>;
};

/**
 * Returns the platform Sonar client. All reads and devInspect go through the platform (POST /api/sonar/batch, one op per call).
 * For multiple independent reads, use callPlatformSonarBatch. The game must not call the chain directly.
 */
export function getSonarClient(): SonarClient {
  return {
    getObject: (params) => platformSonarClient.getObject(params.id, params.options as Record<string, unknown> | undefined),
    getDynamicFields: (params) => platformSonarClient.getDynamicFields(params),
    getTransactionBlock: (params) =>
      platformSonarClient.getTransactionBlock({
        digest: params.digest,
        options: params.options as Record<string, unknown> | undefined,
      }),
    getDynamicFieldObject: (params) => platformSonarClient.getDynamicFieldObject(params),
    waitForTransaction: (params) =>
      platformSonarClient.waitForTransaction({
        digest: params.digest,
        options: params.options as Record<string, unknown> | undefined,
        timeout: params.timeout,
        pollInterval: params.pollInterval,
      }),
    getCoins: (params) => platformSonarClient.getCoins(params),
    getBalance: (params) => platformSonarClient.getBalance(params),
    queryEvents: (params) => platformSonarClient.queryEvents(params),
    getOwnedObjects: (params) => platformSonarClient.getOwnedObjects(params),
    getNormalizedMoveModule: (params) => platformSonarClient.getNormalizedMoveModule(params),
    devInspectTransactionBlock: async (params) => {
      const tx = params.transactionBlock;
      let transactionBlockBytes: string;
      if (isTransaction(tx)) {
        try {
          const bytes = await (tx as { build: (opts: { onlyTransactionKind?: boolean }) => Promise<Uint8Array> }).build({
            onlyTransactionKind: true,
          });
          transactionBlockBytes = toBase64(bytes);
        } catch (err) {
          throw new Error(
            'Cannot build Transaction without chain access. Pass pre-built transaction bytes (base64 or Uint8Array) or ensure the transaction has no unresolved object/pure inputs.',
            { cause: err },
          );
        }
      } else if (typeof tx === 'string') {
        transactionBlockBytes = tx;
      } else if (tx instanceof Uint8Array) {
        transactionBlockBytes = toBase64(tx);
      } else {
        throw new Error('Unknown transaction block format.');
      }
      return platformSonarClient.devInspectTransactionBlock({ sender: params.sender, transactionBlockBytes });
    },
  };
}
