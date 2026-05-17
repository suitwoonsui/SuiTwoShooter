# 🎯 DEPLOYMENT IDs - SINGLE SOURCE OF TRUTH

**⚠️ THIS IS THE ONLY FILE YOU NEED FOR CONTRACT IDs**

**Latest deployment: 2026-02-10 (Platform upgraded; admin caps and reward registries created)**

**TX digests:** Platform publish `5BBuEHmeqfzx1QamxyhpR319fbFYkwQvuZPfsZtwiTcK` | Platform upgrade `4wK3WmhqzWQLJ6cKMLcJuxkeSwErkCFXrG7PhjLAGncM` | Regatta `7CQR4L3ySuJR4SXmzZ4f1GuiBH8D8FV6xBJxvJKe4q4b` | Game `E4cKfsmoKo9VjKEbfaC7ju8dCCuBhv8usvzLVCw1gu6t`

---

## 📋 **Backend .env (copy-paste templates)**

Copy the block you need into `Aqueduct Platform/backend/.env` or `apps/shooter-game/backend/.env`. Add shared vars (e.g. `GAME_WALLET_PRIVATE_KEY`, `PLATFORM_WALLET_PRIVATE_KEY`) and restart the server after updating.

**Aqueduct Platform backend — Aqueduct Platform/backend/.env (testnet):**
```env
# Set PLATFORM_WALLET_PRIVATE_KEY to the deployer key (owns UpgradeCap and admin caps).
AQUEDUCT_PLATFORM_PACKAGE_ID_TESTNET=0xfdc147a86a1279ffb42b586cdf48e7ba84ba145cd7b8dc3f122534caef920cb0
AQUEDUCT_PLATFORM_PACKAGE_VERSION_ID_TESTNET=0x048fa63b98a7aa068d82e2127239f08edddcdadfe11c9b28ac8e532ca03df8fa
REGATTA_EXTENSION_PACKAGE_ID_TESTNET=0xd6590bbb3ae677e128e143a1483d059505a2ed4931315c116f3182d1a3436c5e
RESERVOIR_SYSTEM_OBJECT_ID_TESTNET=0x149ed77619040398bef1b0cb97c620fc865390a9289ebc731e5882b1a5795ddc
TERMINAL_STORE_OBJECT_ID_TESTNET=0xe62fc538336742dc2eb2b4b09612d8e4516846c626aeea14eec1406d74069904
TERMINAL_STORE_ADMIN_CAPABILITY_OBJECT_ID_TESTNET=0xabcd781a4679db328f0c62d6cf93199a484fb0b896eec47f84ee9d4c9ed7cd96
STATION_EVENT_REGISTRY_ID_TESTNET=0x1e9630f54f5951b6603e24c7237b102c1bb4f1d609e6e9ebec86bb6cb6b97b4b
STATION_ADMIN_CAPABILITY_ID_TESTNET=0xa8ba15b94f0622e801c39d832585d8e24cebe6fc266b99c36b0da5fd00ec6737
SUSTAIN_RAIN_CONFIG_REGISTRY_ID_TESTNET=0xf143d090323616c056dc587bd645a5bf5391cd0e77c637f70e19c9500275d37b
SUSTAIN_RAIN_STATUS_REGISTRY_ID_TESTNET=0xab8a265327573b536f09b592bed1e556abcc03dc531912695da877edee387603
# Legacy: PLATFORM_REWARD_CONFIG_REGISTRY_ID_TESTNET / PLATFORM_REWARDS_STATUS_REGISTRY_ID_TESTNET (backend accepts both)
GLACIER_ADMIN_CAP_ID_TESTNET=0xe20342ba43a13549456bae5c7091a5750fd3427adb50816cb3931f7462405525

CHART_APP_REGISTRY_OBJECT_ID_TESTNET=0x5dca40820a08e6fd4a592dc13d771a54e4ce6ca69cb19d17a86c1d12903a68d4
CHART_APP_REGISTRY_ADMIN_CAP_OBJECT_ID_TESTNET=0x4a3a0b34867c0616499f931bb5cea6d6b70ae77e48976ed87598acf264b9d05c
HELM_CONFIG_REGISTRY_OBJECT_ID_TESTNET=<run helm::create_app_config_registry if needed>

# Shipyard (Platform NFT, optional)
SHIPYARD_PACKAGE_ID_TESTNET=<from platform_nft deploy>
SHIPYARD_TRANSFER_POLICY_ID_TESTNET=
SHIPYARD_TRADABLE_TRANSFER_POLICY_ID_TESTNET=
SHIPYARD_POSITION_RECEIPT_TRANSFER_POLICY_ID_TESTNET=
SHIPYARD_RESTRICTED_TRANSFER_POLICY_ID_TESTNET=
SHIPYARD_IMMUTABLE_TRANSFER_POLICY_ID_TESTNET=
SHIPYARD_ADMIN_CAP_OBJECT_ID_TESTNET=
```

**UpgradeCaps (testnet):** Platform `0xbd0f20c908518657bbb453b3bd029178361cec4157b314b322b200538b3349e0` | Regatta `0x6c876ababea8f6a18050d4575d57bf5c11ea30bddfa1d36ce5f46be31a7a5c4e` | Game `0xa377e8b8ffa5a53c12dedb2b2a7551129df8f4fe2b21275a2c9d60f5ab0a2d29`

