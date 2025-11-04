// ==========================================
// GAME STATE RENDERING - MENU, PAUSE, GAME OVER
// ==========================================

// Render menu overlay
function renderMenuOverlay(ctx) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(0, 0, game.width, game.height);
  
  ctx.fillStyle = '#4DA2FF';
  ctx.font = 'bold 32px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Main Menu Active', game.width / 2, game.height / 2);
  
  ctx.fillStyle = '#ccc';
  ctx.font = '18px Arial';
  ctx.fillText('Use the menu above to start playing', game.width / 2, game.height / 2 + 40);
}

// Render game over screen
function renderGameOverScreen(ctx) {
  // Animated dark background with pulsing effect
  const pulseAlpha = 0.7 + 0.3 * Math.sin(Date.now() * 0.005);
  ctx.fillStyle = `rgba(0, 0, 0, ${pulseAlpha})`;
  ctx.fillRect(0, 0, game.width, game.height);
  
  // End particles
  game.particles.forEach(p => p.draw(ctx));
  
  // Enhanced GAME OVER title with glow effect - properly positioned
  ctx.save();
  ctx.shadowColor = '#FF0000';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#FF0000';
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 4;
  ctx.font = 'bold 64px Arial'; // Reduced font size to fit better
  ctx.textAlign = 'center';
  const gameOverText = 'GAME OVER';
  const centerX = game.width / 2;
  const centerY = game.height / 2 - 60; // Moved up to ensure it fits
  ctx.strokeText(gameOverText, centerX, centerY);
  ctx.fillText(gameOverText, centerX, centerY);
  ctx.restore();
  
  // Enhanced final score display
  ctx.save();
  ctx.shadowColor = '#39ff14';
  ctx.shadowBlur = 15;
  ctx.fillStyle = '#39ff14';
  ctx.strokeStyle = '#4DA2FF';
  ctx.lineWidth = 3;
  ctx.font = 'bold 36px Arial'; // Reduced font size
  ctx.strokeText(`Final Score: ${game.score.toLocaleString()}`, centerX, centerY + 40);
  ctx.fillText(`Final Score: ${game.score.toLocaleString()}`, centerX, centerY + 40);
  ctx.restore();
  
  // Stats display - organized in two columns for better layout
  const statsStartY = centerY + 80;
  const statsLineHeight = 22;
  const leftColumnX = centerX - 180;
  const rightColumnX = centerX + 180;
  let currentY = statsStartY;
  
  // Left column stats
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'left';
  
  ctx.fillText(`Distance: ${Math.floor(game.distance)} m`, leftColumnX, currentY);
  currentY += statsLineHeight;
  
  ctx.fillText(`Coins: ${game.coins}`, leftColumnX, currentY);
  currentY += statsLineHeight;
  
  ctx.fillText(`Enemies Defeated: ${game.enemiesDefeated || 0}`, leftColumnX, currentY);
  currentY += statsLineHeight;
  
  // Right column stats
  currentY = statsStartY;
  ctx.textAlign = 'left';
  
  ctx.fillStyle = '#4DA2FF';
  ctx.fillText(`Bosses Defeated: ${game.bossesDefeated}`, rightColumnX, currentY);
  currentY += statsLineHeight;
  
  ctx.fillText(`Current Tier: ${game.currentTier}`, rightColumnX, currentY);
  currentY += statsLineHeight;
  
  ctx.fillText(`Projectile Level: ${game.projectileLevel}`, rightColumnX, currentY);
  currentY += statsLineHeight;
  
  // Boss tiers display (if any bosses were defeated)
  if (game.bossTiers && game.bossTiers.length > 0) {
    const bossTiersText = `Boss Tiers: ${game.bossTiers.join(', ')}`;
    ctx.fillStyle = '#FFD700';
    ctx.fillText(bossTiersText, rightColumnX, currentY);
  }
  
  // Enhanced return to menu instructions with animation
  ctx.textAlign = 'center';
  const blinkAlpha = 0.5 + 0.5 * Math.sin(Date.now() * 0.01);
  ctx.fillStyle = `rgba(170, 170, 170, ${blinkAlpha})`;
  ctx.font = 'bold 22px Arial'; // Reduced font size
  ctx.fillText('Press any key to return to menu', centerX, centerY + 200);
}

// Mobile pause button overlay state
let mobilePauseOverlay = null;

// Create mobile pause button overlay if it doesn't exist
function createMobilePauseOverlay() {
  if (mobilePauseOverlay) return mobilePauseOverlay;
  
  mobilePauseOverlay = document.createElement('button');
  mobilePauseOverlay.id = 'mobile-pause-overlay-button';
  mobilePauseOverlay.className = 'mobile-pause-overlay-button';
  mobilePauseOverlay.textContent = 'Resume';
  // Styling is handled by CSS class in mobile-game-ui.css
  
  mobilePauseOverlay.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof game !== 'undefined' && game.gameRunning) {
      game.paused = false;
    }
  });
  
  // Also handle touch for mobile
  mobilePauseOverlay.addEventListener('touchend', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof game !== 'undefined' && game.gameRunning) {
      game.paused = false;
    }
  });
  
  return mobilePauseOverlay;
}

// Show/hide mobile pause overlay
function toggleMobilePauseOverlay(show) {
  const overlay = createMobilePauseOverlay();
  // Append to viewport-container instead of body so it rotates with the game
  const viewportContainer = document.querySelector('.viewport-container');
  const parent = viewportContainer || document.body;
  
  if (show) {
    if (!parent.contains(overlay)) {
      parent.appendChild(overlay);
    }
  } else {
    if (parent.contains(overlay)) {
      overlay.remove();
    }
  }
}

