// ==========================================
// Badge Minting API Route
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getBadgeService } from '@/lib/sui/badge-service';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';

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

    // Validate required fields
    if (!playerAddress) {
      return NextResponse.json(
        { 
          success: false,
          error: 'playerAddress is required' 
        },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!paymentCoinId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'paymentCoinId is required' 
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate address format
    if (!playerAddress.startsWith('0x') || playerAddress.length !== 66) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid player address format. Must be a valid Sui address (0x followed by 64 hex characters)' 
        },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`📥 Badge mint request received for: ${playerAddress}`);

    const badgeService = getBadgeService();
    
    // Get transaction data (frontend will build it in wallet module)
    const result = await badgeService.getMintBadgeTransactionData(
      playerAddress,
      paymentCoinId
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to get mint transaction data',
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Return transaction data for frontend to build
    return NextResponse.json(
      {
        success: true,
        transactionData: result.transactionData,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('❌ Error building mint transaction:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to build mint transaction',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

