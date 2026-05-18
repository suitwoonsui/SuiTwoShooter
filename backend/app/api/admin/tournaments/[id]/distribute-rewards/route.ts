// ==========================================
// Admin API: Distribute Tournament Rewards
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { assertGameAdminServerConfigured } from '@/lib/auth';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { getTournamentService } from '@/lib/services/tournament/core/tournament-service';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import {
  platformEventsClient,
  platformTxClient,
} from '@/lib/services/platform/client/platform-client';
import { getTournamentGracePeriodMs } from '@/lib/services/tournament/tournament-settings';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

// In-memory lock to prevent concurrent distributions for the same tournament
const distributionLocks = new Map<number, Promise<any>>();

export const POST = withApiHandler(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    assertGameAdminServerConfigured();

    // Await params (Next.js 15 requirement)
    const { id } = await params;
    const tournamentId = parseInt(id, 10);

    if (isNaN(tournamentId)) {
      throw new Error('Invalid tournament ID');
    }

    // Verify caller is the game admin
    const body = (await getRequestBody<{ adminWalletAddress?: string }>(request).catch(
      () => ({} as { adminWalletAddress?: string })
    ));
    const adminWalletService = getAdminWalletService();
    const expectedAdmin = adminWalletService.getAddress().toLowerCase();
    const providedAdmin = body?.adminWalletAddress?.toLowerCase();
    if (!providedAdmin || providedAdmin !== expectedAdmin) {
      throw new Error('Unauthorized. adminWalletAddress must match the game admin.');
    }

    const adminAddress = adminWalletService.getAddress();
    
    PlatformLogger.info('🎁 [ADMIN API] Tournament reward distribution request', {
      adminAddress,
      tournamentId,
    });

    // Check if distribution is already in progress for this tournament
    const existingLock = distributionLocks.get(tournamentId);
    if (existingLock) {
      PlatformLogger.warn('🎁 [ADMIN API] Distribution already in progress for this tournament', {
        tournamentId,
      });
      throw new Error('Reward distribution is already in progress for this tournament. Please wait for it to complete.');
    }

    // Create a lock promise for this tournament
    const distributionPromise = (async () => {
      try {
        // Get tournament service
        const tournamentService = getTournamentService();

        // Get all tournaments and find by ID (inside lock to prevent race conditions)
        const activeTournaments = await tournamentService.getActiveTournaments(true);
        const pastTournaments = await tournamentService.getPastTournaments(1000);
        const allTournaments = [...activeTournaments, ...pastTournaments];

        // Find tournament by ID
        const tournament = allTournaments.find(
          (t: any) => t.tournamentId === tournamentId
        );

        if (!tournament) {
          throw new Error(`Tournament ${tournamentId} not found`);
        }

        // Check if tournament has ended
        const currentTime = Date.now();
        if (currentTime <= tournament.endTime) {
          throw new Error('Tournament has not ended yet');
        }

        // Check if rewards have already been distributed (strict check inside lock)
        // Only allow distribution if status is 0 (pending) on contract
        if (tournament.distributionStatus !== undefined && tournament.distributionStatus > 0) {
          throw new Error('Rewards have already been distributed for this tournament (distribution status is already set)');
        }

        // Vault path: use platform distribute-build (prepare + build in one call), then sign, execute, mark.
        if (tournament.poolVaultId && tournament.poolVaultCoinTypeId && tournament.rewardToken) {
          const graceMs = await getTournamentGracePeriodMs();
          if (currentTime <= tournament.endTime + graceMs) {
            const minutes = Math.round(graceMs / (60 * 1000));
            throw new Error(`Tournament grace period has not passed. Wait ${minutes} minute(s) after end time before distributing.`);
          }
          const buildRes = await platformEventsClient.buildDistribution(tournament.objectId, {
            adminWalletAddress: adminAddress,
          });
          if (!buildRes.success) {
            throw new Error(buildRes.error ?? 'Platform distribute-build failed');
          }
          try {
            const digests: string[] = [];
            const transactions = buildRes.transactions ?? [];
            if (transactions.length > 0) {
              for (const txBase64 of transactions) {
                const txBytes = Buffer.from(txBase64, 'base64');
                const signed = await adminWalletService.getKeypair().signTransaction(txBytes);
                const sig = typeof signed === 'object' && signed !== null && 'signature' in signed
                  ? (signed as { signature: string }).signature
                  : String(signed);
                const execRes = await platformTxClient.executeSigned({
                  transactionBytesBase64: txBase64,
                  signature: sig,
                });
                if (!execRes.success) {
                  throw new Error(execRes.error ?? 'Failed to execute reward transaction');
                }
                if (execRes.digest) digests.push(execRes.digest);
              }
              PlatformLogger.info('🎁 [ADMIN API] Reward transactions executed (platform distribute-build)', {
                tournamentId,
                txCount: transactions.length,
                digests,
              });
            } else {
              PlatformLogger.info('🎁 [ADMIN API] No transactions to execute (vault empty and no item/credit rewards)', {
                tournamentId,
              });
            }
            const markRes = await platformEventsClient.markRewardsDistributed(tournament.objectId);
            if (!markRes.success) {
              throw new Error(markRes.error || 'Failed to mark rewards distributed on platform');
            }
            tournamentService.clearActiveTournamentsCache();
            await platformEventsClient.reportDistributionComplete(tournament.objectId, { digests }).catch(() => {});
            return {
              success: true,
              tournamentId,
              distributions: [],
              digest: digests[0] ?? null,
              digests,
              creatorPaidFromPool: buildRes.creatorPaidFromPool ?? false,
              message: `Rewards distributed from pool vault (${digests.length} tx(s)). Platform event marked as distributed.${buildRes.creatorPaidFromPool ? ' Creator paid from pool.' : ''}`,
            };
          } catch (distributeError) {
            const errMsg = distributeError instanceof Error ? distributeError.message : String(distributeError);
            await platformEventsClient.reportDistributionFailed(tournament.objectId, { error: errMsg }).catch(() => {});
            throw distributeError;
          }
        }

        // Only vault path is supported; no legacy (game-wallet) distribution.
        throw new Error(
          'Reward distribution requires a tournament with a pool vault (poolVaultId, poolVaultCoinTypeId, rewardToken). ' +
          'Create tournaments with a vault to use distribution.'
        );
      } catch (error) {
        // Re-throw the error so it's handled by withApiHandler
        throw error;
      } finally {
        // Remove the lock when done
        distributionLocks.delete(tournamentId);
      }
    })();

    // Store the lock promise
    distributionLocks.set(tournamentId, distributionPromise);

    // Wait for distribution to complete
    return await distributionPromise;
  }
);

