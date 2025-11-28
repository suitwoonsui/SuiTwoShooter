// ==========================================
// Badge Upgrade API Route
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getBadgeService } from '@/lib/sui/badge-service';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';

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

    if (!badgeId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'badgeId is required' 
        },
        { status: 400, headers: corsHeaders }
      );
    }

    if (newTier === undefined || newTier === null) {
      return NextResponse.json(
        { 
          success: false,
          error: 'newTier is required' 
        },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!sessionId) {
      return NextResponse.json(
        { 
          success: false,
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
          error: 'Invalid player address format. Must be a valid Sui address (0x followed by 64 hex characters)' 
        },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`📥 Badge upgrade request received for: ${playerAddress}, badge: ${badgeId}, tier: ${newTier}`);

    const badgeService = getBadgeService();
    
    // Build full transaction on backend (like mint does) - ensures consistency
    const result = await badgeService.buildUpgradeBadgeTransaction(
      playerAddress,
      badgeId,
      newTier,
      sessionId
    );

    if (!result.success || !result.transaction) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to build upgrade transaction',
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
    console.error('❌ Error building upgrade transaction:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to build upgrade transaction',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

