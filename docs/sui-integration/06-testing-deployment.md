# Testing & Deployment

## 📦 Phase 5: Testing & Deployment

This phase covers testing your integration and deploying to production.

**Your Setup:**
- **Frontend:** Vanilla JS game (HTML/JS/CSS, no build step) on Vercel
- **Backend:** Separate Node.js/Express backend on Render
- **No Database:** Query blockchain directly (simpler for MVP)
- **⚠️ CRITICAL: Testnet First!** Always test on Sui testnet before mainnet
  - Deploy contracts to testnet first
  - Deploy backend with testnet config first
  - Deploy frontend with testnet config first
  - Test everything thoroughly on testnet
  - **ONLY** deploy to mainnet after all testnet tests pass

---

## Step 5.1: Testing Checklist

Before deploying, ensure all components work correctly:

### **Frontend Testing:**
- [ ] Wallet connection works (Sui Wallet extension detected)
- [ ] Wallet connection UI appears in main menu
- [ ] Token balance check works ($Mews balance verification)
- [ ] Token gatekeeping works (500,000 $Mews minimum)
- [ ] "Start Game" button disabled when insufficient tokens
- [ ] Score submission UI works (payment choice, burn options)
- [ ] Performance burn calculation accurate
- [ ] Score submission flow works (pay-per-game)
- [ ] Subscription status check works
- [ ] Score submission with subscription works
- [ ] Fallback to local storage when backend unavailable
- [ ] Error handling for failed transactions (graceful failure)
- [ ] All UI components render correctly

### **Backend Testing:**
- [ ] Backend server starts correctly
- [ ] Health check endpoint works (`/health`)
- [ ] CORS configured correctly (allows Vercel frontend)
- [ ] Score submission API works (`/api/scores/submit-with-payment`)
- [ ] Leaderboard API works (`/api/leaderboard`)
- [ ] Token balance API works (`/api/tokens/balance/:address`)
- [ ] Subscription check API works (`/api/subscription/check/:address`)
- [ ] Blockchain query works (events, transactions)
- [ ] Transaction verification works
- [ ] Sponsored transaction service works (if using $Mews payment)
- [ ] Performance burn verification works (matches frontend calculation)
- [ ] Error handling for all edge cases
- [ ] Rate limiting prevents abuse (if implemented)

### **Smart Contract Testing:**
- [ ] Smart contracts compile correctly
- [ ] Contracts deploy to testnet
- [ ] Score submission function works
- [ ] Game session validation works (anti-cheat checks)
- [ ] Events emit correctly (ScoreSubmitted)
- [ ] Token burning function works (if implemented)
- [ ] Subscription contract works (if implemented)
- [ ] All assertions/validations work as expected

### **Integration Testing:**
- [ ] End-to-end: Wallet connect → Play game → Submit score → Verify on-chain
- [ ] Payment flows work (SUI and $Mews)
- [ ] Subscription purchase and usage works
- [ ] Performance burn calculation matches between frontend and backend
- [ ] Leaderboard shows only verified on-chain scores
- [ ] Token gatekeeping prevents gameplay without sufficient balance

---

## Step 5.2: Environment Configuration

### Development Environment

**Frontend (Vanilla JS) - Create `public/config.js` for local testing:**
```javascript
// public/config.js (Development - Testnet)
window.APP_CONFIG = {
  // API Configuration
  API_BASE_URL: 'http://localhost:3000',
  SUI_NETWORK: 'testnet',
  
  // Token Configuration
  MEWS_TOKEN_TYPE_ID: 'YOUR_TESTNET_MEWS_TOKEN_TYPE',
  MIN_TOKEN_BALANCE: 500000000,  // 500,000 with 9 decimals
  ENABLE_TOKEN_GATE: true,
  
  // Contract Addresses (Testnet)
  GAME_SCORE_CONTRACT: '0x[TESTNET_PACKAGE_ID]::game',
  SUBSCRIPTION_CONTRACT: '0x[TESTNET_PACKAGE_ID]::subscription',
  TOKEN_BURN_CONTRACT: '0x[TESTNET_PACKAGE_ID]::token_burn',
  SUBSCRIPTION_SYSTEM_OBJECT_ID: '0x[TESTNET_OBJECT_ID]',
  BURN_STATS_OBJECT_ID: '0x[TESTNET_OBJECT_ID]',
  GAME_TREASURY_ADDRESS: '0x[YOUR_TESTNET_WALLET]'
};
```

