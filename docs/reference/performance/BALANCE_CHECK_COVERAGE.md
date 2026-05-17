# Balance Check Coverage

## Summary

All transactions that require gas from the admin wallet now have balance checks before building/executing the transaction.

## Coverage Status

### ✅ Badge Service

1. **Mint Badge (Direct Upload)** - `badge-transactions.ts` → `getMintBadgeTransactionData()`
   - ✅ Balance check before creating image data object (≤14KB)

2. **Mint Badge (Chunked Upload)** - `badge-images.ts` → `createImageDataObjectChunked()`
   - ✅ Balance check before creating image data object (>14KB)

3. **Upgrade Badge (Direct Upload)** - `badge-transactions.ts` → `checkAndBuildBadgeUpdate()`
   - ✅ Balance check before creating image data object (≤14KB)

4. **Upgrade Badge (Chunked Upload)** - `badge-images.ts` → `createImageDataObjectChunked()`
   - ✅ Balance check before creating image data object (>14KB)

5. **Admin Mint Badge** - `badge-service.ts` → `adminMintBadge()`
   - ✅ Balance check before signing and executing transaction

### ✅ Store Service

6. **Consume Items** - `store-service.ts` → `consumeItems()`
   - ✅ Balance check before signing and executing transaction (checked once before retry loop)

7. **Admin Add Items** - `store-service.ts` → `adminAddItems()`
   - ✅ Balance check before signing and executing transaction

8. **Build Purchase Transaction** - `store-service.ts` → `buildPurchaseTransaction()`
   - ✅ Balance check for player (gas + payment token)
   - Checks player has SUI for gas and payment token (SUI/MEWS/USDC) for purchase

### ✅ Migration Service

9. **Migrate Player Inventory** - `migration-service.ts` → `migratePlayerInventory()`
   - ✅ Balance check before signing and executing transaction

10. **Migrate Player Stats** - `migration-service.ts` → `migratePlayerStats()`
    - ✅ Balance check before signing and executing transaction

## Transaction Types

### Admin Wallet Transactions (Require Balance Check)
- ✅ All badge image data object creation
- ✅ Admin mint badge
- ✅ Consume items
- ✅ Admin add items
- ✅ Migration operations

### Player Wallet Transactions (Now Have Balance Checks)
- ✅ **Mint Badge** - `buildMintBadgeTransaction()` - Checks player has SUI for gas + payment (0.1 SUI)
- ✅ **Upgrade Badge** - `buildUpgradeBadgeTransaction()` - Checks player has SUI for gas + payment (0.1 SUI)
- ✅ **Store Purchase** - `buildPurchaseTransaction()` - Checks player has:
  - SUI for gas
  - Payment token (SUI/MEWS/USDC) for purchase amount
  - ✅ USDC fully supported (requires USDC_TOKEN_TYPE_ID_TESTNET or USDC_TOKEN_TYPE_ID_MAINNET in .env)

## Implementation Details

All balance checks use the centralized `checkBalanceBeforeTransaction()` utility from `backend/lib/sui/balance-checker.ts`.

### Pattern Used

```typescript
const { checkBalanceBeforeTransaction } = await import('./balance-checker');
await checkBalanceBeforeTransaction({
  client,
  walletAddress: this.adminWallet.getAddress(),
  gasBudget: this.config.sui.gasBudget,
  context: 'operation name',
});
```

## Benefits

✅ **Consistent Error Handling** - All transactions fail early with clear error messages  
✅ **No Wasted Work** - Transactions aren't built if balance is insufficient  
✅ **Better UX** - Users get immediate feedback about insufficient balance  
✅ **Centralized Logic** - All balance checks use the same utility  
✅ **Easy to Maintain** - Changes to balance check logic only need to be made in one place  

## Player Transaction Balance Checks

All player-signed transactions now have balance checks:

1. **Mint Badge** - `badge-transactions.ts` → `buildMintBadgeTransaction()`
   - ✅ Checks player has SUI for gas + payment (0.1 SUI)

2. **Upgrade Badge** - `badge-transactions.ts` → `buildUpgradeBadgeTransaction()`
   - ✅ Checks player has SUI for gas + payment (0.1 SUI)

3. **Store Purchase** - `store-service.ts` → `buildPurchaseTransaction()`
   - ✅ Checks player has SUI for gas
   - ✅ Checks player has payment token (SUI/MEWS/USDC) for purchase amount
   - ✅ USDC support enabled (requires USDC_TOKEN_TYPE_ID_TESTNET or USDC_TOKEN_TYPE_ID_MAINNET in .env)

## Future Considerations

- ✅ USDC token type ID added to config - USDC payments now supported
- Consider adding retry logic with balance check refresh for long-running operations
- Consider adding balance monitoring/alerts when balance gets low

