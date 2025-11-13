# Premium Store Implementation Order

**📌 Note:** For agent handoff, see [STORE_UI_IMPLEMENTATION_HANDOFF.md](./STORE_UI_IMPLEMENTATION_HANDOFF.md)

## 📋 Recommended Implementation Sequence

This document outlines the **optimal order** for implementing the premium store system. The order is designed to:
- Enable incremental testing at each step
- Minimize rework
- Allow UI/UX refinement before blockchain integration
- Test game mechanics before full integration

---

## Phase 1: UI Foundation (Start Here) 🎨

### 1.1 Build Store Modal/UI
**Goal:** Create the store interface with mock data  
**Time:** 3-4 hours  
**Dependencies:** None

**Tasks:**
- [x] Create `src/game/systems/ui/store-ui.js`
- [x] Design store modal layout (similar to leaderboard modal)
- [x] Add "Store" button to main menu
- [x] Create item catalog display (grid/list view)
- [x] Add item cards with:
  - Item name and description
  - Level options (1, 2, 3)
  - Price display (placeholder: "100 $MEWS")
  - Purchase button
- [x] **Item selection validation:**
  - Only one item of each type can be selected per game
  - If user selects a different level of same type, deselect previous level
  - Visual feedback when item is selected/deselected
  - Disable other levels of same item type when one is selected
- [x] Add wallet connection check
- [x] Add balance display (placeholder)
- [x] Style with CSS (responsive, match game theme)

**Status:** ✅ **COMPLETED**

**Why First:** 
- You can see and refine the UI/UX immediately
- No dependencies on backend or blockchain
- Easy to iterate on design
- Can test user flow with mock interactions

**Files to Create:**
- `src/game/systems/ui/store-ui.js`
- `src/game/rendering/responsive/shared/store-modal.css` (or add to existing CSS)

**Testing:**
- Open store modal
- Browse items
- Click purchase buttons (will show "Not connected" or mock message)
- Verify responsive design

---

## Phase 2: Item Catalog & Data Structure 📦

### 2.1 Define Item Catalog
**Goal:** Create the data structure for all store items  
**Time:** 1-2 hours  
**Dependencies:** Phase 1 (UI structure)

**Tasks:**
- [x] Create `src/game/systems/store/item-catalog.js`
- [x] Define all items with properties:
  ```javascript
  {
    id: 'extraLives',
    name: 'Extra Lives',
    description: 'Start with additional lives',
    levels: [
      { level: 1, price: 100, effect: '+1 life' },
      { level: 2, price: 250, effect: '+2 lives' },
      { level: 3, price: 500, effect: '+3 lives' }
    ],
    category: 'defensive',
    icon: '❤️'
  }
  ```
- [x] Include all 7 item types:
  - Extra Lives (3 levels)
  - Force Field Start (3 levels)
  - Orb Level Start (3 levels)
  - Slow Time Power (3 levels)
  - Destroy All Enemies (1 level)
  - Boss Kill Shot (1 level)
  - Coin Tractor Beam (3 levels)
- [x] Create helper functions:
  - `getItemById(id)`
  - `getItemPrice(id, level)`
  - `getAllItems()`
  - `getItemsByCategory()`

**Status:** ✅ **COMPLETED**

**Why Second:**
- Provides data structure for UI
- Can populate store modal with real item data
- Makes it easy to add/remove items later
- Centralizes item definitions

**Files to Create:**
- `src/game/systems/store/item-catalog.js`

**Testing:**
- Import catalog in store UI
- Display all items in modal
- Verify prices and descriptions show correctly

---

## Phase 3: Mock Purchase Flow (No Blockchain) 🧪

### 3.1 Implement Mock Purchase System
**Goal:** Test purchase flow with localStorage  
**Time:** 2-3 hours  
**Dependencies:** Phase 1, Phase 2

**Tasks:**
- [x] Create `src/game/systems/store/inventory-manager.js`
- [x] Implement localStorage-based inventory:
  ```javascript
  {
    walletAddress: '0x...',
    items: {
      extraLives: { level1: 2, level2: 1, level3: 0 },
      forceField: { level1: 0, level2: 0, level3: 0 },
      // ...
    }
  }
  ```
