# Contract Deployment Checklist

## Listing all Move contracts that need to be deployed

### Checking for initialization requirements

## Contract deployment list

### Package to deploy

**Package name:** `suitwo_game`

**Location:** `contracts/suitwo_game/`

**Contains 4 modules:**

1. **badge_system** — Badge NFT system
2. **mews** — MEWS token
3. **premium_store** — Premium store/inventory
4. **score_submission** — Game score submission system

## Post-deployment initialization steps

After deploying the package, run these initialization functions in order:

### Badge system:

1. `badge_system::initialize_badge_registry(fee_recipient: address)` — Initialize badge registry
2. `badge_system::create_display(publisher: &Publisher)` — Create Display object for wallet compatibility (important: uses image_url field)

### Score submission:

1. `score_submission::init()` — Auto-initializes on deployment (no manual call needed)
2. `score_submission::create_admin_capability(admin_address: address)` — Create admin capability

### Premium store:

1. `premium_store::init()` — Auto-initializes on deployment (no manual call needed)
2. `premium_store::create_admin_capability(admin_address: address)` — Create admin capability

### MEWS token:

1. `mews::init()` — Auto-initializes on deployment (no manual call needed)

## Important notes

- The `badge_system::create_display` function must be called after deployment to create the Display object with the `image_url` field (wallets require this).
- Admin capabilities need to be created for score submission and premium store.
- The `init()` functions for `score_submission`, `premium_store`, and `mews` run automatically on package deployment.

## Environment variables needed after deployment

- `GAME_SCORE_CONTRACT_TESTNET` — Package ID
- `BADGE_REGISTRY_OBJECT_ID_TESTNET` — From `initialize_badge_registry`
- `BADGE_PUBLISHER_OBJECT_ID_TESTNET` — From package deployment
- `BADGE_DISPLAY_OBJECT_ID_TESTNET` — From `create_display`
- `ADMIN_CAPABILITY_OBJECT_ID_TESTNET` — From `create_admin_capability` calls
- `SESSION_REGISTRY_OBJECT_ID_TESTNET` — From `score_submission::init()`
- `STATISTICS_REGISTRY_OBJECT_ID_TESTNET` — From `score_submission::init()`
- `PREMIUM_STORE_OBJECT_ID_TESTNET` — From `premium_store::init()`
- `PREMIUM_STORE_ADMIN_CAPABILITY_OBJECT_ID_TESTNET` — From `premium_store::create_admin_capability`

## Deployment Scripts

The following scripts automate the deployment process:

1. **`deploy.js`** — Deploys the contract package
2. **`extract-deployment-ids.js`** — Extracts Session Registry, Statistics Registry, and Premium Store IDs
3. **`find-badge-publisher.js`** — Finds the Badge Publisher object ID
4. **`setup-badge-system.js`** — Initializes Badge Registry and creates Display object
5. **`extract-badge-registry.js`** — Extracts Badge Registry ID
6. **`extract-display-id.js`** — Extracts Badge Display ID
7. **`create-admin-capability.js`** — Creates admin capabilities for both modules

## Deployment Order

1. Run `deploy.js` to deploy the package
2. Run `extract-deployment-ids.js` to get core object IDs
3. Run `setup-badge-system.js` to initialize badge system
4. Run `extract-badge-registry.js` and `extract-display-id.js` to get badge IDs
5. Run `create-admin-capability.js` to create admin capabilities
6. Update `CURRENT_DEPLOYMENT_IDS.md` with all IDs
7. Update `backend/.env.local` with all environment variables

---

*This checklist is for the contract deployment agent.*

