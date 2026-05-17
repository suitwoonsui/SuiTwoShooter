# Game Lifecycle Documentation

This document provides a comprehensive overview of the game lifecycle functionality, including all functions, dependencies, and interactions. This is essential for creating the `GameService` refactoring.

---

## Overview

The game lifecycle consists of three main phases:
1. **Game Start** - Loading scripts, showing item consumption, initializing game logic
2. **Game Running** - Game loop, pause/resume, game over handling
3. **Game End** - Cleanup, return to menu, score submission

---

## 1. Game Start Functions

### 1.1 `startGame()` (menu-system.js:735)

**Purpose**: Main entry point for starting a game (with balance check)

**Location**: `src/game/systems/ui/menu-system.js`

**Flow**:
1. **Balance Check**: Verifies wallet is connected and has minimum balance (500K MEWS)
   - If insufficient: Shows alert and returns
   - If wallet not connected: Shows alert and returns
2. **Calls**: `startGameInternal()`

**Dependencies**:
- `window.walletAPIInstance` - Wallet API instance
- `window.walletAPIInstance.isConnected()` - Check connection
- `window.walletAPIInstance.getBalanceStatus()` - Get balance status

**State Updates**: None (delegated to `startGameInternal()`)

---

### 1.2 `startGameTest()` (menu-system.js:698)

**Purpose**: Test mode entry point (bypasses balance check)

**Location**: `src/game/systems/ui/menu-system.js`

**Flow**:
1. **Readiness Check**: Verifies `isGameReady()` (data loaded, migration check complete)
   - If not ready: Shows alert and returns
2. **Wallet Check**: Verifies wallet is connected (for blockchain features)
   - If not connected: Shows alert and returns
3. **Bypass**: Skips balance check
4. **Calls**: `startGameInternal()`

**Dependencies**:
- `isGameReady()` - Game readiness check function
- `window.walletAPIInstance` - Wallet API instance
- `window.walletAPIInstance.isConnected()` - Check connection

**State Updates**: None (delegated to `startGameInternal()`)

---

### 1.3 `startGameInternal()` (menu-system.js:752)

**Purpose**: Core game start logic (shared by both `startGame()` and `startGameTest()`)

**Location**: `src/game/systems/ui/menu-system.js`

**Flow**:
1. **State Check**: Logs current game state (uiGameState or gameState)
2. **Load Game Scripts**: 
   - Calls `window.loadGameScripts()` (async)
   - Loads all scripts in `GAME_SCRIPTS` array
   - Logs load time
