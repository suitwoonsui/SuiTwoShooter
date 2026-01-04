// ==========================================
// ENEMY IMAGES - OWNED BY ENEMY RENDERER
// ==========================================
// This file contains all enemy sprite images used by:
// - src/game/rendering/enemies/enemy-rendering.js
// - src/game/systems/collision/collision.js
// - src/game/main.js (projectile collision)
// ==========================================

// Enemy images (moved from utils/helpers.js)
const enemyImages = [];

// Helper function to get image from preloader or create new one
function getEnemyImage(key, src) {
  if (typeof window !== 'undefined' && window.getGameImage) {
    const image = window.getGameImage(key);
    if (image) return image;
  }
  // Fallback to direct loading
  const img = new Image();
  img.src = src;
  return img;
}

// Enemy 1: Jeet
const jeetImage = getEnemyImage('enemy_jeet', 'assets/Enemy_Jeet.webp');
enemyImages.push(jeetImage);

// Enemy 2: Market Maker
const marketMakerImage = getEnemyImage('enemy_market_maker', 'assets/Enemy_Market_Maker.webp');
enemyImages.push(marketMakerImage);

// Enemy 3: Little Bear (moved to tier 3)
const littleBearImage = getEnemyImage('enemy_little_bear', 'assets/Enemy_Little_Bear.webp');
enemyImages.push(littleBearImage);

// Enemy 4: Shadow Hand
const shadowHandImage = getEnemyImage('enemy_shadow_hand', 'assets/Enemy_Shadow_Hand.webp');
enemyImages.push(shadowHandImage);


