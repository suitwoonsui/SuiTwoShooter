// ==========================================
// PLAYER IMAGES - OWNED BY PLAYER RENDERER
// ==========================================
// This file contains player sprite images used by:
// - src/game/rendering/player/player-rendering.js
// - src/game/rendering/ui/game-state-rendering.js
// ==========================================

// Player and UI images (moved from utils/helpers.js)
// Try to get from preloader first, fall back to direct loading
let characterImage = null;

if (typeof window !== 'undefined' && window.getGameImage) {
  characterImage = window.getGameImage('player');
}

// Fallback to direct loading if preloader not available or image not loaded yet
if (!characterImage) {
  characterImage = new Image();
  characterImage.src = 'assets/SuiTwo_Character.webp';
}

// Life images moved to src/game/rendering/ui/life-images.js


