// ==========================================
// TRANSITION ASSET MANAGER - Load/Unload Assets During Transitions
// ==========================================
// Utilizes boss warning, boss victory, and level start delay periods
// to preload/prepare assets for upcoming gameplay
// ==========================================

// Use FrontendLogger if available, fallback to console
var log = (typeof window !== 'undefined' && window.FrontendLogger) 
  ? {
      debug: (cat, msg, data) => window.FrontendLogger.debug(cat, msg, data),
      info: (cat, msg, data) => window.FrontendLogger.info(cat, msg, data),
      warn: (cat, msg, data) => window.FrontendLogger.warn(cat, msg, data),
      error: (cat, msg, data) => window.FrontendLogger.error(cat, msg, data),
    }
  : {
      debug: () => {},
      info: (cat, msg, data) => console.log(`[${cat}] ${msg}`, data || ''),
      warn: (cat, msg, data) => console.warn(`[${cat}] ${msg}`, data || ''),
      error: (cat, msg, data) => console.error(`[${cat}] ${msg}`, data || ''),
    };

/**
 * Pre-calculate boss dimensions and collision data
 * Called during boss warning (2 seconds) to prepare boss assets
 */
function prepareBossAssets(bossTier) {
  if (!window.getGameImage || !window.getBossDimensions) {
    return;
  }

  log.debug('TRANSITION ASSETS', `Preparing boss assets for tier ${bossTier}...`);
  const startTime = performance.now();

  // Get boss image for this tier
  const bossKeys = ['boss_scammer', 'boss_market_maker', 'boss_bear', 'boss_shadow_figure'];
  const bossKey = bossKeys[bossTier - 1] || bossKeys[0];
  const bossImage = window.getGameImage(bossKey);

  if (bossImage && bossImage.complete) {
    // Pre-calculate boss dimensions for common sizes
    // This caches the dimensions so they're ready when boss spawns
    const commonBossWidth = 180;
    const commonBossHeight = 120;
    window.getBossDimensions(bossImage, commonBossWidth, commonBossHeight);
    
    log.debug('TRANSITION ASSETS', `Boss dimensions pre-calculated for tier ${bossTier}`);
  }

  // Pre-calculate boss projectile dimensions if available
  if (window.getGameImage && window.getProjectileDimensions) {
    const bossProjectileImage = window.getGameImage('projectile_boss_arrow');
    if (bossProjectileImage && bossProjectileImage.complete) {
      // Pre-calculate for common projectile sizes
      window.getProjectileDimensions(bossProjectileImage, 20);
      log.debug('TRANSITION ASSETS', 'Boss projectile dimensions pre-calculated');
    }
  }

  const loadTime = performance.now() - startTime;
  log.debug('TRANSITION ASSETS', `Boss assets prepared in ${loadTime.toFixed(2)}ms`);
}

/**
 * Pre-calculate enemy dimensions for upcoming tier
 * Called during boss victory (3 seconds) to prepare next level assets
 */
function prepareNextLevelAssets(nextTier) {
  if (!window.getGameImage || !window.getEnemyDimensions) {
    return;
  }

  log.debug('TRANSITION ASSETS', `Preparing next level assets for tier ${nextTier}...`);
  const startTime = performance.now();

  // Pre-calculate dimensions for enemies that will appear in next tier
  const enemyKeys = ['enemy_jeet', 'enemy_market_maker', 'enemy_little_bear', 'enemy_shadow_hand'];
  
  // Determine which enemies will appear based on tier
  const enemiesToPrepare = [];
  if (nextTier >= 1) enemiesToPrepare.push(enemyKeys[0]); // Jeet
  if (nextTier >= 2) enemiesToPrepare.push(enemyKeys[1]); // Market Maker
  if (nextTier >= 3) enemiesToPrepare.push(enemyKeys[2]); // Little Bear
  if (nextTier >= 4) enemiesToPrepare.push(enemyKeys[3]); // Shadow Hand

  let prepared = 0;
  enemiesToPrepare.forEach(key => {
    const enemyImage = window.getGameImage(key);
    if (enemyImage && enemyImage.complete) {
      window.getEnemyDimensions(enemyImage);
      prepared++;
    }
  });

  // Pre-calculate collectible dimensions if not already done
  if (window.getCollectibleDimensions) {
    const collectibleImage = window.getGameImage('collectible_coin');
    if (collectibleImage && collectibleImage.complete) {
      window.getCollectibleDimensions(collectibleImage);
    }
    const powerupBonusImage = window.getGameImage('powerup_bonus');
    if (powerupBonusImage && powerupBonusImage.complete) {
      window.getCollectibleDimensions(powerupBonusImage);
    }
  }

  const loadTime = performance.now() - startTime;
  log.debug('TRANSITION ASSETS', `Next level assets prepared in ${loadTime.toFixed(2)}ms`, {
    enemiesPrepared: prepared,
    tier: nextTier
  });
}

