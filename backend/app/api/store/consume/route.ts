// ==========================================
// Store Consume API Route
// Consumes items from inventory (admin wallet signs)
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';
import { storeService } from '@/lib/sui/store-service';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);
  
  console.log('🍽️ [CONSUME API] Received POST request to /api/store/consume');
  
  try {
    const body = await request.json();
    console.log('🍽️ [CONSUME API] Request body:', JSON.stringify(body, null, 2));
    
    const { playerAddress, items } = body;

    // Validate required fields
    if (!playerAddress) {
      console.error('❌ [CONSUME API] Missing playerAddress');
      return NextResponse.json(
        { success: false, error: 'playerAddress is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'items array is required and must not be empty' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate player address format
    if (!playerAddress.startsWith('0x') || playerAddress.length !== 66) {
      return NextResponse.json(
        { success: false, error: 'Invalid player address format' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate items structure
    for (const item of items) {
      if (!item.itemId || typeof item.itemId !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Each item must have a valid itemId' },
          { status: 400, headers: corsHeaders }
        );
      }

      if (!item.level || typeof item.level !== 'number' || item.level < 1 || item.level > 3) {
        return NextResponse.json(
          { success: false, error: 'Each item must have a valid level (1-3)' },
          { status: 400, headers: corsHeaders }
        );
      }

      if (!item.quantity || typeof item.quantity !== 'number' || item.quantity < 1) {
        return NextResponse.json(
          { success: false, error: 'Each item must have a valid quantity (>= 1)' },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    console.log(`🍽️ [CONSUME API] Consuming items for ${playerAddress}`);
    console.log(`   Items: ${items.length}`);
    items.forEach((item, idx) => {
      console.log(`   Item ${idx + 1}: ${item.itemId} level ${item.level} quantity ${item.quantity}`);
    });

    // Consume items (admin wallet signs)
    console.log('🍽️ [CONSUME API] Calling storeService.consumeItems...');
    const result = await storeService.consumeItems(playerAddress, items);
    console.log('🍽️ [CONSUME API] storeService.consumeItems returned:', result);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to consume items',
        },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('✅ [CONSUME] Items consumed successfully');

    return NextResponse.json(
      {
        success: true,
        digest: result.digest,
        playerAddress,
        items,
        gasPaidBy: 'admin_wallet',
        message: 'Items consumed successfully. Admin wallet paid gas fees.',
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('❌ Error in consume endpoint:', error);
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

