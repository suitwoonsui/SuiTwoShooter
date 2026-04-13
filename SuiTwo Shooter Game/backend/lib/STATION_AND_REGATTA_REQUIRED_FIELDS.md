# Station and Regatta — Required fields

Reference for platform API required fields.

**Corridor required for every interaction:** The platform requires **Corridor** (and API key where applicable) for every API interaction. Every submission to the platform should always include Corridor (e.g. `X-Corridor-Capability-Object-Id` or `X-Corridor-Admin-Capability-Object-Id` in header or query, or `corridorCapabilityObjectId` / `corridorAdminCapabilityObjectId` in body where the route reads it). Identity (ecosystemId, appId) is derived only from the Corridor capability; the platform does not accept X-Ecosystem-Id or X-App-Id for identity.

**Corridor and IDs:** For Regatta and Station, **ecosystem ID and app ID are taken from the Corridor capability**. Sending body `ecosystemId`/`appId` does not override; the canonical source is the Corridor.

---

## Station

### GET /api/station  
**List events (upcoming/active).**

| Where | Required |
|-------|----------|
| **Request** | Corridor (X-Corridor-Capability-Object-Id or query/body `corridorCapabilityObjectId`). |
| **Query** | Optional: `status=upcoming|active|all`, `ended=true`, `distributed=false`. |

---

### GET /api/station/past  
**List past events.**

| Where | Required |
|-------|----------|
| **Request** | Corridor. |
| **Query** | Optional: `limit` (1–200, default 50). |

---

### GET /api/station/:id  
**Get one event by object ID.**

| Where | Required |
|-------|----------|
| **Path** | `id` — event object ID (0x...). |
| **Request** | Corridor, API key. |

---

### POST /api/station/:id/submit  
**Build transaction to submit to an event (e.g. score/claim). Caller signs and submits via Channel.**

| Where | Required |
|-------|----------|
| **Path** | `id` — event object ID. |
| **Request** | Corridor (X-Corridor-Capability-Object-Id or body), API key. |
| **Body** | `sessionId` (number, ≥ 0, Anchor session ID). |
| **Body** | `submissionData` (object). |

---

## Regatta

### POST /api/regatta/create  
**Create regatta event (multi-phase: gas, vault, create event).**

| Where | Required |
|-------|----------|
| **Request** | Corridor **admin** (X-Corridor-Admin-Capability-Object-Id or body), API key. |
| **Body** | `name` (non-empty string). |
| **Body** | `category` — one of: `totalCoins`, `longestStreak`, `highestScore`, `longestDistance`, `mostBosses`, `mostEnemies`. |
| **Body** | `competitionType` (string, e.g. `all-vs-all`; must be a known type; no default). |
| **Body** | `startTime` (number, > 0, Unix ms). |
| **Body** | `endTime` (number, > startTime, Unix ms). |
| **Body** | `entryFeeTickets` (number, ≥ 1). |
| **Body** | `ticketValueUSDCents` (number, ≥ 0; USD cents per ticket; drives pool value when players enter). |
| **Body** | `participationMode` — `'individual'` or `'team'`. |
| **Body** | `rewardConfig` (object: e.g. `rewardDepth`, `poolDepth`, `poolDistribution`, `poolSource`, `itemRewards`). |
| **Body** | `createdBy` (string, non-empty; valid 0x address). Required for reward attribution on player-created tournaments. |

Optional body: `startingAnteUSDCents`, `startingAnteAmountRaw`, `rewardToken`, `rewardTokenTypeId`, `createdByApiKey`, `appId`, `additionalData`, phase fields (signed tx/signatures), etc.

---

### POST /api/regatta/enter  
**Build transaction to enter a regatta. Caller signs and submits via Channel.**

| Where | Required |
|-------|----------|
| **Request** | Corridor (X-Corridor-Capability-Object-Id or body), API key. |
| **Body** | `tournamentObjectId` (string, event object ID). |
| **Body** | `playerAddress` (string, valid 0x address). |
| **Body** | `ticketId` (number, ≥ 0). |

Optional: `appId`, `ecosystemId`, `corridorCapabilityObjectId`, `gasOwnerAddress`.

---

### POST /api/regatta/submit-score  
**Build transaction to submit regatta score. Caller signs and submits via Channel.**

| Where | Required |
|-------|----------|
| **Request** | Corridor (X-Corridor-Capability-Object-Id or body), API key. |
| **Body** | `tournamentObjectId` (string). |
| **Body** | `sessionId` (number, ≥ 0, Anchor session ID). |
| **Body** | `submission` (object). |
| **Body** | `submission.value` (number, ≥ 0). |
| **Body** | `submission.category` (number, 0–5; category enum: totalCoins=0, longestStreak=1, highestScore=2, longestDistance=3, mostBosses=4, mostEnemies=5). Must match the event category for leaderboard. |

Submission may also include: `score`, `distance`, `coins`, `bossesDefeated`, `enemiesDefeated`, `playerName` (platform uses these for leaderboard).

Optional: `claimType`, `appId`, `ecosystemId`, `corridorCapabilityObjectId`, `gasOwnerAddress`.

---

### GET /api/regatta/default-sustain-config  
**Get app default sustain/reward config.**

| Where | Required |
|-------|----------|
| **Query** | `appId` (string). |

---

### POST /api/regatta/default-sustain-config  
**Set app default sustain config (legacy; platform signs).**

