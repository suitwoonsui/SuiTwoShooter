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
      // After connection, show the store
      if (typeof showStore === 'function') {
        await showStore();
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
      // After connection, show the store
      if (typeof showStore === 'function') {
        await showStore();
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
 * Cancel wallet connection
 */
function cancelStoreWalletConnect() {
  closeStoreWalletConnectModal();
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

