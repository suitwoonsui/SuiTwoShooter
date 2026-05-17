# Payment Transaction Builder - Usage Guide

## Overview

The `PaymentTransactionBuilder` is a shared service for building payment transactions across all services (Store, Tournaments, etc.). It handles common payment logic like token transfers, balance checking, and coin preparation.

---

## Why Use It?

**Before (Each service builds its own):**
- ❌ Code duplication
- ❌ Inconsistent payment handling
- ❌ Hard to maintain
- ❌ Easy to introduce bugs

**After (Shared service):**
- ✅ Single source of truth
- ✅ Consistent payment handling
- ✅ Easier to maintain
- ✅ Less code duplication

---

## Basic Usage

### 1. Import and Create Builder

```typescript
import { createPaymentTransactionBuilder } from '@/lib/sui/payment-transaction-builder';
import { SuiClient } from '@mysten/sui/client';

const client = new SuiClient({ url: rpcUrl });
const paymentBuilder = createPaymentTransactionBuilder(client);
```

### 2. Build Payment Transaction

```typescript
const result = await paymentBuilder.buildPaymentTransaction({
  paymentConfig: {
    playerAddress: '0x1234...',
    paymentToken: 'SUI', // or 'MEWS' or 'USDC'
    totalTokenAmount: '1000000000', // Amount with decimals (1 SUI = 1_000_000_000)
    recipientAddress: adminAddress, // Who receives the payment
    context: 'tournament creation', // For logging
  },
  customCalls: (txb, paymentCoin) => {
    // Add your contract calls here
    // paymentCoin is the prepared payment coin to use
    txb.moveCall({
      target: `${packageId}::your_module::your_function`,
      arguments: [
        // ... your arguments ...
        paymentCoin, // Pass payment coin to contract
      ],
    });
  },
});

if (result.success) {
  // Return transaction to frontend for signing
  return { transaction: result.transaction };
} else {
  // Handle error
  return { error: result.error };
}
```

---

## Examples

### Example 1: Store Purchase

```typescript
// In StoreService
async buildPurchaseTransaction(
  playerAddress: string,
  items: Array<{ itemId: string; level: number; quantity: number }>,
  paymentToken: 'SUI' | 'MEWS' | 'USDC',
  totalTokenAmount: string
) {
  const paymentBuilder = createPaymentTransactionBuilder(this.client);
  
  return await paymentBuilder.buildPaymentTransaction({
    paymentConfig: {
      playerAddress,
      paymentToken,
      totalTokenAmount,
      recipientAddress: this.adminWallet.getAddress(),
      context: 'store purchase',
    },
    customCalls: (txb, paymentCoin) => {
      // Add purchase_item calls for each item
      for (const item of items) {
        const itemPaymentCoin = txb.splitCoins(paymentCoin, [BigInt(itemPrice)]);
        
        txb.moveCall({
          target: `${packageId}::premium_store::purchase_item`,
          typeArguments: [paymentBuilder.getPaymentTokenTypeArgument(paymentToken)],
          arguments: [
            txb.object(storeObjectId),
            txb.object('0x6'), // Clock
            txb.pure.address(playerAddress),
            txb.pure.u8(itemType),
            txb.pure.u8(item.level),
            txb.pure.u64(item.quantity),
            txb.pure.u8(PaymentTransactionBuilder.getPaymentTokenU8(paymentToken)),
            txb.pure.address(this.adminWallet.getAddress()),
            itemPaymentCoin,
          ],
        });
      }
    },
  });
}
```

### Example 2: Tournament Creation

```typescript
// In TournamentService
async buildTournamentCreationTransaction(
  playerAddress: string,
  tournamentConfig: TournamentConfig,
  paymentConfig: {
    creationFeeUSDCents: number;
    startingAnteUSDCents: number;
    rewardCostUSDCents: number;
    paymentToken: 'SUI' | 'MEWS' | 'USDC';
  }
) {
  // Convert USD to tokens
  const priceConverter = getPriceConverter();
  const totalUSD = (paymentConfig.creationFeeUSDCents + 
                    paymentConfig.startingAnteUSDCents + 
                    paymentConfig.rewardCostUSDCents) / 100;
  
  const tokenConversion = await priceConverter.convertUSDToToken(
    totalUSD,
    paymentConfig.paymentToken
  );
  
  if (!tokenConversion.success || !tokenConversion.tokenAmount) {
    return { success: false, error: 'Failed to convert USD to tokens' };
  }
  
  const paymentBuilder = createPaymentTransactionBuilder(this.client);
  
  return await paymentBuilder.buildPaymentTransaction({
    paymentConfig: {
      playerAddress,
      paymentToken: paymentConfig.paymentToken,
      totalTokenAmount: tokenConversion.tokenAmount,
      recipientAddress: this.adminWallet.getAddress(),
      context: 'tournament creation',
    },
    customCalls: (txb, paymentCoin) => {
      // Split payment into components if needed
      // For now, we'll pass the full payment coin
      // The contract will handle splitting internally
      
      // Serialize reward config if provided
      const rewardConfigArg = tournamentConfig.rewardConfig
        ? serializeRewardConfig(tournamentConfig.rewardConfig)
        : null;
      
      txb.moveCall({
        target: `${packageId}::tournaments::create_tournament_for_user`,
        arguments: [
          txb.object(registryId),
          txb.pure.vector('u8', nameBytes),
          txb.pure.u8(category),
          txb.pure.u64(startTime),
          txb.pure.u64(endTime),
          txb.pure.u64(entryFeeTickets),
          rewardConfigArg ? txb.pure(/* serialized config */) : txb.pure(null),
          txb.pure.u64(startingAnteUSDCents),
          txb.pure.u64(creationFeeUSDCents),
          txb.object('0x6'), // Clock
          // Note: Payment handling depends on contract design
          // May need to split paymentCoin or pass separately
        ],
      });
    },
  });
}
```

