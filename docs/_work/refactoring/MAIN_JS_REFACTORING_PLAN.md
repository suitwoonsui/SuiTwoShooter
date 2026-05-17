# Main.js Refactoring Plan

## Overview
Refactor `src/game/main.js` (~1,396 lines) into focused, maintainable modules following the existing systems architecture pattern.

## Current State Analysis

### File Statistics
- **Lines**: ~1,396
- **Top-level functions**: 26
- **Main responsibilities**:
  1. Game state management (large `game` object with 80+ properties)
  2. Game loop (`gameLoop`, `update`, `draw`)
  3. Security system integration
  4. Player management
  5. Boss management (partially extracted)
  6. Input handling
  7. Initialization and lifecycle

### Already Extracted Systems ✅
- `systems/bosses/bosses.js` - Boss creation (`createBoss`)
- `systems/enemies/enemy-behavior.js` - Enemy behavior (`updateEnemyShooting`)
- `systems/enemies/enemy-stats.js` - Enemy statistics
- `systems/projectiles/*` - Projectile systems
- `systems/tiles/tiles.js` - Tile/obstacle system
- `systems/collectibles/collectibles.js` - Collectibles
- `systems/collision/collision.js` - Collision detection
- `systems/player/player.js` - Player logic (`updatePlayer`, `handleInput`, `handleAutoFire`)
- `systems/core/scoring.js` - Scoring logic
- `systems/core/game-state-manager.js` - UI state management
- `rendering/*` - Most rendering logic (background, player, enemies, bosses, projectiles, UI)

### Still in main.js ⚠️
- **Game state object** (`game` - 80+ properties) - Large object with all game state
- **Game loop** (`gameLoop`, `update`, `draw`) - Core loop orchestration
- **Security system** - Initialization and integration (`initSecurity`, `updateScore`)
- **Game lifecycle** (`init`, `restart`, `gameOver`, `returnToMainMenu`) - Lifecycle management
- **Update orchestration** - The main `update()` function that calls all systems
- **Configuration constants** (`bossStats`, `enemyFireInterval`, multipliers) - Game balance config
- **Player object** (`player` - simple object) - Player state
- **Global arrays** (`tiles`, `enemies`) - Game entity arrays

---

## Refactoring Strategy

### Phase 1: Extract Game State (High Priority)
**Goal**: Separate state management from game logic

#### 1.1 Create `systems/core/game-state.js`
**Extract**:
- `game` object (all properties)
- State getters/setters
- State initialization
- State reset logic

**Interface**:
```javascript
class GameState {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.score = 0;
    this.coins = 0;
    this.distance = 0;
    // ... all game properties
  }
  
  reset() { /* Reset all state */ }
  getScore() { /* Get score from security system */ }
  setScore(value) { /* Set score via security system */ }
}
```

**Benefits**:
- Centralized state management
- Easier testing
- Clear state ownership
- Type safety potential

**Estimated Effort**: 4-6 hours

---

### Phase 2: Extract Game Loop (High Priority)
**Goal**: Separate loop management from game logic

#### 2.1 Create `systems/core/game-loop.js`
**Extract**:
- `gameLoop()` function
- Frame timing logic
- Debug FPS tracking
- Loop lifecycle management

**Interface**:
```javascript
class GameLoop {
  constructor(gameState, updateFn, drawFn) {
    this.gameState = gameState;
    this.update = updateFn;
    this.draw = drawFn;
    this.isRunning = false;
    this.rafId = null;
  }
  
  start() { /* Start loop */ }
  stop() { /* Stop loop */ }
  pause() { /* Pause loop */ }
  resume() { /* Resume loop */ }
}
```

**Benefits**:
- Reusable loop pattern
- Better performance monitoring
- Easier to add frame limiting
- Cleaner separation of concerns

**Estimated Effort**: 2-3 hours

---

### Phase 3: Extract Update Logic (Medium Priority)
**Goal**: Break down the massive `update()` function

#### 3.1 Create `systems/core/game-update.js`
**Extract**:
- Main `update()` function
- Update orchestration
- State checks (gameOver, paused, etc.)

**Structure**:
```javascript
class GameUpdate {
  constructor(gameState, systems) {
    this.gameState = gameState;
    this.systems = systems; // { player, enemies, bosses, projectiles, etc. }
  }
  
  update(deltaTime) {
    // Orchestrate all system updates
    if (this.shouldSkipUpdate()) return;
    
    this.systems.input.update();
    this.systems.player.update(deltaTime);
    this.systems.projectiles.update(deltaTime);
    this.systems.enemies.update(deltaTime);
    this.systems.bosses.update(deltaTime);
    this.systems.collision.update();
    this.systems.particles.update(deltaTime);
  }
  
  shouldSkipUpdate() {
    // Check gameOver, paused, menu visible, etc.
  }
}
```

