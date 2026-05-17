// ==========================================
// UI RENDERING - HEADER AND GAME UI
// ==========================================

// Cache DOM element references to avoid repeated getElementById calls
let _cachedHeaderElements = {
  distance: null,
  coins: null,
  status: null
};

// Cache previous values to only update when changed
let _previousHeaderValues = {
  distance: -1,
  coins: -1,
  status: ''
};

// Initialize cached DOM elements (call once at startup)
function initializeHeaderElementsCache() {
  _cachedHeaderElements.distance = document.getElementById('distance');
  _cachedHeaderElements.coins = document.getElementById('coins');
  _cachedHeaderElements.status = document.getElementById('status');
}

// Update header stats (optimized: only updates when values change)
function updateHeaderStats() {
  // Lazy initialization if cache is empty
  if (!_cachedHeaderElements.distance && !_cachedHeaderElements.coins && !_cachedHeaderElements.status) {
    initializeHeaderElementsCache();
  }
  
  // Update distance (only if changed)
  const distanceValue = Math.floor(game.distance / 100);
  if (_cachedHeaderElements.distance && distanceValue !== _previousHeaderValues.distance) {
    _cachedHeaderElements.distance.textContent = distanceValue;
    _previousHeaderValues.distance = distanceValue;
  }
  
  // Update coins (only if changed)
  if (_cachedHeaderElements.coins && game.coins !== _previousHeaderValues.coins) {
    _cachedHeaderElements.coins.textContent = game.coins;
    _previousHeaderValues.coins = game.coins;
  }
  
  // Update status (only if changed)
  let newStatus = '';
  if (game.gameOver) {
    newStatus = 'Game Over';
  } else if (game.paused) {
    newStatus = 'Paused';
  } else if (game.bossVictoryTimeout) {
    newStatus = 'Victory!';
  } else if (game.bossActive) {
    newStatus = 'Boss Fight!';
  } else if (game.bossWarning) {
    newStatus = 'Boss Warning!';
  } else {
    newStatus = 'Playing';
  }
  
  if (_cachedHeaderElements.status && newStatus !== _previousHeaderValues.status) {
    _cachedHeaderElements.status.textContent = newStatus;
    _previousHeaderValues.status = newStatus;
  }
}

// Cache DOM element references for game UI
let _cachedGameUIElements = {
  gameScore: null,
  orbLevel: null,
  gameTier: null,
  bossesDefeated: null,
  forceFieldLevel: null,
  coinStreak: null,
  integratedScore: null,
  integratedOrbLevel: null,
  integratedTier: null,
  integratedCoins: null,
  integratedDistance: null
};

// Cache previous values to only update when changed
let _previousGameUIValues = {
  gameScore: -1,
  orbLevel: -1,
  gameTier: -1,
  bossesDefeated: -1,
  forceFieldLevel: '',
  forceFieldColor: '',
  coinStreak: -1,
  coinStreakColor: '',
  integratedScore: -1,
  integratedOrbLevel: -1,
  integratedTier: -1,
  integratedCoins: -1,
  integratedDistance: -1
};

// Initialize cached DOM elements (call once at startup)
function initializeGameUIElementsCache() {
  _cachedGameUIElements.gameScore = document.getElementById('gameScore');
  _cachedGameUIElements.orbLevel = document.getElementById('orbLevel');
  _cachedGameUIElements.gameTier = document.getElementById('gameTier');
  _cachedGameUIElements.bossesDefeated = document.getElementById('bossesDefeated');
  _cachedGameUIElements.forceFieldLevel = document.getElementById('forceFieldLevel');
  _cachedGameUIElements.coinStreak = document.getElementById('coinStreak');
  _cachedGameUIElements.integratedScore = document.getElementById('integratedScore');
  _cachedGameUIElements.integratedOrbLevel = document.getElementById('integratedOrbLevel');
  _cachedGameUIElements.integratedTier = document.getElementById('integratedTier');
  _cachedGameUIElements.integratedCoins = document.getElementById('integratedCoins');
  _cachedGameUIElements.integratedDistance = document.getElementById('integratedDistance');
}

