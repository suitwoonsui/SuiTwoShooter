// ==========================================
// Badge Migration API Route
// ==========================================

import { NextRequest } from 'next/server';
import { getBadgeService } from '@/lib/sui/badge-service';
import { handleCorsPreflight } from '@/lib/cors';
import { BadgeLogger } from '@/lib/sui/badge-logger';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { BadgeError, BadgeErrorCode } from '@/lib/sui/badge-errors';
import { BadgeValidators } from '@/lib/sui/badge-validators';

/**
 * POST /api/badges/migrate
 * Migrate badge from old system to new system
 * 
 * This endpoint creates a new badge at the same tier as the old badge.
 * The new badge will use the current system's image URL generation.
 * 
 * Request body:
 * {
 *   playerAddress: string,    // Player's wallet address
 *   oldTier: number,         // Tier from old badge (0-5)
 * }
 * 
 * Returns:
 * {
 *   success: boolean,
 *   digest?: string,          // Transaction digest if successful
 *   error?: string
 * }
 * 
 * Note: Admin wallet signs and executes this transaction
 */

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(
  async (request: NextRequest) => {
    const body = await getRequestBody<{ 
      playerAddress: string; 
      oldTier: number; 
      oldGamesPlayed?: number; 
      oldMintDate?: number;
    }>(request);
    const { playerAddress, oldTier, oldGamesPlayed, oldMintDate } = body;

    // Validate required fields
    if (!playerAddress) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'playerAddress is required'
      );
    }

    BadgeValidators.validateAddress(playerAddress);

    if (oldTier === undefined || oldTier === null || typeof oldTier !== 'number') {
      throw new BadgeError(
        BadgeErrorCode.INVALID_TIER,
        'oldTier is required and must be a number (0-5)'
      );
    }

    if (oldTier < 0 || oldTier > 5) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_TIER,
        'oldTier must be between 0 and 5'
      );
    }

    // oldGamesPlayed and oldMintDate are optional (default to 0 if not provided)
    const gamesPlayed = oldGamesPlayed !== undefined && oldGamesPlayed !== null ? Number(oldGamesPlayed) : 0;
    const mintDate = oldMintDate !== undefined && oldMintDate !== null ? Number(oldMintDate) : 0;

    BadgeLogger.info('Badge migration request received', {
      playerAddress,
      oldTier,
      oldGamesPlayed: gamesPlayed,
      oldMintDate: mintDate,
    });

    const badgeService = getBadgeService();
    
    // Use migrate_badge function to preserve old tier, games played, and mint date
    // NO payment required (free migration)
    // Soulbound NFTs must be created in the player's wallet (cannot be transferred)
    // This builds a transaction for the player to sign
    const result = await badgeService.buildMigrateBadgeTransaction(
      playerAddress,
      oldTier,
      gamesPlayed,
      mintDate
    );

    if (!result.success) {
      throw new Error(result.error || 'Failed to build badge migration transaction');
    }

    BadgeLogger.info('Badge migration transaction built successfully', {
      playerAddress,
      oldTier,
      note: 'Transaction ready for player to sign',
    });

    return {
          success: true,
          transaction: result.transaction,
          gasEstimate: result.gasEstimate,
          message: `Badge migration transaction ready. Badge will be created at tier ${oldTier} with preserved data.`,
    };
  }
);

