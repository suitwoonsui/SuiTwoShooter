// ==========================================
// ENEMY BEHAVIOR - EXACT COPY FROM ORIGINAL
// ==========================================

// Update enemy shooting behavior
function updateEnemyShooting() {
  // Don't allow enemy shooting during level start delay
  if (game.levelStartDelay > 0) {
    return;
  }
  
  const now = game.now();
  
  // Helper function to process enemy shooting
  function processEnemyShooting(enemy, enemyX) {
    if (!enemy.canShoot && enemyX > 0 && enemyX < game.width) {
      enemy.canShoot = true;
      enemy.lastShot = now - enemyStats[enemy.type].fireRate;
    }
    if (enemy.canShoot && now - enemy.lastShot >= enemyStats[enemy.type].fireRate) {
      enemy.lastShot = now;
      const ex = enemyX;
      const ey = enemy.lane * game.laneHeight + game.laneHeight/2;
      const dx0 = (player.x+player.width/2)-ex;
      const dy0 = (player.y+player.height/2)-ey;
      const dist = Math.hypot(dx0,dy0);
      
      // Prevent enemies from shooting once they get too close to the player
      // Check if enemy has reached the "no-shoot zone" near the player
      const playerColumn = Math.floor(player.x / 50); // Divide screen into columns
      const enemyColumn = Math.floor(ex / 50);
      const columnDistance = Math.abs(playerColumn - enemyColumn);
      
      // Once enemy gets within 2 columns of the player, they stop shooting permanently
      const hasReachedNoShootZone = columnDistance <= 2;
      
      if (dist>5 && !hasReachedNoShootZone) {
        const baseSpeed = 4 * enemyStats[enemy.type].speed; // Speed based on tier
        // Apply post-tier-4 scaling multiplier (+5% per boss after tier 4)
        const speedMultiplier = typeof getProjectileSpeedMultiplier === 'function' ? getProjectileSpeedMultiplier() : 1.0;
        const s = baseSpeed * speedMultiplier;
        createEnemyProjectile(ex, ey, dx0/dist*s, dy0/dist*s);
      }
    }
  }
  
  // Process tile-based enemies (before tier 4)
  tiles.forEach(tile => tile.obstacles.forEach(obs => {
    const tx = tile.x + 20;
    processEnemyShooting(obs, tx);
  }));
  
  // Process separate enemies (after tier 4)
  if (typeof shouldUseSeparateEnemies === 'function' && shouldUseSeparateEnemies() && typeof enemies !== 'undefined') {
    enemies.forEach(enemy => {
      processEnemyShooting(enemy, enemy.x);
    });
  }
}
