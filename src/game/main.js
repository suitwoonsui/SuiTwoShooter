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
  
  if (secureGame) {
    secureGame.incrementScore(points);
    const newScore = game.score;
    console.log(`📈 [SCORE] +${points} points | Previous: ${previousScore} | New: ${newScore} | SecureGame score: ${secureGame.score}`);
  } else {
    // Fallback amélioré
    if (!game._fallbackScore) game._fallbackScore = 0;
    game._fallbackScore += points;
    console.log(`📈 [SCORE] +${points} points | Fallback score: ${game._fallbackScore}`);
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
  
  // Generate unique session ID for this game session
  // Use crypto.randomUUID() if available (secure), otherwise fallback to timestamp + random
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    game.sessionId = crypto.randomUUID();
  } else {
    // Fallback: timestamp + random bytes (less secure but better than timestamp alone)
    const timestamp = Date.now();
    const randomBytes = Array.from(crypto.getRandomValues(new Uint8Array(8)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    game.sessionId = `${timestamp}-${randomBytes}`;
  }
  console.log('🆔 [SESSION] Generated session ID:', game.sessionId);
  
  // Reset fallback score as well
  game._fallbackScore = 0;
  
  // Reinitialize/reset security system
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
  
  // Initialize orb level with purchased orb level start
  game.startingOrbLevel = 1; // Default starting level
  if (game.selectedItems && game.selectedItems.orbLevel) {
    const orbLevelPurchase = game.selectedItems.orbLevel;
    // Level 1 purchase = start at 2, Level 2 = start at 3, Level 3 = start at 4
    game.startingOrbLevel = orbLevelPurchase + 1;
    game.projectileLevel = game.startingOrbLevel;
    console.log(`🔮 [ORB LEVEL] Starting at Orb Level ${game.startingOrbLevel} (purchased Level ${orbLevelPurchase})`);
    
    // Consume start item from inventory (applied immediately at game start)
    if (typeof removeItemFromInventory === 'function') {
      const walletAddress = typeof getWalletAddress === 'function' ? getWalletAddress() : null;
      removeItemFromInventory('orbLevel', orbLevelPurchase, 1, walletAddress);
      console.log(`✅ [CONSUMPTION] Consumed orbLevel level ${orbLevelPurchase} at game start`);
    }
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
    
    // Consume start item from inventory (applied immediately at game start)
    if (typeof removeItemFromInventory === 'function') {
      const walletAddress = typeof getWalletAddress === 'function' ? getWalletAddress() : null;
      removeItemFromInventory('extraLives', extraLivesLevel, 1, walletAddress);
      console.log(`✅ [CONSUMPTION] Consumed extraLives level ${extraLivesLevel} at game start`);
    }
  }
  
  // Total lives = base + purchased
  game.lives = game.baseLives + game.purchasedLives;
  game.maxLives = game.lives; // Update max lives
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
  // Fire rate will be set based on starting orb level below
  game.gameRunning = true;
  game.gameOver = false; // Reset game over state
  game.paused = false; // Reset pause state
  game.bossesDefeated = 0; // Reset progression
  game.currentTier = 1; // Reset to tier 1
  game.enemiesDefeated = 0; // Reset enemy defeat counter
  game.bossTiers = []; // Reset boss tiers array
  game.enemyTypes = []; // Reset enemy types array (for accurate score calculation)
  game.bossHits = 0; // Reset boss hit damage counter (total damage dealt, not count)
  game.levelStartDelay = game.levelStartDelayDuration; // Start with spawn delay
  // Reset force field system
  // Check for purchased force field in selected items
  if (game.selectedItems && game.selectedItems.forceField) {
    const forceFieldLevel = game.selectedItems.forceField;
    game.forceField.level = forceFieldLevel;
    game.forceField.active = true;
    console.log(`🛡️ [FORCE FIELD] Starting with Level ${forceFieldLevel} force field`);
    
    // Consume start item from inventory (applied immediately at game start)
    if (typeof removeItemFromInventory === 'function') {
      const walletAddress = typeof getWalletAddress === 'function' ? getWalletAddress() : null;
      removeItemFromInventory('forceField', forceFieldLevel, 1, walletAddress);
      console.log(`✅ [CONSUMPTION] Consumed forceField level ${forceFieldLevel} at game start`);
    }
  } else {
    game.forceField.level = 0;
    game.forceField.active = false;
  }
  resetCoinStreak();
  game.forceField.maxStreak = 0;
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
  startingOrbLevel: 1, // Starting orb level (for power-up cap calculation)
  orbLevelCap: 3, // Power-up cap (startingLevel + 2)
  lives: 3,
  baseLives: 3, // Base lives (always 3)
  purchasedLives: 0, // Purchased extra lives
  maxLives: 3, // Maximum number of lives (base + purchased)
  gameRunning: false,
  gameOver: false, // Game over state
  paused: false, // Pause state
  bossesDefeated: 0, // Number of bosses defeated
  currentTier: 1, // Current tier (1-4)
  enemiesDefeated: 0, // Number of enemies defeated (for blockchain/burn tracking)
  bossTiers: [], // Array tracking tier of each boss defeated (for accurate burn calculation)
  enemyTypes: [], // Array tracking type of each enemy defeated (for accurate score calculation)
  bossHits: 0, // Total damage dealt to bosses (points = damage dealt per hit)
  keys: {},
  particles: [],
  bgX: 0, // Background scrolls horizontally
  maxChargeTime: 1000,
  chargeStart: null,
  flashTime: 0,
  invulnerabilityTime: 0, // Invulnerability timer after being hit
  bossActive: false,
  bossWarning: false,
  selectedItems: {}, // Items selected for consumption (set by item-consumption.js)
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
    level: 0, // 0 = none, 1 = level 1, 2 = level 2, 3 = level 3
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
    
    if (shouldUseSeparateEnemies()) {
      // After tier 4: Separate enemies move at enemySpeed (increases beyond scrollSpeed cap), tiles move at scrollSpeed
      // Move separate enemies at effectiveEnemySpeed (has its own increasing cap)
      enemies.forEach(e => e.x -= effectiveEnemySpeed);
      
      // Move tiles at effectiveScrollSpeed (same speed as before tier 4)
      tiles.forEach(t => t.x -= effectiveScrollSpeed);
      
      // Remove off-screen enemies
      enemies = enemies.filter(e => e.x > -200);
    } else {
      // Before tier 4: Enemies are in tiles, everything moves together at effectiveScrollSpeed
      tiles.forEach(t => t.x -= effectiveScrollSpeed);
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
        
        if (enemy.hp <= 0) {
          // Monster destroyed - SECURE SCORING
          updateScore(15 * enemy.type); // SECURE: More points for high tier monsters
          // Track enemy defeat for blockchain/burn calculation
          game.enemiesDefeated++;
          // Track enemy type for accurate score calculation
          game.enemyTypes.push(enemy.type);
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
        // Remove enemies that were destroyed by missiles or other means (hp <= 0)
        if (obs.hp <= 0) {
          return false; // Enemy destroyed
        }
        
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
function gameOver() {
  console.log("Game Over triggered!"); 
  
  // Debug: Check score from multiple sources
  const scoreFromGetter = game.score;
  const scoreFromSecureGame = secureGame ? secureGame.score : null;
  const scoreFromFallback = game._fallbackScore || 0;
  
  console.log("📊 [SCORE DEBUG] Score sources:", {
    fromGetter: scoreFromGetter,
    fromSecureGame: scoreFromSecureGame,
    fromFallback: scoreFromFallback,
    hasSecureGame: !!secureGame
  });
  
  console.log("Final Score:", scoreFromGetter); // Debug to verify score
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
  // Capture score BEFORE any security validation (in case it gets reset)
  // Try multiple sources to get the actual score
  let capturedScore = game.score;
  if (capturedScore === 0 && secureGame && secureGame.score) {
    // If getter returns 0 but secureGame has a score, use that
    capturedScore = secureGame.score;
    console.log('📊 [GAME OVER] Using score from secureGame directly:', capturedScore);
  } else if (capturedScore === 0 && game._fallbackScore) {
    // Fallback to _fallbackScore if available
    capturedScore = game._fallbackScore;
    console.log('📊 [GAME OVER] Using fallback score:', capturedScore);
  }
  console.log('📊 [GAME OVER] Captured score before validation:', capturedScore);
  
  let finalScoreToUse = capturedScore;
  
  if (onSecureGameOver) {
    const result = onSecureGameOver();
    if (result && result.success) {
      console.log('✓ Score securely validated:', result.score);
      finalScoreToUse = result.score;
    } else {
      // Security validation failed, but we still use the captured score
      // The blockchain will do its own validation, so we don't block submission here
      console.warn('⚠ Security validation warning (not blocking):', result ? result.error : 'No result');
      // Use the captured score (before validation) for display and blockchain submission
      // This ensures we don't lose the actual score if security system rejects it
      finalScoreToUse = capturedScore;
      console.log('📊 [GAME OVER] Using captured score (security validation bypassed for blockchain submission):', finalScoreToUse);
    }
  }
  
  // Capture all game stats at game over time (before any potential reset)
  const gameStats = {
    score: finalScoreToUse,
    distance: game.distance || 0,
    coins: game.coins || 0,
    bossesDefeated: game.bossesDefeated || 0,
    enemiesDefeated: game.enemiesDefeated || 0,
    longestCoinStreak: game.forceField?.maxStreak || 0,
    sessionId: game.sessionId || null,
    bossTiers: game.bossTiers || [], // Array of boss tiers for exact score calculation
    enemyTypes: game.enemyTypes || [], // Array of enemy types for exact score calculation
    bossHits: game.bossHits || 0 // Total damage dealt to bosses (points = damage dealt)
  };
  
  console.log('📊 [GAME OVER] Captured game stats:', gameStats);
  
  // Always call onGameOver to set up interaction handlers, even if validation failed
  // This ensures the game over screen can proceed to the next screen
  // Pass stats object instead of just score
  if (typeof onGameOver === 'function') {
    onGameOver(gameStats);
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
  // The leaderboard system's onGameOver() sets up its own handlers with capture: true.
  // This handler should not interfere - it just logs and lets the leaderboard handler work.
  function handleGameOverInteraction(e) {
    if (game.gameOver && !gameState.isMenuVisible) {
      // Check if name input modal is visible or about to be shown
      const nameInputModal = document.getElementById('nameInputModal');
      if (nameInputModal && nameInputModal.classList.contains('name-input-modal-visible')) {
        console.log('🛑 [VISIBILITY] Ignoring game over click - name input modal is visible');
        return; // Don't return to main menu if name input modal is showing
      }
      
      // The leaderboard system handles the interaction via onGameOver() with capture: true
      // This handler runs in bubble phase, so leaderboard handler should already have processed it
      // Don't prevent default or stop propagation - let the leaderboard system handle it
      console.log('🛑 [VISIBILITY] Game over interaction detected - leaderboard system should handle');
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

