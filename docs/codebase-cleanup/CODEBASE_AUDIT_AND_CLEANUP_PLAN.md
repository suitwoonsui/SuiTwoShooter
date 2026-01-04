# SuiTwo Ecosystem Codebase Audit & Cleanup Plan

## 📋 Executive Summary

This document provides a comprehensive audit of the current codebase (originally a shooter game) and outlines a plan to transform it into a **reusable base infrastructure** for building multiple SuiTwo ecosystem applications.

**Goal:** Create a shared base/skeleton that can be used by ALL SuiTwo apps. The **Shooter Game** becomes the first app (refactored to use the base), and **Community Foundry** will be the second app. Future apps can be added alongside these, all sharing the same base infrastructure.

**Architecture:** Multi-app structure with shared base + individual app implementations.

**Key Insight:** The current game code doesn't get deleted - it gets reorganized into `apps/shooter-game/` and refactored to use the shared base infrastructure. This makes it a reference implementation for how to build apps on the base.

---

## 🔍 Current Codebase Structure

### What We Have

```
SuiTwo Community Foundry/
├── Frontend (Vanilla JS/HTML)
│   ├── index.html - Game entry point
│   ├── src/ - Game source code
│   │   ├── game/ - Game systems (enemies, bosses, projectiles, etc.)
│   │   ├── config/ - API & contract configuration
│   │   └── utils/ - Helper functions
│   └── assets/ - Game assets (images, sounds)
│
├── Backend (Next.js API)
│   ├── app/api/ - API routes
│   │   ├── scores/ - Game score submission
│   │   ├── leaderboard/ - Game leaderboard
│   │   ├── badges/ - Badge system
│   │   ├── store/ - In-game store
│   │   ├── tournaments/ - Tournament system
│   │   └── admin/ - Admin panel
│   ├── lib/sui/ - Sui blockchain service
│   └── config/ - Configuration management
│
├── Smart Contracts (Move)
│   └── suitwo_game/ - Game score submission contract
│
└── Wallet Module (React/UMD)
    └── wallet-module/ - Wallet connection & balance checking
```

---

## 🎯 What to Keep (Reusable Infrastructure)

### ✅ **1. Wallet Integration System**
**Location:** `wallet-module/`, `src/game/blockchain/wallet-connection.js`

**What it does:**
- Wallet connection via Sui Wallet Standard
- Token balance checking
- Transaction signing utilities
- Multi-wallet support (Slush, Sui Wallet, Phantom, etc.)

**Why keep:** Core infrastructure for any SuiTwo app

**Files to preserve:**
- `wallet-module/` (entire directory)
- `src/game/blockchain/wallet-connection.js` (can be moved to `src/infrastructure/wallet/`)

---

### ✅ **2. Backend API Infrastructure**
**Location:** `backend/`

**What it does:**
- Next.js API structure
- Sui blockchain service (`lib/sui/suiService.ts`)
- Configuration management (`config/config.ts`)
- CORS handling (`lib/cors.ts`)
- API handler utilities (`lib/api/api-handler.ts`)

**Why keep:** Reusable backend for any SuiTwo ecosystem app

**Files to preserve:**
- `backend/lib/sui/suiService.ts` - Core Sui blockchain service
- `backend/lib/cors.ts` - CORS configuration
- `backend/lib/api/api-handler.ts` - API handler utilities
- `backend/config/config.ts` - Configuration management
- `backend/app/api/health/route.ts` - Health check endpoint
- `backend/app/api/tokens/balance/[address]/route.ts` - Token balance endpoint
- `backend/package.json` - Dependencies
- `backend/next.config.ts` - Next.js configuration
- `backend/tsconfig.json` - TypeScript configuration

**Files to adapt/remove:**
- `backend/app/api/scores/` - Game-specific (remove or adapt for general data)
- `backend/app/api/leaderboard/` - Game-specific (remove or adapt)
- `backend/app/api/store/` - Game-specific store (remove or adapt for Community Foundry)
- `backend/app/api/tournaments/` - Game-specific (remove)
- `backend/app/api/badges/` - May be reusable (evaluate)
- `backend/app/admin/` - Admin panel structure (keep skeleton, remove game-specific)

---

### ✅ **3. Configuration System**
**Location:** `src/config/`

**What it does:**
- API URL configuration (local vs production)
- Contract address management
- Environment detection

**Why keep:** Needed for all apps

**Files to preserve:**
- `src/config/api-config.js` - API configuration
- `src/config/contract-config.js` - Contract configuration (adapt for Community Foundry)

---

### ✅ **4. Smart Contract Patterns**
**Location:** `contracts/`

