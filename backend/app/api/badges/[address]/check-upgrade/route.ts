// ==========================================
// Badge Upgrade Check API Route
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getBadgeService } from '@/lib/sui/badge-service';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';

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

    // Validate address format
    if (!address || !address.startsWith('0x') || address.length !== 66) {
      return NextResponse.json(
        { 
          success: false,
          hasPendingUpgrade: false,
          error: 'Invalid player address format. Must be a valid Sui address (0x followed by 64 hex characters)' 
        },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`📥 Badge upgrade check request received for: ${address}`);

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

    const transactionData = updateResult.transactionData;
    // imageDataObjectId is already in arguments, imageData is optional (for reference)
    const imageDataBase64 = transactionData.imageData 
      ? Buffer.from(transactionData.imageData).toString('base64')
      : undefined;

    return NextResponse.json(
      {
        success: true,
        hasPendingUpgrade: true,
        newTier: updateResult.newTier,
        transactionData: {
          ...transactionData,
          ...(imageDataBase64 && { imageData: imageDataBase64 }), // Include if available
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('❌ Error checking badge upgrade:', error);
    return NextResponse.json(
      {
        success: false,
        hasPendingUpgrade: false,
        error: 'Failed to check badge upgrade',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

