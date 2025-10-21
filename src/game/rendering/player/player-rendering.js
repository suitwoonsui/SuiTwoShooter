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
    const flashAlpha = 0.3 + 0.4 * Math.sin(Date.now() * 0.02); // Fast flashing
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

// Render force field around player
function renderForceField(ctx) {
  if (game.forceField.active && game.forceField.level > 0) {
    ctx.save();
    
    // Force field properties based on level
    const fieldRadius = 50 + (game.forceField.level * 15); // Level 1: 65px, Level 2: 80px
    const fieldColor = game.forceField.level === 1 ? '#4DA2FF' : '#39ff14'; // Sui blue for level 1, Highlighter green for level 2
    const fieldAlpha = 0.3 + (game.forceField.level * 0.1); // Level 1: 0.4, Level 2: 0.5
    
    // Animated pulsing effect
    const pulseScale = 1 + 0.1 * Math.sin(Date.now() * 0.01);
    const pulseRadius = fieldRadius * pulseScale;
    
    const pcx = player.x + player.width/2;
    const pcy = player.y + player.height/2;
    
    // Create gradient for force field
    const fieldGrad = ctx.createRadialGradient(pcx, pcy, 0, pcx, pcy, pulseRadius);
    fieldGrad.addColorStop(0, `rgba(255,255,255,${fieldAlpha * 0.5})`);
    fieldGrad.addColorStop(0.7, fieldColor + Math.floor(fieldAlpha * 255).toString(16).padStart(2, '0'));
    fieldGrad.addColorStop(1, 'rgba(255,255,255,0)');
    
    // Draw force field circle
    ctx.fillStyle = fieldGrad;
    ctx.beginPath();
    ctx.arc(pcx, pcy, pulseRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw force field outline
    ctx.strokeStyle = fieldColor;
    ctx.lineWidth = 2;
    ctx.globalAlpha = fieldAlpha;
    ctx.beginPath();
    ctx.arc(pcx, pcy, pulseRadius, 0, Math.PI * 2);
    ctx.stroke();
    
    // Add sparkle effects for level 2
    if (game.forceField.level === 2) {
      ctx.globalAlpha = 0.6;
      for (let i = 0; i < 8; i++) {
        const angle = (Date.now() * 0.002 + i * Math.PI / 4) % (Math.PI * 2);
        const sparkleX = pcx + Math.cos(angle) * (pulseRadius * 0.8);
        const sparkleY = pcy + Math.sin(angle) * (pulseRadius * 0.8);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(sparkleX, sparkleY, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    ctx.restore();
  }
}
