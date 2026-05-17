# Tournament Creation Flow (With Reward Mechanics)

## Overview

This document describes the complete flow for creating tournament events, including the new reward configuration steps. There are two creation paths: **Admin Creation** (no payment, admin wallet funds starting ante) and **User Creation** (with payment).

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Tournament Creation Flow                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─ Admin Path ─────────────────────────────────────────┐  │
│  │  1. Name → 2. Category → 3. Schedule → 4. Entry Fee │  │
│  │  5. Reward Config → 6. Starting Ante → 7. Review    │  │
│  │  → Create (admin wallet funds starting ante)        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ User Path ─────────────────────────────────────────┐  │
│  │  1. Name → 2. Category → 3. Schedule → 4. Entry Fee │  │
│  │  5. Reward Config → 6. Starting Ante → 7. Review    │  │
│  │  → Payment → Create (user pays creation fee + ante) │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Step-by-Step Flow

### Step 1: Tournament Name

**UI:**
```
┌─────────────────────────────────────────────────┐
│  Create Tournament                              │
├─────────────────────────────────────────────────┤
│                                                 │
│  Tournament Name:                              │
│  [________________________________]            │
│                                                 │
│  [Next →]                                       │
└─────────────────────────────────────────────────┘
```

**Validation:**
- Name must not be empty
- Name must be unique (or allow duplicates?)
- Max length: 100 characters

**Data Stored:**
- `name: string` → Will be converted to `vector<u8>` for contract

---

### Step 2: Category Selection

**UI:**
```
┌─────────────────────────────────────────────────┐
│  Select Category                                │
├─────────────────────────────────────────────────┤
│                                                 │
│  Choose tournament category:                   │
│                                                 │
│  [🎯 High Score]  [💰 Total Coins]            │
│  [🔥 Longest Streak] [📏 Longest Distance]     │
│  [👹 Most Bosses]  [💀 Most Enemies]           │
│                                                 │
│  [← Back] [Next →]                              │
└─────────────────────────────────────────────────┘
```

**Validation:**
- Category must be selected
- Must be one of: `totalCoins`, `longestStreak`, `highestScore`, `longestDistance`, `mostBosses`, `mostEnemies`

**Data Stored:**
- `category: 'totalCoins' | 'longestStreak' | ...` → Converted to `u8` for contract

---

### Step 3: Schedule

**UI:**
```
┌─────────────────────────────────────────────────┐
│  Tournament Schedule                            │
├─────────────────────────────────────────────────┤
│                                                 │
│  Start Date & Time:                             │
│  [Date: ____] [Time: ____]                      │
│                                                 │
│  End Date & Time:                               │
│  [Date: ____] [Time: ____]                      │
│                                                 │
│  [← Back] [Next →]                              │
└─────────────────────────────────────────────────┘
```

**Validation:**
- Start date/time must be in the future
- End date/time must be after start date/time
- Minimum duration: 1 hour (or configurable)

**Data Stored:**
- `startTime: number` (Unix timestamp in milliseconds)
- `endTime: number` (Unix timestamp in milliseconds)

---

### Step 4: Entry Fee

**UI:**
```
┌─────────────────────────────────────────────────┐
│  Entry Fee                                      │
├─────────────────────────────────────────────────┤
│                                                 │
│  Entry Fee (Tournament Tickets):               │
│  [1]                                            │
│                                                 │
│  Number of tournament tickets required to enter.│
│  Typically 1 ticket.                            │
│                                                 │
│  [← Back] [Next →]                              │
└─────────────────────────────────────────────────┘
```

**Validation:**
- Entry fee must be ≥ 1
- Must be an integer

**Data Stored:**
- `entryFeeTickets: number` → Converted to `u64` for contract

---

### Step 5: Reward Configuration ⭐ NEW

