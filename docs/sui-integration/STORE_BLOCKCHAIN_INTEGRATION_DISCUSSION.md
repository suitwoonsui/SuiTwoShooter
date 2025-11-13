# Premium Store Blockchain Integration - Architecture Discussion

## 🎯 Overview

This document discusses the **blockchain integration architecture** for the premium store system. We'll cover:
- Transaction flow (who signs, who pays gas)
- On-chain inventory structure
- Purchase vs consumption transactions
- Comparison to score submission (existing pattern)
- Security considerations
- Payment processing

**Status:** Discussion Phase - No implementation yet  
**Goal:** Agree on architecture before building

---

## 📊 Current Pattern: Score Submission (Reference)

Let's first understand how **score submission** works (already implemented):

### Score Submission Flow:
```
1. Player finishes game (frontend)
   ↓
2. Frontend calls: POST /api/scores/submit
   - Sends: { playerAddress, scoreData, ... }
   ↓
3. Backend (admin-wallet-service.ts)
   - Admin wallet signs transaction
   - Admin wallet pays gas fees
   - Calls smart contract: submit_game_session_for_player()
   ↓
4. Smart Contract (score_submission.move)
   - Requires AdminCapability (only admin can call)
   - Validates score
   - Emits ScoreSubmitted event
   ↓
5. Transaction confirmed on blockchain
   ↓
6. Backend returns: { success, transactionDigest }
   ↓
7. Frontend shows success message
```

