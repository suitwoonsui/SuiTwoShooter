// ==========================================
// STORE GAME PASS TAB - Game Pass Purchase Tab
// ==========================================
// Handles Game Pass tab content in store modal

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

// Pack definitions
// Base price: $0.10 per game
// Discounts scale from 9.1% (Starter) to 15% (Mega)
const PACKS = [
  { type: 1, name: 'Starter', games: 11, price: 1.00, description: '9.1% off - Perfect for trying out the game' },
  { type: 2, name: 'Regular', games: 56, price: 5.00, description: '11% off - Great value for regular players' },
  { type: 3, name: 'Value', games: 115, price: 10.00, description: '13% off - Best value for dedicated players' },
  { type: 4, name: 'Mega', games: 235, price: 20.00, description: '15% off - Maximum value for power players' },
];

const StoreGamePassTab = {
  /**
   * Render Game Pass tab content
   * @param {string} walletAddress - Player's wallet address
   * @param {string} paymentToken - Payment token ('mews', 'sui', 'usdc')
   * @param {number} badgeDiscount - Badge discount percentage (0-25)
   * @param {Object} gamePassStatus - Current game pass status
   */
  async render(walletAddress, paymentToken, badgeDiscount = 0, gamePassStatus = null) {
    const container = document.getElementById('storeGamePassTabContent');
    if (!container) {
      log.error('STORE GAME PASS TAB', 'Tab content container not found');
      return;
    }

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
          log.debug('STORE GAME PASS TAB', 'Using cached prices from state');
        } else if (!state.tokenPricesTimestamp) {
          // Prices exist but no timestamp - assume they're fresh (from recent loadStoreItems)
          freshPrices = state.tokenPrices;
          log.debug('STORE GAME PASS TAB', 'Using prices from state (no timestamp)');
        }
      }
    }
    
    // Also check StoreService state
    if (!freshPrices && typeof StoreService !== 'undefined' && StoreService._state) {
      if (StoreService._state.tokenPrices) {
        if (StoreService._state.tokenPricesTimestamp && 
            (Date.now() - StoreService._state.tokenPricesTimestamp) < PRICE_CACHE_MAX_AGE) {
          freshPrices = StoreService._state.tokenPrices;
          log.debug('STORE GAME PASS TAB', 'Using cached prices from StoreService');
        } else if (!StoreService._state.tokenPricesTimestamp) {
          freshPrices = StoreService._state.tokenPrices;
          log.debug('STORE GAME PASS TAB', 'Using prices from StoreService (no timestamp)');
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
            log.debug('STORE GAME PASS TAB', 'Fetched fresh prices from backend', freshPrices);
          }
        }
      } catch (error) {
        log.warn('STORE GAME PASS TAB', 'Failed to fetch fresh prices, using cached', error);
      }
    }

    // Get current credits and tickets
    const currentCredits = gamePassStatus?.gamesRemaining || 0;
    const currentTickets = gamePassStatus?.ticketCount || 0;
    const hasActivePass = gamePassStatus?.hasPass && gamePassStatus?.isActive;

    // Calculate prices with discount
    const packsHTML = PACKS.map(pack => {
      const originalPrice = pack.price;
      const discountedPrice = originalPrice * (1 - badgeDiscount / 100);
      
      // Format USD price (show original and discounted if discount applies)
      let usdPriceHTML = '';
      if (badgeDiscount > 0) {
        const originalUsd = typeof formatUsdPrice === 'function' ? formatUsdPrice(originalPrice) : `$${originalPrice.toFixed(2)}`;
        const discountedUsd = typeof formatUsdPrice === 'function' ? formatUsdPrice(discountedPrice) : `$${discountedPrice.toFixed(2)}`;
        usdPriceHTML = `<span style="text-decoration: line-through; opacity: 0.6;">${originalUsd}</span> <span style="color: #39ff14;">${discountedUsd}</span>`;
      } else {
        usdPriceHTML = typeof formatUsdPrice === 'function' ? formatUsdPrice(originalPrice) : `$${originalPrice.toFixed(2)}`;
      }
      
      // Use discounted price for token conversion
      const usdPrice = discountedPrice;
      
      // Convert USD to token price
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
            <h3>${pack.name} Pack</h3>
            <div class="pack-games">${pack.games} Games</div>
          </div>
          <div class="pack-description">${pack.description}</div>
          <div class="pack-pricing">
            <div class="price-usd">${usdPriceHTML}</div>
            <div class="price-token">${tokenPriceDisplay} ${tokenSymbol}</div>
            ${badgeDiscount > 0 ? `<div class="badge-discount-badge" style="font-size: 0.75rem; color: #39ff14; margin-top: 0.25rem;">🎖️ ${badgeDiscount}% off</div>` : ''}
          </div>
          <button class="menu-btn primary pack-purchase-btn" 
                  onclick="StoreGamePassTab.purchasePack(${pack.type}, '${paymentToken}', ${badgeDiscount}); return false;">
            <span class="btn-icon">🛒</span> Purchase
          </button>
        </div>
      `;
    }).join('');

    // Calculate Pay Per Game prices
    const singleGamePrice = 0.10;
    const originalSinglePrice = singleGamePrice;
    const discountedSinglePrice = originalSinglePrice * (1 - badgeDiscount / 100);
    
    // Format USD price for single game
    let singleGameUsdHTML = '';
    if (badgeDiscount > 0) {
      const originalUsd = typeof formatUsdPrice === 'function' ? formatUsdPrice(originalSinglePrice) : `$${originalSinglePrice.toFixed(2)}`;
      const discountedUsd = typeof formatUsdPrice === 'function' ? formatUsdPrice(discountedSinglePrice) : `$${discountedSinglePrice.toFixed(2)}`;
      singleGameUsdHTML = `<span style="text-decoration: line-through; opacity: 0.6;">${originalUsd}</span> <span style="color: #39ff14;">${discountedUsd}</span>`;
    } else {
      singleGameUsdHTML = typeof formatUsdPrice === 'function' ? formatUsdPrice(originalSinglePrice) : `$${originalSinglePrice.toFixed(2)}`;
    }
    
    // Convert single game price to token
    const singleGameTokenSymbol = paymentToken === 'sui' ? 'SUI' : (paymentToken === 'usdc' ? 'USDC' : '$MEWS');
    let singleGameTokenPrice = '';
    if (typeof convertUsdToToken === 'function') {
      // Pass fresh prices to ensure accuracy
      const tokenConversion = convertUsdToToken(discountedSinglePrice, paymentToken, freshPrices);
      singleGameTokenPrice = tokenConversion.formatted;
    } else {
      singleGameTokenPrice = 'N/A';
    }

    container.innerHTML = `
      <div class="game-pass-tab-content">
        ${hasActivePass 
          ? `<div class="game-pass-status">
               <div class="game-pass-status-line">
                 <span class="game-pass-status-label">Credits:</span>
                 <span class="game-pass-status-value">${currentCredits.toLocaleString()}</span>
               </div>
               <div class="game-pass-status-line">
                 <span class="game-pass-status-label">Tickets:</span>
                 <span class="game-pass-status-value">${currentTickets.toLocaleString()}</span>
               </div>
             </div>`
          : `<div class="game-pass-status">
               <div class="game-pass-status-label">No Active Pass</div>
               <div class="game-pass-status-value">Purchase a pack to get started!</div>
             </div>`
        }
        
        <div class="game-pass-section">
          <h3>🎮 Credit Packs</h3>
          <div class="game-pass-packs-grid">
            ${packsHTML}
          </div>
        </div>
        
        <div class="game-pass-section">
          <h3>💳 Pay Per Game</h3>
          <div class="pay-per-game-card">
            <div class="pay-per-game-info">
              <div class="pay-per-game-label">Single Game</div>
              <div class="pay-per-game-price">
                <div class="price-usd">${singleGameUsdHTML}</div>
                <div class="price-token">${singleGameTokenPrice} ${singleGameTokenSymbol}</div>
                ${badgeDiscount > 0 ? `<div class="badge-discount-badge" style="font-size: 0.75rem; color: #39ff14; margin-top: 0.25rem;">🎖️ ${badgeDiscount}% off</div>` : ''}
              </div>
              <div class="pay-per-game-description">Play one game without buying a pack</div>
            </div>
            <button class="menu-btn primary" 
                    onclick="StoreGamePassTab.purchaseSingleGame('${paymentToken}', ${badgeDiscount}); return false;">
              <span class="btn-icon">💳</span> Purchase Game
            </button>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Purchase a credit pack
   */
  async purchasePack(packType, paymentToken, badgeDiscount) {
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
      const btn = (typeof event !== 'undefined' && event?.target) 
        ? event.target.closest('.pack-purchase-btn')
        : document.querySelector(`.pack-purchase-btn[onclick*="purchasePack(${packType}"]`);
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="btn-icon">⏳</span> Processing...';
      }

      // Build purchase transaction
      const result = await window.GamePassService.purchaseCreditPack(
        walletAddress,
        packType,
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
        alert(`✅ Purchase successful! You now have ${result.gamesIncluded} games.`);
        
        // Refresh game pass status
        if (window.GamePassDisplay) {
          await window.GamePassDisplay.refresh(walletAddress, true, true);
        }
        
        // Refresh tab content
        const status = await window.GamePassService.getGamePassStatus(walletAddress, true);
        
        // Update cached game pass status so tab switches use fresh data
        if (status.success) {
          if (!window._preloadedGamePassStatus) {
            window._preloadedGamePassStatus = {};
          }
          window._preloadedGamePassStatus[walletAddress] = status;
        }
        
        await this.render(walletAddress, paymentToken, badgeDiscount, status);
        
        // Update store buttons after purchase (show Continue/Back options if in credits-only mode)
        if (typeof updateStoreButtons === 'function') {
          let context = 'main-menu';
          if (typeof getStoreState === 'function') {
            const state = getStoreState();
            context = state.context || 'main-menu';
          }
          updateStoreButtons('gamePass', context);
        }
        
        // If this purchase was from the end-demo modal, check if we should show continue option
        if (window._endDemoPurchaseContext && typeof window._endDemoPurchaseContext.checkCreditsAndContinue === 'function') {
          // Small delay to ensure state is updated
          setTimeout(() => {
            window._endDemoPurchaseContext.checkCreditsAndContinue();
            // Clear context after use
            delete window._endDemoPurchaseContext;
          }, 500);
        }
      } else {
        throw new Error(executeResult.error || 'Transaction failed');
      }
    } catch (error) {
      log.error('STORE GAME PASS TAB', 'Error purchasing pack', error);
      alert(`Purchase failed: ${error.message || 'Unknown error'}`);
    } finally {
      // Re-enable button
      const btn = (typeof event !== 'undefined' && event?.target)
        ? event.target.closest('.pack-purchase-btn')
        : document.querySelector(`.pack-purchase-btn[onclick*="purchasePack(${packType}"]`);
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<span class="btn-icon">🛒</span> Purchase';
      }
    }
  },

  /**
   * Purchase single game
   */
  async purchaseSingleGame(paymentToken, badgeDiscount) {
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
      const btn = (typeof event !== 'undefined' && event?.target)
        ? event.target.closest('button')
        : document.querySelector('button[onclick*="purchaseSingleGame"]');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="btn-icon">⏳</span> Processing...';
      }

      // Build purchase transaction
      const result = await window.GamePassService.purchaseSingleGame(
        walletAddress,
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
        alert('✅ Purchase successful! You now have 1 game credit.');
        
        // Refresh game pass status
        if (window.GamePassDisplay) {
          await window.GamePassDisplay.refresh(walletAddress, true, true);
        }
        
        // Refresh tab content
        const status = await window.GamePassService.getGamePassStatus(walletAddress, true);
        
        // Update cached game pass status so tab switches use fresh data
        if (status.success) {
          if (!window._preloadedGamePassStatus) {
            window._preloadedGamePassStatus = {};
          }
          window._preloadedGamePassStatus[walletAddress] = status;
        }
        
        await this.render(walletAddress, paymentToken, badgeDiscount, status);
        
        // Update store buttons after purchase (show Continue/Back options if in credits-only mode)
        if (typeof updateStoreButtons === 'function') {
          let context = 'main-menu';
          if (typeof getStoreState === 'function') {
            const state = getStoreState();
            context = state.context || 'main-menu';
          }
          updateStoreButtons('gamePass', context);
        }
        
        // If this purchase was from the end-demo modal, check if we should show continue option
        if (window._endDemoPurchaseContext && typeof window._endDemoPurchaseContext.checkCreditsAndContinue === 'function') {
          // Small delay to ensure state is updated
          setTimeout(() => {
            window._endDemoPurchaseContext.checkCreditsAndContinue();
            // Clear context after use
            delete window._endDemoPurchaseContext;
          }, 500);
        }
      } else {
        throw new Error(executeResult.error || 'Transaction failed');
      }
    } catch (error) {
      log.error('STORE GAME PASS TAB', 'Error purchasing single game', error);
      alert(`Purchase failed: ${error.message || 'Unknown error'}`);
    } finally {
      // Re-enable button
      const btn = (typeof event !== 'undefined' && event?.target)
        ? event.target.closest('button')
        : document.querySelector('button[onclick*="purchaseSingleGame"]');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<span class="btn-icon">💳</span> Purchase Game';
      }
    }
  },
};

// Export to window
if (typeof window !== 'undefined') {
  window.StoreGamePassTab = StoreGamePassTab;
}