**Benefits**:
- Smaller, focused update functions
- Easier to debug
- Better performance (can skip systems)
- Clearer dependencies

**Estimated Effort**: 6-8 hours

---

### Phase 4: Extract Input Handling (Medium Priority)
**Goal**: Centralize all input logic

#### 4.1 Enhance `systems/input/game-input.js` (or create if needed)
**Note**: `handleInput()` is already in `systems/player/player.js`, but input state management is in main.js

**Extract**:
- Input state (`game.keys`, `game.mouseY`)
- Keyboard event handlers (currently in `init()`)
- Mouse event handlers (currently in `init()`)
- Input state initialization

**Interface**:
```javascript
class GameInput {
  constructor(gameState) {
    this.gameState = gameState;
    this.keys = {};
    this.mouseY = 0;
  }
  
  init(canvas) { /* Setup event listeners */ }
  update() { /* Process input (calls handleInput from player.js) */ }
  handleKeyDown(event) { /* Handle key press */ }
  handleKeyUp(event) { /* Handle key release */ }
  handleMouseMove(event) { /* Handle mouse movement */ }
}
```

**Benefits**:
- Centralized input state
- Easier to add new input methods
- Better mobile support
- Cleaner initialization

**Estimated Effort**: 2-3 hours (less since handleInput already extracted)

---

### Phase 5: Extract Game Lifecycle (Medium Priority)
**Goal**: Separate initialization and lifecycle management

#### 5.1 Create `systems/core/game-lifecycle.js`
**Extract**:
- `init()` function
- `restart()` function
- `gameOver()` function
- `returnToMainMenu()` function
- Security system initialization
- Canvas setup

**Interface**:
```javascript
class GameLifecycle {
  constructor(gameState, systems) {
    this.gameState = gameState;
    this.systems = systems;
  }
  
  async init() { /* Initialize game */ }
  restart() { /* Restart game */ }
  gameOver() { /* Handle game over */ }
  returnToMainMenu() { /* Return to menu */ }
  initSecurity() { /* Initialize security system */ }
}
```

**Benefits**:
- Clear lifecycle management
- Easier to add new game modes
- Better error handling
- Reusable initialization

**Estimated Effort**: 4-5 hours

---

### Phase 6: Extract Configuration (Low Priority)
**Goal**: Centralize game configuration

#### 6.1 Create `systems/core/game-config.js`
**Extract**:
- `bossStats` object
- `enemyFireInterval` array
- `getProjectileSpeedMultiplier()` function
- `getFireRateMultiplier()` function
- `getOldLevelEquivalent()` function
- Game constants (dimensions, speeds, etc.)

**Interface**:
```javascript
class GameConfig {
  static BOSS_STATS = { /* ... */ };
  static ENEMY_FIRE_INTERVALS = [ /* ... */ ];
  static getProjectileSpeedMultiplier(bossesDefeated) { /* ... */ }
  static getFireRateMultiplier(bossesDefeated) { /* ... */ }
  static getOldLevelEquivalent(newLevel) { /* ... */ }
}
```

**Benefits**:
- Easy to tweak game balance
- Centralized configuration
- Better documentation
- Type safety potential

**Estimated Effort**: 2-3 hours

---

### Phase 7: Extract Rendering (Low Priority)
**Goal**: Separate rendering from game logic

#### 7.1 Create `systems/core/game-render.js`
**Extract**:
- `draw()` function
- Rendering orchestration
- Background rendering
- UI rendering coordination

**Note**: Most rendering is already extracted to `rendering/` directory, but the main `draw()` function still exists in main.js

**Interface**:
```javascript
class GameRender {
  constructor(gameState, renderers) {
    this.gameState = gameState;
    this.renderers = renderers; // { background, player, enemies, etc. }
  }
  
  draw() {
    // Clear canvas
    // Render background
    // Render game objects
    // Render UI
    // Render particles
  }
}
```

**Benefits**:
- Complete separation of logic and rendering
- Easier to add new renderers
- Better performance (can skip rendering)
- Easier to test

**Estimated Effort**: 3-4 hours

---

## Implementation Order

### Recommended Sequence

1. **Phase 1: Game State** (Foundation)
   - Must be done first - everything depends on state
   - Risk: Low (mostly data extraction)
   - Impact: High (enables other refactorings)

2. **Phase 2: Game Loop** (Core)
   - Depends on: Game State
   - Risk: Medium (timing-sensitive)
   - Impact: High (clean architecture)

3. **Phase 3: Game Update** (Logic)
   - Depends on: Game State, Game Loop
   - Risk: Medium (complex logic)
   - Impact: High (maintainability)

