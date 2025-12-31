# Player Stats Modal Implementation Plan

## Overview

A comprehensive player statistics modal that displays:
1. **Per-Game Stats** - Best single-game performances
2. **Cumulative Stats** - Total achievements across all games
3. **Milestone Progress** - Progress bars showing how close players are to next achievement milestones

## Implementation Priority

**Placement:** Phase 3 (alongside Achievement Rewards)

**Rationale:**
- **Dependencies:** 
  - PlayerStats (already exists) ✅ - Can be built without Achievement system
  - Achievement system (for milestone progress) - Will be included in Phase 3, only one phase later
- **Value:** Enhances player engagement and motivation to reach milestones
- **Timing:** Can be built in Phase 2 (without milestone progress) or Phase 3 (with full milestone tracking)
- **Natural Pairing:** Achievement Rewards + Stats Modal work together to show progress and rewards

**Implementation Approach:**
- **Phase 2 Option:** Build MVP version with just stats (no milestone progress) - works without Achievement system
- **Phase 3 Option:** Build full version with milestone progress tracking - integrates with Achievement Rewards system
- **Recommended:** Build in Phase 3 to include complete milestone progress from the start

---

## UI Structure

### Modal Layout

```
┌─────────────────────────────────────────┐
│  Player Statistics              [X]    │
├─────────────────────────────────────────┤
│  [Per-Game Stats] [Cumulative Stats]   │
├─────────────────────────────────────────┤
│                                         │
│  [Content based on selected tab]       │
│                                         │
└─────────────────────────────────────────┘
```

### Tab 1: Per-Game Stats

**Displays best single-game performances:**

```
┌─────────────────────────────────────────┐
│  Per-Game Stats                        │
├─────────────────────────────────────────┤
│                                         │
│  🎯 Best Score                          │
│  150,000 points                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Next: 200,000 (50,000 away)           │
│  ████████████████████░░░░░░ 75%       │
│                                         │
│  📏 Longest Distance                    │
│  40,000 units                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Next: 60,000 (20,000 away)            │
│  ████████████████░░░░░░░░░░ 67%       │
│                                         │
│  💰 Most Coins Collected                │
│  125 coins                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Next: 150 (25 away)                   │
│  ████████████████████████░░ 83%       │
│                                         │
│  👾 Most Enemies Defeated              │
│  400 enemies                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Next: 500 (100 away)                  │
│  ████████████████████░░░░░░ 80%       │
│                                         │
│  👑 Most Bosses Defeated               │
│  8 bosses                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Next: 10 (2 away)                     │
│  ████████████████████████████ 80%     │
│                                         │
│  🔥 Longest Coin Streak                │
│  35 coins                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Next: 40 (5 away)                     │
│  ████████████████████████████ 88%     │
│                                         │
└─────────────────────────────────────────┘
```

### Tab 2: Cumulative Stats

**Displays total achievements across all games:**

```
┌─────────────────────────────────────────┐
│  Cumulative Stats                       │
├─────────────────────────────────────────┤
│                                         │
│  🎮 Total Games Played                  │
│  75 games                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Next: 150 (75 away)                   │
│  ████████████░░░░░░░░░░░░░░ 50%       │
│                                         │
│  📊 Total Score                        │
│  2,500,000 points                      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Next: 5,000,000 (2,500,000 away)      │
│  ██████████░░░░░░░░░░░░░░░░ 50%       │
│                                         │
│  📏 Total Distance                     │
│  1,000,000 units                       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Next: 2,500,000 (1,500,000 away)      │
│  ████████░░░░░░░░░░░░░░░░░░ 40%       │
│                                         │
│  💰 Total Coins Collected              │
│  5,000 coins                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Next: 10,000 (5,000 away)             │
│  ██████████░░░░░░░░░░░░░░░░ 50%       │
│                                         │
│  👾 Total Enemies Defeated             │
│  2,500 enemies                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Next: 5,000 (2,500 away)              │
│  ██████████░░░░░░░░░░░░░░░░ 50%       │
│                                         │
│  👑 Total Bosses Defeated              │
│  50 bosses                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Next: 100 (50 away)                   │
│  ██████████░░░░░░░░░░░░░░░░ 50%       │
│                                         │
└─────────────────────────────────────────┘
```

---

## Data Structure

### Player Stats (from `PlayerStats` on-chain)

```typescript
interface PlayerStats {
  // Per-Game Bests
  bestScore: number;
  bestDistance: number;
  bestCoins: number;
  bestBossesDefeated: number;
  bestEnemiesDefeated: number;
  bestCoinStreak: number;
  
  // Cumulative Totals
  totalGames: number;
  totalScore: number;
  totalDistance: number;
  totalCoins: number;
  totalBossesDefeated: number;
  totalEnemiesDefeated: number;
  
  // Timestamps
  firstGameDate: number;
  lastGameDate: number;
}
```

