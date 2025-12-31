# Reward UI System & User-Created Tournament Events Design

## Overview

This document describes the design for a **universal reward selection UI system** and **user-created tournament events**. The reward UI can be used across all reward types (tournaments, milestones, daily login, etc.), allowing easy selection and configuration of rewards from an available pool.

**Note:** For player-facing UI design (viewing and claiming rewards), see `PLAYER_REWARDS_UI_DESIGN.md`.

## Core Components

### 1. Universal Reward Selection UI

A reusable UI component that allows selecting and configuring rewards from an available pool.

**Key Features:**
- Visual selection of items from available pool
- Configuration of pool-based rewards (percentages, depth)
- Preview of reward distribution
- Save/load reward configurations
- Works for tournaments, milestones, daily login, etc.

### 2. User-Created Tournament Events

Allow users (not just admins) to create tournament events with custom reward configurations.

**Key Features:**
- User pays fee to create tournament
- User can add starting ante (initial prize pool contribution)
- User configures rewards using universal reward UI
- Tournament follows same structure as admin-created tournaments

## Universal Reward Selection UI

### UI Structure

```
┌─────────────────────────────────────────────────┐
│  Reward Configuration                          │
├─────────────────────────────────────────────────┤
│                                                 │
│  Reward Type: [Tournament ▼]                   │
│                                                 │
│  ┌─ Item Rewards ───────────────────────────┐  │
│  │  Available Items Pool:                   │  │
│  │  [Orb Level 1] [Orb Level 2] [Orb Level 3]│  │
│  │  [Force Field] [Extra Lives] [Slow Time]  │  │
│  │  [Coin Tractor] [Destroy All] [Boss Kill] │  │
│  │                                            │  │
│  │  Selected Items:                           │  │
│  │  ┌────────────────────────────────────┐   │  │
│  │  │ Rank 1: [Destroy All x1] [Boss Kill x1]│ │
│  │  │        [+ Add Item]                │   │  │
│  │  └────────────────────────────────────┘   │  │
│  │  ┌────────────────────────────────────┐   │  │
│  │  │ Rank 2: [Boss Kill x1]             │   │  │
│  │  │        [+ Add Item]                │   │  │
│  │  └────────────────────────────────────┘   │  │
│  │  ... (up to reward depth)                  │  │
│  └────────────────────────────────────────────┘  │
│                                                 │
│  ┌─ Pool Rewards ───────────────────────────┐  │
│  │  Enable Pool Rewards: [✓]                 │  │
│  │                                            │  │
│  │  Pool Depth: [3 ▼] players               │  │
│  │  (How many players receive pool rewards)   │  │
│  │                                            │  │
│  │  Distribution:                             │  │
│  │  Rank 1: [50]% ────────────────────────┐  │  │
│  │  Rank 2: [30]% ────────────────────────┐  │  │
│  │  Rank 3: [20]% ────────────────────────┐  │  │
│  │  Total: 100%                           │  │  │
│  │                                            │  │
│  │  Pool Source: [Prize Pool ▼]            │  │
│  │  (Prize Pool / Fixed Amount / Custom)     │  │
│  └────────────────────────────────────────────┘  │
│                                                 │
│  ┌─ Reward Depth ───────────────────────────┐  │
│  │  How many players receive rewards:        │  │
│  │  [10 ▼] players                           │  │
│  │  (Top 10 players will receive item rewards)│ │
│  └────────────────────────────────────────────┘  │
│                                                 │
│  [Reset to Default]  [Preview]  [Save]  [Cancel]│
└─────────────────────────────────────────────────┘
```

### Available Items Pool

**Item Types:**
- Orb Level 1, 2, 3
- Force Field 1, 2, 3
- Extra Lives 1, 2, 3
- Slow Time 1, 2, 3
- Coin Tractor Beam 1, 2, 3
- Destroy All Enemies (Level 1 only)
- Boss Kill Shot (Level 1 only)

**Item Selection:**
- Click item to add to selected rank
- Specify quantity for each item
- Can add multiple items per rank
- Visual drag-and-drop (optional enhancement)

### Pool Rewards Configuration

