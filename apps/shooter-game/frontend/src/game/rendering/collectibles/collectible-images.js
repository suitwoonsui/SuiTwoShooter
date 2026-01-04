// ==========================================
// COLLECTIBLE IMAGES - OWNED BY COLLECTIBLES RENDERER
// ==========================================
// This file contains collectible sprite images used by:
// - src/game/rendering/collectibles/collectibles-rendering.js
// - src/game/systems/collision/collision.js
// ==========================================

// Collectible images (moved from utils/helpers.js)
// Helper function to get image from preloader or create new one
function getCollectibleImage(key, src) {
  if (typeof window !== 'undefined' && window.getGameImage) {
    const image = window.getGameImage(key);
    if (image) return image;
  }
  // Fallback to direct loading
  const img = new Image();
  img.src = src;
  return img;
}

const collectibleImage = getCollectibleImage('collectible_coin', 'assets/SuiTwo_Coin.webp');

const powerupBonusImage = getCollectibleImage('powerup_bonus', 'assets/Power_Up_Sui_Rocket.webp');

const powerupMalusImage = getCollectibleImage('powerup_malus', 'assets/Power_Down_Sui_Rocket.webp');


