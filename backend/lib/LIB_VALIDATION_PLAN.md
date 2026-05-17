# Lib validation & platform cleanup plan

**Goal:** Go through each file under `lib/services/` (and key `lib/` entries) one by one to confirm **validity**, **proper connection to the Aqueduct platform**, **correct inputs**, and **updates** where needed. Much of this code was written before the platform existed; this plan is a cleanup and alignment pass.

**Related docs:** [LIB_ARCHITECTURE.md](./LIB_ARCHITECTURE.md) (game ↔ platform architecture; reference for agents), [LIB_MOVE_PLAN.md](./LIB_MOVE_PLAN.md) (file moves, done), [LIB_AUDIT.md](./LIB_AUDIT.md) (purpose and deprecated notes).

**Platform reference:** In this backend, `@platform/*` resolves to `../../Aqueduct Platform/backend/*` (see `tsconfig.json`). The Aqueduct platform provides: API handler, auth, CORS, balance-checker, transaction-helpers, admin-wallet-service, platform-logger, platform-errors, platform-validators, **Gauge** (GET /api/gauge — token USD prices), Station/Regatta/Helm/Channel/Shipyard/Aquifer/etc. services, and app-config/catalog patterns.

**Game ↔ platform:** The game connects to the platform **only via API** (HTTP). All platform-backed data and operations—catalog, rewards, tournaments, stats, claims, holdings, app config, prices, badge, etc.—go through the platform’s HTTP endpoints. The game does not use Sonar, chain reads, or platform internals directly.

**Architecture (game vs platform vs Sonar):** The **game** gets all tournament/event data **only from the platform API** (Station, Regatta, EventService). The **platform** uses Sonar for chain reads where needed. Sonar is **not** exposed to the game for now; there may be a future use case to expose it.

### Platform architecture (reference)

See **`docs/results.md`** (repo root) for the canonical breakdown. Summary so game lib stays aligned:

| Layer | Platform component | Role |
|-------|--------------------|------|
| **Definitions** | **Aquifer** | Milestones, achievements, ranks/tiers (Insignia definitions), eligibility, metadata, versioning. Game admin submits from admin page → Aquifer on-chain. |
| **Definitions (items)** | **Provisions** | Item types, metadata, recipes, categories. Catalog lives here. |
| **Claims** | **Anchor** | “I did it” records: milestone/achievement completion. One canonical path; system-generated (e.g. Tide, Station, Hydroscope) or user-submitted still land in Anchor. |
| **Awarded state** | **Insignia** | Current earned set: achievement unlocked, milestone tier reached, rank applied. References Aquifer definition IDs. “Has unlocked?” may read from Insignia once platform exposes it. |
| **Rewards** | **Rain + Sustain** | Rain evaluates claim/award and produces reward intents; Sustain does idempotent issuance and audit. Reservoir (balances) or Shipyard (NFTs). |
| **Audit** | **Logbook** | Trace: claim accepted, award assigned, reward issued, retries, failures. Platform-owned; for “why didn’t I get my reward?” and debug. |
| **Stats & reporting** | **Hydroscope** | Player stats (for milestone conditions) plus roll-ups: completion rates, unlock frequency, funnel. Reads Anchor and Insignia (and possibly Logbook). |

Mental model: **Aquifer defines** → **Anchor stores claims** → **Insignia stores earned state** → **Rain + Sustain grant rewards** → **Reservoir/Shipyard hold assets**; **Logbook traces**; **Hydroscope reports**.

---

## Status (where we are)

| Section | Pass 1 done | Notes |
|---------|-------------|--------|
| **1. Platform** | ✅ All [x] | platform-client, app-config, logging, errors, validators validated. |
| **2. Config** | ✅ All [x] | game-config-service, api-base-url validated. |
| **3. Badge** | ✅ All [x] | badge-service is **platform-only** (legacy path removed). badge-queries.ts and badge-transactions.ts **removed**. Rest validated. |
| **4. Tournament** | ✅ All [x] | tournament-service (platform EventService/Regatta), scheduler, default-rewards-config, creator-reward-service, reward-cost-calculator. |
| **5. Rewards** | ✅ All [x] | rewards-service, rewards-platform-executor, batch-reward-distribution validated. |
| **6. Achievements & Milestones** | ✅ All [x] | Definitions from Aquifer only; claims via Anchor; no fallback/legacy. |
| **7. Store (catalog)** | ✅ All [x] | provisions-service, provisions, item-catalog, catalog-order validated; platform-only catalog, env documented. |
| **8. Wallet** | ✅ All [x] | Admin wallet (8.1) + user wallet connect via platform (8.2) validated. Reservoir/balance/inventory documented in 8.3. |
| **9. Payments** | ✅ All [x] | price-converter validated (platform Gauge when configured; no fallback). |
| **10. Validation** | ✅ All [x] | Replay required for submit; score-validation.ts validates server-computed score from replay. |
| **11. Legacy** | ✅ Removed | game-pass-service, store-service, store-logger, migration-logger **removed**. **leaderboard-chain.ts** removed; leaderboard is platform-only (no chain fallback). |
| **12. Shared infra** | ✅ All [x] | api-handler (lib/api/), cors, auth validated; game-owned. |

**Pass 2:** Not started. Run after Pass 1 complete: re-check validity (callers), remove/consolidate unused (e.g. badge-service-stub, discount-tiers-platform, badge-logger migration).

---

## Two-pass approach

**Pass 1 (current):** Go through each file once. For each: check validity (who uses it today?), platform connection, inputs, and apply updates. Remove or clearly deprecate what is already dead (e.g. unused re-exports, legacy services). As we remove or refactor consumers (routes, legacy code), the “who uses this?” picture will change.

**Pass 2 (after Pass 1):** Go through the list again and **re-check validity only**. Many items that looked “in use” in Pass 1 may now have fewer callers or none (e.g. after removing legacy routes, deprecated services, or consolidating on platform-only paths). In Pass 2 we:
- Re-grep or trace callers for each file.
- Remove or consolidate files that became unused.
- Shrink or delete thin re-exports whose callers were migrated to `@platform`.
- Finalize removal of legacy/deprecated modules that were only kept for a transition period.

So: **Pass 1 = validate + clean (and remove the obvious dead code). Pass 2 = re-validate validity after that cleanup, then remove or consolidate what’s no longer needed.**

---

## How to use this plan

1. **One file at a time.** Work through the tables below in order (or by priority). This is **Pass 1**.
2. **Per file, answer:**
   - **Validity:** Is it still needed? Used by routes or other lib code? If deprecated/dead, remove or document. (Pass 2 will re-check this after removals.)
   - **Platform connection:** Does it use `@platform` correctly? Should it call platform APIs (Helm, Channel, Station, etc.) instead of game-only logic? Are platform types/errors/logger used where appropriate?
   - **Inputs:** Does it get all required inputs (env, config, wallet, client) in a clear, documented way? Any missing or redundant params?
   - **Updates:** Replace deprecated patterns, switch callers to direct `@platform` imports where we still re-export, add JSDoc, align naming with platform. Remove obviously dead code.
3. **Mark done.** Use the **Done** column (e.g. `[x]` when complete).
4. **Build/test.** After each file (or each group), run the game build and fix any regressions. After completing a full section, run the build again to confirm the game is still working before moving on.
5. **After Pass 1:** Run **Pass 2** — re-check validity for every file, then remove or consolidate anything that became unused.

---

## Checklist key

| Symbol | Meaning |
|--------|--------|
| **V** | Validity (needed, used, not dead) |
| **P** | Platform connection (correct @platform use, platform APIs where appropriate) |
| **I** | Inputs (env/config/wallet/params correct and documented) |
| **U** | Updates (deprecated removed, re-exports reduced, naming aligned) |

---

## 1. Platform

| File | Purpose | V | P | I | U | Update actions | Done |
|------|--------|---|---|---|---|----------------|------|
| `services/platform/client/platform-client.ts` | Game→platform API client (Channel, Helm, Shipyard, Station, Regatta, etc.) | ✓ | ✓ | ✓ | ✓ | Confirm all platform endpoints used by game exist in platform. Replace @deprecated/legacy helpers. | [x] |

**platform-client.ts (done):** **V** In use by 40+ routes/services. **P** Correct: HTTP client to platform (PLATFORM_BACKEND_URL, corridor caps, X-API-Key); identity from cap only; one dynamic import of `@platform` in `trace()` for EventService.getSubmissions (acceptable). **I** Env documented at top; uses `getConfig()` for apiKey and catalog overrides (game `@/config/config` exists). **U** Fixed 8 stale imports from `@/lib/api/platform-client` → `@/lib/services/platform/client/platform-client` (tournaments/past, my-tournaments, platform/stats/update, admin/tournaments: remove-ticket, list-players, fix-tickets, add-tickets; store/transaction/[digest]). Left `platformTokensClient` as deprecated re-export of `platformSonarBalanceClient` (no callers found).
| `services/platform/app-config/platform-app-config.ts` | Platform app-config: packs, ticket bundles, min balance, badge config | ✓ | ✓ | ✓ | ✓ | Verify platform Helm/app-config API contract; ensure env/config inputs documented. | [x] |

