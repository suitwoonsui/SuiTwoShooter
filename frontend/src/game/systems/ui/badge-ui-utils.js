// ==========================================
// BADGE UI UTILS - Utility Functions
// ==========================================

// Use FrontendLogger if available, fallback to console
// Use var to allow redeclaration when multiple scripts are loaded
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

log.info('BADGE UI UTILS', 'Badge UI utils module loaded');

/**
 * Convert array buffer to base64
 * @param {ArrayBuffer|Uint8Array|Array} buffer - Buffer to convert
 * @returns {string} Base64 string
 */
function arrayBufferToBase64(buffer) {
  if (Array.isArray(buffer)) {
    // Convert array to Uint8Array
    const bytes = new Uint8Array(buffer);
    const binary = String.fromCharCode.apply(null, bytes);
    return btoa(binary);
  }
  // Already Uint8Array
  const binary = String.fromCharCode.apply(null, buffer);
  return btoa(binary);
}

// NOTE: do not define `fetchRegistryGames` here.
// Canonical implementation is `window.StatsService.fetchRegistryGames` (see `stats-service.js`).

/**
 * Construct badge image URL from tier
 * @param {number} tier - Badge tier
 * @returns {string} Image URL
 */
function constructBadgeImageUrl(tier) {
  const tierNames = ['Standard', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
  const tierName = tierNames[tier] || 'Standard';
  // Badge images are served from the frontend origin (same app)
  const badgeBase = window.GAME_CONFIG?.BADGE_IMAGE_BASE_URL || (typeof window !== 'undefined' && window.location?.origin) || '';
  const baseUrl = badgeBase.replace(/\/api\/?$/, '');
  return baseUrl ? `${baseUrl}/Badges/${tierName}.webp` : '';
}

/**
 * Get badge image source from badge data
 * @param {Object} badge - Badge object
 * @returns {string|null} Image source URL or data URI
 */
function getBadgeImageSource(badge) {
  // First, try to use imageUrl from badge
  if (badge.imageUrl && typeof badge.imageUrl === 'string' && 
      (badge.imageUrl.startsWith('http://') || badge.imageUrl.startsWith('https://'))) {
    return badge.imageUrl;
  }
  
  // Fallback 1: Construct URL from tier
  const constructedUrl = constructBadgeImageUrl(badge.tier);
  
  // Fallback 2: If we have imageData, use it as base64
  if (badge.imageData && badge.imageData.length > 0) {
    return `data:image/webp;base64,${arrayBufferToBase64(badge.imageData)}`;
  }
  
  return constructedUrl;
}

/**
 * Wrap badge image with upgrade overlay if upgrade is available
 * Universal function for all badge image displays
 * @param {string} imageHTML - HTML for the badge image
 * @param {boolean} hasUpgrade - Whether an upgrade is available
 * @param {string} containerClass - CSS class for the image container (e.g., 'badge-image-wrapper', 'store-badge-image-container')
 * @param {string} imageClass - CSS class for the image element (e.g., 'badge-display-image', 'store-badge-icon-image')
 * @returns {string} HTML with image wrapped in container with upgrade overlay
 */
function wrapBadgeImageWithUpgrade(imageHTML, hasUpgrade, containerClass = 'badge-image-wrapper', imageClass = 'badge-display-image') {
  if (!imageHTML) {
    return imageHTML;
  }
  
  // Create upgrade overlay HTML if upgrade is available
  const upgradeOverlayHTML = hasUpgrade
    ? `<div class="badge-upgrade-overlay">
        <span class="badge-upgrade-overlay-text">Upgrade</span>
      </div>`
    : '';
  
  // Wrap image in container with upgrade overlay
  return `<div class="${containerClass}">
    ${imageHTML}
    ${upgradeOverlayHTML}
  </div>`;
}

// Expose globally
if (typeof window !== 'undefined') {
  window.arrayBufferToBase64 = arrayBufferToBase64;
  window.constructBadgeImageUrl = constructBadgeImageUrl;
  window.getBadgeImageSource = getBadgeImageSource;
  window.wrapBadgeImageWithUpgrade = wrapBadgeImageWithUpgrade;
  
  // Also expose via BadgeUI for backward compatibility
  if (!window.BadgeUI) {
    window.BadgeUI = {};
  }
  window.BadgeUI.arrayBufferToBase64 = arrayBufferToBase64;
  window.BadgeUI.wrapBadgeImageWithUpgrade = wrapBadgeImageWithUpgrade;
}

