// ==========================================
// STORE BUNDLES TAB - Stockroom Bundle Offers
// ==========================================
// Shown whenever the store surface allows the Bundles tab (see store-context-rules.js).
// Excludes:
// - credits-only bundles
// - tickets-only bundles

var log = (typeof window !== 'undefined' && window.FrontendLogger)
  ? {
      debug: (cat, msg, data) => window.FrontendLogger.debug(cat, msg, data),
      warn: (cat, msg, data) => window.FrontendLogger.warn(cat, msg, data),
      error: (cat, msg, data) => window.FrontendLogger.error(cat, msg, data),
    }
  : {
      debug: () => {},
      warn: (cat, msg, data) => console.warn(`[${cat}] ${msg}`, data || ''),
      error: (cat, msg, data) => console.error(`[${cat}] ${msg}`, data || ''),
    };

const StoreBundlesTab = {
  _getPaymentToken() {
    if (typeof getStoreState === 'function') {
      const state = getStoreState();
      return state?.paymentToken || 'mews';
    }
    return 'mews';
  },

  async _getBadgeDiscount() {
    try {
      const walletAddress = window.walletAPIInstance && window.walletAPIInstance.isConnected()
        ? window.walletAPIInstance.getAddress()
        : null;
      if (walletAddress && window.BadgeService && window.BadgeService.getBadge) {
        // Same as Items tab: use badge cache; do not refetch on every Bundles visit (was blocking "Loading Bundles…").
        const badgeData = await window.BadgeService.getBadge(walletAddress);
        if (badgeData?.success === true && badgeData?.hasBadge === true && badgeData?.badge) {
          if (typeof window.getStoreBadgeDiscountPercent === 'function') {
            return window.getStoreBadgeDiscountPercent(badgeData.badge);
          }
        }
      }
    } catch (_) { /* ignore */ }
    return 0;
  },

  renderBundleCard(bundle, paymentToken, freshPrices, badgeDiscount) {
    const level = bundle?.levels?.[0] || {};
    const originalPrice = Number(level.usdPrice || 0);
    const discountedPrice = originalPrice * (1 - (badgeDiscount / 100));
    const tokenSymbol = paymentToken === 'sui' ? 'SUI' : (paymentToken === 'usdc' ? 'USDC' : 'MEWS');
    const tokenPrice = typeof convertUsdToToken === 'function'
      ? convertUsdToToken(discountedPrice, paymentToken, freshPrices).formatted
      : 'N/A';

    const usdHtml = badgeDiscount > 0
      ? `<span style="text-decoration: line-through; opacity: 0.6;">${typeof formatUsdPrice === 'function' ? formatUsdPrice(originalPrice) : `$${originalPrice.toFixed(2)}`}</span> <span style="color: #39ff14;">${typeof formatUsdPrice === 'function' ? formatUsdPrice(discountedPrice) : `$${discountedPrice.toFixed(2)}`}</span>`
      : (typeof formatUsdPrice === 'function' ? formatUsdPrice(originalPrice) : `$${originalPrice.toFixed(2)}`);

    const discountPct = Number.isFinite(bundle?.bundleDiscountPct) ? Number(bundle.bundleDiscountPct) : null;
    const discountChip = discountPct !== null ? `<span style="margin-left: 8px; color: #39ff14; font-weight: 700;">Bundle: ${discountPct}% off</span>` : '';

    const lines = Array.isArray(bundle?.bundleLineItems) ? bundle.bundleLineItems : [];
    const linesHtml = lines.length
      ? lines.map((line) => `<div>${line}</div>`).join('')
      : `<div>${level.effect || 'Bundle contents'}</div>`;

    return `
      <div class="game-pass-pack-card store-item-card store-bundle-card" data-item-id="${bundle.id}">
        <div class="pack-header">
          <h3>${bundle.name}</h3>
        </div>
        <div class="pack-description">${linesHtml}</div>
        <div class="pack-pricing">
          <div class="price-usd">${usdHtml}${discountChip}</div>
          <div class="price-token">${tokenPrice} ${tokenSymbol}</div>
          ${badgeDiscount > 0 ? `<div class="badge-discount-badge" style="font-size: 0.75rem; color: #39ff14; margin-top: 0.25rem;">Badge: ${badgeDiscount}% off</div>` : ''}
        </div>
        <div class="item-level-container" data-item-id="${bundle.id}" data-level="1">
          <button class="item-single-btn"
                  onclick="selectStoreItem('${bundle.id}', 1); return false;"
                  data-item-id="${bundle.id}"
                  data-level="1">
            <span class="btn-icon">📦</span> Add Bundle
          </button>
        </div>
      </div>
    `;
  },

  async render() {
    const container = document.getElementById('storeBundlesTabContent');
    if (!container) {
      log.error('STORE BUNDLES TAB', 'Tab content container not found');
      return;
    }

    let bundleItems = [];
    if (typeof StoreDataSources !== 'undefined' && StoreDataSources.getStoreBundles) {
      bundleItems = await StoreDataSources.getStoreBundles();
    }
    console.log('[STORE BUNDLES TAB] bundles retrieval', {
      method: 'StoreDataSources.getStoreBundles()',
      source: '/api/store/catalog offers (Terminal + Stockroom)',
      retrievedCount: bundleItems.length,
      retrievedIds: bundleItems.map((b) => b?.id),
    });

    if (!bundleItems.length) {
      container.innerHTML = `
        <div class="store-placeholder" style="padding: 2rem; text-align: center; color: #aaa;">
          <h3 style="margin-bottom: 1rem;">No bundles available</h3>
          <p style="margin-bottom: 0.5rem;">No eligible stockroom bundles are available right now.</p>
        </div>
      `;
      return;
    }

    // Ensure bundle rows are available to selection/purchase lookups (getItemById/getItemLevelData).
    const state = typeof getStoreState === 'function' ? getStoreState() : null;
    const existingItems = Array.isArray(state?.storeItems) ? state.storeItems : [];
    const byId = new Map(existingItems.map((item) => [String(item?.id || ''), item]));
    for (const bundle of bundleItems) {
      byId.set(String(bundle.id), bundle);
    }
    const mergedItems = Array.from(byId.values());
    if (state) {
      state.storeItems = mergedItems;
    }
    if (typeof StoreService !== 'undefined' && StoreService._state) {
      StoreService._state.storeItems = mergedItems;
    }
    console.log('[STORE BUNDLES TAB] bundles merge into storeItems', {
      existingCountBeforeMerge: existingItems.length,
      mergedCountAfterMerge: mergedItems.length,
      mergedIdsSample: mergedItems.slice(0, 20).map((i) => i?.id),
    });

    const paymentToken = this._getPaymentToken();
    const pricesP =
      typeof StoreDataSources !== 'undefined' && StoreDataSources.ensureStoreTokenPrices
        ? StoreDataSources.ensureStoreTokenPrices()
        : Promise.resolve(null);
    const [badgeDiscount, freshPrices] = await Promise.all([this._getBadgeDiscount(), pricesP]);

    container.innerHTML = `
      <div class="game-pass-section">
        <h3>📦 Bundles</h3>
        <p style="margin-bottom: 20px; color: #aaa; font-size: 0.9em;">
          Mixed stockroom bundles. Credits-only and tickets-only bundles are excluded.
        </p>
        <div class="game-pass-packs-grid" id="storeBundlesItemsContainer"></div>
      </div>
    `;

    const itemsContainer = document.getElementById('storeBundlesItemsContainer');
    if (!itemsContainer) return;

    itemsContainer.innerHTML = bundleItems
      .map((bundle) => this.renderBundleCard(bundle, paymentToken, freshPrices, badgeDiscount))
      .join('');

    if (typeof updateItemCardStates === 'function') {
      updateItemCardStates();
    }
  },
};

if (typeof window !== 'undefined') {
  window.StoreBundlesTab = StoreBundlesTab;
}
