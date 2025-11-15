import { NextRequest, NextResponse } from 'next/server';
import { storeService } from '@/lib/sui/store-service';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';
import { requireAdminAuth, getAdminIdentifier } from '@/lib/auth';

/**
 * POST /api/store/admin/add-items
 * 
 * Admin-only endpoint to add items to a player's inventory
 * Used for: testing, promotions, refunds, corrections
 * 
 * SECURITY: Protected with API key authentication
 * Requires: Authorization: Bearer <API_KEY> or X-API-Key: <API_KEY>
 * 
 * Request body:
 * {
 *   playerAddress: string,
 *   items: Array<{ itemId: string, level: number, quantity: number }>
 * }
 */
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);

  // Require admin authentication
  const authError = requireAdminAuth(request);
  if (authError) {
    return authError;
  }

  const adminId = getAdminIdentifier(request);
  console.log(`🔐 [ADMIN ADD API] Authenticated admin request from ${adminId}`);

  try {

    const body = await request.json();
    const { playerAddress, items } = body;

    // Validate request
    if (!playerAddress || typeof playerAddress !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid playerAddress. Must be a valid Sui address.',
        },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid items. Must be a non-empty array.',
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate each item
    for (const item of items) {
      if (!item.itemId || !item.level || !item.quantity) {
        return NextResponse.json(
          {
            success: false,
            error: 'Each item must have itemId, level, and quantity.',
          },
          { status: 400, headers: corsHeaders }
        );
      }
      if (item.quantity <= 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Quantity must be greater than 0.',
          },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    console.log('🎁 [ADMIN ADD API] Received request to add items');
    console.log(`   Admin: ${adminId}`);
    console.log(`   Player: ${playerAddress}`);
    console.log(`   Items: ${JSON.stringify(items)}`);

    // Call store service
    const result = await storeService.adminAddItems(playerAddress, items);

    if (result.success) {
      console.log('✅ [ADMIN ADD API] Items added successfully');
      return NextResponse.json(
        {
          success: true,
          digest: result.digest,
          message: `Successfully added ${items.length} item(s) to inventory`,
        },
        { headers: corsHeaders }
      );
    } else {
      console.error('❌ [ADMIN ADD API] Failed to add items:', result.error);
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to add items',
        },
        { status: 500, headers: corsHeaders }
      );
    }
  } catch (error) {
    console.error('❌ [ADMIN ADD API] Error:', error);
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

