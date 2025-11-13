// ==========================================
// DESTROY ALL ENEMIES CONSUMABLE
// ==========================================
// Launches seeking missiles that automatically destroy all enemies on screen
// Does NOT affect bosses (only regular enemies)

// Missile tracking
let destroyAllMissiles = [];

// Missile class for seeking behavior
class DestroyAllMissile {
  constructor(startX, startY, targetEnemy, targetX, targetY) {
    this.x = startX;
    this.y = startY;
    this.targetEnemy = targetEnemy; // Reference to the enemy object
    this.targetX = targetX; // Target X position
    this.targetY = targetY; // Target Y position
    this.speed = 8; // Missile speed
    this.active = true;
    this.trail = []; // Trail for visual effect
  }
  
  update() {
    if (!this.active) return;
    
    // Check if target enemy still exists and is valid
    if (!this.targetEnemy) {
      this.active = false;
      return;
    }
    
    // Check if enemy was already destroyed (hp <= 0 means it's been hit)
    if (this.targetEnemy.hp <= 0) {
      this.active = false;
      return;
    }
    
    // Update target position (enemy might have moved)
    this.targetX = this.getEnemyX();
    this.targetY = this.getEnemyY();
    
    // Calculate direction to target
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Check if missile reached target (larger hit radius for better reliability)
    if (distance < 30) {
      this.hitTarget();
      return;
    }
    
    // Move towards target
    if (distance > 0) {
      this.x += (dx / distance) * this.speed;
      this.y += (dy / distance) * this.speed;
    }
    
    // Update trail
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 10) {
      this.trail.shift();
    }
  }
  
  getEnemyX() {
    // Get enemy X position based on system (tile-based or separate)
    if (typeof shouldUseSeparateEnemies === 'function' && shouldUseSeparateEnemies()) {
      // After tier 4: Enemy has absolute X position
      return this.targetEnemy.x;
    } else {
      // Before tier 4: Enemy is in tile, need to find tile
      for (let tile of tiles) {
        if (tile.obstacles && tile.obstacles.includes(this.targetEnemy)) {
          return tile.x + 20; // ENEMY_X_OFFSET
        }
      }
      return this.targetX; // Fallback
    }
  }
  
  getEnemyY() {
    // Enemy Y position is based on lane
    return this.targetEnemy.lane * game.laneHeight + (game.laneHeight - 60) / 2;
  }
  
  hitTarget() {
    if (!this.targetEnemy) {
      this.active = false;
      return;
    }
    
    // Check if enemy was already destroyed
    if (this.targetEnemy.hp <= 0) {
      this.active = false;
      return;
    }
    
    console.log(`💥 [DESTROY ALL] Missile hit enemy type ${this.targetEnemy.type} at (${this.targetX.toFixed(1)}, ${this.targetY.toFixed(1)})`);
    
    // Deal enough damage to destroy enemy (set HP to 0, same as when player projectile destroys enemy)
    // The normal game logic in the projectile collision system handles:
    // - Awarding score (15 * enemy.type)
    // - Tracking enemy defeat (game.enemiesDefeated++, game.enemyTypes.push)
    // - Playing sounds (playEnemyDestroyedSound)
    // - Creating explosion effects
    // - Removing enemy from arrays (via filter in main update loop)
    this.targetEnemy.hp = 0;
    
    // Trigger the same destruction logic that player projectiles use
    // This ensures score, tracking, sounds, and effects are handled consistently
    const collisionX = this.targetX;
    const collisionY = this.targetY;
    
    // Award score (same as player projectiles)
    if (typeof updateScore === 'function') {
      updateScore(15 * this.targetEnemy.type);
    }
    
    // Track enemy defeat (same as player projectiles)
    game.enemiesDefeated++;
    if (game.enemyTypes) {
      game.enemyTypes.push(this.targetEnemy.type);
    }
    
    // Play enemy destroyed sound (same as player projectiles)
    if (typeof playEnemyDestroyedSound === 'function') {
      playEnemyDestroyedSound();
    }
    
    // Create explosion effect (same as player projectiles)
    if (typeof createExplosionEffect === 'function') {
      createExplosionEffect(collisionX, collisionY);
    } else {
      // Fallback to destroy-all specific explosion
      createDestroyAllExplosion(collisionX, collisionY);
    }
    
    // Enemy will be removed from arrays by the normal game logic
    // (filtered out in main update loop when hp <= 0)
    
    // Mark missile as inactive
    this.active = false;
  }
  
  draw(ctx) {
    if (!this.active) return;
    
    // Draw magical trail (similar to player projectiles but with purple/magenta colors)
    if (this.trail.length > 1) {
      ctx.save();
      ctx.lineCap = 'round';
      
      // Draw trail segments with diminishing size and opacity (draw from newest to oldest)
      for (let i = this.trail.length - 2; i >= 0; i--) {
        const currentPoint = this.trail[i];
        const nextPoint = this.trail[i + 1];
        
        // Calculate diminishing properties (progress from old to new)
        const progress = (i + 1) / (this.trail.length - 1);
        const alpha = progress * 0.5; // Fade from 50% to 0%
        const lineWidth = progress * 8; // Diminish from 8px to 0
        
        // Magical purple/magenta color gradient
        const hue = 280 + (Math.sin(Date.now() * 0.01 + i) * 20); // Purple with slight variation
        const trailColor = `hsl(${hue}, 100%, ${60 + progress * 20}%)`;
        
        // Draw multiple layers for magical glow effect
        for (let layer = 0; layer < 3; layer++) {
          const layerAlpha = alpha * (1 - layer * 0.25);
          const layerWidth = lineWidth * (1 - layer * 0.15);
          
          ctx.globalAlpha = layerAlpha;
          ctx.strokeStyle = trailColor;
          ctx.lineWidth = Math.max(1, layerWidth);
          ctx.shadowColor = trailColor;
          ctx.shadowBlur = 5 + (layer * 2);
          
          ctx.beginPath();
          ctx.moveTo(currentPoint.x, currentPoint.y);
          ctx.lineTo(nextPoint.x, nextPoint.y);
          ctx.stroke();
        }
      }
      
      ctx.restore();
    }
    
    // Draw magical missile orb
    ctx.save();
    
    // Outer glow (larger, more transparent)
    const outerGlow = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, 20);
    outerGlow.addColorStop(0, 'rgba(200, 100, 255, 0.4)');
    outerGlow.addColorStop(0.5, 'rgba(150, 50, 255, 0.2)');
    outerGlow.addColorStop(1, 'rgba(150, 50, 255, 0)');
    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 20, 0, Math.PI * 2);
    ctx.fill();
    
    // Middle glow
    const middleGlow = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, 12);
    middleGlow.addColorStop(0, 'rgba(255, 100, 255, 0.6)');
    middleGlow.addColorStop(1, 'rgba(200, 50, 255, 0)');
    ctx.fillStyle = middleGlow;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 12, 0, Math.PI * 2);
    ctx.fill();
    
    // Core orb (bright center)
    const coreColor = `hsl(${280 + Math.sin(Date.now() * 0.02) * 15}, 100%, 70%)`;
    ctx.fillStyle = coreColor;
    ctx.shadowColor = coreColor;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // Bright center dot
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }
}

