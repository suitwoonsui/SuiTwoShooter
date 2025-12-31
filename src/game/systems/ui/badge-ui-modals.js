// ==========================================
// BADGE UI MODALS - Modal Creation and Display
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

log.info('BADGE UI MODALS', 'Badge UI modals module loaded');

/**
 * Show badge minting modal (after first game)
 * @param {Object} badgePreview - Badge preview data (optional)
 */
async function showBadgeMintingModal(badgePreview = null) {
    log.debug('BADGE MODALS', 'Showing badge minting modal');
  
  // Notify flow controller
  if (typeof GameDataFlow !== 'undefined') {
    GameDataFlow.onBadgeModalShown();
  }

  // Check if modal already exists
  let modal = document.getElementById('badgeMintingModal');
  if (modal) {
    modal.classList.add('badge-modal-visible');
    modal.classList.remove('badge-modal-hidden');
    if (window.BadgeUIService) {
      window.BadgeUIService.setModalVisible('minting', true);
    }
    return;
  }

  // Create modal
  modal = document.createElement('div');
  modal.className = 'badge-modal badge-modal-visible';
  modal.id = 'badgeMintingModal';

  // Get tier name
  const tierName = window.BadgeService ? window.BadgeService.getTierName(0) : 'Standard';
  
  // Construct badge image URL for Standard tier (tier 0)
  const badgeImageUrl = typeof window.constructBadgeImageUrl === 'function'
    ? window.constructBadgeImageUrl(0)
    : `${window.GAME_CONFIG?.API_BASE_URL?.replace(/\/api$/, '') || 'http://localhost:3000'}/Badges/Standard.webp`;

  modal.innerHTML = `
    <div class="badge-modal-content">
      <div class="badge-modal-header">
        <h2>🎉 Congratulations!</h2>
        <p class="badge-modal-subtitle">You've completed your first game!</p>
      </div>
      
      <div class="badge-modal-body">
        <div class="badge-preview-container">
          ${badgePreview && badgePreview.imageData 
            ? `<img src="data:image/webp;base64,${typeof window.arrayBufferToBase64 === 'function' ? window.arrayBufferToBase64(badgePreview.imageData) : ''}" alt="Badge Preview" class="badge-preview-image" />`
            : `<img src="${badgeImageUrl}" alt="${tierName} Badge" class="badge-preview-image" onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='block';" />
               <div class="badge-preview-placeholder" style="display: none;">🎖️</div>`
          }
          <p class="badge-tier-name">${tierName} Badge</p>
        </div>
        
        <div class="badge-info-section">
          <h3>What is this badge?</h3>
          <p>This is your <strong>Early Supporter Badge</strong> - a special soulbound NFT that represents your dedication as an early player of SuiTwo.</p>
          
          <h3>✨ Perks:</h3>
          <ul class="badge-perks-list">
            <li>🎁 <strong>Store Discounts</strong> - Save on premium items</li>
            <li>🎮 <strong>Gameplay Discounts</strong> - Reduced costs to start games</li>
            <li>📈 <strong>Evolves with You</strong> - Your badge upgrades as you play more games</li>
            <li>🔒 <strong>Soulbound</strong> - This badge is permanently bound to your wallet and cannot be transferred or sold</li>
          </ul>
          
          <div class="badge-soulbound-notice">
            <strong>🔒 Soulbound Badge:</strong> This NFT is permanently linked to your wallet. It cannot be transferred, sold, or traded. It's yours forever!
          </div>
        </div>
        
        <div class="badge-cost-info">
          <p><strong>Minting Fee:</strong> $0.10 USD (paid in SUI)</p>
          <p class="badge-cost-note">Plus network gas fees (~$0.01)</p>
        </div>
      </div>
      
      <div class="badge-modal-actions">
        <button id="badgeMintBtn" class="badge-btn badge-btn-primary">
          Mint Badge ($0.10)
        </button>
        <button id="badgeMaybeLaterBtn" class="badge-btn badge-btn-secondary">
          Maybe Later
        </button>
      </div>
    </div>
  `;

  // Append to viewport container
  const viewportContainer = document.querySelector('.viewport-container');
  if (viewportContainer) {
    viewportContainer.appendChild(modal);
  } else {
    document.body.appendChild(modal);
  }

  // Add event listeners
  if (typeof window.handleBadgeMint === 'function') {
    document.getElementById('badgeMintBtn').addEventListener('click', window.handleBadgeMint);
  }
  if (typeof window.handleBadgeMaybeLater === 'function') {
    document.getElementById('badgeMaybeLaterBtn').addEventListener('click', window.handleBadgeMaybeLater);
  }
  
  if (window.BadgeUIService) {
    window.BadgeUIService.setModalVisible('minting', true);
  }
}

