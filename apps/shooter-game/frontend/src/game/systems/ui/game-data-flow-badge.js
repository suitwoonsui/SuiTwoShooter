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
 * Handle pending badge upgrade
 * @param {string} walletAddress - Wallet address
 * @param {Object} badgeData - Current badge data
 * @returns {Promise<boolean>} - True if upgrade modal was shown
 */
async function handlePendingUpgrade(walletAddress, badgeData) {
  // Skip upgrade check if flag is set (user just dismissed upgrade)
  if (GameDataState.shouldSkipUpgradeCheck()) {
    log.debug('FLOW BADGE', 'Skipping upgrade check - user dismissed upgrade');
    GameDataState.setSkipUpgradeCheck(false); // Reset flag after use
    return false;
  }
  
  if (!window.BadgeService?.checkPendingUpgrade) {
    return false;
  }
  
  try {
    // Update loading message during upgrade check (data loading operation)
    LoadingManager.update('Checking for badge upgrade... Please wait');
    
    // This is a data loading operation - loading modal should be visible
    const upgradeCheck = await window.BadgeService.checkPendingUpgrade(walletAddress);
    
    if (upgradeCheck.success && upgradeCheck.hasPendingUpgrade && upgradeCheck.badgeId) {
      log.debug('FLOW BADGE', 'Pending badge upgrade detected');
      
      LoadingManager.hide();
      
      const oldTier = badgeData.badge.tier;
      const newTier = upgradeCheck.newTier || oldTier + 1;
      const newTierName = window.BadgeService.getTierName(newTier);
      const sessionId = `upgrade_${walletAddress}_${Date.now()}`;
      
      // Show upgrade modal
      if (window.BadgeUI?.showTierUpgradeModal) {
        window.BadgeUI.showTierUpgradeModal({
          oldTier,
          newTier,
          newTierName,
          badgeId: upgradeCheck.badgeId,
          sessionId: sessionId,
        });
        return true; // Upgrade modal shown
      }
    }
  } catch (error) {
    log.error('FLOW BADGE', 'Error checking pending upgrade', error);
  }
  
  return false; // No upgrade needed
}

/**
 * Handle case when player has no badge (check for migration)
 * @param {string} walletAddress - Wallet address
 */
async function handleNoBadge(walletAddress) {
  // Mark data as loaded first
  GameDataState.dataLoaded = true;
  
  // Check if we should check for migration
  const recentMintTime = window.BadgeService?._lastMintTime || 0;
  const timeSinceMint = Date.now() - recentMintTime;
  const shouldCheckMigration = timeSinceMint > 10000; // Wait 10 seconds after mint
  
  if (!shouldCheckMigration) {
    log.debug('FLOW BADGE', 'Recent badge mint detected, skipping migration check');
    GameDataState.markDataLoaded(); // Use markDataLoaded to set all flags properly
    // Clear badge display (no badge)
    const badgeDisplay = document.getElementById('menuBadgeDisplay');
    if (badgeDisplay) {
      badgeDisplay.style.display = 'none';
      badgeDisplay.innerHTML = ''; // Clear any old badge HTML
    }
    GameDataState.setBadge(null);
    GameDataState.setBadgeDisplayVisible(false);
    return;
  }
  
  if (!window.BadgeService?.checkBadgeMigration) {
    GameDataState.markDataLoaded(); // Use markDataLoaded to set all flags properly
    // Clear badge display (no badge)
    const badgeDisplay = document.getElementById('menuBadgeDisplay');
    if (badgeDisplay) {
      badgeDisplay.style.display = 'none';
      badgeDisplay.innerHTML = ''; // Clear any old badge HTML
    }
    GameDataState.setBadge(null);
    GameDataState.setBadgeDisplayVisible(false);
    return;
  }
  
  // Perform migration check (skip if user already dismissed migration modal)
  if (GameDataState.migrationCheckComplete && GameDataState.migrationModalClosed) {
    log.debug('FLOW BADGE', 'Migration check already completed and dismissed - skipping');
    GameDataState.markDataLoaded(); // Use markDataLoaded to set all flags properly
    // Clear badge display (no badge)
    const badgeDisplay = document.getElementById('menuBadgeDisplay');
    if (badgeDisplay) {
      badgeDisplay.style.display = 'none';
      badgeDisplay.innerHTML = ''; // Clear any old badge HTML
    }
    GameDataState.setBadge(null);
    GameDataState.setBadgeDisplayVisible(false);
    return;
  }
  
  try {
    LoadingManager.update('Checking for badge migration... Please wait');
    
    const migrationCheckPromise = window.BadgeService.checkBadgeMigration(walletAddress);
    const timeoutPromise = new Promise((_, reject) => 
      // Optimized: 10000ms → 8000ms (still safe timeout, but faster failure detection)
      setTimeout(() => reject(new Error('Migration check timeout')), 8000)
    );
    
    const migrationCheck = await Promise.race([migrationCheckPromise, timeoutPromise]);
    
    GameDataState.migrationCheckComplete = true;
    
    if (migrationCheck.success && migrationCheck.needsMigration && migrationCheck.migrationData) {
      // Player needs to migrate
      log.debug('FLOW BADGE', 'Player needs to migrate badge');
      
      LoadingManager.hide();
      GameDataState.migrationModalClosed = false;
      
      // Show migration modal
      if (window.BadgeUI?.showBadgeMigrationModal) {
        let imageData = migrationCheck.migrationData.imageData;
        if (Array.isArray(imageData)) {
          imageData = new Uint8Array(imageData);
        }
        
        window.BadgeUI.showBadgeMigrationModal({
          oldBadgeId: migrationCheck.migrationData.oldBadgeId,
          oldTier: migrationCheck.migrationData.oldTier,
          oldGamesPlayed: migrationCheck.migrationData.oldGamesPlayed,
          oldMintDate: migrationCheck.migrationData.oldMintDate,
          imageData: imageData,
        });
      }
      
      // Hide badge display
      const badgeDisplay = document.getElementById('menuBadgeDisplay');
      if (badgeDisplay) {
        badgeDisplay.style.display = 'none';
      }
      
      return; // Don't mark as fully loaded - wait for migration
    } else {
      // No migration needed
      GameDataState.markDataLoaded(); // Use markDataLoaded to set all flags properly
      log.debug('FLOW BADGE', 'Migration check complete - no migration needed');
    }
  } catch (error) {
    log.error('FLOW BADGE', 'Migration check error', error);
    // Allow game to proceed (migration is optional)
    GameDataState.markDataLoaded(); // Use markDataLoaded to set all flags properly
  }
  
  // Clear badge display (no badge for this wallet)
  const badgeDisplay = document.getElementById('menuBadgeDisplay');
  if (badgeDisplay) {
    badgeDisplay.style.display = 'none';
    badgeDisplay.innerHTML = ''; // Clear any old badge HTML from previous wallet
  }
  
  // Clear badge from state
  GameDataState.setBadge(null);
  GameDataState.setBadgeDisplayVisible(false);
}

