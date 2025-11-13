// ==========================================
// MAIN RENDERING COORDINATOR
// ==========================================

// Main drawing function - coordinates all rendering
function draw() {
  const ctx = game.ctx;
  
  if (!ctx) {
    if (Math.random() < 0.01) console.error('❌ Draw called but ctx is null!'); // Throttled log
    return;
  }
  
  // Always clear canvas
  ctx.clearRect(0, 0, game.width, game.height);
  
  // Show menu message if menu is visible
  if (typeof gameState !== 'undefined' && gameState.isMenuVisible) {
    if (Math.random() < 0.01) console.log('⏸️ Drawing menu overlay'); // Throttled log
    renderMenuOverlay(ctx);
    return;
  }
  
  // Update header stats and game UI
  updateHeaderStats();
  updateGameUI();

  // Enhanced Game Over screen
  if (game.gameOver) {
    if (Math.random() < 0.01) console.log('🎬 Drawing game over screen'); // Throttled log
    renderGameOverScreen(ctx);
    return;
  }

  // Enhanced Pause overlay
  if (game.paused) {
    if (Math.random() < 0.01) console.log('⏸️ Drawing pause overlay'); // Throttled log
    renderPauseOverlay(ctx);
    return;
  } else {
    // Hide mobile pause overlay when not paused
    if (typeof toggleMobilePauseOverlay === 'function') {
      toggleMobilePauseOverlay(false);
    }
  }

  // Render background
  if (Math.random() < 0.01) console.log('🎮 Drawing game content'); // Throttled log
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
      
      // Render tractor beam effects (before collectibles so beams appear behind)
      if (typeof renderTractorBeamEffects === 'function') {
        renderTractorBeamEffects(ctx);
      }
      
      // Render destroy all missiles (before player projectiles so missiles appear behind)
      if (typeof renderDestroyAllMissiles === 'function') {
        renderDestroyAllMissiles(ctx);
      }
      
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
  
  // Render slow time effects (screen tint and particles)
  if (typeof renderSlowTimeEffects === 'function') {
    renderSlowTimeEffects(ctx);
  }
  
  // Render boss kill shot charging effects (but NOT the flash yet)
  if (typeof renderBossKillShotChargingEffects === 'function') {
    renderBossKillShotChargingEffects(ctx);
  }
  
  // Render boss kill shot screen flash LAST (on top of everything)
  if (typeof renderBossKillShotFlash === 'function') {
    renderBossKillShotFlash(ctx);
  }
}
