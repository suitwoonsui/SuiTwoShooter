# Tournament Creator Reward System Design

## Overview

Tournament creators receive a reward based on how many players enter their tournament. This incentivizes users to create tournaments and promote them to attract participants.

## Problem Statement

**Current State:**
- Users can create tournaments (with payment for custom rewards)
- Players enter tournaments using tickets
- Entry fees go to prize pool
- Prize pool split: 50% players, 25% operations, 25% burn (optional - not implemented early on)
- **No incentive for creators** to promote their tournaments

**Solution:**
- Tournament creators receive 50% of entry fees until creation fee is covered
- After creation fee is covered, creators receive 20% of remaining entry fees
- **Break-even guaranteed** with just 10 entries (50% of $10 = $5, covers creation fee)
- Creates incentive to create and promote tournaments

---

## Break-Even Economics

### The Problem
With a fixed 10% creator reward:
- Creation fee: $5.00
- 10 entries @ $1.00 = $10.00 entry fees
- Creator reward: $10.00 × 0.10 = $1.00
- **Net loss: -$4.00** ❌

Creators would lose money on small tournaments, discouraging tournament creation.

### The Solution: Boost Until Break-Even
With boost system (50% until creation fee covered, then 20%):
- Creation fee: $5.00
- 10 entries @ $1.00 = $10.00 entry fees
- Creator reward: $10.00 × 0.50 = $5.00
- **Net: $0.00** ✅ (Breaks even!)

### Economics at Different Scales

| Entries | Entry Fees | Calculation | Creator Reward | Net Profit | ROI |
|---------|------------|-------------|----------------|------------|-----|
| 5       | $5.00      | 50% of $5   | $2.50          | -$2.50     | -50%|
| 10      | $10.00     | 50% of $10  | $5.00          | $0.00      | 0%  |
| 20      | $20.00     | $5 + 20% of $10 | $7.00      | $2.00      | 40% |
| 50      | $50.00     | $5 + 20% of $40 | $13.00     | $8.00      | 160%|
| 100     | $100.00    | $5 + 20% of $90 | $23.00     | $18.00     | 360%|
| 200     | $200.00    | $5 + 20% of $190 | $43.00    | $38.00     | 760%|

**Key Benefits:**
- ✅ Creators break even with just 10 entries
- ✅ Profitable with 20+ entries
- ✅ Simple calculation (no complex tiers)
- ✅ Scales sustainably for larger tournaments
- ✅ Incentivizes both small and large tournament creation

---

## Creator Reward Structure

### Reward Calculation

**Formula:**
```
If Entry Fees × 50% ≤ $5.00 (creation fee):
  Creator Reward = Entry Fees × 50%

If Entry Fees × 50% > $5.00:
  Creator Reward = $5.00 + (Entry Fees - $10.00) × 20%
```

**Examples:**
```
Tournament with 10 entries @ $1.00 per entry = $10.00 total entry fees
50% of $10.00 = $5.00 (exactly covers creation fee)
Creator Reward = $5.00 ✅ (Breaks even!)

Tournament with 20 entries @ $1.00 per entry = $20.00 total entry fees
50% of $20.00 = $10.00 > $5.00, so:
Creator Reward = $5.00 + ($20.00 - $10.00) × 0.20 = $5.00 + $2.00 = $7.00 ✅

Tournament with 50 entries @ $1.00 per entry = $50.00 total entry fees
50% of $50.00 = $25.00 > $5.00, so:
Creator Reward = $5.00 + ($50.00 - $10.00) × 0.20 = $5.00 + $8.00 = $13.00 ✅

Tournament with 100 entries @ $1.00 per entry = $100.00 total entry fees
50% of $100.00 = $50.00 > $5.00, so:
Creator Reward = $5.00 + ($100.00 - $10.00) × 0.20 = $5.00 + $18.00 = $23.00 ✅
```

### Reward System Design

**Selected Approach: Boost Until Break-Even (Recommended)**
- **50% of entry fees** until creation fee ($5.00) is covered
- **20% of remaining entry fees** after creation fee is covered
- **Benefits:**
  - Simple calculation (no complex tiers)
  - Creators break even with just 10 entries
  - Higher percentage for small tournaments (incentivizes creation)
  - Lower percentage for larger tournaments (sustainable economics)
  - Easy to understand and communicate
  - Can be adjusted in the future if needed

---

## Prize Pool Split (Updated)

