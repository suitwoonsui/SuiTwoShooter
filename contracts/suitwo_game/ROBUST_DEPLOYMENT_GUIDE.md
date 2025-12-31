# 🚀 Robust Deployment Guide

## Problem Summary

Previous deployment attempts failed because:
1. **No connection testing** - Scripts attempted to connect without verifying network connectivity
2. **No timeout handling** - Requests could hang indefinitely
3. **No retry logic** - Single failures would stop the entire deployment
4. **Single RPC endpoint** - If the default endpoint was down, deployment would fail
5. **No error recovery** - Network hiccups would cause complete failure

## Solution: `robust-deploy.js`

The new `robust-deploy.js` script addresses all these issues:

### ✅ Features

1. **Connection Testing** - Tests multiple RPC endpoints before deployment
2. **Timeout Handling** - All requests have timeouts (60 seconds default)
3. **Retry Logic** - Automatically retries failed operations up to 3 times
4. **Multiple RPC Endpoints** - Tries alternative endpoints if the default fails
5. **Better Error Messages** - Clear error messages with troubleshooting tips
6. **Exponential Backoff** - Retries wait progressively longer between attempts

## Prerequisites

1. **Sui CLI installed** - Required for building contracts
2. **Node.js and npm** - Required for running the script
3. **Wallet with SUI** - At least 0.5 SUI for full deployment
4. **Internet connection** - Stable connection to Sui testnet

## Quick Start

### Step 1: Navigate to Contract Directory

```bash
cd contracts/suitwo_game
```

### Step 2: Install Dependencies (if not already installed)

```bash
npm install
```

### Step 3: Verify Wallet Balance

The script will check your balance automatically, but you can check manually:

```bash
node check-balance.js
```

You need at least **0.5 SUI** for full deployment.

**If you need testnet SUI:**
1. Join Sui Discord: https://discord.gg/sui
2. Go to `#testnet-faucet` channel
3. Use command: `!faucet <YOUR_ADDRESS>`

### Step 4: Run Robust Deployment

```bash
node robust-deploy.js
```

The script will:
1. ✅ Test RPC endpoints to find a working one
2. ✅ Check your wallet balance
3. ✅ Build the contract
4. ✅ Publish the package (with retries)
5. ✅ Initialize Badge Registry
6. ✅ Create Badge Display
7. ✅ Create all Admin Capabilities
8. ✅ Extract and display all object IDs

## What the Script Does

### Phase 1: Connection Testing
- Tests multiple RPC endpoints
- Selects the first working endpoint
- Provides clear feedback on connection status

### Phase 2: Pre-Deployment Checks
- Verifies wallet initialization
- Checks SUI balance
- Validates build directory exists

### Phase 3: Contract Building
- Runs `sui move build`
- Validates build output
- Checks for required modules

### Phase 4: Package Publishing
- Publishes with retry logic
- Extracts package ID from transaction
- Extracts all object IDs (Session Registry, Statistics Registry, etc.)

### Phase 5: Badge System Initialization
- Initializes Badge Registry
- Creates Badge Display
- Handles errors gracefully

### Phase 6: Admin Capabilities
- Creates Score Submission Admin Capability
- Creates Premium Store Admin Capability
- Creates Tournament Admin Capability
- All with retry logic

## Output

After successful deployment, you'll see:

```
✅ FULL DEPLOYMENT COMPLETE!

📋 DEPLOYMENT SUMMARY:
   📦 Package ID: 0x...
   🆔 Session Registry: 0x...
   📊 Statistics Registry: 0x...
   🛒 Premium Store: 0x...
   🎮 Game Pass System: 0x...
   🏆 Tournament Registry: 0x...
   🏅 Badge Registry: 0x...
   🏅 Badge Publisher: 0x...
   🖼️  Badge Display: 0x...
   🔐 Score Admin Cap: 0x...
   🔐 Store Admin Cap: 0x...
   🔐 Tournament Admin Cap: 0x...
```

## Post-Deployment Steps

### 1. Update Backend Environment Variables

Copy the IDs from the deployment output to `backend/.env.local`:

