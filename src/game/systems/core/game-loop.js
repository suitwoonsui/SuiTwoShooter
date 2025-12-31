// ==========================================
// GAME LOOP - Core Loop Management
// ==========================================
// Handles the main game loop, frame timing, and FPS tracking
// Extracted from main.js as part of the refactoring effort

console.log('✅ [GAME LOOP] GameLoop module loaded');

/**
 * GameLoop class - Manages the main game loop
 * 
 * Responsibilities:
 * - Frame timing and requestAnimationFrame management
 * - Loop lifecycle (start, stop, pause, resume)
 * - FPS tracking and debugging
 * - Integration with game state and update/draw functions
 */
class GameLoop {
  constructor(gameState, updateFn, drawFn) {
    this.gameState = gameState;
    this.update = updateFn;
    this.draw = drawFn;
    this.isRunning = false;
    this.rafId = null;
    
    // Delta time tracking
    this.lastFrameTime = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    this.deltaTime = 0;
    this.deltaMultiplier = 1.0;
    
    // Constants for delta time calculation
    this.BASE_FPS = 60;
    this.BASE_FRAME_TIME = 1000 / this.BASE_FPS; // 16.67ms
    this.MAX_DELTA_TIME = 50; // Cap at 50ms (20 FPS minimum) to prevent huge jumps and choppiness
    this.MIN_DELTA_TIME = 0; // No minimum - allow natural frame timing (was 8ms, which could cause issues on high refresh displays)
    
    // Debug tracking
    this._debugFrameCount = 0;
    this._debugLastFpsAt = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    this._debugLoopEntries = 0;
    
    // Bind methods to preserve 'this' context
    this._loop = this._loop.bind(this);
  }
  
  /**
   * Start the game loop
   */
  start() {
    if (this.isRunning) {
      console.warn('⚠️ [GAME LOOP] Loop already running');
      return;
    }
    
    // Cancel any existing loop
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    
    // Reset last frame time to current time to prevent huge first-frame delta
    this.lastFrameTime = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    
    this.isRunning = true;
    console.log('🟢 [GAME LOOP] Starting game loop');
    this._loop();
  }
  
  /**
   * Stop the game loop
   */
  stop() {
    if (!this.isRunning) {
      console.warn('⚠️ [GAME LOOP] Loop not running');
      return;
    }
    
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    
    this.isRunning = false;
    console.log('🔴 [GAME LOOP] Stopped game loop');
  }
  
  /**
   * Pause the game loop (stops updating but keeps loop running for rendering)
   * Note: This is different from game.paused which is handled in update()
   */
  pause() {
    // For now, pause is handled by game.paused in update()
    // This method is here for future use if we need loop-level pausing
    console.log('⏸️ [GAME LOOP] Pause requested (handled by game.paused)');
  }
  
  /**
   * Resume the game loop
   */
  resume() {
    // For now, resume is handled by game.paused in update()
    // This method is here for future use if we need loop-level resuming
    console.log('▶️ [GAME LOOP] Resume requested (handled by game.paused)');
  }
  
