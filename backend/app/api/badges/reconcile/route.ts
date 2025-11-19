// ==========================================
// Badge Reconciliation API Route
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getBadgeReconciliation } from '@/lib/sui/badge-reconciliation';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';

/**
 * POST /api/badges/reconcile
 * Manually trigger reconciliation for a specific player
 * 
 * Request body:
 * {
 *   playerAddress: string  // Player's wallet address
 * }
 * 
 * Returns:
 * {
 *   success: boolean,
 *   updated: boolean,
 *   error?: string
 * }
 */

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);
  
  try {
    const body = await request.json();
    const { playerAddress } = body;

    // Validate required fields
    if (!playerAddress) {
      return NextResponse.json(
        { 
          success: false,
          updated: false,
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
          updated: false,
          error: 'Invalid player address format. Must be a valid Sui address (0x followed by 64 hex characters)' 
        },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`🔄 Reconciliation request received for: ${playerAddress}`);

    const reconciliation = getBadgeReconciliation();
    const result = await reconciliation.reconcilePlayer(playerAddress);

    return NextResponse.json(
      result,
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('❌ Error during reconciliation:', error);
    return NextResponse.json(
      {
        success: false,
        updated: false,
        error: 'Failed to reconcile badge',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

