// ==========================================
// API - Get Achievement Progress
// ==========================================
// Returns player stats, claimed milestones, and eligible (claimable) milestones

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler } from '@/lib/api/api-handler';
import { getAchievementService } from '@/lib/services/achievements/core/achievement-service';
import { buildPlatformCallOptions } from '@/lib/services/platform/client/platform-client';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

const EMPTY_STATS = {
  totalGames: 0,
  bestScore: 0,
  bestDistance: 0,
  bestCoins: 0,
  bestBossesDefeated: 0,
  bestEnemiesDefeated: 0,
  bestCoinStreak: 0,
  totalScore: 0,
  totalDistance: 0,
  totalCoins: 0,
  totalBossesDefeated: 0,
  totalEnemiesDefeated: 0,
};

export const GET = withApiHandler(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const playerAddress = searchParams.get('address');

    if (!playerAddress) {
      throw new Error('Player address is required');
    }

    const achievementService = getAchievementService();
    const platformOptions = buildPlatformCallOptions(request, undefined);

    const [statsResult, claimedIdsResult] = await Promise.all([
      achievementService.getPlayerStats(playerAddress, platformOptions),
      achievementService.getClaimedMilestoneIds(playerAddress),
    ]);

    if (!statsResult.success || !statsResult.stats) {
      return {
        success: true,
        stats: EMPTY_STATS,
        claimedIds: [],
        eligible: [],
        eligibleCount: 0,
      };
    }

    const claimedIds = claimedIdsResult.success ? (claimedIdsResult.claimedIds || []) : [];

    const eligibleResult = await achievementService.getEligibleAchievements(playerAddress, {
      stats: statsResult.stats,
      claimedIds,
    });
    const eligible = eligibleResult.success ? eligibleResult.eligible : [];

    // Debug-only: achievements progress can be polled often during menu loads.
    if (process.env.DEBUG_ACHIEVEMENTS === 'true') {
      console.log('🔍 [PROGRESS API] Detailed milestone data for', playerAddress);
      console.log('🔍 [PROGRESS API] Claimed IDs:', claimedIds);
      console.log('🔍 [PROGRESS API] Claimed IDs count:', claimedIds.length);
      console.log('🔍 [PROGRESS API] Eligible milestones count:', eligible.length);
      console.log(
        '🔍 [PROGRESS API] Eligible milestones:',
        eligible.map((e) => ({
          category: e.category,
          milestoneId: e.milestoneId,
          threshold: e.threshold,
        }))
      );
    }

    return {
      success: true,
      stats: statsResult.stats,
      claimedIds: claimedIds, // Stable milestone IDs (source of truth)
      eligible: eligible,
      eligibleCount: eligible.length,
    };
  }
);