/**
 * Pre-generate initial tiles for next level
 * Called during level start delay (1 second) to have tiles ready
 */
function pregenerateNextLevelTiles() {
  if (typeof window.generateTiles === 'function') {
    log.debug('TRANSITION ASSETS', 'Pre-generating initial tiles for next level...');
    const startTime = performance.now();
    
    // Generate initial tiles (they'll be used when level starts)
    window.generateTiles();
    
    const tileCount = window.tiles ? window.tiles.length : 0;
    const loadTime = performance.now() - startTime;
    log.debug('TRANSITION ASSETS', `Pre-generated ${tileCount} tiles in ${loadTime.toFixed(2)}ms`);
  }
}

/**
 * Pre-calculate common math values and cache them
 * Reduces repeated calculations during gameplay
 */
function precacheCommonValues() {
  const game = (typeof window !== 'undefined' && window.gameState) ? window.gameState : 
               (typeof window !== 'undefined' && window.game) ? window.game : null;
  
  if (!game) return;
  
  log.debug('TRANSITION ASSETS', 'Pre-caching common math values...');
  
  // Pre-calculate lane positions (used frequently in rendering and collision)
  if (!game._cachedLanePositions) {
    game._cachedLanePositions = [];
    for (let lane = 0; lane < 3; lane++) {
      game._cachedLanePositions[lane] = lane * game.laneHeight + (game.laneHeight - 60) / 2;
    }
    log.debug('TRANSITION ASSETS', 'Pre-cached lane positions');
  }
  
  // Pre-calculate common collision bounds
  if (!game._cachedCollisionBounds) {
    game._cachedCollisionBounds = {
      playerBodyWidth: 55 * 0.4,  // Player body width (40% of sprite)
      playerBodyHeight: 100 * 0.65, // Player body height (65% of sprite)
      collectibleWidth: 40,
      collectibleHeight: 40,
      enemyWidth: 60,
      enemyHeight: 60
    };
    log.debug('TRANSITION ASSETS', 'Pre-cached collision bounds');
  }
}

/**
 * Pre-allocate particle pool
 * Reduces object allocation during gameplay
 */
function preallocateParticlePool() {
  const game = (typeof window !== 'undefined' && window.gameState) ? window.gameState : 
               (typeof window !== 'undefined' && window.game) ? window.game : null;
  
  if (!game || typeof Particle === 'undefined') return;
  
  log.debug('TRANSITION ASSETS', 'Pre-allocating particle pool...');
  
  // Create a pool of reusable particle objects
  if (!game._particlePool) {
    game._particlePool = [];
    const poolSize = 100; // Pre-allocate 100 particles
    
    for (let i = 0; i < poolSize; i++) {
      game._particlePool.push(new Particle(0, 0, '#000000'));
    }
    
    game._particlePoolIndex = 0;
    log.debug('TRANSITION ASSETS', `Pre-allocated ${poolSize} particles`);
  }
}

/**
 * Pre-calculate tile generation patterns
 * Reduces Math.random() calls during tile generation
 */
function precacheTilePatterns() {
  const game = (typeof window !== 'undefined' && window.gameState) ? window.gameState : 
               (typeof window !== 'undefined' && window.game) ? window.game : null;
  
  if (!game) return;
  
  log.debug('TRANSITION ASSETS', 'Pre-caching tile generation patterns...');
  
  // Pre-generate random values for tile generation
  // This reduces Math.random() calls during gameplay
  if (!game._tilePatternCache) {
    game._tilePatternCache = {
      randomValues: [],
      index: 0
    };
    
    // Pre-generate 1000 random values (enough for many tiles)
    for (let i = 0; i < 1000; i++) {
      game._tilePatternCache.randomValues.push(Math.random());
    }
    
    log.debug('TRANSITION ASSETS', 'Pre-cached 1000 random values for tile generation');
  }
}

/**
 * Pre-decode audio files if using Web Audio API
 * Reduces audio latency during gameplay
 */
function predecodeAudioFiles() {
  log.debug('TRANSITION ASSETS', 'Pre-decoding audio files...');
  
  // Audio system handles its own preloading
  // This is just a check to ensure audio is ready
  if (typeof window.AudioManager !== 'undefined' && window.AudioManager.isInitialized) {
    log.debug('TRANSITION ASSETS', 'Audio system ready');
  } else {
    log.debug('TRANSITION ASSETS', 'Audio system will be initialized when needed');
  }
}

/**
 * Perform garbage collection and cleanup
 * Called during transitions to free up memory
 */
