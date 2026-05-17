// ==========================================
// Admin API: Retry platform distribution for a tournament (Phase 4)
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { getTournamentService } from '@/lib/services/tournament/core/tournament-service';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { platformEventsClient } from '@/lib/services/platform/client/platform-client';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const tournamentId = parseInt(id, 10);
    if (isNaN(tournamentId)) {
      throw new Error('Invalid tournament ID');
    }

    const body = await getRequestBody<{ adminWalletAddress?: string }>(request).catch(
      (): { adminWalletAddress?: string } => ({})
    );
    const adminWalletService = getAdminWalletService();
    const expectedAdmin = adminWalletService.getAddress().toLowerCase();
    const providedAdmin = body?.adminWalletAddress?.toLowerCase();
    if (!providedAdmin || providedAdmin !== expectedAdmin) {
      throw new Error('Unauthorized. adminWalletAddress must match the game admin.');
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
      throw new Error('Tournament has no event object ID');
    }

    const retryResult = await platformEventsClient.retryDistribution(objectId);
    if (!retryResult.success) {
      throw new Error(retryResult.error ?? 'Retry failed');
    }

    return {
      success: true,
      tournamentId,
      message: 'Distribution queued for retry.',
      distribution: retryResult.distribution,
    };
  }
);
