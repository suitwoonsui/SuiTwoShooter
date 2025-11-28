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
  console.log(`\n📥 [BADGE API] ========== BADGE QUERY REQUEST ==========`);
  console.log(`📥 [BADGE API] Timestamp: ${new Date().toISOString()}`);
  console.log(`📥 [BADGE API] Request URL: ${request.url}`);
  console.log(`📥 [BADGE API] Request method: ${request.method}`);
  
  const corsHeaders = getCorsHeaders(request);
  
  try {
    // Step 1: Extract and validate address parameter
    console.log(`\n📥 [BADGE API] Step 1: Extracting address parameter...`);
    const { address: playerAddress } = await params;
    
    // Step 1.5: Check for contract query parameter
    const { searchParams } = new URL(request.url);
    const contract = searchParams.get('contract') || 'new'; // Default to 'new'
    const useOldContract = contract === 'old';
    console.log(`📥 [BADGE API] ========== CONTRACT SELECTION ==========`);
    console.log(`📥 [BADGE API] Contract parameter: ${contract}`);
    console.log(`📥 [BADGE API] useOldContract: ${useOldContract}`);
    console.log(`📥 [BADGE API] Will query: ${useOldContract ? 'OLD contract registry' : 'NEW contract registry'}`);
    console.log(`📥 [BADGE API] =========================================`);
    console.log(`📥 [BADGE API] Extracted address: ${playerAddress}`);
    console.log(`📥 [BADGE API] Address length: ${playerAddress?.length || 0}`);
    console.log(`📥 [BADGE API] Address starts with 0x: ${playerAddress?.startsWith('0x') || false}`);

    // Validate address format
    console.log(`\n📥 [BADGE API] Step 2: Validating address format...`);
    if (!playerAddress || !playerAddress.startsWith('0x') || playerAddress.length !== 66) {
      console.error(`❌ [BADGE API] Invalid address format`);
      console.error(`   - Address: ${playerAddress}`);
      console.error(`   - Starts with 0x: ${playerAddress?.startsWith('0x') || false}`);
      console.error(`   - Length: ${playerAddress?.length || 0} (expected 66)`);
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid player address format. Must be a valid Sui address (0x followed by 64 hex characters)' 
        },
        { status: 400, headers: corsHeaders }
      );
    }
    console.log(`✅ [BADGE API] Address format valid: ${playerAddress}`);

    // Step 3: Get badge service
    console.log(`\n📥 [BADGE API] Step 3: Getting badge service instance...`);
    const badgeService = getBadgeService();
    console.log(`✅ [BADGE API] Badge service obtained`);
    
    // Step 4: Check if player has badge (in selected contract)
    console.log(`\n📥 [BADGE API] Step 4: Checking if player has badge in ${contract} contract...`);
    
    const hasBadge = useOldContract
      ? await badgeService.hasBadgeOldContract(playerAddress)
      : await badgeService.hasBadge(playerAddress);
    
    console.log(`\n📥 [BADGE API] hasBadge() returned: ${hasBadge}`);
    console.log(`📥 [BADGE API] Type: ${typeof hasBadge}, Value: ${hasBadge}`);
    console.log(`📥 [BADGE API] Boolean conversion: ${Boolean(hasBadge)}`);
    
    if (!hasBadge) {
      console.log(`\n📥 [BADGE API] ========== NO BADGE FOUND ==========`);
      console.log(`📥 [BADGE API] Player does not have badge in ${contract} contract`);
      console.log(`📥 [BADGE API] Returning hasBadge: false`);
      console.log(`📥 [BADGE API] =====================================\n`);
      return NextResponse.json(
        {
          success: true,
          hasBadge: false,
        },
        { headers: corsHeaders }
      );
    }

    // Step 5: Get badge data (from selected contract)
    console.log(`\n📥 [BADGE API] Step 5: Player HAS badge - getting badge data from ${contract} contract...`);
    
    const badge = useOldContract
      ? await badgeService.getBadgeOldContract(playerAddress)
      : await badgeService.getBadge(playerAddress);
    
    console.log(`\n📥 [BADGE API] getBadge() returned:`, badge ? 'Badge object' : 'null');
    if (badge) {
      console.log(`📥 [BADGE API] Badge details:`);
      console.log(`   - badgeId: ${badge.badgeId}`);
      console.log(`   - tier: ${badge.tier}`);
      console.log(`   - gamesPlayed: ${badge.gamesPlayed}`);
      console.log(`   - mintDate: ${badge.mintDate}`);
      console.log(`   - lastUpdated: ${badge.lastUpdated}`);
    } else {
      console.log(`⚠️ [BADGE API] getBadge returned null even though hasBadge was true`);
      console.log(`⚠️ [BADGE API] This indicates an INCONSISTENCY:`);
      console.log(`   - hasBadge() returned: true`);
      console.log(`   - getBadge() returned: null`);
      console.log(`⚠️ [BADGE API] This might indicate an orphaned registry entry`);
    }
    
    if (!badge) {
      console.log(`\n📥 [BADGE API] ========== INCONSISTENT STATE ==========`);
      console.log(`📥 [BADGE API] Registry says player has badge, but getBadge returned null`);
      console.log(`📥 [BADGE API] Returning hasBadge: false (inconsistent state)`);
      console.log(`📥 [BADGE API] =========================================\n`);
      return NextResponse.json(
        {
          success: true,
          hasBadge: false,
        },
        { headers: corsHeaders }
      );
    }

    // Step 6: Get discounts for tier
    console.log(`\n📥 [BADGE API] Step 6: Getting discounts for tier ${badge.tier}...`);
    const discounts = badgeService.getDiscounts(badge.tier);
    console.log(`📥 [BADGE API] Discounts:`, JSON.stringify(discounts, null, 2));

    // Step 7: Return success response
    console.log(`\n📥 [BADGE API] ========== BADGE FOUND ==========`);
    console.log(`📥 [BADGE API] Successfully retrieved badge data`);
    console.log(`📥 [BADGE API] Badge ID: ${badge.badgeId}`);
    console.log(`📥 [BADGE API] Tier: ${badge.tier}`);
    console.log(`📥 [BADGE API] ==================================\n`);

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
          imageUrl: badge.imageUrl, // Include image URL from badge object
          discounts,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error(`\n❌ [BADGE API] ========== ERROR ==========`);
    console.error(`❌ [BADGE API] Exception caught during badge query`);
    console.error(`❌ [BADGE API] Error type: ${error instanceof Error ? error.constructor.name : typeof error}`);
    console.error(`❌ [BADGE API] Error message: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      console.error(`❌ [BADGE API] Stack trace:`, error.stack);
    }
    console.error(`❌ [BADGE API] Player address: ${await params.then(p => p.address).catch(() => 'unknown')}`);
    console.error(`❌ [BADGE API] =============================\n`);
    
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

