# Tournament Reward Payment Design

## Problem Statement

**Issue:** Users could create tournaments with custom rewards, set themselves as winners, and receive items cheaper than purchasing them directly from the store. This creates an economic exploit.

**Example Exploit:**
- User creates tournament with reward depth of 6
- User configures rewards: 6 players get Level 1 items
- User wins tournament and receives items
- User paid only creation fee + starting ante, but got $5.70 worth of items (6 × $0.95 average)

## Solution: Reward Payment Requirement

Tournament creators must **pay for the rewards they're giving away** when creating custom reward tournaments. This ensures:
1. ✅ No economic exploit (can't get items cheaper than store)
2. ✅ Fair pricing (based on actual item values)
3. ✅ Incentivizes tournament creation (discount applied)
4. ✅ Scales with reward depth (more rewards = more payment)

---

## Payment Calculation

### Step 1: Calculate Average Level 1 Item Price

**Level 1 Items (excluding special items):**
- `extraLives`: $0.35
- `forceField`: $0.75
- `orbLevel`: $0.50
- `coinTractorBeam`: $0.75
- `slowTime`: $1.00

**Average Price:**
```
Average = (0.35 + 0.75 + 0.50 + 0.75 + 1.00) / 5
Average = $3.35 / 5
Average = $0.67 per Level 1 item
```

**Special Items (excluded from average):**
- `destroyAll`: $1.75 (special item)
- `bossKillShot`: $2.50 (special item)

### Step 2: Calculate Reward Cost

**Formula:**
```
Reward Cost = (Reward Depth × Average Level 1 Price) × Discount Factor
```

**Discount Structure:**
- **Base Discount:** 25% (0.75) for adding reward depth - encourages tournament creation
- **Badge Discount:** 0-25% based on user's badge tier (same as store discounts)
  - Standard: 0%
  - Common: 5%
  - Uncommon: 10%
  - Rare: 15%
  - Epic: 20%
  - Legendary: 25%
- **Total Discount:** Discounts stack multiplicatively (same as store discount logic)

**Example Calculation (No Badge Discount):**
```
Reward Depth: 6 players
Average Level 1 Price: $0.67
Base Discount: 25% (0.75)
Badge Discount: 0% (Standard tier)

Reward Cost = (6 × $0.67) × 0.75
Reward Cost = $4.02 × 0.75
Reward Cost = $3.02
```

**Example Calculation (With Badge Discount - Legendary Tier):**
```
Reward Depth: 6 players
Average Level 1 Price: $0.67
Base Discount: 25% (0.75)
Badge Discount: 25% (Legendary tier)

Reward Cost = (6 × $0.67) × 0.75 × 0.75
Reward Cost = $4.02 × 0.5625
Reward Cost = $2.26
```

### Step 3: Handle Actual Item Configuration

**Problem:** Users configure specific items, not just "average level 1 items"

**Solution Options:**

#### Option A: Charge Based on Reward Depth (Simpler)
- Charge based on reward depth only
- Use average price regardless of actual items configured
- **Pros:** Simple, predictable pricing
- **Cons:** Doesn't account for special items or higher levels

#### Option B: Charge Based on Actual Items (More Accurate)
- Calculate cost based on actual items configured in `itemRewards`
- Sum up all item prices across all ranks
- Apply discount to total
- **Pros:** Accurate, fair pricing
- **Cons:** More complex calculation

#### Option C: Hybrid Approach (Recommended)
- **Base Cost:** Reward depth × average level 1 price × base discount × badge discount
- **Additional Cost:** Special items (destroyAll, bossKillShot) charged at full price with badge discount
- **Additional Cost:** Level 2+ items charged at full price difference with badge discount
- **Formula:**
  ```
  Base Discount Factor = 0.75 (25% base discount)
  Badge Discount Factor = 1 - (badgeDiscountPercent / 100)
  Total Discount Factor = Base Discount Factor × Badge Discount Factor
  
  Base Cost = (Reward Depth × $0.67) × Total Discount Factor
  Special Item Cost = Sum of (special item price × quantity × Badge Discount Factor) for all ranks
  Level 2+ Cost = Sum of ((level price - $0.67) × quantity × Badge Discount Factor) for all ranks
  Total Reward Cost = Base Cost + Special Item Cost + Level 2+ Cost
  ```

**Example (Option C - Legendary Badge, 25% badge discount):**
```
Reward Depth: 6
Base Discount: 25% (0.75)
Badge Discount: 25% (0.75)
Total Discount Factor: 0.75 × 0.75 = 0.5625

Base Cost = (6 × $0.67) × 0.5625 = $2.26

Actual Items Configured:
- Rank 1: destroyAll x1 ($1.75), bossKillShot x1 ($2.50), orbLevel L1 x1 ($0.50)
- Rank 2: bossKillShot x1 ($2.50), forceField L1 x1 ($0.75)
- Ranks 3-6: forceField L1 x1 each ($0.75 × 4 = $3.00)

Special Item Cost = ($1.75 + $2.50 + $2.50) × 0.75 = $5.06
Level 2+ Cost = $0 (all items are level 1)
Total Reward Cost = $2.26 + $5.06 + $0 = $7.32
```

---

## Payment Structure

### Total Payment Breakdown

**For User-Created Tournaments:**
```
Total Payment = Creation Fee + Starting Ante + Reward Cost
```

**Components:**
1. **Creation Fee:** $5.00 (fixed, prevents spam)
   - Goes directly to operations wallet
   - **NOT included in prize pool** - this is a fee for creating the tournament
2. **Starting Ante:** User-defined (optional, $0.00 minimum)
   - Goes into the tournament prize pool
   - This is the creator's contribution to the prize pool
3. **Reward Cost:** Calculated based on reward configuration
   - Goes to operations wallet (covers item distribution)

**Example:**
```
Creation Fee: $5.00
Starting Ante: $10.00
Reward Cost: $15.13 (from example above)
─────────────────────────
Total Payment: $30.13
```

### When Reward Cost Applies

**Reward Cost is Required When:**
- ✅ User creates tournament with **custom reward configuration** (`rewardConfig` is set)
- ✅ Reward depth > 0

**Reward Cost is NOT Required When:**
- ✅ Admin creates tournament (admin doesn't pay for rewards)
- ✅ User creates tournament with **default rewards** (`rewardConfig` is null)
- ✅ Reward depth = 0 (no item rewards)

---

## UI Updates

### Step 5: Reward Configuration (Updated)

**UI Changes:**
```
┌─────────────────────────────────────────────────┐
│  Configure Rewards                              │
├─────────────────────────────────────────────────┤
│                                                 │
│  [Universal Reward UI - Tournament Mode]       │
│                                                 │
│  ┌─ Item Rewards ───────────────────────────┐  │
│  │  Reward Depth: [6 ▼] players             │  │
│  │  (How many players receive item rewards)  │  │
│  │                                            │  │
│  │  Rank 1: [Destroy All x1] [Boss Kill x1] │  │
│  │         [+ Add Item]                     │  │
│  │  Rank 2: [Boss Kill x1]                 │  │
│  │         [+ Add Item]                     │  │
│  │  ... (up to reward depth)                │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌─ Reward Cost Calculation ────────────────┐  │
│  │  Base Cost (6 × $0.67 × 0.75): $3.02    │  │
│  │  Special Items: $5.06 (with badge)      │  │
│  │  Level 2+ Items: $0.00                  │  │
│  │  ─────────────────────────────────────── │  │
│  │  Total Reward Cost: $8.08              │  │
│  │  (25% base + 25% badge = 43.75% off)   │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  [Reset to Default] [← Back] [Next →]         │
└─────────────────────────────────────────────────┘
```

**Real-Time Calculation:**
- Update reward cost as user configures items
- Show breakdown: base cost + special items + level 2+
- Display discount percentages (base discount + badge discount)
- Show badge tier and discount if applicable
- Warn if cost exceeds budget

### Step 7: Review (Updated)

**UI Changes:**
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
│  │  Type: Custom                              │  │
│  │  Reward Depth: 6 players                  │  │
│  │  [Show item breakdown]                    │  │
│  └────────────────────────────────────────────┘  │
│                                                 │
│  Starting Ante: $10.00                          │
│                                                 │
│  ┌─ Payment Summary ────────────────────────┐  │
│  │  Tournament Creation Fee: $5.00          │  │
│  │  Starting Ante: $10.00                   │  │
│  │  Reward Cost: $8.08                     │  │
│  │  ─────────────────────────────────────── │  │
│  │  Total: $23.08                            │  │
│  │  (25% base + 25% badge discount)         │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  Payment Method: [SUI ▼] [MEWS] [USDC]         │
│                                                 │
│  [← Back] [Pay & Create Tournament]            │
└─────────────────────────────────────────────────┘
```

---

## Backend Implementation

### Payment Calculation Service

**New Function: `calculateRewardCost`**

```typescript
interface RewardCostCalculation {
  baseCost: number;           // Reward depth × average price × discounts
  specialItemCost: number;    // Sum of special item prices (with badge discount)
  level2PlusCost: number;     // Sum of level 2+ price differences (with badge discount)
  totalCost: number;          // Total reward cost
  discountApplied: number;     // Base discount percentage (25%)
  badgeDiscountApplied: number; // Badge discount percentage (0-25%)
}

function calculateRewardCost(
  rewardConfig: TournamentRewardConfig | null,
  averageLevel1Price: number = 0.67,
  baseDiscountPercent: number = 25,
  badgeDiscountPercent: number = 0,
  playerAddress?: string
): RewardCostCalculation {
  // If no custom config, return $0
  if (!rewardConfig) {
    return {
      baseCost: 0,
      specialItemCost: 0,
      level2PlusCost: 0,
      totalCost: 0,
      discountApplied: 0,
      badgeDiscountApplied: 0,
    };
  }

  // Get badge discount if player address provided
  let actualBadgeDiscount = badgeDiscountPercent;
  if (playerAddress) {
    // Fetch badge tier and calculate discount (same as store discount logic)
    const badgeData = await getBadgeForPlayer(playerAddress);
    if (badgeData?.badge) {
      const discounts = getDiscounts(badgeData.badge.tier);
      actualBadgeDiscount = discounts.store; // Use store discount (0-25%)
    }
  }

  // Calculate total discount factor (multiplicative stacking)
  const baseDiscountFactor = 1 - (baseDiscountPercent / 100); // 0.75 (25% off)
  const badgeDiscountFactor = 1 - (actualBadgeDiscount / 100); // 0.75-1.00 (0-25% off)
  const totalDiscountFactor = baseDiscountFactor * badgeDiscountFactor;

  const baseCost = (rewardConfig.rewardDepth * averageLevel1Price) * totalDiscountFactor;

  let specialItemCost = 0;
  let level2PlusCost = 0;

  // Calculate costs for actual items configured
  // Special items and level 2+ items get badge discount but NOT base discount
  for (const [rank, items] of Object.entries(rewardConfig.itemRewards)) {
    for (const item of items) {
      const itemPrice = getItemPrice(item.itemId, item.level);
      if (!itemPrice) continue;

      const quantity = item.quantity || 1;

      // Check if special item (apply badge discount only)
      if (item.itemId === 'destroyAll' || item.itemId === 'bossKillShot') {
        specialItemCost += itemPrice * quantity * badgeDiscountFactor;
      }
      // Check if level 2+ (apply badge discount only)
      else if (item.level > 1) {
        const level1Price = getItemPrice(item.itemId, 1) || averageLevel1Price;
        const priceDifference = itemPrice - level1Price;
        level2PlusCost += priceDifference * quantity * badgeDiscountFactor;
      }
    }
  }

  const totalCost = baseCost + specialItemCost + level2PlusCost;

  return {
    baseCost,
    specialItemCost,
    level2PlusCost,
    totalCost,
    discountApplied: baseDiscountPercent,
    badgeDiscountApplied: actualBadgeDiscount,
  };
}
```

### API Updates

**Updated Endpoint: `POST /api/tournaments/create`**

**Request:**
```typescript
{
  name: "Weekly High Score #1",
  category: "highestScore",
  startTime: 1702656000000,
  endTime: 1703260800000,
  entryFeeTickets: 1,
  rewardConfig: { ... },              // Custom config
  startingAnteUsdCents: 1000,        // $10.00
  payment: {
    method: "SUI" | "MEWS" | "USDC",
    amount: 3013,                     // Total in cents ($30.13)
    transactionDigest: "0x..."        // Payment transaction
  }
}
```

**Payment Validation:**
```typescript
// Get badge discount for player
let badgeDiscount = 0;
if (request.playerAddress) {
  const badgeData = await badgeService.getBadgeForPlayer(request.playerAddress);
  if (badgeData?.badge) {
    const discounts = getDiscounts(badgeData.badge.tier);
    badgeDiscount = discounts.store; // Use store discount (0-25%)
  }
}

// Calculate expected payment
const creationFee = 500; // $5.00
const startingAnte = request.startingAnteUsdCents;
const rewardCost = calculateRewardCost(
  request.rewardConfig,
  0.67, // average level 1 price
  25,   // base discount (25%)
  badgeDiscount, // badge discount (0-25%)
  request.playerAddress
);
const expectedTotal = creationFee + startingAnte + rewardCost.totalCost;

// Validate payment amount
if (payment.amount < expectedTotal) {
  throw new Error(`Insufficient payment. Expected $${expectedTotal / 100}, got $${payment.amount / 100}`);
}
```

### Payment Distribution

**Payment Split:**
```
Total Payment: $23.08 (example with Legendary badge)
├─ Creation Fee ($5.00) → Operations wallet (NOT in prize pool)
├─ Starting Ante ($10.00) → Tournament prize pool
└─ Reward Cost ($8.08) → Operations wallet (covers item distribution)
```

**Important Notes:**
- **Creation Fee:** Goes directly to operations wallet, NOT into the prize pool. This is a fee for creating the tournament, separate from the prize pool.
- **Starting Ante:** Goes into the tournament prize pool. This is the creator's contribution to the prize pool.
- **Reward Cost:** Goes to operations wallet because:
  - Items are distributed from operations inventory
  - Covers the cost of items being given away
  - Prevents economic exploit

### Frontend Badge Discount Integration

**Getting Badge Discount:**
```typescript
// In the tournament creation UI
async function getBadgeDiscount(playerAddress: string): Promise<number> {
  try {
    const badgeData = await BadgeService.getBadgeForPlayer(playerAddress);
    if (badgeData?.badge) {
      const discounts = BadgeService.getDiscountsForTier(badgeData.badge.tier);
      return discounts.store; // 0-25% based on tier
    }
  } catch (error) {
    console.warn('Failed to get badge discount', error);
  }
  return 0; // Default to 0% if badge not found
}

// Calculate reward cost in real-time
function calculateRewardCost(
  rewardDepth: number,
  itemRewards: ItemRewardConfig,
  badgeDiscount: number
): RewardCostCalculation {
  const baseDiscount = 0.75; // 25% base discount
  const badgeDiscountFactor = 1 - (badgeDiscount / 100);
  const totalDiscount = baseDiscount * badgeDiscountFactor;
  
  // ... rest of calculation
}
```

**Display in UI:**
- Show badge tier icon and discount percentage
- Update cost calculation as user configures rewards
- Display both base discount (25%) and badge discount separately
- Show total discount percentage

---

## Edge Cases & Considerations

### 1. What if Creator Doesn't Win?

**Scenario:** User creates tournament, pays reward cost, but doesn't place in top ranks.

**Answer:** This is intentional. The reward cost is for **creating the tournament**, not for winning. The creator is paying to:
- Provide rewards to other players
- Create competitive events
- Build community engagement

**Alternative:** Consider refunding reward cost if creator places in top 3? (Not recommended - adds complexity)

### 2. Pool Rewards (MEWS Tokens)

**Question:** Should pool rewards (MEWS tokens) also require payment?

**Answer:** No. Pool rewards come from prize pool, which is funded by:
- Starting ante (user already paid)
- Entry fees (players pay when entering)

Pool rewards are self-funded, so no additional payment needed.

### 3. Default Rewards

**Question:** What if user uses default rewards (no custom config)?

**Answer:** No reward cost. Default rewards are:
- Standardized
- Part of the tournament system
- Not exploitable (same for all tournaments)

### 4. Admin Tournaments

**Question:** Do admins pay reward cost?

**Answer:** No. Admins:
- Don't pay creation fee
- Don't pay reward cost
- Can fund starting ante from admin wallet

Admins are trusted operators, not users trying to exploit the system.

### 5. Badge Discount Integration

**How It Works:**
- Badge discounts are fetched from the badge system (same as store purchases)
- Discounts stack multiplicatively with the 25% base discount
- Maximum total discount: 25% base × 25% badge = 43.75% off (for Legendary players)
- Minimum total discount: 25% base × 0% badge = 25% off (for Standard players)

**Example Discounts by Badge Tier:**
```
Standard (0% badge):    25% total discount (base only)
Common (5% badge):      28.75% total discount
Uncommon (10% badge):   32.5% total discount
Rare (15% badge):      36.25% total discount
Epic (20% badge):      40% total discount
Legendary (25% badge): 43.75% total discount
```

---

## Implementation Checklist

- [ ] Add `calculateRewardCost` function to backend
- [ ] Update `POST /api/tournaments/create` to calculate reward cost
- [ ] Add reward cost to payment validation
- [ ] Update UI to show reward cost calculation in real-time
- [ ] Update payment summary to include reward cost
- [ ] Add reward cost to payment distribution logic
- [ ] Update documentation
- [ ] Test with various reward configurations
- [ ] Test edge cases (no rewards, default rewards, special items)

---

## Summary

**Key Points:**
1. ✅ Users must pay for custom rewards they configure
2. ✅ Payment based on reward depth × average level 1 price × discounts
3. ✅ Special items and level 2+ items charged with badge discount (no base discount)
4. ✅ 25% base discount applied to base cost (incentivizes creation)
5. ✅ Badge discount (0-25%) stacks multiplicatively with base discount (follows store discount logic)
6. ✅ Reward cost added to total payment (creation fee + starting ante + reward cost)
7. ✅ Prevents economic exploit while encouraging tournament creation

**Formula:**
```
Base Discount Factor = 0.75 (25% base discount)
Badge Discount Factor = 1 - (badgeDiscount / 100) (0-25% based on tier)
Total Discount Factor = Base Discount Factor × Badge Discount Factor

Base Cost = (Reward Depth × $0.67) × Total Discount Factor
Special Item Cost = Sum of (special item price × quantity × Badge Discount Factor)
Level 2+ Cost = Sum of ((level price - $0.67) × quantity × Badge Discount Factor)
Total Reward Cost = Base Cost + Special Item Cost + Level 2+ Cost
Total Payment = Creation Fee + Starting Ante + Reward Cost
```

**Badge Discount Tiers (Same as Store):**
- Standard: 0% badge discount
- Common: 5% badge discount
- Uncommon: 10% badge discount
- Rare: 15% badge discount
- Epic: 20% badge discount
- Legendary: 25% badge discount

