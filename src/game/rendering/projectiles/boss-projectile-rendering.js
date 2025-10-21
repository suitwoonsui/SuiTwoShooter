// ==========================================
// BOSS PROJECTILE RENDERING
// ==========================================

// Render boss projectiles (directional arrows)
function renderBossProjectiles(ctx) {
  ctx.fillStyle = '#FF4444'; 
  ctx.strokeStyle = '#FF0000'; 
  ctx.lineWidth = 2;
  game.bossProjectiles.forEach(b => {
    ctx.save();
    ctx.translate(b.x, b.y);
    
    // Boss projectile - use directional arrow
    const angle = Math.atan2(b.vy, b.vx) + Math.PI; // Add 180 degrees to flip arrow direction
    ctx.rotate(angle);
    
    // Draw boss arrow image with proper aspect ratio
    if (bossArrowImage.complete && bossArrowImage.naturalWidth > 0) {
      const arrowDims = getProjectileDimensions(bossArrowImage, 30);
      ctx.drawImage(bossArrowImage, -arrowDims.width/2, -arrowDims.height/2, arrowDims.width, arrowDims.height);
    } else {
      // Fallback to circle if image not loaded
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI*2);
      ctx.fill(); ctx.stroke();
    }
    
    ctx.restore();
  });
}