# Why User Operations Don't Have Coin Lock Issues

## Key Insight

User-facing operations (store purchases, inventory changes) **don't have coin lock issues** because they work fundamentally differently than admin batch operations (scheduler, migration script).

## Three Types of Operations

### 1. **Client-Side User Operations** ✅ No Coin Lock Issues

**Examples**: Store purchases (`buildPurchaseTransaction`)

**How they work**:
```typescript
// Store service builds transaction
async buildPurchaseTransaction(...) {
  const txb = new Transaction();
  // ... build transaction ...
  
  // ✅ Returns SERIALIZED transaction to player
  return {
    success: true,
    transaction: transactionBytes, // Base64 encoded
  };
}
```

**Key characteristics**:
- ✅ Transaction is **built server-side** but **executed client-side**
- ✅ Player signs transaction with **their own wallet**
- ✅ Uses **player's gas coins**, not admin coins
- ✅ Each player has their own coins (no contention)
- ✅ No server-side execution = no server coin lock issues

**Why no locks**:
- Each player uses their own wallet/coins
- No shared resource (admin wallet) being contended
- Transaction execution happens on client, not server

### 2. **Server-Side Admin Operations (Single)** ⚠️ Some Issues

**Examples**: Item consumption (`consumeItems`), milestone claiming

**How they work**:
```typescript
// Achievement service or store service
async consumeItems(...) {
  const txb = new Transaction();
  // ... build transaction ...
  
  // ✅ HAS retry logic with exponential backoff
  let retries = 3;
  while (retries > 0) {
    try {
      result = await client.signAndExecuteTransaction(...);
      if (result.effects?.status?.status === 'success') {
        break;
      }
      // Retry on lock errors
      if (errorMsg.includes('already locked') && retries > 1) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
        retries--;
        continue;
      }
    } catch (error) { ... }
  }
  
  // ❌ BUT: No waitForTransaction() call!
  // ❌ Transaction might not be finalized when function returns
}
```

**Key characteristics**:
- ✅ Executed **server-side** using admin wallet
- ✅ **HAS retry logic** for lock errors (in some cases)
- ❌ **NO transaction finalization wait**
- ⚠️ Usually single operations (not batches)
- ⚠️ Less likely to cause issues because:
  - Operations are infrequent (user-triggered)
  - Not processing multiple in sequence
  - Retry logic handles transient locks

**Why less problematic**:
- Single operations, not batches
- Retry logic handles transient issues
- But still vulnerable if multiple operations happen simultaneously

### 3. **Server-Side Admin Batch Operations** ❌ Coin Lock Issues

**Examples**: Tournament scheduler (`setDistributionStatusBatch`), migration script

**How they work** (BEFORE fixes):
```typescript
// Tournament scheduler or migration script
async setDistributionStatusBatch(...) {
  const txb = new Transaction();
  // ... build transaction ...
  
  result = await client.signAndExecuteTransaction(...);
  
  if (result.effects?.status?.status !== 'success') {
    throw new Error(...);
  }
  
  // ❌ NO retry logic
  // ❌ NO waitForTransaction() call
  // ❌ Function returns immediately
  // ❌ Coin still locked!
}

// Then processes next item in queue...
// Next transaction tries to use same coin → FAILS
```

**Key characteristics**:
- ❌ Executed **server-side** using admin wallet
- ❌ **NO retry logic** for lock errors
- ❌ **NO transaction finalization wait**
- ❌ Processes **multiple transactions in sequence**
- ❌ All use the **same admin wallet/coins**

**Why they have issues**:
1. **Batch processing**: Multiple transactions in quick succession
2. **Shared resource**: All use same admin wallet coins
3. **No finalization wait**: Coin stays locked after transaction
4. **No retry logic**: Fails immediately on lock errors
5. **Race conditions**: Next transaction starts before previous finalizes

## Comparison Table

| Operation Type | Execution | Gas Source | Retry Logic | Finalization Wait | Coin Lock Risk |
|---------------|-----------|------------|-------------|-------------------|----------------|
| **User purchases** | Client-side | Player wallet | N/A | N/A | ✅ None |
| **Single admin ops** | Server-side | Admin wallet | ✅ Yes (some) | ❌ No | ⚠️ Low |
| **Batch admin ops** | Server-side | Admin wallet | ❌ No | ❌ No | ❌ **High** |

## Why User Operations Are Safe

### 1. **Different Gas Source**
- User operations: Each player uses their own wallet/coins
- Admin operations: All use the same admin wallet/coins

### 2. **Different Execution Location**
- User operations: Executed on client (player's device)
- Admin operations: Executed on server (shared resource)

### 3. **Different Frequency**
- User operations: Triggered by individual users, spread out
- Admin operations: Batch processing, multiple in sequence

### 4. **Different Contention**
- User operations: No contention (each player has own coins)
- Admin operations: High contention (all share same coins)

## The Real Problem

The issue isn't with **all** server-side operations - it's specifically with:
1. **Batch operations** that process multiple transactions
2. **Operations without finalization wait**
3. **Operations without retry logic**

Single admin operations (like `consumeItems`) have retry logic, which helps, but they still don't wait for finalization. They're just less likely to cause issues because:
- They're not processing batches
- They're user-triggered (less frequent)
- Retry logic handles transient locks

## Solution

All server-side admin operations should:
1. ✅ **Wait for transaction finalization** (fail hard if doesn't finalize)
2. ✅ **Have retry logic** with exponential backoff for lock errors
3. ✅ **Verify transaction status** before proceeding

This is what we fixed in:
- ✅ Migration script
- ✅ Tournament scheduler
- ⚠️ Other admin operations (like `consumeItems`, `addCreditsToPlayer`) still need finalization wait

## Summary

**User operations don't lock coins because:**
- They execute client-side with player's wallet
- Each player has their own coins (no shared resource)
- No server-side batch processing

**Admin batch operations lock coins because:**
- They execute server-side with shared admin wallet
- Multiple transactions use the same coins
- No finalization wait = coins stay locked
- No retry logic = fails immediately

The fix is to add finalization wait and retry logic to all server-side admin operations, especially batch operations.