**apps/shooter-game/backend/.env (testnet) — MVP (platform only):**
```env
# Platform connection (required)
PLATFORM_BACKEND_URL=http://localhost:3000
API_BASE_URL=http://localhost:3000

# App identity (required)
APP_ID=<your app UUID>
ECOSYSTEM_ID=<your ecosystem UUID>

# Per-ecosystem API key (required). Match ECOSYSTEM_<idNorm>_API_KEY from platform .env
ECOSYSTEM_<idNorm>_API_KEY=<ecosystem API key>

# App capability — from bootstrap-app-registry; platform uses this to build tx that game signs
APP_CAPABILITY_OBJECT_ID_TESTNET=<from bootstrap-app-registry>

# Terminal — game signs store admin tx (add-items, etc.); same ID as in platform .env
TERMINAL_STORE_ADMIN_CAPABILITY_OBJECT_ID_TESTNET=0xabcd781a4679db328f0c62d6cf93199a484fb0b896eec47f84ee9d4c9ed7cd96

# MEWS (from fresh deploy 2026-02-09)
MEWS_PACKAGE_ID_TESTNET=0x66619cd29a31198f4ae1a6b98521bc7a84914f8c4198925ffa7179dbaefeabac
# MEWS_TREASURY_CAP_OBJECT_ID_TESTNET=<if minting>
```

Package IDs, Station registry, MEWS, and UpgradeCaps above are from the 2026-02-09 fresh deploy. Fill the remaining placeholders using the table below, then copy into your `.env` files. Keep secrets in local `.env` only (do not commit). Ensure Terminal and Station admin caps are owned by the wallet used as `PLATFORM_WALLET_PRIVATE_KEY` (transfer scripts in `Aqueduct Platform/contracts/platform` if needed). Vault creation uses CorridorAdminCap (app admin single signer); see platform Regatta/tournament create flow.

### Rest of the contract IDs — where to get them

After running **platform deploy** (`node "Aqueduct Platform/contracts/platform/deploy.js"`), many IDs are printed in the console and written to **`Aqueduct Platform/contracts/platform/PLATFORM_DEPLOYMENT.json`**. Use this mapping to fill the .env block above and your local `.env`.

| Env var (platform backend) | Source | How to get it |
|----------------------------|--------|----------------|
| `RESERVOIR_SYSTEM_OBJECT_ID_TESTNET` | One-time script | Run `node "Aqueduct Platform/contracts/platform/create-reservoir-system.js"` (requires Chart admin cap from bootstrap). Writes to **PLATFORM_DEPLOYMENT.json**. |
| `TERMINAL_STORE_OBJECT_ID_TESTNET` | One-time script | Run `node "Aqueduct Platform/contracts/platform/create-terminal-store.js"` (requires Chart admin cap from bootstrap). Writes to **PLATFORM_DEPLOYMENT.json**. |
| `TERMINAL_STORE_ADMIN_CAPABILITY_OBJECT_ID_TESTNET` | Deploy script or one-time script | From deploy: see `storeAdminCapId` in **PLATFORM_DEPLOYMENT.json** (only set if Terminal existed at deploy time). Or run `node "Aqueduct Platform/contracts/platform/create-terminal-admin-cap.js"` after `create-terminal-store.js` and copy the printed ID. |
| `STATION_ADMIN_CAPABILITY_ID_TESTNET` | Deploy script or one-time script | From deploy: see `eventAdminCapId` in **PLATFORM_DEPLOYMENT.json**. Or run `node "Aqueduct Platform/contracts/platform/create-events-admin-cap.js"` and copy the printed ID. |
| `SUSTAIN_RAIN_CONFIG_REGISTRY_ID_TESTNET` | Deploy script or one-time script | From deploy: see `rewardConfigRegistryId` in **PLATFORM_DEPLOYMENT.json**. Or run `node "Aqueduct Platform/contracts/platform/create-reward-config-registry.js"`. Legacy: `PLATFORM_REWARD_CONFIG_REGISTRY_ID_TESTNET`. |
| `SUSTAIN_RAIN_STATUS_REGISTRY_ID_TESTNET` | Deploy script or one-time script | From deploy: see `rewardStatusRegistryId` in **PLATFORM_DEPLOYMENT.json**. Or run `node "Aqueduct Platform/contracts/platform/create-reward-status-registry.js"`. Legacy: `PLATFORM_REWARDS_STATUS_REGISTRY_ID_TESTNET`. |
| `GLACIER_ADMIN_CAP_ID_TESTNET` | Deploy script or one-time script | From deploy: see `vaultAdminCapId` in **PLATFORM_DEPLOYMENT.json**. Or run `node "Aqueduct Platform/contracts/platform/create-vault-admin-cap.js"` and copy the printed ID. |
| `CHART_APP_REGISTRY_OBJECT_ID_TESTNET` | Publish TX objectChanges | In the **platform publish** TX (see digest at top of this file), find a created object of type `chart_registry::AppRegistry`. Or check **PLATFORM_DEPLOYMENT.json** for `chartAppRegistryObjectId` after a deploy that extracts it. |
| `CHART_APP_REGISTRY_ADMIN_CAP_OBJECT_ID_TESTNET` | One-time script | Run `node "Aqueduct Platform/contracts/platform/bootstrap-app-registry.js"` (creates admin cap and can register app). Or `create-app-registry-admin-cap-only.js` if you only need the cap. |
| `HELM_CONFIG_REGISTRY_OBJECT_ID_TESTNET` | One-time Move call | Run `node "Aqueduct Platform/contracts/platform/create-app-config-registry.js"` (calls `helm::create_app_config_registry`). |
| `APP_CAPABILITY_OBJECT_ID_TESTNET` (game backend) | One-time script | Run `node "Aqueduct Platform/contracts/platform/bootstrap-app-registry.js"` for your app; use the app capability object ID it prints. |

