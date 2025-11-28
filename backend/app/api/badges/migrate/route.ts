// ==========================================
// Badge Migration API Route
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getBadgeService } from '@/lib/sui/badge-service';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';

/**
 * POST /api/badges/migrate
 * Migrate badge from old system to new system
 * 
 * This endpoint creates a new badge at the same tier as the old badge.
 * The new badge will use the current system's image URL generation.
 * 
 * Request body:
 * {
 *   playerAddress: string,    // Player's wallet address
 *   oldTier: number,         // Tier from old badge (0-5)
 * }
 * 
 * Returns:
 * {
 *   success: boolean,
 *   digest?: string,          // Transaction digest if successful
 *   error?: string
 * }
 * 
 * Note: Admin wallet signs and executes this transaction
 */

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);
  
  try {
    const body = await request.json();
    const { playerAddress, oldTier, oldGamesPlayed, oldMintDate } = body;

    // Validate required fields
    if (!playerAddress || typeof playerAddress !== 'string' || !playerAddress.startsWith('0x')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'playerAddress is required and must be a valid Sui address' 
        },
        { status: 400, headers: corsHeaders }
      );
    }

    if (oldTier === undefined || oldTier === null || typeof oldTier !== 'number') {
      return NextResponse.json(
        { 
          success: false,
          error: 'oldTier is required and must be a number (0-5)' 
        },
        { status: 400, headers: corsHeaders }
      );
    }

    if (oldTier < 0 || oldTier > 5) {
      return NextResponse.json(
        { 
          success: false,
          error: 'oldTier must be between 0 and 5' 
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // oldGamesPlayed and oldMintDate are optional (default to 0 if not provided)
    const gamesPlayed = oldGamesPlayed !== undefined && oldGamesPlayed !== null ? Number(oldGamesPlayed) : 0;
    const mintDate = oldMintDate !== undefined && oldMintDate !== null ? Number(oldMintDate) : 0;

    console.log(`📥 [MIGRATION] Badge migration request received`);
    console.log(`   Player address: ${playerAddress}`);
    console.log(`   Old tier: ${oldTier}`);
    console.log(`   Old games played: ${gamesPlayed}`);
    console.log(`   Old mint date: ${mintDate}`);

    const badgeService = getBadgeService();
    
    // Use migrate_badge function to preserve old tier, games played, and mint date
    // NO payment required (free migration)
    // Soulbound NFTs must be created in the player's wallet (cannot be transferred)
    // This builds a transaction for the player to sign
    const result = await badgeService.buildMigrateBadgeTransaction(
      playerAddress,
      oldTier,
      gamesPlayed,
      mintDate
    );

    if (result.success) {
      console.log(`✅ [MIGRATION] Badge migration transaction built successfully`);
      console.log(`   Transaction ready for player to sign`);
      console.log(`   Badge will be created at tier ${oldTier} (preserved from old badge)`);
      return NextResponse.json(
        {
          success: true,
          transaction: result.transaction,
          gasEstimate: result.gasEstimate,
          message: `Badge migration transaction ready. Badge will be created at tier ${oldTier} with preserved data.`,
        },
        { headers: corsHeaders }
      );
    } else {
      console.error(`❌ [MIGRATION] Badge migration failed: ${result.error}`);
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to build badge migration transaction',
        },
        { status: 500, headers: corsHeaders }
      );
    }
  } catch (error) {
    console.error('❌ [MIGRATION] Error migrating badge:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to migrate badge',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

