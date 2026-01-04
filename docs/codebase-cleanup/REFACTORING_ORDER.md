# Refactoring Order: Why Game First?

## 🎯 Yes, Refactor the Game First!

**The game becomes the first app and serves as the reference implementation.**

---

## 📋 The Order

### Phase 1: ✅ Audit & Documentation (DONE)
- Understand what we have
- Plan the structure
- Document everything

### Phase 2: Create Backup
- Save current state
- Can restore if needed

### Phase 3: Extract Base Infrastructure
- Create `base/` folder
- Move shared code (wallet, Sui service, API client)
- Make it app-agnostic

### Phase 4: Move Game to App Structure
- Create `apps/shooter-game/`
- Move game code there
- Keep game working (temporarily with old imports)

### Phase 5: Refactor Game to Use Base ⭐ **THIS IS KEY**
- Update game to import from `base/`
- Test that game still works
- Game becomes proof that base works

### Phase 6: Update Configuration
- Make config app-agnostic
- Support multiple apps

### Phase 7: Update Documentation
- Document the new structure
- Create guides

### Phase 8: Create Community Foundry
- Use game as reference
- Follow same pattern
- Build on proven base

---

## 🎯 Why Game First?

### ✅ **1. Game Already Works**
- Game is functional and tested
- We know it works
- Perfect test case for base

### ✅ **2. Proves Base Works**
- If game works with base → base is solid
- If game breaks → we know what to fix
- Real-world validation

### ✅ **3. Reference Implementation**
- Shows how to use base
- Community Foundry can copy patterns
- Examples for future apps

### ✅ **4. No Code Loss**
- Game code stays intact
- Just reorganized
- Still works the same

### ✅ **5. Incremental Approach**
- Test as we go
- Fix issues early
- Don't break everything at once

---

## 🔄 The Refactoring Process

### Step 1: Extract Base (Phase 3)
```
Current:
├── src/game/blockchain/wallet-connection.js  ← Game folder
└── backend/lib/sui/suiService.ts             ← Backend

After:
├── base/frontend/src/infrastructure/wallet/wallet-connection.js  ← Shared
└── base/backend/lib/sui/suiService.ts                          ← Shared
```

### Step 2: Move Game (Phase 4)
```
Current:
├── src/game/systems/
├── src/game/rendering/
└── index.html

After:
├── apps/shooter-game/frontend/src/game/systems/
├── apps/shooter-game/frontend/src/game/rendering/
└── apps/shooter-game/frontend/index.html
```

### Step 3: Refactor Game (Phase 5) ⭐
```
Before (old imports):
import { connectWallet } from './blockchain/wallet-connection.js';

After (new imports):
import { connectWallet } from '../../../base/frontend/src/infrastructure/wallet/wallet-connection.js';
```

**This is where we test that base works!**

---

## ✅ Success Criteria for Game Refactoring

After Phase 5, the game should:
1. ✅ Still work exactly as before
2. ✅ Use base infrastructure (wallet, API, Sui service)
3. ✅ Have no duplicated code
4. ✅ Serve as reference for other apps

---

## 🚀 Then Build Community Foundry

Once game is refactored and working:

1. **Copy the pattern** from shooter-game
2. **Import from same base** (proven to work)
3. **Build foundry-specific code**
4. **Follow same structure**

**Example:**
```javascript
// Community Foundry (following game's pattern)
import { connectWallet } from '../../../base/frontend/src/infrastructure/wallet/wallet-connection.js';
// Same import path as game uses!
```

---

## 📊 Visual Flow

```
Current State:
└── [Everything mixed together]

    ↓ Phase 3: Extract Base

Base Created:
├── base/ (shared utilities)
└── [Game code still in old location]

    ↓ Phase 4: Move Game

Game Moved:
├── base/ (shared utilities)
└── apps/shooter-game/ (game code moved)

    ↓ Phase 5: Refactor Game ⭐

Game Refactored:
├── base/ (shared utilities)
└── apps/shooter-game/ (uses base, works!)

    ↓ Phase 8: Build Foundry

Both Apps:
├── base/ (shared utilities)
├── apps/shooter-game/ (working reference)
└── apps/community-foundry/ (follows pattern)
```

---

## 🎯 Key Benefits

### 1. **Proven Base**
- Game proves base works
- Community Foundry can trust it
- No guessing if base is correct

### 2. **Clear Examples**
- Game shows how to use base
- Copy-paste patterns
- Less documentation needed

### 3. **Incremental Testing**
- Test base with game
- Fix issues before building foundry
- Don't break multiple things

### 4. **No Risk**
- Game still works
- Can always revert
- Safe refactoring

---

## ⚠️ Important Notes

### Don't Skip Steps
- Must extract base first
- Must move game second
- Must refactor game third
- Then build foundry

### Test Continuously
- Test after each phase
- Don't wait until end
- Fix issues immediately

### Game is Reference
- Keep game working
- Use as example
- Don't break it

---

## 📝 Summary

**Yes, refactor the game first because:**

1. ✅ Game already works (proven)
2. ✅ Tests that base is correct
3. ✅ Provides reference implementation
4. ✅ Safe, incremental approach
5. ✅ No code loss

**Then:**
- Community Foundry follows the same pattern
- Uses proven base
- Copies from game examples
- Builds faster

---

**Last Updated:** 2025-01-XX  
**Status:** Refactoring Strategy Defined
