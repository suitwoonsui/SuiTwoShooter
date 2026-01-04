// ==========================================
// TILE GENERATION - OBSTACLES, COINS, POWERUPS
// ==========================================

// Generate tiles (vertical columns of enemies)
function generateTiles() {
  const game = (typeof window !== 'undefined' && window.gameState) ? window.gameState : 
               (typeof window !== 'undefined' && window.game) ? window.game : null;
  
  if (!game) {
    console.error('❌ [TILES] Game state not available');
    return;
  }
  
  // Get reference to tiles - try window.tiles first, then fallback to global tiles
  // This matches the backup behavior where tiles is a global variable
  let tilesArray;
  if (typeof window !== 'undefined' && window.tiles) {
    tilesArray = window.tiles;
  } else if (typeof tiles !== 'undefined') {
    tilesArray = tiles;
  } else {
    tilesArray = [];
  }
  
  // Generate tiles until we have 30 (matching backup behavior)
  while (tilesArray.length < 30) {
    // Determine starting X position - ALWAYS use tiles for consistent spacing
    // (Enemies move faster after tier 4, so using enemy positions would cause inconsistent spacing)
    const lastX = tilesArray.length ? tilesArray[tilesArray.length-1].x : game.width;
    const x = lastX + game.width / 10;
    const lanes = [0,1,2];

    // Enemies (monsters) - limited by current tier
    // ALWAYS use enemies[] array - never use tile.obstacles for enemies
    const recent = tilesArray.slice(-3);
    let count;
    let used;
    
    // Get enemies array from window (exposed by main.js) or use global
    const enemiesArray = (typeof window !== 'undefined' && window.enemies) ? window.enemies : 
                         (typeof enemies !== 'undefined' ? enemies : []);
    
    // Count enemies from enemies[] array that are in recent tile area
    // Find the X position range of recent tiles
    const recentTileMinX = recent.length > 0 ? Math.min(...recent.map(t => t.x)) : -Infinity;
    const recentTileMaxX = recent.length > 0 ? Math.max(...recent.map(t => t.x)) : Infinity;
    
    // Count enemies that are spatially within the recent tile area
    const recentEnemies = enemiesArray.filter(e => e.x >= recentTileMinX && e.x <= recentTileMaxX);
    count = recentEnemies.length;
    
    // Get lanes used by enemies in recent area
    used = recentEnemies.map(e => e.lane);
    
    // Spawn enemy if count is low
    let spawnedEnemyLane = null;
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
        x: x + 20, // ENEMY_X_OFFSET (absolute X position)
        lane, 
        type, 
        power, 
        canShoot: false, 
        lastShot: 0,
        hp: enemyStats[type].hp,
        maxHp: enemyStats[type].hp
      };
      
      // ALWAYS add to enemies[] array (never to tile.obstacles)
      enemiesArray.push(enemyData);
      // Update global reference
      if (typeof window !== 'undefined') {
        window.enemies = enemiesArray;
      }
      
      spawnedEnemyLane = lane; // Track for lane checking
    }

    // Coin - check lanes used by enemies in enemies[] array
    let coinLane = null;
    if (Math.random() < 0.2) {
      // Get lanes used by enemies near this tile position
      const nearbyEnemies = enemiesArray.filter(e => Math.abs(e.x - x) < 100);
      const usedLanes = nearbyEnemies.map(e => e.lane);
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
      // Get lanes used by enemies near this tile position
      const nearbyEnemies = enemiesArray.filter(e => Math.abs(e.x - x) < 100);
      const usedLanes = [...nearbyEnemies.map(e => e.lane), coinLane].filter(x => x !== null);
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

    // Push tile WITHOUT obstacles - tiles are now ONLY for collectibles (coins, power-ups)
    // Enemies are always in enemies[] array
    tilesArray.push({ x, coinLane, powerupBonus, powerdown });
  }
  
  // Ensure window.tiles points to the same array (matching backup behavior)
  // In the backup, tiles is a global variable that's always the same reference
  if (typeof window !== 'undefined') {
    window.tiles = tilesArray;
  }
}

// Expose globally
if (typeof window !== 'undefined') {
  window.generateTiles = generateTiles;
}
