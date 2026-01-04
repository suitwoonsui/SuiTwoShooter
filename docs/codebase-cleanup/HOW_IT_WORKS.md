# How the Multi-App Architecture Works

## 🎯 The Big Picture

Think of it like this:

```
🏢 SuiTwo Ecosystem Building
│
├── 🏗️ Foundation (base/)
│   └── Shared utilities everyone uses
│       - Wallet connection
│       - Sui blockchain service
│       - API client
│
└── 🏠 Individual Apartments (apps/)
    ├── Apartment #1: Shooter Game
    │   └── Uses the foundation + has its own stuff
    │
    ├── Apartment #2: Community Foundry
    │   └── Uses the foundation + has its own stuff
    │
    └── Apartment #3: Future App
        └── Uses the foundation + has its own stuff
```

**Key Point:** Each app is independent. They're not nested - they're side-by-side, sharing the same foundation.

---

## 📁 File Structure Explained

### Current Structure (Before Cleanup)
```
SuiTwo Community Foundry/
├── index.html              # Game entry point
├── src/game/               # All game code
├── backend/app/api/        # All backend (game + shared)
└── wallet-module/          # Wallet code
```

**Problem:** Everything is mixed together. Game code and shared infrastructure are in the same place.

---

### New Structure (After Cleanup)
```
SuiTwo Ecosystem/
│
├── base/                   # 🎯 SHARED FOUNDATION
│   ├── frontend/src/infrastructure/
│   │   ├── wallet/        # Wallet connection (everyone uses this)
│   │   └── api/           # API client (everyone uses this)
│   │
│   └── backend/lib/
│       └── sui/           # Sui blockchain service (everyone uses this)
│
└── apps/                   # 🏠 INDIVIDUAL APPS (Side by side)
    │
    ├── shooter-game/        # App #1: The Game
    │   ├── frontend/
    │   │   ├── index.html  # Game entry point
    │   │   └── src/game/  # Game-specific code
    │   │
    │   └── backend/app/api/
    │       └── scores/     # Game-specific endpoints
    │
    └── community-foundry/  # App #2: Community Foundry
        ├── frontend/
        │   ├── index.html  # Foundry entry point
        │   └── src/app/   # Foundry-specific code
        │
        └── backend/app/api/
            └── foundry/    # Foundry-specific endpoints
```

---

## 🔄 How Apps Use the Base

### Example: Shooter Game

**Before (Current):**
```javascript
// src/game/blockchain/wallet-connection.js
// Wallet code is inside the game folder
```

**After (New Structure):**
```javascript
// apps/shooter-game/frontend/src/game/main.js

// Import wallet from BASE (not local)
import { connectWallet } from '../../../base/frontend/src/infrastructure/wallet/wallet-connection.js';

// Use it in the game
const wallet = await connectWallet();
```

**Key Point:** The game imports from `base/`, not from its own folder. The base is shared.

---

## 🌐 How It Works in Practice

### Scenario 1: Running the Shooter Game

1. **User opens:** `apps/shooter-game/frontend/index.html`
2. **Game loads:** Imports wallet from `base/frontend/src/infrastructure/wallet/`
3. **Game uses:** Base infrastructure (wallet, API client, Sui service)
4. **Game has:** Its own game logic, rendering, audio

**Result:** Game works exactly as before, but now uses shared infrastructure.

---

### Scenario 2: Running Community Foundry

1. **User opens:** `apps/community-foundry/frontend/index.html`
2. **Foundry loads:** Imports wallet from `base/frontend/src/infrastructure/wallet/` (same base!)
3. **Foundry uses:** Base infrastructure (wallet, API client, Sui service)
4. **Foundry has:** Its own UI, project cards, funding logic

**Result:** Foundry uses the same base as the game, but has completely different functionality.

---

### Scenario 3: Both Apps Running

They're **completely independent**:
- Different entry points (`index.html` files)
- Different code
- Different backend endpoints
- Share the same base infrastructure

**Think of it like:**
- Two different websites that happen to use the same payment processor
- Not one website inside another

---

## 📊 Visual Comparison

### ❌ NOT This (Nested):
```
apps/
└── shooter-game/
    └── apps/              # ❌ App within app - WRONG
        └── community-foundry/
```

### ✅ This (Side by Side):
```
apps/
├── shooter-game/          # ✅ App #1
└── community-foundry/      # ✅ App #2
```

---

## 🔧 How Imports Work

### Shooter Game Imports Base:
```javascript
// File: apps/shooter-game/frontend/src/game/main.js

// Go up 3 levels: shooter-game → apps → root → base
import { connectWallet } from '../../../base/frontend/src/infrastructure/wallet/wallet-connection.js';
```

### Community Foundry Imports Base:
```javascript
// File: apps/community-foundry/frontend/src/app/main.js

// Go up 3 levels: community-foundry → apps → root → base
import { connectWallet } from '../../../base/frontend/src/infrastructure/wallet/wallet-connection.js';
```

**Same base, different apps!**

---

## 🚀 Deployment

### Option 1: Deploy Each App Separately
```
shooter-game.vercel.app     → apps/shooter-game/frontend/
foundry.vercel.app          → apps/community-foundry/frontend/
```

Each app is deployed independently, but both reference the same base code.

### Option 2: Deploy Base as CDN
```
base.vercel.app             → base/ (shared infrastructure)
shooter-game.vercel.app     → apps/shooter-game/ (imports from base CDN)
foundry.vercel.app          → apps/community-foundry/ (imports from base CDN)
```

---

## 🎯 Key Takeaways

1. **Not nested:** Apps are side-by-side, not inside each other
2. **Shared base:** All apps use the same `base/` infrastructure
3. **Independent:** Each app can be developed/deployed separately
4. **Same foundation:** Wallet, API, Sui service are shared
5. **Different functionality:** Each app has its own code and features

---

## 💡 Real-World Analogy

**Think of a shopping mall:**

- **Base** = Shared utilities (parking, elevators, security)
- **Apps** = Individual stores (Game Store, Foundry Store, etc.)

Each store:
- Uses the shared parking lot (base)
- Has its own products and layout (app-specific)
- Is independent from other stores
- Can open/close without affecting others

---

## ❓ Common Questions

### Q: Is the game inside Community Foundry?
**A:** No! They're separate apps that share infrastructure.

### Q: Can I run both at the same time?
**A:** Yes! They're completely independent applications.

### Q: Do they share data?
**A:** They share infrastructure (wallet, API client), but have separate:
- Frontend code
- Backend endpoints
- Smart contracts
- Data storage

### Q: What if I update the base?
**A:** All apps benefit from base updates (wallet improvements, bug fixes).

### Q: Can I delete one app?
**A:** Yes! Apps are independent. Deleting `apps/shooter-game/` doesn't affect Community Foundry.

---

**Last Updated:** 2025-01-XX  
**Status:** Architecture Explanation
