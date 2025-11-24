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
  const tierName = window.BadgeService ? window.BadgeService.getTierName(0) : 'Standard';

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
 * @param {Object} upgradeData - Upgrade data {oldTier, newTier, newTierName, imageData, transactionData, onUpgradeComplete}
 * @param {Function} onUpgradeComplete - Optional callback when upgrade completes (for showing store, etc.)
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

  const { oldTier, newTier, newTierName, imageData, transactionData, onUpgradeComplete } = upgradeData;
  const oldTierName = window.BadgeService ? window.BadgeService.getTierName(oldTier) : 'Unknown';
  const discounts = window.BadgeService ? window.BadgeService.getDiscountsForTier(newTier) : { store: 0, gameplay: 0 };
  const needsTransaction = !!transactionData;

  modal.innerHTML = `
    <div class="badge-modal-content">
      <div class="badge-modal-header">
        <h2>🎉 Badge Upgrade Available!</h2>
        <p class="badge-modal-subtitle">Your badge can evolve to ${newTierName}!</p>
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
          <p><strong>Upgrade from:</strong> ${oldTierName} → ${newTierName}</p>
          
          <h3>✨ New Benefits:</h3>
          <ul class="badge-perks-list">
            ${discounts.store > 0 ? `<li>🎁 <strong>Store Discount:</strong> ${discounts.store}% off all purchases</li>` : ''}
            ${discounts.gameplay > 0 ? `<li>🎮 <strong>Gameplay Discount:</strong> ${discounts.gameplay}% off game start costs</li>` : ''}
          </ul>
          
          ${needsTransaction ? `
            <div class="badge-cost-info">
              <p><strong>Gas Fee:</strong> ~$0.001-0.01 USD (paid in SUI)</p>
              <p class="badge-cost-note">You'll need to sign a transaction to upgrade your badge</p>
              <p class="badge-cost-note" style="font-size: 0.85em; margin-top: 0.5rem;">⚠️ Make sure you have at least 0.002 SUI in your wallet for gas fees</p>
            </div>
          ` : ''}
        </div>
      </div>
      
      <div class="badge-modal-actions">
        ${needsTransaction ? `
          <button id="badgeUpgradeBtn" class="badge-btn badge-btn-primary">
            Upgrade Badge
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
    document.getElementById('badgeUpgradeBtn').addEventListener('click', () => handleBadgeUpgrade(transactionData, onUpgradeComplete));
    document.getElementById('badgeUpgradeLaterBtn').addEventListener('click', () => {
      hideBadgeModal('badgeUpgradeModal');
      // If callback provided and user declined, we can still call it (e.g., to show store)
      if (onUpgradeComplete && typeof onUpgradeComplete === 'function') {
        onUpgradeComplete(false); // false = upgrade declined
      }
    });
  } else {
    document.getElementById('badgeUpgradeCloseBtn').addEventListener('click', () => {
      hideBadgeModal('badgeUpgradeModal');
      if (onUpgradeComplete && typeof onUpgradeComplete === 'function') {
        onUpgradeComplete(false);
      }
    });
  }
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

    // Build mint transaction (fully client-side)
    // Flow: Find coin → Estimate gas → Calculate fee (0.1 SUI - gas) → Build transaction
    console.log('🔨 [BADGE] Starting mint transaction build...');
    const result = await window.BadgeService.buildMintBadgeTransaction();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to build mint transaction');
    }
    
    console.log('✅ [BADGE] Transaction built, requesting signature...');

    // Sign and execute transaction (result.transaction is Transaction object)
    const txResult = await window.BadgeService.signAndExecuteBadgeTransaction(result.transaction);
    
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
 * Handle badge upgrade button click
 * @param {Object} transactionData - Transaction data from backend
 * @param {Function} onComplete - Optional callback when upgrade completes
 */
