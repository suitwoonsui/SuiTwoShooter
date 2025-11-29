// ==========================================
// MENU SYSTEM (EXACT COPY FROM HTML)
// ==========================================

console.log('📦 [MENU SYSTEM] ========== SCRIPT LOADING ==========');
console.log('📦 [MENU SYSTEM] Script file: menu-system.js');
console.log('📦 [MENU SYSTEM] Document ready state:', document.readyState);
console.log('📦 [MENU SYSTEM] Window object available:', typeof window !== 'undefined');
console.log('📦 [MENU SYSTEM] Current time:', new Date().toISOString());

// Wallet connection handlers
// IMPORTANT: Connect button should NEVER be disabled by readiness checks
// It's needed to connect wallet and load data in the first place

async function handleConnectWallet() {
  console.log('🔗 [WALLET CONNECT] ========== CONNECT WALLET CALLED ==========');
  console.log('🔗 [WALLET CONNECT] Function handleConnectWallet called');
  console.log('🔗 [WALLET CONNECT] Call stack:', new Error().stack?.split('\n').slice(0, 5).join('\n'));
  console.log('🔗 [WALLET CONNECT] WalletAPI available:', typeof WalletAPI !== 'undefined');
  console.log('🔗 [WALLET CONNECT] walletAPIInstance available:', !!window.walletAPIInstance);
  console.log('🔗 [WALLET CONNECT] walletAPIInstance type:', typeof window.walletAPIInstance);
  console.log('🔗 [WALLET CONNECT] window.handleConnectWallet === handleConnectWallet:', window.handleConnectWallet === handleConnectWallet);
  
  if (typeof WalletAPI === 'undefined' || !window.walletAPIInstance) {
    alert('Wallet API not initialized. Please refresh the page.');
    return;
  }
  
  const connectBtn = document.getElementById('connectWalletBtn');
  const connectBtnText = document.getElementById('connectWalletBtnText');
  
  // Disable button during connection (temporary, only during connection process)
  if (connectBtn) {
    connectBtn.disabled = true;
    if (connectBtnText) connectBtnText.textContent = 'Connecting...';
  }
  
  try {
    const result = await window.walletAPIInstance.connect();
    
    if (result.success) {
      console.log('✅ Wallet connected:', result.address);
      updateWalletUI(result.address);
      // Don't call checkMEWSBalanceAndUpdateUI here - the wallet event listener (line 627)
      // will handle it when the 'connected' event fires. This prevents duplicate calls.
      // The event listener will:
      // 1. Call checkMEWSBalanceAndUpdateUI(event.address)
      // 2. Call updateMenuStats()
      // Test button will be enabled by updateGameReadiness() after data loads
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
    // Re-enable button after connection attempt
    if (connectBtn) {
      connectBtn.disabled = false;
      if (connectBtnText) connectBtnText.textContent = 'Connect Wallet';
    }
  }
}

// Expose functions globally for onclick handlers in HTML
// Do this immediately so it's available when HTML loads
console.log('📦 [MENU SYSTEM] Exposing functions to window...');
window.handleConnectWallet = handleConnectWallet;
window.handleDisconnectWallet = handleDisconnectWallet;
console.log('✅ [MENU SYSTEM] Functions exposed to window');
console.log('✅ [MENU SYSTEM] window.handleConnectWallet type:', typeof window.handleConnectWallet);
console.log('✅ [MENU SYSTEM] window.handleConnectWallet === handleConnectWallet:', window.handleConnectWallet === handleConnectWallet);

// Verify it's available
if (typeof window.handleConnectWallet === 'function') {
  console.log('✅ [MENU SYSTEM] handleConnectWallet is available on window object');
  console.log('✅ [MENU SYSTEM] Can call window.handleConnectWallet()');
} else {
  console.error('❌ [MENU SYSTEM] handleConnectWallet is NOT available on window object!');
  console.error('❌ [MENU SYSTEM] window.handleConnectWallet value:', window.handleConnectWallet);
}

// Also check if button exists and what onclick it has
console.log('📦 [MENU SYSTEM] Checking connect button...');
if (typeof document !== 'undefined') {
  // Check immediately
  const connectBtnImmediate = document.getElementById('connectWalletBtn');
  if (connectBtnImmediate) {
    console.log('✅ [MENU SYSTEM] Connect button found immediately in DOM');
    console.log('📦 [MENU SYSTEM] Button onclick attribute:', connectBtnImmediate.getAttribute('onclick'));
    console.log('📦 [MENU SYSTEM] window.handleConnectWallet available:', typeof window.handleConnectWallet);
  } else {
    console.log('⏳ [MENU SYSTEM] Connect button not found immediately (DOM may not be ready)');
  }
  
  // Use setTimeout to check after DOM might be ready
  setTimeout(() => {
    const connectBtn = document.getElementById('connectWalletBtn');
    if (connectBtn) {
      console.log('✅ [MENU SYSTEM] Connect button found in DOM (delayed check)');
      console.log('📦 [MENU SYSTEM] Button onclick attribute:', connectBtn.getAttribute('onclick'));
      console.log('📦 [MENU SYSTEM] window.handleConnectWallet available at button check:', typeof window.handleConnectWallet);
      
      // Check if function is callable
      if (typeof window.handleConnectWallet === 'function') {
        console.log('✅ [MENU SYSTEM] Function is callable from button');
      } else {
        console.error('❌ [MENU SYSTEM] Function is NOT callable from button!');
        console.error('❌ [MENU SYSTEM] Available on window:', Object.keys(window).filter(k => k.includes('handle') || k.includes('Connect')));
      }
    } else {
      console.log('⏳ [MENU SYSTEM] Connect button not found (delayed check)');
    }
  }, 100);
  
  // Also check on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('📦 [MENU SYSTEM] DOMContentLoaded fired - checking button again');
      const connectBtn = document.getElementById('connectWalletBtn');
      if (connectBtn) {
        console.log('✅ [MENU SYSTEM] Connect button found on DOMContentLoaded');
        console.log('📦 [MENU SYSTEM] Button onclick:', connectBtn.getAttribute('onclick'));
        console.log('📦 [MENU SYSTEM] window.handleConnectWallet:', typeof window.handleConnectWallet);
      }
    });
  }
}

