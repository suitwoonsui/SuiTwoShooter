# `origin/sui-integration` vs **your current codebase** (`apps/shooter-game`)

## Purpose (loading perspective)

This comparison exists to improve **how loading feels and behaves for the player** and for **operators hitting the game stack**—not to pick a “winning branch” in the abstract. Typical levers include:

- **Fewer / smarter RPC and HTTP calls** (dedupe, batch, proxy through the game backend where appropriate, avoid redundant full-network round trips).
- **Caching that is correct** (TTL, invalidation on purchase / consume / wallet change, shared cache across UI surfaces).
- **Loading order** (script dependencies, menu vs game paths, warm routes, avoid races where UI reads globals before modules attach).
- **Other loading-adjacent considerations** (perceived performance: skeletons vs spinners, parallel vs sequential fan-out, payload size, error/retry behavior so “loading” doesn’t hang silently, first interactive frame, audio/asset prioritization).

### RPC and network audit scope (methodology)

**Why reviews often start with one path (e.g. token balances):** same feature exists on both sides of a branch diff, so you can compare behavior quickly. That does **not** mean other RPC is unimportant.

**“All RPC” spans several channels** (each needs its own checklist or trace):

| Channel | Examples | How to audit (suggested) |
|---------|----------|---------------------------|
| **Browser → Sui JSON-RPC** | `fetch` to `fullnode.*.sui.io` or to `{game backend}/api/sui-json-rpc` with `suix_*` / `sui_*` JSON bodies | DevTools **Network**: filter by domain / path; repo **`git grep`** for `fullnode.`, `suix_`, `sui-json-rpc` under `apps/shooter-game/frontend`. |
| **Game backend → Sui** | `@mysten/sui` `SuiClient`, `devInspect*`, `dryRun*`, `execute*`, `getObject`, etc. | **`git grep`** for `SuiClient`, `getFullnode`, method names under `apps/shooter-game/backend`; trace from the **API route** that triggered the read. |
| **Game backend → Aqueduct** | `callPlatformBackend`, HTTP to platform | Not Sui RPC, but still **loading/network**—count and parallelize separately. |
| **Wallet / dApp kit** (often off-game tree) | UMD bundle, wallet adapter | May not appear in `apps/shooter-game` sources; validate with **Network** while connecting / signing. |

**Limits of static grep:** SDK wrappers, dynamic method names, and shared libs can hide string matches. **Grep counts file hits, not runtime call counts.** Treat grep as a **map**, then confirm hot paths with **Network** or logging.

**Optional one-liners** (working tree vs `origin/sui-integration`, under `apps/shooter-game`):

```bash
git grep -l "fullnode\\.testnet\\.sui" -- apps/shooter-game/frontend apps/shooter-game/backend
git grep -l "sui-json-rpc" origin/sui-integration -- apps/shooter-game
git grep -l "SuiClient" -- apps/shooter-game
git grep -l "SuiClient" origin/sui-integration -- apps/shooter-game
```

**Documented finding (branch tip check, not a product decision):** On `origin/sui-integration` at the time of review, `apps/shooter-game` had **no** `app/api/sui-json-rpc` route and **no** `lib/rpc/ordered-sui-rpc-urls.ts`; the working tree included both. Token balance code on the branch used **direct** fullnode URLs; the working tree preferred **`/api/sui-json-rpc`** plus cache / in-flight dedupe in `token-balance-utils.js`. **Re-verify** after `git fetch` if the remote branch moves.

Use the diff vs **`origin/sui-integration`** to **spot ideas** (things the branch did that you might want) and **spot regressions** (things you might have lost or over-corrected)—then record **your** decisions in §8–9.

---

## Comparison scope (strict)

| In scope | Out of scope |
|----------|----------------|
| **`origin/sui-integration`** on GitHub as the **sole** remote baseline for this exercise | Other branches (`main`, `port-restore-*`, etc.) unless you explicitly open a **separate** doc |
| **Your current codebase** = **working tree + index** under `apps/shooter-game/` (what you run and edit now) | Comparing arbitrary other commits as a second baseline here |
| Optional: `git diff origin/sui-integration HEAD -- apps/shooter-game` | Treating that optional diff as the **definition** of “current”—it is only “last **commit** vs branch,” useful if `HEAD` matches disk |

