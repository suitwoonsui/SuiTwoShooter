// ==========================================
// STORE INVENTORY TAB - Inventory Management Tab
// ==========================================
// Displays player inventory with merge functionality

console.log('✅ [STORE INVENTORY TAB] Store inventory tab module loaded');

const StoreInventoryTab = {
  // Store current payment token
  _currentPaymentToken: 'sui',
  
  /**
   * Render Inventory tab content
   * @param {string} walletAddress - Player's wallet address
   * @param {string} paymentToken - Payment token ('mews', 'sui', 'usdc')
   */
  async render(walletAddress, paymentToken = 'sui') {
    // Get payment token from state if not provided
    if (!paymentToken || paymentToken === 'sui') {
      if (typeof StoreService !== 'undefined' && StoreService.getPaymentToken) {
        paymentToken = StoreService.getPaymentToken();
      } else if (typeof getStoreState === 'function') {
        const state = getStoreState();
        paymentToken = state?.paymentToken || 'sui';
      }
    }
    
    // Store payment token for merge fee calculations
    this._currentPaymentToken = paymentToken;
    
    console.log('📦 [STORE INVENTORY TAB] Rendering inventory tab', { walletAddress, paymentToken });
    
    const container = document.getElementById('storeInventoryTabContent');
    if (!container) {
      console.error('❌ [STORE INVENTORY TAB] Container not found');
      return;
    }
    
    try {
      // Get inventory from API
      const API_BASE_URL = window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3000/api';
      const response = await fetch(`${API_BASE_URL}/store/inventory/${walletAddress}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load inventory: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Invalid response from server');
      }
      
      const inventory = result.inventory || {};
      console.log('📦 [STORE INVENTORY TAB] Inventory loaded:', inventory);
      
      // Render inventory display
      this._renderInventoryDisplay(container, inventory);
      
    } catch (error) {
      console.error('❌ [STORE INVENTORY TAB] Error loading inventory:', error);
      container.innerHTML = `
        <div class="store-placeholder">
          <p>❌ Error loading inventory</p>
          <p style="font-size: 0.9em; color: #888; margin-top: 10px;">
            ${error.message || 'Unknown error'}
          </p>
          <button class="menu-btn" onclick="switchStoreTab('inventory')" style="margin-top: 10px;">
            <span class="btn-icon">🔄</span> Retry
          </button>
        </div>
      `;
    }
  },
  
  /**
   * Render inventory display with items
   * @param {HTMLElement} container - Container element
   * @param {Object} inventory - Inventory data
   */
  _renderInventoryDisplay(container, inventory) {
    // Group items by type
    const itemsByType = this._groupItemsByType(inventory);
    
    // Check if inventory is empty
    const hasItems = Object.keys(itemsByType).length > 0;
    
    if (!hasItems) {
      container.innerHTML = `
        <div class="inventory-tab-content">
          <div class="inventory-empty-state">
            <div class="inventory-empty-icon">📦</div>
            <h3 class="inventory-empty-title">Your Inventory is Empty</h3>
            <p class="inventory-empty-message">
              You don't have any items yet. Purchase items from the Items tab to get started!
            </p>
            <button class="menu-btn primary" onclick="switchStoreTab('items')" style="margin-top: 20px;">
              <span class="btn-icon">🛒</span> Browse Items
            </button>
          </div>
        </div>
      `;
      return;
    }
    
    // Define consistent item order: coinTractorBeam should be before slowTime
    const itemOrder = ['extraLives', 'forceField', 'orbLevel', 'coinTractorBeam', 'slowTime', 'destroyAll', 'bossKillShot'];
    
    // Build HTML for each item type in consistent order
    let itemsHTML = '';
    for (const itemType of itemOrder) {
      if (itemsByType[itemType]) {
        itemsHTML += this._renderItemType(itemType, itemsByType[itemType]);
      }
    }
    
    container.innerHTML = `
      <div class="inventory-tab-content">
        <div class="inventory-header">
          <h3 class="inventory-title">📦 Your Inventory</h3>
          <p class="inventory-subtitle">
            View and manage your items. Merge 3 items of the same type and level to upgrade!
          </p>
        </div>
        
        <div class="inventory-items-container">
          ${itemsHTML}
        </div>
      </div>
    `;
    
    // Attach merge button handlers
    this._attachMergeHandlers();
  },
  
  /**
   * Group inventory items by type
   * @param {Object} inventory - Raw inventory data
   * @returns {Object} Items grouped by type with levels
   */
  _groupItemsByType(inventory) {
    const itemsByType = {};
    
    // Item type mappings (camelCase keys from backend: extraLives_1, forceField_2, etc.)
    const itemTypeMap = {
      'extraLives': 'Extra Lives',
      'forceField': 'Force Field Start',
      'orbLevel': 'Orb Level Start',
      'slowTime': 'Slow Time Power',
      'coinTractorBeam': 'Coin Tractor Beam',
      'destroyAll': 'Destroy All Enemies',
      'bossKillShot': 'Boss Kill Shot'
    };
    
    // Parse inventory data
    // Backend format: "itemType_level" (e.g., "extraLives_1", "forceField_2")
    // Or single items: "destroyAll", "bossKillShot" (no level)
    for (const [key, quantity] of Object.entries(inventory)) {
      if (quantity > 0) {
        let itemType = '';
        let level = 1;
        
        // Check if key contains underscore (has level)
        if (key.includes('_')) {
          // Format: "itemType_level" (e.g., "extraLives_1")
          const lastUnderscoreIndex = key.lastIndexOf('_');
          const levelStr = key.substring(lastUnderscoreIndex + 1);
          level = parseInt(levelStr) || 1;
          itemType = key.substring(0, lastUnderscoreIndex);
        } else {
          // Format: "itemType" (single level items like "destroyAll", "bossKillShot")
          itemType = key;
          level = 1;
        }
        
        // Get display name from map, or format camelCase to Title Case
        let displayName = itemTypeMap[itemType];
        if (!displayName) {
          // Convert camelCase to Title Case with spaces
          displayName = itemType
            .replace(/([A-Z])/g, ' $1') // Add space before capital letters
            .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
            .trim();
        }
        
        if (!itemsByType[itemType]) {
          itemsByType[itemType] = {
            name: displayName,
            levels: {}
          };
        }
        
        itemsByType[itemType].levels[level] = quantity;
      }
    }
    
    return itemsByType;
  },
  
  /**
   * Get item description for a specific level
   * @param {string} itemType - Item type key (e.g., 'extraLives')
   * @param {number} level - Item level (1, 2, or 3)
   * @returns {string} Description text
   */
  _getItemDescription(itemType, level) {
    // Try to get from item catalog if available (check both global and window)
    const catalog = typeof ITEM_CATALOG !== 'undefined' ? ITEM_CATALOG : (typeof window !== 'undefined' && window.ITEM_CATALOG ? window.ITEM_CATALOG : null);
    
    if (catalog && catalog[itemType]) {
      const item = catalog[itemType];
      if (item.levels && item.levels[level - 1]) {
        return item.levels[level - 1].description;
      }
    }
    
    // Fallback descriptions if catalog not available
    const fallbackDescriptions = {
      'extraLives': {
        1: 'Start the game with 1 extra life',
        2: 'Start the game with 2 extra lives',
        3: 'Start the game with 3 extra lives'
      },
      'forceField': {
        1: 'Start with Level 1 force field active (normally requires 5 coin streak)',
        2: 'Start with Level 2 force field active (normally requires 12 coin streak)',
        3: 'Start with Level 3 force field active (normally requires 30 coin streak)'
      },
      'orbLevel': {
        1: 'Begin at Orb Level 2 (skip initial grind)',
        2: 'Begin at Orb Level 3 (stronger starting power)',
        3: 'Begin at Orb Level 4 (very strong starting power)'
      },
      'slowTime': {
        1: 'Slow time for 4 seconds (50% speed reduction)',
        2: 'Slow time for 6 seconds (50% speed reduction)',
        3: 'Slow time for 8 seconds (50% speed reduction)'
      },
      'coinTractorBeam': {
        1: 'Pull coins from 30% of screen range for 4 seconds',
        2: 'Pull coins from 60% of screen range for 6 seconds',
        3: 'Pull coins from 90% of screen range for 8 seconds'
      },
      'destroyAll': {
        1: 'Instantly destroy all enemies on screen (one-time use per game)'
      },
      'bossKillShot': {
        1: 'Instantly defeat any boss regardless of remaining HP (one-time use per game)'
      }
    };
    
    if (fallbackDescriptions[itemType] && fallbackDescriptions[itemType][level]) {
      return fallbackDescriptions[itemType][level];
    }
    
    return 'Use this item during gameplay';
  },
  
  /**
   * Check if an item is single-level (no levels to upgrade)
   * @param {string} itemType - Item type key
   * @returns {boolean} True if item is single-level
   */
  _isSingleLevelItem(itemType) {
    // Single-level items that don't have multiple levels
    const singleLevelItems = ['destroyAll', 'bossKillShot'];
    return singleLevelItems.includes(itemType);
  },
  
  /**
   * Get merge fee for a given source level
   * @param {number} sourceLevel - Source level (1 or 2)
   * @param {boolean} isHyperMerge - If true, calculates L1→L3 direct merge fee ($1.50)
   * @returns {Object} { usd: number, formatted: string, tokenAmount: number, tokenType: string }
   */
  _getMergeFee(sourceLevel, isHyperMerge = false) {
    // Use current payment token from instance or fallback to 'sui'
    const tokenType = this._currentPaymentToken || 'sui';
    // Base fees in USD (from ITEM_MERGING_UPGRADE_SYSTEM_PLAN.md)
    const mergeFees = {
      1: 0.25,  // Level 1 → Level 2: $0.25
      2: 0.50   // Level 2 → Level 3: $0.50
    };
    
    // Hyper merge: L1→L3 direct (9 items, $1.50)
    const feeUsd = isHyperMerge ? 1.50 : (mergeFees[sourceLevel] || 0);
    
    // Get token prices from StoreService
    let tokenPrices = null;
    if (typeof StoreService !== 'undefined' && StoreService.getState) {
      const state = StoreService.getState();
      tokenPrices = state.tokenPrices;
    } else if (typeof getStoreState === 'function') {
      const state = getStoreState();
      tokenPrices = state?.tokenPrices;
    }
    
    // Convert USD to token using store utils
    let tokenAmount = 0;
    let formatted = 'N/A';
    
    if (tokenPrices && typeof convertUsdToToken === 'function') {
      const conversion = convertUsdToToken(feeUsd, tokenType, tokenPrices);
      tokenAmount = conversion.amount || 0;
      formatted = conversion.formatted || 'N/A';
    } else {
      // Fallback: show USD if token prices not available
      formatted = `$${feeUsd.toFixed(2)}`;
    }
    
    return {
      usd: feeUsd,
      formatted: formatted,
      tokenAmount: tokenAmount,
      tokenType: tokenType
    };
  },
  
  /**
   * Render a single item type with all levels
   * @param {string} itemType - Item type key
   * @param {Object} itemData - Item data with name and levels
   * @returns {string} HTML string
   */
  _renderItemType(itemType, itemData) {
    const { name, levels } = itemData;
    const isSingleLevel = this._isSingleLevelItem(itemType);
    
    // Check if Level 1 has 9+ items for hyper merge option
    const level1Quantity = parseInt(levels['1'] || 0);
    const canHyperMerge = !isSingleLevel && level1Quantity >= 9;
    
    let levelsHTML = '';
    for (const [level, quantity] of Object.entries(levels)) {
      const levelNum = parseInt(level);
      const canMerge = !isSingleLevel && quantity >= 3 && levelNum < 3;
      const description = this._getItemDescription(itemType, levelNum);
      
      // Calculate merge fee if mergeable
      let mergeFeeHTML = '';
      if (canMerge) {
        const mergeFee = this._getMergeFee(levelNum);
        // Format token symbol like other tabs (SUI, $MEWS, USDC)
        const tokenSymbol = mergeFee.tokenType === 'sui' ? 'SUI' : 
                           (mergeFee.tokenType === 'usdc' ? 'USDC' : '$MEWS');
        
        // For Level 1, show both standard merge and hyper merge if available
        if (levelNum === 1 && canHyperMerge) {
          const hyperMergeFee = this._getMergeFee(1, true);
          const hyperTokenSymbol = hyperMergeFee.tokenType === 'sui' ? 'SUI' : 
                                   (hyperMergeFee.tokenType === 'usdc' ? 'USDC' : '$MEWS');
          mergeFeeHTML = `
            <div class="inventory-merge-container">
              <button class="menu-btn primary inventory-merge-btn" 
                      onclick="StoreInventoryTab.initiateMerge('${itemType}', ${levelNum}, false)"
                      data-item-type="${itemType}"
                      data-level="${levelNum}">
                <span class="btn-icon">🔗</span> Merge to L2
              </button>
              <div class="inventory-merge-price">
                ${mergeFee.formatted} ${tokenSymbol}
              </div>
              <button class="menu-btn primary inventory-merge-btn inventory-hyper-merge-btn" 
                      onclick="StoreInventoryTab.initiateMerge('${itemType}', ${levelNum}, true)"
                      data-item-type="${itemType}"
                      data-level="${levelNum}"
                      data-hyper="true">
                <span class="btn-icon">⚡</span> Hyper Merge to L3
              </button>
              <div class="inventory-merge-price">
                ${hyperMergeFee.formatted} ${hyperTokenSymbol}
              </div>
            </div>
          `;
        } else {
          mergeFeeHTML = `
            <div class="inventory-merge-container">
              <button class="menu-btn primary inventory-merge-btn" 
                      onclick="StoreInventoryTab.initiateMerge('${itemType}', ${levelNum}, false)"
                      data-item-type="${itemType}"
                      data-level="${levelNum}">
                <span class="btn-icon">🔗</span> Merge
              </button>
              <div class="inventory-merge-price">
                ${mergeFee.formatted} ${tokenSymbol}
              </div>
            </div>
          `;
        }
      }
      
      levelsHTML += `
        <div class="inventory-item-level-card">
          <div class="inventory-item-level-info">
            <div class="inventory-item-level-header">
              ${!isSingleLevel ? `<span class="inventory-item-level-badge">Level ${levelNum}</span>` : ''}
              <span class="inventory-item-quantity-badge">${quantity}x</span>
            </div>
            <div class="inventory-item-level-name">${name}</div>
            <div class="inventory-item-level-description">${description}</div>
          </div>
          <div class="inventory-item-level-action">
            ${canMerge ? mergeFeeHTML : isSingleLevel ? `
              <span class="inventory-status-badge inventory-single-level">
                <span class="status-icon">📌</span> Fixed Tier
              </span>
            ` : levelNum >= 3 ? `
              <span class="inventory-status-badge inventory-max-level">
                <span class="status-icon">⭐</span> Max Level
              </span>
            ` : `
              <span class="inventory-status-badge inventory-cannot-merge">
                <span class="status-icon">⏳</span> Need 3+ to merge
              </span>
            `}
          </div>
        </div>
      `;
    }
    
    return `
      <div class="inventory-item-type-card">
        <div class="inventory-item-type-header">
          <h4 class="inventory-item-type-name">${name}</h4>
        </div>
        <div class="inventory-item-levels">
          ${levelsHTML}
        </div>
      </div>
    `;
  },
  
  /**
   * Attach merge button handlers
   */
  _attachMergeHandlers() {
    // Handlers are attached via onclick in the HTML
    // This method can be used for additional setup if needed
  },
  
  /**
   * Initiate merge process
   * @param {string} itemType - Item type to merge
   * @param {number} sourceLevel - Source level
   * @param {boolean} isHyperMerge - If true, performs L1→L3 direct merge (9 items), otherwise standard merge (3 items)
   */
  async initiateMerge(itemType, sourceLevel, isHyperMerge = false) {
    console.log('🔗 [STORE INVENTORY TAB] Initiating merge', { itemType, sourceLevel, isHyperMerge });
    
    // Get wallet address
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

    // Get payment token from store state
    let paymentToken = 'sui';
    if (typeof StoreService !== 'undefined' && StoreService.getPaymentToken) {
      paymentToken = StoreService.getPaymentToken();
    } else if (typeof getStoreState === 'function') {
      const state = getStoreState();
      paymentToken = state?.paymentToken || 'sui';
    }

    // Get badge discount
    let badgeDiscount = 0;
    try {
      if (window.BadgeService && window.BadgeService.getBadge) {
        const badgeData = await window.BadgeService.getBadge(walletAddress);
        if (badgeData.success && badgeData.hasBadge && badgeData.badge) {
          const discounts = window.BadgeService.getDiscounts 
            ? window.BadgeService.getDiscounts(badgeData.badge.tier)
            : { storeDiscount: 0 };
          badgeDiscount = discounts.storeDiscount || 0;
        }
      }
    } catch (error) {
      console.warn('Failed to get badge discount for merge', error);
    }

    // Determine target level and items needed
    const targetLevel = isHyperMerge ? 3 : (sourceLevel + 1);
    const itemsNeeded = isHyperMerge ? 9 : 3;
    const mergeFee = this._getMergeFee(sourceLevel, isHyperMerge);
    const tokenSymbol = mergeFee.tokenType === 'sui' ? 'SUI' : 
                       (mergeFee.tokenType === 'usdc' ? 'USDC' : '$MEWS');

    // Confirm merge
    const mergeType = isHyperMerge ? 'Hyper Merge' : 'Merge';
    const confirmMessage = `${mergeType}: ${itemsNeeded}x ${itemType} Level ${sourceLevel} → 1x ${itemType} Level ${targetLevel}\n\nFee: ${mergeFee.formatted} ${tokenSymbol}\n\nProceed with merge?`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      // Show loading
      const btn = document.querySelector(`[onclick*="initiateMerge('${itemType}', ${sourceLevel}, ${isHyperMerge})"]`);
      if (btn) {
        btn.disabled = true;
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<span class="btn-icon">⏳</span> Processing...';
        
        // Re-enable button after transaction (success or failure)
        const resetButton = () => {
          btn.disabled = false;
          btn.innerHTML = originalHTML;
        };

        try {
          // Call merge API
          const API_BASE_URL = window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3000/api';
          const response = await fetch(`${API_BASE_URL}/store/merge`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              playerAddress: walletAddress,
              itemType: itemType,
              sourceLevel: sourceLevel,
              targetLevel: targetLevel,
              paymentToken: paymentToken.toUpperCase(),
              isHyperMerge: isHyperMerge,
              badgeDiscount: badgeDiscount,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
          }

          const result = await response.json();

          if (!result.success) {
            throw new Error(result.error || 'Failed to build merge transaction');
          }

          // Sign and execute transaction
          if (!window.walletAPIInstance || !window.walletAPIInstance.isConnected()) {
            throw new Error('Wallet not connected');
          }

          const executeResult = await window.walletAPIInstance.signAndExecuteTransaction(result.transaction);

          if (executeResult.success) {
            alert(`✅ ${mergeType} successful! You now have 1x ${itemType} Level ${targetLevel}.`);
            
            // Refresh inventory display
            await this.render(walletAddress, paymentToken);
            
            // Refresh game pass display (in case credits/tickets changed)
            if (window.GamePassDisplay) {
              await window.GamePassDisplay.refresh(walletAddress, true, true);
            }
          } else {
            throw new Error(executeResult.error || 'Transaction execution failed');
          }
        } catch (error) {
          console.error('Merge error:', error);
          alert(`❌ Merge failed: ${error.message || 'Unknown error'}`);
        } finally {
          resetButton();
        }
      }
    } catch (error) {
      console.error('Merge error:', error);
      alert(`❌ Merge failed: ${error.message || 'Unknown error'}`);
    }
  }
};

// Expose globally
if (typeof window !== 'undefined') {
  window.StoreInventoryTab = StoreInventoryTab;
}

