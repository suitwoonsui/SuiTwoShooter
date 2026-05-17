# Store Item Selection Rules

## 🎯 Core Rule: One Item Type Per Game

**Rule:** Players can only select **ONE item of each type** per game session.

### What This Means:

#### ✅ Allowed:
- Select "+2 Extra Lives" AND "+1 Force Field" AND "Slow Time Level 2" (different types)
- Select "+3 Extra Lives" (one item of one type)

#### ❌ Not Allowed:
- Select "+2 Extra Lives" AND "+3 Extra Lives" (same type, different levels)
- Select "+3 Extra Lives" AND "+3 Extra Lives" (same type, same level, duplicate)
- Select "Slow Time Level 1" AND "Slow Time Level 3" (same type, different levels)

### Item Types (Independent Selections):

Each of these is a separate type, so you can select one of each:
1. **Extra Lives** (Level 1, 2, or 3) - Select ONE level only
2. **Force Field Start** (Level 1, 2, or 3) - Select ONE level only
3. **Orb Level Start** (Level 1, 2, or 3) - Select ONE level only
4. **Slow Time Power** (Level 1, 2, or 3) - Select ONE level only
5. **Destroy All Enemies** (Single level) - Select or not
6. **Boss Kill Shot** (Single level) - Select or not
7. **Coin Tractor Beam** (Level 1, 2, or 3) - Select ONE level only

**Example Valid Selection:**
- ✅ Extra Lives Level 2
- ✅ Force Field Level 1
- ✅ Slow Time Level 3
- ✅ Destroy All Enemies
- ✅ Coin Tractor Beam Level 2

**Example Invalid Selection:**
- ❌ Extra Lives Level 2 AND Extra Lives Level 3 (same type)
- ❌ Slow Time Level 1 AND Slow Time Level 2 (same type)

---

## 🎨 Frontend Implementation

### Selection State Management:

```javascript
// Store selected items
game.selectedItems = {
  extraLives: null,        // null or { level: 1, 2, or 3 }
  forceField: null,        // null or { level: 1, 2, or 3 }
  orbLevel: null,          // null or { level: 1, 2, or 3 }
  slowTime: null,          // null or { level: 1, 2, or 3 }
  destroyAll: false,       // boolean (single level)
  bossKillShot: false,     // boolean (single level)
  coinTractorBeam: null    // null or { level: 1, 2, or 3 }
};
```

### Selection Logic:

```javascript
function selectItem(itemType, level) {
  // Check if another level of same type is selected
  if (game.selectedItems[itemType] !== null && 
      game.selectedItems[itemType] !== false) {
    // Deselect previous level
    deselectItem(itemType);
  }
  
  // Select new level
  if (level) {
    game.selectedItems[itemType] = { level: level };
  } else {
    game.selectedItems[itemType] = true; // For single-level items
  }
  
  // Update UI
  updateItemSelectionUI(itemType, level);
}

function deselectItem(itemType) {
  game.selectedItems[itemType] = null; // or false for boolean items
  updateItemSelectionUI(itemType, null);
}
```

### UI Behavior:

1. **When item is selected:**
   - Highlight selected item (visual feedback)
   - Disable other levels of same type (gray out buttons)
   - Show "Selected" indicator
   - Enable "Deselect" option

2. **When item is deselected:**
   - Remove highlight
   - Re-enable all levels of same type
   - Remove "Selected" indicator

3. **Visual States:**
   - **Available:** Normal button (can select)
   - **Selected:** Highlighted button (currently selected)
   - **Disabled:** Grayed out button (another level of same type selected)

### Example UI Flow:

```
User clicks "+2 Extra Lives":
  → "+2 Extra Lives" button becomes highlighted (selected)
  → "+1 Extra Lives" button becomes disabled (grayed out)
  → "+3 Extra Lives" button becomes disabled (grayed out)
  → Other item types remain available

User clicks "+3 Extra Lives" (while +2 is selected):
  → "+2 Extra Lives" becomes deselected (normal state)
  → "+3 Extra Lives" becomes selected (highlighted)
  → "+1 Extra Lives" remains disabled
  → Other item types remain available

User clicks "Deselect" on "+3 Extra Lives":
  → "+3 Extra Lives" becomes deselected (normal state)
  → "+1 Extra Lives" becomes enabled (can select)
  → "+2 Extra Lives" becomes enabled (can select)
  → All Extra Lives levels available again
```

---

## 🔍 Validation Rules

### Before Game Start:

1. **Check selection state:**
   - Ensure only one level per item type is selected
   - Validate selected items exist in inventory

2. **Apply items:**
   - Start items: Consume from blockchain at game start
   - Power items: Check out (store in game state)

### During Selection:

1. **Prevent invalid selections:**
   - If user clicks level 2 of an item type, and level 3 is selected:
     - Automatically deselect level 3
     - Select level 2
   - If user clicks same level that's already selected:
     - Deselect it (toggle off)

2. **Visual feedback:**
   - Show which item is currently selected
   - Disable conflicting options
   - Enable deselection

---

## 📋 Implementation Checklist

### Phase 1 (UI):
- [ ] Create selection state object
- [ ] Implement `selectItem()` function
- [ ] Implement `deselectItem()` function
- [ ] Add visual states (available, selected, disabled)
- [ ] Add selection validation logic
- [ ] Update UI when selection changes
- [ ] Add "Deselect" buttons/functionality

### Phase 3 (Mock Purchase):
- [ ] Validate selection before purchase
- [ ] Store selected items in purchase request
- [ ] Apply selection rules to inventory

### Phase 4 (Game Code):
- [ ] Apply selected items to game initialization
- [ ] Validate only one item type per category is applied

---

## 🎯 Key Points

1. **One type per game:** Can't have multiple levels of same item type
2. **Different types allowed:** Can select one of each type (e.g., Extra Lives + Force Field)
3. **Level selection:** When selecting a level, automatically deselects other levels of same type
4. **Visual feedback:** Clear indication of what's selected and what's disabled
5. **Easy deselection:** Users can easily change their mind and select different level

---

**This rule applies to the store UI and game start flow. It's enforced in the frontend before items are applied to the game.**

