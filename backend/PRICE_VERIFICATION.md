# Price Conversion Verification Guide

This guide explains how to verify that USD to token price conversion is working correctly.

## Quick Verification Methods

### Method 1: API Endpoint (Easiest)

Call the verification endpoint to get detailed conversion information:

```bash
# From your browser or curl
GET http://localhost:3000/api/store/verify-prices
```

**Response includes:**
- Current token prices (SUI, MEWS, USDC)
- Conversion tests for sample USD amounts ($0.50, $1.00, $2.50, $5.00)
- Reverse conversion verification (token → USD to check accuracy)
- Item catalog conversion tests
- Decimal handling verification

**Example Response:**
```json
{
  "success": true,
  "currentPrices": {
    "sui": 2.17,
    "mews": 0.00001885,
    "usdc": 1.0
  },
  "conversionTests": [
    {
      "usdAmount": 0.50,
      "sui": {
        "tokenAmount": "230414746",
        "displayAmount": "0.230415",
        "reverseUsd": "0.5000",
        "error": "0.0000"
      },
      "mews": {
        "tokenAmount": "26525198",
        "displayAmount": "26.53",
        "reverseUsd": "0.5000",
        "error": "0.0000"
      }
    }
  ]
}
```

### Method 2: Test Store Items Endpoint

Check that item prices are correctly converted:

```bash
GET http://localhost:3000/api/store/items
```

**Verify:**
- Each item level has `prices.sui.amount`, `prices.mews.amount`, `prices.usdc.amount`
- Display values match expected token amounts
- Prices update when token prices change

### Method 3: Manual Calculation Check

**For SUI:**
```
USD Price / SUI Price = SUI Amount
Example: $0.50 / $2.17 = 0.230415 SUI
In smallest units: 0.230415 × 1,000,000,000 = 230,415,000 MIST
```

**For MEWS (6 decimals):**
```
USD Price / MEWS Price = MEWS Amount
Example: $0.50 / $0.00001885 = 26,525.198 MEWS
In smallest units: 26,525.198 × 1,000,000 = 26,525,198,000
```

**For USDC (6 decimals):**
```
USD Price / USDC Price = USDC Amount (should be 1:1)
Example: $0.50 / $1.00 = 0.50 USDC
In smallest units: 0.50 × 1,000,000 = 500,000
```

### Method 4: Run Verification Script

If you have `tsx` installed:

```bash
cd backend
npm install -D tsx  # If not already installed
npm run verify-prices
```

Or run directly with Node (if you have ts-node):

```bash
npx tsx scripts/verify-price-conversion.ts
```

## What to Check

### ✅ Price Fetching
- [ ] Token prices are fetched from CoinGecko (or fallback)
- [ ] Prices are cached for 5 minutes
- [ ] Fallback to environment variables if API fails

### ✅ Conversion Accuracy
- [ ] USD → Token conversion is correct
- [ ] Reverse conversion (Token → USD) matches original USD amount
- [ ] Error is < 0.01% (rounding is acceptable)

### ✅ Decimal Handling
- [ ] SUI uses 9 decimals (1,000,000,000 MIST per SUI)
- [ ] MEWS uses 6 decimals (1,000,000 smallest units per MEWS)
- [ ] USDC uses 6 decimals (1,000,000 smallest units per USDC)

### ✅ Item Catalog
- [ ] All items have correct USD prices
- [ ] Token amounts are calculated correctly for each item
- [ ] Display values are formatted correctly

## Common Issues

### Issue: "Failed to fetch token prices"
**Solution:**
- Check CoinGecko API is accessible
- Set `MEWS_PRICE_USD` environment variable if MEWS not on CoinGecko
- Check network connectivity

### Issue: Conversion errors are high (>1%)
**Solution:**
- Verify decimal handling (SUI=9, MEWS=6, USDC=6)
- Check for rounding errors in calculations
- Verify token prices are current

### Issue: Prices not updating
**Solution:**
- Clear cache: Call `priceConverter.clearCache()` or restart server
- Check cache duration (5 minutes)
- Verify CoinGecko API is returning fresh data

## Testing Specific Scenarios

### Test 1: Small Amount ($0.50)
```bash
# Should convert to:
# SUI: ~0.23 SUI (at $2.17/SUI)
# MEWS: ~26,525 MEWS (at $0.00001885/MEWS)
# USDC: 0.50 USDC
```

### Test 2: Large Amount ($10.00)
```bash
# Should convert to:
# SUI: ~4.61 SUI
# MEWS: ~530,503 MEWS
# USDC: 10.00 USDC
```

### Test 3: Item Price Conversion
```bash
# Extra Lives Level 1: $0.50 USD
# Should match Test 1 results above
```

## Verification Checklist

Before deploying to production:

- [ ] All conversion tests pass
- [ ] Reverse conversions match original USD amounts
- [ ] Decimal handling is correct for all tokens
- [ ] Item catalog prices are accurate
- [ ] Error handling works (API failures, invalid prices)
- [ ] Cache is working (prices cached for 5 minutes)
- [ ] Fallback mechanisms work (env vars, expired cache)

## API Endpoints for Verification

1. **GET `/api/store/verify-prices`** - Detailed conversion verification
2. **GET `/api/store/items`** - Item catalog with converted prices
3. **POST `/api/store/purchase`** - Test purchase flow (uses conversion)

## Manual Browser Test

1. Open browser console
2. Navigate to store page
3. Check `storeState.tokenPrices` in console
4. Verify prices are loaded
5. Check item prices match expected token amounts

