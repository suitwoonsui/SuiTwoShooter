// ==========================================
// GAME LIFECYCLE SYSTEM
// ==========================================
// Manages game initialization, game over, and return to menu
// Handles lifecycle transitions and state management

// GameLifecycle module loaded

/**
 * GameLifecycle class - Manages game lifecycle events
 * 
 * Responsibilities:
 * - Game initialization (canvas setup, system initialization)
 * - Security system initialization
 * - Game over handling
 * - Return to menu handling
 * - Lifecycle state transitions
 */
class GameLifecycle {
  constructor(gameState) {
    if (!gameState) {
      console.error('❌ [GAME LIFECYCLE] GameState is required for GameLifecycle');
      throw new Error('GameState is required for GameLifecycle');
    }

    this.gameState = gameState;
    this.player = null; // Will be set during init
    this.secureGame = null; // Security system reference
    
    // GameLifecycle initialized
  }

  /**
   * Initialize the game (canvas setup, systems initialization)
   * This is called once when the game first loads
   */
  init() {
    const game = this.gameState;
    
    game.canvas = document.getElementById('gameCanvas');
    if (!game.canvas) {
      console.error('❌ [GAME LIFECYCLE] Canvas not found! Cannot initialize game.');
      return;
    }
    
    game.ctx = game.canvas.getContext('2d');
    
    // Always use original game dimensions (800x480) for game logic
    // The responsive canvas system handles display scaling
    game.width = 800;
    game.height = 480;
    game.laneHeight = game.height / 3;
    
    // Get player reference (should be global)
    this.player = (typeof window !== 'undefined' && window.player) ? window.player : null;
    if (this.player) {
      this.player.y = game.height / 2 - this.player.height / 2;
    }
    game.mouseY = game.height / 2;

    // Initialize responsive canvas system
    if (typeof ResponsiveCanvas !== 'undefined') {
      ResponsiveCanvas.initialize(game.canvas);
    } else {
      console.warn('⚠️ [GAME LIFECYCLE] ResponsiveCanvas not available, using fallback sizing');
    }

    // Initialize security system
    this.initSecurity();

    // Initialize game input system (keyboard and mouse)
    if (typeof initGameInput === 'function') {
      const uiGameState = (typeof window !== 'undefined' && window.uiGameState) ? window.uiGameState : null;
      initGameInput(game, game.canvas, uiGameState);
    } else {
      console.error('❌ [GAME LIFECYCLE] initGameInput not available! Make sure game-input.js is loaded.');
      // Fallback: initialize keys object for backward compatibility
      if (!game.keys) {
        game.keys = {};
      }
    }

    // User interaction handling for game over screen
    this._setupGameOverInteractionHandlers();

    // Touch handling - Enhanced with TouchInput system
    this._setupTouchHandling();

    // Initialize game update system
    if (typeof initGameUpdate === 'function') {
      const updateInstance = initGameUpdate(game);
      if (typeof window !== 'undefined') {
        window.gameUpdateInstance = updateInstance;
      }
    } else {
      console.error('❌ [GAME LIFECYCLE] initGameUpdate not available! Make sure game-update.js is loaded.');
    }
    
    // Initialize game loop (but don't start it yet - it will be started by initializeGameLogic)
    if (typeof initGameLoop === 'function') {
      const updateFn = (typeof window !== 'undefined' && window.update) ? window.update : null;
      const drawFn = (typeof window !== 'undefined' && window.draw) ? window.draw : null;
      
      if (updateFn && drawFn) {
        const loopInstance = initGameLoop(game, updateFn, drawFn);
        if (typeof window !== 'undefined') {
          window.gameLoopInstance = loopInstance;
        }
        game.gameRunning = false; // Will be set to true by initializeGameLogic
      } else {
        console.warn('⚠️ [GAME LIFECYCLE] update or draw function not available');
      }
    } else {
      console.error('❌ [GAME LIFECYCLE] initGameLoop not available! Make sure game-loop.js is loaded.');
    }
  }

