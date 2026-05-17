# Tournament Reward System - Implementation Roadmap

## Overview

This document outlines what still needs to be implemented to complete the tournament reward system with custom rewards, payment processing, and creator rewards.

---

## ✅ Completed

### Contract Layer
- [x] Updated `Tournament` struct with all required fields
- [x] Added `TournamentRewardConfig` struct
- [x] Added `create_tournament_for_user` function
- [x] Updated `create_weekly_tournament` function
- [x] Added `calculate_creator_reward` helper function
- [x] Updated `end_tournament` to calculate creator rewards
- [x] Added view functions for new fields
- [x] Updated events with new fields

### Documentation
- [x] Tournament creation flow documented
- [x] Reward payment design documented
- [x] Creator reward design documented
- [x] Default reward cost analysis
- [x] Item pricing economics analysis
- [x] Contract update requirements documented

---

## 🔨 Backend Implementation Needed

### 1. Reward Cost Calculation Service ✅ **CREATED**

**File:** `backend/lib/services/reward-cost-calculator.ts`

**Status:** ✅ **IMPLEMENTED** - Reward cost calculator service created

**Functions Implemented:**
- ✅ `calculateRewardCost(rewardConfig, playerAddress, badgeDiscount)` - Calculate total reward cost
- ✅ `getAverageLevel1Price()` - Get average Level 1 item price ($0.67)
- ✅ `getBadgeDiscountForPlayer(playerAddress)` - Get player's badge discount
- ✅ `calculateTotalPayment(startingAnte, rewardCost)` - Calculate total payment breakdown

**What it does:**
- Calculates base cost (reward depth × $0.67 × discounts)
- Calculates special item cost (with badge discount only)
- Calculates level 2+ cost (price difference with badge discount only)
- Handles badge discount lookup automatically
- Returns detailed cost breakdown

**Usage:**
```typescript
import { calculateRewardCost, calculateTotalPayment } from '@/lib/services/reward-cost-calculator';

const cost = await calculateRewardCost(rewardConfig, playerAddress);
const payment = calculateTotalPayment(startingAnteUSDCents, cost.totalCostUSDCents);
```

---

### 2. Tournament Service Updates

**File:** `backend/lib/sui/tournament-service.ts`

**Functions to Add/Update:**

#### A. Build Tournament Creation Transaction ✅ **CREATED**

```typescript
async buildTournamentCreationTransaction(
  config: { ... },
  paymentConfig: { playerAddress, paymentToken }
): Promise<{ success: boolean; transaction?: string; gasEstimate?: string; error?: string }>
```

**What it does:**
- Uses PaymentTransactionBuilder for consistent payment handling
- Converts USD to tokens using PriceConverter
- Builds transaction with payment + create_tournament_for_user call
- Returns unsigned transaction for frontend to sign

**Status:** ✅ **IMPLEMENTED**

#### B. Update Create Weekly Tournament
```typescript
async createWeeklyTournament(config: {
  // ... existing fields ...
  rewardConfig?: TournamentRewardConfig | null;
  startingAnteUSDCents?: number;
}): Promise<{ success: boolean; tournament?: Tournament; error?: string }>
```

**What it does:**
- Updates existing function to accept new parameters
- Passes `reward_config` and `starting_ante_usd_cents` to contract
- Handles `Option<TournamentRewardConfig>` serialization

**Status:** ❌ Not implemented (needs update)

#### C. Get Tournament with New Fields
```typescript
async getTournament(objectId: string): Promise<{ success: boolean; tournament?: Tournament; error?: string }>
```

**What it does:**
- Updates to read new fields from contract:
  - `reward_config`
  - `starting_ante_usd_cents`
  - `created_by`
  - `creation_fee_paid`
  - `creator_reward_usd_cents`
  - `creator_reward_paid`

**Status:** ⚠️ Partially implemented (needs update to read new fields)

#### D. Serialize TournamentRewardConfig
```typescript
function serializeRewardConfig(config: TournamentRewardConfig): {
  reward_depth: number;
  pool_depth: number;
  pool_distribution: number[];
  pool_source: number;
  item_rewards: Map<number, ItemReward[]>;
}
```

