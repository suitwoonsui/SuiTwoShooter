// ==========================================
// BOSS MANAGEMENT - SPAWNING AND COMBAT
// ==========================================

// Boss image loading
function loadBossImage(bossType) {
  // Disable transparency processing to avoid CORS errors
  // Use boss images directly
  bossImage = bossImages[bossType - 1];
}

// Boss spawn warning
function spawnBoss() {
  console.log('spawnBoss() called - currentTier:', game.currentTier);
  // Start with warning
  game.bossWarning = true;
  game.bossWarningTime = 2000; // 2 seconds warning
  
  // Reset distance for next boss cycle
  game.distanceSinceBoss = 0;
  
  // Stop regular music when boss warning appears
  if (typeof stopBackgroundMusic === 'function') {
    stopBackgroundMusic();
  }
  
  // Clear all existing content
  tiles = [];
  game.enemyProjectiles = [];
  game.bossProjectiles = [];
  game.projectiles = [];
  game.particles = [];
  
  // Stop scrolling
  game.speed = 0;
  
  // Cancel any charge in progress
  game.chargeStart = null;
}

// Create boss instance
function createBoss() {
  const currentBossStats = bossStats[game.currentTier] || bossStats[4];
  const size = 60 * 3;
  
  // Load specific boss image - Boss_Scammer for tier 1, Boss_Market_Maker for tier 2, Boss_Bear for tier 3, Boss_Shadow_Figure for tier 4
  let bossImageType;
  if (game.currentTier === 1) {
    bossImageType = 3; // Boss_Scammer for tier 1
  } else if (game.currentTier === 2) {
    bossImageType = 4; // Boss_Market_Maker for tier 2
  } else if (game.currentTier === 3) {
    bossImageType = 1; // Boss_Bear for tier 3
  } else {
    bossImageType = 5; // Boss_Shadow_Figure for tier 4+
  }
  loadBossImage(bossImageType);
  
  game.boss = {
    type: bossImageType,
    tier: game.currentTier,
    hp: currentBossStats.hp,
    maxHp: currentBossStats.hp,
    x: game.width + size, // Start off-screen right
    y: (game.height - size) / 2, // Centered vertically
    targetX: game.width - size - 50, // Final position
    width: size,
    height: size,
    lastShot: 0,
    hitTime: 0,
    moveSpeed: currentBossStats.speed,
    vulnerable: false, // Boss invulnerable at start
    entranceTime: 2000, // 2 seconds entrance
    entranceStart: game.now(),
    attackPattern: 0, // Current attack pattern
    lastPatternChange: 0,
    patternDuration: 3000, // Change pattern every 3 seconds
    moveDirection: 1, // Vertical movement direction
    baseY: (game.height - size) / 2, // Base Y position
    fireRate: currentBossStats.fireRate,
    maxPatterns: currentBossStats.patterns,
    enrageTime: currentBossStats.enrageTime,
    enrageStart: null, // When enrage timer starts
    enraged: false, // Enrage state
    baseFireRate: currentBossStats.fireRate // Save base fire rate
  };
  game.bossActive = true;
  game.bossWarning = false;
  
  // Switch to boss music
  if (typeof startBossMusic === 'function') {
    startBossMusic();
  }
}

// Boss fire with varied patterns
function handleBossFire() {
  // Don't fire if boss isn't in position yet
  if (!game.bossActive || !game.boss || !game.boss.vulnerable || game.boss.x > game.boss.targetX) {
    return;
  }
  
  const now = game.now();
  
  // Change attack pattern periodically (faster for high tiers and when enraged)
  const patternChangeSpeed = game.boss.enraged ? game.boss.patternDuration : Math.max(2000, 4000 - (game.boss.tier * 500));
  if (now - game.boss.lastPatternChange > patternChangeSpeed) {
    game.boss.attackPattern = (game.boss.attackPattern + 1) % game.boss.maxPatterns;
    game.boss.lastPatternChange = now;
    game.boss.lastShot = now; // Reset fire timer
  }
  
  if (now - game.boss.lastShot > game.boss.fireRate) {
    game.boss.lastShot = now;
    const bx = game.boss.x;
    const by = game.boss.y + game.boss.height/2;
    const px = player.x + player.width/2;
    const py = player.y + player.height/2;
    const projectileSpeed = (5 + game.boss.tier) * (game.boss.enraged ? 1.5 : 1); // Faster when enraged
    const enrageMultiplier = game.boss.enraged ? 2 : 1; // Double projectiles when enraged
    
    switch(game.boss.attackPattern) {
      case 0: // Straight line shot (multiple based on tier)
        const lineShots = Math.min(3, game.boss.tier) * enrageMultiplier;
        for (let i = 0; i < lineShots; i++) {
          createBossProjectile(bx, by + (i - Math.floor(lineShots/2)) * 20, -projectileSpeed, 0);
        }
        break;
        
      case 1: // Triple fan shot (wider based on tier)
        const spreadCount = (3 + game.boss.tier) * enrageMultiplier;
        for (let i = 0; i < spreadCount; i++) {
          const angle = (i - Math.floor(spreadCount/2)) * 0.3;
          createBossProjectile(bx, by, -projectileSpeed * Math.cos(angle), projectileSpeed * Math.sin(angle));
        }
        break;
        
      case 2: // Aimed shot at player (multiple based on tier)
        const dx = px - bx;
        const dy = py - by;
        const dist = Math.hypot(dx, dy);
        if (dist > 5) {
          const homingShots = game.boss.tier * enrageMultiplier;
          for (let i = 0; i < homingShots; i++) {
            const spread = (i - Math.floor(homingShots/2)) * 0.2;
            createBossProjectile(bx, by, (dx/dist + spread) * projectileSpeed, (dy/dist + spread) * projectileSpeed);
          }
        }
        break;
        
      case 3: // Intensified vertical barrage
        if (game.boss.tier >= 2) {
          // Reduce projectile count to ensure proper gaps
          const barrageCount = Math.min(4, 2 + game.boss.tier) * enrageMultiplier; // Tier 2: 4, Tier 3: 5, Tier 4: 6
          // Progressive gap sizes: higher tiers = smaller gaps (but still dodgable)
          const minGapSize = Math.max(100, 160 - (game.boss.tier * 10)); // Tier 2: 140px, Tier 3: 130px, Tier 4: 120px
          const startY = 60;
          const endY = game.height - 60;
          const totalSpace = endY - startY;
          
          // Calculate spacing to ensure minimum gap size
          const totalGapSpace = (barrageCount - 1) * minGapSize;
          const remainingSpace = totalSpace - totalGapSpace;
          const projectileSpacing = remainingSpace / barrageCount;
          
          for (let i = 0; i < barrageCount; i++) {
            const y = startY + i * (projectileSpacing + minGapSize);
            createBossProjectile(bx, y, -projectileSpeed, 0);
          }
        }
        break;
        
      case 4: // Multiple spiral shots
        if (game.boss.tier >= 3) {
          const spiralCount = game.boss.tier * enrageMultiplier;
          for (let j = 0; j < spiralCount; j++) {
            for (let i = 0; i < 4; i++) {
              const angle = (now * 0.008 + i * Math.PI * 2 / 4 + j * Math.PI / spiralCount) % (Math.PI * 2);
              createBossProjectile(bx, by, -3 + Math.cos(angle) * (2 + game.boss.tier), Math.sin(angle) * (2 + game.boss.tier));
            }
          }
        }
        break;
    }
  }
}
