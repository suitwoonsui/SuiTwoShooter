// ==========================================
// GAME SERVICE - Game Lifecycle Management
// ==========================================
// Handles game start, stop, and lifecycle operations
// Delegates to other services for menu visibility, data loading, and UI updates

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

const GameService = {
  // State
  _initialized: false,
  _isGameRunning: false,
  _isGamePaused: false,
  _isGameOver: false,
  
  // DOM element cache
  _gameContainerCache: null,
  _canvasCache: null,
  _mainMenuCache: null,
  _startGameBtnCache: null,
  _startGameTestBtnCache: null,
  
  // Dependencies (accessed via window/global scope)
  _menuService: null,
  _gameState: null,
  _uiGameState: null,
  
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
   * Get cached canvas element
   * @private
   */
  _getCanvas() {
    if (!this._canvasCache) {
      this._canvasCache = document.getElementById('gameCanvas');
    }
    return this._canvasCache;
  },
  
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
   * Get cached start game button
   * @private
   */
  _getStartGameBtn() {
    if (!this._startGameBtnCache) {
      this._startGameBtnCache = document.getElementById('startGameBtn');
    }
    return this._startGameBtnCache;
  },
  
  /**
   * Get cached start game test button
   * @private
   */
  _getStartGameTestBtn() {
    if (!this._startGameTestBtnCache) {
      this._startGameTestBtnCache = document.getElementById('startGameTestBtn');
    }
    return this._startGameTestBtnCache;
  },
  
  /**
   * Invalidate DOM cache (call when elements are removed/recreated)
   * @private
   */
  _invalidateCache() {
    this._gameContainerCache = null;
    this._canvasCache = null;
    this._mainMenuCache = null;
    this._startGameBtnCache = null;
    this._startGameTestBtnCache = null;
  },
  
  /**
   * Initialize the GameService
   */
  init() {
    if (this._initialized) {
      log.warn('GAME SERVICE', 'Already initialized');
      return;
    }
    
    // Set up dependencies (may not be available immediately)
    this._menuService = typeof MenuService !== 'undefined' ? MenuService : null;
    this._gameState = typeof gameState !== 'undefined' ? gameState : null;
    this._uiGameState = typeof uiGameState !== 'undefined' ? uiGameState : null;
    
    // Initialize Game Pass services
    if (window.GamePassService) {
      window.GamePassService.init();
    }
    if (window.GamePassDisplay) {
      window.GamePassDisplay.init();
    }
    if (window.EndDemoModal) {
      window.EndDemoModal.init();
    }
    
    this._initialized = true;
    log.debug('GAME SERVICE', 'Initialized', {
      menuService: !!this._menuService,
      gameState: !!this._gameState,
      uiGameState: !!this._uiGameState
    });
  },
  
  isInitialized() {
    return this._initialized;
  },
  
  /**
   * Check if game is ready to start
   * @returns {boolean}
   */
  isGameReady() {
    // Use gameReadinessState from menu-system.js
    if (typeof gameReadinessState !== 'undefined') {
      return gameReadinessState.dataLoaded && 
             gameReadinessState.migrationCheckComplete &&
             gameReadinessState.migrationModalClosed;
    }
    return false;
  },
  
  /**
   * Start game (with balance check and game pass check)
   * @returns {Promise<void>}
   */
  async startGame() {
    log.debug('GAME SERVICE', 'Starting game');
    
    // Race condition protection - disable button immediately
    this.disableStartGameButton();
    const startGameBtn = this._getStartGameBtn();
    const originalBtnText = startGameBtn ? startGameBtn.innerHTML : '';
    if (startGameBtn) {
      startGameBtn.innerHTML = '<span class="btn-icon">⏳</span> Starting...';
    }
    
    try {
      // Wallet connection check
      if (!window.walletAPIInstance || !window.walletAPIInstance.isConnected()) {
        alert('Please connect your wallet first.');
        return;
      }
      
      const walletAddress = window.walletAPIInstance.getAddress();
      if (!walletAddress) {
        alert('Wallet address not available. Please reconnect your wallet.');
        return;
      }
      
      // Balance check (still required for gas)
      const balanceStatus = window.walletAPIInstance.getBalanceStatus();
      if (!balanceStatus.hasMinimumBalance) {
        const balanceDisplay = balanceStatus.balance 
          ? (Number(balanceStatus.balance) / 1_000_000_000).toLocaleString() 
          : '0';
        alert(`Insufficient $MEWS balance. You need at least 500,000 $MEWS for gas fees.\n\nCurrent balance: ${balanceDisplay} $MEWS`);
        return;
      }
      
      // Game Pass check - just check if credits exist (don't consume yet)
      // Credit will be consumed after item selection
      let hasCredits = false;
      if (window.GamePassService) {
        try {
          const status = await window.GamePassService.getGamePassStatus(walletAddress);
          hasCredits = status.success && status.hasPass && status.isActive && (status.gamesRemaining || 0) > 0;
          if (!hasCredits) {
            log.info('GAME SERVICE', 'Player has no active game pass, will start in demo mode');
          }
        } catch (error) {
          log.error('GAME SERVICE', 'Error checking game pass status', error);
          // Continue - will check again after item selection
        }
      }
      
      // Update button text before starting game
      if (startGameBtn) {
        startGameBtn.innerHTML = '<span class="btn-icon">⏳</span> Loading game...';
    }
    
      // Delegate to internal start (pass hasCredits flag, not isDemoMode)
      // Credit consumption will happen after item selection
      await this._startGameInternal(false, hasCredits, walletAddress);
    } catch (error) {
      log.error('GAME SERVICE', 'Error in startGame', error);
      alert(`Error starting game: ${error.message || 'Unknown error'}`);
      // Re-enable button on error
      this.enableStartGameButton();
      if (startGameBtn && originalBtnText) {
        startGameBtn.innerHTML = originalBtnText;
      }
    }
    // Note: Button will be re-enabled by _startGameInternal or error handler
  },
  
  /**
   * Start tournament game in test mode (bypasses balance check, but still consumes tickets if available)
   * @param {Object} tournament - Tournament object with objectId, name, category, etc.
   * @returns {Promise<void>}
   */
  async startTournamentGameTest(tournament) {
    log.debug('GAME SERVICE', 'Starting tournament game (test mode)', tournament);
    
    try {
      // Still require data to be loaded and migration check complete
      if (!this.isGameReady()) {
        log.warn('GAME SERVICE', 'Game not ready - waiting for data to load');
        alert('Please wait for game data to finish loading before starting.');
        return;
      }
      
      // Still require wallet connection (for blockchain features)
      if (!window.walletAPIInstance || !window.walletAPIInstance.isConnected()) {
        alert('Please connect your wallet first. (Required for blockchain features)');
        return;
      }
      
      const walletAddress = window.walletAPIInstance.getAddress();
      if (!walletAddress) {
        alert('Wallet address not available. Please reconnect your wallet.');
        return;
      }
      
      // Validate tournament is still active (or within grace period)
      const now = Date.now();
      const gracePeriodEnd = tournament.endTime + (60 * 60 * 1000); // 1 hour grace period
      
      if (now > gracePeriodEnd) {
        alert(`This tournament has ended. The grace period for score submission has expired.\n\nTournament: ${tournament.name}\nEnded: ${new Date(tournament.endTime).toLocaleString()}\n\nYou cannot start a new game for this tournament.`);
        return;
      }
      
      if (tournament.status === 'ended' && now > tournament.endTime) {
        // Tournament ended but within grace period - warn but allow
        const timeRemaining = Math.floor((gracePeriodEnd - now) / 1000 / 60); // minutes
        if (timeRemaining > 0) {
          log.warn('GAME SERVICE', 'Tournament ended but within grace period', {
            tournamentName: tournament.name,
            timeRemainingMinutes: timeRemaining,
          });
          // Continue - grace period allows submission
        }
      }
      
      // Check if player has tournament tickets (don't consume yet)
      // Ticket will be consumed after item selection
      let hasTickets = false;
      const API_BASE_URL = window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3000/api';
      try {
        const gamePassResponse = await fetch(`${API_BASE_URL}/game-pass/${walletAddress}`);
        if (gamePassResponse.ok) {
          const gamePassResult = await gamePassResponse.json();
          hasTickets = gamePassResult.success && (gamePassResult.ticketCount || 0) >= tournament.entryFeeTickets;
          if (!hasTickets) {
            log.info('GAME SERVICE', 'Player has no tournament tickets (test mode), will start anyway');
            // In test mode, allow starting even without tickets (for testing)
          }
        }
      } catch (error) {
        log.error('GAME SERVICE', 'Error checking tournament tickets (test mode)', error);
        // Continue - will check again after item selection
      }
      
      // Start game (bypasses balance check, but uses same ticket consumption flow)
      // Ticket consumption will happen after item selection
      await this._startGameInternal(false, false, walletAddress, {
        isTournamentMode: true,
        tournamentObjectId: tournament.objectId,
        tournamentCategory: tournament.category,
        tournamentName: tournament.name,
        tournamentEntryFeeTickets: tournament.entryFeeTickets,
      });
    } catch (error) {
      log.error('GAME SERVICE', 'Error in startTournamentGameTest', error);
      alert(`Error starting tournament game: ${error.message || 'Unknown error'}`);
    }
  },
  
  /**
   * Start tournament game (matches credit game flow)
   * @param {Object} tournament - Tournament object with objectId, name, category, etc.
   * @returns {Promise<void>}
   */
  async startTournamentGame(tournament) {
    log.debug('GAME SERVICE', 'Starting tournament game', tournament);
    
    // Race condition protection - disable button immediately
    this.disableStartGameButton();
    
    try {
      // Wallet connection check
      if (!window.walletAPIInstance || !window.walletAPIInstance.isConnected()) {
        alert('Please connect your wallet first.');
        return;
      }
      
      const walletAddress = window.walletAPIInstance.getAddress();
      if (!walletAddress) {
        alert('Wallet address not available. Please reconnect your wallet.');
        return;
      }
      
      // Validate tournament is still active (or within grace period)
      const now = Date.now();
      const gracePeriodEnd = tournament.endTime + (60 * 60 * 1000); // 1 hour grace period
      
      if (now > gracePeriodEnd) {
        alert(`This tournament has ended. The grace period for score submission has expired.\n\nTournament: ${tournament.name}\nEnded: ${new Date(tournament.endTime).toLocaleString()}\n\nYou cannot start a new game for this tournament.`);
        this.enableStartGameButton();
        // Restore tournament modal visibility if it was hidden
        const tournamentModal = document.getElementById('tournamentModal');
        if (tournamentModal) {
          tournamentModal.classList.remove('tournament-modal-hidden');
          tournamentModal.classList.add('tournament-modal-visible');
        }
        return;
      }
      
      if (tournament.status === 'ended' && now > tournament.endTime) {
        // Tournament ended but within grace period - warn but allow
        const timeRemaining = Math.floor((gracePeriodEnd - now) / 1000 / 60); // minutes
        if (timeRemaining > 0) {
          log.warn('GAME SERVICE', 'Tournament ended but within grace period', {
            tournamentName: tournament.name,
            timeRemainingMinutes: timeRemaining,
          });
          // Continue - grace period allows submission
        }
      }
      
      // Balance check (still required for gas)
      const balanceStatus = window.walletAPIInstance.getBalanceStatus();
      if (!balanceStatus.hasMinimumBalance) {
        const balanceDisplay = balanceStatus.balance 
          ? (Number(balanceStatus.balance) / 1_000_000_000).toLocaleString() 
          : '0';
        alert(`Insufficient $MEWS balance. You need at least 500,000 $MEWS for gas fees.\n\nCurrent balance: ${balanceDisplay} $MEWS`);
        this.enableStartGameButton();
        // Restore tournament modal visibility if it was hidden
        const tournamentModal = document.getElementById('tournamentModal');
        if (tournamentModal) {
          tournamentModal.classList.remove('tournament-modal-hidden');
          tournamentModal.classList.add('tournament-modal-visible');
        }
        return;
      }
      
      // Check if player has tournament tickets (don't consume yet)
      // Ticket will be consumed after item selection
      let hasTickets = false;
      const API_BASE_URL = window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3000/api';
      try {
        const gamePassResponse = await fetch(`${API_BASE_URL}/game-pass/${walletAddress}`);
        if (gamePassResponse.ok) {
          const gamePassResult = await gamePassResponse.json();
          hasTickets = gamePassResult.success && (gamePassResult.ticketCount || 0) >= tournament.entryFeeTickets;
          if (!hasTickets) {
            alert(`You need ${tournament.entryFeeTickets} tournament ticket${tournament.entryFeeTickets !== 1 ? 's' : ''} to enter this tournament. Purchase tickets from the Store.`);
            this.enableStartGameButton();
            // Restore tournament modal visibility if it was hidden
            const tournamentModal = document.getElementById('tournamentModal');
            if (tournamentModal) {
              tournamentModal.classList.remove('tournament-modal-hidden');
              tournamentModal.classList.add('tournament-modal-visible');
            }
            return;
          }
        }
      } catch (error) {
        log.error('GAME SERVICE', 'Error checking tournament tickets', error);
        // Continue - will check again after item selection
      }
      
      // Delegate to internal start with tournament context
      // Ticket consumption will happen after item selection
      await this._startGameInternal(false, false, walletAddress, {
        isTournamentMode: true,
        tournamentObjectId: tournament.objectId,
        tournamentCategory: tournament.category,
        tournamentName: tournament.name,
        tournamentEntryFeeTickets: tournament.entryFeeTickets,
      });
    } catch (error) {
      log.error('GAME SERVICE', 'Error in startTournamentGame', error);
      alert(`Error starting tournament game: ${error.message || 'Unknown error'}`);
      // Re-enable button on error
      this.enableStartGameButton();
      // Restore tournament modal visibility if it was hidden
      const tournamentModal = document.getElementById('tournamentModal');
      if (tournamentModal) {
        tournamentModal.classList.remove('tournament-modal-hidden');
        tournamentModal.classList.add('tournament-modal-visible');
      }
    }
    // Note: Button will be re-enabled by _startGameInternal or error handler
  },
  
  /**
   * Start game in test mode (bypasses balance check, but still consumes credits if available)
   * @returns {Promise<void>}
   */
  async startGameTest() {
    log.debug('GAME SERVICE', 'Starting game (test mode)');
    
    // Race condition protection - disable button immediately
    const testBtn = this._getStartGameTestBtn();
    // Store original text if not already stored
    if (testBtn && !testBtn.getAttribute('data-original-text')) {
      testBtn.setAttribute('data-original-text', testBtn.innerHTML);
    }
    const originalBtnText = testBtn ? (testBtn.getAttribute('data-original-text') || testBtn.innerHTML) : '';
    if (testBtn) {
      testBtn.disabled = true;
      testBtn.innerHTML = '<span class="btn-icon">⏳</span> Starting...';
    }
    
    try {
    // Still require data to be loaded and migration check complete
    if (!this.isGameReady()) {
      log.warn('GAME SERVICE', 'Game not ready - waiting for data to load');
      alert('Please wait for game data to finish loading before starting.');
      return;
    }
    
    // Still require wallet connection (for blockchain features)
    if (!window.walletAPIInstance || !window.walletAPIInstance.isConnected()) {
      alert('Please connect your wallet first. (Required for blockchain features)');
      return;
    }
    
      const walletAddress = window.walletAPIInstance.getAddress();
      if (!walletAddress) {
        alert('Wallet address not available. Please reconnect your wallet.');
        return;
      }
      
      // Game Pass check - just check if credits exist (don't consume yet)
      // Credit will be consumed after item selection
      let hasCredits = false;
      if (window.GamePassService) {
        try {
          const status = await window.GamePassService.getGamePassStatus(walletAddress);
          hasCredits = status.success && status.hasPass && status.isActive && (status.gamesRemaining || 0) > 0;
          if (!hasCredits) {
            log.info('GAME SERVICE', 'Player has no active game pass (test mode), will start in demo mode');
          }
        } catch (error) {
          log.error('GAME SERVICE', 'Error checking game pass status (test mode)', error);
          // Continue - will check again after item selection
        }
      }
      
      // Update button text before starting game
      if (testBtn) {
        testBtn.innerHTML = '<span class="btn-icon">⏳</span> Loading game...';
      }
      
      // Start game (bypasses balance check, but uses same credit consumption flow)
      // Credit consumption will happen after item selection
      await this._startGameInternal(false, hasCredits, walletAddress);
    } catch (error) {
      log.error('GAME SERVICE', 'Error in startGameTest', error);
      alert(`Error starting game: ${error.message || 'Unknown error'}`);
      // Re-enable button on error
      if (testBtn) {
        testBtn.disabled = false;
        if (originalBtnText) {
          testBtn.innerHTML = originalBtnText;
        }
      }
    }
    // Note: Button will be re-enabled by _startGameInternal or error handler
  },
  
  /**
   * Internal game start logic (shared by startGame, startGameTest, and startTournamentGame)
   * @private
   * @param {boolean} isDemoMode - Whether to start in demo mode (deprecated, calculated from hasCredits)
   * @param {boolean} hasCredits - Whether player has credits available
   * @param {string} walletAddress - Player's wallet address
   * @param {Object} tournamentContext - Optional tournament context
   * @param {boolean} tournamentContext.isTournamentMode - Whether this is a tournament game
   * @param {string} tournamentContext.tournamentObjectId - Tournament object ID
   * @param {string} tournamentContext.tournamentCategory - Tournament category
   * @param {string} tournamentContext.tournamentName - Tournament name
   * @param {number} tournamentContext.tournamentEntryFeeTickets - Entry fee in tickets
   * @returns {Promise<void>}
   */
  async _startGameInternal(isDemoMode = false, hasCredits = false, walletAddress = null, tournamentContext = null) {
    console.log('🎮 [GAME SERVICE] _startGameInternal called', {
      isDemoMode,
      hasCredits,
      walletAddress,
      tournamentContext,
      hasTournamentContext: !!tournamentContext,
      tournamentObjectId: tournamentContext?.tournamentObjectId,
      tournamentName: tournamentContext?.tournamentName,
    });
    log.debug('GAME SERVICE', 'Starting game (internal)', { isDemoMode, hasCredits, tournamentContext });
    
    // Set tournament mode state if tournament context provided
    const isTournamentMode = tournamentContext && tournamentContext.isTournamentMode;
    console.log('🏆 [GAME SERVICE] Tournament mode check', {
      isTournamentMode,
      hasTournamentContext: !!tournamentContext,
      tournamentContextIsTournamentMode: tournamentContext?.isTournamentMode,
      tournamentObjectId: tournamentContext?.tournamentObjectId,
      tournamentName: tournamentContext?.tournamentName,
    });
    if (isTournamentMode) {
      // Store that we should return to tournament screen after game ends
      const returnToTournament = true;
      
      if (this._gameState) {
        this._gameState.isTournamentMode = true;
        this._gameState.tournamentObjectId = tournamentContext.tournamentObjectId;
        this._gameState.tournamentCategory = tournamentContext.tournamentCategory;
        this._gameState.tournamentName = tournamentContext.tournamentName;
        this._gameState.returnToTournament = returnToTournament;
      }
      if (this._uiGameState) {
        this._uiGameState.isTournamentMode = true;
        this._uiGameState.tournamentObjectId = tournamentContext.tournamentObjectId;
        this._uiGameState.tournamentCategory = tournamentContext.tournamentCategory;
        this._uiGameState.tournamentName = tournamentContext.tournamentName;
        this._uiGameState.returnToTournament = returnToTournament;
      }
      if (typeof gameState !== 'undefined') {
        gameState.isTournamentMode = true;
        gameState.tournamentObjectId = tournamentContext.tournamentObjectId;
        gameState.tournamentCategory = tournamentContext.tournamentCategory;
        gameState.tournamentName = tournamentContext.tournamentName;
        gameState.returnToTournament = returnToTournament;
      }
      // Set on window.gameState directly (most reliable)
      if (typeof window !== 'undefined' && window.gameState) {
        window.gameState.isTournamentMode = true;
        window.gameState.tournamentObjectId = tournamentContext.tournamentObjectId;
        window.gameState.tournamentCategory = tournamentContext.tournamentCategory;
        window.gameState.tournamentName = tournamentContext.tournamentName;
        window.gameState.returnToTournament = returnToTournament;
      }
      // Set on window.game (should be same as gameState, but ensure both)
      if (typeof window !== 'undefined' && window.game) {
        window.game.isTournamentMode = true;
        window.game.tournamentObjectId = tournamentContext.tournamentObjectId;
        window.game.tournamentCategory = tournamentContext.tournamentCategory;
        window.game.tournamentName = tournamentContext.tournamentName;
        window.game.returnToTournament = returnToTournament;
      }
      
      log.info('GAME SERVICE', '✅ Tournament state set on all game objects', {
        tournamentObjectId: tournamentContext.tournamentObjectId,
        tournamentName: tournamentContext.tournamentName,
        gameStateIsTournamentMode: this._gameState?.isTournamentMode,
        windowGameStateIsTournamentMode: typeof window !== 'undefined' && window.gameState ? window.gameState.isTournamentMode : 'N/A',
        windowGameIsTournamentMode: typeof window !== 'undefined' && window.game ? window.game.isTournamentMode : 'N/A',
      });
    } else {
      // Clear tournament mode state for regular games
      if (this._gameState) {
        this._gameState.isTournamentMode = false;
        this._gameState.tournamentObjectId = null;
        this._gameState.tournamentCategory = null;
        this._gameState.tournamentName = null;
      }
      if (this._uiGameState) {
        this._uiGameState.isTournamentMode = false;
        this._uiGameState.tournamentObjectId = null;
        this._uiGameState.tournamentCategory = null;
        this._uiGameState.tournamentName = null;
      }
      if (typeof gameState !== 'undefined') {
        gameState.isTournamentMode = false;
        gameState.tournamentObjectId = null;
        gameState.tournamentCategory = null;
        gameState.tournamentName = null;
      }
      if (typeof window !== 'undefined' && window.game) {
        window.game.isTournamentMode = false;
        window.game.tournamentObjectId = null;
        window.game.tournamentCategory = null;
        window.game.tournamentName = null;
      }
    }
    
    // Show loading modal FIRST - before any loading starts
    const loadingMessage = isTournamentMode
      ? `Preparing tournament game: ${tournamentContext.tournamentName || 'Tournament'}... Please wait`
      : 'Preparing game... Please wait';
    if (typeof showLoadingModal === 'function') {
      showLoadingModal(loadingMessage, 'gameStartLoadingModal');
    }
    
    // Update dependencies if they weren't available during init
    if (!this._menuService && typeof MenuService !== 'undefined') {
      this._menuService = MenuService;
    }
    if (!this._gameState && typeof gameState !== 'undefined') {
      this._gameState = gameState;
    }
    if (!this._uiGameState && typeof uiGameState !== 'undefined') {
      this._uiGameState = uiGameState;
    }
    
    // Get current state
    let state = this._uiGameState || this._gameState;
    if (!state) {
      log.warn('GAME SERVICE', 'Neither uiGameState nor gameState is available');
    }
    
    try {
      // Update loading message
      if (typeof updateLoadingModalMessage === 'function') {
        updateLoadingModalMessage('Loading game scripts... Please wait', 'gameStartLoadingModal');
      }
      
      // Load game scripts now (only when user actually starts the game)
      if (typeof window.loadGameScripts === 'function') {
        try {
          log.debug('GAME SERVICE', 'Loading game scripts', { count: window.GAME_SCRIPTS?.length || 'unknown' });
          const startTime = performance.now();
          await window.loadGameScripts();
          const loadTime = performance.now() - startTime;
          log.debug('GAME SERVICE', `Game scripts loaded in ${loadTime.toFixed(2)}ms`);
        } catch (error) {
          log.error('GAME SERVICE', 'Error loading game scripts', error);
          // Continue anyway - some scripts might have loaded
        }
      }
      
      // Register and preload game images (optimized: only wait for minimum critical images)
      if (typeof window.registerGameImages === 'function') {
        try {
          log.debug('GAME SERVICE', 'Registering game images (minimum critical first)...');
          if (typeof updateLoadingModalMessage === 'function') {
            updateLoadingModalMessage('Loading essential game images... Please wait', 'gameStartLoadingModal');
          }
          
          // Ensure loading modal is visible
          if (typeof showLoadingModal === 'function') {
            showLoadingModal('Loading essential game images... Please wait', 'gameStartLoadingModal');
          }
          
          // Set up progress callback for minimum critical images only
          if (window.ImagePreloader) {
            let progressCallbackSet = false;
            window.ImagePreloader.onProgress((progress, status) => {
              if (!progressCallbackSet) {
                progressCallbackSet = true;
              }
              if (typeof updateLoadingModalMessage === 'function') {
                const percent = Math.round(progress * 100);
                updateLoadingModalMessage(
                  `Loading essential images... ${percent}% (${status.loaded}/${status.total})`,
                  'gameStartLoadingModal'
                );
              }
            });
          }
          
          // Register images (minimum critical + background loading)
          const imageLoadStartTime = performance.now();
          await window.registerGameImages();
          
          // Wait only for minimum critical images (player, background, first enemy, etc.)
          // Other images will continue loading in background
          if (typeof window.waitForGameImages === 'function') {
            log.debug('GAME SERVICE', 'Waiting for minimum critical images to load...');
            await window.waitForGameImages();
          }
          
          const imageLoadTime = performance.now() - imageLoadStartTime;
          log.debug('GAME SERVICE', `Minimum critical images loaded in ${imageLoadTime.toFixed(2)}ms - game can start, other images loading in background`);
          
          // Pre-calculate sprite dimensions and pre-initialize game assets
          // This reduces processing during gameplay
          if (typeof window.preloadGameAssets === 'function') {
            log.debug('GAME SERVICE', 'Pre-loading game assets (dimensions, arrays, etc.)...');
            if (typeof updateLoadingModalMessage === 'function') {
              updateLoadingModalMessage('Preparing game assets... Please wait', 'gameStartLoadingModal');
            }
            await window.preloadGameAssets();
          }
          
          // Ensure loading screen is visible for at least 300ms so user can see progress
          // This prevents the loading screen from disappearing too quickly
          if (imageLoadTime < 300) {
            await new Promise(resolve => setTimeout(resolve, 300 - imageLoadTime));
          }
        } catch (error) {
          log.error('GAME SERVICE', 'Error loading game images', error);
          // Continue anyway - images may still load in background
        }
      }
      
      // ==========================================
      // ITEM SELECTION (BEFORE TOURNAMENT ENTRY)
      // ==========================================
      // Item selection happens FIRST so player can back out without losing a ticket
      console.log('📦 [ITEM SELECTION] Starting item selection phase', {
        isTournamentMode: isTournamentMode,
        hasWalletAddress: !!walletAddress,
        walletAddress: walletAddress,
        timestamp: new Date().toISOString(),
      });
      // Update loading message - keep loading screen visible while inventory loads
      if (typeof updateLoadingModalMessage === 'function') {
        updateLoadingModalMessage('Loading inventory... Please wait', 'gameStartLoadingModal');
      }
      
      // Ensure loading modal is still visible (in case it was hidden)
      if (typeof showLoadingModal === 'function') {
        showLoadingModal('Loading inventory... Please wait', 'gameStartLoadingModal');
      }
      
      // Show item consumption modal if available (it will load inventory internally)
      // Keep loading modal visible until inventory is loaded and modal is ready
      // The loading modal will be hidden by showItemConsumptionModal() when the modal is ready to show
      log.info('GAME SERVICE', 'Checking for item consumption modal', {
        hasShowItemConsumptionModal: typeof showItemConsumptionModal === 'function',
        isTournamentMode: isTournamentMode,
        hasTournamentContext: !!tournamentContext,
      });
      
      if (typeof showItemConsumptionModal === 'function') {
        console.log('📦 [ITEM SELECTION] Item consumption modal available - Showing modal', {
          timestamp: new Date().toISOString(),
        });
        log.info('GAME SERVICE', '✅ Item consumption modal available - Showing modal (loading screen will stay visible during inventory load)');

        const modalStartTime = performance.now();
        // Pass tournament mode to modal for gold styling
        const result = await showItemConsumptionModal({ isTournamentMode });
        const modalTime = performance.now() - modalStartTime;
        
        console.log('📦 [ITEM SELECTION] Modal returned', {
          hasResult: !!result,
          confirmed: result?.confirmed,
          hasItems: !!result?.items,
          items: result?.items,
          modalTime: `${modalTime.toFixed(2)}ms`,
          timestamp: new Date().toISOString(),
        });
        log.info('GAME SERVICE', 'Item consumption modal returned', {
          hasResult: !!result,
          confirmed: result?.confirmed,
          hasItems: !!result?.items,
          modalTime: `${modalTime.toFixed(2)}ms`,
        });
        
        if (!result.confirmed) {
          console.log('❌ [ITEM SELECTION] User cancelled item selection', {
            timestamp: new Date().toISOString(),
            isTournamentMode: isTournamentMode,
          });
          log.debug('GAME SERVICE', 'Item consumption cancelled');
          // Loading modal already hidden, don't need to hide again
          
          // If this was a tournament game, return to tournament menu
          if (isTournamentMode) {
            log.info('GAME SERVICE', 'Returning to tournament menu after cancel');
            // Re-enable start button
            this.enableStartGameButton();
            // Show tournament modal
            if (typeof showTournaments === 'function') {
              showTournaments();
            } else if (typeof window.showTournaments === 'function') {
              window.showTournaments();
            }
          } else {
            // Regular game - re-enable start button
            this.enableStartGameButton();
          }
          return; // User cancelled
        }
        
        console.log('✅ [ITEM SELECTION] Item selection confirmed', {
          items: result.items,
          timestamp: new Date().toISOString(),
        });
        log.debug('GAME SERVICE', 'Item consumption confirmed', result.items);
        
        // ==========================================
        // TOURNAMENT ENTRY (AFTER ITEM SELECTION)
        // ==========================================
        // Tournament entry happens AFTER item selection is confirmed
        // This consumes the ticket, adds funds to pool, increments participant count, and marks player as entered
        let isDemoMode = true;
        
        // DEBUG: Log tournament entry check conditions
        console.log('🔍 [TOURNAMENT ENTRY CHECK] After item selection', {
          isTournamentMode: isTournamentMode,
          hasTournamentContext: !!tournamentContext,
          hasWalletAddress: !!walletAddress,
          walletAddress: walletAddress,
          tournamentContext: tournamentContext,
          tournamentObjectId: tournamentContext?.tournamentObjectId,
          tournamentName: tournamentContext?.tournamentName,
          entryFeeTickets: tournamentContext?.tournamentEntryFeeTickets,
          allConditionsMet: isTournamentMode && tournamentContext && walletAddress,
          timestamp: new Date().toISOString(),
        });
        log.info('GAME SERVICE', '🔍 Tournament entry check after item selection', {
          isTournamentMode: isTournamentMode,
          hasTournamentContext: !!tournamentContext,
          hasWalletAddress: !!walletAddress,
          tournamentObjectId: tournamentContext?.tournamentObjectId,
          allConditionsMet: isTournamentMode && tournamentContext && walletAddress,
        });
        
        if (isTournamentMode && tournamentContext && walletAddress) {
          try {
            console.log('✅ [TOURNAMENT ENTRY] Conditions met - Starting tournament entry', {
              walletAddress: walletAddress,
              tournamentObjectId: tournamentContext.tournamentObjectId,
              entryFeeTickets: tournamentContext.tournamentEntryFeeTickets,
              tournamentName: tournamentContext.tournamentName,
              tournamentCategory: tournamentContext.tournamentCategory,
              timestamp: new Date().toISOString(),
            });
            log.info('GAME SERVICE', '🏆 TOURNAMENT ENTRY - Entering tournament AFTER item selection confirmed', {
              walletAddress: walletAddress,
              tournamentObjectId: tournamentContext.tournamentObjectId,
              entryFeeTickets: tournamentContext.tournamentEntryFeeTickets,
              tournamentName: tournamentContext.tournamentName,
            });
            
            // Update loading message to show ticket consumption
            if (typeof updateLoadingModalMessage === 'function') {
              updateLoadingModalMessage('Entering tournament and consuming ticket... Please wait', 'gameStartLoadingModal');
            }
            
            // Show loading modal if hidden
            if (typeof showLoadingModal === 'function') {
              showLoadingModal('Entering tournament and consuming ticket... Please wait', 'gameStartLoadingModal');
            }
            
            const API_BASE_URL = window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3000/api';
            const entryUrl = `${API_BASE_URL}/tournaments/enter`;
            const entryPayload = {
              playerAddress: walletAddress,
              tournamentObjectId: tournamentContext.tournamentObjectId,
              // ticketId is optional - backend will find a valid ticket if not provided
            };
            
            console.log('📡 [TOURNAMENT ENTRY] Calling API', {
              url: entryUrl,
              method: 'POST',
              payload: entryPayload,
              timestamp: new Date().toISOString(),
            });
            log.debug('GAME SERVICE', 'Calling tournament entry API', {
              url: entryUrl,
              playerAddress: walletAddress,
              tournamentObjectId: tournamentContext.tournamentObjectId,
            });
            
            const entryStartTime = performance.now();
            
            // Enter tournament (consumes ticket, admin wallet executes transaction)
            const enterResponse = await fetch(entryUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(entryPayload),
            });
            
            const entryResponseTime = performance.now() - entryStartTime;
            
            console.log('📥 [TOURNAMENT ENTRY] API Response received', {
              ok: enterResponse.ok,
              status: enterResponse.status,
              statusText: enterResponse.statusText,
              responseTime: `${entryResponseTime.toFixed(2)}ms`,
              headers: Object.fromEntries(enterResponse.headers.entries()),
              timestamp: new Date().toISOString(),
            });
            log.debug('GAME SERVICE', 'Tournament entry API response', {
              ok: enterResponse.ok,
              status: enterResponse.status,
              statusText: enterResponse.statusText,
              responseTime: `${entryResponseTime.toFixed(2)}ms`,
            });
            
            if (!enterResponse.ok) {
              let errorData = {};
              try {
                errorData = await enterResponse.json();
              } catch (e) {
                log.error('GAME SERVICE', 'Failed to parse error response', e);
                errorData = { error: `HTTP ${enterResponse.status}: ${enterResponse.statusText}` };
              }
              const errorMsg = errorData.error || errorData.message || `HTTP ${enterResponse.status}: ${enterResponse.statusText}`;
              console.error('❌ [TOURNAMENT ENTRY] HTTP Error', {
                error: errorMsg,
                status: enterResponse.status,
                errorData: errorData,
                timestamp: new Date().toISOString(),
              });
              log.error('GAME SERVICE', '❌ Failed to enter tournament - HTTP error', {
                error: errorMsg,
                status: enterResponse.status,
                playerAddress: walletAddress,
                tournamentObjectId: tournamentContext.tournamentObjectId,
                errorData: errorData,
              });
              alert(`Failed to enter tournament: ${errorMsg}\n\nPlease check:\n- You have enough tournament tickets\n- The tournament is still active\n- Your network connection\n\nGame cancelled.`);
              return; // Cancel game start
            }
            
            const enterResult = await enterResponse.json();
            
            console.log('📋 [TOURNAMENT ENTRY] API Result parsed', {
              success: enterResult.success,
              transactionDigest: enterResult.transactionDigest,
              error: enterResult.error,
              message: enterResult.message,
              fullResult: enterResult,
              timestamp: new Date().toISOString(),
            });
            log.info('GAME SERVICE', 'Tournament entry API response received', {
              success: enterResult.success,
              transactionDigest: enterResult.transactionDigest,
              error: enterResult.error,
            });
            
            if (!enterResult.success) {
              console.error('❌ [TOURNAMENT ENTRY] API returned error', {
                error: enterResult.error,
                message: enterResult.message,
                fullResult: enterResult,
                timestamp: new Date().toISOString(),
              });
              const errorMsg = enterResult.error || enterResult.message || 'Failed to enter tournament';
              log.error('GAME SERVICE', '❌ Failed to enter tournament - API returned error', {
                error: errorMsg,
                playerAddress: walletAddress,
                tournamentObjectId: tournamentContext.tournamentObjectId,
                result: enterResult,
              });
              alert(`Failed to enter tournament: ${errorMsg}\n\nPlease check:\n- You have enough tournament tickets\n- The tournament is still active\n- Your network connection\n\nGame cancelled.`);
              return; // Cancel game start
            }
            
            // Tournament ticket consumed successfully - player is now entered
            isDemoMode = false; // Tournament games are never in demo mode
            console.log('✅ [TOURNAMENT ENTRY] SUCCESS - Player entered tournament', {
              transactionDigest: enterResult.transactionDigest,
              tournamentObjectId: tournamentContext.tournamentObjectId,
              tournamentName: tournamentContext.tournamentName,
              tournamentCategory: tournamentContext.tournamentCategory,
              walletAddress: walletAddress,
              timestamp: new Date().toISOString(),
            });
            log.info('GAME SERVICE', '✅ Tournament entry completed successfully - ticket consumed, player entered', {
              transactionDigest: enterResult.transactionDigest,
              tournamentObjectId: tournamentContext.tournamentObjectId,
              tournamentName: tournamentContext.tournamentName,
            });
          } catch (error) {
            console.error('❌ [TOURNAMENT ENTRY] Exception caught', {
              error: error.message,
              stack: error.stack,
              name: error.name,
              playerAddress: walletAddress,
              tournamentObjectId: tournamentContext?.tournamentObjectId,
              timestamp: new Date().toISOString(),
            });
            log.error('GAME SERVICE', '❌ Exception during tournament entry', {
              error: error.message,
              stack: error.stack,
              playerAddress: walletAddress,
              tournamentObjectId: tournamentContext?.tournamentObjectId,
            });
            alert(`Error entering tournament: ${error.message || 'Unknown error'}\n\nThis might be a network issue. Please try again.\n\nGame cancelled.`);
            return; // Cancel game start
          }
        } else if (isTournamentMode) {
          // Tournament game but entry failed - CANCEL GAME
          console.error('❌ [TOURNAMENT ENTRY] SKIPPED - Missing required data', {
            isTournamentMode: isTournamentMode,
            hasTournamentContext: !!tournamentContext,
            hasWalletAddress: !!walletAddress,
            tournamentContext: tournamentContext,
            walletAddress: walletAddress,
            tournamentObjectId: tournamentContext?.tournamentObjectId,
            tournamentName: tournamentContext?.tournamentName,
            timestamp: new Date().toISOString(),
          });
          log.error('GAME SERVICE', '❌ Tournament entry SKIPPED - missing required data', {
            isTournamentMode: isTournamentMode,
            hasTournamentContext: !!tournamentContext,
            hasWalletAddress: !!walletAddress,
            tournamentContext: tournamentContext,
            walletAddress: walletAddress,
          });
          alert(`Error: Cannot enter tournament. Missing required data.\n\nisTournamentMode: ${isTournamentMode}\nhasTournamentContext: ${!!tournamentContext}\nhasWalletAddress: ${!!walletAddress}\n\nPlease refresh the page and try again.`);
          return; // Cancel game start
        } else if (hasCredits && walletAddress && window.GamePassService) {
          // Regular credit consumption for non-tournament games
          log.debug('GAME SERVICE', 'Consuming credit for regular game', {
            hasTournamentContext: !!tournamentContext,
            hasWalletAddress: !!walletAddress,
          });
          try {
            log.info('GAME SERVICE', 'Consuming credit after item selection', {
              walletAddress: walletAddress,
            });
            
            // Update loading message to show credit consumption
            if (typeof updateLoadingModalMessage === 'function') {
              updateLoadingModalMessage('Consuming credit... Please wait', 'gameStartLoadingModal');
            }
            
            const consumeResult = await window.GamePassService.consumeGameCredit(walletAddress);
            if (!consumeResult.success) {
              // Improved error handling
              const errorMsg = consumeResult.error || 'Unknown error';
              log.error('GAME SERVICE', 'Failed to consume game credit after item selection', {
                error: errorMsg,
                playerAddress: walletAddress,
              });
              
              // Show user-friendly error message
              if (errorMsg.includes('not have an active game pass') || errorMsg.includes('credits remaining')) {
                alert(`No credits available.\n\n${errorMsg}\n\nYou can still play in demo mode.`);
              } else if (errorMsg.includes('network') || errorMsg.includes('timeout') || errorMsg.includes('connection')) {
                alert(`Network error while consuming credit.\n\n${errorMsg}\n\nPlease check your connection and try again. You can still play in demo mode.`);
              } else {
                alert(`Failed to consume game credit.\n\n${errorMsg}\n\nYou can still play in demo mode.`);
              }
              // Continue in demo mode
            } else {
              // Credit consumed successfully - start full game
              isDemoMode = false;
              log.info('GAME SERVICE', 'Credit consumed successfully after item selection', {
                digest: consumeResult.digest,
                gamesRemaining: consumeResult.gamesRemaining,
              });
              
              // Refresh credit display (with error handling)
              if (window.GamePassDisplay) {
                try {
                  await window.GamePassDisplay.refresh(walletAddress, true, false);
                  log.debug('GAME SERVICE', 'Credit display refreshed after consumption');
                } catch (refreshError) {
                  log.warn('GAME SERVICE', 'Failed to refresh credit display', refreshError);
                  // Don't block game start if display refresh fails
                }
              }
            }
          } catch (error) {
            log.error('GAME SERVICE', 'Error consuming credit after item selection', error);
            alert(`Error consuming credit: ${error.message || 'Unknown error'}\n\nYou can still play in demo mode.`);
            // Continue in demo mode on error
          }
        } else {
          log.info('GAME SERVICE', 'No credits available, starting in demo mode');
        }
        
        // Store demo mode flag in game state
        if (this._gameState) {
          this._gameState.isDemoMode = isDemoMode;
        }
        if (this._uiGameState) {
          this._uiGameState.isDemoMode = isDemoMode;
        }
        if (typeof gameState !== 'undefined') {
          gameState.isDemoMode = isDemoMode;
        }
        
        // Loading modal will be shown again by confirmItemConsumption()
        // Update loading message when it's shown
        if (typeof updateLoadingModalMessage === 'function') {
          updateLoadingModalMessage('Initializing game... Please wait', 'gameStartLoadingModal');
        }
      } else {
        // No item consumption modal - handle tournament entry or credit consumption
        let isDemoMode = true;
        
        // ==========================================
        // TOURNAMENT ENTRY (NO ITEM MODAL PATH)
        // ==========================================
        // Tournament entry happens AFTER item selection would have happened
        // This consumes the ticket, adds funds to pool, increments participant count, and marks player as entered
        
        // DEBUG: Log tournament entry check conditions
        console.log('🔍 [TOURNAMENT ENTRY CHECK] No item modal path', {
          isTournamentMode: isTournamentMode,
          hasTournamentContext: !!tournamentContext,
          hasWalletAddress: !!walletAddress,
          walletAddress: walletAddress,
          tournamentContext: tournamentContext,
          allConditionsMet: isTournamentMode && tournamentContext && walletAddress,
        });
        
        if (isTournamentMode && tournamentContext && walletAddress) {
          try {
            log.info('GAME SERVICE', '🏆 TOURNAMENT ENTRY - Entering tournament (no item modal)', {
              walletAddress: walletAddress,
              tournamentObjectId: tournamentContext.tournamentObjectId,
              entryFeeTickets: tournamentContext.tournamentEntryFeeTickets,
              tournamentName: tournamentContext.tournamentName,
            });
            
            // Update loading message to show ticket consumption
            if (typeof updateLoadingModalMessage === 'function') {
              updateLoadingModalMessage('Entering tournament and consuming ticket... Please wait', 'gameStartLoadingModal');
            }
            
            // Show loading modal if hidden
            if (typeof showLoadingModal === 'function') {
              showLoadingModal('Entering tournament and consuming ticket... Please wait', 'gameStartLoadingModal');
            }
            
            const API_BASE_URL = window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3000/api';
            
            log.debug('GAME SERVICE', 'Calling tournament entry API (no item modal)', {
              url: `${API_BASE_URL}/tournaments/enter`,
              playerAddress: walletAddress,
              tournamentObjectId: tournamentContext.tournamentObjectId,
            });
            
            // Enter tournament (consumes ticket, admin wallet executes transaction)
            const enterResponse = await fetch(`${API_BASE_URL}/tournaments/enter`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                playerAddress: walletAddress,
                tournamentObjectId: tournamentContext.tournamentObjectId,
                // ticketId is optional - backend will find a valid ticket if not provided
              }),
            });
            
            log.debug('GAME SERVICE', 'Tournament entry API response (no item modal)', {
              ok: enterResponse.ok,
              status: enterResponse.status,
              statusText: enterResponse.statusText,
            });
            
            if (!enterResponse.ok) {
              let errorData = {};
              try {
                errorData = await enterResponse.json();
              } catch (e) {
                log.error('GAME SERVICE', 'Failed to parse error response', e);
                errorData = { error: `HTTP ${enterResponse.status}: ${enterResponse.statusText}` };
              }
              const errorMsg = errorData.error || errorData.message || `HTTP ${enterResponse.status}: ${enterResponse.statusText}`;
              log.error('GAME SERVICE', '❌ Failed to enter tournament - HTTP error (no item modal)', {
                error: errorMsg,
                status: enterResponse.status,
                playerAddress: walletAddress,
                tournamentObjectId: tournamentContext.tournamentObjectId,
                errorData: errorData,
              });
              alert(`Failed to enter tournament: ${errorMsg}\n\nPlease check:\n- You have enough tournament tickets\n- The tournament is still active\n- Your network connection\n\nGame cancelled.`);
              return; // Cancel game start
            }
            
            const enterResult = await enterResponse.json();
            
            log.info('GAME SERVICE', 'Tournament entry API response received (no item modal)', {
              success: enterResult.success,
              transactionDigest: enterResult.transactionDigest,
              error: enterResult.error,
            });
            
            if (!enterResult.success) {
              const errorMsg = enterResult.error || enterResult.message || 'Failed to enter tournament';
              log.error('GAME SERVICE', '❌ Failed to enter tournament - API returned error (no item modal)', {
                error: errorMsg,
                playerAddress: walletAddress,
                tournamentObjectId: tournamentContext.tournamentObjectId,
                result: enterResult,
              });
              alert(`Failed to enter tournament: ${errorMsg}\n\nPlease check:\n- You have enough tournament tickets\n- The tournament is still active\n- Your network connection\n\nGame cancelled.`);
              return; // Cancel game start
            }
            
            // Tournament ticket consumed successfully - player is now entered
            isDemoMode = false; // Tournament games are never in demo mode
            log.info('GAME SERVICE', '✅ Tournament entry completed successfully - ticket consumed, player entered (no item modal)', {
              transactionDigest: enterResult.transactionDigest,
              tournamentObjectId: tournamentContext.tournamentObjectId,
              tournamentName: tournamentContext.tournamentName,
            });
          } catch (error) {
            log.error('GAME SERVICE', '❌ Exception during tournament entry (no item modal)', {
              error: error.message,
              stack: error.stack,
              playerAddress: walletAddress,
              tournamentObjectId: tournamentContext?.tournamentObjectId,
            });
            alert(`Error entering tournament: ${error.message || 'Unknown error'}\n\nThis might be a network issue. Please try again.\n\nGame cancelled.`);
            return; // Cancel game start
          }
        } else if (isTournamentMode) {
          // Tournament game but entry failed - CANCEL GAME
          log.error('GAME SERVICE', '❌ Tournament entry SKIPPED - missing required data (no item modal)', {
            isTournamentMode: isTournamentMode,
            hasTournamentContext: !!tournamentContext,
            hasWalletAddress: !!walletAddress,
            tournamentContext: tournamentContext,
            walletAddress: walletAddress,
          });
          alert(`Error: Cannot enter tournament. Missing required data.\n\nisTournamentMode: ${isTournamentMode}\nhasTournamentContext: ${!!tournamentContext}\nhasWalletAddress: ${!!walletAddress}\n\nPlease refresh the page and try again.`);
          return; // Cancel game start
        } else if (hasCredits && walletAddress && window.GamePassService) {
          // Regular credit consumption for non-tournament games
          try {
            log.info('GAME SERVICE', 'Consuming credit (no item selection)', {
              walletAddress: walletAddress,
            });
            
            const consumeResult = await window.GamePassService.consumeGameCredit(walletAddress);
            if (!consumeResult.success) {
              const errorMsg = consumeResult.error || 'Unknown error';
              log.error('GAME SERVICE', 'Failed to consume game credit', {
                error: errorMsg,
                playerAddress: walletAddress,
              });
              // Continue in demo mode
            } else {
              isDemoMode = false;
              log.info('GAME SERVICE', 'Credit consumed successfully', {
                digest: consumeResult.digest,
                gamesRemaining: consumeResult.gamesRemaining,
              });
              
              if (window.GamePassDisplay) {
                try {
                  await window.GamePassDisplay.refresh(walletAddress, true, false);
                } catch (refreshError) {
                  log.warn('GAME SERVICE', 'Failed to refresh credit display', refreshError);
                }
              }
            }
          } catch (error) {
            log.error('GAME SERVICE', 'Error consuming credit', error);
            // Continue in demo mode
          }
        }
        
        // Store demo mode flag in game state
        if (this._gameState) {
          this._gameState.isDemoMode = isDemoMode;
        }
        if (this._uiGameState) {
          this._uiGameState.isDemoMode = isDemoMode;
        }
        if (typeof gameState !== 'undefined') {
          gameState.isDemoMode = isDemoMode;
        }
        
        // No item consumption modal, continue with initialization
        // Show loading modal again
        if (typeof showLoadingModal === 'function') {
          showLoadingModal('Initializing game... Please wait', 'gameStartLoadingModal');
        }
      }
      
      // Initialize game if not already initialized
      if (typeof window.initializeGame === 'function') {
        log.debug('GAME SERVICE', 'Calling initializeGame()');
        window.initializeGame();
      } else {
        log.error('GAME SERVICE', 'initializeGame is not a function!');
      }
      
      // Update state after game scripts load (re-check in case gameState is now available)
      state = this._uiGameState || (typeof gameState !== 'undefined' ? gameState : null);
      if (state) {
        state.isMenuVisible = false;
        state.isGameRunning = true;
        state.isPaused = false;
        state.isGameOver = false;
      } else {
        log.warn('GAME SERVICE', 'Neither uiGameState nor gameState is available');
      }
      
      // Hide main menu - use MenuService if available, otherwise fallback
      if (this._menuService && this._menuService.hide) {
        this._menuService.hide();
      } else {
        // Fallback: manual hide
        const mainMenu = this._getMainMenu();
        if (mainMenu) {
          mainMenu.classList.remove('main-menu-overlay-visible');
          mainMenu.classList.add('main-menu-overlay-hidden');
          // Remove any inline styles that might have been set
          mainMenu.style.display = '';
          mainMenu.style.visibility = '';
          mainMenu.style.opacity = '';
        }
      }
      
      // Update loading message
      if (typeof updateLoadingModalMessage === 'function') {
        updateLoadingModalMessage('Setting up game display... Please wait', 'gameStartLoadingModal');
      }
      
      // Show game container
      const gameContainer = this._getGameContainer();
      if (gameContainer) {
        gameContainer.classList.add('game-container-visible');
        gameContainer.classList.remove('game-container-hidden');
        // Remove any inline styles that might have been set
        gameContainer.style.display = '';
        gameContainer.style.visibility = '';
        // Force show with inline styles to ensure visibility
        gameContainer.style.display = 'flex';
        gameContainer.style.visibility = 'visible';
        gameContainer.style.opacity = '1';
        
        // Ensure canvas is visible and has correct dimensions
        const canvas = this._getCanvas();
        if (!canvas) {
          log.error('GAME SERVICE', 'Canvas element not found!');
        } else {
          // Apply tournament mode styling to canvas if in tournament mode
          if (isTournamentMode) {
            canvas.classList.add('tournament-mode');
            console.log('🏆 [GAME SERVICE] Applied tournament-mode class to canvas (gold border)', {
              canvasId: canvas.id,
              hasClass: canvas.classList.contains('tournament-mode'),
              tournamentMode: isTournamentMode,
            });
            log.debug('GAME SERVICE', 'Applied tournament-mode class to canvas (gold border)', {
              canvasId: canvas.id,
              hasClass: canvas.classList.contains('tournament-mode'),
            });
          } else {
            canvas.classList.remove('tournament-mode');
          }
        }
        
        // Also apply tournament mode class after a short delay to ensure canvas is fully initialized
        // This handles cases where canvas might be recreated or reinitialized
        if (isTournamentMode) {
          // Function to apply tournament mode class
          const applyTournamentModeClass = () => {
            const canvasDelayed = this._getCanvas() || document.getElementById('gameCanvas');
            if (canvasDelayed) {
              canvasDelayed.classList.add('tournament-mode');
              console.log('🏆 [GAME SERVICE] Applied tournament-mode class to canvas', {
                canvasId: canvasDelayed.id,
                hasClass: canvasDelayed.classList.contains('tournament-mode'),
                canvasElement: canvasDelayed,
              });
              return true;
            }
            return false;
          };
          
          // Try immediately
          applyTournamentModeClass();
          
          // Try after delays
          setTimeout(applyTournamentModeClass, 100);
          setTimeout(applyTournamentModeClass, 500);
          setTimeout(applyTournamentModeClass, 1000);
          
          // Use MutationObserver to watch for canvas changes
          const observer = new MutationObserver(() => {
            if (applyTournamentModeClass()) {
              // If we successfully applied the class, we can stop observing
              observer.disconnect();
            }
          });
          
          // Observe the game container for changes
          const gameContainer = this._getGameContainer();
          if (gameContainer) {
            observer.observe(gameContainer, {
              childList: true,
              subtree: true,
              attributes: true,
              attributeFilter: ['class', 'id'],
            });
            
            // Stop observing after 5 seconds
            setTimeout(() => observer.disconnect(), 5000);
          }
        }
        
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
      }
      
      // Update loading message
      if (typeof updateLoadingModalMessage === 'function') {
        updateLoadingModalMessage('Initializing game state... Please wait', 'gameStartLoadingModal');
      }
      
      // ==========================================
      // GAME LOGIC INITIALIZATION
      // ==========================================
      // Call the extracted game initialization function
      if (typeof window.initializeGameLogic === 'function') {
        // Get game state from window.gameState (exposed by game-state.js)
        const gameState = (typeof window !== 'undefined' && window.gameState) ? window.gameState : null;
        
        if (!gameState) {
          log.error('GAME SERVICE', 'gameState not available! Make sure game-state.js is loaded.');
        }
        
        // Update loading message before initialization
        if (typeof updateLoadingModalMessage === 'function') {
          updateLoadingModalMessage('Resetting game state... Please wait', 'gameStartLoadingModal');
        }
        
        // PRESERVE tournament state before initialization (in case reset clears it)
        const preservedWindowGameTournamentState = (typeof window !== 'undefined' && window.game) ? {
          isTournamentMode: window.game.isTournamentMode,
          tournamentObjectId: window.game.tournamentObjectId,
          tournamentCategory: window.game.tournamentCategory,
          tournamentName: window.game.tournamentName,
          returnToTournament: window.game.returnToTournament,
        } : null;
        
        // Pass all required dependencies
        window.initializeGameLogic(
          gameState,                                                    // game state from window.gameState
          typeof window.initSecurity === 'function' ? window.initSecurity : null,
          typeof resetCoinStreak === 'function' ? resetCoinStreak : null,
          typeof player !== 'undefined' ? player : null,
          typeof clearGameArrays === 'function' ? clearGameArrays : null,
          typeof generateTiles === 'function' ? generateTiles : null,
          typeof gameLoop === 'function' ? gameLoop : null
        );
        
        // RESTORE tournament state on window.game AND gameState after initialization (safety check)
        // window.game and window.gameState are the same object, but ensure both references have the state
        if (preservedWindowGameTournamentState && preservedWindowGameTournamentState.isTournamentMode) {
          // Restore on window.game
          if (typeof window !== 'undefined' && window.game) {
            window.game.isTournamentMode = preservedWindowGameTournamentState.isTournamentMode;
            window.game.tournamentObjectId = preservedWindowGameTournamentState.tournamentObjectId;
            window.game.tournamentCategory = preservedWindowGameTournamentState.tournamentCategory;
            window.game.tournamentName = preservedWindowGameTournamentState.tournamentName;
            window.game.returnToTournament = preservedWindowGameTournamentState.returnToTournament;
          }
          
          // Also restore on gameState (they should be the same, but ensure both)
          if (gameState) {
            gameState.isTournamentMode = preservedWindowGameTournamentState.isTournamentMode;
            gameState.tournamentObjectId = preservedWindowGameTournamentState.tournamentObjectId;
            gameState.tournamentCategory = preservedWindowGameTournamentState.tournamentCategory;
            gameState.tournamentName = preservedWindowGameTournamentState.tournamentName;
            gameState.returnToTournament = preservedWindowGameTournamentState.returnToTournament;
          }
          
          log.info('GAME SERVICE', '✅ Restored tournament state after initialization', {
            isTournamentMode: window.game?.isTournamentMode,
            tournamentObjectId: window.game?.tournamentObjectId,
            gameStateIsTournamentMode: gameState?.isTournamentMode,
            gameStateTournamentObjectId: gameState?.tournamentObjectId,
          });
        }
        
        // Update loading message after initialization
        if (typeof updateLoadingModalMessage === 'function') {
          updateLoadingModalMessage('Preparing game world... Please wait', 'gameStartLoadingModal');
        }
        
        // Pre-generate initial tiles during loading (if not already done)
        if (typeof generateTiles === 'function' && typeof window !== 'undefined' && window.tiles) {
          const tilesBeforeGen = window.tiles.length;
          if (tilesBeforeGen < 30) {
            log.debug('GAME SERVICE', 'Pre-generating initial tiles during loading...');
            generateTiles();
            const tilesAfterGen = window.tiles.length;
            log.debug('GAME SERVICE', `Pre-generated ${tilesAfterGen - tilesBeforeGen} tiles`);
          }
        }
      } else {
        log.error('GAME SERVICE', 'initializeGameLogic is not available! Make sure game-initialization.js is loaded.');
      }
      
      // Update loading message
      if (typeof updateLoadingModalMessage === 'function') {
        updateLoadingModalMessage('Starting game engine... Please wait', 'gameStartLoadingModal');
      }
      
      // Small delay to ensure everything is ready before starting the loop
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Stop menu music and start gameplay music (only if enabled)
      if (typeof stopBackgroundMusic === 'function') {
        stopBackgroundMusic(); // Stop menu music
      }
      if (typeof startGameplayMusic === 'function' && typeof gameSettings !== 'undefined' && gameSettings.backgroundMusic) {
        startGameplayMusic(); // Start gameplay music
      }
      
      // Update loading message
      if (typeof updateLoadingModalMessage === 'function') {
        updateLoadingModalMessage('Almost ready... Please wait', 'gameStartLoadingModal');
      }
      
      // Final delay to ensure smooth transition
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // FINAL SAFEGUARD: Ensure tournament state is set on all game objects right before game starts
      // This ensures state is preserved even if something reset it during initialization
      if (isTournamentMode && tournamentContext) {
        // Set on all possible game object references
        if (this._gameState) {
          this._gameState.isTournamentMode = true;
          this._gameState.tournamentObjectId = tournamentContext.tournamentObjectId;
          this._gameState.tournamentCategory = tournamentContext.tournamentCategory;
          this._gameState.tournamentName = tournamentContext.tournamentName;
        }
        if (typeof window !== 'undefined' && window.gameState) {
          window.gameState.isTournamentMode = true;
          window.gameState.tournamentObjectId = tournamentContext.tournamentObjectId;
          window.gameState.tournamentCategory = tournamentContext.tournamentCategory;
          window.gameState.tournamentName = tournamentContext.tournamentName;
        }
        if (typeof window !== 'undefined' && window.game) {
          window.game.isTournamentMode = true;
          window.game.tournamentObjectId = tournamentContext.tournamentObjectId;
          window.game.tournamentCategory = tournamentContext.tournamentCategory;
          window.game.tournamentName = tournamentContext.tournamentName;
        }
        log.info('GAME SERVICE', '✅ Final tournament state verification before game start', {
          tournamentObjectId: tournamentContext.tournamentObjectId,
          windowGameIsTournamentMode: typeof window !== 'undefined' && window.game ? window.game.isTournamentMode : 'N/A',
          windowGameStateIsTournamentMode: typeof window !== 'undefined' && window.gameState ? window.gameState.isTournamentMode : 'N/A',
        });
      }
      
      // Hide loading modal AFTER everything is initialized and ready
      if (typeof hideLoadingModal === 'function') {
        hideLoadingModal('gameStartLoadingModal');
      }
      
      // Update games played counter
      if (typeof gameStats !== 'undefined') {
        gameStats.gamesPlayed++;
        if (typeof saveGameData === 'function') {
          saveGameData();
        }
      }
      
      this._isGameRunning = true;
      
      // Ensure tournament mode class is applied to canvas when game starts running
      // This catches cases where canvas might be recreated or class was removed
      if (isTournamentMode) {
        setTimeout(() => {
          const canvas = this._getCanvas() || document.getElementById('gameCanvas');
          if (canvas) {
            canvas.classList.add('tournament-mode');
            console.log('🏆 [GAME SERVICE] Applied tournament-mode class when game started running', {
              canvasId: canvas.id,
              hasClass: canvas.classList.contains('tournament-mode'),
            });
          }
        }, 100);
      }
      this._isGamePaused = false;
      this._isGameOver = false;
      
      log.debug('GAME SERVICE', 'Game started successfully', {
        isTournamentMode: isTournamentMode,
        tournamentObjectId: isTournamentMode ? tournamentContext.tournamentObjectId : null,
      });
      
      // Reset start game buttons now that game has started
      // This ensures buttons are reset even if user returns to menu quickly
      this.enableStartGameButton();
      
      // Loading modal is already hidden at this point (hidden after initialization completes)
      
    } catch (error) {
      log.error('GAME SERVICE', 'Error starting game', error);
      // Show error to user
      alert(`Error starting game: ${error.message || 'Unknown error'}`);
      // Hide loading modal on error
      if (typeof hideLoadingModal === 'function') {
        hideLoadingModal('gameStartLoadingModal');
      }
    }
  },
  
  /**
   * Close game completely and free resources
   * @param {boolean} returnToMenu - If true, return to appropriate menu (tournament or main) after closing
   */
  closeGame(returnToMenu = false) {
    log.debug('GAME SERVICE', 'Closing game completely', { returnToMenu });
    
    // Stop game engine
    // Get game state from window.gameState (exposed by game-state.js)
    const gameState = (typeof window !== 'undefined' && window.gameState) ? window.gameState : null;
    const game = (typeof window !== 'undefined' && window.game) ? window.game : null;
    
    if (gameState) {
      gameState.gameRunning = false;
      gameState.gameOver = false;
      gameState.paused = false;
      
      // Clear game arrays to free memory
      if (gameState.projectiles) gameState.projectiles = [];
      if (gameState.enemyProjectiles) gameState.enemyProjectiles = [];
      if (gameState.bossProjectiles) gameState.bossProjectiles = [];
      if (gameState.particles) gameState.particles = [];
      if (gameState.tiles) gameState.tiles = [];
      
      // Reset game state
      gameState.speed = 0;
      gameState.bossActive = false;
      gameState.bossWarning = false;
      gameState.boss = null;
    }
    
    // Stop all audio
    if (typeof stopBackgroundMusic === 'function') {
      stopBackgroundMusic();
    }
    if (typeof stopGameplayMusic === 'function') {
      stopGameplayMusic();
    }
    
    // Remove tournament mode styling from canvas
    const canvas = this._getCanvas();
    if (canvas) {
      canvas.classList.remove('tournament-mode');
    }
    
    // Hide game container
    const gameContainer = this._getGameContainer();
    if (gameContainer) {
      gameContainer.classList.add('game-container-hidden');
      gameContainer.classList.remove('game-container-visible');
      // Remove any inline styles
      gameContainer.style.display = '';
      gameContainer.style.visibility = '';
    }
    
    this._isGameRunning = false;
    this._isGamePaused = false;
    this._isGameOver = false;
    
    // If returnToMenu is true, use returnToMainMenu which handles tournament check
    if (returnToMenu) {
      // Use GameLifecycle.returnToMainMenu() which checks returnToTournament flag
      if (typeof getGameLifecycle === 'function') {
        const lifecycle = getGameLifecycle();
        if (lifecycle && typeof lifecycle.returnToMainMenu === 'function') {
          lifecycle.returnToMainMenu();
          return;
        }
      }
      
      // Fallback: Check returnToTournament flag manually
      const shouldReturnToTournament = (game && game.returnToTournament) || 
                                       (gameState && gameState.returnToTournament) ||
                                       (typeof window !== 'undefined' && window.game && window.game.returnToTournament);
      
      if (shouldReturnToTournament) {
        log.debug('GAME SERVICE', 'Returning to tournament screen after closeGame');
        // Clear return flag
        if (game) game.returnToTournament = false;
        if (gameState) gameState.returnToTournament = false;
        if (typeof window !== 'undefined' && window.game) {
          window.game.returnToTournament = false;
        }
        // Show tournament screen
        if (typeof showTournaments === 'function') {
          showTournaments();
        } else {
          log.warn('GAME SERVICE', 'showTournaments not available, falling back to main menu');
          if (typeof MenuService !== 'undefined' && MenuService.show) {
            // Set guard flag to prevent MenuService.show() from calling closeGame() again
            MenuService._calledFromCloseGame = true;
            try {
              MenuService.show();
            } finally {
              MenuService._calledFromCloseGame = false;
            }
          }
        }
      } else {
        // Show main menu
        if (typeof MenuService !== 'undefined' && MenuService.show) {
          // Set guard flag to prevent MenuService.show() from calling closeGame() again
          MenuService._calledFromCloseGame = true;
          try {
            MenuService.show();
          } finally {
            MenuService._calledFromCloseGame = false;
          }
        } else if (typeof showMainMenu === 'function') {
          showMainMenu();
        }
      }
    }
  },
  
  /**
   * Update game readiness UI (enable/disable start buttons)
   */
  updateGameReadiness() {
    // Update both start button and test button based on readiness
    const ready = this.isGameReady();
    
    // Enable buttons if wallet is connected (even if data isn't fully loaded - demo mode is always available)
      if (window.walletAPIInstance && window.walletAPIInstance.isConnected()) {
      // Enable test button (bypasses balance check, always available for demo)
      this.enableStartGameTestButton();
      
      // Enable regular start button - always enable for demo mode (even without balance/credits)
      // The button text will show "Start Demo" if no credits, "Start Game" if credits available
      // Demo mode is always available, so enable the button even if data isn't fully loaded
          this.enableStartGameButton();
        } else {
      // No wallet connected - disable buttons
          this.disableStartGameButton();
      const testBtn = this._getStartGameTestBtn();
      if (testBtn) {
        testBtn.disabled = true;
        testBtn.style.opacity = '0.5';
        testBtn.style.cursor = 'not-allowed';
      }
    }
    
    // Log readiness state for debugging
    if (!ready && typeof gameReadinessState !== 'undefined') {
      log.debug('GAME SERVICE', 'Game not fully ready, but buttons enabled for demo mode', {
        dataLoaded: gameReadinessState.dataLoaded,
        migrationCheckComplete: gameReadinessState.migrationCheckComplete,
        migrationModalClosed: gameReadinessState.migrationModalClosed,
      });
    }
  },
  
  /**
   * Update button text based on credit availability
   * @param {boolean} hasCredits - Whether player has credits
   */
  async updateStartButtonText(hasCredits = null) {
    // If hasCredits not provided, check it
    if (hasCredits === null) {
      if (!window.walletAPIInstance || !window.walletAPIInstance.isConnected()) {
        // No wallet connected - use default text
        hasCredits = false;
      } else {
        const walletAddress = window.walletAPIInstance.getAddress();
        if (walletAddress && window.GamePassService) {
          try {
            const status = await window.GamePassService.getGamePassStatus(walletAddress);
            hasCredits = status.success && status.hasPass && status.isActive && (status.gamesRemaining || 0) > 0;
          } catch (error) {
            log.warn('GAME SERVICE', 'Error checking credits for button text', error);
            hasCredits = false;
      }
    } else {
          hasCredits = false;
        }
      }
    }
    
    const startGameBtn = this._getStartGameBtn();
      const testBtn = this._getStartGameTestBtn();
    
    if (startGameBtn) {
      // Store original text if not already stored
      if (!startGameBtn.getAttribute('data-original-text')) {
        const currentText = startGameBtn.innerHTML;
        startGameBtn.setAttribute('data-original-text', currentText);
      }
      
      // Update text based on credits
      if (hasCredits) {
        // Player has credits - show "Start Game"
        startGameBtn.innerHTML = '<span class="btn-icon">▶️</span> Start Game';
        startGameBtn.title = 'Start Game';
      } else {
        // No credits - show "Start Demo"
        startGameBtn.innerHTML = '<span class="btn-icon">▶️</span> Start Demo';
        startGameBtn.title = 'Start Demo (No credits required)';
      }
    }
    
      if (testBtn) {
      // Store original text if not already stored
      if (!testBtn.getAttribute('data-original-text')) {
        const currentText = testBtn.innerHTML;
        testBtn.setAttribute('data-original-text', currentText);
      }
      
      // Update text based on credits
      if (hasCredits) {
        // Player has credits - show "Start Game (Test Mode)"
        testBtn.innerHTML = '<span class="btn-icon">🧪</span> Start Game (Test Mode)';
        testBtn.title = 'Test Mode: Bypass gatekeeping (for development/testing)';
      } else {
        // No credits - show "Start Demo (Test Mode)"
        testBtn.innerHTML = '<span class="btn-icon">🧪</span> Start Demo (Test Mode)';
        testBtn.title = 'Test Mode: Start demo (bypasses gatekeeping)';
      }
    }
  },
  
  /**
   * Enable the "Start Game" button
   */
  enableStartGameButton() {
    const startGameBtn = this._getStartGameBtn();
    if (startGameBtn) {
      startGameBtn.disabled = false;
      startGameBtn.style.opacity = '1';
      startGameBtn.style.cursor = 'pointer';
      // Reset button text to original (in case it was changed during loading)
      const originalText = startGameBtn.getAttribute('data-original-text') || startGameBtn.innerHTML;
      if (!startGameBtn.getAttribute('data-original-text')) {
        startGameBtn.setAttribute('data-original-text', originalText);
      }
      // Only reset if it's still showing a loading state
      if (startGameBtn.innerHTML.includes('⏳') || startGameBtn.innerHTML.includes('Loading') || startGameBtn.innerHTML.includes('Starting') || startGameBtn.innerHTML.includes('Consuming')) {
        // Update button text based on credits (but preserve if not in loading state)
        this.updateStartButtonText().catch(err => {
          log.warn('GAME SERVICE', 'Failed to update button text', err);
          // Fallback to original text
          startGameBtn.innerHTML = originalText;
        });
      } else {
        // Not in loading state, just update based on credits
        this.updateStartButtonText().catch(err => {
          log.warn('GAME SERVICE', 'Failed to update button text', err);
        });
      }
    }
    
    // Also reset test button
    this.enableStartGameTestButton();
  },
  
  /**
   * Enable the "Start Game (Test)" button
   */
  enableStartGameTestButton() {
    const testBtn = this._getStartGameTestBtn();
    if (testBtn) {
      testBtn.disabled = false;
      testBtn.style.opacity = '1';
      testBtn.style.cursor = 'pointer';
      // Reset button text to original (in case it was changed during loading)
      const originalText = testBtn.getAttribute('data-original-text') || testBtn.innerHTML;
      if (!testBtn.getAttribute('data-original-text')) {
        testBtn.setAttribute('data-original-text', originalText);
      }
      // Only reset if it's still showing a loading state
      if (testBtn.innerHTML.includes('⏳') || testBtn.innerHTML.includes('Loading') || testBtn.innerHTML.includes('Starting') || testBtn.innerHTML.includes('Consuming')) {
        // Update button text based on credits (but preserve if not in loading state)
        this.updateStartButtonText().catch(err => {
          log.warn('GAME SERVICE', 'Failed to update test button text', err);
          // Fallback to original text
          testBtn.innerHTML = originalText;
        });
      } else {
        // Not in loading state, just update based on credits
        this.updateStartButtonText().catch(err => {
          log.warn('GAME SERVICE', 'Failed to update test button text', err);
        });
      }
    }
  },
  
  /**
   * Disable the "Start Game" button
   */
  disableStartGameButton() {
    const startGameBtn = this._getStartGameBtn();
    if (startGameBtn) {
      startGameBtn.disabled = true;
      startGameBtn.style.opacity = '0.5';
      startGameBtn.style.cursor = 'not-allowed';
    }
  },
  
  /**
   * Get current game state
   * @returns {Object} Game state info
   */
  getGameState() {
    return {
      isRunning: this._isGameRunning,
      isPaused: this._isGamePaused,
      isGameOver: this._isGameOver
    };
  }
};