**What it does:**
- Converts TypeScript `TournamentRewardConfig` to Move contract format
- Handles `Table<u8, vector<ItemReward>>` serialization

**Status:** ❌ Not implemented

---

### 3. Payment Transaction Builder (Shared Service) ✅ **CREATED**

**File:** `backend/lib/sui/payment-transaction-builder.ts`

**Status:** ✅ **IMPLEMENTED** - Shared payment transaction builder created

**What it does:**
- Handles token transfers (SUI, MEWS, USDC)
- Checks player balances
- Prepares payment coins
- Builds payment transactions with custom contract calls
- Used by both StoreService and TournamentService

**Usage Example:**
```typescript
const paymentBuilder = createPaymentTransactionBuilder(client);

const result = await paymentBuilder.buildPaymentTransaction({
  paymentConfig: {
    playerAddress: '0x...',
    paymentToken: 'SUI',
    totalTokenAmount: '1000000000', // 1 SUI (with decimals)
    recipientAddress: adminAddress,
    context: 'tournament creation',
  },
  customCalls: (txb, paymentCoin) => {
    // Add tournament creation call
    txb.moveCall({
      target: `${packageId}::tournaments::create_tournament_for_user`,
      arguments: [
        // ... tournament args ...
        paymentCoin, // Use payment coin
      ],
    });
  },
});
```

**Next Steps:**
- [ ] Refactor StoreService to use PaymentTransactionBuilder
- [ ] Update TournamentService to use PaymentTransactionBuilder for tournament creation payments

---

### 4. Reward Distribution Service

**File:** `backend/lib/services/tournament-reward-distributor.ts`

**Functions Needed:**
- `distributeTournamentRewards(tournamentId)` - Main distribution function
- `getTournamentWinners(tournamentId)` - Get sorted winners from leaderboard
- `distributeDefaultRewards(winners, prizePool)` - Distribute default rewards (MEWS + items)
- `distributeCustomRewards(winners, rewardConfig)` - Distribute custom rewards from config
- `calculatePrizePoolSplit(prizePool, participantCount)` - Calculate variable split (25% vs 50%)
- `distributeMEWSTokens(winners, poolAmount, distribution)` - Distribute MEWS tokens
- `distributeItems(winners, itemRewards)` - Distribute items to winners

**What it does:**
- Called after tournament ends (grace period)
- Reads tournament reward config (default vs custom)
- Distributes rewards based on config
- Handles both default and custom reward systems

**Status:** ❌ Not implemented

---

### 5. Creator Reward Service ✅ **CREATED**

**File:** `backend/lib/services/creator-reward-service.ts`

**Status:** ✅ **IMPLEMENTED** - Creator reward service created

**Functions Implemented:**
- ✅ `calculateCreatorReward(totalEntryFees, creationFee)` - Calculate creator reward (boost system)
- ✅ `calculateCreatorRewardForTournament(tournament)` - Calculate reward for a tournament
- ✅ `getCreatorRewardStatus(tournamentObjectId)` - Get creator reward status
- ✅ `getTournamentsByCreator(creatorAddress)` - Get all tournaments created by user

**What it does:**
- Calculates creator reward using boost system (50% until $5 covered, then 20%)
- Matches contract's calculate_creator_reward function
- Provides reward status and tournament queries
- Note: Payment distribution will be handled separately (needs payment integration)

**Usage:**
```typescript
import { calculateCreatorReward, getTournamentsByCreator } from '@/lib/services/creator-reward-service';

const reward = calculateCreatorReward(1000, 500); // $10 entry fees, $5 creation fee
const tournaments = await getTournamentsByCreator(creatorAddress);
```

---

### 6. API Endpoints

**File:** `backend/app/api/tournaments/` (or similar)

**Endpoints Needed:**

