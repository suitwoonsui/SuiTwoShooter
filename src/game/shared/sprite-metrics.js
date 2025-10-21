// ==========================================
// SHARED SPRITE METRICS
// ==========================================
// Centralized sprite dimension calculations for consistent sizing
// across rendering and collision systems

// Fallback dimensions (only used when images aren't loaded)
const COLLECTIBLE_FALLBACK_HEIGHT = 40;
const COLLECTIBLE_FALLBACK_WIDTH = 40;
const COLLECTIBLE_X_OFFSET = 30;

const ENEMY_FALLBACK_HEIGHT = 60;
const ENEMY_X_OFFSET = 20;

const BOSS_FALLBACK_WIDTH = 180;
const BOSS_FALLBACK_HEIGHT = 120;

const PLAYER_FALLBACK_WIDTH = 55;
const PLAYER_FALLBACK_HEIGHT = 100;

const PROJECTILE_FALLBACK_SIZE = 6;

/**
 * Calculate dynamic sprite dimensions based on image aspect ratio
 * @param {HTMLImageElement} image - The image element
 * @param {number} baseHeight - Base height for calculation
 * @param {number} centerWidth - Width for centering calculation
 * @returns {Object} - {width, height, centerOffset}
 */
function calculateSpriteDimensions(image, baseHeight, centerWidth) {
  if (!image || !image.complete || image.naturalWidth <= 0) {
    return {
      width: centerWidth,
      height: baseHeight,
      centerOffset: 0
    };
  }
  
  const aspectRatio = image.naturalWidth / image.naturalHeight;
  const width = baseHeight * aspectRatio;
  const centerOffset = (centerWidth - width) / 2;
  
  return {
    width,
    height: baseHeight,
    centerOffset
  };
}

/**
 * Get collectible sprite dimensions (dynamic based on image)
 * @param {HTMLImageElement} image - The collectible image
 * @param {number} targetHeight - Desired height for the sprite
 * @returns {Object} - {width, height, centerOffset}
 */
function getCollectibleDimensions(image, targetHeight = COLLECTIBLE_FALLBACK_HEIGHT) {
  if (!image || !image.complete || image.naturalWidth <= 0) {
    return {
      width: COLLECTIBLE_FALLBACK_WIDTH,
      height: COLLECTIBLE_FALLBACK_HEIGHT,
      centerOffset: 0
    };
  }
  
  const aspectRatio = image.naturalWidth / image.naturalHeight;
  const width = targetHeight * aspectRatio;
  const centerOffset = (COLLECTIBLE_FALLBACK_WIDTH - width) / 2;
  
  return {
    width,
    height: targetHeight,
    centerOffset
  };
}

/**
 * Get enemy sprite dimensions (dynamic based on image)
 * @param {HTMLImageElement} image - The enemy image
 * @param {number} targetHeight - Desired height for the sprite
 * @returns {Object} - {width, height, centerOffset}
 */
function getEnemyDimensions(image, targetHeight = ENEMY_FALLBACK_HEIGHT) {
  if (!image || !image.complete || image.naturalWidth <= 0) {
    return {
      width: ENEMY_FALLBACK_HEIGHT,
      height: ENEMY_FALLBACK_HEIGHT,
      centerOffset: 0
    };
  }
  
  const aspectRatio = image.naturalWidth / image.naturalHeight;
  const width = targetHeight * aspectRatio;
  const centerOffset = (ENEMY_FALLBACK_HEIGHT - width) / 2;
  
  return {
    width,
    height: targetHeight,
    centerOffset
  };
}

/**
 * Get boss sprite dimensions (dynamic based on image)
 * @param {HTMLImageElement} image - The boss image
 * @param {number} containerWidth - Boss container width
 * @param {number} containerHeight - Boss container height
 * @returns {Object} - {width, height, centerOffset}
 */
function getBossDimensions(image, containerWidth, containerHeight) {
  if (!image || !image.complete || image.naturalWidth <= 0) {
    return {
      width: containerWidth,
      height: containerHeight,
      centerOffset: 0
    };
  }
  
  const aspectRatio = image.naturalWidth / image.naturalHeight;
  const width = containerHeight * aspectRatio;
  const centerOffset = (containerWidth - width) / 2;
  
  return {
    width,
    height: containerHeight,
    centerOffset
  };
}

/**
 * Get projectile sprite dimensions (dynamic based on image)
 * @param {HTMLImageElement} image - The projectile image
 * @param {number} targetSize - Desired size for the projectile
 * @returns {Object} - {width, height}
 */
function getProjectileDimensions(image, targetSize = PROJECTILE_FALLBACK_SIZE) {
  if (!image || !image.complete || image.naturalWidth <= 0) {
    return {
      width: targetSize,
      height: targetSize
    };
  }
  
  const aspectRatio = image.naturalHeight / image.naturalWidth;
  const height = targetSize * aspectRatio;
  
  return {
    width: targetSize,
    height
  };
}

/**
 * Get player sprite dimensions (dynamic based on image)
 * @param {HTMLImageElement} image - The player image
 * @param {number} containerWidth - Player container width
 * @param {number} containerHeight - Player container height
 * @returns {Object} - {width, height, centerOffset}
 */
function getPlayerDimensions(image, containerWidth, containerHeight) {
  if (!image || !image.complete || image.naturalWidth <= 0) {
    return {
      width: containerWidth,
      height: containerHeight,
      centerOffset: 0
    };
  }
  
  const aspectRatio = image.naturalWidth / image.naturalHeight;
  const width = containerHeight * aspectRatio;
  const centerOffset = (containerWidth - width) / 2;
  
  return {
    width,
    height: containerHeight,
    centerOffset
  };
}

// Export constants and functions
window.COLLECTIBLE_FALLBACK_HEIGHT = COLLECTIBLE_FALLBACK_HEIGHT;
window.COLLECTIBLE_FALLBACK_WIDTH = COLLECTIBLE_FALLBACK_WIDTH;
window.COLLECTIBLE_X_OFFSET = COLLECTIBLE_X_OFFSET;
window.ENEMY_FALLBACK_HEIGHT = ENEMY_FALLBACK_HEIGHT;
window.ENEMY_X_OFFSET = ENEMY_X_OFFSET;
window.BOSS_FALLBACK_WIDTH = BOSS_FALLBACK_WIDTH;
window.BOSS_FALLBACK_HEIGHT = BOSS_FALLBACK_HEIGHT;
window.PLAYER_FALLBACK_WIDTH = PLAYER_FALLBACK_WIDTH;
window.PLAYER_FALLBACK_HEIGHT = PLAYER_FALLBACK_HEIGHT;
window.PROJECTILE_FALLBACK_SIZE = PROJECTILE_FALLBACK_SIZE;
window.getCollectibleDimensions = getCollectibleDimensions;
window.getEnemyDimensions = getEnemyDimensions;
window.getBossDimensions = getBossDimensions;
window.getProjectileDimensions = getProjectileDimensions;
window.getPlayerDimensions = getPlayerDimensions;
