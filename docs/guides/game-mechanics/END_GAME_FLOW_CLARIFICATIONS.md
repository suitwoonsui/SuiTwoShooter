# End Game Flow - Clarifications & Responses

## 1. Game Stats Loss - Not an Issue ✅

**Your Point:** Stats would only be lost if user refreshes the page, which is a user decision. There's no restart option during game over.

**Analysis:**
- ✅ Correct! Looking at the code:
  - `gameOver()` does NOT reset stats (line 789-841 in `main.js`)
  - `restart()` only resets stats when starting a NEW game (line 46-130)
  - `restart()` is only called from `startGame()`, which is only accessible from main menu
  - By the time user is in name input modal, they can't restart

**Conclusion:** This is NOT a gap. Stats remain available until user starts a new game or refreshes the page.

---

## 2. User Feedback for Blockchain Submission

**Your Preference:** Seamless and behind the scenes - users shouldn't even be aware.

**Current Implementation:**
- Console logs only (lines 204-214 in `leaderboard-system.js`)
- No UI feedback

**Recommendation:**
- Keep it silent for success (just console logs)
- Only show feedback if there's an error that needs user attention
- Could add a subtle toast notification for errors only (optional)

**Implementation Options:**
1. **Silent (Recommended):** Keep current - no UI feedback, just console logs
2. **Error-only notification:** Show toast/alert only if submission fails after retries
3. **Subtle indicator:** Small icon in corner that shows "✓ Saved" briefly (optional)

---

## 3. Retry Logic - Defer to After Flow

**Your Decision:** Address after flow is correct.

**Status:** ✅ Deferred - will implement after flow is working correctly.

---

## 4. Duplicate Prevention - Defer to After Flow

**Your Decision:** Address after flow is correct.

**Status:** ✅ Deferred - will implement after flow is working correctly.

---

## 5. Fixed Gas Budget Issue

**Current Implementation:**
- Gas budget is fixed: `10,000,000 MIST` (0.01 SUI) from config
- Set in `backend/config/config.ts` line 126: `gasBudget: parseInt(process.env.SUI_GAS_BUDGET || '10000000', 10)`
- Used in `admin-wallet-service.ts` line 194: `txb.setGasBudget(this.config.sui.gasBudget)`

**The Issue:**
- Gas prices on Sui can fluctuate
- If gas prices spike, fixed budget might be insufficient → transaction fails
- If gas prices are low, fixed budget might be too high → wastes admin wallet funds
- No dynamic estimation before submission

**Current Risk Level:** **LOW**
- 0.01 SUI is usually sufficient for simple Move calls
- Sui gas prices are relatively stable
- Can be adjusted via `SUI_GAS_BUDGET` environment variable

