# Handoff Guide: Refactoring the Shooter Game

## 🎯 For the Agent/Developer

This document provides a complete handoff for refactoring the Shooter Game codebase into a multi-app architecture with shared base infrastructure.

---

## 📚 Documentation Overview

All documentation is in `docs/codebase-cleanup/`:

1. **CODEBASE_AUDIT_AND_CLEANUP_PLAN.md** - Complete audit and step-by-step plan
2. **CLEANUP_QUICK_REFERENCE.md** - Quick reference guide
3. **MULTI_APP_ARCHITECTURE.md** - Architecture overview
4. **HOW_IT_WORKS.md** - How the structure works (not nested, side-by-side)
5. **SHARED_UTILITIES.md** - What goes in base (shared code)
6. **CREATING_NEW_APPS.md** - How to create new apps
7. **REFACTORING_ORDER.md** - Why refactor game first
8. **WHERE_TO_WORK.md** - Work in current codebase (same repo)

**This document** - Execution guide and handoff checklist

---

## 🎯 Goal

Transform the current Shooter Game codebase into:
- `base/` - Shared infrastructure (wallet, Sui service, API client)
- `apps/shooter-game/` - Refactored game (first app)
- Ready for `apps/community-foundry/` (second app, future)

---

## ✅ Pre-Flight Checklist

Before starting, ensure:

- [ ] Current codebase is in working state
- [ ] All tests pass (if any)
- [ ] Git repository is clean (commit or stash changes)
- [ ] Backup branch created: `git checkout -b backup/before-refactor`
- [ ] Tagged current state: `git tag v1.0.0-before-refactor`
- [ ] Read all documentation in `docs/codebase-cleanup/`
- [ ] Understand the architecture (base + apps, not nested)

---

## 🚀 Execution Steps

### Phase 1: Extract Base Infrastructure

**Goal:** Create `base/` folder with shared utilities

**Steps:**

1. **Create base directory structure:**
   ```bash
   mkdir -p base/frontend/src/infrastructure/wallet
   mkdir -p base/frontend/src/infrastructure/api
   mkdir -p base/frontend/src/config
   mkdir -p base/backend/lib/sui
   mkdir -p base/backend/lib/api
   mkdir -p base/backend/config
   mkdir -p base/backend/app/api/health
   mkdir -p base/backend/app/api/tokens/balance
   ```

2. **Move wallet connection:**
   - From: `src/game/blockchain/wallet-connection.js`
   - To: `base/frontend/src/infrastructure/wallet/wallet-connection.js`
   - Update any internal imports

3. **Move Sui service:**
   - From: `backend/lib/sui/suiService.ts`
   - To: `base/backend/lib/sui/suiService.ts`
   - Update imports in the file

4. **Move API handler:**
   - From: `backend/lib/api/api-handler.ts`
   - To: `base/backend/lib/api/api-handler.ts`

5. **Move CORS:**
   - From: `backend/lib/cors.ts`
   - To: `base/backend/lib/cors.ts`

6. **Move config files:**
   - From: `src/config/api-config.js`
   - To: `base/frontend/src/config/api-config.js`
   - From: `src/config/contract-config.js`
   - To: `base/frontend/src/config/contract-config.js`
   - From: `backend/config/config.ts`
   - To: `base/backend/config/config.ts`

7. **Move base API endpoints:**
   - From: `backend/app/api/health/route.ts`
   - To: `base/backend/app/api/health/route.ts`
   - From: `backend/app/api/tokens/balance/[address]/route.ts`
   - To: `base/backend/app/api/tokens/balance/[address]/route.ts`
   - Update imports in these files

8. **Move wallet-module:**
   - From: `wallet-module/`
   - To: `base/wallet-module/`

9. **Update base code imports:**
   - All base code should import from within base
   - No references to old locations
   - Make base code app-agnostic

**Test:** Base code should compile/run independently (if possible)

---

### Phase 2: Create Apps Structure

**Goal:** Create `apps/shooter-game/` folder structure

