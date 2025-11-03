module smart_contract_examples::activity_management {
    use sui::clock::{Self, Clock};
    use sui::event;
    use smart_contract_examples::analytics_system::{Self, AnalyticsSystem};

    // ===== CONSTANTS =====
    const MIN_ACTIVITY_DURATION: u64 = 5_000; // 5 seconds minimum
    const MAX_ACTIONS_PER_SECOND: u64 = 3; // Maximum 3 actions per second (rate limiting)
    const ACTIVITY_ACTIVE: u8 = 0;
    const ACTIVITY_COMPLETED: u8 = 1;

    // ===== STRUCTS =====
    public struct UserActivity has key, store {
        id: sui::object::UID,
        user: address,
        start_time: u64,
        end_time: u64,
        final_value: u64,
        category_reached: u8,
        status: u8,
        actions_count: u64,
        max_value_per_second: u64
    }

    // ===== EVENTS =====
    public struct ActivityStarted has copy, drop {
        activity_id: sui::object::ID,
        user: address,
        start_time: u64
    }

    public struct ActivityCompleted has copy, drop {
        activity_id: sui::object::ID,
        user: address,
        final_value: u64,
        category_reached: u8,
        duration: u64
    }

    public struct ValueSubmitted has copy, drop {
        activity_id: sui::object::ID,
        user: address,
        value: u64,
        category: u8,
        actions_count: u64
    }

    // ===== FUNCTIONS =====

    /// Start a new user activity
    public fun start_activity(
        clock: &Clock,
        ctx: &mut sui::tx_context::TxContext
    ): UserActivity {
        let sender = sui::tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);
        
        let activity = UserActivity {
            id: sui::object::new(ctx),
            user: sender,
            start_time: current_time,
            end_time: 0,
            final_value: 0,
            category_reached: 0,
            status: ACTIVITY_ACTIVE,
            actions_count: 0,
            max_value_per_second: MAX_ACTIONS_PER_SECOND
        };

        // Emit activity started event
        event::emit(ActivityStarted {
            activity_id: sui::object::uid_to_inner(&activity.id),
            user: sender,
            start_time: current_time
        });

        activity
    }

    /// Submit a value for the current activity
    public fun submit_value(
        activity: &mut UserActivity,
        analytics_system: &mut AnalyticsSystem,
        value: u64,
        category: u8,
        clock: &Clock,
        ctx: &mut sui::tx_context::TxContext
    ) {
        let sender = sui::tx_context::sender(ctx);
        assert!(activity.user == sender, 0); // Only activity owner can submit
        assert!(activity.status == ACTIVITY_ACTIVE, 1); // Activity must be active

        let current_time = clock::timestamp_ms(clock);
        let activity_duration = current_time - activity.start_time;
        
        // Validate activity duration
        assert!(activity_duration >= MIN_ACTIVITY_DURATION, 2);
        
        // Rate limiting validation
        let max_allowed_value = activity.max_value_per_second * (activity_duration / 1000);
        assert!(value <= max_allowed_value, 3);

        // Update activity
        activity.final_value = value;
        activity.category_reached = category;
        activity.actions_count = activity.actions_count + 1;

        // Emit value submitted event
        event::emit(ValueSubmitted {
            activity_id: sui::object::uid_to_inner(&activity.id),
            user: sender,
            value: value,
            category: category,
            actions_count: activity.actions_count
        });
    }

    /// Complete the activity and update analytics
    public fun complete_activity(
        activity: &mut UserActivity,
        analytics_system: &mut AnalyticsSystem,
        clock: &Clock,
        ctx: &mut sui::tx_context::TxContext
    ) {
        let sender = sui::tx_context::sender(ctx);
        assert!(activity.user == sender, 0); // Only activity owner can complete
        assert!(activity.status == ACTIVITY_ACTIVE, 1); // Activity must be active

        let current_time = clock::timestamp_ms(clock);
        activity.end_time = current_time;
        activity.status = ACTIVITY_COMPLETED;

        let duration = current_time - activity.start_time;

        // Update analytics system
        analytics_system::update_user_analytics(
            analytics_system,
            sender,
            activity.final_value,
            activity.category_reached,
            duration,
            activity.actions_count,
            ctx
        );

        // Emit activity completed event
        event::emit(ActivityCompleted {
            activity_id: sui::object::uid_to_inner(&activity.id),
            user: sender,
            final_value: activity.final_value,
            category_reached: activity.category_reached,
            duration: duration
        });
    }

    /// Get activity information
    public fun get_activity_info(activity: &UserActivity): (address, u64, u64, u8, u8, u64) {
        (
            activity.user,
            activity.start_time,
            activity.end_time,
            activity.final_value,
            activity.category_reached,
            activity.status
        )
    }

    /// Check if activity is active
    public fun is_activity_active(activity: &UserActivity): bool {
        activity.status == ACTIVITY_ACTIVE
    }

    /// Get activity duration
    public fun get_activity_duration(activity: &UserActivity, clock: &Clock): u64 {
        if (activity.status == ACTIVITY_COMPLETED) {
            activity.end_time - activity.start_time
        } else {
            clock::timestamp_ms(clock) - activity.start_time
        }
    }
}
