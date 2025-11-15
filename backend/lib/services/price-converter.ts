// ==========================================
// Price Conversion Service
// Converts USD prices to SUI, MEWS, and USDC using CoinGecko API
// ==========================================

interface PriceCache {
  price: number;
  timestamp: number;
}

interface TokenPrices {
  sui: number;
  mews: number;
  usdc: number; // USDC is always $1.00, but we'll include it for consistency
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
          prices: cached.price as TokenPrices,
          timestamp: cached.timestamp,
        };
      }

      // Fetch from CoinGecko
      console.log('📊 [PRICE] Fetching prices from CoinGecko...');
      
      // CoinGecko IDs:
      // - SUI: 'sui'
      // - MEWS: We'll need to find the CoinGecko ID or use a different method
      // - USDC: 'usd-coin' (but it's always $1.00)
      
      // For MVP, we'll fetch SUI price and use a fallback for MEWS
      // MEWS might not be on CoinGecko, so we may need to use a different source
      // For now, we'll try to fetch SUI and handle MEWS separately
      
      let suiResponse: Response;
      try {
        suiResponse = await fetch(
          `${this.coinGeckoBaseUrl}/simple/price?ids=sui&vs_currencies=usd`,
          {
            headers: {
              'Accept': 'application/json',
            },
          }
        );
      } catch (fetchError) {
        console.error('❌ [PRICE] Network error fetching from CoinGecko:', fetchError);
        // Try fallback strategies on network error
        if (cached) {
          console.warn(`⚠️ [PRICE] Network error, using expired cache`);
          return {
            success: true,
            prices: cached.price as TokenPrices,
            timestamp: cached.timestamp,
          };
        }
        
        // Try environment variables
        const suiPriceEnv = process.env.SUI_PRICE_USD;
        const mewsPriceEnv = process.env.MEWS_PRICE_USD;
        if (suiPriceEnv || mewsPriceEnv) {
          console.warn(`⚠️ [PRICE] Network error, using environment variable prices as fallback`);
          const fallbackPrices: TokenPrices = {
            sui: suiPriceEnv ? parseFloat(suiPriceEnv) : 1.5,
            mews: mewsPriceEnv ? parseFloat(mewsPriceEnv) : 0.00001885,
            usdc: 1.0
          };
          this.cache.set(cacheKey, {
            price: fallbackPrices,
            timestamp: Date.now(),
          });
          return {
            success: true,
            prices: fallbackPrices,
            timestamp: Date.now(),
          };
        }
        
        throw new Error(`Network error fetching prices: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
      }

      if (!suiResponse.ok) {
        // If rate limited (429) or other error, try fallback strategies
        if (suiResponse.status === 429) {
          console.warn('⚠️ [PRICE] CoinGecko rate limit (429), using fallback prices');
          
          // Strategy 1: Use cached prices even if expired
          if (cached) {
            console.warn(`⚠️ [PRICE] Using expired cache as fallback`);
            return {
              success: true,
              prices: cached.price as TokenPrices,
              timestamp: cached.timestamp,
            };
          }
          
          // Strategy 2: Use environment variable prices as fallback
          const suiPriceEnv = process.env.SUI_PRICE_USD;
          const mewsPriceEnv = process.env.MEWS_PRICE_USD;
          
          // Use environment variables if available (at least one is enough to proceed)
          if (suiPriceEnv || mewsPriceEnv) {
            console.warn(`⚠️ [PRICE] Using environment variable prices as fallback (rate limited)`);
            
            // Use environment variables or reasonable defaults
            const fallbackPrices: TokenPrices = {
              sui: suiPriceEnv ? parseFloat(suiPriceEnv) : 1.5, // Default SUI price if not set
              mews: mewsPriceEnv ? parseFloat(mewsPriceEnv) : 0.00001885, // Default MEWS price if not set
              usdc: 1.0
            };
            
            // Cache the fallback prices
            this.cache.set(cacheKey, {
              price: fallbackPrices,
              timestamp: Date.now(),
            });
            
            console.log(`✅ [PRICE] Fallback prices set: SUI=$${fallbackPrices.sui}, MEWS=$${fallbackPrices.mews}`);
            
            return {
              success: true,
              prices: fallbackPrices,
              timestamp: Date.now(),
            };
          }
        }
        
        // For other errors, still try cache first
        if (cached) {
          console.warn(`⚠️ [PRICE] CoinGecko API error (${suiResponse.status}), using expired cache`);
          return {
            success: true,
            prices: cached.price as TokenPrices,
            timestamp: cached.timestamp,
          };
        }
        
        throw new Error(`CoinGecko API error: ${suiResponse.status} ${suiResponse.statusText}`);
      }

      const suiData = await suiResponse.json();
      const suiPrice = suiData.sui?.usd;

      if (!suiPrice || typeof suiPrice !== 'number') {
        throw new Error('Invalid SUI price response from CoinGecko');
      }

      // MEWS: Try multiple sources (CoinGecko, GeckoTerminal, then environment variable)
      // Note: MEWS may be on GeckoTerminal (DEX data) rather than CoinGecko main API
      let mewsPrice: number;
      try {
        let mewsFetched = false;
        
        // Method 1: Try CoinGecko main API (if MEWS is listed)
        const mewsCoinGeckoId = process.env.MEWS_COINGECKO_ID || 'mews';
        const possibleIds = [mewsCoinGeckoId, 'mews', 'mews-token', 'mews-sui'];
        
        for (const coinId of possibleIds) {
          try {
            const mewsResponse = await fetch(
              `${this.coinGeckoBaseUrl}/simple/price?ids=${coinId}&vs_currencies=usd`,
              {
                headers: {
                  'Accept': 'application/json',
                },
              }
            );

            if (mewsResponse.ok) {
              const mewsData = await mewsResponse.json();
              const fetchedPrice = mewsData[coinId]?.usd;
              
              if (fetchedPrice && typeof fetchedPrice === 'number' && fetchedPrice > 0) {
                mewsPrice = fetchedPrice;
                console.log(`📊 [PRICE] MEWS price fetched from CoinGecko (ID: ${coinId}): $${mewsPrice}`);
                mewsFetched = true;
                break; // Success, exit loop
              }
            }
          } catch (fetchError) {
            // Try next ID
            continue;
          }
        }

        // Method 2: Try GeckoTerminal API (for DEX-only tokens)
        // GeckoTerminal uses pool addresses to get prices
        if (!mewsFetched) {
          const geckoTerminalPoolId = process.env.MEWS_GECKOTERMINAL_POOL_ID || '0x4febe18cc3fd99c29c7c1ff26b33776ace91c35d8047e70193733513b9d88c29';
          try {
            // GeckoTerminal API endpoint for pool data
            // Format: /api/v2/networks/{network}/pools/{pool_address}
            const geckoTerminalResponse = await fetch(
              `https://api.geckoterminal.com/api/v2/networks/sui/pools/${geckoTerminalPoolId}`,
              {
                headers: {
                  'Accept': 'application/json',
                },
              }
            );

            if (geckoTerminalResponse.ok) {
              const geckoTerminalData = await geckoTerminalResponse.json();
              // GeckoTerminal returns: { data: { attributes: { base_token_price_usd: ... } } }
              const baseTokenPrice = geckoTerminalData?.data?.attributes?.base_token_price_usd;
              
              if (baseTokenPrice && typeof baseTokenPrice === 'number' && baseTokenPrice > 0) {
                mewsPrice = baseTokenPrice;
                console.log(`📊 [PRICE] MEWS price fetched from GeckoTerminal: $${mewsPrice}`);
                mewsFetched = true;
              } else {
                // Try alternative structure: token_price_usd or price_usd
                const altPrice = geckoTerminalData?.data?.attributes?.token_price_usd ||
                                geckoTerminalData?.data?.attributes?.price_usd;
                if (altPrice && typeof altPrice === 'number' && altPrice > 0) {
                  mewsPrice = altPrice;
                  console.log(`📊 [PRICE] MEWS price fetched from GeckoTerminal (alt): $${mewsPrice}`);
                  mewsFetched = true;
                }
              }
            }
          } catch (geckoTerminalError) {
            // GeckoTerminal failed, continue to fallback
            console.log('⚠️ [PRICE] GeckoTerminal fetch failed, trying fallback');
          }
        }

        if (!mewsFetched) {
          throw new Error(`MEWS not found on CoinGecko or GeckoTerminal`);
        }
      } catch (coinGeckoError) {
        // MEWS not on CoinGecko or GeckoTerminal, try environment variable
        const mewsPriceEnv = process.env.MEWS_PRICE_USD;
        if (mewsPriceEnv) {
          mewsPrice = parseFloat(mewsPriceEnv);
          if (isNaN(mewsPrice) || mewsPrice <= 0) {
            throw new Error('Invalid MEWS_PRICE_USD environment variable');
          }
          console.log(`📊 [PRICE] Using MEWS price from environment: $${mewsPrice}`);
        } else {
          // Final fallback: use placeholder
          mewsPrice = 0.001; // Default placeholder
          console.warn('⚠️ [PRICE] MEWS price not found on CoinGecko/GeckoTerminal and MEWS_PRICE_USD not set. Using default placeholder ($0.001). Set MEWS_PRICE_USD environment variable to override.');
        }
      }

      // USDC is always $1.00
      const usdcPrice = 1.0;

      const prices: TokenPrices = {
        sui: suiPrice,
        mews: mewsPrice,
        usdc: usdcPrice,
      };

      // Update cache
      const now = Date.now();
      this.cache.set(cacheKey, {
        price: prices,
        timestamp: now,
      });

      console.log('✅ [PRICE] Prices fetched successfully:', {
        sui: `$${suiPrice.toFixed(4)}`,
        mews: `$${mewsPrice.toFixed(9)}`, // More decimals for small token prices
        usdc: `$${usdcPrice.toFixed(2)}`,
      });

      return {
        success: true,
        prices,
        timestamp: now,
      };
    } catch (error) {
      console.error('❌ [PRICE] Error fetching token prices:', error);
      
      // Fail gracefully - don't return stale prices
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error fetching prices',
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
      // For now, we'll use 9 decimals for SUI and MEWS (testnet), but this should be network-aware
      // TODO: Make decimals network-aware based on the network being used
      let decimals: number;
      if (token === 'USDC') {
        decimals = 6;
      } else if (token === 'MEWS') {
        // MEWS mainnet uses 6 decimals, testnet uses 9 decimals
        // For now, default to 6 for mainnet (most common case)
        // This should be made configurable based on network
        decimals = 6; // Mainnet MEWS uses 6 decimals
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
        const decimals = item.token === 'USDC' ? 6 : 9;
        
        switch (item.token) {
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
   * Clear price cache (useful for testing or forced refresh)
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ [PRICE] Cache cleared');
  }
}

// Export singleton instance
export const priceConverter = new PriceConverter();
export default priceConverter;

