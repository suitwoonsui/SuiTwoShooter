// ==========================================
// ACHIEVEMENT POPUP - Mandatory Achievement Notification
// ==========================================
// Shows achievement rewards popup that blocks main menu until closed

// Use FrontendLogger if available, fallback to console
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

log.info('ACHIEVEMENT POPUP', 'Achievement popup module loaded');

/**
 * Show achievement popup modal (blocks main menu)
 * @param {Array} achievements - Array of claimed achievements
 */
function showAchievementPopup(achievements) {
  log.debug('ACHIEVEMENT POPUP', 'showAchievementPopup() called', { count: achievements.length });

  if (!achievements || achievements.length === 0) {
    log.debug('ACHIEVEMENT POPUP', 'No achievements to show');
    return;
  }

  // Hide main menu buttons/interactions (but keep overlay visible for backdrop)
  const mainMenu = document.getElementById('mainMenuOverlay');
  if (mainMenu) {
    // Disable all buttons in main menu
    const buttons = mainMenu.querySelectorAll('button');
    buttons.forEach(btn => {
      btn.disabled = true;
      btn.style.pointerEvents = 'none';
      btn.style.opacity = '0.5';
    });
  }

  // Create achievement popup modal
  const viewportContainer = document.querySelector('.viewport-container');
  if (!viewportContainer) {
    log.error('ACHIEVEMENT POPUP', 'Viewport container not found');
    return;
  }

  // Remove existing popup if present
  const existingPopup = document.getElementById('achievementPopup');
  if (existingPopup) {
    existingPopup.remove();
  }

  const popup = document.createElement('div');
  popup.className = 'achievement-popup achievement-popup-visible';
  popup.setAttribute('id', 'achievementPopup');

  // Build achievements list HTML
  const achievementsList = achievements.map(achievement => {
    const categoryName = getCategoryName(achievement.category);
    const itemsList = achievement.items.map(item => {
      const itemName = getItemName(item.itemId);
      return `<span class="achievement-item">${itemName} ${item.level > 1 ? `(Level ${item.level})` : ''} x${item.quantity}</span>`;
    }).join('');

    return `
      <div class="achievement-item-card">
        <div class="achievement-header">
          <span class="achievement-icon">🏆</span>
          <div class="achievement-info">
            <h3 class="achievement-title">${categoryName}</h3>
            <p class="achievement-threshold">Reached: ${formatThreshold(achievement.category, achievement.threshold)}</p>
          </div>
        </div>
        <div class="achievement-rewards">
          ${achievement.credits > 0 ? `<div class="achievement-reward"><span class="reward-icon">💰</span> ${achievement.credits} Free Credit${achievement.credits > 1 ? 's' : ''}</div>` : ''}
          ${itemsList ? `<div class="achievement-reward"><span class="reward-icon">🎁</span> ${itemsList}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');

  popup.innerHTML = `
    <div class="achievement-popup-content">
      <div class="achievement-popup-header">
        <h2>🎉 Achievement Unlocked!</h2>
        <p class="achievement-popup-subtitle">You've earned rewards for reaching milestones!</p>
      </div>
      
      <div class="achievement-popup-body">
        <div class="achievements-list">
          ${achievementsList}
        </div>
      </div>
      
      <div class="achievement-popup-actions">
        <button class="menu-btn primary" onclick="closeAchievementPopup()">
          <span class="btn-icon">✓</span> Claim Rewards
        </button>
      </div>
    </div>
  `;

  viewportContainer.appendChild(popup);

  // Prevent interaction with anything behind the popup
  popup.style.zIndex = '9999999';
  popup.style.pointerEvents = 'auto';

  log.info('ACHIEVEMENT POPUP', 'Achievement popup displayed', { count: achievements.length });
}

/**
 * Close achievement popup and restore main menu
 */
function closeAchievementPopup() {
  log.debug('ACHIEVEMENT POPUP', 'closeAchievementPopup() called');

  const popup = document.getElementById('achievementPopup');
  if (popup) {
    popup.classList.remove('achievement-popup-visible');
    popup.classList.add('achievement-popup-hidden');
    
    setTimeout(() => {
      popup.remove();
    }, 300);
  }

  // Re-enable main menu buttons
  const mainMenu = document.getElementById('mainMenuOverlay');
  if (mainMenu) {
    const buttons = mainMenu.querySelectorAll('button');
    buttons.forEach(btn => {
      btn.disabled = false;
      btn.style.pointerEvents = '';
      btn.style.opacity = '';
    });
  }

  log.info('ACHIEVEMENT POPUP', 'Achievement popup closed');
}

/**
 * Get category display name
 */
function getCategoryName(category) {
  const names = {
    gamesPlayed: 'Games Played',
    bossesPerGame: 'Bosses Defeated (Per Game)',
    bossesCumulative: 'Bosses Defeated (Total)',
    scorePerGame: 'High Score (Per Game)',
    scoreCumulative: 'Total Score',
    distancePerGame: 'Distance Traveled (Per Game)',
    distanceCumulative: 'Total Distance',
    coinsPerGame: 'Coins Collected (Per Game)',
    coinsCumulative: 'Total Coins',
    enemiesPerGame: 'Enemies Defeated (Per Game)',
    enemiesCumulative: 'Total Enemies Defeated',
    coinStreak: 'Coin Streak',
  };
  return names[category] || category;
}

/**
 * Format threshold for display
 */
function formatThreshold(category, threshold) {
  if (category === 'gamesPlayed') {
    return `${threshold} Game${threshold > 1 ? 's' : ''}`;
  } else if (category.includes('Score') || category.includes('Distance')) {
    return threshold.toLocaleString();
  } else if (category.includes('Coins') || category.includes('Bosses') || category.includes('Enemies')) {
    return threshold.toLocaleString();
  } else if (category === 'coinStreak') {
    return `${threshold} Streak`;
  }
  return threshold.toLocaleString();
}

/**
 * Get item display name
 */
function getItemName(itemId) {
  const names = {
    extraLives: 'Extra Lives',
    forceField: 'Force Field',
    orbLevel: 'Orb Level',
    slowTime: 'Slow Time',
    coinTractorBeam: 'Coin Tractor Beam',
    destroyAll: 'Destroy All',
    bossKillShot: 'Boss Kill Shot',
  };
  return names[itemId] || itemId;
}

// Make functions globally available
window.showAchievementPopup = showAchievementPopup;
window.closeAchievementPopup = closeAchievementPopup;

