# 🔍 Stats Migration Wallet Discovery - The Real Issue

## What the Logs Show

Looking at your logs in `docs/results.md`, I found:

1. ✅ **Stats queries work** - Using NEW package `0x93e6bcb4...` and returning `hasStats: false` (expected)
2. ✅ **Game pass migration discovery runs** - Found 0 wallets (line 4567-4569)
3. ✅ **Inventory migration discovery runs** - Found 0 wallets (line 5185)
4. ❌ **NO stats migration discovery logs** - No calls to `/api/scores/migrate` for wallet discovery!

## The Problem

You're likely using the **Stats Management Tab** instead of the **Migration Tab** for stats migration.

### Stats Management Tab (Wrong for Migration)
- Location: Admin → Stats Management tab
- Purpose: View stats in **current** contracts
- Discovery: Uses `/api/admin/stats/discover-wallets` (current contract only)
- **Does NOT query old contracts**

### Migration Tab (Correct for Migration)
- Location: Admin → Migration tab → Stats Migration sub-tab
- Purpose: Migrate stats from **old** contracts to **new** contracts
- Discovery: Uses `/api/scores/migrate?oldStatsRegistryId=...&oldPackageId=...` (old contracts)
- **Queries old contracts**

## How to Fix

### Step 1: Use the Migration Tab

1. Go to **Admin → Migration Tab**
2. Click on **Stats Migration** sub-tab
3. You'll see input fields for:
   - `Old Package ID` (optional - uses env var if empty)
   - `Old Stats Registry ID` (optional - uses env var if empty)

### Step 2: Provide Old Contract IDs

**Option A: Use Environment Variables** (Recommended)
- Make sure `OLD_GAME_SCORE_CONTRACT_TESTNET` and `OLD_STATISTICS_REGISTRY_OBJECT_ID_TESTNET` are set in `.env.local`
- Leave the input fields empty - they'll use env vars

**Option B: Enter Manually**
- Enter old package ID: `0x7c0f06e479d4e53d35e03ed24f3ab9374da5fd6e04434f3bd1c92cf9f70766e0`
- Enter old stats registry ID: `0x84dd37ba8e450bdc213fe20c4558ae8ffe342f31372e9185429783ba4df140cb`

### Step 3: Click "Discover Wallets"

Click the "Discover Wallets" button in the Stats Migration sub-tab. This will:
1. Call `/api/scores/migrate?oldStatsRegistryId=...&oldPackageId=...`
2. Query events from the old package
3. Query dynamic fields from the old stats registry
4. Return list of wallets with stats

## Why It's Not Finding Wallets

If discovery still finds 0 wallets after using the Migration tab, possible reasons:

### 1. No Events Emitted
- Old contract didn't emit `ScoreSubmitted` events
- Events were pruned (very old)
- Package ID is wrong

### 2. No Dynamic Fields
- Stats registry doesn't use dynamic fields
- Registry structure is different
- Registry ID is wrong

### 3. No Data Exists
- No players ever submitted scores to that contract
- Data is in a different deployment
- Wrong contract IDs

## Quick Test

To verify if data exists in the old contract, manually query a known wallet:

```bash
# Replace with actual wallet address
WALLET="0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0"

# Test query with old contract IDs
curl "http://localhost:3001/api/scores/migrate" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "playerAddress": "'$WALLET'",
    "oldPackageId": "0x7c0f06e479d4e53d35e03ed24f3ab9374da5fd6e04434f3bd1c92cf9f70766e0",
    "oldStatsRegistryId": "0x84dd37ba8e450bdc213fe20c4558ae8ffe342f31372e9185429783ba4df140cb"
  }'
```

If this returns stats, the data exists and discovery should work.  
If this fails, the data doesn't exist in that contract.

## Next Steps

1. ✅ **Use Migration Tab** (not Stats Management tab)
2. ✅ **Provide old contract IDs** (in fields or env vars)
3. ✅ **Click Discover Wallets** in Stats Migration sub-tab
4. ✅ **Check backend logs** for discovery attempts
5. ✅ **If still 0 wallets**, run the diagnostic script:
   ```bash
   node scripts/diagnose-wallet-discovery.js
   ```

## Summary

**The issue is likely that you're using the wrong tab!** The Stats Management tab only queries current contracts. You need to use the Migration tab → Stats Migration sub-tab to discover wallets from old contracts.

