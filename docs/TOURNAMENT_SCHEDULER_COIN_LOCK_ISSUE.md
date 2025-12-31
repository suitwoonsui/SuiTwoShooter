# Tournament Scheduler Coin Lock Issue

## Problem Summary
The tournament scheduler's `setDistributionStatusBatch` function has the **same critical issues** as the migration script that caused coin locks. When the scheduler tries to update tournament distribution status (e.g., setting to "no participants"), it can lock the admin wallet's gas coin.

## Root Cause

The `setDistributionStatusBatch` function in `backend/lib/services/tournament-scheduler.ts` has these issues:

### 1. **No Transaction Finalization Wait** ⚠️ CRITICAL

**Location**: `backend/lib/services/tournament-scheduler.ts` lines 628-642

**Issue**: The function executes the transaction but **doesn't wait for it to finalize**:

```typescript
const result = await client.signAndExecuteTransaction({
  signer: adminWallet.getKeypair(),
  transaction: txb,
  options: { showEffects: true },
});

if (result.effects?.status?.status !== 'success') {
  throw new Error(`Failed to set distribution status: ${result.effects?.status?.error}`);
}

// ❌ NO waitForTransaction() call!
// ❌ Function returns immediately
```

**Problem**: 
- The transaction is submitted but not finalized
- The coin remains locked by the transaction
- If another transaction (scheduler or migration) tries to use the same coin, it fails
- If the transaction is pruned before finalizing, the coin stays locked forever

### 2. **No Retry Logic for Lock Errors** ⚠️ HIGH

**Issue**: If a transaction fails with "already locked" error, the scheduler just throws an error. There's no retry logic with exponential backoff.

**Problem**:
- Lock errors are often transient (coin unlocks after a few seconds)
- No retry means permanent failure even if coin would unlock
- This causes tournaments to fail distribution status updates

### 3. **Fixed Delay Instead of Verification** ⚠️ MEDIUM

**Location**: `backend/lib/services/tournament-scheduler.ts` lines 108-114

**Issue**: The queue processor waits a fixed 10 seconds between transactions:

```typescript
// Wait before processing next item to ensure object locks are released
if (processingQueue.length > 0) {
  await new Promise(resolve => setTimeout(resolve, TX_STAGGER_DELAY_MS)); // 10 seconds
  // ❌ No verification that previous transaction finalized!
}
```

**Problem**:
- 10 seconds might not be enough for transaction finalization
- Network conditions can vary
- No guarantee the coin is unlocked before next transaction
- Multiple tournaments in queue could all try to use the same coin

## Evidence

User observation:
- When scheduler tries to change reward deployment status, transactions get locked
- Only one transaction showed a status change to "no participants"
- After adding SUI, another lock happened with another status change to "no participants"

This matches the pattern:
1. Scheduler calls `setDistributionStatusBatch` to set status to `DISTRIBUTION_NO_PARTICIPANTS` (status = 2)
2. Transaction is submitted but not finalized
3. Coin remains locked
4. Next tournament in queue tries to use the same coin → fails
5. If transaction is pruned, coin stays locked forever

## Impact

- **Tournament distribution status updates fail** - Tournaments can't be marked as "no participants" or "completed"
- **Coin locks** - Admin wallet gas coin gets locked, blocking all future transactions
- **Cascading failures** - Migration script and other services can't use the locked coin
- **Data inconsistency** - Tournament status doesn't match on-chain state

## Fixes Needed

### Priority 1: Add Transaction Finalization Wait

```typescript
const result = await client.signAndExecuteTransaction({
  signer: adminWallet.getKeypair(),
  transaction: txb,
  options: { showEffects: true },
});

if (result.effects?.status?.status !== 'success') {
  throw new Error(`Failed to set distribution status: ${result.effects?.status?.error}`);
}

// ✅ CRITICAL: Wait for transaction to finalize
try {
  await client.waitForTransaction({
    digest: result.digest,
    options: { showEffects: true },
    timeout: 60_000, // 60 second timeout
  });
  
  // Verify transaction actually succeeded
  const txStatus = await client.getTransactionBlock({
    digest: result.digest,
    options: { showEffects: true },
  });
  
  if (txStatus.effects?.status?.status !== 'success') {
    throw new Error(`Transaction ${result.digest} did not succeed: ${txStatus.effects?.status?.error || 'Unknown error'}`);
  }
  
  SchedulerLogger.info('⏰ Transaction finalized and verified', {
    digest: result.digest,
  });
} catch (waitError) {
  // This is a CRITICAL error - don't continue!
  throw new Error(
    `Transaction ${result.digest} did not finalize: ${waitError instanceof Error ? waitError.message : 'Unknown error'}. ` +
    `Cannot proceed as coin may still be locked.`
  );
}
```

### Priority 2: Add Retry Logic for Lock Errors

```typescript
let retries = 3;
let result: any = null;
let lastError: any = null;

while (retries > 0) {
  try {
    // ... build transaction ...
    
    result = await client.signAndExecuteTransaction({
      signer: adminWallet.getKeypair(),
      transaction: txb,
      options: { showEffects: true },
    });
    
    if (result.effects?.status?.status === 'success') {
      break; // Success!
    }
    
    const errorMsg = result.effects?.status?.error || 'Unknown error';
    
    // Check if it's an "already locked" error - retry with backoff
    if (errorMsg.includes('already locked') && retries > 1) {
      const waitTime = Math.pow(2, 3 - retries) * 1000; // 1s, 2s, 4s
      SchedulerLogger.warn(`⏰ Coin locked, waiting ${waitTime}ms before retry (${retries - 1} attempts remaining)...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      // Refresh coin selection before retry
      const freshCoins = await client.getCoins({
        owner: adminWallet.getAddress(),
        coinType: '0x2::sui::SUI',
      });
      // ... reselect coin ...
      
      retries--;
      continue;
    }
    
    // Other error or out of retries
    lastError = errorMsg;
    break;
  } catch (error) {
    // Handle error
  }
}
```

### Priority 3: Verify Transaction Status in Queue Processor

```typescript
// After processing a tournament, verify transaction finalized before next
try {
  await this.distributeRewards(item.tournamentId, item.objectId);
  
  // ✅ Wait for any pending transactions to finalize
  // (distributeRewards should handle this, but add safety check)
} catch (error) {
  // Handle error
}

// Wait before processing next item - but also verify previous transaction finalized
if (processingQueue.length > 0) {
  SchedulerLogger.debug('⏰ Waiting before processing next tournament', {
    delayMs: TX_STAGGER_DELAY_MS,
  });
  await new Promise(resolve => setTimeout(resolve, TX_STAGGER_DELAY_MS));
  
  // ✅ Could add verification here that previous transaction finalized
}
```

## Comparison with Migration Script Fixes

The migration script had the same issues and we fixed them:
- ✅ Added transaction finalization wait (fails hard if doesn't finalize)
- ✅ Added retry logic with exponential backoff
- ✅ Added transaction status verification
- ✅ Added concurrent execution prevention

The tournament scheduler needs the **same fixes**.

## Action Items

1. ✅ **Immediate**: Add transaction finalization wait to `setDistributionStatusBatch`
2. ✅ **Immediate**: Add retry logic for lock errors
3. ✅ **High Priority**: Verify transaction status before proceeding in queue
4. ✅ **Medium Priority**: Consider refreshing coin selection between retries

## Testing

After fixes:
1. Test scheduler with multiple tournaments in queue
2. Test with network delays to ensure retry logic works
3. Test concurrent scheduler + migration script execution
4. Monitor for coin locks in production
