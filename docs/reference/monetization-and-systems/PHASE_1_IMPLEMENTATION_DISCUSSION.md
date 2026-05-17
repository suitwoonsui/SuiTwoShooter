# Phase 1: Game Pass & Paywall System - Implementation Discussion

## Overview

This document outlines the detailed implementation plan for Phase 1: Game Pass & Paywall System. We'll discuss the approach, key decisions, and integration points before beginning implementation.

**Status:** Ready for Discussion  
**Network:** Testnet  
**Payment Tokens:** SUI, $MEWS, USDC  
**Badge System:** ✅ Working (store already uses it)

---

## Implementation Components

### 1. Smart Contract: `game_pass.move`

**Location:** `contracts/suitwo_game/sources/game_pass.move`

#### Key Features:
- **Credit Pack Purchases:** 4 tiers (Starter: 10, Regular: 50, Value: 100, Mega: 250 games)
- **Pay-Per-Game:** Single game purchase option ($0.10 base)
- **Credit Consumption:** Admin-only function to consume credits
- **Tournament Tickets:** Track tickets with USD value (for Phase 3)
- **Stacking Purchases:** Add games to existing pass
- **Admin Functions:** Grant credits, refunds

#### Data Structures:
```move
struct GamePass has key, store {
    id: UID,
    owner: address,  // Player address
    pack_type: u8,   // Which pack was purchased
    games_remaining: u64,
    tournament_tickets: Table<u64, TournamentTicket>,
    next_ticket_id: u64,
    purchased_at: u64,
    is_active: bool,
}

struct GamePassSystem has key {
    id: UID,
    admin: address,
    total_passes_sold: u64,
    total_revenue: u64,
    active_passes: Table<address, ID>,  // player -> GamePass ID
}
```

#### Key Functions:
- `purchase_game_pass()` - Purchase credit pack
- `purchase_single_game()` - Pay-per-game option
- `consume_game_credit_for_user()` - Admin-only credit consumption
- `add_games_to_existing_pass()` - Stack purchases
- `add_free_credits()` - For achievement rewards
- `purchase_tournament_tickets()` - For Phase 3

#### Questions:
1. **Admin Capability:** Should we reuse `AdminCapability` from `premium_store.move` or create a separate one?
   - **Recommendation:** Create separate `AdminCapability` in `game_pass.move` for modularity
   
2. **Shared vs Owned Objects:** Should `GamePass` be a shared object (like `PremiumStore`) or owned by player?
   - **Recommendation:** Owned by player (like Insomnia), but track in `GamePassSystem` table
   - **Reason:** Simpler ownership model, player controls their pass

3. **Payment Token Support:** How to handle SUI, $MEWS, USDC in Move?
   - **Recommendation:** Use generic coin type `Coin<T>` with separate entry functions per token
   - **Alternative:** Use `CoinMetadata` to support multiple tokens in one function

---

### 2. Backend Service: `game-pass-service.ts`

**Location:** `backend/lib/services/game-pass-service.ts`

