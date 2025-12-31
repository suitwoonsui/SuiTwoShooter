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
  
  // Update leaderboard claim badge when wallet connects
  if (typeof window.updateLeaderboardClaimBadge === 'function') {
    window.updateLeaderboardClaimBadge().catch(err => {
      console.warn('⚠️ [FLOW WALLET] Failed to update leaderboard claim badge:', err);
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
  
  // Hide leaderboard claim badge when wallet disconnects
  const claimBadge = document.getElementById('leaderboardClaimBadge');
  if (claimBadge) {
    claimBadge.style.display = 'none';
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
    return;
  }
  
  // Otherwise, reload everything (deduplication handled in load())
  if (GameDataState.walletAddress && window.GameDataFlowService) {
    window.GameDataFlowService.load(GameDataState.walletAddress).catch(err => {
      console.error('❌ [FLOW WALLET] Error reloading on return to menu:', err);
    });
  }
}

// Expose globally
if (typeof window !== 'undefined') {
  window.onWalletConnected = onWalletConnected;
  window.onWalletDisconnected = onWalletDisconnected;
  window.onReturnToMenu = onReturnToMenu;
}

