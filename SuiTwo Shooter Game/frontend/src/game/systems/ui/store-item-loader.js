// ==========================================
// STORE ITEM LOADER - Load Items from Backend
// ==========================================
// Handles fetching and loading store items from the backend API

console.log('✅ [STORE ITEM LOADER] Store item loader module loaded');

/**
 * Load store items from backend API
 */
async function loadStoreItems() {
  console.log('📦 [STORE ITEM LOADER] Loading store items from backend...');
  
  const container = document.getElementById('storeItemsContainer');
  const loading = document.getElementById('storeLoading');
  
  if (!container || !loading) return;
  
  // Update local state reference
  if (typeof updateStoreStateReference === 'function') {
    updateStoreStateReference();
  }
  const state = typeof getStoreState === 'function' ? getStoreState() : null;
  
  // Show loading state
  if (state) {
    state.isLoading = true;
    // Update StoreService state if available
    if (typeof StoreService !== 'undefined' && StoreService._state) {
      StoreService._state.isLoading = true;
    }
  }
  loading.style.display = 'block';
  container.innerHTML = '';
  container.appendChild(loading);

  try {
    // Get API base URL from config (set by api-config.js)
    const API_BASE_URL = window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3000/api';
    console.log('🔧 [STORE ITEM LOADER] Using API Base URL:', API_BASE_URL);
    
    // Fetch items from backend
    const response = await fetch(`${API_BASE_URL}/store/items`);
    
    if (!response.ok) {
      throw new Error(`Failed to load store items: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.success || !data.items) {
      throw new Error(data.error || 'Invalid response from server');
    }
    
    // Store prices for conversion with timestamp
    if (data.prices) {
      const timestamp = Date.now();
      if (state) {
        state.tokenPrices = data.prices;
        state.tokenPricesTimestamp = timestamp;
      }
      // Update StoreService state if available
      if (typeof StoreService !== 'undefined' && StoreService._state) {
        StoreService._state.tokenPrices = data.prices;
        StoreService._state.tokenPricesTimestamp = timestamp;
      }
      console.log('✅ [STORE ITEM LOADER] Cached prices with timestamp', { prices: data.prices, timestamp });
    }
    
    // Clear loading
    loading.style.display = 'none';
    container.innerHTML = '';
    
    // Render each item (with badge discount applied)
    // Delegate to store-item-rendering.js if available
    if (typeof createItemCard === 'function') {
      for (const item of data.items) {
        const itemCard = await createItemCard(item);
        container.appendChild(itemCard);
      }
    } else {
      console.error('❌ [STORE ITEM LOADER] createItemCard() not available');
    }
    
    if (state) {
      state.isLoading = false;
      // Update StoreService state if available
      if (typeof StoreService !== 'undefined' && StoreService._state) {
        StoreService._state.isLoading = false;
      }
    }
    console.log(`✅ [STORE ITEM LOADER] Loaded ${data.items.length} items from backend`);
  } catch (error) {
    console.error('❌ [STORE ITEM LOADER] Error loading items:', error);
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
    if (state) {
      state.isLoading = false;
      // Update StoreService state if available
      if (typeof StoreService !== 'undefined' && StoreService._state) {
        StoreService._state.isLoading = false;
      }
    }
  }
}

// Expose globally
if (typeof window !== 'undefined') {
  window.loadStoreItems = loadStoreItems;
}

