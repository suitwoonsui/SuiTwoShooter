# Smart Contract Deployment Notes

## Important Changes in This Update

The `score_submission.move` contract has been updated with new features that require special attention during deployment.

### New Features Added:
1. **Player Name Field** - Optional player name stored in `GameSession`
2. **Session ID Field** - Unique session ID for duplicate prevention
3. **Session Registry** - Shared object that tracks used session IDs to prevent duplicates

---

## Critical: Session Registry Object ID

### What is it?
The contract includes an `init` function that automatically creates a `SessionRegistry` shared object when the package is first published. This registry is used to prevent duplicate score submissions.

### Why is it needed?
- The backend requires the `SessionRegistry` object ID to submit scores
- Without it, score submissions will fail with: "Session registry object ID not configured"

### How to get it:
After deploying the contract, you need to extract the `SessionRegistry` object ID from the deployment transaction.

**Method 1: From Transaction Effects**
```javascript
// After deployment, check the transaction effects
const effects = result.effects;

// Look for objectChanges of type "created" with objectType containing "SessionRegistry"
const registryObject = effects.objectChanges.find(
  change => 
    change.type === 'created' && 
    change.objectType?.includes('SessionRegistry')
);

const registryObjectId = registryObject?.objectId;
```

**Method 2: From Transaction Events**
```javascript
// The init function creates a shared object, check events
const events = result.events;
// Look for events related to SessionRegistry creation
```

**Method 3: Query After Deployment**
```bash
# After deployment, query for the SessionRegistry object
sui client objects --package <PACKAGE_ID> | grep SessionRegistry
```

---

## Required Information After Deployment

Please provide the following after deployment:

1. **Package ID** (as before)
   - Format: `0x...` (64 hex characters)
   - Used in: `GAME_SCORE_CONTRACT_TESTNET` or `GAME_SCORE_CONTRACT_MAINNET`

2. **Session Registry Object ID** (NEW - CRITICAL)
   - Format: `0x...` (64 hex characters)
   - Used in: `SESSION_REGISTRY_OBJECT_ID` environment variable
   - This is the shared object created by the `init` function

---

## Updated Function Signature

The `submit_game_session_for_player` function now requires additional parameters:

**Old signature:**
```move
public entry fun submit_game_session_for_player(
    player: address,
    clock: &Clock,
    score: u64,
    distance: u64,
    coins: u64,
    bosses_defeated: u64,
    enemies_defeated: u64,
    longest_coin_streak: u64,
    ctx: &mut TxContext
)
```

**New signature:**
```move
public entry fun submit_game_session_for_player(
    registry: &mut SessionRegistry,  // NEW - Required!
    player: address,
    clock: &Clock,
    score: u64,
    distance: u64,
    coins: u64,
    bosses_defeated: u64,
    enemies_defeated: u64,
    longest_coin_streak: u64,
    player_name: vector<u8>,  // NEW - Optional (empty if skipped)
    session_id: vector<u8>,  // NEW - Required for duplicate prevention
    ctx: &mut TxContext
)
```

---

## Deployment Checklist

- [ ] Deploy the contract package
- [ ] Extract and document the Package ID
- [ ] **Extract and document the Session Registry Object ID** (from init function)
- [ ] Verify the `init` function executed successfully
- [ ] Test that the SessionRegistry object exists and is accessible
- [ ] Provide both IDs to the backend team

---

## Testing After Deployment

To verify the deployment was successful:

1. **Check that init function ran:**
   ```bash
   sui client object <SESSION_REGISTRY_OBJECT_ID>
   ```
   Should return a `SessionRegistry` object.

2. **Verify it's a shared object:**
   The object should be accessible by anyone (shared object).

3. **Test a score submission:**
   The backend will need both the package ID and registry object ID to submit scores.

---

## Environment Variables Needed

After deployment, these environment variables need to be set in the backend:

```bash
# Contract package ID (as before)
GAME_SCORE_CONTRACT_TESTNET=0x<PACKAGE_ID>

# NEW: Session registry object ID (from init function)
SESSION_REGISTRY_OBJECT_ID=0x<REGISTRY_OBJECT_ID>
```

---

## Troubleshooting

### "Session registry object ID not configured"
- **Cause:** `SESSION_REGISTRY_OBJECT_ID` environment variable is not set
- **Fix:** Set the environment variable with the registry object ID from deployment

### "Object not found" when submitting scores
- **Cause:** Wrong registry object ID, or init function didn't run
- **Fix:** Verify the object ID is correct and that the init function executed

### "Duplicate session ID" error
- **Cause:** Trying to submit the same session ID twice (this is expected behavior)
- **Fix:** This is working as intended - each session ID can only be used once

---

## Questions?

If you encounter any issues during deployment or need clarification on extracting the Session Registry object ID, please reach out to the development team.