### Achievement Milestones (from `MONETIZATION_STRATEGY.md`)

```typescript
interface AchievementMilestone {
  category: string;
  threshold: number;
  credits: number;
  items: Array<{ type: string; level: number }>;
}

// Milestone definitions
const MILESTONES = {
  // Per-Game
  scorePerGame: [10000, 25000, 50000, 100000, 150000, 200000],
  distancePerGame: [5000, 10000, 15000, 25000, 40000, 60000],
  coinsPerGame: [25, 50, 75, 100, 125, 150],
  enemiesPerGame: [25, 50, 100, 250, 400, 500],
  bossesPerGame: [2, 4, 6, 8, 10, 12],
  coinStreak: [10, 20, 30, 40, 50],
  
  // Cumulative
  gamesPlayed: [5, 15, 35, 75, 150, 300, 500],
  scoreCumulative: [50000, 100000, 250000, 500000, 1000000, 2500000, 5000000],
  distanceCumulative: [25000, 50000, 100000, 250000, 500000, 1000000, 2500000],
  coinsCumulative: [250, 500, 1000, 2500, 5000, 10000, 25000],
  enemiesCumulative: [100, 250, 500, 1000, 2500, 5000, 10000],
  bossesCumulative: [5, 10, 25, 50, 100, 200, 500],
};
```

### Progress Calculation

```typescript
interface MilestoneProgress {
  current: number;
  nextMilestone: number | null;
  progress: number;  // 0-100 percentage
  remaining: number;  // How much more needed
  isMax: boolean;    // Has reached max milestone
}

function calculateProgress(
  current: number,
  milestones: number[],
  claimedMilestones: number[]
): MilestoneProgress {
  // Find next unclaimed milestone
  const nextMilestone = milestones.find(
    threshold => threshold > current && !claimedMilestones.includes(threshold)
  );
  
  if (!nextMilestone) {
    // Reached max milestone
    return {
      current,
      nextMilestone: null,
      progress: 100,
      remaining: 0,
      isMax: true
    };
  }
  
  // Find previous milestone (or 0 if first)
  const previousMilestone = milestones
    .filter(m => m < nextMilestone)
    .sort((a, b) => b - a)[0] || 0;
  
  const range = nextMilestone - previousMilestone;
  const progress = ((current - previousMilestone) / range) * 100;
  const remaining = nextMilestone - current;
  
  return {
    current,
    nextMilestone,
    progress: Math.min(100, Math.max(0, progress)),
    remaining,
    isMax: false
  };
}
```

---

## Component Implementation

### React Component Structure

```typescript
// components/PlayerStatsModal.tsx

import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';

interface PlayerStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerAddress: string;
}

export const PlayerStatsModal: React.FC<PlayerStatsModalProps> = ({
  isOpen,
  onClose,
  playerAddress
}) => {
  const [activeTab, setActiveTab] = useState<'per-game' | 'cumulative'>('per-game');
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [claimedMilestones, setClaimedMilestones] = useState<ClaimedMilestones | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (isOpen && playerAddress) {
      loadPlayerStats();
    }
  }, [isOpen, playerAddress]);
  
  const loadPlayerStats = async () => {
    setLoading(true);
    try {
      // Fetch player stats from blockchain
      const playerStats = await fetchPlayerStats(playerAddress);
      
      // Fetch claimed milestones
      const claimed = await fetchClaimedMilestones(playerAddress);
      
      setStats(playerStats);
      setClaimedMilestones(claimed);
    } catch (error) {
      console.error('Failed to load player stats:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Player Statistics">
      <div className="player-stats-modal">
        {/* Tab Navigation */}
        <div className="stats-tabs">
          <button
            className={activeTab === 'per-game' ? 'active' : ''}
            onClick={() => setActiveTab('per-game')}
          >
            Per-Game Stats
          </button>
          <button
            className={activeTab === 'cumulative' ? 'active' : ''}
            onClick={() => setActiveTab('cumulative')}
          >
            Cumulative Stats
          </button>
        </div>
        
        {/* Content */}
        {loading ? (
          <div className="loading">Loading stats...</div>
        ) : stats ? (
          <div className="stats-content">
            {activeTab === 'per-game' ? (
              <PerGameStatsTab
                stats={stats}
                claimedMilestones={claimedMilestones}
              />
            ) : (
              <CumulativeStatsTab
                stats={stats}
                claimedMilestones={claimedMilestones}
              />
            )}
          </div>
        ) : (
          <div className="error">Failed to load stats</div>
        )}
      </div>
    </Modal>
  );
};
```

