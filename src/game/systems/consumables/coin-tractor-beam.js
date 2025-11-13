// ==========================================
// COIN TRACTOR BEAM SYSTEM
// ==========================================
// Handles coin and power-up pulling when tractor beam is active

// Track coins/power-ups being pulled (global scope for rendering access)
window.pulledCoins = []; // Array of { tile, offsetX, offsetY, startX, startY }
window.pulledPowerups = []; // Array of { tile, isBonus, offsetX, offsetY, startX, startY }

/**
 * Activate coin tractor beam
 */
function activateCoinTractorBeam() {
  if (!game.coinTractorBeam || game.coinTractorBeam.usesRemaining <= 0) {
    console.warn('⚠️ [TRACTOR BEAM] Cannot activate - no uses remaining');
    return;
  }
  
  if (game.coinTractorBeam.active) {
    console.warn('⚠️ [TRACTOR BEAM] Already active');
    return;
  }
  
  // Activate tractor beam
  game.coinTractorBeam.active = true;
  game.coinTractorBeam.remainingTime = game.coinTractorBeam.duration * 1000; // Convert to milliseconds
  game.coinTractorBeam.usesRemaining = 0; // Mark as used
  
  // Calculate pull range
  game.coinTractorBeam.pullRange = game.width * game.coinTractorBeam.range;
  
  // Clear previous pull tracking
  window.pulledCoins = [];
  window.pulledPowerups = [];
  
  // Find all coins and power-ups within range and mark them for pulling
  const playerCenterX = player.x + player.width / 2;
  console.log(`🧲 [TRACTOR BEAM] Activation - Player center X: ${playerCenterX}, Pull range: ${game.coinTractorBeam.pullRange} (${game.coinTractorBeam.range * 100}% of ${game.width}px)`);
  
  tiles.forEach(tile => {
    // Coins
    if (tile.coinLane !== null) {
      const coinX = tile.x + COLLECTIBLE_X_OFFSET;
      const coinY = tile.coinLane * game.laneHeight + (game.laneHeight - COLLECTIBLE_FALLBACK_HEIGHT) / 2;
      // Calculate horizontal distance from player center (range is based on screen width percentage)
      const distance = Math.abs(coinX - playerCenterX);
      
      if (distance <= game.coinTractorBeam.pullRange) {
        console.log(`🧲 [TRACTOR BEAM] Pulling coin - Lane: ${tile.coinLane}, X: ${coinX}, Distance: ${distance.toFixed(1)}`);
        window.pulledCoins.push({
          tile: tile,
          offsetX: 0,
          offsetY: 0,
          startX: coinX,
          startY: coinY
        });
      } else {
        // Debug: Log coins that are NOT in range (only for top lane to avoid spam)
        if (tile.coinLane === 0) {
          console.log(`🧲 [TRACTOR BEAM] Coin NOT in range - Lane: ${tile.coinLane}, X: ${coinX}, Distance: ${distance.toFixed(1)}, Range: ${game.coinTractorBeam.pullRange}`);
        }
      }
    }
    
    // Power-ups (Level 3 only) - Only pull bonus power-ups, NOT power-downs
    if (game.coinTractorBeam.level >= 3) {
      if (tile.powerupBonus) {
        const powerupX = tile.x + COLLECTIBLE_X_OFFSET;
        const powerupY = tile.powerupBonus.lane * game.laneHeight + (game.laneHeight - COLLECTIBLE_FALLBACK_HEIGHT) / 2;
        // Calculate horizontal distance from player center
        const distance = Math.abs(powerupX - playerCenterX);
        
        if (distance <= game.coinTractorBeam.pullRange) {
          window.pulledPowerups.push({
            tile: tile,
            isBonus: true,
            offsetX: 0,
            offsetY: 0,
            startX: powerupX,
            startY: powerupY
          });
        }
      }
      // Note: Power-downs are NOT pulled by tractor beam (only bonus power-ups)
    }
  });
  
  console.log(`🧲 [TRACTOR BEAM] Activated - Level ${game.coinTractorBeam.level}, ${window.pulledCoins.length} coins, ${window.pulledPowerups.length} power-ups`);
  
  // Play activation sound
  // TODO: Add tractor beam activation sound
  
  // Create visual effect
  createTractorBeamActivationEffect();
}

