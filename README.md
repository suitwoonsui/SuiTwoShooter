# SuiTwo Shooter Game

A modular JavaScript shooter game built with clean architecture principles, featuring a Neo-Tokyo cyberpunk aesthetic.

## 📊 Project Status

**Current Focus:** Weekly Tournament System Implementation  
**Last Updated:** 2025-12-09

For detailed project status, see **[PROJECT_STATUS.md](docs/PROJECT_STATUS.md)**

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

### Local Development (Recommended)

For local development and testing, see **[LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md)** for complete setup instructions.

**Quick Start:**
```bash
# Install dependencies (first time only)
npm install
cd backend && npm install && cd ..
cd wallet-module && npm install && cd ..

# Run all services
npm run dev:all
```

Then open `http://localhost:8000` in your browser.

### Production

The game is deployed on Vercel:
- Frontend: Auto-detects production URLs
- Backend: Uses Vercel API endpoints
- Wallet Module: Loads from Vercel CDN

### Legacy (Static File)

You can also open `index.html` directly in a browser, but this won't work with wallet integration or backend APIs.