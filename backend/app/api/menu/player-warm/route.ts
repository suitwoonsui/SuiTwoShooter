// ==========================================
// Player session warm — populate server-side caches on wallet connect.
// Parallel Hydroscope stats + reservoir so GET /api/stats and /api/reservoir/[addr] hit cache.
// (Milestone claims are warmed without blocking this path — see prefetch after loading UI closes.)
// Query: address (required), refresh=1 to bust caches first (e.g. forced GameDataFlow reload).
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler } from '@/lib/api/api-handler';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { PlatformValidators } from '@/lib/services/platform/validators/platform-validators';
import {
  buildPlatformCallOptions,
  invalidatePlayerGamePassCacheForAddress,
  invalidatePlayerStatsCacheForAddress,
  platformGamePassClient,
  platformGameScoreClient,
} from '@/lib/services/platform/client/platform-client';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000000000000000000000000000';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const GET = withApiHandler(
  async (request: NextRequest) => {
    const url = new URL(request.url);
    const address = (url.searchParams.get('address') || '').trim();
    const refresh = url.searchParams.get('refresh') === '1' || url.searchParams.get('refresh') === 'true';

    if (!address) {
      return { success: false, error: 'address query parameter is required' };
    }
    if (address === ZERO_ADDRESS || address.toLowerCase() === ZERO_ADDRESS) {
      return { success: true, warmed: false, reason: 'zero_address' };
    }

    PlatformValidators.validateAddress(address);

    if (refresh) {
      invalidatePlayerStatsCacheForAddress(address);
      invalidatePlayerGamePassCacheForAddress(address);
    }

    const platformOptions = buildPlatformCallOptions(request, undefined);
    const contract = url.searchParams.get('contract') || 'new';

    const started = Date.now();
    const [stats, gamePass] = await Promise.all([
      platformGameScoreClient.getPlayerStats(address, platformOptions),
      platformGamePassClient.getGamePassStatus(address, { ...platformOptions, contract }),
    ]);

    PlatformLogger.debug('[PLAYER WARM] Session caches populated', {
      address: `${address.slice(0, 10)}…`,
      statsOk: stats.success,
      gamePassOk: gamePass.success,
      refresh,
      elapsedMs: Date.now() - started,
    });

    return {
      success: true,
      warmed: true,
      refresh,
      stats: { success: stats.success },
      gamePass: { success: gamePass.success },
      warmedAt: Date.now(),
    };
  },
  { logRequest: false }
);
