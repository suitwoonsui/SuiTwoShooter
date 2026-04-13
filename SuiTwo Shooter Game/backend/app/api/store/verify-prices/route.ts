// ==========================================
// Price Verification API Endpoint
// Returns detailed price conversion information for debugging
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { priceConverter } from '@/lib/services/price-converter';
import { getItemPrice, ITEM_CATALOG } from '@/lib/services/item-catalog';
import { withApiHandler } from '@/lib/api/api-handler';

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

    const prices = pricesResult.prices;

    // Test conversions for sample amounts
    const testAmounts = [0.50, 1.00, 2.50, 5.00];
    const conversionTests = await Promise.all(
      testAmounts.map(async (usdAmount) => {
        const [suiResult, mewsResult, usdcResult] = await Promise.all([
          priceConverter.convertUSDToToken(usdAmount, 'SUI'),
          priceConverter.convertUSDToToken(usdAmount, 'MEWS'),
          priceConverter.convertUSDToToken(usdAmount, 'USDC'),
        ]);

        // Calculate reverse conversions to verify accuracy
        const suiAmount = suiResult.success && suiResult.tokenAmount
          ? parseFloat(suiResult.tokenAmount) / 1_000_000_000
          : 0;
        const mewsAmount = mewsResult.success && mewsResult.tokenAmount
          ? parseFloat(mewsResult.tokenAmount) / 1_000_000
          : 0;
        const usdcAmount = usdcResult.success && usdcResult.tokenAmount
          ? parseFloat(usdcResult.tokenAmount) / 1_000_000
          : 0;

        const reverseSui = suiAmount * prices.sui;
        const reverseMews = mewsAmount * prices.mews;
        const reverseUsdc = usdcAmount * prices.usdc;

        return {
          usdAmount,
          sui: {
            tokenAmount: suiResult.tokenAmount || '0',
            displayAmount: suiAmount.toFixed(6),
            reverseUsd: reverseSui.toFixed(4),
            error: Math.abs(reverseSui - usdAmount).toFixed(4),
            success: suiResult.success,
            errorMessage: suiResult.error,
          },
          mews: {
            tokenAmount: mewsResult.tokenAmount || '0',
            displayAmount: mewsAmount.toFixed(2),
            reverseUsd: reverseMews.toFixed(4),
            error: Math.abs(reverseMews - usdAmount).toFixed(4),
            success: mewsResult.success,
            errorMessage: mewsResult.error,
          },
          usdc: {
            tokenAmount: usdcResult.tokenAmount || '0',
            displayAmount: usdcAmount.toFixed(2),
            reverseUsd: reverseUsdc.toFixed(4),
            error: Math.abs(reverseUsdc - usdAmount).toFixed(4),
            success: usdcResult.success,
            errorMessage: usdcResult.error,
          },
        };
      })
    );

    // Test item catalog conversions
    const itemTests = await Promise.all(
      Object.values(ITEM_CATALOG).slice(0, 3).map(async (item) => {
        const level = (item.levels ?? [])[0]; // Test first level
        if (!level) {
          return {
            itemId: item.id,
            itemName: item.name,
            level: null,
            usdPrice: null,
            conversion: null,
            error: 'Item has no levels',
          };
        }

        const conversionResult = await priceConverter.convertItemPriceToTokens((level as any).usdPrice ?? 0);
        
        return {
          itemId: item.id,
          itemName: item.name,
          level: level.level,
          usdPrice: (level as any).usdPrice ?? null,
          conversion: conversionResult.success ? conversionResult.prices : null,
          error: conversionResult.error,
        };
      })
    );

    return {
      success: true,
      timestamp: pricesResult.timestamp,
      currentPrices: {
        sui: {
          price: prices.sui,
          source: pricesResult.sources?.sui || 'unknown',
          description: getSourceDescription(pricesResult.sources?.sui || 'unknown', 'SUI'),
        },
        mews: {
          price: prices.mews,
          source: pricesResult.sources?.mews || 'unknown',
          description: getSourceDescription(pricesResult.sources?.mews || 'unknown', 'MEWS'),
        },
        usdc: {
          price: prices.usdc,
          source: pricesResult.sources?.usdc || 'fixed',
          description: 'Fixed at $1.00 (stablecoin)',
        },
      },
      conversionTests,
      itemTests,
      decimalHandling: {
        sui: { decimals: 9, divisor: '1_000_000_000' },
        mews: { decimals: 6, divisor: '1_000_000' },
        usdc: { decimals: 6, divisor: '1_000_000' },
      },
    };
  }
);

function getSourceDescription(source: string, token: string): string {
  switch (source) {
    case 'coingecko':
      return `Fetched from CoinGecko API (real-time market price)`;
    case 'geckoterminal':
      return `Fetched from GeckoTerminal API (DEX pool price)`;
    case 'env':
      return `Using ${token}_PRICE_USD environment variable (manual override)`;
    case 'default':
      return `⚠️ Using hardcoded default value - ${token} not found on APIs and ${token}_PRICE_USD not set`;
    case 'cache':
      return `Using cached price (from previous API fetch)`;
    case 'fixed':
      return `Fixed at $1.00 (USDC is a stablecoin)`;
    default:
      return `Unknown source`;
  }
}

