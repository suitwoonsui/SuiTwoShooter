// ==========================================
// TILE GENERATION - OBSTACLES, COINS, POWERUPS
// ==========================================

// Generate tiles (vertical columns of enemies)
function generateTiles() {
  while (tiles.length < 30) {
    // Determine starting X position - ALWAYS use tiles for consistent spacing
    // (Enemies move faster after tier 4, so using enemy positions would cause inconsistent spacing)
    const lastX = tiles.length ? tiles[tiles.length-1].x : game.width;
    const x = lastX + game.width / 10;
    const lanes = [0,1,2];

    // Obstacles (monsters) - limited by current tier
    const recent = tiles.slice(-3);
    let count;
    let used;
    
    if (typeof shouldUseSeparateEnemies === 'function' && shouldUseSeparateEnemies() && typeof enemies !== 'undefined') {
      // After tier 4: Count enemies from separate enemies[] array that are in recent tile area
      // Find the X position range of recent tiles
      const recentTileMinX = recent.length > 0 ? Math.min(...recent.map(t => t.x)) : -Infinity;
      const recentTileMaxX = recent.length > 0 ? Math.max(...recent.map(t => t.x)) : Infinity;
      
      // Count enemies that are spatially within the recent tile area
      const recentEnemies = enemies.filter(e => e.x >= recentTileMinX && e.x <= recentTileMaxX);
      count = recentEnemies.length;
      
      // Get lanes used by enemies in recent area
      used = recentEnemies.map(e => e.lane);
    } else {
      // Before tier 4: Count enemies in tiles
      count = recent.reduce((sum, t) => sum + t.obstacles.length, 0);
      used = recent.flatMap(t => t.obstacles.map(o => o.lane));
    }
    
    const obstacles = [];
    if (count < 3 && Math.random() < 0.35) {
      const free = lanes.filter(l => !used.includes(l));
      const lane = free.length
        ? free[Math.floor(Math.random()*free.length)]
        : lanes[Math.floor(Math.random()*lanes.length)];
      
      // Type selection based on current tier
      const availableTypes = [];
      for (let i = 1; i <= Math.min(game.currentTier, 4); i++) {
        availableTypes.push(i);
      }
      
      // Weighting by difficulty (more strong monsters at high tiers)
      let weights;
      if (game.currentTier === 1) weights = [100]; // Only tier 1
      else if (game.currentTier === 2) weights = [70, 30]; // Majority tier 1
      else if (game.currentTier === 3) weights = [50, 30, 20]; // Balanced
      else weights = [30, 25, 25, 20]; // More variety
      
      let r = Math.random() * weights.reduce((a,b)=>a+b,0), type = availableTypes[0];
      for (let i = 0; i < weights.length; i++) {
        if (r < weights[i]) { type = availableTypes[i]; break; }
        r -= weights[i];
      }
      
      let power = null;
      if (Math.random() < 0.2) power = Math.random() < 0.5 ? 'freeze' : 'slow';
      
      const enemyData = { 
        lane, 
        type, 
        power, 
        canShoot: false, 
        lastShot: 0,
        hp: enemyStats[type].hp,
        maxHp: enemyStats[type].hp
      };
      
      // After tier 4: Add to separate enemies array AND obstacles array for lane tracking
      if (typeof shouldUseSeparateEnemies === 'function' && shouldUseSeparateEnemies()) {
        // Add to separate enemies array with absolute X position
        if (typeof enemies !== 'undefined') {
          enemies.push({
            x: x + 20, // ENEMY_X_OFFSET (same as tile.x + 20)
            ...enemyData
          });
        }
        // Also add to obstacles array so collectibles can check lanes (even though enemies are separate)
        obstacles.push(enemyData);
      } else {
        // Before tier 4: Add to tile obstacles (current behavior)
        obstacles.push(enemyData);
      }
    }

    // Coin
    let coinLane = null;
    if (Math.random() < 0.2) {
      // Use obstacles array for lane checking (works for both before and after tier 4)
      // After tier 4, obstacles array is populated for lane tracking even though enemies are separate
      const usedLanes = obstacles.map(o => o.lane);
      const free = lanes.filter(l => !usedLanes.includes(l));
      coinLane = free.length
        ? free[Math.floor(Math.random()*free.length)]
        : lanes[Math.floor(Math.random()*lanes.length)];
    }

    // Power-ups: separate variables for bonus and powerdown
    let powerupBonus = null;
    let powerdown = null;
    
    // Check if player is at or above orb level cap (for power-up bonus spawning)
    const currentOrbLevel = game.projectileLevel || 1;
    const orbLevelCap = game.orbLevelCap || (game.startingOrbLevel || 1) + 2;
    const isAtOrbCap = currentOrbLevel >= orbLevelCap;
    
    if (Math.random() < 0.1) {
      // Use obstacles array for lane checking (works for both before and after tier 4)
      // After tier 4, obstacles array is populated for lane tracking even though enemies are separate
      const usedLanes = [...obstacles.map(o => o.lane), coinLane].filter(x => x !== null);
      const free = lanes.filter(l => !usedLanes.includes(l));
      const lane = free.length
        ? free[Math.floor(Math.random()*free.length)]
        : lanes[Math.floor(Math.random()*lanes.length)];
      
      // Power-up cap system: Don't spawn power-up bonuses if at or above cap
      // But always allow power-downs (so players can drop below cap and resume spawning)
      if (isAtOrbCap) {
        // At cap - only spawn power-downs (allows player to drop below cap)
        powerdown = { lane };
      } else {
        // Below cap - spawn both power-ups and power-downs normally
        if (Math.random() < 0.5) {
          powerupBonus = { lane };
        } else {
          powerdown = { lane };
        }
      }
    }

    tiles.push({ x, obstacles, coinLane, powerupBonus, powerdown });
  }
}
