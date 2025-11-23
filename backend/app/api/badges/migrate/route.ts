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
    const { playerAddress, oldTier } = body;

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

    console.log(`📥 [MIGRATION] Badge migration request received`);
    console.log(`   Player address: ${playerAddress}`);
    console.log(`   Old tier: ${oldTier}`);

    const badgeService = getBadgeService();
    
    // Simply create a new badge at the same tier using adminMintBadge
    // This will use the current system's image URL generation automatically
    // The adminMintBadge function handles all the complexity
    const result = await badgeService.adminMintBadge(playerAddress, oldTier);

    if (result.success) {
      console.log(`✅ [MIGRATION] Badge migrated successfully`);
      console.log(`   Transaction digest: ${result.digest}`);
      return NextResponse.json(
        {
          success: true,
          digest: result.digest,
          message: `Successfully migrated badge to tier ${oldTier}`,
        },
        { headers: corsHeaders }
      );
    } else {
      console.error(`❌ [MIGRATION] Badge migration failed: ${result.error}`);
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to migrate badge',
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