**Load in `index.html` before game scripts:**
```html
<head>
  <!-- ... other head content ... -->
  <script src="public/config.js"></script>
  <!-- Then load game scripts -->
</head>
```

**Backend (Node.js/Express) - `backend/.env`:**
```env
# Server Configuration
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Sui Configuration
SUI_NETWORK=testnet
SUI_GAS_BUDGET=10000000

# Contract Addresses (Testnet)
GAME_SCORE_CONTRACT=0x[TESTNET_PACKAGE_ID]::game
SUBSCRIPTION_CONTRACT=0x[TESTNET_PACKAGE_ID]::subscription
TOKEN_BURN_CONTRACT=0x[TESTNET_PACKAGE_ID]::token_burn
SUBSCRIPTION_SYSTEM_OBJECT_ID=0x[TESTNET_OBJECT_ID]
BURN_STATS_OBJECT_ID=0x[TESTNET_OBJECT_ID]

# Token Configuration
MEWS_TOKEN_TYPE_ID=YOUR_TESTNET_MEWS_TOKEN_TYPE
MIN_TOKEN_BALANCE=500000000  # 500,000 with 9 decimals

# Wallet Configuration (Backend)
GAME_WALLET_PRIVATE_KEY=YOUR_BACKEND_PRIVATE_KEY  # For sponsored transactions
SPONSOR_PRIVATE_KEY=YOUR_BACKEND_PRIVATE_KEY      # Same as above
GAME_TREASURY_ADDRESS=0x[YOUR_TESTNET_WALLET]

# Payment Configuration
BASE_PAYMENT_SUI=0.01  # $0.01 per game
BASE_PAYMENT_MEWS=4500  # Equivalent in $Mews
SUBSCRIPTION_PRICE_SUI=10  # $10/month
```

### Production Environment

**Frontend (Vanilla JS on Vercel) - Create Build Script:**

**Option 1: Simple Build Script (Recommended)**

Create `vercel-build.sh`:
```bash
#!/bin/bash
# Generate config.js from environment variables
cat > public/config.js << EOF
window.APP_CONFIG = {
  API_BASE_URL: '${API_BASE_URL}',
  SUI_NETWORK: '${SUI_NETWORK}',
  MEWS_TOKEN_TYPE_ID: '${MEWS_TOKEN_TYPE_ID}',
  MIN_TOKEN_BALANCE: ${MIN_TOKEN_BALANCE},
  ENABLE_TOKEN_GATE: ${ENABLE_TOKEN_GATE},
  GAME_SCORE_CONTRACT: '${GAME_SCORE_CONTRACT}',
  SUBSCRIPTION_CONTRACT: '${SUBSCRIPTION_CONTRACT}',
  TOKEN_BURN_CONTRACT: '${TOKEN_BURN_CONTRACT}',
  SUBSCRIPTION_SYSTEM_OBJECT_ID: '${SUBSCRIPTION_SYSTEM_OBJECT_ID}',
  BURN_STATS_OBJECT_ID: '${BURN_STATS_OBJECT_ID}',
  GAME_TREASURY_ADDRESS: '${GAME_TREASURY_ADDRESS}'
};
EOF
```

**In Vercel Dashboard:**
- **Build Command:** `bash vercel-build.sh`
- **Output Directory:** `/` (root)

**Environment Variables in Vercel:**
```env
API_BASE_URL=https://your-backend.onrender.com
SUI_NETWORK=mainnet
MEWS_TOKEN_TYPE_ID=YOUR_MAINNET_MEWS_TOKEN_TYPE
MIN_TOKEN_BALANCE=500000000
ENABLE_TOKEN_GATE=true
GAME_SCORE_CONTRACT=0x[MAINNET_PACKAGE_ID]::game
SUBSCRIPTION_CONTRACT=0x[MAINNET_PACKAGE_ID]::subscription
TOKEN_BURN_CONTRACT=0x[MAINNET_PACKAGE_ID]::token_burn
SUBSCRIPTION_SYSTEM_OBJECT_ID=0x[MAINNET_OBJECT_ID]
BURN_STATS_OBJECT_ID=0x[MAINNET_OBJECT_ID]
GAME_TREASURY_ADDRESS=0x[YOUR_MAINNET_WALLET]
```

**Option 2: Manual Config File (Simpler, but needs manual updates)**

Just create `public/config.js` with production values and commit it. Update manually when needed.

