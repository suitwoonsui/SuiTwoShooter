# Achievement Reward System - Implementation Plan

## Overview

This document outlines the complete implementation plan for the achievement reward system defined in `MONETIZATION_STRATEGY.md`. The system will track player milestones across 8 categories and reward players with credits and store items when milestones are reached.

## System Architecture

### Components

1. **Blockchain Contract** (`achievement_system.move`)
   - Tracks claimed milestones per player
   - Provides view functions to check achievement eligibility
   - Emits events when achievements are claimed

2. **Backend Service** (`achievement-service.ts`)
   - Checks player stats against milestone thresholds
   - Determines eligible achievements
   - Distributes rewards (credits + items)
   - Calls blockchain to mark achievements as claimed

3. **Frontend UI**
   - Achievement panel/modal
   - Progress indicators
   - Claim notifications
   - Reward history

4. **Integration Points**
   - `PlayerStats` (from `score_submission.move`) - Source of truth for stats
   - `PremiumStore` (from `premium_store.move`) - For adding items to inventory
   - `GamePass` (from `game_pass.move`) - For adding credits

---

## Phase 1: Blockchain Contract (`achievement_system.move`)

### Data Structures

```move
module suitwo_game::achievement_system {
    use sui::object::{Self, UID, ID};
    use sui::event;
    use sui::table::{Self, Table};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use suitwo_game::score_submission::{Self, StatisticsRegistry, AdminCapability};

    // Achievement categories
    const CATEGORY_GAMES_PLAYED: u8 = 1;
    const CATEGORY_BOSSES_PER_GAME: u8 = 2;
    const CATEGORY_BOSSES_CUMULATIVE: u8 = 3;
    const CATEGORY_SCORE_PER_GAME: u8 = 4;
    const CATEGORY_SCORE_CUMULATIVE: u8 = 5;
    const CATEGORY_DISTANCE_PER_GAME: u8 = 6;
    const CATEGORY_DISTANCE_CUMULATIVE: u8 = 7;
    const CATEGORY_COINS_PER_GAME: u8 = 8;
    const CATEGORY_COINS_CUMULATIVE: u8 = 9;
    const CATEGORY_ENEMIES_PER_GAME: u8 = 10;
    const CATEGORY_ENEMIES_CUMULATIVE: u8 = 11;
    const CATEGORY_COIN_STREAK: u8 = 12;
    const CATEGORY_LEADERBOARD: u8 = 13;

    /// Achievement milestone definition
    struct AchievementMilestone has store {
        category: u8,
        threshold: u64,  // The value needed (e.g., 5 games, 100 coins)
        credits: u64,    // Free credits awarded
        // Items are handled separately by backend (not stored in contract)
    }

    /// Player's claimed achievements tracker
    struct PlayerAchievements has key, store {
        id: UID,
        player: address,
        
        // Track claimed milestones per category
        // Format: category -> set of claimed thresholds
        games_played_claimed: vector<u64>,           // e.g., [5, 15, 35]
        bosses_per_game_claimed: vector<u64>,        // e.g., [2, 4, 6]
        bosses_cumulative_claimed: vector<u64>,       // e.g., [5, 10, 25]
        score_per_game_claimed: vector<u64>,          // e.g., [10000, 25000]
        score_cumulative_claimed: vector<u64>,        // e.g., [50000, 100000]
        distance_per_game_claimed: vector<u64>,       // e.g., [5000, 10000]
        distance_cumulative_claimed: vector<u64>,     // e.g., [25000, 50000]
        coins_per_game_claimed: vector<u64>,          // e.g., [25, 50, 75]
        coins_cumulative_claimed: vector<u64>,       // e.g., [250, 500, 1000]
        enemies_per_game_claimed: vector<u64>,        // e.g., [25, 50, 100]
        enemies_cumulative_claimed: vector<u64>,     // e.g., [100, 250, 500]
        coin_streak_claimed: vector<u64>,            // e.g., [10, 20, 30]
        leaderboard_claimed: vector<u8>,             // e.g., [1, 2] (1=weekly top 100, 2=weekly top 50)
    }

    /// Registry to store all player achievements
    struct AchievementRegistry has key {
        id: UID,
        player_achievements: Table<address, ID>,  // player address -> PlayerAchievements ID
    }

    // ===== EVENTS =====
    
    struct AchievementClaimed has copy, drop {
        player: address,
        category: u8,
        threshold: u64,
        credits_awarded: u64,
        timestamp: u64,
    }
}
```

### Key Functions

