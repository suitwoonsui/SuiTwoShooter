# Coin Unlock Timeline & Solutions

## When Can Coins Be Unlocked?

### The Problem

The coin `0x5e8987f1d1a89953d239f6be8c5ae53c401b25a253fc00dd25cba64a7772fc3a` is locked by two transactions that were **pruned** (deleted after ~1 day). The network still considers the coin locked even though the transactions no longer exist.

### Unlock Scenarios

#### 1. **Epoch Change** (Unpredictable)
- Sui epochs change periodically (every few hours to days)
- An epoch change **may** unlock the coin
- **Timing**: Unpredictable (could be hours or days)
- **Reliability**: Not guaranteed

#### 2. **Network Timeout** (Unknown)
- Sui may have an internal timeout for locks
- **Timing**: Unknown (could be days or weeks)
- **Reliability**: Not documented

#### 3. **Manual Network Intervention** (Not Available)
- There's no API to force-unlock a coin
- Network validators would need to manually clear it
- **Not practical** for users

### Practical Solutions

#### ✅ **Solution 1: Filter Out Locked Coin** (IMMEDIATE FIX)

**Status**: ✅ **FIXED** - Tournament scheduler now filters out the locked coin

The scheduler was trying to use the locked coin even when other coins were available. Now it:
- Filters out the known locked coin ID
- Only selects from available unlocked coins
- Logs when it filters out the locked coin

**This should fix the scheduler failures immediately.**

#### ✅ **Solution 2: Add More SUI** (ALREADY DONE)

You've already added more SUI, which creates new unlocked coins. The scheduler should now:
- Find the new unlocked coins
- Filter out the locked coin
- Use the new coins for transactions

#### ⚠️ **Solution 3: Wait for Epoch Change** (Not Recommended)

- Wait for Sui epoch to change
- May unlock the coin
- **Timing**: Unpredictable (hours to days)
- **Not recommended** - use Solution 1 instead

## Current Status

### What's Fixed

1. ✅ **Tournament Scheduler**:
   - ✅ Filters out locked coin
   - ✅ Retry logic with exponential backoff
   - ✅ Transaction finalization wait
   - ✅ Transaction status verification

2. ✅ **Migration Script**:
   - ✅ Filters out locked coin
   - ✅ Retry logic with exponential backoff
   - ✅ Transaction finalization wait
   - ✅ Concurrent execution prevention

### What Should Work Now

With the fixes:
1. **Scheduler should work** - It now filters out the locked coin and uses new unlocked coins
2. **Migration script should work** - It also filters out the locked coin
3. **New coins are available** - You've added more SUI, creating new gas coins

## If Scheduler Still Fails

If the scheduler is still failing after the fix, check:

1. **Are there actually unlocked coins?**
   ```bash
   # Run the unlock-coin script to check
   cd backend && npx tsx scripts/unlock-coin.ts
   ```

2. **What's the exact error?**
   - Check scheduler logs for the specific error message
   - Is it still "already locked"?
   - Or a different error?

3. **Is the locked coin being filtered?**
   - Check scheduler logs for "Filtered out locked coin" message
   - Verify it's not selecting the locked coin

4. **Are new coins actually unlocked?**
   - New coins from faucet should have low version numbers
   - Locked coin has version `696136829` (very high)
   - Scheduler prefers low version numbers

## Testing the Fix

1. **Check coin status**:
   ```bash
   cd backend && npx tsx scripts/unlock-coin.ts
   ```

2. **Check scheduler logs**:
   - Look for "Available gas coins" log
   - Should show multiple coins (including new ones)
   - Should show "Filtered out locked coin" if locked coin is in the list
   - Should select a coin that's NOT the locked one

3. **Monitor scheduler**:
   - Watch for successful transactions
   - Check if it's using new coins (low version numbers)
   - Verify no "already locked" errors

## Summary

**The coin will likely never unlock automatically** - it's locked by pruned transactions.

**But that's okay!** The fix ensures:
- ✅ Scheduler filters out the locked coin
- ✅ Scheduler uses new unlocked coins
- ✅ Scheduler should work normally now

**If scheduler still fails**, please share:
- The exact error message
- Scheduler logs showing coin selection
- Output from `unlock-coin.ts` script
