// ==========================================
// MENU SERVICE - Menu Visibility and Panel Coordination
// ==========================================
// Handles main menu visibility and panel management
// Delegates wallet, game lifecycle, and stats to other services

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

log.info('MENU SERVICE', 'MenuService module loaded');

const MenuService = {
  // State
  _isVisible: false,
  _currentPanel: null, // 'settings' | 'instructions' | 'leaderboard' | 'store' | 'sound-test' | null
  _initialized: false,
  _isShowing: false, // Guard to prevent infinite recursion
  _calledFromCloseGame: false, // Guard to prevent calling closeGame when already called from closeGame
  
  // DOM element cache
  _mainMenuCache: null,
  _gameContainerCache: null,
  
  // Dependencies (accessed via window/global scope)
  _gameDataFlow: null,
  _gameState: null,
  
  /**
   * Get cached main menu element
   * @private
   */
  _getMainMenu() {
    if (!this._mainMenuCache) {
      this._mainMenuCache = document.getElementById('mainMenuOverlay');
    }
    return this._mainMenuCache;
  },
  
  /**
   * Get cached game container element
   * @private
   */
  _getGameContainer() {
    if (!this._gameContainerCache) {
      this._gameContainerCache = document.querySelector('.game-container');
    }
    return this._gameContainerCache;
  },
  
  /**
   * Invalidate DOM cache (call when elements are removed/recreated)
   * @private
   */
  _invalidateCache() {
    this._mainMenuCache = null;
    this._gameContainerCache = null;
  },
  
  /**
   * Initialize the menu service
   */
  init() {
    if (this._initialized) {
      log.warn('MENU SERVICE', 'Already initialized');
      return;
    }
    
    // Set up dependencies (may not be available immediately)
    this._gameDataFlow = typeof GameDataFlow !== 'undefined' ? GameDataFlow : null;
    this._gameState = typeof uiGameState !== 'undefined' ? uiGameState : null;
    
    // Initialize menu state - hidden by default
    this._isVisible = false;
    this._currentPanel = null;
    this._initialized = true;
    
    log.info('MENU SERVICE', 'Initialized');
  },
  
  /**
   * Show the main menu
   * @param {{ fromMenuPanel?: boolean, afterGame?: boolean }} [options] - fromMenuPanel: Back from a menu modal
   *   (shows MenuPanelLoading, cache-friendly data refresh). afterGame: returning from a run (forces stats/credits
   *   refresh + GameDataFlow.load with force).
   */
  async show(options = {}) {
    const fromMenuPanel = Boolean(options && options.fromMenuPanel);
    const afterGame = Boolean(options && options.afterGame);
    let menuReturnLoaderShown = false;

    // Prevent infinite recursion: if we're already showing, don't call closeGame again
    if (this._isShowing) {
      log.debug('MENU SERVICE', 'Already showing menu, skipping to prevent recursion');
      return;
    }
    
    this._isShowing = true;
    
    try {
    if (fromMenuPanel && typeof MenuPanelLoading !== 'undefined' && MenuPanelLoading.show) {
      MenuPanelLoading.show('Returning to menu... Please wait');
      menuReturnLoaderShown = true;
    }

    log.debug('MENU SERVICE', 'Showing main menu via MenuService.show()', { fromMenuPanel, afterGame });
    
    // Update dependencies if they weren't available during init
    if (!this._gameDataFlow && typeof GameDataFlow !== 'undefined') {
      this._gameDataFlow = GameDataFlow;
    }
    if (!this._gameState && typeof uiGameState !== 'undefined') {
      this._gameState = uiGameState;
    }
    
    // Hide all panels first to ensure clean state
    this.hideAllPanels();
    
    // Close any achievement popup that might be open (shouldn't happen, but safety check)
    const achievementPopup = document.getElementById('achievementPopup');
    if (achievementPopup && typeof window.closeAchievementPopup === 'function') {
      log.debug('MENU SERVICE', 'Closing lingering achievement popup');
      window.closeAchievementPopup();
    }
    
    // Hide game container
    this._hideGameContainer();
    
    // Show menu overlay - force show even if already marked as visible
    // This ensures DOM state matches internal state
    const mainMenu = this._getMainMenu();
    if (mainMenu) {
      // Force remove hidden class and add visible class
      mainMenu.classList.remove('main-menu-overlay-hidden');
      mainMenu.classList.add('main-menu-overlay-visible');
      
      // Remove inline styles to allow CSS classes to control visibility
      // CSS will handle display: flex via .main-menu-overlay[class*="-visible"]
      mainMenu.style.display = '';
      mainMenu.style.visibility = '';
      mainMenu.style.opacity = '';
      
      // CRITICAL: Re-enable all main menu buttons when showing the menu
      // This fixes the issue where buttons remain disabled after claiming milestones
      // (achievement popup disables buttons, and they need to be re-enabled when menu is shown)
      const buttons = mainMenu.querySelectorAll('button');
      buttons.forEach(btn => {
        // Re-enable all buttons to clear any disabled state from achievement popup
        // Start game buttons will have their state properly set by updateGameReadiness() below
        btn.disabled = false;
        btn.style.pointerEvents = '';
        btn.style.opacity = '';
      });
      
      this._isVisible = true;
      log.debug('MENU SERVICE', 'Menu overlay shown, buttons re-enabled');
    } else {
      log.error('MENU SERVICE', 'Main menu element not found!');
        this._isShowing = false;
      return;
    }
    
    // Update game state
    this._updateGameState({
      isMenuVisible: true,
      isGameRunning: false,
      isPaused: false,
      isGameOver: false
    });
    
    // Close game (delegate to game system)
      // Only call closeGame if we're not already being called from closeGame
      // This prevents infinite recursion: MenuService.show() -> closeGame() -> GameService.closeGame() -> MenuService.show()
      // Also check if game is actually running before closing it
      const gameState = this._gameState || (typeof gameState !== 'undefined' ? gameState : null);
      const isGameRunning = gameState?.isGameRunning || gameState?.gameRunning || 
                           (typeof window !== 'undefined' && window.gameState?.isGameRunning) ||
                           (typeof window !== 'undefined' && window.game?.gameRunning);
      
      if (typeof closeGame === 'function' && !this._calledFromCloseGame && isGameRunning) {
        this._calledFromCloseGame = true;
        try {
      closeGame();
        } finally {
          this._calledFromCloseGame = false;
        }
    }
    
    // Start menu music if audio is available and enabled
    if (typeof startMenuMusic === 'function' && typeof gameSettings !== 'undefined' && gameSettings.backgroundMusic) {
      startMenuMusic();
    }

    // Handle wallet state (delegate to GameDataFlow)
    if (this._gameDataFlow) {
      if (window.walletAPIInstance?.isConnected()) {
        const address = window.walletAPIInstance.getAddress();
        this._updateWalletUI(address);
        // Stats + credits: cache until stale unless returning from a game session
        const statsP = typeof updateMenuStats === 'function'
          ? updateMenuStats({ forceRefresh: afterGame })
          : Promise.resolve();
        const creditsP = (window.GamePassDisplay && typeof window.GamePassDisplay.refresh === 'function')
          ? window.GamePassDisplay.refresh(address, true, false, !afterGame)
          : Promise.resolve();
        await Promise.allSettled([statsP, creditsP]);
        if (this._gameDataFlow.onReturnToMenu) {
          this._gameDataFlow.onReturnToMenu({ force: afterGame, afterGame });
        }
        if (typeof window !== 'undefined' && typeof window.prefetchTournamentsIfStale === 'function') {
          window.prefetchTournamentsIfStale();
        }
        if (typeof window !== 'undefined' && typeof window.prefetchMyTournamentsIfStale === 'function') {
          window.prefetchMyTournamentsIfStale();
        }
        if (typeof window !== 'undefined' && typeof window.prefetchBadgeIfStale === 'function') {
          window.prefetchBadgeIfStale();
        }
        if (typeof window !== 'undefined' && typeof window.prefetchLeaderboardIfStale === 'function') {
          window.prefetchLeaderboardIfStale();
        }
        if (typeof updateGameReadiness === 'function') {
          updateGameReadiness();
        } else if (typeof GameService !== 'undefined' && GameService.updateGameReadiness) {
          GameService.updateGameReadiness();
        } else if (typeof GameService !== 'undefined' && GameService.enableStartGameButton) {
          GameService.enableStartGameButton();
        }
      } else {
        this._updateWalletUI(null);
        // No wallet: set best score and games played to "--" (consistent with credits/tickets)
        if (typeof updateMenuStats === 'function') {
          updateMenuStats().catch(() => {});
        }
        // Hide badge display when wallet disconnected
        const badgeDisplay = document.getElementById('menuBadgeDisplay');
        if (badgeDisplay) {
          badgeDisplay.style.display = 'none';
        }
        if (this._gameDataFlow.onWalletDisconnected) {
          this._gameDataFlow.onWalletDisconnected();
        }
      }
    } else {
      // Fallback: update wallet UI directly if GameDataFlow not available
      if (window.walletAPIInstance?.isConnected()) {
        const address = window.walletAPIInstance.getAddress();
        this._updateWalletUI(address);
        const statsP = typeof updateMenuStats === 'function'
          ? updateMenuStats({ forceRefresh: afterGame })
          : Promise.resolve();
        const creditsP = (window.GamePassDisplay && typeof window.GamePassDisplay.refresh === 'function')
          ? window.GamePassDisplay.refresh(address, true, false, !afterGame)
          : Promise.resolve();
        await Promise.allSettled([statsP, creditsP]);
        if (typeof window !== 'undefined' && typeof window.prefetchTournamentsIfStale === 'function') {
          window.prefetchTournamentsIfStale();
        }
        if (typeof window !== 'undefined' && typeof window.prefetchMyTournamentsIfStale === 'function') {
          window.prefetchMyTournamentsIfStale();
        }
        if (typeof window !== 'undefined' && typeof window.prefetchBadgeIfStale === 'function') {
          window.prefetchBadgeIfStale();
        }
        if (typeof window !== 'undefined' && typeof window.prefetchLeaderboardIfStale === 'function') {
          window.prefetchLeaderboardIfStale();
        }
        if (typeof updateGameReadiness === 'function') {
          updateGameReadiness();
        } else if (typeof GameService !== 'undefined' && GameService.updateGameReadiness) {
          GameService.updateGameReadiness();
        } else if (typeof GameService !== 'undefined' && GameService.enableStartGameButton) {
          GameService.enableStartGameButton();
        }
      } else {
        this._updateWalletUI(null);
        // No wallet: set best score and games played to "--" (consistent with credits/tickets)
        if (typeof updateMenuStats === 'function') {
          updateMenuStats().catch(() => {});
        }
        // Hide badge display when wallet disconnected
        const badgeDisplay = document.getElementById('menuBadgeDisplay');
        if (badgeDisplay) {
          badgeDisplay.style.display = 'none';
        }
        
        // Hide leaderboard claim badge when wallet disconnected
        const claimCountBadge = document.getElementById('leaderboardClaimCountBadge');
        if (claimCountBadge) {
          claimCountBadge.style.display = 'none';
        }
        const tabBadge = document.getElementById('milestonesTabClaimCountBadge');
        if (tabBadge) {
          tabBadge.style.display = 'none';
        }
      }
    }
    
    // Always reset showing flag
    this._isShowing = false;
    } catch (error) {
      log.error('MENU SERVICE', 'Error showing main menu', error);
      this._isShowing = false;
      this._isVisible = false;
    } finally {
      if (menuReturnLoaderShown && typeof MenuPanelLoading !== 'undefined' && MenuPanelLoading.hide) {
        MenuPanelLoading.hide();
      }
    }
  },
  
  /**
   * Hide the main menu
   */
  hide() {
    log.debug('MENU SERVICE', 'Hiding main menu');
    
    const mainMenu = this._getMainMenu();
    if (mainMenu) {
      // Force remove visible class and add hidden class
      mainMenu.classList.remove('main-menu-overlay-visible');
      mainMenu.classList.add('main-menu-overlay-hidden');
      
      // Remove inline styles to allow CSS classes to control visibility
      // This ensures the menu can be properly hidden
      mainMenu.style.display = '';
      mainMenu.style.visibility = '';
      mainMenu.style.opacity = '';
      
      this._isVisible = false;
      this._currentPanel = null;
      log.debug('MENU SERVICE', 'Menu overlay hidden');
    }
    
    this._updateGameState({ isMenuVisible: false });
  },
  
  /**
   * Show a panel (settings, instructions, etc.)
   * @param {string} panelName - Name of panel to show
   */
  showPanel(panelName) {
    log.debug('MENU SERVICE', `Showing panel: ${panelName} via MenuService.showPanel()`);
    
    // Hide menu first (panels are shown over/instead of menu)
    this.hide();
    
    // For function-based panels (leaderboard, store, sound-test), call the function
    // For DOM-based panels (settings, instructions), call the function which handles DOM directly
    const functionBasedPanels = ['leaderboard', 'store', 'sound-test'];
    
    if (functionBasedPanels.includes(panelName)) {
      const panelMap = {
        'leaderboard': 'showLeaderboard',
        'store': 'showStore',
        'sound-test': 'showSoundTest'
      };
      
      const showFn = panelMap[panelName];
      if (typeof window[showFn] === 'function') {
        window[showFn]();
        this._currentPanel = panelName;
        log.debug('MENU SERVICE', `Panel ${panelName} shown via ${showFn}()`);
      } else {
        log.error('MENU SERVICE', `Function ${showFn} not available`);
      }
    } else {
      // For settings and instructions, call the function which handles DOM directly
      const panelMap = {
        'settings': 'showSettings',
        'instructions': 'showInstructions'
      };
      
      const showFn = panelMap[panelName];
      if (typeof window[showFn] === 'function') {
        window[showFn]();
        this._currentPanel = panelName;
        log.debug('MENU SERVICE', `Panel ${panelName} shown via ${showFn}()`);
      } else {
        log.error('MENU SERVICE', `Function ${showFn} not available`);
      }
    }
  },
  
  /**
   * Hide all panels
   */
  hideAllPanels() {
    const panels = [
      { id: 'settingsPanel', visibleClass: 'settings-panel-visible', hiddenClass: 'settings-panel-hidden' },
      { id: 'instructionsPanel', visibleClass: 'instructions-panel-visible', hiddenClass: 'instructions-panel-hidden' },
      { id: 'nameInputModal', visibleClass: 'name-input-modal-visible', hiddenClass: 'name-input-modal-hidden' },
      { id: 'soundTestPanel', visibleClass: 'sound-test-panel-visible', hiddenClass: 'sound-test-panel-hidden' }
    ];
    
    panels.forEach(({ id, visibleClass, hiddenClass }) => {
      const panel = document.getElementById(id);
      if (panel) {
        panel.classList.remove(visibleClass);
        panel.classList.add(hiddenClass);
      }
    });
    
    // Also hide leaderboard and store if they have modals
    const leaderboardModal = document.getElementById('leaderboardModal');
    if (leaderboardModal) {
      leaderboardModal.classList.remove('leaderboard-modal-visible');
      leaderboardModal.classList.add('leaderboard-modal-hidden');
    }
    
    const storePanel = document.getElementById('storePanel');
    if (storePanel) {
      storePanel.classList.remove('store-panel-visible');
      storePanel.classList.add('store-panel-hidden');
    }
    
    this._currentPanel = null;
    log.debug('MENU SERVICE', 'All panels hidden');
  },
  
  /**
   * Get current menu state
   */
  isVisible() {
    return this._isVisible;
  },
  
  /**
   * Get current panel
   */
  getCurrentPanel() {
    return this._currentPanel;
  },
  
  /**
   * Private: Update game state
   */
  _updateGameState(state) {
    if (this._gameState) {
      Object.assign(this._gameState, state);
    } else if (typeof gameState !== 'undefined') {
      Object.assign(gameState, state);
    } else {
      log.warn('MENU SERVICE', 'Neither uiGameState nor gameState is available');
    }
  },
  
  /**
   * Private: Hide game container
   */
  _hideGameContainer() {
    const gameContainer = this._getGameContainer();
    if (gameContainer) {
      gameContainer.classList.remove('game-container-visible');
      gameContainer.classList.add('game-container-hidden');
      
      // Remove inline styles to allow CSS classes to control visibility
      gameContainer.style.display = '';
      gameContainer.style.visibility = '';
      
      log.debug('MENU SERVICE', 'Game container hidden');
    } else {
      log.warn('MENU SERVICE', 'Game container not found');
    }
  },
  
  /**
   * Private: Update wallet UI (delegates to existing function)
   */
  _updateWalletUI(address) {
    if (typeof updateWalletUI === 'function') {
      updateWalletUI(address);
    } else {
      log.warn('MENU SERVICE', 'updateWalletUI function not available');
    }
  }
};

