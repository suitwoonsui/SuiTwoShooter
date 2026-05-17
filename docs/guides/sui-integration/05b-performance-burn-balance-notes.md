# Performance-Based Burn System: Balance & Design Notes

## 🎯 Overview

This document captures design decisions, balance considerations, and potential improvements for the performance-based token burning system.

---

## 📊 Current Burn Rates (Recommended)

| Metric | Rate | Notes |
|--------|------|-------|
| **Enemies** | 1 $Mews/enemy | Rewards consistent combat |
| **Bosses (Tier 1)** | 100 $Mews/boss | Base tier reward |
| **Bosses (Tier 2)** | 150 $Mews/boss | 1.5x multiplier |
| **Bosses (Tier 3)** | 200 $Mews/boss | 2x multiplier |
| **Bosses (Tier 4)** | 250 $Mews/boss | 2.5x multiplier |
| **Distance** | 10 $Mews per 100 units | Milestone-based |
| **Coins (Burn)** | 0.1 $Mews/coin | Burned from supply |
| **Coins (Kickback)** | 0.05 $Mews/coin | Reward from treasury |
| **Score Bonus** | 10 $Mews per 1000 pts | Overall excellence |

---

## ⚖️ Balance Considerations

### **1. Minimum Burn Threshold (50 $Mews)**

**Why:** Prevents "dust burns" from very short games or poor performance sessions.

**Impact:**
- Very short games (< 30 enemies, no bosses) won't trigger burns
- Encourages players to play longer/better to qualify
- Reduces gas costs from tiny burn transactions

**Alternative:** Lower to 25 $Mews for more inclusive burning

---

### **2. Maximum Burn Cap (2000 $Mews)**

**Why:** Prevents exploitation if someone finds a way to game the system.

**Impact:**
- Caps single-game burn at 2000 $Mews
- Protects token supply from potential abuse
- Very skilled players still get significant burns

**Alternative:** Remove cap, but add stronger anti-cheat validation

---

### **3. Coin System: Burn vs Kickback**

**Burn Mode (0.1 $Mews/coin):**
- ✅ More deflationary pressure
- ✅ Higher total burn amounts
- ✅ Players contribute more to scarcity
- ❌ Players lose tokens instead of gaining

**Kickback Mode (0.05 $Mews/coin):**
- ✅ Players receive rewards for skill
- ✅ Positive reinforcement for coin collection
- ✅ Could incentivize coin farming (mitigate with cap)
- ❌ Less deflationary (payments from treasury)

**Recommendation:** 
- Default to **burn mode** for maximum deflationary impact
- Allow players to switch to **kickback mode** if they prefer rewards
- Monitor player behavior and adjust rates if needed

---

### **4. Tier-Based Boss Rewards**

**Current:** Flat 100 $Mews per boss

**Improved:** Tier-based rewards
- Tier 1 Boss: 100 $Mews
- Tier 2 Boss: 150 $Mews
- Tier 3 Boss: 200 $Mews
- Tier 4 Boss: 250 $Mews

**Rationale:**
- Higher tiers = more difficulty = more skill = higher reward
- Encourages players to progress through tiers
- Rewards long-term gameplay

---

## 🔍 Potential Issues & Solutions

### **Issue 1: Coin Farming Exploitation**

**Risk:** Players focus only on collecting coins if kickback > burn cost

**Mitigation:**
- Keep kickback rate lower than burn rate (0.05 vs 0.1)
- Cap coin-based rewards at reasonable level
- Ensure coins spawn at balanced rate (not exploitable)

---

### **Issue 2: Burn Rate Inflation**

**Risk:** If token price increases, burn rates might become too expensive

**Solution:**
- Make rates adjustable via admin function
- Use oracle to adjust rates based on token price
- Cap rates to prevent excessive burning

---

### **Issue 3: Dust Burn Transactions**

**Risk:** Very small burns (< 10 $Mews) might cost more in gas than value

**Mitigation:**
- Minimum burn threshold (50 $Mews)
- Batch small burns (future enhancement)
- Only burn on score submission (not mid-game)

---

### **Issue 4: Tier Progression Gaming**

**Risk:** Players might try to game tier progression to get higher burn rewards

**Mitigation:**
- Tier progression tied to boss defeats (can't fake)
- Backend validates tier matches boss count
- Anti-cheat measures in smart contract

---

## 🚀 Future Enhancements

1. **Progressive Burn Rates:**
   - First 50 enemies = 1 $Mews each
   - Next 50 enemies = 1.5 $Mews each
   - Rewards endurance and long sessions

2. **Weekly/Monthly Burn Leaderboards:**
   - Top burners get special recognition
   - Creates competitive incentive

3. **Special Event Multipliers:**
   - 2x burn weekends
   - Community challenge bonuses
   - Seasonal events

4. **Dynamic Rate Adjustment:**
   - Auto-adjust rates based on token price
   - Market-responsive burning
   - Maintain target burn velocity

5. **Combo Bonuses:**
   - Bonus for defeating bosses without dying
   - Bonus for perfect coin collection runs
   - Bonus for reaching distance milestones

---

## 📈 Expected Burn Rates

**Average Player (30 min session):**
- 40 enemies × 1 = 40 $Mews
- 1.5 bosses × 125 avg = 187 $Mews
- 400 distance ÷ 100 × 10 = 40 $Mews
- 25 coins × 0.1 = 2.5 $Mews (burn) or 1.25 $Mews (kickback)
- 4000 score ÷ 1000 × 10 = 40 $Mews
- **Total: ~310 $Mews**

**Skilled Player (60 min session):**
- 100 enemies × 1 = 100 $Mews
- 4 bosses × 175 avg = 700 $Mews
- 1000 distance ÷ 100 × 10 = 100 $Mews
- 60 coins × 0.1 = 6 $Mews (burn)
- 15000 score ÷ 1000 × 10 = 150 $Mews
- **Total: ~1056 $Mews**

**Daily Projection (100 players):**
- Average: 310 $Mews × 100 = 31,000 $Mews/day
- Monthly: ~930,000 $Mews/month burned
- **Significant deflationary pressure!**

---

## ✅ Implementation Checklist

- [x] Define burn rates
- [x] Add balance controls (min/max caps)
- [x] Implement tier-based boss rewards
- [x] Coin burn/kickback choice
- [ ] Track enemies defeated (need to add to game)
- [ ] Integrate with game events
- [ ] Frontend calculator
- [ ] Backend verification
- [ ] Balance testing
- [ ] Adjust rates based on data

---

## 💡 Design Philosophy

**Goal:** Create a system that:
1. **Rewards skill** - Better players naturally burn more
2. **Is fair** - Everyone burns based on actual performance
3. **Is transparent** - Players see exactly how burn is calculated
4. **Creates deflation** - Meaningful token supply reduction
5. **Is engaging** - Players want to perform better
6. **Is sustainable** - Balance prevents abuse and maintains economics

---

**Related Documents:**
- [Gas Fees & Payments](./05a-gas-fees-and-payments.md) - Main payment document
- [Smart Contracts](./05-smart-contracts.md) - Burn contract implementation