**What it does:**
- Move contract structure
- Deployment patterns
- Contract interaction examples

**Why keep:** Reference for future contracts

**Files to preserve:**
- `contracts/README.md` - Documentation
- Contract structure as reference (but remove game-specific contract)

---

### ✅ **5. Documentation**
**Location:** `docs/`

**What it does:**
- Sui integration guides
- Deployment guides
- Architecture documentation

**Why keep:** Valuable reference material

**Files to preserve:**
- `docs/sui-integration/` - Sui blockchain integration guides
- `VERCEL_DEPLOYMENT_GUIDE.md` - Deployment patterns
- `LOCAL_DEVELOPMENT.md` - Development setup

---

## 🔄 What to Reorganize (Game Code → First App)

### 🎮 **1. Game Logic & Systems → Shooter Game App**
**Current Location:** `src/game/`  
**New Location:** `apps/shooter-game/frontend/src/game/`

**Move (don't delete):**
- `src/game/systems/` → `apps/shooter-game/frontend/src/game/systems/` (enemies, bosses, projectiles, collision, etc.)
- `src/game/rendering/` → `apps/shooter-game/frontend/src/game/rendering/` (game rendering code)
- `src/game/audio/` → `apps/shooter-game/frontend/src/game/audio/` (game audio system)
- `src/game/main.js` → `apps/shooter-game/frontend/src/game/main.js` (game loop and state management)
- `src/game/shared/` → `apps/shooter-game/frontend/src/game/shared/` (game-specific shared utilities)

**Refactor:** Update imports to use base infrastructure instead of local blockchain code

**Exception:** `src/game/blockchain/` → Move to `base/frontend/src/infrastructure/wallet/` (shared)

---

### 🎮 **2. Game Assets → Shooter Game App**
**Current Location:** `assets/`  
**New Location:** `apps/shooter-game/frontend/assets/`

**Move:**
- All game images (enemies, bosses, projectiles, etc.) → `apps/shooter-game/frontend/assets/`
- Game audio files → `apps/shooter-game/frontend/assets/`
- Game-specific UI elements → `apps/shooter-game/frontend/assets/`

**Move to Base:**
- `assets/sui.svg` → `base/frontend/assets/sui.svg` (shared Sui logo)
- SuiTwo branding assets → `base/frontend/assets/` (if reusable across apps)

---

### 🎮 **3. Game-Specific Backend Endpoints → Shooter Game App**
**Current Location:** `backend/app/api/`  
**New Location:** `apps/shooter-game/backend/app/api/`

**Move:**
- `backend/app/api/scores/` → `apps/shooter-game/backend/app/api/scores/` (game score submission)
- `backend/app/api/leaderboard/` → `apps/shooter-game/backend/app/api/leaderboard/` (game leaderboard)
- `backend/app/api/tournaments/` → `apps/shooter-game/backend/app/api/tournaments/` (tournament system)
- `backend/app/api/store/` → `apps/shooter-game/backend/app/api/store/` (in-game store)

**Evaluate for Base:**
- `backend/app/api/badges/` - Could go in base if badges are used across apps, or stay in shooter-game if game-specific
- Admin panel structure - Base provides infrastructure, apps provide tabs

---

### 🎮 **4. Game-Specific Smart Contracts → Shooter Game App**
**Current Location:** `contracts/suitwo_game/`  
**New Location:** `apps/shooter-game/contracts/suitwo_game/`

**Move:**
- `contracts/suitwo_game/` → `apps/shooter-game/contracts/suitwo_game/` (game score submission contract)

**Keep in Base:**
- Contract deployment patterns and utilities (if any)
- Contract documentation templates

---

### 🎮 **5. Game-Specific Frontend → Shooter Game App**
**Current Location:** `index.html`, `src/`  
**New Location:** `apps/shooter-game/frontend/`

**Move:**
- `index.html` → `apps/shooter-game/frontend/index.html` (game entry point)
- Game canvas and rendering → `apps/shooter-game/frontend/src/game/`
- Game UI overlays → `apps/shooter-game/frontend/src/game/ui/`
- Game-specific modals (settings, instructions, sound test) → `apps/shooter-game/frontend/src/game/ui/`
- Game state management → `apps/shooter-game/frontend/src/game/`

**Refactor:**
- Update to import wallet connection from `base/`
- Update to use base API client
- Keep game-specific logic in app

---

### 🗑️ **6. Test Files**
**Location:** `tests/`, `*.test.html`

**Remove:**
- Game-specific test files
- Test HTML files (mobile-test.html, etc.)

**Keep:**
- Backend test structure (if any) as reference

---

## 🏗️ Proposed Multi-App Structure

After cleanup, the structure should support multiple apps sharing a common base:

```
SuiTwo Ecosystem/
├── base/                          # 🎯 SHARED BASE (Reusable for ALL apps)
│   ├── frontend/
│   │   ├── src/
│   │   │   ├── infrastructure/   # Wallet, API client, utilities
│   │   │   │   ├── wallet/
│   │   │   │   │   └── wallet-connection.js
│   │   │   │   └── api/
│   │   │   │       └── api-client.js
│   │   │   └── config/           # Base configuration
│   │   │       ├── api-config.js
│   │   │       └── contract-config.js
│   │   └── assets/
│   │       └── [Shared assets: Sui logo, etc.]
│   │
│   ├── backend/
│   │   ├── app/api/
│   │   │   ├── health/           # Base health check
│   │   │   └── tokens/           # Base token balance
│   │   ├── lib/
│   │   │   ├── sui/              # Sui blockchain service
│   │   │   │   └── suiService.ts
│   │   │   ├── api/              # API handlers, CORS
│   │   │   │   └── api-handler.ts
│   │   │   └── cors.ts
│   │   └── config/
│   │       └── config.ts
│   │
│   └── wallet-module/            # Shared wallet module
│
├── apps/                          # 🚀 INDIVIDUAL APPS
│   ├── shooter-game/              # 🎮 App #1: Shooter Game (refactored from current code)
│   │   ├── frontend/
│   │   │   ├── index.html         # Game entry point
│   │   │   ├── src/
│   │   │   │   └── game/          # Game systems, rendering, audio
│   │   │   └── assets/            # Game assets (enemies, bosses, etc.)
│   │   ├── backend/
│   │   │   └── app/api/
│   │   │       ├── scores/       # Game score submission
│   │   │       ├── leaderboard/  # Game leaderboard
│   │   │       ├── tournaments/  # Tournament system
│   │   │       └── store/        # In-game store
│   │   └── contracts/
│   │       └── suitwo_game/      # Game score submission contract
│   │
│   ├── community-foundry/        # 🏗️ App #2: Community Foundry
│   │   ├── frontend/
│   │   │   ├── index.html        # App entry point
│   │   │   ├── src/
│   │   │   │   └── app/          # Community Foundry code
│   │   │   └── assets/           # App-specific assets
│   │   ├── backend/
│   │   │   └── app/api/
│   │   │       └── foundry/      # Community Foundry endpoints
│   │   └── contracts/
│   │       └── foundry/          # Community Foundry contracts
│   │
│   └── [future-app]/             # Future apps can be added here
│       ├── frontend/
│       ├── backend/
│       └── contracts/
│
├── contracts/
│   └── README.md                 # Contract documentation
│
└── docs/
    ├── sui-integration/          # Shared integration guides
    └── apps/                     # App-specific docs
        ├── shooter-game/
        └── community-foundry/
```

**Key Principles:**
- **Base layer** = Reusable infrastructure (wallet, API, config)
- **Apps layer** = Individual app implementations
- **Apps import from base** = No duplication
- **Easy to add new apps** = Just create new folder in `apps/`

---

## 📝 Step-by-Step Cleanup Plan

### Phase 1: Audit & Documentation ✅
- [x] Complete codebase audit
- [x] Document what to keep vs remove
- [x] Create cleanup plan

### Phase 2: Create Backup
- [ ] Create a backup branch: `git checkout -b backup/game-code`
- [ ] Tag current state: `git tag v1.0.0-game-complete`

### Phase 3: Extract Base Infrastructure
- [ ] Create `base/` directory structure:
  - `base/frontend/src/infrastructure/` (wallet, API client)
  - `base/frontend/src/config/` (shared config)
  - `base/backend/lib/` (shared services)
- [ ] Create `apps/` directory structure (empty for now)
- [ ] Move wallet connection to `base/frontend/src/infrastructure/wallet/`
- [ ] Move config files to `base/frontend/src/config/`
- [ ] Move shared backend services to `base/backend/lib/`
- [ ] Make base code app-agnostic (no game-specific logic)

### Phase 4: Move Game Code to Shooter Game App
- [ ] Create `apps/shooter-game/` structure
- [ ] Move `src/game/systems/` → `apps/shooter-game/frontend/src/game/systems/`
- [ ] Move `src/game/rendering/` → `apps/shooter-game/frontend/src/game/rendering/`
- [ ] Move `src/game/audio/` → `apps/shooter-game/frontend/src/game/audio/`
- [ ] Move `src/game/main.js` → `apps/shooter-game/frontend/src/game/main.js`
- [ ] Move game assets → `apps/shooter-game/frontend/assets/`
- [ ] Move game backend endpoints → `apps/shooter-game/backend/app/api/`
- [ ] Move game contracts → `apps/shooter-game/contracts/`
- [ ] Update imports to use base infrastructure

### Phase 5: Refactor Shooter Game to Use Base
- [ ] Update game imports to use `base/backend/lib/sui/suiService`
- [ ] Update game to use base wallet connection
- [ ] Update game API calls to use base API client
- [ ] Test that game still works with base infrastructure
- [ ] Update admin panel to use base admin infrastructure

### Phase 6: Update Configuration
- [ ] Update base `api-config.js` to be app-agnostic
- [ ] Create app-specific config overrides in `apps/community-foundry/`
- [ ] Update backend config to support multiple apps
- [ ] Remove game-specific environment variables
- [ ] Document how apps can override base config

### Phase 7: Update Documentation
- [ ] Update README.md for skeleton structure
- [ ] Create `SKELETON_README.md` explaining the structure
- [ ] Document how to build new apps from skeleton
- [ ] Update deployment guides

### Phase 8: Create Community Foundry App (Second App)
- [ ] Create `apps/community-foundry/` structure
- [ ] Create basic `index.html` for Community Foundry
- [ ] Set up app to import from `base/` infrastructure (same pattern as shooter-game)
- [ ] Create placeholder components
- [ ] Integrate wallet connection (from base)
- [ ] Set up basic API client (from base)
- [ ] Create app-specific backend endpoints
- [ ] Use shooter-game as reference for base integration patterns

---

## 🎯 Key Decisions Needed

### 1. **Badge System**
**Question:** Should badge system be in base or app-specific?

**Recommendation:** App-specific. Each app may have different badge/identity systems. Keep badge API structure in base as optional utility, but implementations go in apps.

### 2. **Store System**
**Question:** Should store system be in base or app-specific?

**Recommendation:** App-specific. Community Foundry will have project funding, but other apps may have different store concepts. Keep base utilities (payment processing), but store logic goes in apps.

### 3. **Leaderboard**
**Question:** Should leaderboard be in base or app-specific?

**Recommendation:** App-specific. Each app may have different leaderboard needs. Base can provide utilities (data structures, sorting), but implementations go in apps.

### 4. **Admin Panel**
**Question:** Should admin panel be in base or app-specific?

**Recommendation:** Hybrid. Base provides admin infrastructure (auth, routing, layout), but each app has its own admin tabs/features.

### 5. **Smart Contracts**
**Question:** How should contracts be organized?

**Recommendation:** App-specific contracts in `apps/[app]/contracts/`, shared contract utilities/patterns in `base/contracts/` (if any).

---

## 🔧 Technical Considerations

### Import Path Updates
After reorganization, import paths will follow base/app structure:
- Base code: `base/frontend/src/infrastructure/wallet/`
- App code imports from base: `../../base/frontend/src/infrastructure/wallet/`
- Or use path aliases: `@base/infrastructure/wallet`
- Game-specific imports → Remove or adapt

### Configuration Updates
- Base config should be app-agnostic
- Apps can override/extend base config
- Environment variables should support multiple apps
- Contract addresses per app (not global)

### Build System
- Keep wallet-module build system (Vite)
- Keep backend build system (Next.js)
- Frontend remains vanilla JS (no build step needed)

---

## 📊 Estimated Cleanup Scope

**Files to Remove:** ~200-300 files
**Files to Keep/Adapt:** ~50-70 files
**Files to Create:** ~20-30 files (new structure)

**Time Estimate:** 4-6 hours for complete cleanup

---

## ✅ Success Criteria

After cleanup, the base + apps structure should:
1. ✅ Have Shooter Game as first app (refactored to use base)
2. ✅ Have working shared base infrastructure (wallet, API, config)
3. ✅ Have Shooter Game serve as reference implementation for base usage
4. ✅ Have clear separation: base (shared) vs apps (specific)
5. ✅ Have documentation for adding new apps
6. ✅ Be ready for Community Foundry as second app
7. ✅ Make it easy to add future apps (just create new folder in `apps/`)
8. ✅ Shooter Game should still work exactly as before, but using base infrastructure

---

## 🚀 Next Steps

1. **Review this plan** - Discuss any changes or concerns
2. **Create backup** - Ensure we can restore if needed
3. **Begin Phase 3** - Start reorganization
4. **Iterate** - Clean up incrementally, test as we go

---

## 📚 Related Documents

- `SuiTwo Community Foundry.md` - Project vision and requirements
- `docs/sui-integration/` - Sui blockchain integration guides
- `backend/README.md` - Backend API documentation

---

**Last Updated:** 2025-01-XX
**Status:** Ready for Review
