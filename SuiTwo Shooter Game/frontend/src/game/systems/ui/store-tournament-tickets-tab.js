// ==========================================
// STORE TOURNAMENT TICKETS TAB - Tournament Ticket Purchase Tab
// ==========================================
// Handles Tournament Tickets tab content in store modal

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

// Ticket bundle definitions
const TICKET_BUNDLES = [
  { quantity: 1, name: 'Single Ticket', price: 1.00, description: 'One tournament entry' },
  { quantity: 6, name: '6 Tickets', price: 5.00, description: 'Great for regular players' },
  { quantity: 12, name: '12 Tickets', price: 10.00, description: 'Best value for dedicated players' },
  { quantity: 25, name: '25 Tickets', price: 20.00, description: 'Maximum value for power players' },
];

const StoreTournamentTicketsTab = {
  /**
   * Render Tournament Tickets tab content
   * @param {string} walletAddress - Player's wallet address
   * @param {string} paymentToken - Payment token ('mews', 'sui', 'usdc')
   * @param {number} badgeDiscount - Badge discount percentage (0-25)
   * @param {Object} gamePassStatus - Current game pass status
   */
  async render(walletAddress, paymentToken, badgeDiscount = 0, gamePassStatus = null) {
    console.log('🎫 [STORE TOURNAMENT TICKETS TAB] Rendering tournament tickets tab', {
      walletAddress,
      paymentToken,
      badgeDiscount,
      hasGamePassStatus: !!gamePassStatus,
      ticketCount: gamePassStatus?.ticketCount || 0,
    });
    
    const container = document.getElementById('storeTournamentTicketsTabContent');
    if (!container) {
      console.error('❌ [STORE TOURNAMENT TICKETS TAB] Tab content container not found');
      return;
    }
    console.log('✅ [STORE TOURNAMENT TICKETS TAB] Container found');

    // Get prices from state (already loaded when store items were fetched)
    // Only fetch if prices are missing or stale (>5 minutes old)
    let freshPrices = null;
    const PRICE_CACHE_MAX_AGE = 5 * 60 * 1000; // 5 minutes
    
    // Check if we have cached prices
    if (typeof getStoreState === 'function') {
      const state = getStoreState();
      if (state.tokenPrices) {
        // Check if prices have a timestamp and if they're still fresh
        if (state.tokenPricesTimestamp && 
            (Date.now() - state.tokenPricesTimestamp) < PRICE_CACHE_MAX_AGE) {
          freshPrices = state.tokenPrices;
          console.log('✅ [STORE TOURNAMENT TICKETS TAB] Using cached prices from state');
        } else if (!state.tokenPricesTimestamp) {
          // Prices exist but no timestamp - assume they're fresh (from recent loadStoreItems)
          freshPrices = state.tokenPrices;
          console.log('✅ [STORE TOURNAMENT TICKETS TAB] Using prices from state (no timestamp)');
        }
      }
    }
    
    // Also check StoreService state
    if (!freshPrices && typeof StoreService !== 'undefined' && StoreService._state) {
      if (StoreService._state.tokenPrices) {
        if (StoreService._state.tokenPricesTimestamp && 
            (Date.now() - StoreService._state.tokenPricesTimestamp) < PRICE_CACHE_MAX_AGE) {
          freshPrices = StoreService._state.tokenPrices;
          console.log('✅ [STORE TOURNAMENT TICKETS TAB] Using cached prices from StoreService');
        } else if (!StoreService._state.tokenPricesTimestamp) {
          freshPrices = StoreService._state.tokenPrices;
          console.log('✅ [STORE TOURNAMENT TICKETS TAB] Using prices from StoreService (no timestamp)');
        }
      }
    }
    
    // Only fetch if prices are missing or stale
    if (!freshPrices) {
      try {
        const API_BASE_URL = window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3000/api';
        const response = await fetch(`${API_BASE_URL}/store/items`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.prices) {
            freshPrices = data.prices;
            const timestamp = Date.now();
            // Update cached prices in state with timestamp
            if (typeof getStoreState === 'function') {
              const state = getStoreState();
              state.tokenPrices = freshPrices;
              state.tokenPricesTimestamp = timestamp;
            }
            if (typeof StoreService !== 'undefined' && StoreService._state) {
              StoreService._state.tokenPrices = freshPrices;
              StoreService._state.tokenPricesTimestamp = timestamp;
            }
            console.log('✅ [STORE TOURNAMENT TICKETS TAB] Fetched fresh prices from backend', freshPrices);
          }
        }
      } catch (error) {
        console.warn('⚠️ [STORE TOURNAMENT TICKETS TAB] Failed to fetch fresh prices, using cached', error);
      }
    }

    // Get current credits and tickets
    const currentCredits = gamePassStatus?.gamesRemaining || 0;
    const currentTickets = gamePassStatus?.ticketCount || 0;

    // Calculate prices with discount
    const bundlesHTML = TICKET_BUNDLES.map(bundle => {
      // Apply bundle discount first (built into bundle price)
      const bundleDiscountedPrice = bundle.price;
      
      // Then apply badge discount
      const finalPrice = bundleDiscountedPrice * (1 - badgeDiscount / 100);
      const originalPrice = bundle.price;
      
      // Format USD price (show original and discounted if discount applies)
      let usdPriceHTML = '';
      if (badgeDiscount > 0) {
        const originalUsd = typeof formatUsdPrice === 'function' ? formatUsdPrice(originalPrice) : `$${originalPrice.toFixed(2)}`;
        const discountedUsd = typeof formatUsdPrice === 'function' ? formatUsdPrice(finalPrice) : `$${finalPrice.toFixed(2)}`;
        usdPriceHTML = `<span style="text-decoration: line-through; opacity: 0.6;">${originalUsd}</span> <span style="color: #39ff14;">${discountedUsd}</span>`;
      } else {
        usdPriceHTML = typeof formatUsdPrice === 'function' ? formatUsdPrice(originalPrice) : `$${originalPrice.toFixed(2)}`;
      }
      
      // Use discounted price for token conversion
      const usdPrice = finalPrice;
      
      // Convert USD to token price
      // Use fresh prices if available, otherwise fall back to cached prices
      let tokenPriceDisplay = '';
      const tokenSymbol = paymentToken === 'sui' ? 'SUI' : (paymentToken === 'usdc' ? 'USDC' : '$MEWS');
      
      if (typeof convertUsdToToken === 'function') {
        // Pass fresh prices to ensure accuracy
        const tokenConversion = convertUsdToToken(usdPrice, paymentToken, freshPrices);
        tokenPriceDisplay = tokenConversion.formatted;
      } else {
        tokenPriceDisplay = 'N/A';
      }
      
      return `
        <div class="game-pass-pack-card">
          <div class="pack-header">
            <h3>${bundle.name}</h3>
            <div class="pack-games">${bundle.quantity} Tickets</div>
          </div>
          <div class="pack-description">${bundle.description}</div>
          <div class="pack-pricing">
            <div class="price-usd">${usdPriceHTML}</div>
            <div class="price-token">${tokenPriceDisplay} ${tokenSymbol}</div>
            ${badgeDiscount > 0 ? `<div class="badge-discount-badge" style="font-size: 0.75rem; color: #39ff14; margin-top: 0.25rem;">🎖️ ${badgeDiscount}% off</div>` : ''}
          </div>
          <button class="menu-btn primary pack-purchase-btn" 
                  onclick="StoreTournamentTicketsTab.purchaseTickets(event, ${bundle.quantity}, '${paymentToken}', ${badgeDiscount}); return false;">
            <span class="btn-icon">🎫</span> Purchase
          </button>
        </div>
      `;
    }).join('');

    const html = `
      <div class="game-pass-tab-content">
        <div class="game-pass-status">
          <div class="game-pass-status-line">
            <span class="game-pass-status-label">Credits:</span>
            <span class="game-pass-status-value">${currentCredits.toLocaleString()}</span>
          </div>
          <div class="game-pass-status-line">
            <span class="game-pass-status-label">Tickets:</span>
            <span class="game-pass-status-value">${currentTickets.toLocaleString()}</span>
          </div>
        </div>
        
        <div class="game-pass-section">
          <h3>🎫 Tournament Tickets</h3>
          <p style="margin-bottom: 20px; color: #aaa; font-size: 0.9em;">
            Purchase tickets to enter tournaments. Tickets are stored in your Game Pass and can be used to enter any active tournament.
          </p>
          <div class="game-pass-packs-grid">
            ${bundlesHTML}
          </div>
        </div>
      </div>
    `;
    
    console.log('🎫 [STORE TOURNAMENT TICKETS TAB] Setting container HTML', {
      containerExists: !!container,
      bundlesCount: TICKET_BUNDLES.length,
      htmlLength: html.length,
    });
    
    container.innerHTML = html;
    
    console.log('✅ [STORE TOURNAMENT TICKETS TAB] Tournament tickets tab rendered successfully');
  },

  /**
   * Purchase tournament tickets
   */
  async purchaseTickets(event, quantity, paymentToken, badgeDiscount) {
    let walletAddress = null;
    if (typeof getWalletAddress === 'function') {
      walletAddress = getWalletAddress();
    } else if (window.walletAPIInstance && window.walletAPIInstance.isConnected()) {
      walletAddress = window.walletAPIInstance.getAddress();
    }
    if (!walletAddress) {
      alert('Please connect your wallet first.');
      return;
    }

    if (!window.GamePassService) {
      alert('Game Pass service not available.');
      return;
    }

    try {
      // Show loading - find button from the clicked element
      const btn = (event && event.target) 
        ? event.target.closest('.pack-purchase-btn')
        : document.querySelector(`.pack-purchase-btn[onclick*="purchaseTickets(${quantity}"]`);
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="btn-icon">⏳</span> Processing...';
      }

      // Build purchase transaction
      const result = await window.GamePassService.purchaseTickets(
        walletAddress,
        quantity,
        paymentToken.toUpperCase(),
        badgeDiscount
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to build purchase transaction');
      }

      // Sign and execute transaction
      if (!window.walletAPIInstance || !window.walletAPIInstance.isConnected()) {
        throw new Error('Wallet not connected');
      }

      const executeResult = await window.walletAPIInstance.signAndExecuteTransaction(result.transaction);

      if (executeResult.success) {
        alert(`✅ Purchase successful! You now have ${quantity} tournament ticket${quantity > 1 ? 's' : ''}.`);
        
        // Refresh game pass status (main menu and store)
        if (window.GamePassDisplay) {
          await window.GamePassDisplay.refresh(walletAddress, true, true);
        }
        
        // Update store buttons after purchase
        if (typeof updateStoreButtons === 'function') {
          let context = 'main-menu';
          if (typeof getStoreState === 'function') {
            const state = getStoreState();
            context = state.context || 'main-menu';
          }
          updateStoreButtons('tickets', context);
        }
        
        // Refresh the tab to show updated ticket count
        // Get current payment token and badge discount
        let currentPaymentToken = paymentToken;
        let currentBadgeDiscount = badgeDiscount;
        
        // Get payment token from state
        if (typeof getStoreState === 'function') {
          const state = getStoreState();
          currentPaymentToken = state.paymentToken || 'mews';
        }
        
        // Get badge discount
        if (window.BadgeService) {
          try {
            const badge = await window.BadgeService.getBadge(walletAddress);
            if (badge && badge.success && badge.hasBadge && badge.badge) {
              if (typeof window.BadgeService.getDiscountsForTier === 'function') {
                const discounts = window.BadgeService.getDiscountsForTier(badge.badge.tier);
                currentBadgeDiscount = discounts.gameplay || 0; // Tickets use gameplay discount
              }
            }
          } catch (error) {
            log.warn('STORE TOURNAMENT TICKETS TAB', 'Failed to get badge discount', error);
          }
        }
        
        // Get updated game pass status
        const status = await window.GamePassService.getGamePassStatus(walletAddress, true);
        
        // Update cached game pass status so tab switches use fresh data
        if (status.success) {
          if (!window._preloadedGamePassStatus) {
            window._preloadedGamePassStatus = {};
          }
          window._preloadedGamePassStatus[walletAddress] = status;
        }
        
        // Re-render tab
        await this.render(walletAddress, currentPaymentToken, currentBadgeDiscount, status);
      } else {
        throw new Error(executeResult.error || 'Transaction failed');
      }
    } catch (error) {
      log.error('STORE TOURNAMENT TICKETS TAB', 'Error purchasing tickets', error);
      alert(`❌ Purchase failed: ${error.message || 'Unknown error'}`);
      
      // Reset button
      const btn = (event && event.target) 
        ? event.target.closest('.pack-purchase-btn')
        : document.querySelector(`.pack-purchase-btn[onclick*="purchaseTickets(${quantity}"]`);
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<span class="btn-icon">🎫</span> Purchase';
      }
    }
  },
};

// Export to window for global access
if (typeof window !== 'undefined') {
  window.StoreTournamentTicketsTab = StoreTournamentTicketsTab;
  console.log('✅ [STORE TOURNAMENT TICKETS TAB] Tournament tickets tab module loaded');
}

