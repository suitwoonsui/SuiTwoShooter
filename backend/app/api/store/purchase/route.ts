// ==========================================
// Store Purchase API Route
// Builds unsigned purchase transaction for frontend to sign
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';
import { storeService } from '@/lib/sui/store-service';
import { priceConverter } from '@/lib/services/price-converter';
import { calculateTotalUSD } from '@/lib/services/item-catalog';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);
  
  try {
    const body = await request.json();
    const { playerAddress, items, paymentToken } = body;

    // Validate required fields
    if (!playerAddress) {
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

    if (!paymentToken || !['SUI', 'MEWS', 'USDC'].includes(paymentToken)) {
      return NextResponse.json(
        { success: false, error: 'paymentToken must be SUI, MEWS, or USDC' },
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

      // Validate reasonable quantities (prevent abuse)
      if (item.quantity > 100) {
        return NextResponse.json(
          { success: false, error: 'Quantity per item cannot exceed 100' },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    console.log(`🛒 [PURCHASE] Building purchase transaction for ${playerAddress}`);
    console.log(`   Items: ${items.length}`);
    console.log(`   Payment token: ${paymentToken}`);

    // Calculate total USD price using shared catalog
    const priceResult = calculateTotalUSD(items);
    if (!priceResult.success || priceResult.totalUSD === undefined) {
      return NextResponse.json(
        { success: false, error: priceResult.error || 'Failed to calculate total price' },
        { status: 400, headers: corsHeaders }
      );
    }
    const totalUSD = priceResult.totalUSD;

    // Convert USD to token amount
    const conversionResult = await priceConverter.convertUSDToToken(
      totalUSD,
      paymentToken
    );

    if (!conversionResult.success || !conversionResult.tokenAmount) {
      return NextResponse.json(
        {
          success: false,
          error: conversionResult.error || 'Failed to convert USD to token amount',
          message: 'Unable to calculate price. Please try again later.',
        },
        { status: 503, headers: corsHeaders }
      );
    }

    // Build purchase transaction
    const transactionResult = await storeService.buildPurchaseTransaction(
      playerAddress,
      items,
      paymentToken,
      conversionResult.tokenAmount
    );

    if (!transactionResult.success || !transactionResult.transaction) {
      return NextResponse.json(
        {
          success: false,
          error: transactionResult.error || 'Failed to build transaction',
        },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('✅ [PURCHASE] Transaction built successfully');

    return NextResponse.json(
      {
        success: true,
        transaction: transactionResult.transaction,
        gasEstimate: transactionResult.gasEstimate,
        totalUSD: totalUSD.toFixed(2),
        totalToken: conversionResult.tokenAmount,
        paymentToken,
        items,
        playerAddress,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('❌ Error in purchase endpoint:', error);
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

