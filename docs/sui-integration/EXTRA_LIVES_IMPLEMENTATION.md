# Extra Lives Feature - Implementation Plan

## Overview

This document outlines the implementation plan for the Extra Lives premium item feature. This is the first premium store item to be implemented.

**Status:** Design Phase - Ready for Implementation  
**Last Updated:** 2025-01-15

---

## 1. Requirements

### 1.1 Functional Requirements

1. **Purchase System:**
   - Players can purchase 1, 2, or 3 extra lives (pre-purchase inventory system)
   - Players can buy multiple extra lives and store them in inventory
   - Only ONE extra lives purchase can be used per game (selected from inventory)
   - Purchase is consumed from inventory when game starts
   - Price: Level 1 (100 $MEWS), Level 2 (250 $MEWS), Level 3 (500 $MEWS) - TBD
   - **Future:** NFT system for inventory items (can be added later)

2. **Inventory System:**
   - Pre-purchase system: Players buy items and store in inventory
   - Inventory persists across games
   - Before game start, player selects which items to use (if any)
   - Selected items are consumed from inventory when game starts
   - Inventory stored on-chain (via smart contract) or off-chain (localStorage for MVP)

3. **Life Tracking:**
   - **Base Lives:** Default 3 lives (can be replenished in future)
   - **Purchased Lives:** Additional lives from store (NON-REPLENISHABLE)
   - **Total Lives:** `baseLives + purchasedLives`
   - Must track separately to ensure only base lives can be replenished
   - **Visual Distinction:** Purchased lives displayed in different color

4. **Game Initialization:**
   - Before game starts, player selects items from inventory (if any)
   - When game starts, initialize with base lives + selected purchased lives
   - Display in UI: "Starting with X lives (3 base + Y purchased)"
   - Selected purchased lives are consumed from inventory (single-use per game)

4. **Life Consumption:**
   - When player dies, consume a life
   - Track which type of life was consumed (for display purposes)
   - When all lives are gone, game over

5. **Future Replenishment:**
   - If replenishment system is added, only `baseLives` can be replenished
   - `purchasedLives` remain fixed and cannot be replenished
   - Replenishment logic must check `game.baseLives < 3` before adding

---

## 2. Data Structure Design

### 2.1 Game Object Properties

```javascript
const game = {
  // Life tracking (NEW)
  baseLives: 3,              // Default lives (can be replenished)
  purchasedLives: 0,         // Purchased lives (NON-REPLENISHABLE)
  lives: 3,                   // Total lives (baseLives + purchasedLives)
  maxBaseLives: 3,           // Maximum base lives (for replenishment cap)
  
  // ... existing properties
};
```

### 2.2 Inventory Data Structure (Generic for All Store Items)

```javascript
// Inventory system - stores ALL purchased items (not just extra lives)
const inventory = {
  extraLives: [
    { id: 'uuid-1', type: 'extraLives', level: 1, purchasedAt: timestamp },
    { id: 'uuid-2', type: 'extraLives', level: 2, purchasedAt: timestamp },
    { id: 'uuid-3', type: 'extraLives', level: 1, purchasedAt: timestamp }
  ],
  forceField: [
    { id: 'uuid-4', type: 'forceField', level: 2, purchasedAt: timestamp }
  ],
  orbLevel: [
    { id: 'uuid-5', type: 'orbLevel', level: 3, purchasedAt: timestamp }
  ],
  slowTime: [
    { id: 'uuid-6', type: 'slowTime', level: 1, purchasedAt: timestamp }
  ],
  destroyAll: [],
  bossKillShot: [],
  // Future item types can be added here
};

// Selected items for current game (consumed when game starts)
// Only one item of each type can be selected per game
const selectedItems = {
  extraLives: { id: 'uuid-2', type: 'extraLives', level: 2 },  // Selected from inventory
  // forceField: { ... },  // Can select one of each type
  // orbLevel: { ... }
};
```

### 2.3 Visual Rendering

