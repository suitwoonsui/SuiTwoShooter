// ==========================================
// GAME DATA FLOW WALLET - Wallet Event Handling
// ==========================================

console.log('✅ [GAME DATA FLOW WALLET] Game data flow wallet module loaded');

/**
 * Handle wallet connected
 * @param {string} address - Wallet address
 * @returns {Promise<void>|undefined}
 */
function onWalletConnected(address) {
  if (!window.GameDataFlowService) {
    console.error('❌ [FLOW WALLET] GameDataFlowService not available');
    return;
  }
  
  // Treat zero address as "not connected" so we don't call APIs before real login
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000000000000000000000000000';
  if (!address || address === ZERO_ADDRESS || address.toLowerCase() === ZERO_ADDRESS) {
    console.log('🔄 [FLOW WALLET] Ignoring wallet connected event with no/zero address');
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

  // NOTE: Do not prefetch token balances on login.
  // Balance fetch uses browser JSON-RPC POST (CORS-preflight) and can break login when RPC blocks CORS.

  if (window.PlayerInventoryCache) {
    window.PlayerInventoryCache.invalidate(null);
    window.PlayerInventoryCache._pendingGameOverRefetchAddress = null;
  }

  // Prefetch credits/tickets as soon as we have the address.
  // This is user balance data; fetch on wallet connect so store/game UI can show it immediately.
  if (window.GamePassService && typeof window.GamePassService.getCreditsAndTickets === 'function') {
    const gamePassPromise = window.GamePassService.getCreditsAndTickets(address, true);
    window.__gamePassPrefetch = { address, promise: gamePassPromise, at: Date.now() };
    gamePassPromise
      .then((status) => {
        if (!window._preloadedGamePassStatus) window._preloadedGamePassStatus = {};
        window._preloadedGamePassStatus[address] = status;
      })
      .catch(() => {});
  }

  // Clear eligible milestones cache when wallet changes (force fresh fetch when user opens leaderboard)
  if (typeof window.clearEligibleMilestonesCache === 'function') {
    window.clearEligibleMilestonesCache();
  }
  // Milestone definitions come from menu bootstrap; stats + claim/eligible progress prefetch after
  // the session loading UI closes (see scheduleMilestoneProgressPrefetchAfterLoadingUi).

  // Prefetch "My tournaments" for when user opens Tournaments modal (after store/config are ready from init)
  // Also prefetch the merged tournaments list with player enrichment (hasEnoughTickets/hasEntered),
  // so entering the tournament lobby doesn't need an immediate fetch.
  if (typeof window.prefetchTournamentsIfStale === 'function') {
    window.prefetchTournamentsIfStale();
  }
  if (typeof window.prefetchMyTournamentsIfStale === 'function') {
    window.prefetchMyTournamentsIfStale();
  }
  if (typeof window.prefetchBadgeIfStale === 'function') {
    window.prefetchBadgeIfStale();
  }

  // Load game data (deduplication handled in load()); milestone progress also prefetches when load()
  // short-circuits without running _performLoad (see GameDataFlowService.load early returns).
  return window.GameDataFlowService.load(address, { checkBadgeUpgrade: true })
    .finally(() => {
      if (typeof window.scheduleMilestoneProgressPrefetchAfterLoadingUi === 'function') {
        window.scheduleMilestoneProgressPrefetchAfterLoadingUi();
      }
      // Inventory should load after the session loading UI closes (avoid slowing login).
      try {
        if (typeof window.prefetchPlayerInventoryReservoir === 'function') {
          setTimeout(() => window.prefetchPlayerInventoryReservoir(address), 0);
        }
      } catch (_) {}
    })
    .catch((err) => {
      console.error('❌ [FLOW WALLET] Error in onWalletConnected:', err);
    });
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
  
  // Clear any active loads and game pass prefetch
  window.GameDataFlowService.clearActiveLoads();
  try {
    delete window.__gamePassPrefetch;
  } catch (_) {}
  
  GameDataState.reset();
  LoadingManager.reset();

  if (window.PlayerInventoryCache) {
    window.PlayerInventoryCache.invalidate(null);
    window.PlayerInventoryCache._pendingGameOverRefetchAddress = null;
  }
  
  const badgeDisplay = document.getElementById('menuBadgeDisplay');
  if (badgeDisplay) {
    badgeDisplay.style.display = 'none';
    badgeDisplay.innerHTML = '';
  }
  
  // Clear my-tournaments prefetch when wallet disconnects
  if (typeof window !== 'undefined') {
    window.__prefetchedMyTournaments = undefined;
  }

  // Clear eligible milestones cache when wallet disconnects
  if (typeof window.clearEligibleMilestonesCache === 'function') {
    window.clearEligibleMilestonesCache();
  }
  
  // Hide leaderboard claim badge when wallet disconnects
  const claimCountBadge = document.getElementById('leaderboardClaimCountBadge');
  if (claimCountBadge) {
    claimCountBadge.style.display = 'none';
  }
  
  // Also hide the tab badge
  const tabBadge = document.getElementById('milestonesTabClaimCountBadge');
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
 * Refresh game data after returning to the main menu.
 * @param {{ force?: boolean, afterGame?: boolean }} [options] - If force or afterGame is true, run a full
 *   GameDataFlow load (scores/credits may have changed). Badge upgrade API runs only when afterGame is true
 *   (player finished a run), not on ordinary menu opens.
 */
function onReturnToMenu(options = {}) {
  if (!GameDataState.walletAddress || !window.GameDataFlowService) {
    return;
  }
  const force = options.force === true || options.afterGame === true;
  const checkBadgeUpgrade = options.afterGame === true;
  window.GameDataFlowService.load(GameDataState.walletAddress, { force, checkBadgeUpgrade }).catch((err) => {
    console.error('❌ [FLOW WALLET] Error reloading on return to menu:', err);
  });
}

// Expose globally
if (typeof window !== 'undefined') {
  window.onWalletConnected = onWalletConnected;
  window.onWalletDisconnected = onWalletDisconnected;
  window.onReturnToMenu = onReturnToMenu;
}

