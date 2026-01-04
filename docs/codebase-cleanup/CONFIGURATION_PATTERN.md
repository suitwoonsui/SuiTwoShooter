# Configuration Pattern

## Overview

The base infrastructure provides a configuration system that apps can extend with their own app-specific values.

## Frontend Configuration

### Base Config (`base/frontend/src/config/`)

**`api-config.js`**
- Provides base API URL and wallet module URL configuration
- Uses meta tags for app-specific overrides
- Defaults to localhost for development
- Apps should set `<meta name="backend-url">` and `<meta name="wallet-module-url">` in their HTML

**`contract-config.js`**
- Provides base contract configuration structure
- Apps should provide their own contract addresses
- Apps can set `window.APP_CONTRACT_CONFIG` before base config loads, or provide their own contract-config.js

### App-Specific Config

Apps should create their own config files in `apps/[app-name]/frontend/src/config/`:

**Example: `apps/shooter-game/frontend/src/config/contract-config.js`**
```javascript
// App-specific contract addresses
const GAME_CONTRACT_CONFIG = {
  testnet: {
    packageId: '0x...',
    badgeRegistry: '0x...',
    // ... app-specific contracts
  }
};

// Merge with base config
window.APP_CONTRACT_CONFIG = GAME_CONTRACT_CONFIG;
```

**Loading Order:**
1. Base `api-config.js` (sets API URLs)
2. Base `contract-config.js` (provides structure)
3. App `contract-config.js` (provides app-specific contracts)

## Backend Configuration

### Base Config (`base/backend/config/config.ts`)

The base backend config reads from environment variables, making it app-agnostic:

**Base Infrastructure:**
- `SUI_NETWORK` - Network (testnet/mainnet)
- `SUI_RPC_URL` - RPC endpoint
- `CORS_ORIGIN` - CORS allowed origins
- `PORT` - Server port

**Token Configuration:**
- `MEWS_TOKEN_TYPE_ID` - Token type ID (network-specific variants supported)
- `MIN_TOKEN_BALANCE` - Minimum token balance for gatekeeping

**Contract Configuration:**
- Contract addresses read from environment variables
- Apps should set their own contract address env vars
- Base config structure supports multiple apps via env vars

### App-Specific Backend Config

Apps can:
1. **Use environment variables** - Set app-specific contract addresses via env vars
2. **Extend base config** - Create app-specific config that imports and extends base config
3. **Override in services** - App-specific services can read their own env vars

## Configuration Loading

### Frontend

```html
<!-- In apps/[app]/frontend/index.html -->
<!-- 1. Base configs (load first) -->
<script src="../../base/frontend/src/config/api-config.js"></script>
<script src="../../base/frontend/src/config/contract-config.js"></script>

<!-- 2. App-specific config (extends base) -->
<script src="src/config/contract-config.js"></script>

<!-- 3. Game/app scripts (use config) -->
<script src="src/game/main.js"></script>
```

### Backend

Backend config is loaded automatically when base services are imported:

```typescript
// In apps/[app]/backend/app/api/.../route.ts
import { getConfig } from '../../../../../base/backend/config/config';

// Config is automatically loaded from environment variables
const config = getConfig();
```

## Environment Variables

### Base Variables (All Apps)

```bash
# Network
SUI_NETWORK=testnet  # or mainnet
SUI_RPC_URL=https://fullnode.testnet.sui.io:443

# CORS
CORS_ORIGIN=*

# Tokens
MEWS_TOKEN_TYPE_ID=...
MIN_TOKEN_BALANCE=500000000
```

### App-Specific Variables

Apps should prefix their contract variables with their app name or use generic names:

```bash
# Shooter Game contracts
GAME_SCORE_CONTRACT=0x...
BADGE_REGISTRY_OBJECT_ID=0x...
STATISTICS_REGISTRY_OBJECT_ID=0x...

# Community Foundry contracts (future)
FOUNDRY_PROJECT_REGISTRY=0x...
FOUNDRY_FUNDING_CONTRACT=0x...
```

## Best Practices

1. **Base configs are app-agnostic** - No hardcoded app-specific values
2. **Apps extend base configs** - Provide app-specific values via separate files or env vars
3. **Use environment variables** - For backend configs, use env vars for app-specific values
4. **Document app requirements** - Each app should document its required config values
5. **Validate on load** - Apps should validate their required config values are present

## Example: Adding a New App

1. **Frontend:**
   - Create `apps/new-app/frontend/src/config/contract-config.js`
   - Set app-specific contract addresses
   - Load after base configs in `index.html`

2. **Backend:**
   - Set app-specific environment variables
   - Create app-specific services that read from env vars
   - Import base config for shared infrastructure

---

**Last Updated:** 2025-01-04
