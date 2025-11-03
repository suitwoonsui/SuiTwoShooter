# Sui Blockchain Integration Guide
## SuiTwo Shooter Game - Complete Implementation Plan

> **⚠️ Note:** This guide has been broken up into smaller, more manageable sections.
> 
> **📁 See the new organized structure in: [`docs/sui-integration/`](./sui-integration/)**
> 
> **🚀 Quick Start:** Start with [docs/sui-integration/README.md](./sui-integration/README.md)

---

## 📋 Executive Summary

This document provides a comprehensive guide for integrating Sui Blockchain technology into the SuiTwo Shooter Game. The game currently operates as a client-side HTML5/JavaScript application with localStorage-based leaderboards. This integration will enable:

- **On-chain leaderboards** with verified scores
- **Wallet connection** for player authentication
- **NFT/Token rewards** for achievements
- **Provable gameplay** with transaction receipts
- **Cross-device progress** synchronization

---

## 🏗️ Architecture Overview

### Current Architecture
```
┌─────────────────────────────────────┐
│         Client (Browser)            │
│  ┌───────────────────────────────┐  │
│  │   HTML5 Canvas Game           │  │
│  │   - Game Logic (JavaScript)   │  │
│  │   - Rendering System         │  │
│  │   - Audio System             │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │   Data Storage (localStorage) │  │
│  │   - Leaderboard (top 10)      │  │
│  │   - Game Settings            │  │
│  │   - Game Stats               │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### Proposed Architecture with Sui Integration
```
┌─────────────────────────────────────────────────────────────┐
│                    Client (Browser)                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │          Game Application (HTML5/JS)                   │  │
│  │  ┌──────────────────┐  ┌──────────────────────────┐ │  │
│  │  │  Game Logic      │  │  Sui Wallet Adapter      │ │  │
│  │  │  (Existing)      │  │  - Connect Wallet        │ │  │
│  │  └──────────────────┘  │  - Sign Transactions      │ │  │
│  │                        │  - Read Chain Data       │ │  │
│  │  ┌──────────────────┐  └──────────────────────────┘ │  │
│  │  │  API Client      │                               │  │
│  │  │  - Submit Scores │                               │  │
│  │  │  - Fetch Leaderboard│                           │  │
│  │  │  - Request Rewards│                              │  │
│  │  └──────────────────┘                               │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend Server                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  API Server (Node.js/Express/Python/FastAPI)          │  │
│  │  ┌──────────────────┐  ┌──────────────────────────┐  │  │
│  │  │  REST API       │  │  Sui SDK Integration     │  │  │
│  │  │  - /api/scores  │  │  - Transaction Builder   │  │  │
│  │  │  - /api/leaderboard│  │  - Move Call Signer   │  │  │
│  │  │  - /api/rewards │  │  - Event Subscriber     │  │  │
│  │  └──────────────────┘  └──────────────────────────┘  │  │
│  │  ┌──────────────────┐  ┌──────────────────────────┐  │  │
│  │  │  Database        │  │  Game State Cache         │  │  │
│  │  │  (PostgreSQL/    │  │  (Redis/Optional)         │  │  │
│  │  │   MongoDB)      │  │                           │  │  │
│  │  └──────────────────┘  └──────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │ RPC
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Sui Blockchain                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Smart Contracts (Move)                               │  │
│  │  - GameScore NFT/Token Contract                      │  │
│  │  - Leaderboard Registry                              │  │
│  │  - Reward Distribution                               │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Should You Use Your Existing Backend Code?

### **YES - Use Your Existing Backend as Foundation** ✅

**Recommendation:** Yes, copy your simplified/generalized backend code into this project. Here's why:

1. **Faster Development:** You already have working infrastructure
2. **Proven Patterns:** You've tested it in another project
3. **Reduced Risk:** Less likely to introduce new bugs
4. **Consistency:** Similar architecture across your projects

### **What to Adapt:**

1. **API Endpoints:** Modify to match SuiTwo game data structure
   - Score submission format
   - Leaderboard queries
   - Player authentication flow

2. **Sui SDK Integration:** Add Sui-specific modules
   - Sui client initialization
   - Move function calls
   - Transaction building and signing
   - Event listening

3. **Database Schema:** Adapt to game requirements
   - Player profiles (wallet addresses)
   - Scores with blockchain transaction IDs
   - Leaderboard entries with on-chain verification
   - Reward claims and NFT metadata

4. **Security:** Enhance for blockchain operations
   - Wallet signature verification
   - Transaction validation
   - Rate limiting for API endpoints
   - CORS configuration for frontend

---

## 📦 Step-by-Step Integration Plan

### **Phase 1: Backend Setup & Infrastructure** (Week 1)

#### Step 1.1: Copy and Setup Backend Code
```bash
# Create backend directory
mkdir backend
cd backend

# Copy your existing backend code here
# Structure should be:
backend/
├── package.json (or requirements.txt)
├── src/
│   ├── server.js (or main.py)
│   ├── config/
│   │   └── config.js
│   ├── routes/
│   │   ├── scores.js
│   │   ├── leaderboard.js
│   │   └── rewards.js
│   ├── services/
│   │   ├── database.js
│   │   └── sui-service.js (NEW)
│   └── models/
│       ├── Score.js
│       ├── Player.js
│       └── Leaderboard.js
├── .env
└── README.md
```

#### Step 1.2: Install Sui Dependencies
```bash
# For Node.js
npm install @mysten/sui.js
npm install dotenv

# For Python
pip install pysui
pip install python-dotenv
```

#### Step 1.3: Configure Environment Variables
Create `.env` file:
```env
# Server Configuration
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:8000

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/suitwo_game
# OR for MongoDB
MONGO_URI=mongodb://localhost:27017/suitwo_game

# Sui Blockchain Configuration
SUI_NETWORK=testnet  # or 'mainnet' for production
SUI_RPC_URL=https://fullnode.testnet.sui.io:443
SUI_GAS_BUDGET=10000000  # Gas budget for transactions

# Smart Contract Addresses (after deployment)
GAME_SCORE_CONTRACT=0x...
LEADERBOARD_CONTRACT=0x...

# Security
JWT_SECRET=your-secret-key-here
API_KEY=your-api-key-here
```

#### Step 1.4: Database Schema Setup

**PostgreSQL Schema Example:**
```sql
-- Players Table
CREATE TABLE players (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(255) UNIQUE NOT NULL,
    nickname VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Scores Table
CREATE TABLE scores (
    id SERIAL PRIMARY KEY,
    player_id INTEGER REFERENCES players(id),
    wallet_address VARCHAR(255) NOT NULL,
    score INTEGER NOT NULL,
    distance INTEGER,
    coins INTEGER,
    bosses_defeated INTEGER,
    tier INTEGER,
    transaction_hash VARCHAR(255) UNIQUE,  -- Sui transaction hash
    verified BOOLEAN DEFAULT FALSE,      -- Verified on-chain
    game_data JSONB,                      -- Additional game state
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_score (score DESC),
    INDEX idx_wallet (wallet_address),
    INDEX idx_verified (verified)
);

-- Leaderboard View (optimized query)
CREATE VIEW leaderboard AS
SELECT 
    p.wallet_address,
    p.nickname,
    s.score,
    s.distance,
    s.bosses_defeated,
    s.tier,
    s.transaction_hash,
    s.created_at,
    ROW_NUMBER() OVER (ORDER BY s.score DESC) as rank
FROM scores s
JOIN players p ON s.player_id = p.id
WHERE s.verified = TRUE
ORDER BY s.score DESC
LIMIT 100;
```

