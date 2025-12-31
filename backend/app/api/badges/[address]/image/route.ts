// ==========================================
// Badge Image API Route
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getBadgeService } from '@/lib/sui/badge-service';
import { handleCorsPreflight, getCorsHeaders } from '@/lib/cors';
import { BadgeLogger } from '@/lib/sui/badge-logger';
import { withApiHandler, getAddressParam } from '@/lib/api/api-handler';
import { BadgeError, BadgeErrorCode } from '@/lib/sui/badge-errors';

/**
 * GET /api/badges/[address]/image
 * Get badge image for a player's address
 * Returns the badge image as WebP image data
 */

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const GET = withApiHandler(
  async (
    request: NextRequest,
    context: { params: Promise<{ address: string }> }
  ) => {
    const playerAddress = await getAddressParam(context.params);

    const badgeService = getBadgeService();
    
    // Check if player has badge
    const hasBadge = await badgeService.hasBadge(playerAddress);
    if (!hasBadge) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'Player does not have a badge'
      );
    }

    // Get badge data to determine tier
    const badge = await badgeService.getBadge(playerAddress);
    if (!badge) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_BADGE_ID,
        'Badge not found'
      );
    }

    // Get image URL from badge, or construct from tier
    const imageUrl = badge.imageUrl || badgeService.getBadgeImageUrl(badge.tier);
    
    // Redirect to the static image file
    // The image is served from the public/Badges/ directory
    // Return NextResponse directly for redirects
    const corsHeaders = getCorsHeaders(request);
    return NextResponse.redirect(new URL(imageUrl), {
      status: 302,
      headers: corsHeaders,
    });
  }
);

