# 🔍 Wallet Discovery Issue - No Wallets Found

## Problem

The migration tool reports "no wallets with data in the old contract" even when:
1. You know players have stats/data
2. You're using the correct old contract IDs
3. You've tried using old .env variables as current contract

## How Wallet Discovery Works

The wallet discovery uses two methods:

### Method 1: Query Events (Primary)
- Queries `ScoreSubmitted` events from the old package
- Extracts unique player addresses from events
- **Requires**: Events must have been emitted when scores were submitted

### Method 2: Dynamic Fields (Fallback)
- Gets dynamic fields from the old stats registry
- Extracts wallet addresses from field names
- **Requires**: Stats registry must use dynamic fields for player data

## Why Discovery Might Fail

1. **No Events Emitted**: If the old contract didn't emit `ScoreSubmitted` events, Method 1 fails
2. **Wrong Package ID**: If using wrong package ID, events won't be found
3. **Different Table Structure**: If stats registry doesn't use dynamic fields, Method 2 fails
4. **No Data Exists**: If no players ever submitted scores to that contract, there's nothing to find
5. **Events Pruned**: Very old events might have been pruned from the network

## How to Diagnose

### Step 1: Run the Diagnostic Script

```bash
cd backend
node scripts/diagnose-wallet-discovery.js
```

This will check:
- ✅ If old stats registry exists
- ✅ If dynamic fields exist
- ✅ If events exist
- ✅ If a specific wallet has stats

### Step 2: Test with a Known Wallet

If you know a wallet address that should have stats:

```bash
node scripts/diagnose-wallet-discovery.js 0x<wallet_address>
```

This will verify:
- ✅ If that wallet has stats in the old contract
- ✅ If the contract is accessible
- ✅ If the query function works

### Step 3: Check Backend Logs

Look for these log messages:
- `Found X events` - Should show event count
- `Found X wallets with stats (from events)` - Should show discovered wallets
- `Event-based discovery failed` - Indicates events don't exist
- `Dynamic field discovery also failed` - Indicates no dynamic fields

## Solutions

### Solution 1: Manual Migration (If Discovery Fails)

If automatic discovery doesn't work, you can manually migrate:

1. **Single Mode**: Enter wallet addresses one by one
2. **Batch Mode**: Provide a list of wallet addresses
3. **Use Known Wallets**: If you have a list of players, use that

### Solution 2: Fix Event Query

If events exist but aren't being found:

1. **Check Package ID**: Verify the old package ID is correct
2. **Check Event Name**: Verify events are named `ScoreSubmitted`
3. **Check Module**: Verify module is `score_submission`
4. **Increase Limit**: Events query has a limit (currently 1000)

### Solution 3: Use Dynamic Fields Directly

If dynamic fields exist but aren't being discovered:

1. **Check Registry Structure**: Verify stats registry uses dynamic fields
2. **Check Field Type**: Verify fields use `address` type
3. **Manual Query**: Query dynamic fields directly using Sui Explorer

### Solution 4: Verify Data Actually Exists

If no data exists in old contracts:

1. **Check Transaction History**: Look for score submission transactions
2. **Check Sui Explorer**: Verify objects exist on-chain
3. **Check Different Package**: Data might be in a different deployment

## Common Issues

### Issue: "No events found"
**Cause**: Events weren't emitted or package ID is wrong  
**Fix**: 
- Verify package ID on Sui Explorer
- Check if events exist: https://suiexplorer.com/object/{package_id}?network=testnet
- Use manual migration instead

### Issue: "No dynamic fields found"
**Cause**: Stats registry doesn't use dynamic fields or is empty  
**Fix**:
- Check registry structure on Sui Explorer
- Verify stats registry ID is correct
- Use event-based discovery instead

### Issue: "Both methods failed"
**Cause**: No data exists or contract structure is different  
**Fix**:
- Verify data exists by querying a known wallet
- Check if you're using the correct old contract IDs
- Consider that data might not exist in that contract

## Quick Test

To quickly test if a wallet has stats in the old contract:

```bash
# Replace with actual wallet address
WALLET="0x..."

# Test query
curl "http://localhost:3001/api/stats/${WALLET}?oldPackageId=OLD_PACKAGE_ID&oldStatsRegistryId=OLD_STATS_REGISTRY_ID"
```

If this returns stats, the data exists and the issue is with discovery.  
If this returns no stats, the data doesn't exist in that contract.

## Next Steps

1. **Run diagnostic script** to identify the specific issue
2. **Test with known wallet** to verify data exists
3. **Check backend logs** for detailed error messages
4. **Use manual migration** if automatic discovery fails
5. **Verify contract IDs** are correct for the deployment with data

