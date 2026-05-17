# Store UI Implementation - Agent Handoff Document

## 🎯 Task Assignment

**Agent Role:** Build Phase 1 (Store UI) and Phase 2 (Item Catalog)  
**My Role:** Documentation, roadmap management, architecture decisions

---

## 📋 What to Build

### Phase 1: Store Modal/UI
**Goal:** Create the store interface with mock data and item selection validation

**Files to Create:**
- `src/game/systems/ui/store-ui.js` - Main store UI logic
- `src/game/rendering/responsive/shared/store-modal.css` - Store modal styles

**Files to Modify:**
- Main menu file (add "Store" button) - Need to find where menu is defined
- Any existing CSS files for consistency

---

## 🎨 UI Requirements

### Store Modal Layout
- Similar to leaderboard modal (reference existing modal structure)
- Responsive design (mobile and desktop)
- Match game theme (colors, fonts, styling)

### Store Button
- Add "Store" button to main menu
- Opens store modal when clicked
- Should be visible and accessible

### Item Display
- Grid or list view of items
- Each item card shows:
  - Item name (e.g., "Extra Lives")
  - Description
  - Level options (1, 2, 3) - buttons or selectors
  - Price display (placeholder: "100 $MEWS" for now)
  - Purchase button (or "Select" button for game start flow)

### Item Selection Validation ⚠️ **CRITICAL**
**Rule:** Only ONE item of each type can be selected per game

**Implementation:**
1. Track selected items:
   ```javascript
   game.selectedItems = {
     extraLives: null,        // null or { level: 1, 2, or 3 }
     forceField: null,        // null or { level: 1, 2, or 3 }
     orbLevel: null,          // null or { level: 1, 2, or 3 }
     slowTime: null,           // null or { level: 1, 2, or 3 }
     destroyAll: false,        // boolean (single level)
     bossKillShot: false,     // boolean (single level)
     coinTractorBeam: null    // null or { level: 1, 2, or 3 }
   };
   ```

2. Selection logic:
   - When user clicks a level button:
     - If another level of same type is selected → deselect it
     - Select the new level
     - Disable other levels of same type (gray out)
     - Show visual feedback (highlight selected)

3. Visual states:
   - **Available:** Normal button (can click)
   - **Selected:** Highlighted/active state (currently selected)
   - **Disabled:** Grayed out (another level of same type selected)

4. Example:
   - User clicks "+2 Extra Lives" → it becomes selected
   - "+1 Extra Lives" and "+3 Extra Lives" become disabled
   - User can click "+3 Extra Lives" → "+2" deselects, "+3" selects
   - User can deselect "+3" → all Extra Lives levels become available again

### Wallet Connection
- Check if wallet is connected
- Show connection status
- Display placeholder balance (for now)

---

## 📦 Item Catalog Structure (Phase 2)

### Items to Include:

1. **Extra Lives** (3 levels)
   - Level 1: +1 life
   - Level 2: +2 lives
   - Level 3: +3 lives

2. **Force Field Start** (3 levels)
   - Level 1: Start with Level 1 force field
   - Level 2: Start with Level 2 force field
   - Level 3: Start with Level 3 force field

3. **Orb Level Start** (3 levels)
   - Level 1: Start at Level 1
   - Level 2: Start at Level 2
   - Level 3: Start at Level 3

4. **Slow Time Power** (3 levels)
   - Level 1: 4 seconds duration
   - Level 2: 6 seconds duration
   - Level 3: 8 seconds duration

5. **Destroy All Enemies** (1 level)
   - Single level item

6. **Boss Kill Shot** (1 level)
   - Single level item

7. **Coin Tractor Beam** (3 levels)
   - Level 1: 4 seconds, 30% screen range
   - Level 2: 6 seconds, 60% screen range
   - Level 3: 8 seconds, 90% screen range

### Catalog Data Structure:

Create `src/game/systems/store/item-catalog.js`:

```javascript
const ITEM_CATALOG = {
  extraLives: {
    id: 'extraLives',
    name: 'Extra Lives',
    description: 'Start with additional lives',
    category: 'defensive',
    icon: '❤️',
    levels: [
      { level: 1, price: 100, effect: '+1 life', usdPrice: 0.50 },
      { level: 2, price: 250, effect: '+2 lives', usdPrice: 1.25 },
      { level: 3, price: 500, effect: '+3 lives', usdPrice: 2.50 }
    ]
  },
  forceField: {
    id: 'forceField',
    name: 'Force Field Start',
    description: 'Begin with an active force field',
    category: 'defensive',
    icon: '🛡️',
    levels: [
      { level: 1, price: 200, effect: 'Level 1 force field', usdPrice: 1.00 },
      { level: 2, price: 400, effect: 'Level 2 force field', usdPrice: 2.00 },
      { level: 3, price: 600, effect: 'Level 3 force field', usdPrice: 3.00 }
    ]
  },
  // ... other items
};

// Helper functions
function getItemById(id) { /* ... */ }
function getItemPrice(id, level) { /* ... */ }
function getAllItems() { /* ... */ }
```

