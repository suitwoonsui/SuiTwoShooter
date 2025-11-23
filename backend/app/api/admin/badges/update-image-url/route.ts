// ==========================================
// Admin API: Update Badge Image URL
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getBadgeService } from '@/lib/sui/badge-service';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';

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

export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);
  
  try {
    const body = await request.json();
    const { playerAddress } = body;

    if (!playerAddress || !playerAddress.startsWith('0x') || playerAddress.length !== 66) {
      return NextResponse.json(
        { success: false, error: 'Invalid player address format' },
        { status: 400, headers: corsHeaders }
      );
    }

    const badgeService = getBadgeService();
    
    // Update the badge image URL (will use getBadgeImageUrl based on tier)
    const result = await badgeService.updateBadgeImageUrl(playerAddress);

    if (result.success) {
      return NextResponse.json(
        { success: true, message: 'Badge image URL updated successfully' },
        { headers: corsHeaders }
      );
    } else {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to update badge image URL' },
        { status: 500, headers: corsHeaders }
      );
    }
  } catch (error) {
    console.error('Error updating badge image URL:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update badge image URL',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