```javascript
// Life display with color coding
const lifeDisplay = {
  baseLives: {
    count: 3,
    color: '#FF0000',      // Red (default)
    icon: '❤️'            // Red heart
  },
  purchasedLives: {
    count: 2,
    color: '#FFD700',      // Gold (premium)
    icon: '💛'             // Gold/yellow heart
  }
};
```

---

## 3. Implementation Steps

### Step 1: Update Game Object Initialization

**File:** `src/game/main.js`

**Changes:**
1. Add new properties to game object:
   ```javascript
   baseLives: 3,
   purchasedLives: 0,
   maxBaseLives: 3,
   ```

2. Update `restart()` function to handle purchased lives:
   ```javascript
   function restart(purchasedItems = {}) {
     // ... existing reset code ...
     
     // Initialize lives based on purchases
     game.baseLives = 3;  // Always start with 3 base lives
     game.purchasedLives = purchasedItems.extraLives || 0;  // From store purchase
     game.lives = game.baseLives + game.purchasedLives;  // Total lives
     
     // ... rest of restart code ...
   }
   ```

3. Update life consumption logic to track which type was consumed:
   ```javascript
   function consumeLife() {
     if (game.purchasedLives > 0) {
       // Consume purchased life first
       game.purchasedLives--;
     } else {
       // Consume base life
       game.baseLives--;
     }
     
     // Update total
     game.lives = game.baseLives + game.purchasedLives;
     
     if (game.lives <= 0) {
       gameOver();
     }
   }
   ```

---

### Step 2: Create Inventory System (Generic for All Store Items)

**File:** `src/game/systems/store/inventory-manager.js` (NEW)

**Purpose:** Generic inventory manager for ALL store items (extra lives, force field, orb level, powers, etc.)

