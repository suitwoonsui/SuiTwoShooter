# Badge mint and upgrade – what’s needed for success

## 1. Config and env

### Game backend (required for platform path)

| Variable | Purpose |
|----------|---------|
| `PLATFORM_BACKEND_URL` | Platform API base (e.g. `https://platform.example.com` or `http://localhost:3000`) |
| `ECOSYSTEM_ID` | Ecosystem id (required for platform badges) |
| `APP_ID` | App id (required for platform badges) |
| `BADGE_COLLECTION_NAME` | **Required.** Human-readable collection (e.g. `SuiTwo Shooter Game Player Badges`). Used for mint and has-badge. |
| `CORRIDOR_CAPABILITY_OBJECT_ID` (or `_TESTNET` / `_MAINNET`) | So platform can authenticate the game and build Shipyard tx |
| API key for platform | e.g. `ECOSYSTEM_<id>_API_KEY` or `API_KEY` (platform may require it for Channel/shipyard) |

Optional for mint metadata: `BADGE_NFT_NAME`, `BADGE_NFT_IMAGE_URL`, `BADGE_NFT_DESCRIPTION`.

Badges are platform-only (Shipyard). Do **not** set `BADGE_REGISTRY_*`; it is legacy and unused.

### Platform backend

- Shipyard configured: `SHIPYARD_PACKAGE_ID_*`, `SHIPYARD_ADMIN_CAP_OBJECT_ID_*` (or `HARBOR_MASTER_CAP_*`).
- Waterline / ecosystem registry so Shipyard is allowed for this app.
- Channel batch has `shipyard-mint` and `shipyard-upgrade` (already added for mint).

---

## 2. Mint: player sign vs platform sign (contract)

- **Current flow:** Game asks platform to **build** a mint tx with **sender = player**. Game returns that tx to the frontend; frontend has the **player** sign; frontend currently calls **wallet.signAndExecuteTransaction(transaction)** (wallet signs and submits, likely to a Sui RPC).
- **Risk:** The platform’s Shipyard mint Move may require the **transaction signer** to own (or have) the **admin cap**. The admin cap is platform-owned. So a **player-signed** mint tx might **fail at execution** with “invalid signer” or similar.
- **To ensure mint succeeds, either:**
  - **A. Contract change (recommended long-term):** Add or adjust the Shipyard mint entry so a tx built with `sender = recipient` (player) can be executed when the **player** signs (e.g. capability-based mint so the player can sign without holding the global admin cap).
  - **B. Use platform-signed mint until then:** Keep using `POST /api/shipyard/mint` with `execute: true` (platform signs and executes). That skips “player signs” but guarantees mint works. Game could offer a fallback: if build+player-sign+execute fails, retry with platform execute (if you expose that from the game).

Confirm on a testnet: run build → player sign → submit; if execution fails, the Move contract is the likely cause and A or B applies.

---

## 3. Frontend: sign then execute

- **Upgrade:** Build returns `transaction`; frontend calls `BadgeService.signAndExecuteBadgeTransaction(result.transaction)`. The wallet signs and executes. This is correct as long as the wallet submits the signed tx (to RPC or to your backend). Upgrade tx has `sender = player` (owner of the NFT), so player signer is valid.
- **Mint:** Same flow: build → `signAndExecuteBadgeTransaction(transaction)`. If the wallet submits to a **Sui RPC**, the mint tx is executed on-chain; success depends on the contract (see §2). If you want **all** execution to go through the **platform** (e.g. `POST /api/channel/execute`), then the frontend must:
  1. Sign the transaction with the wallet (sign only, no execute).
  2. Send the signed payload to the game: `POST /api/platform/tx/execute` with `{ transactionBytesBase64, signature }`.
  3. Game proxies to platform `POST /api/channel/execute`; platform submits to the chain.

So: **current frontend** (sign + execute via wallet) can work for both mint and upgrade **if** the chain accepts player-signed mint; **optional improvement** is to use sign-then-POST-to-game so execution always goes through the platform.

---

## 4. Frontend copy and digest handling

- **Mint modal** currently says: “No wallet signature is required — the platform will create it for you.” With the **build-only** flow, the **player must sign** in the wallet. Update that text so users expect a wallet signature for mint.
- **Badge-service.js** already handles both: if backend returns `digest`, it treats as “already executed”; if it returns `transaction`, it calls `signAndExecuteBadgeTransaction(result.transaction)`. Backend no longer returns `digest` for mint (only `transaction`), so the flow is: build → sign + execute. No change needed except the modal copy.

---

## 5. Verification

- **has-badge / getBadge:** Use the same `BADGE_COLLECTION_NAME` (via `getDefaultBadgeCollectionId()`). So after a successful mint, the game’s has-badge and getBadge will see the new NFT.
- **E2E:**  
  - **Mint:** Build mint → sign + execute → check has-badge and getBadge.  
  - **Upgrade:** Build upgrade → sign + execute → check badge tier and getBadge.

---

## 6. Short checklist

| Item | Status / action |
|------|------------------|
| Game env: PLATFORM_BACKEND_URL, ECOSYSTEM_ID, APP_ID, BADGE_COLLECTION_NAME, corridor cap, API key | Set in each environment. |
| Platform: Shipyard + Waterline, Channel shipyard-mint/shipyard-upgrade | Already in place for mint. |
| Mint contract allows player signer? | Test; if execution fails, add Move change (capability mint) or use platform execute. |
| Frontend mint modal: “No wallet signature” | Update to “You’ll need to sign in your wallet.” |
| Execute path: wallet only vs game proxy | Current (wallet sign+execute) is fine if chain accepts player-signed mint; optionally add sign → POST /api/platform/tx/execute for consistency. |
| E2E test mint and upgrade | Run once config and (if needed) contract are in place. |

This keeps badge mint and upgrade aligned with the platform and Shipyard and makes it clear what’s required for them to succeed.
