// ==========================================
// BACKGROUND IMAGES - OWNED BY BACKGROUND RENDERER
// ==========================================
// This file contains background images used by:
// - src/game/rendering/background-rendering.js
// ==========================================

// Background image (moved from utils/helpers.js)
// Try to get from preloader first, fall back to direct loading
let backgroundImage = null;

if (typeof window !== 'undefined' && window.getGameImage) {
  backgroundImage = window.getGameImage('background');
}

// Fallback to direct loading if preloader not available or image not loaded yet
if (!backgroundImage) {
  backgroundImage = new Image();
  backgroundImage.src = 'assets/background.webp';
}


