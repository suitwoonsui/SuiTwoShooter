## Codebase Organizational Audit

Date: 2025-10-20

### Collectible naming consistency ✅ COMPLETED
- Issue: Variable `collectableImage` vs directory `collectibles`.
- ✅ **RESOLVED:** Renamed `collectableImage` → `collectibleImage` across all files for consistency.

### Cross-layer dependencies (systems → rendering assets) ✅ COMPLETED
- Issue: `systems/collision/collision.js` reads image sizes (`collectableImage`, `powerupBonusImage`, `powerupMalusImage`) to shape hitboxes.
- ✅ **RESOLVED:** Created comprehensive `src/game/shared/sprite-metrics.js` with dynamic sprite dimension calculations for all sprite types (collectibles, enemies, bosses, player, projectiles). Eliminated all code duplication and cross-layer dependencies.

### Particle class location vs usage ✅ COMPLETED
- Issue: `Particle` lives under `rendering/effects/particle.js` but is invoked by systems (e.g., collision) for VFX.
- ✅ **RESOLVED:** Created proper effects system architecture with `src/game/systems/effects/effects.js` for particle creation logic. Particle class remains in rendering layer where it belongs, but systems now call effect functions instead of directly creating particles.

### Magic numbers for collectible sizing ✅ COMPLETED
- Issue: Height 40, x-offset 30, and 40px centering width duplicated across rendering and collision.
- ✅ **RESOLVED:** All magic numbers centralized in `src/game/shared/sprite-metrics.js` with fallback constants. All sprite sizing now uses dynamic calculations based on image aspect ratios.

### Asset module split (current state is good) ✅ COMPLETED
- Enemies: `rendering/enemies/enemy-images.js`
- Bosses: `rendering/bosses/boss-images.js`
- Player: `rendering/player/player-images.js`
- UI Life: `rendering/ui/life-images.js`
- Background: `rendering/background-images.js`
- Projectiles: `rendering/projectiles/projectile-images.js`
- Collectibles: `rendering/collectibles/collectible-images.js`
- ✅ **RESOLVED:** Added comprehensive header comments to all asset files documenting which renderers own them and where they're used.

### Legacy/monolith remnants ✅ COMPLETED
- Issue: `Shooter.js` and backups coexist with modular `src/`.
- ✅ **RESOLVED:** Confirmed `Shooter.js` is legacy code not loaded by `Shooter.html`. Removed `Shooter.js` from root directory. Updated `README.md` to clearly state that `src/` is the authoritative source code. Backup directories left as-is for historical reference.

### Placeholder/empty modules ✅ COMPLETED
- Issue: `src/game/systems/effects/` and `systems/collectibles/collectibles.js` are placeholders.
- ✅ **RESOLVED:** 
  - **`collectibles.js`** - Now contains full collectible behavior system with `collectCoin()`, `collectPowerup()`, `resetCoinStreak()`, and force field management. Collision detection remains in `collision.js`, but all behavior logic moved to collectibles system.
  - **`effects.js`** - Already functional with particle creation functions.
  - **`physics.js`** - Removed as it was empty placeholder with no functionality.

### Audio API surface ✅ COMPLETED
- Status: Systems call wrapper functions (e.g., `playPowerUpSound`) mapped in `game-audio.js`; consistent.
- ✅ **RESOLVED:** Created comprehensive `AUDIO_API.md` documenting all available audio wrapper functions, usage patterns, integration examples, and troubleshooting guide. The audio system is well-architected with clean separation between implementation and game logic.

### Script load order and globals ✅ COMPLETED
- Status: Asset files are loaded before systems/rendering in `Shooter.html`; consistent.
- ✅ **RESOLVED:** Current script load order is optimal: Security/Audio → Assets → Utils/Shared → Main → Systems → Rendering. Global variables are well-managed with clear separation of concerns. Lazy loading not needed due to small asset count (~15-20 WebP images) and optimized file sizes. Modular approach maintained for clean organization.

### Completed improvements
1) ✅ Renamed `collectableImage` → `collectibleImage` and updated all references.
2) ✅ Created `src/game/shared/sprite-metrics.js` with dynamic sprite dimension calculations for all sprite types.
3) ✅ Implemented proper effects system architecture with `src/game/systems/effects/effects.js`.
4) ✅ Eliminated all cross-layer dependencies and code duplication.

### Remaining issues
1) Add a short note in `README.md` clarifying modular `src/` is authoritative.
2) Address remaining organizational issues below.


