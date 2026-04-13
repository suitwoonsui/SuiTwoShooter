# Shooter-game backend `lib/` audit

Audit of `apps/shooter-game/backend/lib`: what each file is, what to do with it, how to organize under a `services` folder, and which are deprecated. **No code or paths were changed** in this audit.

---

## 1. Current layout (by folder)

### `lib/` (root)

| File | Purpose | Suggested action / service |
|------|--------|-----------------------------|
| **platform-app-config.ts** | Platform Helm app-config: fetch/set packs, ticket bundles, min balance, badge config via platform API. Corridor-only. | **Keep.** Move to `services/platform/` or `services/config/` as "platform app config" service. |
| **rewards-platform-executor.ts** | Signs and submits reward tx(s) from platform (sustain build-distribute). Uses admin wallet + platform execute. | **Keep.** Move to `services/rewards/` (reward execution helper). |
| **cors.ts** | Re-exports CORS from Aqueduct Platform backend. | **Keep.** Leave in `lib/` as shared infra or move to `lib/infra/` or keep as thin re-export. |
| **api-base-url.ts** | Returns base API URL for game backend (env / localhost / Vercel fallback). | **Keep.** Move to `services/config/` or keep in `lib/` as shared util. |
| **auth.ts** | API key verification (Bearer / X-API-Key) for admin. | **Keep.** Leave in `lib/` as shared auth or `lib/infra/`. |
| **score-validation.ts** | Validates score payload to match game contract rules (platform-only path). | **Keep.** Move to `services/scores/` or `services/validation/`. |

### `lib/api/`

| File | Purpose | Suggested action / service |
|------|--------|-----------------------------|
| **api-handler.ts** | Re-export from Aqueduct Platform (withApiHandler, getRequestBody, etc.). | **Keep.** Leave as shared API infra. |
| **platform-client.ts** | Game→platform API client: Channel, Reservoir, Helm, Aquifer, Shipyard, Sonar, Hydroscope, Glacier, Station, Regatta, etc. Corridor-only. | **Keep.** Move to `services/platform/` as "platform API client" or leave under `lib/api/` as core infra. |

### `lib/sui/` (Sui/on-chain and game-specific logic)

| File | Purpose | Deprecated? | Suggested action / service |
|------|--------|-------------|-----------------------------|
| **badge-service.ts** | Main badge service: mint, upgrade, tier, queries, images, platform Shipyard + legacy paths. | No | **Keep.** Move to `services/badge/` (or keep `sui/` as "chain" and treat as badge "service" in the org plan). |
| **tournament-service.ts** | Tournaments: create, enter, submit score, leaderboard, distribution status, platform Station/Regatta + legacy. | No (has @deprecated methods inside) | **Keep.** Move to `services/tournament/`. |
| **achievement-service.ts** | Milestones/achievements: definitions, eligibility, claim, platform Aquifer/Stats + on-chain. | No (has @deprecated methods) | **Keep.** Move to `services/achievements/` or `services/milestones/`. |
| ~~**game-pass-service.ts**~~ | **Removed.** Was game pass/credits/tickets on-chain. | — | Removed; app uses platformGamePassClient only. |
| ~~**store-service.ts**~~ | **Removed.** Was store/inventory on-chain. | — | Removed; app uses platformStoreClient/platformInventoryClient and Channel. |
| **rewards-service.ts** | Tournament/achievement reward calculation and distribution via platform build-distribute. | No (one deprecated field in type) | **Keep.** Move to `services/rewards/`. |
| **provisions-service.ts** | Terminal item definitions: catalog from platform or chain, item type mapping. | No | **Keep.** Move to `services/store/` or `services/catalog/`. |
| **game-config-service.ts** | Game config from platform app-config (packs, ticket bundles, badge config). | No | **Keep.** Move to `services/config/`. |
| **admin-wallet-service.ts** | Game admin wallet: keypair, sign, Sui clients. Game-specific; does not extend platform. | No | **Keep.** Move to `services/wallet/` or leave in `lib/sui/` as core infra. |
| **admin-wallet-service-base.ts** | Re-export of platform's AdminWalletService (for reference; game uses its own admin-wallet-service). | No | **Keep** if platform types are needed; else treat as optional. |
| **platform-logger.ts** | Re-export of platform PlatformLogger. | No | **Keep.** Shared logging. |
| **platform-errors.ts** | PlatformError, PlatformErrorCode. | No | **Keep.** Shared errors. |
| **platform-validators.ts** | Address/tier/input validation. | No | **Keep.** Shared validation. |
| **balance-checker.ts** | Re-exports platform + game-specific balance checks (e.g. checkBalanceBeforeTransaction). | No | **Keep.** Move to `services/wallet/` or keep as shared util. |
| **payment-transaction-builder.ts** | Builds payment tx (SUI/MEWS/USDC), balance check, gas. Used by tournament (and store) flows. | No | **Keep.** Move to `services/payments/` or `services/tournament/` support. |
| **milestone-level-manager.ts** | Milestone level from threshold ordering. | No | **Keep.** Move with achievement/milestone service. |
| **transaction-helpers.ts** | Re-export from platform transaction helpers. | No | **Keep.** Shared tx helpers. |
| ~~**store-logger.ts**~~ | **Removed.** Was store-specific debug logger. | — | Removed with game-pass-service and store-service. |
| ~~**migration-logger.ts**~~ | **Removed.** Was migration-specific debug logger. | — | Removed; no callers. |
| ~~**leaderboard-chain.ts**~~ | **Removed.** Chain reader for leaderboard when platform not configured. | — | Leaderboard is platform-only; file and route fallback removed. |
| **badge-logger.ts** | **@deprecated** – re-exports PlatformLogger as BadgeLogger. | **Yes** | **Replace** usages with PlatformLogger; then remove or keep as thin re-export. |
| **badge-errors.ts** | Re-exports platform errors as BadgeError/BadgeErrorCode (legacy names). | Legacy compat | **Keep** until callers use PlatformError; then remove. |
| **badge-validators.ts** | Re-exports PlatformValidators as BadgeValidators. | Legacy compat | **Keep** until callers use PlatformValidators; then remove. |
| **badge-image-cache.ts** | In-memory badge image cache (TTL, size limit). | No | **Keep.** Part of badge service. |
| **badge-request-cache.ts** | In-memory badge request cache (TTL, LRU). | No | **Keep.** Part of badge service. |
| **badge-image-validator.ts** | WebP validation/sanitization for on-chain badge images. | No | **Keep.** Part of badge service. |
| **badge-retry-queue.ts** | Retry queue for failed badge updates (backoff). | No | **Keep.** Part of badge service. |
| **badge-reconciliation.ts** | Background job to reconcile badge state (e.g. missed updates). | No | **Keep.** Part of badge service. |

