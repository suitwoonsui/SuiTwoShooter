// ==========================================
// STORE ITEM RENDERING - Item Card Creation and Updates
// ==========================================
// Handles creating item cards and updating their visual states

console.log('✅ [STORE ITEM RENDERING] Store item rendering module loaded');

function getStoreOffersMap() {
  const state = typeof getStoreState === 'function' ? getStoreState() : null;
  return state?.storeOffers || null;
}

function toDynamicProvisionKey(raw) {
  return (window.StoreOfferUtils && window.StoreOfferUtils.toDynamicProvisionKey)
    ? window.StoreOfferUtils.toDynamicProvisionKey(raw)
    : String(raw || '')
        .trim()
        .replace(/[-\s]+/g, '_')
        .replace(/([A-Z])/g, '_$1')
        .replace(/^_+/, '')
        .toLowerCase();
}

/**
 * Create item card element
 */
async function createItemCard(item) {
  const card = document.createElement('div');
  card.className = 'store-item-card';
  card.setAttribute('data-item-id', item.id);
  
  // Get badge discount if available
  let badgeDiscount = 0;
  try {
    const walletAddress = window.walletAPIInstance && window.walletAPIInstance.isConnected()
      ? window.walletAPIInstance.getAddress()
      : null;
    
    if (walletAddress && window.BadgeService && window.BadgeService.getBadge) {
      const badgeData = await window.BadgeService.getBadge(walletAddress);
      console.log('🔍 [STORE ITEM RENDERING] Badge check result:', {
        success: badgeData?.success,
        hasBadge: badgeData?.hasBadge,
        badgeExists: !!badgeData?.badge,
        tier: badgeData?.badge?.tier,
        badgeId: badgeData?.badge?.badgeId,
        fullResponse: badgeData
      });
      
      if (
        badgeData &&
        badgeData.success === true &&
        badgeData.hasBadge === true &&
        badgeData.badge &&
        typeof window.getStoreBadgeDiscountPercent === 'function'
      ) {
        badgeDiscount = window.getStoreBadgeDiscountPercent(badgeData.badge);
        console.log('✅ [STORE ITEM RENDERING] Badge discount found:', badgeDiscount, '% (tier', badgeData.badge.tier, ')');
      } else {
        console.log('✅ [STORE ITEM RENDERING] No badge discount - hasBadge:', badgeData?.hasBadge, 'badge:', !!badgeData?.badge, 'tier:', badgeData?.badge?.tier);
      }
    }
  } catch (error) {
    console.warn('⚠️ [STORE ITEM RENDERING] Failed to get badge discount for item card:', error);
    // Ensure discount is 0 on error
    badgeDiscount = 0;
  }
  
  const levels = Array.isArray(item?.levels) ? item.levels : [];
  const hasLevels = levels.length > 0;
  const hasMultipleLevels = levels.length > 1;
  
  // Build level buttons HTML
  let levelsHTML = '';
  const renderLevels = hasLevels ? levels : (function buildBaseLevel() {
    // For no-level items, price may live only in the offers map (Stockroom item listing base offerId = "<itemId>").
    const id = String(item?.id || '').trim();
    const dyn = toDynamicProvisionKey(id);
    const resolvedOfferId =
      (window.StoreOfferUtils && window.StoreOfferUtils.resolveOfferIdForItemLevel)
        ? window.StoreOfferUtils.resolveOfferIdForItemLevel(id, 1)
        : null;
    const offerUsd =
      (window.StoreOfferUtils && window.StoreOfferUtils.resolveUsdUnitPrice)
        ? window.StoreOfferUtils.resolveUsdUnitPrice({ itemId: id, level: 1 })
        : null;
    const directUsd =
      (item?.usdPrice != null && Number(item.usdPrice) >= 0)
        ? Number(item.usdPrice)
        : ((item?.priceUsdCents != null && Number(item.priceUsdCents) >= 0)
          ? Number(item.priceUsdCents) / 100
          : null);
    return [{
    level: 1,
    effect: item?.effect || item?.description || '',
    usdPrice:
      (directUsd != null ? directUsd : (offerUsd != null ? offerUsd : 0)),
    prices: item?.prices,
    }];
  })();

  renderLevels.forEach(levelData => {
    const level = levelData.level || 1;
    const quantity = typeof getItemQuantity === 'function' ? getItemQuantity(item.id, level) : 0;
    const hasQuantity = quantity > 0;
    
    // Apply badge discount to price
    const originalPrice = Number(levelData.usdPrice || 0);
    const discountedPrice = badgeDiscount > 0 
      ? originalPrice * (1 - badgeDiscount / 100)
      : originalPrice;
    
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
    
    // Get payment token from state
    let paymentToken = 'mews';
    if (typeof getStoreState === 'function') {
      const state = getStoreState();
      paymentToken = state.paymentToken || 'mews';
    } else if (typeof StoreService !== 'undefined' && StoreService.getState) {
      const state = StoreService.getState();
      paymentToken = state.paymentToken || 'mews';
    }
    
    // Always recalculate using fresh prices from state to ensure consistency with purchase API
    // This ensures the displayed price matches what the wallet will show
    let tokenPriceDisplay = '';
    const tokenSymbol = paymentToken === 'sui' ? 'SUI' : (paymentToken === 'usdc' ? 'USDC' : 'MEWS');
    
    // Get fresh prices from state (same ones used by purchase API)
    let freshPrices = null;
    if (typeof getStoreState === 'function') {
      const state = getStoreState();
      freshPrices = state?.tokenPrices;
    } else if (typeof StoreService !== 'undefined' && StoreService.getState) {
      const state = StoreService.getState();
      freshPrices = state?.tokenPrices;
    }
    
    if (freshPrices && typeof convertUsdToToken === 'function') {
      // Always recalculate using fresh prices to match purchase API
      const tokenConversion = convertUsdToToken(usdPrice, paymentToken, freshPrices);
      tokenPriceDisplay = tokenConversion.formatted;
      // Log full calculation details
      const calculation = usdPrice / freshPrices[paymentToken];
      console.log('💰 [STORE ITEM RENDERING] Price calculation for display', {
        itemId: item.id,
        level,
        usdPrice,
        paymentToken,
        tokenPrice: freshPrices[paymentToken],
        rawCalculation: calculation,
        calculatedAmount: tokenConversion.amount,
        displayAmount: tokenPriceDisplay,
        formattedDetails: {
          calculation: `${usdPrice} / ${freshPrices[paymentToken]} = ${calculation}`,
          expectedResult: `${calculation} ${paymentToken.toUpperCase()}`,
        },
      });
    } else if (levelData.prices && levelData.prices[paymentToken] && levelData.prices[paymentToken].display) {
      // Fallback to backend-provided price if fresh prices not available
      tokenPriceDisplay = levelData.prices[paymentToken].display;
      console.warn('⚠️ [STORE ITEM RENDERING] Using backend-provided price (fresh prices not available)', {
        itemId: item.id,
        level,
        paymentToken,
        backendDisplay: tokenPriceDisplay,
        backendAmount: levelData.prices[paymentToken].amount,
        usdPrice,
      });
    } else {
      // Last resort: calculate without prices
      if (typeof convertUsdToToken === 'function') {
        const tokenConversion = convertUsdToToken(usdPrice, paymentToken);
        tokenPriceDisplay = tokenConversion.formatted;
      } else {
        tokenPriceDisplay = 'N/A';
      }
    }
    
    const levelClass = hasMultipleLevels ? 'item-level-btn' : 'item-single-btn';
    const selectedClass = hasQuantity ? 'selected' : '';
    
    const offerId =
      (window.StoreOfferUtils && window.StoreOfferUtils.resolveOfferIdForItemLevel)
        ? window.StoreOfferUtils.resolveOfferIdForItemLevel(item.id, level)
        : null;
    const isLevelLessSingle = !hasLevels; // item has no levels array in Provisions
    const onClick =
      (isLevelLessSingle && offerId)
        ? `selectStoreOffer('${offerId}')`
        : `selectStoreItem('${item.id}', ${level})`;

    levelsHTML += `
      <div class="item-level-container ${selectedClass}" data-item-id="${item.id}" data-level="${level}">
        <div class="level-button-wrapper">
          <button class="${levelClass} ${selectedClass}" 
                  onclick="${onClick}"
                  data-item-id="${item.id}"
                  data-level="${level}">
            <div class="level-info">
              <div class="level-name">${hasMultipleLevels ? `Level ${level}` : item.name}</div>
              <div class="level-effect">${levelData.effect || ''}</div>
            </div>
            <div class="level-price">
              <div class="price-usd">${usdPriceHTML}</div>
              <div class="price-token">${tokenPriceDisplay} ${tokenSymbol}</div>
              ${badgeDiscount > 0 ? `<div class="badge-discount-badge" style="font-size: 0.75rem; color: #39ff14; margin-top: 0.25rem;">Badge: ${badgeDiscount}% off</div>` : ''}
            </div>
          </button>
          ${hasQuantity ? `
            <button class="level-clear-btn" onclick="clearLevelSelection('${item.id}', ${level}, event)" title="Clear this level">
              ✕
            </button>
          ` : ''}
        </div>
        ${hasQuantity ? `
          <div class="item-quantity-controls">
            <button class="quantity-btn quantity-decrease" onclick="removeItemFromSelection('${item.id}', ${level}, event)" title="Decrease quantity">−</button>
            <span class="quantity-display">${quantity}</span>
            <button class="quantity-btn quantity-increase" onclick="addItemToSelection('${item.id}', ${level})" title="Increase quantity">+</button>
          </div>
        ` : ''}
      </div>
    `;
  });
  
  card.innerHTML = `
    <div class="item-header">
      <div class="item-icon">${item.icon}</div>
      <div class="item-info">
        <h3 class="item-name">${item.name}</h3>
        <p class="item-description">${item.description}</p>
      </div>
    </div>
    <div class="item-levels">
      ${levelsHTML}
    </div>
  `;
  
  return card;
}

