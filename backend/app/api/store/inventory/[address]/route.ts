// ==========================================
// Store Inventory API Route
// Returns player's inventory from blockchain
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';
import { storeService } from '@/lib/sui/store-service';

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
    const { address } = await params;

    // Validate address format
    if (!address || !address.startsWith('0x') || address.length !== 66) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid address format. Must be a valid Sui address (0x followed by 64 hex characters)',
        },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`📦 [INVENTORY] Fetching inventory for ${address}`);

    // Query inventory from blockchain
    const result = await storeService.getInventory(address);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to fetch inventory',
        },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        address,
        inventory: result.inventory || {},
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('❌ Error in inventory endpoint:', error);
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