### Key Points:
- ✅ **Admin wallet signs** (not player)
- ✅ **Admin wallet pays gas** (player doesn't need SUI)
- ✅ **AdminCapability required** (prevents cheating)
- ✅ **Player doesn't interact with wallet** (no popup)
- ✅ **One-way flow** (score is submitted, not consumed)

---

## 🛒 Store Purchase Flow (Proposed)

### Option A: User Signs & Pays (Standard E-commerce)
```
1. Player clicks "Purchase" in store UI
   ↓
2. Frontend calls: POST /api/store/purchase
   - Sends: { playerAddress, itemType, itemLevel, paymentMethod }
   ↓
3. Backend validates request
   - Checks item exists
   - Calculates price
   ↓
4. Backend returns: { transaction, needsSignature: true }
   ↓
5. Frontend prompts wallet for signature
   - Player approves transaction
   - Player pays gas fees
   - Payment transferred (SUI or $MEWS)
   ↓
6. Transaction includes:
   - Payment transfer (player → contract)
   - purchase_item() call
   - Inventory update
   ↓
7. Smart Contract (premium_store.move)
   - Validates payment amount
   - Increments PlayerInventory
   - Emits ItemPurchased event
   ↓
8. Transaction confirmed
   ↓
9. Frontend shows success, refreshes inventory
```

**Pros:**
- ✅ Standard blockchain UX
- ✅ Player owns their transaction
- ✅ Transparent (player sees what they're paying)
- ✅ No admin wallet needed for purchases

**Cons:**
- ❌ Player needs SUI for gas (barrier to entry)
- ❌ Player must approve every purchase (wallet popup)
- ❌ More complex frontend (wallet interaction)

---

### Option B: Admin Signs, User Pays (Hybrid)
```
1. Player clicks "Purchase"
   ↓
2. Frontend calls: POST /api/store/purchase
   ↓
3. Backend:
   - Creates transaction
   - Admin wallet signs
   - Admin wallet pays gas
   - BUT: Payment amount includes gas fee
   ↓
4. Smart Contract:
   - Receives payment (item price + gas)
   - Refunds gas to admin wallet
   - Updates inventory
   ↓
5. Backend returns success (no wallet popup needed)
```

**Pros:**
- ✅ No wallet popup (smoother UX)
- ✅ Player doesn't need SUI (only payment token)
- ✅ Admin pays gas (can be reimbursed from payment)

**Cons:**
- ❌ More complex contract logic
- ❌ Admin must fund gas wallet
- ❌ Less transparent (player doesn't see gas cost)

---

### Option C: Admin Signs & Pays (Like Score Submission)
```
1. Player clicks "Purchase"
   ↓
2. Frontend calls: POST /api/store/purchase
   ↓
3. Backend:
   - Validates payment (off-chain check)
   - Admin wallet signs transaction
   - Admin wallet pays gas
   - Payment processed separately (or bundled)
   ↓
4. Smart Contract:
   - Admin calls purchase_item() with AdminCapability
   - Updates inventory
   ↓
5. Backend returns success
```

**Pros:**
- ✅ Consistent with score submission pattern
- ✅ No wallet popup
- ✅ Player doesn't need SUI
- ✅ Simple frontend

**Cons:**
- ❌ Payment must be handled separately (off-chain or different transaction)
- ❌ Less transparent
- ❌ Admin must handle payments

---

## 💰 Payment Processing

### How Should Payments Work?

#### Option 1: On-Chain Payment (Standard)
- Player transfers SUI/$MEWS directly to contract
- Contract validates payment amount
- Contract updates inventory
- **Transaction:** Payment + Inventory Update (atomic)

#### Option 2: Off-Chain Payment (Stripe-like)
- Player pays via credit card/other method
- Backend validates payment
- Backend calls contract (admin wallet)
- **Transaction:** Only Inventory Update (payment separate)

#### Option 3: Hybrid (Payment Token + Gas)
- Player pays item price in $MEWS token
- Admin pays gas in SUI
- Contract receives $MEWS, admin gets reimbursed
- **Transaction:** Token Transfer + Inventory Update

---

## 🗄️ On-Chain Inventory Structure

### PlayerInventory Object (Per Wallet)

```move
struct PlayerInventory has key, store {
    id: UID,
    player: address,
    
    // Item counts (u64 = quantity owned)
    extra_lives_level_1: u64,
    extra_lives_level_2: u64,
    extra_lives_level_3: u64,
    
    force_field_level_1: u64,
    force_field_level_2: u64,
    force_field_level_3: u64,
    
    orb_level_1: u64,
    orb_level_2: u64,
    orb_level_3: u64,
    
    slow_time_level_1: u64,
    slow_time_level_2: u64,
    slow_time_level_3: u64,
    
    destroy_all_enemies: u64,
    boss_kill_shot: u64,
    coin_tractor_beam: u64,
}
```

### How It Works:
1. **First Purchase:** Create new `PlayerInventory` object
2. **Subsequent Purchases:** Update existing object (increment count)
3. **Game Start:** Decrement counts (consume items)
4. **Query:** Read object directly from blockchain

### Object Ownership:
- **Option A:** Owned by player (player can transfer/delete)
- **Option B:** Owned by contract (immutable, only contract can modify)
- **Option C:** Shared object (anyone can read, only contract can modify)

**Recommendation:** Option B or C (contract-owned or shared) for security.

---

## 🔄 Consumption Flow (During Gameplay) ✅ **UPDATED DECISION**

### How Items Are Consumed:

**New Approach: Consume items when actually used during gameplay**

```
1. Player clicks "Start Game"
   ↓
2. Frontend calls: GET /api/store/inventory/:address
   - Backend queries PlayerInventory from blockchain
   - Returns: { extraLives: { level1: 2, level2: 1 }, ... }
   ↓
3. Player selects items to bring into game (or auto-select)
   ↓
4. Items are "checked out" (NOT locked, just tracked in game state)
   - Stored in game.checkedOutItems (frontend only)
   - Items remain in blockchain inventory (unchanged)
   - No blockchain transaction needed
   - Items are available for use during gameplay
   ↓
5. Game starts with selected items available
   ↓
6. During gameplay, when item is used:
   - Player activates item (e.g., clicks "Slow Time" button)
   ↓
7. **Power activates immediately** (frontend, no delay)
   - Game applies power effect right away
   - No waiting for blockchain
   ↓
8. **Blockchain consumption happens asynchronously** (background)
   - Frontend calls: POST /api/store/consume (async, doesn't block)
   - Backend calls smart contract: consume_item()
   - Decrements PlayerInventory count
   - Emits InventoryUpdated event
   ↓
9. Item is consumed and removed from inventory
   ↓
10. If game crashes before item is used:
    - Item remains in inventory (not consumed)
    - Player can use it in next game
```

### Benefits of This Approach:
- ✅ **Items only consumed if used** (not wasted if game crashes)
- ✅ **Player keeps items if not used** (can use in future games)
- ✅ **More flexible** (player decides when to use items)
- ✅ **Better UX** (no loss on crashes)
- ✅ **Atomic consumption** (only when actually activated)

### Challenges:
- ⚠️ **Network failures** (item used but consumption fails - handled with retry)
- ⚠️ **Duplicate use prevention** (frontend validation needed)

**Note:** 
- No locking needed - items remain in inventory until consumed. Check-out is just frontend tracking.
- **No latency in gameplay** - Power activation is immediate (frontend), blockchain consumption happens asynchronously in background.

### Solutions:

#### A. Check-Out System (No Locking) ✅ **RECOMMENDED**
**Option:** Track items in frontend game state, consume when used

**Implementation:**
- Game start: Store checked-out items in `game.checkedOutItems` (frontend only)
- Items remain in blockchain inventory (no lock, no transaction)
- During game: When item used, consume from blockchain
- Game end: No cleanup needed (items already consumed or still in inventory)

**Pros:**
- ✅ Simple (no cleanup needed, no locking)
- ✅ Items persist if not used
- ✅ No blockchain transaction at game start
- ✅ Items remain in inventory until consumed
- ✅ No locking complexity

**Cons:**
- ⚠️ Frontend validation needed (prevent duplicate use in same game)
- ⚠️ Player could theoretically use same item in multiple games (edge case, acceptable)

#### B. Session-Based Tracking (Not Needed)
**Option:** Track checked-out items in backend session

**Why Not Needed:**
- Adds unnecessary complexity
- Requires session management and cleanup
- Items don't need to be locked (they remain in inventory)
- Frontend validation is sufficient for duplicate use prevention

**Conclusion:** Option A (frontend-only check-out) is simpler and sufficient.

#### Why No Locking is Needed:

**Key Insight:** Items don't need to be "locked" on the blockchain. Here's why:

1. **Check-out is frontend-only:**
   - Just tracks which items player wants to use in current game
   - Stored in `game.checkedOutItems` (local game state)
   - No blockchain interaction needed

2. **Items remain in inventory:**
   - Blockchain inventory unchanged until consumption
   - Player still "owns" the items
   - Can be used in other games (edge case, but acceptable)

3. **Consumption is atomic:**
   - When item is used, it's consumed from blockchain
   - Backend validates item exists before consuming
   - Contract validates item exists before decrementing
   - Multiple layers of validation prevent issues

4. **No race conditions:**
   - If player uses item in Game A, it's consumed (removed from inventory)
   - If player tries to use same item in Game B, backend/contract will fail (item doesn't exist)
   - Frontend validation prevents duplicate use in same game

**Conclusion:** No locking needed. Check-out is just a frontend convenience to track available items.

## 📦 Item Categories & Consumption Patterns

### Category 1: Static Start Items (Consumed at Game Start)

**Definition:** Items that are immediately applied when the game starts. Cannot be "unused" once applied.

**Items:**
- **Extra Lives** - Applied immediately (player starts with extra lives)
- **Force Field Start** - Applied immediately (force field active from start)
- **Orb Level Start** - Applied immediately (orb starts at higher level)

**Consumption Pattern:**
1. Player selects items before game starts
2. **Items are consumed from blockchain at game start** (batch transaction)
3. Items are applied immediately when game begins
4. Cannot be saved for later (already applied)

**Why Consume at Start:**
- Items are immediately active (can't be "unused")
- Player can't choose when to apply them
- Simpler logic (one transaction at game start)

---

### Category 2: Consumable Power Items (Consumed When Used)

**Definition:** Items that the player activates during gameplay. Can be saved for later use.

**Items:**
- **Slow Time Power** - Player activates when needed
- **Destroy All Enemies** - Player activates when needed
- **Boss Kill Shot** - Player activates when needed
- **Coin Tractor Beam** - Player activates when needed

**Consumption Pattern:**
1. Player selects items before game starts
2. **Items are "checked out" (stored in game state, NOT consumed)**
3. Items are available for use during gameplay
4. **When player activates item: Consume from blockchain**
5. If game crashes before use: Item remains in inventory

**Why Consume When Used:**
- Player chooses when to use (strategic decision)
- Items can be saved for later (better UX)
- No loss if game crashes before use
- More flexible gameplay

---

### Key Differences:

| Aspect | Static Start Items | Consumable Power Items |
|--------|-------------------|----------------------|
| **When Consumed** | At game start | When activated during gameplay |
| **Applied** | Immediately | When player activates |
| **Can Save?** | No (already applied) | Yes (can save for later) |
| **Crash Protection** | No (already consumed) | Yes (not consumed if unused) |
| **Transaction** | Batch (all at once) | Individual (one per use) |
| **Blockchain Call** | Before game starts | During gameplay |
| **Latency Impact** | None (before game) | Small delay when used |

### Updated Recommendation:
- ✅ **Power items:** Consume when used during gameplay
- ✅ **Start items:** Consume at game start (as before)
- ✅ **Check-out system:** Store in game state, consume on use
- ✅ **Admin signs:** Consistent with other transactions
- ✅ **Handle failures:** Retry logic for consumption failures

---

## 🔐 Security Considerations

### 1. Purchase Validation
- ✅ Contract validates payment amount
- ✅ Contract validates item exists
- ✅ Contract validates price (prevent price manipulation)

### 2. Inventory Manipulation
- ✅ Only contract can modify inventory
- ✅ AdminCapability required (if admin signs)
- ✅ Player can't directly modify their inventory

### 3. Payment Verification
- ✅ Contract verifies payment received
- ✅ Payment amount matches item price
- ✅ Payment method validated (SUI vs $MEWS)

### 4. Access Control
- **Option A:** Public function (anyone can purchase)
- **Option B:** Admin-only (admin calls on behalf of player)
- **Option C:** Player signs (standard, most secure)

---

## 📡 Events & Querying

### Events Emitted:

```move
struct ItemPurchased has copy, drop {
    player: address,
    item_type: u8,
    item_level: u8,
    amount_paid: u64,
    payment_method: u8,  // 0=SUI, 1=MEWS
    timestamp: u64,
    transaction_digest: vector<u8>,
}

struct InventoryUpdated has copy, drop {
    player: address,
    item_type: u8,
    item_level: u8,
    action: u8,  // 0=purchase, 1=consume
    new_count: u64,
    timestamp: u64,
}
```

### Querying Inventory:

**Method 1: Direct Object Query (Recommended)**
```typescript
// Backend queries PlayerInventory object directly
const inventory = await suiClient.getObject({
  id: playerInventoryId,
  options: { showContent: true }
});
```

**Method 2: Event Query (For History)**
```typescript
// Query ItemPurchased events for analytics
const events = await suiClient.queryEvents({
  query: { MoveModule: { package: packageId, module: 'premium_store' } }
});
```

---

## ✅ Key Decisions Made

### 1. Transaction Signing & Payment Flow ✅ **DECIDED**
**Decision:** **Admin wallet accepts payment and pays for gas**

**Flow:**
1. User sends payment ($MEWS or $SUI) to admin wallet address
2. Admin wallet receives payment
3. Admin wallet signs transaction (pays gas)
4. Admin wallet calls contract to update inventory
5. User gets items without needing SUI for gas

**Benefits:**
- ✅ Smooth UX (no wallet popup, no gas needed)
- ✅ Consistent with pay-to-play model (same pattern)
- ✅ User only needs payment token, not SUI
- ✅ Admin controls transaction flow

**Implementation:**
- User sends payment to admin wallet (separate transaction or bundled)
- Backend monitors admin wallet for incoming payments
- Backend matches payment to purchase request
- Backend calls contract with AdminCapability

### 2. Gas Fees ✅ **DECIDED**
**Decision:** **Admin wallet pays gas fees**

- Admin wallet pays all gas fees
- User doesn't need SUI (only payment token)
- Gas cost can be factored into item pricing
- Consistent with score submission pattern

### 3. Payment Processing ✅ **DECIDED**
**Decision:** **$ value pricing, converted to SUI/$MEWS (future: USDC/other tokens)**

**Pricing Model:**
- Items priced in USD ($)
- Backend converts to SUI or $MEWS based on current rates
- User pays in their chosen token (SUI, $MEWS, or future: USDC)
- Payment sent to admin wallet
- Admin wallet receives payment, then processes purchase

**Future Expansion:**
- Support for USDC (partner projects)
- Support for other tokens
- Price conversion API/service needed

**Implementation:**
- Backend needs price conversion service (CoinGecko API, etc.)
- Store UI shows USD price + converted token amount
- User selects payment method (SUI, $MEWS, USDC)
- Payment amount calculated dynamically

### 4. Inventory Object Ownership ✅ **DECIDED**
**Decision:** **Shared object (readable by all, modifiable by contract)**

- Best balance of security and queryability
- Contract can modify, anyone can read
- Fast queries, secure updates

### 5. Consumption Timing ✅ **UPDATED DECISION**
**Decision:** **Two different consumption patterns based on item type**

#### A. Static Start Items (Consumed at Game Start):
- **Extra Lives** - Consumed when game starts (applied immediately)
- **Force Field Start** - Consumed when game starts (applied immediately)
- **Orb Level Start** - Consumed when game starts (applied immediately)
- **Pattern:** Batch consume at game start (one transaction)
- **Reason:** Items are immediately active, can't be "unused"

#### B. Consumable Power Items (Consumed When Used):
- **Slow Time Power** - Consumed when player activates it
- **Destroy All Enemies** - Consumed when player activates it
- **Boss Kill Shot** - Consumed when player activates it
- **Coin Tractor Beam** - Consumed when player activates it
- **Pattern:** Individual consume when activated (one transaction per use)
- **Reason:** Player chooses when to use, can save for later

**Benefits:**
- ✅ Power items only consumed if used
- ✅ Player keeps power items if game crashes before use
- ✅ More flexible (player decides when to use power items)
- ✅ Better UX (no loss on crashes for power items)
- ✅ Start items are simple (consumed immediately, no complexity)

**Implementation:**
- **Start items:** Batch consume at game start (before game begins)
- **Power items:** Check-out at game start (store in game state), consume when activated
- Unused power items remain in inventory

### 6. Admin Capability ✅ **DECIDED**
**Decision:** **Required for both purchases and consumption**

- Admin wallet signs all transactions
- AdminCapability required in contract
- Prevents unauthorized manipulation
- Consistent security model

### 7. Refunds ✅ **DECIDED**
**Decision:** **Manual refunds on case-by-case basis**

- No automated refund system
- Admin handles refunds manually
- Simpler contract (no refund logic)
- Flexible for edge cases

### 8. Inventory Limits ✅ **DECIDED**
**Decision:** **No inventory limits**

- Unlimited inventory per item type
- Simpler implementation
- Players can stock up
- No hoarding concerns (items are consumable)

### 9. Multi-Item Purchases ✅ **DECIDED**
**Decision:** **Allow multi-item purchases**

- Batch purchases in one transaction
- More efficient (one gas fee for multiple items)
- Better UX (buy multiple items at once)
- Contract supports batch operations

---

## 📋 Final Architecture (Based on Decisions)

### Purchase Flow:
1. **User selects items** in store UI (can select multiple)
2. **Backend calculates total** (USD → SUI/$MEWS conversion)
3. **User sends payment** to admin wallet (SUI, $MEWS, or USDC)
4. **Backend monitors** admin wallet for payment
5. **Backend matches** payment to purchase request
6. **Admin wallet signs transaction** (pays gas)
7. **Contract updates inventory** (batch update for multi-item)
8. **Backend returns success** to frontend
9. **Frontend refreshes inventory**

**Key Points:**
- ✅ No wallet popup (user just sends payment)
- ✅ Admin pays gas (user doesn't need SUI)
- ✅ Supports multi-item purchases (batch transaction)
- ✅ AdminCapability required (secure)
- ✅ Price conversion handled by backend

### Consumption Flow:

#### Start Items (Consumed at Game Start):
1. **User clicks "Start Game"**
2. **Backend queries inventory** from blockchain
3. **User selects start items** (Extra Lives, Force Field, Orb Level)
4. **Backend calls contract** (admin wallet signs, batch consume)
5. **Contract decrements inventory** for start items
6. **Game starts** with selected items applied

#### Power Items (Consumed When Used):
1. **User selects power items** to bring into game (checked out, not consumed)
2. **Items stored in game state** (available for use)
3. **During gameplay, user activates item** (e.g., clicks "Slow Time")
4. **Frontend calls backend:** POST /api/store/consume
5. **Backend calls contract** (admin wallet signs)
6. **Contract decrements inventory** for that item
7. **Item is consumed and removed from inventory**
8. **If game crashes before use:** Item remains in inventory

**Key Points:**
- ✅ Admin signs (consistent with score submission)
- ✅ Admin pays gas
- ✅ AdminCapability required
- ✅ Start items: Batch consume at game start
- ✅ Power items: Consume individually when used
- ✅ Items persist if not used (better UX)

### Inventory:
- **Shared object** (readable by all, modifiable by contract)
- **Queryable directly** (fast, no event scanning)
- **Events for analytics** (purchase history, trends)
- **Unlimited capacity** (no limits per item type)

### Payment System:
- **USD pricing** (backend converts to tokens)
- **Multi-token support** (SUI, $MEWS, USDC)
- **Price conversion API** (CoinGecko or similar)
- **Payment to admin wallet** (centralized collection)
- **Future expansion** (partner tokens)

### Benefits:
- ✅ **Smooth UX** (no wallet popups, no gas needed)
- ✅ **Consistent pattern** (same as pay-to-play)
- ✅ **Secure** (admin-only transactions)
- ✅ **Flexible pricing** (USD-based, multi-token)
- ✅ **Efficient** (batch purchases, batch consumption)
- ✅ **Scalable** (unlimited inventory, future tokens)

---

## 🔄 Comparison: Purchase vs Score Submission

| Aspect | Score Submission | Store Purchase | Store Consumption |
|--------|-----------------|----------------|-------------------|
| **Who Signs** | Admin | Admin | Admin |
| **Who Pays Gas** | Admin | Admin | Admin |
| **Wallet Popup** | No | No (user sends payment separately) | No |
| **AdminCapability** | Required | Required | Required |
| **Transaction Type** | One-way (submit) | One-way (inventory update, payment separate) | One-way (consume) |
| **Player Needs SUI** | No | No (only payment token) | No |
| **Payment Flow** | N/A | User → Admin Wallet → Contract | N/A |
| **Batch Operations** | No | Yes (multi-item) | Yes (multi-item) |

---

## 🔍 Implementation Details to Discuss

### 1. Payment Matching System
**Question:** How do we match incoming payments to purchase requests?

**Options:**
- **Option A:** Payment includes memo/note with purchase ID
- **Option B:** Backend tracks pending purchases, matches by amount + timestamp
- **Option C:** User sends payment first, then confirms purchase (two-step)

**Considerations:**
- Need to handle multiple simultaneous purchases
- Need to handle payment delays
- Need to handle wrong amounts
- Need to handle abandoned purchases

**Recommendation:** Option B (amount + timestamp matching) with purchase request queue

### 2. Price Conversion Service
**Question:** How do we handle USD → token conversion?

**Options:**
- **Option A:** Real-time API (CoinGecko, CoinMarketCap)
- **Option B:** Cached rates (update every X minutes)
- **Option C:** Fixed rates (manual updates)

**Considerations:**
- Price volatility (rates change quickly)
- API rate limits
- Fallback if API is down
- Caching strategy

**Recommendation:** Option B (cached rates, update every 5 minutes, fallback to last known rate)

### 3. Multi-Item Purchase Transaction
**Question:** How do we structure batch purchases in the contract?

**Options:**
- **Option A:** Single function call with array of items
- **Option B:** Loop through items in contract
- **Option C:** Multiple function calls in one transaction

**Considerations:**
- Gas efficiency
- Transaction size limits
- Error handling (what if one item fails?)

**Recommendation:** Option A (single function with item array, atomic operation)

### 4. Payment Token Support
**Question:** How do we handle different payment tokens (SUI, $MEWS, USDC)?

**Options:**
- **Option A:** Separate admin wallets per token
- **Option B:** Single admin wallet, track token type
- **Option C:** Contract accepts multiple token types

**Considerations:**
- Wallet management complexity
- Token contract addresses
- Conversion between tokens
- Accounting/tracking

**Recommendation:** Option B (single admin wallet, backend tracks token type, contract stores payment method)

### 5. Pay-to-Play Integration
**Question:** How does this relate to pay-to-play (game entry fee)?

**Considerations:**
- Same pattern (user pays admin wallet, admin signs)
- Same gas handling (admin pays)
- Same payment tokens (SUI, $MEWS, USDC)
- Can bundle entry fee + purchases?

**Recommendation:** Use same architecture for consistency

### 6. Purchase Request Queue
**Question:** How do we handle purchase requests before payment arrives?

**Options:**
- **Option A:** Store in database (pending purchases)
- **Option B:** In-memory queue (Redis)
- **Option C:** No queue (user pays first, then requests)

**Considerations:**
- Request expiration (timeout)
- Payment matching
- Concurrent purchases
- Server restarts

**Recommendation:** Option A (database queue with expiration, match by amount + timestamp + player address)

---

## 💳 Detailed Payment Flow (To Discuss)

### Current Understanding:
1. User selects items in store
2. Backend calculates total (USD → token conversion)
3. User sends payment to admin wallet
4. Backend monitors and matches payment
5. Backend processes purchase

### Questions to Resolve:

#### A. Payment Timing
**When does user send payment?**
- **Option 1:** User sends payment first, then clicks "Purchase" (payment sits in admin wallet)
- **Option 2:** User clicks "Purchase", then sends payment (purchase request created first)
- **Option 3:** User sends payment as part of purchase flow (two-step: request → payment)

**Recommendation:** Option 2 (create purchase request first, then user sends payment)

#### B. Payment Matching
**How do we match payment to purchase request?**

**Challenges:**
- Multiple users purchasing simultaneously
- Payment delays (blockchain confirmation time)
- Wrong amounts sent
- Abandoned purchases (user never sends payment)

**Proposed Solution:**
1. Create purchase request with:
   - Unique purchase ID
   - Player address
   - Items requested
   - Total amount (in token)
   - Expiration time (e.g., 10 minutes)
   - Status: `pending_payment`
2. Store in database (pending_purchases table)
3. User sends payment to admin wallet
4. Backend monitors admin wallet (polling or event listener)
5. When payment received:
   - Match by: `amount + player_address + timestamp_window`
   - Update status: `payment_received`
   - Process purchase (call contract)
   - Update status: `completed`
6. Expire old requests (cleanup job)

**Alternative:** Include purchase ID in payment memo/note (if wallet supports it)

#### C. Price Conversion Timing
**When do we convert USD → token?**
- **Option 1:** At purchase request creation (lock in price)
- **Option 2:** At payment receipt (use current rate)
- **Option 3:** Show both (estimated at request, final at payment)

**Recommendation:** Option 1 (lock price at request, user pays exact amount)

#### D. Payment Verification
**How do we verify payment was received?**
- Monitor admin wallet balance changes
- Query recent transactions
- Use Sui event system (if available)
- Poll admin wallet transactions

**Recommendation:** Poll admin wallet transactions (check last N transactions, match by amount + sender)

#### E. Multi-Token Admin Wallet
**Single wallet or separate wallets per token?**
- **Option 1:** Single admin wallet (receives all tokens)
- **Option 2:** Separate wallets (one per token type)

**Recommendation:** Option 1 (single wallet, backend tracks token type from payment transaction)

---

## 🎯 Next Steps

1. **✅ Decisions made** - Architecture agreed upon
2. **Discuss payment flow details** - Resolve questions above (A-E)
3. **Design payment matching system** - Database schema, matching logic
4. **Design price conversion service** - API integration, caching strategy
5. **Finalize contract design** - Batch purchases, admin-only functions
6. **Update implementation plan** - Reflect new architecture
7. **Start implementation** - Begin with Phase 1 (UI)

---

## 📚 References

- [Score Submission Flow](./05-smart-contracts.md) - Existing pattern
- [Premium Store Design](./12-premium-store-design.md) - Complete design
- [Store Implementation Order](./STORE_IMPLEMENTATION_ORDER.md) - Step-by-step guide
- [Admin Wallet Service](../backend/lib/sui/admin-wallet-service.ts) - Current implementation

---

**What do you think?** Let's discuss the architecture before we start building! 🚀

