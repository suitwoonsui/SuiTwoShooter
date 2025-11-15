# Admin Add Items - Security Guide

## 🎯 Overview

The `admin_add_items` function allows authorized admins to add items to player inventories. This is useful for:
- **Testing:** Giving test accounts items for QA
- **Promotions:** Rewarding players with free items
- **Refunds:** Compensating players for issues
- **Corrections:** Fixing inventory errors

## 🔒 Security Features

### 1. **Admin Capability Requirement**
- Only the admin wallet can call this function
- Requires `AdminCapability` object (same as consumption)
- Prevents unauthorized access at the blockchain level

### 2. **Input Validation**
- Validates item types (0-6)
- Validates item levels (1-3 for multi-level, 1 for single-level)
- Validates quantity (must be > 0)
- Prevents invalid data from being processed

### 3. **Audit Trail**
- All operations emit `InventoryUpdated` events
- Events include: player address, item type, level, quantity, timestamp
- Events are permanently recorded on-chain
- Can be queried for compliance/auditing

### 4. **Backend Protection**
- API endpoint requires API key authentication (`API_KEY` environment variable)
- Wallet address verification (frontend and backend verify admin wallet)
- Server-side API key stored in backend environment (not exposed to browser)
- All admin operations are logged

## 📋 Usage

### Smart Contract Function

```move
public entry fun admin_add_items(
    _admin_cap: &AdminCapability,  // Admin capability - proves caller is admin
    store: &mut PremiumStore,
    clock: &Clock,
    player: address,
    item_type: u8,
    item_level: u8,
    quantity: u64,
    ctx: &mut TxContext
)
```

### Web UI (Recommended)

The easiest way to add items is through the web UI:

**Access:** `http://localhost:8000/admin-add-items.html`

**Features:**
- ✅ Wallet authentication (requires admin wallet connection)
- ✅ Visual form for selecting items and quantities
- ✅ Real-time wallet verification
- ✅ Transaction confirmation with digest
- ✅ No API key needed in browser (handled server-side)

**How to Use:**
1. Navigate to `http://localhost:8000/admin-add-items.html`
2. Connect your admin wallet (must match `GAME_WALLET_PRIVATE_KEY` from backend)
3. Enter player address
4. Select items, levels, and quantities
5. Click "Add Items to Inventory"
6. Transaction is signed and executed automatically

**Security:**
- Frontend verifies connected wallet matches admin wallet
- Backend verifies wallet address in request matches admin wallet
- API key authentication handled server-side
- Only admin wallet can successfully add items

### Backend API Endpoint

**POST** `/api/admin/add-items` (server-side proxy, no API key needed)

**POST** `/api/store/admin/add-items` (direct API, requires API key)

**Request Body:**
```json
{
  "playerAddress": "0x...",
  "items": [
    {
      "itemId": "extraLives",
      "level": 2,
      "quantity": 5
    },
    {
      "itemId": "forceField",
      "level": 3,
      "quantity": 1
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "digest": "0x...",
  "message": "Successfully added 2 item(s) to inventory"
}
```

### PowerShell Example (Direct API with API Key)

```powershell
# Get API key from backend/.env.local
$apiKey = "your-api-key-here"

$body = @{
    playerAddress = "0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0"
    items = @(
        @{
            itemId = "extraLives"
            level = 2
            quantity = 5
        }
    )
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/store/admin/add-items" `
    -Method POST `
    -Headers @{ 
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $apiKey"
    } `
    -Body $body
```

### PowerShell Example (Server-Side Proxy - No API Key Needed)

```powershell
# Use the server-side proxy endpoint (automatically handles API key)
# Note: This endpoint also requires adminWalletAddress in the request body
# The admin wallet must be connected and verified

