// ==========================================
// Price Conversion Service
// Converts USD prices to SUI, MEWS, and USDC.
// When platform is configured, uses platform Gauge (GET /api/gauge) for alignment; otherwise CoinGecko/GeckoTerminal.
// ==========================================

import { getConfig } from '@/config/config';
import {
  platformGaugeClient,
  buildPlatformCallOptions,
} from '@/lib/services/platform/client/platform-client';

/**
 * Get MEWS decimals based on network
 * Mainnet: 6 decimals
 * Testnet: 9 decimals
 */
export function getMEWSDecimals(): number {
  const config = getConfig();
  return config.sui.network === 'testnet' ? 9 : 6;
}

interface TokenPrices {
  sui: number;
  mews: number;
  usdc: number; // USDC is always $1.00, but we'll include it for consistency
}

interface PriceSources {
  sui: 'coingecko' | 'cache' | 'env' | 'default';
  mews: 'coingecko' | 'geckoterminal' | 'env' | 'default';
  usdc: 'fixed'; // USDC is always $1.00
}

interface PriceCache {
  price: TokenPrices;
  sources: PriceSources;
  timestamp: number;
}

/**
 * PriceConverter - Handles USD to token price conversion
 * Uses CoinGecko Free Tier API
 * Implements 5-minute cache (shared across all users)
 */
export class PriceConverter {
  private cache: Map<string, PriceCache>;
  private cacheDuration = 5 * 60 * 1000; // 5 minutes in milliseconds
  private readonly coinGeckoBaseUrl = 'https://api.coingecko.com/api/v3';

  constructor() {
    this.cache = new Map();
    console.log('✅ PriceConverter initialized');
  }

