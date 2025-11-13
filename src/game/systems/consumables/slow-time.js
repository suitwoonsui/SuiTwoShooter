// ==========================================
// SLOW TIME CONSUMABLE
// ==========================================
// Slows game speed (scrollSpeed and enemySpeed) for a duration
// Does NOT affect distanceSpeed (boss timing remains consistent)

// Constants
const SLOW_TIME_SPEED_REDUCTION = 0.5; // 50% speed reduction (all levels)
const SLOW_TIME_DURATIONS = {
  1: 4000, // 4 seconds
  2: 6000, // 6 seconds
  3: 8000  // 8 seconds
};

// Visual effect particles
let slowTimeParticles = [];

// Particle class for slow time effects
class SlowTimeParticle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 2;
    this.vy = (Math.random() - 0.5) * 2;
    this.life = 1.0;
    this.decay = 0.01;
    this.size = Math.random() * 4 + 2;
    this.color = `hsl(${200 + Math.random() * 40}, 100%, ${60 + Math.random() * 20}%)`; // Blue-purple range
  }
  
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life -= this.decay;
    this.size *= 0.98;
  }
  
  draw(ctx) {
    if (this.life <= 0) return;
    ctx.save();
    ctx.globalAlpha = this.life * 0.6;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// Activate slow time power
function activateSlowTime() {
  console.log('⏱️ [SLOW TIME] activateSlowTime() called');
  console.log('⏱️ [SLOW TIME] game.slowTimePower:', game.slowTimePower);
  
  if (!game.slowTimePower) {
    console.log('⏱️ [SLOW TIME] Cannot activate - slowTimePower not initialized');
    return;
  }
  
  if (game.slowTimePower.usesRemaining <= 0) {
    console.log('⏱️ [SLOW TIME] Cannot activate - no uses remaining');
    return;
  }
  
  if (game.slowTimePower.active) {
    console.log('⏱️ [SLOW TIME] Cannot activate - already active');
    return;
  }
  
  const level = game.slowTimePower.level;
  const duration = SLOW_TIME_DURATIONS[level];
  
  // Initialize slow time state
  game.slowTimePower.active = true;
  game.slowTimePower.remainingTime = duration;
  game.slowTimePower.usesRemaining = 0; // One-time use
  
  // Store original speeds (before applying multiplier)
  game.slowTimePower.originalScrollSpeed = game.scrollSpeed;
  game.slowTimePower.originalEnemySpeed = game.enemySpeed;
  
  // Clear previous particles
  slowTimeParticles = [];
  
  // Create activation effect (particles around screen edges)
  createSlowTimeActivationEffect();
  
  console.log(`⏱️ [SLOW TIME] Activated - Level ${level}, Duration: ${duration}ms`);
}

// Update slow time (called from main update loop)
function updateSlowTime() {
  if (!game.slowTimePower || !game.slowTimePower.active) {
    return;
  }
  
  // Update remaining time (using same deltaTime calculation as coin tractor beam)
  const deltaTime = game.lastFrameTime ? (Date.now() - game.lastFrameTime) : 16;
  game.slowTimePower.remainingTime -= deltaTime;
  
  // Check if time expired
  if (game.slowTimePower.remainingTime <= 0) {
    deactivateSlowTime();
    return;
  }
  
  // Apply speed multiplier to scrollSpeed and enemySpeed
  // We apply the multiplier during movement, not by modifying the base values
  // This way the speed increments still work correctly
  game.slowTimePower.currentScrollSpeed = game.scrollSpeed * SLOW_TIME_SPEED_REDUCTION;
  game.slowTimePower.currentEnemySpeed = game.enemySpeed * SLOW_TIME_SPEED_REDUCTION;
  
  // Update particles
  slowTimeParticles.forEach(p => p.update());
  slowTimeParticles = slowTimeParticles.filter(p => p.life > 0);
  
  // Spawn new particles occasionally
  if (Math.random() < 0.1) {
    spawnSlowTimeParticle();
  }
}

// Deactivate slow time
function deactivateSlowTime() {
  if (!game.slowTimePower || !game.slowTimePower.active) {
    return;
  }
  
  game.slowTimePower.active = false;
  game.slowTimePower.remainingTime = 0;
  
  // Clear particles
  slowTimeParticles = [];
  
  console.log('⏱️ [SLOW TIME] Deactivated');
}

// Create activation effect
function createSlowTimeActivationEffect() {
  // Spawn particles around screen edges
  for (let i = 0; i < 30; i++) {
    let x, y;
    const side = Math.floor(Math.random() * 4);
    if (side === 0) { // Top
      x = Math.random() * game.width;
      y = 0;
    } else if (side === 1) { // Right
      x = game.width;
      y = Math.random() * game.height;
    } else if (side === 2) { // Bottom
      x = Math.random() * game.width;
      y = game.height;
    } else { // Left
      x = 0;
      y = Math.random() * game.height;
    }
    slowTimeParticles.push(new SlowTimeParticle(x, y));
  }
}

// Spawn a new slow time particle
function spawnSlowTimeParticle() {
  const side = Math.floor(Math.random() * 4);
  let x, y;
  if (side === 0) { // Top
    x = Math.random() * game.width;
    y = 0;
  } else if (side === 1) { // Right
    x = game.width;
    y = Math.random() * game.height;
  } else if (side === 2) { // Bottom
    x = Math.random() * game.width;
    y = game.height;
  } else { // Left
    x = 0;
    y = Math.random() * game.height;
  }
  slowTimeParticles.push(new SlowTimeParticle(x, y));
}

// Render slow time visual effects
function renderSlowTimeEffects(ctx) {
  if (!game.slowTimePower || !game.slowTimePower.active) {
    return;
  }
  
  // Draw screen tint (blue-purple overlay)
  ctx.save();
  const tintAlpha = 0.15; // Subtle tint
  ctx.fillStyle = `rgba(100, 150, 255, ${tintAlpha})`;
  ctx.fillRect(0, 0, game.width, game.height);
  ctx.restore();
  
  // Draw particles
  slowTimeParticles.forEach(p => p.draw(ctx));
  
  // Draw time remaining indicator (optional - could be moved to UI)
  const remainingSeconds = (game.slowTimePower.remainingTime / 1000).toFixed(1);
  ctx.save();
  ctx.fillStyle = 'rgba(100, 150, 255, 0.8)';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(`⏱️ ${remainingSeconds}s`, game.width / 2, 10);
  ctx.restore();
}

// Get effective scroll speed (with slow time multiplier applied)
function getEffectiveScrollSpeed() {
  if (game.slowTimePower && game.slowTimePower.active) {
    return game.scrollSpeed * SLOW_TIME_SPEED_REDUCTION;
  }
  return game.scrollSpeed;
}

// Get effective enemy speed (with slow time multiplier applied)
function getEffectiveEnemySpeed() {
  if (game.slowTimePower && game.slowTimePower.active) {
    return game.enemySpeed * SLOW_TIME_SPEED_REDUCTION;
  }
  return game.enemySpeed;
}

// Get effective projectile speed multiplier (for enemy and boss projectiles)
function getEffectiveProjectileSpeedMultiplier() {
  if (game.slowTimePower && game.slowTimePower.active) {
    return SLOW_TIME_SPEED_REDUCTION; // 0.5 (50% reduction)
  }
  return 1.0; // No reduction
}

// Get effective fire rate multiplier (for enemies and bosses)
// Fire rate is in milliseconds, so we multiply by 2 to make it slower (longer delay = slower)
function getEffectiveFireRateMultiplier() {
  if (game.slowTimePower && game.slowTimePower.active) {
    return 2.0; // Double the fire rate delay (half the shooting speed)
  }
  return 1.0; // No change
}

// Get effective boss movement speed multiplier
function getEffectiveBossSpeedMultiplier() {
  if (game.slowTimePower && game.slowTimePower.active) {
    return SLOW_TIME_SPEED_REDUCTION; // 0.5 (50% reduction)
  }
  return 1.0; // No reduction
}

// Make functions globally accessible
if (typeof window !== 'undefined') {
  window.activateSlowTime = activateSlowTime;
  window.updateSlowTime = updateSlowTime;
  window.deactivateSlowTime = deactivateSlowTime;
  window.renderSlowTimeEffects = renderSlowTimeEffects;
  window.getEffectiveScrollSpeed = getEffectiveScrollSpeed;
  window.getEffectiveEnemySpeed = getEffectiveEnemySpeed;
  window.getEffectiveProjectileSpeedMultiplier = getEffectiveProjectileSpeedMultiplier;
  window.getEffectiveFireRateMultiplier = getEffectiveFireRateMultiplier;
  window.getEffectiveBossSpeedMultiplier = getEffectiveBossSpeedMultiplier;
}

