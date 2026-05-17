# Tournament Migration - On-Chain Storage Verification

## ✅ Data Successfully Migrated to On-Chain Storage

The leaderboard data for tournaments 12 and 13 has been successfully migrated from events (in the 2025-12-23 package) to **on-chain storage** in the current contract.

## How Future Migrations Will Work

### Current Migration Service Behavior

The `readOldTournament()` function in `TournamentMigrationService` reads data in this order:

1. **First: Reads from On-Chain Table** (Preferred)
   - Queries the `leaderboard` table directly from the tournament object
   - Uses `getDynamicFields()` to get all entries
   - Uses `getDynamicFieldObject()` to read each `LeaderboardEntry` struct
   - This is the **primary method** and will be used if data exists on-chain

2. **Fallback: Reconstructs from Events** (If table is empty)
   - Only if the leaderboard table is empty
   - Queries `TournamentScoreUpdated` events from multiple package versions:
     - Current OLD package
     - 2025-12-23 package (`0x93e6bcb4da6728f47e0006eb3acc0016aae21f6d25cf6f80d5476d176413c352`)
     - 2025-12-22 package
     - 2025-12-17 package
   - Reconstructs leaderboard by keeping highest score per player

### What This Means

✅ **Future migrations will automatically read from on-chain storage** because:
- The migration service **always tries the table first**
- If data exists in the table, it uses that (no event reconstruction needed)
- The table reading logic handles both old (`Table<address, u64>`) and new (`Table<address, LeaderboardEntry>`) formats

✅ **Data is permanently stored on-chain**:
- Leaderboard entries are in the `leaderboard` table on the tournament object
- This is persistent blockchain storage, not temporary event data
- Future contract deployments can read this data directly

## Verification

### Verify Data is On-Chain

Use the verification script to check that data is stored on-chain:

```bash
# Check tournament 12
node backend/scripts/verify-leaderboard-on-blockchain.js 12

# Check tournament 13
node backend/scripts/verify-leaderboard-on-blockchain.js 13
```

This script:
1. Queries the tournament registry to find the tournament object
2. Reads the leaderboard table directly from the blockchain
3. Displays all entries stored on-chain
4. Confirms the data source is the on-chain table (not events)

### Expected Output

```
✅ Found 1 leaderboard entries stored ON-CHAIN:
📋 Leaderboard (sorted by score):
   1. 0x6e30e535c6... | Score: 6317 | Name: (no name)

✅ CONFIRMED: Leaderboard data is stored on-chain in the blockchain!
   - Tournament Object ID: 0xf8e148eb39e50d53f5bdd15d92dad00a44ec2de4ae561287b83df85f1908bd54
   - Entries stored: 1
   - Data source: On-chain table (not events)
   - Future migrations will read from this on-chain storage
```

## Migration Flow

### For Already-Migrated Tournaments (like 12 and 13)

1. **Read from current contract's on-chain table**
   - Migration service queries the tournament object
   - Reads `leaderboard` table using `getDynamicFields()`
   - Extracts scores and player names from `LeaderboardEntry` structs

2. **Restore to new contract**
   - Uses `admin_restore_leaderboard()` to write to new contract's table
   - Data is stored on-chain in the new contract

### For Tournaments Still in Old Contracts

1. **Try to read from old contract's table first**
   - If table has data, use it directly

2. **If table is empty, reconstruct from events**
   - Query events from multiple package versions
   - Reconstruct leaderboard from `TournamentScoreUpdated` events
   - Keep highest score per player

3. **Restore to new contract**
   - Write to on-chain table using `admin_restore_leaderboard()`

## Key Points

- ✅ **Data is on-chain**: Leaderboard entries are stored in the `leaderboard` table
- ✅ **Future-proof**: Future migrations will read from on-chain storage automatically
- ✅ **No event dependency**: Once data is on-chain, it doesn't depend on events
- ✅ **Persistent**: On-chain storage is permanent and queryable directly

## Transaction Digests

### Tournament 12
- Participants restore: `EJPCYWbHg7hH9dtLiLR2i8f3PEbn7wy3LNLcAcqQzj1c`
- Leaderboard restore: `J5GXLzcJpsm9rDQo6sHvsZfQVoAMnEtaH2CcucUn7apU`

### Tournament 13
- Participants restore: `A3EYQnj7epdq9fdV95XTmjhTJHMn6mvsaVLHGuXW9PqZ`
- Leaderboard restore: `3HJ5o3rcASyvsYKT1w3ybHp4zSTAnfkGgmzKBrDBu2f1`

These transactions confirm the data was written to the blockchain.

