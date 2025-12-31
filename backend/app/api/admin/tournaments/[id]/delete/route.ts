// ==========================================
// Admin API: Delete Tournament
// ==========================================

import { NextRequest } from 'next/server';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { BadgeLogger } from '@/lib/sui/badge-logger';
import { getTournamentService } from '@/lib/sui/tournament-service';
import { getConfig } from '@/config/config';
import { getAdminWalletService } from '@/lib/sui/admin-wallet-service';

export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    },
  });
}

export const POST = withApiHandler(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const config = getConfig();
    if (!config.security.apiKey || config.security.apiKey === '') {
      throw new Error('API_KEY not configured on server.');
    }

    // Await params (Next.js 15 requirement)
    const { id } = await params;
    const tournamentId = parseInt(id, 10);

    if (isNaN(tournamentId)) {
      throw new Error('Invalid tournament ID');
    }

    const body = await getRequestBody(request);
    const { tournamentObjectId } = body;

    if (!tournamentObjectId) {
      throw new Error('tournamentObjectId is required');
    }

    BadgeLogger.info('🗑️ [ADMIN API] Tournament deletion request', {
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

    const currentTime = Date.now();


    if (tournament.participants > 0) {
      throw new Error('Cannot delete tournament that has participants');
    }

    // Get admin wallet service
    const adminWalletService = getAdminWalletService();
    const network = config.sui.network;
    const client = network === 'testnet' 
      ? adminWalletService.getTestnetClient()
      : adminWalletService.getMainnetClient();

    const tournamentRegistryId = config.contracts.tournamentRegistry;
    const tournamentAdminCapId = config.contracts.tournamentAdminCap;
    const packageId = config.contracts.gameScore?.split('::')[0] || config.contracts.gameScore;

    if (!tournamentRegistryId || !tournamentAdminCapId) {
      throw new Error('Tournament registry or admin cap not configured');
    }

    // Get Clock object ID
    const clockObjectId = '0x6';

    // Delete tournament from registry
    const { Transaction } = await import('@mysten/sui/transactions');
    const txb = new Transaction();
    txb.setSender(adminWalletService.getAddress());

    txb.moveCall({
      target: `${packageId}::tournaments::admin_delete_tournament`,
      arguments: [
        txb.object(tournamentRegistryId),
        txb.object(tournamentObjectId),
        txb.object(tournamentAdminCapId),
        txb.object(clockObjectId),
      ],
    });

    txb.setGasBudget(10000000);

    const result = await client.signAndExecuteTransaction({
      signer: adminWalletService.getKeypair(),
      transaction: txb,
      options: {
        showEffects: true,
        showEvents: true,
      },
    });

    BadgeLogger.info('🗑️ [ADMIN API] Tournament deleted successfully', {
      tournamentId,
      tournamentObjectId,
      digest: result.digest,
    });

    return {
      success: true,
      message: `Tournament ${tournamentId} deleted successfully`,
      digest: result.digest,
    };
  }
);

