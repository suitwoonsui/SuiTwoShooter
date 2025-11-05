# SuiTwo Backend API

Backend API service for SuiTwo Shooter Game - Sui blockchain integration.

## 🏗️ Architecture

This is a separate backend service built with **Next.js** that handles:
- Sui blockchain interactions
- Token balance checking
- Score verification
- Leaderboard queries
- Payment processing (future)

## 📁 Directory Structure

```
backend/
├── app/
│   └── api/               # Next.js API routes
│       ├── health/
│       │   └── route.ts  # Health check endpoint
│       ├── scores/
│       │   └── route.ts  # Score submission routes
│       ├── leaderboard/
│       │   └── route.ts  # Leaderboard routes
│       └── tokens/
│           └── route.ts   # Token balance routes
├── lib/
│   └── sui/
│       └── suiService.ts # Sui blockchain service
├── config/
│   └── config.ts          # Configuration management
├── package.json
├── next.config.js
├── .env.example
└── README.md
```

## 🚀 Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Start production server:**
   ```bash
   npm start
   ```

## 🔧 Environment Variables

See `.env.example` for required environment variables.

Key variables:
- `SUI_NETWORK` - testnet or mainnet
- `MEWS_TOKEN_TYPE_ID` - $Mews token type ID
- `GAME_SCORE_CONTRACT` - Smart contract address
- `CORS_ORIGIN` - Frontend URL for CORS

## 📡 API Endpoints

### Health Check
- `GET /api/health` - Health check endpoint (for Render free tier keep-alive)

### Token Routes
- `GET /api/tokens/balance/[address]` - Get token balance for address

### Score Routes
- `POST /api/scores/verify` - Verify transaction hash

### Leaderboard Routes
- `GET /api/leaderboard` - Get leaderboard from blockchain (supports `?limit=100` query param)

## 🚢 Deployment

This backend is designed to deploy on **Render** (free tier compatible).

### Render Setup:
1. Create new Web Service on Render
2. Connect GitHub repository
3. Set build command: `npm install && npm run build`
4. Set start command: `npm start`
5. Add environment variables from `.env.example`
6. Set up UptimeRobot to ping `/api/health` every 5 minutes

See [Render Free Tier Optimization](../../docs/sui-integration/RENDER_FREE_TIER_OPTIMIZATION.md) for details.

## 📚 Related Documentation

- [Backend Setup Guide](../../docs/sui-integration/02-backend-setup.md)
- [Sui SDK Integration](../../docs/sui-integration/03-sui-sdk-integration.md)
- [Render Free Tier Optimization](../../docs/sui-integration/RENDER_FREE_TIER_OPTIMIZATION.md)

