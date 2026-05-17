// ==========================================
// GAME PASS DISPLAY - Credit Display Component
// ==========================================
// Handles displaying game pass credits in the main menu and store

// Use FrontendLogger if available, fallback to console
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

const GamePassDisplay = {
  // State: game uses only credit count and ticket count
  _initialized: false,
  _currentCredits: 0,
  _currentTickets: 0,

  /**
   * Initialize the display component
   */
  init() {
    if (this._initialized) {
      log.warn('GAME PASS DISPLAY', 'Already initialized');
      return;
    }
    this._currentCredits = 0;
    this._currentTickets = 0;
    this._initialized = true;

    // If wallet was restored and game pass was prefetched before this module initialized, show balances
    // instead of wiping the menu to "--" (GameService.init can run in the same menu-script batch as this file).
    let appliedFromCache = false;
    try {
      const addr =
        (window.walletAPIInstance &&
          window.walletAPIInstance.isConnected &&
          window.walletAPIInstance.isConnected() &&
          typeof window.walletAPIInstance.getAddress === 'function' &&
          window.walletAPIInstance.getAddress()) ||
        (typeof window.getWalletAddress === 'function' && window.getWalletAddress()) ||
        null;
      const cached = addr && window._preloadedGamePassStatus ? window._preloadedGamePassStatus[addr] : null;
      if (cached && cached.success) {
        const c = cached.gamesRemaining ?? cached.credits ?? 0;
        const t = cached.ticketCount ?? 0;
        this.updateMainMenuDisplay(c, t);
        appliedFromCache = true;
      }
    } catch (_) {}

    if (!appliedFromCache) {
      const creditsEl = document.getElementById('gamePassCreditsValue');
      const ticketsEl = document.getElementById('gamePassTicketsValue');
      if (creditsEl) creditsEl.textContent = '--';
      if (ticketsEl) ticketsEl.textContent = '--';
    }
    log.debug('GAME PASS DISPLAY', 'Initialized', { appliedFromCache });
  },

  /**
   * Update credit and ticket display in main menu
   * @param {number} credits - Credit count
   * @param {number} tickets - Ticket count
   */
  updateMainMenuDisplay(credits, tickets) {
    const hasCredits = credits != null && credits !== '';
    const hasTickets = tickets != null && tickets !== '';
    this._currentCredits = hasCredits ? Number(credits) : 0;
    this._currentTickets = hasTickets ? Number(tickets) : 0;

    const creditsDisplayElement = document.getElementById('gamePassCreditsDisplay');
    const creditsValueElement = document.getElementById('gamePassCreditsValue');
    const ticketsDisplayElement = document.getElementById('gamePassTicketsDisplay');
    const ticketsValueElement = document.getElementById('gamePassTicketsValue');

    if (!creditsDisplayElement || !creditsValueElement || !ticketsDisplayElement || !ticketsValueElement) {
      log.debug('GAME PASS DISPLAY', 'Display elements not found (menu may not be loaded yet)');
      return;
    }
    creditsValueElement.textContent = hasCredits ? this._currentCredits.toLocaleString() : '--';
    ticketsValueElement.textContent = hasTickets ? this._currentTickets.toLocaleString() : '--';
    log.debug('GAME PASS DISPLAY', 'Updated main menu display', { credits: this._currentCredits, tickets: this._currentTickets });
  },

  /**
   * Update credit and ticket display in store
   * @param {number} credits - Credit count
   * @param {number} tickets - Ticket count
   */
  updateStoreDisplay(credits, tickets) {
    this._currentCredits = credits ?? 0;
    this._currentTickets = tickets ?? 0;

    const displayElement = document.getElementById('storeGamePassCreditsDisplay');
    const valueElement = document.getElementById('storeGamePassCreditsValue');

    if (!displayElement || !valueElement) {
      log.debug('GAME PASS DISPLAY', 'Store display elements not found (store may not be loaded yet)');
      return;
    }
    displayElement.style.display = 'block';
    valueElement.textContent = this._currentCredits.toLocaleString();
    log.debug('GAME PASS DISPLAY', 'Updated store display', { credits: this._currentCredits, tickets: this._currentTickets });
  },

  /**
   * Refresh credit display from API
   * @param {string} playerAddress - Player's wallet address
   * @param {boolean} updateMainMenu - Whether to update main menu display
   * @param {boolean} updateStore - Whether to update store display
   * @param {boolean} useCache - If true, use 30s cache when available (faster when returning to menu)
   */
  async refresh(playerAddress, updateMainMenu = true, updateStore = true, useCache = false) {
    if (!playerAddress) {
      log.warn('GAME PASS DISPLAY', 'No player address provided for refresh');
      return;
    }

    if (!window.GamePassService) {
      log.error('GAME PASS DISPLAY', 'GamePassService not available');
      return;
    }

    try {
      const result = await window.GamePassService.getCreditsAndTickets(playerAddress, !useCache);

      if (result.success) {
        const credits = result.credits ?? 0;
        const tickets = result.ticketCount ?? 0;
        log.info('TICKET-FLOW', 'GamePassDisplay.refresh: updating UI', { credits, tickets, playerAddress: playerAddress?.slice(0, 10) + '...' });
        if (updateMainMenu) this.updateMainMenuDisplay(credits, tickets);
        if (updateStore) this.updateStoreDisplay(credits, tickets);
        log.debug('GAME PASS DISPLAY', 'Refreshed display', { credits, tickets });
        if (updateMainMenu && typeof GameService !== 'undefined' && GameService.updateStartButtonText) {
          GameService.updateStartButtonText(credits > 0).catch(err => {
            log.warn('GAME PASS DISPLAY', 'Failed to update button text', err);
          });
        }
      } else {
        log.warn('GAME PASS DISPLAY', 'Failed to refresh display', result.error);
        // Update button text to show "Start Demo" if refresh failed
        if (updateMainMenu && typeof GameService !== 'undefined' && GameService.updateStartButtonText) {
          GameService.updateStartButtonText(false).catch(err => {
            log.warn('GAME PASS DISPLAY', 'Failed to update button text', err);
          });
        }
      }
    } catch (error) {
      log.error('GAME PASS DISPLAY', 'Error refreshing display', error);
      // Update button text to show "Start Demo" on error
      if (updateMainMenu && typeof GameService !== 'undefined' && GameService.updateStartButtonText) {
        GameService.updateStartButtonText(false).catch(err => {
          log.warn('GAME PASS DISPLAY', 'Failed to update button text', err);
        });
      }
    }
  },

  /**
   * Get current credits (cached value)
   */
  getCurrentCredits() {
    return this._currentCredits;
  },

  /**
   * Get current credit and ticket counts (cached values)
   */
  getStatus() {
    return { credits: this._currentCredits, tickets: this._currentTickets };
  },

  /**
   * Clear all displays (called when wallet disconnects or changes)
   */
  clear() {
    this._currentCredits = 0;
    this._currentTickets = 0;

    // Clear main menu display (show "--" when no wallet, consistent with best score / games played)
    const creditsDisplayElement = document.getElementById('gamePassCreditsDisplay');
    const creditsValueElement = document.getElementById('gamePassCreditsValue');
    const ticketsDisplayElement = document.getElementById('gamePassTicketsDisplay');
    const ticketsValueElement = document.getElementById('gamePassTicketsValue');

    if (creditsValueElement) {
      creditsValueElement.textContent = '--';
    }
    if (ticketsValueElement) {
      ticketsValueElement.textContent = '--';
    }

    // Update button text to show "Start Demo" when credits are cleared
    if (typeof GameService !== 'undefined' && GameService.updateStartButtonText) {
      GameService.updateStartButtonText(false).catch(err => {
        log.warn('GAME PASS DISPLAY', 'Failed to update button text on clear', err);
      });
    }

    // Clear store display
    const storeDisplayElement = document.getElementById('storeGamePassCreditsDisplay');
    const storeValueElement = document.getElementById('storeGamePassCreditsValue');

    if (storeDisplayElement) {
      storeDisplayElement.style.display = 'none';
    }
    if (storeValueElement) {
      storeValueElement.textContent = '--';
    }

    log.debug('GAME PASS DISPLAY', 'Cleared all displays');
  },
};

// Export to window for global access
if (typeof window !== 'undefined') {
  window.GamePassDisplay = GamePassDisplay;
}