Commands for the **primary** comparison (current tree vs branch):

```bash
git fetch origin sui-integration
git diff --shortstat origin/sui-integration -- apps/shooter-game
git diff origin/sui-integration -- apps/shooter-game
```

---

**Living document:** Sections 0–7 are baseline comparison material. **§8–9** record **your** decisions and planned/done changes after explicit agreement.

| Field | Value |
|-------|--------|
| Last comparison refresh (optional) | _fill when you re-run `git fetch` + diff_ |
| Baseline remote | **`origin/sui-integration` only** |
| Current side | **Working tree + index**, `apps/shooter-game/` |
| **Active work** | RPC / loading **efficiency audit** (current tree only): **`RPC_EFFICIENCY_AUDIT.md`** |

---

## 0. What “current codebase” means (and why `HEAD` was wrong here)

| Term | Meaning |
|------|--------|
| **`HEAD`** | The **last commit** on your current branch. It is a **frozen snapshot in Git**, not “whatever is in your editor right now.” |
| **Working tree** | The **files on disk** in your clone—saved in the IDE, including **uncommitted** work. |
| **Index / staging** | Changes you have **`git add`**’d but not yet committed. |

**Your situation:** If recovery work exists **only on disk** and you **have not committed** it, then **`HEAD` is older than your real codebase.** Any comparison that pins the right-hand side to **`HEAD`** (`git diff origin/sui-integration HEAD`) **understates** how far you are from `sui-integration`.

**This document’s primary comparison** (same as **Comparison scope** above):

**`origin/sui-integration` → your working tree + index** under `apps/shooter-game/`:

```bash
git fetch origin sui-integration
git diff --shortstat origin/sui-integration -- apps/shooter-game
git diff origin/sui-integration -- apps/shooter-game
```

That diff is “**`sui-integration` branch vs what I have on disk now** (including uncommitted changes).”

**Optional (secondary):** last **commit** only vs the same branch—**not** a substitute for “current codebase” if disk has moved:

```bash
git diff --shortstat origin/sui-integration HEAD -- apps/shooter-game
```

---

## 1. Executive summary (working tree vs `origin/sui-integration`)

**Remote tip (reference):** `origin/sui-integration` at `453189d3943fead479598d830882572c67aff068` (at doc refresh time).

**Local branch (last commit only, for context):** `restore_preprocess_2` at `1dad7025ccbbd255938b4599a9e81341c418a298` — **may be behind your disk** if you have not committed recovery work.

### 1.1 Aggregate diff: **working tree** vs `origin/sui-integration` (`apps/shooter-game/`)

| Metric | Value |
|--------|------:|
| Files changed (any type) | **2,012** |
| Lines added (toward your tree) | **~196,637** |
| Lines removed (from `sui-integration` baseline) | **~24,853** |
| Files **only in your tree** (added vs branch) | **1,422** |
| Files **removed vs branch** (existed on `sui-integration`) | **168** |
| Files **modified** on both sides | **117** |

### 1.2 Same diff but **last commit only** (`HEAD` vs branch) — understates recovery

If you diff **`HEAD`** instead of the working tree, Git reported roughly **1,726** files / **~101k** insertions / **~24k** deletions for `apps/shooter-game/` — **smaller** than the working-tree numbers above. That gap is **uncommitted (and possibly un-staged) work** sitting on disk after the bad overwrite / recovery.

**Plain-language read:** Under `apps/shooter-game/`, **your actual tree (disk) is overwhelmingly ahead of** `origin/sui-integration`: new admin surfaces, API routes, proxies, frontend modules, etc. **`sui-integration` is not a substitute** for that tree; it is an **older, thinner** snapshot of the same folder.

**“Better” in general:** For **shipping the Aqueduct-backed game + admin + proxies**, **prefer your current files on disk** over `sui-integration`. Mine `sui-integration` **selectively** (specific files/hunks) if you discover a regression, not as a wholesale rollback.

---

## 2. File-change shape (what kind of difference this is)

### 2.1 Mostly new in **your tree** (not on `sui-integration`)

