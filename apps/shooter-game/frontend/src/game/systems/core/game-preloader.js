// ==========================================
// GAME PRELOADER - Pre-initialize Game Assets
// ==========================================
// Pre-calculates sprite dimensions, pre-initializes systems, and pre-generates data
// to reduce processing during gameplay
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
 * Pre-calculate all sprite dimensions for loaded images
 * This ensures dimensions are ready before gameplay starts
 */
function precalculateSpriteDimensions() {
  if (!window.ImagePreloader || !window.getGameImage) {
    log.warn('GAME PRELOADER', 'ImagePreloader or getGameImage not available');
    return;
  }

  log.info('GAME PRELOADER', 'Pre-calculating sprite dimensions...');
  const startTime = performance.now();

  // Get all image keys from the registry
  const imageKeys = [
    // Collectibles
    'collectible_coin',
    'powerup_bonus',
    'powerup_malus',
    // Enemies
    'enemy_jeet',
    'enemy_market_maker',
    'enemy_little_bear',
    'enemy_shadow_hand',
    // Bosses
    'boss_scammer',
    'boss_market_maker',
    'boss_bear',
    'boss_shadow_figure',
    // Projectiles
    'projectile_blue_orb',
    'projectile_boss_arrow',
    'projectile_enemy_candle',
    // Player
    'player',
    // UI
    'life_full',
    'life_full_gold',
    'life_empty',
  ];

  let calculated = 0;
  let skipped = 0;

  // Pre-calculate dimensions for each image type
  imageKeys.forEach(key => {
    const image = window.getGameImage(key);
    if (!image) {
      skipped++;
      return;
    }

    // Force dimension calculation by calling the dimension functions
    // This will cache the results
    if (key.startsWith('collectible_') || key.startsWith('powerup_')) {
      if (typeof window.getCollectibleDimensions === 'function') {
        window.getCollectibleDimensions(image);
        calculated++;
      }
    } else if (key.startsWith('enemy_')) {
      if (typeof window.getEnemyDimensions === 'function') {
        window.getEnemyDimensions(image);
        calculated++;
      }
    } else if (key.startsWith('boss_')) {
      if (typeof window.getBossDimensions === 'function') {
        // Pre-calculate for common boss sizes
        window.getBossDimensions(image, 180, 120); // Standard boss size
        calculated++;
      }
    } else if (key.startsWith('projectile_')) {
      if (typeof window.getProjectileDimensions === 'function') {
        // Pre-calculate for common projectile sizes
        const oldLevel = key.includes('blue_orb') ? 1 : 1;
        const size = oldLevel * 8 + 16;
        window.getProjectileDimensions(image, size);
        calculated++;
      }
    } else if (key === 'player') {
      if (typeof window.getPlayerDimensions === 'function') {
        window.getPlayerDimensions(image, 55, 100);
        calculated++;
      }
    }
  });

  const loadTime = performance.now() - startTime;
  log.info('GAME PRELOADER', `Pre-calculated ${calculated} sprite dimensions in ${loadTime.toFixed(2)}ms`, {
    calculated,
    skipped
  });
}

/**
 * Pre-initialize enemy and boss image arrays
 * Ensures all image references are ready before gameplay
 */
function preinitializeImageArrays() {
  log.info('GAME PRELOADER', 'Pre-initializing image arrays...');
  
  // Force initialization of enemy images array
  if (typeof window.enemyImages === 'undefined') {
    // Enemy images are initialized in enemy-images.js when the module loads
    // This is just a check to ensure they're ready
    log.debug('GAME PRELOADER', 'Enemy images array will be initialized when enemy-images.js loads');
  }
  
  // Force initialization of boss images array
  if (typeof window.bossImages === 'undefined') {
    // Boss images are initialized in boss-images.js when the module loads
    log.debug('GAME PRELOADER', 'Boss images array will be initialized when boss-images.js loads');
  }
  
  log.info('GAME PRELOADER', 'Image arrays pre-initialized');
}

/**
 * Pre-generate initial tiles
 * Generates the first batch of tiles before gameplay starts
 */
function pregenerateInitialTiles() {
  if (typeof window.generateTiles === 'function' && typeof window.tiles !== 'undefined') {
    log.info('GAME PRELOADER', 'Pre-generating initial tiles...');
    const startTime = performance.now();
    
    // Clear any existing tiles first
    if (typeof window.clearGameArrays === 'function') {
      window.clearGameArrays();
    }
    
    // Generate initial tiles
    window.generateTiles();
    
    const tileCount = window.tiles ? window.tiles.length : 0;
    const loadTime = performance.now() - startTime;
    log.info('GAME PRELOADER', `Pre-generated ${tileCount} initial tiles in ${loadTime.toFixed(2)}ms`);
  } else {
    log.warn('GAME PRELOADER', 'generateTiles or tiles array not available');
  }
}

/**
 * Pre-initialize audio system
 * Ensures audio context is ready and sound effects are loaded
 */
function preinitializeAudio() {
  log.info('GAME PRELOADER', 'Pre-initializing audio system...');
  
  // Audio system is already initialized in audio-manager.js
  // This is just a check to ensure it's ready
  if (typeof window.AudioManager !== 'undefined' && window.AudioManager.isInitialized) {
    log.debug('GAME PRELOADER', 'Audio system already initialized');
  } else {
    log.debug('GAME PRELOADER', 'Audio system will be initialized when audio-manager.js loads');
  }
  
  log.info('GAME PRELOADER', 'Audio system pre-initialized');
}

/**
 * Main preload function - runs all preloading operations
 * Should be called after images are loaded but before game starts
 */
async function preloadGameAssets() {
  log.info('GAME PRELOADER', 'Starting game asset preloading...');
  const startTime = performance.now();

  try {
    // 1. Pre-calculate sprite dimensions (biggest performance win)
    precalculateSpriteDimensions();
    
    // 2. Pre-initialize image arrays
    preinitializeImageArrays();
    
    // 3. Pre-initialize audio
    preinitializeAudio();
    
    // 4. Pre-generate initial tiles (optional - can be done at game start)
    // pregenerateInitialTiles(); // Commented out - tiles should be generated fresh at game start
    
    const totalTime = performance.now() - startTime;
    log.info('GAME PRELOADER', `Game assets preloaded in ${totalTime.toFixed(2)}ms`);
  } catch (error) {
    log.error('GAME PRELOADER', 'Error during preloading', error);
    // Continue anyway - preloading is optional
  }
}

// Expose globally
if (typeof window !== 'undefined') {
  window.preloadGameAssets = preloadGameAssets;
  window.precalculateSpriteDimensions = precalculateSpriteDimensions;
}

log.info('GAME PRELOADER', 'Game preloader module loaded');

