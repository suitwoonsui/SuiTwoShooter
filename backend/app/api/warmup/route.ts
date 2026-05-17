import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler } from '@/lib/api/api-handler';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { buildPlatformCallOptions, getPlatformBackendUrl } from '@/lib/services/platform/client/platform-client';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000000000000000000000000000';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

type PlatformWarmupItem = {
  path: string;
  query?: Record<string, string | number | boolean | null | undefined>;
  method?: 'GET' | 'POST';
};

/**
 * Server warmup fan-out endpoint.
 *
 * IMPORTANT: This intentionally warms via HTTP fetch() to existing API routes, rather than importing
 * internal handlers, because Platform + game backend are deployed as separate apps/environments.
 *
 * Query params:
 * - `dummyAddress` (optional): address used for player-scoped warm routes. Defaults to zero address.
 * - `limit` (optional): leaderboard warm limit (default 10).
 * - `platform` (optional): when `1`, also trigger a **batched cache priming** on the Platform backend via POST /api/harbor.
 */
export const GET = withApiHandler(
  async (request: NextRequest) => {
    const url = new URL(request.url);
    const origin = url.origin;

    const dummyAddress = (url.searchParams.get('dummyAddress') || ZERO_ADDRESS).trim();
    const limit = Math.max(1, Math.min(parseInt(url.searchParams.get('limit') || '10', 10) || 10, 50));
    const source = (url.searchParams.get('source') || 'warmup').trim();
    const warmPlatform = url.searchParams.get('platform') === '1' || url.searchParams.get('platform') === 'true';

    const startedAt = Date.now();

    const warmUrls = [
      // Single fan-out bootstrap: store + tournaments + milestones + leaderboard + game config.
      `${origin}/api/menu/bootstrap?source=${encodeURIComponent(source)}`,

      // Legacy/config endpoints used by clients and other processes (not covered by menu/bootstrap).
      `${origin}/api/config?source=${encodeURIComponent(source)}`,

      // Player-scoped routes (use dummy address to warm compilation + platform proxy paths).
      // Wallet-connect session warm route (fast-return on zero address but primes compilation).
      `${origin}/api/menu/player-warm?address=${encodeURIComponent(dummyAddress)}&source=${encodeURIComponent(source)}`,
      `${origin}/api/stats/${encodeURIComponent(dummyAddress)}?source=${encodeURIComponent(source)}`,
      `${origin}/api/badges/${encodeURIComponent(dummyAddress)}?source=${encodeURIComponent(source)}`,
      `${origin}/api/reservoir/${encodeURIComponent(dummyAddress)}?source=${encodeURIComponent(source)}&contract=new`,
      // Inventory is served via /api/inventory/[address] (platform proxy). Keep old /api/store/inventory out of warmups.
      `${origin}/api/inventory/${encodeURIComponent(dummyAddress)}?source=${encodeURIComponent(source)}`,
      `${origin}/api/tournaments/my-tournaments?playerAddress=${encodeURIComponent(dummyAddress)}&source=${encodeURIComponent(source)}`,

      // Intentionally GET: this is just compilation/cache warm. Route may return 405; ignore.
      `${origin}/api/tournaments/enter?source=${encodeURIComponent(source)}`,
    ];

    // Best-effort: do not fail warmup if any one route errors.
    const results = await Promise.allSettled(
      warmUrls.map(async (u) => {
        try {
          const r = await fetch(u, { method: 'GET' });
          return { ok: r.ok, status: r.status, url: u };
        } catch (e) {
          return { ok: false, status: 0, url: u, error: e instanceof Error ? e.message : String(e) };
        }
      })
    );

    const settled = results.map((r) =>
      r.status === 'fulfilled'
        ? r.value
        : { ok: false, status: 0, url: 'unknown', error: r.reason instanceof Error ? r.reason.message : String(r.reason) }
    );

    // Optional: also warm the Platform backend using an inline warm manifest (no on-chain/Aquifer dependency).
    // This keeps Platform generic: the connecting app decides what to warm and sends it in one request.
    let platformWarm: { attempted: boolean; ok?: boolean; status?: number; url?: string; error?: string } = { attempted: false };
    if (warmPlatform) {
      const platformBase = getPlatformBackendUrl();
      if (!platformBase) {
        platformWarm = { attempted: true, ok: false, status: 0, error: 'missing PLATFORM_BACKEND_URL' };
      } else {
        const platformWarmups: PlatformWarmupItem[] = [
          // Definitions + pricing surfaces used by any app's UI
          { path: '/api/helm' },
          { path: '/api/gauge' },
          { path: '/api/stockroom/offers' },
          { path: '/api/provisions/catalog' },
          // Hydroscope read surfaces
          { path: '/api/hydroscope/leaderboard', query: { limit: Math.min(limit, 200) } },
          // Player-scoped warm paths (dummy address primes compile + cache code paths)
          { path: `/api/hydroscope/${dummyAddress}` },
          { path: `/api/badges/${dummyAddress}` },
          { path: `/api/reservoir/${dummyAddress}`, query: { contract: 'new' } },
          { path: `/api/reservoir/holdings/${dummyAddress}`, query: { contract: 'new' } },
          // Tournament fee/config surfaces (used in entry builders)
          { path: '/api/regatta/event-fee' },
          { path: '/api/regatta/tournament-fee' },
          { path: '/api/regatta/vault-fee' },
          { path: '/api/regatta/gas-payment-address' },
          { path: '/api/regatta/default-sustain-config' },
        ];

        const warmUrl = new URL('/api/harbor', platformBase);
        warmUrl.searchParams.set('source', `game_${source}`);
        try {
          const platformOpts = buildPlatformCallOptions(request);
          const corridorCap = (platformOpts as any)?.corridorCapabilityObjectId as string | undefined;
          const adminCap = (platformOpts as any)?.corridorAdminCapabilityObjectId as string | undefined;
          const r = await fetch(warmUrl.toString(), {
            method: 'POST',
            // Pass Corridor identity so Platform can resolve per-tenant/per-app request context.
            // buildPlatformCallOptions falls back to env config when the incoming request has no Corridor headers
            // (e.g. server startup warmup).
            headers: {
              'Content-Type': 'application/json',
              ...(corridorCap ? { 'X-Corridor-Capability-Object-Id': corridorCap } : {}),
              ...(adminCap ? { 'X-Corridor-Admin-Capability-Object-Id': adminCap } : {}),
            },
            body: JSON.stringify({ source: `game_${source}`, warmups: platformWarmups }),
          });
          platformWarm = { attempted: true, ok: r.ok, status: r.status, url: warmUrl.toString() };
        } catch (e) {
          platformWarm = {
            attempted: true,
            ok: false,
            status: 0,
            url: warmUrl.toString(),
            error: e instanceof Error ? e.message : String(e),
          };
        }
      }
    }

    const okCount = settled.filter((r) => r.ok).length;
    const elapsedMs = Date.now() - startedAt;

    PlatformLogger.info('[WARMUP] Completed warm fan-out', {
      okCount,
      total: settled.length,
      elapsedMs,
      dummyAddressShort: `${dummyAddress.slice(0, 10)}…`,
      platformWarmAttempted: platformWarm.attempted,
      platformWarmOk: platformWarm.attempted ? Boolean(platformWarm.ok) : undefined,
    });

    return {
      success: true,
      okCount,
      total: settled.length,
      elapsedMs,
      dummyAddress,
      platformWarm,
      urls: settled,
      warmedAt: Date.now(),
    };
  },
  { logRequest: false }
);

