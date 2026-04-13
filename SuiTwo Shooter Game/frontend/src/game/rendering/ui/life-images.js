// ==========================================
// UI LIFE IMAGES - OWNED BY UI RENDERER
// ==========================================
// This file contains life indicator images used by:
// - src/game/rendering/ui/lives-rendering.js
// ==========================================

// UI life images (split from player-images.js)
// Helper function to get image from preloader or create new one
function getLifeImage(key, src) {
  if (typeof window !== 'undefined' && window.getGameImage) {
    const image = window.getGameImage(key);
    if (image) return image;
  }
  // Fallback to direct loading
  const img = new Image();
  img.src = src;
  return img;
}

const lifeFullImage = getLifeImage('life_full', 'assets/Life_Full.webp');

const lifeFullGoldImage = getLifeImage('life_full_gold', 'assets/Life_Full_Gold.webp');

const lifeEmptyImage = getLifeImage('life_empty', 'assets/Life_Empty.webp');


