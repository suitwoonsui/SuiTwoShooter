// ==========================================
// UI RENDERING - HEADER AND GAME UI
// ==========================================

// Update header stats
function updateHeaderStats() {
  const distanceElement = document.getElementById('distance');
  const coinsElement = document.getElementById('coins');
  const statusElement = document.getElementById('status');
  
  if (distanceElement) {
    const distanceValue = Math.floor(game.distance / 100);
    distanceElement.textContent = distanceValue;
  }
  
  if (coinsElement) {
    coinsElement.textContent = game.coins;
  }
  
  if (statusElement) {
    if (game.gameOver) {
      statusElement.textContent = 'Game Over';
    } else if (game.paused) {
      statusElement.textContent = 'Paused';
    } else if (game.bossVictoryTimeout) {
      statusElement.textContent = 'Victory!';
    } else if (game.bossActive) {
      statusElement.textContent = 'Boss Fight!';
    } else if (game.bossWarning) {
      statusElement.textContent = 'Boss Warning!';
    } else {
      statusElement.textContent = 'Playing';
    }
  }
}

// Update in-game UI overlay
function updateGameUI() {
  const gameScoreElement = document.getElementById('gameScore');
  const orbLevelElement = document.getElementById('orbLevel');
  const gameTierElement = document.getElementById('gameTier');
  const bossesDefeatedElement = document.getElementById('bossesDefeated');
  const forceFieldLevelElement = document.getElementById('forceFieldLevel');
  const coinStreakElement = document.getElementById('coinStreak');
  
  // Also update mobile integrated stats
  const integratedScoreElement = document.getElementById('integratedScore');
  const integratedOrbLevelElement = document.getElementById('integratedOrbLevel');
  const integratedTierElement = document.getElementById('integratedTier');
  const integratedCoinsElement = document.getElementById('integratedCoins');
  const integratedDistanceElement = document.getElementById('integratedDistance');
  
  // Update score (both desktop and mobile)
  // Get score from multiple sources to ensure we display the correct value
  let currentScore = game.score;
  if (currentScore === 0 && typeof secureGame !== 'undefined' && secureGame) {
    // Try to get score directly from secureGame if getter returns 0
    try {
      const directScore = secureGame.score;
      if (directScore > 0) {
        currentScore = directScore;
        console.log('📊 [UI] Using direct secureGame.score:', currentScore);
      }
    } catch (e) {
      // Ignore errors accessing secureGame.score
    }
  }
  if (currentScore === 0 && game._fallbackScore) {
    currentScore = game._fallbackScore;
    console.log('📊 [UI] Using fallback score:', currentScore);
  }
  if (gameScoreElement) {
    gameScoreElement.textContent = currentScore.toLocaleString();
    // Debug: Log if score is 0 but shouldn't be
    if (currentScore === 0 && typeof secureGame !== 'undefined' && secureGame && secureGame.score > 0) {
      console.warn('⚠️ [UI] Score display is 0 but secureGame.score is', secureGame.score);
    }
  } else {
    console.warn('⚠️ [UI] gameScoreElement not found!');
  }
  if (integratedScoreElement) {
    integratedScoreElement.textContent = currentScore.toLocaleString();
  }
  
  // Update orb level (both desktop and mobile)
  if (orbLevelElement) {
    orbLevelElement.textContent = game.projectileLevel;
  }
  if (integratedOrbLevelElement) {
    integratedOrbLevelElement.textContent = game.projectileLevel;
  }
  
  // Update tier (both desktop and mobile)
  if (gameTierElement) {
    gameTierElement.textContent = game.currentTier;
  }
  if (integratedTierElement) {
    integratedTierElement.textContent = game.currentTier;
  }
  
  // Update bosses defeated (desktop only)
  if (bossesDefeatedElement) {
    bossesDefeatedElement.textContent = game.bossesDefeated;
  }
  
  // Update force field level (desktop only)
  if (forceFieldLevelElement) {
    if (game.forceField.active && game.forceField.level > 0) {
      forceFieldLevelElement.textContent = `Level ${game.forceField.level}`;
      forceFieldLevelElement.style.color = game.forceField.level === 1 ? '#4DA2FF' : '#39ff14';
    } else {
      forceFieldLevelElement.textContent = 'None';
      forceFieldLevelElement.style.color = '#888';
    }
  }
  
  // Update coin streak (desktop only)
  if (coinStreakElement) {
    coinStreakElement.textContent = game.forceField.coinStreak;
    // Color code the streak based on progress
    if (game.forceField.coinStreak >= 10) {
      coinStreakElement.style.color = '#39ff14'; // Highlighter green for level 2 threshold
    } else if (game.forceField.coinStreak >= 5) {
      coinStreakElement.style.color = '#4DA2FF'; // Sui blue for level 1 threshold
    } else {
      coinStreakElement.style.color = '#39ff14'; // Highlighter green for normal
    }
  }
  
  // Update integrated coins (mobile only)
  if (integratedCoinsElement) {
    integratedCoinsElement.textContent = game.coins;
  }
  
  // Update integrated distance (mobile only)
  if (integratedDistanceElement) {
    const distanceValue = Math.floor(game.distance / 100);
    integratedDistanceElement.textContent = distanceValue;
  }
}

// Note: Gameplay stats section removed - stats panel now only shows:
// Score, Magic Orb Level, Tier, Bosses Defeated, Force Field, Coin Streak
