// ==========================================
// TILE GENERATION - OBSTACLES, COINS, POWERUPS
// ==========================================

// Generate tiles (vertical columns of enemies)
function generateTiles() {
  while (tiles.length < 30) {
    const lastX = tiles.length ? tiles[tiles.length-1].x : game.width;
    const x = lastX + game.width / 10;
    const lanes = [0,1,2];

    // Obstacles (monsters) - limited by current tier
    const recent = tiles.slice(-3);
    let count = recent.reduce((sum, t) => sum + t.obstacles.length, 0);
    const obstacles = [];
    if (count < 3 && Math.random() < 0.35) {
      const used = recent.flatMap(t => t.obstacles.map(o => o.lane));
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
      obstacles.push({ 
        lane, 
        type, 
        power, 
        canShoot: false, 
        lastShot: 0,
        hp: enemyStats[type].hp,
        maxHp: enemyStats[type].hp
      });
    }

    // Coin
    let coinLane = null;
    if (Math.random() < 0.2) {
      const used = obstacles.map(o => o.lane);
      const free = lanes.filter(l => !used.includes(l));
      coinLane = free.length
        ? free[Math.floor(Math.random()*free.length)]
        : lanes[Math.floor(Math.random()*lanes.length)];
    }

    // Power-ups: separate variables for bonus and powerdown
    let powerupBonus = null;
    let powerdown = null;
    if (Math.random() < 0.1) {
      const used = [...obstacles.map(o=>o.lane), coinLane].filter(x=>x!==null);
      const free = lanes.filter(l => !used.includes(l));
      const lane = free.length
        ? free[Math.floor(Math.random()*free.length)]
        : lanes[Math.floor(Math.random()*lanes.length)];
      if (Math.random() < 0.5) {
        powerupBonus = { lane };
      } else {
        powerdown = { lane };
      }
    }

    tiles.push({ x, obstacles, coinLane, powerupBonus, powerdown });
  }
}