$body = @{
    playerAddress = "0x6e30e535c66f646f01cfe5383213771c2c83bdc17f6252c24332c362025459f0"
    adminWalletAddress = "0x<your-admin-wallet-address>"
    items = @(
        @{
            itemId = "extraLives"
            level = 2
            quantity = 5
        }
    )
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/admin/add-items" `
    -Method POST `
    -Headers @{ "Content-Type" = "application/json" } `
    -Body $body
```

**Note:** The server-side proxy (`/api/admin/add-items`) is primarily for the web UI. For direct API access, use `/api/store/admin/add-items` with API key authentication.

## ⚠️ Security Best Practices

### 1. **Protect the API Endpoint**
- ✅ API key authentication implemented (`API_KEY` environment variable)
- ✅ Wallet address verification (frontend and backend)
- ✅ Log all admin operations
- ✅ Monitor for suspicious activity

### 2. **Limit Access**
- Only grant admin access to trusted personnel
- Use separate admin accounts for different purposes
- Rotate admin credentials regularly
- Use multi-factor authentication if possible

### 3. **Audit and Monitoring**
- Log all admin operations with:
  - Admin identity
  - Player address
  - Items added
  - Timestamp
  - Reason/justification
- Set up alerts for unusual activity
- Review logs regularly

### 4. **Rate Limiting**
- Limit number of items that can be added per request
- Limit number of requests per admin per time period
- Prevent bulk operations that could be abused

### 5. **Validation**
- Double-check player addresses before adding items
- Verify item IDs and levels are correct
- Confirm quantities are reasonable
- Consider requiring approval for large quantities

## 🔍 Monitoring

### On-Chain Events

All `admin_add_items` operations emit `InventoryUpdated` events that can be queried:

```typescript
// Query events for a specific player
const events = await client.queryEvents({
  query: {
    MoveEventType: `${packageId}::premium_store::InventoryUpdated`,
    MoveEventField: { player: playerAddress }
  }
});
```

### Backend Logging

The backend logs all admin operations:
- `🎁 [ADMIN ADD]` - Operation started
- `🔧 [ADMIN ADD]` - Item details
- `✅ [ADMIN ADD]` - Success
- `❌ [ADMIN ADD]` - Failure

## 🚨 Security Checklist

Before deploying to production:

- [x] Add authentication to `/api/store/admin/add-items` endpoint (API key)
- [x] Implement admin authorization check (wallet address verification)
- [x] Create web UI with wallet authentication
- [ ] Add rate limiting (optional for MVP)
- [x] Set up audit logging (backend logs + on-chain events)
- [ ] Configure monitoring/alerts
- [x] Document admin procedures (this document)
- [ ] Train admin users on security
- [x] Test with small quantities first
- [x] Verify events are emitted correctly
- [ ] Review access logs regularly

## 📝 Implementation Details

### Authentication Flow

1. **Web UI Flow:**
   - User accesses `http://localhost:8000/admin-add-items.html`
   - Page loads wallet module and initializes
   - User connects admin wallet
   - Frontend verifies wallet matches admin address (from `/api/admin/verify-wallet`)
   - Form becomes available
   - On submit, sends request to `/api/admin/add-items` with `adminWalletAddress`
   - Backend verifies `adminWalletAddress` matches `GAME_WALLET_PRIVATE_KEY` address
   - Backend uses API key (from environment) to call store service
   - Transaction is signed and executed

2. **Direct API Flow:**
   - Client sends request to `/api/store/admin/add-items` with API key
   - Backend verifies API key
   - Backend uses admin wallet to sign transaction
   - Transaction is executed

### Environment Variables Required

**Backend (`backend/.env.local`):**
- `GAME_WALLET_PRIVATE_KEY` - Admin wallet private key (bech32 or hex format)
- `API_KEY` - API key for authentication
- `PREMIUM_STORE_ADMIN_CAPABILITY_OBJECT_ID_TESTNET` - Admin capability object ID
- `PREMIUM_STORE_OBJECT_ID_TESTNET` - Premium store object ID

## 🎯 Use Cases

### Testing
```json
{
  "playerAddress": "0x<test_account>",
  "items": [
    { "itemId": "extraLives", "level": 3, "quantity": 10 },
    { "itemId": "forceField", "level": 3, "quantity": 10 },
    { "itemId": "orbLevel", "level": 3, "quantity": 10 }
  ]
}
```

### Promotions
```json
{
  "playerAddress": "0x<player>",
  "items": [
    { "itemId": "slowTime", "level": 2, "quantity": 1 }
  ]
}
```

### Refunds
```json
{
  "playerAddress": "0x<player>",
  "items": [
    { "itemId": "extraLives", "level": 2, "quantity": 1 }
  ]
}
```

## ⚡ Quick Reference

**Item IDs:**
- `extraLives` (levels 1-3)
- `forceField` (levels 1-3)
- `orbLevel` (levels 1-3)
- `slowTime` (levels 1-3)
- `destroyAll` (level 1 only)
- `bossKillShot` (level 1 only)
- `coinTractorBeam` (levels 1-3)

**Error Codes:**
- `1` - Invalid item type
- `2` - Invalid item level
- `3` - Quantity must be positive

---

**Remember:** This is a powerful function that can modify player inventories. Always use with caution and proper authorization!

