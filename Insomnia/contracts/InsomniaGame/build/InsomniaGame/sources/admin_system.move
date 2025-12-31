module insomnia_game::admin_system {
    use sui::event;

    // ===== STRUCTS =====
    public struct GameParameters has key, store {
        id: sui::object::UID,
        base_reward_amount: u64,
        score_bonus_multiplier: u64,
        daily_play_bonus: u64,
        weekly_streak_bonus: u64,
        challenge_reward_amount: u64,
        last_updated: u64
    }

    public struct AdminCapability has key, store {
        id: sui::object::UID
    }

    public struct GameParametersUpdated has copy, drop {
        admin: address,
        timestamp: u64
    }

    // ===== CAPABILITIES =====
    public struct AdminSystem has key {
        id: sui::object::UID,
        game_parameters: GameParameters,
        admin_address: address
    }

    /// Initialize the AdminSystem
    fun init(ctx: &mut sui::tx_context::TxContext) {
        let game_parameters = GameParameters {
            id: sui::object::new(ctx),
            base_reward_amount: 1,           // 1 point per successful click
            score_bonus_multiplier: 2,       // Bonus for longer games
            daily_play_bonus: 10,            // Daily play incentive
            weekly_streak_bonus: 50,         // Weekly streak bonus
            challenge_reward_amount: 100,    // Special challenge rewards
            last_updated: sui::tx_context::epoch(ctx)
        };

        let admin_system = AdminSystem {
            id: sui::object::new(ctx),
            game_parameters,
            admin_address: sui::tx_context::sender(ctx)
        };

        sui::transfer::share_object(admin_system);
    }



    /// Update game parameters (only callable by admin)
    public fun update_game_parameters(
        admin_system: &mut AdminSystem,
        new_base_reward_amount: u64,
        new_score_bonus_multiplier: u64,
        new_daily_play_bonus: u64,
        new_weekly_streak_bonus: u64,
        new_challenge_reward_amount: u64,
        ctx: &mut sui::tx_context::TxContext
    ) {
        // Only the admin can update parameters
        assert!(sui::tx_context::sender(ctx) == admin_system.admin_address, 0);

        admin_system.game_parameters.base_reward_amount = new_base_reward_amount;
        admin_system.game_parameters.score_bonus_multiplier = new_score_bonus_multiplier;
        admin_system.game_parameters.daily_play_bonus = new_daily_play_bonus;
        admin_system.game_parameters.weekly_streak_bonus = new_weekly_streak_bonus;
        admin_system.game_parameters.challenge_reward_amount = new_challenge_reward_amount;
        admin_system.game_parameters.last_updated = sui::tx_context::epoch(ctx);

        event::emit(GameParametersUpdated {
            admin: sui::tx_context::sender(ctx),
            timestamp: sui::tx_context::epoch(ctx)
        });
    }

    /// Get current game parameters
    public fun get_game_parameters(admin_system: &AdminSystem): &GameParameters {
        &admin_system.game_parameters
    }
}
