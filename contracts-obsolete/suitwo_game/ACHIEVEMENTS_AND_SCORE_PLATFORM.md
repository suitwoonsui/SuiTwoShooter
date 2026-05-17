# Achievements and Score — Platform Migration

The game backend can use the **platform** for achievements (milestones) and score/stats when the game package no longer has on-chain registries, or when you prefer platform-backed storage.

## When the game uses platform

- **Score / stats:** When `SESSION_REGISTRY_OBJECT_ID` and `STATISTICS_REGISTRY_OBJECT_ID` are unset (or empty/`0x...`) and the platform is configured (`PLATFORM_BACKEND_URL`, `ECOSYSTEM_ID`, `APP_ID`, API key), score submission goes to **platform only** via `POST /api/stats/update` (with optional `sessionId` for deduplication). Stats and leaderboard are read from platform `GET /api/stats/:address` and `GET /api/stats/leaderboard`.
- **Achievements (milestones):** When `ACHIEVEMENT_REGISTRY_OBJECT_ID` is unset and the platform is configured, milestone definitions come from **platform** `GET /api/milestones/definitions`, claimed IDs from `GET /api/milestones/claimed?address=`, and player stats for eligibility from platform stats. Claiming still distributes rewards via the existing platform rewards flow; the platform then records the claim via `POST /api/milestones/claim` (with empty reward when rewards were already distributed by the game).

## Platform changes for this migration

- **Stats:** `POST /api/stats/update` accepts an optional `sessionId`. When present, the platform deduplicates by (ecosystem, app, address, sessionId) and skips applying the update again for the same session (idempotent).
- **Milestones:** `GET /api/milestones/claimed?address=0x...` returns `{ success, claimedIds: string[] }` for that player. Claimed state is stored in memory on the platform; for production, consider persisting (e.g. DB).

## Optional: Remove game contracts

Once all environments use platform for score and achievements, you can remove from the game package:

- `achievement_system.move`
- `score_submission.move`

After removal:

- Deploy scripts must no longer create or reference `AchievementRegistry`, `SessionRegistry`, `StatisticsRegistry`, or their admin capabilities.
- Leave `ACHIEVEMENT_REGISTRY_OBJECT_ID`, `SESSION_REGISTRY_OBJECT_ID`, and `STATISTICS_REGISTRY_OBJECT_ID` unset in the game backend so the platform path is always used.

See `BADGES_GAMECONFIG_ITEMCATALOG_PLATFORM.md` for the same pattern (badges, game config, provisions).
