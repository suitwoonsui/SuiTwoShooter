// ==========================================
// STORE UI SYSTEM
// ==========================================
// Premium store modal for purchasing game items
// Follows the leaderboard modal pattern

// Store state
let storeState = {
  selectedItems: {
    // Format: { itemId_level: quantity }
    // Example: { 'extraLives_1': 3, 'extraLives_2': 1, 'forceField_3': 2 }
  },
  paymentToken: 'mews',      // 'mews' or 'sui'
  isLoading: false
};

/**
 * Show store modal
 * Follows the leaderboard modal pattern
 */
async function showStore() {
  console.log('🛒 showStore() called');
  
  // Check if wallet is connected
  let walletAddress = null;
  if (typeof getWalletAddress === 'function') {
    walletAddress = getWalletAddress();
  } else if (window.walletAPIInstance && window.walletAPIInstance.isConnected()) {
    walletAddress = window.walletAPIInstance.getAddress();
  }
  
  if (!walletAddress) {
    // Show wallet connection modal
    showStoreWalletConnectModal();
    return;
  }
  
  // Check for pending badge upgrade BEFORE showing store
  if (window.BadgeService && window.BadgeService.checkPendingUpgrade) {
    const upgradeCheck = await window.BadgeService.checkPendingUpgrade(walletAddress);
    if (upgradeCheck.success && upgradeCheck.hasPendingUpgrade && upgradeCheck.badgeId) {
      console.log('🎖️ [STORE] Pending badge upgrade detected - showing upgrade modal first');
      
      // Get current badge to get old tier
      const badgeData = await window.BadgeService.getBadge(walletAddress);
      if (badgeData && badgeData.success && badgeData.hasBadge && badgeData.badge) {
        const oldTier = badgeData.badge.tier;
        const newTier = upgradeCheck.newTier || oldTier + 1;
        const newTierName = window.BadgeService.getTierName(newTier);
        
        // Generate session ID for upgrade transaction
        const sessionId = `upgrade_${walletAddress}_${Date.now()}`;
        
        // Show upgrade modal with callback to show store after upgrade
        if (window.BadgeUI && window.BadgeUI.showTierUpgradeModal) {
          window.BadgeUI.showTierUpgradeModal({
            oldTier,
            newTier,
            newTierName,
            badgeId: upgradeCheck.badgeId,
            sessionId: sessionId,
            onUpgradeComplete: async (upgraded) => {
              // After upgrade modal closes (whether upgraded or declined), show store
              if (upgraded) {
                // Small delay to let badge cache clear
                await new Promise(resolve => setTimeout(resolve, 500));
              }
              await showStoreInternal();
            },
          });
          
          // Return early - store will be shown via callback
          return;
        }
      }
    }
  }
  
  // Wallet is connected, proceed to show store
  await showStoreInternal();
}

/**
 * Internal function to show the store (after wallet is confirmed connected)
 */
async function showStoreInternal() {
  // Hide main menu
  const mainMenu = document.getElementById('mainMenuOverlay');
  if (mainMenu) {
    mainMenu.classList.add('main-menu-overlay-hidden');
    mainMenu.classList.remove('main-menu-overlay-visible');
  }
  
  // Create store modal using dedicated store-modal class
  // Append to viewport-container like other panels (settings, instructions, leaderboard)
  const viewportContainer = document.querySelector('.viewport-container');
  if (!viewportContainer) {
    console.error('❌ [STORE] Viewport container not found!');
    return;
  }
  
  // Check if store modal already exists
  let storeModal = document.getElementById('storeModal');
  if (storeModal) {
    // Modal already exists, just show it and refresh inventory
    storeModal.classList.add('store-modal-visible');
    storeModal.classList.remove('store-modal-hidden');
    // Show loading modal while refreshing
    if (typeof showLoadingModal === 'function') {
      showLoadingModal('Refreshing store... Please wait', 'storeLoadingModal');
    }
    // Wait for cards to exist, then load inventory and balance
    setTimeout(async () => {
      try {
      await loadInventoryDisplay();
      await updateStoreBalance();
      await updateStoreUI();
      } finally {
        // Hide loading modal when refresh is complete
        if (typeof hideLoadingModal === 'function') {
          hideLoadingModal('storeLoadingModal');
        }
      }
    }, 100);
    return;
  }
  
  // Show loading modal while store is loading
  if (typeof showLoadingModal === 'function') {
    showLoadingModal('Loading store... Please wait', 'storeLoadingModal');
  }
  
  // Create new store modal
  storeModal = document.createElement('div');
  storeModal.className = 'store-modal store-modal-visible';
  storeModal.setAttribute('id', 'storeModal');
  
  const storeContent = document.createElement('div');
  storeContent.className = 'store';
  
  storeContent.innerHTML = `
    <!-- Store Header -->
    <div class="store-header">
      <h2 id="storeTitle">
        <span>🛒 Premium Store</span>
        <span id="storeBadgeDisplay" class="store-badge-icon" style="display: none;"></span>
      </h2>
    </div>
    
    <!-- Payment Token Selector -->
    <div class="store-payment-selector">
      <div>
        <label>Payment Method:</label>
        <div class="payment-token-buttons">
          <button class="payment-token-btn ${storeState.paymentToken === 'mews' ? 'active' : ''}" 
                  onclick="setPaymentToken('mews')" id="paymentTokenMews">
            <img src="assets/SuiTwo_Profile.webp" alt="$MEWS" class="token-icon" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';">
            <span class="token-fallback" style="display: none;">💰</span>
            <span>$MEWS</span>
          </button>
          <button class="payment-token-btn ${storeState.paymentToken === 'sui' ? 'active' : ''}" 
                  onclick="setPaymentToken('sui')" id="paymentTokenSui">
            <img src="assets/sui.svg" alt="SUI" class="token-icon" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';">
            <span class="token-fallback" style="display: none;">💎</span>
            <span>SUI</span>
          </button>
        </div>
      </div>
      <!-- Balance display -->
      <div class="store-wallet-balance-display" id="storeBalanceDisplay" style="display: none;">
        <span class="store-balance-label">Balance: </span>
        <span class="store-balance-value" id="storeBalanceValue">--</span>
      </div>
    </div>
    
    <!-- Store Items Container -->
    <div class="store-items-container" id="storeItemsContainer">
      <div class="store-loading" id="storeLoading">
        <span class="btn-icon">⏳</span> Loading store items...
      </div>
    </div>
    
    <!-- Selected Items Summary -->
    <div class="store-selected-summary" id="storeSelectedSummary" style="display: none;">
      <h3>Selected Items</h3>
      <div id="selectedItemsList"></div>
      <div class="store-total" id="storeTotal">
        <span>Total: $0.00 (0 $MEWS)</span>
      </div>
    </div>
    
    <!-- Store Actions -->
    <div class="store-actions">
      <button class="menu-btn" onclick="clearStoreSelection()">
        <span class="btn-icon">🗑️</span> Clear Selection
      </button>
      <button class="menu-btn primary" onclick="proceedToPurchase()" id="proceedToPurchaseBtn" disabled>
        <span class="btn-icon">💳</span> Proceed to Purchase
      </button>
      <button class="menu-btn" onclick="hideStore()">
        <span class="btn-icon">←</span> Back to Menu
      </button>
    </div>
  `;
  
  storeModal.appendChild(storeContent);
  viewportContainer.appendChild(storeModal);
  
  try {
  // Load store items
  await loadStoreItems();
  
  // Load and display inventory (after cards are created)
  await loadInventoryDisplay();
  
  // Update balance display
  await updateStoreBalance();
  
  // Load and display badge (if player has one)
  await loadStoreBadgeDisplay();
  
  // Update UI (including prices with badge discount)
  await updateStoreUI();
  } finally {
    // Hide loading modal when store is fully loaded
    if (typeof hideLoadingModal === 'function') {
      hideLoadingModal('storeLoadingModal');
    }
  }
}

