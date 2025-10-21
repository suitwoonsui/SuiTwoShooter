// ==========================================
// BOSS IMAGES - OWNED BY BOSS RENDERER
// ==========================================
// This file contains all boss sprite images used by:
// - src/game/rendering/bosses/boss-rendering.js
// - src/game/main.js (boss collision detection)
// ==========================================

// Boss images (moved from utils/helpers.js)
const bossImages = [];
// Boss 1: Bear Boss
const bearBossImage = new Image();
bearBossImage.src = 'assets/Boss_Bear.webp';
bossImages.push(bearBossImage);

// Boss 2: Keep original BossEnnemy_2
const boss2Image = new Image();
boss2Image.src = 'assets/BossEnnemy_2.webp';
bossImages.push(boss2Image);

// Boss 3: Boss Scammer
const bossScammerImage = new Image();
bossScammerImage.src = 'assets/Boss_Scammer.webp';
bossImages.push(bossScammerImage);

// Boss 4: Boss Market Maker
const bossMarketMakerImage = new Image();
bossMarketMakerImage.src = 'assets/Boss_Market_Maker.webp';
bossImages.push(bossMarketMakerImage);

// Boss 5: Boss Shadow Figure
const bossShadowFigureImage = new Image();
bossShadowFigureImage.src = 'assets/Boss_Shadow_Figure.webp';
bossImages.push(bossShadowFigureImage);

// Boss image processing (clean white for true transparency)
const bossRawImage = new Image();
let bossImage = null;


