# Item Consumption Tracking & Statistics Plan

## Overview

Track which items are consumed during gameplay and gather statistics about item usage, effectiveness, and player behavior.

---

## Item Consumption Tracking

### Items Available for Consumption

1. **Extra Lives** (Levels 1-3)
2. **Force Field** (Levels 1-3)
3. **Orb Level** (Levels 1-3)
4. **Slow Time** (Levels 1-3)
5. **Destroy All** (Single level)
6. **Boss Kill Shot** (Single level)
7. **Coin Tractor Beam** (Levels 1-3)

### What to Track Per Item

#### Basic Consumption Data
- **Item Type** - Which item was used
- **Item Level** - Level of item used (1-3, or single level)
- **Game Session** - Which game session it was used in
- **Timestamp** - When item was consumed
- **Player Address** - Who used it

#### Effectiveness Metrics
- **Survival Impact** - Did player survive longer after using item?
- **Score Impact** - Did score increase after using item?
- **Boss Impact** - Did item help defeat a boss?
- **Lives Saved** - Did item prevent a death?
- **Time Active** - How long was item active (for timed items)?

#### Usage Context
- **When Used** - Early game, mid game, late game, boss fight
- **Why Used** - Player choice, emergency, strategic
- **Game State** - Lives remaining, score, distance, tier when used
- **Outcome** - Game result (won, lost, score achieved)

---

## Data Structure Design

### On-Chain: Item Consumption Event

```move
module suitwo_game::item_consumption {
    use sui::event;
    use sui::tx_context::{Self, TxContext};
    use sui::clock::{Self, Clock};
    
    // Item type constants
    const ITEM_EXTRA_LIVES: u8 = 0;
    const ITEM_FORCE_FIELD: u8 = 1;
    const ITEM_ORB_LEVEL: u8 = 2;
    const ITEM_SLOW_TIME: u8 = 3;
    const ITEM_DESTROY_ALL: u8 = 4;
    const ITEM_BOSS_KILL_SHOT: u8 = 5;
    const ITEM_COIN_TRACTOR_BEAM: u8 = 6;
    
    /// Event emitted when item is consumed
    struct ItemConsumed has copy, drop {
        player: address,
        item_type: u8,           // 0-6 (item type)
        item_level: u8,          // 1-3 (or 0 for single-level items)
        session_id: vector<u8>,   // Game session ID
        timestamp: u64,
        
        // Context when item was used
        game_score: u64,          // Score when item was used
        game_distance: u64,       // Distance when item was used
        lives_remaining: u64,     // Lives remaining when used
        current_tier: u8,         // Current tier when used
        bosses_defeated: u64,     // Bosses defeated when used
        
        // Outcome (filled after game ends)
        final_score: u64,         // Final score after game ended
        final_distance: u64,      // Final distance after game ended
        survived: bool,           // Did player survive longer after using item?
        boss_defeated_after: bool, // Did player defeat a boss after using item?
    }
}
```

### Backend: Item Consumption Statistics

```typescript
interface ItemConsumptionStats {
  // Per-item statistics
  itemsUsed: {
    [itemType: string]: {
      totalUsed: number;
      totalPurchased: number;
      usageRate: number;  // used / purchased
      averageLevel: number;
      effectiveness: {
        survivalRate: number;  // % of times player survived longer
        scoreIncrease: number;  // Average score increase
        bossDefeatRate: number; // % of times boss was defeated after use
        livesSaved: number;     // Total lives saved
      };
    };
  };
  
  // Per-game statistics
  gamesWithItems: number;  // Games where items were used
  gamesWithoutItems: number;  // Games where no items were used
  averageItemsPerGame: number;
  
  // Usage patterns
  usageByGamePhase: {
    early: number;  // First 25% of game
    mid: number;    // 25-75% of game
    late: number;   // Last 25% of game
    boss: number;   // During boss fight
  };
  
  // Most effective items
  mostEffectiveItems: Array<{
    itemType: string;
    effectiveness: number;
    usageCount: number;
  }>;
}
```

---

## Implementation Plan

### Phase 1: Basic Consumption Tracking

#### 1.1 Track Item Consumption in Game State

