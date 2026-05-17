# Token Gatekeeping Strategy

## 🔒 Overview

This section covers implementing a token requirement system where players must hold a minimum amount of your game token to access gameplay. This is useful for:

- **Monetization:** Require token purchase to play
- **Community Building:** Reward early supporters
- **Anti-Bot Protection:** Require economic stake

**Your Configuration:**
- **Token:** $Mews token
- **Minimum Balance:** 500,000 $Mews (500,000,000 with 9 decimals)
- **Gate Location:** Main Menu (after wallet connection)
- **Enforcement:** Hard gate (required to start game)

---

## Architecture

```
┌─────────────────────────────────────────┐
│    Front Page (Click "Enter Game")      │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│         Main Menu Appears                │
│    - Shows wallet connection UI         │
│    - "Start Game" button disabled       │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│    User Clicks "Connect Wallet"         │
│    (In Main Menu)                        │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│    Check Wallet Connection              │
│    (Must be connected to proceed)       │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│    Query Token Balance (Frontend)       │
│    - Direct RPC call to Sui             │
│    - Or backend API call                │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│    Compare Balance vs Requirement       │
│    - Minimum tokens required            │
│    - Check multiple token types?        │
└─────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
   ✅ Sufficient            ❌ Insufficient
        │                       │
        ▼                       ▼
┌───────────────┐    ┌──────────────────────┐
│  Allow Play   │    │  Show Error Message  │
│  Start Game   │    │  Show Token Amount   │
│               │    │  Provide Purchase Link│
└───────────────┘    └──────────────────────┘
```

---

## Implementation Steps

### Step 1: Configure Token Requirements

**Backend Configuration (`backend/.env`):**

```env
# Token Gatekeeping Configuration
MEWS_TOKEN_TYPE_ID=YOUR_MEWS_TOKEN_TYPE_ID  # Your $Mews token type ID
MIN_TOKEN_BALANCE=500000000  # 500,000 $Mews (with 9 decimals)
ENABLE_TOKEN_GATE=true  # Toggle gatekeeping on/off
```

**Frontend Configuration (`public/config.js`):**

```javascript
window.APP_CONFIG = {
  // ... other config ...
  MEWS_TOKEN_TYPE_ID: 'YOUR_MEWS_TOKEN_TYPE_ID',
  MIN_TOKEN_BALANCE: 500000000,  // 500,000 with 9 decimals
  ENABLE_TOKEN_GATE: true
};
```

### Step 2: Backend Token Balance API

**Already Implemented:** See `03-sui-sdk-integration.md` - `SuiService.getTokenBalance()`

**Backend Route:** `GET /api/tokens/balance/:walletAddress`

**Implementation:** Already documented in `03-sui-sdk-integration.md` (lines 94-126 and 550-590)

**Example Response:**
```json
{
  "address": "0x...",
  "totalBalance": "500000000",
  "coinType": "0x...",
  "hasMinimumBalance": true,
  "formatted": "500,000 $Mews"
}
```

### Step 3: Frontend Token Balance Check

**Already Implemented:** See `04-frontend-integration.md` - `APIClient.checkTokenBalance()`

**Implementation:** Already documented in `04-frontend-integration.md` (lines 295-338)

**Key Functions:**
- `checkTokenBalance(walletAddress)` - Check balance via API
- `checkTokenBalanceAndUpdateUI(walletAddress)` - Check and update UI
- `formatTokenBalance(balance)` - Format for display

### Step 4: UI Integration in Main Menu

**Already Implemented:** See `04-frontend-integration.md` - Wallet connection UI

**Implementation:** Already documented in `04-frontend-integration.md` (lines 488-750)

**Key Functions:**
- `initializeWalletOnMenu()` - Initialize wallet connection in main menu
- `connectWalletPrompt()` - Handle wallet connection
- `checkTokenBalanceAndUpdateUI()` - Check balance and update UI
- `showWalletConnectedState()` - Show connected state
- `showWalletInsufficientState()` - Show insufficient balance
- `startGame()` - Modified to check balance before starting

### Step 5: Game Start Validation

**Implementation:** `startGame()` function modified to check balance

**Flow:**
1. User clicks "Start Game"
2. Check if wallet is connected
3. Check token balance (500,000 $Mews minimum)
4. If sufficient → Start game
5. If insufficient → Show error message, disable "Start Game" button

**Code Location:** `04-frontend-integration.md` (lines 773-825)

---

## Configuration Options

### Configuration Levels:

1. **Disabled:** No token requirement (for testing/public access)
2. **Soft Gate:** Check balance but allow with warning
3. **Hard Gate:** Require balance to start game (recommended) ✅ **Your Setup: Hard Gate**

**Important:** Your game uses "tiers" to refer to **difficulty levels** (Tier 1-4 as you progress through bosses), **NOT** token access levels. 

**Game Tiers (Difficulty):**
- **Tier 1** = 0 bosses defeated (start of game)
- **Tier 2** = 1 boss defeated
- **Tier 3** = 2 bosses defeated
- **Tier 4** = 3+ bosses defeated (capped at 4)
- **Formula:** `tier = Math.min(4, bossesDefeated + 1)` - **No overlap!**
- Used for: Boss difficulty, scoring, performance burn rewards

**Token Access:** Single requirement (500,000 $Mews) for all players - no access tiers!

See [TIER_SYSTEM.md](./TIER_SYSTEM.md) for full clarification.

### Environment Variables:

**Backend (`backend/.env`):**
```env
# Enable/disable gatekeeping
ENABLE_TOKEN_GATE=true

# Token configuration ($Mews)
MEWS_TOKEN_TYPE_ID=YOUR_MEWS_TOKEN_TYPE_ID  # Your $Mews token type ID
MIN_TOKEN_BALANCE=500000000  # 500,000 $Mews (with 9 decimals)
```

**Frontend (`public/config.js`):**
```javascript
window.APP_CONFIG = {
  MEWS_TOKEN_TYPE_ID: 'YOUR_MEWS_TOKEN_TYPE_ID',
  MIN_TOKEN_BALANCE: 500000000,  // 500,000 with 9 decimals
  ENABLE_TOKEN_GATE: true
};
```

**Note:** For MVP, we're using a single token ($Mews) with a single minimum (500,000). 

**Clarification:** "Game tiers" (1-4) refer to difficulty levels in your game, not token access. All players need the same token amount (500,000 $Mews) regardless of their skill level or game tier reached.

---

## Testing Checklist

### **Frontend Testing:**
- [ ] Wallet connected, sufficient balance (≥500,000 $Mews) → "Start Game" button enabled
- [ ] Wallet connected, insufficient balance (<500,000 $Mews) → "Start Game" button disabled, error message shown
- [ ] No wallet connected → "Connect Wallet" button shown, "Start Game" disabled
- [ ] Token balance displayed correctly in main menu
- [ ] Balance updates when wallet connects
- [ ] Network error → Fallback behavior (show error, disable game start)
- [ ] Balance format displays correctly (e.g., "500,000 $Mews")

### **Backend Testing:**
- [ ] `/api/tokens/balance/:address` returns correct balance
- [ ] API correctly identifies insufficient balance
- [ ] API correctly identifies sufficient balance
- [ ] Error handling for invalid addresses
- [ ] Error handling for network failures

### **Integration Testing:**
- [ ] Full flow: Connect wallet → Check balance → Enable/disable "Start Game"
- [ ] Balance check happens before game starts
- [ ] Balance check happens when wallet connects
- [ ] UI updates correctly based on balance state

---

## Integration Checklist

### **Configuration:**
- [ ] `MEWS_TOKEN_TYPE_ID` set in backend `.env`
- [ ] `MEWS_TOKEN_TYPE_ID` set in frontend `config.js`
- [ ] `MIN_TOKEN_BALANCE=500000000` set in backend `.env`
- [ ] `MIN_TOKEN_BALANCE=500000000` set in frontend `config.js`
- [ ] `ENABLE_TOKEN_GATE=true` set in both

### **Backend Implementation:**
- [ ] `SuiService.getTokenBalance()` implemented (see `03-sui-sdk-integration.md`)
- [ ] `/api/tokens/balance/:walletAddress` route created (see `03-sui-sdk-integration.md`)
- [ ] Error handling for blockchain queries
- [ ] Returns correct balance format

### **Frontend Implementation:**
- [ ] `APIClient.checkTokenBalance()` implemented (see `04-frontend-integration.md`)
- [ ] `checkTokenBalanceAndUpdateUI()` implemented (see `04-frontend-integration.md`)
- [ ] Wallet connection UI in main menu (see `04-frontend-integration.md`)
- [ ] `startGame()` modified to check balance (see `04-frontend-integration.md`)
- [ ] Balance display in UI
- [ ] Error handling for network failures
- [ ] "Start Game" button enable/disable logic

### **Testing:**
- [ ] Test with testnet $Mews tokens
- [ ] Test with sufficient balance (≥500,000)
- [ ] Test with insufficient balance (<500,000)
- [ ] Test with no wallet connected
- [ ] Test error scenarios (network failures, invalid addresses)
- [ ] Production token type configured (mainnet)

---

## Code References

**Implementation is already documented in other sections:**

1. **Backend Token Balance Service:** 
   - `03-sui-sdk-integration.md` - `SuiService.getTokenBalance()` (lines 94-126)
   - `03-sui-sdk-integration.md` - API route `/api/tokens/balance/:walletAddress` (lines 550-590)

2. **Frontend Token Balance Check:**
   - `04-frontend-integration.md` - `APIClient.checkTokenBalance()` (lines 295-338)
   - `04-frontend-integration.md` - `checkTokenBalanceAndUpdateUI()` (lines 637-680)

3. **UI Integration:**
   - `04-frontend-integration.md` - Wallet connection UI in main menu (lines 488-750)
   - `04-frontend-integration.md` - Modified `startGame()` function (lines 773-825)

4. **Token Balance Display:**
   - `04-frontend-integration.md` - `formatTokenBalance()` (lines 707-716)
   - `04-frontend-integration.md` - UI states (connected, insufficient, disconnected)

**All code is ready to implement - just follow the examples in the referenced documents!**

---

## 🔄 Next Steps

- [04. Frontend Integration](./04-frontend-integration.md) - Implement wallet connection first
- [06. Testing & Deployment](./06-testing-deployment.md) - Test token gatekeeping
- [08. Security Considerations](./08-security-considerations.md) - Secure token checks

---

**Note:** All implementation code is already documented in:
- `03-sui-sdk-integration.md` - Backend token balance service and API
- `04-frontend-integration.md` - Frontend wallet connection and token balance checking

**This document serves as an overview and checklist. Follow the referenced documents for actual implementation!**

---

**Related Documents:**
- [Frontend Integration](./04-frontend-integration.md)
- [Security Considerations](./08-security-considerations.md)