**Pool Depth:**
- Number of players who receive pool-based rewards (e.g., top 3)
- Default: 3 (top 3 players)

**Pool Distribution:**
- Percentage allocation for each rank
- Must sum to 100%
- Visual slider or percentage input
- Default: 50%, 30%, 20% for top 3

**Pool Source Options:**
1. **Prize Pool** (default) - Percentage of tournament prize pool
2. **Fixed Amount** - Fixed USD amount per rank
3. **Custom** - Custom calculation (future)

### Reward Depth

**Definition:**
- Total number of players who receive any rewards (item rewards)
- Default: 10 (top 10 players)
- Can be adjusted (e.g., top 5, top 20, top 50)

**Relationship to Pool Depth:**
- Pool depth ≤ Reward depth
- Example: Reward depth = 10, Pool depth = 3 means:
  - Top 3 get pool rewards (tokens) + item rewards
  - Ranks 4-10 get item rewards only

### Default Configuration

**Tournament Defaults:**
- Reward Depth: 10 players
- Pool Depth: 3 players
- Pool Distribution: 50%, 30%, 20%
- Pool Source: Prize Pool (50% of total prize pool)
- Item Rewards:
  - Rank 1: Destroy All x1, Boss Kill Shot x1, Random Level 1 x1
  - Rank 2: Boss Kill Shot x1, Random Level 1 x1
  - Rank 3: Destroy All x1, Random Level 1 x1
  - Ranks 4-10: Random Level 1 x1 each

**Milestone Defaults:**
- Reward Depth: N/A (single player - each player claims individually)
- Pool Depth: N/A (no pool-based rewards)
- Credits: Based on milestone category and level
- Item Rewards: Based on milestone category and level
- **Note:** Milestones are single-player rewards, not rank-based like tournaments

**Daily Login Defaults:**
- Reward Depth: N/A (single player - each player claims their daily reward)
- Pool Depth: N/A (no pool-based rewards)
- Credits: Based on streak day (escalates with streak length)
- Item Rewards: Based on streak day (better rewards for longer streaks)
- Tickets: Optional tournament tickets (future)
- **Note:** Daily login rewards are streak-based, with rewards escalating every 7 days

## Milestone Reward Declaration & Distribution

### Current Milestone System

**Current State:**
- Milestones have embedded rewards in `MilestoneDefinition` struct
- Rewards are hardcoded in backend `AchievementService.milestoneDefinitions`
- No admin UI for creating/editing milestone rewards
- Rewards are declared when milestone is created via contract

**Milestone Reward Characteristics:**
- **Single Player**: Each player claims rewards individually (not rank-based)
- **Credits + Items**: Rewards consist of credits and items
- **Category-Based**: Different categories have different reward structures
- **Level-Based**: Each milestone level within a category has its own rewards

### Using Universal Reward UI for Milestones

**Milestone-Specific UI Configuration:**
- **Reward Type**: "Milestone" (different from "Tournament")
- **No Pool Rewards**: Pool depth and pool distribution are hidden/disabled
- **No Rank Selection**: Single reward set (not per-rank)
- **Credits Input**: Direct credits input field
- **Item Selection**: Select items from available pool
- **Category Context**: UI shows which category the milestone belongs to

**Milestone Creation/Editing Flow:**
```
1. Admin selects category (Games Played, Score, Coins, etc.)
   ↓
2. Admin selects milestone level (1, 2, 3, etc.)
   ↓
3. Admin sets threshold (e.g., 5 games, 10000 score)
   ↓
4. Reward Configuration (Universal Reward UI - Milestone Mode)
   - Credits: [Input field]
   - Items: [Select from available pool]
   - Preview: Shows what player receives
   ↓
5. Create/Update Milestone
   - Calls `add_milestone_definition()` or `update_milestone_definition()`
   - Stores rewards on-chain
```

