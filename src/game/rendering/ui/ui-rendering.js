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
  
  if (gameScoreElement) {
    gameScoreElement.textContent = game.score.toLocaleString();
  }
  
  if (orbLevelElement) {
    orbLevelElement.textContent = game.projectileLevel;
  }
  
  if (gameTierElement) {
    gameTierElement.textContent = game.currentTier;
  }
  
  if (bossesDefeatedElement) {
    bossesDefeatedElement.textContent = game.bossesDefeated;
  }
  
  if (forceFieldLevelElement) {
    if (game.forceField.active && game.forceField.level > 0) {
      forceFieldLevelElement.textContent = `Level ${game.forceField.level}`;
      forceFieldLevelElement.style.color = game.forceField.level === 1 ? '#4DA2FF' : '#39ff14';
    } else {
      forceFieldLevelElement.textContent = 'None';
      forceFieldLevelElement.style.color = '#888';
    }
  }
  
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
}
