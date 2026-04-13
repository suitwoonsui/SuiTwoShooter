// ==========================================
// MAIN GAME MANAGEMENT - CORE FUNCTIONS
// ==========================================

// Load game state system
// GameState is loaded via script tag before this file
// Use the global gameState instance as 'game' for backward compatibility
// This allows all existing code that references 'game' to continue working
let game;
if (typeof window !== 'undefined' && window.gameState) {
  game = window.gameState;
  // Expose globally for backward compatibility
  window.game = game;
  console.log('✓ GameState loaded from game-state.js');
} else {
  console.error('❌ GameState not found! Make sure game-state.js is loaded before main.js');
  // Create a minimal fallback object to prevent crashes
  game = {
    canvas: null,
    ctx: null,
    width: 800,
    height: 480,
    laneHeight: 160,
    scrollSpeed: 2.5,
    baseScrollSpeed: 2.5,
    scrollSpeedIncrement: 0.01,
    maxScrollSpeed: 6,
    enemySpeed: 2.5,
    baseEnemySpeed: 2.5,
    enemySpeedIncrement: 0.01,
    distanceSpeed: 3.5,
    get speed() { return this.scrollSpeed; },
    set speed(value) { this.scrollSpeed = value; },
    get baseSpeed() { return this.baseScrollSpeed; },
    set baseSpeed(value) { this.baseScrollSpeed = value; },
    get speedIncrement() { return this.scrollSpeedIncrement; },
    set speedIncrement(value) { this.scrollSpeedIncrement = value; },
    get maxSpeed() { return this.maxScrollSpeed; },
    set maxSpeed(value) { this.maxScrollSpeed = value; },
    get score() { return this._fallbackScore || 0; },
    _fallbackScore: 0,
    coins: 0,
    distance: 0,
    distanceSinceBoss: 0,
    bossThreshold: 5000,
    projectiles: [],
    enemyProjectiles: [],
    bossProjectiles: [],
    missilesPerShot: 1,
    projectileLevel: 1,
    startingOrbLevel: 1,
    orbLevelCap: 3,
    lives: 3,
    baseLives: 3,
    purchasedLives: 0,
    maxLives: 3,
    gameRunning: false,
    gameOver: false,
    paused: false,
    bossesDefeated: 0,
    currentTier: 1,
    enemiesDefeated: 0,
    bossTiers: [],
    enemyTypes: [],
    bossHits: 0,
    keys: {},
    particles: [],
    bgX: 0,
    maxChargeTime: 1000,
    chargeStart: null,
    flashTime: 0,
    invulnerabilityTime: 0,
    bossActive: false,
    bossWarning: false,
    selectedItems: {},
    bossWarningTime: 0,
    boss: null,
    bossFireInterval: 2000,
    bossVictoryTimeout: false,
    bossVictoryTime: 0,
    // Tournament mode state
    isTournamentMode: false,
    tournamentObjectId: null,
    tournamentCategory: null,
    tournamentName: null,
    levelStartDelay: 0,
    levelStartDelayDuration: 1000,
    autoFireInterval: 300,
    lastAutoFire: 0,
    mouseY: 240,
    now: () => performance.now(),
    forceField: {
      level: 0,
      coinStreak: 0,
      maxStreak: 0,
      active: false,
      invulnerabilityTime: 0
    },
    sessionId: null
  };
  // Expose fallback globally for backward compatibility
  if (typeof window !== 'undefined') {
    window.game = game;
  }
}

// Security system initialization
let secureGame = null;
let onEnemyDestroyed = null;
let onSecureGameOver = null;

// Game loop instance is managed by game-loop.js
// Access via getGameLoop() function

// Initialize GameLifecycle instance
// This must be done before init() is called
if (typeof initGameLifecycle === 'function') {
  initGameLifecycle(game);
    // GameLifecycle instance initialized
} else {
  console.warn('⚠️ [GAME LIFECYCLE] initGameLifecycle not available - lifecycle functions will use fallback');
}

// Initialize security system
// Now delegates to GameLifecycle class
function initSecurity() {
  if (typeof getGameLifecycle === 'function') {
    const lifecycle = getGameLifecycle();
    if (lifecycle) {
      // Using GameLifecycle for initSecurity
      lifecycle.initSecurity();
      return;
    }
  }
  // Fallback: original implementation
  console.warn('⚠️ [GAME LIFECYCLE] initSecurity() using fallback - GameLifecycle not available');
  // If secureGame already exists, reset it instead of creating a new one
  if (secureGame) {
    // Reset the existing secureGame instance for a new game
    if (typeof secureGame.reset === 'function') {
      secureGame.reset();
      console.log('✓ Security system reset for new game');
    } else {
      // Fallback: manually reset score if reset method doesn't exist
      secureGame.score = 0;
      secureGame._score = 0;
      secureGame._actionsCount = 0;
      secureGame.startTime = Date.now();
      secureGame.actionLog = [];
      console.log('✓ Security system score manually reset');
    }
    return;
  }
  
  if (window.GameSecurity) {
    const securitySystem = window.GameSecurity.initializeSecureGame();
    secureGame = securitySystem.secureGame;
    onEnemyDestroyed = securitySystem.onEnemyDestroyed;
    onSecureGameOver = securitySystem.onGameOver;
    // Set secure game reference in game state
    if (game && typeof game.setSecureGame === 'function') {
      game.setSecureGame(secureGame);
    }
    console.log('✓ Security system initialized');
  } else {
    console.warn('⚠ Security system not loaded, falling back to basic mode');
  }
}

