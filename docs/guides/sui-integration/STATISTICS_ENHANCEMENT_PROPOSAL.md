# Statistics Registry Enhancement Proposal

## Current State

Currently, `PlayerStats` only tracks:
- `total_games: u64` - Total games played

## Available Per-Game Data (from GameSession)

Each `GameSession` contains:
- `score: u64` - Game score
- `distance: u64` - Distance traveled
- `coins: u64` - Coins collected
- `bosses_defeated: u64` - Bosses defeated
- `enemies_defeated: u64` - Enemies defeated
- `longest_coin_streak: u64` - Longest coin streak in game
- `timestamp: u64` - When game was played

## Proposed Enhanced PlayerStats

### Option A: Comprehensive Statistics (Recommended)

```move
public struct PlayerStats has key, store {
    id: UID,
    player: address,
    
    // Game Count
    total_games: u64,  // Total games played (non-demo only)
    
    // Score Statistics
    total_score: u64,        // Sum of all scores (for average calculation)
    best_score: u64,         // Personal best (highest score)
    
    // Distance Statistics
    total_distance: u64,     // Sum of all distance traveled
    
    // Collection Statistics
    total_coins: u64,        // Total coins collected across all games
    total_bosses_defeated: u64,  // Total bosses defeated
    total_enemies_defeated: u64,  // Total enemies defeated
    
    // Achievement Statistics
    best_coin_streak: u64,   // Best coin streak across all games
    
    // Timestamps
    first_game_date: u64,    // Timestamp of first game
    last_game_date: u64,     // Timestamp of most recent game
}
```

**Benefits:**
- ✅ Comprehensive player profile
- ✅ Supports leaderboards (personal bests)
- ✅ Useful for badge system (could use more than just game count)
- ✅ Analytics and insights
- ✅ Player engagement metrics

**Size Impact:**
- Current: ~77 bytes (id + address + total_games)
- Enhanced: ~120 bytes (adds ~43 bytes)
- Still well within 256KB object limit ✅

### Option B: Minimal Enhancement (Badge-Focused)

```move
public struct PlayerStats has key, store {
    id: UID,
    player: address,
    
    // Game Count (for badge progression)
    total_games: u64,
    
    // Personal Best (for leaderboard/display)
    best_score: u64,
    
    // Timestamps
    first_game_date: u64,
    last_game_date: u64,
}
```

**Benefits:**
- ✅ Minimal size increase
- ✅ Still useful for badge system
- ✅ Personal best for leaderboards
- ✅ First/last game dates for engagement

**Size Impact:**
- Adds ~24 bytes (still very small)

### Option C: Current (Minimal)

Keep as-is - only `total_games`.

**Benefits:**
- ✅ Smallest possible size
- ✅ Sufficient for badge progression

**Drawbacks:**
- ❌ No personal best tracking
- ❌ No engagement metrics
- ❌ Limited analytics

## Recommendation: Option A (Comprehensive)

**Rationale:**
1. **Badge System**: Could use multiple metrics (not just game count)
   - Example: Badge tiers based on total_score, best_score, or total_coins
   - More engaging progression system

2. **Leaderboards**: Personal bests are essential
   - Players want to see their best_score
   - Competitive element

3. **Player Profiles**: Rich statistics enhance engagement
   - Show total_coins collected
   - Show total_bosses_defeated
   - Show best_coin_streak achievement

4. **Analytics**: Better insights into player behavior
   - Average score = total_score / total_games
   - Average distance = total_distance / total_games
   - Engagement = games played over time

5. **Future-Proof**: Room for growth
   - Can add more metrics later
   - Supports future features (achievements, milestones)

6. **Size**: Negligible impact (~43 bytes)
   - Still well within 256KB limit
   - Worth the extra data

## Implementation Considerations

### Update Frequency
- Update all aggregated fields after each game
- Calculate averages on-demand (or cache in backend)

### Gas Costs
- Slightly higher gas per update (more fields to update)
- Still minimal - one-time cost per game

### Backward Compatibility
- Existing PlayerStats objects will need migration
- Or: Create new stats for new players, migrate old ones on first game

### Query Performance
- All fields are in one struct (efficient)
- Can query entire PlayerStats in one call

## Example Use Cases

### Badge Progression (Enhanced)
- **Starter**: 1-5 games OR total_score < 10,000
- **Common**: 6-15 games OR total_score 10,000-50,000
- **Uncommon**: 16-35 games OR total_score 50,000-200,000
- **Rare**: 36-75 games OR total_score 200,000-1,000,000
- **Epic**: 76-149 games OR total_score 1,000,000-5,000,000
- **Legendary**: 150+ games OR total_score 5,000,000+

### Leaderboard Display
```
Player: 0x1234...
Games Played: 50
Best Score: 125,000
Total Coins: 2,500
Total Bosses: 15
Best Streak: 25
```

### Player Profile
```
First Game: Nov 1, 2025
Last Game: Nov 15, 2025
Total Games: 50
Average Score: 45,000
Total Distance: 50,000
```

## Decision Needed

**Question**: Should we enhance PlayerStats with comprehensive statistics?

**Recommendation**: ✅ **Yes - Option A (Comprehensive)**

**Impact**: 
- Small size increase (~43 bytes)
- Significant value for badges, leaderboards, profiles
- Future-proof for new features

---

**Status**: Proposal  
**Date**: November 2025  
**Next Step**: Decision on enhancement level

