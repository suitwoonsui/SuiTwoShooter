module insomnia_game::game_core {
    use sui::clock::{Self, Clock};
    use sui::event;
    use insomnia_game::score_system::{Self, ScoreSystem};

    // ===== CONSTANTS =====
    const MIN_SESSION_DURATION: u64 = 5_000; // 5 seconds minimum (allows for quick games)
    const MAX_SCORE_PER_SECOND: u64 = 3; // Maximum 3 clicks per second (realistic for human players)
    const GAME_ACTIVE: u8 = 0;
    const GAME_COMPLETED: u8 = 1;

    // ===== STRUCTS =====
    public struct GameSession has key, store {
        id: sui::object::UID,
        player: address,
        start_time: u64,
        end_time: u64,
        final_score: u64,
        endurance_level_reached: u8,
        status: u8,
        min_session_duration: u64,
        max_score_per_second: u64,
        captcha_verified: bool
    }

    public struct GameStarted has copy, drop {
        player: address,
        session_id: sui::object::ID,
        timestamp: u64
    }

    public struct GameCompleted has copy, drop {
        player: address,
        session_id: sui::object::ID,
        final_score: u64,
        endurance_level: u8,
        duration: u64,
        timestamp: u64
    }

    public struct ScoreSubmitted has copy, drop {
        player: address,
        session_id: sui::object::ID,
        score: u64,
        endurance_level: u8,
        timestamp: u64
    }

    // ===== FUNCTIONS =====

    /// Start a new game session (free to play)
    #[allow(lint(self_transfer))]
    public fun start_game(
        clock: &Clock,
        ctx: &mut sui::tx_context::TxContext
    ) {
        let player = sui::tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);

        let session = GameSession {
            id: sui::object::new(ctx),
            player,
            start_time: current_time,
            end_time: 0,
            final_score: 0,
            endurance_level_reached: 0,
            status: GAME_ACTIVE,
            min_session_duration: MIN_SESSION_DURATION,
            max_score_per_second: MAX_SCORE_PER_SECOND,
            captcha_verified: true // For now, assume CAPTCHA is verified
        };

        let session_id = sui::object::id(&session);
        sui::transfer::transfer(session, player);

        event::emit(GameStarted {
            player,
            session_id,
            timestamp: current_time
        });
    }

    /// Submit score for a game session and update player stats
    /// 
    /// Game Mechanics:
    /// - Endurance level represents time elapsed in seconds (0-255)
    /// - Score is 1 point per successful block click
    /// - Endurance increases every 30 seconds: Beginner(0-30s), Intermediate(30-60s), 
    ///   Advanced(60-90s), Expert(90-120s), Master(120s+)
    /// - Anti-cheat: Maximum 3 clicks per second (realistic human limit)
    /// - Security: Only authorized contracts can update scores
    public fun submit_score(
        session: &mut GameSession,
        score_system: &mut ScoreSystem,
        final_score: u64,
        endurance_level: u8,
        clock: &Clock,
        ctx: &mut sui::tx_context::TxContext
    ) {
        let player = sui::tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);
        let contract_address = sui::tx_context::sender(ctx); // Capture contract address first

        // Validate session ownership
        assert!(session.player == player, 0);
        assert!(session.status == GAME_ACTIVE, 1);

        // Validate session duration (minimum 5 seconds for a valid game)
        let session_duration = current_time - session.start_time;
        assert!(session_duration >= session.min_session_duration, 2);

        // Validate score rate (anti-cheat: max 3 clicks per second)
        let max_allowed_score = session.max_score_per_second * (session_duration / 1000);
        assert!(final_score <= max_allowed_score, 3);

        // Validate endurance level (time elapsed in seconds, should be reasonable)
        assert!(endurance_level <= 255, 4); // u8 max value
        assert!((endurance_level as u64) * 1000 <= session_duration, 5); // Endurance can't exceed actual time

        // Update session
        session.end_time = current_time;
        session.final_score = final_score;
        session.endurance_level_reached = endurance_level;
        session.status = GAME_COMPLETED;

        // Update player stats using the integrated function (avoids mutable borrow conflicts)
        score_system::update_player_stats_integrated(
            score_system, 
            player, 
            contract_address,
            final_score,
            endurance_level,
            current_time,
            ctx
        );

        event::emit(GameCompleted {
            player,
            session_id: sui::object::id(session),
            final_score,
            endurance_level,
            duration: session_duration,
            timestamp: current_time
        });

        event::emit(ScoreSubmitted {
            player,
            session_id: sui::object::id(session),
            score: final_score,
            endurance_level,
            timestamp: current_time
        });
    }

    /// Get session duration in milliseconds
    public fun get_session_duration(session: &GameSession): u64 {
        if (session.end_time > 0) {
            session.end_time - session.start_time
        } else {
            0
        }
    }

    /// Check if session is active
    public fun is_session_active(session: &GameSession): bool {
        session.status == GAME_ACTIVE
    }

    /// Get session status
    public fun get_session_status(session: &GameSession): u8 {
        session.status
    }
}
