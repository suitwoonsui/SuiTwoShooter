# Monetization Systems Statistics Tracking Plan

## Overview

This document outlines comprehensive statistics tracking for all monetization systems. Each system has on-chain events that provide the foundation for statistics, and backend services can query these events to build analytics.

---

## 1. Game Pass & Paywall Statistics

### What to Track

#### Purchase Statistics
- **Total Purchases** - Number of credit pack purchases
- **Purchase Distribution** - Purchases by pack type (Starter, Regular, Value, Mega)
- **Pay-Per-Game Purchases** - Number of single-game purchases
- **Revenue by Pack Type** - Revenue per pack type
- **Average Purchase Value** - Average amount per purchase
- **Purchase Frequency** - How often players purchase

#### Credit Consumption Statistics
- **Total Credits Consumed** - Total credits used across all players
- **Credits Consumed Per Player** - Average credits consumed per player
- **Consumption Rate** - Credits consumed per day/week/month
- **Paywall Encounters** - Number of times players hit paywall
- **Paywall Conversion Rate** - % of players who purchase after hitting paywall
- **Time to Purchase** - Time between paywall and purchase

#### Payment Statistics
- **Payment Method Distribution** - SUI vs. $MEWS vs. USDC
- **Badge Discount Usage** - How often discounts are applied
- **Average Discount** - Average discount percentage
- **Revenue by Payment Method** - Revenue per payment type

#### Player Behavior
- **First Purchase Timing** - When players make first purchase
- **Repeat Purchase Rate** - % of players who purchase multiple times
- **Purchase Patterns** - Preferred pack sizes
- **Churn After Purchase** - Do players continue playing after purchase?

### Data Sources

**On-Chain Events:**
- `PassPurchased` - When credit pack is purchased
- `GamePlayed` - When credit is consumed
- `AdditionalGamesPurchased` - When adding games to existing pass

**Event Data Available:**
```move
struct PassPurchased {
    buyer: address,
    pack_type: u8,
    games_included: u64,
    price_paid: u64,
    timestamp: u64,
}

struct GamePlayed {
    player: address,
    games_remaining: u64,
    timestamp: u64,
}
```

### Statistics Service

```typescript
interface GamePassStatistics {
  // Purchase stats
  totalPurchases: number;
  purchasesByPackType: {
    starter: number;
    regular: number;
    value: number;
    mega: number;
    payPerGame: number;
  };
  revenueByPackType: {
    starter: number;
    regular: number;
    value: number;
    mega: number;
    payPerGame: number;
  };
  averagePurchaseValue: number;
  
  // Consumption stats
  totalCreditsConsumed: number;
  averageCreditsPerPlayer: number;
  consumptionRate: {
    perDay: number;
    perWeek: number;
    perMonth: number;
  };
  
  // Paywall stats
  paywallEncounters: number;
  paywallConversions: number;
  paywallConversionRate: number;
  averageTimeToPurchase: number; // seconds
  
  // Payment stats
  paymentMethodDistribution: {
    sui: number;
    mews: number;
    usdc: number;
  };
  badgeDiscountUsage: {
    totalDiscounts: number;
    averageDiscount: number;
    discountByTier: { [tier: number]: number };
  };
  
  // Player behavior
  firstPurchaseTiming: {
    averageTimeFromFirstGame: number; // seconds
    distribution: Array<{ timeRange: string; count: number }>;
  };
  repeatPurchaseRate: number;
  purchasePatterns: {
    preferredPackSize: string;
    averagePacksPerPlayer: number;
  };
}
```

---

## 2. Tournament Statistics

### What to Track

#### Tournament Participation
- **Total Tournaments** - Number of tournaments created
- **Total Entries** - Number of tournament entries
- **Active Tournaments** - Currently active tournaments
- **Participation Rate** - % of players who enter tournaments
- **Average Entries Per Tournament** - Average participants per tournament

#### Revenue Statistics
- **Total Entry Fees Collected** - Total revenue from entry fees
- **Average Entry Fee** - Average fee per entry
- **Revenue Per Tournament** - Revenue per tournament
- **Prize Pool Distribution** - How prize pools are distributed

#### Player Behavior
- **Tournament Entry Frequency** - How often players enter tournaments
- **Multiple Tournament Participation** - Players in multiple tournaments
- **Category Preferences** - Which categories are most popular
- **Entry Timing** - When players enter tournaments (early vs. late)

