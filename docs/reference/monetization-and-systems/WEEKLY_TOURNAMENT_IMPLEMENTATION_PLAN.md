# Weekly Tournament Implementation Plan

## Status: 🚧 IN PROGRESS - Starting Implementation

**Last Updated:** 2025-12-09  
**Current Phase:** Phase 1 - Smart Contract Development  
**Previous Completion:** ✅ Item Merging & Upgrade System (2025-12-09)

## Overview

This document outlines the step-by-step implementation plan for the weekly tournament system. Weekly tournaments are the first tournament feature to be implemented, serving as the foundation for future tournament types.

**Tournament Specifications:**
- **Duration:** 7 days
- **Format:** All vs All (Open Competition)
- **Entry Fee:** $1 per tournament (or equivalent in SUI/$MEWS) - starts at $1, may increase later
- **Categories:** Multiple categories run simultaneously (Total Coins, Longest Streak, Highest Score, etc.)
- **Prize Pool:** Grows with participation (sum of all ticket USD values)
- **Prize Distribution:** 50% player rewards, 25% token burn, 25% operations
- **Focus:** Regular players, multiple goals

---

## Implementation Phases

### Phase 1: Smart Contract (Week 1)

#### 1.1 Tournament Contract Structure

**File:** `contracts/suitwo_game/sources/tournaments.move`

**Key Structs:**
```move
module suitwo_game::tournaments {
    use sui::object::{Self, UID};
    use sui::table::{Self, Table};
    use sui::event;
    use sui::clock::{Self, Clock};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::tx_context::{Self, TxContext};
    
    // Tournament categories
    const CATEGORY_TOTAL_COINS: u8 = 0;
    const CATEGORY_LONGEST_STREAK: u8 = 1;
    const CATEGORY_HIGHEST_SCORE: u8 = 2;
    const CATEGORY_LONGEST_DISTANCE: u8 = 3;
    const CATEGORY_MOST_BOSSES: u8 = 4;
    const CATEGORY_MOST_ENEMIES: u8 = 5;
    
    /// Tournament entry - tracks player entry with ticket value
    /// Only USD is tracked. MIST is calculated on-the-fly when needed for on-chain operations.
    struct TournamentEntry has store {
        ticket_id: u64,                  // Ticket ID used for entry
        ticket_value_usd: u64,           // Value paid for ticket in USD (cents, e.g., 100 = $1.00)
        entered_at: u64,                 // Timestamp when entered
    }
    
    /// Tournament structure
    struct Tournament has key {
        id: UID,
        tournament_id: u64,
        name: vector<u8>,
        category: u8,                    // Which category this tournament focuses on
        start_time: u64,
        end_time: u64,
        entry_fee_tickets: u64,          // Entry fee in tournament tickets (typically 1)
        prize_pool_usd: u64,             // Total prize pool in USD (cents, sum of all ticket USD values)
        participants: Table<address, TournamentEntry>,  // Players who entered (with ticket USD value tracking)
        leaderboard: Table<address, u64>,    // Player -> score/value for category
        rewards_distributed: bool,
        created_at: u64,
    }
    
    /// Tournament registry
    struct TournamentRegistry has key {
        id: UID,
        tournaments: Table<u64, ID>,     // tournament_id -> Tournament ID
        active_tournaments: vector<u64>, // Currently active tournament IDs
        next_tournament_id: u64,
    }
    
    /// Admin capability for tournament management
    struct AdminCapability has key, store {
        id: UID,
    }
}
```

**Key Functions:**
```move
/// Create a new weekly tournament
/// Prize pool starts at 0 and grows as players enter with tickets
public entry fun create_weekly_tournament(
    registry: &mut TournamentRegistry,
    admin_cap: &AdminCapability,
    name: vector<u8>,
    category: u8,
    start_time: u64,
    end_time: u64,
    entry_fee_tickets: u64,  // Entry fee in tournament tickets (typically 1)
    clock: &Clock,
    ctx: &mut TxContext
) {
    let admin = tx_context::sender(ctx);
    let current_time = clock::timestamp_ms(clock);
    
    // Validate admin
    // (Admin capability validation)
    
    // Create tournament with prize pool starting at 0
    // Prize pool (USD) will grow as players enter with tickets
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
        prize_pool_usd: 0,   // Starts at 0 USD (cents), grows with ticket USD values
        participants: table::new(ctx),
        leaderboard: table::new(ctx),
        rewards_distributed: false,
        created_at: current_time,
    };
    
    // Add to registry
    table::add(&mut registry.tournaments, tournament_id, sui::object::id(&tournament));
    vector::push_back(&mut registry.active_tournaments, tournament_id);
    
    // Transfer tournament to shared (so players can enter)
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

/// Enter tournament using tournament ticket
/// Tracks ticket value for prize pool calculation
public entry fun enter_tournament(
    tournament: &mut Tournament,
    game_pass: &mut GamePass,  // From game_pass module
    ticket_id: u64,            // Which ticket to use (player selects)
    clock: &Clock,
    ctx: &mut TxContext
) {
    let player = tx_context::sender(ctx);
    let current_time = clock::timestamp_ms(clock);
    
    // Validate tournament is active
    assert!(current_time >= tournament.start_time && current_time <= tournament.end_time, E_TOURNAMENT_NOT_ACTIVE);
    
    // Validate player hasn't already entered
    assert!(!table::contains(&tournament.participants, player), E_ALREADY_ENTERED);
    
    // Get ticket from GamePass (validates ticket exists and belongs to player)
    let ticket = table::borrow(&game_pass.tournament_tickets, ticket_id);
    assert!(ticket.ticket_id == ticket_id, E_INVALID_TICKET);
    
    // Remove ticket from GamePass (consume it)
    let consumed_ticket = table::remove(&mut game_pass.tournament_tickets, ticket_id);
    
    // Add ticket USD value to prize pool (only USD is tracked)
    tournament.prize_pool_usd = tournament.prize_pool_usd + consumed_ticket.value_paid_usd;
    
    // Add player to participants with ticket USD value tracking
    let entry = TournamentEntry {
        ticket_id: consumed_ticket.ticket_id,
        ticket_value_usd: consumed_ticket.value_paid_usd,
        entered_at: current_time,
    };
    table::add(&mut tournament.participants, player, entry);
    
    // Initialize leaderboard entry (score starts at 0)
    table::add(&mut tournament.leaderboard, player, 0);
    
    // Emit TournamentEntered event with ticket USD value
    event::emit(TournamentEntered {
        tournament_id: tournament.tournament_id,
        player,
        ticket_id: consumed_ticket.ticket_id,
        ticket_value_usd: consumed_ticket.value_paid_usd,
        timestamp: current_time,
    });
}

/// Refund tournament ticket (if tournament cancelled)
public entry fun refund_tournament_ticket(
    tournament: &mut Tournament,
    game_pass: &mut GamePass,
    player: address,
    clock: &Clock,
    ctx: &mut TxContext
) {
    // Validate tournament is cancelled
    // Validate player was registered
    // Refund 1 tournament ticket to GamePass
    // Remove player from participants
    // Emit TournamentTicketRefunded event
}

/// Update tournament score (admin-only, called by backend)
public entry fun update_tournament_score(
    admin_cap: &AdminCapability,
    tournament: &mut Tournament,
    player: address,
    value: u64,  // Score/value for this category
    clock: &Clock,
    ctx: &mut TxContext
) {
    // Validate admin
    // Validate player is participant
    // Update leaderboard
    // Emit TournamentScoreUpdated event
}

/// End tournament and distribute rewards
public entry fun end_tournament(
    admin_cap: &AdminCapability,
    tournament: &mut Tournament,
    clock: &Clock,
    ctx: &mut TxContext
) {
    // Validate tournament has ended
    // Calculate top 10 winners
    // Distribute rewards (50% to winners, 25% burn, 25% operations)
    // Mark as ended
    // Emit TournamentEnded event
}

/// Get tournament leaderboard (view function)
/// Note: This returns all entries - frontend will sort and limit
public fun get_all_scores(
    tournament: &Tournament
): vector<LeaderboardEntry> {
    // Return all player scores for this tournament
    // Frontend will sort by score and take top N
}
```

**Events:**
```move
struct TournamentCreated has copy, drop {
    tournament_id: u64,
    category: u8,
    name: vector<u8>,
    start_time: u64,
    end_time: u64,
    entry_fee_tickets: u64,  // Entry fee in tournament tickets (typically 1)
}

struct TournamentEntered has copy, drop {
    tournament_id: u64,
    player: address,
    ticket_id: u64,              // Ticket ID used for entry
    ticket_value_usd: u64,        // Value paid for ticket in USD (cents, added to prize pool)
    timestamp: u64,
}

struct TournamentScoreUpdated has copy, drop {
    tournament_id: u64,
    player: address,
    category: u8,
    value: u64,
    timestamp: u64,
}

struct TournamentTicketRefunded has copy, drop {
    tournament_id: u64,
    player: address,
    ticket_id: u64,
    ticket_value_usd: u64,  // USD value refunded (cents)
    timestamp: u64,
}

struct TournamentEnded has copy, drop {
    tournament_id: u64,
    winners: vector<address>,
    prize_pool_usd: u64,  // Total prize pool in USD (cents, sum of all ticket USD values)
    rewards_distributed: bool,
    timestamp: u64,
}
```

#### 1.2 Tournament Ticket System (Required)

**Tournament tickets are managed by the Game Pass system.**

**Key Points:**
- Tournament entry requires tournament tickets (not credits, not direct payment)
- Tickets are purchased separately from game credits
- Tickets can be refunded if tournament is cancelled
- Game Pass system manages both credits and tickets

**Integration with Game Pass:**
- `GamePass` struct includes `tournament_tickets: Table<u64, TournamentTicket>` field
- Each ticket tracks its purchase value in **USD only** (stable reference)
- Purchase tickets via Game Pass system (with USD value tracking)
- Player selects which ticket to use when entering tournament
- Ticket USD value is added to tournament prize pool (USD) when used
- Prize pool tracked in USD (cents) on-chain - stable reference point
- Prize pool displayed as $MEWS with USD in parentheses - promotes token while showing stable USD value
- MIST/MEWS amounts calculated on-the-fly when needed for on-chain operations (using current prices)
- Refund tickets if tournament cancelled (returns ticket with original USD value)

