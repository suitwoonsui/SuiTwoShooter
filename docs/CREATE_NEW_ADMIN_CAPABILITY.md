# Create New Tournament Admin Capability

## Problem

The tournament admin capability (`0x5e060087147dfb105d0b652943042325fa39aac12792d1e27fc62edb4a66ea12`) is locked by old, pruned transactions. This prevents all tournament status updates from working.

## Solution: Create New Admin Capability

**✅ Better than redeploying:** You can create a new admin capability without redeploying the entire contract package. This:
- ✅ Preserves all existing on-chain data (tournaments, badges, etc.)
- ✅ Doesn't require the old (locked) admin capability
- ✅ Only requires updating one environment variable

## Steps

### 1. Run the Script

```bash
cd contracts/suitwo_game
node create-tournament-admin-cap.js
```

The script will:
- Read your admin wallet private key from `backend/.env.local`
- Use the current package ID from environment variables
- Create a new tournament admin capability
- Output the new admin capability ID

### 2. Update Environment Variable

After the script completes, it will show you the new admin capability ID. Update `backend/.env.local`:

```env
TOURNAMENT_ADMIN_CAPABILITY_OBJECT_ID_TESTNET=<NEW_ADMIN_CAP_ID>
```

### 3. Restart Backend Server

Restart your backend server to pick up the new environment variable:

```bash
cd backend
npm run dev
```

## Why This Works

The `create_admin_capability` function in the tournaments module is a **public entry function**, meaning:
- ✅ Anyone can call it (no existing admin capability needed)
- ✅ It creates a new `AdminCapability` object
- ✅ It transfers it to the specified address
- ✅ Multiple admin capabilities can exist simultaneously

## Verification

After updating the environment variable and restarting:
1. Check logs - scheduler should no longer show "locked by old transactions" errors
2. Tournament status updates should work
3. The old locked admin capability will be ignored (we're using the new one)

## Alternative: Wait for Epoch Change

If you prefer to wait:
- Epoch changes are unpredictable (typically 1-3 days on testnet)
- An epoch change **may** unlock the old admin capability
- **Not recommended** - creating a new one is faster and more reliable

## Notes

- The old admin capability (`0x5e060087...`) will remain locked but unused
- You can have multiple admin capabilities - only the one in your config is used
- This doesn't affect any existing tournaments or data
