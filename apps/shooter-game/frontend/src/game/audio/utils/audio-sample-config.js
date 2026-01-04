// ==========================================
// AUDIO SAMPLE CONFIGURATION
// ==========================================

/**
 * Configuration for audio samples
 * Add your audio file paths here
 * 
 * Place audio files in: assets/sounds/ or your preferred directory
 * Supported formats: WAV, MP3, OGG
 */

const AUDIO_SAMPLE_CONFIG = {
  // Explosion sounds
  explosion: {
    url: 'assets/sounds/explosion.wav',
    fallback: 'buffer', // Fallback to buffer generator if file not found
    volume: 1.0
  },
  explosionLarge: {
    url: 'assets/sounds/explosion-large.wav',
    fallback: 'buffer',
    volume: 1.0
  },
  
  // Impact sounds
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
  
  // Boss sounds
  bossDestroyed: {
    url: 'assets/sounds/boss-destroyed.wav',
    fallback: 'oscillator', // Fallback to oscillator if file not found
    volume: 1.0
  },
  
  // Game state sounds
  gameOver: {
    url: 'assets/sounds/game-over.wav',
    fallback: 'oscillator',
    volume: 1.0
  },
  
  // Optional: Add more samples as needed
  // coinCollect: {
  //   url: 'assets/sounds/coin-collect.wav',
  //   fallback: 'oscillator',
  //   volume: 0.6
  // }
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
