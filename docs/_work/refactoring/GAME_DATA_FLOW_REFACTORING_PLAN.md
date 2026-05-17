# Game Data Flow Refactoring Plan

## Current State
- **File**: `src/game/systems/ui/game-data-flow.js`
- **Size**: 836 lines
- **Methods**: 20 methods

## Analysis

### Main Responsibilities

1. **State Management** (~50 lines)
   - `_activeLoads` - Track in-flight loads
   - `_lastProcessedEvent` - Event deduplication
   - `_shouldProcessEvent()` - Check if event should be processed
   - `clearActiveLoads()` - Cleanup

2. **Main Load Flow** (~200 lines)
   - `load()` - Main entry point
   - `_performLoad()` - Internal load orchestration
   - Coordinates balance, badge, and stats loading

3. **Data Loading** (~150 lines)
   - `loadBalance()` - Load wallet balance
   - `loadBadge()` - Load badge data
   - `loadStats()` - Load game stats

4. **Badge Handling** (~250 lines)
   - `handlePendingUpgrade()` - Check for badge upgrade
   - `handleNoBadge()` - Check for migration
   - `displayBadge()` - Display badge in UI
   - `createBadgeDisplay()` - Fallback badge display
   - `showBadgeDisplay()` - Show existing badge
   - `fetchRegistryGames()` - Fetch games from registry

5. **UI Updates** (~50 lines)
   - `updateBalanceUI()` - Update balance display

6. **Modal Management** (~50 lines)
   - `isBadgeModalVisible()` - Check modal visibility
   - `onBadgeModalShown()` - Handle modal shown
   - `onBadgeModalHidden()` - Handle modal hidden

7. **Wallet Events** (~100 lines)
   - `onWalletConnected()` - Handle wallet connection
   - `onWalletDisconnected()` - Handle wallet disconnection
   - `onReturnToMenu()` - Handle return to menu

## Proposed Module Structure

### 1. `game-data-flow-service.js` (~150 lines)
**Purpose**: State management and main coordination
- State management (`_activeLoads`, `_lastProcessedEvent`)
- `_shouldProcessEvent()` - Event deduplication
- `clearActiveLoads()` - Cleanup
- `load()` - Main entry point
- `_performLoad()` - Internal load orchestration

### 2. `game-data-flow-loaders.js` (~200 lines)
**Purpose**: Data loading operations
- `loadBalance()` - Load wallet balance
- `loadBadge()` - Load badge data
- `loadStats()` - Load game stats
- `fetchRegistryGames()` - Fetch games from registry

### 3. `game-data-flow-badge.js` (~250 lines)
**Purpose**: Badge handling and display
- `handlePendingUpgrade()` - Check for badge upgrade
- `handleNoBadge()` - Check for migration
- `displayBadge()` - Display badge in UI
- `createBadgeDisplay()` - Fallback badge display
- `showBadgeDisplay()` - Show existing badge

### 4. `game-data-flow-ui.js` (~100 lines)
**Purpose**: UI updates
- `updateBalanceUI()` - Update balance display

### 5. `game-data-flow-modals.js` (~100 lines)
**Purpose**: Modal management
- `isBadgeModalVisible()` - Check modal visibility
- `onBadgeModalShown()` - Handle modal shown
- `onBadgeModalHidden()` - Handle modal hidden

### 6. `game-data-flow-wallet.js` (~150 lines)
**Purpose**: Wallet event handling
- `onWalletConnected()` - Handle wallet connection
- `onWalletDisconnected()` - Handle wallet disconnection
- `onReturnToMenu()` - Handle return to menu

### 7. `game-data-flow.js` (~50 lines)
**Purpose**: Main coordination
- Expose GameDataFlow object
- Coordinate between modules

## Estimated File Sizes

| File | Lines | Status |
|------|-------|--------|
| `game-data-flow-service.js` | ~150 | ✅ Good |
| `game-data-flow-loaders.js` | ~200 | ✅ Good |
| `game-data-flow-badge.js` | ~250 | ✅ Good |
| `game-data-flow-ui.js` | ~100 | ✅ Good |
| `game-data-flow-modals.js` | ~100 | ✅ Good |
| `game-data-flow-wallet.js` | ~150 | ✅ Good |
| `game-data-flow.js` | ~50 | ✅ Good |
| **Total** | **~1,000** | ✅ **All files < 300 lines** |

## Module Loading Order

1. `game-data-flow-service.js` - State management and main flow
2. `game-data-flow-loaders.js` - Data loading
3. `game-data-flow-badge.js` - Badge handling
4. `game-data-flow-ui.js` - UI updates
5. `game-data-flow-modals.js` - Modal management
6. `game-data-flow-wallet.js` - Wallet events
7. `game-data-flow.js` - Main coordination (loads last)

## Benefits

✅ **All files under 300 lines** - Easy to read and maintain  
✅ **Clear separation of concerns** - Each module has a single responsibility  
✅ **Better testability** - Functions can be tested in isolation  
✅ **Improved maintainability** - Changes are localized to specific modules  
✅ **No functionality changes** - All existing features preserved  

## Ready to Proceed

This plan follows the same successful pattern used for the store, leaderboard, and badge UI refactoring.

