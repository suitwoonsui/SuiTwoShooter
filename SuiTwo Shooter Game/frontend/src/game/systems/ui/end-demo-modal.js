// ==========================================
// END DEMO MODAL - Modal shown after first boss defeat
// ==========================================
// Shows paywall and purchase options after demo period ends

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

const EndDemoModal = {
  // State
  _initialized: false,
  _isVisible: false,
  _resolveCallback: null,

  /**
   * Initialize the modal
   */
  init() {
    if (this._initialized) {
      log.warn('END DEMO MODAL', 'Already initialized');
      return;
    }
    
    this._isVisible = false;
    this._resolveCallback = null;
    this._initialized = true;
    log.debug('END DEMO MODAL', 'Initialized');
  },

  /**
   * Show the End Demo modal
   * @param {Object} options - Modal options
   * @param {string} options.playerAddress - Player's wallet address
   * @param {number} options.score - Player's score
   * @param {number} options.bossesDefeated - Number of bosses defeated (should be 1)
   * @param {boolean} options.hasCredits - Whether player has credits (for demo mode with credits case)
   * @returns {Promise<{action: 'purchase' | 'continue' | 'close'}>} - User's action
   */
  async show(options = {}) {
    const { playerAddress, score = 0, bossesDefeated = 1, hasCredits: hasCreditsParam = false } = options;

    if (this._isVisible) {
      log.warn('END DEMO MODAL', 'Modal already visible');
      return { action: 'close' };
    }

    log.info('END DEMO MODAL', 'Showing End Demo modal', {
      playerAddress,
      score,
      bossesDefeated,
    });

    return new Promise(async (resolve) => {
      this._resolveCallback = resolve;

      // Get viewport container
      const viewportContainer = document.querySelector('.viewport-container');
      if (!viewportContainer) {
        log.error('END DEMO MODAL', 'Viewport container not found');
        resolve({ action: 'close' });
        return;
      }

      // Remove existing modal if present
      const existingModal = document.getElementById('endDemoModal');
      if (existingModal) {
        existingModal.remove();
      }

      // Create modal
      const modal = document.createElement('div');
      modal.className = 'end-demo-modal end-demo-modal-hidden';
      modal.setAttribute('id', 'endDemoModal');

      // Get game pass status (force refresh to get latest credits)
      let gamePassStatus = null;
      let hasActivePass = false;
      let hasCredits = false;
      
      if (playerAddress && window.GamePassService) {
        try {
          const status = await window.GamePassService.getCreditsAndTickets(playerAddress, true);
          if (status.success) {
            gamePassStatus = { gamesRemaining: status.credits, ticketCount: status.ticketCount };
            hasCredits = (status.credits || 0) > 0;
            hasActivePass = hasCredits;
          }
        } catch (error) {
          log.warn('END DEMO MODAL', 'Failed to get game pass status', error);
        }
      }
      
      // If hasCreditsParam is true, it means player entered demo mode even though they have credits
      // (consumption failed at game start, fell back to demo mode)
      // In this case, don't show store option - only show Continue and Return to Menu
      // Otherwise, if they have credits now (normal case), show Continue, Buy More, Return to Menu
      // If they don't have credits, show Buy Credits and Return to Menu
      const enteredDemoWithCredits = hasCreditsParam; // Player had credits but consumption failed at start
      const showStoreOption = !enteredDemoWithCredits; // Only show store if NOT the fallback case

      modal.innerHTML = `
        <div class="end-demo-modal-content">
          <div class="end-demo-modal-header">
            <h2>🎮 Demo Complete!</h2>
            <p class="end-demo-subtitle">You've defeated the first boss!</p>
          </div>
          
          <div class="end-demo-modal-body">
            <div class="end-demo-stats">
              <div class="end-demo-stat">
                <span class="end-demo-stat-label">Score:</span>
                <span class="end-demo-stat-value">${score.toLocaleString()}</span>
              </div>
              <div class="end-demo-stat">
                <span class="end-demo-stat-label">Bosses Defeated:</span>
                <span class="end-demo-stat-value">${bossesDefeated}</span>
              </div>
            </div>
            
            <div class="end-demo-message">
              <p>🎉 Great job! You've completed the free demo.</p>
              ${hasCredits
                ? enteredDemoWithCredits
                  ? `<p class="end-demo-has-pass">✅ You have <strong>${gamePassStatus.gamesRemaining}</strong> game credits remaining!</p>
                     <p>Your credit wasn't consumed at game start. Click "Continue Playing" to use a credit and keep playing.</p>`
                  : `<p class="end-demo-has-pass">✅ You have <strong>${gamePassStatus.gamesRemaining}</strong> game credits remaining!</p>
                     <p>Click "Continue Playing" to use a credit and keep playing.</p>`
                : `<p><strong>⚠️ No credits available.</strong></p>
                   <p>To continue playing and save your scores, you need to purchase credits.</p>
                   <p>Choose a credit pack or pay-per-game to unlock the full game!</p>`
              }
            </div>
          </div>
          
          <div class="end-demo-modal-actions">
            ${hasCredits
              ? `<button class="menu-btn primary" onclick="window.EndDemoModal._handleContinue()">
                   <span class="btn-icon">▶️</span> Continue Playing (Use Credit)
                 </button>
                 ${!enteredDemoWithCredits ? `<button class="menu-btn" onclick="window.EndDemoModal._handlePurchase()">
                   <span class="btn-icon">🛒</span> Buy More Credits
                 </button>` : ''}
                 <button class="menu-btn" onclick="window.EndDemoModal._handleClose()">
                   <span class="btn-icon">←</span> Return to Menu
                 </button>`
              : `<button class="menu-btn primary" onclick="window.EndDemoModal._handlePurchase()">
                   <span class="btn-icon">🛒</span> Buy Credits
                 </button>
                 <button class="menu-btn" onclick="window.EndDemoModal._handleClose()">
                   <span class="btn-icon">←</span> Return to Menu
                 </button>`
            }
          </div>
        </div>
      `;

      // Append to viewport container
      viewportContainer.appendChild(modal);

      // Show modal with animation
      setTimeout(() => {
        modal.classList.remove('end-demo-modal-hidden');
        modal.classList.add('end-demo-modal-visible');
        this._isVisible = true;
      }, 10);

      // Setup click-outside handler
      const handleClickOutside = (event) => {
        if (modal.contains(event.target)) {
          return;
        }
        // Don't close on outside click - user must choose an action
      };

      document.addEventListener('click', handleClickOutside);
      modal._clickOutsideHandler = handleClickOutside;
    });
  },

  /**
   * Handle continue action (use credit)
   * @private
   */
  _handleContinue() {
    log.info('END DEMO MODAL', 'Continue action selected');
    this._resolve({ action: 'continue' });
  },

  /**
   * Handle purchase action
   * @private
   */
  _handlePurchase() {
    log.info('END DEMO MODAL', 'Purchase action selected');
    this._resolve({ action: 'purchase' });
  },

  /**
   * Handle close action
   * @private
   */
  _handleClose() {
    log.info('END DEMO MODAL', 'Close action selected');
    this._resolve({ action: 'close' });
  },

  /**
   * Resolve the promise and hide modal
   * @private
   */
  _resolve(result) {
    if (this._resolveCallback) {
      this._resolveCallback(result);
      this._resolveCallback = null;
    }
    this.hide();
  },

  /**
   * Hide the modal
   */
  hide() {
    const modal = document.getElementById('endDemoModal');
    if (modal) {
      // Remove click-outside handler
      if (modal._clickOutsideHandler) {
        document.removeEventListener('click', modal._clickOutsideHandler);
      }

      // Hide with animation
      modal.classList.remove('end-demo-modal-visible');
      modal.classList.add('end-demo-modal-hidden');

      // Remove after animation
      setTimeout(() => {
        if (modal.parentNode) {
          modal.parentNode.removeChild(modal);
        }
      }, 300);
    }

    this._isVisible = false;
    log.debug('END DEMO MODAL', 'Modal hidden');
  },
};

// Export to window for global access
if (typeof window !== 'undefined') {
  window.EndDemoModal = EndDemoModal;
}