Examples (non-exhaustive): full **Next admin** under `backend/app/admin/`, large **`backend/app/api/admin/*`** and **`backend/app/api/store/admin/*`**, **`backend/app/api/menu/bootstrap`**, **`backend/app/api/menu/player-warm`**, **`backend/app/api/sui-json-rpc`**, **`backend/app/api/player/reservoir-bundle`**, many **`game-config`**, **`badges`**, **`inventory`**, **`platform/*`** proxies, etc.

| Verdict | **Prefer your current tree** for operations, platform parity, and anything Aqueduct expects the game backend to expose. |

### 2.2 Present on `sui-integration` but **gone** in your tree

**API / routing (meaningful)**

| Path (on `sui-integration`) | Interpretation | Better |
|-----------------------------|----------------|--------|
| `backend/app/api/store/inventory/[address]/route.ts` | Consolidated elsewhere (e.g. **`/api/inventory/[address]`**) | **Prefer your tree** if all callers migrated; **keep or restore `sui-integration` route** only while something still hits the old URL. |
| `backend/app/api/store/items/route.ts` | Removed | **Prefer your tree** if stockroom/catalog replaced it; **verify** no stale client. |
| `backend/app/api/store/merge/route.ts` | Removed | **Prefer your tree** if merge lives under **`/api/inventory/merge`** (or equivalent); **verify** clients. |

**Contracts / build output**

| Path | Better |
|------|--------|
| `contracts/suitwo_game/**` including **`build/`** artifacts | **Prefer your tree** if sources moved to **`contracts-obsolete`** or build output is **not** versioned. **Prefer `sui-integration`** only for a **frozen bytecode audit**. |

### 2.3 Modified on both sides (true forks)

Worth a **file-by-file** diff if you suspect a specific regression; default assumption: **Aqueduct + game-backend proxy** on **your tree** is canonical.

---

## 3. Loading, bootstrap, and data-flow (frontend + matching backend)

### 3.1 Script pipeline — `lazy-loader.js`

| Observation | Better |
|---------------|--------|
| **Your branch’s committed snapshot** loads more early scripts than `sui-integration`: e.g. **`api-request-cache.js`**, **`game-api.js`**, **`stats-service.js`**, store modularization, **`player-inventory-cache.js`**, **`store-bundles-tab`**, **`menu-panel-loading`**, different achievement vs leaderboard ordering. | **Prefer your tree** for centralized API base, dedupe/cache, inventory prefetch, and store alignment—**after** you confirm **disk** matches intent (commit when stable). |
| **`sui-integration`** still wires some **legacy** pieces (`leaderboard-local.js`, legacy **`leaderboard-system.js`**, **`inventory-manager.js`**, **`badge-ui-migration.js`**) and omits several of the loads above. | **Prefer `sui-integration`** only for **minimal debug** loads; not as mainline without re-validating Aqueduct. |

Line counts from **last commit** at doc time: **`lazy-loader.js`** ~489 lines on `sui-integration` vs ~634 on **`HEAD`**; **your working copy may differ** from `HEAD` if you edited without committing.

### 3.2 Menu / wallet boot — `ui-initialization.js`

Large expansion on **your branch** vs `sui-integration` in committed history; **working tree may be larger still.**

| Verdict | **Prefer your tree** for full menu bootstrap—**unless** you measure a startup regression; then trim on **disk**, then commit. |

### 3.3 Game init — `game-initialization.js`

| Verdict | **Prefer your tree** as the integration hub; diff `sui-integration` only for a **known** lost behavior. |

### 3.4 Data flow — `game-data-flow-*`, `player-inventory-cache.js`

| Component | Better |
|-----------|--------|
| **`player-inventory-cache.js`**, **`stats-service.js`**, **`game-api.js`** | Present in **your branch’s direction** vs `sui-integration` → **prefer your tree** for caching and API guardrails. |
| **`game-data-flow-*`** split | **Prefer your tree**; re-open **`sui-integration`** only for a specific algorithm to **port forward**. |

### 3.5 Backend warm / batch reads

| Route | On `sui-integration` | Better |
|-------|----------------------|--------|
| **`app/api/menu/bootstrap/route.ts`** | Missing | **Prefer your tree** |
| **`app/api/menu/player-warm/route.ts`** | Missing | **Prefer your tree** |
| **`app/api/sui-json-rpc/route.ts`** | Missing | **Prefer your tree** (if RPC is backend-mediated) |

