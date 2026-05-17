# Store Refactoring Status

## Current File Sizes

| File | Lines | Status |
|------|-------|--------|
| `store-service.js` | 447 | ✅ Good size |
| `store-ui.js` | 1,235 | ⚠️ **Still large** |
| `store-utils.js` | 127 | ✅ Good size |
| `store-item-loader.js` | 112 | ✅ Good size |
| `store-item-rendering.js` | 236 | ✅ Good size |
| `store-inventory.js` | 122 | ✅ Good size |
| `store-wallet-connection.js` | 141 | ✅ Good size |
| `store-purchase-flow.js` | 472 | ✅ Good size |
| **Total** | **~2,892** | |

## Analysis

### ✅ Well-Sized Files (< 500 lines)
- `store-service.js` (447 lines) - State management and coordination
- `store-utils.js` (127 lines) - Price conversion utilities
- `store-item-loader.js` (112 lines) - Item loading from backend
- `store-item-rendering.js` (236 lines) - Item card rendering
- `store-inventory.js` (122 lines) - Inventory management
- `store-wallet-connection.js` (141 lines) - Wallet connection modal
- `store-purchase-flow.js` (472 lines) - Purchase transaction flow

### ⚠️ Large File That Needs Further Refactoring

**`store-ui.js` (1,235 lines)** - Still contains:

1. **Modal Creation** (`showStoreInternal()` - ~200 lines)
   - Large HTML template for store modal
   - Click-outside handler setup
   - Modal DOM manipulation

2. **UI Update Functions** (~400 lines)
   - `updateStoreUI()` - Large function updating selected items summary
   - `updateStoreBalance()` - Balance display updates
   - `updateItemPrices()` - Price updates in item cards
   - `loadStoreBadgeDisplay()` - Badge display loading

3. **Item Selection Management** (~300 lines)
   - `addItemToSelection()`
   - `removeItemFromSelection()`
   - `setItemQuantity()`
   - `selectStoreItem()`
   - `clearLevelSelection()`
   - `clearStoreSelection()`
   - Helper functions: `getItemKey()`, `getItemQuantity()`

4. **Payment Token Management** (~100 lines)
   - `setPaymentToken()` - Token switching logic

5. **Store Lifecycle** (~100 lines)
   - `showStore()` - Entry point
   - `hideStore()` - Store closing

## Recommendations

### Option 1: Extract UI Update Functions (Recommended)
Create `store-ui-updates.js` to handle:
- `updateStoreUI()` - Selected items summary
- `updateStoreBalance()` - Balance display
- `updateItemPrices()` - Price updates
- `loadStoreBadgeDisplay()` - Badge display

**Estimated reduction**: ~400 lines → `store-ui.js` would be ~835 lines

### Option 2: Extract Item Selection Management
Create `store-item-selection.js` to handle:
- All item selection functions
- Helper functions for item keys/quantities

**Estimated reduction**: ~300 lines → `store-ui.js` would be ~935 lines

### Option 3: Extract Modal Creation
Create `store-modal.js` to handle:
- `showStoreInternal()` - Modal HTML creation
- Click-outside handler setup
- Modal DOM manipulation

**Estimated reduction**: ~200 lines → `store-ui.js` would be ~1,035 lines

### Option 4: Full Refactoring (All of the above)
Extract all three areas:
- `store-ui-updates.js` (~400 lines)
- `store-item-selection.js` (~300 lines)
- `store-modal.js` (~200 lines)
- `store-ui.js` (~335 lines) - Just coordination

**Result**: All files under 500 lines, better separation of concerns

## Current Function Breakdown in `store-ui.js`

1. `getStoreState()` - State access helper
2. `updateStoreStateReference()` - State sync helper
3. `showStore()` - Entry point (delegates to StoreService)
4. `showStoreInternal()` - Modal creation (~200 lines)
5. `loadStoreBadgeDisplay()` - Badge display
6. `hideStore()` - Store closing
7. `setPaymentToken()` - Token switching (~100 lines)
8. `updateItemPrices()` - Price updates
9. `getItemKey()` - Helper
10. `getItemQuantity()` - Helper
11. `addItemToSelection()` - Item selection
12. `removeItemFromSelection()` - Item selection
13. `setItemQuantity()` - Item selection
14. `selectStoreItem()` - Item selection
15. `clearLevelSelection()` - Item selection
16. `clearStoreSelection()` - Item selection
17. `updateStoreUI()` - UI updates (~150 lines)
18. `updateStoreBalance()` - Balance updates (~150 lines)

## Conclusion

The store refactoring has successfully broken down the original monolithic file into **8 focused modules**, with most files being well-sized (< 500 lines). However, `store-ui.js` is still quite large at **1,235 lines** and could benefit from further extraction.

**Recommendation**: Proceed with **Option 4 (Full Refactoring)** to achieve optimal file sizes and better separation of concerns. This would result in:
- All files under 500 lines
- Clear separation: modal creation, item selection, UI updates, and coordination
- Easier maintenance and testing