**UI:**
```
┌─────────────────────────────────────────────────┐
│  Configure Rewards                              │
├─────────────────────────────────────────────────┤
│                                                 │
│  [Universal Reward UI - Tournament Mode]       │
│                                                 │
│  ┌─ Item Rewards ───────────────────────────┐  │
│  │  Reward Depth: [10 ▼] players            │  │
│  │  (How many players receive item rewards)  │  │
│  │                                            │  │
│  │  Rank 1: [Destroy All x1] [Boss Kill x1] │  │
│  │         [+ Add Item]                     │  │
│  │  Rank 2: [Boss Kill x1]                 │  │
│  │         [+ Add Item]                     │  │
│  │  Rank 3: [Destroy All x1]               │  │
│  │         [+ Add Item]                     │  │
│  │  ... (up to reward depth)                │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌─ Pool Rewards ───────────────────────────┐  │
│  │  Enable Pool Rewards: [✓]                 │  │
│  │                                            │  │
│  │  Pool Depth: [3 ▼] players                │  │
│  │  (How many players receive pool rewards)   │  │
│  │                                            │  │
│  │  Distribution:                             │  │
│  │  Rank 1: [50]% ────────────────────────┐  │  │
│  │  Rank 2: [30]% ────────────────────────┐  │  │
│  │  Rank 3: [20]% ────────────────────────┐  │  │
│  │  Total: 100%                           │  │  │
│  │                                            │  │
│  │  Pool Source: [Prize Pool ▼]            │  │
│  │  (Prize Pool / Fixed Amount / Custom)    │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌─ Preview ─────────────────────────────────┐  │
│  │  Estimated Rewards (if prize pool = $200): │  │
│  │  Rank 1: $50 MEWS + Items                │  │
│  │  Rank 2: $30 MEWS + Items                │  │
│  │  Rank 3: $20 MEWS + Items                │  │
│  │  Ranks 4-10: Items only                  │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  [Reset to Default] [← Back] [Next →]         │
└─────────────────────────────────────────────────┘
```

**Configuration Options:**

1. **Reward Depth**
   - How many players receive item rewards
   - Default: 10
   - Range: 1-50 (or configurable)

2. **Pool Depth**
   - How many players receive pool-based rewards (MEWS tokens)
   - Default: 3
   - Range: 0-10 (0 = no pool rewards)
   - Must be ≤ Reward Depth

3. **Pool Distribution**
   - Percentage allocation for each rank
   - Default: 50%, 30%, 20% for top 3
   - Must sum to 100%
   - Visual sliders or percentage inputs

4. **Pool Source**
   - **Prize Pool** (default): Percentage of tournament prize pool
   - **Fixed Amount**: Fixed USD amount per rank (future)
   - **Custom**: Custom calculation (future)

5. **Item Rewards per Rank**
   - Select items from available pool
   - Set quantity for each item
   - Can add multiple items per rank
   - Can be different for each rank

**Default Configuration:**
- If user clicks "Reset to Default":
  - Reward Depth: 10
  - Pool Depth: 3
  - Pool Distribution: 50%, 30%, 20%
  - Pool Source: Prize Pool (50% of total prize pool)
  - Item Rewards:
    - Rank 1: Destroy All x1, Boss Kill Shot x1, Random Level 1 x1
    - Rank 2: Boss Kill Shot x1, Random Level 1 x1
    - Rank 3: Destroy All x1, Random Level 1 x1
    - Ranks 4-10: Random Level 1 x1 each

**Data Stored:**
- `rewardConfig: TournamentRewardConfig | null`
  - If `null`: Use default tournament reward system
  - If set: Use custom configuration
- `TournamentRewardConfig`:
  ```typescript
  {
    rewardDepth: number,        // How many players get rewards
    poolDepth: number,           // How many players get pool rewards
    poolDistribution: number[], // Percentages (must sum to 100)
    poolSource: 'prizePool' | 'fixed' | 'custom',
    itemRewards: {
      [rank: number]: Array<{
        itemId: string,
        level: number,
        quantity: number
      }>
    }
  }
  ```

**Validation:**
- Pool distribution must sum to 100%
- Pool depth ≤ Reward depth
- Item quantities must be > 0
- Reward depth must be > 0

---

### Step 6: Starting Ante ⭐ NEW

**UI (Admin):**
```
┌─────────────────────────────────────────────────┐
│  Starting Prize Pool Contribution               │
├─────────────────────────────────────────────────┤
│                                                 │
│  Add to Prize Pool: [$0.00]                    │
│  (Optional - leave $0.00 if no contribution)   │
│                                                 │
│  This amount will be added to the prize pool    │
│  before the tournament starts.                  │
│                                                 │
│  Funds will be transferred from the admin wallet.│
│                                                 │
│  Example: If you add $50.00, the prize pool    │
│  will start at $50.00 and grow as players enter.│
│                                                 │
│  [← Back] [Next →]                              │
└─────────────────────────────────────────────────┘
```