### Per-Game Stats Tab Component

```typescript
// components/PerGameStatsTab.tsx

interface PerGameStatsTabProps {
  stats: PlayerStats;
  claimedMilestones: ClaimedMilestones | null;
}

export const PerGameStatsTab: React.FC<PerGameStatsTabProps> = ({
  stats,
  claimedMilestones
}) => {
  const statItems = [
    {
      label: 'Best Score',
      icon: '🎯',
      value: stats.bestScore,
      format: (v: number) => v.toLocaleString() + ' points',
      milestones: MILESTONES.scorePerGame,
      claimed: claimedMilestones?.scorePerGame || []
    },
    {
      label: 'Longest Distance',
      icon: '📏',
      value: stats.bestDistance,
      format: (v: number) => v.toLocaleString() + ' units',
      milestones: MILESTONES.distancePerGame,
      claimed: claimedMilestones?.distancePerGame || []
    },
    {
      label: 'Most Coins Collected',
      icon: '💰',
      value: stats.bestCoins,
      format: (v: number) => v + ' coins',
      milestones: MILESTONES.coinsPerGame,
      claimed: claimedMilestones?.coinsPerGame || []
    },
    {
      label: 'Most Enemies Defeated',
      icon: '👾',
      value: stats.bestEnemiesDefeated,
      format: (v: number) => v + ' enemies',
      milestones: MILESTONES.enemiesPerGame,
      claimed: claimedMilestones?.enemiesPerGame || []
    },
    {
      label: 'Most Bosses Defeated',
      icon: '👑',
      value: stats.bestBossesDefeated,
      format: (v: number) => v + ' bosses',
      milestones: MILESTONES.bossesPerGame,
      claimed: claimedMilestones?.bossesPerGame || []
    },
    {
      label: 'Longest Coin Streak',
      icon: '🔥',
      value: stats.bestCoinStreak,
      format: (v: number) => v + ' coins',
      milestones: MILESTONES.coinStreak,
      claimed: claimedMilestones?.coinStreak || []
    }
  ];
  
  return (
    <div className="per-game-stats">
      {statItems.map((item, index) => {
        const progress = calculateProgress(
          item.value,
          item.milestones,
          item.claimed
        );
        
        return (
          <StatCard
            key={index}
            label={item.label}
            icon={item.icon}
            value={item.format(item.value)}
            progress={progress}
          />
        );
      })}
    </div>
  );
};
```

### Cumulative Stats Tab Component