---

### Phase 2: Backend Service (Week 2)

#### 2.1 Tournament Service

**File:** `backend/src/services/tournament-service.ts`

```typescript
import { SuiClient } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';

export interface Tournament {
  tournamentId: number;
  name: string;
  category: 'totalCoins' | 'longestStreak' | 'highestScore' | 'longestDistance' | 'mostBosses' | 'mostEnemies';
  startTime: number;
  endTime: number;
  entryFeeTickets: number;  // Number of tournament tickets required (typically 1)
  prizePoolUSD: number;  // Total prize pool in USD (cents, sum of ticket USD values)
  participants: number;
  status: 'upcoming' | 'active' | 'ended';
  createdAt: number;
  objectId: string;  // Sui object ID
}

export interface LeaderboardEntry {
  rank: number;
  playerAddress: string;
  value: number;  // Score/value for this category
  displayValue: string;  // Formatted for display
}

export class TournamentService {
  private suiClient: SuiClient;
  
  constructor(suiClient: SuiClient) {
    this.suiClient = suiClient;
  }
  
  /**
   * Create a new weekly tournament
   */
  async createWeeklyTournament(config: {
    name: string;
    category: Tournament['category'];
    startTime: number;  // Unix timestamp
    endTime: number;    // Unix timestamp (startTime + 7 days)
    entryFeeTickets: number;   // Number of tournament tickets required (typically 1)
  }): Promise<Tournament> {
    // 1. Call smart contract to create tournament
    // 2. Return tournament object from blockchain
  }
  
  /**
   * Get active weekly tournaments
   * Queries blockchain directly via events or registry
   */
  async getActiveTournaments(): Promise<Tournament[]> {
    // Query blockchain for active tournaments
    // Filter by start_time <= now <= end_time
    // Return tournament objects
  }
  
  /**
   * Get tournaments that a player has entered
   * Returns both active and past tournaments
   */
  async getMyTournaments(playerAddress: string): Promise<Tournament[]> {
    // Query blockchain for tournaments where player is in participants table
    // Check TournamentEntered events for player address
    // Return tournament objects (both active and past)
  }
  
  /**
   * Get past/ended tournaments
   * Optionally filter by category
   */
  async getPastTournaments(category?: string): Promise<Tournament[]> {
    // Query blockchain for tournaments where end_time < now
    // Optionally filter by category if provided
    // Return tournament objects sorted by end_time (newest first)
  }
  
  /**
   * Get tournament by ID (from blockchain)
   */
  async getTournament(tournamentId: number): Promise<Tournament> {
    // Query blockchain for tournament object
    // Return tournament data
  }
  
  /**
   * Enter tournament (uses tournament tickets from GamePass)
   * Player selects which ticket to use (ticket with value)
   */
  async enterTournament(
    playerAddress: string,
    tournamentId: number,
    ticketId: number  // Which ticket to use (player selects from available tickets)
    // Ticket value is tracked for prize pool calculation
  ): Promise<{ success: boolean; transactionDigest?: string; error?: string }> {
    // 1. Validate tournament is active
    // 2. Check if player already entered
    // 3. Create transaction to enter tournament
    // 4. Return transaction for player to sign
  }
  
  /**
   * Update tournament score after game ends
   */
  async updateTournamentScore(
    tournamentId: number,
    playerAddress: string,
    gameStats: {
      score?: number;
      distance?: number;
      coins?: number;
      bossesDefeated?: number;
      enemiesDefeated?: number;
      longestCoinStreak?: number;
    }
  ): Promise<{ transactionDigest: string }> {
    // 1. Get tournament object from blockchain
    // 2. Calculate value for category
    // 3. Call smart contract to update on-chain
    // 4. Return transaction digest
  }
  
  /**
   * Get tournament leaderboard
   * Queries blockchain directly - may show loading screen
   */
  async getTournamentLeaderboard(
    tournamentId: number,
    limit: number = 100
  ): Promise<LeaderboardEntry[]> {
    // 1. Query blockchain for tournament object
    // 2. Get all scores from tournament.scores table
    // 3. Sort by score (descending)
    // 4. Take top N entries
    // 5. Return formatted leaderboard
  }
  
  /**
   * Get player's rank in tournament
   * Queries blockchain directly
   */
  async getPlayerRank(
    tournamentId: number,
    playerAddress: string
  ): Promise<{ rank: number | null; value: number; totalParticipants: number }> {
    // 1. Query blockchain for tournament
    // 2. Get all scores
    // 3. Sort and find player's rank
    // 4. Return rank and value
  }
  
  /**
   * End tournament and distribute rewards
   */
  async endTournament(tournamentId: number): Promise<{
    winners: Array<{ rank: number; player: string; reward: number }>;
    success: boolean;
  }> {
    // 1. Get top 10 players
    // 2. Calculate rewards (50% to winners, 25% burn, 25% operations)
    // 3. Call smart contract to distribute
    // 4. Update tournament status
  }
}

---

## Tournament Rewards System

### Reward Structure

**Prize Pool Split:**
- **50%** → Player rewards (distributed to top 10 winners)
- **25%** → Token burning ($MEWS burn)
- **25%** → Operations/team

**Top 10 Winner Distribution (from 50% player rewards pool):**
- **1st Place:** 30% of player rewards pool
- **2nd Place:** 20% of player rewards pool
- **3rd Place:** 15% of player rewards pool
- **4th-10th Place:** 5% each (35% total)

**Example Calculation:**
- Tournament prize pool: $200 (from 200 players @ $1 entry)
- Player rewards pool: $100 (50%)
- Token burn: $50 (25%)
- Operations: $50 (25%)

**Winner Rewards:**
- 1st: $30 (30% of $100)
- 2nd: $20 (20% of $100)
- 3rd: $15 (15% of $100)
- 4th-10th: $5 each (5% of $100 each)

### Reward Form

**Reward Structure (Decided):**
- **Top 10 (1st-10th):** All receive in-game items
- Item value scales with rank (higher rank = better/more items)

**Item Reward Distribution:**
- **1st Place:** 30% of player rewards pool → Converted to items
- **2nd Place:** 20% of player rewards pool → Converted to items
- **3rd Place:** 15% of player rewards pool → Converted to items
- **4th-10th Place:** 5% each (35% total) → Converted to items

**Example Calculation:**
- Tournament prize pool: $200 (from 200 players @ $1 entry)
- Player rewards pool: $100 (50% of prize pool)

**Item Rewards (Simplified):**

**Top 3 (Special Items + 1 Random Level 1 Item):**
- **1st Place:** 1x Destroy All Enemies + 1x Boss Kill Shot + 1x Random Level 1 item
- **2nd Place:** 1x Boss Kill Shot + 1x Random Level 1 item
- **3rd Place:** 1x Destroy All Enemies + 1x Random Level 1 item

**4th-10th (1 Random Level 1 Item):**
- **4th-10th Place:** 1x Random Level 1 item each
- Randomly selected from: Orb Level, Force Field, Extra Lives, Slow Time, Coin Tractor Beam
- All items are Level 1
- Each player gets exactly 1 random item

**Item Details:**
- **Destroy All Enemies:** Special item that clears all enemies on screen
- **Boss Kill Shot:** Special item that instantly defeats the current boss
- **Random Level 1 Items:** Randomly selected from standard items (Level 1)

### Distribution Method

**Distribution Strategy:**
- **Top 10 (All Items):** Claimable rewards
  - Items stored in smart contract or inventory system
  - Winners claim items when ready
  - **Players pay gas fees for claiming** (~$0.001 SUI per claim)
  - More control for players
  - Cost efficient (operations doesn't pay gas, players choose when to claim)

**Rationale:**
- All winners get items (consistent reward type)
- Claimable system saves on gas (players pay when claiming)
- Players can claim when convenient
- Items go directly to inventory system

### Reward Distribution Timing

**When Tournament Ends:**
1. Tournament end time reached
2. Admin calls `end_tournament()` function
3. Top 10 winners calculated
4. Rewards distributed (automatic or claimable)
5. Token burn executed (25%)
6. Operations funds transferred (25%)

**Notification:**
- Emit `TournamentEnded` event with winners
- **In-game modal** appears when winners log in after tournament ends
- Modal shows:
  - Tournament name and category
  - Player's rank
  - Item rewards list
  - Claim button (if items are claimable)
  - Link to full leaderboard
- Modal can be dismissed and accessed later from tournament results page
- Non-winners see a simple message: "Tournament ended - check leaderboard"

### Smart Contract Implementation

```move
/// Reward structure for items (all top 10)
struct TournamentItemReward has key, store {
    id: UID,
    tournament_id: u64,
    player: address,
    rank: u64,
    items: vector<ItemReward>,  // List of items to claim
    claimed: bool,
    created_at: u64,
    expires_at: u64,  // 0 = unlimited, otherwise timestamp when reward expires
}

/// Item reward entry
struct ItemReward has store {
    item_type: u8,  // 0=OrbLevel, 1=ForceField, 2=ExtraLives, 3=SlowTime, 4=CoinTractorBeam, 5=DestroyAll, 6=BossKillShot
    level: u8,      // Item level (1, 2, or 3) - special items don't have levels
    quantity: u64,  // Number of items
}

// Item type constants
const ITEM_ORB_LEVEL: u8 = 0;
const ITEM_FORCE_FIELD: u8 = 1;
const ITEM_EXTRA_LIVES: u8 = 2;
const ITEM_SLOW_TIME: u8 = 3;
const ITEM_COIN_TRACTOR_BEAM: u8 = 4;
const ITEM_DESTROY_ALL: u8 = 5;
const ITEM_BOSS_KILL_SHOT: u8 = 6;

/// All rewards are items - no token rewards

