# Implementation Roadmap

## 📋 Overview

This document provides a prioritized, step-by-step implementation order for integrating Sui blockchain functionality into your shooter game. Tasks are organized by priority and dependency to ensure efficient development.

**Document Type:** Implementation Roadmap / Build Order

---

## 🎯 Priority Levels

- 🔴 **MVP Critical** - Required for launch (cannot skip)
- 🟡 **MVP Important** - Should have for launch (recommended)
- 🟢 **Post-MVP** - Nice to have (can add later)
- ⚪ **Optional** - Enhancements (not required)

---

## Phase 1: Foundation Setup (Week 1)

### 🔴 **1.1 Game Statistics Tracking** (MVP Critical) ⭐ **START HERE**
**Estimated Time:** 1-2 hours  
**Dependencies:** None  
**Blocks:** Score submission, burn calculation

**Tasks:**
- [ ] Add `game.enemiesDefeated` counter:
  - Increment in enemy collision/destruction logic
  - Reset at game start
- [ ] Add `game.bossTiers` array:
  - Track tier when each boss is defeated: `game.bossTiers.push(game.currentTier)`
  - Reset at game start
- [ ] Verify all stats are collected at game end:
  - `game.score`
  - `game.distance`
  - `game.coins`
  - `game.bossesDefeated`
  - `game.currentTier`
  - `game.enemiesDefeated` (new)
  - `game.bossTiers` (new)

**Why First:** 
- ✅ **Quickest task** (1-2 hours vs 2-6 hours for others)
- ✅ **Zero dependencies** - can start immediately
- ✅ **Quick win** - builds momentum
- ✅ **Required** for score submission and burn calculation
- ✅ **Low risk** - simple code changes

**Files to Modify:**
- `src/game/main.js` (or enemy collision system)
- Boss defeat logic

**Note:** Start here! This gives you immediate progress and unblocks everything else.

---

### 🔴 **1.2 Backend Infrastructure** (MVP Critical)
**Estimated Time:** 2-3 hours  
**Dependencies:** None (can parallel with 1.3)  
**Blocks:** All backend work

**Tasks:**
- [ ] Create `backend/` directory structure
- [ ] Initialize Node.js project (`package.json`)
- [ ] Install core dependencies:
  - `express` (server)
  - `@mysten/sui.js` (Sui SDK)
  - `cors` (CORS middleware)
  - `dotenv` (environment variables)
- [ ] Set up basic Express server (`server.js`)
- [ ] Create `.env` template file
- [ ] Add `/health` endpoint (fast, no blockchain queries) - **Required for Render free tier**
- [ ] Test server runs locally

**Why Critical:** Backend API work depends on infrastructure being ready. Can be done in parallel with smart contracts.

**Files to Create:**
- `backend/server.js`
- `backend/package.json`
- `backend/.env.example`
- `backend/.gitignore`

---

### 🔴 **1.3 Smart Contracts - Core Game Score** (MVP Critical)
**Estimated Time:** 4-6 hours  
**Dependencies:** None (can parallel with backend setup)  
**Blocks:** Score submission, leaderboard

**Tasks:**
- [ ] Set up Move development environment
- [ ] Create `game.move` contract:
  - `GameSession` struct
  - `submit_game_session()` function
  - `ScoreSubmitted` event
  - Anti-cheat validation functions
- [ ] Deploy to **testnet**
- [ ] Test contract functions:
  - Valid score submission
  - Invalid score rejection (anti-cheat)
  - Event emission
- [ ] Get contract address and object ID
- [ ] Document contract addresses

**Why Critical:** All score submissions depend on this contract. Can develop in parallel with backend infrastructure.

**Files to Create:**
- `contracts/game/sources/game.move`
- `contracts/game/Move.toml`

**Note:** Deploy to testnet immediately - don't wait for mainnet!

**Note:** Tasks 1.2 and 1.3 can be done in parallel after completing 1.1.

---

## Phase 2: Backend API Development (Week 1-2)

### 🔴 **2.1 Sui Service Module** (MVP Critical)
**Estimated Time:** 3-4 hours  
**Dependencies:** 1.1, 1.2  
**Blocks:** All API routes

