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

/**
 * Per-ticket USD shown for a bundle: matches Stockroom / fulfillment (integer cents, floor divide).
 * E.g. $5.50 for 6 → 550¢ / 6 → 91¢ → $0.91 (not $0.92 from rounding 5.50/6).
 */
function storePerTicketUsdFromBundleTotal(totalUsd, quantity) {
  const q = Math.trunc(Number(quantity));
  if (!q || q < 1) return 0;
  const cents = Math.round(Number(totalUsd) * 100);
  if (!Number.isFinite(cents) || cents < 0) return 0;
  return Math.floor(cents / q) / 100;
}

const StoreTournamentTicketsTab = {
  _balanceHydrateInFlightByAddress: new Map(),

  _renderBalanceSectionHTML(gamePassStatus) {
    const hasStatus = !!(gamePassStatus && typeof gamePassStatus === 'object');
    const isLoading = !hasStatus;
    const tickets = hasStatus ? (gamePassStatus.ticketCount ?? 0) : 0;
    return `
      <div class="game-pass-status" style="margin-bottom: 1rem;">
        <div class="game-pass-status-label">Your balance</div>
        <div class="game-pass-status-line">
          <span class="game-pass-status-label">Tickets:</span>
          <span class="game-pass-status-value" id="storeTicketsBalanceTickets">${isLoading ? 'Loading…' : tickets.toLocaleString()}</span>
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

        const ticketsEl = document.getElementById('storeTicketsBalanceTickets');
        if (ticketsEl) ticketsEl.textContent = String((status?.ticketCount ?? 0).toLocaleString());
      })
      .catch(() => {})
      .finally(() => {
        this._balanceHydrateInFlightByAddress.delete(walletAddress);
      });

    this._balanceHydrateInFlightByAddress.set(walletAddress, p);
  },

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

    let freshPrices = null;
    if (typeof StoreDataSources !== 'undefined' && StoreDataSources.ensureStoreTokenPrices) {
      freshPrices = await StoreDataSources.ensureStoreTokenPrices();
    }

    // Resolve status from shared cache if caller didn't pass it.
    const cachedStatus =
      (typeof window !== 'undefined' && window._preloadedGamePassStatus && walletAddress)
        ? window._preloadedGamePassStatus[walletAddress]
        : null;
    const resolvedStatus = gamePassStatus || cachedStatus || null;
    this._hydrateBalanceIfMissing(walletAddress);

    const ticketBundles =
      typeof StoreDataSources !== 'undefined' && StoreDataSources.getStoreTicketBundles
        ? await StoreDataSources.getStoreTicketBundles()
        : [];

    const baselineBundle = [...ticketBundles]
      .filter(b => Number(b?.quantity) > 0 && Number(b?.price) > 0)
      .sort((a, b) => Number(a.quantity) - Number(b.quantity))[0] || null;
    const baselinePerTicketUsd = baselineBundle
      ? storePerTicketUsdFromBundleTotal(baselineBundle.price, baselineBundle.quantity)
      : 0;

    // Calculate prices with discount
    const bundlesHTML = ticketBundles.map(bundle => {
      // Apply bundle discount first (built into bundle price)
      const bundleDiscountedPrice = bundle.price;
      
      // Then apply badge discount
      const finalPrice = bundleDiscountedPrice * (1 - badgeDiscount / 100);
      const originalPrice = bundle.price;
      const qty = Number(bundle.quantity || 0);
      const perTicketUsd = storePerTicketUsdFromBundleTotal(finalPrice, qty);
      const hasBaseline = baselinePerTicketUsd > 0 && qty > 0;
      const savingsPct = hasBaseline ? (1 - (perTicketUsd / baselinePerTicketUsd)) : 0;
      const savingsPctRounded = savingsPct > 0 ? Math.round(savingsPct * 100) : 0;
      const savingsLine = savingsPctRounded > 0
        ? `Save ${savingsPctRounded}% (${typeof formatUsdPrice === 'function' ? formatUsdPrice(perTicketUsd) : `$${perTicketUsd.toFixed(2)}`} per ticket)`
        : (qty > 0 ? `${typeof formatUsdPrice === 'function' ? formatUsdPrice(perTicketUsd) : `$${perTicketUsd.toFixed(2)}`} per ticket` : '');
      const descriptionHTML = `<div>${savingsLine}</div>`;
      
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
            <h3>${bundle.name}</h3>
          </div>
          <div class="pack-description">${descriptionHTML}</div>
          <div class="pack-pricing">
            <div class="price-usd">${usdPriceHTML}</div>
            <div class="price-token">${tokenPriceDisplay} ${tokenSymbol}</div>
            ${badgeDiscount > 0 ? `<div class="badge-discount-badge" style="font-size: 0.75rem; color: #39ff14; margin-top: 0.25rem;">🎖️ ${badgeDiscount}% off</div>` : ''}
          </div>
          <button class="menu-btn primary pack-purchase-btn" 
                  onclick="${bundle?.isSingle ? `StoreTournamentTicketsTab.purchaseSingleTicket(event, '${paymentToken}', ${badgeDiscount});` : `StoreTournamentTicketsTab.purchaseTickets(event, '${String(bundle.offerId || '')}', '${paymentToken}', ${badgeDiscount});`} return false;">
            <span class="btn-icon">🎫</span> Purchase
          </button>
        </div>
      `;
    }).join('');

    const html = `
      <div class="game-pass-tab-content">
        ${this._renderBalanceSectionHTML(resolvedStatus)}
        
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
      bundlesCount: ticketBundles.length,
      htmlLength: html.length,
    });
    
    container.innerHTML = html;
    
    console.log('✅ [STORE TOURNAMENT TICKETS TAB] Tournament tickets tab rendered successfully');
  },

  /**
   * Purchase tournament tickets
   */
  async purchaseTickets(event, offerId, paymentToken, badgeDiscount) {
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
        : document.querySelector(`.pack-purchase-btn[onclick*="purchaseTickets(event, '${String(offerId)}'"]`);
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="btn-icon">⏳</span> Processing...';
      }

      // Build purchase transaction
      const result = await window.GamePassService.purchaseTickets(
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

        // Tournament UI derives "hasEnoughTickets" from the tournaments list response.
        // After purchasing tickets, invalidate tournament list prefetch so the details panel
        // can swap from "Purchase Ticket" to "Enter Tournament".
        if (typeof window !== 'undefined') {
          window.__prefetchedTournaments = null;
          window.__prefetchedMyTournaments = null;
          if (typeof window.refreshTournaments === 'function') {
            const tm = document.getElementById('tournamentModal');
            if (tm && tm.classList.contains('tournament-modal-visible')) {
              // Best-effort; safe even if tournament tab isn't open.
              try { await window.refreshTournaments(); } catch (_) {}
            }
          }
        }
        
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
              const d = badge.badge.discounts && typeof badge.badge.discounts === 'object' ? badge.badge.discounts : null;
              currentBadgeDiscount = d && typeof d.gameplay === 'number' ? Math.max(0, d.gameplay) : 0; // Tickets use gameplay discount
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
        : document.querySelector(`.pack-purchase-btn[onclick*="purchaseTickets(event, '${String(offerId)}'"]`);
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<span class="btn-icon">🎫</span> Purchase';
      }
    }
  },

  async purchaseSingleTicket(event, paymentToken, badgeDiscount) {
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
    if (!window.GamePassService || typeof window.GamePassService.purchaseSingleTicket !== 'function') {
      alert('Game Pass service not available.');
      return;
    }
    try {
      const btn = (event && event.target)
        ? event.target.closest('.pack-purchase-btn')
        : document.querySelector(`.pack-purchase-btn[onclick*="purchaseSingleTicket"]`);
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="btn-icon">⏳</span> Processing...';
      }

      const result = await window.GamePassService.purchaseSingleTicket(
        walletAddress,
        paymentToken.toUpperCase(),
        badgeDiscount
      );
      if (!result.success) throw new Error(result.error || 'Failed to build purchase transaction');
      if (!window.walletAPIInstance || !window.walletAPIInstance.isConnected()) throw new Error('Wallet not connected');
      const executeResult = await window.walletAPIInstance.signAndExecuteTransaction(result.transaction);
      if (!executeResult.success) throw new Error(executeResult.error || 'Transaction failed');
      await window.GamePassService.completeStorePurchase(walletAddress, result.items, executeResult.digest);

      alert('✅ Purchase successful! You now have 1 tournament ticket.');

      // Invalidate tournament prefetch caches so tournament details panel updates.
      if (typeof window !== 'undefined') {
        window.__prefetchedTournaments = null;
        window.__prefetchedMyTournaments = null;
        if (typeof window.refreshTournaments === 'function') {
          const tm = document.getElementById('tournamentModal');
          if (tm && tm.classList.contains('tournament-modal-visible')) {
            try { await window.refreshTournaments(); } catch (_) {}
          }
        }
      }

      if (window.GamePassDisplay) await window.GamePassDisplay.refresh(walletAddress, true, true);
      const status = await window.GamePassService.getGamePassStatus(walletAddress, true);
      if (status.success) {
        if (!window._preloadedGamePassStatus) window._preloadedGamePassStatus = {};
        window._preloadedGamePassStatus[walletAddress] = status;
      }
      await this.render(walletAddress, paymentToken, badgeDiscount, status);
    } catch (error) {
      log.error('STORE TOURNAMENT TICKETS TAB', 'Error purchasing single ticket', error);
      alert(`❌ Purchase failed: ${error.message || 'Unknown error'}`);
    } finally {
      const btn = (event && event.target)
        ? event.target.closest('.pack-purchase-btn')
        : document.querySelector(`.pack-purchase-btn[onclick*="purchaseSingleTicket"]`);
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

