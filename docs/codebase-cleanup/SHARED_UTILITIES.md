# Shared Utilities (Base Layer)

## 🎯 Overview

The `base/` folder contains all the **reusable infrastructure** that every SuiTwo app needs. These are utilities that are:
- ✅ App-agnostic (no app-specific logic)
- ✅ Reusable across all apps
- ✅ Well-documented
- ✅ Maintained centrally

---

## 📦 What Goes in Base

### 1. **Wallet Integration** 💰
**Location:** `base/frontend/src/infrastructure/wallet/`

**What it does:**
- Connects to Sui wallets (Slush, Sui Wallet, Phantom, etc.)
- Checks token balances
- Signs transactions
- Handles wallet events (connect/disconnect)

**Files:**
- `wallet-connection.js` - Main wallet connection logic
- `wallet-utils.js` - Wallet helper functions

**Why shared:** Every app needs wallet connection.

**Used by:**
- ✅ Shooter Game (for token gating, score submission)
- ✅ Community Foundry (for donations, contributor verification)
- ✅ Future apps (any app that needs wallet)

---

### 2. **Sui Blockchain Service** ⛓️
**Location:** `base/backend/lib/sui/`

**What it does:**
- Connects to Sui network (testnet/mainnet)
- Queries blockchain data
- Gets token balances
- Verifies transactions
- Reads smart contract state

**Files:**
- `suiService.ts` - Main Sui blockchain service
- `sui-client.ts` - Sui client initialization
- `sui-utils.ts` - Sui helper functions

**Why shared:** All apps interact with Sui blockchain.

**Used by:**
- ✅ Shooter Game (verify scores, check balances)
- ✅ Community Foundry (check donations, verify contributors)
- ✅ Future apps (any blockchain interaction)

---

### 3. **API Client** 🌐
**Location:** `base/frontend/src/infrastructure/api/`

**What it does:**
- Makes HTTP requests to backend
- Handles authentication
- Manages request/response
- Error handling
- Request caching (optional)

**Files:**
- `api-client.js` - Main API client
- `api-utils.js` - API helper functions

**Why shared:** All apps need to call backend APIs.

**Used by:**
- ✅ Shooter Game (submit scores, get leaderboard)
- ✅ Community Foundry (get projects, submit donations)
- ✅ Future apps (any backend communication)

---

### 4. **API Handler Utilities** 🔧
**Location:** `base/backend/lib/api/`

**What it does:**
- Standardizes API route handling
- Error handling
- Request validation
- Response formatting
- CORS handling

**Files:**
- `api-handler.ts` - Main API handler wrapper
- `error-handler.ts` - Error handling utilities
- `request-validator.ts` - Request validation

**Why shared:** All backend APIs need consistent handling.

**Used by:**
- ✅ Shooter Game backend (scores, leaderboard endpoints)
- ✅ Community Foundry backend (projects, donations endpoints)
- ✅ Future apps (any backend routes)

---

### 5. **Configuration System** ⚙️
**Location:** `base/frontend/src/config/` and `base/backend/config/`

**What it does:**
- Manages API URLs (local vs production)
- Manages contract addresses
- Environment detection
- App-agnostic defaults

**Files:**
- `api-config.js` - API URL configuration
- `contract-config.js` - Contract address configuration
- `config.ts` (backend) - Backend configuration

**Why shared:** All apps need consistent configuration.

**Used by:**
- ✅ Shooter Game (knows where backend is, which contracts to use)
- ✅ Community Foundry (knows where backend is, which contracts to use)
- ✅ Future apps (same configuration system)

---

### 6. **CORS & Security** 🔒
**Location:** `base/backend/lib/`

**What it does:**
- CORS configuration
- Security headers
- Rate limiting (if needed)
- Authentication helpers

**Files:**
- `cors.ts` - CORS configuration
- `auth.ts` - Authentication utilities (if needed)

**Why shared:** All backend APIs need security.

**Used by:**
- ✅ Shooter Game backend
- ✅ Community Foundry backend
- ✅ Future apps backend

---

### 7. **Base API Endpoints** 🛣️
**Location:** `base/backend/app/api/`

**What it does:**
- Health check endpoint
- Token balance endpoint
- Other universal endpoints

**Files:**
- `health/route.ts` - Health check
- `tokens/balance/[address]/route.ts` - Token balance

