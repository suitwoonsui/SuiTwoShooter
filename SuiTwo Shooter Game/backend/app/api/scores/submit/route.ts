// ==========================================
// Score Submission API Route
// Admin wallet signs and pays gas fees
// ==========================================

import { NextRequest } from 'next/server';
import { getAdminWalletService } from '@/lib/sui/admin-wallet-service';
import { getBadgeService } from '@/lib/sui/badge-service';
import { handleCorsPreflight } from '@/lib/cors';
import { BadgeError, BadgeErrorCode } from '@/lib/sui/badge-errors';
import { BadgeValidators } from '@/lib/sui/badge-validators';
import { BadgeLogger } from '@/lib/sui/badge-logger';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';

/**
 * POST /api/scores/submit
 * Submit game score - admin wallet signs and pays gas
 * 
 * Request body:
 * {
 *   playerAddress: string,  // User's wallet address (from connected wallet)
 *   playerName?: string,    // Optional player name (empty string if skipped)
 *   sessionId?: string,     // Unique session ID for duplicate prevention
 *   scoreData: {
 *     score: number,
 *     distance: number,
 *     coins: number,
 *     bossesDefeated: number,
 *     enemiesDefeated: number,
 *     longestCoinStreak: number
 *   }
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
      playerName?: string;
      sessionId?: string;
      scoreData: {
        score: number;
        distance: number;
        coins: number;
        bossesDefeated: number;
        enemiesDefeated: number;
        longestCoinStreak: number;
      };
    }>(request);
    const { playerAddress, playerName, sessionId, scoreData } = body;

    // Validate required fields
    if (!playerAddress) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'playerAddress is required'
      );
    }

    if (!scoreData) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'scoreData is required'
      );
    }

    // Validate player address format
    BadgeValidators.validateAddress(playerAddress);

    // Validate score data structure
    const requiredFields: Array<keyof typeof scoreData> = ['score', 'distance', 'coins', 'bossesDefeated', 'enemiesDefeated', 'longestCoinStreak'];
    for (const field of requiredFields) {
      if (scoreData[field] === undefined || scoreData[field] === null) {
        throw new BadgeError(
          BadgeErrorCode.INVALID_ADDRESS,
          `Missing required field: ${field}`
        );
      }
      
      // Validate numeric types
      if (typeof scoreData[field] !== 'number' || isNaN(scoreData[field])) {
        throw new BadgeError(
          BadgeErrorCode.INVALID_ADDRESS,
          `Invalid ${field}: must be a number`
        );
      }
      
      // Validate non-negative
      if (scoreData[field] < 0) {
        throw new BadgeError(
          BadgeErrorCode.INVALID_ADDRESS,
          `Invalid ${field}: must be non-negative`
        );
      }
    }

    BadgeLogger.info('Score submission request received', {
      playerAddress,
      score: scoreData.score,
      distance: scoreData.distance,
      coins: scoreData.coins,
      bossesDefeated: scoreData.bossesDefeated,
      enemiesDefeated: scoreData.enemiesDefeated,
      longestCoinStreak: scoreData.longestCoinStreak,
      playerName: playerName || '(empty)',
      sessionId: sessionId || '(none)',
    });

    // Get admin wallet service
    const adminWallet = getAdminWalletService();

    // Admin wallet submits score on behalf of player
    const result = await adminWallet.submitScoreForPlayer(
      playerAddress,
      scoreData,
      playerName || '',  // Player name (empty if skipped)
      sessionId || null  // Session ID (null if not provided)
    );

    if (!result.success) {
      throw new BadgeError(
        BadgeErrorCode.TRANSACTION_FAILED,
        result.error || 'Score submission failed'
      );
    }

    // After successful score submission, check if badge operations are needed
    const badgeService = getBadgeService();
    let badgeInfo = null;

    try {
      // Check if player has badge (read-only, no transaction building)
      const hasBadge = await badgeService.hasBadge(playerAddress);
      
      if (!hasBadge) {
        // Player doesn't have badge - can mint
        badgeInfo = {
          canMint: true,
          hasBadge: false,
        };
      } else {
        // Player has badge - check if upgrade is available (read-only)
        const upgradeCheck = await badgeService.checkBadgeUpgrade(playerAddress);
        
        if (upgradeCheck.success && upgradeCheck.hasPendingUpgrade) {
          BadgeLogger.info('Tier upgrade available', {
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
      BadgeLogger.warn('Badge check failed (non-critical)', {
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