**Tasks:**
- [ ] Create `backend/services/suiService.js`:
  - Initialize Sui client (testnet)
  - Connect to Sui network
  - Get contract addresses from env
- [ ] Implement helper functions:
  - `getTokenBalance(address, tokenType)`
  - `verifyTransaction(txHash)`
  - `queryEvents(eventType)` (for leaderboard)
- [ ] Test connection to Sui testnet
- [ ] Handle errors gracefully

**Why Critical:** All blockchain interactions go through this service.

**Files to Create:**
- `backend/services/suiService.js`

---

### 🔴 **2.2 Core API Routes** (MVP Critical)
**Estimated Time:** 4-5 hours  
**Dependencies:** 2.1  
**Blocks:** Frontend integration

**Tasks:**
- [ ] Create `backend/routes/` directory
- [ ] `GET /api/tokens/balance/:address` - Check token balance (required for gatekeeping)
- [ ] `GET /api/leaderboard` - Query blockchain events for top scores
- [ ] `POST /api/scores/verify` - Verify transaction hash (optional, for MVP)
- [ ] `GET /health` - Health check (already done in 1.1)
- [ ] Add error handling middleware
- [ ] Add CORS configuration
- [ ] Test all endpoints locally

**Why Critical:** Frontend needs these endpoints to function.

**Files to Create:**
- `backend/routes/tokens.js`
- `backend/routes/scores.js`
- `backend/routes/leaderboard.js`

**Note:** Keep routes simple for MVP - can add payment processing later.

---

## Phase 3: Frontend Wallet Integration (Week 2)

### 🔴 **3.1 Wallet Connection Module** (MVP Critical)
**Estimated Time:** 3-4 hours  
**Dependencies:** None (can parallel with backend)  
**Blocks:** Token gatekeeping, score submission

**Tasks:**
- [ ] Create `src/game/blockchain/wallet-connection.js`:
  - Detect Sui wallet extension
  - Connect/disconnect wallet
  - Get wallet address
  - Handle wallet events (connect/disconnect)
- [ ] Create wallet connection UI:
  - "Connect Wallet" button
  - Wallet address display
  - Connection status indicator
- [ ] Integrate with main menu
- [ ] Test wallet connection flow

**Why Critical:** Users must connect wallet to play (token gatekeeping requirement).

**Files to Create:**
- `src/game/blockchain/wallet-connection.js`
- Update `src/game/systems/menu/menu-system.js` (or relevant menu file)

---

### 🔴 **3.2 API Client Module** (MVP Critical)
**Estimated Time:** 2-3 hours  
**Dependencies:** 2.2  
**Blocks:** Token gatekeeping, leaderboard

**Tasks:**
- [ ] Create `src/game/blockchain/api-client.js`:
  - `getTokenBalance(address)` - Check balance
  - `getLeaderboard()` - Fetch leaderboard
  - `verifyTransaction(txHash)` - Verify transaction
  - Error handling
  - Request timeouts
- [ ] Configure API base URL (`public/config.js` or env)
- [ ] Add retry logic for failed requests
- [ ] Test API communication

**Why Critical:** Frontend needs to communicate with backend.

**Files to Create:**
- `src/game/blockchain/api-client.js`
- `public/config.js` (or `config.example.js`)

---

### 🔴 **3.3 Token Gatekeeping UI** (MVP Critical)
**Estimated Time:** 2-3 hours  
**Dependencies:** 3.1, 3.2  
**Blocks:** Game access

**Tasks:**
- [ ] Add token balance check after wallet connection
- [ ] Create gate UI in main menu:
  - Display current balance
  - Show minimum required (500,000 $Mews)
  - "Start Game" button (disabled if insufficient)
  - Error message if balance too low
- [ ] Implement balance check logic:
  - Call API after wallet connect
  - Compare balance to minimum
  - Enable/disable "Start Game" button
- [ ] Test gatekeeping flow

**Why Critical:** Game requires 500,000 $Mews minimum - hard gate.

**Files to Modify:**
- `src/game/systems/menu/menu-system.js` (or relevant menu file)
- Update wallet connection integration

---

## Phase 4: Score Submission (Week 2-3)

