# Game Data Loading Flow - Refactored Architecture

## Current Problems

1. **Scattered State Management**: Multiple flags (`badgeLoadInProgress`, `balanceCheckInProgress`, `gameReadinessState`) managed separately
2. **Duplicate Checks**: Badge modal visibility checked in 3+ places
3. **Complex Conditionals**: Nested if statements with multiple early returns
4. **Loading Modal Scattered**: Loading modal shown/hidden in many places
5. **Multiple Entry Points**: No single source of truth for when to load data
6. **Race Conditions**: Multiple flags needed to prevent duplicate calls

## Proposed Architecture

### 1. Centralized State Manager

```javascript
const GameDataState = {
  // Loading states
  isLoading: false,
  isLoadingBalance: false,
  isLoadingBadge: false,
  
  // Current data
  walletAddress: null,
  balance: null,
  badge: null,
  
  // UI state
  badgeDisplayVisible: false,
  badgeModalVisible: false,
  
  // Readiness
  isReady: false,
  
  // Methods
  canLoad() {
    return !this.isLoading && 
           !this.badgeModalVisible && 
           this.walletAddress !== null;
  },
  
  reset() {
    this.isLoading = false;
    this.isLoadingBalance = false;
    this.isLoadingBadge = false;
    this.balance = null;
    this.badge = null;
  }
};
```

### 2. Loading Manager

```javascript
const LoadingManager = {
  currentMessage: null,
  isVisible: false,
  
  show(message) {
    if (this.isVisible && this.currentMessage === message) return;
    this.currentMessage = message;
    this.isVisible = true;
    showLoadingModal(message, 'gameDataLoadingModal');
  },
  
  update(message) {
    if (!this.isVisible) return;
    this.currentMessage = message;
    updateLoadingModalMessage(message, 'gameDataLoadingModal');
  },
  
  hide() {
    if (!this.isVisible) return;
    this.isVisible = false;
    this.currentMessage = null;
    hideLoadingModal('gameDataLoadingModal');
  }
};
```

### 3. Flow Controller

