# Reward System Implementation Design

## Overview

This document describes **how to implement** the reward system across all components (milestones, tournaments, daily login, etc.). It covers three core processes: **Reward Declaration**, **Reward Claim Tracking**, and **Reward Distribution**, along with supporting processes.

## Architecture Principles

1. **Each Entity Declares Its Own Rewards**: Milestones, tournaments, and other reward-granting entities store their reward definitions directly on-chain.
2. **Default Systems**: Tournaments use a default prize pool calculation system. Other entities may have defaults.
3. **Customization**: Admins can customize rewards per instance (e.g., add to tournament prize pool).
4. **Separation of Concerns**: 
   - **On-Chain**: Stores reward definitions and tracks claims
   - **Off-Chain (Backend)**: Handles eligibility checking and actual distribution

## Process 1: Reward Declaration

Reward declaration is how we store what rewards each entity provides.

### 1.1 Milestone Rewards Declaration

**On-Chain Storage:**
```move
struct MilestoneDefinition has store {
    milestone_level: u8,
    category: u8,
    threshold: u64,
    credits: u64,              // Reward declared here
    items: vector<ItemReward>, // Reward declared here
}
```

**Declaration Methods:**
- `add_milestone_definition()` - Create milestone with embedded rewards
- `update_milestone_credits()` - Update credits
- `update_milestone_items()` - Replace all items
- `add_milestone_reward()` - Add individual item
- `edit_milestone_reward()` - Edit item quantity
- `delete_milestone_reward()` - Remove item
- `clear_milestone_rewards()` - Clear all items

**Storage Location:** `AchievementRegistry.milestone_definitions[category][milestone_level]`

### 1.2 Tournament Rewards Declaration

**Default System (Current Implementation):**
Tournaments use a **default reward calculation system** based on prize pool:

```move
struct Tournament has key {
    // ... existing fields ...
    prize_pool_usd_cents: u64,        // Prize pool from entry fees
    rewards_distributed: bool,         // Claim tracking
}
```

**Default Reward Calculation:**
- **Prize Pool Split:**
  - Boost Creator Reward (50% until creation fee covered, then 20%)
  - Variable → Player Rewards (25% for 1-10 entries, 50% for 11+ entries - DOUBLES!)
  - Variable → Operations (minimum 25% for small tournaments, adjusts based on rewards)
  - Variable → Token Burn (Optional - not implemented early on, can be enabled later)
- **Creator Reward (Boost System):**
  - Entry fees ≤ $10.00: 50% (ensures break-even with 10 entries)
  - Entry fees > $10.00: $5.00 + 20% of remaining entry fees
  - Based on total entry fees (not including starting ante)
- **Player Rewards (Prize Pool Boost):**
  - 1-10 entries: 25% of prize pool (reduced to ensure operations gets share)
  - 11+ entries: 50% of prize pool (DOUBLES after 10 players! 🎉)
  - Incentivizes tournament creators to attract more players
  - Paid to tournament creator when tournament ends
  - See `TOURNAMENT_CREATOR_REWARD_DESIGN.md` for details
- **Player Rewards (50% of prize pool):**
  - **Top 3**: MEWS tokens (1st: 50%, 2nd: 30%, 3rd: 20% of player pool)
  - **Top 10**: Items (rank-based: top 3 get special items + random, 4-10 get random)

**Customization:**
- Admin can add to prize pool when creating tournament: `additional_prize_pool_usd_cents`
- Prize pool accumulates from entry fees + admin additions
- Default calculation uses total prize pool

**Storage Location:** `Tournament.prize_pool_usd_cents` (for default calculation)

**Future Enhancement (Optional):**
If custom rewards per rank are needed:
```move
struct TournamentReward has store {
    rank: u8,
    credits: u64,
    items: vector<ItemReward>,
    mews_tokens_usd_cents: u64,
}

struct Tournament has key {
    // ... existing fields ...
    custom_rewards: Option<vector<TournamentReward>>, // If set, overrides default
}
```

### 1.3 Daily Login Rewards Declaration (To Be Implemented)

**Proposed Structure:**
```move
struct DailyLoginReward has store {
    day: u8,                   // Day of streak (1-7, 14, 30, etc.)
    credits: u64,
    items: vector<ItemReward>,
    tickets: u64,              // Optional tournament tickets
}

struct DailyLoginRegistry has key {
    id: UID,
    rewards: Table<u8, DailyLoginReward>, // day -> reward
}
```

**Declaration Methods:**
- `add_daily_login_reward(day, credits, items, tickets)` - Set reward for day
- `update_daily_login_reward(day, credits, items, tickets)` - Update reward

## Process 2: Reward Claim Tracking

Reward claim tracking ensures players can only claim rewards once and prevents duplicate distributions.

### 2.1 Milestone Claim Tracking

