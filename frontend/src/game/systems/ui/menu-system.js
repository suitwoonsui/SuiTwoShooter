// ==========================================
// MENU SYSTEM (EXACT COPY FROM HTML)
// ==========================================

/**
 * ==========================================
 * MENU SYSTEM - Wallet Integration & Event Handling
 * ==========================================
 * 
 * This module serves as the entry point for wallet integration and provides
 * wrappers that delegate to specialized services:
 * 
 * - MenuService: Menu visibility and panel management
 * - WalletService: Wallet connection, disconnection, and UI updates
 * - GameService: Game lifecycle (start, stop, readiness)
 * 
 * All services are guaranteed to load before this module (see lazy-loader.js),
 * so we can directly call service methods without fallback checks.
 */

// Use FrontendLogger if available, fallback to console
// Use var to allow redeclaration when multiple scripts are loaded
var log = (typeof window !== 'undefined' && window.FrontendLogger) 
  ? {
      debug: (cat, msg, data) => window.FrontendLogger.debug(cat, msg, data),
      info: (cat, msg, data) => window.FrontendLogger.info(cat, msg, data),
      warn: (cat, msg, data) => window.FrontendLogger.warn(cat, msg, data),
      error: (cat, msg, data) => window.FrontendLogger.error(cat, msg, data),
    }
  : {
      debug: () => {},
      info: (cat, msg, data) => console.log(`[${cat}] ${msg}`, data || ''),
      warn: (cat, msg, data) => console.warn(`[${cat}] ${msg}`, data || ''),
      error: (cat, msg, data) => console.error(`[${cat}] ${msg}`, data || ''),
    };

// Wallet connection handlers
// IMPORTANT: Connect button should NEVER be disabled by readiness checks
// It's needed to connect wallet and load data in the first place

async function handleConnectWallet() {
  log.debug('MENU SYSTEM', 'Connect wallet called');
  const result = await WalletService.connect();
  
  if (!result.success) {
    // Show error alert if connection failed
    alert(`Failed to connect wallet: ${result.error || 'Unknown error'}`);
  }
  // Note: WalletService handles UI updates and event listener will handle data loading
}

// Expose functions globally for onclick handlers in HTML
// Do this immediately so it's available when HTML loads
window.handleConnectWallet = handleConnectWallet;
window.handleDisconnectWallet = handleDisconnectWallet;
// Note: showMainMenu, showSettings, showInstructions, startGame are exposed later in the file

// Verify it's available
if (typeof window.handleConnectWallet === 'function') {
  log.debug('MENU SYSTEM', 'handleConnectWallet is available on window object');
} else {
  log.error('MENU SYSTEM', 'handleConnectWallet is NOT available on window object!', window.handleConnectWallet);
}

// Also check if button exists and what onclick it has
log.debug('MENU SYSTEM', 'Checking connect button');
if (typeof document !== 'undefined') {
  // Check immediately
  const connectBtnImmediate = document.getElementById('connectWalletBtn');
  if (connectBtnImmediate) {
    log.debug('MENU SYSTEM', 'Connect button found immediately in DOM');
  } else {
    log.debug('MENU SYSTEM', 'Connect button not found immediately (DOM may not be ready)');
  }
  
  // Use setTimeout to check after DOM might be ready
  setTimeout(() => {
    const connectBtn = document.getElementById('connectWalletBtn');
    if (connectBtn) {
      log.debug('MENU SYSTEM', 'Connect button found in DOM (delayed check)');
      
      // Check if function is callable
      if (typeof window.handleConnectWallet === 'function') {
        log.debug('MENU SYSTEM', 'Function is callable from button');
      } else {
        log.error('MENU SYSTEM', 'Function is NOT callable from button!', Object.keys(window).filter(k => k.includes('handle') || k.includes('Connect')));
      }
    } else {
      log.debug('MENU SYSTEM', 'Connect button not found (delayed check)');
    }
  }, 100);
  
  // Also check on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      log.debug('MENU SYSTEM', 'DOMContentLoaded fired - checking button again');
      const connectBtn = document.getElementById('connectWalletBtn');
      if (connectBtn) {
        log.debug('MENU SYSTEM', 'Connect button found on DOMContentLoaded');
      }
    });
  }
}

log.debug('MENU SYSTEM', 'Script load complete');

async function handleDisconnectWallet() {
  log.debug('MENU SYSTEM', 'Disconnecting wallet');
  await WalletService.disconnect();
}

function updateWalletUI(address) {
  WalletService.updateWalletUI(address);
}

