# Game Service Refactoring

## Overview

The game lifecycle functionality has been extracted from `menu-system.js` into a dedicated `GameService` module, following the same pattern as `MenuService` and `WalletService`. This completes the refactoring plan and further improves code organization, maintainability, and separation of concerns.

## What Was Done

### 1. Created `GameService` (`src/game/systems/ui/game-service.js`)

The new service centralizes all game lifecycle operations:

- **Game Start**: `startGame()` (with balance check), `startGameTest()` (test mode)
- **Game Stop**: `closeGame()` (cleanup and resource freeing)
- **Game Readiness**: `isGameReady()`, `updateGameReadiness()`
- **Button Management**: `enableStartGameButton()`, `disableStartGameButton()`
- **State Queries**: `getGameState()`
- **Debug Tools**: `checkGameService()` global function

### 2. Updated `menu-system.js` to Use GameService

All game lifecycle functions in `menu-system.js` now delegate to `GameService` when available, with fallback implementations for backward compatibility:

- `startGame()` → `GameService.startGame()`
- `startGameTest()` → `GameService.startGameTest()`
- `closeGame()` → `GameService.closeGame()`
- `isGameReady()` → `GameService.isGameReady()`
- `updateGameReadiness()` → `GameService.updateGameReadiness()`
- `enableStartGameButton()` → `GameService.enableStartGameButton()`
- `disableStartGameButton()` → `GameService.disableStartGameButton()`

### 3. Updated Script Loading Order

Added `game-service.js` to `MENU_SCRIPTS` in `lazy-loader.js`, ensuring it loads before `menu-system.js`:

```javascript
const MENU_SCRIPTS = [
  // ...
  'src/game/systems/ui/menu-service.js',
  'src/game/systems/ui/wallet-service.js',
  'src/game/systems/ui/game-service.js', // NEW
  'src/game/systems/ui/menu-system.js',
  // ...
];
```

## Architecture

### Service Responsibilities

**GameService**:
- Handles game start/stop operations
- Manages game readiness checks
- Controls start button states
- Coordinates with MenuService for menu visibility
- Delegates to game initialization functions
- Manages game state tracking

**menu-system.js** (remaining responsibilities):
- Wallet API initialization and event listeners
- Wallet event processing (delegates to `GameDataFlow`)
- Provides fallback implementations if `GameService` is not available
- Maintains `gameReadinessState` object (shared with GameService)

**MenuService** (unchanged):
- Menu visibility management
- Panel coordination

**WalletService** (unchanged):
- Wallet connection/disconnection
- Wallet UI updates

**GameDataFlow** (unchanged):
- Central controller for loading game data
- Handles wallet event callbacks

### Game Start Flow

1. **User clicks "Start Game"**:
   - `startGame()` (in `menu-system.js`) → `GameService.startGame()`
   - `GameService` checks balance (500K MEWS minimum)
   - If sufficient: Calls `GameService._startGameInternal()`
   - If insufficient: Shows alert and returns

2. **GameService._startGameInternal()**:
   - Loads game scripts (`window.loadGameScripts()`)
   - Shows item consumption modal (`showItemConsumptionModal()`)
   - Initializes game (`window.initializeGame()`)
   - Updates game state
   - Hides menu (via `MenuService.hide()`)
   - Shows game container
   - Initializes game logic (`window.initializeGameLogic()`)
   - Switches audio (menu → gameplay)
   - Updates stats

3. **Game Running**:
   - Game loop starts
   - User plays game

### Game End Flow

1. **Player dies**:
   - `gameOver()` (main.js) → `onGameOver()` (leaderboard-system.js)
   - Score submission flow
   - `showMainMenu()` → `MenuService.show()` → `closeGame()` → `GameService.closeGame()`

2. **GameService.closeGame()**:
   - Stops game engine
   - Clears game arrays
   - Resets game state
   - Stops audio
   - Hides game container

## Backward Compatibility

All changes maintain full backward compatibility:

- **Fallback Functions**: Each public function in `menu-system.js` has a `_*Fallback()` or `_*Direct()` implementation that preserves the original behavior
- **Global Functions**: All functions remain exposed globally (`window.startGame`, `window.startGameTest`, etc.)
- **No Breaking Changes**: Existing code that calls these functions will continue to work
- **Gradual Migration**: Old code continues to work while new code uses GameService

## Verification

### Console Logging

The refactoring includes extensive logging to verify which code path is being used:

- `✅ [GAME SERVICE]` - GameService is being used
- `⚠️ [GAME START] ========== FALLBACK MODE ==========` - Fallback implementation is being used

### Debug Function

Use `checkGameService()` in the browser console to verify GameService status:

```javascript
checkGameService()
// Outputs:
// - GameService available: true/false
// - GameService initialized: true/false
// - Game state: { isRunning, isPaused, isGameOver }
// - Game ready: true/false
// - MenuService available: true/false
// - gameState available: true/false
// - uiGameState available: true/false
```

## Testing Checklist

- [ ] `startGame()` works with sufficient balance
- [ ] `startGame()` blocks with insufficient balance
- [ ] `startGameTest()` works with wallet connected
- [ ] `startGameTest()` blocks without wallet
- [ ] Item consumption modal shows and works
- [ ] Game scripts load correctly
- [ ] Game initializes correctly
- [ ] Game loop starts
- [ ] Menu hides when game starts
- [ ] Game container shows when game starts
- [ ] Audio switches correctly (menu → gameplay)
- [ ] Stats update correctly (gamesPlayed++)
- [ ] `closeGame()` cleans up properly
- [ ] Menu shows when returning from game
- [ ] Game state resets correctly
- [ ] Memory is freed (arrays cleared)
- [ ] Multiple game starts work (no memory leaks)
- [ ] Start button enables/disables correctly
- [ ] Test button enables/disables correctly
- [ ] Game readiness checks work

## Benefits

1. **Separation of Concerns**: Game lifecycle logic is isolated from menu logic
2. **Maintainability**: Easier to find and modify game-related code
3. **Testability**: GameService can be tested independently
4. **Consistency**: Follows the same pattern as MenuService and WalletService
5. **Backward Compatibility**: No breaking changes to existing functionality
6. **Completeness**: Completes the refactoring plan (Phase 4)

## Current State of `menu-system.js`

**Remaining Responsibilities**:
1. ✅ Wallet integration → **Moved to WalletService**
2. ✅ Menu visibility → **Moved to MenuService**
3. ✅ Panel management → **Moved to MenuService**
4. ✅ **Game lifecycle** → **Moved to GameService**
5. ✅ **Game readiness checks** → **Moved to GameService**
6. ✅ **Button management** → **Moved to GameService**
7. ⏳ **Wallet initialization** (`initializeWalletIntegration`) → **Could move to WalletService**
8. ⏳ **Stats updates** (`updateMenuStats`) → **Already delegated to game-state-manager**

**Result**: `menu-system.js` is now much smaller and focused on wallet initialization and event handling.

## Next Steps

After verification, consider:
- Moving wallet initialization to WalletService (currently in `menu-system.js`)
- Phase 5: Cleanup - Remove fallback functions if no longer needed
- Final documentation updates
- Code review and optimization

## Summary

The GameService refactoring completes Phase 4 of the refactoring plan. All three services (MenuService, WalletService, GameService) are now in place, following a consistent pattern and maintaining full backward compatibility. The codebase is now more modular, maintainable, and easier to test.

