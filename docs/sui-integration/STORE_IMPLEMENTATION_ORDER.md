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
- [x] Create `backend/app/api/store/items/route.ts`:
  - Returns item catalog with prices
  - Uses CoinGecko API for price conversion (SUI, MEWS, USDC)
  - Implements 5-minute price caching
  - Returns all items with current token prices
- [x] Create `backend/app/api/store/inventory/[address]/route.ts`:
  - Returns player's inventory from blockchain
  - Queries `PlayerInventory` object using dynamic object fields
  - Handles Next.js 15+ async params
  - Returns formatted inventory data
- [x] Create `backend/app/api/store/purchase/route.ts`:
  - Validates purchase request
  - Builds unsigned Sui transaction for player to sign
  - Supports multi-item purchases in single transaction
  - Calculates gas estimates with 15% buffer
- [x] Create `backend/app/api/store/consume/route.ts`:
  - Admin-signed transaction for item consumption
  - Supports batch consumption (multiple items in one transaction)
  - Includes retry logic for object lock conflicts
  - Pre-checks inventory before consumption
- [x] Create `backend/app/api/store/transaction/[digest]/route.ts`:
  - Optional endpoint to check transaction status
  - Verifies transaction on blockchain
- [x] Create `backend/app/api/store/migrate/route.ts`:
  - Migrates player inventories from old contract to new contract
- [x] Create `backend/app/api/config/route.ts`:
  - Returns backend network configuration for frontend sync
- [x] Update frontend to call API instead of localStorage

**Status:** ✅ **COMPLETED**

**Implementation Details:**
- **Price Conversion Service:** `backend/lib/services/price-converter.ts`
  - Fetches SUI price from CoinGecko
  - Fetches MEWS price from CoinGecko → GeckoTerminal → env fallback
  - USDC price fixed at $1.00
  - 5-minute in-memory cache with graceful fallback
- **Store Service:** `backend/lib/sui/store-service.ts`
  - `getInventory()` - Queries blockchain for player inventory
  - `buildPurchaseTransaction()` - Creates unsigned purchase transaction
  - `consumeItems()` - Admin-signed consumption with retry logic
  - Handles package ID mismatches and object version conflicts
- **Network Configuration:** Frontend dynamically fetches network from `/api/config` to ensure consistency

**Files Created:**
- `backend/app/api/store/items/route.ts`
- `backend/app/api/store/inventory/[address]/route.ts`
- `backend/app/api/store/purchase/route.ts`
- `backend/app/api/store/consume/route.ts`
- `backend/app/api/store/transaction/[digest]/route.ts`
- `backend/app/api/store/migrate/route.ts`
- `backend/app/api/config/route.ts`
- `backend/lib/services/price-converter.ts`
- `backend/lib/sui/store-service.ts`
- `backend/lib/sui/migration-service.ts`

**Testing:**
- ✅ API endpoints tested with PowerShell/curl
- ✅ Frontend successfully fetches items and prices
- ✅ Purchase flow works end-to-end
- ✅ Batch consumption working (multiple items in one transaction)
- ✅ Retry logic handles object lock conflicts

---

## Phase 6: Smart Contract (Blockchain) ⛓️

### 6.1 Design & Implement Smart Contract
**Goal:** Create on-chain inventory system  
**Time:** 4-6 hours  
**Dependencies:** Phase 5 (API structure)

**Tasks:**
- [x] Design `PlayerInventory` struct (see Section 4.1 in store design doc)
- [x] Create `contracts/suitwo_game/sources/premium_store.move`
- [x] Implement functions:
  - `purchase_item()` - Player-signed purchase and add to inventory
  - `get_inventory_item_count()` - Query specific item count
  - `get_all_inventory()` - Query all player inventory
  - `consume_item()` - Admin-signed consumption (admin pays gas)
  - `migrate_player_inventory()` - Migrate items from old contract
- [x] Add events:
  - `ItemPurchased` - Emitted on purchase
  - `InventoryUpdated` - Emitted on inventory changes
  - `ItemConsumed` - Emitted on consumption
- [x] Deploy to testnet
- [x] Test with Sui CLI and backend integration

**Status:** ✅ **COMPLETED**

**Implementation Details:**
- **Contract Location:** `contracts/suitwo_game/sources/premium_store.move`
- **Storage:** Uses dynamic object fields for player inventories
- **Payment:** Direct on-chain payment (player signs transaction, player pays)
- **Consumption:** Admin wallet signs and pays gas for consumption
- **Admin Capability:** Separate `premium_store::AdminCapability` (different from score submission)
- **Item Types:** Supports all 7 item types with 3 levels each (except single-level items)
- **Migration:** Includes `migrate_player_inventory()` for contract upgrades

**Files Created:**
- `contracts/suitwo_game/sources/premium_store.move`
- `contracts/suitwo_game/create-admin-capability.js` (admin capability creation script)

**Testing:**
- ✅ Contract deployed to testnet
- ✅ Purchase function tested and working
- ✅ Inventory query tested and working
- ✅ Consumption function tested and working
- ✅ Events verified on blockchain
- ✅ Migration function tested

---

## Phase 7: Blockchain Integration 🔗

### 7.1 Connect Backend to Smart Contract
**Goal:** Backend calls smart contract for purchases  
**Time:** 2-3 hours  
**Dependencies:** Phase 6 (contract deployed)

**Tasks:**
- [x] Update `backend/app/api/store/purchase/route.ts`:
  - Builds unsigned Sui transaction for `purchase_item()` function
  - Player signs transaction in frontend wallet
  - Returns base64-encoded transaction bytes
  - Supports multi-item purchases in single transaction
