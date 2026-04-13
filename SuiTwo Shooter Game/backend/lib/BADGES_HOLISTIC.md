# Badges: holistic view (goals, platform, game responsibilities)

This document clarifies: **what we want badges to do**, **what the Aqueduct platform provides**, and **what the game backend must do**. Use it to align cleanup and validation.

---

## 1. What we want badges to do

- **Identity / proof of play:** A soulbound NFT that represents “this player has played this game” and cannot be transferred.
- **Tiers:** Advancement by games played (e.g. Standard → Common → … → Legendary). **Only the tier** (and display metadata: name, image) is stored on the badge NFT. **Games played is not stored on the NFT**—that would require upgrading the NFT after every game (bad for players: cost and UX). Games played lives in **Hydroscope** (stats); the NFT is only updated when the player **earns a tier upgrade**.
- **Benefits:** Discounts in the **store** (purchase/merge) and in **gameplay** (e.g. tournament reward cost). Discount % depends on tier.
- **Single source of truth:** Tier definitions (thresholds, labels, image URLs, discount %) are configurable on the platform so the game doesn’t need a deploy to change them.

So: **mint once per player** (player signs), **upgrade tier only when they cross a threshold** (player signs), **use tier for discounts and display**. Games played = Hydroscope only.

---

## 2. What the platform provides (Aqueduct)

The platform owns **on-chain badge NFTs** and **definition storage**. The game talks to it via HTTP.

### 2.1 Shipyard (NFT lifecycle)

| Capability | Platform API | What it does |
|------------|--------------|--------------|
| **Has badge?** | `GET /api/shipyard/has-badge?address=0x...&collectionId=...` | Returns whether the address has a soulbound Shipyard NFT in that collection; can return `badgeId`. |
| **Mint** | `POST /api/shipyard/mint` | **Builds** the mint tx; **player** signs and submits (same as upgrade). Platform does not sign the mint—the player does. (Current game code may still use `execute: true`; target is build-only, player sign.) |
| **Upgrade** | `POST /api/shipyard/upgrade` | Builds an **unsigned** upgrade tx (new tier metadata: name, image_url, attributes). **Player** signs and submits (they own the badge). |

- **Identity:** Game sends `X-Corridor-Capability-Object-Id` (and optionally `X-API-Key`). Platform derives ecosystem/app from the cap; no need to send X-Ecosystem-Id / X-App-Id for these.
- **Collection:** `collectionId` (e.g. `{ecosystemId}-badge` or `app-badge`) scopes “badge” to this app so one Shipyard package can serve many games.

### 2.2 Aquifer (definitions)

| What | Key | Purpose |
|------|-----|--------|
| **Badge discounts & thresholds** | `badge_discounts_and_thresholds` | Single source of truth: thresholds (games → tier), and per-tier **storeDiscount** / **gameplayDiscount** arrays. Value = base64(JSON). |

- **Read:** app-config uses Aquifer definition `badge_discounts_and_thresholds` to build `badgeConfig` (storeDiscounts, gameplayDiscounts, thresholds, version). `getBadgeTierConfigFromPlatform()` derives tier metadata from this `badgeConfig`.
- **Write:** Platform admin (or game with CorridorAdminCap) sets definitions; game typically only reads.

### 2.3 Hydroscope (stats)

- **Games played** (or equivalent) for “deserved tier” comes from **Hydroscope** (e.g. `GET /api/hydroscope/{address}` → `totalGames`).
- Game already uses `platformStatsClient.getPlayerStats()` for this.

### 2.4 Sonar (chain read)

- To get **current tier** from the badge NFT, the game (or platform) reads the object via **Sonar** (`getObject(badgeId)`) and parses **tier** (and display metadata) from NFT. The NFT does **not** store “games played”—that would force an upgrade every game; only tier and display info live on the NFT.
- Platform could extend `has-badge` to return `tier` (and optionally `imageUrl`) to avoid a separate getObject; today the game does getObject when using platform path.

So: **platform** = Shipyard (mint/upgrade/has-badge), Aquifer (tier definitions), Hydroscope (games played), Sonar (read badge object). **Platform does not** run game logic (e.g. “should we show upgrade?” or “what discount for this cart?”).

---

## 3. What the game backend must handle

The game is the **orchestrator**: it uses platform APIs and applies **game rules** (when to mint, when to upgrade, what discount to apply).

### 3.1 Platform only (no legacy)

- **We are moving fully to the platform.** There is no supported “legacy” path. The game uses **platform only** for badges:
  - `hasBadge` / `getBadge` → platform Shipyard + Sonar.
  - Mint → platform `POST /api/shipyard/mint` (build); **player** signs and submits.
  - Upgrade → platform `POST /api/shipyard/upgrade` (build); player signs and submits.
  - Tier definitions / discounts → Aquifer `badge_discounts_and_thresholds` (with in-code fallback).
  - Games played → Hydroscope only (never stored on the NFT).
- **Legacy code** (game-owned badge registry, `badgeQueries` / `badgeTransactions` chain path) is being **removed**, not kept as an alternative. Cleanup: remove or deprecate legacy badge paths so the codebase is platform-only.

