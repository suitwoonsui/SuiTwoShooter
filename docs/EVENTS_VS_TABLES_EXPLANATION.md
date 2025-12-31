# Events vs On-Chain Tables: How Tournament Data is Read

## Current Implementation: Reading from Events

### How Events Work

When players interact with tournaments, the smart contract **emits events**:

1. **TournamentEntered Event** - Emitted when a player enters:
   ```move
   event::emit(TournamentEntered {
       tournament_id: u64,
       player: address,
       ticket_id: u64,
       ticket_value_usd_cents: u64,
       timestamp: u64,
   });
   ```

2. **TournamentScoreUpdated Event** - Emitted when a player submits a score:
   ```move
   event::emit(TournamentScoreUpdated {
       tournament_id: u64,
       player: address,
       player_name: vector<u8>,
       category: u8,
       value: u64,  // The score
       // ... other stats
       timestamp: u64,
   });
   ```

### How the Backend Reads from Events

#### Participants (getParticipantCount):
```typescript
// 1. Query ALL TournamentEntered events from the module
const events = await this.client.queryEvents({
  query: {
    MoveModule: {
      package: this.getPackageId(),
      module: 'tournaments',
    },
  },
  limit: 1000,  // ⚠️ Limited to 1000 events
});

// 2. Filter for events matching this tournament ID
for (const event of events.data) {
  if (event.type?.includes('TournamentEntered')) {
    const eventData = event.parsedJson as any;
    if (Number(eventData.tournament_id) === tournamentId) {
      participantSet.add(eventData.player);
    }
  }
}
```

#### Leaderboard (getTournamentLeaderboard):
```typescript
// 1. Query ALL TournamentScoreUpdated events
const events = await this.client.queryEvents({
  query: {
    MoveModule: {
      package: this.getPackageId(),
      module: 'tournaments',
    },
  },
  limit: 1000,  // ⚠️ Limited to 1000 events
  order: 'descending',
});

// 2. Filter and reconstruct leaderboard
// Keep only the highest score for each player
for (const event of events.data) {
  if (event.type?.includes('TournamentScoreUpdated')) {
    if (eventData.tournament_id === tournamentId) {
      // Update score if this is higher than previous
      if (score > currentScore) {
        scoreMap.set(player, score);
      }
    }
  }
}
```

## How This Works for Past Tournaments

### ✅ Events Are Permanent
- Events are **immutably stored on the blockchain**
- They never expire or get deleted
- Whether a tournament is active or past, **all events remain accessible**

### ✅ Same Query Process
- The backend queries events the same way for active and past tournaments
- Events are filtered by `tournament_id`, so it doesn't matter when the tournament ended
- Past tournaments work identically to active ones

### ⚠️ Potential Issues with Event-Based Reading

1. **Event Limit (1000 events)**:
   - If a tournament has >1000 score updates, some may be missed
   - If there are >1000 tournaments total, participant queries may miss some
   - **Solution**: Use pagination or read directly from tables

2. **Performance**:
   - Must query ALL events, then filter
   - Gets slower as more tournaments are created
   - **Solution**: Direct table reads are faster

3. **Accuracy**:
   - Events show the history of changes
   - Must reconstruct current state from all events
   - **Solution**: Tables show current state directly

## Alternative: Reading Directly from Tables

### How Tables Work

The Tournament object contains:
```move
struct Tournament {
    participants: Table<address, TournamentEntry>,  // On-chain table
    leaderboard: Table<address, u64>,                // On-chain table
}
```

### How to Read Tables Directly

The migration service shows how to do this:

```typescript
// 1. Get the tournament object
const tournamentObj = await client.getObject({
  id: tournamentObjectId,
  options: { showContent: true },
});

// 2. Extract the participants table ID
const participantsTableId = fields.participants?.fields?.id?.id;

// 3. Query all dynamic fields (each field = one participant)
const participantFields = await client.getDynamicFields({
  parentId: participantsTableId,
  limit: 1000,
});

// 4. Read each participant entry
for (const field of participantFields.data) {
  const playerAddress = field.name.value;  // Key = player address
  
  // Read the entry object to get ticket_id, ticket_value, etc.
  const entryObj = await client.getDynamicFieldObject({
    parentId: participantsTableId,
    name: { type: 'address', value: playerAddress },
  });
  
  // Extract data from entry object
  const entryData = entryObj.data.content.fields;
  // ... process participant data
}
```

### Benefits of Reading from Tables

1. **✅ Direct Access**: Get current state immediately, no reconstruction needed
2. **✅ More Reliable**: No event limit issues (can paginate tables)
3. **✅ Faster**: Only query one tournament's data, not all events
4. **✅ Accurate**: Tables are the source of truth on-chain

### Why the Backend Uses Events (Currently)

Looking at the code comments:
```typescript
// Note: Table contents aren't directly queryable via RPC
// We'll need to query TournamentScoreUpdated events and reconstruct leaderboard
```

**This comment is actually incorrect** - tables ARE queryable via RPC using `getDynamicFields()` and `getDynamicFieldObject()`, as shown in the migration service.

The backend likely uses events because:
1. It was easier to implement initially
2. Events provide a historical record
3. The developer may not have known about `getDynamicFields()`

## Recommendation

**For better reliability and performance, especially with thousands of tournaments:**

1. **Read participants from the table** (like migration service does)
2. **Read leaderboard from the table** (like migration service does)
3. **Use events as a fallback** or for historical queries

This would work the same for both active and past tournaments, and would be more reliable.

## Summary

- **Current**: Backend reads from events (works for past tournaments, but has limitations)
- **Better**: Read directly from on-chain tables (more reliable, faster, works for past tournaments too)
- **Past Tournaments**: Both methods work identically - events are permanent, tables are permanent

