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
// Enemy 1: Jeet
const jeetImage = new Image();
jeetImage.src = 'assets/Enemy_Jeet.webp';
enemyImages.push(jeetImage);

// Enemy 2: Market Maker
const marketMakerImage = new Image();
marketMakerImage.src = 'assets/Enemy_Market_Maker.webp';
enemyImages.push(marketMakerImage);

// Enemy 3: Little Bear (moved to tier 3)
const littleBearImage = new Image();
littleBearImage.src = 'assets/Enemy_Little_Bear.webp';
enemyImages.push(littleBearImage);

// Enemy 4: Shadow Hand
const shadowHandImage = new Image();
shadowHandImage.src = 'assets/Enemy_Shadow_Hand.webp';
enemyImages.push(shadowHandImage);