/**
 * Display badge in UI
 * @param {Object} badgeData - Badge data from BadgeService
 */
async function displayBadge(badgeData) {
  const badgeDisplay = document.getElementById('menuBadgeDisplay');
  if (!badgeDisplay) {
    log.warn('FLOW BADGE', 'Badge display container not found');
    return;
  }
  
  // Get wallet address for fetching registry games
  const walletAddress = GameDataState.walletAddress || (window.walletAPIInstance?.isConnected() ? window.walletAPIInstance.getAddress() : null);
  
  // Use BadgeUI.displayBadgeInUI if available
  if (window.BadgeUI?.displayBadgeInUI) {
    await window.BadgeUI.displayBadgeInUI(badgeDisplay, badgeData, walletAddress);
    badgeDisplay.style.display = 'block';
    void badgeDisplay.offsetHeight; // Force reflow
  } else {
    // Fallback: create custom display
    await createBadgeDisplay(badgeDisplay, badgeData);
  }
  
  GameDataState.setBadgeDisplayVisible(true);
  log.debug('FLOW BADGE', 'Badge displayed');
}

/**
 * Create badge display HTML (fallback)
 * @param {HTMLElement} badgeDisplay - Badge display container
 * @param {Object} badgeData - Badge data
 */
async function createBadgeDisplay(badgeDisplay, badgeData) {
  const { badge } = badgeData;
  const tierName = window.BadgeService.getTierName(badge.tier);
  const discounts = window.BadgeService.getDiscountsForTier(badge.tier);
  
  // Get image source
  let imageSrc = null;
  if (badge.imageUrl && (badge.imageUrl.startsWith('http://') || badge.imageUrl.startsWith('https://'))) {
    imageSrc = badge.imageUrl;
  } else {
    const tierNames = ['Standard', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
    const tierNameForUrl = tierNames[badge.tier] || 'Standard';
    const apiBaseUrl = window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3000/api';
    const baseUrl = apiBaseUrl.replace(/\/api$/, '');
    imageSrc = `${baseUrl}/Badges/${tierNameForUrl}.webp`;
  }
  
  const fallbackUrl = imageSrc;
  
  // Fetch total games from registry (source of truth)
  const walletAddress = GameDataState.walletAddress || (window.walletAPIInstance?.isConnected() ? window.walletAPIInstance.getAddress() : null);
  const totalGames = typeof window.fetchRegistryGames === 'function'
    ? await window.fetchRegistryGames(walletAddress)
    : 0;
  
  const badgeHTML = `
    <div class="menu-badge-info">
      <h3>🎖️ Your ${tierName} Badge</h3>
      ${imageSrc ? `<img src="${imageSrc}" alt="Badge" class="menu-badge-image" onerror="this.onerror=null; this.src='${fallbackUrl}';" />` : '<div class="menu-badge-placeholder">🎖️</div>'}
      <div class="menu-badge-details">
        <p>Games Played: ${totalGames}</p>
        ${discounts.store > 0 ? `<p>Store: ${discounts.store}% off</p>` : ''}
        ${discounts.gameplay > 0 ? `<p>Gameplay: ${discounts.gameplay}% off</p>` : ''}
      </div>
    </div>
  `;
  
  badgeDisplay.innerHTML = badgeHTML;
  badgeDisplay.style.display = 'block';
  void badgeDisplay.offsetHeight; // Force reflow
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

