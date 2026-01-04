# SuiTwo Multi-App Platform

A multi-app platform built on Sui blockchain, featuring shared base infrastructure and independent applications.

## 🏗️ Architecture

This codebase uses a **multi-app architecture** with shared base infrastructure:

```
shootergame/
├── base/                    # Shared infrastructure (wallet, API, Sui service)
│   ├── frontend/           # Base frontend utilities
│   ├── backend/            # Base backend services
│   └── wallet-module/      # Shared wallet integration
│
├── apps/                    # Independent applications
│   └── shooter-game/        # Shooter Game (first app)
│       ├── frontend/        # Game frontend
│       ├── backend/         # Game-specific API endpoints
│       └── contracts/       # Game smart contracts
│
└── backend/                 # Original backend (game-specific services)
```

### Key Concepts

- **Base Layer**: App-agnostic infrastructure shared by all apps
  - Wallet connection
  - Sui blockchain service
  - API handler utilities
  - Configuration system
  - CORS/security

- **App Layer**: Independent applications with their own:
  - Frontend code
  - Backend API endpoints
  - Smart contracts
  - Assets and configuration

- **Shared Services**: Game-specific services still in original `backend/` (can be moved to apps later)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Sui wallet extension (for blockchain features)

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   cd backend && npm install && cd ..
   cd base/wallet-module && npm install && cd ../..
   ```

2. **Start backend:**
   ```bash
   cd backend
   npm run dev
   # Backend runs on http://localhost:3000
   ```

3. **Start frontend (Shooter Game):**
   ```bash
   # Use any static file server, or:
   cd apps/shooter-game/frontend
   # Open index.html in browser, or use:
   python -m http.server 8000
   # Game runs on http://localhost:8000
   ```

4. **Open the game:**
   - Navigate to `http://localhost:8000`
   - Connect your Sui wallet
   - Start playing!

### Production

The game is deployed on Vercel:
- Frontend: Auto-detects production URLs from meta tags
- Backend: Uses Vercel API endpoints
- Wallet Module: Loads from Vercel CDN

## 📁 Project Structure

### Base Infrastructure (`base/`)

**Frontend:**
- `base/frontend/src/infrastructure/` - Wallet connection, API client
- `base/frontend/src/config/` - Base configuration (API, contracts)

**Backend:**
- `base/backend/lib/sui/` - Sui blockchain service
- `base/backend/lib/api/` - API handler utilities
- `base/backend/lib/cors/` - CORS handling
- `base/backend/config/` - Backend configuration
- `base/backend/app/api/` - Base API endpoints (health, tokens)

### Shooter Game App (`apps/shooter-game/`)

**Frontend:**
- `apps/shooter-game/frontend/index.html` - Game entry point
- `apps/shooter-game/frontend/src/game/` - Game code
- `apps/shooter-game/frontend/src/config/` - App-specific config
- `apps/shooter-game/frontend/assets/` - Game assets

**Backend:**
- `apps/shooter-game/backend/app/api/` - Game API endpoints

**Contracts:**
- `apps/shooter-game/contracts/` - Game smart contracts

### Original Backend (`backend/`)

Contains game-specific services that apps reference:
- `backend/lib/sui/` - Achievement, tournament, store services
- `backend/lib/services/` - Price converter, item catalog, etc.

**Note:** These could be moved to `apps/shooter-game/backend/lib/` for better isolation in the future.

## 🔧 Configuration

### Frontend Configuration

Base config is loaded first, then app-specific config extends it:

1. `base/frontend/src/config/api-config.js` - Base API configuration
2. `base/frontend/src/config/contract-config.js` - Base contract configuration
3. `apps/shooter-game/frontend/src/config/contract-config.js` - App-specific contracts

Configuration can be overridden via HTML meta tags:
```html
<meta name="backend-url" content="https://your-backend.vercel.app/api" />
<meta name="wallet-module-url" content="https://your-wallet.vercel.app/wallet-api.umd.cjs" />
```

### Backend Configuration

Backend uses environment variables (see `backend/.env.example`):
- `SUI_NETWORK` - testnet or mainnet
- Contract addresses
- Admin wallet configuration

## 📚 Documentation

### Architecture & Refactoring
- **[Multi-App Architecture](docs/codebase-cleanup/MULTI_APP_ARCHITECTURE.md)** - Architecture overview
- **[How It Works](docs/codebase-cleanup/HOW_IT_WORKS.md)** - How the structure works
- **[Creating New Apps](docs/codebase-cleanup/CREATING_NEW_APPS.md)** - Guide for adding new apps
- **[Configuration Pattern](docs/codebase-cleanup/CONFIGURATION_PATTERN.md)** - Configuration approach

### Development
- **[Local Development Guide](LOCAL_DEVELOPMENT.md)** - Complete setup instructions
- **[Vercel Deployment Guide](VERCEL_DEPLOYMENT_GUIDE.md)** - Production deployment
- **[Frontend Configuration](FRONTEND_CONFIGURATION.md)** - Frontend config details

### Game-Specific
- **[Project Status](docs/project-status/PROJECT_STATUS.md)** - Current project status
- **[Sui Integration](docs/sui-integration/)** - Blockchain integration guides

## 🎮 Applications

### Shooter Game

The first application, a modular JavaScript shooter game with:
- Sui blockchain integration
- Wallet connection
- Score submission
- Leaderboards
- Tournaments
- Store and inventory
- Achievement system

**Entry Point:** `apps/shooter-game/frontend/index.html`

## 🔄 Adding New Apps

To add a new application:

1. Create `apps/your-app/` directory
2. Create `apps/your-app/frontend/` with `index.html`
3. Load base configs from `../../base/frontend/src/config/`
4. Create app-specific config in `apps/your-app/frontend/src/config/`
5. Create backend endpoints in `apps/your-app/backend/app/api/`
6. Import base services using relative paths: `../../../../base/backend/lib/...`

See **[Creating New Apps](docs/codebase-cleanup/CREATING_NEW_APPS.md)** for detailed instructions.

## 🧪 Testing

Run tests from the root directory:
```bash
npm test
```

## 📝 Scripts

- `npm run dev:all` - Start all services (backend + frontend server)
- `npm run verify-refactoring` - Verify refactoring structure
- `npm run test-base-imports` - Test base import paths

## 🤝 Contributing

1. Follow the multi-app architecture pattern
2. Keep base code app-agnostic
3. Use relative imports (no `@/` aliases)
4. Document app-specific features

## 📄 License

[Add your license here]

---

**Last Updated:** 2025-01-04  
**Status:** ✅ Multi-app architecture complete, ready for new apps
