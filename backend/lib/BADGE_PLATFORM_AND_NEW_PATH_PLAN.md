# Badge: platform mint via Channel, new path only, then remove legacy

This plan addresses:

1. **Platform mint API** — Move to Channel service pattern (build → sign → execute); player signs mint when possible.
2. **Actions on new path** — All badge behavior through platform; identify what stays and what is removed.
3. **Order of work** — New structure and same functionality first; remove legacy only after.

---

## Status (where we are)

| Item | Status |
|------|--------|
| **New path (platform only)** | ✅ Done. hasBadge, getBadge, mint build, upgrade build, tier config, games played, discounts all go through platform (Shipyard, Sonar, Hydroscope, Aquifer `badge_discounts_and_thresholds`). |
| **Game backend – remove legacy** | ✅ Done. `badge-service.ts` is platform-only: `usePlatformBadges()` removed; all legacy branches (badgeQueries / badgeTransactions) removed; BadgeQueries and BadgeTransactions no longer used by BadgeService. Config and docs: BADGE_REGISTRY documented as legacy/unused; BADGE_MINT_UPGRADE_CHECKLIST updated. |
| **Platform: shipyard-mint in Channel batch** | Platform work; game can use `POST /api/shipyard/mint` with `execute: false` and player as sender, then `POST /api/channel/execute`. |
| **Player-signed mint (Move/contract)** | Optional platform contract change so player can sign mint; until then, platform-sign path or execute: true remains an option. |

**Done:** Unused modules `badge-queries.ts` and `badge-transactions.ts` removed (no remaining imports). Badge-images remains for image loading.

---

## 1. Target: mint via Channel (player signs)

### 1.1 How Channel works today

- **Build:** `POST /api/channel/batch` with `{ operations: [{ operationId, params }] }` → returns `{ transactions: [base64, ...] }`. Or direct POST to a service (e.g. `POST /api/shipyard/upgrade`).
- **Execute:** `POST /api/channel/execute` with `{ transactionBytesBase64, signature }` → platform submits the signed tx. **Platform never signs**; the client (game/frontend) has the signer sign, then sends the signed payload to execute.
- **Upgrade** already follows this: batch handler `shipyard-upgrade` builds tx with `sender: player`, returns tx, **player** signs, game/frontend calls `POST /api/channel/execute`.

### 1.2 Mint today

- **POST /api/shipyard/mint** with `execute: true` → platform builds mint tx (with **platform** as sender), platform signs and executes. Returns `{ success, digest }`.
- **POST /api/shipyard/mint** with `execute: false` (default) → platform builds mint tx with `sender: params.sender || params.recipient` (player). Returns `{ success, transaction }`. Platform comment: *“Admin cap is platform-owned, so for client-sign flow the tx will fail.”* So the **Move contract** likely requires the transaction signer to own (or have) the admin cap; today that’s the platform. So even if we return the tx to the player and they sign, the Move call would fail at execution because the player doesn’t have the admin cap.

### 1.3 What “mint via Channel” should mean

- **Same pattern as upgrade:** build (via Channel batch or direct shipyard/mint) → return unsigned tx → **player** signs → `POST /api/channel/execute`. No platform sign.
- **Requirement:** The Shipyard **Move** mint entry point must allow a tx that the **player** (recipient) can sign. Options:
  - **A.** New Move entry point (e.g. `mint_with_cap`) that takes a capability the **app/Corridor** gives to the recipient, so the recipient can sign and mint without holding the global admin cap.
  - **B.** Admin cap is passed as a shared object and the contract allows a designated “mint for recipient” flow where the recipient is the signer (if the contract supports it).
  - **C.** Keep a single signer = platform for mint (so platform signs), but **submission** still goes through `POST /api/channel/execute` so all execution is channel-mediated; the game would call a “platform sign then submit via channel” helper. That does not achieve “player signs mint” but unifies execution path.

**Recommendation:** Aim for **player signs mint** (A or B). That requires a **platform Move/contract change** so the built mint tx can be valid when the signer is the player. Until that exists, we can still:
- Add a **Channel batch** handler `shipyard-mint` that builds the mint tx (with sender = player) and returns it, so the game uses the same batch + execute flow as upgrade.
- If the contract today rejects player-signed mint, we document “player signs” as the target and keep a temporary path (e.g. `execute: true` or a dedicated “platform sign and submit” step) until the contract is updated.

### 1.4 Platform changes to implement

| Item | Description |
|------|-------------|
| **Add `shipyard-mint` to Channel batch** | In `batch-handlers.ts`, add handler that accepts params (e.g. `recipient`, `sender` = player, `soulbound`, `collectionId`, `metadata`), calls `shipyard.buildMintTransaction({ recipient, sender: params.sender ?? recipient, soulbound, collectionId, metadata })`, returns `[result.transaction]`. Register in `BATCH_HANDLERS` and in channel route’s `batchableOperationIds`. |
| **Optional: Move/contract** | If we want player to sign mint: add or adjust Shipyard mint so that a tx built with sender = recipient can succeed (e.g. capability-based mint or shared admin). |
| **Mint route comment** | Update `/api/shipyard/mint` doc to say: target flow is build (execute: false) → player signs → `POST /api/channel/execute`; when contract allows player signer, game should use that. |

