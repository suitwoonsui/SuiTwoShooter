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
  
  // Update score (both desktop and mobile)
  if (gameScoreElement) {
    gameScoreElement.textContent = game.score.toLocaleString();
  }
  if (integratedScoreElement) {
    integratedScoreElement.textContent = game.score.toLocaleString();
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
}