- [x] Add functions:
  - `addItemToInventory(itemId, level)`
  - `getInventory(walletAddress)`
  - `hasItem(itemId, level)`
  - `getItemCount(itemId, level)`
- [x] Update store UI to:
  - Show current inventory counts
  - Handle "Purchase" button clicks
  - Add item to inventory (localStorage)
  - Show success message
  - Update inventory display
- [x] Add inventory display section in store modal (using "Owned" badges on cards)

**Status:** ✅ **COMPLETED**

**Why Third:**
- Tests the full purchase flow without blockchain complexity
- Validates UX and user flow
- Can test edge cases (insufficient balance, etc.)
- Easy to debug and iterate

**Files to Create/Modify:**
- `src/game/systems/store/inventory-manager.js` (new)
- `src/game/systems/ui/store-ui.js` (update)

**Testing:**
- Purchase items
- Verify inventory updates
- Check localStorage
- Test multiple purchases
- Test inventory display

---

## Phase 4: Game Code Integration 🎮

### 4.1 Implement Items in Game Logic
**Goal:** Make purchased items actually work in the game  
**Time:** 12-16 hours (varies by item)  
**Dependencies:** Phase 3 (inventory system)

**Implementation Order (by complexity):**

#### 4.1.1 Extra Lives (Easiest - 2-3 hours)
- [x] Modify `src/game/main.js`:
  - Update `restart()` to check inventory for extra lives
  - Initialize `game.lives = 3 + purchasedLives`
  - Track `game.baseLives` vs `game.purchasedLives`
- [x] Update UI to show purchased lives differently (gold color)
- [x] Test: Start game with extra lives

**Status:** ✅ **COMPLETED**

#### 4.1.2 Force Field Start (Medium - 2-3 hours)
- [x] Modify force field system:
  - Check inventory for force field level
  - Initialize force field at purchased level on game start
  - Update force field rendering (Level 3 with orbiting particles)
- [x] Test: Start game with force field active

**Status:** ✅ **COMPLETED** (Level 3 implemented with 75px radius, orbiting sparkles)

#### 4.1.3 Orb Level Start (Medium - 2-3 hours)
- [x] Modify orb system:
  - Check inventory for orb level
  - Initialize orb at purchased level
  - Update max level to 10 (stretch progression)
  - Implement power-up cap system (prevents new spawns, allows "lucky upgrades")
- [x] Test: Start game with higher orb level

**Status:** ✅ **COMPLETED** (Level 10 max, power curve mapped to old level 6)

#### 4.1.4 Slow Time Power (Hard - 3-4 hours)
- [x] Create new power system in `src/game/systems/consumables/slow-time.js`:
  - Add `game.slowTimePower` object
  - Implement time slowing logic (affects scrollSpeed, enemySpeed, projectiles, fire rates, boss speed)
  - Add UI button for activation (mobile footer + desktop footer)
  - Add visual effects (screen tint, particles)
  - Add keyboard shortcut (S key)
- [x] Test: Activate slow time during gameplay

**Status:** ✅ **COMPLETED** (Full implementation with all game elements affected)

#### 4.1.5 Destroy All Enemies (Hard - 3-4 hours)
- [x] Create missile system in `src/game/systems/consumables/destroy-all.js`:
  - Spawn seeking missiles for each enemy
  - Auto-target closest enemies
  - Instant destruction on impact (follows standard destruction process)
  - Award regular score
  - Magical purple/magenta rendering
- [x] Add UI button (mobile footer + desktop footer, disabled during boss fights)
- [x] Test: Clear screen of enemies

**Status:** ✅ **COMPLETED** (Seeking missiles with magical visual effects)

#### 4.1.6 Boss Kill Shot (Medium - 2-3 hours)
- [x] Modify boss system in `src/game/systems/consumables/boss-kill-shot.js`:
  - Check for boss kill shot in inventory
  - Add instant kill function (1.5s charge, then instant kill)
  - Award boss defeat score (regular, no bonus)
  - Viewport-wide white flash effect (500ms)
- [x] Add UI button (mobile footer + desktop footer, only available during boss fights)
- [x] Test: Instantly kill boss

**Status:** ✅ **COMPLETED** (Charge sequence, viewport flash, instant boss defeat)

