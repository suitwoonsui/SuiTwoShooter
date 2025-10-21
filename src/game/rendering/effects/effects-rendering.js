// ==========================================
// EFFECTS RENDERING - PARTICLES AND VISUAL EFFECTS
// ==========================================

// Render particles
function renderParticles(ctx) {
  game.particles.forEach(p => p.draw(ctx));
}

// Render flash effect
function renderFlashEffect(ctx) {
  if (game.flashTime > 0) {
    ctx.fillStyle = `rgba(255, 255, 255, ${game.flashTime / 20})`;
    ctx.fillRect(0, 0, game.width, game.height);
    game.flashTime--;
  }
}

// Render charge effect
function renderChargeEffect(ctx) {
  if (game.chargeStart) {
    const ratio = Math.min((performance.now() - game.chargeStart) / game.maxChargeTime, 1);
    const chargeAlpha = ratio * 0.5;
    
    ctx.save();
    ctx.globalAlpha = chargeAlpha;
    ctx.fillStyle = '#00FFFF';
    ctx.beginPath();
    ctx.arc(player.x + player.width/2, player.y + player.height/2, 40 + ratio * 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