function performTransitionCleanup() {
  log.debug('TRANSITION ASSETS', 'Performing transition cleanup...');
  
  const game = (typeof window !== 'undefined' && window.gameState) ? window.gameState : 
               (typeof window !== 'undefined' && window.game) ? window.game : null;
  
  if (game && game.particles) {
    // Filter out dead particles (they'll be cleaned up naturally, but we can help)
    // Use for loop instead of filter to avoid creating new array (more efficient)
    const beforeCount = game.particles.length;
    const aliveParticles = [];
    const particlesLength = game.particles.length;
    for (let i = 0; i < particlesLength; i++) {
      if (game.particles[i].life > 0) {
        aliveParticles.push(game.particles[i]);
      }
    }
    game.particles = aliveParticles;
    const afterCount = game.particles.length;
    
    if (beforeCount > afterCount) {
      log.debug('TRANSITION ASSETS', `Cleaned up ${beforeCount - afterCount} dead particles`);
    }
  }
  
  // Clear any unused arrays that might have grown large
  if (game) {
    // Trim arrays if they've grown too large (prevent memory bloat)
    if (game.projectiles && game.projectiles.length > 200) {
      log.debug('TRANSITION ASSETS', `Projectiles array large (${game.projectiles.length}), trimming...`);
      // Keep only recent projectiles
      game.projectiles = game.projectiles.slice(-100);
    }
    
    if (game.enemyProjectiles && game.enemyProjectiles.length > 100) {
      log.debug('TRANSITION ASSETS', `Enemy projectiles array large (${game.enemyProjectiles.length}), trimming...`);
      game.enemyProjectiles = game.enemyProjectiles.slice(-50);
    }
  }
  
  // Force garbage collection hint (if available)
  if (typeof window.gc === 'function') {
    // Only in development/debugging - not available in production
    try {
      window.gc();
      log.debug('TRANSITION ASSETS', 'Garbage collection triggered');
    } catch (e) {
      // Ignore - gc not available
    }
  }
}

/**
 * Handle boss warning transition (2 seconds)
 * Pre-loads boss-specific assets
 */
function handleBossWarningTransition(bossTier) {
  log.info('TRANSITION ASSETS', `Boss warning transition - preparing tier ${bossTier} boss assets`);
  const startTime = performance.now();

  // 1. Prepare boss assets (dimensions, collision data)
  prepareBossAssets(bossTier);

  // 2. Pre-cache common values
  precacheCommonValues();

  // 3. Pre-allocate particle pool
  preallocateParticlePool();

  // 4. Pre-decode audio (if needed)
  predecodeAudioFiles();

  // 5. Perform cleanup
  performTransitionCleanup();

  const totalTime = performance.now() - startTime;
  log.info('TRANSITION ASSETS', `Boss warning transition complete in ${totalTime.toFixed(2)}ms`);
}

/**
 * Handle boss victory transition (3 seconds)
 * Pre-loads next level assets
 */
function handleBossVictoryTransition(nextTier) {
  log.info('TRANSITION ASSETS', `Boss victory transition - preparing tier ${nextTier} assets`);
  const startTime = performance.now();

  // 1. Prepare next level enemy assets
  prepareNextLevelAssets(nextTier);

  // 2. Pre-cache tile generation patterns
  precacheTilePatterns();

  // 3. Pre-cache common values (refresh for new tier)
  precacheCommonValues();

  // 4. Perform cleanup
  performTransitionCleanup();

  const totalTime = performance.now() - startTime;
  log.info('TRANSITION ASSETS', `Boss victory transition complete in ${totalTime.toFixed(2)}ms`);
}

/**
 * Handle level start delay (1 second)
 * Pre-generates initial tiles
 */
function handleLevelStartDelay() {
  log.info('TRANSITION ASSETS', 'Level start delay - pre-generating tiles');
  const startTime = performance.now();

  // 1. Pre-generate initial tiles
  pregenerateNextLevelTiles();

  // 2. Final cleanup before gameplay resumes
  performTransitionCleanup();

  const totalTime = performance.now() - startTime;
  log.info('TRANSITION ASSETS', `Level start delay preparation complete in ${totalTime.toFixed(2)}ms`);
}

// Expose globally
if (typeof window !== 'undefined') {
  window.handleBossWarningTransition = handleBossWarningTransition;
  window.handleBossVictoryTransition = handleBossVictoryTransition;
  window.handleLevelStartDelay = handleLevelStartDelay;
  window.prepareBossAssets = prepareBossAssets;
  window.prepareNextLevelAssets = prepareNextLevelAssets;
}

log.info('TRANSITION ASSETS', 'Transition asset manager module loaded');

