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

const StoreGamePassTab = {
  _balanceHydrateInFlightByAddress: new Map(),

  _renderBalanceSectionHTML(gamePassStatus) {
    const hasStatus = !!(gamePassStatus && typeof gamePassStatus === 'object');
    const isLoading = !hasStatus;
    const credits = hasStatus ? (gamePassStatus.gamesRemaining ?? gamePassStatus.credits ?? 0) : 0;
    return `
      <div class="game-pass-status" style="margin-bottom: 1rem;">
        <div class="game-pass-status-label">Your balance</div>
        <div class="game-pass-status-line">
          <span class="game-pass-status-label">Credits:</span>
          <span class="game-pass-status-value" id="storeGamePassBalanceCredits">${isLoading ? 'Loading…' : credits.toLocaleString()}</span>
        </div>
      </div>
    `;
  },

  _hydrateBalanceIfMissing(walletAddress) {
    if (!walletAddress) return;
    if (window._preloadedGamePassStatus && window._preloadedGamePassStatus[walletAddress]) return;
    if (!window.GamePassService || typeof window.GamePassService.getGamePassStatus !== 'function') return;

    const existing = this._balanceHydrateInFlightByAddress.get(walletAddress);
    if (existing) return;

    const p = window.GamePassService.getGamePassStatus(walletAddress, false)
      .then((status) => {
        if (!window._preloadedGamePassStatus) window._preloadedGamePassStatus = {};
        window._preloadedGamePassStatus[walletAddress] = status;

        // Update balance section in-place (do not re-render whole tab).
        const creditsEl = document.getElementById('storeGamePassBalanceCredits');
        if (creditsEl) creditsEl.textContent = String((status?.gamesRemaining ?? status?.credits ?? 0).toLocaleString());
      })
      .catch(() => {})
      .finally(() => {
        this._balanceHydrateInFlightByAddress.delete(walletAddress);
      });

    this._balanceHydrateInFlightByAddress.set(walletAddress, p);
  },

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

    let freshPrices = null;
    if (typeof StoreDataSources !== 'undefined' && StoreDataSources.ensureStoreTokenPrices) {
      freshPrices = await StoreDataSources.ensureStoreTokenPrices();
    }
    if (!freshPrices) {
      log.warn('STORE GAME PASS TAB', 'Token prices unavailable (StoreDataSources.ensureStoreTokenPrices / GET /prices/tokens)');
    }

    const PACKS = await (typeof StoreDataSources !== 'undefined' && StoreDataSources.getStoreCreditPacks
      ? StoreDataSources.getStoreCreditPacks()
      : Promise.resolve(null));

    // Empty store: no packs configured.
    if (!PACKS || PACKS.length === 0) {
      container.innerHTML = `
        <div class="store-placeholder" style="padding: 2rem; text-align: center; color: #aaa;">
          <h3 style="margin-bottom: 1rem;">No credit packs available</h3>
          <p style="margin-bottom: 0.5rem;">The store is empty right now.</p>
        </div>
      `;
      return;
    }

    // Resolve status from shared cache if caller didn't pass it.
    const cachedStatus =
      (typeof window !== 'undefined' && window._preloadedGamePassStatus && walletAddress)
        ? window._preloadedGamePassStatus[walletAddress]
        : null;
    const resolvedStatus = gamePassStatus || cachedStatus || null;
    this._hydrateBalanceIfMissing(walletAddress);

    const singleCredit = PACKS.find((pack) => pack?.isSingle && pack?.skuKey === 'credits') || null;
    const creditPacks = PACKS.filter((pack) => !pack?.isSingle && Number(pack?.type) > 0);
    const baselinePerGameUsd = creditPacks
      .filter((pack) => Number(pack?.games) > 0 && Number(pack?.price) > 0)
      .reduce((min, pack) => {
        const perGame = Number(pack.price) / Number(pack.games);
        return perGame > 0 ? Math.min(min, perGame) : min;
      }, Number.POSITIVE_INFINITY);

    // Calculate prices with discount
    const packsHTML = creditPacks.map(pack => {
      const originalPrice = pack.price;
      const discountedPrice = originalPrice * (1 - badgeDiscount / 100);
      const games = Number(pack.games || 0);
      const perGameUsd = games > 0 ? (discountedPrice / games) : 0;
      const hasBaseline = baselinePerGameUsd > 0 && games > 0;
      const savingsPct = hasBaseline ? (1 - (perGameUsd / baselinePerGameUsd)) : 0;
      const savingsPctRounded = savingsPct > 0 ? Math.round(savingsPct * 100) : 0;
      const savingsLine = savingsPctRounded > 0
        ? `Save ${savingsPctRounded}% (${typeof formatUsdPrice === 'function' ? formatUsdPrice(perGameUsd) : `$${perGameUsd.toFixed(2)}`} per game)`
        : (games > 0 ? `${typeof formatUsdPrice === 'function' ? formatUsdPrice(perGameUsd) : `$${perGameUsd.toFixed(2)}`} per game` : '');
      const descriptionHTML = `<div>${savingsLine}</div>`;
      
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
      const tokenSymbol = paymentToken === 'sui' ? 'SUI' : (paymentToken === 'usdc' ? 'USDC' : 'MEWS');
      
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
            <h3>${pack.name}</h3>
          </div>
          <div class="pack-description">${descriptionHTML}</div>
          <div class="pack-pricing">
            <div class="price-usd">${usdPriceHTML}</div>
            <div class="price-token">${tokenPriceDisplay} ${tokenSymbol}</div>
            ${badgeDiscount > 0 ? `<div class="badge-discount-badge" style="font-size: 0.75rem; color: #39ff14; margin-top: 0.25rem;">🎖️ ${badgeDiscount}% off</div>` : ''}
          </div>
          <button class="menu-btn primary pack-purchase-btn" 
                  onclick="StoreGamePassTab.purchasePack('${String(pack.offerId || '')}', '${paymentToken}', ${badgeDiscount}); return false;">
            <span class="btn-icon">🪙</span> Purchase
          </button>
        </div>
      `;
    }).join('');

    const singleCreditCardHTML = singleCredit
      ? (() => {
          const originalPrice = Number(singleCredit.price || 0);
          const discountedPrice = originalPrice * (1 - badgeDiscount / 100);
          const usdPriceHTML = badgeDiscount > 0
            ? `<span style="text-decoration: line-through; opacity: 0.6;">${typeof formatUsdPrice === 'function' ? formatUsdPrice(originalPrice) : `$${originalPrice.toFixed(2)}`}</span> <span style="color: #39ff14;">${typeof formatUsdPrice === 'function' ? formatUsdPrice(discountedPrice) : `$${discountedPrice.toFixed(2)}`}</span>`
            : (typeof formatUsdPrice === 'function' ? formatUsdPrice(originalPrice) : `$${originalPrice.toFixed(2)}`);
          const tokenSymbol = paymentToken === 'sui' ? 'SUI' : (paymentToken === 'usdc' ? 'USDC' : 'MEWS');
          const tokenDisplay = typeof convertUsdToToken === 'function'
            ? convertUsdToToken(discountedPrice, paymentToken, freshPrices).formatted
            : 'N/A';
          return `
            <div class="game-pass-pack-card">
              <div class="pack-header"><h3>${singleCredit.name || 'Single Credit'}</h3></div>
              <div class="pack-description"><div>${typeof formatUsdPrice === 'function' ? formatUsdPrice(discountedPrice) : `$${discountedPrice.toFixed(2)}`} per credit</div></div>
              <div class="pack-pricing">
                <div class="price-usd">${usdPriceHTML}</div>
                <div class="price-token">${tokenDisplay} ${tokenSymbol}</div>
                ${badgeDiscount > 0 ? `<div class="badge-discount-badge" style="font-size: 0.75rem; color: #39ff14; margin-top: 0.25rem;">🎖️ ${badgeDiscount}% off</div>` : ''}
              </div>
              <button class="menu-btn primary pack-purchase-btn"
                      onclick="StoreGamePassTab.purchaseSingleCredit('${paymentToken}', ${badgeDiscount}); return false;">
                <span class="btn-icon">🪙</span> Purchase
              </button>
            </div>
          `;
        })()
      : '';

    container.innerHTML = `
      <div class="game-pass-tab-content">
        ${this._renderBalanceSectionHTML(resolvedStatus)}
        
        <div class="game-pass-section">
          <h3>🎮 Credit Packs</h3>
          <div class="game-pass-packs-grid">
            ${singleCreditCardHTML}
            ${packsHTML}
          </div>
        </div>
      </div>
    `;
  },

  async purchaseSingleCredit(paymentToken, badgeDiscount) {
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
    if (!window.GamePassService || typeof window.GamePassService.purchaseSingleCredit !== 'function') {
      alert('Game Pass service not available.');
      return;
    }
    try {
      const result = await window.GamePassService.purchaseSingleCredit(
        walletAddress,
        paymentToken.toUpperCase(),
        badgeDiscount
      );
      if (!result.success) throw new Error(result.error || 'Failed to build purchase transaction');
      if (!window.walletAPIInstance || !window.walletAPIInstance.isConnected()) throw new Error('Wallet not connected');
      const executeResult = await window.walletAPIInstance.signAndExecuteTransaction(result.transaction);
      if (!executeResult.success) throw new Error(executeResult.error || 'Transaction failed');
      await window.GamePassService.completeStorePurchase(walletAddress, result.items, executeResult.digest);

      alert('✅ Purchase successful! You now have 1 credit.');
      if (window.GamePassDisplay) await window.GamePassDisplay.refresh(walletAddress, true, true);
      const status = await window.GamePassService.getGamePassStatus(walletAddress, true);
      if (status.success) {
        if (!window._preloadedGamePassStatus) window._preloadedGamePassStatus = {};
        window._preloadedGamePassStatus[walletAddress] = status;
      }
      await this.render(walletAddress, paymentToken, badgeDiscount, status);
    } catch (error) {
      log.error('STORE GAME PASS TAB', 'Error purchasing single credit', error);
      alert(`Purchase failed: ${error.message || 'Unknown error'}`);
    }
  },

  /**
   * Purchase a credit pack
   */
  async purchasePack(offerId, paymentToken, badgeDiscount) {
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
        : document.querySelector(`.pack-purchase-btn[onclick*="purchasePack('${String(offerId)}'"]`);
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="btn-icon">⏳</span> Processing...';
      }

      // Build purchase transaction
      const result = await window.GamePassService.purchaseCreditPack(
        walletAddress,
        offerId,
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
        await window.GamePassService.completeStorePurchase(walletAddress, result.items, executeResult.digest);
        alert(`✅ Purchase successful!`);
        
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
        : document.querySelector(`.pack-purchase-btn[onclick*="purchasePack('${String(offerId)}'"]`);
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<span class="btn-icon">🪙</span> Purchase';
      }
    }
  },

};

// Export to window
if (typeof window !== 'undefined') {
  window.StoreGamePassTab = StoreGamePassTab;
}