/**
 * Maps new orb level (1-10) to equivalent old orb level (1-6)
 * This ensures that level 10 has the same power/size as old level 6
 * Power curve mapping: 1→1, 2→2, 3→2, 4→3, 5→3, 6→4, 7→4, 8→5, 9→5, 10→6
 * Note: Level 2 needs power 2 to beat first boss, so we adjust the mapping accordingly
 */
function getOldLevelEquivalent(newLevel) {
  if (newLevel === 1) return 1;
  if (newLevel <= 3) return 2; // Level 2 and 3 both have power 2
  if (newLevel <= 5) return 3; // Level 4 and 5 both have power 3
  if (newLevel <= 7) return 4; // Level 6 and 7 both have power 4
  if (newLevel <= 9) return 5; // Level 8 and 9 both have power 5
  return 6; // Level 10 maps to old level 6
}

// Secure score update function
function updateScore(points) {
  const previousScore = game.score;
  
  // Check both local secureGame and window.secureGame (GameLifecycle sets window.secureGame)
  const activeSecureGame = secureGame || (typeof window !== 'undefined' ? window.secureGame : null);
  
  if (activeSecureGame) {
    activeSecureGame.incrementScore(points);
    const newScore = game.score;
    console.log(`📈 [SCORE] +${points} points | Previous: ${previousScore} | New: ${newScore} | SecureGame score: ${activeSecureGame.score}`);
  } else {
    // Fallback: update fallback score directly
    if (game._fallbackScore === undefined) game._fallbackScore = 0;
    game._fallbackScore += points;
    console.log(`📈 [SCORE] +${points} points | Fallback score: ${game._fallbackScore}`);
  }
}

// Note: startNewGame() has been merged into startGameInternal() in menu-system.js
// This function is no longer needed - all game initialization logic is now in the menu system

// Return to main menu from game over screen
// Now delegates to GameLifecycle class
function returnToMainMenu() {
  if (typeof getGameLifecycle === 'function') {
    const lifecycle = getGameLifecycle();
    if (lifecycle) {
      // Using GameLifecycle for returnToMainMenu
      lifecycle.returnToMainMenu();
      return;
    }
  }
  // Fallback: original implementation (should not be reached if GameLifecycle is loaded)
  console.warn('⚠️ [GAME LIFECYCLE] returnToMainMenu() using fallback - GameLifecycle not available');
}

// Game state is now managed by GameState class (loaded from systems/core/game-state.js)
// 'game' is an alias to gameState for backward compatibility
// The gameState instance is created in game-state.js and exposed as window.gameState

// Fire intervals by monster tier (faster = more dangerous)
const enemyFireInterval = [0, 3000, 2500, 2000, 1500];

// Projectile speed multiplier for post-tier-4 scaling
// Option 1: +5% per boss after tier 4 (gentle progression, matches tier scaling)
function getProjectileSpeedMultiplier() {
  if (game.bossesDefeated <= 4) {
    return 1.0; // No change for first 4 bosses (tiers 1-4)
  }
  // +5% per boss after tier 4: Boss 5 = 1.05x, Boss 10 = 1.30x, Boss 20 = 1.80x
  return 1.0 + (game.bossesDefeated - 4) * 0.05;
}

// Fire rate multiplier for post-tier-4 scaling (inverse of projectile speed)
// Makes enemies and bosses shoot faster by reducing fire rate
// +5% per boss after tier 4: Boss 5 = 1.05x (5% faster), Boss 10 = 1.30x (30% faster), Boss 20 = 1.80x (80% faster)
// No cap - eventually becomes unplayable, encouraging shorter, more frequent sessions
function getFireRateMultiplier() {
  if (game.bossesDefeated <= 4) {
    return 1.0; // No change for first 4 bosses (tiers 1-4)
  }
  // Same progression as projectile speed: +5% per boss after tier 4
  return 1.0 + (game.bossesDefeated - 4) * 0.05;
}

// Monster stats by tier - MOVED TO systems/enemies/enemy-stats.js

// Boss stats by tier
const bossStats = {
  1: { hp: 400, fireRate: 1500, speed: 2, patterns: 3, enrageTime: 60000 }, // 40 * 10 = 400 HP, 60s
  2: { hp: 600, fireRate: 1200, speed: 2.5, patterns: 4, enrageTime: 75000 }, // 60 * 10 = 600 HP, 75s
  3: { hp: 800, fireRate: 1000, speed: 3, patterns: 5, enrageTime: 90000 }, // 80 * 10 = 800 HP, 90s
  4: { hp: 1000, fireRate: 800, speed: 3.5, patterns: 5, enrageTime: 120000 } // 100 * 10 = 1000 HP, 120s
};

