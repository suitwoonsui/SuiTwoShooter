# Badges, Game Config, and Provisions — Platform Only

The SuiTwo game package no longer contains `badge_system`, `game_config`, or `item_catalog` modules. These responsibilities are handled by the platform; the game backend uses platform APIs. (Provisions = Terminal item definitions; on-chain Move module: `provisions` (aqueduct_platform::provisions).)

## Badges → Platform NFT

- **Platform:** Soulbound badges are minted via platform NFT (PlatformNFT). The platform backend exposes `POST /api/nfts/mint` with `execute: true` and `soulbound: true`.
- **Game backend:** Use `platformBackendClient` (or a dedicated platform NFT client) to call the platform mint endpoint. Tier logic (e.g. based on games_played, score) stays in the game backend; stats can come from the game’s `score_submission` / `StatisticsRegistry` or from platform stats API if available.
- **Checking ownership:** Use platform `GET /api/nfts/has-badge?address=...` (or equivalent) to see if a wallet has a soulbound badge.

## Game Config → Platform App Config

- **Platform:** App-defined config is stored by the platform via App Config (key–value). The platform exposes:
  - `GET /api/app-config` — returns all config entries for the app (values base64). Requires `X-Ecosystem-Id` and `X-App-Id`.
  - `POST /api/app-config` — set one entry (`key`, `value` base64). Requires ecosystem API key and app capability.
- **Game backend:** Use platform `GET /api/app-config` for keys such as `pack_configs`, `min_token_balance`, `ticket_bundles`. Encode/decode values as JSON or base64 as needed. Do not read `GameConfigRegistry` from the game package on chain.

## Provisions → Platform Store Catalog

- **Platform:** Provisions (store item definitions) are provided by the platform (`/api/store/catalog` or the platform’s default item catalog).
- **Game backend:** Use platform `GET /api/store/catalog` (e.g. via `platformStoreClient.getCatalog()`) for item definitions. Do not read the provisions registry from the game package on chain.

## Deploy Scripts

Deploy scripts no longer create or expect `BadgeRegistry`, `GameConfigRegistry`, or the provisions registry from the game package. Badges, app config, and provisions are managed on the platform. Scripts that previously initialized badge system, game config, or item catalog should be retired or updated to document that these are now platform-only.

## Environment

Ensure the game backend has:

- `PLATFORM_BACKEND_URL` — base URL of the platform backend.
- `ECOSYSTEM_ID`, `APP_ID` — match platform registration.
- `ECOSYSTEM_<uuid>_API_KEY` — same value as on the platform.
- `CORRIDOR_CAPABILITY_OBJECT_ID_TESTNET` (or _MAINNET) — for app-config writes, catalog build, store, Regatta. Send as `X-Corridor-Capability-Object-Id`.
- `CORRIDOR_ADMIN_CAP_OBJECT_ID_TESTNET` (or _MAINNET) — for Aqueduct admin-only routes (Glacier release-distribute, catalog build). Send as `X-Corridor-Admin-Capability-Object-Id`. Required for tournament vault release.
- Do **not** set `BADGE_REGISTRY_*`, `GAME_CONFIG_REGISTRY_*`, `PROVISIONS_*` in game .env when using platform for all of these.

## Game backend platform usage (summary)

| Area | Game uses platform for | Game .env (platform path) |
|------|------------------------|----------------------------|
| **Game config** | Packs, ticket bundles, min token balance, badge_config (key `badge_config`) | `PLATFORM_BACKEND_URL`, `ECOSYSTEM_ID`, `APP_ID`, `CORRIDOR_CAPABILITY_OBJECT_ID_*` |
| **Badges** | Mint (POST /api/nfts/mint execute:true), has-badge (GET /api/nfts/has-badge) | Same; no `BADGE_REGISTRY_*` |
| **Store catalog** | Read catalog (GET /api/store/catalog), build catalog admin (POST /api/store/admin/catalog/build) | Same; catalog build uses Corridor cap (prefer `CORRIDOR_CAPABILITY_OBJECT_ID_*`) |
| **Store** | Purchase, merge, consume via platform store APIs | Same |
| **Reservoir / credits / tickets** | All via platform reservoir APIs | Same |
| **Events / Regatta** | Create, enter, submit score, vaults via platform | Same |
| **Score submission** | Game package only (`score_submission`); uses `ADMIN_CAPABILITY_OBJECT_ID_*` | `GAME_PACKAGE_ID_*`, `ADMIN_CAPABILITY_OBJECT_ID_*` (game deploy) |

## Aqueduct Platform API wiring (shooter game → platform)

The game backend `lib/api/platform-client.ts` calls the **Aqueduct Platform** backend. Path and naming alignment:

| Platform service | API path(s) | Game client / usage |
|------------------|-------------|----------------------|
| **Station** | `GET/POST /api/station`, `GET /api/station/past`, `GET/POST /api/station/[id]` (get, enter, submit, cancel) | `platformEventsClient` (getEvents, getPastEvents, getEvent, cancelEvent). Distribution: Sustain prepare-distribution, Glacier release-distribute, Sustain mark-distribution-complete. |
| **Regatta** | `GET /api/regatta/gas-payment-address`, `POST /api/regatta/create`, `enter`, `submit-score`, `default-sustain-config` | `platformTournamentClient` |
| **Sustain** | `POST /api/sustain/build-distribute` | `platformRewardsClient.buildDistribute` (rewards; game signs and submits) |
| **Reservoir** | `GET /api/reservoir/[address]`, `POST /api/reservoir/consume-credit`, `api/admin/reservoir/*` | `platformGamePassClient` (credits, tickets, list-players, verify-tickets, fix-tickets) |
| **Terminal / Store** | `GET /api/store/catalog`, `POST /api/store/purchase`, `merge`, `consume`, `api/store/admin/catalog/build` | `platformStoreClient`, catalog init |
| **Shipyard** | `GET /api/nfts/has-badge`, `POST /api/nfts/mint` | `getHasSoulboundBadge`, `mintSoulboundBadge`, badge-service |
| **Helm** | `GET/POST /api/app-config` | `platformAppConfigClient`, game-config routes |
| **Stats / Sustain Rain** | `GET /api/stats/[address]`, `POST /api/stats/update`, `GET /api/stats/leaderboard`, `api/sustain/evaluate`, `api/sustain/claim`, `api/sustain/claimed` | `platformStatsClient`, `platformMilestonesClient` |

- **Event lifecycle (vault path):** Sustain `prepare-distribution` → Glacier `release-distribute` (build then execute) → sign/submit item/credit txs → Sustain **mark-distribution-complete**.
- **Rewards:** Use `POST /api/sustain/build-distribute` (Sustain); game admin signs and submits.
