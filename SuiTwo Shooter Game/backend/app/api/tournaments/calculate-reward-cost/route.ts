// ==========================================
// Calculate Reward Cost API Route
// Calculates the cost of custom tournament rewards
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { calculateRewardCost, calculateTotalPayment, TournamentRewardConfig } from '@/lib/services/tournament/cost/reward-cost-calculator';
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
      rewardConfig: TournamentRewardConfig | null;
      playerAddress?: string;
      startingAnteUSDCents?: number; // Optional: include in total payment calculation
      badgeDiscount?: number; // Optional: if provided, won't fetch from badge service
    }>(request);

    const { rewardConfig, playerAddress, startingAnteUSDCents, badgeDiscount } = body;

    // Validate player address if provided
    if (playerAddress) {
      PlatformValidators.validateAddress(playerAddress);
    }

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
      if (Math.abs(poolSum - 100) > 0.01) { // Allow small floating point errors
        throw new PlatformError(
          PlatformErrorCode.INVALID_ADDRESS,
          'poolDistribution must sum to 100'
        );
      }
    }

    PlatformLogger.info('🏆 [REWARD COST] Calculating reward cost', {
      playerAddress,
      hasRewardConfig: !!rewardConfig,
      rewardDepth: rewardConfig?.rewardDepth,
      startingAnteUSDCents,
    });

    // Calculate reward cost
    const costResult = await calculateRewardCost(
      rewardConfig,
      playerAddress,
      badgeDiscount
    );

    // Calculate total payment if starting ante is provided
    let totalPayment = null;
    if (startingAnteUSDCents !== undefined) {
      totalPayment = calculateTotalPayment(
        startingAnteUSDCents,
        costResult.totalCostUSDCents
      );
    }

    PlatformLogger.info('🏆 [REWARD COST] Cost calculated', {
      totalCost: costResult.totalCost,
      totalCostUSDCents: costResult.totalCostUSDCents,
      baseCost: costResult.baseCost,
      specialItemCost: costResult.specialItemCost,
      level2PlusCost: costResult.level2PlusCost,
      discountApplied: costResult.discountApplied,
      badgeDiscountApplied: costResult.badgeDiscountApplied,
      totalPayment: totalPayment?.totalUSD,
    });

    return {
      success: true,
      cost: {
        baseCost: costResult.baseCost,
        specialItemCost: costResult.specialItemCost,
        level2PlusCost: costResult.level2PlusCost,
        totalCost: costResult.totalCost,
        totalCostUSDCents: costResult.totalCostUSDCents,
        discountApplied: costResult.discountApplied,
        badgeDiscountApplied: costResult.badgeDiscountApplied,
      },
      totalPayment: totalPayment ? {
        creationFeeUSDCents: totalPayment.creationFeeUSDCents,
        startingAnteUSDCents: totalPayment.startingAnteUSDCents,
        rewardCostUSDCents: totalPayment.rewardCostUSDCents,
        totalUSDCents: totalPayment.totalUSDCents,
        totalUSD: totalPayment.totalUSD,
      } : null,
    };
  }
);








