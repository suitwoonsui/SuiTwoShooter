# End Game Flow & Smart Contract Integration Review

## Overview
This document reviews the complete end game flow from game over to blockchain submission. **✅ IMPLEMENTATION COMPLETE** - All features working on testnet.

## ✅ Implementation Status: COMPLETE

**Last Updated:** 2025-01-15

**Status:** All core features implemented and deployed:
- ✅ Score submission to blockchain via admin wallet
- ✅ Session ID tracking (prevents duplicates)
- ✅ Player name field (optional)
- ✅ All game stats captured and submitted
- ✅ CORS configured
- ✅ Error handling with toast notifications
- ✅ Verification API endpoint
- ✅ Contract deployed to testnet

---

## 1. Game Over Trigger

### Location: `src/game/main.js` - `gameOver()` function

**Flow:**
1. Game ends when player dies (collision detected)
2. `gameOver()` is called (line 789)
3. Game state is updated:
   - `game.gameRunning = false`
   - `game.gameOver = true`
   - `game.speed = 0` (stops movement)

**Game Statistics Available at This Point:**
- `game.score` - Final score
- `game.coins` - Coins collected
- `game.distance` - Distance traveled
- `game.bossesDefeated` - Number of bosses defeated
- `game.enemiesDefeated` - Number of enemies defeated
- `game.forceField.maxStreak` - Longest coin streak

**Security Validation:**
- Calls `onSecureGameOver()` if available (line 823)
- Validates score through security system
- Returns validated score or falls back to `game.score`

**Next Step:**
- Calls `onGameOver(finalScoreToUse)` to trigger UI flow (line 838)

---

## 2. UI Flow - Game Over Screen

### Location: `src/game/systems/ui/leaderboard-system.js` - `onGameOver()` function

**Flow:**
1. Receives final score from `gameOver()`
2. Updates game stats (best score tracking)
3. Ensures game container is visible
4. Waits minimum 500ms for game over screen display
5. Waits for user interaction (click/keypress/touch)
6. Determines next step:
   - **High score?** → Show name input modal (`showNameInput()`)
   - **No high score?** → Show main menu directly

**Key Function: `shouldSaveScore(score)`**
- Checks if score qualifies for leaderboard (top 10)
- If `leaderboard.length < 10` OR `score > 10th place score`

---

## 3. Name Input Modal

### Location: `src/game/systems/ui/leaderboard-system.js` - `showNameInput()` function

**Flow:**
1. Modal is displayed with input field
2. User can:
   - Enter name and click "Save Score"
   - Click "Skip" to bypass saving

**Current Behavior:**
- Modal shows when high score is achieved
- User enters name
- Clicks "Save Score" button

---

## 4. Score Saving & Blockchain Submission

### Location: `src/game/systems/ui/leaderboard-system.js` - `saveScore()` function

**Flow:**
1. Gets player name from input field
2. Validates name (if empty, shows alert but still proceeds)
3. Saves to localStorage:
   - Adds score to `leaderboard` array
   - Sorts by score (descending)
   - Keeps top 10 only
   - Saves to `localStorage.setItem('gameLeaderboard', ...)`