```move
// Initialize registry (one-time setup)
public entry fun initialize_achievement_registry(ctx: &mut TxContext)

// Get or create PlayerAchievements for a player
fun get_or_create_player_achievements(
    registry: &mut AchievementRegistry,
    player: address,
    ctx: &mut TxContext
): PlayerAchievements

// Check if a milestone has been claimed
public fun is_milestone_claimed(
    achievements: &PlayerAchievements,
    category: u8,
    threshold: u64
): bool

// Mark a milestone as claimed (admin-only, called by backend)
public entry fun claim_milestone(
    _admin_cap: &AdminCapability,
    registry: &mut AchievementRegistry,
    player: address,
    category: u8,
    threshold: u64,
    clock: &Clock,
    ctx: &mut TxContext
)

// View function: Get all claimed milestones for a player
public fun get_claimed_milestones(
    achievements: &PlayerAchievements
): (vector<u64>, vector<u64>, ...)  // Returns all claimed vectors
```

### Implementation Notes

- **One-time rewards**: Each milestone can only be claimed once (checked before claiming)
- **Admin-only claiming**: Backend (with AdminCapability) claims on behalf of players after verifying eligibility
- **No reward storage**: Contract only tracks what's been claimed, not what rewards were given (handled by backend)
- **Efficient storage**: Use vectors to track claimed thresholds (compact, easy to query)

---

## Phase 2: Backend Service (`achievement-service.ts`)

### Service Structure

```typescript
export class AchievementService {
  // Milestone definitions (from MONETIZATION_STRATEGY.md)
  private milestoneDefinitions: {
    [category: string]: {
      threshold: number;
      credits: number;
      items: Array<{ itemId: string; level: number }>;
    }[];
  };

  /**
   * Check all categories for eligible achievements
   * Called after each game session (when stats are updated)
   */
  async checkAndClaimAchievements(
    playerAddress: string
  ): Promise<{
    claimed: Array<{
      category: string;
      threshold: number;
      credits: number;
      items: Array<{ itemId: string; level: number }>;
    }>;
  }>;

  /**
   * Check a specific category for eligible achievements
   */
  private async checkCategory(
    playerAddress: string,
    category: string,
    playerStats: PlayerStats
  ): Promise<Array<EligibleAchievement>>;

  /**
   * Claim an achievement (adds credits + items, marks as claimed on-chain)
   */
  private async claimAchievement(
    playerAddress: string,
    achievement: EligibleAchievement
  ): Promise<void>;

  /**
   * Add credits to player's GamePass
   */
  private async addCreditsToPlayer(
    playerAddress: string,
    credits: number
  ): Promise<void>;

  /**
   * Add items to player's inventory
   */
  private async addItemsToInventory(
    playerAddress: string,
    items: Array<{ itemId: string; level: number }>
  ): Promise<void>;
}
```

### Milestone Definitions

```typescript
const MILESTONE_DEFINITIONS = {
  gamesPlayed: [
    { threshold: 5, credits: 1, items: [{ itemId: 'extraLives', level: 1 }, { itemId: 'orbLevel', level: 1 }] },
    { threshold: 15, credits: 2, items: [{ itemId: 'extraLives', level: 1 }, { itemId: 'forceField', level: 1 }, { itemId: 'orbLevel', level: 1 }] },
    // ... all milestones from MONETIZATION_STRATEGY.md
  ],
  bossesPerGame: [
    { threshold: 2, credits: 0, items: [{ itemId: 'orbLevel', level: 1 }] },
    // ... all milestones
  ],
  // ... all 8 categories
};
```

### Integration Points

1. **After Score Submission**
   - Call `checkAndClaimAchievements()` after `submitScoreForPlayer()` succeeds
   - This ensures stats are up-to-date before checking achievements

2. **Manual Check Endpoint**
   - `GET /api/achievements/check/:address` - Check for eligible achievements
   - `POST /api/achievements/claim/:address` - Manually trigger claim (if auto-claim fails)

3. **Get Player Achievements**
   - `GET /api/achievements/:address` - Get all claimed achievements and progress

---

## Phase 3: Credit Distribution

### Adding Credits to GamePass

**Option A: Extend GamePass Contract** (Recommended)
- Add function: `add_free_credits(pass: &mut GamePass, amount: u64)`
- Admin-only (requires AdminCapability)
- Backend calls this after verifying achievement eligibility

**Option B: Create Separate Credit Balance** (Alternative)
- New contract: `FreeCredits` object per player
- Tracks free credits separately from purchased credits
- More complex but allows tracking free vs. paid credits

**Recommendation: Option A** - Simpler, credits are fungible anyway.

### Implementation