/**
 * Load and display badge icon in store header (if player has one)
 * Shows only the badge image/icon to the right of "Premium Store" title
 */
async function loadStoreBadgeDisplay() {
  const badgeDisplayContainer = document.getElementById('storeBadgeDisplay');
  if (!badgeDisplayContainer) {
    console.warn('⚠️ [STORE] Badge display container not found');
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
    // No wallet connected, hide badge display
    badgeDisplayContainer.style.display = 'none';
    badgeDisplayContainer.innerHTML = '';
    return;
  }
  
  try {
    // Get badge data from BadgeService
    if (!window.BadgeService || !window.BadgeService.getBadge) {
      console.warn('⚠️ [STORE] BadgeService not available');
      badgeDisplayContainer.style.display = 'none';
      badgeDisplayContainer.innerHTML = '';
      return;
    }
    
    const badgeData = await window.BadgeService.getBadge(walletAddress);
    
    if (!badgeData || !badgeData.success || !badgeData.hasBadge || !badgeData.badge) {
      // Player doesn't have a badge, hide display
      badgeDisplayContainer.style.display = 'none';
      badgeDisplayContainer.innerHTML = '';
      return;
    }
    
    // Player has a badge, display badge image with tier name and discount
    const { badge } = badgeData;
    const tierName = window.BadgeService.getTierName(badge.tier);
    const discounts = window.BadgeService.getDiscountsForTier(badge.tier);
    const storeDiscount = discounts.store || 0;
    
    // Define tierNames at function scope to avoid duplicate declarations
    const tierNames = ['Standard', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
    
    console.log('📋 [STORE] Badge data:', { tier: badge.tier, tierName, discounts, storeDiscount });
    
    // Convert image data to base64 using the helper function if available
    // Use imageUrl if available (from badge.image field), otherwise fall back to constructing from tier or imageData
    let imageSrc = null;
    
    // Declare apiBaseUrl at function scope to avoid duplicate declaration
    const apiBaseUrl = window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3000/api';
    
    // First, try to use imageUrl from badge
    if (badge.imageUrl && typeof badge.imageUrl === 'string' && (badge.imageUrl.startsWith('http://') || badge.imageUrl.startsWith('https://'))) {
      // Use the URL directly from the badge's image field (validate it's a real URL)
      imageSrc = badge.imageUrl;
      console.log('✅ [STORE] Using badge image URL:', imageSrc);
    } else {
      // Log what we received for debugging
      console.log('🔍 [STORE] Badge imageUrl value:', badge.imageUrl, 'Type:', typeof badge.imageUrl);
      
      // Fallback 1: Construct URL from tier
      const tierName = tierNames[badge.tier] || 'Standard';
      // Remove /api suffix if present, then add /Badges/
      const baseUrl = apiBaseUrl.replace(/\/api$/, '');
      const constructedUrl = `${baseUrl}/Badges/${tierName}.webp`;
      imageSrc = constructedUrl;
      console.log('✅ [STORE] Constructed image URL from tier:', imageSrc);
      
      // Fallback 2: If we have imageData, use it instead of constructed URL
      if (badge.imageData && badge.imageData.length > 0) {
        // Fallback to base64 data URI for backwards compatibility
        try {
          // Use arrayBufferToBase64 from BadgeUI if available, otherwise manual conversion
          if (window.BadgeUI && typeof window.BadgeUI.arrayBufferToBase64 === 'function') {
            imageSrc = `data:image/webp;base64,${window.BadgeUI.arrayBufferToBase64(badge.imageData)}`;
          } else {
            // Manual conversion
            let base64;
            if (Array.isArray(badge.imageData)) {
              const bytes = new Uint8Array(badge.imageData);
              const binary = String.fromCharCode.apply(null, Array.from(bytes));
              base64 = btoa(binary);
            } else if (badge.imageData instanceof Uint8Array) {
              const binary = String.fromCharCode.apply(null, Array.from(badge.imageData));
              base64 = btoa(binary);
            } else {
              const binary = String.fromCharCode.apply(null, Array.from(new Uint8Array(badge.imageData)));
              base64 = btoa(binary);
            }
            imageSrc = `data:image/webp;base64,${base64}`;
          }
          console.log('✅ [STORE] Using badge imageData (base64) instead of constructed URL');
        } catch (error) {
          console.warn('⚠️ [STORE] Failed to convert badge imageData, using constructed URL:', error);
          // Keep the constructed URL as fallback
        }
      }
    }
    
    // Construct fallback URL from tier in case image fails to load
    const tierNameForUrl = tierNames[badge.tier] || 'Standard';
    const baseUrl = apiBaseUrl.replace(/\/api$/, '');
    const fallbackUrl = `${baseUrl}/Badges/${tierNameForUrl}.webp`;
    
    // Always show badge image (use placeholder if image conversion failed)
    const badgeHTML = `
      <div class="store-badge-icon-wrapper">
        ${imageSrc 
          ? `<img src="${imageSrc}" alt="Badge" class="store-badge-icon-image" onerror="this.onerror=null; this.src='${fallbackUrl}'; console.warn('⚠️ [STORE] Image failed to load, using fallback:', '${fallbackUrl}');" />`
          : `<span class="store-badge-icon-placeholder">🎖️</span>`
        }
        <div class="store-badge-text">
          <div class="store-badge-tier">${tierName}</div>
          <div class="store-badge-discount">${storeDiscount}% off</div>
        </div>
      </div>
    `;
    
    badgeDisplayContainer.innerHTML = badgeHTML;
    badgeDisplayContainer.style.display = 'inline-block';
    
    console.log('✅ [STORE] Badge displayed in store header:', { tierName, storeDiscount, hasImage: !!imageSrc });
  } catch (error) {
    console.error('❌ [STORE] Error loading badge display:', error);
    badgeDisplayContainer.style.display = 'none';
    badgeDisplayContainer.innerHTML = '';
  }
}

/**
 * Show wallet connection modal for store access
 */
function showStoreWalletConnectModal() {
  const viewportContainer = document.querySelector('.viewport-container');
  if (!viewportContainer) {
    console.error('❌ [STORE] Viewport container not found for wallet connect modal');
    return;
  }
  
  // Remove existing modal if any
  const existingModal = document.getElementById('storeWalletConnectModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // Create modal
  const modal = document.createElement('div');
  modal.className = 'store-wallet-connect-modal store-wallet-connect-modal-visible';
  modal.setAttribute('id', 'storeWalletConnectModal');
  
  modal.innerHTML = `
    <div class="store-wallet-connect-content">
      <div class="store-wallet-connect-header">
        <h2>🔗 Wallet Required</h2>
      </div>
      <div class="store-wallet-connect-body">
        <p>You need to connect your wallet to access the store.</p>
        <p class="store-wallet-connect-hint">Connect your Sui wallet to purchase items and manage your inventory.</p>
      </div>
      <div class="store-wallet-connect-actions">
        <button class="menu-btn primary" id="storeWalletConnectBtn" onclick="handleStoreWalletConnect()">
          <span class="btn-icon">🔗</span> Connect Wallet
        </button>
        <button class="menu-btn" onclick="cancelStoreWalletConnect()">
          <span class="btn-icon">←</span> Back to Menu
        </button>
      </div>
    </div>
  `;
  
  viewportContainer.appendChild(modal);
  
  // Add backdrop click handler
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      cancelStoreWalletConnect();
    }
  });
}

