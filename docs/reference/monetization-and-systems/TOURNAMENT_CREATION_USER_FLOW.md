# Tournament Creation User Flow - Step 5 & Beyond

## Overview

This document details the user flow for Steps 5-8 of tournament creation, focusing on reward configuration, cost calculation, and payment processing. This flow applies to **user-created tournaments** (admins have a similar but simplified flow without payment).

## Flow Summary

```
Step 1: Name ✅
Step 2: Category ✅
Step 3: Schedule ✅
Step 4: Entry Fee ✅
Step 5: Reward Configuration ⭐ (This document)
Step 6: Starting Ante
Step 7: Review & Payment
Step 8: Payment Processing & Creation
```

---

## Step 5: Reward Configuration

### User Decision Point

**Two Options:**
1. **Use Default Rewards** (No payment required)
   - Quick option
   - Standard tournament reward system
   - No custom configuration needed

2. **Configure Custom Rewards** (Payment required)
   - Full control over rewards
   - Must pay for rewards configured
   - Real-time cost calculation

### UI: Initial Choice

```
┌─────────────────────────────────────────────────┐
│  Configure Rewards                              │
├─────────────────────────────────────────────────┤
│                                                 │
│  Choose reward configuration:                  │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │  [○] Use Default Rewards                  │  │
│  │                                           │  │
│  │  Standard tournament reward system:      │  │
│  │  • Top 3: MEWS tokens (50%, 30%, 20%)    │  │
│  │  • Top 10: Items (rank-based)            │  │
│  │  • No additional cost                    │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │  [○] Configure Custom Rewards            │  │
│  │                                           │  │
│  │  Full control over rewards:              │  │
│  │  • Set reward depth                      │  │
│  │  • Configure items per rank              │  │
│  │  • Set pool rewards                      │  │
│  │  • Payment required for rewards          │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  [← Back] [Next →]                             │
└─────────────────────────────────────────────────┘
```

### Option A: Use Default Rewards

**If user selects "Use Default Rewards":**
- Skip to Step 6 (Starting Ante)
- `rewardConfig` is set to `null`
- No reward cost calculation needed
- Simple confirmation message

**UI:**
```
┌─────────────────────────────────────────────────┐
│  Default Rewards Selected                       │
├─────────────────────────────────────────────────┤
│                                                 │
│  ✅ Using default tournament reward system     │
│                                                 │
│  Default Configuration:                        │
│  • Reward Depth: 10 players                    │
│  • Pool Depth: 3 players                       │
│  • Pool Distribution: 50%, 30%, 20%            │
│  • Pool Source: Prize Pool (50% of total)       │
│  • Item Rewards: Rank-based distribution       │
│                                                 │
│  No additional payment required.               │
│                                                 │
│  [← Back] [Next →]                             │
└─────────────────────────────────────────────────┘
```

### Option B: Configure Custom Rewards

**If user selects "Configure Custom Rewards":**
- Show full reward configuration UI
- Real-time cost calculation
- Badge discount integration
- Item selection interface

---

## Step 5B: Custom Reward Configuration UI

