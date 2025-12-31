# Decisions Summary - Monetization Systems

## Overview

This document summarizes all decisions made during the documentation review and clarification process.

**Date:** [Current Date]  
**Status:** ✅ All Critical Decisions Resolved

---

## ✅ Resolved Decisions

### 1. Daily Login Rewards Structure ✅

**Decision:** Use Strategy version (Day 6 and Day 7 with two items, Day 7 switching between items)

**Structure:**
- **Day 1:** 1x Orb Level (Level 1)
- **Day 2:** 1x Force Field (Level 1)
- **Day 3:** 1x Extra Lives (Level 1)
- **Day 4:** 1x Slow Time (Level 1)
- **Day 5:** 1x Coin Tractor Beam (Level 1)
- **Day 6:** 1x Orb Level (Level 1) + 1x Force Field (Level 1) ✅
- **Day 7:** 1x Extra Lives (Level 1) + 1x Slow Time (Level 1) **OR** 1x Coin Tractor Beam (Level 1) - alternates weekly ✅
- **Weekly Bonus (7 Days):** Same as Day 7 reward
- **Monthly (30 Days):** 1x Extra Lives (Level 3) + 1x Force Field (Level 3) + 1x Orb Level (Level 2) + 1x Slow Time (Level 2) + 1x Coin Tractor Beam (Level 2)

**Action Taken:**
- Updated `ITEM_MERGING_UPGRADE_SYSTEM_PLAN.md` to match Strategy version
- All documents now consistent

---

### 2. Tournament Entry Fees ✅

**Decision:** Tickets will be $1 to start

**Details:**
- **Entry Fee:** $1 per tournament (or equivalent in SUI/$MEWS)
- **Starting Point:** $1 (may increase for special events in the future)
- **Ticket Bundles:** Players can purchase single tickets or bundles with bulk discounts
  - Single ticket: $1
  - Bundle options: 5 tickets, 10 tickets, 20 tickets
  - Discount structure: Similar to credit packs (10-20% based on bundle size)
- **Badge Discounts:** 0-20% based on badge tier (applied to ticket purchases)

**Action Taken:**
- Updated `WEEKLY_TOURNAMENT_IMPLEMENTATION_PLAN.md` (changed from $2.50-5 to $1)
- Updated `MONETIZATION_STRATEGY.md` (clarified $1 starting point, added bundle details)
- Added ticket bundle purchase flow documentation

---

### 3. Badge Tier Thresholds ✅

**Decision:** Thresholds are correct and already updated in Move contract (not yet deployed)

**Thresholds:**
- Standard: 1-4 games
- Common: 5-14 games
- Uncommon: 15-34 games
- Rare: 35-74 games
- Epic: 75-149 games
- Legendary: 150+ games

**Status:**
- ✅ Move contract already updated with these thresholds
- ⏳ Waiting to deploy until remaining contracts are built
- ✅ Documentation matches contract (no changes needed)

---

### 4. Tournament Prize Pool Display ✅

**Decision:** Tracked in USD, but displayed as $MEWS (USD)

**Details:**
- **On-Chain Storage:** Prize pool tracked in USD (cents) for stability
- **Display Format:** $MEWS with USD in parentheses
  - Example: "1,000 $MEWS ($1,000)"
- **Rationale:** Promotes token while showing stable USD value

**Action Taken:**
- Updated comments in `WEEKLY_TOURNAMENT_IMPLEMENTATION_PLAN.md` to clarify tracking vs. display
- Display format already correct in code examples

---

### 5. Player Stats Modal Implementation ✅

**Decision:** Can be built without Achievement system, but will include Achievement system (only one phase later)

**Details:**
- **Phase 2 Option:** Build MVP version with just stats (no milestone progress) - works without Achievement system
- **Phase 3 Option:** Build full version with milestone progress tracking - integrates with Achievement Rewards system
- **Recommended:** Build in Phase 3 to include complete milestone progress from the start

**Action Taken:**
- Updated `PLAYER_STATS_MODAL_IMPLEMENTATION_PLAN.md` to clarify both options
- Documented that it can be built without Achievement system, but recommended to wait for Phase 3

---

### 6. Tournament Ticket Purchase Flow ✅

**Decision:** Ticket purchase flow is the same as other purchases (Items, Game Pass)

**Details:**
- **Purchase Options:**
  - Single ticket: $1
  - Ticket bundles: 5, 10, 20 tickets with bulk discounts
  - Discount structure: Similar to credit packs (10-20% based on bundle size)
- **Badge Discounts:** Applied to all ticket purchases (0-20% based on tier)
- **Payment Methods:** SUI, $MEWS, USDC (same as other purchases)
- **Store Modal:** Uses same unified Store Modal with Tickets tab

**Action Taken:**
- Added detailed ticket bundle information to `WEEKLY_TOURNAMENT_IMPLEMENTATION_PLAN.md`
- Updated `GAME_PASS_AND_PAYWALL_IMPLEMENTATION_PLAN.md` with ticket bundle structure
- Documented that purchase flow matches other store purchases

---

## 📋 Previously Resolved (From Earlier Discussion)

### 7. Credit Consumption Timing ✅

**Decision:** Two scenarios, both correct:
- **Demo Mode:** Play demo free, consume credit only if continuing after first boss
- **Full Game Mode:** Consume credit at game start

**Status:** ✅ Already documented correctly

---

### 8. Item Merge Ratios ✅

**Decision:** 
- Standard: 3x Level 1 → 1x Level 2, 3x Level 2 → 1x Level 3
- Direct: 9x Level 1 → 1x Level 3 (not 5x)

**Action Taken:** ✅ Updated `MONETIZATION_STRATEGY.md`

---

### 9. Item Merge Fees ✅

**Decision:**
- Level 1 → Level 2: $0.25
- Level 2 → Level 3: $0.50
- Level 1 → Level 3 (direct): $0.60

**Action Taken:** ✅ Updated `MONETIZATION_STRATEGY.md`

---

## 📊 Summary

### Documents Updated:
1. ✅ `ITEM_MERGING_UPGRADE_SYSTEM_PLAN.md` - Daily login rewards
2. ✅ `WEEKLY_TOURNAMENT_IMPLEMENTATION_PLAN.md` - Entry fees, prize pool display, ticket bundles
3. ✅ `MONETIZATION_STRATEGY.md` - Entry fees, ticket bundles
4. ✅ `GAME_PASS_AND_PAYWALL_IMPLEMENTATION_PLAN.md` - Ticket bundle structure
5. ✅ `PLAYER_STATS_MODAL_IMPLEMENTATION_PLAN.md` - Implementation options

### Documents Verified (No Changes Needed):
- ✅ Badge tier thresholds - Match contract (already updated)
- ✅ Credit consumption timing - Already correct
- ✅ Item merge ratios - Already correct in implementation plan
- ✅ Item merge fees - Already correct in implementation plan

---

## 🎯 Next Steps

1. ✅ **All Critical Decisions Resolved** - Documentation is now consistent
2. ⏳ **Contract Deployment** - Wait for remaining contracts before deploying badge thresholds
3. 📝 **Implementation** - Proceed with implementation using updated documentation

---

**Status:** ✅ Complete - All decisions documented and applied  
**Last Updated:** [Current Date]

