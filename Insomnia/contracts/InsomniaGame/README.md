# Insomnia Game Smart Contracts

Smart contracts for the Insomnia game on the Sui blockchain, designed to track player progression, skill tiers, and game statistics.

## 🎮 Game Mechanics Integration

### **Endurance Level System (Time-Based Progression)**
The smart contracts are designed to work with the frontend's time-based endurance progression:

- **Beginner (0)**: 0-30 seconds of play
- **Intermediate (1)**: 30-60 seconds of play  
- **Advanced (2)**: 60-90 seconds of play
- **Expert (3)**: 90-120 seconds of play
- **Master (4)**: 120+ seconds of play

### **Scoring System**
- **1 point per successful block click**
- **Score increases with endurance (longer play = higher score)**
- **Anti-cheat: Maximum 3 clicks per second (realistic human limit)**

### **Skill Tier Calculation**
Skill tiers are calculated based on:
- **Time endurance** (highest endurance level reached)
- **Average performance** (cumulative score across games)
- **Progressive thresholds** that align with frontend display

## 🏗️ Contract Architecture

### GameCore.move
- **Purpose**: Core game logic and session management
- **Key Functions**:
  - `start_game`: Creates a new game session
  - `submit_score`: Submits final score for a completed session
- **Features**:
  - Anti-cheat validation (session duration, score rate limits)
  - CAPTCHA verification support
  - Game session ownership validation

### ScoreSystem.move
- **Purpose**: Player statistics and skill tier management
- **Key Functions**:
  - `create_player_stats`: Creates new player statistics
  - `update_player_stats`: Updates player performance data
- **Features**:
  - Skill tier calculation (Beginner, Intermediate, Advanced, Expert)
  - Performance tracking (personal best, average score, total games)
  - Event emission for tier changes

### AdminSystem.move
- **Purpose**: Game parameter management and administrative controls
- **Key Functions**:
  - `update_game_parameters`: Updates game configuration
  - `get_game_parameters`: Retrieves current game settings
- **Features**:
  - Configurable reward amounts and multipliers
  - Admin-only parameter updates
  - Event logging for parameter changes

## Deployment

### Prerequisites
- ✅ Sui CLI installed and configured
- ✅ Connected to Sui testnet
- ✅ Testnet coins for deployment (get from Discord faucet)

### Build
```bash
sui move build
```

### Deploy
```bash
sui client publish --gas-budget 10000000
```

### Initialize
After deployment, the contracts need to be initialized:
1. Deploy the package
2. Call the `init` function for each module to set up the initial state
3. Your address (`0xdb6293a83c8880c7134ccaa381cf3168fb81375631940c406fc12987314faf02`) becomes the admin for admin functions

## Usage Examples

### Starting a Game
```move
// Call start_game with a Clock object
start_game(clock, ctx)
```

### Submitting a Score
```move
// Call submit_score with a GameSession object
submit_score(session, final_score, speed_level, clock, ctx)
```

### Updating Game Parameters (Admin Only)
```move
// Call update_game_parameters with new values
update_game_parameters(
    admin_system,
    new_base_reward,
    new_score_multiplier,
    new_daily_bonus,
    new_weekly_bonus,
    new_challenge_reward,
    ctx
)
```

## Security Features

- **Ownership Validation**: Only session owners can submit scores
- **Anti-Cheat**: Basic validation of session duration and score rates
- **Admin Controls**: Restricted access to administrative functions
- **Event Logging**: All major actions emit events for transparency

## Network Support

The contracts are currently configured for Sui testnet deployment. Your address `0xdb6293a83c8880c7134ccaa381cf3168fb81375631940c406fc12987314faf02` is set as the admin for all administrative functions.

## Development Notes

- Built for Move 2024 edition
- Uses Sui-specific object model with UID and key abilities
- Implements basic anti-cheat measures
- Designed for extensibility (additional modules can be added)

## Getting Testnet Coins

Since the CLI faucet is rate-limited, use one of these methods:

### Option A: Sui Discord Faucet (Recommended)
1. Join [Sui Discord](https://discord.gg/sui)
2. Go to `#testnet-faucet` channel
3. Request coins with your address: `0xdb6293a83c8880c7134ccaa381cf3168fb81375631940c406fc12987314faf02`

### Option B: Web Faucet
1. Visit [Sui Testnet Faucet](https://suiexplorer.com/faucet?network=testnet)
2. Connect your wallet or paste your address
3. Request testnet coins

## Future Enhancements

- Token rewards system
- Challenge system
- Advanced anti-cheat mechanisms
- Cross-chain compatibility
- Tournament support

## Quick Start

1. **Get testnet coins** from Discord or web faucet
2. **Deploy contracts**: `sui client publish --gas-budget 10000000`
3. **Initialize systems** using the `init` functions
4. **Test basic functions** like starting games and updating parameters
5. **Integrate with your React frontend**

## Your Configuration
- **Address**: `0xdb6293a83c8880c7134ccaa381cf3168fb81375631940c406fc12987314faf02`
- **Network**: Sui Testnet
- **Client Version**: 1.39.1
- **Server Version**: 1.54.0 (API version mismatch warning is normal)

For detailed deployment steps, see [deploy.md](./deploy.md).