/// End tournament and create item rewards
public entry fun end_tournament(
    admin_cap: &AdminCapability,
    tournament: &mut Tournament,
    reward_registry: &mut RewardRegistry,
    premium_store: &mut PremiumStore,  // For item rewards
    clock: &Clock,
    ctx: &mut TxContext
) {
    // 1. Validate tournament has ended
    // 2. Get top 10 players from leaderboard
    // 3. Calculate rewards (50% of prize pool to winners)
    
    // 4. Create claimable item rewards for all top 10
    //    - 1st: 1x Destroy All Enemies + 1x Boss Kill Shot + 1x Random Level 1 item
    //    - 2nd: 1x Boss Kill Shot + 1x Random Level 1 item
    //    - 3rd: 1x Destroy All Enemies + 1x Random Level 1 item
    //    - 4th-10th: 1x Random Level 1 item each (randomly selected from: Orb Level, Force Field, Extra Lives, Slow Time, Coin Tractor Beam)
    //    - Store in TournamentItemReward objects
    //    - Set expires_at = 0 (unlimited) - can be changed per tournament in the future
    
    // 5. Burn tokens (25% of prize pool in $MEWS)
    // 6. Transfer operations funds (25% of prize pool in SUI)
    // 7. Mark tournament as ended
    // 8. Emit TournamentEnded event with winners
}

/// Claim tournament item reward (all top 10)
public entry fun claim_item_reward(
    reward: &mut TournamentItemReward,
    premium_store: &mut PremiumStore,
    clock: &Clock,
    ctx: &mut TxContext
) {
    // 1. Validate reward not already claimed
    // 2. Validate caller is reward owner
    // 3. Check if reward has expired (if expires_at > 0 and current_time > expires_at)
    // 4. Transfer items to player's inventory via PremiumStore
    // 5. Mark as claimed
    // 6. Emit ItemRewardClaimed event
}

/// Get claimable item rewards for player
public fun get_claimable_item_rewards(
    reward_registry: &RewardRegistry,
    player: address
): vector<TournamentItemReward> {
    // Return all unclaimed item rewards for player
}
```

### Frontend Reward Display

**Tournament Results Modal:**
```typescript
interface TournamentResult {
  tournamentId: number;
  tournamentName: string;
  category: string;
  playerRank: number | null;
  // All top 10: Item rewards
  itemRewards: Array<{
    itemType: string;
    level: number | null;  // null for special items (Destroy All, Boss Kill Shot)
    quantity: number;
  }>;
  claimed: boolean;
}

// Show after tournament ends
<TournamentResultsModal>
  <h2>Tournament Results</h2>
  {playerRank ? (
    <>
      <p>Congratulations! You finished #{playerRank}</p>
      
      <div className="item-rewards">
        <h3>Your Rewards:</h3>
        <ul>
          {itemRewards.map((item, i) => (
            <li key={i}>
              {item.quantity}x {getItemName(item.itemType)}
              {item.level && ` (Level ${item.level})`}
              {(item.itemType === 'destroyAll' || item.itemType === 'bossKillShot') && ' ⭐ Special Item'}
            </li>
          ))}
        </ul>
        {playerRank <= 3 && (
          <p className="note">Includes special items + 1 random Level 1 item</p>
        )}
        {playerRank >= 4 && (
          <p className="note">1 random Level 1 item</p>
        )}
        {!claimed && (
          <button onClick={claimItemReward}>Claim Items</button>
        )}
        {claimed && <p>✓ Items Claimed</p>}
      </div>
    </>
  ) : (
    <p>You didn't place in the top 10. Better luck next time!</p>
  )}
  <Leaderboard top10={winners} />
</TournamentResultsModal>
```

**Reward Examples:**
- **1st Place:** "1x Destroy All Enemies ⭐ Special Item + 1x Boss Kill Shot ⭐ Special Item + 1x [Random Level 1 Item]"
  - Example: "1x Destroy All Enemies ⭐ Special Item + 1x Boss Kill Shot ⭐ Special Item + 1x Orb Level (Level 1)"
- **2nd Place:** "1x Boss Kill Shot ⭐ Special Item + 1x [Random Level 1 Item]"
  - Example: "1x Boss Kill Shot ⭐ Special Item + 1x Force Field (Level 1)"
- **3rd Place:** "1x Destroy All Enemies ⭐ Special Item + 1x [Random Level 1 Item]"
  - Example: "1x Destroy All Enemies ⭐ Special Item + 1x Extra Lives (Level 1)"
- **4th-10th:** "1x [Random Level 1 Item]"
  - Examples: "1x Orb Level (Level 1)", "1x Force Field (Level 1)", "1x Extra Lives (Level 1)", "1x Slow Time (Level 1)", "1x Coin Tractor Beam (Level 1)"
  - Each player gets exactly 1 random item

### Reward Details Summary

**Decided:**
1. **Reward Form:** 
   - **Top 10 (1st-10th):** All receive in-game items
   - Item value scales with rank (higher rank = better/more items)

2. **Distribution:**
   - All top 10: Claimable item rewards
   - Items stored in smart contract/inventory system
   - Players claim when ready (pay gas for claiming)

3. **Item Rewards Value:**
   - 1st: 30% of player rewards pool → Converted to items
   - 2nd: 20% of player rewards pool → Converted to items
   - 3rd: 15% of player rewards pool → Converted to items
   - 4th-10th: 5% each → Converted to items

**Item Distribution (Decided - Simplified):**

**Top 3:**
1. **1st Place:** 1x Destroy All Enemies + 1x Boss Kill Shot + 1x Random Level 1 item
2. **2nd Place:** 1x Boss Kill Shot + 1x Random Level 1 item
3. **3rd Place:** 1x Destroy All Enemies + 1x Random Level 1 item

**4th-10th:**
4. **4th-10th Place:** 1x Random Level 1 item each

**Random Item Selection:**
- **All players (1st-10th):** Get exactly 1 random Level 1 item
- **Randomly selected from:** Orb Level, Force Field, Extra Lives, Slow Time, Coin Tractor Beam
- **All items are Level 1**
- **Selection is random** (not value-based, just one random item per player)

**Decided:**
1. **Notification:** In-game modal - Winners see a modal when they log in after tournament ends
   - Modal shows rank, rewards, and claim button
   - Appears automatically when player logs in
   - Can be dismissed and accessed later from tournament results page

2. **Claiming Period:** No time limit (unlimited)
   - Players can claim rewards at any time
   - System designed to support time limits in the future if needed
   - Smart contract includes `expires_at` field (set to 0 for unlimited)
   - Can be updated per tournament if needed in the future

---

### Phase 2: Backend Service (Week 2)
}
```

#### 2.2 Category-Specific Tracking

**File:** `backend/src/services/tournament-tracking-service.ts`

```typescript
export class TournamentTrackingService {
  /**
   * Update total coins for tournament (on-chain)
   */
  async updateTotalCoins(
    tournamentId: number,
    playerAddress: string,
    coinsFromGame: number
  ): Promise<{ transactionDigest: string }> {
    // 1. Get current total from blockchain
    // 2. Calculate new total (current + coinsFromGame)
    // 3. Call smart contract to update on-chain
    // 4. Return transaction digest
  }
  
  /**
   * Update longest streak for tournament (on-chain)
   */
  async updateLongestStreak(
    tournamentId: number,
    playerAddress: string,
    gameStreak: number,
    totalCoins: number
  ): Promise<{ transactionDigest: string }> {
    // 1. Get current streak from blockchain
    // 2. Only update if new streak is longer
    // 3. Call smart contract to update on-chain
    // 4. Return transaction digest
  }
  
  /**
   * Update highest score for tournament (on-chain)
   */
  async updateHighestScore(
    tournamentId: number,
    playerAddress: string,
    gameScore: number
  ): Promise<{ transactionDigest: string }> {
    // 1. Get current score from blockchain
    // 2. Only update if new score is higher
    // 3. Call smart contract to update on-chain
    // 4. Return transaction digest
  }
}
```

#### 2.3 API Endpoints

**File:** `backend/src/routes/tournaments.ts`

```typescript
import express from 'express';
import { TournamentService } from '../services/tournament-service';
import { authenticateWallet } from '../middleware/auth';

const router = express.Router();
const tournamentService = new TournamentService(suiClient);

/**
 * GET /api/tournaments/active
 * Get all active weekly tournaments
 */
router.get('/active', async (req, res) => {
  try {
    const tournaments = await tournamentService.getActiveTournaments();
    res.json({ tournaments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/tournaments/:tournamentId
 * Get tournament details
 */
router.get('/:tournamentId', async (req, res) => {
  try {
    const tournament = await tournamentService.getTournament(parseInt(req.params.tournamentId));
    res.json({ tournament });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/tournaments/:tournamentId/leaderboard
 * Get tournament leaderboard
 */
router.get('/:tournamentId/leaderboard', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const leaderboard = await tournamentService.getTournamentLeaderboard(
      parseInt(req.params.tournamentId),
      limit
    );
    res.json({ leaderboard });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/tournaments/:tournamentId/rank/:playerAddress
 * Get player's rank in tournament
 */
router.get('/:tournamentId/rank/:playerAddress', async (req, res) => {
  try {
    const rank = await tournamentService.getPlayerRank(
      parseInt(req.params.tournamentId),
      req.params.playerAddress
    );
    res.json({ rank });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/tournaments/:tournamentId/enter
 * Enter tournament (requires wallet signature)
 */
router.post('/:tournamentId/enter', authenticateWallet, async (req, res) => {
  try {
    const { playerAddress } = req.user;
    const tournamentId = parseInt(req.params.tournamentId);
    // No entryFee in body - tournament entry uses tickets from GamePass
    
    const result = await tournamentService.enterTournament(
      playerAddress,
      tournamentId
    );
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

#### 2.4 Admin API Endpoints

**File:** `backend/app/api/admin/tournaments/route.ts`

**Note:** These endpoints will be integrated into the existing admin page (`backend/app/admin/page.tsx`) with a new "Tournaments" tab.

```typescript
import { NextRequest } from 'next/server';
import { withApiHandler } from '@/lib/api/api-handler';
import { TournamentService } from '@/lib/sui/tournament-service/tournament-service';
import { getSuiClient } from '@/lib/sui/sui-client';
import { verifyAdminWallet } from '@/lib/api/admin-auth';

const suiClient = getSuiClient();
const tournamentService = new TournamentService(suiClient);

/**
 * POST /api/admin/tournaments/create
 * Create a new weekly tournament (admin only)
 * Requires admin wallet authentication
 */
