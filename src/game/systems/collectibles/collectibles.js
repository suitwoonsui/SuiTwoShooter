// ==========================================
// COLLECTIBLES SYSTEM - COLLECTIBLE BEHAVIOR AND EFFECTS
// ==========================================
// This module handles all collectible behavior, effects, and state management.
// Collision detection is handled in collision.js, but this module processes the results.

/**
 * Handle coin collection - increment count, manage streak, check force field activation
 * @param {Object} tile - The tile containing the coin
 */
function collectCoin(tile) {
  // Increment coin count
  game.coins++;
  
  // Increment coin streak
  game.forceField.coinStreak++;
  console.log('Coin collected! Streak:', game.forceField.coinStreak, 'Force field level:', game.forceField.level, 'Active:', game.forceField.active);
  
  // Update max streak
  if (game.forceField.coinStreak > game.forceField.maxStreak) {
    game.forceField.maxStreak = game.forceField.coinStreak;
  }
  
  // Check for force field activation/upgrade
  checkForceFieldActivation();
  
  // Play coin collect sound
  if (typeof playCoinCollectSound === 'function') {
    playCoinCollectSound();
  }
  
  // Create coin collection visual effect
  createCoinCollectionEffect(player.x + player.width/2, player.y + player.height/2);
  
  // Remove coin from tile
  tile.coinLane = null;
}

/**
 * Handle powerup collection - upgrade projectile level and adjust auto-fire
 * @param {Object} tile - The tile containing the powerup
 * @param {boolean} isBonus - True for powerup bonus, false for powerdown
 */
function collectPowerup(tile, isBonus) {
  if (isBonus) {
    // Power-up bonus - upgrade projectile level
    game.projectileLevel = Math.min(6, game.projectileLevel + 1);
    game.autoFireInterval = Math.max(100, 300 - (game.projectileLevel - 1) * 50);
    
    // Play powerup sound
    if (typeof playPowerUpSound === 'function') {
      playPowerUpSound(true);
    }
    
    // Create powerup visual effect
    createPowerUpEffect(player.x + player.width/2, player.y + player.height/2, true);
    
    // Remove powerup from tile
    tile.powerupBonus = null;
  } else {
    // Power-down (malus) - downgrade projectile level
    game.projectileLevel = Math.max(1, game.projectileLevel - 1);
    game.autoFireInterval = Math.max(100, 300 - (game.projectileLevel - 1) * 50);
    
    // Play powerdown sound
    if (typeof playPowerUpSound === 'function') {
      playPowerUpSound(false);
    }
    
    // Create powerdown visual effect
    createPowerUpEffect(player.x + player.width/2, player.y + player.height/2, false);
    
    // Remove powerdown from tile
    tile.powerdown = null;
  }
}

/**
 * Check and handle force field activation/upgrade based on coin streak
 */
function checkForceFieldActivation() {
  if (game.forceField.coinStreak >= 5 && game.forceField.level === 0) {
    // Activate level 1 force field
    game.forceField.level = 1;
    game.forceField.active = true;
    console.log('Force field activated! Level 1, streak:', game.forceField.coinStreak);
    
    // Play force field sound
    if (typeof playForceFieldSound === 'function') {
      playForceFieldSound();
    }
    
    // Visual effect for force field activation
    for (let i = 0; i < 20; i++) {
      game.particles.push(new Particle(player.x + player.width/2, player.y + player.height/2, '#00FFFF'));
    }
  } else if (game.forceField.coinStreak >= 10 && game.forceField.level === 1) {
    // Upgrade to level 2 force field
    game.forceField.level = 2;
    game.forceField.active = true;
    console.log('Force field upgraded! Level 2, streak:', game.forceField.coinStreak);
    
    // Play force field power up sound
    if (typeof playForceFieldPowerUpSound === 'function') {
      playForceFieldPowerUpSound();
    }
    
    // Visual effect for force field upgrade
    createCoinCollectionEffect(player.x + player.width/2, player.y + player.height/2);
  }
}

/**
 * Reset coin streak when player gets hit
 */
function resetCoinStreak() {
  game.forceField.coinStreak = 0;
}

/**
 * Get force field activation threshold for a given level
 * @param {number} level - Force field level (0, 1, 2)
 * @returns {number} - Required coin streak threshold
 */
function getForceFieldThreshold(level) {
  switch (level) {
    case 0: return 5;  // Activate level 1
    case 1: return 10; // Upgrade to level 2
    default: return Infinity;
  }
}

// Export functions globally for access by other modules
window.collectCoin = collectCoin;
window.collectPowerup = collectPowerup;
window.resetCoinStreak = resetCoinStreak;
window.getForceFieldThreshold = getForceFieldThreshold;
