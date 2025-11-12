module suitwo_game::score_submission {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use sui::clock::{Self, Clock};
    use sui::table::{Self, Table};
    use std::vector;

    // ===== CONSTANTS =====
    const MIN_DISTANCE: u64 = 35; // Minimum distance traveled (prevents instant submissions)
    const MIN_SCORE_FOR_SUBMISSION: u64 = 100; // Minimum score to submit
    
    // Score point values (for validation)
    const POINTS_PER_ENEMY_BASE: u64 = 15;
    const POINTS_PER_COIN: u64 = 10;
    const POINTS_PER_BOSS_BASE: u64 = 5000;
    // Note: boss_hits is now total damage dealt (not count), so no multiplication needed
    
    // ===== STRUCTS =====
    
    /// Registry to track used session IDs (prevents duplicate submissions)
    struct SessionRegistry has key {
        id: UID,
        used_sessions: Table<vector<u8>, bool>,  // session_id -> true if used
    }
    
    /// Complete game session statistics stored on-chain
    struct GameSession has key, store {
        id: UID,
        player: address,
        
        // Core statistics
        score: u64,
        distance: u64,
        coins: u64,
        bosses_defeated: u64,
        enemies_defeated: u64,
        longest_coin_streak: u64,
        
        // Player name (optional, empty vector if skipped)
        player_name: vector<u8>,
        
        // Session ID (for duplicate prevention)
        session_id: vector<u8>,
        
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
        enemies_defeated: u64,
        longest_coin_streak: u64,
        player_name: vector<u8>,
        session_id: vector<u8>,
        timestamp: u64,
    }

    // ===== INITIALIZATION =====
    
    /// Initialize the session registry (one-time setup)
    fun init(ctx: &mut TxContext) {
        let registry = SessionRegistry {
            id: object::new(ctx),
            used_sessions: table::new(ctx),
        };
        // Transfer to module owner or keep as shared object
        // For now, we'll make it a shared object so anyone can check
        transfer::share_object(registry);
    }
    
    // ===== VALIDATION FUNCTIONS =====
    
    /// Check if session ID has been used before
    fun is_session_used(registry: &SessionRegistry, session_id: vector<u8>): bool {
        table::contains(&registry.used_sessions, session_id)
    }
    
    /// Mark session ID as used
    fun mark_session_used(registry: &mut SessionRegistry, session_id: vector<u8>) {
        table::add(&mut registry.used_sessions, session_id, true);
    }
    
    /// Calculate exact expected score from boss tiers
    fun calculate_boss_score(boss_tiers: vector<u64>): u64 {
        let total = 0;
        let i = 0;
        let len = vector::length(&boss_tiers);
        while (i < len) {
            let tier = *vector::borrow(&boss_tiers, i);
            total = total + (POINTS_PER_BOSS_BASE * tier);
            i = i + 1;
        };
        total
    }
    
    /// Calculate exact expected score from enemy types
    fun calculate_enemy_score(enemy_types: vector<u64>): u64 {
        let total = 0;
        let i = 0;
        let len = vector::length(&enemy_types);
        while (i < len) {
            let enemy_type = *vector::borrow(&enemy_types, i);
            total = total + (POINTS_PER_ENEMY_BASE * enemy_type);
            i = i + 1;
        };
        total
    }
    
    /// Validate score makes sense based on game actions
    /// Uses exact calculations from boss_tiers and enemy_types arrays
    /// If arrays are empty or don't match counts, falls back to conservative estimates
    fun validate_score_logic(
        score: u64,
        coins: u64,
        bosses_defeated: u64,
        enemies_defeated: u64,
        distance: u64,
        boss_tiers: vector<u64>,
        enemy_types: vector<u64>,
        boss_hits: u64
    ): bool {
        // Minimum score required
        if (score < MIN_SCORE_FOR_SUBMISSION) {
            return false
        };
        
        // Score should have reasonable relationship to actions
        // NOTE: Coins and distance do NOT give score in the game - they are only tracked for other purposes
        
        // Calculate exact enemy score from types array
        let enemy_score_component = if (vector::length(&enemy_types) == enemies_defeated) {
            // Exact calculation: sum of (15 * type) for each enemy
            calculate_enemy_score(enemy_types)
        } else {
            // Fallback: use minimum (all type 1 enemies)
            enemies_defeated * POINTS_PER_ENEMY_BASE
        };
        
        // Calculate exact boss score from tiers array
        let boss_score_component = if (vector::length(&boss_tiers) == bosses_defeated) {
            // Exact calculation: sum of (5000 * tier) for each boss
            calculate_boss_score(boss_tiers)
        } else {
            // Fallback: use minimum (all tier 1 bosses)
            bosses_defeated * POINTS_PER_BOSS_BASE
        };
        
        // Boss hits contribute to score (points = damage dealt per hit, boss_hits is total damage)
        let boss_hit_score_component = boss_hits; // boss_hits is already total damage, no multiplication needed
        
        // Expected score: enemies + bosses + boss hits
        // NOTE: Coins and distance are tracked but do NOT contribute to score
        let expected_score = enemy_score_component + boss_score_component + boss_hit_score_component;
        
        // Score shouldn't be impossibly low compared to actions
        // Allow flexibility (90% of expected - accounts for minor variance in score tracking)
        // With exact score calculation (enemy types, boss tiers, boss hits), we consistently achieve 100% accuracy
        // 90% threshold provides safety margin while being stricter than 80% (previous: 25% → 75% → 80%)
        // This still allows for edge cases where players die early or score tracking has minor variance
        // The 10% buffer provides comfortable margin for legitimate gameplay variance
        if (expected_score > 0 && score < (expected_score * 90 / 100)) {
            return false
        };
        
        // Score shouldn't be impossibly high (20x expected is suspicious)
        if (score > (expected_score * 20)) {
            return false
        };
        
        true
    }
    
    /// Validate distance is reasonable (prevents instant submissions)
    fun validate_distance_minimum(
        distance: u64
    ): bool {
        // Must have traveled at least minimum distance (prevents instant submissions)
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
        enemies_defeated: u64,
        longest_coin_streak: u64,
        ctx: &mut TxContext
    ) {
        let player = tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);

        // ===== VALIDATION CHECKS =====
        
        // 1. Validate minimum distance (prevents instant submissions)
        assert!(validate_distance_minimum(distance), 1); // Error code 1: Distance too low
        
        // 2. Validate score logic (using empty arrays - fallback to conservative estimates)
        assert!(validate_score_logic(score, coins, bosses_defeated, enemies_defeated, distance, vector::empty<u64>(), vector::empty<u64>(), 0), 2); // Error code 2: Invalid score
        
        // 3. Validate coins aren't impossibly high (e.g., 1000+ coins suggests cheating)
        assert!(coins <= 1000, 3); // Error code 3: Coin count too high
        
        // 4. Validate longest coin streak is reasonable (can't exceed coins collected)
        assert!(longest_coin_streak <= coins, 4); // Error code 4: Coin streak exceeds coins
        
        // ===== CREATE SESSION OBJECT =====
        
        let session = GameSession {
            id: object::new(ctx),
            player,
            score,
            distance,
            coins,
            bosses_defeated,
            enemies_defeated,
            longest_coin_streak,
            player_name: vector::empty<u8>(),  // Empty for backward compatibility
            session_id: vector::empty<u8>(),  // Empty for backward compatibility
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
            enemies_defeated,
            longest_coin_streak,
            player_name: vector::empty<u8>(),  // Empty for backward compatibility
            session_id: vector::empty<u8>(),  // Empty for backward compatibility
            timestamp: current_time,
        });
    }

    /// Submit a game session on behalf of a player (admin signs, player address provided)
    /// This allows the admin wallet to submit scores for any player
    /// Admin wallet pays gas fees
    public entry fun submit_game_session_for_player(
        registry: &mut SessionRegistry,  // Session registry for duplicate prevention
        player: address,  // Explicit player address (user's wallet)
        clock: &Clock,
        score: u64,
        distance: u64,
        coins: u64,
        bosses_defeated: u64,
        enemies_defeated: u64,
        longest_coin_streak: u64,
        player_name: vector<u8>,  // Player name (empty if skipped)
        session_id: vector<u8>,  // Unique session ID
        boss_tiers: vector<u64>,  // Array of boss tiers (for exact score calculation)
        enemy_types: vector<u64>,  // Array of enemy types (for exact score calculation)
        boss_hits: u64,  // Number of boss hits (50 points each)
        ctx: &mut TxContext
    ) {
        let current_time = clock::timestamp_ms(clock);

        // ===== VALIDATION CHECKS =====
        
        // 0. Check for duplicate session ID (prevents replay attacks)
        assert!(!is_session_used(registry, session_id), 0); // Error code 0: Duplicate session ID
        
        // 1. Validate minimum distance (prevents instant submissions)
        assert!(validate_distance_minimum(distance), 1); // Error code 1: Distance too low
        
        // 2. Validate score logic (using exact calculations from arrays)
        assert!(validate_score_logic(score, coins, bosses_defeated, enemies_defeated, distance, boss_tiers, enemy_types, boss_hits), 2); // Error code 2: Invalid score
        
        // 3. Validate coins aren't impossibly high (e.g., 1000+ coins suggests cheating)
        assert!(coins <= 1000, 3); // Error code 3: Coin count too high
        
        // 4. Validate longest coin streak is reasonable (can't exceed coins collected)
        assert!(longest_coin_streak <= coins, 4); // Error code 4: Coin streak exceeds coins
        
        // Mark session ID as used (prevent duplicates)
        mark_session_used(registry, session_id);
        
        // ===== CREATE SESSION OBJECT =====
        
        let session = GameSession {
            id: object::new(ctx),
            player,  // Use provided player address (not tx_context::sender)
            score,
            distance,
            coins,
            bosses_defeated,
            enemies_defeated,
            longest_coin_streak,
            player_name,  // Player name (empty if skipped)
            session_id,  // Session ID
            timestamp: current_time,
        };

        // Transfer ownership to player (ownership proof)
        transfer::transfer(session, player);

        // Emit comprehensive event for leaderboard queries
        event::emit(ScoreSubmitted {
            player,  // User's wallet address
            score,
            distance,
            coins,
            bosses_defeated,
            enemies_defeated,
            longest_coin_streak,
            player_name,  // Player name
            session_id,  // Session ID
            timestamp: current_time,
        });
    }

    // ===== VIEW FUNCTIONS =====
    
    /// Get complete session data
    public fun get_session_data(session: &GameSession): (
        address,      // player
        u64,          // score
        u64,          // distance
        u64,          // coins
        u64,          // bosses_defeated
        u64,          // enemies_defeated
        u64,          // longest_coin_streak
        vector<u8>,   // player_name
        vector<u8>,   // session_id
        u64           // timestamp
    ) {
        (
            session.player,
            session.score,
            session.distance,
            session.coins,
            session.bosses_defeated,
            session.enemies_defeated,
            session.longest_coin_streak,
            session.player_name,
            session.session_id,
            session.timestamp,
        )
    }
}

