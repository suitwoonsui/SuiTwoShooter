// ==========================================
// WALLET SERVICE - Wallet Connection and UI Management
// ==========================================
// Handles wallet connection, disconnection, UI updates, and game readiness
// Delegates data loading to GameDataFlow

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
  _isConnecting: false,
  _isDisconnecting: false,
  
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
    this._gameDataFlow = typeof GameDataFlow !== 'undefined' ? GameDataFlow : null;
    this._gameState = typeof uiGameState !== 'undefined' ? uiGameState : null;
    
    this._initialized = true;
    log.debug('WALLET SERVICE', 'Initialized');
  },
  
  /**
   * Initialize wallet integration (WalletAPI setup and event listeners)
   * This is the main initialization function that sets up the wallet connection
   * @returns {Promise<void>}
   */
  async initialize() {
    log.debug('WALLET SERVICE', 'Initializing wallet integration');
    
    // Wait a bit for React and WalletAPI to load
    // Optimized: 500ms → 200ms (wallet connection is usually faster)
    await new Promise(resolve => setTimeout(resolve, 200));
    
    if (typeof WalletAPI === 'undefined') {
      log.warn('WALLET SERVICE', 'WalletAPI not loaded');
      const walletStatusText = document.getElementById('walletStatusText');
      if (walletStatusText) {
        walletStatusText.innerHTML = '<span class="wallet-icon">⚠️</span><span>Wallet API not loaded</span>';
      }
      return;
    }
    
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
            log.debug('WALLET SERVICE', `Using network from backend: ${network}`);
          }
        }
      } catch (error) {
        log.warn('WALLET SERVICE', 'Could not fetch network from backend, using default', network);
      }
      
      const api = await WalletAPI.initialize({ network });
      
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
        
        // Use new flow controller for wallet events
        if (typeof GameDataFlow !== 'undefined') {
          log.debug('WALLET SERVICE', 'Using NEW REFACTORED SYSTEM (GameDataFlow) for wallet event');
          if (event.type === 'connected' && event.address) {
            GameDataFlow.onWalletConnected(event.address);
            // Update menu stats from blockchain when wallet connects
            if (typeof updateMenuStats === 'function') {
              updateMenuStats().catch(err => log.warn('WALLET SERVICE', 'Failed to update menu stats', err));
            }
          } else if (event.type === 'disconnected') {
            GameDataFlow.onWalletDisconnected();
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
        } else {
          log.error('WALLET SERVICE', 'GameDataFlow not available - this should not happen');
        }
      });
      
      // Check if wallet is already connected
      if (api.isConnected()) {
        const address = api.getAddress();
        this.updateWalletUI(address);
        // Check balance for already connected wallet (don't enable button until check completes)
        await this.checkMEWSBalanceAndUpdateUI(address);
        // Update menu stats from blockchain for already connected wallet
        if (typeof updateMenuStats === 'function') {
          updateMenuStats().catch(err => console.warn('⚠️ [WALLET SERVICE] Failed to update menu stats:', err));
        }
        // Test button will be enabled by updateGameReadiness() after data loads
      } else {
        // Show requirements when wallet not connected
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
    
    // Validate WalletAPI available
    if (typeof WalletAPI === 'undefined' || !window.walletAPIInstance) {
      const error = 'Wallet API not initialized. Please refresh the page.';
      log.error('WALLET SERVICE', 'Error', error);
      alert(error);
      return { success: false, error };
    }
    
    this._isConnecting = true;
    
    // Update button state
    this._updateConnectButtonState('connecting');
    
    try {
      const result = await window.walletAPIInstance.connect();
      
      if (result.success) {
        log.debug('WALLET SERVICE', 'Wallet connected', result.address);
        
        // Update UI immediately (don't wait for event)
        this.updateWalletUI(result.address);
        
        // Note: Don't call checkMEWSBalanceAndUpdateUI here - the wallet event listener
        // will handle it when the 'connected' event fires. This prevents duplicate calls.
        // The event listener will:
        // 1. Call GameDataFlow.onWalletConnected(event.address)
        // 2. Call updateMenuStats()
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
    
    if (typeof WalletAPI === 'undefined' || !window.walletAPIInstance) {
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
   * @param {boolean} hasMinimum - Whether balance meets minimum requirement (500K MEWS)
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
   * NOTE: This function is now a wrapper around GameDataFlow.load() for backward compatibility
   * All new code should use GameDataFlow.load() directly
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
    
    // Use new flow controller - GameDataFlow is required
    if (typeof GameDataFlow === 'undefined' || !GameDataFlow.load) {
      console.error('❌ [WALLET SERVICE] GameDataFlow not available - this should not happen');
      if (typeof disableStartGameButton === 'function') {
        disableStartGameButton();
      }
      return;
    }
    
    console.log('✅ [WALLET SERVICE] Using NEW REFACTORED SYSTEM (GameDataFlow) for balance check');
    try {
      await GameDataFlow.load(address);
      
      // Update game readiness state from GameDataState
      if (typeof GameDataState !== 'undefined') {
        const readiness = GameDataState.getReadinessState();
        if (typeof gameReadinessState !== 'undefined') {
          gameReadinessState.dataLoaded = readiness.dataLoaded;
          gameReadinessState.migrationCheckComplete = readiness.migrationCheckComplete;
          gameReadinessState.migrationModalClosed = readiness.migrationModalClosed;
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
    // Use new flow controller - GameDataFlow is required
    if (typeof GameDataFlow === 'undefined' || !GameDataFlow.load) {
      console.error('❌ [WALLET SERVICE] GameDataFlow not available - this should not happen');
      return;
    }

    console.log('✅ [WALLET SERVICE] Using NEW REFACTORED SYSTEM (GameDataFlow) for badge load');
    try {
      await GameDataFlow.load(walletAddress, { skipBalance: true });

      // Update game readiness state from GameDataState
      if (typeof GameDataState !== 'undefined') {
        const readiness = GameDataState.getReadinessState();
        if (typeof gameReadinessState !== 'undefined') {
          gameReadinessState.dataLoaded = readiness.dataLoaded;
          gameReadinessState.migrationCheckComplete = readiness.migrationCheckComplete;
          gameReadinessState.migrationModalClosed = readiness.migrationModalClosed;
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