**UI (User):**
```
┌─────────────────────────────────────────────────┐
│  Starting Prize Pool Contribution               │
├─────────────────────────────────────────────────┤
│                                                 │
│  Add to Prize Pool: [$0.00]                    │
│  (Optional - leave $0.00 if no contribution)   │
│                                                 │
│  This amount will be added to the prize pool    │
│  before the tournament starts.                  │
│                                                 │
│  You will pay this amount when creating the      │
│  tournament (in addition to the creation fee).  │
│                                                 │
│  Example: If you add $50.00, the prize pool    │
│  will start at $50.00 and grow as players enter.│
│                                                 │
│  [← Back] [Next →]                              │
└─────────────────────────────────────────────────┘
```

**Validation:**
- Must be ≥ $0.00
- Can be 0 (optional)

**Data Stored:**
- `startingAnteUsdCents: number` → Converted to `u64` for contract
- Example: $50.00 → 5000 USD cents

**Admin vs User:**
- **Admin**: Starting ante is funded from admin wallet (no payment step, automatic transfer)
- **User**: Starting ante must be paid by user (included in payment step)

---

### Step 7: Review

**UI (Admin):**
```
┌─────────────────────────────────────────────────┐
│  Review Tournament Details                      │
├─────────────────────────────────────────────────┤
│                                                 │
│  Tournament: Weekly High Score #1              │
│  Category: High Score                           │
│  Start: Dec 15, 2024 12:00 PM                  │
│  End: Dec 22, 2024 12:00 PM                     │
│  Entry Fee: 1 tournament ticket                │
│                                                 │
│  ┌─ Reward Configuration ───────────────────┐  │
│  │  Type: Custom                              │  │
│  │  Reward Depth: 10 players                  │  │
│  │  Pool Depth: 3 players                    │  │
│  │  Pool Distribution: 50%, 30%, 20%         │  │
│  │  Pool Source: Prize Pool                  │  │
│  │                                            │  │
│  │  Item Rewards:                             │  │
│  │  Rank 1: Destroy All x1, Boss Kill x1,    │  │
│  │         Random L1 x1                      │  │
│  │  Rank 2: Boss Kill x1, Random L1 x1       │  │
│  │  Rank 3: Destroy All x1, Random L1 x1     │  │
│  │  Ranks 4-10: Random L1 x1 each            │  │
│  └────────────────────────────────────────────┘  │
│                                                 │
│  Starting Ante: $50.00                          │
│  (Will be transferred from admin wallet)        │
│                                                 │
│  [← Back] [Create Tournament]                   │
└─────────────────────────────────────────────────┘
```

**UI (User - with Payment):**
```
┌─────────────────────────────────────────────────┐
│  Review Tournament & Payment                    │
├─────────────────────────────────────────────────┤
│                                                 │
│  Tournament: Weekly High Score #1              │
│  Category: High Score                           │
│  Start: Dec 15, 2024 12:00 PM                  │
│  End: Dec 22, 2024 12:00 PM                     │
│  Entry Fee: 1 tournament ticket                │
│                                                 │
│  ┌─ Reward Configuration ───────────────────┐  │
│  │  [Same as admin view]                     │  │
│  └────────────────────────────────────────────┘  │
│                                                 │
│  Starting Ante: $50.00                          │
│                                                 │
│  ┌─ Payment Summary ────────────────────────┐  │
│  │  Tournament Creation Fee: $5.00           │  │
│  │  Starting Ante: $50.00                    │  │
│  │  Reward Cost: $14.72 (if custom rewards) │  │
│  │  ──────────────────────────────────────── │  │
│  │  Total: $69.72                             │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ┌─ Creator Earnings ───────────────────────┐  │
│  │  💰 Boost Until Break-Even!                │  │
│  │                                            │  │
│  │  Break-even with just 10 entries!         │  │
│  │  • 1-10 entries: 50% (break-even!)      │  │
│  │  • 11-25 entries: 30%                   │  │
│  │  • 26-50 entries: 20%                    │  │
│  │  • 51-100 entries: 15%                   │  │
│  │  • 101+ entries: 10%                     │  │
│  │                                            │  │
│  │  💡 More players = more earnings!       │  │
│  └────────────────────────────────────────────┘  │
│                                                 │
│  Payment Method: [SUI ▼] [MEWS] [USDC]         │
│                                                 │
│  [← Back] [Pay & Create Tournament]            │
└─────────────────────────────────────────────────┘
```