**Universal Reward UI - Milestone Mode:**
```
┌─────────────────────────────────────────────────┐
│  Milestone Reward Configuration                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  Category: Games Played                         │
│  Level: 1                                       │
│  Threshold: 5 games                             │
│                                                 │
│  ┌─ Credits ───────────────────────────────┐  │
│  │  Credits Awarded: [1]                    │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌─ Item Rewards ───────────────────────────┐  │
│  │  Available Items Pool:                   │  │
│  │  [Orb Level 1] [Orb Level 2] [Orb Level 3]│  │
│  │  [Force Field] [Extra Lives] [Slow Time] │  │
│  │  [Coin Tractor] [Destroy All] [Boss Kill] │  │
│  │                                            │  │
│  │  Selected Items:                           │  │
│  │  ┌────────────────────────────────────┐   │  │
│  │  │ [Extra Lives L1 x1] [Remove]       │   │  │
│  │  │ [Orb Level L1 x1] [Remove]         │   │  │
│  │  │ [+ Add Item]                       │   │  │
│  │  └────────────────────────────────────┘   │  │
│  └────────────────────────────────────────────┘  │
│                                                 │
│  ┌─ Preview ────────────────────────────────┐  │
│  │  When a player reaches this milestone:    │  │
│  │  • Credits: 1                             │  │
│  │  • Items:                                 │  │
│  │    - Extra Lives Level 1 x1               │  │
│  │    - Orb Level Level 1 x1                 │  │
│  └────────────────────────────────────────────┘  │
│                                                 │
│  [Reset to Default]  [Save]  [Cancel]          │
└─────────────────────────────────────────────────┘
```

### Milestone Reward Distribution

**Distribution Flow:**
1. **Player Eligibility Check** (Backend)
   - Backend checks player stats against milestone thresholds
   - Checks if milestone has already been claimed
   - Returns list of eligible milestones

2. **Reward Distribution** (Backend)
   ```typescript
   // For each eligible milestone:
   // - Add credits to GamePass
   await gamePassService.addFreeCredits(playerAddress, credits);
   
   // - Add items to inventory
   await storeService.adminAddItems(playerAddress, items);
   ```

3. **Claim Marking** (On-Chain)
   ```typescript
   // Mark milestone as claimed on-chain
   await achievementService.claimMilestone(
     playerAddress, 
     category, 
     milestone_level
   );
   ```

**Key Differences from Tournaments:**
- **Individual Claims**: Each player claims their own rewards (not bulk distribution)
- **No Pool**: No pool-based rewards (no tokens, no percentage splits)
- **Automatic Detection**: Backend automatically detects eligible milestones
- **Player-Initiated**: Players can claim rewards via UI or automatic popup

### Milestone Management UI

**Admin Milestone Management:**
- **Create Milestone**: Wizard with Universal Reward UI
  - Step 1: Select Category
  - Step 2: Select Level
  - Step 3: Set Threshold
  - Step 4: Configure Rewards (Universal Reward UI)
  - Step 5: Review & Create

- **Edit Milestone**: 
  - Load existing milestone
  - Edit threshold, credits, or items
  - Use Universal Reward UI for item management
  - Save changes

- **Delete Milestone**: 
  - Remove milestone definition
  - (Note: Already claimed milestones remain tracked)

## Daily Login Reward Declaration & Distribution

### Current Daily Login System Status

**Current State:**
- Daily login rewards are **planned but not yet implemented**
- Design exists in `DAILY_LOGIN_REWARD_SYSTEM_PLAN.md`
- No contract implementation yet
- No admin UI yet

**Daily Login Reward Characteristics:**
- **Streak-Based**: Rewards scale with consecutive login days
- **Single Player**: Each player claims their daily reward individually
- **Escalating Rewards**: Rewards get better at milestones (Day 7, 14, 30, etc.)
- **Credits + Items + Tickets**: Can include all three reward types

### Using Universal Reward UI for Daily Login

**Daily Login-Specific UI Configuration:**
- **Reward Type**: "Daily Login" (different from "Tournament" and "Milestone")
- **No Pool Rewards**: Pool depth and pool distribution are hidden/disabled
- **No Rank Selection**: Single reward set per day
- **Day Selection**: Admin selects which streak day to configure (1, 2, 3... 7, 14, 30, etc.)
- **Credits Input**: Direct credits input field
- **Item Selection**: Select items from available pool
- **Ticket Input**: Optional tournament ticket input (future)

