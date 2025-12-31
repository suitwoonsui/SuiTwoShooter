// ==========================================
// Get Creator Rewards API Route
// Returns all tournaments created by a user and their creator rewards
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler } from '@/lib/api/api-handler';
import { getTournamentsByCreator } from '@/lib/services/creator-reward-service';
import { BadgeError, BadgeErrorCode } from '@/lib/sui/badge-errors';
import { BadgeValidators } from '@/lib/sui/badge-validators';
import { BadgeLogger } from '@/lib/sui/badge-logger';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const GET = withApiHandler(
  async (request: NextRequest, { params }: { params: Promise<{ address: string }> }) => {
    const { address } = await params;
    const creatorAddress = address;

    // Validate address format
    if (!creatorAddress) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'Creator address is required'
      );
    }

    BadgeValidators.validateAddress(creatorAddress);

    BadgeLogger.info('🏆 [CREATOR REWARDS] Getting creator rewards', {
      creatorAddress,
    });

    // Get tournaments by creator
    const result = await getTournamentsByCreator(creatorAddress);

    if (!result.success) {
      BadgeLogger.error('🏆 [CREATOR REWARDS] Failed to get creator rewards', {
        creatorAddress,
        error: result.error,
      });
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        result.error || 'Failed to get creator rewards'
      );
    }

    BadgeLogger.info('🏆 [CREATOR REWARDS] Creator rewards retrieved', {
      creatorAddress,
      tournamentCount: result.tournaments?.length || 0,
      totalRewardsUSD: result.totalRewardsUSD,
    });

    return {
      success: true,
      creatorAddress,
      tournaments: result.tournaments || [],
      totalRewardsUSDCents: result.totalRewardsUSDCents || 0,
      totalRewardsUSD: result.totalRewardsUSD || 0,
    };
  }
);







