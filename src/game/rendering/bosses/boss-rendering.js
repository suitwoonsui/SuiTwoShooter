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
      
      // Enrage meter (only when boss is vulnerable and not already enraged)
      if (game.boss.vulnerable && !game.boss.enraged && game.boss.enrageStart !== null) {
        const now = game.now();
        const enrageElapsed = now - game.boss.enrageStart;
        const enrageRemaining = Math.max(0, game.boss.enrageTime - enrageElapsed);
        const enragePercent = Math.min(enrageElapsed / game.boss.enrageTime, 1);
        const secondsRemaining = (enrageRemaining / 1000).toFixed(1);
        
        const enrageBarX = barX;
        const enrageBarY = barY - 25; // Position above health bar
        const enrageBarWidth = barWidth;
        const enrageBarHeight = 14;
        
        // Enrage bar background
        ctx.fillStyle = '#222';
        ctx.fillRect(enrageBarX, enrageBarY, enrageBarWidth, enrageBarHeight);
        
        // Enrage bar border
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(enrageBarX, enrageBarY, enrageBarWidth, enrageBarHeight);
        
        // Enrage progress bar (color changes as it fills)
        let enrageColor;
        if (enragePercent > 0.8) {
          enrageColor = '#FF0000'; // Red when close to enrage
        } else if (enragePercent > 0.5) {
          enrageColor = '#FF8800'; // Orange when halfway
        } else {
          enrageColor = '#FFAA00'; // Yellow when starting
        }
        
        ctx.fillStyle = enrageColor;
        ctx.fillRect(enrageBarX + 1, enrageBarY + 1, (enrageBarWidth - 2) * enragePercent, enrageBarHeight - 2);
        
        // Enrage timer text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`ENRAGE in ${secondsRemaining}s`, enrageBarX + enrageBarWidth / 2, enrageBarY + 11);
      } else if (game.boss.enraged) {
        // Show "ENRAGED" indicator when boss is enraged
        const enrageBarX = barX;
        const enrageBarY = barY - 25;
        const enrageBarWidth = barWidth;
        const enrageBarHeight = 14;
        
        // Pulsing red background
        const pulseAlpha = 0.7 + 0.3 * Math.sin(Date.now() * 0.015);
        ctx.fillStyle = `rgba(255, 0, 0, ${pulseAlpha})`;
        ctx.fillRect(enrageBarX, enrageBarY, enrageBarWidth, enrageBarHeight);
        
        // Border
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 2;
        ctx.strokeRect(enrageBarX, enrageBarY, enrageBarWidth, enrageBarHeight);
        
        // ENRAGED text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🔥 ENRAGED 🔥', enrageBarX + enrageBarWidth / 2, enrageBarY + 11);
      }
    }
  }
}
