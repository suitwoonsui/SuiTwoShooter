# Daily Login Reward System Plan

## Overview

Implement a daily login reward system to encourage daily engagement and player retention.

---

## System Design

### Core Concept

Players receive rewards for logging in and playing games on consecutive days. Rewards increase with consecutive login streaks.

### Reward Structure (Item-Focused)

#### Daily Login Rewards (Per Day)
- **Day 1:** 1x Orb Level (Level 1)
- **Day 2:** 1x Force Field (Level 1)
- **Day 3:** 1x Extra Lives (Level 1)
- **Day 4:** 1x Slow Time (Level 1)
- **Day 5:** 1x Coin Tractor Beam (Level 1)
- **Day 6:** 1x Orb Level (Level 1) + 1x Force Field (Level 1)
- **Day 7:** 1x Extra Lives (Level 1) + 1x Slow Time (Level 1) OR 1x Coin Tractor Beam (Level 1) - alternates weekly

#### Weekly Bonus (7-Day Streak)
- **7 Days:** Same as Day 7 reward (1x Extra Lives Level 1 + alternating Slow Time/Coin Tractor Beam)

#### Monthly Bonus (30-Day Streak)
- **30 Days:** 1x Extra Lives (Level 3) + 1x Force Field (Level 3) + 1x Orb Level (Level 2) + 1x Slow Time (Level 2) + 1x Coin Tractor Beam (Level 2)

### Streak Mechanics

- **Consecutive Days:** Player must log in and play at least 1 game each day
- **Streak Reset:** If player misses a day, streak resets to Day 1
- **Grace Period:** Optional 1-day grace period (player can miss 1 day without losing streak)
- **Maximum Streak:** No cap (rewards cycle weekly after Day 7)

---

## Data Structure

### On-Chain: Daily Login Tracker

```move
module suitwo_game::daily_login {
    use sui::object::{Self, UID};
    use sui::table::{Self, Table};
    use sui::event;
    use sui::clock::{Self, Clock};
    use sui::tx_context::{Self, TxContext};
    use suitwo_game::game_pass::{Self, GamePassSystem, GamePass};
    use suitwo_game::premium_store::{Self, PremiumStore, PlayerInventory};
    
    /// Daily login tracker for a player
    struct DailyLoginTracker has key, store {
        id: UID,
        player: address,
        
        // Streak tracking
        current_streak: u64,        // Current consecutive days
        longest_streak: u64,        // Longest streak ever achieved
        last_login_date: u64,       // Timestamp of last login (milliseconds)
        total_logins: u64,          // Total days logged in
        
        // Reward tracking
        last_reward_date: u64,      // Last date reward was claimed
        total_rewards_claimed: u64, // Total rewards claimed
    }
    
    /// Registry to store all daily login trackers
    struct DailyLoginRegistry has key {
        id: UID,
        trackers: Table<address, ID>,  // player -> DailyLoginTracker ID
    }
    
    // Events
    struct DailyLoginRewardClaimed has copy, drop {
        player: address,
        streak_day: u64,
        credits_awarded: u64,
        items_awarded: vector<u8>,  // Item types awarded
        timestamp: u64,
    }
    
    struct StreakReset has copy, drop {
        player: address,
        previous_streak: u64,
        timestamp: u64,
    }
}
```

### Backend: Daily Login Service

```typescript
interface DailyLoginStatus {
  currentStreak: number;
  longestStreak: number;
  lastLoginDate: number | null;
  nextRewardDate: number | null;
  canClaimReward: boolean;
  rewardForToday: {
    credits: number;
    items: Array<{ itemType: string; level: number }>;
  };
}

interface DailyLoginReward {
  day: number;
  credits: number;
  items: Array<{
    itemType: string;
    level: number;
  }>;
}
```

---

## Reward Schedule

### Daily Rewards (Days 1-7, then cycles)