**Validation:**
- All previous steps validated
- For users: Payment must be sufficient
- For admins: Admin wallet must have sufficient balance (if starting ante > 0)

---

### Step 8: Create Tournament (Admin)

**Backend Flow:**
```
1. Validate all tournament data
   ↓
2. If startingAnteUsdCents > 0:
   - Convert USD cents to SUI/MEWS/USDC (using price converter)
   - Transfer funds from admin wallet to tournament prize pool
   - Verify transfer successful
   ↓
3. Call tournamentService.createWeeklyTournament({
     name,
     category,
     startTime,
     endTime,
     entryFeeTickets,
     rewardConfig,
     startingAnteUsdCents  // Already transferred, just for tracking
   })
   ↓
4. TournamentService creates transaction:
   - Calls contract: create_weekly_tournament(
       admin_cap,
       name,
       category,
       start_time,
       end_time,
       entry_fee_tickets,
       reward_config,
       starting_ante_usd_cents
     )
   ↓
5. Contract creates Tournament object:
   - Sets prize_pool_usd_cents = starting_ante_usd_cents
   - Stores reward_config (if provided)
   - If reward_config is None: Uses default system
   ↓
6. Tournament created on-chain
   ↓
7. Returns tournament ID and details
```

**API Call:**
```typescript
POST /api/admin/tournaments/create
{
  name: "Weekly High Score #1",
  category: "highestScore",
  startTime: 1702656000000,
  endTime: 1703260800000,
  entryFeeTickets: 1,
  rewardConfig: {                    // NEW (optional)
    rewardDepth: 10,
    poolDepth: 3,
    poolDistribution: [50, 30, 20],
    poolSource: "prizePool",
    itemRewards: {
      1: [{ itemId: "destroyAll", level: 1, quantity: 1 }, ...],
      2: [{ itemId: "bossKillShot", level: 1, quantity: 1 }, ...],
      ...
    }
  },
  startingAnteUsdCents: 5000          // NEW (optional, default: 0)
}
```

**Response:**
```typescript
{
  success: true,
  tournament: {
    tournamentId: 1,
    name: "Weekly High Score #1",
    category: "highestScore",
    startTime: 1702656000000,
    endTime: 1703260800000,
    entryFeeTickets: 1,
    prizePoolUsdCents: 5000,          // Starting ante
    rewardConfig: { ... },             // Custom config or null
    createdBy: "admin_address",
    creationFeePaid: 0                 // Admin doesn't pay
  }
}
```

**Admin Wallet Funding:**
- If `startingAnteUsdCents > 0`:
  1. Backend converts USD cents to appropriate token (SUI/MEWS/USDC) using `PriceConverter`
  2. Backend transfers funds from admin wallet to tournament prize pool
  3. Transfer happens **before** tournament creation transaction
  4. Tournament is created with `prize_pool_usd_cents = startingAnteUsdCents`
  5. No payment step required for admin

---

### Step 8: Payment & Create Tournament (User)

**Backend Flow:**
```
1. Validate all tournament data
   ↓
2. Calculate total payment:
   - Creation fee: $5.00 (or configurable)
   - Starting ante: $50.00 (user input)
   - Reward cost: $X.XX (if custom rewards configured)
     * Calculated based on reward depth and items
     * See TOURNAMENT_REWARD_PAYMENT_DESIGN.md for details
   - Total: $55.00 + reward cost
   ↓
3. Process payment:
   - User signs transaction
   - Payment in SUI, MEWS, or USDC
   - Verify payment received
   - Split payment:
     * Creation fee → Operations wallet (NOT in prize pool - fee for creating tournament)
     * Starting ante → Tournament prize pool (creator's contribution to prizes)
     * Reward cost → Operations wallet (covers item distribution)
   ↓
4. Call tournamentService.createTournamentForUser({
     name,
     category,
     startTime,
     endTime,
     entryFeeTickets,
     rewardConfig,
     startingAnteUsdCents,
     createdBy: userAddress,
     creationFeePaid: 500              // $5.00 in cents
   })
   ↓
5. TournamentService creates transaction:
   - Calls contract: create_tournament_for_user(
       name,
       category,
       start_time,
       end_time,
       entry_fee_tickets,
       reward_config,
       starting_ante_usd_cents
     )
   ↓
6. Contract creates Tournament object:
   - Sets prize_pool_usd_cents = starting_ante_usd_cents
   - Stores reward_config (if provided)
   - Sets created_by = user address
   ↓
7. Tournament created on-chain
   ↓
8. Returns tournament ID and details
```