// Player (horizontal mode)
const player = {
  x: 50, // Fixed position on the left
  y: 0,
  width: 55,
  height: 100,
  lane: 1,
  targetY: 240, // Target position following mouse
  moveSpeed: 0.2,
  trail: []
};

// Tiles (obstacles + coins + powerups) - adapted for horizontal mode
let tiles = [];

// Separate enemies array (used after tier 4 boss is defeated)
let enemies = [];

// Expose globally for use by tiles.js, player-rendering.js, and other modules
if (typeof window !== 'undefined') {
  window.tiles = tiles;
  window.enemies = enemies;
  window.player = player;
}

// Helper function to clear game arrays (for use by game-initialization.js)
function clearGameArrays() {
  tiles = [];
  enemies = [];
  // Update global references - ensure both stay in sync
  if (typeof window !== 'undefined') {
    window.tiles = tiles;
    window.enemies = enemies;
  }
}

// Helper function to sync tiles/enemies arrays after filtering
// This ensures the local variables in main.js stay in sync with window.tiles/window.enemies
function syncGameArrays() {
  if (typeof window !== 'undefined') {
    if (window.tiles && window.tiles !== tiles) {
      tiles = window.tiles;
    }
    if (window.enemies && window.enemies !== enemies) {
      enemies = window.enemies;
    }
  }
}

// Expose globally
if (typeof window !== 'undefined') {
  window.clearGameArrays = clearGameArrays;
  window.syncGameArrays = syncGameArrays;
}

// NOTE: shouldUseSeparateEnemies() function removed - all enemies are now always in enemies[] array
// Speed determination uses game.bossesDefeated > 4 directly

// Main update function - Now uses GameUpdate class
// This function is kept for backward compatibility
// It delegates to the GameUpdate instance
let gameUpdateInstance = null;

function update() {
  // Try to get instance if not already set
  if (!gameUpdateInstance) {
    if (typeof getGameUpdate === 'function') {
      gameUpdateInstance = getGameUpdate();
    } else if (typeof window !== 'undefined' && window.gameUpdateInstance) {
      gameUpdateInstance = window.gameUpdateInstance;
    }
  }
  
  // Use GameUpdate instance if available
  if (gameUpdateInstance) {
    gameUpdateInstance.update();
    return;
  }
  
  // Final fallback: log error (throttled)
  if (Math.random() < 0.01) {
    console.error('❌ [GAME UPDATE] GameUpdate not initialized! Make sure init() was called.');
  }
}