export const POST = withApiHandler(
  async (request: NextRequest) => {
    const body = await request.json();
    const { 
      name, 
      category, 
      startTime, 
      endTime, 
      entryFeeTickets,
      adminWalletAddress 
    } = body;
    
    // Verify admin wallet
    const isAdmin = await verifyAdminWallet(adminWalletAddress);
    if (!isAdmin) {
      return {
        success: false,
        error: 'Unauthorized: Admin wallet required'
      };
    }
    
    // Validate required fields
    if (!name || !category || !startTime || !endTime || entryFeeTickets === undefined) {
      return {
        success: false,
        error: 'Missing required fields: name, category, startTime, endTime, entryFeeTickets'
      };
    }
    
    // Validate category
    const validCategories = ['totalCoins', 'longestStreak', 'highestScore', 'longestDistance', 'mostBosses', 'mostEnemies'];
    if (!validCategories.includes(category)) {
      return {
        success: false,
        error: `Invalid category. Must be one of: ${validCategories.join(', ')}`
      };
    }
    
    // Validate times
    if (startTime >= endTime) {
      return {
        success: false,
        error: 'startTime must be before endTime'
      };
    }
    
    // Validate entry fee
    if (entryFeeTickets < 1) {
      return {
        success: false,
        error: 'entryFeeTickets must be at least 1'
      };
    }
    
    try {
      // Create tournament on blockchain
      const tournament = await tournamentService.createWeeklyTournament({
        name,
        category,
        startTime,
        endTime,
        entryFeeTickets
      });
      
      return {
        success: true,
        tournament
      };
    } catch (error) {
      console.error('Error creating tournament:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create tournament'
      };
    }
  }
);

/**
 * GET /api/admin/tournaments
 * Get all tournaments (admin view - includes active, past, and upcoming)
 */
export const GET = withApiHandler(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const adminWalletAddress = searchParams.get('adminWalletAddress');
    
    // Verify admin wallet
    if (adminWalletAddress) {
      const isAdmin = await verifyAdminWallet(adminWalletAddress);
      if (!isAdmin) {
        return {
          success: false,
          error: 'Unauthorized: Admin wallet required'
        };
      }
    }
    
    try {
      // Get all tournaments (active, past, upcoming)
      const activeTournaments = await tournamentService.getActiveTournaments();
      const pastTournaments = await tournamentService.getPastTournaments();
      
      // Note: Upcoming tournaments can be filtered from active by checking startTime > now
      const now = Date.now();
      const upcomingTournaments = activeTournaments.filter(t => t.startTime > now);
      const currentlyActive = activeTournaments.filter(t => t.startTime <= now && t.endTime >= now);
      
      return {
        success: true,
        tournaments: {
          active: currentlyActive,
          upcoming: upcomingTournaments,
          past: pastTournaments
        }
      };
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch tournaments'
      };
    }
  }
);
```

**File:** `backend/app/api/admin/tournaments/[tournamentId]/end/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { withApiHandler } from '@/lib/api/api-handler';
import { TournamentService } from '@/lib/sui/tournament-service/tournament-service';
import { getSuiClient } from '@/lib/sui/sui-client';
import { verifyAdminWallet } from '@/lib/api/admin-auth';

const suiClient = getSuiClient();
const tournamentService = new TournamentService(suiClient);

/**
 * POST /api/admin/tournaments/:tournamentId/end
 * End tournament and distribute rewards (admin only)
 * Requires admin wallet authentication
 */
export const POST = withApiHandler(
  async (request: NextRequest, { params }: { params: { tournamentId: string } }) => {
    const body = await request.json();
    const { adminWalletAddress } = body;
    const tournamentId = parseInt(params.tournamentId);
    
    // Verify admin wallet
    const isAdmin = await verifyAdminWallet(adminWalletAddress);
    if (!isAdmin) {
      return {
        success: false,
        error: 'Unauthorized: Admin wallet required'
      };
    }
    
    if (isNaN(tournamentId)) {
      return {
        success: false,
        error: 'Invalid tournament ID'
      };
    }
    
    try {
      // End tournament and distribute rewards on blockchain
      const result = await tournamentService.endTournament(tournamentId);
      
      return {
        success: true,
        result
      };
    } catch (error) {
      console.error('Error ending tournament:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to end tournament'
      };
    }
  }
);
```

**File:** `backend/app/api/admin/tournaments/[tournamentId]/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { withApiHandler } from '@/lib/api/api-handler';
import { TournamentService } from '@/lib/sui/tournament-service/tournament-service';
import { getSuiClient } from '@/lib/sui/sui-client';
import { verifyAdminWallet } from '@/lib/api/admin-auth';

const suiClient = getSuiClient();
const tournamentService = new TournamentService(suiClient);

/**
 * GET /api/admin/tournaments/:tournamentId
 * Get tournament details (admin view - includes full leaderboard, participant list, etc.)
 */
export const GET = withApiHandler(
  async (request: NextRequest, { params }: { params: { tournamentId: string } }) => {
    const { searchParams } = new URL(request.url);
    const adminWalletAddress = searchParams.get('adminWalletAddress');
    const tournamentId = parseInt(params.tournamentId);
    
    // Verify admin wallet
    if (adminWalletAddress) {
      const isAdmin = await verifyAdminWallet(adminWalletAddress);
      if (!isAdmin) {
        return {
          success: false,
          error: 'Unauthorized: Admin wallet required'
        };
      }
    }
    
    if (isNaN(tournamentId)) {
      return {
        success: false,
        error: 'Invalid tournament ID'
      };
    }
    
    try {
      // Get tournament with full details
      const tournament = await tournamentService.getTournament(tournamentId);
      const leaderboard = await tournamentService.getTournamentLeaderboard(tournamentId, 1000); // Get full leaderboard
      
      return {
        success: true,
        tournament: {
          ...tournament,
          leaderboard,
          participantCount: leaderboard.length
        }
      };
    } catch (error) {
      console.error('Error fetching tournament:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch tournament'
      };
    }
  }
);
```

**Admin Page Integration:**

The tournament management will be added as a new tab in the existing admin page (`backend/app/admin/page.tsx`):

```typescript
// Add to Tab type
type Tab = 'items' | 'badges' | 'migration' | 'score-migration' | 'sound-test' | 'tournaments';

// Add Tournament Management Tab Component
function TournamentManagementTab() {
  const [tournaments, setTournaments] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    category: 'totalCoins',
    startTime: '',
    endTime: '',
    entryFeeTickets: 1
  });
  
  // Tournament creation form
  // Tournament list (active, upcoming, past)
  // End tournament button
  // Tournament details view
}
```

**Admin Page Features:**
- **Create Tournament Form:**
  - Tournament name
  - Category selector (Total Coins, Longest Streak, Highest Score, etc.)
  - Start time (date/time picker)
  - End time (date/time picker)
  - Entry fee (tickets, typically 1)
  - Create button (calls `/api/admin/tournaments/create`)

- **Tournament List:**
  - Active tournaments
  - Upcoming tournaments
  - Past tournaments
  - Each tournament shows: name, category, dates, participants, prize pool

- **Tournament Actions:**
  - View details (leaderboard, participants)
  - End tournament button (calls `/api/admin/tournaments/:id/end`)
  - View results (after tournament ends)
```

---

### Phase 3: Blockchain-Only Architecture (Week 2)

## Architecture: Sui Blockchain Only

**Since Sui is fast and cheap, we'll use the blockchain as the single source of truth:**

### All Data on Blockchain:
- ✅ **Tournament creation** - Immutable tournament records
- ✅ **Entry payments** - Entry fees and prize pool (on-chain funds)
- ✅ **Score tracking** - All scores stored on-chain
- ✅ **Leaderboards** - Calculated from on-chain data
- ✅ **Reward distribution** - Prize payouts (on-chain transactions)
- ✅ **Events** - Tournament lifecycle events (for querying)

### Data Flow:
```
Game Ends
  ↓
Update Blockchain (Sui transaction) ← All data stored on-chain
  ↓
Query Blockchain for Leaderboard ← Direct queries, fast on Sui
  ↓
Display with Loading Screen ← User sees loading while querying
```

**Key Benefits:**
1. **Simplicity** - No database to maintain, no sync logic
2. **Single Source of Truth** - Blockchain is always accurate
3. **No Data Duplication** - Everything in one place
4. **Sui Performance** - Fast enough for real-time queries
5. **Cost Effective** - Sui transactions are cheap

**Note:** Users will see loading screens while querying the blockchain, which is acceptable for this implementation.

#### Enhanced Smart Contract for Efficient Queries

Since we're using blockchain-only, we need to structure the contract for efficient querying:

```move
/// Enhanced tournament structure for efficient queries
struct Tournament has key {
    id: UID,
    tournament_id: u64,
    name: vector<u8>,
    category: u8,
    start_time: u64,
    end_time: u64,
    entry_fee_tickets: u64,  // Entry fee in tournament tickets (typically 1)
    prize_pool: u64,
    participants: Table<address, bool>,
    scores: Table<address, u64>,  // Player -> score/value
    rewards_distributed: bool,
    created_at: u64,
}

/// Helper function to get all scores (for leaderboard)
/// Note: Returns all entries - frontend will sort and paginate
public fun get_all_scores(
    tournament: &Tournament
): vector<LeaderboardEntry> {
    // Returns all entries from scores table
    // Frontend will sort and paginate client-side
}

/// Helper function to get participant count
public fun get_participant_count(
    tournament: &Tournament
): u64 {
    // Count entries in participants table
    // Can be calculated from Table size
}

/// Batch update scores (for efficiency)
public entry fun batch_update_scores(
    admin_cap: &AdminCapability,
    tournament: &mut Tournament,
    updates: vector<(address, u64)>,
    ctx: &mut TxContext
) {
    // Update multiple scores in one transaction
    // More efficient than individual updates
    // Useful for backend service batching
}
```

**Query Strategy:**
- **Use Sui Events** - Index tournaments via events (faster than querying objects)
- **Direct Object Queries** - Query tournament objects when needed
- **Client-Side Processing** - Frontend handles sorting/pagination
- **Loading Screens** - Show loading indicators during blockchain queries (acceptable UX)
- **Batch Operations** - Group multiple updates in single transactions when possible

---

### Phase 3.5: Store Modal Integration for Ticket Purchases

**All purchases (Items, Game Pass, Tournament Tickets) use the unified Store Modal with tabs.**

#### Store Modal Tabs

- **Items Tab**: Game items (existing)
- **Game Pass Tab**: Credit packs and pay-per-game
- **Tournament Tickets Tab**: Tournament ticket purchases

#### Context-Aware Tab Visibility

