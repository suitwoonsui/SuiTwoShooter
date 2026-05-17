// ==========================================
// ENEMY PROJECTILE RENDERING
// ==========================================

// Render enemy projectiles (spinning candles)
function renderEnemyProjectiles(ctx) {
  ctx.fillStyle = '#FF4444'; 
  ctx.strokeStyle = '#FF0000'; 
  ctx.lineWidth = 2;
  // Optimized: Use for loop instead of forEach for better performance
  const enemyProjectiles = game.enemyProjectiles;
  const enemyProjectilesLength = enemyProjectiles.length;
  for (let i = 0; i < enemyProjectilesLength; i++) {
    const b = enemyProjectiles[i];
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.spin);
    
    // Draw red candle image with proper aspect ratio
    if (enemyCandleImage.complete && enemyCandleImage.naturalWidth > 0) {
      const candleDims = getProjectileDimensions(enemyCandleImage, 6);
      ctx.drawImage(enemyCandleImage, -candleDims.width/2, -candleDims.height/2, candleDims.width, candleDims.height);
    } else {
      // Fallback to circle if image not loaded
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI*2);
      ctx.fill(); ctx.stroke();
    }
    
    ctx.restore();
  }
}