```typescript
// components/CumulativeStatsTab.tsx

interface CumulativeStatsTabProps {
  stats: PlayerStats;
  claimedMilestones: ClaimedMilestones | null;
}

export const CumulativeStatsTab: React.FC<CumulativeStatsTabProps> = ({
  stats,
  claimedMilestones
}) => {
  const statItems = [
    {
      label: 'Total Games Played',
      icon: '🎮',
      value: stats.totalGames,
      format: (v: number) => v + ' games',
      milestones: MILESTONES.gamesPlayed,
      claimed: claimedMilestones?.gamesPlayed || []
    },
    {
      label: 'Total Score',
      icon: '📊',
      value: stats.totalScore,
      format: (v: number) => v.toLocaleString() + ' points',
      milestones: MILESTONES.scoreCumulative,
      claimed: claimedMilestones?.scoreCumulative || []
    },
    {
      label: 'Total Distance',
      icon: '📏',
      value: stats.totalDistance,
      format: (v: number) => v.toLocaleString() + ' units',
      milestones: MILESTONES.distanceCumulative,
      claimed: claimedMilestones?.distanceCumulative || []
    },
    {
      label: 'Total Coins Collected',
      icon: '💰',
      value: stats.totalCoins,
      format: (v: number) => v.toLocaleString() + ' coins',
      milestones: MILESTONES.coinsCumulative,
      claimed: claimedMilestones?.coinsCumulative || []
    },
    {
      label: 'Total Enemies Defeated',
      icon: '👾',
      value: stats.totalEnemiesDefeated,
      format: (v: number) => v.toLocaleString() + ' enemies',
      milestones: MILESTONES.enemiesCumulative,
      claimed: claimedMilestones?.enemiesCumulative || []
    },
    {
      label: 'Total Bosses Defeated',
      icon: '👑',
      value: stats.totalBossesDefeated,
      format: (v: number) => v + ' bosses',
      milestones: MILESTONES.bossesCumulative,
      claimed: claimedMilestones?.bossesCumulative || []
    }
  ];
  
  // Calculate averages
  const averages = {
    averageScore: stats.totalGames > 0 ? Math.round(stats.totalScore / stats.totalGames) : 0,
    averageDistance: stats.totalGames > 0 ? Math.round(stats.totalDistance / stats.totalGames) : 0,
    averageCoins: stats.totalGames > 0 ? Math.round(stats.totalCoins / stats.totalGames) : 0,
    averageEnemies: stats.totalGames > 0 ? Math.round(stats.totalEnemiesDefeated / stats.totalGames) : 0,
    averageBosses: stats.totalGames > 0 ? (stats.totalBossesDefeated / stats.totalGames).toFixed(2) : '0.00'
  };
  
  return (
    <div className="cumulative-stats">
      {/* Main Stats */}
      {statItems.map((item, index) => {
        const progress = calculateProgress(
          item.value,
          item.milestones,
          item.claimed
        );
        
        return (
          <StatCard
            key={index}
            label={item.label}
            icon={item.icon}
            value={item.format(item.value)}
            progress={progress}
          />
        );
      })}
      
      {/* Averages Section */}
      <div className="averages-section">
        <h3>📈 Averages</h3>
        <div className="averages-grid">
          <div className="average-item">
            <span className="label">Avg Score:</span>
            <span className="value">{averages.averageScore.toLocaleString()}</span>
          </div>
          <div className="average-item">
            <span className="label">Avg Distance:</span>
            <span className="value">{averages.averageDistance.toLocaleString()}</span>
          </div>
          <div className="average-item">
            <span className="label">Avg Coins:</span>
            <span className="value">{averages.averageCoins}</span>
          </div>
          <div className="average-item">
            <span className="label">Avg Enemies:</span>
            <span className="value">{averages.averageEnemies}</span>
          </div>
          <div className="average-item">
            <span className="label">Avg Bosses:</span>
            <span className="value">{averages.averageBosses}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
```

### Stat Card Component

```typescript
// components/StatCard.tsx

interface StatCardProps {
  label: string;
  icon: string;
  value: string;
  progress: MilestoneProgress;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  icon,
  value,
  progress
}) => {
  return (
    <div className="stat-card">
      <div className="stat-header">
        <span className="stat-icon">{icon}</span>
        <span className="stat-label">{label}</span>
      </div>
      
      <div className="stat-value">{value}</div>
      
      <div className="stat-divider"></div>
      
      {progress.isMax ? (
        <div className="stat-progress">
          <div className="progress-label">🏆 Max Milestone Reached!</div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: '100%' }}></div>
          </div>
        </div>
      ) : (
        <div className="stat-progress">
          <div className="progress-label">
            Next: {progress.nextMilestone?.toLocaleString()} 
            ({progress.remaining.toLocaleString()} away)
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress.progress}%` }}
            ></div>
          </div>
          <div className="progress-percentage">{Math.round(progress.progress)}%</div>
        </div>
      )}
    </div>
  );
};
```

---

## Backend API

### Get Player Stats

```typescript
// routes/player-stats.ts

// GET /api/player-stats/:address
router.get('/:address', async (req, res) => {
  const { address } = req.params;
  
  try {
    // Query PlayerStats from blockchain
    const stats = await suiClient.getObject({
      id: await getPlayerStatsId(address),
      options: { showContent: true }
    });
    
    // Query claimed milestones
    const claimedMilestones = await achievementService.getClaimedMilestones(address);
    
    res.json({
      success: true,
      stats: {
        // Per-Game Bests
        bestScore: stats.content.fields.best_score,
        bestDistance: stats.content.fields.best_distance,
        bestCoins: stats.content.fields.best_coins,
        bestBossesDefeated: stats.content.fields.best_bosses_defeated,
        bestEnemiesDefeated: stats.content.fields.best_enemies_defeated,
        bestCoinStreak: stats.content.fields.best_coin_streak,
        
        // Cumulative
        totalGames: stats.content.fields.total_games,
        totalScore: stats.content.fields.total_score,
        totalDistance: stats.content.fields.total_distance,
        totalCoins: stats.content.fields.total_coins,
        totalBossesDefeated: stats.content.fields.total_bosses_defeated,
        totalEnemiesDefeated: stats.content.fields.total_enemies_defeated,
        
        // Timestamps
        firstGameDate: stats.content.fields.first_game_date,
        lastGameDate: stats.content.fields.last_game_date
      },
      claimedMilestones
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch player stats'
    });
  }
});
```

---

## Styling

### CSS Structure

```css
.player-stats-modal {
  width: 90vw;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
}

