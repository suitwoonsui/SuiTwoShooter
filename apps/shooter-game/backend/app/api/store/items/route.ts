// ==========================================
// Store Items API Route
// Returns item catalog with current token prices
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '../../../../../../../base/backend/lib/cors';
import { priceConverter } from '../../../../../../../backend/lib/services/price-converter';
import { ITEM_CATALOG } from '../../../../../../../backend/lib/services/item-catalog';
import { BadgeLogger } from '../../../../../../../base/backend/lib/sui/badge-logger';
import { withApiHandler } from '../../../../../../../base/backend/lib/api/api-handler';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const GET = withApiHandler(
  async (request: NextRequest) => {
    // Get current token prices
    const pricesResult = await priceConverter.getTokenPrices();
    
    if (!pricesResult.success || !pricesResult.prices) {
      throw new Error(pricesResult.error || 'Failed to fetch token prices');
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

    return {
      success: true,
      items,
      prices: {
        sui: pricesResult.prices.sui,
        mews: pricesResult.prices.mews,
        usdc: pricesResult.prices.usdc,
      },
      timestamp: pricesResult.timestamp,
    };
  }
);

