// ==========================================
// BADGE UI UPGRADE - Badge Upgrade Flow
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

log.info('BADGE UI UPGRADE', 'Badge UI upgrade module loaded');

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
 * Handle badge upgrade button click
 * @param {Object} upgradeData - Transaction data from backend
 * @param {Function} onComplete - Optional callback when upgrade completes
 */
async function handleBadgeUpgrade(upgradeData, onComplete = null) {
  if (window.BadgeUIService && window.BadgeUIService.isTransactionInProgress('upgrade')) {
    log.debug('⏭️ [BADGE UPGRADE] Upgrade already in progress, ignoring duplicate call');
    return;
  }
  
  const btn = document.getElementById('badgeUpgradeBtn');
  const errorMessage = document.getElementById('badgeUpgradeError');
  
  // Clear any previous error messages
  if (errorMessage) {
    errorMessage.style.display = 'none';
    errorMessage.textContent = '';
  }
  
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Upgrading...';
  }
  
  if (window.BadgeUIService) {
    window.BadgeUIService.setTransactionInProgress('upgrade', true);
  }

  try {
    // Check wallet connection
    if (!window.walletAPIInstance || !window.walletAPIInstance.isConnected()) {
      showUpgradeError('Please connect your wallet first.');
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Upgrade Badge';
      }
      if (window.BadgeUIService) {
        window.BadgeUIService.setTransactionInProgress('upgrade', false);
      }
      return;
    }

    // Extract upgrade data
    const { badgeId, newTier, sessionId } = upgradeData;
    if (!badgeId || newTier === undefined || !sessionId) {
      showUpgradeError('Missing upgrade data. Please try again.');
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Upgrade Badge';
      }
      if (window.BadgeUIService) {
        window.BadgeUIService.setTransactionInProgress('upgrade', false);
      }
      return;
    }

    // Build upgrade transaction (fully client-side, like mint)
    // Flow: Backend builds transaction → Frontend signs it
    log.debug('BADGE UPGRADE', '========== BADGE UPGRADE FLOW START ==========');
    log.debug('BADGE UPGRADE', 'Step 1: Building upgrade transaction...');
    const result = await window.BadgeService.buildUpgradeBadgeTransaction(badgeId, newTier, sessionId);
    
    log.debug('📋 [BADGE UPGRADE] Build result:', {
      success: result.success,
      hasTransaction: !!result.transaction,
      error: result.error,
    });
    
    if (!result.success) {
      log.error('❌ [BADGE UPGRADE] Transaction build failed:', result.error);
      throw new Error(result.error || 'Failed to build upgrade transaction');
    }
    
    log.debug('✅ [BADGE UPGRADE] Step 1 complete: Transaction built successfully');
    log.debug('🎖️ [BADGE UPGRADE] Step 2: Requesting wallet signature...');

    // Sign and execute transaction (result.transaction is base64 string, like mint)
    let txResult;
    try {
      txResult = await window.BadgeService.signAndExecuteBadgeTransaction(result.transaction);
    } catch (error) {
      log.error('❌ [BADGE UPGRADE] Transaction execution error:', error);
      // Reset button state on error
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Upgrade Badge ($0.10)';
      }
      if (errorMessage) {
        errorMessage.style.display = 'block';
        errorMessage.style.color = '#ff4444';
        errorMessage.textContent = `❌ Error: ${error.message || 'Transaction failed'}`;
      }
      if (window.BadgeUIService) {
        window.BadgeUIService.setTransactionInProgress('upgrade', false);
      }
      throw error;
    }
    
    log.debug('📋 [BADGE UPGRADE] Execution result:', {
      success: txResult.success,
      digest: txResult.digest,
      error: txResult.error,
      hasEffects: !!txResult.effects,
    });
    
    // Even if verification fails, if transaction succeeded, treat as success
    // Verification failure is usually just indexing delay
    if (txResult.success) {
    log.info('BADGE UPGRADE', '========== BADGE UPGRADE SUCCESS ==========');
    log.info('BADGE UPGRADE', 'Transaction digest', txResult.digest);
    log.debug('BADGE UPGRADE', 'Showing success message to user...');
      
      // Show success message in modal before closing
      if (errorMessage) {
        errorMessage.style.display = 'block';
        errorMessage.style.color = '#39ff14';
        errorMessage.textContent = '✅ Badge upgraded successfully!';
      }
      
      // Wait a moment to show success message (optimized: 1500ms → 1000ms)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      log.debug('🎖️ [BADGE UPGRADE] Hiding badge modal...');
      if (typeof window.hideBadgeModal === 'function') {
        window.hideBadgeModal('badgeUpgradeModal');
      }
      
      log.debug('🎖️ [BADGE UPGRADE] Clearing badge cache...');
      // Clear badge cache (BadgeService internal cache)
      window.BadgeService.clearBadgeCache();
      log.debug('✅ [BADGE UPGRADE] Badge cache cleared');
      
      // Invalidate API request cache
      const walletAddress = window.walletAPIInstance?.getAddress() || 
                           (typeof getPlayerAddress === 'function' ? getPlayerAddress() : null);
      if (window.apiRequestCache && walletAddress) {
        window.apiRequestCache.recordTransaction(walletAddress, txResult.digest, 'badge_upgrade');
        log.debug('✅ [BADGE UPGRADE] API cache invalidated for badge upgrade');
      }
      
      if (window.BadgeUIService) {
        window.BadgeUIService.setLastTransactionTime('upgrade', Date.now());
      }
      
      // Wait for transaction to be indexed on blockchain using smart polling
      // Show loading modal during this wait and badge reload
      if (typeof showLoadingModal === 'function') {
        showLoadingModal('Waiting for transaction to be indexed... Please wait', 'gameDataLoadingModal');
      }
      log.debug('⏳ [BADGE UPGRADE] Waiting for transaction to be indexed...');
      
      // Use smart polling to check for updated badge tier (exits early when ready)
      try {
        if (window.SmartPolling && window.BadgeService) {
          const expectedTier = newTier;
          const walletAddress = window.walletAPIInstance?.getAddress() || 
                               (typeof getPlayerAddress === 'function' ? getPlayerAddress() : null);
          if (walletAddress) {
            await window.SmartPolling.pollUntil(async () => {
              // Clear cache before checking
              window.BadgeService.clearBadgeCache();
              const badge = await window.BadgeService.getBadge(walletAddress, { bypassCache: true });
              return badge && badge.tier === expectedTier;
            }, {
            interval: 500,    // Check every 500ms
            maxWait: 5000,     // Maximum 5 seconds
            timeout: 10000,    // Fail after 10 seconds
            context: 'Badge Upgrade Indexing',
            onCheck: (checkCount, elapsed) => {
              if (typeof updateLoadingModalMessage === 'function') {
                updateLoadingModalMessage(`Waiting for transaction to be indexed... (${Math.round(elapsed / 1000)}s)`, 'gameDataLoadingModal');
              }
            }
          });
          log.debug('✅ [BADGE UPGRADE] Badge tier updated confirmed via polling');
          } else {
            // No wallet address, use fallback
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        } else {
          // Fallback to fixed delay if SmartPolling not available
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      } catch (error) {
        log.warn('BADGE UPGRADE', 'Polling timeout, using fallback delay', error);
        // Fallback to fixed delay if polling fails
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
      // Clear cache again before reloading to ensure fresh data
      window.BadgeService.clearBadgeCache();
      log.debug('🗑️ [BADGE UPGRADE] Cleared badge cache before reload');
      
      // Skip upgrade check on next load since we just completed an upgrade
      // This prevents the upgrade modal from showing again immediately
      if (typeof GameDataState !== 'undefined' && GameDataState.setSkipUpgradeCheck) {
        GameDataState.setSkipUpgradeCheck(true);
        log.debug('⏭️ [BADGE UPGRADE] Set skip upgrade check flag to prevent immediate re-check');
      }
      
      // Update loading message for badge reload
      if (typeof updateLoadingModalMessage === 'function') {
        updateLoadingModalMessage('Loading badge data... Please wait', 'gameDataLoadingModal');
      }
      
      // Retry badge reload up to 3 times to ensure we get the updated tier
      // Blockchain indexing can be slow, so we retry with delays
      log.debug('🔄 [BADGE UPGRADE] Reloading badge display with fresh data from blockchain...');
      const playerAddress = window.walletAPIInstance?.getAddress();
      
      // Force refresh badge data (bypass cache)
      if (playerAddress && window.apiRequestCache) {
        // Invalidate cache again to ensure fresh data
        window.apiRequestCache.invalidate(`badge:${playerAddress}`);
      }
      
      if (playerAddress && typeof loadMenuBadgeDisplay === 'function') {
        let reloadAttempts = 0;
        const maxReloadAttempts = 3;
        
        while (reloadAttempts < maxReloadAttempts) {
          reloadAttempts++;
          if (reloadAttempts > 1) {
            log.debug(`🔄 [BADGE UPGRADE] Retry ${reloadAttempts}/${maxReloadAttempts} - waiting for badge tier to update...`);
            // Optimized: 3000ms → 2000ms between retries
            await new Promise(resolve => setTimeout(resolve, 2000));
            window.BadgeService.clearBadgeCache(); // Clear cache before each retry
          }
          
          await loadMenuBadgeDisplay(playerAddress);
          
          // Check if badge tier was updated by checking GameDataState or badge data
          let currentTier = null;
          if (typeof GameDataState !== 'undefined' && GameDataState.badge && GameDataState.badge.badge) {
            currentTier = GameDataState.badge.badge.tier;
          } else {
            // Fallback: try to get badge data directly
            try {
              const badgeData = await window.BadgeService.getBadge(playerAddress);
              if (badgeData && badgeData.success && badgeData.badge) {
                currentTier = badgeData.badge.tier;
              }
            } catch (error) {
              log.warn('⚠️ [BADGE UPGRADE] Could not check badge tier:', error);
            }
          }
          
          // If tier is still 0 and we expected it to be upgraded, retry
          if (currentTier !== null && currentTier === 0 && newTier > 0) {
            if (reloadAttempts < maxReloadAttempts) {
              log.debug(`⚠️ [BADGE UPGRADE] Badge tier still ${currentTier} (expected ${newTier}), retrying (attempt ${reloadAttempts + 1}/${maxReloadAttempts})...`);
              continue;
            } else {
              log.warn(`⚠️ [BADGE UPGRADE] Badge tier may not be updated yet (still ${currentTier}, expected ${newTier}) - blockchain indexing may take longer`);
              log.warn('⚠️ [BADGE UPGRADE] The badge will refresh automatically on next page load or manual refresh');
            }
          } else if (currentTier !== null && currentTier === newTier) {
            log.debug(`✅ [BADGE UPGRADE] Badge tier successfully updated to ${newTier}!`);
          }
          
          break; // Success or max attempts reached
        }
        
        log.debug('✅ [BADGE UPGRADE] Badge display reloaded with fresh data');
      }
      
      // Loading modal will be hidden by loadMenuBadgeDisplay() when complete
      
      log.info('BADGE UPGRADE', '========== BADGE UPGRADE FLOW COMPLETE ==========');
      
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
      
      // Reset button state before showing error
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Upgrade Badge ($0.10)';
      }
      
      showUpgradeError(userFriendlyError);
      throw new Error(userFriendlyError);
    }
  } catch (error) {
    log.error('❌ [BADGE UPGRADE] Error upgrading badge:', error);
    
    // Reset button state on error (always reset, even if already reset)
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Upgrade Badge ($0.10)';
    }
    
    // Hide loading modal on error
    if (typeof hideLoadingModal === 'function') {
      hideLoadingModal('gameDataLoadingModal');
    }
    
    // Show error in modal (already shown by showUpgradeError if it was called)
    if (!errorMessage || errorMessage.style.display === 'none') {
      showUpgradeError(`Failed to upgrade badge: ${error.message || 'Unknown error'}`);
    }
    
    // Don't call callback on error - keep modal open so user can retry
    // Only call callback if explicitly requested (e.g., for store flow)
    // For now, we'll keep modal open on error
  } finally {
    if (window.BadgeUIService) {
      window.BadgeUIService.setTransactionInProgress('upgrade', false);
    }
  }
}

// Expose globally
if (typeof window !== 'undefined') {
  window.handleBadgeUpgrade = handleBadgeUpgrade;
  window.showUpgradeError = showUpgradeError;
}

