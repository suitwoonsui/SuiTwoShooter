// ==========================================
// Admin API: Update Badge Image URL
// ==========================================

import { NextRequest } from 'next/server';
import { getBadgeService } from '@/lib/sui/badge-service';
import { handleCorsPreflight } from '@/lib/cors';
import { BadgeLogger } from '@/lib/sui/badge-logger';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { BadgeError, BadgeErrorCode } from '@/lib/sui/badge-errors';
import { BadgeValidators } from '@/lib/sui/badge-validators';

/**
 * POST /api/admin/badges/update-image-url
 * Update a badge's image URL to point to the correct static file
 * 
 * Body: {
 *   playerAddress: string
 * }
 */

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(
  async (request: NextRequest) => {
    const body = await getRequestBody<{ playerAddress: string }>(request);
    const { playerAddress } = body;

    BadgeValidators.validateAddress(playerAddress);

    const badgeService = getBadgeService();
    
    // Update the badge image URL (will use getBadgeImageUrl based on tier)
    const result = await badgeService.updateBadgeImageUrl(playerAddress);

    if (!result.success) {
      throw new Error(result.error || 'Failed to update badge image URL');
    }

    return {
      success: true,
      message: 'Badge image URL updated successfully',
    };
  }
);

