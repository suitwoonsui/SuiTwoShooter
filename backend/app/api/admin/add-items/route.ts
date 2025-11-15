import { NextRequest, NextResponse } from 'next/server';
import { storeService } from '@/lib/sui/store-service';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';
import { getConfig } from '@/config/config';
import { getAdminWalletService } from '@/lib/sui/admin-wallet-service';

/**
 * POST /api/admin/add-items
 * 
 * Server-side proxy for admin add items
 * Automatically uses API_KEY from environment (no need to send it from browser)
 * This allows a web UI to work without exposing the API key
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
    const { playerAddress, items, adminWalletAddress } = body;

    // Verify admin wallet address matches
    const adminWallet = getAdminWalletService();
    const expectedAdminAddress = adminWallet.getAddress().toLowerCase();
    const providedAdminAddress = adminWalletAddress?.toLowerCase();

    if (!providedAdminAddress || providedAdminAddress !== expectedAdminAddress) {
      console.warn('⚠️ [ADMIN ADD API] Wallet verification failed');
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

    console.log('✅ [ADMIN ADD API] Admin wallet verified:', providedAdminAddress);

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

    console.log('🎁 [ADMIN ADD API] Server-side request to add items');
    console.log(`   Player: ${playerAddress}`);
    console.log(`   Items: ${JSON.stringify(items)}`);

    // Call store service (API key is already configured server-side)
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