/**
 * Handle wallet connection from store modal
 */
async function handleStoreWalletConnect() {
  const connectBtn = document.getElementById('storeWalletConnectBtn');
  
  if (!window.walletAPIInstance) {
    alert('Wallet API not initialized. Please refresh the page.');
    return;
  }
  
  // Disable button during connection
  if (connectBtn) {
    connectBtn.disabled = true;
    connectBtn.innerHTML = '<span class="btn-icon">⏳</span> Connecting...';
  }
  
  try {
    const result = await window.walletAPIInstance.connect();
    
    if (result.success) {
      console.log('✅ [STORE] Wallet connected:', result.address);
      
      // Close the wallet connect modal
      closeStoreWalletConnectModal();
      
      // Show the store
      await showStoreInternal();
    } else {
      console.error('❌ [STORE] Wallet connection failed:', result.error);
      alert(`Failed to connect wallet: ${result.error || 'Unknown error'}`);
      
      // Re-enable button
      if (connectBtn) {
        connectBtn.disabled = false;
        connectBtn.innerHTML = '<span class="btn-icon">🔗</span> Connect Wallet';
      }
    }
  } catch (error) {
    console.error('❌ [STORE] Error connecting wallet:', error);
    alert(`Error connecting wallet: ${error.message}`);
    
    // Re-enable button
    if (connectBtn) {
      connectBtn.disabled = false;
      connectBtn.innerHTML = '<span class="btn-icon">🔗</span> Connect Wallet';
    }
  }
}

/**
 * Cancel wallet connection and return to main menu
 */
function cancelStoreWalletConnect() {
  closeStoreWalletConnectModal();
  
  // Show main menu
  const mainMenu = document.getElementById('mainMenuOverlay');
  if (mainMenu) {
    mainMenu.classList.remove('main-menu-overlay-hidden');
    mainMenu.classList.add('main-menu-overlay-visible');
  }
}

/**
 * Close wallet connection modal
 */
function closeStoreWalletConnectModal() {
  const modal = document.getElementById('storeWalletConnectModal');
  if (modal) {
    modal.classList.remove('store-wallet-connect-modal-visible');
    modal.classList.add('store-wallet-connect-modal-hidden');
    setTimeout(() => {
      modal.remove();
    }, 300);
  }
}

/**
 * Hide store modal
 */
function hideStore() {
  const storeModal = document.getElementById('storeModal');
  if (storeModal) {
    storeModal.classList.remove('store-modal-visible');
    storeModal.classList.add('store-modal-hidden');
    // Remove from DOM after animation
    setTimeout(() => {
      storeModal.remove();
    }, 300);
  }
  
  // Show main menu
  const mainMenu = document.getElementById('mainMenuOverlay');
  if (mainMenu) {
    mainMenu.classList.add('main-menu-overlay-visible');
    mainMenu.classList.remove('main-menu-overlay-hidden');
  }
}

/**
 * Convert USD price to token amount
 * Uses prices from backend API (should always be available)
 * 
 * @param {number} usdPrice - Price in USD
 * @param {string} tokenType - 'sui', 'mews', or 'usdc'
 * @returns {Object} { amount: number, formatted: string, error?: string }
 */
function convertUsdToToken(usdPrice, tokenType) {
  // Use prices from backend API if available
  if (storeState.tokenPrices) {
    const prices = storeState.tokenPrices;
    let rate;
    
    if (tokenType === 'sui') {
      rate = prices.sui;
    } else if (tokenType === 'mews') {
      rate = prices.mews;
    } else {
      rate = prices.usdc || 1.0; // USDC is always $1.0
    }
    
    // If rate is missing or invalid, return error
    if (!rate || rate <= 0) {
      console.warn(`⚠️ [STORE] Missing or invalid ${tokenType} price from backend`);
    return {
        amount: 0,
        formatted: 'N/A',
        error: 'Price unavailable'
      };
    }
    
  const tokenAmount = usdPrice / rate;
  
  return {
    amount: tokenAmount,
    formatted: formatTokenAmount(tokenAmount, tokenType)
    };
  }
  
  // If backend prices not loaded, this is an error condition
  // Prices should always be fetched from backend before showing store
  console.error('❌ [STORE] Token prices not loaded from backend');
  return {
    amount: 0,
    formatted: 'N/A',
    error: 'Prices not loaded'
  };
}

/**
 * Format token amount for display
 */
function formatTokenAmount(amount, tokenType) {
  if (tokenType === 'sui') {
    // SUI: Show 2-4 decimal places
    if (amount < 0.01) {
      return amount.toFixed(4);
    } else if (amount < 1) {
      return amount.toFixed(3);
    } else {
      return amount.toFixed(2);
    }
  } else {
    // MEWS: Show whole numbers or 1 decimal place for large amounts
    if (amount < 1000) {
      return Math.round(amount).toLocaleString();
    } else if (amount < 1000000) {
      return (amount / 1000).toFixed(1) + 'K';
    } else {
      return (amount / 1000000).toFixed(1) + 'M';
    }
  }
}

/**
 * Format USD price for display
 */
function formatUsdPrice(usdPrice) {
  return `$${usdPrice.toFixed(2)}`;
}

/**
 * Load store items from backend API
 */
