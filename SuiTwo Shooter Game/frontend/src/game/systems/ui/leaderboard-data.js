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
  console.log('📊 [LEADERBOARD DATA] fetchBlockchainLeaderboard() called', { limit });

  if (!window.LeaderboardService) {
    console.error('📊 [LEADERBOARD DATA] ❌ LeaderboardService not available');
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
    console.log('📊 [LEADERBOARD DATA] Already loading, skipping duplicate request');
    log.debug('LEADERBOARD DATA', 'Already loading, skipping duplicate request');
    return;
  }

  var ttl = (typeof window !== 'undefined' && window.LEADERBOARD_PREFETCH_TTL_MS) ? window.LEADERBOARD_PREFETCH_TTL_MS : 30000;
  var prefetched = typeof window !== 'undefined' ? window.__prefetchedLeaderboard : null;
  var usePrefetched = prefetched && prefetched.leaderboard && prefetched.at && (Date.now() - prefetched.at) < ttl;

  if (usePrefetched) {
    window.LeaderboardService.setLeaderboardData(prefetched.leaderboard);
    log.debug('LEADERBOARD DATA', 'Using prefetched leaderboard', prefetched.leaderboard.length, 'entries');
    if (typeof window.displayLeaderboardModal === 'function') {
      window.displayLeaderboardModal();
    }
    window.LeaderboardService.setLoading(false);
    if ((prefetched.limit || 0) < limit) {
      var API_BASE_URL = window.GameApi ? window.GameApi.getBaseUrl() : (window.GAME_CONFIG?.GAME_BACKEND_URL || window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3001/api');
      var useMock = window.GAME_CONFIG?.USE_MOCK_LEADERBOARD === true || new URLSearchParams(window.location.search).get('mock') === 'true';
      var mockParam = useMock ? '&mock=true' : '';
      fetch(API_BASE_URL + '/leaderboard?limit=' + limit + mockParam)
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (data) {
          if (data && data.success && Array.isArray(data.leaderboard) && window.LeaderboardService) {
            window.LeaderboardService.setLeaderboardData(data.leaderboard);
            if (typeof window.displayLeaderboardModal === 'function') window.displayLeaderboardModal();
            if (typeof window.__prefetchedLeaderboard !== 'undefined') {
              window.__prefetchedLeaderboard = { success: true, leaderboard: data.leaderboard, at: Date.now(), limit: data.limit };
            }
          }
        })
        .catch(function () {});
    }
    return;
  }

  window.LeaderboardService.setLoading(true);
  const list = document.getElementById('modalLeaderboardList');

  // Show loading state
  if (list) {
    list.innerHTML = '<li class="leaderboard-item" style="text-align: center; color: #888; padding: 20px;"><span class="btn-icon">⏳</span> Loading leaderboard...</li>';
  }

  try {
    // Use game backend for leaderboard API (game backend proxies platform as needed)
    const API_BASE_URL = window.GameApi ? window.GameApi.getBaseUrl() : (window.GAME_CONFIG?.GAME_BACKEND_URL || window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3001/api');
    console.log('📊 [LEADERBOARD DATA] Using API_BASE_URL:', API_BASE_URL);
    
    // Check for mock mode (for testing)
    const useMock = window.GAME_CONFIG?.USE_MOCK_LEADERBOARD === true || 
                    new URLSearchParams(window.location.search).get('mock') === 'true';
    const mockParam = useMock ? '&mock=true' : '';
    
    // Use cache if available, otherwise fetch fresh
    const cacheKey = `leaderboard:${limit || 'default'}${mockParam ? ':mock' : ''}`;
    let result = null;
    
    if (window.apiRequestCache) {
      // Use cache with short TTL (see ttlByType.leaderboard / LEADERBOARD_PREFETCH_TTL_MS)
      result = await window.apiRequestCache.get(
        cacheKey,
        async () => {
          const url = `${API_BASE_URL}/leaderboard?limit=${limit}${mockParam}`;
          log.debug('LEADERBOARD DATA', `Fetching leaderboard from: ${url}${mockParam ? ' (MOCK MODE)' : ''}`);
          
          const response = await fetch(url, {
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
          ttl: 30000, // 30 seconds
          staleWhileRevalidate: true // Use stale cache while refreshing in background
        }
      );
    } else {
      // Fallback to direct fetch if cache not available
      const url = `${API_BASE_URL}/leaderboard?limit=${limit}${mockParam}`;
      log.debug('LEADERBOARD DATA', `Fetching leaderboard from: ${url}${mockParam ? ' (MOCK MODE)' : ''}`);
      
      const response = await fetch(url, {
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
    
    console.log('📊 [LEADERBOARD DATA] Full API response:', result);
    console.log('📊 [LEADERBOARD DATA] Has leaderboard property:', 'leaderboard' in result);
    console.log('📊 [LEADERBOARD DATA] Leaderboard value:', result.leaderboard);
    console.log('📊 [LEADERBOARD DATA] Is array:', Array.isArray(result.leaderboard));
    console.log('📊 [LEADERBOARD DATA] Leaderboard length:', result.leaderboard?.length || 0);
    
    if (result.leaderboard && Array.isArray(result.leaderboard)) {
      console.log('📊 [LEADERBOARD DATA] ✅ Setting leaderboard data:', result.leaderboard.length, 'entries');
      window.LeaderboardService.setLeaderboardData(result.leaderboard);
      log.debug('LEADERBOARD DATA', `Loaded ${result.leaderboard.length} entries from blockchain`);
      
      // Verify data was set
      const verifyState = window.LeaderboardService.getState();
      console.log('📊 [LEADERBOARD DATA] ✅ Verified data in service:', verifyState.currentLeaderboardData.length, 'entries');
      
      // Update display
      if (typeof window.displayLeaderboardModal === 'function') {
        window.displayLeaderboardModal();
      }
    } else {
      console.error('📊 [LEADERBOARD DATA] ❌ Invalid response format!', {
        hasLeaderboard: 'leaderboard' in result,
        leaderboardType: typeof result.leaderboard,
        isArray: Array.isArray(result.leaderboard),
        resultKeys: Object.keys(result),
        fullResult: result
      });
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
  
  if (typeof MenuPanelLoading !== 'undefined' && MenuPanelLoading.show) {
    MenuPanelLoading.show('Refreshing leaderboard... Please wait');
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
      
      if (typeof MenuPanelLoading !== 'undefined' && MenuPanelLoading.hide) {
        MenuPanelLoading.hide();
      }
    }
  } else {
    // If button not found, just fetch directly
    try {
      await fetchBlockchainLeaderboard();
    } finally {
      if (typeof MenuPanelLoading !== 'undefined' && MenuPanelLoading.hide) {
        MenuPanelLoading.hide();
      }
    }
  }
}

// Expose globally
if (typeof window !== 'undefined') {
  window.fetchBlockchainLeaderboard = fetchBlockchainLeaderboard;
  window.refreshLeaderboard = refreshLeaderboard;
}