// Original update function (kept for reference/fallback, but not used)
function _updateOriginal() {
  // Update responsive canvas system
  if (typeof ResponsiveCanvas !== 'undefined' && ResponsiveCanvas.isInitialized) {
    ResponsiveCanvas.update();
  }
  if (typeof ViewportManager !== 'undefined' && ViewportManager.isInitialized) {
    ViewportManager.update();
  }
  
  // Update enhanced touch input
  if (typeof TouchInput !== 'undefined' && TouchInput.isInitialized) {
    TouchInput.update();
  }
  
  // Don't update if menu is visible
  if (typeof gameState !== 'undefined' && gameState.isMenuVisible) {
    if (Math.random() < 0.01) console.log('⏸️ Update skipped - menu visible'); // Throttled log
    return;
  }
  
  if (game.gameOver) {
    if (Math.random() < 0.01) console.log('Game over, updating particles only'); // Throttled log
    // Update particles even in game over
    game.particles.forEach(p=>p.update());
    game.particles = game.particles.filter(p=>p.life>0);
    return;
  }
  
  if (!game.gameRunning) {
    if (Math.random() < 0.01) console.log('Game not running, skipping update'); // Throttled log
    return;
  }
  
  // Skip all game logic if paused
  if (game.paused) {
    if (Math.random() < 0.01) console.log('Game paused, skipping update'); // Throttled log
    return;
  }
  
  handleInput();
  updatePlayer();
  
  // Continuous auto fire (disabled during boss entrance, victory, and boss kill shot charge)
  const autoFireDisabled = typeof isAutoFireDisabled === 'function' ? isAutoFireDisabled() : false;
  if (!game.bossWarning && !game.bossVictoryTimeout && !(game.bossActive && !game.boss.vulnerable) && !autoFireDisabled) {
    handleAutoFire();
  }
  
  // Update enemy behavior
  updateEnemyShooting();

  // Boss warning handling
  if (game.bossWarning) {
    game.bossWarningTime -= 16; // Approximation of 60fps
    if (game.bossWarningTime <= 0) {
      createBoss();
    }
    return;
  }

  if (game.bossActive) {
    
    // Boss entrance phase handling
    const now = game.now();
    const elapsedTime = now - game.boss.entranceStart;
    
    if (!game.boss.vulnerable && elapsedTime >= game.boss.entranceTime) {
      game.boss.vulnerable = true; // Boss becomes vulnerable after 2 seconds
      game.boss.lastPatternChange = now; // Start first pattern
      game.boss.enrageStart = now; // Start enrage timer
    }
    
    // Enrage system handling
    if (game.boss.vulnerable && !game.boss.enraged) {
      const enrageElapsed = now - game.boss.enrageStart;
      if (enrageElapsed >= game.boss.enrageTime) {
        // ENRAGE MODE ACTIVATED!
        game.boss.enraged = true;
        // Halve fire rate (double shooting speed) - uses already-scaled fire rate
        game.boss.fireRate = Math.floor(game.boss.fireRate * 0.5); // Double fire rate
        game.boss.speed *= 1.5; // Increase speed
        console.log('🔥 BOSS ENRAGED! Fire rate doubled, speed increased!');
      }
    }
    
        // Boss movement to position (apply slow time multiplier)
        if (game.boss.x > game.boss.targetX) {
          const bossSpeedMultiplier = typeof getEffectiveBossSpeedMultiplier === 'function' ? getEffectiveBossSpeedMultiplier() : 1.0;
          game.boss.x -= game.boss.moveSpeed * bossSpeedMultiplier;
        }
        
        // Boss vertical movement once in position (more aggressive by tier and when enraged)
        // Apply post-tier-4 speed multiplier and slow time multiplier to vertical movement speed
        if (game.boss.vulnerable && game.boss.x <= game.boss.targetX) {
          const baseVerticalSpeed = (1 + (game.boss.tier * 0.5));
          const speedMultiplier = typeof getProjectileSpeedMultiplier === 'function' ? getProjectileSpeedMultiplier() : 1.0;
          const bossSpeedMultiplier = typeof getEffectiveBossSpeedMultiplier === 'function' ? getEffectiveBossSpeedMultiplier() : 1.0;
          const moveSpeed = baseVerticalSpeed * speedMultiplier * bossSpeedMultiplier * (game.boss.enraged ? 2 : 1);
          game.boss.y += game.boss.moveDirection * moveSpeed;
          if (game.boss.y <= 0 || game.boss.y >= game.height - game.boss.height) {
            game.boss.moveDirection *= -1;
          }
          
          // Keep all bosses on the right side - no horizontal movement toward player
          // Bosses stay at their targetX position (right side of screen)
          
          // Only start firing once boss is in position
          handleBossFire();
        }
  }

  // Handle boss victory timeout - STOP ALL MOVEMENT during victory screen
  if (game.bossVictoryTimeout) {
    game.bossVictoryTime -= 16; // Approximation of 60fps
    if (game.bossVictoryTime <= 0) {
      // Victory period over, start next stage
      game.bossVictoryTimeout = false;
      game.scrollSpeed = game.baseScrollSpeed;
      // Reset enemySpeed after tier 4 (when enemies move faster than tiles)
      // This ensures enemies start at base speed and gradually increase each stage
      if (game.bossesDefeated > 4) {
        game.enemySpeed = game.baseEnemySpeed;
        // Clear tiles and enemies to ensure clean start - prevent enemies/projectiles from being on screen
        tiles = [];
        enemies = [];
        game.enemyProjectiles = []; // Clear enemy projectiles
        game.projectiles = []; // Clear player projectiles too for clean start
        console.log('Enemy speed reset to base for new stage after boss', game.bossesDefeated);
        console.log('Cleared tiles, enemies, and projectiles for clean stage start');
      }
      // Start spawn delay timer - prevent enemies/projectiles from spawning for 1 second
      game.levelStartDelay = game.levelStartDelayDuration;
      console.log('Level start delay activated:', game.levelStartDelay, 'ms');
      // Distance speed remains constant
      
      // Start regular music after victory screen ends
      if (typeof resumeGameplayMusic === 'function') {
        resumeGameplayMusic();
      }
      
      // Don't reset distanceSinceBoss here - it should reset when boss warning appears
    }
    return; // Skip ALL game updates during victory period - no movement, no spawning, nothing!
  }

  // Only update game progression if not in boss fight
  if (!game.bossActive) {
    // Update visual/scroll speed (for gameplay difficulty)
    game.scrollSpeed = Math.min(game.maxScrollSpeed, game.scrollSpeed + game.scrollSpeedIncrement);
    
    // Update enemy speed (after tier 4: enemies move faster than tiles with increasing cap)
    if (game.bossesDefeated > 4) {
      // Calculate enemy speed cap based on bosses defeated after tier 4
      // Base cap is maxScrollSpeed (6.0), increase by 0.25 per boss after tier 4
      const enemySpeedCap = game.maxScrollSpeed + (game.bossesDefeated - 4) * 0.25;
      game.enemySpeed = Math.min(enemySpeedCap, game.enemySpeed + game.enemySpeedIncrement);
    } else {
      // Before tier 4: Enemy speed matches scrollSpeed (enemies move at same speed as tiles)
      game.enemySpeed = game.scrollSpeed;
    }
    
    // Update distance calculations (constant speed for consistent boss timing)
    game.distance += game.distanceSpeed;
    game.distanceSinceBoss += game.distanceSpeed;
    
    // Update visual scrolling (background) - use effective scroll speed (with slow time multiplier)
    const effectiveScrollSpeed = typeof getEffectiveScrollSpeed === 'function' ? getEffectiveScrollSpeed() : game.scrollSpeed;
    game.bgX += effectiveScrollSpeed;
    if (game.bgX >= game.width) game.bgX = 0;
    
    // Debug boss progress
    if (game.distanceSinceBoss > 0 && game.distanceSinceBoss % 1000 < game.distanceSpeed) {
      console.log('Boss progress:', Math.floor(game.distanceSinceBoss), '/', game.bossThreshold);
    }
  }

  // Update level start delay timer
  if (game.levelStartDelay > 0) {
    game.levelStartDelay -= 16; // Approximation of 60fps (16ms per frame)
    if (game.levelStartDelay < 0) game.levelStartDelay = 0;
  }

  // Only scroll tiles and generate new ones if not in boss fight
  if (!game.bossActive) {
    // Get effective speeds (with slow time multiplier applied if active)
    const effectiveScrollSpeed = typeof getEffectiveScrollSpeed === 'function' ? getEffectiveScrollSpeed() : game.scrollSpeed;
    const effectiveEnemySpeed = typeof getEffectiveEnemySpeed === 'function' ? getEffectiveEnemySpeed() : game.enemySpeed;
    
    // ALWAYS move enemies from enemies[] array
    // Before tier 4: enemies move at scrollSpeed (same as tiles)
    // After tier 4: enemies move at enemySpeed (faster than tiles)
    const shouldUseEnemySpeed = game.bossesDefeated > 4;
    const enemyMoveSpeed = shouldUseEnemySpeed ? effectiveEnemySpeed : effectiveScrollSpeed;
    
    // Move enemies at appropriate speed
    enemies.forEach(e => e.x -= enemyMoveSpeed);
    
    // Move tiles at scrollSpeed (always)
    tiles.forEach(t => t.x -= effectiveScrollSpeed);
    
    // Remove off-screen enemies
    enemies = enemies.filter(e => e.x > -200);
    
    // Generate new tiles ONLY if spawn delay has passed (before filtering out off-screen tiles)
    if (game.levelStartDelay <= 0) {
      generateTiles();
    }
    
    // Remove off-screen tiles
    tiles = tiles.filter(t => t.x > -200);
  }

  // Update projectiles
  game.projectiles = game.projectiles.filter(b => {
    // Don't update projectiles if boss is active but not in position yet
    if (game.bossActive && game.boss && game.boss.x > game.boss.targetX) {
      return true; // Keep projectile but don't update it
    }
    
    b.x += b.speed;
    
    // Add current position to trail (center of projectile image)
    // Use old level equivalent for size calculation (level 10 = old level 6 = 64px)
    const oldLevel = getOldLevelEquivalent(b.level);
    const orbSize = oldLevel * 8 + 16;
    b.trail.push({ x: b.x + orbSize / 2, y: b.y }); // Center of the projectile image
    
    // Remove old trail points
    if (b.trail.length > b.maxTrailLength) {
      b.trail.shift();
    }
    
    if (b.x > game.width + 50) return false;
    
    // Check collision with enemies
    let projectileHit = false;
    
    // Helper function to check projectile collision with enemy
    function checkProjectileEnemyCollision(enemy, enemyX) {
      const oy = enemy.lane * game.laneHeight + (game.laneHeight - 60) / 2;
      
      // Calculate dynamic enemy dimensions (same as rendering)
      const enemyImage = enemyImages[enemy.type - 1];
      const enemyDims = getEnemyDimensions(enemyImage);
      const drawX = enemyX + enemyDims.centerOffset;
      const enemyY = oy;
      
      // Calculate projectile collision box (proper collision detection)
      const projectileX = b.x;
      const projectileY = b.y - orbSize / 2;
      const projectileWidth = orbSize;
      const projectileHeight = orbSize;
      
      // Check collision between projectile and enemy
      if (projectileX < drawX + enemyDims.width && projectileX + projectileWidth > drawX &&
          projectileY < enemyY + enemyDims.height && projectileY + projectileHeight > enemyY) {
        // Use old level equivalent for damage calculation (level 10 = old level 6 = 6 damage)
        const oldLevel = getOldLevelEquivalent(b.level);
        enemy.hp -= oldLevel; // Decrease HP by old level equivalent (bigger orbs = more damage)
        
        // Calculate collision point (where projectile intersects with enemy)
        const collisionX = Math.max(projectileX, drawX);
        const collisionY = Math.max(projectileY, enemyY);
        
        // Play enemy hit sound - ALWAYS play when enemy is hit, regardless of destruction
        if (typeof playEnemyHitSound === 'function') {
          console.log('🎯 [ENEMY HIT] Calling playEnemyHitSound()');
          playEnemyHitSound();
        } else {
          console.warn('🎯 [ENEMY HIT] playEnemyHitSound function not available');
        }
        
        if (enemy.hp <= 0) {
          // Monster destroyed - SECURE SCORING
          updateScore(15 * enemy.type); // SECURE: More points for high tier monsters
          // Track enemy defeat for blockchain/burn calculation
          game.enemiesDefeated++;
          // Track enemy type for accurate score calculation
          game.enemyTypes.push(enemy.type);
          // Play enemy destroyed sound - DISABLED (keeping only enemy hit sound)
          // if (typeof playEnemyDestroyedSound === 'function') {
          //   playEnemyDestroyedSound();
          // }
          createExplosionEffect(collisionX, collisionY);
          return true; // Enemy destroyed
        } else {
          // Monster hit but not destroyed
          createProjectileHitEffect(collisionX, collisionY);
          return false; // Enemy still alive
        }
      }
      return null; // No collision
    }
    
    // ALWAYS check enemies from enemies[] array - enemies are never in tile.obstacles anymore
    enemies = enemies.filter(enemy => {
      // Remove enemies that were destroyed by missiles or other means (hp <= 0)
      if (enemy.hp <= 0) {
        return false; // Enemy destroyed
      }
      
      const result = checkProjectileEnemyCollision(enemy, enemy.x);
      if (result === true) {
        projectileHit = true;
        return false; // Enemy destroyed
      } else if (result === false) {
        projectileHit = true;
        return true; // Enemy hit but alive
      }
      return true; // No collision
    });
    
    // Check collision with boss
    if (game.bossActive && game.boss && game.boss.vulnerable && game.boss.x <= game.boss.targetX && !projectileHit) {
      // Calculate dynamic boss dimensions (same as rendering)
      const imageToUse = bossImage || bossImages[game.boss.type - 1] || enemyImages[0];
      const bossDims = getBossDimensions(imageToUse, game.boss.width, game.boss.height);
      const bossX = game.boss.x + bossDims.centerOffset;
      const bossY = game.boss.y;
      
      // Calculate projectile collision box
      const projectileX = b.x;
      const projectileY = b.y - orbSize / 2;
      const projectileWidth = orbSize;
      const projectileHeight = orbSize;
      
      // Check collision between projectile and boss (only at center line vertically)
      const bossCenterX = bossX + bossDims.width / 2;
      const collisionLineWidth = 50; // Wider collision line (50 pixels wide) for better hit detection
      
      // Adjust collision zone so projectile's RIGHT edge hits the green line
      const projectileRightEdge = projectileX + projectileWidth;
      const collisionLeft = bossCenterX - collisionLineWidth / 2;
      const collisionRight = bossCenterX + collisionLineWidth / 2;
      
      if (projectileRightEdge > collisionLeft && projectileRightEdge < collisionRight &&
          projectileY < bossY + bossDims.height && projectileY + projectileHeight > bossY &&
          game.boss && game.boss.hp > 0) { // Only count hits if boss exists and is still alive
        const previousHP = game.boss.hp;
        // Use old level equivalent for damage calculation (level 10 = old level 6 = 6 damage)
        const oldLevel = getOldLevelEquivalent(b.level);
        const damageDealt = oldLevel; // Damage equals old level equivalent
        game.boss.hp -= damageDealt; // Decrease HP by orb level (bigger orbs = more damage)
        game.boss.hitTime = 10;
        // Only award points and track damage if the hit actually damaged the boss (HP was > 0 before hit)
        if (previousHP > 0) {
          updateScore(damageDealt); // Points equal to damage dealt (orb level)
          game.bossHits += damageDealt; // Track total damage dealt for accurate score calculation
        }
        
        // Check if boss was defeated immediately after HP decrement
        if (game.boss && game.boss.hp <= 0 && game.bossActive) {
          // Trigger boss defeat immediately to ensure score is added right away
          handleBossDefeat();
          projectileHit = true;
        }
        
        // Play boss hit sound
        if (typeof playBossHitSound === 'function') {
          playBossHitSound();
        }
        
        // Calculate collision point (at the green line - boss center)
        const collisionX = bossCenterX;
        const collisionY = Math.max(projectileY, bossY);
        createBossHitEffect(collisionX, collisionY);
        projectileHit = true;
      }
    }
    
    // Remove projectile if it hit something
    return !projectileHit;
  });

  // Update enemy projectiles
  updateEnemyProjectiles();

  // Update boss projectiles
  updateBossProjectiles();

  // Update particles
  game.particles.forEach(p => p.update());
  game.particles = game.particles.filter(p => p.life > 0);

  // Collision detection
  if (checkObstacleCollision()) {
    game.lives--;
    if (game.lives <= 0) {
      gameOver();
    }
  }

      if (checkEnemyProjectileCollision()) {
        game.lives--;
        if (game.lives <= 0) {
          gameOver();
        }
      }

      if (checkBossProjectileCollision()) {
        game.lives--;
        if (game.lives <= 0) {
          gameOver();
        }
      }

  checkCoinCollection();
  checkPowerupCollection();
  
  // Initialize consumable system if not already initialized
  if (typeof ConsumableSystem !== 'undefined' && ConsumableSystem.initialize && !ConsumableSystem._initialized) {
    ConsumableSystem.initialize();
    console.log('🔧 [CONSUMABLES] Consumable system initialized');
  }
  
  // Update coin tractor beam
  if (typeof updateCoinTractorBeam === 'function') {
    updateCoinTractorBeam();
  }
  
  // Update slow time
  if (typeof updateSlowTime === 'function') {
    updateSlowTime();
  }
  
  // Update destroy all missiles
  if (typeof updateDestroyAll === 'function') {
    updateDestroyAll();
  }
  
  // Update boss kill shot
  if (typeof updateBossKillShot === 'function') {
    updateBossKillShot();
  }
  
  // Update consumable button states
  if (typeof ConsumableSystem !== 'undefined' && ConsumableSystem.updateButtonStates) {
    ConsumableSystem.updateButtonStates();
  }

  // Flash effect
  if (game.flashTime > 0) {
    game.flashTime--;
  }

  // Invulnerability timer
  if (game.invulnerabilityTime > 0) {
    game.invulnerabilityTime--;
  }

  // Force field invulnerability timer
  if (game.forceField.invulnerabilityTime > 0) {
    game.forceField.invulnerabilityTime--;
  }

  // Boss spawning
  if (!game.bossActive && !game.bossVictoryTimeout && game.distanceSinceBoss >= game.bossThreshold) {
    console.log('Boss spawning! distanceSinceBoss:', game.distanceSinceBoss, 'bossThreshold:', game.bossThreshold);
    spawnBoss();
  }

  // Function to handle boss defeat (extracted so it can be called immediately when HP reaches 0)
  function handleBossDefeat() {
    if (!game.bossActive || !game.boss || game.boss.hp > 0) {
      return; // Boss not defeated or already handled
    }
    
    // Stop boss music immediately when HP reaches zero
    if (typeof stopBackgroundMusic === 'function') {
      stopBackgroundMusic();
    }
    
    // Start victory timeout period
    game.bossVictoryTimeout = true;
    game.bossVictoryTime = 3000; // 3 seconds victory period
    
    game.bossActive = false;
    // Track boss tier BEFORE incrementing bossesDefeated (use the boss's actual tier)
    const defeatedBossTier = game.boss ? game.boss.tier : game.currentTier;
    const bossDefeatBonus = 5000 * defeatedBossTier;
    const scoreBeforeBossDefeat = game.score;
    console.log('🎯 [BOSS DEFEAT] Tier:', defeatedBossTier, 'Bonus:', bossDefeatBonus, 'Score before:', scoreBeforeBossDefeat);
    
    game.bossTiers.push(defeatedBossTier);
    game.bossesDefeated++;
    game.currentTier = Math.min(4, Math.floor(game.bossesDefeated / 1) + 1); // New tier after each boss
    
    // Recalculate power-up cap based on current orb level at start of new tier
    // Cap = current orb level + 2 (allows 2 more power-ups in the new tier)
    game.orbLevelCap = game.projectileLevel + 2;
    console.log(`🔮 [ORB LEVEL] Cap recalculated to Level ${game.orbLevelCap} for new tier (current level: ${game.projectileLevel}, tier: ${game.currentTier})`);
    
    console.log('Boss defeated! bossesDefeated:', game.bossesDefeated, 'defeatedBossTier:', defeatedBossTier, 'new currentTier:', game.currentTier);
    
    // When separate enemies system activates (after tier 4 boss), clear enemies array
    // EnemySpeed will be reset when victory timeout ends, ensuring clean start
    if (game.bossesDefeated === 5) {
      // Clear any existing separate enemies and projectiles to ensure clean start
      enemies = [];
      game.enemyProjectiles = []; // Clear enemy projectiles immediately
      console.log('Separate enemies system activated. Cleared enemies array and projectiles for fresh start.');
    }
    game.boss = null;
    
    // Clear boss projectiles when boss is defeated
    game.bossProjectiles = [];
    
    updateScore(bossDefeatBonus); // Much more points to reward effort (use defeated boss's tier, not new tier)
    
    // Verify the bonus was added
    setTimeout(() => {
      const scoreAfterBossDefeat = game.score;
      const actualBonus = scoreAfterBossDefeat - scoreBeforeBossDefeat;
      console.log('🎯 [BOSS DEFEAT VERIFY] Score after:', scoreAfterBossDefeat, 'Expected bonus:', bossDefeatBonus, 'Actual bonus:', actualBonus, 'Match:', actualBonus === bossDefeatBonus);
      if (actualBonus !== bossDefeatBonus) {
        console.error('❌ [BOSS DEFEAT] Bonus NOT added correctly! Expected:', bossDefeatBonus, 'Got:', actualBonus);
      }
    }, 100);
    
    // Play boss destroyed sound
    if (typeof playBossDestroyedSound === 'function') {
      playBossDestroyedSound();
    }
    
    // Massive victory effect
    for (let i = 0; i < 100; i++) {
      game.particles.push(new Particle(
        game.width/2 + (Math.random()-0.5)*300, 
        game.height/2 + (Math.random()-0.5)*300, 
        '#FFD700'
      ));
    }
  }

  // Check if boss is defeated
  if (game.bossActive && game.boss && game.boss.hp <= 0) {
    handleBossDefeat();
  }
  
}