```move
// In game_pass.move
public entry fun add_free_credits(
    _admin_cap: &AdminCapability,
    system: &mut GamePassSystem,
    pass: &mut GamePass,
    amount: u64,
    ctx: &mut TxContext
) {
    // Add credits to existing pass
    pass.games_remaining = pass.games_remaining + amount;
    
    // Emit event
    event::emit(FreeCreditsAdded {
        player: pass.owner,
        amount,
        total_games_remaining: pass.games_remaining,
        timestamp: clock::timestamp_ms(clock),
    });
}
```

---

## Phase 4: Item Distribution

### Adding Items to Inventory

**Use Existing PremiumStore Functions**
- Backend already has `addItemsToInventory()` functionality
- Reuse existing `premium_store.move` functions
- No new contract code needed

### Implementation

```typescript
// In achievement-service.ts
private async addItemsToInventory(
  playerAddress: string,
  items: Array<{ itemId: string; level: number }>
): Promise<void> {
  // Use existing StoreService.addItemsToPlayerInventory()
  // Convert item format: { itemId: 'extraLives', level: 1 } -> { extra_lives_level_1: 1 }
  
  const inventoryUpdate: Record<string, number> = {};
  
  for (const item of items) {
    const key = this.getItemInventoryKey(item.itemId, item.level);
    inventoryUpdate[key] = (inventoryUpdate[key] || 0) + 1;
  }
  
  await this.storeService.addItemsToPlayerInventory(
    playerAddress,
    inventoryUpdate
  );
}

private getItemInventoryKey(itemId: string, level: number): string {
  const mapping: Record<string, string> = {
    'extraLives': 'extra_lives_level',
    'forceField': 'force_field_level',
    'orbLevel': 'orb_level',
    'slowTime': 'slow_time_level',
    'coinTractorBeam': 'coin_tractor_beam_level',
    'destroyAll': 'destroy_all_enemies',
    'bossKillShot': 'boss_kill_shot',
  };
  
  const base = mapping[itemId];
  if (!base) throw new Error(`Unknown item: ${itemId}`);
  
  // Special cases for single-level items
  if (itemId === 'destroyAll' || itemId === 'bossKillShot') {
    return base;
  }
  
  return `${base}_${level}`;
}
```

---

## Phase 5: Frontend UI

### Achievement Panel Component

```typescript
// components/AchievementPanel.tsx
interface AchievementCategory {
  id: string;
  name: string;
  description: string;
  milestones: Array<{
    threshold: number;
    credits: number;
    items: Array<{ itemId: string; level: number }>;
    claimed: boolean;
    progress: number;  // Current value / threshold
    eligible: boolean;  // Can be claimed now
  }>;
}

// Features:
// - List all 8 categories
// - Show progress bars for each milestone
// - Highlight eligible achievements (can claim now)
// - "Claim All" button for eligible achievements
// - Individual "Claim" buttons per milestone
// - Reward preview (credits + items)
```

### Notification System

```typescript
// Show notification when achievement is eligible
// Triggered after game ends (when stats are updated)

interface AchievementNotification {
  category: string;
  threshold: number;
  credits: number;
  items: Array<{ itemId: string; level: number }>;
}

// Display:
// - Toast notification: "Achievement Unlocked!"
// - Modal: "Claim your reward: X credits + Y items"
// - Auto-claim option (with user preference)
```

### Progress Indicators

```typescript
// Show progress toward next milestone in:
// - Main menu (overview)
// - Achievement panel (detailed)
// - Post-game screen (recent progress)

interface ProgressIndicator {
  category: string;
  current: number;
  nextThreshold: number;
  progress: number;  // 0-100%
}
```

---

## Phase 6: Implementation Steps

### Step 1: Blockchain Contract
1. Create `achievement_system.move`
2. Implement data structures
3. Implement claim tracking functions
4. Deploy and initialize registry
5. Test with unit tests

### Step 2: Backend Service
1. Create `achievement-service.ts`
2. Define milestone definitions (from MONETIZATION_STRATEGY.md)
3. Implement achievement checking logic
4. Integrate with credit distribution (GamePass)
5. Integrate with item distribution (PremiumStore)
6. Add API endpoints

### Step 3: Credit Distribution
1. Add `add_free_credits()` to `game_pass.move`
2. Update backend to call this function
3. Test credit distribution

### Step 4: Item Distribution
1. Verify existing `addItemsToInventory()` works
2. Integrate with achievement service
3. Test item distribution

