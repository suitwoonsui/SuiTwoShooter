// ==========================================
// LEADERBOARD SYSTEM - Legacy Delegation Module
// ==========================================
// This file now delegates to the refactored leaderboard modules:
// - leaderboard-service.js: State management
// - leaderboard-formatting.js: Formatting utilities
// - leaderboard-local.js: Local leaderboard
// - leaderboard-categories.js: Category management
// - leaderboard-pagination.js: Pagination
// - leaderboard-data.js: Blockchain data fetching
// - leaderboard-score-submission.js: Score submission flow
// - leaderboard-modal.js: Modal creation and display
// - leaderboard-ui.js: Main coordination

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

log.info('LEADERBOARD SYSTEM', 'Legacy delegation module loaded');

// All functions are now provided by the refactored modules
// This file is kept for backward compatibility and to ensure
// any remaining references continue to work

// The refactored modules expose all necessary functions globally:
// - showLeaderboard, hideLeaderboard (from leaderboard-modal.js)
// - displayLeaderboard (from leaderboard-local.js)
// - saveScore, skipSave, showNameInput, hideNameInput, onGameOver (from leaderboard-score-submission.js)
// - leaderboardNextCategory, leaderboardPrevCategory (from leaderboard-categories.js)
// - loadMoreLeaderboard, updateLoadMoreButton (from leaderboard-pagination.js)
// - fetchBlockchainLeaderboard, refreshLeaderboard (from leaderboard-data.js)
// - formatAddress, formatPlayerName, formatStatValue (from leaderboard-formatting.js)
// - displayLeaderboardModal (from leaderboard-modal.js)

// No code needed here - all functionality is in the refactored modules
