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

/** game-config / Helm minTokenBalance uses 6-decimal raw; gatekeeping MEWS check uses mainnet. */
const _MEWS_GATE_DECIMALS = 6;

function _formatMewsFromRawForAlert(rawStr) {
  if (rawStr == null || rawStr === '') return null;
  try {
    const n = Number(BigInt(String(rawStr))) / Math.pow(10, _MEWS_GATE_DECIMALS);
    if (!Number.isFinite(n)) return null;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  } catch (_) {
    return null;
  }
}

const GameService = {
  // State
  _initialized: false,
  _isGameRunning: false,
  _isGamePaused: false,
  _isGameOver: false,
  // Tournament Anchor session id for score submission.
  // Stored here because tournament session creation can happen before game scripts define window.gameState/window.game.
  _anchorSessionId: null,
  /** @type {{ confirmed: boolean; items: Record<string, number> } | null} Prep store embed: skip modal, use this at item-selection phase. Cleared in startGame finally if unused. */
  _pendingPrepItemModalResult: null,
  
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
   * After tournament enter succeeds, ensure any legacy tournament start flags are cleared.
   * @private
   */
  _clearTournamentMainMenuPrepFlag() {
    try {
      if (typeof window !== 'undefined' && window.TournamentContext && typeof window.TournamentContext.set === 'function') {
        window.TournamentContext.set({ awaitingStartGameFromMenu: false });
      }
    } catch (_) {}
  },

  /**
   * Start items (orb_level, extra_lives, force_field) from item modal result — same shape for tournament and credit runs.
   * @param {{ items?: Record<string, unknown> } | null | undefined} result
   * @returns {Array<{ itemId: string; level: number; quantity: number }>}
   */
  _normalizeStartItemsFromModalResult(result) {
    if (!result?.items || typeof result.items !== 'object') return [];
    return Object.entries(result.items)
      .filter(([key]) => ['orb_level', 'extra_lives', 'force_field'].includes(key))
      .map(([itemId, level]) => ({
        itemId,
        level: typeof level === 'number' ? level : level ? 1 : 0,
        quantity: 1,
      }))
      .filter((item) => item.level > 0);
  },

  /** Anchor session id for tournament enter + score submit (shared resolution). */
  _resolveTournamentAnchorSessionId() {
    if (this._gameState && typeof this._gameState.anchorSessionId === 'number' && this._gameState.anchorSessionId >= 1) {
      return this._gameState.anchorSessionId;
    }
    if (typeof window !== 'undefined' && window.gameState && typeof window.gameState.anchorSessionId === 'number' && window.gameState.anchorSessionId >= 1) {
      return window.gameState.anchorSessionId;
    }
    if (typeof window !== 'undefined' && typeof window.__tournamentAnchorSessionId === 'number' && window.__tournamentAnchorSessionId >= 1) {
      return window.__tournamentAnchorSessionId;
    }
    if (typeof this._anchorSessionId === 'number' && this._anchorSessionId >= 1) {
      return this._anchorSessionId;
    }
    const ctx =
      typeof window !== 'undefined' && window.TournamentContext && typeof window.TournamentContext.load === 'function'
        ? window.TournamentContext.load()
        : null;
    if (ctx && typeof ctx.anchorSessionId === 'number' && ctx.anchorSessionId >= 1) {
      return ctx.anchorSessionId;
    }
    return null;
  },

  _tournamentEnterApiBaseUrl() {
    const raw = window.GameApi
      ? window.GameApi.getBaseUrl()
      : window.GAME_CONFIG?.GAME_BACKEND_URL || window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3001/api';
    return String(raw).replace(/\/?$/, '');
  },

  _onTournamentEnterSuccessSideEffects(tournamentContext, walletAddress) {
    this._clearTournamentMainMenuPrepFlag();
    if (window.GamePassService?.invalidateCache) {
      window.GamePassService.invalidateCache();
    }
    if (walletAddress && window.PlayerInventoryCache?.refreshInventoryAfterConsumption) {
      window.PlayerInventoryCache.refreshInventoryAfterConsumption(walletAddress);
    }
    try {
      const tid = String(tournamentContext?.tournamentObjectId || '');
      if (tid && window.apiRequestCache?.invalidateByPattern && walletAddress) {
        window.apiRequestCache.invalidateByPattern(`tournamentEntry:${walletAddress}:`);
      }
      if (typeof window !== 'undefined') {
        window.__prefetchedTournaments = null;
        window.__prefetchedMyTournaments = null;
      }
      if (typeof window.refreshTournaments === 'function') {
        void window.refreshTournaments();
      }
    } catch (_) {}
  },

  /**
   * Tournament: POST /tournaments/enter — consume ticket + selected start items + Station participant (single backend tx).
   * @returns {Promise<boolean>} true if entered (or alreadyEntered success)
   */
  async _postTournamentEnterWithSideEffects({ walletAddress, tournamentContext, startItems, requireAnchorSession }) {
    const anchorSessionId = this._resolveTournamentAnchorSessionId();
    if (requireAnchorSession && (anchorSessionId == null || anchorSessionId < 1)) {
      log.error('GAME SERVICE', 'Cannot enter tournament without valid Anchor session');
      this.enableStartGameButton();
      alert('Session expired or missing. Please start the tournament again from the tournament menu.');
      return false;
    }

    const entryUrl = `${this._tournamentEnterApiBaseUrl()}/tournaments/enter`;
    const entryPayload = {
      playerAddress: walletAddress,
      tournamentObjectId: tournamentContext.tournamentObjectId,
      items: Array.isArray(startItems) ? startItems : [],
    };
    if (typeof anchorSessionId === 'number' && anchorSessionId >= 1) {
      entryPayload.anchorSessionId = anchorSessionId;
    }

    const clientRequestId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `fe-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    try {
      const enterResponse = await fetch(entryUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Id': clientRequestId,
        },
        body: JSON.stringify(entryPayload),
      });

      const serverRequestId =
        enterResponse.headers.get('x-request-id') || enterResponse.headers.get('X-Request-Id') || null;

      if (!enterResponse.ok) {
        let errorData = {};
        try {
          errorData = await enterResponse.json();
        } catch (e) {
          log.error('GAME SERVICE', 'Failed to parse tournament enter error', e);
          errorData = { error: `HTTP ${enterResponse.status}: ${enterResponse.statusText}` };
        }
        const errorMsg = errorData.error || errorData.message || `HTTP ${enterResponse.status}: ${enterResponse.statusText}`;
        log.error('GAME SERVICE', 'Tournament enter HTTP error', {
          error: errorMsg,
          clientRequestId,
          serverRequestId,
          anchorSessionId,
          startItemsCount: Array.isArray(startItems) ? startItems.length : 0,
          playerAddress: walletAddress,
          tournamentObjectId: tournamentContext.tournamentObjectId,
        });
        this.enableStartGameButton();
        alert(
          `Failed to enter tournament: ${errorMsg}\n\nPlease check:\n- You have enough tournament tickets\n- The tournament is still active\n- Your network connection\n\nGame cancelled.`
        );
        return false;
      }

      const enterResult = await enterResponse.json();
      if (!enterResult.success) {
        const errorMsg = enterResult.error || enterResult.message || 'Failed to enter tournament';
        log.error('GAME SERVICE', 'Tournament enter API error', {
          error: errorMsg,
          clientRequestId,
          serverRequestId,
          anchorSessionId,
          startItemsCount: Array.isArray(startItems) ? startItems.length : 0,
          playerAddress: walletAddress,
          tournamentObjectId: tournamentContext.tournamentObjectId,
        });
        this.enableStartGameButton();
        alert(
          `Failed to enter tournament: ${errorMsg}\n\nPlease check:\n- You have enough tournament tickets\n- The tournament is still active\n- Your network connection\n\nGame cancelled.`
        );
        return false;
      }

      log.info('GAME SERVICE', 'Tournament enter OK (ticket + items + participant)', {
        clientRequestId,
        serverRequestId: serverRequestId || clientRequestId,
        anchorSessionId,
        startItemsCount: Array.isArray(startItems) ? startItems.length : 0,
        transactionDigest: enterResult.transactionDigest,
        tournamentObjectId: tournamentContext.tournamentObjectId,
        alreadyEntered: enterResult.alreadyEntered,
      });
      this._onTournamentEnterSuccessSideEffects(tournamentContext, walletAddress);
      return true;
    } catch (error) {
      log.error('GAME SERVICE', 'Tournament enter exception', {
        error: error instanceof Error ? error.message : String(error),
        clientRequestId,
        anchorSessionId,
        playerAddress: walletAddress,
      });
      this.enableStartGameButton();
      alert(
        `Error entering tournament: ${error instanceof Error ? error.message : 'Unknown error'}\n\nThis might be a network issue. Please try again.\n\nGame cancelled.`
      );
      return false;
    }
  },

  /**
   * Regular game: consume 1 credit + same start items shape as tournament (Channel batch).
   * @returns {Promise<boolean>}
   */
  async _postCreditStartGameWithSideEffects(walletAddress, startItems) {
    if (!walletAddress || !window.GamePassService) return false;
    try {
      if (typeof updateLoadingModalMessage === 'function') {
        updateLoadingModalMessage('Starting game (credit + items)... Please wait', 'gameStartLoadingModal');
      }
      const consumeResult = await window.GamePassService.startGame(walletAddress, Array.isArray(startItems) ? startItems : []);
      if (!consumeResult.success) {
        const errorMsg = consumeResult.error || 'Unknown error';
        log.error('GAME SERVICE', 'Credit start-game failed after item selection', {
          error: errorMsg,
          playerAddress: walletAddress,
        });
        this.enableStartGameButton();
        if (errorMsg.includes('not have an active game pass') || errorMsg.includes('credits remaining')) {
          alert(`No credits available.\n\n${errorMsg}\n\nGame cancelled. Your credit was not consumed.`);
        } else if (errorMsg.includes('network') || errorMsg.includes('timeout') || errorMsg.includes('connection')) {
          alert(`Network error.\n\n${errorMsg}\n\nPlease check your connection and try again. Your credit was not consumed.`);
        } else {
          alert(`Failed to start game.\n\n${errorMsg}\n\nGame cancelled. Your credit and items were not consumed.`);
        }
        return false;
      }
      log.info('GAME SERVICE', 'Credit + items consumed via start-game batch', { digest: consumeResult.digest });
      if (window.GamePassDisplay) {
        try {
          await window.GamePassDisplay.refresh(walletAddress, true, false);
        } catch (refreshError) {
          log.warn('GAME SERVICE', 'Failed to refresh credit display', refreshError);
        }
      }
      if (window.PlayerInventoryCache?.refreshInventoryAfterConsumption) {
        window.PlayerInventoryCache.refreshInventoryAfterConsumption(walletAddress);
      }
      return true;
    } catch (error) {
      log.error('GAME SERVICE', 'Error in credit start-game after items', error);
      this.enableStartGameButton();
      alert(`Error starting game: ${error instanceof Error ? error.message : 'Unknown error'}\n\nGame cancelled. Your credit and items were not consumed.`);
      return false;
    }
  },

  /**
   * After item selection (or empty selection): one path for tournament ticket+items+participant vs credit+items vs demo.
   * Mirrors regular `GamePassService.startGame` + tournament `POST /tournaments/enter` payloads.
   */
  async _applyConsumptionsAfterItemSelection({
    isTournamentMode,
    tournamentContext,
    walletAddress,
    hasCredits,
    itemModalResult,
    requireAnchorSession,
  }) {
    const startItems = this._normalizeStartItemsFromModalResult(itemModalResult);

    if (isTournamentMode && tournamentContext && walletAddress) {
      if (typeof updateLoadingModalMessage === 'function') {
        updateLoadingModalMessage('Consuming ticket, items, and registering entry... Please wait', 'gameStartLoadingModal');
      }
      if (typeof showLoadingModal === 'function') {
        showLoadingModal('Consuming ticket, items, and registering entry... Please wait', 'gameStartLoadingModal');
      }
      const ok = await this._postTournamentEnterWithSideEffects({
        walletAddress,
        tournamentContext,
        startItems,
        requireAnchorSession,
      });
      return { ok, isDemoMode: !ok };
    }

    if (isTournamentMode) {
      log.error('GAME SERVICE', 'Tournament mode but missing context or wallet', {
        hasTournamentContext: !!tournamentContext,
        hasWalletAddress: !!walletAddress,
      });
      this.enableStartGameButton();
      alert(
        `Error: Cannot enter tournament. Missing required data.\n\nisTournamentMode: ${isTournamentMode}\nhasTournamentContext: ${!!tournamentContext}\nhasWalletAddress: ${!!walletAddress}\n\nPlease refresh the page and try again.`
      );
      return { ok: false, isDemoMode: true };
    }

    if (hasCredits && walletAddress && window.GamePassService) {
      const ok = await this._postCreditStartGameWithSideEffects(walletAddress, startItems);
      return { ok, isDemoMode: !ok };
    }

    log.info('GAME SERVICE', 'No credits — demo mode after item selection');
    return { ok: true, isDemoMode: true };
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
    // Refactored readiness source of truth is GameDataState (game-data-state.js).
    try {
      if (typeof window !== 'undefined' && window.GameDataState && typeof window.GameDataState.getReadinessState === 'function') {
        const readiness = window.GameDataState.getReadinessState();
        return Boolean(readiness && readiness.dataLoaded);
      }
      if (typeof window !== 'undefined' && window.GameDataState && typeof window.GameDataState.dataLoaded === 'boolean') {
        return Boolean(window.GameDataState.dataLoaded);
      }
    } catch (_) {}
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
      
      // MEWS gate from game-config minTokenBalance only (wallet module); refresh before read
      if (typeof window.walletAPIInstance.checkMEWSBalance === 'function') {
        // Gatekeeping uses MAINNET MEWS (separate from testnet purchase testing).
        await window.walletAPIInstance.checkMEWSBalance(walletAddress, 'mainnet');
      }
      const balanceStatus = window.walletAPIInstance.getBalanceStatus();
      if (!balanceStatus.hasMinimumBalance) {
        const balanceDisplay =
          _formatMewsFromRawForAlert(balanceStatus.balance) || '0';
        const minRequired =
          window.WalletService?._minTokenBalanceFormatted ||
          _formatMewsFromRawForAlert(balanceStatus.minimumRequired) ||
          '0';
        alert(`Insufficient MEWS balance. You need at least ${minRequired} MEWS for gas fees.\n\nCurrent balance: ${balanceDisplay} MEWS`);
        return;
      }

      // Tournament runs must be started from the tournament modal flow (tournament menu -> tournament-entry store -> Start game).
      // Do NOT allow main menu Start Game to start a tournament based on persisted TournamentContext.

      // Regular runs should use the same prep-loadout store components as tournaments (without gold chrome).
      // If we don't yet have an embedded prep selection result, route the player into the regular-entry store.
      // The store "Start game" button will validate selection and then call GameService.startGame() again with
      // `_pendingPrepItemModalResult` populated (so we can proceed to _startGameInternal without reopening store).
      if (
        (this._pendingPrepItemModalResult == null || typeof this._pendingPrepItemModalResult !== 'object') &&
        (typeof showStore === 'function' || (typeof window !== 'undefined' && window.StoreService && typeof window.StoreService.show === 'function'))
      ) {
        try {
          if (startGameBtn) {
            startGameBtn.innerHTML = '<span class="btn-icon">⏳</span> Opening loadout...';
          }
          // Re-enable the main menu Start Game button since the next start action happens inside the store.
          this.enableStartGameButton();
          if (startGameBtn && originalBtnText) {
            startGameBtn.innerHTML = originalBtnText;
          }

          if (typeof showStore === 'function') {
            await showStore('regular-entry');
          } else if (window.StoreService && typeof window.StoreService.show === 'function') {
            await window.StoreService.show('regular-entry');
          }
          return;
        } catch (e) {
          log.error('GAME SERVICE', 'Failed to open prep loadout store for regular entry', e);
          // Fall through to legacy flow if store cannot open for some reason.
        }
      }
      
      // Game Pass check - just check if credits exist (don't consume yet)
      // Credit will be consumed after item selection
      let hasCredits = false;
      if (window.GamePassService) {
        try {
          const status = await window.GamePassService.getCreditsAndTickets(walletAddress);
          hasCredits = status.success && (status.credits || 0) > 0;
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
    } finally {
      if (this._pendingPrepItemModalResult != null) {
        this._pendingPrepItemModalResult = null;
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
      // Credits/tickets are proxied by game backend at /api/reservoir (3001), not platform (3000)
      const gamePassBase =
        (window.GAME_CONFIG?.getBackendUrl && window.GAME_CONFIG.getBackendUrl('/api/reservoir/')) ||
        (window.GameApi ? window.GameApi.getBaseUrl() : (window.GAME_CONFIG?.GAME_BACKEND_URL || window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3001/api'));
      try {
        const gamePassResponse = await fetch(`${gamePassBase}/reservoir/${walletAddress}?contract=new`);
        if (gamePassResponse.ok) {
          const gamePassResult = await gamePassResponse.json();
          hasTickets = gamePassResult.success && (gamePassResult.ticketCount ?? 0) >= tournament.entryFeeTickets;
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
      
      if (typeof window.walletAPIInstance.checkMEWSBalance === 'function') {
        // Use the explicitly configured network; do not hardcode mainnet.
        const network =
          window.WalletService?.network ||
          window.GAME_CONFIG?.NETWORK ||
          'testnet';
        await window.walletAPIInstance.checkMEWSBalance(walletAddress, network);
      }
      const balanceStatus = window.walletAPIInstance.getBalanceStatus();
      if (!balanceStatus.hasMinimumBalance) {
        const balanceDisplay =
          _formatMewsFromRawForAlert(balanceStatus.balance) || '0';
        const minRequired =
          window.WalletService?._minTokenBalanceFormatted ||
          _formatMewsFromRawForAlert(balanceStatus.minimumRequired) ||
          '0';
        alert(`Insufficient MEWS balance. You need at least ${minRequired} MEWS for gas fees.\n\nCurrent balance: ${balanceDisplay} MEWS`);
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
      // Credits/tickets are proxied by game backend at /api/reservoir (3001), not platform (3000)
      const gamePassBase =
        (window.GAME_CONFIG?.getBackendUrl && window.GAME_CONFIG.getBackendUrl('/api/reservoir/')) ||
        (window.GameApi ? window.GameApi.getBaseUrl() : (window.GAME_CONFIG?.GAME_BACKEND_URL || window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3001/api'));
      try {
        const gamePassResponse = await fetch(`${gamePassBase}/reservoir/${walletAddress}?contract=new`);
        if (gamePassResponse.ok) {
          const gamePassResult = await gamePassResponse.json();
          hasTickets = gamePassResult.success && (gamePassResult.ticketCount ?? 0) >= tournament.entryFeeTickets;
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

      // Test mode should use the same prep-loadout store components as regular Start Game,
      // but without MEWS minimum-balance gatekeeping. If no embedded selection is present,
      // route to the regular-entry store and let the store Start game button re-enter via startGameTest().
      if (
        (this._pendingPrepItemModalResult == null || typeof this._pendingPrepItemModalResult !== 'object') &&
        (typeof showStore === 'function' || (typeof window !== 'undefined' && window.StoreService && typeof window.StoreService.show === 'function'))
      ) {
        try {
          if (testBtn) {
            testBtn.innerHTML = '<span class="btn-icon">⏳</span> Opening loadout...';
          }
          // Re-enable the Test button since the next start action happens inside the store.
          if (testBtn) {
            testBtn.disabled = false;
            if (originalBtnText) testBtn.innerHTML = originalBtnText;
          }

          // Tell the prep-loadout store Start game button to invoke startGameTest().
          this._pendingPrepStartIsTest = true;

          if (typeof showStore === 'function') {
            await showStore('regular-entry');
          } else if (window.StoreService && typeof window.StoreService.show === 'function') {
            await window.StoreService.show('regular-entry');
          }
          return;
        } catch (e) {
          log.error('GAME SERVICE', 'Failed to open prep loadout store for test mode', e);
          // Fall through to legacy internal flow if store cannot open for some reason.
          this._pendingPrepStartIsTest = false;
        }
      }
      
      // Game Pass check - just check if credits exist (don't consume yet)
      // Credit will be consumed after item selection
      let hasCredits = false;
      if (window.GamePassService) {
        try {
          const status = await window.GamePassService.getCreditsAndTickets(walletAddress);
          hasCredits = status.success && (status.credits || 0) > 0;
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

      // Golden-path: persist tournament identity immediately (before Anchor session creation).
      // This prevents later stages (enter/submit-score) from "forgetting" the tournament even if scripts load out of order.
      if (typeof window !== 'undefined' && window.TournamentContext && typeof window.TournamentContext.set === 'function') {
        try {
          window.TournamentContext.set({
            isTournamentMode: true,
            tournamentObjectId: tournamentContext.tournamentObjectId,
            tournamentCategory: tournamentContext.tournamentCategory,
            tournamentName: tournamentContext.tournamentName,
            // Anchor session will be filled in after create-anchor-session returns.
            anchorSessionId: (typeof window.__tournamentAnchorSessionId === 'number' ? window.__tournamentAnchorSessionId : null),
          });
        } catch (_) {}
      }
      
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

      // Create Anchor session for tournament score submission.
      // If the platform isn't initialized with an Anchor registry yet, don't block gameplay/ticket consumption;
      // score submission can surface a clearer error (or be fixed by initializing Anchor) later.
      if (walletAddress && typeof walletAddress === 'string' && walletAddress.startsWith('0x')) {
        const API_BASE = window.GameApi ? window.GameApi.getBaseUrl() : (window.GAME_CONFIG?.GAME_BACKEND_URL || window.GAME_CONFIG?.API_BASE_URL || (typeof window !== 'undefined' && window.location.origin ? new URL(window.location.origin).origin + '/api' : ''));
        const createSessionUrl = API_BASE ? `${API_BASE.replace(/\/api\/?$/, '')}/api/tournaments/create-anchor-session` : '';
        if (!createSessionUrl) {
          this.enableStartGameButton();
          const tournamentModal = document.getElementById('tournamentModal');
          if (tournamentModal) { tournamentModal.classList.remove('tournament-modal-hidden'); tournamentModal.classList.add('tournament-modal-visible'); }
          throw new Error('Cannot create tournament session: API URL not configured.');
        }
        let sessionData;
        try {
          const res = await fetch(createSessionUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              playerAddress: walletAddress,
              tournamentObjectId: tournamentContext.tournamentObjectId || null,
            }),
          });
          sessionData = await res.json().catch(() => ({}));
        } catch (err) {
          log.error('GAME SERVICE', 'Create Anchor session request failed', err);
          this.enableStartGameButton();
          const tournamentModal = document.getElementById('tournamentModal');
          if (tournamentModal) { tournamentModal.classList.remove('tournament-modal-hidden'); tournamentModal.classList.add('tournament-modal-visible'); }
          throw new Error('Failed to create tournament session. Please try again.');
        }
        // Anchor session IDs are u64 counters and can legitimately start at 0.
        if (!sessionData.success || typeof sessionData.sessionId !== 'number' || sessionData.sessionId < 0) {
          const msg = sessionData.error || sessionData.message || 'Session creation failed or returned invalid session ID.';
          log.warn('GAME SERVICE', 'Create Anchor session failed or invalid response', { response: sessionData });
          const msgLower = String(msg || '').toLowerCase();
          const isAnchorRegistryMissing =
            msgLower.includes('anchor registry not found');
          if (!isAnchorRegistryMissing) {
            this.enableStartGameButton();
            const tournamentModal = document.getElementById('tournamentModal');
            if (tournamentModal) { tournamentModal.classList.remove('tournament-modal-hidden'); tournamentModal.classList.add('tournament-modal-visible'); }
            throw new Error(msg);
          }
          // Continue without an anchorSessionId.
          this._anchorSessionId = null;
          if (this._gameState) this._gameState.anchorSessionId = null;
          if (typeof window !== 'undefined' && window.gameState) window.gameState.anchorSessionId = null;
          if (typeof window !== 'undefined' && window.game) window.game.anchorSessionId = null;
          if (typeof window !== 'undefined') {
            window.__tournamentAnchorSessionId = null;
            if (window.TournamentContext && typeof window.TournamentContext.set === 'function') {
              window.TournamentContext.set({
                isTournamentMode: true,
                tournamentObjectId: tournamentContext.tournamentObjectId,
                tournamentCategory: tournamentContext.tournamentCategory,
                tournamentName: tournamentContext.tournamentName,
                anchorSessionId: null,
              });
            }
          }
          log.warn('GAME SERVICE', 'Continuing without Anchor session (registry missing for app)', { message: msg });
        } else {
          const sid = sessionData.sessionId;
          this._anchorSessionId = sid;
          if (this._gameState) this._gameState.anchorSessionId = sid;
          if (typeof window !== 'undefined' && window.gameState) window.gameState.anchorSessionId = sid;
          if (typeof window !== 'undefined' && window.game) window.game.anchorSessionId = sid;
          if (typeof window !== 'undefined') {
            window.__tournamentAnchorSessionId = sid;
            if (window.TournamentContext && typeof window.TournamentContext.set === 'function') {
              window.TournamentContext.set({
                isTournamentMode: true,
                tournamentObjectId: tournamentContext.tournamentObjectId,
                tournamentCategory: tournamentContext.tournamentCategory,
                tournamentName: tournamentContext.tournamentName,
                anchorSessionId: sid,
              });
            }
          }
          log.info('GAME SERVICE', 'Anchor session created for tournament', { sessionId: sid });
        }
      }
    } else {
      // Clear tournament mode state for regular games
      if (this._gameState) {
        this._gameState.isTournamentMode = false;
        this._gameState.tournamentObjectId = null;
        this._gameState.tournamentCategory = null;
        this._gameState.tournamentName = null;
        this._gameState.anchorSessionId = null;
      }
      this._anchorSessionId = null;
      if (this._uiGameState) {
        this._uiGameState.isTournamentMode = false;
        this._uiGameState.tournamentObjectId = null;
        this._uiGameState.tournamentCategory = null;
        this._uiGameState.tournamentName = null;
        this._uiGameState.anchorSessionId = null;
      }
      if (typeof gameState !== 'undefined') {
        gameState.isTournamentMode = false;
        gameState.tournamentObjectId = null;
        gameState.tournamentCategory = null;
        gameState.tournamentName = null;
        gameState.anchorSessionId = null;
      }
      if (typeof window !== 'undefined' && window.game) {
        window.game.isTournamentMode = false;
        window.game.tournamentObjectId = null;
        window.game.tournamentCategory = null;
        window.game.tournamentName = null;
        window.game.anchorSessionId = null;
      }
      if (typeof window !== 'undefined') {
        window.__tournamentAnchorSessionId = null;
        if (window.TournamentContext && typeof window.TournamentContext.clear === 'function') {
          window.TournamentContext.clear();
        }
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
      const prepItemResult =
        this._pendingPrepItemModalResult != null && typeof this._pendingPrepItemModalResult === 'object'
          ? this._pendingPrepItemModalResult
          : null;

      if (!prepItemResult) {
        // Update loading message - keep loading screen visible while inventory loads
        if (typeof updateLoadingModalMessage === 'function') {
          updateLoadingModalMessage('Loading inventory... Please wait', 'gameStartLoadingModal');
        }

        // Ensure loading modal is still visible (in case it was hidden)
        if (typeof showLoadingModal === 'function') {
          showLoadingModal('Loading inventory... Please wait', 'gameStartLoadingModal');
        }
      }

      log.info('GAME SERVICE', 'Checking for item consumption modal', {
        hasShowItemConsumptionModal: typeof showItemConsumptionModal === 'function',
        isTournamentMode: isTournamentMode,
        hasTournamentContext: !!tournamentContext,
        hasPrepEmbeddedSelection: !!prepItemResult,
      });

      /** @type {{ confirmed: boolean; items?: Record<string, number> } | null} */
      let itemSelectionResult = null;

      if (prepItemResult) {
        this._pendingPrepItemModalResult = null;
        itemSelectionResult = prepItemResult;
        log.info('GAME SERVICE', 'Using embedded prep loadout item selection (no consumption modal)');
        if (typeof hideLoadingModal === 'function') {
          hideLoadingModal('gameStartLoadingModal');
        }
        if (itemSelectionResult.confirmed && typeof game !== 'undefined' && game) {
          const items = itemSelectionResult.items && typeof itemSelectionResult.items === 'object' ? itemSelectionResult.items : {};
          game.selectedItems = items;
          game.checkedOutItems = items;
          if (typeof ConsumableSystem !== 'undefined' && ConsumableSystem.initializeConsumables) {
            ConsumableSystem.initializeConsumables();
          }
        }
      } else if (typeof showItemConsumptionModal === 'function') {
        console.log('📦 [ITEM SELECTION] Item consumption modal available - Showing modal', {
          timestamp: new Date().toISOString(),
        });
        log.info('GAME SERVICE', '✅ Item consumption modal available - Showing modal (loading screen will stay visible during inventory load)');

        const modalStartTime = performance.now();
        itemSelectionResult = await showItemConsumptionModal({ isTournamentMode });
        const modalTime = performance.now() - modalStartTime;

        console.log('📦 [ITEM SELECTION] Modal returned', {
          hasResult: !!itemSelectionResult,
          confirmed: itemSelectionResult?.confirmed,
          hasItems: !!itemSelectionResult?.items,
          items: itemSelectionResult?.items,
          modalTime: `${modalTime.toFixed(2)}ms`,
          timestamp: new Date().toISOString(),
        });
        log.info('GAME SERVICE', 'Item consumption modal returned', {
          hasResult: !!itemSelectionResult,
          confirmed: itemSelectionResult?.confirmed,
          hasItems: !!itemSelectionResult?.items,
          modalTime: `${modalTime.toFixed(2)}ms`,
        });
      }

      if (itemSelectionResult) {
        if (!itemSelectionResult.confirmed) {
          console.log('❌ [ITEM SELECTION] User cancelled item selection', {
            timestamp: new Date().toISOString(),
            isTournamentMode: isTournamentMode,
          });
          log.debug('GAME SERVICE', 'Item consumption cancelled');
          if (isTournamentMode) {
            log.info('GAME SERVICE', 'Returning to tournament menu after cancel');
            this.enableStartGameButton();
            if (typeof showTournaments === 'function') {
              showTournaments();
            } else if (typeof window.showTournaments === 'function') {
              window.showTournaments();
            }
          } else {
            this.enableStartGameButton();
          }
          return;
        }

        console.log('✅ [ITEM SELECTION] Item selection confirmed', {
          items: itemSelectionResult.items,
          timestamp: new Date().toISOString(),
        });
        log.debug('GAME SERVICE', 'Item consumption confirmed', itemSelectionResult.items);

        const applied = await this._applyConsumptionsAfterItemSelection({
          isTournamentMode,
          tournamentContext,
          walletAddress,
          hasCredits,
          itemModalResult: itemSelectionResult,
          requireAnchorSession: false,
        });
        if (!applied.ok) {
          if (isTournamentMode) {
            if (typeof showTournaments === 'function') {
              showTournaments();
            } else if (typeof window.showTournaments === 'function') {
              window.showTournaments();
            }
          }
          return;
        }
        const isDemoMode = applied.isDemoMode;

        if (this._gameState) {
          this._gameState.isDemoMode = isDemoMode;
        }
        if (this._uiGameState) {
          this._uiGameState.isDemoMode = isDemoMode;
        }
        if (typeof gameState !== 'undefined') {
          gameState.isDemoMode = isDemoMode;
        }

        if (typeof updateLoadingModalMessage === 'function') {
          updateLoadingModalMessage('Initializing game... Please wait', 'gameStartLoadingModal');
        }
        if (prepItemResult && typeof showLoadingModal === 'function') {
          showLoadingModal('Initializing game... Please wait', 'gameStartLoadingModal');
        }
      } else {
        // No item modal: same consumption router (tournament requires Anchor session; credit uses empty item list).
        const appliedNoModal = await this._applyConsumptionsAfterItemSelection({
          isTournamentMode,
          tournamentContext,
          walletAddress,
          hasCredits,
          itemModalResult: null,
          requireAnchorSession: true,
        });
        if (!appliedNoModal.ok) {
          if (isTournamentMode) {
            if (typeof showTournaments === 'function') {
              showTournaments();
            } else if (typeof window.showTournaments === 'function') {
              window.showTournaments();
            }
          }
          return;
        }
        const isDemoMode = appliedNoModal.isDemoMode;

        if (this._gameState) {
          this._gameState.isDemoMode = isDemoMode;
        }
        if (this._uiGameState) {
          this._uiGameState.isDemoMode = isDemoMode;
        }
        if (typeof gameState !== 'undefined') {
          gameState.isDemoMode = isDemoMode;
        }

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
        throw new Error('Game could not start: game scripts may not have loaded. Please refresh the page and try again.');
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
          throw new Error('Game state not available. Please refresh the page and try again.');
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
      
      // After prep / item selection: stop all music, then start gameplay (only if background music enabled).
      try {
        if (typeof window !== 'undefined' && typeof window.stopAllMusic === 'function') {
          window.stopAllMusic();
        } else if (typeof stopBackgroundMusic === 'function') {
          stopBackgroundMusic();
        }
      } catch (_) {}
      if (typeof startGameplayMusic === 'function' && typeof gameSettings !== 'undefined' && gameSettings.backgroundMusic) {
        startGameplayMusic();
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
      // Re-enable start button so user can try again
      this.enableStartGameButton();
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
              MenuService.show({ afterGame: true });
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
            MenuService.show({ afterGame: true });
          } finally {
            MenuService._calledFromCloseGame = false;
          }
        } else if (typeof showMainMenu === 'function') {
          showMainMenu({ afterGame: true });
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
    if (!ready) {
      log.debug('GAME SERVICE', 'Game not fully ready, but buttons enabled for demo mode', {
        dataLoaded: Boolean(window.GameDataState && window.GameDataState.dataLoaded),
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
          const status = await window.GamePassService.getCreditsAndTickets(walletAddress);
          hasCredits = status.success && (status.credits || 0) > 0;
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

