# Root Cause Analysis: Locked Coin Issue

## Problem Summary
Two transactions (`EoeAQ8g2GZ3hCfRWBn49NZ1nb4PuSH6VsYzSm4zqH75A` and `H5ANRmHAfmwj9EtAVhdMgYpqPKEJuPirBiYqSKJQqyYc`) locked the same gas coin, and both transactions were pruned (deleted after ~1 day), leaving the coin permanently locked.

## Root Causes Identified

### 1. **Insufficient Transaction Finalization Check** ⚠️ CRITICAL

**Location**: `backend/scripts/migrate-milestones.ts` lines 362-372

**Issue**: The script calls `waitForTransaction()` but if it fails, it just logs a warning and continues to the next transaction:

```typescript
try {
  await client.waitForTransaction({
    digest: result.digest,
    options: { showEffects: true },
  });
} catch (waitError) {
  console.warn(`⚠️  Warning: Could not wait for transaction...`);
  // Script continues anyway!
}
```

**Problem**: If the wait fails (network issue, timeout, etc.), the script proceeds to the next transaction **before the previous one finalized**. This can cause:
- The next transaction to use the same coin (still locked by the previous transaction)
- Both transactions to lock the same coin
- Transaction failures and stuck locks

**Fix Needed**: 
- Make `waitForTransaction` failure a hard error (don't continue)
- Add retry logic for the wait
- Verify transaction status before proceeding

### 2. **Fixed Wait Time Instead of Verification** ⚠️ HIGH

**Location**: `backend/scripts/migrate-milestones.ts` lines 673-680

**Issue**: The script waits a fixed 3-5 seconds between transactions, but doesn't verify the previous transaction actually finalized:

```typescript
if (result.success) {
  console.log(`⏳ Waiting 3 seconds before next category...`);
  await new Promise(resolve => setTimeout(resolve, 3000));
  // No verification that transaction actually finalized!
}
```

**Problem**: 
- 3 seconds might not be enough for transaction finalization
- Network conditions can vary
- No guarantee the coin is unlocked before next transaction

**Fix Needed**:
- Wait for transaction finalization, not just a fixed time
- Verify transaction status before proceeding
- Use exponential backoff if needed

### 3. **No Retry Logic for Lock Errors** ⚠️ MEDIUM

**Location**: `backend/scripts/migrate-milestones.ts` lines 345-360

**Issue**: When a transaction fails with "already locked" error, the script immediately fails. Compare to `store-service.ts` which has retry logic:

```typescript
// Migration script - NO RETRY
if (errorMsg.includes('already locked')) {
  return { success: false, error: `Transaction failed: ${errorMsg}` };
}

// Store service - HAS RETRY with exponential backoff
if (isLockError && retries > 1) {
  const waitTime = Math.pow(2, 3 - retries) * 500;
  await new Promise(resolve => setTimeout(resolve, waitTime));
  retries--;
  continue;
}
```

**Problem**: 
- Lock errors are often transient (coin unlocks after a few seconds)
- No retry means permanent failure even if coin would unlock

**Fix Needed**: Add retry logic with exponential backoff for lock errors

### 4. **Potential Concurrent Execution** ⚠️ MEDIUM

**Issue**: If the migration script was run twice simultaneously (or if someone manually submitted transactions), both would try to use the same coin.

**Indicators**:
- Two transactions locked the same coin
- Both transactions were pruned (suggesting they were submitted around the same time)
- No mechanism to prevent concurrent execution

**Fix Needed**:
- Add a lock file or process check to prevent concurrent runs
- Or use a transaction queue (like tournament-scheduler does)

### 5. **Stale Coin Version** ⚠️ LOW

**Location**: `backend/scripts/migrate-milestones.ts` lines 307-311

**Issue**: The script uses `selectedCoin.version` and `selectedCoin.digest` which might be stale:

```typescript
txb.setGasPayment([{
  objectId: selectedCoin.coinObjectId,
  version: selectedCoin.version,  // Might be stale
  digest: selectedCoin.digest,     // Might be stale
}]);
```

**Problem**: Between coin selection and transaction building, the coin version might have changed.

**Fix Needed**: 
- The SDK should handle this, but we could refresh coin state right before building
- Or let the SDK auto-select (remove manual selection)

## Recommended Fixes

### Priority 1: Fix Transaction Finalization Wait

```typescript
// Wait for transaction to be finalized - FAIL HARD if it doesn't
try {
  await client.waitForTransaction({
    digest: result.digest,
    options: { showEffects: true },
    timeout: 60_000, // 60 second timeout
  });
  console.log(`✅ Transaction ${result.digest} finalized`);
} catch (waitError) {
  // This is a CRITICAL error - don't continue!
  throw new Error(
    `Transaction ${result.digest} did not finalize: ${waitError instanceof Error ? waitError.message : 'Unknown error'}. ` +
    `Cannot proceed to next transaction as coin may still be locked.`
  );
}
```

### Priority 2: Verify Transaction Status Before Next Transaction

```typescript
// After waiting, verify transaction actually succeeded
const txStatus = await client.getTransactionBlock({
  digest: result.digest,
  options: { showEffects: true },
});

if (txStatus.effects?.status?.status !== 'success') {
  throw new Error(`Transaction ${result.digest} did not succeed. Cannot proceed.`);
}

// Verify coin is unlocked by checking its state
// (or just ensure we wait long enough)
```

### Priority 3: Add Retry Logic for Lock Errors

```typescript
let retries = 3;
while (retries > 0) {
  try {
    const result = await client.signAndExecuteTransaction(...);
    
    if (result.effects?.status?.status === 'success') {
      break; // Success!
    }
    
    const errorMsg = result.effects?.status?.error || 'Unknown error';
    if (errorMsg.includes('already locked') && retries > 1) {
      const waitTime = Math.pow(2, 3 - retries) * 1000; // 1s, 2s, 4s
      console.log(`⚠️  Coin locked, waiting ${waitTime}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      retries--;
      continue;
    }
    
    // Other error or out of retries
    throw new Error(errorMsg);
  } catch (error) {
    // Handle error
  }
}
```

### Priority 4: Prevent Concurrent Execution

```typescript
import * as fs from 'fs';
import * as path from 'path';

