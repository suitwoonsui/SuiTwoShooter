// ==========================================
// EFFECTS SYSTEM - PARTICLE CREATION AND MANAGEMENT
// ==========================================

// Create particle effects for various game events
function createParticleEffect(x, y, color, count = 10) {
  for (let i = 0; i < count; i++) {
    game.particles.push(new Particle(x, y, color));
  }
}

// Create explosion effect (enemy destroyed)
function createExplosionEffect(x, y) {
  createParticleEffect(x, y, '#FF4500', 10);
}

// Create force field hit effect
function createForceFieldHitEffect(x, y) {
  createParticleEffect(x, y, '#FF6B35', 15);
}

// Create coin collection effect
function createCoinCollectionEffect(x, y) {
  createParticleEffect(x, y, '#FFD700', 30);
}

// Create power-up collection effect
function createPowerUpEffect(x, y, isBonus = true) {
  const color = isBonus ? '#39ff14' : '#FF0000';
  createParticleEffect(x, y, color, 12);
}

// Create player hit effect
function createPlayerHitEffect(x, y) {
  createParticleEffect(x, y, '#00FFFF', 20);
}

// Create boss hit effect
function createBossHitEffect(x, y) {
  createParticleEffect(x, y, '#FF4500', 15);
}

// Create projectile hit effect
function createProjectileHitEffect(x, y) {
  createParticleEffect(x, y, '#FFA500', 5);
}

// Create charge effect
function createChargeEffect(x, y) {
  game.particles.push(new Particle(
    x + (Math.random() - 0.5) * 20,
    y + (Math.random() - 0.5) * 20,
    '#39ff14'
  ));
}

// Create trail effect
function createTrailEffect(x, y) {
  game.particles.push(new Particle(
    x + (Math.random() - 0.5) * 10,
    y + (Math.random() - 0.5) * 10,
    '#39ff14'
  ));
}