```env
# Main Package ID
GAME_SCORE_CONTRACT_TESTNET=0x<package_id>

# Score Submission Module
SESSION_REGISTRY_OBJECT_ID_TESTNET=0x<session_registry>
STATISTICS_REGISTRY_OBJECT_ID_TESTNET=0x<statistics_registry>
ADMIN_CAPABILITY_OBJECT_ID_TESTNET=0x<score_admin_cap>

# Premium Store Module
PREMIUM_STORE_CONTRACT_TESTNET=0x<package_id>
PREMIUM_STORE_OBJECT_ID_TESTNET=0x<premium_store>
PREMIUM_STORE_ADMIN_CAPABILITY_OBJECT_ID_TESTNET=0x<store_admin_cap>

# Badge System Module
BADGE_REGISTRY_OBJECT_ID_TESTNET=0x<badge_registry>
BADGE_PUBLISHER_OBJECT_ID_TESTNET=0x<badge_publisher>
BADGE_DISPLAY_OBJECT_ID_TESTNET=0x<badge_display>

# Game Pass Module
GAME_PASS_CONTRACT_TESTNET=0x<package_id>
GAME_PASS_SYSTEM_OBJECT_ID_TESTNET=0x<game_pass_system>

# Tournament Module
TOURNAMENT_REGISTRY_OBJECT_ID_TESTNET=0x<tournament_registry>
TOURNAMENT_ADMIN_CAPABILITY_OBJECT_ID_TESTNET=0x<tournament_admin_cap>
```

### 2. Update DEPLOYMENT_IDS.md

Update `contracts/suitwo_game/DEPLOYMENT_IDS.md` with the new deployment information.

### 3. Restart Backend Server

```bash
cd backend
npm run dev
# or
npm start
```

## Troubleshooting

### "All RPC endpoints failed"

**Cause:** Network connectivity issues or Sui testnet is down

**Solutions:**
1. Check your internet connection
2. Try again later (testnet may be experiencing issues)
3. Check Sui status: https://status.sui.io

### "Insufficient balance"

**Cause:** Wallet doesn't have enough SUI

**Solutions:**
1. Get testnet SUI from Discord faucet
2. Check balance: `node check-balance.js`
3. Need at least 0.5 SUI for full deployment

### "Build failed"

**Cause:** Contract compilation errors

**Solutions:**
1. Check for syntax errors in Move files
2. Run `sui move build` manually to see detailed errors
3. Ensure all dependencies are correct

### "Package publish failed after 3 attempts"

**Cause:** Network issues or testnet congestion

**Solutions:**
1. Wait a few minutes and try again
2. Check if testnet is experiencing high traffic
3. Try running the script again (it will retry automatically)

### "Request timeout"

**Cause:** Network is slow or RPC endpoint is overloaded

**Solutions:**
1. The script will automatically try alternative endpoints
2. Wait for retries to complete
3. If all timeouts, check your network connection

## Comparison with Old Scripts

| Feature | Old Scripts | robust-deploy.js |
|---------|------------|------------------|
| Connection Testing | ❌ No | ✅ Yes |
| Timeout Handling | ❌ No | ✅ Yes (60s) |
| Retry Logic | ❌ No | ✅ Yes (3 attempts) |
| Multiple RPC Endpoints | ❌ No | ✅ Yes (4 endpoints) |
| Error Recovery | ❌ No | ✅ Yes |
| Clear Error Messages | ⚠️ Basic | ✅ Detailed |

## Alternative: Manual Deployment

If the script still fails, you can deploy manually:

### 1. Build Contract

```bash
sui move build
```

### 2. Publish Package

```bash
sui client publish --gas-budget 200000000
```

### 3. Extract IDs

Use the transaction digest to view on Sui Explorer and extract object IDs manually.

### 4. Initialize Systems

```bash
# Badge Registry
sui client call --package <PACKAGE_ID> --module badge_system --function initialize_badge_registry --args <ADDRESS> --gas-budget 50000000

# Badge Display
sui client call --package <PACKAGE_ID> --module badge_system --function create_display --args <PUBLISHER_ID> --gas-budget 50000000

# Admin Capabilities
sui client call --package <PACKAGE_ID> --module score_submission --function create_admin_capability --args <ADDRESS> --gas-budget 30000000
sui client call --package <PACKAGE_ID> --module premium_store --function create_admin_capability --args <ADDRESS> --gas-budget 30000000
sui client call --package <PACKAGE_ID> --module tournaments --function create_admin_capability --args <ADDRESS> --gas-budget 30000000
```

## Support

If you continue to experience issues:

1. Check the error message carefully
2. Review the troubleshooting section above
3. Verify all prerequisites are met
4. Check Sui testnet status
5. Review the script output for specific error details

## Notes

- The script uses exponential backoff for retries (2s, 3s, 4.5s)
- All operations have 60-second timeouts
- The script will automatically find a working RPC endpoint
- Failed operations are retried up to 3 times
- The script provides detailed progress information