```typescript
// Daily rewards (Days 1-6 are fixed, Day 7 alternates weekly)
const DAILY_REWARDS: DailyLoginReward[] = [
  { day: 1, credits: 0, items: [{ itemType: 'orbLevel', level: 1 }] },
  { day: 2, credits: 0, items: [{ itemType: 'forceField', level: 1 }] },
  { day: 3, credits: 0, items: [{ itemType: 'extraLives', level: 1 }] },
  { day: 4, credits: 0, items: [{ itemType: 'slowTime', level: 1 }] },
  { day: 5, credits: 0, items: [{ itemType: 'coinTractorBeam', level: 1 }] },
  { day: 6, credits: 0, items: [
    { itemType: 'orbLevel', level: 1 },
    { itemType: 'forceField', level: 1 }
  ]},
  // Day 7 is handled separately with weekly alternation
];

/**
 * Get Day 7 reward (alternates between Slow Time and Coin Tractor Beam weekly)
 */
function getDay7Reward(): DailyLoginReward {
  // Calculate current week number (weeks since epoch)
  const currentWeek = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 7));
  const isSlowTimeWeek = currentWeek % 2 === 0;
  
  return {
    day: 7,
    credits: 0,
    items: [
      { itemType: 'extraLives', level: 1 },
      { itemType: isSlowTimeWeek ? 'slowTime' : 'coinTractorBeam', level: 1 }
    ]
  };
}

// After Day 7, cycle repeats (Day 8 = Day 1, Day 9 = Day 2, etc.)
function getRewardForDay(day: number): DailyLoginReward {
  const cycleDay = ((day - 1) % 7) + 1;
  
  if (cycleDay === 7) {
    return getDay7Reward();
  }
  
  return DAILY_REWARDS[cycleDay - 1];
}

// After Day 7, cycle repeats (Day 8 = Day 1, Day 9 = Day 2, etc.)
function getRewardForDay(day: number): DailyLoginReward {
  const cycleDay = ((day - 1) % 7) + 1;
  return DAILY_REWARDS[cycleDay - 1];
}
```

### Weekly Bonus (Every 7 Days)

```typescript
// Weekly bonus is the same as Day 7 reward (alternates weekly)
// No separate WEEKLY_BONUS constant needed - use getDay7Reward() instead
```

### Monthly Bonus (Every 30 Days)

```typescript
const MONTHLY_BONUS: DailyLoginReward = {
  day: 30,
  credits: 0,
  items: [
    { itemType: 'extraLives', level: 3 },
    { itemType: 'forceField', level: 3 },
    { itemType: 'orbLevel', level: 2 },
    { itemType: 'slowTime', level: 2 },
    { itemType: 'coinTractorBeam', level: 2 }
  ]
};
```

---

## Implementation Plan

### Phase 1: Backend Tracking

#### 1.1 Daily Login Detection

