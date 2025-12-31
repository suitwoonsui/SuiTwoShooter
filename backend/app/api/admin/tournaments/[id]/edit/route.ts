// ==========================================
// Admin API: Edit Tournament
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
    const {
      tournamentObjectId,
      name,
      startTime,
      endTime,
      entryFeeTickets,
      category,
    } = body;

    if (!tournamentObjectId) {
      throw new Error('tournamentObjectId is required');
    }

    BadgeLogger.info('✏️ [ADMIN API] Tournament edit request', {
      tournamentId,
      tournamentObjectId,
      updates: {
        name: name ? 'updated' : 'unchanged',
        startTime: startTime ? 'updated' : 'unchanged',
        endTime: endTime ? 'updated' : 'unchanged',
        entryFeeTickets: entryFeeTickets !== undefined ? 'updated' : 'unchanged',
        category: category !== undefined ? 'updated' : 'unchanged',
      },
    });

    // Get tournament service
    const tournamentService = getTournamentService();

    // Verify tournament exists and hasn't started
    const activeTournaments = await tournamentService.getActiveTournaments(true);
    const pastTournaments = await tournamentService.getPastTournaments(1000);
    const allTournaments = [...activeTournaments, ...pastTournaments];

    const tournament = allTournaments.find(
      (t: any) => t.tournamentId === tournamentId
    );

    if (!tournament) {
      throw new Error(`Tournament ${tournamentId} not found`);
    }

    const currentTime = Date.now();
    if (currentTime >= tournament.startTime) {
      throw new Error('Cannot edit tournament that has already started');
    }

    // Get admin wallet service
    const adminWalletService = getAdminWalletService();
    const network = config.sui.network;
    const client = network === 'testnet' 
      ? adminWalletService.getTestnetClient()
      : adminWalletService.getMainnetClient();

    const tournamentAdminCapId = config.contracts.tournamentAdminCap;
    const packageId = config.contracts.gameScore?.split('::')[0] || config.contracts.gameScore;

    if (!tournamentAdminCapId) {
      throw new Error('Tournament admin cap not configured');
    }

    // Get Clock object ID
    const clockObjectId = '0x6';

    const { Transaction } = await import('@mysten/sui/transactions');
    const digests: string[] = [];

    // Update name if provided
    if (name !== undefined && name !== null && name !== '') {
      const nameBytes = new TextEncoder().encode(name);
      const nameTxb = new Transaction();
      nameTxb.setSender(adminWalletService.getAddress());
      nameTxb.moveCall({
        target: `${packageId}::tournaments::admin_update_tournament_name`,
        arguments: [
          nameTxb.object(tournamentObjectId),
          nameTxb.object(tournamentAdminCapId),
          nameTxb.pure.vector('u8', Array.from(nameBytes)),
          nameTxb.object(clockObjectId),
        ],
      });
      nameTxb.setGasBudget(10000000);

      const nameResult = await client.signAndExecuteTransaction({
        signer: adminWalletService.getKeypair(),
        transaction: nameTxb,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });
      digests.push(nameResult.digest);
    }

    // Update times if provided
    if (startTime !== undefined && endTime !== undefined) {
      const timesTxb = new Transaction();
      timesTxb.setSender(adminWalletService.getAddress());
      timesTxb.moveCall({
        target: `${packageId}::tournaments::admin_update_tournament_times`,
        arguments: [
          timesTxb.object(tournamentObjectId),
          timesTxb.object(tournamentAdminCapId),
          timesTxb.pure.u64(BigInt(startTime)),
          timesTxb.pure.u64(BigInt(endTime)),
          timesTxb.object(clockObjectId),
        ],
      });
      timesTxb.setGasBudget(10000000);

      const timesResult = await client.signAndExecuteTransaction({
        signer: adminWalletService.getKeypair(),
        transaction: timesTxb,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });
      digests.push(timesResult.digest);
    }

    // Update entry fee if provided
    if (entryFeeTickets !== undefined && entryFeeTickets !== null) {
      const feeTxb = new Transaction();
      feeTxb.setSender(adminWalletService.getAddress());
      feeTxb.moveCall({
        target: `${packageId}::tournaments::admin_update_tournament_entry_fee`,
        arguments: [
          feeTxb.object(tournamentObjectId),
          feeTxb.object(tournamentAdminCapId),
          feeTxb.pure.u64(BigInt(entryFeeTickets)),
          feeTxb.object(clockObjectId),
        ],
      });
      feeTxb.setGasBudget(10000000);

      const feeResult = await client.signAndExecuteTransaction({
        signer: adminWalletService.getKeypair(),
        transaction: feeTxb,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });
      digests.push(feeResult.digest);
    }

    // Update category if provided
    if (category !== undefined && category !== null) {
      const categoryTxb = new Transaction();
      categoryTxb.setSender(adminWalletService.getAddress());
      categoryTxb.moveCall({
        target: `${packageId}::tournaments::admin_update_tournament_category`,
        arguments: [
          categoryTxb.object(tournamentObjectId),
          categoryTxb.object(tournamentAdminCapId),
          categoryTxb.pure.u8(category),
          categoryTxb.object(clockObjectId),
        ],
      });
      categoryTxb.setGasBudget(10000000);

      const categoryResult = await client.signAndExecuteTransaction({
        signer: adminWalletService.getKeypair(),
        transaction: categoryTxb,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });
      digests.push(categoryResult.digest);
    }

    if (digests.length === 0) {
      throw new Error('No updates provided');
    }

    BadgeLogger.info('✏️ [ADMIN API] Tournament updated successfully', {
      tournamentId,
      tournamentObjectId,
      digests,
    });

    return {
      success: true,
      message: `Tournament ${tournamentId} updated successfully`,
      digests,
    };
  }
);

