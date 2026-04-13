// ==========================================
// Score Submission API Route
// Admin wallet signs and pays gas fees
// ==========================================

import { NextRequest } from 'next/server';
import { getBadgeService } from '@/lib/services/badge/core/badge-service';
import { handleCorsPreflight } from '@/lib/cors';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { PlatformValidators } from '@/lib/services/platform/validators/platform-validators';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import {
  platformGameScoreClient,
  platformTxClient,
  buildPlatformCallOptions,
  getHasSoulboundBadge,
} from '@/lib/services/platform/client/platform-client';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { validateScoreData, type ScoreDataForValidation } from '@/lib/services/validation/score/score-validation';
import { computeScoreFromReplay } from '@/lib/services/validation/score/replay-scorer';
import type { ReplayPayload } from '@/lib/services/validation/score/replay-schema';
import { guardScoreSubmit, recordScoreSubmit } from '@/lib/services/validation/score/score-submit-guard';

// Score submission goes through Aqueduct Platform only; replay required for verification.

/**
 * POST /api/scores/submit
 * Submit game score - admin wallet signs and pays gas.
 * Score is computed from the replay; no trusted score payload from client.
 *
 * Request body:
 * {
 *   playerAddress: string,
 *   replay: { version: number, events: ReplayEvent[] },  // Required. Events: distance/distance_tick, coin, enemy_kill, boss_hit, boss_kill
 *   playerName?: string,
 *   sessionId?: string
 * }
 */

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(
  async (request: NextRequest) => {
    const body = await getRequestBody<{
      playerAddress: string;
      replay: ReplayPayload;
      playerName?: string;
      sessionId?: string;
    }>(request);
    const { playerAddress, replay, playerName, sessionId } = body;

    if (!playerAddress) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        'playerAddress is required'
      );
    }

    if (!replay || !Array.isArray(replay.events)) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        'replay is required and must have an events array. See replay-schema for event types.'
      );
    }

    PlatformValidators.validateAddress(playerAddress);

    let computed: ReturnType<typeof computeScoreFromReplay>;
    try {
      computed = computeScoreFromReplay(replay as ReplayPayload);
    } catch (e) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        e instanceof Error ? e.message : 'Replay computation failed'
      );
    }

    const dataForValidation: ScoreDataForValidation = {
      score: computed.score,
      distance: computed.distance,
      coins: computed.coins,
      bossesDefeated: computed.bossesDefeated,
      enemiesDefeated: computed.enemiesDefeated,
      longestCoinStreak: computed.longestCoinStreak,
      bossTiers: computed.bossTiers,
      enemyTypes: computed.enemyTypes,
      bossHits: computed.bossHits,
    };

    try {
      validateScoreData(dataForValidation);
    } catch (e) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        e instanceof Error ? e.message : 'Score validation failed'
      );
    }

    try {
      guardScoreSubmit(playerAddress, computed, replay);
    } catch (e) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        e instanceof Error ? e.message : 'Submission not allowed'
      );
    }

    PlatformLogger.info('Score submission request received (replay verified)', {
      playerAddress,
      score: computed.score,
      distance: computed.distance,
      coins: computed.coins,
      playerName: playerName || '(empty)',
      sessionId: sessionId || '(none)',
    });

    const platformOptions = buildPlatformCallOptions(request, body);
    let result = await platformGameScoreClient.submitScore(
      {
        playerAddress,
        scoreData: {
          score: computed.score,
          distance: computed.distance,
          coins: computed.coins,
          bossesDefeated: computed.bossesDefeated,
          enemiesDefeated: computed.enemiesDefeated,
          longestCoinStreak: computed.longestCoinStreak,
          bossTiers: computed.bossTiers.length ? computed.bossTiers : undefined,
          enemyTypes: computed.enemyTypes.length ? computed.enemyTypes : undefined,
          bossHits: computed.bossHits,
        },
        playerName: playerName ?? undefined,
        sessionId: sessionId ?? undefined,
      },
      platformOptions
    );

    if (result.success && result.buildOnly && result.transactionBytesBase64) {
      try {
        const adminWallet = getAdminWalletService();
        const signed = await adminWallet.getKeypair().signTransaction(Buffer.from(result.transactionBytesBase64, 'base64'));
        const execRes = await platformTxClient.executeSigned(
          { transactionBytesBase64: result.transactionBytesBase64, signature: signed.signature },
          platformOptions
        );
        if (execRes.success && execRes.digest) result = { ...result, digest: execRes.digest };
        else if (!execRes.success) result = { success: false, error: execRes.error ?? 'Execute failed' };
      } catch (e) {
        PlatformLogger.warn('Sign and execute failed for Hydroscope build', { playerAddress, error: String(e) });
        result = { success: false, error: e instanceof Error ? e.message : 'Sign and execute failed' };
      }
    }

    if (!result.success) {
      throw new PlatformError(
        PlatformErrorCode.TRANSACTION_FAILED,
        result.error || 'Score submission failed'
      );
    }

    recordScoreSubmit(playerAddress);

    // After successful score submission, check if badge operations are needed
    const badgeService = getBadgeService();
    let badgeInfo = null;

    try {
      const soulRes = await getHasSoulboundBadge(playerAddress, platformOptions);
      const hasBadge = soulRes.success && soulRes.hasBadge === true && Boolean(soulRes.badgeId);

      if (!hasBadge) {
        // Player doesn't have badge - can mint
        badgeInfo = {
          canMint: true,
          hasBadge: false,
        };
      } else {
        // Player has badge - check if upgrade is available (read-only); badgeId hint skips duplicate Shipyard lookup
        const upgradeCheck = await badgeService.checkBadgeUpgrade(playerAddress, {
          badgeId: soulRes.badgeId ?? undefined,
        });
        
        if (upgradeCheck.success && upgradeCheck.hasPendingUpgrade) {
          PlatformLogger.info('Tier upgrade available', {
            playerAddress,
            newTier: upgradeCheck.newTier,
          });
          badgeInfo = {
            canMint: false,
            hasBadge: true,
            tierUpgraded: true,
            newTier: upgradeCheck.newTier,
            // Frontend will handle tier upgrade transaction
          };
        } else {
          badgeInfo = {
            canMint: false,
            hasBadge: true,
            tierUpgraded: false,
          };
        }
      }
    } catch (badgeError) {
      // Don't fail score submission if badge check fails
      PlatformLogger.warn('Badge check failed (non-critical)', {
        playerAddress,
        error: badgeError,
      });
      badgeInfo = {
        error: 'Badge check failed',
      };
    }

    return {
      success: true,
      digest: result.digest,
      playerAddress,
      gasPaidBy: 'admin_wallet',
      message: 'Score submitted successfully. Admin wallet paid gas fees.',
      sessionId: sessionId || null, // Include sessionId in response for badge upgrade
      badge: badgeInfo,
    };
  },
  {
    logRequest: true,
  }
);