// Activate destroy all enemies
function activateDestroyAll() {
  if (!game.destroyAllPower || game.destroyAllPower.usesRemaining <= 0) {
    console.log('💥 [DESTROY ALL] Cannot activate - not available');
    return;
  }
  
  // Don't activate during boss fights
  if (game.bossActive) {
    console.log('💥 [DESTROY ALL] Cannot activate during boss fight');
    return;
  }
  
  // Mark as used
  game.destroyAllPower.usesRemaining = 0;
  game.destroyAllPower.active = true;
  
  // Clear previous missiles
  destroyAllMissiles = [];
  
  // Collect all enemies on screen
  const allEnemies = [];
  
  // Get enemies from tile-based system (before tier 4)
  if (typeof shouldUseSeparateEnemies === 'function' && !shouldUseSeparateEnemies()) {
    tiles.forEach(tile => {
      if (tile.x > -100 && tile.x < game.width + 100) { // On screen
        tile.obstacles.forEach(obs => {
          const enemyX = tile.x + 20; // ENEMY_X_OFFSET
          const enemyY = obs.lane * game.laneHeight + (game.laneHeight - 60) / 2;
          const distance = Math.hypot(
            enemyX - (player.x + player.width / 2),
            enemyY - (player.y + player.height / 2)
          );
          allEnemies.push({
            enemy: obs,
            x: enemyX,
            y: enemyY,
            distance: distance,
            isTileBased: true,
            tile: tile
          });
        });
      }
    });
  }
  
  // Get enemies from separate enemies array (after tier 4)
  if (typeof shouldUseSeparateEnemies === 'function' && shouldUseSeparateEnemies() && typeof enemies !== 'undefined') {
    enemies.forEach(enemy => {
      if (enemy.x > -100 && enemy.x < game.width + 100) { // On screen
        const enemyY = enemy.lane * game.laneHeight + (game.laneHeight - 60) / 2;
        const distance = Math.hypot(
          enemy.x - (player.x + player.width / 2),
          enemyY - (player.y + player.height / 2)
        );
        allEnemies.push({
          enemy: enemy,
          x: enemy.x,
          y: enemyY,
          distance: distance,
          isTileBased: false
        });
      }
    });
  }
  
  // Sort by distance (closest first)
  allEnemies.sort((a, b) => a.distance - b.distance);
  
  // Create one missile per enemy
  const playerCenterX = player.x + player.width / 2;
  const playerCenterY = player.y + player.height / 2;
  
  allEnemies.forEach(enemyData => {
    const missile = new DestroyAllMissile(
      playerCenterX,
      playerCenterY,
      enemyData.enemy,
      enemyData.x,
      enemyData.y
    );
    destroyAllMissiles.push(missile);
  });
  
  console.log(`💥 [DESTROY ALL] Activated - ${destroyAllMissiles.length} missiles launched`);
  
  // Play launch sound
  // TODO: Add destroy all launch sound
  
  // Create activation effect
  createDestroyAllActivationEffect();
}

