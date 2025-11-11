# Blockchain Integration Checklist

## 🔍 Pre-Integration Considerations

### **1. Game Statistics Tracking**

**Currently Tracked:**
- ✅ `game.score` - Total score
- ✅ `game.distance` - Distance traveled
- ✅ `game.coins` - Coins collected
- ✅ `game.bossesDefeated` - Number of bosses defeated
- ✅ `game.currentTier` - Current tier (1-4)
- ✅ `game.lives` - Lives remaining
- ✅ `game.projectileLevel` - Magic orb level (1-6)
- ✅ `game.enemiesDefeated` - Number of enemies defeated (required for performance burn) **COMPLETED**
- ✅ `game.bossTiers[]` - Array tracking tier of each boss defeated (for accurate burn calculation) **COMPLETED**

**Implementation Details:**
- ✅ `enemiesDefeated` counter increments in `checkProjectileEnemyCollision()` when enemy HP reaches 0
- ✅ `bossTiers` array populated when boss is defeated: `game.bossTiers.push(game.currentTier)`
- ✅ Both stats initialized in game object and reset in `restart()` function
- ✅ All stats verified on game over screen and real-time gameplay stats panel

**Note:** ✅ We use `game.distance` (already tracked) for validation - no duration calculation needed!

---

### **2. Wallet Connection Flow**

**Required Flow:**
1. ✅ Front Page → User clicks "Enter Game"
2. ✅ Main Menu appears → Shows wallet connection UI
3. ✅ User clicks "Connect Wallet" → Sui Wallet extension prompt
4. ✅ Wallet connected → Check token balance
5. ✅ Token balance sufficient → Enable "Start Game" button
6. ✅ User clicks "Start Game" → Game begins

**Status:** ✅ **COMPLETED** - Implemented in `wallet-module/`, `index.html`, and `menu-system.js`

**Implementation Details:**
- ✅ Wallet connection UI integrated into main menu (`index.html`)
- ✅ React-based wallet API module using `@mysten/dapp-kit` (`wallet-module/src/wallet-api.jsx`)
- ✅ Supports multiple Sui wallets: Slush, Sui Wallet, Surf, Suiet, Ethos, OKX, Phantom, Klever, Trust, Coinbase
- ✅ Token balance checking integrated (`checkMEWSBalance()` function)
- ✅ "Start Game" button enable/disable logic implemented
- ✅ Requirements notice UI shows connection and balance status dynamically
- ✅ Balance checked on wallet connection and before game start

---

### **3. Score Submission Flow**

**Required Flow:**
1. ✅ Game ends → Collect all statistics
2. ✅ Calculate performance burn (if enabled)
3. ✅ Show payment selection UI (Pay-per-game or Subscription)
4. ✅ User selects payment method
5. ✅ Process payment (SUI or $Mews)
6. ✅ Submit score to blockchain ✅ **IMPLEMENTED**
7. ✅ Verify transaction ✅ **IMPLEMENTED**
8. ✅ Update leaderboard

**Status:** ✅ **Score Submission Implemented** - Pending contract deployment

**Completed:**
- ✅ Score submission UI integrated in `leaderboard-system.js`
- ✅ Transaction building and signing implemented in `score-submission.js`
- ✅ Wallet API includes `signAndExecuteTransaction()` method
- ✅ UI feedback: loading states, success/error messages
- ✅ Collects all game statistics: score, distance, coins, bosses_defeated, enemies_defeated, longest_coin_streak
- ✅ Error handling: wallet connection checks, transaction failures, user rejection
- ⏳ **Pending**: Contract deployment to testnet (needs package ID)

**Action Required:**
- ⏳ Deploy contract to testnet
- ⏳ Configure package ID in frontend
- ⏳ Test end-to-end score submission
- [ ] Implement payment processing (Phase 5)
- [ ] Integrate with leaderboard system (Phase 4.3)

---

### **4. Performance Burn Calculation**

**Required Metrics:**
- ✅ Enemies defeated → 1 $Mews per enemy
- ✅ Bosses defeated → Tier-based (100/150/200/250 per tier)
- ✅ Distance traveled → 10 $Mews per 100 units
- ✅ Coins collected → 0.1 $Mews per coin (or 0.05 kickback)
- ✅ Score bonus → 10 $Mews per 1000 points

**Status:** Documented in `05a-gas-fees-and-payments.md` and `05b-performance-burn-balance-notes.md`

**Action Required:**
- Create `PerformanceTracker` class
- Integrate with game events (enemy defeat, boss defeat, etc.)
- Calculate burn at game end
- Display burn breakdown to user

---

### **5. Smart Contract Requirements**

**Required Contracts:**
- ✅ Game Score Contract (`score_submission.move`) - Score submission with anti-cheat ⭐ **COMPLETED**
- ✅ Token Burn Contract (`token_burn.move`) - Performance-based burning (design complete, implementation pending)
- ✅ Subscription Contract (`subscription.move`) - Monthly subscriptions (design complete, implementation pending)