// Track last loaded badge to prevent redundant calls
// Old tracking variables removed - now handled by GameDataFlow

/**
 * Load and display badge in main menu (if player has one)
 * @param {string} walletAddress - Player's wallet address
 */
// Load menu badge display
// NOW USES WalletService - refactored architecture
async function loadMenuBadgeDisplay(walletAddress) {
  log.debug('MENU SYSTEM', 'Using WalletService for badge load');
  await WalletService.loadMenuBadgeDisplay(walletAddress);
}

// Legacy fallback code removed - services are guaranteed to load

function enableStartGameButton() {
  if (typeof GameService !== 'undefined' && GameService.enableStartGameButton) {
  GameService.enableStartGameButton();
  }
}

function disableStartGameButton() {
  if (typeof GameService !== 'undefined' && GameService.disableStartGameButton) {
  GameService.disableStartGameButton();
  }
}

/**
 * Initialize wallet connection on page load
 * Delegates to WalletService.initialize() when available
 * @returns {Promise<void>}
 */
async function initializeWalletIntegration() {
  log.debug('MENU SYSTEM', 'initializeWalletIntegration() called - delegating to WalletService');
  await WalletService.initialize();
}

// Legacy fallback code removed - services are guaranteed to load

// Close game completely - stop engine and free resources
function closeGame() {
  log.debug('MENU SYSTEM', 'closeGame() called');
  if (typeof GameService !== 'undefined' && GameService.closeGame) {
  GameService.closeGame(true); // Return to appropriate menu (tournament or main)
  }
}

// Main menu functions
// Update wallet requirements UI (simplified - no tooltip)
function updateWalletRequirementsUI(walletConnected, hasMinimumBalance) {
  WalletService.updateWalletRequirementsUI(walletConnected, hasMinimumBalance);
}

// Check MEWS balance and update UI
// NOTE: This function is now a wrapper around WalletService.checkMEWSBalanceAndUpdateUI() for backward compatibility
// All new code should use WalletService.checkMEWSBalanceAndUpdateUI() or GameDataFlow.load() directly
async function checkMEWSBalanceAndUpdateUI(address) {
  log.debug('MENU SYSTEM', 'Using WalletService for balance check');
  await WalletService.checkMEWSBalanceAndUpdateUI(address);
}

// Legacy fallback code removed - services are guaranteed to load

// Update balance UI display
function updateBalanceUI(balance, hasMinimum) {
  WalletService.updateBalanceUI(balance, hasMinimum);
}

// Legacy fallback code removed - services are guaranteed to load

function updateGameReadiness() {
  if (typeof GameService !== 'undefined' && GameService.updateGameReadiness) {
  GameService.updateGameReadiness();
  }
}

// Legacy fallback code removed - services are guaranteed to load

// Test mode: Start game bypassing gatekeeping (for development/testing)
function startGameTest() {
  log.debug('MENU SYSTEM', 'startGameTest() called');
  GameService.startGameTest().catch(err => {
    log.error('MENU SYSTEM', 'Error starting game (test mode)', err);
  });
}

// Legacy fallback code removed - services are guaranteed to load

function isGameReady() {
  return GameService.isGameReady();
}

// Legacy fallback code removed - services are guaranteed to load

function startGame() {
  log.debug('MENU SYSTEM', 'startGame() called');
  if (typeof window !== 'undefined' && typeof window.showStore === 'function') {
    window.showStore('regular-entry').catch((err) => {
      log.error('MENU SYSTEM', 'Error opening prep loadout', err);
    });
    return;
  }
  GameService.startGame().catch((err) => {
    log.error('MENU SYSTEM', 'Error starting game', err);
  });
}

// Legacy fallback code removed - services are guaranteed to load

// startGameInternal() removed - functionality moved to GameService._startGameInternal()

