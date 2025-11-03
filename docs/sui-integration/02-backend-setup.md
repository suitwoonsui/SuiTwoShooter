# Backend Setup & Infrastructure

## 📦 Phase 1: Backend Setup & Infrastructure (Week 1)

This phase covers setting up a **separate backend service** (proper separation from frontend) and configuring Sui integration.

**Architecture:** Separate backend service deployed on Render, Next.js frontend on Vercel.

---

## Step 1.1: Backend Directory Structure

Create a separate `backend/` directory in your project:

```bash
# Create backend directory
mkdir backend
cd backend
```

**Copy your existing backend code into this directory.**

Your backend structure will depend on your existing backend framework:

### Option A: If using Node.js/Express
```
backend/
├── package.json
├── .env
├── src/
│   ├── server.js (or index.js)
│   ├── config/
│   │   └── config.js
│   ├── routes/
│   │   ├── scores.js
│   │   ├── leaderboard.js
│   │   └── tokens.js
│   ├── services/
│   │   └── sui-service.js
│   └── utils/
│       └── helpers.js
├── .gitignore
└── README.md
```

### Option B: If using Next.js API Routes
```
backend/
├── app/
│   └── api/
│       ├── scores/
│       │   └── route.ts
│       ├── leaderboard/
│       │   └── route.ts
│       └── tokens/
│           └── route.ts
├── lib/
│   └── sui/
│       └── sui-service.ts
├── package.json
├── .env.local
└── next.config.js
```

### Option C: If using Python/FastAPI
```
backend/
├── requirements.txt
├── .env
├── src/
│   ├── main.py
│   ├── config/
│   │   └── config.py
│   ├── routes/
│   │   ├── scores.py
│   │   ├── leaderboard.py
│   │   └── tokens.py
│   ├── services/
│   │   └── sui_service.py
│   └── utils/
│       └── helpers.py
└── README.md
```

**Important:** Use whatever framework your existing backend code uses. Copy your simplified/generalized backend into `backend/` and adapt it for Sui integration.

---

## Step 1.2: Copy and Setup Your Existing Backend

1. **Copy your existing backend code** into the `backend/` directory
2. **Install Sui SDK** based on your backend framework:

### If using Node.js/Express:
```bash
cd backend
npm install @mysten/sui.js
```

### If using Next.js:
```bash
cd backend
npm install @mysten/sui.js @mysten/dapp-kit
```

### If using Python/FastAPI:
```bash
cd backend
pip install pysui
```

**Then:** Follow your existing backend's setup patterns and add Sui integration.

---

## Step 1.3: Configure Environment Variables

Create `.env` in the `backend/` directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000  # Your Next.js frontend URL

# Sui Blockchain Configuration
SUI_NETWORK=testnet  # or 'mainnet' for production
SUI_RPC_URL=https://fullnode.testnet.sui.io:443
SUI_GAS_BUDGET=10000000  # Gas budget for transactions

# Token Configuration ($Mews)
TOKEN_TYPE=0x...  # Your $Mews token type ID
MIN_TOKEN_BALANCE=500000  # Minimum balance required (500,000 $Mews)
ENABLE_TOKEN_GATE=true

# Smart Contract Addresses (after deployment)
SCORE_CONTRACT=0x...
LEADERBOARD_CONTRACT=0x...

