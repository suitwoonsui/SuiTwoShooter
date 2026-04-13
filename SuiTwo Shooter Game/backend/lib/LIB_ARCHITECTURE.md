# Game ↔ Platform architecture (reference for agents)

Use this document when working on the shooter-game backend lib or platform alignment. It summarizes how the **shooter game** and **Aqueduct platform** work and how they connect.

**Related docs:** [LIB_VALIDATION_PLAN.md](./LIB_VALIDATION_PLAN.md) (validation checklist), [LIB_MOVE_PLAN.md](./LIB_MOVE_PLAN.md), [LIB_AUDIT.md](./LIB_AUDIT.md). Platform canonical design: repo root **`docs/results.md`**.

---

## Principle: game connects to platform only via API

The game connects to the platform **only via HTTP API**. All platform-backed data and operations—catalog, rewards, tournaments, stats, claims, holdings, app config, prices, badge, etc.—go through the platform’s HTTP endpoints. The game does **not** use Sonar, chain reads, or platform internals directly. The **platform** uses Sonar (and RPC) for chain reads; the game never does for these flows.

---

## Shooter game backend (this repo)

**Location:** `apps/shooter-game/backend`

- **Stack:** Next.js app with API routes under `app/api/` (tournaments, store, scores, game-config, badges, milestones, admin, platform proxy routes, etc.).
- **Config:** `config/config.ts` — Sui network, RPC, contract IDs, tokens, security. Many contract IDs are legacy; when platform is configured, catalog/rewards/events/app-config come from the platform API, not from game contract IDs.
- **Lib:** `lib/services/` — tournament, store (provisions/catalog), rewards, achievements/milestones, badge, wallet, payments (price-converter), validation, **platform client**, config, and legacy/deprecated modules.

**Single place that talks to the platform:** `lib/services/platform/client/platform-client.ts`

- **URL:** `getPlatformBackendUrl()` → env `PLATFORM_BACKEND_URL` or `NEXT_PUBLIC_PLATFORM_BACKEND_URL`; in dev with no env, defaults to `http://localhost:3000` (platform).
- **Identity:** Corridor-only. Every request sends:
  - `X-Corridor-Capability-Object-Id` (required)
  - `X-Corridor-Admin-Capability-Object-Id` when needed (e.g. catalog build, vault release)
  - `X-API-Key` (ecosystem API key from env)
- No `X-Ecosystem-Id` / `X-App-Id`; platform derives ecosystem and app from the corridor cap.
- **Helper:** `callPlatformBackend(path, options)` → `fetch(baseUrl + path, { headers })`; returns JSON or throws.

**Platform clients (all in platform-client.ts):**

| Client | Purpose | Example paths |
|--------|--------|----------------|
| **platformEventsClient** | Events/tournaments (Station) | `api/station`, `api/station/past`, `api/station/[id]`, `api/station/[id]/entries`, `api/station/[id]/submissions`, `api/sustain/events/[id]/prepare-distribution`, markRewardsDistributed, cancelEvent |
| **platformTournamentClient** | Regatta (create, enter, submit score) | `api/regatta/create`, `enter`, `submit-score` |
| **platformTxClient** | Execute signed tx (Channel) | `api/channel/execute` |
| **platformStoreClient** | Catalog read + admin build | `api/provisions/catalog`, `api/provisions/admin/catalog/build` |
| **platformGamePassClient** | Reservoir (game pass, credits, tickets) | `api/reservoir/[address]`, `api/reservoir/balance/add`, etc. |
| **platformGaugeClient** | Token USD prices | `api/gauge` |
| **platformStatsClient** | Hydroscope (stats, score submit) | stats, score submission |
| **platformAnchorClient** / **platformMilestonesClient** | Anchor claims, Aquifer definitions | claims, definitions |
| **platformInsigniaClient** | Per-wallet progression KV (Insignia) for the corridor app | `api/insignia/[address]` (GET) |

