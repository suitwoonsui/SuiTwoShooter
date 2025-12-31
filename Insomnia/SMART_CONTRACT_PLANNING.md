# Insomnia Game - Smart Contract Planning Document (Launch-Focused)

## Project Overview
**Game**: Insomnia - Web3 Endurance Clicker Game  
**Blockchain**: Sui  
**Contract Language**: Move  
**Development Phase**: Smart Contract Architecture & Planning  
**Strategy**: Launch-First, Iterate Later  

## Smart Contract Architecture Overview

### Core Contract Structure (Launch Version)
```
InsomniaGame/
├── GameCore.sui          # Main game logic and session management
├── ScoreSystem.sui       # Score storage and skill-based leaderboards
├── TokenSystem.sui       # Simple reward distribution (no complex economics)
├── ChallengeSystem.sui   # Basic skill-based challenges (no staking)
└── AdminSystem.sui       # Basic parameter management
```

### Contract Relationships (Simplified)
```
GameCore.sui ←→ ScoreSystem.sui    # Score submission and skill tier calculation
GameCore.sui ←→ TokenSystem.sui    # Simple reward distribution
GameCore.sui ←→ ChallengeSystem.sui # Challenge validation and completion
AdminSystem.sui ←→ All Contracts   # Basic parameter updates
```

## 1. GameCore.sui - Main Game Contract

### Purpose
Manages game sessions, validates gameplay, and integrates with anti-cheat measures.

### Key Data Structures
```move
struct GameSession has store {
    id: ID,
    player: address,
    start_time: u64,
    end_time: u64,
    final_score: u64,
    speed_level_reached: u8,
    network: String,
    status: GameStatus,
    // Anti-cheat fields
    min_session_duration: u64,        // Minimum 10 seconds
    max_score_per_second: u64,        // Maximum 5 clicks per second
    captcha_verified: bool            // CAPTCHA verification passed
}

struct GameStats has store {
    total_games_played: u64,
    total_blocks_clicked: u64,
    average_score: u64,
    highest_speed_level: u8,
    last_updated: u64
}

enum GameStatus {
    Active,
    Completed,
    Failed
}
```

### Core Functions
```move
// Start a new game session (free to play)
public entry fun start_game(
    ctx: &mut TxContext
) {
    // Verify CAPTCHA completion
    // Create new game session
    // Emit game started event
}

// Submit final game score
public entry fun submit_score(
    ctx: &mut TxContext,
    session_id: ID,
    final_score: u64,
    speed_level: u8
) {
    // Validate session ownership and anti-cheat measures
    // Calculate and distribute rewards
    // Update player statistics and skill tier
    // Emit score submitted event
}

// Validate game session for anti-cheat
fun validate_game_session(
    session: &GameSession,
    final_score: u64
): bool {
    let duration = session.end_time - session.start_time;
    let score_rate = final_score / duration;
    
    // Basic anti-cheat validation
    duration >= 10_000 &&                    // At least 10 seconds
    score_rate <= 5 &&                       // Max 5 clicks per second
    session.captcha_verified                 // CAPTCHA verification passed
}
```

### Game Mechanics Integration
- **Session Management**: Tracks active games and prevents multiple simultaneous sessions
- **Anti-Cheat Validation**: Basic session duration and click rate validation
- **CAPTCHA Integration**: Human verification required before game start
- **Performance Tracking**: Monitors speed progression and difficulty levels

## 2. ScoreSystem.sui - Score Storage & Skill-Based Leaderboards

### Purpose
Manages score persistence, skill tier calculation, and leaderboards by skill level.

### Key Data Structures
```move
struct PlayerStats has store {
    player: address,
    personal_best: u64,
    total_games: u64,
    average_score: u64,
    highest_speed_level: u8,
    current_skill_tier: SkillTier,
    last_played: u64,
    skill_tier_history: vector<SkillTierChange>
}

struct SkillTierChange has store {
    old_tier: SkillTier,
    new_tier: SkillTier,
    changed_at: u64,
    reason: String
}

enum SkillTier {
    Beginner,      // 0-30s speed, avg score < 50
    Intermediate,  // 30-60s speed, avg score 50-100
    Advanced,      // 60-90s speed, avg score 100-200
    Expert         // 90s+ speed, avg score 200+
}

struct LeaderboardEntry has store {
    player: address,
    score: u64,
    speed_level: u8,
    skill_tier: SkillTier,
    timestamp: u64,
    network: String
}
```

