// ==========================================
// Tournament creation: token prices and USD ↔ token conversion
// Used by player tournament creation modal for ante and payment display.
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler } from '@/lib/api/api-handler';
import { priceConverter, getMEWSDecimals } from '@/lib/services/payments/converter/price-converter';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

const TOKENS = ['SUI', 'MEWS', 'USDC'] as const;
type Token = (typeof TOKENS)[number];

function getDecimals(token: Token): number {
  if (token === 'USDC') return 6;
  if (token === 'MEWS') return getMEWSDecimals();
  return 9; // SUI
}

export const GET = withApiHandler(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const usdCentsParam = searchParams.get('usdCents');
    const tokenAmountRawParam = searchParams.get('tokenAmountRaw');
    const tokenParam = searchParams.get('token') as Token | null;

    const pricesResult = await priceConverter.getTokenPrices();
    if (!pricesResult.success || !pricesResult.prices) {
      return { success: false, error: pricesResult.error ?? 'Failed to fetch prices' };
    }
    const prices = pricesResult.prices;
    const decimals = { SUI: 9, MEWS: getMEWSDecimals(), USDC: 6 } as const;

    // Optional: convert USD cents → token amount (raw string)
    if (usdCentsParam != null && tokenParam && TOKENS.includes(tokenParam)) {
      const usdCents = Math.max(0, parseInt(usdCentsParam, 10) || 0);
      const usd = usdCents / 100;
      const conv = await priceConverter.convertUSDToToken(usd, tokenParam);
      if (!conv.success) return { success: false, error: conv.error };
      const tokenAmountRaw = conv.tokenAmount ?? '0';
      const human = Number(tokenAmountRaw) / Math.pow(10, getDecimals(tokenParam));
      return {
        success: true,
        prices: { sui: prices.sui, mews: prices.mews, usdc: prices.usdc },
        timestamp: pricesResult.timestamp,
        decimals,
        conversion: {
          usdCents,
          usd,
          token: tokenParam,
          tokenAmountRaw,
          tokenAmountHuman: human,
        },
      };
    }

    // Optional: convert token amount (raw) → USD cents
    if (tokenAmountRawParam != null && tokenParam && TOKENS.includes(tokenParam)) {
      const raw = tokenAmountRawParam.trim();
      const amount = raw ? BigInt(raw) : 0n;
      const dec = getDecimals(tokenParam);
      const human = Number(amount) / Math.pow(10, dec);
      const price = tokenParam === 'SUI' ? prices.sui : tokenParam === 'MEWS' ? prices.mews : prices.usdc;
      const usd = human * price;
      const usdCents = Math.round(usd * 100);
      return {
        success: true,
        prices: { sui: prices.sui, mews: prices.mews, usdc: prices.usdc },
        timestamp: pricesResult.timestamp,
        decimals,
        conversion: {
          token: tokenParam,
          tokenAmountRaw: amount.toString(),
          tokenAmountHuman: human,
          usd,
          usdCents,
        },
      };
    }

    return {
      success: true,
      prices: { sui: prices.sui, mews: prices.mews, usdc: prices.usdc },
      timestamp: pricesResult.timestamp ?? Date.now(),
      decimals,
    };
  }
);