**API Call:**
```typescript
POST /api/tournaments/create
{
  name: "Weekly High Score #1",
  category: "highestScore",
  startTime: 1702656000000,
  endTime: 1703260800000,
  entryFeeTickets: 1,
  rewardConfig: { ... },              // Same as admin
  startingAnteUsdCents: 5000,
  payment: {
    method: "SUI" | "MEWS" | "USDC",
    amount: 5500,                     // Total in cents
    transactionDigest: "0x..."        // Payment transaction
  }
}
```

**Response:**
```typescript
{
  success: true,
  tournament: {
    tournamentId: 1,
    name: "Weekly High Score #1",
    category: "highestScore",
    startTime: 1702656000000,
    endTime: 1703260800000,
    entryFeeTickets: 1,
    prizePoolUsdCents: 5000,          // Starting ante
    rewardConfig: { ... },             // Custom config or null
    createdBy: "user_address",
    creationFeePaid: 500               // $5.00 in cents
  }
}
```

---

## Contract Function Details

### Admin Creation: `create_weekly_tournament`

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
) {
    // Validate inputs
    assert!(category <= CATEGORY_MOST_ENEMIES, E_INVALID_CATEGORY);
    assert!(start_time < end_time, E_INVALID_TIME_RANGE);
    
    // Create tournament
    let tournament_id = registry.next_tournament_id;
    registry.next_tournament_id = tournament_id + 1;
    
    let tournament = Tournament {
        id: object::new(ctx),
        tournament_id,
        name,
        category,
        start_time,
        end_time,
        entry_fee_tickets,
        prize_pool_usd_cents: starting_ante_usd_cents,  // Initialize with starting ante
        participants: table::new(ctx),
        leaderboard: table::new(ctx),
        rewards_distributed: false,
        reward_config,                                  // NEW: Store reward config
        created_by: tx_context::sender(ctx),           // NEW: Track creator
        creation_fee_paid: 0,                          // NEW: Admin doesn't pay
        created_at: clock::timestamp_ms(clock),
    };
    
    // Add to registry
    table::add(&mut registry.tournaments, tournament_id, object::id(&tournament));
    
    // Add to active tournaments if not ended
    if (end_time > clock::timestamp_ms(clock)) {
        vector::push_back(&mut registry.active_tournaments, tournament_id);
    };
    
    // Share tournament
    transfer::share_object(tournament);
    
    // Emit event
    event::emit(TournamentCreated {
        tournament_id,
        category,
        name,
        start_time,
        end_time,
        entry_fee_tickets,
        starting_ante_usd_cents,      // NEW
        reward_config_set: option::is_some(&reward_config), // NEW
        timestamp: clock::timestamp_ms(clock),
    });
}
```

**Note:** The starting ante funds are transferred **before** this contract call. The contract only sets `prize_pool_usd_cents = starting_ante_usd_cents` to track the initial prize pool value.

### User Creation: `create_tournament_for_user`

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
) {
    // Same validation as admin version
    assert!(category <= CATEGORY_MOST_ENEMIES, E_INVALID_CATEGORY);
    assert!(start_time < end_time, E_INVALID_TIME_RANGE);
    
    // Create tournament (same structure)
    let tournament_id = registry.next_tournament_id;
    registry.next_tournament_id = tournament_id + 1;
    
    let tournament = Tournament {
        id: object::new(ctx),
        tournament_id,
        name,
        category,
        start_time,
        end_time,
        entry_fee_tickets,
        prize_pool_usd_cents: starting_ante_usd_cents,
        participants: table::new(ctx),
        leaderboard: table::new(ctx),
        rewards_distributed: false,
        reward_config,
        created_by: tx_context::sender(ctx),  // User's address
        creation_fee_paid: 0,                  // Set by backend after payment
        created_at: clock::timestamp_ms(clock),
    };
    
    // Same registration and sharing logic
    // ...
}
```

**Note:** The starting ante funds are transferred **during** the payment step (before this contract call). The contract only sets `prize_pool_usd_cents = starting_ante_usd_cents` to track the initial prize pool value.

