# Tournament Migration Leaderboard Fix

## Problem

When migrating tournaments from old contracts to new contracts, the leaderboard data was not being read correctly. The migration service could find the number of participants, but the leaderboard remained empty.

## Root Cause

The old contract stored leaderboard data as `Table<address, u64>` (just the score value directly), while the migration code was trying to read it as if it had a `value` field (like the new `LeaderboardEntry` struct format).

Additionally, the code was using `getObject()` on the field's `objectId` instead of using `getDynamicFieldObject()` which is the proper way to read table entries in Sui.

## Solution

Updated `backend/lib/sui/migration-service/tournament-migration.ts` in the `readOldTournament()` function to:

1. **Use `getDynamicFieldObject()`** instead of `getObject()` to properly read table entries
2. **Handle multiple storage formats**:
   - `LeaderboardEntry` struct: `{ value: u64, player_name: vector<u8> }` (new format)
   - Direct `u64` value (old contract format - `Table<address, u64>`)
3. **Add fallback logic** to try different extraction methods if the primary method fails
4. **Improve error handling and logging** to help debug any remaining issues

## Changes Made

### File: `backend/lib/sui/migration-service/tournament-migration.ts`

**Lines 594-686**: Updated leaderboard reading logic to:
- Use `getDynamicFieldObject()` for proper table entry reading
- Handle both `LeaderboardEntry` struct and direct `u64` formats
- Add fallback to `getObject()` if `getDynamicFieldObject()` fails
- Extract score from multiple possible locations in the response structure
- Add detailed logging for debugging

## Testing

### Test Reading Old Tournament Data

You can test if the fix works by reading an old tournament's data:

```bash
# Using the API endpoint
curl -X GET "http://localhost:3000/api/tournaments/migrate?action=read&tournamentId=<TOURNAMENT_ID>&oldTournamentRegistryId=<OLD_REGISTRY_ID>"

# Or using the migration service directly
# See backend/scripts/read-old-tournament-simple.js
```

### Verify Leaderboard Data

The response should include:
- `tournament.leaderboard`: Array of `{ address: string, score: number }` entries
- `tournament.leaderboard.length`: Should match the number of players who submitted scores

### Test Full Migration

1. **Read old tournament data** (verify leaderboard is populated):
   ```bash
   GET /api/tournaments/migrate?action=read&tournamentId=<ID>
   ```

2. **Migrate the tournament**:
   ```bash
   POST /api/tournaments/migrate
   {
     "tournamentId": <ID>
   }
   ```

3. **Verify leaderboard in new tournament**:
   ```bash
   GET /api/tournaments/<NEW_ID>/leaderboard
   ```

## Restoring Data for Already-Migrated Tournaments

If you've already migrated tournaments but the leaderboard data is missing, you can restore it without creating duplicates:

### Using the Script (Recommended)

```bash
# Restore leaderboard for a single tournament (auto-finds new tournament)
node backend/scripts/restore-leaderboard-data.js <oldTournamentId>

# Restore leaderboard for a specific new tournament ID
node backend/scripts/restore-leaderboard-data.js <oldTournamentId> <newTournamentId>

# Restore all tournaments
node backend/scripts/restore-leaderboard-data.js --all
```

### Using the API Endpoint

```bash
# Restore leaderboard data (auto-finds new tournament by matching properties)
GET /api/tournaments/migrate?action=restore&oldTournamentId=<OLD_ID>

# Restore to a specific new tournament ID
GET /api/tournaments/migrate?action=restore&oldTournamentId=<OLD_ID>&newTournamentId=<NEW_ID>
```

### Safety

The `admin_restore_leaderboard` function in the contract is **safe to run multiple times**:
- If an entry already exists, it only updates if the new score is **higher**
- If an entry doesn't exist, it adds it
- Player names are only updated if the current name is empty

This means you can safely restore data even if some entries already exist.

## Environment Variables Required

Make sure these are set in your `.env` file:

```env
# Old contract IDs (to read from)
OLD_GAME_SCORE_CONTRACT_TESTNET=0xea5767f2e72096e637f2f64175aa8931c6cd3fde3dc7cc450dc9399ec1daf4c6
OLD_TOURNAMENT_REGISTRY_OBJECT_ID_TESTNET=0x160a5611d94a131a6d5076312fc063d57cada0ae5e8e55ed47f4b2c23967d63b

# New contract IDs (to migrate to)
GAME_SCORE_CONTRACT_TESTNET=0xba5b1f42b8293b84d7e615a07709e9654cc1f4f321984de136a64cf1054e1c1c
TOURNAMENT_REGISTRY_OBJECT_ID_TESTNET=0xe1ddf8ecdbfbf9d2f3c848e5481c1bbd7729db4cb3e326d99ece9d24de2af530
TOURNAMENT_ADMIN_CAP_OBJECT_ID_TESTNET=0x4cdc7a4f3d6f9edb7ff88d5c71a1bd30d58f2b782317f8be04d5fd106e11a703
```

## If Leaderboard Still Empty

If the leaderboard is still empty after this fix:

1. **Check the logs** - The migration service now logs detailed information about:
   - How many leaderboard entries were found
   - The structure of each entry
   - Any errors during extraction

2. **Verify the old contract structure** - Run:
   ```bash
   node backend/scripts/check-old-registry-tournament.js
   ```
   This will show you the actual structure of leaderboard entries in the old contract.

3. **Check if data exists** - The old tournament might genuinely have no leaderboard entries (players entered but never submitted scores).

## Related Files

- `backend/lib/sui/migration-service/tournament-migration.ts` - Main migration service (fixed)
- `backend/app/api/tournaments/migrate/route.ts` - Migration API endpoint
- `backend/scripts/check-old-registry-tournament.js` - Script to inspect old tournament structure
- `backend/scripts/read-old-tournament-data.js` - Script to read old tournament data

## Notes

- The fix handles both old (`Table<address, u64>`) and new (`Table<address, LeaderboardEntry>`) formats
- Player names are still extracted from `TournamentScoreUpdated` events (as before)
- The migration process remains the same - this only fixes the data reading step

## On-Chain Storage

✅ **Data is now stored on-chain** in the `leaderboard` table, not just in events.

### Future Migrations

Future migrations will **automatically read from on-chain storage** because:

1. The migration service **always tries the table first** (preferred method)
2. If data exists in the table, it uses that directly
3. Event reconstruction is only used as a fallback if the table is empty

This means:
- ✅ Data migrated to on-chain storage will be read from the table
- ✅ No need to query events for already-migrated tournaments
- ✅ Faster and more reliable data access
- ✅ Data is permanently stored on the blockchain

### Verification

Use the verification script to confirm data is on-chain:

```bash
node backend/scripts/verify-leaderboard-on-blockchain.js <tournamentId>
```

This directly queries the blockchain to verify the leaderboard table contains the data.

