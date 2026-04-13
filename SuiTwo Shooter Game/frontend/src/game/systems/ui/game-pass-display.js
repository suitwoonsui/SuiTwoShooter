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
  // State
  _initialized: false,
  _currentCredits: 0,
  _currentTickets: 0,
  _hasPass: false,
  _isActive: false,

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
    this._hasPass = false;
    this._isActive = false;
    this._initialized = true;
    log.debug('GAME PASS DISPLAY', 'Initialized');
  },

  /**
   * Update credit and ticket display in main menu
   * @param {number} credits - Number of credits remaining
   * @param {number} tickets - Number of tickets remaining
   * @param {boolean} hasPass - Whether player has an active pass
   * @param {boolean} isActive - Whether pass is active
   */
  updateMainMenuDisplay(credits, tickets, hasPass, isActive) {
    this._currentCredits = credits || 0;
    this._currentTickets = tickets || 0;
    this._hasPass = hasPass || false;
    this._isActive = isActive || false;

    const creditsDisplayElement = document.getElementById('gamePassCreditsDisplay');
    const creditsValueElement = document.getElementById('gamePassCreditsValue');
    const ticketsDisplayElement = document.getElementById('gamePassTicketsDisplay');
    const ticketsValueElement = document.getElementById('gamePassTicketsValue');

    if (!creditsDisplayElement || !creditsValueElement || !ticketsDisplayElement || !ticketsValueElement) {
      log.debug('GAME PASS DISPLAY', 'Display elements not found (menu may not be loaded yet)');
      return;
    }

    if (this._hasPass && this._isActive) {
      // Show credits display if player has credits
      if (this._currentCredits > 0) {
        creditsDisplayElement.style.display = 'block';
        creditsValueElement.textContent = this._currentCredits.toLocaleString();
      } else {
        creditsDisplayElement.style.display = 'none';
      }
      
      // Show tickets display if player has tickets
      // Note: We show tickets even if count is 0, so players can see their ticket status
      if (this._hasPass && this._isActive) {
        ticketsDisplayElement.style.display = 'block';
        ticketsValueElement.textContent = this._currentTickets.toLocaleString();
      } else {
        ticketsDisplayElement.style.display = 'none';
      }
      
      log.debug('GAME PASS DISPLAY', 'Updated main menu display', {
        credits: this._currentCredits,
        tickets: this._currentTickets,
        hasPass: this._hasPass,
        isActive: this._isActive,
      });
    } else {
      // Hide both displays
      creditsDisplayElement.style.display = 'none';
      ticketsDisplayElement.style.display = 'none';
      log.debug('GAME PASS DISPLAY', 'Hiding main menu display (no active pass)');
    }
  },

  /**
   * Update credit and ticket display in store
   * @param {number} credits - Number of credits remaining
   * @param {number} tickets - Number of tickets remaining
   * @param {boolean} hasPass - Whether player has an active pass
   * @param {boolean} isActive - Whether pass is active
   */
  updateStoreDisplay(credits, tickets, hasPass, isActive) {
    this._currentCredits = credits || 0;
    this._currentTickets = tickets || 0;
    this._hasPass = hasPass || false;
    this._isActive = isActive || false;

    const displayElement = document.getElementById('storeGamePassCreditsDisplay');
    const valueElement = document.getElementById('storeGamePassCreditsValue');

    if (!displayElement || !valueElement) {
      log.debug('GAME PASS DISPLAY', 'Store display elements not found (store may not be loaded yet)');
      return;
    }

    if (this._hasPass && this._isActive && this._currentCredits > 0) {
      // Show display
      displayElement.style.display = 'block';
      valueElement.textContent = this._currentCredits.toLocaleString();
      log.debug('GAME PASS DISPLAY', 'Updated store display', {
        credits: this._currentCredits,
        tickets: this._currentTickets,
        hasPass: this._hasPass,
        isActive: this._isActive,
      });
    } else {
      // Hide display
      displayElement.style.display = 'none';
      log.debug('GAME PASS DISPLAY', 'Hiding store display (no active pass)');
    }
    
    // Note: Tickets are displayed within the tab content itself, not in a separate header element
    // The tab content will be refreshed when the tab is re-rendered
  },

  /**
   * Refresh credit display from API
   * @param {string} playerAddress - Player's wallet address
   * @param {boolean} updateMainMenu - Whether to update main menu display
   * @param {boolean} updateStore - Whether to update store display
   */
  async refresh(playerAddress, updateMainMenu = true, updateStore = true) {
    if (!playerAddress) {
      log.warn('GAME PASS DISPLAY', 'No player address provided for refresh');
      return;
    }

    if (!window.GamePassService) {
      log.error('GAME PASS DISPLAY', 'GamePassService not available');
      return;
    }

    try {
      const status = await window.GamePassService.getGamePassStatus(playerAddress, true); // Force refresh

      if (status.success) {
        if (updateMainMenu) {
          this.updateMainMenuDisplay(
            status.gamesRemaining || 0,
            status.ticketCount || 0,
            status.hasPass || false,
            status.isActive || false
          );
        }

        if (updateStore) {
          this.updateStoreDisplay(
            status.gamesRemaining || 0,
            status.ticketCount || 0,
            status.hasPass || false,
            status.isActive || false
          );
        }

        log.debug('GAME PASS DISPLAY', 'Refreshed display', {
          credits: status.gamesRemaining || 0,
          hasPass: status.hasPass || false,
          isActive: status.isActive || false,
        });
        
        // Update start game button text based on credits
        if (updateMainMenu && typeof GameService !== 'undefined' && GameService.updateStartButtonText) {
          const hasCredits = status.hasPass && status.isActive && (status.gamesRemaining || 0) > 0;
          GameService.updateStartButtonText(hasCredits).catch(err => {
            log.warn('GAME PASS DISPLAY', 'Failed to update button text', err);
          });
        }
      } else {
        log.warn('GAME PASS DISPLAY', 'Failed to refresh display', status.error);
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
   * Get current pass status (cached values)
   */
  getStatus() {
    return {
      credits: this._currentCredits,
      tickets: this._currentTickets,
      hasPass: this._hasPass,
      isActive: this._isActive,
    };
  },

  /**
   * Clear all displays (called when wallet disconnects or changes)
   */
  clear() {
    this._currentCredits = 0;
    this._currentTickets = 0;
    this._hasPass = false;
    this._isActive = false;

    // Clear main menu display
    const creditsDisplayElement = document.getElementById('gamePassCreditsDisplay');
    const creditsValueElement = document.getElementById('gamePassCreditsValue');
    const ticketsDisplayElement = document.getElementById('gamePassTicketsDisplay');
    const ticketsValueElement = document.getElementById('gamePassTicketsValue');

    if (creditsDisplayElement) {
      creditsDisplayElement.style.display = 'none';
    }
    if (creditsValueElement) {
      creditsValueElement.textContent = '0';
    }
    if (ticketsDisplayElement) {
      ticketsDisplayElement.style.display = 'none';
    }
    if (ticketsValueElement) {
      ticketsValueElement.textContent = '0';
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
      storeValueElement.textContent = '0';
    }

    log.debug('GAME PASS DISPLAY', 'Cleared all displays');
  },
};

// Export to window for global access
if (typeof window !== 'undefined') {
  window.GamePassDisplay = GamePassDisplay;
}