**Backend (Node.js/Express on Render) - Environment Variables in Render Dashboard:**
```env
PORT=3000
NODE_ENV=production
CORS_ORIGIN=https://your-frontend.vercel.app

# Sui Configuration
SUI_NETWORK=mainnet
SUI_GAS_BUDGET=10000000

# Contract Addresses (Mainnet)
GAME_SCORE_CONTRACT=0x[MAINNET_PACKAGE_ID]::game
SUBSCRIPTION_CONTRACT=0x[MAINNET_PACKAGE_ID]::subscription
TOKEN_BURN_CONTRACT=0x[MAINNET_PACKAGE_ID]::token_burn
SUBSCRIPTION_SYSTEM_OBJECT_ID=0x[MAINNET_OBJECT_ID]
BURN_STATS_OBJECT_ID=0x[MAINNET_OBJECT_ID]

# Token Configuration
MEWS_TOKEN_TYPE_ID=YOUR_MAINNET_MEWS_TOKEN_TYPE
MIN_TOKEN_BALANCE=500000000

# Wallet Configuration (Backend - SECURE!)
GAME_WALLET_PRIVATE_KEY=YOUR_MAINNET_BACKEND_PRIVATE_KEY  # Keep secret!
SPONSOR_PRIVATE_KEY=YOUR_MAINNET_BACKEND_PRIVATE_KEY
GAME_TREASURY_ADDRESS=0x[YOUR_MAINNET_WALLET]

# Payment Configuration
BASE_PAYMENT_SUI=0.01
BASE_PAYMENT_MEWS=4500
SUBSCRIPTION_PRICE_SUI=10
```

---

## Step 5.3: Deployment Steps

### 1. Backend Deployment (Render)

**Your Platform: Render** - Recommended for Node.js/Express backend

**Step-by-Step:**

1. **Prepare Backend:**
```bash
cd backend
npm install --production
# Ensure package.json has "start" script: "node src/server.js"
```

2. **Create Render Service:**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New +" → "Web Service"
   - Connect your Git repository
   - Set build/start commands:
     - **Build Command:** `cd backend && npm install`
     - **Start Command:** `cd backend && npm start`

3. **Configure Environment Variables in Render:**
   - Add all variables from `backend/.env` (see Step 5.2)
   - **IMPORTANT:** Mark `GAME_WALLET_PRIVATE_KEY` as "Secret"
   - Set `NODE_ENV=production`
   - Set `CORS_ORIGIN` to your Vercel frontend URL

4. **Deploy:**
   - Render will automatically deploy on push to main branch
   - Or click "Manual Deploy" for immediate deployment
   - Wait for deployment to complete
   - Note the backend URL (e.g., `https://your-backend.onrender.com`)

5. **Health Check:**
   - Visit `https://your-backend.onrender.com/health`
   - Should return: `{"status":"ok","service":"suitwo-backend"}`

**Alternative Platforms (if not using Render):**
- **Railway** - Easy deployment, auto-scaling
- **Heroku** - Established platform, good docs
- **AWS EC2** - Full control, more setup required
- **DigitalOcean App Platform** - Simple, affordable

### 2. Frontend Deployment (Vercel - Static Site)

**Your Platform: Vercel** - Deploy as static site (no build needed!)

**Important:** Your game is vanilla JS, so no build step required! Just deploy the static files.

**Entry Point:** `index.html` is your main entry point and must be in the root directory.

**Step-by-Step:**

1. **Prepare Frontend (No Build Needed!):**
```bash
# Verify your file structure:
# Root directory should contain:
# - index.html (MAIN ENTRY POINT - must be in root!)
# - src/game/ (all game JS)
# - assets/ (all game assets)
# - src/game/blockchain/ (wallet connection, API client)
# - public/config.js (environment config)

# Test locally:
# Just open index.html in browser or use a simple HTTP server:
npx http-server . -p 3000
# Or use Python: python -m http.server 8000
# Or Node: npx serve .
```

**Verify `index.html` structure:**
- ✅ `index.html` is in the root directory (not in a subfolder)
- ✅ `index.html` loads `public/config.js` before game scripts
- ✅ All relative paths in `index.html` are correct (e.g., `src/game/main.js`, `assets/...`)

2. **Connect to Vercel:**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New Project"
   - Import your Git repository

