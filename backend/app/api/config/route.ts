// ==========================================
// Config API Route
// Now handled by platform: proxies to platform api/config (network, rpcUrl, walletModuleUrl).
// Returns platform config with storageKey overridden to 'game-admin-wallet' for game frontend.
// ==========================================

import { NextRequest } from 'next/server';
import { withApiHandler } from '@/lib/api/api-handler';
import { platformConfigClient, getEcosystemIdFromRequest } from '@/lib/services/platform/client/platform-client';

// Note: withApiHandler automatically handles OPTIONS/CORS, so we don't need a separate OPTIONS export

type GameFrontendConfigResponse = {
  success: true;
  network?: string;
  rpcUrl?: string;
  walletModuleUrl?: string;
  storageKey: 'game-admin-wallet';
};

type CachedEntry = { at: number; data: GameFrontendConfigResponse };

const PLATFORM_CONFIG_TTL_MS = (() => {
  const raw = process.env.PUBLIC_DATA_PLATFORM_CONFIG_TTL_MS;
  if (!raw) return 6 * 60 * 60 * 1000; // 6 hours default
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 6 * 60 * 60 * 1000;
})();

const configCacheByEcosystemId = new Map<string, CachedEntry>();
const configInFlightByEcosystemId = new Map<string, Promise<GameFrontendConfigResponse>>();

export const GET = withApiHandler(
  async (request: NextRequest) => {
    const ecosystemId = getEcosystemIdFromRequest(request);
    const cacheKey = (ecosystemId || '').trim();
    const source = request.nextUrl.searchParams.get('source');
    const refresh = request.nextUrl.searchParams.get('refresh');
    const forceRefresh = refresh === '1' || refresh === 'true';

    if (!source) {
      console.warn('[GAME_BACKEND_PROXY] /api/config missing source tag', {
        route: '/api/config',
        ecosystemId: ecosystemId || '(default-from-env)',
        referer: request.headers.get('referer'),
        userAgent: request.headers.get('user-agent'),
        secFetchDest: request.headers.get('sec-fetch-dest'),
        secFetchMode: request.headers.get('sec-fetch-mode'),
        secFetchSite: request.headers.get('sec-fetch-site'),
      });
    }

    if (!forceRefresh) {
      const hit = configCacheByEcosystemId.get(cacheKey);
      if (hit && Date.now() - hit.at < PLATFORM_CONFIG_TTL_MS) {
        return hit.data;
      }
      const inflight = configInFlightByEcosystemId.get(cacheKey);
      if (inflight) return inflight;
    } else {
      configCacheByEcosystemId.delete(cacheKey);
      configInFlightByEcosystemId.delete(cacheKey);
    }

    const p = (async (): Promise<GameFrontendConfigResponse> => {
      console.info('[GAME_BACKEND_PROXY] Forwarding config request to platform API', {
        route: '/api/config',
        target: '/api/estuary/connect',
        source: source || '(missing)',
        ecosystemId: ecosystemId || '(default-from-env)',
        cache: 'miss',
        forceRefresh,
      });
      const result = await platformConfigClient.getConfig({ ecosystemId });
      if (!result.success && result.error) {
        throw new Error(result.error);
      }
      console.info('[GAME_BACKEND_PROXY] Platform config response received', {
        route: '/api/config',
        success: true,
        network: result.network,
        walletModuleUrl: result.walletModuleUrl,
      });
      const data: GameFrontendConfigResponse = {
        success: true,
        network: result.network,
        rpcUrl: result.rpcUrl,
        walletModuleUrl: result.walletModuleUrl,
        storageKey: 'game-admin-wallet',
      };
      configCacheByEcosystemId.set(cacheKey, { at: Date.now(), data });
      return data;
    })().finally(() => {
      configInFlightByEcosystemId.delete(cacheKey);
    });

    configInFlightByEcosystemId.set(cacheKey, p);
    return p;
  },
  {
    logRequest: false,
  }
);