**On-Chain Storage:**
```move
struct PlayerAchievements has key, store {
    player: address,
    games_played_claimed: vector<u8>,           // Claimed milestone levels
    bosses_per_game_claimed: vector<u8>,
    bosses_cumulative_claimed: vector<u8>,
    score_per_game_claimed: vector<u8>,
    score_cumulative_claimed: vector<u8>,
    distance_per_game_claimed: vector<u8>,
    distance_cumulative_claimed: vector<u8>,
    coins_per_game_claimed: vector<u8>,
    coins_cumulative_claimed: vector<u8>,
    enemies_per_game_claimed: vector<u8>,
    enemies_cumulative_claimed: vector<u8>,
    coin_streak_claimed: vector<u8>,
}
```

**Tracking Methods:**
- `claim_milestone()` - Mark milestone as claimed (admin-only, called by backend)
- `unclaim_milestone()` - Unclaim milestone (admin-only, for corrections)
- `is_milestone_claimed()` - Check if milestone is claimed
- `get_claimed_milestones_for_player()` - Get all claimed milestones for player

**Storage Location:** `AchievementRegistry.player_achievements[player_address]`

**Events:**
- `AchievementClaimed` - Emitted when milestone is claimed
- `AchievementUnclaimed` - Emitted when milestone is unclaimed

### 2.2 Tournament Claim Tracking

**On-Chain Storage:**
```move
struct Tournament has key {
    // ... existing fields ...
    rewards_distributed: bool,  // Tracks if rewards have been distributed
}
```

**Tracking Methods:**
- `end_tournament()` - Sets `rewards_distributed = true` (called after distribution)
- Check `rewards_distributed` before distributing to prevent duplicates

**Storage Location:** `Tournament.rewards_distributed`

**Events:**
- `TournamentEnded` - Emitted when tournament ends, includes `rewards_distributed` flag

### 2.3 Daily Login Claim Tracking (To Be Implemented)

**Proposed Structure:**
```move
struct PlayerDailyLogin has key, store {
    player: address,
    last_login_date: u64,        // Last login timestamp
    current_streak: u8,          // Current streak length
    claimed_days: vector<u8>,    // Days that have been claimed
}
```

**Tracking Methods:**
- `claim_daily_login_reward(day)` - Mark day as claimed
- `get_claimed_days(player)` - Get claimed days for player

## Process 3: Reward Distribution

Reward distribution is the process of actually giving rewards to players. This happens off-chain via backend services.

### 3.1 Distribution Flow

**General Flow:**
1. **Eligibility Check** (Backend)
   - Check if player is eligible for reward
   - Check if reward has already been claimed
2. **Distribution** (Backend)
   - Distribute credits, items, or tokens
   - Handle errors and retries
3. **Claim Marking** (On-Chain)
   - Backend calls contract to mark reward as claimed
   - Contract emits event

### 3.2 Milestone Reward Distribution

**Backend Service:** `AchievementService`

**Distribution Steps:**
1. **Check Eligibility:**
   ```typescript
   // Backend checks player stats against milestone thresholds
   const eligible = checkEligibleAchievements(playerAddress);
   ```

2. **Distribute Rewards:**
   ```typescript
   // For each eligible milestone:
   // - Add credits to GamePass
   await gamePassService.addFreeCredits(playerAddress, credits);
   
   // - Add items to inventory
   await storeService.adminAddItems(playerAddress, items);
   ```

3. **Mark as Claimed:**
   ```typescript
   // Call contract to mark milestone as claimed
   await claimMilestone(playerAddress, category, milestone_level);
   ```

**Distribution Methods:**
- `game_pass::add_free_credits(player, amount)` - Add credits to GamePass
- `store::admin_add_items(player, items)` - Add items to inventory

### 3.3 Tournament Reward Distribution

**Backend Service:** `RewardsService`

**Distribution Steps:**
1. **Calculate Rewards (Default System):**
   ```typescript
   // Calculate from prize pool
   const playerRewardsPool = prizePoolUsdCents * 0.5; // 50%
   
   // Top 3 token distribution
   const tokenRewards = [
     { rank: 1, amount: playerRewardsPool * 0.50 }, // 50% of player pool
     { rank: 2, amount: playerRewardsPool * 0.30 }, // 30% of player pool
     { rank: 3, amount: playerRewardsPool * 0.20 }, // 20% of player pool
   ];
   
   // Top 10 item distribution
   const itemRewards = calculateItemRewards(leaderboard);
   ```

2. **Distribute Rewards:**
   ```typescript
   // For top 3: Mint MEWS tokens
   for (const tokenReward of tokenRewards) {
     await mintMewsTokens(playerAddress, tokenReward.amount);
   }
   
   // For top 10: Add items
   for (const itemReward of itemRewards) {
     await storeService.adminAddItems(playerAddress, itemReward.items);
   }
   ```

3. **Mark as Distributed:**
   ```typescript
   // Call contract to mark tournament as rewards distributed
   await endTournament(tournamentId);
   ```

**Distribution Methods:**
- `mews::mint(player, amount)` - Mint MEWS tokens to player
- `store::admin_add_items(player, items)` - Add items to inventory