- **Main Menu**: All tabs visible (Items, Game Pass, Tickets)
- **During Gameplay (Paywall)**: Only Game Pass tab visible
- **Tournament Section**: Only Tickets tab visible

#### Tournament Access & Ticket Purchase Flow

**Important:** Players can always access the tournament overlay/page, regardless of ticket status. Ticket checks only occur when attempting to enter a specific tournament.

```
1. Player clicks "Tournaments" button (from main menu or anywhere)
   ↓
2. Tournament overlay opens (no ticket check required)
   - Player can view all active tournaments
   - Player can view leaderboards
   - Player can view past tournaments
   - Player can see their tournament history
   ↓
3. Player clicks "Enter Tournament" on a specific tournament
   ↓
4. Check if player has tickets:
   - If YES: Enter tournament directly (consume ticket)
   - If NO: Show store modal (Tickets tab only)
   ↓
5. Store modal opens with Tickets tab active
   - Badge tier queried when tab is shown (like store items)
   - Shows ticket purchase options:
     * Single ticket: $1.00 (1 ticket)
     * Ticket bundles: 6 tickets ($5.00), 12 tickets ($10.00), 25 tickets ($20.00)
     * Bundle pricing: Fixed prices per bundle (no bundle discount currently, but structure supports it)
   - Badge discount applied to all ticket purchases (0-20% based on tier)
   - Payment method selector (SUI/$MEWS/USDC)
   - Balance display
   ↓
6. Player selects ticket quantity (single or bundle) and purchases
   ↓
7. After purchase: Tickets added to GamePass
   ↓
8. Player can now enter tournament (ticket consumed on entry)
```

**Key Points:**
- **Tournament overlay is always accessible** - No ticket required to view tournaments
- **Ticket check only happens on entry** - When clicking "Enter Tournament" button
- **Store modal appears contextually** - Only when needed (no tickets)
- **Player can browse freely** - View leaderboards, past results, active tournaments without tickets

### Phase 4: Frontend Integration (Week 3)

#### 4.1 Tournament Page Structure

**UI/UX Approach:**
- **Tournament Overlay** (matches main menu framework)
- Uses same overlay pattern as main menu (`.tournament-overlay`, `.tournament-overlay-hidden`, `.tournament-overlay-visible`)
- Main menu closes when tournament overlay opens
- Back button to return to main menu
- Consistent styling and behavior with main menu

**Resource Management:**
- **Lazy Loading:** Tournament data only loads when overlay is shown
- **Loading Screen:** Shows during transition and data loading
- **Cleanup on Hide:** Clears DOM, stops polling, clears caches
- **Memory Optimization:** Removes data when overlay is hidden

**File:** `index.html` - Add Tournament Overlay (matches main menu structure)

```html
<!-- Tournament Overlay (same framework as main menu) -->
<div class="tournament-overlay tournament-overlay-hidden" id="tournamentOverlay">
  <div class="tournament-content">
    <!-- Header with back button -->
    <div class="tournament-header">
      <button class="back-button menu-btn" onclick="closeTournamentPage()" onmouseover="playMenuHoverSound()">
        <span class="btn-icon">←</span>
        Back to Menu
      </button>
      <h1 class="tournament-title">
        <span class="btn-icon">🏆</span>
        Tournaments
      </h1>
    </div>
    
    <!-- Tournament content will be loaded here -->
    <div id="tournamentContent">
      <!-- TournamentList component will render here -->
    </div>
  </div>
</div>
```

**File:** `index.html` - Add Tournament Button to Main Menu

```html
<button class="menu-btn" onclick="showTournaments()" onmouseover="playMenuHoverSound()">
  <span class="btn-icon">🏆</span>
  Tournaments
</button>
```

**File:** `src/game/systems/ui/tournament-service.js` - Navigation Functions (matches MenuService pattern)

```javascript
/**
 * Tournament Service - Handles tournament overlay navigation
 * Follows same pattern as MenuService for consistency
 */
const TournamentService = {
  // State
  _isVisible: false,
  _initialized: false,
  
  // DOM element cache
  _tournamentOverlayCache: null,
  
  // Resource management
  _leaderboardPollInterval: null,  // Leaderboard polling interval
  _cachedTournaments: null,         // Cached tournament list
  _cachedLeaderboards: new Map(),   // Cached leaderboards per tournament
  
  /**
   * Get cached tournament overlay element
   * @private
   */
  _getTournamentOverlay() {
    if (!this._tournamentOverlayCache) {
      this._tournamentOverlayCache = document.getElementById('tournamentOverlay');
    }
    return this._tournamentOverlayCache;
  },
  
  /**
   * Initialize tournament service
   */
  init() {
    if (this._initialized) return;
    
    this._tournamentOverlayCache = document.getElementById('tournamentOverlay');
    
    if (!this._tournamentOverlayCache) {
      console.error('TOURNAMENT SERVICE', 'Tournament overlay element not found!');
      return;
    }
    
    this._initialized = true;
    console.info('TOURNAMENT SERVICE', 'Initialized');
  },
  
  /**
   * Show tournament overlay (closes main menu)
   * NO TICKET CHECK - Players can always view tournaments
   * Uses loading screen during transition and data loading
   */
  async show() {
    console.debug('TOURNAMENT SERVICE', 'Showing tournament overlay (no ticket check)');
    
    // Show loading screen during transition
    if (typeof LoadingManager !== 'undefined') {
      LoadingManager.show('Loading tournaments... Please wait');
    } else if (typeof showLoadingModal === 'function') {
      showLoadingModal('Loading tournaments... Please wait', 'tournamentLoadingModal');
    }
    
    // Hide main menu (using MenuService if available)
    if (typeof MenuService !== 'undefined') {
      MenuService.hide();
    } else {
      // Fallback: hide main menu directly
      const mainMenu = document.getElementById('mainMenuOverlay');
      if (mainMenu) {
        mainMenu.classList.remove('main-menu-overlay-visible');
        mainMenu.classList.add('main-menu-overlay-hidden');
      }
    }
    
    // Hide game container
    const gameContainer = document.getElementById('gameContainer');
    if (gameContainer) {
      gameContainer.style.display = 'none';
    }
    
    // Show tournament overlay (same pattern as main menu)
    const tournamentOverlay = this._getTournamentOverlay();
    if (tournamentOverlay) {
      tournamentOverlay.classList.remove('tournament-overlay-hidden');
      tournamentOverlay.classList.add('tournament-overlay-visible');
      
      // Remove inline styles to allow CSS classes to control visibility
      tournamentOverlay.style.display = '';
      tournamentOverlay.style.visibility = '';
      tournamentOverlay.style.opacity = '';
      
      this._isVisible = true;
      console.debug('TOURNAMENT SERVICE', 'Tournament overlay shown');
    } else {
      console.error('TOURNAMENT SERVICE', 'Tournament overlay element not found!');
      // Hide loading screen on error
      if (typeof LoadingManager !== 'undefined') {
        LoadingManager.hide();
      } else if (typeof hideLoadingModal === 'function') {
        hideLoadingModal('tournamentLoadingModal');
      }
      return;
    }
    
    // Load tournament data (lazy loading - only when overlay is shown)
    try {
      await this.loadTournaments();
      
      // Hide loading screen after data is loaded
      if (typeof LoadingManager !== 'undefined') {
        LoadingManager.hide();
      } else if (typeof hideLoadingModal === 'function') {
        hideLoadingModal('tournamentLoadingModal');
      }
    } catch (error) {
      console.error('TOURNAMENT SERVICE', 'Error loading tournaments:', error);
      // Hide loading screen on error
      if (typeof LoadingManager !== 'undefined') {
        LoadingManager.hide();
      } else if (typeof hideLoadingModal === 'function') {
        hideLoadingModal('tournamentLoadingModal');
      }
    }
  },
  
  /**
   * Hide tournament overlay (returns to main menu)
   * Cleans up resources and stops any polling/intervals
   */
  hide() {
    console.debug('TOURNAMENT SERVICE', 'Hiding tournament overlay');
    
    // Cleanup: Stop any polling/intervals
    this._cleanup();
    
    // Clear tournament data from DOM (free memory)
    const tournamentContent = document.getElementById('tournamentContent');
    if (tournamentContent) {
      tournamentContent.innerHTML = ''; // Clear content
    }
    
    const tournamentOverlay = this._getTournamentOverlay();
    if (tournamentOverlay) {
      tournamentOverlay.classList.remove('tournament-overlay-visible');
      tournamentOverlay.classList.add('tournament-overlay-hidden');
      
      this._isVisible = false;
      console.debug('TOURNAMENT SERVICE', 'Tournament overlay hidden');
    }
    
    // Show main menu (using MenuService if available)
    if (typeof MenuService !== 'undefined') {
      MenuService.show();
    } else {
      // Fallback: show main menu directly
      const mainMenu = document.getElementById('mainMenuOverlay');
      if (mainMenu) {
        mainMenu.classList.remove('main-menu-overlay-hidden');
        mainMenu.classList.add('main-menu-overlay-visible');
      }
    }
  },
  
  /**
   * Cleanup resources (stop polling, clear intervals, etc.)
   * @private
   */
  _cleanup() {
    // Stop leaderboard polling if active
    if (this._leaderboardPollInterval) {
      clearInterval(this._leaderboardPollInterval);
      this._leaderboardPollInterval = null;
    }
    
    // Clear any cached tournament data
    this._cachedTournaments = null;
    this._cachedLeaderboards = new Map();
    
    console.debug('TOURNAMENT SERVICE', 'Resources cleaned up');
  },
  
  /**
   * Load and display tournaments (lazy loading - only when needed)
   */
  async loadTournaments() {
    console.debug('TOURNAMENT SERVICE', 'Loading tournaments...');
    
    // Check cache first (if data was loaded recently, reuse it)
    if (this._cachedTournaments && Date.now() - this._cacheTimestamp < 30000) {
      // Use cached data if less than 30 seconds old
      console.debug('TOURNAMENT SERVICE', 'Using cached tournament data');
      this._renderTournaments(this._cachedTournaments);
      return;
    }
    
    try {
      // Update loading message
      if (typeof LoadingManager !== 'undefined') {
        LoadingManager.update('Fetching tournaments from blockchain...');
      } else if (typeof updateLoadingModalMessage === 'function') {
        updateLoadingModalMessage('Fetching tournaments from blockchain...', 'tournamentLoadingModal');
      }
      
      // Query blockchain for active tournaments
      const response = await fetch('/api/tournaments/active');
      if (!response.ok) {
        throw new Error(`Failed to fetch tournaments: ${response.statusText}`);
      }
      
      const data = await response.json();
      const tournaments = data.tournaments || [];
      
      // Cache the data
      this._cachedTournaments = tournaments;
      this._cacheTimestamp = Date.now();
      
      // Render tournaments
      this._renderTournaments(tournaments);
      
      // Start leaderboard polling for active tournaments
      this._startLeaderboardPolling(tournaments);
      
      console.debug('TOURNAMENT SERVICE', `Loaded ${tournaments.length} tournaments`);
    } catch (error) {
      console.error('TOURNAMENT SERVICE', 'Error loading tournaments:', error);
      this._showError('Failed to load tournaments. Please try again.');
      throw error;
    }
  },
  
  /**
   * Render tournaments in the DOM
   * @private
   */
  _renderTournaments(tournaments) {
    const tournamentContent = document.getElementById('tournamentContent');
    if (!tournamentContent) {
      console.error('TOURNAMENT SERVICE', 'Tournament content element not found');
      return;
    }
    
    // Clear existing content
    tournamentContent.innerHTML = '';
    
    // Render tournament list (using TournamentList component or direct DOM)
    // This will be implemented with the TournamentList component
    if (tournaments.length === 0) {
      tournamentContent.innerHTML = '<div class="no-tournaments">No active tournaments at this time.</div>';
    } else {
      // TournamentList component will render here
      // For now, placeholder
      tournaments.forEach(tournament => {
        // TournamentCard will be rendered here
      });
    }
  },
  
  /**
   * Start polling for leaderboard updates (only for active tournaments)
   * @private
   */
  _startLeaderboardPolling(tournaments) {
    // Stop any existing polling
    if (this._leaderboardPollInterval) {
      clearInterval(this._leaderboardPollInterval);
    }
    
    // Only poll if there are active tournaments
    if (tournaments.length === 0) {
      return;
    }
    
    // Poll every 30 seconds for leaderboard updates
    this._leaderboardPollInterval = setInterval(() => {
      this._updateLeaderboards(tournaments);
    }, 30000);
    
    console.debug('TOURNAMENT SERVICE', 'Started leaderboard polling (30s interval)');
  },
  
  /**
   * Update leaderboards for active tournaments
   * @private
   */
  async _updateLeaderboards(tournaments) {
    // Only update leaderboards for tournaments the player is in
    // This reduces unnecessary blockchain queries
    for (const tournament of tournaments) {
      // Check if player is in this tournament
      // Update leaderboard if needed
      // Implementation will check player participation before querying
    }
  },
  
  /**
   * Show error message in tournament content
   * @private
   */
  _showError(message) {
    const tournamentContent = document.getElementById('tournamentContent');
    if (tournamentContent) {
      tournamentContent.innerHTML = `<div class="tournament-error">${message}</div>`;
    }
  }
};

// Global functions for HTML onclick (matches main menu pattern)
function showTournaments() {
  TournamentService.show();
}

function closeTournamentPage() {
  TournamentService.hide();
}

// Initialize on load
if (typeof window !== 'undefined') {
  window.TournamentService = TournamentService;
  window.showTournaments = showTournaments;
  window.closeTournamentPage = closeTournamentPage;
}
```

