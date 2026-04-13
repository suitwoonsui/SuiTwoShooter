# Tournament Rewards Flow

This document describes how tournament rewards are distributed. **Only the vault path is supported:** tournaments must have a pool vault (`poolVaultId`, `poolVaultCoinTypeId`, `rewardToken`). Identity for platform calls is from the **corridor cap** (env); no ecosystemId/appId are sent.

---

## 1. Entry points

| Trigger | Route / code | Path |
|--------|---------------|------|
| **Admin button** | `POST /api/admin/tournaments/[id]/distribute-rewards` | Vault only |
| **Tide (platform)** | Calls game `POST /api/admin/tournaments/distribute-by-event` | Same flow: resolve event → distribute-rewards (vault only) |
| **Game scheduler** | `tournament-scheduler.distributeRewards(tournamentId, objectId)` | Calls distribute-rewards API (vault only) |

Submit-score **does not** trigger distribution; after grace period it rejects with "Tournament has ended and grace period has expired." Distribution is done by Tide or admin.

---

## 2. Distribute-rewards route (vault only)

**Auth:** Body must include `adminWalletAddress` matching game admin.

1. **Lock** per tournament (in-memory) to avoid concurrent runs.
2. **Load tournament** from platform (active + past), ensure ended and not already distributed.
3. **Require vault:** If the tournament does not have `poolVaultId`, `poolVaultCoinTypeId`, and `rewardToken`, return an error: distribution requires a pool vault.
4. **Vault path:**
   - Grace: must be past `endTime + 1 hour`.
   - `platformEventsClient.prepareDistribution(objectId, { adminWalletAddress })` → get `vaultReleaseParams` and `rewards`.
   - Build batch: `events-execute-vault-release` + (if rewards) `sustain-build-distribute` with `prepRes.rewards`, `adminWalletAddress`, `source: tournament:${id}`.
   - `buildBatchViaChannel({ operations })` → sign each returned tx with admin wallet → `platformTxClient.executeSigned` for each.
   - `platformEventsClient.markRewardsDistributed(objectId)`.
   - Optional: creator reward via `distributeCreatorReward(objectId)`.
   - **No game contract status update** (platform-only state).
5. **Unlock** and return success/digests.

---

## 3. Data and identity

- **Reward definitions:** Stored on the platform with the event at creation (metadata: rewardConfig, prizePoolUSDCents, rewardToken, etc.). Platform `prepareDistribution` uses them to build reward entries and vault release params.
- **Identity:** All platform HTTP calls use corridor cap from env (`CORRIDOR_CAPABILITY_OBJECT_ID_*`, optional admin cap). No `ecosystemId` or `appId` in headers or body.

---

## 4. Files (reference)

| File | Role |
|------|------|
| `app/api/admin/tournaments/[id]/distribute-rewards/route.ts` | Vault path only; errors if no pool vault |
| `app/api/admin/tournaments/distribute-by-event/route.ts` | Tide callback: resolve event → call distribute-rewards |
| `app/api/tournaments/[id]/submit-score/route.ts` | Rejects score after grace; no auto-distribute |
| `lib/services/tournament/scheduler/tournament-scheduler.ts` | Calls distribute-rewards API after grace period |