#### 4.1.7 Coin Tractor Beam (Hard - 3-4 hours)
- [x] Create pull beam system in `src/game/systems/consumables/coin-tractor-beam.js`
- [x] Modify coin collection logic (pulls coins and Level 3 power-ups)
- [x] Add visual effects (green glow around items, glowing beams to player)
- [x] Test: Pull coins from distance

**Status:** ✅ **COMPLETED** (Level 3 pulls power-ups, visual effects with glow and beams)

**Why Fourth:**
- Can test items work correctly before blockchain
- Validates game balance
- Ensures items provide value
- Can iterate on mechanics

**Files to Modify:**
- `src/game/main.js` (all items)
- `src/game/systems/enemies/enemy-system.js` (destroy all)
- `src/game/systems/boss/boss-system.js` (boss kill shot)
- `src/game/systems/powerups/powerup-system.js` (coin tractor beam)
- `src/game/rendering/ui/ui-rendering.js` (power buttons)
- `src/game/rendering/effects.js` (visual effects)

**Testing:**
- Start game with each item type
- Verify items work as expected
- Test game balance
- Ensure items don't break existing gameplay

---

## Phase 5: Backend API (Blockchain Prep) 🔌

### 5.1 Create Backend API Routes
**Goal:** Create API endpoints for store operations  
**Time:** 3-4 hours  
**Dependencies:** Phase 4 (game code working)

**Tasks:**
- [ ] Create `backend/app/api/store/items/route.ts`:
  - Returns item catalog with prices
  - Can use item-catalog.js data or database
- [ ] Create `backend/app/api/store/inventory/:address/route.ts`:
  - Returns player's inventory
  - For now, can query localStorage or mock data
  - Later: Query blockchain
- [ ] Create `backend/app/api/store/purchase/route.ts`:
  - Validates purchase request
  - For now, updates mock inventory
  - Later: Calls smart contract
- [ ] Update frontend to call API instead of localStorage

**Why Fifth:**
- Separates frontend from data storage
- Prepares for blockchain integration
- Can test API independently
- Makes it easy to swap localStorage for blockchain later

**Files to Create:**
- `backend/app/api/store/items/route.ts`
- `backend/app/api/store/inventory/[address]/route.ts`
- `backend/app/api/store/purchase/route.ts`

**Testing:**
- Test API endpoints with Postman/curl
- Verify frontend can fetch items
- Verify purchase flow works via API

---

## Phase 6: Smart Contract (Blockchain) ⛓️

### 6.1 Design & Implement Smart Contract
**Goal:** Create on-chain inventory system  
**Time:** 4-6 hours  
**Dependencies:** Phase 5 (API structure)

**Tasks:**
- [ ] Design `PlayerInventory` struct (see Section 4.1 in store design doc)
- [ ] Create `contracts/premium_store/sources/premium_store.move`
- [ ] Implement functions:
  - `purchase_item()` - Purchase and add to inventory
  - `get_inventory()` - Query player inventory
  - `consume_item()` - Consume item when game starts
- [ ] Add events:
  - `ItemPurchased`
  - `InventoryUpdated`
- [ ] Deploy to testnet
- [ ] Test with Sui CLI

**Why Sixth:**
- All game logic is working
- API structure is ready
- Can test contract independently
- Easy to integrate once working

**Files to Create:**
- `contracts/premium_store/sources/premium_store.move`
- `contracts/premium_store/Move.toml`

**Testing:**
- Deploy contract
- Test purchase function
- Test inventory query
- Verify events emitted

---

## Phase 7: Blockchain Integration 🔗

### 7.1 Connect Backend to Smart Contract
**Goal:** Backend calls smart contract for purchases  
**Time:** 2-3 hours  
**Dependencies:** Phase 6 (contract deployed)

**Tasks:**
- [ ] Update `backend/app/api/store/purchase/route.ts`:
  - Call smart contract `purchase_item()` function
  - Handle transaction signing
  - Wait for transaction confirmation
  - Return purchase receipt
- [ ] Update `backend/app/api/store/inventory/:address/route.ts`:
  - Query `PlayerInventory` object from blockchain
  - Return inventory data
- [ ] Add error handling:
  - Insufficient balance
  - Transaction failures
  - Network errors

**Why Seventh:**
- Contract is tested and working
- API structure is ready
- Can test end-to-end flow