```javascript
// In game-state.js
class GameState {
  constructor() {
    // ... existing code ...
    
    // Item consumption tracking
    this.itemsConsumed = [];  // Array of consumed items
    this.itemConsumptionStats = {
      extraLives: { used: 0, level1: 0, level2: 0, level3: 0 },
      forceField: { used: 0, level1: 0, level2: 0, level3: 0 },
      orbLevel: { used: 0, level1: 0, level2: 0, level3: 0 },
      slowTime: { used: 0, level1: 0, level2: 0, level3: 0 },
      destroyAll: { used: 0 },
      bossKillShot: { used: 0 },
      coinTractorBeam: { used: 0, level1: 0, level2: 0, level3: 0 }
    };
  }
  
  /**
   * Record item consumption
   */
  recordItemConsumption(itemType, itemLevel, context) {
    const consumption = {
      itemType,
      itemLevel,
      timestamp: Date.now(),
      gameScore: this.score,
      gameDistance: this.distance,
      livesRemaining: this.lives,
      currentTier: this.currentTier,
      bossesDefeated: this.bossesDefeated,
      sessionId: this.sessionId
    };
    
    this.itemsConsumed.push(consumption);
    
    // Update stats
    if (this.itemConsumptionStats[itemType]) {
      this.itemConsumptionStats[itemType].used++;
      if (itemLevel) {
        this.itemConsumptionStats[itemType][`level${itemLevel}`]++;
      }
    }
    
    return consumption;
  }
  
  /**
   * Finalize item consumption stats (called at game over)
   */
  finalizeItemConsumption(finalScore, finalDistance, survived) {
    // Update all consumed items with final outcomes
    this.itemsConsumed.forEach(consumption => {
      consumption.finalScore = finalScore;
      consumption.finalDistance = finalDistance;
      consumption.survived = survived;
      consumption.scoreIncrease = finalScore - consumption.gameScore;
      consumption.distanceIncrease = finalDistance - consumption.gameDistance;
    });
    
    return this.itemsConsumed;
  }
}
```

#### 1.2 Track Item Consumption in Item Systems

```javascript
// In item-consumption.js or individual item files

// Example: Extra Lives consumption
function consumeExtraLives(level) {
  const game = window.gameState || window.game;
  
  // Record consumption
  const consumption = game.recordItemConsumption('extraLives', level, {
    livesBefore: game.lives,
    livesAfter: game.lives + level
  });
  
  // Apply item effect
  game.lives += level;
  game.maxLives += level;
  
  // Emit event for backend tracking
  if (typeof window.trackItemConsumption === 'function') {
    window.trackItemConsumption(consumption);
  }
}

// Example: Force Field consumption
function consumeForceField(level) {
  const game = window.gameState || window.game;
  
  // Record consumption
  const consumption = game.recordItemConsumption('forceField', level, {
    coinStreak: game.forceField.coinStreak,
    maxStreak: game.forceField.maxStreak
  });
  
  // Apply item effect
  game.forceField.level = level;
  
  // Emit event
  if (typeof window.trackItemConsumption === 'function') {
    window.trackItemConsumption(consumption);
  }
}
```

#### 1.3 Submit Item Consumption to Backend

```javascript
// In game-over handler or score submission

async function submitItemConsumption(gameSession) {
  const itemsConsumed = gameSession.itemsConsumed;
  
  if (itemsConsumed.length === 0) {
    return;  // No items consumed
  }
  
  // Finalize consumption stats
  const finalized = gameSession.finalizeItemConsumption(
    gameSession.score,
    gameSession.distance,
    gameSession.lives > 0  // Survived if lives remaining
  );
  
  // Submit to backend
  try {
    const response = await fetch('/api/items/consumption', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerAddress: getWalletAddress(),
        sessionId: gameSession.sessionId,
        itemsConsumed: finalized,
        gameResult: {
          score: gameSession.score,
          distance: gameSession.distance,
          survived: gameSession.lives > 0,
          bossesDefeated: gameSession.bossesDefeated
        }
      })
    });
    
    if (response.ok) {
      console.log('✅ Item consumption tracked');
    }
  } catch (error) {
    console.error('❌ Failed to track item consumption:', error);
  }
}
```

### Phase 2: Backend Tracking & Analytics