/**
 * Update tractor beam (called from main update loop)
 */
function updateCoinTractorBeam() {
  if (!game.coinTractorBeam || !game.coinTractorBeam.active) {
    return;
  }
  
  // Decrement remaining time (use delta time if available, otherwise estimate)
  const deltaTime = game.lastFrameTime ? (Date.now() - game.lastFrameTime) : 16;
  game.coinTractorBeam.remainingTime -= deltaTime;
  
  // Check if duration expired
  if (game.coinTractorBeam.remainingTime <= 0) {
    deactivateCoinTractorBeam();
    return;
  }
  
  const pullSpeed = game.coinTractorBeam.pullSpeed;
  const playerCenterX = player.x + player.width / 2;
  const playerCenterY = player.y + player.height / 2;
  
  // Find new coins/power-ups that came into range (check all tiles)
  tiles.forEach(tile => {
    // Check for new coins
    if (tile.coinLane !== null) {
      const coinX = tile.x + COLLECTIBLE_X_OFFSET;
      const coinY = tile.coinLane * game.laneHeight + (game.laneHeight - COLLECTIBLE_FALLBACK_HEIGHT) / 2;
      // Calculate horizontal distance from player center
      const distance = Math.abs(coinX - playerCenterX);
      
      // Check if coin is within range and not already being pulled
      if (distance <= game.coinTractorBeam.pullRange) {
        const alreadyPulled = window.pulledCoins.find(p => p.tile === tile);
        if (!alreadyPulled) {
          // Debug: Log when new coins enter range (especially top lane)
          if (tile.coinLane === 0) {
            console.log(`🧲 [TRACTOR BEAM] New coin entered range - Lane: ${tile.coinLane}, X: ${coinX}, Distance: ${distance.toFixed(1)}`);
          }
          window.pulledCoins.push({
            tile: tile,
            offsetX: 0,
            offsetY: 0,
            startX: coinX,
            startY: coinY
          });
        }
      } else {
        // Debug: Log coins that are NOT in range (only for top lane to avoid spam)
        if (tile.coinLane === 0 && coinX < playerCenterX + game.coinTractorBeam.pullRange + 100) {
          console.log(`🧲 [TRACTOR BEAM] Coin NOT in range (update loop) - Lane: ${tile.coinLane}, X: ${coinX}, Distance: ${distance.toFixed(1)}, Range: ${game.coinTractorBeam.pullRange}`);
        }
      }
    }
    
    // Check for new power-ups (Level 3 only) - Only pull bonus power-ups, NOT power-downs
    if (game.coinTractorBeam.level >= 3) {
      if (tile.powerupBonus) {
        const powerupX = tile.x + COLLECTIBLE_X_OFFSET;
        const powerupY = tile.powerupBonus.lane * game.laneHeight + (game.laneHeight - COLLECTIBLE_FALLBACK_HEIGHT) / 2;
        // Calculate horizontal distance from player center
        const distance = Math.abs(powerupX - playerCenterX);
        
        if (distance <= game.coinTractorBeam.pullRange) {
          const alreadyPulled = window.pulledPowerups.find(p => p.tile === tile && p.isBonus);
          if (!alreadyPulled) {
            window.pulledPowerups.push({
              tile: tile,
              isBonus: true,
              offsetX: 0,
              offsetY: 0,
              startX: powerupX,
              startY: powerupY
            });
          }
        }
      }
      // Note: Power-downs are NOT pulled by tractor beam (only bonus power-ups)
    }
  });
  
  // Update pulled coins (iterate backwards to safely remove items)
  for (let i = window.pulledCoins.length - 1; i >= 0; i--) {
    const pulled = window.pulledCoins[i];
    // Check if coin was collected (coinLane is null, not 0 - lane 0 is valid!)
    if (pulled.tile.coinLane === null) {
      // Coin was already collected, remove from array
      window.pulledCoins.splice(i, 1);
      continue;
    }
    
    // Calculate current coin position
    const coinX = pulled.tile.x + COLLECTIBLE_X_OFFSET + pulled.offsetX;
    const coinY = pulled.tile.coinLane * game.laneHeight + (game.laneHeight - COLLECTIBLE_FALLBACK_HEIGHT) / 2 + pulled.offsetY;
    
    // Calculate direction to player
    const dx = playerCenterX - coinX;
    const dy = playerCenterY - coinY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Check if coin reached player (within collection range)
    if (distance < 30) {
      // Coin reached player - collect it
      collectCoin(pulled.tile);
      window.pulledCoins.splice(i, 1);
      continue;
    }
    
    // Move coin toward player
    if (distance > 0) {
      const moveX = (dx / distance) * pullSpeed;
      const moveY = (dy / distance) * pullSpeed;
      
      pulled.offsetX += moveX;
      pulled.offsetY += moveY;
    }
  }
  
  // Update pulled power-ups (Level 3 only) - Only bonus power-ups, NOT power-downs
  if (game.coinTractorBeam.level >= 3) {
    // Iterate backwards to safely remove items
    for (let i = window.pulledPowerups.length - 1; i >= 0; i--) {
      const pulled = window.pulledPowerups[i];
      // Only process bonus power-ups (isBonus should always be true, but check anyway)
      if (!pulled.isBonus || !pulled.tile.powerupBonus) {
        // Not a bonus power-up or already collected, remove from array
        window.pulledPowerups.splice(i, 1);
        continue;
      }
      
      const powerup = pulled.tile.powerupBonus;
      
      // Calculate current power-up position
      const powerupX = pulled.tile.x + COLLECTIBLE_X_OFFSET + pulled.offsetX;
      const powerupY = powerup.lane * game.laneHeight + (game.laneHeight - COLLECTIBLE_FALLBACK_HEIGHT) / 2 + pulled.offsetY;
      
      // Calculate direction to player
      const dx = playerCenterX - powerupX;
      const dy = playerCenterY - powerupY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Check if power-up reached player (within collection range)
      if (distance < 30) {
        // Power-up reached player - collect it
        collectPowerup(pulled.tile, true); // Always true since we only pull bonuses
        window.pulledPowerups.splice(i, 1);
        continue;
      }
      
      // Move power-up toward player
      if (distance > 0) {
        const moveX = (dx / distance) * pullSpeed;
        const moveY = (dy / distance) * pullSpeed;
        
        pulled.offsetX += moveX;
        pulled.offsetY += moveY;
      }
    }
  }
  
  // Update visual effects
  updateTractorBeamVisualEffects();
}