async function loadStoreItems() {
  console.log('📦 [STORE] Loading store items from backend...');
  
  const container = document.getElementById('storeItemsContainer');
  const loading = document.getElementById('storeLoading');
  
  if (!container || !loading) return;
  
  // Show loading state
  storeState.isLoading = true;
  loading.style.display = 'block';
  container.innerHTML = '';
  container.appendChild(loading);
  
  try {
    // Get API base URL from config (set by api-config.js)
    const API_BASE_URL = window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3000/api';
    console.log('🔧 [STORE] Using API Base URL:', API_BASE_URL);
    
    // Fetch items from backend
    const response = await fetch(`${API_BASE_URL}/store/items`);
    
    if (!response.ok) {
      throw new Error(`Failed to load store items: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.success || !data.items) {
      throw new Error(data.error || 'Invalid response from server');
    }
    
    // Store prices for conversion
    if (data.prices) {
      storeState.tokenPrices = data.prices;
    }
    
    // Clear loading
    loading.style.display = 'none';
    container.innerHTML = '';
    
    // Render each item (with badge discount applied)
    for (const item of data.items) {
      const itemCard = await createItemCard(item);
      container.appendChild(itemCard);
    }
    
    storeState.isLoading = false;
    console.log(`✅ [STORE] Loaded ${data.items.length} items from backend`);
  } catch (error) {
    console.error('❌ [STORE] Error loading items:', error);
    loading.style.display = 'none';
    container.innerHTML = `
      <div class="store-placeholder">
        <p>❌ Error loading store items</p>
        <p style="font-size: 0.9em; color: #888; margin-top: 10px;">
          ${error.message || 'Unknown error'}
        </p>
        <button class="menu-btn" onclick="loadStoreItems()" style="margin-top: 10px;">
          <span class="btn-icon">🔄</span> Retry
        </button>
      </div>
    `;
    storeState.isLoading = false;
  }
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
      if (badgeData.success && badgeData.hasBadge && badgeData.badge) {
        const discounts = window.BadgeService.getDiscountsForTier(badgeData.badge.tier);
        badgeDiscount = discounts.store;
      }
    }
  } catch (error) {
    console.warn('⚠️ [STORE] Failed to get badge discount for item card:', error);
  }
  
  // Check if item has multiple levels
  const hasMultipleLevels = item.levels.length > 1;
  
  // Build level buttons HTML
  let levelsHTML = '';
  item.levels.forEach(levelData => {
    const level = levelData.level || 1;
    const quantity = getItemQuantity(item.id, level);
    const hasQuantity = quantity > 0;
    
    // Apply badge discount to price
    const originalPrice = levelData.usdPrice;
    const discountedPrice = badgeDiscount > 0 
      ? originalPrice * (1 - badgeDiscount / 100)
      : originalPrice;
    
    // Format USD price (show original and discounted if discount applies)
    let usdPriceHTML = '';
    if (badgeDiscount > 0) {
      const originalUsd = formatUsdPrice(originalPrice);
      const discountedUsd = formatUsdPrice(discountedPrice);
      usdPriceHTML = `<span style="text-decoration: line-through; opacity: 0.6;">${originalUsd}</span> <span style="color: #39ff14;">${discountedUsd}</span>`;
    } else {
      usdPriceHTML = formatUsdPrice(originalPrice);
    }
    
    // Use discounted price for token conversion
    const usdPrice = discountedPrice;
    
    // Use prices from backend API if available, otherwise calculate
    let tokenPriceDisplay = '';
    const tokenSymbol = storeState.paymentToken === 'sui' ? 'SUI' : (storeState.paymentToken === 'usdc' ? 'USDC' : '$MEWS');
    
    if (levelData.prices && levelData.prices[storeState.paymentToken]) {
      // Use backend-provided price
      tokenPriceDisplay = levelData.prices[storeState.paymentToken].display || '';
    } else {
      // Fallback to calculated price
      const tokenConversion = convertUsdToToken(levelData.usdPrice, storeState.paymentToken);
      tokenPriceDisplay = tokenConversion.formatted;
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
            <button class="level-clear-btn" onclick="clearLevelSelection('${item.id}', ${level})" title="Clear this level">
              ✕
            </button>
          ` : ''}
        </div>
        ${hasQuantity ? `
          <div class="item-quantity-controls">
            <button class="quantity-btn quantity-decrease" onclick="removeItemFromSelection('${item.id}', ${level})" title="Decrease quantity">−</button>
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
 * Set payment token (MEWS or SUI)
 */
async function setPaymentToken(token) {
  if (token !== 'mews' && token !== 'sui') {
    console.warn('⚠️ [STORE] Invalid payment token:', token);
    return;
  }
  
  console.log('💱 [STORE] Switching payment token to:', token);
  storeState.paymentToken = token;
  
  // Update button states
  const mewsBtn = document.getElementById('paymentTokenMews');
  const suiBtn = document.getElementById('paymentTokenSui');
  
  if (mewsBtn && suiBtn) {
    if (token === 'mews') {
      mewsBtn.classList.add('active');
      suiBtn.classList.remove('active');
    } else {
      suiBtn.classList.add('active');
      mewsBtn.classList.remove('active');
    }
  }
  
  // Update prices in existing item cards without reloading
  await updateItemPrices();
  
  // Also update the selected items summary
  await updateStoreUI();
  
  // Update balance display for selected token
  await updateStoreBalance();
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
    console.warn('⚠️ [STORE] Failed to get badge discount for price update:', error);
  }
  
  cards.forEach(card => {
    const itemId = card.getAttribute('data-item-id');
    const item = getItemById(itemId);
    if (!item) return;
    
    // Get all level buttons
    const levelButtons = card.querySelectorAll('.item-level-btn, .item-single-btn');
    
    levelButtons.forEach(button => {
      const level = parseInt(button.getAttribute('data-level')) || 1;
      const levelData = getItemLevelData(itemId, level);
      
      if (levelData) {
        // Apply badge discount to price
        const originalPrice = levelData.usdPrice;
        const discountedPrice = badgeDiscount > 0 
          ? originalPrice * (1 - badgeDiscount / 100)
          : originalPrice;
        
        const tokenConversion = convertUsdToToken(discountedPrice, storeState.paymentToken);
        const tokenSymbol = storeState.paymentToken === 'sui' ? 'SUI' : '$MEWS';
        
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
            const originalUsd = formatUsdPrice(originalPrice);
            const discountedUsd = formatUsdPrice(discountedPrice);
            priceUsd.innerHTML = `<span style="text-decoration: line-through; opacity: 0.6;">${originalUsd}</span> <span style="color: #39ff14;">${discountedUsd}</span>`;
          } else if (priceUsd) {
            priceUsd.textContent = formatUsdPrice(originalPrice);
          }
        }
      }
    });
  });
}

/**
 * Get item selection key (itemId_level)
 */
function getItemKey(itemId, level) {
  return `${itemId}_${level}`;
}

/**
 * Get quantity for an item/level
 */
function getItemQuantity(itemId, level) {
  const key = getItemKey(itemId, level);
  return storeState.selectedItems[key] || 0;
}

/**
 * Add item to selection (increment quantity)
 */
async function addItemToSelection(itemId, level) {
  const key = getItemKey(itemId, level);
  const currentQty = getItemQuantity(itemId, level);
  storeState.selectedItems[key] = currentQty + 1;
  console.log('➕ [STORE] Added item:', key, 'quantity:', storeState.selectedItems[key]);
  await updateStoreUI();
}

/**
 * Remove item from selection (decrement quantity)
 */
async function removeItemFromSelection(itemId, level) {
  const key = getItemKey(itemId, level);
  const currentQty = getItemQuantity(itemId, level);
  if (currentQty > 0) {
    storeState.selectedItems[key] = currentQty - 1;
    if (storeState.selectedItems[key] === 0) {
      delete storeState.selectedItems[key];
    }
    console.log('➖ [STORE] Removed item:', key, 'quantity:', storeState.selectedItems[key] || 0);
    await updateStoreUI();
  }
}

/**
 * Set item quantity directly
 */
async function setItemQuantity(itemId, level, quantity) {
  const key = getItemKey(itemId, level);
  if (quantity <= 0) {
    delete storeState.selectedItems[key];
  } else {
    storeState.selectedItems[key] = quantity;
  }
  console.log('🔢 [STORE] Set quantity:', key, '=', quantity);
  await updateStoreUI();
}

/**
 * Select item (adds one to quantity)
 * Users can select multiple of the same item/level for purchase
 */
function selectStoreItem(itemId, level) {
  console.log('🛒 [STORE] Selecting item:', itemId, 'level:', level);
  
  // Validate item type
  const validItemTypes = ['extraLives', 'forceField', 'orbLevel', 'slowTime', 'destroyAll', 'bossKillShot', 'coinTractorBeam'];
  if (!validItemTypes.includes(itemId)) {
    console.error('❌ [STORE] Invalid item type:', itemId);
    return;
  }
  
  // Handle single-level items (level defaults to 1)
  if (itemId === 'destroyAll' || itemId === 'bossKillShot') {
    level = 1;
  }
  
  if (level === undefined || level === null) {
    console.error('❌ [STORE] Level required for item type:', itemId);
    return;
  }
  
  // Add one to quantity
  addItemToSelection(itemId, level);
}

/**
 * Clear selection for a specific item/level
 */
function clearLevelSelection(itemId, level) {
  console.log('🗑️ [STORE] Clearing selection for:', itemId, 'level:', level);
  
  const key = getItemKey(itemId, level);
  delete storeState.selectedItems[key];
  
  // Reload items to update UI
  loadStoreItems().then(async () => {
    await updateStoreUI();
  });
}

/**
 * Clear all selections
 */
function clearStoreSelection() {
  console.log('🗑️ [STORE] Clearing all selections');
  
  storeState.selectedItems = {};
  
  // Reload items to update UI
  loadStoreItems().then(async () => {
    await updateStoreUI();
  });
}

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
    console.warn('⚠️ [STORE] Failed to get badge discount for UI update:', error);
  }
  
  // Count selected items and calculate total (with discount)
  let selectedCount = 0;
  const selectedItems = [];
  let totalUsd = 0;
  let totalUsdBeforeDiscount = 0;
  
  // Process all selected items (format: itemId_level: quantity)
  for (const [key, quantity] of Object.entries(storeState.selectedItems)) {
    if (quantity > 0) {
      // Parse key (format: "itemId_level")
      const [itemId, levelStr] = key.split('_');
      const level = parseInt(levelStr) || 1;
      
      const item = getItemById(itemId);
      if (item) {
        const levelData = getItemLevelData(itemId, level);
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
        priceHTML = `<span style="text-decoration: line-through; opacity: 0.6;">${formatUsdPrice(item.totalPriceBeforeDiscount)}</span> <span style="color: #39ff14;">${formatUsdPrice(item.totalPrice)}</span>`;
      } else {
        priceHTML = formatUsdPrice(item.totalPrice);
      }
      
      const unitPriceHTML = item.quantity > 1 
        ? ` (${badgeDiscount > 0 && item.unitPriceDiscounted < item.unitPrice
            ? `<span style="text-decoration: line-through; opacity: 0.6;">${formatUsdPrice(item.unitPrice)}</span> <span style="color: #39ff14;">${formatUsdPrice(item.unitPriceDiscounted)}</span>`
            : formatUsdPrice(item.unitPrice)} each)`
        : '';
      
      return `<div class="selected-item" data-item-key="${item.key}" onclick="removeItemFromSelection('${item.itemId}', ${item.level})" title="Click to remove one">
        <span class="selected-item-name">${item.name}${item.quantity > 1 ? ` × ${item.quantity}` : ''}</span>
        <span class="selected-item-price">${priceHTML}${unitPriceHTML}</span>
      </div>`;
    }).join('');
    
    // Update total (with discount display)
    const tokenConversion = convertUsdToToken(totalUsd, storeState.paymentToken);
    const tokenSymbol = storeState.paymentToken === 'sui' ? 'SUI' : '$MEWS';
    
    if (totalElement) {
      let totalHTML = '';
      if (badgeDiscount > 0 && totalUsd < totalUsdBeforeDiscount) {
        const discountAmount = totalUsdBeforeDiscount - totalUsd;
        totalHTML = `<span>Total: <span style="text-decoration: line-through; opacity: 0.6;">${formatUsdPrice(totalUsdBeforeDiscount)}</span> <span style="color: #39ff14;">${formatUsdPrice(totalUsd)}</span> (${tokenConversion.formatted} ${tokenSymbol}) <span style="color: #39ff14; font-size: 0.9em;">🎖️ ${badgeDiscount}% off (Save ${formatUsdPrice(discountAmount)})</span></span>`;
      } else {
        totalHTML = `<span>Total: ${formatUsdPrice(totalUsd)} (${tokenConversion.formatted} ${tokenSymbol})</span>`;
      }
      totalElement.innerHTML = totalHTML;
    }
    
    // Enable proceed button
    if (proceedBtn) {
      proceedBtn.disabled = false;
    }
    
    // Update item card visual states
    updateItemCardStates();
  } else {
    summary.style.display = 'none';
    
    // Disable proceed button
    if (proceedBtn) {
      proceedBtn.disabled = true;
    }
    
    // Update item card visual states
    updateItemCardStates();
  }
}

/**
 * Update visual states of item cards (selected/disabled)
 */
function updateItemCardStates() {
  const cards = document.querySelectorAll('.store-item-card');
  
  cards.forEach(card => {
    const itemId = card.getAttribute('data-item-id');
    const item = getItemById(itemId);
    if (!item) return;
    
    // Get all level containers for this item
    const levelContainers = card.querySelectorAll('.item-level-container');
    let hasAnySelection = false;
    
    levelContainers.forEach(container => {
      const level = parseInt(container.getAttribute('data-level')) || 1;
      const quantity = getItemQuantity(itemId, level);
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
          const levelData = getItemLevelData(itemId, level);
          if (levelData) {
            const controlsHTML = `
              <div class="item-quantity-controls">
                <button class="quantity-btn quantity-decrease" onclick="removeItemFromSelection('${itemId}', ${level})" title="Decrease quantity">−</button>
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
      const quantity = getItemQuantity(itemId, level);
      const hasQuantity = quantity > 0;
      
      const levelButtonWrapper = container.querySelector('.level-button-wrapper');
      const existingClearBtn = container.querySelector('.level-clear-btn');
      
      if (hasQuantity && !existingClearBtn && levelButtonWrapper) {
        // Add clear button
        const clearBtnHTML = `<button class="level-clear-btn" onclick="clearLevelSelection('${itemId}', ${level})" title="Clear this level">✕</button>`;
        levelButtonWrapper.insertAdjacentHTML('beforeend', clearBtnHTML);
      } else if (!hasQuantity && existingClearBtn) {
        // Remove clear button
        existingClearBtn.remove();
      }
    });
  });
}

