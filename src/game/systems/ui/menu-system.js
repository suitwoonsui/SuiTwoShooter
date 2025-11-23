// ==========================================
// MENU SYSTEM (EXACT COPY FROM HTML)
// ==========================================

// Wallet connection handlers
async function handleConnectWallet() {
  console.log('🔗 Connecting wallet...');
  
  if (typeof WalletAPI === 'undefined' || !window.walletAPIInstance) {
    alert('Wallet API not initialized. Please refresh the page.');
    return;
  }
  
  const connectBtn = document.getElementById('connectWalletBtn');
  const connectBtnText = document.getElementById('connectWalletBtnText');
  
  // Disable button during connection
  if (connectBtn) {
    connectBtn.disabled = true;
    if (connectBtnText) connectBtnText.textContent = 'Connecting...';
  }
  
  try {
    const result = await window.walletAPIInstance.connect();
    
    if (result.success) {
      console.log('✅ Wallet connected:', result.address);
      updateWalletUI(result.address);
      // Check balance first, then enable/disable button based on result
      // Don't enable button immediately - wait for balance check
      await checkMEWSBalanceAndUpdateUI(result.address);
      // Update menu stats from blockchain when wallet connects
      if (typeof updateMenuStats === 'function') {
        updateMenuStats().catch(err => console.warn('Failed to update menu stats:', err));
      }
      // Always enable test mode button if wallet is connected (bypasses gatekeeping)
      const testBtn = document.getElementById('startGameTestBtn');
      if (testBtn) {
        testBtn.disabled = false;
        testBtn.style.opacity = '1';
        testBtn.style.cursor = 'pointer';
      }
    } else {
      console.error('❌ Wallet connection failed:', result.error);
      alert(`Failed to connect wallet: ${result.error || 'Unknown error'}`);
      updateWalletUI(null);
      disableStartGameButton();
    }
  } catch (error) {
    console.error('❌ Error connecting wallet:', error);
    alert(`Error connecting wallet: ${error.message}`);
    updateWalletUI(null);
    disableStartGameButton();
  } finally {
    // Re-enable button
    if (connectBtn) {
      connectBtn.disabled = false;
      if (connectBtnText) connectBtnText.textContent = 'Connect Wallet';
    }
  }
}

async function handleDisconnectWallet() {
  console.log('🔓 Disconnecting wallet...');
  
  if (typeof WalletAPI === 'undefined' || !window.walletAPIInstance) {
    return;
  }
  
  try {
    const result = await window.walletAPIInstance.disconnect();
    if (result.success) {
      console.log('✅ Wallet disconnected');
      // Clear badge cache and display immediately
      if (window.BadgeService && typeof window.BadgeService.clearBadgeCache === 'function') {
        window.BadgeService.clearBadgeCache();
        console.log('📋 [MENU] Cleared badge cache on wallet disconnect');
      }
      const badgeDisplay = document.getElementById('menuBadgeDisplay');
      if (badgeDisplay) {
        badgeDisplay.style.display = 'none';
        badgeDisplay.innerHTML = ''; // Clear any existing badge content
      }
      updateWalletUI(null);
      disableStartGameButton();
      // Clear menu stats (show "--") when wallet disconnects
      if (typeof updateMenuStats === 'function') {
        updateMenuStats().catch(err => console.warn('Failed to update menu stats:', err));
      }
    }
  } catch (error) {
    console.error('❌ Error disconnecting wallet:', error);
  }
}

function updateWalletUI(address) {
  const walletStatus = document.getElementById('walletStatus');
  const walletStatusText = document.getElementById('walletStatusText');
  const connectBtn = document.getElementById('connectWalletBtn');
  const connectBtnText = document.getElementById('connectWalletBtnText');
  const walletAddressDisplay = document.getElementById('walletAddressDisplay');
  const walletAddressValue = document.getElementById('walletAddressValue');
  const walletConnectedState = document.getElementById('walletConnectedState');
  const walletAddressCompact = document.getElementById('walletAddressCompact');
  const walletBalanceCompact = document.getElementById('walletBalanceCompact');
  
  if (address) {
    // Wallet connected - show compact connected state
    if (connectBtn) {
      connectBtn.style.display = 'none';
    }
    if (walletConnectedState) {
      walletConnectedState.style.display = 'flex';
    }
    if (walletAddressCompact && window.walletAPIInstance) {
      walletAddressCompact.textContent = window.walletAPIInstance.formatAddress(address);
    }
    // Hide balance - only show address
    if (walletBalanceCompact) {
      walletBalanceCompact.style.display = 'none';
    }
    // Hide old display elements (for backward compatibility)
    if (walletAddressDisplay) {
      walletAddressDisplay.style.display = 'none';
    }
    // Note: Badge is loaded in checkMEWSBalanceAndUpdateUI() when balance is checked
  } else {
    // Wallet not connected - show connect button
    if (connectBtn) {
      connectBtn.style.display = 'flex';
    }
    if (walletConnectedState) {
      walletConnectedState.style.display = 'none';
    }
    // Hide old display elements (for backward compatibility)
    if (walletAddressDisplay) {
      walletAddressDisplay.style.display = 'none';
    }
    
    // Hide badge display when wallet is not connected
    const badgeDisplay = document.getElementById('menuBadgeDisplay');
    if (badgeDisplay) {
      badgeDisplay.style.display = 'none';
    }
  }
}

