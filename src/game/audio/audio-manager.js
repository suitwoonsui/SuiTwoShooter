// ==========================================
// AUDIO MANAGER - MAIN COORDINATION CLASS
// ==========================================

class AudioManager {
  constructor() {
    this.audioContext = new AudioContextManager();
    this.soundEffects = new SoundEffectsManager(this.audioContext);
    this.music = new MusicManager(this.audioContext);
    this.settings = new AudioSettingsManager();
    
    this.isInitialized = false;
    
    this.init();
  }
  
  // Initialize audio system
  init() {
    try {
      this.audioContext.init();
      this.isInitialized = true;
      console.log('✓ Audio system initialized');
    } catch (error) {
      console.warn('⚠ Audio not supported:', error);
      this.isInitialized = false;
    }
  }
  
  // Resume audio context (required for user interaction)
  resumeContext() {
    this.audioContext.resume();
  }
  
  // Sound Effects API
  playSound(soundName, volume = 1.0) {
    if (!this.settings.soundEffectsEnabled || !this.isInitialized) return;
    this.soundEffects.playSound(soundName, volume, this.settings);
  }
  
  playSoundSequence(sounds) {
    if (!this.settings.soundEffectsEnabled || !this.isInitialized) return;
    this.soundEffects.playSoundSequence(sounds, this.settings);
  }
  
  // Music API
  playMenuMusic() {
    if (!this.isInitialized || !this.settings.backgroundMusicEnabled) return;
    this.music.playMenuMusic(this.settings);
  }
  
  playGameplayMusic() {
    if (!this.isInitialized || !this.settings.backgroundMusicEnabled) return;
    this.music.playGameplayMusic(this.settings);
  }
  
  playBossMusic() {
    if (!this.isInitialized) return;
    this.music.playBossMusic(this.settings);
  }
  
  stopBackgroundMusic() {
    this.music.stopBackgroundMusic();
  }
  
  setTheme(themeNumber) {
    this.music.setTheme(themeNumber);
  }
  
  // Settings API
  setMasterVolume(volume) {
    this.settings.setMasterVolume(volume);
  }
  
  setSoundEffectsVolume(volume) {
    this.settings.setSoundEffectsVolume(volume);
  }
  
  setBackgroundMusicVolume(volume) {
    this.settings.setBackgroundMusicVolume(volume);
  }
  
  setSoundEffectsEnabled(enabled) {
    this.settings.setSoundEffectsEnabled(enabled);
  }
  
  setBackgroundMusicEnabled(enabled) {
    this.settings.setBackgroundMusicEnabled(enabled);
    if (!enabled) {
      this.stopBackgroundMusic();
    }
  }
  
  // Specialized sound effects
  playExplosion() {
    this.soundEffects.playExplosion(this.settings);
  }
  
  playPowerUpCollect(isPositive = true) {
    this.soundEffects.playPowerUpCollect(isPositive, this.settings);
  }
  
  playBossSpawn() {
    this.soundEffects.playBossSpawn(this.settings);
  }
  
  playBossDestroyed() {
    this.soundEffects.playBossDestroyed(this.settings);
  }
  
  playGameOver() {
    this.stopBackgroundMusic();
    this.soundEffects.playGameOver(this.settings);
  }
  
  playLevelUp() {
    this.soundEffects.playLevelUp(this.settings);
  }
  
  // Force field sounds
  playForceFieldActivate() {
    this.soundEffects.playForceFieldActivate(this.settings);
  }
  
  playForceFieldPowerUp() {
    this.soundEffects.playForceFieldPowerUp(this.settings);
  }
  
  playForceFieldPowerDown() {
    this.soundEffects.playForceFieldPowerDown(this.settings);
  }
  
  playForceFieldDestroyed() {
    this.soundEffects.playForceFieldDestroyed(this.settings);
  }
  
  // Testing methods
  testTheme(themeNumber) {
    this.music.testTheme(themeNumber, this.settings);
  }
  
  testInstrument(instrumentType) {
    this.music.testInstrument(instrumentType, this.settings);
  }
  
  // Utility methods
  getAudioStats() {
    return {
      isInitialized: this.isInitialized,
      audioContext: this.audioContext.getStats(),
      soundEffects: this.soundEffects.getStats(),
      music: this.music.getStats(),
      settings: this.settings.getStats()
    };
  }
  
  cleanup() {
    this.music.stopBackgroundMusic();
    this.audioContext.cleanup();
  }
}

// Global audio manager instance
let gameAudio = null;

// Initialize audio system
function initGameAudio() {
  gameAudio = new AudioManager();
  
  // Load settings from the main game
  if (typeof gameSettings !== 'undefined') {
    console.log('🔧 Loading game settings:', {
      masterVolume: gameSettings.masterVolume,
      soundEffectsVolume: gameSettings.soundEffectsVolume,
      backgroundMusicVolume: gameSettings.backgroundMusicVolume,
      soundEffects: gameSettings.soundEffects,
      backgroundMusic: gameSettings.backgroundMusic
    });
    
    gameAudio.setMasterVolume(gameSettings.masterVolume / 100);
    gameAudio.setSoundEffectsVolume(gameSettings.soundEffectsVolume / 100);
    gameAudio.setBackgroundMusicVolume(gameSettings.backgroundMusicVolume / 100);
    gameAudio.setSoundEffectsEnabled(gameSettings.soundEffects);
    gameAudio.setBackgroundMusicEnabled(gameSettings.backgroundMusic);
  } else {
    console.log('⚠️ gameSettings not available during audio initialization');
  }
  
  console.log('✓ Game audio system ready');
}

// Export the global instance for external access
function getGameAudio() {
  return gameAudio;
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Small delay to ensure other systems are loaded
  setTimeout(initGameAudio, 100);
});