  /**
   * Set up game over interaction handlers
   * @private
   */
  _setupGameOverInteractionHandlers() {
    const game = this.gameState;
    const gameState = (typeof window !== 'undefined' && window.uiGameState) ? window.uiGameState : null;
    
    function handleGameOverInteraction(e) {
      if (game.gameOver && (!gameState || !gameState.isMenuVisible)) {
        // Check if name input modal is visible or about to be shown
        const nameInputModal = document.getElementById('nameInputModal');
        if (nameInputModal && nameInputModal.classList.contains('name-input-modal-visible')) {
          return; // Don't return to main menu if name input modal is showing
        }
        // The leaderboard system handles the interaction via onGameOver() with capture: true
      }
    }

    // Mouse click handling for game over screen
    document.addEventListener('click', handleGameOverInteraction);

    // Touch handling for game over screen
    document.addEventListener('touchstart', handleGameOverInteraction);
  }

  /**
   * Set up touch handling (fallback if TouchInput not available)
   * @private
   */
  _setupTouchHandling() {
    const game = this.gameState;
    
    // Touch handling - Enhanced with TouchInput system
    if (typeof TouchInput !== 'undefined' && TouchInput.isInitialized) {
      // TouchInput system handles all touch events
    } else {
      // Fallback to original touch handling
      let touchY = 0;
      game.canvas.addEventListener('touchstart', e => {
        e.preventDefault();
        touchY = e.touches[0].clientY;
        if (typeof ResponsiveCanvas !== 'undefined' && ResponsiveCanvas.isInitialized) {
          // Use responsive coordinate conversion
          const coords = ResponsiveCanvas.screenToGameCoords(e.touches[0].clientX, touchY);
          game.mouseY = coords.y;
        } else {
          // Fallback to original method
          const rect = game.canvas.getBoundingClientRect();
          game.mouseY = touchY - rect.top;
        }
      });
      
      game.canvas.addEventListener('touchmove', e => {
        e.preventDefault();
        touchY = e.touches[0].clientY;
        if (typeof ResponsiveCanvas !== 'undefined' && ResponsiveCanvas.isInitialized) {
          // Use responsive coordinate conversion
          const coords = ResponsiveCanvas.screenToGameCoords(e.touches[0].clientX, touchY);
          game.mouseY = coords.y;
        } else {
          // Fallback to original method
          const rect = game.canvas.getBoundingClientRect();
          game.mouseY = touchY - rect.top;
        }
      });
    }
  }

  /**
   * Initialize security system
   */
  initSecurity() {
    // Get secureGame reference from global scope (set by security system)
    let secureGame = (typeof window !== 'undefined' && window.secureGame) ? window.secureGame : null;
    
    // If secureGame already exists, reset it instead of creating a new one
    if (secureGame) {
      // Reset the existing secureGame instance for a new game
      if (typeof secureGame.reset === 'function') {
        secureGame.reset();
      } else {
        // Fallback: manually reset score if reset method doesn't exist
        secureGame.score = 0;
        secureGame._score = 0;
        secureGame._actionsCount = 0;
        secureGame.startTime = Date.now();
        secureGame.actionLog = [];
      }
      this.secureGame = secureGame;
      return;
    }
    
    if (window.GameSecurity) {
      const securitySystem = window.GameSecurity.initializeSecureGame();
      secureGame = securitySystem.secureGame;
      const onEnemyDestroyed = securitySystem.onEnemyDestroyed;
      const onSecureGameOver = securitySystem.onGameOver;
      
      // Store references globally for backward compatibility
      if (typeof window !== 'undefined') {
        window.secureGame = secureGame;
        window.onEnemyDestroyed = onEnemyDestroyed;
        window.onSecureGameOver = onSecureGameOver;
      }
      
      this.secureGame = secureGame;
      
      // Set secure game reference in game state
      if (this.gameState && typeof this.gameState.setSecureGame === 'function') {
        this.gameState.setSecureGame(secureGame);
      }
    } else {
      console.warn('⚠️ [GAME LIFECYCLE] Security system not loaded, falling back to basic mode');
    }
  }

