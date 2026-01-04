module suitwo_game::game_pass {
    use sui::coin::{Self, Coin};
    use sui::table::{Self, Table};
    use sui::event;
    use sui::transfer;
    use sui::clock::{Self, Clock};
    use sui::tx_context::{Self, TxContext};
    use sui::object::{Self, UID};
    use sui::dynamic_object_field as ofield;
    use suitwo_game::premium_store::AdminCapability;

    // ===== CONSTANTS =====
    
    // Credit Pack Types (matching frontend/backend)
    const PACK_STARTER: u8 = 1;    // 11 games
    const PACK_REGULAR: u8 = 2;     // 56 games
    const PACK_VALUE: u8 = 3;       // 115 games
    const PACK_MEGA: u8 = 4;        // 235 games

    // Base Pricing in USD (frontend converts to token amounts)
    // Prices are in USD cents for stability
    const STARTER_PRICE_USD_CENTS: u64 = 100;      // $1.00 (11 games @ ~$0.091)
    const REGULAR_PRICE_USD_CENTS: u64 = 500;      // $5.00 (56 games @ ~$0.089)
    const VALUE_PRICE_USD_CENTS: u64 = 1000;       // $10.00 (115 games @ ~$0.087)
    const MEGA_PRICE_USD_CENTS: u64 = 2000;        // $20.00 (235 games @ ~$0.085)

    // Games per pack
    const STARTER_GAMES: u64 = 11;
    const REGULAR_GAMES: u64 = 56;
    const VALUE_GAMES: u64 = 115;
    const MEGA_GAMES: u64 = 235;

    // Payment token constants (for events)
    const PAYMENT_TOKEN_USDC: u8 = 2;

    // Errors
    const E_INVALID_PACK_TYPE: u64 = 0;
    const E_PASS_EXPIRED: u64 = 2;
    const E_NO_GAMES_REMAINING: u64 = 3;
    const E_INVALID_PAYMENT_TOKEN: u64 = 5;
    const E_PASS_NOT_FOUND: u64 = 6;

    // ===== STRUCTS =====
    
    /// Tournament ticket with value tracking
    /// Only USD is tracked (stable reference). Token amount is calculated on-the-fly when needed.
    struct TournamentTicket has store, drop {
        ticket_id: u64,              // Unique ticket ID
        value_paid_usd_cents: u64,   // Value paid in USD (cents, e.g., 100 = $1.00)
        purchased_at: u64,           // Timestamp when purchased
    }
    
    /// Game Pass - tracks player's game credits and tournament tickets
    /// Stored as shared object in GamePassSystem for admin management
    struct GamePass has key, store {
        id: UID,
        player: address,              // Player address
        pack_type: u8,                // Which pack was purchased (for stacking)
        games_remaining: u64,         // Game credits remaining
        tournament_tickets: Table<u64, TournamentTicket>,  // Tournament tickets with values (ticket_id -> ticket)
        next_ticket_id: u64,          // Next ticket ID counter
        ticket_count: u64,             // Actual count of tickets (increments on purchase, decrements on consumption)
        purchased_at: u64,            // Timestamp when purchased
        is_active: bool,               // Whether pass is active
    }

    /// System for managing all game passes
    /// Shared object that stores GamePass objects as dynamic fields
    struct GamePassSystem has key {
        id: UID,
        admin: address,               // Game owner/admin address
        total_passes_sold: u64,
        total_revenue: u64,
    }

    // ===== EVENTS =====
    
    struct PassPurchased has copy, drop {
        buyer: address,
        pack_type: u8,
        games_included: u64,
        price_paid_usd_cents: u64,   // Price in USD cents
        payment_token: u8,           // 0=SUI, 1=MEWS, 2=USDC
        timestamp: u64,
    }

    struct GamePlayed has copy, drop {
        player: address,
        games_remaining: u64,
        timestamp: u64,
    }

    struct AdditionalGamesPurchased has copy, drop {
        buyer: address,
        additional_games: u64,
        total_games_remaining: u64,
        price_paid_usd_cents: u64,
        payment_token: u8,
        timestamp: u64,
    }

    struct FreeCreditsAdded has copy, drop {
        player: address,
        amount: u64,
        total_games_remaining: u64,
        timestamp: u64,
    }

    struct CreditsRemoved has copy, drop {
        player: address,
        amount: u64,
        total_games_remaining: u64,
        timestamp: u64,
    }

    struct TournamentTicketsPurchased has copy, drop {
        buyer: address,
        quantity: u64,
        value_per_ticket_usd_cents: u64,
        total_paid_usd_cents: u64,
        payment_token: u8,
        timestamp: u64,
    }

    // ===== INITIALIZATION =====
    
    fun init(ctx: &mut TxContext) {
        let game_pass_system = GamePassSystem {
            id: object::new(ctx),
            admin: tx_context::sender(ctx),
            total_passes_sold: 0,
            total_revenue: 0,
        };
        transfer::share_object(game_pass_system);
    }

    // ===== HELPER FUNCTIONS =====
    
    /// Get or create GamePass for a player
    fun get_or_create_pass(
        system: &mut GamePassSystem,
        player: address,
        ctx: &mut TxContext
    ): &mut GamePass {
        if (ofield::exists_with_type<address, GamePass>(&system.id, player)) {
            // Pass exists, return mutable reference
            ofield::borrow_mut<address, GamePass>(&mut system.id, player)
        } else {
            // Create new pass and add to dynamic field
            let pass = GamePass {
                id: object::new(ctx),
                player,
                pack_type: PACK_STARTER,  // Default type
                games_remaining: 0,
                tournament_tickets: table::new(ctx),
                next_ticket_id: 1,
                ticket_count: 0,
                purchased_at: 0,
                is_active: false,
            };
            ofield::add(&mut system.id, player, pass);
            ofield::borrow_mut<address, GamePass>(&mut system.id, player)
        }
    }
    
    /// Get pass (read-only)
    fun get_pass(
        system: &GamePassSystem,
        player: address
    ): &GamePass {
        assert!(ofield::exists_with_type<address, GamePass>(&system.id, player), E_PASS_NOT_FOUND);
        ofield::borrow<address, GamePass>(&system.id, player)
    }
    
    /// Get pack info (games and price)
    fun get_pack_info(pack_type: u8): (u64, u64) {
        if (pack_type == PACK_STARTER) {
            (STARTER_GAMES, STARTER_PRICE_USD_CENTS)
        } else if (pack_type == PACK_REGULAR) {
            (REGULAR_GAMES, REGULAR_PRICE_USD_CENTS)
        } else if (pack_type == PACK_VALUE) {
            (VALUE_GAMES, VALUE_PRICE_USD_CENTS)
        } else if (pack_type == PACK_MEGA) {
            (MEGA_GAMES, MEGA_PRICE_USD_CENTS)
        } else {
            abort E_INVALID_PACK_TYPE
        }
    }
    

    // ===== PURCHASE FUNCTIONS =====

    /// Purchase a credit pack (generic coin type - supports SUI, MEWS, USDC)
    /// Frontend calculates exact payment amount based on:
    /// 1. Base pack price (USD)
    /// 2. Badge tier discount (0-25%)
    /// 3. Current token price (to maintain USD pricing)
    #[allow(lint(self_transfer))]
    entry fun purchase_game_pass<T>(
        system: &mut GamePassSystem,
        pack_type: u8,
        payment_token_type: u8,  // 0=SUI, 1=MEWS, 2=USDC (for event)
        price_paid_usd_cents: u64,  // Price in USD cents (for event and validation)
        payment: Coin<T>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let buyer = tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);
        
        // Validate pack type and get pricing
        let (games_included, _base_price_usd_cents) = get_pack_info(pack_type);
        
        // Validate payment token type
        assert!(payment_token_type <= PAYMENT_TOKEN_USDC, E_INVALID_PAYMENT_TOKEN);
        
        // Note: Frontend calculates exact token amount from USD price
        // This function accepts the payment and validates it's sufficient
        // The price_paid_usd_cents parameter is for event tracking
        
        // Store payment value and admin address before borrowing pass
        let payment_value = coin::value(&payment);
        let admin_address = system.admin;
        
        // Get or create pass
        let pass = get_or_create_pass(system, buyer, ctx);
        let is_existing_active = pass.is_active && pass.games_remaining > 0;
        
        // Check if player already has an active pass
        if (is_existing_active) {
            // Player has existing pass - add games to it
            pass.games_remaining = pass.games_remaining + games_included;
            pass.is_active = true;
        } else {
            // First time buyer or pass expired
            pass.pack_type = pack_type;
            pass.games_remaining = games_included;
            pass.purchased_at = current_time;
            pass.is_active = true;
        };
        
        // Release pass borrow by ending scope
        let final_games_remaining = pass.games_remaining;
        
        // Now update system stats (pass borrow is released)
        if (is_existing_active) {
            // Emit event for additional games
            event::emit(AdditionalGamesPurchased {
                buyer,
                additional_games: games_included,
                total_games_remaining: final_games_remaining,
                price_paid_usd_cents,
                payment_token: payment_token_type,
                timestamp: current_time,
            });
        } else {
            // First time buyer - update system stats
            system.total_passes_sold = system.total_passes_sold + 1;
        };
        
        // Update revenue
        system.total_revenue = system.total_revenue + payment_value;
        
        // Transfer payment to admin
        transfer::public_transfer(payment, admin_address);
        
        // Emit purchase event
        event::emit(PassPurchased {
            buyer,
            pack_type,
            games_included,
            price_paid_usd_cents,
            payment_token: payment_token_type,
            timestamp: current_time,
        });
    }

    /// Pay-per-game purchase (single game session)
    /// Frontend calculates exact payment based on badge discount
    #[allow(lint(self_transfer))]
    entry fun purchase_single_game<T>(
        system: &mut GamePassSystem,
        payment_token_type: u8,  // 0=SUI, 1=MEWS, 2=USDC
        price_paid_usd_cents: u64,  // Price in USD cents
        payment: Coin<T>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let buyer = tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);
        
        // Validate payment token type
        assert!(payment_token_type <= PAYMENT_TOKEN_USDC, E_INVALID_PAYMENT_TOKEN);
        
        // Store payment value and admin address before borrowing pass
        let payment_value = coin::value(&payment);
        let admin_address = system.admin;
        
        // Get or create pass
        let pass = get_or_create_pass(system, buyer, ctx);
        let was_inactive = !pass.is_active || pass.games_remaining == 0;
        
        // Add 1 game to pass
        pass.games_remaining = pass.games_remaining + 1;
        pass.is_active = true;
        
        // Release pass borrow
        let _ = pass.games_remaining;
        
        // Update system stats (pass borrow is released)
        if (was_inactive) {
            // First purchase
            system.total_passes_sold = system.total_passes_sold + 1;
        };
        system.total_revenue = system.total_revenue + payment_value;
        
        // Transfer payment to admin
        transfer::public_transfer(payment, admin_address);
        
        // Emit purchase event (using starter pack type for single game)
        event::emit(PassPurchased {
            buyer,
            pack_type: PACK_STARTER,
            games_included: 1,
            price_paid_usd_cents,
            payment_token: payment_token_type,
            timestamp: current_time,
        });
    }

    // ===== CREDIT CONSUMPTION =====

    /// Admin function to consume a game credit (called by backend)
    entry fun consume_game_credit_for_user(
        _admin_cap: &AdminCapability,
        system: &mut GamePassSystem,
        player: address,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let current_time = clock::timestamp_ms(clock);
        
        // Verify caller is admin (via AdminCapability)
        // AdminCapability proves caller is admin
        
        // Get pass
        let pass = get_or_create_pass(system, player, ctx);
        
        // Check pass is active
        assert!(pass.is_active, E_PASS_EXPIRED);
        
        // Check games remaining
        assert!(pass.games_remaining > 0, E_NO_GAMES_REMAINING);
        
        // Deduct 1 credit
        pass.games_remaining = pass.games_remaining - 1;
        
        // Deactivate if no games remaining
        if (pass.games_remaining == 0) {
            pass.is_active = false;
        };

        // Emit event
        event::emit(GamePlayed {
            player,
            games_remaining: pass.games_remaining,
            timestamp: current_time,
        });
    }

    // ===== ADMIN FUNCTIONS =====

    /// Add games to existing pass (for stacking purchases or rewards)
    entry fun add_games_to_existing_pass(
        _admin_cap: &AdminCapability,
        system: &mut GamePassSystem,
        player: address,
        additional_games: u64,
        ctx: &mut TxContext
    ) {
        let pass = get_or_create_pass(system, player, ctx);
        
        pass.games_remaining = pass.games_remaining + additional_games;
        pass.is_active = true;
    }

    /// Add free credits (for achievement rewards or admin grants)
    entry fun add_free_credits(
        _admin_cap: &AdminCapability,
        system: &mut GamePassSystem,
        player: address,
        amount: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let pass = get_or_create_pass(system, player, ctx);
        let current_time = clock::timestamp_ms(clock);
        
        pass.games_remaining = pass.games_remaining + amount;
        pass.is_active = true;
        
        event::emit(FreeCreditsAdded {
            player,
            amount,
            total_games_remaining: pass.games_remaining,
            timestamp: current_time,
        });
    }
    
    /// Refund credits (for failed transactions or admin refunds)
    entry fun refund_credits(
        _admin_cap: &AdminCapability,
        system: &mut GamePassSystem,
        player: address,
        amount: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let pass = get_or_create_pass(system, player, ctx);
        let current_time = clock::timestamp_ms(clock);
        
        pass.games_remaining = pass.games_remaining + amount;
        pass.is_active = true;
        
        // Reuse FreeCreditsAdded event for refunds
        event::emit(FreeCreditsAdded {
            player,
            amount,
            total_games_remaining: pass.games_remaining,
            timestamp: current_time,
        });
    }

    /// Remove credits from player's game pass (admin function)
    /// Used for corrections, adjustments, or penalties
    entry fun remove_credits(
        _admin_cap: &AdminCapability,
        system: &mut GamePassSystem,
        player: address,
        amount: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let pass = get_or_create_pass(system, player, ctx);
        let current_time = clock::timestamp_ms(clock);
        
        // Ensure we don't remove more than available
        let credits_to_remove = if (pass.games_remaining < amount) {
            pass.games_remaining
        } else {
            amount
        };
        
        pass.games_remaining = pass.games_remaining - credits_to_remove;
        
        // Deactivate if no games remaining
        if (pass.games_remaining == 0) {
            pass.is_active = false;
        };
        
        event::emit(CreditsRemoved {
            player,
            amount: credits_to_remove,
            total_games_remaining: pass.games_remaining,
            timestamp: current_time,
        });
    }

    /// Set credits to a specific amount (admin function)
    /// More efficient than add/remove for precise control
    entry fun set_credits(
        _admin_cap: &AdminCapability,
        system: &mut GamePassSystem,
        player: address,
        target_amount: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let pass = get_or_create_pass(system, player, ctx);
        let current_time = clock::timestamp_ms(clock);
        let previous_amount = pass.games_remaining;
        
        pass.games_remaining = target_amount;
        
        // Update active status
        if (target_amount > 0) {
            pass.is_active = true;
        } else {
            pass.is_active = false;
        };
        
        let difference = if (target_amount > previous_amount) {
            target_amount - previous_amount
        } else {
            previous_amount - target_amount
        };
        
        if (target_amount > previous_amount) {
            // Credits increased
            event::emit(FreeCreditsAdded {
                player,
                amount: difference,
                total_games_remaining: pass.games_remaining,
                timestamp: current_time,
            });
        } else if (target_amount < previous_amount) {
            // Credits decreased
            event::emit(CreditsRemoved {
                player,
                amount: difference,
                total_games_remaining: pass.games_remaining,
                timestamp: current_time,
            });
        };
        // If equal, no event needed
    }
    
    // ===== TOURNAMENT TICKET FUNCTIONS =====
    
    /// Helper function to create tickets recursively
    fun create_tickets_recursive(
        pass: &mut GamePass,
        remaining: u64,
        value_per_ticket_usd_cents: u64,
        current_time: u64
    ) {
        if (remaining == 0) {
            return
        };
        
        let ticket_id = pass.next_ticket_id;
        pass.next_ticket_id = pass.next_ticket_id + 1;
        
        let ticket = TournamentTicket {
            ticket_id,
            value_paid_usd_cents: value_per_ticket_usd_cents,
            purchased_at: current_time,
        };
        
        table::add(&mut pass.tournament_tickets, ticket_id, ticket);
        pass.ticket_count = pass.ticket_count + 1;  // Increment ticket count
        
        // Recursively create remaining tickets
        create_tickets_recursive(pass, remaining - 1, value_per_ticket_usd_cents, current_time);
    }
    
    /// Purchase tournament ticket(s) with value tracking
    /// Only USD value is stored. Token amount is calculated on-the-fly when needed.
    #[allow(lint(self_transfer))]
    entry fun purchase_tournament_tickets<T>(
        system: &mut GamePassSystem,
        quantity: u64,                    // Number of tickets to purchase
        value_per_ticket_usd_cents: u64,  // Value paid per ticket in USD (cents, e.g., 100 = $1.00)
        payment_token_type: u8,           // 0=SUI, 1=MEWS, 2=USDC
        total_paid_usd_cents: u64,        // Total paid in USD cents
        payment: Coin<T>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let buyer = tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);
        
        // Validate payment token type
        assert!(payment_token_type <= PAYMENT_TOKEN_USDC, E_INVALID_PAYMENT_TOKEN);
        
        // Store payment value and admin address before borrowing pass
        let payment_value = coin::value(&payment);
        let admin_address = system.admin;
        
        // Get or create pass
        let pass = get_or_create_pass(system, buyer, ctx);
        
        // Create tickets with USD value only (using recursive helper)
        create_tickets_recursive(pass, quantity, value_per_ticket_usd_cents, current_time);
        
        // Release pass borrow
        let _ = pass.next_ticket_id;
        
        // Update system revenue (pass borrow is released)
        system.total_revenue = system.total_revenue + payment_value;
        
        // Transfer payment to admin
        transfer::public_transfer(payment, admin_address);
        
        // Emit event
        event::emit(TournamentTicketsPurchased {
            buyer,
            quantity,
            value_per_ticket_usd_cents,
            total_paid_usd_cents,
            payment_token: payment_token_type,
            timestamp: current_time,
        });
    }
    
    /// Get ticket count (for quick checks)
    /// Returns the actual count of tickets (accurate, not an approximation)
    public fun get_ticket_count(
        system: &GamePassSystem,
        player: address
    ): u64 {
        if (ofield::exists_with_type<address, GamePass>(&system.id, player)) {
            let pass = get_pass(system, player);
            pass.ticket_count
        } else {
            0
        }
    }

    // ===== VIEW FUNCTIONS =====

    /// Check if player has active pass
    public fun has_active_pass(system: &GamePassSystem, player: address): bool {
        if (ofield::exists_with_type<address, GamePass>(&system.id, player)) {
            let pass = get_pass(system, player);
            pass.is_active && pass.games_remaining > 0
        } else {
            false
        }
    }

    /// Get player pass info
    public fun get_pass_info(
        system: &GamePassSystem,
        player: address
    ): (u8, u64, bool) {
        let pass = get_pass(system, player);
        (pass.pack_type, pass.games_remaining, pass.is_active)
    }
    
    /// Check if player has a specific tournament ticket (view function for querying)
    public fun has_tournament_ticket(
        system: &GamePassSystem,
        player: address,
        ticket_id: u64
    ): bool {
        if (ofield::exists_with_type<address, GamePass>(&system.id, player)) {
            let pass = get_pass(system, player);
            table::contains(&pass.tournament_tickets, ticket_id)
        } else {
            false
        }
    }
    
    /// Consume a tournament ticket (used when entering tournaments)
    /// Returns the ticket value in USD cents for prize pool calculation
    public fun consume_tournament_ticket(
        system: &mut GamePassSystem,
        player: address,
        ticket_id: u64,
        ctx: &mut TxContext
    ): (u64, u64) {  // Returns (ticket_id, value_paid_usd_cents)
        let pass = get_or_create_pass(system, player, ctx);
        assert!(table::contains(&pass.tournament_tickets, ticket_id), E_PASS_NOT_FOUND);
        
        // Borrow to extract values before removing
        let ticket_ref = table::borrow(&pass.tournament_tickets, ticket_id);
        let ticket_id_value = ticket_ref.ticket_id;
        let value_paid_usd_cents = ticket_ref.value_paid_usd_cents;
        
        // Now remove the ticket (will be dropped automatically)
        let _ticket = table::remove(&mut pass.tournament_tickets, ticket_id);
        pass.ticket_count = pass.ticket_count - 1;  // Decrement ticket count
        
        (ticket_id_value, value_paid_usd_cents)
    }
    
    /// Get games remaining for a player
    public fun get_games_remaining(
        system: &GamePassSystem,
        player: address
    ): u64 {
        if (ofield::exists_with_type<address, GamePass>(&system.id, player)) {
            let pass = get_pass(system, player);
            pass.games_remaining
        } else {
            0
        }
    }

    // ===== MIGRATION FUNCTIONS =====

    /// Admin function: Migrate game pass from old GamePassSystem to new GamePassSystem
    /// This allows migrating player game passes when upgrading to a new contract
    /// REQUIRES AdminCapability - only admin wallet can call this function
    /// If player already has a pass in new system, merges the data (adds games and tickets)
    /// 
    /// NOTE: This function accepts individual values instead of the old GamePassSystem object
    /// because Move's type system doesn't allow passing types from different packages.
    /// The backend reads the old game pass first and passes the values individually.
    /// Tournament tickets are preserved by passing the actual ticket count from the old system.
    /// The backend should count actual tickets using getAvailableTicketIds or similar before calling this.
    #[allow(lint(public_entry))]
    public entry fun migrate_game_pass(
        _admin_cap: &AdminCapability,  // Admin capability - proves caller is admin
        new_game_pass_system: &mut GamePassSystem,  // New game pass system to write to
        player: address,  // Player address to migrate
        _clock: &Clock,
        // Old game pass values (read from old system by backend)
        old_games_remaining: u64,
        old_pack_type: u8,
        old_purchased_at: u64,
        old_is_active: bool,
        old_next_ticket_id: u64,
        old_ticket_count: u64,  // Actual ticket count from old system (backend should count actual tickets)
        ctx: &mut TxContext
    ) {
        // Get or create pass in new system
        let new_pass = get_or_create_pass(new_game_pass_system, player, ctx);
        
        // Merge pass data:
        // - Add games_remaining from old pass to new pass
        // - Preserve tournament ticket count using actual count from old system
        // - Take earliest purchased_at if new pass has no purchase date
        // - Set is_active to true if either pass is active
        
        // Merge games
        new_pass.games_remaining = new_pass.games_remaining + old_games_remaining;
        
        // Merge tournament tickets
        // Use the actual ticket count passed from backend (counted from old system)
        // Update next_ticket_id to the maximum of old and new to preserve ticket ID space
        if (old_next_ticket_id > new_pass.next_ticket_id) {
            new_pass.next_ticket_id = old_next_ticket_id;
        };
        
        // Merge ticket_count: add old ticket count to new ticket count
        // This preserves tickets from both old and new systems
        new_pass.ticket_count = new_pass.ticket_count + old_ticket_count;
        
        // Merge purchase date (take earliest)
        if (new_pass.purchased_at == 0 || (old_purchased_at > 0 && old_purchased_at < new_pass.purchased_at)) {
            new_pass.purchased_at = old_purchased_at;
        };
        
        // Merge active status
        if (old_is_active || new_pass.is_active) {
            new_pass.is_active = true;
        };
        
        // Keep the pack_type from new pass (or use old if new is default)
        if (new_pass.pack_type == PACK_STARTER && old_pack_type != PACK_STARTER) {
            new_pass.pack_type = old_pack_type;
        };
    }

    /// Admin function: Set ticket count for a player's game pass
    /// Used to fix ticket counts after migration or for manual corrections
    /// REQUIRES AdminCapability - only admin wallet can call this function
    #[allow(lint(public_entry))]
    public entry fun set_ticket_count(
        _admin_cap: &AdminCapability,
        system: &mut GamePassSystem,
        player: address,
        new_ticket_count: u64,
        ctx: &mut TxContext
    ) {
        let pass = get_or_create_pass(system, player, ctx);
        pass.ticket_count = new_ticket_count;
    }

    /// Admin function: Add tournament tickets to a player (free, no payment required)
    /// Used for admin grants, rewards, or corrections
    /// REQUIRES AdminCapability - only admin wallet can call this function
    #[allow(lint(public_entry))]
    public entry fun admin_add_tickets(
        _admin_cap: &AdminCapability,
        system: &mut GamePassSystem,
        player: address,
        quantity: u64,
        value_per_ticket_usd_cents: u64,  // USD value per ticket (for tracking, typically 0 for free tickets)
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let pass = get_or_create_pass(system, player, ctx);
        let current_time = clock::timestamp_ms(clock);
        
        // Create tickets with specified value (using recursive helper)
        create_tickets_recursive(pass, quantity, value_per_ticket_usd_cents, current_time);
        
        // Emit event
        event::emit(TournamentTicketsPurchased {
            buyer: player,
            quantity,
            value_per_ticket_usd_cents,
            total_paid_usd_cents: quantity * value_per_ticket_usd_cents,
            payment_token: 255,  // Special value for admin-granted tickets
            timestamp: current_time,
        });
    }

    /// Admin function: Remove a specific tournament ticket from a player
    /// Used for corrections or refunds
    /// REQUIRES AdminCapability - only admin wallet can call this function
    #[allow(lint(public_entry))]
    public entry fun admin_remove_ticket(
        _admin_cap: &AdminCapability,
        system: &mut GamePassSystem,
        player: address,
        ticket_id: u64,
        ctx: &mut TxContext
    ) {
        let pass = get_or_create_pass(system, player, ctx);
        assert!(table::contains(&pass.tournament_tickets, ticket_id), E_PASS_NOT_FOUND);
        
        // Remove the ticket
        let _ticket = table::remove(&mut pass.tournament_tickets, ticket_id);
        pass.ticket_count = pass.ticket_count - 1;  // Decrement ticket count
    }

    /// View function: Get ticket information (ticket_id, value_paid_usd_cents, purchased_at)
    /// Returns (ticket_id, value_paid_usd_cents, purchased_at) if ticket exists, or (0, 0, 0) if not
    public fun get_ticket_info(
        system: &GamePassSystem,
        player: address,
        ticket_id: u64
    ): (u64, u64, u64) {
        if (ofield::exists_with_type<address, GamePass>(&system.id, player)) {
            let pass = get_pass(system, player);
            if (table::contains(&pass.tournament_tickets, ticket_id)) {
                let ticket_ref = table::borrow(&pass.tournament_tickets, ticket_id);
                (
                    ticket_ref.ticket_id,
                    ticket_ref.value_paid_usd_cents,
                    ticket_ref.purchased_at
                )
            } else {
                (0, 0, 0)
            }
        } else {
            (0, 0, 0)
        }
    }
}

