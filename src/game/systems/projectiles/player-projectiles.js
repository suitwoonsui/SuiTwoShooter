// ==========================================
// BULLET MANAGEMENT - CREATION AND MOVEMENT
// ==========================================

// Shoot single beam with level-based power
function shootSingleBeam(level, offsetY) {
  // Don't shoot if boss is active but not in position yet
  if (game.bossActive && game.boss && game.boss.x > game.boss.targetX) {
    return;
  }
  
  // Don't shoot during boss victory timeout
  if (game.bossVictoryTimeout) {
    return;
  }
  
  const cx = player.x + player.width;
  const cy = player.y + player.height/2 + offsetY;
  const w = 4 + level*4, speed = 10 + level*2;
  
  // Play shoot sound
  if (typeof playShootSound === 'function') {
    playShootSound();
  }
  
  game.projectiles.push({ 
    x: cx, 
    y: cy, 
    width: w, 
    speed, 
    level,
    // Trail properties
    trail: [],
    maxTrailLength: Math.min(6, Math.floor(speed / 3)), // Shorter trails, especially for level 1
    trailColor: `hsl(${200 + level * 15}, 100%, 60%)` // Different colors per level (blue to cyan)
  });
}