**MongoDB Schema Example:**
```javascript
// Players Collection
{
  _id: ObjectId,
  walletAddress: String,  // Unique index
  nickname: String,
  createdAt: Date,
  updatedAt: Date
}

// Scores Collection
{
  _id: ObjectId,
  playerId: ObjectId,
  walletAddress: String,
  score: Number,
  distance: Number,
  coins: Number,
  bossesDefeated: Number,
  tier: Number,
  transactionHash: String,  // Unique index
  verified: Boolean,
  gameData: Object,
  createdAt: Date
}

// Indexes
db.scores.createIndex({ score: -1 });
db.scores.createIndex({ walletAddress: 1 });
db.scores.createIndex({ verified: 1, score: -1 });
```

---

### **Phase 2: Sui SDK Integration** (Week 1-2)

#### Step 2.1: Create Sui Service Module

**Node.js Example (`backend/src/services/sui-service.js`):**
```javascript
const { SuiClient, getFullnodeUrl } = require('@mysten/sui.js/client');
const { TransactionBlock } = require('@mysten/sui.js/transactions');
const { Ed25519Keypair } = require('@mysten/sui.js/keypairs/ed25519');
const { fromHEX } = require('@mysten/sui.js/utils');

class SuiService {
  constructor() {
    const network = process.env.SUI_NETWORK || 'testnet';
    this.client = new SuiClient({ url: getFullnodeUrl(network) });
    this.gameScoreContract = process.env.GAME_SCORE_CONTRACT;
    this.leaderboardContract = process.env.LEADERBOARD_CONTRACT;
    
    // Admin keypair for backend transactions (use environment variable)
    const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
    if (adminPrivateKey) {
      this.adminKeypair = Ed25519Keypair.fromSecretKey(fromHEX(adminPrivateKey));
    }
  }

  /**
   * Submit a game score to the blockchain
   * @param {string} playerAddress - Player's wallet address
   * @param {Object} scoreData - Score data to submit
   * @returns {Promise<string>} Transaction hash
   */
  async submitScore(playerAddress, scoreData) {
    try {
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
      tx.setGasBudget(parseInt(process.env.SUI_GAS_BUDGET));

      // Note: In production, player should sign this transaction
      // For now, this is a server-signed example
      // You'll need to implement a way for players to sign on frontend
      
      // This should be signed by the player's wallet, not admin
      // For demonstration, showing server-side execution
      const result = await this.client.signAndExecuteTransactionBlock({
        signer: this.adminKeypair,
        transactionBlock: tx,
      });

      return result.digest;
    } catch (error) {
      console.error('Error submitting score to Sui:', error);
      throw error;
    }
  }

  /**
   * Verify a transaction on the blockchain
   * @param {string} transactionHash - Transaction hash to verify
   * @returns {Promise<Object>} Transaction details
   */
  async verifyTransaction(transactionHash) {
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
        events: tx.events,
        timestamp: tx.timestampMs,
      };
    } catch (error) {
      console.error('Error verifying transaction:', error);
      return { exists: false, success: false };
    }
  }

  /**
   * Get leaderboard data from blockchain
   * @param {number} limit - Number of top scores to fetch
   * @returns {Promise<Array>} Leaderboard entries
   */
  async getLeaderboard(limit = 100) {
    try {
      // Query Move function or read object
      const result = await this.client.getObject({
        id: this.leaderboardContract,
        options: {
          showContent: true,
        },
      });

      // Parse leaderboard data from Move object
      // This depends on your Move contract structure
      return result.data?.content?.fields || [];
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
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

**Python Example (`backend/src/services/sui_service.py`):**
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
    
    async def submit_score(self, player_address: str, score_data: dict) -> str:
        """Submit a game score to the blockchain"""
        try:
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
            
            # Execute transaction
            result = tx_builder.execute(gas_budget=int(os.getenv('SUI_GAS_BUDGET', 10000000)))
            
            return result.digest
        except Exception as e:
            print(f"Error submitting score: {e}")
            raise
    
    async def verify_transaction(self, transaction_hash: str) -> dict:
        """Verify a transaction on the blockchain"""
        try:
            tx = self.client.get_transaction(transaction_hash)
            return {
                'exists': True,
                'success': tx.effects.status.status == 'success',
                'events': tx.effects.events,
            }
        except Exception as e:
            return {'exists': False, 'success': False}
```

#### Step 2.2: Create API Routes

**Scores Route (`backend/src/routes/scores.js`):**
```javascript
const express = require('express');
const router = express.Router();
const suiService = require('../services/sui-service');
const { Score, Player } = require('../models');

/**
 * POST /api/scores/submit
 * Submit a game score
 */
router.post('/submit', async (req, res) => {
  try {
    const { walletAddress, score, distance, coins, bossesDefeated, tier, gameData } = req.body;

    // Validate input
    if (!walletAddress || score === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Find or create player
    let player = await Player.findOne({ where: { wallet_address: walletAddress } });
    if (!player) {
      player = await Player.create({
        wallet_address: walletAddress,
        nickname: req.body.nickname || `Player_${walletAddress.slice(0, 8)}`,
      });
    }

    // Submit to blockchain (async, don't wait)
    let transactionHash = null;
    try {
      transactionHash = await suiService.submitScore(walletAddress, {
        score,
        distance,
        coins,
        bossesDefeated,
        tier,
      });
    } catch (error) {
      console.error('Blockchain submission failed:', error);
      // Continue with database save even if blockchain fails
    }

    // Save to database
    const scoreRecord = await Score.create({
      player_id: player.id,
      wallet_address: walletAddress,
      score,
      distance,
      coins,
      bosses_defeated: bossesDefeated,
      tier,
      transaction_hash: transactionHash,
      verified: !!transactionHash,
      game_data: gameData,
    });

    // Verify transaction in background (async)
    if (transactionHash) {
      verifyTransactionInBackground(transactionHash, scoreRecord.id);
    }

    res.json({
      success: true,
      scoreId: scoreRecord.id,
      transactionHash,
      verified: scoreRecord.verified,
    });
  } catch (error) {
    console.error('Error submitting score:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/scores/:walletAddress
 * Get scores for a specific player
 */
router.get('/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const scores = await Score.findAll({
      where: { wallet_address: walletAddress },
      order: [['score', 'DESC']],
      limit: 50,
    });

    res.json({ scores });
  } catch (error) {
    console.error('Error fetching scores:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Background verification function
 */
async function verifyTransactionInBackground(transactionHash, scoreId) {
  setTimeout(async () => {
    try {
      const verification = await suiService.verifyTransaction(transactionHash);
      if (verification.success) {
        await Score.update(
          { verified: true },
          { where: { id: scoreId } }
        );
      }
    } catch (error) {
      console.error('Error verifying transaction:', error);
    }
  }, 5000); // Wait 5 seconds for transaction to be confirmed
}

module.exports = router;
```