#### Performance Statistics
- **Average Scores** - Average scores per category
- **Score Distribution** - Score ranges per category
- **Winner Distribution** - How often same players win
- **Tie Frequency** - How often ties occur

### Data Sources

**On-Chain Events:**
- `TournamentCreated` - When tournament is created
- `TournamentEntered` - When player enters tournament
- `TournamentScoreUpdated` - When score is updated
- `TournamentEnded` - When tournament ends
- `TournamentTicketRefunded` - When ticket is refunded

**Event Data Available:**
```move
struct TournamentEntered {
    tournament_id: u64,
    player: address,
    category: u8,
    timestamp: u64,
}

struct TournamentEnded {
    tournament_id: u64,
    category: u8,
    winners: vector<address>,
    prize_pool: u64,
    timestamp: u64,
}
```

### Statistics Service

```typescript
interface TournamentStatistics {
  // Participation
  totalTournaments: number;
  totalEntries: number;
  activeTournaments: number;
  participationRate: number;
  averageEntriesPerTournament: number;
  
  // Revenue
  totalEntryFees: number;
  averageEntryFee: number;
  revenuePerTournament: number;
  prizePoolDistribution: {
    playerRewards: number;  // 50%
    tokenBurn: number;      // 25%
    operations: number;     // 25%
  };
  
  // Player behavior
  entryFrequency: {
    averageEntriesPerPlayer: number;
    playersInMultipleTournaments: number;
  };
  categoryPreferences: {
    [category: string]: number;
  };
  entryTiming: {
    early: number;  // First 25% of tournament
    mid: number;    // 25-75%
    late: number;   // Last 25%
  };
  
  // Performance
  averageScores: {
    [category: string]: number;
  };
  scoreDistribution: {
    [category: string]: Array<{ range: string; count: number }>;
  };
  winnerDistribution: {
    uniqueWinners: number;
    repeatWinners: number;
  };
}
```

---

## 3. Achievement Rewards Statistics

### What to Track

#### Achievement Completion
- **Total Achievements Claimed** - Total rewards claimed
- **Achievements by Category** - Claims per category
- **Completion Rate** - % of players who claim achievements
- **Average Achievements Per Player** - Average claims per player
- **Time to Achievement** - Time to reach milestones

#### Reward Distribution
- **Total Credits Distributed** - Total credits given as rewards
- **Total Items Distributed** - Total items given as rewards
- **Rewards by Category** - Rewards per achievement category
- **Rewards by Tier** - Rewards per milestone tier
- **Average Reward Value** - Average value per reward

#### Player Progression
- **Achievement Unlock Rate** - How fast players unlock achievements
- **Category Completion** - Which categories are completed most
- **Elite Achievements** - How many players reach elite milestones
- **Achievement Streaks** - Consecutive achievement unlocks

### Data Sources

**On-Chain Events:**
- `AchievementClaimed` - When achievement is claimed
- `FreeCreditsAdded` - When credits are added as reward

**Event Data Available:**
```move
struct AchievementClaimed {
    player: address,
    category: u8,
    milestone: u64,
    credits_awarded: u64,
    items_awarded: vector<u8>,
    timestamp: u64,
}
```

### Statistics Service

```typescript
interface AchievementStatistics {
  // Completion
  totalAchievementsClaimed: number;
  achievementsByCategory: {
    gamesPlayed: number;
    bossesDefeated: number;
    score: number;
    distance: number;
    coins: number;
    enemies: number;
    streak: number;
    leaderboard: number;
  };
  completionRate: number;
  averageAchievementsPerPlayer: number;
  timeToAchievement: {
    [category: string]: number; // average seconds
  };
  
  // Rewards
  totalCreditsDistributed: number;
  totalItemsDistributed: {
    [itemType: string]: number;
  };
  rewardsByCategory: {
    [category: string]: {
      credits: number;
      items: number;
    };
  };
  rewardsByTier: {
    [tier: string]: {
      credits: number;
      items: number;
    };
  };
  averageRewardValue: number;
  
  // Progression
  achievementUnlockRate: {
    averageTimeBetweenAchievements: number;
    fastestUnlock: number;
  };
  categoryCompletion: {
    [category: string]: number; // % of players who completed
  };
  eliteAchievements: {
    playersReached: number;
    mostReached: string;
  };
}
```

---

## 4. Daily Login Rewards Statistics

### What to Track

#### Login Activity
- **Daily Active Users (DAU)** - Players who log in daily
- **Login Frequency** - How often players log in
- **Streak Distribution** - Distribution of streak lengths
- **Longest Streaks** - Top streak lengths
- **Streak Break Rate** - How often streaks are broken

