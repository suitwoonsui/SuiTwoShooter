# Sui Smart Contracts (Move)

## 📦 Phase 4: Sui Smart Contracts (Move) (Week 3-4)

This phase covers creating and deploying Move smart contracts for on-chain score tracking with comprehensive game statistics and anti-cheat validation.

**Note:** Use your existing smart contract examples (`Sui Smart Contract Examples/`) as **guides** for patterns, but build this contract specifically for your space shooter game mechanics.

---

## Step 4.1: Set Up Move Development Environment

```bash
# Install Sui CLI
cargo install --locked --git https://github.com/MystenLabs/sui.git --branch devnet sui

# Verify installation
sui --version

# Initialize new Sui package
sui move new suitwo_game
cd suitwo_game
```

---

## Step 4.2: Create Game Score Contract

**`suitwo_game/sources/score_submission.move`:**

```move
module suitwo_game::game {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use sui::clock::{Self, Clock};

    // ===== CONSTANTS =====
    const MIN_DISTANCE: u64 = 35; // Minimum distance traveled (prevents instant submissions)
    const MIN_SCORE_FOR_SUBMISSION: u64 = 100; // Minimum score to submit
    const MAX_TIER: u8 = 4; // Maximum game tier
    
    // Score point values (for validation)
    const POINTS_PER_ENEMY_BASE: u64 = 15;
    const POINTS_PER_COIN: u64 = 10;
    const POINTS_PER_BOSS_BASE: u64 = 5000;
    
    // ===== STRUCTS =====
    
    /// Complete game session statistics stored on-chain
    struct GameSession has key, store {
        id: UID,
        player: address,
        
        // Core statistics
        score: u64,
        distance: u64,
        coins: u64,
        bosses_defeated: u64,
        tier: u8,
        
        // Game state at end
        lives_remaining: u8,
        projectile_level: u8,
        
        // Timestamp
        timestamp: u64,
    }

    /// Event emitted when score is submitted (for leaderboard queries)
    struct ScoreSubmitted has copy, drop {
        player: address,
        score: u64,
        distance: u64,
        coins: u64,
        bosses_defeated: u64,
        tier: u8,
        timestamp: u64,
    }

    // ===== VALIDATION FUNCTIONS =====
    
    /// Validate score makes sense based on game actions
    fun validate_score_logic(
        score: u64,
        coins: u64,
        bosses_defeated: u64,
        distance: u64
    ): bool {
        // Minimum score required
        if (score < MIN_SCORE_FOR_SUBMISSION) {
            return false
        };
        
        // Score should have reasonable relationship to actions
        // Coins contribute to score (10 points each)
        let coin_score_component = coins * POINTS_PER_COIN;
        
        // Bosses contribute significantly (5000 * tier each)
        let boss_score_component = bosses_defeated * POINTS_PER_BOSS_BASE;
        
        // Distance also contributes to score (via continuous points)
        // Minimum expected score: coins + bosses + some distance component
        let min_expected_score = coin_score_component + boss_score_component + (distance / 10);
        
        // Score shouldn't be impossibly low compared to actions
        // Allow some flexibility (70% of minimum expected)
        if (score < (min_expected_score * 70 / 100)) {
            return false
        };
        
        // Score shouldn't be impossibly high (10x minimum expected is suspicious)
        if (score > (min_expected_score * 10)) {
            return false
        };
        
        true
    }
    
    /// Validate tier progression makes sense
    fun validate_tier_progression(
        tier: u8,
        bosses_defeated: u64
    ): bool {
        // Tier should be 1-4
        if (tier == 0 || tier > MAX_TIER) {
            return false
        };
        
        // Tier progression: tier increases with bosses defeated
        // Formula: tier = bossesDefeated + 1 (capped at 4)
        // No overlap: Each boss count maps to exactly one tier
        // Tier 1 = 0 bosses, Tier 2 = 1 boss, Tier 3 = 2 bosses, Tier 4 = 3+ bosses
        let expected_tier = if (bosses_defeated == 0) { 1 }
                            else {
                                let calculated = bosses_defeated + 1;
                                if (calculated > 4) { 4 } else { calculated }
                            };
        
        // Tier must match exactly (no overlap)
        // 0 bosses → tier 1, 1 boss → tier 2, 2 bosses → tier 3, 3+ bosses → tier 4
        tier == expected_tier
    }
    
    /// Validate distance is reasonable (prevents instant submissions)
    fun validate_distance_minimum(
        distance: u64
    ): bool {
        // Must have traveled at least minimum distance (prevents instant submissions)
        // Minimum distance = roughly equivalent to 10 seconds of gameplay
        const MIN_DISTANCE: u64 = 35; // Approximate minimum distance for 10 seconds
        distance >= MIN_DISTANCE
    }

    // ===== MAIN FUNCTIONS =====
    
    /// Submit a complete game session with all statistics
    /// Ownership validation: sender() must be the player (built into Sui - can't fake sender)
    public entry fun submit_game_session(
        clock: &Clock,
        score: u64,
        distance: u64,
        coins: u64,
        bosses_defeated: u64,
        tier: u8,
        lives_remaining: u8,
        projectile_level: u8,
        ctx: &mut TxContext
    ) {
        let player = tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);

        // ===== VALIDATION CHECKS =====
        
        // 1. Validate minimum distance (prevents instant submissions)
        assert!(validate_distance_minimum(distance), 1); // Error code 1: Distance too low
        
        // 2. Validate score logic
        assert!(validate_score_logic(score, coins, bosses_defeated, distance), 2); // Error code 2: Invalid score
        
        // 3. Validate tier progression
        assert!(validate_tier_progression(tier, bosses_defeated), 3); // Error code 3: Invalid tier
        
        // 4. Validate lives (0-3 is reasonable for this game)
        assert!(lives_remaining <= 3, 4); // Error code 4: Invalid lives
        
        // 5. Validate projectile level (1-6 based on game mechanics)
        assert!(projectile_level >= 1 && projectile_level <= 6, 5); // Error code 5: Invalid projectile level
        
        // 6. Validate coins aren't impossibly high (e.g., 1000+ coins suggests cheating)
        assert!(coins <= 1000, 6); // Error code 6: Coin count too high
        
        // ===== CREATE SESSION OBJECT =====
        
        let session = GameSession {
            id: object::new(ctx),
            player,
            score,
            distance,
            coins,
            bosses_defeated,
            tier,
            lives_remaining,
            projectile_level,
            timestamp: current_time,
        };

        // Transfer ownership to player (ownership proof)
        transfer::transfer(session, player);

        // Emit comprehensive event for leaderboard queries
        event::emit(ScoreSubmitted {
            player,
            score,
            distance,
            coins,
            bosses_defeated,
            tier,
            timestamp: current_time,
        });
    }

    // ===== VIEW FUNCTIONS =====
    
    /// Get complete session data
    public fun get_session_data(session: &GameSession): (
        address,  // player
        u64,      // score
        u64,      // distance
        u64,      // coins
        u64,      // bosses_defeated
        u8,       // tier
        u8,       // lives_remaining
        u8,       // projectile_level
        u64       // timestamp
    ) {
        (
            session.player,
            session.score,
            session.distance,
            session.coins,
            session.bosses_defeated,
            session.tier,
                    session.lives_remaining,
                    session.projectile_level,
                    session.timestamp,
        )
    }
}
```

