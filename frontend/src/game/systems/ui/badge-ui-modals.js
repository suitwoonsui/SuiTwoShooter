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
  if (typeof GameDataFlow !== 'undefined' && GameDataFlow && typeof GameDataFlow.onBadgeModalShown === 'function') {
    GameDataFlow.onBadgeModalShown();
  } else if (typeof window !== 'undefined' && typeof window.onBadgeModalShown === 'function') {
    window.onBadgeModalShown();
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
  
  // Construct badge image URL for Standard tier (tier 0) - served from frontend origin
  const badgeBase = window.GAME_CONFIG?.BADGE_IMAGE_BASE_URL || window.location?.origin || '';
  const badgeImageUrl = typeof window.constructBadgeImageUrl === 'function'
    ? window.constructBadgeImageUrl(0)
    : badgeBase ? `${badgeBase.replace(/\/api\/?$/, '')}/Badges/Standard.webp` : '';

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
  if (typeof GameDataFlow !== 'undefined' && GameDataFlow && typeof GameDataFlow.onBadgeModalShown === 'function') {
    GameDataFlow.onBadgeModalShown();
  } else if (typeof window !== 'undefined' && typeof window.onBadgeModalShown === 'function') {
    window.onBadgeModalShown();
  }

  // Destructure onUpgradeComplete early so it's available in both paths
  const { onUpgradeComplete } = upgradeData || {};

  // Check if modal already exists
  let modal = document.getElementById('badgeUpgradeModal');
  if (modal) {
    // Modal exists - remove it so we can recreate with new context/content
    log.debug('BADGE MODALS', 'Removing existing modal to recreate with new context');
    modal.remove();
  }

  // Create modal
  modal = document.createElement('div');
  modal.className = 'badge-modal badge-modal-visible';
  modal.id = 'badgeUpgradeModal';

  // Destructure all properties including context
  const { oldTier, newTier, newTierName, imageData, transactionData, badgeId, sessionId, context } = upgradeData || {};
  log.debug('BADGE MODALS', 'Modal context:', context, 'upgradeData:', upgradeData);
  const oldTierName = window.BadgeService ? window.BadgeService.getTierName(oldTier) : 'Unknown';
  const discounts =
    upgradeData && upgradeData.discounts && typeof upgradeData.discounts === 'object'
      ? upgradeData.discounts
      : { store: 0, gameplay: 0 };
  // Need transaction if we have badgeId, newTier, and sessionId (new flow) or transactionData (old flow)
  const needsTransaction = !!(badgeId && newTier !== undefined && sessionId) || !!transactionData;
  
  // Different messages based on context
  const isStoreContext = context === 'store';
  const headerTitle = isStoreContext 
    ? '💰 Unlock Exclusive Store Savings!'
    : '🎉 Badge Upgrade Available!';
  const headerSubtitle = isStoreContext
    ? `Upgrade to ${newTierName} and save ${discounts.store > 0 ? discounts.store + '%' : 'big'} on every purchase!`
    : `Your badge can evolve to ${newTierName}!`;
  const introText = isStoreContext
    ? `<p class="badge-upgrade-intro">🎯 <strong>Perfect timing!</strong> Upgrade your badge now and instantly unlock <strong>${discounts.store}% off</strong> on everything in the store. Your savings start immediately!</p>`
    : '';
  const benefitsTitle = isStoreContext
    ? '💎 Upgrade Benefits:'
    : '✨ New Benefits:';
  const storeDiscountEmphasis = isStoreContext && discounts.store > 0
    ? `<li class="badge-perk-highlight">🎁 <strong>${discounts.store}% Store Discount:</strong> Save on every item you buy - applies instantly after upgrade!</li>`
    : discounts.store > 0 
      ? `<li>🎁 <strong>Store Discount:</strong> ${discounts.store}% off all purchases</li>`
      : '';

  modal.innerHTML = `
    <div class="badge-modal-content">
      <div class="badge-modal-header">
        <h2>${headerTitle}</h2>
        <p class="badge-modal-subtitle">${headerSubtitle}</p>
      </div>
      
      <div class="badge-modal-body">
        <div class="badge-preview-container">
          ${(() => {
            // Try to show badge image from URL (new flow) or base64 (old flow)
            if (imageData) {
              // Old flow: base64 image data
              return `<img src="data:image/webp;base64,${typeof window.arrayBufferToBase64 === 'function' ? window.arrayBufferToBase64(imageData) : ''}" alt="Badge Preview" class="badge-preview-image" />`;
            } else {
              // New flow: construct image URL from tier name - served from frontend origin
              const badgeBase = window.GAME_CONFIG?.BADGE_IMAGE_BASE_URL || window.location?.origin || '';
              const baseUrl = badgeBase.replace(/\/api\/?$/, '');
              const imageUrl = typeof window.constructBadgeImageUrl === 'function'
                ? window.constructBadgeImageUrl(newTier)
                : baseUrl ? `${baseUrl}/Badges/${newTierName}.webp` : '';
              const fallbackUrl = typeof window.constructBadgeImageUrl === 'function'
                ? window.constructBadgeImageUrl(0)
                : baseUrl ? `${baseUrl}/Badges/Standard.webp` : '';
              return `<img src="${imageUrl}" alt="Badge Preview" class="badge-preview-image" onerror="this.onerror=null; this.src='${fallbackUrl}';" />`;
            }
          })()}
          <p class="badge-tier-name">${newTierName} Badge</p>
        </div>
        
        <div class="badge-upgrade-info">
          ${introText}
          <p><strong>Upgrade from:</strong> ${oldTierName} → ${newTierName}</p>
          
          <h3>${benefitsTitle}</h3>
          <ul class="badge-perks-list">
            ${storeDiscountEmphasis}
            ${discounts.gameplay > 0 ? `<li>🎮 <strong>Gameplay Discount:</strong> ${discounts.gameplay}% off game start costs</li>` : ''}
          </ul>
          
          ${needsTransaction ? `
            <div class="badge-cost-info">
              <p><strong>Upgrade Fee:</strong> $0.10 USD (paid in SUI)</p>
              <p class="badge-cost-note">Plus network gas fees (~$0.01)</p>
              ${isStoreContext ? `<p class="badge-cost-highlight">💡 <strong>Tip:</strong> The discount you'll save will quickly pay for this upgrade!</p>` : ''}
            </div>
          ` : ''}
        </div>
      </div>
      
      <div class="badge-modal-actions">
        ${needsTransaction ? `
          <button id="badgeUpgradeBtn" class="badge-btn badge-btn-primary">
            ${isStoreContext ? `Upgrade & Save ${discounts.store > 0 ? discounts.store + '%' : 'Now'} ($0.10)` : 'Upgrade Badge ($0.10)'}
          </button>
          <button id="badgeUpgradeLaterBtn" class="badge-btn badge-btn-secondary">
            ${isStoreContext ? 'Continue to Store' : 'Maybe Later'}
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
    document.getElementById('badgeUpgradeLaterBtn').addEventListener('click', (event) => {
      // Prevent event from bubbling up to avoid triggering store modal's click-outside handler
      event.stopPropagation();
      event.preventDefault();
      
      // Set flag to skip upgrade check on next reload
      if (typeof GameDataState !== 'undefined' && GameDataState.setSkipUpgradeCheck) {
        GameDataState.setSkipUpgradeCheck(true);
        log.debug('⏭️ [BADGE MODALS] User clicked "Maybe Later" - will skip upgrade check on next reload');
      }
      hideBadgeModal('badgeUpgradeModal');
      
      // Small delay before calling callback to ensure modal is fully closed and click events have settled
      setTimeout(() => {
        // If callback provided and user declined, we can still call it (e.g., to show store)
        if (onUpgradeComplete && typeof onUpgradeComplete === 'function') {
          onUpgradeComplete(false); // false = upgrade declined
        }
      }, 100);
    });
  } else {
    document.getElementById('badgeUpgradeCloseBtn').addEventListener('click', (event) => {
      // Prevent event from bubbling up to avoid triggering store modal's click-outside handler
      event.stopPropagation();
      event.preventDefault();
      
      // Set flag to skip upgrade check on next reload
      if (typeof GameDataState !== 'undefined' && GameDataState.setSkipUpgradeCheck) {
        GameDataState.setSkipUpgradeCheck(true);
        log.debug('⏭️ [BADGE MODALS] User closed upgrade modal - will skip upgrade check on next reload');
      }
      hideBadgeModal('badgeUpgradeModal');
      
      // Small delay before calling callback to ensure modal is fully closed and click events have settled
      setTimeout(() => {
        if (onUpgradeComplete && typeof onUpgradeComplete === 'function') {
          onUpgradeComplete(false);
        }
      }, 100);
    });
  }
  
  if (window.BadgeUIService) {
    window.BadgeUIService.setModalVisible('upgrade', true);
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
      }
    }
    
    // Notify flow controller (support both legacy `GameDataFlow` and refactored globals)
    if (typeof GameDataFlow !== 'undefined' && GameDataFlow && typeof GameDataFlow.onBadgeModalHidden === 'function') {
      GameDataFlow.onBadgeModalHidden();
    } else if (typeof window !== 'undefined' && typeof window.onBadgeModalHidden === 'function') {
      window.onBadgeModalHidden();
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
    
    // GameDataFlow may load after modals (lazy-loader ordering / wallet bundle timing).
    // Not having it here should never block gameplay.
  }
}

// Expose globally
if (typeof window !== 'undefined') {
  window.showBadgeMintingModal = showBadgeMintingModal;
  window.showTierUpgradeModal = showTierUpgradeModal;
  window.hideBadgeModal = hideBadgeModal;
  
  // Also expose via BadgeUI for backward compatibility
  if (!window.BadgeUI) {
    window.BadgeUI = {};
  }
  window.BadgeUI.showBadgeMintingModal = showBadgeMintingModal;
  window.BadgeUI.showTierUpgradeModal = showTierUpgradeModal;
  window.BadgeUI.hideBadgeModal = hideBadgeModal;
}