---

## 🔍 Reference Files

### Existing UI Patterns:
- Leaderboard modal: `src/game/systems/ui/leaderboard-system.js`
- Modal CSS: Check `src/game/rendering/responsive/shared/` for existing modal styles
- Menu system: Find where main menu buttons are defined

### Game State:
- Check `src/game/main.js` for game object structure
- See how other UI systems integrate with game state

---

## ✅ Testing Checklist

### Phase 1 Testing:
- [ ] Store button appears in main menu
- [ ] Clicking store button opens modal
- [ ] Modal displays all items
- [ ] Item cards show name, description, levels, price
- [ ] Clicking a level button selects it
- [ ] Other levels of same type become disabled when one is selected
- [ ] Clicking different level of same type deselects previous, selects new
- [ ] Can deselect items
- [ ] Visual feedback is clear (selected, disabled, available states)
- [ ] Modal is responsive (mobile and desktop)
- [ ] Modal matches game theme
- [ ] Wallet connection check works (shows status)

### Phase 2 Testing:
- [ ] Item catalog loads correctly
- [ ] All items are defined
- [ ] Helper functions work (getItemById, getItemPrice, etc.)
- [ ] Store UI uses catalog data
- [ ] Prices display correctly

---

## 🚫 What NOT to Build Yet

**Don't build these yet (will be Phase 3+):**
- ❌ Actual purchase flow (use mock/placeholder)
- ❌ Inventory system (Phase 3)
- ❌ Backend API calls (Phase 5)
- ❌ Blockchain integration (Phase 6+)
- ❌ Game code integration (Phase 4)

**For now:**
- Use placeholder prices ("100 $MEWS")
- Use mock purchase buttons (can show alert or console log)
- Don't connect to backend
- Don't modify game logic yet

---

## 📝 Implementation Notes

### Selection State Management:
- Store selection state in `game.selectedItems` object
- Update UI when selection changes
- Validate selection before allowing game start (later phase)

### UI/UX Considerations:
- Make it clear which items are selected
- Disable conflicting options visually
- Allow easy deselection
- Show item descriptions clearly
- Make prices visible but not overwhelming

### Code Organization:
- Keep store UI logic separate from game logic
- Use modular structure (can be extended later)
- Follow existing code patterns in the codebase

---

## 🎯 Success Criteria

**Phase 1 is complete when:**
1. ✅ Store modal opens from main menu
2. ✅ All items display correctly
3. ✅ Item selection works (one type per game rule enforced)
4. ✅ Visual feedback is clear and responsive
5. ✅ UI matches game theme
6. ✅ Code is clean and follows existing patterns

**Phase 2 is complete when:**
1. ✅ Item catalog is defined
2. ✅ All items have correct data
3. ✅ Helper functions work
4. ✅ Store UI uses catalog data

---

## ❓ Questions to Ask

If you encounter issues or need clarification:

1. **Where is the main menu defined?**
   - Need to find where to add "Store" button

2. **What CSS framework/structure is used?**
   - Check existing modal styles for consistency

3. **How are other modals structured?**
   - Reference leaderboard modal for patterns

4. **What's the game object structure?**
   - Check `src/game/main.js` for game state

5. **Any specific design requirements?**
   - Colors, fonts, spacing, etc.

---

## 📚 Documentation References

- [Store Implementation Order](./STORE_IMPLEMENTATION_ORDER.md) - Full implementation guide
- [Store Item Selection Rules](./STORE_ITEM_SELECTION_RULES.md) - Selection validation details
- [Premium Store Design](./12-premium-store-design.md) - Complete item specifications
- [Store Blockchain Integration](./STORE_BLOCKCHAIN_INTEGRATION_DISCUSSION.md) - Architecture decisions

---

## 🚀 Getting Started

1. **Explore the codebase:**
   - Find leaderboard modal implementation
   - Find main menu structure
   - Understand game state structure

2. **Create store UI file:**
   - `src/game/systems/ui/store-ui.js`

3. **Create store CSS:**
   - `src/game/rendering/responsive/shared/store-modal.css`

4. **Add store button to menu:**
   - Find menu file and add button

5. **Implement item display:**
   - Create item cards
   - Show all items

6. **Implement selection logic:**
   - Track selected items
   - Enforce one-type-per-game rule
   - Add visual feedback

7. **Create item catalog:**
   - `src/game/systems/store/item-catalog.js`
   - Define all items with data

8. **Test everything:**
   - Follow testing checklist above

---

**Good luck! Focus on clean, maintainable code that follows existing patterns.** 🎮