**File:** `src/game/rendering/responsive/shared/shared-tournament-overlay.css` - Tournament Overlay Styling (matches main menu pattern)

```css
/* ========================================== */
/* TOURNAMENT OVERLAY MODULE */
/* ========================================== */
/* Tournament overlay - matches main menu framework */

/* Tournament Overlay (same structure as main-menu-overlay) */
.tournament-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: calc(var(--app-vh, 1vh) * 100); /* Legacy/JS fallback */
  height: 100dvh; /* Dynamic viewport (modern) */
  height: 100svh; /* Safe viewport (iOS 16+). Last wins when supported */
  max-height: 100svh; /* Constrain to safe viewport */
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(15, 20, 25, 0.98) 100%);
  align-items: center;
  justify-content: center;
  z-index: 2000; /* Same z-index as main menu */
  backdrop-filter: blur(20px);
  display: none; /* Hidden by default - use visibility classes to show */
  overflow: hidden;
}

/* Tournament overlay is flex only when visible (matches main menu) */
.tournament-overlay[class*="-visible"] {
  display: flex;
  animation: menuFadeIn 0.8s ease-out; /* Reuse main menu animation */
}

/* Tournament overlay is hidden when it has -hidden class */
.tournament-overlay[class*="-hidden"] {
  display: none;
}

/* Tournament Content (matches main-menu-content structure) */
.tournament-content {
  width: 100%;
  max-width: 1200px;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px;
  overflow-y: auto;
  gap: 20px;
}

/* Tournament Header */
.tournament-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 0;
  border-bottom: 2px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.tournament-title {
  font-size: 2.5rem;
  color: #fff;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 15px;
}

/* Back Button (uses menu-btn styling for consistency) */
.tournament-header .back-button {
  /* Inherits .menu-btn styles from shared-ui-classes.css */
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Tournament Content Area */
#tournamentContent {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
}

/* Responsive Design */
@media (max-width: 768px) {
  .tournament-content {
    padding: 15px;
  }
  
  .tournament-title {
    font-size: 1.8rem;
  }
  
  .tournament-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
}
```

#### 4.1.1 Resource Management Strategy

**Loading Strategy:**
- **Lazy Loading:** Tournament data only loads when overlay is shown
- **Caching:** Tournament data cached for 30 seconds to avoid redundant queries
- **Loading Screen:** Shows during transition and data loading
- **Progressive Loading:** Show overlay first, then load data

**Unloading Strategy:**
- **Cleanup on Hide:** Clear DOM content, stop polling, clear caches
- **Memory Management:** Remove tournament data from DOM when overlay is hidden
- **Interval Management:** Stop leaderboard polling when overlay is hidden
- **Cache Invalidation:** Clear cached data when overlay is closed

**Resource Optimization:**
- **Polling Control:** Only poll leaderboards for tournaments player is in
- **Selective Updates:** Update only visible leaderboards
- **Debouncing:** Debounce rapid show/hide operations
- **Memory Cleanup:** Clear large data structures when not needed

**Loading Screen Integration:**
- Show loading screen when transitioning between overlays
- Update loading message during different phases (fetching, rendering, etc.)
- Hide loading screen after data is loaded and rendered
- Show error state if loading fails

#### 4.2 Tournament Navigation Tabs Component

**File:** `src/components/tournaments/TournamentTabs.tsx`

```typescript
import React, { useState } from 'react';
import { ActiveTournamentsTab } from './tabs/ActiveTournamentsTab';
import { MyTournamentsTab } from './tabs/MyTournamentsTab';
import { PastTournamentsTab } from './tabs/PastTournamentsTab';
import { LeaderboardsTab } from './tabs/LeaderboardsTab';

type TabType = 'active' | 'my-tournaments' | 'past' | 'leaderboards';

export const TournamentTabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('active');
  
  const tabs = [
    { id: 'active' as TabType, label: 'Active Tournaments', icon: '🏆' },
    { id: 'my-tournaments' as TabType, label: 'My Tournaments', icon: '👤' },
    { id: 'past' as TabType, label: 'Past Results', icon: '📜' },
    { id: 'leaderboards' as TabType, label: 'Leaderboards', icon: '📊' },
  ];
  
  return (
    <div className="tournament-tabs-container">
      {/* Tab Navigation */}
      <div className="tournament-tabs-nav">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tournament-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>
      
      {/* Tab Content */}
      <div className="tournament-tab-content">
        {activeTab === 'active' && <ActiveTournamentsTab />}
        {activeTab === 'my-tournaments' && <MyTournamentsTab />}
        {activeTab === 'past' && <PastTournamentsTab />}
        {activeTab === 'leaderboards' && <LeaderboardsTab />}
      </div>
    </div>
  );
};
```

#### 4.3 Active Tournaments Tab

**File:** `src/components/tournaments/tabs/ActiveTournamentsTab.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { TournamentCard } from '../TournamentCard';
import { Tournament } from '../../../types/tournament';

export const ActiveTournamentsTab: React.FC = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    fetchActiveTournaments();
  }, []);
  
  const fetchActiveTournaments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/tournaments/active');
      if (!response.ok) {
        throw new Error('Failed to fetch active tournaments');
      }
      const data = await response.json();
      setTournaments(data.tournaments || []);
    } catch (error) {
      console.error('Failed to fetch active tournaments:', error);
      setError('Failed to load tournaments. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleEnterTournament = async (tournamentId: number) => {
    // Handle tournament entry
    // This will be implemented in TournamentCard
  };
  
  if (loading) {
    return (
      <div className="tournament-loading">
        <div className="spinner"></div>
        <p>Loading active tournaments...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="tournament-error">
        <p>{error}</p>
        <button onClick={fetchActiveTournaments}>Retry</button>
      </div>
    );
  }
  
  if (tournaments.length === 0) {
    return (
      <div className="tournament-empty">
        <p>No active tournaments at this time.</p>
        <p className="empty-subtitle">Check back soon for new tournaments!</p>
      </div>
    );
  }
  
  return (
    <div className="active-tournaments-tab">
      <div className="tournament-grid">
        {tournaments.map(tournament => (
          <TournamentCard
            key={tournament.id}
            tournament={tournament}
            onEnter={handleEnterTournament}
          />
        ))}
      </div>
    </div>
  );
};
```

#### 4.4 My Tournaments Tab

