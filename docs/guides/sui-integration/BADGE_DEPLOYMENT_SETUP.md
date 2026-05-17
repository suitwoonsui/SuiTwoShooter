# Badge System Deployment Setup

## Pre-Deployment Checklist

### 1. Get Admin Wallet Address

The admin wallet will receive all badge minting fees ($0.10 per mint). Get the admin wallet address:

**Option A: From Backend API**
```bash
# Start backend server
cd backend
npm run dev

# In another terminal, get admin address
curl http://localhost:3000/api/admin/health
```

Look for the `address` field in the response.

**Option B: From Backend Code**
```typescript
import { getAdminWalletService } from '@/lib/sui/admin-wallet-service';
const adminWallet = getAdminWalletService();
const adminAddress = adminWallet.getAddress();
console.log('Admin wallet address:', adminAddress);
```

### 2. Verify Contract Compiles

**Note**: The fee recipient is now set at runtime (consistent with `score_submission` pattern), so no compile-time constant needs to be updated.

```bash
cd contracts/suitwo_game
sui move build
```

Make sure there are no compilation errors.

## Deployment

After updating the fee recipient address, deploy the contract as usual.

## Post-Deployment

### 3. Initialize BadgeRegistry

After contract deployment, call the `init()` function to create the BadgeRegistry shared object and set the fee recipient:

```bash
# Replace PACKAGE_ID with your actual package ID from deployment
# Replace ADMIN_WALLET_ADDRESS with your admin wallet address (same as used for score_submission)
sui client call \
  --package <PACKAGE_ID> \
  --module badge_system \
  --function initialize_badge_registry \
  --args <ADMIN_WALLET_ADDRESS> \
  --gas-budget 10000000
```

**Expected Output**: Look for the `BadgeRegistry` object ID in the transaction effects.

**Note**: This matches the pattern used in `score_submission` - the admin address is set at runtime, not compile-time.

### 4. Create Display Object

After contract deployment, create the Display object for badge metadata:

**Option A: Using the Script (Recommended)**

```bash
cd contracts/suitwo_game

# If you know the Publisher object ID:
node create-badge-display.js <PUBLISHER_OBJECT_ID>

# Or set it as environment variable:
PUBLISHER_OBJECT_ID=<PUBLISHER_OBJECT_ID> node create-badge-display.js

# The script will also try to find it automatically if not provided
node create-badge-display.js
```

**Option B: Using Sui CLI**

```bash
# Replace PACKAGE_ID with your actual package ID
# Replace PUBLISHER_OBJECT_ID with your Publisher object ID (from package deployment)
sui client call \
  --package <PACKAGE_ID> \
  --module badge_system \
  --function create_display \
  --args <PUBLISHER_OBJECT_ID> \
  --gas-budget 10000000
```

**Finding Your Publisher Object ID:**

The Publisher object is created when you publish the package. Find it using one of these methods:

1. **From Deployment Transaction:**
   - Check your deployment transaction output
   - Look for an object with type containing `"Publisher"`
   - Or view on Sui Explorer: `https://suiexplorer.com/txblock/<TRANSACTION_DIGEST>?network=testnet`

2. **Query Your Wallet:**
   ```bash
   sui client objects --address <YOUR_ADDRESS>
   ```
   Look for an object with type containing `"Publisher"`

3. **From Package Info:**
   ```bash
   sui client object <PACKAGE_ID>
   ```
   The Publisher address is shown in the package owner information

**Expected Output**: Display object will be transferred to your wallet. Keep this object for future updates.

### 5. Update Environment Variables

Add to `backend/.env.local`:

```bash
# Badge Registry Object ID (from init() function)
BADGE_REGISTRY_OBJECT_ID_TESTNET=0x<YOUR_BADGE_REGISTRY_OBJECT_ID>
# For mainnet:
BADGE_REGISTRY_OBJECT_ID_MAINNET=0x<YOUR_BADGE_REGISTRY_OBJECT_ID>

# Display Object ID (from create_display() function) - Optional, for future updates
BADGE_DISPLAY_OBJECT_ID_TESTNET=0x<YOUR_DISPLAY_OBJECT_ID>
BADGE_DISPLAY_OBJECT_ID_MAINNET=0x<YOUR_DISPLAY_OBJECT_ID>
```

### Verify Fee Recipient

After deployment, verify the fee recipient is correct:

1. Query the `BadgeRegistry` object to check the `fee_recipient` field
2. Confirm it matches your admin wallet address
3. Test a badge mint to ensure fees go to the correct address

### Monitor Fee Collection

The admin wallet will receive:
- **$0.10 per badge mint** (dollar-pegged, frontend calculates SUI amount)
- Fees are transferred immediately when badge is minted
- Check admin wallet balance to verify fee collection

## Important Notes

- **Fee recipient cannot be changed** after deployment (it's a constant)
- If you need to change the fee recipient, you'll need to redeploy the contract
- Consider using a treasury address instead of admin wallet if you want separation
- Admin wallet address is derived from `GAME_WALLET_PRIVATE_KEY` environment variable

---

**Status**: Pre-Deployment Setup  
**Date**: November 2025