function showSettings() {
  log.debug('MENU SYSTEM', 'showSettings() called');
  // Check if name input modal is visible - it shouldn't trigger settings
  const nameInputModal = document.getElementById('nameInputModal');
  if (nameInputModal && nameInputModal.classList.contains('name-input-modal-visible')) {
    log.error('MENU SYSTEM', 'ERROR: showSettings() called while name input modal is visible! This should not happen!');
    return; // Prevent opening settings if name input modal is showing
  }
  
  // Hide main menu first
  MenuService.hide();

  if (typeof MenuPanelLoading !== 'undefined' && MenuPanelLoading.show) {
    MenuPanelLoading.show('Loading settings... Please wait');
  }
  
  // Show settings panel directly
  const settingsPanel = document.getElementById('settingsPanel');
  if (settingsPanel) {
    settingsPanel.classList.remove('settings-panel-hidden');
    settingsPanel.classList.add('settings-panel-visible');
    _setupSettingsClickOutside(settingsPanel);
    try {
      loadSettingsToUI();
    } finally {
      if (typeof MenuPanelLoading !== 'undefined' && MenuPanelLoading.hide) {
        MenuPanelLoading.hide();
      }
    }
    log.debug('MENU SYSTEM', 'Settings panel shown');
  } else {
    if (typeof MenuPanelLoading !== 'undefined' && MenuPanelLoading.hide) {
      MenuPanelLoading.hide();
    }
    log.warn('MENU SYSTEM', 'Settings panel element not found!');
  }
}

// Legacy fallback code removed - services are guaranteed to load

// Store click-outside handlers so we can remove them when switching panels
let _activeClickOutsideHandlers = [];

/**
 * Remove all active click-outside handlers
 * @private
 */
function _removeAllClickOutsideHandlers() {
  _activeClickOutsideHandlers.forEach(({ handler }) => {
    document.removeEventListener('click', handler);
  });
  _activeClickOutsideHandlers = [];
  log.debug('MENU SYSTEM', 'All click-outside handlers removed');
}

/**
 * Setup click outside handler for settings panel
 * @private
 */
function _setupSettingsClickOutside(settingsPanel) {
  // Remove any existing handlers first
  _removeAllClickOutsideHandlers();
  
  // Close panel when clicking outside
  const handleClickOutside = (event) => {
    // Only process if settings panel is actually visible
    if (!settingsPanel.classList.contains('settings-panel-visible')) {
      return; // Panel is not visible, ignore this event
    }
    
    const target = event.target;
    // IMPORTANT: Don't close settings if clicking on name input modal
    const nameInputModal = document.getElementById('nameInputModal');
    if (nameInputModal && nameInputModal.contains(target)) {
      return; // Don't process this click for settings panel
    }
    
    if (!settingsPanel.contains(target)) {
      hideSettings();
      document.removeEventListener('click', handleClickOutside);
      // Remove from active handlers
      _activeClickOutsideHandlers = _activeClickOutsideHandlers.filter(h => h.handler !== handleClickOutside);
    }
  };
  
  // Store handler so we can remove it later
  _activeClickOutsideHandlers.push({ handler: handleClickOutside, panel: 'settings' });
  
  // Use setTimeout to avoid immediate firing
  setTimeout(() => {
    log.debug('MENU SYSTEM', 'Adding click outside listener for settings');
    document.addEventListener('click', handleClickOutside);
  }, 0);
}

function hideSettings() {
  const settingsPanel = document.getElementById('settingsPanel');
  
  if (settingsPanel) {
    settingsPanel.classList.add('settings-panel-hidden');
    settingsPanel.classList.remove('settings-panel-visible');
    
    // Show main menu again after closing settings
    MenuService.show({ fromMenuPanel: true });
  } else {
    log.warn('MENU SYSTEM', 'Settings panel element not found!');
  }
}

function showInstructions() {
  log.debug('MENU SYSTEM', 'showInstructions() called');
  
  // Hide main menu first
  MenuService.hide();

  if (typeof MenuPanelLoading !== 'undefined' && MenuPanelLoading.show) {
    MenuPanelLoading.show('Loading How to Play... Please wait');
  }
  
  // Show instructions panel directly
  const instructionsPanel = document.getElementById('instructionsPanel');
  if (instructionsPanel) {
    instructionsPanel.classList.remove('instructions-panel-hidden');
    instructionsPanel.classList.add('instructions-panel-visible');
    _setupInstructionsClickOutside(instructionsPanel);
    
    // Initialize the enhanced modal if not already done
    // Defer initialization slightly to allow modal to become visible first (better UX)
    if (typeof initHowToPlayModal === 'function' && !instructionsPanel.dataset.initialized) {
      requestAnimationFrame(() => {
        try {
          initHowToPlayModal();
          instructionsPanel.dataset.initialized = 'true';
          if (window.howToPlayState) {
            showHowToPlayTab(0);
            showHowToPlayContent(0);
          }
        } finally {
          if (typeof MenuPanelLoading !== 'undefined' && MenuPanelLoading.hide) {
            MenuPanelLoading.hide();
          }
        }
      });
    } else {
      try {
        if (window.howToPlayState) {
          showHowToPlayTab(0);
          showHowToPlayContent(0);
        }
      } finally {
        if (typeof MenuPanelLoading !== 'undefined' && MenuPanelLoading.hide) {
          MenuPanelLoading.hide();
        }
      }
    }
    
    log.debug('MENU SYSTEM', 'Instructions panel shown');
  } else {
    if (typeof MenuPanelLoading !== 'undefined' && MenuPanelLoading.hide) {
      MenuPanelLoading.hide();
    }
    log.warn('MENU SYSTEM', 'Instructions panel element not found!');
  }
}

