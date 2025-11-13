// ==========================================
// BOSS KILL SHOT CONSUMABLE
// ==========================================
// Instant kill the current boss with a powerful screen-wide attack
// Requires a charge period before execution

// Constants
const BOSS_KILL_SHOT_CHARGE_DURATION = 1500; // 1.5 seconds charge time
const BOSS_KILL_SHOT_FLASH_DURATION = 500; // 500ms flash duration

// Screen flash overlay element (DOM-based for full viewport coverage)
let bossKillShotFlashOverlay = null;

// Activate boss kill shot (starts charge sequence)
function activateBossKillShot() {
  console.log('🎯 [BOSS KILL SHOT] activateBossKillShot() called');
  console.log('🎯 [BOSS KILL SHOT] game.bossKillShot:', game.bossKillShot);
  console.log('🎯 [BOSS KILL SHOT] game.bossActive:', game.bossActive);
  console.log('🎯 [BOSS KILL SHOT] game.boss:', game.boss);
  console.log('🎯 [BOSS KILL SHOT] game.boss?.vulnerable:', game.boss?.vulnerable);
  
  if (!game.bossKillShot) {
    console.log('🎯 [BOSS KILL SHOT] Cannot activate - bossKillShot not initialized');
    return;
  }
  
  if (game.bossKillShot.usesRemaining <= 0) {
    console.log('🎯 [BOSS KILL SHOT] Cannot activate - no uses remaining');
    return;
  }
  
  // Verify boss is active and vulnerable (ONLY available during boss fights)
  if (!game.bossActive) {
    console.log('🎯 [BOSS KILL SHOT] Cannot activate - boss not active (only available during boss fights)');
    return;
  }
  
  if (!game.boss) {
    console.log('🎯 [BOSS KILL SHOT] Cannot activate - boss object not found');
    return;
  }
  
  if (!game.boss.vulnerable) {
    console.log('🎯 [BOSS KILL SHOT] Cannot activate - boss not vulnerable yet (still in entrance phase)');
    return;
  }
  
  // Check if already charging
  if (game.bossKillShot.charging) {
    console.log('🎯 [BOSS KILL SHOT] Already charging');
    return;
  }
  
  console.log('🎯 [BOSS KILL SHOT] Starting charge sequence');
  
  // Start charge sequence
  game.bossKillShot.charging = true;
  game.bossKillShot.chargeTime = BOSS_KILL_SHOT_CHARGE_DURATION;
  game.bossKillShot.usesRemaining = 0; // Mark as used immediately
  
  // Stop auto-firing during charge
  game.bossKillShot.autoFireDisabled = true;
  
  // Create charging visual effect
  createBossKillShotChargingEffect();
  
  // Play charging sound
  // TODO: Add boss kill shot charging sound
}

// Update boss kill shot (called from main update loop)
function updateBossKillShot() {
  if (!game.bossKillShot) {
    return;
  }
  
  // Update charge sequence
  if (game.bossKillShot.charging) {
    const deltaTime = game.lastFrameTime ? (Date.now() - game.lastFrameTime) : 16;
    game.bossKillShot.chargeTime -= deltaTime;
    
    // Update charging visual effect
    updateBossKillShotChargingEffect();
    
    // Check if charge completed
    if (game.bossKillShot.chargeTime <= 0) {
      executeBossKillShot();
    }
  }
  
  // Flash is handled by CSS animation, no need to update here
}

// Execute boss kill shot (after charge completes)
function executeBossKillShot() {
  if (!game.bossActive || !game.boss) {
    console.log('🎯 [BOSS KILL SHOT] Cannot execute - boss no longer active');
    game.bossKillShot.charging = false;
    game.bossKillShot.autoFireDisabled = false;
    return;
  }
  
  console.log('🎯 [BOSS KILL SHOT] Executing - instant boss defeat');
  
  // End charge sequence
  game.bossKillShot.charging = false;
  game.bossKillShot.chargeTime = 0;
  
  // Resume auto-firing
  game.bossKillShot.autoFireDisabled = false;
  
  // Create screen-wide flash effect FIRST (before boss defeat)
  createBossKillShotFlash();
  
  // Instant boss defeat - set HP to 0
  game.boss.hp = 0;
  
  // Boss defeat will be handled by normal game logic (handleBossDefeat)
  // Score, particles, sounds, etc. will all be handled normally
  
  console.log('🎯 [BOSS KILL SHOT] Boss HP set to 0, flash created, defeat sequence will trigger');
}

// Create charging visual effect
function createBossKillShotChargingEffect() {
  // Create energy particles around player
  const playerCenterX = player.x + player.width / 2;
  const playerCenterY = player.y + player.height / 2;
  
  // Create swirling energy particles
  for (let i = 0; i < 30; i++) {
    const angle = (Math.PI * 2 * i) / 30;
    const radius = 40 + Math.random() * 20;
    const x = playerCenterX + Math.cos(angle) * radius;
    const y = playerCenterY + Math.sin(angle) * radius;
    const vx = -Math.sin(angle) * 2;
    const vy = Math.cos(angle) * 2;
    
    game.particles.push(new Particle(
      x,
      y,
      `hsl(${200 + Math.random() * 60}, 100%, 70%)`, // Blue to cyan range
      { x: vx, y: vy }
    ));
  }
}