.stats-tabs {
  display: flex;
  gap: 10px;
  border-bottom: 2px solid #333;
  margin-bottom: 20px;
}

.stats-tabs button {
  padding: 10px 20px;
  background: transparent;
  border: none;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  font-size: 16px;
  color: #999;
  transition: all 0.3s;
}

.stats-tabs button.active {
  color: #fff;
  border-bottom-color: #4CAF50;
}

.stat-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.stat-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.stat-icon {
  font-size: 24px;
}

.stat-label {
  font-size: 14px;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #fff;
  margin-bottom: 15px;
}

.stat-divider {
  height: 1px;
  background: linear-gradient(to right, transparent, #333, transparent);
  margin: 15px 0;
}

.stat-progress {
  margin-top: 15px;
}

.progress-label {
  font-size: 12px;
  color: #999;
  margin-bottom: 8px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 5px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(to right, #4CAF50, #8BC34A);
  transition: width 0.3s ease;
}

.progress-percentage {
  font-size: 12px;
  color: #4CAF50;
  text-align: right;
}

.averages-section {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #333;
}

.averages-section h3 {
  margin-bottom: 15px;
  color: #fff;
}

.averages-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
}

.average-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.average-item .label {
  font-size: 12px;
  color: #999;
}

.average-item .value {
  font-size: 18px;
  font-weight: bold;
  color: #fff;
}
```

---

## Integration Points

### 1. Fetch Player Stats
- Query `PlayerStats` from `StatisticsRegistry` on-chain
- Use Sui client to read object

### 2. Fetch Claimed Milestones
- Query `PlayerAchievements` from `AchievementRegistry` on-chain
- Or use backend service that tracks claimed milestones

### 3. Calculate Progress
- Compare current stats with milestone thresholds
- Filter out already claimed milestones
- Calculate percentage progress

### 4. Display Modal
- Trigger from main menu or profile page
- Show loading state while fetching
- Handle errors gracefully

---

## Features

### Visual Progress Indicators
- Progress bars showing percentage to next milestone
- Color-coded (green for close, yellow for medium, red for far)
- Visual feedback for achievement proximity

### Milestone Information
- Shows next milestone threshold
- Shows remaining amount needed
- Shows percentage complete

### Achievement Badges
- Visual indicator when milestone is reached (but not yet claimed)
- Highlight claimed milestones differently
- Show reward preview for next milestone

### Responsive Design
- Works on desktop and mobile
- Scrollable content for long lists
- Touch-friendly on mobile

---

## Implementation Timeline

**Phase 3: Full Implementation (With Milestone Progress)**
**When:** Weeks 5-6 (alongside Achievement Rewards)
**Scope:** Complete stats modal with milestone progress tracking

### Week 1: Backend & Data
- Create API endpoint for player stats
- Create API endpoint for claimed milestones
- Integrate with Achievement Rewards system
- Test data fetching from blockchain

### Week 2: Frontend Components
- Build modal component
- Build tab navigation
- Build stat card component
- Build progress bar component
- Integrate with Achievement Rewards UI

### Week 3: Integration & Polish
- Integrate with blockchain
- Connect to Achievement system
- Add loading states
- Add error handling
- Polish UI/UX
- Add animations

### Week 4: Testing & Refinement
- Test with various player stats
- Test edge cases (max milestones, no stats, etc.)
- Test integration with Achievement Rewards
- Gather feedback
- Refine based on feedback

**Total Timeline:** ~3-4 weeks (can overlap with Achievement Rewards implementation)

**Coordination with Achievement Rewards:**
- Share milestone definitions and thresholds
- Share claimed milestone data
- Coordinate UI/UX design for consistency
- Can be built in parallel with Achievement Rewards backend

---

## Next Steps

1. **Coordinate with Achievement Rewards** - Ensure milestone definitions align
2. **Review milestone thresholds** - Confirm all thresholds are correct
3. **Design UI mockups** - Create visual designs for approval
4. **Implement backend** - Build API endpoints (can parallel with Achievement Rewards backend)
5. **Implement frontend** - Build React components (coordinate with Achievement Rewards UI)
6. **Test** - Test with real player data and Achievement Rewards integration
7. **Deploy** - Release to players alongside Achievement Rewards system

---

## Related Documents

- `ACHIEVEMENT_REWARD_IMPLEMENTATION_PLAN.md` - Achievement system implementation
- `MONETIZATION_STRATEGY.md` - Milestone definitions and rewards
- `STATISTICS_ANALYSIS_AND_PROPOSALS.md` - Statistics tracking proposals

