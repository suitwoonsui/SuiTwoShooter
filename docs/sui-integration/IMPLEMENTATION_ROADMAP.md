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

### ✅ **1.1 Game Statistics Tracking** (MVP Critical) ⭐ **COMPLETED**
**Estimated Time:** 1-2 hours  
**Dependencies:** None  
**Blocks:** Score submission, burn calculation

**Tasks:**
- [x] Add `game.enemiesDefeated` counter:
  - Increment in enemy collision/destruction logic
  - Reset at game start
- [x] Add `game.bossTiers` array:
  - Track tier when each boss is defeated: `game.bossTiers.push(game.currentTier)`
  - Reset at game start
- [x] Verify all stats are collected at game end:
  - `game.score`
  - `game.distance`
  - `game.coins`
  - `game.bossesDefeated`
  - `game.currentTier`
  - `game.enemiesDefeated` (new)
  - `game.bossTiers` (new)

**Completion Notes:**
- ✅ `enemiesDefeated` counter added and increments when enemies are destroyed in `checkProjectileEnemyCollision()`
- ✅ `bossTiers` array added and populated when bosses are defeated
- ✅ Both stats initialized in game object and reset in `restart()` function
- ✅ All stats verified on game over screen display
- ✅ Stats also displayed in real-time desktop gameplay stats panel

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

### ✅ **1.2 Backend Infrastructure** (MVP Critical) **COMPLETED**
**Estimated Time:** 2-3 hours  
**Dependencies:** None (can parallel with 1.3)  
**Blocks:** All backend work

**Tasks:**
- [x] Create `backend/` directory structure
- [x] Initialize Node.js project (`package.json`)
- [x] Install core dependencies:
  - `next` (framework)
  - `@mysten/sui` (Sui SDK)
  - `typescript` (TypeScript support)
- [x] Set up basic Next.js server
- [x] Create `.env` template file
- [x] Add `/api/health` endpoint (fast, no blockchain queries) - **Required for Render free tier**
- [x] Test server runs locally

**Completion Notes:**
- ✅ Backend restructured to Next.js with TypeScript
- ✅ All dependencies updated and deprecation warnings resolved
- ✅ Health endpoint working
- ✅ Network switching configured (mainnet/testnet via SUI_NETWORK)
- ✅ Token ID configured and verified

**Files Created:**
- `backend/app/api/health/route.ts`
- `backend/package.json`
- `backend/.env.example`
- `backend/.gitignore`
- `backend/next.config.ts`
- `backend/tsconfig.json`

---

### 🔴 **1.3 Smart Contracts - Core Game Score** (MVP Critical)
**Estimated Time:** 4-6 hours  
**Dependencies:** None (can parallel with backend setup)  
**Blocks:** Score submission, leaderboard

**Tasks:**
- [ ] Set up Move development environment
- [ ] Create `score_submission.move` contract:
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
- `contracts/suitwo_game/sources/score_submission.move`
- `contracts/game/Move.toml`

**Note:** Deploy to testnet immediately - don't wait for mainnet!

**Note:** **Recommended order:** Do Wallet Connection (3.1) BEFORE smart contracts. You can test wallet connection and token gatekeeping without contracts deployed. Smart contracts are only needed for score submission (Phase 4).

---

## Phase 2: Backend API Development (Week 1-2)

### ✅ **2.1 Sui Service Module** (MVP Critical) **COMPLETED**
**Estimated Time:** 3-4 hours  
**Dependencies:** 1.1, 1.2  
**Blocks:** All API routes

**Tasks:**
- [x] Create `backend/lib/sui/suiService.ts`:
  - Initialize Sui client (testnet/mainnet)
  - Connect to Sui network
  - Get contract addresses from env
- [x] Implement helper functions:
  - `getTokenBalance(address, tokenType)` - ✅ Verified working
  - `verifyTransaction(txHash)` - ✅ Implemented
  - `queryEvents(eventType)` (for leaderboard) - ✅ Implemented
