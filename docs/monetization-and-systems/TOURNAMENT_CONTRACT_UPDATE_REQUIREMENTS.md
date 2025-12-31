# Tournament Contract Update Requirements

## Overview

The tournament contract needs to be updated to capture all the data required for the new tournament creation flow, including custom rewards, starting ante, creator tracking, and creator rewards.

---

## Current Tournament Struct

**Current Fields:**
```move
struct Tournament has key {
    id: UID,
    tournament_id: u64,
    name: vector<u8>,
    category: u8,
    start_time: u64,
    end_time: u64,
    entry_fee_tickets: u64,
    prize_pool_usd_cents: u64,
    participants: Table<address, TournamentEntry>,
    leaderboard: Table<address, u64>,
    rewards_distributed: bool,
    created_at: u64,
}
```

**Missing Fields:**
- ❌ `reward_config: Option<TournamentRewardConfig>` - Custom reward configuration
- ❌ `starting_ante_usd_cents: u64` - Starting ante amount
- ❌ `created_by: address` - Tournament creator address
- ❌ `creation_fee_paid: u64` - Creation fee paid (in USD cents)
- ❌ `creator_reward_usd_cents: u64` - Creator reward amount (calculated at end)
- ❌ `creator_reward_paid: bool` - Whether creator reward has been paid

---

## Required Updates

### 1. Add TournamentRewardConfig Struct

**New Struct:**
```move
/// Item reward entry (reuse from achievement_system or define here)
struct ItemReward has store {
    item_id: u8,      // Item type: 0=orbLevel, 1=forceField, 2=extraLives, 3=slowTime, 4=coinTractorBeam, 5=destroyAll, 6=bossKillShot
    level: u8,        // Item level (1, 2, or 3)
    quantity: u64,    // Number of items
}

/// Tournament reward configuration for custom rewards
struct TournamentRewardConfig has store {
    reward_depth: u8,              // How many players get item rewards (1-255)
    pool_depth: u8,                 // How many players get pool rewards (MEWS tokens)
    pool_distribution: vector<u64>,  // Percentages for pool distribution (must sum to 100)
    pool_source: u8,                // 0=Prize Pool, 1=Fixed, 2=Custom
    item_rewards: Table<u8, vector<ItemReward>>, // rank -> items (rank 1-255)
}
```

### 2. Update Tournament Struct

**Updated Tournament Struct:**
```move
struct Tournament has key {
    id: UID,
    tournament_id: u64,
    name: vector<u8>,
    category: u8,
    start_time: u64,
    end_time: u64,
    entry_fee_tickets: u64,
    prize_pool_usd_cents: u64,
    participants: Table<address, TournamentEntry>,
    leaderboard: Table<address, u64>,
    rewards_distributed: bool,
    created_at: u64,
    
    // NEW FIELDS
    reward_config: Option<TournamentRewardConfig>, // If None, use default rewards
    starting_ante_usd_cents: u64,  // Starting ante (creator's contribution to prize pool)
    created_by: address,            // Tournament creator address
    creation_fee_paid: u64,         // Creation fee paid (in USD cents, 0 for admin-created)
    creator_reward_usd_cents: u64,  // Creator reward amount (calculated at tournament end)
    creator_reward_paid: bool,       // Whether creator reward has been paid
}
```

### 3. Update create_weekly_tournament Function

**Current Signature:**
```move
public entry fun create_weekly_tournament(
    registry: &mut TournamentRegistry,
    _admin_cap: &AdminCapability,
    name: vector<u8>,
    category: u8,
    start_time: u64,
    end_time: u64,
    entry_fee_tickets: u64,
    clock: &Clock,
    ctx: &mut TxContext
)
```

**Updated Signature (Admin Creation):**
```move
public entry fun create_weekly_tournament(
    registry: &mut TournamentRegistry,
    _admin_cap: &AdminCapability,
    name: vector<u8>,
    category: u8,
    start_time: u64,
    end_time: u64,
    entry_fee_tickets: u64,
    reward_config: Option<TournamentRewardConfig>,  // NEW: Optional custom reward config
    starting_ante_usd_cents: u64,                   // NEW: Starting ante amount
    clock: &Clock,
    ctx: &mut TxContext
)
```