  /**
   * Internal loop function - called by requestAnimationFrame
   * @private
   */
  _loop() {
    this._debugLoopEntries++;
    
    // Calculate delta time
    const currentTime = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    let deltaTime = currentTime - this.lastFrameTime;
    
    // Clamp delta time to prevent extreme values
    // Max: prevents huge jumps when tab is inactive or frame rate drops severely
    // Min: prevents tiny deltas from causing micro-movements and choppiness
    deltaTime = Math.max(this.MIN_DELTA_TIME, Math.min(deltaTime, this.MAX_DELTA_TIME));
    
    // Calculate normalized multiplier (1.0 at 60 FPS)
    this.deltaTime = deltaTime;
    this.deltaMultiplier = deltaTime / this.BASE_FRAME_TIME;
    
    // Update last frame time
    this.lastFrameTime = currentTime;
    
    // Store delta time in game state for use in update functions
    const game = this.gameState;
    if (game) {
      game.deltaTime = this.deltaTime;
      game.deltaMultiplier = this.deltaMultiplier;
      game.lastFrameTime = currentTime;
    }
    
    // Debug logging (throttled)
    if (this._debugLoopEntries % 300 === 1) {
      const rafId = game?._rafId || 'n/a';
      const speed = game?.speed || 'n/a';
      console.log('🧪 [DEBUG] gameLoop entry count:', this._debugLoopEntries, 'RAF id:', rafId, 'speed:', speed, 'delta:', this.deltaTime.toFixed(2), 'multiplier:', this.deltaMultiplier.toFixed(2));
    }
    
    // Check if menu is visible - stop loop if so
    if (typeof gameState !== 'undefined' && gameState.isMenuVisible) {
      console.log('⏸️ Game loop paused - menu visible');
      this.isRunning = false;
      this.rafId = null;
      // Reset last frame time to prevent accumulation when menu is shown
      this.lastFrameTime = currentTime;
      if (game) {
        game.lastFrameTime = currentTime;
      }
      return;
    }
    
    // Continue loop if game is running OR if game is over (to keep rendering game over screen)
    if (game && (game.gameRunning || game.gameOver)) {
      if (!game.ctx) {
        console.error('❌ Canvas context is null in gameLoop!');
        this.isRunning = false;
        this.rafId = null;
        return;
      }
      
      // Reset delta time if game is paused to prevent accumulation
      if (game.paused) {
        this.lastFrameTime = currentTime;
        game.lastFrameTime = currentTime;
      }
      
      // Update and draw
      this.update();
      this.draw();
      
      // FPS tracking (only log if debug mode enabled)
      this._debugFrameCount++;
      const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      if (now - this._debugLastFpsAt >= 1000) {
        // Only log FPS if explicitly enabled via window.DEBUG_FPS
        if (typeof window !== 'undefined' && window.DEBUG_FPS) {
          console.log('🎯 [DEBUG] FPS≈', this._debugFrameCount, '| speed:', game.speed);
        }
        this._debugFrameCount = 0;
        this._debugLastFpsAt = now;
      }
      
      // Schedule next frame
      this.rafId = requestAnimationFrame(this._loop);
      
      // Store RAF ID in game state for external access
      if (game) {
        game._rafId = this.rafId;
      }
    } else {
      // Game stopped and not over, don't continue loop
      this.isRunning = false;
      this.rafId = null;
    }
  }
  
  /**
   * Get current loop state
   */
  getState() {
    return {
      isRunning: this.isRunning,
      rafId: this.rafId,
      frameCount: this._debugFrameCount,
      loopEntries: this._debugLoopEntries
    };
  }
}

// Create a global instance (will be initialized in main.js)
let gameLoopInstance = null;

/**
 * Initialize the game loop
 * @param {Object} gameState - The game state object
 * @param {Function} updateFn - The update function
 * @param {Function} drawFn - The draw function
 * @returns {GameLoop} The game loop instance
 */
function initGameLoop(gameState, updateFn, drawFn) {
  if (gameLoopInstance) {
    console.warn('⚠️ [GAME LOOP] GameLoop already initialized');
    return gameLoopInstance;
  }
  
  gameLoopInstance = new GameLoop(gameState, updateFn, drawFn);
  console.log('✅ [GAME LOOP] GameLoop initialized');
  return gameLoopInstance;
}

/**
 * Get the game loop instance
 * @returns {GameLoop|null} The game loop instance
 */
function getGameLoop() {
  return gameLoopInstance;
}

// Export for use in main.js and other modules
if (typeof window !== 'undefined') {
  window.GameLoop = GameLoop;
  window.initGameLoop = initGameLoop;
  window.getGameLoop = getGameLoop;
}

console.log('✅ [GAME LOOP] GameLoop module ready');