**File:** `src/components/tournaments/tabs/MyTournamentsTab.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { TournamentCard } from '../TournamentCard';
import { Tournament } from '../../../types/tournament';

export const MyTournamentsTab: React.FC = () => {
  const [myTournaments, setMyTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [playerAddress, setPlayerAddress] = useState<string | null>(null);
  
  useEffect(() => {
    // Get player address from wallet
    const address = getPlayerAddress(); // Implement this based on your wallet system
    setPlayerAddress(address);
    
    if (address) {
      fetchMyTournaments(address);
    }
  }, []);
  
  const fetchMyTournaments = async (address: string) => {
    try {
      setLoading(true);
      // Query tournaments where player has entered
      const response = await fetch(`/api/tournaments/my-tournaments?player=${address}`);
      if (!response.ok) {
        throw new Error('Failed to fetch my tournaments');
      }
      const data = await response.json();
      setMyTournaments(data.tournaments || []);
    } catch (error) {
      console.error('Failed to fetch my tournaments:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleEnterTournament = async (tournamentId: number) => {
    // Handle tournament entry
  };
  
  if (!playerAddress) {
    return (
      <div className="tournament-empty">
        <p>Please connect your wallet to view your tournaments.</p>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className="tournament-loading">
        <div className="spinner"></div>
        <p>Loading your tournaments...</p>
      </div>
    );
  }
  
  if (myTournaments.length === 0) {
    return (
      <div className="tournament-empty">
        <p>You haven't entered any tournaments yet.</p>
        <p className="empty-subtitle">Check out Active Tournaments to get started!</p>
      </div>
    );
  }
  
  // Separate active and past tournaments
  const activeTournaments = myTournaments.filter(t => 
    t.endTime > Date.now() && t.startTime <= Date.now()
  );
  const upcomingTournaments = myTournaments.filter(t => t.startTime > Date.now());
  const pastTournaments = myTournaments.filter(t => t.endTime <= Date.now());
  
  return (
    <div className="my-tournaments-tab">
      {activeTournaments.length > 0 && (
        <section className="tournament-section">
          <h3>Active Tournaments</h3>
          <div className="tournament-grid">
            {activeTournaments.map(tournament => (
              <TournamentCard
                key={tournament.id}
                tournament={tournament}
                onEnter={handleEnterTournament}
                showMyRank={true}
              />
            ))}
          </div>
        </section>
      )}
      
      {upcomingTournaments.length > 0 && (
        <section className="tournament-section">
          <h3>Upcoming Tournaments</h3>
          <div className="tournament-grid">
            {upcomingTournaments.map(tournament => (
              <TournamentCard
                key={tournament.id}
                tournament={tournament}
                onEnter={handleEnterTournament}
                showMyRank={false}
              />
            ))}
          </div>
        </section>
      )}
      
      {pastTournaments.length > 0 && (
        <section className="tournament-section">
          <h3>Past Tournaments</h3>
          <div className="tournament-grid">
            {pastTournaments.map(tournament => (
              <TournamentCard
                key={tournament.id}
                tournament={tournament}
                onEnter={null}
                showMyRank={true}
                showResults={true}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
```

#### 4.5 Past Tournaments Tab

**File:** `src/components/tournaments/tabs/PastTournamentsTab.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { Tournament } from '../../../types/tournament';
import { PastTournamentCard } from '../PastTournamentCard';

export const PastTournamentsTab: React.FC = () => {
  const [pastTournaments, setPastTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  useEffect(() => {
    fetchPastTournaments();
  }, [selectedCategory]);
  
  const fetchPastTournaments = async () => {
    try {
      setLoading(true);
      const url = selectedCategory 
        ? `/api/tournaments/past?category=${selectedCategory}`
        : '/api/tournaments/past';
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch past tournaments');
      }
      const data = await response.json();
      setPastTournaments(data.tournaments || []);
    } catch (error) {
      console.error('Failed to fetch past tournaments:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const categories = [
    { id: null, label: 'All Categories' },
    { id: 'totalCoins', label: 'Total Coins' },
    { id: 'longestStreak', label: 'Longest Streak' },
    { id: 'highestScore', label: 'Highest Score' },
    { id: 'longestDistance', label: 'Longest Distance' },
    { id: 'mostBosses', label: 'Most Bosses' },
    { id: 'mostEnemies', label: 'Most Enemies' },
  ];
  
  if (loading) {
    return (
      <div className="tournament-loading">
        <div className="spinner"></div>
        <p>Loading past tournaments...</p>
      </div>
    );
  }
  
  return (
    <div className="past-tournaments-tab">
      {/* Category Filter */}
      <div className="category-filter">
        {categories.map(cat => (
          <button
            key={cat.id || 'all'}
            className={`category-filter-btn ${selectedCategory === cat.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>
      
      {/* Past Tournaments List */}
      {pastTournaments.length === 0 ? (
        <div className="tournament-empty">
          <p>No past tournaments found.</p>
        </div>
      ) : (
        <div className="past-tournaments-list">
          {pastTournaments.map(tournament => (
            <PastTournamentCard
              key={tournament.id}
              tournament={tournament}
            />
          ))}
        </div>
      )}
    </div>
  );
};
```

#### 4.6 Leaderboards Tab

**File:** `src/components/tournaments/tabs/LeaderboardsTab.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { TournamentLeaderboard } from '../TournamentLeaderboard';
import { Tournament } from '../../../types/tournament';

export const LeaderboardsTab: React.FC = () => {
  const [activeTournaments, setActiveTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'detailed'>('list');
  
  useEffect(() => {
    fetchActiveTournaments();
  }, []);
  
  const fetchActiveTournaments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tournaments/active');
      if (!response.ok) {
        throw new Error('Failed to fetch tournaments');
      }
      const data = await response.json();
      setActiveTournaments(data.tournaments || []);
      
      // Auto-select first tournament if available
      if (data.tournaments && data.tournaments.length > 0) {
        setSelectedTournament(data.tournaments[0]);
      }
    } catch (error) {
      console.error('Failed to fetch tournaments:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="tournament-loading">
        <div className="spinner"></div>
        <p>Loading leaderboards...</p>
      </div>
    );
  }
  
  if (activeTournaments.length === 0) {
    return (
      <div className="tournament-empty">
        <p>No active tournaments to display leaderboards.</p>
      </div>
    );
  }
  
  return (
    <div className="leaderboards-tab">
      {/* Tournament Selector */}
      <div className="tournament-selector">
        <label>Select Tournament:</label>
        <select
          value={selectedTournament?.id || ''}
          onChange={(e) => {
            const tournament = activeTournaments.find(t => t.id === parseInt(e.target.value));
            setSelectedTournament(tournament || null);
          }}
        >
          {activeTournaments.map(tournament => (
            <option key={tournament.id} value={tournament.id}>
              {tournament.name} - {getCategoryName(tournament.category)}
            </option>
          ))}
        </select>
      </div>
      
      {/* View Mode Toggle */}
      <div className="view-mode-toggle">
        <button
          className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
          onClick={() => setViewMode('list')}
        >
          List View
        </button>
        <button
          className={`view-mode-btn ${viewMode === 'detailed' ? 'active' : ''}`}
          onClick={() => setViewMode('detailed')}
        >
          Detailed View
        </button>
      </div>
      
      {/* Leaderboard Display */}
      {selectedTournament && (
        <div className="leaderboard-container">
          <TournamentLeaderboard
            tournamentId={selectedTournament.id}
            category={selectedTournament.category}
            viewMode={viewMode}
          />
        </div>
      )}
    </div>
  );
  
  function getCategoryName(category: string): string {
    const names: Record<string, string> = {
      totalCoins: 'Total Coins',
      longestStreak: 'Longest Coin Streak',
      highestScore: 'Highest Score',
      longestDistance: 'Longest Distance',
      mostBosses: 'Most Bosses Defeated',
      mostEnemies: 'Most Enemies Defeated'
    };
    return names[category] || category;
  }
};
```

#### 4.7 Tournament List Component (Updated)

**File:** `src/components/tournaments/TournamentList.tsx` (Updated to use tabs)

```typescript
import React from 'react';
import { TournamentTabs } from './TournamentTabs';

export const TournamentList: React.FC = () => {
  return <TournamentTabs />;
};
```

#### 4.2 Tournament Card Component

**File:** `src/components/tournaments/TournamentCard.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { Tournament } from '../../types/tournament';

interface TournamentCardProps {
  tournament: Tournament;
  onEnter: (tournamentId: number) => void;
}

