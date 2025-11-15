# Premium Store API Testing Guide

> **Note:** This guide uses PowerShell commands. If you're using bash/Linux, you can use `curl` commands instead, but the examples here are optimized for Windows PowerShell.

## Prerequisites

1. **Backend server running:**
   ```powershell
   cd backend
   npm run dev
   ```
   Server should start on `http://localhost:3000` (or PORT from .env)

2. **Environment variables set** in `backend/.env`:
   - `PREMIUM_STORE_CONTRACT_TESTNET`
   - `PREMIUM_STORE_OBJECT_ID_TESTNET`
   - `PREMIUM_STORE_ADMIN_CAPABILITY_OBJECT_ID_TESTNET`
   - `MEWS_TOKEN_TYPE_ID_TESTNET`
   - `SUI_NETWORK=testnet`

3. **Your wallet address** (for testing)

---

## Test 1: Get Store Items (Catalog with Prices)

**Endpoint:** `GET /api/store/items`

**Command:**
```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/store/items -Method GET
```

**Expected Response:**
```json
{
  "success": true,
  "items": [
    {
      "id": "extraLives",
      "name": "Extra Lives",
      "description": "Start with additional lives beyond the default 3",
      "category": "defensive",
      "icon": "❤️",
      "levels": [
        {
          "level": 1,
          "usdPrice": 0.50,
          "effect": "+1 life",
          "description": "Start with 4 total lives (3 base + 1 purchased)",
          "prices": {
            "sui": {
              "amount": "230414746",  // Amount in smallest unit (9 decimals)
              "display": "0.230415"   // Human-readable
            },
            "mews": {
              "amount": "500000000",
              "display": "0.500000"
            },
            "usdc": {
              "amount": "500000",
              "display": "0.50"
            }
          }
        }
        // ... more levels
      ]
    }
    // ... more items
  ],
  "prices": {
    "sui": 2.17,    // Current SUI price in USD
    "mews": 0.001,  // MEWS price (from env or placeholder)
    "usdc": 1.0
  },
  "timestamp": 1234567890
}
```

**What to Check:**
- ✅ Response is successful
- ✅ All 7 items are present
- ✅ Prices are calculated correctly
- ✅ Token prices (SUI, MEWS, USDC) are included

**If it fails:**
- Check CoinGecko API is accessible
- Check `MEWS_PRICE_USD` is set if MEWS not on CoinGecko
- Check backend logs for errors

---

## Test 2: Get Player Inventory (Empty Initially)

**Endpoint:** `GET /api/store/inventory/:address`

**Command:**
```powershell
$address = "0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0"
Invoke-RestMethod -Uri "http://localhost:3000/api/store/inventory/$address" -Method GET
```

**Expected Response (Empty):**
```json
{
  "success": true,
  "address": "0x1234...",
  "inventory": {}
}
```

**Expected Response (After Purchase):**
```json
{
  "success": true,
  "address": "0x1234...",
  "inventory": {
    "extraLives_1": 2,
    "forceField_2": 1,
    "slowTime_3": 5
  }
}
```

**What to Check:**
- ✅ Response is successful
- ✅ Returns empty object initially
- ✅ Address format is validated

**If it fails:**
- Check address format (must be 0x + 64 hex chars = 66 total)
- Check `PREMIUM_STORE_OBJECT_ID_TESTNET` is set
- Check backend logs

---

## Test 3: Build Purchase Transaction

**Endpoint:** `POST /api/store/purchase`

**Command:**
```powershell
$body = @{
    playerAddress = "0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0"
    items = @(
        @{
            itemId = "extraLives"
            level = 1
            quantity = 1
        }
    )
    paymentToken = "MEWS"
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:3000/api/store/purchase -Method POST -Body $body -ContentType "application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "transaction": "AAACAAgAAAAAAAAAAAAAAA...",  // Base64 encoded transaction bytes
  "gasEstimate": "11500000",
  "totalUSD": "0.50",
  "totalToken": "500000000",  // Amount in smallest unit (9 decimals for MEWS)
  "paymentToken": "MEWS",
  "items": [
    {
      "itemId": "extraLives",
      "level": 1,
      "quantity": 1
    }
  ],
  "playerAddress": "0x1234..."
}
```

**What to Check:**
- ✅ Transaction bytes are returned
- ✅ Gas estimate is reasonable
- ✅ Total price is correct
- ✅ Token amount matches USD price

**If it fails:**
- Check `PREMIUM_STORE_CONTRACT_TESTNET` is set
- Check `PREMIUM_STORE_OBJECT_ID_TESTNET` is set
- Check item IDs match catalog
- Check payment token is valid (SUI, MEWS, or USDC)

**Multiple Items Example:**
```powershell
$body = @{
    playerAddress = "0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0"
    items = @(
        @{
            itemId = "extraLives"
            level = 1
            quantity = 2
        },
        @{
            itemId = "slowTime"
            level = 2
            quantity = 1
        }
    )
    paymentToken = "SUI"
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:3000/api/store/purchase -Method POST -Body $body -ContentType "application/json"
```

---

## Test 4: Check Transaction Status

**Endpoint:** `GET /api/store/transaction/:digest`

**Command:**
```powershell
# Replace with actual transaction digest
$digest = "<transaction_digest>"
Invoke-RestMethod -Uri "http://localhost:3000/api/store/transaction/$digest" -Method GET
```

