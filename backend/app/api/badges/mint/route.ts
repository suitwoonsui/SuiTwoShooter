// ==========================================
// Badge Minting API Route
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getBadgeService } from '@/lib/sui/badge-service';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';
import { BadgeValidators } from '@/lib/sui/badge-validators';
import { BadgeError, BadgeErrorCode } from '@/lib/sui/badge-errors';
import { BadgeLogger } from '@/lib/sui/badge-logger';

/**
 * POST /api/badges/mint
 * Build mint badge transaction for player to sign
 * 
 * Request body:
 * {
 *   playerAddress: string,  // Player's wallet address
 *   paymentCoinId: string   // Player's SUI coin ID for minting fee payment
 * }
 * 
 * Returns:
 * {
 *   success: boolean,
 *   transactionData?: {
 *     packageId: string,
 *     module: string,
 *     function: string,
 *     arguments: any[],
 *     imageData: Uint8Array (base64 encoded)
 *   },
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
    const { playerAddress, paymentCoinId } = body;

    // Validate required fields and format using BadgeValidators
    try {
      if (!playerAddress) {
        throw new BadgeError(
          BadgeErrorCode.INVALID_ADDRESS,
          'playerAddress is required'
        );
      }
      BadgeValidators.validateAddress(playerAddress);
      BadgeValidators.validatePaymentCoinId(paymentCoinId);
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

    BadgeLogger.info('Badge mint request received', {
      playerAddress,
      hasPaymentCoinId: !!paymentCoinId,
    });

    const badgeService = getBadgeService();
    
    // Build full transaction on backend (like store does) - ensures consistency
    // This uses the same code path as admin_mint_badge which works
    const result = await badgeService.buildMintBadgeTransaction(
      playerAddress,
      paymentCoinId // Optional - backend will find coin if not provided
    );

    if (!result.success || !result.transaction) {
      const errorMessage = result.error || 'Failed to build mint transaction';
      BadgeLogger.error('Failed to build mint transaction', {
        playerAddress,
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

    // Return built transaction as base64 (frontend just signs it, like store)
    return NextResponse.json(
      {
        success: true,
        transaction: result.transaction, // Base64 transaction bytes
        gasEstimate: result.gasEstimate,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    const badgeError = BadgeError.fromUnknown(error, 'Failed to build mint transaction');
    BadgeLogger.error('Error building mint transaction', badgeError);
    
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