```javascript
// Generic Inventory Manager - Handles all store item types
const InventoryManager = {
  // Player's inventory (loaded from blockchain or localStorage)
  // Structure supports all item types: extraLives, forceField, orbLevel, slowTime, destroyAll, bossKillShot
  inventory: {
    extraLives: [],
    forceField: [],
    orbLevel: [],
    slowTime: [],
    destroyAll: [],
    bossKillShot: [],
    // Future items can be added here
  },
  
  // Items selected for current game (consumed when game starts)
  // Only one item of each type can be selected per game
  selectedItems: {},
  
  // Item type definitions (for validation and display)
  itemTypes: {
    extraLives: {
      name: 'Extra Lives',
      maxPerGame: 1,
      consumable: true,  // Consumed when game starts
      levels: [1, 2, 3]  // Available levels
    },
    forceField: {
      name: 'Force Field Start',
      maxPerGame: 1,
      consumable: true,
      levels: [1, 2, 3]
    },
    orbLevel: {
      name: 'Orb Level Start',
      maxPerGame: 1,
      consumable: true,
      levels: [1, 2, 3, 4]
    },
    slowTime: {
      name: 'Slow Time Power',
      maxPerGame: 1,
      consumable: true,
      levels: [1, 2, 3]
    },
    destroyAll: {
      name: 'Destroy All Enemies',
      maxPerGame: 1,
      consumable: true,
      levels: [1, 2, 3]
    },
    bossKillShot: {
      name: 'Boss Kill Shot',
      maxPerGame: 1,
      consumable: true,
      levels: [1, 2, 3]
    }
  },
  
  // Initialize inventory (load from blockchain or localStorage)
  async initialize() {
    // TODO: Load from blockchain or localStorage
    // For MVP: Use localStorage
    const stored = localStorage.getItem('gameInventory');
    if (stored) {
      try {
        this.inventory = JSON.parse(stored);
        // Ensure all item type arrays exist
        Object.keys(this.itemTypes).forEach(itemType => {
          if (!this.inventory[itemType]) {
            this.inventory[itemType] = [];
          }
        });
      } catch (e) {
        console.error('❌ [INVENTORY] Error loading inventory:', e);
        this.inventory = this.getEmptyInventory();
      }
    } else {
      this.inventory = this.getEmptyInventory();
    }
    console.log('📦 [INVENTORY] Loaded:', this.inventory);
  },
  
  // Get empty inventory structure
  getEmptyInventory() {
    const empty = {};
    Object.keys(this.itemTypes).forEach(itemType => {
      empty[itemType] = [];
    });
    return empty;
  },
  
  // Save inventory (to blockchain or localStorage)
  async save() {
    // TODO: Save to blockchain
    // For MVP: Use localStorage
    try {
      localStorage.setItem('gameInventory', JSON.stringify(this.inventory));
      console.log('💾 [INVENTORY] Saved:', this.inventory);
    } catch (e) {
      console.error('❌ [INVENTORY] Error saving inventory:', e);
    }
  },
  
  // Add item to inventory (after purchase) - Generic for all item types
  addItem(itemType, itemLevel, itemData = {}) {
    // Validate item type
    if (!this.itemTypes[itemType]) {
      console.error('❌ [INVENTORY] Invalid item type:', itemType);
      return null;
    }
    
    // Validate level
    if (!this.itemTypes[itemType].levels.includes(itemLevel)) {
      console.error('❌ [INVENTORY] Invalid level for', itemType, ':', itemLevel);
      return null;
    }
    
    if (!this.inventory[itemType]) {
      this.inventory[itemType] = [];
    }
    
    const item = {
      id: crypto.randomUUID(),
      type: itemType,
      level: itemLevel,
      ...itemData,
      purchasedAt: Date.now()
    };
    
    this.inventory[itemType].push(item);
    this.save();
    console.log('➕ [INVENTORY] Added item:', item);
    return item;
  },
  
  // Remove item from inventory (when consumed)
  removeItem(itemType, itemId) {
    if (!this.inventory[itemType]) return false;
    
    const index = this.inventory[itemType].findIndex(item => item.id === itemId);
    if (index !== -1) {
      this.inventory[itemType].splice(index, 1);
      this.save();
      console.log('➖ [INVENTORY] Removed item:', itemId);
      return true;
    }
    return false;
  },
  
  // Get available items of a type
  getAvailableItems(itemType) {
    return this.inventory[itemType] || [];
  },
  
  // Get count of available items of a type
  getItemCount(itemType) {
    return this.getAvailableItems(itemType).length;
  },
  
  // Select item for current game (from inventory)
  // Only one item of each type can be selected per game
  selectItem(itemType, itemId) {
    // Validate item type
    if (!this.itemTypes[itemType]) {
      console.error('❌ [INVENTORY] Invalid item type:', itemType);
      return false;
    }
    
    const items = this.getAvailableItems(itemType);
    const item = items.find(i => i.id === itemId);
    
    if (!item) {
      console.warn('⚠️ [INVENTORY] Item not found:', itemId);
      return false;
    }
    
    // Only one item of each type can be selected per game
    this.selectedItems[itemType] = item;
    console.log('✅ [INVENTORY] Selected item:', item);
    return true;
  },
  
  // Deselect item
  deselectItem(itemType) {
    if (this.selectedItems[itemType]) {
      delete this.selectedItems[itemType];
      console.log('❌ [INVENTORY] Deselected item type:', itemType);
      return true;
    }
    return false;
  },
  
  // Get selected items (for game initialization)
  getSelectedItems() {
    return this.selectedItems;
  },
  
  // Get selected item of a specific type
  getSelectedItem(itemType) {
    return this.selectedItems[itemType] || null;
  },
  
  // Clear selected items (after game starts - items are consumed)
  clearSelectedItems() {
    // Remove selected items from inventory (they're consumed)
    Object.keys(this.selectedItems).forEach(itemType => {
      const item = this.selectedItems[itemType];
      this.removeItem(itemType, item.id);
    });
    
    this.selectedItems = {};
    console.log('🗑️ [INVENTORY] Cleared selected items (consumed)');
  },
  
  // Get all inventory counts (for UI display)
  getInventorySummary() {
    const summary = {};
    Object.keys(this.itemTypes).forEach(itemType => {
      summary[itemType] = {
        count: this.getItemCount(itemType),
        name: this.itemTypes[itemType].name,
        items: this.getAvailableItems(itemType)
      };
    });
    return summary;
  },
  
  // Helper: Get extra lives from selected items (specific to extra lives)
  getSelectedExtraLives() {
    const selected = this.selectedItems.extraLives;
    if (!selected) return 0;
    
    // Map level to lives: Level 1 = +1, Level 2 = +2, Level 3 = +3
    return selected.level || 0;
  },
  
  // Helper: Get force field level from selected items
  getSelectedForceFieldLevel() {
    const selected = this.selectedItems.forceField;
    if (!selected) return 0;
    return selected.level || 0;
  },
  
  // Helper: Get orb level from selected items
  getSelectedOrbLevel() {
    const selected = this.selectedItems.orbLevel;
    if (!selected) return 0;
    return selected.level || 0;
  }
};

// Expose globally
window.InventoryManager = InventoryManager;

// Initialize on load
if (typeof window !== 'undefined') {
  window.InventoryManager.initialize();
}
```

