# Creating a New App

## 🎯 Where Apps Go

**Important:** Apps go in `apps/`, NOT in `base/`!

```
SuiTwo Ecosystem/
│
├── base/              ← Shared utilities (don't put apps here!)
│   └── infrastructure/
│
└── apps/              ← Put new apps HERE!
    ├── shooter-game/   ← Existing app
    ├── community-foundry/  ← Existing app
    └── my-new-app/     ← Your new app goes here
```

---

## 📁 Correct Structure

### ✅ DO THIS:
```
apps/
└── my-new-app/        ← New app folder
    ├── frontend/
    ├── backend/
    └── contracts/
```

### ❌ DON'T DO THIS:
```
base/
└── my-new-app/        ← ❌ WRONG! Don't put apps in base!
```

---

## 🚀 Step-by-Step: Creating a New App

### Step 1: Create App Folder Structure

```bash
# Create the app folder structure
mkdir -p apps/my-new-app/frontend/src/app
mkdir -p apps/my-new-app/backend/app/api
mkdir -p apps/my-new-app/contracts
```

**Result:**
```
apps/
└── my-new-app/
    ├── frontend/
    │   └── src/
    │       └── app/        # Your app code goes here
    ├── backend/
    │   └── app/
    │       └── api/         # Your API endpoints go here
    └── contracts/           # Your smart contracts go here
```

---

### Step 2: Create Entry Point

Create `apps/my-new-app/frontend/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>My New App</title>
</head>
<body>
  <h1>My New App</h1>
  
  <!-- Import from BASE (not from app folder) -->
  <script src="../../base/frontend/src/infrastructure/wallet/wallet-connection.js"></script>
  <script src="../../base/frontend/src/infrastructure/api/api-client.js"></script>
  
  <!-- Your app code -->
  <script src="src/app/main.js"></script>
</body>
</html>
```

**Key Point:** Import from `../../base/` (go up to root, then into base)

---

### Step 3: Create App Code

Create `apps/my-new-app/frontend/src/app/main.js`:

```javascript
// Import from BASE
import { connectWallet } from '../../../base/frontend/src/infrastructure/wallet/wallet-connection.js';
import { getApiClient } from '../../../base/frontend/src/infrastructure/api/api-client.js';

// Your app-specific code
async function initApp() {
  // Use base utilities
  const wallet = await connectWallet();
  const api = getApiClient();
  
  // Your app logic here
  console.log('My new app is running!');
  console.log('Wallet:', wallet);
}

initApp();
```

**Path Explanation:**
- `../../../` = Go up 3 levels: `app/` → `src/` → `frontend/` → `my-new-app/`
- Then into `base/frontend/src/infrastructure/`

---

### Step 4: Create Backend Endpoints (Optional)

Create `apps/my-new-app/backend/app/api/my-feature/route.ts`:

```typescript
// Import from BASE
import { withApiHandler } from '../../../base/backend/lib/api/api-handler';
import { SuiService } from '../../../base/backend/lib/sui/suiService';

export const GET = withApiHandler(async (request) => {
  // Use base services
  const suiService = new SuiService();
  
  // Your app-specific logic
  return {
    success: true,
    message: 'My new app endpoint',
    data: {}
  };
});
```

**Path Explanation:**
- `../../../` = Go up 3 levels: `api/` → `app/` → `backend/` → `my-new-app/`
- Then into `base/backend/lib/`

---

### Step 5: Create Smart Contracts (Optional)

Create `apps/my-new-app/contracts/my-contract/sources/my_contract.move`:

```move
module my_new_app::my_contract {
    // Your contract code here
}
```

---

## 📊 Visual Guide

### Folder Structure:
```
SuiTwo Ecosystem/
│
├── base/                          # Shared utilities
│   ├── frontend/src/infrastructure/
│   │   ├── wallet/                # ← Import from here
│   │   └── api/                   # ← Import from here
│   └── backend/lib/
│       └── sui/                    # ← Import from here
│
└── apps/
    └── my-new-app/                 # Your new app
        ├── frontend/
        │   ├── index.html          # Entry point
        │   └── src/
        │       └── app/
        │           └── main.js     # ← Your code here
        │                           #    Imports from base/
        └── backend/
            └── app/api/
                └── my-feature/
                    └── route.ts    # ← Your endpoints here
                                    #    Imports from base/
```

---

## 🔑 Key Rules

### ✅ DO:
- ✅ Create app folder in `apps/`
- ✅ Import from `base/` using relative paths
- ✅ Put app-specific code in your app folder
- ✅ Use base utilities (wallet, API, Sui service)

### ❌ DON'T:
- ❌ Put apps in `base/` folder
- ❌ Modify base code (unless it's a shared improvement)
- ❌ Duplicate base utilities in your app
- ❌ Create dependencies between apps

---

## 📝 Template Checklist

When creating a new app, you need:

- [ ] Create `apps/[app-name]/` folder
- [ ] Create `apps/[app-name]/frontend/index.html` (entry point)
- [ ] Create `apps/[app-name]/frontend/src/app/` (app code)
- [ ] Import base utilities in your code
- [ ] Create `apps/[app-name]/backend/app/api/` (if needed)
- [ ] Create `apps/[app-name]/contracts/` (if needed)
- [ ] Test that imports from base work correctly

---

## 🎯 Example: Creating "Community Foundry" App

```bash
# Step 1: Create structure
mkdir -p apps/community-foundry/frontend/src/app
mkdir -p apps/community-foundry/backend/app/api/foundry
mkdir -p apps/community-foundry/contracts/foundry

# Step 2: Create entry point
# apps/community-foundry/frontend/index.html

# Step 3: Create app code
# apps/community-foundry/frontend/src/app/main.js
# (imports from ../../../base/frontend/src/infrastructure/)

# Step 4: Create backend
# apps/community-foundry/backend/app/api/foundry/projects/route.ts
# (imports from ../../../base/backend/lib/)
```

---

## 💡 Quick Reference

**App Location:** `apps/[app-name]/`  
**Base Location:** `base/`  
**Import Pattern:** `../../../base/...` (from app code)

**Remember:**
- Base = Shared (everyone uses)
- Apps = Specific (your app code)
- Apps import from base, not the other way around

---

**Last Updated:** 2025-01-XX  
**Status:** Guide Complete