/**
 * Deactivate coin tractor beam
 */
function deactivateCoinTractorBeam() {
  if (!game.coinTractorBeam) {
    return;
  }
  
  game.coinTractorBeam.active = false;
  game.coinTractorBeam.remainingTime = 0;
  
  // Clear pull tracking
  window.pulledCoins = [];
  window.pulledPowerups = [];
  
  console.log('🧲 [TRACTOR BEAM] Deactivated');
  
  // Fade visual effects
  // TODO: Add fade effect
  
  // Play deactivation sound
  // TODO: Add tractor beam deactivation sound
}

/**
 * Create tractor beam activation visual effect
 */
function createTractorBeamActivationEffect() {
  // Create particles around player
  for (let i = 0; i < 20; i++) {
    const angle = (Math.PI * 2 * i) / 20;
    const distance = 30 + Math.random() * 20;
    const x = player.x + player.width / 2 + Math.cos(angle) * distance;
    const y = player.y + player.height / 2 + Math.sin(angle) * distance;
    
    if (game.particles && typeof Particle !== 'undefined') {
      game.particles.push(new Particle(
        x,
        y,
        '#4DA2FF',
        { x: Math.cos(angle) * 2, y: Math.sin(angle) * 2 }
      ));
    }
  }
}

/**
 * Create pull particle effect between item and player
 */