---

### Step 3: Update Game Start Flow

**File:** `src/game/systems/ui/menu-system.js`

**Changes:**
1. Modify `startGameInternal()` to get selected items from inventory:
   ```javascript
   function startGameInternal() {
     // ... existing code ...
     
     // Get selected items from inventory
     const selectedItems = window.InventoryManager?.getSelectedItems() || {};
     
     // Start game with selected items
     initializeGame();
     
     // Pass selected items to restart
     if (typeof restart === 'function') {
       restart(selectedItems);
     }
     
     // Clear selected items after game starts (they're consumed from inventory)
     window.InventoryManager?.clearSelectedItems();
   }
   ```

2. **Future:** Add item selection UI before game start (if inventory has items)
   - Show available items from inventory
   - Allow player to select which items to use
   - Only one item of each type can be selected

---

### Step 4: Update Life Consumption Logic

**File:** `src/game/main.js`

**Changes:**
1. Replace all `game.lives--` with `consumeLife()` function:
   ```javascript
   function consumeLife() {
     if (game.purchasedLives > 0) {
       // Consume purchased life first (they're non-replenishable, use them first)
       game.purchasedLives--;
       console.log('💔 [LIVES] Consumed purchased life. Remaining:', {
         base: game.baseLives,
         purchased: game.purchasedLives,
         total: game.baseLives + game.purchasedLives
       });
     } else if (game.baseLives > 0) {
       // Consume base life
       game.baseLives--;
       console.log('💔 [LIVES] Consumed base life. Remaining:', {
         base: game.baseLives,
         purchased: game.purchasedLives,
         total: game.baseLives + game.purchasedLives
       });
     }
     
     // Update total
     game.lives = game.baseLives + game.purchasedLives;
     
     if (game.lives <= 0) {
       gameOver();
     }
   }
   ```

2. Update all places where `game.lives--` is called:
   - Enemy collision (line ~728)
   - Enemy projectile collision (line ~735)
   - Boss projectile collision (line ~742)

---

### Step 5: Update UI Display with Color Coding

**File:** `src/game/rendering/ui/ui-rendering.js` or relevant UI file

**Changes:**
1. Update lives display to show color-coded lives:
   ```javascript
   function updateGameUI() {
     // ... existing code ...
     
     // Update lives display with color coding
     const livesElement = document.getElementById('gameLives');
     if (livesElement) {
       if (game.purchasedLives > 0) {
         // Show breakdown with color coding
         const baseLivesHTML = '❤️'.repeat(game.baseLives);  // Red hearts
         const purchasedLivesHTML = '💛'.repeat(game.purchasedLives);  // Gold hearts
         livesElement.innerHTML = `${baseLivesHTML}${purchasedLivesHTML} <span style="font-size: 0.8em; color: #888;">(${game.lives} total)</span>`;
       } else {
         // Just show base lives
         livesElement.innerHTML = '❤️'.repeat(game.lives);
       }
     }
   }
   ```