**Updated Tournament Creation:**
```move
let tournament = Tournament {
    id: sui::object::new(ctx),
    tournament_id,
    name,
    category,
    start_time,
    end_time,
    entry_fee_tickets,
    prize_pool_usd_cents: starting_ante_usd_cents,  // Start with starting ante
    participants: table::new(ctx),
    leaderboard: table::new(ctx),
    rewards_distributed: false,
    created_at: current_time,
    
    // NEW FIELDS
    reward_config,                                    // Custom config or None
    starting_ante_usd_cents,                          // Starting ante
    created_by: tx_context::sender(ctx),              // Admin address
    creation_fee_paid: 0,                             // Admin doesn't pay
    creator_reward_usd_cents: 0,                      // Calculated at end
    creator_reward_paid: false,                       // Not paid yet
};
```

### 4. Add create_tournament_for_user Function

**New Function (User Creation):**
```move
/// Create a tournament for a user (user pays creation fee + starting ante)
#[allow(lint(public_entry))]
public entry fun create_tournament_for_user(
    registry: &mut TournamentRegistry,
    name: vector<u8>,
    category: u8,
    start_time: u64,
    end_time: u64,
    entry_fee_tickets: u64,
    reward_config: Option<TournamentRewardConfig>,  // Optional custom reward config
    starting_ante_usd_cents: u64,                   // Starting ante amount
    creation_fee_paid: u64,                          // Creation fee paid (in USD cents)
    clock: &Clock,
    ctx: &mut TxContext
) {
    let current_time = clock::timestamp_ms(clock);
    let creator = tx_context::sender(ctx);
    
    // Validate category
    assert!(category <= CATEGORY_MOST_ENEMIES, E_INVALID_CATEGORY);
    
    // Validate time range
    assert!(start_time < end_time, E_INVALID_TIME_RANGE);
    assert!(end_time > current_time, E_INVALID_TIME_RANGE);
    
    // Validate creation fee (must be at least $5.00 = 500 cents)
    assert!(creation_fee_paid >= 500, E_INVALID_CREATION_FEE);
    
    // Create tournament
    let tournament_id = registry.next_tournament_id;
    registry.next_tournament_id = tournament_id + 1;
    
    let tournament = Tournament {
        id: sui::object::new(ctx),
        tournament_id,
        name,
        category,
        start_time,
        end_time,
        entry_fee_tickets,
        prize_pool_usd_cents: starting_ante_usd_cents,  // Start with starting ante
        participants: table::new(ctx),
        leaderboard: table::new(ctx),
        rewards_distributed: false,
        created_at: current_time,
        
        // NEW FIELDS
        reward_config,                                    // Custom config or None
        starting_ante_usd_cents,                          // Starting ante
        created_by: creator,                              // User address
        creation_fee_paid,                                // Creation fee paid
        creator_reward_usd_cents: 0,                      // Calculated at end
        creator_reward_paid: false,                       // Not paid yet
    };
    
    // Add to registry
    table::add(&mut registry.tournaments, tournament_id, sui::object::id(&tournament));
    vector::push_back(&mut registry.active_tournaments, tournament_id);
    
    // Transfer tournament to shared
    transfer::share_object(tournament);
    
    // Emit TournamentCreated event
    event::emit(TournamentCreated {
        tournament_id,
        category,
        name,
        start_time,
        end_time,
        entry_fee_tickets,
        timestamp: current_time,
    });
}
```

### 5. Update end_tournament Function

