# Post-Deployment Setup Guide

## Step 1: Create Admin Capability (Security Setup)

**IMPORTANT:** This step is required to prevent unauthorized score submissions. Only the admin wallet can submit scores.

After contract deployment, you need to call `create_admin_capability` to create the admin capability object. This object proves that the caller is the authorized admin.

### Get Your Admin Wallet Address

First, get your admin wallet address from the backend:

```bash
# Start the backend (if not already running)
cd backend
npm run dev
```

In another terminal, check admin wallet address:

```bash
curl http://localhost:3000/api/admin/health
```

Look for the `address` field in the response. This is your admin wallet address.

### Call create_admin_capability

Using the Sui CLI, call the function with your admin wallet address:

```bash
# Replace PACKAGE_ID with your actual package ID from deployment
# Replace ADMIN_ADDRESS with your admin wallet address from the health check
sui client call \
  --package <PACKAGE_ID> \
  --module score_submission \
  --function create_admin_capability \
  --args <ADMIN_ADDRESS> \
  --gas-budget 10000000
```

**Example:**
```bash
sui client call \
  --package 0xb52cdbb9e448aac73ada6355b10f9e320acfc76eec6d2ae506c96714ac9cda29 \
  --module score_submission \
  --function create_admin_capability \
  --args 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef \
  --gas-budget 10000000
```

**Expected Output:** You'll get a transaction digest. Look for the `AdminCapability` object ID in the transaction effects.

### Find the Admin Capability Object ID

After the transaction completes, find the AdminCapability object ID:

```bash
# View the transaction details
sui client transaction <TRANSACTION_DIGEST>

# Or check your objects
sui client objects
```

Look for an object of type `AdminCapability`. Copy its object ID.

---

## Step 2: Update Backend Environment Variables

After contract deployment and admin capability creation, you need to add **THREE** new environment variables to your backend `.env.local` file:

### Required Variables

1. **`GAME_SCORE_CONTRACT_TESTNET`** - Package ID from deployment
2. **`SESSION_REGISTRY_OBJECT_ID`** - Session Registry Object ID from deployment (created by `init()`)
3. **`ADMIN_CAPABILITY_OBJECT_ID`** - Admin Capability Object ID from `create_admin_capability` call

### Update `.env.local`

Open `backend/.env.local` and add/update these lines:

```bash
# Contract Configuration (REQUIRED after deployment)
GAME_SCORE_CONTRACT_TESTNET=0x<YOUR_PACKAGE_ID>
SESSION_REGISTRY_OBJECT_ID=0x<YOUR_REGISTRY_OBJECT_ID>
ADMIN_CAPABILITY_OBJECT_ID=0x<YOUR_ADMIN_CAPABILITY_OBJECT_ID>

# Network Configuration
SUI_TESTNET_NETWORK=testnet
# or
SUI_NETWORK=testnet
```

**Example:**
```bash
GAME_SCORE_CONTRACT_TESTNET=0xb52cdbb9e448aac73ada6355b10f9e320acfc76eec6d2ae506c96714ac9cda29
SESSION_REGISTRY_OBJECT_ID=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
ADMIN_CAPABILITY_OBJECT_ID=0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890
SUI_TESTNET_NETWORK=testnet
```

**Note:** For mainnet, use `ADMIN_CAPABILITY_OBJECT_ID_MAINNET` instead.

---

## Step 3: Verify Admin Wallet is Funded

The admin wallet needs testnet SUI to pay for gas fees. Check the balance:

```bash
# Start the backend (if not already running)
cd backend
npm run dev
```

In another terminal, check admin wallet health:

```bash
curl http://localhost:3000/api/admin/health
```

**Expected Response:**
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

**If balance is low:**
- Get testnet SUI from Sui Discord faucet: `#testnet-faucet`
- Use command: `!faucet <YOUR_ADMIN_WALLET_ADDRESS>`
- Or visit: https://discord.com/channels/916379725201563759/971488439931392130

---

## Step 4: Test Score Submission

### Option A: Test via API (Recommended)