3. **Configure Build Settings:**
   - **Framework Preset:** Other (or "Static Site")
   - **Root Directory:** `/` (root of repository - where `index.html` lives)
   - **Build Command:** 
     - Leave empty if using manual `config.js`
     - OR: `bash vercel-build.sh` if using build script for env vars
   - **Output Directory:** `/` (root - `index.html` and all static files)
   - **Install Command:** Leave empty (no npm install needed!)

4. **Add Environment Variables in Vercel:**
   - Go to Project → Settings → Environment Variables
   - **Note:** Since it's vanilla JS, you'll need to inject env vars differently
   - **Option A:** Add to `index.html` as script tags (see below)
   - **Option B:** Create a `config.js` file that gets loaded (see below)
   
   **Recommended: Create `public/config.js` (loads before game):**
   ```javascript
   // public/config.js - Generated at build time or injected
   window.APP_CONFIG = {
     API_BASE_URL: 'https://your-backend.onrender.com',
     SUI_NETWORK: 'mainnet',
     MEWS_TOKEN_TYPE_ID: 'YOUR_MAINNET_TOKEN_TYPE',
     MIN_TOKEN_BALANCE: 500000000,
     ENABLE_TOKEN_GATE: true,
     GAME_SCORE_CONTRACT: '0x[MAINNET_PACKAGE_ID]::game',
     // ... other config
   };
   ```
   
   **Load in `index.html` before game scripts:**
   ```html
   <script src="public/config.js"></script>
   ```

5. **Deploy:**
   - Click "Deploy"
   - Vercel will deploy all static files (including `index.html` in root)
   - Wait for deployment to complete
   - **Verify:** Vercel should automatically detect `index.html` as the entry point
   - Your app will be live at `https://your-project.vercel.app`
   - **Test:** Visit the URL - `index.html` should load automatically

**Note:** Vercel automatically serves `index.html` when you visit the root URL (`/`). No special configuration needed!

6. **Update Backend CORS:**
   - Go to Render dashboard → Your backend service
   - Update `CORS_ORIGIN` environment variable
   - Set to: `https://your-project.vercel.app`
   - Redeploy backend if needed

