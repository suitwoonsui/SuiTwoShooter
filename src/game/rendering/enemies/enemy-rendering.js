// ==========================================
// ENEMY AND TILE RENDERING
// ==========================================

// Render tiles and obstacles
function renderTiles(ctx) {
  tiles.forEach(tile => {
    // Only render tiles that are visible on screen
    if (tile.x > -100 && tile.x < game.width + 100) {
      // Obstacles (monsters)
      tile.obstacles.forEach(obs => {
      const ox = tile.x + ENEMY_X_OFFSET;
      const oy = obs.lane * game.laneHeight + (game.laneHeight - ENEMY_FALLBACK_HEIGHT) / 2;
      
      // Draw enemy image with proper aspect ratio
      const enemyImage = enemyImages[obs.type - 1];
      if (enemyImage && enemyImage.complete && enemyImage.naturalWidth > 0) {
        const enemyDims = getEnemyDimensions(enemyImage);
        const enemyX = ox + enemyDims.centerOffset;
        
        // Add red glow effect for Tier 2 and Tier 4 enemies (Market Maker and Shadow Hand)
        if (obs.type === 2 || obs.type === 4) {
          ctx.save();
          // Create red glow effect
          ctx.shadowColor = '#FF0000';
          ctx.shadowBlur = 15;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
          ctx.drawImage(enemyImage, enemyX, oy, enemyDims.width, enemyDims.height);
          ctx.restore();
        } else {
          ctx.drawImage(enemyImage, enemyX, oy, enemyDims.width, enemyDims.height);
        }
      } else {
        // Fallback rectangle
        ctx.fillStyle = '#FF4444';
        ctx.fillRect(ox, oy, 60, 60);
      }
      
      // Draw power-up indicator
      if (obs.power) {
        ctx.fillStyle = obs.power === 'freeze' ? '#00FFFF' : '#FFFF00';
        ctx.beginPath();
        ctx.arc(ox + 50, oy + 10, 8, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Draw health bar for damaged enemies
      if (obs.hp < obs.maxHp) {
        const barWidth = 50;
        const barHeight = 4;
        const barX = ox + 5;
        const barY = oy - 8;
        
        // Background
        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Health
        const healthPercent = obs.hp / obs.maxHp;
        ctx.fillStyle = healthPercent > 0.5 ? '#00FF00' : healthPercent > 0.25 ? '#FFFF00' : '#FF0000';
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
      }
    });
    }
  });
}
