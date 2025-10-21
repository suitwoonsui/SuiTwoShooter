// ==========================================
// COLLISION DETECTION - ALL COLLISION LOGIC
// ==========================================

// Check collision between player and obstacles (enemies)
function checkObstacleCollision() {
  // Don't check collision if player is invulnerable
  if (game.invulnerabilityTime > 0) {
    return false;
  }
  
  // Use refined collision box for player (same as enemy projectile collision)
  const bodyWidth = player.width * 0.4;  // 40% of sprite width (hands extend far out)
  const bodyHeight = player.height * 0.65; // 65% of sprite height (feet and tails extend down)
  const bodyX = player.x + (player.width - bodyWidth) / 2;
  const bodyY = player.y + (player.height - bodyHeight) / 2;
  
  for (let tile of tiles) {
    if (tile.x > bodyX-50 && tile.x < bodyX+bodyWidth+50) {
      for (let i=0;i<tile.obstacles.length;i++) {
        const obs = tile.obstacles[i];
        const ox = tile.x + 20;
        const oy = obs.lane*game.laneHeight + (game.laneHeight-60)/2;
        
        // Calculate dynamic enemy dimensions (same as rendering)
        const enemyImage = enemyImages[obs.type - 1];
        const enemyDims = getEnemyDimensions(enemyImage);
        const enemyX = ox + enemyDims.centerOffset;
        const enemyY = oy;
        
        // Check collision between player body and enemy
        if (bodyX < enemyX + enemyDims.width && bodyX + bodyWidth > enemyX &&
            bodyY < enemyY + enemyDims.height && bodyY + bodyHeight > enemyY) {
          
          // If force field is active, it blocks the enemy collision
          if (game.forceField.active && game.forceField.level > 0 && game.forceField.invulnerabilityTime <= 0) {
            console.log('Force field blocked enemy collision! Level:', game.forceField.level);
            tile.obstacles.splice(i,1);
            
            // Force field takes damage and loses a level
            game.forceField.level--;
            game.forceField.invulnerabilityTime = 60; // 1 second of invulnerability
            if (game.forceField.level <= 0) {
              game.forceField.active = false;
              game.forceField.level = 0;
              console.log('Force field destroyed by enemy!');
              // Play force field destroyed sound
              if (typeof playForceFieldDestroyedSound === 'function') {
                playForceFieldDestroyedSound();
              }
              // Give player invulnerability when force field is destroyed
              game.invulnerabilityTime = 60; // 1 second of invulnerability
            } else {
              console.log('Force field damaged by enemy! New level:', game.forceField.level);
              // Play force field power down sound
              if (typeof playForceFieldPowerDownSound === 'function') {
                playForceFieldPowerDownSound();
              }
            }
            
            // Reset coin streak when force field is hit
            resetCoinStreak();
            
            // Visual effect for force field hit
            createForceFieldHitEffect(enemyX + enemyDims.width/2, enemyY + enemyDims.height/2);
            
            // Flash effect (lighter than direct hit)
            game.flashTime = 10;
            
            return false; // Player not hit, force field absorbed the damage
          } else {
            console.log('No force field protection! Player hit by enemy');
            game.flashTime = 20;
            game.invulnerabilityTime = 60; // 1 second of invulnerability (60 frames at 60fps)
            // Play player hit sound
            if (typeof playPlayerHitSound === 'function') {
              playPlayerHitSound();
            }
            tile.obstacles.splice(i,1);
            
            // Reset coin streak when player hits enemy
            resetCoinStreak();
            
            return true;
          }
        }
      }
    }
  }
  return false;
}