### Full UI Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Configure Custom Rewards                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─ Reward Depth ───────────────────────────────────────┐  │
│  │  How many players receive item rewards:              │  │
│  │  [10 ▼] players                                       │  │
│  │  (Top 10 players will receive item rewards)          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ Item Rewards (Per Rank) ───────────────────────────┐  │
│  │                                                       │  │
│  │  Rank 1 Rewards:                                      │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  [Destroy All x1] [Boss Kill Shot x1]         │  │  │
│  │  │  [+ Add Item]                                  │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  │                                                       │  │
│  │  Rank 2 Rewards:                                      │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  [Boss Kill Shot x1]                           │  │  │
│  │  │  [+ Add Item]                                  │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  │                                                       │  │
│  │  Rank 3 Rewards:                                      │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  [Destroy All x1]                              │  │  │
│  │  │  [+ Add Item]                                  │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  │                                                       │  │
│  │  ... (Ranks 4-10 shown as user scrolls)             │  │
│  │                                                       │  │
│  │  Available Items:                                    │  │
│  │  [Orb L1] [Orb L2] [Orb L3]                         │  │
│  │  [Force Field L1] [Force Field L2] [Force Field L3] │  │
│  │  [Extra Lives L1] [Extra Lives L2] [Extra Lives L3] │  │
│  │  [Slow Time L1] [Slow Time L2] [Slow Time L3]       │  │
│  │  [Coin Tractor L1] [Coin Tractor L2] [Coin Tractor L3]││
│  │  [Destroy All] [Boss Kill Shot]                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ Pool Rewards (MEWS Tokens) ────────────────────────┐  │
│  │  Enable Pool Rewards: [✓]                            │  │
│  │                                                       │  │
│  │  Pool Depth: [3 ▼] players                           │  │
│  │  (How many players receive pool rewards)              │  │
│  │                                                       │  │
│  │  Distribution:                                        │  │
│  │  Rank 1: [50]% ───────────────────────────────────┐  │  │
│  │  Rank 2: [30]% ───────────────────────────────────┐  │  │
│  │  Rank 3: [20]% ───────────────────────────────────┐  │  │
│  │  Total: 100% ✓                                    │  │  │
│  │                                                       │  │
│  │  Pool Source: [Prize Pool ▼]                       │  │
│  │  (Percentage of tournament prize pool)             │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ Reward Cost Calculation ───────────────────────────┐  │
│  │  🏆 Badge: Legendary (25% discount)                 │  │
│  │                                                       │  │
│  │  Base Cost:                                          │  │
│  │  (10 players × $0.67) × 0.75 × 0.75 = $3.77        │  │
│  │  └─ 25% base discount  └─ 25% badge discount       │  │
│  │                                                       │  │
│  │  Special Items:                                       │  │
│  │  Destroy All x2: $1.75 × 2 × 0.75 = $2.63          │  │
│  │  Boss Kill Shot x2: $2.50 × 2 × 0.75 = $3.75       │  │
│  │                                                       │  │
│  │  Level 2+ Items: $0.00                              │  │
│  │                                                       │  │
│  │  ─────────────────────────────────────────────────── │  │
│  │  Total Reward Cost: $10.15                          │  │
│  │  (43.75% total discount applied)                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ Creator Earnings Preview ───────────────────────────┐  │
│  │  💰 Boost Until Break-Even!                          │  │
│  │                                                       │  │
│  │  Reward Structure:                                   │  │
│  │  • 50% until creation fee covered ($5.00)           │  │
│  │  • 20% of remaining entry fees after                │  │
│  │                                                       │  │
│  │  Estimated Earnings:                                 │  │
│  │  If 10 players enter: $5.00 ✅ (break-even!)      │  │
│  │  If 20 players enter: $7.00                         │  │
│  │  If 50 players enter: $13.00                         │  │
│  │  If 100 players enter: $23.00                        │  │
│  │                                                       │  │
│  │  💡 Break-even with just 10 entries!               │  │
│  │  💡 More players = more earnings!                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  [Reset to Default] [← Back] [Next →]                     │
└─────────────────────────────────────────────────────────────┘
```

### Interactive Elements

#### 1. Reward Depth Selector

**Behavior:**
- Dropdown or number input
- Range: 1-50 (configurable)
- Default: 10
- Updates cost calculation in real-time
- Dynamically shows/hides rank rows

**Code:**
```typescript
function onRewardDepthChange(newDepth: number) {
  setRewardDepth(newDepth);
  updateRankRows(newDepth); // Show/hide rank rows
  recalculateCost(); // Update cost calculation
}
```

#### 2. Item Selection

**Behavior:**
- Click item from "Available Items" pool
- Item added to selected rank
- Can specify quantity
- Can remove items
- Shows item price in tooltip

**Item Selection Flow:**
```
1. User clicks "Rank 1" → Shows item selection modal
2. User clicks "Destroy All" → Adds to Rank 1
3. User sets quantity: [1] → Updates cost
4. User clicks "Boss Kill Shot" → Adds to Rank 1
5. Cost updates in real-time
```

**Item Selection Modal:**
```
┌─────────────────────────────────────────────────┐
│  Add Item to Rank 1                              │
├─────────────────────────────────────────────────┤
│                                                 │
│  Select Item:                                    │
│  ┌──────────────────────────────────────────┐  │
│  │  [Destroy All Enemies]                   │  │
│  │  Price: $1.75                            │  │
│  │  Effect: Clear all enemies on screen     │  │
│  └──────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────┐  │
│  │  [Boss Kill Shot]                        │  │
│  │  Price: $2.50                            │  │
│  │  Effect: Instant boss kill               │  │
│  └──────────────────────────────────────────┘  │
│  ... (all items)                                │
│                                                 │
│  Quantity: [1]                                  │
│                                                 │
│  [Cancel] [Add Item]                            │
└─────────────────────────────────────────────────┘
```

#### 3. Pool Rewards Configuration

**Behavior:**
- Toggle to enable/disable pool rewards
- If disabled: Pool depth = 0, no pool rewards
- If enabled: Configure pool depth and distribution
- Distribution percentages must sum to 100%
- Real-time validation

**Pool Distribution Sliders:**
```
Rank 1: [━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┘
```

### Real-Time Cost Calculation

**Implementation:**
```typescript
// Fetch badge discount on component mount
useEffect(() => {
  async function loadBadgeDiscount() {
    if (playerAddress) {
      const badgeData = await BadgeService.getBadgeForPlayer(playerAddress);
      if (badgeData?.badge) {
        const discounts = BadgeService.getDiscountsForTier(badgeData.badge.tier);
        setBadgeDiscount(discounts.store); // 0-25%
      }
    }
  }
  loadBadgeDiscount();
}, [playerAddress]);

// Recalculate cost whenever reward config changes
useEffect(() => {
  const cost = calculateRewardCost(rewardConfig, badgeDiscount);
  setRewardCost(cost);
}, [rewardConfig, badgeDiscount]);
```

**Cost Calculation Function:**
```typescript
function calculateRewardCost(
  config: TournamentRewardConfig,
  badgeDiscount: number
): RewardCostCalculation {
  const baseDiscount = 0.75; // 25% base discount
  const badgeDiscountFactor = 1 - (badgeDiscount / 100);
  const totalDiscount = baseDiscount * badgeDiscountFactor;
  
  // Base cost
  const baseCost = (config.rewardDepth * 0.95) * totalDiscount;
  
  // Special items (with badge discount only)
  let specialItemCost = 0;
  let level2PlusCost = 0;
  
  for (const [rank, items] of Object.entries(config.itemRewards)) {
    for (const item of items) {
      const price = getItemPrice(item.itemId, item.level);
      const quantity = item.quantity || 1;
      
      if (item.itemId === 'destroyAll' || item.itemId === 'bossKillShot') {
        specialItemCost += price * quantity * badgeDiscountFactor;
      } else if (item.level > 1) {
        const level1Price = getItemPrice(item.itemId, 1) || 0.95;
        const diff = price - level1Price;
        level2PlusCost += diff * quantity * badgeDiscountFactor;
      }
    }
  }
  
  return {
    baseCost,
    specialItemCost,
    level2PlusCost,
    totalCost: baseCost + specialItemCost + level2PlusCost,
    discountApplied: 25,
    badgeDiscountApplied: badgeDiscount,
  };
}
```

---

## Step 6: Starting Ante

**UI:**
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
│  Note: The creation fee ($5.00) goes to         │
│  operations, NOT into the prize pool.          │
│  Only the starting ante goes into the pool.     │
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

---

## Step 7: Review & Payment

**UI:**
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
│  │  Reward Depth: 10 players                  │  │
│  │  Pool Depth: 3 players                    │  │
│  │  [Show item breakdown]                    │  │
│  └────────────────────────────────────────────┘  │
│                                                 │
│  Starting Ante: $10.00                          │
│                                                 │
│  ┌─ Payment Summary ────────────────────────┐  │
│  │  Tournament Creation Fee: $5.00          │  │
│  │  Starting Ante: $10.00                   │  │
│  │  Reward Cost: $8.08                    │  │
│  │  ─────────────────────────────────────── │  │
│  │  Total: $23.08                            │  │
│  │  (25% base + 25% badge discount)         │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ┌─ Creator Earnings ────────────────────────┐  │
│  │  💰 Boost Until Break-Even!                │  │
│  │                                            │  │
│  │  Break-even with just 10 entries!         │  │
│  │  • 10 entries: $5.00 (50%) ✅            │  │
│  │  • 20 entries: $7.00                      │  │
│  │  • 50 entries: $13.00                     │  │
│  │  • 100 entries: $23.00                    │  │
│  │                                            │  │
│  │  💡 More players = more earnings!        │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  Payment Method: [SUI ▼] [MEWS] [USDC]         │
│                                                 │
│  [← Back] [Pay & Create Tournament]            │
└─────────────────────────────────────────────────┘
```

---

## Step 8: Payment Processing & Creation

**Flow:**
1. User clicks "Pay & Create Tournament"
2. Wallet connection prompt (if not connected)
3. Payment transaction signing
4. Backend validates payment
5. Tournament created on-chain
6. Success confirmation

**Success UI:**
```
┌─────────────────────────────────────────────────┐
│  Tournament Created! ✅                         │
├─────────────────────────────────────────────────┤
│                                                 │
│  Your tournament has been created successfully! │
│                                                 │
│  Tournament ID: #123                            │
│  Name: Weekly High Score #1                    │
│                                                 │
│  Players can now enter and compete!            │
│                                                 │
│  [View Tournament] [Create Another]             │
└─────────────────────────────────────────────────┘
```

---

## Implementation Checklist

- [ ] Create `TournamentRewardConfigurator` component
- [ ] Implement reward depth selector
- [ ] Implement item selection interface
- [ ] Implement pool rewards configuration
- [ ] Integrate badge discount fetching
- [ ] Implement real-time cost calculation
- [ ] Create reward cost display component
- [ ] Add validation for reward configuration
- [ ] Update tournament creation wizard to include Step 5
- [ ] Test with various badge tiers
- [ ] Test cost calculation accuracy
- [ ] Test payment flow integration

---

## Key Features Summary

1. **Two-Path Flow:** Default rewards (no payment) vs Custom rewards (payment required)
2. **Real-Time Cost Calculation:** Updates as user configures rewards
3. **Badge Discount Integration:** Automatically applies user's badge discount
4. **Visual Item Selection:** Easy-to-use interface for selecting items per rank
5. **Pool Rewards Configuration:** Flexible pool reward setup
6. **Payment Integration:** Seamless payment flow with cost breakdown