```typescript
// services/daily-login-service.ts

export class DailyLoginService {
  /**
   * Check if player logged in today and can claim reward
   */
  async checkDailyLogin(playerAddress: string): Promise<DailyLoginStatus> {
    // Get or create tracker
    const tracker = await this.getOrCreateTracker(playerAddress);
    
    // Check if player logged in today
    const today = this.getTodayTimestamp();
    const lastLogin = tracker.lastLoginDate;
    
    // Check if it's a new day
    const isNewDay = !lastLogin || !this.isSameDay(lastLogin, today);
    
    // Check if streak should continue or reset
    let currentStreak = tracker.currentStreak;
    let streakReset = false;
    
    if (isNewDay) {
      if (lastLogin) {
        const daysSinceLastLogin = this.getDaysBetween(lastLogin, today);
        
        if (daysSinceLastLogin === 1) {
          // Consecutive day - increment streak
          currentStreak++;
        } else if (daysSinceLastLogin === 2) {
          // Grace period - maintain streak (optional)
          // Or reset if no grace period
          currentStreak = 1;
          streakReset = true;
        } else {
          // Streak broken - reset
          currentStreak = 1;
          streakReset = true;
        }
      } else {
        // First login
        currentStreak = 1;
      }
      
      // Update tracker
      await this.updateTracker(playerAddress, {
        currentStreak,
        lastLoginDate: today,
        totalLogins: tracker.totalLogins + 1
      });
      
      if (streakReset && tracker.currentStreak > 0) {
        // Emit streak reset event
        await this.emitStreakReset(playerAddress, tracker.currentStreak);
      }
    }
    
    // Check if reward can be claimed
    const canClaimReward = isNewDay && currentStreak > 0;
    const rewardForToday = canClaimReward ? this.getRewardForDay(currentStreak) : null;
    
    return {
      currentStreak,
      longestStreak: Math.max(tracker.longestStreak, currentStreak),
      lastLoginDate: tracker.lastLoginDate,
      nextRewardDate: canClaimReward ? today : this.getTomorrowTimestamp(),
      canClaimReward,
      rewardForToday: rewardForToday || { credits: 0, items: [] }
    };
  }
  
  /**
   * Automatically distribute daily login reward (backend pays gas)
   * Called automatically when player logs in or plays a game
   */
  async autoDistributeDailyReward(playerAddress: string): Promise<{
    success: boolean;
    creditsAwarded: number;
    itemsAwarded: Array<{ itemType: string; level: number }>;
    error?: string;
  }> {
    // Check login status
    const status = await this.checkDailyLogin(playerAddress);
    
    if (!status.canClaimReward) {
      return {
        success: false,
        creditsAwarded: 0,
        itemsAwarded: [],
        error: 'Reward already claimed today or no streak active'
      };
    }
    
    const reward = status.rewardForToday;
    
    // Award credits (via game pass system)
    if (reward.credits > 0) {
      await this.awardCredits(playerAddress, reward.credits);
    }
    
    // Award items (via inventory system, backend pays gas)
    if (reward.items.length > 0) {
      await this.awardItems(playerAddress, reward.items);
      // Backend calls add_items() on smart contract
      // Backend pays gas fee from operations budget
    }
    
    // Update tracker (on-chain, backend pays gas)
    await this.updateTracker(playerAddress, {
      lastRewardDate: this.getTodayTimestamp(),
      totalRewardsClaimed: (await this.getTracker(playerAddress)).totalRewardsClaimed + 1
    });
    
    // Emit event
    await this.emitRewardClaimed(playerAddress, status.currentStreak, reward);
    
    return {
      success: true,
      creditsAwarded: reward.credits,
      itemsAwarded: reward.items
    };
  }
  
  /**
   * Award items to player (backend pays gas)
   */
  private async awardItems(
    playerAddress: string,
    items: Array<{ itemType: string; level: number }>
  ): Promise<void> {
    // Call smart contract add_items() function
    // Backend signs transaction (admin capability)
    // Backend pays gas fee
    // Items added to player inventory
  }
  
  /**
   * Get reward for specific day
   */
  private getRewardForDay(day: number): DailyLoginReward {
    // Check for special bonuses
    if (day === 30) {
      return MONTHLY_BONUS;
    }
    
    if (day % 7 === 0) {
      // Day 7 alternates weekly between Slow Time and Coin Tractor Beam
      return this.getDay7Reward();
    }
    
    // Regular daily reward (cycles every 7 days)
    const cycleDay = ((day - 1) % 7) + 1;
    return DAILY_REWARDS[cycleDay - 1];
  }
  
  /**
   * Get Day 7 reward (alternates weekly)
   */
  private getDay7Reward(): DailyLoginReward {
    // Calculate current week number (weeks since epoch)
    const currentWeek = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 7));
    const isSlowTimeWeek = currentWeek % 2 === 0;
    
    return {
      day: 7,
      credits: 0,
      items: [
        { itemType: 'extraLives', level: 1 },
        { itemType: isSlowTimeWeek ? 'slowTime' : 'coinTractorBeam', level: 1 }
      ]
    };
  }
  
  /**
   * Award credits to player
   */
  private async awardCredits(playerAddress: string, credits: number): Promise<void> {
    // Use game pass service to add free credits
    await gamePassService.addFreeCredits(playerAddress, credits);
  }
  
  /**
   * Award items to player
   */
  private async awardItems(
    playerAddress: string,
    items: Array<{ itemType: string; level: number }>
  ): Promise<void> {
    // Use store service to add items to inventory
    await storeService.addItemsToInventory(playerAddress, items);
  }
}
```

#### 1.2 API Endpoints

