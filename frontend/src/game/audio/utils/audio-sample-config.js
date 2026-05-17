// ==========================================
// AUDIO SAMPLE CONFIGURATION (optional / legacy)
// ==========================================
//
// The game uses procedural sounds (sound-effects.js, oscillators) by default.
// Entries here are used when gameplay or tests request that sample (see AudioManager).

const AUDIO_SAMPLE_CONFIG = {
  explosion: {
    url: 'assets/sounds/explosion.wav',
    fallback: 'buffer',
    volume: 1.0
  },
  explosionLarge: {
    url: 'assets/sounds/explosion-large.wav',
    fallback: 'buffer',
    volume: 1.0
  },
  impact: {
    url: 'assets/sounds/impact.wav',
    fallback: 'buffer',
    volume: 0.8
  },
  impactHeavy: {
    url: 'assets/sounds/impact-heavy.wav',
    fallback: 'buffer',
    volume: 0.9
  },
  bossDestroyed: {
    url:
      'assets/sounds/' +
      encodeURI('Game_SFX_by_OwlishMedia/explodify3.wav'),
    fallback: 'oscillator',
    volume: 1.0
  },
  gameOver: {
    url: 'assets/sounds/game-over.wav',
    fallback: 'oscillator',
    volume: 1.0
  },
  powerupCollect: {
    url:
      'assets/sounds/' +
      encodeURI('GAME SOUND FX PACK WAV OGG M4A/GAME SOUND FX PACK WAV OGG M4A/Powerup14.ogg'),
    fallback: 'oscillator',
    volume: 1.0
  },
  powerupNegative: {
    url:
      'assets/sounds/' +
      encodeURI('GAME SOUND FX PACK WAV OGG M4A/GAME SOUND FX PACK WAV OGG M4A/Powerdown14.ogg'),
    fallback: 'oscillator',
    volume: 1.0
  },
  enemyHit: {
    url:
      'assets/sounds/' +
      encodeURI('8-bit Sound Effects Pack 001/Hit 4.wav'),
    fallback: 'oscillator',
    volume: 1.0
  },
  enemyDestroyed: {
    url:
      'assets/sounds/' +
      encodeURI('GAME SOUND FX PACK WAV OGG M4A/GAME SOUND FX PACK WAV OGG M4A/Explosion6.ogg'),
    fallback: 'oscillator',
    volume: 1.0
  },
  bossHit: {
    url:
      'assets/sounds/' +
      encodeURI('8-bit Sound Effects Pack 001/Hit 2.wav'),
    fallback: 'oscillator',
    volume: 1.0
  },
  playerHit: {
    url:
      'assets/sounds/' +
      encodeURI('8-bit Sound Effects Pack 001/Hit 1.wav'),
    fallback: 'oscillator',
    volume: 1.0
  },
};

/**
 * Get sample configuration
 * @param {string} sampleName - Name of the sample
 * @returns {Object|null}
 */
function getSampleConfig(sampleName) {
  return AUDIO_SAMPLE_CONFIG[sampleName] || null;
}

/**
 * Get all sample URLs for preloading
 * @returns {Array<string>}
 */
function getAllSampleUrls() {
  return Object.values(AUDIO_SAMPLE_CONFIG)
    .map(config => config.url)
    .filter(url => url); // Filter out any null/undefined URLs
}