#### Reward Distribution
- **Total Rewards Distributed** - Total rewards given
- **Rewards by Day** - Rewards per day of week
- **Rewards by Streak Length** - Rewards per streak tier
- **Claim Rate** - % of eligible players who claim rewards
- **Auto-Distribution Success Rate** - % of successful auto-distributions

#### Engagement Impact
- **Retention Impact** - Does daily login improve retention?
- **Return Rate** - % of players who return after login
- **Games Played After Login** - Do players play more after logging in?
- **Streak vs. Non-Streak Players** - Behavior comparison

### Data Sources

**On-Chain Events:**
- `DailyLoginRewardClaimed` - When reward is claimed
- `StreakReset` - When streak is broken

**Event Data Available:**
```move
struct DailyLoginRewardClaimed {
    player: address,
    streak_day: u64,
    credits_awarded: u64,
    items_awarded: vector<u8>,
    timestamp: u64,
}

struct StreakReset {
    player: address,
    previous_streak: u64,
    timestamp: u64,
}
```

### Statistics Service

```typescript
interface DailyLoginStatistics {
  // Login activity
  dailyActiveUsers: number;
  loginFrequency: {
    averageLoginsPerWeek: number;
    mostActiveDay: string;
  };
  streakDistribution: {
    [streakLength: number]: number; // players with X-day streak
  };
  longestStreaks: Array<{
    player: string;
    streak: number;
  }>;
  streakBreakRate: number;
  
  // Rewards
  totalRewardsDistributed: number;
  rewardsByDay: {
    [day: number]: number; // Day 1-7
  };
  rewardsByStreakLength: {
    [streakLength: number]: {
      credits: number;
      items: number;
    };
  };
  claimRate: number;
  autoDistributionSuccessRate: number;
  
  // Engagement
  retentionImpact: {
    retentionWithLogin: number;
    retentionWithoutLogin: number;
    improvement: number;
  };
  returnRate: number;
  gamesPlayedAfterLogin: {
    average: number;
    increase: number; // % increase
  };
  streakVsNonStreak: {
    streakPlayers: {
      averageGames: number;
      retention: number;
    };
    nonStreakPlayers: {
      averageGames: number;
      retention: number;
    };
  };
}
```

---

## 5. Inventory System Statistics

### What to Track

#### Inventory Holdings
- **Total Items Held** - Total items across all players
- **Items by Type** - Distribution of item types
- **Items by Level** - Distribution of item levels
- **Average Inventory Value** - Average value per player
- **Inventory Size Distribution** - How many items players hold

#### Item Acquisition
- **Items Acquired** - Total items acquired (purchased + rewards)
- **Acquisition Methods** - Purchased vs. rewards vs. merged
- **Acquisition Rate** - Items acquired per day/week/month
- **Purchase vs. Reward Ratio** - Purchased items vs. free items

#### Item Usage
- **Items Consumed** - Total items consumed
- **Consumption Rate** - Items consumed per day/week/month
- **Usage by Item Type** - Which items are used most
- **Usage by Level** - Which levels are used most
- **Inventory Turnover** - How quickly items are used

### Data Sources

**On-Chain Events:**
- `InventoryUpdated` - When inventory changes (purchase, reward, merge, consumption)

**Event Data Available:**
```move
struct InventoryUpdated {
    player: address,
    item_type: u8,
    item_level: u8,
    quantity_change: i64,  // Positive = added, negative = consumed
    source: u8,  // 0=purchase, 1=reward, 2=merge, 3=consumption
    timestamp: u64,
}
```

### Statistics Service

```typescript
interface InventoryStatistics {
  // Holdings
  totalItemsHeld: number;
  itemsByType: {
    [itemType: string]: number;
  };
  itemsByLevel: {
    level1: number;
    level2: number;
    level3: number;
  };
  averageInventoryValue: number;
  inventorySizeDistribution: {
    [sizeRange: string]: number;
  };
  
  // Acquisition
  totalItemsAcquired: number;
  acquisitionMethods: {
    purchased: number;
    rewards: number;
    merged: number;
  };
  acquisitionRate: {
    perDay: number;
    perWeek: number;
    perMonth: number;
  };
  purchaseVsRewardRatio: number;
  
  // Usage
  totalItemsConsumed: number;
  consumptionRate: {
    perDay: number;
    perWeek: number;
    perMonth: number;
  };
  usageByItemType: {
    [itemType: string]: number;
  };
  usageByLevel: {
    level1: number;
    level2: number;
    level3: number;
  };
  inventoryTurnover: number; // Items consumed / items held
}
```

