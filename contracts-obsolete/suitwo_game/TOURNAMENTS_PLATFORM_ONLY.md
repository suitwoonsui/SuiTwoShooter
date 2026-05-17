# Tournaments: Platform-Only (No Game Contract)

Tournaments are **provided by the platform**, not by the SuiTwo game package.

- **On-chain:** `platform::station` + `platform_tournaments::tournaments` (create event, enter with ticket, submit score).
- **Backend:** Game backend uses platform backend APIs (`platformTournamentClient`, `platformEventsClient`) for create, enter, submit, and event listing. Configure `PLATFORM_BACKEND_URL`, `REGATTA_EXTENSION_PACKAGE_ID_*` (or legacy `TOURNAMENT_EXTENSION_PACKAGE_ID`), and platform event registry IDs as needed.
- **Config:** `TOURNAMENT_REGISTRY_OBJECT_ID` / `TOURNAMENT_ADMIN_CAPABILITY_OBJECT_ID` in the game backend should refer to **platform** objects (platform’s App Event Registry and Events Admin Cap) when using platform-only tournaments.

The game package **no longer contains** `tournaments.move`. Do not add a game-level tournament contract that duplicates platform behavior.

**Game backend:** Create, enter, and submit already go through the platform (e.g. `platformTournamentClient`). Any remaining flows that previously used the game contract (e.g. move tournament to past, user-paid create, or chain queries for participant count / active IDs) must use platform APIs or platform package/object IDs instead.