### Core Functions
```move
// Calculate player's skill tier based on performance
public fun calculate_skill_tier(
    avg_score: u64,
    highest_speed: u8
): SkillTier {
    if (highest_speed >= 90 && avg_score >= 200) {
        SkillTier::Expert
    } else if (highest_speed >= 60 && avg_score >= 100) {
        SkillTier::Advanced
    } else if (highest_speed >= 30 && avg_score >= 50) {
        SkillTier::Intermediate
    } else {
        SkillTier::Beginner
    }
}

// Update player statistics and skill tier
public entry fun update_player_stats(
    ctx: &mut TxContext,
    player: address,
    new_score: u64,
    new_speed_level: u8
) {
    // Update average score (weighted by total games)
    // Update highest speed level if improved
    // Recalculate skill tier
    // Record skill tier changes
    // Update leaderboards
}

// Get leaderboard for specific skill tier
public fun get_tier_leaderboard(
    tier: SkillTier,
    limit: u64
): vector<LeaderboardEntry> {
    // Return top scores for specific skill tier
}
```

### Skill Tier Features
- **Dynamic Calculation**: Skill tiers update based on recent performance
- **Speed + Score Based**: Combines both metrics for accurate tier placement
- **Historical Tracking**: Records skill progression over time
- **Separate Leaderboards**: Each skill tier has its own competitive rankings

## 3. TokenSystem.sui - Sustainable Reward Distribution

### Purpose
Manages milestone-based token rewards with performance bonuses and engagement incentives.

### Key Data Structures
```move
struct GameToken has drop {}
struct TokenBalance has store {
    balance: Balance<GameToken>,
    last_updated: u64
}

struct RewardSchedule has store {
    // Milestone-based rewards (sustainable economics)
    game_thresholds: vector<GameThreshold>,    // Reward at specific game milestones
    speed_level_bonuses: vector<u64>,          // Performance bonuses for every milestone
    daily_play_bonus: u64,                     // Daily engagement bonus
    weekly_streak_bonus: u64                   // Weekly consistency bonus
}

struct GameThreshold has store {
    games_played: u64,                         // Games needed to unlock
    reward_amount: u64,                        // Base tokens awarded
    unlocked: bool                             // Has this been claimed?
}

struct DailyPlayTracker has store {
    player: address,
    games_played_today: u64,
    last_played_date: u64,
    weekly_streak: u64,
    last_week_played: u64
}

struct MilestoneTracker has store {
    player: address,
    total_games_played: u64,
    last_milestone_checked: u64,
    unlocked_milestones: vector<u64>,          // List of unlocked milestone game counts
    claimed_milestones: vector<u64>            // List of claimed milestone game counts
}
```

