// ==========================================
// BADGE UI DISPLAY - Badge Display Rendering
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

log.info('BADGE UI DISPLAY', 'Badge UI display module loaded');

/**
 * Display badge in UI (for store, menu, etc.)
 * @param {HTMLElement} container - Container element to display badge in
 * @param {Object} badgeData - Badge data from API
 * @param {string} walletAddress - Optional wallet address for fetching registry games
 */
async function displayBadgeInUI(container, badgeData, walletAddress = null) {
  if (!badgeData || !badgeData.hasBadge) {
    return;
  }

  const { badge } = badgeData;
  const tierName = window.BadgeService ? window.BadgeService.getTierName(badge.tier) : 'Unknown';
  const discounts = window.BadgeService ? window.BadgeService.getDiscountsForTier(badge.tier) : { store: 0, gameplay: 0 };
  
  // Get wallet address if not provided
  if (!walletAddress) {
    if (window.walletAPIInstance && window.walletAPIInstance.isConnected()) {
      walletAddress = window.walletAPIInstance.getAddress();
    } else if (typeof GameDataState !== 'undefined' && GameDataState.walletAddress) {
      walletAddress = GameDataState.walletAddress;
    }
  }
  
  // Fetch total games from registry (source of truth)
  const totalGames = typeof window.fetchRegistryGames === 'function' 
    ? await window.fetchRegistryGames(walletAddress)
    : 0;

  // Get image source using utility function
  const imageSrc = typeof window.getBadgeImageSource === 'function'
    ? window.getBadgeImageSource(badge)
    : null;

  // Construct fallback URL from tier in case image fails to load
  const fallbackUrl = typeof window.constructBadgeImageUrl === 'function'
    ? window.constructBadgeImageUrl(badge.tier)
    : null;
  
  const badgeHTML = `
    <div class="badge-display-container">
      <div class="badge-display-header">
        <h3>🎖️ Your Badge</h3>
      </div>
      <div class="badge-display-content">
        ${imageSrc 
          ? `<img src="${imageSrc}" alt="Badge" class="badge-display-image" onerror="this.onerror=null; this.src='${fallbackUrl}';" />`
          : `<div class="badge-display-placeholder">🎖️</div>`
        }
        <div class="badge-display-info">
          <p class="badge-display-tier"><strong>${tierName}</strong></p>
          <p class="badge-display-games">Games: ${totalGames}</p>
          ${discounts.store > 0 ? `<p class="badge-display-discount">Store: ${discounts.store}% off</p>` : ''}
          ${discounts.gameplay > 0 ? `<p class="badge-display-discount">Gameplay: ${discounts.gameplay}% off</p>` : ''}
        </div>
      </div>
    </div>
  `;

  container.innerHTML = badgeHTML;
}

// Expose globally
if (typeof window !== 'undefined') {
  window.displayBadgeInUI = displayBadgeInUI;
  
  // Also expose via BadgeUI for backward compatibility
  if (!window.BadgeUI) {
    window.BadgeUI = {};
  }
  window.BadgeUI.displayBadgeInUI = displayBadgeInUI;
}

