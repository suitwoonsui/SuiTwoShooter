// ==========================================
// ENEMY BEHAVIOR - EXACT COPY FROM ORIGINAL
// ==========================================

// Update enemy shooting behavior
function updateEnemyShooting() {
  const now = game.now();
  tiles.forEach(tile=> tile.obstacles.forEach(obs=>{
    const tx = tile.x + 20;
    if (!obs.canShoot && tx>0 && tx<game.width) {
      obs.canShoot = true;
      obs.lastShot = now - enemyStats[obs.type].fireRate;
    }
    if (obs.canShoot && now - obs.lastShot >= enemyStats[obs.type].fireRate) {
      obs.lastShot = now;
      const ex = tx;
      const ey = obs.lane*game.laneHeight + game.laneHeight/2;
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
        const s = 4 * enemyStats[obs.type].speed; // Speed based on tier
        createEnemyProjectile(ex, ey, dx0/dist*s, dy0/dist*s);
      }
    }
  }));
}
