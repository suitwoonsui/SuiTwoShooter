// ==========================================
// GAME DATA FLOW MODALS - Modal Management
// ==========================================

console.log('✅ [GAME DATA FLOW MODALS] Game data flow modals module loaded');

/**
 * Check if badge modal is visible
 * @returns {boolean}
 */
function isBadgeModalVisible() {
  const modals = ['badgeMintingModal', 'badgeUpgradeModal'];
  return modals.some(id => {
    const modal = document.getElementById(id);
    return modal && modal.classList.contains('badge-modal-visible');
  });
}

/**
 * Handle badge modal shown
 */
function onBadgeModalShown() {
  GameDataState.setBadgeModalVisible(true);
}

/**
 * Handle badge modal hidden
 */
function onBadgeModalHidden() {
  GameDataState.setBadgeModalVisible(false);
  
  // If we have a wallet address, restore UI state after badge modal is fully closed.
  // IMPORTANT UX: "Maybe later" should NOT trigger a second loading cycle — the main
  // connect-load already fetched stats/credits/tickets/badge. We should only re-render.
  if (GameDataState.walletAddress) {
    setTimeout(() => {
      // Double-check that badge modal is actually closed before loading
      if (!isBadgeModalVisible()) {
        console.log('✅ [FLOW MODALS] Badge modal closed - restoring main menu UI (no reload)');

        // After dismissing upgrade/mint modals, ensure the badge display is visible again.
        // If we already have badge data in memory, re-render it immediately.
        try {
          const b = typeof GameDataState !== 'undefined' ? GameDataState.badge : null;
          if (b && b.success === true && b.hasBadge === true && typeof window.displayBadge === 'function') {
            console.log('✅ [FLOW MODALS] Re-rendering badge after modal close (cached badge)');
            void window.displayBadge(b).catch(() => {});
          } else if (typeof window.showBadgeDisplay === 'function') {
            // If we don't have data to render, at least unhide any existing DOM.
            window.showBadgeDisplay();
          }
        } catch (_) {}

        // Mark data as loaded so gameplay/start button isn't blocked by modal lifecycle.
        try {
          GameDataState.markDataLoaded();
          if (typeof updateGameReadiness === 'function') {
            updateGameReadiness();
          }
        } catch (_) {}
      } else {
        console.log('⏳ [FLOW MODALS] Badge modal still visible - skipping load');
      }
    }, 200); // Increased delay to ensure modal is fully closed
  }
}

// Expose globally
if (typeof window !== 'undefined') {
  window.isBadgeModalVisible = isBadgeModalVisible;
  window.onBadgeModalShown = onBadgeModalShown;
  window.onBadgeModalHidden = onBadgeModalHidden;
}