| Where | Required |
|-------|----------|
| **Body** | `appId` (non-empty string). |
| **Body** | `rewardConfig` (object). |

---

### GET /api/regatta/gas-payment-address  
**Get platform address and recommended SUI amounts for regatta create.**

No required query or body; uses request context (ecosystemId, appId).

---

### GET /api/gauge  
**Gauge — price discovery (token USD values).**

Returns current token prices in USD (SUI, MEWS, USDC). Use Gauge so the game and platform share the same token values (e.g. ticket value in token, store prices). Platform uses CoinGecko, GeckoTerminal, and env fallbacks; 5-minute cache.

| Where | Required |
|-------|----------|
| **Request** | Corridor, API key. |
| **Response** | `success`, `prices` (e.g. `{ sui, mews, usdc }` in USD), optional `sources`, `timestamp`. |

---

## Summary table

| Endpoint | Required body/query (besides auth/Corridor) |
|----------|---------------------------------------------|
| **Station** | |
| GET /api/station | — |
| GET /api/station/past | — |
| GET /api/station/:id | Path `id` |
| POST /api/station/:id/submit | `sessionId`, `submissionData` |
| **Regatta** | |
| POST /api/regatta/create | `name`, `category`, `competitionType`, `startTime`, `endTime`, `entryFeeTickets`, `ticketValueUSDCents`, `participationMode`, `rewardConfig`, `createdBy` |
| POST /api/regatta/enter | `tournamentObjectId`, `playerAddress`, `ticketId` |
| POST /api/regatta/submit-score | `tournamentObjectId`, `sessionId`, `submission` (with `submission.value` ≥ 0, `submission.category` 0–5) |
| GET /api/regatta/default-sustain-config | Query `appId` |
| POST /api/regatta/default-sustain-config | `appId`, `rewardConfig` |
| GET /api/regatta/gas-payment-address | — |
| **Gauge** | |
| GET /api/gauge | — (price discovery; returns token USD prices) |

---

## Optional fields (not required today)

### POST /api/regatta/create
| Field | Type / notes | Default / behavior |
|-------|----------------------|---------------------|
| startingAnteUSDCents | number | 0 |
| startingAnteAmountRaw | string | — |
| rewardToken | 'SUI' \| 'MEWS' \| 'USDC' | see [rewardToken / rewardTokenTypeId](#rewardtoken--rewardtokentypeid) below |
| rewardTokenTypeId | string | see below |
| createdByApiKey | string | — |
| appId | string | from Corridor (do not send; derived from Corridor) |
| additionalData | object | — |
| useVaultPool | boolean | true |
| Phase / signing fields | various | — |

### POST /api/regatta/enter
| Field | Type / notes |
|-------|----------------------|
| appId | string (from context if omitted) |
| ecosystemId | string |
| corridorCapabilityObjectId | string (or header) |
| gasOwnerAddress | string |

### POST /api/regatta/submit-score
| Field | Type / notes | Default / behavior |
|-------|----------------------|---------------------|
| submission.category | number (0–5) | **Required.** Category enum; must match event. |
| submission.score, distance, coins, bossesDefeated, enemiesDefeated | number | 0 |
| submission.playerName | string | '' |
| claimType | string | — |
| appId, ecosystemId, corridorCapabilityObjectId, gasOwnerAddress | various | from context/header |

### POST /api/station/:id/submit
| Field | Type / notes |
|-------|----------------------|
| claimType | string (default 'score') |

### GET /api/station, GET /api/station/past
| Query | Notes |
|-------|--------|
| status, ended, distributed, limit | all optional |

---

## rewardToken / rewardTokenTypeId

Used only for **regatta create** (optional; platform can default).

| Field | Purpose |
|-------|--------|
| **rewardToken** | Label: `'SUI'`, `'MEWS'`, or `'USDC'`. Used to (1) resolve the vault coin type when `rewardTokenTypeId` is omitted (platform config: `mewsTokenTypeId`, `usdcTokenTypeId`), (2) convert `startingAnteUSDCents` to token amount via price converter, (3) store in event metadata for distribution. |
| **rewardTokenTypeId** | Full Move coin type (e.g. `0x2::sui::SUI`). Used to (1) create the Glacier vault with that coin type (pool holds that token), (2) define what token is added when players enter (ticket value), (3) define what token is paid out in distribution. |

If both are omitted, the platform uses defaults (e.g. MEWS from config). Either can be supplied; when `rewardTokenTypeId` is set it takes precedence for the vault coin type; `rewardToken` is still used for USD conversion and metadata when provided.

---

## Recommendations (implemented)

The following are **required** as of the current implementation:

| Endpoint | Field | Status |
|----------|--------|--------|
| **POST /api/regatta/create** | **ticketValueUSDCents** | **Required** (number, ≥ 0). |
| **POST /api/regatta/create** | **participationMode** | **Required** (`'individual'` \| `'team'`). |
| **POST /api/regatta/submit-score** | **submission.category** | **Required** (number 0–5; must match event category). |

**Optional (unchanged):**
- **appId** on create/enter/submit — derived from Corridor or context.
- **rewardToken** / **rewardTokenTypeId** — default/infer when omitted.
- **startingAnteUSDCents** / **startingAnteAmountRaw** — zero ante is valid.
- **submission** stats other than **value** and **category** — can default to 0 for tie-breaks.
