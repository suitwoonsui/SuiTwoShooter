// ==========================================
// GAME DATA FLOW BADGE - Badge Handling and Display
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

/**
 * Handle pending badge upgrade (modal). Runs only when {@link flowOptions.checkBadgeUpgrade} is true
 * (wallet login or return to main menu after a game). Does not run on routine menu refreshes.
 * @param {string} walletAddress - Wallet address
 * @param {Object} badgeData - Current badge data
 * @param {{ checkBadgeUpgrade?: boolean }} [flowOptions]
 * @returns {Promise<boolean>} - True if upgrade modal was shown
 */
async function handlePendingUpgrade(walletAddress, badgeData, flowOptions = {}) {
  // Skip upgrade check if flag is set (user just dismissed upgrade)
  if (GameDataState.shouldSkipUpgradeCheck()) {
    log.debug('FLOW BADGE', 'Skipping upgrade check - user dismissed upgrade');
    GameDataState.setSkipUpgradeCheck(false); // Reset flag after use
    return false;
  }

  if (!flowOptions.checkBadgeUpgrade) {
    return false;
  }
  
  try {
    let upgradeCheck = null;
    const embedded = badgeData && badgeData.pendingUpgrade;
    if (embedded && typeof embedded === 'object' && typeof embedded.success === 'boolean') {
      upgradeCheck = embedded;
    } else if (badgeData && badgeData.hasBadge && window.BadgeService?.checkPendingUpgrade) {
      // Fallback only when embedded pendingUpgrade is missing (e.g. stale client path). No badge → no tier upgrade to check.
      LoadingManager.update('Checking for badge upgrade... Please wait');
      upgradeCheck = await window.BadgeService.checkPendingUpgrade(walletAddress);
    } else {
      return false;
    }
    
    if (upgradeCheck.success && upgradeCheck.hasPendingUpgrade && upgradeCheck.badgeId) {
      log.debug('FLOW BADGE', 'Pending badge upgrade detected');
      
      LoadingManager.hide();
      
      const oldTier = badgeData.badge.tier;
      const newTier = upgradeCheck.newTier || oldTier + 1;
      const newTierName = window.BadgeService.getTierName(newTier);
      const sessionId = `upgrade_${walletAddress}_${Date.now()}`;
      
      if (window.BadgeUI?.showTierUpgradeModal) {
        if (typeof GameDataState !== 'undefined' && GameDataState.walletAddress === walletAddress) {
          GameDataState.setBadge({ ...badgeData, pendingUpgrade: upgradeCheck });
        }
        window.BadgeUI.showTierUpgradeModal({
          oldTier,
          newTier,
          newTierName,
          badgeId: upgradeCheck.badgeId,
          sessionId: sessionId,
        });
        return true;
      }
    }
  } catch (error) {
    log.error('FLOW BADGE', 'Error checking pending upgrade', error);
  }
  
  return false; // No upgrade needed
}

/**
 * Handle case when player has no badge.
 * Fetches registry games here so the mint CTA is correct on initial load: stats and badge load in
 * parallel, so badge may finish first with hasBadge:false before menu stats exist.
 * @param {string} walletAddress - Wallet address
 * @returns {Promise<{ autoShowMintModal: boolean }>}
 */
async function handleNoBadge(walletAddress) {
  GameDataState.markDataLoaded();

  let totalGames = 0;
  if (walletAddress && typeof window.fetchRegistryGames === 'function') {
    try {
      totalGames = await window.fetchRegistryGames(walletAddress);
    } catch (error) {
      log.warn('FLOW BADGE', 'fetchRegistryGames in handleNoBadge failed', error);
    }
  }

  const canMint =
    totalGames >= 1 && typeof window.showBadgeMintingModal === 'function';

  console.warn('⚠️ [FLOW BADGE] handleNoBadge: computed mint eligibility', {
    walletAddressPrefix: walletAddress ? String(walletAddress).slice(0, 10) : null,
    totalGames,
    canMint,
    hasShowBadgeMintingModal: typeof window.showBadgeMintingModal === 'function',
  });

  const badgeDisplay = document.getElementById('menuBadgeDisplay');
  if (!badgeDisplay) {
    GameDataState.setBadge(null);
    GameDataState.setBadgeDisplayVisible(false);
    if (walletAddress) GameDataState.lastLoadedAddress = walletAddress;
    return { autoShowMintModal: Boolean(canMint) };
  }

  if (canMint) {
    badgeDisplay.innerHTML = `
      <div class="menu-badge-info menu-badge-mint-offer badge-clickable" role="button" tabindex="0" title="Mint your Standard badge">
        <h3>🎖️ Mint badge</h3>
        <div class="menu-badge-details">
          <p class="menu-badge-mint-hint">Click to mint your soulbound badge</p>
        </div>
      </div>
    `;
    badgeDisplay.style.display = 'block';
    void badgeDisplay.offsetHeight;
    GameDataState.setBadge(null);
    GameDataState.setBadgeDisplayVisible(true);
    const offer = badgeDisplay.querySelector('.menu-badge-mint-offer');
    const openMint = () => {
      void window.showBadgeMintingModal();
    };
    if (offer) {
      offer.addEventListener('click', openMint);
      offer.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          openMint();
        }
      });
    }
    if (walletAddress) {
      GameDataState.lastLoadedAddress = walletAddress;
    }
    return { autoShowMintModal: true };
  }

  badgeDisplay.style.display = 'none';
  badgeDisplay.innerHTML = '';
  GameDataState.setBadge(null);
  GameDataState.setBadgeDisplayVisible(false);

  if (walletAddress) {
    GameDataState.lastLoadedAddress = walletAddress;
  }
  return { autoShowMintModal: false };
}

