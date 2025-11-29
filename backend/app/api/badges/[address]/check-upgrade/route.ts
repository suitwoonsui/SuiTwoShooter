// ==========================================
// Badge Upgrade Check API Route
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getBadgeService } from '@/lib/sui/badge-service';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';
import { BadgeValidators } from '@/lib/sui/badge-validators';
import { BadgeError, BadgeErrorCode } from '@/lib/sui/badge-errors';
import { BadgeLogger } from '@/lib/sui/badge-logger';

/**
 * GET /api/badges/[address]/check-upgrade
 * Check if player has a pending badge tier upgrade
 * 
 * Returns:
 * {
 *   success: boolean,
 *   hasPendingUpgrade: boolean,
 *   newTier?: number,
 *   transactionData?: {
 *     packageId: string,
 *     module: string,
 *     function: string,
 *     arguments: any[],
 *     badgeId: string,
 *     imageData: string (base64 encoded)
 *   },
 *   error?: string
 * }
 * 
 * Note: Frontend must sign and execute transaction if hasPendingUpgrade is true
 */

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const corsHeaders = getCorsHeaders(request);
  
  try {
    const { address } = await params;

    // Validate address format using BadgeValidators
    try {
      if (!address) {
        throw new BadgeError(
          BadgeErrorCode.INVALID_ADDRESS,
          'Address parameter is required'
        );
      }
      BadgeValidators.validateAddress(address);
    } catch (validationError) {
      if (validationError instanceof BadgeError) {
        return NextResponse.json(
          {
            success: false,
            hasPendingUpgrade: false,
            error: validationError.message,
            code: validationError.code,
          },
          { status: 400, headers: corsHeaders }
        );
      }
      throw validationError;
    }

    BadgeLogger.info('Badge upgrade check request received', { address });

    const badgeService = getBadgeService();
    
    // Get current badge
    const badge = await badgeService.getBadge(address);
    if (!badge) {
      return NextResponse.json(
        {
          success: true,
          hasPendingUpgrade: false,
        },
        { headers: corsHeaders }
      );
    }

    // Tier upgrade is pending - build transaction data
    // Generate a temporary session ID for the transaction
    // Use a special format to avoid conflicts with actual game sessions
    const sessionId = `upgrade_check_${address}_${Date.now()}`;
    
    const updateResult = await badgeService.checkAndBuildBadgeUpdate(
      address,
      sessionId,
      false // Don't add to retry queue (this is a manual check)
    );

    if (!updateResult.success) {
      return NextResponse.json(
        {
          success: false,
          hasPendingUpgrade: false,
          error: updateResult.error || 'Failed to check badge upgrade',
        },
        { status: 500, headers: corsHeaders }
      );
    }

    // If no tier upgrade needed, return success with hasPendingUpgrade: false
    if (!updateResult.tierUpgraded || !updateResult.transactionData) {
      return NextResponse.json(
        {
          success: true,
          hasPendingUpgrade: false,
        },
        { headers: corsHeaders }
      );
    }

    // Return upgrade info - frontend will call /api/badges/upgrade to build transaction
    return NextResponse.json(
      {
        success: true,
        hasPendingUpgrade: true,
        newTier: updateResult.newTier,
        badgeId: updateResult.transactionData?.badgeId,
        // Don't return transactionData - frontend will build it when user clicks upgrade
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    const badgeError = BadgeError.fromUnknown(error, 'Failed to check badge upgrade');
    BadgeLogger.error('Error checking badge upgrade', badgeError);
    
    return NextResponse.json(
      {
        success: false,
        hasPendingUpgrade: false,
        error: badgeError.message,
        code: badgeError.code,
        ...(badgeError.details && { details: badgeError.details }),
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

