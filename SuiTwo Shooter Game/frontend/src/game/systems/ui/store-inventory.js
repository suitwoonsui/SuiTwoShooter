// ==========================================
// STORE INVENTORY - Inventory Display and Management
// ==========================================
// Handles loading and displaying player inventory from blockchain

console.log('✅ [STORE INVENTORY] Store inventory module loaded');

function normalizeInventoryKeys(inventory) {
  const out = {};
  const source = inventory && typeof inventory === 'object' ? inventory : {};
  for (const [key, value] of Object.entries(source)) {
    if (typeof value !== 'number' || value <= 0) continue;
    const k = String(key);
    // Normalize backend keys like extra_lives_level_1 -> extra_lives_1
    // BUT avoid corrupting canonical item ids that already include `_level`
    // (e.g. `orb_level_1` should stay `orb_level_1`, not become `orb_1`).
    let normalized = k;
    const m = /^(.+)_level_(\d+)$/i.exec(k);
    if (m) {
      const base = String(m[1] || '');
      const level = String(m[2] || '');
      // Only collapse Move-struct style keys like `extra_lives_level_1`.
      // If `base` has no underscore (e.g. `orb_level_1` parses as base=`orb`),
      // treat it as already-canonical and keep the original key.
      normalized = base.includes('_') ? `${base}_${level}` : k;
    }
    out[normalized] = (out[normalized] || 0) + value;
  }
  return out;
}

/**
 * Load and display inventory from blockchain
 * @param {Record<string, number>|null|undefined} preloadedInventory - When set (e.g. from GET /api/player/reservoir-bundle), skip fetch
 */