**Why shared:** All apps need these basic endpoints.

**Used by:**
- ✅ Shooter Game (health check, token balance)
- ✅ Community Foundry (health check, token balance)
- ✅ Future apps (same endpoints)

---

### 8. **Wallet Module (UMD Bundle)** 📦
**Location:** `base/wallet-module/`

**What it does:**
- Pre-built wallet integration bundle
- React-based wallet provider
- UMD format for easy inclusion

**Files:**
- `wallet-module/dist/wallet-api.umd.cjs` - Built bundle
- `wallet-module/src/` - Source code

**Why shared:** All apps can use the same wallet module.

**Used by:**
- ✅ Shooter Game
- ✅ Community Foundry
- ✅ Future apps

---

## 🚫 What Does NOT Go in Base

### ❌ App-Specific Logic
- Game mechanics (enemies, bosses, projectiles)
- Community Foundry project cards
- App-specific UI components
- App-specific business logic

### ❌ App-Specific Endpoints
- Game score submission
- Tournament endpoints
- Community Foundry project endpoints
- App-specific data models

### ❌ App-Specific Contracts
- Game score contract
- Community Foundry funding contract
- App-specific smart contracts

**Rule of Thumb:** If it's specific to one app, it goes in that app's folder, not in base.

---

## 📊 Base vs App Comparison

| Feature | Base (Shared) | App (Specific) |
|---------|---------------|----------------|
| **Wallet Connection** | ✅ Yes | ❌ No |
| **Sui Blockchain Service** | ✅ Yes | ❌ No |
| **API Client** | ✅ Yes | ❌ No |
| **Game Mechanics** | ❌ No | ✅ Shooter Game |
| **Project Cards** | ❌ No | ✅ Community Foundry |
| **Score Submission** | ❌ No | ✅ Shooter Game |
| **Donation System** | ❌ No | ✅ Community Foundry |
| **Health Check** | ✅ Yes | ❌ No |
| **Token Balance** | ✅ Yes | ❌ No |

---

## 🔄 How Apps Use Base

### Example: Shooter Game

```javascript
// apps/shooter-game/frontend/src/game/main.js

// Import from BASE
import { connectWallet } from '../../../base/frontend/src/infrastructure/wallet/wallet-connection.js';
import { getApiClient } from '../../../base/frontend/src/infrastructure/api/api-client.js';
import { getConfig } from '../../../base/frontend/src/config/api-config.js';

// Use base utilities
const wallet = await connectWallet();
const api = getApiClient();
const config = getConfig();

// Game-specific code (stays in app)
function startGame() {
  // Game logic here
}
```

### Example: Community Foundry

```javascript
// apps/community-foundry/frontend/src/app/main.js

// Import from BASE (same base!)
import { connectWallet } from '../../../base/frontend/src/infrastructure/wallet/wallet-connection.js';
import { getApiClient } from '../../../base/frontend/src/infrastructure/api/api-client.js';

// Use base utilities
const wallet = await connectWallet();
const api = getApiClient();

// Foundry-specific code (stays in app)
function displayProjects() {
  // Foundry logic here
}
```

---

## 🎯 Benefits of Shared Utilities

### ✅ Code Reuse
- Write wallet connection once, use everywhere
- No duplication across apps

### ✅ Consistency
- All apps use same wallet integration
- Same API patterns
- Same configuration approach

### ✅ Easy Maintenance
- Fix bugs in base, all apps benefit
- Update Sui SDK in one place
- Centralized improvements

### ✅ Faster Development
- New apps can start immediately
- Don't need to rebuild wallet connection
- Focus on app-specific features

---

## 📝 Summary

**Base contains:**
1. ✅ Wallet integration
2. ✅ Sui blockchain service
3. ✅ API client
4. ✅ API handler utilities
5. ✅ Configuration system
6. ✅ CORS & security
7. ✅ Base API endpoints
8. ✅ Wallet module bundle

**Base does NOT contain:**
- ❌ App-specific logic
- ❌ App-specific endpoints
- ❌ App-specific contracts
- ❌ App-specific UI

**Result:** Clean separation between shared infrastructure and app-specific code.

---

**Last Updated:** 2025-01-XX  
**Status:** Shared Utilities Defined
