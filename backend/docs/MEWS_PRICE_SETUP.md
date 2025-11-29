# How to Get MEWS Price from CoinGecko

## Current Status

Based on your verification results, MEWS is currently using the environment variable (`MEWS_PRICE_USD`), which means it's **not** being fetched from CoinGecko automatically.

## Methods to Get MEWS Price

### Method 1: Find CoinGecko ID (Recommended)

1. **Search CoinGecko directly:**
   - Go to https://www.coingecko.com/
   - Search for "MEWS" or "MEWS token"
   - Check if it's listed and note the exact ID from the URL
   - Example: If URL is `coingecko.com/en/coins/mews-token`, the ID is `mews-token`

2. **Set the CoinGecko ID in environment:**
   ```bash
   MEWS_COINGECKO_ID=mews-token  # Replace with actual ID
   ```

3. **Test the API directly:**
   ```bash
   curl "https://api.coingecko.com/api/v3/simple/price?ids=mews-token&vs_currencies=usd"
   ```

### Method 2: Use Contract Address (If CoinGecko supports Sui)

If CoinGecko supports Sui blockchain tokens by contract address:

1. **Get MEWS contract address:**
   - Find the MEWS token contract address on Sui
   - Example: `0x...` (your actual contract address)

2. **Use CoinGecko token_price endpoint:**
   ```
   https://api.coingecko.com/api/v3/simple/token_price/sui?contract_addresses={MEWS_CONTRACT_ADDRESS}&vs_currencies=usd
   ```

3. **Update the code** to use this endpoint instead of the simple/price endpoint

### Method 3: Use GeckoTerminal (For DEX Tokens)

GeckoTerminal is better for DEX-only tokens that aren't on CoinGecko main:

1. **Find the MEWS pool address on Sui:**
   - Go to the DEX where MEWS is traded (e.g., Cetus, Turbos)
   - Find the MEWS/SUI or MEWS/USDC pool address
   - Copy the pool object ID

2. **Set in environment:**
   ```bash
   MEWS_GECKOTERMINAL_POOL_ID=0x...  # Your actual pool address
   ```

3. **The code will automatically try GeckoTerminal** if CoinGecko fails

### Method 4: Manual Override (Current Setup)

Keep using environment variable if MEWS isn't on CoinGecko:

```bash
MEWS_PRICE_USD=0.00001885  # Update this value manually
```

## How to Test

1. **Check if MEWS is on CoinGecko:**
   ```bash
   # Try different IDs
   curl "https://api.coingecko.com/api/v3/simple/price?ids=mews&vs_currencies=usd"
   curl "https://api.coingecko.com/api/v3/simple/price?ids=mews-token&vs_currencies=usd"
   curl "https://api.coingecko.com/api/v3/simple/price?ids=mews-sui&vs_currencies=usd"
   ```

2. **Check GeckoTerminal:**
   ```bash
   # Replace with your actual pool ID
   curl "https://api.geckoterminal.com/api/v2/networks/sui/pools/0x4febe18cc3fd99c29c7c1ff26b33776ace91c35d8047e70193733513b9d88c29"
   ```

3. **Verify in your app:**
   - Call `/api/store/verify-prices`
   - Check the `mews.source` field:
     - `"coingecko"` = Successfully fetched from CoinGecko
     - `"geckoterminal"` = Successfully fetched from GeckoTerminal
     - `"env"` = Using environment variable
     - `"default"` = Using hardcoded fallback

## Current Code Behavior

The code tries in this order:
1. **CoinGecko** - Tries IDs: `MEWS_COINGECKO_ID`, `mews`, `mews-token`, `mews-sui`
2. **GeckoTerminal** - Uses `MEWS_GECKOTERMINAL_POOL_ID` or default pool
3. **Environment Variable** - Uses `MEWS_PRICE_USD` if set
4. **Hardcoded Default** - Falls back to `$0.00001885`

## Recommended Next Steps

1. **Search CoinGecko** for MEWS token
2. **If found:** Set `MEWS_COINGECKO_ID` to the correct ID
3. **If not found:** 
   - Try GeckoTerminal with the correct pool address
   - Or continue using `MEWS_PRICE_USD` environment variable
4. **Update the code** to use contract address endpoint if CoinGecko supports Sui tokens

## Code Update Needed (If Using Contract Address)

If you want to use the contract address method, you'll need to update `price-converter.ts`:

```typescript
// Add contract address endpoint
const mewsContractAddress = process.env.MEWS_CONTRACT_ADDRESS;
if (mewsContractAddress) {
  const contractResponse = await fetch(
    `https://api.coingecko.com/api/v3/simple/token_price/sui?contract_addresses=${mewsContractAddress}&vs_currencies=usd`
  );
  // Parse response...
}
```

