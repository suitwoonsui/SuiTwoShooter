// ==========================================
// BADGE UI - Main Coordination
// ==========================================
// This file now delegates to the refactored badge UI modules:
// - badge-ui-service.js: State management
// - badge-ui-utils.js: Utility functions
// - badge-ui-display.js: Badge display rendering
// - badge-ui-modals.js: Modal creation and display
// - badge-ui-mint.js: Badge minting flow
// - badge-ui-upgrade.js: Badge upgrade flow
// - (removed) badge migration flow (upgradable contracts)

console.log('✅ [BADGE UI] Legacy delegation module loaded');

// All functions are now provided by the refactored modules
// This file is kept for backward compatibility and to ensure
// any remaining references continue to work

// The refactored modules expose all necessary functions globally:
// - showBadgeMintingModal, showTierUpgradeModal, hideBadgeModal (from badge-ui-modals.js)
// - handleBadgeMint, handleBadgeMaybeLater (from badge-ui-mint.js)
// - handleBadgeUpgrade, showUpgradeError (from badge-ui-upgrade.js)
// - displayBadgeInUI (from badge-ui-display.js)
// - arrayBufferToBase64, fetchRegistryGames (from badge-ui-utils.js)

// Expose BadgeUI object for backward compatibility
if (typeof window !== 'undefined') {
  if (!window.BadgeUI) {
    window.BadgeUI = {};
  }
  
  // Expose functions via BadgeUI object (functions are already exposed globally by modules)
  window.BadgeUI.showBadgeMintingModal = window.showBadgeMintingModal;
  window.BadgeUI.showTierUpgradeModal = window.showTierUpgradeModal;
  window.BadgeUI.displayBadgeInUI = window.displayBadgeInUI;
  window.BadgeUI.hideBadgeModal = window.hideBadgeModal;
  window.BadgeUI.arrayBufferToBase64 = window.arrayBufferToBase64;
}
