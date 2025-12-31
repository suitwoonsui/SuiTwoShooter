# 🎮 GAMECORE IMPLEMENTATION PLAN

## 📋 OVERVIEW
Integrate GameCore contract to provide anti-cheat protection while maintaining current shared ScoreSystem and GamePassSystem functionality.

---

## 🏗️ CURRENT ARCHITECTURE

### **Score Submission Flow (Current)**
```
Game Ends → Direct Score Submission → ScoreSystem (shared)
```

### **Target Architecture (With GameCore)**
```
Game Starts → Create GameSession → Game Ends → Validate Session → Submit Score → ScoreSystem (shared)
```

---

## 🔧 IMPLEMENTATION COMPONENTS

### **1. Frontend Session Management**
- [ ] Add `currentSessionId` state to Game component
- [ ] Create `startGameSession()` function for blockchain session creation
- [ ] Modify `endGameAndCleanup()` to use session validation
- [ ] Add session status display in UI

### **2. Backend GameCore Integration**
- [ ] Create `GameCoreService` class in backend
- [ ] Add `startGame()` method for session creation
- [ ] Add `submitScoreWithSession()` method for validated submissions
- [ ] Maintain backward compatibility with existing `submitScore()`

### **3. Smart Contract Integration**
- [ ] Ensure GameCore is properly configured with ScoreSystem
- [ ] Verify CLOCK object is available for GameCore
- [ ] Test session creation and validation flow

---

## 📝 IMPLEMENTATION DETAILS

### **Frontend Changes (Game.tsx)**

```typescript
// New state
const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

// Session creation on game start
const startGameSession = async () => {
  if (isConnected && gamePassStatus?.isActive) {
    try {
      const sessionId = await blockchainStartGame();
      setCurrentSessionId(sessionId);
      console.log('🎮 Game session created:', sessionId);
    } catch (error) {
      console.error('❌ Failed to create game session:', error);
    }
  }
};

// Modified game end
const endGameAndCleanup = async () => {
  // ... existing logic ...
  
  if (currentSessionId) {
    // Submit through GameCore (with anti-cheat)
    const success = await blockchainSubmitScoreWithSession(
      currentSessionId,
      finalCalculatedScore,
      actualClickCount,
      timeInSeconds
    );
  } else {
    // Fallback to direct submission
    const success = await blockchainSubmitScore(/* existing params */);
  }
  
  setCurrentSessionId(null); // Clear session
};
```

### **Backend Changes (New GameCoreService)**