**Leaderboard Route (`backend/src/routes/leaderboard.js`):**
```javascript
const express = require('express');
const router = express.Router();
const { Score, Player } = require('../models');
const { Sequelize } = require('sequelize');

/**
 * GET /api/leaderboard
 * Get top scores (verified on-chain)
 */
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    // Query verified scores with player info
    const scores = await Score.findAll({
      where: { verified: true },
      include: [{
        model: Player,
        attributes: ['wallet_address', 'nickname'],
      }],
      order: [['score', 'DESC']],
      limit,
      offset,
      attributes: [
        'id',
        'score',
        'distance',
        'coins',
        'bosses_defeated',
        'tier',
        'transaction_hash',
        'created_at',
        [Sequelize.literal('ROW_NUMBER() OVER (ORDER BY score DESC)'), 'rank'],
      ],
    });

    // Format response
    const leaderboard = scores.map((score, index) => ({
      rank: offset + index + 1,
      walletAddress: score.Player.wallet_address,
      nickname: score.Player.nickname,
      score: score.score,
      distance: score.distance,
      coins: score.coins,
      bossesDefeated: score.bosses_defeated,
      tier: score.tier,
      transactionHash: score.transaction_hash,
      timestamp: score.created_at,
    }));

    res.json({
      leaderboard,
      total: await Score.count({ where: { verified: true } }),
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
```

---

### **Phase 3: Frontend Integration** (Week 2-3)

#### Step 3.1: Install Frontend Dependencies

Add to your project root or create a separate `frontend/` directory:
```bash
# Install Sui Wallet Adapter
npm install @mysten/wallet-adapter-base
npm install @mysten/wallet-adapter-wallet-standard
npm install @mysten/wallet-adapter-all-wallets
npm install @mysten/dapp-kit
```

#### Step 3.2: Create Wallet Connection Module

**`src/game/blockchain/wallet-connection.js`:**
```javascript
// ==========================================
// SUI WALLET CONNECTION MODULE
// ==========================================

import { getWallets } from '@mysten/wallet-adapter-wallet-standard';
import { WalletProvider, useWallet } from '@mysten/dapp-kit';

let walletProvider = null;
let connectedWallet = null;

/**
 * Initialize wallet connection system
 */
export function initializeWalletConnection() {
  try {
    // Get available wallets
    const wallets = getWallets();
    
    console.log('💰 Available Sui wallets:', wallets.map(w => w.name));
    
    // Create wallet provider
    walletProvider = new WalletProvider({
      wallets: wallets,
      // Use testnet or mainnet
      network: import.meta.env.VITE_SUI_NETWORK || 'testnet',
    });

    return {
      success: true,
      wallets: wallets.map(w => ({ name: w.name, icon: w.icon })),
    };
  } catch (error) {
    console.error('Error initializing wallet:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Connect to a wallet
 * @param {string} walletName - Name of wallet to connect
 * @returns {Promise<Object>} Connection result
 */
export async function connectWallet(walletName) {
  try {
    if (!walletProvider) {
      await initializeWalletConnection();
    }

    // Get the wallet adapter
    const wallet = walletProvider.getWallet(walletName);
    
    if (!wallet) {
      throw new Error(`Wallet ${walletName} not found`);
    }

    // Connect
    await wallet.connect();
    connectedWallet = wallet;

    return {
      success: true,
      address: wallet.getAccounts()[0].address,
      wallet: walletName,
    };
  } catch (error) {
    console.error('Error connecting wallet:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Disconnect wallet
 */
export async function disconnectWallet() {
  try {
    if (connectedWallet) {
      await connectedWallet.disconnect();
      connectedWallet = null;
    }
    return { success: true };
  } catch (error) {
    console.error('Error disconnecting wallet:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get current wallet address
 * @returns {string|null} Wallet address
 */
export function getWalletAddress() {
  if (connectedWallet && connectedWallet.connected) {
    return connectedWallet.getAccounts()[0].address;
  }
  return null;
}

/**
 * Check if wallet is connected
 * @returns {boolean}
 */
export function isWalletConnected() {
  return connectedWallet !== null && connectedWallet.connected;
}
```

#### Step 3.3: Create API Client Module

**`src/game/blockchain/api-client.js`:**
```javascript
// ==========================================
// BACKEND API CLIENT
// ==========================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

/**
 * Submit game score to backend
 * @param {Object} scoreData - Game score data
 * @returns {Promise<Object>} Submission result
 */
export async function submitScore(scoreData) {
  try {
    const response = await fetch(`${API_BASE_URL}/scores/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(scoreData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error submitting score:', error);
    throw error;
  }
}

/**
 * Fetch leaderboard from backend
 * @param {number} limit - Number of entries to fetch
 * @param {number} offset - Offset for pagination
 * @returns {Promise<Array>} Leaderboard entries
 */
export async function fetchLeaderboard(limit = 100, offset = 0) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/leaderboard?limit=${limit}&offset=${offset}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.leaderboard || [];
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    // Fallback to localStorage leaderboard
    return getLocalLeaderboard();
  }
}

/**
 * Get player scores
 * @param {string} walletAddress - Player wallet address
 * @returns {Promise<Array>} Player's scores
 */