```typescript
// routes/daily-login.ts

// GET /api/daily-login/:address
// Get daily login status
router.get('/:address', async (req, res) => {
  const { address } = req.params;
  const status = await dailyLoginService.checkDailyLogin(address);
  res.json(status);
});

// POST /api/daily-login/auto-claim/:address
// Automatically distribute daily login reward (backend pays gas)
// Called automatically when player logs in or plays a game
router.post('/auto-claim/:address', async (req, res) => {
  const { address } = req.params;
  const result = await dailyLoginService.autoDistributeDailyReward(address);
  res.json(result);
});

// POST /api/daily-login/claim/:address (Alternative - if using claimable system)
// Claim daily login reward (player pays gas)
router.post('/claim/:address', async (req, res) => {
  const { address } = req.params;
  // This would require player to sign transaction
  // Player pays gas fee
  // Not recommended for daily rewards (too much friction)
  res.status(501).json({ error: 'Claimable system not implemented - using auto-distribution' });
});
```

### Phase 2: Frontend Integration

#### 2.1 Daily Login Modal

```typescript
// components/DailyLoginModal.tsx

interface DailyLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClaim: () => Promise<void>;
  status: DailyLoginStatus;
}

export const DailyLoginModal: React.FC<DailyLoginModalProps> = ({
  isOpen,
  onClose,
  onClaim,
  status
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="daily-login-modal">
        <h2>🎁 Daily Login Reward</h2>
        
        <div className="streak-display">
          <div className="current-streak">
            <span className="label">Current Streak:</span>
            <span className="value">{status.currentStreak} days</span>
          </div>
          <div className="longest-streak">
            <span className="label">Longest Streak:</span>
            <span className="value">{status.longestStreak} days</span>
          </div>
        </div>
        
        {status.canClaimReward ? (
          <div className="reward-preview">
            <h3>Today's Reward:</h3>
            <div className="reward-items">
              {status.rewardForToday.credits > 0 && (
                <div className="reward-item">
                  <span className="icon">💰</span>
                  <span>{status.rewardForToday.credits} Free Credits</span>
                </div>
              )}
              {status.rewardForToday.items.map((item, i) => (
                <div key={i} className="reward-item">
                  <span className="icon">🎁</span>
                  <span>1x {item.itemType} (Level {item.level})</span>
                </div>
              ))}
            </div>
            
            <button onClick={onClaim} className="claim-button">
              Claim Reward
            </button>
          </div>
        ) : (
          <div className="already-claimed">
            <p>✅ Reward already claimed today!</p>
            <p>Come back tomorrow for your next reward.</p>
          </div>
        )}
        
        <div className="streak-calendar">
          <h3>7-Day Reward Cycle:</h3>
          <div className="calendar-grid">
            {DAILY_REWARDS.map((reward, day) => (
              <div
                key={day + 1}
                className={`calendar-day ${
                  (status.currentStreak % 7) === day ? 'active' : ''
                }`}
              >
                <div className="day-number">Day {day + 1}</div>
                <div className="day-reward">
                  {reward.credits > 0 && (
                    <span className="credits">{reward.credits}💰</span>
                  )}
                  {reward.items.length > 0 && (
                    <span className="items">🎁</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};
```

#### 2.2 Auto-Display on Login

```typescript
// In main game component or app initialization

useEffect(() => {
  // Check daily login status when player connects wallet
  if (isConnected && accountAddress) {
    checkDailyLoginStatus(accountAddress).then(status => {
      if (status.canClaimReward) {
        // Show daily login modal
        setShowDailyLoginModal(true);
      }
    });
  }
}, [isConnected, accountAddress]);
```

#### 2.3 Streak Display in UI

```typescript
// components/StreakDisplay.tsx

export const StreakDisplay: React.FC<{ status: DailyLoginStatus }> = ({ status }) => {
  return (
    <div className="streak-display">
      <div className="streak-icon">🔥</div>
      <div className="streak-info">
        <div className="current-streak">{status.currentStreak} day streak</div>
        <div className="longest-streak">Best: {status.longestStreak} days</div>
      </div>
    </div>
  );
};
```

### Phase 3: On-Chain Tracking (Optional)

#### 3.1 Daily Login Tracker Contract

