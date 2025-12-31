// ==========================================
// Game Pass Status API Route
// Gets player's game pass status and credits remaining
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { getGamePassService } from '@/lib/sui/game-pass-service';
import { BadgeValidators } from '@/lib/sui/badge-validators';
import { BadgeError, BadgeErrorCode } from '@/lib/sui/badge-errors';
import { withApiHandler, getAddressParam } from '@/lib/api/api-handler';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const GET = withApiHandler(
  async (
    request: NextRequest,
    context: { params: Promise<{ address: string }> }
  ) => {
    const address = await getAddressParam(context.params);

    // Validate address format
    BadgeValidators.validateAddress(address);

    // Get game pass status
    const gamePassService = getGamePassService();
    const status = await gamePassService.getGamePassStatus(address);

    if (!status.success) {
      throw new BadgeError(
        BadgeErrorCode.BLOCKCHAIN_QUERY_FAILED,
        status.error || 'Failed to get game pass status'
      );
    }

    return {
      success: true,
      hasPass: status.hasPass || false,
      gamesRemaining: status.gamesRemaining || 0,
      isActive: status.isActive || false,
      packType: status.packType || 1,
      ticketCount: status.ticketCount || 0,
    };
  }
);