**Daily Login Reward Configuration Flow:**
```
1. Admin selects streak day (1, 2, 3, 7, 14, 30, etc.)
   ↓
2. Reward Configuration (Universal Reward UI - Daily Login Mode)
   - Credits: [Input field]
   - Items: [Select from available pool]
   - Tickets: [Input field] (optional, future)
   - Preview: Shows what player receives for this day
   ↓
3. Create/Update Daily Login Reward
   - Calls `add_daily_login_reward()` or `update_daily_login_reward()`
   - Stores reward on-chain
```

**Universal Reward UI - Daily Login Mode:**
```
┌─────────────────────────────────────────────────┐
│  Daily Login Reward Configuration               │
├─────────────────────────────────────────────────┤
│                                                 │
│  Streak Day: [7 ▼]                              │
│  (Day 7 of login streak)                        │
│                                                 │
│  ┌─ Credits ───────────────────────────────┐  │
│  │  Credits Awarded: [5]                    │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌─ Item Rewards ───────────────────────────┐  │
│  │  Available Items Pool:                   │  │
│  │  [Orb Level 1] [Orb Level 2] [Orb Level 3]│  │
│  │  [Force Field] [Extra Lives] [Slow Time] │  │
│  │  [Coin Tractor] [Destroy All] [Boss Kill] │  │
│  │                                            │  │
│  │  Selected Items:                           │  │
│  │  ┌────────────────────────────────────┐   │  │
│  │  │ [Orb Level L2 x1] [Remove]         │   │  │
│  │  │ [Force Field L1 x1] [Remove]       │   │  │
│  │  │ [+ Add Item]                       │   │  │
│  │  └────────────────────────────────────┘   │  │
│  └────────────────────────────────────────────┘  │
│                                                 │
│  ┌─ Tournament Tickets (Future) ─────────────┐  │
│  │  Tickets Awarded: [0]                     │  │
│  │  (Optional - leave 0 if no tickets)        │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌─ Preview ────────────────────────────────┐  │
│  │  When a player logs in on Day 7:          │  │
│  │  • Credits: 5                             │  │
│  │  • Items:                                 │  │
│  │    - Orb Level Level 2 x1                 │  │
│  │    - Force Field Level 1 x1               │  │
│  │  • Tickets: 0                             │  │
│  └────────────────────────────────────────────┘  │
│                                                 │
│  [Reset to Default]  [Save]  [Cancel]          │
└─────────────────────────────────────────────────┘
```

### Daily Login Reward Distribution

**Distribution Flow:**
1. **Player Login Detection** (Backend)
   - Backend detects player login
   - Checks last login date
   - Calculates current streak length
   - Verifies streak continuity (no gaps)

2. **Eligibility Check** (Backend)
   - Check if player logged in today
   - Check if reward for current streak day has been claimed
   - Get reward definition for current streak day

3. **Reward Distribution** (Backend)
   ```typescript
   // Get reward for current streak day
   const reward = getDailyLoginReward(currentStreakDay);
   
   // Distribute
   await gamePassService.addFreeCredits(playerAddress, reward.credits);
   await storeService.adminAddItems(playerAddress, reward.items);
   // Future: await gamePassService.addTickets(playerAddress, reward.tickets);
   ```

4. **Claim Marking** (On-Chain)
   ```typescript
   // Mark daily login reward as claimed
   await claimDailyLoginReward(playerAddress, currentStreakDay);
   ```

**Key Characteristics:**
- **Automatic**: Rewards are automatically distributed when player logs in
- **Streak-Based**: Rewards escalate with streak length (Day 7, 14, 30 get better rewards)
- **One Per Day**: Player can only claim one reward per day
- **Streak Continuity**: If player misses a day, streak resets to Day 1

### Daily Login Management UI

**Admin Daily Login Management:**
- **Create/Edit Daily Login Reward**: 
  - Select streak day (1-7, 14, 30, etc.)
  - Configure rewards using Universal Reward UI (daily login mode)
  - Save reward for that day
- **View All Daily Login Rewards**:
  - Table showing all configured days
  - Shows credits, items, tickets for each day
  - Can edit or delete any day's reward
