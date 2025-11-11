# Environment Variables Setup

This document describes all environment variables required for the SuiTwo game backend.

## Required Environment Variables

### Admin Wallet Configuration

**`GAME_WALLET_PRIVATE_KEY`** (or `ADMIN_WALLET_PRIVATE_KEY`)
- **Description**: Private key for the admin wallet that signs transactions and pays gas fees
- **Format**: Supports both bech32 (`suiprivkey1...`) and hex (64 characters, with or without `0x` prefix)
- **Example (bech32)**: `suiprivkey1qz2p2z2lq2crycc9prf4qux2uhpwcd5yx6uksvzkwtgusr5a4fmaqwsvm0m`
- **Example (hex)**: `a1b2c3d4e5f6...` (64 hex characters)
- **Security**: ⚠️ **NEVER commit this to version control!** Store in `.env.local` or secure secret manager
- **Required**: Yes

### Sui Network Configuration

**`SUI_TESTNET_NETWORK`** (Recommended for testnet)
- **Description**: Set this variable to enable testnet mode
- **Values**: Any value (presence indicates testnet)
- **Example**: `testnet` or `true`
- **Required**: No (use if you want explicit testnet configuration)

**`SUI_MAINNET_NETWORK`** (For production)
- **Description**: Set this variable to enable mainnet mode
- **Values**: Any value (presence indicates mainnet)
- **Example**: `mainnet` or `true`
- **Required**: No

**`SUI_NETWORK`** (Fallback)
- **Description**: Sui network to use for contract operations (fallback if network-specific vars not set)
- **Values**: `testnet` or `mainnet`
- **Example**: `testnet`
- **Required**: No (defaults to `mainnet`)

**`SUI_TESTNET_RPC_URL`** (Recommended)
- **Description**: Custom RPC URL for testnet
- **Example**: `https://fullnode.testnet.sui.io:443`
- **Required**: No (defaults provided)

**`SUI_MAINNET_RPC_URL`**
- **Description**: Custom RPC URL for mainnet
- **Example**: `https://fullnode.mainnet.sui.io:443`
- **Required**: No (defaults provided)

**`SUI_RPC_URL`** (Fallback)
- **Description**: Custom RPC URL (optional, uses default if not set)
- **Example**: `https://fullnode.testnet.sui.io:443`
- **Required**: No (uses network defaults)

**`SUI_GAS_BUDGET`**
- **Description**: Gas budget for transactions in MIST (1 SUI = 1,000,000,000 MIST)
- **Default**: `10000000` (0.01 SUI)
- **Example**: `10000000`
- **Required**: No

### Contract Configuration

**`GAME_SCORE_CONTRACT_TESTNET`** (Recommended)
- **Description**: Package ID of the deployed game score contract on testnet
- **Format**: Package ID (e.g., `0x...`) or full module path (e.g., `0x...::score_submission`)
- **Example**: `0xb52cdbb9e448aac73ada6355b10f9e320acfc76eec6d2ae506c96714ac9cda29`
- **Required**: Yes (after contract deployment to testnet)
- **Note**: Set this after deploying the contract to testnet

**`GAME_SCORE_CONTRACT_MAINNET`** (For production)
- **Description**: Package ID of the deployed game score contract on mainnet
- **Format**: Package ID (e.g., `0x...`)
- **Example**: `0x...` (set after mainnet deployment)
- **Required**: No (only needed for mainnet deployment)

**`GAME_SCORE_CONTRACT`** (Fallback)
- **Description**: Fallback contract address (used if network-specific variable not set)
- **Required**: No (use network-specific variables instead)

**`SESSION_REGISTRY_OBJECT_ID`** (NEW - REQUIRED after deployment)
- **Description**: Object ID of the SessionRegistry shared object created by the `init` function
- **Format**: Object ID (e.g., `0x...`)
- **Example**: `0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef`
- **Required**: Yes (after contract deployment)
- **Note**: This is created automatically when the contract is deployed. Extract it from the deployment transaction.

**`TOKEN_BURN_CONTRACT`** (Future)
- **Description**: Token burn contract address
- **Required**: No (for future implementation)

**`SUBSCRIPTION_CONTRACT`** (Future)
- **Description**: Subscription contract address
- **Required**: No (for future implementation)

### Token Configuration (Gatekeeping)

**`MEWS_TOKEN_TYPE_ID`**
- **Description**: $Mews token type ID for gatekeeping checks
- **Example**: `0x2dcf8629a70b235cda598170fc9b271f03f33d34dd6fa148adaff481e7a792d2::mews::MEWS`
- **Required**: Yes