4. **Phase 4: Input Handling** (User Interaction)
   - Depends on: Game State
   - Risk: Low (isolated functionality)
   - Impact: Medium (code organization)

5. **Phase 5: Game Lifecycle** (Management)
   - Depends on: Game State, Game Loop
   - Risk: Medium (initialization complexity)
   - Impact: Medium (better organization)

6. **Phase 6: Configuration** (Data)
   - Depends on: None (can be done anytime)
   - Risk: Low (data extraction)
   - Impact: Low (nice to have)

7. **Phase 7: Rendering** (Visual)
   - Depends on: Game State
   - Risk: Low (most rendering already extracted)
   - Impact: Low (completeness)

---

## Migration Strategy

### Step-by-Step Approach

1. **Create new module files** (empty shells)
2. **Extract code incrementally** (one function at a time)
3. **Update imports** in main.js
4. **Test after each extraction** (ensure game still works)
5. **Refactor extracted code** (improve as we go)
6. **Update dependencies** (fix any broken references)
7. **Remove old code** (clean up main.js)

### Testing Strategy

- **After each phase**: Full game test
  - Start game
  - Play through a level
  - Defeat a boss
  - Game over
  - Restart
  - Menu navigation

- **Regression testing**:
  - All game features work
  - No performance degradation
  - No visual glitches
  - Input still responsive

---

## File Structure After Refactoring

```
src/game/
├── main.js (200-300 lines - orchestration only)
│   - Imports all systems
│   - Initializes game
│   - Exports initialization function
│
├── systems/
│   ├── core/
│   │   ├── game-state.js (NEW - 200-300 lines)
│   │   ├── game-loop.js (NEW - 100-150 lines)
│   │   ├── game-update.js (NEW - 150-200 lines)
│   │   ├── game-lifecycle.js (NEW - 200-250 lines)
│   │   ├── game-config.js (NEW - 100-150 lines)
│   │   ├── game-render.js (NEW - 100-150 lines)
│   │   ├── game-state-manager.js (EXISTS - UI state)
│   │   └── scoring.js (EXISTS)
│   │
│   ├── input/
│   │   ├── game-input.js (NEW - 150-200 lines)
│   │   └── touch-input.js (EXISTS)
│   │
│   ├── bosses/
│   │   └── bosses.js (EXISTS)
│   │
│   ├── enemies/
│   │   ├── enemy-behavior.js (EXISTS)
│   │   └── enemy-stats.js (EXISTS)
│   │
│   └── ... (other existing systems)
```

---

## Benefits of Refactoring

### Code Quality
- ✅ **Maintainability**: Smaller, focused files
- ✅ **Readability**: Clear responsibilities
- ✅ **Testability**: Isolated modules
- ✅ **Reusability**: Shared components

### Performance
- ✅ **Optimization**: Easier to profile and optimize
- ✅ **Caching**: Better opportunity for caching
- ✅ **Lazy Loading**: Can load systems on demand

### Developer Experience
- ✅ **Easier Debugging**: Know where to look
- ✅ **Faster Development**: Clear structure
- ✅ **Better Collaboration**: Multiple devs can work simultaneously
- ✅ **Documentation**: Easier to document

---

## Risks & Mitigation

### Risk 1: Breaking Existing Functionality
**Mitigation**:
- Extract incrementally
- Test after each change
- Keep old code until new code is verified
- Use feature flags if needed

### Risk 2: Performance Degradation
**Mitigation**:
- Profile before and after
- Keep hot paths optimized
- Avoid unnecessary abstractions
- Benchmark critical sections

### Risk 3: Circular Dependencies
**Mitigation**:
- Clear dependency hierarchy
- Use dependency injection
- Avoid tight coupling
- Use event system for decoupling

### Risk 4: Scope Creep
**Mitigation**:
- Stick to the plan
- One phase at a time
- Don't refactor while extracting
- Document deviations

---

## Success Metrics

### Code Metrics
- **main.js size**: 1,396 → ~200-300 lines (80% reduction)
- **Average file size**: < 300 lines
- **Cyclomatic complexity**: < 10 per function
- **Function count**: 26 → distributed across modules

### Quality Metrics
- **Test coverage**: Maintain or improve
- **Performance**: No degradation (60 FPS maintained)
- **Bug count**: No new bugs introduced
- **Build time**: No significant increase

### Developer Metrics
- **Time to find code**: Reduced (clear structure)
- **Time to add feature**: Reduced (clear patterns)
- **Code review time**: Reduced (smaller files)

---

## Timeline Estimate