### 🔴 **4.1 Score Submission UI** (MVP Critical)
**Estimated Time:** 3-4 hours  
**Dependencies:** 3.1, 3.2, 1.3  
**Blocks:** Blockchain score submission

**Tasks:**
- [ ] Create score submission UI (game over screen):
  - Display game statistics
  - "Submit Score" button
  - Transaction status indicator
  - Success/error messages
- [ ] Collect all game statistics:
  - `score`, `distance`, `coins`, `bossesDefeated`, `currentTier`
  - `enemiesDefeated`, `bossTiers` (from Phase 1.3)
- [ ] Integrate with game over flow
- [ ] Test UI flow

**Why Critical:** Users need to submit scores to blockchain.

**Files to Create:**
- `src/game/blockchain/score-submission.js`
- Update game over UI

---

### 🔴 **4.2 Blockchain Transaction Signing** (MVP Critical)
**Estimated Time:** 4-5 hours  
**Dependencies:** 4.1, 1.2  
**Blocks:** Score submission completion

**Tasks:**
- [ ] Create transaction builder:
  - Build Move call to `submit_game_session()`
  - Include all game statistics
  - Set gas budget
  - Generate transaction bytes
- [ ] Sign transaction with wallet:
  - Request wallet signature
  - Handle user rejection
  - Handle errors
- [ ] Submit transaction to Sui:
  - Send signed transaction
  - Wait for confirmation
  - Get transaction hash
- [ ] Verify transaction success:
  - Check transaction status
  - Verify event emission
  - Handle failures
- [ ] Update UI based on result

**Why Critical:** Core functionality - submitting scores to blockchain.

**Files to Create:**
- `src/game/blockchain/transaction-builder.js`
- Update `src/game/blockchain/score-submission.js`

**Note:** This is the most complex part - take time to test thoroughly!

---

### 🟡 **4.3 Leaderboard Integration** (MVP Important)
**Estimated Time:** 2-3 hours  
**Dependencies:** 2.2, 3.2  
**Blocks:** None (can add later)

**Tasks:**
- [ ] Query blockchain events for scores:
  - Call `/api/leaderboard` endpoint
  - Parse `ScoreSubmitted` events
  - Sort by score (descending)
  - Limit to top 100
- [ ] Display leaderboard:
  - Integrate with existing leaderboard UI
  - Show wallet address (truncated)
  - Show score, tier, distance, etc.
  - Handle loading states
- [ ] Add refresh functionality
- [ ] Test leaderboard display

**Why Important:** Leaderboards are a key feature, but not blocking for MVP.

**Files to Modify:**
- `src/game/systems/leaderboard/leaderboard-system.js` (or relevant file)
- Update API client if needed

---

## Phase 5: Payment System (Week 3-4)

### 🟡 **5.1 Payment UI & Flow** (MVP Important)
**Estimated Time:** 3-4 hours  
**Dependencies:** 4.1, 4.2  
**Blocks:** Payment processing

**Tasks:**
- [ ] Create payment selection UI:
  - "Pay-Per-Game" option ($0.01)
  - "Subscription" option ($10/month) - if subscribed
  - Payment method selection (SUI or $Mews)
  - Show costs clearly
- [ ] Integrate with score submission flow:
  - Show payment UI before transaction
  - Get user selection
  - Proceed with payment
- [ ] Handle payment errors
- [ ] Test payment flow

**Why Important:** Needed for revenue generation, but can start with pay-per-game only.

**Files to Create:**
- `src/game/blockchain/payment-ui.js`
- Update score submission flow

---

### 🟡 **5.2 Smart Contract - Token Burn** (MVP Important)
**Estimated Time:** 3-4 hours  
**Dependencies:** 1.2  
**Blocks:** Performance burn

**Tasks:**
- [ ] Create `token_burn.move` contract:
  - `burn_tokens()` function
  - Burn amount validation
  - Event emission
- [ ] Deploy to testnet
- [ ] Test burn function
- [ ] Get contract address

**Why Important:** Performance burn is a key feature, but can be added post-MVP.

**Files to Create:**
- `contracts/token_burn/sources/token_burn.move`

---

### 🟡 **5.3 Performance Burn Calculator** (MVP Important)
**Estimated Time:** 2-3 hours  
**Dependencies:** 5.2, 1.3  
**Blocks:** Burn functionality

