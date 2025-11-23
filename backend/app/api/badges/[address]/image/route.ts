// ==========================================
// Badge Image API Route
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getBadgeService } from '@/lib/sui/badge-service';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';

/**
 * GET /api/badges/[address]/image
 * Get badge image for a player's address
 * Returns the badge image as WebP image data
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
        { error: 'Invalid player address format' },
        { status: 400, headers: corsHeaders }
      );
    }

    const badgeService = getBadgeService();
    
    // Check if player has badge
    const hasBadge = await badgeService.hasBadge(playerAddress);
    if (!hasBadge) {
      return NextResponse.json(
        { error: 'Player does not have a badge' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Get badge data to determine tier
    const badge = await badgeService.getBadge(playerAddress);
    if (!badge) {
      return NextResponse.json(
        { error: 'Badge not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Get image URL from badge, or construct from tier
    const imageUrl = badge.imageUrl || badgeService.getBadgeImageUrl(badge.tier);
    
    // Redirect to the static image file
    // The image is served from the public/Badges/ directory
    return NextResponse.redirect(new URL(imageUrl), {
      status: 302,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('Error fetching badge image:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch badge image',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

