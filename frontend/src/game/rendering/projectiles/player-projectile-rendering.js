// ==========================================
// PLAYER PROJECTILE RENDERING
// ==========================================

// Render player projectiles
function renderPlayerProjectiles(ctx) {
  // Optimized: Use for loop instead of forEach for better performance
  const projectiles = game.projectiles;
  const projectilesLength = projectiles.length;
  for (let i = 0; i < projectilesLength; i++) {
    const b = projectiles[i];
    // Apply visual effect if boss is active but not in position yet
    if (game.bossActive && game.boss && game.boss.x > game.boss.targetX) {
      // Projectiles are frozen - make them semi-transparent
      ctx.save();
      ctx.globalAlpha = 0.5;
    }
    
    // Draw trail first (behind the projectile)
    if (b.trail && b.trail.length > 1) {
      // Skip trail rendering for off-screen projectiles (performance optimization)
      const orbSize = (typeof getOldLevelEquivalent === 'function' ? getOldLevelEquivalent(b.level) : b.level) * 8 + 16;
      if (b.x >= -100 && b.x <= game.width + 100) {
        // Projectile is on-screen, render trail
        ctx.save();
        ctx.strokeStyle = b.trailColor;
        ctx.lineCap = 'butt'; // Flat ends instead of rounded
        
        // Use old level equivalent for size calculation (level 10 = old level 6 = 64px)
        const oldLevel = typeof getOldLevelEquivalent === 'function' ? getOldLevelEquivalent(b.level) : b.level;
        
        // Optimize: Reduce layers for lower-level projectiles (less visual impact, better performance)
        const maxLayers = b.level >= 5 ? 3 : (b.level >= 3 ? 2 : 1); // Level 1-2: 1 layer, 3-4: 2 layers, 5+: 3 layers
        
        // Draw trail segments with diminishing size and opacity (draw from newest to oldest)
        for (let i = b.trail.length - 2; i >= 0; i--) {
          const currentPoint = b.trail[i];
          const nextPoint = b.trail[i + 1];
          
          // Calculate diminishing properties (progress from old to new)
          const progress = (i + 1) / (b.trail.length - 1);
          const alpha = progress * 0.4; // Fade from 40% to 0% (newest point is 40%, oldest is 0%)
          const lineWidth = progress * Math.max(3, orbSize); // Diminish from full size to 0 (newest point is full, oldest is 0)
          
          // Draw multiple layers for flame-like effect (optimized: fewer layers for lower levels)
          for (let layer = 0; layer < maxLayers; layer++) {
            const layerAlpha = alpha * (1 - layer * 0.3); // Each layer is more transparent
            const layerWidth = lineWidth * (1 - layer * 0.2); // Each layer is slightly thinner
            const layerOffset = (layer - 1) * 2; // Offset layers slightly
            
            ctx.globalAlpha = layerAlpha;
            ctx.lineWidth = Math.max(1, layerWidth);
            
            ctx.beginPath();
            ctx.moveTo(currentPoint.x + layerOffset, currentPoint.y);
            ctx.lineTo(nextPoint.x + layerOffset, nextPoint.y);
            ctx.stroke();
          }
        }
        
        ctx.restore();
      }
      // If off-screen, skip trail rendering (saves significant performance with many projectiles)
    }
    
    // Draw the projectile itself
    // Use old level equivalent for size calculation (level 10 = old level 6 = 64px)
    const oldLevel = typeof getOldLevelEquivalent === 'function' ? getOldLevelEquivalent(b.level) : b.level;
    const orbSize=oldLevel*8+16, bx=b.x, by=b.y-orbSize/2; // Smaller but proportional orbs
    ctx.save();
    ctx.globalAlpha=0.7+0.3*(b.level/3);
    ctx.shadowColor='cyan'; ctx.shadowBlur=10+b.level*5;
    // Draw Blue Orb Shot image instead of rectangle
    if (blueOrbShotImage && blueOrbShotImage.complete && blueOrbShotImage.naturalWidth > 0) {
      ctx.drawImage(blueOrbShotImage, bx, by, orbSize, orbSize);
    }
    ctx.restore(); ctx.shadowBlur=0;
    
    // Restore alpha if it was modified for frozen effect
    if (game.bossActive && game.boss && game.boss.x > game.boss.targetX) {
      ctx.restore();
    }
  }
}
