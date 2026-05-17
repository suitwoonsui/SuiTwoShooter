// ==========================================
// BOSS IMAGES - OWNED BY BOSS RENDERER
// ==========================================
// This file contains all boss sprite images used by:
// - src/game/rendering/bosses/boss-rendering.js
// - src/game/main.js (boss collision detection)
// ==========================================

// Boss images (moved from utils/helpers.js)
const bossImages = [];

// Helper function to get image from preloader or create new one
function getBossImage(key, src) {
  if (typeof window !== 'undefined' && window.getGameImage) {
    const image = window.getGameImage(key);
    if (image) return image;
  }
  // Fallback to direct loading
  const img = new Image();
  img.src = src;
  return img;
}

// Boss 0: Boss Scammer (Tier 1)
const bossScammerImage = getBossImage('boss_scammer', 'assets/Boss_Scammer.webp');
bossImages[0] = bossScammerImage;

// Boss 1: Boss Market Maker (Tier 2)
const bossMarketMakerImage = getBossImage('boss_market_maker', 'assets/Boss_Market_Maker.webp');
bossImages[1] = bossMarketMakerImage;

// Boss 2: Boss Bear (Tier 3)
const bearBossImage = getBossImage('boss_bear', 'assets/Boss_Bear.webp');
bossImages[2] = bearBossImage;

// Boss 3: Boss Shadow Figure (Tier 4+)
const bossShadowFigureImage = getBossImage('boss_shadow_figure', 'assets/Boss_Shadow_Figure.webp');
bossImages[3] = bossShadowFigureImage;

// Boss image processing (clean white for true transparency)
const bossRawImage = new Image();
let bossImage = null;