async function loadInventoryDisplay(preloadedInventory = null) {
  console.log('📦 [STORE INVENTORY] Loading inventory display...');
  
  // Get wallet address
  let walletAddress = null;
  if (typeof getWalletAddress === 'function') {
    walletAddress = getWalletAddress();
  } else if (window.walletAPIInstance && window.walletAPIInstance.isConnected()) {
    walletAddress = window.walletAPIInstance.getAddress();
  }
  
  if (!walletAddress) {
    console.warn('⚠️ [STORE INVENTORY] No wallet address available');
    return;
  }

  if (preloadedInventory != null && typeof preloadedInventory === 'object') {
    const inventory = normalizeInventoryKeys(preloadedInventory);
    if (window.PlayerInventoryCache) {
      window.PlayerInventoryCache.setInventory(walletAddress, inventory, { source: 'preloaded' });
    }
    if (typeof updateItemCardsInventory === 'function') updateItemCardsInventory(inventory);
    console.log('📦 [STORE INVENTORY] Applied preloaded inventory (bundle path)');
    return;
  }

  const cachedFresh = window.PlayerInventoryCache?.getFreshOrNull?.(walletAddress);
  if (cachedFresh) {
    if (typeof updateItemCardsInventory === 'function') updateItemCardsInventory(cachedFresh);
    console.log('📦 [STORE INVENTORY] Using PlayerInventoryCache (no network)');
    return;
  }

  const ttlMs = window.PlayerInventoryCache?.ttlMs || 15 * 60 * 1000;
  const prefetched = window.__prefetchedInventory;
  if (
    prefetched &&
    prefetched.address === walletAddress &&
    (Date.now() - prefetched.at) < ttlMs
  ) {
    const inventory = normalizeInventoryKeys(prefetched.inventory || {});
    if (window.PlayerInventoryCache) {
      window.PlayerInventoryCache.setInventory(walletAddress, inventory, { source: 'prefetched-legacy' });
    }
    if (typeof updateItemCardsInventory === 'function') updateItemCardsInventory(inventory);
    return;
  }

  try {
    if (window.PlayerInventoryCache) {
      await window.PlayerInventoryCache.fetchReservoirBundleAndCache(walletAddress);
      const inv = window.PlayerInventoryCache.getFreshOrNull(walletAddress);
      if (inv && typeof updateItemCardsInventory === 'function') {
        updateItemCardsInventory(inv);
      }
      console.log('📦 [STORE INVENTORY] Loaded via reservoir-bundle');
      return;
    }
  } catch (e) {
    console.warn('📦 [STORE INVENTORY] Reservoir bundle failed, falling back to /inventory', e);
  }

  try {
    const API_BASE_URL = window.GameApi ? window.GameApi.getBaseUrl() : (window.GAME_CONFIG?.GAME_BACKEND_URL || window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3001/api');
    const cacheKey = `inventory:${walletAddress}`;
    let inventory = {};

    if (window.apiRequestCache) {
      const data = await window.apiRequestCache.get(
        cacheKey,
        async () => {
          const response = await fetch(`${API_BASE_URL}/inventory/${walletAddress}?contract=new`);

          if (!response.ok) {
            throw new Error(`Failed to load inventory: ${response.status} ${response.statusText}`);
          }

          const result = await response.json();

          if (!result.success) {
            throw new Error(result.error || 'Invalid response from server');
          }

          return normalizeInventoryKeys(result.inventory || {});
        },
        {
          ttl: ttlMs,
          walletAddress: walletAddress,
        }
      );
      inventory = data;
    } else {
      const response = await fetch(`${API_BASE_URL}/inventory/${walletAddress}?contract=new`);

      if (!response.ok) {
        throw new Error(`Failed to load inventory: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Invalid response from server');
      }

      inventory = normalizeInventoryKeys(data.inventory || {});
    }

    if (window.PlayerInventoryCache) {
      window.PlayerInventoryCache.setInventory(walletAddress, inventory, { source: 'inventory-api' });
    }

    console.log('📦 [STORE INVENTORY] Inventory loaded (fallback):', inventory);

    if (typeof updateItemCardsInventory === 'function') {
      updateItemCardsInventory(inventory);
    } else {
      console.warn('⚠️ [STORE INVENTORY] updateItemCardsInventory() not available');
    }
  } catch (error) {
    console.error('❌ [STORE INVENTORY] Error loading inventory:', error);
  }
}

/**
 * Update item cards with inventory information
 */
function updateItemCardsInventory(inventory) {
  console.log('🔍 [STORE INVENTORY] Updating item cards with inventory:', inventory);
  
  const cards = document.querySelectorAll('.store-item-card');
  console.log(`🔍 [STORE INVENTORY] Found ${cards.length} item cards`);
  
  if (cards.length === 0) {
    console.warn('⚠️ [STORE INVENTORY] No item cards found. Cards may not be created yet.');
    return;
  }
  
  cards.forEach(card => {
    const itemId = card.getAttribute('data-item-id');
    const item = typeof getItemById === 'function' ? getItemById(itemId) : null;
    if (!item) {
      console.warn(`⚠️ [STORE INVENTORY] Item not found for card: ${itemId}`);
      return;
    }
    
    // Get all level containers
    const levelContainers = card.querySelectorAll('.item-level-container');
    console.log(`🔍 [STORE INVENTORY] Item ${itemId} has ${levelContainers.length} level containers`);
    
    levelContainers.forEach(container => {
      const level = parseInt(container.getAttribute('data-level')) || 1;
      const levels = Array.isArray(item?.levels) ? item.levels : [];
      const hasLevels = levels.length > 0;
      const key = hasLevels ? `${itemId}_${level}` : `${itemId}`;
      const quantity = inventory[key] || 0;
      
      console.log(`🔍 [STORE INVENTORY] Checking ${key}: quantity=${quantity}`);
      
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
            console.log(`✅ [STORE INVENTORY] Created badge for ${key}`);
          } else {
            console.warn(`⚠️ [STORE INVENTORY] No level-button-wrapper found for ${key}`);
          }
        }
        inventoryBadge.textContent = `Owned: ${quantity}`;
        inventoryBadge.style.display = 'block';
        console.log(`✅ [STORE INVENTORY] Updated badge for ${key}: Owned: ${quantity}`);
      } else if (inventoryBadge) {
        inventoryBadge.style.display = 'none';
      }
    });
  });
  
  console.log('✅ [STORE INVENTORY] Finished updating item cards');
}

// Expose globally
if (typeof window !== 'undefined') {
  window.loadInventoryDisplay = loadInventoryDisplay;
  window.updateItemCardsInventory = updateItemCardsInventory;
}

