// ==========================================
// STORE PURCHASE FLOW - Purchase Transaction Handling
// ==========================================
// Handles the complete purchase flow: validation, balance checking, transaction building, signing, and confirmation

console.log('✅ [STORE PURCHASE FLOW] Store purchase flow module loaded');

const STORE_CART_PURCHASE_BTN_IDLE_HTML = '<span class="btn-icon">💳</span> Purchase';

function formatStorePurchaseErrorForUser(err) {
  const msg = err?.message || String(err);
  if (/\b503\b|\b502\b|\b504\b|\b429\b|Unexpected status code|ECONNRESET|fetch failed|Service Unavailable/i.test(msg)) {
    return 'Sui RPC returned a temporary error (for example HTTP 503). Wait a moment and try again. If it persists, check your wallet’s network / RPC settings.';
  }
  return msg;
}

function forEachStoreCartPurchaseButton(fn) {
  document.querySelectorAll('[data-store-cart-purchase]').forEach(fn);
}

function setStoreCartPurchaseButtonsLoading(innerHTML) {
  forEachStoreCartPurchaseButton((btn) => {
    btn.disabled = true;
    btn.innerHTML = innerHTML;
  });
}

function restoreStoreCartPurchaseButtonsIdle() {
  forEachStoreCartPurchaseButton((btn) => {
    btn.innerHTML = STORE_CART_PURCHASE_BTN_IDLE_HTML;
  });
}

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
  
  log.debug('STORE PURCHASE FLOW', 'Proceeding to purchase', state.selectedOffers);
  
  // Validate selections
  const selectedCount = Object.entries(state.selectedOffers || {}).reduce((acc, [, qty]) => acc + (qty > 0 ? qty : 0), 0);
  
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
      log.debug('STORE PURCHASE FLOW', 'Badge check result:', {
        success: badgeData?.success,
        hasBadge: badgeData?.hasBadge,
        badgeExists: !!badgeData?.badge,
        tier: badgeData?.badge?.tier,
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
        log.debug('STORE PURCHASE FLOW', `Badge discount applied: ${badgeDiscount}% (tier ${badgeData.badge.tier})`);
      } else {
        log.debug('STORE PURCHASE FLOW', 'No badge discount - hasBadge:', badgeData?.hasBadge, 'badge:', !!badgeData?.badge, 'tier:', badgeData?.badge?.tier);
        badgeDiscount = 0;
      }
    }
  } catch (error) {
    log.warn('STORE PURCHASE FLOW', 'Failed to get badge discount', error);
    // Ensure discount is 0 on error
    badgeDiscount = 0;
  }

  // Calculate total USD and token amount needed (with discount applied)
  let totalUsd = 0;
  let totalUsdBeforeDiscount = 0;
  const lines = [];

  const offers = state.storeOffers && typeof state.storeOffers === 'object' ? state.storeOffers : null;
  const selectedOffers = state.selectedOffers && typeof state.selectedOffers === 'object' ? state.selectedOffers : null;

  if (!offers || !selectedOffers) {
    throw new Error('Store offers not loaded. Please reopen the store.');
  }
  for (const [offerId, quantity] of Object.entries(selectedOffers)) {
    if (!(quantity > 0)) continue;
    const offer = offers[offerId];
    if (!offer) continue;
    const rawCents = offer?.priceUsdCents ?? offer?.price_usd_cents;
    const cents = Number(rawCents ?? 0);
    const unitUsd = Number.isFinite(cents) ? Math.max(0, cents) / 100 : 0;

    lines.push({ offerId, redeemCount: quantity });

    totalUsdBeforeDiscount += unitUsd * quantity;
    const discounted = badgeDiscount > 0 ? unitUsd * (1 - badgeDiscount / 100) : unitUsd;
    totalUsd += discounted * quantity;
  }
  
  // Log discount info
  if (badgeDiscount > 0) {
    const discountAmount = totalUsdBeforeDiscount - totalUsd;
    log.debug('STORE PURCHASE FLOW', `Discount: ${badgeDiscount}% off, Saved: $${discountAmount.toFixed(2)}`);
  }
  
  // Check balance before proceeding
  setStoreCartPurchaseButtonsLoading('<span class="btn-icon">⏳</span> Checking balance...');

  try {
    const tokenConversion =
      typeof convertUsdToToken === 'function'
        ? convertUsdToToken(totalUsd, state.paymentToken)
        : { amount: 0, formatted: 'N/A' };
    const requiredTokenAmount = tokenConversion.amount;
    const tokenSymbol = state.paymentToken === 'sui' ? 'SUI' : (state.paymentToken === 'usdc' ? 'USDC' : 'MEWS');
    
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
        
        restoreStoreCartPurchaseButtonsIdle();
        forEachStoreCartPurchaseButton((btn) => {
          btn.disabled = false;
        });
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
      
      restoreStoreCartPurchaseButtonsIdle();
      forEachStoreCartPurchaseButton((btn) => {
        btn.disabled = false;
      });
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
        tokenSymbol: state.paymentToken === 'sui' ? 'SUI' : (state.paymentToken === 'usdc' ? 'USDC' : 'MEWS'),
        customMessage: errorMsg
      });
    }
    
    restoreStoreCartPurchaseButtonsIdle();
    forEachStoreCartPurchaseButton((btn) => {
      btn.disabled = false;
    });
    return;
  }
  
  // Show loading state
  state.isLoading = true;
  setStoreCartPurchaseButtonsLoading('<span class="btn-icon">⏳</span> Building transaction...');
  
  try {
    // Frontend should always talk to the game backend (store is proxied by game backend).
    const API_BASE_URL = window.GAME_CONFIG?.getBackendUrl
      ? window.GAME_CONFIG.getBackendUrl('/api/store/').replace(/\/store\/?$/, '')
      : (window.GameApi ? window.GameApi.getBaseUrl() : (window.GAME_CONFIG?.GAME_BACKEND_URL || window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3001/api'));
    log.debug('STORE PURCHASE FLOW', 'Purchase using API Base URL', API_BASE_URL);
    
    // Convert payment token to backend format (uppercase)
    const paymentToken = state.paymentToken.toUpperCase();
    
    // Step 1: Call backend to build transaction
    setStoreCartPurchaseButtonsLoading('<span class="btn-icon">⏳</span> Building transaction...');
    
    // Get prices that were used to display store items (for consistency)
    let prices = null;
    let pricesTimestamp = null;
    if (typeof StoreService !== 'undefined' && StoreService.getState) {
      const state = StoreService.getState();
      prices = state.tokenPrices;
      pricesTimestamp = state.tokenPricesTimestamp;
    } else if (typeof getStoreState === 'function') {
      const state = getStoreState();
      prices = state?.tokenPrices;
      pricesTimestamp = state?.tokenPricesTimestamp;
    }
    
    log.debug('STORE PURCHASE FLOW', 'Sending prices to backend for consistency', {
      prices,
      pricesTimestamp,
      priceAge: pricesTimestamp ? `${Math.round((Date.now() - pricesTimestamp) / 1000)}s` : 'N/A',
    });
    
    const purchaseResponse = await fetch(`${API_BASE_URL}/store/purchase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        playerAddress: walletAddress,
        lines,
        paymentToken: paymentToken,
        badgeDiscount: badgeDiscount,  // Send badge discount to backend for validation
        prices: prices,  // Send prices used by frontend (for consistency)
        pricesTimestamp: pricesTimestamp  // Send timestamp of prices (for validation)
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
      totalTokenDisplay: purchaseData.totalTokenDisplay,
      paymentToken: purchaseData.paymentToken,
      gasEstimate: purchaseData.gasEstimate
    });

    // Step 2: Sign and execute in the wallet. MEWS/USDC visibility improves when the PTB uses spendable
    // coin object refs (platform store-cart planner paginates getCoins so v1 is chosen whenever possible).
    setStoreCartPurchaseButtonsLoading('<span class="btn-icon">⏳</span> Signing transaction...');
    
    // Check if wallet API is available
    if (!window.walletAPIInstance || !window.walletAPIInstance.isConnected()) {
      throw new Error('Wallet not connected. Please connect your wallet.');
    }
    
    // Pass the base64 string directly to wallet API
    // dapp-kit accepts base64 strings directly (as seen in Insomnia's implementation)
    // The wallet API will handle conversion if needed
    // Store checkout PTBs are always built for the game Sui network (testnet in prod-dev); force chain so
    // sign+execute uses the same RPC/network as the unsigned bytes from /store/purchase.
    const storeSuiNetwork =
      (typeof window.GAME_CONFIG?.NETWORK === 'string' && window.GAME_CONFIG.NETWORK.trim()) ||
      (typeof window.WalletService !== 'undefined' && window.WalletService._network) ||
      'testnet';
    const storeSuiNetId = storeSuiNetwork === 'mainnet' ? 'mainnet' : 'testnet';

    const refreshStoreAndWalletBalances = async (reason) => {
      if (!walletAddress) return;
      try {
        if (window.TokenBalanceUtils?.invalidateTokenBalanceCache) {
          window.TokenBalanceUtils.invalidateTokenBalanceCache(walletAddress, storeSuiNetId, ['sui', 'mews', 'usdc']);
        }
        if (window.walletAPIInstance?.checkMEWSBalance) {
          await window.walletAPIInstance.checkMEWSBalance(walletAddress, storeSuiNetId).catch(() => {});
        }
        if (window.walletAPIInstance?.checkSUIBalance) {
          await window.walletAPIInstance.checkSUIBalance(walletAddress, storeSuiNetId).catch(() => {});
        }
        if (typeof updateStoreBalance === 'function') {
          log.debug('STORE PURCHASE FLOW', 'Refreshing balances', { reason });
          await updateStoreBalance();
        }
      } catch (e) {
        log.warn('STORE PURCHASE FLOW', 'Post-purchase balance refresh failed', e);
      }
    };

    const signResult = await window.walletAPIInstance.signAndExecuteTransaction(purchaseData.transaction, {
      chain: storeSuiNetwork === 'mainnet' ? 'sui:mainnet' : 'sui:testnet',
    });
    
    if (!signResult.success) {
      throw new Error(signResult.error || 'Transaction signing failed');
    }

    // Tx may land quickly; bust token cache so MEWS/SUI header is not stuck for 2 minutes.
    await new Promise((r) => setTimeout(r, 500));
    await refreshStoreAndWalletBalances('after_sign');

    log.debug('STORE PURCHASE FLOW', 'Payment transaction signed and submitted', {
      digest: signResult.digest,
      paymentToken,
      playerAddress: walletAddress,
      apiBaseUrl: API_BASE_URL,
    });
    
    // Step 3: Poll for payment confirmation
    setStoreCartPurchaseButtonsLoading('<span class="btn-icon">⏳</span> Waiting for payment confirmation...');
    
    const paymentDigest = signResult.digest;
    let confirmed = false;
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max
    
    while (!confirmed && attempts < maxAttempts) {
      // Optimized: 1000ms → 500ms (transaction confirmation is usually faster)
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
      
      try {
        const statusResponse = await fetch(`${API_BASE_URL}/store/transaction/${paymentDigest}`);
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
      log.warn('STORE PURCHASE FLOW', 'Payment submitted but confirmation timeout. It may still be processing.');
    }

    // Step 4: Fulfillment is included in the same cart PTB.
    // No separate /store/fulfill call.
    const fulfillmentResult = null;

    // Step 4.5: Settlement (forward MEWS/USDC from platform wallet → game admin wallet).
    // On-chain Reservoir routes paid fulfillment to ReservoirSystem.admin; platform settles to app admin via a second tx.
    let settlementResult = null;
    if (confirmed && paymentToken !== 'SUI') {
      try {
        setStoreCartPurchaseButtonsLoading('<span class="btn-icon">⏳</span> Settling payment...');
        const settleUrl = `${API_BASE_URL}/store/settle/${paymentDigest}`;
        log.debug('STORE PURCHASE FLOW', 'Calling settlement endpoint', { settleUrl, paymentDigest, paymentToken });
        const settleRes = await fetch(settleUrl, { method: 'POST' });
        if (settleRes.ok) {
          settlementResult = await settleRes.json().catch(() => null);
          if (settlementResult?.success && settlementResult?.settled && settlementResult?.settleDigest) {
            log.debug('STORE PURCHASE FLOW', 'Settlement completed', settlementResult);
            if (typeof showToast === 'function') {
              showToast(`Payment settled! Tx: ${String(settlementResult.settleDigest).slice(0, 8)}...`, 'success');
            }
          } else {
            log.warn('STORE PURCHASE FLOW', 'Settlement returned but did not settle', settlementResult);
          }
        } else {
          const err = await settleRes.json().catch(() => ({}));
          log.warn('STORE PURCHASE FLOW', 'Settlement failed', { status: settleRes.status, error: err?.error || err?.message || 'Unknown error' });
        }
      } catch (e) {
        log.warn('STORE PURCHASE FLOW', 'Settlement request errored', e);
      }
    }

    // Step 4.6: Platform terminal store fee (game admin pays platform, separate tx).
    // Player should not pay platform fee in the player-signed purchase PTB.
    let platformFeeResult = null;
    if (confirmed) {
      try {
        setStoreCartPurchaseButtonsLoading('<span class="btn-icon">⏳</span> Paying platform fee...');
        const feeUrl = `${API_BASE_URL}/store/fee/${paymentDigest}`;
        log.debug('STORE PURCHASE FLOW', 'Calling platform fee endpoint', { feeUrl, paymentDigest, paymentToken });
        const feeRes = await fetch(feeUrl, { method: 'POST' });
        if (feeRes.ok) {
          platformFeeResult = await feeRes.json().catch(() => null);
          if (platformFeeResult?.success && platformFeeResult?.feePaid && platformFeeResult?.feeDigest) {
            log.debug('STORE PURCHASE FLOW', 'Platform fee paid', platformFeeResult);
            if (typeof showToast === 'function') {
              showToast(`Platform fee paid! Tx: ${String(platformFeeResult.feeDigest).slice(0, 8)}...`, 'success');
            }
          } else {
            log.warn('STORE PURCHASE FLOW', 'Platform fee endpoint returned without paying fee', platformFeeResult);
          }
        } else {
          const err = await feeRes.json().catch(() => ({}));
          log.warn('STORE PURCHASE FLOW', 'Platform fee payment failed', { status: feeRes.status, error: err?.error || err?.message || 'Unknown error' });
        }
      } catch (e) {
        log.warn('STORE PURCHASE FLOW', 'Platform fee request errored', e);
      }
    }
    
    // Step 5: Clear selection and refresh inventory
    state.selectedOffers = {};
    // Update StoreService state if available
    if (typeof StoreService !== 'undefined' && StoreService._state) {
      StoreService._state.selectedOffers = {};
    }
    
    // Invalidate API request cache for purchase
    // Use the walletAddress already set at the top of the function
    if (window.apiRequestCache && walletAddress && confirmed) {
      window.apiRequestCache.recordTransaction(walletAddress, paymentDigest, 'store_cart_purchase');
      log.debug('STORE PURCHASE FLOW', 'API cache invalidated for purchase');
    }
    if (confirmed && window.GamePassService?.invalidateCache) {
      window.GamePassService.invalidateCache();
    }
    
    // Small delay to ensure blockchain state is updated after transaction confirmation
    if (confirmed) {
      // Optimized: 500ms → 200ms (state update is usually faster)
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Reload catalog; inventory refreshes from reservoir in background (purchase already invalidated API cache)
    if (typeof loadStoreItems === 'function') {
      await loadStoreItems();
    }
    // Refresh only what changed. Buying credits/tickets should not refetch inventory.
    // Non-balance items (consumables/levels) should refresh inventory.
    const offerIds = Array.isArray(lines) ? lines.map((l) => l?.offerId) : [];
    const balanceOnly = offerIds.length > 0 && offerIds.every((id) => isBalanceOnlyOfferId(id));
    if (walletAddress && window.PlayerInventoryCache?.refreshAfterRewardBackground) {
      window.PlayerInventoryCache.refreshAfterRewardBackground(walletAddress, {
        inventory: !balanceOnly,
        gamePass: true,
      });
    } else {
      if (walletAddress && window.PlayerInventoryCache) {
        window.PlayerInventoryCache.invalidate(walletAddress);
      }
      if (walletAddress && typeof loadInventoryDisplay === 'function') {
        void (async () => {
          try {
            if (window.PlayerInventoryCache) {
              await window.PlayerInventoryCache.fetchReservoirBundleAndCache(walletAddress);
              const inv = window.PlayerInventoryCache.getFreshOrNull(walletAddress);
              if (inv) await loadInventoryDisplay(inv);
            } else {
              await loadInventoryDisplay();
            }
          } catch (e) {
            log.warn('STORE PURCHASE FLOW', 'Background inventory refresh failed', e);
          }
        })();
      }
    }
    
    // Second pass: confirmation + inventory delay — invalidate cache again and sync wallet header.
    await refreshStoreAndWalletBalances('after_confirm');

    if (typeof updateStoreUI === 'function') {
      await updateStoreUI();
    }
    
    // Show success message
    const successMsg = confirmed
      ? `Purchase confirmed! Tx: ${paymentDigest.slice(0, 8)}...`
      : `Purchase submitted! Tx: ${paymentDigest.slice(0, 8)}... (confirming...)`;
    
    if (typeof showToast === 'function') {
      showToast(successMsg, 'success');
    } else {
      alert(
        `Purchase Successful!\n\n${successMsg}\n\nTotal: $${purchaseData.totalUSD} USD` +
          (purchaseData.totalTokenDisplay != null && purchaseData.paymentToken
            ? ` (${purchaseData.totalTokenDisplay} ${purchaseData.paymentToken})`
            : '')
      );
    }
    
    log.debug('STORE PURCHASE FLOW', 'Purchase completed', {
      digest: paymentDigest,
      confirmed: confirmed,
      lines,
      settlementResult,
      platformFeeResult,
    });
    
  } catch (error) {
    log.error('STORE PURCHASE FLOW', 'Purchase error', error);
    
    const errorMsg = formatStorePurchaseErrorForUser(error);
    if (typeof showToast === 'function') {
      showToast(`Purchase failed: ${errorMsg}`, 'error');
    } else {
      alert(`Purchase failed: ${errorMsg}`);
    }
  } finally {
    state.isLoading = false;
    restoreStoreCartPurchaseButtonsIdle();
    if (typeof updateStoreUI === 'function') {
      void updateStoreUI();
    } else {
      forEachStoreCartPurchaseButton((btn) => {
        btn.disabled = false;
      });
    }
  }
}

function isBalanceOnlyOfferId(offerId) {
  const id = String(offerId || '').trim().toLowerCase();
  if (!id) return false;
  if (id === 'credits' || id === 'tickets') return true;
  if (id.startsWith('credit_pack_') || id.startsWith('ticket_pack_')) return true;
  if (id.startsWith('credit_bundle_') || id.startsWith('ticket_bundle_')) return true;
  return false;
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

