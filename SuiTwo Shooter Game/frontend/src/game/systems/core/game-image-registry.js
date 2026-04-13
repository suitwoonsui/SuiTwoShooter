// ==========================================
// GAME IMAGE REGISTRY - Register All Game Images
// ==========================================
// Registers all game images with the ImagePreloader
// This should be called before game starts to preload critical images
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
 * Register all critical game images with the ImagePreloader
 * Critical images are required for gameplay (player, enemies, bosses, projectiles, collectibles, background)
 * @returns {Promise<void>} Resolves when all critical images are registered and loading
 */
async function registerGameImages() {
  if (!window.ImagePreloader) {
    log.error('IMAGE REGISTRY', 'ImagePreloader not available');
    return;
  }

  const preloader = window.ImagePreloader;

  log.info('IMAGE REGISTRY', 'Registering game images...');

  // MINIMUM critical images (must load before game starts - only absolute essentials)
  // These are the bare minimum needed to start the game loop
  const minimumCriticalImages = [
    { key: 'player', src: 'assets/SuiTwo_Character.webp', critical: true },
    { key: 'background', src: 'assets/background.webp', critical: true },
    { key: 'enemy_jeet', src: 'assets/Enemy_Jeet.webp', critical: true }, // First enemy type
    { key: 'projectile_blue_orb', src: 'assets/Blue_Orb_Shot.webp', critical: true }, // Player projectile
    { key: 'life_full', src: 'assets/Life_Full.webp', critical: true }, // UI
    { key: 'life_empty', src: 'assets/Life_Empty.webp', critical: true }, // UI
  ];

  // Other critical images (can load in background after game starts)
  const otherCriticalImages = [
    // Enemies
    { key: 'enemy_market_maker', src: 'assets/Enemy_Market_Maker.webp', critical: false },
    { key: 'enemy_little_bear', src: 'assets/Enemy_Little_Bear.webp', critical: false },
    { key: 'enemy_shadow_hand', src: 'assets/Enemy_Shadow_Hand.webp', critical: false },
    
    // Bosses
    { key: 'boss_scammer', src: 'assets/Boss_Scammer.webp', critical: false },
    { key: 'boss_market_maker', src: 'assets/Boss_Market_Maker.webp', critical: false },
    { key: 'boss_bear', src: 'assets/Boss_Bear.webp', critical: false },
    { key: 'boss_shadow_figure', src: 'assets/Boss_Shadow_Figure.webp', critical: false },
    
    // Projectiles
    { key: 'projectile_boss_arrow', src: 'assets/Boss_Arrow_Bolt.webp', critical: false },
    { key: 'projectile_enemy_candle', src: 'assets/Enemy_Red_Candle.webp', critical: false },
    
    // Collectibles
    { key: 'collectible_coin', src: 'assets/SuiTwo_Coin.webp', critical: false },
    { key: 'powerup_bonus', src: 'assets/Power_Up_Sui_Rocket.webp', critical: false },
    { key: 'powerup_malus', src: 'assets/Power_Down_Sui_Rocket.webp', critical: false },
    
    // UI Life indicators
    { key: 'life_full_gold', src: 'assets/Life_Full_Gold.webp', critical: false },
  ];

  // Register minimum critical images first (blocking - must load before game starts)
  log.info('IMAGE REGISTRY', 'Registering minimum critical images (must load before game starts)...');
  await preloader.registerBatch(minimumCriticalImages);

  // Register other critical images (non-blocking - can load in background)
  log.info('IMAGE REGISTRY', 'Registering other critical images (loading in background)...');
  preloader.registerBatch(otherCriticalImages).catch(err => {
    log.warn('IMAGE REGISTRY', 'Some non-critical images failed to load', err);
  });

  log.info('IMAGE REGISTRY', `Registered ${minimumCriticalImages.length} minimum critical + ${otherCriticalImages.length} background images`);
}

/**
 * Wait for minimum critical images to load (only absolute essentials)
 * This allows the game to start faster while other images load in background
 * @returns {Promise<void>} Resolves when minimum critical images are loaded
 */
async function waitForGameImages() {
  if (!window.ImagePreloader) {
    log.warn('IMAGE REGISTRY', 'ImagePreloader not available, skipping image preload wait');
    return;
  }

  log.info('IMAGE REGISTRY', 'Waiting for minimum critical images to load...');
  const startTime = performance.now();

  // Only wait for images marked as critical: true
  // This should be just the minimum set (player, background, first enemy, etc.)
  await window.ImagePreloader.waitForCritical();

  const loadTime = performance.now() - startTime;
  const status = window.ImagePreloader.getStatus();
  
  log.info('IMAGE REGISTRY', `Minimum critical images loaded in ${loadTime.toFixed(2)}ms`, {
    loaded: status.loaded,
    failed: status.failed,
    total: status.total
  });

  if (status.failed > 0) {
    log.warn('IMAGE REGISTRY', `${status.failed} images failed to load`);
  }

  // Continue loading other images in background (non-blocking)
  log.info('IMAGE REGISTRY', 'Other images will continue loading in background');
}

/**
 * Get image by key (for use in image files)
 * @param {string} key - Image key
 * @returns {Image|null} Loaded image or null
 */
function getGameImage(key) {
  if (!window.ImagePreloader) {
    return null;
  }
  return window.ImagePreloader.get(key);
}

// Expose globally
if (typeof window !== 'undefined') {
  window.registerGameImages = registerGameImages;
  window.waitForGameImages = waitForGameImages;
  window.getGameImage = getGameImage;
}

log.info('IMAGE REGISTRY', 'Game image registry module loaded');