// Legacy fallback code removed - services are guaranteed to load

/**
 * Setup click outside handler for instructions panel
 * @private
 */
function _setupInstructionsClickOutside(instructionsPanel) {
  // Remove any existing handlers first
  _removeAllClickOutsideHandlers();
  
  // Close panel when clicking outside
  const handleClickOutside = (event) => {
    // Only process if instructions panel is actually visible
    if (!instructionsPanel.classList.contains('instructions-panel-visible')) {
      return; // Panel is not visible, ignore this event
    }
    
    if (!instructionsPanel.contains(event.target)) {
      hideInstructions();
      document.removeEventListener('click', handleClickOutside);
      // Remove from active handlers
      _activeClickOutsideHandlers = _activeClickOutsideHandlers.filter(h => h.handler !== handleClickOutside);
    }
  };
  
  // Store handler so we can remove it later
  _activeClickOutsideHandlers.push({ handler: handleClickOutside, panel: 'instructions' });
  
  // Use setTimeout to avoid immediate firing
  setTimeout(() => {
    log.debug('MENU SYSTEM', 'Adding click outside listener for instructions');
    document.addEventListener('click', handleClickOutside);
  }, 0);
}

function hideInstructions() {
  const instructionsPanel = document.getElementById('instructionsPanel');
  if (instructionsPanel) {
    instructionsPanel.classList.add('instructions-panel-hidden');
    instructionsPanel.classList.remove('instructions-panel-visible');
    
    // Show main menu again after closing instructions
    MenuService.show({ fromMenuPanel: true });
  }
}

// Game over handling
function onGameOverMenu(finalScore) {
  // Use uiGameState if available, otherwise gameState (after game scripts load)
  let state = typeof uiGameState !== 'undefined' ? uiGameState : (typeof gameState !== 'undefined' ? gameState : null);
  if (state) {
    state.isGameRunning = false;
    state.isGameOver = true;
  } else {
    log.warn('MENU SYSTEM', 'Neither uiGameState nor gameState is available!');
  }
  
  // Update best score
  if (finalScore > gameStats.bestScore) {
    gameStats.bestScore = finalScore;
    saveGameData();
  }
  
  // Check if we should return to tournament screen instead of main menu
  const shouldReturnToTournament = (state && state.returnToTournament) ||
                                   (typeof window !== 'undefined' && window.game && window.game.returnToTournament);
  
  // Show appropriate screen after a delay
  setTimeout(() => {
    if (shouldReturnToTournament) {
      log.debug('MENU SYSTEM', 'Returning to tournament screen after game over');
      // Clear return flag
      if (state) state.returnToTournament = false;
      if (typeof window !== 'undefined' && window.game) {
        window.game.returnToTournament = false;
      }
      // Show tournament screen
      if (typeof showTournaments === 'function') {
        showTournaments();
      } else {
        log.warn('MENU SYSTEM', 'showTournaments not available, falling back to main menu');
        showMainMenu({ afterGame: true });
      }
    } else {
      showMainMenu({ afterGame: true });
    }
  }, 3000);
}

function showMainMenu(options = {}) {
  log.debug('MENU SYSTEM', 'showMainMenu() called');
  // Check if MenuService is available (may not be loaded yet)
  if (typeof MenuService !== 'undefined' && MenuService.show) {
  MenuService.show(options);
  } else {
    log.warn('MENU SYSTEM', 'MenuService not available, using fallback');
    // Fallback: manually show main menu
    const mainMenu = document.getElementById('mainMenuOverlay');
    if (mainMenu) {
      mainMenu.classList.remove('main-menu-overlay-hidden');
      mainMenu.classList.add('main-menu-overlay-visible');
      mainMenu.style.display = '';
      mainMenu.style.visibility = '';
      mainMenu.style.opacity = '';
    }
  }
}

// Legacy fallback code removed - services are guaranteed to load

// Expose functions globally (defined later in file)
window.showMainMenu = showMainMenu;
window.showSettings = showSettings;
window.showInstructions = showInstructions;
window.startGame = startGame;