---

## 2. New path: all badge actions through platform

All badge behavior should go through the **platform**; nothing through the old game-owned registry/chain path.

| Action | New path (platform) | Notes |
|--------|---------------------|-------|
| **Has badge?** | `GET /api/shipyard/has-badge` (game: `getHasSoulboundBadge`) | Already platform. |
| **Get badge (tier, etc.)** | Shipyard has-badge + Sonar `getObject(badgeId)` for tier | Already platform. |
| **Tier definitions / discounts** | Aquifer `badge_discounts_and_thresholds` (game: `getBadgeTierConfigFromPlatform` via app-config) | Already platform. |
| **Games played** | Hydroscope (game: `platformStatsClient.getPlayerStats`) | Already platform. |
| **Build upgrade tx** | `POST /api/shipyard/upgrade` or Channel batch `shipyard-upgrade` | Already platform; player signs, then `POST /api/channel/execute`. |
| **Build mint tx** | `POST /api/shipyard/mint` with `execute: false` and `sender: playerAddress`, **or** Channel batch `shipyard-mint` (once added) | Same flow: return tx → player signs → `POST /api/channel/execute`. |
| **Execute signed tx** | `POST /api/channel/execute` | Single place for all player-signed execution. |
| **Discounts** | Game uses tier from getBadge(); getDiscounts(tier) from badge-utilities or (later) from Aquifer tier config | Game logic; tier source is platform. |

So the **new structure** is: game never reads or writes badge state from the game package’s chain (no BadgeRegistry, no legacy badge Queries/Transactions for chain). All reads: Shipyard + Sonar + Hydroscope + Aquifer. All mint/upgrade: build via platform (direct or Channel batch) → player signs → Channel execute.

---

## 3. What to remove (only after new path is in place) — ✅ DONE

Completed: legacy chain path removed; badge-service is platform-only.

- **Legacy chain path in badge-service:** ✅ Removed. All branches that used `badgeQueries.*` / `badgeTransactions.*` were removed. The only path is platform (getHasSoulboundBadge, buildShipyardBadgeMint, buildShipyardBadgeUpgrade, getBadgeTierConfigFromPlatform, etc.).
- **usePlatformBadges():** ✅ Removed. Code is platform-only; no branching on “platform vs legacy.”
- **Config:** ✅ BADGE_REGISTRY_* documented as legacy/unused in config and BADGE_MINT_UPGRADE_CHECKLIST; no code path requires it for the primary badge flow.
- **Legacy modules:** BadgeQueries and BadgeTransactions were removed. The modules `badge-queries.ts` and `badge-transactions.ts` have been deleted (no remaining imports). Old-contract migration in badge-service uses raw Transaction/devInspect, not those modules.

---

## 4. Order of work (new structure first, then remove)

1. **Platform**
   - Add `shipyard-mint` to Channel batch (build only; return tx; sender = player when possible).
   - Optionally: Move/contract change so player-signed mint is valid when desired.
   - Doc: mint target flow = build → player sign → Channel execute.

2. **Game backend – new path** ✅ (step 1 done)
   - **Mint:** Switched to build-only: call platform mint with `execute: false` and `sender: playerAddress` (or Channel batch `shipyard-mint` once available). Return tx to frontend; frontend gets player signature; game (or frontend) calls `POST /api/channel/execute`. If contract still requires platform sign, keep a temporary “platform sign and submit” path until contract is updated, but prefer the same API shape (build → sign → execute).
   - **Upgrade:** Already build → player sign → execute; confirm it uses Channel execute.
   - **Rest:** hasBadge, getBadge, tier config, games played, discounts already use platform; no change except to stop using legacy branches.

3. **Game backend – remove legacy** ✅ Done
   - Legacy badge chain path removed: usePlatformBadges removed; badgeQueries/badgeTransactions removed from BadgeService; all methods use platform path only.
   - BADGE_REGISTRY and legacy config cleaned from config comments and BADGE_MINT_UPGRADE_CHECKLIST.

4. **Docs**
   - BADGES_HOLISTIC.md already updated (player signs mint; platform only; games played not on NFT). Keep this plan next to it so implementation order is clear.

---

## 5. Summary

| Goal | Status |
|------|--------|
| **All actions on new path** | ✅ Done. All badge reads and builds go through platform (Shipyard, Sonar, Hydroscope, Aquifer); execution through Channel execute where applicable. |
| **Remove legacy** | ✅ Done. BadgeService is platform-only; no badgeQueries/badgeTransactions; BADGE_REGISTRY documented as unused. |
| **Mint via Channel** | Game uses build → player sign → execute when contract allows. Platform may add `shipyard-mint` batch handler; optional Move change for player-signed mint. |

The game backend badge flow is now platform-only. Remaining work is on the platform side (batch mint handler, optional contract change for player-signed mint). Unused badge-queries and badge-transactions modules have been removed.
