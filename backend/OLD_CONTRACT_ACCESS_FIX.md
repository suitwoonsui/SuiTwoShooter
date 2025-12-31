# 🔧 Old Contract Access Issue - Fixed

## Problem Summary

The backend couldn't access old smart contracts to fetch data for migration because:

1. **Wrong Package IDs in DEPLOYMENT_IDS.md**: The `.env` section had outdated package IDs
   - Current package was listed as: `0x7c0f06e479d4e53d35e03ed24f3ab9374da5fd6e04434f3bd1c92cf9f70766e0` (actually the OLD package)
   - Should be: `0x93e6bcb4da6728f47e0006eb3acc0016aae21f6d25cf6f80d5476d176413c352` (actual current package)

2. **Wrong Object IDs**: The object IDs in the `.env` section were from the previous deployment, not the current one

3. **Backend Configuration Mismatch**: If the backend was using the values from DEPLOYMENT_IDS.md, it would be trying to access contracts with the wrong package IDs

## What Was Fixed

✅ **Updated DEPLOYMENT_IDS.md** with correct package IDs:
- **Current Package (2025-12-23)**: `0x93e6bcb4da6728f47e0006eb3acc0016aae21f6d25cf6f80d5476d176413c352`
- **OLD Package (2025-12-22)**: `0x7c0f06e479d4e53d35e03ed24f3ab9374da5fd6e04434f3bd1c92cf9f70766e0`

✅ **Updated all object IDs** to match the current deployment from the verification checklist

✅ **Created diagnostic script** (`backend/scripts/diagnose-old-contracts.js`) to help identify configuration issues

## How to Fix Your Backend

### Step 1: Update Environment Variables

1. Open `backend/.env.local`
2. Copy the **entire `.env` section** from `contracts/suitwo_game/DEPLOYMENT_IDS.md` (lines 20-85)
3. Replace all existing values in your `.env.local` file
4. **Important**: Make sure you're using the updated values from the file (not the old ones)

### Step 2: Verify Configuration

Run the diagnostic script to check if everything is configured correctly:

```bash
cd backend
node scripts/diagnose-old-contracts.js
```

This will:
- ✅ Check if all required environment variables are set
- ✅ Verify that old packages exist on-chain
- ✅ Test if old contract functions are accessible
- ✅ Identify any missing or incorrect configuration

### Step 3: Restart Backend Server

After updating the `.env.local` file, **restart your backend server**:

```bash
# Stop the current server (Ctrl+C)
# Then restart it
npm run dev
# or
npm start
```

## Expected Results

After fixing the configuration:

1. ✅ Backend can access current contracts (using correct package ID)
2. ✅ Backend can access old contracts (using correct OLD_ package IDs)
3. ✅ Migration services can read data from old contracts
4. ✅ All contract queries should work correctly

## Troubleshooting

If you still can't access old contracts after updating:

1. **Run the diagnostic script** to identify specific issues
2. **Check the error messages** - they will tell you:
   - Which environment variables are missing
   - Which contracts can't be found
   - Which functions are failing

3. **Verify package IDs on Sui Explorer**:
   - Current: https://suiexplorer.com/object/0x93e6bcb4da6728f47e0006eb3acc0016aae21f6d25cf6f80d5476d176413c352?network=testnet
   - Old: https://suiexplorer.com/object/0x7c0f06e479d4e53d35e03ed24f3ab9374da5fd6e04434f3bd1c92cf9f70766e0?network=testnet

4. **Check network**: Make sure you're using `testnet` (or `mainnet` if applicable) consistently

## Key Points

- **Current package** = The active deployment (2025-12-23)
- **OLD_ prefixed** = The previous deployment (2025-12-22) - this is where your data is
- **OLD_OLD_ prefixed** = Even older deployments (for tournaments, there's an OLD_OLD_)

The migration services need access to **both** current and old contracts:
- **Old contracts** = Source of data to migrate
- **Current contracts** = Destination for migrated data

