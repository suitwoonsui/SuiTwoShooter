# Sui SDK Integration

## 📦 Phase 2: Sui SDK Integration (Week 1-2)

This phase covers integrating the Sui SDK into your backend, creating service modules, and building API routes.

---

## Step 2.1: Create Sui Service Module

**Important Transaction Flow:**
1. **Frontend** builds transaction (using wallet adapter)
2. **Frontend** signs and executes transaction (user approves in wallet)
3. **Frontend** sends transaction hash to backend `/api/scores/verify`
4. **Backend** verifies transaction exists and succeeded on-chain
5. **Backend** queries blockchain events for leaderboard/scores

The backend **never signs transactions** - users always sign their own!

### Node.js Example (`backend/src/services/sui-service.js`)

```javascript
const { SuiClient, getFullnodeUrl } = require('@mysten/sui.js/client');
const { TransactionBlock } = require('@mysten/sui.js/transactions');

class SuiService {
  constructor() {
    const network = process.env.SUI_NETWORK || 'testnet';
    this.client = new SuiClient({ url: getFullnodeUrl(network) });
    this.gameScoreContract = process.env.GAME_SCORE_CONTRACT;
    this.leaderboardContract = process.env.LEADERBOARD_CONTRACT;
    
    // Note: Transactions are signed by users on the frontend
    // Backend only verifies and queries blockchain data
  }

  /**
   * Build an unsigned transaction for score submission
   * Frontend will sign and execute this transaction
   * @param {Object} scoreData - Score data to submit
   * @returns {TransactionBlock} Unsigned transaction ready for frontend signing
   */
  buildScoreTransaction(scoreData) {
    const tx = new TransactionBlock();
    
    // Call Move function to record score
    tx.moveCall({
      target: `${this.gameScoreContract}::game::submit_score`,
      arguments: [
        tx.pure.u64(scoreData.score),
        tx.pure.u64(scoreData.distance),
        tx.pure.u64(scoreData.coins),
        tx.pure.u64(scoreData.bossesDefeated),
        tx.pure.u8(scoreData.tier),
      ],
    });

    // Set gas budget
    tx.setGasBudget(parseInt(process.env.SUI_GAS_BUDGET || '10000000'));

    return tx;
  }

  /**
   * Verify a transaction that was signed and executed by the frontend
   * @param {string} transactionHash - Transaction hash from frontend
   * @returns {Promise<Object>} Transaction verification result
   */
  async verifyScoreSubmission(transactionHash) {
    try {
      const tx = await this.client.getTransactionBlock({
        digest: transactionHash,
        options: {
          showEffects: true,
          showEvents: true,
          showInput: true,
        },
      });

      return {
        exists: !!tx,
        success: tx.effects?.status?.status === 'success',
        events: tx.events || [],
        timestamp: tx.timestampMs,
        transactionHash,
      };
    } catch (error) {
      console.error('Error verifying transaction:', error);
      return { exists: false, success: false, transactionHash };
    }
  }

  /**
   * Check token balance for a wallet address
   * Used for gatekeeping (require minimum $Mews token balance)
   * @param {string} walletAddress - Wallet address to check
   * @param {string} coinType - Token type ID (defaults to $Mews from env)
   * @returns {Promise<Object>} Balance information
   */
  async getTokenBalance(walletAddress, coinType = null) {
    try {
      const tokenType = coinType || process.env.MEWS_TOKEN_TYPE_ID;
      
      const balance = await this.client.getBalance({
        owner: walletAddress,
        coinType: tokenType,
      });

      return {
        address: walletAddress,
        totalBalance: balance.totalBalance,
        coinType: tokenType,
        hasMinimumBalance: BigInt(balance.totalBalance) >= BigInt(process.env.MIN_TOKEN_BALANCE || '500000000'), // 500,000 with 9 decimals
      };
    } catch (error) {
      console.error('Error checking token balance:', error);
      return {
        address: walletAddress,
        totalBalance: '0',
        hasMinimumBalance: false,
        error: error.message,
      };
    }
  }

  /**
   * Get leaderboard data from blockchain events
   * Queries ScoreSubmitted events from the smart contract
   * @param {number} limit - Number of top scores to fetch
   * @returns {Promise<Array>} Leaderboard entries sorted by score
   */
  async getLeaderboard(limit = 100) {
    try {
      // Query events for score submissions
      const events = await this.client.queryEvents({
        query: {
          MoveModule: {
            package: this.gameScoreContract.split('::')[0],
            module: 'game',
          },
          MoveEventType: `${this.gameScoreContract.split('::')[0]}::game::ScoreSubmitted`,
        },
        limit: 1000, // Get more than needed to sort and filter
        order: 'descending',
      });

      // Parse and sort events by score
      const scores = events.data
        .map(event => {
          try {
            const parsedJson = event.parsedJson;
            return {
              walletAddress: parsedJson.player,
              score: parsedJson.score,
              distance: parsedJson.distance,
              coins: parsedJson.coins,
              bossesDefeated: parsedJson.bosses_defeated,
              tier: parsedJson.tier,
              transactionHash: event.id.txDigest,
              timestamp: event.timestampMs,
            };
          } catch (e) {
            return null;
          }
        })
        .filter(score => score !== null)
        .sort((a, b) => b.score - a.score) // Sort by score descending
        .slice(0, limit); // Take top N

      return scores;
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }
  }

  /**
   * Get scores for a specific wallet address
   * @param {string} walletAddress - Wallet address to query
   * @param {number} limit - Maximum number of scores to return
   * @returns {Promise<Array>} Player's scores
   */
  async getPlayerScores(walletAddress, limit = 50) {
    try {
      const events = await this.client.queryEvents({
        query: {
          MoveModule: {
            package: this.gameScoreContract.split('::')[0],
            module: 'game',
          },
          MoveEventType: `${this.gameScoreContract.split('::')[0]}::game::ScoreSubmitted`,
        },
        limit: 1000,
        order: 'descending',
      });

      // Filter by player address and sort
      const scores = events.data
        .map(event => {
          try {
            const parsedJson = event.parsedJson;
            if (parsedJson.player.toLowerCase() === walletAddress.toLowerCase()) {
              return {
                score: parsedJson.score,
                distance: parsedJson.distance,
                coins: parsedJson.coins,
                bossesDefeated: parsedJson.bosses_defeated,
                tier: parsedJson.tier,
                transactionHash: event.id.txDigest,
                timestamp: event.timestampMs,
              };
            }
            return null;
          } catch (e) {
            return null;
          }
        })
        .filter(score => score !== null)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      return scores;
    } catch (error) {
      console.error('Error fetching player scores:', error);
      return [];
    }
  }

  /**
   * Listen for score submission events
   */
  async subscribeToScoreEvents(callback) {
    // Implement event subscription
    // This allows real-time updates when scores are submitted
    try {
      // Example: Poll for events or use WebSocket if available
      const events = await this.client.queryEvents({
        query: {
          MoveModule: {
            package: this.gameScoreContract.split('::')[0],
            module: 'game',
          },
        },
        limit: 10,
      });

      if (callback) {
        callback(events);
      }
    } catch (error) {
      console.error('Error subscribing to events:', error);
    }
  }
}

module.exports = new SuiService();
```

