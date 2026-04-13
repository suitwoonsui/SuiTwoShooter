// ==========================================
// Create Tournament API Route (User-created flow)
// Build and execute via platform Channel: app's CorridorCap, admin signs, POST /api/channel/execute.
// createdBy = playerAddress for attribution. No user signing; transaction is submitted through the channel.
// Separate from admin-created tournaments (POST /api/admin/tournaments/create).
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { getTournamentService } from '@/lib/services/tournament/core/tournament-service';
import { TournamentRewardConfig } from '@/lib/services/tournament/cost/reward-cost-calculator';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { PlatformValidators } from '@/lib/services/platform/validators/platform-validators';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(
  async (request: NextRequest) => {
    const body = await getRequestBody<{
      name: string;
      category: 'totalCoins' | 'longestStreak' | 'highestScore' | 'longestDistance' | 'mostBosses' | 'mostEnemies';
      startTime: number;  // Unix timestamp (milliseconds)
      endTime: number;    // Unix timestamp (milliseconds)
      entryFeeTickets: number;
      rewardConfig?: TournamentRewardConfig | null;
      startingAnteUSDCents: number;
      /** Token type for ante/vault when ante > 0 (same as admin flow). When set, used for reward distribution. */
      startingAnteToken?: 'SUI' | 'MEWS' | 'USDC';
      paymentToken: 'SUI' | 'MEWS' | 'USDC';
      playerAddress: string;
      badgeDiscount?: number; // Optional: if provided, won't fetch from badge service
    }>(request);

    const {
      name,
      category,
      startTime,
      endTime,
      entryFeeTickets,
      rewardConfig,
      startingAnteUSDCents,
      startingAnteToken,
      paymentToken,
      playerAddress,
    } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        'name is required and must not be empty'
      );
    }

    if (name.length > 100) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        'name must be 100 characters or less'
      );
    }

    if (!category || !['totalCoins', 'longestStreak', 'highestScore', 'longestDistance', 'mostBosses', 'mostEnemies'].includes(category)) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        'category must be one of: totalCoins, longestStreak, highestScore, longestDistance, mostBosses, mostEnemies'
      );
    }

    if (!startTime || typeof startTime !== 'number' || startTime <= 0) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        'startTime must be a valid Unix timestamp (milliseconds)'
      );
    }

    if (!endTime || typeof endTime !== 'number' || endTime <= 0) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        'endTime must be a valid Unix timestamp (milliseconds)'
      );
    }

    if (endTime <= startTime) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        'endTime must be after startTime'
      );
    }

    const now = Date.now();
    if (endTime <= now) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        'endTime must be in the future'
      );
    }

    if (!entryFeeTickets || typeof entryFeeTickets !== 'number' || entryFeeTickets < 1) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        'entryFeeTickets must be at least 1'
      );
    }

    if (startingAnteUSDCents === undefined || typeof startingAnteUSDCents !== 'number' || startingAnteUSDCents < 0) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        'startingAnteUSDCents must be a non-negative number'
      );
    }

    if (!paymentToken || !['SUI', 'MEWS', 'USDC'].includes(paymentToken)) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        'paymentToken must be SUI, MEWS, or USDC'
      );
    }

    PlatformValidators.validateAddress(playerAddress);

    // Validate reward config if provided
    if (rewardConfig) {
      if (!rewardConfig.rewardDepth || rewardConfig.rewardDepth < 1 || rewardConfig.rewardDepth > 255) {
        throw new PlatformError(
          PlatformErrorCode.INVALID_ADDRESS,
          'rewardDepth must be between 1 and 255'
        );
      }

      if (!rewardConfig.poolDepth || rewardConfig.poolDepth < 1 || rewardConfig.poolDepth > 255) {
        throw new PlatformError(
          PlatformErrorCode.INVALID_ADDRESS,
          'poolDepth must be between 1 and 255'
        );
      }

      // Validate pool distribution sums to 100 (guard against undefined)
      const poolDist = rewardConfig.poolDistribution ?? [];
      const poolSum = poolDist.reduce((sum, pct) => sum + pct, 0);
      if (Math.abs(poolSum - 100) > 0.01) {
        throw new PlatformError(
          PlatformErrorCode.INVALID_ADDRESS,
          'poolDistribution must sum to 100'
        );
      }
    }

    PlatformLogger.info('🏆 [TOURNAMENT CREATE] Creating tournament', {
      name,
      category,
      playerAddress,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      entryFeeTickets,
      startingAnteUSDCents,
      hasRewardConfig: !!rewardConfig,
      paymentToken,
    });

    const tournamentService = getTournamentService();
    const createResult = await tournamentService.createTournamentViaPlatformChannel(
      {
        name,
        category,
        startTime,
        endTime,
        entryFeeTickets,
        rewardConfig: rewardConfig || null,
        startingAnteUSDCents,
        startingAnteToken,
      },
      { playerAddress, paymentToken }
    );

    if (!createResult.success) {
      PlatformLogger.error('🏆 [TOURNAMENT CREATE] Channel create failed', { error: createResult.error });
      const isDefaultRewards = createResult.error?.includes('Default rewards have not been set') === true;
      throw new PlatformError(
        isDefaultRewards ? PlatformErrorCode.CONFIG_MISSING : PlatformErrorCode.INVALID_ADDRESS,
        createResult.error || 'Failed to create tournament via platform channel'
      );
    }

    const creationFeeUSDCents = createResult.appCreationFeeUsdCents ?? 500;
    // Note: rewardCostUSDCents is currently not recomputed here; the player payment
    // flow uses /api/tournaments/build-payment + /api/tournaments/calculate-reward-cost
    // to include custom reward cost in the wallet-approved amount. For now we surface
    // rewardCostUSDCents as 0 in this response and let the UI use the values from
    // build-payment / calculate-reward-cost for detailed breakdown.
    const rewardCostUSDCents = 0;
    const totalUSDCents = creationFeeUSDCents + startingAnteUSDCents + rewardCostUSDCents;
    return {
      success: true,
      digest: createResult.digest,
      payment: {
        creationFeeUSDCents,
        startingAnteUSDCents,
        rewardCostUSDCents,
        totalUSDCents,
        totalUSD: totalUSDCents / 100,
      },
      cost: {
        baseCost: 0,
        specialItemCost: 0,
        level2PlusCost: 0,
        totalCost: 0,
        totalCostUSDCents: 0,
        discountApplied: 0,
        badgeDiscountApplied: 0,
      },
    };
  }
);