---

## Step 4.3: Add Move.toml Configuration

Create `Move.toml` in your package root:

```toml
[package]
name = "suitwo_game"
version = "1.0.0"

[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "framework/testnet" }

[addresses]
suitwo_game = "0x0"
```

---

## Step 4.4: Add Tests (Optional but Recommended)

Create `suitwo_game/sources/score_submission.test.move`:

```move
#[test_only]
module suitwo_game::game_tests {
    use sui::test_scenario::{Self, Scenario};
    use sui::clock;
    use suitwo_game::game;
    
    #[test]
    fun test_valid_score_submission() {
        let mut scenario = test_scenario::begin(@0x123);
        let clock = clock::create_for_testing(&mut scenario);
        
        // Create player
        let player = @0x123;
        scenario.set_sender(player);
        
        // Submit valid game session
        game::submit_game_session(
            &clock,
            5000,        // score
            10000,       // distance
            50,          // coins
            2,           // bosses_defeated
            2,           // tier
            2,           // lives_remaining
            3,           // projectile_level
            // No start_time needed - we use distance for validation
            scenario.ctx()
        );
        
        test_scenario::end(scenario);
    }
    
    #[test]
    #[expected_failure(abort_code = 1)] // Game too short
    fun test_too_short_game() {
        let mut scenario = test_scenario::begin(@0x123);
        let clock = clock::create_for_testing(&mut scenario);
        let player = @0x123;
        scenario.set_sender(player);
        
        // Submit game with very short duration
        game::submit_game_session(
            &clock,
            100,
            100,
            1,
            0,
            1,
            3,
            1,
            clock::timestamp_ms(&clock) - 1000, // Only 1 second
            scenario.ctx()
        );
        
        test_scenario::end(scenario);
    }
}
```

---

## Step 4.5: Deploy Contracts

