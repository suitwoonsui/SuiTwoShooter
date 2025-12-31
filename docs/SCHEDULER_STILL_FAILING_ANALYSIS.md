# Scheduler Still Failing - Analysis

## Current Situation

Even after adding more SUI and applying fixes, the scheduler is still failing with coin lock errors.

## Log Analysis

### Key Findings from Logs

1. **504 Gateway Timeout Error** (Line 410):
   ```
   "error": "Failed to set distribution status after 0 retries: Unexpected status code: 504"
   ```
   - This is a **gateway timeout** from the RPC node
   - The transaction **may have been submitted** but the response timed out
   - The coin gets locked even though we didn't get a response

2. **New Transaction Locking Coin**:
   - Coin `0x059b1843...` is locked by transaction `EqHnSodJoCNoNcY87AXzbgL4fYPnb7D6UhGPp786ovNU`
   - This is a **NEW transaction**, not one of the original stuck ones
   - Suggests the scheduler is submitting transactions that aren't finalizing

3. **Missing Log Messages**:
   - No "Filtered out locked coin" message
   - No "Waiting for transaction to finalize..." message
   - **This suggests the server hasn't been restarted** to pick up the code changes

4. **Locked Coin Still in List**:
   - Logs show `0x5e8987f1...` (locked coin) in the available coins list
   - Should be filtered out but isn't appearing in logs

## Root Causes

### 1. **504 Gateway Timeout** ⚠️ NEW ISSUE

**Problem**: When the RPC node times out (504), we don't know if:
- The transaction was submitted (coin is locked)
- The transaction wasn't submitted (coin is not locked)

**Impact**: 
- If transaction was submitted, coin stays locked
- Next attempt tries to use same coin → fails
- Creates a new locked coin situation

**Solution**: 
- Handle 504 errors specially
- Wait longer (5 seconds) to allow transaction to process
- Refresh coin selection and use a different coin
- Check if transaction was actually submitted

### 2. **Server Not Restarted** ⚠️ LIKELY

**Problem**: Code changes aren't active because server hasn't restarted.

**Evidence**:
- No "Filtered out locked coin" log message
- No "Waiting for transaction to finalize..." log message
- Locked coin still appears in available coins list

**Solution**: **RESTART THE SERVER** to pick up code changes.

### 3. **Transaction Not Finalizing** ⚠️ ONGOING

**Problem**: Even with fixes, transactions might not be finalizing before next one starts.

**Evidence**:
- New transaction `EqHnSodJoCNoNcY87AXzbgL4fYPnb7D6UhGPp786ovNU` is locking coins
- Scheduler processes multiple tournaments in queue quickly

**Solution**: 
- Ensure finalization wait is working
- Increase delay between queue items if needed

## Immediate Actions Required

### 1. **RESTART THE SERVER** (CRITICAL)

The code changes are not active. You need to:
```bash
# Stop the server
# Then restart it
npm run dev
# or
npm start
```

After restart, you should see:
- "Filtered out locked coin" messages in logs
- "Waiting for transaction to finalize..." messages
- Locked coin excluded from available coins

### 2. **Check for Pending Transactions**

The new transaction `EqHnSodJoCNoNcY87AXzbgL4fYPnb7D6UhGPp786ovNU` might still be pending. Check:
```bash
# Check transaction status
cd backend && npx tsx scripts/check-transaction-status.ts
```

Or check on Sui Explorer:
https://suiexplorer.com/txblock/EqHnSodJoCNoNcY87AXzbgL4fYPnb7D6UhGPp786ovNU?network=testnet

### 3. **Wait for Transactions to Finalize**

If transactions are still pending:
- Wait 1-2 minutes for them to finalize
- Then the coins should unlock
- Scheduler should work after that

## When Coins Will Unlock

### Original Locked Coin (`0x5e8987f1...`)
- **Will likely NEVER unlock** - locked by pruned transactions
- **Solution**: Filter it out (already in code, needs server restart)

### New Locked Coin (`0x059b1843...`)
- **Will unlock** when transaction `EqHnSodJoCNoNcY87AXzbgL4fYPnb7D6UhGPp786ovNU` finalizes
- **Timing**: Usually 1-60 seconds after submission
- **If it doesn't finalize**: May need to wait for epoch change or network timeout

## Fixes Applied

1. ✅ **Filter out locked coin** - Code is in place, needs server restart
2. ✅ **Retry logic with backoff** - Code is in place, needs server restart
3. ✅ **Transaction finalization wait** - Code is in place, needs server restart
4. ✅ **504 timeout handling** - Just added, needs server restart

## Next Steps

1. **RESTART SERVER** - This is critical to activate the fixes
2. **Wait 2-3 minutes** - Allow any pending transactions to finalize
3. **Check coin status**:
   ```bash
   cd backend && npx tsx scripts/check-scheduler-coins.ts
   ```
4. **Monitor scheduler logs** - Should see:
   - "Filtered out locked coin" messages
   - "Waiting for transaction to finalize..." messages
   - Successful transactions

## Expected Behavior After Restart

1. Scheduler filters out locked coin `0x5e8987f1...`
2. Scheduler selects from available unlocked coins
3. Scheduler waits for transaction finalization
4. Scheduler verifies transaction succeeded
5. Next tournament uses a different coin (or waits for previous to unlock)

If it still fails after restart, the issue is likely:
- Network/RPC issues (504 timeouts)
- Multiple scheduler instances running concurrently
- Transactions taking longer than expected to finalize