**Tasks:**
- [ ] Create `src/game/blockchain/burn-calculator.js`:
  - Calculate burn from enemies defeated
  - Calculate burn from bosses (tier-based)
  - Calculate burn from distance
  - Calculate burn from coins (user choice)
  - Calculate burn from score
  - Apply skill multiplier
  - Apply min/max caps (50-2000 $Mews)
- [ ] Display burn breakdown to user
- [ ] Integrate with score submission
- [ ] Test burn calculations

**Why Important:** Cool feature, but not blocking for MVP.

**Files to Create:**
- `src/game/blockchain/burn-calculator.js`

---

### 🟡 **5.4 Payment Processing Backend** (MVP Important)
**Estimated Time:** 4-5 hours  
**Dependencies:** 5.1, 5.2  
**Blocks:** Payment completion

**Tasks:**
- [ ] Create payment API routes:
  - `POST /api/payments/process` - Process payment
  - Handle SUI payments
  - Handle $Mews payments
  - Convert $Mews to SUI for gas (if needed)
  - Sponsor transactions (if needed)
- [ ] Create subscription API routes:
  - `GET /api/subscription/check/:address` - Check subscription status
  - `POST /api/subscription/purchase` - Purchase subscription
- [ ] Implement payment verification
- [ ] Test payment flows

**Why Important:** Needed for revenue, but can simplify for MVP (pay-per-game only).

**Files to Create:**
- `backend/routes/payments.js`
- `backend/routes/subscription.js`
- `backend/services/paymentService.js`

---

### 🟡 **5.5 Smart Contract - Subscription** (MVP Important)
**Estimated Time:** 3-4 hours  
**Dependencies:** 5.4  
**Blocks:** Subscription system

**Tasks:**
- [ ] Create `subscription.move` contract:
  - `Subscription` struct
  - `purchase_subscription()` function
  - `check_subscription()` function
  - Event emission
- [ ] Deploy to testnet
- [ ] Test subscription functions
- [ ] Get contract address

**Why Important:** Subscription is valuable, but pay-per-game works for MVP.

**Files to Create:**
- `contracts/subscription/sources/subscription.move`

---

## Phase 6: Testing & Optimization (Week 4)

### 🔴 **6.1 Testnet Testing** (MVP Critical)
**Estimated Time:** 6-8 hours  
**Dependencies:** All previous phases  
**Blocks:** Mainnet deployment

**Tasks:**
- [ ] Test wallet connection:
  - Connect/disconnect
  - Multiple wallets
  - Error handling
- [ ] Test token gatekeeping:
  - Sufficient balance
  - Insufficient balance
  - Balance changes during session
- [ ] Test score submission:
  - Valid scores
  - Invalid scores (anti-cheat)
  - Transaction failures
  - Network errors
- [ ] Test payment flows:
  - Pay-per-game (SUI)
  - Pay-per-game ($Mews)
  - Subscription (if implemented)
  - Payment failures
- [ ] Test performance burn:
  - Burn calculation
  - Burn transaction
  - Burn failures
- [ ] Test leaderboard:
  - Query accuracy
  - Sorting
  - Display
- [ ] Load testing:
  - Multiple concurrent users
  - API performance
  - Blockchain query speed
- [ ] Document all bugs and issues
- [ ] Fix all critical bugs

**Why Critical:** Must test thoroughly on testnet before mainnet!

**Testing Checklist:**
- [ ] Wallet connection works
- [ ] Token gatekeeping works
- [ ] Score submission works
- [ ] Anti-cheat rejects invalid scores
- [ ] Payments work (if implemented)
- [ ] Leaderboard displays correctly
- [ ] All error cases handled
- [ ] No critical bugs remain

---

### 🟡 **6.2 Render Free Tier Optimization** (MVP Important)
**Estimated Time:** 2-3 hours  
**Dependencies:** 2.2  
**Blocks:** None (can add anytime)

**Tasks:**
- [ ] Set up UptimeRobot:
  - Create account
  - Add monitor for `/health` endpoint
  - Set ping interval (5 minutes)
  - Configure alerts