**Add Creator Reward Calculation:**
```move
/// Calculate creator reward using boost system
/// 50% until creation fee ($5.00) is covered, then 20% of remaining
fun calculate_creator_reward(
    total_entry_fees_usd_cents: u64,
    creation_fee_usd_cents: u64
): u64 {
    let boost_percentage = 5000; // 50% in basis points
    let standard_percentage = 2000; // 20% in basis points
    
    // Calculate boost reward (50% of entry fees)
    let boost_reward = (total_entry_fees_usd_cents * boost_percentage) / 10000;
    
    if (boost_reward <= creation_fee_usd_cents) {
        // Still in boost phase
        return boost_reward;
    } else {
        // Boost phase complete, calculate remaining
        let boost_threshold = (creation_fee_usd_cents * 10000) / boost_percentage; // $10.00
        let remaining_fees = total_entry_fees_usd_cents - boost_threshold;
        let remaining_reward = (remaining_fees * standard_percentage) / 10000;
        return creation_fee_usd_cents + remaining_reward;
    }
}

/// End tournament and calculate creator reward
#[allow(lint(public_entry))]
public entry fun end_tournament(
    _admin_cap: &AdminCapability,
    tournament: &mut Tournament,
    clock: &Clock,
    _ctx: &mut TxContext
) {
    let current_time = clock::timestamp_ms(clock);
    
    // Validate tournament has ended
    assert!(current_time > tournament.end_time, E_TOURNAMENT_NOT_ENDED);
    
    // Validate rewards haven't been distributed
    assert!(!tournament.rewards_distributed, E_REWARDS_ALREADY_DISTRIBUTED);
    
    // Calculate creator reward (if tournament was created by user)
    if (tournament.creation_fee_paid > 0) {
        let total_entry_fees = tournament.prize_pool_usd_cents - tournament.starting_ante_usd_cents;
        let creator_reward = calculate_creator_reward(total_entry_fees, tournament.creation_fee_paid);
        tournament.creator_reward_usd_cents = creator_reward;
    };
    
    // Mark as ended
    tournament.rewards_distributed = true;
    
    let winners = vector::empty<address>();
    
    // Emit TournamentEnded event (include creator reward)
    event::emit(TournamentEnded {
        tournament_id: tournament.tournament_id,
        winners,
        prize_pool_usd_cents: tournament.prize_pool_usd_cents,
        creator_reward_usd_cents: tournament.creator_reward_usd_cents,  // NEW
        rewards_distributed: true,
        timestamp: current_time,
    });
}
```

### 6. Update TournamentCreated Event

**Add New Fields:**
```move
struct TournamentCreated has copy, drop {
    tournament_id: u64,
    category: u8,
    name: vector<u8>,
    start_time: u64,
    end_time: u64,
    entry_fee_tickets: u64,
    created_by: address,            // NEW
    starting_ante_usd_cents: u64,   // NEW
    creation_fee_paid: u64,          // NEW
    has_custom_rewards: bool,        // NEW (true if reward_config is Some)
    timestamp: u64,
}
```

### 7. Update TournamentEnded Event

**Add Creator Reward:**
```move
struct TournamentEnded has copy, drop {
    tournament_id: u64,
    winners: vector<address>,
    prize_pool_usd_cents: u64,
    creator_reward_usd_cents: u64,  // NEW
    rewards_distributed: bool,
    timestamp: u64,
}
```

### 8. Add View Functions

**New View Functions:**
```move
/// Get tournament reward configuration
public fun get_reward_config(tournament: &Tournament): Option<TournamentRewardConfig> {
    tournament.reward_config
}

/// Get starting ante
public fun get_starting_ante_usd_cents(tournament: &Tournament): u64 {
    tournament.starting_ante_usd_cents
}

/// Get tournament creator
public fun get_created_by(tournament: &Tournament): address {
    tournament.created_by
}

/// Get creation fee paid
public fun get_creation_fee_paid(tournament: &Tournament): u64 {
    tournament.creation_fee_paid
}

/// Get creator reward
public fun get_creator_reward_usd_cents(tournament: &Tournament): u64 {
    tournament.creator_reward_usd_cents
}

/// Check if creator reward has been paid
public fun is_creator_reward_paid(tournament: &Tournament): bool {
    tournament.creator_reward_paid
}
```

