// ==========================================
// ENEMY AND TILE RENDERING
// ==========================================

// Helper function to render a single enemy
function renderEnemy(ctx, enemy, enemyX) {
  const oy = enemy.lane * game.laneHeight + (game.laneHeight - ENEMY_FALLBACK_HEIGHT) / 2;
  
  // Draw enemy image with proper aspect ratio
  const enemyImage = enemyImages[enemy.type - 1];
  if (enemyImage && enemyImage.complete && enemyImage.naturalWidth > 0) {
    const enemyDims = getEnemyDimensions(enemyImage);
    const drawX = enemyX + enemyDims.centerOffset;
    
    // Add red glow effect for Tier 2 and Tier 4 enemies (Market Maker and Shadow Hand)
    if (enemy.type === 2 || enemy.type === 4) {
      ctx.save();
      // Create red glow effect
      ctx.shadowColor = '#FF0000';
      ctx.shadowBlur = 15;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.drawImage(enemyImage, drawX, oy, enemyDims.width, enemyDims.height);
      ctx.restore();
    } else {
      ctx.drawImage(enemyImage, drawX, oy, enemyDims.width, enemyDims.height);
    }
  } else {
    // Fallback rectangle
    ctx.fillStyle = '#FF4444';
    ctx.fillRect(enemyX, oy, 60, 60);
  }
  
  // Draw power-up indicator
  if (enemy.power) {
    ctx.fillStyle = enemy.power === 'freeze' ? '#00FFFF' : '#FFFF00';
    ctx.beginPath();
    ctx.arc(enemyX + 50, oy + 10, 8, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Draw health bar for damaged enemies
  if (enemy.hp < enemy.maxHp) {
    const barWidth = 50;
    const barHeight = 4;
    const barX = enemyX + 5;
    const barY = oy - 8;
    
    // Background
    ctx.fillStyle = '#333';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // Health
    const healthPercent = enemy.hp / enemy.maxHp;
    ctx.fillStyle = healthPercent > 0.5 ? '#00FF00' : healthPercent > 0.25 ? '#FFFF00' : '#FF0000';
    ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
  }
}

// Render tiles and obstacles
function renderTiles(ctx) {
  tiles.forEach(tile => {
    // Only render tiles that are visible on screen
    if (tile.x > -100 && tile.x < game.width + 100) {
      // Obstacles (monsters) - only render if before tier 4
      if (typeof shouldUseSeparateEnemies === 'function' && !shouldUseSeparateEnemies()) {
        tile.obstacles.forEach(obs => {
          const ox = tile.x + ENEMY_X_OFFSET;
          renderEnemy(ctx, obs, ox);
        });
      }
    }
  });
  
  // Render separate enemies (after tier 4)
  if (typeof shouldUseSeparateEnemies === 'function' && shouldUseSeparateEnemies() && typeof enemies !== 'undefined') {
    enemies.forEach(enemy => {
      if (enemy.x > -100 && enemy.x < game.width + 100) {
        renderEnemy(ctx, enemy, enemy.x);
      }
    });
  }
}
