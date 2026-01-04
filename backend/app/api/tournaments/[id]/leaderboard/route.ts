// ==========================================
// Tournament Leaderboard API Route
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { handleCorsPreflight } from '../../../../../../../../base/backend/lib/cors';
import { getTournamentService } from '../../../../../../../../backend/lib/sui/tournament-service';
import { withApiHandler } from '../../../../../../../../base/backend/lib/api/api-handler';
import { BadgeLogger } from '../../../../../../../../base/backend/lib/sui/badge-logger';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const GET = withApiHandler(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const tournamentObjectId = id;

    BadgeLogger.info('🏆 [LEADERBOARD API] Leaderboard request received', {
      tournamentObjectId,
      url: request.url,
    });

    if (!tournamentObjectId) {
      BadgeLogger.error('🏆 [LEADERBOARD API] Tournament ID missing');
      return NextResponse.json(
        { success: false, error: 'Tournament ID is required' },
        { status: 400 }
      );
    }

    // Get limit from query params (default 100)
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    BadgeLogger.info('🏆 [LEADERBOARD API] Request parameters', {
      tournamentObjectId,
      limit,
    });

    const tournamentService = getTournamentService();
    
    // Get tournament info first
    BadgeLogger.info('🏆 [LEADERBOARD API] Fetching tournament details', {
      tournamentObjectId,
    });
    
    const tournamentResult = await tournamentService.getTournament(tournamentObjectId);
    
    if (!tournamentResult.success || !tournamentResult.tournament) {
      BadgeLogger.error('🏆 [LEADERBOARD API] Tournament not found', {
        tournamentObjectId,
        error: tournamentResult.error,
      });
      return NextResponse.json(
        { success: false, error: tournamentResult.error || 'Tournament not found' },
        { status: 404 }
      );
    }

    BadgeLogger.info('🏆 [LEADERBOARD API] Tournament details retrieved', {
      tournamentObjectId,
      tournamentId: tournamentResult.tournament.tournamentId,
      tournamentName: tournamentResult.tournament.name,
      category: tournamentResult.tournament.category,
      participants: tournamentResult.tournament.participants,
      status: tournamentResult.tournament.status,
    });

    // Get leaderboard
    BadgeLogger.info('🏆 [LEADERBOARD API] Fetching leaderboard', {
      tournamentObjectId,
      tournamentId: tournamentResult.tournament.tournamentId,
      limit,
    });
    
    const leaderboardResult = await tournamentService.getTournamentLeaderboard(
      tournamentObjectId,
      limit
    );

    if (!leaderboardResult.success) {
      BadgeLogger.error('🏆 [LEADERBOARD API] Failed to get leaderboard', {
        tournamentObjectId,
        error: leaderboardResult.error,
      });
      return NextResponse.json(
        { success: false, error: leaderboardResult.error || 'Failed to get leaderboard' },
        { status: 500 }
      );
    }

    BadgeLogger.info('🏆 [LEADERBOARD API] Leaderboard retrieved successfully', {
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
