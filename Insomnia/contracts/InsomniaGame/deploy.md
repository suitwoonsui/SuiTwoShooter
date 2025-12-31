# Deployment Instructions

## Current Status ✅
- **Network**: Sui Testnet (Connected)
- **Your Address**: `0xdb6293a83c8880c7134ccaa381cf3168fb81375631940c406fc12987314faf02`
- **Contracts**: Compiled and ready for deployment
- **Environment**: Testnet configured and active

## Step 1: Verify Testnet Connection
```bash
# Check current environment
sui client active-env

# Check your address
sui client active-address

# Check balance (should show 0 initially)
sui client balance
```

## Step 2: Get Testnet Coins
Since the CLI faucet is rate-limited, use one of these methods:

### Option A: Sui Discord Faucet (Recommended)
1. Join [Sui Discord](https://discord.gg/sui)
2. Go to `#testnet-faucet` channel
3. Request coins with your address: `0xdb6293a83c8880c7134ccaa381cf3168fb81375631940c406fc12987314faf02`

### Option B: Web Faucet
1. Visit [Sui Testnet Faucet](https://suiexplorer.com/faucet?network=testnet)
2. Connect your wallet or paste your address
3. Request testnet coins

### Option C: Wait for CLI Faucet
```bash
# Try the CLI faucet (may be rate-limited)
sui client faucet
```

## Step 3: Build the Contracts
```bash
sui move build
```

## Step 4: Deploy to Testnet
```bash
# Deploy the package (requires testnet coins)
sui client publish --gas-budget 10000000
```

**Expected Output**: You'll get a package ID and transaction digest.

## Step 5: Initialize the Contracts
After deployment, you'll get package IDs. Initialize each module:

### Initialize ScoreSystem
```bash
# Replace PACKAGE_ID with your actual package ID from deployment
sui client call --package PACKAGE_ID --module score_system --function init --gas-budget 1000000
```

### Initialize AdminSystem
```bash
# Replace PACKAGE_ID with your actual package ID from deployment
sui client call --package PACKAGE_ID --module admin_system --function init --gas-budget 1000000
```

## Step 6: Verify Deployment
Check that the objects were created:
```bash
sui client objects
```

You should see:
- ScoreSystem object (shared)
- AdminSystem object (shared)

## Step 7: Test Basic Functions

### Start a Game
```bash
# You'll need a Clock object from Sui
# First, get a Clock object ID
sui client objects --query "Clock"

# Then start a game
sui client call --package PACKAGE_ID --module game_core --function start_game --args CLOCK_OBJECT_ID --gas-budget 1000000
```

### Update Game Parameters (Admin Only)
```bash
sui client call --package PACKAGE_ID --module admin_system --function update_game_parameters --args ADMIN_SYSTEM_OBJECT_ID 20 2 10 50 100 --gas-budget 1000000
```

## Important Notes

1. **Gas Budget**: Adjust gas budgets based on network conditions
2. **Admin Address**: Your address (`0xdb6293a83c8880c7134ccaa381cf3168fb81375631940c406fc12987314faf02`) becomes the admin for admin functions
3. **Clock Object**: You need a Clock object from Sui for time-based functions
4. **Testnet Coins**: Ensure you have enough testnet SUI for deployment and testing

## Troubleshooting

### Common Issues
- **Insufficient Gas**: Increase gas budget
- **Object Not Found**: Check object IDs and ensure objects exist
- **Permission Denied**: Verify you're calling admin functions with the correct address
- **Rate Limited**: Wait 60 minutes between faucet requests

### Getting Help
- Check Sui documentation: https://docs.sui.io/
- Join Sui Discord: https://discord.gg/sui
- Review Move language docs: https://move-language.github.io/move/

## Your Configuration
- **Address**: `0xdb6293a83c8880c7134ccaa381cf3168fb81375631940c406fc12987314faf02`
- **Network**: Sui Testnet
- **Client Version**: 1.39.1
- **Server Version**: 1.54.0 (API version mismatch warning is normal)