/**
 * Proceed to purchase - Backend API + Blockchain Integration
 */
async function proceedToPurchase() {
  console.log('💳 [STORE] Proceeding to purchase...');
  console.log('Selected items:', storeState.selectedItems);
  
  // Validate selections
  const selectedCount = Object.keys(storeState.selectedItems).filter(
    key => storeState.selectedItems[key] > 0
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
        console.log(`🎖️ [STORE] Badge discount applied: ${badgeDiscount}%`);
      }
    }
  } catch (error) {
    console.warn('⚠️ [STORE] Failed to get badge discount:', error);
    // Continue without discount if badge check fails
  }

  // Calculate total USD and token amount needed (with discount applied)
  let totalUsd = 0;
  let totalUsdBeforeDiscount = 0;
  const items = [];
  
  for (const [key, quantity] of Object.entries(storeState.selectedItems)) {
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
      const item = getItemById && typeof getItemById === 'function' ? getItemById(itemId) : null;
      if (item) {
        const levelData = getItemLevelData && typeof getItemLevelData === 'function' 
          ? getItemLevelData(itemId, level) 
          : null;
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
    console.log(`💰 [STORE] Discount: ${badgeDiscount}% off, Saved: $${discountAmount.toFixed(2)}`);
  }
  
  // Check balance before proceeding
  const proceedBtn = document.getElementById('proceedToPurchaseBtn');
  if (proceedBtn) {
    proceedBtn.disabled = true;
    proceedBtn.innerHTML = '<span class="btn-icon">⏳</span> Checking balance...';
  }
  
  try {
    // Calculate required token amount
    const tokenConversion = convertUsdToToken(totalUsd, storeState.paymentToken);
    const requiredTokenAmount = tokenConversion.amount;
    const tokenSymbol = storeState.paymentToken === 'sui' ? 'SUI' : '$MEWS';
    
    // Check user's balance
    let userBalance = 0;
    const network = 'testnet'; // Store uses testnet
    
    if (storeState.paymentToken === 'mews') {
      if (window.walletAPIInstance && typeof window.walletAPIInstance.checkMEWSBalance === 'function') {
        const balanceResult = await window.walletAPIInstance.checkMEWSBalance(walletAddress, network);
        if (balanceResult.success) {
          // Parse formatted balance - handle commas and K/M suffixes
          let balanceStr = balanceResult.formattedBalance.replace(/,/g, '');
          
          // Handle K (thousands) and M (millions) suffixes
          let multiplier = 1;
          if (balanceStr.endsWith('K')) {
            multiplier = 1000;
            balanceStr = balanceStr.replace('K', '');
          } else if (balanceStr.endsWith('M')) {
            multiplier = 1000000;
            balanceStr = balanceStr.replace('M', '');
          }
          
          userBalance = parseFloat(balanceStr) * multiplier;
        } else {
          throw new Error('Failed to check MEWS balance');
        }
      } else {
        throw new Error('MEWS balance check not available');
      }
    } else if (storeState.paymentToken === 'sui') {
      if (window.walletAPIInstance && typeof window.walletAPIInstance.checkSUIBalance === 'function') {
        const balanceResult = await window.walletAPIInstance.checkSUIBalance(walletAddress, network);
        if (balanceResult.success) {
          // Use balanceInSUI if available, otherwise parse formatted balance
          if (balanceResult.balanceInSUI !== undefined) {
            userBalance = balanceResult.balanceInSUI;
          } else {
            // Parse formatted balance (remove commas)
            userBalance = parseFloat(balanceResult.formattedBalance.replace(/,/g, ''));
          }
        } else {
          throw new Error('Failed to check SUI balance');
        }
      } else {
        throw new Error('SUI balance check not available');
      }
    }
    
    // Check if user has sufficient balance (add 10% buffer for gas fees)
    const requiredWithGas = requiredTokenAmount * 1.1;
    if (userBalance < requiredWithGas) {
      const shortfall = requiredWithGas - userBalance;
      const shortfallFormatted = formatTokenAmount(shortfall, storeState.paymentToken);
      const requiredFormatted = formatTokenAmount(requiredWithGas, storeState.paymentToken);
      const balanceFormatted = formatTokenAmount(userBalance, storeState.paymentToken);
      
      // Show modal popup instead of toast
      showInsufficientBalanceModal({
        required: requiredFormatted,
        balance: balanceFormatted,
        shortfall: shortfallFormatted,
        tokenSymbol: tokenSymbol
      });
      
      if (proceedBtn) {
        proceedBtn.disabled = false;
        proceedBtn.innerHTML = '<span class="btn-icon">💳</span> Proceed to Purchase';
      }
      return;
    }
    
    console.log('✅ [STORE] Balance check passed:', {
      required: requiredTokenAmount,
      requiredWithGas,
      userBalance,
      token: storeState.paymentToken
    });
  } catch (balanceError) {
    console.error('❌ [STORE] Balance check error:', balanceError);
    const errorMsg = `Failed to check balance: ${balanceError.message || 'Unknown error'}`;
    
    // Show error modal
    showInsufficientBalanceModal({
      required: '--',
      balance: '--',
      shortfall: '--',
      tokenSymbol: storeState.paymentToken === 'sui' ? 'SUI' : '$MEWS',
      customMessage: errorMsg
    });
    
    if (proceedBtn) {
      proceedBtn.disabled = false;
      proceedBtn.innerHTML = '<span class="btn-icon">💳</span> Proceed to Purchase';
    }
    return;
  }
  
  // Show loading state
  storeState.isLoading = true;
  if (proceedBtn) {
    proceedBtn.disabled = true;
    proceedBtn.innerHTML = '<span class="btn-icon">⏳</span> Building transaction...';
  }
  
  try {
    // Get API base URL from config (set by api-config.js)
    const API_BASE_URL = window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3000/api';
    console.log('🔧 [STORE] Purchase using API Base URL:', API_BASE_URL);
    
    // Convert payment token to backend format (uppercase)
    const paymentToken = storeState.paymentToken.toUpperCase();
    
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
    
    console.log('✅ [STORE] Transaction built:', {
      totalUSD: purchaseData.totalUSD,
      totalToken: purchaseData.totalToken,
      paymentToken: purchaseData.paymentToken,
      gasEstimate: purchaseData.gasEstimate
    });
    
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
    
    console.log('✅ [STORE] Transaction signed and submitted:', signResult.digest);
    
    // Step 3: Poll for confirmation
    proceedBtn.innerHTML = '<span class="btn-icon">⏳</span> Waiting for confirmation...';
    
    const transactionDigest = signResult.digest;
    let confirmed = false;
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max
    
    while (!confirmed && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
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
        console.warn('⚠️ [STORE] Error checking transaction status:', error);
      }
    }
    
    if (!confirmed) {
      console.warn('⚠️ [STORE] Transaction submitted but confirmation timeout. It may still be processing.');
    }
    
    // Step 4: Clear selection and refresh inventory
    storeState.selectedItems = {};
    
    // Reload items and inventory
    await loadStoreItems();
    await loadInventoryDisplay();
    await updateStoreUI();
    
    // Show success message
    const successMsg = confirmed 
      ? `Purchase confirmed! Transaction: ${transactionDigest.slice(0, 8)}...`
      : `Purchase submitted! Transaction: ${transactionDigest.slice(0, 8)}... (confirming...)`;
    
    if (typeof showToast === 'function') {
      showToast(successMsg, 'success');
    } else {
      alert(`Purchase Successful!\n\n${successMsg}\n\nTotal: ${purchaseData.totalUSD} ${purchaseData.paymentToken}`);
    }
    
    console.log('✅ [STORE] Purchase completed:', {
      digest: transactionDigest,
      confirmed: confirmed,
      items: items
    });
    
  } catch (error) {
    console.error('❌ [STORE] Purchase error:', error);
    
    const errorMsg = error.message || 'Unknown error occurred';
    if (typeof showToast === 'function') {
      showToast(`Purchase failed: ${errorMsg}`, 'error');
    } else {
      alert(`Purchase failed: ${errorMsg}`);
    }
  } finally {
    // Reset loading state
    storeState.isLoading = false;
    if (proceedBtn) {
      proceedBtn.disabled = false;
      proceedBtn.innerHTML = '<span class="btn-icon">💳</span> Proceed to Purchase';
    }
  }
}