---

## Payment Token Helpers

### Get Payment Token U8 Value

```typescript
import { PaymentTransactionBuilder } from '@/lib/sui/payment-transaction-builder';

const tokenU8 = PaymentTransactionBuilder.getPaymentTokenU8('SUI'); // Returns 0
const tokenU8 = PaymentTransactionBuilder.getPaymentTokenU8('MEWS'); // Returns 1
const tokenU8 = PaymentTransactionBuilder.getPaymentTokenU8('USDC'); // Returns 2
```

### Get Payment Token Type Argument

```typescript
const typeArg = paymentBuilder.getPaymentTokenTypeArgument('SUI');
// Returns: '0x2::sui::SUI'

const typeArg = paymentBuilder.getPaymentTokenTypeArgument('MEWS');
// Returns: MEWS token type ID from config
```

---

## What the Builder Handles

### ✅ Automatic Handling

1. **Balance Checking**
   - Validates player has enough tokens
   - Validates player has enough gas (SUI)
   - Returns clear error messages

2. **Payment Coin Preparation**
   - **SUI**: Splits from gas coin
   - **MEWS/USDC**: Gets coins, merges if needed, splits payment amount
   - Handles edge cases (single coin, multiple coins, etc.)

3. **Transaction Setup**
   - Sets sender
   - Sets gas budget
   - Transfers remaining balance back to player (prevents UnusedValueWithoutDrop errors)

### ❌ What You Need to Handle

1. **USD to Token Conversion**
   - Use `PriceConverter` service
   - Convert USD amounts to token amounts with decimals

2. **Custom Contract Calls**
   - Add your specific contract calls in `customCalls` callback
   - Use the `paymentCoin` parameter in your calls

3. **Payment Splitting** (if needed)
   - If you need to split payment into multiple parts
   - Use `txb.splitCoins(paymentCoin, [amount1, amount2, ...])`

---

## Error Handling

The builder returns clear error messages:

```typescript
{
  success: false,
  error: 'No MEWS coins found. Please ensure you have MEWS in your wallet.'
}

{
  success: false,
  error: 'Insufficient balance. Need 1.5 SUI but have 0.8 SUI.'
}

{
  success: false,
  error: 'MEWS token type ID not configured'
}
```

---

## Migration Guide

### Migrating StoreService

**Before:**
```typescript
// StoreService.buildPurchaseTransaction() - 200+ lines of payment logic
```

**After:**
```typescript
// StoreService.buildPurchaseTransaction() - ~50 lines, uses PaymentTransactionBuilder
const paymentBuilder = createPaymentTransactionBuilder(this.client);
return await paymentBuilder.buildPaymentTransaction({
  paymentConfig: { /* ... */ },
  customCalls: (txb, paymentCoin) => {
    // Just add purchase_item calls
  },
});
```

### Migrating TournamentService

**Before:**
```typescript
// Would need to duplicate all payment logic
```

**After:**
```typescript
// Uses shared PaymentTransactionBuilder
const paymentBuilder = createPaymentTransactionBuilder(this.client);
return await paymentBuilder.buildPaymentTransaction({
  paymentConfig: { /* ... */ },
  customCalls: (txb, paymentCoin) => {
    // Add create_tournament_for_user call
  },
});
```

---

## Best Practices

1. **Always check balance first** (builder does this automatically)
2. **Use PriceConverter for USD → token conversion**
3. **Pass paymentCoin to contract calls** (don't create new coins)
4. **Handle errors gracefully** (check `result.success`)
5. **Use appropriate context strings** (for logging/debugging)

---

## Testing

When testing payment transactions:

1. **Mock the client** (for unit tests)
2. **Test different payment tokens** (SUI, MEWS, USDC)
3. **Test edge cases**:
   - Insufficient balance
   - No coins found
   - Multiple coins (merge scenario)
   - Single coin (no merge needed)

---

## Summary

The `PaymentTransactionBuilder` provides:
- ✅ Consistent payment handling
- ✅ Reduced code duplication
- ✅ Better error messages
- ✅ Easier maintenance
- ✅ Reusable across all services

Use it for any service that needs to process payments!

