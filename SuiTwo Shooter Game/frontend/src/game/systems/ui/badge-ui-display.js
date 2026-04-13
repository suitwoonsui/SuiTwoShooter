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
 * Pending upgrade from GET /badges/:addr?includePendingUpgrade=1 (no extra network).
 * @param {Object} badgeData
 * @param {Object} badge
 * @param {string|null} walletAddress
 * @returns {{ hasPendingUpgrade: boolean, upgradeData: Object|null }}
 */
function getUpgradeStateFromEmbedded(badgeData, badge, walletAddress) {
  const emb = badgeData && badgeData.pendingUpgrade;
  if (!emb || typeof emb !== 'object' || typeof emb.success !== 'boolean' || !badge || !walletAddress) {
    return { hasPendingUpgrade: false, upgradeData: null };
  }
  if (emb.success && emb.hasPendingUpgrade && emb.badgeId) {
    const oldTier = badge.tier;
    const newTier = emb.newTier != null ? emb.newTier : oldTier + 1;
    const newTierName = window.BadgeService ? window.BadgeService.getTierName(newTier) : 'Unknown';
    return {
      hasPendingUpgrade: true,
      upgradeData: {
        oldTier,
        newTier,
        newTierName,
        badgeId: emb.badgeId,
        sessionId: `upgrade_${walletAddress}_${Date.now()}`,
      },
    };
  }
  return { hasPendingUpgrade: false, upgradeData: null };
}

function attachBadgeUpgradeClick(container, upgradeData, walletAddress) {
  const badgeContainer = container.querySelector('.badge-display-container');
  if (!badgeContainer || !upgradeData) return;
  badgeContainer.style.cursor = 'pointer';
  badgeContainer.addEventListener('click', async () => {
    log.debug('BADGE UI DISPLAY', 'Badge display clicked for upgrade', upgradeData);
    if (window.BadgeUI && window.BadgeUI.showTierUpgradeModal) {
      window.BadgeUI.showTierUpgradeModal({
        oldTier: upgradeData.oldTier,
        newTier: upgradeData.newTier,
        newTierName: upgradeData.newTierName,
        badgeId: upgradeData.badgeId,
        sessionId: upgradeData.sessionId,
        onUpgradeComplete: async (upgraded) => {
          if (upgraded) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
          if (walletAddress && typeof window.loadMenuBadgeDisplay === 'function') {
            await window.loadMenuBadgeDisplay(walletAddress);
          } else if (walletAddress && typeof GameDataFlow !== 'undefined' && GameDataFlow.load) {
            await GameDataFlow.load(walletAddress, { skipBalance: true });
          }
        },
      });
    }
  });
}

/**
 * Display badge in UI (for store, menu, etc.)
 * Paints image immediately; games count and (if needed) upgrade check run right after without blocking paint.
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
  const discounts = badge && badge.discounts && typeof badge.discounts === 'object' ? badge.discounts : { store: 0, gameplay: 0 };
  
  // Get wallet address if not provided
  if (!walletAddress) {
    if (window.walletAPIInstance && window.walletAPIInstance.isConnected()) {
      walletAddress = window.walletAPIInstance.getAddress();
    } else if (typeof GameDataState !== 'undefined' && GameDataState.walletAddress) {
      walletAddress = GameDataState.walletAddress;
    }
  }

  let { hasPendingUpgrade, upgradeData } = getUpgradeStateFromEmbedded(badgeData, badge, walletAddress);

  // Get image source using utility function
  const imageSrc = typeof window.getBadgeImageSource === 'function'
    ? window.getBadgeImageSource(badge)
    : null;

  // Construct fallback URL from tier in case image fails to load
  const fallbackUrl = typeof window.constructBadgeImageUrl === 'function'
    ? window.constructBadgeImageUrl(badge.tier)
    : null;
  
  // Create image HTML with upgrade overlay if available
  let imageHTML = '';
  if (imageSrc) {
    const imgTag = `<img src="${imageSrc}" alt="Badge" class="badge-display-image" onerror="this.onerror=null; this.src='${fallbackUrl}';" />`;
    imageHTML = typeof window.wrapBadgeImageWithUpgrade === 'function'
      ? window.wrapBadgeImageWithUpgrade(imgTag, hasPendingUpgrade, 'badge-image-wrapper', 'badge-display-image')
      : `<div class="badge-image-wrapper">${imgTag}</div>`;
  } else {
    imageHTML = `<div class="badge-image-wrapper"><div class="badge-display-placeholder">🎖️</div></div>`;
  }
  
  const gamesPlaceholder = '…';
  const upgradeTitle = hasPendingUpgrade && upgradeData ? ` title="Click to upgrade your badge to ${upgradeData.newTierName}"` : '';
  const badgeHTML = `
    <div class="badge-display-container ${hasPendingUpgrade ? 'badge-has-upgrade badge-clickable' : ''}"${upgradeTitle}>
      <div class="badge-display-header">
        <h3>🎖️ Your Badge</h3>
      </div>
      <div class="badge-display-content">
        ${imageHTML}
        <div class="badge-display-info">
          <p class="badge-display-tier"><strong>${tierName}</strong></p>
          <p class="badge-display-games">Games: ${gamesPlaceholder}</p>
          ${typeof discounts.store === 'number' && discounts.store > 0 ? `<p class="badge-display-discount">Store: ${discounts.store}% off</p>` : ''}
          ${typeof discounts.gameplay === 'number' && discounts.gameplay > 0 ? `<p class="badge-display-discount">Gameplay: ${discounts.gameplay}% off</p>` : ''}
        </div>
      </div>
    </div>
  `;

  container.innerHTML = badgeHTML;

  if (hasPendingUpgrade && upgradeData) {
    attachBadgeUpgradeClick(container, upgradeData, walletAddress);
  }

  void (async () => {
    let totalGames = 0;
    if (typeof window.fetchRegistryGames === 'function' && walletAddress) {
      try {
        totalGames = await window.fetchRegistryGames(walletAddress);
      } catch (error) {
        log.warn('BADGE UI DISPLAY', 'Error fetching registry games', error);
      }
    }
    const gamesEl = container.querySelector('.badge-display-games');
    if (gamesEl) {
      gamesEl.textContent = `Games: ${totalGames}`;
    }
  })();
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

