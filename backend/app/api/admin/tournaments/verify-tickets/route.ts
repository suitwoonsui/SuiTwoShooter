// ==========================================
// Admin API - Verify Tournament Ticket Count
// ==========================================

import { NextRequest } from 'next/server';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { getGamePassService } from '@/lib/sui/game-pass-service';

export const POST = withApiHandler(
  async (request: NextRequest) => {
    const body = await getRequestBody<{
      playerAddress: string;
    }>(request);

    const { playerAddress } = body;

    if (!playerAddress || typeof playerAddress !== 'string') {
      throw new Error('Player address is required');
    }

    // Validate address format (basic check)
    if (!playerAddress.startsWith('0x') || playerAddress.length < 10) {
      throw new Error('Invalid player address format');
    }

    const gamePassService = getGamePassService();
    const result = await gamePassService.verifyTicketCount(playerAddress);

    if (!result.success) {
      throw new Error(result.error || 'Failed to verify ticket count');
    }

    return {
      success: true,
      ticketCountField: result.ticketCountField,
      actualTicketCount: result.actualTicketCount,
      isAccurate: result.isAccurate,
      discrepancy: result.discrepancy,
    };
  }
);

