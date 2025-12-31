# Statistics Analysis & Proposals

## Currently Tracked Statistics

### On-Chain (PlayerStats)
- ✅ `total_games` - Total games played
- ✅ `best_score` - Highest score in one game
- ✅ `best_distance` - Longest distance in one game
- ✅ `best_coins` - Most coins collected in one game
- ✅ `best_bosses_defeated` - Most bosses defeated in one game
- ✅ `best_enemies_defeated` - Most enemies defeated in one game
- ✅ `best_coin_streak` - Longest coin streak in one game
- ✅ `total_score` - Sum of all scores (for averages)
- ✅ `total_distance` - Sum of all distance (for averages)
- ✅ `total_coins` - Sum of all coins (for averages)
- ✅ `total_bosses_defeated` - Sum of all bosses (for averages)
- ✅ `total_enemies_defeated` - Sum of all enemies (for averages)
- ✅ `total_coin_streak` - Sum of all streaks (for averages)
- ✅ `first_game_date` - Timestamp of first game
- ✅ `last_game_date` - Timestamp of most recent game

### Per-Game Session (GameSession)
- ✅ `score` - Game score
- ✅ `distance` - Distance traveled
- ✅ `coins` - Coins collected
- ✅ `bosses_defeated` - Bosses defeated
- ✅ `enemies_defeated` - Enemies defeated
- ✅ `longest_coin_streak` - Longest coin streak
- ✅ `timestamp` - When game was played

---

## Available Game Data (Not Currently Tracked)

### Time & Duration Metrics
**Available in game but not tracked:**
- ⚠️ **Game duration** - Time from game start to game over
- ⚠️ **Boss fight duration** - Time spent in boss fights
- ⚠️ **Time per boss** - Average time to defeat each boss
- ⚠️ **Survival time** - How long player survived
- ⚠️ **Pause duration** - Total time game was paused
- ⚠️ **Session start time** - When game session started (vs. when submitted)

**Why useful:**
- Player engagement metrics (longer sessions = more engaged)
- Game balancing (boss fight difficulty)
- Performance analysis (time to reach milestones)
- Retention insights (session length correlates with retention)

**Implementation:**
```javascript
// Track in game state
game.sessionStartTime = Date.now();
game.gameDuration = 0; // Updated each frame
game.bossFightDuration = 0; // Accumulated during boss fights
game.pauseDuration = 0; // Accumulated when paused
```

---

### Lives & Death Metrics
**Available in game but not tracked:**
- ⚠️ **Lives lost** - Number of lives lost per game
- ⚠️ **Lives remaining** - Lives remaining at game over
- ⚠️ **Deaths** - Total deaths (lives lost)
- ⚠️ **Death cause** - What killed the player (enemy, boss, etc.)
- ⚠️ **Best survival** - Longest survival without losing a life
- ⚠️ **Average lives per game** - Average lives remaining

**Why useful:**
- Difficulty balancing (if players die too often, game might be too hard)
- Item effectiveness (extra lives usage)
- Player skill progression (fewer deaths over time)
- Achievement tracking (perfect runs, no-death games)

**Implementation:**
```javascript
// Track in game state
game.livesLost = 0;
game.deaths = [];
game.deathCauses = []; // ['enemy', 'boss', 'enemy_projectile', etc.]
game.bestSurvival = 0; // Longest time without losing a life
```

---

### Item Usage Metrics
**Available in game but not tracked:**
- ⚠️ **Items used per game** - Which items were consumed
- ⚠️ **Item effectiveness** - Did item help player survive longer?
- ⚠️ **Item purchase frequency** - How often items are purchased vs. used
- ⚠️ **Item usage rate** - Percentage of games where items are used
- ⚠️ **Most used items** - Which items are most popular

**Why useful:**
- Store optimization (which items to promote)
- Item balancing (are items too powerful/weak?)
- Monetization insights (which items drive purchases)
- Player preferences (what do players value?)

**Implementation:**
```javascript
// Track in game state
game.itemsUsed = {
  extraLives: 0,
  forceField: 0,
  orbLevel: 0,
  slowTime: 0,
  destroyAll: 0,
  bossKillShot: 0,
  coinTractorBeam: 0
};
```

---