---

## 6. Item Merging Statistics

### What to Track

*(Already documented in `ITEM_MERGING_UPGRADE_SYSTEM_PLAN.md`)*

- Merge frequency and patterns
- Revenue from merge fees
- Payment method preferences
- Badge discount usage
- Item type and path preferences

---

## 7. Item Consumption Statistics

### What to Track

*(Already documented in `ITEM_CONSUMPTION_TRACKING_PLAN.md`)*

- Items used per game
- Item effectiveness
- Usage patterns
- Most popular items

---

## Implementation Plan

### Phase 1: Event Querying Infrastructure (Week 1)

**Backend Service:**
```typescript
// services/event-query-service.ts

export class EventQueryService {
  /**
   * Query all events for a specific system
   */
  async queryEvents(
    eventType: string,
    filters?: {
      playerAddress?: string;
      startTime?: number;
      endTime?: number;
    }
  ): Promise<Event[]> {
    // Query Sui events from blockchain
    // Filter by event type and optional filters
    // Return parsed events
  }
  
  /**
   * Query events in batches for performance
   */
  async queryEventsBatch(
    eventTypes: string[],
    filters?: EventFilters
  ): Promise<{ [eventType: string]: Event[] }> {
    // Query multiple event types in parallel
  }
}
```

### Phase 2: Statistics Calculation Services (Week 2-3)

**Create statistics services for each system:**
- `GamePassStatisticsService`
- `TournamentStatisticsService`
- `AchievementStatisticsService`
- `DailyLoginStatisticsService`
- `InventoryStatisticsService`
- `ItemMergeStatisticsService` (already planned)
- `ItemConsumptionStatisticsService` (already planned)

### Phase 3: API Endpoints (Week 3)

```typescript
// routes/statistics.ts

// GET /api/statistics/game-pass
router.get('/game-pass', async (req, res) => {
  const stats = await gamePassStatsService.getStatistics();
  res.json(stats);
});

// GET /api/statistics/tournaments
router.get('/tournaments', async (req, res) => {
  const stats = await tournamentStatsService.getStatistics();
  res.json(stats);
});

// GET /api/statistics/achievements
router.get('/achievements', async (req, res) => {
  const stats = await achievementStatsService.getStatistics();
  res.json(stats);
});

// GET /api/statistics/daily-login
router.get('/daily-login', async (req, res) => {
  const stats = await dailyLoginStatsService.getStatistics();
  res.json(stats);
});

// GET /api/statistics/inventory
router.get('/inventory', async (req, res) => {
  const stats = await inventoryStatsService.getStatistics();
  res.json(stats);
});

// GET /api/statistics/player/:address
router.get('/player/:address', async (req, res) => {
  const { address } = req.params;
  const stats = await getAllPlayerStatistics(address);
  res.json(stats);
});
```

### Phase 4: Optional Database Caching (Week 4)

**For faster queries, cache statistics in database:**
- Store aggregated statistics
- Update periodically (hourly/daily)
- Use for dashboard and reports

---

## Use Cases

### 1. Revenue Analysis
- Track revenue from all systems
- Identify most profitable systems
- Optimize pricing and rewards

### 2. Player Behavior
- Understand player preferences
- Identify engagement patterns
- Optimize user experience

### 3. System Optimization
- Identify bottlenecks
- Optimize conversion rates
- Improve retention

### 4. Business Intelligence
- Generate reports
- Forecast revenue
- Make data-driven decisions

---

## Next Steps

1. **Review this plan** - Confirm which statistics are most valuable
2. **Prioritize** - Decide which systems to track first
3. **Implement Phase 1** - Build event querying infrastructure
4. **Implement Phase 2** - Build statistics calculation services
5. **Implement Phase 3** - Create API endpoints
6. **Test** - Verify statistics are accurate
7. **Iterate** - Add more statistics based on needs

---

## Related Documents

- `ITEM_MERGING_UPGRADE_SYSTEM_PLAN.md` - Item merging statistics (already planned)
- `ITEM_CONSUMPTION_TRACKING_PLAN.md` - Item consumption statistics (already planned)
- `STATISTICS_ANALYSIS_AND_PROPOSALS.md` - General statistics proposals
- `MONETIZATION_PROJECT_CONSIDERATIONS.md` - Analytics & Metrics section