---

## Implementation Checklist

### Contract Updates
- [x] Add `ItemReward` struct (imported from achievement_system)
- [x] Add `TournamentRewardConfig` struct
- [x] Update `Tournament` struct with new fields:
  - [x] `reward_config: Option<TournamentRewardConfig>`
  - [x] `starting_ante_usd_cents: u64`
  - [x] `created_by: address`
  - [x] `creation_fee_paid: u64`
  - [x] `creator_reward_usd_cents: u64`
  - [x] `creator_reward_paid: bool`
- [x] Update `create_weekly_tournament` function signature
- [x] Add `create_tournament_for_user` function
- [x] Add `calculate_creator_reward` helper function
- [x] Update `end_tournament` function to calculate creator reward
- [x] Update `TournamentCreated` event
- [x] Update `TournamentEnded` event
- [x] Add view functions for new fields
- [x] Update `admin_create_historical_tournament` if needed

### Validation
- [x] Validate `reward_config` if provided (reward_depth > 0, pool_distribution sums to 100, etc.)
- [x] Validate `creation_fee_paid >= 500` (minimum $5.00) for user-created tournaments
- [x] Validate `starting_ante_usd_cents >= 0` (implicit, as u64 cannot be negative)
- [x] Validate `pool_distribution` vector sums to 100
- [x] Validate `reward_depth` and `pool_depth` are reasonable (1-255)

### Error Codes
- [x] Add `E_INVALID_CREATION_FEE` error
- [x] Add `E_INVALID_REWARD_CONFIG` error
- [x] Add `E_INVALID_POOL_DISTRIBUTION` error (if percentages don't sum to 100)

---

## Migration Considerations

### Existing Tournaments
- Existing tournaments will have `reward_config = None` (use default)
- Existing tournaments will have `starting_ante_usd_cents = 0`
- Existing tournaments will have `created_by = admin_address` (or zero address)
- Existing tournaments will have `creation_fee_paid = 0`
- Existing tournaments will have `creator_reward_usd_cents = 0`
- Existing tournaments will have `creator_reward_paid = false`

### Backward Compatibility
- All new fields should have default values for existing tournaments
- View functions should handle missing fields gracefully
- Events should include new fields (use 0 or empty for existing tournaments)

---

## Example Usage

### Admin Creates Tournament (No Payment)
```move
create_weekly_tournament(
    registry,
    admin_cap,
    b"Weekly High Score #1",
    CATEGORY_HIGHEST_SCORE,
    1702656000000,  // start_time
    1703260800000,  // end_time
    1,              // entry_fee_tickets
    option::none(), // reward_config (use default)
    0,              // starting_ante_usd_cents (no ante)
    clock,
    ctx
);
```

### User Creates Tournament (With Payment)
```move
// User pays creation fee + starting ante + reward cost off-chain
// Then calls create_tournament_for_user

create_tournament_for_user(
    registry,
    b"My Custom Tournament",
    CATEGORY_HIGHEST_SCORE,
    1702656000000,  // start_time
    1703260800000,  // end_time
    1,              // entry_fee_tickets
    option::some(reward_config),  // Custom reward config
    1000,           // starting_ante_usd_cents ($10.00)
    500,            // creation_fee_paid ($5.00)
    clock,
    ctx
);
```

---

## Summary

**Required Contract Updates:**
1. ✅ Add `TournamentRewardConfig` struct
2. ✅ Add 6 new fields to `Tournament` struct
3. ✅ Update `create_weekly_tournament` function
4. ✅ Add `create_tournament_for_user` function
5. ✅ Add `calculate_creator_reward` helper function
6. ✅ Update `end_tournament` function
7. ✅ Update events
8. ✅ Add view functions

**Key Data Captured:**
- ✅ Custom reward configuration (or None for default)
- ✅ Starting ante amount
- ✅ Creator address
- ✅ Creation fee paid
- ✅ Creator reward amount (calculated at end)
- ✅ Creator reward payment status