### Performance & Skill Metrics
**Available in game but not tracked:**
- ⚠️ **Accuracy** - Projectiles hit vs. missed
- ⚠️ **Enemy kill rate** - Enemies killed per minute
- ⚠️ **Boss kill rate** - Bosses killed per minute
- ⚠️ **Coin collection rate** - Coins collected per minute
- ⚠️ **Score per minute** - Score efficiency
- ⚠️ **Max projectile level reached** - Highest orb level achieved
- ⚠️ **Power-up collection rate** - Power-ups collected per game

**Why useful:**
- Skill progression tracking
- Leaderboard rankings (efficiency metrics)
- Game balancing (are power-ups too rare/common?)
- Player engagement (improving skills over time)

**Implementation:**
```javascript
// Track in game state
game.projectilesFired = 0;
game.projectilesHit = 0;
game.maxProjectileLevel = 1;
game.powerUpsCollected = 0;
game.enemyKillRate = 0; // enemies / time
game.coinCollectionRate = 0; // coins / time
```

---

### Boss-Specific Metrics
**Available in game but not tracked:**
- ⚠️ **Boss tier distribution** - Which boss tiers were defeated
- ⚠️ **Boss defeat time** - Time to defeat each boss
- ⚠️ **Boss hits taken** - Damage taken from bosses
- ⚠️ **Boss damage dealt** - Total damage dealt to bosses
- ⚠️ **Boss kill efficiency** - Bosses defeated per minute
- ⚠️ **Highest boss tier reached** - Furthest boss tier

**Why useful:**
- Boss difficulty balancing
- Achievement tracking (defeat all boss tiers)
- Player progression (reaching higher tiers)
- Leaderboard rankings (boss tier achievements)

**Implementation:**
```javascript
// Track in game state
game.bossDefeatTimes = []; // Time to defeat each boss
game.bossHitsTaken = 0;
game.bossDamageDealt = 0;
game.highestBossTier = 1;
```

---

### Force Field Metrics
**Available in game but not tracked:**
- ⚠️ **Force field activations** - Number of times force field activated
- ⚠️ **Force field duration** - Total time force field was active
- ⚠️ **Force field saves** - Lives saved by force field
- ⚠️ **Coin streak breaks** - Number of times streak was broken
- ⚠️ **Average streak length** - Average coin streak per game
- ⚠️ **Max force field level** - Highest force field level reached

**Why useful:**
- Force field effectiveness analysis
- Coin collection behavior
- Item balancing (is force field too powerful/weak?)
- Achievement tracking (maintain long streaks)

**Implementation:**
```javascript
// Track in game state
game.forceFieldActivations = 0;
game.forceFieldDuration = 0;
game.forceFieldSaves = 0;
game.streakBreaks = 0;
game.averageStreakLength = 0;
game.maxForceFieldLevel = 0;
```

---

### Engagement & Behavior Metrics
**Available in game but not tracked:**
- ⚠️ **Games per day/week** - Play frequency
- ⚠️ **Session frequency** - How often player plays
- ⚠️ **Play streak** - Consecutive days played
- ⚠️ **Average session length** - Average game duration
- ⚠️ **Quit rate** - Percentage of games quit early
- ⚠️ **Return rate** - Percentage of players who return
- ⚠️ **Peak play times** - When players play most

**Why useful:**
- Retention analysis
- Engagement optimization
- Marketing insights (when to send notifications)
- Player segmentation (casual vs. hardcore)

**Implementation:**
```javascript
// Track in backend/database
playerEngagement = {
  gamesPerDay: [],
  lastPlayDate: null,
  playStreak: 0,
  averageSessionLength: 0,
  quitRate: 0,
  returnRate: 0,
  peakPlayTimes: []
};
```

---

### Economic Metrics
**Available in game but not tracked:**
- ⚠️ **Credits purchased** - Total credits bought
- ⚠️ **Credits consumed** - Total credits used
- ⚠️ **Items purchased** - Total items bought
- ⚠️ **Items consumed** - Total items used
- ⚠️ **Revenue per player** - Total revenue from player
- ⚠️ **Average spend per game** - Average money spent per game session
- ⚠️ **Purchase frequency** - How often player purchases

