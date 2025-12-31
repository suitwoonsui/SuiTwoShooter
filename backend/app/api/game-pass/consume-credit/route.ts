// ==========================================
// Game Pass Consume Credit API Route
// Consumes a game credit (admin wallet signs and pays gas)
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { getGamePassService } from '@/lib/sui/game-pass-service';
import { BadgeError, BadgeErrorCode } from '@/lib/sui/badge-errors';
import { BadgeValidators } from '@/lib/sui/badge-validators';
import { BadgeLogger } from '@/lib/sui/badge-logger';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(
  async (request: NextRequest) => {
    const body = await getRequestBody<{
      playerAddress: string;
    }>(request);
    const { playerAddress } = body;

    // Validate required fields
    if (!playerAddress) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'playerAddress is required'
      );
    }

    // Validate player address format
    BadgeValidators.validateAddress(playerAddress);

    BadgeLogger.info('Consuming game credit', {
      playerAddress,
    });

    // Check game pass status first
    const gamePassService = getGamePassService();
    const status = await gamePassService.getGamePassStatus(playerAddress);

    if (!status.success) {
      throw new BadgeError(
        BadgeErrorCode.BLOCKCHAIN_QUERY_FAILED,
        status.error || 'Failed to check game pass status'
      );
    }

    if (!status.hasPass || !status.isActive || (status.gamesRemaining || 0) === 0) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'Player does not have an active game pass with credits remaining'
      );
    }

    // Consume credit
    const result = await gamePassService.consumeGameCredit(playerAddress);

    if (!result.success) {
      throw new BadgeError(
        BadgeErrorCode.TRANSACTION_FAILED,
        result.error || 'Failed to consume game credit'
      );
    }

    BadgeLogger.info('Game credit consumed successfully', {
      playerAddress,
      digest: result.digest,
      gamesRemaining: result.gamesRemaining,
    });

    return {
      success: true,
      digest: result.digest,
      gamesRemaining: result.gamesRemaining || 0,
      playerAddress,
    };
  },
  {
    logRequest: true,
  }
);

