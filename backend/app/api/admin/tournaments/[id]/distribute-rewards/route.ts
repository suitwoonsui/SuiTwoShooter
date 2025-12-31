// ==========================================
// Admin API: Distribute Tournament Rewards
// ==========================================

import { NextRequest } from 'next/server';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { BadgeLogger } from '@/lib/sui/badge-logger';
import { getTournamentService } from '@/lib/sui/tournament-service';
import { getRewardsService } from '@/lib/sui/rewards-service';
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

// In-memory lock to prevent concurrent distributions for the same tournament
const distributionLocks = new Map<number, Promise<any>>();

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

    const adminWalletService = getAdminWalletService();
    const adminAddress = adminWalletService.getAddress();
    
    BadgeLogger.info('🎁 [ADMIN API] Tournament reward distribution request', {
      adminAddress,
      tournamentId,
    });

    // Check if distribution is already in progress for this tournament
    const existingLock = distributionLocks.get(tournamentId);
    if (existingLock) {
      BadgeLogger.warn('🎁 [ADMIN API] Distribution already in progress for this tournament', {
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

    // Get leaderboard (top 10)
    const leaderboardResult = await tournamentService.getTournamentLeaderboard(
      tournament.objectId,
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
    const rewardsService = getRewardsService();
    const distributions = await rewardsService.calculateTournamentRewards(
      tournament.prizePoolUSDCents,
      leaderboard.map((entry, index) => ({
        rank: index + 1,
        playerAddress: entry.playerAddress,
        playerName: entry.playerName,
        value: entry.value,
      })),
      tournament.participants, // Participant count for variable rewards (25% vs 50%)
      tournament.rewardConfig || null, // Custom reward config (null = default)
      tournament.rewardToken || 'MEWS' // Reward token type (defaults to MEWS for backward compatibility)
    );

    BadgeLogger.info('🎁 [ADMIN API] Calculated tournament rewards', {
      tournamentId,
      distributionCount: distributions.length,
      prizePoolUSDCents: tournament.prizePoolUSDCents,
    });

    // Distribute rewards
    const distributionResult = await rewardsService.distributeTournamentRewards(
      tournament.tournamentId,
      distributions
    );

    if (!distributionResult.success) {
      throw new Error(distributionResult.error || 'Failed to distribute rewards');
    }

    // Distribute creator reward if tournament was created by a user
    let creatorRewardResult = null;
    if (tournament.createdBy && tournament.creationFeePaid && tournament.creationFeePaid > 0) {
      try {
        const { distributeCreatorReward } = await import('@/lib/services/creator-reward-service');
        creatorRewardResult = await distributeCreatorReward(tournament.objectId);
        
        if (creatorRewardResult.success) {
          BadgeLogger.info('🎁 [ADMIN API] Creator reward distributed successfully', {
            tournamentId,
            creatorAddress: creatorRewardResult.creatorAddress,
            creatorRewardUSD: creatorRewardResult.creatorRewardUSD,
            transactionDigest: creatorRewardResult.transactionDigest,
          });
        } else {
          BadgeLogger.warn('🎁 [ADMIN API] Failed to distribute creator reward', {
            tournamentId,
            error: creatorRewardResult.error,
          });
          // Don't fail the whole operation if creator reward fails
        }
      } catch (error) {
        BadgeLogger.error('🎁 [ADMIN API] Error distributing creator reward', {
          tournamentId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        // Don't fail the whole operation if creator reward fails
      }
    }

    // Update distribution status on contract to mark rewards as distributed
    // CRITICAL: This must succeed to prevent duplicate distributions
    if (distributionResult.success) {
      let statusUpdateSucceeded = false;
      try {
        const packageId = config.contracts.gameScore?.split('::')[0] || config.contracts.gameScore;
        const adminCapId = config.contracts.tournamentAdminCap;
        
        if (!packageId || !adminCapId || !tournament.objectId) {
          BadgeLogger.error('🎁 [ADMIN API] Cannot update distribution status - missing config', {
            tournamentId,
            hasPackageId: !!packageId,
            hasAdminCap: !!adminCapId,
            hasObjectId: !!tournament.objectId,
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
            txb.object(tournament.objectId),
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
              info: (msg, data) => BadgeLogger.info(`🎁 [ADMIN API] ${msg}`, data),
              warn: (msg, data) => BadgeLogger.warn(`🎁 [ADMIN API] ${msg}`, data),
              error: (msg, data) => BadgeLogger.error(`🎁 [ADMIN API] ${msg}`, data),
            },
          }
        );
        
        // Verify the transaction actually succeeded
        if (statusResult.effects?.status?.status === 'success') {
          statusUpdateSucceeded = true;
          BadgeLogger.info('🎁 [ADMIN API] Distribution status updated on contract successfully', {
            tournamentId,
            status: 1,
            digest: statusResult.digest,
          });
        } else {
          const errorMsg = statusResult.effects?.status?.error || 'Transaction did not succeed';
          BadgeLogger.error('🎁 [ADMIN API] Distribution status update transaction failed', {
            tournamentId,
            error: errorMsg,
            effects: statusResult.effects,
          });
          throw new Error(`Status update transaction failed: ${errorMsg}`);
        }
      } catch (statusError) {
        BadgeLogger.error('🎁 [ADMIN API] CRITICAL: Failed to update distribution status - this may allow duplicate distributions', {
          tournamentId,
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
        const moveResult = await tournamentService.moveTournamentToPast(tournamentId);
        if (moveResult.success) {
          BadgeLogger.info('🎁 [ADMIN API] Tournament moved to past table', {
            tournamentId,
          });
        } else {
          // Non-critical - log but don't fail
          BadgeLogger.warn('🎁 [ADMIN API] Failed to move tournament to past (non-critical)', {
            tournamentId,
            error: moveResult.error,
          });
        }
      } catch (moveError) {
        // Non-critical - log but don't fail
        BadgeLogger.warn('🎁 [ADMIN API] Error moving tournament to past (non-critical)', {
          tournamentId,
          error: moveError instanceof Error ? moveError.message : 'Unknown error',
        });
      }
    }

    BadgeLogger.info('🎁 [ADMIN API] Tournament rewards distributed successfully', {
      tournamentId,
      distributionCount: distributions.length,
      digest: distributionResult.digest,
      creatorRewardDistributed: creatorRewardResult?.success || false,
    });

    return {
      success: true,
      tournamentId,
      distributions: distributions.map(d => ({
        rank: d.rank,
        playerAddress: d.playerAddress,
        playerName: d.playerName,
        tokenRewardUsdCents: d.tokenRewardUsdCents,
        tokenRewardMewsAmount: d.tokenRewardMewsAmount,
        items: d.items,
        rewardValueUsdCents: d.rewardValueUsdCents,
      })),
      digest: distributionResult.digest,
      creatorReward: creatorRewardResult ? {
        success: creatorRewardResult.success,
        creatorAddress: creatorRewardResult.creatorAddress,
        creatorRewardUSDCents: creatorRewardResult.creatorRewardUSDCents,
        creatorRewardUSD: creatorRewardResult.creatorRewardUSD,
        mewsAmount: creatorRewardResult.mewsAmount,
        transactionDigest: creatorRewardResult.transactionDigest,
        error: creatorRewardResult.error,
      } : null,
      message: `Successfully distributed rewards to ${distributions.length} players (top 3 received tokens + items, ranks 4-10 received items only)${creatorRewardResult?.success ? ` and creator reward of $${creatorRewardResult.creatorRewardUSD?.toFixed(2)}` : ''}`,
      };
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