```typescript
class GameCoreService {
  async startGame(playerAddress: string): Promise<string> {
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${process.env.PACKAGE_ID}::game_core::start_game`,
      arguments: [
        tx.object(process.env.CLOCK_ID), // Clock object
      ],
    });
    
    const result = await this.executeTransaction(tx);
    return this.extractSessionId(result);
  }
  
  async submitScoreWithSession(
    sessionId: string,
    playerAddress: string,
    finalScore: number,
    clicks: number,
    timeElapsed: number
  ): Promise<boolean> {
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${process.env.PACKAGE_ID}::game_core::submit_score`,
      arguments: [
        tx.object(sessionId), // GameSession
        tx.object(process.env.SCORE_SYSTEM_ID), // ScoreSystem
        tx.pure.u64(finalScore),
        tx.pure.u64(timeElapsed), // Endurance level
        tx.object(process.env.CLOCK_ID), // Clock
      ],
    });
    
    return await this.executeTransaction(tx);
  }
}
```

### **Environment Variables Required**
```env
# Add to existing .env
CLOCK_ID=0x... # Sui Clock object ID
GAMECORE_ID=0x... # GameCore contract ID (if separate)
```

---

## 🔄 INTEGRATION STEPS

### **Step 1: Backend Service Creation**
- [ ] Create `src/services/gameCoreService.js`
- [ ] Implement session creation and validation
- [ ] Add to existing service initialization

### **Step 2: Frontend Integration**
- [ ] Add session state management
- [ ] Integrate session creation on game start
- [ ] Modify score submission to use sessions
- [ ] Add fallback to direct submission

### **Step 3: Testing & Validation**
- [ ] Test session creation flow
- [ ] Test score submission through GameCore
- [ ] Verify anti-cheat validation works
- [ ] Ensure backward compatibility

---

## ⚠️ CONSIDERATIONS & RISKS

### **Performance Impact**
- **Additional blockchain call** for session creation
- **Potential delay** in game start (session creation)
- **Mitigation**: Create session asynchronously, don't block game start

### **User Experience**
- **Session creation failure** could prevent score submission
- **Fallback mechanism** needed for reliability
- **Clear error handling** for session issues

### **Backward Compatibility**
- **Existing score submission** method remains available
- **Gradual rollout** possible (some users with GameCore, some without)
- **Admin override** for manual score corrections

---

## 🧪 TESTING STRATEGY

### **Test Scenarios**
- [ ] **Valid Game Session**: Normal gameplay with session
- [ ] **Session Creation Failure**: Handle blockchain errors gracefully
- [ ] **Score Validation**: Ensure anti-cheat rules are enforced
- [ ] **Fallback Mode**: Direct submission when sessions fail
- [ ] **Performance**: Measure session creation overhead

### **Validation Criteria**
- [ ] **Sessions Created**: Successfully on game start
- [ ] **Scores Validated**: Anti-cheat rules enforced
- [ ] **Fallback Working**: Direct submission when needed
- [ ] **Performance Acceptable**: No significant game delay

---

## 📅 IMPLEMENTATION TIMELINE

- **Week 1**: Backend GameCore service creation
- **Week 2**: Frontend session management integration
- **Week 3**: Testing and validation
- **Week 4**: Bug fixes and optimization

**Total Estimated Time**: 4 weeks

---

## 🎯 SUCCESS METRICS

- [ ] **GameCore Integration**: Sessions created successfully
- [ ] **Anti-Cheat Active**: Invalid submissions blocked
- [ ] **Performance Maintained**: No significant game delay
- [ ] **User Experience**: Seamless gameplay with security
- [ ] **Fallback Reliability**: Direct submission works when needed

---

## 🔍 TECHNICAL SPECIFICATIONS

### **Anti-Cheat Rules (From GameCore Contract)**
- **Minimum Session Duration**: 5 seconds per game
- **Maximum Clicks Per Second**: 3 clicks (realistic human limit)
- **Session Ownership**: Only session creator can submit scores
- **Time Validation**: Reported time must match session duration

### **Session Lifecycle**
1. **Creation**: `start_game()` called when game begins
2. **Active**: Session tracks game progress
3. **Validation**: `submit_score()` validates session before accepting score
4. **Completion**: Session marked as completed, score stored in ScoreSystem

### **Error Handling**
- **Session Creation Failure**: Fall back to direct score submission
- **Session Validation Failure**: Reject score, log error details
- **Network Issues**: Retry logic with exponential backoff
- **User Feedback**: Clear error messages for session issues

---

## 📚 REFERENCES

### **Related Files**
- `src/components/Game.tsx` - Main game component to modify
- `backend/src/services/gameOwnerWallet.js` - Existing score submission
- `contracts/InsomniaGame/sources/GameCore.move` - GameCore contract
- `contracts/InsomniaGame/sources/ScoreSystem.move` - ScoreSystem integration

### **Key Functions to Implement**
- `startGameSession()` - Frontend session creation
- `GameCoreService.startGame()` - Backend session creation
- `GameCoreService.submitScoreWithSession()` - Backend validated submission
- `blockchainStartGame()` - Frontend blockchain integration
- `blockchainSubmitScoreWithSession()` - Frontend session-based submission

---

## 🚀 DEPLOYMENT CHECKLIST

### **Pre-Deployment**
- [ ] GameCore contract deployed and configured
- [ ] CLOCK object available and accessible
- [ ] ScoreSystem integration tested
- [ ] Backend services updated
- [ ] Frontend integration complete

### **Deployment**
- [ ] Environment variables updated
- [ ] Backend services restarted
- [ ] Frontend deployed
- [ ] Integration tests passed

### **Post-Deployment**
- [ ] Monitor session creation success rates
- [ ] Verify anti-cheat validation working
- [ ] Check performance metrics
- [ ] User feedback collection
- [ ] Bug fixes and optimizations

---

*Last Updated: January 2025*
*Version: 1.0 - Initial Implementation Plan*
