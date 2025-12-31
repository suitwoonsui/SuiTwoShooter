# 🔍 Improved Logging for Wallet Discovery

## What I Changed

I've added enhanced logging to the stats migration wallet discovery to help diagnose why it's not finding wallets. The improvements include:

1. **Package ID Cleaning**: Automatically strips any `::module::function` suffix from package IDs
2. **Detailed Error Logging**: Logs full error messages and stack traces
3. **Step-by-Step Logging**: Logs each step of the discovery process
4. **Better Error Messages**: More descriptive error messages that include both event and dynamic field errors

## What to Check Now

### Step 1: Try Discovery Again

Go to **Admin → Migration Tab → Stats Migration** and click "Discover Wallets". 

### Step 2: Check Backend Logs

Look for these new log messages:

**Success Case:**
```
[STATS MIGRATION] Attempting to discover wallets with stats from old registry
  oldPackageId: 0x...
  oldStatsRegistryId: 0x...
  network: testnet

[STATS MIGRATION] Querying events
  cleanPackageId: 0x...
  originalPackageId: 0x...
  module: score_submission

[STATS MIGRATION] Found X events from old package
  eventCount: X
  packageId: 0x...

[STATS MIGRATION] Found X unique wallets with stats (from events)
```

**Failure Case:**
```
[STATS MIGRATION] Attempting to discover wallets with stats from old registry
  oldPackageId: 0x...
  oldStatsRegistryId: 0x...
  network: testnet

[STATS MIGRATION] Querying events
  cleanPackageId: 0x...
  originalPackageId: 0x...
  module: score_submission

[STATS MIGRATION WARN] Event-based discovery failed, trying alternative method
  error: <error message>
  errorStack: <stack trace>
  oldPackageId: 0x...
  cleanPackageId: 0x...

[STATS MIGRATION] Trying dynamic fields discovery
  oldStatsRegistryId: 0x...

[STATS MIGRATION] Found X dynamic fields in stats registry
  fieldCount: X
  registryId: 0x...

OR

[STATS MIGRATION WARN] Dynamic field discovery also failed
  error: <error message>
  errorStack: <stack trace>
  oldStatsRegistryId: 0x...

[STATS MIGRATION ERROR] Both discovery methods failed
  oldPackageId: 0x...
  oldStatsRegistryId: 0x...
  eventError: <error message>
  dynamicFieldError: <error message>
```

## What the Logs Will Tell You

### If Events Query Fails:
- **Error message** will tell you why (package not found, network error, etc.)
- **Stack trace** will show where it failed
- **Package ID** will show what was used (cleaned version)

### If Dynamic Fields Query Fails:
- **Error message** will tell you why (registry not found, permission error, etc.)
- **Stack trace** will show where it failed
- **Registry ID** will show what was used

### If Both Fail:
- You'll see both error messages
- This will help identify if it's:
  - Wrong package/registry IDs
  - Network issues
  - Permission issues
  - Data doesn't exist

## Common Issues to Look For

1. **"Package not found"** → Wrong package ID in OLD_GAME_SCORE_CONTRACT_TESTNET
2. **"Registry not found"** → Wrong registry ID in OLD_STATISTICS_REGISTRY_OBJECT_ID_TESTNET
3. **"Network error"** → RPC endpoint issue
4. **"0 events found"** → No events emitted or events pruned
5. **"0 dynamic fields found"** → Registry structure different or empty

## Next Steps

1. **Run discovery** in the Migration tab
2. **Copy the full log output** from your backend console
3. **Share the logs** so we can see exactly what's failing
4. **Check the error messages** - they'll tell us what's wrong

The enhanced logging should now show us exactly where and why the discovery is failing!