**Status:** ✅ **Score Submission Contract COMPLETED** - Ready for testnet deployment

**Completed:**
- ✅ Contract created: `contracts/suitwo_game/sources/score_submission.move`
- ✅ Module: `suitwo_game::score_submission`
- ✅ Function: `submit_game_session()` with all required parameters
- ✅ Anti-cheat validation: distance, score, coins, streak validation
- ✅ Event emission: `ScoreSubmitted` event for leaderboard queries
- ✅ Contract compiles successfully
- ✅ Deployment guide created: `contracts/suitwo_game/DEPLOYMENT.md`
- ✅ Build warnings fixed

**Action Required:**
- ⏳ Deploy `score_submission.move` contract to testnet
- ⏳ Test all contract functions
- ⏳ Verify events emit correctly
- ⏳ Get contract package ID for environment variables
- [ ] Implement token burn contract (Phase 5)
- [ ] Implement subscription contract (Phase 5)

---

### **6. Backend API Routes**

**Required Endpoints:**
- ✅ `POST /api/scores/submit-with-payment` - Submit score with payment
- ✅ `GET /api/leaderboard` - Get leaderboard from blockchain
- ✅ `GET /api/tokens/balance/:address` - Check token balance
- ✅ `GET /api/subscription/check/:address` - Check subscription status
- ✅ `GET /health` - Health check

**Status:** Documented in `03-sui-sdk-integration.md`

**Action Required:**
- Implement all API routes
- Test all endpoints
- Verify blockchain queries work
- Test payment processing

---

### **7. Frontend Modules**

**Required Modules:**
- ✅ `wallet-module/src/wallet-api.jsx` - Wallet connection and balance checking ⭐ **COMPLETED**
- ✅ `wallet-api.umd.cjs` - Bundled UMD module with React included ⭐ **COMPLETED**
- ✅ Balance checking integrated (`checkMEWSBalance()`, `getBalanceStatus()`) ⭐ **COMPLETED**
- ✅ Integration with `menu-system.js` ⭐ **COMPLETED**
- ✅ `src/game/blockchain/score-submission.js` - Score submission and transaction signing ⭐ **COMPLETED**
- ✅ Transaction signing integrated (`signAndExecuteTransaction()` method) ⭐ **COMPLETED**
- [ ] `burn-calculator.js` - Performance burn calculation (for Phase 5)
- [ ] Integration with `leaderboard-system.js` (for Phase 4.3)

**Status:** ✅ **Score Submission Module COMPLETED** - Pending contract deployment

**Completed Implementation:**
- ✅ Wallet connection module created (`wallet-module/`)
- ✅ React-based using `@mysten/dapp-kit` for wallet detection and connection
- ✅ UMD bundle created with Vite for vanilla JS integration
- ✅ Direct Sui blockchain queries for token balance (no backend API needed)
- ✅ Integrated into main menu with UI components
- ✅ Error handling, React Error Boundaries, and wallet detection polling implemented
- ✅ Multi-wallet support via Wallet Standard API
- ✅ Score submission module (`score-submission.js`) with transaction building and signing
- ✅ Integrated with wallet API for transaction execution
- ✅ UI feedback for transaction status (loading, success, error)
- ⏳ **Pending**: Contract deployment to testnet (needs package ID configuration)

---

### **8. Environment Configuration**

**Required Variables:**

**Frontend (`public/config.js`):**
- ✅ `API_BASE_URL` - Backend API URL
- ✅ `SUI_NETWORK` - testnet or mainnet
- ✅ `MEWS_TOKEN_TYPE_ID` - Token type ID
- ✅ `MIN_TOKEN_BALANCE` - Minimum balance required
- ✅ `GAME_SCORE_CONTRACT` - Contract address
- ✅ `SUBSCRIPTION_CONTRACT` - Contract address
- ✅ `TOKEN_BURN_CONTRACT` - Contract address
- ✅ All object IDs

**Backend (`backend/.env`):**
- ✅ `SUI_NETWORK` - testnet or mainnet
- ✅ `GAME_SCORE_CONTRACT` - Contract address
- ✅ `GAME_WALLET_PRIVATE_KEY` - Backend wallet (for sponsored transactions)
- ✅ `MEWS_TOKEN_TYPE_ID` - Token type ID
- ✅ `MIN_TOKEN_BALANCE` - Minimum balance required
- ✅ All contract addresses and object IDs

**Status:** Documented in `06-testing-deployment.md`

**Action Required:**
- Create template config files
- Document all required variables
- Set up testnet configuration
- Prepare for mainnet configuration

---

### **9. Testing Requirements**

**Testnet Testing:**
- ✅ Deploy contracts to testnet
- ✅ Deploy backend to Render (testnet)
- ✅ Deploy frontend to Vercel (testnet)
- ✅ Test wallet connection
- ✅ Test token gatekeeping
- ✅ Test score submission
- ✅ Test payment flows (SUI and $Mews)
- ✅ Test subscription system
- ✅ Test performance burn
- ✅ Test leaderboard queries