/**
 * Display badge in UI
 * @param {Object} badgeData - Badge data from BadgeService
 * @param {{ forceRefreshStats?: boolean }} [options] - Passed through to badge renderers (reserved).
 */
async function displayBadge(badgeData, options = {}) {
  const badgeDisplay = document.getElementById('menuBadgeDisplay');
  if (!badgeDisplay) {
    log.warn('FLOW BADGE', 'Badge display container not found');
    return;
  }

  console.log('🧩 [FLOW BADGE] Rendering badge into #menuBadgeDisplay', {
    hasBadge: Boolean(badgeData && badgeData.hasBadge),
    success: Boolean(badgeData && badgeData.success),
    badgeIdPrefix: badgeData && badgeData.badge && badgeData.badge.badgeId ? String(badgeData.badge.badgeId).slice(0, 12) + '…' : null,
    tier: badgeData && badgeData.badge && typeof badgeData.badge.tier === 'number' ? badgeData.badge.tier : null,
    prevInnerLen: typeof badgeDisplay.innerHTML === 'string' ? badgeDisplay.innerHTML.length : null,
  });
  
  const walletAddress = GameDataState.walletAddress || (window.walletAPIInstance?.isConnected() ? window.walletAPIInstance.getAddress() : null);
  
  // Use BadgeUI.displayBadgeInUI if available, but never let a render failure hide the badge entirely.
  try {
    if (window.BadgeUI?.displayBadgeInUI) {
      await window.BadgeUI.displayBadgeInUI(badgeDisplay, badgeData, walletAddress, options);
    } else {
      await createBadgeDisplay(badgeDisplay, badgeData, options);
    }
  } catch (e) {
    // Always surface this, even if FrontendLogger is filtering categories.
    console.error('❌ [FLOW BADGE] displayBadge failed; falling back to createBadgeDisplay', e);
    try {
      await createBadgeDisplay(badgeDisplay, badgeData, options);
    } catch (e2) {
      console.error('❌ [FLOW BADGE] createBadgeDisplay fallback also failed', e2);
      return;
    }
  }

  badgeDisplay.style.display = 'block';
  void badgeDisplay.offsetHeight; // Force reflow

  console.log('✅ [FLOW BADGE] Badge rendered in main menu', {
    display: badgeDisplay.style.display,
    innerLen: typeof badgeDisplay.innerHTML === 'string' ? badgeDisplay.innerHTML.length : null,
  });
  
  GameDataState.setBadgeDisplayVisible(true);
  log.debug('FLOW BADGE', 'Badge displayed');
}

/**
 * Create badge display HTML (fallback)
 * @param {HTMLElement} badgeDisplay - Badge display container
 * @param {Object} badgeData - Badge data
 * @param {{ forceRefreshStats?: boolean }} [options] - Reserved for API compatibility with displayBadge.
 */