- **Streak Configuration**:
  - Configure which days are milestone days (7, 14, 30, etc.)
  - Set default rewards for non-milestone days
  - Configure streak reset behavior

**Player-Facing Daily Login UI:**
- **Daily Login Modal**: 
  - Shows current streak length
  - Shows today's reward (if not yet claimed)
  - "Claim Reward" button
  - Calendar showing streak progress
- **Streak Progress**:
  - Visual indicator of current streak
  - Shows next milestone day (Day 7, 14, 30)
  - Shows rewards for upcoming milestone days

## Extending Existing Tournament Creation System

### Current Admin Tournament Creation

The existing admin tournament creation system (`TournamentsTab.tsx`) uses a wizard with these steps:
1. **Name** - Tournament name input
2. **Category** - Select category (High Score, Coins, Streak, etc.)
3. **Schedule** - Start/end date and time
4. **Entry Fee** - Number of tournament tickets required
5. **Review** - Review and create

**Current API:** `POST /api/admin/tournaments/create`
**Current Service:** `tournamentService.createWeeklyTournament()`

### Extending for Reward Configuration

We will **extend the existing wizard** by adding new steps:

**Updated Admin Wizard Flow:**
1. Name
2. Category
3. Schedule
4. Entry Fee
5. **Reward Configuration** (NEW) - Universal Reward UI
6. **Starting Ante** (NEW) - Optional prize pool contribution
7. Review & Create

**User Tournament Creation Flow:**
1. Name
2. Category
3. Schedule
4. Entry Fee
5. **Reward Configuration** - Universal Reward UI
6. **Starting Ante** - Optional prize pool contribution
7. **Review & Payment** - Review, pay creation fee + starting ante
8. Tournament Created

### Reusing Existing Components

**Frontend:**
- Reuse wizard structure from `TournamentsTab.tsx`
- Add new wizard steps for rewards and starting ante
- Extract wizard logic into reusable component (optional)
- Create user-facing version with payment step

**Backend:**
- Extend `POST /api/admin/tournaments/create` to accept:
  - `rewardConfig?: TournamentRewardConfig`
  - `startingAnteUsdCents?: number`
- Create new `POST /api/tournaments/create` for users:
  - Same structure as admin endpoint
  - Requires payment (creation fee + starting ante)
  - No admin wallet verification

**Service:**
- Extend `tournamentService.createWeeklyTournament()` to accept:
  - `rewardConfig?: TournamentRewardConfig`
  - `startingAnteUsdCents?: number`
  - `createdBy?: address` (for user-created tournaments)
- Add `tournamentService.createTournamentForUser()` (wrapper with payment)

### Tournament Creation Fee

**Purpose:**
- Prevents spam tournament creation
- Covers gas costs for on-chain creation
- Generates revenue

**Fee Structure:**
- Base fee: $X.XX (to be determined)
- Or: Percentage of starting ante (e.g., 10%)
- Or: Fixed amount in SUI/MEWS

**Payment Options:**
- SUI
- MEWS
- USDC

### Starting Ante

**Definition:**
- Initial prize pool contribution by tournament creator
- Added to prize pool before tournament starts
- Optional (can be $0)

**Purpose:**
- Attract players with guaranteed prize pool
- Allow creators to sponsor tournaments
- Create competitive events

**Display:**
- "Starting Prize Pool: $X.XX"
- "Your Contribution: $X.XX"
- "Total Prize Pool: $X.XX" (after entries)

### Reward Configuration Storage

**On-Chain Storage:**
```move
struct TournamentRewardConfig has store {
    reward_depth: u8,              // How many players get rewards
    pool_depth: u8,                 // How many players get pool rewards
    pool_distribution: vector<u64>,  // Percentages (must sum to 100)
    pool_source: u8,                // 0=Prize Pool, 1=Fixed, 2=Custom
    item_rewards: Table<u8, vector<ItemReward>>, // rank -> items
}

struct Tournament has key {
    // ... existing fields ...
    reward_config: Option<TournamentRewardConfig>, // If None, use default
    starting_ante_usd_cents: u64,  // Initial prize pool contribution
    created_by: address,            // Tournament creator
    creation_fee_paid: u64,         // Fee paid to create tournament
}
```