**Status:** Documented in `06-testing-deployment.md`

**Action Required:**
- Complete all testnet testing
- Fix any bugs found
- Verify all features work
- Document test results

---

### **10. Security Considerations**

**Required Security Measures:**
- ✅ Wallet signature verification (transaction-based)
- ✅ Score validation (smart contract handles this - primary layer)
- ✅ Rate limiting (optional for MVP)
- ✅ CORS configuration
- ✅ Environment variable security
- ✅ Private key security (backend wallet)

**Status:** Documented in `08-security-considerations.md`

**Action Required:**
- Review security measures
- Implement rate limiting if needed
- Secure private keys
- Configure CORS properly

---

### **11. Render Free Tier Optimization**

**Required for Free Tier:**
- ✅ `/health` endpoint (fast, no blockchain queries)
- ✅ Keep-alive service (UptimeRobot) to prevent spin-down
- ✅ Client-side caching (leaderboard, token balance)
- ✅ Backend caching (optional, for performance)

**Status:** Documented in `RENDER_FREE_TIER_OPTIMIZATION.md`

**Action Required:**
- Add `/health` endpoint to backend
- Set up UptimeRobot monitor (ping every 5 minutes)
- Implement client-side caching in frontend
- Test keep-alive prevents spin-down

---

## ✅ Completed Items

### **1. Enemies Defeated Tracking** ✅
**Priority:** HIGH (Required for performance burn)
**Location:** `src/game/main.js` (line 577) and `restart()` function
**Status:** ✅ COMPLETED - Counter increments when enemies are destroyed

### **2. Boss Tier Tracking** ✅
**Priority:** MEDIUM (For accurate burn calculation)
**Location:** `src/game/main.js` (line 745) and `restart()` function
**Status:** ✅ COMPLETED - Tracks `game.bossTiers.push(game.currentTier)` when boss defeated

### **4. Performance Tracker Integration**
**Priority:** HIGH (Required for performance burn)
**Location:** Create `src/game/blockchain/burn-calculator.js`
**Action:** Integrate with game events (enemy defeat, boss defeat, etc.)

---

## ✅ What's Complete

- ✅ Smart contract implementation (`score_submission.move`) - Ready for deployment
- ✅ Score submission UI and transaction signing - Fully implemented
- ✅ Wallet connection module - Complete with multi-wallet support
- ✅ Token gatekeeping - Implemented with balance checking
- ✅ Backend architecture (separate backend on Render)
- ✅ Frontend architecture (vanilla JS, no build step)
- ✅ Payment system design (pay-per-game + subscription)
- ✅ Performance burn system design
- ✅ Token gatekeeping strategy
- ✅ Deployment strategy (Vercel + Render)
- ✅ Testing strategy (testnet first)

---

## 📋 Implementation Order

1. **Phase 1: Backend Setup**
   - Create `backend/` directory
   - Install dependencies
   - Set up basic server
   - Configure environment variables

2. **Phase 2: Smart Contracts**
   - Deploy to testnet
   - Test all functions
   - Get contract addresses

3. **Phase 3: Backend API**
   - Implement Sui service
   - Create API routes
   - Test endpoints

4. **Phase 4: Frontend Modules**
   - Create wallet connection module
   - Create API client
   - Create burn calculator
   - Add game statistics tracking

5. **Phase 5: Integration**
   - Integrate wallet connection in main menu
   - Integrate token gatekeeping
   - Integrate score submission
   - Integrate leaderboard

6. **Phase 6: Testing**
   - Test on testnet
   - Set up Render free tier optimization
   - Fix bugs
   - Verify all features

7. **Phase 7: Deployment**
   - Deploy to mainnet (after testnet success)
   - Monitor closely
   - Launch!

---

## 🔗 Related Documents

- [01. Overview & Architecture](./01-overview-and-architecture.md)
- [02. Backend Setup](./02-backend-setup.md)
- [03. Sui SDK Integration](./03-sui-sdk-integration.md)
- [04. Frontend Integration](./04-frontend-integration.md)
- [05. Smart Contracts](./05-smart-contracts.md)
- [05a. Gas Fees & Payments](./05a-gas-fees-and-payments.md)
- [05b. Performance Burn Balance Notes](./05b-performance-burn-balance-notes.md)
- [06. Testing & Deployment](./06-testing-deployment.md)
- [07. Token Gatekeeping](./07-token-gatekeeping.md)
- [08. Security Considerations](./08-security-considerations.md)
- [Render Free Tier Optimization](./RENDER_FREE_TIER_OPTIMIZATION.md) - **Important for free tier**
- [TIER_SYSTEM.md](./TIER_SYSTEM.md) - Understanding game tiers

---

**Last Updated:** 2025-01-15
**Status:** Phase 4 (Score Submission) ✅ COMPLETED - Ready for Contract Deployment

