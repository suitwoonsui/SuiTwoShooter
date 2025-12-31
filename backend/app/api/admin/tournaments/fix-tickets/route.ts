// ==========================================
// Admin API - Fix Tournament Ticket Count
// ==========================================

import { NextRequest } from 'next/server';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { getGamePassService } from '@/lib/sui/game-pass-service';

export const POST = withApiHandler(
  async (request: NextRequest) => {
    const body = await getRequestBody<{
      playerAddress: string;
      correctCount: number;
    }>(request);

    const { playerAddress, correctCount } = body;

    if (!playerAddress || typeof playerAddress !== 'string') {
      throw new Error('Player address is required');
    }

    // Validate address format (basic check)
    if (!playerAddress.startsWith('0x') || playerAddress.length < 10) {
      throw new Error('Invalid player address format');
    }

    if (typeof correctCount !== 'number' || correctCount < 0 || !Number.isInteger(correctCount)) {
      throw new Error('Correct count must be a non-negative integer');
    }

    const gamePassService = getGamePassService();
    const result = await gamePassService.fixTicketCount(playerAddress, correctCount);

    if (!result.success) {
      throw new Error(result.error || 'Failed to fix ticket count');
    }

    return {
      success: true,
      digest: result.digest,
    };
  }
);