---

## 4. RPC, scores, leaderboard (selected backend)

| Area | Trend (your direction vs `sui-integration`) | Better |
|------|-----------------------------------------------|--------|
| **`app/api/leaderboard/route.ts`** | Net shrink in committed diff vs `sui-integration` | **Prefer your tree** if delegation to platform is correct; mine **`sui-integration`** only if a required feature vanished. |
| **Scores trace / verify** | Non-trivial edits | **Prefer your tree** unless audit needs old shape—then **port forward**. |
| **Store purchase / consume / migrate** | Changed | **Prefer your tree** for Stockroom/Terminal alignment; **E2E validate**. |

---

## 5. “Better” quick-reference

| Topic | Prefer **your current tree (disk)** | Prefer **`origin/sui-integration`** |
|-------|-------------------------------------|----------------------------------------|
| Full game backend + admin | Yes | No (incomplete vs you) |
| Menu bootstrap / player-warm | Yes | No (routes absent there) |
| `GameApi` + inventory cache + stats | Yes | No |
| Smaller `lazy-loader` | No (default) | Yes, **temporary debug only** |
| Old **`/api/store/inventory`** URLs | No | Yes, **until** callers migrated |
| Versioned contract **build/** artifacts | No | Yes, **audit-only** |

---

## 6. What you should do next (Git hygiene after recovery)

1. **`git status`** — see everything not in the last commit.  
2. **`git diff origin/sui-integration -- apps/shooter-game`** — truth vs remote for **disk + staged**.  
3. **Commit** (or split commits) when stable so **`HEAD` matches reality** and future docs/comparisons are not misleading.  
4. **`git diff origin/sui-integration HEAD -- path`** — only when you explicitly want “**last commit** vs remote,” not “current codebase.”

---

## 7. Scope & revision

- **Path scope:** `apps/shooter-game/` only (not Aqueduct Platform–only paths in this file).  
- **Git baseline:** **`origin/sui-integration` only** for the loading comparison—refresh `git fetch origin sui-integration` and update the SHA in §1 when you care about drift.  
- **Refresh:** Re-run the §0 diff commands after large edits or before a release review.

---

## 8. Decision log

Record **agreed outcomes** from the section-by-section review—**only after you explicitly agree** in discussion (do not treat assistant suggestions as decided). One row per decision. **Status:** `Proposed` → `Agreed` → `Superseded`.

| ID | Date (ISO) | Doc § | Decision (short) | Rationale / notes | Status |
|----|-------------|-------|------------------|-------------------|--------|
| _(none)_ | | | | | |

_Remove the placeholder row when the first real decision is added._

---

## 9. Change / implementation log

Track **what you will change** or **what you changed**, tied to decisions where helpful. **Status:** `Planned` → `In progress` → `Done` or `Deferred`.

| ID | Date (ISO) | Related decision | Change (summary) | Area (path / feature) | Status | Verification (e.g. PR, commit, manual test) |
|----|-------------|------------------|------------------|----------------------|--------|-----------------------------------------------|
| C-001 | | D-___ | _example: Add redirect from legacy `/api/store/inventory` to `/api/inventory`_ | backend routes | Planned | |

_Rules of thumb:_  
- Prefer **one C-row per shippable slice** (easier to verify than one giant row).  
- When code lands, add **commit hash or PR link** in the last column and set status to **Done**.  
- If you abandon an idea, set **Deferred** and note why (optional row in §8 to supersede the decision).

---

## 10. Section-by-section review checklist (optional)

Use this as a pacing aid; tick when **§8** has at least one **Agreed** row for that section’s topics (or explicitly “no action”).

| § | Topic | Reviewed (Y/N) | Decision IDs |
|---|--------|----------------|--------------|
| 0 | Terminology, diff commands, HEAD vs disk | | |
| 1 | Executive summary, scale of diff | | |
| 2 | File-change shape, removed routes, contracts | | |
| 3 | Loading, bootstrap, data-flow | | |
| 4 | RPC, scores, leaderboard | | |
| 5 | Quick-reference “better” table | | |
| 6 | Git hygiene next steps | | |
| 7 | Scope / refresh | | |
