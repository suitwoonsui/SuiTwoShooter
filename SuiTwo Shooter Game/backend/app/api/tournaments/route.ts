// ==========================================
// Tournaments API Route - Get active tournaments
// Anonymous list is cached in @/lib/cache/public-nonuser-data-cache (shared with bootstrap).
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler } from '@/lib/api/api-handler';
import {
  getOrLoadTournamentsPublicList,
  type TournamentListBranch,
} from '@/lib/cache/public-nonuser-data-cache';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const GET = withApiHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const playerAddress = searchParams.get('playerAddress');
  const forceRefresh = searchParams.has('_refresh');
  const statusFilter = searchParams.get('status');

  let branch: TournamentListBranch = 'activeAndUpcoming';
  if (statusFilter === 'upcoming') branch = 'upcoming';
  else if (statusFilter === 'active') branch = 'active';

  const base = await getOrLoadTournamentsPublicList(branch, { forceRefresh });
  let tournaments = base.tournaments;

  if (playerAddress && tournaments.length > 0) {
    const { platformGamePassClient, buildPlatformCallOptions } = await import(
      '@/lib/services/platform/client/platform-client'
    );

    let ticketCount = 0;
    try {
      const gamePassStatus = await platformGamePassClient.getGamePassStatus(
        playerAddress,
        buildPlatformCallOptions(request)
      );
      ticketCount = gamePassStatus.success ? (gamePassStatus.ticketCount || 0) : 0;
    } catch (error) {
      console.warn('Failed to get game pass status for tournament enrichment:', error);
    }

    const { getTournamentService } = await import('@/lib/services/tournament/core/tournament-service');
    const tournamentService = getTournamentService();
    const enrichedTournaments = await Promise.allSettled(
      tournaments.map(async (tournament: any) => {
        try {
          const playerRankResult = await tournamentService.getPlayerRank(tournament.objectId, playerAddress);

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

    const successfulTournaments = enrichedTournaments
      .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
      .map((result) => result.value);

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
});