4. Updates leaderboard display (with error handling)
5. **Closes modal immediately** (doesn't wait for blockchain)
6. Shows main menu
7. **Then** submits to blockchain (background, non-blocking)

**Blockchain Submission Trigger:**
```javascript
if (typeof window.submitScoreToBlockchain === 'function' && 
    typeof window.game !== 'undefined' && 
    window.walletAPIInstance && 
    window.walletAPIInstance.isConnected()) {
  // Collect game statistics
  const gameStats = {
    score: score,
    distance: window.game.distance || 0,
    coins: window.game.coins || 0,
    bossesDefeated: window.game.bossesDefeated || 0,
    enemiesDefeated: window.game.enemiesDefeated || 0,
    longestCoinStreak: window.game.forceField?.maxStreak || 0
  };
  
  // Submit in background (promise-based, non-blocking)
  window.submitScoreToBlockchain(gameStats).then(...).catch(...);
}
```

**Potential Issues:**
- ⚠️ **Gap:** Game stats are read from `window.game` at save time, but game may have been reset/cleared
- ⚠️ **Gap:** No validation that stats are still available
- ⚠️ **Gap:** No error notification to user if blockchain submission fails

---

## 5. Frontend Blockchain Submission

### Location: `src/game/blockchain/score-submission.js` - `submitScoreToBlockchain()` function

**Flow:**
1. Validates wallet connection:
   - Checks `window.walletAPIInstance.isConnected()`
   - Gets player address via `window.walletAPIInstance.getAddress()`
2. Prepares request payload:
   ```javascript
   {
     playerAddress: "0x...",  // User's wallet address
     scoreData: {
       score: number,
       distance: number,
       coins: number,
       bossesDefeated: number,
       enemiesDefeated: number,
       longestCoinStreak: number
     }
   }
   ```
3. Sends POST request to backend:
   - URL: `${API_BASE_URL}/scores/submit`
   - Default: `http://localhost:3000/api/scores/submit`
4. Returns result:
   - `{ success: true, digest: "...", playerAddress: "...", gasPaidBy: "admin_wallet" }`
   - OR `{ success: false, error: "..." }`

**API Base URL Resolution:**
- `window.GAME_CONFIG?.API_BASE_URL` (if set)
- `process.env.NEXT_PUBLIC_API_BASE_URL` (if set)
- Default: `http://localhost:3000/api`

**Potential Issues:**
- ⚠️ **Gap:** No retry logic if network fails
- ⚠️ **Gap:** No user feedback if submission fails (only console logs)

---

## 6. Backend API Route

### Location: `backend/app/api/scores/submit/route.ts` - `POST()` function

**Flow:**
1. Receives POST request with `playerAddress` and `scoreData`
2. Validates input:
   - `playerAddress` must be present and valid Sui address format (0x + 64 hex chars)
   - `scoreData` must contain all required fields:
     - `score`, `distance`, `coins`, `bossesDefeated`, `enemiesDefeated`, `longestCoinStreak`
   - All fields must be numbers and non-negative
3. Gets admin wallet service instance
4. Calls `adminWallet.submitScoreForPlayer(playerAddress, scoreData)`
5. Returns JSON response:
   - Success: `{ success: true, digest: "...", playerAddress: "...", gasPaidBy: "admin_wallet" }`
   - Error: `{ success: false, error: "..." }` with appropriate HTTP status

**Error Handling:**
- 400: Invalid input (missing fields, invalid format)
- 500: Transaction failed or internal error

---

## 7. Admin Wallet Service

### Location: `backend/lib/sui/admin-wallet-service.ts` - `submitScoreForPlayer()` method

**Flow:**
1. Validates player address format
2. Validates score data (non-negative values)
3. Gets contract address from config:
   - `this.config.contracts.gameScore`
   - Must be set in environment variables
4. Parses package ID from contract address
5. Builds Sui transaction:
   ```typescript
   const txb = new Transaction();
   txb.moveCall({
     target: `${packageId}::score_submission::submit_game_session_for_player`,
     arguments: [
       txb.pure.address(playerAddress),      // player: address
       txb.object('0x6'),                     // clock: &Clock
       txb.pure.u64(scoreData.score),         // score: u64
       txb.pure.u64(scoreData.distance),      // distance: u64
       txb.pure.u64(scoreData.coins),        // coins: u64
       txb.pure.u64(scoreData.bossesDefeated), // bosses_defeated: u64
       txb.pure.u64(scoreData.enemiesDefeated), // enemies_defeated: u64
       txb.pure.u64(scoreData.longestCoinStreak), // longest_coin_streak: u64
     ],
   });
   txb.setGasBudget(this.config.sui.gasBudget);
   ```
6. Signs transaction with admin wallet keypair
7. Executes on testnet via `this.testnetClient.signAndExecuteTransaction()`
8. Returns result:
   - Success: `{ success: true, digest: "..." }`
   - Error: `{ success: false, error: "..." }`

**Network Configuration:**
- **Testnet:** Used for contract interactions (score submissions)
- **Mainnet:** Used for token balance checks (gatekeeping)

**Admin Wallet:**
- Private key loaded from environment: `GAME_WALLET_PRIVATE_KEY` or `ADMIN_WALLET_PRIVATE_KEY`
- Supports both bech32 (`suiprivkey1...`) and hex formats
- Pays all gas fees for score submissions

**Potential Issues:**
- ⚠️ **Gap:** No gas price estimation before submission
- ⚠️ **Gap:** Fixed gas budget may be insufficient for complex transactions
- ⚠️ **Gap:** No retry logic for transient failures

---

## 8. Smart Contract

### Location: `contracts/suitwo_game/sources/score_submission.move`

**Function Called:** `submit_game_session_for_player`

**Parameters:**
- `player: address` - User's wallet address (from connected wallet)
- `clock: &Clock` - Sui Clock object (0x6)
- `score: u64` - Total score
- `distance: u64` - Distance traveled
- `coins: u64` - Coins collected
- `bosses_defeated: u64` - Bosses defeated
- `enemies_defeated: u64` - Enemies defeated
- `longest_coin_streak: u64` - Longest coin streak

**Validation Checks:**
1. **Distance minimum:** `distance >= 35` (prevents instant submissions)
   - Error code: 1
2. **Score logic:** Validates score makes sense based on actions
   - Minimum score: 100
   - Score must be 70-1000% of expected minimum
   - Error code: 2
3. **Coin limit:** `coins <= 1000` (prevents cheating)
   - Error code: 3
4. **Coin streak:** `longest_coin_streak <= coins` (logical consistency)
   - Error code: 4

**On Success:**
1. Creates `GameSession` object with all statistics
2. Transfers ownership to player (player owns the session object)
3. Emits `ScoreSubmitted` event (for leaderboard queries)

**Event Structure:**
```move
struct ScoreSubmitted {
    player: address,
    score: u64,
    distance: u64,
    coins: u64,
    bosses_defeated: u64,
    enemies_defeated: u64,
    longest_coin_streak: u64,
    timestamp: u64,
}
```

**Potential Issues:**
- ⚠️ **Gap:** No rate limiting (user could spam submissions)
- ⚠️ **Gap:** No duplicate submission prevention
- ⚠️ **Gap:** No game session ID to track individual sessions

---

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Game Over (main.js)                                      │
│    - Player dies                                            │
│    - gameOver() called                                      │
│    - Security validation (onSecureGameOver)                 │
│    - Stats available: score, coins, distance, etc.          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. UI Flow (leaderboard-system.js)                          │
│    - onGameOver(finalScore) called                          │
│    - Waits for user interaction                              │
│    - Checks if high score (shouldSaveScore)                 │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
┌──────────────────┐   ┌──────────────────────┐
│ High Score?      │   │ No High Score        │
│ Show name input  │   │ Show main menu       │
└────────┬─────────┘   └──────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Name Input Modal                                          │
│    - User enters name                                        │
│    - Clicks "Save Score" or "Skip"                          │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
┌──────────────────┐   ┌──────────────────────┐
│ Save Score       │   │ Skip                 │
│ saveScore()      │   │ skipSave()           │
└────────┬─────────┘   └──────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Save to localStorage                                      │
│    - Add to leaderboard array                                │
│    - Sort and keep top 10                                    │
│    - Save to localStorage                                    │
│    - Close modal immediately                                │
│    - Show main menu                                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Blockchain Submission (background)                       │
│    - Check wallet connected?                                 │
│    - Collect game stats from gameStats object               │
│    - Call submitScoreToBlockchain(gameStats, playerName)    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Frontend API Call (score-submission.js)                  │
│    - POST /api/scores/submit                                │
│    - Payload: { playerAddress, playerName, sessionId, scoreData } │
│    - All numeric values rounded to integers                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. Backend API Route (route.ts)                             │
│    - Validate input                                         │
│    - Call adminWallet.submitScoreForPlayer()                │
│    - Admin wallet signs transaction                         │
│    - Admin wallet pays gas fees                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. Admin Wallet Service (admin-wallet-service.ts)           │
│    - Build transaction with Move call                        │
│    - Include Session Registry for duplicate prevention      │
│    - Round all numeric values to integers                    │
│    - Sign and execute transaction                           │
│    - Return transaction digest                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 9. Sui Blockchain (testnet)                                 │
│    - Contract validates score logic (includes enemy kills)   │
│    - Creates GameSession object (owned by player)           │
│    - Emits ScoreSubmitted event                             │
│    - Marks session ID as used (prevents duplicates)         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 10. Response to Frontend                                    │
│     - Success: Transaction digest, show toast notification   │
│     - Error: Error message, show error toast                │
└─────────────────────────────────────────────────────────────┘
```

---

## Identified Gaps & Issues

### 1. **Game Stats Availability**
- **Issue:** Game stats are read from `window.game` at save time, but game may have been reset/cleared
- **Location:** `leaderboard-system.js` line 190-196
- **Impact:** Stats may be `0` or `undefined` if game was reset
- **Recommendation:** Capture stats at game over and store them before UI flow

### 2. **No User Feedback for Blockchain Submission**
- **Issue:** Blockchain submission happens in background with no user notification
- **Location:** `leaderboard-system.js` line 202-215
- **Impact:** User doesn't know if submission succeeded or failed
- **Recommendation:** Add toast notification or status indicator

### 3. **No Retry Logic**
- **Issue:** If network fails, submission is lost
- **Location:** `score-submission.js` and `admin-wallet-service.ts`
- **Impact:** Failed submissions are not retried
- **Recommendation:** Implement exponential backoff retry logic

### 4. **No Duplicate Prevention**
- **Issue:** Same score could be submitted multiple times
- **Location:** Smart contract
- **Impact:** Spam submissions, wasted gas
- **Recommendation:** Add session ID or timestamp-based deduplication

### 5. **No Rate Limiting**
- **Issue:** User could spam score submissions
- **Location:** Smart contract and backend
- **Impact:** Gas costs, potential abuse
- **Recommendation:** Add rate limiting (time-based or count-based)

### 6. **Fixed Gas Budget**
- **Issue:** Gas budget is fixed, may be insufficient
- **Location:** `admin-wallet-service.ts` line 194
- **Impact:** Transactions may fail if gas prices spike
- **Recommendation:** Estimate gas before submission or use dynamic budget

### 7. **No Game Session Tracking**
- **Issue:** No unique session ID to track individual game sessions
- **Location:** Smart contract
- **Impact:** Can't prevent duplicate submissions or track session history
- **Recommendation:** Add session ID or nonce to GameSession struct

### 8. **Stats Collection Timing**
- **Issue:** Stats are collected at save time, not at game over
- **Location:** `leaderboard-system.js` line 190-196
- **Impact:** Stats may be stale or missing
- **Recommendation:** Pass stats from `gameOver()` through `onGameOver()` to `saveScore()`

### 9. **Error Handling in UI**
- **Issue:** Errors are only logged to console
- **Location:** Multiple locations
- **Impact:** User doesn't know if something failed
- **Recommendation:** Add user-facing error messages/toasts

### 10. **Skip Button Behavior**
- **Issue:** If user skips, score is never submitted to blockchain
- **Location:** `leaderboard-system.js` - `skipSave()`
- **Impact:** Scores may not be saved on-chain if user skips
- **Recommendation:** Consider auto-submitting even if user skips name entry

---

## Recommendations Summary

### High Priority
1. **Capture stats at game over** - Store game stats before UI flow to prevent loss
2. **Add user feedback** - Show success/failure notifications for blockchain submission
3. **Add session ID** - Track individual game sessions to prevent duplicates

### Medium Priority
4. **Implement retry logic** - Retry failed submissions with exponential backoff
5. **Add rate limiting** - Prevent spam submissions
6. **Improve error handling** - Show user-friendly error messages

### Low Priority
7. **Dynamic gas estimation** - Estimate gas before submission
8. **Auto-submit on skip** - Submit to blockchain even if user skips name entry
9. **Session history** - Track and display user's game session history

---

## Questions for Discussion

1. **Should scores be submitted to blockchain even if user skips name entry?**
   - Currently: No submission if skipped
   - Alternative: Auto-submit with anonymous/default name

2. **Should we add a game session ID?**
   - Would help prevent duplicates and track sessions
   - Could be generated client-side or server-side

3. **How should we handle failed blockchain submissions?**
   - Retry automatically?
   - Queue for later?
   - Show user error and allow manual retry?

4. **Should we add rate limiting?**
   - Per user? Per IP? Time-based or count-based?

5. **Should stats be captured at game over or at save time?**
   - Current: At save time (may be stale)
   - Recommendation: At game over (more reliable)

6. **Should we add user notifications for blockchain status?**
   - Toast notifications?
   - Status indicator in UI?
   - Email/on-chain notifications?

