// ==========================================
// Admin API - Set Credits to Specific Amount
// ==========================================

import { NextRequest } from 'next/server';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { getGamePassService } from '@/lib/sui/game-pass-service';

export const POST = withApiHandler(
  async (request: NextRequest) => {
    const body = await getRequestBody<{
      playerAddress: string;
      targetAmount: number;
    }>(request);

    const { playerAddress, targetAmount } = body;

    if (!playerAddress || typeof playerAddress !== 'string') {
      throw new Error('Player address is required');
    }

    // Validate address format (basic check)
    if (!playerAddress.startsWith('0x') || playerAddress.length < 10) {
      throw new Error('Invalid player address format');
    }

    if (typeof targetAmount !== 'number' || targetAmount < 0 || !Number.isInteger(targetAmount)) {
      throw new Error('Target amount must be a non-negative integer');
    }

    const gamePassService = getGamePassService();
    const result = await gamePassService.adminSetCredits(playerAddress, targetAmount);

    if (!result.success) {
      throw new Error(result.error || 'Failed to set credits');
    }

    return {
      success: true,
      digest: result.digest,
      gamesRemaining: result.gamesRemaining,
      message: `Successfully set credits to ${targetAmount}`,
    };
  }
);