### Core Functions
```move
// Check and award milestone rewards
public entry fun check_milestone_rewards(
    ctx: &mut TxContext,
    player: address,
    total_games: u64
) {
    // Check if player has reached any new milestones
    let new_milestones = get_new_milestones(player, total_games);
    
    for each milestone in new_milestones {
        // Calculate base milestone reward
        let base_reward = milestone.reward_amount;
        
        // Add speed level bonus (applies to every milestone)
        let speed_bonus = calculate_speed_level_bonus(player);
        
        // Add daily/weekly engagement bonuses
        let daily_bonus = calculate_daily_bonus(player);
        let weekly_bonus = calculate_weekly_bonus(player);
        
        // Distribute total reward
        let total_reward = base_reward + speed_bonus + daily_bonus + weekly_bonus;
        transfer_tokens(player, total_reward);
        
        // Mark milestone as unlocked and claimed
        unlock_milestone(player, milestone.games_played);
        claim_milestone(player, milestone.games_played);
        
        // Emit milestone unlocked event
        emit_milestone_unlocked(player, milestone.games_played, total_reward);
    }
}

// Calculate speed level bonus (applies to every milestone)
fun calculate_speed_level_bonus(player: address): u64 {
    let player_stats = get_player_stats(player);
    let highest_speed = player_stats.highest_speed_level;
    
    if (highest_speed >= 90) { 75 }   // Expert speed bonus
    else if (highest_speed >= 60) { 50 }  // Advanced speed bonus
    else if (highest_speed >= 30) { 25 }  // Intermediate speed bonus
    else { 0 }                        // Beginner speed bonus
}

// Get new milestones based on total games played
fun get_new_milestones(
    player: address, 
    total_games: u64
): vector<GameThreshold> {
    let milestones = vector[
        GameThreshold { games_played: 10, reward_amount: 50, unlocked: false },
        GameThreshold { games_played: 25, reward_amount: 100, unlocked: false },
        GameThreshold { games_played: 50, reward_amount: 200, unlocked: false },
        GameThreshold { games_played: 100, reward_amount: 500, unlocked: false },
        GameThreshold { games_played: 200, reward_amount: 1000, unlocked: false },
        GameThreshold { games_played: 500, reward_amount: 2500, unlocked: false },
        GameThreshold { games_played: 1000, reward_amount: 5000, unlocked: false },
        GameThreshold { games_played: 2000, reward_amount: 10000, unlocked: false },
        GameThreshold { games_played: 5000, reward_amount: 25000, unlocked: false },
        GameThreshold { games_played: 10000, reward_amount: 50000, unlocked: false }
    ];
    
    // Return only milestones that player hasn't unlocked yet
    // and that they've reached the required game count for
    filter_unlocked_milestones(milestones, player, total_games)
}

// Calculate daily play bonus
fun calculate_daily_bonus(player: address): u64 {
    let daily_tracker = get_daily_play_tracker(player);
    
    if (daily_tracker.games_played_today >= 10) { 100 }      // 10+ games today
    else if (daily_tracker.games_played_today >= 5) { 50 }   // 5+ games today
    else if (daily_tracker.games_played_today >= 3) { 25 }   // 3+ games today
    else { 0 }                                               // No daily bonus
}

// Calculate weekly streak bonus
fun calculate_weekly_bonus(player: address): u64 {
    let daily_tracker = get_daily_play_tracker(player);
    
    if (daily_tracker.weekly_streak >= 7) { 500 }    // 7+ days in a row
    else if (daily_tracker.weekly_streak >= 5) { 250 }   // 5+ days in a row
    else if (daily_tracker.weekly_streak >= 3) { 100 }   // 3+ days in a row
    else { 0 }                                           // No weekly bonus
}

// Update daily play tracking
fun update_daily_play_tracker(player: address) {
    let tracker = get_daily_play_tracker(player);
    let current_date = get_current_date();
    
    if (tracker.last_played_date == current_date) {
        // Same day - increment games played
        tracker.games_played_today = tracker.games_played_today + 1;
    } else if (tracker.last_played_date == current_date - 1) {
        // Consecutive day - increment weekly streak
        tracker.weekly_streak = tracker.weekly_streak + 1;
        tracker.games_played_today = 1;
    } else {
        // Gap in days - reset weekly streak
        tracker.weekly_streak = 1;
        tracker.games_played_today = 1;
    }
    
    tracker.last_played_date = current_date;
}
```

### Reward Features (Sustainable Launch Version)
- **Milestone Rewards**: Tokens awarded at specific game counts (10, 25, 50, 100, 200, 500, 1000, 2000, 5000, 10000)
- **Speed Level Bonuses**: Performance bonuses applied to every milestone
- **Daily Engagement**: Bonus for playing multiple times per day (3+, 5+, 10+ games)
- **Weekly Streaks**: Bonus for consistent daily play (3+, 5+, 7+ days)
- **Sustainable Economics**: No automatic rewards for individual games

### Example Player Journey with Extended Milestones
- **Games 1-9**: No tokens (learning phase)
- **Game 10**: 50 tokens + speed bonus + daily/weekly bonuses
- **Game 25**: 100 tokens + speed bonus + daily/weekly bonuses
- **Game 50**: 200 tokens + speed bonus + daily/weekly bonuses
- **Game 100**: 500 tokens + speed bonus + daily/weekly bonuses
- **Game 200**: 1000 tokens + speed bonus + daily/weekly bonuses
- **Game 500**: 2500 tokens + speed bonus + daily/weekly bonuses
- **Game 1000**: 5000 tokens + speed bonus + daily/weekly bonuses
- **Game 2000**: 10000 tokens + speed bonus + daily/weekly bonuses
- **Game 5000**: 25000 tokens + speed bonus + daily/weekly bonuses
- **Game 10000**: 50000 tokens + speed bonus + daily/weekly bonuses

