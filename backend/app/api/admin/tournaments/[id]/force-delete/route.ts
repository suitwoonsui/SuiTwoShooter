// ==========================================
// Admin API: Remove Tournament Event from Registry
// All tx building via platform Channel (station-remove-event-from-registry).
// Event is removed from upcoming/active/past lists; object remains on-chain.
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler } from '@/lib/api/api-handler';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { getTournamentService } from '@/lib/services/tournament/core/tournament-service';
import { getConfig } from '@/config/config';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import {
  buildBatchViaChannel,
  platformTxClient,
  getCorridorAdminCapabilityObjectIdFromEnv,
  buildPlatformCallOptions,
} from '@/lib/services/platform/client/platform-client';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const config = getConfig();
    if (!config.security.apiKey || config.security.apiKey === '') {
      throw new Error('API_KEY not configured on server.');
    }

    const { id } = await params;
    const tournamentId = parseInt(id, 10);

    if (isNaN(tournamentId)) {
      throw new Error('Invalid tournament ID');
    }

    PlatformLogger.info('🗑️ [ADMIN API] Force delete tournament request (platform)', {
      tournamentId,
    });

    const corridorAdminCapId = getCorridorAdminCapabilityObjectIdFromEnv();
    if (!corridorAdminCapId || !corridorAdminCapId.startsWith('0x')) {
      throw new Error('CORRIDOR_ADMIN_CAP_OBJECT_ID (or _TESTNET/_MAINNET) not configured. Required for platform remove-from-registry.');
    }

    const tournamentService = getTournamentService();
    const activeTournaments = await tournamentService.getActiveTournaments(true);
    const pastTournaments = await tournamentService.getPastTournaments(1000);
    const allTournaments = [...activeTournaments, ...pastTournaments];

    const tournament = allTournaments.find(
      (t: { tournamentId: number }) => t.tournamentId === tournamentId
    );

    if (!tournament) {
      throw new Error(`Tournament ${tournamentId} not found`);
    }

    const eventObjectId = (tournament as { objectId: string }).objectId;
    if (!eventObjectId || !eventObjectId.startsWith('0x')) {
      throw new Error('Tournament object ID not available');
    }

    const adminWalletService = getAdminWalletService();
    const buildRes = await buildBatchViaChannel(
      {
        operations: [
          {
            operationId: 'station-remove-event-from-registry',
            params: {
              eventId: eventObjectId,
              corridorAdminCapId,
              senderAddress: adminWalletService.getAddress(),
            },
          },
        ],
      },
      buildPlatformCallOptions()
    );

    if (!buildRes.success || !buildRes.transactions?.length) {
      const err = buildRes.errors?.[0] ?? buildRes.error ?? 'Platform build failed';
      PlatformLogger.error('🗑️ [ADMIN API] Force delete build failed', { tournamentId, error: err });
      throw new Error(err);
    }

    const txBase64 = buildRes.transactions[0];
    const signed = await adminWalletService.getKeypair().signTransaction(Buffer.from(txBase64, 'base64'));
    const execRes = await platformTxClient.executeSigned(
      { transactionBytesBase64: txBase64, signature: signed.signature },
      buildPlatformCallOptions()
    );

    if (!execRes.success) {
      PlatformLogger.error('🗑️ [ADMIN API] Force delete execute failed', { tournamentId, error: execRes.error });
      throw new Error(execRes.error ?? 'Failed to execute remove-from-registry transaction');
    }

    PlatformLogger.info('🗑️ [ADMIN API] Tournament removed from registry via platform', {
      tournamentId,
      digest: execRes.digest,
    });

    return {
      success: true,
      message: `Tournament ${tournamentId} force deleted successfully (removed from registry)`,
      digest: execRes.digest,
    };
  }
);
