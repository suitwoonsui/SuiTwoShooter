// ==========================================
// GAME DATA FLOW MODALS - Modal Management
// ==========================================

console.log('✅ [GAME DATA FLOW MODALS] Game data flow modals module loaded');

/**
 * Check if badge modal is visible
 * @returns {boolean}
 */
function isBadgeModalVisible() {
  const modals = ['badgeMintingModal', 'badgeMigrationModal', 'badgeUpgradeModal'];
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
  
  // If migration modal was closed with "Maybe Later", don't reload
  // This prevents the migration check from running again
  if (GameDataState.migrationCheckComplete && GameDataState.migrationModalClosed) {
    console.log('⏭️ [FLOW MODALS] Migration modal was dismissed - skipping reload to prevent loop');
    return;
  }
  
  // If we have a wallet address, reload data after badge modal is fully closed
  // Use a longer delay to ensure badge modal is completely hidden before showing loading modal
  // Deduplication handled in load()
  if (GameDataState.walletAddress) {
    setTimeout(() => {
      // Double-check that badge modal is actually closed before loading
      if (!isBadgeModalVisible()) {
        console.log('✅ [FLOW MODALS] Badge modal closed - starting game data load');
        if (window.GameDataFlowService && typeof window.GameDataFlowService.load === 'function') {
          window.GameDataFlowService.load(GameDataState.walletAddress).catch(err => {
            console.error('❌ [FLOW MODALS] Error reloading after badge modal hidden:', err);
          });
        }
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

