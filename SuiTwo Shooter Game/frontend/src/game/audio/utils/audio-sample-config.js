// ==========================================
// AUDIO SAMPLE CONFIGURATION (optional / legacy)
// ==========================================
//
// The game uses procedural sounds (sound-effects.js, oscillators) by default.
// This config is only used if something explicitly requests WAV samples (e.g. sound test UI).
// No .wav files are required for normal gameplay.

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
    url: 'assets/sounds/boss-destroyed.wav',
    fallback: 'oscillator',
    volume: 1.0
  },
  gameOver: {
    url: 'assets/sounds/game-over.wav',
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