**Files to Modify:**
- `backend/app/api/store/purchase/route.ts`
- `backend/app/api/store/inventory/[address]/route.ts`
- `backend/lib/sui/store-service.ts` (new - contract interaction)

**Testing:**
- Make real purchase via API
- Verify transaction on blockchain
- Check inventory updates
- Test error cases

---

## Phase 8: Frontend Blockchain Integration 💻

### 8.1 Connect Frontend to Backend API
**Goal:** Frontend uses blockchain-backed API  
**Time:** 2-3 hours  
**Dependencies:** Phase 7 (backend connected)

**Tasks:**
- [ ] Update `src/game/systems/ui/store-ui.js`:
  - Replace localStorage calls with API calls
  - Handle wallet connection for purchases
  - Show transaction status
  - Handle errors gracefully
- [ ] Update `src/game/systems/store/inventory-manager.js`:
  - Fetch inventory from API (which queries blockchain)
  - Cache for performance
  - Refresh on purchase
- [ ] Update game start flow:
  - Fetch inventory from API
  - Apply items to game initialization
  - Consume items via API (calls smart contract)

**Why Eighth:**
- Everything else is working
- Just connecting the dots
- Can test full flow end-to-end

**Files to Modify:**
- `src/game/systems/ui/store-ui.js`
- `src/game/systems/store/inventory-manager.js`
- `src/game/main.js` (game start flow)

**Testing:**
- Full purchase flow (wallet → contract → inventory)
- Start game with purchased items
- Verify items consumed on-chain
- Test error handling

---

## Phase 9: Polish & Testing ✨

### 9.1 Final Testing & Refinement
**Goal:** Ensure everything works perfectly  
**Time:** 4-6 hours  
**Dependencies:** Phase 8 (full integration)

**Tasks:**
- [ ] End-to-end testing:
  - Purchase each item type
  - Start game with items
  - Use items in-game
  - Verify inventory updates
  - Test edge cases
- [ ] UI/UX polish:
  - Loading states
  - Error messages
  - Success animations
  - Responsive design
- [ ] Game balance testing:
  - Are items too powerful?
  - Are prices appropriate?
  - Is free play still viable?
- [ ] Performance optimization:
  - Cache inventory queries
  - Optimize API calls
  - Reduce blockchain queries
- [ ] Documentation:
  - Update user guide
  - Document API endpoints
  - Update store design doc

**Why Last:**
- Everything is integrated
- Can test real user scenarios
- Final polish before launch

---

## 📊 Summary: Recommended Order

1. **UI Modal** (3-4h) - See it, test UX
2. **Item Catalog** (1-2h) - Define structure
3. **Mock Purchase** (2-3h) - Test flow
4. **Game Code** (12-16h) - Make items work
5. **Backend API** (3-4h) - Prepare for blockchain
6. **Smart Contract** (4-6h) - On-chain inventory
7. **Backend Integration** (2-3h) - Connect API to contract
8. **Frontend Integration** (2-3h) - Connect UI to API
9. **Polish** (4-6h) - Final testing

**Total Estimated Time:** 32-47 hours

---

## 🎯 Key Principles

1. **UI First:** See and refine the experience before building backend
2. **Mock Before Real:** Test with localStorage before blockchain
3. **Game Before Blockchain:** Ensure items work in-game before on-chain
4. **Incremental:** Test at each phase, don't wait until the end
5. **Iterative:** Refine based on testing, don't assume it's perfect

---

## ⚠️ Important Notes

- **You can test each phase independently** - Don't wait for everything
- **Game code changes are significant** - Budget time for new features (Slow Time, Destroy All, etc.)
- **Blockchain is last** - Get everything working first, then add blockchain
- **Inventory is on-chain** - Smart contract stores item counts (see store design doc Section 4.1)

---

## 🔄 Alternative: Parallel Development

If you have multiple developers, you can work in parallel:
- **Developer 1:** UI + Mock Purchase (Phases 1-3)
- **Developer 2:** Game Code (Phase 4)
- **Developer 3:** Backend API + Smart Contract (Phases 5-6)

Then integrate together (Phases 7-9).

---

**Next Step:** Start with Phase 1 - Build the Store Modal UI! 🚀

