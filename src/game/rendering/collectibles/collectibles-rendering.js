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
        const cx = tile.x + COLLECTIBLE_X_OFFSET;
        const cy = tile.coinLane * game.laneHeight + (game.laneHeight - COLLECTIBLE_FALLBACK_HEIGHT) / 2;
      
        // Draw coin image with dynamic width by aspect ratio
        if (collectibleImage.complete && collectibleImage.naturalWidth > 0) {
          const coinDims = getCollectibleDimensions(collectibleImage);
          ctx.drawImage(collectibleImage, cx + coinDims.centerOffset, cy, coinDims.width, coinDims.height);
        } else {
          // Fallback circle
          ctx.fillStyle = '#FFD700';
          ctx.beginPath();
          ctx.arc(cx + 20, cy + 20, 20, 0, Math.PI * 2);
          ctx.fill();
        }
    }
    
      // Power-up (bonus)
      if (tile.powerupBonus) {
        const px = tile.x + COLLECTIBLE_X_OFFSET;
        const py = tile.powerupBonus.lane * game.laneHeight + (game.laneHeight - COLLECTIBLE_FALLBACK_HEIGHT) / 2;
        if (powerupBonusImage.complete && powerupBonusImage.naturalWidth > 0) {
          const powerupDims = getCollectibleDimensions(powerupBonusImage);
          ctx.drawImage(powerupBonusImage, px + powerupDims.centerOffset, py, powerupDims.width, powerupDims.height);
        } else {
          ctx.fillStyle = '#00FF00';
          ctx.fillRect(px, py, 40, 40);
        }
      }

      // Power-down (malus)
      if (tile.powerdown) {
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
