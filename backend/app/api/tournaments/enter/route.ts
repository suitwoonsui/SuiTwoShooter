// ==========================================
// Tournament Entry API Route
// Executes tournament entry transaction with admin wallet (admin pays gas)
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { getTournamentService } from '@/lib/sui/tournament-service';
import { getGamePassService } from '@/lib/sui/game-pass-service';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { BadgeError, BadgeErrorCode } from '@/lib/sui/badge-errors';
import { BadgeValidators } from '@/lib/sui/badge-validators';
import { BadgeLogger } from '@/lib/sui/badge-logger';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(
  async (request: NextRequest) => {
    const body = await getRequestBody<{
      playerAddress: string;
      tournamentObjectId: string;
      ticketId?: number;  // Optional - will find a valid ticket if not provided
    }>(request);

    const { playerAddress, tournamentObjectId, ticketId } = body;

    // Validate required fields
    if (!playerAddress) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'playerAddress is required'
      );
    }

    // Validate address format
    try {
      BadgeValidators.validateAddress(playerAddress);
    } catch (error) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'Invalid player address format'
      );
    }

    if (!tournamentObjectId) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'tournamentObjectId is required'
      );
    }

    const tournamentService = getTournamentService();
    const gamePassService = getGamePassService();

    // Note: Players can enter multiple times - each entry consumes a ticket
    // The contract will handle re-entry by updating the participant entry
    // and preserving the player's best score in the leaderboard

    // If ticketId not provided, try to find a valid one
    let ticketIdToUse = ticketId;
    let result;
    
    if (!ticketIdToUse || ticketIdToUse === 0) {
      BadgeLogger.info('No ticket ID provided, attempting to find valid ticket', {
        playerAddress,
      });

      // Query available ticket IDs for this player
      const availableTicketsResult = await gamePassService.getAvailableTicketIds(playerAddress);
      
      if (!availableTicketsResult.success) {
        throw new BadgeError(
          BadgeErrorCode.INVALID_ADDRESS,
          availableTicketsResult.error || 'Failed to query available tickets'
        );
      }

      const availableTicketIds = availableTicketsResult.ticketIds || [];
      
      if (availableTicketIds.length === 0) {
        throw new BadgeError(
          BadgeErrorCode.INVALID_ADDRESS,
          'No tournament tickets available. Please purchase tickets from the store.'
        );
      }

      // Select the first available ticket ID
      ticketIdToUse = availableTicketIds[0];
      
      BadgeLogger.info('Selected ticket ID from available tickets', {
        playerAddress,
        availableTicketIds,
        selectedTicketId: ticketIdToUse,
      });
    }

    // Enter tournament with the selected ticket ID
    result = await tournamentService.enterTournamentForPlayer(
      playerAddress,
      tournamentObjectId,
      ticketIdToUse
    );

    if (!result.success) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        result.error || 'Failed to enter tournament'
      );
    }

    return {
      success: true,
      transactionDigest: result.transactionDigest,
    };
  }
);