### Phase 1-3 (Core Systems): 2-3 weeks
- Game State: 1 week
- Game Loop: 3-4 days
- Game Update: 1 week

### Phase 4-5 (Supporting Systems): 1-2 weeks
- Input Handling: 3-4 days
- Game Lifecycle: 1 week

### Phase 6-7 (Polish): 1 week
- Configuration: 2-3 days
- Rendering: 2-3 days

### Testing & Polish: 1 week
- Full regression testing
- Performance optimization
- Documentation updates

**Total Estimated Time**: 5-7 weeks (with testing)

---

## Next Steps

1. **Review this plan** with team
2. **Prioritize phases** based on needs
3. **Set up testing framework** (if not exists)
4. **Create feature branch** for refactoring
5. **Start with Phase 1** (Game State extraction)

---

## Questions to Consider

1. **Should we use classes or functions?**
   - Recommendation: Classes for stateful systems, functions for utilities

2. **How to handle global state?**
   - Recommendation: Dependency injection pattern

3. **Event system implementation?**
   - Recommendation: Simple event emitter for decoupling

4. **TypeScript migration?**
   - Recommendation: Consider after refactoring (separate effort)

5. **Testing strategy?**
   - Recommendation: Unit tests for each module, integration tests for game flow

---

**Created**: 2025-11-30  
**Status**: Phase 1 & 2 Complete ✅  
**Last Updated**: 2025-12-11

## Phase 1 Progress

### ✅ Completed
- Created `systems/core/game-state.js` with GameState class
- Extracted all game state properties (80+ properties)
- Implemented `reset()` method for game restart
- Implemented `resetForMenu()` method for returning to menu
- Integrated security system via `setSecureGame()` method
- Maintained backward compatibility with `game` alias
- Updated `restart()` function to use `game.reset()`
- Updated `returnToMainMenu()` function to use `game.resetForMenu()`
- Updated `initSecurity()` to call `game.setSecureGame()`
- Added script tag in `index.html` to load game-state.js before main.js

### 📝 Notes
- Game state is now managed by a class instead of a plain object
- All existing code continues to work via `game` alias
- Security system integration maintained
- Fallback object created if game-state.js fails to load
- **Important**: `restart()` was renamed to `startNewGame()`, then merged into `startGameInternal()` in `menu-system.js`. There is no restart functionality after game over - users return to main menu and must click "Start Game" again.
- **Function Merge**: `startNewGame()` has been merged into `startGameInternal()` to eliminate confusion. All game initialization logic is now in one place in the menu system.

### 🧪 Testing Required
- [ ] Test game start/restart
- [ ] Test game over and return to menu
- [ ] Test security system integration
- [ ] Test all game features (movement, shooting, bosses, etc.)
- [ ] Verify no performance regressions

**Next Review**: After Phase 1 testing

## Phase 2 Progress

### ✅ Completed
- Created `systems/core/game-loop.js` with GameLoop class
- Extracted `gameLoop()` function into GameLoop class
- Extracted debug variables (`__debugFrameCount`, `__debugLastFpsAt`, `__debugLoopEntries`) into GameLoop class
- Implemented `start()`, `stop()`, `pause()`, `resume()` methods
- Updated `init()` in main.js to initialize and use GameLoop instance
- Updated `game-initialization.js` to use GameLoop instance
- Added backward compatibility wrapper for `gameLoop()` function
- Added GameLoop to lazy-loader.js script loading order
- Exposed GameLoop globally for access from other modules

### 📝 Notes
- GameLoop is now a class-based system instead of a function
- All existing code continues to work via backward compatibility wrapper
- Debug FPS tracking is now encapsulated in GameLoop class
- RAF ID management is handled by GameLoop class
- Menu visibility check is handled in GameLoop._loop()

### 🧪 Testing Status
- [x] Test game start/stop - ✅ **PASSED**
- [x] Test game loop performance (FPS tracking) - ✅ **PASSED**
- [x] Test menu visibility pause/resume - ✅ **PASSED**
- [x] Test game over screen rendering - ✅ **PASSED**
- [x] Verify no performance regressions - ✅ **PASSED**
- [x] Test backward compatibility (old code calling gameLoop()) - ✅ **PASSED**

**Status**: ✅ **PHASE 2 COMPLETE AND TESTED**

### 🔧 Fixes Applied During Testing
- Fixed duplicate `gameLoopInstance` declaration
- Fixed `initSecurity` not being exposed globally
- Fixed `game` variable access in `collectibles.js` and `main-rendering.js`
- Fixed double game loop start (removed from `init()`, only started by `initializeGameLogic()`)
- Fixed canvas visibility issues
- Updated `draw()` function to use `window.gameState` instead of local `game` variable

**Next Review**: Ready for Phase 3

