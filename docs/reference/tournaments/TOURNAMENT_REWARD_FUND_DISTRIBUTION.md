# Tournament Reward Fund Distribution

## Overview

Tournament prize pools are tracked in USD cents, regardless of which token (SUI, MEWS, USDC) was used to purchase tournament tickets. The actual tokens were collected at ticket purchase time.

## Prize Pool Distribution

### Current Implementation

**Prize Pool Split (Updated with Boost Creator Rewards & Prize Pool Boost):**
- **Boost Creator Reward** (50% until creation fee covered, then 20%)
  - Entry fees ≤ $10.00: 50% creator reward (until $5.00 earned)
  - Entry fees > $10.00: $5.00 + 20% of remaining entry fees
- **Player Rewards** (varies by tournament size):
  - **1-10 entries:** 25% of prize pool (reduced to ensure operations gets share)
  - **11+ entries:** 50% of prize pool (DOUBLES after 10 players! 🎉)
- **Variable** → Operations/Team (adjusts based on creator reward, includes burn share when burn is disabled)
  - **Minimum 25%** for small tournaments (1-10 entries)
- **Variable** → Token Burn (Optional - not implemented early on, can be enabled later)

**Note:** Creator reward is calculated from entry fees only (not including starting ante). Percentage is tiered to ensure creators break even with just 10 entries. See `TOURNAMENT_CREATOR_REWARD_DESIGN.md` for details.

### 1. Player Rewards (Variable by Tournament Size) ✅ **IMPLEMENTED**

**Prize Pool Boost System:**
- **1-10 entries:** 25% of prize pool to players (reduced to ensure operations gets share)
- **11+ entries:** 50% of prize pool to players (DOUBLES after 10 players! 🎉)
- This incentivizes tournament creators to attract more players

**Token Rewards (Top 3 Only):**
- Distributed from player rewards pool
- Distribution percentages:
  - 1st Place: 50% of player rewards pool (biggest chunk)
  - 2nd Place: 30% of player rewards pool
  - 3rd Place: 20% of player rewards pool
- Tokens are minted and transferred directly to player wallets

**Item Rewards (All Top 10):**
- Items are distributed separately from token rewards
- All top 10 players receive items based on rank
- Top 3 get special items + random items
- Ranks 4-10 get random items only

**Example (Small Tournament - 10 entries):**
- Tournament prize pool: $10 (from 10 players @ $1 entry)
- Player rewards pool: $2.50 (25% of $10)
- **1st place gets:**
  - $1.25 in MEWS tokens (50% of $2.50)
  - Items: 1x Destroy All + 1x Boss Kill Shot + 1x Random Level 1 item
- **2nd place gets:**
  - $0.75 in MEWS tokens (30% of $2.50)
  - Items: 1x Boss Kill Shot + 1x Random Level 1 item
- **3rd place gets:**
  - $0.50 in MEWS tokens (20% of $2.50)
  - Items: 1x Destroy All + 1x Random Level 1 item
- **4th-10th place get:**
  - No token rewards
  - Items: 1x Random Level 1 item each

**Example (Large Tournament - 20 entries, Prize Pool DOUBLED!):**
- Tournament prize pool: $20 (from 20 players @ $1 entry)
- Player rewards pool: $10.00 (50% of $20 - DOUBLED from 25%!)
- **1st place gets:**
  - $5.00 in MEWS tokens (50% of $10) - 4x more than small tournament!
  - Items: 1x Destroy All + 1x Boss Kill Shot + 1x Random Level 1 item
- **2nd place gets:**
  - $3.00 in MEWS tokens (30% of $10) - 4x more than small tournament!
  - Items: 1x Boss Kill Shot + 1x Random Level 1 item
- **3rd place gets:**
  - $2.00 in MEWS tokens (20% of $10) - 4x more than small tournament!
  - Items: 1x Destroy All + 1x Random Level 1 item
- **4th-10th place get:**
  - No token rewards
  - Items: 1x Random Level 1 item each

### 2. Operations/Team (Variable, Minimum 25%) ✅ **NO ACTION NEEDED**

