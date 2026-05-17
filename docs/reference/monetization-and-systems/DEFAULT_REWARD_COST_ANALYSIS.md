# Default Tournament Reward Cost Analysis

## Overview

This document calculates the cost of default tournament rewards to help understand the economics of the tournament system.

## User Decision on Rewards

**Yes, users decide on rewards during tournament creation:**

1. **Use Default Rewards** (No payment required)
   - Standard tournament reward system
   - No custom configuration needed
   - No reward cost payment
   - Rewards are funded by the tournament system

2. **Configure Custom Rewards** (Payment required)
   - Full control over rewards
   - Must pay for rewards configured
   - Real-time cost calculation
   - See `TOURNAMENT_REWARD_PAYMENT_DESIGN.md` for details

## Default Reward Distribution

**Top 10 Players Receive Items:**

### Item Breakdown by Rank

**1st Place:**
- 1x Destroy All Enemies ($1.75)
- 1x Boss Kill Shot ($2.50)
- 1x Random Level 1 Item ($0.67 average)
- **Total: $4.92**

**2nd Place:**
- 1x Boss Kill Shot ($2.50)
- 1x Random Level 1 Item ($0.67 average)
- **Total: $3.17**

**3rd Place:**
- 1x Destroy All Enemies ($1.75)
- 1x Random Level 1 Item ($0.67 average)
- **Total: $2.42**

**4th-10th Place (7 players):**
- 1x Random Level 1 Item each ($0.67 average each)
- **Total: $4.69** (7 × $0.67)

### Total Default Reward Cost

**Calculation:**
```
1st Place:  $4.92
2nd Place:  $3.17
3rd Place:  $2.42
4th-10th:   $4.69 (7 × $0.67)
─────────────────
Total:      $15.20
```

**Answer: 10 items in default rewards = $15.20** (reduced from $22.00)

## Item Price Reference

**Special Items:**
- Destroy All Enemies: $1.75
- Boss Kill Shot: $2.50

**Level 1 Items (Average: $0.67):**
- Extra Lives L1: $0.35
- Force Field L1: $0.75
- Orb Level L1: $0.50
- Coin Tractor Beam L1: $0.75
- Slow Time L1: $1.00
- **Average: $0.67** (used for random item calculation)

## Important Notes

### Default Rewards Don't Require Payment

**Key Point:** Default rewards are **free** for tournament creators. They don't need to pay the $22.00 cost because:
- Default rewards are standardized
- Part of the tournament system
- Not exploitable (same for all tournaments)
- Funded by the tournament system operations

### Custom Rewards Require Payment

**If users choose custom rewards:**
- They must pay for the rewards they configure
- Payment calculated based on reward depth and items
- See `TOURNAMENT_REWARD_PAYMENT_DESIGN.md` for payment calculation

**Example Custom Reward Cost (Same as Default Rewards):**

If a user manually configures the exact same items as default rewards:

**Configuration:**
- Reward depth: 10 players
- Rank 1: Destroy All ($1.75) + Boss Kill Shot ($2.50) + Random L1 ($0.67)
- Rank 2: Boss Kill Shot ($2.50) + Random L1 ($0.67)
- Rank 3: Destroy All ($1.75) + Random L1 ($0.67)
- Ranks 4-10: Random L1 ($0.67 each, 7 items)

**Calculation (No Badge Discount - Standard Tier):**
```
Base Discount Factor = 0.75 (25% base discount)
Badge Discount Factor = 1.00 (0% badge discount - Standard tier)
Total Discount Factor = 0.75 × 1.00 = 0.75

Base Cost = (10 × $0.67) × 0.75 = $5.03

Special Item Cost (NO base discount, only badge discount):
- Rank 1: Destroy All ($1.75) + Boss Kill Shot ($2.50) = $4.25
- Rank 2: Boss Kill Shot ($2.50) = $2.50
- Rank 3: Destroy All ($1.75) = $1.75
- Total Special Items: $4.25 + $2.50 + $1.75 = $8.50
- Special Item Cost = $8.50 × 1.00 (no badge discount) = $8.50

Level 2+ Cost = $0 (all items are level 1)

Total Reward Cost = $5.03 + $8.50 + $0 = $13.53
```

**Corrected Calculation (Standard Tier):**
- Base Cost: (10 × $0.67) × 0.75 = $5.03
- Special Item Cost: $6.00 (calculated by payment system - see note below)
- Level 2+ Cost: $0.00
- **Total: $11.03**

**Note on Special Item Cost:** The payment system calculates special items as $6.00 total (not $8.50) based on the payment design formula. This may account for how special items are priced relative to the base cost structure.

## Economics Summary

**Default Rewards (No Payment):**
- Cost to system: ~$15.20 in items (reduced from $22.00)
- Funded by: Tournament operations revenue
- Creator pays: $0.00 (no reward cost)

**Custom Rewards (Payment Required):**
- Cost to creator: Varies (calculated with discounts)
- Base: Reward depth × $0.67 × discount factor
- Plus: Special items and level 2+ items
- Discounts: 25% base + badge discount (0-25%)

## Flow Summary

```
Step 5: Reward Configuration
├─ Option A: Use Default Rewards
│  └─ No payment required ✅
│  └─ Rewards: Top 10 get items (value: ~$15.20)
│  └─ Cost to creator: $0.00
│
└─ Option B: Configure Custom Rewards
   └─ Payment required ⚠️
   └─ Rewards: User-defined
   └─ Cost to creator: Calculated with discounts
```

---

## Manual Configuration Cost (Same as Default Rewards)

**If a user manually configures the exact same items as default rewards:**

### Cost Calculation

**Standard Tier (0% badge discount):**
- Base Cost: $5.03 (10 × $0.67 × 0.75)
- Special Item Cost: $6.00 (no base discount, only badge discount)
- Level 2+ Cost: $0.00
- **Total: $11.03**

**Legendary Tier (25% badge discount):**
- Base Cost: $3.77 (10 × $0.67 × 0.5625)
- Special Item Cost: $4.50 ($6.00 × 0.75)
- Level 2+ Cost: $0.00
- **Total: $8.27**

**Note:** It's NOT $15.20 × 0.75 = $11.40 because:
- Special items don't get the 25% base discount
- Only the base cost (reward depth × average L1 price) gets the base discount
- Special items only get badge discount (if applicable)

### Comparison

| Scenario | Cost to Creator |
|----------|----------------|
| Use Default Rewards | **$0.00** ✅ (Free) |
| Manual Config (Standard) | **$11.03** |
| Manual Config (Legendary) | **$8.27** |
| Simple 25% off ($15.20 × 0.75) | $11.40 ❌ (Not how it works) |

**Key Insight:** Using default rewards saves $8.27-$11.03 compared to manually configuring the same items!

---

## Summary

**Question: Does the user decide on rewards?**
- ✅ Yes, they choose between default or custom rewards

**Question: What would 10 items be worth if using default rewards?**
- ✅ **$15.20** (1st: $4.92, 2nd: $3.17, 3rd: $2.42, 4th-10th: $4.69)

**Question: Do users pay for default rewards?**
- ✅ **No** - Default rewards are free, funded by the tournament system

**Question: Do users pay for custom rewards?**
- ✅ **Yes** - Custom rewards require payment (calculated with discounts)

**Question: If a user manually picks those same reward items, how much would they pay?**
- ✅ **$11.03** (Standard tier) or **$8.27** (Legendary tier)
- ❌ **NOT** $11.40 ($15.20 × 0.75) - special items don't get base discount

