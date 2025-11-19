// ==========================================
// Admin Badge Management API Route
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getBadgeService } from '@/lib/sui/badge-service';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';
import { getConfig } from '@/config/config';
import { getAdminWalletService } from '@/lib/sui/admin-wallet-service';

/**
 * POST /api/admin/badges
 * Admin-only endpoint for badge management (mint/burn)
 * 
 * Request body:
 * {
 *   action: 'mint' | 'burn',
 *   playerAddress?: string,  // Required for 'mint'
 *   tier?: number,          // Required for 'mint' (0-5)
 *   badgeId?: string,      // Required for 'burn'
 *   adminWalletAddress: string  // For verification
 * }
 */

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);

  try {
    // Verify API key is configured (server-side check)
    const config = getConfig();
    if (!config.security.apiKey || config.security.apiKey === '') {
      return NextResponse.json(
        {
          success: false,
          error: 'API_KEY not configured on server. Please set API_KEY in backend/.env.local',
        },
        { status: 500, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const { action, playerAddress, tier, badgeId, adminWalletAddress } = body;

    // Verify admin wallet address matches
    const adminWallet = getAdminWalletService();
    const expectedAdminAddress = adminWallet.getAddress().toLowerCase();
    const providedAdminAddress = adminWalletAddress?.toLowerCase();

    if (!providedAdminAddress || providedAdminAddress !== expectedAdminAddress) {
      console.warn('⚠️ [ADMIN BADGE API] Wallet verification failed');
      console.warn(`   Expected: ${expectedAdminAddress}`);
      console.warn(`   Provided: ${providedAdminAddress || 'none'}`);
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized. Admin wallet verification failed. Please connect the correct admin wallet.',
        },
        { status: 403, headers: corsHeaders }
      );
    }

    console.log('✅ [ADMIN BADGE API] Admin wallet verified:', providedAdminAddress);

    // Validate action
    if (!action || (action !== 'mint' && action !== 'burn')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid action. Must be "mint" or "burn"',
        },
        { status: 400, headers: corsHeaders }
      );
    }

    const badgeService = getBadgeService();

    if (action === 'mint') {
      // Validate mint parameters
      if (!playerAddress || typeof playerAddress !== 'string') {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid playerAddress. Must be a valid Sui address.',
          },
          { status: 400, headers: corsHeaders }
        );
      }

      if (tier === undefined || tier === null || typeof tier !== 'number') {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid tier. Must be a number (0-5).',
          },
          { status: 400, headers: corsHeaders }
        );
      }

      if (tier < 0 || tier > 5) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid tier. Must be between 0 and 5.',
          },
          { status: 400, headers: corsHeaders }
        );
      }

      console.log(`🎖️ [ADMIN BADGE API] Minting badge for ${playerAddress}, tier: ${tier}`);

      const result = await badgeService.adminMintBadge(playerAddress, tier);

      if (result.success) {
        return NextResponse.json(
          {
            success: true,
            digest: result.digest,
            message: `Successfully minted ${tier} tier badge for ${playerAddress}`,
          },
          { headers: corsHeaders }
        );
      } else {
        return NextResponse.json(
          {
            success: false,
            error: result.error || 'Failed to mint badge',
          },
          { status: 500, headers: corsHeaders }
        );
      }
    } else if (action === 'burn') {
      // Validate burn parameters
      if (!badgeId || typeof badgeId !== 'string') {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid badgeId. Must be a valid Sui object ID.',
          },
          { status: 400, headers: corsHeaders }
        );
      }

      console.log(`🔥 [ADMIN BADGE API] Burning badge: ${badgeId}`);

      const result = await badgeService.adminBurnBadge(badgeId);

      if (result.success) {
        return NextResponse.json(
          {
            success: true,
            digest: result.digest,
            message: `Successfully burned badge ${badgeId}`,
          },
          { headers: corsHeaders }
        );
      } else {
        return NextResponse.json(
          {
            success: false,
            error: result.error || 'Failed to burn badge',
          },
          { status: 500, headers: corsHeaders }
        );
      }
    }
  } catch (error) {
    console.error('❌ [ADMIN BADGE API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