function createTractorBeamPullParticle(itemX, itemY, playerX, playerY) {
  // Create more particles for better visual effect
  if (Math.random() > 0.5) {
    return;
  }
  
  // Create particle along the path, flowing from item to player
  const t = Math.random();
  const x = itemX + (playerX - itemX) * t;
  const y = itemY + (playerY - itemY) * t;
  
  // Calculate direction vector (normalized)
  const dx = playerX - itemX;
  const dy = playerY - itemY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const speed = distance > 0 ? 2 + Math.random() * 2 : 0;
  
  if (game.particles && typeof Particle !== 'undefined' && distance > 0) {
    // Create green particles flowing toward player
    game.particles.push(new Particle(
      x,
      y,
      '#39ff14', // Green color to match glow
      { x: (dx / distance) * speed, y: (dy / distance) * speed }
    ));
  }
}

/**
 * Update tractor beam visual effects
 */
function updateTractorBeamVisualEffects() {
  // Visual effects are handled by particles system
  // Could add additional effects here if needed
}

/**
 * Render tractor beam effects (called from rendering)
 */
function renderTractorBeamEffects(ctx) {
  if (!game.coinTractorBeam || !game.coinTractorBeam.active) {
    return;
  }
  
  const playerCenterX = player.x + player.width / 2;
  const playerCenterY = player.y + player.height / 2;
  
  // Draw glowing lines to pulled coins
  window.pulledCoins.forEach(pulled => {
    // Check if coin was collected (coinLane is null, not 0 - lane 0 is valid!)
    if (pulled.tile.coinLane === null) return;
    
    // Calculate coin position with offset
    const coinBaseX = pulled.tile.x + COLLECTIBLE_X_OFFSET + pulled.offsetX;
    const coinBaseY = pulled.tile.coinLane * game.laneHeight + (game.laneHeight - COLLECTIBLE_FALLBACK_HEIGHT) / 2 + pulled.offsetY;
    
    // Calculate coin center (accounting for coin dimensions)
    let coinCenterX = coinBaseX;
    let coinCenterY = coinBaseY;
    if (typeof getCollectibleDimensions === 'function' && typeof collectibleImage !== 'undefined') {
      const coinDims = getCollectibleDimensions(collectibleImage);
      coinCenterX = coinBaseX + coinDims.centerOffset + coinDims.width / 2;
      coinCenterY = coinBaseY + coinDims.height / 2;
    } else {
      // Fallback: assume 40x40 coin
      coinCenterX = coinBaseX + 20;
      coinCenterY = coinBaseY + 20;
    }
    
    // Draw glowing effect along the line (no solid line, just glow)
    ctx.save();
    
    // Create gradient along the line (from player to coin center)
    const lineGrad = ctx.createLinearGradient(playerCenterX, playerCenterY, coinCenterX, coinCenterY);
    lineGrad.addColorStop(0, 'rgba(57, 255, 20, 0.3)'); // Very transparent at player
    lineGrad.addColorStop(0.5, 'rgba(57, 255, 20, 0.15)'); // Very transparent in middle
    lineGrad.addColorStop(1, 'rgba(57, 255, 20, 0.3)'); // Very transparent at coin
    
    // Draw multiple glow layers (no solid line, just glow) - thinner beams
    for (let layer = 0; layer < 6; layer++) {
      const layerWidth = 8 - (layer * 1.2); // Thinner layers (max 8px instead of 12px)
      const layerAlpha = 0.25 - (layer * 0.04); // Very transparent layers
      
      ctx.strokeStyle = lineGrad;
      ctx.globalAlpha = layerAlpha;
      ctx.lineWidth = layerWidth;
      ctx.lineCap = 'round';
      ctx.shadowColor = '#39ff14';
      ctx.shadowBlur = 12 + (layer * 2); // Slightly reduced blur for thinner beams
      ctx.beginPath();
      ctx.moveTo(playerCenterX, playerCenterY);
      ctx.lineTo(coinCenterX, coinCenterY);
      ctx.stroke();
    }
    
    ctx.restore();
  });
  
  // Draw glowing lines to pulled power-ups (Level 3 only) - Only bonus power-ups, NOT power-downs
  if (game.coinTractorBeam.level >= 3) {
    window.pulledPowerups.forEach(pulled => {
      // Only render bonus power-ups, not power-downs
      if (!pulled.isBonus || !pulled.tile.powerupBonus) return;
      const powerup = pulled.tile.powerupBonus;
      
      // Calculate power-up position with offset
      const powerupBaseX = pulled.tile.x + COLLECTIBLE_X_OFFSET + pulled.offsetX;
      const powerupBaseY = powerup.lane * game.laneHeight + (game.laneHeight - COLLECTIBLE_FALLBACK_HEIGHT) / 2 + pulled.offsetY;
      
      // Calculate power-up center (accounting for power-up dimensions)
      let powerupCenterX = powerupBaseX;
      let powerupCenterY = powerupBaseY;
      if (typeof getCollectibleDimensions === 'function' && typeof powerupBonusImage !== 'undefined') {
        const powerupDims = getCollectibleDimensions(powerupBonusImage);
        powerupCenterX = powerupBaseX + powerupDims.centerOffset + powerupDims.width / 2;
        powerupCenterY = powerupBaseY + powerupDims.height / 2;
      } else {
        // Fallback: assume 40x40 power-up
        powerupCenterX = powerupBaseX + 20;
        powerupCenterY = powerupBaseY + 20;
      }
      
      // Draw glowing effect along the line (no solid line, just glow)
      ctx.save();
      
      // Create gradient along the line (from player to power-up center)
      const lineGrad = ctx.createLinearGradient(playerCenterX, playerCenterY, powerupCenterX, powerupCenterY);
      lineGrad.addColorStop(0, 'rgba(57, 255, 20, 0.3)'); // Very transparent at player
      lineGrad.addColorStop(0.5, 'rgba(57, 255, 20, 0.15)'); // Very transparent in middle
      lineGrad.addColorStop(1, 'rgba(57, 255, 20, 0.3)'); // Very transparent at power-up
      
      // Draw multiple glow layers (no solid line, just glow) - thinner beams
      for (let layer = 0; layer < 6; layer++) {
        const layerWidth = 8 - (layer * 1.2); // Thinner layers (max 8px instead of 12px)
        const layerAlpha = 0.25 - (layer * 0.04); // Very transparent layers
        
        ctx.strokeStyle = lineGrad;
        ctx.globalAlpha = layerAlpha;
        ctx.lineWidth = layerWidth;
        ctx.lineCap = 'round';
        ctx.shadowColor = '#39ff14';
        ctx.shadowBlur = 12 + (layer * 2); // Slightly reduced blur for thinner beams
        ctx.beginPath();
        ctx.moveTo(playerCenterX, playerCenterY);
        ctx.lineTo(powerupCenterX, powerupCenterY);
        ctx.stroke();
      }
      
      ctx.restore();
    });
  }
}

// Make functions globally accessible
if (typeof window !== 'undefined') {
  window.activateCoinTractorBeam = activateCoinTractorBeam;
  window.updateCoinTractorBeam = updateCoinTractorBeam;
  window.renderTractorBeamEffects = renderTractorBeamEffects;
}