**Default vs Custom:**
- If `reward_config` is `None`: Use default tournament reward system
- If `reward_config` is `Some(...)`: Use custom configuration

## Implementation Components

### Frontend Components

1. **UniversalRewardSelector.vue/jsx**
   - Reusable reward selection component
   - Props: 
     - `rewardType: 'tournament' | 'milestone' | 'dailyLogin'`
     - `defaultConfig?: RewardConfig`
     - `onChange: (config: RewardConfig) => void`
   - Emits: `rewardConfig` object
   - **Mode-Specific Behavior:**
     - **Tournament Mode**: Shows pool rewards, reward depth, rank-based items
     - **Milestone Mode**: Shows credits input, single item list (no pool, no ranks)
     - **Daily Login Mode**: Shows credits, items, tickets (future)
   - Can be embedded in any wizard/form

2. **TournamentCreationWizard (Extended)**
   - **Admin Version:** Extend existing `TournamentsTab.tsx` wizard
     - Add step 5: Reward Configuration (uses UniversalRewardSelector with `rewardType='tournament'`)
     - Add step 6: Starting Ante
     - Update step 7: Review (show reward config and starting ante)
   - **User Version:** New component `UserTournamentCreationWizard.tsx`
     - Similar structure to admin wizard
     - Step 7: Review & Payment (instead of just Review)
     - Step 8: Payment Processing
     - Step 9: Success

3. **MilestoneManagementWizard.tsx** (New)
   - **Create Milestone:**
     - Step 1: Select Category
     - Step 2: Select Level
     - Step 3: Set Threshold
     - Step 4: Configure Rewards (uses UniversalRewardSelector with `rewardType='milestone'`)
     - Step 5: Review & Create
   - **Edit Milestone:**
     - Load existing milestone
     - Edit any field (threshold, credits, items)
     - Use UniversalRewardSelector for item management
     - Save changes

3. **RewardPreview.vue/jsx**
   - Visual preview of reward distribution
   - **Tournament Mode**: Shows what each rank receives, calculates estimated rewards based on prize pool
   - **Milestone Mode**: Shows what a single player receives when they claim the milestone
   - **Daily Login Mode**: Shows what player receives for current streak day
   - Used in Review step

### Backend API Endpoints

1. **POST /api/admin/tournaments/create** (Extended)
   - **Existing:** Admin tournament creation
   - **New Parameters:**
     - `rewardConfig?: TournamentRewardConfig` - Custom reward configuration
     - `startingAnteUsdCents?: number` - Initial prize pool contribution
   - **Behavior:** If `rewardConfig` not provided, uses default system

2. **POST /api/tournaments/create** (New)
   - User-created tournament creation
   - Requires authentication (user wallet)
   - Validates payment (creation fee + starting ante)
   - Creates tournament on-chain
   - Returns tournament ID
   - **Parameters:** Same as admin endpoint + payment info

3. **GET /api/rewards/available-items**
   - Returns list of available items for selection
   - Used by UniversalRewardSelector
   - Returns: `ItemReward[]` with item metadata

4. **POST /api/admin/milestones/create** (New)
   - Create milestone with rewards
   - Requires admin authentication
   - Parameters: `category`, `milestone_level`, `threshold`, `credits`, `items`
   - Creates milestone on-chain via `add_milestone_definition()`

5. **PUT /api/admin/milestones/[category]/[level]** (New)
   - Update milestone (threshold, credits, items)
   - Requires admin authentication
   - Uses granular update functions or full update

6. **DELETE /api/admin/milestones/[category]/[level]** (New)
   - Delete milestone definition
   - Requires admin authentication

7. **GET /api/tournaments/[id]/reward-config**
   - Get reward configuration for tournament
   - Returns: `TournamentRewardConfig` or `null` (if using default)

8. **PUT /api/tournaments/[id]/reward-config** (Future)
   - Update reward configuration (admin only, before tournament starts)
   - Used for editing tournament rewards