### Current Split (Before Creator Reward)
```
Total Entry Fees: $100.00
├─ Player Rewards: $50.00 (50%)
├─ Operations: $50.00 (50%)  ← Includes burn share when burn is disabled
└─ Token Burn: $0.00 (0% - Optional, not implemented early on)
```

### Updated Split (With Boost Creator Reward & Prize Pool Boost)

**Player Rewards Structure:**
- **1-10 entries:** 25% of prize pool (reduced to ensure operations gets share)
- **11+ entries:** 50% of prize pool (DOUBLES after 10 players! 🎉)

**Example: 10 Entries (Break-Even with Operations Share):**
```
Total Entry Fees: $10.00
├─ Creator Reward: $5.00 (50% of entry fees)  ← Covers creation fee exactly
├─ Player Rewards: $2.50 (25% of prize pool)  ← Reduced for small tournaments
└─ Operations: $2.50 (25% of prize pool)  ← Ensures operations gets share
```

**Example: 11 Entries (Prize Pool Doubles!):**
```
Total Entry Fees: $11.00
├─ Creator Reward: $5.20 (50% of $10 + 20% of $1)  ← $5 boost + $0.20
├─ Player Rewards: $5.50 (50% of prize pool)  ← DOUBLED from 25%!
└─ Operations: $0.30 (remaining)
```

**Example: 20 Entries (Boost + 20% Creator Reward):**
```
Total Entry Fees: $20.00
├─ Creator Reward: $7.00 (35% - $5 boost + $2 at 20%)
├─ Player Rewards: $10.00 (50% of prize pool)  ← Full 50% after 10 players
└─ Operations: $3.00 (15% - includes burn share when burn disabled)
```

**Example: 50 Entries (Boost + 20% Creator Reward):**
```
Total Entry Fees: $50.00
├─ Creator Reward: $13.00 (26% - $5 boost + $8 at 20%)
├─ Player Rewards: $25.00 (50% of prize pool)  ← Full 50% after 10 players
└─ Operations: $12.00 (24% - includes burn share when burn disabled)
```

**Example: 100 Entries (Boost + 20% Creator Reward):**
```
Total Entry Fees: $100.00
├─ Creator Reward: $23.00 (23% - $5 boost + $18 at 20%)
├─ Player Rewards: $50.00 (50% of prize pool)  ← Full 50% after 10 players
└─ Operations: $27.00 (27% - includes burn share when burn disabled)
```

**Key Points:**
- **1-10 entries:** Player rewards = 25% of prize pool (ensures operations gets share)
- **11+ entries:** Player rewards = 50% of prize pool (DOUBLES! 🎉)
- Creator gets 50% boost until $5.00 earned, then 20% of remaining
- Operations always receives a share (minimum 25% for small tournaments)
- Token burn is optional and not implemented early on
- Small tournaments (≤10 entries) ensure operations gets 25% share
- **Prize pool rewards DOUBLE after 10 players** - incentivizes more entries!
- When token burn is enabled later, operations share will decrease accordingly

---

## Implementation Details

### On-Chain Storage

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
    created_by: address,            // Tournament creator
    creator_reward_paid: bool,      // NEW: Track if creator reward paid
    creator_reward_usd_cents: u64,  // NEW: Total creator reward earned
    created_at: u64,
}
```

**Note:** `creator_reward_usd_cents` is calculated at tournament end based on total entries.

### Creator Reward Calculation

**At Tournament End:**
```typescript
// Calculate creator reward using boost system
const totalEntryFees = tournament.prizePoolUsdCents - tournament.startingAnteUsdCents;
const CREATION_FEE_USD_CENTS = 500; // $5.00
const BOOST_PERCENTAGE = 0.50; // 50% until creation fee covered
const STANDARD_PERCENTAGE = 0.20; // 20% after creation fee covered

let creatorReward: number;
const boostReward = totalEntryFees * BOOST_PERCENTAGE;

if (boostReward <= CREATION_FEE_USD_CENTS) {
  // Still in boost phase (50% until $5.00 earned)
  creatorReward = boostReward;
} else {
  // Boost phase complete, now 20% of remaining
  const boostThreshold = CREATION_FEE_USD_CENTS / BOOST_PERCENTAGE; // $10.00
  const remainingFees = totalEntryFees - boostThreshold;
  creatorReward = CREATION_FEE_USD_CENTS + (remainingFees * STANDARD_PERCENTAGE);
}

