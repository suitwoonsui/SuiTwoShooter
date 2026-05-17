// ==========================================
// LEADERBOARD PAGINATION - Pagination Logic
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

log.info('LEADERBOARD PAGINATION', 'Leaderboard pagination module loaded');

/**
 * Load more leaderboard items
 */
function loadMoreLeaderboard() {
  if (!window.LeaderboardService) {
    log.warn('⚠️ [LEADERBOARD PAGINATION] LeaderboardService not available');
    return;
  }
  
  window.LeaderboardService.loadMore();
  
  // Refresh display if function is available
  if (typeof window.displayLeaderboardModal === 'function') {
    window.displayLeaderboardModal();
  }
}

/**
 * Update load more button visibility
 * @param {number} totalItems - Total number of items available
 */
function updateLoadMoreButton(totalItems = 0) {
  const loadMoreContainer = document.getElementById('leaderboardLoadMoreContainer');
  const loadMoreBtn = document.getElementById('leaderboardLoadMoreBtn');
  
  if (!loadMoreContainer || !loadMoreBtn) return;
  
  if (!window.LeaderboardService) {
    log.warn('⚠️ [LEADERBOARD PAGINATION] LeaderboardService not available');
    return;
  }
  
  const state = window.LeaderboardService.getState();
  const displayedItemsCount = state.displayedItemsCount;
  
  // Show button if there are more items to display
  if (displayedItemsCount < totalItems) {
    loadMoreContainer.style.display = 'flex'; // Use flex to maintain centering
    loadMoreBtn.disabled = false;
    loadMoreBtn.innerHTML = `<span class="btn-icon">⬇️</span> Load More (${totalItems - displayedItemsCount} remaining)`;
  } else {
    loadMoreContainer.style.display = 'none';
  }
}

// Expose globally
if (typeof window !== 'undefined') {
  window.loadMoreLeaderboard = loadMoreLeaderboard;
  window.updateLoadMoreButton = updateLoadMoreButton;
}