#### A. Create Tournament (User) ✅ **CREATED**
```
POST /api/tournaments/create
Body: {
  name: string;
  category: string;
  startTime: number;
  endTime: number;
  entryFeeTickets: number;
  rewardConfig?: TournamentRewardConfig | null;
  startingAnteUSDCents: number;
  paymentToken: 'SUI' | 'MEWS' | 'USDC';
  playerAddress: string;
  badgeDiscount?: number;
}
Response: {
  success: boolean;
  transaction: string; // Base64 encoded transaction bytes
  gasEstimate: string;
  payment: { ... };
  cost: { ... };
}
```

**What it does:**
- Validates all inputs
- Calculates reward cost using RewardCostCalculator
- Calculates total payment (creation fee + starting ante + reward cost)
- Builds tournament creation transaction using PaymentTransactionBuilder
- Returns unsigned transaction for frontend to sign

**Status:** ✅ **IMPLEMENTED**

#### B. Calculate Reward Cost ✅ **CREATED**
```
POST /api/tournaments/calculate-reward-cost
Body: {
  rewardConfig: TournamentRewardConfig | null;
  playerAddress?: string;
  startingAnteUSDCents?: number;
  badgeDiscount?: number;
}
Response: {
  success: boolean;
  cost: {
    baseCost: number;
    specialItemCost: number;
    level2PlusCost: number;
    totalCost: number;
    totalCostUSDCents: number;
    discountApplied: number;
    badgeDiscountApplied: number;
  };
  totalPayment?: {
    creationFeeUSDCents: number;
    startingAnteUSDCents: number;
    rewardCostUSDCents: number;
    totalUSDCents: number;
    totalUSD: number;
  };
}
```

**Status:** ✅ **IMPLEMENTED**

#### C. Get Creator Rewards ✅ **CREATED**
```
GET /api/tournaments/creator/:address/rewards
Response: {
  success: boolean;
  creatorAddress: string;
  tournaments: Array<{
    tournamentId: number;
    name: string;
    objectId: string;
    status: 'upcoming' | 'active' | 'ended';
    prizePoolUSDCents: number;
    participants: number;
    creatorRewardUSDCents: number;
    creatorRewardUSD: number;
    paid: boolean;
    endedAt?: number;
    calculation?: CreatorRewardCalculation;
  }>;
  totalRewardsUSDCents: number;
  totalRewardsUSD: number;
}
```

**Status:** ✅ **IMPLEMENTED**

#### D. Distribute Tournament Rewards
```
POST /api/tournaments/:tournamentId/distribute-rewards
(Admin only)
Response: { success: boolean; distributed: boolean; error?: string }
```

**Status:** ❌ Not implemented

---

## 🎨 Frontend Implementation Needed

### 1. Tournament Creation UI

**Components Needed:**
- `TournamentCreationWizard` - Multi-step wizard
- `RewardConfigurationStep` - Step 5: Reward configuration
- `StartingAnteStep` - Step 6: Starting ante
- `ReviewAndPaymentStep` - Step 7: Review & payment
- `PaymentProcessingStep` - Step 8: Payment processing

**Features:**
- Default vs Custom reward selection
- Reward depth selector
- Item reward configuration per rank
- Cost calculation display (real-time)
- Payment method selection
- Wallet connection
- Transaction signing

**Status:** ❌ Not implemented

---

### 2. Creator Dashboard

**Components Needed:**
- `CreatorDashboard` - Main dashboard
- `TournamentList` - List of created tournaments
- `RewardSummary` - Creator reward summary
- `TournamentStats` - Tournament statistics

**Features:**
- View all created tournaments
- Track creator rewards
- See tournament participation
- Withdraw creator rewards

**Status:** ❌ Not implemented

---

### 3. Tournament Display Updates

**Components to Update:**
- `TournamentCard` - Show custom rewards indicator
- `TournamentDetails` - Display reward configuration
- `Leaderboard` - Show reward distribution

**Status:** ❌ Not implemented

---

## 🔧 Integration Tasks

### 1. Contract Integration
- [ ] Update backend to call updated contract functions
- [ ] Handle `Option<TournamentRewardConfig>` serialization
- [ ] Test contract function calls with new parameters
- [ ] Verify event parsing for new fields

