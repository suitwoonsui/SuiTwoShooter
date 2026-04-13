module suitwo_game::achievement_system {
    use sui::object::{Self, UID, ID};
    use sui::event;
    use sui::table::{Self, Table};
    use sui::transfer;
    use sui::clock::{Self, Clock};
    use sui::tx_context::{Self, TxContext};
    use std::vector;

    // ===== CONSTANTS =====
    
    // Achievement categories
    const CATEGORY_GAMES_PLAYED: u8 = 1;
    const CATEGORY_BOSSES_PER_GAME: u8 = 2;
    const CATEGORY_BOSSES_CUMULATIVE: u8 = 3;
    const CATEGORY_SCORE_PER_GAME: u8 = 4;
    const CATEGORY_SCORE_CUMULATIVE: u8 = 5;
    const CATEGORY_DISTANCE_PER_GAME: u8 = 6;
    const CATEGORY_DISTANCE_CUMULATIVE: u8 = 7;
    const CATEGORY_COINS_PER_GAME: u8 = 8;
    const CATEGORY_COINS_CUMULATIVE: u8 = 9;
    const CATEGORY_ENEMIES_PER_GAME: u8 = 10;
    const CATEGORY_ENEMIES_CUMULATIVE: u8 = 11;
    const CATEGORY_COIN_STREAK: u8 = 12;

    // Item type constants (matches store contract)
    const ITEM_ORB_LEVEL: u8 = 0;
    const ITEM_FORCE_FIELD: u8 = 1;
    const ITEM_EXTRA_LIVES: u8 = 2;
    const ITEM_SLOW_TIME: u8 = 3;
    const ITEM_COIN_TRACTOR_BEAM: u8 = 4;
    const ITEM_DESTROY_ALL: u8 = 5;
    const ITEM_BOSS_KILL_SHOT: u8 = 6;

    // Errors
    const E_NOT_AUTHORIZED: u64 = 0;
    const E_MILESTONE_NOT_FOUND: u64 = 1;
    const E_MILESTONE_ALREADY_CLAIMED: u64 = 2;
    const E_REGISTRY_NOT_INITIALIZED: u64 = 3;
    const E_INVALID_CATEGORY: u64 = 4;
    const E_INVALID_THRESHOLD: u64 = 5;
    const E_MILESTONE_ALREADY_EXISTS: u64 = 6;
    const E_INVALID_MILESTONE_LEVEL: u64 = 7;
    const E_REWARD_NOT_FOUND: u64 = 8;
    const E_REWARD_ALREADY_EXISTS: u64 = 9;

    // ===== STRUCTS =====
    
    /// Item reward entry
    struct ItemReward has store, drop, copy {
        item_id: u8,      // Item type: 0=orbLevel, 1=forceField, 2=extraLives, 3=slowTime, 4=coinTractorBeam, 5=destroyAll, 6=bossKillShot
        level: u8,        // Item level (1, 2, or 3) - special items (destroyAll, bossKillShot) are always level 1
        quantity: u64,    // Number of items
    }
    
    /// Public constructor for ItemReward (allows other modules to create ItemReward instances)
    public fun create_item_reward(item_id: u8, level: u8, quantity: u64): ItemReward {
        ItemReward {
            item_id,
            level,
            quantity,
        }
    }
    
    /// Milestone location (category and level) for index lookup
    struct MilestoneLocation has store, drop, copy {
        category: u8,
        level: u8,
    }
    
    /// Achievement milestone definition (stored on-chain)
    /// Each milestone declares its own rewards (credits + items)
    struct MilestoneDefinition has store, drop, copy {
        milestone_id: u64,        // Stable unique identifier (never changes)
        milestone_level: u8,     // Level within category (can change during reorganization)
        category: u8,
        threshold: u64,          // The value needed (e.g., 5 games, 100 coins) - can be changed
        credits: u64,            // Free credits awarded
        items: vector<ItemReward>,  // Item rewards
    }

    /// Player's claimed achievements tracker
    struct PlayerAchievements has key, store {
        id: UID,
        player: address,
        
        // Track claimed milestones per category using milestone_level (not threshold)
        // Format: category -> set of claimed milestone levels (e.g., [1, 2, 3] for Level1, Level2, Level3)
        games_played_claimed: vector<u8>,           // e.g., [1, 2, 3] for milestone levels
        bosses_per_game_claimed: vector<u8>,         // e.g., [1, 2, 3]
        bosses_cumulative_claimed: vector<u8>,        // e.g., [1, 2, 3]
        score_per_game_claimed: vector<u8>,          // e.g., [1, 2, 3]
        score_cumulative_claimed: vector<u8>,        // e.g., [1, 2, 3]
        distance_per_game_claimed: vector<u8>,       // e.g., [1, 2, 3]
        distance_cumulative_claimed: vector<u8>,     // e.g., [1, 2, 3]
        coins_per_game_claimed: vector<u8>,          // e.g., [1, 2, 3]
        coins_cumulative_claimed: vector<u8>,        // e.g., [1, 2, 3]
        enemies_per_game_claimed: vector<u8>,        // e.g., [1, 2, 3]
        enemies_cumulative_claimed: vector<u8>,      // e.g., [1, 2, 3]
        coin_streak_claimed: vector<u8>,             // e.g., [1, 2, 3]
    }

    /// Registry to store all milestone definitions and player achievements
    struct AchievementRegistry has key {
        id: UID,
        admin: address,
        
        // Auto-incrementing counter for milestone IDs
        next_milestone_id: u64,
        
        // Milestone definitions: category -> Table<milestone_level, MilestoneDefinition>
        // milestone_level is the key (e.g., 1, 2, 3 for Level1, Level2, Level3)
        milestone_definitions: Table<u8, Table<u8, MilestoneDefinition>>,
        
        // Sorted milestone levels per category for efficient querying
        category_milestone_levels: Table<u8, vector<u8>>,
        
        // Index by milestone_id for efficient lookup
        milestone_by_id: Table<u64, MilestoneLocation>, // milestone_id -> (category, level)
        
        // Player achievements: player address -> PlayerAchievements ID
        player_achievements: Table<address, ID>,
        
        // ID-based claimed milestones tracking (source of truth)
        claimed_milestone_ids: Table<address, vector<u64>>, // All claimed milestone IDs
    }

    /// Admin capability for achievement management
    struct AdminCapability has key, store {
        id: UID,
    }

    // ===== EVENTS =====
    
    struct AchievementClaimed has copy, drop {
        player: address,
        category: u8,
        milestone_level: u8,  // Milestone level/ID (e.g., 1, 2, 3)
        milestone_id: u64,    // Stable unique identifier
        threshold: u64,       // Threshold value at time of claim
        credits_awarded: u64,
        timestamp: u64,
    }

    struct MilestoneDefinitionAdded has copy, drop {
        category: u8,
        milestone_level: u8,  // Milestone level/ID (e.g., 1, 2, 3)
        milestone_id: u64,    // Stable unique identifier
        threshold: u64,
        credits: u64,
        items_count: u64,  // Number of item rewards
        timestamp: u64,
    }

    struct MilestoneDefinitionUpdated has copy, drop {
        category: u8,
        milestone_level: u8,  // Milestone level/ID (unchanged)
        old_threshold: u64,
        new_threshold: u64,
        old_credits: u64,
        new_credits: u64,
        old_items_count: u64,
        new_items_count: u64,
        timestamp: u64,
    }

    struct MilestoneDefinitionDeleted has copy, drop {
        category: u8,
        milestone_level: u8,  // Milestone level/ID
        timestamp: u64,
    }

    struct AchievementUnclaimed has copy, drop {
        player: address,
        category: u8,
        milestone_level: u8,  // Milestone level/ID
        timestamp: u64,
    }

    // ===== INITIALIZATION =====
    
    /// Initialize achievement registry (one-time setup)
    public entry fun initialize_achievement_registry(admin_address: address, ctx: &mut TxContext) {
        let registry = AchievementRegistry {
            id: object::new(ctx),
            admin: admin_address,
            next_milestone_id: 1,
            milestone_definitions: table::new(ctx),
            category_milestone_levels: table::new(ctx),
            milestone_by_id: table::new(ctx),
            player_achievements: table::new(ctx),
            claimed_milestone_ids: table::new(ctx),
        };
        
        transfer::share_object(registry);
    }

    /// Create admin capability for achievement management
    public entry fun create_admin_capability(admin_address: address, ctx: &mut TxContext) {
        let admin_cap = AdminCapability {
            id: object::new(ctx),
        };
        transfer::transfer(admin_cap, admin_address);
    }

    // ===== MILESTONE DEFINITION MANAGEMENT =====
    
    /// Helper function to insert milestone level into sorted vector
    fun insert_milestone_level_sorted(levels: &mut vector<u8>, level: u8) {
        let len = vector::length(levels);
        let i = 0;
        
        // Find insertion point (keep sorted ascending)
        while (i < len) {
            let current = *vector::borrow(levels, i);
            if (current == level) {
                // Already exists, don't add duplicate
                return
            };
            if (current > level) {
                break
            };
            i = i + 1;
        };
        
        // Insert at position i
        vector::insert(levels, level, i);
    }

    /// Helper function to remove milestone level from sorted vector
    fun remove_milestone_level(levels: &mut vector<u8>, level: u8): bool {
        let len = vector::length(levels);
        let i = 0;
        
        while (i < len) {
            let current = *vector::borrow(levels, i);
            if (current == level) {
                vector::remove(levels, i);
                return true
            };
            i = i + 1;
        };
        
        false
    }
    
    /// Add a milestone definition (admin-only)
    /// milestone_level is the key (e.g., 1, 2, 3 for Level1, Level2, Level3)
    /// Each milestone declares its own rewards (credits + items)
    public fun add_milestone_definition(
        _admin_cap: &AdminCapability,
        registry: &mut AchievementRegistry,
        category: u8,
        milestone_level: u8,
        threshold: u64,
        credits: u64,
        items: vector<ItemReward>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(category >= CATEGORY_GAMES_PLAYED && category <= CATEGORY_COIN_STREAK, E_INVALID_CATEGORY);
        assert!(milestone_level > 0, E_INVALID_MILESTONE_LEVEL);
        assert!(threshold > 0, E_INVALID_THRESHOLD);
        
        // Get and increment milestone_id
        let milestone_id = registry.next_milestone_id;
        registry.next_milestone_id = milestone_id + 1;
        
        let milestone = MilestoneDefinition {
            milestone_id,
            milestone_level,
            category,
            threshold,
            credits,
            items,
        };
        
        // Get or create category table
        if (!table::contains(&registry.milestone_definitions, category)) {
            let category_table = table::new(ctx);
            table::add(&mut registry.milestone_definitions, category, category_table);
        };
        
        let category_table = table::borrow_mut(&mut registry.milestone_definitions, category);
        assert!(!table::contains(category_table, milestone_level), E_MILESTONE_ALREADY_EXISTS);
        table::add(category_table, milestone_level, milestone);
        
        // Add to milestone_by_id index
        table::add(&mut registry.milestone_by_id, milestone_id, MilestoneLocation {
            category,
            level: milestone_level,
        });
        
        // Maintain sorted milestone levels list
        if (!table::contains(&registry.category_milestone_levels, category)) {
            let levels = vector::empty<u8>();
            table::add(&mut registry.category_milestone_levels, category, levels);
        };
        let levels = table::borrow_mut(&mut registry.category_milestone_levels, category);
        insert_milestone_level_sorted(levels, milestone_level);
        
        sui::event::emit(MilestoneDefinitionAdded {
            category,
            milestone_level,
            milestone_id,
            threshold,
            credits,
            items_count: vector::length(&milestone.items),
            timestamp: clock::timestamp_ms(clock),
        });
    }

    /// Public entry function to add milestone definition with parallel vectors for items
    /// This avoids serialization issues with vector<ItemReward> from TypeScript
    public entry fun add_milestone_definition_entry(
        _admin_cap: &AdminCapability,
        registry: &mut AchievementRegistry,
        category: u8,
        milestone_level: u8,
        threshold: u64,
        credits: u64,
        item_ids: vector<u8>,
        item_levels: vector<u8>,
        item_quantities: vector<u64>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(category >= CATEGORY_GAMES_PLAYED && category <= CATEGORY_COIN_STREAK, E_INVALID_CATEGORY);
        assert!(milestone_level > 0, E_INVALID_MILESTONE_LEVEL);
        assert!(threshold > 0, E_INVALID_THRESHOLD);
        
        let len = vector::length(&item_ids);
        assert!(len == vector::length(&item_levels), E_INVALID_THRESHOLD);
        assert!(len == vector::length(&item_quantities), E_INVALID_THRESHOLD);
        
        // Build items vector from parallel vectors
        let items = vector::empty<ItemReward>();
        let i = 0;
        while (i < len) {
            let item_id = *vector::borrow(&item_ids, i);
            let level = *vector::borrow(&item_levels, i);
            let quantity = *vector::borrow(&item_quantities, i);
            
            let item = ItemReward {
                item_id,
                level,
                quantity,
            };
            vector::push_back(&mut items, item);
            i = i + 1;
        };
        
        // Call the internal function
        add_milestone_definition(
            _admin_cap,
            registry,
            category,
            milestone_level,
            threshold,
            credits,
            items,
            clock,
            ctx
        );
    }

    /// Update a milestone definition (admin-only)
    /// Can update threshold, credits, and items - milestone_level stays the same
    public fun update_milestone_definition(
        _admin_cap: &AdminCapability,
        registry: &mut AchievementRegistry,
        category: u8,
        milestone_level: u8,
        new_threshold: u64,
        new_credits: u64,
        new_items: vector<ItemReward>,
        clock: &Clock
    ) {
        assert!(category >= CATEGORY_GAMES_PLAYED && category <= CATEGORY_COIN_STREAK, E_INVALID_CATEGORY);
        assert!(new_threshold > 0, E_INVALID_THRESHOLD);
        
        // Verify milestone exists
        let (exists, old_credits) = get_milestone_definition(registry, category, milestone_level);
        assert!(exists, E_MILESTONE_NOT_FOUND);
        
        // Update the milestone definition
        let category_table = table::borrow_mut(&mut registry.milestone_definitions, category);
        let milestone = table::borrow_mut(category_table, milestone_level);
        let old_threshold = milestone.threshold;
        let old_items_count = vector::length(&milestone.items);
        milestone.threshold = new_threshold;
        milestone.credits = new_credits;
        milestone.items = new_items;
        let new_items_count = vector::length(&milestone.items);
        
        sui::event::emit(MilestoneDefinitionUpdated {
            category,
            milestone_level,
            old_threshold,
            new_threshold,
            old_credits,
            new_credits,
            old_items_count,
            new_items_count,
            timestamp: clock::timestamp_ms(clock),
        }        );
    }

    /// Public entry function to update milestone definition with parallel vectors for items
    /// This avoids serialization issues with vector<ItemReward> from TypeScript
    public entry fun update_milestone_definition_entry(
        _admin_cap: &AdminCapability,
        registry: &mut AchievementRegistry,
        category: u8,
        milestone_level: u8,
        new_threshold: u64,
        new_credits: u64,
        item_ids: vector<u8>,
        item_levels: vector<u8>,
        item_quantities: vector<u64>,
        clock: &Clock
    ) {
        assert!(category >= CATEGORY_GAMES_PLAYED && category <= CATEGORY_COIN_STREAK, E_INVALID_CATEGORY);
        assert!(new_threshold > 0, E_INVALID_THRESHOLD);
        
        let len = vector::length(&item_ids);
        assert!(len == vector::length(&item_levels), E_INVALID_THRESHOLD);
        assert!(len == vector::length(&item_quantities), E_INVALID_THRESHOLD);
        
        // Build items vector from parallel vectors
        let new_items = vector::empty<ItemReward>();
        let i = 0;
        while (i < len) {
            let item_id = *vector::borrow(&item_ids, i);
            let level = *vector::borrow(&item_levels, i);
            let quantity = *vector::borrow(&item_quantities, i);
            
            let item = ItemReward {
                item_id,
                level,
                quantity,
            };
            vector::push_back(&mut new_items, item);
            i = i + 1;
        };
        
        // Call the internal function
        update_milestone_definition(
            _admin_cap,
            registry,
            category,
            milestone_level,
            new_threshold,
            new_credits,
            new_items,
            clock
        );
    }

    /// Update only the threshold for a milestone (admin-only)
    public entry fun update_milestone_threshold(
        _admin_cap: &AdminCapability,
        registry: &mut AchievementRegistry,
        category: u8,
        milestone_level: u8,
        new_threshold: u64,
        clock: &Clock
    ) {
        assert!(category >= CATEGORY_GAMES_PLAYED && category <= CATEGORY_COIN_STREAK, E_INVALID_CATEGORY);
        assert!(new_threshold > 0, E_INVALID_THRESHOLD);
        
        // Verify milestone exists
        let (exists, credits) = get_milestone_definition(registry, category, milestone_level);
        assert!(exists, E_MILESTONE_NOT_FOUND);
        
        // Update only the threshold
        let category_table = table::borrow_mut(&mut registry.milestone_definitions, category);
        let milestone = table::borrow_mut(category_table, milestone_level);
        let old_threshold = milestone.threshold;
        let items_count = vector::length(&milestone.items);
        milestone.threshold = new_threshold;
        
        sui::event::emit(MilestoneDefinitionUpdated {
            category,
            milestone_level,
            old_threshold,
            new_threshold,
            old_credits: credits,
            new_credits: credits,
            old_items_count: items_count,
            new_items_count: items_count,
            timestamp: clock::timestamp_ms(clock),
        });
    }

    /// Update only the credits for a milestone (admin-only)
    public entry fun update_milestone_credits(
        _admin_cap: &AdminCapability,
        registry: &mut AchievementRegistry,
        category: u8,
        milestone_level: u8,
        new_credits: u64,
        clock: &Clock
    ) {
        assert!(category >= CATEGORY_GAMES_PLAYED && category <= CATEGORY_COIN_STREAK, E_INVALID_CATEGORY);
        
        // Verify milestone exists
        let (exists, old_credits) = get_milestone_definition(registry, category, milestone_level);
        assert!(exists, E_MILESTONE_NOT_FOUND);
        
        // Update only the credits
        let category_table = table::borrow_mut(&mut registry.milestone_definitions, category);
        let milestone = table::borrow_mut(category_table, milestone_level);
        let threshold = milestone.threshold;
        let items_count = vector::length(&milestone.items);
        milestone.credits = new_credits;
        
        sui::event::emit(MilestoneDefinitionUpdated {
            category,
            milestone_level,
            old_threshold: threshold,
            new_threshold: threshold,
            old_credits,
            new_credits,
            old_items_count: items_count,
            new_items_count: items_count,
            timestamp: clock::timestamp_ms(clock),
        });
    }

    /// Update only the items/rewards for a milestone (admin-only)
    public fun update_milestone_items(
        _admin_cap: &AdminCapability,
        registry: &mut AchievementRegistry,
        category: u8,
        milestone_level: u8,
        new_items: vector<ItemReward>,
        clock: &Clock
    ) {
        assert!(category >= CATEGORY_GAMES_PLAYED && category <= CATEGORY_COIN_STREAK, E_INVALID_CATEGORY);
        
        // Verify milestone exists
        let (exists, credits) = get_milestone_definition(registry, category, milestone_level);
        assert!(exists, E_MILESTONE_NOT_FOUND);
        
        // Update only the items
        let category_table = table::borrow_mut(&mut registry.milestone_definitions, category);
        let milestone = table::borrow_mut(category_table, milestone_level);
        let threshold = milestone.threshold;
        let old_items_count = vector::length(&milestone.items);
        milestone.items = new_items;
        let new_items_count = vector::length(&milestone.items);
        
        sui::event::emit(MilestoneDefinitionUpdated {
            category,
            milestone_level,
            old_threshold: threshold,
            new_threshold: threshold,
            old_credits: credits,
            new_credits: credits,
            old_items_count,
            new_items_count,
            timestamp: clock::timestamp_ms(clock),
        });
    }

    // ===== REWARD MANAGEMENT FUNCTIONS =====

    /// Helper function to find the index of a reward item by item_id and level
    fun find_reward_index(items: &vector<ItemReward>, item_id: u8, level: u8): (bool, u64) {
        let len = vector::length(items);
        let i = 0;
        while (i < len) {
            let reward = vector::borrow(items, i);
            if (reward.item_id == item_id && reward.level == level) {
                return (true, i)
            };
            i = i + 1;
        };
        (false, 0)
    }

    /// Add a single reward item to a milestone (admin-only)
    public entry fun add_milestone_reward(
        _admin_cap: &AdminCapability,
        registry: &mut AchievementRegistry,
        category: u8,
        milestone_level: u8,
        item_id: u8,
        level: u8,
        quantity: u64,
        clock: &Clock
    ) {
        assert!(category >= CATEGORY_GAMES_PLAYED && category <= CATEGORY_COIN_STREAK, E_INVALID_CATEGORY);
        assert!(quantity > 0, E_INVALID_THRESHOLD); // Reuse threshold error for quantity validation
        
        // Verify milestone exists
        let (exists, credits) = get_milestone_definition(registry, category, milestone_level);
        assert!(exists, E_MILESTONE_NOT_FOUND);
        
        // Get milestone and check if reward already exists
        let category_table = table::borrow_mut(&mut registry.milestone_definitions, category);
        let milestone = table::borrow_mut(category_table, milestone_level);
        let (reward_exists, _) = find_reward_index(&milestone.items, item_id, level);
        assert!(!reward_exists, E_REWARD_ALREADY_EXISTS);
        
        // Add the new reward
        let new_reward = ItemReward {
            item_id,
            level,
            quantity,
        };
        vector::push_back(&mut milestone.items, new_reward);
        
        let threshold = milestone.threshold;
        let old_items_count = vector::length(&milestone.items) - 1;
        let new_items_count = vector::length(&milestone.items);
        
        sui::event::emit(MilestoneDefinitionUpdated {
            category,
            milestone_level,
            old_threshold: threshold,
            new_threshold: threshold,
            old_credits: credits,
            new_credits: credits,
            old_items_count,
            new_items_count,
            timestamp: clock::timestamp_ms(clock),
        });
    }

    /// Edit a single reward item in a milestone (admin-only)
    /// Updates the quantity for an existing reward identified by item_id and level
    public entry fun edit_milestone_reward(
        _admin_cap: &AdminCapability,
        registry: &mut AchievementRegistry,
        category: u8,
        milestone_level: u8,
        item_id: u8,
        level: u8,
        new_quantity: u64,
        clock: &Clock
    ) {
        assert!(category >= CATEGORY_GAMES_PLAYED && category <= CATEGORY_COIN_STREAK, E_INVALID_CATEGORY);
        assert!(new_quantity > 0, E_INVALID_THRESHOLD); // Reuse threshold error for quantity validation
        
        // Verify milestone exists
        let (exists, credits) = get_milestone_definition(registry, category, milestone_level);
        assert!(exists, E_MILESTONE_NOT_FOUND);
        
        // Get milestone and find the reward
        let category_table = table::borrow_mut(&mut registry.milestone_definitions, category);
        let milestone = table::borrow_mut(category_table, milestone_level);
        let (reward_exists, reward_index) = find_reward_index(&milestone.items, item_id, level);
        assert!(reward_exists, E_REWARD_NOT_FOUND);
        
        // Update the reward quantity
        let reward = vector::borrow_mut(&mut milestone.items, reward_index);
        reward.quantity = new_quantity;
        
        let threshold = milestone.threshold;
        let items_count = vector::length(&milestone.items);
        
        sui::event::emit(MilestoneDefinitionUpdated {
            category,
            milestone_level,
            old_threshold: threshold,
            new_threshold: threshold,
            old_credits: credits,
            new_credits: credits,
            old_items_count: items_count,
            new_items_count: items_count,
            timestamp: clock::timestamp_ms(clock),
        });
    }

    /// Delete a single reward item from a milestone (admin-only)
    public entry fun delete_milestone_reward(
        _admin_cap: &AdminCapability,
        registry: &mut AchievementRegistry,
        category: u8,
        milestone_level: u8,
        item_id: u8,
        level: u8,
        clock: &Clock
    ) {
        assert!(category >= CATEGORY_GAMES_PLAYED && category <= CATEGORY_COIN_STREAK, E_INVALID_CATEGORY);
        
        // Verify milestone exists
        let (exists, credits) = get_milestone_definition(registry, category, milestone_level);
        assert!(exists, E_MILESTONE_NOT_FOUND);
        
        // Get milestone and find the reward
        let category_table = table::borrow_mut(&mut registry.milestone_definitions, category);
        let milestone = table::borrow_mut(category_table, milestone_level);
        let (reward_exists, reward_index) = find_reward_index(&milestone.items, item_id, level);
        assert!(reward_exists, E_REWARD_NOT_FOUND);
        
        // Remove the reward
        vector::remove(&mut milestone.items, reward_index);
        
        let threshold = milestone.threshold;
        let old_items_count = vector::length(&milestone.items) + 1;
        let new_items_count = vector::length(&milestone.items);
        
        sui::event::emit(MilestoneDefinitionUpdated {
            category,
            milestone_level,
            old_threshold: threshold,
            new_threshold: threshold,
            old_credits: credits,
            new_credits: credits,
            old_items_count,
            new_items_count,
            timestamp: clock::timestamp_ms(clock),
        });
    }

    /// Clear all rewards from a milestone (admin-only)
    public entry fun clear_milestone_rewards(
        _admin_cap: &AdminCapability,
        registry: &mut AchievementRegistry,
        category: u8,
        milestone_level: u8,
        clock: &Clock
    ) {
        assert!(category >= CATEGORY_GAMES_PLAYED && category <= CATEGORY_COIN_STREAK, E_INVALID_CATEGORY);
        
        // Verify milestone exists
        let (exists, credits) = get_milestone_definition(registry, category, milestone_level);
        assert!(exists, E_MILESTONE_NOT_FOUND);
        
        // Get milestone and clear all rewards
        let category_table = table::borrow_mut(&mut registry.milestone_definitions, category);
        let milestone = table::borrow_mut(category_table, milestone_level);
        let old_items_count = vector::length(&milestone.items);
        milestone.items = vector::empty<ItemReward>();
        let new_items_count = 0;
        
        let threshold = milestone.threshold;
        
        sui::event::emit(MilestoneDefinitionUpdated {
            category,
            milestone_level,
            old_threshold: threshold,
            new_threshold: threshold,
            old_credits: credits,
            new_credits: credits,
            old_items_count,
            new_items_count,
            timestamp: clock::timestamp_ms(clock),
        });
    }

    /// Delete a milestone definition (admin-only)
    public entry fun delete_milestone_definition(
        _admin_cap: &AdminCapability,
        registry: &mut AchievementRegistry,
        category: u8,
        milestone_level: u8,
        clock: &Clock
    ) {
        assert!(category >= CATEGORY_GAMES_PLAYED && category <= CATEGORY_COIN_STREAK, E_INVALID_CATEGORY);
        
        // Verify milestone exists
        let (exists, _) = get_milestone_definition(registry, category, milestone_level);
        assert!(exists, E_MILESTONE_NOT_FOUND);
        
        // Get milestone_id before removing
        let (has_id, milestone_id) = get_milestone_id(registry, category, milestone_level);
        
        // Remove from definitions table
        let category_table = table::borrow_mut(&mut registry.milestone_definitions, category);
        table::remove(category_table, milestone_level);
        
        // Remove from milestone_by_id index if it exists
        if (has_id && table::contains(&registry.milestone_by_id, milestone_id)) {
            table::remove(&mut registry.milestone_by_id, milestone_id);
        };
        
        // Remove from milestone levels list
        if (table::contains(&registry.category_milestone_levels, category)) {
            let levels = table::borrow_mut(&mut registry.category_milestone_levels, category);
            remove_milestone_level(levels, milestone_level);
        };
        
        sui::event::emit(MilestoneDefinitionDeleted {
            category,
            milestone_level,
            timestamp: clock::timestamp_ms(clock),
        });
    }

    /// Update milestone_id for existing milestones (migration function)
    public entry fun update_milestone_id(
        _admin_cap: &AdminCapability,
        registry: &mut AchievementRegistry,
        category: u8,
        milestone_level: u8,
        milestone_id: u64,
        clock: &Clock
    ) {
        assert!(category >= CATEGORY_GAMES_PLAYED && category <= CATEGORY_COIN_STREAK, E_INVALID_CATEGORY);
        
        let category_table = table::borrow_mut(&mut registry.milestone_definitions, category);
        let milestone = table::borrow_mut(category_table, milestone_level);
        
        // Update milestone_id
        milestone.milestone_id = milestone_id;
        
        // Add to index (remove old entry if exists)
        if (table::contains(&registry.milestone_by_id, milestone_id)) {
            table::remove(&mut registry.milestone_by_id, milestone_id);
        };
        table::add(&mut registry.milestone_by_id, milestone_id, MilestoneLocation {
            category,
            level: milestone_level,
        });
        
        // Update counter if needed
        if (milestone_id >= registry.next_milestone_id) {
            registry.next_milestone_id = milestone_id + 1;
        };
    }

    /// Reorganize milestone levels for a category (changes levels but keeps milestone_ids stable)
    /// old_levels and new_levels must be the same length, paired by index
    /// Handles level swaps by using temporary storage
    public entry fun reorganize_category_levels(
        _admin_cap: &AdminCapability,
        registry: &mut AchievementRegistry,
        category: u8,
        old_levels: vector<u8>,
        new_levels: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(category >= CATEGORY_GAMES_PLAYED && category <= CATEGORY_COIN_STREAK, E_INVALID_CATEGORY);
        assert!(vector::length(&old_levels) == vector::length(&new_levels), E_INVALID_MILESTONE_LEVEL);
        
        let len = vector::length(&old_levels);
        let category_table = table::borrow_mut(&mut registry.milestone_definitions, category);
        
        // Step 1: Remove all milestones from old levels and store temporarily by old_level
        // This handles level swaps (e.g., 2->3 and 3->2) by removing both before adding
        let temp_storage = table::new(ctx);
        let i = 0;
        while (i < len) {
            let old_level = *vector::borrow(&old_levels, i);
            let new_level = *vector::borrow(&new_levels, i);
            
            // Only process if level actually changes
            if (old_level != new_level && table::contains(category_table, old_level)) {
                let milestone = table::remove(category_table, old_level);
                // Store by old_level so we can retrieve by position in vector
                table::add(&mut temp_storage, old_level, milestone);
            };
            
            i = i + 1;
        };
        
        // Step 2: Add milestones to new levels and update index
        let j = 0;
        while (j < len) {
            let old_level = *vector::borrow(&old_levels, j);
            let new_level = *vector::borrow(&new_levels, j);
            
            // Only process if level actually changes
            if (old_level != new_level && table::contains(&temp_storage, old_level)) {
                let milestone = table::remove(&mut temp_storage, old_level);
                let milestone_id = milestone.milestone_id;
                
                // Update level in milestone
                milestone.milestone_level = new_level;
                
                // Add at new level
                table::add(category_table, new_level, milestone);
                
                // Update milestone_by_id index
                if (table::contains(&registry.milestone_by_id, milestone_id)) {
                    table::remove(&mut registry.milestone_by_id, milestone_id);
                };
                table::add(&mut registry.milestone_by_id, milestone_id, MilestoneLocation {
                    category,
                    level: new_level,
                });
            };
            
            j = j + 1;
        };
        
        // Step 3: Update category_milestone_levels vector
        if (table::contains(&registry.category_milestone_levels, category)) {
            table::remove(&mut registry.category_milestone_levels, category);
            let new_levels_vec = vector::empty<u8>();
            let k = 0;
            while (k < len) {
                let new_level = *vector::borrow(&new_levels, k);
                vector::push_back(&mut new_levels_vec, new_level);
                k = k + 1;
            };
            table::add(&mut registry.category_milestone_levels, category, new_levels_vec);
        };
        
        // Step 4: Destroy empty temp_storage table
        table::destroy_empty(temp_storage);
    }

    /// Get milestone definition by milestone_level (returns credits only for backward compatibility)
    public fun get_milestone_definition(
        registry: &AchievementRegistry,
        category: u8,
        milestone_level: u8
    ): (bool, u64) {  // (exists, credits)
        if (!table::contains(&registry.milestone_definitions, category)) {
            return (false, 0)
        };
        
        let category_table = table::borrow(&registry.milestone_definitions, category);
        if (!table::contains(category_table, milestone_level)) {
            return (false, 0)
        };
        
        let milestone = table::borrow(category_table, milestone_level);
        (true, milestone.credits)
    }

    /// Get full milestone definition by milestone_level (credits + items + threshold + milestone_id)
    public fun get_milestone_definition_full(
        registry: &AchievementRegistry,
        category: u8,
        milestone_level: u8
    ): (bool, u64, u64, u64, vector<ItemReward>) {  // (exists, milestone_id, threshold, credits, items)
        if (!table::contains(&registry.milestone_definitions, category)) {
            return (false, 0, 0, 0, vector::empty())
        };
        
        let category_table = table::borrow(&registry.milestone_definitions, category);
        if (!table::contains(category_table, milestone_level)) {
            return (false, 0, 0, 0, vector::empty())
        };
        
        let milestone = table::borrow(category_table, milestone_level);
        (true, milestone.milestone_id, milestone.threshold, milestone.credits, milestone.items)
    }

    /// Get milestone by stable ID
    public fun get_milestone_by_id(
        registry: &AchievementRegistry,
        milestone_id: u64
    ): (bool, MilestoneDefinition) {
        if (!table::contains(&registry.milestone_by_id, milestone_id)) {
            return (false, MilestoneDefinition {
                milestone_id: 0,
                milestone_level: 0,
                category: 0,
                threshold: 0,
                credits: 0,
                items: vector::empty(),
            })
        };
        
        let location = table::borrow(&registry.milestone_by_id, milestone_id);
        let (exists, _id, _threshold, _credits, _items) = get_milestone_definition_full(registry, location.category, location.level);
        if (!exists) {
            return (false, MilestoneDefinition {
                milestone_id: 0,
                milestone_level: 0,
                category: 0,
                threshold: 0,
                credits: 0,
                items: vector::empty(),
            })
        };
        
        // Get the actual milestone to get milestone_level
        let category_table = table::borrow(&registry.milestone_definitions, location.category);
        let milestone = table::borrow(category_table, location.level);
        
        (true, *milestone)
    }

    /// Get milestone_id for a category/level
    public fun get_milestone_id(
        registry: &AchievementRegistry,
        category: u8,
        milestone_level: u8
    ): (bool, u64) {
        if (!table::contains(&registry.milestone_definitions, category)) {
            return (false, 0)
        };
        
        let category_table = table::borrow(&registry.milestone_definitions, category);
        if (!table::contains(category_table, milestone_level)) {
            return (false, 0)
        };
        
        let milestone = table::borrow(category_table, milestone_level);
        (true, milestone.milestone_id)
    }

    // ===== PLAYER ACHIEVEMENTS =====
    
    /// Get or create PlayerAchievements for a player
    fun get_or_create_player_achievements_id(
        registry: &mut AchievementRegistry,
        player: address,
        ctx: &mut TxContext
    ): ID {
        if (table::contains(&registry.player_achievements, player)) {
            *table::borrow(&registry.player_achievements, player)
        } else {
            let achievements = PlayerAchievements {
                id: object::new(ctx),
                player,
                games_played_claimed: vector::empty(),
                bosses_per_game_claimed: vector::empty(),
                bosses_cumulative_claimed: vector::empty(),
                score_per_game_claimed: vector::empty(),
                score_cumulative_claimed: vector::empty(),
                distance_per_game_claimed: vector::empty(),
                distance_cumulative_claimed: vector::empty(),
                coins_per_game_claimed: vector::empty(),
                coins_cumulative_claimed: vector::empty(),
                enemies_per_game_claimed: vector::empty(),
                enemies_cumulative_claimed: vector::empty(),
                coin_streak_claimed: vector::empty(),
            };
            
            let achievements_id = object::id(&achievements);
            table::add(&mut registry.player_achievements, player, achievements_id);
            transfer::transfer(achievements, player);
            achievements_id
        }
    }

    /// Check if a milestone has been claimed (by milestone_level) - using PlayerAchievements object
    public fun is_milestone_claimed(
        achievements: &PlayerAchievements,
        category: u8,
        milestone_level: u8
    ): bool {
        let claimed_list = get_claimed_list(achievements, category);
        vector::contains(claimed_list, &milestone_level)
    }


    /// Get the list of claimed milestone levels for a category
    fun get_claimed_list(achievements: &PlayerAchievements, category: u8): &vector<u8> {
        if (category == CATEGORY_GAMES_PLAYED) {
            &achievements.games_played_claimed
        } else if (category == CATEGORY_BOSSES_PER_GAME) {
            &achievements.bosses_per_game_claimed
        } else if (category == CATEGORY_BOSSES_CUMULATIVE) {
            &achievements.bosses_cumulative_claimed
        } else if (category == CATEGORY_SCORE_PER_GAME) {
            &achievements.score_per_game_claimed
        } else if (category == CATEGORY_SCORE_CUMULATIVE) {
            &achievements.score_cumulative_claimed
        } else if (category == CATEGORY_DISTANCE_PER_GAME) {
            &achievements.distance_per_game_claimed
        } else if (category == CATEGORY_DISTANCE_CUMULATIVE) {
            &achievements.distance_cumulative_claimed
        } else if (category == CATEGORY_COINS_PER_GAME) {
            &achievements.coins_per_game_claimed
        } else if (category == CATEGORY_COINS_CUMULATIVE) {
            &achievements.coins_cumulative_claimed
        } else if (category == CATEGORY_ENEMIES_PER_GAME) {
            &achievements.enemies_per_game_claimed
        } else if (category == CATEGORY_ENEMIES_CUMULATIVE) {
            &achievements.enemies_cumulative_claimed
        } else if (category == CATEGORY_COIN_STREAK) {
            &achievements.coin_streak_claimed
        } else {
            abort E_INVALID_CATEGORY
        }
    }

    /// Helper function to find milestone index in a vector (recursive)
    fun find_milestone_index(list: &vector<u8>, milestone_level: u8, current_index: u64, len: u64): (bool, u64) {
        if (current_index >= len) {
            (false, 0)
        } else if (*vector::borrow(list, current_index) == milestone_level) {
            (true, current_index)
        } else {
            find_milestone_index(list, milestone_level, current_index + 1, len)
        }
    }

    fun find_milestone_id_index(list: &vector<u64>, milestone_id: u64, current_index: u64, len: u64): (bool, u64) {
        if (current_index >= len) {
            (false, 0)
        } else if (*vector::borrow(list, current_index) == milestone_id) {
            (true, current_index)
        } else {
            find_milestone_id_index(list, milestone_id, current_index + 1, len)
        }
    }

    /// Get mutable list of claimed milestone levels for a category
    fun get_claimed_list_mut(achievements: &mut PlayerAchievements, category: u8): &mut vector<u8> {
        if (category == CATEGORY_GAMES_PLAYED) {
            &mut achievements.games_played_claimed
        } else if (category == CATEGORY_BOSSES_PER_GAME) {
            &mut achievements.bosses_per_game_claimed
        } else if (category == CATEGORY_BOSSES_CUMULATIVE) {
            &mut achievements.bosses_cumulative_claimed
        } else if (category == CATEGORY_SCORE_PER_GAME) {
            &mut achievements.score_per_game_claimed
        } else if (category == CATEGORY_SCORE_CUMULATIVE) {
            &mut achievements.score_cumulative_claimed
        } else if (category == CATEGORY_DISTANCE_PER_GAME) {
            &mut achievements.distance_per_game_claimed
        } else if (category == CATEGORY_DISTANCE_CUMULATIVE) {
            &mut achievements.distance_cumulative_claimed
        } else if (category == CATEGORY_COINS_PER_GAME) {
            &mut achievements.coins_per_game_claimed
        } else if (category == CATEGORY_COINS_CUMULATIVE) {
            &mut achievements.coins_cumulative_claimed
        } else if (category == CATEGORY_ENEMIES_PER_GAME) {
            &mut achievements.enemies_per_game_claimed
        } else if (category == CATEGORY_ENEMIES_CUMULATIVE) {
            &mut achievements.enemies_cumulative_claimed
        } else if (category == CATEGORY_COIN_STREAK) {
            &mut achievements.coin_streak_claimed
        } else {
            abort E_INVALID_CATEGORY
        }
    }

    /// Mark a milestone as claimed (admin-only, called by backend)
    public entry fun claim_milestone(
        _admin_cap: &AdminCapability,
        registry: &mut AchievementRegistry,
        player: address,
        category: u8,
        milestone_level: u8,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(category >= CATEGORY_GAMES_PLAYED && category <= CATEGORY_COIN_STREAK, E_INVALID_CATEGORY);
        
        // Verify milestone exists and get milestone_id, threshold + credits
        let (exists, milestone_id, threshold, credits, _) = get_milestone_definition_full(registry, category, milestone_level);
        assert!(exists, E_MILESTONE_NOT_FOUND);
        
        // Track by milestone_id ONLY (this is the source of truth - only table we use)
        if (!table::contains(&registry.claimed_milestone_ids, player)) {
            let claimed_ids = vector::empty<u64>();
            table::add(&mut registry.claimed_milestone_ids, player, claimed_ids);
        };
        let claimed_ids = table::borrow_mut(&mut registry.claimed_milestone_ids, player);
        
        // Check if already claimed by milestone_id (source of truth)
        if (vector::contains(claimed_ids, &milestone_id)) {
            // Already claimed, just emit event and return
            event::emit(AchievementClaimed {
                player,
                category,
                milestone_level,
                milestone_id,
                threshold,
                credits_awarded: credits,
                timestamp: clock::timestamp_ms(clock),
            });
            return
        };
        
        // Add milestone_id to claimed_ids (source of truth - only table we update)
        vector::push_back(claimed_ids, milestone_id);
        
        // Emit event
        event::emit(AchievementClaimed {
            player,
            category,
            milestone_level,
            milestone_id,
            threshold,
            credits_awarded: credits,
            timestamp: clock::timestamp_ms(clock),
        });
    }

    /// Unclaim a milestone by milestone_id (admin-only, preferred method)
    public entry fun unclaim_milestone_by_id(
        _admin_cap: &AdminCapability,
        registry: &mut AchievementRegistry,
        player: address,
        milestone_id: u64,
        clock: &Clock
    ) {
        // Check if player has claimed milestone IDs
        if (!table::contains(&registry.claimed_milestone_ids, player)) {
            abort E_MILESTONE_NOT_FOUND
        };
        
        let claimed_ids = table::borrow_mut(&mut registry.claimed_milestone_ids, player);
        
        // Find and remove milestone_id from claimed_ids (source of truth)
        let len = vector::length(claimed_ids);
        let (found, index) = find_milestone_id_index(claimed_ids, milestone_id, 0, len);
        
        if (!found) {
            abort E_MILESTONE_NOT_FOUND
        };
        
        vector::remove(claimed_ids, index);
        
        // Get milestone location for event
        let (category, milestone_level) = if (table::contains(&registry.milestone_by_id, milestone_id)) {
            let location = *table::borrow(&registry.milestone_by_id, milestone_id);
            (location.category, location.level)
        } else {
            (0, 0) // Unknown category/level if milestone definition was deleted
        };
        
        // Emit event
        event::emit(AchievementUnclaimed {
            player,
            category,
            milestone_level,
            timestamp: clock::timestamp_ms(clock),
        });
    }

    /// Unclaim a milestone (admin-only, for corrections) - DEPRECATED: Use unclaim_milestone_by_id
    public entry fun unclaim_milestone(
        _admin_cap: &AdminCapability,
        registry: &mut AchievementRegistry,
        player: address,
        category: u8,
        milestone_level: u8,
        clock: &Clock
    ) {
        assert!(category >= CATEGORY_GAMES_PLAYED && category <= CATEGORY_COIN_STREAK, E_INVALID_CATEGORY);
        
        // Get milestone_id from category and level
        let (exists, milestone_id) = get_milestone_id(registry, category, milestone_level);
        if (!exists) {
            abort E_MILESTONE_NOT_FOUND
        };
        
        // Use the new method
        unclaim_milestone_by_id(_admin_cap, registry, player, milestone_id, clock);
    }

    // ===== VIEW FUNCTIONS =====
    
    /// Get PlayerAchievements ID for a player (returns option)
    public fun get_player_achievements_id(
        registry: &AchievementRegistry,
        player: address
    ): (bool, ID) {  // (exists, achievements_id)
        if (table::contains(&registry.player_achievements, player)) {
            let achievements_id = *table::borrow(&registry.player_achievements, player);
            (true, achievements_id)
        } else {
            (false, object::id_from_address(@0x0))
        }
    }
    
    /// Get all claimed milestones for a player (convenience function)
    /// Get all claimed milestone IDs for a player (stable IDs, not levels)
    /// This is the preferred method for checking eligibility since milestone_ids are stable
    /// even when milestone levels are reorganized
    public fun get_claimed_milestone_ids_for_player(
        registry: &AchievementRegistry,
        player: address
    ): vector<u64> {
        if (!table::contains(&registry.claimed_milestone_ids, player)) {
            return vector::empty<u64>()
        };
        *table::borrow(&registry.claimed_milestone_ids, player)
    }
    
    /// Check if a specific milestone_id is claimed for a player
    public fun is_milestone_id_claimed(
        registry: &AchievementRegistry,
        player: address,
        milestone_id: u64
    ): bool {
        if (!table::contains(&registry.claimed_milestone_ids, player)) {
            return false
        };
        let claimed_ids = table::borrow(&registry.claimed_milestone_ids, player);
        vector::contains(claimed_ids, &milestone_id)
    }
    
    /// Get all claimed milestones for a player (direct object access)
    /// Returns milestone levels (u8), not thresholds
    public fun get_claimed_milestones(
        achievements: &PlayerAchievements
    ): (
        vector<u8>,   // games_played_claimed (milestone levels)
        vector<u8>,   // bosses_per_game_claimed
        vector<u8>,   // bosses_cumulative_claimed
        vector<u8>,   // score_per_game_claimed
        vector<u8>,   // score_cumulative_claimed
        vector<u8>,   // distance_per_game_claimed
        vector<u8>,   // distance_cumulative_claimed
        vector<u8>,   // coins_per_game_claimed
        vector<u8>,   // coins_cumulative_claimed
        vector<u8>,   // enemies_per_game_claimed
        vector<u8>,   // enemies_cumulative_claimed
        vector<u8>    // coin_streak_claimed
    ) {
        (
            achievements.games_played_claimed,
            achievements.bosses_per_game_claimed,
            achievements.bosses_cumulative_claimed,
            achievements.score_per_game_claimed,
            achievements.score_cumulative_claimed,
            achievements.distance_per_game_claimed,
            achievements.distance_cumulative_claimed,
            achievements.coins_per_game_claimed,
            achievements.coins_cumulative_claimed,
            achievements.enemies_per_game_claimed,
            achievements.enemies_cumulative_claimed,
            achievements.coin_streak_claimed,
        )
    }

    /// Check if category has milestone definitions
    public fun has_category_definitions(
        registry: &AchievementRegistry,
        category: u8
    ): bool {
        table::contains(&registry.milestone_definitions, category)
    }

    /// Get all milestone levels for a category (sorted)
    public fun get_all_milestone_levels_for_category(
        registry: &AchievementRegistry,
        category: u8
    ): vector<u8> {
        if (table::contains(&registry.category_milestone_levels, category)) {
            *table::borrow(&registry.category_milestone_levels, category)
        } else {
            vector::empty()
        }
    }

    /// Get claimed milestones for a specific category (returns milestone levels)
    public fun get_claimed_milestones_for_category(
        achievements: &PlayerAchievements,
        category: u8
    ): vector<u8> {
        let claimed_list = get_claimed_list(achievements, category);
        *claimed_list  // Return copy
    }

    /// Get claimed milestones for a specific category (via registry)
    /// Returns milestone levels (u8), not thresholds
    public fun get_claimed_milestones_for_category_via_registry(
        registry: &AchievementRegistry,
        player: address,
        category: u8
    ): (bool, vector<u8>) {  // (exists, claimed_milestone_levels)
        if (!table::contains(&registry.player_achievements, player)) {
            return (false, vector::empty())
        };
        
        let _achievements_id = *table::borrow(&registry.player_achievements, player);
        // TODO: Cannot borrow object by ID directly - needs to restructure
        // For now, return empty vector since we can't access the object
        (true, vector::empty())
        // let achievements = object::borrow<PlayerAchievements>(&achievements_id);
        // let claimed_list = get_claimed_list(achievements, category);
        // (true, *claimed_list)
    }

    /// Get all milestone definitions for a category
    /// Note: This requires querying each milestone_level individually since Table doesn't support iteration
    /// For efficiency, use get_all_milestone_levels_for_category first, then query each level
    /// Returns a vector of milestone definitions (can't return tuples with nested vectors in Move)
    /// Use get_milestone_definition_full for individual lookups
    public fun get_milestone_definitions_for_category(
        registry: &AchievementRegistry,
        category: u8,
        milestone_levels: vector<u8>
    ): vector<MilestoneDefinition> {
        let result = vector::empty<MilestoneDefinition>();
        let len = vector::length(&milestone_levels);
        let i = 0;
        
        if (!table::contains(&registry.milestone_definitions, category)) {
            return result
        };
        
        let category_table = table::borrow(&registry.milestone_definitions, category);
        
        while (i < len) {
            let milestone_level = *vector::borrow(&milestone_levels, i);
            if (table::contains(category_table, milestone_level)) {
                let milestone = table::borrow(category_table, milestone_level);
                // Copy the milestone definition
                vector::push_back(&mut result, *milestone);
            };
            i = i + 1;
        };
        
        result
    }

}

