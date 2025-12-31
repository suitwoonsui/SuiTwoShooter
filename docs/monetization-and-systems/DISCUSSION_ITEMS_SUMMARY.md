# Discussion Items Summary

## Overview

This document summarizes all items that need team discussion or decision beyond the resolved issues.

---

## 🔴 High Priority - Needs Decision

### 1. Daily Login Rewards Structure ⚠️

**Status:** Needs discussion (comparison document created)

**Issue:** Two different reward structures exist:
- **Strategy Version:** Day 6 = Orb L1 + Force Field L1, Day 7 = Extra Lives L1 + alternating items
- **Merging Plan Version:** Day 6 = Orb L2, Day 7 = Orb L2 + Extra Lives L1, Weekly Bonus = 4 items

**See:** `DAILY_LOGIN_REWARDS_COMPARISON.md` for detailed comparison

**Questions:**
- Which structure should be official?
- Should Day 6 give 2x L1 items or 1x L2 item?
- Should Day 7 have weekly alternation or fixed rewards?
- Should Weekly Bonus be same as Day 7 or more generous?

---

### 2. Tournament Entry Fees - Standardization Needed ⚠️

**Issue:** Entry fees vary across documents:

| Document | Weekly Tournament Entry Fee |
|----------|----------------------------|
| MONETIZATION_STRATEGY.md | $1-5 |
| WEEKLY_TOURNAMENT_IMPLEMENTATION_PLAN.md | $2.50-5 |
| TOURNAMENT_SYSTEM_DESIGN.md | $2.50-5 |

**Questions:**
- What should the official weekly tournament entry fee be? ($2.50-5 seems to be the consensus)
- Are ticket packs still planned? (5 tickets @ 10% discount, 10 @ 15%, 20 @ 20%)
- If ticket packs are planned, how do they work with tournament entry?

**Recommendation:** Standardize on $2.50-5 for weekly tournaments, clarify ticket pack implementation.

---

### 3. Badge Tier Thresholds - Verification Needed ⚠️

**Issue:** Documents specify badge tier thresholds, but need to verify they match actual badge system:

**Documented Thresholds:**
- Standard: 1-4 games
- Common: 5-14 games
- Uncommon: 15-34 games
- Rare: 35-74 games
- Epic: 75-149 games
- Legendary: 150+ games

**Questions:**
- Do these match the actual badge system implementation?
- If not, which is correct - documentation or implementation?
- Are these thresholds final or subject to change?

**Action Required:** Verify against actual badge system code/contract.

---

## 🟡 Medium Priority - Needs Clarification

### 4. Tournament Prize Pool Display Currency

**Issue:** Inconsistent documentation on how prize pools are displayed:

**WEEKLY_TOURNAMENT_IMPLEMENTATION_PLAN.md:**
- Prize pool tracked in USD (cents) on-chain
- Display shows MEWS as primary, USD in parentheses
- States: "Prize pool tracked in USD (cents) - stable reference point"

**TOURNAMENT_SYSTEM_DESIGN.md:**
- Doesn't mention USD tracking or MEWS conversion

**Questions:**
- Should prize pools be displayed primarily in MEWS or USD?
- Is the USD→MEWS conversion for display purposes only?
- Should all tournament documents mention this?

**Recommendation:** Clarify that prize pools are tracked in USD, displayed in MEWS (with USD in parentheses) for token promotion.

---

### 5. Player Stats Modal - Minimum Viable Version

**Issue:** Player Stats Modal depends on Achievement system, but unclear what happens if built first:

**Dependencies:**
- PlayerStats (already exists) ✅
- Achievement system (for milestone progress) ⚠️

**Questions:**
- Can Player Stats Modal be built without Achievement system?
- What's the minimum viable version (just stats, no milestone progress)?
- Should milestone progress be optional or required?

**Recommendation:** Define MVP version that works without Achievement system, then enhance when Achievement system is ready.

---

### 6. Store Modal - Tournament Ticket Purchase Flow

**Issue:** Tournament ticket purchase in Store Modal not fully documented:

**GAME_PASS_AND_PAYWALL_IMPLEMENTATION_PLAN.md:**
- Documents Store Modal tabs (Items, Game Pass, Tickets)
- Shows context-aware visibility

**WEEKLY_TOURNAMENT_IMPLEMENTATION_PLAN.md:**
- Mentions Store Modal integration
- But doesn't fully document ticket purchase flow

**Questions:**
- What does the Tournament Tickets tab look like?
- How are ticket packs displayed?
- What's the purchase flow for tickets?
- How does badge discount apply to tickets?

**Recommendation:** Add detailed ticket purchase flow documentation to tournament implementation plan.

---

## 📋 Documentation Gaps - Need Creation

### 7. System Integration Map

**Gap:** No single document showing how all systems connect.

**Needed:**
- Visual diagram of system connections
- Data flow between systems
- Dependency relationships
- Integration points

**Recommendation:** Create `SYSTEM_INTEGRATION_MAP.md` with diagrams.

---

### 8. Error Handling Guide

**Gap:** Error handling strategies not fully documented.

**Needed:**
- What happens if credit consumption fails after first boss?
- What happens if tournament entry fails after payment?
- What happens if achievement reward distribution fails?
- Refund processes for each scenario

**Recommendation:** Create `ERROR_HANDLING_GUIDE.md` with all error scenarios.

---

### 9. Admin Functions Reference

**Gap:** Admin capabilities scattered across documents.

**Needed:**
- Complete list of all admin functions
- Admin wallet requirements
- Admin capability management
- Admin UI structure

**Recommendation:** Create `ADMIN_FUNCTIONS_REFERENCE.md` consolidating all admin functions.

---

### 10. Achievement Milestones - Single Source of Truth

**Gap:** Achievement milestones referenced but not listed in one place.

**Needed:**
- Complete list of all achievement milestones
- All categories and thresholds
- All rewards per milestone
- Easy reference for implementation

**Recommendation:** Either add complete list to ACHIEVEMENT_REWARD_IMPLEMENTATION_PLAN.md or create `ACHIEVEMENT_MILESTONES_REFERENCE.md`.

---

## 🔍 Verification Needed

### 11. Payment Methods - Complete Documentation

**Gap:** Payment methods mentioned but flow not fully documented.

**Questions:**
- Are SUI, MEWS, and USDC supported for all purchase types?
- How does payment method selection work in UI?
- How are prices converted between tokens?
- Where is price fetching documented?

**Action Required:** Document complete payment flow for all purchase types.

---

### 12. Statistics Tracking - Consolidation

**Gap:** Multiple statistics documents with some overlap.

**Documents:**
- MONETIZATION_STATISTICS_TRACKING_PLAN.md (comprehensive)
- STATISTICS_ANALYSIS_AND_PROPOSALS.md (proposals)
- ITEM_CONSUMPTION_TRACKING_PLAN.md (specific)

**Questions:**
- Are all proposed statistics being tracked?
- Is there overlap that needs consolidation?
- Are there gaps in tracking?

**Action Required:** Review and consolidate statistics tracking plans.

---

## 📊 Priority Summary

### Must Discuss Before Implementation:
1. ✅ Daily Login Rewards Structure
2. ✅ Tournament Entry Fees
3. ✅ Badge Tier Thresholds (verify)

### Should Clarify Soon:
4. Tournament Prize Pool Display
5. Player Stats Modal MVP
6. Store Modal Ticket Flow

### Documentation to Create:
7. System Integration Map
8. Error Handling Guide
9. Admin Functions Reference
10. Achievement Milestones Reference

### Verification Tasks:
11. Payment Methods Documentation
12. Statistics Tracking Consolidation

---

## Next Steps

1. **Team Meeting** - Discuss high priority items (1-3)
2. **Documentation Updates** - Fix inconsistencies based on decisions
3. **Create Missing Docs** - Fill documentation gaps (7-10)
4. **Verification** - Verify badge thresholds and payment flows (11-12)

---

**Status:** Ready for Team Discussion
**Last Updated:** [Current Date]