**Order to get all IDs (from `Aqueduct Platform/contracts/platform`):**  
1. `node deploy.js` → package, Station registry, Chart AppRegistry (if extracted), event admin cap, vault admin cap, reward config/status registries (and store admin cap only if PremiumStore already existed).  
2. `node bootstrap-app-registry.js` → Chart admin cap + app capability; set `CHART_APP_REGISTRY_ADMIN_CAP_OBJECT_ID_TESTNET` and `CHART_APP_REGISTRY_OBJECT_ID_TESTNET` if not in deploy JSON.  
3. `node create-reservoir-system.js` → Reservoir ID (writes to PLATFORM_DEPLOYMENT.json).  
4. `node create-terminal-store.js` → Terminal store ID (writes to PLATFORM_DEPLOYMENT.json).  
  5. `node create-terminal-admin-cap.js` → Terminal admin cap.
Then open **PLATFORM_DEPLOYMENT.json** and copy all IDs into the .env block above and into `Aqueduct Platform/backend/.env` / `apps/shooter-game/backend/.env`.

---

## 📦 **Package Overhaul (Aqueduct Platform MVP)**

**Game package** now contains only `mews.move` (MEWS token). Score, achievements, badges, stats use the **Aqueduct Platform** backend. Game backend talks to platform via `PLATFORM_BACKEND_URL` and API key.

**Game backend .env** — Platform connection required:
- **`PLATFORM_BACKEND_URL`** — Platform API base URL (e.g. `http://localhost:3000`)
- **`ECOSYSTEM_ID`** — Ecosystem UUID (e.g. `6138350a-6f5c-4538-8f25-386b42141611`)
- **`APP_ID`** — App UUID (e.g. `2974962a-77a3-4430-a731-45d31d087811`)
- **`ECOSYSTEM_<id>_API_KEY`** — Per-ecosystem API key (from platform .env; format: `ECOSYSTEM_6138350a_6f5c_4538_8f25_386b42141611_API_KEY=...`)

**MVP = Aqueduct Platform only.** Config, catalog/store, tournaments, score, achievements, and badges all come from the Aqueduct Platform (Helm, Terminal, Regatta, etc.). The game backend does **not** use game config, item catalog, tournament registry, score, achievement, or badge contract IDs — do not set them.

**Game package build:** `sui move build` in `apps/shooter-game/contracts/suitwo_game/` produces only `mews.mv`. Deploy scripts will need updates if you later publish a new game package. Stale build artifacts (badge_system.mv, game_config.mv, etc.) are removed by a fresh build.

---

## 📌 **Expected deployment items (from code review)**

This section is derived from **Aqueduct Platform/backend/config/config.ts**, **apps/shooter-game/backend/config/config.ts**, and **Aqueduct Platform/backend/env-template.md** / **apps/shooter-game/backend/env-template.md**. Use it to ensure a new deployment captures every ID the backends expect.

### Aqueduct Platform backend — env vars