```bash
# Test score submission endpoint
curl -X POST http://localhost:3000/api/scores/submit \
  -H "Content-Type: application/json" \
  -d '{
    "playerAddress": "0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0",
    "playerName": "TestPlayer",
    "sessionId": "test-session-123",
    "scoreData": {
      "score": 1000,
      "distance": 1000,
      "coins": 50,
      "bossesDefeated": 1,
      "enemiesDefeated": 10,
      "longestCoinStreak": 5
    }
  }'
```

**Expected Response (Success):**
```json
{
  "success": true,
  "digest": "0x...",
  "playerAddress": "0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0",
  "gasPaidBy": "admin_wallet",
  "message": "Score submitted successfully. Admin wallet paid gas fees."
}
```

### Option B: Test via Game

1. Start the backend: `cd backend && npm run dev`
2. Open the game in your browser
3. Connect your wallet
4. Play a game and get a score
5. When you save the score, it should submit to the blockchain
6. Check the browser console for success/error messages
7. Check for toast notifications (success or error)

---

## Step 4: Verify on Sui Explorer

After a successful submission, verify on Sui Explorer:

1. Copy the transaction digest from the API response
2. Visit: `https://suiexplorer.com/txblock/<DIGEST>?network=testnet`
3. Verify:
   - Transaction succeeded
   - `GameSession` object was created
   - `ScoreSubmitted` event was emitted
   - Session Registry was updated

---

## Troubleshooting

### "Session registry object ID not configured"
- **Cause:** `SESSION_REGISTRY_OBJECT_ID` not set in `.env.local`
- **Fix:** Add the Session Registry Object ID from deployment

### "Game score contract address not configured"
- **Cause:** `GAME_SCORE_CONTRACT_TESTNET` not set
- **Fix:** Add the Package ID from deployment

### "Transaction failed: Duplicate session ID"
- **Cause:** Trying to submit the same session ID twice
- **Fix:** This is expected behavior - each session ID can only be used once. Generate a new session ID for each game.

### "Transaction failed: MoveAbort(...) error code 0"
- **Cause:** Duplicate session ID (error code 0)
- **Fix:** Use a unique session ID for each submission

### "Transaction failed: MoveAbort(...) error code 1"
- **Cause:** Distance too low (minimum 35 required)
- **Fix:** Ensure distance >= 35

### "Transaction failed: MoveAbort(...) error code 2"
- **Cause:** Invalid score (doesn't match game actions)
- **Fix:** Ensure score is reasonable based on coins, bosses, and distance

### "Transaction failed: MoveAbort(...) error code 3"
- **Cause:** Coin count too high (maximum 1000)
- **Fix:** Ensure coins <= 1000

### "Transaction failed: MoveAbort(...) error code 4"
- **Cause:** Coin streak exceeds coins collected
- **Fix:** Ensure longestCoinStreak <= coins

### Admin wallet balance is low
- **Cause:** Not enough SUI for gas fees
- **Fix:** Fund the admin wallet from testnet faucet

---

## Next Steps

Once everything is working:

1. ✅ Test score submission from the game
2. ✅ Verify scores are being saved on-chain
3. ✅ Test with different player names (including empty name)
4. ✅ Test duplicate session ID prevention
5. ✅ Monitor admin wallet balance
6. ✅ Set up monitoring/alerts for low balance

---

## Environment Variables Checklist

Make sure you have all required variables in `backend/.env.local`:

- [ ] `GAME_WALLET_PRIVATE_KEY` (or `ADMIN_WALLET_PRIVATE_KEY`)
- [ ] `GAME_SCORE_CONTRACT_TESTNET` (Package ID from deployment)
- [ ] `SESSION_REGISTRY_OBJECT_ID` (Registry Object ID from deployment)
- [ ] `SUI_TESTNET_NETWORK` (or `SUI_NETWORK=testnet`)
- [ ] `MEWS_TOKEN_TYPE_ID`
- [ ] `MIN_TOKEN_BALANCE`

Optional but recommended:
- [ ] `SUI_GAS_BUDGET` (defaults to 10000000)
- [ ] `PORT` (defaults to 3000)
- [ ] `NODE_ENV` (defaults to development)

