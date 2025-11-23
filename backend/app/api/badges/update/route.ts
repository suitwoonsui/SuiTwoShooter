// ==========================================
// Badge Update API Route
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getBadgeService } from '@/lib/sui/badge-service';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';

/**
 * POST /api/badges/update
 * Check if badge tier should be updated and build transaction if needed
 * 
 * Request body:
 * {
 *   playerAddress: string,  // Player's wallet address
 *   sessionId: string        // Session ID from game completion (for idempotency)
 * }
 * 
 * Returns:
 * {
 *   success: boolean,
 *   tierUpgraded: boolean,
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
 * Note: Frontend must sign and execute transaction if tierUpgraded is true
 */

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);
  
  try {
    const body = await request.json();
    const { playerAddress, sessionId } = body;

    // Validate required fields
    if (!playerAddress) {
      return NextResponse.json(
        { 
          success: false,
          tierUpgraded: false,
          error: 'playerAddress is required' 
        },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!sessionId) {
      return NextResponse.json(
        { 
          success: false,
          tierUpgraded: false,
          error: 'sessionId is required' 
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate address format
    if (!playerAddress.startsWith('0x') || playerAddress.length !== 66) {
      return NextResponse.json(
        { 
          success: false,
          tierUpgraded: false,
          error: 'Invalid player address format. Must be a valid Sui address (0x followed by 64 hex characters)' 
        },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`📥 Badge update check request received for: ${playerAddress}, session: ${sessionId}`);

    const badgeService = getBadgeService();
    
    // Check and build update transaction
    const result = await badgeService.checkAndBuildBadgeUpdate(
      playerAddress,
      sessionId
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          tierUpgraded: false,
          error: result.error || 'Failed to check badge update',
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // If tier didn't upgrade, return early
    if (!result.tierUpgraded) {
      return NextResponse.json(
        {
          success: true,
          tierUpgraded: false,
        },
        { headers: corsHeaders }
      );
    }

    // Tier upgraded - return transaction data
    const transactionData = result.transactionData!;
    // imageDataObjectId is already in arguments, imageData is optional (for reference)
    const imageDataBase64 = transactionData.imageData 
      ? Buffer.from(transactionData.imageData).toString('base64')
      : undefined;

    return NextResponse.json(
      {
        success: true,
        tierUpgraded: true,
        newTier: result.newTier,
        transactionData: {
          ...transactionData,
          ...(imageDataBase64 && { imageData: imageDataBase64 }), // Include if available
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('❌ Error checking badge update:', error);
    return NextResponse.json(
      {
        success: false,
        tierUpgraded: false,
        error: 'Failed to check badge update',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