/**
 * Load and display badge in main menu (if player has one)
 * @param {string} walletAddress - Player's wallet address
 */
async function loadMenuBadgeDisplay(walletAddress) {
  const badgeDisplay = document.getElementById('menuBadgeDisplay');
  if (!badgeDisplay) {
    console.warn('⚠️ [MENU] Badge display container not found');
    return;
  }

  try {
    // No wallet connected, hide badge display
    if (!walletAddress) {
      badgeDisplay.style.display = 'none';
      return;
    }

    // Get badge data from BadgeService
    if (!window.BadgeService || !window.BadgeService.getBadge) {
      console.warn('⚠️ [MENU] BadgeService not available');
      badgeDisplay.style.display = 'none';
      return;
    }

    const badgeData = await window.BadgeService.getBadge(walletAddress);

    if (!badgeData || !badgeData.success || !badgeData.hasBadge || !badgeData.badge) {
      // Player doesn't have a badge in new contract
      // Check if they need to migrate an old badge
      if (window.BadgeService && window.BadgeService.checkBadgeMigration) {
        const migrationCheck = await window.BadgeService.checkBadgeMigration(walletAddress);
        
        if (migrationCheck.success && migrationCheck.needsMigration && migrationCheck.migrationData) {
          // Player has an old badge that needs migration
          console.log('🔄 [MENU] Player needs to migrate badge');
          
          // Show migration modal
          if (window.BadgeUI && window.BadgeUI.showBadgeMigrationModal) {
            // Convert imageData array to Uint8Array if needed
            let imageData = migrationCheck.migrationData.imageData;
            if (Array.isArray(imageData)) {
              imageData = new Uint8Array(imageData);
            }
            
            window.BadgeUI.showBadgeMigrationModal({
              oldBadgeId: migrationCheck.migrationData.oldBadgeId,
              oldTier: migrationCheck.migrationData.oldTier,
              oldGamesPlayed: migrationCheck.migrationData.oldGamesPlayed,
              oldMintDate: migrationCheck.migrationData.oldMintDate,
              imageData: imageData,
            });
          }
        }
      }
      
      // Hide badge display (no badge in new contract)
      badgeDisplay.style.display = 'none';
      return;
    }

    // Player has a badge, display it
    // Check for pending tier upgrade
    if (window.BadgeService && window.BadgeService.checkPendingUpgrade) {
      const upgradeCheck = await window.BadgeService.checkPendingUpgrade(walletAddress);
      if (upgradeCheck.success && upgradeCheck.hasPendingUpgrade && upgradeCheck.transactionData) {
        console.log('🎖️ [MENU] Pending badge upgrade detected');
        
        // Convert base64 imageData back to Uint8Array
        let imageData = null;
        if (upgradeCheck.transactionData.imageData) {
          try {
            const base64 = upgradeCheck.transactionData.imageData;
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              bytes[i] = binary.charCodeAt(i);
            }
            imageData = bytes;
          } catch (error) {
            console.warn('⚠️ [MENU] Failed to convert imageData:', error);
          }
        }
        
        // Show upgrade modal
        if (window.BadgeUI && window.BadgeUI.showTierUpgradeModal) {
          const oldTier = badgeData.badge.tier;
          const newTier = upgradeCheck.newTier || oldTier + 1;
          const newTierName = window.BadgeService.getTierName(newTier);
          
          window.BadgeUI.showTierUpgradeModal({
            oldTier,
            newTier,
            newTierName,
            imageData,
            transactionData: upgradeCheck.transactionData,
          });
        }
      }
    }
    
    // Use BadgeUI.displayBadgeInUI if available, otherwise create custom display
    if (window.BadgeUI && typeof window.BadgeUI.displayBadgeInUI === 'function') {
      // Use the existing BadgeUI function for consistency
      window.BadgeUI.displayBadgeInUI(badgeDisplay, badgeData);
      badgeDisplay.style.display = 'block';
    } else {
      // Fallback: create custom display
      const { badge } = badgeData;
      const tierName = window.BadgeService.getTierName(badge.tier);
      const discounts = window.BadgeService.getDiscountsForTier(badge.tier);

      // Use imageUrl if available (from badge.image field), otherwise fall back to imageData
      let imageSrc = null;
      if (badge.imageUrl) {
        // Use the URL directly from the badge's image field
        imageSrc = badge.imageUrl;
      } else if (badge.imageData && badge.imageData.length > 0) {
        // Fallback to base64 data URI for backwards compatibility
        try {
          if (Array.isArray(badge.imageData)) {
            const bytes = new Uint8Array(badge.imageData);
            const binary = String.fromCharCode.apply(null, Array.from(bytes));
            imageSrc = 'data:image/webp;base64,' + btoa(binary);
          } else {
            const binary = String.fromCharCode.apply(null, Array.from(badge.imageData));
            imageSrc = 'data:image/webp;base64,' + btoa(binary);
          }
        } catch (error) {
          console.warn('⚠️ [MENU] Failed to convert badge image:', error);
        }
      }

      const badgeHTML = `
        <div class="menu-badge-info">
          <h3>🎖️ Your ${tierName} Badge</h3>
          ${imageSrc
            ? `<img src="${imageSrc}" alt="Badge" class="menu-badge-image" />`
            : `<div class="menu-badge-placeholder">🎖️</div>`
          }
          <div class="menu-badge-details">
            <p>Games Played: ${badge.gamesPlayed || 0}</p>
            ${discounts.store > 0 ? `<p>Store: ${discounts.store}% off</p>` : ''}
            ${discounts.gameplay > 0 ? `<p>Gameplay: ${discounts.gameplay}% off</p>` : ''}
          </div>
        </div>
      `;
      badgeDisplay.innerHTML = badgeHTML;
      badgeDisplay.style.display = 'block';
    }

    console.log('✅ [MENU] Badge displayed in main menu');
  } catch (error) {
    console.error('❌ [MENU] Error loading badge display:', error);
    badgeDisplay.style.display = 'none';
  }
}

