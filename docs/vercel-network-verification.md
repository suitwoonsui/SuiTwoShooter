# Vercel Network Configuration Verification

## Quick Check

To verify your backend is using the correct network configuration, visit:
```
https://sui-two-shooter-backend-sui-integra.vercel.app/api/config
```

This should return:
```json
{
  "success": true,
  "network": "testnet",
  "rpcUrl": "https://fullnode.testnet.sui.io:443",
  "walletModuleUrl": "https://sui-two-shooter-wallet-module-test.vercel.app/wallet-api.umd.cjs"
}
```

## Required Vercel Environment Variables

In your Vercel backend project settings, ensure these are set:

### For Testnet (Current Setup)
```
SUI_TESTNET_NETWORK=testnet
SUI_TESTNET_RPC_URL=https://fullnode.testnet.sui.io:443
```

### Optional (if not set, defaults are used)
```
SUI_NETWORK=testnet  # Fallback if SUI_TESTNET_NETWORK not set
SUI_RPC_URL=https://fullnode.testnet.sui.io:443  # Fallback RPC
```

### Contract Addresses (Testnet)
```
PACKAGE_ID=0x6df4ec20614cbf2b407de12997bb5fa689f7ec2833a3df3ea84cd9986f3f448d
BADGE_REGISTRY_OBJECT_ID_TESTNET=0xe47d097edec0fa01aec081cf8cf59cb9c191fea487ed42daf5fadf24a630a286
STATISTICS_REGISTRY_OBJECT_ID_TESTNET=0xec2f3ac00be49a5c4f2b2874b15c73e57c0de952b4e59f648b990b704e384571
```

## What's Already Configured ✅

1. **Frontend API URLs**: Automatically detects Vercel and uses production URLs
2. **Sui RPC Endpoints**: Already pointing to public Sui networks (not local)
3. **Network Detection**: Frontend correctly identifies production environment

## No Changes Needed

Since your app is working and showing testnet in the logs, your configuration is correct. The system is already using:
- ✅ Public Sui testnet RPC (not localhost)
- ✅ Vercel backend API (not localhost)
- ✅ Vercel wallet module (not localhost)

## If You Need to Switch to Mainnet

1. Update Vercel environment variables:
   ```
   SUI_MAINNET_NETWORK=mainnet
   SUI_MAINNET_RPC_URL=https://fullnode.mainnet.sui.io:443
   ```

2. Update contract addresses in Vercel:
   ```
   PACKAGE_ID=<mainnet_package_id>
   BADGE_REGISTRY_OBJECT_ID_MAINNET=<mainnet_badge_registry>
   STATISTICS_REGISTRY_OBJECT_ID_MAINNET=<mainnet_statistics_registry>
   ```

3. Update frontend contract config (`src/config/contract-config.js`) with mainnet addresses

4. Redeploy backend (Vercel will auto-deploy on env var changes)