**Why useful:**
- Monetization optimization
- Player lifetime value (LTV)
- Purchase behavior analysis
- Revenue forecasting

**Implementation:**
```javascript
// Track in backend/database
playerEconomics = {
  creditsPurchased: 0,
  creditsConsumed: 0,
  itemsPurchased: {},
  itemsConsumed: {},
  totalRevenue: 0,
  averageSpendPerGame: 0,
  purchaseFrequency: 0
};
```

---

## Proposed Statistics to Add

### High Priority (High Value, Easy to Implement)

#### 1. Game Duration
**Value:** ⭐⭐⭐⭐⭐ (Very High)
**Difficulty:** ⭐ (Easy)
**Use Cases:**
- Player engagement metrics
- Session length analysis
- Retention insights

**Implementation:**
```move
// Add to GameSession
duration_ms: u64,  // Game duration in milliseconds

// Add to PlayerStats
best_duration: u64,        // Longest game session
total_duration: u64,       // Sum of all game durations (for average)
```

#### 2. Lives Lost
**Value:** ⭐⭐⭐⭐ (High)
**Difficulty:** ⭐ (Easy)
**Use Cases:**
- Difficulty balancing
- Item effectiveness
- Achievement tracking

**Implementation:**
```move
// Add to GameSession
lives_lost: u64,  // Number of lives lost

// Add to PlayerStats
best_survival: u64,        // Best survival (0 lives lost)
total_lives_lost: u64,     // Sum of all lives lost (for average)
```

#### 3. Max Projectile Level
**Value:** ⭐⭐⭐ (Medium)
**Difficulty:** ⭐ (Easy)
**Use Cases:**
- Player progression tracking
- Achievement tracking
- Game balancing

**Implementation:**
```move
// Add to GameSession
max_projectile_level: u64,  // Highest orb level reached (1-6)

// Add to PlayerStats
best_projectile_level: u64,  // Highest orb level ever reached
```

#### 4. Items Used
**Value:** ⭐⭐⭐⭐ (High)
**Difficulty:** ⭐⭐ (Medium)
**Use Cases:**
- Store optimization
- Item balancing
- Monetization insights

**Implementation:**
```move
// Add to GameSession
items_used: vector<u8>,  // Bitmask or array of items used
// 0=extraLives, 1=forceField, 2=orbLevel, 3=slowTime, 
// 4=destroyAll, 5=bossKillShot, 6=coinTractorBeam

// Add to PlayerStats
total_items_used: u64,  // Total items used across all games
items_used_breakdown: vector<u64>,  // Count per item type
```

---

### Medium Priority (Good Value, Moderate Implementation)

#### 5. Boss Fight Duration
**Value:** ⭐⭐⭐ (Medium)
**Difficulty:** ⭐⭐ (Medium)
**Use Cases:**
- Boss difficulty balancing
- Performance analysis
- Achievement tracking

**Implementation:**
```move
// Add to GameSession
boss_fight_duration_ms: u64,  // Total time in boss fights
boss_defeat_times: vector<u64>,  // Time to defeat each boss

// Add to PlayerStats
best_boss_fight_duration: u64,  // Fastest boss fight
total_boss_fight_duration: u64,  // Sum for average
```

#### 6. Force Field Metrics
**Value:** ⭐⭐⭐ (Medium)
**Difficulty:** ⭐⭐ (Medium)
**Use Cases:**
- Force field effectiveness
- Coin collection behavior
- Item balancing

**Implementation:**
```move
// Add to GameSession
force_field_activations: u64,  // Number of times activated
force_field_duration_ms: u64,  // Total time active
streak_breaks: u64,  // Number of times streak was broken

// Add to PlayerStats
total_force_field_activations: u64,
total_force_field_duration: u64,
total_streak_breaks: u64,
```

#### 7. Performance Metrics
**Value:** ⭐⭐⭐ (Medium)
**Difficulty:** ⭐⭐⭐ (Hard)
**Use Cases:**
- Skill progression
- Leaderboard rankings
- Game balancing

**Implementation:**
```move
// Add to GameSession
projectiles_fired: u64,
projectiles_hit: u64,  // Could calculate accuracy
enemy_kill_rate: u64,  // Enemies per minute
coin_collection_rate: u64,  // Coins per minute

// Add to PlayerStats
best_accuracy: u64,  // Best accuracy percentage
best_enemy_kill_rate: u64,
best_coin_collection_rate: u64,
```

