# Tournament Migration - Fields and Values

## Tournament Struct (from contracts/suitwo_game/sources/tournaments.move)

The `Tournament` struct has the following fields:

```move
struct Tournament has key {
    id: UID,                                    // Auto-generated object ID
    tournament_id: u64,                         // Unique tournament ID (auto-incremented)
    name: vector<u8>,                          // Tournament name (UTF-8 encoded)
    category: u8,                               // Tournament category (0-3)
    start_time: u64,                            // Start timestamp (milliseconds)
    end_time: u64,                              // End timestamp (milliseconds)
    entry_fee_tickets: u64,                     // Entry fee in tournament tickets
    prize_pool_usd_cents: u64,                 // Total prize pool in USD cents
    participants: Table<address, TournamentEntry>, // Players who entered
    leaderboard: Table<address, u64>,          // Player -> score mapping
    distribution_status: u8,                    // 0=pending, 1=distributed, 2=no_participants, 3=no_rewards
    created_at: u64,                           // Creation timestamp
    
    // NEW FIELDS (added in recent deployments)
    reward_config: Option<TournamentRewardConfig>, // Custom reward config (None = use defaults)
    starting_ante_usd_cents: u64,              // Starting ante (creator's contribution)
    created_by: address,                        // Tournament creator address
    creation_fee_paid: u64,                    // Creation fee paid (USD cents, 0 for admin)
    creator_reward_usd_cents: u64,             // Creator reward amount
    creator_reward_paid: bool,                  // Whether creator reward has been paid
}
```

## Values Read from Old Tournament

During migration, the following values are read from the old tournament:

| Field | Source | Notes |
|-------|--------|-------|
| `tournament_id` | `fields.tournament_id` or `tournamentId` parameter | Tournament ID from old system |
| `name` | `fields.name` (decoded from vector<u8>) | Tournament name |
| `category` | `fields.category` or `eventData.category` or `0` | Tournament category |
| `start_time` | `fields.start_time` or `eventData.start_time` or `0` | Start timestamp |
| `end_time` | `fields.end_time` or `eventData.end_time` or `0` | End timestamp |
| `entry_fee_tickets` | `fields.entry_fee_tickets` or `eventData.entry_fee_tickets` or `1` | Entry fee |
| `prize_pool_usd_cents` | `fields.prize_pool_usd_cents` or `0` | Prize pool amount |
| `created_at` | `fields.created_at` or `eventData.timestamp` or `0` | Creation timestamp |
| `distribution_status` | `fields.distribution_status` or `fields.rewards_distributed` (converted) | Distribution status |
| `participants` | Read from `participants` table (dynamic fields) | Array of participant entries |
| `leaderboard` | Read from `leaderboard` table (dynamic fields) | Array of player scores |

## Values Passed During Tournament Creation

### For Ended Tournaments (using `admin_create_historical_tournament`):

| Parameter | Value | Source |
|-----------|-------|--------|
| `registry` | New tournament registry object ID | Config |
| `admin_cap` | New tournament admin capability | Config |
| `name` | `tournament.name` (encoded as vector<u8>) | From old tournament |
| `category` | `tournament.category` | From old tournament |
| `start_time` | `tournament.start_time` | **Preserved from old tournament** |
| `end_time` | `tournament.end_time` | **Preserved from old tournament** |
| `entry_fee_tickets` | `tournament.entry_fee_tickets` | From old tournament |
| `prize_pool_usd_cents` | `tournament.prize_pool_usd_cents` | **Preserved from old tournament** |
| `clock` | `0x6` (Clock object) | System object |

**Note:** For ended tournaments, original times and prize pool are preserved.

### For Active/Upcoming Tournaments (using `create_tournament_default_rewards`):

| Parameter | Value | Source |
|-----------|-------|--------|
| `registry` | New tournament registry object ID | Config |
| `admin_cap` | New tournament admin capability | Config |
| `name` | `tournament.name` (encoded as vector<u8>) | From old tournament |
| `category` | `tournament.category` | From old tournament |
| `start_time` | `tournament.start_time` | From old tournament |
| `end_time` | `tournament.end_time` | From old tournament |
| `entry_fee_tickets` | `tournament.entry_fee_tickets` | From old tournament |
| `reward_depth` | `10` | Default config |
| `pool_depth` | `3` | Default config |
| `pool_distribution` | `[50, 30, 20]` | Default config |
| `pool_source` | `0` (Prize Pool) | Default config |
| `ranks` | `[1, 1, 1, 2, 2, 3, 3, 4, 5, 6, 7, 8, 9, 10]` | Default item rewards |
| `item_ids` | `[5, 6, 255, 6, 255, 5, 255, 255, 255, 255, 255, 255, 255, 255]` | Default item rewards |
| `levels` | `[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]` | Default item rewards |
| `quantities` | `[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]` | Default item rewards |
| `starting_ante_usd_cents` | `0` | **Not preserved from old tournament** |
| `clock` | `0x6` (Clock object) | System object |

**Note:** For active tournaments, default rewards are used (old tournaments didn't have reward configs).

## Values NOT Migrated (Set to Defaults)

The following fields are **NOT** read from the old tournament and are set to defaults:

| Field | Default Value | Reason |
|-------|---------------|--------|
| `tournament_id` | Auto-generated (new ID) | New registry assigns new IDs |
| `reward_config` | `None` (use defaults) | Old tournaments didn't have custom reward configs |
| `starting_ante_usd_cents` | `0` | Old tournaments didn't track starting ante separately |
| `created_by` | Admin wallet address | Set to admin address during migration |
| `creation_fee_paid` | `0` | Admin-created tournaments don't pay fees |
| `creator_reward_usd_cents` | `0` | Calculated at tournament end |
| `creator_reward_paid` | `false` | Not paid yet |

## Values Restored After Creation

After the tournament is created, the following data is restored:

1. **Participants** - Restored via `admin_restore_participants`
   - Player addresses
   - Ticket IDs
   - Ticket values (USD cents)
   - Entry timestamps

2. **Leaderboard** - Restored via `admin_restore_leaderboard`
   - Player addresses
   - Scores

3. **Distribution Status** - Restored via `admin_set_distribution_status`
   - Only if status > 0 (not pending) OR tournament has ended
   - Preserves original distribution state

## Summary

**Migrated (from old tournament):**
- ✅ Name
- ✅ Category
- ✅ Start time
- ✅ End time
- ✅ Entry fee tickets
- ✅ Prize pool (for ended tournaments)
- ✅ Participants (restored after creation)
- ✅ Leaderboard (restored after creation)
- ✅ Distribution status (restored after creation, if applicable)

**Not Migrated (set to defaults):**
- ❌ Tournament ID (new ID assigned)
- ❌ Reward config (uses defaults)
- ❌ Starting ante (set to 0)
- ❌ Created by (set to admin address)
- ❌ Creation fee (set to 0)
- ❌ Creator reward (calculated at end)

