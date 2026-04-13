// ==========================================
// WALLET SERVICE - Wallet Connection and UI Management
// ==========================================
// Handles wallet connection, disconnection, UI updates, and game readiness.
// Delegates data loading to the refactored GameDataFlowService + wallet flow handlers.

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

const WalletService = {
  // State
  _initialized: false,
  _initializePromise: null,
  _isConnecting: false,
  _isDisconnecting: false,
  _minTokenBalanceFormatted: null, // Cached formatted minimum balance for display
  _configInFlight: null,
  _minReqInFlight: null,
  _pendingWalletFlowEvent: null,
  
  // Dependencies (accessed via window/global scope)
  _gameDataFlow: null,
  _gameState: null,
  
  /**
   * Initialize the wallet service (internal state setup)
   */
  init() {
    if (this._initialized) {
      log.warn('WALLET SERVICE', 'Already initialized');
      return;
    }
    
    // Set up dependencies (may not be available immediately)
    this._gameDataFlow = (typeof window !== 'undefined' && window.GameDataFlowService) ? window.GameDataFlowService : null;
    this._gameState = typeof uiGameState !== 'undefined' ? uiGameState : null;
    
    this._initialized = true;
    log.debug('WALLET SERVICE', 'Initialized');
    
    // Fetch and update minimum requirement text on initialization
    this.updateMinimumRequirementText();
  },

  /**
   * Best-effort: run the refactored wallet flow even if scripts load out of order.
   * @param {{ type: 'connected' | 'disconnected', address?: string | null }} event
   * @returns {Promise<void>}
   */
  async _runWalletFlow(event) {
    const type = event?.type;
    const address = typeof event?.address === 'string' ? event.address : null;

    // Wait briefly for flow handlers to be registered by game-data-flow-wallet.js.
    const start = Date.now();
    const maxWaitMs = 5_000;
    while (
      (typeof window === 'undefined' ||
        typeof window.onWalletConnected !== 'function' ||
        typeof window.onWalletDisconnected !== 'function') &&
      Date.now() - start < maxWaitMs
    ) {
      await new Promise((r) => setTimeout(r, 50));
    }

    const hasHandlers =
      typeof window !== 'undefined' &&
      typeof window.onWalletConnected === 'function' &&
      typeof window.onWalletDisconnected === 'function';

    if (hasHandlers) {
      if (type === 'connected' && address) {
        await window.onWalletConnected(address);
      } else if (type === 'disconnected') {
        window.onWalletDisconnected();
      }
      return;
    }

    // Fallback (should be rare): at least trigger the core load path so stats/gamepass/badge populate.
    // This avoids a broken UX if wallet events fire before flow scripts are ready.
    const flow = (typeof window !== 'undefined' && window.GameDataFlowService)
      ? window.GameDataFlowService
      : undefined;
    if (type === 'connected' && address && flow && typeof flow.load === 'function') {
      try {
        await flow.load(address, { checkBadgeUpgrade: true });
      } catch (e) {
        log.error('WALLET SERVICE', 'Fallback load failed', e);
      }
    }
  },
  
  /**
   * Fetch minimum token balance from API and update the UI text
   * @returns {Promise<void>}
   */
  async updateMinimumRequirementText() {
    if (this._minReqInFlight) return this._minReqInFlight;
    this._minReqInFlight = (async () => {
    try {
      const API_BASE_URL = window.GameApi ? window.GameApi.getBaseUrl() : (window.GAME_CONFIG?.GAME_BACKEND_URL || window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3001/api');
      
      log.debug('WALLET SERVICE', 'Fetching min token balance from API', { API_BASE_URL });

      const ttlMs =
        (typeof window.GAME_CONFIG_BOOTSTRAP_TTL_MS === 'number' && window.GAME_CONFIG_BOOTSTRAP_TTL_MS > 0
          ? window.GAME_CONFIG_BOOTSTRAP_TTL_MS
          : 30 * 60 * 1000);
      const pref = typeof window !== 'undefined' ? window.__prefetchedGameConfig : null;
      let result = null;
      if (
        pref &&
        pref.at &&
        pref.response &&
        pref.response.success === true &&
        pref.response.config &&
        Date.now() - pref.at < ttlMs
      ) {
        result = pref.response;
        log.debug('WALLET SERVICE', 'Using menu bootstrap game-config prefetch for min balance');
      }

      // If bootstrap is in-flight, prefer it over a separate /game-config fetch.
      if (!result && typeof window !== 'undefined' && window.__menuBootstrapPromise) {
        try {
          // Wait longer here to avoid a redundant /game-config call (bootstrap already fetches it).
          const bootstrapState = await Promise.race([
            window.__menuBootstrapPromise,
            new Promise((resolve) => setTimeout(() => resolve(null), 10_000)),
          ]);
          const data = bootstrapState && bootstrapState.data ? bootstrapState.data : bootstrapState;
          const gc = data && data.gameConfig && data.gameConfig.success === true ? data.gameConfig : null;
          if (gc && gc.config) {
            result = gc;
            log.debug('WALLET SERVICE', 'Using in-flight menu bootstrap for min balance');
          }
        } catch (_) {
          /* ignore */
        }
      }

      if (!result) {
        const response = await fetch(`${API_BASE_URL}/game-config?source=wallet_min_req`);
        if (!response.ok) {
          this._minTokenBalanceFormatted = null;
          const minimumNoticeFetch = document.getElementById('minimumNoticeText');
          if (minimumNoticeFetch) minimumNoticeFetch.textContent = '';
          log.debug('WALLET SERVICE', 'game-config fetch failed — treat as no min threshold', {
            status: response.status,
          });
          return;
        }
        result = await response.json();
      }
      log.debug('WALLET SERVICE', 'Game config API response', { 
        success: result.success, 
        hasMinTokenBalance: !!result.config?.minTokenBalance,
        minTokenBalance: result.config?.minTokenBalance 
      });
      
      if (result.success && result.config?.minTokenBalance != null && result.config.minTokenBalance !== '') {
        const minBalanceRaw = BigInt(result.config.minTokenBalance);
        if (minBalanceRaw <= BigInt(0)) {
          this._minTokenBalanceFormatted = null;
          const minimumNoticeTextZero = document.getElementById('minimumNoticeText');
          if (minimumNoticeTextZero) minimumNoticeTextZero.textContent = '';
          log.debug('WALLET SERVICE', 'minTokenBalance is zero — no minimum notice');
          return;
        }
        
        // The minTokenBalance is stored on-chain with 6 decimals (mainnet style)
        // regardless of network, as per the admin panel which converts to raw with 6 decimals
        // See: apps/shooter-game/backend/app/admin/tabs/GameConfigTab.tsx (mewsToRaw function)
        const decimals = 6; // Always use 6 decimals for minTokenBalance (stored value format)
        const divisor = Math.pow(10, decimals);
        
        // Format for display
        const minBalanceInMEWS = Number(minBalanceRaw) / divisor;
        let formatted;
        if (minBalanceInMEWS >= 1000000) {
          formatted = `${(minBalanceInMEWS / 1000000).toFixed(1)}M`;
        } else if (minBalanceInMEWS >= 1000) {
          formatted = `${(minBalanceInMEWS / 1000).toFixed(1)}K`;
        } else {
          formatted = minBalanceInMEWS.toLocaleString('en-US', { maximumFractionDigits: 0 });
        }
        
        this._minTokenBalanceFormatted = formatted;
        
        // Update the UI text
        const minimumNoticeText = document.getElementById('minimumNoticeText');
        if (minimumNoticeText) {
          minimumNoticeText.textContent = `Min: ${formatted} Mews Required`;
        }
        
        log.debug('WALLET SERVICE', 'Updated minimum requirement text', { 
          formatted, 
          raw: minBalanceRaw.toString(), 
          decimals,
          minBalanceInMEWS,
          calculation: `${minBalanceRaw.toString()} / ${divisor} = ${minBalanceInMEWS}`
        });
      } else {
        this._minTokenBalanceFormatted = null;
        const minimumNoticeTextNone = document.getElementById('minimumNoticeText');
        if (minimumNoticeTextNone) minimumNoticeTextNone.textContent = '';
        log.debug('WALLET SERVICE', 'No minTokenBalance in game-config — no minimum notice');
      }
    } catch (error) {
      log.debug('WALLET SERVICE', 'game-config unavailable for min display — no minimum notice', {
        message: error.message,
      });
      this._minTokenBalanceFormatted = null;
      const minimumNoticeText = document.getElementById('minimumNoticeText');
      if (minimumNoticeText) {
        minimumNoticeText.textContent = '';
      }
    }
    })().finally(() => {
      this._minReqInFlight = null;
    });
    return this._minReqInFlight;
  },
  
  /**
   * Initialize wallet integration (WalletAPI setup and event listeners)
   * This is the main initialization function that sets up the wallet connection
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this._initializePromise) return this._initializePromise;
    this._initializePromise = (async () => {
    log.debug('WALLET SERVICE', 'Initializing wallet integration');
    
    // Wait a bit for React and WalletAPI to load
    // Optimized: 500ms → 200ms (wallet connection is usually faster)
    await new Promise(resolve => setTimeout(resolve, 200));

    // The wallet module is loaded via a separate <script> tag.
    // In dev, it may finish loading slightly after this initialize() runs.
    if (typeof window.WalletAPI === 'undefined') {
      const start = Date.now();
      const maxWaitMs = 25_000;
      while (typeof window.WalletAPI === 'undefined' && Date.now() - start < maxWaitMs) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    if (typeof window.WalletAPI === 'undefined') {
      log.warn('WALLET SERVICE', 'WalletAPI not loaded');
      const walletStatusText = document.getElementById('walletStatusText');
      if (walletStatusText) {
        walletStatusText.innerHTML = '<span class="wallet-icon">⚠️</span><span>Wallet API not loaded</span>';
      }
      return;
    }
    
    try {
      // Get network from backend config (should match backend network).
      // MUST be explicit; WalletAPI.initialize does not default.
      let network = null;
      
      try {
        // Try to fetch network from backend API
        const API_BASE_URL = window.GameApi ? window.GameApi.getBaseUrl() : (window.GAME_CONFIG?.GAME_BACKEND_URL || window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3001/api');
        if (!this._configInFlight) {
          this._configInFlight = fetch(`${API_BASE_URL}/config?source=wallet_init`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)
            .finally(() => {
              this._configInFlight = null;
            });
        }
        const config = await this._configInFlight;
        if (config && config.network) {
          network = config.network;
          log.debug('WALLET SERVICE', `Using network from backend: ${network}`);
        }
      } catch (error) {
        log.warn('WALLET SERVICE', 'Could not fetch network from backend', { error: error?.message || String(error) });
      }
      
      // If backend config fetch failed, fall back to explicit testnet for local dev.
      if (network !== 'mainnet' && network !== 'testnet') {
        network = 'testnet';
        log.warn('WALLET SERVICE', `Falling back to explicit network: ${network}`);
      }

      // Store resolved network for the rest of the frontend (balance checks, store, etc.).
      this._network = network;

      // Do not set RPC overrides here. Prefer defaults / wallet module config.

      const api = await window.WalletAPI.initialize({ network });
      
      // Store globally for easy access
      window.walletAPIInstance = api;
      
      log.debug('WALLET SERVICE', 'Wallet API initialized');
      
      // Track last processed wallet event to prevent duplicates
      let lastWalletEvent = null;
      let lastWalletEventTime = 0;
      const WALLET_EVENT_DEBOUNCE_MS = 500; // Ignore duplicate events within 500ms
      
      // Listen for wallet changes
      api.on(async (event) => {
        log.debug('WALLET SERVICE', 'Wallet event', event);
        
        // Deduplicate events - check if this is a duplicate of the last event
        const eventKey = `${event.type}_${event.address || 'null'}`;
        const now = Date.now();
        const timeSinceLastEvent = now - lastWalletEventTime;
        
        if (lastWalletEvent === eventKey && timeSinceLastEvent < WALLET_EVENT_DEBOUNCE_MS) {
          log.debug('WALLET SERVICE', `Duplicate wallet event detected (${timeSinceLastEvent}ms ago) - skipping`, event);
          return; // Skip duplicate event
        }
        
        // Record this event
        lastWalletEvent = eventKey;
        lastWalletEventTime = now;
        log.debug('WALLET SERVICE', 'Processing wallet event', event);
        
        // Use refactored wallet flow handlers; if they aren't ready yet, wait briefly and fall back.
        if (event.type === 'connected' && event.address) {
          void this._runWalletFlow({ type: 'connected', address: event.address });
        } else if (event.type === 'disconnected') {
          void this._runWalletFlow({ type: 'disconnected', address: null });
          if (typeof disableStartGameButton === 'function') {
            disableStartGameButton();
          }
          this.updateBalanceUI(null, false);
          this.updateWalletRequirementsUI(false, false);
          const walletStatusText = document.getElementById('walletStatusText');
          if (walletStatusText) {
            walletStatusText.innerHTML = '<span class="wallet-icon">🔒</span><span>Connect Sui wallet to play</span>';
          }
          if (typeof updateMenuStats === 'function') {
            updateMenuStats().catch(err => log.warn('WALLET SERVICE', 'Failed to update menu stats', err));
          }
          // Clear game pass display (credits and tickets) when wallet disconnects
          if (window.GamePassDisplay && typeof window.GamePassDisplay.clear === 'function') {
            window.GamePassDisplay.clear();
            log.debug('WALLET SERVICE', 'Cleared game pass display (event handler)');
          }
          const testBtn = document.getElementById('startGameTestBtn');
          if (testBtn) {
            testBtn.disabled = true;
            testBtn.style.opacity = '0.5';
            testBtn.style.cursor = 'not-allowed';
          }
        }
      });
      
      // Check if wallet is already connected (ignore zero address so we don't call APIs before real login)
      const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000000000000000000000000000';
      const isConnected = api.isConnected();
      const address = isConnected ? api.getAddress() : null;
      const hasRealAddress = address && address !== ZERO_ADDRESS && address.toLowerCase() !== ZERO_ADDRESS;
      if (isConnected && hasRealAddress) {
        this.updateWalletUI(address);
        // Single load path: onWalletConnected resets state, prefetches game pass, runs GameDataFlowService.load.
        // Avoid checkMEWSBalanceAndUpdateUI here — it duplicated a full load (same as load) on every cold start.
        await this._runWalletFlow({ type: 'connected', address });
        // Test button will be enabled by updateGameReadiness() after data loads
      } else {
        // Show requirements when wallet not connected (or connected with zero address)
        this.updateWalletUI(null);
        this.updateWalletRequirementsUI(false, false);
        if (typeof disableStartGameButton === 'function') {
          disableStartGameButton();
        }
        // Disable test button too if wallet not connected
        const testBtn = document.getElementById('startGameTestBtn');
        if (testBtn) {
          testBtn.disabled = true;
          testBtn.style.opacity = '0.5';
          testBtn.style.cursor = 'not-allowed';
        }
        // Show available wallets
        const wallets = api.getWallets();
        log.debug('WALLET SERVICE', 'Available wallets', wallets);
        if (wallets.length === 0) {
          const walletStatusText = document.getElementById('walletStatusText');
          if (walletStatusText) {
            walletStatusText.innerHTML = '<span class="wallet-icon">⚠️</span><span>Install a Sui wallet extension (Slush, Sui Wallet, Surf, Suiet, Ethos, OKX, Phantom, Klever, Trust, Coinbase, or any Sui-compatible wallet)</span>';
          }
        }
      }
    } catch (error) {
      log.error('WALLET SERVICE', 'Failed to initialize wallet API', error);
      const walletStatusText = document.getElementById('walletStatusText');
      if (walletStatusText) {
        walletStatusText.innerHTML = '<span class="wallet-icon">⚠️</span><span>Wallet initialization failed</span>';
      }
    }
    })().finally(() => {
      this._initializePromise = null;
    });
    return this._initializePromise;
  },
  
  /**
   * Connect wallet
   * @returns {Promise<{success: boolean, address?: string, error?: string}>}
   */
  async connect() {
    if (this._isConnecting) {
      log.debug('WALLET SERVICE', 'Connection already in progress');
      return { success: false, error: 'Connection already in progress' };
    }
    
    log.debug('WALLET SERVICE', 'Connecting wallet');

    // Disable immediately to prevent rapid double-clicks while we wait for the wallet module.
    this._isConnecting = true;
    this._updateConnectButtonState('connecting');
    
    // Menu can render before the wallet module finishes loading + initializing.
    // If user clicks quickly, wait briefly instead of failing immediately.
    if (typeof window.WalletAPI === 'undefined' || !window.walletAPIInstance) {
      const start = Date.now();
      const maxWaitMs = 25_000;
      while ((typeof window.WalletAPI === 'undefined' || !window.walletAPIInstance) && Date.now() - start < maxWaitMs) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Validate WalletAPI available after wait
    if (typeof window.WalletAPI === 'undefined' || !window.walletAPIInstance) {
      const error = 'Wallet API not initialized. Please refresh the page.';
      log.error('WALLET SERVICE', 'Error', error);
      alert(error);
      this._isConnecting = false;
      this._updateConnectButtonState('idle');
      return { success: false, error };
    }
    
    try {
      const result = await window.walletAPIInstance.connect();
      
      if (result.success) {
        log.debug('WALLET SERVICE', 'Wallet connected', result.address);
        
        // Update UI immediately (don't wait for event)
        this.updateWalletUI(result.address);

        // Also trigger the load flow immediately as a backstop.
        // Some wallets/events can be delayed or swallowed; we still want stats/gamepass/badge to load.
        if (result.address) {
          await this._runWalletFlow({ type: 'connected', address: result.address });
        }
        
        // Note: Don't call checkMEWSBalanceAndUpdateUI here - the wallet event listener
        // will handle it when the 'connected' event fires. This prevents duplicate calls.
        // Test button will be enabled by updateGameReadiness() after data loads
        
        return { success: true, address: result.address };
      } else {
        log.error('WALLET SERVICE', 'Wallet connection failed', result.error);
        this.updateWalletUI(null);
        if (typeof disableStartGameButton === 'function') {
          disableStartGameButton();
        }
        return { success: false, error: result.error };
      }
    } catch (error) {
      log.error('WALLET SERVICE', 'Error connecting wallet', error);
      this.updateWalletUI(null);
      if (typeof disableStartGameButton === 'function') {
        disableStartGameButton();
      }
      return { success: false, error: error.message };
    } finally {
      this._isConnecting = false;
      this._updateConnectButtonState('idle');
    }
  },
  
  /**
   * Disconnect wallet
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async disconnect() {
    if (this._isDisconnecting) {
      log.debug('WALLET SERVICE', 'Disconnection already in progress');
      return { success: false, error: 'Disconnection already in progress' };
    }
    
    log.debug('WALLET SERVICE', 'Disconnecting wallet');
    
    if (typeof window.WalletAPI === 'undefined' || !window.walletAPIInstance) {
      return { success: false, error: 'Wallet API not initialized' };
    }
    
    this._isDisconnecting = true;
    
    try {
      const result = await window.walletAPIInstance.disconnect();
      
      if (result.success) {
        log.debug('WALLET SERVICE', 'Wallet disconnected');
        
        // Clear badge cache
        if (window.BadgeService && typeof window.BadgeService.clearBadgeCache === 'function') {
          window.BadgeService.clearBadgeCache();
          log.debug('WALLET SERVICE', 'Cleared badge cache');
        }
        
        // Clear API request cache (all entries)
        if (window.apiRequestCache && typeof window.apiRequestCache.clear === 'function') {
          window.apiRequestCache.clear();
          log.debug('WALLET SERVICE', 'Cleared API request cache');
        }
        
        // Clear badge display
        const badgeDisplay = document.getElementById('menuBadgeDisplay');
        if (badgeDisplay) {
          badgeDisplay.style.display = 'none';
          badgeDisplay.innerHTML = '';
        }
        
        // Update UI
        this.updateWalletUI(null);
        
        // Disable start button
        if (typeof disableStartGameButton === 'function') {
          disableStartGameButton();
        }
        
        // Clear menu stats
        if (typeof updateMenuStats === 'function') {
          updateMenuStats().catch(err => log.warn('WALLET SERVICE', 'Failed to update menu stats', err));
        }
        
        // Clear game pass display (credits and tickets)
        if (window.GamePassDisplay && typeof window.GamePassDisplay.clear === 'function') {
          window.GamePassDisplay.clear();
          log.debug('WALLET SERVICE', 'Cleared game pass display');
        }
        
        // Handle via GameDataFlow if available
        if (this._gameDataFlow && this._gameDataFlow.onWalletDisconnected) {
          this._gameDataFlow.onWalletDisconnected();
        }
        
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('❌ [WALLET SERVICE] Error disconnecting wallet:', error);
      return { success: false, error: error.message };
    } finally {
      this._isDisconnecting = false;
    }
  },
  
  /**
   * Update wallet UI based on connection state
   * @param {string|null} address - Wallet address or null if disconnected
   */
  updateWalletUI(address) {
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
      // Hide balance - only show address in compact view
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
  },
  
  /**
   * Update balance UI display
   * @param {number|null} balance - Balance amount or null
   * @param {boolean} hasMinimum - Whether balance meets minimum requirement
   */
  updateBalanceUI(balance, hasMinimum) {
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
        balanceElement.textContent = `${balance} MEWS`;
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
  },
  
  /**
   * Update wallet requirements UI (simplified - no tooltip)
   * @param {boolean} walletConnected - Whether wallet is connected
   * @param {boolean} hasMinimumBalance - Whether balance meets minimum
   */
  updateWalletRequirementsUI(walletConnected, hasMinimumBalance) {
    // Minimum notice visibility is handled by updateBalanceUI
    // This function is kept for backward compatibility
  },
  
  /**
   * Check MEWS balance and update UI
   * NOTE: This function is now a wrapper around the refactored data-flow load path.
   * All new code should use `GameDataFlowService.load()` (via the wallet flow handlers) directly.
   * @param {string} address - Wallet address
   * @returns {Promise<void>}
   */
  async checkMEWSBalanceAndUpdateUI(address) {
    if (!window.walletAPIInstance) {
      console.warn('⚠️ [WALLET SERVICE] Wallet API not available');
      if (typeof disableStartGameButton === 'function') {
        disableStartGameButton();
      }
      return;
    }
    
    // Use the refactored flow controller. `GameDataFlow` used to be a legacy delegation shim;
    // prefer `GameDataFlowService` directly so wallet init doesn't depend on legacy scripts.
    const flow = (typeof window !== 'undefined' && window.GameDataFlowService)
      ? window.GameDataFlowService
      : (typeof window !== 'undefined' ? window.GameDataFlow : undefined);
    if (!flow || typeof flow.load !== 'function') {
      console.error('❌ [WALLET SERVICE] GameDataFlowService not available - wallet init cannot load data yet');
      if (typeof disableStartGameButton === 'function') {
        disableStartGameButton();
      }
      return;
    }
    
    console.log('✅ [WALLET SERVICE] Using NEW REFACTORED SYSTEM (GameDataFlowService) for balance check');
    try {
      await flow.load(address);
      
      // Update game readiness state from GameDataState
      if (typeof GameDataState !== 'undefined') {
        const readiness = GameDataState.getReadinessState();
        if (typeof gameReadinessState !== 'undefined') {
          gameReadinessState.dataLoaded = readiness.dataLoaded;
        }
      }
      
      // Update game readiness UI
      if (typeof updateGameReadiness === 'function') {
        updateGameReadiness();
      }
    } catch (error) {
      console.error('❌ [WALLET SERVICE] Error loading game data:', error);
      if (typeof disableStartGameButton === 'function') {
        disableStartGameButton();
      }
    }
  },
  
  /**
   * Load and display badge in main menu (if player has one)
   * @param {string} walletAddress - Player's wallet address
   * @returns {Promise<void>}
   */
  async loadMenuBadgeDisplay(walletAddress) {
    // Use the refactored flow controller. Avoid relying on legacy delegation shims.
    const flow = (typeof window !== 'undefined' && window.GameDataFlowService)
      ? window.GameDataFlowService
      : (typeof window !== 'undefined' ? window.GameDataFlow : undefined);
    if (!flow || typeof flow.load !== 'function') {
      console.error('❌ [WALLET SERVICE] GameDataFlowService not available - cannot load badge yet');
      return;
    }

    console.log('✅ [WALLET SERVICE] Using NEW REFACTORED SYSTEM (GameDataFlowService) for badge load');
    try {
      await flow.load(walletAddress, { skipBalance: true });

      // Update game readiness state from GameDataState
      if (typeof GameDataState !== 'undefined') {
        const readiness = GameDataState.getReadinessState();
        if (typeof gameReadinessState !== 'undefined') {
          gameReadinessState.dataLoaded = readiness.dataLoaded;
        }
      }
      
      // Update game readiness UI
      if (typeof updateGameReadiness === 'function') {
        updateGameReadiness();
      }
    } catch (error) {
      console.error('❌ [WALLET SERVICE] Error loading badge:', error);
    }
  },
  
  /**
   * Private: Update connect button state
   * @param {string} state - 'connecting' | 'idle'
   * @private
   */
  _updateConnectButtonState(state) {
    const connectBtn = document.getElementById('connectWalletBtn');
    const connectBtnText = document.getElementById('connectWalletBtnText');
    
    if (connectBtn) {
      if (state === 'connecting') {
        connectBtn.disabled = true;
        if (connectBtnText) connectBtnText.textContent = 'Connecting...';
      } else {
        connectBtn.disabled = false;
        if (connectBtnText) connectBtnText.textContent = 'Connect Wallet';
      }
    }
  },
  
  /**
   * Get current wallet address
   * @returns {string|null}
   */
  getAddress() {
    if (window.walletAPIInstance && window.walletAPIInstance.isConnected()) {
      return window.walletAPIInstance.getAddress();
    }
    return null;
  },
  
  /**
   * Check if wallet is connected
   * @returns {boolean}
   */
  isConnected() {
    return window.walletAPIInstance?.isConnected() || false;
  }
};

// Initialize on load
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      WalletService.init();
    });
  } else {
    WalletService.init();
  }
  
  // Expose globally for debugging and integration
  window.WalletService = WalletService;
  
  // Add debug function to check WalletService status
  window.checkWalletService = function() {
    console.log('🔍 [WALLET SERVICE DEBUG] ========== WALLET SERVICE STATUS ==========');
    console.log('WalletService available:', typeof WalletService !== 'undefined');
    if (typeof WalletService !== 'undefined') {
      console.log('WalletService initialized:', WalletService._initialized);
      console.log('Wallet connected:', WalletService.isConnected());
      console.log('Wallet address:', WalletService.getAddress());
      console.log('GameDataFlow available:', WalletService._gameDataFlow !== null);
      console.log('GameState available:', WalletService._gameState !== null);
    }
    console.log('walletAPIInstance available:', !!window.walletAPIInstance);
    console.log('========================================================');
    return typeof WalletService !== 'undefined';
  };
}

console.log('✅ [WALLET SERVICE] WalletService module ready');
console.log('💡 [WALLET SERVICE] Use checkWalletService() in console to verify WalletService is loaded');