### 3.2 Game responsibilities (platform path)

| Responsibility | Where it lives | Notes |
|----------------|----------------|-------|
| **Call platform** | `platform-client` (getHasSoulboundBadge, mintSoulboundBadge, buildShipyardBadgeUpgrade, getBadgeTierConfigFromPlatform) | Game just calls; platform does chain write/read and definition read (badge tiers derived from `badge_discounts_and_thresholds` via app-config). |
| **Decide “has badge?” / “get badge”** | `badge-service` (hasBadge, getBadge) | Uses Shipyard has-badge; for getBadge also uses Sonar getObject to read current tier from NFT. |
| **Decide “deserved tier”** | `badge-service` (computeDeservedTier) | Uses Hydroscope games played + Aquifer tier config (or in-code thresholds). |
| **Decide “needs upgrade?”** | `badge-service` (checkBadgeUpgrade) | Compares deserved tier vs current tier from badge NFT. |
| **Build upgrade tx** | `badge-service` (buildUpgradeBadgeTransaction) | Calls platform buildShipyardBadgeUpgrade with metadata from tier config; returns unsigned tx for **player** to sign. |
| **Apply discounts** | Store/tournament routes + `badge-utilities.getDiscounts(tier)` | Game gets tier from getBadge(); applies store/gameplay discount % in purchase, merge, reward cost. Today discount numbers are in-code in `badge-utilities`; they could instead be read from Aquifer `badge_discounts_and_thresholds` for a single source of truth. |
| **Mint (first-time)** | `badge-service` (mintBadgeForPlayer, adminMintBadge) | Calls platform to **build** mint tx; **player** signs and submits (same as upgrade). No platform sign. |

So: **platform** = storage and chain (NFTs, definitions, stats, read). **Game** = when to call, what to pass, and how to use the result (UI, discounts, upgrade flow).

### 3.3 Discounts: single source of truth (optional improvement)

- **Today:** `badge-utilities.getDiscounts(tier)` returns fixed `store` / `gameplay` percentages per tier. Store and tournament cost code use this. Tier comes from `getBadge()` (platform path: Shipyard + Sonar).
- **Possible improvement:** Aquifer `badge_discounts_and_thresholds` already has store/gameplay discounts and thresholds. The game could read those from the platform config (when present) and use them instead of in-code tables, so discount % is fully driven by platform config.

---

## 4. Summary diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         AQUEDUCT PLATFORM                                │
├─────────────────────────────────────────────────────────────────────────┤
│  Shipyard          Aquifer                     Hydroscope         Sonar        │
│  has-badge         badge_discounts_and_        stats (games)      getObject    │
│  mint              thresholds (thresholds +    totalGames        (badge NFT)   │
│  upgrade (build)   discounts)                                                     │
└─────────────────────────────────────────────────────────────────────────┘
         │                    │                    │                │
         │                    │                    │                │
         ▼                    ▼                    ▼                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         GAME BACKEND                                     │
├─────────────────────────────────────────────────────────────────────────┤
│  • Platform-only: no legacy badge path; BADGE_REGISTRY not used         │
│  • hasBadge / getBadge → Shipyard + Sonar; tier from NFT (games from    │
│    Hydroscope only, not stored on NFT)                                  │
│  • checkBadgeUpgrade → Hydroscope games + Aquifer config → deserved vs  │
│    current tier on NFT                                                  │
│  • buildUpgradeBadgeTransaction → buildShipyardBadgeUpgrade; player    │
│    signs and submits                                                    │
│  • Store/merge/tournament cost → getBadge().tier → getDiscounts(tier)   │
│  • Mint → platform builds tx; player signs and submits (no platform sign)│
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Implications for lib cleanup

- **Keep and rely on:** `badge-service` (orchestration, **platform path only**), `badge-utilities` (tier-from-games, getDiscounts), platform-client Shipyard/Aquifer helpers, caches and validators used by badge-service. Sonar for reading tier from NFT; Hydroscope for games played.
- **Remove or deprecate:** Legacy badge path (game-owned BadgeRegistry, `badgeQueries` / `badgeTransactions` chain-specific mint/upgrade). We are not keeping legacy; we are moving fully to platform.
- **Mint flow:** **Target:** platform builds mint tx, **player** signs and submits (no platform sign). **Current:** game sends `execute: true` to platform and platform signs/executes. The platform mint route today documents that “mint uses admin cap owned by platform, so client cannot sign.” So reaching “player signs mint” may require a platform-side change (e.g. a mint flow that lets the recipient sign, or a different capability). Until then, the game can keep using execute: true but the **intended design** is player-signed mint.
- **Discount source:** Today game uses in-code `getDiscounts(tier)`. Optionally use Aquifer `badge_discounts_and_thresholds` when available.
- **Dead or redundant:** Stub, duplicate discount module, legacy re-exports (BadgeError/BadgeValidators/BadgeLogger) as in BADGE_DECISIONS.md.

This gives a single place to reason about “what badges are for,” “what the platform does,” and “what the game must do,” so we can make consistent decisions and implement them in code and docs.
