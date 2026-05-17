// ==========================================
// Tournament Entry State API Route
// Per-player, per-tournament status with short TTL (frontend caches + SWR).
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler } from '@/lib/api/api-handler';
import { getTournamentService } from '@/lib/services/tournament/core/tournament-service';
import { buildPlatformCallOptions, platformGamePassClient } from '@/lib/services/platform/client/platform-client';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const GET = withApiHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const playerAddress = (searchParams.get('playerAddress') || '').trim();
  const tournamentObjectId = (searchParams.get('tournamentObjectId') || '').trim();

  if (!playerAddress) {
    return { success: false, error: 'playerAddress query parameter is required' };
  }
  if (!tournamentObjectId) {
    return { success: false, error: 'tournamentObjectId query parameter is required' };
  }

  const tournamentService = getTournamentService();
  const tournamentRes = await tournamentService.getTournament(tournamentObjectId);
  if (!tournamentRes.success || !tournamentRes.tournament) {
    return { success: false, error: tournamentRes.error || 'Tournament not found' };
  }

  const platformOptions = buildPlatformCallOptions(request);

  // Tickets (used for hasEnoughTickets)
  let ticketCount = 0;
  try {
    const gamePassStatus = await platformGamePassClient.getGamePassStatus(playerAddress, platformOptions);
    ticketCount = gamePassStatus.success ? (gamePassStatus.ticketCount || 0) : 0;
  } catch (error) {
    console.warn('Failed to get game pass status for entry-state:', error);
  }

  // Rank/score (used for hasEntered)
  const rankRes = await tournamentService.getPlayerRank(tournamentObjectId, playerAddress);

  const entryFeeTickets = Number(tournamentRes.tournament.entryFeeTickets || 0);
  const hasEntered = !!(rankRes.success && rankRes.rank !== null);

  return {
    success: true,
    tournamentObjectId,
    playerAddress,
    entryState: {
      hasEntered,
      rank: rankRes.success ? (rankRes.rank ?? null) : null,
      score: rankRes.success ? (rankRes.value ?? 0) : 0,
      totalParticipants: rankRes.success
        ? (rankRes.totalParticipants ?? tournamentRes.tournament.participants)
        : tournamentRes.tournament.participants,
      ticketCount,
      hasEnoughTickets: ticketCount >= entryFeeTickets,
    },
  };
});