| Purpose | Env var (testnet) | Source (contract / step) |
|--------|--------------------|---------------------------|
| Platform package | `AQUEDUCT_PLATFORM_PACKAGE_ID_TESTNET` | Publish TX (package ID) |
| Package version (Helm) | `AQUEDUCT_PLATFORM_PACKAGE_VERSION_ID_TESTNET` | Upgrade TX `newPackageId` |
| Reservoir system | `RESERVOIR_SYSTEM_OBJECT_ID_TESTNET` | `reservoir::create_reservoir_system` or `game_pass::create_game_pass_system` (one-time) |
| Terminal store object | `TERMINAL_STORE_OBJECT_ID_TESTNET` | `terminal_store::create_premium_store` (one-time) |
| Terminal admin cap | `TERMINAL_STORE_ADMIN_CAPABILITY_OBJECT_ID_TESTNET` | Deploy script: `terminal_store::create_admin_capability` |
| Station event registry | `STATION_EVENT_REGISTRY_ID_TESTNET` | `station::init` (in publish TX) |
| Station admin cap | `STATION_ADMIN_CAPABILITY_ID_TESTNET` | Deploy script: `station::create_admin_capability` |
| Regatta package | `REGATTA_EXTENSION_PACKAGE_ID_TESTNET` | Publish platform_tournaments |
| Glacier admin cap | `GLACIER_ADMIN_CAP_ID_TESTNET` | Deploy script: `glacier::create_admin_cap` |
| Sustain Rain config registry | `SUSTAIN_RAIN_CONFIG_REGISTRY_ID_TESTNET` | Deploy script: `station::create_reward_config_registry`. Legacy: PLATFORM_REWARD_CONFIG_REGISTRY_ID_TESTNET. |
| Sustain Rain status registry | `SUSTAIN_RAIN_STATUS_REGISTRY_ID_TESTNET` | Deploy script: `station::create_reward_status_registry`. Legacy: PLATFORM_REWARDS_STATUS_REGISTRY_ID_TESTNET. |
| Chart app registry | `CHART_APP_REGISTRY_OBJECT_ID_TESTNET` | `chart_registry::init` (in publish TX) |
| Chart admin cap | `CHART_APP_REGISTRY_ADMIN_CAP_OBJECT_ID_TESTNET` | `chart_registry::create_app_registry_admin_cap` (one-time) |
| Ecosystem app registry | `ECOSYSTEM_APP_REGISTRY_OBJECT_ID_TESTNET` | `chart_registry::create_ecosystem_app_registry` (one-time) |
| Helm config registry | `HELM_CONFIG_REGISTRY_OBJECT_ID_TESTNET` | `helm::create_app_config_registry` (one-time) |
| Ecosystem Chart (optional) | `ECOSYSTEM_CHART_OBJECT_ID_TESTNET` | `chart::create_chart` (one-time) |
| Shipyard / Platform NFT (optional) | `SHIPYARD_PACKAGE_ID_TESTNET`, `SHIPYARD_*_TRANSFER_POLICY_*`, `SHIPYARD_ADMIN_CAP_OBJECT_ID_TESTNET` | Publish platform_nft package |
| Per-ecosystem | `ECOSYSTEM_<idNorm>_API_KEY`, `ECOSYSTEM_<idNorm>_ADMIN_WALLET`, `ECOSYSTEM_<idNorm>_TERMINAL_STORE_OBJECT_ID_TESTNET`, `ECOSYSTEM_<idNorm>_RESERVOIR_SYSTEM_OBJECT_ID_TESTNET`, etc. | Same IDs as global; can override per ecosystem |

### Game backend — env vars for MVP (platform only)

| Purpose | Env var (testnet) | Notes |
|--------|--------------------|--------|
| Platform URL | `PLATFORM_BACKEND_URL`, `API_BASE_URL` | Required |
| App identity | `APP_ID`, `ECOSYSTEM_ID` | Required |
| API key | `ECOSYSTEM_<idNorm>_API_KEY` | Required; match platform .env |
| App capability | `APP_CAPABILITY_OBJECT_ID_TESTNET` | From bootstrap-app-registry; game sends in header |
| Terminal admin cap | `TERMINAL_STORE_ADMIN_CAPABILITY_OBJECT_ID_TESTNET` | Game signs store admin tx |
| MEWS (if minting) | `MEWS_PACKAGE_ID_TESTNET`, `MEWS_TREASURY_CAP_OBJECT_ID_TESTNET` | From game package (mews) publish |

**MVP does not use:** Game config, item catalog, tournaments, score, achievements, or badges are provided by the platform (Helm, Terminal, Regatta). Do not set `GAME_CONFIG_*`, `ITEM_CATALOG_*`, `TOURNAMENT_*`, `SESSION_REGISTRY_*`, `STATISTICS_REGISTRY_*`, `ADMIN_CAPABILITY_OBJECT_ID`, `GAME_SCORE_CONTRACT`, `BADGE_*`, or `ACHIEVEMENT_*` in the game backend.

### What the Aqueduct Platform package produces

- **From init (in publish TX):** `AppRegistry` (chart_registry), `MasterEventRegistry` (station). Deploy script can read these from `objectChanges` if it looks for them.
- **From one-time create_* (not in deploy.js today):** `ReservoirSystem` (reservoir) or `GamePassSystem` (game_pass), `PremiumStore` (terminal_store). Create in separate transactions after publish; then set `RESERVOIR_SYSTEM_OBJECT_ID_TESTNET` and `TERMINAL_STORE_OBJECT_ID_TESTNET`.
- **From deploy.js after publish:** UpgradeCap (fresh only), `terminal_store::AdminCapability`, `station::AdminCapability`, `glacier::AdminCapability`, `PlatformRewardConfigRegistry`, `EventRewardsStatusRegistry`. Script prints and saves these. **Note:** The script does *not* call `create_game_pass_system`, `create_reservoir_system`, or `create_premium_store`; those run in separate transactions. For a fresh publish, run them (e.g. via Sui Explorer or a small script) and record the object IDs here and in .env.
- **From one-time scripts / manual:** `chart_registry::create_app_registry_admin_cap`, `chart_registry::create_ecosystem_app_registry`, `helm::create_app_config_registry`, `chart::create_chart`, `sustain::create_ecosystem_milestones_registry`, `hydroscope::create_ecosystem_stats_registry`. Run as needed and set the corresponding env vars.

### What the game package produces (MVP: mews only)

- **From publish:** Package ID, UpgradeCap (fresh). Optionally a TreasuryCap if mews init or a create_* creates it (check `mews.move`).
- **MVP:** Game package is mews only. Config, catalog, tournaments, score, achievements, badges live on the platform; the game backend does not need contract IDs for them.

### Fresh deploy checklist (new deployment)