**Example flow (tournaments):** Client calls game `GET /api/tournaments` → game route uses `getTournamentService().getActiveTournaments()` → `TournamentService` calls `platformEventsClient.getUpcomingEvents()` and `platformEventsClient.getActiveEvents()` → `callPlatformBackend('api/station?status=...')` → HTTP to platform. Game does **not** use Sonar or chain for event list/get/leaderboard.

**Chain/Sonar in game:** The game backend still has a Sui client and `getSonarClient()` for legacy/deprecated paths. All platform-backed features (tournaments, catalog, rewards, stats, holdings, app config, prices, badge) use **only** the platform HTTP API when platform is configured.

---

## Aqueduct platform backend (sibling)

**Location:** `Aqueduct Platform/backend` (sibling to this repo root; `@platform/*` in game resolves to `../../Aqueduct Platform/backend/*` per validation plan, but game does not import platform code for data—only HTTP).

- **Stack:** Next.js backend with routes under `app/api/`: station, station/past, regatta (create, enter, submit-score), channel (batch, estimate, execute), reservoir (balance, holdings, merge, consume), provisions (catalog, admin/catalog/build), sustain (build-distribute, distribute, events/[id]/prepare-distribution, mark-distribution-complete), shipyard (mint, upgrade, has-badge, …), hydroscope (stats, leaderboard, update), helm (app config), gauge, glacier (vaults, add, release-distribute), aquifer (definitions), anchor (claims, sessions), estuary, sonar (balance, etc.).
- **Lib:** `lib/services/` — station (StationService), channel (batch + execute), reservoir, sustain, shipyard, hydroscope, helm, provisions, glacier, aquifer, anchor, **sonar**, corridor, ecosystem-registry, etc.

**Chain reads:** Done **inside the platform** via **Sonar** (`sonarExecute('getObject', 'getDynamicFields', …)` in `lib/services/sonar/`). Station (events) uses Sonar to read ecosystem app registry, event tables, entries, submissions. So event/tournament data is read from chain by the platform, not by the game.

**Request identity:** Station (and other routes) use corridor context from the request (corridor cap) to get `ecosystemId` and `appId`; API key is verified per ecosystem.

**Channel:** `POST /api/channel/batch` builds tx (returns bytes); `POST /api/channel/execute` accepts signed tx. Platform never signs; game (or client with game admin wallet) signs and submits.

**Platform module map (see docs/results.md):** Aquifer (definitions), Provisions (catalog), Anchor (claims), Insignia (per-wallet progression KV per app), Rain + Sustain (rewards), Reservoir (consumables repository—e.g. game-pass play credits consumed via platform APIs, not user wallet coin balances), Shipyard (badges/NFTs), Logbook (audit), Hydroscope (stats), Channel (batch + execute), Station/Regatta (events/tournaments), Helm (app config), Gauge (prices), Glacier (vaults), Terminal (store).

---

## Summary table

| Aspect | Shooter game | Aqueduct platform |
|--------|--------------|-------------------|
| **Role** | Game app backend; serves game API and frontend. | Shared platform; chain, identity, rewards, catalog, events. |
| **Connection** | Connects to platform **only via API** (HTTP). No direct Sonar/chain for platform-backed features. | Receives HTTP; uses Sonar (and RPC) for chain reads; implements Station, Channel, Reservoir, Sustain, etc. |
| **Identity** | Sends corridor cap(s) + API key. Platform derives ecosystem/app from cap. | Derives ecosystem/app from corridor cap; validates API key per ecosystem. |
| **Tournaments** | `platformEventsClient` / `platformTournamentClient` → `api/station`, `api/regatta/*`. | Station service (Sonar for events); Regatta for create/enter/submit; Sustain/Glacier for distribution. |
| **Rewards / store** | Uses `platformTxClient.executeSigned` (channel/execute) and platform sustain/event APIs. | Channel batch (e.g. sustain-build-distribute) + execute; Reservoir/Provisions/Shipyard. |

When changing lib code or adding platform-backed features, ensure the game still talks to the platform **only via API** and does not introduce direct chain or Sonar usage for those flows.
