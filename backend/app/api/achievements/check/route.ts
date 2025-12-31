// ==========================================
// API - Check Eligible Achievements
// ==========================================
// Returns milestones that are eligible to claim (does NOT auto-claim)

import { NextRequest } from 'next/server';
import { withApiHandler } from '@/lib/api/api-handler';
import { getAchievementService } from '@/lib/sui/achievement-service';

export const GET = withApiHandler(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const playerAddress = searchParams.get('address');

    if (!playerAddress) {
      throw new Error('Player address is required');
    }

    const achievementService = getAchievementService();
    const result = await achievementService.getEligibleAchievements(playerAddress);

    if (!result.success) {
      throw new Error(result.error || 'Failed to check achievements');
    }

    return {
      success: true,
      eligible: result.eligible,
      count: result.eligible.length,
      // Note: These are NOT claimed yet. User must call POST /api/achievements/claim
    };
  }
);

