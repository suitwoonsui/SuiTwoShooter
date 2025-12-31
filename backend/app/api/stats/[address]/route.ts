import { NextRequest } from 'next/server';
import { getAdminWalletService } from '@/lib/sui/admin-wallet-service';
import { handleCorsPreflight } from '@/lib/cors';
import { BadgeLogger } from '@/lib/sui/badge-logger';
import { withApiHandler, getAddressParam } from '@/lib/api/api-handler';

/**
 * OPTIONS /api/stats/[address]
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * GET /api/stats/[address]
 * Get player statistics from the blockchain
 */
export const GET = withApiHandler(
  async (
    request: NextRequest,
    context: { params: Promise<{ address: string }> }
  ) => {
    const address = await getAddressParam(context.params);

    BadgeLogger.info('Fetching stats for address', { address });
    
    const adminWallet = getAdminWalletService();
    const stats = await adminWallet.getPlayerStats(address);

    BadgeLogger.debug('Stats result', {
      address,
      success: stats.success,
      hasStats: stats.hasStats,
      totalGames: stats.totalGames,
      bestScore: stats.bestScore,
      error: stats.error,
    });

    if (!stats.success) {
      throw new Error(stats.error || 'Failed to fetch player stats');
    }

    return {
      success: true,
      hasStats: stats.hasStats || false,
      totalGames: stats.totalGames || 0,
      bestScore: stats.bestScore || 0,
      bestDistance: stats.bestDistance || 0,
      bestCoins: stats.bestCoins || 0,
      bestBossesDefeated: stats.bestBossesDefeated || 0,
      bestEnemiesDefeated: stats.bestEnemiesDefeated || 0,
      bestCoinStreak: stats.bestCoinStreak || 0,
      // Include other stats if needed
      totalScore: stats.totalScore || 0,
      totalDistance: stats.totalDistance || 0,
      totalCoins: stats.totalCoins || 0,
      firstGameDate: stats.firstGameDate || 0,
      lastGameDate: stats.lastGameDate || 0,
    };
  }
);

