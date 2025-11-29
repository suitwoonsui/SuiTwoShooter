// ==========================================
// Store Items API Route
// Returns item catalog with current token prices
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';
import { priceConverter } from '@/lib/services/price-converter';
import { ITEM_CATALOG } from '@/lib/services/item-catalog';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);
  
  try {
    // Get current token prices
    const pricesResult = await priceConverter.getTokenPrices();
    
    if (!pricesResult.success || !pricesResult.prices) {
      return NextResponse.json(
        {
          success: false,
          error: pricesResult.error || 'Failed to fetch token prices',
          message: 'Unable to retrieve current prices. Please try again later.',
        },
        { status: 503, headers: corsHeaders }
      );
    }

    // Convert all items with token prices using priceConverter service
    // Pass prices directly to avoid redundant getTokenPrices() calls
    const items = await Promise.all(
      Object.values(ITEM_CATALOG).map(async (item) => {
        const levels = await Promise.all(
          item.levels.map(async (level) => {
            // Pass prices directly to avoid redundant fetch
            const conversionResult = await priceConverter.convertItemPriceToTokens(
              level.usdPrice,
              pricesResult.prices
            );
            
            if (!conversionResult.success || !conversionResult.prices) {
              // Fallback to basic structure if conversion fails
              return {
                ...level,
                prices: {
                  sui: { amount: '0', display: '0.000000' },
                  mews: { amount: '0', display: '0.000000' },
                  usdc: { amount: '0', display: '0.00' },
                },
              };
            }

            return {
              ...level,
              prices: conversionResult.prices,
            };
          })
        );

        return {
          ...item,
          levels,
        };
      })
    );

    return NextResponse.json(
      {
        success: true,
        items,
        prices: {
          sui: pricesResult.prices.sui,
          mews: pricesResult.prices.mews,
          usdc: pricesResult.prices.usdc,
        },
        timestamp: pricesResult.timestamp,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('❌ Error in store items endpoint:', error);
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

