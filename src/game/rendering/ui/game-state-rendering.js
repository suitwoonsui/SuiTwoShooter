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
  
  // Enhanced stats display
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 22px Arial'; // Reduced font size
  ctx.fillText(`Coins Collected: ${game.coins}`, centerX, centerY + 80);
  
  ctx.fillStyle = '#4DA2FF';
  ctx.font = 'bold 20px Arial'; // Reduced font size
  ctx.fillText(`Bosses Defeated: ${game.bossesDefeated}`, centerX, centerY + 105);
  
  // Enhanced return to menu instructions with animation
  const blinkAlpha = 0.5 + 0.5 * Math.sin(Date.now() * 0.01);
  ctx.fillStyle = `rgba(170, 170, 170, ${blinkAlpha})`;
  ctx.font = 'bold 22px Arial'; // Reduced font size
  ctx.fillText('Press any key to return to menu', centerX, centerY + 140);
}

// Render pause overlay
function renderPauseOverlay(ctx) {
  // Animated semi-transparent overlay
  const pulseAlpha = 0.6 + 0.2 * Math.sin(Date.now() * 0.008);
  ctx.fillStyle = `rgba(0, 0, 0, ${pulseAlpha})`;
  ctx.fillRect(0, 0, game.width, game.height);
  
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
  const centerX = game.width / 2;
  const centerY = game.height / 2 - 60;
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
