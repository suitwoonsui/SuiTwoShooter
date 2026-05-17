// ==========================================
// API - Check Eligible Achievements
// ==========================================
// Returns milestones that are eligible to claim (does NOT auto-claim)

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler } from '@/lib/api/api-handler';
import { getAchievementService } from '@/lib/services/achievements/core/achievement-service';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const GET = withApiHandler(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const playerAddress = searchParams.get('address');

    if (!playerAddress) {
      throw new Error('Player address is required');
    }

    try {
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
    } catch (error) {
      // Log the full error for debugging
      console.error('❌ [ACHIEVEMENTS CHECK] Error in route handler:', error);
      console.error('❌ [ACHIEVEMENTS CHECK] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        playerAddress,
      });
      throw error; // Re-throw to let withApiHandler format the response
    }
  }
);


