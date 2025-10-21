// ==========================================
// LIVES RENDERING
// ==========================================

// Load life images - MOVED TO helpers.js

// Render lives display
function renderLives(ctx) {
  const livesX = 20;
  const livesY = 20;
  const lifeSpacing = 35;
  
  for (let i = 0; i < 3; i++) {
    const lifeX = livesX + (i * lifeSpacing);
    const lifeY = livesY;
    
    if (i < game.lives) {
      // Full life
      if (lifeFullImage.complete) {
        ctx.drawImage(lifeFullImage, lifeX, lifeY, 30, 30);
      } else {
        // Fallback circle
        ctx.fillStyle = '#FF0000';
        ctx.beginPath();
        ctx.arc(lifeX + 15, lifeY + 15, 15, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Empty life
      if (lifeEmptyImage.complete) {
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
  }
}
