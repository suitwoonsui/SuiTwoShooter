// ==========================================
// STORE UTILITIES - Price Conversion and Formatting
// ==========================================
// Pure utility functions for price conversion and formatting
// No dependencies on other store modules

console.log('✅ [STORE UTILS] Store utilities module loaded');

/**
 * Convert USD price to token amount
 * Uses prices from backend API (should always be available)
 * 
 * @param {number} usdPrice - Price in USD
 * @param {string} tokenType - 'sui', 'mews', or 'usdc'
 * @param {Object} tokenPrices - Token prices object from backend { sui: number, mews: number, usdc: number }
 * @returns {Object} { amount: number, formatted: string, error?: string }
 */
function convertUsdToToken(usdPrice, tokenType, tokenPrices = null) {
  // Get token prices from StoreService if available, otherwise use provided parameter
  let prices = tokenPrices;
  if (!prices && typeof StoreService !== 'undefined' && StoreService.getState) {
    const state = StoreService.getState();
    prices = state.tokenPrices;
  }
  
  // Fallback: try to get from global storeState if available
  if (!prices && typeof getStoreState === 'function') {
    const state = getStoreState();
    prices = state?.tokenPrices;
  }
  
    // Use prices from backend API if available
    if (prices) {
      let rate;
      
      if (tokenType === 'sui') {
        rate = prices.sui;
      } else if (tokenType === 'mews') {
        rate = prices.mews;
      } else {
        rate = prices.usdc || 1.0; // USDC is always $1.0
      }
      
      // If rate is missing or invalid, return error
      if (!rate || rate <= 0) {
        console.warn(`⚠️ [STORE UTILS] Missing or invalid ${tokenType} price from backend`);
        return {
          amount: 0,
          formatted: 'N/A',
          error: 'Price unavailable'
        };
      }
      
      const tokenAmount = usdPrice / rate;
      
      // Log the calculation for debugging
      console.log('🔢 [STORE UTILS] convertUsdToToken calculation', {
        usdPrice,
        tokenType,
        rate,
        calculatedAmount: tokenAmount,
        calculation: `${usdPrice} / ${rate} = ${tokenAmount}`,
      });
      
      return {
        amount: tokenAmount,
        formatted: formatTokenAmount(tokenAmount, tokenType)
      };
    }
  
  // Fallback: if no prices available, return error
  console.warn('⚠️ [STORE UTILS] No token prices available');
  return {
    amount: 0,
    formatted: 'N/A',
    error: 'Price data unavailable'
  };
}

/**
 * Format token amount for display
 * 
 * @param {number} amount - Token amount
 * @param {string} tokenType - 'sui', 'mews', or 'usdc'
 * @returns {string} Formatted token amount
 */
function formatTokenAmount(amount, tokenType) {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '0';
  }
  
  // Format based on token type
  if (tokenType === 'sui') {
    // SUI: Show up to 4 decimal places, use grouping
    return amount.toLocaleString('en-US', {
      notation: 'standard',
      minimumFractionDigits: 0,
      maximumFractionDigits: 4,
      useGrouping: true
    });
  } else if (tokenType === 'mews') {
    // MEWS: Show up to 2 decimal places, use grouping (never compact "…B" billion suffix)
    return amount.toLocaleString('en-US', {
      notation: 'standard',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
      useGrouping: true
    });
  } else {
    // USDC: Show 2 decimal places
    return amount.toLocaleString('en-US', {
      notation: 'standard',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true
    });
  }
}

/**
 * Format USD price for display
 * 
 * @param {number} price - Price in USD
 * @returns {string} Formatted USD price
 */
function formatUsdPrice(price) {
  if (isNaN(price) || price === null || price === undefined) {
    return '$0.00';
  }
  
  return price.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Normalize badge tier from API (number or numeric string). Tier 0 is valid — never use `tier || 1`.
 * @param {unknown} raw
 * @returns {number|null}
 */
function normalizeStoreBadgeTier(raw) {
  if (raw == null || raw === '') return null;
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n)) return null;
  const t = Math.floor(n);
  if (t < 0 || t > 99) return null;
  return t;
}

/**
 * Store (SKU) discount % for a badge payload: prefers `badge.discounts.store` from GET /api/badges, else tier table.
 * @param {{ tier?: unknown, discounts?: { store?: unknown } }|null|undefined} badge
 * @returns {number}
 */
function getStoreBadgeDiscountPercent(badge) {
  if (!badge) return 0;
  const d = badge.discounts;
  if (d && typeof d.store === 'number' && Number.isFinite(d.store)) {
    return Math.max(0, d.store);
  }
  return 0;
}

// Expose globally
if (typeof window !== 'undefined') {
  window.convertUsdToToken = convertUsdToToken;
  window.formatTokenAmount = formatTokenAmount;
  window.formatUsdPrice = formatUsdPrice;
  window.normalizeStoreBadgeTier = normalizeStoreBadgeTier;
  window.getStoreBadgeDiscountPercent = getStoreBadgeDiscountPercent;
}