**platform-app-config.ts (done):** **V** Used by game-config routes (route, admin, pack, ticket-bundle, threshold, single-game, initialize/ticket-bundles, credits, badges). **P** Reads from platform GET /api/helm; writes via Channel (app-config-set, app-config-remove) with corridor admin cap; identity from cap + API key in headers. **I** Env documented in header (PLATFORM_APP_CONFIG_URL, ECOSYSTEM_ID/APP_ID, corridor caps); uses getConfig() for network when waiting for tx; getAdminWalletService() for sign. **U** Added env summary to file header.
| `services/platform/logging/platform-logger.ts` | Re-export of platform PlatformLogger | ✓ | ✓ | — | ✓ | Thin re-export; confirm callers could use `@platform` directly and consider migrating. | [x] |

**platform-logger.ts (done):** **V** Many callers: lib (app-config, achievement-service, game-config-service, tournament-service, creator-reward-service, provisions-service, rewards*, badge*, milestones-service, milestone-level-manager, balance-checker) and app routes (game-config, game-pass, tournaments, store, scores, leaderboard, badges, admin). **P** Thin re-export from `@platform/lib/sui/platform-logger`; correct. **I** N/A (re-export). **U** No change. Pass 2: migrate callers to `@platform/lib/sui/platform-logger` (or platform’s canonical path) then remove or keep thin re-export.
| `services/platform/errors/platform-errors.ts` | Re-export PlatformError, PlatformErrorCode | ✓ | ✓ | — | ✓ | Same; prefer direct `@platform` in new code. | [x] |

**platform-errors.ts (done):** **V** Used by many routes (badges, store, tournaments, scores, game-config, game-pass, admin) and lib (tournament-service, balance-checker, platform-validators, badge-images, badge-service). badge-errors re-exports from it. **P** Defines same types as platform (mirror); some routes already use `@platform/lib/sui/platform-errors`. **I** N/A. **U** Added file header; fixed badge-errors.ts import (was broken `./platform-errors` → `@/lib/services/platform/errors/platform-errors`). Pass 2: consider re-export from @platform and migrate callers.
| `services/platform/validators/platform-validators.ts` | Re-export address/tier/input validation | ✓ | ✓ | — | ✓ | Same; prefer direct `@platform` in new code. | [x] |

**platform-validators.ts (done):** **V** Used by routes (badges, tournaments, store, scores, game-pass, admin) and lib (badge-service); badge-validators re-exports. **P** Implements same validation patterns as platform; uses game platform-errors. **I** N/A. **U** Fixed badge-validators.ts import (was broken `./platform-validators` → `@/lib/services/platform/validators/platform-validators`); added header. Pass 2: consider re-export from @platform.

---

## 2. Config

| File | Purpose | V | P | I | U | Update actions | Done |
|------|--------|---|---|---|---|----------------|------|
| `services/config/game-config/game-config-service.ts` | Game config from platform app-config (packs, ticket bundles, badge config) | ✓ | ✓ | ✓ | ✓ | Ensure it uses platform app-config API correctly; document config source. | [x] |
| `services/config/base-url/api-base-url.ts` | Base API URL for game backend (env / localhost / Vercel) | ✓ | ✓ | ✓ | ✓ | Confirm env vars and fallbacks match deployment; no platform dependency needed. | [x] |

**game-config-service.ts (done):** **V** Used by game-config route and admin (admin, ticket-bundle, threshold, single-game, pack, initialize/badges). **P** Uses platformAppConfigClient, isPlatformConfigured; reads from platform GET api/helm; platform-only when configured. **I** getConfig(), env (PLATFORM_APP_CONFIG_URL, ECOSYSTEM_ID, APP_ID) documented. **U** None needed.

**api-base-url.ts (done):** **V** Used by app/admin/utils/get-api-url and admin pages. **P** No platform dependency; game backend URL only. **I** NEXT_PUBLIC_API_BASE_URL documented in header. **U** Fixed 3 stale imports (page-old.tsx, badges/page.tsx, add-items/page.tsx): `@/lib/api-base-url` → `@/lib/services/config/base-url/api-base-url`; added env note in header.

---

## 3. Badge

| File | Purpose | V | P | I | U | Update actions | Done |
|------|--------|---|---|---|---|----------------|------|
| `services/badge/core/badge-service.ts` | Main badge service: mint, upgrade, tier, images; **platform-only** (Shipyard) | ✓ | ✓ | ✓ | ✓ | Legacy path removed; inputs explicit. | [x] |
| `services/badge/core/badge-service-stub.ts` | Optional stub (getBadge → null) when badge disabled | ⚠ | — | — | ✓ | Confirm if any route uses this; if unused, remove or document entry point. | [x] |

**badge-service.ts (done):** **V** Used by badges routes, store purchase/merge, scores/submit, reward-cost-calculator, badge-retry-queue, badge-reconciliation. **P** Platform-only: getHasSoulboundBadge, buildShipyardBadgeMint/Upgrade, getBadgeTierConfigFromPlatform, signAndSubmitViaPlatform, getSonarClient, platformStatsClient. Legacy badgeQueries/badgeTransactions removed. **I** getConfig(), getAdminWalletService(), BadgeImages. **U** Done.

**badge-service-stub.ts (done):** **V** No callers; all getBadgeService() imports point to badge-service.ts. Stub is dead code. **U** Candidate for removal in Pass 2.
| `services/badge/cache/badge-image-cache.ts` | In-memory badge image cache (TTL, size limit) | ✓ | — | ✓ | ✓ | Validity only; no platform API. | [x] |
| `services/badge/cache/badge-request-cache.ts` | In-memory badge request cache (TTL, LRU) | ✓ | — | ✓ | ✓ | Validity only; no platform API. | [x] |
| `services/badge/validation/badge-image-validator.ts` | WebP validation/sanitization for badge images | ✓ | — | ✓ | ✓ | Validity only. | [x] |
| `services/badge/validation/badge-errors.ts` | Re-export platform errors as BadgeError/BadgeErrorCode (legacy names) | ✓ | ✓ | — | ✓ | **Update:** Migrate callers to `@platform` PlatformError; then remove or keep thin re-export. Fixed import in Pass 1. | [x] |
| `services/badge/validation/badge-validators.ts` | Re-export PlatformValidators as BadgeValidators | ✓ | ✓ | — | ✓ | **Update:** Migrate callers to `@platform` PlatformValidators; then remove or keep thin re-export. Fixed import in Pass 1. | [x] |
| `services/badge/utilities/badge-logger.ts` | **@deprecated** re-export PlatformLogger as BadgeLogger | ✓ | ✓ | — | ✓ | **Update:** Replace usages with PlatformLogger in Pass 2; delete or keep single re-export. | [x] |
| `services/badge/utilities/badge-utilities.ts` | calculateTierFromGames, getDiscounts (store + gameplay) | ✓ | ✓ | ✓ | ✓ | Ensure discount/tier logic aligns with platform Shipyard/badge contract. | [x] |
| `services/badge/utilities/discount-tiers-platform.ts` | getDiscounts (gameplay only); possibly dead | ⚠ | — | — | ✓ | **Validity:** No imports found; remove or fold into badge-utilities in Pass 2. | [x] |
| `services/badge/retry/badge-retry-queue.ts` | Retry queue for failed badge updates (backoff) | ✓ | ✓ | ✓ | ✓ | Validity; ensure it receives required deps (logger, client). | [x] |
| `services/badge/reconciliation/badge-reconciliation.ts` | Background reconciliation of badge state | ✓ | ✓ | ✓ | ✓ | Validity; platform alignment for state source. | [x] |
| ~~`services/badge/transactions/badge-transactions.ts`~~ | **Removed.** Badge flow is platform-only. | — | — | — | — | — | — |
| `services/badge/images/badge-images.ts` | Badge image loading, URLs, chunked upload | ✓ | ✓ | ✓ | ✓ | Validity; platform asset/upload contract if any. | [x] |
| ~~`services/badge/queries/badge-queries.ts`~~ | **Removed.** Badge flow is platform-only. | — | — | — | — | — | — |

---

## 4. Tournament

| File | Purpose | V | P | I | U | Update actions | Done |
|------|--------|---|---|---|---|----------------|------|
| `services/tournament/core/tournament-service.ts` | Create, enter, submit score, leaderboard, distribution; Station/Regatta | ✓ | ✓ | ✓ | ✓ | Primary path: platform (EventService, RegattaExtensionService, platformTournamentClient, platformEventsClient). Some @deprecated methods remain for legacy; Pass 2 can migrate. | [x] |
| `services/tournament/scheduler/tournament-scheduler.ts` | Schedules reward distribution after grace period | ✓ | ✓ | ✓ | ✓ | Uses getTournamentService().distributeRewards() (platform path). No direct platform Channel; queue + tournament-service. | [x] |
| `services/tournament/rewards-config/default-rewards-config.ts` | Default tournament reward config (file + system defaults) | ✓ | — | ✓ | ✓ | File + system defaults; used by default-sustain-config routes and tournament creation. No platform API. | [x] |
| `services/tournament/creator/creator-reward-service.ts` | Creator reward calculation (boost, break-even) | ✓ | ✓ | ✓ | ✓ | Uses getTournamentService() (platform); getAdminWalletService(); priceConverter (Gauge when platform configured) for distribution. | [x] |
| `services/tournament/cost/reward-cost-calculator.ts` | Tournament reward cost (items, discounts, badge) | ✓ | ✓ | ✓ | ✓ | Uses getProvisionsSync, getItemPriceSync (catalog), getBadgeService, getDiscounts. Platform catalog + badge. | [x] |