### `lib/sui/badge-service/` (badge submodules)

| File | Purpose | Deprecated? | Suggested action / service |
|------|--------|-------------|-----------------------------|
| **badge-transactions.ts** | Builds badge mint/upgrade tx. | No | **Removed.** Badge flow is platform-only; module was unused. |
| **badge-images.ts** | Badge image loading, URLs, chunked upload. | No | **Keep.** Stays with badge service. |
| **badge-queries.ts** | hasBadge, getBadge (with cache). | No | **Removed.** Badge flow is platform-only; module was unused. |
| **badge-utilities.ts** | calculateTierFromGames, getDiscounts (store + gameplay). | No | **Keep.** Stays with badge service. |
| **discount-tiers-platform.ts** | getDiscounts (gameplay only). Overlaps badge-utilities. | **Possibly dead** (no imports found). | **Audit usages**; if unused, remove or fold into badge-utilities. |
| **badge-service-stub.ts** | Optional stub BadgeService (getBadge → null). | **Optional/stub** | **Keep** only if used when badge is disabled; else remove. |

### `lib/services/`

| File | Purpose | Suggested action / service |
|------|--------|-----------------------------|
| **milestones/milestones-service.ts** | Aquifer milestone definitions, claim tracking, Channel build params. Platform stats + definitions. | **Keep.** Move to `services/milestones/` (or `services/achievements/` if you group with achievement-service). |
| **default-rewards-config.ts** | Default tournament reward config (file + system defaults). Used by default-sustain-config and tournament creation. | **Keep.** Move to `services/rewards/` or `services/tournament/`. |
| **creator-reward-service.ts** | Creator reward calculation (boost phase, break-even). | **Keep.** Move to `services/rewards/` or `services/tournament/`. |
| **batch-reward-distribution.ts** | Batch reward distribution via Channel sustain-build-distribute + sign/submit. | **Keep.** Move to `services/rewards/`. |
| **reward-cost-calculator.ts** | Tournament reward cost (items, discounts, badge). | **Keep.** Move to `services/rewards/` or `services/tournament/`. |
| **tournament-scheduler.ts** | Schedules reward distribution after tournament grace period. | **Keep.** Move to `services/tournament/`. |
| **provisions.ts** | DEFAULT_PROVISIONS_SEED, getProvisions(), getProvisionsSync(); wraps getProvisionsService(). | **Keep.** Move to `services/store/` or `services/catalog/` (with catalog-order). |
| **item-catalog.ts** | Re-exports StoreItem, ItemLevel, ProvisionsCatalog, CATALOG_ITEM_ORDER. | **Keep.** Move with provisions/catalog. |
| **catalog-order.ts** | CATALOG_ITEM_ORDER (display order for items). | **Keep.** Move with catalog/provisions. |
| **price-converter.ts** | USD ↔ SUI/MEWS/USDC (CoinGecko, cache). | **Keep.** Move to `services/payments/` or `services/config/`. |

