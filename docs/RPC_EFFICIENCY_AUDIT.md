# RPC & network efficiency audit — `apps/shooter-game` (current tree)

**Goal:** Minimize **necessary** Sui-related and chain-adjacent network work: fewer round trips, dedupe in-flight work, correct caching and invalidation, batch where the platform supports it.

**Scope:** `apps/shooter-game/` **only** (frontend + backend). Wallet UMD and Aqueduct Platform code are **out of scope** here but still show up in the browser Network tab—note them when tracing flows.

**Status:** Living document. Update **§2 Inventory** when files change; add rows to **§4 Findings** and **§5 Actions** as you verify behavior (runtime > grep). **§3** lists flows to trace in **§6**. **§8** is the **phased execution plan** (complexity, value, checklist, status).

---

## 1. Channels (where “RPC” lives)

| # | Channel | Typical pattern in this repo | Efficiency levers |
|---|---------|--------------------------------|-------------------|
| A | **Browser → game backend → Sui JSON-RPC** | `POST /api/sui-json-rpc` (see `backend/app/api/sui-json-rpc/route.ts`, `frontend/.../token-balance-utils.js`) | Proxy + failover; avoid duplicate `suix_*` for same owner/coinType; cache + single-flight on client |
| B | **Browser → wallet bundle** | `walletAPIInstance.checkSUIBalance` / `checkMEWSBalance` | Opaque to this tree—count calls from game code; avoid double-polling |
| C | **Game backend → platform Sonar** | `getSonarClient()`, `callPlatformSonarBatch`, `platformSonarClient.*` | Prefer **batch** when reading gas + payment token together; avoid N sequential `getObject` where multi-get exists |
| D | **Game backend → direct Sui** | `new SuiClient({ url: getFullnodeUrl(...) })` in a few places | Prefer Sonar/platform path when policy allows; if direct Sui remains, reuse one client, avoid hot-loop reads |
| E | **Game backend → Aqueduct HTTP** | `callPlatformBackend` | Not Sui RPC; still affects “loading”—batch endpoints, parallel `Promise.all` with care |

---

## 2. Inventory (static pass — refresh periodically)

### 2.1 Frontend (`apps/shooter-game/frontend`)

| Area | Files / notes |
|------|----------------|
| **JSON-RPC to Sui** | `systems/ui/token-balance-utils.js` — USDC via `suix_getCoins` through **`getSuiJsonRpcProxyUrl`** first; public fullnode only **fallback**. Cache TTL, in-flight map, `invalidateTokenBalanceCache`, `prefetchTokenBalancesIfStale`. |
| **Hardcoded fullnode URLs** | Same file: `getRpcUrl()` fallback strings (expected only when game backend base URL missing). |
| **SUI / MEWS** | Routed through **wallet API**, not `suix_*` in this file—separate channel (B). |

_Regenerate hints:_

```text
rg "fullnode\\.(testnet|mainnet)\\.sui" apps/shooter-game/frontend
rg "sui-json-rpc|suix_" apps/shooter-game/frontend
```

### 2.2 Backend (`apps/shooter-game/backend`)

| Area | Files / notes |
|------|----------------|
| **Browser-safe JSON-RPC proxy** | `app/api/sui-json-rpc/route.ts` + `lib/rpc/ordered-sui-rpc-urls.ts` |
| **Direct `SuiClient` construction** | `lib/services/wallet/admin/admin-wallet-service.ts` (testnet/mainnet), `lib/services/rewards/core/rewards-service.ts`, `app/api/admin/milestones/users/[address]/route.ts`, `scripts/migrate-milestones.ts` — **review** each for call frequency (admin/script paths may be OK). |
| **Sonar reads** | Widespread via `getSonarClient()` in `platform-client.ts` facade; **`callPlatformSonarBatch`** in `balance-checker.ts` for gas + payment token path. |
| **Hot paths** | `lib/services/wallet/balance/balance-checker.ts` — separate exported functions each call `getBalance` when needed; **token purchase** path uses **batch** for non-`SUI` payment. |

```text
rg "new SuiClient\\(" apps/shooter-game/backend
rg "getSonarClient\\(|callPlatformSonarBatch" apps/shooter-game/backend
```

---

## 3. User flows (definitions for runtime audit)

