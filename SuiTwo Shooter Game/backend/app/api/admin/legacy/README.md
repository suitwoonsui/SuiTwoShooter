# Legacy admin API routes

Endpoints under **`/api/admin/legacy/`** are **read-only or migration-only** and talk to the **old game contract** (pre–platform migration). They are kept for migration, debugging, and support; they are not part of the main platform/Channel flows.

- **Do not add new flows here** — new behavior should use platform APIs and Channel.
- These routes may be removed once migration is complete and old-contract reads are no longer needed.
- See **docs/platform/PLAN_MOVE_GAME_TX_FLOWS_TO_PLATFORM.md** step 7 for the audit that lists legacy paths.

Current endpoints:

| Path | Purpose |
|------|---------|
| `POST /api/admin/legacy/tournaments/query-old-tickets` | Query tournament ticket data from the old game-pass contract (read-only; uses Sonar + devInspect). |