3. **Item Consumption Modal**:
   - Calls `showItemConsumptionModal()` (async)
   - If user cancels: Returns early (game doesn't start)
   - If confirmed: Continues with selected items
4. **Game Initialization**:
   - Calls `window.initializeGame()` (from main.js)
   - Initializes canvas, game state, etc.
5. **State Updates**:
   - Sets `isMenuVisible = false`
   - Sets `isGameRunning = true`
   - Sets `isPaused = false`
   - Sets `isGameOver = false`
6. **Hide Menu**:
   - Uses `MenuService.hide()` if available
   - Fallback: Manual DOM manipulation
7. **Show Game Container**:
   - Adds `game-container-visible` class
   - Removes `game-container-hidden` class
   - Re-applies mobile UI layout if needed
8. **Responsive Canvas**:
   - Calls `ResponsiveCanvas.setupResponsiveSizing()`
9. **Game Logic Initialization**:
   - Calls `window.initializeGameLogic()` with dependencies:
     - `game` - Game state object
     - `initSecurity` - Security system init function
     - `resetCoinStreak` - Coin streak reset function
     - `player` - Player object
     - `clearGameArrays` - Clear tiles/enemies function
     - `generateTiles` - Generate initial tiles function
     - `gameLoop` - Game loop function
10. **Audio**:
    - Calls `stopBackgroundMusic()` - Stop menu music
    - Calls `startGameplayMusic()` - Start gameplay music (if enabled)
11. **Stats Update**:
    - Increments `gameStats.gamesPlayed`
    - Calls `saveGameData()`

**Dependencies**:
- `window.loadGameScripts()` - Lazy loader function
- `showItemConsumptionModal()` - Item consumption modal
- `window.initializeGame()` - Game initialization (main.js)
- `window.initializeGameLogic()` - Game logic initialization
- `MenuService` - Menu service (optional)
- `ResponsiveCanvas` - Canvas manager
- `MobileUI` - Mobile UI manager
- `uiGameState` or `gameState` - Game state objects
- `gameStats` - Game statistics
- `saveGameData()` - Save stats function
- `stopBackgroundMusic()` - Audio function
- `startGameplayMusic()` - Audio function

**State Updates**:
- `uiGameState` or `gameState`: `isMenuVisible = false`, `isGameRunning = true`, `isPaused = false`, `isGameOver = false`
- `gameStats.gamesPlayed++`

**Side Effects**:
- Menu hidden
- Game container shown
- Game scripts loaded
- Game initialized
- Audio changed
- Stats saved

---

### 1.4 `window.initializeGame()` (main.js:1212)

**Purpose**: Initialize game canvas and base state (called once)

**Location**: `src/game/main.js`

**Flow**:
1. **Check if already initialized**: Uses `gameInitialized` flag
2. **If not initialized**:
   - Calls `init()` function
   - Sets `gameInitialized = true`

**Dependencies**:
- `init()` - Main game initialization function (main.js)

**State Updates**: None (delegated to `init()`)

---

### 1.5 `window.initializeGameLogic()` (game-initialization.js:26)

**Purpose**: Initialize game logic for a new game session

**Location**: `src/game/systems/core/game-initialization.js`

**Flow**:
1. **Security System Reset**:
   - Calls `initSecurity()` to reinitialize security
2. **Game State Reset**:
   - Calls `game.reset()` if available (GameState class)
   - Fallback: Manual reset of all game properties
3. **Session ID**: Generates new session ID
4. **Item Application**:
   - **Orb Level**: Applies purchased orb level start
     - Level 1 purchase = start at 2
     - Level 2 = start at 3
     - Level 3 = start at 4
   - **Extra Lives**: Applies purchased extra lives
     - Level 1 = +1, Level 2 = +2, Level 3 = +3
   - **Force Field**: Applies purchased force field
     - Sets level and activates
5. **Item Consumption**:
   - Collects all items to consume into `itemsToConsume` array
   - Batch consumes via `consumeItemsFromBlockchain()` (async, non-blocking)
   - Fallback: Individual consumption or localStorage
6. **Coin Streak Reset**:
   - Calls `resetCoinStreak()`
   - Resets force field streak
7. **Player Reset**:
   - Resets player position (lane 1, center Y)
   - Clears player trail
8. **Clear Arrays**:
   - Calls `clearGameArrays()` to clear tiles and enemies
9. **Generate Tiles**:
   - Calls `generateTiles()` to create initial game tiles
10. **Start Game Loop**:
    - Cancels any existing animation frame
    - Calls `gameLoop()` to start the game

**Dependencies**:
- `initSecurity()` - Security system function
- `game.reset()` - GameState reset method
- `consumeItemsFromBlockchain()` - Batch item consumption
- `resetCoinStreak()` - Coin streak reset
- `clearGameArrays()` - Clear tiles/enemies
- `generateTiles()` - Generate initial tiles
- `gameLoop()` - Game loop function

**State Updates**:
- `game.gameRunning = true`
- `game.gameOver = false`
- `game.paused = false`
- All game stats reset (score, distance, coins, etc.)
- Player position reset
- Items applied to game state

**Side Effects**:
- Security system reinitialized
- Game arrays cleared
- Initial tiles generated
- Game loop started
- Items consumed from blockchain (async)

---

## 2. Game Running Functions

### 2.1 `gameLoop()` (main.js:993)

**Purpose**: Main game loop (requestAnimationFrame)

**Location**: `src/game/main.js`

**Flow**:
1. **Check if game is running**: If not, return
2. **Update game state**: Movement, collisions, etc.
3. **Render**: Draw everything to canvas
4. **Schedule next frame**: `requestAnimationFrame(gameLoop)`

**Dependencies**:
- `game` - Game state object
- `game.gameRunning` - Running flag

**State Updates**: Continuous game state updates

---

### 2.2 Pause/Resume System

**Purpose**: Pause and resume game during gameplay

**Location**: `src/game/main.js` (keyboard handler), `src/game/rendering/ui/game-state-rendering.js` (rendering)

**Pause Mechanism**:
- **Keyboard**: Press 'P' key to toggle pause
- **Mobile**: Pause button overlay (rendered when paused)
- **State**: `game.paused` boolean flag

**Pause Handler** (main.js:1114-1119):
```javascript
if (e.code === 'KeyP') {
  e.preventDefault();
  if (game.gameRunning && !game.gameOver && !gameState.isMenuVisible) {
    game.paused = !game.paused;
  }
}
```

**Pause Rendering** (game-state-rendering.js:160-182):
- Shows semi-transparent overlay
- Renders "PAUSED" text
- Shows mobile pause button overlay (if mobile)
- Game loop continues but `update()` returns early when `game.paused = true`

**Resume**:
- Press 'P' again to resume
- Click mobile "Resume" button
- Sets `game.paused = false`

**Audio Handling**:
- When paused: Gameplay music may pause (check `resumeGameplayMusic()`)
- When resumed: Gameplay music resumes

**State Updates**:
- `game.paused = true` (paused)
- `game.paused = false` (resumed)

**Dependencies**:
- `game` - Game state object
- `gameState.isMenuVisible` - Menu visibility check
- `renderPauseOverlay()` - Pause screen rendering
- `toggleMobilePauseOverlay()` - Mobile pause button

---

## 3. Game End Functions

### 3.1 `gameOver()` (main.js:1069)

**Purpose**: Handle game over when player dies

**Location**: `src/game/main.js`

**Flow**:
1. **Stop Game**:
   - Sets `game.gameRunning = false`
   - Sets `game.gameOver = true`
   - Sets `game.speed = 0`
2. **Capture Stats**:
   - Captures score, distance, coins, bosses defeated, etc.
   - Stores in `gameStats` object
3. **Audio**:
   - Plays game over sound
   - Creates game over particles effect
4. **Calls**: `onGameOver(gameStats)`

**Dependencies**:
- `game` - Game state object
- `onGameOver()` - Game over handler (leaderboard-system.js)

**State Updates**:
- `game.gameRunning = false`
- `game.gameOver = true`
- `game.speed = 0`

---

### 3.2 `onGameOver()` (leaderboard-system.js:417)

**Purpose**: Handle game over UI and score submission flow

**Location**: `src/game/systems/ui/leaderboard-system.js`

**Flow**:
1. **Update Best Score**: If new record, updates `gameStats.bestScore`
2. **Show Game Container**: Ensures container is visible for game over screen
3. **Wait for User Input**: 
   - Sets up click/keydown/touchstart handlers
   - Waits minimum 500ms
   - Waits for user interaction
4. **Calls**: `showNameInput(finalScore)`

**Dependencies**:
- `gameStats` - Game statistics
- `showNameInput()` - Name input modal

**State Updates**:
- `gameStats.bestScore` (if new record)

---

### 3.3 `returnToMainMenu()` (main.js:176)

**Purpose**: Return to main menu from game (legacy function)

**Location**: `src/game/main.js`

**Flow**:
1. **Check Name Input Modal**: If visible, returns early (don't show menu)
2. **Stop Game Loop**:
   - Calls `game.resetForMenu()` if available
   - Fallback: Manual reset
3. **Clear Arrays**: Clears tiles and enemies
4. **Update State**:
   - Sets `gameState.isMenuVisible = true`
   - Sets `gameState.isGameRunning = false`
   - Sets `gameState.isPaused = false`
   - Sets `gameState.isGameOver = false`
5. **Hide Game Container**: Adds `game-container-hidden` class
6. **Show Main Menu**: Adds `main-menu-overlay-visible` class
7. **Stop Audio**: Calls `stopBackgroundMusic()` and `stopGameplayMusic()`
8. **Clear Items**: Clears `game.selectedItems` and `game.checkedOutItems`

**Dependencies**:
- `game` - Game state object
- `gameState` - Game state object
- `stopBackgroundMusic()` - Audio function
- `stopGameplayMusic()` - Audio function

**State Updates**:
- `gameState.isMenuVisible = true`
- `gameState.isGameRunning = false`
- `gameState.isPaused = false`
- `gameState.isGameOver = false`
- Game arrays cleared
- Items cleared

**Note**: This function is legacy. Modern flow uses `showMainMenu()` which calls `closeGame()`.

---

### 3.4 `closeGame()` (menu-system.js:479)

**Purpose**: Close game completely and free resources

**Location**: `src/game/systems/ui/menu-system.js`

**Flow**:
1. **Stop Game Engine**:
   - Sets `game.gameRunning = false`
   - Sets `game.gameOver = false`
   - Sets `game.paused = false`
2. **Clear Game Arrays**:
   - Clears `game.projectiles`
   - Clears `game.enemyProjectiles`
   - Clears `game.bossProjectiles`
   - Clears `game.particles`
   - Clears `game.tiles`
3. **Reset Game State**:
   - Sets `game.speed = 0`
   - Sets `game.bossActive = false`
   - Sets `game.bossWarning = false`
   - Sets `game.boss = null`
4. **Stop Audio**:
   - Calls `stopBackgroundMusic()`
   - Calls `stopGameplayMusic()`
5. **Hide Game Container**:
   - Adds `game-container-hidden` class
   - Removes `game-container-visible` class

**Dependencies**:
- `game` - Game state object
- `stopBackgroundMusic()` - Audio function
- `stopGameplayMusic()` - Audio function

**State Updates**:
- `game.gameRunning = false`
- `game.gameOver = false`
- `game.paused = false`
- All game arrays cleared
- Game state reset

**Side Effects**:
- Game loop stops (when `game.gameRunning = false`)
- Audio stops
- Game container hidden
- Memory freed

---

## 4. Game Readiness System

### 4.1 `isGameReady()` (menu-system.js:725)

**Purpose**: Check if game is ready to start

**Location**: `src/game/systems/ui/menu-system.js`

**Returns**: `boolean`

**Checks**:
1. `gameReadinessState.dataLoaded` - Data has been loaded
2. `gameReadinessState.migrationCheckComplete` - Migration check completed
3. `gameReadinessState.migrationModalClosed` - Migration modal closed (or never needed)

**Used By**:
- `startGameTest()` - Test mode readiness check

---

### 4.2 `updateGameReadiness()` (menu-system.js:634)

**Purpose**: Update game readiness UI (enable/disable start buttons)

**Location**: `src/game/systems/ui/menu-system.js`

**Flow**:
1. **Check Readiness**: Calls `isGameReady()`
2. **Update Test Button**:
   - If ready and wallet connected: Enable test button
   - Otherwise: Disable test button
3. **Update Start Button**:
   - If ready, wallet connected, and has minimum balance: Enable start button
   - Otherwise: Disable start button

**Dependencies**:
- `isGameReady()` - Readiness check
- `window.walletAPIInstance` - Wallet API
- `window.walletAPIInstance.getBalanceStatus()` - Balance check
- `enableStartGameButton()` - Button enable function
- `disableStartGameButton()` - Button disable function

**State Updates**: Button states (enabled/disabled, opacity, cursor)

---

## 5. Button Management

### 5.1 `enableStartGameButton()` (menu-system.js:677)

**Purpose**: Enable the "Start Game" button

**Location**: `src/game/systems/ui/menu-system.js`

**Flow**:
1. Gets `startGameBtn` element
2. Sets `disabled = false`
3. Sets `title = 'Start Game'`
4. Sets `opacity = '1'`
5. Sets `cursor = 'pointer'`

---

### 5.2 `disableStartGameButton()` (menu-system.js:687)

**Purpose**: Disable the "Start Game" button

**Location**: `src/game/systems/ui/menu-system.js`

**Flow**:
1. Gets `startGameBtn` element
2. Sets `disabled = true`
3. Sets `opacity = '0.5'`
4. Sets `cursor = 'not-allowed'`

---

## 6. Dependencies and Interactions

### 6.1 Script Loading

**Function**: `window.loadGameScripts()` (lazy-loader.js:190)

**Purpose**: Lazy load game scripts when game starts

**Scripts Loaded**: All scripts in `GAME_SCRIPTS` array, including:
- Game initialization
- Game logic
- Rendering
- Audio
- Input handling
- etc.

---

### 6.2 Item Consumption

**Function**: `showItemConsumptionModal()` (item-consumption.js:23)

**Purpose**: Show modal for selecting items to use in game

**Flow**:
1. Loads inventory from blockchain
2. Shows modal with available items
3. User selects items (one type per game)
4. User confirms or cancels
5. Returns `{ confirmed: boolean, items: object }`

**Dependencies**:
- `loadInventoryDisplay()` - Load inventory
- Blockchain inventory system

---

### 6.3 Game State Management

**Objects**:
- `uiGameState` - UI state (available in menu scripts)
- `gameState` - Game state (available after game scripts load)
- `game` - Game state object (main.js)
- `gameStats` - Game statistics

**State Properties**:
- `isMenuVisible` - Menu visibility
- `isGameRunning` - Game running flag
- `isPaused` - Pause state
- `isGameOver` - Game over flag

---

### 6.4 Audio Management

**Functions**:
- `stopBackgroundMusic()` - Stop menu music
- `startGameplayMusic()` - Start gameplay music
- `stopGameplayMusic()` - Stop gameplay music

**Dependencies**:
- `gameSettings.backgroundMusic` - Music enabled setting

---

### 6.5 Canvas and UI

**Functions**:
- `ResponsiveCanvas.setupResponsiveSizing()` - Resize canvas
- `MobileUI.applyConsumableFooterLayout()` - Apply mobile layout

---

## 7. Complete Flow Diagrams

### 7.1 Game Start Flow

```
User clicks "Start Game"
    ↓
startGame()
    ↓
Balance Check (500K MEWS)
    ├─→ Insufficient → Alert → Return
    └─→ Sufficient → Continue
    ↓
startGameInternal()
    ↓
Load Game Scripts (async)
    ↓
Show Item Consumption Modal (async)
    ├─→ User Cancels → Return (game doesn't start)
    └─→ User Confirms → Continue
    ↓
window.initializeGame() (if not initialized)
    ↓
Update State (isMenuVisible=false, isGameRunning=true)
    ↓
Hide Menu (MenuService.hide() or fallback)
    ↓
Show Game Container
    ↓
ResponsiveCanvas.setupResponsiveSizing()
    ↓
window.initializeGameLogic()
    ├─→ initSecurity()
    ├─→ game.reset()
    ├─→ Apply Items (orb level, lives, force field)
    ├─→ Consume Items from Blockchain (async)
    ├─→ resetCoinStreak()
    ├─→ Reset Player Position
    ├─→ clearGameArrays()
    ├─→ generateTiles()
    └─→ gameLoop() (starts game)
    ↓
Stop Menu Music
    ↓
Start Gameplay Music (if enabled)
    ↓
Update gameStats.gamesPlayed
    ↓
Game Running
```

### 7.2 Game End Flow

```
Player Dies
    ↓
gameOver() (main.js)
    ├─→ Stop Game (gameRunning=false, gameOver=true)
    ├─→ Capture Stats
    ├─→ Play Game Over Sound
    └─→ onGameOver(gameStats)
    ↓
onGameOver() (leaderboard-system.js)
    ├─→ Update Best Score
    ├─→ Show Game Container
    ├─→ Wait for User Input (500ms minimum)
    └─→ showNameInput(finalScore)
    ↓
User Enters Name or Skips
    ├─→ Save Score → Blockchain Submission → showMainMenu()
    └─→ Skip → Blockchain Submission (background) → showMainMenu()
    ↓
showMainMenu() (menu-system.js)
    ├─→ MenuService.show() or fallback
    ├─→ closeGame()
    ├─→ Update Menu Stats
    └─→ GameDataFlow.onReturnToMenu()
    ↓
closeGame() (menu-system.js)
    ├─→ Stop Game Engine
    ├─→ Clear Game Arrays
    ├─→ Reset Game State
    ├─→ Stop Audio
    └─→ Hide Game Container
    ↓
Main Menu Shown
```

---

## 8. Key Considerations for GameService

### 8.1 Functions to Extract

1. **`startGame()`** - Main game start (with balance check)
2. **`startGameTest()`** - Test mode start (bypasses balance)
3. **`startGameInternal()`** - Core start logic (shared)
4. **`closeGame()`** - Game cleanup

### 8.2 Functions to Keep in menu-system.js

1. **`isGameReady()`** - Game readiness check (could move to GameService)
2. **`updateGameReadiness()`** - Button state management (could move to GameService)
3. **`enableStartGameButton()`** - Button enable (could move to GameService)
4. **`disableStartGameButton()`** - Button disable (could move to GameService)

### 8.3 Dependencies to Manage

**Script Loading**:
- `window.loadGameScripts()` - Lazy load game scripts
- `window.GAME_SCRIPTS` - Array of game scripts to load

**Item Consumption**:
- `showItemConsumptionModal()` - Show item selection modal
- `game.selectedItems` - Selected items for consumption
- `consumeItemsFromBlockchain()` - Batch item consumption

**Game Initialization**:
- `window.initializeGame()` - Initialize game canvas/state (main.js)
- `window.initializeGameLogic()` - Initialize game logic (game-initialization.js)
- `initSecurity()` - Security system initialization
- `game.reset()` - GameState reset method
- `gameLoop()` - Game loop function

**State Management**:
- `uiGameState` - UI state (available in menu scripts)
- `gameState` - Game state (available after game scripts load)
- `game` - Game state object (main.js)
- `gameStats` - Game statistics
- `gameReadinessState` - Game readiness flags

**Audio**:
- `stopBackgroundMusic()` - Stop menu music
- `startGameplayMusic()` - Start gameplay music
- `stopGameplayMusic()` - Stop gameplay music
- `resumeGameplayMusic()` - Resume gameplay music (after pause/boss)

**Canvas/UI**:
- `ResponsiveCanvas.setupResponsiveSizing()` - Resize canvas
- `MobileUI.applyConsumableFooterLayout()` - Apply mobile layout
- `ResponsiveCanvas.isInitialized` - Canvas initialization check
- `MobileUI.isInitialized` - Mobile UI initialization check

**Menu Visibility**:
- `MenuService.hide()` - Hide menu (preferred)
- `MenuService.show()` - Show menu (when returning)

**Stats**:
- `gameStats` - Game statistics object
- `saveGameData()` - Save stats to localStorage
- `gameStats.gamesPlayed` - Games played counter

**Pause/Resume**:
- `game.paused` - Pause state flag
- `renderPauseOverlay()` - Pause screen rendering
- `toggleMobilePauseOverlay()` - Mobile pause button

### 8.4 State Management

**GameService should**:
- Coordinate with `MenuService` for menu visibility
- Coordinate with `GameDataFlow` for data loading
- Update `uiGameState` and `gameState` appropriately
- Manage game readiness state (or delegate to existing system)

### 8.5 Error Handling

- Script loading failures (continue anyway)
- Item consumption cancellation (return early)
- Game initialization failures (log error)
- Missing dependencies (fallback or error)

---

## 9. Testing Checklist

After creating GameService, verify:

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
- [ ] Audio switches correctly
- [ ] Stats update correctly
- [ ] `closeGame()` cleans up properly
- [ ] Menu shows when returning from game
- [ ] Game state resets correctly
- [ ] Memory is freed (arrays cleared)
- [ ] Multiple game starts work (no memory leaks)

---

## 10. Backward Compatibility

**Maintain**:
- Global function wrappers (`window.startGame`, `window.startGameTest`)
- HTML onclick handlers continue to work
- Existing function signatures
- Fallback implementations if GameService not available

**Migration Strategy**:
1. Create GameService with all functions
2. Update `startGame()`, `startGameTest()`, `closeGame()` to delegate to GameService
3. Keep fallback implementations
4. Test thoroughly
5. Remove fallbacks after verification (optional)

---

This documentation should provide a complete picture of the game lifecycle for creating the GameService refactoring.

