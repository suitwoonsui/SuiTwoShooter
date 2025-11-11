# SuiTwo Game Smart Contract

This is the Move smart contract for score submission in the SuiTwo shooter game.

## Quick Start

1. **Install Sui CLI** (see [DEPLOYMENT.md](./DEPLOYMENT.md) for details)
2. **Build**: `sui move build`
3. **Deploy**: See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment guide

## Detailed Documentation

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Complete deployment guide including wallet setup, gas requirements, and configuration
- **[STATS_DOCUMENTATION.md](./STATS_DOCUMENTATION.md)** - Game statistics documentation

## Prerequisites

1. **Install Rust** (if not already installed):
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. **Install Sui CLI**:
   ```bash
   cargo install --locked --git https://github.com/MystenLabs/sui.git --branch testnet sui
   ```

3. **Verify installation**:
   ```bash
   sui --version
   ```

## Setup

1. **Navigate to the contract directory**:
   ```bash
   cd contracts/suitwo_game
   ```

2. **Build the contract**:
   ```bash
   sui move build
   ```

3. **Run tests** (if you add tests):
   ```bash
   sui move test
   ```

## Deployment

**See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment instructions.**

**Quick summary:**
1. ✅ **Wallet Required**: You need a Sui wallet with testnet SUI for gas
2. Switch to testnet: `sui client switch --env testnet`
3. Get testnet SUI from faucet
4. Deploy: `sui client publish --gas-budget 10000000`
5. Save the Package ID and update frontend configuration

## Contract Function

### `submit_game_session`

Submit a complete game session with all statistics.

**Parameters:**
- `clock: &Clock` - Clock object for timestamp (use `0x6`)
- `score: u64` - Total game score
- `distance: u64` - Distance traveled
- `coins: u64` - Coins collected
- `bosses_defeated: u64` - Number of bosses defeated
- `enemies_defeated: u64` - Number of enemies defeated
- `longest_coin_streak: u64` - Longest coin streak
- `ctx: &mut TxContext` - Transaction context

**Event Emitted:**
- `ScoreSubmitted` - Contains all game statistics for leaderboard queries

**Validation:**
- Minimum distance: 35 units
- Minimum score: 100 points
- Score must correlate with actions (coins, bosses, distance)
- Coins: Maximum 1000
- Coin streak cannot exceed coins collected

## Error Codes

- `1`: Distance too low (< 35)
- `2`: Invalid score (doesn't match actions)
- `3`: Coin count too high (> 1000)
- `4`: Coin streak exceeds coins collected

## Testing

After deployment, test the contract:

```bash
# Example: Submit a test score
sui client call \
  --package 0x[PACKAGE_ID] \
  --module score_submission \
  --function submit_game_session \
  --args 0x6 5000 10000 50 2 10 5 \
  --gas-budget 10000000
```

**Arguments:**
- `0x6` - Clock object ID (standard Sui Clock)
- `5000` - score
- `10000` - distance
- `50` - coins
- `2` - bosses_defeated
- `10` - enemies_defeated
- `5` - longest_coin_streak

## Next Steps

1. Deploy to testnet (see [DEPLOYMENT.md](./DEPLOYMENT.md))
2. Test score submission
3. Verify `ScoreSubmitted` events are emitted
4. Update frontend configuration with package ID
5. Test end-to-end from game UI

