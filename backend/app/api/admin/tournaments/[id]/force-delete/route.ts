// ==========================================
// Admin API: Remove Tournament from Registry
// ==========================================
// NOTE: Tournament objects are SHARED and cannot be deleted.
// This only removes them from registry tables.
// The Tournament objects will remain on-chain but won't be accessible.

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

    BadgeLogger.info('🗑️ [ADMIN API] Force delete tournament request', {
      tournamentId,
    });

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

    // Force remove tournament from registry (no restrictions)
    const { Transaction } = await import('@mysten/sui/transactions');
    const txb = new Transaction();
    txb.setSender(adminWalletService.getAddress());

    txb.moveCall({
      target: `${packageId}::tournaments::admin_remove_tournament_from_registry`,
      arguments: [
        txb.object(tournamentRegistryId),
        txb.pure.u64(tournamentId),
        txb.object(tournamentAdminCapId),
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

    if (result.effects?.status?.status !== 'success') {
      const error = result.effects?.status?.error || 'Unknown error';
      BadgeLogger.error('🗑️ [ADMIN API] Force delete tournament failed', {
        tournamentId,
        error,
      });
      throw new Error(`Failed to force delete tournament: ${error}`);
    }

    BadgeLogger.info('🗑️ [ADMIN API] Tournament force deleted successfully', {
      tournamentId,
      digest: result.digest,
    });

    return {
      success: true,
      message: `Tournament ${tournamentId} force deleted successfully (removed from registry)`,
      digest: result.digest,
    };
  }
);