/**
 * Show tier upgrade notification modal
 * @param {Object} upgradeData - Upgrade data {oldTier, newTier, newTierName, imageData, transactionData, onUpgradeComplete}
 */
async function showTierUpgradeModal(upgradeData) {
    log.debug('BADGE MODALS', 'Showing tier upgrade modal', upgradeData);
  
  // Notify flow controller
  if (typeof GameDataFlow !== 'undefined') {
    GameDataFlow.onBadgeModalShown();
  }

  // Check if modal already exists
  let modal = document.getElementById('badgeUpgradeModal');
  if (modal) {
    modal.classList.add('badge-modal-visible');
    modal.classList.remove('badge-modal-hidden');
    if (window.BadgeUIService) {
      window.BadgeUIService.setModalVisible('upgrade', true);
    }
    return;
  }

  // Create modal
  modal = document.createElement('div');
  modal.className = 'badge-modal badge-modal-visible';
  modal.id = 'badgeUpgradeModal';

  const { oldTier, newTier, newTierName, imageData, transactionData, badgeId, sessionId, onUpgradeComplete } = upgradeData;
  const oldTierName = window.BadgeService ? window.BadgeService.getTierName(oldTier) : 'Unknown';
  const discounts = window.BadgeService ? window.BadgeService.getDiscountsForTier(newTier) : { store: 0, gameplay: 0 };
  // Need transaction if we have badgeId, newTier, and sessionId (new flow) or transactionData (old flow)
  const needsTransaction = !!(badgeId && newTier !== undefined && sessionId) || !!transactionData;

  modal.innerHTML = `
    <div class="badge-modal-content">
      <div class="badge-modal-header">
        <h2>🎉 Badge Upgrade Available!</h2>
        <p class="badge-modal-subtitle">Your badge can evolve to ${newTierName}!</p>
      </div>
      
      <div class="badge-modal-body">
        <div class="badge-preview-container">
          ${(() => {
            // Try to show badge image from URL (new flow) or base64 (old flow)
            if (imageData) {
              // Old flow: base64 image data
              return `<img src="data:image/webp;base64,${typeof window.arrayBufferToBase64 === 'function' ? window.arrayBufferToBase64(imageData) : ''}" alt="Badge Preview" class="badge-preview-image" />`;
            } else {
              // New flow: construct image URL from tier name
              const imageUrl = typeof window.constructBadgeImageUrl === 'function'
                ? window.constructBadgeImageUrl(newTier)
                : `${window.GAME_CONFIG?.API_BASE_URL?.replace(/\/api$/, '') || 'http://localhost:3000'}/Badges/${newTierName}.webp`;
              const fallbackUrl = typeof window.constructBadgeImageUrl === 'function'
                ? window.constructBadgeImageUrl(0)
                : `${window.GAME_CONFIG?.API_BASE_URL?.replace(/\/api$/, '') || 'http://localhost:3000'}/Badges/Standard.webp`;
              return `<img src="${imageUrl}" alt="Badge Preview" class="badge-preview-image" onerror="this.onerror=null; this.src='${fallbackUrl}';" />`;
            }
          })()}
          <p class="badge-tier-name">${newTierName} Badge</p>
        </div>
        
        <div class="badge-upgrade-info">
          <p><strong>Upgrade from:</strong> ${oldTierName} → ${newTierName}</p>
          
          <h3>✨ New Benefits:</h3>
          <ul class="badge-perks-list">
            ${discounts.store > 0 ? `<li>🎁 <strong>Store Discount:</strong> ${discounts.store}% off all purchases</li>` : ''}
            ${discounts.gameplay > 0 ? `<li>🎮 <strong>Gameplay Discount:</strong> ${discounts.gameplay}% off game start costs</li>` : ''}
          </ul>
          
          ${needsTransaction ? `
            <div class="badge-cost-info">
              <p><strong>Upgrade Fee:</strong> $0.10 USD (paid in SUI)</p>
              <p class="badge-cost-note">Plus network gas fees (~$0.01)</p>
            </div>
          ` : ''}
        </div>
      </div>
      
      <div class="badge-modal-actions">
        ${needsTransaction ? `
          <button id="badgeUpgradeBtn" class="badge-btn badge-btn-primary">
            Upgrade Badge ($0.10)
          </button>
          <button id="badgeUpgradeLaterBtn" class="badge-btn badge-btn-secondary">
            Maybe Later
          </button>
        ` : `
          <button id="badgeUpgradeCloseBtn" class="badge-btn badge-btn-primary">
            Awesome!
          </button>
        `}
      </div>
    </div>
  `;

  // Append to viewport container
  const viewportContainer = document.querySelector('.viewport-container');
  if (viewportContainer) {
    viewportContainer.appendChild(modal);
  } else {
    document.body.appendChild(modal);
  }

  // Add event listeners
  if (needsTransaction) {
    document.getElementById('badgeUpgradeBtn').addEventListener('click', () => {
      // Use new flow if badgeId, newTier, and sessionId are available
      if (badgeId && newTier !== undefined && sessionId) {
        if (typeof window.handleBadgeUpgrade === 'function') {
          window.handleBadgeUpgrade({ badgeId, newTier, sessionId }, onUpgradeComplete);
        }
      } else if (transactionData) {
        // Fallback to old flow for backward compatibility
        if (typeof window.handleBadgeUpgrade === 'function') {
          window.handleBadgeUpgrade(transactionData, onUpgradeComplete);
        }
      } else {
        log.error('❌ [BADGE MODALS] Missing upgrade data:', { badgeId, newTier, sessionId, transactionData });
        if (typeof window.showUpgradeError === 'function') {
          window.showUpgradeError('Missing upgrade data. Please try again.');
        }
      }
    });
    document.getElementById('badgeUpgradeLaterBtn').addEventListener('click', () => {
      // Set flag to skip upgrade check on next reload
      if (typeof GameDataState !== 'undefined' && GameDataState.setSkipUpgradeCheck) {
        GameDataState.setSkipUpgradeCheck(true);
        log.debug('⏭️ [BADGE MODALS] User clicked "Maybe Later" - will skip upgrade check on next reload');
      }
      hideBadgeModal('badgeUpgradeModal');
      // If callback provided and user declined, we can still call it (e.g., to show store)
      if (onUpgradeComplete && typeof onUpgradeComplete === 'function') {
        onUpgradeComplete(false); // false = upgrade declined
      }
    });
  } else {
    document.getElementById('badgeUpgradeCloseBtn').addEventListener('click', () => {
      // Set flag to skip upgrade check on next reload
      if (typeof GameDataState !== 'undefined' && GameDataState.setSkipUpgradeCheck) {
        GameDataState.setSkipUpgradeCheck(true);
        log.debug('⏭️ [BADGE MODALS] User closed upgrade modal - will skip upgrade check on next reload');
      }
      hideBadgeModal('badgeUpgradeModal');
      if (onUpgradeComplete && typeof onUpgradeComplete === 'function') {
        onUpgradeComplete(false);
      }
    });
  }
  
  if (window.BadgeUIService) {
    window.BadgeUIService.setModalVisible('upgrade', true);
  }
}