### Economic Benefits
- **Sustainability**: Tokens earned through long-term engagement, not individual games
- **Anti-Farming**: Players must invest time to earn meaningful rewards
- **Performance Recognition**: Speed level bonuses reward skill improvement
- **Engagement Incentives**: Daily/weekly bonuses encourage consistent play
- **Scalable Rewards**: Higher milestones provide substantial rewards for dedicated players

## 4. ChallengeSystem.sui - Basic Skill-Based Challenges

### Purpose
Manages simple challenges based on skill tiers without staking complexity.

### Key Data Structures
```move
struct Challenge has store {
    id: ID,
    challenger: address,
    target_score: u64,              // Score to beat
    skill_tier: SkillTier,          // Skill tier for the challenge
    time_limit: u64,                // 24 hours to complete
    reward_amount: u64,             // Fixed reward for completion
    status: ChallengeStatus,
    created_at: u64
}

struct ChallengeResult has store {
    challenge_id: ID,
    player: address,
    final_score: u64,
    completion_time: u64,
    reward_amount: u64
}

enum ChallengeStatus {
    Active,      // Available for completion
    Completed,   // Successfully completed
    Expired      // Time limit exceeded
}
```

### Core Functions
```move
// Create a new challenge in a specific skill tier
public entry fun create_challenge(
    ctx: &mut TxContext,
    target_score: u64,
    skill_tier: SkillTier
) {
    // Validate challenge parameters
    // Create challenge record
    // Emit challenge created event
}

// Complete a challenge
public entry fun complete_challenge(
    ctx: &mut TxContext,
    challenge_id: ID,
    final_score: u64
) {
    // Validate challenge completion
    // Verify player meets skill tier requirements
    // Distribute fixed reward
    // Update challenge status
    // Emit challenge completed event
}

// Get available challenges for a skill tier
public fun get_tier_challenges(
    tier: SkillTier,
    limit: u64
): vector<Challenge> {
    // Return active challenges for specific skill tier
}
```

### Challenge Features (Launch Version)
- **Skill-Based Matching**: Challenges are tier-specific
- **Fixed Rewards**: Simple, predictable reward amounts
- **No Staking**: Keep it simple for launch
- **Time-Limited**: 24-hour completion windows
- **Score-Based**: Beat target scores in your skill tier

## 5. AdminSystem.sui - Basic Administrative Functions

### Purpose
Manages simple game parameters and basic administrative operations.

### Key Data Structures
```move
struct GameParameters has store {
    base_reward_amount: u64,         // Base tokens per game
    score_bonus_multiplier: u64,     // Score bonus multiplier
    speed_level_bonuses: vector<u64>, // Fixed speed level bonuses
    daily_play_bonus: u64,           // Daily engagement bonus
    weekly_streak_bonus: u64,        // Weekly streak bonus
    challenge_reward_amount: u64,    // Fixed challenge reward
    last_updated: u64
}

struct AdminCapability has key {
    id: ID
}
```

### Core Functions
```move
// Update basic game parameters
public entry fun update_game_parameters(
    _admin: &AdminCapability,
    ctx: &mut TxContext,
    new_params: GameParameters
) {
    // Validate admin authority
    // Update game parameters
    // Emit parameters updated event
}

// Emergency pause functionality
public entry fun pause_game(
    _admin: &AdminCapability,
    ctx: &mut TxContext
) {
    // Pause all game operations
    // Emit game paused event
}
```

## Game Integration Points

### Frontend Integration (Simplified)
```typescript
// Example integration in your React components
const { submitGameScore, startNewGame, checkMilestoneRewards, getTierLeaderboard } = useGameContract();

// Start a new game (free, with CAPTCHA)
const handleStartGame = async () => {
  try {
    // Show CAPTCHA first
    const captchaVerified = await verifyCaptcha();
    if (captchaVerified) {
      await startNewGame();
      // Game logic starts
    }
  } catch (error) {
    console.error('Failed to start game:', error);
  }
};

// Submit final score and check for milestone rewards
const handleGameOver = async (finalScore: number, speedLevel: number) => {
  try {
    // Submit the game score
    await submitGameScore(finalScore, speedLevel);
    
    // Check if player has reached any new milestones
    const totalGames = await getPlayerTotalGames();
    await checkMilestoneRewards(totalGames);
    
    // Update UI with results and any milestone rewards earned
    await updateGameResults();
  } catch (error) {
    console.error('Failed to submit score:', error);
  }
};

// Check for milestone rewards (can be called separately)
const checkForMilestones = async () => {
  try {
    const totalGames = await getPlayerTotalGames();
    const result = await checkMilestoneRewards(totalGames);
    
    if (result.milestonesUnlocked > 0) {
      // Show milestone celebration UI
      showMilestoneCelebration(result.rewards);
    }
  } catch (error) {
    console.error('Failed to check milestones:', error);
  }
};
```

