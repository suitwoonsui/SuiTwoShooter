// ==========================================
// Admin API - Add Credits to Player's Game Pass
// ==========================================

import { NextRequest } from 'next/server';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { getGamePassService } from '@/lib/sui/game-pass-service';

export const POST = withApiHandler(
  async (request: NextRequest) => {
    const body = await getRequestBody<{
      playerAddress: string;
      amount: number;
    }>(request);

    const { playerAddress, amount } = body;

    if (!playerAddress || typeof playerAddress !== 'string') {
      throw new Error('Player address is required');
    }

    // Validate address format (basic check)
    if (!playerAddress.startsWith('0x') || playerAddress.length < 10) {
      throw new Error('Invalid player address format');
    }

    if (typeof amount !== 'number' || amount <= 0 || !Number.isInteger(amount)) {
      throw new Error('Amount must be a positive integer');
    }

    const gamePassService = getGamePassService();
    const result = await gamePassService.adminAddCredits(playerAddress, amount);

    if (!result.success) {
      throw new Error(result.error || 'Failed to add credits');
    }

    return {
      success: true,
      digest: result.digest,
      gamesRemaining: result.gamesRemaining,
      message: `Successfully added ${amount} credit${amount !== 1 ? 's' : ''} to player`,
    };
  }
);

