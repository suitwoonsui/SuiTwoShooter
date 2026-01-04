// ==========================================
// GAME DATA FLOW WALLET - Wallet Event Handling
// ==========================================

console.log('✅ [GAME DATA FLOW WALLET] Game data flow wallet module loaded');

/**
 * Handle wallet connected
 * @param {string} address - Wallet address
 */
function onWalletConnected(address) {
  if (!window.GameDataFlowService) {
    console.error('❌ [FLOW WALLET] GameDataFlowService not available');
    return;
  }
  
  // Check for duplicate events
  const event = { type: 'connected', address };
  if (!window.GameDataFlowService._shouldProcessEvent(event)) {
    return; // Duplicate event, skip processing
  }
  
  console.log('🔄 [FLOW WALLET] Processing wallet connected event:', address);
  
  // Clear any active loads for other addresses
  if (window.GameDataFlowService._activeLoads.size > 0) {
    console.log('🔄 [FLOW WALLET] Clearing active loads due to wallet change');
    window.GameDataFlowService.clearActiveLoads();
  }
  
  // Clear previous state
  const badgeDisplay = document.getElementById('menuBadgeDisplay');
  if (badgeDisplay) {
    badgeDisplay.style.display = 'none';
    badgeDisplay.innerHTML = '';
  }
  
  // Clear game pass display (credits and tickets) when wallet changes
  if (window.GamePassDisplay && typeof window.GamePassDisplay.clear === 'function') {
    window.GamePassDisplay.clear();
    console.log('🔄 [FLOW WALLET] Cleared game pass display due to wallet change');
  }
  
  GameDataState.reset();
  GameDataState.setWalletAddress(address);
  
  // Load game data (deduplication handled in load())
  window.GameDataFlowService.load(address).catch(err => {
    console.error('❌ [FLOW WALLET] Error in onWalletConnected:', err);
  });
  
  // Clear eligible milestones cache when wallet changes (force fresh fetch)
  // This ensures the badge shows correct count for the new wallet
  if (typeof window.clearEligibleMilestonesCache === 'function') {
    window.clearEligibleMilestonesCache();
  }
  
  // Update leaderboard claim badge when wallet connects (force refresh to bypass cache)
  if (typeof window.updateLeaderboardClaimBadge === 'function') {
    // Use forceRefresh=true to bypass cache and get fresh data for new wallet
    window.updateLeaderboardClaimBadge(null, true).catch(err => {
      console.warn('⚠️ [FLOW WALLET] Failed to update leaderboard claim badge:', err);
    });
  }
  
  // Check for eligible milestones when wallet connects
  // This uses the same async check function used after score submission
  if (typeof window.checkAchievementsAsync === 'function') {
    window.checkAchievementsAsync(address).catch(err => {
      console.warn('⚠️ [FLOW WALLET] Failed to check achievements on wallet connect:', err);
      // Silently fail - don't interrupt user flow
    });
  }
}

/**
 * Handle wallet disconnected
 */
function onWalletDisconnected() {
  if (!window.GameDataFlowService) {
    console.error('❌ [FLOW WALLET] GameDataFlowService not available');
    return;
  }
  
  // Check for duplicate events
  const event = { type: 'disconnected', address: null };
  if (!window.GameDataFlowService._shouldProcessEvent(event)) {
    return; // Duplicate event, skip processing
  }
  
  console.log('🔄 [FLOW WALLET] Processing wallet disconnected event');
  
  // Clear any active loads
  window.GameDataFlowService.clearActiveLoads();
  
  GameDataState.reset();
  LoadingManager.reset();
  
  const badgeDisplay = document.getElementById('menuBadgeDisplay');
  if (badgeDisplay) {
    badgeDisplay.style.display = 'none';
    badgeDisplay.innerHTML = '';
  }
  
  // Clear eligible milestones cache when wallet disconnects
  if (typeof window.clearEligibleMilestonesCache === 'function') {
    window.clearEligibleMilestonesCache();
  }
  
  // Hide leaderboard claim badge when wallet disconnects
  const claimBadge = document.getElementById('leaderboardClaimBadge');
  if (claimBadge) {
    claimBadge.style.display = 'none';
  }
  
  // Also hide the tab badge
  const tabBadge = document.getElementById('milestonesTabBadge');
  if (tabBadge) {
    tabBadge.style.display = 'none';
  }
  
  // Clear game pass display (credits and tickets) when wallet disconnects
  if (window.GamePassDisplay && typeof window.GamePassDisplay.clear === 'function') {
    window.GamePassDisplay.clear();
    console.log('🔄 [FLOW WALLET] Cleared game pass display due to wallet disconnect');
  }
  
  // Update button text to show "Start Demo" when wallet disconnects
  if (typeof GameService !== 'undefined' && GameService.updateStartButtonText) {
    GameService.updateStartButtonText(false).catch(err => {
      console.warn('⚠️ [FLOW WALLET] Failed to update button text on disconnect', err);
    });
  }
  
  if (typeof disableStartGameButton === 'function') {
    disableStartGameButton();
  }
}

/**
 * Handle returning to menu from game
 */
function onReturnToMenu() {
  // If badge is already loaded, re-render it so registry games are fresh
  // This ensures the badge's "Games" count matches the main menu stats
  if (GameDataState.badge && GameDataState.walletAddress) {
    const badgeDisplay = document.getElementById('menuBadgeDisplay');
    if (badgeDisplay) {
      // Clear existing contents so we don't show stale game count
      badgeDisplay.innerHTML = '';
    }
    
    // Re-display badge using latest registry stats (async, no loading modal)
    if (typeof window.displayBadge === 'function') {
      window.displayBadge(GameDataState.badge).catch(err => {
        console.error('❌ [FLOW WALLET] Error re-displaying badge on return to menu:', err);
      });
    }
    
    // Update leaderboard claim badge when returning to menu (force refresh to get latest count)
    if (window.walletAPIInstance && window.walletAPIInstance.isConnected()) {
      if (typeof window.updateLeaderboardClaimBadge === 'function') {
        // Use forceRefresh=true to bypass cache and get fresh data
        window.updateLeaderboardClaimBadge(null, true).catch(err => {
          console.warn('⚠️ [FLOW WALLET] Failed to update leaderboard claim badge on return to menu:', err);
        });
      }
    }
    return;
  }
  
  // Otherwise, reload everything (deduplication handled in load())
  if (GameDataState.walletAddress && window.GameDataFlowService) {
    window.GameDataFlowService.load(GameDataState.walletAddress).catch(err => {
      console.error('❌ [FLOW WALLET] Error reloading on return to menu:', err);
    });
    
    // Update leaderboard claim badge after reload (force refresh)
    if (window.walletAPIInstance && window.walletAPIInstance.isConnected()) {
      if (typeof window.updateLeaderboardClaimBadge === 'function') {
        // Small delay to ensure data is loaded, then update badge
        setTimeout(() => {
          window.updateLeaderboardClaimBadge(null, true).catch(err => {
            console.warn('⚠️ [FLOW WALLET] Failed to update leaderboard claim badge after reload:', err);
          });
        }, 500);
      }
    }
  }
}

// Expose globally
if (typeof window !== 'undefined') {
  window.onWalletConnected = onWalletConnected;
  window.onWalletDisconnected = onWalletDisconnected;
  window.onReturnToMenu = onReturnToMenu;
}

