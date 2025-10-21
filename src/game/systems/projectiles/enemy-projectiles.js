// ==========================================
// ENEMY PROJECTILE SYSTEM
// ==========================================

// Enemy projectile creation and management
function createEnemyProjectile(x, y, vx, vy) {
  game.enemyProjectiles.push({ 
    x: x, 
    y: y, 
    vx: vx, 
    vy: vy,
    spin: 0 // Add spin property for candle rotation
  });
}

// Update enemy projectiles
function updateEnemyProjectiles() {
  game.enemyProjectiles = game.enemyProjectiles.filter(b => {
    b.x += b.vx;
    b.y += b.vy;
    b.spin += 0.2; // Rotate the spinning candle effect
    return b.x > -50 && b.x < game.width + 50 && b.y > -50 && b.y < game.height + 50;
  });
}

// Check collision between player and enemy projectiles
function checkEnemyProjectileCollision() {
  // Don't check collision if player is invulnerable
  if (game.invulnerabilityTime > 0) {
    return false;
  }
  
  const cx = player.x + player.width/2, cy = player.y + player.height/2;
  for (let i=game.enemyProjectiles.length-1;i>=0;i--) {
    const b = game.enemyProjectiles[i];
    // Collision box for just the character's main body (excluding extended hands, feet, and tails)
    const bodyWidth = player.width * 0.4;  // 40% of sprite width (hands extend far out)
    const bodyHeight = player.height * 0.65; // 65% of sprite height (feet and tails extend down)
    const bodyX = player.x + (player.width - bodyWidth) / 2;
    const bodyY = player.y + (player.height - bodyHeight) / 2;
    
    // Check if projectile hits player area
    if (b.x > bodyX && b.x < bodyX + bodyWidth &&
        b.y > bodyY && b.y < bodyY + bodyHeight) {
      
      // If force field is active, it blocks the projectile
      if (game.forceField.active && game.forceField.level > 0 && game.forceField.invulnerabilityTime <= 0) {
        console.log('Force field blocked projectile! Level:', game.forceField.level);
        game.enemyProjectiles.splice(i,1);
        
        // Force field takes damage and loses a level
        game.forceField.level--;
        game.forceField.invulnerabilityTime = 60; // 1 second of invulnerability
        if (game.forceField.level <= 0) {
          game.forceField.active = false;
          game.forceField.level = 0;
          console.log('Force field destroyed!');
          // Give player invulnerability when force field is destroyed
          game.invulnerabilityTime = 60; // 1 second of invulnerability
        } else {
          console.log('Force field damaged! New level:', game.forceField.level);
        }
        
        // Reset coin streak when force field is hit
        resetCoinStreak();
        
        // Visual effect for force field hit
        createForceFieldHitEffect(b.x, b.y);
        
        // Flash effect (lighter than direct hit)
        game.flashTime = 10;
        
        return false; // Player not hit, force field absorbed the damage
      } else {
        console.log('No force field protection! Player hit by projectile');
        game.enemyProjectiles.splice(i,1);
        game.flashTime = 20;
        game.invulnerabilityTime = 60; // 1 second of invulnerability (60 frames at 60fps)
        
        // Reset coin streak when player hits projectile
        resetCoinStreak();
        
        return true;
      }
    }
  }
  return false;
}