export const TournamentCard: React.FC<TournamentCardProps> = ({
  tournament,
  onEnter
}) => {
  const timeRemaining = tournament.endTime - Date.now();
  const daysRemaining = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
  const hoursRemaining = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  const getCategoryName = (category: string) => {
    const names: Record<string, string> = {
      totalCoins: 'Total Coins',
      longestStreak: 'Longest Coin Streak',
      highestScore: 'Highest Score',
      longestDistance: 'Longest Distance',
      mostBosses: 'Most Bosses Defeated',
      mostEnemies: 'Most Enemies Defeated'
    };
    return names[category] || category;
  };
  
  // Format MEWS amount (handles both 6 and 9 decimals)
  const formatMEWS = (mewsAmount: number, decimals: number = 6) => {
    const divisor = Math.pow(10, decimals);
    return (mewsAmount / divisor).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
      useGrouping: true
    });
  };
  
  // Convert prize pool from USD (cents) to MEWS and USD for display
  // Prize pool is tracked in USD (cents) on-chain for stability, displayed as $MEWS (USD) to promote token
  const formatPrizePool = async (prizePoolMist: number) => {
    // First convert MIST to SUI
    const suiAmount = prizePoolMist / 1_000_000_000;
    
    try {
      // Get token prices from StoreService, global state, or backend API
      let tokenPrices = null;
      if (typeof StoreService !== 'undefined' && StoreService.getState) {
        const state = StoreService.getState();
        tokenPrices = state?.tokenPrices;
      } else if (typeof getStoreState === 'function') {
        const state = getStoreState();
        tokenPrices = state?.tokenPrices;
      }
      
      // Fallback: fetch from backend API
      if (!tokenPrices) {
        const response = await fetch('/api/store/prices');
        const data = await response.json();
        tokenPrices = data.prices;
      }
      
      if (tokenPrices && tokenPrices.sui && tokenPrices.mews) {
        // Convert SUI to USD
        const usdValue = suiAmount * tokenPrices.sui;
        
        // Convert USD to MEWS (promotes our token)
        const mewsAmount = usdValue / tokenPrices.mews;
        
        // Determine MEWS decimals (6 for mainnet, 9 for testnet)
        // This should match the network being used
        const mewsDecimals = 6; // Default to mainnet, adjust based on network
        
        return {
          mews: formatMEWS(mewsAmount * Math.pow(10, mewsDecimals), mewsDecimals),
          usd: usdValue.toFixed(2)
        };
      }
    } catch (error) {
      console.warn('Failed to get token prices for prize pool conversion:', error);
    }
    
    // Fallback: just show USD if prices unavailable (convert SUI to USD estimate)
    return {
      mews: null,
      usd: null
    };
  };
  
  // Entry fee is in tournament tickets (not tokens)
  // Each tournament requires 1 ticket to enter
  const entryFeeTickets = 1; // Standard: 1 ticket per tournament entry
  
  // Get prize pool display (Tracked in USD, displayed as $MEWS with USD in parentheses)
  // Prize pool is tracked in USD (cents) on-chain for stability, but displayed in $MEWS to promote token
  const [prizePoolDisplay, setPrizePoolDisplay] = useState<{mews: string | null, usd: string | null}>({
    mews: null,
    usd: null
  });
  
  useEffect(() => {
    // Convert USD value to MEWS for display (USD shown in parentheses)
    formatPrizePool(tournament.prizePoolUSD).then(result => {
      setPrizePoolDisplay(result);
    });
  }, [tournament.prizePoolUSD]);
  
  return (
    <div className="tournament-card">
      <div className="tournament-header">
        <h3>{tournament.name}</h3>
        <span className="category-badge">
          {getCategoryName(tournament.category)}
        </span>
      </div>
      
      <div className="tournament-info">
        <div className="info-row">
          <span>Entry Fee:</span>
          <span>{entryFeeTickets} Tournament Ticket{entryFeeTickets !== 1 ? 's' : ''}</span>
        </div>
        <div className="info-row">
          <span>Prize Pool:</span>
          <span>
            {prizePoolDisplay.mews ? (
              <>
                {prizePoolDisplay.mews} $MEWS
                {prizePoolDisplay.usd && (
                  <span className="prize-pool-usd"> (${prizePoolDisplay.usd})</span>
                )}
              </>
            ) : (
              prizePoolDisplay.usd ? (
                <span>${prizePoolDisplay.usd}</span>
              ) : (
                <span>Loading...</span>
              )
            )}
          </span>
        </div>
        <div className="info-row">
          <span>Participants:</span>
          <span>{tournament.participants}</span>
        </div>
        <div className="info-row">
          <span>Time Remaining:</span>
          <span>{daysRemaining}d {hoursRemaining}h</span>
        </div>
      </div>
      
      <button
        className="enter-tournament-btn"
        onClick={() => onEnter(tournament.id)}
      >
        Enter Tournament
      </button>
    </div>
  );
};
```

#### 4.3 Tournament Leaderboard Component

**File:** `src/components/tournaments/TournamentLeaderboard.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { LeaderboardEntry } from '../../types/tournament';

interface TournamentLeaderboardProps {
  tournamentId: number;
  category: string;
}

export const TournamentLeaderboard: React.FC<TournamentLeaderboardProps> = ({
  tournamentId,
  category
}) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [tournamentId]);
  
  const fetchLeaderboard = async () => {
    try {
      // Query blockchain - may take a moment
      setLoading(true);
      const response = await fetch(`/api/tournaments/${tournamentId}/leaderboard`);
      const data = await response.json();
      setLeaderboard(data.leaderboard);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const formatValue = (value: number, category: string) => {
    // Format based on category
    if (category === 'totalCoins' || category === 'longestStreak') {
      return value.toLocaleString();
    }
    return value.toLocaleString();
  };
  
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading leaderboard from blockchain...</p>
      </div>
    );
  }
  
  return (
    <div className="tournament-leaderboard">
      <h3>Leaderboard</h3>
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>Score</th>
            <th>Prize</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((entry, index) => (
            <tr key={entry.playerAddress} className={index < 3 ? 'top-three' : ''}>
              <td>{entry.rank}</td>
              <td>{formatAddress(entry.playerAddress)}</td>
              <td>{formatValue(entry.value, category)}</td>
              <td>{calculatePrize(entry.rank, prizePool)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

#### 4.4 Tournament Notification System

**File:** `src/components/tournaments/TournamentNotificationModal.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { TournamentResult } from '../../types/tournament';

interface TournamentNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentResult: TournamentResult | null;
}

export const TournamentNotificationModal: React.FC<TournamentNotificationModalProps> = ({
  isOpen,
  onClose,
  tournamentResult
}) => {
  // Check for tournament results when component mounts
  useEffect(() => {
    if (isOpen) {
      checkTournamentResults();
    }
  }, [isOpen]);
  
  const checkTournamentResults = async () => {
    // Query blockchain for ended tournaments where player participated
    // Check if player placed in top 10
    // Load tournament result if found
  };
  
  if (!isOpen || !tournamentResult) {
    return null;
  }
  
  return (
    <div className="tournament-notification-modal overlay">
      <div className="modal-content">
        {/* Tournament results content */}
      </div>
    </div>
  );
};
```

**Integration Point:**
- Check for tournament results when player logs in
- Show modal automatically if player placed in top 10
- Modal can be dismissed and accessed later from tournament page
- Tournament results can also be viewed from the tournament page

#### 4.5 Integration with Game End

**File:** `src/game/systems/core/game-over.js` (or wherever game results are submitted)

```javascript
// After game ends and stats are calculated
async function submitGameResults(gameStats) {
  // Existing score submission to blockchain
  await submitScoreToBlockchain(gameStats);
  
  // NEW: Update tournament scores
  await updateTournamentScores(gameStats);
}

async function updateTournamentScores(gameStats) {
  const playerAddress = getCurrentPlayerAddress();
  
  // Show loading indicator while updating
  showLoadingIndicator('Updating tournament scores...');
  
  try {
    // Get active tournaments for this player (from blockchain)
    const activeTournaments = await fetch('/api/tournaments/active').then(r => r.json());
    const playerTournaments = await fetch(`/api/tournaments/player/${playerAddress}`).then(r => r.json());
    
    // Update each tournament the player is in (on-chain)
    for (const tournament of playerTournaments) {
      const updateData = {};
      
      switch (tournament.category) {
        case 'totalCoins':
          updateData.coins = gameStats.coins;
          break;
        case 'longestStreak':
          updateData.longestCoinStreak = gameStats.longestCoinStreak;
          updateData.coins = gameStats.coins; // For tie-breaking
          break;
        case 'highestScore':
          updateData.score = gameStats.score;
          break;
        case 'longestDistance':
          updateData.distance = gameStats.distance;
          break;
        case 'mostBosses':
          updateData.bossesDefeated = gameStats.bossesDefeated;
          break;
        case 'mostEnemies':
          updateData.enemiesDefeated = gameStats.enemiesDefeated;
          break;
      }
      
      // Update tournament score on-chain
      const response = await fetch(`/api/tournaments/${tournament.tournamentId}/update-score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerAddress,
          ...updateData
        })
      });
      
      const result = await response.json();
      // Transaction submitted - wait for confirmation
      await waitForTransaction(result.transactionDigest);
    }
  } finally {
    hideLoadingIndicator();
  }
}
```

---

### Phase 5: Testing & Deployment (Week 4)

#### 5.1 Unit Tests

- Test tournament creation (smart contract)
- Test entry validation
- Test score tracking for each category
- Test leaderboard querying from blockchain
- Test reward distribution

#### 5.2 Integration Tests

- Test full tournament flow (create → enter → play → end)
- Test multiple categories simultaneously
- Test blockchain queries (performance)
- Test reward distribution
- Test loading states

#### 5.3 End-to-End Tests

- Test tournament UI flow (with loading screens)
- Test game integration
- Test leaderboard updates (blockchain queries)
- Test reward claiming
- Test transaction confirmations

#### 5.4 Deployment Checklist

- [ ] Smart contract deployed to testnet
- [ ] Backend services deployed (blockchain-only)
- [ ] Tournament overlay structure created (matches main menu framework)
- [ ] Tournament overlay uses same class pattern (`.tournament-overlay`, `.tournament-overlay-hidden`, `.tournament-overlay-visible`)
- [ ] Main menu button added for tournaments
- [ ] Back button functionality working
- [ ] Main menu closes when tournament overlay opens
- [ ] Tournament overlay styling matches main menu (same z-index, backdrop, animations)
- [ ] Loading screen integration (shows during transition and data loading)
- [ ] Lazy loading implemented (tournament data only loads when overlay is shown)
- [ ] Resource cleanup on hide (clear DOM, stop polling, clear caches)
- [ ] Caching strategy implemented (30-second cache for tournament data)
- [ ] Leaderboard polling stops when overlay is hidden
- [ ] Frontend components integrated
- [ ] API endpoints tested
- [ ] Game integration tested
- [ ] Leaderboard queries working (with loading states)
- [ ] Reward distribution tested
- [ ] Loading screens tested and polished
- [ ] Documentation updated

---

## Implementation Timeline

**Week 1: Smart Contract**
- Day 1-2: Design contract structure
- Day 3-4: Implement core functions
- Day 5: Testing and debugging

**Week 2: Backend Service**
- Day 1-2: Smart contract enhancements for querying
- Day 3-4: Tournament service implementation (blockchain-only)
- Day 5: API endpoints and testing

**Week 3: Frontend Integration**
- Day 1: Tournament page structure and navigation (main menu integration, back button)
- Day 2: Tournament list and card components
- Day 3: Leaderboard component
- Day 4: Game integration
- Day 5: UI/UX polish

**Week 4: Testing & Deployment**
- Day 1-2: Unit and integration tests
- Day 3: End-to-end testing
- Day 4: Bug fixes
- Day 5: Deployment to testnet

---

## Success Metrics

- **Tournament Creation:** Can create weekly tournaments for each category
- **Player Entry:** Players can enter tournaments and pay entry fee
- **Score Tracking:** Scores update correctly for each category
- **Leaderboard:** Leaderboard displays correctly and updates in real-time
- **Reward Distribution:** Rewards distributed correctly (50% players, 25% burn, 25% operations)
- **Performance:** Leaderboard queries complete in < 100ms
- **User Experience:** Players can easily find, enter, and track tournaments

---

## Next Steps After Weekly Tournaments

1. **Ticket System:** Add ticket-based entry (optional)
2. **Daily Tournaments:** Implement tier-based daily tournaments
3. **Player vs Player:** Add 1v1 bracket tournaments
4. **Team Tournaments:** Add team-based competitions
5. **Advanced Features:** Badge discounts (✅ implemented), ticket packs (✅ implemented), special events

