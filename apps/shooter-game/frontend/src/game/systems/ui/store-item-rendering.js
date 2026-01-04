// ==========================================
// STORE ITEM RENDERING - Item Card Creation and Updates
// ==========================================
// Handles creating item cards and updating their visual states

console.log('✅ [STORE ITEM RENDERING] Store item rendering module loaded');

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
      if (badgeData.success && badgeData.hasBadge && badgeData.badge) {
        const discounts = window.BadgeService.getDiscountsForTier(badgeData.badge.tier);
        badgeDiscount = discounts.store;
      }
    }
  } catch (error) {
    console.warn('⚠️ [STORE ITEM RENDERING] Failed to get badge discount for item card:', error);
  }
  
  // Check if item has multiple levels
  const hasMultipleLevels = item.levels.length > 1;
  
  // Build level buttons HTML
  let levelsHTML = '';
  item.levels.forEach(levelData => {
    const level = levelData.level || 1;
    const quantity = typeof getItemQuantity === 'function' ? getItemQuantity(item.id, level) : 0;
    const hasQuantity = quantity > 0;
    
    // Apply badge discount to price
    const originalPrice = levelData.usdPrice;
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
    
    // Use prices from backend API if available, otherwise calculate
    let tokenPriceDisplay = '';
    const tokenSymbol = paymentToken === 'sui' ? 'SUI' : (paymentToken === 'usdc' ? 'USDC' : '$MEWS');
    
    if (levelData.prices && levelData.prices[paymentToken]) {
      // Use backend-provided price
      tokenPriceDisplay = levelData.prices[paymentToken].display || '';
    } else {
      // Fallback to calculated price
      if (typeof convertUsdToToken === 'function') {
        const tokenConversion = convertUsdToToken(levelData.usdPrice, paymentToken);
        tokenPriceDisplay = tokenConversion.formatted;
      } else {
        tokenPriceDisplay = 'N/A';
      }
    }
    
    const levelClass = hasMultipleLevels ? 'item-level-btn' : 'item-single-btn';
    const selectedClass = hasQuantity ? 'selected' : '';
    
    levelsHTML += `
      <div class="item-level-container ${selectedClass}" data-item-id="${item.id}" data-level="${level}">
        <div class="level-button-wrapper">
          <button class="${levelClass} ${selectedClass}" 
                  onclick="selectStoreItem('${item.id}', ${level})"
                  data-item-id="${item.id}"
                  data-level="${level}">
            <div class="level-info">
              <div class="level-name">${hasMultipleLevels ? `Level ${level}` : item.name}</div>
              <div class="level-effect">${levelData.effect}</div>
            </div>
            <div class="level-price">
              <div class="price-usd">${usdPriceHTML}</div>
              <div class="price-token">${tokenPriceDisplay} ${tokenSymbol}</div>
              ${badgeDiscount > 0 ? `<div class="badge-discount-badge" style="font-size: 0.75rem; color: #39ff14; margin-top: 0.25rem;">🎖️ ${badgeDiscount}% off</div>` : ''}
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

