// ==========================================
// Tournaments API Route - Get active tournaments
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
    
    // Get player address from query parameter (optional)
    const { searchParams } = new URL(request.url);
    const playerAddress = searchParams.get('playerAddress');
    const forceRefresh = searchParams.has('_refresh'); // Cache-busting parameter
    
    // Get tournaments (uses cache to reduce RPC calls, unless forceRefresh is set)
    const tournaments = await tournamentService.getActiveTournaments(forceRefresh);

    // If player address is provided, enrich tournaments with player-specific data
    if (playerAddress) {
      const { getGamePassService } = await import('@/lib/sui/game-pass-service');
      const gamePassService = getGamePassService();
      
      // Get player's ticket count (this may use cache)
      let ticketCount = 0;
      try {
        const gamePassStatus = await gamePassService.getGamePassStatus(playerAddress);
        ticketCount = gamePassStatus.success ? (gamePassStatus.ticketCount || 0) : 0;
      } catch (error) {
        // If game pass query fails (e.g., rate limit), continue with ticketCount = 0
        console.warn('Failed to get game pass status for tournament enrichment:', error);
      }

      // Enrich tournaments with player data
      // Use Promise.allSettled to handle individual failures gracefully (e.g., rate limits)
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
                hasEntered: playerRankResult.success && playerRankResult.rank !== null,
                rank: playerRankResult.rank ?? null,
                score: playerRankResult.value ?? 0,
                totalParticipants: playerRankResult.totalParticipants ?? tournament.participants,
                ticketCount,
                hasEnoughTickets: ticketCount >= tournament.entryFeeTickets,
              },
            };
          } catch (error) {
            // If getting player rank fails (e.g., rate limit), return tournament without player data
            console.warn(`Failed to get player rank for tournament ${tournament.objectId}:`, error);
            return {
              ...tournament,
              playerData: {
                hasEntered: false,
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
    }

    return {
      success: true,
      tournaments,
    };
  }
);