These are **product-level** sequences to run under DevTools (§6). They are **not** exhaustive of every HTTP route; extend the table when you add surfaces.

| Flow ID | Name | Typical trigger | What to watch (Network) | Main game code / routes (hints) |
|---------|------|-------------------|-------------------------|--------------------------------|
| **UF-01** | First load: shell, config, bootstrap | First visit / hard refresh | **(1) Shell:** duplicate script URLs, long waterfall. **(2)** `GET /api/config`. **(3)** `GET /api/menu/bootstrap` (one response that fans out on server—watch count vs many separate catalog/tournament calls). | `lazy-loader.js`, `ui-initialization.js`, `game-api.js`, `beginMenuBootstrapPrefetch` |
| **UF-02** | Wallet connect | User connects wallet | Wallet host + game backend burst; duplicate balance/config fetches | `game-data-flow-wallet.js`, `wallet-service.js`, `warmPlayerSessionOnBackend` (`game-data-flow-loaders.js`) |
| **UF-03** | Main menu after connect | Menu visible with stats | Parallel `GET` to same path (e.g. stats, reservoir, inventory); duplicate warm | `menu-system.js`, `GamePassDisplay`, `StatsService`, `GET /api/menu/player-warm`, `GET /api/stats/...`, `GET /api/reservoir/...`, `GET /api/inventory/...` |
| **UF-04** | Store & inventory modal | Open store | Catalog + inventory + token prices + balances; tab switches re-fetching | `store-modal.js`, `store-inventory-tab.js`, `store-item-loader.js`, `token-balance-utils.js`, `GET /api/store/...`, inventory, reservoir |
| **UF-05** | Purchase / post-purchase | Complete buy | Fulfillment polls; cache invalidation follow-up | `store-purchase-flow.js`, `invalidateTokenBalanceCache`, `GET /api/store/transaction/...` |
| **UF-06** | Start game (regular) | Start with credit + items | Single vs duplicate consume; start-game batch | `game-service.js`, `game-pass-service.js`, `POST /api/reservoir/start-game` |
| **UF-07** | Tournament path | List / enter / play | Tournament APIs + reservoir/tickets reads | `tournament-modal.js`, `game-service.js`, `GET/POST .../tournaments/...` |
| **UF-08** | Badges | Display / mint / upgrade | Badge + balance checks; Sonar vs JSON-RPC mix | `badge-service.js`, `badge-ui-*.js`, `GET /api/badges/...` |
| **UF-09** | Leaderboard & scores | Open board / submit | Hydroscope/leaderboard routes; duplicate stats | `leaderboard-*.js`, `GET /api/leaderboard`, `POST /api/scores/submit` |
| **UF-10** | Achievements / milestones | Progress / claim | Milestones definitions + progress; platform calls | `achievement-progress.js`, `GET /api/milestones/...`, `GET /api/achievements/...` |

_Use the **Flow ID** in §4 Findings / §5 Actions when an issue is tied to a specific journey._

**Shell vs bootstrap (not the same thing):** **Shell** here means the **browser bootstrapping the game app**—HTML, CSS, ordered script loads (`lazy-loader`), first `GameApi` / `GAME_CONFIG` resolution. **Menu bootstrap** is the **HTTP route** `GET /api/menu/bootstrap`: the game backend returns a **bundled** public payload (store catalog slice, tournaments list, milestones, leaderboard, game config, etc.) to reduce how many separate round trips the client would otherwise make. UF-01 covers **both** in one “first load” pass because they often happen back-to-back; you can still log findings separately (e.g. “duplicate script” vs “bootstrap redundant with follow-up GETs”)._

---

## 4. Findings (verified or suspected)

_Add one row per item. **Evidence:** `grep`, trace, Network screenshot, or “manual test notes”._

