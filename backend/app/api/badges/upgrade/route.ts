// ==========================================
// Badge Upgrade API Route
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getBadgeService } from '@/lib/sui/badge-service';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';
import { BadgeValidators } from '@/lib/sui/badge-validators';
import { BadgeError, BadgeErrorCode } from '@/lib/sui/badge-errors';
import { BadgeLogger } from '@/lib/sui/badge-logger';

/**
 * POST /api/badges/upgrade
 * Build upgrade badge transaction for player to sign
 * 
 * Request body:
 * {
 *   playerAddress: string,  // Player's wallet address
 *   badgeId: string,         // Badge object ID to upgrade
 *   newTier: number,         // New tier number
 *   sessionId: string         // Session ID for idempotency
 * }
 * 
 * Returns:
 * {
 *   success: boolean,
 *   transaction?: string,    // Base64 transaction bytes
 *   gasEstimate?: string,
 *   error?: string
 * }
 * 
 * Note: Frontend must sign and execute this transaction using player's wallet
 */

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);
  
  try {
    const body = await request.json();
    const { playerAddress, badgeId, newTier, sessionId } = body;

    // Validate all required fields and formats using BadgeValidators
    try {
      if (!playerAddress) {
        throw new BadgeError(
          BadgeErrorCode.INVALID_ADDRESS,
          'playerAddress is required'
        );
      }
      if (!badgeId) {
        throw new BadgeError(
          BadgeErrorCode.INVALID_BADGE_ID,
          'badgeId is required'
        );
      }
      if (newTier === undefined || newTier === null) {
        throw new BadgeError(
          BadgeErrorCode.INVALID_TIER,
          'newTier is required'
        );
      }
      if (!sessionId) {
        throw new BadgeError(
          BadgeErrorCode.INVALID_SESSION_ID,
          'sessionId is required'
        );
      }

      // Validate formats
      BadgeValidators.validateAddress(playerAddress);
      BadgeValidators.validateBadgeId(badgeId);
      BadgeValidators.validateTier(newTier);
      BadgeValidators.validateSessionId(sessionId);
    } catch (validationError) {
      if (validationError instanceof BadgeError) {
        return NextResponse.json(
          {
            success: false,
            error: validationError.message,
            code: validationError.code,
          },
          { status: 400, headers: corsHeaders }
        );
      }
      throw validationError;
    }

    BadgeLogger.info('Badge upgrade request received', {
      playerAddress,
      badgeId,
      newTier,
    });

    const badgeService = getBadgeService();
    
    // Build full transaction on backend (like mint does) - ensures consistency
    const result = await badgeService.buildUpgradeBadgeTransaction(
      playerAddress,
      badgeId,
      newTier,
      sessionId
    );

    if (!result.success || !result.transaction) {
      const errorMessage = result.error || 'Failed to build upgrade transaction';
      BadgeLogger.error('Failed to build upgrade transaction', {
        playerAddress,
        badgeId,
        newTier,
        error: errorMessage,
      });
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Return built transaction as base64 (frontend just signs it, like mint)
    return NextResponse.json(
      {
        success: true,
        transaction: result.transaction, // Base64 transaction bytes
        gasEstimate: result.gasEstimate,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    const badgeError = BadgeError.fromUnknown(error, 'Failed to build upgrade transaction');
    BadgeLogger.error('Error building upgrade transaction', badgeError);
    
    return NextResponse.json(
      {
        success: false,
        error: badgeError.message,
        code: badgeError.code,
        ...(badgeError.details && { details: badgeError.details }),
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

