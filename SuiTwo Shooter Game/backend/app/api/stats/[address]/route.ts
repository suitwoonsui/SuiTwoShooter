// ==========================================
// Stats API Route
// Platform only; no legacy chain path. Fail clearly when platform is missing or platform call fails.
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { withApiHandler, getAddressParam } from '@/lib/api/api-handler';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import {
  platformGameScoreClient,
  callPlatformBackend,
  buildPlatformCallOptions,
  invalidatePlayerStatsCacheForAddress,
} from '@/lib/services/platform/client/platform-client';

// Handle CORS preflight
export async function OPTIONS(
  request: NextRequest,
  context: { params: Promise<{ address: string }> }
) {
  return handleCorsPreflight(request);
}

/**
 * GET /api/stats/[address]
 * Stats via platform only. Requires PLATFORM_BACKEND_URL, ECOSYSTEM_ID, APP_ID.
 */
export const GET = withApiHandler(
  async (
    request: NextRequest,
    context: { params: Promise<{ address: string }> }
  ) => {
    const address = await getAddressParam(context.params);

    const reservedKeywords = ['overview', 'status'];
    if (reservedKeywords.includes(address.toLowerCase())) {
      throw new Error(`Invalid address: "${address}" is a reserved keyword. Use /api/stats/${address} instead.`);
    }

    if (request.nextUrl.searchParams.has('_refresh')) {
      invalidatePlayerStatsCacheForAddress(address);
    }

    const platformOptions = buildPlatformCallOptions(request, undefined);
    const chainData = await platformGameScoreClient.getPlayerStats(address, platformOptions);
    if (chainData.success && (chainData.totalGames != null || chainData.bestScore != null)) {
      PlatformLogger.debug('Stats from platform (chain)', { address });
      return {
        success: true,
        hasStats: chainData.hasStats ?? false,
        totalGames: chainData.totalGames ?? 0,
        bestScore: chainData.bestScore ?? 0,
        bestDistance: chainData.bestDistance ?? 0,
        bestCoins: chainData.bestCoins ?? 0,
        bestBossesDefeated: chainData.bestBossesDefeated ?? 0,
        bestEnemiesDefeated: chainData.bestEnemiesDefeated ?? 0,
        bestCoinStreak: chainData.bestCoinStreak ?? 0,
        totalScore: chainData.totalScore ?? 0,
        totalDistance: chainData.totalDistance ?? 0,
        totalCoins: chainData.totalCoins ?? 0,
        totalBossesDefeated: chainData.totalBossesDefeated ?? 0,
        totalEnemiesDefeated: chainData.totalEnemiesDefeated ?? 0,
        totalCoinStreak: chainData.totalCoinStreak ?? 0,
        firstGameDate: chainData.firstGameDate ?? 0,
        lastGameDate: chainData.lastGameDate ?? 0,
      };
    }

    const platformData = await callPlatformBackend<{
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
    }>(`api/stats/${address}`, { method: 'GET' });

    if (!platformData?.success) {
      throw new PlatformError(
        PlatformErrorCode.BLOCKCHAIN_QUERY_FAILED,
        (platformData as { error?: string })?.error ?? 'Stats unavailable from platform.'
      );
    }

    PlatformLogger.debug('Stats from platform (stored)', { address });
    return {
      success: true,
      hasStats: platformData.hasStats ?? false,
      totalGames: platformData.totalGames ?? 0,
      bestScore: platformData.bestScore ?? 0,
      bestDistance: platformData.bestDistance ?? 0,
      bestCoins: platformData.bestCoins ?? 0,
      bestBossesDefeated: platformData.bestBossesDefeated ?? 0,
      bestEnemiesDefeated: platformData.bestEnemiesDefeated ?? 0,
      bestCoinStreak: platformData.bestCoinStreak ?? 0,
      totalScore: platformData.totalScore ?? 0,
      totalDistance: platformData.totalDistance ?? 0,
      totalCoins: platformData.totalCoins ?? 0,
      totalBossesDefeated: platformData.totalBossesDefeated ?? 0,
      totalEnemiesDefeated: platformData.totalEnemiesDefeated ?? 0,
      totalCoinStreak: platformData.totalCoinStreak ?? 0,
      firstGameDate: platformData.firstGameDate ?? 0,
      lastGameDate: platformData.lastGameDate ?? 0,
    };
  }
);

// Legacy internal chain path removed — platform only so failures are visible.