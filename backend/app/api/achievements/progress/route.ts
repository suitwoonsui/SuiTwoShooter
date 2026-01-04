// ==========================================
// API - Get Achievement Progress
// ==========================================
// Returns player stats, claimed milestones, and eligible (claimable) milestones

import { NextRequest } from 'next/server';
import { withApiHandler } from '../../../../../../../base/backend/lib/api/api-handler';
import { getAchievementService } from '../../../../../../../backend/lib/sui/achievement-service';

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
    
    // Get player stats (this should work even without achievement contract)
    const statsResult = await achievementService.getPlayerStats(playerAddress);
    if (!statsResult.success || !statsResult.stats) {
      // If stats fail, return empty stats (contract might not be deployed)
      return {
        success: true,
        stats: EMPTY_STATS,
        claimedIds: [],
        eligible: [],
        eligibleCount: 0,
      };
    }

    // Get claimed milestone IDs (stable IDs, source of truth)
    const claimedIdsResult = await achievementService.getClaimedMilestoneIds(playerAddress);
    const claimedIds = claimedIdsResult.success ? (claimedIdsResult.claimedIds || []) : [];

    // Get eligible (claimable) milestones
    const eligibleResult = await achievementService.getEligibleAchievements(playerAddress);
    const eligible = eligibleResult.success ? eligibleResult.eligible : [];

    // EXTENSIVE LOGGING
    console.log('🔍 [PROGRESS API] Detailed milestone data for', playerAddress);
    console.log('🔍 [PROGRESS API] Claimed IDs:', claimedIds);
    console.log('🔍 [PROGRESS API] Claimed IDs count:', claimedIds.length);
    console.log('🔍 [PROGRESS API] Eligible milestones count:', eligible.length);
    console.log('🔍 [PROGRESS API] Eligible milestones:', eligible.map(e => ({
      category: e.category,
      milestoneId: e.milestoneId,
      threshold: e.threshold,
    })));

    return {
      success: true,
      stats: statsResult.stats,
      claimedIds: claimedIds, // Stable milestone IDs (source of truth)
      eligible: eligible,
      eligibleCount: eligible.length,
    };
  }
);