---

### Low Priority (Nice to Have, Complex Implementation)

#### 8. Death Causes
**Value:** ⭐⭐ (Low)
**Difficulty:** ⭐⭐⭐ (Hard)
**Use Cases:**
- Difficulty balancing
- Enemy/boss effectiveness analysis

**Implementation:**
```move
// Add to GameSession
death_causes: vector<u8>,  // Array of death causes
// 0=enemy, 1=boss, 2=enemy_projectile, 3=boss_projectile, etc.

// Add to PlayerStats
death_cause_breakdown: vector<u64>,  // Count per cause type
```

#### 9. Engagement Metrics
**Value:** ⭐⭐⭐ (Medium)
**Difficulty:** ⭐⭐⭐⭐ (Very Hard - requires backend tracking)
**Use Cases:**
- Retention analysis
- Engagement optimization
- Marketing insights

**Implementation:**
```move
// Backend/database tracking (not on-chain)
// Games per day, play streak, return rate, etc.
```

#### 10. Economic Metrics
**Value:** ⭐⭐⭐⭐ (High)
**Difficulty:** ⭐⭐⭐ (Hard - requires integration with store/payment systems)
**Use Cases:**
- Monetization optimization
- Player lifetime value
- Revenue forecasting

**Implementation:**
```move
// Backend/database tracking (not on-chain)
// Credits purchased, items purchased, revenue, etc.
```

---

## Recommended Implementation Plan

### Phase 1: High Priority Stats (Easy Wins)
1. **Game Duration** - Add `duration_ms` to GameSession
2. **Lives Lost** - Add `lives_lost` to GameSession
3. **Max Projectile Level** - Add `max_projectile_level` to GameSession
4. **Items Used** - Add `items_used` to GameSession

**Benefits:**
- Quick to implement
- High value for analytics
- Supports achievement system
- Helps with game balancing

### Phase 2: Medium Priority Stats
1. **Boss Fight Duration** - Add boss timing metrics
2. **Force Field Metrics** - Add force field tracking
3. **Performance Metrics** - Add accuracy/kill rate tracking

**Benefits:**
- Better game balancing insights
- More detailed player profiles
- Enhanced leaderboard metrics

### Phase 3: Advanced Analytics (Backend)
1. **Engagement Metrics** - Daily/weekly play patterns
2. **Economic Metrics** - Purchase behavior
3. **Behavioral Analytics** - Player segmentation

**Benefits:**
- Retention optimization
- Monetization insights
- Marketing optimization

---

## Storage Considerations

### On-Chain vs. Off-Chain

**On-Chain (Smart Contract):**
- ✅ Immutable and verifiable
- ✅ Transparent
- ✅ No single point of failure
- ❌ Higher gas costs
- ❌ Limited query capabilities

**Off-Chain (Backend Database):**
- ✅ Fast queries
- ✅ Complex analytics
- ✅ Lower costs
- ❌ Requires trust
- ❌ Single point of failure

**Hybrid Approach (Recommended):**
- **On-Chain:** Core gameplay stats (score, distance, coins, etc.)
- **Off-Chain:** Detailed analytics (engagement, economics, behavior)

---

## Questions for Discussion

1. **Which statistics are most valuable for your use case?**
   - Game balancing?
   - Player engagement?
   - Monetization optimization?
   - Achievement tracking?

2. **Storage strategy:**
   - On-chain only?
   - Off-chain only?
   - Hybrid approach?

3. **Priority:**
   - Which stats should be implemented first?
   - Which stats can wait?

4. **Privacy:**
   - Should all stats be public?
   - Should some stats be private (player-only)?

5. **Analytics:**
   - Do you need real-time analytics?
   - Or is batch processing sufficient?

---

## Next Steps

1. **Review this document** - Identify which stats are most valuable
2. **Prioritize** - Decide which stats to implement first
3. **Design** - Create detailed implementation plan for selected stats
4. **Implement** - Start with Phase 1 (high priority, easy wins)
5. **Iterate** - Add more stats based on needs and feedback

