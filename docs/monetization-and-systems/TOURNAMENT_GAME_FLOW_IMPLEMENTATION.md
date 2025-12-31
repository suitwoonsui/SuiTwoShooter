# Tournament Game Flow Implementation Plan

## Overview
Tournament games follow the same flow as credit games, but with tournament-specific tracking and scoring.

## Flow Comparison

### Credit Game Flow
1. User clicks "Start Game"
2. Checks wallet, balance, credits (doesn't consume yet)
3. Shows item selection modal
4. User selects items
5. User clicks "Start Game" → Credit consumed
6. Game starts with `isDemoMode = false`
7. Score submitted to regular stats (increments `total_games`)

### Tournament Game Flow (Matching Credit Flow)
1. User clicks "Enter Tournament" (or "Purchase Ticket" if no tickets)
2. If multiple tournaments: Show tournament selection UI
3. Checks wallet, balance, tickets (doesn't consume yet)
4. Shows item selection modal (same as credit flow)
5. User selects items
6. User clicks "Start Game" → Tournament ticket consumed
7. Game starts with `isTournamentMode = true`
8. Score submitted to tournament leaderboard (does NOT increment `total_games`)

## Key Requirements

### 1. Multiple Tournament Selection
- **Requirement**: Players can be in multiple tournaments but play one game at a time
- **Implementation**: 
  - When clicking "Enter Tournament", check if player is in multiple active tournaments
  - If yes: Show tournament selection UI before item selection
  - If no: Proceed directly to item selection
  - Store selected tournament in game state

### 2. Ticket Consumption Timing
- **Requirement**: Ticket consumed AFTER item selection (matches credit flow)
- **Implementation**:
  - Ticket consumed in `_startGameInternal()` after item selection modal resolves
  - If user cancels item selection, ticket is NOT consumed
  - Same pattern as credit consumption

### 3. Grace Period (1 Hour)
- **Requirement**: Allow score submission within 1 hour after tournament ends
- **Implementation**:
  - Update Move contract `update_tournament_score()` to allow submission if `current_time <= tournament.end_time + 1 hour`
  - Backend validates grace period before submitting
  - Frontend shows warning if tournament ended but still allows submission

### 4. Button Text Logic
- **Requirement**: "Enter Tournament" button should say "Purchase Ticket" if no tickets
- **Implementation**:
  - Check ticket count when loading tournament modal
  - If `ticketCount === 0`: Show "Purchase Ticket" button
  - Button should open ticket shop (store modal with tickets tab)
  - If `ticketCount > 0`: Show "Enter Tournament" button

### 5. Tournament Indicator in UI
- **Requirement**: Show tournament name and category during gameplay
- **Implementation**:
  - Add tournament HUD overlay showing:
    - Tournament name
    - Category being tracked (e.g., "Highest Score")
    - Current rank (if available)
  - Display in top-right or top-center of game screen

### 6. Score Submission Routing
- **Requirement**: Tournament games submit to tournament leaderboard, NOT regular stats
- **Implementation**:
  - Check `isTournamentMode` flag in score submission
  - If `true`: Call `update_tournament_score()` instead of `submit_game_session_for_player()`
  - Do NOT increment `total_games` for tournament games
  - Extract appropriate stat based on `tournamentCategory`

## Implementation Tasks

### Frontend Tasks
1. **Tournament Selection UI** - Show when player has multiple active tournaments
2. **startTournamentGame()** - New function matching `startGame()` flow
3. **Tournament Mode State** - Add to game state:
   - `isTournamentMode: boolean`
   - `tournamentObjectId: string | null`
   - `tournamentCategory: string | null`
4. **Item Selection Modal** - Show tournament context (e.g., "Select items for Tournament: Weekly High Score")
5. **Ticket Consumption** - After item selection, consume ticket via API
6. **Score Submission Routing** - Check `isTournamentMode` and route accordingly
7. **Tournament HUD** - Display tournament info during gameplay
8. **Button Text Logic** - "Purchase Ticket" vs "Enter Tournament"

### Backend Tasks
1. **Tournament Score Submission Endpoint** - New endpoint for tournament score updates
2. **Grace Period Validation** - Check tournament end time + 1 hour
3. **Score Routing Logic** - Route to tournament if `isTournamentMode`, else regular stats
4. **Skip total_games Increment** - Don't increment for tournament games

### Contract Tasks
1. **Grace Period in Move Contract** - Update `update_tournament_score()` to allow 1-hour grace period
2. **Validation** - Ensure player is still participant (even after tournament ends, within grace period)

## State Management

### Game State Additions
```javascript
gameState = {
  // ... existing state
  isTournamentMode: false,
  tournamentObjectId: null,
  tournamentCategory: null, // 'highestScore' | 'longestDistance' | etc.
  tournamentName: null,
}
```

### Score Submission Logic
```javascript
if (gameState.isTournamentMode) {
  // Submit to tournament
  await submitTournamentScore({
    tournamentObjectId: gameState.tournamentObjectId,
    category: gameState.tournamentCategory,
    value: getCategoryValue(gameStats, gameState.tournamentCategory),
  });
  // Do NOT increment total_games
} else {
  // Submit to regular stats (current behavior)
  await submitGameScore(gameStats);
  // Increment total_games
}
```

## Questions Resolved

1. ✅ **Multiple Tournaments**: Show selection UI before item selection
2. ✅ **Grace Period**: 1 hour after tournament ends
3. ✅ **Ticket Consumption**: After item selection (if cancel, no ticket consumed)
4. ✅ **No Tickets**: Button says "Purchase Ticket" and opens ticket shop
5. ✅ **Validation**: Grace period handled in contract and backend
6. ✅ **UI Indicator**: Tournament name and category shown in HUD

## Next Steps

1. Update Move contract for grace period
2. Create tournament selection UI
3. Implement `startTournamentGame()` function
4. Add tournament mode state tracking
5. Update score submission routing
6. Add tournament HUD indicator
7. Update button text logic