async function handleBadgeUpgrade(transactionData, onComplete = null) {
  const btn = document.getElementById('badgeUpgradeBtn');
  const errorMessage = document.getElementById('badgeUpgradeError');
  
  // Clear any previous error messages
  if (errorMessage) {
    errorMessage.style.display = 'none';
    errorMessage.textContent = '';
  }
  
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Checking balance...';
  }

  try {
    // Check wallet connection
    if (!window.walletAPIInstance || !window.walletAPIInstance.isConnected()) {
      showUpgradeError('Please connect your wallet first.');
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Upgrade Badge';
      }
      return;
    }

    const walletAddress = window.walletAPIInstance.getAddress();
    const network = window.GAME_CONFIG?.SUI_NETWORK || 'testnet';
    
    // Check SUI balance before attempting transaction
    if (window.walletAPIInstance.checkSUIBalance) {
      btn.textContent = 'Checking gas balance...';
      const balanceResult = await window.walletAPIInstance.checkSUIBalance(walletAddress, network);
      
      if (!balanceResult.success) {
        showUpgradeError(`Failed to check balance: ${balanceResult.error || 'Unknown error'}`);
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Upgrade Badge';
        }
        return;
      }
      
      // Check if balance is sufficient (need at least 0.002 SUI for gas)
      const minRequiredSUI = 0.002;
      const balanceInSUI = balanceResult.balanceInSUI || parseFloat(balanceResult.formattedBalance?.replace(/,/g, '') || '0');
      
      if (balanceInSUI < minRequiredSUI) {
        const shortfall = minRequiredSUI - balanceInSUI;
        showUpgradeError(
          `Insufficient SUI for gas fees.\n\n` +
          `Required: ${minRequiredSUI} SUI\n` +
          `You have: ${balanceResult.formattedBalance || '0'} SUI\n` +
          `Shortfall: ${shortfall.toFixed(4)} SUI\n\n` +
          `Please add more SUI to your wallet to cover gas fees.`
        );
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Upgrade Badge';
        }
        return;
      }
    }

    // Balance check passed, proceed with transaction
    if (btn) {
      btn.textContent = 'Signing transaction...';
    }

    // Sign and execute transaction
    const txResult = await window.BadgeService.signAndExecuteBadgeTransaction(transactionData);
    
    if (txResult.success) {
      console.log('✅ [BADGE] Badge upgraded successfully!');
      
      // Show success message in modal before closing
      if (errorMessage) {
        errorMessage.style.display = 'block';
        errorMessage.style.color = '#39ff14';
        errorMessage.textContent = '✅ Badge upgraded successfully!';
      }
      
      // Wait a moment to show success message
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      hideBadgeModal('badgeUpgradeModal');
      // Clear badge cache
      window.BadgeService.clearBadgeCache();
      
      // Call callback if provided
      if (onComplete && typeof onComplete === 'function') {
        onComplete(true); // true = upgrade completed
      }
    } else {
      // Transaction failed - parse error message
      const errorMsg = txResult.error || 'Transaction failed';
      let userFriendlyError = errorMsg;
      
      // Provide more specific error messages
      if (errorMsg.includes('insufficient') || errorMsg.includes('balance')) {
        userFriendlyError = 'Insufficient SUI balance for gas fees. Please add more SUI to your wallet.';
      } else if (errorMsg.includes('rejected') || errorMsg.includes('denied') || errorMsg.includes('user')) {
        userFriendlyError = 'Transaction was rejected. Please try again when ready.';
      } else if (errorMsg.includes('timeout')) {
        userFriendlyError = 'Transaction timed out. Please check your network connection and try again.';
      }
      
      showUpgradeError(userFriendlyError);
      throw new Error(userFriendlyError);
    }
  } catch (error) {
    console.error('❌ [BADGE] Error upgrading badge:', error);
    
    // Show error in modal (already shown by showUpgradeError if it was called)
    if (!errorMessage || errorMessage.style.display === 'none') {
      showUpgradeError(`Failed to upgrade badge: ${error.message || 'Unknown error'}`);
    }
    
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Upgrade Badge';
    }
    
    // Don't call callback on error - keep modal open so user can retry
    // Only call callback if explicitly requested (e.g., for store flow)
    // For now, we'll keep modal open on error
  }
}

/**
 * Show error message in upgrade modal
 * @param {string} message - Error message to display
 */