export async function getPlayerScores(walletAddress) {
  try {
    const response = await fetch(`${API_BASE_URL}/scores/${walletAddress}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.scores || [];
  } catch (error) {
    console.error('Error fetching player scores:', error);
    return [];
  }
}

/**
 * Fallback: Get local leaderboard from localStorage
 */
function getLocalLeaderboard() {
  try {
    const leaderboard = JSON.parse(localStorage.getItem('gameLeaderboard')) || [];
    return leaderboard.map((entry, index) => ({
      rank: index + 1,
      nickname: entry.name,
      score: entry.score,
      timestamp: entry.date,
    }));
  } catch (error) {
    console.error('Error reading local leaderboard:', error);
    return [];
  }
}
```

#### Step 3.4: Integrate with Existing Leaderboard System

**Modify `src/game/systems/ui/leaderboard-system.js`:**

Add these imports and modifications:
```javascript
// Add at top of file
import { submitScore, fetchLeaderboard } from '../../blockchain/api-client.js';
import { getWalletAddress, isWalletConnected } from '../../blockchain/wallet-connection.js';

// Modify saveScore function to submit to backend
async function saveScore() {
  console.log('🟣 [UI FLOW] saveScore() called');
  
  const name = document.getElementById('playerNameInput').value.trim();
  
  if (!name) {
    alert('Please enter your name!');
    hideNameInput();
    showMainMenu();
    return;
  }

  const score = currentGameScore;
  console.log("Saving score:", score, "for player:", name);

  // Check if wallet is connected
  const walletAddress = getWalletAddress();
  
  if (walletAddress) {
    // Submit to blockchain-enabled backend
    try {
      // Get game state data (you'll need to pass this from gameOver)
      const gameData = {
        walletAddress,
        nickname: name,
        score: score,
        distance: game.distance,
        coins: game.coins,
        bossesDefeated: game.bossesDefeated,
        tier: game.currentTier,
        gameData: {
          lives: game.lives,
          projectileLevel: game.projectileLevel,
        },
      };

      const result = await submitScore(gameData);
      
      console.log('✅ Score submitted to backend:', result);
      
      // Still save locally as backup
      leaderboard.push({ 
        name, 
        score, 
        date: new Date().toLocaleDateString(),
        transactionHash: result.transactionHash,
        verified: result.verified,
      });
    } catch (error) {
      console.error('❌ Error submitting to backend:', error);
      // Fallback to local storage only
      leaderboard.push({ name, score, date: new Date().toLocaleDateString() });
    }
  } else {
    // No wallet connected, save locally only
    leaderboard.push({ name, score, date: new Date().toLocaleDateString() });
  }

  // Sort and keep only top 10 locally
  leaderboard.sort((a, b) => b.score - a.score);
  leaderboard = leaderboard.slice(0, 10);
  localStorage.setItem('gameLeaderboard', JSON.stringify(leaderboard));

  // Update display
  displayLeaderboard();
  displayLeaderboardModal();
  
  hideNameInput();
  showMainMenu();
}

// Modify displayLeaderboard to fetch from backend
async function displayLeaderboard() {
  const list = document.getElementById('leaderboardList');
  if (!list) return;
  
  list.innerHTML = '<li style="text-align: center; color: #888; padding: 20px;">Loading leaderboard...</li>';
  
  try {
    // Fetch from backend
    const backendLeaderboard = await fetchLeaderboard(10, 0);
    
    if (backendLeaderboard.length > 0) {
      list.innerHTML = '';
      backendLeaderboard.forEach((entry) => {
        const li = document.createElement('li');
        li.className = 'leaderboard-item';
        li.innerHTML = `
          <div style="display: flex; align-items: center;">
            <div class="rank">${entry.rank}</div>
            <div class="player-name">${entry.nickname || entry.walletAddress?.slice(0, 8)}</div>
            ${entry.verified ? '<span style="color: #4CAF50; font-size: 0.8em;">✓</span>' : ''}
          </div>
          <div class="player-score">${entry.score.toLocaleString()}</div>
        `;
        list.appendChild(li);
      });
    } else {
      // Fallback to local leaderboard
      const sortedScores = leaderboard.sort((a, b) => b.score - a.score).slice(0, 10);
      if (sortedScores.length === 0) {
        list.innerHTML = '<li style="text-align: center; color: #888; padding: 20px;">No scores yet!<br>Be the first to play!</li>';
      } else {
        list.innerHTML = '';
        sortedScores.forEach((entry, index) => {
          const li = document.createElement('li');
          li.className = 'leaderboard-item';
          li.innerHTML = `
            <div style="display: flex; align-items: center;">
              <div class="rank">${index + 1}</div>
              <div class="player-name">${entry.name}</div>
            </div>
            <div class="player-score">${entry.score.toLocaleString()}</div>
          `;
          list.appendChild(li);
        });
      }
    }
  } catch (error) {
    console.error('Error loading leaderboard:', error);
    // Fallback to local
    const sortedScores = leaderboard.sort((a, b) => b.score - a.score).slice(0, 10);
    // ... display local scores
  }
}
```

#### Step 3.5: Add Wallet Connection UI

Add to `index.html`:
```html
<!-- Wallet Connection Button (add to header or main menu) -->
<div id="walletConnection" class="wallet-connection">
  <button id="connectWalletBtn" class="wallet-btn" onclick="showWalletModal()">
    🔗 Connect Wallet
  </button>
  <div id="walletAddress" class="wallet-address hidden"></div>
</div>

<!-- Wallet Modal -->
<div id="walletModal" class="wallet-modal wallet-modal-hidden">
  <div class="wallet-modal-content">
    <h2>Connect Sui Wallet</h2>
    <div id="walletList" class="wallet-list">
      <!-- Wallets will be populated here -->
    </div>
    <button class="close-btn" onclick="hideWalletModal()">✕</button>
  </div>
</div>
```

Add CSS for wallet UI (create `src/game/rendering/ui/wallet-ui.css`):
```css
.wallet-connection {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
}

.wallet-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
}

.wallet-btn:hover {
  transform: translateY(-2px);
}

.wallet-address {
  margin-top: 10px;
  padding: 8px 12px;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 6px;
  font-size: 12px;
  font-family: monospace;
}

.wallet-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}

.wallet-modal-hidden {
  display: none;
}

.wallet-modal-content {
  background: #1a1a2e;
  padding: 30px;
  border-radius: 12px;
  max-width: 400px;
  width: 90%;
}

.wallet-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 20px 0;
}

.wallet-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: #16213e;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.wallet-item:hover {
  background: #0f3460;
}
```

Add wallet UI JavaScript (`src/game/systems/ui/wallet-ui.js`):
```javascript
import { initializeWalletConnection, connectWallet, disconnectWallet, getWalletAddress, isWalletConnected } from '../../blockchain/wallet-connection.js';

let walletInitialized = false;

/**
 * Initialize wallet UI
 */
export async function initializeWalletUI() {
  if (walletInitialized) return;
  
  const result = await initializeWalletConnection();
  
  if (result.success) {
    // Populate wallet list
    const walletList = document.getElementById('walletList');
    if (walletList) {
      walletList.innerHTML = '';
      result.wallets.forEach(wallet => {
        const walletItem = document.createElement('div');
        walletItem.className = 'wallet-item';
        walletItem.innerHTML = `
          <img src="${wallet.icon}" alt="${wallet.name}" width="32" height="32">
          <span>${wallet.name}</span>
        `;
        walletItem.onclick = () => handleWalletConnect(wallet.name);
        walletList.appendChild(walletItem);
      });
    }
    
    walletInitialized = true;
    updateWalletUI();
  }
}

/**
 * Show wallet connection modal
 */
export function showWalletModal() {
  const modal = document.getElementById('walletModal');
  if (modal) {
    modal.classList.remove('wallet-modal-hidden');
    initializeWalletUI();
  }
}

/**
 * Hide wallet modal
 */
export function hideWalletModal() {
  const modal = document.getElementById('walletModal');
  if (modal) {
    modal.classList.add('wallet-modal-hidden');
  }
}

/**
 * Handle wallet connection
 */
async function handleWalletConnect(walletName) {
  const result = await connectWallet(walletName);
  
  if (result.success) {
    console.log('✅ Wallet connected:', result.address);
    hideWalletModal();
    updateWalletUI();
  } else {
    alert('Failed to connect wallet: ' + result.error);
  }
}

/**
 * Update wallet UI based on connection status
 */
function updateWalletUI() {
  const connectBtn = document.getElementById('connectWalletBtn');
  const addressDiv = document.getElementById('walletAddress');
  
  if (isWalletConnected()) {
    const address = getWalletAddress();
    if (connectBtn) {
      connectBtn.textContent = '🔗 Wallet Connected';
      connectBtn.onclick = () => disconnectWallet().then(() => updateWalletUI());
    }
    if (addressDiv) {
      addressDiv.textContent = address?.slice(0, 6) + '...' + address?.slice(-4);
      addressDiv.classList.remove('hidden');
    }
  } else {
    if (connectBtn) {
      connectBtn.textContent = '🔗 Connect Wallet';
      connectBtn.onclick = showWalletModal;
    }
    if (addressDiv) {
      addressDiv.classList.add('hidden');
    }
  }
}

// Make functions globally available
window.showWalletModal = showWalletModal;
window.hideWalletModal = hideWalletModal;
```

---

### **Phase 4: Sui Smart Contracts (Move)** (Week 3-4)

#### Step 4.1: Set Up Move Development Environment

```bash
# Install Sui CLI
cargo install --locked --git https://github.com/MystenLabs/sui.git --branch devnet sui

# Verify installation
sui --version

# Initialize new Sui package
sui move new suitwo_game
cd suitwo_game
```

#### Step 4.2: Create Game Score Contract

**`suitwo_game/sources/game.move`:**
```move
module suitwo_game::game {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;

    /// Game score record stored on-chain
    struct GameScore has key, store {
        id: UID,
        player: address,
        score: u64,
        distance: u64,
        coins: u64,
        bosses_defeated: u64,
        tier: u8,
        timestamp: u64,
    }

    /// Event emitted when score is submitted
    struct ScoreSubmitted has copy, drop {
        player: address,
        score: u64,
        timestamp: u64,
    }

    /// Submit a game score
    public entry fun submit_score(
        score: u64,
        distance: u64,
        coins: u64,
        bosses_defeated: u64,
        tier: u8,
        ctx: &mut TxContext
    ) {
        let player = tx_context::sender(ctx);
        let timestamp = tx_context::epoch_timestamp_ms(ctx);

        // Create score record
        let score_obj = GameScore {
            id: object::new(ctx),
            player,
            score,
            distance,
            coins,
            bosses_defeated,
            tier,
            timestamp,
        };

        // Transfer ownership to player
        transfer::transfer(score_obj, player);

        // Emit event
        event::emit(ScoreSubmitted {
            player,
            score,
            timestamp,
        });
    }

    /// Get score data
    public fun get_score(score: &GameScore): (address, u64, u64, u64, u64, u8, u64) {
        (
            score.player,
            score.score,
            score.distance,
            score.coins,
            score.bosses_defeated,
            score.tier,
            score.timestamp,
        )
    }
}
```

#### Step 4.3: Deploy Contracts

```bash
# Build the package
sui move build

# Test (optional)
sui move test

# Deploy to testnet
sui client publish --gas-budget 10000000

# After deployment, you'll get:
# - Package ID (use for GAME_SCORE_CONTRACT in .env)
# - Object IDs for created objects
```

---

### **Phase 5: Testing & Deployment** (Week 4)

#### Step 5.1: Testing Checklist

- [ ] Wallet connection works on frontend
- [ ] Score submission to backend succeeds
- [ ] Scores are stored in database
- [ ] Blockchain transactions are created
- [ ] Transaction verification works
- [ ] Leaderboard displays verified scores
- [ ] Fallback to local storage when backend unavailable
- [ ] Error handling for failed transactions
- [ ] Rate limiting prevents abuse
- [ ] CORS configured correctly

#### Step 5.2: Environment Configuration

**Development:**
- Frontend: `http://localhost:8000`
- Backend: `http://localhost:3000`
- Sui Network: `testnet`

**Production:**
- Frontend: Your domain (e.g., `https://suitwo.game`)
- Backend: `https://api.suitwo.game`
- Sui Network: `mainnet`

#### Step 5.3: Deployment Steps

1. **Backend Deployment:**
   ```bash
   # Build backend
   cd backend
   npm install --production
   # or
   pip install -r requirements.txt

   # Deploy to your server (AWS, Heroku, Railway, etc.)
   ```

2. **Frontend Deployment:**
   - Build static files (if using a bundler)
   - Deploy to hosting (Netlify, Vercel, GitHub Pages, etc.)
   - Update API_BASE_URL environment variable

3. **Database Setup:**
   - Create production database
   - Run migrations
   - Set up backups

4. **Smart Contract Deployment:**
   ```bash
   sui client publish --gas-budget 10000000 --network mainnet
   ```

---

## 🔒 Security Considerations

### 1. **Wallet Signature Verification**
- Always verify wallet signatures on backend
- Don't trust client-submitted addresses alone
- Use cryptographic proofs

### 2. **Score Validation**
- Implement server-side score validation
- Check for impossible scores (too high, too fast)
- Validate game state consistency
- Rate limit score submissions

### 3. **API Security**
- Use HTTPS everywhere
- Implement API key authentication
- Rate limiting per wallet address
- Input validation and sanitization
- CORS configuration

### 4. **Smart Contract Security**
- Test contracts thoroughly
- Use access control
- Validate all inputs
- Handle edge cases

---

## 🔒 Token Gatekeeping Strategy

This section covers implementing a token requirement system where players must hold a minimum amount of your game token to access gameplay. This is useful for:
- **Monetization:** Require token purchase to play
- **Community Building:** Reward early supporters
- **Premium Access:** Create exclusive gameplay tiers
- **Anti-Bot Protection:** Require economic stake

---

### **Token Gatekeeping Architecture**

```
┌─────────────────────────────────────────┐
│         Game Start Request              │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│    Check Wallet Connection              │
│    (Must be connected to proceed)       │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│    Query Token Balance (Frontend)       │
│    - Direct RPC call to Sui             │
│    - Or backend API call                │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│    Compare Balance vs Requirement       │
│    - Minimum tokens required            │
│    - Check multiple token types?        │
└─────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
   ✅ Sufficient            ❌ Insufficient
        │                       │
        ▼                       ▼
┌───────────────┐    ┌──────────────────────┐
│  Allow Play   │    │  Show Error Message  │
│  Start Game   │    │  Show Token Amount   │
│               │    │  Provide Purchase Link│
└───────────────┘    └──────────────────────┘
```

---

### **Phase 6: Token Balance Verification** (Add to Implementation)

#### Step 6.1: Configure Token Requirements

Add to your backend `.env`:
```env
# Token Gatekeeping Configuration
GAME_TOKEN_TYPE=0x...  # Your token's type/package ID
MIN_TOKEN_BALANCE=1000000000  # Minimum balance required (in smallest unit, e.g., 1 SUI = 1_000_000_000 MIST)
TOKEN_DECIMALS=9  # Token decimals (9 for SUI, adjust for your token)
ENABLE_TOKEN_GATE=true  # Toggle gatekeeping on/off
```

#### Step 6.2: Create Token Balance Service (Frontend)

**`src/game/blockchain/token-balance.js`:**
```javascript
// ==========================================
// TOKEN BALANCE CHECKING SERVICE
// ==========================================

import { getWalletAddress } from './wallet-connection.js';
import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';

// Token configuration (set from environment or config)
const TOKEN_CONFIG = {
  tokenType: import.meta.env.VITE_GAME_TOKEN_TYPE || '',
  minBalance: BigInt(import.meta.env.VITE_MIN_TOKEN_BALANCE || '1000000000'),
  decimals: parseInt(import.meta.env.VITE_TOKEN_DECIMALS || '9'),
  enableGate: import.meta.env.VITE_ENABLE_TOKEN_GATE === 'true',
};

// Initialize Sui client
const network = import.meta.env.VITE_SUI_NETWORK || 'testnet';
const suiClient = new SuiClient({ url: getFullnodeUrl(network) });

/**
 * Check if player has sufficient token balance
 * @param {string} walletAddress - Player's wallet address
 * @returns {Promise<Object>} Balance check result
 */
export async function checkTokenBalance(walletAddress) {
  if (!TOKEN_CONFIG.enableGate) {
    return { 
      hasAccess: true, 
      balance: BigInt(0), 
      required: TOKEN_CONFIG.minBalance,
      reason: 'Gatekeeping disabled' 
    };
  }

  if (!walletAddress) {
    return { 
      hasAccess: false, 
      balance: BigInt(0), 
      required: TOKEN_CONFIG.minBalance,
      reason: 'Wallet not connected' 
    };
  }

  try {
    // Get all coins owned by the address
    const coins = await suiClient.getCoins({
      owner: walletAddress,
      coinType: TOKEN_CONFIG.tokenType,
    });

    // Calculate total balance
    let totalBalance = BigInt(0);
    coins.data.forEach(coin => {
      totalBalance += BigInt(coin.balance);
    });

    // Check if balance meets requirement
    const hasAccess = totalBalance >= TOKEN_CONFIG.minBalance;

    return {
      hasAccess,
      balance: totalBalance,
      required: TOKEN_CONFIG.minBalance,
      formattedBalance: formatTokenAmount(totalBalance, TOKEN_CONFIG.decimals),
      formattedRequired: formatTokenAmount(TOKEN_CONFIG.minBalance, TOKEN_CONFIG.decimals),
      reason: hasAccess ? 'Sufficient balance' : 'Insufficient balance',
    };
  } catch (error) {
    console.error('Error checking token balance:', error);
    return {
      hasAccess: false,
      balance: BigInt(0),
      required: TOKEN_CONFIG.minBalance,
      reason: `Error: ${error.message}`,
    };
  }
}

/**
 * Format token amount for display
 * @param {BigInt} amount - Raw token amount
 * @param {number} decimals - Token decimals
 * @returns {string} Formatted amount
 */
function formatTokenAmount(amount, decimals) {
  const divisor = BigInt(10 ** decimals);
  const whole = amount / divisor;
  const fraction = amount % divisor;
  
  if (fraction === BigInt(0)) {
    return whole.toString();
  }
  
  const fractionStr = fraction.toString().padStart(decimals, '0');
  const trimmed = fractionStr.replace(/\.?0+$/, '');
  
  return `${whole}.${trimmed}`;
}

/**
 * Get token balance using backend API (alternative approach)
 * @param {string} walletAddress - Player's wallet address
 * @returns {Promise<Object>} Balance check result
 */
export async function checkTokenBalanceViaAPI(walletAddress) {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
    
    const response = await fetch(`${API_BASE_URL}/tokens/balance/${walletAddress}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      hasAccess: data.hasAccess || false,
      balance: BigInt(data.balance || 0),
      required: BigInt(data.required || TOKEN_CONFIG.minBalance),
      formattedBalance: data.formattedBalance,
      formattedRequired: data.formattedRequired,
      reason: data.reason || 'Unknown',
    };
  } catch (error) {
    console.error('Error checking token balance via API:', error);
    // Fallback to direct RPC call
    return checkTokenBalance(walletAddress);
  }
}