#### 2.1 Backend API Endpoint

```typescript
// routes/items.ts

// POST /api/items/consumption
router.post('/consumption', async (req, res) => {
  const { playerAddress, sessionId, itemsConsumed, gameResult } = req.body;
  
  // Store item consumption events
  for (const item of itemsConsumed) {
    await db.itemConsumption.create({
      playerAddress,
      sessionId,
      itemType: item.itemType,
      itemLevel: item.itemLevel,
      timestamp: item.timestamp,
      gameScore: item.gameScore,
      gameDistance: item.gameDistance,
      livesRemaining: item.livesRemaining,
      currentTier: item.currentTier,
      bossesDefeated: item.bossesDefeated,
      finalScore: item.finalScore,
      finalDistance: item.finalDistance,
      survived: item.survived,
      scoreIncrease: item.scoreIncrease,
      distanceIncrease: item.distanceIncrease
    });
  }
  
  // Update player item consumption statistics
  await updatePlayerItemStats(playerAddress, itemsConsumed, gameResult);
  
  res.json({ success: true });
});

// GET /api/items/stats/:address
router.get('/stats/:address', async (req, res) => {
  const { address } = req.params;
  const stats = await getPlayerItemStats(address);
  res.json(stats);
});
```

#### 2.2 Statistics Calculation

```typescript
// services/item-stats-service.ts

async function calculateItemStats(playerAddress: string): Promise<ItemConsumptionStats> {
  // Get all item consumptions for player
  const consumptions = await db.itemConsumption.findAll({
    where: { playerAddress }
  });
  
  // Calculate per-item statistics
  const itemsUsed = {};
  const itemTypes = ['extraLives', 'forceField', 'orbLevel', 'slowTime', 
                     'destroyAll', 'bossKillShot', 'coinTractorBeam'];
  
  for (const itemType of itemTypes) {
    const itemConsumptions = consumptions.filter(c => c.itemType === itemType);
    
    itemsUsed[itemType] = {
      totalUsed: itemConsumptions.length,
      totalPurchased: await getTotalPurchased(playerAddress, itemType),
      usageRate: itemConsumptions.length / (await getTotalPurchased(playerAddress, itemType) || 1),
      averageLevel: calculateAverageLevel(itemConsumptions),
      effectiveness: {
        survivalRate: calculateSurvivalRate(itemConsumptions),
        scoreIncrease: calculateAverageScoreIncrease(itemConsumptions),
        bossDefeatRate: calculateBossDefeatRate(itemConsumptions),
        livesSaved: calculateLivesSaved(itemConsumptions)
      }
    };
  }
  
  // Calculate usage patterns
  const usageByGamePhase = calculateUsageByPhase(consumptions);
  
  // Calculate most effective items
  const mostEffectiveItems = calculateMostEffectiveItems(itemsUsed);
  
  return {
    itemsUsed,
    gamesWithItems: await countGamesWithItems(playerAddress),
    gamesWithoutItems: await countGamesWithoutItems(playerAddress),
    averageItemsPerGame: consumptions.length / await getTotalGames(playerAddress),
    usageByGamePhase,
    mostEffectiveItems
  };
}
```

### Phase 3: On-Chain Events (Optional)

#### 3.1 Emit Item Consumption Events

```move
// In item_consumption.move or score_submission.move

/// Emit item consumption event (called by backend after game ends)
public entry fun emit_item_consumption_event(
    player: address,
    item_type: u8,
    item_level: u8,
    session_id: vector<u8>,
    game_score: u64,
    game_distance: u64,
    lives_remaining: u64,
    current_tier: u8,
    bosses_defeated: u64,
    final_score: u64,
    final_distance: u64,
    survived: bool,
    clock: &Clock,
    ctx: &mut TxContext
) {
    event::emit(ItemConsumed {
        player,
        item_type,
        item_level,
        session_id,
        timestamp: clock::timestamp_ms(clock),
        game_score,
        game_distance,
        lives_remaining,
        current_tier,
        bosses_defeated,
        final_score,
        final_distance,
        survived,
        boss_defeated_after: false,  // Calculate from game result
    });
}
```

---

## Statistics to Track Per Item