| ID | Severity | Area | Finding | Evidence | Status |
|----|----------|------|---------|----------|--------|
| F-001 | Info | Frontend | USDC balance uses **game-backend JSON-RPC proxy** first; cache + in-flight dedupe reduce repeat calls during store/menu churn. | `token-balance-utils.js` | Open |
| F-002 | Low | Frontend | SUI/MEWS balances go through **wallet API**—game cannot batch them with USDC; watch for **duplicate** wallet calls from multiple UI entry points. | Same file + callers | Open |
| F-003 | Medium | Backend | Several code paths use **`getSonarClient().getBalance`** in isolation; acceptable per call, but **sequential** checks in one HTTP handler could often be **one batch** (pattern already used in `checkPlayerTokenBalanceForPurchase` for non-SUI). | `balance-checker.ts` | Open |
| F-004 | Low | Backend | **`new SuiClient(getFullnodeUrl)`** exists for admin wallet + rewards + one admin route—confirm these are **not** per-request constructions in hot loops. | grep `new SuiClient` | Open |
| F-005 | Info | Frontend / UF-01 | **`GET …/menu/bootstrap`** uses `cache: 'no-store'` and a `ts=` query—browser HTTP cache will not help; every cold load is one full bundled round trip (by design for freshness). | `ui-initialization.js` `beginMenuBootstrapPrefetch` | Suspected (static) |
| F-006 | Low | Frontend / UF-02 + UF-01 | **Bootstrap tail + wallet connect** can overlap: `applyMenuBootstrapPrefetchData` fires `prefetchMyTournamentsIfStale`, `prefetchBadgeIfStale`, and `GamePassService.getGamePassStatus(address, true)` while `onWalletConnected` also prefetches game pass, tournaments, badge, then `GameDataFlowService.load`. TTL + in-flight dedupe should absorb most cases; still worth a **Network** pass for “connect immediately after Enter”. | `ui-initialization.js` (post-bootstrap hooks), `game-data-flow-wallet.js` | Suspected (static) |
| F-007 | Info | Frontend / UF-03 | **Game pass on connect:** `getCreditsAndTickets` is stored in `window.__gamePassPrefetch` and consumed in `_performLoad` so `GamePassDisplay.refresh` is not duplicated when prefetch wins—good single-flight pattern. | `game-data-flow-wallet.js`, `game-data-flow-service.js` | Suspected (static) |
| F-008 | Low | Frontend / UF-04 | **Store open:** catalog goes through `StoreDataSources.fetchStoreCatalogRaw`, which **seeds from** `window.__prefetchedStoreCatalog` after bootstrap—usually **no** extra `GET /store/catalog`. If inventory + game pass caches miss, **reservoir-bundle** (or `PlayerInventoryCache.fetchPlayerInventoryAndCache`) can still be a heavier combined read. | `store-modal.js`, `store-data-sources.js`, `ui-initialization.js` | Suspected (static) |
| F-009 | Low | Frontend / UF-07 | **`tournament-modal.js`** has many direct `fetch()` sites (list, past+active parallel, detail, player-scoped list, reservoir reads). Prefetch + `canUseTournamentListPrefetch` reduce first-open cost; **runtime** duplicate URL counting is still the best check. | grep `fetch(` in `tournament-modal.js` | Suspected (static) |
| F-010 | Info | Frontend / UF-10 | Milestone **definitions** are written from menu bootstrap (`__prefetchedMilestoneDefinitions`); **achievement-progress** and **leaderboard-modal** consult that before hitting `GET …/milestones/definitions`—reduces duplicate definition fetches after UF-01. | `ui-initialization.js`, `achievement-progress.js`, `leaderboard-modal.js` | Suspected (static) |
| F-011 | — | UF-05 | **Purchase / post-purchase** — **not classified** in static pass (poll cadence, fulfillment, cache invalidation). Classify after **P1-UF05** (§6 + §8). | `store-purchase-flow.js` | Not classified |
| F-012 | — | UF-06 | **Start game** — **not classified** in static pass (duplicate `POST …/start-game`, consume batching). Classify after **P1-UF06** (§6 + §8). | `game-service.js`, `game-pass-service.js` | Not classified |

---

## 5. Actions (planned / done)

_Only add rows after you decide to implement. Link PR or commit in **Done**._

| ID | Related finding | Action | Owner | Status |
|----|-----------------|--------|-------|--------|
| | | | | |

---

## 6. Runtime audit procedure (recommended)

1. **Pick a flow** from **§3** (use Flow ID).
2. **DevTools → Network:** filter by your **game backend** origin and, separately, **`sui-json-rpc`**, **`fullnode`**, wallet script host.
3. **Count duplicate URLs** or identical JSON-RPC bodies within a short window (e.g. 2 seconds)—candidates for dedupe or batch.
4. **Correlate** with server logs if you add temporary `[RPC]` tags (remove after audit).

---

## 7. Relation to other docs

