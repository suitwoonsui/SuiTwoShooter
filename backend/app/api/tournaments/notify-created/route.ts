// ==========================================
// Notify Tournament Created API
// ==========================================
// Called by frontend after successful tournament creation
// to immediately schedule reward distribution

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { getTournamentService } from '@/lib/sui/tournament-service';
import { TournamentScheduler } from '@/lib/services/tournament-scheduler';
import { BadgeError, BadgeErrorCode } from '@/lib/sui/badge-errors';
import { BadgeLogger } from '@/lib/sui/badge-logger';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(
  async (request: NextRequest) => {
    const body = await getRequestBody<{
      tournamentObjectId: string;
      transactionDigest?: string;
    }>(request);

    const { tournamentObjectId, transactionDigest } = body;

    if (!tournamentObjectId) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'tournamentObjectId is required'
      );
    }

    BadgeLogger.info('🏆 [NOTIFY CREATED] Tournament creation notification received', {
      tournamentObjectId,
      transactionDigest,
    });

    // Get tournament details from blockchain
    const tournamentService = getTournamentService();
    const result = await tournamentService.getTournament(tournamentObjectId);

    if (!result.success || !result.tournament) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        result.error || 'Tournament not found'
      );
    }

    const tournament = result.tournament;

    // Schedule reward distribution
    TournamentScheduler.scheduleDistribution(
      tournament.tournamentId,
      tournament.objectId,
      tournament.endTime,
      tournament.name
    );

    BadgeLogger.info('🏆 [NOTIFY CREATED] Tournament scheduled for reward distribution', {
      tournamentId: tournament.tournamentId,
      name: tournament.name,
      endTime: new Date(tournament.endTime).toISOString(),
    });

    return {
      success: true,
      message: 'Tournament scheduled for reward distribution',
      tournament: {
        tournamentId: tournament.tournamentId,
        name: tournament.name,
        endTime: tournament.endTime,
      },
    };
  }
);
