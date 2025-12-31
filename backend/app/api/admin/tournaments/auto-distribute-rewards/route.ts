// ==========================================
// Admin API: Auto-Distribute Tournament Rewards
// ==========================================
// This endpoint can be called by a cron job to automatically distribute rewards
// for tournaments that have ended but haven't had rewards distributed yet

import { NextRequest } from 'next/server';
import { withApiHandler } from '@/lib/api/api-handler';
import { verifyApiKey } from '@/lib/auth';
import { BadgeLogger } from '@/lib/sui/badge-logger';
import { getTournamentService } from '@/lib/sui/tournament-service';
import { getRewardsService } from '@/lib/sui/rewards-service';
import { getConfig } from '@/config/config';

// In-memory lock to prevent concurrent distributions for the same tournament
const distributionLocks = new Map<number, Promise<any>>();

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
  async (request: NextRequest) => {
    // Require admin authentication
    if (!verifyApiKey(request)) {
      throw new Error('Unauthorized. Valid API key required.');
    }

    BadgeLogger.info('🎁 [AUTO DISTRIBUTE] Starting automatic reward distribution check');

    // Get tournament service
    const tournamentService = getTournamentService();

    // Get all tournaments
    const activeTournaments = await tournamentService.getActiveTournaments(true);
    const pastTournaments = await tournamentService.getPastTournaments(1000);
    const allTournaments = [...activeTournaments, ...pastTournaments];

    const now = Date.now();
    const rewardsService = getRewardsService();

    // Find tournaments that have ended but rewards haven't been distributed
    const endedTournaments = allTournaments.filter(
      (t: any) => t.endTime < now && !t.rewardsDistributed
    );

    BadgeLogger.info('🎁 [AUTO DISTRIBUTE] Found tournaments needing reward distribution', {
      count: endedTournaments.length,
      tournamentIds: endedTournaments.map(t => t.tournamentId),
    });

    const results: Array<{
      tournamentId: number;
      success: boolean;
      distributions?: any[];
      digest?: string;
      error?: string;
    }> = [];

    // Process each tournament
    for (const tournament of endedTournaments) {
      // Check if distribution is already in progress for this tournament
      const existingLock = distributionLocks.get(tournament.tournamentId);
      if (existingLock) {
        BadgeLogger.warn('🎁 [AUTO DISTRIBUTE] Distribution already in progress for this tournament, skipping', {
          tournamentId: tournament.tournamentId,
        });
        results.push({
          tournamentId: tournament.tournamentId,
          success: false,
          error: 'Distribution already in progress',
        });
        continue;
      }

      // Create a lock promise for this tournament
      const distributionPromise = (async () => {
        try {
          BadgeLogger.info('🎁 [AUTO DISTRIBUTE] Processing tournament', {
            tournamentId: tournament.tournamentId,
            name: tournament.name,
          });

          // Re-check tournament status inside the lock to prevent race conditions
          const activeTournaments2 = await tournamentService.getActiveTournaments(true);
          const pastTournaments2 = await tournamentService.getPastTournaments(1000);
          const allTournaments2 = [...activeTournaments2, ...pastTournaments2];

          const tournament2 = allTournaments2.find(
            (t: any) => t.tournamentId === tournament.tournamentId
          );

          if (!tournament2) {
            throw new Error(`Tournament ${tournament.tournamentId} not found`);
          }

          // Check if rewards have already been distributed (strict check inside lock)
          if (tournament2.distributionStatus !== undefined && tournament2.distributionStatus > 0) {
            throw new Error('Rewards have already been distributed for this tournament');
          }

          // Use the re-fetched tournament data
          const currentTournament = tournament2;

          // Get leaderboard (top 10)
          const leaderboardResult = await tournamentService.getTournamentLeaderboard(
            currentTournament.objectId,
            10
          );

          if (!leaderboardResult.success || !leaderboardResult.leaderboard) {
            throw new Error(leaderboardResult.error || 'Failed to get leaderboard');
          }

          const leaderboard = leaderboardResult.leaderboard;

          if (leaderboard.length === 0) {
            throw new Error('No players in leaderboard');
          }

          // Calculate rewards (with variable player rewards and custom config support)
          const distributions = await rewardsService.calculateTournamentRewards(
            currentTournament.prizePoolUSDCents,
          leaderboard.map((entry, index) => ({
            rank: index + 1,
            playerAddress: entry.playerAddress,
            playerName: entry.playerName,
            value: entry.value,
          })),
            currentTournament.participants, // Participant count for variable rewards (25% vs 50%)
            currentTournament.rewardConfig || null, // Custom reward config (null = default)
            currentTournament.rewardToken || 'MEWS' // Reward token type (defaults to MEWS for backward compatibility)
          );

          // Distribute rewards
          const distributionResult = await rewardsService.distributeTournamentRewards(
            currentTournament.tournamentId,
            distributions
          );

          if (distributionResult.success) {
            BadgeLogger.info('🎁 [AUTO DISTRIBUTE] Successfully distributed rewards', {
              tournamentId: currentTournament.tournamentId,
              distributionCount: distributions.length,
              digest: distributionResult.digest,
            });
            
            // Update distribution status on contract to mark rewards as distributed
            // CRITICAL: This must succeed to prevent duplicate distributions
            let statusUpdateSucceeded = false;
            try {
              const config = getConfig();
              const packageId = config.contracts.gameScore?.split('::')[0] || config.contracts.gameScore;
              const adminCapId = config.contracts.tournamentAdminCap;
              
              if (!packageId || !adminCapId || !currentTournament.objectId) {
                BadgeLogger.error('🎁 [AUTO DISTRIBUTE] Cannot update distribution status - missing config', {
                  tournamentId: currentTournament.tournamentId,
                  hasPackageId: !!packageId,
                  hasAdminCap: !!adminCapId,
                  hasObjectId: !!currentTournament.objectId,
                });
                throw new Error('Missing required configuration for status update');
              }

              const { Transaction } = await import('@mysten/sui/transactions');
              const { getAdminWalletService } = await import('@/lib/sui/admin-wallet-service');
              const { executeTransactionWithFinalization } = await import('@/lib/sui/transaction-helpers');
              
              const adminWallet = getAdminWalletService();
              const client = config.sui.network === 'testnet'
                ? adminWallet.getTestnetClient()
                : adminWallet.getMainnetClient();
              
              const txb = new Transaction();
              txb.setSender(adminWallet.getAddress());
              
              // Set distribution status to 1 (distributed)
              txb.moveCall({
                target: `${packageId}::tournaments::admin_set_distribution_status`,
                arguments: [
                  txb.object(currentTournament.objectId),
                  txb.object(adminCapId),
                  txb.pure.u8(1), // 1 = distributed
                ],
              });
              
              txb.setGasBudget(config.sui.gasBudget || 10_000_000);
              
              const statusResult = await executeTransactionWithFinalization(
                client,
                adminWallet.getKeypair(),
                txb,
                {
                  logger: {
                    info: (msg, data) => BadgeLogger.info(`🎁 [AUTO DISTRIBUTE] ${msg}`, data),
                    warn: (msg, data) => BadgeLogger.warn(`🎁 [AUTO DISTRIBUTE] ${msg}`, data),
                    error: (msg, data) => BadgeLogger.error(`🎁 [AUTO DISTRIBUTE] ${msg}`, data),
                  },
                }
              );
              
              // Verify the transaction actually succeeded
              if (statusResult.effects?.status?.status === 'success') {
                statusUpdateSucceeded = true;
                BadgeLogger.info('🎁 [AUTO DISTRIBUTE] Distribution status updated on contract successfully', {
                  tournamentId: currentTournament.tournamentId,
                  status: 1,
                  digest: statusResult.digest,
                });
              } else {
                const errorMsg = statusResult.effects?.status?.error || 'Transaction did not succeed';
                BadgeLogger.error('🎁 [AUTO DISTRIBUTE] Distribution status update transaction failed', {
                  tournamentId: currentTournament.tournamentId,
                  error: errorMsg,
                  effects: statusResult.effects,
                });
                throw new Error(`Status update transaction failed: ${errorMsg}`);
              }
            } catch (statusError) {
              BadgeLogger.error('🎁 [AUTO DISTRIBUTE] CRITICAL: Failed to update distribution status - this may allow duplicate distributions', {
                tournamentId: currentTournament.tournamentId,
                error: statusError instanceof Error ? statusError.message : 'Unknown error',
                stack: statusError instanceof Error ? statusError.stack : undefined,
              });
              // Throw error to prevent lock from being removed - this prevents duplicate distributions
              throw new Error(`Failed to update distribution status: ${statusError instanceof Error ? statusError.message : 'Unknown error'}. Rewards were distributed but status was not updated. This must be fixed manually.`);
            }
            
            if (!statusUpdateSucceeded) {
              throw new Error('Distribution status update did not complete successfully');
            }

            // Move tournament to past table after successful reward distribution
            try {
              const { getTournamentService } = await import('@/lib/sui/tournament-service');
              const tournamentService = getTournamentService();
              const moveResult = await tournamentService.moveTournamentToPast(currentTournament.tournamentId);
              if (moveResult.success) {
                BadgeLogger.info('🎁 [AUTO DISTRIBUTE] Tournament moved to past table', {
                  tournamentId: currentTournament.tournamentId,
                });
              } else {
                // Non-critical - log but don't fail
                BadgeLogger.warn('🎁 [AUTO DISTRIBUTE] Failed to move tournament to past (non-critical)', {
                  tournamentId: currentTournament.tournamentId,
                  error: moveResult.error,
                });
              }
            } catch (moveError) {
              // Non-critical - log but don't fail
              BadgeLogger.warn('🎁 [AUTO DISTRIBUTE] Error moving tournament to past (non-critical)', {
                tournamentId: currentTournament.tournamentId,
                error: moveError instanceof Error ? moveError.message : 'Unknown error',
              });
            }
          }

          return {
            tournamentId: currentTournament.tournamentId,
            success: distributionResult.success,
            distributions: distributionResult.distributions,
            digest: distributionResult.digest,
            error: distributionResult.error,
          };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          BadgeLogger.error('🎁 [AUTO DISTRIBUTE] Error processing tournament', {
            tournamentId: tournament.tournamentId,
            error: errorMsg,
          });

          return {
            tournamentId: tournament.tournamentId,
            success: false,
            error: errorMsg,
          };
        } finally {
          // Remove the lock when done
          distributionLocks.delete(tournament.tournamentId);
        }
      })();

      // Store the lock promise
      distributionLocks.set(tournament.tournamentId, distributionPromise);

      // Wait for distribution to complete and add result
      const result = await distributionPromise;
      results.push(result);
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    BadgeLogger.info('🎁 [AUTO DISTRIBUTE] Automatic distribution complete', {
      totalProcessed: results.length,
      successCount,
      failureCount,
    });

    return {
      success: true,
      processed: results.length,
      successful: successCount,
      failed: failureCount,
      results,
      message: `Processed ${results.length} tournament(s): ${successCount} successful, ${failureCount} failed`,
    };
  }
);

