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
    // Calculate effective fire rate with post-tier-4 scaling and slow time
    const baseFireRate = enemyStats[enemy.type].fireRate;
    const fireRateMultiplier = typeof getFireRateMultiplier === 'function' ? getFireRateMultiplier() : 1.0;
    const slowTimeMultiplier = typeof getEffectiveFireRateMultiplier === 'function' ? getEffectiveFireRateMultiplier() : 1.0;
    // Divide by fireRateMultiplier to make faster (post-tier-4 scaling)
    // Multiply by slowTimeMultiplier to make slower (slow time doubles the delay)
    const effectiveFireRate = (baseFireRate / fireRateMultiplier) * slowTimeMultiplier;
    
    if (!enemy.canShoot && enemyX > 0 && enemyX < game.width) {
      enemy.canShoot = true;
      enemy.lastShot = now - effectiveFireRate;
    }
    if (enemy.canShoot && now - enemy.lastShot >= effectiveFireRate) {
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
        // Apply slow time multiplier to projectile speed
        const slowTimeMultiplier = typeof getEffectiveProjectileSpeedMultiplier === 'function' ? getEffectiveProjectileSpeedMultiplier() : 1.0;
        const s = baseSpeed * speedMultiplier * slowTimeMultiplier;
        createEnemyProjectile(ex, ey, dx0/dist*s, dy0/dist*s);
      }
    }
  }
  
  // Process enemies based on system being used
  if (typeof shouldUseSeparateEnemies === 'function' && shouldUseSeparateEnemies() && typeof enemies !== 'undefined') {
    // After tier 4: Process separate enemies only (obstacles in tiles are just for lane tracking)
    enemies.forEach(enemy => {
      processEnemyShooting(enemy, enemy.x);
    });
  } else {
    // Before tier 4: Process tile-based enemies
    tiles.forEach(tile => tile.obstacles.forEach(obs => {
      const tx = tile.x + 20;
      processEnemyShooting(obs, tx);
    }));
  }
}