# Security
API_KEY=your-api-key-here  # For API authentication
JWT_SECRET=your-jwt-secret-here  # If using JWT
```

**Important:** 
- Backend `.env` should NOT have `NEXT_PUBLIC_` prefix (server-side only)
- Add `.env` to `backend/.gitignore`
- Set these in Render dashboard when deploying

---

## Step 1.4: Adapt Your Existing Backend

Use your existing backend structure and add Sui integration. The specifics depend on your framework:

### Key Things to Add:

1. **Sui Service Module** - Create a service to interact with Sui blockchain
   - Location depends on your structure: `services/sui-service.js`, `lib/sui/client.ts`, `services/sui_service.py`, etc.
   - We'll cover this in [03. Sui SDK Integration](./03-sui-sdk-integration.md)

2. **API Routes/Endpoints** - Add routes for:
   - `/api/scores` (POST) - Submit game scores
   - `/api/leaderboard` (GET) - Fetch leaderboard
   - `/api/tokens/balance/:address` (GET) - Check token balance

3. **CORS Configuration** - Allow your frontend to call the backend
   - Set origin to your frontend URL (Vercel deployment)

4. **Environment Variables** - Add Sui configuration (see Step 1.3)

Your existing backend patterns should guide the structure. We'll add Sui-specific code on top of what you already have.

---

## Step 1.5: No Database Needed! (MVP Approach)

**For MVP, you don't need a database!** Everything is stored on-chain in your Sui smart contracts.

### Why No Database?
- ✅ **Simpler setup** - One less system to manage
- ✅ **Faster MVP** - Get to launch quicker
- ✅ **On-chain data** - Scores and leaderboards stored in Move contracts
- ✅ **Query blockchain** - Use Sui RPC to read contract state directly

### How to Query Leaderboards:
Instead of database queries, your backend will:
1. Use Sui SDK to read from your Move contract's shared object
2. Parse the leaderboard data from contract state
3. Return JSON to frontend

**Example (in backend service):**
```javascript
// In backend/src/services/sui-service.js
const leaderboardObject = await client.getObject({
  id: process.env.LEADERBOARD_CONTRACT,
  options: { showContent: true }
});
// Parse leaderboard from contract state
```

### Optional: In-Memory Cache (Future Optimization)
If you need faster queries later, you can add:
- Redis (for caching) - Easy to add on Render
- In-memory cache in Node.js
- But not needed for MVP!

---

## ✅ Checklist

- [ ] `backend/` directory created
- [ ] Existing backend code copied into `backend/`
- [ ] Sui SDK installed (`@mysten/sui.js` or `pysui` based on your framework)
- [ ] `.env` file created in backend with configuration
- [ ] `$Mews` token type ID added to environment variables
- [ ] CORS configured to allow frontend requests
- [ ] Review `Sui Smart Contract Examples/` for patterns to adapt
- [ ] Backend runs locally (test with your existing setup)

---

## 📁 Project Structure (Complete)

```
shootergame/
├── backend/                    # Separate backend service (Render)
│   ├── src/
│   │   ├── server.js
│   │   ├── routes/
│   │   └── services/
│   ├── package.json
│   └── .env
├── src/                        # Frontend game (HTML5/JS)
│   └── game/
├── Sui Smart Contract Examples/ # Contract patterns to adapt
├── index.html                  # Game entry point
└── next.config.js              # If you have Next.js frontend too
```

**Deployment:**
- **Backend:** `backend/` → Render (whatever framework you're using)
- **Frontend:** Static HTML game → Vercel OR Next.js frontend → Vercel

---

## 📁 Your Existing Assets

You already have helpful examples:
- ✅ `Sui Smart Contract Examples/` - Patterns to adapt
- ✅ `Sui Smart Contract Examples/src/contexts/WalletContext.tsx` - Frontend wallet integration
- ✅ `Sui Smart Contract Examples/contracts/examples/` - Move contract patterns

**Leverage these!** Don't start from scratch.

---

## ⚠️ Render Free Tier Considerations

**Important:** If using Render's free tier, services spin down after 15 minutes of inactivity, causing cold starts (30-60 second delays).

**Solutions:**
- ✅ Use keep-alive service (UptimeRobot) to prevent spin-down
- ✅ Implement client-side caching to reduce API calls
- ✅ Optimize backend responses (fast health check endpoint)
- ✅ See [Render Free Tier Optimization](./RENDER_FREE_TIER_OPTIMIZATION.md) for detailed strategies

**Quick Setup:**
1. Add `/health` endpoint (fast response, no blockchain queries)
2. Set up UptimeRobot to ping `/health` every 5-10 minutes
3. Implement client-side caching for leaderboard and token balance

---

## 🔄 Next Steps

Once backend setup is complete, proceed to:
- [03. Sui SDK Integration](./03-sui-sdk-integration.md) - Create backend API routes and Sui service
- [07. Token Gatekeeping](./07-token-gatekeeping.md) - Critical feature for MVP
- [Render Free Tier Optimization](./RENDER_FREE_TIER_OPTIMIZATION.md) - **Important for free tier**

---

**Related Documents:**
- [Overview & Architecture](./01-overview-and-architecture.md)
- [Sui SDK Integration](./03-sui-sdk-integration.md) - Backend API implementation
- [Render Free Tier Optimization](./RENDER_FREE_TIER_OPTIMIZATION.md) - Prevent spin-down and reduce costs

