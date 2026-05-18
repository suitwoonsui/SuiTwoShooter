// ==========================================
// Admin API: Delete Tournament
// Uses platform cancel when configured (platform event); else game contract delete (legacy).
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { getTournamentService } from '@/lib/services/tournament/core/tournament-service';
import { assertGameAdminServerConfigured } from '@/lib/auth';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { platformEventsClient } from '@/lib/services/platform/client/platform-client';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    assertGameAdminServerConfigured();

    // Await params (Next.js 15 requirement)
    const { id } = await params;
    const tournamentId = parseInt(id, 10);

    if (isNaN(tournamentId)) {
      throw new Error('Invalid tournament ID');
    }

    const body = await getRequestBody<{ tournamentObjectId: string; adminWalletAddress?: string }>(request);
    const { tournamentObjectId, adminWalletAddress } = body;

    if (!tournamentObjectId) {
      throw new Error('tournamentObjectId is required');
    }

    // Verify caller is the game admin
    const adminWalletService = getAdminWalletService();
    const expectedAdmin = adminWalletService.getAddress().toLowerCase();
    const providedAdmin = adminWalletAddress?.toLowerCase();
    if (!providedAdmin || providedAdmin !== expectedAdmin) {
      throw new Error('Unauthorized. adminWalletAddress must match the game admin.');
    }

    PlatformLogger.info('🗑️ [ADMIN API] Tournament deletion request', {
      tournamentId,
      tournamentObjectId,
    });

    // Get tournament service
    const tournamentService = getTournamentService();

    // Verify tournament exists and hasn't started
    const tournamentResult = await tournamentService.getTournament(tournamentObjectId);
    if (!tournamentResult.success || !tournamentResult.tournament) {
      throw new Error(tournamentResult.error || 'Failed to get tournament');
    }

    const tournament = tournamentResult.tournament;
    if (tournament.tournamentId !== tournamentId) {
      throw new Error(`Tournament ID mismatch: expected ${tournamentId}, got ${tournament.tournamentId}`);
    }

    if (tournament.participants > 0) {
      throw new Error('Cannot delete tournament that has participants');
    }

    const cancelRes = await platformEventsClient.cancelEvent(tournamentObjectId);
    if (!cancelRes?.success) {
      throw new Error(cancelRes?.error || 'Platform failed to cancel event.');
    }
    PlatformLogger.info('Tournament cancelled via platform', { tournamentId, tournamentObjectId, digest: cancelRes.digest });
    return {
      success: true,
      message: `Tournament ${tournamentId} cancelled successfully`,
      digest: cancelRes.digest,
      source: 'platform',
    };
  }
);

