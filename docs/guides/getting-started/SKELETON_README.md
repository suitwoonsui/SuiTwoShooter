# Project Skeleton - Multi-App Architecture

This document explains the structure of the SuiTwo multi-app platform and how to navigate it.

## 🏗️ Directory Structure

```
shootergame/
│
├── base/                          # SHARED INFRASTRUCTURE (app-agnostic)
│   ├── frontend/
│   │   └── src/
│   │       ├── infrastructure/    # Wallet, API client
│   │       └── config/            # Base configs (API, contracts)
│   │
│   ├── backend/
│   │   ├── lib/
│   │   │   ├── sui/               # Sui blockchain service
│   │   │   ├── api/               # API handler utilities
│   │   │   └── cors/              # CORS handling
│   │   ├── config/                # Backend configuration
│   │   └── app/api/               # Base endpoints (health, tokens)
│   │
│   └── wallet-module/             # Shared wallet integration
│
├── apps/                           # INDEPENDENT APPLICATIONS
│   └── shooter-game/              # First app: Shooter Game
│       ├── frontend/
│       │   ├── index.html         # Entry point
│       │   ├── src/
│       │   │   ├── game/          # Game code
│       │   │   └── config/        # App-specific config
│       │   └── assets/            # Game assets
│       │
│       ├── backend/
│       │   └── app/api/           # Game API endpoints
│       │
│       └── contracts/              # Game smart contracts
│
├── backend/                        # ORIGINAL BACKEND (game-specific services)
│   └── lib/
│       ├── sui/                   # Achievement, tournament, store services
│       └── services/              # Price converter, item catalog, etc.
│
├── contracts/                      # ORIGINAL CONTRACTS (legacy)
│
└── docs/                           # Documentation
    └── codebase-cleanup/          # Architecture and refactoring docs
```

## 🎯 Key Concepts

### Base Layer (`base/`)

**Purpose:** Shared infrastructure that all apps use.

**What goes here:**
- ✅ Wallet connection logic
- ✅ Sui blockchain service
- ✅ API handler utilities
- ✅ CORS/security middleware
- ✅ Base configuration
- ✅ Shared utilities

**What does NOT go here:**
- ❌ Game-specific logic
- ❌ App-specific features
- ❌ Hardcoded contract addresses (use config)
- ❌ App-specific UI components

### App Layer (`apps/`)

**Purpose:** Independent applications, each with their own:
- Frontend code
- Backend API endpoints
- Smart contracts
- Assets
- Configuration

**Pattern:**
- Each app imports from `base/` using relative paths
- Each app can have app-specific config that extends base config
- Apps are side-by-side, not nested

### Original Backend (`backend/`)

**Purpose:** Contains game-specific services that are still referenced by apps.

**Note:** These could be moved to `apps/shooter-game/backend/lib/` for better isolation in the future.

## 📂 File Locations

### Frontend Entry Points
- **Shooter Game:** `apps/shooter-game/frontend/index.html`

### Configuration Files
- **Base API Config:** `base/frontend/src/config/api-config.js`
- **Base Contract Config:** `base/frontend/src/config/contract-config.js`
- **Game Contract Config:** `apps/shooter-game/frontend/src/config/contract-config.js`
- **Backend Config:** `base/backend/config/config.ts`

### Backend Endpoints
- **Base Endpoints:** `base/backend/app/api/` (health, tokens)
- **Game Endpoints:** `apps/shooter-game/backend/app/api/` (scores, leaderboard, tournaments, store, achievements)

### Services
- **Base Services:** `base/backend/lib/` (suiService, api-handler, cors)
- **Game Services:** `backend/lib/sui/` (achievement-service, tournament-service, store-service, etc.)

## 🔗 Import Patterns

### From App to Base (Frontend)
```javascript
// In apps/shooter-game/frontend/src/game/...
import { WalletAPI } from '../../../../base/frontend/src/infrastructure/wallet-connection';
```

### From App to Base (Backend)
```typescript
// In apps/shooter-game/backend/app/api/...
import { suiService } from '../../../../../base/backend/lib/sui/suiService';
import { withApiHandler } from '../../../../../base/backend/lib/api/api-handler';
```

### From App to Original Backend (Game Services)
```typescript
// In apps/shooter-game/backend/app/api/...
import { storeService } from '../../../../../../../backend/lib/sui/store-service';
```

## 🆕 Creating a New App

1. **Create directory structure:**
   ```
   apps/your-app/
   ├── frontend/
   │   ├── index.html
   │   ├── src/
   │   └── assets/
   ├── backend/
   │   └── app/api/
   └── contracts/
   ```

2. **Load base configs in HTML:**
   ```html
   <script src="../../base/frontend/src/config/api-config.js"></script>
   <script src="../../base/frontend/src/config/contract-config.js"></script>
   <script src="src/config/contract-config.js"></script> <!-- App-specific -->
   ```

3. **Import base services:**
   ```typescript
   // Use relative paths to base/
   import { suiService } from '../../../../base/backend/lib/sui/suiService';
   ```

4. **Create app-specific config:**
   ```javascript
   // apps/your-app/frontend/src/config/contract-config.js
   window.APP_CONTRACT_CONFIG = {
     packageId: '0x...',
     // Your app's contracts
   };
   ```

See **[Creating New Apps](docs/codebase-cleanup/CREATING_NEW_APPS.md)** for detailed guide.

## 📚 Documentation Locations

- **Architecture:** `docs/codebase-cleanup/MULTI_APP_ARCHITECTURE.md`
- **How It Works:** `docs/codebase-cleanup/HOW_IT_WORKS.md`
- **Creating Apps:** `docs/codebase-cleanup/CREATING_NEW_APPS.md`
- **Configuration:** `docs/codebase-cleanup/CONFIGURATION_PATTERN.md`
- **Refactoring Status:** `docs/codebase-cleanup/REFACTORING_STATUS.md`

## ⚠️ Important Notes

1. **No `@/` aliases:** Use relative paths only
2. **Base is app-agnostic:** No hardcoded app-specific values
3. **Apps are independent:** Each app can be deployed separately
4. **Shared services:** Game-specific services in `backend/` are shared for now
5. **Config pattern:** Base config → App config (extends/overrides)

## 🔍 Finding Things

**Looking for:**
- **Wallet code?** → `base/frontend/src/infrastructure/wallet-connection.js`
- **Sui service?** → `base/backend/lib/sui/suiService.ts`
- **Game code?** → `apps/shooter-game/frontend/src/game/`
- **Game API?** → `apps/shooter-game/backend/app/api/`
- **Store service?** → `backend/lib/sui/store-service.ts`
- **Config?** → `base/frontend/src/config/` or `apps/shooter-game/frontend/src/config/`

---

**Last Updated:** 2025-01-04  
**Status:** ✅ Complete skeleton structure
