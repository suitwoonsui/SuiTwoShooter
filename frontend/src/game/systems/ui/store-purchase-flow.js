// ==========================================
// STORE PURCHASE FLOW - Purchase Transaction Handling
// ==========================================
// Handles the complete purchase flow: validation, balance checking, transaction building, signing, and confirmation

console.log('✅ [STORE PURCHASE FLOW] Store purchase flow module loaded');

/**
 * Proceed to purchase - Backend API + Blockchain Integration
 */
async function proceedToPurchase() {
  // Update local state reference
  if (typeof updateStoreStateReference === 'function') {
    updateStoreStateReference();
  }
  const state = typeof getStoreState === 'function' ? getStoreState() : null;
  
  if (!state) {
    log.error('STORE PURCHASE FLOW', 'Store state not available');
    return;
  }
  
  log.debug('STORE PURCHASE FLOW', 'Proceeding to purchase', state.selectedItems);
  
  // Validate selections
  const selectedCount = Object.keys(state.selectedItems).filter(
    key => state.selectedItems[key] > 0
  ).length;
  
  if (selectedCount === 0) {
    if (typeof showToast === 'function') {
      showToast('Please select items to purchase', 'warning');
    } else {
      alert('Please select items to purchase');
    }
    return;
  }
  
  // Get wallet address - required for purchase
  let walletAddress = null;
  if (typeof getWalletAddress === 'function') {
    walletAddress = getWalletAddress();
  } else if (window.walletAPIInstance && window.walletAPIInstance.isConnected()) {
    walletAddress = window.walletAPIInstance.getAddress();
  }
  
  if (!walletAddress) {
    const errorMsg = 'Wallet not connected. Please connect your wallet to make a purchase.';
    if (typeof showToast === 'function') {
      showToast(errorMsg, 'error');
    } else {
      alert(errorMsg);
    }
    return;
  }
  
  // Get badge discount (if player has badge)
  let badgeDiscount = 0;
  try {
    if (window.BadgeService && window.BadgeService.getBadge) {
      const badgeData = await window.BadgeService.getBadge(walletAddress);
      if (badgeData.success && badgeData.hasBadge && badgeData.badge) {
        const discounts = window.BadgeService.getDiscountsForTier(badgeData.badge.tier);
        badgeDiscount = discounts.store; // Store discount percentage
        log.debug('STORE PURCHASE FLOW', `Badge discount applied: ${badgeDiscount}%`);
      }
    }
  } catch (error) {
    log.warn('STORE PURCHASE FLOW', 'Failed to get badge discount', error);
    // Continue without discount if badge check fails
  }

  // Calculate total USD and token amount needed (with discount applied)
  let totalUsd = 0;
  let totalUsdBeforeDiscount = 0;
  const items = [];
  
  for (const [key, quantity] of Object.entries(state.selectedItems)) {
    if (quantity > 0) {
      const [itemId, levelStr] = key.split('_');
      const level = parseInt(levelStr) || 1;
      
      items.push({
        itemId: itemId,
        level: level,
        quantity: quantity
      });
      
      // Calculate total for display
      // Try to get price from backend data, otherwise use fallback
      const item = typeof getItemById === 'function' ? getItemById(itemId) : null;
      if (item) {
        const levelData = typeof getItemLevelData === 'function' ? getItemLevelData(itemId, level) : null;
        if (levelData) {
          const itemPrice = levelData.usdPrice;
          totalUsdBeforeDiscount += itemPrice * quantity;
          
          // Apply badge discount
          const discountedPrice = badgeDiscount > 0 
            ? itemPrice * (1 - badgeDiscount / 100)
            : itemPrice;
          totalUsd += discountedPrice * quantity;
        }
      }
    }
  }
  
  // Log discount info
  if (badgeDiscount > 0) {
    const discountAmount = totalUsdBeforeDiscount - totalUsd;
    log.debug('STORE PURCHASE FLOW', `Discount: ${badgeDiscount}% off, Saved: $${discountAmount.toFixed(2)}`);
  }
  
  // Check balance before proceeding
  const proceedBtn = document.getElementById('proceedToPurchaseBtn');
  if (proceedBtn) {
    proceedBtn.disabled = true;
    proceedBtn.innerHTML = '<span class="btn-icon">⏳</span> Checking balance...';
  }
  
  try {
    // Calculate required token amount
    const tokenConversion = typeof convertUsdToToken === 'function' 
      ? convertUsdToToken(totalUsd, state.paymentToken)
      : { amount: 0, formatted: 'N/A' };
    const requiredTokenAmount = tokenConversion.amount;
    const tokenSymbol = state.paymentToken === 'sui' ? 'SUI' : (state.paymentToken === 'usdc' ? 'USDC' : '$MEWS');
    
    // Check user's balance using consolidated utility
    let userBalance = 0;
    const network = 'testnet'; // Store uses testnet
    
    if (!window.TokenBalanceUtils || typeof window.TokenBalanceUtils.fetchTokenBalance !== 'function') {
      throw new Error('Token balance utility not available');
    }
    
    const balanceResult = await window.TokenBalanceUtils.fetchTokenBalance(state.paymentToken, walletAddress, network);
    
    if (!balanceResult.success) {
      throw new Error(balanceResult.error || `Failed to check ${state.paymentToken.toUpperCase()} balance`);
    }
    
    userBalance = balanceResult.balance;
    
    log.debug('STORE PURCHASE FLOW', `${state.paymentToken.toUpperCase()} balance check`, {
      balance: userBalance,
      formattedBalance: balanceResult.formattedBalance
    });
    
    // Check payment token balance
    // For SUI: add 10% buffer for gas (SUI is both payment and gas token)
    // For USDC/MEWS: check exact amount (gas is paid separately in SUI)
    let requiredPaymentAmount;
    if (state.paymentToken === 'sui') {
      requiredPaymentAmount = requiredTokenAmount * 1.1; // 10% buffer for gas
    } else {
      requiredPaymentAmount = requiredTokenAmount; // Exact amount, no buffer (gas is separate)
    }
    
    // Check SUI balance for gas (always needed, even for USDC/MEWS purchases)
    let suiBalance = 0;
    let suiBalanceFormatted = '0';
    let requiredGas = 0;
    let requiredGasFormatted = '0';
    
    if (state.paymentToken !== 'sui') {
      // For USDC/MEWS purchases, check SUI balance for gas
      const suiBalanceResult = await window.TokenBalanceUtils.fetchTokenBalance('sui', walletAddress, network);
      
      if (!suiBalanceResult.success) {
        throw new Error(suiBalanceResult.error || 'Failed to check SUI balance for gas');
      }
      
      suiBalance = suiBalanceResult.balance;
      suiBalanceFormatted = suiBalanceResult.formattedBalance;
      
      // Gas budget with 15% buffer (matching backend: gasBudget * 1.15)
      // Default gas budget: ~0.001 SUI (1,000,000 MIST), with 15% buffer = 0.00115 SUI
      // Using a conservative estimate of 0.002 SUI to be safe
      const gasBudget = 0.002; // 0.002 SUI for gas (conservative estimate)
      requiredGas = gasBudget;
      requiredGasFormatted = gasBudget.toFixed(4);
      
      log.debug('STORE PURCHASE FLOW', 'SUI balance check for gas', {
        balance: suiBalance,
        formattedBalance: suiBalanceFormatted,
        requiredGas: requiredGas,
        requiredGasFormatted: requiredGasFormatted
      });
      
      // Check if user has enough SUI for gas
      if (suiBalance < requiredGas) {
        const shortfall = requiredGas - suiBalance;
        const shortfallFormatted = shortfall.toFixed(4);
        
        // Show modal popup for insufficient SUI gas
        if (typeof showInsufficientBalanceModal === 'function') {
          showInsufficientBalanceModal({
            required: requiredGasFormatted,
            balance: suiBalanceFormatted,
            shortfall: shortfallFormatted,
            tokenSymbol: 'SUI',
            customMessage: `Insufficient SUI balance for gas fees. Need ${requiredGasFormatted} SUI, have ${suiBalanceFormatted} SUI.`
          });
        }
        
        if (proceedBtn) {
          proceedBtn.disabled = false;
          proceedBtn.innerHTML = '<span class="btn-icon">💳</span> Proceed to Purchase';
        }
        return;
      }
    }
    
    // Check payment token balance
    if (userBalance < requiredPaymentAmount) {
      const shortfall = requiredPaymentAmount - userBalance;
      const shortfallFormatted = typeof formatTokenAmount === 'function' 
        ? formatTokenAmount(shortfall, state.paymentToken)
        : shortfall.toString();
      const requiredFormatted = typeof formatTokenAmount === 'function'
        ? formatTokenAmount(requiredPaymentAmount, state.paymentToken)
        : requiredPaymentAmount.toString();
      const balanceFormatted = typeof formatTokenAmount === 'function'
        ? formatTokenAmount(userBalance, state.paymentToken)
        : userBalance.toString();
      
      // Show modal popup instead of toast
      if (typeof showInsufficientBalanceModal === 'function') {
        showInsufficientBalanceModal({
          required: requiredFormatted,
          balance: balanceFormatted,
          shortfall: shortfallFormatted,
          tokenSymbol: tokenSymbol
        });
      }
      
      if (proceedBtn) {
        proceedBtn.disabled = false;
        proceedBtn.innerHTML = '<span class="btn-icon">💳</span> Proceed to Purchase';
      }
      return;
    }
    
    log.debug('STORE PURCHASE FLOW', 'Balance check passed', {
      requiredPayment: requiredTokenAmount,
      requiredWithGas: state.paymentToken === 'sui' ? requiredPaymentAmount : requiredTokenAmount,
      paymentTokenBalance: userBalance,
      suiBalance: state.paymentToken === 'sui' ? userBalance : suiBalance,
      requiredGas: state.paymentToken === 'sui' ? (requiredPaymentAmount - requiredTokenAmount) : requiredGas,
      token: state.paymentToken
    });
  } catch (balanceError) {
    log.error('STORE PURCHASE FLOW', 'Balance check error', balanceError);
    const errorMsg = `Failed to check balance: ${balanceError.message || 'Unknown error'}`;
    
    // Show error modal
    if (typeof showInsufficientBalanceModal === 'function') {
      showInsufficientBalanceModal({
        required: '--',
        balance: '--',
        shortfall: '--',
        tokenSymbol: state.paymentToken === 'sui' ? 'SUI' : (state.paymentToken === 'usdc' ? 'USDC' : '$MEWS'),
        customMessage: errorMsg
      });
    }
    
    if (proceedBtn) {
      proceedBtn.disabled = false;
      proceedBtn.innerHTML = '<span class="btn-icon">💳</span> Proceed to Purchase';
    }
    return;
  }
  
  // Show loading state
  state.isLoading = true;
  if (proceedBtn) {
    proceedBtn.disabled = true;
    proceedBtn.innerHTML = '<span class="btn-icon">⏳</span> Building transaction...';
  }
  
  try {
    // Get API base URL from config (set by api-config.js)
    const API_BASE_URL = window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3000/api';
    log.debug('STORE PURCHASE FLOW', 'Purchase using API Base URL', API_BASE_URL);
    
    // Convert payment token to backend format (uppercase)
    const paymentToken = state.paymentToken.toUpperCase();
    
    // Step 1: Call backend to build transaction
    proceedBtn.innerHTML = '<span class="btn-icon">⏳</span> Building transaction...';
    
    const purchaseResponse = await fetch(`${API_BASE_URL}/store/purchase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        playerAddress: walletAddress,
        items: items,
        paymentToken: paymentToken,
        badgeDiscount: badgeDiscount  // Send badge discount to backend for validation
      })
    });
    
    if (!purchaseResponse.ok) {
      const errorData = await purchaseResponse.json().catch(() => ({}));
      throw new Error(errorData.error || `Purchase failed: ${purchaseResponse.status} ${purchaseResponse.statusText}`);
    }
    
    const purchaseData = await purchaseResponse.json();
    
    if (!purchaseData.success || !purchaseData.transaction) {
      throw new Error(purchaseData.error || 'Failed to build purchase transaction');
    }
    
    log.debug('STORE PURCHASE FLOW', 'Transaction built', {
      totalUSD: purchaseData.totalUSD,
      totalToken: purchaseData.totalToken,
      paymentToken: purchaseData.paymentToken,
      gasEstimate: purchaseData.gasEstimate
    });
    
    // Format the actual transaction amount for display
    const tokenSymbol = purchaseData.paymentToken === 'SUI' ? 'SUI' : (purchaseData.paymentToken === 'USDC' ? 'USDC' : '$MEWS');
    let formattedTokenAmount = '';
    
    if (purchaseData.paymentToken === 'SUI') {
      const suiAmount = parseFloat(purchaseData.totalToken) / 1_000_000_000;
      formattedTokenAmount = suiAmount.toFixed(6);
    } else if (purchaseData.paymentToken === 'MEWS') {
      // MEWS uses 9 decimals on testnet, 6 on mainnet
      const mewsDecimals = 9; // Assuming testnet for now
      const mewsAmount = parseFloat(purchaseData.totalToken) / Math.pow(10, mewsDecimals);
      formattedTokenAmount = mewsAmount.toFixed(6);
    } else if (purchaseData.paymentToken === 'USDC') {
      const usdcAmount = parseFloat(purchaseData.totalToken) / 1_000_000;
      formattedTokenAmount = usdcAmount.toFixed(2);
    }
    
    // Show confirmation with actual transaction amount
    const confirmMessage = `Confirm Purchase\n\n` +
      `Total: $${purchaseData.totalUSD} USD\n` +
      `Amount: ${formattedTokenAmount} ${tokenSymbol}\n\n` +
      `This is the exact amount that will be charged.`;
    
    if (!confirm(confirmMessage)) {
      log.debug('STORE PURCHASE FLOW', 'Purchase cancelled by user');
      return;
    }
    
    // Step 2: Sign and execute transaction
    proceedBtn.innerHTML = '<span class="btn-icon">⏳</span> Signing transaction...';
    
    // Check if wallet API is available
    if (!window.walletAPIInstance || !window.walletAPIInstance.isConnected()) {
      throw new Error('Wallet not connected. Please connect your wallet.');
    }
    
    // Pass the base64 string directly to wallet API
    // dapp-kit accepts base64 strings directly (as seen in Insomnia's implementation)
    // The wallet API will handle conversion if needed
    const signResult = await window.walletAPIInstance.signAndExecuteTransaction(purchaseData.transaction);
    
    if (!signResult.success) {
      throw new Error(signResult.error || 'Transaction signing failed');
    }
    
    log.debug('STORE PURCHASE FLOW', 'Transaction signed and submitted', signResult.digest);
    
    // Step 3: Poll for confirmation
    proceedBtn.innerHTML = '<span class="btn-icon">⏳</span> Waiting for confirmation...';
    
    const transactionDigest = signResult.digest;
    let confirmed = false;
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max
    
    while (!confirmed && attempts < maxAttempts) {
      // Optimized: 1000ms → 500ms (transaction confirmation is usually faster)
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
      
      try {
        const statusResponse = await fetch(`${API_BASE_URL}/store/transaction/${transactionDigest}`);
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          if (statusData.confirmed) {
            confirmed = true;
            break;
          }
        }
      } catch (error) {
        log.warn('STORE PURCHASE FLOW', 'Error checking transaction status', error);
      }
    }
    
    if (!confirmed) {
      log.warn('STORE PURCHASE FLOW', 'Transaction submitted but confirmation timeout. It may still be processing.');
    }
    
    // Step 4: Clear selection and refresh inventory
    state.selectedItems = {};
    // Update StoreService state if available
    if (typeof StoreService !== 'undefined' && StoreService._state) {
      StoreService._state.selectedItems = {};
    }
    
    // Invalidate API request cache for purchase
    // Use the walletAddress already set at the top of the function
    if (window.apiRequestCache && walletAddress && confirmed) {
      window.apiRequestCache.recordTransaction(walletAddress, transactionDigest, 'store_purchase');
      log.debug('STORE PURCHASE FLOW', 'API cache invalidated for purchase');
    }
    
    // Small delay to ensure blockchain state is updated after transaction confirmation
    if (confirmed) {
      // Optimized: 500ms → 200ms (state update is usually faster)
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Reload items and inventory (will fetch fresh data, bypassing cache if invalidated)
    if (typeof loadStoreItems === 'function') {
      await loadStoreItems();
    }
    if (typeof loadInventoryDisplay === 'function') {
      await loadInventoryDisplay();
    }
    
    // Refresh balance display after transaction (important: balance changed after purchase)
    // This ensures the displayed balance reflects the new balance after the purchase
    if (typeof updateStoreBalance === 'function') {
      log.debug('STORE PURCHASE FLOW', 'Refreshing balance after purchase');
      await updateStoreBalance();
    }
    
    if (typeof updateStoreUI === 'function') {
      await updateStoreUI();
    }
    
    // Show success message
    const successMsg = confirmed 
      ? `Purchase confirmed! Transaction: ${transactionDigest.slice(0, 8)}...`
      : `Purchase submitted! Transaction: ${transactionDigest.slice(0, 8)}... (confirming...)`;
    
    if (typeof showToast === 'function') {
      showToast(successMsg, 'success');
    } else {
      alert(`Purchase Successful!\n\n${successMsg}\n\nTotal: ${purchaseData.totalUSD} ${purchaseData.paymentToken}`);
    }
    
    log.debug('STORE PURCHASE FLOW', 'Purchase completed', {
      digest: transactionDigest,
      confirmed: confirmed,
      items: items
    });
    
  } catch (error) {
    log.error('STORE PURCHASE FLOW', 'Purchase error', error);
    
    const errorMsg = error.message || 'Unknown error occurred';
    if (typeof showToast === 'function') {
      showToast(`Purchase failed: ${errorMsg}`, 'error');
    } else {
      alert(`Purchase failed: ${errorMsg}`);
    }
  } finally {
    // Reset loading state
    state.isLoading = false;
    if (proceedBtn) {
      proceedBtn.disabled = false;
      proceedBtn.innerHTML = '<span class="btn-icon">💳</span> Proceed to Purchase';
    }
  }
}

/**
 * Show insufficient balance modal popup
 */
function showInsufficientBalanceModal({ required, balance, shortfall, tokenSymbol, customMessage }) {
  const viewportContainer = document.querySelector('.viewport-container');
  if (!viewportContainer) {
    console.error('❌ [STORE PURCHASE FLOW] Viewport container not found!');
    return;
  }
  
  // Remove existing modal if any
  const existingModal = document.getElementById('insufficientBalanceModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // Create modal
  const modal = document.createElement('div');
  modal.id = 'insufficientBalanceModal';
  modal.className = 'store-balance-error-modal store-balance-error-modal-visible';
  
  const bodyContent = customMessage 
    ? `<p style="color: #ff6b6b;">${customMessage}</p>`
    : `
      <p>You don't have enough ${tokenSymbol} to complete this purchase.</p>
      <div class="store-balance-error-details">
        <div class="balance-detail">
          <span class="balance-label">Required:</span>
          <span class="balance-value">${required} ${tokenSymbol}</span>
        </div>
        <div class="balance-detail">
          <span class="balance-label">Your Balance:</span>
          <span class="balance-value">${balance} ${tokenSymbol}</span>
        </div>
        <div class="balance-detail shortfall">
          <span class="balance-label">Shortfall:</span>
          <span class="balance-value">${shortfall} ${tokenSymbol}</span>
        </div>
      </div>
      <p style="font-size: 0.9em; color: #888; margin-top: 15px;">
        Please add more ${tokenSymbol} to your wallet and try again.
      </p>
    `;
  
  modal.innerHTML = `
    <div class="store-balance-error-content">
      <div class="store-balance-error-header">
        <h2>⚠️ ${customMessage ? 'Error' : 'Insufficient Balance'}</h2>
      </div>
      <div class="store-balance-error-body">
        ${bodyContent}
      </div>
      <div class="store-balance-error-actions">
        <button class="menu-btn primary" onclick="closeInsufficientBalanceModal(event)">
          <span class="btn-icon">✓</span> OK
        </button>
      </div>
    </div>
  `;
  
  viewportContainer.appendChild(modal);
  
  // Add backdrop click handler
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeInsufficientBalanceModal();
    }
  });
}

/**
 * Close insufficient balance modal
 * @param {Event} event - Click event (optional, used to stop propagation)
 */
function closeInsufficientBalanceModal(event) {
  // Stop event propagation to prevent click-outside handler from closing the store
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  
  const modal = document.getElementById('insufficientBalanceModal');
  if (modal) {
    modal.classList.remove('store-balance-error-modal-visible');
    modal.classList.add('store-balance-error-modal-hidden');
    // Remove from DOM after animation
    setTimeout(() => {
      modal.remove();
    }, 300);
  }
}

// Expose globally
if (typeof window !== 'undefined') {
  window.proceedToPurchase = proceedToPurchase;
  window.showInsufficientBalanceModal = showInsufficientBalanceModal;
  window.closeInsufficientBalanceModal = closeInsufficientBalanceModal;
}

