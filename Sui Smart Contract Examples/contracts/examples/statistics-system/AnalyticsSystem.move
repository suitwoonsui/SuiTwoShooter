module smart_contract_examples::analytics_system {
    use sui::table::{Self, Table};
    use sui::event;

    // ===== CONSTANTS =====
    const USER_TIER_BASIC: u8 = 0;
    const USER_TIER_STANDARD: u8 = 1;
    const USER_TIER_PREMIUM: u8 = 2;
    const USER_TIER_PROFESSIONAL: u8 = 3;
    const USER_TIER_ENTERPRISE: u8 = 4;

    // ===== STRUCTS =====
    public struct UserAnalytics has key, store {
        id: sui::object::UID,
        user: address,
        
        // Activity counts
        total_activities: u64,
        
        // Single activity personal bests
        best_value: u64,
        best_category: u8,
        best_duration: u64,
        
        // Averages
        average_value: u64,
        average_category: u64,
        average_duration: u64,
        
        // User tier
        current_tier: u8,
        
        // Timestamps
        first_activity: u64,
        last_activity: u64,
        
        // Total actions
        total_actions: u64
    }

    public struct AnalyticsSystem has key {
        id: sui::object::UID,
        user_analytics_table: Table<address, UserAnalytics>,
        total_users: u64,
        is_paused: bool,
        authorized_contracts: Table<address, bool>
    }

    // ===== EVENTS =====
    public struct UserAnalyticsUpdated has copy, drop {
        user: address,
        new_value: u64,
        new_category: u8,
        new_tier: u8
    }

    public struct SystemPaused has copy, drop {
        admin: address
    }

    public struct SystemResumed has copy, drop {
        admin: address
    }

    public struct ContractAuthorized has copy, drop {
        contract_address: address,
        admin: address
    }

    public struct ContractDeauthorized has copy, drop {
        contract_address: address,
        admin: address
    }

    // ===== INITIALIZATION =====
    public fun init(ctx: &mut sui::tx_context::TxContext) {
        let system = AnalyticsSystem {
            id: sui::object::new(ctx),
            user_analytics_table: table::new(ctx),
            total_users: 0,
            is_paused: false,
            authorized_contracts: table::new(ctx)
        };

        sui::transfer::share_object(system);
    }

    // ===== ADMIN FUNCTIONS =====
    public fun pause_system(system: &mut AnalyticsSystem, admin: address) {
        assert!(!system.is_paused, 0);
        system.is_paused = true;
        event::emit(SystemPaused { admin });
    }

    public fun resume_system(system: &mut AnalyticsSystem, admin: address) {
        assert!(system.is_paused, 0);
        system.is_paused = false;
        event::emit(SystemResumed { admin });
    }

    public fun authorize_contract(system: &mut AnalyticsSystem, contract_address: address, admin: address) {
        table::add(&mut system.authorized_contracts, contract_address, true);
        event::emit(ContractAuthorized { contract_address, admin });
    }

    public fun deauthorize_contract(system: &mut AnalyticsSystem, contract_address: address, admin: address) {
        table::remove(&mut system.authorized_contracts, contract_address);
        event::emit(ContractDeauthorized { contract_address, admin });
    }

    // ===== ANALYTICS FUNCTIONS =====
    public fun update_user_analytics(
        system: &mut AnalyticsSystem,
        user: address,
        value: u64,
        category: u8,
        duration: u64,
        actions_count: u64,
        ctx: &mut sui::tx_context::TxContext
    ) {
        assert!(!system.is_paused, 0);
        
        // Check if user exists
        if (table::contains(&system.user_analytics_table, user)) {
            let mut analytics = table::borrow_mut(&mut system.user_analytics_table, user);
            update_existing_user_analytics(&mut analytics, value, category, duration, actions_count);
        } else {
            // Create new user analytics
            let analytics = UserAnalytics {
                id: sui::object::new(ctx),
                user,
                total_activities: 1,
                best_value: value,
                best_category: category,
                best_duration: duration,
                average_value: value,
                average_category: (category as u64),
                average_duration: duration,
                current_tier: calculate_user_tier(value, category),
                first_activity: sui::clock::timestamp_ms(&sui::clock::Clock::dummy()),
                last_activity: sui::clock::timestamp_ms(&sui::clock::Clock::dummy()),
                total_actions: actions_count
            };
            table::add(&mut system.user_analytics_table, user, analytics);
            system.total_users = system.total_users + 1;
        }

        event::emit(UserAnalyticsUpdated {
            user,
            new_value: value,
            new_category: category,
            new_tier: calculate_user_tier(value, category)
        });
    }

    fun update_existing_user_analytics(
        analytics: &mut UserAnalytics,
        value: u64,
        category: u8,
        duration: u64,
        actions_count: u64
    ) {
        analytics.total_activities = analytics.total_activities + 1;
        analytics.total_actions = analytics.total_actions + actions_count;
        
        // Update personal bests
        if (value > analytics.best_value) {
            analytics.best_value = value;
        };
        if (category > analytics.best_category) {
            analytics.best_category = category;
        };
        if (duration > analytics.best_duration) {
            analytics.best_duration = duration;
        };
        
        // Update averages
        analytics.average_value = (analytics.average_value * (analytics.total_activities - 1) + value) / analytics.total_activities;
        analytics.average_category = (analytics.average_category * (analytics.total_activities - 1) + (category as u64)) / analytics.total_activities;
        analytics.average_duration = (analytics.average_duration * (analytics.total_activities - 1) + duration) / analytics.total_activities;
        
        // Update user tier
        analytics.current_tier = calculate_user_tier(analytics.best_value, analytics.best_category);
        
        // Update last activity time
        analytics.last_activity = sui::clock::timestamp_ms(&sui::clock::Clock::dummy());
    }

    fun calculate_user_tier(value: u64, category: u8): u8 {
        if (value >= 1000 && category >= 10) {
            USER_TIER_ENTERPRISE
        } else if (value >= 500 && category >= 7) {
            USER_TIER_PROFESSIONAL
        } else if (value >= 200 && category >= 5) {
            USER_TIER_PREMIUM
        } else if (value >= 50 && category >= 3) {
            USER_TIER_STANDARD
        } else {
            USER_TIER_BASIC
        }
    }

    // ===== VIEW FUNCTIONS =====
    public fun get_user_analytics(system: &AnalyticsSystem, user: address): Option<&UserAnalytics> {
        if (table::contains(&system.user_analytics_table, user)) {
            option::some(table::borrow(&system.user_analytics_table, user))
        } else {
            option::none()
        }
    }

    public fun get_total_users(system: &AnalyticsSystem): u64 {
        system.total_users
    }

    public fun is_system_paused(system: &AnalyticsSystem): bool {
        system.is_paused
    }

    public fun get_user_tier(system: &AnalyticsSystem, user: address): Option<u8> {
        if (table::contains(&system.user_analytics_table, user)) {
            let analytics = table::borrow(&system.user_analytics_table, user);
            option::some(analytics.current_tier)
        } else {
            option::none()
        }
    }
}
