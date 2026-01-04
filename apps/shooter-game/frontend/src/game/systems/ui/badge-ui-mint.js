// ==========================================
// BADGE UI MINT - Badge Minting Flow
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

log.info('BADGE UI MINT', 'Badge UI mint module loaded');

/**
 * Handle badge mint button click
 */
async function handleBadgeMint() {
  if (window.BadgeUIService && window.BadgeUIService.isTransactionInProgress('mint')) {
    log.debug('⏭️ [BADGE MINT] Mint already in progress, ignoring duplicate call');
    return;
  }
  
  const btn = document.getElementById('badgeMintBtn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Minting...';
  }
  
  if (window.BadgeUIService) {
    window.BadgeUIService.setTransactionInProgress('mint', true);
  }

  try {
    // Check wallet connection
    if (!window.walletAPIInstance || !window.walletAPIInstance.isConnected()) {
      alert('Please connect your wallet first.');
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Mint Badge ($0.10)';
      }
      if (window.BadgeUIService) {
        window.BadgeUIService.setTransactionInProgress('mint', false);
      }
      return;
    }

    // Build mint transaction (fully client-side)
    // Flow: Find coin → Estimate gas → Calculate fee (0.1 SUI - gas) → Build transaction
    log.debug('BADGE MINT', '========== BADGE MINTING FLOW START ==========');
    log.debug('BADGE MINT', 'Step 1: Building mint transaction...');
    const result = await window.BadgeService.buildMintBadgeTransaction();
    
    log.debug('BADGE MINT', 'Build result', {
      success: result.success,
      hasTransaction: !!result.transaction,
      error: result.error,
    });
    
    if (!result.success) {
      log.error('BADGE MINT', 'Transaction build failed', result.error);
      throw new Error(result.error || 'Failed to build mint transaction');
    }
    
    log.debug('BADGE MINT', 'Step 1 complete: Transaction built successfully');
    log.debug('BADGE MINT', 'Step 2: Requesting wallet signature...');

    // Sign and execute transaction (result.transaction is Transaction object)
    const txResult = await window.BadgeService.signAndExecuteBadgeTransaction(result.transaction);
    
    log.debug('BADGE MINT', 'Execution result', {
      success: txResult.success,
      digest: txResult.digest,
      error: txResult.error,
      hasEffects: !!txResult.effects,
    });
    
    if (txResult.success) {
      log.info('BADGE MINT', '========== BADGE MINTING SUCCESS ==========');
      log.info('BADGE MINT', 'Transaction digest', txResult.digest);
      log.debug('BADGE MINT', 'Showing success message to user...');
      
      alert('🎉 Badge minted successfully!');
      
      log.debug('BADGE MINT', 'Hiding badge modal...');
      if (typeof window.hideBadgeModal === 'function') {
        window.hideBadgeModal('badgeMintingModal');
      }
      
      log.debug('BADGE MINT', 'Hiding badge modal...');
      // Clear badge cache (BadgeService internal cache)
      window.BadgeService.clearBadgeCache();
      log.debug('BADGE MINT', 'Badge cache cleared');
      
      // Invalidate API request cache
      const walletAddress = window.walletAPIInstance?.getAddress() || 
                           (typeof getPlayerAddress === 'function' ? getPlayerAddress() : null);
      if (window.apiRequestCache && walletAddress) {
        window.apiRequestCache.recordTransaction(walletAddress, txResult.digest, 'badge_mint');
        log.debug('✅ [BADGE MINT] API cache invalidated for badge mint');
      }
      
      // Mark that we just minted a badge (prevents migration check from running immediately)
      if (window.BadgeService) {
        window.BadgeService._lastMintTime = Date.now();
        log.debug('BADGE MINT', 'Set _lastMintTime to prevent migration check');
      }
      
      if (window.BadgeUIService) {
        window.BadgeUIService.setLastTransactionTime('mint', Date.now());
      }
      
      // Hide any existing migration modal (in case it was shown before mint)
      const migrationModal = document.getElementById('badgeMigrationModal');
      if (migrationModal && typeof window.hideBadgeModal === 'function') {
        log.debug('BADGE MINT', 'Hiding migration modal after successful mint');
        window.hideBadgeModal('badgeMigrationModal');
      }
      
      // Wait for transaction to be indexed on blockchain using smart polling
      // Show loading modal during this wait and badge reload
      if (typeof showLoadingModal === 'function') {
        showLoadingModal('Waiting for transaction to be indexed... Please wait', 'gameDataLoadingModal');
      }
      log.debug('BADGE MINT', 'Waiting for transaction to be indexed...');
      
      // Use smart polling to check for new badge (exits early when ready)
      try {
        if (window.SmartPolling && window.BadgeService) {
          const walletAddress = window.walletAPIInstance?.getAddress() || 
                               (typeof getPlayerAddress === 'function' ? getPlayerAddress() : null);
          if (walletAddress) {
            await window.SmartPolling.pollUntil(async () => {
              // Clear cache before checking
              window.BadgeService.clearBadgeCache();
              const badge = await window.BadgeService.getBadge(walletAddress, { bypassCache: true });
              return badge && badge.exists;
            }, {
              interval: 500,    // Check every 500ms
              maxWait: 3000,     // Maximum 3 seconds
              timeout: 8000,     // Fail after 8 seconds
              context: 'Badge Mint Indexing',
              onCheck: (checkCount, elapsed) => {
                if (typeof updateLoadingModalMessage === 'function') {
                  updateLoadingModalMessage(`Waiting for transaction to be indexed... (${Math.round(elapsed / 1000)}s)`, 'gameDataLoadingModal');
                }
              }
            });
            log.debug('✅ [BADGE MINT] Badge creation confirmed via polling');
          } else {
            // No wallet address, use fallback
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        } else {
          // Fallback to fixed delay if SmartPolling not available
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      } catch (error) {
        log.warn('BADGE MINT', 'Polling timeout, using fallback delay', error);
        // Fallback to fixed delay if polling fails
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      // Clear cache again before reloading to ensure fresh data
      window.BadgeService.clearBadgeCache();
      log.debug('BADGE MINT', 'Cleared badge cache before reload');
      
      // Update loading message for badge reload
      if (typeof updateLoadingModalMessage === 'function') {
        updateLoadingModalMessage('Loading badge data... Please wait', 'gameDataLoadingModal');
      }
      
      // Reload badge display to show the new badge
      // This fetches fresh badge data from the blockchain (not from cache)
      // loadMenuBadgeDisplay() will call BadgeService.getBadge() which queries the blockchain
      log.debug('BADGE MINT', 'Reloading badge display with fresh data from blockchain...');
      const playerAddress = window.walletAPIInstance?.getAddress();
      if (playerAddress && typeof loadMenuBadgeDisplay === 'function') {
        await loadMenuBadgeDisplay(playerAddress);
        log.debug('BADGE MINT', 'Badge display reloaded with fresh data');
      }
      
      // Loading modal will be hidden by loadMenuBadgeDisplay() when complete
      
      log.info('BADGE MINT', '========== BADGE MINTING FLOW COMPLETE ==========');
    } else {
      log.error('BADGE MINT', '========== BADGE MINTING FAILED ==========');
      log.error('BADGE MINT', 'Error', txResult.error);
      log.error('BADGE MINT', 'Digest', txResult.digest);
      log.error('BADGE MINT', 'Effects', txResult.effects);
      throw new Error(txResult.error || 'Transaction failed');
    }
  } catch (error) {
    log.error('BADGE MINT', 'Error minting badge', error);
    
    // Hide loading modal on error
    if (typeof hideLoadingModal === 'function') {
      hideLoadingModal('gameDataLoadingModal');
    }
    
    alert(`Failed to mint badge: ${error.message}`);
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Mint Badge ($0.10)';
    }
  } finally {
    if (window.BadgeUIService) {
      window.BadgeUIService.setTransactionInProgress('mint', false);
    }
  }
}

/**
 * Handle "Maybe Later" button click
 */
function handleBadgeMaybeLater() {
  log.debug('BADGE MINT', 'User chose "Maybe Later"');
  
  // Mark data as loaded so game can proceed
  if (typeof GameDataState !== 'undefined') {
    GameDataState.markDataLoaded();
    log.debug('BADGE MINT', 'User clicked "Maybe Later" - data marked as loaded, will prompt again on next game completion');
  }
  
  if (typeof window.hideBadgeModal === 'function') {
    window.hideBadgeModal('badgeMintingModal');
  }
  // Note: Will prompt again on next game completion
}

// Expose globally
if (typeof window !== 'undefined') {
  window.handleBadgeMint = handleBadgeMint;
  window.handleBadgeMaybeLater = handleBadgeMaybeLater;
}

