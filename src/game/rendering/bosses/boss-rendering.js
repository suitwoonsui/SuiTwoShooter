// ==========================================
// BOSS RENDERING
// ==========================================

// Render boss
function renderBoss(ctx) {
  if (game.bossActive && game.boss) {
    // Use boss image from array or fallback
    const imageToUse = bossImage || bossImages[game.boss.type - 1] || enemyImages[0];
    
    // Calculate dynamic dimensions based on image aspect ratio
    const bossDims = getBossDimensions(imageToUse, game.boss.width, game.boss.height);
    const bossX = game.boss.x + bossDims.centerOffset;
    const bossY = game.boss.y;
    
    // Apply visual effect if boss isn't in position yet
    if (game.boss.x > game.boss.targetX) {
      // Boss is still moving into position - make it semi-transparent
      ctx.save();
      ctx.globalAlpha = 0.6;
    }
    
    if (imageToUse && imageToUse.complete && imageToUse.naturalWidth > 0) {
      // Add red glow effect for Tier 2 and Tier 4 bosses (Boss_Market_Maker and Boss_Shadow_Figure)
      if (game.boss.tier === 2 || game.boss.tier === 4) {
        ctx.save();
        // Create red glow effect
        ctx.shadowColor = '#FF0000';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.drawImage(imageToUse, bossX, bossY, bossDims.width, bossDims.height);
        ctx.restore();
      } else {
        ctx.drawImage(imageToUse, bossX, bossY, bossDims.width, bossDims.height);
      }
    } else {
      // Fallback rectangle
      ctx.fillStyle = '#FF0000';
      ctx.fillRect(bossX, bossY, bossDims.width, bossDims.height);
    }
    
    // Restore alpha if it was modified
    if (game.boss.x > game.boss.targetX) {
      ctx.restore();
    }
    
    // Draw boss health bar (only when boss is in position)
    if (game.boss.x <= game.boss.targetX) {
      const barWidth = 180;
      const barHeight = 20;
      const barX = bossX + 10;
      const barY = bossY - 30;
      
      // Background
      ctx.fillStyle = '#333';
      ctx.fillRect(barX, barY, barWidth, barHeight);
      
      // Health
      const healthPercent = game.boss.hp / game.boss.maxHp;
      ctx.fillStyle = healthPercent > 0.5 ? '#00FF00' : healthPercent > 0.25 ? '#FFFF00' : '#FF0000';
      ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
      
      // Health text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.ceil(game.boss.hp)}/${game.boss.maxHp}`, barX + barWidth / 2, barY + 15);
    }
  }
}
