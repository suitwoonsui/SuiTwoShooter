// ==========================================
// Tournament creation: token prices and USD ↔ token conversion
// Used by player tournament creation modal for ante and payment display.
// Base spot payload is shared with GET /api/prices/tokens (see token-prices-public-payload).
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler } from '@/lib/api/api-handler';
import { priceConverter } from '@/lib/services/payments/converter/price-converter';
import { buildTokenPricesDecimalsPayload } from '@/lib/services/payments/converter/token-prices-public-payload';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

const TOKENS = ['SUI', 'MEWS', 'USDC'] as const;
type Token = (typeof TOKENS)[number];

function getDecimals(token: Token, decimals: { SUI: number; MEWS: number; USDC: number }): number {
  if (token === 'USDC') return decimals.USDC;
  if (token === 'MEWS') return decimals.MEWS;
  return decimals.SUI;
}

export const GET = withApiHandler(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const usdCentsParam = searchParams.get('usdCents');
    const tokenAmountRawParam = searchParams.get('tokenAmountRaw');
    const tokenParam = searchParams.get('token') as Token | null;

    const base = await buildTokenPricesDecimalsPayload();
    if (!base.success) {
      return { success: false, error: base.error, timestamp: base.timestamp };
    }
    const { prices, timestamp, decimals } = base;

    // Optional: convert USD cents → token amount (raw string)
    if (usdCentsParam != null && tokenParam && TOKENS.includes(tokenParam)) {
      const usdCents = Math.max(0, parseInt(usdCentsParam, 10) || 0);
      const usd = usdCents / 100;
      const conv = await priceConverter.convertUSDToToken(usd, tokenParam);
      if (!conv.success) return { success: false, error: conv.error };
      const tokenAmountRaw = conv.tokenAmount ?? '0';
      const human = Number(tokenAmountRaw) / Math.pow(10, getDecimals(tokenParam, decimals));
      return {
        success: true,
        prices: { sui: prices.sui, mews: prices.mews, usdc: prices.usdc },
        timestamp,
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
      const dec = getDecimals(tokenParam, decimals);
      const human = Number(amount) / Math.pow(10, dec);
      const price = tokenParam === 'SUI' ? prices.sui : tokenParam === 'MEWS' ? prices.mews : prices.usdc;
      const usd = human * price;
      const usdCents = Math.round(usd * 100);
      return {
        success: true,
        prices: { sui: prices.sui, mews: prices.mews, usdc: prices.usdc },
        timestamp,
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
      timestamp,
      decimals,
      ...(base.sources ? { sources: base.sources } : {}),
    };
  }
);
