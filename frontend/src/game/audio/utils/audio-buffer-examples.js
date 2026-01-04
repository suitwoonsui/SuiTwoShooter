// ==========================================
// AUDIO BUFFER EXAMPLES - How to use audio buffers
// ==========================================

/**
 * Example functions showing how to use audio buffers instead of oscillators
 * These can be integrated into your existing audio-integration.js
 */

// Example: Enhanced explosion using audio buffer
function playEnhancedExplosion() {
  const gameAudio = getGameAudio();
  if (!gameAudio || !gameAudio.isInitialized) return;

  const audioContext = gameAudio.audioContext.audioContext;
  
  // Initialize buffer generator if not already done
  if (!gameAudio.bufferGenerator) {
    // Note: You'll need to import AudioBufferGenerator
    // gameAudio.bufferGenerator = new AudioBufferGenerator(audioContext);
  }

  const buffer = gameAudio.bufferGenerator.generateExplosionBuffer(1.0);
  const volume = gameAudio.settings.getSoundEffectsVolume(1.0);
  
  gameAudio.bufferGenerator.playBuffer(buffer, volume);
}

// Example: Enhanced impact sound
function playEnhancedImpact(intensity = 1.0) {
  const gameAudio = getGameAudio();
  if (!gameAudio || !gameAudio.isInitialized) return;

  const audioContext = gameAudio.audioContext.audioContext;
  
  if (!gameAudio.bufferGenerator) {
    // gameAudio.bufferGenerator = new AudioBufferGenerator(audioContext);
  }

  const buffer = gameAudio.bufferGenerator.generateImpactBuffer(intensity);
  const volume = gameAudio.settings.getSoundEffectsVolume(0.8);
  
  gameAudio.bufferGenerator.playBuffer(buffer, volume);
}

// Example: Enhanced coin collect (using buffer instead of oscillators)
function playEnhancedCoinCollect() {
  const gameAudio = getGameAudio();
  if (!gameAudio || !gameAudio.isInitialized) return;

  const audioContext = gameAudio.audioContext.audioContext;
  
  if (!gameAudio.bufferGenerator) {
    // gameAudio.bufferGenerator = new AudioBufferGenerator(audioContext);
  }

  const buffer = gameAudio.bufferGenerator.generateCoinJingleBuffer();
  const volume = gameAudio.settings.getSoundEffectsVolume(0.6);
  
  gameAudio.bufferGenerator.playBuffer(buffer, volume);
}

// Example: Enhanced game over
function playEnhancedGameOver() {
  const gameAudio = getGameAudio();
  if (!gameAudio || !gameAudio.isInitialized) return;

  const audioContext = gameAudio.audioContext.audioContext;
  
  if (!gameAudio.bufferGenerator) {
    // gameAudio.bufferGenerator = new AudioBufferGenerator(audioContext);
  }

  const buffer = gameAudio.bufferGenerator.generateGameOverBuffer();
  const volume = gameAudio.settings.getSoundEffectsVolume(1.0);
  
  gameAudio.bufferGenerator.playBuffer(buffer, volume);
}
