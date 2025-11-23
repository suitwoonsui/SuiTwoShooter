// ==========================================
// Badge Migration API Route
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getBadgeService } from '@/lib/sui/badge-service';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';

/**
 * POST /api/badges/migrate
 * Build migration transaction for player to sign
 * 
 * Request body:
 * {
 *   oldBadgeId: string,      // Object ID of the old badge to be burned
 *   oldTier: number,         // Tier from old badge
 *   oldGamesPlayed: number,   // Games played from old badge
 *   oldMintDate: number,      // Original mint date from old badge
 *   imageData: string         // Badge image data (base64 encoded Uint8Array)
 * }
 * 
 * Returns:
 * {
 *   success: boolean,
 *   transaction?: string,     // Serialized transaction bytes (base64)
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
    const { oldBadgeId, oldTier, oldGamesPlayed, oldMintDate, imageUrl, oldPackageId } = body;

    // Validate required fields
    if (oldTier === undefined || oldTier === null) {
      return NextResponse.json(
        { 
          success: false,
          error: 'oldTier is required' 
        },
        { status: 400, headers: corsHeaders }
      );
    }

    if (oldGamesPlayed === undefined || oldGamesPlayed === null) {
      return NextResponse.json(
        { 
          success: false,
          error: 'oldGamesPlayed is required' 
        },
        { status: 400, headers: corsHeaders }
      );
    }

    if (oldMintDate === undefined || oldMintDate === null) {
      return NextResponse.json(
        { 
          success: false,
          error: 'oldMintDate is required' 
        },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json(
        { 
          success: false,
          error: 'imageUrl is required and must be a string' 
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate image URL format
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'imageUrl must be a valid HTTP or HTTPS URL' 
        },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`📥 Badge migration request received with image URL: ${imageUrl}`);
    if (oldBadgeId) {
      console.log(`📥 Old badge ID: ${oldBadgeId}`);
    }
    if (oldPackageId) {
      console.log(`📥 Old package ID: ${oldPackageId}`);
    }

    const badgeService = getBadgeService();
    
    // Build migration transaction
    // This will include both migration AND old badge deletion in a single atomic transaction
    // If either operation fails, the entire transaction fails (atomic)
    const txb = await badgeService.buildMigrateBadgeTransaction(
      oldBadgeId || '', // Old badge ID (optional - if provided, will attempt to delete)
      oldTier,
      oldGamesPlayed,
      oldMintDate,
      imageUrl,
      oldPackageId // Old package ID (optional - if provided, will attempt to delete old badge)
    );

    // Build and serialize transaction
    const { SuiClient, getFullnodeUrl } = await import('@mysten/sui/client');
    const { getConfig } = await import('@/config/config');
    const config = getConfig();
    const client = new SuiClient({ url: getFullnodeUrl(config.sui.network) });
    
    const transactionBytes = await txb.build({ client });
    const transactionBase64 = Buffer.from(transactionBytes).toString('base64');

    // Estimate gas (use configured gas budget)
    const gasEstimate = config.sui.gasBudget;

    console.log(`✅ [MIGRATION] Transaction built successfully`);
    console.log(`   Gas estimate: ${gasEstimate} MIST (${(gasEstimate / 1_000_000_000).toFixed(4)} SUI)`);

    return NextResponse.json(
      {
        success: true,
        transaction: transactionBase64,
        gasEstimate: gasEstimate.toString(),
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('❌ Error building migration transaction:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to build migration transaction',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

