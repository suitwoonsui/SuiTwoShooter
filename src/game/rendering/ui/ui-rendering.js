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
  
  // Update integrated distance (mobile only)
  if (integratedDistanceElement) {
    const distanceValue = Math.floor(game.distance / 100);
    integratedDistanceElement.textContent = distanceValue;
  }
  
  // Update speed displays (desktop only)
  updateSpeedDisplays();
}

// Calculate and display speed information (desktop only)
function updateSpeedDisplays() {
  // Enemy speed (scrollSpeed)
  const enemySpeedElement = document.getElementById('enemySpeed');
  if (enemySpeedElement) {
    enemySpeedElement.textContent = game.scrollSpeed.toFixed(2);
  }
  
  // Enemy projectile speed (average of all current tier enemies with multiplier)
  const enemyProjectileSpeedElement = document.getElementById('enemyProjectileSpeed');
  if (enemyProjectileSpeedElement) {
    if (typeof enemyStats !== 'undefined') {
      // Calculate average projectile speed for current tier enemies
      let totalSpeed = 0;
      let count = 0;
      for (let tier = 1; tier <= Math.min(game.currentTier, 4); tier++) {
        if (enemyStats[tier]) {
          const baseSpeed = 4 * enemyStats[tier].speed;
          totalSpeed += baseSpeed;
          count++;
        }
      }
      const avgBaseSpeed = count > 0 ? totalSpeed / count : 0;
      const speedMultiplier = typeof getProjectileSpeedMultiplier === 'function' ? getProjectileSpeedMultiplier() : 1.0;
      const finalSpeed = avgBaseSpeed * speedMultiplier;
      enemyProjectileSpeedElement.textContent = finalSpeed.toFixed(2);
    } else {
      enemyProjectileSpeedElement.textContent = 'N/A';
    }
  }
  
  // Boss speed (current boss or tier 4 default)
  const bossSpeedElement = document.getElementById('bossSpeed');
  if (bossSpeedElement) {
    if (game.bossActive && game.boss) {
      // Current boss speed (horizontal movement speed)
      const bossSpeed = game.boss.enraged ? game.boss.moveSpeed * 1.5 : game.boss.moveSpeed;
      bossSpeedElement.textContent = bossSpeed.toFixed(2);
    } else if (typeof bossStats !== 'undefined' && bossStats[game.currentTier]) {
      // Use current tier boss speed
      bossSpeedElement.textContent = bossStats[game.currentTier].speed.toFixed(2);
    } else {
      bossSpeedElement.textContent = 'N/A';
    }
  }
  
  // Boss projectile speed (current boss or tier 4 default)
  const bossProjectileSpeedElement = document.getElementById('bossProjectileSpeed');
  if (bossProjectileSpeedElement) {
    if (game.bossActive && game.boss) {
      // Current boss projectile speed (if we had access to it)
      const baseProjectileSpeed = (5 + game.boss.tier) * (game.boss.enraged ? 1.5 : 1);
      const speedMultiplier = typeof getProjectileSpeedMultiplier === 'function' ? getProjectileSpeedMultiplier() : 1.0;
      const finalSpeed = baseProjectileSpeed * speedMultiplier;
      bossProjectileSpeedElement.textContent = finalSpeed.toFixed(2);
    } else if (typeof bossStats !== 'undefined' && bossStats[game.currentTier]) {
      // Use current tier boss projectile speed
      const baseProjectileSpeed = 5 + game.currentTier;
      const speedMultiplier = typeof getProjectileSpeedMultiplier === 'function' ? getProjectileSpeedMultiplier() : 1.0;
      const finalSpeed = baseProjectileSpeed * speedMultiplier;
      bossProjectileSpeedElement.textContent = finalSpeed.toFixed(2);
    } else {
      bossProjectileSpeedElement.textContent = 'N/A';
    }
  }
}