/**
 * Show badge migration modal
 * @param {Object} migrationData - Migration data {oldBadgeId, oldTier, oldGamesPlayed, oldMintDate, imageData}
 */
async function showBadgeMigrationModal(migrationData) {
    log.debug('BADGE MODALS', 'Showing badge migration modal', migrationData);
  
  // Notify flow controller
  if (typeof GameDataFlow !== 'undefined') {
    GameDataFlow.onBadgeModalShown();
  }

  // Check if modal already exists
  let modal = document.getElementById('badgeMigrationModal');
  if (modal) {
    modal.classList.add('badge-modal-visible');
    modal.classList.remove('badge-modal-hidden');
    if (window.BadgeUIService) {
      window.BadgeUIService.setModalVisible('migration', true);
    }
    return;
  }

  // Create modal
  modal = document.createElement('div');
  modal.className = 'badge-modal badge-modal-visible';
  modal.id = 'badgeMigrationModal';

  const { oldBadgeId, oldTier, oldGamesPlayed, oldMintDate, imageData } = migrationData;
  const oldTierName = window.BadgeService ? window.BadgeService.getTierName(oldTier) : 'Unknown';
  
  // Construct badge image URL for the old tier
  const badgeImageUrl = typeof window.constructBadgeImageUrl === 'function'
    ? window.constructBadgeImageUrl(oldTier)
    : `${window.GAME_CONFIG?.API_BASE_URL?.replace(/\/api$/, '') || 'http://localhost:3000'}/Badges/${oldTierName}.webp`;

  modal.innerHTML = `
    <div class="badge-modal-content">
      <div class="badge-modal-header">
        <h2>🔄 Badge Migration Required</h2>
        <p class="badge-modal-subtitle">Migrate your badge to the new contract</p>
      </div>
      
      <div class="badge-modal-body">
        <div class="badge-preview-container">
          ${imageData 
            ? `<img src="data:image/webp;base64,${typeof window.arrayBufferToBase64 === 'function' ? window.arrayBufferToBase64(imageData) : ''}" alt="Badge Preview" class="badge-preview-image" />`
            : `<img src="${badgeImageUrl}" alt="${oldTierName} Badge" class="badge-preview-image" onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='block';" />
               <div class="badge-preview-placeholder" style="display: none;">🎖️</div>`
          }
          <p class="badge-tier-name">${oldTierName} Badge</p>
        </div>
        
        <div class="badge-info-section">
          <h3>What is migration?</h3>
          <p>Your badge was created with an older version of the contract. To continue using it, you need to migrate it to the new contract.</p>
          
          <h3>What happens during migration?</h3>
          <ul class="badge-perks-list">
            <li>✅ Your badge data is preserved (tier, games played, mint date)</li>
            <li>✅ A new badge is created in your wallet</li>
            <li>✅ Your old badge will be automatically deleted (if the old contract supports it)</li>
            <li>✅ All your progress is maintained</li>
          </ul>
          
          <div class="badge-cost-info">
            <p><strong>Gas Fee:</strong> ~$0.001-0.01 USD (paid in SUI)</p>
            <p class="badge-cost-note">You'll need to sign a transaction to migrate your badge</p>
          </div>
        </div>
      </div>
      
      <div class="badge-modal-actions">
        <button id="badgeMigrateBtn" class="badge-btn badge-btn-primary">
          Migrate Badge
        </button>
        <button id="badgeMigrateLaterBtn" class="badge-btn badge-btn-secondary">
          Maybe Later
        </button>
      </div>
    </div>
  `;

  // Append to viewport container
  const viewportContainer = document.querySelector('.viewport-container');
  if (viewportContainer) {
    viewportContainer.appendChild(modal);
  } else {
    document.body.appendChild(modal);
  }

  // Add event listeners
  document.getElementById('badgeMigrateBtn').addEventListener('click', () => {
    if (typeof window.handleBadgeMigration === 'function') {
      window.handleBadgeMigration(migrationData);
    }
  });
  document.getElementById('badgeMigrateLaterBtn').addEventListener('click', () => {
    // Set flag to skip migration check and mark data as loaded
    if (typeof GameDataState !== 'undefined') {
      GameDataState.migrationModalClosed = true;
      GameDataState.markDataLoaded();
      log.debug('⏭️ [BADGE MODALS] User clicked "Maybe Later" - migration check skipped, data marked as loaded');
    }
    hideBadgeModal('badgeMigrationModal');
  });
  
  if (window.BadgeUIService) {
    window.BadgeUIService.setModalVisible('migration', true);
  }
}

