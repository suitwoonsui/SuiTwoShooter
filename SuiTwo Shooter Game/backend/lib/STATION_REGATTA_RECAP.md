# Station & Regatta — Required/Optional Fields and What the Game Sends

Quick recap: platform API contract vs game backend payloads.

**Corridor on every request:** The platform requires **Corridor** for every API interaction. Every submission to the platform should always include Corridor (header `X-Corridor-Capability-Object-Id` or `X-Corridor-Admin-Capability-Object-Id`, or body/query where the route accepts it) so the platform can route and derive identity correctly. The game backend sends Corridor on every platform call via `callPlatformBackend` (env or options). **ecosystemId** and **appId** are derived from the Corridor by the platform, not from the body.

---

## 1. Station

| Endpoint | Required | Optional |
|----------|----------|----------|
| **GET /api/station** | Corridor (header or query/body) | Query: `status`, `ended`, `distributed` |
| **GET /api/station/past** | Corridor | Query: `limit` (1–200, default 50) |
| **GET /api/station/:id** | Path `id`, Corridor, API key | — |
| **POST /api/station/:id/submit** | Path `id`, Corridor, API key, **sessionId** (number ≥ 0), **submissionData** (object) | Body: `claimType` (default `'score'`) |

**Game:** No Station-specific calls found in the game backend for list/get/submit. Generic score submit uses Hydroscope (`api/hydroscope/update`), not Station.

---

## 2. Regatta

### POST /api/regatta/create

| Required | Optional |
|----------|----------|
| Corridor **admin** (X-Corridor-Admin-Capability-Object-Id or body), API key | |
| **name** (non-empty string) | |
| **category** — one of: `totalCoins`, `longestStreak`, `highestScore`, `longestDistance`, `mostBosses`, `mostEnemies` | |
| **competitionType** (e.g. `all-vs-all`) | |
| **startTime**, **endTime** (Unix ms, endTime > startTime) | |
| **entryFeeTickets** (≥ 1) | |
| **ticketValueUSDCents** (number ≥ 0) | |
| **participationMode** — `'individual'` or `'team'` | |
| **rewardConfig** (object) | |
| **createdBy** (valid 0x address) | |
| | startingAnteUSDCents, startingAnteAmountRaw, rewardToken, rewardTokenTypeId, createdByApiKey, appId, additionalData, phase/signing fields |

**Game sends (tournament-service → platformTournamentClient.createTournament):**

| Field | Sent? | Notes |
|-------|--------|--------|
| name | ✅ | From admin create API |
| category | ✅ | From body |
| competitionType | ✅ | From body or default `'all-vs-all'` (aligned) |
| startTime, endTime | ✅ | From body |
| entryFeeTickets | ✅ | From body |
| ticketValueUSDCents | ✅ | From body or default 100 (aligned) |
| participationMode | ✅ | From body or default `'individual'` (aligned) |
| rewardConfig | ✅ | From body or default reward config |
| createdBy | ✅ | From config or admin wallet |
| startingAnteUSDCents, startingAnteAmountRaw, rewardToken, rewardTokenTypeId | ✅ | When set |

---

### POST /api/regatta/enter

| Required | Optional |
|----------|----------|
| Corridor, API key | |
| **tournamentObjectId** (event object ID) | |
| **playerAddress** (valid 0x) | |
| **ticketId** (number ≥ 0) | |
| | appId, ecosystemId, corridorCapabilityObjectId, gasOwnerAddress |

**Game sends:** tournamentObjectId, playerAddress, ticketId (and appId when set). Matches platform.

---

### POST /api/regatta/submit-score

| Required | Optional |
|----------|----------|
| Corridor, API key | |
| **tournamentObjectId** | |
| **sessionId** (number ≥ 0, Anchor session ID) | |
| **submission** (object) | |
| **submission.value** (number ≥ 0) | |
| **submission.category** (number 0–5; category enum) | |
| | submission.score, distance, coins, bossesDefeated, enemiesDefeated, playerName; claimType, appId, corridorCapabilityObjectId, gasOwnerAddress |

**Game flow:** Submit-score route builds via Channel batch (operationId `regatta-submit-score`) with eventObjectId, sessionId, submission, corridorCapabilityObjectId, gasOwnerAddress; admin signs and submits via POST /api/channel/execute. No direct call to api/regatta/submit-score.

| Field | Sent in batch params? | Notes |
|-------|------------------------|--------|
| eventObjectId (tournamentObjectId) | ✅ | |
| sessionId | ✅ | Required; from request body. Obtain via POST /api/tournaments/create-anchor-session when starting tournament |
| submission.category | ✅ | category 0–5 (route maps tournament.category) |
| submission.value | ✅ | categoryValue |
| submission.score, distance, coins, bossesDefeated, enemiesDefeated, playerName | ✅ | Sent |

---

## 3. Summary: platform vs game (aligned)

| Endpoint | Required by platform | Sent by game | Match? |
|----------|----------------------|--------------|--------|
| **POST /api/regatta/create** | name, category, competitionType, startTime, endTime, entryFeeTickets, ticketValueUSDCents, participationMode, rewardConfig, createdBy | All of the above (competitionType/participationMode defaulted if omitted) | ✅ |
| **POST /api/regatta/enter** | tournamentObjectId, playerAddress, ticketId | Same | ✅ |
| **Tournament submit score** | Channel batch `regatta-submit-score` + execute | eventObjectId, sessionId, submission (value, category, …), corridorCap, gasOwnerAddress; game signs and submits via POST /api/channel/execute. | ✅ |

---

## 4. Optional fields (regatta create) — game behavior

- **ticketValueUSDCents:** Game sends; from body or default 100. Admin create API accepts optional ticketValueUSDCents, competitionType, participationMode.
- **rewardToken / rewardTokenTypeId:** Game sends when set (e.g. from startingAnteToken or config); otherwise platform defaults apply.
- **startingAnteUSDCents, startingAnteAmountRaw:** Game sends when set.
- **appId:** Not sent by game; platform derives from Corridor (correct).

---

## 5. Gauge (price discovery — GET /api/gauge)

**Gauge** is the platform’s price-discovery service. **GET /api/gauge** (Corridor required) returns token USD values: `prices: { sui, mews, usdc }`, plus optional `sources` and `timestamp`. Use Gauge so the game and platform share the same token values. Game client: `platformGaugeClient.getTokenPrices(options)`.

---

## 6. References

- Full required/optional spec: `STATION_AND_REGATTA_REQUIRED_FIELDS.md`
- Game: `backend/lib/services/tournament/core/tournament-service.ts`, `backend/lib/services/platform/client/platform-client.ts`, `backend/app/api/admin/tournaments/create/route.ts`, `backend/app/api/scores/submit/route.ts`