### Extra Lives
- **Usage Count** - How many times used
- **Lives Saved** - Did it prevent a game over?
- **Survival Rate** - % of times player survived after using
- **Best Usage** - Highest score/distance achieved after using
- **Average Score Increase** - Score gained after using

### Force Field
- **Usage Count** - How many times used
- **Activations** - How many times force field activated
- **Lives Saved** - Times force field prevented death
- **Coin Streak Impact** - Did it help maintain longer streaks?
- **Average Streak Length** - Average streak when used

### Orb Level
- **Usage Count** - How many times used
- **Level Reached** - Highest level achieved
- **Enemy Kill Rate** - Enemies killed after using
- **Boss Damage** - Damage dealt to bosses after using
- **Score Impact** - Score increase after using

### Slow Time
- **Usage Count** - How many times used
- **Duration** - How long was it active?
- **Enemies Avoided** - Enemies avoided while active
- **Boss Impact** - Did it help defeat a boss?
- **Survival Rate** - % of times player survived after using

### Destroy All
- **Usage Count** - How many times used
- **Enemies Destroyed** - Total enemies destroyed
- **Score Gained** - Score from destroyed enemies
- **Boss Impact** - Used during boss fight?
- **Emergency Usage** - Used when low on lives?

### Boss Kill Shot
- **Usage Count** - How many times used
- **Bosses Defeated** - Bosses defeated with it
- **Boss Tiers** - Which boss tiers were defeated
- **Time Saved** - Time saved vs. normal boss fight
- **Success Rate** - % of times boss was defeated

### Coin Tractor Beam
- **Usage Count** - How many times used
- **Coins Collected** - Coins collected while active
- **Coin Streak Impact** - Did it help maintain streaks?
- **Score Impact** - Score increase from collected coins
- **Duration** - How long was it active?

---

## Use Cases

### 1. Store Optimization
- **Which items are most popular?** → Promote those items
- **Which items are least used?** → Adjust pricing or remove
- **What's the usage rate?** → Are players buying but not using?

### 2. Item Balancing
- **Are items too powerful?** → Check survival rates
- **Are items too weak?** → Check effectiveness metrics
- **Do items need rebalancing?** → Compare effectiveness across items

### 3. Player Insights
- **What items do players prefer?** → Personalize store
- **When do players use items?** → Understand usage patterns
- **Do items help players progress?** → Measure impact

### 4. Monetization
- **Which items drive purchases?** → Focus marketing
- **What's the ROI on items?** → Value proposition
- **Do players get value from items?** → Retention impact

---

## Implementation Timeline

### Week 1: Basic Tracking
- Add item consumption tracking to game state
- Record consumption in item systems
- Submit to backend

### Week 2: Backend Analytics
- Create database schema
- Build statistics calculation
- Create API endpoints

### Week 3: On-Chain Events (Optional)
- Add item consumption events to contract
- Emit events from backend
- Query events for analytics

### Week 4: UI & Reporting
- Create item statistics dashboard
- Show player item usage stats
- Admin analytics dashboard

---

## Database Schema

```sql
CREATE TABLE item_consumptions (
  id SERIAL PRIMARY KEY,
  player_address VARCHAR(66) NOT NULL,
  session_id VARCHAR(255) NOT NULL,
  item_type VARCHAR(50) NOT NULL,
  item_level INT,
  timestamp BIGINT NOT NULL,
  
  -- Context when used
  game_score BIGINT,
  game_distance BIGINT,
  lives_remaining INT,
  current_tier INT,
  bosses_defeated INT,
  
  -- Outcome
  final_score BIGINT,
  final_distance BIGINT,
  survived BOOLEAN,
  score_increase BIGINT,
  distance_increase BIGINT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_item_consumptions_player ON item_consumptions(player_address);
CREATE INDEX idx_item_consumptions_item_type ON item_consumptions(item_type);
CREATE INDEX idx_item_consumptions_timestamp ON item_consumptions(timestamp);
```

---

## Next Steps

1. **Review this plan** - Confirm which stats are most valuable
2. **Prioritize** - Decide which items to track first
3. **Implement Phase 1** - Basic consumption tracking
4. **Test** - Verify tracking works correctly
5. **Iterate** - Add more detailed stats based on needs

