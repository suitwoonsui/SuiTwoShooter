// ==========================================
// Get Creator Rewards API Route
// Returns all tournaments created by a user and their creator rewards
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler } from '@/lib/api/api-handler';
import { getTournamentsByCreator } from '@/lib/services/tournament/creator/creator-reward-service';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { PlatformValidators } from '@/lib/services/platform/validators/platform-validators';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';

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
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        'Creator address is required'
      );
    }

    PlatformValidators.validateAddress(creatorAddress);

    PlatformLogger.info('🏆 [CREATOR REWARDS] Getting creator rewards', {
      creatorAddress,
    });

    // Get tournaments by creator
    const result = await getTournamentsByCreator(creatorAddress);

    if (!result.success) {
      PlatformLogger.error('🏆 [CREATOR REWARDS] Failed to get creator rewards', {
        creatorAddress,
        error: result.error,
      });
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        result.error || 'Failed to get creator rewards'
      );
    }

    PlatformLogger.info('🏆 [CREATOR REWARDS] Creator rewards retrieved', {
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







