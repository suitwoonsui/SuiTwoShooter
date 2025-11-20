// ==========================================
// Badge Query API Route
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getBadgeService } from '@/lib/sui/badge-service';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';

/**
 * GET /api/badges/[address]
 * Query player's badge information
 * 
 * Returns:
 * {
 *   success: boolean,
 *   hasBadge: boolean,
 *   badge?: {
 *     badgeId: string,
 *     tier: number,
 *     gamesPlayed: number,
 *     mintDate: number,
 *     lastUpdated: number,
 *     discounts: {
 *       store: number,
 *       gameplay: number
 *     }
 *   }
 * }
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
    const { address: playerAddress } = await params;

    // Validate address format
    if (!playerAddress || !playerAddress.startsWith('0x') || playerAddress.length !== 66) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid player address format. Must be a valid Sui address (0x followed by 64 hex characters)' 
        },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`📥 [BADGE API] Badge query request received for: ${playerAddress}`);

    const badgeService = getBadgeService();
    
    // Check if player has badge
    console.log(`📥 [BADGE API] Checking if player has badge...`);
    const hasBadge = await badgeService.hasBadge(playerAddress);
    console.log(`📥 [BADGE API] hasBadge result: ${hasBadge}`);
    
    if (!hasBadge) {
      console.log(`📥 [BADGE API] Player does not have badge, returning hasBadge: false`);
      return NextResponse.json(
        {
          success: true,
          hasBadge: false,
        },
        { headers: corsHeaders }
      );
    }

    // Get badge data
    console.log(`📥 [BADGE API] Player has badge, getting badge data...`);
    const badge = await badgeService.getBadge(playerAddress);
    console.log(`📥 [BADGE API] getBadge result:`, badge ? `Found badge ID: ${badge.badgeId}` : 'null');
    
    if (!badge) {
      console.log(`📥 [BADGE API] getBadge returned null even though hasBadge was true. This might indicate an orphaned registry entry.`);
      return NextResponse.json(
        {
          success: true,
          hasBadge: false,
        },
        { headers: corsHeaders }
      );
    }

    // Get discounts for tier
    const discounts = badgeService.getDiscounts(badge.tier);

    return NextResponse.json(
      {
        success: true,
        hasBadge: true,
        badge: {
          badgeId: badge.badgeId,
          tier: badge.tier,
          gamesPlayed: badge.gamesPlayed,
          mintDate: badge.mintDate,
          lastUpdated: badge.lastUpdated,
          discounts,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('❌ Error querying badge:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to query badge',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

