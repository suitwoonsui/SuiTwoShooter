# Balance Checker Utility

## Overview

A reusable balance checking utility that can be used by any service that needs to validate wallet balance before building transactions. This ensures consistent error handling and prevents wasted transaction building when insufficient funds are available.

## Location

`backend/lib/sui/balance-checker.ts`

## Usage

### Basic Usage (Throws on Insufficient Balance)

```typescript
import { checkBalanceBeforeTransaction } from '@/lib/sui/balance-checker';

// Before building a transaction
await checkBalanceBeforeTransaction({
  client: suiClient,
  walletAddress: adminWallet.getAddress(),
  gasBudget: config.sui.gasBudget,
  context: 'mint badge', // Optional: for logging
});
```

### Graceful Handling (Returns Result Object)

```typescript
import { checkBalance } from '@/lib/sui/balance-checker';

// Check balance without throwing
const result = await checkBalance({
  client: suiClient,
  walletAddress: adminWallet.getAddress(),
  gasBudget: config.sui.gasBudget,
  context: 'upgrade badge',
});

if (!result.hasSufficientBalance) {
  // Handle insufficient balance gracefully
  console.error(result.error);
  return { success: false, error: result.error };
}
```

## API

### `checkBalanceBeforeTransaction(options)`

Throws `BadgeError` with `INSUFFICIENT_BALANCE` code if balance is insufficient.

**Parameters:**
- `client: SuiClient` - Sui client instance
- `walletAddress: string` - Wallet address to check
- `gasBudget: number` - Required gas budget
- `buffer?: number` - Additional buffer (default: 100_000_000 = 0.1 SUI)
- `context?: string` - Context for logging (optional)

**Returns:** `BalanceCheckResult` (only if balance is sufficient)

**Throws:** `BadgeError` with `INSUFFICIENT_BALANCE` code

### `checkBalance(options)`

Returns result object without throwing.

**Parameters:** Same as `checkBalanceBeforeTransaction`

**Returns:** `BalanceCheckResult` (never throws)

## BalanceCheckResult

```typescript
interface BalanceCheckResult {
  hasSufficientBalance: boolean;
  currentBalance: string;      // In SUI
  requiredBalance: string;     // In SUI
  error?: string;              // Error message if insufficient
}
```

## Examples

### Badge Service

```typescript
// In badge-transactions.ts
await checkBalanceBeforeTransaction({
  client,
  walletAddress: adminWallet.getAddress(),
  gasBudget: config.sui.gasBudget,
  context: 'mint badge (direct upload)',
});
```

### Store Service

```typescript
// In store-service.ts
await checkBalanceBeforeTransaction({
  client: suiClient,
  walletAddress: playerAddress,
  gasBudget: estimatedGas,
  context: 'purchase item',
});
```

### Score Submission

```typescript
// In score-submission.ts
const balanceCheck = await checkBalance({
  client: suiClient,
  walletAddress: adminWallet.getAddress(),
  gasBudget: config.sui.gasBudget,
  context: 'submit score',
});

if (!balanceCheck.hasSufficientBalance) {
  // Add to retry queue or return error
  return { success: false, error: balanceCheck.error };
}
```

## Benefits

✅ **Reusable** - Can be used by any service  
✅ **Consistent** - Same error handling everywhere  
✅ **Early Detection** - Fails before building transaction  
✅ **Better Errors** - Clear, consistent error messages  
✅ **Flexible** - Can throw or return result based on use case  
✅ **Logging** - Built-in logging with context  

## Error Code

Uses `BadgeErrorCode.INSUFFICIENT_BALANCE` which maps to HTTP 503 (Service Unavailable) in the API handler.

## Migration

All balance checks in the codebase have been migrated to use this utility:
- ✅ Badge minting (direct upload)
- ✅ Badge upgrade (direct upload)
- ✅ Badge chunked upload
- 🔄 Store purchases (can be migrated)
- 🔄 Score submission (can be migrated)