- [x] Update `backend/app/api/store/inventory/[address]/route.ts`:
  - Queries `PlayerInventory` object from blockchain using dynamic object fields
  - Handles Next.js 15+ async params
  - Returns formatted inventory data
- [x] Update `backend/app/api/store/consume/route.ts`:
  - Admin wallet signs and executes `consume_item()` transaction
  - Admin pays gas fees
  - Includes retry logic for object lock conflicts
  - Pre-checks inventory before consumption
- [x] Add error handling:
  - Insufficient balance (frontend validation)
  - Transaction failures (detailed error messages)
  - Network errors (graceful fallback)
  - Package ID mismatches (auto-detection and correction)
  - Object version conflicts (retry with exponential backoff)

**Status:** ✅ **COMPLETED**

**Implementation Details:**
- **Transaction Building:** Uses Sui SDK `Transaction` builder
- **Gas Estimation:** 15% buffer on SDK estimates
- **Error Recovery:** Retry logic with exponential backoff (500ms, 1000ms, 2000ms)
- **Package ID Management:** Auto-detects and uses correct package ID from objects
- **Network Sync:** Backend `/api/config` endpoint ensures frontend/backend network consistency

**Files Modified:**
- `backend/app/api/store/purchase/route.ts`
- `backend/app/api/store/inventory/[address]/route.ts`
- `backend/app/api/store/consume/route.ts`
- `backend/lib/sui/store-service.ts`

**Testing:**
- ✅ Real purchases via API working
- ✅ Transactions verified on blockchain
- ✅ Inventory updates correctly
- ✅ Error cases handled gracefully
- ✅ Batch consumption working (multiple items in one transaction)

---

## Phase 8: Frontend Blockchain Integration 💻

### 8.1 Connect Frontend to Backend API
**Goal:** Frontend uses blockchain-backed API  
**Time:** 2-3 hours  
**Dependencies:** Phase 7 (backend connected)

**Tasks:**
- [x] Update `src/game/systems/ui/store-ui.js`:
  - Replaced localStorage calls with API calls
  - Fetches item catalog and prices from `/api/store/items`
  - Fetches inventory from `/api/store/inventory/:address`
  - Handles wallet connection for purchases
  - Signs and executes purchase transactions via wallet API
  - Polls transaction status until confirmed
  - Shows transaction status and updates inventory display
  - Handles errors gracefully
  - Network configuration sync with backend
- [x] Update `src/game/systems/store/item-consumption.js`:
  - Fetches inventory from blockchain API for validation
  - Validates item availability before game start
  - Clears selected items between games
- [x] Update `src/game/systems/consumables/consumable-system.js`:
  - Implements `consumeItemFromBlockchain()` for single items
  - Implements `consumeItemsFromBlockchain()` for batch consumption
  - Calls `/api/store/consume` endpoint
  - Handles async consumption without blocking gameplay
- [x] Update `wallet-module/src/wallet-api.jsx`:
  - Handles transaction deserialization (base64 → Transaction object)
  - Fixed MEWS balance display (network-aware decimals: 6 for mainnet, 9 for testnet)
  - Network configuration sync with backend
  - Explicit chain parameter for transaction signing
- [x] Update game start flow (`src/game/main.js`):
  - Batch consumes all start items in single transaction
  - Collects `orbLevel`, `extraLives`, and `forceField` items
  - Calls `consumeItemsFromBlockchain()` with all items at once
  - Prevents object lock conflicts

**Status:** ✅ **COMPLETED**

**Implementation Details:**
- **Transaction Handling:** Frontend receives base64-encoded transaction bytes, deserializes and signs via wallet
- **Network Sync:** Frontend fetches network from `/api/config` to ensure consistency
- **Balance Display:** Network-aware decimal handling for MEWS (6 decimals mainnet, 9 decimals testnet)
- **Batch Consumption:** All start items consumed in single transaction to prevent conflicts
- **Item Selection:** Properly clears between games to prevent stale selections

**Files Modified:**
- `src/game/systems/ui/store-ui.js`
- `src/game/systems/store/item-consumption.js`
- `src/game/systems/consumables/consumable-system.js`
- `src/game/main.js`
- `wallet-module/src/wallet-api.jsx`

**Testing:**
- ✅ Full purchase flow working (wallet → contract → inventory)
- ✅ Start game with purchased items working
- ✅ Items consumed on-chain verified
- ✅ Batch consumption working (multiple items in one transaction)
- ✅ Error handling tested
- ✅ Network consistency verified
- ✅ Item selection clearing between games working

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

## 📊 Summary: Implementation Status

1. **UI Modal** ✅ **COMPLETED** (3-4h) - Store UI with item selection
2. **Item Catalog** ✅ **COMPLETED** (1-2h) - All 7 items defined
3. **Mock Purchase** ✅ **COMPLETED** (2-3h) - localStorage-based testing
4. **Game Code** ✅ **COMPLETED** (12-16h) - All items functional in-game
5. **Backend API** ✅ **COMPLETED** (3-4h) - All endpoints implemented
6. **Smart Contract** ✅ **COMPLETED** (4-6h) - Deployed and tested
7. **Backend Integration** ✅ **COMPLETED** (2-3h) - Connected to contract
8. **Frontend Integration** ✅ **COMPLETED** (2-3h) - Full blockchain flow
9. **Polish & Testing** ⏳ **IN PROGRESS** (4-6h) - Final refinement

**Total Time Spent:** ~35-45 hours  
**Current Status:** Phases 1-8 complete, Phase 9 in progress

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

