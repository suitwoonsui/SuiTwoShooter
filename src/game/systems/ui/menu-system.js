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
      updateWalletUI(null);
      disableStartGameButton();
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
  
  if (address) {
    // Wallet connected
    if (walletStatusText) {
      walletStatusText.innerHTML = '<span class="wallet-icon">✅</span><span>Wallet connected</span>';
    }
    if (connectBtn) {
      connectBtn.style.display = 'none';
    }
    if (walletAddressDisplay) {
      walletAddressDisplay.style.display = 'flex';
    }
    if (walletAddressValue && window.walletAPIInstance) {
      walletAddressValue.textContent = window.walletAPIInstance.formatAddress(address);
    }
  } else {
    // Wallet not connected
    if (walletStatusText) {
      walletStatusText.innerHTML = '<span class="wallet-icon">🔒</span><span>Connect wallet to play</span>';
    }
    if (connectBtn) {
      connectBtn.style.display = 'flex';
    }
    if (walletAddressDisplay) {
      walletAddressDisplay.style.display = 'none';
    }
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
      // Initialize wallet API (determine network from backend config or default to mainnet)
      const network = 'mainnet'; // TODO: Get from backend config
      const api = await WalletAPI.initialize({ network });
      
      // Store globally for easy access
      window.walletAPIInstance = api;
      
      console.log('✅ Wallet API initialized');
      
      // Listen for wallet changes
      api.on(async (event) => {
        console.log('🔔 Wallet event:', event);
        updateWalletUI(event.address);
        
        if (event.type === 'connected' && event.address) {
          // Check MEWS balance when wallet connects
          await checkMEWSBalanceAndUpdateUI(event.address);
        } else if (event.type === 'disconnected') {
          disableStartGameButton();
          updateBalanceUI(null, false);
          updateWalletRequirementsUI(false, false);
          const walletStatusText = document.getElementById('walletStatusText');
          if (walletStatusText) {
            walletStatusText.innerHTML = '<span class="wallet-icon">🔒</span><span>Connect Sui wallet to play</span>';
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
// Update wallet requirements UI
function updateWalletRequirementsUI(walletConnected, hasMinimumBalance) {
  const walletRequirement = document.getElementById('walletRequirement');
  const mewsRequirement = document.getElementById('mewsRequirement');
  const requirementsNotice = document.getElementById('walletRequirementsNotice');
  
  if (requirementsNotice) {
    requirementsNotice.style.display = (!walletConnected || !hasMinimumBalance) ? 'block' : 'none';
  }
  
  if (walletRequirement) {
    if (walletConnected) {
      walletRequirement.innerHTML = '✅ <span style="text-decoration: line-through;">Connect your Sui wallet</span>';
      walletRequirement.style.color = '#00ff00';
    } else {
      walletRequirement.innerHTML = '🔗 Connect your Sui wallet (Slush, Sui Wallet, Surf, Suiet, Ethos, OKX, Phantom, Klever, Trust, Coinbase, or any Sui-compatible wallet)';
      walletRequirement.style.color = '#ff4444';
    }
  }
  
  if (mewsRequirement) {
    if (hasMinimumBalance) {
      mewsRequirement.innerHTML = '✅ <span style="text-decoration: line-through;">Have at least 500,000 $MEWS tokens</span>';
      mewsRequirement.style.color = '#00ff00';
    } else {
      mewsRequirement.innerHTML = '💰 Have at least 500,000 $MEWS tokens';
      mewsRequirement.style.color = '#ff4444';
    }
  }
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
    const walletStatusText = document.getElementById('walletStatusText');
    if (walletStatusText) {
      walletStatusText.innerHTML = `<span class="wallet-icon">⚠️</span><span>Error checking balance: ${error.message || 'Unknown error'}</span>`;
    }
  }
}

// Update balance UI display
function updateBalanceUI(balance, hasMinimum) {
  // Update balance display if element exists
  const balanceDisplay = document.getElementById('mewsBalanceDisplay');
  const balanceElement = document.getElementById('mewsBalance');
  
  if (balanceDisplay && balanceElement) {
    if (balance) {
      balanceDisplay.style.display = 'block';
      balanceElement.textContent = `${balance} $MEWS`;
      balanceElement.style.color = hasMinimum ? '#00ff00' : '#ff4444';
    } else {
      balanceDisplay.style.display = 'none';
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
    startGameBtn.title = 'Requirements: Connect wallet and have at least 500,000 $MEWS tokens';
    startGameBtn.style.opacity = '0.5';
    startGameBtn.style.cursor = 'not-allowed';
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
  
  updateMenuStats();
  
  // Update wallet UI when menu is shown
  if (window.walletAPIInstance && window.walletAPIInstance.isConnected()) {
    updateWalletUI(window.walletAPIInstance.getAddress());
  } else {
    updateWalletUI(null);
  }
}