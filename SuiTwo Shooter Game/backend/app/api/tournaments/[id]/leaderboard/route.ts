// ==========================================
// Tournament Leaderboard API Route
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { getTournamentService } from '@/lib/services/tournament/core/tournament-service';
import { withApiHandler } from '@/lib/api/api-handler';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const GET = withApiHandler(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const tournamentObjectId = id;

    PlatformLogger.info('🏆 [LEADERBOARD API] Leaderboard request received', {
      tournamentObjectId,
      url: request.url,
    });

    if (!tournamentObjectId) {
      PlatformLogger.error('🏆 [LEADERBOARD API] Tournament ID missing');
      return NextResponse.json(
        { success: false, error: 'Tournament ID is required' },
        { status: 400 }
      );
    }

    // Get limit from query params (default 100)
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    PlatformLogger.info('🏆 [LEADERBOARD API] Request parameters', {
      tournamentObjectId,
      limit,
    });

    const tournamentService = getTournamentService();
    
    // Get tournament info first
    PlatformLogger.info('🏆 [LEADERBOARD API] Fetching tournament details', {
      tournamentObjectId,
    });
    
    const tournamentResult = await tournamentService.getTournament(tournamentObjectId);
    
    if (!tournamentResult.success || !tournamentResult.tournament) {
      // Not-found is expected when no tournaments/events exist yet (or when callers pass a placeholder ID).
      PlatformLogger.warn('🏆 [LEADERBOARD API] Tournament not found', {
        tournamentObjectId,
        error: tournamentResult.error,
      });
      return NextResponse.json(
        { success: false, error: tournamentResult.error || 'Tournament not found', leaderboard: [], limit },
        { status: 200 }
      );
    }

    PlatformLogger.info('🏆 [LEADERBOARD API] Tournament details retrieved', {
      tournamentObjectId,
      tournamentId: tournamentResult.tournament.tournamentId,
      tournamentName: tournamentResult.tournament.name,
      category: tournamentResult.tournament.category,
      participants: tournamentResult.tournament.participants,
      status: tournamentResult.tournament.status,
    });

    // Get leaderboard
    PlatformLogger.info('🏆 [LEADERBOARD API] Fetching leaderboard', {
      tournamentObjectId,
      tournamentId: tournamentResult.tournament.tournamentId,
      limit,
    });
    
    const leaderboardResult = await tournamentService.getTournamentLeaderboard(
      tournamentObjectId,
      limit
    );

    if (!leaderboardResult.success) {
      PlatformLogger.error('🏆 [LEADERBOARD API] Failed to get leaderboard', {
        tournamentObjectId,
        error: leaderboardResult.error,
      });
      return NextResponse.json(
        { success: false, error: leaderboardResult.error || 'Failed to get leaderboard' },
        { status: 500 }
      );
    }

    PlatformLogger.info('🏆 [LEADERBOARD API] Leaderboard retrieved successfully', {
      tournamentObjectId,
      tournamentId: tournamentResult.tournament.tournamentId,
      tournamentName: tournamentResult.tournament.name,
      leaderboardEntries: leaderboardResult.leaderboard?.length || 0,
      limit,
      entries: leaderboardResult.leaderboard?.map((e, i) => ({
        rank: e.rank,
        playerAddress: e.playerAddress,
        playerName: e.playerName || '(no name)',
        value: e.value,
        displayValue: e.displayValue,
      })) || [],
    });

    return {
      success: true,
      tournament: tournamentResult.tournament,
      leaderboard: leaderboardResult.leaderboard || [],
      limit,
    };
  }
);
