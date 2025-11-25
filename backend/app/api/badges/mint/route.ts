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
    if (paymentCoinId) {
      console.log(`   Payment coin ID provided: ${paymentCoinId}`);
    } else {
      console.log(`   No payment coin ID - wallet module will find coin`);
    }

    const badgeService = getBadgeService();
    
    // Build full transaction on backend (like store does) - ensures consistency
    // This uses the same code path as admin_mint_badge which works
    const result = await badgeService.buildMintBadgeTransaction(
      playerAddress,
      paymentCoinId // Optional - backend will find coin if not provided
    );

    if (!result.success || !result.transaction) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to build mint transaction',
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