- [ ] Implement client-side caching:
  - Cache leaderboard (5-10 minutes)
  - Cache token balance (1-2 minutes)
  - Cache subscription status (5 minutes)
- [ ] Optimize backend:
  - Fast `/health` endpoint (already done)
  - Optimize leaderboard query
  - Add response caching headers
- [ ] Test keep-alive prevents spin-down
- [ ] Monitor Render usage

**Why Important:** Prevents service spin-down on free tier, reduces costs.

**Files to Modify:**
- `src/game/blockchain/api-client.js` (add caching)
- `backend/routes/leaderboard.js` (optimize query)

**Reference:** See [RENDER_FREE_TIER_OPTIMIZATION.md](./RENDER_FREE_TIER_OPTIMIZATION.md)

---

### 🟢 **6.3 Performance Optimization** (Post-MVP)
**Estimated Time:** 2-4 hours  
**Dependencies:** 6.1  
**Blocks:** None

**Tasks:**
- [ ] Add backend caching (Redis or in-memory):
  - Cache leaderboard queries
  - Cache token balances
  - Set appropriate TTLs
- [ ] Optimize API responses:
  - Minimize response size
  - Add compression
  - Batch requests where possible
- [ ] Frontend optimization:
  - Lazy load blockchain modules
  - Optimize bundle size
  - Add loading indicators
- [ ] Monitor performance metrics

**Why Post-MVP:** Can optimize after MVP launch based on real usage.

---

## Phase 7: Deployment (Week 4-5)

### 🔴 **7.1 Testnet Deployment** (MVP Critical)
**Estimated Time:** 3-4 hours  
**Dependencies:** 6.1  
**Blocks:** Mainnet deployment

**Tasks:**
- [ ] Deploy backend to Render:
  - Create Render account
  - Create new Web Service
  - Configure environment variables (testnet)
  - Set up build/deploy commands
  - Deploy
  - Set up UptimeRobot (from 6.2)
- [ ] Deploy frontend to Vercel:
  - Create Vercel account
  - Connect GitHub repository
  - Configure build settings (none - static site)
  - Set environment variables (testnet)
  - Deploy
- [ ] Test deployed services:
  - Backend health check
  - Frontend loads correctly
  - Wallet connection works
  - API calls succeed
  - Transactions work
- [ ] Monitor deployment:
  - Check logs
  - Monitor errors
  - Verify keep-alive works
- [ ] Gather testnet feedback
- [ ] Fix any deployment issues

**Why Critical:** Must deploy to testnet before mainnet!

**Deployment Checklist:**
- [ ] Backend deployed to Render
- [ ] Frontend deployed to Vercel
- [ ] Environment variables configured (testnet)
- [ ] Health check works
- [ ] Keep-alive service running
- [ ] All features work on testnet
- [ ] No critical errors

---

### 🔴 **7.2 Mainnet Deployment** (MVP Critical)
**Estimated Time:** 2-3 hours  
**Dependencies:** 7.1 (testnet stable)  
**Blocks:** Launch

**Tasks:**
- [ ] Deploy smart contracts to mainnet:
  - `game.move`
  - `token_burn.move` (if implemented)
  - `subscription.move` (if implemented)
  - Get mainnet addresses
- [ ] Update backend environment variables:
  - Change `SUI_NETWORK` to `mainnet`
  - Update contract addresses
  - Update token addresses
  - Redeploy backend
- [ ] Update frontend configuration:
  - Change `SUI_NETWORK` to `mainnet`
  - Update contract addresses
  - Update API URL if needed
  - Redeploy frontend
- [ ] Test mainnet deployment:
  - All features work
  - Transactions succeed
  - Payments work
  - No errors
- [ ] Monitor closely:
  - Transaction success rate
  - API performance
  - Error rates
  - User activity

**Why Critical:** Mainnet is the final launch!

**⚠️ WARNING:** Only deploy to mainnet after testnet is stable and thoroughly tested!

---

## 🎯 MVP Minimum Requirements

**To launch MVP, you MUST complete:**

✅ **Phase 1:** All tasks (Foundation)
  - Start with 1.1 Game Statistics Tracking ⭐
  - Then 1.2 Backend Infrastructure (can parallel with 1.3)
  - Then 1.3 Smart Contracts (can parallel with 1.2)