**tournament-service.ts (done):** **V** Used by tournaments/* and admin/tournaments/* routes (create, enter, submit-score, leaderboard, distribute, etc.). **P** EventService, RegattaExtensionService from @platform; platformTournamentClient, platformEventsClient, platformTxClient from platform-client. Create/enter/submit/list/get/leaderboard use platform API only. **I** getConfig(), getAdminWalletService() (lazy, backward compat). **U** Dead code removed: getParticipantCount, getActiveTournamentsOld, getPlayerEnteredTournamentsOld, buildUpdateScoreTransaction, createTournamentOld.

**tournament-scheduler.ts (done):** **V** Used by notify-created and admin/tournaments/scheduler. **P** Triggers distribution via getTournamentService().distributeRewards() (platform path). **I** getTournamentService() only. **U** None.

**default-rewards-config.ts (done):** **V** Used by admin default-sustain-config and initialize routes. **P** N/A (file + system defaults). **I** process.cwd(), data/default-rewards-config.json. **U** None.

**creator-reward-service.ts (done):** **V** Used by distribute-creator-reward, creator/[address]/rewards, admin distribute-rewards. **P** Tournament data from tournament-service (platform). **I** getTournamentService(), getAdminWalletService(), priceConverter. **U** None.

**reward-cost-calculator.ts (done):** **V** Used by tournament-service, tournaments/create, calculate-reward-cost, admin create. **P** getProvisionsSync, getItemPriceSync (platform catalog); getBadgeService, getDiscounts. **I** Catalog and badge service. **U** None.

### Tournament flow (how it works)

| Flow | Implementation |
|------|----------------|
| **Create** | `createTournament()` → `platformTournamentClient.createTournament()` only (no chain path). Phases: gas payment, vault create (admin signs), event create (admin signs). |
| **List active/upcoming/past** | `getActiveTournaments()`, `getUpcomingTournaments()`, `getPastTournaments()` → `platformEventsClient.getUpcomingEvents/getActiveEvents/getPastEvents(appId)`. No fallback to old contract. |
| **Get one** | `getTournament(objectId)` → `eventService.getEvent(objectId)` (platform). |
| **Enter** | `enterTournament()` → `platformTournamentClient.enterTournament()`. |
| **Submit score** | Route builds via Channel batch (`regatta-submit-score`), admin signs and executes via POST /api/channel/execute. No legacy updateTournamentScore. |
| **Leaderboard** | `getTournamentLeaderboard()` → `eventService.getSubmissions()` only (platform). No chain fallback; returns error if platform fails. |
| **Player’s entered list** | `getPlayerEnteredTournaments()` → `eventService.getActiveEvents` + `eventService.getEventEntries()`; participation from entries (participant/address). No _readClient; platform-only. |
| **Distribution** | Scheduler calls `tournamentService.distributeRewards(tournamentId, objectId)`; distribution uses platform Sustain/Glacier (build-distribute, release, etc.). |

**Removed (dead code):** `getParticipantCount`, `getActiveTournamentsOld`, `getPlayerEnteredTournamentsOld`, `buildUpdateScoreTransaction`, `createTournamentOld` have been removed from tournament-service. No fallbacks; game uses platform API only.

### Tournament: list, get-one, Sonar, and reads

| Question | Answer |
|----------|--------|
| **Does the list use the Sonar module in the platform?** | **No (in the game).** The list uses the **platform Station HTTP API** (`api/station`, `api/station/past`). The game calls `platformEventsClient.getUpcomingEvents/getActiveEvents/getPastEvents` → `callPlatformBackend(…)`. Whether the **platform** backend uses Sonar internally for Station is a platform implementation detail. |
| **What is get-one tournament for?** | **Get one event/tournament by object ID.** Used by: GET `/api/tournaments/[id]`, leaderboard (to get category), submit-score (to validate tournament and category), admin delete, creator-reward, notify-created. Implementation: `eventService.getEvent(objectId)` → platform Station API (GET `api/station/{eventObjectId}`). |
| **Is platformTournamentClient.enterTournament() platform or game file?** | **Game file.** It lives in the game repo at `lib/services/platform/client/platform-client.ts`. It is the **game’s** HTTP client that calls the **platform** backend (e.g. `POST api/regatta/enter`). So: game-owned wrapper, platform-implemented API. |
| **Do we need to review submit score?** | Submit score is **Channel-only**: route calls `buildBatchViaChannel('regatta-submit-score', …)`, admin signs, then `platformTxClient.executeSigned`. Validation and errors are returned (no fallback). |
| **Does the leaderboard use Sonar? Are all reads via Sonar?** | **Game gets data only from platform.** Leaderboard is `eventService.getSubmissions()` only (no _readClient fallback). getTournament is `eventService.getEvent()` only (no old-contract fallback). getPlayerEnteredTournaments uses only `getEventEntries()` (no chain reads). Sonar is used by the **platform**; the game does not use Sonar for tournament/event data.  The platform Sonar API does **not** expose `queryEvents`. In tournament-service, **`this.client.queryEvents`** is only used in one place (e.g. getTournamentsByIds only (My Tournaments)). Tournament/event data from platform only. So: object/transaction/dynamic-field reads can go through Sonar; **event queries** go direct RPC. To have “all reads via Sonar,” the platform would need to expose queryEvents via Sonar, or the game would need to stop using queryEvents for those flows. |
| **No fallbacks** | **Done.** No chain fallbacks: getTournament, getTournamentLeaderboard, getPlayerEnteredTournaments use only platform API. getPlayerRank uses getTournament().participants (platform) for totalParticipants. On failure, return `{ success: false, error }`. |

### Tournament: required fields (game → platform)

| Flow | Game sends | Platform expects | Notes |
|------|------------|------------------|--------|
| **Create** | name, **category** (e.g. highestScore, totalCoins), startTime, endTime, entryFeeTickets, ticketValueUSDCents, startingAnteUSDCents, rewardConfig, rewardToken, rewardTokenTypeId, createdBy, appId, appAdminAddress, (phases: gas, vault, create_event sigs) | Same; category required and validated. Optional: competitionType (default all-vs-all), participationMode (default individual). | **Tournament type:** Platform infers event type = tournament from endpoint (api/regatta/create) and Move target create_tournament_event_corridor. Game does not send eventType; not needed. **Category** is sent so platform knows how to rank (score/distance/coins/etc.). |
| **Enter** | tournamentObjectId, playerAddress, ticketId, appId? | Same. | OK. |
| **Submit score** | tournamentObjectId, playerAddress, **sessionId**, submission (category u8, value, score, …), appId? | sessionId, tournamentObjectId, submission (category, value, …). | Game sends sessionId; route builds via Channel batch (`regatta-submit-score`), admin signs and submits via POST /api/channel/execute; digest from execute response. |

**Summary:** Create and enter send the required fields; **category** (tournament type for ranking) is sent on create. Submit score sends **sessionId** and uses Channel batch + execute (game gets digest from execute).

---

## 5. Rewards

| File | Purpose | V | P | I | U | Update actions | Done |
|------|--------|---|---|---|---|----------------|------|
| `services/rewards/core/rewards-service.ts` | Reward calculation and distribution via platform build-distribute | ✓ | ✓ | ✓ | ✓ | **P:** Ensure Channel sustain build-distribute is sole path; **U:** remove deprecated tokenRewardMewsAmount in favor of tokenRewardAmount. | [x] |
| `services/rewards/executor/rewards-platform-executor.ts` | Signs/submits reward tx via platform execute (admin wallet) | ✓ | ✓ | ✓ | ✓ | **P:** Confirm platform execute API and wallet usage; **I:** env/wallet/config. | [x] |
| `services/rewards/batch/batch-reward-distribution.ts` | Batch distribution via Channel sustain-build-distribute + sign/submit | ✓ | ✓ | ✓ | ✓ | **P:** Align with platform batch API; **I:** document inputs. | [x] |

**rewards-service.ts (done):** **V** Used by admin distribute-rewards route and tournament submit-score flow; calculateTournamentRewards + distributeTournamentRewards. **P** Channel sustain-build-distribute only (batch path only; no fallback). **I** File header documents getConfig(), priceConverter, platform-client, executor. **U** Removed tokenRewardMewsAmount; single path via batch only; no backward compat or fallbacks.

**rewards-platform-executor.ts (done):** **V** Used by rewards-service, batch-reward-distribution, achievement-service, creator-reward-service. **P** platformTxClient.executeSigned (POST /api/channel/execute); game admin wallet signs. **I** Header documents PLATFORM_BACKEND_URL, ECOSYSTEM_ID, APP_ID; getAdminWalletService (GAME_WALLET_PRIVATE_KEY). **U** None.

**batch-reward-distribution.ts (done):** **V** Used by rewards-service when useBatch true. **P** buildBatchViaChannel('sustain-build-distribute', …) then signAndSubmitRewardTransactions; aligned with platform batch API. **I** Header documents distributions, tournamentId, ecosystemId, adminWalletAddress; corridor from env. **U** None.

---

## 6. Achievements & Milestones

### Design (achievements & milestones)

| Concern | Intended design | Implied changes |
|--------|------------------|------------------|
| **Definitions** | Come from the **admin page**, submitted on-chain to **Platform Aquifer**. No fallback/legacy. | Game reads definitions **only** from platform Aquifer API (GET list/key). Remove in-memory fallback, remove chain reads from game contract for definitions. Admin page already has initialization; it should call platform to build Aquifer set-definition tx(s), game admin signs and submits. |
| **Stats** | **Player stats** (totalGames, bestScore, bestDistance, etc.) — the metrics that milestone **conditions** are compared against (e.g. `totalGames >= 5`). | Platform **Hydroscope** is the source: GET `/api/hydroscope/[address]` / `platformStatsClient.getStats()`. Game uses platform stats when configured; no change to meaning. |
| **Claims** | Stored **via Anchor** (platform). **Game admin signs and pays** (not the player). | Replace in-memory claim tracking with Anchor: game backend submits submit_claim with game's corridor cap and session; payload includes playerAddress and definitionId. Set **GAME_ANCHOR_SESSION_ID** (session where game admin is participant). List claimed via GET claims with participant = game address and **payloadPlayerAddress** = player address. |
| **Management** | Milestones and achievements are managed by the **game admin**; initialization for both exists on the admin page. | Keep admin page as owner of definitions and init; ensure it uses platform Aquifer for submit (build tx → sign → submit). |

| File | Purpose | V | P | I | U | Update actions | Done |
|------|--------|---|---|---|---|----------------|------|
| `services/achievements/core/achievement-service.ts` | Milestones/achievements: definitions, eligibility, claim; Aquifer/Stats + Anchor | ✓ | ✓ | ✓ | ✓ | **P:** Definitions from platform Aquifer only (no fallback, no game-contract definition read). Stats from platform Hydroscope. Claims via Anchor (getClaimedMilestoneIdsFromAnchor). **U:** Removed milestoneDefinitionsFallback and on-chain definition/claim paths. | [x] |
| `services/achievements/level/milestone-level-manager.ts` | Milestone level from threshold ordering | ✓ | — | ✓ | ✓ | Validity; used by achievement-service and admin. No platform API. | [x] |
| `services/achievements/milestones/milestones-service.ts` | Aquifer definitions, claim tracking, Channel build params | ✓ | ✓ | ✓ | ✓ | **P:** Definitions from platform Aquifer only. **Claims:** Anchor only (getClaimedMilestoneIdsFromAnchor; recordClaimed no-op; isAlreadyClaimedAnchor). **I:** platformAnchorClient, platformStatsClient, platformMilestonesClient. | [x] |

**Channel usage (definitions and claims):** Both flows use **Channel for batching (build) and processing (execute)**. The platform exposes batch operationIds so the game can build via Channel as well as execute via Channel:

- **Definitions (Aquifer):** Build via **POST /api/channel/batch** with `operationId: 'aquifer-set-definition'` and params `{ key, value (base64), corridorAdminCapabilityObjectId, adminWalletAddress }`, or via **POST /api/aquifer/definitions**. Then admin signs and submits via **POST /api/channel/execute**.
- **Claims (Anchor):** Build via **POST /api/channel/batch** with `operationId: 'anchor-submit-claim'` and params `{ sessionId, claimType, payload, corridorCapabilityObjectId, gasOwnerAddress? }`, or via **POST /api/anchor/claims**. **Game admin signs and pays:** the game uses its corridor cap and session (`GAME_ANCHOR_SESSION_ID`), passes `gasOwnerAddress` = admin so the admin wallet pays gas, and submits via **POST /api/channel/execute**. List claims for a player: GET claims with `participant` = game admin address and `payloadPlayerAddress` = player address (game-submitted claims store `playerAddress` in payload).

---

## 7. Store (catalog)

### 7.1 How the platform is set up

| Layer | Platform implementation |
|-------|-------------------------|
| **Definitions (Provisions)** | **Provisions** stores item types and metadata (per docs/results.md). Catalog is **per (ecosystemId, appId)**. |
| **Read path** | Platform reads catalog from **chain via Sonar**: `getCatalogFromChain(ecosystemId, appId)` in `lib/services/provisions/catalog/provisions-catalog.ts`. Uses ecosystem config `provisionsRegistry` (ProvisionsRegistryV2) → apps table (keyed by AppScope) → AppCatalog → items table → item definitions with levels. Returns `CatalogShape`: `Record<itemId, { id, name, description, category, icon, levels }>`. Item type map: extraLives, forceField, orbLevel, slowTime, destroyAll, bossKillShot, coinTractorBeam (0–6). Categories: defensive, offensive, tactical, utility (0–3). |
| **GET catalog API** | **GET /api/provisions/catalog**. Requires ecosystemId, appId (from request context; platform may derive from Corridor cap), API key for ecosystem, and Corridor cap + ECOSYSTEM_APP_REGISTRY_OBJECT_ID. Returns `{ success: true, catalog }`. |
| **Admin build API** | **POST /api/provisions/admin/catalog/build**. Builds tx only; game signs and pays. Actions: `set_definition`, `set_level`, `set_status`, `remove_level`, `batched_init`. Requires CorridorAdminCap, API key, catalogSender (0x address), optional catalogPackageId/catalogRegistryId when app has its own registry. Platform uses ecosystem config PROVISIONS_PACKAGE_ID_*, PROVISIONS_REGISTRY_ID_* unless overridden by body. |
| **Config (platform)** | Ecosystem registry has `provisionsRegistry`, `provisionsPackageId`, `provisionsAdminCap` (or appAdminCapId for Corridor). Catalog is isolated per app. |
| **Player holdings** | **Reservoir** (platform) is the source for a player's holdings: credits, tickets, inventory. **GET /api/reservoir/[address]** returns balance and item count; **GET /api/reservoir/holdings/[address]** returns per-player balance and inventory state (e.g. extraLives_1, forceField_2). The **platform** uses **Sonar** internally (terminal-service, reservoir-service) to read chain when serving these APIs. The **game** does not use Sonar: game gets holdings **only through Reservoir API** (no direct Sonar or chain read). No fallback. |

### 7.2 What the game has

| Component | Game implementation |
|-----------|---------------------|
| **provisions-service.ts** | **Read:** When platform configured, uses `platformStoreClient.getCatalog()` only (no chain read in game). When platform not configured, returns error (no chain fallback). **Build (admin):** Builds tx locally with game’s SuiClient and config (`contracts.provisionsRegistry`, `provisionsAdminCap`, `provisionsPackageId` or `gamePackage`) — direct Move calls to `provisions::admin_set_item_definition`, `admin_set_item_level`, etc. Uses game’s package and registry IDs. |
| **provisions.ts** | **getProvisions():** Platform only via getProvisionsService().getCatalog(). **No fallback:** if platform fails or not configured, return error or empty; do not fall back to chain or static catalog. **DEFAULT_PROVISIONS_SEED** = init data only, not a runtime catalog fallback. getProvisionsSync() = cache or `{}`. |
| **Player holdings** | Game gets credits, tickets, inventory **only through Reservoir API** (GET reservoir/[address], GET reservoir/holdings/[address]) via platform-client. **Game does not use Sonar** to get holdings; Sonar is used by the platform when it serves Reservoir. No chain read in game; no fallback. |
| **platform-client.ts** | `platformStoreClient.getCatalog()` → GET api/provisions/catalog. `platformStoreClient.buildCatalogAdmin()` → POST api/provisions/admin/catalog/build. Reservoir client for player balance/holdings. |
| **item-catalog.ts** | Re-exports StoreItem, ItemLevel, ProvisionsCatalog from provisions.ts; CATALOG_ITEM_ORDER from catalog-order.ts. |
| **catalog-order.ts** | CATALOG_ITEM_ORDER: extraLives, forceField, orbLevel, coinTractorBeam, slowTime, destroyAll, bossKillShot. Display order only. |

### 7.3 Gaps and changes needed to align with platform

| Gap | Current game behavior | Target (align with platform) |
|-----|------------------------|------------------------------|
| **Catalog read** | Platform-only when configured; error when not. | **Done.** No fallback. Document: game never reads catalog from chain; platform is single source when configured. |
| **Player holdings** | Game must get credits, tickets, inventory from Reservoir. | **Reservoir only; no Sonar in game.** Use platform Reservoir API (GET reservoir/[address], GET reservoir/holdings/[address]) for player holdings. Platform uses Sonar internally to serve Reservoir; game never calls Sonar. No chain read for holdings; no fallback. |
| **Admin catalog updates (set_definition, set_level, etc.)** | Game builds tx **locally** using game config (provisionsRegistry, provisionsAdminCap, provisionsPackageId) and game’s Move package. | **Align:** Prefer **platform build API** (POST api/provisions/admin/catalog/build) so platform owns the build and config (registry, package). Game calls `platformStoreClient.buildCatalogAdmin()`, signs and submits the returned tx. Only use game-local build if platform is not configured or if we explicitly keep a “game-owned registry” path. |
| **Admin catalog updates** | Game builds tx locally with game config. | **Align:** Use **platform build API** (buildCatalogAdmin) when platform configured; game signs and submits. Do not fall back to local build when platform is configured. Local build only when platform not configured. No fallback. |
| **DEFAULT_PROVISIONS_SEED / batched_init** | Used for “Initialize catalog” flows; game can build batched_init locally or via platform buildCatalogAdmin({ action: 'batched_init', items }). | Prefer platform buildCatalogAdmin for batched_init so catalog is written to the same registry the platform reads from. DEFAULT_PROVISIONS_SEED stays as data source for the items array; build happens on platform. |
| **getVersion()** | provisions-service.getVersion() reads **chain** (game’s provisionsRegistry via getSonarClient). | Either remove getVersion() if version is not used, or get version from platform if it exposes it (platform currently does not expose catalog version in GET catalog response). Otherwise document as “game-only chain read when platform configured” or deprecate. |
| **getVersion()** | provisions-service.getVersion() reads chain (game registry). | Remove, or get from platform if it exposes version, or deprecate. No fallback. |

**Summary:** **No fallback.** Catalog read = platform only. Player holdings = Reservoir (platform) only. Admin catalog writes = platform build + game sign when configured; local build only when platform not configured. DEFAULT_PROVISIONS_SEED = init data only, not a catalog fallback.

| File | Purpose | V | P | I | U | Update actions | Done |
|------|--------|---|---|---|---|----------------|------|
| `services/store/catalog/provisions-service.ts` | Terminal item definitions; catalog from platform only | ✓ | ✓ | ✓ | ✓ | **P:** Catalog read: platform only, no fallback (done). **P:** Catalog admin: use platform buildCatalogAdmin when configured; no fallback to local build. Local build only when platform not configured. **I:** Document env (corridor cap, admin cap for platform build). **U:** getVersion: remove or deprecate (no chain read for catalog path). | [x] |
| `services/store/catalog/provisions.ts` | getProvisions(), getProvisionsSync(); catalog + init data | ✓ | ✓ | ✓ | ✓ | **P:** Catalog from platform only; no fallback (no chain, no DEFAULT_PROVISIONS_SEED as runtime catalog). getProvisions() must not fall back to chain or static catalog on failure. DEFAULT_PROVISIONS_SEED = init data only. **U:** Remove any "try platform then chain then empty" fallback; single source = platform. | [x] |
| `services/store/catalog/item-catalog.ts` | Re-exports StoreItem, ItemLevel, ProvisionsCatalog, CATALOG_ITEM_ORDER | ✓ | — | — | ✓ | Re-exports align with platform catalog shape. No change. | [x] |
| `services/store/catalog/catalog-order.ts` | CATALOG_ITEM_ORDER (display order for items) | ✓ | — | — | ✓ | Display order only; platform has no order. No change. | [x] |

**provisions-service.ts (done):** **V** Used by provisions.ts, store routes (items, admin catalog, initialize), reward-cost-calculator. **P** getCatalog() platform-only when configured (no chain fallback); getVersion() deprecated when platform on (returns 0); build* methods for local-only when platform not configured; store admin uses Channel/buildCatalogAdmin. **I** Env documented in header (PLATFORM_BACKEND_URL, ECOSYSTEM_ID, APP_ID, corridor cap, CORRIDOR_ADMIN_CAP_OBJECT_ID_* for catalog build). **U** getVersion deprecated; header env note added.

**provisions.ts (done):** **V** Used by getProvisionsService(), store, reward-cost-calculator, item-catalog re-exports. **P** getProvisions() uses getProvisionsService().getCatalog() only; on failure returns {} (no DEFAULT_PROVISIONS_SEED as runtime catalog). DEFAULT_PROVISIONS_SEED comment: init data only. **U** Header updated: "Catalog from platform only; no fallback."

**item-catalog.ts (done):** **V** Re-exports from provisions and catalog-order. **U** None.

**catalog-order.ts (done):** **V** Display order constant; used by provisions-service sortCatalogByOrder, item-catalog. **U** None.

### 7.4 Implementation (phases completed)

- **Phase 1:** Removed catalog fallback. `provisions.ts` getProvisions() now uses only getProvisionsService().getCatalog() (platform path); no chain or static fallback. DEFAULT_PROVISIONS_SEED comment: init data only, not runtime fallback. provisions-service header: platform-only when configured, no fallback.
- **Phase 2:** Store admin already uses Channel (buildBatchViaChannel with catalog-set-definition, catalog-set-level, catalog-batched-init). No routes call provisions-service build* methods. JSDoc added: when platform configured, prefer platform build.
- **Phase 3:** getVersion() deprecated; when platform configured returns version 0 (no chain read). When platform not configured, still reads from chain (legacy).
- **Phase 4:** Audit: player holdings (inventory, credits, tickets, game-pass status) go through platformInventoryClient or platformGamePassClient (platform Reservoir API). No game-side Sonar for holdings. platform/tokens/balance uses platformSonarBalanceClient (platform API). Direct getSonarClient in game is only legacy (old milestones, query-old-tickets) and provisions getVersion (deprecated when platform on).

### 7.5 Provisions when platform is always configured (discussion)

If the game is **always** connected to the platform, the following in `provisions-service.ts` become optional to simplify or remove:

| Item | Current behavior | Options |
|------|------------------|--------|
| **getVersion()** | When platform configured → returns `{ success: true, version: 0 }` (no chain read). When platform not configured → reads chain (provisionsRegistry). | **Option A:** Keep as-is (no change; when platform on, no chain read). **Option B:** Simplify to always return `{ success: true, version: 0 }` and delete the chain-read branch, so no SuiClient/getSonarClient usage for version. Only do B if no caller relies on a real version from chain when platform is off. |
| **build* methods** (e.g. `buildUpdateItemDefinitionTransaction`, `buildSetItemLevelTransaction`, batched_init helpers) | Documented as “use only when platform not configured”; store admin routes use **Channel** (`buildBatchViaChannel` / `platformStoreClient.buildCatalogAdmin`) and do **not** call these methods. | **Option A:** Leave as dead code for “platform not configured” (no route uses them; admin always goes through Channel). **Option B:** Remove the build* methods from provisions-service and drop the “when platform not configured” catalog-build path entirely, so catalog admin is platform-only. |

**Recommendation:** If you never run without platform, **Option B for getVersion** removes the last chain read in provisions (cleaner). **Option B for build*** removes dead code and makes catalog admin strictly platform-only; only do it after confirming no external or future use of “game-local catalog build.”

---

## 8. Wallet

**Two parts:** (1) **Admin wallet** — game backend’s own keypair for signing (rewards, badges, store, app-config). (2) **User wallet services** — **wallet connect** for apps, games, and utilities **via the platform** (so users can connect their wallets to the game/app; the platform provides the wallet-connect config and module). Both must be validated. *(Player balance, credits, inventory (Reservoir/Sonar) are separate; those use platformGamePassClient, platformInventoryClient, platformSonarBalanceClient.)*

### 8.1 Admin wallet (game-owned)

| File | Purpose | V | P | I | U | Update actions | Done |
|------|--------|---|---|---|---|----------------|------|
| `services/wallet/admin/admin-wallet-service.ts` | Game admin wallet: keypair, sign, Sui clients (game-specific) | ✓ | ✓ | ✓ | ✓ | **P:** Game-specific intentional (not replacing platform wallet). **I:** env for keypair, network. | [x] |
| ~~`services/wallet/admin/admin-wallet-service-base.ts`~~ | **Not present.** Was optional re-export of platform AdminWalletService. | — | — | — | — | No file in repo; game uses GameAdminWalletService only. | — |
| `services/wallet/transaction-helpers/transaction-helpers.ts` | Game-owned tx execution helpers (executeTransactionWithFinalization, etc.) | ✓ | — | ✓ | ✓ | Game implementation; used by achievement-service, tournament-scheduler. | [x] |
| `services/wallet/balance/balance-checker.ts` | Game-owned balance checks (gas, payment, token purchase) | ✓ | — | ✓ | ✓ | Uses SuiClient.getBalance; PlatformError/PlatformLogger. | [x] |
| `services/wallet/payments/payment-transaction-builder.ts` | Builds payment tx (SUI/MEWS/USDC), balance, gas | ✓ | — | ✓ | ✓ | For game-built payment tx; platform Channel used for many store/tournament payments. **I:** getConfig(), balance-checker, client. | [x] |

**Admin-wallet notes (kept):** admin-wallet-service used by badge-service, tournament-service, creator-reward-service, rewards-platform-executor, achievement-service, platform-app-config, provisions-service, legacy. transaction-helpers, balance-checker, payment-transaction-builder validated as game-owned.

### 8.2 User wallet services (wallet connect via platform)

**User wallet system** = **wallet connect** for apps, games, and utilities **via the platform**. The platform provides the config (network, rpcUrl, walletModuleUrl, storageKey) so the app/game can load the wallet module and let **users connect their wallets**; the game should use the platform for this, not a game-owned wallet-connect stack.

| Platform | Role |
|----------|------|
| **Estuary** (api/estuary/connect) | GET returns **wallet connect config**: network, rpcUrl, walletModuleUrl, storageKey. Frontend uses this to load the wallet module and initialize connect/disconnect/signing for user wallets. |

| Game surface | Purpose |
|---------------|---------|
| **platformConfigClient.getConfig()** | Calls platform **api/estuary/connect**; returns network, rpcUrl, walletModuleUrl, storageKey. |
| **GET /api/config** | Proxies platformConfigClient.getConfig(); overrides storageKey to `game-admin-wallet` so game admin UI doesn’t overwrite platform admin wallet. |
| **GET /api/platform/config** | Proxies platformConfigClient.getConfig() (no storageKey override). |
| **Frontend** (e.g. useWalletConnection) | Fetches config from game API (which proxies platform), loads wallet module from walletModuleUrl, initializes with storageKey. |

| Item | V | P | I | U | Update actions | Done |
|------|---|---|---|---|----------------|------|
| Wallet connect config from platform (api/estuary/connect) | ✓ | ✓ | ✓ | ✓ | **V:** Game uses platformConfigClient → api/estuary/connect for wallet connect config. **P:** No game-owned wallet-connect config when platform is used; config (walletModuleUrl, etc.) from platform only. **I:** buildPlatformCallOptions when calling platform. | [x] |
| Game routes expose platform wallet config | ✓ | ✓ | ✓ | ✓ | **V:** GET /api/config and GET /api/platform/config proxy to platform; frontend gets walletModuleUrl/storageKey from platform via game proxy. **P:** Game does not serve its own WALLET_MODULE_URL when platform is configured. | [x] |
| Frontend uses platform-driven wallet connect | ✓ | ✓ | ✓ | ✓ | **V:** Admin/frontend loads wallet module from URL provided by platform (via game proxy); storageKey separates game-admin vs platform-admin. **P:** Wallet connect flow is platform-driven. | [x] |

**Wallet connect (8.2) done:** **V** platformConfigClient.getConfig() calls callPlatformBackend('api/estuary/connect'). GET /api/config and GET /api/platform/config use platformConfigClient only (game fallback to env WALLET_MODULE_URL is commented out). **P** Config (walletModuleUrl, network, rpcUrl, storageKey) from platform only when routes are used. **I** ecosystemId from request for /api/config; buildPlatformCallOptions. **U** None. Frontend (useWalletConnection) fetches getApiUrl('api/config') → game proxy → platform estuary/connect; loads script from walletModuleUrl, initializes with storageKey ('game-admin-wallet' from game proxy).

**Section 8 complete when:** Admin wallet (8.1) validated **and** user wallet services = wallet connect via platform (8.2) validated. ✓ Both done.

### 8.3 Reservoir / balance / inventory (player data from platform)

**Where they live:** All in **`lib/services/platform/client/platform-client.ts`**. There are no separate lib/services/wallet files for these.

| Client | Purpose | Platform API | Plan coverage |
|--------|--------|--------------|----------------|
| **platformGamePassClient** | Game pass status, credits, tickets (Reservoir) | api/reservoir/[address], balance/add\|set\|remove\|consume, admin tickets, **terminal-purchase-balance** (Channel batch), fixTickets, getReservoirStatus | Section 7 (Store) “Player holdings”; Platform modules table (Reservoir); Legacy §11 (game-pass-service unused, app uses platformGamePassClient). |
| **platformInventoryClient** | Player inventory/holdings (Reservoir) | api/reservoir/holdings/[address]; adminAddItems, buildConsumeItems | Section 7 (Store) “Player holdings”; Platform modules table (Reservoir); Legacy §11 (store-service unused, app uses platformInventoryClient). |
| **platformSonarBalanceClient** | Player token balance (platform Sonar) | api/sonar/balance/[address] | Section 7 Phase 4 audit; used by GET platform/tokens/balance/[address]. |

**Validation (8.3 checked):** See checklist and gaps below.

| Item | Status | Notes |
|------|--------|-------|
| **Inventory** (player holdings) | [x] Platform only | All routes use **platformInventoryClient**: `store/inventory/[address]`, `inventory/[address]`, `store/admin/add-items`, `admin/inventory/add-items`. No chain read for inventory. |
| **Item consume** (mid-game) | [x] Channel | **POST /api/inventory/consume** (Channel batch `reservoir-consume-items`); admin signs and submits via execute. Store consume (**POST /api/store/consume**) deprecated (410); use inventory/consume. |
| **Token balance** (player Sonar) | [x] Platform only | GET `platform/tokens/balance/[address]` uses **platformSonarBalanceClient.getBalance**. No other balance reads in app API. |
| **Game pass / credits / reservoir status** | [x] Mostly platform | **platformGamePassClient** used by: `game-pass/[address]`, `game-pass/consume-credit`; tournaments (route, past, my-tournaments, enter for tx); admin game-pass (credits add/set/remove, tickets add, fix-tickets); admin game-pass ticket-info (getReservoirStatus); admin credits/list-players; admin tournaments (list-players, add-tickets, remove-ticket, fix-tickets). |

**Legacy reference (all migrated):** The items below were the only app-route callers of **GamePassService** (`lib/services/legacy/deprecated/game-pass-service.ts`). That service talks to the **game’s chain** (Sui RPC + game_pass contract). The **new path** is the **platform** (HTTP to platform backend → Reservoir/Sonar). All four have been migrated to the platform (see conclusion below).

| # | Route | What legacy does | New path (platform) | How to migrate |
|---|--------|-------------------|---------------------|-----------------|
| 1 | **admin/game-pass/list-players** | `getGamePassService().listAddressesWithGamePass()` then per-address `getGamePassStatus(address)` (chain read). Returns `{ players: [{ address, gamesRemaining, isActive, packType?, ticketCount? }] }`. | **platformGamePassClient.listPlayers(options)** → `GET api/admin/reservoir/list-players`. Same shape: `players[]` with address, gamesRemaining, isActive, packType, ticketCount. | Replace GamePassService with **platformGamePassClient.listPlayers(buildPlatformCallOptions(request))**. See **admin/credits/list-players** and **admin/tournaments/list-players** for examples (they already use platform). Add auth (e.g. X-Admin-Wallet) if needed. |
| 2 | **admin/game-pass/discover-wallets** | `getGamePassService().listAddressesWithGamePass()` (chain read). Returns `{ wallets: address[], count }`. | Platform has **listPlayers** (addresses + status). No separate “discover wallets” endpoint documented. | Option A: Use **platformGamePassClient.listPlayers()** and map `result.players` to `wallets = result.players.map(p => p.address)`. Option B: If platform adds a “list addresses only” endpoint, switch to that. Remove GamePassService import. |
| 3 | **tournaments/enter** | When `ticketId` is not provided: `getGamePassService().getAvailableTicketIds(playerAddress)` (chain read) to get numeric ticket IDs, then picks one for the entry tx. | **platformGamePassClient.getReservoirStatus()** returns `itemCount` but **platform does not expose ticket IDs** (per platform-client comment: “item/ticket IDs or details are game-specific”). | If platform adds an API that returns ticket (or item) IDs for a player, call that instead of getAvailableTicketIds. Until then, either keep this one chain read for ticket IDs, or require the client to always send `ticketId` (if the client can obtain it from elsewhere). |
| 4 | **admin/tournaments/ticket-info** | **platformGamePassClient.getReservoirStatus()** for status (already platform). Then **getGamePassService().getAvailableTicketIds(playerAddress)** (chain read) for the list of ticket IDs. | Same as #3: platform has status/itemCount, not ticket IDs. | If platform adds ticket/item IDs for a player, use that. Until then, keep the single getAvailableTicketIds chain read for the ticket list, or document that ticket IDs are game-specific and optional. |

**Summary:** “Legacy” = **GamePassService** (game’s Sui client + game_pass contract). “New path” = **platformGamePassClient** (and related platform clients) → platform backend → Reservoir. For **list-players** and **discover-wallets** you can switch to **platformGamePassClient.listPlayers()** and map the response. For **ticket IDs** (enter + ticket-info), the platform currently exposes count only; migrating fully would require a platform API that returns ticket/item IDs, or keeping the one chain read until that exists.

**Legacy migration (8.3) — complete.** All four routes now use the platform only; GamePassService is no longer used by app API routes for Reservoir/balance/inventory/tickets. **list-players** and **discover-wallets** use platformGamePassClient.listPlayers (paginated). **tournaments/enter** and **admin/tournaments/ticket-info** use platformGamePassClient.getAvailableTicketUnits (GET api/reservoir/ticket-units/[address]); enter picks highest-value ticket when ticketId not provided.

**Conclusion:** Reservoir/balance/inventory (Section 8.3) validation step is complete. All player balance, credits, tickets, and inventory reads go through the platform.

---

## 9. Payments

| File | Purpose | V | P | I | U | Update actions | Done |
|------|--------|---|---|---|---|----------------|------|
| `services/payments/converter/price-converter.ts` | USD ↔ SUI/MEWS/USDC; **Gauge when platform configured** | ✓ | ✓ | ✓ | ✓ | **P:** When platform configured, uses platform Gauge only (no local fallback). When not configured, uses local CoinGecko/GeckoTerminal/env/cache. **I:** getConfig(); platform-client (isPlatformConfigured, platformGaugeClient, buildPlatformCallOptions). | [x] |

**price-converter.ts (done):** **V** Used by tournament-service, creator-reward-service, rewards-service, store (verify-prices, purchase, merge, items), clear-price-cache. **P** getTokenPrices() tries platform Gauge first when isPlatformConfigured(); on success uses and caches Gauge prices; on failure or not configured returns error (no fallback). convertUSDToToken() uses getTokenPrices() internally, so all callers get Gauge when platform is configured. **I** getConfig() for MEWS decimals; platform-client for Gauge. **U** Done.

---

## 10. Validation

**Game contract score/session deprecated.** Score submission and session handling use the **platform** only: Hydroscope for scores (POST /api/scores/submit), Anchor for sessions/claims. The game contract’s `SessionRegistry` and `submitScoreForPlayer` (admin-wallet-service) are deprecated; `submitScoreForPlayer` throws. Config `sessionRegistry` is deprecated for the score path. Do not require `SESSION_REGISTRY_OBJECT_ID_*` for new setups.

### Verification (what counts as "verified")

| Layer | In scope today | Notes |
|-------|----------------|------|
| **Rule-based validation** | Yes. `score-validation.ts` enforces game-contract rules (min distance/score, max coins, score consistency with enemies/bosses). Used for **scores/submit** (Hydroscope) and **tournaments/[id]/submit-score** (Regatta). | Ensures we never send invalid payloads to the platform on either path. |
| **Verified vs unverified flows** | Not in plan. No separate "verified" vs "unverified" submission path or leaderboard in this doc. | Game uses credits (per game) and tickets (tournaments to vault); no stake-at-risk. Verification can stay optional. |
| **Replay / proof-based verification** | Not in plan. No server-side replay or client-proof verification. | Could be added later; would be a separate pass. |
| **Economy** | Not in plan. Credits and tickets are gating; ticket value goes to vault pool. Users do not lose tokens for cheating (no slashing). | Validation plan stays focused on payload validity and platform alignment; economy is product/design (see staking plan). |

So: **validation** = payload rules + platform path. **Verification** (proven legitimate run or verified leaderboard) is only partially covered — we validate that the score is plausible per rules; we do not yet define verified/unverified flows or replay.

**TODO:** Do a **full review of verification** when we get to that part (verified vs unverified flows, replay/proof if any, tie-in to credits/tickets/vault, UX and product expectations).

| File | Purpose | V | P | I | U | Update actions | Done |
|------|--------|---|---|---|---|----------------|------|
| `services/validation/score/score-validation.ts` | Validates score payload to match game contract rules | ✓ | ✓ | ✓ | ✓ | Replay required; server computes score from replay, then validateScoreData(computed) before platform submit. Rule-based plausibility; no separate trust-the-client path. | [x] |

**Note:** Replay is required for both scores/submit and tournaments/[id]/submit-score. Server runs replay scorer, then validateScoreData on the computed score; validation applies to server-computed values only.

### Toward a more robust validation system

**Current state:** Rule-based validation (`validateScoreData`) runs on both **scores/submit** and **tournaments/[id]/submit-score**. It only enforces *plausibility* (score consistent with distance/coins/enemies/bosses). It does not prove the run happened; the client can send any payload that passes the rules.

**MVP stance:** Breaking the current submission flow is acceptable. Goal is to pick the best course for integrity and implement it.

---

**Best course of action: Replay-based verification**

Use **replay verification** as the single path for score submission. Client sends a **replay** (deterministic record of the run); server **recomputes** score from the replay and accepts only if it matches the claimed score. No separate "trust the client score" path.

| Step | Owner | Action |
|------|--------|--------|
| 1. **Replay format** | Game (client + backend) | Define a compact replay format: e.g. ordered list of **events** (distance tick, enemy killed + type, boss hit/boss killed + tier, coin collected, streak updates). Must be deterministic and sufficient to recompute score, distance, coins, bossesDefeated, enemiesDefeated, longestCoinStreak. |
| 2. **Replay scorer** | Game backend | Implement a **replay scorer** (same rules as `score-validation.ts` / game contract): given a replay, output `{ score, distance, coins, bossesDefeated, enemiesDefeated, longestCoinStreak }`. No floating logic; deterministic. |
| 3. **Submit API change** | Game backend | Change **scores/submit** and **tournaments/[id]/submit-score** to accept **replay** (and optional claimed score for idempotency). Server runs replay scorer on the replay; if result matches claimed score (or client only sends replay and server uses computed score), submit to platform. Otherwise reject. Remove or keep rule-based validation as a sanity check on the *computed* score before platform submit. |
| 4. **Client change** | Game frontend | During or at end of run, build the replay from game events and send it with the submit request. No sending raw score only. |
| 5. **Platform** | Optional | Platform can remain unchanged (still receives score payload). Verification is game-side. If later you want platform to store "verified" flag or replay hash, extend API then. |

**Why this is best for MVP:**

- **Single source of truth:** Score is derived from replay on the server; client cannot inject a fake score without a matching fake replay, which is much harder.
- **Clear contract:** Replay format is the contract; client and server stay in sync via that format.
- **No two paths:** One submission path (replay → verify → submit). No "verified vs unverified" product complexity unless you add it later.
- **Breaking is acceptable:** You can replace current "send scoreData only" with "send replay (+ optional claimed score)" and drop the old flow.

**Concrete next steps:**

1. **Define the replay schema** (e.g. JSON array of event objects with `type`, `value`, `tick` or similar). Document it in this plan or a `docs/` file.
2. **Implement the replay scorer** in the game backend (e.g. `lib/services/validation/score/replay-scorer.ts`) that takes replay, returns score summary; reuse or mirror the same constants/rules as `score-validation.ts`.
3. **Update submit routes** to require `replay` in the body, run replay scorer, then submit the computed score to platform (and optionally reject if client also sent a `claimedScore` that doesn’t match).
4. **Update the client** to record events during play and send the replay blob with POST scores/submit and POST tournaments/[id]/submit-score.

Once replay is required and the scorer is in place, rule-based validation can remain as a sanity check on the *computed* values before calling the platform.

**Rate limits and anomaly checks:** `score-submit-guard.ts` enforces (1) **rate limit:** max 10 score submissions per player address per minute (in-memory, sliding window); (2) **anomaly checks:** max replay event count 100k, max score 10M, max distance 500k. Both `scores/submit` and `tournaments/[id]/submit-score` call `guardScoreSubmit()` after validation and `recordScoreSubmit()` on success. In-memory only (per-instance); no Redis.

**Implementation status:** **Backend:** Replay schema (`replay-schema.ts`), replay scorer (`replay-scorer.ts`), and both submit routes require `replay: { version, events }`; server computes score from replay, runs `validateScoreData(computed)`, and submits the computed score. **Client:** Game frontend records replay in `replay-recorder.js` (startRun on game init; recordDistanceTick, recordCoin, recordEnemyKill, recordBossHit, recordBossKill from game-update, collectibles, destroy-all); `score-submission.js` sends `replay` for both `scores/submit` and `tournaments/[id]/submit-score`. Tournament submit sends `sessionId` (default 0 if not set; platform may require obtaining via POST /api/anchor/sessions).

---

## 11. Legacy (deprecated) — removed

| File | Status |
|------|--------|
| ~~`services/legacy/deprecated/game-pass-service.ts`~~ | **Removed.** No routes or lib callers; app uses platformGamePassClient only. |
| ~~`services/legacy/deprecated/store-service.ts`~~ | **Removed.** No routes or lib callers; app uses platformStoreClient/platformInventoryClient and Channel. |
| ~~`services/legacy/deprecated/store-logger.ts`~~ | **Removed.** Only used by the two services above. |
| ~~`services/legacy/deprecated/migration-logger.ts`~~ | **Removed.** No callers; migration-only logger. |

**Pass 2 legacy removal complete.** All four files deleted. Platform-only path for game pass, credits, tickets, store, and inventory is confirmed; no fallback or reference implementation kept.

---

## 12. Files outside `lib/services/` (shared infra)

These are still in `lib/` or `lib/api/` and feed into platform alignment. Include in cleanup if they’re in scope.

| File | Purpose | V | P | I | U | Update actions | Done |
|------|--------|---|---|---|---|----------------|------|
| `lib/api/api-handler.ts` | Game-owned API handler (withApiHandler, getRequestBody, getAddressParam, getDigestParam) | ✓ | — | ✓ | ✓ | Game-owned; uses cors, platform errors/logger, request-context. App uses it everywhere. | [x] |
| `lib/cors.ts` | Game-owned CORS (getCorsHeaders, handleCorsPreflight) | ✓ | — | ✓ | ✓ | Game-owned; env CORS_ORIGIN. | [x] |
| `lib/auth.ts` | Game-owned admin auth (verifyApiKey, requireAdminAuth, getAdminIdentifier) | ✓ | — | ✓ | ✓ | Uses getConfig().security.apiKey; not a platform re-export. | [x] |

**api-handler.ts (done):** **V** Used by all API routes. **P** Game-owned. **I** request, context. **U** None.

**cors.ts (done):** **V** Used by api-handler and route OPTIONS. **P** Game-owned. **I** CORS_ORIGIN. **U** None.

**auth.ts (done):** **V** Used by admin routes. **P** Game-owned (API key from config). **I** getConfig().security.apiKey. **U** None.

---

## Game actions review (frontend → backend → platform)

All player- and admin-triggered actions that mutate state or submit transactions. Each should have clear validation, error handling (no silent fallback), and use the intended platform path (Channel where applicable).

| Action | Frontend | Backend route | Platform path | Status |
|--------|----------|---------------|---------------|--------|
| **Start game (credit + items)** | game-pass-service.startGame(), game-service | POST /api/game-pass/start-game | Channel batch `reservoir-consume-balance-and-items` → sign → execute | ✅ |
| **Consume credit only** | game-pass-service.consumeGameCredit() | POST /api/game-pass/consume-credit | Channel batch `reservoir-consume-balance` → sign → execute | ✅ |
| **Tournament: create session** | game-service (before start) | POST /api/tournaments/create-anchor-session | platformAnchorClient.buildCreateSession → executeSigned | ✅ Failure = error; game does not start. |
| **Tournament: enter** | game-service | POST /api/tournaments/enter | Channel batch `regatta-enter-and-consume-items` (ticket + start items) → sign → execute | ✅ Requires anchorSessionId ≥ 1. |
| **Tournament: submit score** | score-submission.js (replay + sessionId) | POST /api/tournaments/[id]/submit-score | Channel batch `regatta-submit-score` → sign → execute | ✅ sessionId from gameState/currentGameStats; fallback includes anchorSessionId. |
| **Regular score submit** | score-submission.js (replay) | POST /api/scores/submit | platformGameScoreClient.submitScore; when buildOnly → executeSigned | ✅ Replay required; server computes score. |
| **Inventory consume (mid-game)** | consumable-system.js | POST /api/inventory/consume | Channel batch `reservoir-consume-items` → sign → execute | ✅ Store consume deprecated (410). |
| **Store purchase** | store-purchase-flow.js | POST /api/store/purchase | buildBatchViaChannel → player/admin sign → execute | ✅ |
| **Store merge** | store-inventory-tab.js | POST /api/store/merge | buildBatchViaChannel (reservoir-merge) → sign → execute | ✅ |
| **Game pass: purchase pack/single/tickets** | game-pass-service | Unified store checkout (`POST /api/store/purchase` then `POST /api/store/fulfill`) | Platform build (Channel or platform API) → sign → execute | ✅ |
| **Achievements claim** | achievement-progress.js | POST /api/achievements/claim | Channel anchor-submit-claim or platform build → executeSigned | ✅ |
| **Badges mint / upgrade / update** | badge-service.js | POST /api/badges/mint, upgrade, update | Platform Shipyard (build + executeSigned) | ✅ |
| **Tournament create / notify / distribute** | tournament-creation-modal, admin | POST /api/tournaments/create, notify-created, admin distribute | Platform Regatta/Sustain/Glacier; Channel for distribute | ✅ |

**Read-only (no mutation):** game-pass status, tournaments list, leaderboard, stats, inventory, store items, config, wallet config — all go through backend to platform (Reservoir, Station, Helm, etc.). No chain read in game for these.

**Notes:**
- **API base URL:** Frontend uses `GAME_CONFIG.getBackendUrl()` or `API_BASE_URL` / `GAME_BACKEND_URL`. Ensure env is consistent (e.g. same backend for all routes).
- **Inventory reads:** Frontend may call GET /api/store/inventory/[address] (legacy compat) or GET /api/inventory/[address]; both proxy to platform. Optional: align all inventory reads to /api/inventory/[address].
- **Leaderboard score submit:** No fallback for stats: use `currentGameStats` only (set from game-lifecycle). If missing, blockchain submit is skipped. Only session ID fallback: when we have currentGameStats, `sessionId` and `anchorSessionId` may be filled from window.game / gameState if missing.

---

## Summary

- **Total files in scope:** 48 under `lib/services/` + optional shared `lib/` entries.
- **Two passes:** Pass 1 = validate + platform alignment + updates + remove obvious dead code. Pass 2 = re-check validity (callers) after cleanup, then remove or consolidate what became unused.
- **Priority for platform connection:** tournament-service, achievement-service, rewards-service, rewards-platform-executor, batch-reward-distribution, provisions-service, game-config-service, platform-client, platform-app-config. **Payments:** price-converter uses platform Gauge when configured (single source for token USD values).
- **Priority for removal/consolidation:** badge-logger (deprecated), discount-tiers-platform (possibly dead), badge-service-stub (confirm usage). Legacy game-pass-service, store-service, store-logger, migration-logger **removed**. **leaderboard-chain.ts** removed (leaderboard platform-only).
- **Re-exports to reduce:** platform-logger, platform-errors, platform-validators, transaction-helpers, admin-wallet-service-base, balance-checker, badge-errors, badge-validators (migrate callers to `@platform` then thin re-export or remove in Pass 2).

After completing a file in Pass 1, set **Done** to `[x]` and run build/tests before moving on. After completing a full section, run the game build to confirm it is still working. When Pass 1 is complete, run Pass 2 (validity-only re-check and final removals).

---

## Platform modules to ensure are used

Per `docs/results.md`: Aquifer (definitions), Provisions (catalog), Anchor (claims), Insignia (awarded state), Rain + Sustain (rewards), Reservoir (balances/holdings), Shipyard (badges/NFTs), Logbook (audit), Hydroscope (stats), Channel (batch + execute), Station/Regatta (events/tournaments), Helm (app config), Gauge (prices), Glacier (vaults), Terminal (store). Ensure the game uses the following as intended; no bypass or fallback.

| Module | Game use | Ensure |
|--------|----------|--------|
| **Channel** | Store (purchase, merge, consume), catalog admin, rewards (sustain-build-distribute), register-catalog, add-credits/tickets. | ✅ Build via `buildBatchViaChannel` (POST api/channel/batch); execute via `platformTxClient.executeSigned` (POST api/channel/execute). No direct chain submit for these flows. |
| **Reservoir** | Balance/holdings: `api/reservoir/[address]`, `api/reservoir/holdings/[address]`. Credits/tickets: balance add/set/remove/consume, admin add tickets. | **Ensure:** All player balance, credits, tickets, and inventory reads from platform Reservoir (GET reservoir/[address] or GET reservoir/holdings/[address]). No chain read for holdings. Store uses Channel for purchase/merge/consume. |
| **Provisions** | Catalog read GET api/provisions/catalog; admin build POST api/provisions/admin/catalog/build. | **Ensure:** Catalog read from platform only; admin catalog updates via platform build + game sign. No fallback. (See §7.) |
| **Hydroscope** | Stats (GET hydroscope/[address]), leaderboard, score submit (POST /api/scores/submit). | **Ensure:** Stats and score submission go through platform only; no game-contract score path. |
| **Anchor** | Claims: list, build submit (milestones/achievements). Tournament submit requires **sessionId**. | **Ensure:** Milestone/achievement claims via Anchor (buildSubmitClaim + executeSigned). **Tournament submit:** Platform requires Anchor sessionId; client or game must obtain it via POST api/anchor/sessions before calling submit-score. If the game does not proxy anchor/sessions, ensure the client (frontend or caller) creates the session and passes sessionId. |
| **Aquifer** | Definitions (milestones, achievements) GET api/aquifer/definitions. | **Ensure:** Definitions from Aquifer only; no fallback. |
| **Sustain** | Reward distribution: build-distribute, prepare-distribution, release (Glacier), mark-distribution-complete. | **Ensure:** Tournament/achievement rewards via Channel sustain-build-distribute and Glacier release; no direct chain reward path. |
| **Station / Regatta** | Events (tournaments): create, enter, submit-score, leaderboard, list. Glacier vault add/release. | **Ensure:** All tournament/event data and vault ops via platform Station/Regatta/Glacier APIs. |
| **Helm** | App config (packs, ticket bundles, badges, etc.) GET api/helm. | **Ensure:** App config from platform Helm; game-config-service uses it. |
| **Gauge** | Token prices GET api/gauge. | **Ensure:** price-converter uses Gauge when platform configured (done). |
| **Shipyard** | Badge has-badge, mint, upgrade. | **Ensure:** Badge flow via platform Shipyard (build + sign + executeSigned). |
| **Insignia** | Player awarded state (e.g. "has unlocked?"). Platform: GET api/insignia. | **Ensure:** If the game needs "has player unlocked X?" from platform, use `platformInsigniaClient` (api/insignia). Currently no route in game calls it; add when progression/insignia read is required. |
| **Logbook** | Audit trail (platform-owned). | **Ensure:** Game does not need to read Logbook; using Sustain/Channel/rewards writes to it. No action. |
| **Estuary** | Entitlements (grant/revoke/check). Platform: api/estuary/connect, check, grant, revoke. | **Ensure:** If the game gates features by entitlement, use platform Estuary APIs. Currently only estuary/connect is in platform-client; add check/grant/revoke usage if needed. |
| **Staking** | Not implemented yet. | When platform has staking module, use it per docs/platform/SCORE_STAKING_PLAN.md; no gatekeeping required for this game. |
