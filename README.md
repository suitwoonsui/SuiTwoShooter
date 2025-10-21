# SuiTwo Shooter Game

A modular JavaScript shooter game built with clean architecture principles.

## Project Structure

**⚠️ IMPORTANT: The `src/` directory is the authoritative source code.**

- **`src/`** - Current modular game implementation (source of truth)
- **`Backup for reference/`** - Historical backups (contains legacy `Shooter.js`)
- **`Phase2_Completion_Backup_2025-10-16_16-10-40/`** - Phase completion backup

**Note:** Legacy `Shooter.js` has been removed from the root directory. Historical versions are preserved in backup directories.

## Architecture

The game follows a clean modular architecture:

- **Systems** (`src/game/systems/`) - Game logic and behavior
- **Rendering** (`src/game/rendering/`) - Visual display and assets
- **Shared** (`src/game/shared/`) - Common utilities and metrics
- **Utils** (`src/utils/`) - Helper functions

## Running the Game

Open `Shooter.html` in a web browser. The game loads all modules from the `src/` directory.