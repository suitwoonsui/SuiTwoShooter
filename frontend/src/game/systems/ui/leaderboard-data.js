// ==========================================
// LEADERBOARD DATA - Blockchain Data Fetching
// ==========================================

// Use FrontendLogger if available, fallback to console
// Use var to allow redeclaration when multiple scripts are loaded
var log = (typeof window !== 'undefined' && window.FrontendLogger) 
  ? {
      debug: (cat, msg, data) => window.FrontendLogger.debug(cat, msg, data),
      info: (cat, msg, data) => window.FrontendLogger.info(cat, msg, data),
      warn: (cat, msg, data) => window.FrontendLogger.warn(cat, msg, data),
      error: (cat, msg, data) => window.FrontendLogger.error(cat, msg, data),
    }
  : {
      debug: () => {},
      info: (cat, msg, data) => console.log(`[${cat}] ${msg}`, data || ''),
      warn: (cat, msg, data) => console.warn(`[${cat}] ${msg}`, data || ''),
      error: (cat, msg, data) => console.error(`[${cat}] ${msg}`, data || ''),
    };

log.info('LEADERBOARD DATA', 'Leaderboard data module loaded');

/**
 * Fetch leaderboard data from blockchain API
 * @param {number|null} limit - Maximum number of entries to fetch
 */
