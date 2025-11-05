# Tier System: Complete Guide

## 🎯 Overview

Tiers are **per-game difficulty levels** that control gameplay mechanics, rewards, and progression. They are **NOT user labels** - a player might reach Tier 4 in one game but Tier 2 in the next.

---

## 🎮 Game Tiers (Difficulty Levels 1-4)

### **Tier Progression**

**Formula:** `tier = Math.min(4, bossesDefeated + 1)`

**No overlap - each boss count maps to exactly one tier:**
- **Tier 1** = 0 bosses defeated (start of game)
- **Tier 2** = 1 boss defeated
- **Tier 3** = 2 bosses defeated
- **Tier 4** = 3+ bosses defeated (capped at 4)

### **Tier Breakdown**

#### **Tier 1 (Beginner)**
- **Trigger:** Start of game (0 bosses defeated)
- **Boss:** Tier 1 Boss (400 HP, 1500ms fire rate, 3 patterns) - Boss_Scammer
- **Boss Points:** 5,000 points when defeated (5000 × tier)
- **Enemy Types:** Only Tier 1 enemies (100% spawn rate)
- **Enemy Points:** 15 points per enemy

#### **Tier 2 (Intermediate)**
- **Trigger:** After 1 boss defeated
- **Boss:** Tier 2 Boss (600 HP, 1200ms fire rate, 4 patterns) - Boss_Market_Maker
- **Boss Points:** 10,000 points when defeated (5000 × tier)
- **Enemy Types:** Mix of Tier 1 (70%) and Tier 2 (30%) enemies
- **Enemy Points:** 15 (Tier 1) or 30 (Tier 2) points per enemy

#### **Tier 3 (Advanced)**
- **Trigger:** After 2 bosses defeated
- **Boss:** Tier 3 Boss (800 HP, 1000ms fire rate, 5 patterns) - Boss_Bear
- **Boss Points:** 15,000 points when defeated (5000 × tier)
- **Enemy Types:** Mix of Tier 1 (50%), Tier 2 (30%), and Tier 3 (20%) enemies
- **Enemy Points:** 15 (Tier 1), 30 (Tier 2), or 50 (Tier 3) points per enemy

#### **Tier 4 (Expert)**
- **Trigger:** After 3+ bosses defeated (capped at tier 4)
- **Boss:** Tier 4 Boss (1000 HP, 800ms fire rate, 6 patterns) - Boss_Shadow_Figure
- **Boss Points:** 20,000 points when defeated (5000 × tier)
- **Enemy Types:** All tier types - Tier 1 (30%), Tier 2 (25%), Tier 3 (25%), Tier 4 (20%)
- **Enemy Points:** 15, 30, 50, or 80 points per enemy (based on tier)
- **After Tier 4:** Game continues with tier 4 difficulty (bosses 4+ all use tier 4)

---

## 🎮 What Tiers Control (Gameplay Mechanics)

### **1. Boss Difficulty**

| Tier | Boss HP | Fire Rate | Patterns | Visual Boss |
|------|---------|-----------|----------|-------------|
| Tier 1 | 400 HP | 1500ms | 3 patterns | Boss_Scammer |
| Tier 2 | 600 HP | 1200ms | 4 patterns | Boss_Market_Maker |
| Tier 3 | 800 HP | 1000ms | 5 patterns | Boss_Bear |
| Tier 4 | 1000 HP | 800ms | 6 patterns | Boss_Shadow_Figure |

**Impact:** Higher tiers = harder bosses = longer fights = more skill required

### **2. Enemy Spawn System**

Tiers control which enemy types can spawn and their spawn rates:
- **Tier 1:** Only easy enemies (100% Tier 1)
- **Tier 2:** Mix of easy and medium (70% Tier 1, 30% Tier 2)
- **Tier 3:** Mix of all but hardest (50% Tier 1, 30% Tier 2, 20% Tier 3)
- **Tier 4:** All enemy types (30% Tier 1, 25% Tier 2, 25% Tier 3, 20% Tier 4)

### **3. Scoring System**

**Boss Points Formula:** `5000 × tier`

| Tier | Boss Points | Total if All 4 Bosses Defeated |
|------|-------------|----------------------------------|
| Tier 1 | 5,000 | 5,000 |
| Tier 2 | 10,000 | 15,000 |
| Tier 3 | 15,000 | 30,000 |
| Tier 4 | 20,000 | 50,000 |

**Impact:** Higher tiers = exponentially more points = better leaderboard position

### **4. Performance-Based Token Burning**

**Boss Burn Rewards:**
- Tier 1 Boss: 100 $Mews base
- Tier 2 Boss: 150 $Mews (1.5× multiplier)
- Tier 3 Boss: 200 $Mews (2× multiplier)
- Tier 4 Boss: 250 $Mews (2.5× multiplier)

**Impact:** Higher tiers = more token burns = increased scarcity = community value

### **5. Anti-Cheat Validation**

