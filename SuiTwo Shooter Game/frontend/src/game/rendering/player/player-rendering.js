// ==========================================
// PLAYER RENDERING
// ==========================================

// Render player glow and trail
function renderPlayerGlow(ctx) {
  let glowR=30;
  if (game.chargeStart) {
    const ratio=Math.min((performance.now()-game.chargeStart)/game.maxChargeTime,1);
    glowR+=ratio*20;
  }
  const pcx=player.x+player.width/2, pcy=player.y+player.height/2;
  const grad=ctx.createRadialGradient(pcx,pcy,0,pcx,pcy,glowR);
  grad.addColorStop(0,'rgba(57,255,20,0.9)');
  grad.addColorStop(1,'rgba(57,255,20,0)');
  ctx.fillStyle=grad;
  ctx.beginPath(); 
  ctx.arc(pcx,pcy,glowR,0,Math.PI*2); 
  ctx.fill();
  
  // Trailing glow effect
  if (player.trail.length > 1) {
    player.trail.forEach((pt, i) => {
      const trailProgress = i / (player.trail.length - 1);
      const trailGlowR = glowR * (0.3 + trailProgress * 0.7); // Size from 30% to 100% of main glow
      const trailAlpha = (0.1 + trailProgress * 0.4); // Alpha from 10% to 50%
      
      const trailGrad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, trailGlowR);
      trailGrad.addColorStop(0, `rgba(57,255,20,${trailAlpha})`);
      trailGrad.addColorStop(1, `rgba(57,255,20,0)`);
      
      ctx.fillStyle = trailGrad;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, trailGlowR, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}

// Render player character
function renderPlayer(ctx) {
  // Apply invulnerability effect
  if (game.invulnerabilityTime > 0) {
    // Flashing effect during invulnerability
    // Use performance.now() for better performance and precision
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const flashAlpha = 0.3 + 0.4 * Math.sin(now * 0.02); // Fast flashing
    ctx.save();
    ctx.globalAlpha = flashAlpha;
  }
  
  // Calculate dynamic player dimensions based on image aspect ratio
  const playerDims = getPlayerDimensions(characterImage, player.width, player.height);
  const playerX = player.x + playerDims.centerOffset;
  
  ctx.drawImage(characterImage, playerX, player.y, playerDims.width, playerDims.height);
  
  // Restore alpha if invulnerability effect was applied
  if (game.invulnerabilityTime > 0) {
    ctx.restore();
  }
}

// Import the shared force field rendering function
// This ensures we use the same rendering logic as previews
// The function is loaded with menu scripts, so it's available early
let renderForceFieldAt;
if (typeof window !== 'undefined' && window.renderForceFieldAt) {
  renderForceFieldAt = window.renderForceFieldAt;
} else {
  // Fallback: if not loaded yet, try to load it
  // This shouldn't happen in normal flow since force-field-rendering.js loads with menu scripts
  console.warn('[PLAYER RENDERING] renderForceFieldAt not available, force field may not render');
}

// Render force field around player (in-game)
function renderForceField(ctx) {
  if (game.forceField.active && game.forceField.level > 0) {
    const pcx = player.x + player.width/2;
    const pcy = player.y + player.height/2;
    if (renderForceFieldAt) {
      renderForceFieldAt(ctx, pcx, pcy, game.forceField.level);
    }
  }
}
