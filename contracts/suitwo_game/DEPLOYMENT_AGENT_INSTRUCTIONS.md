# Instructions for Contract Deployment Agent

## Quick Summary

After deploying the updated contract, you need to provide **TWO** pieces of information:

1. **Package ID** (as before)
2. **Session Registry Object ID** (NEW - created by the `init` function)

---

## What Changed?

The contract now includes:
- An `init` function that automatically creates a `SessionRegistry` shared object
- New fields in `GameSession`: `player_name` and `session_id`
- Duplicate prevention using the Session Registry

---

## Deployment Options

### Option 1: Standard Sui CLI Command (Recommended if CLI works)

If your Sui CLI is working properly:

```bash
cd contracts/suitwo_game
sui move build
sui client publish --gas-budget 50000000
```

**Output will show:**
- Package ID (in the "Published Objects" section)
- Transaction Digest

**Then extract Session Registry Object ID:**
- Use the transaction digest to view on Sui Explorer
- Look for created objects with type containing "SessionRegistry"
- Or use: `sui client object <TRANSACTION_DIGEST>` to see all created objects

### Option 2: Automated Script (If CLI has issues)

If you're having CLI config issues, use the automated script:

```bash
node contracts/suitwo_game/deploy.js
```

This script automatically extracts both IDs and displays them.

---

## What You Need to Extract

### 1. Package ID (Same as Before)
- Found in transaction output under "Published Objects"
- Or in transaction effects under `objectChanges` with type `"published"`
- Format: `0x...` (64 hex characters)

### 2. Session Registry Object ID (NEW)
- Created automatically by the `init` function when the package is published
- Found in transaction effects under `objectChanges` with type `"created"`
- Look for object type containing `"SessionRegistry"`
- Format: `0x...` (64 hex characters)
- **This is a shared object** (check `owner: { Shared: {...} }`)

---

## How to Extract Session Registry ID (Manual)

If using the standard CLI command, you'll need to manually extract the Session Registry Object ID:

### Method 1: From Transaction Digest

```bash
# Get transaction details
sui client tx <TRANSACTION_DIGEST>

# Look for created objects with type containing "SessionRegistry"
```

### Method 2: From Sui Explorer

1. Go to: https://suiexplorer.com/txblock/<TRANSACTION_DIGEST>?network=testnet
2. Look at "Object Changes" section
3. Find object with type containing `SessionRegistry`
4. Copy its Object ID

### Method 3: Query Package Objects

```bash
# After deployment, query for objects created by the package
sui client objects --package <PACKAGE_ID> | grep SessionRegistry
```

---

## How to Extract (Manual)

If you need to extract manually:

### From Transaction Effects (Recommended)

```javascript
const result = await client.signAndExecuteTransaction(...);

// Package ID
const packageId = result.effects.objectChanges.find(
  change => change.type === 'published'
)?.packageId;

// Session Registry Object ID
const registryId = result.effects.objectChanges.find(
  change => 
    change.type === 'created' && 
    change.objectType?.includes('SessionRegistry')
)?.objectId;
```

### From Sui Explorer

1. Go to the transaction on Sui Explorer
2. Look for "Object Changes" section
3. Find the object with type containing `SessionRegistry`
4. Copy its Object ID

### From CLI

```bash
# After deployment, query for objects created by the package
sui client objects --package <PACKAGE_ID> | grep SessionRegistry
```

---

## What to Provide

After deployment, provide:

```
Package ID: 0x<64_hex_chars>
Session Registry Object ID: 0x<64_hex_chars>
```

These will be added to the backend environment variables:
- `GAME_SCORE_CONTRACT_TESTNET=<Package ID>`
- `SESSION_REGISTRY_OBJECT_ID=<Registry Object ID>`

---

## Verification

To verify the deployment was successful:

1. **Check Package ID exists:**
   ```bash
   sui client object <PACKAGE_ID>
   ```

2. **Check Registry Object exists:**
   ```bash
   sui client object <REGISTRY_OBJECT_ID>
   ```
   Should return a `SessionRegistry` object.

3. **Verify it's shared:**
   The registry object should be accessible (shared object, not owned).

---

## Troubleshooting

### "Session Registry Object ID not found"
- **Cause:** The `init` function may not have executed, or the object wasn't created as expected
- **Fix:** Check the transaction effects manually. The registry should be created as a shared object.

### "Object not found" when querying registry
- **Cause:** Wrong object ID, or object wasn't created
- **Fix:** Double-check the object ID from the transaction effects

---

## Questions?

If you have any issues extracting the Session Registry Object ID, please reach out. The automated script should handle this, but manual extraction is also possible.

