// ==========================================
// BADGE UI SYSTEM
// ==========================================
// Handles badge display, minting modals, and tier upgrade notifications

/**
 * Show badge minting modal (after first game)
 * @param {Object} badgePreview - Badge preview data (optional)
 */
async function showBadgeMintingModal(badgePreview = null) {
  console.log('🎖️ [BADGE] Showing badge minting modal');

  // Check if modal already exists
  let modal = document.getElementById('badgeMintingModal');
  if (modal) {
    modal.classList.add('badge-modal-visible');
    modal.classList.remove('badge-modal-hidden');
    return;
  }

  // Create modal
  modal = document.createElement('div');
  modal.className = 'badge-modal badge-modal-visible';
  modal.id = 'badgeMintingModal';

  // Get tier name
  const tierName = window.BadgeService ? window.BadgeService.getTierName(0) : 'Starter';

  modal.innerHTML = `
    <div class="badge-modal-content">
      <div class="badge-modal-header">
        <h2>🎉 Congratulations!</h2>
        <p class="badge-modal-subtitle">You've completed your first game!</p>
      </div>
      
      <div class="badge-modal-body">
        <div class="badge-preview-container">
          ${badgePreview && badgePreview.imageData 
            ? `<img src="data:image/webp;base64,${arrayBufferToBase64(badgePreview.imageData)}" alt="Badge Preview" class="badge-preview-image" />`
            : `<div class="badge-preview-placeholder">🎖️</div>`
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
  document.getElementById('badgeMintBtn').addEventListener('click', handleBadgeMint);
  document.getElementById('badgeMaybeLaterBtn').addEventListener('click', handleBadgeMaybeLater);
}

/**
 * Show tier upgrade notification modal
 * @param {Object} upgradeData - Upgrade data {oldTier, newTier, newTierName, imageData}
 */
async function showTierUpgradeModal(upgradeData) {
  console.log('🎖️ [BADGE] Showing tier upgrade modal:', upgradeData);

  // Check if modal already exists
  let modal = document.getElementById('badgeUpgradeModal');
  if (modal) {
    modal.classList.add('badge-modal-visible');
    modal.classList.remove('badge-modal-hidden');
    return;
  }

  // Create modal
  modal = document.createElement('div');
  modal.className = 'badge-modal badge-modal-visible';
  modal.id = 'badgeUpgradeModal';

  const { oldTier, newTier, newTierName, imageData } = upgradeData;
  const oldTierName = window.BadgeService ? window.BadgeService.getTierName(oldTier) : 'Unknown';
  const discounts = window.BadgeService ? window.BadgeService.getDiscountsForTier(newTier) : { store: 0, gameplay: 0 };

  modal.innerHTML = `
    <div class="badge-modal-content">
      <div class="badge-modal-header">
        <h2>🎉 Badge Upgraded!</h2>
        <p class="badge-modal-subtitle">Your badge has evolved to ${newTierName}!</p>
      </div>
      
      <div class="badge-modal-body">
        <div class="badge-preview-container">
          ${imageData 
            ? `<img src="data:image/webp;base64,${arrayBufferToBase64(imageData)}" alt="Badge Preview" class="badge-preview-image" />`
            : `<div class="badge-preview-placeholder">🎖️</div>`
          }
          <p class="badge-tier-name">${newTierName} Badge</p>
        </div>
        
        <div class="badge-upgrade-info">
          <p><strong>Upgraded from:</strong> ${oldTierName} → ${newTierName}</p>
          
          <h3>✨ New Benefits:</h3>
          <ul class="badge-perks-list">
            ${discounts.store > 0 ? `<li>🎁 <strong>Store Discount:</strong> ${discounts.store}% off all purchases</li>` : ''}
            ${discounts.gameplay > 0 ? `<li>🎮 <strong>Gameplay Discount:</strong> ${discounts.gameplay}% off game start costs</li>` : ''}
          </ul>
        </div>
      </div>
      
      <div class="badge-modal-actions">
        <button id="badgeUpgradeCloseBtn" class="badge-btn badge-btn-primary">
          Awesome!
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

  // Add event listener
  document.getElementById('badgeUpgradeCloseBtn').addEventListener('click', () => {
    hideBadgeModal('badgeUpgradeModal');
  });
}

