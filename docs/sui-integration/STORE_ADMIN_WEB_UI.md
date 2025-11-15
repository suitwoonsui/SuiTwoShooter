# Admin Web UI - Quick Start Guide

## 🎯 Overview

The Admin Web UI provides a user-friendly interface for adding items to player inventories. It handles wallet authentication automatically and requires no API keys in the browser.

## 🚀 Quick Start

### 1. Access the Admin Page

Navigate to:
```
http://localhost:8000/admin-add-items.html
```

### 2. Connect Admin Wallet

1. Click **"Connect Wallet"** button
2. Select your admin wallet (must match `GAME_WALLET_PRIVATE_KEY` from backend)
3. Approve the connection in your wallet extension
4. The page will verify the wallet matches the admin wallet
5. If verified, the form will appear

### 3. Add Items

1. Enter the **Player Address** (the wallet address of the player receiving items)
2. Click **"+ Add Item"** to add items to the list
3. For each item:
   - Select **Item Type** (Extra Lives, Force Field, etc.)
   - Select **Level** (1-3 for most items, 1 only for Destroy All/Boss Kill Shot)
   - Enter **Quantity** (must be > 0)
4. Click **"Add Items to Inventory"**
5. Wait for transaction confirmation
6. Transaction digest will be displayed on success

## 🔒 Security

### Wallet Authentication

The web UI uses **two-layer wallet verification**:

1. **Frontend Verification:**
   - Fetches admin wallet address from `/api/admin/verify-wallet`
   - Compares connected wallet address with admin address
   - Only shows form if addresses match
   - Disconnects wallet if wrong wallet is connected

2. **Backend Verification:**
   - Receives `adminWalletAddress` in request body
   - Verifies it matches the address from `GAME_WALLET_PRIVATE_KEY`
   - Rejects request if addresses don't match (403 Forbidden)

### API Key Protection

- API key is stored in `backend/.env.local` (never exposed to browser)
- Server-side proxy (`/api/admin/add-items`) handles API key automatically
- No need to enter API key in the browser

## 📋 Requirements

### Backend Setup

Ensure these environment variables are set in `backend/.env.local`:

```env
GAME_WALLET_PRIVATE_KEY=suiprivkey1...
API_KEY=your-secure-api-key-here
PREMIUM_STORE_ADMIN_CAPABILITY_OBJECT_ID_TESTNET=0x...
PREMIUM_STORE_OBJECT_ID_TESTNET=0x...
```

### Frontend Setup

- Frontend server must be running on port 8000
- Wallet module must be accessible at `wallet-module/dist/wallet-api.umd.cjs`
- Backend server must be running on port 3000

## 🎮 Using the UI

### Adding a Single Item

1. Enter player address
2. Item is pre-added (Extra Lives Level 1, Quantity 1)
3. Modify as needed
4. Click "Add Items to Inventory"

### Adding Multiple Items

1. Enter player address
2. Click "+ Add Item" for each additional item
3. Configure each item (type, level, quantity)
4. Remove items with "✕" button if needed
5. Click "Add Items to Inventory"

### Item Types and Levels

**Multi-Level Items (Levels 1-3):**
- Extra Lives
- Force Field
- Orb Level
- Slow Time
- Coin Tractor Beam

**Single-Level Items (Level 1 only):**
- Destroy All Enemies
- Boss Kill Shot

## ⚠️ Troubleshooting

### "Wallet API not loaded"

**Solution:** Ensure you're accessing the page from `http://localhost:8000` (not `file://`). The wallet module needs to be loaded from the same origin.

### "Wrong wallet connected"

**Solution:** 
1. Click "Disconnect"
2. Make sure your wallet extension has the admin wallet account selected
3. Click "Connect Wallet" again
4. Select the correct wallet account

### "Admin wallet not connected"

**Solution:**
- Ensure `GAME_WALLET_PRIVATE_KEY` is set in `backend/.env.local`
- Restart backend server after setting environment variable
- Verify the wallet address matches the private key

### "Failed to initialize wallet API"

**Solution:**
- Check browser console for detailed errors
- Ensure wallet module bundle exists at `wallet-module/dist/wallet-api.umd.cjs`
- Verify backend is running and accessible at `http://localhost:3000`

### Transaction Fails

**Solution:**
- Check backend console logs for detailed error
- Verify admin capability object ID is correct
- Ensure admin wallet has sufficient SUI for gas fees
- Check that Premium Store object ID is correct

## 📊 Transaction Details

After a successful operation, you'll see:
- ✅ Success message
- Transaction digest (for on-chain verification)
- Number of items added

You can verify the transaction on Sui Explorer using the digest.

## 🔍 Verification

### Verify Items Were Added

1. Check the player's inventory via:
   ```
   GET http://localhost:3000/api/store/inventory/{playerAddress}
   ```
2. Or check on-chain using the transaction digest in Sui Explorer

### Verify Admin Wallet

The admin wallet address is displayed when you connect. You can also verify it matches your backend configuration:

```powershell
# Get admin wallet address from backend
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/verify-wallet"
```

## 🎯 Best Practices

1. **Always verify player address** before adding items
2. **Start with small quantities** for testing
3. **Keep transaction digests** for audit trail
4. **Use the web UI** for manual operations (easier than API)
5. **Use direct API** for automated scripts/integrations
6. **Monitor backend logs** for all operations
7. **Review on-chain events** periodically

## 📝 Notes

- The web UI automatically handles wallet connection and verification
- All transactions are signed by the admin wallet (gas fees paid by admin)
- Items are added immediately on-chain (no pending state)
- The form resets after successful submission
- Multiple items can be added in a single transaction

---

**For API-based access, see:** [STORE_ADMIN_AUTH_USAGE.md](./STORE_ADMIN_AUTH_USAGE.md)

