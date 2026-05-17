# Contract Deployment Checklist

## Game package (suitwo_game)

**Package name:** `suitwo_game`  
**Location:** `contracts/suitwo_game/`

**Contains:** **MEWS only** (`mews.move`). Badge, game config, and store catalog are **platform-only** (Shipyard, Helm, Terminal). The game backend uses platform APIs for those; do not set `BADGE_REGISTRY_*`, `GAME_CONFIG_*`, or `PROVISIONS_*` in game .env for new setups.

### Post-deployment (mews-only)

1. Run `deploy.js` to build and publish (or upgrade).
2. From the publish transaction you get: **Package ID**, **UpgradeCap**, and optionally **MEWS TreasuryCap** (if `mews::init` ran).
3. Set `MEWS_PACKAGE_ID_TESTNET` (or `_MAINNET`) and `GAME_PACKAGE_ID_*` to the same package ID if the game backend needs it.
4. Session/Statistics registries and score submission admin cap come from the **platform** or from an older game package that included `score_submission`; the current repo does not include that module.

### Platform-only (no game init)

- **Badge** — Shipyard (platform NFT). Use platform `POST /api/nfts/mint`, `GET /api/nfts/has-badge`.
- **Game config** — Helm app-config. Use platform `GET/POST /api/app-config`.
- **Store catalog** — Terminal/Provisions. Use platform `GET /api/store/catalog`.

## Deployment script

- **`deploy.js`** — Builds (`sui move build`), publishes or upgrades the package, prints Package ID and UpgradeCap. When the package has only the mews module (current repo), it skips all game init steps and completes immediately after publish.

## Environment variables (game backend, platform path)

- `GAME_PACKAGE_ID_TESTNET` / `MEWS_PACKAGE_ID_TESTNET` — From game package publish (same ID when package is mews-only).
- `PLATFORM_BACKEND_URL`, `ECOSYSTEM_ID`, `APP_ID` — For badges, game config, store, score submission via platform.
- Do **not** set `BADGE_REGISTRY_*`, `GAME_CONFIG_REGISTRY_*`, `PROVISIONS_*` for new setups; they are platform-only.

---

*This checklist is for the contract deployment agent.*
