// ==========================================
// Create Tournament API Route (User)
// Creates a tournament with payment
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '../../../../../../../base/backend/lib/cors';
import { withApiHandler, getRequestBody } from '../../../../../../../base/backend/lib/api/api-handler';
import { getTournamentService } from '../../../../../../../backend/lib/sui/tournament-service';
import { calculateRewardCost, calculateTotalPayment, TournamentRewardConfig } from '../../../../../../../backend/lib/services/reward-cost-calculator';
import { BadgeError, BadgeErrorCode } from '../../../../../../../base/backend/lib/sui/badge-errors';
import { BadgeValidators } from '../../../../../../../backend/lib/sui/badge-validators';
import { BadgeLogger } from '../../../../../../../base/backend/lib/sui/badge-logger';

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
      paymentToken,
      playerAddress,
      badgeDiscount,
    } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'name is required and must not be empty'
      );
    }

    if (name.length > 100) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'name must be 100 characters or less'
      );
    }

    if (!category || !['totalCoins', 'longestStreak', 'highestScore', 'longestDistance', 'mostBosses', 'mostEnemies'].includes(category)) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'category must be one of: totalCoins, longestStreak, highestScore, longestDistance, mostBosses, mostEnemies'
      );
    }

    if (!startTime || typeof startTime !== 'number' || startTime <= 0) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'startTime must be a valid Unix timestamp (milliseconds)'
      );
    }

    if (!endTime || typeof endTime !== 'number' || endTime <= 0) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'endTime must be a valid Unix timestamp (milliseconds)'
      );
    }

    if (endTime <= startTime) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'endTime must be after startTime'
      );
    }

    const now = Date.now();
    if (endTime <= now) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'endTime must be in the future'
      );
    }

    if (!entryFeeTickets || typeof entryFeeTickets !== 'number' || entryFeeTickets < 1) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'entryFeeTickets must be at least 1'
      );
    }

    if (startingAnteUSDCents === undefined || typeof startingAnteUSDCents !== 'number' || startingAnteUSDCents < 0) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'startingAnteUSDCents must be a non-negative number'
      );
    }

    if (!paymentToken || !['SUI', 'MEWS', 'USDC'].includes(paymentToken)) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'paymentToken must be SUI, MEWS, or USDC'
      );
    }

    BadgeValidators.validateAddress(playerAddress);

    // Validate reward config if provided
    if (rewardConfig) {
      if (!rewardConfig.rewardDepth || rewardConfig.rewardDepth < 1 || rewardConfig.rewardDepth > 255) {
        throw new BadgeError(
          BadgeErrorCode.INVALID_ADDRESS,
          'rewardDepth must be between 1 and 255'
        );
      }

      if (!rewardConfig.poolDepth || rewardConfig.poolDepth < 1 || rewardConfig.poolDepth > 255) {
        throw new BadgeError(
          BadgeErrorCode.INVALID_ADDRESS,
          'poolDepth must be between 1 and 255'
        );
      }

      // Validate pool distribution sums to 100
      const poolSum = rewardConfig.poolDistribution.reduce((sum, pct) => sum + pct, 0);
      if (Math.abs(poolSum - 100) > 0.01) {
        throw new BadgeError(
          BadgeErrorCode.INVALID_ADDRESS,
          'poolDistribution must sum to 100'
        );
      }
    }

    BadgeLogger.info('🏆 [TOURNAMENT CREATE] Creating tournament', {
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

    // Calculate reward cost
    const costResult = await calculateRewardCost(
      rewardConfig || null,
      playerAddress,
      badgeDiscount
    );

    // Calculate total payment
    const totalPayment = calculateTotalPayment(
      startingAnteUSDCents,
      costResult.totalCostUSDCents
    );

    BadgeLogger.info('🏆 [TOURNAMENT CREATE] Payment calculated', {
      creationFeeUSDCents: totalPayment.creationFeeUSDCents,
      startingAnteUSDCents: totalPayment.startingAnteUSDCents,
      rewardCostUSDCents: totalPayment.rewardCostUSDCents,
      totalUSDCents: totalPayment.totalUSDCents,
      totalUSD: totalPayment.totalUSD,
    });

    // Build tournament creation transaction
    const tournamentService = getTournamentService();
    const transactionResult = await tournamentService.buildTournamentCreationTransaction(
      {
        name,
        category,
        startTime,
        endTime,
        entryFeeTickets,
        rewardConfig: rewardConfig || null,
        startingAnteUSDCents,
        creationFeeUSDCents: totalPayment.creationFeeUSDCents,
        rewardCostUSDCents: costResult.totalCostUSDCents,
      },
      {
        playerAddress,
        paymentToken,
      }
    );

    if (!transactionResult.success) {
      BadgeLogger.error('🏆 [TOURNAMENT CREATE] Failed to build transaction', {
        error: transactionResult.error,
      });
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        transactionResult.error || 'Failed to build tournament creation transaction'
      );
    }

    BadgeLogger.info('🏆 [TOURNAMENT CREATE] Transaction built successfully', {
      gasEstimate: transactionResult.gasEstimate,
    });

    return {
      success: true,
      transaction: transactionResult.transaction,
      gasEstimate: transactionResult.gasEstimate,
      payment: {
        creationFeeUSDCents: totalPayment.creationFeeUSDCents,
        startingAnteUSDCents: totalPayment.startingAnteUSDCents,
        rewardCostUSDCents: totalPayment.rewardCostUSDCents,
        totalUSDCents: totalPayment.totalUSDCents,
        totalUSD: totalPayment.totalUSD,
      },
      cost: {
        baseCost: costResult.baseCost,
        specialItemCost: costResult.specialItemCost,
        level2PlusCost: costResult.level2PlusCost,
        totalCost: costResult.totalCost,
        totalCostUSDCents: costResult.totalCostUSDCents,
        discountApplied: costResult.discountApplied,
        badgeDiscountApplied: costResult.badgeDiscountApplied,
      },
    };
  }
);