const LOCK_FILE = path.join(__dirname, '.migration-lock');

// At start of script
if (fs.existsSync(LOCK_FILE)) {
  const lockTime = fs.statSync(LOCK_FILE).mtime;
  const age = Date.now() - lockTime.getTime();
  
  if (age < 60 * 60 * 1000) { // 1 hour
    throw new Error('Migration already running (lock file exists). If previous run crashed, delete .migration-lock file.');
  } else {
    console.warn('Stale lock file found, removing...');
    fs.unlinkSync(LOCK_FILE);
  }
}

// Create lock file
fs.writeFileSync(LOCK_FILE, process.pid.toString());

// At end of script (or in finally block)
try {
  if (fs.existsSync(LOCK_FILE)) {
    fs.unlinkSync(LOCK_FILE);
  }
} catch (error) {
  // Ignore cleanup errors
}
```

## Comparison with Working Code

The `tournament-scheduler.ts` handles this better:
- Uses a **transaction queue** to serialize operations
- Has a **10 second delay** between transactions (`TX_STAGGER_DELAY_MS = 10_000`)
- Processes transactions **sequentially** (one at a time)
- Has proper error handling

The migration script should adopt similar patterns.

## Action Items

1. ✅ **Immediate**: Fix transaction finalization wait (fail hard if it doesn't finalize)
2. ✅ **Immediate**: Add retry logic for lock errors
3. ✅ **High Priority**: Verify transaction status before proceeding
4. ✅ **Medium Priority**: Add concurrent execution prevention
5. ✅ **Low Priority**: Consider using a transaction queue pattern

## Testing Recommendations

After fixes:
1. Test with a single transaction to ensure it waits properly
2. Test with multiple transactions to ensure sequential execution
3. Test with network delays to ensure retry logic works
4. Test concurrent execution prevention
5. Test with insufficient gas to ensure proper error handling