### Contract Events (Simplified)
```move
// Events for frontend integration
struct GameStarted has copy, drop {
    player: address,
    session_id: ID,
    timestamp: u64
}

struct ScoreSubmitted has copy, drop {
    player: address,
    score: u64,
    speed_level: u8,
    skill_tier: SkillTier,
    timestamp: u64
}

struct MilestoneUnlocked has copy, drop {
    player: address,
    games_played: u64,
    base_reward: u64,
    speed_bonus: u64,
    daily_bonus: u64,
    weekly_bonus: u64,
    total_reward: u64,
    timestamp: u64
}

struct DailyBonusEarned has copy, drop {
    player: address,
    games_played_today: u64,
    bonus_amount: u64,
    timestamp: u64
}

struct WeeklyStreakBonusEarned has copy, drop {
    player: address,
    streak_days: u64,
    bonus_amount: u64,
    timestamp: u64
}
```

## Implementation Roadmap (Launch-Focused)

### Phase 1: Core Game Loop (Week 1)
- [ ] Deploy GameCore.sui with basic session management and CAPTCHA integration
- [ ] Implement ScoreSystem.sui with skill tier calculation
- [ ] Basic integration testing with frontend

### Phase 2: Simple Rewards (Week 2)
- [ ] Deploy TokenSystem.sui with fixed reward amounts
- [ ] Implement basic reward distribution logic
- [ ] Test reward calculations and token flow

### Phase 3: Basic Challenges (Week 3)
- [ ] Deploy ChallengeSystem.sui with skill-based challenges
- [ ] Implement tier-specific challenge creation and completion
- [ ] Test challenge system with different skill tiers

### Phase 4: Polish & Admin (Week 4)
- [ ] Deploy AdminSystem.sui with basic parameter management
- [ ] Implement emergency pause functionality
- [ ] Comprehensive testing and optimization

## CAPTCHA Implementation

### Recommended Solution: reCAPTCHA v3
For optimal user experience and security, we recommend implementing **Google reCAPTCHA v3**:

#### Benefits
- **Invisible**: No user interaction required, seamless experience
- **Score-Based**: Provides confidence score (0.0 to 1.0) for risk assessment
- **Widely Supported**: Google's solution, very reliable and maintained
- **Easy Integration**: Simple React component integration
- **Mobile Friendly**: Works well across all devices

#### Implementation
```typescript
// Example reCAPTCHA v3 integration
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';

const { executeRecaptcha } = useGoogleReCaptcha();

const verifyCaptcha = async (): Promise<boolean> => {
  try {
    const token = await executeRecaptcha('start_game');
    const response = await fetch('/api/verify-captcha', {
      method: 'POST',
      body: JSON.stringify({ token })
    });
    
    const result = await response.json();
    return result.success && result.score > 0.5; // Accept scores above 0.5
  } catch (error) {
    console.error('CAPTCHA verification failed:', error);
    return false;
  }
};
```

#### Security Thresholds
- **Score 0.9+**: Very likely human, allow immediate game start
- **Score 0.7-0.9**: Likely human, allow game start
- **Score 0.5-0.7**: Possibly human, allow with monitoring
- **Score <0.5**: Likely bot, require additional verification

## Security Considerations (Launch Version)

### Anti-Cheat Measures (Simplified)
- **Session Validation**: Minimum game duration (10 seconds)
- **Click Rate Limits**: Maximum 5 clicks per second
- **CAPTCHA Verification**: Human verification required before game start
- **Session Integrity**: Prevent multiple simultaneous sessions per player
- **Milestone Validation**: Verify milestone progression is legitimate