async function fetchBlockchainLeaderboard(limit = null) {
  if (!window.LeaderboardService) {
    log.warn('LEADERBOARD DATA', 'LeaderboardService not available');
    return;
  }
  
  const state = window.LeaderboardService.getState();
  
  // Use 200 for mock mode testing, 1000 for production
  if (limit === null) {
    const useMock = window.GAME_CONFIG?.USE_MOCK_LEADERBOARD === true || 
                    new URLSearchParams(window.location.search).get('mock') === 'true';
    limit = useMock ? 200 : 1000;
  }
  
  if (state.isLoadingLeaderboard) {
    log.debug('LEADERBOARD DATA', 'Already loading, skipping duplicate request');
    return;
  }
  
  window.LeaderboardService.setLoading(true);
  const list = document.getElementById('modalLeaderboardList');
  
  // Show loading state
  if (list) {
    list.innerHTML = '<li class="leaderboard-item" style="text-align: center; color: #888; padding: 20px;"><span class="btn-icon">⏳</span> Loading leaderboard...</li>';
  }
  
  try {
    // Get API base URL (from config or default)
    const API_BASE_URL = window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3000/api';
    
    // Check for mock mode (for testing)
    const useMock = window.GAME_CONFIG?.USE_MOCK_LEADERBOARD === true || 
                    new URLSearchParams(window.location.search).get('mock') === 'true';
    const mockParam = useMock ? '&mock=true' : '';
    
    // Use cache if available, otherwise fetch fresh
    const cacheKey = `leaderboard:${limit || 'default'}${mockParam ? ':mock' : ''}`;
    let result = null;
    
    if (window.apiRequestCache) {
      // Use cache with 60 second TTL
      result = await window.apiRequestCache.get(
        cacheKey,
        async () => {
          log.debug('LEADERBOARD DATA', `Fetching leaderboard from: ${API_BASE_URL}/leaderboard?limit=${limit}${mockParam ? ' (MOCK MODE)' : ''}`);
          
          const response = await fetch(`${API_BASE_URL}/leaderboard?limit=${limit}${mockParam}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `HTTP error! status: ${response.status}` }));
            throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
          }
          
          return await response.json();
        },
        {
          ttl: 60000, // 60 seconds
          staleWhileRevalidate: true // Use stale cache while refreshing in background
        }
      );
    } else {
      // Fallback to direct fetch if cache not available
      log.debug('LEADERBOARD DATA', `Fetching leaderboard from: ${API_BASE_URL}/leaderboard?limit=${limit}${mockParam ? ' (MOCK MODE)' : ''}`);
      
      const response = await fetch(`${API_BASE_URL}/leaderboard?limit=${limit}${mockParam}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP error! status: ${response.status}` }));
        throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      result = await response.json();
    }
    
    // Log network info for verification
    if (result.network) {
      log.debug('LEADERBOARD DATA', `Backend network: ${result.network}${result.chainId ? ` (Chain ID: ${result.chainId})` : ''}`);
      if (result.network !== 'testnet') {
        log.warn('LEADERBOARD DATA', `WARNING: Backend is using ${result.network}, not testnet!`);
      }
    }
    
    if (result.leaderboard && Array.isArray(result.leaderboard)) {
      window.LeaderboardService.setLeaderboardData(result.leaderboard);
      log.debug('LEADERBOARD DATA', `Loaded ${result.leaderboard.length} entries from blockchain`);
      
      // Update display
      if (typeof window.displayLeaderboardModal === 'function') {
        window.displayLeaderboardModal();
      }
    } else {
      log.warn('LEADERBOARD DATA', 'Invalid response format', result);
      // Clear data and show empty state
      window.LeaderboardService.setLeaderboardData([]);
      if (typeof window.displayLeaderboardModal === 'function') {
        window.displayLeaderboardModal();
      }
    }
  } catch (error) {
    log.error('LEADERBOARD DATA', 'Error fetching leaderboard', error);
    
    // Determine error type
    const isConnectionError = error.message.includes('Failed to fetch') || 
                               error.message.includes('NetworkError') ||
                               error.message.includes('Network request failed') ||
                               error.message.includes('fetch');
    
    // Show appropriate error message
    if (list) {
      if (isConnectionError) {
        list.innerHTML = `
          <li class="leaderboard-item" style="text-align: center; color: #ff6b6b; padding: 20px;">
            <div style="font-size: 1.2em; margin-bottom: 10px;">🔌 Unable to connect to blockchain</div>
            <div style="font-size: 0.9em; margin-top: 10px; color: #888;">Please check your connection and try again.</div>
            <div style="font-size: 0.8em; margin-top: 10px; color: #666;">You can click the refresh button to retry.</div>
          </li>
        `;
      } else {
        list.innerHTML = `
          <li class="leaderboard-item" style="text-align: center; color: #ff6b6b; padding: 20px;">
            <div style="font-size: 1.2em; margin-bottom: 10px;">⚠️ Failed to load leaderboard</div>
            <div style="font-size: 0.9em; margin-top: 10px; color: #888;">${error.message || 'Unknown error'}</div>
            <div style="font-size: 0.8em; margin-top: 10px; color: #666;">You can click the refresh button to retry.</div>
          </li>
        `;
      }
    }
    
    // Clear data on error
    window.LeaderboardService.setLeaderboardData([]);
  } finally {
    window.LeaderboardService.setLoading(false);
  }
}

/**
 * Refresh leaderboard (fetch from blockchain)
 */
async function refreshLeaderboard() {
  console.log('🔄 [LEADERBOARD DATA] Refreshing leaderboard...');
  
  // Show loading modal while refreshing
  if (typeof showLoadingModal === 'function') {
    showLoadingModal('Refreshing leaderboard... Please wait', 'leaderboardLoadingModal');
  }
  
  const refreshBtn = document.getElementById('leaderboardRefreshBtn');
  if (refreshBtn) {
    const originalText = refreshBtn.innerHTML;
    refreshBtn.innerHTML = '<span class="btn-icon">⏳</span> Loading...';
    refreshBtn.disabled = true;
    
    try {
      await fetchBlockchainLeaderboard();
    } finally {
      // Reset button state
      refreshBtn.innerHTML = originalText;
      refreshBtn.disabled = false;
      
      // Hide loading modal when refresh is complete
      if (typeof hideLoadingModal === 'function') {
        hideLoadingModal('leaderboardLoadingModal');
      }
    }
  } else {
    // If button not found, just fetch directly
    try {
      await fetchBlockchainLeaderboard();
    } finally {
      // Hide loading modal when refresh is complete
      if (typeof hideLoadingModal === 'function') {
        hideLoadingModal('leaderboardLoadingModal');
      }
    }
  }
}

// Expose globally
if (typeof window !== 'undefined') {
  window.fetchBlockchainLeaderboard = fetchBlockchainLeaderboard;
  window.refreshLeaderboard = refreshLeaderboard;
}

