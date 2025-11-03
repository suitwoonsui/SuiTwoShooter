module smart_contract_examples::system_controls {
    use sui::event;

    // ===== STRUCTS =====
    public struct SystemConfiguration has key, store {
        id: sui::object::UID,
        base_reward_amount: u64,
        value_bonus_multiplier: u64,
        daily_activity_bonus: u64,
        weekly_streak_bonus: u64,
        special_reward_amount: u64,
        last_updated: u64
    }

    public struct AdminCapability has key, store {
        id: sui::object::UID
    }

    public struct SystemControls has key {
        id: sui::object::UID,
        configuration: SystemConfiguration,
        admin_cap: AdminCapability
    }

    // ===== EVENTS =====
    public struct ConfigurationUpdated has copy, drop {
        admin: address,
        base_reward_amount: u64,
        value_bonus_multiplier: u64,
        daily_activity_bonus: u64,
        weekly_streak_bonus: u64,
        special_reward_amount: u64,
        timestamp: u64
    }

    public struct AdminAction has copy, drop {
        admin: address,
        action: String,
        timestamp: u64
    }

    // ===== INITIALIZATION =====
    public fun init(ctx: &mut sui::tx_context::TxContext) {
        let admin_cap = AdminCapability {
            id: sui::object::new(ctx)
        };

        let configuration = SystemConfiguration {
            id: sui::object::new(ctx),
            base_reward_amount: 100,
            value_bonus_multiplier: 2,
            daily_activity_bonus: 50,
            weekly_streak_bonus: 200,
            special_reward_amount: 500,
            last_updated: sui::clock::timestamp_ms(&sui::clock::Clock::dummy())
        };

        let system = SystemControls {
            id: sui::object::new(ctx),
            configuration,
            admin_cap
        };

        sui::transfer::share_object(system);
        sui::transfer::transfer(admin_cap, sui::tx_context::sender(ctx));
    }

    // ===== ADMIN FUNCTIONS =====
    public fun update_configuration(
        system: &mut SystemControls,
        base_reward_amount: u64,
        value_bonus_multiplier: u64,
        daily_activity_bonus: u64,
        weekly_streak_bonus: u64,
        special_reward_amount: u64,
        _admin_cap: &AdminCapability,
        ctx: &mut sui::tx_context::TxContext
    ) {
        let admin = sui::tx_context::sender(ctx);
        let current_time = sui::clock::timestamp_ms(&sui::clock::Clock::dummy());

        // Update configuration
        system.configuration.base_reward_amount = base_reward_amount;
        system.configuration.value_bonus_multiplier = value_bonus_multiplier;
        system.configuration.daily_activity_bonus = daily_activity_bonus;
        system.configuration.weekly_streak_bonus = weekly_streak_bonus;
        system.configuration.special_reward_amount = special_reward_amount;
        system.configuration.last_updated = current_time;

        // Emit update event
        event::emit(ConfigurationUpdated {
            admin,
            base_reward_amount,
            value_bonus_multiplier,
            daily_activity_bonus,
            weekly_streak_bonus,
            special_reward_amount,
            timestamp: current_time
        });

        // Emit admin action event
        event::emit(AdminAction {
            admin,
            action: b"configuration_updated",
            timestamp: current_time
        });
    }

    public fun update_base_reward(
        system: &mut SystemControls,
        new_amount: u64,
        _admin_cap: &AdminCapability,
        ctx: &mut sui::tx_context::TxContext
    ) {
        let admin = sui::tx_context::sender(ctx);
        let current_time = sui::clock::timestamp_ms(&sui::clock::Clock::dummy());

        system.configuration.base_reward_amount = new_amount;
        system.configuration.last_updated = current_time;

        event::emit(AdminAction {
            admin,
            action: b"base_reward_updated",
            timestamp: current_time
        });
    }

    public fun update_bonus_multiplier(
        system: &mut SystemControls,
        new_multiplier: u64,
        _admin_cap: &AdminCapability,
        ctx: &mut sui::tx_context::TxContext
    ) {
        let admin = sui::tx_context::sender(ctx);
        let current_time = sui::clock::timestamp_ms(&sui::clock::Clock::dummy());

        system.configuration.value_bonus_multiplier = new_multiplier;
        system.configuration.last_updated = current_time;

        event::emit(AdminAction {
            admin,
            action: b"bonus_multiplier_updated",
            timestamp: current_time
        });
    }

    public fun update_activity_bonus(
        system: &mut SystemControls,
        new_bonus: u64,
        _admin_cap: &AdminCapability,
        ctx: &mut sui::tx_context::TxContext
    ) {
        let admin = sui::tx_context::sender(ctx);
        let current_time = sui::clock::timestamp_ms(&sui::clock::Clock::dummy());

        system.configuration.daily_activity_bonus = new_bonus;
        system.configuration.last_updated = current_time;

        event::emit(AdminAction {
            admin,
            action: b"activity_bonus_updated",
            timestamp: current_time
        });
    }

    public fun update_streak_bonus(
        system: &mut SystemControls,
        new_bonus: u64,
        _admin_cap: &AdminCapability,
        ctx: &mut sui::tx_context::TxContext
    ) {
        let admin = sui::tx_context::sender(ctx);
        let current_time = sui::clock::timestamp_ms(&sui::clock::Clock::dummy());

        system.configuration.weekly_streak_bonus = new_bonus;
        system.configuration.last_updated = current_time;

        event::emit(AdminAction {
            admin,
            action: b"streak_bonus_updated",
            timestamp: current_time
        });
    }

    public fun update_special_reward(
        system: &mut SystemControls,
        new_reward: u64,
        _admin_cap: &AdminCapability,
        ctx: &mut sui::tx_context::TxContext
    ) {
        let admin = sui::tx_context::sender(ctx);
        let current_time = sui::clock::timestamp_ms(&sui::clock::Clock::dummy());

        system.configuration.special_reward_amount = new_reward;
        system.configuration.last_updated = current_time;

        event::emit(AdminAction {
            admin,
            action: b"special_reward_updated",
            timestamp: current_time
        });
    }

    // ===== VIEW FUNCTIONS =====
    public fun get_configuration(system: &SystemControls): &SystemConfiguration {
        &system.configuration
    }

    public fun get_base_reward_amount(system: &SystemControls): u64 {
        system.configuration.base_reward_amount
    }

    public fun get_value_bonus_multiplier(system: &SystemControls): u64 {
        system.configuration.value_bonus_multiplier
    }

    public fun get_daily_activity_bonus(system: &SystemControls): u64 {
        system.configuration.daily_activity_bonus
    }

    public fun get_weekly_streak_bonus(system: &SystemControls): u64 {
        system.configuration.weekly_streak_bonus
    }

    public fun get_special_reward_amount(system: &SystemControls): u64 {
        system.configuration.special_reward_amount
    }

    public fun get_last_updated(system: &SystemControls): u64 {
        system.configuration.last_updated
    }

    // ===== UTILITY FUNCTIONS =====
    public fun calculate_total_reward(
        system: &SystemControls,
        base_value: u64,
        has_daily_bonus: bool,
        has_weekly_bonus: bool,
        is_special: bool
    ): u64 {
        let mut total = base_value * system.configuration.value_bonus_multiplier;

        if (has_daily_bonus) {
            total = total + system.configuration.daily_activity_bonus;
        };

        if (has_weekly_bonus) {
            total = total + system.configuration.weekly_streak_bonus;
        };

        if (is_special) {
            total = total + system.configuration.special_reward_amount;
        };

        total
    }
}
