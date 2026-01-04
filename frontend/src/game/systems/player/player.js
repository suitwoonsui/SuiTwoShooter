// ==========================================
// PLAYER MANAGEMENT - MOVEMENT AND CONTROL
// ==========================================

// Player movement and positioning
function updatePlayer() {
  // Smooth vertical movement following mouse
  const dy = game.mouseY - player.y - player.height/2;
  player.y += dy * player.moveSpeed;
  
  // Keep player within screen bounds
  player.y = Math.max(0, Math.min(game.height - player.height, player.y));
  
  // Calculate current lane based on Y position
  player.lane = Math.floor((player.y + player.height/2) / game.laneHeight);
  player.lane = Math.max(0, Math.min(2, player.lane));
  
  // Trail management
  if (!game.bossWarning) {
    player.trail.push({ x: player.x + player.width/2, y: player.y + player.height/2 });
    if (player.trail.length > 8) player.trail.shift();
  } else {
    if (player.trail.length > 0) {
      player.trail.shift();
    }
  }
}

// Input handling
function handleInput() {
  // Optional keyboard controls (for compatibility)
  if (game.keys['ArrowUp']||game.keys['KeyW']) {
    game.mouseY = Math.max(0, game.mouseY - 5);
  }
  if (game.keys['ArrowDown']||game.keys['KeyS']) {
    game.mouseY = Math.min(game.height, game.mouseY + 5);
  }
}

// Auto fire system
function handleAutoFire() {
  const now = game.now();
  if (now - game.lastAutoFire >= game.autoFireInterval) {
    game.lastAutoFire = now;
    // Fire single magic orb with current level (bigger = more powerful)
    shootSingleBeam(game.projectileLevel, 0);
  }
}