/**
 * Check token balance for currently connected wallet
 * @returns {Promise<Object>} Balance check result
 */
export async function checkCurrentWalletBalance() {
  const walletAddress = getWalletAddress();
  return checkTokenBalance(walletAddress);
}

/**
 * Get token configuration
 * @returns {Object} Token config
 */
export function getTokenConfig() {
  return { ...TOKEN_CONFIG };
}
```

#### Step 6.3: Backend Token Balance API

**`backend/src/routes/tokens.js`:**
```javascript
const express = require('express');
const router = express.Router();
const { SuiClient, getFullnodeUrl } = require('@mysten/sui.js/client');

const TOKEN_CONFIG = {
  tokenType: process.env.GAME_TOKEN_TYPE || '',
  minBalance: BigInt(process.env.MIN_TOKEN_BALANCE || '1000000000'),
  decimals: parseInt(process.env.TOKEN_DECIMALS || '9'),
  enableGate: process.env.ENABLE_TOKEN_GATE === 'true',
};

const network = process.env.SUI_NETWORK || 'testnet';
const suiClient = new SuiClient({ url: getFullnodeUrl(network) });

/**
 * GET /api/tokens/balance/:walletAddress
 * Check token balance for a wallet
 */
router.get('/balance/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;

    if (!TOKEN_CONFIG.enableGate) {
      return res.json({
        hasAccess: true,
        balance: '0',
        required: TOKEN_CONFIG.minBalance.toString(),
        formattedBalance: '0',
        formattedRequired: formatTokenAmount(TOKEN_CONFIG.minBalance, TOKEN_CONFIG.decimals),
        reason: 'Gatekeeping disabled',
      });
    }

    if (!TOKEN_CONFIG.tokenType) {
      return res.status(500).json({ error: 'Token type not configured' });
    }

    // Get coins owned by the address
    const coins = await suiClient.getCoins({
      owner: walletAddress,
      coinType: TOKEN_CONFIG.tokenType,
    });

    // Calculate total balance
    let totalBalance = BigInt(0);
    coins.data.forEach(coin => {
      totalBalance += BigInt(coin.balance);
    });

    // Check if balance meets requirement
    const hasAccess = totalBalance >= TOKEN_CONFIG.minBalance;

    res.json({
      hasAccess,
      balance: totalBalance.toString(),
      required: TOKEN_CONFIG.minBalance.toString(),
      formattedBalance: formatTokenAmount(totalBalance, TOKEN_CONFIG.decimals),
      formattedRequired: formatTokenAmount(TOKEN_CONFIG.minBalance, TOKEN_CONFIG.decimals),
      reason: hasAccess ? 'Sufficient balance' : 'Insufficient balance',
      coinCount: coins.data.length,
    });
  } catch (error) {
    console.error('Error checking token balance:', error);
    res.status(500).json({ error: 'Failed to check token balance', message: error.message });
  }
});