2. **Alternative:** Use CSS classes for color coding:
   ```javascript
   function renderLivesDisplay() {
     const container = document.getElementById('livesContainer');
     if (!container) return;
     
     container.innerHTML = '';
     
     // Render base lives (red)
     for (let i = 0; i < game.baseLives; i++) {
       const life = document.createElement('span');
       life.className = 'life-icon life-base';
       life.textContent = '❤️';
       life.style.color = '#FF0000';  // Red
       container.appendChild(life);
     }
     
     // Render purchased lives (gold)
     for (let i = 0; i < game.purchasedLives; i++) {
       const life = document.createElement('span');
       life.className = 'life-icon life-purchased';
       life.textContent = '💛';
       life.style.color = '#FFD700';  // Gold
       container.appendChild(life);
     }
   }
   ```

3. Add display on game start:
   ```javascript
   // In restart() or game initialization
   if (game.purchasedLives > 0) {
     console.log(`🎮 [GAME START] Starting with ${game.lives} lives (3 base + ${game.purchasedLives} purchased)`);
     // Show toast notification with visual distinction
     if (typeof window.showToast === 'function') {
       window.showToast(`Starting with ${game.lives} lives! (${game.baseLives} base + ${game.purchasedLives} premium)`, 'info');
     }
   }
   ```

4. **CSS for life icons:**
   ```css
   .life-icon {
     display: inline-block;
     margin: 0 2px;
     font-size: 1.2em;
   }
   
   .life-base {
     color: #FF0000;  /* Red */
   }
   
   .life-purchased {
     color: #FFD700;  /* Gold */
     filter: drop-shadow(0 0 2px rgba(255, 215, 0, 0.5));  /* Glow effect */
   }
   ```

---

### Step 6: Future Replenishment Logic (Placeholder)

**File:** `src/game/main.js` (for future implementation)

**Template for future replenishment:**
```javascript
function replenishLives(amount = 1) {
  // ONLY replenish base lives, never purchased lives
  const newBaseLives = Math.min(game.baseLives + amount, game.maxBaseLives);
  const livesAdded = newBaseLives - game.baseLives;
  
  if (livesAdded > 0) {
    game.baseLives = newBaseLives;
    game.lives = game.baseLives + game.purchasedLives;  // Recalculate total
    
    console.log(`❤️ [LIVES] Replenished ${livesAdded} base life/lives. Total: ${game.lives}`);
    return true;
  }
  
  return false;  // No replenishment possible (already at max)
}
```

**Important:** This function ensures:
- Only `baseLives` can be replenished
- `purchasedLives` remain unchanged
- Total lives is recalculated after replenishment
- Max base lives cap is respected

---

## 4. Testing Checklist

### 4.1 Basic Functionality
- [ ] Game starts with 3 base lives (default)
- [ ] Game starts with 4 lives when +1 purchased
- [ ] Game starts with 5 lives when +2 purchased
- [ ] Game starts with 6 lives when +3 purchased
- [ ] UI displays correct total lives
- [ ] UI shows breakdown when purchased lives exist

### 4.2 Life Consumption
- [ ] Purchased lives are consumed first (when available)
- [ ] Base lives are consumed after purchased lives are gone
- [ ] Total lives decreases correctly
- [ ] Game over triggers when all lives are gone
- [ ] Console logs show correct life breakdown

### 4.3 Inventory System
- [ ] Items can be added to inventory after purchase
- [ ] Inventory persists across games (localStorage or blockchain)
- [ ] Items can be selected from inventory before game start
- [ ] Only one item of each type can be selected per game
- [ ] Selected items are consumed from inventory when game starts
- [ ] Multiple purchases accumulate in inventory correctly
- [ ] Inventory displays correctly in UI