✅ **Phase 2:** 2.1, 2.2 (Backend API)  
✅ **Phase 3:** All tasks (Wallet Integration)  
✅ **Phase 4:** 4.1, 4.2 (Score Submission)  
✅ **Phase 6:** 6.1 (Testnet Testing)  
✅ **Phase 7:** All tasks (Deployment)

**Can Skip for MVP (add later):**
- ⚪ Payment system (Phase 5) - Can launch with free games initially
- ⚪ Performance burn (Phase 5) - Can add post-launch
- ⚪ Subscription (Phase 5) - Can add post-launch
- ⚪ Leaderboard (4.3) - Can use local storage initially

**However, recommended MVP includes:**
- 🟡 Payment system (pay-per-game minimum)
- 🟡 Leaderboard (on-chain)

---

## 📊 Estimated Timeline

**Minimum MVP (Essential Only):**
- **Week 1:** Foundation + Backend API
- **Week 2:** Frontend Wallet + Score Submission
- **Week 3:** Testing
- **Week 4:** Deployment
- **Total:** ~4 weeks

**Recommended MVP (Essential + Important):**
- **Week 1:** Foundation + Backend API
- **Week 2:** Frontend Wallet + Score Submission
- **Week 3:** Payment System + Performance Burn
- **Week 4:** Testing + Optimization
- **Week 5:** Deployment
- **Total:** ~5 weeks

**Full Feature Set:**
- **Week 1-2:** Foundation + Backend + Frontend
- **Week 3-4:** Payment System + Performance Burn + Subscription
- **Week 5:** Testing + Optimization
- **Week 6:** Deployment
- **Total:** ~6 weeks

---

## 🔄 Dependencies Graph

```
1.1 Game Statistics Tracking ⭐ START HERE
  └─> 4.1 Score Submission UI
  └─> 5.3 Burn Calculator

1.2 Backend Setup (can parallel with 1.3)
  └─> 2.1 Sui Service
      └─> 2.2 API Routes
          └─> 3.2 API Client
              └─> 3.3 Token Gatekeeping
                  └─> 4.1 Score Submission UI
                      └─> 4.2 Transaction Signing
                          └─> 6.1 Testing
                              └─> 7.1 Testnet Deployment
                                  └─> 7.2 Mainnet Deployment

1.3 Smart Contracts (can parallel with 1.2)
  └─> 4.2 Transaction Signing
  └─> 5.2 Token Burn Contract
      └─> 5.3 Burn Calculator
  └─> 5.5 Subscription Contract

3.1 Wallet Connection
  └─> 3.3 Token Gatekeeping
  └─> 4.2 Transaction Signing

4.2 Transaction Signing
  └─> 5.1 Payment UI
      └─> 5.4 Payment Processing
```

---

## 📝 Notes

1. **Testnet First:** Always test on testnet before mainnet!
2. **Parallel Work:** Some tasks can be done in parallel (e.g., backend + smart contracts)
3. **Iterative:** Build MVP first, then add features
4. **Documentation:** Update docs as you implement
5. **Testing:** Test each phase before moving to next

---

## ✅ Quick Start Checklist

For fastest MVP launch:

1. [ ] **Game statistics tracking (1.1)** ⭐ **START HERE**
2. [ ] Backend setup (1.2) - Can parallel with 1.3
3. [ ] Smart contracts - game score (1.3) - Can parallel with 1.2
4. [ ] Sui service (2.1)
5. [ ] Core API routes (2.2)
6. [ ] Wallet connection (3.1)
7. [ ] API client (3.2)
8. [ ] Token gatekeeping (3.3)
9. [ ] Score submission UI (4.1)
10. [ ] Transaction signing (4.2)
11. [ ] Testnet testing (6.1)
12. [ ] Testnet deployment (7.1)
13. [ ] Mainnet deployment (7.2) - **Only after testnet is stable!**

---

**Related Documents:**
- [Integration Checklist](./INTEGRATION_CHECKLIST.md) - Detailed task list
- [Testing & Deployment](./06-testing-deployment.md) - Deployment guide
- [Render Free Tier Optimization](./RENDER_FREE_TIER_OPTIMIZATION.md) - Optimization guide

