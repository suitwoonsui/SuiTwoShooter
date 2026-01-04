# Multi-App Architecture Overview

## 🎯 Vision

Create a **reusable base infrastructure** that all SuiTwo ecosystem apps share, with individual apps built on top of this foundation.

**Key Principle:** One base, many apps. No code duplication.

---

## 📐 Architecture Structure

```
SuiTwo Ecosystem/
│
├── base/                    # 🎯 SHARED INFRASTRUCTURE
│   │                        # Used by ALL apps
│   ├── frontend/
│   │   └── src/
│   │       ├── infrastructure/  # Wallet, API client, utilities
│   │       └── config/          # Base configuration
│   │
│   ├── backend/
│   │   ├── app/api/            # Base API endpoints (health, tokens)
│   │   └── lib/                # Sui service, API handlers, CORS
│   │
│   └── wallet-module/         # Shared wallet integration
│
└── apps/                     # 🚀 INDIVIDUAL APPLICATIONS
    │
    ├── shooter-game/          # 🎮 App #1: Shooter Game (refactored from current code)
    │   ├── frontend/          # Game UI, systems, rendering, audio
    │   ├── backend/           # Game API endpoints (scores, leaderboard, tournaments)
    │   └── contracts/        # Game smart contracts
    │   │
    │   # This serves as the reference implementation
    │   # Shows how to use base infrastructure
    │
    ├── community-foundry/    # 🏗️ App #2: Community Foundry
    │   ├── frontend/          # App-specific UI
    │   ├── backend/           # App-specific API endpoints
    │   └── contracts/        # App-specific smart contracts
    │
    └── [future-app]/         # Future apps can be added here
        └── ...
```

---

## 🔑 Key Concepts

### Base Layer (Shared)
**Purpose:** Provide common infrastructure that all apps need.

**Contains:**
- ✅ Wallet connection & balance checking
- ✅ Sui blockchain service
- ✅ API client utilities
- ✅ Base configuration
- ✅ CORS & authentication helpers
- ✅ Health check endpoints
- ✅ Token balance endpoints

**Rules:**
- Must be app-agnostic (no app-specific logic)
- Should be well-documented
- Changes affect all apps (be careful!)

---

### Apps Layer (Specific)
**Purpose:** Individual app implementations.

**Contains:**
- App-specific UI/UX
- App-specific business logic
- App-specific API endpoints
- App-specific smart contracts
- App-specific assets

**Rules:**
- Imports from `base/` (don't duplicate)
- Can override/extend base config
- Independent deployment possible
- Each app is self-contained

---

## 📦 What Goes Where?

### ✅ In Base (Shared)
- Wallet connection system
- Sui blockchain service
- API client utilities
- Base configuration
- CORS & auth helpers
- Health/token endpoints
- Common utilities

### 🎯 In Apps (Specific)
- App UI/UX
- App business logic
- App API endpoints
- App smart contracts
- App assets
- App-specific config overrides

### 🤔 Hybrid (Base + App)
- **Admin Panel:** Base provides infrastructure, apps provide tabs
- **Badge System:** Base provides utilities, apps provide implementations
- **Store System:** Base provides payment processing, apps provide store logic

---

## 🔄 How Apps Use Base

### Frontend Example
```javascript
// In apps/community-foundry/frontend/src/app/main.js

// Import from base
import { connectWallet } from '../../../base/frontend/src/infrastructure/wallet/wallet-connection.js';
import { getApiClient } from '../../../base/frontend/src/infrastructure/api/api-client.js';

// Use base infrastructure
const wallet = await connectWallet();
const api = getApiClient();
```

### Backend Example
```typescript
// In apps/community-foundry/backend/app/api/projects/route.ts

// Import from base
import { SuiService } from '../../../base/backend/lib/sui/suiService';
import { withApiHandler } from '../../../base/backend/lib/api/api-handler';

// Use base services
const suiService = new SuiService();
```

---

## 🚀 Adding a New App

### Step 1: Create App Structure
```bash
mkdir -p apps/my-new-app/{frontend,backend,contracts}
```

### Step 2: Create Entry Point
```html
<!-- apps/my-new-app/frontend/index.html -->
<!DOCTYPE html>
<html>
<head>
  <title>My New App</title>
</head>
<body>
  <script src="../../base/frontend/src/infrastructure/wallet/wallet-connection.js"></script>
  <script src="src/app/main.js"></script>
</body>
</html>
```

### Step 3: Import from Base
```javascript
// apps/my-new-app/frontend/src/app/main.js
import { connectWallet } from '../../../base/frontend/src/infrastructure/wallet/wallet-connection.js';
// Your app code here
```

### Step 4: Add App-Specific Endpoints
```typescript
// apps/my-new-app/backend/app/api/my-feature/route.ts
import { withApiHandler } from '../../../base/backend/lib/api/api-handler';

export const GET = withApiHandler(async (request) => {
  // Your app-specific logic
});
```

---

## 📋 Benefits

### ✅ Code Reuse
- Write wallet connection once, use everywhere
- Shared Sui service across all apps
- No duplication

### ✅ Consistency
- All apps use same wallet integration
- Consistent API patterns
- Shared configuration approach

### ✅ Easy Maintenance
- Fix bugs in base, all apps benefit
- Update Sui SDK in one place
- Centralized documentation

### ✅ Independent Development
- Each app can be developed separately
- Apps don't interfere with each other
- Can deploy apps independently

### ✅ Scalability
- Easy to add new apps
- Clear separation of concerns
- Base can evolve without breaking apps

---

## ⚠️ Important Considerations

### Base Changes
- Changes to base affect ALL apps
- Test thoroughly before updating base
- Consider versioning if needed

### App Independence
- Apps should work even if other apps are removed
- Don't create dependencies between apps
- Each app is self-contained

### Configuration
- Base has default config
- Apps can override/extend config
- Document config overrides clearly

---

## 🎯 Current Status

**Phase 1:** ✅ Audit complete  
**Phase 2:** Create base structure  
**Phase 3:** Move shared code to base  
**Phase 4:** Refactor Shooter Game to use base (first app)  
**Phase 5:** Create Community Foundry app (second app)  
**Phase 6:** Document and test  

---

## 📚 Related Documents

- `CODEBASE_AUDIT_AND_CLEANUP_PLAN.md` - Full cleanup plan
- `CLEANUP_QUICK_REFERENCE.md` - Quick reference guide

---

**Last Updated:** 2025-01-XX  
**Status:** Architecture Defined