function showUpgradeError(message) {
  let errorMessage = document.getElementById('badgeUpgradeError');
  
  // Create error message element if it doesn't exist
  if (!errorMessage) {
    const modal = document.getElementById('badgeUpgradeModal');
    if (modal) {
      const modalBody = modal.querySelector('.badge-modal-body');
      if (modalBody) {
        errorMessage = document.createElement('div');
        errorMessage.id = 'badgeUpgradeError';
        errorMessage.className = 'badge-error-message';
        errorMessage.style.cssText = 'display: block; color: #ff4444; margin-top: 1rem; padding: 0.75rem; background: rgba(255, 68, 68, 0.1); border-radius: 0.5rem; border: 1px solid rgba(255, 68, 68, 0.3); white-space: pre-line;';
        modalBody.appendChild(errorMessage);
      }
    }
  }
  
  if (errorMessage) {
    errorMessage.style.display = 'block';
    errorMessage.style.color = '#ff4444';
    errorMessage.textContent = message;
    
    // Scroll error into view
    errorMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

/**
 * Show badge migration modal
 * @param {Object} migrationData - Migration data {oldBadgeId, oldTier, oldGamesPlayed, oldMintDate, imageData}
 */
async function showBadgeMigrationModal(migrationData) {
  console.log('🔄 [BADGE] Showing badge migration modal:', migrationData);

  // Check if modal already exists
  let modal = document.getElementById('badgeMigrationModal');
  if (modal) {
    modal.classList.add('badge-modal-visible');
    modal.classList.remove('badge-modal-hidden');
    return;
  }

  // Create modal
  modal = document.createElement('div');
  modal.className = 'badge-modal badge-modal-visible';
  modal.id = 'badgeMigrationModal';

  const { oldBadgeId, oldTier, oldGamesPlayed, oldMintDate, imageData } = migrationData;
  const oldTierName = window.BadgeService ? window.BadgeService.getTierName(oldTier) : 'Unknown';

  modal.innerHTML = `
    <div class="badge-modal-content">
      <div class="badge-modal-header">
        <h2>🔄 Badge Migration Required</h2>
        <p class="badge-modal-subtitle">Migrate your badge to the new contract</p>
      </div>
      
      <div class="badge-modal-body">
        <div class="badge-preview-container">
          ${imageData 
            ? `<img src="data:image/webp;base64,${arrayBufferToBase64(imageData)}" alt="Badge Preview" class="badge-preview-image" />`
            : `<div class="badge-preview-placeholder">🎖️</div>`
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
  document.getElementById('badgeMigrateBtn').addEventListener('click', () => handleBadgeMigration(migrationData));
  document.getElementById('badgeMigrateLaterBtn').addEventListener('click', () => hideBadgeModal('badgeMigrationModal'));
}

/**
 * Handle badge migration button click
 * @param {Object} migrationData - Migration data
 */
async function handleBadgeMigration(migrationData) {
  const btn = document.getElementById('badgeMigrateBtn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Migrating...';
  }

  try {
    // Check wallet connection
    if (!window.walletAPIInstance || !window.walletAPIInstance.isConnected()) {
      alert('Please connect your wallet first.');
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Migrate Badge';
      }
      return;
    }

    const { oldTier } = migrationData;
    const playerAddress = window.walletAPIInstance?.getAddress?.();

    if (!playerAddress) {
      throw new Error('Wallet not connected');
    }

    // Simply call the migration API - backend handles everything
    // The backend will create a new badge at the same tier using adminMintBadge
    // The new badge will use the current system's image URL generation automatically
    const result = await window.BadgeService.migrateBadge(playerAddress, oldTier);

    if (!result.success) {
      throw new Error(result.error || 'Failed to migrate badge');
    }
    
    console.log('✅ [BADGE] Badge migrated successfully! Transaction:', result.digest);
    alert('🎉 Badge migrated successfully!');
    hideBadgeModal('badgeMigrationModal');
    
    // Clear badge cache
    window.BadgeService.clearBadgeCache();
    
    // Reload badge display in menu after migration
    // Wait a moment for the transaction to be processed on-chain
    setTimeout(async () => {
      const playerAddress = window.walletAPIInstance?.getAddress?.();
      if (playerAddress) {
        // Dispatch a custom event to trigger badge reload
        // The menu system or other components can listen for this event
        if (window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('badgeMigrated', { 
            detail: { 
              address: playerAddress,
              digest: result.digest 
            } 
          }));
        }
        
        // Also try to directly reload badge if loadMenuBadgeDisplay is accessible
        // This function is defined in menu-system.js and should be in the same scope
        // We'll try to call it directly, or trigger through checkMEWSBalanceAndUpdateUI
        if (typeof checkMEWSBalanceAndUpdateUI === 'function') {
          // This function loads the badge as part of its process
          await checkMEWSBalanceAndUpdateUI(playerAddress);
        } else if (typeof loadMenuBadgeDisplay === 'function') {
          // Direct call if function is accessible
          await loadMenuBadgeDisplay(playerAddress);
        } else {
          console.log('⚠️ [BADGE] Could not find badge reload function. Badge will reload on next menu open.');
        }
      }
    }, 2000); // Wait 2 seconds for transaction to be processed on-chain
  } catch (error) {
    console.error('❌ [BADGE] Error migrating badge:', error);
    alert(`Failed to migrate badge: ${error.message}`);
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Migrate Badge';
    }
  }
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

  // Use imageUrl if available (from badge.image field), otherwise fall back to constructing from tier or imageData
  let imageSrc = null;
  
  // First, try to use imageUrl from badge
  if (badge.imageUrl && typeof badge.imageUrl === 'string' && (badge.imageUrl.startsWith('http://') || badge.imageUrl.startsWith('https://'))) {
    // Use the URL directly from the badge's image field (validate it's a real URL)
    imageSrc = badge.imageUrl;
    console.log('✅ [BADGE UI] Using badge imageUrl:', imageSrc);
  } else {
    // Log what we received for debugging
    console.log('🔍 [BADGE UI] Badge imageUrl value:', badge.imageUrl, 'Type:', typeof badge.imageUrl);
    
    // Fallback 1: Construct URL from tier
    const tierNames = ['Standard', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
    const tierName = tierNames[badge.tier] || 'Standard';
    const apiBaseUrl = window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3000/api';
    // Remove /api suffix if present, then add /Badges/
    const baseUrl = apiBaseUrl.replace(/\/api$/, '');
    const constructedUrl = `${baseUrl}/Badges/${tierName}.webp`;
    imageSrc = constructedUrl;
    console.log('✅ [BADGE UI] Constructed image URL from tier:', imageSrc);
    
    // Fallback 2: If we have imageData, use it instead
    if (badge.imageData && badge.imageData.length > 0) {
      // Fallback to base64 data URI for backwards compatibility
      imageSrc = `data:image/webp;base64,${arrayBufferToBase64(badge.imageData)}`;
      console.log('✅ [BADGE UI] Using badge imageData (base64) instead of constructed URL');
    }
  }

  // Construct fallback URL from tier in case image fails to load
  const tierNames = ['Standard', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
  const tierNameForUrl = tierNames[badge.tier] || 'Standard';
  const apiBaseUrl = window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3000/api';
  const baseUrl = apiBaseUrl.replace(/\/api$/, '');
  const fallbackUrl = `${baseUrl}/Badges/${tierNameForUrl}.webp`;
  
  const badgeHTML = `
    <div class="badge-display-container">
      <div class="badge-display-header">
        <h3>🎖️ Your Badge</h3>
      </div>
      <div class="badge-display-content">
        ${imageSrc 
          ? `<img src="${imageSrc}" alt="Badge" class="badge-display-image" onerror="this.onerror=null; this.src='${fallbackUrl}'; console.warn('⚠️ [BADGE UI] Image failed to load, using fallback:', '${fallbackUrl}');" />`
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
    showBadgeMigrationModal,
    displayBadgeInUI,
    hideBadgeModal,
    arrayBufferToBase64,
  };
}

