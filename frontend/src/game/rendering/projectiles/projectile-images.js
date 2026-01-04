// ==========================================
// PROJECTILE IMAGES - OWNED BY PROJECTILE RENDERERS
// ==========================================
// This file contains projectile sprite images used by:
// - src/game/rendering/projectiles/player-projectile-rendering.js
// - src/game/rendering/projectiles/boss-projectile-rendering.js
// - src/game/rendering/projectiles/enemy-projectile-rendering.js
// ==========================================

// Projectile images (moved from utils/helpers.js)
// Helper function to get image from preloader or create new one
function getProjectileImage(key, src) {
  if (typeof window !== 'undefined' && window.getGameImage) {
    const image = window.getGameImage(key);
    if (image) return image;
  }
  // Fallback to direct loading
  const img = new Image();
  img.src = src;
  return img;
}

const blueOrbShotImage = getProjectileImage('projectile_blue_orb', 'assets/Blue_Orb_Shot.webp');

const bossArrowImage = getProjectileImage('projectile_boss_arrow', 'assets/Boss_Arrow_Bolt.webp');

const enemyCandleImage = getProjectileImage('projectile_enemy_candle', 'assets/Enemy_Red_Candle.webp');