**Steps:**

1. **Create app directory structure:**
   ```bash
   mkdir -p apps/shooter-game/frontend/src/game
   mkdir -p apps/shooter-game/frontend/assets
   mkdir -p apps/shooter-game/backend/app/api
   mkdir -p apps/shooter-game/contracts
   ```

2. **Move game frontend code:**
   - From: `src/game/systems/`
   - To: `apps/shooter-game/frontend/src/game/systems/`
   
   - From: `src/game/rendering/`
   - To: `apps/shooter-game/frontend/src/game/rendering/`
   
   - From: `src/game/audio/`
   - To: `apps/shooter-game/frontend/src/game/audio/`
   
   - From: `src/game/main.js`
   - To: `apps/shooter-game/frontend/src/game/main.js`
   
   - From: `src/game/shared/`
   - To: `apps/shooter-game/frontend/src/game/shared/`

3. **Move game entry point:**
   - From: `index.html`
   - To: `apps/shooter-game/frontend/index.html`

4. **Move game assets:**
   - From: `assets/` (game-specific assets)
   - To: `apps/shooter-game/frontend/assets/`
   - Keep shared assets (like `sui.svg`) in `base/frontend/assets/`

5. **Move game backend endpoints:**
   - From: `backend/app/api/scores/`
   - To: `apps/shooter-game/backend/app/api/scores/`
   
   - From: `backend/app/api/leaderboard/`
   - To: `apps/shooter-game/backend/app/api/leaderboard/`
   
   - From: `backend/app/api/tournaments/`
   - To: `apps/shooter-game/backend/app/api/tournaments/`
   
   - From: `backend/app/api/store/`
   - To: `apps/shooter-game/backend/app/api/store/`

6. **Move game contracts:**
   - From: `contracts/suitwo_game/`
   - To: `apps/shooter-game/contracts/suitwo_game/`

7. **Move admin panel (if game-specific):**
   - Evaluate: Keep structure in base, move game-specific tabs to app
   - Or: Move entire admin to `apps/shooter-game/backend/app/admin/`

**Test:** Game code is moved but imports will be broken (expected)

---

### Phase 3: Refactor Game to Use Base

**Goal:** Update game to import from `base/` instead of local files

**Steps:**

1. **Update wallet imports in game:**
   ```javascript
   // OLD (in apps/shooter-game/frontend/src/game/main.js):
   import { connectWallet } from './blockchain/wallet-connection.js';
   
   // NEW:
   import { connectWallet } from '../../../base/frontend/src/infrastructure/wallet/wallet-connection.js';
   ```

2. **Update API client imports:**
   ```javascript
   // OLD:
   import { apiClient } from '../utils/api.js';
   
   // NEW:
   import { getApiClient } from '../../../base/frontend/src/infrastructure/api/api-client.js';
   ```

3. **Update config imports:**
   ```javascript
   // OLD:
   import { getConfig } from '../config/api-config.js';
   
   // NEW:
   import { getConfig } from '../../../base/frontend/src/config/api-config.js';
   ```

4. **Update backend imports (in game backend):**
   ```typescript
   // OLD (in apps/shooter-game/backend/app/api/scores/route.ts):
   import { SuiService } from '../../../../lib/sui/suiService';
   
   // NEW:
   import { SuiService } from '../../../../base/backend/lib/sui/suiService';
   ```

5. **Update API handler imports:**
   ```typescript
   // OLD:
   import { withApiHandler } from '../../../../lib/api/api-handler';
   
   // NEW:
   import { withApiHandler } from '../../../../base/backend/lib/api/api-handler';
   ```

6. **Update HTML entry point:**
   ```html
   <!-- OLD (apps/shooter-game/frontend/index.html): -->
   <script src="src/game/blockchain/wallet-connection.js"></script>
   
   <!-- NEW: -->
   <script src="../../base/frontend/src/infrastructure/wallet/wallet-connection.js"></script>
   ```

