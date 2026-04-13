// ==========================================
// STORE INVENTORY TAB - Inventory Management Tab
// ==========================================
// Displays player inventory with merge functionality.
// Which screens include this tab (vs Items/Bundles/Game Pass/Tickets) is defined in store-context-rules.js.

console.log('✅ [STORE INVENTORY TAB] Store inventory tab module loaded');

function _getStoreContextForInventoryTab() {
  if (typeof StoreService !== 'undefined' && StoreService._state) {
    return StoreService._state.context || 'main-menu';
  }
  if (typeof getStoreState === 'function') {
    const state = getStoreState();
    return state?.context || 'main-menu';
  }
  return 'main-menu';
}

const StoreInventoryTab = {
  _selected: null,
  _normalizeInventoryKeys(inventory) {
    const out = {};
    const source = inventory && typeof inventory === 'object' ? inventory : {};
    for (const [key, value] of Object.entries(source)) {
      if (typeof value !== 'number' || value <= 0) continue;
      const k = String(key);
      let normalized = k;
      const m = /^(.+)_level_(\d+)$/i.exec(k);
      if (m) {
        const base = String(m[1] || '');
        const level = String(m[2] || '');
        normalized = base.includes('_') ? `${base}_${level}` : k;
      }
      out[normalized] = (out[normalized] || 0) + value;
    }
    return out;
  },
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
      console.log('📊 [STORE INVENTORY TAB] Refreshing token prices for merge fees...');
      let tokenPrices = null;
      if (typeof StoreDataSources !== 'undefined' && StoreDataSources.ensureStoreTokenPrices) {
        tokenPrices = await StoreDataSources.ensureStoreTokenPrices();
      }
      if (!tokenPrices) {
        console.warn('⚠️ [STORE INVENTORY TAB] Failed to refresh prices');
      }
      
      // If still no prices, warn but continue
      if (!tokenPrices) {
        console.warn('⚠️ [STORE INVENTORY TAB] No prices available, merge fees may be inaccurate');
      }
      
      // Prefer shared inventory cache (15m TTL) for consistency with Store + item-selection flows.
      // Fall back to short-lived prefetched inventory, then finally fetch.
      let inventory = window.PlayerInventoryCache?.getFreshOrNull?.(walletAddress) || null;
      if (inventory) {
        console.log('📦 [STORE INVENTORY TAB] Using PlayerInventoryCache (no network)');
      }
      if (!inventory) {
        const ttlMs = window.PlayerInventoryCache?.ttlMs || 15 * 60 * 1000;
        const prefetched = window.__prefetchedInventory;
        if (prefetched && prefetched.address === walletAddress && prefetched.at && (Date.now() - prefetched.at) < ttlMs) {
          inventory = prefetched.inventory || {};
          console.log('📦 [STORE INVENTORY TAB] Using prefetched inventory');
        }
      }
      if (!inventory) {
        // Fetch via reservoir-bundle path when available (keeps PlayerInventoryCache in sync).
        if (window.PlayerInventoryCache?.fetchReservoirBundleAndCache) {
          await window.PlayerInventoryCache.fetchReservoirBundleAndCache(walletAddress);
          inventory = window.PlayerInventoryCache.getFreshOrNull(walletAddress) || {};
        } else {
          const API_BASE_URL = window.GameApi ? window.GameApi.getBaseUrl() : (window.GAME_CONFIG?.GAME_BACKEND_URL || window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3001/api');
          const response = await fetch(`${API_BASE_URL}/inventory/${walletAddress}?contract=new`, { cache: 'no-store' });
          if (!response.ok) throw new Error(`Failed to load inventory: ${response.status} ${response.statusText}`);
          const result = await response.json();
          if (!result.success) throw new Error(result.error || 'Invalid response from server');
          inventory = result.inventory || {};
        }
      }
      inventory = this._normalizeInventoryKeys(inventory);
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
    const storeCtx = _getStoreContextForInventoryTab();
    const isPrep =
      typeof window.isPrepLoadoutStoreContext === 'function' && window.isPrepLoadoutStoreContext(storeCtx);

    if (isPrep && typeof window.prepLoadoutOnInventoryRenderMaybeResetSession === 'function') {
      if (window.prepLoadoutOnInventoryRenderMaybeResetSession()) {
        this._selected = null;
      }
    }

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
    
    function deriveInventoryItemOrderFromOfferOrder(offerOrder, itemsByType) {
      const oo = Array.isArray(offerOrder) ? offerOrder : [];
      const presentTypes = new Set(Object.keys(itemsByType || {}));
      if (presentTypes.size === 0) return [];

      const out = [];
      const seen = new Set();
      for (const raw of oo) {
        const id = String(raw ?? '').trim().toLowerCase();
        if (!id) continue;
        const m = id.match(/^(.+):l\d+$/);
        const base = (m ? m[1] : id).trim();
        if (!base) continue;
        if (!presentTypes.has(base)) continue;
        if (seen.has(base)) continue;
        seen.add(base);
        out.push(base);
      }

      // Append remaining inventory-only items in stable order.
      const remaining = Array.from(presentTypes).filter((k) => !seen.has(k));
      remaining.sort((a, b) => String(a).localeCompare(String(b)));
      out.push(...remaining);
      return out;
    }

    // Prefer authoritative store ordering (on-chain Stockroom `catalog_order` propagated as `offerOrder`).
    // Fall back to the legacy hardcoded ordering for safety.
    const offerOrder =
      (typeof StoreService !== 'undefined' && StoreService._state && Array.isArray(StoreService._state.offerOrder))
        ? StoreService._state.offerOrder
        : (typeof getStoreState === 'function' && Array.isArray(getStoreState()?.offerOrder))
          ? getStoreState().offerOrder
          : null;

    const derivedOrder = deriveInventoryItemOrderFromOfferOrder(offerOrder, itemsByType);
    const itemOrder = derivedOrder.length
      ? derivedOrder
      : ['extra_lives', 'force_field', 'orb_level', 'coin_tractor_beam', 'slow_time', 'destroy_all', 'boss_kill_shot'];
    
    // Build HTML for each item type in consistent order
    let itemsHTML = '';
    for (const itemType of itemOrder) {
      if (itemsByType[itemType]) {
        itemsHTML += this._renderItemType(itemType, itemsByType[itemType]);
      }
    }
    
    const mergeSubtitle = isPrep
      ? 'Click a level to use for this run and for merging. Same selection: merge actions on the right. Click again to clear.'
      : 'Click an item level to prepare a merge. Merge actions are on the right.';

    container.innerHTML = `
      <div class="inventory-tab-content">
        <div class="inventory-header">
          <h3 class="inventory-title">📦 Your Inventory</h3>
          <p class="inventory-subtitle">
            ${mergeSubtitle}
          </p>
        </div>

        <div class="inventory-items-container" data-inventory-items-container data-inventory-merge-zone>
          ${itemsHTML}
        </div>
      </div>
    `;

    this._pruneInvalidInventorySelection(itemsByType, isPrep);
    this._attachInventorySelectionHandlers(itemsByType, isPrep);
    if (this._selected) {
      this._highlightSelectedCard(this._selected.itemType, this._selected.level);
    } else {
      this._highlightSelectedCard(null, null);
    }
    this._ensureMergePanelRendered(itemsByType);
  },

  /**
   * Drop merge/run selection if that stack no longer exists (e.g. after merge).
   * @param {boolean} isPrep
   */
  _pruneInvalidInventorySelection(itemsByType, isPrep) {
    if (!this._selected) return;
    const { itemType, level } = this._selected;
    const lvl = Number(level || 1) || 1;
    const itemData = itemsByType?.[itemType];
    const qty = itemData?.levels?.[lvl];
    if (!itemData || typeof qty !== 'number' || qty < 1) {
      this._selected = null;
      if (isPrep && typeof window.clearPrepLoadoutGameItemSelection === 'function') {
        window.clearPrepLoadoutGameItemSelection();
      }
    }
  },

  /**
   * Prep loadout: one row drives merge panel and game start item selection.
   */
  _selectInventoryRowPrepAndMerge(itemType, levelNum, itemsByType) {
    const same = this._selected?.itemType === itemType && Number(this._selected?.level) === Number(levelNum);
    if (same) {
      this._selected = null;
      if (typeof window.clearPrepLoadoutGameItemSelection === 'function') {
        window.clearPrepLoadoutGameItemSelection();
      }
      this._highlightSelectedCard(null, null);
      this._renderMergePanelBody(itemsByType);
      return;
    }
    this._selected = { itemType, level: levelNum };
    if (typeof window.setPrepLoadoutGameItemSelectionFromRow === 'function') {
      window.setPrepLoadoutGameItemSelectionFromRow(itemType, levelNum);
    }
    this._highlightSelectedCard(itemType, levelNum);
    this._renderMergePanelBody(itemsByType);
  },
  
  /**
   * Group inventory items by type
   * @param {Object} inventory - Raw inventory data
   * @returns {Object} Items grouped by type with levels
   */
  _groupItemsByType(inventory) {
    const itemsByType = {};
    
    // Item type mappings (snake_case keys from backend: extra_lives_1, force_field_2, etc.)
    const itemTypeMap = {
      'extra_lives': 'Extra Lives',
      'force_field': 'Force Field Start',
      'orb_level': 'Orb Level Start',
      'slow_time': 'Slow Time Power',
      'coin_tractor_beam': 'Coin Tractor Beam',
      'destroy_all': 'Destroy All Enemies',
      'boss_kill_shot': 'Boss Kill Shot'
    };
    
    // Parse inventory data
    // Backend format: "itemType_level" (e.g., "extra_lives_1", "force_field_2")
    // Or single items: "destroy_all", "boss_kill_shot" (no level)
    for (const [key, quantity] of Object.entries(inventory)) {
      if (quantity > 0) {
        let itemType = '';
        let level = 1;
        
        // Only treat as leveled when the key ends in _<digits>.
        // This allows non-leveled keys that contain underscores (e.g. boss_kill_shot, destroy_all).
        const m = /^(.+)_([0-9]+)$/.exec(String(key));
        if (m) {
          itemType = m[1];
          level = parseInt(m[2], 10) || 1;
        } else {
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
   * @param {string} itemType - Item type key (e.g., 'extra_lives')
   * @param {number} level - Item level (1, 2, or 3)
   * @returns {string} Description text
   */
  _getItemDescription(itemType, level) {
    // Try to get from backend items via getItemById
    if (typeof getItemById === 'function') {
      const item = getItemById(itemType);
      if (item && item.levels) {
        const levelData = item.levels.find(l => l.level === level);
        if (levelData && levelData.description) {
          return levelData.description;
        }
      }
    }
    
    // Fallback descriptions if catalog not available
    const fallbackDescriptions = {
      'extra_lives': {
        1: 'Start the game with 1 extra life',
        2: 'Start the game with 2 extra lives',
        3: 'Start the game with 3 extra lives'
      },
      'force_field': {
        1: 'Start with Level 1 force field active (normally requires 5 coin streak)',
        2: 'Start with Level 2 force field active (normally requires 12 coin streak)',
        3: 'Start with Level 3 force field active (normally requires 30 coin streak)'
      },
      'orb_level': {
        1: 'Begin at Orb Level 2 (skip initial grind)',
        2: 'Begin at Orb Level 3 (stronger starting power)',
        3: 'Begin at Orb Level 4 (very strong starting power)'
      },
      'slow_time': {
        1: 'Slow time for 4 seconds (50% speed reduction)',
        2: 'Slow time for 6 seconds (50% speed reduction)',
        3: 'Slow time for 8 seconds (50% speed reduction)'
      },
      'coin_tractor_beam': {
        1: 'Pull coins from 30% of screen range for 4 seconds',
        2: 'Pull coins from 60% of screen range for 6 seconds',
        3: 'Pull coins from 90% of screen range for 8 seconds'
      },
      'destroy_all': {
        1: 'Instantly destroy all enemies on screen (one-time use per game)'
      },
      'boss_kill_shot': {
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
    const singleLevelItems = ['destroy_all', 'boss_kill_shot'];
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
    
    // If prices are not available, try to get them from the backend
    // This ensures we always have fresh prices even if loadStoreItems() hasn't completed yet
    if (!tokenPrices) {
      console.warn('⚠️ [STORE INVENTORY TAB] Token prices not in state, prices may be inaccurate');
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

      levelsHTML += `
        <div class="inventory-item-level-card"
             role="button"
             tabindex="0"
             data-inventory-select-item-type="${itemType}"
             data-inventory-select-level="${levelNum}">
          <div class="inventory-item-level-info">
            <div class="inventory-item-level-header">
              ${!isSingleLevel ? `<span class="inventory-item-level-badge">Level ${levelNum}</span>` : ''}
              <span class="inventory-item-quantity-badge">${quantity}x</span>
            </div>
            <div class="inventory-item-level-name">${name}</div>
            <div class="inventory-item-level-description">${description}</div>
          </div>
          <div class="inventory-item-level-action">
            ${isSingleLevel ? `
              <span class="inventory-status-badge inventory-single-level">
                <span class="status-icon">📌</span> Fixed Tier
              </span>
            ` : levelNum >= 3 ? `
              <span class="inventory-status-badge inventory-max-level">
                <span class="status-icon">⭐</span> Max Level
              </span>
            ` : canMerge ? `
              <span class="inventory-status-badge inventory-can-merge">
                <span class="status-icon">🔗</span> Select to merge
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
   * Attach click/keyboard handlers for selecting an item level.
   * @param {boolean} isPrep - When true, selection also sets run loadout (gameItemSelection).
   */
  _attachInventorySelectionHandlers(itemsByType, isPrep) {
    const root = document.querySelector('#storeInventoryTabContent [data-inventory-items-container]');
    if (!root) return;

    const select = (itemType, levelNum) => {
      if (isPrep) {
        this._selectInventoryRowPrepAndMerge(itemType, levelNum, itemsByType);
      } else {
        this._selected = { itemType, level: levelNum };
        this._highlightSelectedCard(itemType, levelNum);
        this._renderMergePanelBody(itemsByType);
      }
    };

    root.querySelectorAll('[data-inventory-select-item-type][data-inventory-select-level]').forEach((el) => {
      const itemType = el.getAttribute('data-inventory-select-item-type');
      const levelStr = el.getAttribute('data-inventory-select-level');
      const levelNum = Number(levelStr || 1) || 1;

      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        select(itemType, levelNum);
      });

      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          select(itemType, levelNum);
        }
      });
    });
  },

  _highlightSelectedCard(itemType, levelNum) {
    const root = document.querySelector('#storeInventoryTabContent [data-inventory-items-container]');
    if (!root) return;

    root.querySelectorAll('.inventory-item-level-card').forEach((el) => {
      el.classList.remove('inventory-merge-selected');
      el.setAttribute('aria-selected', 'false');
    });

    if (itemType == null || levelNum == null) return;

    const selected = root.querySelector(
      `.inventory-item-level-card[data-inventory-select-item-type="${CSS.escape(String(itemType))}"][data-inventory-select-level="${levelNum}"]`
    );
    if (selected) {
      selected.classList.add('inventory-merge-selected');
      selected.setAttribute('aria-selected', 'true');
    }
  },

  _ensureMergePanelRendered(itemsByType) {
    const panel = document.querySelector('[data-inventory-merge-panel]');
    const body = document.querySelector('[data-inventory-merge-body]');
    const hint = document.querySelector('[data-inventory-merge-hint]');
    if (!panel || !body || !hint) return;

    // If selection is missing or invalid, show default hint + clear body.
    if (!this._selected || !itemsByType?.[this._selected.itemType]) {
      body.innerHTML = '';
      hint.style.display = '';
      return;
    }

    hint.style.display = 'none';
    this._renderMergePanelBody(itemsByType);
  },

  _renderMergePanelBody(itemsByType) {
    const body = document.querySelector('[data-inventory-merge-body]');
    const hint = document.querySelector('[data-inventory-merge-hint]');
    if (!body || !hint) return;

    const selected = this._selected;
    if (!selected || !itemsByType?.[selected.itemType]) {
      body.innerHTML = '';
      hint.style.display = '';
      return;
    }

    hint.style.display = 'none';

    const itemData = itemsByType[selected.itemType];
    const name = itemData?.name || selected.itemType;
    const isSingleLevel = this._isSingleLevelItem(selected.itemType);
    const level = Number(selected.level || 1) || 1;
    const quantity = Number(itemData?.levels?.[level] || 0);

    if (isSingleLevel) {
      body.innerHTML = `
        <div class="store-placeholder" style="padding: 0;">
          <p style="margin: 0 0 8px 0;"><strong>${name}</strong></p>
          <p style="margin: 0; font-size: 0.95em; color: rgba(255,255,255,0.65);">
            This item is a fixed tier and can’t be merged.
          </p>
        </div>
      `;
      return;
    }

    if (level >= 3) {
      body.innerHTML = `
        <div class="store-placeholder" style="padding: 0;">
          <p style="margin: 0 0 8px 0;"><strong>${name}</strong> (Level ${level})</p>
          <p style="margin: 0; font-size: 0.95em; color: rgba(255,255,255,0.65);">
            Max level reached.
          </p>
        </div>
      `;
      return;
    }

    const canMerge = quantity >= 3;
    const canHyperMerge = level === 1 && quantity >= 9;
    const mergeFee = this._getMergeFee(level, false);
    const tokenSymbol = mergeFee.tokenType === 'sui' ? 'SUI' : (mergeFee.tokenType === 'usdc' ? 'USDC' : 'MEWS');

    const hyperFee = canHyperMerge ? this._getMergeFee(1, true) : null;
    const hyperTokenSymbol = hyperFee
      ? (hyperFee.tokenType === 'sui' ? 'SUI' : (hyperFee.tokenType === 'usdc' ? 'USDC' : 'MEWS'))
      : tokenSymbol;

    body.innerHTML = `
      <div class="store-placeholder" style="padding: 0;">
        <p style="margin: 0 0 8px 0;"><strong>${name}</strong> (Level ${level})</p>
        <p style="margin: 0 0 10px 0; font-size: 0.95em; color: rgba(255,255,255,0.65);">
          You have <strong>${quantity}x</strong>. Select 3 to merge to Level ${level + 1}${level === 1 ? ', or 9 to hyper merge to Level 3.' : '.'}
        </p>
        <div class="inventory-merge-container">
          <button type="button" class="menu-btn primary inventory-merge-btn"
                  ${canMerge ? '' : 'disabled'}
                  onclick="StoreInventoryTab.initiateMerge('${selected.itemType}', ${level}, false)">
            <span class="btn-icon">🔗</span> Merge to L${level + 1}
          </button>
          <div class="inventory-merge-price">${mergeFee.formatted} ${tokenSymbol}</div>
          ${level === 1 ? `
            <button type="button" class="menu-btn primary inventory-merge-btn inventory-hyper-merge-btn"
                    ${canHyperMerge ? '' : 'disabled'}
                    onclick="StoreInventoryTab.initiateMerge('${selected.itemType}', 1, true)">
              <span class="btn-icon">⚡</span> Hyper Merge to L3
            </button>
            <div class="inventory-merge-price">${hyperFee ? `${hyperFee.formatted} ${hyperTokenSymbol}` : ''}</div>
          ` : ''}
        </div>
      </div>
    `;
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
                       (mergeFee.tokenType === 'usdc' ? 'USDC' : 'MEWS');

    const mergeType = isHyperMerge ? 'Hyper Merge' : 'Merge';

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
          const API_BASE_URL = window.GameApi ? window.GameApi.getBaseUrl() : (window.GAME_CONFIG?.GAME_BACKEND_URL || window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3001/api');
          const response = await fetch(`${API_BASE_URL}/inventory/merge`, {
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
            
            // Keep inventory caches consistent across the app (reservoir bundle + store/item-selection).
            // Merge changes on-chain inventory, so invalidate + refetch in background.
            if (window.PlayerInventoryCache?.refreshAfterRewardBackground) {
              window.PlayerInventoryCache.refreshAfterRewardBackground(walletAddress);
            } else if (window.PlayerInventoryCache?.invalidate) {
              window.PlayerInventoryCache.invalidate(walletAddress);
            }

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