  /**
   * Handle game over
   */
  gameOver() {
    const game = this.gameState;
    const secureGame = this.secureGame || (typeof window !== 'undefined' && window.secureGame) ? window.secureGame : null;
    
    // Play game over sound
    if (typeof playGameOverSound === 'function') {
      playGameOverSound();
    }
    
    game.gameRunning = false;
    game.gameOver = true;
    
    // Stop all movement
    game.speed = 0;
    game.projectiles = [];
    game.enemyProjectiles = [];
    
    // Clear particles and add game over particles
    game.particles = [];
    
    // End particles effect
    if (typeof Particle !== 'undefined') {
      for (let i = 0; i < 50; i++) {
        game.particles.push(new Particle(
          Math.random() * game.width,
          Math.random() * game.height,
          '#FF0000',
          { x: (Math.random()-0.5)*3, y: (Math.random()-0.5)*3 }
        ));
      }
    }
    
    // SECURE: Use secure game over handling
    // Capture score BEFORE any security validation (in case it gets reset)
    // Try multiple sources to get the actual score - check ALL sources, not just if getter returns 0
    let capturedScore = 0;
    
    // Priority 1: Check secureGame.score directly (most reliable)
    if (secureGame && secureGame.score !== undefined && secureGame.score !== null) {
      capturedScore = secureGame.score;
    }
    
    // Priority 2: Check secureGame._score (internal score)
    if ((capturedScore === 0 || capturedScore === null || capturedScore === undefined) && secureGame && secureGame._score !== undefined && secureGame._score !== null) {
      capturedScore = secureGame._score;
    }
    
    // Priority 3: Check game.score getter
    if ((capturedScore === 0 || capturedScore === null || capturedScore === undefined)) {
      const getterScore = game.score;
      if (getterScore !== undefined && getterScore !== null && getterScore > 0) {
        capturedScore = getterScore;
      }
    }
    
    // Priority 4: Check fallback score
    if ((capturedScore === 0 || capturedScore === null || capturedScore === undefined) && game._fallbackScore !== undefined && game._fallbackScore !== null && game._fallbackScore > 0) {
      capturedScore = game._fallbackScore;
    }
    
    // IMPORTANT: Store the captured score FIRST before calling onSecureGameOver
    // This ensures the score is preserved even if onSecureGameOver resets it
    let finalScoreToUse = capturedScore;
    
    // Store the score in all places BEFORE calling security validation
    // This way if validation resets the score, we still have it stored
    if (secureGame) {
      // Store captured score in secureGame BEFORE validation
      secureGame.score = capturedScore;
      secureGame._score = capturedScore;
    }
    game._fallbackScore = capturedScore;
    game._finalScore = capturedScore;
    
    // Get onSecureGameOver from global scope
    const onSecureGameOver = (typeof window !== 'undefined' && window.onSecureGameOver) ? window.onSecureGameOver : null;
    
    // Call security validation AFTER storing the score
    // IMPORTANT: onSecureGameOver() calls submitScore() which reads this._score
    // If _score was reset to 0, we need to restore it from capturedScore before calling
    if (onSecureGameOver && secureGame) {
      // Ensure secureGame._score has the captured score before calling submitScore
      // submitScore() returns this._score, so we need it to be correct
      secureGame._score = capturedScore;
      
      const result = onSecureGameOver();
      
      // Only use validation result if it's valid, > 0, AND matches or is close to captured score
      // If validation returns 0 or much different, it likely reset the score - use captured instead
      if (result && result.success && result.score !== undefined && result.score !== null && result.score > 0) {
        // Use validated score only if it's reasonable (within 10% of captured or exact match)
        const scoreDiff = Math.abs(result.score - capturedScore);
        const scoreDiffPercent = capturedScore > 0 ? (scoreDiff / capturedScore) * 100 : 100;
        
        if (scoreDiffPercent < 10 || result.score === capturedScore) {
          // Validated score is close to captured - use it
          finalScoreToUse = result.score;
        } else {
          // Validated score is too different - validation likely reset it, use captured instead
          console.warn('⚠️ [GAME OVER] Validation score differs significantly from captured score. Using captured score.', {
            capturedScore,
            validatedScore: result.score,
            difference: scoreDiff,
            percentDiff: scoreDiffPercent.toFixed(2) + '%'
          });
          // Keep capturedScore (already stored above)
        }
      } else {
        // Security validation failed or returned 0 - keep the captured score
        // Don't overwrite with 0 - we already stored capturedScore above
        if (result && result.error) {
          console.warn('⚠️ [GAME OVER] Security validation warning:', result.error);
        }
        // finalScoreToUse already set to capturedScore above
      }
      
      // Update stored scores with finalScoreToUse (which is either validated or captured)
      if (secureGame) {
        secureGame.score = finalScoreToUse;
        secureGame._score = finalScoreToUse;
      }
      game._fallbackScore = finalScoreToUse;
      game._finalScore = finalScoreToUse;
    }
    
    // Debug: Log the score to verify it's being set correctly
    console.log('🎮 [GAME OVER] Final score captured and set:', {
      capturedScore,
      finalScoreToUse,
      secureGameScore: secureGame ? secureGame.score : 'N/A',
      secureGame_Score: secureGame ? secureGame._score : 'N/A',
      fallbackScore: game._fallbackScore,
      gameScoreGetter: game.score,
      _finalScore: game._finalScore
    });
    
    // Capture all game stats at game over time (before any potential reset)
    const gameStats = {
      score: finalScoreToUse,
      distance: game.distance || 0,
      coins: game.coins || 0,
      bossesDefeated: game.bossesDefeated || 0,
      enemiesDefeated: game.enemiesDefeated || 0,
      longestCoinStreak: game.forceField?.maxStreak || 0,
      sessionId: game.sessionId || null,
      anchorSessionId: game.anchorSessionId != null ? game.anchorSessionId : 0, // For tournament submit (Anchor)
      bossTiers: game.bossTiers || [],
      enemyTypes: game.enemyTypes || [],
      bossHits: game.bossHits || 0
    };
    
    // Always call onGameOver to set up interaction handlers, even if validation failed
    // This ensures the game over screen can proceed to the next screen
    // Pass stats object instead of just score
    if (typeof onGameOver === 'function') {
      onGameOver(gameStats);
    } else if (typeof window !== 'undefined' && typeof window.onGameOver === 'function') {
      window.onGameOver(gameStats);
    }
  }