**Status:** Already in admin wallet
- Entry fees were collected when tickets were purchased
- Operations share is calculated as remaining funds after creator reward and player rewards
- **Minimum 25%** for small tournaments (1-10 entries) to ensure operations always gets share
- No additional transaction needed
- Covers: tournament operations, marketing, future development

**Example (Small Tournament - 10 entries):**
- Tournament prize pool: $10
- Creator reward: $5.00 (50% of entry fees)
- Player rewards: $2.50 (25% of prize pool)
- Operations share: $2.50 (25% of prize pool - minimum guaranteed)
- Status: Already collected in admin wallet at ticket purchase time

**Example (Large Tournament - 20 entries):**
- Tournament prize pool: $20
- Creator reward: $7.00 (boost system)
- Player rewards: $10.00 (50% of prize pool - doubled!)
- Operations share: $3.00 (15% - remaining after rewards)
- Status: Already collected in admin wallet at ticket purchase time

### 3. Token Burn (Optional) ⏸️ **NOT IMPLEMENTED EARLY ON**

**Status:** Optional feature - not implemented early on, can be enabled later
- Token burn is an optional feature that can be enabled in the future
- When disabled, the burn share goes to operations instead
- When enabled, will require:
  - MEWS token price conversion (USD cents → MEWS tokens)
  - TreasuryCap access for burning
  - Burn transaction execution
  - Event emission for tracking
  - Configuration flag to enable/disable

**Example (When Enabled):**
- Tournament prize pool: $200
- Burn amount: $50 (25% of $200)
- If MEWS = $0.001: Burn 50,000 MEWS tokens
- Status: **Optional - can be enabled later**

**Example (When Disabled - Current):**
- Tournament prize pool: $200
- Burn amount: $0 (burn disabled)
- Operations receives additional $50 (includes burn share)
- Status: **Currently disabled - operations receives full share**

## How It Works

### Entry Fee Collection

1. Player purchases tournament ticket
   - Can pay in SUI, MEWS, or USDC
   - Ticket value is converted to USD cents for tracking
   - Actual tokens are collected immediately
   - `prize_pool_usd_cents` is incremented on tournament

2. Prize pool accumulates
   - Each entry adds to `prize_pool_usd_cents`
   - Value tracked in USD regardless of payment token
   - Example: 200 entries @ $1 = $200 prize pool

**Important:** The prize pool consists of:
- **Starting Ante:** Creator's contribution (if any)
- **Entry Fees:** From players entering the tournament
- **NOT Included:** Creation fee ($5.00) - this goes directly to operations, not into the prize pool

### Reward Distribution (When Tournament Ends)

1. **Calculate splits:**
   - Creator reward: Boost system (50% until $5 earned, then 20% of remaining)
   - Player rewards: Variable by tournament size
     - 1-10 entries: 25% of prize pool
     - 11+ entries: 50% of prize pool (DOUBLES after 10 players!)
   - Operations: Variable (adjusts based on creator reward and player rewards, minimum 25% for small tournaments, includes burn share when burn is disabled)
   - Token burn: Variable (Optional - not implemented early on, can be enabled later)

2. **Distribute creator reward:**
   - Calculate using boost system: 50% until $5 earned, then 20% of remaining
   - Formula: If Entry Fees × 50% ≤ $5.00: Entry Fees × 50%, else $5.00 + (Entry Fees - $10.00) × 20%
   - Convert USD cents to MEWS tokens
   - Mint and transfer to creator address
   - Mark creator reward as paid

3. **Distribute player rewards:**
   - Get top 10 leaderboard
   - Calculate item rewards per rank
   - Add items to player inventories
   - Uses `admin_add_items` function

4. **Operations (no action):**
   - Already collected in admin wallet
   - No transaction needed

5. **Token burn (optional - future):**
   - Only if token burn is enabled
   - Convert USD cents to MEWS tokens
   - Execute burn transaction
   - Emit burn event
   - If disabled, burn share goes to operations instead

## Example Calculations