### Step 5: Auto-Claim Integration
1. Hook into score submission flow
2. Call `checkAndClaimAchievements()` after score submission
3. Handle errors gracefully (don't block score submission)

### Step 6: Frontend UI
1. Create AchievementPanel component
2. Create notification system
3. Add progress indicators
4. Integrate with backend API
5. Test user flows

### Step 7: Testing
1. Unit tests for contract functions
2. Integration tests for backend service
3. E2E tests for full claim flow
4. Test edge cases (multiple achievements, already claimed, etc.)

### Step 8: Documentation
1. Update API documentation
2. Create user guide
3. Document milestone definitions

---

## Data Flow

### Achievement Claim Flow

```
1. Player completes game
   ↓
2. Score submitted to blockchain (PlayerStats updated)
   ↓
3. Backend: checkAndClaimAchievements(playerAddress)
   ↓
4. Backend: Query PlayerStats from blockchain
   ↓
5. Backend: Query claimed achievements from AchievementRegistry
   ↓
6. Backend: Compare stats vs. milestones, find eligible achievements
   ↓
7. For each eligible achievement:
   a. Add credits to GamePass (blockchain transaction)
   b. Add items to PremiumStore inventory (blockchain transaction)
   c. Mark achievement as claimed in AchievementRegistry (blockchain transaction)
   ↓
8. Emit AchievementClaimed event
   ↓
9. Frontend: Show notification with rewards
   ↓
10. Player sees updated credits and inventory
```

### Manual Claim Flow

```
1. Player opens Achievement Panel
   ↓
2. Frontend: GET /api/achievements/:address
   ↓
3. Backend: Check eligible achievements
   ↓
4. Frontend: Display eligible achievements with "Claim" buttons
   ↓
5. Player clicks "Claim"
   ↓
6. Frontend: POST /api/achievements/claim/:address
   ↓
7. Backend: Same flow as auto-claim (steps 7-10 above)
```

---

## Security Considerations

1. **Admin-Only Claiming**: Only backend (with AdminCapability) can mark achievements as claimed
2. **Verification**: Backend must verify player stats before claiming (prevent cheating)
3. **Idempotency**: Claiming same achievement twice should be safe (check before claiming)
4. **Rate Limiting**: Prevent spam claims (already handled by one-time rewards)
5. **Gas Costs**: Backend pays gas for all transactions (standard pattern)

---

## Performance Considerations

1. **Batch Claims**: If multiple achievements eligible, claim all in one transaction (if possible)
2. **Caching**: Cache player stats and claimed achievements (refresh after each game)
3. **Lazy Checking**: Only check achievements after game completion (not on every stat update)
4. **Efficient Queries**: Use indexed queries for claimed achievements

---

## Future Enhancements

1. **Leaderboard Achievements**: Implement when leaderboard system is ready
2. **Achievement Badges**: Visual badges for completed achievement categories
3. **Achievement History**: Track when each achievement was claimed
4. **Seasonal Achievements**: Reset achievements for new seasons
5. **Social Features**: Share achievements with friends

---

## Testing Checklist

- [ ] Contract: Claim milestone (first time)
- [ ] Contract: Attempt to claim same milestone twice (should fail)
- [ ] Contract: Claim multiple milestones in different categories
- [ ] Backend: Check achievements with eligible milestones
- [ ] Backend: Check achievements with no eligible milestones
- [ ] Backend: Distribute credits correctly
- [ ] Backend: Distribute items correctly
- [ ] Backend: Handle errors gracefully
- [ ] Frontend: Display achievements correctly
- [ ] Frontend: Claim button works
- [ ] Frontend: Notifications appear
- [ ] E2E: Full flow from game completion to reward claim

---

## Open Questions

1. **Leaderboard Achievements**: How to track weekly/monthly leaderboard positions? (Deferred until leaderboard system is ready)
2. **Batch Transactions**: Can we claim multiple achievements in one transaction? (Yes, but need to handle partial failures)
3. **Notification Timing**: Show notification immediately or wait for blockchain confirmation? (Recommend: show immediately, verify in background)
4. **Achievement Reset**: Should achievements reset for new seasons? (Future enhancement)

---

## Estimated Timeline

- **Phase 1 (Contract)**: 2-3 days
- **Phase 2 (Backend Service)**: 3-4 days
- **Phase 3 (Credit Distribution)**: 1 day
- **Phase 4 (Item Distribution)**: 1 day
- **Phase 5 (Frontend UI)**: 4-5 days
- **Phase 6 (Integration & Testing)**: 2-3 days
- **Total**: ~2-3 weeks

**Note:** Player Stats Modal should be built alongside this system in Phase 3 (Weeks 5-6). The modal will display milestone progress and integrate with the Achievement Rewards system.

---

## Dependencies

- `score_submission.move` - For PlayerStats
- `premium_store.move` - For item inventory
- `game_pass.move` - For credit management
- Backend services already in place
- Frontend framework ready

---

## Notes

- All milestone definitions should match `MONETIZATION_STRATEGY.md` exactly
- Keep milestone definitions in a single source of truth (backend config file)
- Consider making milestone definitions updatable (admin function) for future adjustments
- Monitor gas costs for claim transactions (may need optimization)

