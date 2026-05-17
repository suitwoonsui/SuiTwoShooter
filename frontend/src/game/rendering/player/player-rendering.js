// ==========================================
// PLAYER RENDERING
// ==========================================

// Render player glow and trail
function renderPlayerGlow(ctx) {
  const g = (typeof game !== 'undefined' ? game : (typeof window !== 'undefined' ? window.game : null));
  const p = (typeof player !== 'undefined' ? player : (typeof window !== 'undefined' ? window.player : null));
  if (!g || !p) return;
  let glowR = 30;
  if (g.chargeStart) {
    const ratio = Math.min((performance.now() - g.chargeStart) / (g.maxChargeTime || 1000), 1);
    glowR += ratio * 20;
  }
  const pcx = p.x + p.width / 2, pcy = p.y + p.height / 2;
  const grad = ctx.createRadialGradient(pcx, pcy, 0, pcx, pcy, glowR);
  grad.addColorStop(0, 'rgba(57,255,20,0.9)');
  grad.addColorStop(1, 'rgba(57,255,20,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(pcx, pcy, glowR, 0, Math.PI * 2);
  ctx.fill();
  if (!p.trail || p.trail.length <= 1) return;
  p.trail.forEach((pt, i) => {
    const trailProgress = i / (p.trail.length - 1);
    const trailGlowR = glowR * (0.3 + trailProgress * 0.7);
    const trailAlpha = (0.1 + trailProgress * 0.4);
    const trailGrad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, trailGlowR);
    trailGrad.addColorStop(0, `rgba(57,255,20,${trailAlpha})`);
    trailGrad.addColorStop(1, 'rgba(57,255,20,0)');
    ctx.fillStyle = trailGrad;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, trailGlowR, 0, Math.PI * 2);
    ctx.fill();
  });
}

// Render player character
function renderPlayer(ctx) {
  const g = (typeof game !== 'undefined' ? game : (typeof window !== 'undefined' ? window.game : null));
  const p = (typeof player !== 'undefined' ? player : (typeof window !== 'undefined' ? window.player : null));
  if (!g || !p) return;
  // Use preloader image if available (it's loaded after registerGameImages/waitForGameImages),
  // otherwise fall back to module-level characterImage (set when player-images.js ran)
  const img = (typeof window.getGameImage === 'function' && window.getGameImage('player')) || (typeof characterImage !== 'undefined' ? characterImage : null);
  if (!img || !img.complete || !img.naturalWidth) {
    return; // Don't draw until image is ready
  }
  const getDims = typeof getPlayerDimensions === 'function' ? getPlayerDimensions : (typeof window.getPlayerDimensions === 'function' ? window.getPlayerDimensions : null);
  if (!getDims) return;

  // Apply invulnerability effect
  if (g.invulnerabilityTime > 0) {
    // Flashing effect during invulnerability
    // Use performance.now() for better performance and precision
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const flashAlpha = 0.3 + 0.4 * Math.sin(now * 0.02); // Fast flashing
    ctx.save();
    ctx.globalAlpha = flashAlpha;
  }
  
  // Calculate dynamic player dimensions based on image aspect ratio
  const playerDims = getDims(img, p.width, p.height);
  const playerX = p.x + playerDims.centerOffset;
  
  ctx.drawImage(img, playerX, p.y, playerDims.width, playerDims.height);
  
  // Restore alpha if invulnerability effect was applied
  if (g.invulnerabilityTime > 0) {
    ctx.restore();
  }
}

// Render force field around player (in-game)
// Resolve renderForceFieldAt from window each time so script is safe if loaded twice
function renderForceField(ctx) {
  const g = (typeof game !== 'undefined' ? game : (typeof window !== 'undefined' ? window.game : null));
  const p = (typeof player !== 'undefined' ? player : (typeof window !== 'undefined' ? window.player : null));
  if (!g || !p || !g.forceField || !g.forceField.active || g.forceField.level <= 0) return;
  const renderForceFieldAt = (typeof window !== 'undefined' && window.renderForceFieldAt) ? window.renderForceFieldAt : null;
  if (!renderForceFieldAt) return;
  const pcx = p.x + p.width / 2, pcy = p.y + p.height / 2;
  renderForceFieldAt(ctx, pcx, pcy, g.forceField.level);
}

// Expose on window so main-rendering.js can call them regardless of script load order
if (typeof window !== 'undefined') {
  window.renderPlayerGlow = renderPlayerGlow;
  window.renderForceField = renderForceField;
  window.renderPlayer = renderPlayer;
}