// Update in-game UI overlay (optimized: only updates when values change)
function updateGameUI() {
  // Lazy initialization if cache is empty
  if (!_cachedGameUIElements.gameScore && !_cachedGameUIElements.orbLevel) {
    initializeGameUIElementsCache();
  }
  
  // Update score (both desktop and mobile) - only if changed
  // Get score from multiple sources to ensure we display the correct value
  // Priority: _fallbackScore > secureGame.score > game.score getter
  let currentScore = 0;
  
  // First check _fallbackScore (most reliable after boss defeat)
  if (game._fallbackScore !== undefined && game._fallbackScore !== null && game._fallbackScore > 0) {
    currentScore = game._fallbackScore;
  }
  // Then check secureGame directly (from window.secureGame or secureGame variable)
  else if (currentScore === 0 && typeof secureGame !== 'undefined' && secureGame) {
    try {
      const directScore = secureGame.score;
      if (directScore > 0) {
        currentScore = directScore;
      }
    } catch (e) {
      // Ignore errors accessing secureGame.score
    }
  }
  // Finally use game.score getter
  else if (currentScore === 0) {
    const getterScore = game.score;
    currentScore = (getterScore !== undefined && getterScore !== null && getterScore > 0) ? getterScore : 0;
  }
  
  if (currentScore !== _previousGameUIValues.gameScore) {
    const scoreText = currentScore.toLocaleString();
    if (_cachedGameUIElements.gameScore) {
      _cachedGameUIElements.gameScore.textContent = scoreText;
    }
    if (_cachedGameUIElements.integratedScore) {
      _cachedGameUIElements.integratedScore.textContent = scoreText;
    }
    _previousGameUIValues.gameScore = currentScore;
  }
  
  // Update orb level (both desktop and mobile) - only if changed
  if (game.projectileLevel !== _previousGameUIValues.orbLevel) {
    const orbLevelText = game.projectileLevel.toString();
    if (_cachedGameUIElements.orbLevel) {
      _cachedGameUIElements.orbLevel.textContent = orbLevelText;
    }
    if (_cachedGameUIElements.integratedOrbLevel) {
      _cachedGameUIElements.integratedOrbLevel.textContent = orbLevelText;
    }
    _previousGameUIValues.orbLevel = game.projectileLevel;
  }
  
  // Update tier (both desktop and mobile) - only if changed
  if (game.currentTier !== _previousGameUIValues.gameTier) {
    const tierText = game.currentTier.toString();
    if (_cachedGameUIElements.gameTier) {
      _cachedGameUIElements.gameTier.textContent = tierText;
    }
    if (_cachedGameUIElements.integratedTier) {
      _cachedGameUIElements.integratedTier.textContent = tierText;
    }
    _previousGameUIValues.gameTier = game.currentTier;
  }
  
  // Update bosses defeated (desktop only) - only if changed
  if (game.bossesDefeated !== _previousGameUIValues.bossesDefeated) {
    if (_cachedGameUIElements.bossesDefeated) {
      _cachedGameUIElements.bossesDefeated.textContent = game.bossesDefeated;
    }
    _previousGameUIValues.bossesDefeated = game.bossesDefeated;
  }
  
  // Update force field level (desktop only) - only if changed
  let forceFieldText = 'None';
  let forceFieldColor = '#888';
  if (game.forceField.active && game.forceField.level > 0) {
    forceFieldText = `Level ${game.forceField.level}`;
    forceFieldColor = game.forceField.level === 1 ? '#4DA2FF' : '#39ff14';
  }
  
  if (forceFieldText !== _previousGameUIValues.forceFieldLevel || 
      forceFieldColor !== _previousGameUIValues.forceFieldColor) {
    if (_cachedGameUIElements.forceFieldLevel) {
      _cachedGameUIElements.forceFieldLevel.textContent = forceFieldText;
      _cachedGameUIElements.forceFieldLevel.style.color = forceFieldColor;
    }
    _previousGameUIValues.forceFieldLevel = forceFieldText;
    _previousGameUIValues.forceFieldColor = forceFieldColor;
  }
  
  // Update coin streak (desktop only) - only if changed
  const coinStreak = game.forceField.coinStreak;
  let coinStreakColor = '#39ff14'; // Default
  if (coinStreak >= 10) {
    coinStreakColor = '#39ff14'; // Highlighter green for level 2 threshold
  } else if (coinStreak >= 5) {
    coinStreakColor = '#4DA2FF'; // Sui blue for level 1 threshold
  }
  
  if (coinStreak !== _previousGameUIValues.coinStreak || 
      coinStreakColor !== _previousGameUIValues.coinStreakColor) {
    if (_cachedGameUIElements.coinStreak) {
      _cachedGameUIElements.coinStreak.textContent = coinStreak;
      _cachedGameUIElements.coinStreak.style.color = coinStreakColor;
    }
    _previousGameUIValues.coinStreak = coinStreak;
    _previousGameUIValues.coinStreakColor = coinStreakColor;
  }
  
  // Update integrated coins (mobile only) - only if changed
  if (game.coins !== _previousGameUIValues.integratedCoins) {
    if (_cachedGameUIElements.integratedCoins) {
      _cachedGameUIElements.integratedCoins.textContent = game.coins;
    }
    _previousGameUIValues.integratedCoins = game.coins;
  }
  
  // Update integrated distance (mobile only) - only if changed
  const distanceValue = Math.floor(game.distance / 100);
  if (distanceValue !== _previousGameUIValues.integratedDistance) {
    if (_cachedGameUIElements.integratedDistance) {
      _cachedGameUIElements.integratedDistance.textContent = distanceValue;
    }
    _previousGameUIValues.integratedDistance = distanceValue;
  }
}

// Expose initialization function for external use
if (typeof window !== 'undefined') {
  window.initializeUIElementCaches = function() {
    initializeHeaderElementsCache();
    initializeGameUIElementsCache();
  };
}

// Note: Gameplay stats section removed - stats panel now only shows:
// Score, Magic Orb Level, Tier, Bosses Defeated, Force Field, Coin Streak