**Recommendation:**
- Keep fixed budget for now (it's working)
- Monitor transaction failures
- If failures occur, we can:
  1. Increase the default budget
  2. Add dynamic gas estimation (more complex)
  3. Use `dryRunTransaction` to estimate before submission

**Action:** ✅ No immediate action needed - monitor and adjust if issues arise.

---

## 6. Game Session Tracking - NEEDED ✅

**Your Decision:** We should have game session tracking for proper security.

**Current State:**
- No unique session ID
- No way to prevent duplicate submissions
- No way to track individual game sessions
- Can't link multiple submissions to same game session

**What We Need:**
1. **Session ID Generation:**
   - Generate unique ID when game starts
   - Store in game state
   - Pass through entire flow

2. **Smart Contract Update:**
   - Add `session_id: u64` or `session_id: vector<u8>` to `GameSession` struct
   - Add validation to prevent duplicate session IDs (optional)

3. **Backend Tracking:**
   - Store session ID with submission
   - Check for duplicates before submitting (optional)

**Implementation Plan:**
- Generate session ID at game start (timestamp + random)
- Pass session ID through `gameOver()` → `onGameOver()` → `saveScore()` → blockchain
- Add to smart contract `GameSession` struct
- Add to backend submission

**Priority:** HIGH (for security)

---

## 7. Stats Collection Timing Issue

**Current Flow:**
1. `gameOver()` receives stats from `game` object
2. `onGameOver(finalScore)` only receives the score (line 290)
3. `saveScore()` reads stats directly from `window.game` (lines 190-196)

**The Issue:**
- `onGameOver()` only receives `finalScore`, not other stats
- `saveScore()` reads from `window.game` directly
- Stats should still be available (since `restart()` isn't called), but it's not clean

**Better Approach:**
- Pass all stats through the flow: `gameOver()` → `onGameOver()` → `saveScore()`
- Store stats in a closure or pass as object
- More reliable and cleaner code

**Current Risk:** LOW (stats should still be available, but not guaranteed)

**Recommendation:**
- Capture all stats at `gameOver()` time
- Pass as object to `onGameOver({ score, distance, coins, ... })`
- Store in closure or pass to `saveScore()`
- More reliable than reading from `window.game` later

**Priority:** MEDIUM (code quality improvement)

---

## 8. Error Handling in UI - NEEDED ✅

**Your Decision:** We definitely need to address error handling in UI.

**Current State:**
- Errors only logged to console
- No user-facing error messages
- User doesn't know if blockchain submission failed

**What We Need:**
1. **User-Friendly Error Messages:**
   - Show toast/notification for critical errors
   - Don't spam user with technical details
   - Provide actionable feedback

2. **Error Categories:**
   - **Network errors:** "Connection failed. Please check your internet."
   - **Validation errors:** "Score validation failed. Please try again."
   - **Blockchain errors:** "Transaction failed. Your score was saved locally."
   - **Wallet errors:** "Wallet not connected. Please connect your wallet."

3. **Error Recovery:**
   - Allow retry for transient errors
   - Queue failed submissions for later (optional)
   - Show status indicator

**Implementation Plan:**
- Add error notification system (toast/alert)
- Categorize errors appropriately
- Show user-friendly messages
- Allow retry for certain errors

**Priority:** HIGH (user experience)

---

## 9. Skip Button Behavior & Name Field in Smart Contract

**Your Clarification:** Skip button is only to skip name input. We need to introduce a name field for the smart contract so users can add a name if they would like to.

**Current State:**
- Name is only stored in localStorage leaderboard
- Smart contract `GameSession` has no name field
- Skip button skips name input AND blockchain submission (if wallet not connected)

**What We Need:**
1. **Add Name to Smart Contract:**
   - Add `player_name: vector<u8>` or `player_name: String` to `GameSession` struct
   - Make it optional (empty string if skipped)
   - Update `submit_game_session_for_player` function to accept name parameter

2. **Update Backend:**
   - Accept `playerName` in API request
   - Pass to smart contract function
   - Handle empty string for skipped names

3. **Update Frontend:**
   - Pass name from input field to blockchain submission
   - If skipped, pass empty string or default name
   - Still submit to blockchain even if name is skipped

**Implementation Plan:**
1. Update smart contract to include `player_name` field
2. Update backend API to accept and pass name
3. Update frontend to send name (or empty string if skipped)
4. Ensure blockchain submission happens even if name is skipped

**Priority:** HIGH (feature request)

---

## Summary of Actions Needed

### High Priority (Do Now)
1. ✅ **Game Session Tracking** - Add session ID generation and tracking
2. ✅ **Error Handling in UI** - Add user-friendly error messages
3. ✅ **Name Field in Smart Contract** - Add name to contract and flow

### Medium Priority (Do Soon)
4. ⚠️ **Stats Collection Timing** - Pass stats through flow instead of reading from `window.game`

### Low Priority (Monitor)
5. ⚠️ **Gas Budget** - Monitor and adjust if needed (currently working)

### Deferred (After Flow is Correct)
6. ⏸️ **Retry Logic** - Implement after flow is working
7. ⏸️ **Duplicate Prevention** - Implement after flow is working

---

## Questions for Discussion

1. **Name Field:**
   - Should name be required or optional in smart contract?
   - What should default name be if user skips? (empty string? "Anonymous"?)
   - Should we allow name changes later?

2. **Error Handling:**
   - What level of error detail should users see?
   - Should we show a status indicator during submission?
   - Should we queue failed submissions for retry?

3. **Session ID:**
   - Should session ID be visible to users?
   - Should we prevent duplicate submissions of same session ID?
   - How should we generate session IDs? (timestamp + random? UUID?)

4. **Stats Collection:**
   - Should we store stats in a closure or pass as object?
   - Should we validate stats before passing to blockchain?

