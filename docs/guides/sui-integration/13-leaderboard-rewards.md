# Leaderboard Rewards System

## 📦 Phase 9: Leaderboard Rewards System (Post-MVP)

This document covers implementing a weekly rewards system for top leaderboard players.

**Document Number:** 13  
**Status:** Post-MVP  
**Estimated Time:** 12-16 hours (total for all components)  
**Dependencies:** Phase 4.3 (Blockchain Leaderboard), Phase 7.2 (Mainnet Stable)  
**Why Post-MVP:** Rewards system requires funding and adds complexity. Can be added after launch when revenue streams are established.

---

## Overview

The leaderboard rewards system provides weekly prizes for top-performing players, incentivizing competition and engagement.

**Key Features:**
- Weekly leaderboard snapshots
- Tiered reward distribution
- On-chain reward tracking
- Claimable rewards system
- Reward economics and funding

**Reward Structure:**
- Top 10, 25, or 100 players (configurable)
- Tiered rewards (1st place gets most, etc.)
- Weekly cycles (e.g., Sunday 00:00 UTC)
- Claimable via wallet transaction

---

## Implementation Phases

### Phase 9.1: Smart Contract (4-6 hours)

**Contract:** `leaderboard_rewards.move`

**Key Functions:**
- `create_weekly_snapshot()` - Create weekly leaderboard snapshot
- `distribute_rewards()` - Distribute rewards to winners (admin)
- `claim_reward()` - Player claims their reward
- `get_claimable_rewards()` - Get user's claimable rewards

**Note:** Timestamp is already captured in `ScoreSubmitted` events (from Sui Clock), enabling time-based filtering for weekly snapshots without additional contract changes.

**Structs:**
```move
struct WeeklyLeaderboard has store {
    week_id: u64,
    start_timestamp: u64,
    end_timestamp: u64,
    rewards_distributed: bool,
}

struct RewardDistribution has store {
    rank: u64,
    player: address,
    reward_amount: u64,
    claimed: bool,
}
```

---

### Phase 9.2: Weekly Snapshot System (3-4 hours)

**Backend Service:**
- Query top scores for current week (filter by `timestamp` field)
- Calculate reward tiers
- Store snapshot on-chain
- Handle week boundaries

**API Routes:**
- `GET /api/leaderboard/weekly/:weekId` - Get weekly leaderboard (filter by timestamp range)
- `GET /api/leaderboard/weekly?start=YYYY-MM-DD&end=YYYY-MM-DD` - Get custom date range leaderboard
- `POST /api/leaderboard/snapshot` - Create weekly snapshot (admin)
- `GET /api/leaderboard/rewards/:address` - Get user's claimable rewards

**Week Boundaries:**
- Default: Sunday 00:00 UTC
- Configurable start/end times
- Handle timezone considerations
- **Timestamp Filtering:** Use `timestamp` field from `ScoreSubmitted` events to filter scores within date range

**Implementation:**
- Filter `queryEvents()` results by timestamp range
- Example: Get all scores where `timestamp >= weekStart && timestamp <= weekEnd`
- Backend already returns `timestamp` as ISO string, easy to filter

---

### Phase 9.3: Rewards Distribution UI (3-4 hours)

**User UI:**
- Display weekly leaderboard with rewards
- Show claimable rewards for user
- "Claim Reward" button
- Reward history

**Admin UI:**
- Trigger weekly snapshot
- Distribute rewards to winners
- View reward distribution status

**Wallet Integration:**
- Sign transaction to claim reward
- Handle reward distribution
- Transaction confirmation

---

### Phase 9.4: Reward Economics & Funding (2-3 hours)

**Reward Structure:**
- Weekly reward pool size
- Distribution tiers (e.g., 1st: 30%, 2nd: 20%, 3rd: 15%, etc.)
- Minimum reward amounts

**Funding Sources:**
- Premium store revenue
- Game entry fees
- Reserve fund for rewards

**Sustainability:**
- Calculate reward pool based on revenue
- Ensure long-term sustainability
- Adjust tiers based on player count

---

## Reward Distribution Example

**Top 10 Rewards (Example):**
- 1st Place: 30% of pool
- 2nd Place: 20% of pool
- 3rd Place: 15% of pool
- 4th-5th Place: 10% of pool each
- 6th-10th Place: 5% of pool each

**Top 25 Rewards (Example):**
- 1st-3rd: Higher percentages
- 4th-10th: Medium percentages
- 11th-25th: Lower percentages

---

## Implementation Details

### Weekly Snapshot Flow

1. **Week End:**
   - Query top scores from blockchain
   - Calculate reward distribution
   - Create on-chain snapshot

2. **Reward Distribution:**
   - Admin triggers distribution
   - Rewards allocated to winners
   - Stored on-chain

3. **Player Claiming:**
   - Player checks claimable rewards
   - Signs transaction to claim
   - Reward transferred to wallet

### Reward Funding

**Revenue Sources:**
- Premium store purchases
- Game entry fees (if implemented)
- Initial funding pool

**Allocation:**
- Percentage of revenue to reward pool
- Reserve fund for sustainability
- Adjustable based on revenue

---

## Testing

### Test Checklist

- [ ] Weekly snapshot creation works
- [ ] Reward distribution calculates correctly
- [ ] Players can claim rewards
- [ ] Week boundaries handled correctly
- [ ] Multiple weeks tracked properly
- [ ] Admin functions work correctly
- [ ] Reward economics are sustainable

---

## Related Documents

- [11. Blockchain Leaderboard](./11-blockchain-leaderboard.md) - Leaderboard implementation
- [12. Premium Store Design](./12-premium-store-design.md) - Premium Store System (Phase 5.2) - Revenue source
- [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md) - Phase 9 details
- [INTEGRATION_CHECKLIST.md](./INTEGRATION_CHECKLIST.md) - Section 14

---

## Important Notes

- **Post-MVP:** This feature can be added after launch
- **Requires Funding:** Need revenue streams established first
- **Weekly Cycles:** Configurable week start/end times
- **On-Chain:** All rewards tracked on-chain for transparency

---

## Future Enhancements

- Monthly/seasonal rewards
- Special event rewards
- NFT rewards for top players
- Tier-based reward pools
- Community voting on reward distribution