#### Key Features:
- **Status Checking:** Check if player has active pass and credits
- **Purchase Processing:** Handle credit pack purchases with badge discounts
- **Price Calculation:** USD → SUI/$MEWS/USDC conversion (reuse store's price converter)
- **Credit Consumption:** API endpoint for consuming credits
- **Stacking Logic:** Add games to existing pass

#### Integration Points:
- **Badge Service:** Reuse existing badge lookup (same as store)
- **Price Converter:** Reuse existing `priceConverter` service
- **Transaction Builder:** Use existing Sui transaction building utilities

#### API Endpoints:
```typescript
// GET /api/game-pass/:address
// Check player's game pass status

// POST /api/game-pass/purchase-pack
// Purchase credit pack(s)
// Body: { playerAddress, packType, quantity, badgeTier, paymentToken }

// POST /api/game-pass/purchase-single
// Pay-per-game purchase
// Body: { playerAddress, badgeTier, paymentToken }

// POST /api/game-pass/consume-credit
// Consume game credit (called when game starts)
// Body: { playerAddress }

// POST /api/game-pass/add-games
// Admin: Add games to existing pass
// Body: { playerAddress, additionalGames }
```

#### Questions:
1. **Price Caching:** Should we cache SUI/$MEWS/USDC prices like the store does?
   - **Recommendation:** Yes, reuse store's price caching mechanism

2. **Transaction Signing:** Who signs the purchase transaction?
   - **Recommendation:** Player signs (standard pattern), backend only calls admin functions

3. **Error Handling:** What happens if purchase succeeds but backend fails?
   - **Recommendation:** Implement refund mechanism (admin function)

---

### 3. Frontend Integration

#### 3.1 Game Mode Selection

**Location:** Main menu or game start screen

**New Buttons:**
- **"Play Demo"** - Free first level (through first boss)
- **"Play Game"** - Full game mode (consumes credit at start)

**Implementation:**
```javascript
// In main menu or game start handler
function showGameModeSelection() {
  // Show two buttons:
  // 1. "Play Demo" - starts demo mode
  // 2. "Play Game" - checks credits, starts full game
}
```

#### 3.2 Demo Mode Implementation

**Location:** `src/game/systems/core/game-state.js` and game start logic

**Key Changes:**
- Add `gameMode` flag: `'demo'` or `'full'`
- Demo mode: No credit check, no credit consumption
- After first boss defeat: Show "End Demo" modal

**First Boss Detection:**
- Current code: `game.bossesDefeated` increments when boss is defeated
- First boss: `game.bossesDefeated === 1` and `game.currentTier === 1`
- Detection point: In `handleBossDefeat()` function

**Implementation:**
```javascript
// In game-state.js
this.gameMode = 'demo'; // or 'full'

// In boss defeat handler (main.js or game-update.js)
function handleBossDefeat() {
  // ... existing boss defeat logic ...
  
  // Check if first boss in demo mode
  if (game.gameMode === 'demo' && game.bossesDefeated === 1) {
    // Show "End Demo" modal
    showEndDemoModal();
    // Pause game
    game.paused = true;
  }
}
```

#### 3.3 End Demo Modal

**Location:** `src/game/systems/ui/end-demo-modal.js` (new file)

**Features:**
- "Congratulations! You've completed the demo."
- "Would you like to continue playing?"
- **[Continue Playing]** button → Check credits, show paywall if needed
- **[End Game]** button → Return to main menu

**Implementation:**
```javascript
function showEndDemoModal() {
  // Create modal with:
  // - Congratulations message
  // - Continue button (checks credits)
  // - End Game button (returns to menu)
}
```

#### 3.4 Paywall Modal

**Location:** Reuse/enhance existing store modal

**Context-Aware Display:**
- **Main Menu:** All tabs visible (Items, Game Pass, Tickets)
- **During Gameplay (Paywall):** Only Game Pass tab visible
- **Tournament Section:** Only Tickets tab visible (Phase 3)

**Game Pass Tab Features:**
- Current credits display
- Credit pack options (with badge discount)
- Pay-per-game option
- Payment method selector (SUI/$MEWS/USDC)
- Balance display
- Badge tier and discount display

**Integration:**
- Reuse existing store modal structure
- Add `context` parameter to control tab visibility
- Add Game Pass tab content

#### 3.5 Credit Consumption Flow

**Full Game Mode:**
```javascript
async function startFullGameMode() {
  // 1. Check game pass status
  const status = await checkGamePassStatus(playerAddress);
  
  // 2. If no credits: Show paywall (don't start game)
  if (!status.hasPass || status.gamesRemaining === 0) {
    showStoreModal({ context: 'gameplay-paywall', activeTab: 'gamePass' });
    return;
  }
  
  // 3. Consume credit before starting
  const consumeResult = await consumeGameCredit(playerAddress);
  if (consumeResult.success) {
    game.gameMode = 'full';
    game.start();
  }
}
```

**After Demo (Continue):**
```javascript
async function continueAfterDemo() {
  // 1. Check game pass status
  const status = await checkGamePassStatus(playerAddress);
  
  // 2. If has credits: Consume and continue
  if (status.hasPass && status.gamesRemaining > 0) {
    const consumeResult = await consumeGameCredit(playerAddress);
    if (consumeResult.success) {
      game.gameMode = 'full';
      continueGameplay(); // Resume from where demo ended
    }
  } else {
    // 3. If no credits: Show paywall
    showStoreModal({ context: 'gameplay-paywall', activeTab: 'gamePass' });
  }
}
```

#### 3.6 Credit Display Component

**Location:** `src/game/systems/ui/credits-display.js` (new file)

**Display Locations:**
- Main menu: "X credits remaining"
- Game HUD: "Credits: X" (during gameplay)
- Post-game screen: "X credits remaining"

---

## Key Decisions Needed

### 1. Smart Contract Architecture

**Question:** Should `GamePass` be shared or owned?

**Option A: Owned by Player**
- ✅ Simpler ownership model
- ✅ Player controls their pass
- ✅ Easier to transfer (if needed in future)
- ❌ Requires tracking in `GamePassSystem` table

**Option B: Shared Object** ✅ **SELECTED**
- ✅ Centralized management
- ✅ Easier admin operations
- ✅ Admin can update as needed
- ❌ More complex ownership model
- ❌ Harder to transfer

**Decision:** Option B (Shared Object) - Admin needs to update credits

---

### 2. Admin Capability

**Question:** Reuse `AdminCapability` from `premium_store.move` or create separate?

**Option A: Separate AdminCapability**
- ✅ Modularity (each contract has its own admin)
- ✅ Can have different admins per system
- ❌ More admin objects to manage

**Option B: Reuse Same AdminCapability** ✅ **SELECTED**
- ✅ Single admin object
- ✅ Simpler management
- ✅ Consistent across systems
- ❌ Tight coupling between systems

**Decision:** Option B (Reuse from premium_store) - Simpler management

---

### 3. Payment Token Handling

**Question:** How to support SUI, $MEWS, USDC in Move contract?

**Option A: Separate Entry Functions**
```move
public entry fun purchase_game_pass_sui(...)
public entry fun purchase_game_pass_mews(...)
public entry fun purchase_game_pass_usdc(...)
```
- ✅ Explicit, type-safe
- ✅ Clear which token is used
- ❌ Code duplication (3 similar functions)

**Option B: Generic Coin Type** ✅ **SELECTED**
```move
public entry fun purchase_game_pass<T>(...)
```
- ✅ Single function, no duplication
- ✅ More flexible (can add new tokens easily)
- ✅ Matches Sui best practices
- ❌ Less explicit (but payment_token parameter clarifies)

**Decision:** Option B (Generic Coin Type) - More flexible and maintainable

---

### 4. Demo Mode State Management

**Question:** How to track demo mode state?

**Option A: Game State Flag** ✅ **SELECTED**
```javascript
game.gameMode = 'demo' | 'full';
```
- ✅ Simple state management
- ✅ Easy to check throughout game code
- ✅ Persists during game session

**Option B: URL Parameter**
```javascript
?mode=demo or ?mode=full
```
- ❌ Can be lost on navigation
- ❌ More complex to manage

**Decision:** Option A (Game state flag) - Simple and reliable

---

### 5. First Boss Detection

**Question:** How to detect first boss defeat in demo mode?

**Current Code:**
- `game.bossesDefeated` increments on boss defeat
- First boss: `game.bossesDefeated === 1`

**Implementation:**
```javascript
// In handleBossDefeat() or boss defeat handler
if (game.gameMode === 'demo' && game.bossesDefeated === 1) {
  showEndDemoModal();
  game.paused = true;
}
```

**Decision:** Use `game.bossesDefeated === 1` check ✅

---

## Integration Points

### Existing Systems to Integrate With:

1. **Badge System** ✅
   - Reuse `BadgeService.getBadge()` for discount lookup
   - Same discount calculation as store

2. **Price Converter** ✅
   - Reuse existing `priceConverter` service
   - Same USD → token conversion logic

3. **Store Modal** ✅
   - Enhance existing store modal with Game Pass tab
   - Add context-aware tab visibility

4. **Boss Defeat Handler** ⚠️
   - Need to add demo mode check
   - Show End Demo modal after first boss

5. **Game Start Logic** ⚠️
   - Add game mode selection
   - Add credit check before starting

---

## Implementation Order

### Step 1: Smart Contract (Day 1-2)
1. Create `game_pass.move` contract
2. Implement data structures
3. Implement purchase functions
4. Implement credit consumption
5. Implement admin functions
6. Test with unit tests

### Step 2: Backend Service (Day 3-4)
1. Create `game-pass-service.ts`
2. Implement status checking
3. Implement purchase processing
4. Implement price calculation (reuse store logic)
5. Add API endpoints
6. Test API endpoints

### Step 3: Frontend - Demo Mode (Day 5)
1. Add game mode selection buttons
2. Implement demo mode flag
3. Add first boss detection
4. Create End Demo modal
5. Test demo flow

### Step 4: Frontend - Paywall (Day 6-7)
1. Enhance store modal with Game Pass tab
2. Add credit display component
3. Implement credit consumption flow
4. Test full game flow
5. Test paywall flow

### Step 5: Integration & Testing (Day 8-10)
1. End-to-end testing
2. Edge case testing
3. UI/UX polish
4. Documentation

---

## Testing Checklist

### Smart Contract Tests:
- [ ] Purchase credit pack (first time)
- [ ] Purchase credit pack (stacking)
- [ ] Pay-per-game purchase
- [ ] Credit consumption
- [ ] Admin functions (grant credits, refunds)
- [ ] Edge cases (insufficient payment, no credits, etc.)

### Backend Tests:
- [ ] Status checking API
- [ ] Purchase processing with badge discount
- [ ] Price conversion (SUI/$MEWS/USDC)
- [ ] Credit consumption API
- [ ] Error handling

### Frontend Tests:
- [ ] Demo mode (free first level)
- [ ] Full game mode (credit consumption)
- [ ] End Demo modal (after first boss)
- [ ] Paywall modal (no credits)
- [ ] Credit display
- [ ] Purchase flow (all payment tokens)
- [ ] Badge discount display

### Integration Tests:
- [ ] Complete demo flow
- [ ] Complete full game flow
- [ ] Purchase → consume → play flow
- [ ] Paywall → purchase → continue flow

---

## Decisions Made ✅

1. **Tournament Tickets:** ✅ Add data structure now, implement functions in Phase 3

2. **Credit Display:** ✅ Main menu and store (Game Pass tab only)
   - ❌ NOT during game
   - ❌ NOT during post-game

3. **Demo Mode Persistence:** ✅ No, demo is one-time free experience

4. **First Game Free:** ✅ Replace with demo (as per plan)

5. **GamePass Ownership:** ✅ Shared object (admin can update)

6. **Admin Capability:** ✅ Reuse from premium_store

7. **Payment Tokens:** ✅ Generic coin type `<T>`

8. **Demo Mode State:** ✅ Game state flag

---

## Next Steps

1. **Review this discussion document**
2. **Confirm key decisions** (admin capability, payment tokens, etc.)
3. **Clarify any open questions**
4. **Begin implementation** starting with smart contract

---

**Ready to proceed?** Let me know if you have any questions or want to discuss any of these points before we begin implementation!

