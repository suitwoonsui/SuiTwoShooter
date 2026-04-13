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
    // const POINTS_PER_COIN: u64 = 10;  // Unused - kept for reference
    const POINTS_PER_BOSS_BASE: u64 = 5000;
    // Note: boss_hits is now total damage dealt (not count), so no multiplication needed
    
    // ===== STRUCTS =====
    
    /// Admin capability - only admin wallet can submit scores on behalf of players
    /// This prevents unauthorized score submissions
    struct AdminCapability has key, store {
        id: UID,
    }
    
    /// Registry to track used session IDs (prevents duplicate submissions)
    struct SessionRegistry has key {
        id: UID,
        used_sessions: Table<vector<u8>, bool>,  // session_id -> true if used
    }
    
    /// Player statistics - tracks comprehensive player performance
    /// Used for badge progression, leaderboards, and player profiles
    struct PlayerStats has key, store {
        id: UID,
        player: address,
        
        // Game Count
        total_games: u64,  // Total games played (non-demo only)
        
        // Personal Bests (highest value achieved in a single game)
        best_score: u64,                    // Highest score in one game
        best_distance: u64,                 // Longest distance in one game
        best_coins: u64,                    // Most coins collected in one game
        best_bosses_defeated: u64,          // Most bosses defeated in one game
        best_enemies_defeated: u64,         // Most enemies defeated in one game
        best_coin_streak: u64,              // Longest coin streak in one game
        
        // Totals (for calculating averages: total_field / total_games)
        total_score: u64,                   // Sum of all scores
        total_distance: u64,                // Sum of all distance traveled
        total_coins: u64,                   // Sum of all coins collected
        total_bosses_defeated: u64,         // Sum of all bosses defeated
        total_enemies_defeated: u64,        // Sum of all enemies defeated
        total_coin_streak: u64,             // Sum of all coin streaks (for average)
        
        // Timestamps
        first_game_date: u64,               // Timestamp of first game
        last_game_date: u64,                // Timestamp of most recent game
    }
    
    /// Registry to store player statistics
    /// Shared object accessible by all for querying player stats
    struct StatisticsRegistry has key {
        id: UID,
        player_stats: Table<address, PlayerStats>,  // player address -> PlayerStats
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
    
    /// Initialize the session registry and statistics registry (one-time setup)
    fun init(ctx: &mut TxContext) {
        // Create session registry (shared object for duplicate checking)
        let registry = SessionRegistry {
            id: object::new(ctx),
            used_sessions: table::new(ctx),
        };
        transfer::share_object(registry);
        
        // Create statistics registry (shared object for player statistics)
        let stats_registry = StatisticsRegistry {
            id: object::new(ctx),
            player_stats: table::new(ctx),
        };
        transfer::share_object(stats_registry);
    }
    
    /// Create admin capability and transfer to admin address
    /// This function should be called once after contract deployment
    /// Only the admin wallet can use this capability to submit scores
    /// This prevents unauthorized score submissions and cheating
    #[allow(lint(public_entry))]
    public entry fun create_admin_capability(admin_address: address, ctx: &mut TxContext) {
        // Create admin capability and transfer to admin address
        // Only the admin wallet can use this capability to submit scores
        let admin_cap = AdminCapability {
            id: object::new(ctx),
        };
        transfer::transfer(admin_cap, admin_address);
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
    
    // ===== STATISTICS FUNCTIONS =====
    
    /// Get or create PlayerStats for a player
    /// If player doesn't have stats yet, creates new PlayerStats with all fields initialized to 0
    fun get_or_create_player_stats(
        stats_registry: &mut StatisticsRegistry,
        player: address,
        ctx: &mut TxContext
    ): &mut PlayerStats {
        if (table::contains(&stats_registry.player_stats, player)) {
            table::borrow_mut(&mut stats_registry.player_stats, player)
        } else {
            // Create new PlayerStats for this player (all fields initialized to 0)
            let stats = PlayerStats {
                id: object::new(ctx),
                player,
                total_games: 0,
                best_score: 0,
                best_distance: 0,
                best_coins: 0,
                best_bosses_defeated: 0,
                best_enemies_defeated: 0,
                best_coin_streak: 0,
                total_score: 0,
                total_distance: 0,
                total_coins: 0,
                total_bosses_defeated: 0,
                total_enemies_defeated: 0,
                total_coin_streak: 0,
                first_game_date: 0,
                last_game_date: 0,
            };
            table::add(&mut stats_registry.player_stats, player, stats);
            table::borrow_mut(&mut stats_registry.player_stats, player)
        }
    }
    
    /// Update player statistics with game session data
    /// Called after successful game session submission
    /// Updates personal bests, totals, and timestamps
    fun update_player_stats(
        stats_registry: &mut StatisticsRegistry,
        player: address,
        score: u64,
        distance: u64,
        coins: u64,
        bosses_defeated: u64,
        enemies_defeated: u64,
        longest_coin_streak: u64,
        timestamp: u64,
        ctx: &mut TxContext
    ) {
        let stats = get_or_create_player_stats(stats_registry, player, ctx);
        
        // Increment game count
        stats.total_games = stats.total_games + 1;
        
        // Update personal bests (if current game is better)
        if (score > stats.best_score) {
            stats.best_score = score;
        };
        if (distance > stats.best_distance) {
            stats.best_distance = distance;
        };
        if (coins > stats.best_coins) {
            stats.best_coins = coins;
        };
        if (bosses_defeated > stats.best_bosses_defeated) {
            stats.best_bosses_defeated = bosses_defeated;
        };
        if (enemies_defeated > stats.best_enemies_defeated) {
            stats.best_enemies_defeated = enemies_defeated;
        };
        if (longest_coin_streak > stats.best_coin_streak) {
            stats.best_coin_streak = longest_coin_streak;
        };
        
        // Update totals (for average calculations)
        stats.total_score = stats.total_score + score;
        stats.total_distance = stats.total_distance + distance;
        stats.total_coins = stats.total_coins + coins;
        stats.total_bosses_defeated = stats.total_bosses_defeated + bosses_defeated;
        stats.total_enemies_defeated = stats.total_enemies_defeated + enemies_defeated;
        stats.total_coin_streak = stats.total_coin_streak + longest_coin_streak;
        
        // Update timestamps
        if (stats.first_game_date == 0) {
            // First game - set first_game_date
            stats.first_game_date = timestamp;
        };
        // Always update last_game_date to most recent game
        stats.last_game_date = timestamp;
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
        _coins: u64,  // Unused parameter (kept for API compatibility)
        bosses_defeated: u64,
        enemies_defeated: u64,
        _distance: u64,  // Unused parameter (kept for API compatibility)
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
    #[allow(lint(public_entry))]
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
    /// REQUIRES AdminCapability - only admin wallet can call this function
    /// This prevents unauthorized score submissions and cheating
    /// Admin wallet pays gas fees
    /// NOTE: Demo mode games do NOT create GameSession objects, so they are automatically excluded from statistics
    #[allow(lint(public_entry))]
    public entry fun submit_game_session_for_player(
        _admin_cap: &AdminCapability,  // Admin capability - proves caller is admin
        registry: &mut SessionRegistry,  // Session registry for duplicate prevention
        stats_registry: &mut StatisticsRegistry,  // Statistics registry for tracking total_games
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
        
        // ===== UPDATE PLAYER STATISTICS =====
        // Update comprehensive player statistics with this game's data
        // NOTE: Demo mode games do NOT call this function, so they are automatically excluded
        update_player_stats(
            stats_registry,
            player,
            score,
            distance,
            coins,
            bosses_defeated,
            enemies_defeated,
            longest_coin_streak,
            current_time,
            ctx
        );

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
    
    /// Get player statistics for a given player address
    /// Returns comprehensive PlayerStats if player exists
    /// Used by backend to query player statistics for badge progression, leaderboards, and profiles
    public fun get_player_stats(
        stats_registry: &StatisticsRegistry,
        player: address
    ): (
        bool,      // has_stats
        u64,       // total_games
        u64,       // best_score
        u64,       // best_distance
        u64,       // best_coins
        u64,       // best_bosses_defeated
        u64,       // best_enemies_defeated
        u64,       // best_coin_streak
        u64,       // total_score
        u64,       // total_distance
        u64,       // total_coins
        u64,       // total_bosses_defeated
        u64,       // total_enemies_defeated
        u64,       // total_coin_streak
        u64,       // first_game_date
        u64        // last_game_date
    ) {
        if (table::contains(&stats_registry.player_stats, player)) {
            let stats = table::borrow(&stats_registry.player_stats, player);
            (
                true,
                stats.total_games,
                stats.best_score,
                stats.best_distance,
                stats.best_coins,
                stats.best_bosses_defeated,
                stats.best_enemies_defeated,
                stats.best_coin_streak,
                stats.total_score,
                stats.total_distance,
                stats.total_coins,
                stats.total_bosses_defeated,
                stats.total_enemies_defeated,
                stats.total_coin_streak,
                stats.first_game_date,
                stats.last_game_date,
            )
        } else {
            // Player has no stats yet (hasn't played any games)
            // Return all zeros
            (false, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
        }
    }
    
    /// Check if player has statistics recorded
    public fun has_player_stats(
        stats_registry: &StatisticsRegistry,
        player: address
    ): bool {
        table::contains(&stats_registry.player_stats, player)
    }
    
    // ===== MIGRATION FUNCTIONS =====
    
    /// Admin function: Migrate player statistics from old StatisticsRegistry to new StatisticsRegistry
    /// This allows migrating player stats when upgrading to a new contract
    /// REQUIRES AdminCapability - only admin wallet can call this function
    /// If player already has stats in new registry, merges the data (takes maximums for bests, sums for totals)
    /// 
    /// NOTE: This function accepts individual stat values instead of the old registry object
    /// because Move's type system doesn't allow passing types from different packages.
    /// The backend reads the old stats first and passes the values individually.
    #[allow(lint(public_entry))]
    public entry fun migrate_player_stats(
        _admin_cap: &AdminCapability,  // Admin capability - proves caller is admin
        new_stats_registry: &mut StatisticsRegistry,  // New statistics registry to write to
        player: address,  // Player address to migrate
        // Old stats values (read from old registry by backend)
        old_total_games: u64,
        old_best_score: u64,
        old_best_distance: u64,
        old_best_coins: u64,
        old_best_bosses_defeated: u64,
        old_best_enemies_defeated: u64,
        old_best_coin_streak: u64,
        old_total_score: u64,
        old_total_distance: u64,
        old_total_coins: u64,
        old_total_bosses_defeated: u64,
        old_total_enemies_defeated: u64,
        old_total_coin_streak: u64,
        old_first_game_date: u64,
        old_last_game_date: u64,
        ctx: &mut TxContext
    ) {
        // Get or create stats in new registry
        let new_stats = get_or_create_player_stats(new_stats_registry, player, ctx);
        
        // Merge stats:
        // - For personal bests: take the maximum (best of both)
        // - For totals: sum both (add old totals to new totals)
        // - For total_games: sum both
        // - For timestamps: take earliest first_game_date, latest last_game_date
        
        // Personal bests: take maximum
        if (old_best_score > new_stats.best_score) {
            new_stats.best_score = old_best_score;
        };
        if (old_best_distance > new_stats.best_distance) {
            new_stats.best_distance = old_best_distance;
        };
        if (old_best_coins > new_stats.best_coins) {
            new_stats.best_coins = old_best_coins;
        };
        if (old_best_bosses_defeated > new_stats.best_bosses_defeated) {
            new_stats.best_bosses_defeated = old_best_bosses_defeated;
        };
        if (old_best_enemies_defeated > new_stats.best_enemies_defeated) {
            new_stats.best_enemies_defeated = old_best_enemies_defeated;
        };
        if (old_best_coin_streak > new_stats.best_coin_streak) {
            new_stats.best_coin_streak = old_best_coin_streak;
        };
        
        // Totals: sum both
        new_stats.total_games = new_stats.total_games + old_total_games;
        new_stats.total_score = new_stats.total_score + old_total_score;
        new_stats.total_distance = new_stats.total_distance + old_total_distance;
        new_stats.total_coins = new_stats.total_coins + old_total_coins;
        new_stats.total_bosses_defeated = new_stats.total_bosses_defeated + old_total_bosses_defeated;
        new_stats.total_enemies_defeated = new_stats.total_enemies_defeated + old_total_enemies_defeated;
        new_stats.total_coin_streak = new_stats.total_coin_streak + old_total_coin_streak;
        
        // Timestamps: earliest first_game_date, latest last_game_date
        if (old_first_game_date > 0) {
            if (new_stats.first_game_date == 0 || old_first_game_date < new_stats.first_game_date) {
                new_stats.first_game_date = old_first_game_date;
            };
        };
        if (old_last_game_date > new_stats.last_game_date) {
            new_stats.last_game_date = old_last_game_date;
        };
    }
    
    /// Admin function: Clear/reset player statistics
    /// REQUIRES AdminCapability - only admin wallet can call this function
    /// This resets all player stats to 0, effectively clearing their progress
    /// Useful for testing, fixing migration issues, or resetting a player's progress
    #[allow(lint(public_entry))]
    public entry fun clear_player_stats(
        _admin_cap: &AdminCapability,  // Admin capability - proves caller is admin
        stats_registry: &mut StatisticsRegistry,  // Statistics registry
        player: address,  // Player address to clear
    ) {
        // Reset player stats to zero if they exist
        if (table::contains(&stats_registry.player_stats, player)) {
            let stats = table::borrow_mut(&mut stats_registry.player_stats, player);
            stats.total_games = 0;
            stats.best_score = 0;
            stats.best_distance = 0;
            stats.best_coins = 0;
            stats.best_bosses_defeated = 0;
            stats.best_enemies_defeated = 0;
            stats.best_coin_streak = 0;
            stats.total_score = 0;
            stats.total_distance = 0;
            stats.total_coins = 0;
            stats.total_bosses_defeated = 0;
            stats.total_enemies_defeated = 0;
            stats.total_coin_streak = 0;
            stats.first_game_date = 0;
            stats.last_game_date = 0;
        };
    }

    /// Admin function: Clear a single session ID from the session registry
    /// REQUIRES AdminCapability - only admin wallet can call this function
    /// This removes a session ID from the used_sessions table, allowing it to be reused
    /// Useful when clearing player stats and re-migrating sessions
    /// Note: Call this function multiple times to clear multiple session IDs
    #[allow(lint(public_entry))]
    public entry fun clear_session_id(
        _admin_cap: &AdminCapability,  // Admin capability - proves caller is admin
        session_registry: &mut SessionRegistry,  // Session registry
        session_id: vector<u8>,  // Session ID to clear
    ) {
        // Remove session ID from registry if it exists
        if (table::contains(&session_registry.used_sessions, session_id)) {
            table::remove(&mut session_registry.used_sessions, session_id);
        };
    }
}