**`MIN_TOKEN_BALANCE`**
- **Description**: Minimum $Mews token balance required to play (in smallest unit, 9 decimals)
- **Example**: `500000000` (500,000 tokens with 9 decimals)
- **Required**: Yes

### Server Configuration

**`PORT`**
- **Description**: Backend server port
- **Default**: `3000`
- **Example**: `3000`
- **Required**: No

**`NODE_ENV`**
- **Description**: Node environment
- **Values**: `development`, `production`, `test`
- **Default**: `development`
- **Required**: No

**`CORS_ORIGIN`**
- **Description**: Allowed CORS origin for frontend
- **Example**: `http://localhost:8000` or `*` (for development, allows any localhost origin)
- **Required**: No (defaults to `*` for development, which allows any localhost origin)
- **Note**: If your frontend runs on a different port (e.g., `localhost:8000`), either set this to that URL or leave it as `*` for development

## Environment File Setup

### 1. Create `.env.local` file

Create a `.env.local` file in the `backend/` directory:

```bash
cd backend
touch .env.local
```

### 2. Add Required Variables

Copy the following template and fill in your values:

```bash
# Admin Wallet (REQUIRED)
GAME_WALLET_PRIVATE_KEY=suiprivkey1qz2p2z2lq2crycc9prf4qux2uhpwcd5yx6uksvzkwtgusr5a4fmaqwsvm0m

# Sui Network (REQUIRED after deployment)
SUI_TESTNET_NETWORK=testnet
GAME_SCORE_CONTRACT_TESTNET=0x...  # Package ID - Set after contract deployment
SESSION_REGISTRY_OBJECT_ID=0x...  # Registry Object ID - Set after contract deployment

# Token Configuration (REQUIRED)
MEWS_TOKEN_TYPE_ID=0x2dcf8629a70b235cda598170fc9b271f03f33d34dd6fa148adaff481e7a792d2::mews::MEWS
MIN_TOKEN_BALANCE=500000000

# Server Configuration (Optional)
PORT=3000
NODE_ENV=development
CORS_ORIGIN=*  # Use * for development (allows any localhost origin), or set specific URL like http://localhost:8000
```

### 3. Security Best Practices

1. **Never commit `.env.local`** - It's already in `.gitignore`
2. **Use different keys for testnet and mainnet**
3. **Rotate keys regularly**
4. **Use secret managers in production** (AWS Secrets Manager, Azure Key Vault, etc.)

## Verification

### Check Admin Wallet Health

After setting up environment variables, verify the admin wallet is working:

```bash
# Start the backend server
npm run dev

# In another terminal, check health
curl http://localhost:3000/api/admin/health
```

Expected response:
```json
{
  "success": true,
  "adminWallet": {
    "address": "0x...",
    "balance": "1000000000",
    "balanceInSUI": 1.0,
    "hasEnough": true,
    "status": "healthy"
  }
}
```

### Fund Admin Wallet

The admin wallet needs testnet SUI for gas fees:

1. **Get testnet SUI from faucet:**
   - Join Sui Discord: https://discord.gg/sui
   - Go to `#testnet-faucet` channel
   - Use command: `!faucet <YOUR_ADMIN_WALLET_ADDRESS>`

2. **Or use web faucet:**
   - Visit: https://discord.com/channels/916379725201563759/971488439931392130

3. **Verify balance:**
   ```bash
   curl http://localhost:3000/api/admin/health
   ```

## Troubleshooting

### "GAME_WALLET_PRIVATE_KEY must be set"
- **Solution**: Add `GAME_WALLET_PRIVATE_KEY` to `.env.local`

### "Failed to decode bech32 private key"
- **Solution**: Ensure the private key is in correct format. If using bech32, it should start with `suiprivkey1`

### "Game score contract address not configured"
- **Solution**: Deploy the contract first, then set `GAME_SCORE_CONTRACT` environment variable

### "Admin wallet balance is low"
- **Solution**: Fund the admin wallet with testnet SUI from the faucet

### "Invalid player address format"
- **Solution**: Ensure player address is 66 characters (0x + 64 hex chars)

## Next Steps

1. ✅ Set up environment variables
2. ✅ Fund admin wallet with testnet SUI
3. ✅ Deploy contract to testnet
4. ✅ Set `GAME_SCORE_CONTRACT` environment variable
5. ✅ Test score submission

