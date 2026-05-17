// ==========================================
// LEADERBOARD LOCAL - Local Storage Leaderboard
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

log.info('LEADERBOARD LOCAL', 'Leaderboard local module loaded');

/**
 * Display local leaderboard (from localStorage)
 */
function displayLeaderboard() {
  const list = document.getElementById('leaderboardList');
  if (!list) {
    log.warn('⚠️ [LEADERBOARD LOCAL] leaderboardList element not found, skipping display');
    return;
  }
  
  list.innerHTML = '';
  
  // Get leaderboard from service
  const state = window.LeaderboardService ? window.LeaderboardService.getState() : null;
  const leaderboard = state ? state.leaderboard : [];
  
  // Sort by descending score and take top 10
  const sortedScores = [...leaderboard].sort((a, b) => b.score - a.score).slice(0, 10);
  
  if (sortedScores.length === 0) {
    list.innerHTML = '<li style="text-align: center; color: #888; padding: 20px;">No scores yet!<br>Be the first to play!</li>';
    return;
  }
  
  sortedScores.forEach((entry, index) => {
    const li = document.createElement('li');
    li.className = 'leaderboard-item';
    li.innerHTML = `
      <div style="display: flex; align-items: center;">
        <div class="rank">${index + 1}</div>
        <div class="player-name">${entry.name}</div>
      </div>
      <div class="player-score">${entry.score.toLocaleString()}</div>
    `;
    list.appendChild(li);
  });
}

// Expose globally
if (typeof window !== 'undefined') {
  window.displayLeaderboard = displayLeaderboard;
}