/**
 * Format token amount for display
 */
function formatTokenAmount(amount, decimals) {
  const divisor = BigInt(10 ** decimals);
  const whole = amount / divisor;
  const fraction = amount % divisor;
  
  if (fraction === BigInt(0)) {
    return whole.toString();
  }
  
  const fractionStr = fraction.toString().padStart(decimals, '0');
  const trimmed = fractionStr.replace(/\.?0+$/, '');
  
  return `${whole}.${trimmed}`;
}

/**
 * GET /api/tokens/config
 * Get token gatekeeping configuration (public)
 */
router.get('/config', (req, res) => {
  res.json({
    enableGate: TOKEN_CONFIG.enableGate,
    minBalance: TOKEN_CONFIG.minBalance.toString(),
    formattedRequired: formatTokenAmount(TOKEN_CONFIG.minBalance, TOKEN_CONFIG.decimals),
    tokenType: TOKEN_CONFIG.tokenType,
    decimals: TOKEN_CONFIG.decimals,
  });
});

module.exports = router;
```

Don't forget to add the route to your main server file:
```javascript
// In backend/src/server.js or main.js
const tokenRoutes = require('./routes/tokens');
app.use('/api/tokens', tokenRoutes);
```

#### Step 6.4: Integrate with Game Start Flow

**Modify `src/game/systems/ui/menu-system.js`:**

```javascript
// Add at top of file
import { checkCurrentWalletBalance, getTokenConfig } from '../../blockchain/token-balance.js';
import { getWalletAddress, isWalletConnected } from '../../blockchain/wallet-connection.js';

