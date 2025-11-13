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
    // Max level is 10 (stretched from 6)
    // Cap system: Cap only prevents NEW power-ups from spawning, not collection
    // If player collects a power-up that was already spawned, they can go above cap (lucky!)
    const newLevel = game.projectileLevel + 1;
    const maxLevel = 10;
    const capLevel = game.orbLevelCap || (game.startingOrbLevel || 1) + 2;
    
    // Always allow upgrade (cap only prevents spawning, not collection)
    // Upgrade, but respect max level
    game.projectileLevel = Math.min(maxLevel, newLevel);
    // Stretched fire rate for 10 levels: 300ms at level 1, ~22.22ms decrease per level, 100ms at level 10 (matches old max)
    // Formula: 300 - (level - 1) * 22.22, clamped to 100ms minimum
    game.autoFireInterval = Math.max(100, Math.round(300 - (game.projectileLevel - 1) * 22.22));
    
    // Log if player goes above cap (lucky upgrade!)
    if (game.projectileLevel > capLevel) {
      console.log(`🔮 [ORB LEVEL] Lucky upgrade! Level ${game.projectileLevel} exceeds cap ${capLevel} (power-up was already spawned)`);
    } else if (game.projectileLevel >= capLevel) {
      console.log(`🔮 [ORB LEVEL] Reached cap at Level ${game.projectileLevel} (starting: ${game.startingOrbLevel})`);
    }
    
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
    const oldLevel = game.projectileLevel;
    game.projectileLevel = Math.max(1, game.projectileLevel - 1);
    // Stretched fire rate for 10 levels: 300ms at level 1, ~22.22ms decrease per level, 100ms at level 10 (matches old max)
    game.autoFireInterval = Math.max(100, Math.round(300 - (game.projectileLevel - 1) * 22.22));
    
    // Check if dropped below cap (power-ups will resume spawning)
    const capLevel = game.orbLevelCap || (game.startingOrbLevel || 1) + 2;
    if (oldLevel >= capLevel && game.projectileLevel < capLevel) {
      console.log(`🔮 [ORB LEVEL] Dropped below cap (Level ${game.projectileLevel} < ${capLevel}), power-ups will resume spawning`);
    }
    
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
 * Thresholds: Level 1 = 5 coins, Level 2 = 12 coins, Level 3 = 30 coins
 */
function checkForceFieldActivation() {
  if (game.forceField.coinStreak >= 5 && game.forceField.level === 0) {
    // Activate level 1 force field
    game.forceField.level = 1;
    game.forceField.active = true;
    console.log('🛡️ Force field activated! Level 1, streak:', game.forceField.coinStreak);
    
    // Play force field sound
    if (typeof playForceFieldSound === 'function') {
      playForceFieldSound();
    }
    
    // Visual effect for force field activation
    for (let i = 0; i < 20; i++) {
      game.particles.push(new Particle(player.x + player.width/2, player.y + player.height/2, '#00FFFF'));
    }
  } else if (game.forceField.coinStreak >= 12 && game.forceField.level === 1) {
    // Upgrade to level 2 force field (threshold updated from 10 to 12)
    game.forceField.level = 2;
    game.forceField.active = true;
    console.log('🛡️ Force field upgraded! Level 2, streak:', game.forceField.coinStreak);
    
    // Play force field power up sound
    if (typeof playForceFieldPowerUpSound === 'function') {
      playForceFieldPowerUpSound();
    }
    
    // Visual effect for force field upgrade
    createCoinCollectionEffect(player.x + player.width/2, player.y + player.height/2);
  } else if (game.forceField.coinStreak >= 30 && game.forceField.level === 2) {
    // Upgrade to level 3 force field (new level)
    game.forceField.level = 3;
    game.forceField.active = true;
    console.log('🛡️ Force field upgraded! Level 3, streak:', game.forceField.coinStreak);
    
    // Play force field power up sound
    if (typeof playForceFieldPowerUpSound === 'function') {
      playForceFieldPowerUpSound();
    }
    
    // Visual effect for force field upgrade (more dramatic for level 3)
    createCoinCollectionEffect(player.x + player.width/2, player.y + player.height/2);
    for (let i = 0; i < 30; i++) {
      game.particles.push(new Particle(player.x + player.width/2, player.y + player.height/2, '#FFD700'));
    }
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
 * @param {number} level - Force field level (0, 1, 2, 3)
 * @returns {number} - Required coin streak threshold
 */
function getForceFieldThreshold(level) {
  switch (level) {
    case 0: return 5;  // Activate level 1
    case 1: return 12; // Upgrade to level 2 (updated from 10 to 12)
    case 2: return 30; // Upgrade to level 3 (new)
    default: return Infinity;
  }
}

// Export functions globally for access by other modules
window.collectCoin = collectCoin;
window.collectPowerup = collectPowerup;
window.resetCoinStreak = resetCoinStreak;
window.getForceFieldThreshold = getForceFieldThreshold;