/**
 * Update visual states of item cards (selected/disabled)
 */
function updateItemCardStates() {
  const cards = document.querySelectorAll('.store-item-card');
  
  cards.forEach(card => {
    const itemId = card.getAttribute('data-item-id');
    const item = typeof getItemById === 'function' ? getItemById(itemId) : null;
    if (!item) return;
    
    // Get all level containers for this item
    const levelContainers = card.querySelectorAll('.item-level-container');
    let hasAnySelection = false;
    
    levelContainers.forEach(container => {
      const level = parseInt(container.getAttribute('data-level')) || 1;
      const quantity = typeof getItemQuantity === 'function' ? getItemQuantity(itemId, level) : 0;
      const hasQuantity = quantity > 0;
      
      const button = container.querySelector('.item-level-btn, .item-single-btn');
      const quantityControls = container.querySelector('.item-quantity-controls');
      
      // Update selected state
      if (hasQuantity) {
        button.classList.add('selected');
        container.classList.add('selected');
        hasAnySelection = true;
        
        // Show quantity controls if not already shown
        if (!quantityControls) {
          // Recreate the level container with quantity controls
          // This will be handled by reloading items, but for now just update display
          const levelData = typeof getItemLevelData === 'function' ? getItemLevelData(itemId, level) : null;
          if (levelData) {
            const controlsHTML = `
              <div class="item-quantity-controls">
                <button class="quantity-btn quantity-decrease" onclick="removeItemFromSelection('${itemId}', ${level}, event)" title="Decrease quantity">−</button>
                <span class="quantity-display">${quantity}</span>
                <button class="quantity-btn quantity-increase" onclick="addItemToSelection('${itemId}', ${level})" title="Increase quantity">+</button>
              </div>
            `;
            container.insertAdjacentHTML('beforeend', controlsHTML);
          }
        } else {
          // Update existing quantity display
          const quantityDisplay = quantityControls.querySelector('.quantity-display');
          if (quantityDisplay) {
            quantityDisplay.textContent = quantity;
          }
        }
      } else {
        button.classList.remove('selected');
        container.classList.remove('selected');
        
        // Remove quantity controls if they exist
        if (quantityControls) {
          quantityControls.remove();
        }
      }
      
      // No disabled state needed - users can select multiple items/levels
      button.classList.remove('disabled');
    });
    
    // Update card selected state
    if (hasAnySelection) {
      card.classList.add('selected');
    } else {
      card.classList.remove('selected');
    }
    
    // Update clear buttons for each level
    levelContainers.forEach(container => {
      const level = parseInt(container.getAttribute('data-level')) || 1;
      const quantity = typeof getItemQuantity === 'function' ? getItemQuantity(itemId, level) : 0;
      const hasQuantity = quantity > 0;
      
      const levelButtonWrapper = container.querySelector('.level-button-wrapper');
      const existingClearBtn = container.querySelector('.level-clear-btn');
      
      if (hasQuantity && !existingClearBtn && levelButtonWrapper) {
        // Add clear button
        const clearBtnHTML = `<button class="level-clear-btn" onclick="clearLevelSelection('${itemId}', ${level}, event)" title="Clear this level">✕</button>`;
        levelButtonWrapper.insertAdjacentHTML('beforeend', clearBtnHTML);
      } else if (!hasQuantity && existingClearBtn) {
        // Remove clear button
        existingClearBtn.remove();
      }
    });
  });
}

// Expose globally
if (typeof window !== 'undefined') {
  window.createItemCard = createItemCard;
  window.updateItemCardStates = updateItemCardStates;
}

