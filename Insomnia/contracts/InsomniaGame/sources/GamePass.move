module insomnia_game::game_pass {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::table::{Self, Table};
    use sui::event;
    use sui::transfer;

    // Game Pass types
    const GAME_PASS_BASIC: u8 = 1;      // 10 games for 0.1 SUI
    const GAME_PASS_PREMIUM: u8 = 2;    // 50 games for 0.4 SUI
    const GAME_PASS_UNLIMITED: u8 = 3;  // 1 month unlimited for 1 SUI

    // Pricing in MIST (1 SUI = 1,000,000,000 MIST)
    const BASIC_PRICE: u64 = 100_000_000;      // 0.1 SUI
    const PREMIUM_PRICE: u64 = 400_000_000;    // 0.4 SUI
    const UNLIMITED_PRICE: u64 = 1_000_000_000; // 1 SUI

    // Pass durations in milliseconds
    const BASIC_GAMES: u64 = 10;
    const PREMIUM_GAMES: u64 = 50;
    const UNLIMITED_DURATION: u64 = 2_592_000_000; // 30 days in milliseconds

    // Errors
    const E_INVALID_PASS_TYPE: u64 = 0;
    const E_INSUFFICIENT_PAYMENT: u64 = 1;
    const E_PASS_EXPIRED: u64 = 2;
    const E_NO_GAMES_REMAINING: u64 = 3;
    const E_NOT_PASS_OWNER: u64 = 4;
    const E_NOT_AUTHORIZED: u64 = 5; // Added for consume_game_credit_for_user

    // Game Pass NFT that users own
    // Note: For shared objects, we track ownership in the system table instead of the object itself
    public struct GamePass has key, store {
        id: sui::object::UID,
        pass_type: u8,
        games_remaining: u64,
        expires_at: u64,
        purchased_at: u64,
        is_active: bool,
    }

    // System for managing game passes
    public struct GamePassSystem has key {
        id: sui::object::UID,
        admin: address,
        total_passes_sold: u64,
        total_revenue: u64,
        active_passes: Table<address, sui::object::ID>, // Maps player address to GamePass object ID
    }

    // Events
    public struct PassPurchased has copy, drop {
        buyer: address,
        pass_type: u8,
        games_included: u64,
        price_paid: u64,
        timestamp: u64,
    }

    public struct GamePlayed has copy, drop {
        player: address,
        games_remaining: u64,
        timestamp: u64,
    }

    public struct PassReplaced has copy, drop {
        buyer: address,
        old_pass_id: sui::object::ID,
        new_pass_id: sui::object::ID,
        pass_type: u8,
        games_included: u64,
        timestamp: u64,
    }

    public struct GamesAdded has copy, drop {
        player: address,
        additional_games: u64,
        total_games_remaining: u64,
        timestamp: u64,
    }

    public struct AdditionalGamesPurchased has copy, drop {
        buyer: address,
        pass_id: sui::object::ID,
        additional_games: u64,
        total_games_remaining: u64,
        price_paid: u64,
        timestamp: u64,
    }

    // Initialize the game pass system
    fun init(ctx: &mut sui::tx_context::TxContext) {
        let game_pass_system = GamePassSystem {
            id: sui::object::new(ctx),
            admin: sui::tx_context::sender(ctx),
            total_passes_sold: 0,
            total_revenue: 0,
            active_passes: table::new(ctx),
        };

        sui::transfer::share_object(game_pass_system);
    }

    // Purchase a game pass
    #[allow(lint(self_transfer))]
    public fun purchase_game_pass(
        system: &mut GamePassSystem,
        pass_type: u8,
        payment: Coin<SUI>,
        clock: &sui::clock::Clock,
        ctx: &mut sui::tx_context::TxContext
    ) {
        let buyer = sui::tx_context::sender(ctx);
        let current_time = sui::clock::timestamp_ms(clock);
        
        // Validate pass type and payment
        let (required_price, games_included, expires_at) = match (pass_type) {
            GAME_PASS_BASIC => (BASIC_PRICE, BASIC_GAMES, 0), // Game-based passes don't expire by time
            GAME_PASS_PREMIUM => (PREMIUM_PRICE, PREMIUM_GAMES, 0),
            GAME_PASS_UNLIMITED => (UNLIMITED_PRICE, 999999, current_time + UNLIMITED_DURATION), // Large number for "unlimited"
            _ => abort E_INVALID_PASS_TYPE,
        };

        let payment_amount = coin::value(&payment);
        assert!(payment_amount >= required_price, E_INSUFFICIENT_PAYMENT);

        // Create the game pass NFT
        let game_pass = GamePass {
            id: sui::object::new(ctx),
            pass_type,
            games_remaining: games_included,
            expires_at,
            purchased_at: current_time,
            is_active: true,
        };

        // Check if user already has an active pass
        if (table::contains(&system.active_passes, buyer)) {
            // User already has a pass - add games to the existing one
            let existing_pass_id = *table::borrow(&system.active_passes, buyer);
            
            // Update system stats for additional games
            system.total_revenue = system.total_revenue + payment_amount;
            
            // Emit event for additional games purchase
            event::emit(AdditionalGamesPurchased {
                buyer,
                pass_id: existing_pass_id,
                additional_games: games_included,
                total_games_remaining: 0, // Will be calculated by backend
                price_paid: payment_amount,
                timestamp: current_time,
            });
            
            // Destroy the newly created pass since we're adding to existing one
            // The backend will handle adding the games to the existing pass
            let GamePass { id, pass_type: _, games_remaining: _, expires_at: _, purchased_at: _, is_active: _ } = game_pass;
            sui::object::delete(id);
            
            // Transfer payment to admin
            transfer::public_transfer(payment, system.admin);
        } else {
            // First time buyer - add to active passes table
            table::add(&mut system.active_passes, buyer, sui::object::id(&game_pass));
            
            // Update system stats for new pass
            system.total_passes_sold = system.total_passes_sold + 1;
            system.total_revenue = system.total_revenue + payment_amount;
            
            // Transfer payment to admin
            transfer::public_transfer(payment, system.admin);
            
            // Make the pass a shared object so the game owner can access it
            transfer::share_object(game_pass);
        };



        // Emit event
        event::emit(PassPurchased {
            buyer,
            pass_type,
            games_included,
            price_paid: payment_amount,
            timestamp: current_time,
        });
    }

    // Use a game from the pass (called when starting a blockchain-enabled game)
    // NOTE: This function is now deprecated since GamePass objects are shared
    // Players should use consume_game_credit_for_user through the backend instead
    public fun use_game_credit(
        pass: &mut GamePass,
        clock: &sui::clock::Clock,
        ctx: &mut sui::tx_context::TxContext
    ) {
        let player = sui::tx_context::sender(ctx);
        let current_time = sui::clock::timestamp_ms(clock);
        
        // NOTE: Ownership verification removed since GamePass objects are now shared
        // The backend will handle access control through consume_game_credit_for_user
        
        // Check if pass is still valid
        assert!(pass.is_active, E_PASS_EXPIRED);
        
        // Check time-based expiration (for unlimited passes)
        if (pass.expires_at > 0) {
            assert!(current_time < pass.expires_at, E_PASS_EXPIRED);
        };
        
        // Check game-based expiration
        assert!(pass.games_remaining > 0, E_NO_GAMES_REMAINING);
        
        // Deduct a game
        pass.games_remaining = pass.games_remaining - 1;
        
        // Deactivate if no games remaining
        if (pass.games_remaining == 0 && pass.expires_at == 0) {
            pass.is_active = false;
        };

        // Emit event
        event::emit(GamePlayed {
            player,
            games_remaining: pass.games_remaining,
            timestamp: current_time,
        });
    }

    // Game owner can consume a game credit on behalf of a user (no user signature required)
    // This function allows the game owner to consume credits from any valid game pass
    // We use a different approach to handle cross-object access
    public fun consume_game_credit_for_user(
        system: &mut GamePassSystem,
        pass: &mut GamePass,
        player_address: address,
        clock: &sui::clock::Clock,
        ctx: &mut sui::tx_context::TxContext
    ) {
        let game_owner = sui::tx_context::sender(ctx);
        let current_time = sui::clock::timestamp_ms(clock);
        
        // Verify the caller is the authorized game owner
        assert!(game_owner == system.admin, E_NOT_AUTHORIZED);
        
        // Check if pass is still valid
        assert!(pass.is_active, E_PASS_EXPIRED);
        
        // Check time-based expiration (for unlimited passes)
        if (pass.expires_at > 0) {
            assert!(current_time < pass.expires_at, E_PASS_EXPIRED);
        };
        
        // Check game-based expiration
        assert!(pass.games_remaining > 0, E_NO_GAMES_REMAINING);
        
        // Deduct a game
        pass.games_remaining = pass.games_remaining - 1;
        
        // Deactivate if no games remaining
        if (pass.games_remaining == 0 && pass.expires_at == 0) {
            pass.is_active = false;
        };

        // Emit event
        event::emit(GamePlayed {
            player: player_address,
            games_remaining: pass.games_remaining,
            timestamp: current_time,
        });
    }

    // Add more games to an existing GamePass (for stacking purchases)
    public fun add_games_to_existing_pass(
        system: &mut GamePassSystem,
        pass: &mut GamePass,
        additional_games: u64,
        ctx: &mut sui::tx_context::TxContext
    ) {
        let caller = sui::tx_context::sender(ctx);
        
        // Verify the caller is the authorized game owner (admin)
        assert!(caller == system.admin, E_NOT_AUTHORIZED);
        
        // Add the additional games
        pass.games_remaining = pass.games_remaining + additional_games;
        
        // Ensure the pass is active
        pass.is_active = true;
        
        // Emit event for games added
        event::emit(GamesAdded {
            player: sui::tx_context::sender(ctx),
            additional_games,
            total_games_remaining: pass.games_remaining,
            timestamp: sui::tx_context::epoch(ctx),
        });
    }

    // Purchase additional games for an existing GamePass (for stacking)
    public fun purchase_additional_games(
        system: &mut GamePassSystem,
        pass: &mut GamePass,
        additional_games: u64,
        payment: Coin<SUI>,
        clock: &sui::clock::Clock,
        ctx: &mut sui::tx_context::TxContext
    ) {
        let buyer = sui::tx_context::sender(ctx);
        let current_time = sui::clock::timestamp_ms(clock);
        
        // Calculate price for additional games (same rate as original)
        let price_per_game = match (pass.pass_type) {
            GAME_PASS_BASIC => BASIC_PRICE / BASIC_GAMES,
            GAME_PASS_PREMIUM => PREMIUM_PRICE / PREMIUM_GAMES,
            _ => abort E_INVALID_PASS_TYPE,
        };
        
        let required_payment = additional_games * price_per_game;
        let payment_amount = coin::value(&payment);
        assert!(payment_amount >= required_payment, E_INSUFFICIENT_PAYMENT);
        
        // Add the additional games
        pass.games_remaining = pass.games_remaining + additional_games;
        
        // Ensure the pass is active
        pass.is_active = true;
        
        // Update system stats
        system.total_passes_sold = system.total_passes_sold + 1;
        system.total_revenue = system.total_revenue + payment_amount;
        
        // Transfer payment to admin
        transfer::public_transfer(payment, system.admin);
        
        // Emit event for additional games purchased
        event::emit(AdditionalGamesPurchased {
            buyer,
            pass_id: sui::object::id(pass),
            additional_games,
            total_games_remaining: pass.games_remaining,
            price_paid: payment_amount,
            timestamp: current_time,
        });
    }



    // Backend function to consume game credits by GamePass object ID
    // This function allows the game owner to consume credits without direct object access
    public fun consume_game_credit_by_id(
        system: &mut GamePassSystem,
        pass: &mut GamePass,
        player_address: address,
        clock: &sui::clock::Clock,
        ctx: &mut sui::tx_context::TxContext
    ) {
        let game_owner = sui::tx_context::sender(ctx);
        let current_time = sui::clock::timestamp_ms(clock);
        
        // Verify the caller is the authorized game owner
        assert!(game_owner == system.admin, E_NOT_AUTHORIZED);
        
        // Check if pass is still valid
        assert!(pass.is_active, E_PASS_EXPIRED);
        
        // Check time-based expiration (for unlimited passes)
        if (pass.expires_at > 0) {
            assert!(current_time < pass.expires_at, E_PASS_EXPIRED);
        };
        
        // Check game-based expiration
        assert!(pass.games_remaining > 0, E_NO_GAMES_REMAINING);
        
        // Deduct a game
        pass.games_remaining = pass.games_remaining - 1;
        
        // Deactivate if no games remaining
        if (pass.games_remaining == 0 && pass.expires_at == 0) {
            pass.is_active = false;
        };

        // Emit event
        event::emit(GamePlayed {
            player: player_address,
            games_remaining: pass.games_remaining,
            timestamp: current_time,
        });
    }

    // Check if a player has an active game pass
    public fun has_active_pass(
        system: &GamePassSystem,
        player: address
    ): bool {
        table::contains(&system.active_passes, player)
    }

    // Get the GamePass object ID for a player
    public fun get_player_pass_id(
        system: &GamePassSystem,
        player: address
    ): sui::object::ID {
        assert!(table::contains(&system.active_passes, player), E_PASS_EXPIRED);
        *table::borrow(&system.active_passes, player)
    }

    // Public read functions
    public fun get_pass_info(pass: &GamePass): (u8, u64, u64, bool) {
        (pass.pass_type, pass.games_remaining, pass.expires_at, pass.is_active)
    }

    public fun get_system_stats(system: &GamePassSystem): (u64, u64) {
        (system.total_passes_sold, system.total_revenue)
    }

    // Admin function to update pricing (for game balancing)
    public fun update_admin(
        system: &mut GamePassSystem,
        new_admin: address,
        ctx: &mut sui::tx_context::TxContext
    ) {
        assert!(sui::tx_context::sender(ctx) == system.admin, E_NOT_PASS_OWNER);
        system.admin = new_admin;
    }

    // Admin function to create game passes for migration or rewards (no payment required)
    // This allows the game admin to create game passes without payment validation
    // Useful for migrating existing data or giving free game rewards
    public fun admin_create_game_pass_for_migration(
        system: &mut GamePassSystem,
        player_address: address,
        pass_type: u8,
        games_remaining: u64,
        expires_at: u64,
        purchased_at: u64,
        ctx: &mut sui::tx_context::TxContext
    ) {
        // Only the game admin can call this function
        assert!(sui::tx_context::sender(ctx) == system.admin, E_NOT_AUTHORIZED);
        
        // Validate pass type
        assert!(pass_type >= GAME_PASS_BASIC && pass_type <= GAME_PASS_UNLIMITED, E_INVALID_PASS_TYPE);
        
        // Validate games remaining
        assert!(games_remaining > 0, E_NO_GAMES_REMAINING);
        
        // Validate timestamps
        assert!(purchased_at > 0, E_INVALID_PASS_TYPE);
        
        // Check if user already has an active pass
        if (table::contains(&system.active_passes, player_address)) {
            // User already has a pass - we'll create a new one and add it to the table
            // This will effectively replace the old pass with a new one that has more games
            let old_pass_id = *table::borrow(&system.active_passes, player_address);
            
            // Remove the old pass entry
            table::remove(&mut system.active_passes, player_address);
            
            // Create new pass with combined games
            let new_game_pass = GamePass {
                id: sui::object::new(ctx),
                pass_type,
                games_remaining,
                expires_at,
                purchased_at,
                is_active: true,
            };
            
            // Add new pass to active passes table
            table::add(&mut system.active_passes, player_address, sui::object::id(&new_game_pass));
            
            // Update system stats for additional games
            system.total_passes_sold = system.total_passes_sold + 1;
            
            // Make the new pass a shared object
            transfer::share_object(new_game_pass);
            
            // Emit event for games added
            event::emit(GamesAdded {
                player: player_address,
                additional_games: games_remaining,
                total_games_remaining: games_remaining,
                timestamp: sui::tx_context::epoch(ctx),
            });
            
        } else {
            // First time buyer - create new game pass
            let game_pass = GamePass {
                id: sui::object::new(ctx),
                pass_type,
                games_remaining,
                expires_at,
                purchased_at,
                is_active: true,
            };
            
            // Add to active passes table
            table::add(&mut system.active_passes, player_address, sui::object::id(&game_pass));
            
            // Update system stats for new pass
            system.total_passes_sold = system.total_passes_sold + 1;
            
            // Make the pass a shared object so the game owner can access it
            transfer::share_object(game_pass);
            
            // Emit event for new pass
            event::emit(PassPurchased {
                buyer: player_address,
                pass_type,
                games_included: games_remaining,
                price_paid: 0, // 0 for migration/rewards
                timestamp: purchased_at,
            });
        };
    }
}
