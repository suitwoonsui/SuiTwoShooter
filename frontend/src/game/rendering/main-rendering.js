// ==========================================
// MAIN RENDERING COORDINATOR
// ==========================================

function renderDemoModeIndicator(ctx, gameState) {
  const isDemoMode = !!(gameState && gameState.isDemoMode);
  if (!isDemoMode) return;

  const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  // Smooth pulse between ~0.25 and ~1.0 alpha
  const pulse = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(now / 220));

  const text = 'DEMO';
  const x = gameState.width / 2;
  const y = Math.max(28, Math.floor(gameState.height * 0.06));

  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Stroke + fill for legibility on any background
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(0,0,0,0.7)';
  ctx.strokeText(text, x, y);

  // Match UI accent ("market green") from shared theme
  ctx.fillStyle = '#39ff14';
  ctx.fillText(text, x, y);
  ctx.restore();
}

// Main drawing function - coordinates all rendering
function draw() {
  // Get game state - use window.gameState or window.game (backward compatibility)
  const gameState = (typeof window !== 'undefined' && window.gameState) ? window.gameState : 
                    (typeof window !== 'undefined' && window.game) ? window.game : null;
  
  if (!gameState) {
    if (Math.random() < 0.01) console.error('❌ Draw called but game state is null!'); // Throttled log
    return;
  }
  
  const ctx = gameState.ctx;
  
  if (!ctx) {
    if (Math.random() < 0.01) console.error('❌ Draw called but ctx is null!', {
      hasGameState: !!gameState,
      hasCanvas: !!gameState.canvas,
      hasCtx: !!gameState.ctx
    }); // Throttled log
    return;
  }
  
  // Always clear canvas
  ctx.clearRect(0, 0, gameState.width, gameState.height);
  
  // Show menu message if menu is visible
  const uiState = (typeof uiGameState !== 'undefined' ? uiGameState : null) ||
                   (typeof gameState !== 'undefined' && gameState.isMenuVisible !== undefined ? gameState : null);
  if (uiState && uiState.isMenuVisible) {
    if (Math.random() < 0.01) console.log('⏸️ Drawing menu overlay'); // Throttled log
    renderMenuOverlay(ctx);
    renderDemoModeIndicator(ctx, gameState);
    return;
  }
  
  // Update header stats and game UI (throttled to every 2 frames for better performance)
  // This reduces DOM operations by 50% while maintaining smooth UI updates (30 FPS is fine for stats)
  if (!gameState._uiUpdateFrameCount) {
    gameState._uiUpdateFrameCount = 0;
  }
  gameState._uiUpdateFrameCount++;
  
  // Update UI every 2 frames (30 FPS instead of 60 FPS - still smooth for stats)
  if (gameState._uiUpdateFrameCount % 2 === 0) {
    updateHeaderStats();
    updateGameUI();
  }

  // Enhanced Game Over screen
  if (gameState.gameOver) {
    if (Math.random() < 0.01) console.log('🎬 Drawing game over screen'); // Throttled log
    renderGameOverScreen(ctx);
    renderDemoModeIndicator(ctx, gameState);
    return;
  }

  // Enhanced Pause overlay
  if (gameState.paused) {
    if (Math.random() < 0.01) console.log('⏸️ Drawing pause overlay'); // Throttled log
    renderPauseOverlay(ctx);
    renderDemoModeIndicator(ctx, gameState);
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
  if (gameState.bossWarning) {
    renderBossWarning(ctx);
    renderDemoModeIndicator(ctx, gameState);
    return;
  }

  // Boss victory screen
  if (gameState.bossVictoryTimeout) {
    renderBossVictory(ctx);
    renderDemoModeIndicator(ctx, gameState);
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
  
  // Render player effects (use window refs so order-independent with player-rendering.js)
  if (typeof window.renderPlayerGlow === 'function') window.renderPlayerGlow(ctx);
  if (typeof window.renderForceField === 'function') window.renderForceField(ctx);
  if (typeof window.renderPlayer === 'function') window.renderPlayer(ctx);
  
  // Render distance bar (boss progress bar) - only during regular gameplay
  if (!gameState.bossActive && !gameState.bossWarning && !gameState.bossVictoryTimeout) {
    const pbW = gameState.width * 0.4, pbX = (gameState.width - pbW) / 2, pbY = gameState.height - 20;
    ctx.strokeStyle = '#FFF'; 
    ctx.lineWidth = 2;
    ctx.strokeRect(pbX, pbY, pbW, 8);
    const prog = Math.min(gameState.distanceSinceBoss / gameState.bossThreshold, 1);
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

  // Render demo mode indicator last so it stays visible
  renderDemoModeIndicator(ctx, gameState);
}

// Export draw function globally for GameLifecycle to use
if (typeof window !== 'undefined') {
  window.draw = draw;
}
