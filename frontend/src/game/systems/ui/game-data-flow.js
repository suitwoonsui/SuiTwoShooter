// ==========================================
// GAME DATA FLOW - Main Coordination
// ==========================================
// This file now delegates to the refactored game data flow modules:
// - game-data-flow-service.js: State management and main coordination
// - game-data-flow-loaders.js: Data loading operations
// - game-data-flow-badge.js: Badge handling and display
// - game-data-flow-ui.js: UI updates
// - game-data-flow-modals.js: Modal management
// - game-data-flow-wallet.js: Wallet event handling

console.log('✅ [GAME DATA FLOW] Legacy delegation module loaded');

// All functions are now provided by the refactored modules
// This file is kept for backward compatibility and to ensure
// any remaining references continue to work

// The refactored modules expose all necessary functions globally:
// - GameDataFlowService (from game-data-flow-service.js)
// - loadBalance, loadStats, loadBadge, fetchRegistryGames (from game-data-flow-loaders.js)
// - handlePendingUpgrade, handleNoBadge, displayBadge, createBadgeDisplay, showBadgeDisplay (from game-data-flow-badge.js)
// - updateBalanceUI (from game-data-flow-ui.js)
// - isBadgeModalVisible, onBadgeModalShown, onBadgeModalHidden (from game-data-flow-modals.js)
// - onWalletConnected, onWalletDisconnected, onReturnToMenu (from game-data-flow-wallet.js)

// Expose GameDataFlow object for backward compatibility
if (typeof window !== 'undefined') {
  // Create GameDataFlow object that delegates to GameDataFlowService
  window.GameDataFlow = {
    // Main load function
    load: (walletAddress, options) => {
      if (window.GameDataFlowService) {
        return window.GameDataFlowService.load(walletAddress, options);
      }
      console.error('❌ [GAME DATA FLOW] GameDataFlowService not available');
    },
    
    // Clear active loads
    clearActiveLoads: () => {
      if (window.GameDataFlowService) {
        return window.GameDataFlowService.clearActiveLoads();
      }
    },
    
    // Wallet event handlers
    onWalletConnected: (address) => {
      if (typeof window.onWalletConnected === 'function') {
        return window.onWalletConnected(address);
      }
    },
    
    onWalletDisconnected: () => {
      if (typeof window.onWalletDisconnected === 'function') {
        return window.onWalletDisconnected();
      }
    },
    
    onReturnToMenu: (options) => {
      if (typeof window.onReturnToMenu === 'function') {
        return window.onReturnToMenu(options);
      }
    },
    
    // Modal handlers
    onBadgeModalShown: () => {
      if (typeof window.onBadgeModalShown === 'function') {
        return window.onBadgeModalShown();
      }
    },
    
    onBadgeModalHidden: () => {
      if (typeof window.onBadgeModalHidden === 'function') {
        return window.onBadgeModalHidden();
      }
    },
    
    // Utility functions
    isBadgeModalVisible: () => {
      if (typeof window.isBadgeModalVisible === 'function') {
        return window.isBadgeModalVisible();
      }
      return false;
    }
  };
}