// Initialize on load
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      GameService.init();
    });
  } else {
    GameService.init();
  }
  
  // Expose globally for debugging and integration
  window.GameService = GameService;
  
  // Expose startTournamentGame globally
  if (typeof window !== 'undefined') {
    window.startTournamentGame = (tournament) => {
      if (GameService && typeof GameService.startTournamentGame === 'function') {
        return GameService.startTournamentGame(tournament);
      } else {
        console.error('GameService.startTournamentGame not available');
      }
    };
  }
  
  // Add debug function to check GameService status
  window.checkGameService = function() {
    if (typeof log !== 'undefined') {
      log.info('GAME SERVICE', '========== GAME SERVICE STATUS ==========');
      log.info('GAME SERVICE', 'GameService available', typeof GameService !== 'undefined');
      if (typeof GameService !== 'undefined') {
        log.info('GAME SERVICE', 'GameService initialized', GameService._initialized);
        log.info('GAME SERVICE', 'Game state', GameService.getGameState());
        log.info('GAME SERVICE', 'Game ready', GameService.isGameReady());
        log.info('GAME SERVICE', 'MenuService available', GameService._menuService !== null);
        log.info('GAME SERVICE', 'gameState available', GameService._gameState !== null);
        log.info('GAME SERVICE', 'uiGameState available', GameService._uiGameState !== null);
      }
    } else {
      // Fallback if logger not available
      console.log('GameService available:', typeof GameService !== 'undefined');
      if (typeof GameService !== 'undefined') {
        console.log('GameService initialized:', GameService._initialized);
        console.log('Game state:', GameService.getGameState());
        console.log('Game ready:', GameService.isGameReady());
      }
    }
    return typeof GameService !== 'undefined';
  };
}

