// ==========================================
// BADGE UI MIGRATION - Badge Migration Flow
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

log.info('BADGE UI MIGRATION', 'Badge UI migration module loaded');

/**
 * Handle badge migration button click
 * @param {Object} migrationData - Migration data
 */
async function handleBadgeMigration(migrationData) {
  if (window.BadgeUIService && window.BadgeUIService.isTransactionInProgress('migration')) {
    log.debug('BADGE MIGRATION', 'Migration already in progress, ignoring duplicate call');
    return;
  }
  
  const btn = document.getElementById('badgeMigrateBtn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Migrating...';
  }
  
  if (window.BadgeUIService) {
    window.BadgeUIService.setTransactionInProgress('migration', true);
  }

  try {
    // Check wallet connection
    if (!window.walletAPIInstance || !window.walletAPIInstance.isConnected()) {
      alert('Please connect your wallet first.');
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Migrate Badge';
      }
      if (window.BadgeUIService) {
        window.BadgeUIService.setTransactionInProgress('migration', false);
      }
      return;
    }

    const { oldTier, oldGamesPlayed = 0, oldMintDate = 0 } = migrationData;
    const playerAddress = window.walletAPIInstance?.getAddress?.();

    if (!playerAddress) {
      throw new Error('Wallet not connected');
    }

    // Build migration transaction (backend returns transaction for player to sign)
    log.debug('BADGE MIGRATION', '========== BADGE MIGRATION FLOW START ==========');
    log.debug('BADGE MIGRATION', 'Step 1: Building migration transaction...');
    log.debug('BADGE MIGRATION', 'Migration data', { oldTier, oldGamesPlayed, oldMintDate });
    const result = await window.BadgeService.migrateBadge(
      playerAddress, 
      oldTier, 
      oldGamesPlayed, 
      oldMintDate
    );
    
    log.debug('BADGE MIGRATION', 'Build result', {
      success: result.success,
      hasTransaction: !!result.transaction,
      error: result.error,
    });
    
    if (!result.success) {
      log.error('BADGE MIGRATION', 'Migration failed', result.error);
      throw new Error(result.error || 'Failed to migrate badge');
    }
    
    // If transaction is returned, player needs to sign it
    if (result.transaction) {
      log.debug('BADGE MIGRATION', 'Step 1 complete: Transaction built successfully');
      log.debug('BADGE MIGRATION', 'Step 2: Requesting wallet signature...');
      
      // Sign and execute transaction
      const txResult = await window.BadgeService.signAndExecuteBadgeTransaction(result.transaction);
      
      log.debug('BADGE MIGRATION', 'Execution result', {
        success: txResult.success,
        digest: txResult.digest,
        error: txResult.error,
      });
      
      if (!txResult.success) {
        log.error('BADGE MIGRATION', 'Transaction execution failed', txResult.error);
        throw new Error(txResult.error || 'Transaction failed');
      }
      
      log.info('BADGE MIGRATION', '========== BADGE MIGRATION SUCCESS ==========');
      log.info('BADGE MIGRATION', 'Transaction digest', txResult.digest);
      log.debug('BADGE MIGRATION', 'Showing success message to user...');
      
      alert('🎉 Badge migrated successfully!');
      
      log.debug('BADGE MIGRATION', 'Hiding badge modal...');
      if (typeof window.hideBadgeModal === 'function') {
        window.hideBadgeModal('badgeMigrationModal');
      }
      
      log.debug('BADGE MIGRATION', 'Clearing badge cache...');
      // Clear badge cache (BadgeService internal cache)
      window.BadgeService.clearBadgeCache();
      log.debug('BADGE MIGRATION', 'Badge cache cleared');
      
      // Invalidate API request cache
      const walletAddress = window.walletAPIInstance?.getAddress() || 
                           (typeof getPlayerAddress === 'function' ? getPlayerAddress() : null);
      if (window.apiRequestCache && walletAddress) {
        window.apiRequestCache.recordTransaction(walletAddress, txResult.digest, 'badge_migration');
        log.debug('✅ [BADGE MIGRATION] API cache invalidated for badge migration');
      }
      
      if (window.BadgeUIService) {
        window.BadgeUIService.setLastTransactionTime('migration', Date.now());
      }
      
      // Wait for transaction to be indexed on blockchain (3 seconds)
      // Show loading modal during this wait and badge reload
      if (typeof showLoadingModal === 'function') {
        showLoadingModal('Waiting for transaction to be indexed... Please wait', 'gameDataLoadingModal');
      }
      log.debug('BADGE MIGRATION', 'Waiting for transaction to be indexed...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Clear cache again before reloading to ensure fresh data
      window.BadgeService.clearBadgeCache();
      log.debug('BADGE MIGRATION', 'Cleared badge cache before reload');
      
      // Update loading message for badge reload
      if (typeof updateLoadingModalMessage === 'function') {
        updateLoadingModalMessage('Loading badge data... Please wait', 'gameDataLoadingModal');
      }
      
      // Reload badge display to show the migrated badge
      // This fetches fresh badge data from the blockchain (not from cache)
      // loadMenuBadgeDisplay() will call BadgeService.getBadge() which queries the blockchain
      log.debug('BADGE MIGRATION', 'Reloading badge display with fresh data from blockchain...');
      if (playerAddress && typeof loadMenuBadgeDisplay === 'function') {
        await loadMenuBadgeDisplay(playerAddress);
        log.debug('BADGE MIGRATION', 'Badge display reloaded with fresh data');
      }
      
      // Loading modal will be hidden by loadMenuBadgeDisplay() when complete
      
      log.info('BADGE MIGRATION', '========== BADGE MIGRATION FLOW COMPLETE ==========');
    } else if (result.digest) {
      // Legacy: If digest is returned (already executed), just reload
      log.info('BADGE MIGRATION', 'Badge migrated successfully! Transaction', result.digest);
      alert('🎉 Badge migrated successfully!');
      if (typeof window.hideBadgeModal === 'function') {
        window.hideBadgeModal('badgeMigrationModal');
      }
      
      // Clear badge cache
      window.BadgeService.clearBadgeCache();
      
      // Wait for transaction to be indexed using smart polling
      // Show loading modal during this wait and badge reload
      if (typeof showLoadingModal === 'function') {
        showLoadingModal('Waiting for transaction to be indexed... Please wait', 'gameDataLoadingModal');
      }
      log.debug('⏳ [BADGE MIGRATION] Waiting for transaction to be indexed...');
      
      // Use smart polling to check for migrated badge (exits early when ready)
      try {
        if (window.SmartPolling && window.BadgeService) {
          await window.SmartPolling.pollUntil(async () => {
            // Clear cache before checking
            window.BadgeService.clearBadgeCache();
            const badge = await window.BadgeService.getBadge(walletAddress, { bypassCache: true });
            return badge && badge.exists;
          }, {
            interval: 500,    // Check every 500ms
            maxWait: 3000,     // Maximum 3 seconds
            timeout: 8000,     // Fail after 8 seconds
            context: 'Badge Migration Indexing',
            onCheck: (checkCount, elapsed) => {
              if (typeof updateLoadingModalMessage === 'function') {
                updateLoadingModalMessage(`Waiting for transaction to be indexed... (${Math.round(elapsed / 1000)}s)`, 'gameDataLoadingModal');
              }
            }
          });
          log.debug('✅ [BADGE MIGRATION] Badge migration confirmed via polling');
        } else {
          // Fallback to fixed delay if SmartPolling not available
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      } catch (error) {
        log.warn('BADGE MIGRATION', 'Polling timeout, using fallback delay', error);
        // Fallback to fixed delay if polling fails
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      // Clear cache again and reload
      window.BadgeService.clearBadgeCache();
      const playerAddress = window.walletAPIInstance?.getAddress?.();
      if (playerAddress && typeof loadMenuBadgeDisplay === 'function') {
        await loadMenuBadgeDisplay(playerAddress);
      }
    }
  } catch (error) {
    log.error('BADGE MIGRATION', 'Error migrating badge', error);
    
    // Hide loading modal on error
    if (typeof hideLoadingModal === 'function') {
      hideLoadingModal('gameDataLoadingModal');
    }
    
    alert(`Failed to migrate badge: ${error.message}`);
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Migrate Badge';
    }
  } finally {
    if (window.BadgeUIService) {
      window.BadgeUIService.setTransactionInProgress('migration', false);
    }
  }
}

// Expose globally
if (typeof window !== 'undefined') {
  window.handleBadgeMigration = handleBadgeMigration;
}

