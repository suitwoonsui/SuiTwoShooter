// ==========================================
// COLLECTIBLES RENDERING
// ==========================================

// Load collectible images - MOVED TO helpers.js

// Render all collectibles (coins, power-ups, power-downs)
function renderCollectibles(ctx) {
  tiles.forEach(tile => {
    // Only render tiles that are visible on screen
    if (tile.x > -100 && tile.x < game.width + 100) {
      // Coins
      if (tile.coinLane !== null) {
        // Check if coin is being pulled by tractor beam
        let offsetX = 0;
        let offsetY = 0;
        if (typeof window.pulledCoins !== 'undefined' && game.coinTractorBeam && game.coinTractorBeam.active) {
          const pulled = window.pulledCoins.find(p => p.tile === tile);
          if (pulled) {
            offsetX = pulled.offsetX;
            offsetY = pulled.offsetY;
          }
        }
        
        const cx = tile.x + COLLECTIBLE_X_OFFSET + offsetX;
        const cy = tile.coinLane * game.laneHeight + (game.laneHeight - COLLECTIBLE_FALLBACK_HEIGHT) / 2 + offsetY;
      
        // Draw coin image with dynamic width by aspect ratio
        if (collectibleImage.complete && collectibleImage.naturalWidth > 0) {
          const coinDims = getCollectibleDimensions(collectibleImage);
          const coinCenterX = cx + coinDims.centerOffset + coinDims.width / 2;
          const coinCenterY = cy + coinDims.height / 2;
          
          // Draw green glow around coin if being pulled (same style as player's normal glow)
          if (offsetX !== 0 || offsetY !== 0 || (typeof window.pulledCoins !== 'undefined' && window.pulledCoins.find(p => p.tile === tile))) {
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
          if (offsetX !== 0 || offsetY !== 0 || (typeof window.pulledCoins !== 'undefined' && window.pulledCoins.find(p => p.tile === tile))) {
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
        // Check if power-up is being pulled by tractor beam (Level 3 only)
        let offsetX = 0;
        let offsetY = 0;
        if (typeof window.pulledPowerups !== 'undefined' && game.coinTractorBeam && game.coinTractorBeam.active && game.coinTractorBeam.level >= 3) {
          const pulled = window.pulledPowerups.find(p => p.tile === tile && p.isBonus);
          if (pulled) {
            offsetX = pulled.offsetX;
            offsetY = pulled.offsetY;
          }
        }
        
        const px = tile.x + COLLECTIBLE_X_OFFSET + offsetX;
        const py = tile.powerupBonus.lane * game.laneHeight + (game.laneHeight - COLLECTIBLE_FALLBACK_HEIGHT) / 2 + offsetY;
        
        if (powerupBonusImage.complete && powerupBonusImage.naturalWidth > 0) {
          const powerupDims = getCollectibleDimensions(powerupBonusImage);
          const powerupCenterX = px + powerupDims.centerOffset + powerupDims.width / 2;
          const powerupCenterY = py + powerupDims.height / 2;
          
          // Draw green glow around power-up if being pulled (same style as player's normal glow)
          if (offsetX !== 0 || offsetY !== 0 || (typeof window.pulledPowerups !== 'undefined' && window.pulledPowerups.find(p => p.tile === tile && p.isBonus))) {
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
          
          ctx.drawImage(powerupBonusImage, px + powerupDims.centerOffset, py, powerupDims.width, powerupDims.height);
        } else {
          const powerupCenterX = px + 20;
          const powerupCenterY = py + 20;
          
          // Draw green glow around power-up if being pulled
          if (offsetX !== 0 || offsetY !== 0 || (typeof window.pulledPowerups !== 'undefined' && window.pulledPowerups.find(p => p.tile === tile && p.isBonus))) {
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
        if (powerupMalusImage.complete && powerupMalusImage.naturalWidth > 0) {
          const powerdownDims = getCollectibleDimensions(powerupMalusImage);
          ctx.drawImage(powerupMalusImage, px + powerdownDims.centerOffset, py, powerdownDims.width, powerdownDims.height);
        } else {
          ctx.fillStyle = '#FF0000';
          ctx.fillRect(px, py, 40, 40);
        }
      }
    }
  });
}
