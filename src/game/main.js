// ==========================================
// MAIN GAME MANAGEMENT - CORE FUNCTIONS
// ==========================================

// Security system initialization
let secureGame = null;
let onEnemyDestroyed = null;
let onSecureGameOver = null;

// --- Debug diagnostics for speed/loop issues ---
let __debugFrameCount = 0;
let __debugLastFpsAt = (typeof performance !== 'undefined' ? performance.now() : Date.now());
let __debugLoopEntries = 0;

// Initialize security system
function initSecurity() {
  if (window.GameSecurity) {
    const securitySystem = window.GameSecurity.initializeSecureGame();
    secureGame = securitySystem.secureGame;
    onEnemyDestroyed = securitySystem.onEnemyDestroyed;
    onSecureGameOver = securitySystem.onGameOver;
    console.log('✓ Security system initialized');
  } else {
    console.warn('⚠ Security system not loaded, falling back to basic mode');
  }
}

// Secure score update function
function updateScore(points) {
  if (secureGame) {
    secureGame.incrementScore(points);
  } else {
    // Fallback amélioré
    if (!game._fallbackScore) game._fallbackScore = 0;
    game._fallbackScore += points;
    console.log('Score updated to:', game._fallbackScore); // Debug
  }
}

// Reset and restart game
function restart() {
  console.log('🔄 Game restarting - starting new game');
  console.log('🧪 [DEBUG] restart() called. baseSpeed:', game.baseSpeed, 'speedIncrement:', game.speedIncrement, 'maxSpeed:', game.maxSpeed);
  console.log('📊 Game state before restart:', {
    gameRunning: game.gameRunning,
    gameOver: game.gameOver,
    paused: game.paused,
    hasCanvas: !!game.canvas,
    hasCtx: !!game.ctx
  });
  
  // Reinitialize security system
  initSecurity();
  
  game.scrollSpeed = game.baseScrollSpeed;
  game.enemySpeed = game.baseEnemySpeed;
  // Distance speed remains constant
  // Don't reset score directly anymore - security system handles it
  game.coins = 0;
  game.distance = 0;
  game.distanceSinceBoss = 0;
  game.projectiles = [];
  game.enemyProjectiles = [];
  game.bossProjectiles = [];
  game.particles = [];
  game.missilesPerShot = 1;
  game.projectileLevel = 1; // Reset magic orb level
  game.lives = 3;
  game.chargeStart = null;
  game.flashTime = 0;
  game.invulnerabilityTime = 0;
  game.bossActive = false;
  game.bossWarning = false;
  game.bossWarningTime = 0;
  game.bossVictoryTimeout = false;
  game.bossVictoryTime = 0;
  game.boss = null;
  game.lastAutoFire = 0;
  game.autoFireInterval = 300; // Reset fire rate
  game.gameRunning = true;
  game.gameOver = false; // Reset game over state
  game.paused = false; // Reset pause state
  game.bossesDefeated = 0; // Reset progression
  game.currentTier = 1; // Reset to tier 1
  game.enemiesDefeated = 0; // Reset enemy defeat counter
  game.bossTiers = []; // Reset boss tiers array
  game.levelStartDelay = game.levelStartDelayDuration; // Start with spawn delay
  // Reset force field system
  game.forceField.level = 0;
  resetCoinStreak();
  game.forceField.maxStreak = 0;
  game.forceField.active = false;
  game.forceField.invulnerabilityTime = 0;
  player.lane = 1;
  player.y = game.height / 2 - player.height / 2;
  game.mouseY = game.height / 2;
  player.trail = [];
  tiles = [];
  enemies = []; // Reset separate enemies array
  generateTiles();
  
  console.log('✅ Game restarted. State:', {
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
  
  // Restart the game loop
  console.log('🔄 Restarting game loop...');
  if (typeof game !== 'undefined' && game._rafId) {
    console.warn('⚠️ [DEBUG] restart() detected existing RAF id. Cancelling:', game._rafId);
    try { cancelAnimationFrame(game._rafId); } catch (e) { /* ignore */ }
    game._rafId = null;
  }
  gameLoop();
}

// Return to main menu from game over screen
function returnToMainMenu() {
  console.log('🟢 [VISIBILITY] returnToMainMenu() called');
  console.trace('🟢 [VISIBILITY] returnToMainMenu() stack trace');
  
  // Check if name input modal is visible - don't show main menu if it is
  const nameInputModal = document.getElementById('nameInputModal');
  if (nameInputModal && nameInputModal.classList.contains('name-input-modal-visible')) {
    console.warn('🟢 [VISIBILITY] ⚠️ returnToMainMenu() called while name input modal is visible - ignoring');
    return; // Don't show main menu if name input modal is showing
  }
  
  // Stop the game loop
  game.gameRunning = false;
  game.gameOver = false;
  game.paused = false;
  
  // Clear game arrays to free memory
  if (game.projectiles) game.projectiles = [];
  if (game.enemyProjectiles) game.enemyProjectiles = [];
  if (game.bossProjectiles) game.bossProjectiles = [];
  if (game.particles) game.particles = [];
  if (game.tiles) game.tiles = [];
  if (game.enemies) game.enemies = [];
  
  // Reset game state
  game.scrollSpeed = 0;
  // Distance speed remains constant
  game.bossActive = false;
  game.bossWarning = false;
  if (game.boss) game.boss = null;
  
  // Show main menu
  gameState.isMenuVisible = true;
  gameState.isGameRunning = false;
  gameState.isPaused = false;
  gameState.isGameOver = false;
  
  // Hide game container
  const gameContainer = document.querySelector('.game-container');
  if (gameContainer) {
    const wasVisible = gameContainer.classList.contains('game-container-visible');
    const wasHidden = gameContainer.classList.contains('game-container-hidden');
    console.log('🟢 [VISIBILITY] Game container - was visible:', wasVisible, 'was hidden:', wasHidden);
    gameContainer.classList.add('game-container-hidden');
    gameContainer.classList.remove('game-container-visible');
    console.log('🟢 [VISIBILITY] Game container HIDDEN');
  }
  
  // Show main menu overlay
  const mainMenu = document.getElementById('mainMenuOverlay');
  if (mainMenu) {
    const wasVisible = mainMenu.classList.contains('main-menu-overlay-visible');
    const wasHidden = mainMenu.classList.contains('main-menu-overlay-hidden');
    console.log('🟢 [VISIBILITY] Main menu - was visible:', wasVisible, 'was hidden:', wasHidden);
    mainMenu.classList.add('main-menu-overlay-visible');
    mainMenu.classList.remove('main-menu-overlay-hidden');
    console.log('🟢 [VISIBILITY] Main menu SHOWN');
  }
  
  // Stop all audio
  if (typeof stopBackgroundMusic === 'function') {
    stopBackgroundMusic();
  }
  if (typeof stopGameplayMusic === 'function') {
    stopGameplayMusic();
  }
  
  console.log('🟢 [VISIBILITY] ✅ Game closed and memory freed');
}

// Game configuration (horizontal mode) - MODIFIED for security
const game = {
  canvas: null,
  ctx: null,
  width: 800,
  height: 480,
  laneHeight: 480 / 3, // 3 horizontal lanes
  // Visual/scroll speed - controls visual movement and gameplay difficulty
  scrollSpeed: 2.5,
  baseScrollSpeed: 2.5,
  scrollSpeedIncrement: 0.01,
  maxScrollSpeed: 6,
  // Enemy speed (after tier 4) - separate from scrollSpeed, cap increases with each boss
  enemySpeed: 2.5,
  baseEnemySpeed: 2.5,
  enemySpeedIncrement: 0.01,
  // Distance speed - constant for consistent boss timing (increased to spawn bosses sooner)
  distanceSpeed: 3.5,
  // Legacy 'speed' property for backward compatibility (maps to scrollSpeed)
  get speed() { return this.scrollSpeed; },
  set speed(value) { this.scrollSpeed = value; },
  get baseSpeed() { return this.baseScrollSpeed; },
  set baseSpeed(value) { this.baseScrollSpeed = value; },
  get speedIncrement() { return this.scrollSpeedIncrement; },
  set speedIncrement(value) { this.scrollSpeedIncrement = value; },
  get maxSpeed() { return this.maxScrollSpeed; },
  set maxSpeed(value) { this.maxScrollSpeed = value; },
  // SECURE SCORE: Use getter that accesses security system
  get score() {
    return secureGame ? secureGame.score : this._fallbackScore || 0;
  },
  _fallbackScore: 0, // Fallback for when security system isn't loaded
  coins: 0,
  distance: 0,
  distanceSinceBoss: 0,
  bossThreshold: 5000,
  projectiles: [],
  enemyProjectiles: [],
  bossProjectiles: [],
  missilesPerShot: 1,
  projectileLevel: 1, // Magic orb level (size/power)
  lives: 3,
  maxLives: 3, // Maximum number of lives
  gameRunning: false,
  gameOver: false, // Game over state
  paused: false, // Pause state
  bossesDefeated: 0, // Number of bosses defeated
  currentTier: 1, // Current tier (1-4)
  enemiesDefeated: 0, // Number of enemies defeated (for blockchain/burn tracking)
  bossTiers: [], // Array tracking tier of each boss defeated (for accurate burn calculation)
  keys: {},
  particles: [],
  bgX: 0, // Background scrolls horizontally
  maxChargeTime: 1000,
  chargeStart: null,
  flashTime: 0,
  invulnerabilityTime: 0, // Invulnerability timer after being hit
  bossActive: false,
  bossWarning: false,
  bossWarningTime: 0,
  boss: null,
  bossFireInterval: 2000,
  // Level start spawn delay - prevent enemies/projectiles from spawning immediately
  levelStartDelay: 0, // Milliseconds remaining in delay
  levelStartDelayDuration: 1000, // 1 second delay after level starts
  autoFireInterval: 300, // Auto fire every 300ms (slower)
  lastAutoFire: 0,
  mouseY: 240, // Mouse Y position
  now: () => performance.now(),
  // Force field system
  forceField: {
    level: 0, // 0 = none, 1 = level 1, 2 = level 2
    coinStreak: 0, // Consecutive coins collected without being hit
    maxStreak: 0, // Highest streak achieved this game
    active: false, // Whether force field is currently active
    invulnerabilityTime: 0 // Invulnerability timer after being hit (60 frames = 1 second)
  }
};

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

// Check if we should use separate enemies system (after tier 4)
function shouldUseSeparateEnemies() {
  return game.bossesDefeated > 4;
}

// Main update function
function update() {
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
  
  // Continuous auto fire (disabled during boss entrance and victory)
  if (!game.bossWarning && !game.bossVictoryTimeout && !(game.bossActive && !game.boss.vulnerable)) {
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
        game.boss.fireRate = Math.floor(game.boss.fireRate * 0.5); // Double fire rate
        game.boss.speed *= 1.5; // Increase speed
        console.log('🔥 BOSS ENRAGED! Fire rate doubled, speed increased!');
      }
    }
    
        // Boss movement to position
        if (game.boss.x > game.boss.targetX) {
          game.boss.x -= game.boss.moveSpeed;
        }
        
        // Boss vertical movement once in position (more aggressive by tier and when enraged)
        // Apply post-tier-4 speed multiplier to vertical movement speed (same as projectile speeds)
        if (game.boss.vulnerable && game.boss.x <= game.boss.targetX) {
          const baseVerticalSpeed = (1 + (game.boss.tier * 0.5));
          const speedMultiplier = typeof getProjectileSpeedMultiplier === 'function' ? getProjectileSpeedMultiplier() : 1.0;
          const moveSpeed = baseVerticalSpeed * speedMultiplier * (game.boss.enraged ? 2 : 1);
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
      // Reset enemySpeed when using separate enemies system (after tier 4)
      // This ensures enemies start at base speed and gradually increase each stage
      if (shouldUseSeparateEnemies()) {
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
    
    // Update enemy speed (after tier 4: separate speed with increasing cap)
    if (shouldUseSeparateEnemies()) {
      // Calculate enemy speed cap based on bosses defeated after tier 4
      // Base cap is maxScrollSpeed (6.0), increase by 0.25 per boss after tier 4
      const enemySpeedCap = game.maxScrollSpeed + (game.bossesDefeated - 4) * 0.25;
      game.enemySpeed = Math.min(enemySpeedCap, game.enemySpeed + game.enemySpeedIncrement);
    } else {
      // Before tier 4: Enemy speed matches scrollSpeed (they're in tiles)
      // Keep enemySpeed synced to scrollSpeed so it's ready when separate system activates
      game.enemySpeed = game.scrollSpeed;
    }
    
    // Update distance calculations (constant speed for consistent boss timing)
    game.distance += game.distanceSpeed;
    game.distanceSinceBoss += game.distanceSpeed;
    
    // Update visual scrolling (background)
    game.bgX += game.scrollSpeed;
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
    if (shouldUseSeparateEnemies()) {
      // After tier 4: Separate enemies move at enemySpeed (increases beyond scrollSpeed cap), tiles move at scrollSpeed
      // Move separate enemies at enemySpeed (has its own increasing cap)
      enemies.forEach(e => e.x -= game.enemySpeed);
      
      // Move tiles at scrollSpeed (same speed as before tier 4)
      tiles.forEach(t => t.x -= game.scrollSpeed);
      
      // Remove off-screen enemies
      enemies = enemies.filter(e => e.x > -200);
    } else {
      // Before tier 4: Enemies are in tiles, everything moves together at scrollSpeed
      tiles.forEach(t => t.x -= game.scrollSpeed);
    }
    
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
    const orbSize = b.level * 8 + 16;
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
        enemy.hp -= b.level; // Decrease HP by orb level (bigger orbs = more damage)
        
        // Calculate collision point (where projectile intersects with enemy)
        const collisionX = Math.max(projectileX, drawX);
        const collisionY = Math.max(projectileY, enemyY);
        
        if (enemy.hp <= 0) {
          // Monster destroyed - SECURE SCORING
          updateScore(15 * enemy.type); // SECURE: More points for high tier monsters
          // Track enemy defeat for blockchain/burn calculation
          game.enemiesDefeated++;
          // Play enemy destroyed sound
          if (typeof playEnemyDestroyedSound === 'function') {
            playEnemyDestroyedSound();
          }
          createExplosionEffect(collisionX, collisionY);
          return true; // Enemy destroyed
        } else {
          // Monster hit but not destroyed
          // Play enemy hit sound
          if (typeof playEnemyHitSound === 'function') {
            playEnemyHitSound();
          }
          createProjectileHitEffect(collisionX, collisionY);
          return false; // Enemy still alive
        }
      }
      return null; // No collision
    }
    
    // Check tile-based enemies (before tier 4)
    tiles.forEach(tile => {
      tile.obstacles = tile.obstacles.filter(obs => {
        const ox = tile.x + 20;
        const result = checkProjectileEnemyCollision(obs, ox);
        if (result === true) {
          projectileHit = true;
          return false; // Enemy destroyed
        } else if (result === false) {
          projectileHit = true;
          return true; // Enemy hit but alive
        }
        return true; // No collision
      });
    });
    
    // Check separate enemies (after tier 4)
    if (typeof shouldUseSeparateEnemies === 'function' && shouldUseSeparateEnemies() && typeof enemies !== 'undefined') {
      enemies = enemies.filter(enemy => {
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
    }
    
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
          projectileY < bossY + bossDims.height && projectileY + projectileHeight > bossY) {
        game.boss.hp -= b.level; // Decrease HP by orb level (bigger orbs = more damage)
        game.boss.hitTime = 10;
        updateScore(50); // Points for hitting boss
        
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

  // Check if boss is defeated
  if (game.bossActive && game.boss && game.boss.hp <= 0) {
    // Stop boss music immediately when HP reaches zero
    if (typeof stopBackgroundMusic === 'function') {
      stopBackgroundMusic();
    }
    
    // Start victory timeout period
    game.bossVictoryTimeout = true;
    game.bossVictoryTime = 3000; // 3 seconds victory period
    
    game.bossActive = false;
    game.bossesDefeated++;
    game.currentTier = Math.min(4, Math.floor(game.bossesDefeated / 1) + 1); // New tier after each boss
    // Track boss tier for accurate burn calculation
    game.bossTiers.push(game.currentTier);
    console.log('Boss defeated! bossesDefeated:', game.bossesDefeated, 'currentTier:', game.currentTier);
    
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
    
    updateScore(5000 * game.currentTier); // Much more points to reward effort
    
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
  
}

// Game over function
function gameOver() {
  console.log("Game Over triggered!"); 
  console.log("Final Score:", game.score); // Debug to verify score
  console.log("Final Coins:", game.coins); // Debug to verify coins
  
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
  for (let i = 0; i < 50; i++) {
    game.particles.push(new Particle(
      Math.random() * game.width,
      Math.random() * game.height,
      '#FF0000',
      { x: (Math.random()-0.5)*3, y: (Math.random()-0.5)*3 }
    ));
  }
  
  // SECURE: Use secure game over handling
  if (onSecureGameOver) {
    const result = onSecureGameOver();
    if (result && result.success) {
      console.log('✓ Score securely submitted:', result.score);
      // Call external leaderboard function with validated score
      if (typeof onGameOver === 'function') {
        onGameOver(result.score);
      }
    } else {
      console.warn('⚠ Score validation failed, not submitted to leaderboard');
      console.warn('Error:', result ? result.error : 'No result');
    }
  } else {
    // Fallback for basic mode
    if (typeof onGameOver === 'function') {
      onGameOver(game.score);
    }
  }
}

// Main game loop
function gameLoop() {
  __debugLoopEntries++;
  if (__debugLoopEntries % 300 === 1) {
    console.log('🧪 [DEBUG] gameLoop entry count:', __debugLoopEntries, 'RAF id:', (typeof game !== 'undefined' ? game._rafId : 'n/a'), 'speed:', (typeof game !== 'undefined' ? game.speed : 'n/a'));
  }
  // Only run game logic if not in menu and game is running
  if (typeof gameState !== 'undefined' && gameState.isMenuVisible) {
    // Don't continue the loop when in menu - stop it
    console.log('⏸️ Game loop paused - menu visible');
    return;
  }
  
  // Continue loop if game is running OR if game is over (to keep rendering game over screen)
  if (game.gameRunning || game.gameOver) {
    if (!game.ctx) {
      console.error('❌ Canvas context is null in gameLoop!');
      return;
    }
    
    update();
    draw();
    __debugFrameCount++;
    const __now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    if (__now - __debugLastFpsAt >= 1000) {
      console.log('🎯 [DEBUG] FPS≈', __debugFrameCount, '| speed:', game.speed, 'base:', game.baseSpeed, 'inc:', game.speedIncrement, 'max:', game.maxSpeed);
      __debugFrameCount = 0;
      __debugLastFpsAt = __now;
    }
    const nextId = requestAnimationFrame(gameLoop);
    if (typeof game !== 'undefined') {
      game._rafId = nextId;
    }
  } else {
    // Game stopped and not over, don't continue loop
    console.log('⏹️ Game loop stopped - game not running and not over');
  }
}

// Initialization - SECURE VERSION WITH MENU INTEGRATION
function init() {
  game.canvas = document.getElementById('gameCanvas');
  console.log('🎯 Canvas found:', game.canvas ? 'YES' : 'NO', game.canvas);
  console.log('🧪 [DEBUG] init() starting. Current speeds -> speed:', game.speed, 'baseSpeed:', game.baseSpeed, 'inc:', game.speedIncrement, 'max:', game.maxSpeed);
  
  if (!game.canvas) {
    console.error('❌ Canvas not found! Cannot initialize game.');
    return;
  }
  
  game.ctx = game.canvas.getContext('2d');
  console.log('🎨 Canvas context created:', game.ctx ? 'YES' : 'NO');
  console.log('📏 Canvas element dimensions:', game.canvas.width, 'x', game.canvas.height);
  console.log('📏 Canvas computed size:', game.canvas.offsetWidth, 'x', game.canvas.offsetHeight);
  
  // Always use original game dimensions (800x480) for game logic
  // The responsive canvas system handles display scaling
  game.width = 800;
  game.height = 480;
  console.log('📐 Using original game dimensions:', game.width, 'x', game.height);
  
  game.laneHeight = game.height / 3;
  player.y = game.height / 2 - player.height / 2;
  game.mouseY = game.height / 2;

  // Initialize responsive canvas system
  if (typeof ResponsiveCanvas !== 'undefined') {
    ResponsiveCanvas.initialize(game.canvas);
    console.log('📐 Responsive Canvas system initialized');
  } else {
    console.warn('⚠ ResponsiveCanvas not available, using fallback sizing');
  }

  // Initialize security system
  initSecurity();

  // Mouse handling
  game.canvas.addEventListener('mousemove', e => {
    if (typeof ResponsiveCanvas !== 'undefined' && ResponsiveCanvas.isInitialized) {
      // Use responsive coordinate conversion
      const coords = ResponsiveCanvas.screenToGameCoords(e.clientX, e.clientY);
      game.mouseY = coords.y;
    } else {
      // Fallback to original method
      const rect = game.canvas.getBoundingClientRect();
      game.mouseY = e.clientY - rect.top;
    }
  });

  // User interaction handling for game over screen
  // NOTE: This handler is now only for legacy compatibility.
  // The leaderboard system's onGameOver() sets up its own handlers.
  function handleGameOverInteraction(e) {
    if (game.gameOver && !gameState.isMenuVisible) {
      // Check if name input modal is visible or about to be shown
      const nameInputModal = document.getElementById('nameInputModal');
      if (nameInputModal && nameInputModal.classList.contains('name-input-modal-visible')) {
        console.log('🛑 [VISIBILITY] Ignoring game over click - name input modal is visible');
        return; // Don't return to main menu if name input modal is showing
      }
      
      // The leaderboard system will handle the interaction via onGameOver()
      // This handler should no longer interfere
      console.log('🛑 [VISIBILITY] Game over interaction detected - leaderboard system will handle');
      // Don't prevent default or do anything - let the leaderboard system handle it
    }
  }

  // Keyboard handling (optional) - Modified for menu integration
  document.addEventListener('keydown', e => {
    // Game over handling is now done by leaderboard system's onGameOver()
    // Don't interfere with the game over interaction handling here
    if (game.gameOver && !gameState.isMenuVisible) {
      // Check if name input modal is visible - don't return to main menu if it is
      const nameInputModal = document.getElementById('nameInputModal');
      if (nameInputModal && nameInputModal.classList.contains('name-input-modal-visible')) {
        console.log('🛑 [VISIBILITY] Ignoring game over keypress - name input modal is visible');
        return; // Don't return to main menu if name input modal is showing
      }
      // The leaderboard system will handle the game over interaction
      // This handler should not interfere
    } else if (e.code==='KeyP') {
      e.preventDefault();
      // Toggle pause only if game is running and not game over and not in menu
      if (game.gameRunning && !game.gameOver && !gameState.isMenuVisible) {
        game.paused = !game.paused;
      }
    } else {
      game.keys[e.code] = true;
    }
  });

  // Mouse click handling for game over screen
  document.addEventListener('click', handleGameOverInteraction);

  // Touch handling for game over screen
  document.addEventListener('touchstart', handleGameOverInteraction);
  
  document.addEventListener('keyup', e => {
    game.keys[e.code] = false;
  });

  // Touch handling - Enhanced with TouchInput system
  if (typeof TouchInput !== 'undefined' && TouchInput.isInitialized) {
    // TouchInput system handles all touch events
    console.log('👆 Using enhanced touch input system');
  } else {
    // Fallback to original touch handling
    let touchY = 0;
    game.canvas.addEventListener('touchstart', e=>{
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
    
    game.canvas.addEventListener('touchmove', e=>{
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

  // Start the game
  game.gameRunning = true;
  console.log('Game initialized and starting game loop');
  if (typeof game !== 'undefined' && game._rafId) {
    console.warn('⚠️ [DEBUG] init() detected existing RAF id. Cancelling:', game._rafId);
    try { cancelAnimationFrame(game._rafId); } catch (e) { /* ignore */ }
    game._rafId = null;
  }
  gameLoop();
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

// Export initialization function for menu system to call
window.initializeGame = function() {
  if (!gameInitialized) {
    console.log('🎮 Initializing game...');
    init();
    gameInitialized = true;
  }
};

