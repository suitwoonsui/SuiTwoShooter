// ==========================================
// GAME INITIALIZATION
// ==========================================
// Handles all game logic initialization when starting a new game
// UI concerns are handled in menu-system.js

/**
 * Initialize game logic for a new game
 * This function handles:
 * - Security system reset
 * - Game state reset
 * - Item application (orb level, extra lives, force field)
 * - Item consumption from blockchain
 * - Player position reset
 * - Tile/enemy clearing
 * - Game loop start
 * 
 * @param {Object} game - The game state object
 * @param {Function} initSecurity - Security system initialization function
 * @param {Function} resetCoinStreak - Function to reset coin streak
 * @param {Object} player - Player object
 * @param {Function} clearGameArrays - Function to clear tiles and enemies arrays
 * @param {Function} generateTiles - Function to generate initial tiles
 * @param {Function|Object} gameLoop - Function to start the game loop (legacy) or GameLoop instance (new)
 */
function initializeGameLogic(game, initSecurity, resetCoinStreak, player, clearGameArrays, generateTiles, gameLoop) {
  console.log('🔄 Starting new game');
  console.log('🧪 [DEBUG] Starting game. baseSpeed:', game.baseSpeed, 'speedIncrement:', game.speedIncrement, 'maxSpeed:', game.maxSpeed);
  console.log('📊 Game state before starting:', {
    gameRunning: game.gameRunning,
    gameOver: game.gameOver,
    paused: game.paused,
    hasCanvas: !!game.canvas,
    hasCtx: !!game.ctx
  });
  
  // Reinitialize/reset security system
  if (typeof initSecurity === 'function') {
    initSecurity();
  } else {
    console.error('❌ initSecurity is not a function!');
  }
  
  // PRESERVE tournament state before reset
  const preservedTournamentState = {
    isTournamentMode: game.isTournamentMode,
    tournamentObjectId: game.tournamentObjectId,
    tournamentCategory: game.tournamentCategory,
    tournamentName: game.tournamentName,
    returnToTournament: game.returnToTournament,
  };
  
  // Reset base game state using GameState.reset()
  if (game && typeof game.reset === 'function') {
    game.reset();
  } else {
    console.warn('⚠️ GameState.reset() not available, using fallback reset');
    // Fallback: manual reset if GameState not available
    game._fallbackScore = 0;
    game.scrollSpeed = game.baseScrollSpeed;
    game.enemySpeed = game.baseEnemySpeed;
    game.coins = 0;
    game.distance = 0;
    game.distanceSinceBoss = 0;
    game.projectiles = [];
    game.enemyProjectiles = [];
    game.bossProjectiles = [];
    game.particles = [];
    game.missilesPerShot = 1;
    game.startingOrbLevel = 1;
    game.projectileLevel = 1;
    game.orbLevelCap = 3;
    game.baseLives = 3;
    game.purchasedLives = 0;
    game.lives = 3;
    game.maxLives = 3;
    game.gameRunning = true;
    game.gameOver = false;
    game.paused = false;
    game.bossesDefeated = 0;
    game.currentTier = 1;
    game.enemiesDefeated = 0;
    game.bossTiers = [];
    game.enemyTypes = [];
    game.bossHits = 0;
    game.levelStartDelay = game.levelStartDelayDuration;
    game.forceField.level = 0;
    game.forceField.active = false;
    
    // RESTORE tournament state after fallback reset
    game.isTournamentMode = preservedTournamentState.isTournamentMode;
    game.tournamentObjectId = preservedTournamentState.tournamentObjectId;
    game.tournamentCategory = preservedTournamentState.tournamentCategory;
    game.tournamentName = preservedTournamentState.tournamentName;
    game.returnToTournament = preservedTournamentState.returnToTournament;
  }
  
  // Ensure tournament state is preserved (in case reset() didn't preserve it)
  if (preservedTournamentState && preservedTournamentState.isTournamentMode) {
    game.isTournamentMode = preservedTournamentState.isTournamentMode;
    game.tournamentObjectId = preservedTournamentState.tournamentObjectId;
    game.tournamentCategory = preservedTournamentState.tournamentCategory;
    game.tournamentName = preservedTournamentState.tournamentName;
    game.returnToTournament = preservedTournamentState.returnToTournament;
    
    // Also ensure window.game has the state (they should be the same, but ensure both)
    if (typeof window !== 'undefined' && window.game) {
      window.game.isTournamentMode = preservedTournamentState.isTournamentMode;
      window.game.tournamentObjectId = preservedTournamentState.tournamentObjectId;
      window.game.tournamentCategory = preservedTournamentState.tournamentCategory;
      window.game.tournamentName = preservedTournamentState.tournamentName;
      window.game.returnToTournament = preservedTournamentState.returnToTournament;
    }
    
    console.log('🏆 [TOURNAMENT] Preserved tournament state after reset', {
      isTournamentMode: game.isTournamentMode,
      tournamentObjectId: game.tournamentObjectId,
      tournamentCategory: game.tournamentCategory,
      windowGameIsTournamentMode: window.game?.isTournamentMode,
      windowGameTournamentObjectId: window.game?.tournamentObjectId,
    });
  }
  
  console.log('🆔 [SESSION] Generated session ID:', game.sessionId);
  
  // Collect all start items that need to be consumed
  const itemsToConsume = [];
  
  // Initialize orb level with purchased orb level start
  game.startingOrbLevel = 1; // Default starting level
  if (game.selectedItems && game.selectedItems.orbLevel) {
    const orbLevelPurchase = game.selectedItems.orbLevel;
    // Level 1 purchase = start at 2, Level 2 = start at 3, Level 3 = start at 4
    game.startingOrbLevel = orbLevelPurchase + 1;
    game.projectileLevel = game.startingOrbLevel;
    console.log(`🔮 [ORB LEVEL] Starting at Orb Level ${game.startingOrbLevel} (purchased Level ${orbLevelPurchase})`);
    
    // Add to batch consumption list
    itemsToConsume.push({
      itemId: 'orbLevel',
      level: orbLevelPurchase,
      quantity: 1,
    });
  } else {
    game.projectileLevel = 1; // Default starting level
  }
  
  // Calculate power-up cap (startingLevel + 2)
  game.orbLevelCap = game.startingOrbLevel + 2;
  console.log(`🔮 [ORB LEVEL] Power-up cap set to Level ${game.orbLevelCap} (starting at ${game.startingOrbLevel})`);
  
  // Set fire rate based on starting orb level (stretched for 10 levels)
  // Formula: 300ms at level 1, ~22.22ms decrease per level, 100ms at level 10 (matches old max)
  game.autoFireInterval = Math.max(100, Math.round(300 - (game.projectileLevel - 1) * 22.22));
  
  // Initialize lives with purchased extra lives
  game.baseLives = 3; // Base lives (always 3)
  game.purchasedLives = 0; // Purchased extra lives
  
  // Check for extra lives in selected items
  if (game.selectedItems && game.selectedItems.extraLives) {
    const extraLivesLevel = game.selectedItems.extraLives;
    // Level 1 = +1, Level 2 = +2, Level 3 = +3
    game.purchasedLives = extraLivesLevel;
    console.log(`❤️ [EXTRA LIVES] Starting with ${extraLivesLevel} extra lives (Level ${extraLivesLevel})`);
    
    // Add to batch consumption list
    itemsToConsume.push({
      itemId: 'extraLives',
      level: extraLivesLevel,
      quantity: 1,
    });
  }
  
  // Total lives = base + purchased
  game.lives = game.baseLives + game.purchasedLives;
  game.maxLives = game.lives; // Update max lives
  
  // Reset force field system
  // Check for purchased force field in selected items
  if (game.selectedItems && game.selectedItems.forceField) {
    const forceFieldLevel = game.selectedItems.forceField;
    game.forceField.level = forceFieldLevel;
    game.forceField.active = true;
    console.log(`🛡️ [FORCE FIELD] Starting with Level ${forceFieldLevel} force field`);
    
    // Add to batch consumption list
    itemsToConsume.push({
      itemId: 'forceField',
      level: forceFieldLevel,
      quantity: 1,
    });
  } else {
    game.forceField.level = 0;
    game.forceField.active = false;
  }
  
  // Batch consume all start items in a single transaction
  if (itemsToConsume.length > 0) {
    console.log(`🍽️ [CONSUMPTION] Batch consuming ${itemsToConsume.length} start items in single transaction:`, itemsToConsume);
    
    // Use batch consumption function if available
    if (typeof consumeItemsFromBlockchain === 'function') {
      consumeItemsFromBlockchain(itemsToConsume).catch(error => {
        console.error('❌ [CONSUMPTION] Failed to batch consume start items from blockchain:', error);
        // Continue game even if blockchain consumption fails
      });
      console.log(`✅ [CONSUMPTION] Batch consumed ${itemsToConsume.length} start items (blockchain)`);
    } else if (typeof consumeItemFromBlockchain === 'function') {
      // Fallback: consume items one by one if batch function not available
      console.warn('⚠️ [CONSUMPTION] Batch function not available, consuming items individually');
      for (const item of itemsToConsume) {
        consumeItemFromBlockchain(item.itemId, item.level, item.quantity).catch(error => {
          console.error(`❌ [CONSUMPTION] Failed to consume ${item.itemId} from blockchain:`, error);
        });
      }
    } else {
      // Fallback to localStorage if blockchain functions not available
      if (typeof removeItemFromInventory === 'function') {
        const walletAddress = typeof getWalletAddress === 'function' ? getWalletAddress() : null;
        for (const item of itemsToConsume) {
          removeItemFromInventory(item.itemId, item.level, item.quantity, walletAddress);
          console.log(`✅ [CONSUMPTION] Consumed ${item.itemId} level ${item.level} at game start (localStorage fallback)`);
        }
      }
    }
  }
  
  // Reset coin streak and force field
  if (typeof resetCoinStreak === 'function') {
    resetCoinStreak();
  }
  game.forceField.maxStreak = 0;
  game.forceField.invulnerabilityTime = 0;
  
  // Reset player position
  if (typeof player !== 'undefined' && player) {
    player.lane = 1;
    player.y = game.height / 2 - player.height / 2;
    game.mouseY = game.height / 2;
    player.trail = [];
  }
  
  // Clear tiles and enemies arrays before generating new ones
  if (typeof clearGameArrays === 'function') {
    clearGameArrays();
  } else {
    console.warn('⚠️ clearGameArrays is not available, tiles/enemies may not be cleared');
  }
  
  // Generate initial tiles
  if (typeof generateTiles === 'function') {
    generateTiles();
  } else {
    console.error('❌ generateTiles is not a function!');
  }
  
  console.log('✅ New game started. State:', {
    gameRunning: game.gameRunning,
    gameOver: game.gameOver,
    paused: game.paused
  });
  
  // Debug canvas visibility
  console.log('🎨 Canvas check:', {
    exists: !!game.canvas,
    computedWidth: game.canvas ? window.getComputedStyle(game.canvas).width : 'N/A',
    computedHeight: game.canvas ? window.getComputedStyle(game.canvas).height : 'N/A',
    offsetWidth: game.canvas ? game.canvas.offsetWidth : 'N/A',
    offsetHeight: game.canvas ? game.canvas.offsetHeight : 'N/A'
  });
  
  // Start the game loop
  console.log('🔄 Starting game loop...');
  
  // Use GameLoop instance if available
  if (typeof getGameLoop === 'function') {
    const loopInstance = getGameLoop();
    if (loopInstance) {
      // Stop any existing loop first
      if (typeof game !== 'undefined' && game._rafId) {
        console.warn('⚠️ [DEBUG] Detected existing RAF id. Cancelling:', game._rafId);
        try { cancelAnimationFrame(game._rafId); } catch (e) { /* ignore */ }
        game._rafId = null;
      }
      loopInstance.start();
      console.log('✅ [GAME LOOP] Game loop started via GameLoop instance');
    } else {
      console.error('❌ [GAME LOOP] GameLoop instance not found! Make sure init() was called first.');
    }
  } else if (typeof gameLoop === 'function') {
    // Fallback to old function-based loop (for backward compatibility)
    console.warn('⚠️ [GAME LOOP] Using legacy gameLoop() function - consider updating to GameLoop class');
    if (typeof game !== 'undefined' && game._rafId) {
      console.warn('⚠️ [DEBUG] Detected existing RAF id. Cancelling:', game._rafId);
      try { cancelAnimationFrame(game._rafId); } catch (e) { /* ignore */ }
      game._rafId = null;
    }
    gameLoop();
  } else {
    console.error('❌ [GAME LOOP] Neither GameLoop instance nor gameLoop function available!');
  }
}

// Export for use in menu-system.js
if (typeof window !== 'undefined') {
  window.initializeGameLogic = initializeGameLogic;
}

// For module systems (if used)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initializeGameLogic };
}

