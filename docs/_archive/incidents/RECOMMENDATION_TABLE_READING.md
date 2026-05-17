# Recommendation: Switch to Direct Table Reading

## Recommendation: **Switch to Reading from Tables**

### Why Switch?

1. **✅ Better Performance**
   - Only query one tournament's data, not all events
   - Faster queries, especially as tournaments grow
   - Works better with the new two-table structure

2. **✅ More Reliable**
   - No 1000 event limit issues
   - Tables are the source of truth on-chain
   - Can paginate if needed

3. **✅ Simpler Logic**
   - Direct access to current state
   - No need to reconstruct from event history
   - No need to track "latest" score per player

4. **✅ Works for Past Tournaments**
   - Tables are permanent in Tournament objects
   - Same code works for active and past tournaments
   - No difference in query logic

### Implementation Plan

#### Phase 1: Update getParticipantCount() (Low Risk)
- Replace event-based query with direct table read
- Keep event-based as fallback for error handling
- Test with both active and past tournaments

#### Phase 2: Update getTournamentLeaderboard() (Medium Risk)
- Replace event-based reconstruction with direct table read
- Keep event-based as fallback
- Test thoroughly with tournaments that have many players

#### Phase 3: Remove Event-Based Code (Optional)
- Once table reading is proven reliable
- Keep events for historical/audit purposes if needed
- Or remove entirely to simplify codebase

### Migration Strategy

1. **Add new table-reading methods** alongside existing event-based methods
2. **Feature flag** to switch between methods (for testing)
3. **Gradual rollout** - test with a few tournaments first
4. **Monitor** for any issues
5. **Switch fully** once proven stable

### Benefits for Your Use Case

Given you expect:
- **1000s of historical tournaments**
- **<100 active tournaments**
- **Query performance important for active tournaments**

**Table reading is perfect because:**
- Active tournaments: Fast queries (only query that tournament's table)
- Past tournaments: Same fast queries (tables are permanent)
- No event limit issues as tournaments grow
- Scales better with thousands of tournaments