console.log('📦 [MENU SYSTEM] ========== SCRIPT LOAD COMPLETE ==========');

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

// Track last loaded badge to prevent redundant calls
// Old tracking variables removed - now handled by GameDataFlow

/**
 * Load and display badge in main menu (if player has one)
 * @param {string} walletAddress - Player's wallet address
 */
// Load menu badge display
// NOW USES GameDataFlow - refactored architecture
async function loadMenuBadgeDisplay(walletAddress) {
  // Use new flow controller - GameDataFlow is required
  if (typeof GameDataFlow === 'undefined' || !GameDataFlow.load) {
    console.error('❌ [MENU] GameDataFlow not available - this should not happen');
    return;
  }

  console.log('✅ [MENU] Using NEW REFACTORED SYSTEM (GameDataFlow) for badge load');
  try {
    await GameDataFlow.load(walletAddress, { skipBalance: true });

    // Update game readiness state from GameDataState
    if (typeof GameDataState !== 'undefined') {
      const readiness = GameDataState.getReadinessState();
      gameReadinessState.dataLoaded = readiness.dataLoaded;
      gameReadinessState.migrationCheckComplete = readiness.migrationCheckComplete;
      gameReadinessState.migrationModalClosed = readiness.migrationModalClosed;
          }
    
    // Update game readiness UI
    if (typeof updateGameReadiness === 'function') {
      updateGameReadiness();
    }
          } catch (error) {
    console.error('❌ Error loading badge:', error);
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
// Track last processed wallet event to prevent duplicates
let lastWalletEvent = null;
let lastWalletEventTime = 0;
const WALLET_EVENT_DEBOUNCE_MS = 500; // Ignore duplicate events within 500ms

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
        
        // Deduplicate events - check if this is a duplicate of the last event
        const eventKey = `${event.type}_${event.address || 'null'}`;
        const now = Date.now();
        const timeSinceLastEvent = now - lastWalletEventTime;
        
        if (lastWalletEvent === eventKey && timeSinceLastEvent < WALLET_EVENT_DEBOUNCE_MS) {
          console.log(`⏭️ [MENU] Duplicate wallet event detected (${timeSinceLastEvent}ms ago) - skipping:`, event);
          return; // Skip duplicate event
        }
        
        // Record this event
        lastWalletEvent = eventKey;
        lastWalletEventTime = now;
        console.log('✅ [MENU] Processing wallet event:', event);
        
        // Use new flow controller for wallet events
        if (typeof GameDataFlow !== 'undefined') {
          console.log('✅ [MENU] Using NEW REFACTORED SYSTEM (GameDataFlow) for wallet event');
        if (event.type === 'connected' && event.address) {
            GameDataFlow.onWalletConnected(event.address);
          // Update menu stats from blockchain when wallet connects
          if (typeof updateMenuStats === 'function') {
            updateMenuStats().catch(err => console.warn('Failed to update menu stats:', err));
          }
        } else if (event.type === 'disconnected') {
            GameDataFlow.onWalletDisconnected();
            if (typeof disableStartGameButton === 'function') {
          disableStartGameButton();
            }
          updateBalanceUI(null, false);
          updateWalletRequirementsUI(false, false);
          const walletStatusText = document.getElementById('walletStatusText');
          if (walletStatusText) {
            walletStatusText.innerHTML = '<span class="wallet-icon">🔒</span><span>Connect Sui wallet to play</span>';
          }
          if (typeof updateMenuStats === 'function') {
            updateMenuStats().catch(err => console.warn('Failed to update menu stats:', err));
          }
          const testBtn = document.getElementById('startGameTestBtn');
          if (testBtn) {
            testBtn.disabled = true;
            testBtn.style.opacity = '0.5';
            testBtn.style.cursor = 'not-allowed';
          }
          }
        } else {
          console.error('❌ [MENU] GameDataFlow not available - this should not happen');
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
        // Test button will be enabled by updateGameReadiness() after data loads
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
// NOTE: This function is now a wrapper around GameDataFlow.load() for backward compatibility
// All new code should use GameDataFlow.load() directly
async function checkMEWSBalanceAndUpdateUI(address) {
  if (!window.walletAPIInstance) {
    console.warn('⚠️ Wallet API not available');
    disableStartGameButton();
    return;
  }
  
  // Use new flow controller - GameDataFlow is required
  if (typeof GameDataFlow === 'undefined' || !GameDataFlow.load) {
    console.error('❌ [MENU] GameDataFlow not available - this should not happen');
  disableStartGameButton();
    return;
  }
  
  console.log('✅ [MENU] Using NEW REFACTORED SYSTEM (GameDataFlow) for balance check');
  try {
    await GameDataFlow.load(address);
      
    // Update game readiness state from GameDataState
    if (typeof GameDataState !== 'undefined') {
      const readiness = GameDataState.getReadinessState();
      gameReadinessState.dataLoaded = readiness.dataLoaded;
      gameReadinessState.migrationCheckComplete = readiness.migrationCheckComplete;
      gameReadinessState.migrationModalClosed = readiness.migrationModalClosed;
    }
    
    // Update game readiness UI
    if (typeof updateGameReadiness === 'function') {
      updateGameReadiness();
    }
  } catch (error) {
    console.error('❌ Error loading game data:', error);
    disableStartGameButton();
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

function updateGameReadiness() {
  // Update both start button and test button based on readiness
  if (isGameReady()) {
    // Enable test button (bypasses balance check)
    const testBtn = document.getElementById('startGameTestBtn');
    if (testBtn && window.walletAPIInstance && window.walletAPIInstance.isConnected()) {
      testBtn.disabled = false;
      testBtn.style.opacity = '1';
      testBtn.style.cursor = 'pointer';
      console.log('✅ [GAME READINESS] Test button enabled - all checks complete');
    }
    
    // Enable regular start button if balance is sufficient
    if (window.walletAPIInstance && window.walletAPIInstance.isConnected()) {
      const balanceStatus = window.walletAPIInstance.getBalanceStatus();
      if (balanceStatus.hasMinimumBalance) {
        enableStartGameButton();
        console.log('✅ [GAME READINESS] Start button enabled - all checks complete');
      } else {
        disableStartGameButton();
        console.log('⏳ [GAME READINESS] Start button disabled - insufficient balance');
      }
    } else {
      disableStartGameButton();
      console.log('⏳ [GAME READINESS] Start button disabled - wallet not connected');
    }
  } else {
    // Disable both buttons until ready
    disableStartGameButton();
    const testBtn = document.getElementById('startGameTestBtn');
    if (testBtn) {
      testBtn.disabled = true;
      testBtn.style.opacity = '0.5';
      testBtn.style.cursor = 'not-allowed';
    }
    console.log('⏳ [GAME READINESS] Buttons disabled - waiting for:', {
      dataLoaded: gameReadinessState.dataLoaded,
      migrationCheckComplete: gameReadinessState.migrationCheckComplete,
      migrationModalClosed: gameReadinessState.migrationModalClosed,
    });
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
  
  // Still require data to be loaded and migration check complete
  if (!isGameReady()) {
    console.log('⏳ [TEST MODE] Waiting for data to load and migration check to complete...');
    alert('Please wait for game data to finish loading before starting.');
    return;
  }
  
  // Still require wallet connection (for blockchain features)
  if (!window.walletAPIInstance || !window.walletAPIInstance.isConnected()) {
    alert('Please connect your wallet first. (Required for blockchain features)');
    return;
  }
  
  // Bypass balance check and start game directly
  startGameInternal();
}

// Track game readiness state
const gameReadinessState = {
  dataLoaded: false,
  migrationCheckComplete: false,
  migrationModalClosed: true, // Start as true (no modal needed)
};

function isGameReady() {
  // Game is ready if:
  // 1. Data is loaded
  // 2. Migration check is complete
  // 3. Migration modal is closed (or was never needed)
  return gameReadinessState.dataLoaded && 
         gameReadinessState.migrationCheckComplete &&
         gameReadinessState.migrationModalClosed;
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
    const address = window.walletAPIInstance.getAddress();
    updateWalletUI(address);
    
    // Use new flow controller - GameDataFlow is required
    if (typeof GameDataFlow === 'undefined' || !GameDataFlow.onReturnToMenu) {
      console.error('❌ [MENU] GameDataFlow not available - this should not happen');
      return;
    }
    
    console.log('✅ [MENU] Using NEW REFACTORED SYSTEM (GameDataFlow) for return to menu');
    GameDataFlow.onReturnToMenu();
  } else {
    updateWalletUI(null);
    const badgeDisplay = document.getElementById('menuBadgeDisplay');
    if (badgeDisplay) {
      badgeDisplay.style.display = 'none';
    }
    if (typeof GameDataFlow !== 'undefined' && GameDataFlow.onWalletDisconnected) {
      GameDataFlow.onWalletDisconnected();
    } else {
      console.error('❌ [MENU] GameDataFlow not available - this should not happen');
    }
  }
}

// Expose functions globally (defined later in file)
window.showSettings = showSettings;
window.showInstructions = showInstructions;