9. **POST /api/admin/daily-login/rewards** (New - Future)
   - Create/update daily login reward for a specific day
   - Requires admin authentication
   - Parameters: `day`, `credits`, `items`, `tickets`
   - Creates/updates reward on-chain via `add_daily_login_reward()` or `update_daily_login_reward()`

10. **GET /api/admin/daily-login/rewards** (New - Future)
   - Get all daily login rewards
   - Returns: Array of `{ day, credits, items, tickets }`

11. **GET /api/daily-login/current** (New - Future)
   - Get current player's daily login status
   - Returns: `{ streakLength, lastLoginDate, todayClaimed, todayReward }`
   - Used by player-facing daily login UI

### Contract Functions

**Extend Existing Function:**
1. **create_weekly_tournament** (Extended)
   ```move
   public entry fun create_weekly_tournament(
       registry: &mut TournamentRegistry,
       admin_cap: &AdminCapability,
       name: vector<u8>,
       category: u8,
       start_time: u64,
       end_time: u64,
       entry_fee_tickets: u64,
       reward_config: Option<TournamentRewardConfig>,  // NEW
       starting_ante_usd_cents: u64,                  // NEW
       clock: &Clock,
       ctx: &mut TxContext
   )
   ```
   - If `starting_ante_usd_cents > 0`, initialize `prize_pool_usd_cents` to that value
   - Store `reward_config` in `Tournament` struct
   - If `reward_config` is `None`, use default reward system

**New Function:**
2. **create_tournament_for_user**
   ```move
   public entry fun create_tournament_for_user(
       registry: &mut TournamentRegistry,
       name: vector<u8>,
       category: u8,
       start_time: u64,
       end_time: u64,
       entry_fee_tickets: u64,
       reward_config: Option<TournamentRewardConfig>,
       starting_ante_usd_cents: u64,
       clock: &Clock,
       ctx: &mut TxContext
   )
   ```
   - Similar to `create_weekly_tournament` but no admin cap required
   - User pays creation fee + starting ante before calling this
   - Sets `created_by` field to user's address

3. **add_to_prize_pool** (Future Enhancement)
   ```move
   public entry fun add_to_prize_pool(
       tournament: &mut Tournament,
       amount_usd_cents: u64,
       clock: &Clock
   )
   ```
   - Allows adding to prize pool after tournament creation
   - Can be called by tournament creator or admin

## Reward Distribution Logic

### Custom Reward Configuration

**When `reward_config` is set:**

1. **Item Rewards:**
   - Use `item_rewards` table for each rank
   - Distribute items as specified

2. **Pool Rewards:**
   - If `pool_source == 0` (Prize Pool):
     - Calculate pool amount from prize pool
     - Distribute according to `pool_distribution`
   - If `pool_source == 1` (Fixed Amount):
     - Use fixed amounts per rank
   - If `pool_source == 2` (Custom):
     - Use custom calculation (future)

3. **Reward Depth:**
   - Only distribute to top `reward_depth` players
   - Ranks beyond `reward_depth` receive nothing

### Default Reward Configuration

**When `reward_config` is `None`:**

- Use existing default tournament reward system:
  - 50% of prize pool to players
  - Top 3 get MEWS tokens (50%, 30%, 20%)
  - Top 10 get items (rank-based)

## User Experience Flow

### Creating a Tournament

1. **User navigates to "Create Tournament"**
   - Button visible to all authenticated users
   - Shows creation fee upfront

2. **Fill Basic Info**
   - Name, category, dates, entry fee
   - Validation: dates must be in future, entry fee > 0

3. **Configure Rewards**
   - Universal Reward UI loads with defaults
   - User can:
     * Adjust reward depth (slider or input)
     * Adjust pool depth (slider or input)
     * Adjust pool distribution (percentage inputs)
     * Add/remove items per rank
   - Preview updates in real-time

4. **Add Starting Ante (Optional)**
   - Input field for USD amount
   - Shows total cost (creation fee + starting ante)
   - Can skip (set to $0)

5. **Review & Pay**
   - Summary of tournament details
   - Summary of reward configuration
   - Total cost breakdown
   - Payment button (SUI/MEWS/USDC)

