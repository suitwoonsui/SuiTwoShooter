// ==========================================
// Distribute Creator Reward API Route
// Distributes creator reward to tournament creator
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '../../../../../../../../base/backend/lib/cors';
import { withApiHandler } from '../../../../../../../../base/backend/lib/api/api-handler';
import { distributeCreatorReward } from '../../../../../../../../backend/lib/services/creator-reward-service';
import { BadgeError, BadgeErrorCode } from '../../../../../../../../base/backend/lib/sui/badge-errors';
import { BadgeValidators } from '../../../../../../../../backend/lib/sui/badge-validators';
import { BadgeLogger } from '../../../../../../../../base/backend/lib/sui/badge-logger';
import { verifyApiKey } from '../../../../../../../../backend/lib/auth';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    // Require admin authentication for now (can be made public later if needed)
    if (!verifyApiKey(request)) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'Unauthorized. Valid API key required.'
      );
    }

    const { id } = await params;
    const tournamentObjectId = id;

    // Validate tournament object ID format
    if (!tournamentObjectId || !tournamentObjectId.startsWith('0x')) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'Invalid tournament object ID format'
      );
    }

    BadgeLogger.info('🏆 [CREATOR REWARD API] Distributing creator reward', {
      tournamentObjectId,
    });

    // Distribute creator reward
    const result = await distributeCreatorReward(tournamentObjectId);

    if (!result.success) {
      BadgeLogger.error('🏆 [CREATOR REWARD API] Failed to distribute creator reward', {
        tournamentObjectId,
        error: result.error,
      });
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        result.error || 'Failed to distribute creator reward'
      );
    }

    BadgeLogger.info('🏆 [CREATOR REWARD API] Creator reward distributed successfully', {
      tournamentObjectId,
      tournamentId: result.tournamentId,
      creatorAddress: result.creatorAddress,
      creatorRewardUSD: result.creatorRewardUSD,
      transactionDigest: result.transactionDigest,
    });

    return {
      success: true,
      tournamentId: result.tournamentId,
      creatorAddress: result.creatorAddress,
      creatorRewardUSDCents: result.creatorRewardUSDCents,
      creatorRewardUSD: result.creatorRewardUSD,
      mewsAmount: result.mewsAmount,
      transactionDigest: result.transactionDigest,
      message: `Successfully distributed creator reward of $${result.creatorRewardUSD?.toFixed(2)} (${result.mewsAmount} MEWS) to ${result.creatorAddress}`,
    };
  }
);







