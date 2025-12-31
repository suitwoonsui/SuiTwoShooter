# Contract Deployment Guide

**This is the ONLY deployment guide you need.**

## Quick Start

```bash
cd contracts/suitwo_game
npm install
node deploy.js
```

That's it! The script handles everything automatically.

---

## What the Script Does

The `deploy.js` script automatically:

1. ✅ **Tests RPC connections** - Finds a working Sui testnet endpoint
2. ✅ **Checks wallet balance** - Verifies you have enough SUI (0.5+ required)
3. ✅ **Builds the contract** - Compiles all Move modules
4. ✅ **Publishes the package** - Deploys to testnet with retry logic
5. ✅ **Initializes Badge Registry** - Sets up badge system
6. ✅ **Creates Badge Display** - Required for wallet compatibility
7. ✅ **Creates Admin Capabilities** - For all modules (score, store, tournaments)
8. ✅ **Extracts all IDs** - Provides complete deployment summary

**Total Time:** ~3-5 minutes

---

## Prerequisites

1. **Sui CLI** - Install from https://github.com/MystenLabs/sui
2. **Node.js** - For running the deployment script
3. **Wallet with SUI** - At least 0.5 SUI for full deployment
4. **Internet connection** - Stable connection to Sui testnet

### Installing Sui CLI

**Windows (Chocolatey):**
```powershell
choco install sui -y
```

**Linux/Mac:**
```bash
cargo install --locked --git https://github.com/MystenLabs/sui.git --branch testnet sui
```

**Verify installation:**
```bash
sui --version
```

### Getting Testnet SUI

1. Join Sui Discord: https://discord.gg/sui
2. Go to `#testnet-faucet` channel
3. Use command: `!faucet <YOUR_ADDRESS>`

Or check your balance:
```bash
node check-balance.js
```

---

## Deployment Process

### Step 1: Navigate to Contract Directory

```bash
cd contracts/suitwo_game
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Run Deployment

```bash
node deploy.js
```

The script will:
- Test multiple RPC endpoints
- Retry on failures automatically
- Provide clear progress updates
- Extract all object IDs

### Step 4: Copy Output IDs

After successful deployment, you'll see a summary with all IDs. Copy these to:

1. **`backend/.env.local`** - Update environment variables
2. **`DEPLOYMENT_IDS.md`** - Update deployment history

---

## Post-Deployment Steps

### 1. Update Backend Environment Variables

Copy the IDs from deployment output to `backend/.env.local`:

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

Add the new deployment information to `DEPLOYMENT_IDS.md` (this is the source of truth for all contract IDs).

### 3. Restart Backend Server

```bash
cd backend
npm run dev
```

---

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
3. The script will automatically retry

### "Request timeout"

**Cause:** Network is slow or RPC endpoint is overloaded

**Solutions:**
1. The script will automatically try alternative endpoints
2. Wait for retries to complete
3. If all timeouts, check your network connection

---

## Features

### Connection Testing
- Tests 4 different Sui testnet RPC endpoints
- Automatically selects the first working endpoint
- Provides clear feedback on connection status

### Retry Logic
- Automatically retries failed operations up to 3 times
- Uses exponential backoff (2s, 3s, 4.5s delays)
- Only fails after all retries are exhausted

### Timeout Handling
- All network requests have timeouts
- Prevents indefinite hanging
- Provides clear timeout error messages

### Error Recovery
- Handles network hiccups gracefully
- Tries alternative endpoints if one fails
- Provides actionable error messages

---

## Manual Deployment (Alternative)

If the script fails, you can deploy manually:

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

---

## Important Files

- **`deploy.js`** - The ONLY deployment script you need
- **`DEPLOYMENT_IDS.md`** - Source of truth for all contract IDs
- **`DEPLOYMENT.md`** - This guide (the ONLY guide you need)

---

## Support

If you continue to experience issues:

1. Check the error message carefully
2. Review the troubleshooting section above
3. Verify all prerequisites are met
4. Check Sui testnet status
5. Review the script output for specific error details

---

**Last Updated:** 2025-01-XX  
**Script Version:** 2.0 (Consolidated)