**Smart Contract Validation:**
- Tier must exactly match `bossesDefeated + 1` (capped at 4)
- Prevents fake scores (can't claim Tier 4 with 0 bosses)
- Validates tier progression makes sense

---

## 🔥 Burn Tiers (Performance Categories)

**Burn tiers are also per-game**, not user labels. They categorize performance based on burn amount in that specific game.

| Burn Tier | Amount Range | Recognition |
|-----------|--------------|------------|
| **Bronze** | 100-499 $Mews | Basic badge |
| **Silver** | 500-1,999 $Mews | Silver badge + leaderboard highlight |
| **Gold** | 2,000-9,999 $Mews | Gold badge + special recognition |
| **Whale** | 10,000+ $Mews | Permanent hall of fame |

**Example:** Player A burns 500 $Mews (Silver) in Game 1, burns 100 $Mews (Bronze) in Game 2.

---

## ✅ Per-Game vs Per-User (Important Clarification)

### **✅ What Tiers ARE**

**Per-Game Metrics:**
- **Game Tier (1-4):** Difficulty level reached in that specific game
- **Burn Tier (Bronze/Silver/Gold/Whale):** Performance category for that specific game
- **Stored:** In `GameSession` and `TokensBurned` events on blockchain (one per game)

**Example:**
- Player A reaches Tier 4 in Game 1 → "Score: 50,000 (Tier 4)"
- Player A reaches Tier 2 in Game 2 → "Score: 15,000 (Tier 2)"
- Both are valid - performance varies per game!

### **❌ What Tiers ARE NOT**

**We do NOT label users with persistent tiers:**
- ❌ "This user is a Tier 4 player" (tier varies per game)
- ❌ "This user is a Gold Burner" (burn tier varies per game)
- ❌ User profile showing "Your Tier: 4" (no persistent tier)

### **✅ Aggregate Stats (Optional)**

**Can be calculated from all games:**
- **Highest Tier Reached:** Max `tier` across all games (e.g., "Best: Tier 4")
- **Total Burned:** Sum of all `TokensBurned` events (e.g., "Lifetime: 5,000 $Mews")
- **Average Score:** Average `score` across all games (e.g., "Avg: 25,000")
- **Total Games Played:** Count of all `GameSession` objects

These are calculated stats, not persistent labels.

---

## 📊 Leaderboard Display

**What to show per entry:**

```
Leaderboard Entry:
- Player: 0x1234...5678
- Score: 50,000
- Tier: 4 (reached in this game)
- Date: 2024-01-15
```

**NOT:**
- ❌ "Player: 0x1234...5678 (Tier 4 Player)" - tier is per-game, not per-user

---

## 🔒 Token Access Tiers (NOT Used)

**Token access tiers would be different token requirements for different access levels:**

**Example (Not Your System):**
- Tier 1 Access: 100,000 $Mews → Basic features
- Tier 2 Access: 500,000 $Mews → Full game access
- Tier 3 Access: 1,000,000 $Mews → Premium features

**Your System:** Single token requirement (500,000 $Mews) for all players - **no access tiers!**

The `tier` field in your smart contract refers to **game difficulty tier** (1-4), **NOT** token access tier.

---

## 🔍 Smart Contract Data

### **Per-Game Session (What We Store):**

```move
struct GameSession {
    player: address,        // Who played
    tier: u8,               // Tier reached THIS game (1-4)
    score: u64,             // Score THIS game
    bosses_defeated: u64,   // Bosses THIS game
    distance: u64,          // Distance THIS game
    coins: u64,             // Coins THIS game
    // ... other stats for THIS game
}
```

### **Per-Game Burn (What We Store):**

```move
struct TokensBurned {
    player: address,        // Who burned
    amount: u64,            // Amount THIS game
    burn_tier: u8,          // Tier THIS game (1=Bronze, 2=Silver, 3=Gold, 4=Whale)
    // ... other stats for THIS game
}
```

**NOT Stored:**
- ❌ User's "current tier" (doesn't exist - varies per game)
- ❌ User's "persistent tier label" (doesn't exist)

---

## 📝 Summary

| Concept | Scope | Example | Purpose |
|---------|-------|---------|---------|
| **Game Tier** | Per-game | Tier 4 in Game 1, Tier 2 in Game 2 | Difficulty & rewards |
| **Burn Tier** | Per-game | Silver in Game 1, Bronze in Game 2 | Performance category |
| **User Label** | ❌ Not used | No "Tier 4 Player" label | - |
| **Aggregate Stats** | ✅ Can calculate | "Highest Tier: 4" (best ever) | Lifetime achievements |

**Key Takeaways:**
1. ✅ Tiers are **per-game mechanics** that control difficulty, rewards, and progression
2. ✅ Tiers are **NOT user labels** - performance varies game-to-game
3. ✅ Leaderboard shows tier **for that specific game**, not user's "tier"
4. ✅ Aggregate stats (highest tier, total burned) can be calculated from all games

---

## 🎯 Why Tiers Exist

Tiers are **core gameplay mechanics** that:

1. ✅ **Scale difficulty** - Game gets harder as you progress in that game
2. ✅ **Scale rewards** - Better performance in that game gets more points/burns
3. ✅ **Provide progression** - Clear milestones each game (Tier 1 → Tier 2 → Tier 3 → Tier 4)
4. ✅ **Enable anti-cheat** - Tier must match bosses defeated (prevents fake scores)
5. ✅ **Show performance** - Leaderboard shows "Score: 50,000 (Tier 4)" - the tier achieved in that specific game

**Without tiers, the game would be:**
- ❌ Same difficulty throughout (boring)
- ❌ No sense of progression (unmotivating)
- ❌ No reward scaling (unfair to skilled players)
- ❌ Harder to prevent cheating (no validation)

---

**Related Documents:**
- [05. Smart Contracts](./05-smart-contracts.md) - Tier validation in contract
- [05a. Gas Fees & Payments](./05a-gas-fees-and-payments.md) - Tier-based burn rewards
- [07. Token Gatekeeping](./07-token-gatekeeping.md) - Single token requirement