1. **Aqueduct Platform:** Run `node deploy.js` (PowerShell on Windows: `Set-Location platform\contracts\platform` then `node deploy.js`). Save: package ID, newPackageId (if upgrade), UpgradeCap, MasterEventRegistry ID (from objectChanges), AppRegistry ID (from objectChanges). Create and save: Terminal admin cap, Station admin cap, Glacier admin cap, Sustain Rain config registry, Sustain Rain status registry.
2. **One-time creates (platform):** Call `game_pass::create_game_pass_system` **or** `reservoir::create_reservoir_system` (pick one for credits/tickets); call `terminal_store::create_premium_store`. Record object IDs for `RESERVOIR_SYSTEM_OBJECT_ID_TESTNET` and `TERMINAL_STORE_OBJECT_ID_TESTNET`. If using Helm: run `helm::create_app_config_registry`, set `HELM_CONFIG_REGISTRY_OBJECT_ID_TESTNET`. If using Chart: run `chart_registry::create_app_registry_admin_cap`, then `chart_registry::create_ecosystem_app_registry` and/or `chart::create_chart` as needed.
3. **Regatta:** Deploy platform_tournaments; set `REGATTA_EXTENSION_PACKAGE_ID_TESTNET`.
4. **Game (mews):** Deploy suitwo_game (mews only); set `MEWS_PACKAGE_ID_TESTNET` and any TreasuryCap ID if applicable.
5. **Bootstrap:** Run `bootstrap-app-registry.js` for each app; set `APP_CAPABILITY_OBJECT_ID_TESTNET` in game backend and per-ecosystem vars in platform backend.
6. **Fill .env:** Use the copy-paste templates at the **top of this file**; copy platform block to `Aqueduct Platform/backend/.env` and game block to `apps/shooter-game/backend/.env`.

---

## 📦 **App config (platform app config service)**

**Aqueduct Platform backend** — Helm (app config) uses: `CHART_APP_REGISTRY_OBJECT_ID_TESTNET`, `HELM_CONFIG_REGISTRY_OBJECT_ID_TESTNET` (see platform .env block above).

**If you see "No module found with module name app_config"** — Upgrade the Aqueduct Platform package so the deployed bytecode includes the `helm` module, then run `helm::create_app_config_registry` once and set `HELM_CONFIG_REGISTRY_OBJECT_ID_TESTNET` in platform backend .env.

**Game backend** (when using platform app config) — no contract IDs. Add to the game backend .env block (see above):
- **`PLATFORM_APP_CONFIG_URL`** — Platform API base URL (e.g. `http://localhost:3000`). Falls back to `PLATFORM_BACKEND_URL` if set.
- **`PLATFORM_ECOSYSTEM_ID`** — Ecosystem ID (or `ECOSYSTEM_ID`).
- **`PLATFORM_APP_ID`** — App ID (or `APP_ID`).
- **`PLATFORM_ECOSYSTEM_API_KEY`** — Ecosystem API key for admin writes (or `ECOSYSTEM_<id>_API_KEY` in platform .env).
- **`APP_CAPABILITY_OBJECT_ID_TESTNET`** — App capability (game sends in `X-App-Capability-Object-Id` header).

---

## 🛒 **Admin add-items (platform)**

When the platform uses **AppRegistry**, `terminal_store::admin_add_items` expects **8 arguments** (AppCapability, store, AppRegistry, clock, player, item_type, item_level, quantity). The **app owns the AppCapability**; the game backend holds it in **game** .env and sends it to the platform on each request (header `X-App-Capability-Object-Id`). The platform does **not** store the app capability.

**In `apps/shooter-game/backend/.env` add:**

| Env var | Description |
|--------|-------------|
| **`APP_CAPABILITY_OBJECT_ID_TESTNET`** (or `APP_CAPABILITY_OBJECT_ID`) | Your app’s AppCapability object ID. The app/game wallet owns this cap. |

**How to get the value:** Run `node bootstrap-app-registry.js` from `Aqueduct Platform/contracts/platform` (with `BOOTSTRAP_ECOSYSTEM_ID`, `BOOTSTRAP_APP_ID`, and `ECOSYSTEM_<idNorm>_ADMIN_WALLET` set to the **app/game wallet** that will own the cap). The script prints the capability object ID; put it in **game** backend .env as `APP_CAPABILITY_OBJECT_ID_TESTNET=0x...`. The game backend sends it to the platform when calling add-items/build, app-config, consume, etc.

**Platform:** No app-capability env vars needed. The platform reads `X-App-Capability-Object-Id` from the request (sent by the game).

---

## 🚀 **QUICK DEPLOYMENT COMMANDS (copy-paste)**

Run from repo root. Deploy in this order.

**Windows (PowerShell):** Use `Set-Location` (or `cd`) then `node deploy.js` in the same run. If `sui move build` fails with "Access is denied" on a lock file, run the script from a normal terminal (not sandboxed) or ensure nothing else is using `%USERPROFILE%\.move\git\`:

```powershell
# 1. Platform (reservoir, terminal_store, station, chart_registry, helm, glacier, etc.)
Set-Location -Path "platform\contracts\platform"
node deploy.js

# 2. Tournament extension (depends on platform)
Set-Location -Path "platform\contracts\platform_tournaments"
node deploy.js