/**
 * Load and display inventory from backend API
 */
async function loadInventoryDisplay() {
  // Get wallet address (if available)
  let walletAddress = null;
  if (typeof getWalletAddress === 'function') {
    walletAddress = getWalletAddress();
  } else if (window.walletAPIInstance && window.walletAPIInstance.isConnected()) {
    walletAddress = window.walletAPIInstance.getAddress();
  }
  
  if (!walletAddress) {
    // No wallet connected, inventory will be empty
    updateItemCardsInventory({});
    return;
  }
  
  try {
    // Get API base URL from config (set by api-config.js)
    const API_BASE_URL = window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3000/api';
    console.log('🔧 [STORE] Inventory using API Base URL:', API_BASE_URL);
    
    // Fetch inventory from backend
    const response = await fetch(`${API_BASE_URL}/store/inventory/${walletAddress}`);
    
    if (!response.ok) {
      console.warn('⚠️ [STORE] Failed to load inventory:', response.status);
      updateItemCardsInventory({});
      return;
    }
    
    const data = await response.json();
    
    if (!data.success) {
      console.warn('⚠️ [STORE] Inventory response error:', data.error);
      updateItemCardsInventory({});
      return;
    }
    
    // Update item cards to show inventory counts (badges)
    // Backend returns format: { "extraLives_1": 2, "forceField_2": 1, ... }
    const inventory = data.inventory || {};
    updateItemCardsInventory(inventory);
    
    console.log('✅ [STORE] Inventory loaded:', inventory);
  } catch (error) {
    console.error('❌ [STORE] Error loading inventory:', error);
    updateItemCardsInventory({});
  }
}

