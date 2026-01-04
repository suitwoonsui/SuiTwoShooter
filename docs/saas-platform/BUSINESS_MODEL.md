# Business Model & Pricing Strategy

## Overview

A Web3-native tournament platform that operates on a pay-per-use model with no free tier or advertisements. Revenue is generated through tournament creation fees and a percentage of entry fees.

## Core Principles

1. **No Free Tier**: All tournament creation requires payment
2. **No Advertisements**: Clean, ad-free experience
3. **Pay-Per-Use**: Users pay only when they create tournaments
4. **Creator Earnings**: Tournament creators earn from participant entries
5. **Platform Revenue**: From creation fees + percentage of entry fees

---

## Revenue Streams

### 1. Tournament Creation Fees

**Current Model:**
- Creation fee: $5.00 USD (500 cents)
- Paid by tournament creator
- Covers platform costs and ensures quality tournaments

**SaaS Model:**
- **Standard Creation Fee**: $5.00 per tournament
- **Bulk Discounts**: 
  - 5 tournaments: $4.50 each ($22.50 total)
  - 10 tournaments: $4.00 each ($40.00 total)
  - 20 tournaments: $3.50 each ($70.00 total)

**Rationale:**
- Ensures only serious creators create tournaments
- Prevents spam/low-quality tournaments
- Covers platform infrastructure costs

---

### 2. Entry Fee Percentage (Platform Fee)

**Platform Fee Structure:**
- **Platform Fee**: 5-10% of total entry fees (explicit fee taken upfront)
- **Creator earns**: 50% until break-even ($5), then 20% of remaining
- **Players receive**: 25% (small tournaments) or 50% (large tournaments) of prize pool
- **Platform Revenue (Remaining)**: Balance after creator and player rewards (also platform profit)

**Important Note:** Both the "Platform Fee" and "Platform Revenue (Remaining)" go to the same wallet/entity - they're both platform profit. The distinction is only for accounting clarity:
- **Platform Fee**: Explicit percentage we take from entry fees (5-10%)
- **Platform Revenue (Remaining)**: What's left after all distributions (also our profit)

**Example Calculation:**
```
Tournament with 50 entries @ $1.00 per entry:
- Total Entry Fees: $50.00
- Platform Fee (7.5%): $3.75 ← Explicit fee, goes to platform
- Creator Reward: $13.00 ($5 boost + $8 at 20%)
- Player Rewards Pool: $25.00 (50% of prize pool)
- Platform Revenue (Remaining): $8.25 ← Also goes to platform (same wallet)
- Total Platform Revenue: $3.75 + $8.25 = $12.00
```

**Variable Platform Fee:**
- **Small tournaments (1-20 entries)**: 5% platform fee
- **Medium tournaments (21-100 entries)**: 7.5% platform fee
- **Large tournaments (101+ entries)**: 10% platform fee

**Rationale:**
- Scales with tournament size
- Lower fee for small tournaments encourages creation
- Higher fee on large tournaments captures more value
- Both platform fee and remaining balance are platform profit (same destination)

---

### 3. Reward Distribution Fees (Future)

**Optional Fee on Reward Distribution:**
- 2-3% fee on reward value when distributed
- Only applies to custom rewards (items, tokens)
- Default rewards (token-only) exempt

**Rationale:**
- Covers cost of reward minting/distribution
- Only charged when value is distributed
- Encourages use of default reward system

---

## Pricing Model Comparison

### Current System (Game-Specific)
- Creation fee: $5.00
- Entry fees: Variable (set by creator)
- Creator reward: 50% until break-even, then 20%
- Platform fee: 0% (internal game)

### SaaS Platform Model
- Creation fee: $5.00 (same)
- Entry fees: Variable (set by creator)
- Creator reward: 50% until break-even, then 20% (same)
- **Platform fee: 5-10% of entry fees** (NEW)
- API access: Free (with authentication)

---

## Unit Economics

### Cost Structure (Per Tournament)

**Fixed Costs:**
- Smart contract gas: ~$0.10-0.50 (one-time creation)
- Database storage: ~$0.01-0.05 per tournament
- API infrastructure: ~$0.10-0.50 per tournament (scaled)

**Variable Costs:**
- Reward distribution gas: ~$0.05-0.20 per reward
- Leaderboard updates: ~$0.01-0.05 per update
- API calls: ~$0.001 per call

**Total Cost per Tournament:**
- Small (1-20 entries): ~$0.50-1.00
- Medium (21-100 entries): ~$1.00-2.00
- Large (101+ entries): ~$2.00-5.00

### Revenue per Tournament

**Small Tournament (10 entries @ $1.00):**
- Creation fee: $5.00
- Entry fees: $10.00
- Platform fee (5%): $0.50
- Platform revenue (remaining): $2.50
- **Total Platform Revenue: $5.00 + $0.50 + $2.50 = $8.00**
- **Profit: $7.00-7.50** (after costs)

**Medium Tournament (50 entries @ $1.00):**
- Creation fee: $5.00
- Entry fees: $50.00
- Platform fee (7.5%): $3.75
- Platform revenue (remaining): $8.25
- **Total Platform Revenue: $5.00 + $3.75 + $8.25 = $17.00**
- **Profit: $15.00-16.00** (after costs)

