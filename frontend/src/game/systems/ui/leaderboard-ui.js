// ==========================================
// LEADERBOARD UI - Main Coordination
// ==========================================
// This module serves as a coordination point and ensures functions are available.
// The actual implementation is in leaderboard-modal.js which loads before this module.

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

log.info('LEADERBOARD UI', 'Leaderboard UI module loaded');

// Verify that functions from leaderboard-modal.js are available
// Use a delayed check since scripts load asynchronously and leaderboard-modal.js
// may not have finished loading yet when this module loads
if (typeof window !== 'undefined') {
  // Check immediately (may not be available yet due to async loading)
  const checkFunctions = () => {
    const missing = [];
    if (typeof window.showLeaderboard !== 'function') {
      missing.push('showLeaderboard');
    }
    if (typeof window.hideLeaderboard !== 'function') {
      missing.push('hideLeaderboard');
    }
    if (typeof window.displayLeaderboardModal !== 'function') {
      missing.push('displayLeaderboardModal');
    }
    
    if (missing.length > 0) {
      // Only warn if still missing after a delay (scripts may still be loading)
      log.debug('LEADERBOARD UI', `Functions not yet available (may still be loading): ${missing.join(', ')}`);
    } else {
      log.debug('LEADERBOARD UI', 'All leaderboard functions are available');
    }
  };
  
  // Check immediately
  checkFunctions();
  
  // Check again after a short delay to catch functions that load after this module
  // Optimized: 100ms → 50ms (function availability check can be faster)
  setTimeout(checkFunctions, 50);
}