async function createBadgeDisplay(badgeDisplay, badgeData, options = {}) {
  void options;
  const { badge } = badgeData;
  const tierName = window.BadgeService.getTierName(badge.tier);
  const discounts = badge && badge.discounts && typeof badge.discounts === 'object' ? badge.discounts : { store: 0, gameplay: 0 };
  
  // Get image source
  let imageSrc = null;
  if (badge.imageUrl && (badge.imageUrl.startsWith('http://') || badge.imageUrl.startsWith('https://'))) {
    imageSrc = badge.imageUrl;
  } else {
    const tierNames = ['Standard', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
    const tierNameForUrl = tierNames[badge.tier] || 'Standard';
    // Badge images are served from the frontend origin (same app)
    const badgeBase = window.GAME_CONFIG?.BADGE_IMAGE_BASE_URL || (typeof window !== 'undefined' && window.location?.origin) || '';
    const baseUrl = badgeBase.replace(/\/api\/?$/, '');
    imageSrc = baseUrl ? `${baseUrl}/Badges/${tierNameForUrl}.webp` : null;
  }
  
  const fallbackUrl = imageSrc;

  const walletAddress = GameDataState.walletAddress || (window.walletAPIInstance?.isConnected() ? window.walletAPIInstance.getAddress() : null);
  const emb = badgeData.pendingUpgrade;
  const hasEmbeddedPending = emb && typeof emb === 'object' && typeof emb.success === 'boolean';

  let hasPendingUpgrade = false;
  let upgradeData = null;
  if (hasEmbeddedPending && emb.success && emb.hasPendingUpgrade && emb.badgeId && walletAddress) {
    hasPendingUpgrade = true;
    const oldTier = badge.tier;
    const newTier = emb.newTier != null ? emb.newTier : oldTier + 1;
    const newTierName = window.BadgeService.getTierName(newTier);
    upgradeData = {
      oldTier,
      newTier,
      newTierName,
      badgeId: emb.badgeId,
      sessionId: `upgrade_${walletAddress}_${Date.now()}`,
    };
  }

  const badgeHTML = `
    <div class="menu-badge-info ${hasPendingUpgrade ? 'badge-has-upgrade badge-clickable' : ''}" ${hasPendingUpgrade ? `title="Click to upgrade your badge to ${upgradeData.newTierName}"` : ''}>
      <h3>🎖️ Your ${tierName} Badge</h3>
      ${(() => {
        if (!imageSrc) {
          return '<div class="menu-badge-image-wrapper"><div class="menu-badge-placeholder">🎖️</div></div>';
        }
        const imgTag = `<img src="${imageSrc}" alt="Badge" class="menu-badge-image" onerror="this.onerror=null; this.src='${fallbackUrl}';" />`;
        return typeof window.wrapBadgeImageWithUpgrade === 'function'
          ? window.wrapBadgeImageWithUpgrade(imgTag, hasPendingUpgrade, 'menu-badge-image-wrapper', 'menu-badge-image')
          : `<div class="menu-badge-image-wrapper">${imgTag}</div>`;
      })()}
      <div class="menu-badge-details">
        ${discounts.store > 0 ? `<p>Store: ${discounts.store}% off</p>` : ''}
        ${discounts.gameplay > 0 ? `<p>Gameplay: ${discounts.gameplay}% off</p>` : ''}
      </div>
    </div>
  `;
  
  badgeDisplay.innerHTML = badgeHTML;
  badgeDisplay.style.display = 'block';
  void badgeDisplay.offsetHeight; // Force reflow

  if (hasPendingUpgrade && upgradeData) {
    const badgeContainer = badgeDisplay.querySelector('.menu-badge-info');
    if (badgeContainer) {
      badgeContainer.style.cursor = 'pointer';
      badgeContainer.addEventListener('click', async () => {
        log.debug('FLOW BADGE', 'Badge display clicked for upgrade', upgradeData);
        if (window.BadgeUI && window.BadgeUI.showTierUpgradeModal) {
          window.BadgeUI.showTierUpgradeModal({
            oldTier: upgradeData.oldTier,
            newTier: upgradeData.newTier,
            newTierName: upgradeData.newTierName,
            badgeId: upgradeData.badgeId,
            sessionId: upgradeData.sessionId,
            onUpgradeComplete: async (upgraded) => {
              if (upgraded) {
                await new Promise(resolve => setTimeout(resolve, 500));
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
  }
}

/**
 * Show badge display (if already loaded)
 */
function showBadgeDisplay() {
  const badgeDisplay = document.getElementById('menuBadgeDisplay');
  if (badgeDisplay && badgeDisplay.innerHTML.trim() !== '') {
    badgeDisplay.style.display = 'block';
    GameDataState.setBadgeDisplayVisible(true);
  }
}

// Expose globally
if (typeof window !== 'undefined') {
  window.handlePendingUpgrade = handlePendingUpgrade;
  window.handleNoBadge = handleNoBadge;
  window.displayBadge = displayBadge;
  window.createBadgeDisplay = createBadgeDisplay;
  window.showBadgeDisplay = showBadgeDisplay;
}