- **`SUI_INTEGRATION_VS_CURRENT_COMPARISON.md`** — historical / branch comparison and methodology.  
- **This file** — ongoing **efficiency audit** of the **current** tree only.

---

## 8. Phased execution plan (complexity, value, checklist, status)

**Scope reminder:** This plan covers **chain-adjacent loading cost** (§1 channels A–E): game-backend HTTP, wallet balance calls, **Sui JSON-RPC via proxy**, Sonar, and direct `SuiClient` on the shooter backend. It is **not** “`suix_*` only.” For a **narrow** Sui-RPC-only pass, use the same phases but filter DevTools to **`sui-json-rpc`** (and optional fullnode) during **Phase 1**.

### 8.1 Legend

| Axis | **L (low)** | **M (medium)** | **H (high)** |
|------|-------------|----------------|--------------|
| **Complexity** | Hours; localized change; low regression risk | 1–2 days; multiple call sites or handlers | Multi-day; behavior change, broad refactors, or new contracts |
| **Value return** | Polish; helps edge timing | Clear win for a **subset** of flows or users | Fewer round trips or **lower p95** on hot paths; fewer upstream RPC hits |

**Status tokens:** `Not started` · `In progress` · `Blocked` · `Done` — edit this section as you work.

### 8.2 Phase overview

| Phase | Intent | Typical complexity | Typical value | Depends on |
|-------|--------|--------------------|---------------|--------------|
| **P1** | **Measure:** runtime traces for UF-01–UF-10; promote §4 rows from *Suspected* → *Verified* or close | L | **H** (informs spend) | — |
| **P2** | **Frontend dedupe** where P1 proved duplicate URLs (wallet, bootstrap+connect overlap, store/tournament churn) | M | M–H | P1 evidence |
| **P3** | **Backend Sonar batching** in handlers that still do sequential balance/object reads (F-003 pattern) | M | H on those routes | P1 optional; code read sufficient to start |
| **P4** | **SuiClient lifecycle audit** (F-004): ensure no per-request `new SuiClient` on user paths | L | M | grep + one handler review |
| **P5** | **Optional deep refactors** (e.g. tournament modal consolidation); UF-05/UF-06 **deep fixes** only if P1 shows pain | H | TBD by P1 | P1 + product priority |

**Recommended order:** **P1 → P4** (quick hygiene) **→ P3** (batch wins) **→ P2** (only where measured) **→ P5** (if still painful).

### 8.3 Flow coverage — all §3 flows (including not classified)

Every **UF-*** below maps to **exactly one** P1 checklist row so nothing is only “implied” by a bundled step. **Not classified** means no static efficiency verdict yet—**P1-UF\*** is the gate to set **§4** (e.g. F-011 / F-012) to `Verified` / `Closed` / new finding rows.

| Flow ID | Name | Static pass (this doc) | P1 checklist ID |
|---------|------|-------------------------|-----------------|
| **UF-01** | First load: shell, config, bootstrap | Reviewed (suspected items in §4) | P1-UF01 |
| **UF-02** | Wallet connect | Reviewed | P1-UF02 |
| **UF-03** | Main menu after connect | Reviewed | P1-UF03 |
| **UF-04** | Store & inventory modal | Reviewed | P1-UF04 |
| **UF-05** | Purchase / post-purchase | **Not classified** (F-011) | P1-UF05 |
| **UF-06** | Start game (regular) | **Not classified** (F-012) | P1-UF06 |
| **UF-07** | Tournament path | Reviewed | P1-UF07 |
| **UF-08** | Badges | Light static (not in earlier P1 bundle) | P1-UF08 |
| **UF-09** | Leaderboard & scores | Light static | P1-UF09 |
| **UF-10** | Achievements / milestones | Reviewed | P1-UF10 |

### 8.4 Checklists (update status in the last column)

#### P1 — Baseline & verification (one row per UF + meta)

