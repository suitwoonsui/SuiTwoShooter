# Token Balance Code Consolidation

## Date: 2025-01-30

## Summary

Consolidated duplicate token balance fetching code into a single reusable utility module, eliminating code duplication across store modules.

## Problem

Token balance fetching (MEWS, SUI, USDC) was duplicated in multiple files:
- `store-ui-updates.js` - ~150 lines of balance fetching code
- `store-purchase-flow.js` - ~100 lines of balance fetching code
- Duplicate RPC URL construction
- Duplicate token type ID retrieval
- Duplicate balance parsing logic

## Solution

Created `token-balance-utils.js` - A centralized utility module that provides:
- `fetchSuiBalance()` - Fetch SUI balance using wallet API
- `fetchMewsBalance()` - Fetch MEWS balance using wallet API
- `fetchUsdcBalance()` - Fetch USDC balance using RPC API
- `fetchTokenBalance()` - Generic function that routes to appropriate fetcher
- `getRpcUrl()` - Centralized RPC URL construction
- `getUsdcTokenTypeId()` - Centralized USDC token type ID retrieval

## Changes Made

### 1. Created `src/game/systems/ui/token-balance-utils.js` (NEW)
- **Size**: ~280 lines
- **Functions**: 6 utility functions
- **Purpose**: Centralized token balance fetching for all token types

### 2. Updated `src/game/systems/ui/store-ui-updates.js`
- **Before**: ~150 lines of balance fetching code
- **After**: ~15 lines using consolidated utility
- **Reduction**: ~135 lines removed
- **Change**: Replaced all token-specific balance fetching with `fetchTokenBalance()`

### 3. Updated `src/game/systems/ui/store-purchase-flow.js`
- **Before**: ~100 lines of balance fetching code
- **After**: ~15 lines using consolidated utility
- **Reduction**: ~85 lines removed
- **Change**: Replaced all token-specific balance fetching with `fetchTokenBalance()`

### 4. Updated `src/game/systems/core/lazy-loader.js`
- Added `token-balance-utils.js` to `MENU_SCRIPTS` before store modules
- Ensures utility loads before modules that depend on it

## Benefits

✅ **Code Reduction**: ~220 lines of duplicate code eliminated  
✅ **Maintainability**: Single source of truth for balance fetching  
✅ **Consistency**: All balance fetching uses the same logic  
✅ **Error Handling**: Centralized error handling  
✅ **Extensibility**: Easy to add new token types  

## Functions Available

### `fetchTokenBalance(tokenType, walletAddress, network)`
Generic function that routes to the appropriate balance fetcher.

**Parameters:**
- `tokenType`: 'sui', 'mews', or 'usdc'
- `walletAddress`: Wallet address to check
- `network`: 'testnet' or 'mainnet' (default: 'testnet')

**Returns:**
```javascript
{
  success: boolean,
  balance: number,           // Numeric balance for calculations
  formattedBalance: string,  // Formatted string for display
  rawBalance?: string,       // Raw balance (for USDC)
  error?: string            // Error message if failed
}
```

### Individual Functions
- `fetchSuiBalance(walletAddress, network)` - SUI balance
- `fetchMewsBalance(walletAddress, network)` - MEWS balance
- `fetchUsdcBalance(walletAddress, network)` - USDC balance

### Helper Functions
- `getRpcUrl(network)` - Get RPC URL for network
- `getUsdcTokenTypeId(network)` - Get USDC token type ID from config

## Usage Examples

### Store UI Updates
```javascript
const balanceResult = await window.TokenBalanceUtils.fetchTokenBalance(token, walletAddress, 'testnet');
if (balanceResult.success) {
  balanceValue.textContent = `${balanceResult.formattedBalance} ${token.toUpperCase()}`;
}
```

### Store Purchase Flow
```javascript
const balanceResult = await window.TokenBalanceUtils.fetchTokenBalance(state.paymentToken, walletAddress, 'testnet');
if (!balanceResult.success) {
  throw new Error(balanceResult.error);
}
const userBalance = balanceResult.balance;
```

## Files Modified

1. `src/game/systems/ui/token-balance-utils.js` - **NEW** - Consolidated utility module
2. `src/game/systems/ui/store-ui-updates.js` - Updated to use utility
3. `src/game/systems/ui/store-purchase-flow.js` - Updated to use utility
4. `src/game/systems/core/lazy-loader.js` - Added utility to script loading order

## Testing

After consolidation, verify:
- ✅ Store balance display works for SUI, MEWS, and USDC
- ✅ Balance check before purchase works for all token types
- ✅ Error handling works correctly
- ✅ Balance refresh after purchase works

## Future Improvements

- Could extend to support other token types (if needed)
- Could add caching to reduce RPC calls
- Could add retry logic for failed requests

