// ==========================================
// COLLECTIBLES RENDERING
// ==========================================

// Load collectible images - MOVED TO helpers.js

// Render all collectibles (coins, power-ups, power-downs)
function renderCollectibles(ctx) {
  // OPTIMIZATION: Create Map lookups for pulled items ONCE (not per tile)
  // This avoids O(n*m) complexity from find() calls inside the loop
  const pulledCoinsMap = new Map();
  const pulledPowerupsMap = new Map();
  
  if (typeof window.pulledCoins !== 'undefined' && game.coinTractorBeam && game.coinTractorBeam.active) {
    const pulledCoins = window.pulledCoins;
    const pulledCoinsLength = pulledCoins.length;
    for (let i = 0; i < pulledCoinsLength; i++) {
      const pulled = pulledCoins[i];
      pulledCoinsMap.set(pulled.tile, pulled);
    }
  }
  
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
  
  // OPTIMIZATION: Cache collectible dimensions (function now handles caching internally)
  // Only calculates once per image, then uses cache - no need to check .complete every frame
  const coinDims = getCollectibleDimensions(collectibleImage);
  const powerupBonusDims = getCollectibleDimensions(powerupBonusImage);
  const powerupMalusDims = getCollectibleDimensions(powerupMalusImage);
  
  // OPTIMIZATION: Use for loop instead of forEach for better performance
  const tilesLength = tiles.length;
  for (let tileIdx = 0; tileIdx < tilesLength; tileIdx++) {
    const tile = tiles[tileIdx];
    // Only render tiles that are visible on screen
    if (tile.x > -100 && tile.x < game.width + 100) {
      // Coins
      if (tile.coinLane !== null) {
        // Check if coin is being pulled by tractor beam (using Map lookup - O(1))
        let offsetX = 0;
        let offsetY = 0;
        const pulled = pulledCoinsMap.get(tile);
        if (pulled) {
          offsetX = pulled.offsetX;
          offsetY = pulled.offsetY;
        }
        
        const cx = tile.x + COLLECTIBLE_X_OFFSET + offsetX;
        const cy = tile.coinLane * game.laneHeight + (game.laneHeight - COLLECTIBLE_FALLBACK_HEIGHT) / 2 + offsetY;
      
        // Draw coin image with dynamic width by aspect ratio (using cached dimensions)
        if (coinDims) {
          const coinCenterX = cx + coinDims.centerOffset + coinDims.width / 2;
          const coinCenterY = cy + coinDims.height / 2;
          
          // Draw green glow around coin if being pulled (same style as player's normal glow)
          if (pulled) {
            ctx.save();
            const coinGlowRadius = 30; // Same as player glow
            const coinGrad = ctx.createRadialGradient(coinCenterX, coinCenterY, 0, coinCenterX, coinCenterY, coinGlowRadius);
            coinGrad.addColorStop(0, 'rgba(57, 255, 20, 0.9)');
            coinGrad.addColorStop(1, 'rgba(57, 255, 20, 0)');
            ctx.fillStyle = coinGrad;
            ctx.beginPath();
            ctx.arc(coinCenterX, coinCenterY, coinGlowRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
          
          ctx.drawImage(collectibleImage, cx + coinDims.centerOffset, cy, coinDims.width, coinDims.height);
        } else {
          // Fallback circle
          const coinCenterX = cx + 20;
          const coinCenterY = cy + 20;
          
          // Draw green glow around coin if being pulled
          if (pulled) {
            ctx.save();
            const coinGlowRadius = 30;
            const coinGrad = ctx.createRadialGradient(coinCenterX, coinCenterY, 0, coinCenterX, coinCenterY, coinGlowRadius);
            coinGrad.addColorStop(0, 'rgba(57, 255, 20, 0.9)');
            coinGrad.addColorStop(1, 'rgba(57, 255, 20, 0)');
            ctx.fillStyle = coinGrad;
            ctx.beginPath();
            ctx.arc(coinCenterX, coinCenterY, coinGlowRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
          
          ctx.fillStyle = '#FFD700';
          ctx.beginPath();
          ctx.arc(coinCenterX, coinCenterY, 20, 0, Math.PI * 2);
          ctx.fill();
        }
    }
    
      // Power-up (bonus)
      if (tile.powerupBonus) {
        // Check if power-up is being pulled by tractor beam (using Map lookup - O(1))
        let offsetX = 0;
        let offsetY = 0;
        const pulledPowerup = pulledPowerupsMap.get(tile);
        if (pulledPowerup) {
          offsetX = pulledPowerup.offsetX;
          offsetY = pulledPowerup.offsetY;
        }
        
        const px = tile.x + COLLECTIBLE_X_OFFSET + offsetX;
        const py = tile.powerupBonus.lane * game.laneHeight + (game.laneHeight - COLLECTIBLE_FALLBACK_HEIGHT) / 2 + offsetY;
        
        if (powerupBonusDims) {
          const powerupCenterX = px + powerupBonusDims.centerOffset + powerupBonusDims.width / 2;
          const powerupCenterY = py + powerupBonusDims.height / 2;
          
          // Draw green glow around power-up if being pulled (same style as player's normal glow)
          if (pulledPowerup) {
            ctx.save();
            const powerupGlowRadius = 30; // Same as player glow
            const powerupGrad = ctx.createRadialGradient(powerupCenterX, powerupCenterY, 0, powerupCenterX, powerupCenterY, powerupGlowRadius);
            powerupGrad.addColorStop(0, 'rgba(57, 255, 20, 0.9)');
            powerupGrad.addColorStop(1, 'rgba(57, 255, 20, 0)');
            ctx.fillStyle = powerupGrad;
            ctx.beginPath();
            ctx.arc(powerupCenterX, powerupCenterY, powerupGlowRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
          
          ctx.drawImage(powerupBonusImage, px + powerupBonusDims.centerOffset, py, powerupBonusDims.width, powerupBonusDims.height);
        } else {
          const powerupCenterX = px + 20;
          const powerupCenterY = py + 20;
          
          // Draw green glow around power-up if being pulled
          if (pulledPowerup) {
            ctx.save();
            const powerupGlowRadius = 30;
            const powerupGrad = ctx.createRadialGradient(powerupCenterX, powerupCenterY, 0, powerupCenterX, powerupCenterY, powerupGlowRadius);
            powerupGrad.addColorStop(0, 'rgba(57, 255, 20, 0.9)');
            powerupGrad.addColorStop(1, 'rgba(57, 255, 20, 0)');
            ctx.fillStyle = powerupGrad;
            ctx.beginPath();
            ctx.arc(powerupCenterX, powerupCenterY, powerupGlowRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
          
          ctx.fillStyle = '#00FF00';
          ctx.fillRect(px, py, 40, 40);
        }
      }

      // Power-down (malus)
      if (tile.powerdown) {
        // Note: Power-downs are NOT pulled by tractor beam (only bonus power-ups at Level 3)
        const px = tile.x + COLLECTIBLE_X_OFFSET;
        const py = tile.powerdown.lane * game.laneHeight + (game.laneHeight - COLLECTIBLE_FALLBACK_HEIGHT) / 2;
        if (powerupMalusDims) {
          ctx.drawImage(powerupMalusImage, px + powerupMalusDims.centerOffset, py, powerupMalusDims.width, powerupMalusDims.height);
        } else {
          ctx.fillStyle = '#FF0000';
          ctx.fillRect(px, py, 40, 40);
        }
      }
    }
  }
}
