# Gas Fees & Transaction Payments

## 💰 Overview

This document explains how gas fees work for submitting game scores to the Sui blockchain, including who pays, when payment occurs, and cost considerations.

---

## 🔍 Key Questions Answered

### **When Does Payment Happen?**

**Answer: User pays gas fees at game end when submitting score to blockchain**

- ✅ **NOT when starting the game** - Game play is free (no blockchain transaction)
- ✅ **At game end** - When user submits score via wallet signature
- ✅ **Only if they submit** - Optional to submit (can skip if they don't want to pay)

**Flow:**
```
Start Game (FREE) 
  → Play Game (FREE)
    → Game Over (FREE)
      → Submit Score? (PAY GAS FEE HERE)
```

### **Who Pays?**

**Answer: The user's wallet pays gas fees**

- The wallet that **signs the transaction** pays the gas fee
- Since the user signs with their wallet, they pay
- Gas is paid in **SUI tokens** (not $Mews)
- User must have SUI in their wallet for gas (separate from $Mews requirement)

---

## 💵 Gas Fee Costs

### **Sui Gas Fees (Very Low!)**

Sui blockchain has extremely low transaction costs:

| Network | Estimated Cost Per Transaction |
|---------|-------------------------------|
| **Testnet** | ~0.001 SUI (~$0.0001) |
| **Mainnet** | ~0.001-0.01 SUI (~$0.001-0.01) |

**For comparison:**
- Ethereum: ~$2-50 per transaction
- Sui: ~$0.001-0.01 per transaction (**1000x cheaper!**)

### **What Affects Gas Cost?**

1. **Transaction complexity** - Our score submission is simple (one Move call)
2. **Network congestion** - Usually minimal on Sui
3. **Gas price** - Set by network (typically very low)
4. **Gas budget** - We set `10000000` MIST (0.01 SUI max)

**Our transaction is very simple:**
- One Move function call
- Create one object (`GameSession`)
- Emit one event
- **Estimated cost: ~0.001 SUI** (about $0.001)

---

## ⚠️ Important: Gas Fees MUST Be Paid in SUI

**Key Point:** The Sui blockchain **requires gas fees to be paid in SUI** (the native token). This is non-negotiable - Sui doesn't accept other tokens for gas.

**But we can give users flexibility in how they "pay" for the service:**
- User pays SUI → We use it for gas (and optionally convert excess to $Mews)
- User pays $Mews → We convert value → Pay SUI gas on their behalf
- User chooses which token to use

---

## 🔄 Payment Flow Options

### **Option 1: Flexible Payment + Subscription + Token Burning (Recommended)**

**How it works (Three Payment Models):**

**Model A: Pay-Per-Game ($0.01 per game)**
- **Option A1:** User pays in SUI → Backend uses SUI for gas → Auto-convert excess to $Mews
- **Option A2:** User pays in $Mews → Backend converts value → Pays SUI gas
- User pays: $0.01 per score submission
- Best for: Casual players (<100 games/month)

**Model B: Monthly Subscription ($10/month unlimited) - NEW!**
- User pays: $10/month upfront (one-time monthly payment)
- **Unlimited score submissions** - No per-game fee
- Backend covers gas costs from subscription revenue
- **Break-even:** ~1000 games/month
- Best for: Frequent players (100+ games/month)

**Model C: Performance-Based Token Burning (Optional Add-On) - NEW!**
- 🔥 Works with both pay-per-game and subscription
- **Dynamic burning based on gameplay performance** (not static amounts)
- **Enemies defeated** → Burn amount per enemy
- **Bosses defeated** → Higher burn amount per boss
- **Distance traveled** → Burn amount per distance milestone
- **Coins collected** → Option to burn OR receive kickback
- Users get recognition (badges, leaderboard highlights)
- **Rewards skill and performance** (better gameplay = more burning)
- Creates deflationary pressure for all token holders

**User chooses:** Payment model + payment method (SUI/$Mews) + optional burn amount
Backend always pays actual SUI gas (required by blockchain)

**Performance-Based Token Burning System:**

Instead of static manual burning, burning is tied to gameplay performance:

**Dynamic Burn Mechanics (Recommended Rates):**

1. **Enemies Defeated** → 1 $Mews per enemy
   - *Rationale:* Rewards consistent combat, not too high to prevent abuse
   - *Balance:* Average game = 30-50 enemies = 30-50 $Mews

2. **Bosses Defeated** → 100 $Mews per boss
   - *Rationale:* Bosses are major skill checks, deserve highest burn rate
   - *Balance:* Average game = 1-2 bosses = 100-200 $Mews (largest component)

3. **Distance Traveled** → 10 $Mews per 100 units (milestone-based)
   - *Rationale:* Rewards persistence and survival
   - *Alternative:* 0.1 $Mews per unit (linear) OR milestone (more predictable)
   - *Balance:* Average game = 300-500 units = 30-50 $Mews

4. **Coins Collected** → **USER CHOICE:**
   - **Option A: Burn Mode** → 0.1 $Mews per coin burned
     - *Pros:* More deflationary pressure, higher total burn
     - *Best for:* Players who want maximum token scarcity impact
   - **Option B: Kickback Mode** → 0.05 $Mews per coin as reward
     - *Pros:* Players get rewarded for coin collection skill
     - *Best for:* Players who want to accumulate tokens
   - *Balance:* Average game = 20-30 coins = 2-3 $Mews (burn) or 1-1.5 $Mews (kickback)

5. **Score-Based Bonus** → 10 $Mews per 1000 points
   - *Rationale:* Rewards overall excellence (combines all aspects)
   - *Balance:* Average game = 3000-5000 points = 30-50 $Mews bonus

**Suggested Improvements:**
- ✅ **Tier-based boss rewards:** Tier 1 boss = 100, Tier 2 = 150, Tier 3 = 200, Tier 4 = 250 $Mews
- ✅ **Distance milestones:** More predictable (every 100 units vs. linear)
- ✅ **Coin kickback option:** Give players choice (burn or reward)
- ✅ **Minimum burn threshold:** Only burn if total > 50 $Mews (prevent dust burns)
- ✅ **Maximum burn cap:** Cap at 2000 $Mews per game (prevent exploitation)
- ✅ **Skill multiplier:** Bonus multiplier for tier progression (e.g., 1.2x at tier 4)

**Benefits:**
- ✅ **Rewards skill** - Better players burn more (performance-based)
- ✅ **Automatic** - No manual decision, burns based on gameplay
- ✅ **Engaging** - Players want to perform better to burn more
- ✅ **Fair** - Everyone burns based on their actual performance
- ✅ **Deflationary** - Better gameplay = more tokens burned = higher scarcity
- ✅ **Tier progression** - Higher tiers get skill multiplier bonuses
- ✅ **Player choice** - Coins can be burned OR rewarded (kickback)
- ✅ **Balanced** - Minimum threshold prevents dust, maximum cap prevents abuse
- ✅ **Transparent** - Players see exactly how burn is calculated

## ✅ **Current Design Review - What Works Well:**

1. **✅ Tier-Based Boss Rewards** - Implemented! (100/150/200/250 per tier)
2. **✅ Skill Multipliers** - Implemented! (+10%/20%/30% for tier progression)
3. **✅ Balance Controls** - Min threshold (50) and max cap (2000) prevent abuse
4. **✅ Coin Flexibility** - Player choice (burn or kickback) is good
5. **✅ Transparent Calculation** - Players see breakdown, builds trust

## 🔧 **Potential Improvements & Considerations:**

### **1. Enemies Defeated Tracking**
**Current Issue:** Game doesn't currently track `enemiesDefeated` counter
**Solution:** Add counter when enemies are destroyed (already documented in integration code)

### **2. Coin Kickback Economics - IMPORTANT**
**Current Design:** Kickback = 0.05 $Mews per coin (half of burn rate)
**Question:** Should kickback be:
- **Option A:** Paid from game treasury (reduces treasury, not supply) ✅ **Recommended**
- **Option B:** Reduces burn amount (less deflationary)

**Recommendation:** Option A - Kickback from treasury ensures burning still reduces supply even if players choose kickback mode.

### **3. Boss Tier Tracking**
**Current:** Uses `currentTier` for all bosses (simplified)
**Better:** Track each boss's actual tier when defeated
- Tier 1 boss (defeated at tier 1) = 100 $Mews
- Tier 2 boss (defeated at tier 2) = 150 $Mews
- More accurate but requires tracking `bossTiers[]` array

### **4. Progressive Enemy Rates (Future Enhancement)**
**Idea:** Reward endurance
- First 50 enemies = 1 $Mews each
- Next 50 enemies = 1.5 $Mews each
- 100+ enemies = 2 $Mews each
**Consideration:** Might incentivize farming - keep current flat rate for MVP

### **5. Distance Calculation Clarification**
**Current:** Milestone-based (10 $Mews per 100 units)
**Question:** Is `game.distance` already in units or needs conversion?
- If `game.distance` increments by ~3.5 per frame → milestone approach is correct
- If `game.distance` is already aggregated → might need adjustment

### **6. Score Bonus Rate**
**Current:** 10 $Mews per 1000 points
**Consideration:** 
- Average score: 3000-5000 = 30-50 $Mews (reasonable)
- High score: 15000+ = 150+ $Mews (significant)
- **Verdict:** Rate seems balanced ✅

### **7. Minimum Threshold (50 $Mews)**
**Purpose:** Prevent dust burns
**Consideration:**
- Very short games (< 2 min) won't burn
- Might be too high for casual players
- **Alternative:** Lower to 25 $Mews for more inclusivity

### **8. Subscription + Performance Burn**
**Question:** Should subscription cover performance burn tokens too?
**Options:**
- **A:** User provides tokens for burn even with subscription (user still burns)
- **B:** Subscription covers burn (backend burns from treasury) - premium feature
- **Recommendation:** Option A for MVP (simpler), Option B as premium upgrade

### **9. Burn Rate Adjustability**
**Consideration:** Should rates be:
- **Fixed:** Hardcoded in contract (simple, predictable)
- **Adjustable:** Admin can update rates (flexible, requires governance)

**Recommendation:** Start fixed, add adjustability later if needed

---

## 🎯 **Final Recommendations:**

**What to Keep:**
- ✅ Tier-based boss rewards (100/150/200/250)
- ✅ Skill multipliers (+10%/20%/30%)
- ✅ Coin burn/kickback choice
- ✅ Min/max thresholds
- ✅ Transparent breakdown

**What to Adjust:**
- ⚠️ **Track each boss's tier individually** (more accurate than using currentTier)
- ⚠️ **Clarify coin kickback source** (treasury vs. burn reduction)
- ⚠️ **Add enemies defeated counter** (currently not tracked)
- ⚠️ **Verify distance units** (ensure milestone calculation is correct)
- ⚠️ **Consider lower minimum threshold** (25 vs. 50 $Mews)

**What to Add Later:**
- 🔮 Progressive enemy rates (after MVP)
- 🔮 Weekly burn leaderboards
- 🔮 Event multipliers
- 🔮 Dynamic rate adjustment

---

**Overall Assessment:** The system is **well-designed** and makes sense! The improvements above are refinements, not fundamental issues. The core design is solid. ✅

**Example Game Session (Average Player):**
- 30-50 enemies defeated = 30-50 $Mews burned
- 1-2 bosses defeated = 100-200 $Mews burned
- 300-500 distance traveled = 30-50 $Mews burned (per 100 units)
- 20-30 coins collected = 2-3 $Mews burned (if burning) OR 2-3 $Mews kickback (if rewarded)
- 3000-5000 score = 30-50 $Mews bonus
- **Total burned:** 182-353 $Mews automatically from gameplay

**Example Game Session (Skilled Player):**
- 80-100 enemies defeated = 80-100 $Mews burned
- 3-4 bosses defeated = 300-400 $Mews burned
- 800-1000 distance traveled = 80-100 $Mews burned
- 50-70 coins collected = 5-7 $Mews burned OR kickback
- 10000+ score = 100+ $Mews bonus
- **Total burned:** 565-707+ $Mews automatically from gameplay

**Balance Considerations:**
- Bosses give highest burn (most skill required)
- Distance rewards persistence
- Enemies reward consistent performance
- Coins reward collection skill (player choice: burn or reward)
- Score bonus rewards overall excellence

**Flow (User Pays SUI - $0.01):**
1. User submits score → Chooses "Pay in SUI" + Optional burn amount
2. User transfers SUI (0.01 SUI = ~$0.01) → Paid in SUI
3. Backend uses ~0.001 SUI for gas (10% of payment)
4. Backend converts remaining ~0.009 SUI → $Mews (~4500 $Mews, via DEX or manual)
5. **If burn selected:** Backend burns specified amount of $Mews (or converts SUI → $Mews → burns)
6. Score submitted, $Mews added to game treasury (minus burned amount) ✅

**Flow (User Pays $Mews - $0.01 equivalent + Performance-Based Burning):**
1. User plays game → **Performance automatically calculates burn amount**
   - Enemies defeated: 50 × 1 $Mews = 50 $Mews to burn
   - Bosses defeated: 2 × 100 $Mews = 200 $Mews to burn
   - Distance: 500 units × 0.1 $Mews = 50 $Mews to burn
   - Coins (if burning): 30 × 0.1 $Mews = 3 $Mews to burn
   - **Total calculated burn: 303 $Mews**
2. User submits score → Chooses "Pay in $Mews" + Performance burn calculated
3. User transfers $Mews (4500 $Mews base + 303 $Mews performance burn) → Paid in $Mews
4. Backend uses its own SUI wallet to pay gas (~0.001 SUI)
5. Backend receives $Mews → **Burns performance-based amount** (303 $Mews from gameplay)
6. Remaining $Mews goes to game treasury (4500 $Mews)
7. Score submitted, **performance-based tokens burned automatically** ✅

**Flow (Performance-Based Burning with Pay-Per-Game):**
1. User plays game → **Game tracks performance metrics**
   - Enemies defeated: 50
   - Bosses defeated: 2
   - Distance: 500 units
   - Coins: 30 collected
   - Score: 5000 points
2. **Automatic burn calculation:**
   - Enemies: 50 × 1 = 50 $Mews
   - Bosses: 2 × 100 = 200 $Mews
   - Distance: 500 ÷ 10 = 50 $Mews
   - Score bonus: 5000 ÷ 1000 × 10 = 50 $Mews
   - **Total: 350 $Mews to burn**
3. User submits score → Sees "Performance Burn: 350 $Mews"
4. User pays: 4500 $Mews (base) + 350 $Mews (performance burn) = 4850 $Mews total
5. Backend burns: 350 $Mews (from performance)
6. User gets: Recognition based on burn amount (tier badges)
7. Score submitted, **performance rewarded with burning** 🔥

**Flow (Performance-Based Burning with Subscription):**
1. User has active subscription → Plays game
2. **Performance calculated automatically** → 350 $Mews burn amount
3. User submits score → **No payment needed** (subscription covers base)
4. Backend burns: 350 $Mews (from performance, user provides tokens)
5. OR: Backend covers burn from subscription revenue (premium feature)
6. Score submitted, performance-based burning applies even with subscription 🔥

**Technical Details:**
- Gas fees **must** be paid in SUI (blockchain requirement)
- Users can pay in either token (better UX)
- If user pays SUI → We use some for gas, convert rest to $Mews
- If user pays $Mews → We receive $Mews, use our SUI for gas

**Pros:**
- ✅ **User choice** - Pay in whatever token they have
- ✅ Users with SUI can use it directly (no conversion needed)
- ✅ Users with only $Mews can still submit
- ✅ Auto-conversion option (SUI → $Mews) adds value
- ✅ **Token burning creates deflationary pressure** (reduces supply)
- ✅ **Incentivizes users to pay more** (burn = community benefit)
- ✅ **User recognition** (burner badges, special status)
- ✅ Better UX (flexibility + community contribution)
- ✅ Ownership validation preserved (user still signs)

**Cons:**
- ❌ Requires backend wallet with SUI balance (for $Mews payers)
- ❌ More complex (handling two payment methods)
- ❌ Need DEX integration or conversion service (if auto-converting SUI → $Mews)

**Cost Model Analysis:**

## 💰 Pricing Comparison & Options

### **Option A: Pay-Per-Game (~$0.002 per game)**
- User pays: 0.002 SUI (~$0.002)
- Backend uses: 0.001 SUI for gas
- Backend converts: 0.001 SUI → $Mews (~1000 $Mews equivalent)
- Game receives: ~1000 $Mews value
- **Cost per game:** $0.002 = **500 games for $1**
- **Margin:** Very thin (barely covers gas if $Mews < $0.001)

### **Option B: Pay-Per-Game ($0.01 per game) - Recommended**
- User pays: 0.01 SUI (~$0.01)
- Backend uses: 0.001 SUI for gas
- Backend converts: 0.009 SUI → $Mews (~4500 $Mews equivalent)
- Game receives: ~4500 $Mews value
- **Cost per game:** $0.01 = **100 games for $1**
- **Margin:** Healthy (0.009 SUI profit per game = ~$0.009)

### **Option C: Monthly Subscription ($10/month unlimited) - NEW!**
- User pays: $10/month (or equivalent in SUI/$Mews)
- **Unlimited games** - No per-game fee
- Backend pays: ~$0.001 gas per game (covered by subscription)
- **Break-even:** 1000 games/month (33 games/day)
- **Best for:** Frequent players (50+ games/month saves money)
- **Margin:** Excellent (upfront payment, predictable revenue)

### **Subscription Break-Even Analysis:**

**Pay-Per-Game ($0.01) vs Subscription ($10/month):**
- **1-999 games/month:** Pay-per-game is cheaper
- **1000 games/month:** Break-even (same cost)
- **1000+ games/month:** Subscription saves money

**Examples:**
- **Casual player (30 games/month):** $0.30 with pay-per-game → **Subscription NOT worth it**
- **Regular player (100 games/month):** $1.00 with pay-per-game → **Subscription saves $9/month**
- **Hardcore player (500 games/month):** $5.00 with pay-per-game → **Subscription saves $5/month**
- **Pro player (2000 games/month):** $20.00 with pay-per-game → **Subscription saves $10/month**

**Recommendation:** Offer both options - let users choose!

### **Which Pricing Model is Better?**

**Recommended: Offer ALL THREE Options!**
1. **Pay-Per-Game ($0.01):** Best for casual players
2. **Monthly Subscription ($10):** Best for frequent players
3. **Token Burning:** Optional add-on for both models

**Why offer multiple options:**
- ✅ **Cater to all users:** Casual players pay per game, hardcore players subscribe
- ✅ **Maximize revenue:** Frequent players lock in $10/month (predictable revenue)
- ✅ **Better UX:** Users choose what fits their play style
- ✅ **Competitive advantage:** Most games only offer one pricing model

**$0.01 Pay-Per-Game Benefits:**
- ✅ **Better economics:** 4.5x more revenue per game than $0.002
- ✅ **More flexibility:** Can offer more to users who burn tokens
- ✅ **Sustainable:** Covers gas + operating costs + profit
- ✅ **Token burning friendly:** Higher base = more tokens available to burn
- ✅ **Still affordable:** $0.01 is very reasonable (less than a penny)

**$10/month Subscription Benefits:**
- ✅ **Excellent value:** Unlimited games (saves money if playing 100+ games/month)
- ✅ **Predictable revenue:** $10 upfront per subscriber
- ✅ **Better margins:** Gas costs amortized across many games
- ✅ **User loyalty:** Subscription creates commitment
- ✅ **VIP features:** Can offer exclusive benefits to subscribers

**$0.01 per game is NOT over-priced:**
- Average mobile game: $0.99-$4.99 per item/level
- Your game: $0.01 per score submission = **100x cheaper**
- For context: A coffee costs $3-5 (300-500 games worth)
- Very accessible pricing

**Cost Breakdown with $0.01:**
- Gas cost: ~$0.001 (10% of revenue)
- Net revenue: ~$0.009 per game (90% margin)
- At 1000 games/day: $9/day revenue, $1/day gas cost
- **Very sustainable and profitable**

---

**Recommended Pricing Model:**

## 🎮 Pricing Tiers

### **Tier 1: Pay-Per-Game (Casual Players)**
*If user pays in SUI ($0.01 per game):*
- User pays: 0.01 SUI (~$0.01) per game
- Backend uses: 0.001 SUI for gas (~10% of payment)
- Backend converts: 0.009 SUI → $Mews (~4500 $Mews, assuming 9 decimals)
- Game receives: ~4500 $Mews value per game
- **Cost:** $0.01 per game = **100 games for $1**
- **Best for:** Players who play <100 games/month

### **Tier 2: Monthly Subscription (Frequent Players)**
*$10/month unlimited games:*
- User pays: $10/month upfront (or ~10 SUI or equivalent $Mews)
- **Unlimited score submissions** - No per-game fee
- Backend covers: ~$0.001 gas per game (from subscription revenue)
- **Break-even:** 1000 games/month (user saves if playing more)
- **Best for:** Players who play 100+ games/month
- **VIP Benefits:** Can include exclusive features, badges, etc.

### **Tier 3: Token Burning (Optional Add-On)**
- Works with both pay-per-game and subscription
- Users can burn additional $Mews for recognition
- Creates deflationary pressure
- Rewards: Badges, leaderboard highlights, special status

*If user pays in SUI + burns $Mews:*
- User pays: 0.002 SUI (~$0.002)
- Backend uses: 0.001 SUI for gas
- Backend converts: 0.001 SUI → $Mews (~1000 $Mews)
- User opts to burn: 500 $Mews (example) → **Permanently removed from supply**
- Game receives: 500 $Mews (remaining amount)
- Community benefit: Supply reduced by 500 $Mews 🔥

*If user pays in $Mews (no burn) - $0.01 equivalent:*
- User pays: 4500 $Mews (equivalent to $0.01)
- Backend cost: 0.001 SUI (~$0.001) for gas
- Game receives: 4500 $Mews
- Net profit: 4500 $Mews - gas equivalent ≈ **Healthy margin**
- **Note:** Adjust $Mews amount based on current token price
  - If $Mews = $0.0001 → 100,000 $Mews for $0.01
  - If $Mews = $0.001 → 10,000 $Mews for $0.01
  - If $Mews = $0.01 → 1000 $Mews for $0.01 (your current proposal)
  - **Recommendation:** Set base fee dynamically or at 4500-5000 $Mews to match $0.01 value

*If user pays in $Mews + burns extra (with $0.01 base):*
- User pays: 4500 $Mews (base, $0.01 equivalent) + X $Mews (burn)
- Example: 4500 $Mews (base) + 500 $Mews (burn) = 5000 $Mews total
- Backend cost: 0.001 SUI (~$0.001) for gas
- Backend burns: 500 $Mews → **Permanently removed from supply**
- Game receives: 4500 $Mews (base payment)
- Community benefit: Supply reduced by 500 $Mews 🔥
- User gets: Burner badge, recognition, leaderboard highlight
- **Higher base = more tokens available for burning = better incentives**

*Token Burning Tiers (Suggested):*
- **Bronze Burner:** 100-499 $Mews burned → Basic badge
- **Silver Burner:** 500-1999 $Mews burned → Silver badge + leaderboard highlight
- **Gold Burner:** 2000+ $Mews burned → Gold badge + special recognition
- **Whale Burner:** 10,000+ $Mews burned → Permanent hall of fame

**Implementation Approaches:**

1. **Two Transaction Pattern (Simpler, works for sure):**
   - Transaction 1: User pays $Mews (user signs, pays small SUI gas)
   - Transaction 2: Backend submits score (backend signs, backend pays gas)
   - **Note:** Transaction 2 has backend as sender (but we can include user address in score data)

2. **Single Sponsored Transaction (Better UX, needs verification):**
   - User signs transaction (no gas coin specified)
   - Backend adds gas coin
   - Both actions in one transaction
   - User remains sender ✅

3. **Bundle Pattern (Alternative):**
   - One transaction: Transfer $Mews + Submit score
   - User signs, user pays SUI gas
   - Charge equivalent $Mews amount
   - Requires user to have SUI (not ideal)

**Recommendation:** Start with Pattern 1 (two transactions) for MVP, upgrade to Pattern 2 later if Sui SDK supports it cleanly.

---

### **Option 2: User Pays SUI Directly (Simpler Alternative)**

**How it works:**
- User signs transaction with their wallet
- Wallet automatically deducts SUI for gas
- User pays ~$0.001 per score submission
- If user doesn't have SUI, transaction fails (graceful error)

**Pros:**
- ✅ Simplest to implement
- ✅ No backend infrastructure needed
- ✅ User in full control
- ✅ Transparent (user sees exact cost)

**Cons:**
- ❌ User needs SUI (in addition to $Mews)
- ❌ May discourage some users from submitting
- ❌ Extra friction (users need to get SUI)

**Implementation:**
- User wallet automatically handles payment
- Frontend just needs to check if user has SUI balance
- Show warning if insufficient SUI

---

### **Option 3: Game Sponsors All Transactions (Full Subsidy)**

**How it works:**
- Game maintains a wallet with SUI
- Backend pays all gas fees for all users
- Users don't pay anything (game covers cost)

**Pros:**
- ✅ Best user experience (no fees at all)
- ✅ Highest submission rate
- ✅ Users only need $Mews for gatekeeping

**Cons:**
- ❌ Requires backend wallet/key management
- ❌ Ongoing cost for game operator (~$30/month for 1000 users/day)
- ❌ More complex (transaction sponsorship)
- ❌ Security risk (private key management)

**Cost estimate:**
- 1000 players/day × $0.001 = $1/day = ~$30/month
- Scales with usage

**Note:** Could be combined with Option 1 (charge $Mews, use to pay SUI)

---

## ✅ Recommended Approach: Option 1 - Flexible Payment (SUI or $Mews)

**Recommended because:**
- ✅ Maximum user flexibility (pay in either token)
- ✅ Users with SUI can use it directly
- ✅ Users with only $Mews can still play
- ✅ Auto-conversion (SUI → $Mews) adds value
- ✅ Matches your game pass pattern concept
- ✅ Better UX overall

### **Implementation Requirements:**

1. **Payment Model Selection UI** - Let user choose: Pay-Per-Game OR Subscription
2. **Payment Method UI** - If pay-per-game: Choose SUI or $Mews
3. **Subscription System** - Smart contract for monthly unlimited subscription
4. **SUI Payment Handler** - Accept SUI, use for gas, convert excess to $Mews
5. **$Mews Payment Handler** - Accept $Mews, backend pays SUI gas
6. **Token Burning System** - Smart contract to burn tokens permanently
7. **Burn Tier System** - Bronze, Silver, Gold, Whale tiers with recognition
8. **Backend SUI Wallet** - Maintain SUI balance for $Mews payers and subscriptions
9. **Subscription Management** - Check subscription status, expiration, renewal
10. **Optional: DEX Integration** - Auto-convert SUI → $Mews (or manual conversion)

---

## 🔧 Technical Implementation (Option 1: Flexible Payment - SUI or $Mews)

### **Step 1: Update Score Submission UI (Payment Choice)**

**Add payment method selection to score submission modal:**

```html
<!-- In name input modal -->
<div class="payment-method-selection" id="paymentMethodSelection">
  <h3>Choose Payment Method:</h3>
  
  <div class="payment-options">
    <label class="payment-option">
      <input type="radio" name="paymentMethod" value="sui" checked>
      <div class="payment-info">
        <strong>Pay in SUI</strong>
        <p>Cost: 0.01 SUI (~$0.01)</p>
        <p class="note">💡 That's 100 games for just $1!</p>
        <p class="note">💡 Excess will auto-convert to $Mews</p>
      </div>
    </label>
    
    <label class="payment-option">
      <input type="radio" name="paymentMethod" value="mews">
      <div class="payment-info">
        <strong>Pay in $Mews</strong>
        <p>Cost: <span id="mewsFeeAmount">4500</span> $Mews (~$0.01)</p>
        <p class="note">💰 We'll pay SUI gas for you</p>
        <p class="note">📊 Fee adjusts with token price</p>
      </div>
    </label>
  </div>
  
  <div class="current-balances">
    <p>Your SUI Balance: <span id="suiBalance">0</span></p>
    <p>Your $Mews Balance: <span id="mewsBalance">0</span></p>
  </div>
</div>
```

### **Step 2: Frontend Payment Handler**

**Update `src/game/blockchain/wallet-connection.js`:**

```javascript
/**
 * Pay for score submission (user chooses SUI or $Mews + optional burn)
 * @param {string} paymentMethod - 'sui' or 'mews'
 * @param {number} amount - Payment amount (optional)
 * @param {Object} burnOptions - Burn configuration
 * @param {string} burnOptions.option - 'none', 'custom', or 'tier'
 * @param {number} burnOptions.amount - Amount to burn (if custom)
 * @param {string} burnOptions.tier - 'bronze', 'silver', 'gold', or 'whale' (if tier)
 * @param {number} burnOptions.tierAmount - Amount within tier range
 */
async function payForSubmission(paymentMethod = 'sui', amount = null, burnOptions = { option: 'none' }) {
  try {
    if (!isWalletConnected()) {
      return { success: false, error: 'Wallet not connected' };
    }

    if (paymentMethod === 'sui') {
      // Payment Method A: User pays in SUI
      const suiAmount = amount || 0.01; // Default 0.01 SUI (~$0.01)
      const suiBalance = await getSUIBalance();
      
      if (parseFloat(suiBalance) < suiAmount) {
        return {
          success: false,
          error: `Insufficient SUI. Need ${suiAmount}, have ${suiBalance}`,
          canUseMews: true // Suggest alternative
        };
      }

      // Build transaction to transfer SUI
      const tx = new TransactionBlock();
      
      // Split SUI for payment
      const paymentCoin = tx.splitCoins(
        tx.gas, // User's SUI gas coin
        [tx.pure.u64(suiAmount * 1_000_000_000)] // Convert to MIST
      );
      
      // Transfer to game wallet
      tx.transferObjects([paymentCoin], process.env.GAME_TREASURY_ADDRESS);
      
      // Sign and execute
      const result = await signAndExecuteTransaction(tx);
      
      return {
        success: true,
        transactionHash: result.digest,
        paymentMethod: 'sui',
        amount: suiAmount,
        // Backend will use this SUI for gas and convert excess to $Mews
      };
    } else {
      // Payment Method B: User pays in $Mews
      // Default: 4500 $Mews (equivalent to $0.01)
      // This should be calculated dynamically based on current $Mews price
      // For now, using fixed amount (can be updated from backend/API)
      const mewsAmount = amount || 4500; // Default 4500 $Mews (~$0.01 equivalent)
      const mewsBalance = await getTokenBalance(process.env.MEWS_TOKEN_TYPE_ID);
      
      if (parseFloat(mewsBalance.totalBalance) < mewsAmount) {
        return {
          success: false,
          error: `Insufficient $Mews. Need ${mewsAmount}, have ${mewsBalance.totalBalance}`,
          canUseSui: true // Suggest alternative
        };
      }

      // Build transaction to transfer $Mews
      const tx = new TransactionBlock();
      
      // Get user's $Mews coins
      const mewsCoins = await connectedWallet.getCoins({
        owner: connectedAddress,
        coinType: process.env.MEWS_TOKEN_TYPE_ID
      });
      
      if (mewsCoins.data.length === 0) {
        return { success: false, error: 'No $Mews coins found' };
      }
      
      // Use first coin, split if needed
      const mewsCoin = tx.object(mewsCoins.data[0].coinObjectId);
      const paymentCoin = tx.splitCoins(
        mewsCoin,
        [tx.pure.u64(mewsAmount * 1_000_000_000)] // Convert to smallest unit
      );
      
      // Transfer to game treasury
      tx.transferObjects([paymentCoin], process.env.GAME_TREASURY_ADDRESS);
      
      // Sign and execute (user pays small SUI gas for this transfer)
      const result = await signAndExecuteTransaction(tx);
      
      return {
        success: true,
        transactionHash: result.digest,
        paymentMethod: 'mews',
        amount: mewsAmount,
        // Backend will pay SUI gas for score submission
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Add to exports
window.WalletConnection = {
  // ... existing ...
  payForSubmission
};
```

### **Step 3: Create Subscription Smart Contract**

**`suitwo_game/sources/subscription.move`:**

```move
module suitwo_game::subscription {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::table::{Self, Table};
    use sui::event;
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::clock::{Self, Clock};

    // Subscription pricing
    const MONTHLY_PRICE: u64 = 10_000_000_000; // 10 SUI (approximately $10)
    const SUBSCRIPTION_DURATION_MS: u64 = 30 * 24 * 60 * 60 * 1000; // 30 days

    /// User subscription object
    struct UserSubscription has key, store {
        id: sui::object::UID,
        user: address,
        created_at: u64,
        expires_at: u64,
        games_played: u64,
    }

    /// Subscription system (shared object)
    struct SubscriptionSystem has key {
        id: sui::object::UID,
        active_subscriptions: Table<address, UserSubscription>,
        total_subscriptions: u64,
        total_revenue: u64,
    }

    /// Event when subscription is purchased
    struct SubscriptionPurchased has copy, drop {
        user: address,
        expires_at: u64,
        price: u64,
    }

    /// Event when subscription is used (game submitted)
    struct SubscriptionUsed has copy, drop {
        user: address,
        games_remaining_this_month: u64, // Unlimited, so always shows "unlimited"
    }

    /// Initialize subscription system
    public fun init(ctx: &mut TxContext) {
        let system = SubscriptionSystem {
            id: sui::object::new(ctx),
            active_subscriptions: table::new(ctx),
            total_subscriptions: 0,
            total_revenue: 0,
        };
        sui::transfer::share_object(system);
    }

    /// Purchase monthly subscription
    public entry fun purchase_subscription(
        system: &mut SubscriptionSystem,
        payment: Coin<SUI>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let user = tx_context::sender(ctx);
        let payment_amount = coin::value(&payment);
        let current_time = clock::timestamp_ms(clock);

        // Validate payment
        assert!(payment_amount >= MONTHLY_PRICE, 1); // Insufficient payment

        // Check if user has existing subscription
        let expires_at = if (table::contains(&system.active_subscriptions, user)) {
            let existing = table::borrow(&system.active_subscriptions, user);
            // Extend existing subscription or start from now if expired
            if (existing.expires_at > current_time) {
                existing.expires_at + SUBSCRIPTION_DURATION_MS // Extend
            } else {
                current_time + SUBSCRIPTION_DURATION_MS // New subscription
            }
        } else {
            current_time + SUBSCRIPTION_DURATION_MS // New subscription
        };

        // Create or update subscription
        if (table::contains(&system.active_subscriptions, user)) {
            let subscription = table::borrow_mut(&mut system.active_subscriptions, user);
            subscription.expires_at = expires_at;
            subscription.created_at = current_time;
        } else {
            let subscription = UserSubscription {
                id: sui::object::new(ctx),
                user,
                created_at: current_time,
                expires_at,
                games_played: 0,
            };
            table::add(&mut system.active_subscriptions, user, subscription);
            system.total_subscriptions = system.total_subscriptions + 1;
        }

        system.total_revenue = system.total_revenue + payment_amount;

        // Transfer payment to treasury (or keep for gas)
        transfer::public_transfer(payment, sui::tx_context::sender(ctx)); // For now, return to sender (update to treasury)

        // Emit event
        event::emit(SubscriptionPurchased {
            user,
            expires_at,
            price: payment_amount,
        });
    }

    /// Check if user has active subscription
    public fun has_active_subscription(
        system: &SubscriptionSystem,
        user: address,
        clock: &Clock
    ): bool {
        if (!table::contains(&system.active_subscriptions, user)) {
            return false
        };

        let subscription = table::borrow(&system.active_subscriptions, user);
        let current_time = clock::timestamp_ms(clock);
        current_time < subscription.expires_at
    }

    /// Record a game submission (increment counter)
    public fun record_game_submission(
        system: &mut SubscriptionSystem,
        user: address,
        clock: &Clock,
        ctx: &mut TxContext
    ): bool {
        if (!has_active_subscription(system, user, clock)) {
            return false
        };

        let subscription = table::borrow_mut(&mut system.active_subscriptions, user);
        subscription.games_played = subscription.games_played + 1;

        event::emit(SubscriptionUsed {
            user,
            games_remaining_this_month: 999999, // "Unlimited"
        });

        true
    }

    /// Get subscription info
    public fun get_subscription_info(
        system: &SubscriptionSystem,
        user: address,
        clock: &Clock
    ): (bool, u64, u64) { // (is_active, expires_at, games_played)
        if (!table::contains(&system.active_subscriptions, user)) {
            return (false, 0, 0)
        };

        let subscription = table::borrow(&system.active_subscriptions, user);
        let current_time = clock::timestamp_ms(clock);
        let is_active = current_time < subscription.expires_at;

        (is_active, subscription.expires_at, subscription.games_played)
    }
}
```

### **Step 4: Create Token Burning Smart Contract**

**`suitwo_game/sources/token_burn.move`:**

```move
module suitwo_game::token_burn {
    use sui::coin::{Self, Coin, TreasuryCap};
    use sui::event;
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::balance;
    
    // Use your $Mews token type
    const MEWS_TOKEN_TYPE: vector<u8> = x"YOUR_MEWS_TOKEN_TYPE_ID"; // Replace
    
    /// Event when tokens are burned
    struct TokensBurned has copy, drop {
        player: address,
        amount: u64,
        burn_tier: u8, // 1=Bronze, 2=Silver, 3=Gold, 4=Whale
        total_burned_ever: u64,
        timestamp: u64,
    }
    
    /// Global burn statistics
    struct BurnStats has key {
        id: sui::object::UID,
        total_burned: u64,
        total_burners: u64,
    }
    
    /// Initialize burn statistics (one-time)
    public fun init(ctx: &mut TxContext) {
        let stats = BurnStats {
            id: sui::object::new(ctx),
            total_burned: 0,
            total_burners: 0,
        };
        sui::transfer::share_object(stats);
    }
    
    /// Burn $Mews tokens permanently
    /// This removes tokens from circulation forever
    public entry fun burn_tokens(
        stats: &mut BurnStats,
        coins_to_burn: Coin<MEWS_TOKEN>,
        burn_tier: u8,
        clock: &sui::clock::Clock,
        ctx: &mut TxContext
    ) {
        let player = tx_context::sender(ctx);
        let burn_amount = coin::value(&coins_to_burn);
        let timestamp = sui::clock::timestamp_ms(clock);
        
        // Validate burn tier
        assert!(burn_tier >= 1 && burn_tier <= 4, 1); // Invalid tier
        
        // Validate minimum burn amount based on tier
        if (burn_tier == 1) {
            assert!(burn_amount >= 100 && burn_amount < 500, 2); // Bronze: 100-499
        } else if (burn_tier == 2) {
            assert!(burn_amount >= 500 && burn_amount < 2000, 3); // Silver: 500-1999
        } else if (burn_tier == 3) {
            assert!(burn_amount >= 2000 && burn_amount < 10000, 4); // Gold: 2000-9999
        } else if (burn_tier == 4) {
            assert!(burn_amount >= 10000, 5); // Whale: 10000+
        };
        
        // Update statistics
        stats.total_burned = stats.total_burned + burn_amount;
        stats.total_burners = stats.total_burners + 1;
        
        // Burn the coins (permanently destroy)
        // In Sui, we can't truly "burn" custom tokens without treasury cap,
        // but we can transfer to a burn address or use balance::join with a burn account
        
        // Alternative: Transfer to a known burn address (0x0 or dedicated burn address)
        // The coins will be effectively removed from circulation
        coin::burn(coins_to_burn); // If $Mews has burn capability
        
        // Or transfer to burn address if burn() not available:
        // transfer::public_transfer(coins_to_burn, @0x0); // Burn address
        
        // Emit event
        event::emit(TokensBurned {
            player,
            amount: burn_amount,
            burn_tier,
            total_burned_ever: stats.total_burned,
            timestamp,
        });
    }
    
    /// Get total burned tokens ever
    public fun get_total_burned(stats: &BurnStats): u64 {
        stats.total_burned
    }
    
    /// Get total number of burners
    public fun get_total_burners(stats: &BurnStats): u64 {
        stats.total_burners
    }
}
```

**Note:** If your $Mews token doesn't have a `burn()` function, you can:
1. Transfer to a dedicated burn address (known address that never spends)
2. Use TreasuryCap to mint/burn (if you control the token)
3. Transfer to a burn contract that holds forever

### **Step 5: Backend Subscription Service**

**`backend/src/services/subscription-service.js`:**

```javascript
const { SuiClient, getFullnodeUrl } = require('@mysten/sui.js/client');
const { TransactionBlock } = require('@mysten/sui.js/transactions');
const { Ed25519Keypair } = require('@mysten/sui.js/keypairs/ed25519');
const { fromHEX } = require('@mysten/sui.js/utils');

class SubscriptionService {
  constructor() {
    this.client = new SuiClient({ url: getFullnodeUrl(process.env.SUI_NETWORK || 'testnet') });
    
    const gamePrivateKey = process.env.GAME_WALLET_PRIVATE_KEY;
    if (!gamePrivateKey) {
      throw new Error('GAME_WALLET_PRIVATE_KEY must be set');
    }
    this.gameKeypair = Ed25519Keypair.fromSecretKey(fromHEX(gamePrivateKey));
    this.gameAddress = this.gameKeypair.toSuiAddress();
    this.subscriptionContract = process.env.SUBSCRIPTION_CONTRACT;
    this.subscriptionSystemId = process.env.SUBSCRIPTION_SYSTEM_OBJECT_ID;
  }

  /**
   * Check if user has active subscription
   */
  async checkSubscription(walletAddress) {
    try {
      const system = await this.client.getObject({
        id: this.subscriptionSystemId,
        options: { showContent: true },
      });

      // Call view function to check subscription
      // In Sui, we query the object directly
      // For now, query events or use a Move view function
      
      // Alternative: Query events for subscription purchases
      const events = await this.client.queryEvents({
        query: {
          MoveModule: {
            package: this.subscriptionContract.split('::')[0],
            module: 'subscription',
          },
        },
        limit: 100,
      });

      // Find user's latest subscription
      const userSubscriptions = events.data
        .filter(e => e.parsedJson?.user?.toLowerCase() === walletAddress.toLowerCase())
        .sort((a, b) => b.timestampMs - a.timestampMs);

      if (userSubscriptions.length === 0) {
        return { isActive: false, expiresAt: null, gamesPlayed: 0 };
      }

      const latest = userSubscriptions[0];
      const expiresAt = latest.parsedJson?.expires_at || 0;
      const isActive = expiresAt > Date.now();

      return {
        isActive,
        expiresAt: expiresAt > 0 ? new Date(expiresAt).toISOString() : null,
        gamesPlayed: 0, // Would need to query from object
      };
    } catch (error) {
      console.error('Error checking subscription:', error);
      return { isActive: false, expiresAt: null, gamesPlayed: 0 };
    }
  }

  /**
   * Process subscription purchase
   */
  async purchaseSubscription(walletAddress, paymentTxHash) {
    // Verify payment, then create subscription
    // User pays $10, backend creates subscription record
    // Implementation depends on whether user signs or backend signs
  }

  /**
   * Submit score with active subscription (backend covers gas)
   */
  async submitScoreWithSubscription(scoreData, playerAddress) {
    try {
      // Verify subscription is active
      const subscription = await this.checkSubscription(playerAddress);
      if (!subscription.isActive) {
        throw new Error('Subscription not active');
      }

      // Build score submission transaction
      const tx = new TransactionBlock();
      
      tx.moveCall({
        target: `${process.env.GAME_SCORE_CONTRACT}::game::submit_game_session_for_user`,
        arguments: [
          tx.pure.address(playerAddress),
          tx.object('0x6'), // Clock
          tx.pure.u64(scoreData.score),
          tx.pure.u64(scoreData.distance),
          tx.pure.u64(scoreData.coins),
          tx.pure.u64(scoreData.bossesDefeated),
          tx.pure.u8(scoreData.tier),
          tx.pure.u8(scoreData.livesRemaining),
          tx.pure.u8(scoreData.projectileLevel),
                  // No startTime needed - using distance for validation
        ],
      });

      // Record game submission in subscription
      tx.moveCall({
        target: `${this.subscriptionContract}::subscription::record_game_submission`,
        arguments: [
          tx.object(this.subscriptionSystemId),
          tx.pure.address(playerAddress),
          tx.object('0x6'), // Clock
        ],
      });

      // Backend pays gas (covered by subscription revenue)
      const result = await this.client.signAndExecuteTransactionBlock({
        signer: this.gameKeypair,
        transactionBlock: tx,
      });

      return {
        success: true,
        transactionHash: result.digest,
        paymentModel: 'subscription',
      };
    } catch (error) {
      console.error('Error submitting score with subscription:', error);
      throw error;
    }
  }
}

module.exports = new SubscriptionService();
```

### **Step 6: Backend Payment Processing Service (Updated with Burning)**

**`backend/src/services/payment-processor.js`:**

```javascript
const { SuiClient, getFullnodeUrl } = require('@mysten/sui.js/client');
const { TransactionBlock } = require('@mysten/sui.js/transactions');
const { Ed25519Keypair } = require('@mysten/sui.js/keypairs/ed25519');
const { fromHEX } = require('@mysten/sui.js/utils');

class PaymentProcessor {
  constructor() {
    this.client = new SuiClient({ url: getFullnodeUrl(process.env.SUI_NETWORK || 'testnet') });
    
    // Game wallet (receives payments, pays gas)
    const gamePrivateKey = process.env.GAME_WALLET_PRIVATE_KEY;
    if (!gamePrivateKey) {
      throw new Error('GAME_WALLET_PRIVATE_KEY must be set');
    }
    this.gameKeypair = Ed25519Keypair.fromSecretKey(fromHEX(gamePrivateKey));
    this.gameAddress = this.gameKeypair.toSuiAddress();
  }

  /**
   * Process SUI payment: Use some for gas, convert rest to $Mews
   * @param {string} paymentTxHash - Transaction hash of user's SUI payment
   * @param {Object} scoreData - Score data to submit
   * @returns {Promise<Object>} Result
   */
  async processSUIPayment(paymentTxHash, scoreData) {
    try {
      // Verify payment transaction
      const paymentTx = await this.client.getTransactionBlock({
        digest: paymentTxHash,
        options: { showEffects: true }
      });
      
      // Get SUI amount received (from payment transaction effects)
      const suiReceived = paymentTx.effects.gasUsed?.computationCost || 0;
      // Actually, need to parse transfer from paymentTx...
      
      // Use portion for gas, convert excess to $Mews (if applicable)
      // For MVP: Just use all SUI for gas (simple)
      // For future: Integrate with DEX to swap SUI → $Mews
      
      // Build score submission transaction
      const tx = new TransactionBlock();
      
      tx.moveCall({
        target: `${process.env.GAME_SCORE_CONTRACT}::game::submit_game_session`,
        arguments: [
          tx.object('0x6'), // Clock
          tx.pure.u64(scoreData.score),
          tx.pure.u64(scoreData.distance),
          tx.pure.u64(scoreData.coins),
          tx.pure.u64(scoreData.bossesDefeated),
          tx.pure.u8(scoreData.tier),
          tx.pure.u8(scoreData.livesRemaining),
          tx.pure.u8(scoreData.projectileLevel),
                  // No startTime needed - using distance for validation
        ],
      });
      
      // Use game wallet's SUI for gas
      const result = await this.client.signAndExecuteTransactionBlock({
        signer: this.gameKeypair,
        transactionBlock: tx,
      });
      
      return {
        success: true,
        scoreTxHash: result.digest,
        paymentMethod: 'sui',
        // Future: Return $Mews conversion info
      };
    } catch (error) {
      console.error('Error processing SUI payment:', error);
      throw error;
    }
  }

  /**
   * Process $Mews payment: Backend pays SUI gas + Handle token burning
   * @param {string} paymentTxHash - Transaction hash of user's $Mews payment
   * @param {Object} scoreData - Score data to submit
   * @param {Object} burnInfo - Burn information (amount, tier)
   * @returns {Promise<Object>} Result
   */
  async processMewsPayment(paymentTxHash, scoreData, burnInfo = null) {
    try {
      // Verify $Mews payment transaction
      const paymentTx = await this.client.getTransactionBlock({
        digest: paymentTxHash,
        options: { showEffects: true }
      });
      
      // Handle performance-based token burning
      let burnResult = null;
      if (burnInfo && burnInfo.amount > 0 && burnInfo.type === 'performance') {
        // Verify performance metrics match burn amount
        const calculatedBurn = this.calculatePerformanceBurn(scoreData.performanceMetrics || {});
        
        // Validate burn amount (frontend calculation should match backend)
        // Allow small variance for rounding
        const burnDifference = Math.abs(calculatedBurn.total - burnInfo.amount);
        if (burnDifference > 1) { // Allow 1 $Mews variance
          console.warn(`Burn amount mismatch: calculated ${calculatedBurn.total}, received ${burnInfo.amount}`);
          // Use calculated amount for security (backend calculation is authoritative)
          burnInfo.amount = calculatedBurn.total;
          burnInfo.breakdown = calculatedBurn;
        }
        
        // Process performance-based burn transaction
        burnResult = await this.processPerformanceBurn(
          paymentTxHash,
          burnInfo.amount,
          burnInfo.tier || this.getBurnTier(burnInfo.amount),
          burnInfo.breakdown || calculatedBurn
        );
      }
      
      // Build score submission transaction
      const tx = new TransactionBlock();
      
      tx.moveCall({
        target: `${process.env.GAME_SCORE_CONTRACT}::game::submit_game_session_for_user`,
        arguments: [
          tx.pure.address(scoreData.playerAddress), // Explicit player address
          tx.object('0x6'), // Clock
          tx.pure.u64(scoreData.score),
          tx.pure.u64(scoreData.distance),
          tx.pure.u64(scoreData.coins),
          tx.pure.u64(scoreData.bossesDefeated),
          tx.pure.u8(scoreData.tier),
          tx.pure.u8(scoreData.livesRemaining),
          tx.pure.u8(scoreData.projectileLevel),
                  // No startTime needed - using distance for validation
        ],
      });
      
      // Backend pays SUI gas (sponsor)
      const result = await this.client.signAndExecuteTransactionBlock({
        signer: this.gameKeypair, // Backend signs and pays gas
        transactionBlock: tx,
      });
      
      return {
        success: true,
        scoreTxHash: result.digest,
        paymentMethod: 'mews',
        backendPaidGas: true,
        burn: burnResult || null, // Include burn information if applicable
      };
    } catch (error) {
      console.error('Error processing $Mews payment:', error);
      throw error;
    }
  }

  /**
   * Process performance-based token burning transaction
   * @param {string} paymentTxHash - Transaction that included burn coins
   * @param {number} burnAmount - Amount to burn (calculated from performance)
   * @param {string} burnTier - Tier of burn (bronze, silver, gold, whale)
   * @param {Object} burnBreakdown - Detailed breakdown of burn sources
   * @returns {Promise<Object>} Burn result
   */
  async processPerformanceBurn(paymentTxHash, burnAmount, burnTier, burnBreakdown = null) {
    try {
      // Map tier to number
      const tierMap = { 'bronze': 1, 'silver': 2, 'gold': 3, 'whale': 4 };
      const tierNumber = tierMap[burnTier.toLowerCase()] || 1;
      
      // Build burn transaction
      const tx = new TransactionBlock();
      
      // Call burn function
      // Note: This assumes coins were transferred to burn contract/address
      // In practice, you might need to fetch the coins from the payment transaction
      
      tx.moveCall({
        target: `${process.env.TOKEN_BURN_CONTRACT}::token_burn::burn_tokens`,
        arguments: [
          tx.object(process.env.BURN_STATS_OBJECT_ID), // BurnStats object
          tx.object(process.env.BURN_COIN_OBJECT_ID), // Coin to burn (from payment)
          tx.pure.u8(tierNumber),
          tx.object('0x6'), // Clock
        ],
      });
      
      // Execute burn (backend pays gas)
      const result = await this.client.signAndExecuteTransactionBlock({
        signer: this.gameKeypair,
        transactionBlock: tx,
      });
      
      return {
        success: true,
        burnTxHash: result.digest,
        amount: burnAmount,
        tier: burnTier,
        breakdown: burnBreakdown, // Include breakdown for transparency
        type: 'performance' // Indicates performance-based burn
      };
    } catch (error) {
      console.error('Error processing token burn:', error);
      // Don't fail entire transaction if burn fails
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get burn tier based on amount (performance-based)
   */
  getBurnTier(amount) {
    if (amount >= 10000) return 'whale';
    if (amount >= 2000) return 'gold';
    if (amount >= 500) return 'silver';
    if (amount >= 100) return 'bronze';
    return null;
  }

  /**
   * Calculate performance burn from game stats
   * This should match frontend calculation for verification
   */
  calculatePerformanceBurn(performanceMetrics) {
    const BURN_RATES = {
      enemyDefeated: 1,
      bossDefeated: 100,
      distanceMilestone: 100,
      distanceMilestoneReward: 10,
      coinCollected: 0.1,
      scoreBonus: { threshold: 1000, reward: 10 }
    };

    const burns = {
      enemies: performanceMetrics.enemies * BURN_RATES.enemyDefeated,
      bosses: performanceMetrics.bosses * BURN_RATES.bossDefeated,
      distance: Math.floor(performanceMetrics.distance / BURN_RATES.distanceMilestone) * BURN_RATES.distanceMilestoneReward,
      coins: performanceMetrics.coins * BURN_RATES.coinCollected,
      scoreBonus: Math.floor(performanceMetrics.score / BURN_RATES.scoreBonus.threshold) * BURN_RATES.scoreBonus.reward
    };

    burns.total = burns.enemies + burns.bosses + burns.distance + burns.coins + burns.scoreBonus;

    return burns;
  }

  /**
   * Optional: Convert SUI to $Mews via DEX
   * Future enhancement - integrate with Sui DEX
   */
  async convertSUIToMews(suiAmount) {
    // Integrate with Cetus, Turbos, or other Sui DEX
    // Swap SUI → $Mews
    // Store $Mews in game treasury
    // For MVP: Skip this, just use SUI for gas
  }

  /**
   * Get total burned tokens (from blockchain)
   */
  async getTotalBurned() {
    try {
      // Query burn statistics from smart contract
      const burnStats = await this.client.getObject({
        id: process.env.BURN_STATS_OBJECT_ID,
        options: { showContent: true },
      });
      
      // Parse total burned from object
      return burnStats.data?.content?.fields?.total_burned || 0;
    } catch (error) {
      console.error('Error fetching burn stats:', error);
      return 0;
    }
  }
}

module.exports = new PaymentProcessor();
```

### **Step 4: Performance-Based Burn Calculation (Frontend)**

**Add burn calculation to game stats tracking:**

**Update `src/game/main.js` or create `src/game/blockchain/burn-calculator.js`:**

```javascript
// ==========================================
// PERFORMANCE-BASED BURN CALCULATOR
// ==========================================

/**
 * Calculate burn amount based on gameplay performance
 * @param {Object} gameStats - Game statistics object
 * @returns {Object} Burn calculation breakdown
 */
function calculatePerformanceBurn(gameStats) {
  // Configurable burn rates (can be set via API or constants)
  const BURN_RATES = {
    enemyDefeated: 1,        // 1 $Mews per enemy
    
    // Tier-based boss rewards (higher tier = higher reward)
    bossDefeatedBase: 100,   // Base reward for tier 1 boss
    bossDefeatedMultiplier: 1.5, // Multiplier per tier (tier 1 = 100, tier 2 = 150, tier 3 = 200, tier 4 = 250)
    
    // Distance (milestone-based for predictability)
    distanceMilestone: 100,  // Every 100 units
    distanceMilestoneReward: 10, // 10 $Mews per milestone
    
    // Coins (user choice: burn or kickback)
    coinBurnRate: 0.1,       // 0.1 $Mews per coin (if burning)
    coinKickbackRate: 0.05,  // 0.05 $Mews per coin (if kickback)
    
    // Score bonus
    scoreBonus: {
      threshold: 1000,       // Per 1000 points
      reward: 10             // 10 $Mews per 1000 points
    },
    
    // Balance controls
    minBurnThreshold: 50,    // Minimum burn to trigger (prevent dust burns)
    maxBurnCap: 2000,        // Maximum burn per game (prevent exploitation)
    skillMultiplier: {
      tier2: 1.1,           // 10% bonus at tier 2
      tier3: 1.2,           // 20% bonus at tier 3
      tier4: 1.3            // 30% bonus at tier 4
    }
  };

  // Get current tier for calculations
  const currentTier = gameStats.tier || 1;
  
  // Calculate burns from different sources
  const burns = {
    enemies: gameStats.enemiesDefeated * BURN_RATES.enemyDefeated,
    bosses: 0, // Will calculate based on tiers
    distance: 0,
    coins: 0,
    scoreBonus: 0,
    skillBonus: 0, // Tier-based multiplier
    total: 0
  };

  // Tier-based boss burning
  // Calculate boss burn based on tiers defeated
  // If we have tier info per boss, use that; otherwise use average tier
  if (gameStats.bossesDefeated > 0) {
    // Simplified: Use current tier to determine boss reward
    // Better: Track each boss's tier and calculate individually
    const bossRewardPerTier = BURN_RATES.bossDefeatedBase * Math.pow(BURN_RATES.bossDefeatedMultiplier, currentTier - 1);
    burns.bosses = gameStats.bossesDefeated * bossRewardPerTier;
    
    // More accurate: If we have per-boss tier data
    // burns.bosses = gameStats.bossTiers.reduce((sum, tier) => {
    //   return sum + (BURN_RATES.bossDefeatedBase * Math.pow(BURN_RATES.bossDefeatedMultiplier, tier - 1));
    // }, 0);
  }

  // Distance-based burning (milestone approach)
  if (gameStats.distance >= BURN_RATES.distanceMilestone) {
    const milestones = Math.floor(gameStats.distance / BURN_RATES.distanceMilestone);
    burns.distance = milestones * BURN_RATES.distanceMilestoneReward;
  }

  // Coin-based (user choice: burn or kickback)
  if (gameStats.coinBurnEnabled) {
    // Burn mode: Coins contribute to burn
    burns.coins = gameStats.coins * BURN_RATES.coinBurnRate;
  } else {
    // Kickback mode: Coins give reward (negative = reward, will be handled separately)
    burns.coins = -gameStats.coins * BURN_RATES.coinKickbackRate;
  }

  // Score-based bonus burn
  if (gameStats.score >= BURN_RATES.scoreBonus.threshold) {
    const scoreMultiplier = Math.floor(gameStats.score / BURN_RATES.scoreBonus.threshold);
    burns.scoreBonus = scoreMultiplier * BURN_RATES.scoreBonus.reward;
  }

  // Skill multiplier based on tier progression
  let skillMultiplier = 1.0;
  if (currentTier >= 4) {
    skillMultiplier = BURN_RATES.skillMultiplier.tier4;
  } else if (currentTier >= 3) {
    skillMultiplier = BURN_RATES.skillMultiplier.tier3;
  } else if (currentTier >= 2) {
    skillMultiplier = BURN_RATES.skillMultiplier.tier2;
  }

  // Calculate base total (excluding coins if kickback, skill bonus not yet applied)
  const baseTotal = burns.enemies + burns.bosses + burns.distance + 
                   (burns.coins > 0 ? burns.coins : 0) + // Only include coins if burning
                   burns.scoreBonus;
  
  // Apply skill multiplier
  const multiplierBonus = baseTotal * (skillMultiplier - 1.0);
  burns.skillBonus = multiplierBonus;
  
  // Calculate final total
  let totalBurn = baseTotal * skillMultiplier;
  
  // Handle coin kickback (if coins are rewards, subtract from total)
  if (burns.coins < 0) {
    // Kickback reduces burn amount (player receives tokens instead)
    totalBurn = Math.max(0, totalBurn + burns.coins); // burns.coins is negative
  }

  // Apply caps and thresholds
  if (totalBurn < BURN_RATES.minBurnThreshold) {
    totalBurn = 0; // Below threshold, no burn
  }
  if (totalBurn > BURN_RATES.maxBurnCap) {
    totalBurn = BURN_RATES.maxBurnCap; // Cap at maximum
  }

  burns.total = totalBurn;

  return {
    breakdown: burns,
    burnRates: BURN_RATES,
    formatted: {
      enemies: `${gameStats.enemiesDefeated} enemies × ${BURN_RATES.enemyDefeated} = ${burns.enemies} $Mews`,
      bosses: `${gameStats.bossesDefeated} bosses × ${BURN_RATES.bossDefeated} = ${burns.bosses} $Mews`,
      distance: `${gameStats.distance} distance = ${burns.distance} $Mews`,
      coins: `${gameStats.coins} coins × ${BURN_RATES.coinCollected} = ${burns.coins} $Mews`,
      scoreBonus: `${gameStats.score} score = ${burns.scoreBonus} $Mews bonus`,
      total: `${burns.total} $Mews total burn`
    }
  };
}

/**
 * Get burn tier based on total performance burn
 */
function getPerformanceBurnTier(totalBurn) {
  if (totalBurn >= 10000) return { tier: 'whale', name: '🐋 Whale Performer' };
  if (totalBurn >= 2000) return { tier: 'gold', name: '🔥🔥🔥 Gold Performer' };
  if (totalBurn >= 500) return { tier: 'silver', name: '🔥🔥 Silver Performer' };
  if (totalBurn >= 100) return { tier: 'bronze', name: '🔥 Bronze Performer' };
  return { tier: 'none', name: 'Player' };
}

/**
 * Track performance during gameplay
 */
class PerformanceTracker {
  constructor() {
    this.stats = {
      enemiesDefeated: 0,
      bossesDefeated: 0,
      distance: 0,
      coins: 0,
      score: 0,
      coinBurnEnabled: true // User preference
    };
  }

  onEnemyDefeated() {
    this.stats.enemiesDefeated++;
  }

  onBossDefeated() {
    this.stats.bossesDefeated++;
  }

  onDistanceTraveled(distance) {
    this.stats.distance = distance;
  }

  onCoinCollected() {
    this.stats.coins++;
  }

  onScoreUpdate(score) {
    this.stats.score = score;
  }

  calculateBurn() {
    return calculatePerformanceBurn(this.stats);
  }

  getBurnTier() {
    const burnCalc = this.calculateBurn();
    return getPerformanceBurnTier(burnCalc.breakdown.total);
  }

  reset() {
    this.stats = {
      enemiesDefeated: 0,
      bossesDefeated: 0,
      distance: 0,
      coins: 0,
      score: 0,
      coinBurnEnabled: this.stats.coinBurnEnabled // Preserve preference
    };
  }
}

// Export for use in game
window.PerformanceBurn = {
  calculatePerformanceBurn,
  getPerformanceBurnTier,
  PerformanceTracker
};
```

**Integrate with game logic:**

```javascript
// In your game's main loop or enemy/boss defeat handlers
const performanceTracker = new window.PerformanceBurn.PerformanceTracker();

// When enemy is defeated
function onEnemyKilled() {
  // ... existing enemy kill logic ...
  performanceTracker.onEnemyDefeated();
}

// When boss is defeated
function onBossKilled() {
  // ... existing boss kill logic ...
  performanceTracker.onBossDefeated();
}

// In game loop (distance tracking)
function update() {
  // ... existing update logic ...
  performanceTracker.onDistanceTraveled(game.distance);
  performanceTracker.onScoreUpdate(game.score);
}

// When coin is collected
function onCoinCollected() {
  // ... existing coin collection logic ...
  performanceTracker.onCoinCollected();
}

// When game ends - calculate burn
function gameOver() {
  const burnCalc = performanceTracker.calculateBurn();
  const burnTier = performanceTracker.getBurnTier();
  
  console.log('Performance Burn Breakdown:');
  console.log(burnCalc.formatted);
  console.log(`Burn Tier: ${burnTier.name}`);
  
  // Store for score submission
  game.performanceBurn = burnCalc.breakdown.total;
  game.performanceBurnBreakdown = burnCalc.breakdown;
}
```

### **Step 5: Update Score Submission to Include Performance Burn**

**Important:** If backend signs transaction (for $Mews payment), we need to pass user address explicitly.

**Update `suitwo_game/sources/game.move`:**

```move
/// Submit a game session (with explicit player address for sponsored transactions)
public entry fun submit_game_session_for_user(
    player: address,  // Explicit player address (for when backend sponsors)
    clock: &Clock,
    score: u64,
    // ... rest of parameters ...
    ctx: &mut TxContext
) {
    // Validation checks (same as before)...
    
    // Create session with explicit player address
    let session = GameSession {
        id: object::new(ctx),
        player,  // Use provided address (not tx_context::sender)
        // ... rest of fields ...
    };
    
    // Transfer to player
    transfer::transfer(session, player);
    
    // Emit event
    event::emit(ScoreSubmitted {
        player,
        // ... rest of event data ...
    });
}
```

---

### **Step 5: Update Score Submission Flow**

**Modify `saveScore()` function:**

```javascript
async function saveScore() {
  const name = document.getElementById('playerNameInput').value.trim();
  const score = currentGameScore;
  const walletAddress = window.WalletConnection.getWalletAddress();
  
  if (!walletAddress) {
    alert('Please connect your wallet first!');
    return;
  }

  // Get payment model choice
  const paymentModel = document.querySelector('input[name="paymentModel"]:checked')?.value || 'pay-per-game';
  
  // Check if user has active subscription
  if (paymentModel === 'subscription') {
    const subscriptionStatus = await window.APIClient.checkSubscription(walletAddress);
    
    if (!subscriptionStatus.isActive) {
      // Show subscription purchase UI
      document.getElementById('subscriptionPurchase').style.display = 'block';
      alert('You need an active subscription to submit scores. Subscribe now for unlimited games!');
      return;
    }
    
    // User has active subscription - no payment needed!
    // Just submit score (backend will cover gas from subscription)
    const result = await window.APIClient.submitScoreWithSubscription({
      walletAddress: walletAddress,
      scoreData: {
        score,
        distance: game.distance,
        coins: game.coins,
        bossesDefeated: game.bossesDefeated,
        tier: game.currentTier,
        livesRemaining: game.lives,
        projectileLevel: game.projectileLevel,
        // No startTime needed - using distance for validation
      }
    });
    
    if (result.success) {
      console.log('✅ Score submitted! Subscription covers gas fees.');
    }
    return;
  }

  // Pay-per-game model - proceed with payment
  // Get payment method choice
  const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'sui';
  
  // Get burn options
  const burnOption = document.querySelector('input[name="burnOption"]:checked')?.value || 'none';
  let burnOptions = { option: burnOption };
  
  if (burnOption === 'custom') {
    burnOptions.amount = parseInt(document.getElementById('burnAmount').value) || 0;
  } else if (burnOption === 'tier') {
    const selectedTier = document.querySelector('input[name="burnTier"]:checked')?.value || null;
    burnOptions.tier = selectedTier;
    burnOptions.tierAmount = parseInt(document.getElementById('burnTierAmountInput').value) || 0;
  }

  try {
    // Step 1: User pays (in chosen token) + optional burn
    const paymentResult = await window.WalletConnection.payForSubmission(
      paymentMethod, 
      null, 
      burnOptions
    );
    
    if (!paymentResult.success) {
      // Suggest alternative payment method
      if (paymentResult.canUseMews && paymentMethod === 'sui') {
        const useMews = confirm(
          `Insufficient SUI. Switch to $Mews payment?`
        );
        if (useMews) {
          return await saveScore(); // Retry with $Mews
        }
      }
      
      const skip = confirm(
        `Payment failed: ${paymentResult.error}\n\n` +
        `Skip blockchain submission and save locally only?`
      );
      if (skip) {
        // Save locally only...
        return;
      }
      return;
    }

    // Step 2: Calculate performance-based burn
    const performanceBurn = window.PerformanceBurn.calculatePerformanceBurn({
      enemiesDefeated: game.enemiesDefeated || 0,
      bossesDefeated: game.bossesDefeated || 0,
      distance: game.distance || 0,
      coins: game.coins || 0,
      score: score,
      coinBurnEnabled: game.coinBurnPreference !== false // Default to true
    });

    const performanceBurnAmount = performanceBurn.breakdown.total;
    const performanceBurnTier = window.PerformanceBurn.getPerformanceBurnTier(performanceBurnAmount);

    // Display performance burn to user
    if (performanceBurnAmount > 0) {
      console.log('🔥 Performance Burn Calculated:');
      console.log(performanceBurn.formatted);
      console.log(`Your Performance Tier: ${performanceBurnTier.name}`);
    }

    // Step 3: Send to backend for score submission with performance burn
    const result = await window.APIClient.submitScoreWithPayment({
      paymentTransactionHash: paymentResult.transactionHash,
      paymentMethod: paymentResult.paymentMethod,
      walletAddress: walletAddress, // Pass explicitly for sponsored transactions
      burnInfo: {
        amount: performanceBurnAmount, // Performance-based burn amount
        tier: performanceBurnTier.tier,
        breakdown: performanceBurn.breakdown, // Detailed breakdown
        type: 'performance' // Indicates this is performance-based, not manual
      },
      scoreData: {
        score,
        distance: game.distance,
        coins: game.coins,
        bossesDefeated: game.bossesDefeated,
        enemiesDefeated: game.enemiesDefeated || 0,
        tier: game.currentTier,
        livesRemaining: game.lives,
        projectileLevel: game.projectileLevel,
        // No startTime needed - using distance for validation,
        // Include performance metrics for burn calculation verification
        performanceMetrics: {
          enemies: game.enemiesDefeated || 0,
          bosses: game.bossesDefeated || 0,
          distance: game.distance || 0,
          coins: game.coins || 0
        }
      }
    });
    
    if (result.success) {
      console.log(`✅ Score submitted! Payment: ${paymentMethod}`);
      if (paymentMethod === 'sui' && result.mewsConverted) {
        console.log(`💰 Excess SUI converted to $Mews: ${result.mewsAmount}`);
      }
      if (result.burn && result.burn.success) {
        const burnBreakdown = performanceBurn.breakdown;
        console.log(`🔥 ${result.burn.amount} $Mews burned from your performance!`);
        console.log(`Breakdown:`);
        console.log(`  - Enemies: ${burnBreakdown.enemies} $Mews`);
        console.log(`  - Bosses: ${burnBreakdown.bosses} $Mews`);
        console.log(`  - Distance: ${burnBreakdown.distance} $Mews`);
        console.log(`  - Coins: ${burnBreakdown.coins} $Mews`);
        console.log(`  - Score Bonus: ${burnBreakdown.scoreBonus} $Mews`);
        
        alert(
          `🔥 ${result.burn.amount} $Mews burned from your performance!\n\n` +
          `Performance Breakdown:\n` +
          `• Enemies: ${burnBreakdown.enemies} $Mews\n` +
          `• Bosses: ${burnBreakdown.bosses} $Mews\n` +
          `• Distance: ${burnBreakdown.distance} $Mews\n` +
          `• Coins: ${burnBreakdown.coins} $Mews\n` +
          `• Score Bonus: ${burnBreakdown.scoreBonus} $Mews\n\n` +
          `Your Performance Tier: ${performanceBurnTier.name}\n\n` +
          `Thank you for your amazing gameplay!`
        );
      }
    }
  } catch (error) {
    console.error('Error:', error);
    // Fallback to local storage
  }
}
```

**`suitwo_game/sources/game_pass.move`:**

```move
module suitwo_game::game_pass {
    use sui::coin::{Self, Coin};
    use sui::event;
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    
    // Use your $Mews token type
    const MEWS_TOKEN_TYPE: vector<u8> = x"YOUR_MEWS_TOKEN_TYPE_ID"; // Replace with actual token type
    
    // Price per score submission in $Mews (with decimals)
    const SUBMISSION_FEE_MEWS: u64 = 1000_000_000_000; // 1000 $Mews (assuming 9 decimals)
    
    /// Game pass object (NFT) that allows sponsored submissions
    struct ScoreSubmissionPass has key, store {
        id: sui::object::UID,
        user: address,
        uses_remaining: u64,
        expires_at: u64
    }
    
    /// Event when pass is purchased
    struct PassPurchased has copy, drop {
        user: address,
        uses: u64,
        payment_amount: u64
    }
    
    /// Purchase a game pass for score submissions
    /// User pays in $Mews, backend will sponsor SUI gas
    public entry fun purchase_submission_pass(
        payment: Coin<MEWS_TOKEN>, // User pays in $Mews
        clock: &sui::clock::Clock,
        ctx: &mut TxContext
    ) {
        let user = tx_context::sender(ctx);
        let payment_amount = coin::value(&payment);
        
        // Validate payment
        assert!(payment_amount >= SUBMISSION_FEE_MEWS, 1); // Insufficient payment
        
        // Create pass (e.g., 10 uses or 30 days unlimited)
        let uses = 10; // Or unlimited if expires_at is set
        let expires_at = sui::clock::timestamp_ms(clock) + (30 * 24 * 60 * 60 * 1000); // 30 days
        
        let pass = ScoreSubmissionPass {
            id: sui::object::new(ctx),
            user,
            uses_remaining: uses,
            expires_at
        };
        
        // Transfer pass to user
        transfer::transfer(pass, user);
        
        // Transfer payment to game treasury (or burn)
        // transfer::public_transfer(payment, GAME_TREASURY_ADDRESS);
        
        event::emit(PassPurchased {
            user,
            uses,
            payment_amount
        });
    }
    
    /// Check if user has active pass
    public fun has_active_pass(pass: &ScoreSubmissionPass, clock: &sui::clock::Clock): bool {
        let now = sui::clock::timestamp_ms(clock);
        pass.uses_remaining > 0 && now < pass.expires_at
    }
    
    /// Use one pass credit (called by backend before sponsoring)
    public fun use_pass(pass: &mut ScoreSubmissionPass, clock: &sui::clock::Clock): bool {
        let now = sui::clock::timestamp_ms(clock);
        if (now >= pass.expires_at || pass.uses_remaining == 0) {
            return false
        };
        pass.uses_remaining = pass.uses_remaining - 1;
        true
    }
}
```

### **Step 6: Update API Route for Payment Processing**

**`backend/src/routes/scores.js`:**

```javascript
const express = require('express');
const router = express.Router();
const paymentProcessor = require('../services/payment-processor');

/**
 * POST /api/scores/submit-with-payment
 * Submit score with payment (SUI or $Mews)
 */
router.post('/submit-with-payment', async (req, res) => {
  try {
    const { 
      paymentTransactionHash, 
      paymentMethod, 
      walletAddress,
      scoreData 
    } = req.body;

    if (!paymentTransactionHash || !walletAddress || !scoreData) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let result;
    if (paymentMethod === 'sui') {
      // User paid in SUI - use for gas, convert excess to $Mews
      result = await paymentProcessor.processSUIPayment(paymentTransactionHash, {
        ...scoreData,
        playerAddress: walletAddress
      });
    } else {
      // User paid in $Mews - backend pays SUI gas
      result = await paymentProcessor.processMewsPayment(paymentTransactionHash, {
        ...scoreData,
        playerAddress: walletAddress
      });
    }

    res.json({
      success: true,
      transactionHash: result.scoreTxHash,
      paymentMethod: result.paymentMethod,
      mewsConverted: result.mewsAmount || null
    });
  } catch (error) {
    console.error('Error submitting score:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
```

---

## 🔄 Alternative: Keep Original Game Pass Contract Approach

If you prefer the game pass system from your other game:

```javascript
const { SuiClient, getFullnodeUrl } = require('@mysten/sui.js/client');
const { TransactionBlock } = require('@mysten/sui.js/transactions');
const { Ed25519Keypair } = require('@mysten/sui.js/keypairs/ed25519');
const { fromHEX } = require('@mysten/sui.js/utils');

class SponsoredTransactionService {
  constructor() {
    this.client = new SuiClient({ url: getFullnodeUrl(process.env.SUI_NETWORK || 'testnet') });
    
    // Game wallet that pays gas (loaded from env)
    const sponsorPrivateKey = process.env.SPONSOR_PRIVATE_KEY;
    if (!sponsorPrivateKey) {
      throw new Error('SPONSOR_PRIVATE_KEY must be set in environment');
    }
    this.sponsorKeypair = Ed25519Keypair.fromSecretKey(fromHEX(sponsorPrivateKey));
    this.sponsorAddress = this.sponsorKeypair.toSuiAddress();
  }

  /**
   * Build transaction for user to sign (user pays $Mews, we sponsor gas)
   * @param {Object} scoreData - Score data
   * @param {string} mewsPaymentCoinId - Coin ID of $Mews payment
   * @returns {TransactionBlock} Transaction ready for user signature
   */
  buildSponsoredScoreTransaction(scoreData, mewsPaymentCoinId) {
    const tx = new TransactionBlock();
    
    // Step 1: User transfers $Mews as payment
    const mewsCoin = tx.object(mewsPaymentCoinId);
    tx.transferObjects([mewsCoin], this.sponsorAddress); // Transfer to game treasury
    
    // Step 2: Submit score (user will sign this, but sponsor pays gas)
    tx.moveCall({
      target: `${process.env.GAME_SCORE_CONTRACT}::game::submit_game_session`,
      arguments: [
        tx.object('0x6'), // Clock object (standard Sui clock)
        tx.pure.u64(scoreData.score),
        tx.pure.u64(scoreData.distance),
        tx.pure.u64(scoreData.coins),
        tx.pure.u64(scoreData.bossesDefeated),
        tx.pure.u8(scoreData.tier),
        tx.pure.u8(scoreData.livesRemaining),
        tx.pure.u8(scoreData.projectileLevel),
                  // No startTime needed - using distance for validation
      ],
    });
    
    // Set gas budget
    tx.setGasBudget(parseInt(process.env.SUI_GAS_BUDGET || '10000000'));
    
    return tx;
  }

  /**
   * Sponsor a user's transaction (pay gas on their behalf)
   * 
   * IMPORTANT: This is a simplified pattern. Actual implementation depends on:
   * 1. Sui SDK version and sponsored transaction API availability
   * 2. Whether to use separate transactions or bundled approach
   * 
   * Pattern Option A: Separate Transactions (Simpler)
   * - User pays $Mews in Transaction 1
   * - Backend pays gas for Transaction 2 (score submission)
   * - User signs Transaction 2, backend executes it
   * 
   * Pattern Option B: Sponsored Transaction (If SDK supports)
   * - User signs transaction (no gas coin)
   * - Backend adds gas coin and executes
   * 
   * @param {TransactionBlock} tx - Transaction to sponsor
   * @param {string} userSignature - User's signature of the transaction
   * @returns {Promise<Object>} Transaction result
   */
  async sponsorAndExecute(tx, userSignature) {
    try {
      // Build sponsored transaction
      // In Sui, we can:
      // 1. Set gas payment to use sponsor's coin
      // 2. Execute with user's signature + sponsor's gas
      
      // Get sponsor's gas coin
      const sponsorGasCoins = await this.client.getCoins({
        owner: this.sponsorAddress,
        coinType: '0x2::sui::SUI',
      });
      
      if (sponsorGasCoins.data.length === 0) {
        throw new Error('Sponsor wallet has no SUI for gas');
      }
      
      // Use sponsor's gas coin
      tx.setGasPayment([{
        objectId: sponsorGasCoins.data[0].coinObjectId,
        version: sponsorGasCoins.data[0].version,
        digest: sponsorGasCoins.data[0].digest,
      }]);
      
      // Execute with user's signature (user signed) + sponsor's gas (we pay)
      // Note: This requires the transaction to be set up for sponsorship
      const result = await this.client.executeTransactionBlock({
        transactionBlock: await tx.build({ client: this.client }),
        signature: userSignature, // User signed
        options: {
          showEffects: true,
          showEvents: true,
        },
      });
      
      return {
        success: true,
        digest: result.digest,
        effects: result.effects
      };
    } catch (error) {
      console.error('Error sponsoring transaction:', error);
      throw error;
    }
  }
  
  /**
   * SIMPLER ALTERNATIVE: Two Separate Transactions
   * 
   * Pattern 1: User pays $Mews, then separate transaction for score
   * - Transaction 1: User transfers $Mews to game wallet (user pays gas ~$0.001)
   * - Transaction 2: Backend signs and executes score submission (backend pays gas)
   * 
   * Problem: Transaction 2 would have backend as sender (loses ownership)
   * 
   * Pattern 2: User signs, backend pays gas in same transaction
   * - Build transaction with score submission
   * - User signs transaction
   * - Backend adds gas coin and executes
   * - User remains sender (ownership preserved)
   * 
   * This requires verifying Sui SDK's exact sponsored transaction API
   */
  
  /**
   * Alternative Simple Pattern: Bundle Both Actions
   * User signs one transaction that does both:
   * 1. Transfer $Mews to game wallet
   * 2. Submit score
   * User pays SUI gas, but we charge $Mews (equivalent value)
   * 
   * This works but requires user to have SUI (defeats the purpose)
   */

  /**
   * Check if sponsor has enough SUI for gas
   */
  async checkSponsorBalance() {
    try {
      const balance = await this.client.getBalance({
        owner: this.sponsorAddress,
      });
      return {
        hasEnough: BigInt(balance.totalBalance) >= BigInt('1000000000'), // 1 SUI minimum
        balance: balance.totalBalance,
      };
    } catch (error) {
      return { hasEnough: false, balance: '0', error: error.message };
    }
  }
}

module.exports = new SponsoredTransactionService();
```

### **Step 3: Frontend - Pay $Mews Before Submission**

**Update `src/game/blockchain/wallet-connection.js`:**

```javascript
/**
 * Pay $Mews for score submission (game pass)
 */
async function payForSubmission(mewsAmount = 1000) {
  try {
    if (!isWalletConnected()) {
      return { success: false, error: 'Wallet not connected' };
    }

    // Get user's $Mews balance
    const mewsBalance = await getTokenBalance(process.env.MEWS_TOKEN_TYPE_ID);
    
    if (parseFloat(mewsBalance.totalBalance) < mewsAmount) {
      return {
        success: false,
        error: `Insufficient $Mews. Need ${mewsAmount}, have ${mewsBalance.totalBalance}`
      };
    }

    // Build transaction to transfer $Mews
    const tx = new TransactionBlock();
    
    // Split $Mews coin for payment
    const paymentCoin = tx.splitCoins(
      tx.gas, // Or get $Mews coin object
      [tx.pure.u64(mewsAmount * 1_000_000_000)] // Convert to smallest unit
    );
    
    // Transfer to game treasury
    tx.transferObjects([paymentCoin], process.env.GAME_TREASURY_ADDRESS);
    
    // Sign and execute
    const result = await signAndExecuteTransaction(tx);
    
    return {
      success: true,
      transactionHash: result.digest,
      paymentAmount: mewsAmount
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Add to exports
window.WalletConnection = {
  // ... existing ...
  payForSubmission
};
```

### **Step 4: Update Score Submission Flow**

**Modify `saveScore()` function:**

```javascript
async function saveScore() {
  const name = document.getElementById('playerNameInput').value.trim();
  const score = currentGameScore;
  const walletAddress = window.WalletConnection.getWalletAddress();
  
  if (!walletAddress) {
    alert('Please connect your wallet first!');
    return;
  }

  try {
    // Step 1: User pays $Mews (game pass)
    const paymentResult = await window.WalletConnection.payForSubmission(1000); // 1000 $Mews
    
    if (!paymentResult.success) {
      // Option: Allow skip, or require payment
      const skip = confirm(
        `Payment failed: ${paymentResult.error}\n\n` +
        `Skip blockchain submission and save locally only?`
      );
      if (skip) {
        // Save locally only...
        return;
      }
      return;
    }

    // Step 2: Build score submission transaction
    const scoreTx = buildScoreTransaction({
      score,
      distance: game.distance,
      coins: game.coins,
      bossesDefeated: game.bossesDefeated,
      tier: game.currentTier,
      livesRemaining: game.lives,
      projectileLevel: game.projectileLevel,
      startTime: game.startTime
    });

    // Step 3: User signs transaction
    const signedTx = await window.WalletConnection.signTransaction(scoreTx);
    
    // Step 4: Send to backend for sponsored execution
    const result = await window.APIClient.submitSponsoredScore({
      signedTransaction: signedTx,
      paymentTransactionHash: paymentResult.transactionHash
    });
    
    if (result.success) {
      console.log('✅ Score submitted! Backend sponsored gas fees.');
    }
  } catch (error) {
    console.error('Error:', error);
    // Fallback to local storage
  }
}
```

---

## 🔧 Alternative Technical Implementation (Simpler - Direct SUI Payment)

Add to wallet connection check:

```javascript
/**
 * Check if user has enough SUI for gas fees
 */
async function checkSUIBalance(walletAddress) {
  if (!window.WalletConnection || !window.WalletConnection.isWalletConnected()) {
    return { hasBalance: false, balance: '0', error: 'Wallet not connected' };
  }

  try {
    // Check SUI balance (SUI is the native token)
    const balance = await window.WalletConnection.getSUIBalance(walletAddress);
    
    const minSUIRequired = 0.002; // Small buffer (0.002 SUI)
    const hasEnough = parseFloat(balance) >= minSUIRequired;
    
    return {
      hasBalance: hasEnough,
      balance: balance,
      minRequired: minSUIRequired.toString(),
      estimatedCost: '0.001 SUI (~$0.001)'
    };
  } catch (error) {
    return { hasBalance: false, balance: '0', error: error.message };
  }
}
```

**Update wallet-connection.js:**

```javascript
/**
 * Get SUI balance (for gas fees)
 */
async function getSUIBalance(walletAddress) {
  try {
    if (!isWalletConnected()) {
      return '0';
    }

    // Query SUI balance (native token, coinType is '0x2::sui::SUI')
    const balance = await connectedWallet.getBalance({
      owner: walletAddress,
      coinType: '0x2::sui::SUI'
    });

    // Convert from MIST to SUI (1 SUI = 1,000,000,000 MIST)
    const suiBalance = parseFloat(balance.totalBalance) / 1_000_000_000;
    return suiBalance.toFixed(9);
  } catch (error) {
    console.error('Error getting SUI balance:', error);
    return '0';
  }
}

// Add to exports
window.WalletConnection = {
  // ... existing exports ...
  getSUIBalance
};
```

### **2. Show Gas Cost Estimate in UI**

Update score submission modal:

```html
<!-- In name input modal, after score display -->
<div class="gas-fee-info" id="gasFeeInfo" style="display: none;">
  <p class="gas-fee-text">
    💰 Gas Fee: ~0.001 SUI (~$0.001)
  </p>
  <p class="sui-balance-text" id="suiBalanceText">
    Your SUI Balance: <span id="currentSUIBalance">Checking...</span>
  </p>
  <p class="gas-fee-warning" id="gasFeeWarning" style="display: none; color: #ff6b6b;">
    ⚠️ Insufficient SUI. You need at least 0.002 SUI to submit.
  </p>
</div>
```

### **3. Check Balance Before Submission**

Update `saveScore()` function:

```javascript
async function saveScore() {
  const name = document.getElementById('playerNameInput').value.trim();
  const score = currentGameScore;
  const walletAddress = window.WalletConnection.getWalletAddress();
  
  if (!walletAddress) {
    alert('Please connect your wallet first!');
    return;
  }

  // Check SUI balance before submitting
  const suiBalance = await checkSUIBalance(walletAddress);
  
  if (!suiBalance.hasBalance) {
    // Show warning but allow skip
    const proceed = confirm(
      `Insufficient SUI for gas fees (need ${suiBalance.minRequired} SUI, have ${suiBalance.balance}).\n\n` +
      `Would you like to skip blockchain submission and save locally only?`
    );
    
    if (!proceed) {
      return; // User cancelled
    }
    
    // Save locally only (skip blockchain)
    leaderboard.push({ name, score, date: new Date().toLocaleDateString() });
    localStorage.setItem('gameLeaderboard', JSON.stringify(leaderboard));
    displayLeaderboard();
    hideNameInput();
    showMainMenu();
    return;
  }

  // Proceed with blockchain submission
  try {
    // Build transaction
    const tx = buildScoreTransaction({
      score,
      distance: game.distance,
      coins: game.coins,
      bossesDefeated: game.bossesDefeated,
      tier: game.currentTier,
      livesRemaining: game.lives,
      projectileLevel: game.projectileLevel,
      startTime: game.startTime // Track when game started
    });

    // Sign and execute (user pays gas here)
    const result = await window.WalletConnection.signAndExecuteTransaction(tx);
    
    if (result.success) {
      // Verify transaction via backend
      await window.APIClient.verifyScoreSubmission(result.digest);
      console.log('✅ Score submitted to blockchain!');
    }
  } catch (error) {
    console.error('Error submitting to blockchain:', error);
    // Fallback to local storage
    alert('Blockchain submission failed. Saving locally only.');
  }
  
  // Always save locally as backup
  leaderboard.push({ name, score, date: new Date().toLocaleDateString() });
  // ... rest of save logic
}
```

---

## 📊 User Experience Flow

### **Scenario 1: User Has SUI**

1. Game ends → Name input modal appears
2. Modal shows: "Gas Fee: ~0.001 SUI"
3. User clicks "Save Score"
4. Wallet pops up: "Sign transaction? (Gas: 0.001 SUI)"
5. User approves → Transaction executes → User pays ~$0.001
6. Score saved to blockchain ✅

### **Scenario 2: User Doesn't Have SUI**

1. Game ends → Name input modal appears
2. Modal shows: "⚠️ Insufficient SUI (need 0.002 SUI)"
3. User can:
   - **Option A:** Get SUI (link to exchange) → Return and submit
   - **Option B:** Skip blockchain submission → Save locally only
4. If skipping → Score saved to localStorage (not on-chain)

---

## 🎯 Recommendations

### **For MVP:**
1. ✅ **User pays gas fees** (simplest)
2. ✅ **Check SUI balance** before submission
3. ✅ **Allow skipping** blockchain submission if no SUI
4. ✅ **Show clear cost** (~$0.001 per submission)
5. ✅ **Save locally as backup** always

### **For Future:**
- Consider sponsoring transactions for high scores
- Bulk submission discounts
- Monthly subscription that includes gas fees

---

## 💡 Cost Considerations

### **User Perspective:**
- One game session = ~$0.001 to submit score
- 100 games = ~$0.10 total cost
- Very affordable for most users

### **Game Operator Perspective:**
- If sponsoring: 1000 submissions/day = $1/day = $30/month
- Can add as premium feature later
- Users with $Mews likely can afford $0.001 SUI

---

## 🔍 Understanding Gas Payment Requirements

### **Critical Point: Gas MUST Be Paid in SUI**

- ✅ Sui blockchain requires gas in SUI (native token)
- ✅ Cannot pay gas with $Mews directly
- ✅ But users can "pay" in either token for the service
- ✅ Backend converts payment → Pays SUI gas

### **Two Approaches:**

**Approach A: User Pays SUI → Direct Gas Payment**
- User transfers 0.002 SUI
- Backend uses 0.001 SUI for gas
- Backend converts 0.001 SUI → $Mews (optional)
- **Simple:** Direct SUI usage

**Approach B: User Pays $Mews → Backend Sponsors**
- User transfers 1000 $Mews
- Backend receives $Mews (value received)
- Backend uses its own SUI wallet to pay gas
- **Complex:** Requires backend SUI wallet

**Approach C: Hybrid (Best UX)**
- User chooses: Pay in SUI OR Pay in $Mews
- Both work, user picks what they have
- Backend handles conversion/execution

---

## 💡 Recommendation Summary

### **For MVP: Option 1 - Flexible Payment (SUI or $Mews)**

**Why:**
- ✅ Matches your existing game pass pattern
- ✅ Users only need $Mews (already required for gatekeeping)
- ✅ Better UX than requiring separate SUI
- ✅ Potential monetization if $Mews value > gas cost

**Implementation:**
1. Payment choice UI (let user pick SUI or $Mews)
2. SUI payment handler (use for gas, convert excess to $Mews)
3. $Mews payment handler (backend sponsors SUI gas)
4. Backend maintains SUI wallet (for $Mews payers)
5. Optional DEX integration (auto-convert SUI → $Mews)

**Cost Management:**

*If user pays SUI ($0.01 pricing):*
- User pays: 0.01 SUI (~$0.01)
- Backend uses: 0.001 SUI for gas (10% of payment)
- Backend converts: 0.009 SUI → $Mews (~4500 $Mews)
- Game receives: ~4500 $Mews value
- **Excellent margin:** 90% profit after gas

*If user pays $Mews ($0.01 equivalent):*
- User pays: 4500 $Mews (base, adjusts with token price)
- Backend cost: 0.001 SUI (~$0.001) for gas
- Game receives: 4500 $Mews (base payment)
- **Net profit:** 4500 $Mews minus gas equivalent
- Monitor $Mews/SUI exchange rate, adjust base fee dynamically if needed

*If user pays $Mews + burns tokens:*
- User pays: 1000 $Mews (base) + X $Mews (burn)
- Backend cost: 0.001 SUI (~$0.001) for gas
- **X $Mews permanently removed from supply** 🔥
- Game receives: 1000 $Mews (base only, burn is destroyed)
- Community benefit: Supply reduced, potential value increase
- User benefit: Recognition, badges, leaderboard status

**Token Burning Economics:**
- Burning creates deflationary pressure (reduces supply)
- If demand stays constant, reduced supply = higher price
- Users who burn get recognition (non-monetary incentive)
- Long-term holders benefit from reduced supply
- Game receives base payment, community benefits from burning

---

## ✅ Checklist (Option 1: $Mews Payment)

- [ ] Create game pass smart contract (`game_pass.move`)
- [ ] Backend wallet set up with SUI balance
- [ ] Sponsored transaction service implemented
- [ ] Frontend $Mews payment integration
- [ ] Backend sponsors gas after $Mews payment
- [ ] Test $Mews payment flow
- [ ] Test sponsored transaction execution
- [ ] Monitor SUI balance in sponsor wallet
- [ ] Set up alerts for low SUI balance
- [ ] Configure $Mews fee amount (adjustable)

---

## ✅ Checklist (Option 2: Direct SUI Payment)

- [ ] Add SUI balance check to wallet connection module
- [ ] Display gas fee estimate in score submission UI
- [ ] Check SUI balance before allowing submission
- [ ] Handle insufficient SUI gracefully (skip option)
- [ ] Show clear error messages
- [ ] Test with low SUI balance
- [ ] Test with zero SUI balance
- [ ] Ensure local storage fallback works

---

**Related Documents:**
- [Frontend Integration](./04-frontend-integration.md) - Where to add balance checks
- [Smart Contracts](./05-smart-contracts.md) - Contract that requires gas
- [Testing & Deployment](./06-testing-deployment.md) - Test gas fee flow

