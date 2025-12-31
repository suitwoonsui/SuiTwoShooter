# Tournament Table Migration - Data Integrity Verification

## Overview
This document explains how tournament data is preserved during the migration from `vector<u64>` to `Table<u64, ID>` structure for active and past tournaments.

## Data Preservation Guarantees

### 1. Tournament Objects Are Never Modified
- **Tournament objects are shared objects** that contain all tournament data:
  - `participants: Table<address, TournamentEntry>` - All player entries
  - `leaderboard: Table<address, u64>` - All leaderboard scores
  - `prize_pool_usd_cents` - Prize pool amount
  - `distribution_status` - Distribution status
  - All other tournament fields

- **The `move_tournament_to_past()` function only moves references**, not the tournament object itself:
  ```move
  // Remove from active_tournaments table
  table::remove(&mut registry.active_tournaments, tournament_id);
  
  // Add to past_tournaments table (same tournament object ID)
  table::add(&mut registry.past_tournaments, tournament_id, tournament_object_id);
  ```

- **The tournament object remains unchanged** - all participants, leaderboard entries, and other data are preserved.

### 2. Table Structure
- **`tournaments: Table<u64, ID>`** - Master table containing ALL tournaments (never modified during move)
- **`active_tournaments: Table<u64, ID>`** - References to active tournaments
- **`past_tournaments: Table<u64, ID>`** - References to past tournaments

- Both `active_tournaments` and `past_tournaments` store the **same tournament object IDs** that are in the master `tournaments` table.

### 3. Data Reading Process

#### Backend Query Flow:
1. **Query table dynamic fields** to get tournament IDs:
   ```typescript
   const dynamicFields = await client.getDynamicFields({
     parentId: activeTournamentsTableId,
     limit: 100,
   });
   ```

2. **Extract tournament object ID** from each dynamic field:
   ```typescript
   // Use getDynamicFieldObject to get the actual value (tournament object ID)
   const dynamicFieldObj = await client.getDynamicFieldObject({
     parentId: activeTournamentsTableId,
     name: { type: 'u64', value: String(tournamentId) },
   });
   
   // Read the field object to extract the tournament object ID
   const tournamentObjectId = /* extracted from field object */;
   ```

3. **Fetch full tournament data** using the object ID:
   ```typescript
   const tournamentResult = await this.getTournament(tournamentObjectId);
   ```

4. **`getTournament()` reads all data** from the tournament object:
   - Reads tournament metadata (name, category, times, etc.)
   - Reads participants table (via `getParticipantCount()`)
   - Reads leaderboard table (via `getTournamentLeaderboard()`)
   - Reads reward config, prize pool, distribution status, etc.

### 4. Verification Points

#### ✅ Tournament Object Integrity
- Tournament objects are shared objects - they cannot be deleted or modified except through specific entry functions
- Moving between tables only changes which table references the tournament, not the tournament itself
- All tournament data (participants, leaderboard, prize pool, etc.) is stored in the tournament object and remains intact

#### ✅ Table Reference Integrity
- The master `tournaments` table always contains all tournaments
- `active_tournaments` and `past_tournaments` are just indexes pointing to tournaments
- When a tournament is moved, only the index entries change, not the tournament object

#### ✅ Query Integrity
- `getActiveTournaments()` queries `active_tournaments` table → gets tournament object IDs → reads full tournament data
- `getPastTournaments()` queries `past_tournaments` table → gets tournament object IDs → reads full tournament data
- Both use the same `getTournament()` function, ensuring consistent data reading

#### ✅ Migration Integrity
- `move_tournament_to_past()` is idempotent - safe to call multiple times
- Validates tournament has ended (grace period) or rewards distributed before moving
- Emits `TournamentMovedToPast` event for tracking

### 5. Potential Issues and Mitigations

#### Issue: Incorrect Tournament Object ID Extraction
**Problem**: If we incorrectly extract the tournament object ID from the table, we might read the wrong tournament or fail to read it.

**Mitigation**: 
- Use `getDynamicFieldObject()` to get the field object
- Check if field object is the tournament itself (type contains "Tournament")
- Otherwise, read field object content to extract the ID value
- Fallback to `field.objectId` if `getDynamicFieldObject()` fails

#### Issue: Tournament Not Found After Move
**Problem**: If a tournament is moved but the query still looks in the old table.

**Mitigation**:
- `getActiveTournaments()` only queries `active_tournaments` table
- `getPastTournaments()` only queries `past_tournaments` table
- The scheduler automatically moves tournaments, keeping tables in sync

#### Issue: Data Loss During Move
**Problem**: If the move transaction fails partway through.

**Mitigation**:
- Move is atomic - either fully succeeds or fully fails
- Tournament object is never modified during move
- If move fails, tournament stays in `active_tournaments` (correct state)
- Scheduler will retry the move

### 6. Testing Recommendations

1. **Verify Tournament Data After Move**:
   - Create a tournament
   - Add participants and leaderboard entries
   - Move tournament to past table
   - Query past tournaments and verify all data is present

2. **Verify Query Performance**:
   - Compare query times for active vs past tournaments
   - Verify active tournaments query is fast (<100 tournaments)
   - Verify past tournaments query handles pagination correctly

3. **Verify Migration**:
   - Run migration script to analyze existing tournaments
   - Verify scheduler moves tournaments correctly
   - Verify reward distribution triggers move correctly

## Conclusion

**All tournament data is preserved during the migration:**

1. ✅ Tournament objects (containing all data) are never modified
2. ✅ Only table references are moved, not the data itself
3. ✅ Query functions correctly read tournament object IDs from tables
4. ✅ `getTournament()` reads all data from tournament objects
5. ✅ Move operation is atomic and idempotent
6. ✅ Master `tournaments` table always contains all tournaments

The migration is **data-safe** - no tournament data is lost or modified during the move from active to past tables.