### Economic Security (Sustainable)
- **Milestone-Based Rewards**: Tokens earned through engagement, not individual games
- **Performance Validation**: Speed level bonuses require legitimate skill progression
- **Anti-Farming**: Daily/weekly bonuses have reasonable limits
- **Rate Limiting**: Prevent excessive milestone checking and reward manipulation
- **Session Tracking**: Monitor for suspicious game patterns

### Contract Security (Launch Focus)
- **Access Control**: Basic admin capability management
- **Input Validation**: Comprehensive parameter validation
- **Emergency Pause**: Ability to pause operations if issues arise
- **Simple Logic**: Minimize attack surface with simple contract logic
- **Milestone Protection**: Secure milestone unlocking and claiming mechanisms

## Testing Strategy (Launch Version)

### Unit Testing
- **Contract Functions**: Test all public and entry functions
- **Anti-Cheat Logic**: Test session validation and CAPTCHA integration
- **Skill Tier Calculation**: Test tier assignment and updates
- **Reward Distribution**: Test reward calculations and token transfers

### Integration Testing
- **Game Flow**: Test complete game → score → reward flow
- **Frontend Integration**: Verify contract calls from React components
- **CAPTCHA Integration**: Test human verification flow
- **Skill Tier Updates**: Test tier progression and leaderboard updates

### Economic Testing
- **Reward Calculations**: Verify fixed reward amounts
- **Token Distribution**: Test token flow and balance updates
- **Daily/Weekly Bonuses**: Test engagement reward systems

## Deployment Strategy (Launch Version)

### Testnet Deployment (Week 1-2)
- **Initial Testing**: Deploy core contracts to Sui Testnet
- **User Testing**: Test with real users and collect feedback
- **Economic Validation**: Verify reward systems work correctly
- **Performance Testing**: Test under load and optimize

### Mainnet Deployment (Week 3-4)
- **Security Review**: Basic security audit of simplified contracts
- **Gradual Rollout**: Start with limited user base
- **Monitoring**: Active monitoring of contract operations
- **Emergency Procedures**: Plan for potential issues

## Success Metrics (Launch Version)

### Technical Metrics
- **Contract Performance**: Gas efficiency and execution speed
- **CAPTCHA Success Rate**: Human verification completion rate
- **Error Rates**: Contract call failures and exceptions
- **Uptime**: Contract availability and reliability

### Economic Metrics
- **Milestone Achievement Rate**: Percentage of players reaching key milestones
- **Token Distribution Efficiency**: Fair and sustainable reward distribution
- **Player Retention**: Long-term engagement through milestone progression
- **Economic Sustainability**: Token supply vs. demand balance
- **Anti-Farming Success**: Prevention of reward manipulation

### User Experience Metrics
- **Game Completion Rate**: Successful game starts and score submissions
- **CAPTCHA Experience**: User feedback on verification process
- **Milestone Satisfaction**: User satisfaction with milestone rewards
- **Engagement Patterns**: Daily/weekly play consistency
- **Skill Progression**: Player advancement through skill tiers
- **Challenge Participation**: Engagement with skill-based challenges

### Milestone-Specific Metrics
- **Early Milestone Completion**: Players reaching 10, 25, 50 games
- **Mid-Game Engagement**: Players reaching 100, 200, 500 games
- **Long-term Retention**: Players reaching 1000+ games
- **Speed Level Distribution**: Balance of players across difficulty tiers
- **Daily/Weekly Bonus Claims**: Engagement with consistency rewards

## Future Enhancements (Post-Launch)

### Phase 2: Advanced Features
- **Complex Token Economics**: Staking, deflationary mechanics, token burning
- **Advanced Anti-Cheat**: Behavioral analysis, machine learning detection
- **Stake-Based Challenges**: Competitive betting and higher stakes
- **NFT Integration**: Collectibles, achievements, and unique items

### Phase 3: Community Features
- **Community Rewards**: Pool-based reward distribution
- **Tournament System**: Organized competitive events
- **Social Features**: Friend challenges and team competitions
- **Advanced Analytics**: Detailed performance tracking and insights

---

*This document outlines the simplified, launch-focused smart contract architecture for the Insomnia Game. The contracts prioritize simplicity, security, and user experience while providing a solid foundation for future enhancements. The goal is to get the game launched quickly with robust blockchain functionality that can be expanded over time.*
