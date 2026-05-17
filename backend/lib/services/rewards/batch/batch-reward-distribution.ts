// ==========================================
// Batch Reward Distribution Service (REWARD TRIGGER: TOURNAMENT PAYOUTS)
// Uses Channel (sustain-build-distribute); game signs and submits.
//
// Inputs: distributions, tournamentId (optional), adminWalletAddress (required).
// Identity: corridor cap from env (CORRIDOR_CAPABILITY_OBJECT_ID_*); do not pass ecosystem/app IDs.
// ==========================================

import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { TournamentRewardDistribution } from '@/lib/services/rewards/core/rewards-service';
import { buildBatchViaChannel } from '@/lib/services/platform/client/platform-client';
import { signAndSubmitRewardTransactions } from '@/lib/services/rewards/executor/rewards-platform-executor';
import type { PlatformBuildDistributeTx } from '@/lib/services/rewards/executor/rewards-platform-executor';

/**
 * Batch reward distribution result
 */
export interface BatchRewardDistributionResult {
  success: boolean;
  transactionDigest?: string;
  distributions?: TournamentRewardDistribution[];
  errors?: string[];
  error?: string;
}

/**
 * BatchRewardDistributionService - Distributes rewards via platform build-distribute
 */
export class BatchRewardDistributionService {
  /**
   * Distribute rewards by having platform build tx(s) and game sign/submit.
   * Platform identity from corridor cap (env); do not pass ecosystem/app IDs.
   *
   * @param distributions - Array of reward distributions
   * @param tournamentId - Tournament ID (for logging and source)
   * @param adminWalletAddress - Required; game admin wallet signs
   */
  async distributeRewardsBatch(
    distributions: TournamentRewardDistribution[],
    tournamentId?: number,
    adminWalletAddress?: string
  ): Promise<BatchRewardDistributionResult> {
    try {
      PlatformLogger.info('🎁 [BATCH REWARDS] Starting batch reward distribution via platform', {
        tournamentId,
        distributionCount: distributions.length,
      });

      if (!adminWalletAddress?.startsWith('0x')) {
        return {
          success: false,
          error: 'adminWalletAddress is required for Channel sustain-build-distribute',
        };
      }

      const rewards = distributions.map((d) => ({
        recipientAddress: d.playerAddress,
        tokenType: d.rank <= 3 && d.rewardToken ? d.rewardToken : undefined,
        tokenAmount: d.rank <= 3 && d.tokenRewardAmount ? d.tokenRewardAmount : undefined,
        items: d.items && d.items.length > 0 ? d.items : undefined,
      }));

      const buildRes = await buildBatchViaChannel({
        operations: [
          {
            operationId: 'sustain-build-distribute',
            params: {
              rewards,
              adminWalletAddress,
              source: tournamentId != null ? `tournament:${tournamentId}` : undefined,
            },
          },
        ],
      });

      if (!buildRes.success || !buildRes.transactions?.length) {
        const err = buildRes.errors?.[0] ?? buildRes.error ?? 'No transactions returned';
        PlatformLogger.error('🎁 [BATCH REWARDS] Channel sustain-build-distribute failed', {
          tournamentId,
          error: err,
        });
        return {
          success: false,
          error: err,
          errors: buildRes.errors,
        };
      }

      const txs: PlatformBuildDistributeTx[] = buildRes.transactions.map((bytesBase64, i) => ({
        bytesBase64,
        type: 'token',
        recipientAddress: rewards[i]?.recipientAddress ?? '',
      }));

      const execRes = await signAndSubmitRewardTransactions(txs, {
        source: tournamentId != null ? `tournament:${tournamentId}` : undefined,
      });

      if (execRes.digests.length === 0 && execRes.errors.length > 0) {
        return {
          success: false,
          error: execRes.errors.join('; '),
          errors: execRes.errors,
          distributions,
        };
      }

      PlatformLogger.info('🎁 [BATCH REWARDS] Batch distribution via platform completed', {
        tournamentId,
        digestCount: execRes.digests.length,
        errors: execRes.errors.length,
      });

      return {
        success: execRes.errors.length === 0,
        transactionDigest: execRes.digests[0],
        distributions,
        errors: execRes.errors.length > 0 ? execRes.errors : undefined,
      };
    } catch (error) {
      PlatformLogger.error('🎁 [BATCH REWARDS] Error in batch distribution', {
        tournamentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Distribute rewards in smaller batches (if many distributions).
   */
  async distributeRewardsInBatches(
    distributions: TournamentRewardDistribution[],
    batchSize: number = 20,
    tournamentId?: number,
    adminWalletAddress?: string
  ): Promise<Array<BatchRewardDistributionResult>> {
    const results: Array<BatchRewardDistributionResult> = [];
    for (let i = 0; i < distributions.length; i += batchSize) {
      const chunk = distributions.slice(i, i + batchSize);
      const result = await this.distributeRewardsBatch(chunk, tournamentId, adminWalletAddress);
      results.push(result);
      if (i + batchSize < distributions.length) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
    return results;
  }
}

// Singleton instance
let batchRewardDistributionServiceInstance: BatchRewardDistributionService | null = null;

export function getBatchRewardDistributionService(): BatchRewardDistributionService {
  if (!batchRewardDistributionServiceInstance) {
    batchRewardDistributionServiceInstance = new BatchRewardDistributionService();
  }
  return batchRewardDistributionServiceInstance;
}
