// ==========================================
// MAIN RENDERING COORDINATOR
// ==========================================

// Main drawing function - coordinates all rendering
function draw() {
  const ctx = game.ctx;
  
  // Always clear canvas
  ctx.clearRect(0, 0, game.width, game.height);
  
  // Show menu message if menu is visible
  if (typeof gameState !== 'undefined' && gameState.isMenuVisible) {
    renderMenuOverlay(ctx);
    return;
  }
  
  // Update header stats and game UI
  updateHeaderStats();
  updateGameUI();

  // Enhanced Game Over screen
  if (game.gameOver) {
    renderGameOverScreen(ctx);
    return;
  }

  // Enhanced Pause overlay
  if (game.paused) {
    renderPauseOverlay(ctx);
    return;
  }

  // Render background
  renderBackground(ctx);
  
  // Render lane dividers
  renderLaneDividers(ctx);

  // Boss warning
  if (game.bossWarning) {
    renderBossWarning(ctx);
    return;
  }

  // Boss victory screen
  if (game.bossVictoryTimeout) {
    renderBossVictory(ctx);
    return;
  }

      // Render game elements
      renderTiles(ctx);
      renderCollectibles(ctx);
      renderLives(ctx);
      renderPlayerProjectiles(ctx);
      renderEnemyProjectiles(ctx);
      renderBossProjectiles(ctx);
      renderBoss(ctx);
  
  // Render player effects
  renderPlayerGlow(ctx);
  renderForceField(ctx);
  renderPlayer(ctx);
  
  // Render distance bar (boss progress bar) - only during regular gameplay
  if (!game.bossActive && !game.bossWarning && !game.bossVictoryTimeout) {
    const pbW = game.width * 0.4, pbX = (game.width - pbW) / 2, pbY = game.height - 20;
    ctx.strokeStyle = '#FFF'; 
    ctx.lineWidth = 2;
    ctx.strokeRect(pbX, pbY, pbW, 8);
    const prog = Math.min(game.distanceSinceBoss / game.bossThreshold, 1);
    ctx.fillStyle = '#0F0';
    ctx.fillRect(pbX, pbY, pbW * prog, 8);
  }

  // Render visual effects
  renderParticles(ctx);
  renderFlashEffect(ctx);
  renderChargeEffect(ctx);
}