```javascript
const GameDataFlow = {
  // Single entry point for loading game data
  async load(walletAddress, options = {}) {
    // Check if we can load
    if (!GameDataState.canLoad()) {
      console.log('⏳ [FLOW] Cannot load - waiting for conditions');
      return;
    }
    
    // Check if already loaded for this address
    if (GameDataState.walletAddress === walletAddress && 
        GameDataState.badge && 
        GameDataState.badgeDisplayVisible) {
      console.log('✅ [FLOW] Already loaded for this address');
      return;
    }
    
    // Set loading state
    GameDataState.isLoading = true;
    GameDataState.walletAddress = walletAddress;
    
    try {
      // Show loading
      LoadingManager.show('Loading game data... Please wait');
      
      // Load balance and badge in parallel
      const [balance, badge] = await Promise.all([
        this.loadBalance(walletAddress),
        this.loadBadge(walletAddress)
      ]);
      
      // Update state
      GameDataState.balance = balance;
      GameDataState.badge = badge;
      GameDataState.isReady = true;
      
      // Update UI
      this.updateUI(balance, badge);
      
    } catch (error) {
      console.error('❌ [FLOW] Error loading game data:', error);
      throw error;
    } finally {
      GameDataState.isLoading = false;
      LoadingManager.hide();
    }
  },
  
  async loadBalance(address) {
    GameDataState.isLoadingBalance = true;
    LoadingManager.update('Checking balance... Please wait');
    
    try {
      const result = await window.walletAPIInstance.checkMEWSBalance(address, 'mainnet');
      return result;
    } finally {
      GameDataState.isLoadingBalance = false;
    }
  },
  
  async loadBadge(address) {
    GameDataState.isLoadingBadge = true;
    LoadingManager.update('Loading badge... Please wait');
    
    try {
      // Check for badge modal
      if (this.isBadgeModalVisible()) {
        throw new Error('Badge modal is visible - cannot load badge');
      }
      
      const badgeData = await window.BadgeService.getBadge(address);
      return badgeData;
    } finally {
      GameDataState.isLoadingBadge = false;
    }
  },
  
  isBadgeModalVisible() {
    const modals = ['badgeMintingModal', 'badgeMigrationModal', 'badgeUpgradeModal'];
    return modals.some(id => {
      const modal = document.getElementById(id);
      return modal && modal.classList.contains('badge-modal-visible');
    });
  },
  
  updateUI(balance, badge) {
    // Update balance UI
    updateBalanceUI(balance.formattedBalance, balance.hasMinimumBalance);
    
    // Update badge display
    if (badge) {
      this.displayBadge(badge);
    }
    
    // Update readiness
    updateGameReadiness();
  },
  
  displayBadge(badge) {
    const badgeDisplay = document.getElementById('menuBadgeDisplay');
    if (!badgeDisplay) return;
    
    // Use BadgeUI or fallback
    if (window.BadgeUI?.displayBadgeInUI) {
      window.BadgeUI.displayBadgeInUI(badgeDisplay, badge);
    } else {
      // Fallback display
      badgeDisplay.innerHTML = this.createBadgeHTML(badge);
    }
    
    badgeDisplay.style.display = 'block';
    GameDataState.badgeDisplayVisible = true;
    
    // Force reflow
    void badgeDisplay.offsetHeight;
  },
  
  // Handle badge modal visibility changes
  onBadgeModalShown() {
    GameDataState.badgeModalVisible = true;
  },
  
  onBadgeModalHidden() {
    GameDataState.badgeModalVisible = false;
    
    // If we have a wallet address, reload data
    if (GameDataState.walletAddress) {
      // Wait a bit for modal to fully close
      setTimeout(() => {
        this.load(GameDataState.walletAddress);
      }, 100);
    }
  },
  
  // Handle wallet connection
  onWalletConnected(address) {
    GameDataState.reset();
    GameDataState.walletAddress = address;
    this.load(address);
  },
  
  // Handle wallet disconnection
  onWalletDisconnected() {
    GameDataState.reset();
    const badgeDisplay = document.getElementById('menuBadgeDisplay');
    if (badgeDisplay) {
      badgeDisplay.style.display = 'none';
    }
  },
  
  // Handle returning from game
  onReturnToMenu() {
    // If badge is already loaded, just make it visible
    if (GameDataState.badge && GameDataState.walletAddress) {
      const badgeDisplay = document.getElementById('menuBadgeDisplay');
      if (badgeDisplay && badgeDisplay.innerHTML.trim() !== '') {
        badgeDisplay.style.display = 'block';
        GameDataState.badgeDisplayVisible = true;
        return;
      }
    }
    
    // Otherwise, reload
    if (GameDataState.walletAddress) {
      this.load(GameDataState.walletAddress);
    }
  }
};
```

### 4. Integration Points

```javascript
// In menu-system.js

// Replace checkMEWSBalanceAndUpdateUI
async function checkMEWSBalanceAndUpdateUI(address) {
  await GameDataFlow.load(address);
}

// Replace loadMenuBadgeDisplay
async function loadMenuBadgeDisplay(walletAddress) {
  await GameDataFlow.load(walletAddress);
}

// In wallet event handler
api.on(async (event) => {
  if (event.type === 'connected') {
    GameDataFlow.onWalletConnected(event.address);
  } else if (event.type === 'disconnected') {
    GameDataFlow.onWalletDisconnected();
  }
});

// In showMainMenu
function showMainMenu() {
  // ... existing code ...
  GameDataFlow.onReturnToMenu();
}

// In badge-ui.js
function showBadgeMintingModal() {
  GameDataFlow.onBadgeModalShown();
  // ... existing modal code ...
}

function hideBadgeModal(modalId) {
  // ... existing hide code ...
  GameDataFlow.onBadgeModalHidden();
}
```

## Benefits

1. **Single Source of Truth**: All state in one place
2. **Clear Flow**: One entry point (`GameDataFlow.load()`)
3. **No Race Conditions**: State manager prevents duplicates
4. **Centralized Loading**: Loading modal managed in one place
5. **Easier to Debug**: Clear state transitions
6. **Easier to Test**: Isolated components
7. **Better Error Handling**: Centralized try/catch

## Migration Plan

1. Create new files: `game-data-state.js`, `loading-manager.js`, `game-data-flow.js`
2. Implement state manager
3. Implement loading manager
4. Implement flow controller
5. Update integration points one by one
6. Remove old scattered code
7. Test thoroughly

