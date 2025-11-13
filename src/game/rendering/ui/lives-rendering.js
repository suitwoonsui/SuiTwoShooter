// ==========================================
// LIVES RENDERING
// ==========================================

// Load life images - MOVED TO helpers.js

// Render lives display
function renderLives(ctx) {
  const livesX = 20;
  const livesY = 20;
  const lifeSpacing = 35;
  
  const baseLives = game.baseLives || 3;
  const purchasedLives = game.purchasedLives || 0;
  const currentBaseLives = Math.min(game.lives, baseLives); // Current base lives (can't exceed base)
  const currentPurchasedLives = Math.max(0, game.lives - baseLives); // Remaining purchased lives
  
  let lifeIndex = 0;
  
  // Render base lives (always show all 3, with empty if lost)
  for (let i = 0; i < baseLives; i++) {
    const lifeX = livesX + (lifeIndex * lifeSpacing);
    const lifeY = livesY;
    
    if (i < currentBaseLives) {
      // Full base life (red)
      if (lifeFullImage && lifeFullImage.complete) {
        ctx.drawImage(lifeFullImage, lifeX, lifeY, 30, 30);
      } else {
        // Fallback red circle
        ctx.fillStyle = '#FF0000';
        ctx.beginPath();
        ctx.arc(lifeX + 15, lifeY + 15, 15, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Empty base life
      if (lifeEmptyImage && lifeEmptyImage.complete) {
        ctx.drawImage(lifeEmptyImage, lifeX, lifeY, 30, 30);
      } else {
        // Fallback empty circle
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(lifeX + 15, lifeY + 15, 15, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    lifeIndex++;
  }
  
  // Render purchased lives (only show remaining ones, no empty slots)
  for (let i = 0; i < currentPurchasedLives; i++) {
    const lifeX = livesX + (lifeIndex * lifeSpacing);
    const lifeY = livesY;
    
    // Gold heart for purchased lives
    if (lifeFullGoldImage && lifeFullGoldImage.complete) {
      ctx.drawImage(lifeFullGoldImage, lifeX, lifeY, 30, 30);
    } else {
      // Fallback gold circle
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(lifeX + 15, lifeY + 15, 15, 0, Math.PI * 2);
      ctx.fill();
    }
    lifeIndex++;
  }
}
