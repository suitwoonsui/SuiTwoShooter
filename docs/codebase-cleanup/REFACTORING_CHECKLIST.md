# Refactoring Checklist

## 📋 Status Legend
- [ ] Not Started
- [🔄] In Progress
- [✅] Completed
- [❌] Blocked/Issues

---

## ✅ Pre-Flight Checklist

Before starting refactoring:

- [ ] Current codebase is in working state
- [ ] All tests pass (if any)
- [ ] Git repository is clean (commit or stash changes)
- [ ] Backup branch created: `git checkout -b backup/before-refactor`
- [ ] Tagged current state: `git tag v1.0.0-before-refactor`
- [ ] Read all documentation in `docs/codebase-cleanup/`
- [ ] Understand the architecture (base + apps, not nested)

---

## Phase 1: Extract Base Infrastructure

**Goal:** Create `base/` folder with shared utilities

### Directory Structure
- [✅] Create `base/frontend/src/infrastructure/wallet/`
- [✅] Create `base/frontend/src/infrastructure/api/`
- [✅] Create `base/frontend/src/config/`
- [✅] Create `base/backend/lib/sui/`
- [✅] Create `base/backend/lib/api/`
- [✅] Create `base/backend/config/`
- [✅] Create `base/backend/app/api/health/`
- [✅] Create `base/backend/app/api/tokens/balance/`

### Move Files to Base
- [✅] Move wallet connection: `src/game/blockchain/wallet-connection.js` → `base/frontend/src/infrastructure/wallet/wallet-connection.js`
- [✅] Update wallet connection internal imports
- [✅] Move Sui service: `backend/lib/sui/suiService.ts` → `base/backend/lib/sui/suiService.ts`
- [✅] Update Sui service imports
- [✅] Move API handler: `backend/lib/api/api-handler.ts` → `base/backend/lib/api/api-handler.ts`
- [✅] Move CORS: `backend/lib/cors.ts` → `base/backend/lib/cors.ts`
- [✅] Move config files: `src/config/api-config.js` → `base/frontend/src/config/api-config.js`
- [✅] Move config files: `src/config/contract-config.js` → `base/frontend/src/config/contract-config.js`
- [✅] Move backend config: `backend/config/config.ts` → `base/backend/config/config.ts`
- [✅] Move health endpoint: `backend/app/api/health/route.ts` → `base/backend/app/api/health/route.ts`
- [✅] Update health endpoint imports
- [✅] Move token balance endpoint: `backend/app/api/tokens/balance/[address]/route.ts` → `base/backend/app/api/tokens/balance/[address]/route.ts`
- [✅] Update token balance endpoint imports
- [✅] Move wallet-module: `wallet-module/` → `base/wallet-module/`

### Base Code Updates
- [ ] Update all base code imports (base code imports from within base)
- [ ] Remove references to old locations in base code
- [ ] Make base code app-agnostic (no game-specific logic)

### Testing
- [ ] Base code compiles/runs independently (if possible)

---

## Phase 2: Create Apps Structure

**Goal:** Create `apps/shooter-game/` folder structure

### Directory Structure
- [ ] Create `apps/shooter-game/frontend/src/game/`
- [ ] Create `apps/shooter-game/frontend/assets/`
- [ ] Create `apps/shooter-game/backend/app/api/`
- [ ] Create `apps/shooter-game/contracts/`

### Move Game Frontend Code
- [ ] Move `src/game/systems/` → `apps/shooter-game/frontend/src/game/systems/`
- [ ] Move `src/game/rendering/` → `apps/shooter-game/frontend/src/game/rendering/`
- [ ] Move `src/game/audio/` → `apps/shooter-game/frontend/src/game/audio/`
- [ ] Move `src/game/main.js` → `apps/shooter-game/frontend/src/game/main.js`
- [ ] Move `src/game/shared/` → `apps/shooter-game/frontend/src/game/shared/`
- [ ] Move `index.html` → `apps/shooter-game/frontend/index.html`

### Move Game Assets
- [ ] Move game-specific assets from `assets/` → `apps/shooter-game/frontend/assets/`
- [ ] Keep shared assets (like `sui.svg`) in `base/frontend/assets/`

### Move Game Backend Endpoints
- [ ] Move `backend/app/api/scores/` → `apps/shooter-game/backend/app/api/scores/`
- [ ] Move `backend/app/api/leaderboard/` → `apps/shooter-game/backend/app/api/leaderboard/`
- [ ] Move `backend/app/api/tournaments/` → `apps/shooter-game/backend/app/api/tournaments/`
- [ ] Move `backend/app/api/store/` → `apps/shooter-game/backend/app/api/store/`

### Move Game Contracts
- [ ] Move `contracts/suitwo_game/` → `apps/shooter-game/contracts/suitwo_game/`