### Python Example (`backend/src/services/sui_service.py`)

```python
from pysui import SuiConfig, SyncClient
from pysui.sui.sui_types import SuiString
from pysui.sui.sui_types.transaction import TransactionBuilder
import os

class SuiService:
    def __init__(self):
        # Initialize Sui client
        network = os.getenv('SUI_NETWORK', 'testnet')
        self.config = SuiConfig.default_config()
        self.client = SyncClient(self.config)
        self.game_score_contract = os.getenv('GAME_SCORE_CONTRACT')
        self.leaderboard_contract = os.getenv('LEADERBOARD_CONTRACT')
    
    def build_score_transaction(self, score_data: dict):
        """Build an unsigned transaction for score submission"""
        tx_builder = TransactionBuilder(self.client)
        
        # Call Move function
        tx_builder.move_call(
            target=f"{self.game_score_contract}::game::submit_score",
            arguments=[
                score_data['score'],
                score_data['distance'],
                score_data['coins'],
                score_data['bosses_defeated'],
                score_data['tier'],
            ]
        )
        
        tx_builder.set_gas_budget(int(os.getenv('SUI_GAS_BUDGET', 10000000)))
        
        return tx_builder
    
    async def verify_score_submission(self, transaction_hash: str) -> dict:
        """Verify a transaction that was signed and executed by the frontend"""
        try:
            tx = self.client.get_transaction(transaction_hash)
            return {
                'exists': True,
                'success': tx.effects.status.status == 'success',
                'events': tx.effects.events,
                'transactionHash': transaction_hash,
            }
        except Exception as e:
            return {'exists': False, 'success': False, 'transactionHash': transaction_hash}
    
    async def get_token_balance(self, wallet_address: str, coin_type: str = None) -> dict:
        """Check token balance for gatekeeping"""
        try:
            token_type = coin_type or os.getenv('MEWS_TOKEN_TYPE_ID')
            balance = self.client.get_balance(wallet_address, coin_type=token_type)
            
            min_balance = int(os.getenv('MIN_TOKEN_BALANCE', '500000000'))
            
            return {
                'address': wallet_address,
                'totalBalance': str(balance),
                'coinType': token_type,
                'hasMinimumBalance': balance >= min_balance,
            }
        except Exception as e:
            return {
                'address': wallet_address,
                'totalBalance': '0',
                'hasMinimumBalance': False,
                'error': str(e),
            }
```