// Update tournament
tournament.creatorRewardUsdCents = creatorReward;
```

**Helper Function:**
```typescript
function calculateCreatorReward(totalEntryFeesUsdCents: number): number {
  const CREATION_FEE_USD_CENTS = 500; // $5.00
  const BOOST_PERCENTAGE = 0.50; // 50%
  const STANDARD_PERCENTAGE = 0.20; // 20%
  
  const boostReward = totalEntryFeesUsdCents * BOOST_PERCENTAGE;
  
  if (boostReward <= CREATION_FEE_USD_CENTS) {
    return boostReward; // Still in boost phase
  } else {
    const boostThreshold = CREATION_FEE_USD_CENTS / BOOST_PERCENTAGE; // $10.00
    const remainingFees = totalEntryFeesUsdCents - boostThreshold;
    return CREATION_FEE_USD_CENTS + (remainingFees * STANDARD_PERCENTAGE);
  }
}
```

**Examples:**
```
Starting Ante: $50.00
Final Prize Pool: $60.00 (10 entries @ $1.00)
Total Entry Fees: $60.00 - $50.00 = $10.00
Boost Reward: $10.00 × 0.50 = $5.00 (≤ $5.00, so use boost)
Creator Reward: $5.00 ✅ (Breaks even)

Starting Ante: $50.00
Final Prize Pool: $100.00 (50 entries @ $1.00)
Total Entry Fees: $100.00 - $50.00 = $50.00
Boost Reward: $50.00 × 0.50 = $25.00 (> $5.00, so boost complete)
Remaining: $50.00 - $10.00 = $40.00
Creator Reward: $5.00 + ($40.00 × 0.20) = $13.00 ✅