/**
 * Handle badge mint button click
 */
async function handleBadgeMint() {
  const btn = document.getElementById('badgeMintBtn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Minting...';
  }

  try {
    // Check wallet connection
    if (!window.walletAPIInstance || !window.walletAPIInstance.isConnected()) {
      alert('Please connect your wallet first.');
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Mint Badge ($0.10)';
      }
      return;
    }

    // Calculate required minting fee
    const feeInfo = await window.BadgeService.calculateMintingFee();
    if (!feeInfo.success) {
      throw new Error(feeInfo.error || 'Failed to calculate minting fee');
    }

    // Get SUI coin for payment
    const coinResult = await window.BadgeService.getPaymentCoin(feeInfo.amountMist);
    if (!coinResult.success) {
      throw new Error(coinResult.error || 'Failed to get payment coin');
    }

    console.log(`💰 [BADGE] Using coin ${coinResult.coinId} for payment (${feeInfo.amountSui} SUI)`);
    
    // Build mint transaction
    const result = await window.BadgeService.buildMintBadgeTransaction(coinResult.coinId);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to build mint transaction');
    }

    // Sign and execute transaction
    const txResult = await window.BadgeService.signAndExecuteBadgeTransaction(result.transactionData);
    
    if (txResult.success) {
      console.log('✅ [BADGE] Badge minted successfully!');
      alert('🎉 Badge minted successfully!');
      hideBadgeModal('badgeMintingModal');
      // Clear badge cache
      window.BadgeService.clearBadgeCache();
    } else {
      throw new Error(txResult.error || 'Transaction failed');
    }
  } catch (error) {
    console.error('❌ [BADGE] Error minting badge:', error);
    alert(`Failed to mint badge: ${error.message}`);
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Mint Badge ($0.10)';
    }
  }
}

/**
 * Handle "Maybe Later" button click
 */
function handleBadgeMaybeLater() {
  console.log('🎖️ [BADGE] User chose "Maybe Later"');
  hideBadgeModal('badgeMintingModal');
  // Note: Will prompt again on next game completion
}

/**
 * Hide badge modal
 */
function hideBadgeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('badge-modal-visible');
    modal.classList.add('badge-modal-hidden');
  }
}

/**
 * Convert array buffer to base64
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
 * Display badge in UI (for store, menu, etc.)
 * @param {HTMLElement} container - Container element to display badge in
 * @param {Object} badgeData - Badge data from API
 */
function displayBadgeInUI(container, badgeData) {
  if (!badgeData || !badgeData.hasBadge) {
    return;
  }

  const { badge } = badgeData;
  const tierName = window.BadgeService ? window.BadgeService.getTierName(badge.tier) : 'Unknown';
  const discounts = window.BadgeService ? window.BadgeService.getDiscountsForTier(badge.tier) : { store: 0, gameplay: 0 };

  const badgeHTML = `
    <div class="badge-display-container">
      <div class="badge-display-header">
        <h3>🎖️ Your Badge</h3>
      </div>
      <div class="badge-display-content">
        ${badge.imageData 
          ? `<img src="data:image/webp;base64,${arrayBufferToBase64(badge.imageData)}" alt="Badge" class="badge-display-image" />`
          : `<div class="badge-display-placeholder">🎖️</div>`
        }
        <div class="badge-display-info">
          <p class="badge-display-tier"><strong>${tierName}</strong></p>
          <p class="badge-display-games">Games: ${badge.gamesPlayed || 0}</p>
          ${discounts.store > 0 ? `<p class="badge-display-discount">Store: ${discounts.store}% off</p>` : ''}
          ${discounts.gameplay > 0 ? `<p class="badge-display-discount">Gameplay: ${discounts.gameplay}% off</p>` : ''}
        </div>
      </div>
    </div>
  `;

  container.innerHTML = badgeHTML;
}

// Export functions
if (typeof window !== 'undefined') {
  window.BadgeUI = {
    showBadgeMintingModal,
    showTierUpgradeModal,
    displayBadgeInUI,
    hideBadgeModal,
  };
}