### Admin Panel (Evaluate)
- [ ] Evaluate admin panel structure
- [ ] Decide: Keep structure in base, move game-specific tabs to app
- [ ] OR: Move entire admin to `apps/shooter-game/backend/app/admin/`

### Testing
- [ ] Game code is moved (imports will be broken - expected)

---

## Phase 3: Refactor Game to Use Base

**Goal:** Update game to import from `base/` instead of local files

### Frontend Imports
- [✅] Update wallet imports in game frontend
- [✅] Update API client imports in game frontend
- [✅] Update config imports in game frontend
- [✅] Update HTML entry point script tags

### Backend Imports
- [✅] Update Sui service imports in game backend
- [✅] Update API handler imports in game backend
- [✅] Update CORS imports in game backend

### Fix All Import Paths
- [✅] Search for old import paths
- [✅] Update to use `base/` paths
- [✅] Update game-specific service imports
- [✅] Update dynamic imports
- [✅] All imports verified after updating

### Testing
- [ ] Game loads in browser
- [ ] Wallet connection works
- [ ] Token balance checking works
- [ ] Score submission works
- [ ] Leaderboard works
- [ ] All game features functional
- [ ] No console errors
- [ ] All imports resolve correctly
- [ ] Backend API endpoints work
- [ ] Admin panel works (if applicable)

---

## Phase 4: Update Configuration

**Goal:** Make config app-agnostic, support multiple apps

### Base Config Updates
- [✅] Update `base/frontend/src/config/api-config.js` to be app-agnostic
- [✅] Remove game-specific values from base config
- [✅] Use environment variables in base config
- [✅] Update `base/backend/config/config.ts` to support multiple apps
- [✅] Use app-specific environment variables

### App Config (Optional)
- [✅] Create `apps/shooter-game/frontend/src/config/contract-config.js` (app-specific contracts)

### Environment Variables
- [ ] Document which variables are base vs app-specific
- [ ] Update `.env.example` files
- [ ] Document config override pattern

### Testing
- [ ] Config works for game
- [ ] Config ready for future apps

---

## Phase 5: Testing & Validation

**Goal:** Ensure game works with new structure

### Functional Testing
- [✅] Game loads in browser
- [✅] Wallet connection works
- [✅] Token balance checking works
- [✅] Score submission works
- [✅] Leaderboard works
- [✅] All game features functional
- [✅] No console errors (minor warnings remain, non-critical)
- [✅] All imports resolve correctly
- [✅] Backend API endpoints work
- [✅] Admin panel works (if applicable)

### Code Quality
- [✅] No duplicate code (wallet, API, Sui service)
- [✅] Base code is app-agnostic
- [✅] All imports use correct paths
- [✅] No broken references
- [✅] Force field rendering refactored to shared utility (eliminates duplication)

---

## Phase 6: Cleanup

**Goal:** Remove old files, update documentation

### Remove Old Files
- [ ] Remove old empty directories (`src/game/`, `src/config/`, etc.)
- [ ] Clean up any leftover files
- [ ] Verify nothing important was missed

### Documentation Updates
- [✅] Update `README.md` for new structure
- [✅] Update setup instructions in README
- [✅] Update deployment instructions in README
- [✅] Create `SKELETON_README.md` explaining the structure
- [✅] Document how to add new apps

### Build System Updates
- [ ] Update `package.json` scripts (if needed)
- [ ] Update paths for new structure
- [ ] Update build scripts

### Git
- [ ] Commit changes: `git commit -m "Refactor: Extract base infrastructure, move game to apps/shooter-game"`
- [ ] Create summary of changes

---

## Phase 7: Verification Checklist

After completion, verify:

- [ ] `base/` folder exists with shared utilities
- [ ] `apps/shooter-game/` folder exists with game code
- [ ] Game imports from `base/` (not local)
- [ ] Game works exactly as before
- [ ] No duplicate code (wallet, API, Sui service)
- [ ] Base code is app-agnostic
- [ ] Documentation updated
- [ ] Git committed
- [ ] Ready for Community Foundry (second app)

---

## Phase 8: Community Foundry (Future)

**Goal:** Create second app using shooter-game as reference

### Structure
- [ ] Create `apps/community-foundry/` structure
- [ ] Create basic `index.html` for Community Foundry
- [ ] Set up app to import from `base/` infrastructure (same pattern as shooter-game)

### Integration
- [ ] Integrate wallet connection (from base)
- [ ] Set up basic API client (from base)
- [ ] Create placeholder components
- [ ] Create app-specific backend endpoints
- [ ] Use shooter-game as reference for base integration patterns

### Testing
- [ ] Community Foundry loads
- [ ] Wallet connection works
- [ ] Base infrastructure works
- [ ] App-specific features work

---

## 📝 Notes

Use this section to track issues, blockers, or important decisions:

---

**Last Updated:** 2025-01-XX  
**Status:** Ready to Begin
