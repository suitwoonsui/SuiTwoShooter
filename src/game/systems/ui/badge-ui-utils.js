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

/**
 * Fetch total games from statistics registry
 * @param {string} walletAddress - Wallet address
 * @returns {Promise<number>} Total games from registry
 */
async function fetchRegistryGames(walletAddress) {
  if (!walletAddress) {
    return 0;
  }
  
  try {
    const API_BASE_URL = window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3000/api';
    const response = await fetch(`${API_BASE_URL}/stats/${walletAddress}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.hasStats) {
        return data.totalGames || 0;
      }
    }
  } catch (error) {
    log.warn('BADGE UI UTILS', 'Error fetching registry games', error);
  }
  
  return 0;
}

/**
 * Construct badge image URL from tier
 * @param {number} tier - Badge tier
 * @returns {string} Image URL
 */
function constructBadgeImageUrl(tier) {
  const tierNames = ['Standard', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
  const tierName = tierNames[tier] || 'Standard';
  const apiBaseUrl = window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3000/api';
  const baseUrl = apiBaseUrl.replace(/\/api$/, '');
  return `${baseUrl}/Badges/${tierName}.webp`;
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

// Expose globally
if (typeof window !== 'undefined') {
  window.arrayBufferToBase64 = arrayBufferToBase64;
  window.fetchRegistryGames = fetchRegistryGames;
  window.constructBadgeImageUrl = constructBadgeImageUrl;
  window.getBadgeImageSource = getBadgeImageSource;
  
  // Also expose via BadgeUI for backward compatibility
  if (!window.BadgeUI) {
    window.BadgeUI = {};
  }
  window.BadgeUI.arrayBufferToBase64 = arrayBufferToBase64;
}

