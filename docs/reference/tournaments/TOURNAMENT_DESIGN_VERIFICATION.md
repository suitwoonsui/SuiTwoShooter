# Tournament Design Verification

## Current Design Overview

### 1. **Data Storage**

#### On-Chain State (Tables):
- `participants: Table<address, TournamentEntry>` - Players who entered
- `leaderboard: Table<address, u64>` - **Best score per player** (single value)

#### Events (Historical Records):
- `TournamentEntered` - When player enters tournament
- `TournamentScoreUpdated` - **Every score submission** (all game stats)

---

## Flow Verification

### Step 1: Tournament Entry
**Function:** `enter_tournament_for_user`

1. ✅ Player added to `participants` table
2. ✅ Player added to `leaderboard` table with value `0` (initialized)
3. ✅ `TournamentEntered` event emitted

**Result:** Player is now a participant with leaderboard entry at 0

---

### Step 2: Score Submission
**Function:** `update_tournament_score`

1. ✅ Validates player is participant (`table::contains(&tournament.participants, player)`)
2. ✅ Validates tournament is active or within grace period
3. ✅ **Updates leaderboard** (FIXED):
   - If player exists in leaderboard: Uses `borrow_mut` to update value (only if new > current)
   - If player doesn't exist: Adds them (shouldn't happen, but handled gracefully)
4. ✅ **Always emits event** (even if value didn't increase) - for "all games played" history

**Result:** 
- Leaderboard table updated with best score
- Event emitted with all game stats

---

### Step 3: Leaderboard Query
**Function:** `getTournamentLeaderboard` (backend)

1. ✅ Queries `TournamentScoreUpdated` events
2. ✅ Filters by `tournament_id`
3. ✅ Keeps **highest value per player** (matches contract logic)
4. ✅ Sorts by value (descending)
5. ✅ Assigns ranks
6. ✅ **Fetches player names** from `ScoreSubmitted` events (optional, displayed if available)

**Result:** Leaderboard showing each player's best score with optional player name display

---

## Design Verification Checklist

### ✅ Leaderboard (Best Score Per Player)
- [x] Leaderboard table stores single best value per player
- [x] Only updates if new value > current value
- [x] Initialized to 0 when player enters
- [x] Bug fixed: Uses `borrow_mut` instead of `add` (prevents "key already exists" error)

### ✅ All Games Played (History)
- [x] `TournamentScoreUpdated` event emitted on every submission
- [x] Event contains all game stats (score, distance, coins, etc.)
- [x] Event includes timestamp for ordering
- [x] Backend can query events to show all games

### ✅ Accuracy Concerns
- [x] Leaderboard table: **Always accurate** (on-chain state, no delays)
- [x] Events: May have indexing delays (acceptable for history, not for real-time leaderboard)
- [x] Backend reconstructs leaderboard from events (matches table state when events are indexed)

---

## Known Limitations

1. **Event Indexing Delays**
   - Events may not be immediately available after transaction
   - This is why we saw "no scores yet" initially
   - **Mitigation:** Leaderboard table is always accurate (but we query events for display)

2. **Rate Limiting**
   - Event queries can hit 429 errors
   - **Mitigation:** Caching implemented (30-second TTL)

3. **Query Limits**
   - Limited to 1000 events per query
   - **Mitigation:** Should be sufficient for most tournaments

---

## Bug Fix Verification

### Before (Bug):
```move
if (table::contains(&tournament.leaderboard, player)) {
    let current_value = *table::borrow(&tournament.leaderboard, player);
    if (value > current_value) {
        table::add(&mut tournament.leaderboard, player, value);  // ❌ ERROR: Key already exists
    };
}
```

### After (Fixed):
```move
if (table::contains(&tournament.leaderboard, player)) {
    let current_value = table::borrow_mut(&mut tournament.leaderboard, player);
    if (value > *current_value) {
        *current_value = value;  // ✅ CORRECT: Updates existing entry
    };
}
```

**Impact:** This was causing silent transaction failures when trying to update scores.

---

## Tournament Isolation

### ✅ Each Tournament Has Its Own Leaderboard

**Key Point:** Each `Tournament` object is a separate shared object with its own isolated data:

```move
struct Tournament has key {
    id: UID,
    tournament_id: u64,
    name: vector<u8>,
    category: u8,                    // Each tournament has its own category
    participants: Table<address, TournamentEntry>,  // Isolated per tournament
    leaderboard: Table<address, u64>,    // Isolated per tournament
    prize_pool_usd_cents: u64,       // Isolated per tournament
    // ...
}
```

**Isolation Guarantees:**
1. ✅ Each tournament has its own `leaderboard` table
2. ✅ Each tournament has its own `participants` table
3. ✅ Each tournament has its own `prize_pool`
4. ✅ Each tournament tracks its own `category` (coins, distance, score, etc.)
5. ✅ Scores submitted to Tournament A don't affect Tournament B

**Example Scenario:**
- Tournament 1: "Weekly Coins" (category: totalCoins)
- Tournament 2: "Weekly Distance" (category: longestDistance)
- Player can participate in both simultaneously
- Each tournament maintains separate leaderboard
- Score of 100 coins goes to Tournament 1's leaderboard
- Score of 5000 distance goes to Tournament 2's leaderboard
- No cross-contamination between tournaments

**Backend Query:**
- `getTournamentLeaderboard(tournamentObjectId)` queries events filtered by `tournament_id`
- Each tournament's leaderboard is queried independently
- Events include `tournament_id` to ensure proper filtering

---

## Conclusion

✅ **Current design is correct and should work** after the bug fix is deployed.

The design provides:
1. **Accurate leaderboard** (on-chain table, always up-to-date)
2. **Complete history** (events, queryable for "all games played")
3. **Best of both worlds** (accuracy + history)
4. **Complete isolation** (each tournament has its own leaderboard)

The only remaining issue is event indexing delays, which is acceptable for historical queries but we should be aware of it.

---

## Recent Enhancements

### Player Name Display in Leaderboards
- **Feature:** Tournament leaderboards now display player names when available
- **Implementation:**
  - Backend queries `ScoreSubmitted` events to fetch player names
  - Names are matched to leaderboard entries by player address
  - Most recent name for each player is used
- **Display Format:**
  - **With Name:** Player name displayed prominently, wallet address shown below in smaller text
  - **Without Name:** Only wallet address displayed (as before)
- **Performance:** Single query for all player names (optimized, not per-player)
- **Graceful Degradation:** If name fetching fails, address is still displayed

### TournamentEntry Struct Enhancement
- **Change:** Added `drop` ability to `TournamentEntry` struct
- **Reason:** Required for table mutations when players re-enter tournaments
- **Impact:** Allows proper updating of existing tournament entries

