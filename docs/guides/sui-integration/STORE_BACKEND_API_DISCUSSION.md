# Premium Store Backend API - Design Discussion

## 🎯 Overview

This document outlines the **backend API design** for the premium store system. We'll discuss:
- API endpoint structure
- Payment flow implementation
- Price conversion service
- Database/storage decisions
- Integration with existing patterns (score submission)
- Error handling and security
- Testing strategy

**Status:** Discussion Phase - Ready for Phase 5 implementation  
**Goal:** Agree on API design before building

---

## 📊 Current Pattern: Score Submission (Reference)

### Existing API Pattern:
```
POST /api/scores/submit
├── Request: { playerAddress, scoreData, playerName, sessionId }
├── Backend: AdminWalletService.submitScoreForPlayer()
├── Transaction: Admin wallet signs, admin pays gas
└── Response: { success, digest, gasPaidBy: "admin_wallet" }
```

### Key Characteristics:
- ✅ Admin wallet signs and pays gas
- ✅ No wallet popup for player
- ✅ Simple frontend (just POST request)
- ✅ Backend handles all blockchain interaction

**Question:** Should store API follow the same pattern?

---

## 🛒 Store API Endpoints (Proposed)

### 1. GET `/api/store/items`
**Purpose:** Get item catalog with current prices

**Request:**
```typescript
// No body needed, or optional query params:
?token=SUI|MEWS  // Optional: filter by payment token
```

**Response:**
```typescript
{
  success: true,
  items: [
    {
      id: 'extraLives',
      name: 'Extra Lives',
      description: 'Start with additional lives',
      levels: [
        {
          level: 1,
          priceUSD: 0.50,
          priceSUI: 0.25,  // Converted from USD
          priceMEWS: 100,  // Converted from USD
          priceUSDC: 0.50, // Converted from USD (1:1)
          effect: '+1 life'
        },
        // ... level 2, 3
      ],
      category: 'defensive',
      icon: '❤️'
    },
    // ... other items
  ],
  lastUpdated: '2024-01-15T10:30:00Z',
  priceSource: 'coingecko',
  cacheExpiresAt: '2024-01-15T10:35:00Z' // 5 minutes from lastUpdated
}
```

**Implementation:**
- Read from `item-catalog.js` (or database if migrated)
- **Backend caching:** In-memory cache (shared across all users)
  - Cache structure: `{ prices: {...}, timestamp: Date, expiresAt: Date }`
  - Cache duration: 5 minutes
- **When API is called:**
  1. Check if cache exists and is valid (not expired)
  2. If valid → Return cached prices (no CoinGecko call)
  3. If expired/missing → Fetch from CoinGecko, update cache, return new prices
- Convert USD prices to SUI/MEWS/USDC using CoinGecko API (only when cache expired)
- Return all items with current token prices (SUI, MEWS, USDC)
- Include `cacheExpiresAt` timestamp in response
- **Frontend:** 
  - Calls this endpoint when store opens
  - Polls this endpoint every 30-60 seconds while store is open
  - Backend handles all caching logic (frontend never calls CoinGecko directly)

**Error Handling:**
- If CoinGecko API fails: Return error response, don't use stale prices
- Frontend shows user-friendly error message
- User can retry or contact support

**Price Updates:**
- Frontend can poll this endpoint periodically (every 30-60 seconds) while store is open
- If prices change, update UI and notify user
- Price changes can be positive or negative (show both cases)

---

### 2. GET `/api/store/inventory/:address`
**Purpose:** Get player's inventory from blockchain

**Request:**
```typescript
GET /api/store/inventory/0x1234...
// No body
```

**Response:**
```typescript
{
  success: true,
  playerAddress: '0x1234...',
  inventory: {
    extraLives: { level1: 2, level2: 1, level3: 0 },
    forceField: { level1: 0, level2: 0, level3: 1 },
    orbLevel: { level1: 0, level2: 0, level3: 0 },
    slowTime: { level1: 0, level2: 1, level3: 0 },
    destroyAll: 0,
    bossKillShot: 1,
    coinTractorBeam: { level1: 0, level2: 0, level3: 2 }
  },
  lastUpdated: '2024-01-15T10:30:00Z',
  source: 'blockchain' // or 'cache' if cached
}
```

**Implementation:**
- Query `PlayerInventory` object from blockchain (via Sui Client)
- Parse inventory counts
- Return formatted inventory
- **Caching:** Cache blockchain query results (see Section 3 for caching strategy discussion)

