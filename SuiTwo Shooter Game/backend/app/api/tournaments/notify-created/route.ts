// ==========================================
// Notify Tournament Created API
// ==========================================
// Called by frontend after successful tournament creation.
// Distribution and move-to-past are scheduled on the platform (Tide); no game scheduler.

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { getTournamentService } from '@/lib/services/tournament/core/tournament-service';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';

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
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        'tournamentObjectId is required'
      );
    }

    PlatformLogger.info('🏆 [NOTIFY CREATED] Tournament creation notification received', {
      tournamentObjectId,
      transactionDigest,
    });

    // Get tournament details from blockchain
    const tournamentService = getTournamentService();
    const result = await tournamentService.getTournament(tournamentObjectId);

    if (!result.success || !result.tournament) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        result.error || 'Tournament not found'
      );
    }

    const tournament = result.tournament;

    PlatformLogger.info('🏆 [NOTIFY CREATED] Tournament creation acknowledged; platform Tide handles distribution', {
      tournamentId: tournament.tournamentId,
      name: tournament.name,
      endTime: new Date(tournament.endTime).toISOString(),
    });

    return {
      success: true,
      message: 'Tournament created. Distribution is handled by the platform (Tide).',
      tournament: {
        tournamentId: tournament.tournamentId,
        name: tournament.name,
        endTime: tournament.endTime,
      },
    };
  }
);

