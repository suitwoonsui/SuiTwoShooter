// ==========================================
// STORE INVENTORY - Inventory Display and Management
// ==========================================
// Handles loading and displaying player inventory from blockchain

console.log('✅ [STORE INVENTORY] Store inventory module loaded');

/**
 * Load and display inventory from blockchain
 */
async function loadInventoryDisplay() {
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
  
  try {
    // Get API base URL
    const API_BASE_URL = window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3000/api';
    
    // Use cache if available, otherwise fetch fresh
    const cacheKey = `inventory:${walletAddress}`;
    let inventory = {};
    
    if (window.apiRequestCache) {
      // Use cache with 30 second TTL
      const data = await window.apiRequestCache.get(
        cacheKey,
        async () => {
          const response = await fetch(`${API_BASE_URL}/store/inventory/${walletAddress}`);
          
          if (!response.ok) {
            throw new Error(`Failed to load inventory: ${response.status} ${response.statusText}`);
          }
          
          const result = await response.json();
          
          if (!result.success) {
            throw new Error(result.error || 'Invalid response from server');
          }
          
          return result.inventory || {};
        },
        {
          ttl: 30000, // 30 seconds
          walletAddress: walletAddress
        }
      );
      inventory = data;
    } else {
      // Fallback to direct fetch if cache not available
      const response = await fetch(`${API_BASE_URL}/store/inventory/${walletAddress}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load inventory: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Invalid response from server');
      }
      
      inventory = data.inventory || {};
    }
    
    console.log('📦 [STORE INVENTORY] Inventory loaded:', inventory);
    
    // Update item cards with inventory
    if (typeof updateItemCardsInventory === 'function') {
      updateItemCardsInventory(inventory);
    } else {
      console.warn('⚠️ [STORE INVENTORY] updateItemCardsInventory() not available');
    }
    
  } catch (error) {
    console.error('❌ [STORE INVENTORY] Error loading inventory:', error);
    // Don't show error to user - inventory is optional
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
      const key = `${itemId}_${level}`;
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

