// ==========================================
// STORE UI UPDATES - UI Update Functions
// ==========================================
// Handles updating the store UI: selected items summary, balance display, and item prices

console.log('✅ [STORE UI UPDATES] Store UI updates module loaded');

/**
 * Update store UI based on current state (with badge discount)
 */
async function updateStoreUI() {
  const summary = document.getElementById('storeSelectedSummary');
  const selectedList = document.getElementById('selectedItemsList');
  const totalElement = document.getElementById('storeTotal');
  const proceedBtn = document.getElementById('proceedToPurchaseBtn');
  
  if (!summary || !selectedList) return;
  
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
  
  // Process all selected items (format: itemId_level: quantity)
  for (const [key, quantity] of Object.entries(state.selectedItems)) {
    if (quantity > 0) {
      // Parse key (format: "itemId_level")
      const [itemId, levelStr] = key.split('_');
      const level = parseInt(levelStr) || 1;
      
      const item = typeof getItemById === 'function' ? getItemById(itemId) : null;
      if (item) {
        const levelData = typeof getItemLevelData === 'function' ? getItemLevelData(itemId, level) : null;
        if (levelData) {
          const itemName = item.levels.length > 1 ? `${item.name} Level ${level}` : item.name;
          const originalPrice = levelData.usdPrice;
          const discountedPrice = badgeDiscount > 0 
            ? originalPrice * (1 - badgeDiscount / 100)
            : originalPrice;
          
          const itemTotalBeforeDiscount = originalPrice * quantity;
          const itemTotal = discountedPrice * quantity;
          
          totalUsdBeforeDiscount += itemTotalBeforeDiscount;
          totalUsd += itemTotal;
          
          selectedItems.push({
            key: key,
            itemId: itemId,
            level: level,
            name: itemName,
            quantity: quantity,
            unitPrice: originalPrice,
            unitPriceDiscounted: discountedPrice,
            totalPrice: itemTotal,
            totalPriceBeforeDiscount: itemTotalBeforeDiscount
          });
          selectedCount += quantity;
        }
      }
    }
  }
  
  // Show/hide summary based on selections
  if (selectedCount > 0) {
    summary.style.display = 'block';
    
    // Update selected items list with click handlers (show discounted prices)
    selectedList.innerHTML = selectedItems.map(item => {
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
      
      return `<div class="selected-item" data-item-key="${item.key}" onclick="removeItemFromSelection('${item.itemId}', ${item.level}, event)" title="Click to remove one">
        <span class="selected-item-name">${item.name}${item.quantity > 1 ? ` × ${item.quantity}` : ''}</span>
        <span class="selected-item-price">${priceHTML}${unitPriceHTML}</span>
      </div>`;
    }).join('');
    
    // Update total (with discount display)
    const tokenConversion = typeof convertUsdToToken === 'function' 
      ? convertUsdToToken(totalUsd, state.paymentToken)
      : { formatted: '0', amount: 0 };
    const tokenSymbol = state.paymentToken === 'sui' ? 'SUI' : (state.paymentToken === 'usdc' ? 'USDC' : '$MEWS');
    
    if (totalElement) {
      let totalHTML = '';
      if (badgeDiscount > 0 && totalUsd < totalUsdBeforeDiscount) {
        const discountAmount = totalUsdBeforeDiscount - totalUsd;
        const originalTotal = typeof formatUsdPrice === 'function' ? formatUsdPrice(totalUsdBeforeDiscount) : `$${totalUsdBeforeDiscount.toFixed(2)}`;
        const discountedTotal = typeof formatUsdPrice === 'function' ? formatUsdPrice(totalUsd) : `$${totalUsd.toFixed(2)}`;
        const savedAmount = typeof formatUsdPrice === 'function' ? formatUsdPrice(discountAmount) : `$${discountAmount.toFixed(2)}`;
        totalHTML = `<span>Total: <span style="text-decoration: line-through; opacity: 0.6;">${originalTotal}</span> <span style="color: #39ff14;">${discountedTotal}</span> (${tokenConversion.formatted} ${tokenSymbol}) <span style="color: #39ff14; font-size: 0.9em;">🎖️ ${badgeDiscount}% off (Save ${savedAmount})</span></span>`;
      } else {
        const totalFormatted = typeof formatUsdPrice === 'function' ? formatUsdPrice(totalUsd) : `$${totalUsd.toFixed(2)}`;
        totalHTML = `<span>Total: ${totalFormatted} (${tokenConversion.formatted} ${tokenSymbol})</span>`;
      }
      totalElement.innerHTML = totalHTML;
    }
    
    // Enable proceed button
    if (proceedBtn) {
      proceedBtn.disabled = false;
    }
    
    // Update item card visual states
    if (typeof updateItemCardStates === 'function') {
      updateItemCardStates();
    }
  } else {
    summary.style.display = 'none';
    
    // Disable proceed button
    if (proceedBtn) {
      proceedBtn.disabled = true;
    }
    
    // Update item card visual states
    if (typeof updateItemCardStates === 'function') {
      updateItemCardStates();
    }
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
        balanceValue.textContent = `${balanceResult.formattedBalance} $MEWS`;
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
        const discounts = window.BadgeService.getDiscountsForTier(badgeData.badge.tier);
        badgeDiscount = discounts.store;
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
        const originalPrice = levelData.usdPrice;
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
        const tokenSymbol = state.paymentToken === 'sui' ? 'SUI' : (state.paymentToken === 'usdc' ? 'USDC' : '$MEWS');
        
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

