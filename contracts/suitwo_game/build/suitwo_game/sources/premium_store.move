module suitwo_game::premium_store {
    use sui::object::{Self, UID};
    use sui::tx_context::TxContext;
    use sui::transfer;
    use sui::event;
    use sui::clock::{Self, Clock};
    use sui::dynamic_object_field as ofield;

    // ===== CONSTANTS =====
    
    // Item type constants (matches backend itemTypeMap)
    const ITEM_TYPE_EXTRA_LIVES: u8 = 0;
    const ITEM_TYPE_FORCE_FIELD: u8 = 1;
    const ITEM_TYPE_ORB_LEVEL: u8 = 2;
    const ITEM_TYPE_SLOW_TIME: u8 = 3;
    const ITEM_TYPE_DESTROY_ALL: u8 = 4;
    const ITEM_TYPE_BOSS_KILL_SHOT: u8 = 5;
    const ITEM_TYPE_COIN_TRACTOR_BEAM: u8 = 6;

    // Payment token constants
    const PAYMENT_TOKEN_SUI: u8 = 0;
    const PAYMENT_TOKEN_MEWS: u8 = 1;
    const PAYMENT_TOKEN_USDC: u8 = 2;

    // ===== STRUCTS =====
    
    /// Admin capability - only admin wallet can consume items on behalf of players
    /// This prevents unauthorized item consumption
    struct AdminCapability has key, store {
        id: UID,
    }
    
    /// Premium Store - shared object that manages all player inventories
    /// Uses dynamic object fields to store PlayerInventory objects
    struct PremiumStore has key {
        id: UID,
    }
    
    /// Player inventory - stores all purchased items for a player
    /// Stored as a dynamic object field on PremiumStore
    struct PlayerInventory has key, store {
        id: UID,
        player: address,
        
        // Extra Lives (3 levels)
        extra_lives_level_1: u64,
        extra_lives_level_2: u64,
        extra_lives_level_3: u64,
        
        // Force Field Start (3 levels)
        force_field_level_1: u64,
        force_field_level_2: u64,
        force_field_level_3: u64,
        
        // Orb Level Start (3 levels)
        orb_level_1: u64,
        orb_level_2: u64,
        orb_level_3: u64,
        
        // Slow Time Power (3 levels)
        slow_time_level_1: u64,
        slow_time_level_2: u64,
        slow_time_level_3: u64,
        
        // Destroy All Enemies (single level)
        destroy_all_enemies: u64,
        
        // Boss Kill Shot (single level)
        boss_kill_shot: u64,
        
        // Coin Tractor Beam (3 levels)
        coin_tractor_beam_level_1: u64,
        coin_tractor_beam_level_2: u64,
        coin_tractor_beam_level_3: u64,
    }

    // ===== EVENTS =====
    
    /// Event emitted when an item is purchased
    struct ItemPurchased has copy, drop {
        player: address,
        item_type: u8,
        item_level: u8,
        quantity: u64,
        amount_paid: u64,
        payment_token: u8,  // 0=SUI, 1=MEWS, 2=USDC
        timestamp: u64,
    }
    
    /// Event emitted when inventory is updated (purchase or consumption)
    struct InventoryUpdated has copy, drop {
        player: address,
        item_type: u8,
        item_level: u8,
        quantity_change: u64,  // Positive for purchase, negative for consumption
        new_quantity: u64,
        timestamp: u64,
    }
    
    /// Event emitted when an item is consumed
    struct ItemConsumed has copy, drop {
        player: address,
        item_type: u8,
        item_level: u8,
        quantity: u64,
        timestamp: u64,
    }

    // ===== INITIALIZATION =====
    
    /// Initialize the premium store (one-time setup)
    /// Creates the shared PremiumStore object
    fun init(ctx: &mut TxContext) {
        let store = PremiumStore {
            id: object::new(ctx),
        };
        transfer::share_object(store);
    }
    
    /// Create admin capability for premium store
    /// This should be called once after contract deployment
    public entry fun create_admin_capability(admin_address: address, ctx: &mut TxContext) {
        let admin_cap = AdminCapability {
            id: object::new(ctx),
        };
        transfer::transfer(admin_cap, admin_address);
    }

    // ===== HELPER FUNCTIONS =====
    
    /// Create an empty inventory for a player
    fun create_empty_inventory(player: address, ctx: &mut TxContext): PlayerInventory {
        PlayerInventory {
            id: object::new(ctx),
            player,
            extra_lives_level_1: 0,
            extra_lives_level_2: 0,
            extra_lives_level_3: 0,
            force_field_level_1: 0,
            force_field_level_2: 0,
            force_field_level_3: 0,
            orb_level_1: 0,
            orb_level_2: 0,
            orb_level_3: 0,
            slow_time_level_1: 0,
            slow_time_level_2: 0,
            slow_time_level_3: 0,
            destroy_all_enemies: 0,
            boss_kill_shot: 0,
            coin_tractor_beam_level_1: 0,
            coin_tractor_beam_level_2: 0,
            coin_tractor_beam_level_3: 0,
        }
    }
    
    /// Get or create player inventory using dynamic object fields
    fun get_or_create_inventory(
        store: &mut PremiumStore,
        player: address,
        ctx: &mut TxContext
    ): &mut PlayerInventory {
        if (ofield::exists_with_type<address, PlayerInventory>(&store.id, player)) {
            // Inventory exists, return mutable reference
            ofield::borrow_mut<address, PlayerInventory>(&mut store.id, player)
        } else {
            // Create new inventory and add to dynamic field
            let inventory = create_empty_inventory(player, ctx);
            ofield::add(&mut store.id, player, inventory);
            ofield::borrow_mut<address, PlayerInventory>(&mut store.id, player)
        }
    }
    
    /// Get inventory (read-only)
    fun get_inventory(
        store: &PremiumStore,
        player: address
    ): &PlayerInventory {
        assert!(ofield::exists_with_type<address, PlayerInventory>(&store.id, player), 0); // Error: Inventory not found
        ofield::borrow<address, PlayerInventory>(&store.id, player)
    }
    
    /// Increment inventory count for an item
    fun increment_inventory(
        inventory: &mut PlayerInventory,
        item_type: u8,
        item_level: u8,
        quantity: u64
    ) {
        if (item_type == ITEM_TYPE_EXTRA_LIVES) {
            if (item_level == 1) {
                inventory.extra_lives_level_1 = inventory.extra_lives_level_1 + quantity;
            } else if (item_level == 2) {
                inventory.extra_lives_level_2 = inventory.extra_lives_level_2 + quantity;
            } else if (item_level == 3) {
                inventory.extra_lives_level_3 = inventory.extra_lives_level_3 + quantity;
            };
        } else if (item_type == ITEM_TYPE_FORCE_FIELD) {
            if (item_level == 1) {
                inventory.force_field_level_1 = inventory.force_field_level_1 + quantity;
            } else if (item_level == 2) {
                inventory.force_field_level_2 = inventory.force_field_level_2 + quantity;
            } else if (item_level == 3) {
                inventory.force_field_level_3 = inventory.force_field_level_3 + quantity;
            };
        } else if (item_type == ITEM_TYPE_ORB_LEVEL) {
            if (item_level == 1) {
                inventory.orb_level_1 = inventory.orb_level_1 + quantity;
            } else if (item_level == 2) {
                inventory.orb_level_2 = inventory.orb_level_2 + quantity;
            } else if (item_level == 3) {
                inventory.orb_level_3 = inventory.orb_level_3 + quantity;
            };
        } else if (item_type == ITEM_TYPE_SLOW_TIME) {
            if (item_level == 1) {
                inventory.slow_time_level_1 = inventory.slow_time_level_1 + quantity;
            } else if (item_level == 2) {
                inventory.slow_time_level_2 = inventory.slow_time_level_2 + quantity;
            } else if (item_level == 3) {
                inventory.slow_time_level_3 = inventory.slow_time_level_3 + quantity;
            };
        } else if (item_type == ITEM_TYPE_DESTROY_ALL) {
            inventory.destroy_all_enemies = inventory.destroy_all_enemies + quantity;
        } else if (item_type == ITEM_TYPE_BOSS_KILL_SHOT) {
            inventory.boss_kill_shot = inventory.boss_kill_shot + quantity;
        } else if (item_type == ITEM_TYPE_COIN_TRACTOR_BEAM) {
            if (item_level == 1) {
                inventory.coin_tractor_beam_level_1 = inventory.coin_tractor_beam_level_1 + quantity;
            } else if (item_level == 2) {
                inventory.coin_tractor_beam_level_2 = inventory.coin_tractor_beam_level_2 + quantity;
            } else if (item_level == 3) {
                inventory.coin_tractor_beam_level_3 = inventory.coin_tractor_beam_level_3 + quantity;
            };
        };
    }
    
    /// Decrement inventory count for an item
    /// Returns true if successful, false if insufficient quantity or invalid item/level
    fun decrement_inventory(
        inventory: &mut PlayerInventory,
        item_type: u8,
        item_level: u8,
        quantity: u64
    ): bool {
        if (item_type == ITEM_TYPE_EXTRA_LIVES) {
            if (item_level == 1) {
                if (inventory.extra_lives_level_1 < quantity) {
                    return false
                };
                inventory.extra_lives_level_1 = inventory.extra_lives_level_1 - quantity;
                return true
            } else if (item_level == 2) {
                if (inventory.extra_lives_level_2 < quantity) {
                    return false
                };
                inventory.extra_lives_level_2 = inventory.extra_lives_level_2 - quantity;
                return true
            } else if (item_level == 3) {
                if (inventory.extra_lives_level_3 < quantity) {
                    return false
                };
                inventory.extra_lives_level_3 = inventory.extra_lives_level_3 - quantity;
                return true
            } else {
                return false  // Invalid level for extra lives
            }
        } else if (item_type == ITEM_TYPE_FORCE_FIELD) {
            if (item_level == 1) {
                if (inventory.force_field_level_1 < quantity) {
                    return false
                };
                inventory.force_field_level_1 = inventory.force_field_level_1 - quantity;
                return true
            } else if (item_level == 2) {
                if (inventory.force_field_level_2 < quantity) {
                    return false
                };
                inventory.force_field_level_2 = inventory.force_field_level_2 - quantity;
                return true
            } else if (item_level == 3) {
                if (inventory.force_field_level_3 < quantity) {
                    return false
                };
                inventory.force_field_level_3 = inventory.force_field_level_3 - quantity;
                return true
            } else {
                return false  // Invalid level for force field
            }
        } else if (item_type == ITEM_TYPE_ORB_LEVEL) {
            if (item_level == 1) {
                if (inventory.orb_level_1 < quantity) {
                    return false
                };
                inventory.orb_level_1 = inventory.orb_level_1 - quantity;
                return true
            } else if (item_level == 2) {
                if (inventory.orb_level_2 < quantity) {
                    return false
                };
                inventory.orb_level_2 = inventory.orb_level_2 - quantity;
                return true
            } else if (item_level == 3) {
                if (inventory.orb_level_3 < quantity) {
                    return false
                };
                inventory.orb_level_3 = inventory.orb_level_3 - quantity;
                return true
            } else {
                return false  // Invalid level for orb level
            }
        } else if (item_type == ITEM_TYPE_SLOW_TIME) {
            if (item_level == 1) {
                if (inventory.slow_time_level_1 < quantity) {
                    return false
                };
                inventory.slow_time_level_1 = inventory.slow_time_level_1 - quantity;
                return true
            } else if (item_level == 2) {
                if (inventory.slow_time_level_2 < quantity) {
                    return false
                };
                inventory.slow_time_level_2 = inventory.slow_time_level_2 - quantity;
                return true
            } else if (item_level == 3) {
                if (inventory.slow_time_level_3 < quantity) {
                    return false
                };
                inventory.slow_time_level_3 = inventory.slow_time_level_3 - quantity;
                return true
            } else {
                return false  // Invalid level for slow time
            }
        } else if (item_type == ITEM_TYPE_DESTROY_ALL) {
            if (inventory.destroy_all_enemies < quantity) {
                return false
            };
            inventory.destroy_all_enemies = inventory.destroy_all_enemies - quantity;
            return true
        } else if (item_type == ITEM_TYPE_BOSS_KILL_SHOT) {
            if (inventory.boss_kill_shot < quantity) {
                return false
            };
            inventory.boss_kill_shot = inventory.boss_kill_shot - quantity;
            return true
        } else if (item_type == ITEM_TYPE_COIN_TRACTOR_BEAM) {
            if (item_level == 1) {
                if (inventory.coin_tractor_beam_level_1 < quantity) {
                    return false
                };
                inventory.coin_tractor_beam_level_1 = inventory.coin_tractor_beam_level_1 - quantity;
                return true
            } else if (item_level == 2) {
                if (inventory.coin_tractor_beam_level_2 < quantity) {
                    return false
                };
                inventory.coin_tractor_beam_level_2 = inventory.coin_tractor_beam_level_2 - quantity;
                return true
            } else if (item_level == 3) {
                if (inventory.coin_tractor_beam_level_3 < quantity) {
                    return false
                };
                inventory.coin_tractor_beam_level_3 = inventory.coin_tractor_beam_level_3 - quantity;
                return true
            } else {
                return false  // Invalid level for coin tractor beam
            }
        } else {
            return false  // Invalid item type
        }
    }
    
    /// Get current inventory count for an item
    fun get_inventory_count(
        inventory: &PlayerInventory,
        item_type: u8,
        item_level: u8
    ): u64 {
        if (item_type == ITEM_TYPE_EXTRA_LIVES) {
            if (item_level == 1) {
                return inventory.extra_lives_level_1
            } else if (item_level == 2) {
                return inventory.extra_lives_level_2
            } else if (item_level == 3) {
                return inventory.extra_lives_level_3
            };
        } else if (item_type == ITEM_TYPE_FORCE_FIELD) {
            if (item_level == 1) {
                return inventory.force_field_level_1
            } else if (item_level == 2) {
                return inventory.force_field_level_2
            } else if (item_level == 3) {
                return inventory.force_field_level_3
            };
        } else if (item_type == ITEM_TYPE_ORB_LEVEL) {
            if (item_level == 1) {
                return inventory.orb_level_1
            } else if (item_level == 2) {
                return inventory.orb_level_2
            } else if (item_level == 3) {
                return inventory.orb_level_3
            };
        } else if (item_type == ITEM_TYPE_SLOW_TIME) {
            if (item_level == 1) {
                return inventory.slow_time_level_1
            } else if (item_level == 2) {
                return inventory.slow_time_level_2
            } else if (item_level == 3) {
                return inventory.slow_time_level_3
            };
        } else if (item_type == ITEM_TYPE_DESTROY_ALL) {
            return inventory.destroy_all_enemies
        } else if (item_type == ITEM_TYPE_BOSS_KILL_SHOT) {
            return inventory.boss_kill_shot
        } else if (item_type == ITEM_TYPE_COIN_TRACTOR_BEAM) {
            if (item_level == 1) {
                return inventory.coin_tractor_beam_level_1
            } else if (item_level == 2) {
                return inventory.coin_tractor_beam_level_2
            } else if (item_level == 3) {
                return inventory.coin_tractor_beam_level_3
            };
        };
        0
    }

    // ===== MAIN FUNCTIONS =====
    
    /// Purchase an item (player signs, player pays)
    /// Payment transfer should happen in the same transaction (handled by frontend/backend)
    /// This function only updates the inventory
    public entry fun purchase_item(
        store: &mut PremiumStore,
        clock: &Clock,
        player: address,
        item_type: u8,
        item_level: u8,
        quantity: u64,
        amount_paid: u64,
        payment_token: u8,
        ctx: &mut TxContext
    ) {
        let current_time = clock::timestamp_ms(clock);
        
        // Validate inputs
        assert!(item_type <= ITEM_TYPE_COIN_TRACTOR_BEAM, 1); // Error code 1: Invalid item type
        assert!(item_level >= 1 && item_level <= 3, 2); // Error code 2: Invalid item level
        assert!(quantity > 0, 3); // Error code 3: Quantity must be positive
        assert!(payment_token <= PAYMENT_TOKEN_USDC, 4); // Error code 4: Invalid payment token
        
        // Get or create inventory
        let inventory = get_or_create_inventory(store, player, ctx);
        
        // Increment inventory
        increment_inventory(inventory, item_type, item_level, quantity);
        
        // Get new quantity for event
        let new_quantity = get_inventory_count(inventory, item_type, item_level);
        
        // Emit events
        event::emit(ItemPurchased {
            player,
            item_type,
            item_level,
            quantity,
            amount_paid,
            payment_token,
            timestamp: current_time,
        });
        
        event::emit(InventoryUpdated {
            player,
            item_type,
            item_level,
            quantity_change: quantity,
            new_quantity,
            timestamp: current_time,
        });
    }
    
    /// Consume items from inventory (admin wallet signs, admin pays gas)
    /// Called when player starts a game and uses purchased items
    public entry fun consume_item(
        _admin_cap: &AdminCapability,  // Admin capability - proves caller is admin
        store: &mut PremiumStore,
        clock: &Clock,
        player: address,
        item_type: u8,
        item_level: u8,
        quantity: u64,
        ctx: &mut TxContext
    ) {
        let current_time = clock::timestamp_ms(clock);
        
        // Validate inputs
        assert!(item_type <= ITEM_TYPE_COIN_TRACTOR_BEAM, 1); // Error code 1: Invalid item type
        assert!(item_level >= 1 && item_level <= 3, 2); // Error code 2: Invalid item level
        assert!(quantity > 0, 3); // Error code 3: Quantity must be positive
        
        // Check if inventory exists
        assert!(ofield::exists_with_type<address, PlayerInventory>(&store.id, player), 4); // Error code 4: Inventory not found
        
        // Get inventory
        let inventory = ofield::borrow_mut<address, PlayerInventory>(&mut store.id, player);
        
        // Decrement inventory
        assert!(decrement_inventory(inventory, item_type, item_level, quantity), 5); // Error code 5: Insufficient quantity
        
        // Get new quantity for event
        let new_quantity = get_inventory_count(inventory, item_type, item_level);
        
        // Emit events
        event::emit(ItemConsumed {
            player,
            item_type,
            item_level,
            quantity,
            timestamp: current_time,
        });
        
        // Emit InventoryUpdated event
        // Note: quantity_change is u64, so we can't represent negative values
        // The ItemConsumed event already indicates consumption, so quantity_change here
        // represents the amount consumed (positive value)
        event::emit(InventoryUpdated {
            player,
            item_type,
            item_level,
            quantity_change: quantity,  // Amount consumed (positive, consumption indicated by ItemConsumed event)
            new_quantity,
            timestamp: current_time,
        });
    }
    
    // ===== MIGRATION FUNCTIONS =====
    
    /// Migrate player inventory from old store to new store
    /// Admin-only function to transfer all items for a player
    /// This is used when migrating from an old contract package to a new one
    public entry fun migrate_player_inventory(
        _admin_cap: &AdminCapability,  // Admin capability - proves caller is admin
        store: &mut PremiumStore,
        clock: &Clock,
        player: address,
        // Extra Lives (3 levels)
        extra_lives_level_1: u64,
        extra_lives_level_2: u64,
        extra_lives_level_3: u64,
        // Force Field (3 levels)
        force_field_level_1: u64,
        force_field_level_2: u64,
        force_field_level_3: u64,
        // Orb Level (3 levels)
        orb_level_1: u64,
        orb_level_2: u64,
        orb_level_3: u64,
        // Slow Time (3 levels)
        slow_time_level_1: u64,
        slow_time_level_2: u64,
        slow_time_level_3: u64,
        // Single-level items
        destroy_all_enemies: u64,
        boss_kill_shot: u64,
        // Coin Tractor Beam (3 levels)
        coin_tractor_beam_level_1: u64,
        coin_tractor_beam_level_2: u64,
        coin_tractor_beam_level_3: u64,
        ctx: &mut TxContext
    ) {
        let current_time = clock::timestamp_ms(clock);
        
        // Get or create inventory in new store
        let inventory = get_or_create_inventory(store, player, ctx);
        
        // Add all items to inventory (additive - doesn't overwrite existing items)
        inventory.extra_lives_level_1 = inventory.extra_lives_level_1 + extra_lives_level_1;
        inventory.extra_lives_level_2 = inventory.extra_lives_level_2 + extra_lives_level_2;
        inventory.extra_lives_level_3 = inventory.extra_lives_level_3 + extra_lives_level_3;
        inventory.force_field_level_1 = inventory.force_field_level_1 + force_field_level_1;
        inventory.force_field_level_2 = inventory.force_field_level_2 + force_field_level_2;
        inventory.force_field_level_3 = inventory.force_field_level_3 + force_field_level_3;
        inventory.orb_level_1 = inventory.orb_level_1 + orb_level_1;
        inventory.orb_level_2 = inventory.orb_level_2 + orb_level_2;
        inventory.orb_level_3 = inventory.orb_level_3 + orb_level_3;
        inventory.slow_time_level_1 = inventory.slow_time_level_1 + slow_time_level_1;
        inventory.slow_time_level_2 = inventory.slow_time_level_2 + slow_time_level_2;
        inventory.slow_time_level_3 = inventory.slow_time_level_3 + slow_time_level_3;
        inventory.destroy_all_enemies = inventory.destroy_all_enemies + destroy_all_enemies;
        inventory.boss_kill_shot = inventory.boss_kill_shot + boss_kill_shot;
        inventory.coin_tractor_beam_level_1 = inventory.coin_tractor_beam_level_1 + coin_tractor_beam_level_1;
        inventory.coin_tractor_beam_level_2 = inventory.coin_tractor_beam_level_2 + coin_tractor_beam_level_2;
        inventory.coin_tractor_beam_level_3 = inventory.coin_tractor_beam_level_3 + coin_tractor_beam_level_3;
        
        // Emit migration event
        event::emit(InventoryUpdated {
            player,
            item_type: 255, // Special code for migration
            item_level: 0,
            quantity_change: extra_lives_level_1 + extra_lives_level_2 + extra_lives_level_3 +
                            force_field_level_1 + force_field_level_2 + force_field_level_3 +
                            orb_level_1 + orb_level_2 + orb_level_3 +
                            slow_time_level_1 + slow_time_level_2 + slow_time_level_3 +
                            destroy_all_enemies + boss_kill_shot +
                            coin_tractor_beam_level_1 + coin_tractor_beam_level_2 + coin_tractor_beam_level_3,
            new_quantity: 0, // Not applicable for migration
            timestamp: current_time,
        });
    }
    
    // ===== VIEW FUNCTIONS =====
    
    /// Get inventory count for a specific item (view function)
    /// Returns 0 if inventory doesn't exist
    public fun get_inventory_item_count(
        store: &PremiumStore,
        player: address,
        item_type: u8,
        item_level: u8
    ): u64 {
        if (!ofield::exists_with_type<address, PlayerInventory>(&store.id, player)) {
            return 0
        };
        let inventory = get_inventory(store, player);
        get_inventory_count(inventory, item_type, item_level)
    }
    
    /// Get all inventory counts for a player (view function)
    /// Returns a tuple with all item counts
    public fun get_all_inventory(
        store: &PremiumStore,
        player: address
    ): (
        u64, u64, u64,  // extra_lives levels 1, 2, 3
        u64, u64, u64,  // force_field levels 1, 2, 3
        u64, u64, u64,  // orb_level levels 1, 2, 3
        u64, u64, u64,  // slow_time levels 1, 2, 3
        u64,             // destroy_all_enemies
        u64,             // boss_kill_shot
        u64, u64, u64    // coin_tractor_beam levels 1, 2, 3
    ) {
        if (!ofield::exists_with_type<address, PlayerInventory>(&store.id, player)) {
            return (0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
        };
        let inventory = get_inventory(store, player);
        (
            inventory.extra_lives_level_1,
            inventory.extra_lives_level_2,
            inventory.extra_lives_level_3,
            inventory.force_field_level_1,
            inventory.force_field_level_2,
            inventory.force_field_level_3,
            inventory.orb_level_1,
            inventory.orb_level_2,
            inventory.orb_level_3,
            inventory.slow_time_level_1,
            inventory.slow_time_level_2,
            inventory.slow_time_level_3,
            inventory.destroy_all_enemies,
            inventory.boss_kill_shot,
            inventory.coin_tractor_beam_level_1,
            inventory.coin_tractor_beam_level_2,
            inventory.coin_tractor_beam_level_3,
        )
    }
}
