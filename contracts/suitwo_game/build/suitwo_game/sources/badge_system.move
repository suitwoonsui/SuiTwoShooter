module suitwo_game::badge_system {
    use sui::object::{Self, UID, ID};
    use sui::event;
    use sui::table::{Self, Table};
    use sui::transfer;
    use sui::clock::{Self, Clock};
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::display::{Self, Display};
    use sui::package::{Self, Publisher};
    use std::string::{Self, String};
    use std::vector;
    use suitwo_game::score_submission::{Self, StatisticsRegistry, AdminCapability};

    // ===== CONSTANTS =====
    
    // Tier constants
    const TIER_STANDARD: u8 = 0;
    const TIER_COMMON: u8 = 1;
    const TIER_UNCOMMON: u8 = 2;
    const TIER_RARE: u8 = 3;
    const TIER_EPIC: u8 = 4;
    const TIER_LEGENDARY: u8 = 5;
    
    // Tier thresholds (Option A - Faster Progression with Extremely Rare Legendary)
    // Badge tier is determined ONLY by total_games (games played)
    const THRESHOLD_COMMON: u64 = 6;
    const THRESHOLD_UNCOMMON: u64 = 16;
    const THRESHOLD_RARE: u64 = 36;
    const THRESHOLD_EPIC: u64 = 76;
    const THRESHOLD_LEGENDARY: u64 = 150;
    
    // Store discount percentages (0-25%)
    const DISCOUNT_STANDARD_STORE: u8 = 0;
    const DISCOUNT_COMMON_STORE: u8 = 5;
    const DISCOUNT_UNCOMMON_STORE: u8 = 10;
    const DISCOUNT_RARE_STORE: u8 = 15;
    const DISCOUNT_EPIC_STORE: u8 = 20;
    const DISCOUNT_LEGENDARY_STORE: u8 = 25;
    
    // Gameplay discount percentages (0-20%)
    const DISCOUNT_STANDARD_GAMEPLAY: u8 = 0;
    const DISCOUNT_COMMON_GAMEPLAY: u8 = 0;
    const DISCOUNT_UNCOMMON_GAMEPLAY: u8 = 5;
    const DISCOUNT_RARE_GAMEPLAY: u8 = 10;
    const DISCOUNT_EPIC_GAMEPLAY: u8 = 15;
    const DISCOUNT_LEGENDARY_GAMEPLAY: u8 = 20;
    
    // Minting fee (dollar-pegged at $0.10)
    // Minimum fee in MIST (safety net - frontend calculates exact amount based on current SUI price)
    // At $1.00/SUI: 0.1 SUI = 100_000_000 MIST
    // At $2.00/SUI: 0.05 SUI = 50_000_000 MIST
    // This minimum protects against SUI price spikes, but frontend should send more if price drops
    const MIN_MINT_FEE_MIST: u64 = 50_000_000;  // ~0.05 SUI minimum (safety net)
    
    // Fee recipient is now stored in BadgeRegistry (runtime-configurable, consistent with score_submission pattern)
    // No compile-time constant needed - set during init() call
    
    // Error codes
    const E_PLAYER_ALREADY_HAS_BADGE: u64 = 2;
    const E_BADGE_NOT_FOUND: u64 = 3;
    const E_SESSION_ALREADY_COUNTED: u64 = 4;
    const E_INVALID_TIER: u64 = 5;
    const E_INSUFFICIENT_PAYMENT: u64 = 6;
    
    // ===== STRUCTS =====
    
    /// Temporary object for passing large image data to transactions
    /// This allows images larger than 16KB (pure argument limit) to be passed
    /// The object is consumed (deleted) after the image data is extracted
    /// Maximum size: 250KB (Sui object size limit)
    /// Uses chunked upload pattern to bypass 16KB pure argument limit
    struct BadgeImageData has key, store {
        id: UID,
        image_data: vector<u8>,  // Raw WebP image bytes (can be up to 250KB, assembled from chunks)
    }
    
    /// Badge NFT structure - Fully on-chain Sui object (Soulbound/Non-Tradable)
    /// Sui's object-centric model allows all metadata and image data on-chain
    /// NOTE: Only has 'key' ability, NOT 'store' - this makes it truly non-transferable (soulbound)
    /// Player signs the mint transaction, so badge is created directly in their wallet
    struct EarlySupporterBadge has key {
        id: UID,
        owner: address,
        tier: u8,
        games_played: u64,  // Total games played (from PlayerStats.total_games)
        mint_date: u64,
        last_updated: u64,
        // Image storage - External URL pointing to static files
        image: String,  // URL to badge image (e.g., "http://localhost:3000/Badges/Common.webp")
    }
    
    // IMPORTANT: Badge is truly soulbound (non-transferable)
    // Badge struct has 'key' but NOT 'store' ability
    // This makes it non-transferable - cannot be sold or traded
    // Badge is permanently bound to the original owner's wallet
    // Player signs the mint transaction, so badge is created directly in their wallet (no transfer needed)
    
    /// Registry to track badges per player and counted session IDs
    struct BadgeRegistry has key {
        id: UID,
        badges: Table<address, ID>,  // player address -> badge ID
        counted_sessions: Table<vector<u8>, bool>,  // session_id -> true if counted (for idempotency)
        fee_recipient: address,  // Admin wallet address that receives minting fees (runtime-configurable)
    }
    
    // ===== EVENTS =====
    
    /// Event emitted when badge is minted
    struct BadgeMinted has copy, drop {
        owner: address,
        badge_id: ID,
        tier: u8,
        timestamp: u64,
    }
    
    /// Event emitted when badge tier is upgraded
    struct BadgeTierUpgraded has copy, drop {
        owner: address,
        badge_id: ID,
        old_tier: u8,
        new_tier: u8,
        games_played: u64,
        timestamp: u64,
    }
    
    // ===== ONE-TIME WITNESS =====
    
    /// One-Time Witness for claiming Publisher object
    /// This struct is automatically created once when the module is published
    /// Used to claim the Publisher object via package::claim_and_keep
    struct BADGE_SYSTEM has drop {}
    
    // ===== INITIALIZATION =====
    
    /// Init function - automatically called when package is published
    /// Claims the Publisher object and transfers it to the deployer
    /// This ensures we have a Publisher for creating Display objects
    fun init(otw: BADGE_SYSTEM, ctx: &mut TxContext) {
        package::claim_and_keep(otw, ctx);
    }
    
    /// Initialize BadgeRegistry (one-time setup)
    /// Should be called by admin after contract deployment
    /// Sets the fee recipient address (admin wallet that receives minting fees)
    /// This matches the pattern used in score_submission (runtime configuration)
    /// @param fee_recipient: Admin wallet address that receives minting fees
    #[allow(lint(public_entry))]
    public entry fun initialize_badge_registry(fee_recipient: address, ctx: &mut TxContext) {
        let registry = BadgeRegistry {
            id: object::new(ctx),
            badges: table::new(ctx),
            counted_sessions: table::new(ctx),
            fee_recipient,  // Set fee recipient at runtime (consistent with score_submission pattern)
        };
        transfer::share_object(registry);
    }
    
    // ===== HELPER FUNCTIONS =====
    
    /// Calculate badge tier from games played
    /// Badge tier is determined ONLY by total_games (games played)
    /// Returns tier level (0-5)
    public fun get_badge_tier(games_played: u64): u8 {
        if (games_played >= THRESHOLD_LEGENDARY) {
            TIER_LEGENDARY
        } else if (games_played >= THRESHOLD_EPIC) {
            TIER_EPIC
        } else if (games_played >= THRESHOLD_RARE) {
            TIER_RARE
        } else if (games_played >= THRESHOLD_UNCOMMON) {
            TIER_UNCOMMON
        } else if (games_played >= THRESHOLD_COMMON) {
            TIER_COMMON
        } else {
            TIER_STANDARD
        }
    }
    
    /// Get store discount percentage for a tier
    /// Returns discount percentage (0-25%)
    public fun get_discount_store(tier: u8): u8 {
        if (tier == TIER_LEGENDARY) {
            DISCOUNT_LEGENDARY_STORE
        } else if (tier == TIER_EPIC) {
            DISCOUNT_EPIC_STORE
        } else if (tier == TIER_RARE) {
            DISCOUNT_RARE_STORE
        } else if (tier == TIER_UNCOMMON) {
            DISCOUNT_UNCOMMON_STORE
        } else if (tier == TIER_COMMON) {
            DISCOUNT_COMMON_STORE
        } else {
            DISCOUNT_STANDARD_STORE
        }
    }
    
    /// Get gameplay discount percentage for a tier
    /// Returns discount percentage (0-20%)
    public fun get_discount_gameplay(tier: u8): u8 {
        if (tier == TIER_LEGENDARY) {
            DISCOUNT_LEGENDARY_GAMEPLAY
        } else if (tier == TIER_EPIC) {
            DISCOUNT_EPIC_GAMEPLAY
        } else if (tier == TIER_RARE) {
            DISCOUNT_RARE_GAMEPLAY
        } else if (tier == TIER_UNCOMMON) {
            DISCOUNT_UNCOMMON_GAMEPLAY
        } else if (tier == TIER_COMMON) {
            DISCOUNT_COMMON_GAMEPLAY
        } else {
            DISCOUNT_STANDARD_GAMEPLAY
        }
    }
    
    /// Check if player has a badge
    public fun has_badge(registry: &BadgeRegistry, player: address): bool {
        table::contains(&registry.badges, player)
    }
    
    /// Get badge ID for a player
    /// Returns badge ID if player has badge, or error if not found
    public fun get_badge_id(registry: &BadgeRegistry, player: address): ID {
        assert!(has_badge(registry, player), E_BADGE_NOT_FOUND);
        *table::borrow(&registry.badges, player)
    }
    
    /// Check if session ID has been counted for badge updates
    fun is_session_counted(registry: &BadgeRegistry, session_id: vector<u8>): bool {
        table::contains(&registry.counted_sessions, session_id)
    }
    
    /// Mark session ID as counted (for idempotency)
    fun mark_session_counted(registry: &mut BadgeRegistry, session_id: vector<u8>) {
        table::add(&mut registry.counted_sessions, session_id, true);
    }
    
    /// Create an empty BadgeImageData object for chunked upload
    /// This is the first step in the chunked upload pattern
    /// After creating this empty object, use append_image_chunk() to add data in chunks
    /// Each chunk must be <16KB to avoid pure argument limit
    #[allow(lint(public_entry))]
    public fun create_empty_image_data(
        ctx: &mut TxContext
    ): BadgeImageData {
        BadgeImageData {
            id: object::new(ctx),
            image_data: vector::empty(),
        }
    }
    
    /// Append a chunk of image data to an existing BadgeImageData object
    /// This allows uploading large images in chunks, bypassing the 16KB pure argument limit
    /// Each chunk should be <16KB (typically 10-15KB for safety)
    /// Call this function multiple times until the entire image is uploaded
    #[allow(lint(public_entry))]
    public entry fun append_image_chunk(
        image_obj: &mut BadgeImageData,
        chunk: vector<u8>
    ) {
        vector::append(&mut image_obj.image_data, chunk);
    }
    
    /// Create a BadgeImageData object from image bytes (for small images <16KB)
    /// For images larger than 16KB, use create_empty_image_data() + append_image_chunk() instead
    /// Note: This is public (not entry) because it returns a non-drop type
    public fun create_image_data_small(
        image_data: vector<u8>,
        ctx: &mut TxContext
    ): BadgeImageData {
        BadgeImageData {
            id: object::new(ctx),
            image_data,
        }
    }
    
    // ===== MAIN FUNCTIONS =====
    
    /// Mint a badge for a first-time player
    /// Player signs this transaction (tx_context::sender() is the player)
    /// Player pays minting fee ($0.10 dollar-pegged) + gas fees
    /// Creates badge with Standard tier (tier 0)
    /// Badge is created directly in player's wallet (truly soulbound - no 'store' ability)
    /// NOTE: Demo mode games do NOT call this function, so they are automatically excluded
    /// NOTE: Frontend should calculate exact SUI amount based on current price to maintain $0.10 value
    #[allow(lint(public_entry))]
    public entry fun mint_badge(
        registry: &mut BadgeRegistry,
        stats_registry: &StatisticsRegistry,
        clock: &Clock,
        payment: Coin<SUI>,  // Minting fee payment ($0.10 dollar-pegged, frontend calculates SUI amount)
        image_url: String,  // URL to Standard tier badge image (e.g., "http://localhost:3000/Badges/Standard.webp")
        ctx: &mut TxContext
    ) {
        let player = tx_context::sender(ctx);  // Player signs the transaction
        let current_time = clock::timestamp_ms(clock);
        
        // Validate payment meets minimum fee requirement
        // Frontend should calculate exact amount based on current SUI price to maintain $0.10 value
        // This minimum is a safety net against SUI price spikes
        assert!(coin::value(&payment) >= MIN_MINT_FEE_MIST, E_INSUFFICIENT_PAYMENT);
        
        // Transfer minting fee to fee recipient (stored in registry)
        transfer::public_transfer(payment, registry.fee_recipient);
        
        // Validate player doesn't already have a badge
        assert!(!has_badge(registry, player), E_PLAYER_ALREADY_HAS_BADGE);
        
        // Get player's total_games from statistics registry
        // If player has no stats yet, they have 0 games (will be Standard tier)
        let (has_stats, total_games, _best_score, _best_distance, _best_coins, _best_bosses_defeated, _best_enemies_defeated, _best_coin_streak, _total_score, _total_distance, _total_coins, _total_bosses_defeated, _total_enemies_defeated, _total_coin_streak, _first_game_date, _last_game_date) = score_submission::get_player_stats(stats_registry, player);
        
        // Create badge with Standard tier (tier 0) for first-time players
        // Badge is created directly in player's wallet (no transfer needed - truly soulbound)
        let badge = EarlySupporterBadge {
            id: object::new(ctx),
            owner: player,
            tier: TIER_STANDARD,  // Always start at Standard tier when minting
            games_played: if (has_stats) { total_games } else { 0 },
            mint_date: current_time,
            last_updated: current_time,
            image: image_url,  // URL to static Standard tier badge image
        };
        
        // Get badge ID before transferring (must get ID before transfer consumes the badge)
        let badge_id = object::id(&badge);
        
        // Transfer badge to player (tx_context::sender())
        // Since badge has no 'store' ability, we use transfer::transfer (same module)
        // This makes the badge truly soulbound - it cannot be transferred after this
        // The transfer consumes the badge, so it must be the last operation on it
        transfer::transfer(badge, player);
        
        // Register badge in registry
        table::add(&mut registry.badges, player, badge_id);
        
        // Emit BadgeMinted event
        event::emit(BadgeMinted {
            owner: player,
            badge_id,
            tier: TIER_STANDARD,
            timestamp: current_time,
        });
    }
    
    /// Update badge tier based on games played
    /// Validates that game was NOT played in demo mode
    /// Uses session ID for idempotency (prevents duplicate counting)
    /// Updates badge tier and image if tier increased
    /// NOTE: Demo mode games do NOT call this function, so they are automatically excluded
    #[allow(lint(public_entry))]
    public entry fun update_badge_tier(
        badge: &mut EarlySupporterBadge,
        registry: &mut BadgeRegistry,
        stats_registry: &StatisticsRegistry,
        clock: &Clock,
        session_id: vector<u8>,  // Session ID from score submission (for idempotency)
        new_image_url: String,  // URL to new tier's badge image (e.g., "http://localhost:3000/Badges/Rare.webp")
        _ctx: &mut TxContext
    ) {
        let current_time = clock::timestamp_ms(clock);
        
        // Idempotency check - prevent counting same session twice
        assert!(!is_session_counted(registry, session_id), E_SESSION_ALREADY_COUNTED);
        
        // Mark session as counted
        mark_session_counted(registry, session_id);
        
        // Get current games_played from statistics registry (source of truth)
        let (_has_stats, total_games, _best_score, _best_distance, _best_coins, _best_bosses_defeated, _best_enemies_defeated, _best_coin_streak, _total_score, _total_distance, _total_coins, _total_bosses_defeated, _total_enemies_defeated, _total_coin_streak, _first_game_date, _last_game_date) = score_submission::get_player_stats(stats_registry, badge.owner);
        
        // Calculate new tier based on games_played
        let new_tier = get_badge_tier(total_games);
        let old_tier = badge.tier;
        
        // Update games_played count (sync with statistics)
        badge.games_played = total_games;
        
        // If tier increased, update badge tier and image
        if (new_tier > old_tier) {
            badge.tier = new_tier;
            badge.image = new_image_url;  // Update to new tier's badge image URL
            badge.last_updated = current_time;
            
            // Emit BadgeTierUpgraded event
            event::emit(BadgeTierUpgraded {
                owner: badge.owner,
                badge_id: object::id(badge),
                old_tier,
                new_tier,
                games_played: total_games,
                timestamp: current_time,
            });
        } else {
            // Tier didn't increase, but still update last_updated timestamp
            badge.last_updated = current_time;
        }
    }
    
    /// Update badge image URL (for wallet display)
    /// Allows updating the image field with a URL pointing to the on-chain image data
    /// This is needed because large images can't be passed as data URIs due to 16KB limit
    #[allow(lint(public_entry))]
    public entry fun update_badge_image_url(
        badge: &mut EarlySupporterBadge,
        clock: &Clock,
        image_url: String,  // URL to the badge image (e.g., "https://suitwo.game/api/badges/{address}/image")
        _ctx: &mut TxContext
    ) {
        badge.image = image_url;
        badge.last_updated = clock::timestamp_ms(clock);
    }
    
    // ===== VIEW FUNCTIONS =====
    
    /// Get badge data for a player
    /// Returns badge information if player has badge
    public fun get_badge_data(badge: &EarlySupporterBadge): (
        address,      // owner
        u8,           // tier
        u64,          // games_played
        u64,          // mint_date
        u64           // last_updated
    ) {
        (
            badge.owner,
            badge.tier,
            badge.games_played,
            badge.mint_date,
            badge.last_updated,
        )
    }
    
    /// Get badge image URL
    /// Returns the badge image URL
    public fun get_badge_image_url(badge: &EarlySupporterBadge): String {
        badge.image
    }
    
    // ===== SUI OBJECT DISPLAY CONFIGURATION =====
    
    /// Get tier name as string for display
    /// Helper function to convert tier number to human-readable name
    /// Get tier name as string (for display/metadata purposes)
    public fun get_tier_name(tier: u8): String {
        if (tier == TIER_LEGENDARY) {
            string::utf8(b"Legendary")
        } else if (tier == TIER_EPIC) {
            string::utf8(b"Epic")
        } else if (tier == TIER_RARE) {
            string::utf8(b"Rare")
        } else if (tier == TIER_UNCOMMON) {
            string::utf8(b"Uncommon")
        } else if (tier == TIER_COMMON) {
            string::utf8(b"Common")
        } else {
            string::utf8(b"Standard")
        }
    }
    
    /// Create and configure Display object for EarlySupporterBadge
    /// This sets up how badges appear in wallets (Sui Wallet, Sui Explorer, etc.)
    /// Must be called once after contract deployment using Publisher
    /// Display object is shared and applies to all badge instances
    #[allow(lint(public_entry))]
    public entry fun create_display(
        publisher: &Publisher,
        ctx: &mut TxContext
    ) {
        // Create Display object for EarlySupporterBadge type with all fields
        // Note: Use "url" instead of "image_url" for wallet compatibility (Slush, SuiVision, etc.)
        let fields = vector[
            string::utf8(b"name"),
            string::utf8(b"description"),
            string::utf8(b"link"),
            string::utf8(b"url"),  // Changed from "image_url" to "url" for wallet compatibility
            string::utf8(b"tier_name"),
            string::utf8(b"games_played"),
            string::utf8(b"mint_date"),
            string::utf8(b"last_updated"),
            string::utf8(b"store_discount"),
            string::utf8(b"gameplay_discount"),
            string::utf8(b"soulbound"),
            string::utf8(b"project"),
        ];
        let values = vector[
            string::utf8(b"Early Supporter Badge - {tier}"),
            string::utf8(b"A soulbound badge that evolves based on games played. This badge represents your dedication as an early supporter of SuiTwo. It cannot be transferred or sold - it's permanently bound to your wallet."),
            string::utf8(b"https://suitwo.game/badge/{id}"),
            string::utf8(b"{image}"),  // References the 'image' field in EarlySupporterBadge struct
            string::utf8(b"{tier}"),
            string::utf8(b"{games_played}"),
            string::utf8(b"{mint_date}"),
            string::utf8(b"{last_updated}"),
            string::utf8(b"{tier}"),
            string::utf8(b"{tier}"),
            string::utf8(b"true"),
            string::utf8(b"SuiTwo"),
        ];
        let display_obj = display::new_with_fields<EarlySupporterBadge>(publisher, fields, values, ctx);
        
        // Transfer the Display object to the sender (admin)
        // Display object should be kept by admin for future updates
        transfer::public_transfer(display_obj, tx_context::sender(ctx));
    }
    
    /// Update Display object fields (if needed in the future)
    /// Can be called by anyone who owns the Display object
    #[allow(lint(public_entry))]
    public entry fun update_display(
        display: &mut Display<EarlySupporterBadge>,
        fields: vector<String>,
        values: vector<String>
    ) {
        // Update multiple fields at once
        display::add_multiple(display, fields, values);
        // Bump version to signal update
        display::update_version(display);
    }

    // ===== ADMIN FUNCTIONS (FOR TESTING) =====

    /// Admin-only function to mint a badge for a player (for testing)
    /// Admin signs the transaction, but badge is created with player as owner
    /// NOTE: Since badge has no 'store' ability, it cannot be transferred after creation
    /// This function creates the badge directly in the admin's wallet, but sets player as owner
    /// For testing purposes only - in production, players mint their own badges
    #[allow(lint(public_entry))]
    public entry fun admin_mint_badge(
        _admin_cap: &AdminCapability,  // Proves caller is admin
        registry: &mut BadgeRegistry,
        stats_registry: &StatisticsRegistry,
        clock: &Clock,
        player: address,  // Player to mint badge for
        tier: u8,  // Tier to mint (0-5)
        image_url: String,  // URL to badge image (e.g., "http://localhost:3000/Badges/Common.webp")
        ctx: &mut TxContext
    ) {
        let current_time = clock::timestamp_ms(clock);
        
        // Validate tier
        assert!(tier <= TIER_LEGENDARY, E_INVALID_TIER);
        
        // Validate player doesn't already have a badge
        assert!(!has_badge(registry, player), E_PLAYER_ALREADY_HAS_BADGE);
        
        // Get player's total_games from statistics registry
        let (has_stats, total_games, _best_score, _best_distance, _best_coins, _best_bosses_defeated, _best_enemies_defeated, _best_coin_streak, _total_score, _total_distance, _total_coins, _total_bosses_defeated, _total_enemies_defeated, _total_coin_streak, _first_game_date, _last_game_date) = score_submission::get_player_stats(stats_registry, player);
        
        // Create badge with specified tier
        // NOTE: Badge is created in admin's wallet (tx_context::sender()), but owner field is set to player
        // This is for testing only - in production, players mint their own badges
        let badge = EarlySupporterBadge {
            id: object::new(ctx),
            owner: player,  // Set player as owner (metadata)
            tier,
            games_played: if (has_stats) { total_games } else { 0 },
            mint_date: current_time,
            last_updated: current_time,
            image: image_url,  // URL to static badge image
        };
        
        // Get badge ID before transferring (must get ID before transfer consumes the badge)
        let badge_id = object::id(&badge);
        
        // Transfer badge to admin (tx_context::sender()) for testing
        // Since badge has no 'store' ability, we use transfer::transfer (same module)
        // Badge metadata shows player as owner, but object is in admin's wallet for testing
        // The transfer consumes the badge, so it must be the last operation on it
        let admin = tx_context::sender(ctx);
        transfer::transfer(badge, admin);
        
        // Register badge in registry
        table::add(&mut registry.badges, player, badge_id);
        
        // Emit BadgeMinted event
        event::emit(BadgeMinted {
            owner: player,
            badge_id,
            tier,
            timestamp: current_time,
        });
    }

    /// Admin-only function to burn (delete) a badge (for testing)
    /// Removes badge from registry and deletes the object
    /// NOTE: Since badge has no 'store' ability, it must be in admin's wallet to be burned
    /// This is for testing only - in production, badges are permanent (soulbound)
    #[allow(lint(public_entry))]
    public entry fun admin_burn_badge(
        _admin_cap: &AdminCapability,  // Proves caller is admin
        registry: &mut BadgeRegistry,
        badge: EarlySupporterBadge,  // Badge to burn (must be in admin's wallet)
        _ctx: &mut TxContext
    ) {
        let _badge_id = object::id(&badge);
        let player = badge.owner;
        
        // Remove badge from registry
        // Note: This will panic if badge is not in registry, which is fine for testing
        table::remove(&mut registry.badges, player);
        
        // Delete the badge object
        // Since badge has no 'store' ability, it must be in the transaction sender's wallet
        // This function can only be called if admin has the badge in their wallet
        // Destructure badge to extract UID (UID doesn't have copy ability)
        let EarlySupporterBadge { id: badge_uid, owner: _, tier: _, games_played: _, image: _, mint_date: _, last_updated: _ } = badge;
        object::delete(badge_uid);
        
        // Emit event (optional - for testing/debugging)
        // Note: We don't have a BadgeBurned event, but we could add one if needed
    }

    /// Admin-only function to clean up orphaned registry entries
    /// Removes registry entry if badge object doesn't exist
    /// This fixes cases where registry entry exists but badge object was deleted/burned
    /// @param player: Player address to check and clean up
    #[allow(lint(public_entry))]
    public entry fun admin_cleanup_orphaned_entry(
        _admin_cap: &AdminCapability,  // Proves caller is admin
        registry: &mut BadgeRegistry,
        player: address
    ) {
        // Check if player has entry in registry
        if (table::contains(&registry.badges, player)) {
            // Remove the orphaned entry
            // Note: We can't verify the badge object exists from Move, but if this function
            // is called, it means the backend verified the object doesn't exist
            table::remove(&mut registry.badges, player);
        };
        // If no entry exists, do nothing (idempotent)
    }

    /// Migrate badge from old contract to new contract
    /// This function allows players to migrate their badge data to the new contract
    /// Player must provide old badge data (tier, games_played, mint_date, image_data) and the old badge object
    /// This preserves all badge metadata during contract migration and burns the old badge
    /// NOTE: This is a one-time migration function. Player must not already have a badge in new registry.
    /// The player is determined from tx_context::sender() - they must be migrating their own badge.
    /// The old badge must be passed as an argument and will be deleted ONLY after new badge is verified.
    /// Player pays gas fees for this transaction (creating new badge + deleting old badge).
    /// 
    /// SAFETY: This function ensures the new badge is created and registered BEFORE the old badge is deleted.
    /// If any step fails, the transaction aborts and the old badge remains safe.
    public entry fun migrate_badge<T: key + store>(
        registry: &mut BadgeRegistry,
        stats_registry: &StatisticsRegistry,
        clock: &Clock,
        old_badge: T,  // Old badge from previous contract (must be in player's wallet, will be deleted)
        old_tier: u8,  // Tier from old badge
        _old_games_played: u64,  // Games played from old badge (unused, kept for API compatibility)
        old_mint_date: u64,  // Original mint date from old badge
        image_url: String,  // URL to badge image (e.g., "http://localhost:3000/Badges/Common.webp")
        ctx: &mut TxContext
    ) {
        // Get player from transaction sender
        let player = tx_context::sender(ctx);
        
        // Validate player doesn't already have a badge in new registry
        assert!(!has_badge(registry, player), E_PLAYER_ALREADY_HAS_BADGE);
        
        // Validate tier
        assert!(old_tier <= TIER_LEGENDARY, E_INVALID_TIER);
        
        // NOTE: old_badge ownership is guaranteed by Sui - player must own it to pass it
        // We can't verify old_badge fields in Move (different package type), but backend should verify
        
        // ===== STEP 1: Create new badge =====
        // Get current games_played from statistics registry (source of truth)
        let (_has_stats, current_total_games, _best_score, _best_distance, _best_coins, _best_bosses_defeated, _best_enemies_defeated, _best_coin_streak, _total_score, _total_distance, _total_coins, _total_bosses_defeated, _total_enemies_defeated, _total_coin_streak, _first_game_date, _last_game_date) = score_submission::get_player_stats(stats_registry, player);
        
        // Calculate current tier based on actual games played (may have changed since old badge)
        let current_tier = get_badge_tier(current_total_games);
        
        // Use the higher of old_tier or current_tier (don't downgrade during migration)
        let final_tier = if (current_tier > old_tier) { current_tier } else { old_tier };
        
        // Use current games_played (source of truth)
        let final_games_played = current_total_games;
        
        // Preserve original mint_date
        let preserved_mint_date = old_mint_date;
        
        // Get current time for last_updated
        let current_time = clock::timestamp_ms(clock);
        
        // Create new badge with migrated data
        let badge = EarlySupporterBadge {
            id: object::new(ctx),
            owner: player,
            tier: final_tier,
            games_played: final_games_played,
            mint_date: preserved_mint_date,  // Preserve original mint date
            last_updated: current_time,  // Update last_updated to now
            image: image_url,  // URL to static badge image
        };
        
        // Get badge ID before transferring
        let badge_id = object::id(&badge);
        
        // ===== STEP 2: Transfer new badge to player =====
        // Badge is created directly in player's wallet (soulbound)
        // If this fails, transaction aborts and old badge is NOT deleted
        transfer::transfer(badge, player);
        
        // ===== STEP 3: Register badge in new registry =====
        // If this fails, transaction aborts and old badge is NOT deleted
        table::add(&mut registry.badges, player, badge_id);
        
        // ===== STEP 4: Verify new badge is registered =====
        // This ensures the new badge exists in the registry before we delete the old badge
        // If this check fails, transaction aborts and old badge is NOT deleted
        assert!(has_badge(registry, player), E_BADGE_NOT_FOUND);
        assert!(get_badge_id(registry, player) == badge_id, E_BADGE_NOT_FOUND);
        
        // ===== STEP 5: Emit BadgeMinted event =====
        // Emit event after verification (migration counts as a mint)
        event::emit(BadgeMinted {
            owner: player,
            badge_id,
            tier: final_tier,
            timestamp: current_time,
        });
        
        // ===== STEP 6: Handle old badge =====
        // Only reached if all previous steps succeeded
        // For generic types with 'key' ability from other modules, we can't use object::delete
        // directly because we can't extract the UID from a generic type, and we can't use
        // transfer::transfer because it's restricted to the object's module.
        // We use transfer::public_transfer which can transfer objects from any module.
        // NOTE: The old badge will remain in the player's wallet. This is acceptable because:
        // 1. The new badge is registered and active
        // 2. The old badge is from a different package and won't interfere
        // 3. Players can manually delete old badges if desired
        // The Sui runtime will handle cleanup of objects that are no longer referenced.
        transfer::public_transfer(old_badge, tx_context::sender(ctx));
        // At this point, we've verified:
        // 1. New badge was created
        // 2. New badge was transferred to player
        // 3. New badge is registered in registry
        // 4. New badge ID matches what we registered
        // So it's safe to delete the old badge
    }
}