/**
 * Update item cards to show inventory counts
 */
function updateItemCardsInventory(inventory) {
  console.log('🔍 [INVENTORY] Updating item cards with inventory:', inventory);
  
  const cards = document.querySelectorAll('.store-item-card');
  console.log(`🔍 [INVENTORY] Found ${cards.length} item cards`);
  
  if (cards.length === 0) {
    console.warn('⚠️ [INVENTORY] No item cards found. Cards may not be created yet.');
    return;
  }
  
  cards.forEach(card => {
    const itemId = card.getAttribute('data-item-id');
    const item = getItemById(itemId);
    if (!item) {
      console.warn(`⚠️ [INVENTORY] Item not found for card: ${itemId}`);
      return;
    }
    
    // Get all level containers
    const levelContainers = card.querySelectorAll('.item-level-container');
    console.log(`🔍 [INVENTORY] Item ${itemId} has ${levelContainers.length} level containers`);
    
    levelContainers.forEach(container => {
      const level = parseInt(container.getAttribute('data-level')) || 1;
      const key = `${itemId}_${level}`;
      const quantity = inventory[key] || 0;
      
      console.log(`🔍 [INVENTORY] Checking ${key}: quantity=${quantity}`);
      
      // Find or create inventory badge
      let inventoryBadge = container.querySelector('.inventory-badge');
      
      if (quantity > 0) {
        if (!inventoryBadge) {
          inventoryBadge = document.createElement('div');
          inventoryBadge.className = 'inventory-badge';
          const levelButtonWrapper = container.querySelector('.level-button-wrapper');
          if (levelButtonWrapper) {
            // Position badge relative to the wrapper
            levelButtonWrapper.style.position = 'relative';
            levelButtonWrapper.appendChild(inventoryBadge);
            console.log(`✅ [INVENTORY] Created badge for ${key}`);
          } else {
            console.warn(`⚠️ [INVENTORY] No level-button-wrapper found for ${key}`);
          }
        }
        inventoryBadge.textContent = `Owned: ${quantity}`;
        inventoryBadge.style.display = 'block';
        console.log(`✅ [INVENTORY] Updated badge for ${key}: Owned: ${quantity}`);
      } else if (inventoryBadge) {
        inventoryBadge.style.display = 'none';
      }
    });
  });
  
  console.log('✅ [INVENTORY] Finished updating item cards');
}

/**
 * Show insufficient balance modal popup
 */