- [x] Test connection to Sui testnet/mainnet - ✅ Verified
- [x] Handle errors gracefully - ✅ Implemented

**Completion Notes:**
- ✅ Created TypeScript SuiService class with full type safety
- ✅ Token balance checking verified working on mainnet
- ✅ All API routes integrated and using the service
- ✅ Supports both testnet and mainnet via SUI_NETWORK env variable
- ✅ Uses `getCoins()` method for reliable custom token balance queries
- ✅ Debug logging added for development

**Files Created:**
- `backend/lib/sui/suiService.ts`

---

### ✅ **2.2 Core API Routes** (MVP Critical) **COMPLETED**
**Estimated Time:** 4-5 hours  
**Dependencies:** 2.1  
**Blocks:** Frontend integration

**Tasks:**
- [x] Create API route files in `backend/app/api/`
- [x] `GET /api/tokens/balance/[address]` - Check token balance (required for gatekeeping) - ✅ Integrated with SuiService
- [x] `GET /api/leaderboard` - Query blockchain events for top scores - ✅ Integrated with SuiService
- [x] `POST /api/scores/verify` - Verify transaction hash - ✅ Integrated with SuiService
- [x] `GET /api/health` - Health check (already done in 1.2)
- [x] Add error handling - ✅ Implemented in all routes
- [x] Add CORS configuration - ✅ Configured in next.config.ts
- [x] Test all endpoints locally - ✅ Token balance endpoint verified

**Completion Notes:**
- ✅ All API routes created as Next.js API routes (TypeScript)
- ✅ Routes integrated with SuiService for blockchain interactions
- ✅ Proper error handling and validation in all endpoints
- ✅ CORS configured for frontend access
- ✅ Token balance endpoint tested and working

**Files Created:**
- `backend/app/api/tokens/balance/[address]/route.ts`
- `backend/app/api/scores/verify/route.ts`
- `backend/app/api/leaderboard/route.ts`
- `backend/app/api/health/route.ts`

---

## Phase 3: Frontend Wallet Integration (Week 2)

### ✅ **3.1 Wallet Connection Module** (MVP Critical) ⭐ **COMPLETED**
**Estimated Time:** 3-4 hours  
**Dependencies:** None (can parallel with backend)  
**Blocks:** Token gatekeeping, score submission

**Tasks:**
- [x] Create wallet connection module using React-based wallet API (`wallet-module/`):
  - Detect Sui wallet extensions (Slush, Sui Wallet, Surf, Suiet, Ethos, OKX, Phantom, Klever, Trust, Coinbase)
  - Connect/disconnect wallet using `@mysten/dapp-kit`
  - Get wallet address
  - Handle wallet events (connect/disconnect)
- [x] Create wallet connection UI:
  - "Connect Wallet" button
  - Wallet address display
  - Connection status indicator
  - $MEWS balance display
- [x] Integrate with main menu (`src/game/systems/ui/menu-system.js`)
- [x] Test wallet connection flow