**Large Tournament (200 entries @ $1.00):**
- Creation fee: $5.00
- Entry fees: $200.00
- Platform fee (10%): $20.00
- Platform revenue (remaining): $27.00
- **Total Platform Revenue: $5.00 + $20.00 + $27.00 = $52.00**
- **Profit: $47.00-50.00** (after costs)

---

## Break-Even Analysis

### For Tournament Creators

**Break-Even Point:**
- Creation fee: $5.00
- Break-even: 10 entries @ $1.00 = $10.00 entry fees
- Creator reward: $5.00 (50% of $10.00)
- **Net: $0.00** (breaks even)

**Profitability:**
- 20 entries: $7.00 creator reward = $2.00 profit
- 50 entries: $13.00 creator reward = $8.00 profit
- 100 entries: $23.00 creator reward = $18.00 profit

### For Platform

**Break-Even Point:**
- Need ~100-200 tournaments/month to cover infrastructure
- At 100 tournaments/month (avg 20 entries each):
  - Creation fees: $500.00
  - Platform fees: ~$150.00 (7.5% of $2,000 entry fees)
  - **Total Revenue: $650.00/month**
  - **Infrastructure costs: ~$200-400/month**
  - **Profit: $250-450/month**

**Scale Targets:**
- 500 tournaments/month: $3,250 revenue, $1,000-1,500 costs = $1,750-2,250 profit
- 1,000 tournaments/month: $6,500 revenue, $2,000-3,000 costs = $3,500-4,500 profit
- 5,000 tournaments/month: $32,500 revenue, $10,000-15,000 costs = $17,500-22,500 profit

---

## Pricing Tiers (Future Consideration)

### Current: Single Tier (Pay-Per-Use)
- All users pay same creation fee
- All users pay same platform fee percentage
- No subscription required

### Future: Optional Pro Tier
**Pro Creator ($29/month):**
- Reduced creation fee: $3.50 per tournament (30% discount)
- Lower platform fee: 4-8% (vs 5-10%)
- Priority support
- Advanced analytics
- API rate limit increase
- Custom branding options

**Rationale:**
- Rewards power users
- Predictable revenue from subscriptions
- Still maintains pay-per-use for casual users

---

## Revenue Projections

### Conservative Scenario (Year 1)
- Month 1-3: 50 tournaments/month
- Month 4-6: 100 tournaments/month
- Month 7-9: 200 tournaments/month
- Month 10-12: 400 tournaments/month

**Annual Revenue (all goes to same platform wallet):**
- Creation fees: $24,000 (avg 200/month × $5 × 12)
- Platform fees (explicit %): $7,200 (avg $600/month × 12)
- Platform revenue (remaining balance): ~$15,840 (estimated after creator/player distributions)
- **Total Platform Revenue: $47,040/year**

### Moderate Scenario (Year 1)
- Month 1-3: 100 tournaments/month
- Month 4-6: 250 tournaments/month
- Month 7-9: 500 tournaments/month
- Month 10-12: 1,000 tournaments/month

**Annual Revenue (all goes to same platform wallet):**
- Creation fees: $52,500 (avg 437/month × $5 × 12)
- Platform fees (explicit %): $19,800 (avg $1,650/month × 12)
- Platform revenue (remaining balance): ~$34,650 (estimated after creator/player distributions)
- **Total Platform Revenue: $106,950/year**

### Aggressive Scenario (Year 1)
- Month 1-3: 200 tournaments/month
- Month 4-6: 500 tournaments/month
- Month 7-9: 1,000 tournaments/month
- Month 10-12: 2,000 tournaments/month

**Annual Revenue (all goes to same platform wallet):**
- Creation fees: $101,250 (avg 843/month × $5 × 12)
- Platform fees (explicit %): $40,500 (avg $3,375/month × 12)
- Platform revenue (remaining balance): ~$70,875 (estimated after creator/player distributions)
- **Total Platform Revenue: $212,625/year**

---

## Key Metrics to Track

1. **Tournaments Created per Month**
2. **Average Entries per Tournament**
3. **Average Entry Fee**
4. **Platform Fee Revenue** (explicit 5-10% fee)
5. **Platform Revenue (Remaining)** (balance after distributions)
6. **Total Platform Revenue** (creation fees + platform fees + remaining)
7. **Creation Fee Revenue**
8. **Creator Earnings (total)**
9. **Player Rewards Distributed**
10. **API Usage (calls/month)**
11. **Active Creators**
12. **Repeat Creator Rate**

**Note:** All platform revenue (creation fees, platform fees, and remaining balance) goes to the same wallet/entity. The distinction is for accounting clarity only.

---

## Risk Factors

1. **Low Tournament Volume**: If creators don't create tournaments, no revenue
   - **Mitigation**: Strong creator incentives, marketing, easy creation flow

2. **High Infrastructure Costs**: If costs exceed revenue
   - **Mitigation**: Optimize smart contracts, use efficient infrastructure, scale gradually

3. **Competition**: Other platforms offer free tiers
   - **Mitigation**: Focus on Web3/blockchain differentiation, superior creator earnings

4. **Creator Churn**: Creators stop creating tournaments
   - **Mitigation**: Improve creator experience, better analytics, community building

---

## Next Steps

1. Validate pricing with beta users
2. Build revenue tracking dashboard
3. Implement platform fee collection
4. Create financial projections spreadsheet
5. Develop pricing page/marketing materials