// Game over function
// Now delegates to GameLifecycle class
function gameOver() {
  if (typeof getGameLifecycle === 'function') {
    const lifecycle = getGameLifecycle();
    if (lifecycle) {
      // Using GameLifecycle for gameOver
      lifecycle.gameOver();
      return;
    }
  }
  // Fallback: original implementation (should not be reached if GameLifecycle is loaded)
  console.warn('⚠️ [GAME LIFECYCLE] gameOver() using fallback - GameLifecycle not available');
}

// Main game loop - Now uses GameLoop class
// This function is kept for backward compatibility
// It delegates to the GameLoop instance
function gameLoop() {
  const loopInstance = typeof getGameLoop === 'function' ? getGameLoop() : null;
  if (!loopInstance) {
    console.error('❌ [GAME LOOP] GameLoop not initialized! Call init() first.');
    return;
  }
  
  // The actual loop is handled by GameLoop._loop()
  // This function should not be called directly anymore
  // It's kept for backward compatibility with code that might call it
  console.warn('⚠️ [GAME LOOP] gameLoop() called directly - use gameLoopInstance.start() instead');
}

// Initialization - SECURE VERSION WITH MENU INTEGRATION
// Now delegates to GameLifecycle class
function init() {
  // Use GameLifecycle if available
  if (typeof initGameLifecycle === 'function') {
    const lifecycle = initGameLifecycle(game);
    lifecycle.init();
    // Game initialized via GameLifecycle
  } else {
    console.error('❌ [GAME LIFECYCLE] initGameLifecycle not available! Make sure game-lifecycle.js is loaded.');
    // Fallback: basic initialization
    game.canvas = document.getElementById('gameCanvas');
    if (!game.canvas) {
      console.error('❌ Canvas not found! Cannot initialize game.');
      return;
    }
    game.ctx = game.canvas.getContext('2d');
  }
  
  // Initialize game update system (needs to be after GameLifecycle.init())
  if (typeof initGameUpdate === 'function') {
    const updateInstance = initGameUpdate(game);
    gameUpdateInstance = updateInstance; // Set module-level variable
    if (typeof window !== 'undefined') {
      window.gameUpdateInstance = updateInstance; // Also expose globally
    }
    console.log('✅ [GAME UPDATE] GameUpdate initialized in init()');
  } else {
    console.error('❌ [GAME UPDATE] initGameUpdate not available! Make sure game-update.js is loaded.');
  }
  
  // Initialize game loop (but don't start it yet - it will be started by initializeGameLogic)
  // Note: This must be after update() and draw() functions are defined
  // They are defined later in this file, so we'll initialize the loop after they're defined
  // See end of file for game loop initialization
}

