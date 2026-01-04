// ==========================================
// COLLISION DETECTION - ALL COLLISION LOGIC
// ==========================================

// Helper function to check collision with a single enemy
function checkEnemyCollisionWithPlayer(enemy, enemyX, enemyArray, enemyIndex) {
  // Don't check collision if player is invulnerable (protects against multiple hits in same frame)
  if (game.invulnerabilityTime > 0) {
    return false;
  }
  
  const bodyWidth = player.width * 0.4;
  const bodyHeight = player.height * 0.65;
  const bodyX = player.x + (player.width - bodyWidth) / 2;
  const bodyY = player.y + (player.height - bodyHeight) / 2;
  
  const oy = enemy.lane * game.laneHeight + (game.laneHeight - 60) / 2;
  
  // Calculate dynamic enemy dimensions (same as rendering)
  const enemyImage = enemyImages[enemy.type - 1];
  const enemyDims = getEnemyDimensions(enemyImage);
  const drawX = enemyX + enemyDims.centerOffset;
  const enemyY = oy;
  
  // Check collision between player body and enemy
  if (bodyX < drawX + enemyDims.width && bodyX + bodyWidth > drawX &&
      bodyY < enemyY + enemyDims.height && bodyY + bodyHeight > enemyY) {
    
    // If force field is active, it blocks the enemy collision
    if (game.forceField.active && game.forceField.level > 0 && game.forceField.invulnerabilityTime <= 0) {
      console.log('Force field blocked enemy collision! Level:', game.forceField.level);
      enemyArray.splice(enemyIndex, 1);
      
      // Force field takes damage and loses a level
      game.forceField.level--;
      game.forceField.invulnerabilityTime = 60; // 1 second of invulnerability
      // Give player invulnerability immediately to protect against other enemies/projectiles in same frame
      game.invulnerabilityTime = 60; // 1 second of invulnerability
      if (game.forceField.level <= 0) {
        game.forceField.active = false;
        game.forceField.level = 0;
        console.log('Force field destroyed by enemy!');
        // Play force field destroyed sound
        if (typeof playForceFieldDestroyedSound === 'function') {
          playForceFieldDestroyedSound();
        }
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
      createForceFieldHitEffect(drawX + enemyDims.width/2, enemyY + enemyDims.height/2);
      
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
      enemyArray.splice(enemyIndex, 1);
      
      // Reset coin streak when player hits enemy
      resetCoinStreak();
      
      return true; // Player hit
    }
  }
  return false; // No collision
}

// Check collision between player and obstacles (enemies)
function checkObstacleCollision() {
  // Don't check collision if player is invulnerable
  if (game.invulnerabilityTime > 0) {
    return false;
  }
  
  // ALWAYS check enemies[] array - enemies are never in tile.obstacles anymore
  const enemiesArray = (typeof window !== 'undefined' && window.enemies) ? window.enemies : 
                       (typeof enemies !== 'undefined' ? enemies : []);
  
  for (let i = enemiesArray.length - 1; i >= 0; i--) {
    const enemy = enemiesArray[i];
    const result = checkEnemyCollisionWithPlayer(enemy, enemy.x, enemiesArray, i);
    // Only return true if player was actually hit (not blocked by forcefield)
    if (result === true) {
      return true; // Player hit
    }
    // If result is false, forcefield blocked it - continue checking other enemies
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
        // Give player invulnerability immediately to protect against other projectiles in same frame
        game.invulnerabilityTime = 60; // 1 second of invulnerability
        if (game.forceField.level <= 0) {
          game.forceField.active = false;
          game.forceField.level = 0;
          console.log('Force field destroyed!');
          // Play force field destroyed sound
          if (typeof playForceFieldDestroyedSound === 'function') {
            playForceFieldDestroyedSound();
          }
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
  
  // OPTIMIZATION: Create Map lookup for pulled coins ONCE (not per tile)
  const pulledCoinsMap = new Map();
  if (typeof window.pulledCoins !== 'undefined' && game.coinTractorBeam && game.coinTractorBeam.active) {
    const pulledCoins = window.pulledCoins;
    const pulledCoinsLength = pulledCoins.length;
    for (let i = 0; i < pulledCoinsLength; i++) {
      const pulled = pulledCoins[i];
      pulledCoinsMap.set(pulled.tile, pulled);
    }
  }
  
  // OPTIMIZATION: Cache coin dimensions (same for all coins)
  const coinDims = getCollectibleDimensions(collectibleImage);
  
  // OPTIMIZATION: Use for loop instead of forEach for better performance
  const tilesLength = tiles.length;
  for (let i = 0; i < tilesLength; i++) {
    const tile = tiles[i];
    if (tile.coinLane!==null && tile.x > bodyX-50 && tile.x < bodyX+bodyWidth+50) {
      // Check if coin is being pulled by tractor beam (using Map lookup - O(1))
      let offsetX = 0;
      let offsetY = 0;
      const pulled = pulledCoinsMap.get(tile);
      if (pulled) {
        offsetX = pulled.offsetX;
        offsetY = pulled.offsetY;
      }
      
      const coinX = tile.x + COLLECTIBLE_X_OFFSET + offsetX;
      const coinY = tile.coinLane*game.laneHeight + (game.laneHeight-COLLECTIBLE_FALLBACK_HEIGHT)/2 + offsetY;
      const coinXAdj = coinX + coinDims.centerOffset;
      
      // Check actual collision between player body and coin (using dynamic width)
      if (bodyX < coinXAdj + coinDims.width && bodyX + bodyWidth > coinXAdj &&
          bodyY < coinY + coinDims.height && bodyY + bodyHeight > coinY) {
        // Delegate to collectibles system for behavior
        collectCoin(tile);
      }
    }
  }
}

// Check collision between player and powerups
function checkPowerupCollection() {
  // Use refined collision box for player (same as enemy projectile collision)
  const bodyWidth = player.width * 0.4;  // 40% of sprite width (hands extend far out)
  const bodyHeight = player.height * 0.65; // 65% of sprite height (feet and tails extend down)
  const bodyX = player.x + (player.width - bodyWidth) / 2;
  const bodyY = player.y + (player.height - bodyHeight) / 2;
  
  // OPTIMIZATION: Create Map lookup for pulled powerups ONCE (not per tile)
  const pulledPowerupsMap = new Map();
  if (typeof window.pulledPowerups !== 'undefined' && game.coinTractorBeam && game.coinTractorBeam.active && game.coinTractorBeam.level >= 3) {
    const pulledPowerups = window.pulledPowerups;
    const pulledPowerupsLength = pulledPowerups.length;
    for (let i = 0; i < pulledPowerupsLength; i++) {
      const pulled = pulledPowerups[i];
      if (pulled.isBonus) {
        pulledPowerupsMap.set(pulled.tile, pulled);
      }
    }
  }
  
  // OPTIMIZATION: Cache powerup dimensions (same for all powerups of same type)
  const powerupBonusDims = getCollectibleDimensions(powerupBonusImage);
  const powerupMalusDims = getCollectibleDimensions(powerupMalusImage);
  
  // OPTIMIZATION: Use for loop instead of forEach for better performance
  const tilesLength = tiles.length;
  for (let i = 0; i < tilesLength; i++) {
    const tile = tiles[i];
    // Check bonus power-up
    if (tile.powerupBonus && tile.x > bodyX-50 && tile.x < bodyX+bodyWidth+50) {
      // Check if power-up is being pulled by tractor beam (using Map lookup - O(1))
      let offsetX = 0;
      let offsetY = 0;
      const pulled = pulledPowerupsMap.get(tile);
      if (pulled) {
        offsetX = pulled.offsetX;
        offsetY = pulled.offsetY;
      }
      
      const px = tile.x + COLLECTIBLE_X_OFFSET + offsetX;
      const py = tile.powerupBonus.lane*game.laneHeight + (game.laneHeight-COLLECTIBLE_FALLBACK_HEIGHT)/2 + offsetY;
      const pxAdj = px + powerupBonusDims.centerOffset;
      if (bodyX < pxAdj + powerupBonusDims.width && bodyX + bodyWidth > pxAdj && bodyY < py + powerupBonusDims.height && bodyY + bodyHeight > py) {
        // Delegate to collectibles system for behavior
        collectPowerup(tile, true);
      }
    }

    // Check power-down (malus)
    if (tile.powerdown && tile.x > bodyX-50 && tile.x < bodyX+bodyWidth+50) {
      // Note: Power-downs are NOT pulled by tractor beam (only bonus power-ups at Level 3)
      const px = tile.x + COLLECTIBLE_X_OFFSET;
      const py = tile.powerdown.lane*game.laneHeight + (game.laneHeight-COLLECTIBLE_FALLBACK_HEIGHT)/2;
      const pxAdj = px + powerupMalusDims.centerOffset;
      if (bodyX < pxAdj + powerupMalusDims.width && bodyX + bodyWidth > pxAdj && bodyY < py + powerupMalusDims.height && bodyY + bodyHeight > py) {
        // Delegate to collectibles system for behavior
        collectPowerup(tile, false);
      }
    }
  }
}
