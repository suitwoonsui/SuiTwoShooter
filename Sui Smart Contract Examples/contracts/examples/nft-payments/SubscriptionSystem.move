module smart_contract_examples::subscription_system {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::table::{Self, Table};
    use sui::event;
    use sui::transfer;

    // Subscription types
    const SUBSCRIPTION_BASIC: u8 = 1;      // 10 uses for 0.1 SUI
    const SUBSCRIPTION_STANDARD: u8 = 2;   // 50 uses for 0.4 SUI
    const SUBSCRIPTION_UNLIMITED: u8 = 3;  // 1 month unlimited for 1 SUI

    // Pricing in MIST (1 SUI = 1,000,000,000 MIST)
    const BASIC_PRICE: u64 = 100_000_000;      // 0.1 SUI
    const STANDARD_PRICE: u64 = 400_000_000;   // 0.4 SUI
    const UNLIMITED_PRICE: u64 = 1_000_000_000; // 1 SUI

    // Subscription durations in milliseconds
    const BASIC_USES: u64 = 10;
    const STANDARD_USES: u64 = 50;
    const UNLIMITED_DURATION: u64 = 30 * 24 * 60 * 60 * 1000; // 30 days

    // ===== STRUCTS =====
    public struct UserSubscription has key, store {
        id: sui::object::UID,
        user: address,
        subscription_type: u8,
        uses_remaining: u64,
        expires_at: u64,
        created_at: u64
    }

    public struct SubscriptionSystem has key {
        id: sui::object::UID,
        active_subscriptions: Table<address, UserSubscription>,
        total_subscriptions_sold: u64,
        total_revenue: u64,
        is_paused: bool,
        admin_cap: AdminCapability
    }

    public struct AdminCapability has key, store {
        id: sui::object::UID
    }

    // ===== EVENTS =====
    public struct SubscriptionPurchased has copy, drop {
        user: address,
        subscription_type: u8,
        price: u64,
        uses: u64,
        expires_at: u64
    }

    public struct SubscriptionUsed has copy, drop {
        user: address,
        subscription_type: u8,
        uses_remaining: u64
    }

    public struct SubscriptionExpired has copy, drop {
        user: address,
        subscription_type: u8
    }

    public struct RevenueUpdated has copy, drop {
        total_revenue: u64,
        admin: address
    }

    // ===== INITIALIZATION =====
    public fun init(ctx: &mut sui::tx_context::TxContext) {
        let admin_cap = AdminCapability {
            id: sui::object::new(ctx)
        };

        let system = SubscriptionSystem {
            id: sui::object::new(ctx),
            active_subscriptions: table::new(ctx),
            total_subscriptions_sold: 0,
            total_revenue: 0,
            is_paused: false,
            admin_cap
        };

        sui::transfer::share_object(system);
        sui::transfer::transfer(admin_cap, sui::tx_context::sender(ctx));
    }

    // ===== PURCHASE FUNCTIONS =====
    public fun purchase_subscription(
        system: &mut SubscriptionSystem,
        subscription_type: u8,
        payment: Coin<SUI>,
        clock: &sui::clock::Clock,
        ctx: &mut sui::tx_context::TxContext
    ) {
        assert!(!system.is_paused, 0);
        assert!(subscription_type >= SUBSCRIPTION_BASIC && subscription_type <= SUBSCRIPTION_UNLIMITED, 1);

        let user = sui::tx_context::sender(ctx);
        let current_time = sui::clock::timestamp_ms(clock);

        // Check if user already has an active subscription
        if (table::contains(&system.active_subscriptions, user)) {
            let existing_subscription = table::borrow(&system.active_subscriptions, user);
            assert!(existing_subscription.expires_at <= current_time, 2); // Subscription must be expired
        };

        // Validate payment amount
        let required_price = get_subscription_price(subscription_type);
        assert!(coin::value(&payment) >= required_price, 3);

        // Calculate subscription details
        let (uses, expires_at) = get_subscription_details(subscription_type, current_time);

        // Create new subscription
        let user_subscription = UserSubscription {
            id: sui::object::new(ctx),
            user,
            subscription_type,
            uses_remaining: uses,
            expires_at,
            created_at: current_time
        };

        // Add subscription to system
        table::add(&mut system.active_subscriptions, user, user_subscription);
        system.total_subscriptions_sold = system.total_subscriptions_sold + 1;
        system.total_revenue = system.total_revenue + required_price;

        // Emit purchase event
        event::emit(SubscriptionPurchased {
            user,
            subscription_type,
            price: required_price,
            uses,
            expires_at
        });

        // Transfer payment to admin (in real implementation, this would go to treasury)
        sui::transfer::transfer(payment, sui::tx_context::sender(ctx));
    }

    // ===== USAGE FUNCTIONS =====
    public fun use_subscription(
        system: &mut SubscriptionSystem,
        user: address,
        clock: &sui::clock::Clock,
        ctx: &mut sui::tx_context::TxContext
    ): bool {
        assert!(!system.is_paused, 0);

        if (!table::contains(&system.active_subscriptions, user)) {
            return false
        };

        let subscription = table::borrow_mut(&mut system.active_subscriptions, user);
        let current_time = sui::clock::timestamp_ms(clock);

        // Check if subscription is expired
        if (current_time > subscription.expires_at) {
            // Remove expired subscription
            let expired_subscription = table::remove(&mut system.active_subscriptions, user);
            sui::transfer::transfer(expired_subscription, user);
            
            event::emit(SubscriptionExpired {
                user,
                subscription_type: subscription.subscription_type
            });
            
            return false
        };

        // Check if subscription has uses remaining
        if (subscription.subscription_type == SUBSCRIPTION_UNLIMITED) {
            // Unlimited subscription - always valid
            event::emit(SubscriptionUsed {
                user,
                subscription_type: subscription.subscription_type,
                uses_remaining: 0 // Unlimited
            });
            return true
        };

        if (subscription.uses_remaining == 0) {
            return false
        };

        // Use one credit
        subscription.uses_remaining = subscription.uses_remaining - 1;

        event::emit(SubscriptionUsed {
            user,
            subscription_type: subscription.subscription_type,
            uses_remaining: subscription.uses_remaining
        });

        // Remove subscription if no uses remaining
        if (subscription.uses_remaining == 0) {
            let empty_subscription = table::remove(&mut system.active_subscriptions, user);
            sui::transfer::transfer(empty_subscription, user);
        };

        true
    }

    // ===== ADMIN FUNCTIONS =====
    public fun pause_system(system: &mut SubscriptionSystem, _admin_cap: &AdminCapability) {
        system.is_paused = true;
    }

    public fun resume_system(system: &mut SubscriptionSystem, _admin_cap: &AdminCapability) {
        system.is_paused = false;
    }

    public fun update_revenue(system: &mut SubscriptionSystem, new_revenue: u64, admin_cap: &AdminCapability) {
        system.total_revenue = new_revenue;
        event::emit(RevenueUpdated {
            total_revenue: new_revenue,
            admin: sui::tx_context::sender(&sui::tx_context::dummy())
        });
    }

    // ===== HELPER FUNCTIONS =====
    fun get_subscription_price(subscription_type: u8): u64 {
        if (subscription_type == SUBSCRIPTION_BASIC) {
            BASIC_PRICE
        } else if (subscription_type == SUBSCRIPTION_STANDARD) {
            STANDARD_PRICE
        } else if (subscription_type == SUBSCRIPTION_UNLIMITED) {
            UNLIMITED_PRICE
        } else {
            0
        }
    }

    fun get_subscription_details(subscription_type: u8, current_time: u64): (u64, u64) {
        if (subscription_type == SUBSCRIPTION_BASIC) {
            (BASIC_USES, current_time + UNLIMITED_DURATION) // 30 days
        } else if (subscription_type == SUBSCRIPTION_STANDARD) {
            (STANDARD_USES, current_time + UNLIMITED_DURATION) // 30 days
        } else if (subscription_type == SUBSCRIPTION_UNLIMITED) {
            (0, current_time + UNLIMITED_DURATION) // 0 means unlimited
        } else {
            (0, current_time)
        }
    }

    // ===== VIEW FUNCTIONS =====
    public fun get_user_subscription(system: &SubscriptionSystem, user: address): Option<&UserSubscription> {
        if (table::contains(&system.active_subscriptions, user)) {
            option::some(table::borrow(&system.active_subscriptions, user))
        } else {
            option::none()
        }
    }

    public fun has_active_subscription(system: &SubscriptionSystem, user: address, clock: &sui::clock::Clock): bool {
        if (!table::contains(&system.active_subscriptions, user)) {
            return false
        };

        let subscription = table::borrow(&system.active_subscriptions, user);
        let current_time = sui::clock::timestamp_ms(clock);

        if (current_time > subscription.expires_at) {
            return false
        };

        if (subscription.subscription_type == SUBSCRIPTION_UNLIMITED) {
            return true
        };

        subscription.uses_remaining > 0
    }

    public fun get_total_subscriptions_sold(system: &SubscriptionSystem): u64 {
        system.total_subscriptions_sold
    }

    public fun get_total_revenue(system: &SubscriptionSystem): u64 {
        system.total_revenue
    }

    public fun is_system_paused(system: &SubscriptionSystem): bool {
        system.is_paused
    }
}