// Update destroy all missiles
function updateDestroyAll() {
  if (!game.destroyAllPower || !game.destroyAllPower.active) {
    return;
  }
  
  // Update all missiles (they seek and destroy enemies)
  destroyAllMissiles.forEach(missile => {
    if (missile.active) {
      missile.update();
    }
  });
  
  // Remove inactive missiles
  const beforeCount = destroyAllMissiles.length;
  destroyAllMissiles = destroyAllMissiles.filter(m => m.active);
  const afterCount = destroyAllMissiles.length;
  
  if (beforeCount !== afterCount) {
    console.log(`💥 [DESTROY ALL] ${beforeCount - afterCount} missiles completed, ${afterCount} remaining`);
  }
  
  // Check if all missiles are done
  if (destroyAllMissiles.length === 0) {
    game.destroyAllPower.active = false;
    console.log('💥 [DESTROY ALL] All missiles completed - all enemies destroyed');
    
    // Play completion sound
    // TODO: Add destroy all completion sound
    
    // Subtle screen shake effect (create particles instead if screen shake not available)
    // TODO: Add screen shake effect when available
  }
}

// Create activation effect
function createDestroyAllActivationEffect() {
  // Create particles around player
  const playerCenterX = player.x + player.width / 2;
  const playerCenterY = player.y + player.height / 2;
  
  for (let i = 0; i < 20; i++) {
    const angle = (Math.PI * 2 * i) / 20;
    const speed = 3 + Math.random() * 2;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    game.particles.push(new Particle(
      playerCenterX,
      playerCenterY,
      '#FF6B00',
      { x: vx, y: vy }
    ));
  }
}

// Create explosion effect at impact point
function createDestroyAllExplosion(x, y) {
  // Create explosion particles
  for (let i = 0; i < 15; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 3;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    game.particles.push(new Particle(
      x,
      y,
      '#FF6B00',
      { x: vx, y: vy }
    ));
  }
  
  // Create larger explosion particles
  for (let i = 0; i < 10; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 4 + Math.random() * 4;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    game.particles.push(new Particle(
      x,
      y,
      '#FFD700',
      { x: vx, y: vy }
    ));
  }
}

// Render destroy all missiles
function renderDestroyAllMissiles(ctx) {
  if (!game.destroyAllPower || !game.destroyAllPower.active) {
    return;
  }
  
  destroyAllMissiles.forEach(missile => missile.draw(ctx));
}

// Make functions globally accessible
if (typeof window !== 'undefined') {
  window.activateDestroyAll = activateDestroyAll;
  window.updateDestroyAll = updateDestroyAll;
  window.renderDestroyAllMissiles = renderDestroyAllMissiles;
}

