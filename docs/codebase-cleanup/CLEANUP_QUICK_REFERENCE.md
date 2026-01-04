# Cleanup Quick Reference

## 🎯 Goal
Transform game codebase → **Reusable base infrastructure** → Multiple SuiTwo apps

**Apps:**
1. **Shooter Game** (refactored from current code) - First app, reference implementation
2. **Community Foundry** - Second app
3. Future apps...

---

## ✅ KEEP (Reusable Infrastructure)

| Component | Location | Purpose |
|-----------|----------|---------|
| **Wallet Module** | `wallet-module/` | Wallet connection, balance checking, transaction signing |
| **Sui Service** | `backend/lib/sui/suiService.ts` | Core Sui blockchain interactions |
| **API Infrastructure** | `backend/lib/` | API handlers, CORS, config management |
| **Config System** | `src/config/` | API & contract configuration |
| **Health Endpoint** | `backend/app/api/health/` | Backend health checks |
| **Token Balance API** | `backend/app/api/tokens/` | Token balance checking |
| **Documentation** | `docs/sui-integration/` | Integration guides |

---

## ❌ REMOVE (Game-Specific)

| Component | Location | Reason |
|-----------|----------|--------|
| **Game Systems** | `src/game/systems/` | Enemies, bosses, projectiles, collision |
| **Game Rendering** | `src/game/rendering/` | Canvas rendering, sprites |
| **Game Audio** | `src/game/audio/` | Sound effects, music |
| **Game Logic** | `src/game/main.js` | Game loop, state management |
| **Game Assets** | `assets/` (most) | Enemy images, boss sprites, etc. |
| **Score API** | `backend/app/api/scores/` | Game score submission |
| **Game Leaderboard** | `backend/app/api/leaderboard/` | Game leaderboard |
| **Tournaments** | `backend/app/api/tournaments/` | Tournament system |
| **Game Store** | `backend/app/api/store/` | In-game item store |
| **Game Contracts** | `contracts/suitwo_game/` | Score submission contract |

---

## 🤔 EVALUATE (May Be Useful)

| Component | Location | Decision Needed |
|-----------|----------|----------------|
| **Badge System** | `backend/app/api/badges/` | Adapt for contributor badges? |
| **Store System** | `backend/app/api/store/` | Adapt for project funding? |
| **Admin Panel** | `backend/app/admin/` | Keep structure, remove game tabs? |
| **Leaderboard** | `backend/app/api/leaderboard/` | Adapt for top contributors? |

---

## 📁 New Structure (After Cleanup)

```
base/                        # 🎯 SHARED BASE (All apps use this)
├── frontend/src/
│   ├── infrastructure/      # Wallet, API client
│   │   ├── wallet/
│   │   └── api/
│   └── config/              # Base configuration
├── backend/
│   ├── app/api/
│   │   ├── health/          # ✅ Base endpoints
│   │   └── tokens/          # ✅ Base endpoints
│   └── lib/
│       ├── sui/            # ✅ Sui service
│       └── api/             # ✅ API handlers
└── wallet-module/           # ✅ Shared wallet module

apps/                        # 🚀 INDIVIDUAL APPS
├── shooter-game/            # 🎮 App #1: Shooter Game (refactored)
│   ├── frontend/
│   │   ├── index.html
│   │   └── src/game/        # Game systems, rendering, audio
│   ├── backend/app/api/
│   │   ├── scores/          # Game endpoints
│   │   ├── leaderboard/
│   │   └── tournaments/
│   └── contracts/
│       └── suitwo_game/
├── community-foundry/       # 🏗️ App #2: Community Foundry
│   ├── frontend/
│   │   ├── index.html
│   │   └── src/app/        # App-specific code
│   ├── backend/app/api/
│   │   └── foundry/         # App-specific endpoints
│   └── contracts/
│       └── foundry/
└── [future-app]/            # Future apps go here
```

---

## 🚦 Cleanup Phases

1. **Phase 1:** ✅ Audit complete
2. **Phase 2:** Create backup
3. **Phase 3:** Reorganize infrastructure
4. **Phase 4:** Remove game code
5. **Phase 5:** Clean backend
6. **Phase 6:** Update configs
7. **Phase 7:** Update docs
8. **Phase 8:** Create Community Foundry foundation

---

## ⚡ Quick Start After Cleanup

**Using Base Infrastructure:**
1. Wallet connection: `base/frontend/src/infrastructure/wallet/wallet-connection.js`
2. Backend API: `base/backend/lib/sui/suiService.ts`
3. Config: `base/frontend/src/config/api-config.js`

**Creating New App:**
1. Create `apps/[new-app]/` folder
2. Import from base: `../../base/frontend/src/infrastructure/...`
3. Add app-specific code in `apps/[new-app]/frontend/src/app/`
4. Add app endpoints in `apps/[new-app]/backend/app/api/`

---

**See `CODEBASE_AUDIT_AND_CLEANUP_PLAN.md` for full details.**
