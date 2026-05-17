# Milestone Migration - Current Status & Issue

## Goal
Deploy all hardcoded milestone definitions from `backend/lib/sui/achievement-service.ts` to the on-chain `AchievementRegistry` using the migration script `backend/scripts/migrate-milestones.ts`.

## Current Problem: Locked Gas Coin

### Issue
The migration script fails with "Object already locked" errors because:
- The admin wallet only has **one gas coin** (`0x5e8987f1d1a89953d239f6be8c5ae53c401b25a253fc00dd25cba64a7772fc3a`)
- This coin is locked by two pending transactions that **no longer exist** (were pruned):
  - `EoeAQ8g2GZ3hCfRWBn49NZ1nb4PuSH6VsYzSm4zqH75A` (NOT FOUND)
  - `H5ANRmHAfmwj9EtAVhdMgYpqPKEJuPirBiYqSKJQqyYc` (NOT FOUND)

### Investigation Results
- ✅ Coin exists and is owned by admin wallet: `0xccf281e7d5a183ff4b63339a4da42220f30653f46e475463e997793f80b56ea3`
- ✅ Coin version: `696136829`
- ❌ Locking transactions are **not found** (likely pruned after 1 day)
- ⚠️ Coin is still considered "locked" by the network even though transactions don't exist

## Solution

### Option 1: Add More SUI to Admin Wallet (RECOMMENDED)
**Easiest and fastest solution:**
1. Send additional SUI to the admin wallet address: `0xccf281e7d5a183ff4b63339a4da42220f30653f46e475463e997793f80b56ea3`
2. This will create new gas coins that are not locked
3. The migration script will automatically use the new unlocked coins

**How to add SUI:**
- Use Sui testnet faucet: https://discord.com/channels/916379725201563759/971488439931392130
- Or transfer from another wallet

### Option 2: Wait for Epoch Change
- Sui epochs change periodically
- An epoch change may unlock the coin
- **Not recommended** - can take hours/days

### Option 3: Use Different Gas Coin Selection
- The script already filters out the locked coin
- But there are **0 other coins available**
- Need more coins in wallet first

## Current Script Status

### What Works
- ✅ Script batches milestones by category (12 transactions total instead of 80+)
- ✅ Script filters out known locked coin
- ✅ Script selects unlocked gas coins when available
- ✅ Script provides detailed error messages

### What's Blocked
- ❌ Cannot proceed because admin wallet has no unlocked gas coins
- ❌ All attempts fail with "Object already locked" error

## Files Modified

