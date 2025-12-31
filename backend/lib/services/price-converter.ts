// ==========================================
// Price Conversion Service
// Converts USD prices to SUI, MEWS, and USDC using CoinGecko API
// ==========================================

import { getConfig } from '@/config/config';

/**
 * Get MEWS decimals based on network
 * Mainnet: 6 decimals
 * Testnet: 9 decimals
 */
function getMEWSDecimals(): number {
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
            prices: cached.price,
            sources: cached.sources,
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
          const fallbackSources: PriceSources = {
            sui: suiPriceEnv ? 'env' : 'default',
            mews: mewsPriceEnv ? 'env' : 'default',
            usdc: 'fixed',
          };
          this.cache.set(cacheKey, {
            price: fallbackPrices,
            sources: fallbackSources,
            timestamp: Date.now(),
          });
          return {
            success: true,
            prices: fallbackPrices,
            sources: fallbackSources,
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
              prices: cached.price,
              sources: cached.sources,
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
            
            const fallbackSources: PriceSources = {
              sui: suiPriceEnv ? 'env' : 'default',
              mews: mewsPriceEnv ? 'env' : 'default',
              usdc: 'fixed',
            };
            
            // Cache the fallback prices
            this.cache.set(cacheKey, {
              price: fallbackPrices,
              sources: fallbackSources,
              timestamp: Date.now(),
            });
            
            console.log(`✅ [PRICE] Fallback prices set: SUI=$${fallbackPrices.sui}, MEWS=$${fallbackPrices.mews}`);
            
            return {
              success: true,
              prices: fallbackPrices,
              sources: fallbackSources,
              timestamp: Date.now(),
            };
          }
        }
        
        // For other errors, still try cache first
        if (cached) {
          console.warn(`⚠️ [PRICE] CoinGecko API error (${suiResponse.status}), using expired cache`);
          return {
            success: true,
            prices: cached.price,
            sources: cached.sources,
            timestamp: cached.timestamp,
          };
        }
        
        // If no cache, try environment variable fallback
        const suiPriceEnv = process.env.SUI_PRICE_USD;
        const mewsPriceEnv = process.env.MEWS_PRICE_USD;
        
        if (suiPriceEnv || mewsPriceEnv) {
          console.warn(`⚠️ [PRICE] CoinGecko API error (${suiResponse.status}), using environment variable prices as fallback`);
          
          const fallbackPrices: TokenPrices = {
            sui: suiPriceEnv ? parseFloat(suiPriceEnv) : 1.5,
            mews: mewsPriceEnv ? parseFloat(mewsPriceEnv) : 0.00001885,
            usdc: 1.0
          };
          
          const fallbackSources: PriceSources = {
            sui: suiPriceEnv ? 'env' : 'default',
            mews: mewsPriceEnv ? 'env' : 'default',
            usdc: 'fixed',
          };
          
          // Cache the fallback prices
          this.cache.set(cacheKey, {
            price: fallbackPrices,
            sources: fallbackSources,
            timestamp: Date.now(),
          });
          
          console.log(`✅ [PRICE] Fallback prices set: SUI=$${fallbackPrices.sui}, MEWS=$${fallbackPrices.mews}`);
          
          return {
            success: true,
            prices: fallbackPrices,
            sources: fallbackSources,
            timestamp: Date.now(),
          };
        }
        
        throw new Error(`CoinGecko API error: ${suiResponse.status} ${suiResponse.statusText}`);
      }

      const suiData = await suiResponse.json();
      const suiPrice = suiData.sui?.usd;
      let suiSource: PriceSources['sui'] = 'coingecko';

      if (!suiPrice || typeof suiPrice !== 'number') {
        throw new Error('Invalid SUI price response from CoinGecko');
      }

      // MEWS: Try multiple sources (CoinGecko, GeckoTerminal, then environment variable)
      // Note: MEWS may be on GeckoTerminal (DEX data) rather than CoinGecko main API
      let mewsPrice: number = 0; // Initialized for TypeScript - will be overwritten by real logic
      let mewsSource: PriceSources['mews'] = 'default';
      
      try {
        let mewsFetched = false;
        
        // Method 1: Try CoinGecko main API (if MEWS is listed)
        const mewsCoinGeckoId = process.env.MEWS_COINGECKO_ID || 'mews';
        const possibleIds = [mewsCoinGeckoId, 'mews', 'mews-token', 'mews-sui'];
        
        for (const coinId of possibleIds) {
          try {
            const coinGeckoUrl = `${this.coinGeckoBaseUrl}/simple/price?ids=${coinId}&vs_currencies=usd`;
            console.log(`🔍 [PRICE] Trying CoinGecko ID: ${coinId}`);
            const mewsResponse = await fetch(coinGeckoUrl, {
              headers: {
                'Accept': 'application/json',
              },
            });

            if (mewsResponse.ok) {
              const mewsData = await mewsResponse.json();
              console.log(`🔍 [PRICE] CoinGecko response for ${coinId}:`, JSON.stringify(mewsData).substring(0, 200));
              const fetchedPrice = mewsData[coinId]?.usd;
              
              if (fetchedPrice && typeof fetchedPrice === 'number' && fetchedPrice > 0) {
                mewsPrice = fetchedPrice;
                mewsSource = 'coingecko';
                console.log(`✅ [PRICE] MEWS price fetched from CoinGecko (ID: ${coinId}): $${mewsPrice}`);
                mewsFetched = true;
                break; // Success, exit loop
              } else {
                console.log(`⚠️ [PRICE] CoinGecko ID "${coinId}" returned no valid price`);
              }
            } else {
              console.log(`⚠️ [PRICE] CoinGecko API returned status ${mewsResponse.status} for ID "${coinId}"`);
            }
          } catch (fetchError) {
            console.error(`❌ [PRICE] Error fetching CoinGecko ID "${coinId}":`, fetchError instanceof Error ? fetchError.message : String(fetchError));
            // Try next ID
            continue;
          }
        }

        // Method 2: Try GeckoTerminal API (for DEX-only tokens)
        // GeckoTerminal supports both token address and pool address endpoints
        if (!mewsFetched) {
          // First, try token address endpoint (simpler and more direct)
          // Get token address from config or environment
          const config = getConfig();
          const mewsTokenTypeId = config.token.mewsTokenTypeId;
          const mewsTokenAddress = process.env.MEWS_TOKEN_ADDRESS || 
                                  (mewsTokenTypeId.includes('::') ? mewsTokenTypeId.split('::')[0] : mewsTokenTypeId);
          
          if (mewsTokenAddress) {
            try {
              const tokenPriceUrl = `https://api.geckoterminal.com/api/v2/simple/networks/sui/token_price/${mewsTokenAddress}`;
              console.log(`🔍 [PRICE] Trying GeckoTerminal token price endpoint: ${tokenPriceUrl}`);
              
              const tokenPriceResponse = await fetch(tokenPriceUrl, {
                headers: {
                  'Accept': 'application/json',
                },
              });
              
              if (tokenPriceResponse.ok) {
                const tokenPriceData = await tokenPriceResponse.json();
                console.log('🔍 [PRICE] GeckoTerminal token price response:', JSON.stringify(tokenPriceData).substring(0, 500));
                
                // GeckoTerminal token_price endpoint returns: { "data": { "token_address": { "usd": price } } }
                // Try different possible response structures
                const price = tokenPriceData?.data?.[mewsTokenAddress.toLowerCase()]?.usd || 
                             tokenPriceData?.data?.[mewsTokenAddress]?.usd ||
                             tokenPriceData?.data?.usd ||
                             tokenPriceData?.usd;
                
                if (price && typeof price === 'number' && price > 0) {
                  mewsPrice = price;
                  mewsSource = 'geckoterminal';
                  console.log(`✅ [PRICE] MEWS price fetched from GeckoTerminal token endpoint: $${mewsPrice}`);
                  mewsFetched = true;
                } else {
                  console.log(`⚠️ [PRICE] GeckoTerminal token price endpoint returned data but no valid price found`);
                }
              } else {
                const errorText = await tokenPriceResponse.text().catch(() => '');
                console.log(`⚠️ [PRICE] GeckoTerminal token price endpoint returned ${tokenPriceResponse.status}`);
                if (errorText) {
                  console.log(`⚠️ [PRICE] Error response: ${errorText.substring(0, 200)}`);
                }
              }
            } catch (tokenPriceError) {
              console.log(`⚠️ [PRICE] GeckoTerminal token price endpoint error:`, tokenPriceError instanceof Error ? tokenPriceError.message : String(tokenPriceError));
            }
          }
          
          // If token address endpoint didn't work, try pool endpoint
          if (!mewsFetched) {
            const geckoTerminalPoolId = process.env.MEWS_GECKOTERMINAL_POOL_ID || '0x4febe18cc3fd99c29c7c1ff26b33776ace91c35d8047e70193733513b9d88c29';
            console.log(`🔍 [PRICE] Trying GeckoTerminal pool endpoint: ${geckoTerminalPoolId}`);
            try {
              // GeckoTerminal API endpoint for pool data
              // Optimized: Try known working format first (sui-network with original pool ID)
              // Only try other variants if the first attempt fails
              const networkVariants = ['sui-network', 'sui', 'sui_mainnet'];
              const poolIdVariants = [
                geckoTerminalPoolId, // Original format (most likely to work)
                geckoTerminalPoolId.toLowerCase(),
                geckoTerminalPoolId.toUpperCase(),
                geckoTerminalPoolId.startsWith('0x') ? geckoTerminalPoolId.substring(2) : `0x${geckoTerminalPoolId}`,
              ];
              
              let geckoTerminalResponse: Response | null = null;
              let geckoTerminalUrl = '';
              let successfulUrl = '';
              
              // Try known working format first (sui-network with original pool ID)
              const primaryUrl = `https://api.geckoterminal.com/api/v2/networks/sui-network/pools/${geckoTerminalPoolId}`;
              console.log(`🔍 [PRICE] Trying GeckoTerminal URL (primary): ${primaryUrl}`);
              
              try {
                geckoTerminalResponse = await fetch(primaryUrl, {
                  headers: {
                    'Accept': 'application/json',
                  },
                });
                
                if (geckoTerminalResponse.ok) {
                  successfulUrl = primaryUrl;
                  console.log(`✅ [PRICE] GeckoTerminal API responded with status ${geckoTerminalResponse.status}`);
                  console.log(`✅ [PRICE] Successful URL: ${successfulUrl}`);
                }
              } catch (fetchError) {
                console.log(`⚠️ [PRICE] Primary URL failed:`, fetchError instanceof Error ? fetchError.message : String(fetchError));
              }
              
              // If primary failed, try other combinations
              if (!geckoTerminalResponse || !geckoTerminalResponse.ok) {
                console.log(`⚠️ [PRICE] Primary URL failed, trying alternative formats...`);
                outerLoop: for (const network of networkVariants) {
                  for (const poolId of poolIdVariants) {
                    // Skip the primary combination we already tried
                    if (network === 'sui-network' && poolId === geckoTerminalPoolId) {
                      continue;
                    }
                    
                    geckoTerminalUrl = `https://api.geckoterminal.com/api/v2/networks/${network}/pools/${poolId}`;
                    console.log(`🔍 [PRICE] Trying GeckoTerminal URL: ${geckoTerminalUrl}`);
                  
                    try {
                      geckoTerminalResponse = await fetch(geckoTerminalUrl, {
                        headers: {
                          'Accept': 'application/json',
                        },
                      });
                      
                      if (geckoTerminalResponse.ok) {
                        successfulUrl = geckoTerminalUrl;
                        console.log(`✅ [PRICE] GeckoTerminal API responded with status ${geckoTerminalResponse.status}`);
                        console.log(`✅ [PRICE] Successful URL: ${successfulUrl}`);
                        break outerLoop; // Success, exit both loops
                      } else {
                        const statusText = await geckoTerminalResponse.text().catch(() => '');
                        console.log(`⚠️ [PRICE] GeckoTerminal returned ${geckoTerminalResponse.status} for ${network}/${poolId}`);
                        if (statusText) {
                          console.log(`⚠️ [PRICE] Response: ${statusText.substring(0, 100)}`);
                        }
                      }
                    } catch (fetchError) {
                      console.log(`⚠️ [PRICE] Error fetching with "${network}/${poolId}":`, fetchError instanceof Error ? fetchError.message : String(fetchError));
                      continue; // Try next combination
                    }
                  }
                }
              }
              
              if (!geckoTerminalResponse || !geckoTerminalResponse.ok) {
                throw new Error('All GeckoTerminal URL variants failed');
              }

              if (geckoTerminalResponse.ok) {
                const geckoTerminalData = await geckoTerminalResponse.json();
                
                // Log the response structure for debugging
                console.log('🔍 [PRICE] GeckoTerminal response structure:', JSON.stringify(geckoTerminalData).substring(0, 500));
                
                // GeckoTerminal API v2 structure - try multiple paths
                // Based on GeckoTerminal docs: data.data.attributes.base_token_price_usd
                let baseTokenPrice: number | null = null;
                
                // Try different possible response structures
                // Standard structure: { data: { attributes: { base_token_price_usd: ... } } }
                // Note: GeckoTerminal returns prices as strings, so we need to parse them
                let rawPrice: string | number | null = null;
                
                if (geckoTerminalData?.data?.attributes?.base_token_price_usd) {
                  rawPrice = geckoTerminalData.data.attributes.base_token_price_usd;
                  console.log(`✅ [PRICE] Found price at data.attributes.base_token_price_usd: ${rawPrice}`);
                } 
                // Nested structure: { data: { data: { attributes: { base_token_price_usd: ... } } } }
                else if (geckoTerminalData?.data?.data?.attributes?.base_token_price_usd) {
                  rawPrice = geckoTerminalData.data.data.attributes.base_token_price_usd;
                  console.log(`✅ [PRICE] Found price at data.data.attributes.base_token_price_usd: ${rawPrice}`);
                }
                // Alternative field names
                else if (geckoTerminalData?.data?.attributes?.token_price_usd) {
                  rawPrice = geckoTerminalData.data.attributes.token_price_usd;
                  console.log(`✅ [PRICE] Found price at data.attributes.token_price_usd: ${rawPrice}`);
                } else if (geckoTerminalData?.data?.attributes?.price_usd) {
                  rawPrice = geckoTerminalData.data.attributes.price_usd;
                  console.log(`✅ [PRICE] Found price at data.attributes.price_usd: ${rawPrice}`);
                } else if (geckoTerminalData?.data?.attributes?.quote_token_price_usd) {
                  rawPrice = geckoTerminalData.data.attributes.quote_token_price_usd;
                  console.log(`✅ [PRICE] Found price at data.attributes.quote_token_price_usd: ${rawPrice}`);
                } 
                // Array response structure
                else if (geckoTerminalData?.data?.[0]?.attributes?.base_token_price_usd) {
                  rawPrice = geckoTerminalData.data[0].attributes.base_token_price_usd;
                  console.log(`✅ [PRICE] Found price at data[0].attributes.base_token_price_usd: ${rawPrice}`);
                } else if (geckoTerminalData?.included?.[0]?.attributes?.price_usd) {
                  rawPrice = geckoTerminalData.included[0].attributes.price_usd;
                  console.log(`✅ [PRICE] Found price at included[0].attributes.price_usd: ${rawPrice}`);
                }
                
                // Parse the price (handles both string and number formats)
                if (rawPrice !== null) {
                  baseTokenPrice = typeof rawPrice === 'string' ? parseFloat(rawPrice) : rawPrice;
                }
                
                if (baseTokenPrice && typeof baseTokenPrice === 'number' && baseTokenPrice > 0 && !isNaN(baseTokenPrice)) {
                  mewsPrice = baseTokenPrice;
                  mewsSource = 'geckoterminal';
                  console.log(`📊 [PRICE] MEWS price fetched from GeckoTerminal: $${mewsPrice}`);
                  mewsFetched = true;
                } else {
                  console.warn('⚠️ [PRICE] GeckoTerminal response received but price not found in expected structure');
                  console.warn('⚠️ [PRICE] Full response keys:', Object.keys(geckoTerminalData || {}));
                }
              } else {
                const responseText = await geckoTerminalResponse.text().catch(() => 'Unable to read response');
                console.warn(`⚠️ [PRICE] GeckoTerminal API returned status ${geckoTerminalResponse.status}`);
                console.warn(`⚠️ [PRICE] GeckoTerminal response: ${responseText.substring(0, 200)}`);
              }
            } catch (geckoTerminalError) {
              // GeckoTerminal failed, continue to fallback
              console.error('❌ [PRICE] GeckoTerminal fetch error:', geckoTerminalError instanceof Error ? geckoTerminalError.message : String(geckoTerminalError));
            }
          }
        }

        if (!mewsFetched) {
          const geckoTerminalPoolId = process.env.MEWS_GECKOTERMINAL_POOL_ID || '0x4febe18cc3fd99c29c7c1ff26b33776ace91c35d8047e70193733513b9d88c29';
          console.warn('⚠️ [PRICE] MEWS not found on CoinGecko or GeckoTerminal');
          console.warn('⚠️ [PRICE] CoinGecko IDs tried:', possibleIds.join(', '));
          console.warn('⚠️ [PRICE] GeckoTerminal pool ID used:', geckoTerminalPoolId);
          throw new Error(`MEWS not found on CoinGecko or GeckoTerminal`);
        }
      } catch (coinGeckoError) {
        // MEWS not on CoinGecko or GeckoTerminal, try environment variable
        console.warn('⚠️ [PRICE] CoinGecko/GeckoTerminal lookup failed:', coinGeckoError instanceof Error ? coinGeckoError.message : String(coinGeckoError));
        const mewsPriceEnv = process.env.MEWS_PRICE_USD;
        if (mewsPriceEnv) {
          mewsPrice = parseFloat(mewsPriceEnv);
          mewsSource = 'env';
          if (isNaN(mewsPrice) || mewsPrice <= 0) {
            throw new Error('Invalid MEWS_PRICE_USD environment variable');
          }
          console.log(`📊 [PRICE] Using MEWS price from environment variable: $${mewsPrice}`);
          console.log(`📊 [PRICE] To use CoinGecko/GeckoTerminal, ensure MEWS is listed or set correct pool ID`);
        } else {
          // Final fallback: use default placeholder
          mewsPrice = 0.00001885; // Default placeholder matching .env value
          mewsSource = 'default';
          console.warn('⚠️ [PRICE] MEWS price not found on CoinGecko/GeckoTerminal and MEWS_PRICE_USD not set. Using default placeholder ($0.00001885). Set MEWS_PRICE_USD environment variable to override.');
        }
      }

      // USDC is always $1.00
      const usdcPrice = 1.0;
      const usdcSource: PriceSources['usdc'] = 'fixed';

      const prices: TokenPrices = {
        sui: suiPrice,
        mews: mewsPrice,
        usdc: usdcPrice,
      };

      const sources: PriceSources = {
        sui: suiSource,
        mews: mewsSource,
        usdc: usdcSource,
      };

      // Update cache
      const now = Date.now();
      this.cache.set(cacheKey, {
        price: prices,
        sources: sources,
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
        sources,
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
export const priceConverter = new PriceConverter();
export default priceConverter;