---

## 2. Deprecated / legacy summary

**Explicitly deprecated**

- **badge-logger.ts** – Use `PlatformLogger`; then delete or keep as re-export.
- **game-pass-service.ts** – Unused by routes (platform used); candidate for removal once platform-only is final.
- **store-service.ts** – Unused by routes (platform used); same as above.

**Deprecated members inside otherwise active files**

- **tournament-service.ts**: several @deprecated methods (e.g. platform EventService alternatives).
- **achievement-service.ts**: getClaimedMilestoneIds vs old tracking, getEligibleAchievements vs older API, claimSingleMilestone vs admin-paid claim, unclaimMilestoneById vs legacy unclaim.
- **rewards-service.ts**: `tokenRewardMewsAmount` deprecated in favor of `tokenRewardAmount`.
- **platform-client.ts**: one @deprecated helper (e.g. balance); "legacy" in comments (catalog/contract options).

**Legacy naming / compatibility only**

- **badge-errors.ts**, **badge-validators.ts** – Legacy names for platform errors/validators; keep until callers are updated.

**Possibly dead**

- **discount-tiers-platform.ts** – No imports found; overlaps badge-utilities getDiscounts.
- **badge-service-stub.ts** – No imports in grep; may be optional entry point; confirm then remove or keep.

---

## 3. Organizing by services folder (suggestion)

Group by domain under something like `lib/services/` (or a top-level `services/` if you prefer), and keep shared infra in `lib/` or `lib/api/`:

| Group | Files to move here |
|-------|--------------------|
| **services/platform/** (or keep under `lib/api/`) | platform-client.ts, platform-app-config.ts (or under config) |
| **services/config/** | game-config-service.ts, platform-app-config.ts (if not under platform), api-base-url.ts (optional) |
| **services/badge/** | badge-service.ts, badge-*.ts (cache, request-cache, image-validator, retry-queue, reconciliation), badge-service/ (transactions, images, queries, utilities; drop or merge discount-tiers-platform and stub if unused) |
| **services/tournament/** | tournament-service.ts, tournament-scheduler.ts, default-rewards-config.ts, creator-reward-service.ts, reward-cost-calculator.ts (or under rewards) |
| **services/rewards/** | rewards-service.ts, rewards-platform-executor.ts, batch-reward-distribution.ts, default-rewards-config.ts (if not under tournament), reward-cost-calculator.ts (if under rewards) |
| **services/achievements/** (or **milestones/**) | achievement-service.ts, milestone-level-manager.ts, milestones/milestones-service.ts |
| **services/store/** (or **catalog/**) | provisions-service.ts, provisions.ts, catalog-order.ts, item-catalog.ts |
| **services/wallet/** (or keep in `lib/sui/`) | admin-wallet-service.ts, balance-checker.ts, payment-transaction-builder.ts (or under payments) |
| **services/payments/** (optional) | price-converter.ts, payment-transaction-builder.ts |
| **services/validation/** (optional) | score-validation.ts |
| **lib/** (shared infra – no move or minimal) | cors.ts, auth.ts, api-handler.ts (re-exports), platform-logger, platform-errors, platform-validators, transaction-helpers, admin-wallet-service-base (re-exports) |
| **Deprecated / legacy** | game-pass-service, store-service, store-logger, migration-logger **removed**. badge-logger.ts → replace with PlatformLogger, then delete. discount-tiers-platform.ts, badge-service-stub.ts → confirm unused, then remove or merge. |

---

## 3a. Organized subgroups (within each service group)

When moving to a `services/` layout, use these subgroups so each service has a clear internal structure.

**services/platform/** — Game ↔ Aqueduct Platform integration

| Subgroup | Path | Files |
|----------|------|--------|
| **client** | `services/platform/client/` | platform-client.ts |
| **app-config** | `services/platform/app-config/` | platform-app-config.ts |

**services/config/** — App/game configuration

| Subgroup | Path | Files |
|----------|------|--------|
| **game-config** | `services/config/game-config/` | game-config-service.ts |
| **platform-app-config** | `services/config/platform-app-config/` | (optional; or keep under platform/app-config) |
| **base-url** | `services/config/base-url/` | api-base-url.ts (optional) |

**services/badge/** — Badge minting, tier, images, retry

| Subgroup | Path | Files |
|----------|------|--------|
| **core** | `services/badge/core/` | badge-service.ts |
| **cache** | `services/badge/cache/` | badge-image-cache.ts, badge-request-cache.ts |
| **validation** | `services/badge/validation/` | badge-image-validator.ts |
| **retry** | `services/badge/retry/` | badge-retry-queue.ts |
| **reconciliation** | `services/badge/reconciliation/` | badge-reconciliation.ts |
| **transactions** | `services/badge/transactions/` | badge-service/badge-transactions.ts |
| **images** | `services/badge/images/` | badge-service/badge-images.ts |
| **queries** | `services/badge/queries/` | badge-service/badge-queries.ts |
| **utilities** | `services/badge/utilities/` | badge-service/badge-utilities.ts |

**services/tournament/** — Tournaments, scheduling, creator rewards

| Subgroup | Path | Files |
|----------|------|--------|
| **core** | `services/tournament/core/` | tournament-service.ts |
| **scheduler** | `services/tournament/scheduler/` | tournament-scheduler.ts |
| **rewards-config** | `services/tournament/rewards-config/` | default-rewards-config.ts |
| **creator** | `services/tournament/creator/` | creator-reward-service.ts |
| **cost** | `services/tournament/cost/` | reward-cost-calculator.ts |

**services/rewards/** — Reward calculation and distribution

| Subgroup | Path | Files |
|----------|------|--------|
| **core** | `services/rewards/core/` | rewards-service.ts |
| **executor** | `services/rewards/executor/` | rewards-platform-executor.ts |
| **batch** | `services/rewards/batch/` | batch-reward-distribution.ts |

**services/achievements/** (or **milestones/**) — Milestones, eligibility, claim

| Subgroup | Path | Files |
|----------|------|--------|
| **core** | `services/achievements/core/` | achievement-service.ts |
| **level** | `services/achievements/level/` | milestone-level-manager.ts |
| **milestones** | `services/achievements/milestones/` | milestones/milestones-service.ts (or services/milestones/ as top-level) |

**services/store/** (or **catalog/**) — Item definitions, catalog, display order

| Subgroup | Path | Files |
|----------|------|--------|
| **catalog** | `services/store/catalog/` | provisions-service.ts, provisions.ts, catalog-order.ts, item-catalog.ts |

**services/wallet/** — Admin wallet, balance, payments

| Subgroup | Path | Files |
|----------|------|--------|
| **admin** | `services/wallet/admin/` | admin-wallet-service.ts |
| **balance** | `services/wallet/balance/` | balance-checker.ts |
| **payments** | `services/wallet/payments/` | payment-transaction-builder.ts |

**services/payments/** (optional top-level) — Price conversion

| Subgroup | Path | Files |
|----------|------|--------|
| **converter** | `services/payments/converter/` | price-converter.ts |

**services/validation/** — Input/score validation

| Subgroup | Path | Files |
|----------|------|--------|
| **score** | `services/validation/score/` | score-validation.ts |

**lib/infra/** (or keep at **lib/** root) — Shared infra, re-exports

| Subgroup | Path | Files |
|----------|------|--------|
| **api** | `lib/api/` | api-handler.ts |
| **cors** | `lib/` | cors.ts |
| **auth** | `lib/` | auth.ts |
| **logging** | `lib/` | platform-logger.ts (store-logger, migration-logger removed) |
| **errors** | `lib/` | platform-errors.ts |
| **validators** | `lib/` | platform-validators.ts |
| **transaction-helpers** | `lib/` | transaction-helpers.ts, admin-wallet-service-base.ts |

**services/legacy/** (before deletion)

| Subgroup | Path | Files |
|----------|------|--------|
| **deprecated** | `services/legacy/deprecated/` | (empty – game-pass-service, store-service, store-logger, migration-logger removed) |

---

## 4. What to do with each (one-line)

- **Keep and move into a service group:** platform-app-config, rewards-platform-executor, platform-client, badge-service (+ badge-service/* except stub/discount-tiers), tournament-service, achievement-service, rewards-service, provisions-service, game-config-service, admin-wallet-service, milestones-service, default-rewards-config, creator-reward-service, batch-reward-distribution, reward-cost-calculator, tournament-scheduler, provisions, catalog-order, item-catalog, price-converter, balance-checker, payment-transaction-builder, milestone-level-manager, badge-reconciliation, badge-retry-queue, badge-request-cache, badge-image-cache, badge-image-validator.
- **Keep in lib (infra/shared):** cors, auth, api-handler, api-base-url, platform-logger, platform-errors, platform-validators, transaction-helpers, admin-wallet-service-base.
- **Keep but migrate callers then remove:** badge-logger (use PlatformLogger), badge-errors/badge-validators (use platform-* names).
- ~~**Mark deprecated and later remove or put in legacy:** game-pass-service, store-service.~~ **Done:** removed.
- **Audit and remove if unused:** discount-tiers-platform.ts, badge-service-stub.ts.

---

*Generated from lib audit; no file moves or code edits were made.*