function showInsufficientBalanceModal({ required, balance, shortfall, tokenSymbol, customMessage }) {
  const viewportContainer = document.querySelector('.viewport-container');
  if (!viewportContainer) {
    console.error('❌ [STORE] Viewport container not found for balance modal');
    // Fallback to alert
    if (customMessage) {
      alert(customMessage);
    } else {
      alert(`Insufficient balance!\n\nRequired: ${required} ${tokenSymbol}\nYou have: ${balance} ${tokenSymbol}\nShortfall: ${shortfall} ${tokenSymbol}\n\nPlease add more ${tokenSymbol} to your wallet or reduce your purchase.`);
    }
    return;
  }
  
  // Remove existing modal if any
  const existingModal = document.getElementById('insufficientBalanceModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // Create modal
  const modal = document.createElement('div');
  modal.className = 'store-balance-error-modal store-balance-error-modal-visible';
  modal.setAttribute('id', 'insufficientBalanceModal');
  
  // Build content based on whether it's a custom message or balance error
  let bodyContent = '';
  if (customMessage) {
    bodyContent = `
      <p>${customMessage}</p>
    `;
  } else {
    bodyContent = `
      <p>You don't have enough ${tokenSymbol} to complete this purchase.</p>
      <div class="store-balance-error-details">
        <div class="balance-detail-row">
          <span class="balance-label">Required:</span>
          <span class="balance-value required">${required} ${tokenSymbol}</span>
        </div>
        <div class="balance-detail-row">
          <span class="balance-label">You have:</span>
          <span class="balance-value">${balance} ${tokenSymbol}</span>
        </div>
        <div class="balance-detail-row">
          <span class="balance-label">Shortfall:</span>
          <span class="balance-value shortfall">${shortfall} ${tokenSymbol}</span>
        </div>
      </div>
      <p class="balance-error-hint">Please add more ${tokenSymbol} to your wallet or reduce your purchase.</p>
    `;
  }
  
  modal.innerHTML = `
    <div class="store-balance-error-content">
      <div class="store-balance-error-header">
        <h2>⚠️ ${customMessage ? 'Error' : 'Insufficient Balance'}</h2>
      </div>
      <div class="store-balance-error-body">
        ${bodyContent}
      </div>
      <div class="store-balance-error-actions">
        <button class="menu-btn primary" onclick="closeInsufficientBalanceModal()">
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
 */
function closeInsufficientBalanceModal() {
  const modal = document.getElementById('insufficientBalanceModal');
  if (modal) {
    modal.classList.remove('store-balance-error-modal-visible');
    modal.classList.add('store-balance-error-modal-hidden');
    setTimeout(() => {
      modal.remove();
    }, 300);
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
  
  try {
    const token = storeState.paymentToken;
    console.log('💰 [STORE] Updating balance for token:', token, 'address:', walletAddress);
    
    if (token === 'mews') {
      // Fetch MEWS balance - use testnet for store
      if (window.walletAPIInstance && typeof window.walletAPIInstance.checkMEWSBalance === 'function') {
        console.log('💰 [STORE] Fetching MEWS balance...');
        const balanceResult = await window.walletAPIInstance.checkMEWSBalance(walletAddress, 'testnet');
        console.log('💰 [STORE] MEWS balance result:', balanceResult);
        if (balanceResult.success) {
          balanceValue.textContent = `${balanceResult.formattedBalance} $MEWS`;
        } else {
          balanceValue.textContent = 'Error';
        }
      } else {
        console.warn('⚠️ [STORE] checkMEWSBalance not available');
        balanceValue.textContent = '--';
      }
    } else if (token === 'sui') {
      // Fetch SUI balance using wallet API method
      console.log('💰 [STORE] Checking for checkSUIBalance method...', {
        hasInstance: !!window.walletAPIInstance,
        hasMethod: !!(window.walletAPIInstance && typeof window.walletAPIInstance.checkSUIBalance === 'function'),
        methods: window.walletAPIInstance ? Object.keys(window.walletAPIInstance) : []
      });
      
      if (window.walletAPIInstance && typeof window.walletAPIInstance.checkSUIBalance === 'function') {
        console.log('💰 [STORE] Fetching SUI balance using checkSUIBalance...');
        const balanceResult = await window.walletAPIInstance.checkSUIBalance(walletAddress, 'testnet');
        console.log('💰 [STORE] SUI balance result:', balanceResult);
        if (balanceResult.success) {
          balanceValue.textContent = `${balanceResult.formattedBalance} SUI`;
        } else {
          console.error('❌ [STORE] SUI balance check failed:', balanceResult.error);
          balanceValue.textContent = 'Error';
        }
      } else {
        // Fallback: Use the same pattern as checkMEWSBalance (create client directly)
        console.log('💰 [STORE] checkSUIBalance not available, using fallback method...');
        try {
          // Try to use the wallet API's internal client creation pattern
          // Since checkMEWSBalance works, we can replicate its pattern
          if (window.walletAPIInstance && typeof window.walletAPIInstance.checkMEWSBalance === 'function') {
            // We know checkMEWSBalance creates a client, so we can do the same for SUI
            // Access SuiClient and getFullnodeUrl from the wallet module's scope
            // Since they're used in checkMEWSBalance, they should be available
            const network = 'testnet';
            
            // Try to access via global scope or use the same imports
            // The wallet module should have these available
            if (typeof window.WalletAPI !== 'undefined' && window.WalletAPI.SuiClient) {
              const SuiClient = window.WalletAPI.SuiClient;
              const getFullnodeUrl = window.WalletAPI.getFullnodeUrl;
              const client = new SuiClient({ url: getFullnodeUrl(network) });
              const balance = await client.getBalance({ owner: walletAddress });
              const balanceInSUI = parseInt(balance.totalBalance) / 1_000_000_000;
              const formattedBalance = balanceInSUI.toLocaleString('en-US', {
                maximumFractionDigits: 4,
                useGrouping: true
              });
              balanceValue.textContent = `${formattedBalance} SUI`;
            } else {
              // Last resort: call checkMEWSBalance to verify the pattern works, then replicate for SUI
              // Actually, let's just show a message that the method needs to be available
              console.warn('⚠️ [STORE] Cannot fetch SUI balance - checkSUIBalance method not available and fallback failed');
              balanceValue.textContent = '--';
            }
          } else {
            console.warn('⚠️ [STORE] checkSUIBalance not available and no fallback possible');
            balanceValue.textContent = '--';
          }
        } catch (fallbackError) {
          console.error('❌ [STORE] Fallback SUI balance fetch failed:', fallbackError);
          balanceValue.textContent = 'Error';
        }
      }
    }
  } catch (error) {
    console.error('❌ [STORE] Error updating balance:', error);
    balanceValue.textContent = 'Error';
  }
}

// Make functions globally accessible for onclick handlers
if (typeof window !== 'undefined') {
  window.showStore = showStore;
  window.hideStore = hideStore;
  window.setPaymentToken = setPaymentToken;
  window.selectStoreItem = selectStoreItem;
  window.addItemToSelection = addItemToSelection;
  window.removeItemFromSelection = removeItemFromSelection;
  window.setItemQuantity = setItemQuantity;
  window.clearLevelSelection = clearLevelSelection;
  window.clearStoreSelection = clearStoreSelection;
  window.proceedToPurchase = proceedToPurchase;
  window.convertUsdToToken = convertUsdToToken;
  window.formatTokenAmount = formatTokenAmount;
  window.formatUsdPrice = formatUsdPrice;
  window.getItemQuantity = getItemQuantity;
  window.loadStoreItems = loadStoreItems;
  window.loadInventoryDisplay = loadInventoryDisplay;
  window.closeInsufficientBalanceModal = closeInsufficientBalanceModal;
  window.handleStoreWalletConnect = handleStoreWalletConnect;
  window.cancelStoreWalletConnect = cancelStoreWalletConnect;
}

