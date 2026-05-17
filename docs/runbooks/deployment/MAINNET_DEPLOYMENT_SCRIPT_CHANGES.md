# Mainnet Deployment Script Changes

This document outlines the specific changes needed to modify `deploy.js` for mainnet deployment.

## Quick Reference: Key Changes

### 1. RPC Endpoints

**Current (Testnet):**
```javascript
const TESTNET_RPC_ENDPOINTS = [
  'https://fullnode.testnet.sui.io:443',
  'https://sui-testnet-rpc.allthatnode.com',
  'https://testnet.suiet.app',
  'https://rpc-testnet.suiscan.xyz',
];
```

**Change to (Mainnet):**
```javascript
const MAINNET_RPC_ENDPOINTS = [
  'https://fullnode.mainnet.sui.io:443',
  'https://sui-mainnet-rpc.allthatnode.com',
  'https://mainnet.suiet.app',
  'https://rpc-mainnet.suiscan.xyz',
];
```

### 2. Private Key Handling

**Current (Hardcoded - NOT SECURE):**
```javascript
const privateKey = 'suiprivkey1qz2p2z2lq2crycc9prf4qux2uhpwcd5yx6uksvzkwtgusr5a4fmaqwsvm0m';
```

**Change to (Environment Variable):**
```javascript
const privateKey = process.env.MAINNET_PRIVATE_KEY || process.env.SUI_PRIVATE_KEY;
if (!privateKey) {
  throw new Error('MAINNET_PRIVATE_KEY environment variable is required for mainnet deployment');
}
```

### 3. Function Name Updates

**Current:**
```javascript
async function findWorkingEndpoint() {
  // Uses TESTNET_RPC_ENDPOINTS
}
```

**Change to:**
```javascript
async function findWorkingEndpoint() {
  // Use MAINNET_RPC_ENDPOINTS instead
  for (const endpoint of MAINNET_RPC_ENDPOINTS) {
    // ...
  }
}
```

### 4. Console Messages

**Current:**
```javascript
console.log('   Publishing to testnet (this may take 1-2 minutes)...');
```

**Change to:**
```javascript
console.log('   Publishing to MAINNET (this may take 1-2 minutes)...');
console.log('   ⚠️  WARNING: This will cost REAL SUI!');
```

### 5. Explorer URLs

**Current:**
```javascript
console.log(`   Package: https://suiexplorer.com/object/${packageId}?network=testnet`);
console.log(`   Publish TX: https://suiexplorer.com/txblock/${publishResult.digest}?network=testnet`);
```

**Change to:**
```javascript
console.log(`   Package: https://suiexplorer.com/object/${packageId}?network=mainnet`);
console.log(`   Publish TX: https://suiexplorer.com/txblock/${publishResult.digest}?network=mainnet`);
```

### 6. Error Messages

**Current:**
```javascript
console.log('   Get testnet SUI from: https://discord.gg/sui (testnet-faucet channel)');
```

**Change to:**
```javascript
console.log('   ⚠️  You need REAL SUI for mainnet deployment');
console.log('   Get SUI from exchanges or other sources');
```

### 7. Script Header Comments

**Current:**
```javascript
// Complete contract deployment with connection testing and retry logic
// This is the ONLY deployment script you need
```

**Change to:**
```javascript
// Mainnet Contract Deployment Script
// ⚠️  WARNING: This deploys to MAINNET using REAL SUI
// Make sure you've completed the MAINNET_DEPLOYMENT_CHECKLIST.md before running!
```

## Recommended Approach: Create Separate Script

Instead of modifying `deploy.js`, create a new file `deploy-mainnet.js`:

1. **Copy deploy.js to deploy-mainnet.js**
2. **Apply all changes above**
3. **Add additional safety checks:**

```javascript
// Add at the top of the script
console.log('🚨 MAINNET DEPLOYMENT SCRIPT');
console.log('═══════════════════════════════════════');
console.log('⚠️  WARNING: This will deploy to Sui MAINNET');
console.log('⚠️  This will cost REAL SUI');
console.log('⚠️  Contracts cannot be undone once deployed');
console.log('═══════════════════════════════════════\n');

// Add confirmation prompt (optional but recommended)
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Type "DEPLOY TO MAINNET" to confirm: ', (answer) => {
  if (answer !== 'DEPLOY TO MAINNET') {
    console.log('❌ Deployment cancelled');
    rl.close();
    process.exit(0);
  }
  rl.close();
  deploy();
});
```

## Environment Variable Setup

Create a `.env` file in `contracts/suitwo_game/`:

```bash
# Mainnet Private Key (DO NOT COMMIT THIS FILE!)
MAINNET_PRIVATE_KEY=suiprivkey1...
```

**IMPORTANT:**
- Add `.env` to `.gitignore`
- Never commit private keys to version control
- Use a secure method to store the key

## Usage

```bash
# Set environment variable
export MAINNET_PRIVATE_KEY="suiprivkey1..."

# Or load from .env file (if using dotenv package)
# npm install dotenv
# Then add at top of script: require('dotenv').config();

# Run mainnet deployment
cd contracts/suitwo_game
node deploy-mainnet.js
```

## Complete Modified Script Structure

```javascript
// Mainnet Deployment Script
const { SuiClient } = require('@mysten/sui/client');
// ... other imports

// Mainnet RPC endpoints
const MAINNET_RPC_ENDPOINTS = [
  'https://fullnode.mainnet.sui.io:443',
  'https://sui-mainnet-rpc.allthatnode.com',
  'https://mainnet.suiet.app',
  'https://rpc-mainnet.suiscan.xyz',
];

// Get private key from environment
const privateKey = process.env.MAINNET_PRIVATE_KEY || process.env.SUI_PRIVATE_KEY;
if (!privateKey) {
  throw new Error('MAINNET_PRIVATE_KEY environment variable required');
}

// ... rest of the script with:
// - findWorkingEndpoint() using MAINNET_RPC_ENDPOINTS
// - All console.log messages updated for mainnet
// - All explorer URLs using ?network=mainnet
// - Updated error messages
```

---

**Next Steps:**
1. Review `MAINNET_DEPLOYMENT_CHECKLIST.md` completely
2. Create `deploy-mainnet.js` with these changes
3. Test the script structure (without actually deploying)
4. Complete all checklist items
5. Deploy to mainnet
