// ==========================================
// STORE WALLET CONNECTION - Wallet Connection Modal
// ==========================================
// Handles wallet connection modal for the store

console.log('✅ [STORE WALLET CONNECTION] Store wallet connection module loaded');

/**
 * Show wallet connection modal for store
 */
function showStoreWalletConnectModal() {
  const viewportContainer = document.querySelector('.viewport-container');
  if (!viewportContainer) {
    console.error('❌ [STORE WALLET CONNECTION] Viewport container not found!');
    return;
  }
  
  // Check if modal already exists
  let modal = document.getElementById('storeWalletConnectModal');
  if (modal) {
    modal.classList.add('store-wallet-connect-modal-visible');
    modal.classList.remove('store-wallet-connect-modal-hidden');
    return;
  }
  
  // Create modal
  modal = document.createElement('div');
  modal.id = 'storeWalletConnectModal';
  modal.className = 'store-wallet-connect-modal store-wallet-connect-modal-visible';
  
  modal.innerHTML = `
    <div class="store-wallet-connect-content">
      <div class="store-wallet-connect-header">
        <h2>🔗 Connect Wallet</h2>
      </div>
      <div class="store-wallet-connect-body">
        <p>Please connect your wallet to access the store.</p>
        <p style="font-size: 0.9em; color: #888; margin-top: 10px;">
          You need a connected wallet to purchase items and view your inventory.
        </p>
      </div>
      <div class="store-wallet-connect-actions">
        <button class="menu-btn primary" onclick="handleStoreWalletConnect()">
          <span class="btn-icon">🔗</span> Connect Wallet
        </button>
        <button class="menu-btn" onclick="cancelStoreWalletConnect()">
          <span class="btn-icon">✕</span> Cancel
        </button>
      </div>
    </div>
  `;
  
  viewportContainer.appendChild(modal);
  
  // Add backdrop click handler
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      cancelStoreWalletConnect();
    }
  });
}

/**
 * Handle wallet connection from store modal
 */
async function handleStoreWalletConnect() {
  console.log('🔗 [STORE WALLET CONNECTION] Handling wallet connection...');
  
  // Close the modal first
  closeStoreWalletConnectModal();
  
  // Delegate to WalletService if available
  if (typeof WalletService !== 'undefined' && WalletService.connect) {
    try {
      await WalletService.connect();
      const ctx =
        typeof StoreService !== 'undefined' && StoreService._state && StoreService._state.context
          ? StoreService._state.context
          : 'main-menu';
      if (typeof showStore === 'function') {
        await showStore(ctx);
      }
    } catch (error) {
      console.error('❌ [STORE WALLET CONNECTION] Wallet connection failed:', error);
      const errorMsg = error.message || 'Failed to connect wallet';
      if (typeof showToast === 'function') {
        showToast(errorMsg, 'error');
      } else {
        alert(errorMsg);
      }
    }
    return;
  }
  
  // Fallback: try to use global wallet connection
  if (typeof handleConnectWallet === 'function') {
    try {
      await handleConnectWallet();
      const ctx =
        typeof StoreService !== 'undefined' && StoreService._state && StoreService._state.context
          ? StoreService._state.context
          : 'main-menu';
      if (typeof showStore === 'function') {
        await showStore(ctx);
      }
    } catch (error) {
      console.error('❌ [STORE WALLET CONNECTION] Wallet connection failed:', error);
      const errorMsg = error.message || 'Failed to connect wallet';
      if (typeof showToast === 'function') {
        showToast(errorMsg, 'error');
      } else {
        alert(errorMsg);
      }
    }
  } else {
    console.error('❌ [STORE WALLET CONNECTION] No wallet connection function available');
    if (typeof showToast === 'function') {
      showToast('Wallet connection not available', 'error');
    } else {
      alert('Wallet connection not available');
    }
  }
}

/**
 * Cancel wallet connection — close modal and return to prior UI (main menu when opened from menu).
 * MenuService.showPanel('store') hides the main menu before showStore(); without this, Cancel left a blank screen.
 */
function cancelStoreWalletConnect() {
  closeStoreWalletConnectModal();
  if (typeof MenuPanelLoading !== 'undefined' && MenuPanelLoading.hide) {
    MenuPanelLoading.hide();
  }
  const ctx =
    typeof StoreService !== 'undefined' && StoreService._state && StoreService._state.context
      ? StoreService._state.context
      : 'main-menu';
  if (ctx === 'credits-only') {
    return;
  }
  if (typeof window.isPrepLoadoutStoreContext === 'function' && window.isPrepLoadoutStoreContext(ctx)) {
    if (ctx === 'tournament-entry') {
      if (typeof cancelTournamentEntryStore === 'function') {
        cancelTournamentEntryStore();
      } else if (typeof hideStore === 'function') {
        hideStore({ returnToTournaments: true });
      }
    } else {
      if (typeof MenuService !== 'undefined' && MenuService.show) {
        void MenuService.show({ fromMenuPanel: true });
      } else {
        const mainMenu = document.getElementById('mainMenuOverlay');
        if (mainMenu) {
          mainMenu.classList.add('main-menu-overlay-visible');
          mainMenu.classList.remove('main-menu-overlay-hidden');
        }
      }
    }
    return;
  }
  if (typeof MenuService !== 'undefined' && MenuService.show) {
    void MenuService.show({ fromMenuPanel: true });
  } else {
    const mainMenu = document.getElementById('mainMenuOverlay');
    if (mainMenu) {
      mainMenu.classList.add('main-menu-overlay-visible');
      mainMenu.classList.remove('main-menu-overlay-hidden');
    }
  }
}

/**
 * Close wallet connection modal
 */
function closeStoreWalletConnectModal() {
  const modal = document.getElementById('storeWalletConnectModal');
  if (modal) {
    modal.classList.remove('store-wallet-connect-modal-visible');
    modal.classList.add('store-wallet-connect-modal-hidden');
    // Remove from DOM after animation
    setTimeout(() => {
      modal.remove();
    }, 300);
  }
}

// Expose globally
if (typeof window !== 'undefined') {
  window.showStoreWalletConnectModal = showStoreWalletConnectModal;
  window.handleStoreWalletConnect = handleStoreWalletConnect;
  window.cancelStoreWalletConnect = cancelStoreWalletConnect;
  window.closeStoreWalletConnectModal = closeStoreWalletConnectModal;
}

