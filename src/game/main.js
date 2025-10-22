// ==========================================
// MAIN GAME MANAGEMENT - CORE FUNCTIONS
// ==========================================

// Security system initialization
let secureGame = null;
let onEnemyDestroyed = null;
let onSecureGameOver = null;

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
  console.log('Game restarting - starting new game');
  // Reinitialize security system
  initSecurity();
  
  game.speed = game.baseSpeed;
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
  generateTiles();
}

// Return to main menu from game over screen
function returnToMainMenu() {
  console.log('Returning to main menu from game over');
  
  // Reset game state
  game.gameOver = false;
  game.gameRunning = false;
  game.paused = false;
  
  // Show main menu
  gameState.isMenuVisible = true;
  gameState.isGameRunning = false;
  gameState.isPaused = false;
  gameState.isGameOver = false;
  
  // Show main menu overlay
  const mainMenu = document.getElementById('mainMenuOverlay');
  if (mainMenu) {
    mainMenu.style.display = 'flex';
  }
  
  // Stop background music
  if (typeof stopBackgroundMusic === 'function') {
    stopBackgroundMusic();
  }
}

// Game configuration (horizontal mode) - MODIFIED for security
const game = {
  canvas: null,
  ctx: null,
  width: 800,
  height: 480,
  laneHeight: 480 / 3, // 3 horizontal lanes
  speed: 2.5,
  baseSpeed: 2.5,
  speedIncrement: 0.01,
  maxSpeed: 6,
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
    return;
  }
  
  if (game.gameOver) {
    console.log('Game over, updating particles only');
    // Update particles even in game over
    game.particles.forEach(p=>p.update());
    game.particles = game.particles.filter(p=>p.life>0);
    return;
  }
  
  if (!game.gameRunning) {
    console.log('Game not running, skipping update');
    return;
  }
  
  // Skip all game logic if paused
  if (game.paused) {
    console.log('Game paused, skipping update');
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
        if (game.boss.vulnerable && game.boss.x <= game.boss.targetX) {
          const moveSpeed = (1 + (game.boss.tier * 0.5)) * (game.boss.enraged ? 2 : 1);
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

  // Only update game progression if not in boss fight
  if (!game.bossActive) {
    // Update game speed
    game.speed = Math.min(game.maxSpeed, game.speed + game.speedIncrement);
    game.distance += game.speed;
    game.distanceSinceBoss += game.speed;
    game.bgX += game.speed;
    if (game.bgX >= game.width) game.bgX = 0;
    
    // Debug boss progress
    if (game.distanceSinceBoss > 0 && game.distanceSinceBoss % 1000 < game.speed) {
      console.log('Boss progress:', Math.floor(game.distanceSinceBoss), '/', game.bossThreshold);
    }
  }

  // Only scroll tiles and generate new ones if not in boss fight
  if (!game.bossActive) {
    // Scroll tiles (to the left)
    tiles.forEach(t => t.x -= game.speed);
    
    // Generate new tiles (before filtering out off-screen tiles)
    generateTiles();
    
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
    tiles.forEach(tile => {
      tile.obstacles = tile.obstacles.filter(obs => {
        const ox = tile.x + 20;
        const oy = obs.lane * game.laneHeight + (game.laneHeight - 60) / 2;
        
        // Calculate dynamic enemy dimensions (same as rendering)
        const enemyImage = enemyImages[obs.type - 1];
        const enemyDims = getEnemyDimensions(enemyImage);
        const enemyX = ox + enemyDims.centerOffset;
        const enemyY = oy;
        
        // Calculate projectile collision box (proper collision detection)
        const projectileX = b.x;
        const projectileY = b.y - orbSize / 2;
        const projectileWidth = orbSize;
        const projectileHeight = orbSize;
        
        // Check collision between projectile and enemy
        if (projectileX < enemyX + enemyDims.width && projectileX + projectileWidth > enemyX &&
            projectileY < enemyY + enemyDims.height && projectileY + projectileHeight > enemyY) {
          obs.hp -= b.level; // Decrease HP by orb level (bigger orbs = more damage)
          
          // Calculate collision point (where projectile intersects with enemy)
          const collisionX = Math.max(projectileX, enemyX);
          const collisionY = Math.max(projectileY, enemyY);
          
          if (obs.hp <= 0) {
            // Monster destroyed - SECURE SCORING
            updateScore(15 * obs.type); // SECURE: More points for high tier monsters
            // Play enemy destroyed sound
            if (typeof playEnemyDestroyedSound === 'function') {
              playEnemyDestroyedSound();
            }
            createExplosionEffect(collisionX, collisionY);
            projectileHit = true;
            return false;
          } else {
            // Monster hit but not destroyed
            // Play enemy hit sound
            if (typeof playEnemyHitSound === 'function') {
              playEnemyHitSound();
            }
            createProjectileHitEffect(collisionX, collisionY);
            projectileHit = true;
            return true;
          }
        }
        return true;
      });
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
  
  // Handle boss victory timeout
  if (game.bossVictoryTimeout) {
    game.bossVictoryTime -= 16; // Approximation of 60fps
    if (game.bossVictoryTime <= 0) {
      // Victory period over, start next stage
      game.bossVictoryTimeout = false;
      game.speed = game.baseSpeed;
      
      // Start regular music after victory screen ends
      if (typeof resumeGameplayMusic === 'function') {
        resumeGameplayMusic();
      }
      
      // Don't reset distanceSinceBoss here - it should reset when boss warning appears
    }
    return; // Skip normal game updates during victory period
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
  // Only run game logic if not in menu and game is running
  if (typeof gameState !== 'undefined' && gameState.isMenuVisible) {
    requestAnimationFrame(gameLoop);
    return;
  }
  
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// Initialization - SECURE VERSION WITH MENU INTEGRATION
function init() {
  game.canvas = document.getElementById('gameCanvas');
  game.ctx = game.canvas.getContext('2d');
  
  // Always use original game dimensions (800x480) for game logic
  // The responsive canvas system handles display scaling
  game.width = 800;
  game.height = 480;
  console.log('📐 Using original game dimensions:', game.width, 'x', game.height);
  
  game.laneHeight = game.height / 3;
  player.y = game.height / 2 - player.height / 2;
  game.mouseY = game.height / 2;

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

  // Keyboard handling (optional) - Modified for menu integration
  document.addEventListener('keydown', e => {
    // Return to main menu if game is over (any key)
    if (game.gameOver && !gameState.isMenuVisible) {
      e.preventDefault();
      returnToMainMenu();
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

// Start the game
if (document.readyState==='loading') {
  document.addEventListener('DOMContentLoaded', () => {
    checkSecuritySystem();
    init();
  });
} else {
  checkSecuritySystem();
  init();
}