7. **Fix all import paths:**
   - Search for old import paths
   - Update to use `base/` paths
   - Test each file

**Test:** Game should work exactly as before, but using base infrastructure

---

### Phase 4: Update Configuration

**Goal:** Make config app-agnostic, support multiple apps

**Steps:**

1. **Update base config:**
   - Make `base/frontend/src/config/api-config.js` app-agnostic
   - Remove game-specific values
   - Use environment variables

2. **Create app config override (optional):**
   - `apps/shooter-game/frontend/src/config/api-config.js`
   - Can override base config if needed

3. **Update backend config:**
   - Make `base/backend/config/config.ts` support multiple apps
   - Use app-specific environment variables

4. **Update environment variables:**
   - Document which are base vs app-specific
   - Update `.env.example` files

**Test:** Config works for game, ready for future apps

---

### Phase 5: Testing & Validation

**Goal:** Ensure game works with new structure

**Checklist:**

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

**If issues:**
- Check import paths
- Verify base code is accessible
- Check file permissions
- Review console errors

---

### Phase 6: Cleanup

**Goal:** Remove old files, update documentation

**Steps:**

1. **Remove old empty directories:**
   ```bash
   # After moving everything, remove empty dirs
   rmdir src/game  # If empty
   rmdir src/config  # If empty
   # etc.
   ```

2. **Update README.md:**
   - Document new structure
   - Update setup instructions
   - Update deployment instructions

3. **Update package.json scripts (if needed):**
   - Update paths for new structure
   - Update build scripts

4. **Create SKELETON_README.md:**
   - Explain base + apps structure
   - How to add new apps
   - Reference to documentation

5. **Commit changes:**
   ```bash
   git add .
   git commit -m "Refactor: Extract base infrastructure, move game to apps/shooter-game"
   ```

---

## 📋 Verification Checklist

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

## 🆘 Troubleshooting

### Issue: Import paths not working

**Solution:**
- Check relative path depth (count `../` levels)
- Verify file exists at target location
- Check for typos in paths
- Use absolute paths if needed (from project root)

### Issue: Game doesn't load

**Solution:**
- Check browser console for errors
- Verify all base files are accessible
- Check HTML script tags point to correct paths
- Verify server/file permissions

### Issue: Backend endpoints not working

**Solution:**
- Check Next.js routing (file structure matters)
- Verify imports in route files
- Check base services are accessible
- Review API handler setup

### Issue: Wallet connection fails

**Solution:**
- Verify wallet module is in base
- Check wallet connection code imports
- Verify wallet module loads correctly
- Check browser console for wallet errors

---

## 📚 Key Documents Reference

When stuck, refer to:

- **Architecture questions:** `MULTI_APP_ARCHITECTURE.md`
- **What goes where:** `SHARED_UTILITIES.md`
- **Import patterns:** `CREATING_NEW_APPS.md`
- **Why this order:** `REFACTORING_ORDER.md`
- **Full plan:** `CODEBASE_AUDIT_AND_CLEANUP_PLAN.md`

---

## ✅ Success Criteria

The refactoring is complete when:

1. ✅ Base infrastructure extracted and working
2. ✅ Game moved to `apps/shooter-game/`
3. ✅ Game uses base infrastructure (imports from `base/`)
4. ✅ Game works exactly as before
5. ✅ No duplicate code
6. ✅ Structure ready for second app (Community Foundry)
7. ✅ Documentation updated

---

## 🎯 Next Steps (After Refactoring)

Once game is refactored:

1. **Test thoroughly** - Ensure everything works
2. **Document any issues** - Note what was tricky
3. **Create Community Foundry** - Use game as reference
4. **Follow same pattern** - Copy from shooter-game

---

## 💡 Tips

- **Work incrementally** - Test after each phase
- **Commit often** - Small commits, easy to revert
- **Test continuously** - Don't wait until end
- **Ask questions** - If unclear, refer to docs
- **Keep game working** - Don't break it

---

**Last Updated:** 2025-01-XX  
**Status:** Ready for Handoff