1. **`backend/scripts/migrate-milestones.ts`** ✅ FIXED
   - ✅ Added gas coin selection logic (similar to tournament-scheduler)
   - ✅ Filters out locked coin: `0x5e8987f1d1a89953d239f6be8c5ae53c401b25a253fc00dd25cba64a7772fc3a`
   - ✅ Provides detailed diagnostics about available coins
   - ✅ Fails early with clear error if no coins available
   - ✅ **NEW**: Retry logic with exponential backoff for lock errors
   - ✅ **NEW**: Proper transaction finalization wait (fails hard if doesn't finalize)
   - ✅ **NEW**: Transaction status verification before proceeding
   - ✅ **NEW**: Concurrent execution prevention (lock file)

2. **`backend/scripts/check-transaction-status.ts`** (NEW)
   - Diagnostic script to check transaction status
   - Can be run to verify coin status

3. **`backend/scripts/unlock-coin.ts`** (NEW)
   - Comprehensive unlock diagnostic script
   - Tests multiple strategies to unlock coins
   - Provides detailed diagnostics

## Root Cause Analysis

See **`docs/MILESTONE_MIGRATION_ROOT_CAUSE.md`** for detailed analysis of why the transactions locked.

**Key Issues Fixed:**
1. ⚠️ **Transaction finalization wait was non-blocking** - Now fails hard if transaction doesn't finalize
2. ⚠️ **No retry logic for lock errors** - Now retries with exponential backoff
3. ⚠️ **Fixed wait time instead of verification** - Now verifies transaction status before proceeding
4. ⚠️ **Potential concurrent execution** - Now prevents concurrent runs with lock file

## Next Steps

1. **Add SUI to admin wallet** (recommended)
   - Address: `0xccf281e7d5a183ff4b63339a4da42220f30653f46e475463e997793f80b56ea3`
   - Amount: At least 1-2 SUI (for gas)

2. **Run migration script again:**
   ```bash
   cd backend
   npx tsx scripts/migrate-milestones.ts
   ```

3. **Expected result:**
   - Script will find new unlocked gas coins
   - Will successfully deploy all 80 milestone definitions in 12 batch transactions
   - One transaction per category (gamesPlayed, bossesPerGame, etc.)

## Contract Status

- ✅ Contract deployed with new entry functions:
  - `add_milestone_definition_entry` (for adding milestones)
  - `update_milestone_definition_entry` (for updating milestones)
- ✅ Admin API endpoints ready (`/api/admin/milestones`)
- ✅ Admin UI ready (`backend/app/admin/tabs/MilestonesTab.tsx`)
- ⏳ Waiting for milestone data to be migrated on-chain

## Configuration

- **Package ID:** `0xb2ca3fa6aadeee30171073bdc30b9847ceb3c1b431874ced439ce8039b82ef1b`
- **Registry ID:** `0x52fd32c6c634250f569d0d4b13faf753140942583f2a22517ad8a5181618d98d`
- **Admin Cap ID:** `0x846ffbdf1db33374be23930c35221688ee85d7b588e796575a9531abf18cf90c`
- **Network:** testnet
- **Admin Wallet:** `0xccf281e7d5a183ff4b63339a4da42220f30653f46e475463e997793f80b56ea3`

## Error Message Pattern

```
⚠️  No unlocked coin with sufficient balance found. Available coins: 0
❌ Batch failed: Transaction is rejected as invalid by more than 1/3 of validators by stake (non-retriable). 
Non-retriable errors: [Object (0x5e8987f1d1a89953d239f6be8c5ae53c401b25a253fc00dd25cba64a7772fc3a, SequenceNumber(696136829), ...) already locked by a different transaction: TransactionDigest(EoeAQ8g2GZ3hCfRWBn49NZ1nb4PuSH6VsYzSm4zqH75A) ...]
```

## Unlocking the Coin

### How to Unlock

Unfortunately, **there's no direct way to force-unlock a coin** that's locked by pruned transactions in Sui. However, you can try these approaches:

#### Option A: Test if Coin is Actually Unlocked (RECOMMENDED FIRST STEP)

Sometimes the network state has cleared even though the transaction was pruned. Run the unlock diagnostic script:

```bash
cd backend && npx tsx scripts/unlock-coin.ts
```

This script will:
1. ✅ Test if the coin is actually still locked (by attempting a transaction)
2. 🔧 Try to split the coin to create a new unlocked coin
3. 📅 Check epoch status (epoch changes may unlock coins)
4. 🔍 Check current coin state
5. 💰 List all available coins in the wallet

**If the coin is unlocked**, you'll see:
```
✅ Coin appears to be unlocked!
💡 You can now run the migration script
```

**If the coin is still locked**, the script will show:
```
❌ Could not unlock coin automatically
💡 Recommended Solutions:
   1. Add SUI to admin wallet to create new gas coins
```

#### Option B: Add More SUI (MOST RELIABLE)

If the coin is confirmed locked, add SUI to create new gas coins:

1. **Get SUI for admin wallet**: `0xccf281e7d5a183ff4b63339a4da42220f30653f46e475463e997793f80b56ea3`
   - Testnet faucet: https://discord.com/channels/916379725201563759/971488439931392130
   - Or transfer from another wallet

2. **Run migration** (script will auto-detect new coins):
   ```bash
   cd backend && npx tsx scripts/migrate-milestones.ts
   ```

#### Option C: Wait for Epoch Change

- Sui epochs change periodically
- An epoch change may unlock the coin
- **Not recommended** - timing is unpredictable (hours/days)

### Why Can't We Force Unlock?

In Sui, when a transaction locks a coin:
- The lock is held by the network until the transaction finalizes or expires
- If the transaction is pruned (deleted after ~1 day), the lock state may persist
- There's no direct API to force-unlock a coin
- The network must naturally clear the lock (epoch change, timeout, etc.)

## Quick Fix Command

Once you have unlocked coins (either the original coin unlocked or new coins added), run:
```bash
cd backend && npx tsx scripts/migrate-milestones.ts
```

The script will automatically:
1. Detect available gas coins
2. Select an unlocked one
3. Deploy all milestones in batches