### Small Tournament (10 entries)

**Tournament:**
- 10 players entered
- Entry fee: $1.00 per player
- Total prize pool: $10.00 (1,000 USD cents)

**Distribution:**
- Creator reward: $5.00 (50% of $10 entry fees)
  - Paid to tournament creator in MEWS tokens
- Player rewards: $2.50 (25% of total prize pool - reduced for small tournaments)
  - **Token Rewards (Top 3):**
    - 1st: $1.25 in MEWS tokens (50% of $2.50)
    - 2nd: $0.75 in MEWS tokens (30% of $2.50)
    - 3rd: $0.50 in MEWS tokens (20% of $2.50)
  - **Item Rewards (All Top 10):**
    - Top 3: Special items + random items
    - 4th-10th: Random items only
- Operations: $2.50 (25% of prize pool - minimum guaranteed)
  - Already in admin wallet

### Large Tournament (20 entries - Prize Pool DOUBLED!)

**Tournament:**
- 20 players entered
- Entry fee: $1.00 per player
- Total prize pool: $20.00 (2,000 USD cents)

**Distribution:**
- Creator reward: $7.00 ($5 boost + $2 at 20% of remaining $10)
  - Paid to tournament creator in MEWS tokens
- Player rewards: $10.00 (50% of total prize pool - DOUBLED from 25%! 🎉)
  - **Token Rewards (Top 3):**
    - 1st: $5.00 in MEWS tokens (50% of $10) - 4x more than small tournament!
    - 2nd: $3.00 in MEWS tokens (30% of $10) - 4x more than small tournament!
    - 3rd: $2.00 in MEWS tokens (20% of $10) - 4x more than small tournament!
  - **Item Rewards (All Top 10):**
    - Top 3: Special items + random items
    - 4th-10th: Random items only
- Operations: $3.00 (15% - remaining after rewards)
  - Already in admin wallet
- Token burn: $0.00 (0% - Optional, not implemented early on)

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Creator Reward (Boost) | ⏳ To Be Implemented | 50% until $5 earned, then 20% of remaining |
| Player Rewards (Variable) | ✅ Implemented | 25% for 1-10 entries, 50% for 11+ entries (DOUBLES!) |
| Operations (Variable) | ✅ Complete | Minimum 25% for small tournaments, stays in admin wallet |
| Token Burn (Optional) | ⏸️ Not Implemented Early On | Optional feature, can be enabled later via config |

## Token Burn Configuration

**Status:** Optional feature - disabled by default, can be enabled later

**Configuration:**
- Token burn can be enabled/disabled via configuration flag
- When disabled: Operations receives the burn share
- When enabled: Burn share is sent to burn wallet
- Default: **Disabled** (not implemented early on)

**Implementation Note:**
- Token burn is not a priority for early implementation
- Operations will receive the full share (including what would be burned)
- Can be enabled later when ready to implement burn mechanics

## Future: Token Burn Implementation (Optional)

When implementing token burn, will need:

1. **Token Price Service**
   - Get current MEWS/USD price
   - Convert USD cents to MEWS token amount

2. **Burn Transaction**
   - Access to TreasuryCap<MEWS>
   - Create Coin<MEWS> from admin wallet balance
   - Call `mews::burn()` function
   - Emit burn event

3. **Tracking**
   - Log burn amount
   - Track total burned across all tournaments
   - Display in admin dashboard

## Notes

- Prize pool is tracked in USD cents for consistency
- Actual token collection happens at ticket purchase
- Creator reward is calculated from entry fees only (excludes starting ante)
- Creator reward is paid at tournament end in MEWS tokens
- Operations revenue is already collected (no action needed)
- Token burn is an optional feature that can be enabled later
- When disabled, the burn share goes to operations instead
- Can be enabled via configuration flag when ready

## Creator Reward Details

See `TOURNAMENT_CREATOR_REWARD_DESIGN.md` for complete details on:
- Creator reward calculation
- Payment timing and method
- UI components for displaying creator earnings
- Integration with tournament creation flow

