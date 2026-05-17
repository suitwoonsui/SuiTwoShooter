# Game Over Flow to Main Menu

## Complete Flow Overview

This document outlines the complete flow from when the game ends to when the main menu is displayed.

---

## 1. Game Over Trigger

**Location:** `src/game/main.js` - `gameOver()` function (line 1069)

**What Happens:**
1. Player dies (collision detected)
2. `gameOver()` is called
3. Game state updated:
   - `game.gameRunning = false`
   - `game.gameOver = true`
   - `game.speed = 0` (stops movement)
4. Game over sound plays
5. Game over particles effect (50 red particles)
6. Score captured from multiple sources (security validation)
7. All game stats captured into `gameStats` object:
   - score, distance, coins, bossesDefeated, enemiesDefeated
   - longestCoinStreak, sessionId, bossTiers, enemyTypes, bossHits

**Next Step:** Calls `onGameOver(gameStats)` (line 1166)

---

## 2. Game Over Screen Display

**Location:** `src/game/systems/ui/leaderboard-system.js` - `onGameOver()` function (line 417)

**What Happens:**
1. Receives `gameStats` object from `gameOver()`
2. Updates best score if new record
3. Ensures game container is visible (for game over screen rendering)
4. Sets up interaction handlers (click/keydown/touchstart with capture: true)
5. Waits minimum 500ms before accepting user input
6. Waits for user interaction (click/keypress/touch)

**User Interaction:**
- User clicks/presses key/touches screen
- `handleInteraction()` checks if 500ms has passed
- If too early, waits remaining time
- Then calls `actuallyProceed()`

**Next Step:** Calls `showNameInput(finalScore)` (line 495)

---

## 3. Name Input Modal

**Location:** `src/game/systems/ui/leaderboard-system.js` - `showNameInput()` function (line 72)

**What Happens:**
1. Stores score in `currentGameScore`
2. Displays final score in modal
3. Hides settings panel if visible
4. Shows name input modal
5. Hides game container
6. Focuses name input field
7. Sets up button event listeners

**User Options:**
- **Save Score:** User enters name and clicks "Save Score" → calls `saveScore()`
- **Skip:** User clicks "Skip" → calls `skipSave()`

---

## 4A. Save Score Flow

**Location:** `src/game/systems/ui/leaderboard-system.js` - `saveScore()` function (line 165)

**What Happens:**
1. **Shows loading modal:** "Saving score... Please wait"
2. Validates name input (must not be empty)
3. Saves to localStorage:
   - Adds score to leaderboard array
   - Sorts and keeps top 10
   - Saves to localStorage
   - Updates leaderboard display
4. Plays success sound
5. **Closes name input modal** (`hideNameInput()`)
6. **Blockchain submission (if wallet connected):**
   - Updates loading message: "Saving score to blockchain... Please wait"
   - Waits for `submitScoreToBlockchain()` to complete
   - Shows success/error toast
7. **Hides loading modal**
8. **Shows main menu** (`showMainMenu()`)

---

## 4B. Skip Save Flow

**Location:** `src/game/systems/ui/leaderboard-system.js` - `skipSave()` function (line 306)

**What Happens:**
1. **Closes name input modal** (`hideNameInput()`)
2. **Shows main menu immediately** (`showMainMenu()`)
3. **Blockchain submission in background** (if wallet connected):
   - Submits with empty name
   - Shows toast notifications
   - Doesn't block UI

---

## 5. Main Menu Display

**Location:** `src/game/systems/ui/menu-system.js` - `showMainMenu()` function (line 1260)

**What Happens:**
1. Updates game state:
   - `gameState.isMenuVisible = true`
   - `gameState.isGameRunning = false`
   - `gameState.isPaused = false`
   - `gameState.isGameOver = false`
2. Shows main menu overlay (adds `main-menu-overlay-visible` class)
3. **Calls `closeGame()`** to clean up:
   - Stops game engine
   - Clears game arrays (projectiles, particles, etc.)
   - Resets game state
   - Stops all audio
   - Hides game container
4. **Updates menu stats** (async, from blockchain)
5. **Updates wallet UI:**
   - If wallet connected: Updates UI, loads badge if needed
   - If wallet not connected: Hides badge display

---

## 6. Close Game Cleanup

**Location:** `src/game/systems/ui/menu-system.js` - `closeGame()` function (line 704)

**What Happens:**
1. Stops game engine:
   - `game.gameRunning = false`
   - `game.gameOver = false`
   - `game.paused = false`
2. Clears game arrays:
   - projectiles, enemyProjectiles, bossProjectiles
   - particles, tiles
3. Resets game state:
   - `game.speed = 0`
   - `game.bossActive = false`
   - `game.boss = null`
4. Stops all audio:
   - Background music
   - Gameplay music
5. Hides game container

---

## Visual Flow Diagram

```
Game Ends
    ↓
gameOver() [main.js]
    ↓
onGameOver() [leaderboard-system.js]
    ↓
Game Over Screen (wait 500ms + user interaction)
    ↓
showNameInput() [leaderboard-system.js]
    ↓
Name Input Modal
    ├─→ saveScore() ──→ Loading Modal ──→ Blockchain Submit ──→ showMainMenu()
    └─→ skipSave() ──→ showMainMenu() (blockchain in background)
    ↓
showMainMenu() [menu-system.js]
    ↓
closeGame() [menu-system.js]
    ↓
Main Menu Displayed
```

---

## Key Points

1. **Loading Modal:** Shows during score saving and blockchain submission
2. **Blockchain Submission:** 
   - Waited for in `saveScore()` (blocks until complete)
   - Background in `skipSave()` (doesn't block)
3. **Game Cleanup:** Happens in `closeGame()` called by `showMainMenu()`
4. **Badge Loading:** Happens in `showMainMenu()` if wallet is connected
5. **Stats Update:** Async blockchain stats fetch in `showMainMenu()`

---

## Potential Issues to Watch

1. **Race Conditions:** Multiple calls to `showMainMenu()` could cause issues
2. **Modal Overlap:** Loading modal should not overlap with name input modal
3. **Badge Loading:** Badge should load after main menu is shown, not during game over
4. **State Management:** Game state flags need to be properly reset


