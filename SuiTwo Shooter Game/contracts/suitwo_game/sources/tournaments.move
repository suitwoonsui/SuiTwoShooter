module suitwo_game::tournaments {
    use sui::object::{Self, UID, ID};
    use sui::table::{Self, Table};
    use sui::event;
    use sui::clock::{Self, Clock};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use std::vector;
    use std::option::{Self, Option};
    use suitwo_game::game_pass;
    use suitwo_game::achievement_system::{Self, ItemReward};

    // ===== CONSTANTS =====
    
    // Tournament categories
    const CATEGORY_TOTAL_COINS: u8 = 0;
    const CATEGORY_LONGEST_STREAK: u8 = 1;
    const CATEGORY_HIGHEST_SCORE: u8 = 2;
    const CATEGORY_LONGEST_DISTANCE: u8 = 3;
    const CATEGORY_MOST_BOSSES: u8 = 4;
    const CATEGORY_MOST_ENEMIES: u8 = 5;
    
    // Prize distribution percentages (out of 100)
    const PRIZE_PLAYER_REWARDS_PCT: u64 = 50;  // 50% to winners
    const PRIZE_BURN_PCT: u64 = 25;            // 25% to token burn
    const PRIZE_OPERATIONS_PCT: u64 = 25;       // 25% to operations
    
    // Top winners to reward
    const TOP_WINNERS_COUNT: u64 = 10;
    
    // Errors
    const E_TOURNAMENT_NOT_ACTIVE: u64 = 0;
    const E_ALREADY_ENTERED: u64 = 1;
    const E_INVALID_TICKET: u64 = 2;
    const E_NOT_PARTICIPANT: u64 = 3;
    const E_TOURNAMENT_NOT_ENDED: u64 = 4;
    const E_REWARDS_ALREADY_DISTRIBUTED: u64 = 5;
    const E_INVALID_CATEGORY: u64 = 6;
    const E_INVALID_ADMIN: u64 = 7;
    const E_INVALID_TIME_RANGE: u64 = 8;
    const E_INVALID_CREATION_FEE: u64 = 9;
    const E_INVALID_REWARD_CONFIG: u64 = 10;
    const E_INVALID_POOL_DISTRIBUTION: u64 = 11;
    const E_TOURNAMENT_NOT_FOUND: u64 = 12;
    const E_TOURNAMENT_ALREADY_MOVED: u64 = 13;
    const E_TOURNAMENT_ALREADY_STARTED: u64 = 14;
    const E_TOURNAMENT_HAS_PARTICIPANTS: u64 = 15;
    
    // Constants
    const MIN_CREATION_FEE_USD_CENTS: u64 = 500;  // $5.00 minimum creation fee
    const CREATION_FEE_USD_CENTS: u64 = 500;      // $5.00 standard creation fee
    
    // Grace period for tournament score submission (1 hour in milliseconds)
    const GRACE_PERIOD_MS: u64 = 3600000;
    
    // Distribution status codes
    const DISTRIBUTION_PENDING: u8 = 0;           // Not yet distributed
    const DISTRIBUTION_COMPLETED: u8 = 1;         // Rewards distributed to players
    const DISTRIBUTION_NO_PARTICIPANTS: u8 = 2;   // No participants to distribute to
    const DISTRIBUTION_NO_REWARDS: u8 = 3;        // No rewards configured/available
    
    // ===== STRUCTS =====
    
    /// Tournament reward configuration for custom rewards
    struct TournamentRewardConfig has store {
        reward_depth: u8,              // How many players get item rewards (1-255)
        pool_depth: u8,                 // How many players get pool rewards (MEWS tokens)
        pool_distribution: vector<u64>,  // Percentages for pool distribution (must sum to 100)
        pool_source: u8,                // 0=Prize Pool, 1=Fixed, 2=Custom
        item_rewards: Table<u8, vector<ItemReward>>, // rank -> items (rank 1-255)
    }
    
    /// Tournament entry - tracks player entry with ticket value
    /// Only USD is tracked. MIST is calculated on-the-fly when needed for on-chain operations.
    struct TournamentEntry has store, drop {
        ticket_id: u64,                  // Ticket ID used for entry
        ticket_value_usd_cents: u64,     // Value paid for ticket in USD (cents, e.g., 100 = $1.00)
        entered_at: u64,                 // Timestamp when entered
    }
    
    /// Leaderboard entry - stores player score and name on-chain
    struct LeaderboardEntry has store, drop {
        value: u64,                      // Score/value for this category
        player_name: vector<u8>,         // Player name (for leaderboard display)
    }
    
    /// Tournament structure
    struct Tournament has key {
        id: UID,
        tournament_id: u64,
        name: vector<u8>,
        category: u8,                    // Which category this tournament focuses on
        start_time: u64,
        end_time: u64,
        entry_fee_tickets: u64,          // Entry fee in tournament tickets (typically 1)
        prize_pool_usd_cents: u64,       // Total prize pool in USD (cents, sum of all ticket USD values + starting ante)
        participants: Table<address, TournamentEntry>,  // Players who entered (with ticket USD value tracking)
        leaderboard: Table<address, LeaderboardEntry>,  // Player -> LeaderboardEntry (score + name)
        distribution_status: u8,             // 0=pending, 1=distributed, 2=no_participants, 3=no_rewards
        created_at: u64,
        
        // NEW FIELDS
        reward_config: Option<TournamentRewardConfig>, // If None, use default rewards
        starting_ante_usd_cents: u64,  // Starting ante (creator's contribution to prize pool)
        created_by: address,            // Tournament creator address
        creation_fee_paid: u64,         // Creation fee paid (in USD cents, 0 for admin-created)
        creator_reward_usd_cents: u64,  // Creator reward amount (calculated at tournament end)
        creator_reward_paid: bool,       // Whether creator reward has been paid
    }
    
    /// Tournament registry
    struct TournamentRegistry has key {
        id: UID,
        tournaments: Table<u64, ID>,        // All tournaments (tournament_id -> Tournament object ID)
        active_tournaments: Table<u64, ID>, // Currently active tournaments (tournament_id -> Tournament object ID)
        past_tournaments: Table<u64, ID>,   // Past/ended tournaments (tournament_id -> Tournament object ID)
        next_tournament_id: u64,
    }
    
    /// Admin capability for tournament management
    struct AdminCapability has key, store {
        id: UID,
    }
    
    // ===== EVENTS =====
    
    struct TournamentCreated has copy, drop {
        tournament_id: u64,
        category: u8,
        name: vector<u8>,
        start_time: u64,
        end_time: u64,
        entry_fee_tickets: u64,
        created_by: address,            // NEW
        starting_ante_usd_cents: u64,   // NEW
        creation_fee_paid: u64,          // NEW
        has_custom_rewards: bool,        // NEW (true if reward_config is Some)
        timestamp: u64,
    }
    
    struct TournamentEntered has copy, drop {
        tournament_id: u64,
        player: address,
        ticket_id: u64,              // Ticket ID used for entry
        ticket_value_usd_cents: u64,  // Value paid for ticket in USD (cents, added to prize pool)
        timestamp: u64,
    }
    
    struct TournamentScoreUpdated has copy, drop {
        tournament_id: u64,
        player: address,
        player_name: vector<u8>,  // Player name (for leaderboard display)
        category: u8,
        value: u64,  // Category value (for leaderboard)
        // Full game stats (for potential future use)
        score: u64,
        distance: u64,
        coins: u64,
        bosses_defeated: u64,
        enemies_defeated: u64,
        longest_coin_streak: u64,
        timestamp: u64,
    }
    
    struct TournamentTicketRefunded has copy, drop {
        tournament_id: u64,
        player: address,
        ticket_id: u64,
        ticket_value_usd_cents: u64,  // USD value refunded (cents)
        timestamp: u64,
    }
    
    struct TournamentEnded has copy, drop {
        tournament_id: u64,
        winners: vector<address>,
        prize_pool_usd_cents: u64,  // Total prize pool in USD (cents, sum of all ticket USD values)
        creator_reward_usd_cents: u64,  // NEW: Creator reward amount
        distribution_status: u8,     // 0=pending, 1=distributed, 2=no_participants, 3=no_rewards
        timestamp: u64,
    }
    
    struct TournamentMovedToPast has copy, drop {
        tournament_id: u64,
        timestamp: u64,
    }
    
    // ===== INITIALIZATION =====
    
    /// Initialize tournament registry (one-time setup)
    fun init(ctx: &mut TxContext) {
        let registry = TournamentRegistry {
            id: sui::object::new(ctx),
            tournaments: table::new(ctx),
            active_tournaments: table::new(ctx),
            past_tournaments: table::new(ctx),
            next_tournament_id: 0,
        };
        
        transfer::share_object(registry);
    }
    
    // ===== HELPER FUNCTIONS =====
    
    /// Calculate sum of pool distribution vector (recursive helper)
    fun sum_pool_distribution(distribution: &vector<u64>, index: u64, sum: u64): u64 {
        let len = vector::length(distribution);
        if (index >= len) {
            sum
        } else {
            let value = *vector::borrow(distribution, index);
            sum_pool_distribution(distribution, index + 1, sum + value)
        }
    }
    
    // ===== TOURNAMENT CREATION =====
    
    /// Create a new tournament (admin-only) with default rewards
    /// Default rewards are stored on-chain the same way as custom rewards
    /// Accepts reward config components separately to avoid serialization issues
    public entry fun create_tournament_default_rewards(
        registry: &mut TournamentRegistry,
        admin_cap: &AdminCapability,
        name: vector<u8>,
        category: u8,
        start_time: u64,
        end_time: u64,
        entry_fee_tickets: u64,
        reward_depth: u8,
        pool_depth: u8,
        pool_distribution: vector<u64>,
        pool_source: u8,
        item_rewards_ranks: vector<u8>,
        item_rewards_item_ids: vector<u8>,
        item_rewards_levels: vector<u8>,
        item_rewards_quantities: vector<u64>,
        starting_ante_usd_cents: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // Create default reward config on-chain (stored same way as custom rewards)
        let reward_config = create_reward_config_internal(
            reward_depth,
            pool_depth,
            pool_distribution,
            pool_source,
            item_rewards_ranks,
            item_rewards_item_ids,
            item_rewards_levels,
            item_rewards_quantities,
            ctx
        );
        
        // Call main function with Some(reward_config)
        create_tournament(
            registry,
            admin_cap,
            name,
            category,
            start_time,
            end_time,
            entry_fee_tickets,
            option::some(reward_config),
            starting_ante_usd_cents,
            clock,
            ctx
        );
    }

    /// Helper function to create TournamentRewardConfig on-chain
    /// Accepts reward config components separately to avoid serialization issues with Table
    /// 
    /// Parameters:
    /// - reward_depth: How many players get item rewards (1-255)
    /// - pool_depth: How many players get pool rewards
    /// - pool_distribution: Percentages for pool distribution (must sum to 100)
    /// - pool_source: 0=Prize Pool, 1=Fixed, 2=Custom
    /// - item_rewards_ranks: Vector of ranks (u8) - each rank corresponds to items at same index
    /// - item_rewards_item_ids: Vector of item IDs (u8) - parallel to ranks
    /// - item_rewards_levels: Vector of item levels (u8) - parallel to ranks
    /// - item_rewards_quantities: Vector of item quantities (u64) - parallel to ranks
    /// 
    /// The parallel vectors are grouped by rank to build the Table<u8, vector<ItemReward>>
    fun create_reward_config_internal(
        reward_depth: u8,
        pool_depth: u8,
        pool_distribution: vector<u64>,
        pool_source: u8,
        item_rewards_ranks: vector<u8>,
        item_rewards_item_ids: vector<u8>,
        item_rewards_levels: vector<u8>,
        item_rewards_quantities: vector<u64>,
        ctx: &mut TxContext
    ): TournamentRewardConfig {
        // Validate inputs
        assert!(reward_depth > 0, E_INVALID_REWARD_CONFIG);
        assert!(pool_depth > 0, E_INVALID_REWARD_CONFIG);
        assert!(vector::length(&pool_distribution) == (pool_depth as u64), E_INVALID_REWARD_CONFIG);
        assert!(vector::length(&item_rewards_ranks) == vector::length(&item_rewards_item_ids), E_INVALID_REWARD_CONFIG);
        assert!(vector::length(&item_rewards_ranks) == vector::length(&item_rewards_levels), E_INVALID_REWARD_CONFIG);
        assert!(vector::length(&item_rewards_ranks) == vector::length(&item_rewards_quantities), E_INVALID_REWARD_CONFIG);

        // Validate pool distribution sums to 100
        let sum = sum_pool_distribution(&pool_distribution, 0, 0);
        assert!(sum == 100, E_INVALID_POOL_DISTRIBUTION);

        // Create the item_rewards Table
        let item_rewards = table::new(ctx);
        
        // Group items by rank
        // Process items sequentially and group by rank
        // Items for the same rank should be consecutive in the input vectors
        let len = vector::length(&item_rewards_ranks);
        
        // Build the table by processing items in order
        // Since items for the same rank are consecutive, we can process them in batches
        let i = 0;
        while (i < len) {
            let rank = *vector::borrow(&item_rewards_ranks, i);
            let items_for_rank = vector::empty<ItemReward>();
            
            // Collect all items for this rank (they should be consecutive)
            let j = i;
            while (j < len && *vector::borrow(&item_rewards_ranks, j) == rank) {
                let item_id = *vector::borrow(&item_rewards_item_ids, j);
                let level = *vector::borrow(&item_rewards_levels, j);
                let quantity = *vector::borrow(&item_rewards_quantities, j);
                
                let item_reward = achievement_system::create_item_reward(item_id, level, quantity);
                vector::push_back(&mut items_for_rank, item_reward);
                j = j + 1;
            };
            
            // Add this rank's items to the table
            table::add(&mut item_rewards, rank, items_for_rank);
            
            // Skip to next rank
            i = j;
        };

        TournamentRewardConfig {
            reward_depth,
            pool_depth,
            pool_distribution,
            pool_source,
            item_rewards,
        }
    }

    /// Public entry function to create tournament with custom rewards
    /// Accepts reward config components separately to avoid serialization issues
    public entry fun create_tournament_with_custom_rewards(
        registry: &mut TournamentRegistry,
        admin_cap: &AdminCapability,
        name: vector<u8>,
        category: u8,
        start_time: u64,
        end_time: u64,
        entry_fee_tickets: u64,
        reward_depth: u8,
        pool_depth: u8,
        pool_distribution: vector<u64>,
        pool_source: u8,
        item_rewards_ranks: vector<u8>,
        item_rewards_item_ids: vector<u8>,
        item_rewards_levels: vector<u8>,
        item_rewards_quantities: vector<u64>,
        starting_ante_usd_cents: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // Create reward config on-chain
        let reward_config = create_reward_config_internal(
            reward_depth,
            pool_depth,
            pool_distribution,
            pool_source,
            item_rewards_ranks,
            item_rewards_item_ids,
            item_rewards_levels,
            item_rewards_quantities,
            ctx
        );
        
        // Call main function with Some(reward_config)
        create_tournament(
            registry,
            admin_cap,
            name,
            category,
            start_time,
            end_time,
            entry_fee_tickets,
            option::some(reward_config),
            starting_ante_usd_cents,
            clock,
            ctx
        );
    }

    public fun create_tournament(
        registry: &mut TournamentRegistry,
        _admin_cap: &AdminCapability,
        name: vector<u8>,
        category: u8,
        start_time: u64,
        end_time: u64,
        entry_fee_tickets: u64,  // Entry fee in tournament tickets (typically 1)
        reward_config: Option<TournamentRewardConfig>,  // NEW: Optional custom reward config
        starting_ante_usd_cents: u64,                   // NEW: Starting ante amount
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let current_time = clock::timestamp_ms(clock);
        let creator = tx_context::sender(ctx);
        
        // Validate category
        assert!(category <= CATEGORY_MOST_ENEMIES, E_INVALID_CATEGORY);
        
        // Validate time range
        assert!(start_time < end_time, E_INVALID_TIME_RANGE);
        assert!(end_time > current_time, E_INVALID_TIME_RANGE);
        
        // Validate reward config if provided
        if (option::is_some(&reward_config)) {
            let config = option::borrow(&reward_config);
            assert!(config.reward_depth > 0, E_INVALID_REWARD_CONFIG);
            assert!(config.pool_depth > 0, E_INVALID_REWARD_CONFIG);
            // Validate pool distribution sums to 100
            let sum = sum_pool_distribution(&config.pool_distribution, 0, 0);
            assert!(sum == 100, E_INVALID_POOL_DISTRIBUTION);
        };
        
        // Create tournament with prize pool starting at starting ante
        // Prize pool (USD) will grow as players enter with tickets
        let tournament_id = registry.next_tournament_id;
        registry.next_tournament_id = tournament_id + 1;
        
        let has_custom_rewards = option::is_some(&reward_config);
        
        let tournament = Tournament {
            id: sui::object::new(ctx),
            tournament_id,
            name,
            category,
            start_time,
            end_time,
            entry_fee_tickets,
            prize_pool_usd_cents: starting_ante_usd_cents,  // Start with starting ante
            participants: table::new(ctx),
            leaderboard: table::new(ctx),
            distribution_status: DISTRIBUTION_PENDING,
            created_at: current_time,
            
            // NEW FIELDS
            reward_config,                                    // Custom config or None
            starting_ante_usd_cents,                          // Starting ante
            created_by: creator,                              // Admin address
            creation_fee_paid: 0,                             // Admin doesn't pay
            creator_reward_usd_cents: 0,                      // Calculated at end
            creator_reward_paid: false,                       // Not paid yet
        };
        
        // Add to registry (all tournaments go in main tournaments table)
        let tournament_object_id = sui::object::id(&tournament);
        table::add(&mut registry.tournaments, tournament_id, tournament_object_id);
        
        // Route to appropriate table based on end time (including grace period)
        let grace_period_end = end_time + GRACE_PERIOD_MS;
        if (grace_period_end > current_time) {
            // Tournament is still active (hasn't expired including grace period)
            table::add(&mut registry.active_tournaments, tournament_id, tournament_object_id);
        } else {
            // Tournament has already expired (shouldn't happen due to validation, but handle gracefully)
            table::add(&mut registry.past_tournaments, tournament_id, tournament_object_id);
        };
        
        // Transfer tournament to shared (so players can enter)
        transfer::share_object(tournament);
        
        // Emit TournamentCreated event
        event::emit(TournamentCreated {
            tournament_id,
            category,
            name,
            start_time,
            end_time,
            entry_fee_tickets,
            created_by: creator,                              // NEW
            starting_ante_usd_cents,                          // NEW
            creation_fee_paid: 0,                             // NEW
            has_custom_rewards,                               // NEW
            timestamp: current_time,
        });
    }

    /// Create a historical tournament (admin-only)
    /// Allows creating tournaments with past end times for migration/reference purposes
    /// Does NOT add to active_tournaments if tournament has already ended
    public fun admin_create_historical_tournament_internal(
        registry: &mut TournamentRegistry,
        _admin_cap: &AdminCapability,
        name: vector<u8>,
        category: u8,
        start_time: u64,
        end_time: u64,
        entry_fee_tickets: u64,
        prize_pool_usd_cents: u64,  // Preserve original prize pool if migrating
        reward_config: Option<TournamentRewardConfig>,  // NEW: Optional custom reward config
        starting_ante_usd_cents: u64,                   // NEW: Starting ante amount
        distribution_status: u8,                        // NEW: Preserve distribution status during migration
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let current_time = clock::timestamp_ms(clock);
        let creator = tx_context::sender(ctx);
        
        // Validate category
        assert!(category <= CATEGORY_MOST_ENEMIES, E_INVALID_CATEGORY);
        
        // Validate time range (only require start < end, not end > current)
        assert!(start_time < end_time, E_INVALID_TIME_RANGE);
        
        // Validate reward config if provided
        if (option::is_some(&reward_config)) {
            let config = option::borrow(&reward_config);
            assert!(config.reward_depth > 0, E_INVALID_REWARD_CONFIG);
            assert!(config.pool_depth > 0, E_INVALID_REWARD_CONFIG);
            // Validate pool distribution sums to 100
            let sum = sum_pool_distribution(&config.pool_distribution, 0, 0);
            assert!(sum == 100, E_INVALID_POOL_DISTRIBUTION);
        };
        
        // Create tournament with preserved prize pool
        let tournament_id = registry.next_tournament_id;
        registry.next_tournament_id = tournament_id + 1;
        
        let has_custom_rewards = option::is_some(&reward_config);
        
        let tournament = Tournament {
            id: sui::object::new(ctx),
            tournament_id,
            name,
            category,
            start_time,
            end_time,
            entry_fee_tickets,
            prize_pool_usd_cents,  // Preserve original prize pool
            participants: table::new(ctx),  // Participants start empty (new tournament object)
            leaderboard: table::new(ctx),  // Leaderboard starts empty (new tournament object)
            distribution_status,  // Preserve distribution status from old tournament during migration
            created_at: current_time,
            
            // NEW FIELDS
            reward_config,                                    // Custom config or None
            starting_ante_usd_cents,                          // Starting ante
            created_by: creator,                              // Admin address
            creation_fee_paid: 0,                             // Admin doesn't pay
            creator_reward_usd_cents: 0,                      // Calculated at end
            creator_reward_paid: false,                       // Not paid yet
        };
        
        // Add to registry (all tournaments go in main tournaments table)
        let tournament_object_id = sui::object::id(&tournament);
        table::add(&mut registry.tournaments, tournament_id, tournament_object_id);
        
        // Route to appropriate table based on end time (including grace period)
        let grace_period_end = end_time + GRACE_PERIOD_MS;
        if (grace_period_end > current_time) {
            // Tournament is still active (hasn't expired including grace period)
            table::add(&mut registry.active_tournaments, tournament_id, tournament_object_id);
        } else {
            // Tournament has already expired - add to past_tournaments
            table::add(&mut registry.past_tournaments, tournament_id, tournament_object_id);
        };
        
        // Transfer tournament to shared (so it can be queried)
        transfer::share_object(tournament);
        
        // Emit TournamentCreated event
        event::emit(TournamentCreated {
            tournament_id,
            category,
            name,
            start_time,
            end_time,
            entry_fee_tickets,
            created_by: creator,                              // NEW
            starting_ante_usd_cents,                          // NEW
            creation_fee_paid: 0,                             // NEW
            has_custom_rewards,                               // NEW
            timestamp: current_time,
        });
    }

    /// Public entry function wrapper for creating historical tournaments (for migration)
    /// Allows creating tournaments with past end times for migration/reference purposes
    #[allow(lint(public_entry))]
    public entry fun admin_create_historical_tournament(
        registry: &mut TournamentRegistry,
        admin_cap: &AdminCapability,
        name: vector<u8>,
        category: u8,
        start_time: u64,
        end_time: u64,
        entry_fee_tickets: u64,
        prize_pool_usd_cents: u64,  // Preserve original prize pool if migrating
        distribution_status: u8,     // NEW: Preserve distribution status during migration
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // Call internal function with None for reward_config and prize_pool_usd_cents as starting_ante
        // For migration, we use the prize_pool_usd_cents as both the prize pool and starting ante
        admin_create_historical_tournament_internal(
            registry,
            admin_cap,
            name,
            category,
            start_time,
            end_time,
            entry_fee_tickets,
            prize_pool_usd_cents,  // Preserve original prize pool
            option::none(),         // No custom reward config for migrated tournaments
            prize_pool_usd_cents,  // Use prize pool as starting ante for migration
            distribution_status,   // Preserve distribution status from old tournament
            clock,
            ctx
        );
    }
    
    // ===== ADMIN MIGRATION/RESTORE FUNCTIONS =====
    
    /// Admin function to restore participants to a migrated tournament
    /// Used during migration to preserve participant data
    #[allow(lint(public_entry))]
    public entry fun admin_restore_participants(
        tournament: &mut Tournament,
        _admin_cap: &AdminCapability,
        // Parallel vectors for participants data
        addresses: vector<address>,
        ticket_ids: vector<u64>,
        ticket_values_usd_cents: vector<u64>,
        entered_at_times: vector<u64>,
        _ctx: &mut TxContext
    ) {
        let len = vector::length(&addresses);
        assert!(vector::length(&ticket_ids) == len, E_INVALID_REWARD_CONFIG);
        assert!(vector::length(&ticket_values_usd_cents) == len, E_INVALID_REWARD_CONFIG);
        assert!(vector::length(&entered_at_times) == len, E_INVALID_REWARD_CONFIG);
        
        let i = 0;
        while (i < len) {
            let addr = *vector::borrow(&addresses, i);
            let ticket_id = *vector::borrow(&ticket_ids, i);
            let ticket_value = *vector::borrow(&ticket_values_usd_cents, i);
            let entered_at = *vector::borrow(&entered_at_times, i);
            
            // Only add if not already present
            if (!table::contains(&tournament.participants, addr)) {
                let entry = TournamentEntry {
                    ticket_id,
                    ticket_value_usd_cents: ticket_value,
                    entered_at,
                };
                table::add(&mut tournament.participants, addr, entry);
            };
            
            i = i + 1;
        };
    }
    
    /// Admin function to restore leaderboard scores to a migrated tournament
    /// Used during migration to preserve score data
    #[allow(lint(public_entry))]
    public entry fun admin_restore_leaderboard(
        tournament: &mut Tournament,
        _admin_cap: &AdminCapability,
        // Parallel vectors for leaderboard data
        addresses: vector<address>,
        scores: vector<u64>,
        player_names: vector<vector<u8>>,  // NEW: Preserve player names during migration
        _ctx: &mut TxContext
    ) {
        let len = vector::length(&addresses);
        assert!(vector::length(&scores) == len, E_INVALID_REWARD_CONFIG);
        assert!(vector::length(&player_names) == len, E_INVALID_REWARD_CONFIG);
        
        let i = 0;
        while (i < len) {
            let addr = *vector::borrow(&addresses, i);
            let score = *vector::borrow(&scores, i);
            let player_name = *vector::borrow(&player_names, i);
            
            // Only add if not already present, or update if present
            if (table::contains(&tournament.leaderboard, addr)) {
                let current = table::borrow_mut(&mut tournament.leaderboard, addr);
                // Keep the higher score
                if (score > current.value) {
                    current.value = score;
                };
                // Update player name if provided and current is empty
                if (vector::length(&current.player_name) == 0 && vector::length(&player_name) > 0) {
                    current.player_name = player_name;
                };
            } else {
                let entry = LeaderboardEntry {
                    value: score,
                    player_name,  // Preserve player name during migration
                };
                table::add(&mut tournament.leaderboard, addr, entry);
            };
            
            i = i + 1;
        };
    }
    
    /// Admin function to set distribution_status
    /// Used during migration to preserve distribution status and by scheduler
    /// Status codes: 0=pending, 1=distributed, 2=no_participants, 3=no_rewards
    #[allow(lint(public_entry))]
    public entry fun admin_set_distribution_status(
        tournament: &mut Tournament,
        _admin_cap: &AdminCapability,
        status: u8,
        _ctx: &mut TxContext
    ) {
        tournament.distribution_status = status;
    }
    
    /// Move tournament from active_tournaments to past_tournaments
    /// Called when tournament grace period ends or rewards are distributed
    /// Idempotent: can be called multiple times safely (checks if already moved)
    #[allow(lint(public_entry))]
    public entry fun move_tournament_to_past(
        registry: &mut TournamentRegistry,
        tournament: &Tournament,
        _admin_cap: &AdminCapability,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let tournament_id = tournament.tournament_id;
        let current_time = clock::timestamp_ms(clock);
        
        // Verify tournament exists in active_tournaments
        assert!(table::contains(&registry.active_tournaments, tournament_id), E_TOURNAMENT_NOT_FOUND);
        
        // Verify tournament has ended (including grace period) OR rewards have been distributed
        let grace_period_end = tournament.end_time + GRACE_PERIOD_MS;
        let has_ended = current_time >= grace_period_end;
        let rewards_distributed = tournament.distribution_status > 0;
        assert!(has_ended || rewards_distributed, E_TOURNAMENT_NOT_ENDED);
        
        // Get tournament object ID
        let tournament_object_id = sui::object::id(tournament);
        
        // Verify it's not already in past_tournaments (idempotency check)
        // If it's already there, this is a no-op (safe to call multiple times)
        if (table::contains(&registry.past_tournaments, tournament_id)) {
            // Already moved - remove from active if still there (cleanup)
            if (table::contains(&registry.active_tournaments, tournament_id)) {
                table::remove(&mut registry.active_tournaments, tournament_id);
            };
            return
        };
        
        // Remove from active_tournaments
        table::remove(&mut registry.active_tournaments, tournament_id);
        
        // Add to past_tournaments
        table::add(&mut registry.past_tournaments, tournament_id, tournament_object_id);
        
        // Emit event for tracking
        event::emit(TournamentMovedToPast {
            tournament_id,
            timestamp: current_time,
        });
    }
    
    /// Admin function to update prize pool (for migration accuracy)
    #[allow(lint(public_entry))]
    public entry fun admin_set_prize_pool(
        tournament: &mut Tournament,
        _admin_cap: &AdminCapability,
        prize_pool_usd_cents: u64,
        _ctx: &mut TxContext
    ) {
        tournament.prize_pool_usd_cents = prize_pool_usd_cents;
    }
    
    /// Admin function to set created_by (for migration - preserve original creator)
    #[allow(lint(public_entry))]
    public entry fun admin_set_created_by(
        tournament: &mut Tournament,
        _admin_cap: &AdminCapability,
        created_by: address,
        _ctx: &mut TxContext
    ) {
        tournament.created_by = created_by;
    }
    
    /// Admin function to set creation_fee_paid (for migration - preserve original fee)
    #[allow(lint(public_entry))]
    public entry fun admin_set_creation_fee_paid(
        tournament: &mut Tournament,
        _admin_cap: &AdminCapability,
        creation_fee_paid: u64,
        _ctx: &mut TxContext
    ) {
        tournament.creation_fee_paid = creation_fee_paid;
    }
    
    /// Admin function to set creator_reward_usd_cents (for migration - preserve calculated reward)
    #[allow(lint(public_entry))]
    public entry fun admin_set_creator_reward_usd_cents(
        tournament: &mut Tournament,
        _admin_cap: &AdminCapability,
        creator_reward_usd_cents: u64,
        _ctx: &mut TxContext
    ) {
        tournament.creator_reward_usd_cents = creator_reward_usd_cents;
    }
    
    /// Admin function to set creator_reward_paid (for migration - preserve payment status)
    #[allow(lint(public_entry))]
    public entry fun admin_set_creator_reward_paid(
        tournament: &mut Tournament,
        _admin_cap: &AdminCapability,
        creator_reward_paid: bool,
        _ctx: &mut TxContext
    ) {
        tournament.creator_reward_paid = creator_reward_paid;
    }
    
    // ===== END ADMIN MIGRATION/RESTORE FUNCTIONS =====

    // ===== ADMIN EDIT/DELETE FUNCTIONS =====

    /// Admin function to delete a tournament (remove from registry)
    /// Only allowed if tournament hasn't started and has no participants
    #[allow(lint(public_entry))]
    public entry fun admin_delete_tournament(
        registry: &mut TournamentRegistry,
        tournament: &Tournament,
        _admin_cap: &AdminCapability,
        clock: &Clock,
        _ctx: &mut TxContext
    ) {
        let tournament_id = tournament.tournament_id;
        let current_time = clock::timestamp_ms(clock);
        
        // Verify tournament hasn't started
        assert!(current_time < tournament.start_time, E_TOURNAMENT_ALREADY_STARTED);
        
        // Verify tournament has no participants
        assert!(table::length(&tournament.participants) == 0, E_TOURNAMENT_HAS_PARTICIPANTS);
        
        // Remove from all registry tables
        if (table::contains(&registry.tournaments, tournament_id)) {
            table::remove(&mut registry.tournaments, tournament_id);
        };
        if (table::contains(&registry.active_tournaments, tournament_id)) {
            table::remove(&mut registry.active_tournaments, tournament_id);
        };
        if (table::contains(&registry.past_tournaments, tournament_id)) {
            table::remove(&mut registry.past_tournaments, tournament_id);
        };
    }

    /// Admin function to remove tournament from registry (for testing/cleanup)
    /// NOTE: Tournament objects are SHARED objects and cannot be deleted in Sui.
    /// This function only removes the tournament from registry tables.
    /// The Tournament object itself will remain on-chain as an orphaned shared object.
    /// 
    /// For complete cleanup during testing, you may need to:
    /// 1. Remove all tournaments from registry (this function)
    /// 2. Create a new TournamentRegistry if needed
    /// 3. Accept that old Tournament objects will remain but won't be accessible
    #[allow(lint(public_entry))]
    public entry fun admin_remove_tournament_from_registry(
        registry: &mut TournamentRegistry,
        tournament_id: u64,
        _admin_cap: &AdminCapability,
        _ctx: &mut TxContext
    ) {
        // Remove from all registry tables
        // Note: Tournament objects are shared and cannot be deleted
        // They will remain on-chain but won't be accessible through the registry
        if (table::contains(&registry.tournaments, tournament_id)) {
            table::remove(&mut registry.tournaments, tournament_id);
        };
        if (table::contains(&registry.active_tournaments, tournament_id)) {
            table::remove(&mut registry.active_tournaments, tournament_id);
        };
        if (table::contains(&registry.past_tournaments, tournament_id)) {
            table::remove(&mut registry.past_tournaments, tournament_id);
        };
    }

    /// Admin function to update tournament name
    /// Only allowed if tournament hasn't started
    #[allow(lint(public_entry))]
    public entry fun admin_update_tournament_name(
        tournament: &mut Tournament,
        _admin_cap: &AdminCapability,
        new_name: vector<u8>,
        clock: &Clock,
        _ctx: &mut TxContext
    ) {
        let current_time = clock::timestamp_ms(clock);
        assert!(current_time < tournament.start_time, E_TOURNAMENT_ALREADY_STARTED);
        tournament.name = new_name;
    }

    /// Admin function to update tournament times
    /// Only allowed if tournament hasn't started
    #[allow(lint(public_entry))]
    public entry fun admin_update_tournament_times(
        tournament: &mut Tournament,
        _admin_cap: &AdminCapability,
        new_start_time: u64,
        new_end_time: u64,
        clock: &Clock,
        _ctx: &mut TxContext
    ) {
        let current_time = clock::timestamp_ms(clock);
        assert!(current_time < tournament.start_time, E_TOURNAMENT_ALREADY_STARTED);
        assert!(new_start_time < new_end_time, E_INVALID_TIME_RANGE);
        assert!(new_end_time > current_time, E_INVALID_TIME_RANGE);
        // Ensure tournament doesn't expire before creation (including grace period)
        assert!(new_end_time + GRACE_PERIOD_MS > current_time, E_INVALID_TIME_RANGE);
        
        tournament.start_time = new_start_time;
        tournament.end_time = new_end_time;
    }

    /// Admin function to update tournament entry fee
    /// Only allowed if tournament hasn't started
    #[allow(lint(public_entry))]
    public entry fun admin_update_tournament_entry_fee(
        tournament: &mut Tournament,
        _admin_cap: &AdminCapability,
        new_entry_fee_tickets: u64,
        clock: &Clock,
        _ctx: &mut TxContext
    ) {
        let current_time = clock::timestamp_ms(clock);
        assert!(current_time < tournament.start_time, E_TOURNAMENT_ALREADY_STARTED);
        tournament.entry_fee_tickets = new_entry_fee_tickets;
    }

    /// Admin function to update tournament category
    /// Only allowed if tournament hasn't started
    #[allow(lint(public_entry))]
    public entry fun admin_update_tournament_category(
        tournament: &mut Tournament,
        _admin_cap: &AdminCapability,
        new_category: u8,
        clock: &Clock,
        _ctx: &mut TxContext
    ) {
        let current_time = clock::timestamp_ms(clock);
        assert!(current_time < tournament.start_time, E_TOURNAMENT_ALREADY_STARTED);
        assert!(new_category <= CATEGORY_MOST_ENEMIES, E_INVALID_CATEGORY);
        tournament.category = new_category;
    }

    // ===== END ADMIN EDIT/DELETE FUNCTIONS =====

    /// Public entry function for user tournament creation with default rewards
    /// Default rewards are stored on-chain the same way as custom rewards
    /// Accepts reward config components separately to avoid serialization issues
    public entry fun create_tournament_for_user_default_rewards(
        registry: &mut TournamentRegistry,
        name: vector<u8>,
        category: u8,
        start_time: u64,
        end_time: u64,
        entry_fee_tickets: u64,
        reward_depth: u8,
        pool_depth: u8,
        pool_distribution: vector<u64>,
        pool_source: u8,
        item_rewards_ranks: vector<u8>,
        item_rewards_item_ids: vector<u8>,
        item_rewards_levels: vector<u8>,
        item_rewards_quantities: vector<u64>,
        starting_ante_usd_cents: u64,
        creation_fee_paid: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // Create default reward config on-chain (stored same way as custom rewards)
        let reward_config = create_reward_config_internal(
            reward_depth,
            pool_depth,
            pool_distribution,
            pool_source,
            item_rewards_ranks,
            item_rewards_item_ids,
            item_rewards_levels,
            item_rewards_quantities,
            ctx
        );
        
        // Call internal function with Some(reward_config)
        create_tournament_for_user_internal(
            registry,
            name,
            category,
            start_time,
            end_time,
            entry_fee_tickets,
            option::some(reward_config),
            starting_ante_usd_cents,
            creation_fee_paid,
            clock,
            ctx
        );
    }
    
    /// Public entry function for user tournament creation with custom rewards
    /// Accepts reward config components separately to avoid serialization issues
    /// Similar to create_tournament_with_custom_rewards but for user-created tournaments
    public entry fun create_tournament_for_user_with_custom_rewards(
        registry: &mut TournamentRegistry,
        name: vector<u8>,
        category: u8,
        start_time: u64,
        end_time: u64,
        entry_fee_tickets: u64,
        reward_depth: u8,
        pool_depth: u8,
        pool_distribution: vector<u64>,
        pool_source: u8,
        item_rewards_ranks: vector<u8>,
        item_rewards_item_ids: vector<u8>,
        item_rewards_levels: vector<u8>,
        item_rewards_quantities: vector<u64>,
        starting_ante_usd_cents: u64,
        creation_fee_paid: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // Create reward config on-chain
        let reward_config = create_reward_config_internal(
            reward_depth,
            pool_depth,
            pool_distribution,
            pool_source,
            item_rewards_ranks,
            item_rewards_item_ids,
            item_rewards_levels,
            item_rewards_quantities,
            ctx
        );
        
        // Call internal function with Some(reward_config)
        create_tournament_for_user_internal(
            registry,
            name,
            category,
            start_time,
            end_time,
            entry_fee_tickets,
            option::some(reward_config),
            starting_ante_usd_cents,
            creation_fee_paid,
            clock,
            ctx
        );
    }
    
    /// Create a tournament for a user (user pays creation fee + starting ante)
    /// Prize pool starts with starting ante and grows as players enter with tickets
    public fun create_tournament_for_user_internal(
        registry: &mut TournamentRegistry,
        name: vector<u8>,
        category: u8,
        start_time: u64,
        end_time: u64,
        entry_fee_tickets: u64,
        reward_config: Option<TournamentRewardConfig>,  // Optional custom reward config
        starting_ante_usd_cents: u64,                   // Starting ante amount
        creation_fee_paid: u64,                          // Creation fee paid (in USD cents)
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let current_time = clock::timestamp_ms(clock);
        let creator = tx_context::sender(ctx);
        
        // Validate category
        assert!(category <= CATEGORY_MOST_ENEMIES, E_INVALID_CATEGORY);
        
        // Validate time range
        assert!(start_time < end_time, E_INVALID_TIME_RANGE);
        assert!(end_time > current_time, E_INVALID_TIME_RANGE);
        // Ensure tournament doesn't expire before creation (including grace period)
        assert!(end_time + GRACE_PERIOD_MS > current_time, E_INVALID_TIME_RANGE);
        
        // Validate creation fee (must be at least $5.00 = 500 cents)
        assert!(creation_fee_paid >= MIN_CREATION_FEE_USD_CENTS, E_INVALID_CREATION_FEE);
        
        // Validate reward config if provided
        if (option::is_some(&reward_config)) {
            let config = option::borrow(&reward_config);
            assert!(config.reward_depth > 0, E_INVALID_REWARD_CONFIG);
            assert!(config.pool_depth > 0, E_INVALID_REWARD_CONFIG);
            // Validate pool distribution sums to 100
            let sum = sum_pool_distribution(&config.pool_distribution, 0, 0);
            assert!(sum == 100, E_INVALID_POOL_DISTRIBUTION);
        };
        
        // Create tournament
        let tournament_id = registry.next_tournament_id;
        registry.next_tournament_id = tournament_id + 1;
        
        let has_custom_rewards = option::is_some(&reward_config);
        
        let tournament = Tournament {
            id: sui::object::new(ctx),
            tournament_id,
            name,
            category,
            start_time,
            end_time,
            entry_fee_tickets,
            prize_pool_usd_cents: starting_ante_usd_cents,  // Start with starting ante
            participants: table::new(ctx),
            leaderboard: table::new(ctx),
            distribution_status: DISTRIBUTION_PENDING,
            created_at: current_time,
            
            // NEW FIELDS
            reward_config,                                    // Custom config or None
            starting_ante_usd_cents,                          // Starting ante
            created_by: creator,                              // User address
            creation_fee_paid,                                // Creation fee paid
            creator_reward_usd_cents: 0,                      // Calculated at end
            creator_reward_paid: false,                       // Not paid yet
        };
        
        // Add to registry (all tournaments go in main tournaments table)
        let tournament_object_id = sui::object::id(&tournament);
        table::add(&mut registry.tournaments, tournament_id, tournament_object_id);
        
        // User-created tournaments must be active (validation ensures end_time + grace_period > now)
        table::add(&mut registry.active_tournaments, tournament_id, tournament_object_id);
        
        // Transfer tournament to shared
        transfer::share_object(tournament);
        
        // Emit TournamentCreated event
        event::emit(TournamentCreated {
            tournament_id,
            category,
            name,
            start_time,
            end_time,
            entry_fee_tickets,
            created_by: creator,                              // NEW
            starting_ante_usd_cents,                          // NEW
            creation_fee_paid,                                // NEW
            has_custom_rewards,                               // NEW
            timestamp: current_time,
        });
    }
    
    // ===== TOURNAMENT ENTRY =====
    
    /// Enter tournament using tournament ticket
    /// Tracks ticket value for prize pool calculation
    /// Players can enter multiple times - each entry consumes a ticket and adds to prize pool
    /// If player already has a score, it is preserved (only updated if new score is better)
    #[allow(lint(public_entry))]
    public entry fun enter_tournament(
        tournament: &mut Tournament,
        game_pass_system: &mut game_pass::GamePassSystem,
        ticket_id: u64,            // Which ticket to use (player selects)
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let player = tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);
        
        // Validate tournament is active
        assert!(current_time >= tournament.start_time && current_time <= tournament.end_time, E_TOURNAMENT_NOT_ACTIVE);
        
        // Consume ticket from GamePass (returns ticket_id and value_paid_usd_cents)
        let (consumed_ticket_id, ticket_value_usd_cents) = game_pass::consume_tournament_ticket(
            game_pass_system,
            player,
            ticket_id,
            ctx
        );
        
        // Add ticket USD value to prize pool (only USD is tracked)
        tournament.prize_pool_usd_cents = tournament.prize_pool_usd_cents + ticket_value_usd_cents;
        
        // Update or add player to participants with ticket USD value tracking
        // If player already exists, update their entry (they're re-entering with a new ticket)
        let entry = TournamentEntry {
            ticket_id: consumed_ticket_id,
            ticket_value_usd_cents,
            entered_at: current_time,
        };
        
        if (table::contains(&tournament.participants, player)) {
            // Player is re-entering - update their entry
            let existing_entry = table::borrow_mut(&mut tournament.participants, player);
            *existing_entry = entry;
        } else {
            // First time entering - add to participants
            table::add(&mut tournament.participants, player, entry);
        };
        
        // Initialize leaderboard entry only if player doesn't have one yet
        // If player already has a score, preserve it (it will be updated by update_tournament_score if better)
        if (!table::contains(&tournament.leaderboard, player)) {
            let entry = LeaderboardEntry {
                value: 0,
                player_name: vector::empty(),
            };
            table::add(&mut tournament.leaderboard, player, entry);
        };
        
        // Emit TournamentEntered event with ticket USD value
        event::emit(TournamentEntered {
            tournament_id: tournament.tournament_id,
            player,
            ticket_id: consumed_ticket_id,
            ticket_value_usd_cents,
            timestamp: current_time,
        });
    }
    
    /// Enter tournament for a user (admin-only, gas paid by admin)
    /// This provides smooth UX where admin pays for gas fees
    /// Players can enter multiple times - each entry consumes a ticket and adds to prize pool
    /// If player already has a score, it is preserved (only updated if new score is better)
    #[allow(lint(public_entry))]
    public entry fun enter_tournament_for_user(
        _admin_cap: &AdminCapability,
        tournament: &mut Tournament,
        game_pass_system: &mut game_pass::GamePassSystem,
        player: address,
        ticket_id: u64,            // Which ticket to use (player selects)
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let current_time = clock::timestamp_ms(clock);
        
        // Validate tournament is active
        assert!(current_time >= tournament.start_time && current_time <= tournament.end_time, E_TOURNAMENT_NOT_ACTIVE);
        
        // Consume ticket from GamePass (returns ticket_id and value_paid_usd_cents)
        let (consumed_ticket_id, ticket_value_usd_cents) = game_pass::consume_tournament_ticket(
            game_pass_system,
            player,
            ticket_id,
            ctx
        );
        
        // Add ticket USD value to prize pool (only USD is tracked)
        tournament.prize_pool_usd_cents = tournament.prize_pool_usd_cents + ticket_value_usd_cents;
        
        // Update or add player to participants with ticket USD value tracking
        // If player already exists, update their entry (they're re-entering with a new ticket)
        let entry = TournamentEntry {
            ticket_id: consumed_ticket_id,
            ticket_value_usd_cents,
            entered_at: current_time,
        };
        
        if (table::contains(&tournament.participants, player)) {
            // Player is re-entering - update their entry
            let existing_entry = table::borrow_mut(&mut tournament.participants, player);
            *existing_entry = entry;
        } else {
            // First time entering - add to participants
            table::add(&mut tournament.participants, player, entry);
        };
        
        // Initialize leaderboard entry only if player doesn't have one yet
        // If player already has a score, preserve it (it will be updated by update_tournament_score if better)
        if (!table::contains(&tournament.leaderboard, player)) {
            let entry = LeaderboardEntry {
                value: 0,
                player_name: vector::empty(),
            };
            table::add(&mut tournament.leaderboard, player, entry);
        };
        
        // Emit TournamentEntered event with ticket USD value
        event::emit(TournamentEntered {
            tournament_id: tournament.tournament_id,
            player,
            ticket_id: consumed_ticket_id,
            ticket_value_usd_cents,
            timestamp: current_time,
        });
    }
    
    // ===== SCORE UPDATES =====
    
    /// Update tournament score (admin-only, called by backend)
    /// Allows score submission within 1 hour grace period after tournament ends
    /// Accepts all game stats but only tracks the category value in leaderboard
    #[allow(lint(public_entry))]
    public entry fun update_tournament_score(
        _admin_cap: &AdminCapability,
        tournament: &mut Tournament,
        player: address,
        player_name: vector<u8>,  // Player name (for leaderboard display)
        value: u64,  // Score/value for this category (extracted from stats based on category)
        _score: u64,  // Total game score (used in event)
        _distance: u64,  // Distance traveled (used in event)
        _coins: u64,  // Coins collected (used in event)
        _bosses_defeated: u64,  // Bosses defeated (used in event)
        _enemies_defeated: u64,  // Enemies defeated (used in event)
        _longest_coin_streak: u64,  // Longest coin streak (used in event)
        clock: &Clock,
        _ctx: &mut TxContext
    ) {
        let current_time = clock::timestamp_ms(clock);
        
        // Validate player is participant
        assert!(table::contains(&tournament.participants, player), E_NOT_PARTICIPANT);
        
        // Allow score submission if:
        // 1. Tournament is active (current_time >= start_time && current_time <= end_time), OR
        // 2. Within 1 hour grace period after tournament ends (current_time <= end_time + 1 hour)
        let grace_period_end = tournament.end_time + GRACE_PERIOD_MS;
        assert!(
            (current_time >= tournament.start_time && current_time <= tournament.end_time) ||
            (current_time > tournament.end_time && current_time <= grace_period_end),
            E_TOURNAMENT_NOT_ACTIVE
        );
        
        // Update leaderboard (only if new value is higher)
        // Note: Player should already be in leaderboard (initialized to 0 when entering tournament)
        if (table::contains(&tournament.leaderboard, player)) {
            let current_entry = table::borrow_mut(&mut tournament.leaderboard, player);
            if (value > current_entry.value) {
                current_entry.value = value;
                current_entry.player_name = player_name;  // Update name when score is updated
            } else if (vector::length(&current_entry.player_name) == 0 && vector::length(&player_name) > 0) {
                // If name is empty but we have a new name, update it even if score isn't higher
                current_entry.player_name = player_name;
            };
        } else {
            // This should rarely happen - player should be in leaderboard from tournament entry
            // But handle it gracefully by adding them
            let entry = LeaderboardEntry {
                value,
                player_name,
            };
            table::add(&mut tournament.leaderboard, player, entry);
        };
        
        // Emit TournamentScoreUpdated event with all stats
        event::emit(TournamentScoreUpdated {
            tournament_id: tournament.tournament_id,
            player,
            player_name,  // Player name (for leaderboard display)
            category: tournament.category,
            value,  // Category value (for leaderboard)
            score: _score,
            distance: _distance,
            coins: _coins,
            bosses_defeated: _bosses_defeated,
            enemies_defeated: _enemies_defeated,
            longest_coin_streak: _longest_coin_streak,
            timestamp: current_time,
        });
    }
    
    // ===== TOURNAMENT ENDING =====
    
    /// Calculate creator reward using boost system
    /// 50% until creation fee ($5.00) is covered, then 20% of remaining
    fun calculate_creator_reward(
        total_entry_fees_usd_cents: u64,
        creation_fee_usd_cents: u64
    ): u64 {
        let boost_percentage = 5000; // 50% in basis points
        let standard_percentage = 2000; // 20% in basis points
        
        // Calculate boost reward (50% of entry fees)
        let boost_reward = (total_entry_fees_usd_cents * boost_percentage) / 10000;
        
        if (boost_reward <= creation_fee_usd_cents) {
            // Still in boost phase
            return boost_reward
        } else {
            // Boost phase complete, calculate remaining
            let boost_threshold = (creation_fee_usd_cents * 10000) / boost_percentage; // $10.00
            let remaining_fees = total_entry_fees_usd_cents - boost_threshold;
            let remaining_reward = (remaining_fees * standard_percentage) / 10000;
            return creation_fee_usd_cents + remaining_reward
        }
    }
    
    /// End tournament and calculate creator reward
    #[allow(lint(public_entry))]
    public entry fun end_tournament(
        _admin_cap: &AdminCapability,
        tournament: &mut Tournament,
        clock: &Clock,
        _ctx: &mut TxContext
    ) {
        let current_time = clock::timestamp_ms(clock);
        
        // Validate tournament has ended
        assert!(current_time > tournament.end_time, E_TOURNAMENT_NOT_ENDED);
        
        // Validate rewards haven't been distributed (status must be pending)
        assert!(tournament.distribution_status == DISTRIBUTION_PENDING, E_REWARDS_ALREADY_DISTRIBUTED);
        
        // Calculate creator reward (if tournament was created by user)
        if (tournament.creation_fee_paid > 0) {
            let total_entry_fees = tournament.prize_pool_usd_cents - tournament.starting_ante_usd_cents;
            let creator_reward = calculate_creator_reward(total_entry_fees, tournament.creation_fee_paid);
            tournament.creator_reward_usd_cents = creator_reward;
        };
        
        // Mark as distributed
        tournament.distribution_status = DISTRIBUTION_COMPLETED;
        
        // Get top winners (simplified - returns all participants sorted)
        // Note: Full sorting and distribution logic would be implemented here
        // For now, we mark as distributed and emit event
        // Backend will handle actual reward distribution based on leaderboard
        
        let winners = vector::empty<address>();
        // TODO: Implement full winner calculation and reward distribution
        
        // Emit TournamentEnded event (include creator reward)
        event::emit(TournamentEnded {
            tournament_id: tournament.tournament_id,
            winners,
            prize_pool_usd_cents: tournament.prize_pool_usd_cents,
            creator_reward_usd_cents: tournament.creator_reward_usd_cents,  // NEW
            distribution_status: DISTRIBUTION_COMPLETED,
            timestamp: current_time,
        });
    }
    
    // ===== VIEW FUNCTIONS =====
    
    /// Get tournament prize pool (USD cents)
    public fun get_prize_pool_usd_cents(tournament: &Tournament): u64 {
        tournament.prize_pool_usd_cents
    }
    
    /// Get player's score in tournament
    public fun get_player_score(tournament: &Tournament, player: address): u64 {
        if (table::contains(&tournament.leaderboard, player)) {
            table::borrow(&tournament.leaderboard, player).value
        } else {
            0
        }
    }
    
    /// Get player's name from leaderboard
    public fun get_player_name(tournament: &Tournament, player: address): vector<u8> {
        if (table::contains(&tournament.leaderboard, player)) {
            table::borrow(&tournament.leaderboard, player).player_name
        } else {
            vector::empty()
        }
    }
    
    /// Check if player has entered tournament
    public fun has_player_entered(tournament: &Tournament, player: address): bool {
        table::contains(&tournament.participants, player)
    }
    
    /// Get tournament status
    public fun is_tournament_active(tournament: &Tournament, clock: &Clock): bool {
        let current_time = clock::timestamp_ms(clock);
        current_time >= tournament.start_time && current_time <= tournament.end_time
    }
    
    /// Get tournament reward configuration
    /// Note: Cannot return Option directly since TournamentRewardConfig contains Table (no copy ability)
    /// Use has_custom_reward_config() and get_reward_config_fields() instead
    public fun get_reward_config(_tournament: &Tournament): bool {
        // TODO: Restructure to avoid copying Option with Table
        // For now, return false (no custom config)
        false
    }
    
    /// Check if tournament has custom reward configuration
    public fun has_custom_reward_config(tournament: &Tournament): bool {
        option::is_some(&tournament.reward_config)
    }
    
    /// Get starting ante
    public fun get_starting_ante_usd_cents(tournament: &Tournament): u64 {
        tournament.starting_ante_usd_cents
    }
    
    /// Get tournament creator
    public fun get_created_by(tournament: &Tournament): address {
        tournament.created_by
    }
    
    /// Get creation fee paid
    public fun get_creation_fee_paid(tournament: &Tournament): u64 {
        tournament.creation_fee_paid
    }
    
    /// Get creator reward
    public fun get_creator_reward_usd_cents(tournament: &Tournament): u64 {
        tournament.creator_reward_usd_cents
    }
    
    /// Check if creator reward has been paid
    public fun is_creator_reward_paid(tournament: &Tournament): bool {
        tournament.creator_reward_paid
    }
    
    // ===== ADMIN FUNCTIONS =====
    
    /// Create admin capability for tournament management
    public entry fun create_admin_capability(admin_address: address, ctx: &mut TxContext) {
        // Create admin capability and transfer to admin address
        // Only the admin wallet can use this capability to manage tournaments
        let admin_cap = AdminCapability {
            id: object::new(ctx),
        };
        transfer::transfer(admin_cap, admin_address);
    }
}

