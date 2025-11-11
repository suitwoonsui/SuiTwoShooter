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
    
    /// Validate score makes sense based on game actions
    fun validate_score_logic(
        score: u64,
        coins: u64,
        bosses_defeated: u64,
        enemies_defeated: u64,
        distance: u64
    ): bool {
        // Minimum score required
        if (score < MIN_SCORE_FOR_SUBMISSION) {
            return false
        };
        
        // Score should have reasonable relationship to actions
        // Coins contribute to score (10 points each)
        let coin_score_component = coins * POINTS_PER_COIN;
        
        // Enemies contribute to score (15 points each)
        let enemy_score_component = enemies_defeated * POINTS_PER_ENEMY_BASE;
        
        // Bosses contribute significantly (5000 * tier each)
        let boss_score_component = bosses_defeated * POINTS_PER_BOSS_BASE;
        
        // Distance also contributes to score (via continuous points)
        // Minimum expected score: coins + enemies + bosses + some distance component
        let min_expected_score = coin_score_component + enemy_score_component + boss_score_component + (distance / 10);
        
        // Score shouldn't be impossibly low compared to actions
        // Allow some flexibility (50% of minimum expected - more lenient for early game)
        if (score < (min_expected_score * 50 / 100)) {
            return false
        };
        
        // Score shouldn't be impossibly high (20x minimum expected is suspicious)
        if (score > (min_expected_score * 20)) {
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
        
        // 2. Validate score logic
        assert!(validate_score_logic(score, coins, bosses_defeated, enemies_defeated, distance), 2); // Error code 2: Invalid score
        
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
        ctx: &mut TxContext
    ) {
        let current_time = clock::timestamp_ms(clock);

        // ===== VALIDATION CHECKS =====
        
        // 0. Check for duplicate session ID (prevents replay attacks)
        assert!(!is_session_used(registry, session_id), 0); // Error code 0: Duplicate session ID
        
        // 1. Validate minimum distance (prevents instant submissions)
        assert!(validate_distance_minimum(distance), 1); // Error code 1: Distance too low
        
        // 2. Validate score logic
        assert!(validate_score_logic(score, coins, bosses_defeated, enemies_defeated, distance), 2); // Error code 2: Invalid score
        
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