// Update charging visual effect
function updateBossKillShotChargingEffect() {
  if (!game.bossKillShot || !game.bossKillShot.charging) {
    return;
  }
  
  // Create additional particles during charge
  if (Math.random() < 0.3) {
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;
    const angle = Math.random() * Math.PI * 2;
    const radius = 30 + Math.random() * 30;
    const x = playerCenterX + Math.cos(angle) * radius;
    const y = playerCenterY + Math.sin(angle) * radius;
    const vx = -Math.sin(angle) * 1.5;
    const vy = Math.cos(angle) * 1.5;
    
    game.particles.push(new Particle(
      x,
      y,
      `hsl(${200 + Math.random() * 60}, 100%, 70%)`, // Blue to cyan range
      { x: vx, y: vy }
    ));
  }
}

// Create screen-wide flash effect (DOM overlay covering entire viewport)
function createBossKillShotFlash() {
  // Remove existing overlay if present
  if (bossKillShotFlashOverlay) {
    bossKillShotFlashOverlay.remove();
    bossKillShotFlashOverlay = null;
  }
  
  // Create flash overlay element
  const overlay = document.createElement('div');
  overlay.className = 'boss-kill-shot-flash';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(255, 255, 255, 1);
    z-index: 10000;
    pointer-events: none;
    animation: bossKillShotFlashFade ${BOSS_KILL_SHOT_FLASH_DURATION}ms ease-out forwards;
  `;
  
  // Append to viewport container (or body as fallback)
  const viewportContainer = document.querySelector('.viewport-container');
  const parent = viewportContainer || document.body;
  parent.appendChild(overlay);
  bossKillShotFlashOverlay = overlay;
  
  // Remove overlay after animation completes
  setTimeout(() => {
    if (bossKillShotFlashOverlay) {
      bossKillShotFlashOverlay.remove();
      bossKillShotFlashOverlay = null;
      console.log('🎯 [BOSS KILL SHOT] Flash overlay removed');
    }
  }, BOSS_KILL_SHOT_FLASH_DURATION);
  
  console.log('🎯 [BOSS KILL SHOT] Screen flash activated (viewport-wide overlay)');
}

// Add CSS animation for flash fade (if not already added)
function ensureBossKillShotFlashCSS() {
  // Check if style already exists
  if (document.getElementById('boss-kill-shot-flash-style')) {
    return;
  }
  
  const style = document.createElement('style');
  style.id = 'boss-kill-shot-flash-style';
  style.textContent = `
    @keyframes bossKillShotFlashFade {
      0% {
        opacity: 1;
      }
      100% {
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}

// Render boss kill shot charging effects (separate from flash)
function renderBossKillShotChargingEffects(ctx) {
  // Render charging effect (enhanced player glow)
  if (game.bossKillShot && game.bossKillShot.charging) {
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;
    const chargeProgress = 1 - (game.bossKillShot.chargeTime / BOSS_KILL_SHOT_CHARGE_DURATION);
    
    // Enhanced glow around player during charge
    ctx.save();
    const glowRadius = 40 + (chargeProgress * 20); // Grow from 40px to 60px
    const glowGradient = ctx.createRadialGradient(
      playerCenterX, playerCenterY, 0,
      playerCenterX, playerCenterY, glowRadius
    );
    glowGradient.addColorStop(0, `rgba(100, 200, 255, ${0.8 + chargeProgress * 0.2})`);
    glowGradient.addColorStop(0.5, `rgba(50, 150, 255, ${0.4 + chargeProgress * 0.3})`);
    glowGradient.addColorStop(1, 'rgba(50, 150, 255, 0)');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(playerCenterX, playerCenterY, glowRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Pulsing ring effect
    const ringRadius = 50 + Math.sin(Date.now() * 0.01) * 10;
    ctx.strokeStyle = `rgba(100, 200, 255, ${0.6 + chargeProgress * 0.4})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(playerCenterX, playerCenterY, ringRadius, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.restore();
  }
}

// Render boss kill shot screen flash (no longer needed - using DOM overlay)
function renderBossKillShotFlash(ctx) {
  // Flash is now handled by DOM overlay, not canvas rendering
  // This function is kept for backwards compatibility but does nothing
}

// Legacy function for backwards compatibility (calls both)
function renderBossKillShotEffects(ctx) {
  renderBossKillShotChargingEffects(ctx);
  renderBossKillShotFlash(ctx);
}

// Check if auto-fire should be disabled
function isAutoFireDisabled() {
  return game.bossKillShot && game.bossKillShot.autoFireDisabled;
}

// Initialize CSS animation on load
if (typeof window !== 'undefined') {
  // Ensure CSS is loaded when module loads
  ensureBossKillShotFlashCSS();
  
  // Make functions globally accessible
  window.activateBossKillShot = activateBossKillShot;
  window.updateBossKillShot = updateBossKillShot;
  window.renderBossKillShotEffects = renderBossKillShotEffects;
  window.renderBossKillShotChargingEffects = renderBossKillShotChargingEffects;
  window.renderBossKillShotFlash = renderBossKillShotFlash;
  window.isAutoFireDisabled = isAutoFireDisabled;
}