/**
 * Hide badge modal
 * @param {string} modalId - Modal ID to hide
 */
function hideBadgeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('badge-modal-visible');
    modal.classList.add('badge-modal-hidden');
    
    // Update service state
    if (window.BadgeUIService) {
      if (modalId === 'badgeMintingModal') {
        window.BadgeUIService.setModalVisible('minting', false);
      } else if (modalId === 'badgeUpgradeModal') {
        window.BadgeUIService.setModalVisible('upgrade', false);
      } else if (modalId === 'badgeMigrationModal') {
        window.BadgeUIService.setModalVisible('migration', false);
      }
    }
    
    // Notify flow controller
    if (typeof GameDataFlow !== 'undefined') {
      GameDataFlow.onBadgeModalHidden();
    }
    
    // Track migration modal closure for game readiness (backward compatibility)
    if (modalId === 'badgeMigrationModal') {
      // Set flag in GameDataState to exit the loop
      if (typeof GameDataState !== 'undefined') {
        GameDataState.migrationModalClosed = true;
        // If migration check is complete and modal is closed, mark data as loaded
        if (GameDataState.migrationCheckComplete && !GameDataState.dataLoaded) {
          GameDataState.markDataLoaded();
          log.debug('✅ [BADGE MODALS] Migration modal closed - data marked as loaded');
        }
      }
      
      // Also update gameReadinessState for backward compatibility
      if (typeof gameReadinessState !== 'undefined') {
        gameReadinessState.migrationModalClosed = true;
        log.debug('✅ [GAME READINESS] Migration modal closed - button can now enable');
        
        if (typeof updateGameReadiness === 'function') {
          updateGameReadiness();
        }
      }
    }
    
    // Track minting modal closure - mark data as loaded so game can proceed
    if (modalId === 'badgeMintingModal') {
      if (typeof GameDataState !== 'undefined') {
        // Mark data as loaded so game can proceed
        if (!GameDataState.dataLoaded) {
          GameDataState.markDataLoaded();
          log.debug('✅ [BADGE MODALS] Minting modal closed - data marked as loaded');
        }
      }
    }
    
    // GameDataFlow is required - if not available, log error
    if (typeof GameDataFlow === 'undefined') {
      log.error('❌ [BADGE MODALS] GameDataFlow not available - this should not happen');
    }
  }
}

// Expose globally
if (typeof window !== 'undefined') {
  window.showBadgeMintingModal = showBadgeMintingModal;
  window.showTierUpgradeModal = showTierUpgradeModal;
  window.showBadgeMigrationModal = showBadgeMigrationModal;
  window.hideBadgeModal = hideBadgeModal;
  
  // Also expose via BadgeUI for backward compatibility
  if (!window.BadgeUI) {
    window.BadgeUI = {};
  }
  window.BadgeUI.showBadgeMintingModal = showBadgeMintingModal;
  window.BadgeUI.showTierUpgradeModal = showTierUpgradeModal;
  window.BadgeUI.showBadgeMigrationModal = showBadgeMigrationModal;
  window.BadgeUI.hideBadgeModal = hideBadgeModal;
}