### 2. Payment Integration
- [ ] Integrate wallet connection (Sui Wallet)
- [ ] Implement token conversion (USD → SUI/MEWS)
- [ ] Handle payment transaction signing
- [ ] Verify payment before tournament creation

### 3. Reward Distribution Integration
- [ ] Set up cron job or webhook for tournament end detection
- [ ] Integrate with item distribution system
- [ ] Integrate with MEWS token distribution
- [ ] Handle both default and custom reward distribution

### 4. Creator Reward Integration
- [ ] Set up creator reward payment system
- [ ] Integrate with wallet for creator payouts
- [ ] Track creator reward payments

---

## 🧪 Testing Needed

### 1. Unit Tests
- [ ] Reward cost calculation tests
- [ ] Creator reward calculation tests
- [ ] Prize pool split calculation tests
- [ ] Payment validation tests

### 2. Integration Tests
- [ ] Tournament creation flow (admin)
- [ ] Tournament creation flow (user with payment)
- [ ] Reward distribution (default)
- [ ] Reward distribution (custom)
- [ ] Creator reward calculation and payment

### 3. Contract Tests
- [ ] Test `create_tournament_for_user` function
- [ ] Test `calculate_creator_reward` function
- [ ] Test `end_tournament` with creator reward calculation
- [ ] Test reward config validation

---

## 📋 Priority Order

### Phase 1: Core Backend Services (High Priority)
1. ✅ Contract updates (DONE)
2. ✅ Reward cost calculation service (DONE)
3. ✅ Payment transaction builder (DONE)
4. ✅ Tournament service - build creation transaction (DONE)
5. ✅ API endpoints - calculate reward cost (DONE)
6. ✅ API endpoints - create tournament (DONE)
7. ✅ Tournament service - update getTournament to read new fields (DONE)
8. ✅ Tournament service - update createWeeklyTournament (DONE)
9. ✅ Creator reward service (DONE)
10. ✅ API endpoints - creator rewards (DONE)

### Phase 2: Reward Distribution (High Priority)
11. ✅ Reward distribution service (DONE - Updated to support variable rewards & custom configs)
12. ✅ API endpoints - distribute rewards (DONE - Updated existing endpoints)
13. ✅ Creator reward payment integration (DONE - Distribute creator rewards with MEWS token minting)

### Phase 3: Frontend (Medium Priority)
8. ✅ Tournament creation UI (DONE - Multi-step wizard with payment)
9. Creator dashboard (TODO - Show creator earnings)
10. Tournament display updates (TODO - Show custom rewards, creator info)

### Phase 4: Integration & Testing (Medium Priority)
11. Payment integration
12. Reward distribution integration
13. Creator reward integration
14. Comprehensive testing

### Phase 5: Polish & Optimization (Low Priority)
15. Performance optimization
16. Error handling improvements
17. UI/UX refinements
18. Documentation updates

---

## 🔍 Key Decisions Needed

1. **Payment Method:** How will users pay? (SUI, MEWS, credit card?)
2. **Payment Timing:** Pay before or after tournament creation?
3. **Reward Distribution Timing:** Automatic or manual trigger?
4. **Creator Reward Payout:** Automatic or manual withdrawal?
5. **Error Handling:** What happens if payment fails? Tournament creation fails?

---

## 📝 Notes

- All backend services should follow existing patterns in the codebase
- Use existing services (badge-service, item-catalog) where possible
- Maintain backward compatibility with existing tournaments
- Consider rate limiting for payment processing
- Add comprehensive logging for debugging

---

## 🎯 Next Steps

1. **Start with Reward Cost Calculator** - This is needed for the UI to show costs
2. **Update Tournament Service** - Add create for user function
3. **Build Payment Processing** - Basic implementation to handle payments
4. **Create API Endpoints** - Expose functionality to frontend
5. **Build Frontend UI** - Tournament creation wizard

---

## Summary

**Total Tasks:** ~25 major items
**Completed:** 1 (Contract updates)
**In Progress:** 0
**Remaining:** ~24

**Estimated Time:**
- Backend: 2-3 weeks
- Frontend: 1-2 weeks
- Integration & Testing: 1 week
- **Total: 4-6 weeks**