// Modify startGame function
async function startGame() {
  console.log('🎮 startGame() called');
  
  // Step 1: Check wallet connection
  if (!isWalletConnected()) {
    showTokenGateModal('Please connect your wallet to play.');
    return;
  }

  const walletAddress = getWalletAddress();
  console.log('💰 Wallet address:', walletAddress);

  // Step 2: Check token balance
  const tokenConfig = getTokenConfig();
  if (tokenConfig.enableGate) {
    console.log('🔒 Token gatekeeping enabled, checking balance...');
    
    const balanceCheck = await checkCurrentWalletBalance();
    console.log('💰 Balance check result:', balanceCheck);

    if (!balanceCheck.hasAccess) {
      // Show token gate modal with balance info
      showTokenGateModal(
        `Insufficient token balance. You need at least ${balanceCheck.formattedRequired} tokens to play.`,
        balanceCheck
      );
      return;
    }

    console.log('✅ Token balance sufficient, starting game...');
  }

  // Step 3: Proceed with game start (existing code)
  // Initialize game if not already initialized
  if (typeof window.initializeGame === 'function') {
    console.log('🎯 Calling initializeGame()');
    window.initializeGame();
  } else {
    console.error('❌ initializeGame is not a function!');
  }

  gameState.isMenuVisible = false;
  gameState.isGameRunning = true;
  gameState.isPaused = false;
  gameState.isGameOver = false;

  // Hide main menu
  const mainMenu = document.getElementById('mainMenuOverlay');
  if (mainMenu) {
    mainMenu.classList.add('main-menu-overlay-hidden');
    mainMenu.classList.remove('main-menu-overlay-visible');
  }

  // Show game container
  const gameContainer = document.querySelector('.game-container');
  if (gameContainer) {
    gameContainer.classList.add('game-container-visible');
    gameContainer.classList.remove('game-container-hidden');
  }

  // Reinitialize responsive canvas
  if (typeof ResponsiveCanvas !== 'undefined' && ResponsiveCanvas.isInitialized) {
    ResponsiveCanvas.setupResponsiveSizing();
  }

  // Start the game
  if (typeof restart === 'function') {
    restart();
  }
}

/**
 * Show token gate modal when requirements not met
 */
function showTokenGateModal(message, balanceInfo = null) {
  // Hide main menu
  const mainMenu = document.getElementById('mainMenuOverlay');
  if (mainMenu) {
    mainMenu.classList.add('main-menu-overlay-hidden');
    mainMenu.classList.remove('main-menu-overlay-visible');
  }

  // Create or show token gate modal
  let modal = document.getElementById('tokenGateModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'tokenGateModal';
    modal.className = 'token-gate-modal token-gate-modal-visible';
    
    const content = document.createElement('div');
    content.className = 'token-gate-content';
    
    content.innerHTML = `
      <h2>🔒 Token Required</h2>
      <div class="token-gate-message" id="tokenGateMessage"></div>
      <div class="token-balance-info" id="tokenBalanceInfo"></div>
      <div class="token-gate-actions">
        <button class="menu-btn primary" id="tokenGateConnectBtn" onclick="showWalletModal()">
          🔗 Connect Wallet
        </button>
        <button class="menu-btn" id="tokenGateBuyBtn" onclick="openTokenPurchase()">
          💰 Get Tokens
        </button>
        <button class="menu-btn" onclick="hideTokenGateModal()">
          ← Back to Menu
        </button>
      </div>
    `;
    
    modal.appendChild(content);
    document.querySelector('.viewport-container').appendChild(modal);
  }

  // Update message
  const messageEl = document.getElementById('tokenGateMessage');
  if (messageEl) {
    messageEl.textContent = message;
  }

  // Update balance info
  const balanceInfoEl = document.getElementById('tokenBalanceInfo');
  if (balanceInfoEl && balanceInfo) {
    balanceInfoEl.innerHTML = `
      <div class="balance-display">
        <div class="balance-item">
          <span class="balance-label">Your Balance:</span>
          <span class="balance-value">${balanceInfo.formattedBalance || '0'}</span>
        </div>
        <div class="balance-item">
          <span class="balance-label">Required:</span>
          <span class="balance-value required">${balanceInfo.formattedRequired || '0'}</span>
        </div>
        ${!balanceInfo.hasAccess ? `
          <div class="balance-shortage">
            You need ${balanceInfo.formattedRequired} tokens to play.
          </div>
        ` : ''}
      </div>
    `;
  }

  // Show modal
  modal.classList.remove('token-gate-modal-hidden');
  modal.classList.add('token-gate-modal-visible');
}

/**
 * Hide token gate modal
 */
function hideTokenGateModal() {
  const modal = document.getElementById('tokenGateModal');
  if (modal) {
    modal.classList.remove('token-gate-modal-visible');
    modal.classList.add('token-gate-modal-hidden');
  }

  // Show main menu again
  const mainMenu = document.getElementById('mainMenuOverlay');
  if (mainMenu) {
    mainMenu.classList.remove('main-menu-overlay-hidden');
    mainMenu.classList.add('main-menu-overlay-visible');
  }
}

/**
 * Open token purchase page/modal
 */
function openTokenPurchase() {
  // Replace with your token purchase URL or DEX link
  const purchaseUrl = import.meta.env.VITE_TOKEN_PURCHASE_URL || 'https://sui-swap.com';
  window.open(purchaseUrl, '_blank');
}

// Make functions globally available
window.hideTokenGateModal = hideTokenGateModal;
window.openTokenPurchase = openTokenPurchase;
```

#### Step 6.5: Add Token Gate UI Styles

**`src/game/rendering/ui/token-gate-ui.css`:**
```css
.token-gate-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 3000;
  animation: fadeIn 0.3s ease;
}

.token-gate-modal-hidden {
  display: none;
}

.token-gate-content {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  padding: 40px;
  border-radius: 16px;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  border: 2px solid #667eea;
}

.token-gate-content h2 {
  color: #fff;
  margin-bottom: 20px;
  text-align: center;
  font-size: 28px;
}