---

## Step 2.2: Create API Routes

### Scores Route (Framework-Agnostic Pattern)

**Key Points:**
- **No Database** - All data comes from blockchain
- **Frontend Signs** - Transactions are signed on frontend, backend only verifies
- **Transaction Verification** - Backend verifies submitted transaction hashes

#### Option A: Node.js/Express (`backend/src/routes/scores.js`)

```javascript
const express = require('express');
const router = express.Router();
const suiService = require('../services/sui-service');

/**
 * POST /api/scores/verify
 * Verify a transaction that was signed and executed by the frontend
 * Frontend sends transaction hash after signing/submitting
 */
router.post('/verify', async (req, res) => {
  try {
    const { transactionHash } = req.body;

    if (!transactionHash) {
      return res.status(400).json({ error: 'Transaction hash required' });
    }

    // Verify the transaction on-chain
    const verification = await suiService.verifyScoreSubmission(transactionHash);

    if (!verification.exists) {
      return res.status(404).json({ 
        error: 'Transaction not found',
        transactionHash 
      });
    }

    if (!verification.success) {
      return res.status(400).json({ 
        error: 'Transaction failed',
        transactionHash,
        verification 
      });
    }

    res.json({
      success: true,
      verified: true,
      transactionHash,
      timestamp: verification.timestamp,
      events: verification.events,
    });
  } catch (error) {
    console.error('Error verifying score:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/scores/:walletAddress
 * Get scores for a specific player (from blockchain events)
 */
router.get('/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const scores = await suiService.getPlayerScores(walletAddress, limit);

    res.json({ 
      walletAddress,
      scores,
      count: scores.length 
    });
  } catch (error) {
    console.error('Error fetching player scores:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
```

#### Option B: Next.js API Route (`backend/app/api/scores/verify/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import suiService from '@/lib/sui-service';

