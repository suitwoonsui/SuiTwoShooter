// ==========================================
// BOSS PROJECTILE SYSTEM
// ==========================================

// Boss projectile creation and management
function createBossProjectile(x, y, vx, vy) {
  game.bossProjectiles.push({ 
    x: x, 
    y: y, 
    vx: vx, 
    vy: vy
    // Boss projectiles don't have spin property
  });
}

// Update boss projectiles
function updateBossProjectiles() {
  // Don't update projectiles if boss isn't in position yet
  if (!game.bossActive || !game.boss || !game.boss.vulnerable || game.boss.x > game.boss.targetX) {
    return;
  }
  
  // Get effective projectile speed multiplier (applies slow time if active)
  const speedMultiplier = typeof getEffectiveProjectileSpeedMultiplier === 'function' ? getEffectiveProjectileSpeedMultiplier() : 1.0;
  
  game.bossProjectiles = game.bossProjectiles.filter(b => {
    b.x += b.vx * speedMultiplier;
    b.y += b.vy * speedMultiplier;
    // Boss projectiles don't spin
    return b.x > -50 && b.x < game.width + 50 && b.y > -50 && b.y < game.height + 50;
  });
}

// Check collision between player and boss projectiles
function checkBossProjectileCollision() {
  // Don't check collision if boss isn't in position yet
  if (!game.bossActive || !game.boss || !game.boss.vulnerable || game.boss.x > game.boss.targetX) {
    return false;
  }
  
  // Don't check collision if player is invulnerable
  if (game.invulnerabilityTime > 0) {
    return false;
  }
  
  const cx = player.x + player.width/2, cy = player.y + player.height/2;
  for (let i=game.bossProjectiles.length-1;i>=0;i--) {
    const b = game.bossProjectiles[i];
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
        console.log('Force field blocked boss projectile! Level:', game.forceField.level);
        game.bossProjectiles.splice(i,1);
        
        // Force field takes damage and loses a level
        game.forceField.level--;
        game.forceField.invulnerabilityTime = 60; // 1 second of invulnerability
        // Give player invulnerability immediately to protect against other projectiles in same frame
        game.invulnerabilityTime = 60; // 1 second of invulnerability
        if (game.forceField.level <= 0) {
          game.forceField.active = false;
          game.forceField.level = 0;
          console.log('Force field destroyed by boss projectile!');
          // Play force field destroyed sound
          if (typeof playForceFieldDestroyedSound === 'function') {
            playForceFieldDestroyedSound();
          }
        } else {
          console.log('Force field damaged by boss projectile! New level:', game.forceField.level);
          // Play force field power down sound
          if (typeof playForceFieldPowerDownSound === 'function') {
            playForceFieldPowerDownSound();
          }
        }
        
        // Reset coin streak when force field is hit
        resetCoinStreak();
        
        // Visual effect for force field hit
        createForceFieldHitEffect(b.x, b.y);
        
        // Flash effect (lighter than direct hit)
        game.flashTime = 10;
        
        return false; // Player not hit, force field absorbed the damage
      } else {
        console.log('No force field protection! Player hit by boss projectile');
        game.bossProjectiles.splice(i,1);
        game.flashTime = 20;
        game.invulnerabilityTime = 60; // 1 second of invulnerability (60 frames at 60fps)
        // Play player hit sound
        if (typeof playPlayerHitSound === 'function') {
          playPlayerHitSound();
        }
        
        // Reset coin streak when player hits boss projectile
        resetCoinStreak();
        
        return true;
      }
    }
  }
  return false;
}
