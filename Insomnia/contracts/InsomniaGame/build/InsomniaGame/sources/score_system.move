module insomnia_game::score_system {
    use sui::table::{Self, Table};
    use sui::event;

    // ===== CONSTANTS =====
    const SKILL_TIER_BEGINNER: u8 = 0;
    const SKILL_TIER_INTERMEDIATE: u8 = 1;
    const SKILL_TIER_ADVANCED: u8 = 2;
    const SKILL_TIER_EXPERT: u8 = 3;
    const SKILL_TIER_MASTER: u8 = 4;

    // ===== STRUCTS =====
    public struct PlayerStats has key, store {
        id: sui::object::UID,
        player: address,
        
        // Game counts
        total_games: u64,
        
        // Single game personal bests
        personal_best_score: u64,        // Highest score in one game
        personal_best_clicks: u64,       // Most clicks in one game  
        personal_best_time: u64,         // Longest survival time in seconds
        personal_best_efficiency: u64,   // Best efficiency (clicks/sec * 1000)
        
        // Cumulative totals for averages
        total_score: u64,                // Sum of all scores
        total_clicks: u64,               // Sum of all clicks
        total_time_elapsed: u64,         // Sum of all time survived (seconds)
        total_efficiency: u64,           // Sum of all efficiency scores (clicks/sec * 1000)
        
        // Calculated averages
        average_score: u64,              // total_score / total_games
        average_clicks_per_game: u64,    // total_clicks / total_games
        average_time_per_game: u64,      // total_time_elapsed / total_games
        average_efficiency: u64,         // total_efficiency / total_games
        
        // Skill tier and metadata
        highest_endurance_level: u8,    // Highest endurance level achieved
        current_skill_tier: u8,
        last_played: u64
    }

    public struct SkillTierUpdated has copy, drop {
        player: address,
        old_tier: u8,
        new_tier: u8,
        timestamp: u64
    }

    /// Event emitted when player stats are updated
    public struct PlayerStatsUpdated has copy, drop {
        player: address,
        new_score: u64,
        new_endurance_level: u8,
        new_skill_tier: u8,
        timestamp: u64
    }

    /// Enhanced event emitted when player stats are updated with new metrics
    public struct EnhancedPlayerStatsUpdated has copy, drop {
        player: address,
        new_score: u64,
        clicks: u64,
        time_elapsed: u64,
        time_bonus: u64,
        efficiency_bonus: u64,
        efficiency: u64,  // clicks/sec * 1000
        new_endurance_level: u8,
        new_skill_tier: u8,
        timestamp: u64
    }

    /// Event emitted when player reaches a new endurance level milestone
    public struct EnduranceLevelAchieved has copy, drop {
        player: address,
        new_endurance_level: u8,
        endurance_tier_name: u8, // 0=Beginner, 1=Intermediate, 2=Advanced, 3=Expert, 4=Master
        timestamp: u64
    }

    // ===== CAPABILITIES =====
    public struct ScoreSystem has key {
        id: sui::object::UID,
        admin_address: address,
        player_stats_table: Table<address, PlayerStats>,
        authorized_contracts: Table<address, bool>,  // Whitelist of authorized game contracts
        is_paused: bool  // Emergency pause functionality
    }

    // ===== FUNCTIONS =====

    /// Initialize the score system
    fun init(ctx: &mut sui::tx_context::TxContext) {
        let mut score_system = ScoreSystem {
            id: sui::object::new(ctx),
            admin_address: sui::tx_context::sender(ctx),
            player_stats_table: table::new(ctx),
            authorized_contracts: table::new(ctx),
            is_paused: false
        };

        // Add the deploying contract as the first authorized contract
        let deployer = sui::tx_context::sender(ctx);
        table::add(&mut score_system.authorized_contracts, deployer, true);

        sui::transfer::share_object(score_system);
    }

    /// Add an authorized game contract (admin only)
    public fun add_authorized_contract(
        score_system: &mut ScoreSystem,
        contract_address: address,
        ctx: &mut sui::tx_context::TxContext
    ) {
        assert!(sui::tx_context::sender(ctx) == score_system.admin_address, 0);
        assert!(!score_system.is_paused, 1);
        
        if (!table::contains(&score_system.authorized_contracts, contract_address)) {
            table::add(&mut score_system.authorized_contracts, contract_address, true);
        };
    }

    /// Remove an authorized game contract (admin only)
    public fun remove_authorized_contract(
        score_system: &mut ScoreSystem,
        contract_address: address,
        ctx: &mut sui::tx_context::TxContext
    ) {
        assert!(sui::tx_context::sender(ctx) == score_system.admin_address, 0);
        assert!(!score_system.is_paused, 1);
        
        if (table::contains(&score_system.authorized_contracts, contract_address)) {
            table::remove(&mut score_system.authorized_contracts, contract_address);
        };
    }

    /// Emergency pause the scoring system (admin only)
    public fun pause_scoring(
        score_system: &mut ScoreSystem,
        ctx: &mut sui::tx_context::TxContext
    ) {
        assert!(sui::tx_context::sender(ctx) == score_system.admin_address, 0);
        score_system.is_paused = true;
    }

    /// Resume the scoring system (admin only)
    public fun resume_scoring(
        score_system: &mut ScoreSystem,
        ctx: &mut sui::tx_context::TxContext
    ) {
        assert!(sui::tx_context::sender(ctx) == score_system.admin_address, 0);
        score_system.is_paused = false;
    }

    /// Check if a contract is authorized to update scores
    fun is_contract_authorized(score_system: &ScoreSystem, contract_address: address): bool {
        table::contains(&score_system.authorized_contracts, contract_address)
    }

    /// Get or create player stats for a player (only from authorized contracts)
    public fun get_or_create_player_stats(
        score_system: &mut ScoreSystem,
        player: address,
        contract_address: address,  // Must be authorized
        ctx: &mut sui::tx_context::TxContext
    ): &mut PlayerStats {
        // Security checks
        assert!(!score_system.is_paused, 2);
        assert!(is_contract_authorized(score_system, contract_address), 3);

        if (table::contains(&score_system.player_stats_table, player)) {
            table::borrow_mut(&mut score_system.player_stats_table, player)
        } else {
            let new_stats = PlayerStats {
                id: sui::object::new(ctx),
                player,
                total_games: 0,
                personal_best_score: 0,
                personal_best_clicks: 0,
                personal_best_time: 0,
                personal_best_efficiency: 0,
                total_score: 0,
                total_clicks: 0,
                total_time_elapsed: 0,
                total_efficiency: 0,
                average_score: 0,
                average_clicks_per_game: 0,
                average_time_per_game: 0,
                average_efficiency: 0,
                highest_endurance_level: 0,
                current_skill_tier: SKILL_TIER_BEGINNER,
                last_played: 0
            };
            table::add(&mut score_system.player_stats_table, player, new_stats);
            table::borrow_mut(&mut score_system.player_stats_table, player)
        }
    }

    /// Game owner can submit scores directly (bypasses contract authorization)
    /// This function allows the game owner to submit scores for any player
    public fun submit_score_as_game_owner(
        score_system: &mut ScoreSystem,
        player: address,
        final_score: u64,
        clicks: u64,
        time_elapsed: u64,        // in seconds
        time_bonus: u64,          // time survival bonus
        efficiency_bonus: u64,    // efficiency bonus
        current_time: u64,
        ctx: &mut sui::tx_context::TxContext
    ) {
        // Security check: only the admin (game owner) can call this function
        let game_owner = sui::tx_context::sender(ctx);
        assert!(game_owner == score_system.admin_address, 0);
        assert!(!score_system.is_paused, 1);

        // Get or create player stats
        let player_stats = if (table::contains(&score_system.player_stats_table, player)) {
            table::borrow_mut(&mut score_system.player_stats_table, player)
        } else {
            let new_stats = PlayerStats {
                id: sui::object::new(ctx),
                player,
                total_games: 0,
                personal_best_score: 0,
                personal_best_clicks: 0,
                personal_best_time: 0,
                personal_best_efficiency: 0,
                total_score: 0,
                total_clicks: 0,
                total_time_elapsed: 0,
                total_efficiency: 0,
                average_score: 0,
                average_clicks_per_game: 0,
                average_time_per_game: 0,
                average_efficiency: 0,
                highest_endurance_level: 0,
                current_skill_tier: SKILL_TIER_BEGINNER,
                last_played: 0
            };
            table::add(&mut score_system.player_stats_table, player, new_stats);
            table::borrow_mut(&mut score_system.player_stats_table, player)
        };

        // Rate limiting removed for fast-paced gameplay
        // let time_since_last_update = current_time - player_stats.last_score_update;
        // assert!(time_since_last_update >= score_system.rate_limit_window, 4);
        
        // Update timestamp for rate limiting
        // player_stats.last_score_update = current_time; // Removed

        let old_skill_tier = player_stats.current_skill_tier;
        player_stats.total_games = player_stats.total_games + 1;
        player_stats.last_played = current_time;

        // Calculate efficiency (clicks per second * 1000 for fixed-point precision)
        let efficiency = if (time_elapsed > 0) {
            (clicks * 1000) / time_elapsed
        } else {
            0
        };

        // Update personal bests
        if (final_score > player_stats.personal_best_score) {
            player_stats.personal_best_score = final_score;
        };
        if (clicks > player_stats.personal_best_clicks) {
            player_stats.personal_best_clicks = clicks;
        };
        if (time_elapsed > player_stats.personal_best_time) {
            player_stats.personal_best_time = time_elapsed;
        };
        if (efficiency > player_stats.personal_best_efficiency) {
            player_stats.personal_best_efficiency = efficiency;
        };

        // Update cumulative totals
        player_stats.total_score = player_stats.total_score + final_score;
        player_stats.total_clicks = player_stats.total_clicks + clicks;
        player_stats.total_time_elapsed = player_stats.total_time_elapsed + time_elapsed;
        player_stats.total_efficiency = player_stats.total_efficiency + efficiency;

        // Calculate new averages
        player_stats.average_score = player_stats.total_score / player_stats.total_games;
        player_stats.average_clicks_per_game = player_stats.total_clicks / player_stats.total_games;
        player_stats.average_time_per_game = player_stats.total_time_elapsed / player_stats.total_games;
        player_stats.average_efficiency = player_stats.total_efficiency / player_stats.total_games;

        // Calculate endurance level (time survival in seconds)
        let endurance_level = if (time_elapsed >= 120) { 120 } else { time_elapsed as u8 };

        // Update highest endurance level
        if (endurance_level > player_stats.highest_endurance_level) {
            player_stats.highest_endurance_level = endurance_level;
            
            // Emit endurance level achievement event
            let endurance_tier = if (endurance_level >= 120) { 4 } // Master: 2+ minutes
            else if (endurance_level >= 90) { 3 }                  // Expert: 1.5+ minutes
            else if (endurance_level >= 60) { 2 }                  // Advanced: 1+ minute
            else if (endurance_level >= 30) { 1 }                  // Intermediate: 30+ seconds
            else { 0 };                                             // Beginner: 0-30 seconds
            
            event::emit(EnduranceLevelAchieved {
                player: player_stats.player,
                new_endurance_level: endurance_level,
                endurance_tier_name: endurance_tier,
                timestamp: current_time
            });
        };

        // Calculate new skill tier based on time endurance + performance
        let new_skill_tier = calculate_skill_tier(player_stats.average_score, player_stats.highest_endurance_level);
        player_stats.current_skill_tier = new_skill_tier;

        // Emit skill tier updated event if different
        if (old_skill_tier != new_skill_tier) {
            event::emit(SkillTierUpdated {
                player: player_stats.player,
                old_tier: old_skill_tier,
                new_tier: new_skill_tier,
                timestamp: current_time
            });
        };

        // Emit enhanced player stats updated event
        event::emit(EnhancedPlayerStatsUpdated {
            player: player_stats.player,
            new_score: final_score,
            clicks,
            time_elapsed,
            time_bonus,
            efficiency_bonus,
            efficiency,
            new_endurance_level: endurance_level,
            new_skill_tier,
            timestamp: current_time
        });

        // Also emit the legacy event for backward compatibility
        event::emit(PlayerStatsUpdated {
            player: player_stats.player,
            new_score: final_score,
            new_endurance_level: endurance_level,
            new_skill_tier,
            timestamp: current_time
        });
    }

    /// Update player statistics and skill tier (only from authorized contracts)
    /// This function combines getting/creating stats and updating them to avoid borrow conflicts
    public fun update_player_stats_integrated(
        score_system: &mut ScoreSystem,
        player: address,
        contract_address: address,  // Must be authorized
        new_score: u64,
        new_endurance_level: u8,
        current_time: u64,
        ctx: &mut sui::tx_context::TxContext
    ) {
        // Security checks
        assert!(!score_system.is_paused, 2);
        assert!(is_contract_authorized(score_system, contract_address), 3);

        let player_stats = if (table::contains(&score_system.player_stats_table, player)) {
            table::borrow_mut(&mut score_system.player_stats_table, player)
        } else {
            let new_stats = PlayerStats {
                id: sui::object::new(ctx),
                player,
                total_games: 0,
                personal_best_score: 0,
                personal_best_clicks: 0,
                personal_best_time: 0,
                personal_best_efficiency: 0,
                total_score: 0,
                total_clicks: 0,
                total_time_elapsed: 0,
                total_efficiency: 0,
                average_score: 0,
                average_clicks_per_game: 0,
                average_time_per_game: 0,
                average_efficiency: 0,
                highest_endurance_level: 0,
                current_skill_tier: SKILL_TIER_BEGINNER,
                last_played: 0
            };
            table::add(&mut score_system.player_stats_table, player, new_stats);
            table::borrow_mut(&mut score_system.player_stats_table, player)
        };

        // Rate limiting removed for fast-paced gameplay
        // let time_since_last_update = current_time - player_stats.last_score_update;
        // assert!(time_since_last_update >= score_system.rate_limit_window, 4);
        
        // Update timestamp for rate limiting
        // player_stats.last_score_update = current_time; // Removed

        let old_skill_tier = player_stats.current_skill_tier;
        player_stats.total_games = player_stats.total_games + 1;
        player_stats.last_played = current_time;

        // Update personal best score
        if (new_score > player_stats.personal_best_score) {
            player_stats.personal_best_score = new_score;
        };

        // Update highest endurance level (time survival)
        if (new_endurance_level > player_stats.highest_endurance_level) {
            player_stats.highest_endurance_level = new_endurance_level;
            
            // Emit endurance level achievement event
            let endurance_tier = if (new_endurance_level >= 120) { 4 } // Master: 2+ minutes
            else if (new_endurance_level >= 90) { 3 }                  // Expert: 1.5+ minutes
            else if (new_endurance_level >= 60) { 2 }                  // Advanced: 1+ minute
            else if (new_endurance_level >= 30) { 1 }                  // Intermediate: 30+ seconds
            else { 0 };                                                 // Beginner: 0-30 seconds
            
            event::emit(EnduranceLevelAchieved {
                player: player_stats.player,
                new_endurance_level: new_endurance_level,
                endurance_tier_name: endurance_tier,
                timestamp: current_time
            });
        };

        // Update average score (weighted by total games)
        let total_score = player_stats.average_score * (player_stats.total_games - 1) + new_score;
        player_stats.average_score = total_score / player_stats.total_games;

        // Calculate new skill tier based on time endurance + performance
        let new_skill_tier = calculate_skill_tier(player_stats.average_score, player_stats.highest_endurance_level);
        player_stats.current_skill_tier = new_skill_tier;

        // Emit skill tier updated event if different
        if (old_skill_tier != new_skill_tier) {
            event::emit(SkillTierUpdated {
                player: player_stats.player,
                old_tier: old_skill_tier,
                new_tier: new_skill_tier,
                timestamp: current_time
            });
        };

        // Emit player stats updated event
        event::emit(PlayerStatsUpdated {
            player: player_stats.player,
            new_score,
            new_endurance_level,
            new_skill_tier,
            timestamp: current_time
        });
    }

    /// Update player statistics and skill tier (only from authorized contracts)
    /// 
    /// Game Integration:
    /// - Endurance level = time elapsed in seconds from frontend
    /// - Score = total successful block clicks
    /// - Skill tier calculated based on time endurance + average performance
    /// - Events emitted for frontend UI updates
    /// - Rate limiting prevents rapid score updates
    public fun update_player_stats(
        stats: &mut PlayerStats,
        new_score: u64,
        new_endurance_level: u8,
        current_time: u64,
        _contract_address: address,  // Must be authorized
        score_system: &ScoreSystem  // For rate limiting check
    ) {
        // Rate limiting removed for fast-paced gameplay
        // let time_since_last_update = current_time - stats.last_score_update;
        // assert!(time_since_last_update >= score_system.rate_limit_window, 4);
        
        // Update timestamp for rate limiting
        // stats.last_score_update = current_time; // Removed

        let old_skill_tier = stats.current_skill_tier;
        stats.total_games = stats.total_games + 1;
        stats.last_played = current_time;

        // Update personal best score
        if (new_score > stats.personal_best_score) {
            stats.personal_best_score = new_score;
        };

        // Update highest endurance level (time survival)
        if (new_endurance_level > stats.highest_endurance_level) {
            stats.highest_endurance_level = new_endurance_level;
            
            // Emit endurance level achievement event
            let endurance_tier = if (new_endurance_level >= 120) { 4 } // Master: 2+ minutes
            else if (new_endurance_level >= 90) { 3 }                  // Expert: 1.5+ minutes
            else if (new_endurance_level >= 60) { 2 }                  // Advanced: 1+ minute
            else if (new_endurance_level >= 30) { 1 }                  // Intermediate: 30+ seconds
            else { 0 };                                                 // Beginner: 0-30 seconds
            
            event::emit(EnduranceLevelAchieved {
                player: stats.player,
                new_endurance_level: new_endurance_level,
                endurance_tier_name: endurance_tier,
                timestamp: current_time
            });
        };

        // Update average score (weighted by total games)
        let total_score = stats.average_score * (stats.total_games - 1) + new_score;
        stats.average_score = total_score / stats.total_games;

        // Calculate new skill tier based on time endurance + performance
        let new_skill_tier = calculate_skill_tier(stats.average_score, stats.highest_endurance_level);
        stats.current_skill_tier = new_skill_tier;

        // Emit skill tier updated event if different
        if (old_skill_tier != new_skill_tier) {
            event::emit(SkillTierUpdated {
                player: stats.player,
                old_tier: old_skill_tier,
                new_tier: new_skill_tier,
                timestamp: current_time
            });
        };

        // Emit player stats updated event
        event::emit(PlayerStatsUpdated {
            player: stats.player,
            new_score,
            new_endurance_level,
            new_skill_tier,
            timestamp: current_time
        });
    }

    /// Calculate player's skill tier based on performance
    fun calculate_skill_tier(
        avg_score: u64,
        highest_endurance: u8
    ): u8 {
        // Endurance levels based on time elapsed in seconds (from frontend):
        // Beginner: 0-30 seconds, Intermediate: 30-60 seconds, Advanced: 60-90 seconds
        // Expert: 90-120 seconds, Master: 120+ seconds
        
        if (highest_endurance >= 120 && avg_score >= 150) {
            SKILL_TIER_MASTER      // 2+ minutes of play, 150+ avg score
        } else if (highest_endurance >= 90 && avg_score >= 100) {
            SKILL_TIER_EXPERT      // 1.5+ minutes of play, 100+ avg score
        } else if (highest_endurance >= 60 && avg_score >= 60) {
            SKILL_TIER_ADVANCED    // 1+ minute of play, 60+ avg score
        } else if (highest_endurance >= 30 && avg_score >= 30) {
            SKILL_TIER_INTERMEDIATE // 30+ seconds of play, 30+ avg score
        } else {
            SKILL_TIER_BEGINNER    // 0-30 seconds, any score
        }
    }

    /// Get endurance tier name based on endurance level (time elapsed)
    public fun get_endurance_tier_name(endurance_level: u8): u8 {
        if (endurance_level >= 120) { 4 }      // Master: 2+ minutes
        else if (endurance_level >= 90) { 3 }   // Expert: 1.5+ minutes
        else if (endurance_level >= 60) { 2 }   // Advanced: 1+ minute
        else if (endurance_level >= 30) { 1 }   // Intermediate: 30+ seconds
        else { 0 }                               // Beginner: 0-30 seconds
    }

    /// Get player's current skill tier
    public fun get_player_skill_tier(stats: &PlayerStats): u8 {
        stats.current_skill_tier
    }

    /// Get player's total games played
    public fun get_player_total_games(stats: &PlayerStats): u64 {
        stats.total_games
    }

    /// Get player's personal best score
    public fun get_player_personal_best_score(stats: &PlayerStats): u64 {
        stats.personal_best_score
    }

    /// Get player's personal best clicks
    public fun get_player_personal_best_clicks(stats: &PlayerStats): u64 {
        stats.personal_best_clicks
    }

    /// Get player's personal best time
    public fun get_player_personal_best_time(stats: &PlayerStats): u64 {
        stats.personal_best_time
    }

    /// Get player's personal best efficiency
    public fun get_player_personal_best_efficiency(stats: &PlayerStats): u64 {
        stats.personal_best_efficiency
    }

    /// Get player's average score
    public fun get_player_average_score(stats: &PlayerStats): u64 {
        stats.average_score
    }

    /// Get player's average clicks per game
    public fun get_player_average_clicks_per_game(stats: &PlayerStats): u64 {
        stats.average_clicks_per_game
    }

    /// Get player's average time per game
    public fun get_player_average_time_per_game(stats: &PlayerStats): u64 {
        stats.average_time_per_game
    }

    /// Get player's average efficiency
    public fun get_player_average_efficiency(stats: &PlayerStats): u64 {
        stats.average_efficiency
    }

    /// Get speed tier name based on speed level (time elapsed)
    public fun get_speed_tier_name(speed_level: u8): u8 {
        if (speed_level >= 120) { 4 }      // Master: 2+ minutes
        else if (speed_level >= 90) { 3 }   // Expert: 1.5+ minutes
        else if (speed_level >= 60) { 2 }   // Advanced: 1+ minute
        else if (speed_level >= 30) { 1 }   // Intermediate: 30+ seconds
        else { 0 }                           // Beginner: 0-30 seconds
    }

    /// Check if player has stats
    public fun has_player_stats(score_system: &ScoreSystem, player: address): bool {
        table::contains(&score_system.player_stats_table, player)
    }

    /// Get player stats (read-only)
    public fun get_player_stats(score_system: &ScoreSystem, player: address): &PlayerStats {
        assert!(table::contains(&score_system.player_stats_table, player), 0);
        table::borrow(&score_system.player_stats_table, player)
    }

    // ===== LEADERBOARD FUNCTIONS =====

    /// Get top N players by personal best score
    public fun get_top_players_by_best_score(
        score_system: &ScoreSystem,
        limit: u64
    ): vector<address> {
        // This would require iterating through the table and sorting
        // For now, return empty vector - will be implemented via backend queries
        vector::empty<address>()
    }

    /// Get top N players by personal best time
    public fun get_top_players_by_best_time(
        score_system: &ScoreSystem,
        limit: u64
    ): vector<address> {
        // This would require iterating through the table and sorting
        // For now, return empty vector - will be implemented via backend queries
        vector::empty<address>()
    }

    /// Get top N players by personal best clicks
    public fun get_top_players_by_best_clicks(
        score_system: &ScoreSystem,
        limit: u64
    ): vector<address> {
        // This would require iterating through the table and sorting
        // For now, return empty vector - will be implemented via backend queries
        vector::empty<address>()
    }

    /// Get top N players by personal best efficiency
    public fun get_top_players_by_best_efficiency(
        score_system: &ScoreSystem,
        limit: u64
    ): vector<address> {
        // This would require iterating through the table and sorting
        // For now, return empty vector - will be implemented via backend queries
        vector::empty<address>()
    }

    /// Get top N players by average score
    public fun get_top_players_by_average_score(
        score_system: &ScoreSystem,
        limit: u64
    ): vector<address> {
        // This would require iterating through the table and sorting
        // For now, return empty vector - will be implemented via backend queries
        vector::empty<address>()
    }

    /// Get top N players by average time
    public fun get_top_players_by_average_time(
        score_system: &ScoreSystem,
        limit: u64
    ): vector<address> {
        // This would require iterating through the table and sorting
        // For now, return empty vector - will be implemented via backend queries
        vector::empty<address>()
    }

    /// Get top N players by average clicks
    public fun get_top_players_by_average_clicks(
        score_system: &ScoreSystem,
        limit: u64
    ): vector<address> {
        // This would require iterating through the table and sorting
        // For now, return empty vector - will be implemented via backend queries
        vector::empty<address>()
    }

    /// Get top N players by average efficiency
    public fun get_top_players_by_average_efficiency(
        score_system: &ScoreSystem,
        limit: u64
    ): vector<address> {
        // This would require iterating through the table and sorting
        // For now, return empty vector - will be implemented via backend queries
        vector::empty<address>()
    }

    /// Get top N players by skill tier
    public fun get_top_players_by_skill_tier(
        score_system: &ScoreSystem,
        skill_tier: u8,
        limit: u64
    ): vector<address> {
        // This would require iterating through the table and filtering by skill tier
        // For now, return empty vector - will be implemented via backend queries
        vector::empty<address>()
    }

    /// Get total number of players in the system
    public fun get_total_players(score_system: &ScoreSystem): u64 {
        table::length(&score_system.player_stats_table)
    }

    /// Get total number of players by skill tier
    public fun get_players_count_by_skill_tier(
        score_system: &ScoreSystem,
        skill_tier: u8
    ): u64 {
        // This would require counting players with specific skill tier
        // For now, return 0 - will be implemented via backend queries
        0
    }
}