// Render pause overlay
function renderPauseOverlay(ctx) {
  // Animated semi-transparent overlay
  const pulseAlpha = 0.6 + 0.2 * Math.sin(Date.now() * 0.008);
  ctx.fillStyle = `rgba(0, 0, 0, ${pulseAlpha})`;
  ctx.fillRect(0, 0, game.width, game.height);
  
  // Check if mobile device
  const isMobile = typeof DeviceDetection !== 'undefined' && DeviceDetection.isMobile();
  
  if (isMobile) {
    // Render mobile-specific pause screen
    renderMobilePauseOverlay(ctx);
    
    // Show mobile pause button overlay
    toggleMobilePauseOverlay(true);
  } else {
    // Render desktop pause screen
    renderDesktopPauseOverlay(ctx);
    
    // Hide mobile pause button overlay if present
    toggleMobilePauseOverlay(false);
  }
}

function renderMobilePauseOverlay(ctx) {
  const centerX = game.width / 2;
  const centerY = game.height / 2;
  
  // Calculate responsive sizes based on canvas dimensions
  // Assume game.width is 800 for base calculations, scale proportionally
  const baseWidth = 800;
  const scale = game.width / baseWidth;
  
  // Button is centered at 50% (centerY)
  // Position PAUSED above, instruction below
  
  // Enhanced PAUSED text with glow - responsive sizing
  ctx.save();
  ctx.shadowColor = '#4DA2FF';
  ctx.shadowBlur = 25 * scale;
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#4DA2FF';
  ctx.lineWidth = 5 * scale;
  ctx.font = `bold ${64 * scale}px Arial`;
  ctx.textAlign = 'center';
  const pausedText = 'PAUSED';
  // Position PAUSED text above the button
  const pausedY = centerY - 120 * scale;
  ctx.strokeText(pausedText, centerX, pausedY);
  ctx.fillText(pausedText, centerX, pausedY);
  ctx.restore();
  
  // Instructions with animation - responsive sizing, BELOW the button
  ctx.save();
  ctx.textAlign = 'center';
  const blinkAlpha = 0.6 + 0.4 * Math.sin(Date.now() * 0.012);
  ctx.fillStyle = `rgba(204, 204, 204, ${blinkAlpha})`;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2 * scale;
  ctx.font = `bold ${24 * scale}px Arial`;
  const instructionText = 'Tap the button above to resume';
  // Position instruction text BELOW the button
  const instructionY = centerY + 100 * scale;
  ctx.strokeText(instructionText, centerX, instructionY);
  ctx.fillText(instructionText, centerX, instructionY);
  ctx.restore();
}

function renderDesktopPauseOverlay(ctx) {
  const centerX = game.width / 2;
  const centerY = game.height / 2 - 60;
  
  // Enhanced PAUSED text with glow
  ctx.save();
  ctx.shadowColor = '#4DA2FF';
  ctx.shadowBlur = 25;
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#4DA2FF';
  ctx.lineWidth = 5;
  ctx.font = 'bold 72px Arial';
  ctx.textAlign = 'center';
  const pausedText = 'PAUSED';
  ctx.strokeText(pausedText, centerX, centerY);
  ctx.fillText(pausedText, centerX, centerY);
  ctx.restore();
  
  // Enhanced instructions with animation
  const blinkAlpha = 0.6 + 0.4 * Math.sin(Date.now() * 0.012);
  ctx.fillStyle = `rgba(204, 204, 204, ${blinkAlpha})`;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.font = 'bold 28px Arial';
  ctx.strokeText('Press P to resume', centerX, centerY + 80);
  ctx.fillText('Press P to resume', centerX, centerY + 80);
  
  // Additional controls info
  ctx.fillStyle = '#AAAAAA';
  ctx.font = 'bold 20px Arial';
  ctx.fillText('P: Resume Game', centerX, centerY + 120);
}

// Render boss victory screen
function renderBossVictory(ctx) {
  // Pulsing effect
  const alpha = 0.5 + 0.5 * Math.sin(Date.now() * 0.01);
  ctx.save();
  ctx.fillStyle = `rgba(0, 255, 0, ${alpha * 0.2})`;
  ctx.fillRect(0, 0, game.width, game.height);
  
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#00FF00';
  ctx.lineWidth = 3;
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  const text = 'BOSS DEFEATED!';
  const x = game.width / 2;
  const y = game.height / 2;
  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);
  
  // Add countdown
  const timeLeft = Math.ceil(game.bossVictoryTime / 1000);
  ctx.font = 'bold 24px Arial';
  ctx.fillStyle = '#FFFF00';
  ctx.fillText(`Next stage in ${timeLeft}...`, x, y + 60);
  
  ctx.restore();
  
  // Still draw player with dynamic dimensions
  const playerDims = getPlayerDimensions(characterImage, player.width, player.height);
  const playerX = player.x + playerDims.centerOffset;
  ctx.drawImage(characterImage, playerX, player.y, playerDims.width, playerDims.height);
}

// Render boss warning
function renderBossWarning(ctx) {
  // Pulsing effect
  const alpha = 0.5 + 0.5 * Math.sin(Date.now() * 0.01);
  ctx.save();
  ctx.fillStyle = `rgba(255, 0, 0, ${alpha * 0.3})`;
  ctx.fillRect(0, 0, game.width, game.height);
  
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#FF0000';
  ctx.lineWidth = 3;
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  const text = 'BOSS WARNING!';
  const x = game.width / 2;
  const y = game.height / 2;
  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);
  ctx.restore();
  
  // Still draw player with dynamic dimensions
  const playerDims = getPlayerDimensions(characterImage, player.width, player.height);
  const playerX = player.x + playerDims.centerOffset;
  ctx.drawImage(characterImage, playerX, player.y, playerDims.width, playerDims.height);
}