```move
// In daily_login.move

/// Initialize daily login registry
fun init(ctx: &mut TxContext) {
    let registry = DailyLoginRegistry {
        id: object::new(ctx),
        trackers: table::new(ctx),
    };
    transfer::share_object(registry);
}

/// Get or create daily login tracker for player
public fun get_or_create_tracker(
    registry: &mut DailyLoginRegistry,
    player: address,
    ctx: &mut TxContext
): DailyLoginTracker {
    if (table::contains(&registry.trackers, player)) {
        let tracker_id = *table::borrow(&registry.trackers, player);
        // Return tracker (would need to fetch from ID)
    } else {
        // Create new tracker
        let tracker = DailyLoginTracker {
            id: object::new(ctx),
            player,
            current_streak: 0,
            longest_streak: 0,
            last_login_date: 0,
            total_logins: 0,
            last_reward_date: 0,
            total_rewards_claimed: 0,
        };
        
        let tracker_id = object::id(&tracker);
        table::add(&mut registry.trackers, player, tracker_id);
        transfer::transfer(tracker, player);
        
        // Return tracker (would need to fetch from ID)
    }
}

/// Update daily login (called by backend)
public entry fun update_daily_login(
    _admin_cap: &AdminCapability,
    registry: &mut DailyLoginRegistry,
    player: address,
    current_streak: u64,
    longest_streak: u64,
    last_login_date: u64,
    total_logins: u64,
    clock: &Clock,
    ctx: &mut TxContext
) {
    // Update tracker (implementation details)
}
```

---

## Database Schema

```sql
CREATE TABLE daily_login_trackers (
  id SERIAL PRIMARY KEY,
  player_address VARCHAR(66) UNIQUE NOT NULL,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_login_date BIGINT,
  total_logins INT DEFAULT 0,
  last_reward_date BIGINT,
  total_rewards_claimed INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE daily_login_rewards (
  id SERIAL PRIMARY KEY,
  player_address VARCHAR(66) NOT NULL,
  streak_day INT NOT NULL,
  credits_awarded INT DEFAULT 0,
  items_awarded JSONB,  -- Array of items
  claimed_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (player_address) REFERENCES daily_login_trackers(player_address)
);

CREATE INDEX idx_daily_login_player ON daily_login_trackers(player_address);
CREATE INDEX idx_daily_login_date ON daily_login_trackers(last_login_date);
```

---

## Gas Fee Consideration

### Problem
If daily login rewards require a blockchain transaction to claim, players would need to pay gas fees (~$0.001 SUI per claim). This creates friction for a system meant to encourage daily engagement.

### Solution Options

**Option 1: Automatic Distribution (Recommended)**
- **Backend sponsors gas fees** - Team pays gas for daily login rewards
- **Automatic claim** - Rewards distributed automatically when player logs in
- **No user transaction** - Player just sees reward notification
- **Cost:** ~$0.001 per player per day (~$0.03/month per active player)
- **Benefit:** Zero friction, maximum engagement

**Option 2: Batch Claiming**
- **Claim multiple days at once** - Player can claim 3-7 days of rewards in one transaction
- **Reduces gas cost per reward** - One transaction for multiple days
- **Player still pays gas** - But amortized across multiple days
- **Benefit:** Lower cost per reward, but still requires player action

**Option 3: Off-Chain Tracking + Periodic Sync**
- **Track logins off-chain** - Backend tracks daily logins
- **Periodic on-chain sync** - Batch sync to blockchain weekly/monthly
- **Rewards stored off-chain** - Items added to inventory when synced
- **Benefit:** Minimal gas costs, but less transparent

**Option 4: Hybrid (Recommended)**
- **Automatic for small rewards** - Daily rewards (Level 1 items) auto-distributed, team pays gas
- **Claimable for large rewards** - Weekly/monthly bonuses require claim (player pays gas)
- **Benefit:** Balance between engagement and cost

### Recommended: Option 1 (Automatic Distribution)

**Implementation:**
- Backend detects daily login (via game play or explicit login)
- Backend automatically calls `add_items()` on smart contract (admin function)
- Backend pays gas fee from operations budget
- Player sees notification: "Daily reward claimed! Check your inventory"
- No user transaction required

**Cost Analysis:**
- 100 active players/day × $0.001 = $0.10/day = ~$3/month
- 1,000 active players/day × $0.001 = $1/day = ~$30/month
- Acceptable cost for engagement benefit

