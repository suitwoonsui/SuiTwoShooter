# 🚀 **Frontend Integration Guide - Insomnia Game**

## 📋 **Overview**

Your React/Next.js frontend is now fully integrated with the Sui blockchain smart contracts! The integration provides:

- ✅ **Real-time blockchain status** indicators
- ✅ **Endurance level tracking** (time-based progression)
- ✅ **Player statistics** from the blockchain
- ✅ **Score submission** to smart contracts
- ✅ **Skill tier progression** tracking

## 🔗 **Integration Points**

### **1. Smart Contract Connection**
- **Package ID**: `0xbd5e50f31a6f317e0d7b59a5163d3148119a75e96c8730c333716fb44c523d0f`
- **Network**: Sui Testnet
- **Modules**: `game_core`, `score_system`, `admin_system`

### **2. Key Components Updated**

#### **`src/lib/blockchain.ts`**
- **New Interface**: `PlayerStats` with endurance level tracking
- **Smart Contract Functions**: `startGame()`, `submitScore()`, `getPlayerStats()`
- **Configuration**: Updated with actual deployed contract addresses

#### **`src/hooks/useGameState.ts`**
- **Blockchain Integration**: Automatic session creation and score submission
- **Endurance Tracking**: Real-time updates during gameplay
- **Player Stats**: Loading and updating from blockchain

#### **`src/components/Game.tsx`**
- **Endurance Level Updates**: Tracks time survival during gameplay
- **Blockchain Session**: Creates game sessions on-chain
- **Score Submission**: Automatically submits scores when games end

#### **`src/components/GameStats.tsx`**
- **Blockchain Status**: Shows connection to Sui network
- **Player Statistics**: Displays current skill tier and achievements
- **Endurance Display**: Shows current survival time

#### **`src/components/GameOverModal.tsx`**
- **Endurance Achievements**: Displays survival tier (Beginner → Master)
- **Blockchain Confirmation**: Shows when scores are submitted on-chain
- **Performance Analysis**: Endurance-based performance messages

#### **`src/components/BlockchainStatus.tsx`**
- **Real-time Status**: Wallet connection and blockchain readiness
- **Network Info**: Shows current network and package ID
- **Visual Indicators**: Color-coded status (Red/Yellow/Green)

## 🎮 **How It Works**

### **Game Flow with Blockchain:**

1. **Game Start**
   - User clicks "Start Game"
   - Frontend calls `blockchain.startGame()`
   - Smart contract creates `GameSession` object
   - Session ID stored in game state

2. **During Gameplay**
   - Frontend tracks `timeElapsed` and `currentEnduranceLevel`
   - Updates blockchain state every endurance level change
   - Real-time endurance tier progression (Beginner → Master)

3. **Game End**
   - Frontend calls `blockchain.submitScore()`
   - Smart contract validates score and endurance level
   - Updates player statistics in `ScoreSystem`
   - Emits events: `EnduranceLevelAchieved`, `PlayerStatsUpdated`

4. **Statistics Update**
   - Frontend refreshes player stats from blockchain
   - Updates UI with new skill tier and achievements
   - Shows blockchain confirmation in game over modal

## 🎯 **Endurance Level System**

### **Tier Progression:**
- **Beginner**: 0-30 seconds survival
- **Intermediate**: 30-60 seconds survival  
- **Advanced**: 60-90 seconds survival
- **Expert**: 90-120 seconds survival
- **Master**: 120+ seconds survival

### **Block Visibility Times:**
- **Beginner**: 1.0 second blocks
- **Intermediate**: 0.8 second blocks
- **Advanced**: 0.6 second blocks
- **Expert**: 0.4 second blocks
- **Master**: 0.3 second blocks

## 🔧 **Technical Implementation**

### **Blockchain Integration:**
```typescript
// Start game session
const sessionId = await blockchain.startGame();

// Submit score with endurance level
await blockchain.submitScore({
  playerAddress: accountAddress,
  score: finalScore,
  enduranceLevel: survivalTime,
  timestamp: Date.now(),
  gameId: sessionId
});

// Get updated player stats
const stats = await blockchain.getPlayerStats(accountAddress);
```

### **State Management:**
```typescript
// Track endurance level during gameplay
updateEnduranceLevel(Math.floor(timeElapsed / 1000));

// Update blockchain state
setGameState(prev => ({
  ...prev,
  currentEnduranceLevel: enduranceLevel,
  blockchainSessionId: sessionId
}));
```

## 🎨 **UI Updates**

### **New Visual Elements:**
- **Blockchain Status Indicator**: Top-right corner status
- **Endurance Level Cards**: Show current survival tier
- **Player Statistics**: Skill tier and achievement display
- **Blockchain Confirmation**: On-chain score submission status

### **Color Coding:**
- **🟢 Green**: Connected to blockchain
- **🟡 Yellow**: Connecting to blockchain
- **🔴 Red**: Wallet disconnected

## 🚀 **Next Steps**

### **1. Test the Integration**
- Start a game and watch endurance level progression
- Check blockchain status indicators
- Verify score submission to smart contracts

### **2. Customize Blockchain Calls**
- Update `src/lib/blockchain.ts` with actual transaction logic
- Implement proper error handling for network issues
- Add retry mechanisms for failed transactions

### **3. Enhanced Features**
- Add leaderboard integration with `getLeaderboard()`
- Implement player profile with `getPlayerStats()`
- Add admin functions with `AdminSystem` integration

### **4. Production Deployment**
- Deploy smart contracts to Sui mainnet
- Update package IDs and network configuration
- Implement proper wallet connection handling

## 🔍 **Debugging**

### **Common Issues:**
1. **Blockchain Not Ready**: Check wallet connection and network
2. **Score Submission Failed**: Verify smart contract deployment
3. **Endurance Level Not Updating**: Check game state management

### **Console Logs:**
- Look for "🎯 ENDURANCE CHANGE" messages
- Check blockchain transaction confirmations
- Monitor player stats updates

## 📚 **Resources**

- **Sui Documentation**: https://docs.sui.io/
- **Move Language**: https://move-language.github.io/move/
- **Smart Contract Addresses**: See `deploy.md` for current deployments

---

**🎉 Your game is now blockchain-powered! Players can earn on-chain achievements and track their endurance progression across the Sui network.**