// Check collision between player and enemy projectiles
function checkEnemyProjectileCollision() {
  // Don't check collision if player is invulnerable
  if (game.invulnerabilityTime > 0) {
    return false;
  }
  
  const cx = player.x + player.width/2, cy = player.y + player.height/2;
  for (let i=game.enemyProjectiles.length-1;i>=0;i--) {
    const b = game.enemyProjectiles[i];
    // Collision box for just the character's main body (excluding extended hands, feet, and tails)
    const bodyWidth = player.width * 0.4;  // 40% of sprite width (hands extend far out)
    const bodyHeight = player.height * 0.65; // 65% of sprite height (feet and tails extend down)
    const bodyX = player.x + (player.width - bodyWidth) / 2;
    const bodyY = player.y + (player.height - bodyHeight) / 2;
    
    // Check if projectile hits player area
    if (b.x > bodyX && b.x < bodyX + bodyWidth &&
        b.y > bodyY && b.y < bodyY + bodyHeight) {
      
      // If force field is active, it blocks the projectile
      if (game.forceField.active && game.forceField.level > 0 && game.forceField.invulnerabilityTime <= 0) {
        console.log('Force field blocked projectile! Level:', game.forceField.level);
        game.enemyProjectiles.splice(i,1);
        
        // Force field takes damage and loses a level
        game.forceField.level--;
        game.forceField.invulnerabilityTime = 60; // 1 second of invulnerability
        if (game.forceField.level <= 0) {
          game.forceField.active = false;
          game.forceField.level = 0;
          console.log('Force field destroyed!');
          // Play force field destroyed sound
          if (typeof playForceFieldDestroyedSound === 'function') {
            playForceFieldDestroyedSound();
          }
          // Give player invulnerability when force field is destroyed
          game.invulnerabilityTime = 60; // 1 second of invulnerability
        } else {
          console.log('Force field damaged! New level:', game.forceField.level);
          // Play force field power down sound
          if (typeof playForceFieldPowerDownSound === 'function') {
            playForceFieldPowerDownSound();
          }
        }
        
        // Reset coin streak when force field is hit
        game.forceField.coinStreak = 0;
        
        // Visual effect for force field hit
        createForceFieldHitEffect(b.x, b.y);
        
        // Flash effect (lighter than direct hit)
        game.flashTime = 10;
        
        return false; // Player not hit, force field absorbed the damage
      } else {
        console.log('No force field protection! Player hit by projectile');
        // No force field, player takes damage
        game.enemyProjectiles.splice(i,1);
        game.flashTime = 20;
        game.invulnerabilityTime = 60; // 1 second of invulnerability (60 frames at 60fps)
        // Play player hit sound
        if (typeof playPlayerHitSound === 'function') {
          playPlayerHitSound();
        }
        
        // Reset coin streak when player is hit
        game.forceField.coinStreak = 0;
        
        return true;
      }
    }
  }
  return false;
}

// Check collision between player and coins
function checkCoinCollection() {
  // Use refined collision box for player (same as enemy projectile collision)
  const bodyWidth = player.width * 0.4;  // 40% of sprite width (hands extend far out)
  const bodyHeight = player.height * 0.65; // 65% of sprite height (feet and tails extend down)
  const bodyX = player.x + (player.width - bodyWidth) / 2;
  const bodyY = player.y + (player.height - bodyHeight) / 2;
  
  tiles.forEach(tile => {
    if (tile.coinLane!==null && tile.x > bodyX-50 && tile.x < bodyX+bodyWidth+50) {
      const coinX = tile.x + COLLECTIBLE_X_OFFSET;
      const coinY = tile.coinLane*game.laneHeight + (game.laneHeight-COLLECTIBLE_FALLBACK_HEIGHT)/2;
      const coinDims = getCollectibleDimensions(collectibleImage);
      const coinXAdj = coinX + coinDims.centerOffset;
      
      // Check actual collision between player body and coin (using dynamic width)
      if (bodyX < coinXAdj + coinDims.width && bodyX + bodyWidth > coinXAdj &&
          bodyY < coinY + coinDims.height && bodyY + bodyHeight > coinY) {
        // Delegate to collectibles system for behavior
        collectCoin(tile);
      }
    }
  });
}

// Check collision between player and powerups
function checkPowerupCollection() {
  // Use refined collision box for player (same as enemy projectile collision)
  const bodyWidth = player.width * 0.4;  // 40% of sprite width (hands extend far out)
  const bodyHeight = player.height * 0.65; // 65% of sprite height (feet and tails extend down)
  const bodyX = player.x + (player.width - bodyWidth) / 2;
  const bodyY = player.y + (player.height - bodyHeight) / 2;
  
  tiles.forEach(tile => {
    // Check bonus power-up
    if (tile.powerupBonus && tile.x > bodyX-50 && tile.x < bodyX+bodyWidth+50) {
      const px = tile.x + COLLECTIBLE_X_OFFSET;
      const py = tile.powerupBonus.lane*game.laneHeight + (game.laneHeight-COLLECTIBLE_FALLBACK_HEIGHT)/2;
      const powerupDims = getCollectibleDimensions(powerupBonusImage);
      const pxAdj = px + powerupDims.centerOffset;
      if (bodyX < pxAdj + powerupDims.width && bodyX + bodyWidth > pxAdj && bodyY < py + powerupDims.height && bodyY + bodyHeight > py) {
        // Delegate to collectibles system for behavior
        collectPowerup(tile, true);
      }
    }

    // Check power-down (malus)
    if (tile.powerdown && tile.x > bodyX-50 && tile.x < bodyX+bodyWidth+50) {
      const px = tile.x + COLLECTIBLE_X_OFFSET;
      const py = tile.powerdown.lane*game.laneHeight + (game.laneHeight-COLLECTIBLE_FALLBACK_HEIGHT)/2;
      const powerdownDims = getCollectibleDimensions(powerupMalusImage);
      const pxAdj = px + powerdownDims.centerOffset;
      if (bodyX < pxAdj + powerdownDims.width && bodyX + bodyWidth > pxAdj && bodyY < py + powerdownDims.height && bodyY + bodyHeight > py) {
        // Delegate to collectibles system for behavior
        collectPowerup(tile, false);
      }
    }
  });
}
