# Implementation Plan: Switch to Direct Table Reading

## Recommendation: **Switch to Reading from Tables**

### Why This Is Better

Given your requirements:
- ✅ **1000s of historical tournaments** - Events get slower, tables stay fast
- ✅ **<100 active tournaments** - Table queries are instant
- ✅ **Query performance important** - Tables are much faster
- ✅ **Two-table structure** - Works perfectly with direct table reads

### Benefits

1. **Performance**: Query only one tournament's data, not all events
2. **Reliability**: No 1000 event limit, tables are source of truth
3. **Simplicity**: Direct access to current state, no reconstruction
4. **Scalability**: Works great with thousands of tournaments

### Implementation Strategy

#### Option A: Gradual Migration (Recommended)
1. Add table-reading methods alongside event-based methods
2. Add feature flag to switch between methods
3. Test with both active and past tournaments
4. Switch fully once proven stable
5. Remove event-based code later

#### Option B: Direct Switch
1. Replace event-based methods with table-reading methods
2. Keep event-based as fallback for error cases
3. Test thoroughly before deploying

### Implementation Steps

#### Step 1: Update `getParticipantCount()`

**Current (Events)**:
```typescript
// Queries ALL TournamentEntered events, filters by tournament_id
const events = await this.client.queryEvents({...});
// Reconstructs participant count from events
```

**New (Tables)**:
```typescript
// Read directly from tournament's participants table
const tournamentObj = await this.client.getObject({
  id: tournamentObjectId,
  options: { showContent: true },
});

const participantsTableId = fields.participants?.fields?.id?.id;
const participantFields = await this.client.getDynamicFields({
  parentId: participantsTableId,
  limit: 1000,
});

return participantFields.data.length; // Direct count!
```

#### Step 2: Update `getTournamentLeaderboard()`

**Current (Events)**:
```typescript
// Queries ALL TournamentScoreUpdated events
// Reconstructs leaderboard, tracks latest score per player
// Complex logic to handle multiple score updates
```

**New (Tables)**:
```typescript
// Read directly from tournament's leaderboard table
const leaderboardTableId = fields.leaderboard?.fields?.id?.id;
const leaderboardFields = await this.client.getDynamicFields({
  parentId: leaderboardTableId,
  limit: limit,
});

// Read each player's score directly
for (const field of leaderboardFields.data) {
  const playerAddress = field.name.value;
  const scoreObj = await this.client.getDynamicFieldObject({
    parentId: leaderboardTableId,
    name: { type: 'address', value: playerAddress },
  });
  const score = scoreObj.data.content.fields.value;
  // Add to leaderboard array
}
```

### Code Already Exists!

The migration service (`tournament-migration.ts`) already has working examples:
- Lines 508-569: Reading participants table
- Lines 571-625: Reading leaderboard table

You can adapt this code for the tournament service.

### Risk Assessment

**Low Risk**:
- Tables are the source of truth on-chain
- Migration service already proves it works
- Can keep events as fallback
- Works for both active and past tournaments

**Testing Plan**:
1. Test with active tournaments
2. Test with past tournaments
3. Test with tournaments that have many participants
4. Test with tournaments that have many score updates
5. Compare results with event-based method

### Timeline

**Quick Win (1-2 hours)**:
- Update `getParticipantCount()` to use tables
- Keep events as fallback
- Test and deploy

**Full Implementation (4-6 hours)**:
- Update both `getParticipantCount()` and `getTournamentLeaderboard()`
- Add comprehensive error handling
- Test thoroughly
- Deploy with feature flag

### Recommendation

**Start with `getParticipantCount()`** - it's simpler and lower risk:
1. Copy the table-reading logic from migration service
2. Replace event-based query
3. Keep events as fallback for error cases
4. Test with a few tournaments
5. Deploy and monitor

Then do `getTournamentLeaderboard()` once participant count is proven.

