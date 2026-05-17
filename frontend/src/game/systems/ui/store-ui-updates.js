// ==========================================
// STORE UI UPDATES - UI Update Functions
// ==========================================
// Handles updating the store UI: selected items summary, balance display, and item prices

console.log('✅ [STORE UI UPDATES] Store UI updates module loaded');

/**
 * Update store UI based on current state (with badge discount)
 */
async function updateStoreUI() {
  const cartPanels = document.querySelectorAll('[data-store-cart-panel]');
  const cartPurchaseBtns = document.querySelectorAll('[data-store-cart-purchase]');

  if (!cartPanels.length) return;
  
  // Get badge discount if available
  let badgeDiscount = 0;
  try {
    const walletAddress = window.walletAPIInstance && window.walletAPIInstance.isConnected()
      ? window.walletAPIInstance.getAddress()
      : null;
    
    if (walletAddress && window.BadgeService && window.BadgeService.getBadge) {
      const badgeData = await window.BadgeService.getBadge(walletAddress);
      if (badgeData.success && badgeData.hasBadge && badgeData.badge) {
        badgeDiscount =
          typeof window.getStoreBadgeDiscountPercent === 'function'
            ? window.getStoreBadgeDiscountPercent(badgeData.badge)
            : 0;
      }
    }
  } catch (error) {
    console.warn('⚠️ [STORE UI UPDATES] Failed to get badge discount for UI update:', error);
  }
  
  // Count selected items and calculate total (with discount)
  let selectedCount = 0;
  const selectedItems = [];
  let totalUsd = 0;
  let totalUsdBeforeDiscount = 0;
  
  // Update local state reference
  if (typeof updateStoreStateReference === 'function') {
    updateStoreStateReference();
  }
  const state = typeof getStoreState === 'function' ? getStoreState() : null;
  if (!state) return;

  const offers = state.storeOffers && typeof state.storeOffers === 'object' ? state.storeOffers : null;
  const selectedOffers = state.selectedOffers && typeof state.selectedOffers === 'object' ? state.selectedOffers : null;

  function parseAdditionalDataName(additionalData) {
    if (typeof additionalData !== 'string' || !additionalData.trim()) return '';
    try {
      const j = JSON.parse(additionalData);
      if (j && typeof j.name === 'string' && j.name.trim()) return j.name.trim();
    } catch {
      /* ignore */
    }
    return '';
  }

  function baseItemIdFromOfferId(offerId) {
    const s = String(offerId || '').trim();
    // canonical leveled key: "<itemKey>:l<level>"
    const m = s.match(/^(.+):l(\d+)$/);
    if (m && m[1]) return m[1];
    return s;
  }

  function levelFromOfferId(offerId) {
    const s = String(offerId || '').trim();
    const m = s.match(/^(.+):l(\d+)$/);
    if (!m) return null;
    const n = Number(m[2]);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  function resolveCartDisplayName(offerId, offer) {
    const additionalData = offer?.additionalData ?? offer?.additional_data ?? '';
    const nameFromAdditional = parseAdditionalDataName(additionalData);
    if (nameFromAdditional) return nameFromAdditional;

    // Prefer the Provisions item name when offerId corresponds to an item key.
    const baseId = baseItemIdFromOfferId(offerId);
    const storeItems = Array.isArray(state.storeItems) ? state.storeItems : [];
    const matched = storeItems.find((it) => String(it?.id || '').trim().toLowerCase() === String(baseId).toLowerCase());
    const nameFromItem = String(matched?.name || '').trim();
    const lvl = levelFromOfferId(offerId);
    const matchedLevelCount = Array.isArray(matched?.levels) ? matched.levels.length : 0;
    if (nameFromItem) {
      // Only show "Level N" for items that actually have multiple levels in the catalog.
      if (lvl && matchedLevelCount > 1) return `${nameFromItem} Level ${lvl}`;
      return nameFromItem;
    }

    // Fall back to offer.name (often description-like) then offer.description.
    const offerName = String(offer?.name || '').trim();
    if (offerName) {
      if (lvl) return `${offerName} Level ${lvl}`;
      return offerName;
    }
    const offerDesc = String(offer?.description || '').trim();
    if (offerDesc) {
      if (lvl) return `${offerDesc} Level ${lvl}`;
      return offerDesc;
    }

    return String(offerId).trim() || 'Item';
  }

  if (!offers || !selectedOffers) return;
  for (const [offerId, quantity] of Object.entries(selectedOffers)) {
    if (!(quantity > 0)) continue;
    const offer = offers[offerId];
    if (!offer) continue;
    const resolvedUsd =
      (window.StoreOfferUtils && window.StoreOfferUtils.resolveUsdUnitPrice)
        ? window.StoreOfferUtils.resolveUsdUnitPrice({ offerId })
        : null;
    const rawCents = offer?.priceUsdCents ?? offer?.price_usd_cents;
    const cents = Number(rawCents ?? 0);
    const originalPrice =
      (resolvedUsd != null && Number.isFinite(Number(resolvedUsd)))
        ? Math.max(0, Number(resolvedUsd))
        : (Number.isFinite(cents) ? Math.max(0, cents) / 100 : 0);
    const discountedPrice = badgeDiscount > 0
      ? originalPrice * (1 - badgeDiscount / 100)
      : originalPrice;
    const itemTotalBeforeDiscount = originalPrice * quantity;
    const itemTotal = discountedPrice * quantity;

    totalUsdBeforeDiscount += itemTotalBeforeDiscount;
    totalUsd += itemTotal;

    const name = resolveCartDisplayName(offerId, offer);

    selectedItems.push({
      key: offerId,
      itemId: offerId,
      level: 1,
      name,
      quantity,
      unitPrice: originalPrice,
      unitPriceDiscounted: discountedPrice,
      totalPrice: itemTotal,
      totalPriceBeforeDiscount: itemTotalBeforeDiscount
    });
    selectedCount += quantity;
  }
  
  const listHtml =
    selectedCount > 0
      ? selectedItems.map(item => {
      let priceHTML = '';
      if (badgeDiscount > 0 && item.totalPrice < item.totalPriceBeforeDiscount) {
        const originalUsd = typeof formatUsdPrice === 'function' ? formatUsdPrice(item.totalPriceBeforeDiscount) : `$${item.totalPriceBeforeDiscount.toFixed(2)}`;
        const discountedUsd = typeof formatUsdPrice === 'function' ? formatUsdPrice(item.totalPrice) : `$${item.totalPrice.toFixed(2)}`;
        priceHTML = `<span style="text-decoration: line-through; opacity: 0.6;">${originalUsd}</span> <span style="color: #39ff14;">${discountedUsd}</span>`;
      } else {
        priceHTML = typeof formatUsdPrice === 'function' ? formatUsdPrice(item.totalPrice) : `$${item.totalPrice.toFixed(2)}`;
      }
      
      const unitPriceHTML = item.quantity > 1 
        ? ` (${badgeDiscount > 0 && item.unitPriceDiscounted < item.unitPrice
            ? `<span style="text-decoration: line-through; opacity: 0.6;">${typeof formatUsdPrice === 'function' ? formatUsdPrice(item.unitPrice) : `$${item.unitPrice.toFixed(2)}`}</span> <span style="color: #39ff14;">${typeof formatUsdPrice === 'function' ? formatUsdPrice(item.unitPriceDiscounted) : `$${item.unitPriceDiscounted.toFixed(2)}`}</span>`
            : (typeof formatUsdPrice === 'function' ? formatUsdPrice(item.unitPrice) : `$${item.unitPrice.toFixed(2)}`)} each)`
        : '';
      
      return `<div class="selected-item" data-item-key="${item.key}" onclick="removeOfferFromSelection('${item.key}', event)" title="Click to remove one">
        <span class="selected-item-name">${item.name}${item.quantity > 1 ? ` × ${item.quantity}` : ''}</span>
        <span class="selected-item-price">${priceHTML}${unitPriceHTML}</span>
      </div>`;
    }).join('')
      : '';

  const tokenConversion = typeof convertUsdToToken === 'function'
    ? convertUsdToToken(totalUsd, state.paymentToken)
    : { formatted: '0', amount: 0 };
  const tokenSymbol = state.paymentToken === 'sui' ? 'SUI' : (state.paymentToken === 'usdc' ? 'USDC' : 'MEWS');

  let totalInnerHTML = '';
  if (selectedCount > 0) {
    if (badgeDiscount > 0 && totalUsd < totalUsdBeforeDiscount) {
      const discountAmount = totalUsdBeforeDiscount - totalUsd;
      const originalTotal = typeof formatUsdPrice === 'function' ? formatUsdPrice(totalUsdBeforeDiscount) : `$${totalUsdBeforeDiscount.toFixed(2)}`;
      const discountedTotal = typeof formatUsdPrice === 'function' ? formatUsdPrice(totalUsd) : `$${totalUsd.toFixed(2)}`;
      const savedAmount = typeof formatUsdPrice === 'function' ? formatUsdPrice(discountAmount) : `$${discountAmount.toFixed(2)}`;
      totalInnerHTML = `<span>Total: <span style="text-decoration: line-through; opacity: 0.6;">${originalTotal}</span> <span style="color: #39ff14;">${discountedTotal}</span> (${tokenConversion.formatted} ${tokenSymbol}) <span style="color: #39ff14; font-size: 0.9em;">🎖️ ${badgeDiscount}% off (Save ${savedAmount})</span></span>`;
    } else {
      const totalFormatted = typeof formatUsdPrice === 'function' ? formatUsdPrice(totalUsd) : `$${totalUsd.toFixed(2)}`;
      totalInnerHTML = `<span>Total: ${totalFormatted} (${tokenConversion.formatted} ${tokenSymbol})</span>`;
    }
  } else {
    const z = typeof formatUsdPrice === 'function' ? formatUsdPrice(0) : '$0.00';
    totalInnerHTML = `<span>Total: ${z} (${tokenConversion.formatted} ${tokenSymbol})</span>`;
  }

  cartPanels.forEach((panel) => {
    const selectedList = panel.querySelector('[data-selected-items-list]');
    const totalElement = panel.querySelector('[data-store-cart-total]');
    const emptyHint = panel.querySelector('[data-store-cart-empty]');
    if (selectedList) selectedList.innerHTML = listHtml;
    if (totalElement) totalElement.innerHTML = totalInnerHTML;
    if (emptyHint) emptyHint.style.display = selectedCount > 0 ? 'none' : '';
  });

  const disablePurchase = selectedCount <= 0;
  cartPurchaseBtns.forEach((btn) => {
    // Cart purchase button is only shown when the cart has lines.
    btn.style.display = disablePurchase ? 'none' : '';
    if (!state.isLoading) {
      btn.disabled = disablePurchase;
    }
  });

  if (typeof updateItemCardStates === 'function') {
    updateItemCardStates();
  }
}

/**
 * Update store balance display based on selected payment token
 */
async function updateStoreBalance() {
  const balanceDisplay = document.getElementById('storeBalanceDisplay');
  const balanceValue = document.getElementById('storeBalanceValue');
  
  if (!balanceDisplay || !balanceValue) {
    return;
  }
  
  // Get wallet address
  let walletAddress = null;
  if (typeof getWalletAddress === 'function') {
    walletAddress = getWalletAddress();
  } else if (window.walletAPIInstance && window.walletAPIInstance.isConnected()) {
    walletAddress = window.walletAPIInstance.getAddress();
  }
  
  if (!walletAddress) {
    balanceDisplay.style.display = 'none';
    return;
  }
  
  // Show balance display
  balanceDisplay.style.display = 'flex';
  balanceValue.textContent = 'Loading...';
  
  // Update local state reference
  if (typeof updateStoreStateReference === 'function') {
    updateStoreStateReference();
  }
  const state = typeof getStoreState === 'function' ? getStoreState() : null;
  if (!state) return;
  
  try {
    const token = state.paymentToken;
    console.log('💰 [STORE UI UPDATES] Updating balance for token:', token, 'address:', walletAddress);
    
    // Use consolidated token balance utility
    const network = 'testnet'; // Store uses testnet
    const balanceResult = await window.TokenBalanceUtils?.fetchTokenBalance(token, walletAddress, network);
    
    if (balanceResult && balanceResult.success) {
      // Format display based on token type
      if (token === 'mews') {
        balanceValue.textContent = `${balanceResult.formattedBalance} MEWS`;
      } else if (token === 'usdc') {
        balanceValue.textContent = `${balanceResult.formattedBalance} USDC`;
      } else if (token === 'sui') {
        balanceValue.textContent = `${balanceResult.formattedBalance} SUI`;
      }
    } else {
      const errorMsg = balanceResult?.error || 'Balance check failed';
      console.error(`❌ [STORE UI UPDATES] ${token.toUpperCase()} balance check failed:`, errorMsg);
      balanceValue.textContent = balanceResult ? 'Error' : '--';
    }
  } catch (error) {
    console.error('❌ [STORE UI UPDATES] Error updating balance:', error);
    balanceValue.textContent = 'Error';
  }
}

/**
 * Update prices in all item cards for current payment token (with badge discount)
 */
async function updateItemPrices() {
  const cards = document.querySelectorAll('.store-item-card');
  
  // Get badge discount if available
  let badgeDiscount = 0;
  try {
    const walletAddress = window.walletAPIInstance && window.walletAPIInstance.isConnected()
      ? window.walletAPIInstance.getAddress()
      : null;
    
    if (walletAddress && window.BadgeService && window.BadgeService.getBadge) {
      const badgeData = await window.BadgeService.getBadge(walletAddress);
      if (badgeData.success && badgeData.hasBadge && badgeData.badge) {
        badgeDiscount =
          typeof window.getStoreBadgeDiscountPercent === 'function'
            ? window.getStoreBadgeDiscountPercent(badgeData.badge)
            : 0;
      }
    }
  } catch (error) {
    console.warn('⚠️ [STORE UI UPDATES] Failed to get badge discount for price update:', error);
  }
  
  cards.forEach(card => {
    const itemId = card.getAttribute('data-item-id');
    const item = typeof getItemById === 'function' ? getItemById(itemId) : null;
    if (!item) return;
    
    // Get all level buttons
    const levelButtons = card.querySelectorAll('.item-level-btn, .item-single-btn');
    
    levelButtons.forEach(button => {
      const level = parseInt(button.getAttribute('data-level')) || 1;
      const levelData = typeof getItemLevelData === 'function' ? getItemLevelData(itemId, level) : null;
      
      if (levelData) {
        // Apply badge discount to price
        const resolvedUsd =
          (window.StoreOfferUtils && window.StoreOfferUtils.resolveUsdUnitPrice)
            ? window.StoreOfferUtils.resolveUsdUnitPrice({ itemId, level })
            : null;
        const originalPrice =
          (resolvedUsd != null && Number.isFinite(Number(resolvedUsd)))
            ? Number(resolvedUsd)
            : Number(levelData.usdPrice || 0);
        const discountedPrice = badgeDiscount > 0 
          ? originalPrice * (1 - badgeDiscount / 100)
          : originalPrice;
        
        // Update local state reference
        if (typeof updateStoreStateReference === 'function') {
          updateStoreStateReference();
        }
        const state = typeof getStoreState === 'function' ? getStoreState() : null;
        if (!state) return;
        
        const tokenConversion = typeof convertUsdToToken === 'function' 
          ? convertUsdToToken(discountedPrice, state.paymentToken)
          : { formatted: '0', amount: 0 };
        const tokenSymbol = state.paymentToken === 'sui' ? 'SUI' : (state.paymentToken === 'usdc' ? 'USDC' : 'MEWS');
        
        // Update price display
        const priceContainer = button.querySelector('.level-price');
        if (priceContainer) {
          const priceToken = priceContainer.querySelector('.price-token');
          const priceUsd = priceContainer.querySelector('.price-usd');
          
          if (priceToken) {
            priceToken.textContent = `${tokenConversion.formatted} ${tokenSymbol}`;
          }
          
          // Update USD price to show discount
          if (priceUsd && badgeDiscount > 0) {
            const originalUsd = typeof formatUsdPrice === 'function' ? formatUsdPrice(originalPrice) : `$${originalPrice.toFixed(2)}`;
            const discountedUsd = typeof formatUsdPrice === 'function' ? formatUsdPrice(discountedPrice) : `$${discountedPrice.toFixed(2)}`;
            priceUsd.innerHTML = `<span style="text-decoration: line-through; opacity: 0.6;">${originalUsd}</span> <span style="color: #39ff14;">${discountedUsd}</span>`;
          } else if (priceUsd) {
            priceUsd.textContent = typeof formatUsdPrice === 'function' ? formatUsdPrice(originalPrice) : `$${originalPrice.toFixed(2)}`;
          }
        }
      }
    });
  });
}

// Expose globally
if (typeof window !== 'undefined') {
  window.updateStoreUI = updateStoreUI;
  window.updateStoreBalance = updateStoreBalance;
  window.updateItemPrices = updateItemPrices;
}