**Decisions:**
1. **Caching:** ✅ Cache inventory until invalidated (see Section 3 for details)
2. **Missing Inventory:** ✅ Return empty inventory (not error) if player has no inventory object
3. **Purchase History:** ❌ No, just return current counts

---

### 3. POST `/api/store/purchase`
**Purpose:** Create purchase transaction (payment + purchase in one transaction)

**Request:**
```typescript
{
  playerAddress: '0x1234...',
  items: [
    { itemId: 'extraLives', level: 1, quantity: 2 },
    { itemId: 'slowTime', level: 3, quantity: 1 }
  ],
  paymentToken: 'SUI' | 'MEWS'
}
```

**Response:**
```typescript
{
  success: true,
  transaction: {
    // Sui Transaction object (unsigned)
    // Contains: payment transfer + purchase_item() call
  },
  totalUSD: 2.50,
  totalToken: 1.25, // SUI or MEWS amount
  needsSignature: true,
  contractAddress: '0x5678...', // Smart contract address
  gasEstimate: 0.001 // Estimated gas cost in SUI
}
```

**Implementation Flow:**
1. Validate request (items exist, quantities valid)
2. Calculate total price (USD → token conversion, lock price for transaction)
3. Get contract address and object IDs from config
4. Build Sui transaction:
   - Transfer payment token from player → contract (payment)
   - Call purchase_item() function (inventory update)
   - Both in same transaction (atomic)
5. Return unsigned transaction to frontend
6. Frontend prompts wallet for signature
7. Player signs transaction
8. Frontend submits transaction to blockchain
9. Frontend polls for confirmation
10. Purchase completes when transaction confirms

**Note:** Backend only builds transaction, doesn't execute it. Player's wallet executes.

**Questions:**
1. **Price Locking:** Lock price when building transaction? (Recommendation: Yes, price valid for 5 minutes)
2. **Transaction Expiry:** How long is transaction valid? (Recommendation: 5 minutes, standard Sui transaction expiry)
3. **Gas Estimation:** Should we estimate gas? (Recommendation: Yes, show player estimated cost)

---

### 4. GET `/api/store/transaction/:digest` (Optional)
**Purpose:** Check transaction status (if needed for polling)

**Request:**
```typescript
GET /api/store/transaction/0xabc123...
```

**Response:**
```typescript
{
  success: true,
  digest: '0xabc123...',
  status: 'pending' | 'success' | 'failure',
  effects: { /* Sui transaction effects */ },
  confirmed: true,
  timestamp: '2024-01-15T10:30:00Z'
}
```

**Implementation:**
- Query transaction from Sui blockchain
- Return transaction status and effects
- Frontend can use this to poll for confirmation

**Note:** Frontend can also poll directly using Sui Client, this endpoint is optional convenience.

---

### 5. POST `/api/store/consume`
**Purpose:** Consume items from inventory (when used in-game)

**Request:**
```typescript
{
  playerAddress: '0x1234...',
  items: [
    { itemId: 'slowTime', level: 3, quantity: 1 },
    { itemId: 'destroyAll', level: 1, quantity: 1 }
  ],
  gameSessionId: 'session_xyz789' // Optional: for tracking
}
```

**Response:**
```typescript
{
  success: true,
  consumed: [
    { itemId: 'slowTime', level: 3, quantity: 1 },
    { itemId: 'destroyAll', level: 1, quantity: 1 }
  ],
  remainingInventory: { /* updated inventory */ },
  transactionDigest: '0xdef...'
}
```

**Implementation:**
- Validate items exist in inventory (query blockchain first)
- Admin wallet calls `consume_item()` on smart contract
- Decrement inventory counts
- Return updated inventory

**Note:** This follows the same pattern as score submission (admin signs, admin pays gas)

**Questions:**
1. Should we batch consume multiple items? (Recommendation: Yes, one transaction)
2. Should we validate before consuming? (Recommendation: Yes, query inventory first)
3. What if consumption fails? (Recommendation: Return error, item not consumed)

---

## 💰 Payment Flow: Direct On-Chain Payment ✅ **DECISION MADE**

### Selected: Direct On-Chain Payment (Option B)

**Flow:**
```
1. User clicks "Purchase"
2. Backend creates transaction (payment + purchase)
3. User signs transaction with wallet
4. Payment and purchase happen atomically
5. Purchase completes immediately
```

