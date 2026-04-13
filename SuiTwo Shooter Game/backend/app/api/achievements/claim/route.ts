// ==========================================
// API - Claim a Milestone Reward
// ==========================================
// User-triggered claim for a specific milestone

import { NextRequest, NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/api-handler';
import { getAchievementService } from '@/lib/services/achievements/core/achievement-service';
import { getCorsHeaders } from '@/lib/cors';

// Handle CORS preflight request
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}

export const POST = withApiHandler(
  async (request: NextRequest) => {
    const body = await request.json();
    const { playerAddress, category, threshold, milestones } = body;

    if (!playerAddress) {
      throw new Error('Player address is required');
    }

    const achievementService = getAchievementService();

    // Support both single and batch claiming
    if (milestones && Array.isArray(milestones) && milestones.length > 0) {
      // Batch claim mode
      const result = await achievementService.claimBatchMilestones(
        playerAddress,
        milestones
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to claim milestones');
      }

      let message = `Successfully claimed ${result.claimed.length} milestone${result.claimed.length > 1 ? 's' : ''}`;
      if (result.rewardsDistributed === false) {
        message = `${result.claimed.length} milestone${result.claimed.length > 1 ? 's' : ''} claimed, but rewards could not be automatically distributed (${result.rewardsError || 'admin wallet issue'}). Rewards will be processed separately.`;
      } else if (result.rewardsDistributed === true) {
        const totalCredits = result.claimed.reduce((sum, c) => sum + (c.credits || 0), 0);
        const totalItems = result.claimed.reduce((sum, c) => sum + (c.items?.length || 0), 0);
        message = `Successfully claimed ${result.claimed.length} milestone${result.claimed.length > 1 ? 's' : ''}`;
        if (totalCredits > 0) {
          message += ` (+${totalCredits} credit${totalCredits > 1 ? 's' : ''})`;
        }
        if (totalItems > 0) {
          message += ` (+${totalItems} item${totalItems > 1 ? 's' : ''})`;
        }
      }

      return {
        success: true,
        claimed: result.claimed,
        rewardsDistributed: result.rewardsDistributed,
        rewardsError: result.rewardsError,
        message,
      };
    } else {
      // Single claim mode (backward compatibility)
      if (!category) {
        throw new Error('Category is required for single claim');
      }

      if (threshold === undefined || threshold === null) {
        throw new Error('Threshold is required for single claim');
      }

      const result = await achievementService.claimSingleMilestone(
        playerAddress,
        category,
        Number(threshold)
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to claim milestone');
      }

      // Milestone claim completed (admin wallet signed and paid for gas)
      // Rewards (credits/items) may have been distributed by the backend (if admin wallet has gas)
      let message = `Successfully claimed ${category} milestone (threshold: ${threshold})`;
      if (result.rewardsDistributed === false) {
        message = `Milestone claimed, but rewards could not be automatically distributed (${result.rewardsError || 'admin wallet issue'}). Rewards will be processed separately.`;
      } else if (result.rewardsDistributed === true) {
        message = `Successfully claimed ${category} milestone (threshold: ${threshold}). Rewards distributed.`;
      }

      return {
        success: true,
        claimed: result.claimed ? [result.claimed] : [],
        rewardsDistributed: result.rewardsDistributed,
        rewardsError: result.rewardsError,
        message,
      };
    }
  }
);