# 3. Game package (depends on platform)
Set-Location -Path "apps\shooter-game\contracts\suitwo_game"
node deploy.js

# 4. Platform NFT (optional)
Set-Location -Path "platform\contracts\platform_nft"
node deploy.js
```

**macOS / Linux (bash):**

```bash
# 1. Platform
cd "Aqueduct Platform/contracts/platform" && node deploy.js

# 2. Tournament extension
cd "Aqueduct Platform/contracts/platform_tournaments" && node deploy.js

# 3. Game package
cd apps/shooter-game/contracts/suitwo_game && node deploy.js

# 4. Platform NFT (optional)
cd "Aqueduct Platform/contracts/platform_nft" && node deploy.js
```

**Upgrading to new contract names (reservoir, terminal_store, station):** Adding new modules (e.g. `reservoir`, `chart`, `helm`) can make Sui report **IncompatibleUpgrade**. Then you must either use a **breaking** upgrade policy in the deploy script or do a **fresh publish** of the platform package and migrate object IDs in .env.

---

## ✅ **What to do after deploying contracts (per ecosystem)**

After deploying the **platform** package (and before relying on store/game-pass/events), the deployment agent or operator should:

### 1. Set env (per ecosystem)

Single set of platform contracts; ecosystem and app IDs (opaque) separate data. In **Aqueduct Platform/backend/.env**:

- **Global:** `APP_REGISTRY_OBJECT_ID_TESTNET` (from `chart_registry::init`; one shared object).
- **Per ecosystem** (ecosystem ID opaque, e.g. UUID):

| Env var | Description |
|--------|-------------|
| **`ECOSYSTEM_<idNorm>_API_KEY`** | API key for requests with that ecosystem id (required for app-config and platform APIs). |
| **`ECOSYSTEM_<idNorm>_ADMIN_WALLET`** | Optional; ecosystem admin wallet for rewards, etc. |

**App capability:** The **app** (game) owns the AppCapability. Set **`APP_CAPABILITY_OBJECT_ID_TESTNET`** (or `APP_CAPABILITY_OBJECT_ID`) in **game** backend .env. The game sends it to the platform in the `X-App-Capability-Object-Id` header. The platform does **not** need the app capability in its .env.

**Game backend** uses **`ECOSYSTEM_ID`**, **`APP_ID`**, and **`APP_CAPABILITY_OBJECT_ID_TESTNET`** (opaque; set in game .env). Apps in an ecosystem can read other app data; only AppCapability allows an app to edit its own app-specific data.

### 2. Bootstrap (first-time only)

1. In **Aqueduct Platform/backend/.env** set **`BOOTSTRAP_ECOSYSTEM_ID`** (opaque ecosystem id, e.g. UUID), **`BOOTSTRAP_APP_ID`** (opaque app id to register), and **`ECOSYSTEM_<idNorm>_ADMIN_WALLET`** (or `_SHOOTER_ADMIN_WALLET`) for that ecosystem.
2. Run **`node bootstrap-app-registry.js`** from `Aqueduct Platform/contracts/platform`. It creates the admin cap (if needed) and registers the app; it prints the exact env lines to add (no hardcoded app IDs).
3. For additional apps: set **`BOOTSTRAP_APP_ID`** to the next app_id and run the script again (or call **`register_app(admin_cap, app_id)`** on-chain) so that:
   - The app is registered in the AppRegistry, and
   - An **AppCapability** is created and transferred to that app’s admin wallet.
3. Set the env vars above from the resulting object IDs (AppRegistry shared object, and each app’s AppCapability object ID).

The backend can then resolve capability IDs from env and use the per-app contract paths.

### 3. Migration (if moving from old layout)

If you had data under the previous layout (no per-app partitions):

- Use the Move **`migrate_player_inventory`** and **`migrate_game_pass`** flows to move existing data into the per-app partitions.
- Once migration is done and the env vars (and optional migrations) are in place, the backend uses the per-app layout automatically; **no further code changes** are required for that.

---

**Platform NFT (Shipyard):** Env vars (e.g. `SHIPYARD_PACKAGE_ID_TESTNET`, `SHIPYARD_ADMIN_CAP_OBJECT_ID_TESTNET`) are in the platform .env block above. Set after deploying `platform_nft`.

---

## 🔄 **UPGRADE MECHANISM**

**✅ All contracts are upgradable** (platform, tournament, platform_nft, game). We use Sui's native upgrade mechanism.

- **First Deploy**: Creates a package and saves an `UpgradeCap` object (in `UPGRADE_CAP.json` or package-specific deployment file)
- **Subsequent Deploys**: Run the same deploy script again; it uses `UpgradeCap` from the saved file or **discovers it on-chain** by package ID (so upgrades work even if the file was lost)
- **Package ID Persists**: The **original package ID** stays the same across upgrades
- **Object IDs Persist**: Shared objects (registries, stores) keep the same IDs
- **No Migration Needed**: Data stays in the same objects, no manual migration required

**Benefits:**
- ✅ No more OLD_ package IDs (original package ID persists)
- ✅ No migration functions needed
- ✅ Simpler .env files (object IDs don't change)
- ✅ Automatic version tracking by Sui

**Upgrade Process:**
1. Run the deployment script: `node deploy.js`
2. Script automatically detects if `UPGRADE_CAP.json` exists
3. If found: Upgrades the package (keeps same package ID)
4. If not found: Does fresh publish and saves UpgradeCap

**When You Still Need Fresh Publishes:**
- First deployment to a new network (testnet → mainnet)
- Breaking changes that Sui rejects (rare)
- Starting fresh after losing UpgradeCap

---

## 📦 **DEPLOYMENT ORDER**

**IMPORTANT:** Platform contracts must be deployed **BEFORE** tournament extension and game contracts.

1. **Deploy Platform Package First:**
   ```bash
   cd "Aqueduct Platform/contracts/platform"
   node deploy.js
   ```
   - First run: Creates package and saves `UPGRADE_CAP.json`
   - Subsequent runs: Automatically upgrades using saved UpgradeCap
   - **Note:** Package renamed from `suitwo_platform` to `platform` (2026-01-23)

2. **Deploy Tournament Extension Package Second:**
   ```bash
   cd "Aqueduct Platform/contracts/platform"_tournaments
   node deploy.js
   ```
   - First run: Creates package and saves `UPGRADE_CAP.json`
   - Subsequent runs: Automatically upgrades using saved UpgradeCap
   - Depends on platform package (must be deployed first)

3. **Deploy Game Package Third:**
   ```bash
   cd apps/shooter-game/contracts/suitwo_game
   node deploy.js
   ```
   - First run: Creates package and saves `UPGRADE_CAP.json`
   - Subsequent runs: Automatically upgrades using saved UpgradeCap
   - The game package references the platform package ID

3. **Update Backend .env File (First Deploy Only):**
   Copy all IDs (from both platform and game deployments) into **ONE** `.env` file:
   `apps/shooter-game/backend/.env` (or `.env.local`)
   
   **Note:** After first deploy, object IDs persist across upgrades - no need to update .env!

---

## ⚠️ **CRITICAL: Update Your Backend Environment Variables**

**Use the env blocks at the top of this file.** Copy:
- **Aqueduct Platform backend:** the platform .env block at the top of this file into `Aqueduct Platform/backend/.env`
- **Game backend:** the `apps/shooter-game/backend/.env` block into `apps/shooter-game/backend/.env`

**Notes:**
- **Strict split:** Game backend .env has APP_CAPABILITY_OBJECT_ID, **TERMINAL_STORE_ADMIN_CAPABILITY_OBJECT_ID_TESTNET** (or _MAINNET; game signs store admin tx), and platform connection. MVP: no game config, catalog, tournament, score, achievement, or badge IDs. Platform holds all other contract IDs.
- **Shared variables** (e.g. `GAME_WALLET_PRIVATE_KEY`) go in both `.env` files.
- **Restart backend servers** after updating `.env`.

---

## 📋 **AQUEDUCT PLATFORM BACKEND Environment Variables (MAINNET)**

**Aqueduct Platform.** Copy to `Aqueduct Platform/backend/.env` for MAINNET. Use Aqueduct names; set after deploying to mainnet.

```env
# Platform (Aqueduct names)
AQUEDUCT_PLATFORM_PACKAGE_ID_MAINNET=<TO_BE_SET_AFTER_MAINNET_DEPLOYMENT>
AQUEDUCT_PLATFORM_PACKAGE_VERSION_ID_MAINNET=<from upgrade TX>
REGATTA_EXTENSION_PACKAGE_ID_MAINNET=<TO_BE_SET_AFTER_MAINNET_DEPLOYMENT>
RESERVOIR_SYSTEM_OBJECT_ID_MAINNET=<from create_reservoir_system or create_game_pass_system>
TERMINAL_STORE_OBJECT_ID_MAINNET=<from create_premium_store>
TERMINAL_STORE_ADMIN_CAPABILITY_OBJECT_ID_MAINNET=<from deploy script>
STATION_EVENT_REGISTRY_ID_MAINNET=<from station::init>
STATION_ADMIN_CAPABILITY_ID_MAINNET=<from deploy script>
GLACIER_ADMIN_CAP_ID_MAINNET=<from deploy script>
CHART_APP_REGISTRY_OBJECT_ID_MAINNET=<from chart_registry::init>
HELM_CONFIG_REGISTRY_OBJECT_ID_MAINNET=<from helm::create_app_config_registry>
# SHIPYARD_* if using platform NFT
# SUI_NETWORK=mainnet
```

---

## 📋 **GAME BACKEND Environment Variables (MAINNET)**

**MVP (platform only).** Copy to `apps/shooter-game/backend/.env` for MAINNET. No game config, catalog, tournament, score, achievement, or badge contract IDs.

```env
# Platform connection, app identity, API key (same as testnet pattern)
PLATFORM_BACKEND_URL=<platform API URL>
APP_ID=<app UUID>
ECOSYSTEM_ID=<ecosystem UUID>
ECOSYSTEM_<idNorm>_API_KEY=<key from platform .env>