// Security system check
function checkSecuritySystem() {
  if (!window.GameSecurity) {
    console.warn('⚠ SECURITY WARNING: game-security.js not loaded!');
    console.warn('⚠ Game is running in UNSECURED mode');
    console.warn('⚠ Scores can be easily manipulated');
    console.warn('⚠ Load game-security.js before this script');
  } else {
    console.log('✓ Security system detected and loaded');
  }
}

// Start the game - BUT DON'T AUTO-INITIALIZE
// The game will be initialized when the user clicks "Start Game"
if (document.readyState==='loading') {
  document.addEventListener('DOMContentLoaded', () => {
    checkSecuritySystem();
    // DON'T call init() here - wait for user to start game
    console.log('🎮 Game ready. Waiting for user to start...');
  });
} else {
  checkSecuritySystem();
  // DON'T call init() here - wait for user to start game
  console.log('🎮 Game ready. Waiting for user to start...');
}

// Track if game is initialized
let gameInitialized = false;

// Game loop initialization will happen in init() after all scripts are loaded
// The init() function is called when the game starts, at which point update() and draw() will be available

// Export functions globally
if (typeof window !== 'undefined') {
  // Export initialization function for menu system to call
  window.initializeGame = function() {
    if (!gameInitialized) {
      console.log('🎮 Initializing game...');
      init();
      gameInitialized = true;
    } else {
      console.log('⚠️ Game already initialized');
    }
  };
  
  // Export initSecurity for game-initialization.js (already delegates to GameLifecycle in function definition)
  window.initSecurity = initSecurity;
  
  // Export gameOver for backward compatibility (already delegates to GameLifecycle in function definition)
  window.gameOver = gameOver;
  
  // Export returnToMainMenu for backward compatibility (already delegates to GameLifecycle in function definition)
  window.returnToMainMenu = returnToMainMenu;
}