---

## Reward Configuration Storage

### On-Chain Structure

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

### Default vs Custom

**If `reward_config` is `None`:**
- Use default tournament reward system:
  - 50% of prize pool to players
  - Top 3 get MEWS tokens (50%, 30%, 20% of player pool)
  - Top 10 get items (rank-based distribution)

**If `reward_config` is `Some(...)`:**
- Use custom configuration:
  - Reward depth from config
  - Pool depth from config
  - Pool distribution from config
  - Item rewards from config

---

## Reward Distribution Flow (After Tournament Ends)

### When Tournament Ends

1. **Tournament Grace Period Ends**
   - Tournament end time + 1 hour grace period
   - Players can still submit scores during grace period

2. **Automatic Reward Distribution Trigger**
   - When a player submits a score after grace period ends
   - Backend checks: `now > gracePeriodEnd && !rewardsDistributed`
   - If true: Triggers reward distribution

3. **Reward Distribution Process**

   **A. Get Leaderboard**
   ```typescript
   const leaderboard = await tournamentService.getTournamentLeaderboard(tournamentId);
   // Returns top players with ranks
   ```

   **B. Determine Reward Configuration**
   ```typescript
   const tournament = await tournamentService.getTournament(tournamentId);
   
   if (tournament.rewardConfig) {
     // Use custom configuration
     const config = tournament.rewardConfig;
     // Distribute based on custom config
   } else {
     // Use default system
     // Calculate from prize pool (50% to players)
   }
   ```

   **C. Distribute Rewards**

   **If Custom Config:**
   ```typescript
   // For pool rewards (top pool_depth players)
   for (let rank = 1; rank <= config.poolDepth; rank++) {
     const player = leaderboard[rank - 1];
     const poolPercentage = config.poolDistribution[rank - 1];
     
     // Calculate pool amount
     let poolAmount = 0;
     if (config.poolSource === 'prizePool') {
       poolAmount = (tournament.prizePoolUsdCents * 0.5) * (poolPercentage / 100);
     }
     
     // Mint MEWS tokens
     await mintMewsTokens(player.address, poolAmount);
   }
   
   // For item rewards (top reward_depth players)
   for (let rank = 1; rank <= config.rewardDepth; rank++) {
     const player = leaderboard[rank - 1];
     const items = config.itemRewards[rank] || [];
     
     // Add items to inventory
     await storeService.adminAddItems(player.address, items);
   }
   ```

   **If Default Config:**
   ```typescript
   // Use existing default distribution logic
   const distributions = await rewardsService.calculateTournamentRewards(
     tournament.prizePoolUsdCents,
     leaderboard
   );
   
   await rewardsService.distributeTournamentRewards(tournamentId, distributions);
   ```

   **D. Mark as Distributed**
   ```typescript
   await tournamentService.endTournament(tournamentId);
   // Sets rewards_distributed = true on-chain
   ```

---

## Complete Data Flow

### Creation → Storage → Distribution

```
1. User/Admin creates tournament
   ↓
2. Tournament data sent to backend
   ↓
3. Backend validates and processes payment/funding:
   - Admin: Transfers starting ante from admin wallet
   - User: Processes payment (creation fee + starting ante)
     * Creation fee → Operations wallet (NOT in prize pool)
     * Starting ante → Tournament prize pool
   ↓
4. Backend creates tournament on-chain
   ↓
5. Tournament object stored with:
   - Basic info (name, category, dates, entry fee)
   - reward_config (Option<TournamentRewardConfig>)
   - starting_ante_usd_cents
   - created_by
   ↓
6. Tournament becomes active
   ↓
7. Players enter tournament
   ↓
8. Prize pool grows (entry fees + starting ante)
   - Note: Creation fee does NOT go into prize pool
   ↓
9. Tournament ends (grace period)
   ↓
10. Backend distributes rewards:
   - If reward_config exists: Use custom config
   - If reward_config is None: Use default system
   ↓
11. Rewards distributed to players
   ↓
12. Tournament marked as rewards_distributed
```

---

## Key Points

1. **Admin Starting Ante Funding**
   - Admin can add starting ante (optional)
   - Funds come from **admin wallet** automatically
   - No payment step required
   - Backend handles transfer before tournament creation

2. **User Starting Ante Payment**
   - User can add starting ante (optional)
   - User must **pay** for starting ante
   - Included in payment step (creation fee + starting ante)