7. **Set Up Keep-Alive (Free Tier - Recommended):**
   - Add `/health` endpoint to backend (fast, no blockchain queries)
   - Sign up for [UptimeRobot](https://uptimerobot.com) (free)
   - Create monitor: `https://your-backend.onrender.com/health`
   - Set interval: 5 minutes
   - **Result:** Prevents spin-down, eliminates cold starts
   - See [Render Free Tier Optimization](./RENDER_FREE_TIER_OPTIMIZATION.md) for details

**Alternative: Environment Variables via Vercel Build Script**

If you want to use Vercel's env vars, create a build script that generates `config.js`:

```bash
# Create vercel-build.sh
#!/bin/bash
cat > public/config.js << EOF
window.APP_CONFIG = {
  API_BASE_URL: '${NEXT_PUBLIC_API_BASE_URL}',
  SUI_NETWORK: '${NEXT_PUBLIC_SUI_NETWORK}',
  // ... other vars
};
EOF
```

Then set **Build Command:** `bash vercel-build.sh`

**Alternative Platforms (if not using Vercel):**
- **Netlify** - Great for static sites, similar setup
- **Cloudflare Pages** - Fast, global CDN, similar setup
- **GitHub Pages** - Free hosting (static only)

### 3. Smart Contract Deployment (No Database Needed!)

**Important:** Your MVP doesn't use a database - all data comes from blockchain!

**Skip Database Setup** - You're querying blockchain directly, which is simpler and faster for MVP.

**Instead, focus on:**
- ✅ Smart contract deployment
- ✅ Contract address configuration
- ✅ Event querying setup
- ✅ Blockchain RPC endpoints

### 4. Smart Contract Deployment

**CRITICAL: Always test on testnet first!**

#### **Step 1: Deploy to Testnet (Testing) - REQUIRED FIRST!**

**⚠️ NEVER deploy to mainnet without testing on testnet first!**

```bash
# Navigate to contract directory
cd suitwo_game

# Switch to testnet (IMPORTANT!)
sui client switch --env testnet

# Verify you're on testnet
sui client active-env  # Should show "testnet"

# Get testnet SUI from faucet (if needed)
sui client faucet

# Deploy contracts to TESTNET (game, subscription, token_burn)
sui client publish --gas-budget 10000000 --network testnet

# Note the TESTNET package ID and object IDs from output
# Example output:
# Package ID: 0x1234567890abcdef... (TESTNET)
# Object ID: 0xabcdef1234567890... (TESTNET)
```

**Update Testnet Environment Variables:**
- Copy TESTNET package ID and object IDs
- Update `backend/.env` with testnet addresses (`SUI_NETWORK=testnet`)
- Update frontend `public/config.js` with testnet addresses (`SUI_NETWORK: 'testnet'`)
- **Test everything on testnet before even thinking about mainnet!**
- Use testnet addresses for all testing and development

#### **Step 2: Deploy to Mainnet (Production)**

**⚠️ ONLY AFTER COMPLETE TESTNET SUCCESS!**

**Prerequisites Checklist (ALL must be true):**
- ✅ All testnet tests passed (100% success rate)
- ✅ Contracts work perfectly on testnet (no bugs)
- ✅ Payment flows work on testnet
- ✅ Token gatekeeping works on testnet
- ✅ Performance burn works on testnet
- ✅ Subscription system works on testnet
- ✅ Leaderboard queries work on testnet
- ✅ Error handling tested on testnet
- ✅ Security review completed
- ✅ No critical bugs found
- ✅ Team/community ready for mainnet launch

**If ANY item above is false, DO NOT deploy to mainnet!**

```bash
# Double-check you're ready for mainnet
# Review all testnet test results
# Review all testnet logs
# Confirm no outstanding issues

# Switch to mainnet (ONLY when ready!)
sui client switch --env mainnet

# Verify you're on mainnet (double-check!)
sui client active-env  # Should show "mainnet"

# Ensure you have mainnet SUI for gas
sui client gas  # Check balance

# Deploy to mainnet (this is REAL - be careful!)
sui client publish --gas-budget 10000000 --network mainnet

# Note the MAINNET package ID and object IDs
# These are PERMANENT - cannot be changed!
```

**Update Production Environment Variables:**
- Update Render backend environment variables (mainnet addresses)
- Update Vercel frontend environment variables (mainnet addresses)
- Update `SUI_NETWORK=mainnet` in both

**Deployed Contracts:**
```
GAME_SCORE_CONTRACT=0x[MAINNET_PACKAGE_ID]::game
SUBSCRIPTION_CONTRACT=0x[MAINNET_PACKAGE_ID]::subscription
TOKEN_BURN_CONTRACT=0x[MAINNET_PACKAGE_ID]::token_burn
SUBSCRIPTION_SYSTEM_OBJECT_ID=0x[MAINNET_OBJECT_ID]
BURN_STATS_OBJECT_ID=0x[MAINNET_OBJECT_ID]
```

**Important:**
- ✅ Keep contract addresses secure (version control)
- ✅ Document all contract addresses
- ✅ Update README with deployment info
- ✅ Keep testnet addresses for testing new features

---

## Step 5.4: Monitoring & Maintenance

### Monitoring Checklist

**Essential:**
- [ ] Set up error tracking (Sentry, Rollbar) - **Free tier available**
- [ ] Monitor API response times (Render dashboard shows this)
- [ ] Track blockchain transaction success rate
- [ ] Monitor backend SUI balance (for sponsored transactions)
- [ ] Uptime monitoring (UptimeRobot - free, Pingdom)
- [ ] Log aggregation (Render provides logs, or use Loggly/Papertrail)

**Backend-Specific:**
- [ ] Monitor Render service health
- [ ] Track API endpoint usage
- [ ] Monitor sponsored transaction gas usage
- [ ] Alert when SUI balance < 1 SUI (for gas)
- [ ] Track subscription revenue and usage

**Frontend-Specific:**
- [ ] Monitor Vercel deployment status
- [ ] Track frontend errors (Sentry)
- [ ] Monitor wallet connection success rate
- [ ] Track token balance check failures

**Blockchain-Specific:**
- [ ] Monitor smart contract events (ScoreSubmitted)
- [ ] Track transaction success/failure rates
- [ ] Monitor gas costs (should stay ~$0.001 per transaction)
- [ ] Query event backlog (ensure events aren't missed)

### Maintenance Tasks

**Daily:**
- Check backend SUI balance (for sponsored transactions)
- Monitor error logs for critical issues
- Verify blockchain queries working

**Weekly:**
- Review error logs (frontend + backend)
- Check transaction success rates
- Monitor API performance
- Review user feedback
- Check Render/Vercel deployment status

**Monthly:**
- Update dependencies (npm packages)
- Review security patches
- Analyze user metrics:
  - Average scores
  - Token burn amounts
  - Subscription purchases
  - Payment method usage (SUI vs $Mews)
- Review gas costs (ensure still ~$0.001)
- Check smart contract events (ensure all processed)

**Quarterly:**
- Security audit
- Performance optimization
- Review burn rates (adjust if needed based on data)
- Analyze token economics (burn velocity, supply reduction)

**No Database Maintenance Needed!** ✅
- No database backups (querying blockchain directly)
- No migration scripts
- No database performance tuning
- Simpler operations overall

---

## Step 5.5: Rollback Plan

If issues occur in production:

### **1. Frontend Issues (Vercel):**
- **Quick Rollback:** Vercel dashboard → Deployments → Click "..." on previous deployment → "Promote to Production"
- **Alternative:** Revert Git commit and push (auto-deploys)
- **Keep:** Previous deployment versions available in Vercel

### **2. Backend Issues (Render):**
- **Quick Rollback:** Render dashboard → Your service → Deployments → Click "..." on previous deployment → "Rollback"
- **Alternative:** Revert Git commit and push
- **Maintenance Mode:** Add environment variable `MAINTENANCE_MODE=true` → Return 503 for all requests

### **3. Smart Contract Issues:**
**⚠️ Smart contracts are immutable - cannot be rolled back!**

**Mitigation Strategies:**
- **Deploy New Contract Version:**
  - Fix issues in new contract
  - Deploy to mainnet (new package ID)
  - Update environment variables (frontend + backend)
  - Users start using new contract
  
- **Contract Pause (if built-in):**
  - If contracts have pause functionality, use it
  - Prevents new submissions while fixing
  
- **Data Migration (if needed):**
  - Query old contract events (historical data preserved)
  - New contract starts fresh
  - Leaderboard can query both contracts if needed

**Prevention:**
- ✅ Thorough testnet testing
- ✅ Code review before mainnet deployment
- ✅ Start with limited features, add more later
- ✅ Consider upgradeable contract patterns (if available in Sui)

---

## ✅ Pre-Deployment Checklist

### **Development (Local Testing):**
- [ ] Frontend runs locally (open `index.html` in root directory or use HTTP server)
- [ ] `index.html` is in root directory (not in subfolder)
- [ ] `index.html` loads `public/config.js` before game scripts
- [ ] All relative paths in `index.html` work correctly
- [ ] Backend runs locally (`cd backend && npm start`)
- [ ] Wallet connection works locally
- [ ] Token balance check works
- [ ] Score submission works (testnet)
- [ ] Performance burn calculation accurate
- [ ] Payment flows work (SUI and $Mews)
- [ ] Subscription system works
- [ ] All UI components functional
- [ ] Error handling tested (disconnect wallet, low balance, etc.)
- [ ] Config variables accessible via `window.APP_CONFIG`

### **Testnet Deployment (REQUIRED BEFORE MAINNET):**
- [ ] Smart contracts deployed to **testnet** (not mainnet!)
- [ ] Testnet contract addresses documented
- [ ] Backend deployed to Render with **testnet** config (`SUI_NETWORK=testnet`)
- [ ] Frontend deployed to Vercel with **testnet** config (`SUI_NETWORK=testnet`)
- [ ] CORS configured correctly
- [ ] Environment variables set in Render and Vercel (all testnet addresses)
- [ ] End-to-end testing on **testnet** (full flow)
- [ ] Transaction verification works on **testnet**
- [ ] Leaderboard queries blockchain correctly (testnet)
- [ ] Token gatekeeping works (testnet)
- [ ] Payment flows tested (testnet)
- [ ] Subscription tested (testnet)
- [ ] Performance burn tested (testnet)
- [ ] Error scenarios tested (testnet)
- [ ] **All tests pass on testnet before considering mainnet**

### **Production (Mainnet) Readiness:**
- [ ] ✅ **ALL testnet tests passed** (critical - do not skip!)
- [ ] ✅ **No bugs found on testnet** (critical - do not skip!)
- [ ] ✅ **Security review completed** (critical - do not skip!)
- [ ] ✅ **Ready for mainnet deployment** (only after testnet success)
- [ ] Smart contracts deployed to mainnet
- [ ] Mainnet contract addresses documented
- [ ] Backend environment variables updated (mainnet)
- [ ] Frontend environment variables updated (mainnet)
- [ ] Backend SUI wallet funded (for sponsored transactions)
- [ ] Monitoring set up (Sentry, uptime monitoring)
- [ ] Error tracking configured
- [ ] Rollback plan documented
- [ ] Documentation updated
- [ ] Team/community notified of deployment

### **Post-Deployment:**
- [ ] Monitor first transactions closely
- [ ] Verify leaderboard updates
- [ ] Check transaction success rates
- [ ] Monitor backend logs
- [ ] Collect user feedback
- [ ] Track any errors/issues

---

## 🔄 Next Steps

After deployment:
- Monitor for issues (first 24-48 hours critical)
- Collect user feedback
- Iterate based on metrics
- Adjust burn rates if needed (based on actual gameplay data)
- Monitor token economics (burn velocity, supply reduction)
- [09. Migration Strategy](./09-migration-strategy.md) - Plan user migration

---

## 🧪 Testing Commands Reference

### **Local Development:**
```bash
# Frontend (Vanilla JS - No build needed!)
# Option 1: Simple HTTP server
npx http-server . -p 3000
# Or Python: python -m http.server 8000
# Or Node: npx serve .

# Option 2: Open directly in browser
# Just open index.html in browser (for basic testing)

# Backend (Express)
cd backend
npm install              # Install dependencies
npm start                # Start server (uses .env)
npm run dev              # Start with nodemon (if configured)
```

### **Testnet Testing (USE THIS FOR ALL TESTING!):**
```bash
# Switch to testnet (IMPORTANT - use testnet for all testing!)
sui client switch --env testnet

# Verify you're on testnet
sui client active-env  # Should show "testnet"

# Get testnet SUI from faucet (free test tokens)
sui client faucet

# Check testnet balance
sui client gas  # Should show testnet SUI

# Deploy contracts to TESTNET (safe testing)
cd suitwo_game
sui client publish --gas-budget 10000000 --network testnet

# Query testnet events
sui client query-events --query '{"MoveModule": {...}}' --network testnet

# Test transactions on testnet
# Make sure everything works before mainnet!
```

### **Mainnet Deployment:**
```bash
# Switch to mainnet
sui client switch --env mainnet

# Verify wallet has SUI
sui client gas

# Deploy contracts (mainnet)
sui client publish --gas-budget 10000000 --network mainnet
```

---

## 📊 Deployment Timeline Example

**Week 1-2: Local Development**
- Set up backend structure
- Integrate Sui SDK
- Create frontend wallet connection (vanilla JS)
- Create `public/config.js` for environment variables
- Ensure `index.html` is in root directory
- Test locally (open `index.html` in root or use HTTP server like `npx http-server .`)

**Week 2-3: Testnet Testing (REQUIRED!)**
- ✅ Deploy contracts to **testnet** (NOT mainnet!)
- ✅ Deploy backend to Render with **testnet** config (`SUI_NETWORK=testnet`)
- ✅ Deploy frontend to Vercel with **testnet** config (`SUI_NETWORK: 'testnet'`)
- ✅ Full testnet testing (all features)
- ✅ Fix any bugs found on testnet
- ✅ Test all payment flows on testnet
- ✅ Test token gatekeeping on testnet
- ✅ Test performance burn on testnet
- ✅ Test subscription on testnet
- ✅ **DO NOT proceed to mainnet until all testnet tests pass!**

**Week 3-4: Mainnet Preparation (ONLY AFTER TESTNET SUCCESS!)**
- ✅ Security review completed
- ✅ Final testing on testnet (all tests pass)
- ✅ No bugs found on testnet
- ✅ Prepare mainnet deployment
- ✅ Fund backend wallet with mainnet SUI
- ✅ Double-check all configurations

**Week 4: Mainnet Launch (ONLY IF TESTNET PERFECT!)**
- ⚠️ **ONLY proceed if ALL testnet tests passed!**
- Deploy contracts to mainnet (permanent - cannot undo!)
- Update environment variables (mainnet addresses)
- Deploy backend (mainnet config)
- Deploy frontend (mainnet config)
- Monitor closely (first 24-48 hours critical)
- Launch! 🚀

**⚠️ Remember:** Testnet is free and safe. Mainnet is permanent and costs real money. Always test thoroughly on testnet first!

---

**Related Documents:**
- [Security Considerations](./08-security-considerations.md)
- [Migration Strategy](./09-migration-strategy.md)