.token-gate-message {
  color: #ffeb3b;
  text-align: center;
  margin-bottom: 30px;
  font-size: 16px;
  line-height: 1.5;
}

.token-balance-info {
  background: rgba(102, 126, 234, 0.1);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 30px;
  border: 1px solid rgba(102, 126, 234, 0.3);
}

.balance-display {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.balance-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.balance-label {
  color: #ccc;
  font-size: 14px;
}

.balance-value {
  color: #4CAF50;
  font-size: 18px;
  font-weight: bold;
  font-family: monospace;
}

.balance-value.required {
  color: #ff9800;
}

.balance-shortage {
  text-align: center;
  color: #ff5252;
  font-size: 14px;
  margin-top: 10px;
  padding: 10px;
  background: rgba(255, 82, 82, 0.1);
  border-radius: 8px;
}

.token-gate-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.token-gate-actions .menu-btn {
  width: 100%;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

#### Step 6.6: Pre-check Token Balance on Menu Load

Add to `src/game/systems/ui/ui-initialization.js`:

```javascript
// Add import at top
import { checkCurrentWalletBalance, getTokenConfig } from '../../blockchain/token-balance.js';
import { isWalletConnected } from '../../blockchain/wallet-connection.js';

// Add function to check and update UI
async function updateTokenGateStatus() {
  const tokenConfig = getTokenConfig();
  if (!tokenConfig.enableGate) {
    return; // Gatekeeping disabled, no need to check
  }

  const startGameBtn = document.querySelector('.menu-btn[onclick*="startGame"]');
  if (!startGameBtn) return;

  if (!isWalletConnected()) {
    // Show wallet connection required
    startGameBtn.innerHTML = '<span class="btn-icon">🔗</span> Connect Wallet to Play';
    startGameBtn.onclick = () => showWalletModal();
    return;
  }

  // Check balance
  const balanceCheck = await checkCurrentWalletBalance();
  
  if (!balanceCheck.hasAccess) {
    // Show insufficient balance message
    startGameBtn.innerHTML = `<span class="btn-icon">🔒</span> Need ${balanceCheck.formattedRequired} Tokens`;
    startGameBtn.onclick = () => {
      showTokenGateModal(
        `You need at least ${balanceCheck.formattedRequired} tokens to play.`,
        balanceCheck
      );
    };
    startGameBtn.style.opacity = '0.7';
  } else {
    // Reset button to normal
    startGameBtn.innerHTML = '<span class="btn-icon">▶️</span> Start Game';
    startGameBtn.onclick = () => startGame();
    startGameBtn.style.opacity = '1';
  }
}

// Call on menu initialization
// Add to initializeUI() function or call after menu is shown
```

#### Step 6.7: Sui Move Contract for Token Checks (Optional)

If you want to add on-chain validation, create a Move module:

**`suitwo_game/sources/token_gate.move`:**
```move
module suitwo_game::token_gate {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;

    /// Check if player has sufficient token balance
    public fun check_token_balance(
        coins: vector<Coin<SUI>>,
        min_balance: u64
    ): bool {
        let total = 0;
        let i = 0;
        let len = vector::length(&coins);
        
        while (i < len) {
            let coin = vector::borrow(&coins, i);
            total = total + coin::value(coin);
            i = i + 1;
        };
        
        total >= min_balance
    }

    #[test]
    fun test_check_token_balance() {
        // Add test cases here
    }
}
```

---

### **Token Gatekeeping Configuration Options**

#### **Configuration Levels:**

1. **Disabled:** No token requirement (for testing/public access)
2. **Soft Gate:** Check balance but allow with warning
3. **Hard Gate:** Require balance to start game (recommended)
4. **Tiered Access:** Different token amounts for different features

#### **Environment Variables:**
```env
# Enable/disable gatekeeping
ENABLE_TOKEN_GATE=true

# Token configuration
GAME_TOKEN_TYPE=0x1234...abcd  # Your token's type
MIN_TOKEN_BALANCE=1000000000   # Minimum required (in smallest unit)
TOKEN_DECIMALS=9               # Token decimals

# Alternative: Multiple token types (NFTs, different tokens)
SUPPORTED_TOKEN_TYPES=0x1234...,0x5678...

# Tiered access (optional)
TIER_1_MIN_BALANCE=1000000000   # Basic access
TIER_2_MIN_BALANCE=5000000000   # Premium access
TIER_3_MIN_BALANCE=10000000000  # VIP access
```

---

### **Testing Token Gatekeeping**

1. **Test Cases:**
   - ✅ Wallet connected, sufficient balance → Game starts
   - ❌ Wallet connected, insufficient balance → Modal shown
   - ❌ No wallet connected → Connect wallet prompt
   - ⚠️ Network error → Fallback behavior
   - 🔄 Balance changes during session → Re-check on restart

2. **Edge Cases:**
   - Player spends tokens mid-game (handle gracefully)
   - Multiple token types (check all or any)
   - Token transfer during balance check (race condition)
   - Backend unavailable (fallback to direct RPC)

---

### **Integration Checklist**

- [ ] Token type configured in environment variables
- [ ] Minimum balance requirement set
- [ ] Frontend balance checking implemented
- [ ] Backend API endpoint created
- [ ] `startGame()` function modified to check balance
- [ ] Token gate modal UI created
- [ ] Error handling for network failures
- [ ] Balance display in UI
- [ ] Token purchase link configured
- [ ] Testing with testnet tokens
- [ ] Production token type configured

---

## 📊 Migration Strategy

### **Phase 1: Dual Mode (Recommended)**
- Keep localStorage as backup
- Submit to blockchain when wallet connected
- Display both local and on-chain leaderboards
- Gradually migrate users

### **Phase 2: Full Blockchain**
- Require wallet connection
- Remove localStorage leaderboard
- All scores verified on-chain

---

## 🚀 Next Steps

1. **Review this document** and your existing backend code
2. **Copy backend code** into `backend/` directory
3. **Install dependencies** for Sui SDK
4. **Set up database** schema
5. **Create Sui service** module
6. **Implement API routes** for scores and leaderboard
7. **Add wallet connection** to frontend
8. **Update leaderboard system** to use backend
9. **Deploy to testnet** and test
10. **Iterate and improve** based on feedback

---

## 📚 Resources

- **Sui Documentation:** https://docs.sui.io/
- **Sui TypeScript SDK:** https://github.com/MystenLabs/sui/tree/main/sdk/typescript
- **Sui Move Language:** https://docs.sui.io/build/move
- **Wallet Adapter:** https://github.com/MystenLabs/sui/tree/main/sdk/wallet-adapter

---

## ❓ Questions to Consider

1. **Rewards/NFTs:** Do you want to mint NFTs for achievements?
2. **Gas Fees:** Who pays gas fees? (Players or your platform?)
3. **Privacy:** Should scores be public or private?
4. **Leaderboard Size:** How many entries to show? (100? 1000?)
5. **Verification:** Real-time or batch verification?

---

**Good luck with your integration! 🚀**

If you have questions about any specific step, feel free to ask!

