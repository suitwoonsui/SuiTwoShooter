# Leaderboard System Refactoring Plan

## Current State
- **File**: `src/game/systems/ui/leaderboard-system.js`
- **Size**: 1,157 lines
- **Functions**: 18 functions

## Analysis

### Main Responsibilities

1. **Score Submission Flow** (~300 lines)
   - `showNameInput()` - Name input modal
   - `saveScore()` - Save score to localStorage and blockchain
   - `skipSave()` - Skip saving score
   - `hideNameInput()` - Close name input modal
   - `onGameOver()` - Game over callback handler

2. **Leaderboard Modal** (~200 lines)
   - `showLeaderboard()` - Show leaderboard modal
   - `hideLeaderboard()` - Hide leaderboard modal
   - `displayLeaderboardModal()` - Render leaderboard content

3. **Blockchain Data Fetching** (~200 lines)
   - `fetchBlockchainLeaderboard()` - Fetch leaderboard from blockchain
   - `refreshLeaderboard()` - Refresh leaderboard data

4. **Category Management** (~100 lines)
   - `leaderboardNextCategory()` - Switch to next category
   - `leaderboardPrevCategory()` - Switch to previous category
   - Category definitions and state

5. **Pagination** (~100 lines)
   - `loadMoreLeaderboard()` - Load more items
   - `updateLoadMoreButton()` - Update load more button state

6. **Formatting Utilities** (~50 lines)
   - `formatAddress()` - Format wallet address
   - `formatPlayerName()` - Format player name
   - `formatStatValue()` - Format stat values

7. **Local Leaderboard** (~50 lines)
   - `displayLeaderboard()` - Display local leaderboard (localStorage)

8. **State Management** (~150 lines)
   - Global variables for state
   - Category definitions
   - Pagination state

## Proposed Module Structure

### 1. `leaderboard-service.js` (~300 lines)
**Purpose**: State management and coordination
- State management (categories, pagination, wallet address, etc.)
- `init()` - Initialize service
- `getState()` - Get current state
- `setCategory()` - Set current category
- `setWalletAddress()` - Set wallet address

### 2. `leaderboard-modal.js` (~250 lines)
**Purpose**: Modal creation and display
- `showLeaderboard()` - Show leaderboard modal
- `hideLeaderboard()` - Hide leaderboard modal
- `displayLeaderboardModal()` - Render leaderboard content
- Click-outside handler setup

### 3. `leaderboard-data.js` (~250 lines)
**Purpose**: Data fetching from blockchain
- `fetchBlockchainLeaderboard()` - Fetch leaderboard data
- `refreshLeaderboard()` - Refresh leaderboard
- Error handling and loading states

### 4. `leaderboard-categories.js` (~150 lines)
**Purpose**: Category management
- Category definitions
- `leaderboardNextCategory()` - Next category
- `leaderboardPrevCategory()` - Previous category
- Category switching logic

### 5. `leaderboard-pagination.js` (~120 lines)
**Purpose**: Pagination management
- `loadMoreLeaderboard()` - Load more items
- `updateLoadMoreButton()` - Update button state
- Pagination state management

### 6. `leaderboard-formatting.js` (~80 lines)
**Purpose**: Display formatting utilities
- `formatAddress()` - Format wallet address
- `formatPlayerName()` - Format player name
- `formatStatValue()` - Format stat values

### 7. `leaderboard-score-submission.js` (~350 lines)
**Purpose**: Score submission flow
- `showNameInput()` - Show name input modal
- `saveScore()` - Save score (localStorage + blockchain)
- `skipSave()` - Skip saving score
- `hideNameInput()` - Hide name input modal
- `onGameOver()` - Game over callback

### 8. `leaderboard-local.js` (~80 lines)
**Purpose**: Local leaderboard (localStorage)
- `displayLeaderboard()` - Display local leaderboard
- Local storage management

### 9. `leaderboard-ui.js` (~100 lines)
**Purpose**: Main coordination
- Entry points
- Delegation to services
- Global function exposure

## Estimated File Sizes

| File | Lines | Status |
|------|-------|--------|
| `leaderboard-service.js` | ~300 | ✅ Good |
| `leaderboard-modal.js` | ~250 | ✅ Good |
| `leaderboard-data.js` | ~250 | ✅ Good |
| `leaderboard-categories.js` | ~150 | ✅ Good |
| `leaderboard-pagination.js` | ~120 | ✅ Good |
| `leaderboard-formatting.js` | ~80 | ✅ Good |
| `leaderboard-score-submission.js` | ~350 | ✅ Good |
| `leaderboard-local.js` | ~80 | ✅ Good |
| `leaderboard-ui.js` | ~100 | ✅ Good |
| **Total** | **~1,680** | ✅ **All files < 400 lines** |

## Module Loading Order

1. `leaderboard-service.js` - State management
2. `leaderboard-formatting.js` - Utilities (no dependencies)
3. `leaderboard-local.js` - Local leaderboard
4. `leaderboard-categories.js` - Category management
5. `leaderboard-pagination.js` - Pagination
6. `leaderboard-data.js` - Data fetching
7. `leaderboard-score-submission.js` - Score submission
8. `leaderboard-modal.js` - Modal creation
9. `leaderboard-ui.js` - Main coordination (loads last)

## Benefits

✅ **All files under 400 lines** - Easy to read and maintain  
✅ **Clear separation of concerns** - Each module has a single responsibility  
✅ **Better testability** - Functions can be tested in isolation  
✅ **Improved maintainability** - Changes are localized to specific modules  
✅ **No functionality changes** - All existing features preserved  

## Ready to Proceed

This plan follows the same successful pattern used for the store refactoring.