**Alternative:** Only auto-distribute if player has played a game that day (proves engagement)

---

## User Experience Flow

### Daily Login Flow (Automatic Distribution)

```
1. Player opens game
   ↓
2. System checks: Has player logged in today?
   ↓
3. If NO (first login today):
   a. Check streak status
   b. Increment streak (if consecutive)
   c. Backend automatically distributes reward (team pays gas)
   d. Show daily login modal: "Your reward has been added!"
   e. Player sees items in inventory
   f. Modal closes, game continues
   ↓
4. If YES (already logged in today):
   a. Show streak display (no modal)
   b. Game continues normally
```

### Daily Login Flow (Claimable - Alternative)

```
1. Player opens game
   ↓
2. System checks: Has player logged in today?
   ↓
3. If NO (first login today):
   a. Check streak status
   b. Increment streak (if consecutive)
   c. Show daily login modal with reward
   d. Player clicks "Claim Reward" (pays gas)
   e. Credits and items added to account
   f. Modal closes, game continues
   ↓
4. If YES (already logged in today):
   a. Show streak display (no modal)
   b. Game continues normally
```

### Streak Display

- **Main Menu:** Show current streak (e.g., "🔥 5 day streak")
- **Game HUD:** Optional streak indicator
- **Profile:** Show longest streak, total logins

---

## Reward Balance Considerations

### Items (Primary Rewards)
- **Daily:** 1 item per day (Level 1-2, rotating types)
- **Weekly:** 4 items (Level 1-2, variety)
- **Monthly:** 5 items (Level 2-3, premium selection)

### Rationale
- **Items are more valuable** - Can be used immediately in gameplay
- **Variety** - Different items each day keeps rewards interesting
- **Progression** - Higher level items on later days

## Gas Fee Strategy

### Automatic Distribution (Recommended)
- **Backend pays gas** - Team covers gas fees for daily login rewards
- **Zero friction** - Players don't need to pay or sign transactions
- **Automatic claim** - Rewards distributed when player logs in/plays
- **Cost:** ~$0.001 per player per day (~$0.03/month per active player)
- **Benefit:** Maximum engagement, no barriers

### Cost Justification
- **Engagement Value:** Daily logins drive retention and revenue
- **Low Cost:** ~$30/month for 1,000 active players
- **ROI:** Increased retention likely generates more revenue than gas costs
- **Scalable:** Can adjust if costs become prohibitive

### Implementation Note
- Backend automatically calls `add_items()` when player logs in
- Uses admin capability to sign transaction
- Gas paid from operations budget (25% of tournament prize pools)
- Players see notification: "Daily reward added to inventory!"
- **Merge synergy** - Lower level items can be merged into higher levels
- **Sustainable** - Digital items, no cost to create
- **Encourages daily play** - Players want to collect all item types

---

## Implementation Timeline

### Week 1: Backend System
- Create daily login service
- Implement streak tracking
- Create API endpoints
- Database schema

### Week 2: Frontend Integration
- Daily login modal
- Streak display components
- Auto-display on login
- Reward claiming flow

### Week 3: On-Chain (Optional)
- Daily login tracker contract
- Event emission
- On-chain verification

### Week 4: Testing & Polish
- Test streak mechanics
- Test reward distribution
- UI/UX polish
- Analytics integration

---

## Analytics & Metrics

### Track
- **Daily Active Users (DAU)** - Players who log in daily
- **Streak Distribution** - How many players have X-day streaks
- **Retention Impact** - Does daily login improve retention?
- **Reward Claim Rate** - % of players who claim rewards
- **Streak Break Rate** - How often streaks are broken

### Use Cases
- **Retention Analysis** - Measure impact on player retention
- **Engagement Optimization** - Adjust rewards based on engagement
- **Player Segmentation** - Identify daily vs. casual players

---

## Next Steps

1. **Review reward structure** - Confirm credits and items are balanced
2. **Decide on grace period** - 1-day grace period or strict consecutive?
3. **Implement backend** - Start with backend tracking system
4. **Build frontend** - Create daily login modal and UI
5. **Test & iterate** - Adjust rewards based on player behavior

