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
        target: '/api/config',
        source: source || '(missing)',
        ecosystemId: ecosystemId || '(default-from-env)',
        cache: 'miss',
        forceRefresh,
      });
      // Config is now handled by platform; proxy and override storageKey for game frontend; inform platform of ecosystem
      const result = await platformConfigClient.getConfig({ ecosystemId });
      if (!result.success && result.error) {
        throw new Error(result.error);
      }
      console.info('[GAME_BACKEND_PROXY] Platform config response received', {
        route: '/api/config',
        success: true,
        network: result.network,
      });
      const data: GameFrontendConfigResponse = {
        success: true,
        network: result.network,
        rpcUrl: result.rpcUrl,
        walletModuleUrl: result.walletModuleUrl,
        // Keep game-admin-wallet so game frontend doesn't overwrite platform admin wallet connection
        storageKey: 'game-admin-wallet',
      };
      configCacheByEcosystemId.set(cacheKey, { at: Date.now(), data });
      return data;
    })()
      .finally(() => {
        configInFlightByEcosystemId.delete(cacheKey);
      });

    configInFlightByEcosystemId.set(cacheKey, p);
    return p;

    /* ---- COMMENTED OUT: config now handled by platform (use GET /api/platform/config or this proxy) ----
    // Read environment variables directly instead of calling getConfig()
    // This avoids validation errors for missing optional variables
    // We only need basic network info for the frontend
    let network: 'testnet' | 'mainnet' | 'devnet' = 'testnet';
    if (process.env.SUI_TESTNET_NETWORK) {
      network = 'testnet';
    } else if (process.env.SUI_MAINNET_NETWORK) {
      network = 'mainnet';
    } else if (process.env.SUI_NETWORK) {
      network = process.env.SUI_NETWORK as 'testnet' | 'mainnet' | 'devnet';
    }
    const rpcUrl = process.env.SUI_RPC_URL || (
      network === 'testnet'
        ? 'https://fullnode.testnet.sui.io:443'
        : network === 'mainnet'
        ? 'https://fullnode.mainnet.sui.io:443'
        : 'https://fullnode.devnet.sui.io:443'
    );
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
    const walletModuleUrl = process.env.WALLET_MODULE_URL || (
      isProduction
        ? 'https://your-base-backend.vercel.app/wallet-api.umd.cjs'
        : 'http://localhost:3000/wallet-api.umd.cjs'
    );
    return {
      success: true,
      network,
      rpcUrl,
      walletModuleUrl,
      storageKey: 'game-admin-wallet',
    };
    ---- end commented out ---- */
  },
  {
    logRequest: false, // Config endpoint doesn't need request logging
  }
);