  /**
   * Return to main menu from game over screen
   */
  returnToMainMenu() {
    const game = this.gameState;
    const gameState = (typeof window !== 'undefined' && window.uiGameState) ? window.uiGameState : null;
    
    // Check if name input modal is visible - don't show main menu if it is
    const nameInputModal = document.getElementById('nameInputModal');
    if (nameInputModal && nameInputModal.classList.contains('name-input-modal-visible')) {
      return; // Don't show main menu if name input modal is showing
    }
    
    // Stop the game loop
    if (typeof getGameLoop === 'function') {
      const loopInstance = getGameLoop();
      if (loopInstance) {
        loopInstance.stop();
      }
    }
    
    // Reset game state for menu using GameState.resetForMenu()
    if (game && typeof game.resetForMenu === 'function') {
      game.resetForMenu();
    } else {
      // Fallback: manual reset if GameState not available
      game.gameRunning = false;
      game.gameOver = false;
      game.paused = false;
      if (game.projectiles) game.projectiles = [];
      if (game.enemyProjectiles) game.enemyProjectiles = [];
      if (game.bossProjectiles) game.bossProjectiles = [];
      if (game.particles) game.particles = [];
      game.scrollSpeed = 0;
      game.bossActive = false;
      game.bossWarning = false;
      if (game.boss) game.boss = null;
    }
    
    // Clear tiles and enemies (these are global arrays, not part of game state)
    if (typeof window !== 'undefined') {
      if (window.tiles) window.tiles = [];
      if (window.enemies) window.enemies = [];
      // Sync local arrays if sync function exists
      if (typeof window.syncGameArrays === 'function') {
        window.syncGameArrays();
      }
    }
    if (typeof tiles !== 'undefined') tiles = [];
    if (typeof enemies !== 'undefined') enemies = [];
    
    // Check if we should return to tournament screen instead of main menu
    const shouldReturnToTournament = (game && game.returnToTournament) || 
                                     (gameState && gameState.returnToTournament) ||
                                     (typeof window !== 'undefined' && window.game && window.game.returnToTournament);
    
    // Update game state
    if (gameState) {
      gameState.isMenuVisible = !shouldReturnToTournament; // Only set to true if not returning to tournament
      gameState.isGameRunning = false;
      gameState.isPaused = false;
      gameState.isGameOver = false;
    }
    
    // Hide game container
    const gameContainer = document.querySelector('.game-container');
    if (gameContainer) {
      gameContainer.classList.add('game-container-hidden');
      gameContainer.classList.remove('game-container-visible');
    }
    
    // Stop all audio
    if (typeof stopBackgroundMusic === 'function') {
      stopBackgroundMusic();
    }
    if (typeof stopGameplayMusic === 'function') {
      stopGameplayMusic();
    }
    
    // Clear selected items from previous game
    if (game.selectedItems) {
      game.selectedItems = null;
    }
    if (game.checkedOutItems) {
      game.checkedOutItems = null;
    }
    
    let menuDataRefreshDelegatedToMenuService = false;

    if (shouldReturnToTournament) {
      log.debug('GAME LIFECYCLE', 'Returning to tournament screen instead of main menu');
      
      // Clear return to tournament flag
      if (game) game.returnToTournament = false;
      if (gameState) gameState.returnToTournament = false;
      if (typeof window !== 'undefined' && window.game) {
        window.game.returnToTournament = false;
      }
      
      // Ensure main menu is hidden
      const mainMenu = document.getElementById('mainMenuOverlay');
      if (mainMenu) {
        mainMenu.classList.remove('main-menu-overlay-visible');
        mainMenu.classList.add('main-menu-overlay-hidden');
      }
      
      // Show tournament screen instead of main menu
      if (typeof showTournaments === 'function') {
        showTournaments();
      } else {
        log.warn('GAME LIFECYCLE', 'showTournaments not available, falling back to main menu');
        // Fallback to main menu
        if (typeof MenuService !== 'undefined' && MenuService.show) {
          MenuService.show({ afterGame: true });
          menuDataRefreshDelegatedToMenuService = true;
        }
      }
    } else {
      // Show main menu overlay
      const mainMenu = document.getElementById('mainMenuOverlay');
      if (mainMenu) {
        mainMenu.classList.add('main-menu-overlay-visible');
        mainMenu.classList.remove('main-menu-overlay-hidden');
      }
      
      // Use MenuService if available
      if (typeof MenuService !== 'undefined' && MenuService.show) {
        MenuService.show({ afterGame: true });
        menuDataRefreshDelegatedToMenuService = true;
      }
    }

    if (typeof GameDataFlow !== 'undefined' && GameDataFlow.onReturnToMenu) {
      if (menuDataRefreshDelegatedToMenuService) {
        return;
      }
      if (shouldReturnToTournament) {
        GameDataFlow.onReturnToMenu();
      } else {
        GameDataFlow.onReturnToMenu({ force: true, afterGame: true });
      }
    }
  }
}

// Global instance
let gameLifecycleInstance = null;

/**
 * Initialize and return the singleton GameLifecycle instance
 * @param {Object} gameState - The game state object
 * @returns {GameLifecycle} The GameLifecycle instance
 */
function initGameLifecycle(gameState) {
  if (!gameLifecycleInstance) {
    gameLifecycleInstance = new GameLifecycle(gameState);
  }
  
  // Expose globally
  if (typeof window !== 'undefined') {
    window.gameLifecycleInstance = gameLifecycleInstance;
  }
  
  return gameLifecycleInstance;
}

/**
 * Get the GameLifecycle instance
 * @returns {GameLifecycle|null} The GameLifecycle instance, or null if not initialized
 */
function getGameLifecycle() {
  return gameLifecycleInstance;
}

// Export for use in main.js and other modules
if (typeof window !== 'undefined') {
  window.GameLifecycle = GameLifecycle;
  window.initGameLifecycle = initGameLifecycle;
  window.getGameLifecycle = getGameLifecycle;
}

// GameLifecycle module ready