**Automatic Trigger:**
- Rewards are automatically distributed when tournament grace period ends
- Triggered by score submission after grace period
- Backup cron job runs hourly to catch any missed distributions

### 3.4 Daily Login Reward Distribution (To Be Implemented)

**Proposed Distribution Steps:**
1. **Check Eligibility:**
   - Check if player logged in today
   - Check if reward for current streak day has been claimed
   - Verify streak continuity

2. **Distribute Rewards:**
   ```typescript
   // Get reward for current streak day
   const reward = getDailyLoginReward(currentStreakDay);
   
   // Distribute
   await gamePassService.addFreeCredits(playerAddress, reward.credits);
   await storeService.adminAddItems(playerAddress, reward.items);
   await gamePassService.addTickets(playerAddress, reward.tickets); // Future
   ```

3. **Mark as Claimed:**
   ```typescript
   await claimDailyLoginReward(playerAddress, currentStreakDay);
   ```

## Supporting Processes

### 4.1 Eligibility Checking

**Milestones:**
- Backend compares player stats (`PlayerStats`) against milestone thresholds
- Checks if milestone level has already been claimed
- Returns list of eligible milestones

**Tournaments:**
- Check if tournament has ended (including grace period)
- Check if rewards have already been distributed
- Get top 10 leaderboard

**Daily Login:**
- Check if player logged in today
- Check streak continuity
- Check if reward for current day has been claimed

### 4.2 Event Emission

**On-Chain Events:**
- `AchievementClaimed` - Milestone claimed
- `AchievementUnclaimed` - Milestone unclaimed
- `TournamentEnded` - Tournament ended, rewards distributed
- `DailyLoginRewardClaimed` - Daily login reward claimed (future)

**Event Usage:**
- Backend can listen to events for analytics
- Events provide audit trail
- Events can trigger additional processes

### 4.3 Error Handling

**Common Errors:**
- `E_MILESTONE_ALREADY_CLAIMED` - Player already claimed this milestone
- `E_REWARDS_ALREADY_DISTRIBUTED` - Tournament rewards already distributed
- `E_MILESTONE_NOT_FOUND` - Milestone doesn't exist
- `E_TOURNAMENT_NOT_ENDED` - Tournament hasn't ended yet

**Error Recovery:**
- Backend should retry failed distributions
- Admin can manually trigger distribution if needed
- Admin can unclaim milestones for corrections

### 4.4 Admin Functions

**Milestone Management:**
- `add_milestone_definition()` - Create milestone
- `update_milestone_definition()` - Update milestone
- `delete_milestone_definition()` - Delete milestone
- `unclaim_milestone()` - Unclaim milestone (for corrections)

**Tournament Management:**
- `create_tournament()` - Create tournament (can add to prize pool)
- `end_tournament()` - End tournament and mark rewards distributed
- `add_to_prize_pool()` - Add funds to prize pool (future)

**Daily Login Management:**
- `add_daily_login_reward()` - Set reward for day
- `update_daily_login_reward()` - Update reward for day

## Implementation Status

| Component | Declaration | Claim Tracking | Distribution | Status |
|-----------|-------------|----------------|--------------|--------|
| Milestones | ✅ Implemented | ✅ Implemented | ✅ Implemented | Complete |
| Tournaments | ✅ Default System | ✅ Implemented | ✅ Implemented | Complete |
| Daily Login | ⏳ To Be Designed | ⏳ To Be Designed | ⏳ To Be Designed | Planned |

## Key Design Decisions

1. **Tournaments Use Default System**: Prize pool calculation is the default. Custom rewards per rank are optional future enhancement.
2. **Admin Can Add to Prize Pool**: When creating tournaments, admin can add additional funds to prize pool.
3. **Backend Handles Distribution**: Contract stores definitions and tracks claims, but backend distributes actual rewards.
4. **Claim Tracking Prevents Duplicates**: On-chain tracking ensures rewards can only be claimed once.
5. **Automatic Distribution**: Tournament rewards automatically distribute when grace period ends.
6. **User Reward Payment Required**: Users creating tournaments with custom rewards must pay for those rewards to prevent economic exploits. See `TOURNAMENT_REWARD_PAYMENT_DESIGN.md` for details.
7. **Creator Rewards**: Tournament creators earn 50% of entry fees until the creation fee ($5.00) is covered, then 20% of remaining entry fees. This ensures creators break even with just 10 entries. See `TOURNAMENT_CREATOR_REWARD_DESIGN.md` for details.

## Future Enhancements

1. **Custom Tournament Rewards**: Allow custom rewards per rank (overrides default calculation)
2. **Ticket Rewards**: Add tournament ticket rewards to milestone and daily login systems
3. **Reward Expiration**: Add time-based expiration for rewards
4. **Batch Distribution**: Optimize distribution for multiple rewards at once
5. **Reward Analytics**: Track reward distribution metrics and player engagement