### 4.4 Visual Distinction
- [ ] Base lives display in red color
- [ ] Purchased lives display in gold/yellow color
- [ ] Color distinction is clear and visible
- [ ] UI shows correct breakdown

### 4.5 Future Replenishment (When Implemented)
- [ ] Replenishment only affects base lives
- [ ] Purchased lives remain unchanged
- [ ] Total lives recalculates correctly
- [ ] Max base lives cap is respected

---

## 5. Code Changes Summary

### Files to Modify:
1. **`src/game/main.js`**
   - Add `baseLives`, `purchasedLives`, `maxBaseLives` to game object
   - Update `restart()` to accept purchases parameter
   - Create `consumeLife()` function
   - Replace all `game.lives--` with `consumeLife()`
   - Add future `replenishLives()` placeholder

2. **`src/game/systems/store/inventory-manager.js`** (NEW)
   - Create **generic** inventory manager module for ALL store items
   - Handle inventory storage (localStorage for MVP, blockchain later)
   - Support all item types: extraLives, forceField, orbLevel, slowTime, destroyAll, bossKillShot
   - Handle item selection for games (one per type)
   - Consume items when game starts
   - Provide helper methods for each item type

3. **`src/game/systems/ui/menu-system.js`**
   - Update `startGameInternal()` to pass purchases to `restart()`
   - Clear purchases after game starts

4. **`src/game/rendering/ui/ui-rendering.js`** (or relevant UI file)
   - Update lives display to show breakdown
   - Add game start notification for purchased lives

---

## 6. Smart Contract Considerations (Future)

When implementing the store contract, the Extra Lives purchase should:
- Record purchase on-chain
- Validate purchase amount
- Emit `ItemPurchased` event
- Store in player's inventory (if using inventory system)
- Or mark as single-use (consumed at game start)

**Note:** For MVP, we can start with off-chain purchase tracking and add on-chain later.

---

## 7. UI/UX Considerations

### 7.1 Store UI (Future)
- Display "Extra Lives" item with 3 level options
- Show price for each level
- Show current wallet balance
- Confirm purchase dialog

### 7.2 Game Start UI
- Show "Starting with X lives" message
- Display breakdown: "3 base + Y purchased"
- Visual indicator (icon or badge) for purchased lives

### 7.3 In-Game UI
- Lives display shows total
- Optional: Show breakdown on hover/tap
- Visual distinction for purchased vs base lives (optional)

---

## 8. Decisions Made ✅

1. **Purchase Timing:** ✅ **Pre-purchase inventory system**
   - Players buy items and store in inventory
   - Items persist across games
   - Future: NFT system for inventory items

2. **Visual Distinction:** ✅ **Different colors for purchased lives**
   - Base lives: Red (❤️)
   - Purchased lives: Gold/Yellow (💛)
   - Clear visual distinction in UI

3. **Purchase Limits:** ✅ **One item per type per game, but can accumulate in inventory**
   - Players can buy multiple extra lives
   - Items stored in inventory
   - Only one extra lives purchase can be used per game
   - Selected item is consumed from inventory when game starts

---

## 9. Next Steps

1. **Review this plan** - Confirm approach ✅
2. **Implement inventory system** - Step 2 (inventory-manager.js)
3. **Implement code changes** - Steps 1, 3, 4 (game object, game start, life consumption)
4. **Implement visual distinction** - Step 5 (color-coded lives display)
5. **Test thoroughly** - Use testing checklist
6. **Add item selection UI** - Before game start (if inventory has items)
7. **Document for future** - Step 6 (replenishment placeholder)

## 10. Future Enhancements

1. **Blockchain Inventory:**
   - Move inventory storage to smart contract
   - On-chain verification of purchases
   - Cross-device inventory sync

2. **NFT System:**
   - Convert inventory items to NFTs
   - Tradeable items
   - Rare/limited edition items

3. **Item Selection UI:**
   - Modal before game start
   - Show available inventory items
   - Allow selection of items to use
   - Preview of game start stats

---

**Status:** Ready for Implementation Review

