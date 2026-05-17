// ==========================================
// Shared token spot prices + decimals for public HTTP handlers.
// Used by GET /api/prices/tokens and GET /api/tournaments/prices (base payload).
// Source: priceConverter (Gauge-backed when configured; ~5m in-process cache).
// ==========================================

import { priceConverter, getMEWSDecimals } from '@/lib/services/payments/converter/price-converter';

export type TokenPricesDecimalsSuccess = {
  success: true;
  prices: { sui: number; mews: number; usdc: number };
  timestamp: number;
  decimals: { SUI: number; MEWS: number; USDC: number };
  sources?: {
    sui: string;
    mews: string;
    usdc: string;
  };
};

export type TokenPricesDecimalsFailure = {
  success: false;
  error: string;
  timestamp?: number;
};

export type TokenPricesDecimalsPayload = TokenPricesDecimalsSuccess | TokenPricesDecimalsFailure;

/**
 * Build the standard JSON body for “current MEWS/SUI/USDC USD spot + decimals”.
 */
export async function buildTokenPricesDecimalsPayload(): Promise<TokenPricesDecimalsPayload> {
  const pricesResult = await priceConverter.getTokenPrices();
  if (!pricesResult.success || !pricesResult.prices) {
    return {
      success: false,
      error: pricesResult.error ?? 'Failed to fetch prices',
      timestamp: pricesResult.timestamp,
    };
  }
  const prices = pricesResult.prices;
  const decimals = { SUI: 9, MEWS: getMEWSDecimals(), USDC: 6 } as const;
  const out: TokenPricesDecimalsSuccess = {
    success: true,
    prices: { sui: prices.sui, mews: prices.mews, usdc: prices.usdc },
    timestamp: pricesResult.timestamp ?? Date.now(),
    decimals,
  };
  if (pricesResult.sources) {
    out.sources = {
      sui: String(pricesResult.sources.sui ?? ''),
      mews: String(pricesResult.sources.mews ?? ''),
      usdc: String(pricesResult.sources.usdc ?? ''),
    };
  }
  return out;
}