**Pros:**
- ✅ Instant completion (no polling delay)
- ✅ Atomic (payment + purchase in one transaction)
- ✅ No polling needed
- ✅ No "I've Sent Payment" button needed
- ✅ Standard blockchain UX (what users expect)
- ✅ More transparent (player sees exactly what they're paying for)

**Cons:**
- ⚠️ Requires wallet popup (standard blockchain UX)
- ⚠️ Player needs SUI for gas (standard requirement)
- ⚠️ More complex frontend (wallet interaction needed)

**Implementation:**
- Backend builds transaction: payment transfer + purchase_item() call
- Backend returns transaction to frontend (unsigned)
- Frontend prompts wallet for signature
- Player signs transaction
- Transaction executes atomically on blockchain
- Frontend polls for transaction confirmation
- Purchase completes immediately

**Key Differences from Score Submission:**
- Player signs transaction (score submission: admin signs)
- Player pays gas (score submission: admin pays gas)
- Frontend handles wallet interaction (score submission: backend handles everything)
- This is acceptable - purchase is different from score submission (player is paying)

---

## 💱 Price Conversion Service

### Implementation Options:

#### Option 1: CoinGecko API (Recommended)
```typescript
// GET https://api.coingecko.com/api/v3/simple/price
?ids=sui,cat-in-a-dogs-world
&vs_currencies=usd

// Response:
{
  "sui": { "usd": 2.0 },
  "cat-in-a-dogs-world": { "usd": 0.01 }
}
```

**Pros:**
- ✅ Free tier available
- ✅ Reliable
- ✅ Supports SUI and custom tokens
- ✅ Good documentation

**Cons:**
- ⚠️ Rate limits (free tier: 10-50 calls/minute)
- ⚠️ Requires API key for higher limits

**Implementation:**
- Cache prices for 1-5 minutes
- Fallback to last known price if API fails
- Log price updates for debugging

#### Option 2: CoinMarketCap API
- Similar to CoinGecko
- May have different rate limits
- May require paid tier for custom tokens

#### Option 3: Custom Price Oracle
- Deploy on-chain price oracle
- More complex, but decentralized
- Future consideration

**Recommendation:** Start with CoinGecko, cache aggressively.

**Questions:**
1. **Cache Duration:** How long? (Recommendation: 1-5 minutes)
2. **Fallback:** What if API fails? (Recommendation: Use last known price, log error)
3. **Price Updates:** How often refresh? (Recommendation: On-demand + background refresh every 1-5 minutes)

---

## 🗄️ Storage/Database Decisions

### Purchase Request Storage:

#### Option 1: In-Memory (Recommended for MVP)
```typescript
// Simple Map/object in backend
const purchaseRequests = new Map<string, PurchaseRequest>();

// Structure:
interface PurchaseRequest {
  id: string;
  playerAddress: string;
  items: Array<{itemId, level, quantity}>;
  totalUSD: number;
  totalToken: number;
  paymentToken: 'SUI' | 'MEWS';
  status: 'pending' | 'completed' | 'expired';
  createdAt: Date;
  expiresAt: Date;
  transactionDigest?: string;
}
```

**Pros:**
- ✅ Simple (no database setup)
- ✅ Fast (in-memory access)
- ✅ Good for MVP/testing

**Cons:**
- ❌ Lost on server restart
- ❌ Not scalable (single server only)
- ❌ No persistence

**Recommendation:** Start with in-memory, migrate to database later.

#### Option 2: Database (PostgreSQL/MySQL)
- Persistent storage
- Scalable
- Can query purchase history
- More complex setup

**Recommendation:** Add database when needed (after MVP).

#### Option 3: Redis
- Fast (in-memory but persistent)
- Good for caching
- Can set TTL (auto-expire purchase requests)
- More complex than simple object

**Recommendation:** Consider Redis if we need persistence without full database.

**Questions:**
1. **Start with in-memory?** (Recommendation: Yes, for MVP)
2. **When to migrate to database?** (Recommendation: When we need persistence or scale)
3. **Purchase History:** Do we need it? (Recommendation: Not for MVP, add later)

---

## 🔐 Security Considerations

### 1. Input Validation
- Validate player address format (Sui address: 0x + 64 hex chars)
- Validate item IDs and levels (must exist in catalog)
- Validate quantities (positive integers, reasonable limits)
- Validate payment amounts (prevent overflow/underflow)

### 2. Payment Matching Security
- Match by: amount + player address + timestamp window
- Prevent duplicate matching (mark purchase as completed)
- Validate payment source (optional: verify from correct address)
- Handle edge cases (multiple payments, wrong amounts)

### 3. Rate Limiting
- Limit purchase requests per address (prevent spam)
- Limit API calls per IP (prevent abuse)
- Implement cooldown periods if needed

### 4. Admin Wallet Security
- Store admin wallet private key securely (environment variable)
- Never expose private key in logs or responses
- Rotate keys periodically
- Monitor for suspicious activity

### 5. Price Manipulation Prevention
- Lock prices at purchase request creation
- Validate prices haven't changed significantly
- Set price bounds (min/max) to prevent manipulation
- Log all price conversions for audit

**Questions:**
1. **Rate Limiting:** How strict? (Recommendation: 10 purchases/hour per address for MVP)
2. **Price Validation:** Reject if price changed >10%? (Recommendation: Yes, require new request)
3. **Admin Wallet:** Separate wallet for store vs scores? (Recommendation: Can use same, but consider separate for accounting)

---

## 🔄 Integration with Existing Patterns

### Following Score Submission Pattern:

**Similarities:**
- ✅ Admin wallet signs transactions
- ✅ Admin wallet pays gas fees
- ✅ Backend handles all blockchain interaction
- ✅ Simple frontend (just API calls)
- ✅ No wallet popup for player

**Differences:**
- ⚠️ Store needs payment processing (scores don't)
- ⚠️ Store needs price conversion (scores don't)
- ⚠️ Store needs purchase request tracking (scores don't)

**Recommendation:** Follow same pattern where possible, add payment layer on top.

---

## 📝 Error Handling

### Common Errors:

#### 1. Invalid Request
```typescript
{
  success: false,
  error: 'INVALID_REQUEST',
  message: 'Invalid player address format',
  code: 400
}
```

#### 2. Item Not Found
```typescript
{
  success: false,
  error: 'ITEM_NOT_FOUND',
  message: 'Item "invalidItem" does not exist',
  code: 404
}
```

#### 3. Insufficient Inventory
```typescript
{
  success: false,
  error: 'INSUFFICIENT_INVENTORY',
  message: 'Player does not have enough slowTime level 3',
  code: 400
}
```

#### 4. Payment Not Received
```typescript
{
  success: false,
  error: 'PAYMENT_NOT_RECEIVED',
  message: 'Payment not received within 10 minutes',
  code: 408
}
```

#### 5. Price Changed
```typescript
{
  success: false,
  error: 'PRICE_CHANGED',
  message: 'Price has changed significantly. Please create new purchase request.',
  code: 409
}
```

---

## 🎯 Discussion Points

### 1. Payment Flow ✅ **DECISION MADE**
**Selected:** Direct On-Chain Payment (Option B)

**Rationale:**
- Instant completion (no polling delay)
- Standard blockchain UX
- Atomic transaction (payment + purchase)
- More transparent for player

**Implementation Notes:**
- Backend builds transaction (payment + purchase)
- Frontend handles wallet interaction
- Player signs and submits transaction
- No purchase request storage needed (transaction is the request)

---

### 2. Price Conversion 💱 ✅ **DECISION MADE**
**Selected:** CoinGecko Free Tier

**Decision:** Use CoinGecko free tier API
- Free tier sufficient for MVP
- Reliable and supports SUI and custom tokens
- Rate limits: 10-50 calls/minute (sufficient with caching)

**Additional Questions:**
1. **Cache Duration & Location:** ✅ **DECIDED**
   - **Cache Location:** Backend (shared across all users, reduces CoinGecko API calls)
   - **Cache Duration:** 5 minutes
   - **Frontend:** Can call `/api/store/items` when user opens store (backend handles caching)
   - **Rationale:** Backend cache is more efficient - one cache for all users, reduces API rate limit issues

2. **Fallback Strategy:** ✅ **DECIDED**
   - **Decision:** Fail gracefully (return error, don't use stale prices)
   - **Implementation:** If CoinGecko API fails, return error to frontend, show user-friendly message
   - **Rationale:** Better to fail than show incorrect prices

3. **Price Refresh:** ✅ **DECIDED**
   - **Decision:** On-demand only (no background refresh)
   - **How it works:** 
     - **Frontend polls backend API:** Frontend calls `GET /api/store/items` every 30-60 seconds while store is open
     - **Backend manages cache:** Backend has in-memory cache (shared across all users)
     - **Cache check:** When API is called, backend checks:
       - If cache exists and not expired (< 5 minutes old) → Return cached prices
       - If cache expired or doesn't exist → Fetch from CoinGecko, update cache, return new prices
     - **Frontend never calls CoinGecko directly** - always goes through backend API
   - **Rationale:** Cache duration (5 minutes) handles refresh timing, no need for background jobs
   - **Benefits:** 
     - Backend cache reduces CoinGecko API calls (one cache for all users)
     - Frontend gets fresh prices when cache expires
     - Frontend can detect price changes between polls and notify user

4. **Return Format:** ✅ **DECIDED**
   - **Decision:** Return all token prices (SUI, MEWS, USDC)
   - **Implementation:** Backend returns prices for all tokens in response
   - **Future:** Can add more tokens later without API changes

5. **Price Locking:** ✅ **DECIDED**
   - **Decision:** Yes, lock price when building transaction, valid for 5 minutes
   - **Rationale:** User has 10 minutes to select items, 5 minutes is sufficient for transaction building
   - **Implementation:** Lock price when `POST /api/store/purchase` is called

6. **Price Change Handling:** ✅ **DECIDED**
   - **Decision:** If price changes while user is selecting items, update price and inform user
   - **Implementation:**
     - Frontend polls `/api/store/items` periodically (every 30-60 seconds) while store is open
     - If price changes, update UI and show notification: "Price updated: [item] is now [price]"
     - Can be positive or negative change (show both cases)
   - **Rationale:** Transparent pricing, user sees current prices

---

### 3. Caching Strategy 📦

**Important Clarification:**
- **Inventory is stored on blockchain** (PlayerInventory object)
- **We're caching blockchain query results**, not storing inventory
- **Purpose:** Reduce blockchain queries (which can be slow/expensive)

**Already Decided:**
1. **Price Cache Duration:** ✅ 5 minutes (decided in Section 2)
2. **Price Cache Storage:** ✅ In-memory (decided in Section 2)

**Inventory Caching - Flow Analysis:**

**Current Flow (from code review):**
1. **Store Opens** → Query inventory → Show "Owned" badges on items
2. **Purchase Completes** → Update blockchain → Invalidate cache → Query inventory → Refresh "Owned" badges
3. **Before Game Start** → Query inventory → Show consumption modal with available items
4. **Game Start** → Start items consumed (extraLives, forceField, orbLevel) → Update blockchain → Invalidate cache
5. **During Game** → Consumable items consumed when activated → Update blockchain → Invalidate cache

**Key Insight:**
- Inventory is queried at specific points in the user flow
- After purchase/consumption, we need fresh data immediately
- Between these events, inventory doesn't change (unless user makes another purchase in another tab)

**Recommended Caching Strategy:**

**Option: Invalidate-On-Update Cache**
- **Cache Duration:** Until invalidated (no time expiry)
- **Cache Scope:** Per-user (by wallet address)
- **Invalidate When:**
  - Purchase completes (transaction confirmed)
  - Consumption completes (transaction confirmed)
  - User explicitly refreshes
- **Cache Location:** Backend (shared across all users, per address)

**How It Works:**
1. **First Query:** Query blockchain, cache result
2. **Subsequent Queries:** Return cached result (fast)
3. **After Purchase/Consume:** Invalidate cache for that address
4. **Next Query:** Query blockchain again, update cache

**Benefits:**
- ✅ Reduces blockchain queries (cache valid until inventory changes)
- ✅ Always fresh after updates (cache invalidated on purchase/consume)
- ✅ Simple (no session tracking, no time expiry)
- ✅ Per-user cache (each address has own cache entry)

**Decisions:**
1. **Missing Inventory:** ✅ Return empty inventory (not error) if player has no inventory object
2. **Cache Key:** ✅ Use wallet address as cache key
3. **Cache Invalidation:** ✅ Invalidate immediately after purchase/consume transaction confirms

**Additional Notes:**
- **Consumption Modal:** ✅ Already has cancel button that returns to menu (allows users to back out to buy items from store)
- **Empty Inventory:** ⚠️ Currently skips modal if no items - should show "inventory empty" message with option to go to store

---

### 4. Transaction Building 🔨

**Decisions:**
1. **Gas Estimation:** ✅ Yes, show estimated cost in SUI to user
2. **Gas Accuracy:** ✅ Use Sui SDK estimation + 15% buffer
3. **Transaction Expiry:** ✅ 2-3 minutes (user has this time to sign transaction)
4. **Multiple Items:** ✅ Yes, batch multiple items in one transaction
5. **Max Items:** ✅ No hard limit, but validate reasonable quantities

**Implementation:**
- Backend builds transaction using Sui SDK
- Transaction includes: payment transfer + purchase_item() call
- Return unsigned transaction to frontend
- Frontend signs and submits using wallet API

**Discussion Points:**

**Gas Estimation Buffer:**
- ✅ **Decision:** Use Sui SDK estimation + 15% buffer
- Buffer accounts for:
  - Network congestion (gas prices fluctuate)
  - Estimation inaccuracy
  - Safety margin
- Can adjust based on testing if transactions fail due to insufficient gas

**Transaction Expiry:**
- ✅ **Decision:** 2-3 minutes expiry time
- **What this means:** User has 2-3 minutes to sign the transaction after it's built
- If user doesn't sign within this window, transaction expires and they must request a new one
- **Purpose:** Security (prevent replay of old transactions)
- **Note:** This is the time to SIGN, not the time to wait for confirmation

**Blockchain Confirmation (Separate from Expiry):**
- **What this is:** Time to wait for transaction to be included in a block after signing
- **Sui Speed:** Typically confirms in seconds (very fast!)
- **How we handle it:**
  - After user signs and submits, show "Processing..." UI
  - Poll blockchain (via `/api/store/transaction/:digest` or direct Sui Client) to check status
  - Once confirmed, show success message with transaction digest/hash
  - Transaction digest can be used to view transaction on Sui Explorer
- **Expected Time:** Usually 1-5 seconds on Sui (very quick!)

---

### 5. Error Handling & Recovery 🛡️

**Decisions:**
1. **Price API Failure:** ✅ Fail gracefully - Return error, inform user purchases cannot be made at this time (no stale prices)
2. **Transaction Building Failure:** ✅ Return error, don't create transaction (invalid items, invalid quantities, etc.)
3. **Transaction Submission Failure:** ✅ Transaction fails, player keeps tokens, show clear error message
4. **Inventory Query Failure:** ✅ Return error, don't allow consumption
5. **Consumption Failure:** ✅ Return error, item not consumed, player keeps item
6. **Retry Logic:** ✅ No auto-retry, let player retry manually

**Error Handling Details:**

**Price API Failure:**
- If CoinGecko API is down or returns error:
  - Return error response to frontend
  - Show user-friendly message: "Unable to fetch current prices. Purchases are temporarily unavailable. Please try again later."
  - Log error on backend for monitoring
  - **No stale prices** - We don't use cached prices if API fails (already decided in Section 2)

**Transaction Building Failure:**
- If invalid items, invalid quantities, or other validation fails:
  - Return error response with specific reason
  - Don't create transaction
  - Show user-friendly error message
  - Examples: "Invalid item selected", "Quantity must be greater than 0", "Item not found in catalog"

**Transaction Submission Failure:**
- If transaction fails on blockchain (insufficient gas, network error, rejected):
  - Transaction doesn't execute
  - Player keeps their tokens (no payment made)
  - Show clear error message with reason
  - Allow player to retry
  - Examples: "Transaction failed: Insufficient gas", "Transaction rejected by wallet", "Network error, please try again"

**Inventory Query Failure:**
- If blockchain query fails (network error, invalid address, object not found):
  - Return error response
  - Don't allow consumption
  - Show user-friendly message
  - Allow player to retry
  - Examples: "Unable to load inventory. Please try again.", "Invalid wallet address"

**Consumption Failure:**
- If consumption transaction fails:
  - Item is NOT consumed from inventory
  - Player keeps the item
  - Return error response
  - Show user-friendly message
  - Allow player to retry
  - Examples: "Failed to consume item. Item remains in inventory.", "Transaction failed, please try again"

**Retry Logic:**
- No automatic retry
- Player must manually retry
- Show clear error message so player knows what went wrong
- Provide "Retry" button where appropriate

---

### 6. Security & Rate Limiting 🔐

**What Are We Rate Limiting?**

**API Endpoints:**
1. **POST `/api/store/purchase`** - Build purchase transaction
   - **Why:** Expensive operation (price conversion, transaction building)
   - **Primary target for rate limiting**
   
2. **POST `/api/store/consume`** - Consume items (admin wallet)
   - **Why:** Important operation, prevent abuse
   - **Secondary target for rate limiting**

3. **GET `/api/store/inventory/:address`** - Get player inventory
   - **Why:** Could be spammed, but less critical
   - **Optional:** Light rate limiting

4. **GET `/api/store/items`** - Get catalog with prices
   - **Why:** Less critical, but could be rate limited
   - **Optional:** Very light rate limiting (or none)

5. **GET `/api/store/transaction/:digest`** - Check transaction status
   - **Why:** Polling endpoint, could be rate limited
   - **Optional:** Light rate limiting

**Rate Limiting Analysis:**

**POST `/api/store/purchase` (Build Purchase Transaction):**
- **What it does:** Builds unsigned transaction (doesn't execute)
- **User still needs to:** Sign transaction, pay gas, submit to blockchain
- **Natural limits:** User pays gas for each transaction they submit
- **Potential abuse:** Spam requests to build transactions (but they can't use them without signing)
- **Cost to us:** Price API calls, transaction building (computational)
- **Question:** Is rate limiting necessary? User is limited by their own gas costs when submitting

**POST `/api/store/consume` (Consume Items):**
- **What it does:** Admin wallet consumes items from inventory
- **Who calls it:** Backend (not user directly)
- **Natural limits:** Game mechanics (one item type per game)
- **Potential abuse:** User can't directly abuse this (admin wallet controlled)
- **Question:** Is rate limiting necessary? Already limited by game mechanics

**GET Endpoints (Read-Only):**
- **What they do:** Return data (items, inventory, transaction status)
- **Natural limits:** Read-only, no state changes
- **Potential abuse:** Spam requests (but less harmful)
- **Question:** Is rate limiting necessary? Less critical, but could prevent unnecessary load

**Key Insight:**
- Blockchain provides natural rate limiting (gas costs, transaction fees)
- Game mechanics already limit consumption (one item type per game)
- User pays for their own transactions (gas fees)
- Rate limiting is unnecessary overhead

**Realistic Usage Analysis:**
- **Normal user:** 1-2 purchases per session, maybe 5-10 per hour maximum
- **20 requests/minute:** Would be 1,200 requests/hour - extremely unlikely
- **Natural limits:**
  - User must manually click "Purchase" each time
  - Each purchase requires wallet signature (can't be easily automated)
  - User pays gas for each transaction
  - Transaction building takes time (not instant)
- **Abuse scenarios:** Even if someone spams, they'd pay gas for each transaction and get nothing useful

**Decision:**
✅ **No rate limiting needed for MVP**
- Normal usage is far below any reasonable limit
- Natural limits (manual clicking, wallet signatures, gas costs) prevent abuse
- Can add rate limiting later if abuse becomes an issue
- Focus on input validation instead (more important)

**Decisions:**
1. **Rate Limiting:** ✅ No rate limiting for MVP
2. **Input Validation:** ✅ Validate address format, item IDs, levels, quantities, payment token
3. **Admin Wallet:** ✅ Same as scores (for MVP)

---

### 7. Storage & Persistence 💾

**Blockchain Logging vs Backend Logging:**

**What's Already on Blockchain:**
- Purchase transactions are already recorded on-chain (transaction digest, effects, etc.)
- Smart contract can emit events with purchase details (if implemented)
- All transaction data is permanent and queryable

**What Needs Backend Logging:**
- API calls (request/response)
- Errors and failures
- Price conversion details
- Transaction building attempts
- Analytics data

**Decisions:**
1. **Purchase Request Storage:** ✅ No - Transaction is the request (already on blockchain)
2. **Transaction Logging:** ✅ Log to blockchain via smart contract events (if available) + backend logs
3. **What to Log:** ✅ Log as much as possible (comprehensive logging)

**Blockchain Logging (Smart Contract Events):**
- ✅ **Decision:** Log to blockchain via smart contract events
- **What:** Purchase events emitted by smart contract
- **Contains:** 
  - Transaction digest
  - Player address
  - Items purchased (itemId, level, quantity for each)
  - Total USD price
  - Total token amount
  - Payment token (SUI/MEWS)
  - Gas estimate
  - Gas actually used
  - Timestamp
  - Success/failure status
- **Retention:** ✅ Permanent (on blockchain - no retention concerns)
- **Query:** Can query events from blockchain using Sui Client
- **Implementation:** Smart contract must emit `ItemPurchased` events (see contract design docs)
- **Benefits:** Immutable, verifiable, transparent, permanent record

**Backend Logging (Traditional Logs):**
- **What:** API calls, errors, price conversions, transaction building
- **Contains:** Request details, response details, errors, timestamps, IP addresses (if needed)
- **Retention:** Log files (rotate daily/weekly) or in-memory (lost on restart)
- **Purpose:** Debugging, monitoring, analytics
- **Format:** Structured logs (JSON) for easy parsing

**What to Log (Comprehensive):**
- **Purchase Transactions:**
  - Transaction digest
  - Player address
  - Items purchased (itemId, level, quantity for each)
  - Total USD price
  - Total token amount
  - Payment token (SUI/MEWS)
  - Gas estimate
  - Gas actually used
  - Timestamp
  - Success/failure status
  - Error messages (if failed)
  
- **API Calls:**
  - Endpoint
  - Request data
  - Response data
  - Response time
  - Status code
  - Timestamp
  
- **Price Conversions:**
  - USD prices
  - Token prices (SUI, MEWS, USDC)
  - Exchange rates used
  - Source (CoinGecko)
  - Cache hit/miss
  - Timestamp

- **Errors:**
  - Error type
  - Error message
  - Stack trace
  - Request context
  - Timestamp

---

## 🚀 Next Steps

Once we agree on the design:

1. **Answer remaining questions** (see sections 2-7 above)
2. **Confirm contract details** (function names, object IDs) - May need to wait for contract deployment
3. **Create API endpoints** (Phase 5.1)
4. **Implement price conversion service** (Phase 5.2)
5. **Update frontend to use API** (Phase 5.4)
6. **Test end-to-end flow** (Phase 5.5)

---

## 📊 Decisions Summary (Quick Reference)

**All decisions made during discussion:**

1. **Payment Flow:** ✅ Direct On-Chain Payment (player signs, player pays gas)
2. **Price API:** ✅ CoinGecko Free Tier
3. **Price Cache:** ✅ 5 minutes (backend, shared)
4. **Price Failure:** ✅ Fail gracefully (no stale prices)
5. **Inventory Cache:** ✅ Until invalidated (per address, invalidate on purchase/consume)
6. **Gas Estimation:** ✅ Yes, show to player (Sui SDK + 15% buffer)
7. **Transaction Expiry:** ✅ 2-3 minutes (time to sign)
8. **Multiple Items:** ✅ Yes, batch in one transaction
9. **Max Items:** ✅ No hard limit, validate reasonable quantities
10. **Error Handling:** ✅ Fail gracefully, clear messages, no auto-retry
11. **Rate Limiting:** ✅ No rate limiting for MVP
12. **Input Validation:** ✅ Validate address, item IDs, levels, quantities, payment token
13. **Admin Wallet:** ✅ Same as scores (for MVP)
14. **Transaction Logging:** ✅ Log to blockchain via events + backend logs
15. **What to Log:** ✅ Comprehensive (as much as possible)

**Ready for implementation!** 🎯

---

## 📋 Summary

**Proposed API Structure:**
- `GET /api/store/items` - Get catalog with prices
- `GET /api/store/inventory/:address` - Get player inventory
- `POST /api/store/purchase` - Build purchase transaction (payment + purchase)
- `GET /api/store/transaction/:digest` - Check transaction status (optional)
- `POST /api/store/consume` - Consume items (admin wallet)

**Payment Flow:** ✅ **Direct On-Chain Payment** (Option B)
- Backend builds transaction (payment + purchase)
- Frontend handles wallet signature
- Player signs and submits transaction
- Atomic execution (payment + purchase in one transaction)

**Price API:** CoinGecko Free Tier ✅
- Backend cache: 5 minutes (shared across all users)
- On-demand refresh (no background jobs)
- Fail gracefully if API fails (no stale prices)
- Return all tokens: SUI, MEWS, USDC
- Price updates: Frontend polls every 30-60 seconds, shows notification if price changes

**Storage:** No purchase request storage needed (transaction is the request)
**Pattern:** Different from score submission (player signs purchase, admin signs consumption)

**Key Implementation Points:**
- Backend builds unsigned transaction
- Frontend uses wallet API to sign and submit
- Transaction includes both payment transfer and purchase_item() call
- No polling needed (transaction confirms immediately)
- No "I've Sent Payment" button needed

**Ready to implement!** 🎯

