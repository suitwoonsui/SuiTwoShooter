// ==========================================
// My Tournaments API Route - Get tournaments a player has entered
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler } from '@/lib/api/api-handler';
import { getTournamentService } from '@/lib/sui/tournament-service';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const GET = withApiHandler(
  async (request: NextRequest) => {
    const tournamentService = getTournamentService();
    
    // Get player address from query parameter (required)
    const { searchParams } = new URL(request.url);
    const playerAddress = searchParams.get('playerAddress');
    
    if (!playerAddress) {
      return {
        success: false,
        error: 'playerAddress query parameter is required',
      };
    }

    try {
      // Get tournament IDs the player has entered
      const enteredTournamentsResult = await tournamentService.getPlayerEnteredTournaments(playerAddress);
      
      if (!enteredTournamentsResult.success || !enteredTournamentsResult.tournamentIds) {
        return {
          success: true,
          tournaments: [],
        };
      }

      const tournamentIds = enteredTournamentsResult.tournamentIds;
      
      if (tournamentIds.length === 0) {
        return {
          success: true,
          tournaments: [],
        };
      }

      // Get full tournament details for all entered tournaments (including past)
      const tournaments = await tournamentService.getTournamentsByIds(tournamentIds);

      // Get player's ticket count
      const { getGamePassService } = await import('@/lib/sui/game-pass-service');
      const gamePassService = getGamePassService();
      
      let ticketCount = 0;
      try {
        const gamePassStatus = await gamePassService.getGamePassStatus(playerAddress);
        ticketCount = gamePassStatus.success ? (gamePassStatus.ticketCount || 0) : 0;
      } catch (error) {
        console.warn('Failed to get game pass status for my tournaments:', error);
      }

      // Enrich tournaments with player data (rank, score, etc.)
      const enrichedTournaments = await Promise.allSettled(
        tournaments.map(async (tournament) => {
          try {
            // Get player's rank and score in this tournament
            const playerRankResult = await tournamentService.getPlayerRank(
              tournament.objectId,
              playerAddress
            );

            return {
              ...tournament,
              playerData: {
                hasEntered: true, // Player has entered all tournaments in this list
                rank: playerRankResult.success ? playerRankResult.rank : null,
                score: playerRankResult.success ? playerRankResult.value : 0,
                totalParticipants: playerRankResult.success ? playerRankResult.totalParticipants : tournament.participants,
                ticketCount,
                hasEnoughTickets: ticketCount >= tournament.entryFeeTickets,
              },
            };
          } catch (error) {
            console.warn(`Failed to get player rank for tournament ${tournament.objectId}:`, error);
            return {
              ...tournament,
              playerData: {
                hasEntered: true,
                rank: null,
                score: 0,
                totalParticipants: tournament.participants,
                ticketCount,
                hasEnoughTickets: ticketCount >= tournament.entryFeeTickets,
              },
            };
          }
        })
      );

      // Extract fulfilled results
      const successfulTournaments = enrichedTournaments
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map(result => result.value);

      return {
        success: true,
        tournaments: successfulTournaments,
        playerTicketCount: ticketCount,
      };
    } catch (error) {
      console.error('Error getting my tournaments:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
);