// Initialize on load
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      MenuService.init();
    });
  } else {
    MenuService.init();
  }
  
  // Expose globally for debugging
  window.MenuService = MenuService;
  
  // Add debug function to check MenuService status
  window.checkMenuService = function() {
    log.debug('MENU SERVICE', '========== MENU SERVICE STATUS ==========');
    log.debug('MENU SERVICE', 'MenuService available', typeof MenuService !== 'undefined');
    if (typeof MenuService !== 'undefined') {
      log.debug('MENU SERVICE', 'MenuService initialized', MenuService._initialized);
      log.debug('MENU SERVICE', 'MenuService visible', MenuService.isVisible());
      log.debug('MENU SERVICE', 'MenuService current panel', MenuService.getCurrentPanel());
      log.debug('MENU SERVICE', 'MenuService has show method', typeof MenuService.show === 'function');
      log.debug('MENU SERVICE', 'MenuService has showPanel method', typeof MenuService.showPanel === 'function');
      log.debug('MENU SERVICE', 'GameDataFlow available', MenuService._gameDataFlow !== null);
      log.debug('MENU SERVICE', 'GameState available', MenuService._gameState !== null);
    }
    log.debug('MENU SERVICE', '========================================================');
    return typeof MenuService !== 'undefined';
  };
}

log.info('MENU SERVICE', 'MenuService module ready');
log.debug('MENU SERVICE', 'Use checkMenuService() in console to verify MenuService is loaded');