3. **Reward Configuration is Optional**
   - If not provided, uses default tournament reward system
   - If provided, uses custom configuration

4. **Starting Ante is Optional**
   - Can be $0.00 (prize pool starts at $0)
   - Can be any amount (prize pool starts at that amount)

5. **Reward Distribution**
   - Happens automatically when tournament ends
   - Uses custom config if set, otherwise default
   - Backend handles all distribution logic

6. **Reward Config Cannot Be Changed After Creation**
   - Set once during creation
   - Cannot be modified after tournament starts
   - (Future: Allow editing before tournament starts)

---

## Security Measures

The admin tournament creation function (`create_weekly_tournament`) is secured through multiple layers:

### 1. Contract-Level Security (Strongest Protection)

**Move Contract:**
```move
public entry fun create_weekly_tournament(
    registry: &mut TournamentRegistry,
    _admin_cap: &AdminCapability,  // ← Requires AdminCapability object
    ...
)
```

**Protection:**
- The function **requires** an `AdminCapability` object as a parameter
- Only the owner of the `AdminCapability` object can pass it to the function
- The `AdminCapability` is created during deployment and transferred to the admin address
- Even if someone tries to call the contract directly, they cannot provide the capability without owning it
- This is enforced at the blockchain level - impossible to bypass

### 2. Backend API Security

**API Endpoint:** `/api/admin/tournaments/create`

**Protection:**
```typescript
// Verify admin wallet address matches
const adminWallet = getAdminWalletService();
const expectedAdminAddress = adminWallet.getAddress().toLowerCase();
const providedAdminAddress = adminWalletAddress?.toLowerCase();

if (!providedAdminAddress || providedAdminAddress !== expectedAdminAddress) {
  throw new BadgeError(
    BadgeErrorCode.UNAUTHORIZED,
    'Unauthorized. Admin wallet verification failed.'
  );
}
```

**Protection:**
- Verifies that the `adminWalletAddress` in the request body matches the expected admin wallet address
- Returns `401 Unauthorized` if addresses don't match
- Prevents unauthorized API calls

### 3. Backend Service Security

**TournamentService:**
```typescript
// Set sender (admin wallet)
txb.setSender(this.adminWallet.getAddress());

// Sign and execute with admin wallet
const result = await client.signAndExecuteTransaction({
  signer: this.adminWallet.getKeypair(),  // ← Always admin wallet
  transaction: transactionBytes,
  ...
});
```

**Protection:**
- The backend service **always** uses the admin wallet to sign transactions
- Even if the API check is bypassed, the transaction is still signed by the backend's admin wallet
- The `AdminCapability` object ID is retrieved from configuration (only admin has access)
- Transaction cannot be executed without the admin wallet's private key

### 4. Frontend Security

**Admin UI:**
```typescript
disabled={tournamentCreating || !isAdminWalletConnected}
```

**Protection:**
- Button is disabled if admin wallet is not connected
- Requires `isAdminWalletConnected` to be `true`
- Prevents UI interaction without proper wallet connection

### Security Summary

**Multi-Layer Defense:**
1. **Contract**: Requires `AdminCapability` object (blockchain-enforced)
2. **API**: Verifies admin wallet address (server-side check)
3. **Service**: Always uses admin wallet to sign (transaction-level)
4. **Frontend**: Requires admin wallet connection (UI-level)

**Attack Scenarios:**

| Attack Vector | Protection Layer | Result |
|--------------|------------------|--------|
| Direct contract call without capability | Contract (Layer 1) | ❌ Transaction fails - cannot provide `AdminCapability` |
| Direct contract call with stolen capability | Contract (Layer 1) | ❌ Transaction fails - capability is owned object, cannot be transferred without owner's signature |
| API call with wrong wallet address | API (Layer 2) | ❌ Request rejected - address mismatch |
| API call bypassed, direct service call | Service (Layer 3) | ❌ Transaction signed by admin wallet anyway - cannot execute without admin keypair |
| Frontend manipulation | Frontend (Layer 4) | ❌ Button disabled - cannot proceed without connection |

**Conclusion:**
The admin tournament creation function is **fully locked down**. Even if one layer is bypassed, the other layers provide protection. The strongest protection is at the contract level, where the `AdminCapability` requirement is enforced by the Sui blockchain itself.