Starting Ante: $50.00
Final Prize Pool: $150.00 (100 entries @ $1.00)
Total Entry Fees: $150.00 - $50.00 = $100.00
Boost Reward: $100.00 × 0.50 = $50.00 (> $5.00, so boost complete)
Remaining: $100.00 - $10.00 = $90.00
Creator Reward: $5.00 + ($90.00 × 0.20) = $23.00 ✅
```

### Reward Distribution

**When Tournament Ends:**
1. Calculate creator reward based on total entry fees
2. Distribute player rewards (top 10)
3. Distribute creator reward to `created_by` address
4. Send operations share to admin wallet (includes burn share when burn is disabled)
5. (Optional) Send burn share to burn wallet (if token burn is enabled)
6. Mark `creator_reward_paid = true`

**Distribution Method:**
- **MEWS Tokens**: Convert USD to MEWS and mint to creator
- **Alternative**: Send SUI/USDC directly to creator wallet

---

## UI Updates

### Step 5: Reward Configuration (Updated)

**Add Creator Reward Preview:**
```
┌─────────────────────────────────────────────────┐
│  Configure Rewards                              │
├─────────────────────────────────────────────────┤
│                                                 │
│  ... (existing reward configuration) ...       │
│                                                 │
│  ┌─ Creator Reward Preview ───────────────────┐  │
│  │  💰 Boost Until Break-Even!                │  │
│  │                                            │  │
│  │  Reward Structure:                         │  │
│  │  • 50% until creation fee covered ($5.00) │  │
│  │  • 20% of remaining entry fees after      │  │
│  │                                            │  │
│  │  Estimated Earnings:                       │  │
│  │  If 10 players enter: $5.00 ✅ (break-even)│  │
│  │  If 20 players enter: $7.00                │  │
│  │  If 50 players enter: $13.00               │  │
│  │  If 100 players enter: $23.00              │  │
│  │                                            │  │
│  │  💡 Break-even with just 10 entries!     │  │
│  │  💡 More players = more earnings!        │  │
│  └────────────────────────────────────────────┘  │
│                                                 │
│  [← Back] [Next →]                             │
└─────────────────────────────────────────────────┘
```

### Tournament View (Creator)

**Show Creator Earnings:**
```
┌─────────────────────────────────────────────────┐
│  My Tournament: Weekly High Score #1            │
├─────────────────────────────────────────────────┤
│                                                 │
│  Status: Active                                 │
│  Participants: 47 players                      │
│  Prize Pool: $97.00                            │
│                                                 │
│  ┌─ Your Earnings ───────────────────────────┐  │
│  │  Entry Fees Collected: $47.00              │  │
│  │  Your Reward: $12.40                        │  │
│  │  ($5.00 boost + $7.40 at 20%)              │  │
│  │  (Paid when tournament ends)               │  │
│  └────────────────────────────────────────────┘  │
│                                                 │
│  [View Leaderboard] [Share Tournament]          │
└─────────────────────────────────────────────────┘
```

### Tournament View (All Users)

**Show Creator Info:**
```
┌─────────────────────────────────────────────────┐
│  Tournament: Weekly High Score #1                │
├─────────────────────────────────────────────────┤
│                                                 │
│  Created by: Player123                          │
│  Participants: 47 players                      │
│  Prize Pool: $97.00                            │
│  Entry Fee: 1 tournament ticket                │
│                                                 │
│  [Enter Tournament]                             │
└─────────────────────────────────────────────────┘
```

---

## Backend Implementation

### Reward Distribution Service

**Helper Function: `getCreatorRewardPercentage`**

```typescript
function getCreatorRewardPercentage(numberOfEntries: number): number {
  if (numberOfEntries <= 10) return 0.50;      // 50% for 1-10 entries
  if (numberOfEntries <= 25) return 0.30;       // 30% for 11-25 entries
  if (numberOfEntries <= 50) return 0.20;       // 20% for 26-50 entries
  if (numberOfEntries <= 100) return 0.15;      // 15% for 51-100 entries
  return 0.10;                                  // 10% for 101+ entries
}
```

**New Function: `distributeCreatorReward`**

```typescript
async function distributeCreatorReward(
  tournamentId: number,
  tournament: Tournament
): Promise<{ success: boolean; rewardAmount?: number; error?: string }> {
  // Calculate creator reward using boost system
  const startingAnte = tournament.startingAnteUsdCents || 0;
  const totalEntryFees = tournament.prizePoolUsdCents - startingAnte;
  const creatorReward = calculateCreatorReward(totalEntryFees);

  if (creatorReward <= 0) {
    return { success: true, rewardAmount: 0 }; // No reward if no entries
  }

  // Convert USD to MEWS tokens
  const mewsAmount = await priceConverter.convertUSDToMews(creatorReward);

  // Mint MEWS tokens to creator
  await mewsService.mint(tournament.createdBy, mewsAmount);

  // Update tournament (mark creator reward as paid)
  await tournamentService.updateCreatorRewardPaid(tournamentId, creatorReward);

  return { success: true, rewardAmount: creatorReward };
}
```

### Updated Reward Distribution Flow

**When Tournament Ends:**
```typescript
async function distributeTournamentRewards(tournamentId: number) {
  const tournament = await tournamentService.getTournament(tournamentId);
  
  // 1. Distribute creator reward
  await distributeCreatorReward(tournamentId, tournament);
  
  // 2. Calculate player rewards (from remaining prize pool)
  const playerRewardsPool = calculatePlayerRewardsPool(tournament);
  
  // 3. Distribute player rewards (top 10)
  await distributePlayerRewards(tournamentId, playerRewardsPool);
  
  // 4. Send operations share
  await sendOperationsShare(tournament);
  
  // 5. Send burn share (optional - only if token burn is enabled)
  // Token burn is optional and not implemented early on
  // When disabled, burn share goes to operations instead
  const TOKEN_BURN_ENABLED = process.env.TOKEN_BURN_ENABLED === 'true'; // Default: false
  
  if (TOKEN_BURN_ENABLED) {
    await sendBurnShare(tournament);
  } else {
    // Burn share goes to operations when burn is disabled
    // Operations already receives remaining funds after creator reward
  }
  
  // 6. Mark tournament as rewards distributed
  await tournamentService.endTournament(tournamentId);
}
```

### Updated Prize Pool Calculation

**Player Rewards Pool (Updated with Prize Pool Boost):**
```typescript
function calculatePlayerRewardsPool(tournament: Tournament): number {
  const numberOfEntries = tournament.participants.length;
  
  // Prize pool boost: 25% for small tournaments, 50% for larger tournaments
  let playerRewardsPercentage: number;
  if (numberOfEntries <= 10) {
    playerRewardsPercentage = 0.25; // 25% for 1-10 entries
  } else {
    playerRewardsPercentage = 0.50; // 50% for 11+ entries (DOUBLES!)
  }
  
  // Player rewards = variable % of total prize pool
  const playerRewardsPool = tournament.prizePoolUsdCents * playerRewardsPercentage;
  
  return playerRewardsPool;
}
```

**Note:** 
- Creator reward is deducted from entry fees
- Player rewards are variable: 25% for small tournaments (1-10 entries), 50% for larger tournaments (11+ entries)
- This ensures operations always gets a share (minimum 25% for small tournaments)
- Prize pool rewards DOUBLE after 10 players, incentivizing more entries!

---

## Edge Cases & Considerations

### 1. No Entries

**Scenario:** Tournament created but no players enter.

**Answer:** Creator reward = $0.00. No payment needed.

### 2. Creator Also Participates

**Scenario:** Creator enters their own tournament.

**Answer:** 
- Creator still gets creator reward (boost system: 50% until $5, then 20%)
- Creator can also win player rewards if they place in top 10
- No conflict - creator reward is separate from player rewards

### 3. Admin-Created Tournaments

**Question:** Do admins get creator rewards?

**Answer:** 
- **Option A:** No - Admins don't get creator rewards (they're operators)
- **Option B:** Yes - Admins get creator rewards (same as users)
- **Recommendation:** Option A - Admins are operators, not creators seeking rewards

### 4. Multiple Entries

**Scenario:** Same player enters multiple times.

**Answer:** Each entry counts toward creator reward. If player enters 3 times, creator gets boost system reward (50% until $5, then 20%) based on total entry fees from all entries.

### 5. Starting Ante

**Question:** Does starting ante count toward creator reward?

**Answer:** No. Creator reward is based on **entry fees only**, not starting ante. Starting ante is the creator's contribution, not earnings.

**Example:**
```
Starting Ante: $50.00 (creator's contribution)
Entry Fees: $100.00 (from 100 players)
Boost Reward: $100.00 × 0.50 = $50.00 (> $5.00, so boost complete)
Remaining: $100.00 - $10.00 = $90.00
Creator Reward: $5.00 + ($90.00 × 0.20) = $23.00
Total Prize Pool: $150.00 ($50 starting + $100 entries)
```

### 6. Reward Payment Timing

**When is creator reward paid?**

**Options:**
- **Option A:** At tournament end (recommended)
- **Option B:** Real-time (as each player enters)
- **Option C:** Weekly/monthly batch

**Recommendation:** Option A - Pay at tournament end to:
- Simplify accounting
- Ensure accurate calculation
- Match player reward distribution timing

---

## Contract Updates

### New Fields in Tournament Struct

```move
struct Tournament has key {
    // ... existing fields ...
    created_by: address,            // Tournament creator
    creator_reward_paid: bool,      // Track if creator reward paid
    creator_reward_usd_cents: u64,  // Total creator reward earned
}
```

### New Functions

**Helper Function: `calculate_creator_reward`**

```move
/// Calculate creator reward using boost system
/// 50% until creation fee ($5.00) is covered, then 20% of remaining
fun calculate_creator_reward(total_entry_fees_usd_cents: u64): u64 {
    let creation_fee_usd_cents = 500; // $5.00
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
```

**Main Function: `get_creator_reward`**

```move
/// Calculate creator reward for a tournament
public fun get_creator_reward(
    tournament: &Tournament,
    starting_ante_usd_cents: u64
): u64 {
    let total_entry_fees = tournament.prize_pool_usd_cents - starting_ante_usd_cents;
    let creator_reward = calculate_creator_reward(total_entry_fees);
    creator_reward
}
```

### Updated `end_tournament` Function

```move
/// End tournament and distribute rewards (including creator reward)
public entry fun end_tournament(
    _admin_cap: &AdminCapability,
    tournament: &mut Tournament,
    starting_ante_usd_cents: u64,
    clock: &Clock,
    _ctx: &mut TxContext
) {
    // ... existing validation ...
    
    // Calculate creator reward
    let creator_reward = get_creator_reward(tournament, starting_ante_usd_cents);
    tournament.creator_reward_usd_cents = creator_reward;
    
    // Mark as ended (creator reward will be paid by backend)
    tournament.rewards_distributed = true;
    
    // Emit event with creator reward info
    event::emit(TournamentEnded {
        tournament_id: tournament.tournament_id,
        winners: vector::empty(),
        prize_pool_usd_cents: tournament.prize_pool_usd_cents,
        creator_reward_usd_cents: creator_reward,
        rewards_distributed: true,
        timestamp: clock::timestamp_ms(clock),
    });
}
```

---

## API Updates

### Updated Tournament Endpoint

**Response includes creator reward:**
```typescript
GET /api/tournaments/:id
{
  success: true,
  tournament: {
    tournamentId: 1,
    name: "Weekly High Score #1",
    createdBy: "0x1234...",
    prizePoolUsdCents: 15000,      // $150.00
    startingAnteUsdCents: 5000,   // $50.00
    creatorRewardUsdCents: 2300,  // $23.00 ($5 boost + $18 at 20% of $90 remaining)
    creatorRewardPaid: false,
    participants: 100,
    // ... other fields
  }
}
```

### New Endpoint: Creator Tournaments

**Get tournaments created by user:**
```typescript
GET /api/tournaments/my-tournaments?address=0x1234...
{
  success: true,
  tournaments: [
    {
      tournamentId: 1,
      name: "Weekly High Score #1",
      status: "active",
      participants: 47,
      prizePoolUsdCents: 9700,
      creatorRewardUsdCents: 1240,  // $12.40 ($5 boost + $7.40 at 20% of $37 remaining)
      creatorRewardPaid: false,
    },
    // ... more tournaments
  ],
  totalEarnings: 1470,  // $14.70 total across all tournaments
  totalEarningsPaid: 1000,  // $10.00 already paid
  totalEarningsPending: 470,  // $4.70 pending
}
```

---

## UI Components

### Creator Dashboard

**New Component: `CreatorTournamentDashboard`**

```
┌─────────────────────────────────────────────────┐
│  My Tournaments                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─ Earnings Summary ────────────────────────┐  │
│  │  Total Earned: $14.70                     │  │
│  │  Paid: $10.00                            │  │
│  │  Pending: $4.70                          │  │
│  └────────────────────────────────────────────┘  │
│                                                 │
│  Active Tournaments:                            │
│  ┌──────────────────────────────────────────┐  │
│  │  Weekly High Score #1                    │  │
│  │  Participants: 47                        │  │
│  │  Your Earnings: $4.70 (pending)          │  │
│  │  [View] [Share]                          │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  Completed Tournaments:                         │
│  ┌──────────────────────────────────────────┐  │
│  │  Weekly Coins #5                         │  │
│  │  Participants: 100                       │  │
│  │  Your Earnings: $10.00 (paid)           │  │
│  │  [View Results]                          │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

---

## Summary

**Key Points:**
1. ✅ Creators earn 50% of entry fees until creation fee ($5.00) is covered
2. ✅ After creation fee covered, creators earn 20% of remaining entry fees
3. ✅ **Break-even guaranteed** with just 10 entries (50% of $10 = $5, covers creation fee)
4. ✅ Reward calculated at tournament end based on total entry fees
5. ✅ Paid in MEWS tokens (or SUI/USDC)
6. ✅ More entries = more creator reward
7. ✅ Incentivizes tournament creation and promotion
8. ✅ Creator reward separate from player rewards
9. ✅ Starting ante doesn't count toward creator reward
10. ✅ Simple calculation (no complex tiers)
11. ✅ **Operations always gets share** (minimum 25% for small tournaments)
12. ✅ **Prize pool rewards DOUBLE after 10 players** (25% → 50%) - incentivizes more entries!

**Boost Reward Structure:**
```
Entry Fees ≤ $10.00:  50% creator reward (until $5.00 earned)
Entry Fees > $10.00:  $5.00 + 20% of (Entry Fees - $10.00)
```

**Prize Pool Boost Structure:**
```
1-10 entries:  25% of prize pool to players (ensures operations gets 25%)
11+ entries:   50% of prize pool to players (DOUBLES after 10 players! 🎉)
```

**Formula:**
```
If Entry Fees × 50% ≤ $5.00:
  Creator Reward = Entry Fees × 50%
Else:
  Creator Reward = $5.00 + (Entry Fees - $10.00) × 20%
```

**Break-Even Analysis:**
```
Creation Fee: $5.00
10 entries @ $1.00 = $10.00 entry fees
Creator Reward: $10.00 × 0.50 = $5.00 ✅ (Breaks even!)

20 entries @ $1.00 = $20.00 entry fees
Creator Reward: $5.00 + ($20.00 - $10.00) × 0.20 = $7.00 ✅ (40% profit)

50 entries @ $1.00 = $50.00 entry fees
Creator Reward: $50.00 × 0.20 = $10.00 ✅ (100% profit)
```