6. **Tournament Created**
   - Success message
   - Redirect to tournament details page
   - Tournament appears in active tournaments list

### Viewing Tournament Rewards

- Tournament details page shows:
  - Reward configuration (if custom)
  - Starting ante amount
  - Current prize pool
  - Estimated rewards per rank (based on current prize pool)

## Security & Validation

### Tournament Creation Validation

1. **User Authentication:**
   - Must be authenticated
   - Wallet must be connected

2. **Payment Validation:**
   - Creation fee must be paid
   - Starting ante (if provided) must be paid
   - Payment must be sufficient

3. **Tournament Validation:**
   - Dates must be valid (start < end, both in future)
   - Entry fee must be > 0
   - Category must be valid
   - Name must not be empty

4. **Reward Configuration Validation:**
   - Pool distribution must sum to 100%
   - Pool depth ≤ Reward depth
   - Item quantities must be > 0
   - Reward depth must be > 0

### Access Control

- **Tournament Creation:** All authenticated users
- **Tournament Editing:** Only creator (future) or admin
- **Reward Distribution:** Backend service (admin-only)

## Future Enhancements

1. **Reward Templates:**
   - Save reward configurations as templates
   - Reuse templates across tournaments
   - Share templates with community

2. **Advanced Pool Sources:**
   - Custom calculation formulas
   - Tiered pool distributions
   - Dynamic pool adjustments

3. **Tournament Sponsorship:**
   - Multiple sponsors can contribute to prize pool
   - Sponsor recognition in tournament details
   - Sponsor rewards/badges

4. **Reward Preview Calculator:**
   - Estimate rewards based on projected entries
   - Show "if X players enter, rank 1 gets Y"
   - Help users set appropriate entry fees

5. **Milestone Integration:**
   - Use Universal Reward UI for milestone creation
   - Consistent reward selection across all systems

## Implementation Priority

1. **Phase 1: Universal Reward UI Component**
   - Build `UniversalRewardSelector` component
   - Support multiple modes: `tournament`, `milestone`, `dailyLogin`
   - Create `RewardPreview` component (mode-aware)
   - Test component in isolation
   - Define TypeScript interfaces:
     - `TournamentRewardConfig`
     - `MilestoneRewardConfig`
     - `DailyLoginRewardConfig`

2. **Phase 2: Milestone Management UI**
   - Create `MilestoneManagementWizard` component
   - Integrate `UniversalRewardSelector` in milestone mode
   - Create `POST /api/admin/milestones/create` API
   - Create `PUT /api/admin/milestones/[category]/[level]` API
   - Create `DELETE /api/admin/milestones/[category]/[level]` API
   - Add milestone management tab to admin UI
   - Test milestone creation/editing flow

3. **Phase 3: Extend Admin Tournament Creation**
   - Add reward configuration step to existing admin wizard
   - Add starting ante step to existing admin wizard
   - Extend `POST /api/admin/tournaments/create` API
   - Extend `tournamentService.createWeeklyTournament()` service
   - Update contract `create_weekly_tournament()` function
   - Test with admin creation flow

4. **Phase 4: Custom Reward Distribution Logic**
   - Update `RewardsService` to handle custom tournament reward configs
   - Implement distribution logic for custom configs
   - Fallback to default system if config is `None`
   - Test reward distribution with custom configs
   - **Note:** Milestone distribution already works (via `AchievementService`)

5. **Phase 5: User Tournament Creation (Basic)**
   - Create `UserTournamentCreationWizard` component
   - Create `POST /api/tournaments/create` API endpoint
   - Implement payment processing (creation fee + starting ante)
   - Create `create_tournament_for_user` contract function
   - Test user creation flow

6. **Phase 6: Daily Login Reward System**
   - Implement daily login contract functions
   - Create daily login management UI (admin)
   - Integrate Universal Reward UI for daily login mode
   - Create player-facing daily login UI
   - Implement streak tracking and reward distribution
   - Test daily login flow

7. **Phase 7: Enhancements**
   - Reward templates (save/load configurations)
   - Prize pool additions after creation
   - Advanced pool sources
   - Community features
   - Ticket rewards (add to milestones and daily login)