```bash
# Build the package
sui move build

# Run tests (if created)
sui move test

# Deploy to testnet (you'll need to set up a Sui wallet first)
sui client publish --gas-budget 10000000

# After deployment, you'll get:
# - Package ID (use for GAME_SCORE_CONTRACT in .env)
# - Object IDs for created GameSession objects (owned by players)
```

### Update Environment Variables

After deployment, update your backend `.env` file with the contract address:

```env
# Smart Contract Configuration
GAME_SCORE_CONTRACT=0x[YOUR_PACKAGE_ID]::game
# Example: GAME_SCORE_CONTRACT=0xabc123::game
```

**Note:** The leaderboard is built from `ScoreSubmitted` events, so no separate leaderboard contract is needed!

---

## Step 4.6: Understanding the Contract Design

### **Statistics Captured:**
- ✅ `score` - Total game score
- ✅ `distance` - Distance traveled (in game units) - **Primary metric for validation**
- ✅ `coins` - Coins collected
- ✅ `bosses_defeated` - Number of bosses defeated
- ✅ `tier` - Game tier reached (1-4)
- ✅ `lives_remaining` - Lives left at game end
- ✅ `projectile_level` - Magic orb level reached
- ✅ `timestamp` - When score was submitted

### **Anti-Cheat Measures (Space Shooter Specific):**
1. **Minimum Distance**: 35 units minimum (prevents instant submissions)
2. **Score Logic Validation**: Score must correlate with actions (coins, bosses, distance)
3. **Tier Progression Check**: Tier must match bosses defeated progression
4. **Lives Validation**: Lives must be 0-3 (game mechanics)
5. **Projectile Level Validation**: Must be 1-6 (game mechanics)
6. **Coin Limit**: Maximum 1000 coins (prevents impossible coin counts)
7. **Ownership Validation**: Sui automatically ensures `tx_context::sender()` matches player (can't fake ownership)

### **Security Features:**
- **Ownership-Based**: Each `GameSession` is owned by the player (stored in their wallet)
- **Event-Driven Leaderboard**: Query `ScoreSubmitted` events for leaderboard (no centralized state)
- **Validation Before Storage**: Invalid scores rejected at contract level
- **Immutable Records**: Once submitted, scores cannot be modified

---

## ✅ Checklist

- [ ] Sui CLI installed
- [ ] Move package initialized (`sui move new suitwo_game`)
- [ ] `Move.toml` configured
- [ ] Game contract created with all statistics
- [ ] Anti-cheat validations implemented
- [ ] Tests created (optional but recommended)
- [ ] Contracts compiled successfully (`sui move build`)
- [ ] Tests passing (`sui move test`)
- [ ] Deployed to testnet (`sui client publish`)
- [ ] Contract package ID added to backend `.env`
- [ ] Verified event emission works (`ScoreSubmitted` event)

---

## 🔄 Next Steps

- [06. Testing & Deployment](./06-testing-deployment.md) - Test the full integration
- [08. Security Considerations](./08-security-considerations.md) - Review contract security

---

## 🔍 Using Your Existing Examples as Guides

Your `Sui Smart Contract Examples/` directory contains useful patterns:

### **From ActivityManager:**
- ✅ **Clock Integration**: Use `Clock` object for accurate timestamps (like we do)
- ✅ **Duration Validation**: Minimum duration checks (adapted for game sessions)
- ✅ **Ownership Checks**: Built into Sui via `tx_context::sender()`

### **From AnalyticsSystem:**
- ✅ **Event Emission**: Comprehensive events for leaderboard queries
- ✅ **Data Structure**: Storing complete statistics (not just scores)

### **What We DON'T Need (Keep It Simple):**
- ❌ **Table Management**: We use events, not tables (simpler for MVP)
- ❌ **Tier Calculation**: We accept tier from frontend (already calculated)
- ❌ **Admin Controls**: Not needed for MVP
- ❌ **Rate Limiting**: Handled on backend, not in contract

**Key Difference:** This contract is **simpler** than your examples because:
- We query events for leaderboard (no table needed)
- Statistics come from frontend (already validated client-side)
- Ownership is automatic (Sui's built-in security)
- Focus is on **data integrity** (validation) not complex state management

---

## 📚 Additional Resources

- [Sui Move Language Docs](https://docs.sui.io/build/move)
- [Sui Events Documentation](https://docs.sui.io/build/events)
- [Move Examples](https://github.com/MystenLabs/sui/tree/main/sdk/typescript/examples)

---

**Related Documents:**
- [Sui SDK Integration](./03-sui-sdk-integration.md) - How backend calls this contract
- [Frontend Integration](./04-frontend-integration.md) - How frontend submits scores
- [Testing & Deployment](./06-testing-deployment.md) - Test the full flow