  /**
   * Get current token prices (SUI, MEWS, USDC)
   * Returns all prices for frontend to display
   * 
   * @returns Token prices in USD
   */
  async getTokenPrices(): Promise<{
    success: boolean;
    prices?: TokenPrices;
    sources?: PriceSources;
    error?: string;
    timestamp?: number;
  }> {
    try {
      // Check cache first
      const cacheKey = 'all_tokens';
      const cached = this.cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
        console.log('📊 [PRICE] Using cached prices');
        return {
          success: true,
          prices: cached.price,
          sources: cached.sources,
          timestamp: cached.timestamp,
        };
      }

        const gaugeResult = await platformGaugeClient.getTokenPrices(buildPlatformCallOptions());
        if (gaugeResult.success && gaugeResult.prices) {
          const prices: TokenPrices = {
            sui: gaugeResult.prices.sui,
            mews: gaugeResult.prices.mews,
            usdc: gaugeResult.prices.usdc ?? 1.0,
          };
          const sources: PriceSources = gaugeResult.sources
            ? {
                sui: (gaugeResult.sources.sui ?? 'default') as PriceSources['sui'],
                mews: (gaugeResult.sources.mews ?? 'default') as PriceSources['mews'],
                usdc: 'fixed',
              }
            : { sui: 'default', mews: 'default', usdc: 'fixed' };
          const ts = gaugeResult.timestamp ?? Date.now();
          this.cache.set(cacheKey, { price: prices, sources, timestamp: ts });
          console.log('📊 [PRICE] Using platform Gauge');
          return { success: true, prices, sources, timestamp: ts };
        }
        return {
          success: false,
          error: gaugeResult.error ?? 'Gauge did not return prices',
          timestamp: gaugeResult.timestamp,
        };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn('📊 [PRICE] Gauge failed', message);
      return {
        success: false,
        error: message,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Convert USD amount to token amount
   * 
   * @param usdAmount - Amount in USD
   * @param token - Token type ('SUI', 'MEWS', or 'USDC')
   * @returns Token amount (with decimals)
   */
  async convertUSDToToken(
    usdAmount: number,
    token: 'SUI' | 'MEWS' | 'USDC'
  ): Promise<{
    success: boolean;
    tokenAmount?: string; // String to preserve precision
    error?: string;
  }> {
    try {
      const pricesResult = await this.getTokenPrices();
      
      if (!pricesResult.success || !pricesResult.prices) {
        return {
          success: false,
          error: pricesResult.error || 'Failed to get token prices',
        };
      }

      const prices = pricesResult.prices;
      let tokenPrice: number;
      
      switch (token) {
        case 'SUI':
          tokenPrice = prices.sui;
          break;
        case 'MEWS':
          tokenPrice = prices.mews;
          break;
        case 'USDC':
          tokenPrice = prices.usdc;
          break;
        default:
          return {
            success: false,
            error: `Unsupported token: ${token}`,
          };
      }

      if (tokenPrice <= 0) {
        return {
          success: false,
          error: `Invalid price for ${token}: ${tokenPrice}`,
        };
      }

      // Calculate token amount
      // SUI uses 9 decimals, MEWS uses 6 decimals (mainnet) or 9 decimals (testnet), USDC uses 6 decimals
      let decimals: number;
      if (token === 'USDC') {
        decimals = 6;
      } else if (token === 'MEWS') {
        // MEWS mainnet uses 6 decimals, testnet uses 9 decimals
        decimals = getMEWSDecimals();
      } else {
        decimals = 9; // SUI uses 9 decimals
      }
      const tokenAmount = (usdAmount / tokenPrice) * Math.pow(10, decimals);
      
      // Round to avoid floating point issues
      const tokenAmountRounded = Math.round(tokenAmount);

      return {
        success: true,
        tokenAmount: tokenAmountRounded.toString(),
      };
    } catch (error) {
      console.error(`❌ [PRICE] Error converting USD to ${token}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Convert multiple USD amounts to token amounts (for batch purchases)
   * 
   * @param items - Array of { usdAmount, token } pairs
   * @returns Array of token amounts
   */
  async convertMultipleUSDToToken(
    items: Array<{ usdAmount: number; token: 'SUI' | 'MEWS' | 'USDC' }>
  ): Promise<{
    success: boolean;
    tokenAmounts?: Array<{ token: string; amount: string }>;
    totalTokenAmount?: string;
    error?: string;
  }> {
    try {
      const pricesResult = await this.getTokenPrices();
      
      if (!pricesResult.success || !pricesResult.prices) {
        return {
          success: false,
          error: pricesResult.error || 'Failed to get token prices',
        };
      }

      const prices = pricesResult.prices;
      const tokenAmounts: Array<{ token: string; amount: string }> = [];
      let totalTokenAmount = BigInt(0);

      for (const item of items) {
        let tokenPrice: number;
        let decimals: number;
        
        switch (item.token) {
          case 'SUI':
            tokenPrice = prices.sui;
            decimals = 9; // SUI uses 9 decimals
            break;
          case 'MEWS':
            tokenPrice = prices.mews;
            decimals = getMEWSDecimals(); // Network-aware: 6 for mainnet, 9 for testnet
            break;
          case 'USDC':
            tokenPrice = prices.usdc;
            decimals = 6; // USDC uses 6 decimals
            break;
          default:
            return {
              success: false,
              error: `Unsupported token: ${item.token}`,
            };
        }

        if (tokenPrice <= 0) {
          return {
            success: false,
            error: `Invalid price for ${item.token}: ${tokenPrice}`,
          };
        }

        const tokenAmount = (item.usdAmount / tokenPrice) * Math.pow(10, decimals);
        const tokenAmountRounded = Math.round(tokenAmount);
        const tokenAmountBigInt = BigInt(tokenAmountRounded);

        tokenAmounts.push({
          token: item.token,
          amount: tokenAmountRounded.toString(),
        });

        totalTokenAmount += tokenAmountBigInt;
      }

      return {
        success: true,
        tokenAmounts,
        totalTokenAmount: totalTokenAmount.toString(),
      };
    } catch (error) {
      console.error('❌ [PRICE] Error converting multiple USD amounts:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Convert item level USD price to token amounts for all supported tokens
   * Helper method for converting item prices
   * 
   * @param usdPrice - USD price of the item level
   * @param prices - Optional token prices. If not provided, will fetch them.
   * @returns Token amounts for SUI, MEWS, and USDC
   */
  async convertItemPriceToTokens(
    usdPrice: number,
    prices?: TokenPrices
  ): Promise<{
    success: boolean;
    prices?: {
      sui: { amount: string; display: string };
      mews: { amount: string; display: string };
      usdc: { amount: string; display: string };
    };
    error?: string;
  }> {
    try {
      // Use provided prices or fetch them if not provided
      let tokenPrices: TokenPrices;
      if (prices) {
        tokenPrices = prices;
      } else {
        const pricesResult = await this.getTokenPrices();
        
        if (!pricesResult.success || !pricesResult.prices) {
          return {
            success: false,
            error: pricesResult.error || 'Failed to get token prices',
          };
        }
        tokenPrices = pricesResult.prices;
      }

      // Convert to SUI (9 decimals)
      const suiAmount = (usdPrice / tokenPrices.sui) * 1_000_000_000;
      const suiRounded = Math.round(suiAmount);

      // Convert to MEWS (network-aware decimals)
      const mewsDecimals = getMEWSDecimals();
      const mewsAmount = (usdPrice / tokenPrices.mews) * Math.pow(10, mewsDecimals);
      const mewsRounded = Math.round(mewsAmount);

      // Convert to USDC (6 decimals)
      const usdcAmount = (usdPrice / tokenPrices.usdc) * 1_000_000;
      const usdcRounded = Math.round(usdcAmount);

      return {
        success: true,
        prices: {
          sui: {
            amount: suiRounded.toString(),
            display: (suiAmount / 1_000_000_000).toFixed(6),
          },
          mews: {
            amount: mewsRounded.toString(),
            display: (mewsAmount / Math.pow(10, mewsDecimals)).toFixed(6),
          },
          usdc: {
            amount: usdcRounded.toString(),
            display: (usdcAmount / 1_000_000).toFixed(2),
          },
        },
      };
    } catch (error) {
      console.error('❌ [PRICE] Error converting item price to tokens:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Convert multiple item prices to tokens in batch (optimized)
   * Fetches prices once and converts all items
   * 
   * @param usdPrices - Array of USD prices to convert
   * @returns Array of conversion results
   */
  async convertItemPricesToTokensBatch(
    usdPrices: number[]
  ): Promise<{
    success: boolean;
    results?: Array<{
      sui: { amount: string; display: string };
      mews: { amount: string; display: string };
      usdc: { amount: string; display: string };
    }>;
    error?: string;
  }> {
    try {
      // Fetch prices once for all conversions
      const pricesResult = await this.getTokenPrices();
      
      if (!pricesResult.success || !pricesResult.prices) {
        return {
          success: false,
          error: pricesResult.error || 'Failed to get token prices',
        };
      }

      const prices = pricesResult.prices;
      const results = usdPrices.map((usdPrice) => {
        // Convert to SUI (9 decimals)
        const suiAmount = (usdPrice / prices.sui) * 1_000_000_000;
        const suiRounded = Math.round(suiAmount);

        // Convert to MEWS (network-aware decimals)
        const mewsDecimals = getMEWSDecimals();
        const mewsAmount = (usdPrice / prices.mews) * Math.pow(10, mewsDecimals);
        const mewsRounded = Math.round(mewsAmount);

        // Convert to USDC (6 decimals)
        const usdcAmount = (usdPrice / prices.usdc) * 1_000_000;
        const usdcRounded = Math.round(usdcAmount);

        return {
          sui: {
            amount: suiRounded.toString(),
            display: (suiAmount / 1_000_000_000).toFixed(6),
          },
          mews: {
            amount: mewsRounded.toString(),
            display: (mewsAmount / Math.pow(10, mewsDecimals)).toFixed(6),
          },
          usdc: {
            amount: usdcRounded.toString(),
            display: (usdcAmount / 1_000_000).toFixed(2),
          },
        };
      });

      return {
        success: true,
        results,
      };
    } catch (error) {
      console.error('❌ [PRICE] Error converting item prices batch:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Clear price cache (useful for testing or forced refresh)
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ [PRICE] Cache cleared');
  }
}

// Export singleton instance
// In Next.js, module-level variables are shared across requests in the same process
// but may be recreated on hot reload. The cache will persist within the same process.
let priceConverterInstance: PriceConverter | null = null;

function getPriceConverterInstance(): PriceConverter {
  // Use module-level caching to ensure singleton across Next.js hot reloads
  if (!priceConverterInstance) {
    priceConverterInstance = new PriceConverter();
  }
  return priceConverterInstance;
}

// Export the singleton instance
export const priceConverter = getPriceConverterInstance();
export default priceConverter;