**Completion Notes:**
- ✅ Created React-based wallet API module (`wallet-module/src/wallet-api.jsx`) using `@mysten/dapp-kit`
- ✅ Bundled as UMD module (`wallet-api.umd.cjs`) with React included
- ✅ Integrated into `index.html` and `src/game/systems/ui/menu-system.js`
- ✅ Supports multiple Sui wallets via Wallet Standard API
- ✅ Includes error handling, React Error Boundaries, and wallet detection polling
- ✅ Works with local HTTP server (`server.js` provided - required because browser extensions don't inject into `file://` protocol pages)
- ✅ UI shows wallet connection status, address, and balance
- ✅ Local development server: `node server.js` (serves on port 8000)

**Why Critical:** Users must connect wallet to play (token gatekeeping requirement).

**Files Created:**
- `wallet-module/src/wallet-api.jsx`
- `wallet-module/vite.config.js`
- `wallet-module/package.json`
- `wallet-module/dist/wallet-api.umd.cjs` (built bundle)
- Updated `index.html` (wallet connection UI)
- Updated `src/game/systems/ui/menu-system.js` (integration)

---

### ✅ **3.2 API Client Module** (MVP Critical) ⭐ **COMPLETED**
**Estimated Time:** 2-3 hours  
**Dependencies:** 2.2  
**Blocks:** Token gatekeeping, leaderboard

**Tasks:**
- [x] Create wallet API with blockchain integration (`wallet-module/src/wallet-api.jsx`):
  - `checkMEWSBalance(address, network)` - Check token balance using SuiClient
  - `getBalanceStatus()` - Get current balance status
  - Error handling
  - Direct Sui blockchain queries (no backend API needed for balance checks)
- [x] Configure token type ID (`MEWS_TOKEN_TYPE_ID`) in wallet module
- [x] Add BigInt support for large token balances
- [x] Test balance checking on mainnet

**Completion Notes:**
- ✅ Wallet API includes direct Sui blockchain balance checking using `SuiClient.getCoins()`
- ✅ No separate API client needed - wallet module handles blockchain queries directly
- ✅ Backend API routes (from Phase 2.2) remain available for other features (leaderboard, score verification)
- ✅ Token balance checking integrated into wallet connection flow

**Why Critical:** Frontend needs to check token balances for gatekeeping.

**Files Created:**
- `wallet-module/src/wallet-api.jsx` (includes balance checking)
- `MEWS_TOKEN_TYPE_ID` configured in wallet module

---

### ✅ **3.3 Token Gatekeeping UI** (MVP Critical) ⭐ **COMPLETED**
**Estimated Time:** 2-3 hours  
**Dependencies:** 3.1, 3.2  
**Blocks:** Game access

**Tasks:**
- [x] Add token balance check after wallet connection
- [x] Create gate UI in main menu:
  - Display current balance
  - Show minimum required (500,000 $MEWS)
  - Requirements notice with checkmarks
  - "Start Game" button (disabled if insufficient)
  - Error message if balance too low
- [x] Implement balance check logic:
  - Call `checkMEWSBalance()` after wallet connect
  - Compare balance to minimum (500,000 $MEWS)
  - Enable/disable "Start Game" button
  - Update UI dynamically based on connection and balance status
- [x] Test gatekeeping flow

**Completion Notes:**
- ✅ Requirements notice added to `index.html` showing wallet connection and $MEWS balance requirements
- ✅ Balance checking integrated into `menu-system.js` with `checkMEWSBalanceAndUpdateUI()` function
- ✅ UI updates dynamically: requirements show checkmarks when met, button enables/disables accordingly
- ✅ Balance checked both on wallet connection and before game start
- ✅ Clear user messaging: "Connect your Sui wallet" and "Have at least 500,000 $MEWS tokens"
- ✅ Tooltips on "Start Game" button explain requirements when disabled

**Why Critical:** Game requires 500,000 $MEWS minimum - hard gate.

**Files Modified:**
- `index.html` (requirements notice UI)
- `src/game/systems/ui/menu-system.js` (gatekeeping logic)
- `wallet-module/src/wallet-api.jsx` (balance checking functions)

---

## Phase 4: Score Submission (Week 2-3)

### ✅ **4.1 Score Submission UI** (MVP Critical) ⭐ **COMPLETED**
**Estimated Time:** 3-4 hours  
**Dependencies:** 3.1, 3.2, 1.3  
**Blocks:** Blockchain score submission

**Tasks:**
- [x] Create score submission UI (game over screen):
  - Display game statistics
  - "Submit Score" button
  - Transaction status indicator
  - Success/error messages
- [x] Collect all game statistics:
  - `score`, `distance`, `coins`, `bossesDefeated`
  - `enemiesDefeated`, `longestCoinStreak`
- [x] Integrate with game over flow
- [x] Test UI flow

**Completion Notes:**
- ✅ Score submission UI exists in `leaderboard-system.js`
- ✅ "Save Score" button integrated with blockchain submission
- ✅ UI feedback: toast notifications, loading states, success/error messages
- ✅ Collects all required stats from game object at game over
- ✅ Integrated with `submitScoreToBlockchain()` function (sends to backend)
- ✅ Player name input modal (optional, can skip)
- ✅ Session ID generation using `crypto.randomUUID()`
- ✅ **COMPLETED**: Contract deployed to testnet, Package ID configured

**Why Critical:** Users need to submit scores to blockchain.

**Files Created:**
- `src/game/blockchain/score-submission.js`
- Updated `src/game/systems/ui/leaderboard-system.js`

---

### ✅ **4.2 Blockchain Transaction Signing** (MVP Critical) ⭐ **COMPLETED**
**Estimated Time:** 4-5 hours  
**Dependencies:** 4.1, 1.2  
**Blocks:** Score submission completion

**Tasks:**
- [x] Create transaction builder:
  - Build Move call to `submit_game_session()`
  - Include all game statistics
  - Set gas budget
  - Generate transaction bytes
- [x] Sign transaction with wallet:
  - Request wallet signature
  - Handle user rejection
  - Handle errors
- [x] Submit transaction to Sui:
  - Send signed transaction
  - Wait for confirmation
  - Get transaction hash
- [x] Verify transaction success:
  - Check transaction status
  - Verify event emission
  - Handle failures
- [x] Update UI based on result

**Completion Notes:**
- ✅ Transaction builder implemented in `admin-wallet-service.ts` (backend)
- ✅ Uses `Transaction` from `@mysten/sui/transactions`
- ✅ Builds Move call: `{package_id}::score_submission::submit_game_session_for_player`
- ✅ Includes all game stats: score, distance, coins, bosses_defeated, enemies_defeated, longest_coin_streak
- ✅ Includes player_name (vector<u8>) and session_id (vector<u8>)
- ✅ Uses Sui Clock object (`0x6`) for timestamp
- ✅ Admin wallet signs and pays gas fees (two-wallet system)
- ✅ Error handling: validation, transaction failures, CORS errors
- ✅ UI feedback: toast notifications, success messages with transaction digest
- ✅ Gas budget set: 10,000,000 MIST (0.01 SUI)
- ✅ **COMPLETED**: Contract deployed, admin wallet configured, working on testnet
- ✅ All numeric values rounded to integers (Move contract requires u64)
- ✅ CORS configured for frontend-backend communication

**Why Critical:** Core functionality - submitting scores to blockchain.

**Files Created:**
- `src/game/blockchain/score-submission.js` (includes transaction building and signing)
- Updated `wallet-module/src/wallet-api.jsx` (added `signAndExecuteTransaction` method)

**Note:** This is the most complex part - take time to test thoroughly!

---

### 🔴 **4.3 Blockchain Leaderboard Integration** (MVP Critical)
**Estimated Time:** 2-3 hours  
**Dependencies:** 2.2, 3.2, 4.2  
**Blocks:** Leaderboard display

**Tasks:**
- [ ] Query blockchain events for scores:
  - Call `/api/leaderboard` endpoint (already exists)
  - Parse `ScoreSubmitted` events from blockchain
  - Sort by score (descending)
  - Limit to top 100
- [ ] Update frontend leaderboard UI:
  - Replace localStorage with blockchain data
  - Integrate with existing `leaderboard-system.js`
  - Show wallet address (truncated, e.g., `0x1234...5678`)
  - Display score, tier, distance, bosses defeated, etc.
  - Handle loading states
  - Show error states if blockchain query fails
- [ ] Add refresh functionality:
  - Manual refresh button
  - Auto-refresh option (optional, e.g., every 30 seconds)
- [ ] Test leaderboard display:
  - Verify scores load from blockchain
  - Test with multiple scores
  - Test error handling

**Why Critical:** Leaderboard must be tied to blockchain for transparency and competition. This is a core feature for a blockchain game.

**Files to Modify:**
- `src/game/systems/ui/leaderboard-system.js` (replace localStorage with blockchain API)
- Update to call `GET /api/leaderboard` endpoint

**Reference:** See [11. Blockchain Leaderboard Integration](./11-blockchain-leaderboard.md) for detailed implementation guide

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

### 🟡 **5.2 Premium Store System** (MVP Important) ⭐ **REQUIRED FOR BURN MECHANICS**
**Estimated Time:** 25-35 hours (total for all store components)  
**Dependencies:** 4.1, 4.2  
**Blocks:** Burn mechanics (needs revenue source)

**Why Before Burn:** Burn mechanics require funds to burn tokens. Premium store generates revenue to fund burns.

**Sub-tasks (see Phase 8 for details):**
- [ ] 5.2.1 Smart Contract - Premium Store (4-6 hours)
- [ ] 5.2.2 Premium Store Backend API (3-4 hours)
- [ ] 5.2.3 Premium Store Frontend UI (5-6 hours)
- [ ] 5.2.4 Inventory System (3-4 hours)
- [ ] 5.2.5 Premium Item Implementation (12-16 hours) ⚠️ **REQUIRES GAME CODE CHANGES**
- [ ] 5.2.6 Game Balance Adjustments (4-6 hours)
- [ ] 5.2.7 Purchase Analytics (2-3 hours)

**⚠️ IMPORTANT - Game Code Implementation Required:**
All premium items must be **coded into the existing game logic**. This includes:

**New Features (Must Be Built):**
- Slow Time Power (3 levels) - NEW feature, doesn't exist in game yet
- Destroy All Enemies Power - NEW feature, doesn't exist in game yet
- Boss Kill Shot - NEW feature, doesn't exist in game yet
- Coin Magnet / Pull Beam (3 levels) - NEW feature, doesn't exist in game yet

**Existing Features (Must Be Modified):**
- Extra Lives - Modify existing life system to support purchased lives (visual distinction, non-replenishable)
- Force Field Start - Modify existing force field system to support starting at purchased level
- Orb Level Start - Modify existing orb system to support starting at purchased level (stretch max to 10)

**Game Files to Modify:**
- `src/game/main.js` - Game initialization, item activation, power systems
- `src/game/systems/enemies/enemy-system.js` - Destroy All Enemies power
- `src/game/systems/boss/boss-system.js` - Boss Kill Shot power
- `src/game/systems/powerups/powerup-system.js` - Coin Magnet power
- `src/game/systems/ui/ui-rendering.js` - Power buttons, visual effects
- `src/game/rendering/effects.js` - Visual effects for powers
- All existing game logic files that handle lives, force fields, orb levels

**Reference:** See [12. Premium Store Design](./12-premium-store-design.md) for complete design and implementation guide

**Files to Create:**
- `contracts/premium_store/sources/premium_store.move`
- `backend/app/api/store/*` (4 API routes)
- `src/game/systems/ui/store-ui.js`
- `src/game/systems/inventory/inventory-manager.js`
- All premium item implementations (NEW game code)

---

### 🟡 **5.3 Smart Contract - Token Burn** (MVP Important)
**Estimated Time:** 3-4 hours  
**Dependencies:** 5.2 (Premium Store provides revenue)  
**Blocks:** Performance burn

**Tasks:**
- [ ] Create `token_burn.move` contract:
  - `burn_tokens()` function
  - Burn amount validation
  - Event emission
- [ ] Deploy to testnet
- [ ] Test burn function
- [ ] Get contract address

**Why Important:** Performance burn is a key feature, but requires revenue from premium store first.

**Files to Create:**
- `contracts/token_burn/sources/token_burn.move`

---

### 🟡 **5.4 Performance Burn Calculator** (MVP Important)
**Estimated Time:** 2-3 hours  
**Dependencies:** 5.3, 1.3  
**Blocks:** Burn functionality

**Tasks:**
- [ ] Create `src/game/blockchain/burn-calculator.js`:
  - Calculate burn from enemies defeated
  - Calculate burn from bosses (tier-based)
  - Calculate burn from distance
  - Calculate burn from coins (user choice)
  - Calculate burn from score
  - Apply min/max caps (50-2000 $Mews)
- [ ] Display burn breakdown to user
- [ ] Integrate with score submission
- [ ] Test burn calculations

**Why Important:** Cool feature, but not blocking for MVP.

**Files to Create:**
- `src/game/blockchain/burn-calculator.js`

---

### 🟡 **5.5 Payment Processing Backend** (MVP Important)
**Estimated Time:** 4-5 hours  
**Dependencies:** 5.1, 5.2 (Premium Store needs payment processing)  
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

### 🟡 **5.6 Smart Contract - Subscription** (MVP Important)
**Estimated Time:** 3-4 hours  
**Dependencies:** 5.5  
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
  - `score_submission.move`
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

## Phase 8: Premium Store System - Detailed Breakdown

**Note:** Premium Store has been moved to Phase 5.2 (before burn mechanics) because it generates revenue needed for burns. This section provides detailed breakdown for reference.

### **8.1 Smart Contract - Premium Store**
See Phase 5.2.1 for details.

### **8.2 Premium Store Backend API**
See Phase 5.2.2 for details.

### **8.3 Premium Store Frontend UI**
See Phase 5.2.3 for details.

### **8.4 Inventory System**
See Phase 5.2.4 for details.

### **8.5 Premium Item Implementation**
See Phase 5.2.5 for details.

### **8.6 Game Balance Adjustments**
See Phase 5.2.6 for details.

### **8.7 Purchase Analytics & Tracking**
See Phase 5.2.7 for details.

**Reference:** See [13. Leaderboard Rewards System](./13-leaderboard-rewards.md) for detailed implementation guide

---

## Phase 9: Leaderboard Rewards System (Post-MVP)

### 🟢 **9.1 Leaderboard Rewards Smart Contract** (Post-MVP)
**Estimated Time:** 4-6 hours  
**Dependencies:** 4.3, 7.2 (mainnet stable)  
**Blocks:** Rewards distribution

**Tasks:**
- [ ] Create `leaderboard_rewards.move` contract:
  - `WeeklyLeaderboard` struct (week ID, start/end timestamp)
  - `RewardDistribution` struct (rank, reward amount)
  - `claim_reward()` function
  - `distribute_rewards()` function (admin only)
  - `LeaderboardRewardClaimed` event
- [ ] Support weekly reward cycles:
  - Weekly leaderboard snapshots
  - Top N positions (e.g., top 10, top 25, top 100)
  - Tiered rewards (1st place gets most, etc.)
- [ ] Deploy to testnet
- [ ] Test reward distribution
- [ ] Get contract address

**Why Post-MVP:** Rewards system adds complexity and requires funding. Can add after launch.

**Files to Create:**
- `contracts/leaderboard_rewards/sources/leaderboard_rewards.move`

---

### 🟢 **9.2 Weekly Leaderboard Snapshot System** (Post-MVP)
**Estimated Time:** 3-4 hours  
**Dependencies:** 9.1  
**Blocks:** Reward calculation

**Tasks:**
- [ ] Create snapshot service:
  - Query top scores for current week
  - Calculate reward tiers
  - Store snapshot on-chain
  - Handle week boundaries (e.g., Sunday 00:00 UTC)
- [ ] Create backend API:
  - `GET /api/leaderboard/weekly/:weekId` - Get weekly leaderboard
  - `POST /api/leaderboard/snapshot` - Create weekly snapshot (admin)
  - `GET /api/leaderboard/rewards/:address` - Get user's claimable rewards
- [ ] Test snapshot creation

**Why Post-MVP:** Requires rewards contract first.

**Files to Create:**
- `backend/app/api/leaderboard/weekly/[weekId]/route.ts`
- `backend/app/api/leaderboard/snapshot/route.ts`
- `backend/app/api/leaderboard/rewards/[address]/route.ts`
- `backend/lib/services/weekly-leaderboard-service.ts`

---

### 🟢 **9.3 Rewards Distribution UI** (Post-MVP)
**Estimated Time:** 3-4 hours  
**Dependencies:** 9.2  
**Blocks:** User reward claims

**Tasks:**
- [ ] Create rewards UI:
  - Display weekly leaderboard with rewards
  - Show claimable rewards for user
  - "Claim Reward" button
  - Reward history
- [ ] Integrate with wallet for claiming:
  - Sign transaction to claim reward
  - Handle reward distribution
- [ ] Admin UI for reward distribution:
  - Trigger weekly snapshot
  - Distribute rewards to winners
- [ ] Test reward claiming flow

**Why Post-MVP:** Requires backend and contract.

**Files to Create:**
- `src/game/systems/ui/rewards-ui.js`
- `src/game/systems/ui/weekly-leaderboard-ui.js`
- Update `src/game/systems/ui/leaderboard-system.js` (add rewards display)

---

### 🟢 **9.4 Reward Economics & Funding** (Post-MVP)
**Estimated Time:** 2-3 hours  
**Dependencies:** 9.1  
**Blocks:** Sustainable rewards

**Tasks:**
- [ ] Design reward structure:
  - Weekly reward pool size
  - Distribution tiers (e.g., 1st: 30%, 2nd: 20%, 3rd: 15%, etc.)
  - Minimum reward amounts
- [ ] Set up reward funding:
  - Revenue source (premium store, game entry fees)
  - Reserve fund for rewards
  - Sustainability calculations
- [ ] Document reward economics
- [ ] Test reward calculations

**Why Post-MVP:** Requires revenue streams to be established first.

**Files to Create:**
- `docs/LEADERBOARD_REWARDS_DESIGN.md` (reward economics documentation)

---

## 🎯 MVP Minimum Requirements

**To launch MVP, you MUST complete:**

✅ **Phase 1:** 
  - ✅ 1.1 Game Statistics Tracking ⭐ **COMPLETED**
  - ✅ 1.2 Backend Infrastructure ⭐ **COMPLETED**
  - ✅ 1.3 Smart Contracts ⭐ **COMPLETED** (pending testnet deployment)
✅ **Phase 2:** 
  - ✅ 2.1 Sui Service Module ⭐ **COMPLETED**
  - ✅ 2.2 Core API Routes ⭐ **COMPLETED**
✅ **Phase 3:** 
  - ✅ 3.1 Wallet Connection Module ⭐ **COMPLETED**
  - ✅ 3.2 API Client Module ⭐ **COMPLETED**
  - ✅ 3.3 Token Gatekeeping UI ⭐ **COMPLETED**
✅ **Phase 4:** 
  - ✅ 4.1 Score Submission UI ⭐ **COMPLETED**
  - ✅ 4.2 Transaction Signing ⭐ **COMPLETED** (pending contract deployment)
  - [ ] 4.3 Blockchain Leaderboard Integration ⏳ **REQUIRED FOR MVP**
[ ] **Phase 6:** 6.1 (Testnet Testing)  
[ ] **Phase 7:** All tasks (Deployment)

**Can Skip for MVP (add later):**
- ⚪ Payment system (Phase 5.1) - Can launch with free games initially
- ⚪ Subscription (Phase 5.6) - Can add post-launch
- ⚪ Premium Store (Phase 5.2) - Can add post-launch
- ⚪ Performance burn (Phase 5.3, 5.4) - Can add post-launch
- ⚪ Leaderboard Rewards (Phase 9) - Weekly rewards for top leaders

**However, recommended MVP includes:**
- 🟡 **Premium Store (Phase 5.2)** - **REQUIRED if implementing burn mechanics** - Generates revenue to fund burns
- 🟡 **Performance burn (Phase 5.3, 5.4)** - Requires premium store revenue first
- 🟡 Payment system (pay-per-game minimum)

**Important Note:** If you want burn mechanics, you MUST implement Premium Store first to generate revenue. Burn mechanics cannot function without a revenue source.

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
- **Week 3:** Premium Store (generates revenue)
- **Week 4:** Performance Burn (uses store revenue) + Payment System
- **Week 5:** Testing + Optimization
- **Week 6:** Deployment
- **Total:** ~6 weeks (Premium Store adds 1 week)

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

1.2 Backend Setup ✅ COMPLETED
  └─> 2.1 Sui Service ✅ COMPLETED
      └─> 2.2 API Routes ✅ COMPLETED
          └─> 3.2 API Client
              └─> 3.3 Token Gatekeeping
                  └─> 4.1 Score Submission UI
                      └─> 4.2 Transaction Signing
                          └─> 6.1 Testing
                              └─> 7.1 Testnet Deployment
                                  └─> 7.2 Mainnet Deployment

3.1 Wallet Connection (do this BEFORE smart contracts!)
  └─> 3.3 Token Gatekeeping
  └─> 4.2 Transaction Signing

1.3 Smart Contracts (can parallel with 3.1, but wallet connection recommended first)
  └─> 4.2 Transaction Signing (needs contracts deployed)
  └─> 4.3 Blockchain Leaderboard (queries ScoreSubmitted events)
      └─> 9.1 Leaderboard Rewards Contract (post-MVP)
  └─> 5.2 Premium Store Contract (generates revenue)
      └─> 5.3 Token Burn Contract (needs revenue from store)
          └─> 5.4 Burn Calculator
  └─> 5.6 Subscription Contract

4.2 Transaction Signing
  └─> 4.3 Blockchain Leaderboard (queries ScoreSubmitted events)
  └─> 5.1 Payment UI
      └─> 5.5 Payment Processing
      
5.2 Premium Store (generates revenue)
  └─> 5.5 Payment Processing (needed for store purchases)
  └─> 5.3 Token Burn Contract (needs revenue from store)
  
4.3 Blockchain Leaderboard (MVP Critical)
  └─> 9.1 Leaderboard Rewards Contract (post-MVP)
      └─> 9.2 Weekly Snapshot System
          └─> 9.3 Rewards Distribution UI
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

1. [x] **Game statistics tracking (1.1)** ⭐ **COMPLETED**
2. [x] **Backend setup (1.2)** ✅ **COMPLETED**
3. [x] **Sui service (2.1)** ✅ **COMPLETED**
4. [x] **Core API routes (2.2)** ✅ **COMPLETED**
5. [x] **Wallet connection (3.1)** ✅ **COMPLETED**
6. [x] API client (3.2) ✅ **COMPLETED**
7. [x] Token gatekeeping (3.3) ✅ **COMPLETED**
8. [x] Smart contracts - game score (1.3) ⭐ **COMPLETED** (pending testnet deployment)
9. [x] Score submission UI (4.1) ✅ **COMPLETED**
10. [x] Transaction signing (4.2) ✅ **COMPLETED**
11. [ ] **Deploy contract to testnet** ⏳ **NEXT STEP**
12. [ ] Testnet testing (6.1)
13. [ ] Testnet deployment (7.1)
14. [ ] Mainnet deployment (7.2) - **Only after testnet is stable!**

---

**Related Documents:**
- [Integration Checklist](./INTEGRATION_CHECKLIST.md) - Detailed task list
- [Testing & Deployment](./06-testing-deployment.md) - Deployment guide
- [Render Free Tier Optimization](./RENDER_FREE_TIER_OPTIMIZATION.md) - Optimization guide