export async function POST(req: NextRequest) {
  try {
    const { transactionHash } = await req.json();
    
    if (!transactionHash) {
      return NextResponse.json(
        { error: 'Transaction hash required' },
        { status: 400 }
      );
    }

    const verification = await suiService.verifyScoreSubmission(transactionHash);
    
    if (!verification.exists) {
      return NextResponse.json(
        { error: 'Transaction not found', transactionHash },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      verified: verification.success,
      transactionHash,
      timestamp: verification.timestamp,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Leaderboard Route (Framework-Agnostic Pattern)

**Key Points:**
- **Query Blockchain Events** - Read `ScoreSubmitted` events directly
- **No Database** - All leaderboard data comes from on-chain events
- **Sorted On-Chain** - Events are sorted by score when querying

#### Option A: Node.js/Express (`backend/src/routes/leaderboard.js`)

```javascript
const express = require('express');
const router = express.Router();
const suiService = require('../services/sui-service');

/**
 * GET /api/leaderboard
 * Get top scores (queried directly from blockchain)
 */
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;

    // Query blockchain events for scores
    const scores = await suiService.getLeaderboard(limit);

    // Format response with ranks
    const leaderboard = scores.map((score, index) => ({
      rank: index + 1,
      walletAddress: score.walletAddress,
      score: score.score,
      distance: score.distance,
      coins: score.coins,
      bossesDefeated: score.bossesDefeated,
      tier: score.tier,
      transactionHash: score.transactionHash,
      timestamp: score.timestamp,
    }));

    res.json({
      leaderboard,
      count: leaderboard.length,
      // Note: Total count would require querying all events (expensive)
      // For MVP, just return what we have
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
```

#### Option B: Next.js API Route (`backend/app/api/leaderboard/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import suiService from '@/lib/sui-service';

export async function GET(req: NextRequest) {
  try {
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '100');
    
    const scores = await suiService.getLeaderboard(limit);
    
    const leaderboard = scores.map((score, index) => ({
      rank: index + 1,
      walletAddress: score.walletAddress,
      score: score.score,
      distance: score.distance,
      coins: score.coins,
      bossesDefeated: score.bossesDefeated,
      tier: score.tier,
      transactionHash: score.transactionHash,
      timestamp: score.timestamp,
    }));

    return NextResponse.json({
      leaderboard,
      count: leaderboard.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Token Balance Route (For Gatekeeping)

**Key Points:**
- **Check $Mews Balance** - Verify user has minimum 500,000 $Mews
- **Gatekeeping Endpoint** - Frontend calls this before allowing gameplay

#### Option A: Node.js/Express (`backend/src/routes/tokens.js`)

```javascript
const express = require('express');
const router = express.Router();
const suiService = require('../services/sui-service');

/**
 * GET /api/tokens/balance/:walletAddress
 * Check token balance for gatekeeping
 */
router.get('/balance/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const coinType = req.query.coinType; // Optional override

    const balance = await suiService.getTokenBalance(walletAddress, coinType);

    res.json({
      address: balance.address,
      balance: balance.totalBalance,
      coinType: balance.coinType,
      hasMinimumBalance: balance.hasMinimumBalance,
      canPlay: balance.hasMinimumBalance, // User can play if they have minimum balance
    });
  } catch (error) {
    console.error('Error checking token balance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
```

#### Option B: Next.js API Route (`backend/app/api/tokens/balance/[address]/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import suiService from '@/lib/sui-service';

export async function GET(
  req: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const { address } = params;
    const coinType = req.nextUrl.searchParams.get('coinType');
    
    const balance = await suiService.getTokenBalance(address, coinType || undefined);
    
    return NextResponse.json({
      address: balance.address,
      balance: balance.totalBalance,
      coinType: balance.coinType,
      hasMinimumBalance: balance.hasMinimumBalance,
      canPlay: balance.hasMinimumBalance,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## ✅ Checklist

- [ ] Sui service module created (`sui-service.js` or equivalent)
- [ ] `buildScoreTransaction()` method - Build unsigned transactions
- [ ] `verifyScoreSubmission()` method - Verify submitted transactions
- [ ] `getTokenBalance()` method - Check $Mews token balance
- [ ] `getLeaderboard()` method - Query blockchain events for scores
- [ ] `getPlayerScores()` method - Get scores for specific wallet
- [ ] Scores API route (`/api/scores/verify`) - Verify transaction hashes
- [ ] Scores API route (`/api/scores/:walletAddress`) - Get player scores
- [ ] Leaderboard API route (`/api/leaderboard`) - Get top scores from blockchain
- [ ] Token balance API route (`/api/tokens/balance/:walletAddress`) - Gatekeeping
- [ ] All routes query blockchain directly (no database)
- [ ] Error handling added to all methods
- [ ] Test transaction verification locally
- [ ] Test leaderboard querying with mock events

---

## 🔄 Next Steps

- [04. Frontend Integration](./04-frontend-integration.md) - Connect frontend to backend
- [08. Security Considerations](./08-security-considerations.md) - Review security best practices

---

**Related Documents:**
- [Backend Setup](./02-backend-setup.md)
- [Frontend Integration](./04-frontend-integration.md)

