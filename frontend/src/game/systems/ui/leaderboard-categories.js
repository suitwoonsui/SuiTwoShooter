// ==========================================
// LEADERBOARD CATEGORIES - Category Management
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

log.info('LEADERBOARD CATEGORIES', 'Leaderboard categories module loaded');

/**
 * Navigate to next category
 */
function leaderboardNextCategory() {
  if (!window.LeaderboardService) {
    log.warn('⚠️ [LEADERBOARD CATEGORIES] LeaderboardService not available');
    return;
  }
  
  const nextIndex = window.LeaderboardService.getNextCategoryIndex();
  window.LeaderboardService.setCategoryIndex(nextIndex);
  
  // Refresh display if function is available
  if (typeof window.displayLeaderboardModal === 'function') {
    window.displayLeaderboardModal();
  }
}

/**
 * Navigate to previous category
 */
function leaderboardPrevCategory() {
  if (!window.LeaderboardService) {
    log.warn('⚠️ [LEADERBOARD CATEGORIES] LeaderboardService not available');
    return;
  }
  
  const prevIndex = window.LeaderboardService.getPrevCategoryIndex();
  window.LeaderboardService.setCategoryIndex(prevIndex);
  
  // Refresh display if function is available
  if (typeof window.displayLeaderboardModal === 'function') {
    window.displayLeaderboardModal();
  }
}

// Expose globally
if (typeof window !== 'undefined') {
  window.leaderboardNextCategory = leaderboardNextCategory;
  window.leaderboardPrevCategory = leaderboardPrevCategory;
}

