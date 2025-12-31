# Balance Check Before Transaction Building

## Problem

When building transactions that require creating image data objects on-chain, the system would fail with "Insufficient wallet balance" errors if the admin wallet didn't have enough SUI. This happened **after** building the transaction, which was inefficient and provided poor error messages.

## Solution

Added balance checks **before** building transactions that require gas. This provides:
- ✅ Early failure detection
- ✅ Better error messages
- ✅ No wasted transaction building
- ✅ Consistent behavior across all transaction types

## Changes Made

### 1. Mint Badge Transaction (`getMintBadgeTransactionData`)
- Added balance check before direct upload path (small images ≤14KB)
- Chunked upload path already had balance check in `createImageDataObjectChunked()`

### 2. Upgrade Badge Transaction (`checkAndBuildBadgeUpdate`)
- Added balance check before direct upload path (small images ≤14KB)
- Chunked upload path already had balance check in `createImageDataObjectChunked()`

### 3. Chunked Upload (`createImageDataObjectChunked`)
- Already had balance check (no changes needed)

## Balance Check Logic

All balance checks follow the same pattern:

```typescript
// Check wallet balance before building transaction
const adminWallet = this.dependencies.getAdminWallet();
const adminAddress = adminWallet.getAddress();
const balance = await client.getBalance({ owner: adminAddress });
const balanceInSUI = BigInt(balance.totalBalance) / BigInt(1_000_000_000);
const requiredBalance = BigInt(config.sui.gasBudget) + BigInt(100_000_000); // Gas + buffer

if (BigInt(balance.totalBalance) < requiredBalance) {
  throw new BadgeError(
    BadgeErrorCode.INSUFFICIENT_BALANCE,
    `Insufficient wallet balance. Need ${(Number(requiredBalance) / 1_000_000_000).toFixed(4)} SUI, have ${balanceInSUI.toString()} SUI`
  );
}
```

## Benefits

✅ **Early Detection** - Fails fast before building transaction  
✅ **Better UX** - Clear error message about insufficient balance  
✅ **Efficiency** - No wasted transaction building  
✅ **Consistency** - All transaction types check balance first  
✅ **Error Code** - Uses `INSUFFICIENT_BALANCE` error code (maps to 503)  

## Error Handling

The `INSUFFICIENT_BALANCE` error code is mapped to HTTP 503 (Service Unavailable) in the API handler, which is appropriate since the service cannot complete the operation without sufficient funds.

