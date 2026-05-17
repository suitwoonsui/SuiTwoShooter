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

// Render tiles and enemies
function renderTiles(ctx) {
  // Don't render enemies during boss warning or boss battle
  const game = (typeof window !== 'undefined' && window.gameState) ? window.gameState : 
               (typeof window !== 'undefined' && window.game) ? window.game : null;
  
  if (game && (game.bossWarning || game.bossActive)) {
    // Skip enemy rendering during boss fights - only render collectibles if needed
    // (Tiles might still contain coins/power-ups, but enemies should not be visible)
    return;
  }
  
  // ALWAYS render enemies from enemies[] array - enemies are never in tile.obstacles anymore
  const enemiesArray = (typeof window !== 'undefined' && window.enemies) ? window.enemies : 
                       (typeof enemies !== 'undefined' ? enemies : []);
  
  // Optimized: Use for loop instead of forEach for better performance
  const enemiesLength = enemiesArray.length;
  for (let i = 0; i < enemiesLength; i++) {
    const enemy = enemiesArray[i];
    if (enemy.x > -100 && enemy.x < game.width + 100) {
      renderEnemy(ctx, enemy, enemy.x);
    }
  }
}