function enableStartGameButton() {
  const startGameBtn = document.getElementById('startGameBtn');
  if (startGameBtn) {
    startGameBtn.disabled = false;
  }
}

function disableStartGameButton() {
  const startGameBtn = document.getElementById('startGameBtn');
  if (startGameBtn) {
    startGameBtn.disabled = true;
  }
}

// Initialize wallet connection on page load
async function initializeWalletIntegration() {
  // Wait a bit for React and WalletAPI to load
  await new Promise(resolve => setTimeout(resolve, 500));
  
  if (typeof WalletAPI !== 'undefined') {
    try {
      // Get network from backend config (should match backend network)
      // Default to testnet for development, but fetch from backend if available
      let network = 'testnet'; // Default to testnet
      
      try {
        // Try to fetch network from backend API
        const API_BASE_URL = window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3000/api';
        const response = await fetch(`${API_BASE_URL}/config`);
        if (response.ok) {
          const config = await response.json();
          if (config.network) {
            network = config.network;
            console.log(`🌐 Using network from backend: ${network}`);
          }
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch network from backend, using default:', network);
      }
      
      const api = await WalletAPI.initialize({ network });
      
      // Store globally for easy access
      window.walletAPIInstance = api;
      
      console.log('✅ Wallet API initialized');
      
      // Listen for wallet changes
      api.on(async (event) => {
        console.log('🔔 Wallet event:', event);
        
        // Clear badge cache and display immediately when wallet changes (disconnect or new connect)
        if (window.BadgeService && typeof window.BadgeService.clearBadgeCache === 'function') {
          window.BadgeService.clearBadgeCache();
          console.log('📋 [MENU] Cleared badge cache due to wallet change');
        }
        
        const badgeDisplay = document.getElementById('menuBadgeDisplay');
        if (badgeDisplay) {
          badgeDisplay.style.display = 'none';
          badgeDisplay.innerHTML = ''; // Clear any existing badge content
        }
        
        updateWalletUI(event.address);
        
        if (event.type === 'connected' && event.address) {
          // Check MEWS balance when wallet connects (this will also load badge for new wallet)
          await checkMEWSBalanceAndUpdateUI(event.address);
          // Update menu stats from blockchain when wallet connects
          if (typeof updateMenuStats === 'function') {
            updateMenuStats().catch(err => console.warn('Failed to update menu stats:', err));
          }
        } else if (event.type === 'disconnected') {
          disableStartGameButton();
          updateBalanceUI(null, false);
          updateWalletRequirementsUI(false, false);
          // Badge already cleared above
          const walletStatusText = document.getElementById('walletStatusText');
          if (walletStatusText) {
            walletStatusText.innerHTML = '<span class="wallet-icon">🔒</span><span>Connect Sui wallet to play</span>';
          }
          // Clear menu stats (show "--") when wallet disconnects
          if (typeof updateMenuStats === 'function') {
            updateMenuStats().catch(err => console.warn('Failed to update menu stats:', err));
          }
          // Disable test button on disconnect
          const testBtn = document.getElementById('startGameTestBtn');
          if (testBtn) {
            testBtn.disabled = true;
            testBtn.style.opacity = '0.5';
            testBtn.style.cursor = 'not-allowed';
          }
        }
      });
      
      // Check if wallet is already connected
      if (api.isConnected()) {
        const address = api.getAddress();
        updateWalletUI(address);
        // Check balance for already connected wallet (don't enable button until check completes)
        await checkMEWSBalanceAndUpdateUI(address);
        // Update menu stats from blockchain for already connected wallet
        if (typeof updateMenuStats === 'function') {
          updateMenuStats().catch(err => console.warn('Failed to update menu stats:', err));
        }
        // Always enable test mode button if wallet is connected (bypasses gatekeeping)
        const testBtn = document.getElementById('startGameTestBtn');
        if (testBtn) {
          testBtn.disabled = false;
          testBtn.style.opacity = '1';
          testBtn.style.cursor = 'pointer';
        }
      } else {
        // Show requirements when wallet not connected
        updateWalletRequirementsUI(false, false);
        disableStartGameButton();
        // Disable test button too if wallet not connected
        const testBtn = document.getElementById('startGameTestBtn');
        if (testBtn) {
          testBtn.disabled = true;
          testBtn.style.opacity = '0.5';
          testBtn.style.cursor = 'not-allowed';
        }
        // Show available wallets
        const wallets = api.getWallets();
        console.log('Available wallets:', wallets);
        if (wallets.length === 0) {
          const walletStatusText = document.getElementById('walletStatusText');
          if (walletStatusText) {
            walletStatusText.innerHTML = '<span class="wallet-icon">⚠️</span><span>Install a Sui wallet extension (Slush, Sui Wallet, Surf, Suiet, Ethos, OKX, Phantom, Klever, Trust, Coinbase, or any Sui-compatible wallet)</span>';
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to initialize wallet API:', error);
      const walletStatusText = document.getElementById('walletStatusText');
      if (walletStatusText) {
        walletStatusText.innerHTML = '<span class="wallet-icon">⚠️</span><span>Wallet initialization failed</span>';
      }
    }
  } else {
    console.warn('⚠️ WalletAPI not loaded');
    const walletStatusText = document.getElementById('walletStatusText');
    if (walletStatusText) {
      walletStatusText.innerHTML = '<span class="wallet-icon">⚠️</span><span>Wallet API not loaded</span>';
    }
  }
}

// Close game completely - stop engine and free resources
function closeGame() {
  console.log('Closing game completely');
  
  // Stop game engine
  if (typeof game !== 'undefined') {
    game.gameRunning = false;
    game.gameOver = false;
    game.paused = false;
    
    // Clear game arrays to free memory
    if (game.projectiles) game.projectiles = [];
    if (game.enemyProjectiles) game.enemyProjectiles = [];
    if (game.bossProjectiles) game.bossProjectiles = [];
    if (game.particles) game.particles = [];
    if (game.tiles) game.tiles = [];
    
    // Reset game state
    game.speed = 0;
    game.bossActive = false;
    game.bossWarning = false;
    game.boss = null;
  }
  
  // Stop all audio
  if (typeof stopBackgroundMusic === 'function') {
    stopBackgroundMusic();
  }
  if (typeof stopGameplayMusic === 'function') {
    stopGameplayMusic();
  }
  
  // Hide game container
  const gameContainer = document.querySelector('.game-container');
  if (gameContainer) {
    gameContainer.classList.add('game-container-hidden');
    gameContainer.classList.remove('game-container-visible');
  }
}

// Main menu functions
// Update wallet requirements UI (simplified - no tooltip)
function updateWalletRequirementsUI(walletConnected, hasMinimumBalance) {
  // Minimum notice visibility is handled by updateBalanceUI
  // This function is kept for backward compatibility
}

// Check MEWS balance and update UI
async function checkMEWSBalanceAndUpdateUI(address) {
  if (!window.walletAPIInstance) {
    console.warn('⚠️ Wallet API not available');
    // Disable button if API not available
    disableStartGameButton();
    return;
  }
  
  // Disable button while checking balance (prevent race condition)
  disableStartGameButton();
  
  try {
    // Check balance on mainnet (gatekeeping uses mainnet)
    const balanceResult = await window.walletAPIInstance.checkMEWSBalance(address, 'mainnet');
    
    console.log('🔍 Balance check result:', {
      success: balanceResult.success,
      balance: balanceResult.formattedBalance,
      hasMinimum: balanceResult.hasMinimumBalance,
      minimum: balanceResult.formattedMinimum
    });
    
    if (balanceResult.success) {
      updateBalanceUI(balanceResult.formattedBalance, balanceResult.hasMinimumBalance);
      
      // Update requirements UI
      updateWalletRequirementsUI(true, balanceResult.hasMinimumBalance);
      
      // Clear badge cache and display first (in case of wallet switch), then load new badge
      if (window.BadgeService && typeof window.BadgeService.clearBadgeCache === 'function') {
        window.BadgeService.clearBadgeCache();
        console.log('📋 [MENU] Cleared badge cache before loading badge for address:', address);
      }
      
      const badgeDisplay = document.getElementById('menuBadgeDisplay');
      if (badgeDisplay) {
        badgeDisplay.style.display = 'none';
        badgeDisplay.innerHTML = ''; // Clear any existing badge content
      }
      
      // Load and display badge when balance is checked (wallet is fully loaded)
      await loadMenuBadgeDisplay(address);
      
      if (balanceResult.hasMinimumBalance) {
        // Only enable button if balance is sufficient
        enableStartGameButton();
        const walletStatusText = document.getElementById('walletStatusText');
        if (walletStatusText) {
          walletStatusText.innerHTML = '<span class="wallet-icon">✅</span><span>Wallet connected • Ready to play!</span>';
        }
      } else {
        // Keep button disabled if insufficient balance
        disableStartGameButton();
        const walletStatusText = document.getElementById('walletStatusText');
        if (walletStatusText) {
          walletStatusText.innerHTML = `<span class="wallet-icon">⚠️</span><span>Insufficient $MEWS. Need ${balanceResult.formattedMinimum} $MEWS (You have ${balanceResult.formattedBalance})</span>`;
        }
      }
      
      // Always enable test mode button if wallet is connected (bypasses gatekeeping)
      const testBtn = document.getElementById('startGameTestBtn');
      if (testBtn && address) {
        testBtn.disabled = false;
        testBtn.style.opacity = '1';
        testBtn.style.cursor = 'pointer';
      }
    } else {
      console.error('❌ Failed to check balance:', balanceResult.error);
      // Keep button disabled on error
      disableStartGameButton();
      updateBalanceUI(null, false);
      updateWalletRequirementsUI(true, false);
      // Hide badge display on balance check error
      const badgeDisplay = document.getElementById('menuBadgeDisplay');
      if (badgeDisplay) {
        badgeDisplay.style.display = 'none';
      }
      const walletStatusText = document.getElementById('walletStatusText');
      if (walletStatusText) {
        walletStatusText.innerHTML = `<span class="wallet-icon">⚠️</span><span>Failed to check balance: ${balanceResult.error || 'Unknown error'}</span>`;
      }
    }
  } catch (error) {
    console.error('❌ Error checking balance:', error);
    // Keep button disabled on error
    disableStartGameButton();
    updateBalanceUI(null, false);
    updateWalletRequirementsUI(true, false);
    // Hide badge display on error
    const badgeDisplay = document.getElementById('menuBadgeDisplay');
    if (badgeDisplay) {
      badgeDisplay.style.display = 'none';
    }
    const walletStatusText = document.getElementById('walletStatusText');
    if (walletStatusText) {
      walletStatusText.innerHTML = `<span class="wallet-icon">⚠️</span><span>Error checking balance: ${error.message || 'Unknown error'}</span>`;
    }
  }
}

// Update balance UI display
function updateBalanceUI(balance, hasMinimum) {
  // Balance is not shown in compact wallet UI - only address is displayed
  // Keep balance display hidden in compact view
  const walletBalanceCompact = document.getElementById('walletBalanceCompact');
  if (walletBalanceCompact) {
    walletBalanceCompact.style.display = 'none';
  }
  
  // Update balance display below the button (in game-title)
  const balanceDisplay = document.getElementById('mewsBalanceDisplay');
  const balanceElement = document.getElementById('mewsBalance');
  
  if (balanceDisplay && balanceElement) {
    if (balance) {
      balanceDisplay.style.display = 'flex'; /* Use flex to align properly */
      balanceElement.textContent = `${balance} $MEWS`;
      balanceElement.style.color = hasMinimum ? '#39ff14' : '#ff4444';
    } else {
      balanceDisplay.style.display = 'none';
    }
  }
  
  // Show/hide minimum requirement notice based on balance
  const minimumNotice = document.getElementById('walletMinimumNotice');
  if (minimumNotice) {
    if (hasMinimum && balance) {
      // Hide notice if wallet has enough MEWS
      minimumNotice.style.display = 'none';
    } else {
      // Show notice if wallet doesn't have enough or balance is unknown
      minimumNotice.style.display = 'flex';
    }
  }
}

function enableStartGameButton() {
  const startGameBtn = document.getElementById('startGameBtn');
  if (startGameBtn) {
    startGameBtn.disabled = false;
    startGameBtn.title = 'Start Game';
    startGameBtn.style.opacity = '1';
    startGameBtn.style.cursor = 'pointer';
  }
}

function disableStartGameButton() {
  const startGameBtn = document.getElementById('startGameBtn');
  if (startGameBtn) {
    startGameBtn.disabled = true;
    startGameBtn.style.opacity = '0.5';
    startGameBtn.style.cursor = 'not-allowed';
    // Tooltip will be updated by updateWalletRequirementsUI
  }
}

// Test mode: Start game bypassing gatekeeping (for development/testing)
function startGameTest() {
  console.log('🧪 [TEST MODE] startGameTest() called - Bypassing gatekeeping');
  
  // Still require wallet connection (for blockchain features)
  if (!window.walletAPIInstance || !window.walletAPIInstance.isConnected()) {
    alert('Please connect your wallet first. (Required for blockchain features)');
    return;
  }
  
  // Bypass balance check and start game directly
  startGameInternal();
}

function startGame() {
  // Check balance before starting game
  if (window.walletAPIInstance && window.walletAPIInstance.isConnected()) {
    const balanceStatus = window.walletAPIInstance.getBalanceStatus();
    
    if (!balanceStatus.hasMinimumBalance) {
      alert(`Insufficient $MEWS balance. You need at least 500,000 $MEWS to start the game.\n\nCurrent balance: ${balanceStatus.balance ? (Number(balanceStatus.balance) / 1_000_000_000).toLocaleString() : '0'} $MEWS`);
      return;
    }
  } else {
    alert('Please connect your wallet first.');
    return;
  }
  
  startGameInternal();
}

async function startGameInternal() {
  console.log('🎮 startGame() called');
  console.log('📊 Current gameState:', {
    isMenuVisible: gameState.isMenuVisible,
    isGameRunning: gameState.isGameRunning,
    isPaused: gameState.isPaused,
    isGameOver: gameState.isGameOver
  });
  
  // Show item consumption modal if available
  if (typeof showItemConsumptionModal === 'function') {
    console.log('🎯 Showing item consumption modal');
    const result = await showItemConsumptionModal();
    
    if (!result.confirmed) {
      console.log('❌ Item consumption cancelled, not starting game');
      return; // User cancelled
    }
    
    console.log('✅ Item consumption confirmed:', result.items);
  }
  
  // Initialize game if not already initialized
  if (typeof window.initializeGame === 'function') {
    console.log('🎯 Calling initializeGame()');
    window.initializeGame();
  } else {
    console.error('❌ initializeGame is not a function!');
  }
  
  gameState.isMenuVisible = false;
  gameState.isGameRunning = true;
  gameState.isPaused = false;
  gameState.isGameOver = false;
  
  console.log('✅ GameState updated:', {
    isMenuVisible: gameState.isMenuVisible,
    isGameRunning: gameState.isGameRunning
  });
  
  // Hide main menu
  const mainMenu = document.getElementById('mainMenuOverlay');
  if (mainMenu) {
    mainMenu.classList.add('main-menu-overlay-hidden');
    mainMenu.classList.remove('main-menu-overlay-visible');
    console.log('👁️ Main menu hidden');
  }
  
  // Show game container
  const gameContainer = document.querySelector('.game-container');
  if (gameContainer) {
    gameContainer.classList.add('game-container-visible');
    gameContainer.classList.remove('game-container-hidden');
    console.log('👁️ Game container shown');
    console.log('📐 Game container computed style:', {
      display: window.getComputedStyle(gameContainer).display,
      width: window.getComputedStyle(gameContainer).width,
      height: window.getComputedStyle(gameContainer).height,
      visible: gameContainer.classList.contains('game-container-visible'),
      hidden: gameContainer.classList.contains('game-container-hidden')
    });
    
    // Re-apply mobile UI layout to ensure consumable footer is shown
    if (typeof MobileUI !== 'undefined' && MobileUI.isInitialized) {
      const layout = MobileUI.layouts[MobileUI.currentLayout];
      if (layout && layout.consumableFooter) {
        MobileUI.applyConsumableFooterLayout(layout.consumableFooter);
      }
    }
  }
  
  // Reinitialize responsive canvas system for current screen size
  if (typeof ResponsiveCanvas !== 'undefined' && ResponsiveCanvas.isInitialized) {
    ResponsiveCanvas.setupResponsiveSizing();
    console.log('📐 Canvas resized for current screen size');
  }
  
  // Start the game
  if (typeof restart === 'function') {
    console.log('🔄 Calling restart()');
    restart();
  } else {
    console.error('❌ restart is not a function!');
  }
  
  // Stop menu music and start gameplay music (only if enabled)
  if (typeof stopBackgroundMusic === 'function') {
    stopBackgroundMusic(); // Stop menu music
  }
  if (typeof startGameplayMusic === 'function' && gameSettings.backgroundMusic) {
    startGameplayMusic(); // Start gameplay music
  }
  
  // Update games played counter
  gameStats.gamesPlayed++;
  saveGameData();
}

function showSettings() {
  console.log('🟠 [UI FLOW] showSettings() called');
  console.trace('🟠 [UI FLOW] showSettings() stack trace');
  
  // Check if name input modal is visible - it shouldn't trigger settings
  const nameInputModal = document.getElementById('nameInputModal');
  if (nameInputModal && nameInputModal.classList.contains('name-input-modal-visible')) {
    console.error('🟠 [UI FLOW] ⚠️⚠️⚠️ ERROR: showSettings() called while name input modal is visible! This should not happen!');
    console.trace('🟠 [UI FLOW] ERROR STACK TRACE');
    return; // Prevent opening settings if name input modal is showing
  }
  
  const settingsPanel = document.getElementById('settingsPanel');
  console.log('🟠 [UI FLOW] Settings panel element:', settingsPanel);
  
  if (settingsPanel) {
    const wasVisible = settingsPanel.classList.contains('settings-panel-visible');
    const wasHidden = settingsPanel.classList.contains('settings-panel-hidden');
    console.log('🟠 [VISIBILITY] Settings panel - was visible:', wasVisible, 'was hidden:', wasHidden);
    
    settingsPanel.classList.add('settings-panel-visible');
    settingsPanel.classList.remove('settings-panel-hidden');
    console.log('🟠 [VISIBILITY] Settings panel SHOWN');
    
    // Close panel when clicking outside
    const handleClickOutside = (event) => {
      const target = event.target;
      console.log('🟠 [UI FLOW] Click outside handler triggered', {
        target: target,
        targetTag: target.tagName,
        targetOnClick: target.getAttribute('onclick'),
        isInsideSettings: settingsPanel.contains(target)
      });
      
      // IMPORTANT: Don't close settings if clicking on name input modal
      const nameInputModal = document.getElementById('nameInputModal');
      if (nameInputModal && nameInputModal.contains(target)) {
        console.log('🟠 [UI FLOW] Click is in name input modal - ignoring click outside handler');
        return; // Don't process this click for settings panel
      }
      
      if (!settingsPanel.contains(target)) {
        console.log('🟠 [UI FLOW] Click was outside settings panel - hiding');
        hideSettings();
        document.removeEventListener('click', handleClickOutside);
      } else {
        console.log('🟠 [UI FLOW] Click was inside settings panel - keeping open');
      }
    };
    // Use setTimeout to avoid immediate firing
    setTimeout(() => {
      console.log('🟠 [UI FLOW] Adding click outside listener');
      document.addEventListener('click', handleClickOutside);
    }, 0);
    
    loadSettingsToUI();
  } else {
    console.warn('🟠 [UI FLOW] Settings panel element not found!');
  }
}

function hideSettings() {
  console.log('🔴 [UI FLOW] hideSettings() called');
  console.trace('🔴 [UI FLOW] hideSettings() stack trace');
  
  const settingsPanel = document.getElementById('settingsPanel');
  console.log('🔴 [UI FLOW] Settings panel element:', settingsPanel);
  
  if (settingsPanel) {
    const wasVisible = settingsPanel.classList.contains('settings-panel-visible');
    const wasHidden = settingsPanel.classList.contains('settings-panel-hidden');
    console.log('🔴 [VISIBILITY] Settings panel - was visible:', wasVisible, 'was hidden:', wasHidden);
    
    settingsPanel.classList.add('settings-panel-hidden');
    settingsPanel.classList.remove('settings-panel-visible');
    console.log('🔴 [VISIBILITY] Settings panel HIDDEN');
  } else {
    console.warn('🔴 [UI FLOW] Settings panel element not found!');
  }
}

function showInstructions() {
  const instructionsPanel = document.getElementById('instructionsPanel');
  if (instructionsPanel) {
    instructionsPanel.classList.add('instructions-panel-visible');
    instructionsPanel.classList.remove('instructions-panel-hidden');
    
    // Close panel when clicking outside
    const handleClickOutside = (event) => {
      if (!instructionsPanel.contains(event.target)) {
        hideInstructions();
        document.removeEventListener('click', handleClickOutside);
      }
    };
    // Use setTimeout to avoid immediate firing
    setTimeout(() => document.addEventListener('click', handleClickOutside), 0);
  }
}

function hideInstructions() {
  const instructionsPanel = document.getElementById('instructionsPanel');
  if (instructionsPanel) {
    instructionsPanel.classList.add('instructions-panel-hidden');
    instructionsPanel.classList.remove('instructions-panel-visible');
  }
}

// Game over handling
function onGameOverMenu(finalScore) {
  gameState.isGameRunning = false;
  gameState.isGameOver = true;
  
  // Update best score
  if (finalScore > gameStats.bestScore) {
    gameStats.bestScore = finalScore;
    saveGameData();
  }
  
  // Show main menu after a delay
  setTimeout(() => {
    showMainMenu();
  }, 3000);
}

function showMainMenu() {
  console.log('🟢 [UI FLOW] showMainMenu() called');
  console.trace('🟢 [UI FLOW] showMainMenu() stack trace');
  
  gameState.isMenuVisible = true;
  gameState.isGameRunning = false;
  gameState.isPaused = false;
  gameState.isGameOver = false;
  
  const mainMenu = document.getElementById('mainMenuOverlay');
  console.log('🟢 [UI FLOW] Main menu element:', mainMenu);
  
  if (mainMenu) {
    const hadVisible = mainMenu.classList.contains('main-menu-overlay-visible');
    const hadHidden = mainMenu.classList.contains('main-menu-overlay-hidden');
    console.log('🟢 [UI FLOW] Main menu current state - visible:', hadVisible, 'hidden:', hadHidden);
    
    mainMenu.classList.add('main-menu-overlay-visible');
    mainMenu.classList.remove('main-menu-overlay-hidden');
    console.log('🟢 [UI FLOW] Main menu shown');
  } else {
    console.warn('🟢 [UI FLOW] Main menu element not found!');
  }
  
  // Check settings panel state when showing main menu
  const settingsPanel = document.getElementById('settingsPanel');
  if (settingsPanel) {
    const hasVisible = settingsPanel.classList.contains('settings-panel-visible');
    const hasHidden = settingsPanel.classList.contains('settings-panel-hidden');
    console.log('🟢 [UI FLOW] Settings panel state check - visible:', hasVisible, 'hidden:', hasHidden);
    if (hasVisible) {
      console.warn('🟢 [UI FLOW] ⚠️ Settings panel is visible during showMainMenu()!');
    }
  }
  
  // Close game completely when returning to menu
  closeGame();
  
  // updateMenuStats is now async - fetch stats from blockchain
  updateMenuStats().catch(err => console.warn('Failed to update menu stats:', err));
  
  // Update wallet UI when menu is shown
  if (window.walletAPIInstance && window.walletAPIInstance.isConnected()) {
    updateWalletUI(window.walletAPIInstance.getAddress());
    // Load and display badge if player has one
    loadMenuBadgeDisplay(window.walletAPIInstance.getAddress());
  } else {
    updateWalletUI(null);
    // Hide badge display when wallet is not connected
    const badgeDisplay = document.getElementById('menuBadgeDisplay');
    if (badgeDisplay) {
      badgeDisplay.style.display = 'none';
    }
  }
}