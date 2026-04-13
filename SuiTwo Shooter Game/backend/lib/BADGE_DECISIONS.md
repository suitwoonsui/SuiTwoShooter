# Badge items – decisions and actions

Summary of badge-related findings from the lib validation and the decisions we need.

**Context:** For a holistic view of what badges do, what the platform provides, and what the game handles, see [BADGES_HOLISTIC.md](./BADGES_HOLISTIC.md).

---

## 1. badge-service-stub.ts

**State:** No callers. Every `getBadgeService()` import points to `badge-service.ts`; the stub is never imported.

**Options:**

- **A. Remove** – Delete the file. No behavior change.
- **B. Keep as optional entry** – Document that to “disable” badges you could swap the app to use this stub instead of the real service (would require a different entry point or env-based wiring). Current codebase does not do this.

**Recommendation:** **A. Remove** – Unused and duplicates the name `getBadgeService` in a way that can only cause confusion.

---

## 2. discount-tiers-platform.ts

**State:** No imports. Defines `getDiscounts(tier)` returning only `{ gameplay }` (no `store`). `badge-utilities.ts` already has a fuller `getDiscounts(tier)` with both `store` and `gameplay` and is used everywhere.

**Options:**

- **A. Remove** – Treat as dead code.
- **B. Merge** – If we ever want a “gameplay-only” discount helper, we could add it to badge-utilities and delete this file. Right now nothing uses it.

**Recommendation:** **A. Remove** – Unused; discount logic lives in badge-utilities.

---

## 3. badge-errors.ts & badge-validators.ts (legacy re-exports)

**State:** No callers. No file imports `BadgeError`, `BadgeErrorCode`, `BadgeValidators`, or `BadgeResult` from these modules. All code uses `PlatformError` / `PlatformValidators` from `@/lib/services/platform/errors` or `platform/validators` (or `@platform`).

**Options:**

- **A. Remove both** – Delete the two files. No call sites to update.
- **B. Keep** – Retain for possible future “legacy” or external use. Currently they only add indirection.

**Recommendation:** **A. Remove both** – Dead code; platform names are the single source of truth.

---

## 4. badge-logger.ts (BadgeLogger = PlatformLogger)

**State:**

- **Game path** `@/lib/services/badge/utilities/badge-logger`: used by several admin/tournament/badge/store routes.
- **Platform path** `@platform/lib/sui/badge-logger`: used by several other routes (tournaments, store, scores, milestones, stats, inventory). Platform may or may not expose this path; game’s file is a thin re-export of PlatformLogger.
- **Bug:** `payment-transaction-builder.ts` has `require('./badge-logger').BadgeLogger` (wrong path; that file is not in wallet/payments). The next line uses `PlatformLogger` which is also not imported in that file – so that file has a missing import and dead require.

**Options:**

- **A. Standardize on PlatformLogger** – Replace every `BadgeLogger` usage with `PlatformLogger` and import from `@/lib/services/platform/logging/platform-logger` (or `@platform`). Then delete badge-logger.ts. Fix payment-transaction-builder: add PlatformLogger import, remove the two require lines.
- **B. Keep badge-logger as thin re-export** – Keep the file. Fix payment-transaction-builder to import BadgeLogger from `@/lib/services/badge/utilities/badge-logger`. Optionally migrate routes that use `@platform/lib/sui/badge-logger` to the game path so there’s one source.

**Recommendation:** **A** – One logger name (PlatformLogger), one place. Fewer concepts and no deprecated alias. Requires updating all current BadgeLogger call sites and fixing payment-transaction-builder (add PlatformLogger import, remove broken require).

---

## 5. Core badge modules (keep as-is)

No removals or renames proposed for:

- **badge-service.ts** – Main service; used everywhere; platform-connected.
- **badge-utilities.ts** – calculateTierFromGames, getDiscounts; used.
- **badge-image-cache.ts**, **badge-request-cache.ts**, **badge-image-validator.ts** – Used by badge-service and submodules.
- **badge-retry-queue.ts**, **badge-reconciliation.ts**, **badge-images.ts** – Used; no changes. **badge-transactions.ts** and **badge-queries.ts** – Removed (unused; badge flow is platform-only).

---

## Action checklist — done (Option A for all)

| Decision | Action |
|----------|--------|
| **1. badge-service-stub** | Done: deleted. |
| **2. discount-tiers-platform** | Done: deleted. |
| **3. badge-errors / badge-validators** | Done: deleted both. |
| **4. badge-logger** | Done: BadgeLogger → PlatformLogger everywhere; deleted badge-logger.ts. |

Cleanup applied. I’ll available if needed.