| ID | Checklist item | Complexity | Value | Status |
|----|----------------|------------|-------|--------|
| P1-UF01 | Run **§6** for **UF-01** (hard refresh): `config`, `menu/bootstrap`, shell / duplicate scripts | L | H | Not started |
| P1-UF02 | Run **§6** for **UF-02**: wallet host + game backend burst; note duplicates within ~2s of connect | L | H | Not started |
| P1-UF03 | Run **§6** for **UF-03**: warm, stats, reservoir, inventory, game pass paths after menu visible | L | H | Not started |
| P1-UF04 | Run **§6** for **UF-04**: catalog, bundle/cache miss path, token prices, tab switches | L | H | Not started |
| P1-UF05 | Run **§6** for **UF-05**: purchase → fulfillment / polls → post-buy refetch; **then classify F-011** (close or replace with concrete finding) | L | H | Not started |
| P1-UF06 | Run **§6** for **UF-06**: credit start, double-click / retry; count **`POST …/start-game`** (or equivalent); **then classify F-012** | L | H | Not started |
| P1-UF07 | Run **§6** for **UF-07**: tournament list / past+active / detail / reservoir reads | L | H | Not started |
| P1-UF08 | Run **§6** for **UF-08**: badge display, optional mint/upgrade path; badge + balance-related calls | L | M | Not started |
| P1-UF09 | Run **§6** for **UF-09**: open leaderboard, submit score; overlap with stats / hydroscope URLs | L | M | Not started |
| P1-UF10 | Run **§6** for **UF-10**: milestone progress + achievements claim; duplicate `definitions` / `progress` GETs | L | M | Not started |
| P1-RPC | Optional **Sui-RPC-only** slice: filter `sui-json-rpc` (+ wallet if relevant); log duplicate **request bodies** | L | M | Not started |
| P1-§4 | Update **§4** (incl. F-011, F-012): set **Status** to `Verified` / `Closed` / `Won't fix` / add rows with evidence links | L | M | Not started |

#### P4 — Backend client hygiene (can parallel P1 after quick grep)

| ID | Checklist item | Complexity | Value | Status |
|----|----------------|------------|-------|--------|
| P4-1 | For each `new SuiClient(` hit in `apps/shooter-game/backend`, confirm **construction frequency** (init vs per-request) | L | M | Not started |
| P4-2 | If any user-serving route constructs per request, refactor to **shared client** or Sonar path; document in §5 Actions | M | M | Not started |

#### P3 — Backend Sonar / read batching

| ID | Checklist item | Complexity | Value | Status |
|----|----------------|------------|-------|--------|
| P3-1 | Inventory handlers in `balance-checker.ts` (and similar) that call **`getBalance` / `getObject` N times** sequentially | M | H | Not started |
| P3-2 | Apply **`callPlatformSonarBatch`** (or equivalent) on **one hot path**; measure before/after (logs or p95) | M | H | Not started |
| P3-3 | Roll forward to next worst handler only if P1/P3-2 shows benefit | M | M | Not started |

#### P2 — Frontend targeted dedupe (evidence-driven)

| ID | Checklist item | Complexity | Value | Status |
|----|----------------|------------|-------|--------|
| P2-1 | If P1 shows duplicate **wallet** MEWS/SUI reads (F-002): consolidate callers or add **single-flight + TTL** | M | M | Not started |
| P2-2 | If P1 shows **bootstrap + connect** double prefetch (F-006): single coordinator or shared in-flight key | M | M | Not started |
| P2-3 | If P1 shows store **reservoir-bundle** thrash (F-008): align cache TTL / warm `PlayerInventoryCache` after load | M | M | Not started |
| P2-4 | If P1 shows tournament **duplicate URLs** (F-009): dedupe by route + tab state in `tournament-modal.js` | M–H | M | Not started |

#### P5 — Optional deep work

| ID | Checklist item | Complexity | Value | Status |
|----|----------------|------------|-------|--------|
| P5-1 | Refactor tournament network layer behind one small **data module** (fetch + cache keys) | H | TBD | Not started |
| P5-2 | **UF-05** deep improvements **only if P1-UF05** showed issues (poll backoff, cancel on navigate away, redundant invalidations) | M | TBD | Not started |
| P5-3 | **UF-06** deep improvements **only if P1-UF06** showed issues (idempotency, UI double-submit guard, proof of single consume) | M | TBD | Not started |

### 8.5 Roll-up status (edit me)

| Phase | Roll-up status | Notes |
|-------|----------------|-------|
| P1 | Not started | |
| P2 | Not started | Blocked on P1 evidence for items P2-* |
| P3 | Not started | Can start code survey in parallel with P1 |
| P4 | Not started | Quick win path |
| P5 | Not started | Optional |
