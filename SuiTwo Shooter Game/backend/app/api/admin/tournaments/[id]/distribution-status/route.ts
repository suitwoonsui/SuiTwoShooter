// ==========================================
// Admin API: Get platform distribution state for a tournament (Phase 4)
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler } from '@/lib/api/api-handler';
import { getTournamentService } from '@/lib/services/tournament/core/tournament-service';
import { platformEventsClient } from '@/lib/services/platform/client/platform-client';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const GET = withApiHandler(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const tournamentId = parseInt(id, 10);
    if (isNaN(tournamentId)) {
      throw new Error('Invalid tournament ID');
    }

    const tournamentService = getTournamentService();
    const [activeTournaments, pastTournaments] = await Promise.all([
      tournamentService.getActiveTournaments(true),
      tournamentService.getPastTournaments(1000),
    ]);
    const tournament = [...activeTournaments, ...pastTournaments].find((t: any) => t.tournamentId === tournamentId);
    if (!tournament) {
      throw new Error('Tournament not found');
    }

    const objectId = tournament.objectId ?? '';
    if (!objectId) {
      return { success: true, tournamentId, eventObjectId: null, distribution: null };
    }

    const status = await platformEventsClient.getDistributionStatus(objectId);
    return {
      success: status.success,
      tournamentId,
      eventObjectId: objectId,
      distribution: status.distribution ?? null,
      error: status.error,
    };
  }
);