# App capability (from bootstrap-app-registry)
APP_CAPABILITY_OBJECT_ID_MAINNET=<from bootstrap>

# Terminal — game signs store admin tx
TERMINAL_STORE_ADMIN_CAPABILITY_OBJECT_ID_MAINNET=<from platform deploy>

# MEWS (only if minting from game backend)
# MEWS_PACKAGE_ID_MAINNET=
# MEWS_TREASURY_CAP_OBJECT_ID_MAINNET=
# SUI_NETWORK=mainnet
```

---

## 🔗 Transaction Links (current testnet)

- **Platform (fresh 2026-02-02):** [4Ra36YjMSZ6EXXv89PBU1fnmXv69DeUYhGeC4z9wesGd](https://suiexplorer.com/txblock/4Ra36YjMSZ6EXXv89PBU1fnmXv69DeUYhGeC4z9wesGd?network=testnet)
- **Tournament:** [ENuvcmKHukc9L6MjQN8QAXgkDjcJeRAeRRDYsD9w1RLf](https://suiexplorer.com/txblock/ENuvcmKHukc9L6MjQN8QAXgkDjcJeRAeRRDYsD9w1RLf?network=testnet) (fresh) / [FadGgVKB49r4ERNcisoVvArzNhPNYLnWUc3sTNni3QPi](https://suiexplorer.com/txblock/FadGgVKB49r4ERNcisoVvArzNhPNYLnWUc3sTNni3QPi?network=testnet) (upgrade)
- **Game (fresh 2026-02-04):** [Dgk8fc8WFEop9jwCSkAak53jAPUacoihh1P6YRL3gdD2](https://suiexplorer.com/txblock/Dgk8fc8WFEop9jwCSkAak53jAPUacoihh1P6YRL3gdD2?network=testnet)
- **Platform NFT (fresh 2026-02-04):** [HrdMQUqzXeHRBUMg4HxoR3sk9T59n2FBMhrokRy2JTsS](https://suiexplorer.com/txblock/HrdMQUqzXeHRBUMg4HxoR3sk9T59n2FBMhrokRy2JTsS?network=testnet)

---

## 📜 Deployment History

Full archive of past package IDs and transactions is in **[DEPLOYMENT_HISTORY.md](./DEPLOYMENT_HISTORY.md)**.

---

## 📝 Notes

1. **This is the ONLY file with current deployment IDs** - All other files are outdated
2. **Architecture:** Aqueduct Platform package (Reservoir, Terminal, Station, Chart, Helm, Glacier, etc.), Regatta (tournaments), Game package (MEWS only for MVP). Config, catalog, tournaments, score, achievements, badges come from the Aqueduct Platform.
3. **Copy the appropriate `.env` sections above:**
   - **Aqueduct Platform Backend:** Copy the "AQUEDUCT PLATFORM BACKEND" env block to `Aqueduct Platform/backend/.env` (or `.env.local`)
   - **Game Backend:** Copy "GAME BACKEND Environment Variables" section to `apps/shooter-game/backend/.env` (or `.env.local`)
   - **Shared variables** (like `GAME_WALLET_PRIVATE_KEY`) should be in both `.env` files
4. **Restart your backend servers** after updating the `.env` files
5. **Aqueduct Platform Package:** Use Aqueduct env names (see Expected deployment items and .env blocks above). Fill all IDs from deploy output; do not commit real IDs.
6. **Tournament Extension Package:** Deploy after platform. Set `REGATTA_EXTENSION_PACKAGE_ID_TESTNET` from deploy output.
7. **Game Package (MEWS):** Deploy after platform. Set `MEWS_PACKAGE_ID_TESTNET` and any treasury cap from deploy output. Package ID persists across upgrades.
8. **All `OLD_` prefixed package IDs** are from previous deployments (suitwo_platform before rename, or older combined packages). Use migration functions to transfer data to new contracts.
9. **Deployment History:** See [DEPLOYMENT_HISTORY.md](./DEPLOYMENT_HISTORY.md) for past package IDs and transactions.
10. **Badge Registry and Display:** These are persistent objects that don't change with each package deployment. The IDs shown are from previous deployments and remain valid.
11. **Upgrade Mechanism:** All packages (platform, tournament extension, game) now use Sui's native upgrade mechanism. Original package IDs persist across upgrades, so you don't need to update `.env` files after upgrades (only after first deployment).

## 🔧 What Changed in This Deployment

- ✅ **Full contract redeployment** - All modules redeployed with latest updates
- ✅ **Game Config module added** - New `game_config` module deployed with GameConfigRegistry shared object (auto-initialized via init function)
- ✅ **Game Config initialization** - Game Config Registry auto-initialized and Admin Capability created
- ✅ **Item Catalog module** - Item Catalog Registry and Admin Capability initialized
- ✅ **All admin capabilities created** - Score, Premium Store, Tournament, Achievement, Item Catalog, and Game Config admin capabilities created
- ✅ **All modules complete** - score_submission, premium_store, badge_system, achievement_system, game_pass, tournaments, **item_catalog**, and **game_config** all properly initialized
- ✅ **Admin capabilities created** - New admin capabilities created for all modules (score_submission, premium_store, tournaments, achievement_system, **item_catalog**, **game_config**)
- ✅ **Game Config initialized** - Pack configurations (Starter, Regular, Value, Mega) successfully set in GameConfigRegistry
- ✅ **Game Config module updated** - `validate_pack_type` now allows any u8 value (0-255), added `admin_set_min_token_balance` function, added `min_token_balance` field to GameConfigRegistry, and added `MinTokenBalanceUpdated` event