**Example:**
```powershell
$digest = "ABC123DEF456..."
Invoke-RestMethod -Uri "http://localhost:3000/api/store/transaction/$digest" -Method GET
```

**Expected Response:**
```json
{
  "success": true,
  "digest": "ABC123...",
  "exists": true,
  "confirmed": true
}
```

**What to Check:**
- ✅ Transaction exists on blockchain
- ✅ Status is confirmed

---

## Test 5: Consume Items (Admin Only)

**Endpoint:** `POST /api/store/consume`

**Note:** This requires admin wallet to sign. The backend will use the admin wallet.

**Command:**
```powershell
$body = @{
    playerAddress = "0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0"
    items = @(
        @{
            itemId = "extraLives"
            level = 1
            quantity = 1
        }
    )
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:3000/api/store/consume -Method POST -Body $body -ContentType "application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "digest": "XYZ789...",
  "playerAddress": "0x1234...",
  "items": [
    {
      "itemId": "extraLives",
      "level": 1,
      "quantity": 1
    }
  ],
  "gasPaidBy": "admin_wallet",
  "message": "Items consumed successfully. Admin wallet paid gas fees."
}
```

**What to Check:**
- ✅ Items are consumed from inventory
- ✅ Transaction digest is returned
- ✅ Admin wallet pays gas

**If it fails:**
- Check `PREMIUM_STORE_ADMIN_CAPABILITY_OBJECT_ID_TESTNET` is set
- Check admin wallet has SUI for gas
- Check player has items in inventory

---

## Testing with Postman

### Setup:
1. Create a new collection "Premium Store API"
2. Set base URL: `http://localhost:3000`

### Requests:

1. **Get Items**
   - Method: `GET`
   - URL: `/api/store/items`

2. **Get Inventory**
   - Method: `GET`
   - URL: `/api/store/inventory/0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0`

3. **Purchase**
   - Method: `POST`
   - URL: `/api/store/purchase`
   - Headers: `Content-Type: application/json`
   - Body (JSON):
     ```json
     {
       "playerAddress": "0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0",
       "items": [
         {
           "itemId": "extraLives",
           "level": 1,
           "quantity": 1
         }
       ],
       "paymentToken": "MEWS"
     }
     ```

4. **Check Transaction**
   - Method: `GET`
   - URL: `/api/store/transaction/{{tx_digest}}`

5. **Consume Items**
   - Method: `POST`
   - URL: `/api/store/consume`
   - Body (JSON):
     ```json
     {
       "playerAddress": "0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0",
       "items": [
         {
           "itemId": "extraLives",
           "level": 1,
           "quantity": 1
         }
       ]
     }
     ```

---

## Testing with JavaScript/Fetch

```javascript
// Get items
async function testGetItems() {
  const response = await fetch('http://localhost:3000/api/store/items');
  const data = await response.json();
  console.log('Items:', data);
}

// Get inventory
async function testGetInventory(address) {
  const response = await fetch(`http://localhost:3000/api/store/inventory/${address}`);
  const data = await response.json();
  console.log('Inventory:', data);
}

// Build purchase transaction
async function testPurchase(playerAddress, items, paymentToken) {
  const response = await fetch('http://localhost:3000/api/store/purchase', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      playerAddress,
      items,
      paymentToken,
    }),
  });
  const data = await response.json();
  console.log('Purchase transaction:', data);
  return data;
}

// Usage
testGetItems();
testGetInventory('0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0');
testPurchase(
  '0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0',
  [{ itemId: 'extraLives', level: 1, quantity: 1 }],
  'MEWS'
);
```

---

## Common Issues & Solutions

### Issue: "Premium store contract not configured"
**Solution:** Set `PREMIUM_STORE_CONTRACT_TESTNET` in `.env`

### Issue: "Premium store object ID not configured"
**Solution:** Set `PREMIUM_STORE_OBJECT_ID_TESTNET` in `.env`

### Issue: "Failed to fetch token prices"
**Solution:** 
- Check internet connection
- Set `MEWS_PRICE_USD` if MEWS not on CoinGecko
- Check CoinGecko API is accessible

### Issue: "Invalid address format"
**Solution:** Address must be `0x` + 64 hex characters (66 total)

### Issue: "Invalid item or level"
**Solution:** Check item IDs match catalog:
- `extraLives`, `forceField`, `orbLevel`, `slowTime`, `destroyAll`, `bossKillShot`, `coinTractorBeam`
- Levels must be 1, 2, or 3 (except `destroyAll` and `bossKillShot` which are level 1 only)

### Issue: CORS errors
**Solution:** Check `CORS_ORIGIN` in `.env` or backend config allows your origin

---

## Full Test Flow

1. **Get items** → Verify catalog loads
2. **Get inventory** → Should be empty initially
3. **Build purchase** → Get transaction bytes
4. **Sign & submit transaction** → Use wallet API (frontend)
5. **Check transaction status** → Verify it's confirmed
6. **Get inventory again** → Should show purchased items
7. **Consume items** → Test admin consumption
8. **Get inventory again** → Should show decreased counts

---

## Next Steps

After API testing works:
1. **Frontend Integration** - Update store UI to use these endpoints
2. **Wallet Integration** - Sign and submit purchase transactions
3. **End-to-End Testing** - Full purchase flow from UI

