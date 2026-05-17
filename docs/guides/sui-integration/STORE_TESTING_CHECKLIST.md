# Premium Store Testing Checklist

## ✅ Prerequisites (What You've Done)

- [x] Contract deployed to testnet
- [x] MEWS token created for testnet
- [x] MEWS minted to user wallet
- [x] Backend .env updated with MEWS_TOKEN_TYPE_ID

## 🔧 Backend Environment Variables Needed

Add these to your `backend/.env` file:

```bash
# Network (set to testnet)
SUI_NETWORK=testnet
# OR
SUI_TESTNET_NETWORK=true

# Premium Store Contract (from deployment)
PREMIUM_STORE_CONTRACT_TESTNET=<package_id_from_deployment>
PREMIUM_STORE_OBJECT_ID_TESTNET=<premium_store_object_id_from_init>

# Admin Capability (after calling create_admin_capability)
ADMIN_CAPABILITY_OBJECT_ID_TESTNET=<admin_capability_object_id>

# MEWS Price (optional - for price conversion)
MEWS_PRICE_USD=0.001  # Set to actual MEWS price in USD

# Existing variables (should already be set)
MEWS_TOKEN_TYPE_ID=<your_mews_token_type_id>
GAME_WALLET_PRIVATE_KEY=<admin_wallet_private_key>
```

### How to Get These Values:

1. **Package ID**: From contract deployment output
   ```bash
   sui client publish --gas-budget 10000000
   # Look for "Published Objects" -> "packageId"
   ```

2. **PremiumStore Object ID**: From `init()` function execution
   - After deployment, the `init()` function automatically creates the PremiumStore object
   - Check the transaction effects to find the created object ID
   - Or query: `sui client object <object_id>`

3. **Admin Capability Object ID**: After calling `create_admin_capability()`
   ```bash
   sui client call \
     --package <package_id> \
     --module premium_store \
     --function create_admin_capability \
     --args <admin_address> \
     --gas-budget 10000000
   # The created object ID will be in the transaction effects
   ```

## 🧪 Testing Steps

### 1. Backend API Testing

#### Test 1.1: Get Store Items
```bash
curl http://localhost:3000/api/store/items
```
**Expected:** Returns item catalog with prices in SUI, MEWS, and USDC

#### Test 1.2: Get Inventory (Empty)
```bash
curl http://localhost:3000/api/store/inventory/<your_wallet_address>
```
**Expected:** Returns empty inventory `{}`

#### Test 1.3: Build Purchase Transaction
```bash
curl -X POST http://localhost:3000/api/store/purchase \
  -H "Content-Type: application/json" \
  -d '{
    "playerAddress": "<your_wallet_address>",
    "items": [
      {
        "itemId": "extraLives",
        "level": 1,
        "quantity": 1
      }
    ],
    "paymentToken": "MEWS"
  }'
```
**Expected:** Returns unsigned transaction bytes, gas estimate, and total price

#### Test 1.4: Verify Transaction Status
```bash
curl http://localhost:3000/api/store/transaction/<transaction_digest>
```
**Expected:** Returns transaction status (exists, confirmed)

### 2. Frontend Integration Testing

#### Test 2.1: Update Inventory Manager
- [ ] Update `src/game/systems/store/inventory-manager.js` to call `GET /api/store/inventory/:address`
- [ ] Remove localStorage logic
- [ ] Add error handling for API failures

#### Test 2.2: Update Store UI
- [ ] Update `src/game/systems/ui/store-ui.js` to call `POST /api/store/purchase`
- [ ] Integrate wallet signing for purchase transactions
- [ ] Handle transaction submission and confirmation
- [ ] Update UI after successful purchase

#### Test 2.3: Update Item Consumption
- [ ] Update `src/game/systems/store/item-consumption.js` to call `POST /api/store/consume`
- [ ] Call consume API when game starts with selected items
- [ ] Handle consumption errors gracefully

### 3. End-to-End Testing

#### Test 3.1: Purchase Flow
1. Open store UI
2. Select an item (e.g., Extra Lives Level 1)
3. Choose payment token (MEWS)
4. Click purchase
5. Sign transaction in wallet
6. Wait for confirmation
7. Verify inventory updated

#### Test 3.2: Inventory Query
1. After purchase, check inventory
2. Verify item appears in inventory
3. Check consumption modal shows item

#### Test 3.3: Consumption Flow
1. Start game
2. Select item from consumption modal
3. Start game
4. Verify item is consumed (check inventory decreased)
5. Verify item works in game

### 4. Contract Testing

#### Test 4.1: Purchase Item (Direct Contract Call)
```bash
sui client call \
  --package <package_id> \
  --module premium_store \
  --function purchase_item \
  --args <premium_store_object_id> <clock_object_id> <player_address> <item_type> <item_level> <quantity> <amount_paid> <payment_token> \
  --gas-budget 10000000
```

#### Test 4.2: Query Inventory (Direct Contract Call)
```bash
sui client call \
  --package <package_id> \
  --module premium_store \
  --function get_inventory_item_count \
  --args <premium_store_object_id> <player_address> <item_type> <item_level>
```

#### Test 4.3: Consume Item (Admin)
```bash
sui client call \
  --package <package_id> \
  --module premium_store \
  --function consume_item \
  --args <admin_capability_object_id> <premium_store_object_id> <clock_object_id> <player_address> <item_type> <item_level> <quantity> \
  --gas-budget 10000000
```

## 🐛 Common Issues & Solutions

### Issue 1: "Premium store contract not configured"
**Solution:** Set `PREMIUM_STORE_CONTRACT_TESTNET` in backend .env

### Issue 2: "Premium store object ID not configured"
**Solution:** Set `PREMIUM_STORE_OBJECT_ID_TESTNET` in backend .env (from init function)

### Issue 3: "Admin capability not configured"
**Solution:** 
1. Call `create_admin_capability()` function
2. Set `ADMIN_CAPABILITY_OBJECT_ID_TESTNET` in backend .env

### Issue 4: "Failed to fetch token prices"
**Solution:** 
- Check CoinGecko API is accessible
- Set `MEWS_PRICE_USD` if MEWS not on CoinGecko
- Check network connectivity

### Issue 5: "Insufficient balance"
**Solution:** 
- Ensure wallet has MEWS tokens
- Check token type ID is correct
- Verify decimals (MEWS uses 9 decimals)

### Issue 6: Transaction building fails
**Solution:**
- Verify contract addresses are correct
- Check item type mapping matches contract
- Ensure payment token is supported (SUI, MEWS, USDC)

## 📝 Notes

- **Price Conversion:** MEWS price may need to be set manually via `MEWS_PRICE_USD` if not on CoinGecko
- **Gas Fees:** Player pays gas for purchases, admin pays gas for consumption
- **Network:** Ensure backend and frontend are using the same network (testnet)
- **Wallet:** Frontend wallet must be connected to testnet

## ✅ Ready to Test When:

- [ ] All backend environment variables set
- [ ] Backend server running (`npm run dev` in backend/)
- [ ] Frontend updated to use new API endpoints
- [ ] Wallet connected to testnet
- [ ] Wallet has MEWS tokens
- [ ] Contract deployed and initialized

