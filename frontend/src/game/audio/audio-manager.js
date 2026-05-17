// ==========================================
// AUDIO MANAGER - MAIN COORDINATION CLASS
// ==========================================

class AudioManager {
  constructor() {
    this.audioContext = new AudioContextManager();
    this.soundEffects = new SoundEffectsManager(this.audioContext);
    this.music = new MusicManager(this.audioContext);
    this.settings = new AudioSettingsManager();
    
    // Initialize buffer generator after audio context is ready
    this.bufferGenerator = null;
    
    // Initialize sample loader after audio context is ready
    this.sampleLoader = null;
    
    this.isInitialized = false;
    
    this.init();
  }
  
  // Initialize audio system
  init() {
    try {
      this.audioContext.init();
      this.isInitialized = true;
      
      // Initialize buffer generator if AudioBufferGenerator is available
      if (this.isInitialized && typeof AudioBufferGenerator !== 'undefined') {
        this.bufferGenerator = new AudioBufferGenerator(this.audioContext.audioContext);
        console.log('✓ Audio buffer generator initialized');
      }
      
      // Initialize sample loader if AudioSampleLoader is available
      if (this.isInitialized && typeof AudioSampleLoader !== 'undefined') {
        this.sampleLoader = new AudioSampleLoader(this.audioContext.audioContext);
        console.log('✓ Audio sample loader initialized');
      }
      
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

  playEnemyHit() {
    void this._tryPlayEnemyHitSampleThenOscillator();
  }

  playEnemyDestroyed() {
    void this._tryPlayEnemyDestroyedSampleThenOscillator();
  }

  playBossHit() {
    void this._tryPlayBossHitSampleThenOscillator();
  }

  playPlayerHit() {
    void this._tryPlayPlayerHitSampleThenOscillator();
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
    if (!this.isInitialized || !this.settings.backgroundMusicEnabled) return;
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
    if (this.music && typeof this.music.applySettings === 'function') {
      this.music.applySettings(this.settings);
    }
  }
  
  setSoundEffectsVolume(volume) {
    this.settings.setSoundEffectsVolume(volume);
  }
  
  setBackgroundMusicVolume(volume) {
    this.settings.setBackgroundMusicVolume(volume);
    if (this.music && typeof this.music.applySettings === 'function') {
      this.music.applySettings(this.settings);
    }
  }
  
  setSoundEffectsEnabled(enabled) {
    this.settings.setSoundEffectsEnabled(enabled);
  }
  
  setBackgroundMusicEnabled(enabled) {
    this.settings.setBackgroundMusicEnabled(enabled);
    if (!enabled) {
      this.stopBackgroundMusic();
    }
    if (this.music && typeof this.music.applySettings === 'function') {
      this.music.applySettings(this.settings);
    }
  }
  
  // Specialized sound effects. Game uses procedural/oscillator sounds (sound-effects.js); WAV sample path is legacy/unused.
  async playExplosion(useSample = false) {
    if (useSample && this.sampleLoader && typeof getSampleConfig === 'function') {
      const config = getSampleConfig('explosion');
      if (config) {
        try {
          const source = await this.sampleLoader.playSample(
            config.url,
            this.settings.getSoundEffectsVolume(config.volume)
          );
          if (source) {
            return; // Sample played successfully
          }
        } catch (error) {
          console.warn('Failed to play explosion sample, falling back:', error);
        }
        
        // Fallback based on config
        if (config.fallback === 'buffer' && this.bufferGenerator) {
          const buffer = this.bufferGenerator.generateExplosionBuffer(1.0);
          this.bufferGenerator.playBuffer(buffer, this.settings.getSoundEffectsVolume(config.volume));
          return;
        }
      }
    }
    
    // Fallback to oscillator-based explosion
    this.soundEffects.playExplosion(this.settings);
  }
  
  playPowerUpCollect(isPositive = true) {
    if (!isPositive) {
      void this._tryPlayPowerDownSampleThenOscillator();
      return;
    }
    void this._tryPlayPowerUpSampleOnly();
  }

  /** Positive power-up: asset-only (`Powerup14.ogg`). No procedural fallback. */
  async _tryPlayPowerUpSampleOnly() {
    if (!this.settings.isSoundEffectsEnabled() || !this.isInitialized) return;

    if (this.sampleLoader && typeof getSampleConfig === 'function') {
      const config = getSampleConfig('powerupCollect');
      if (config && config.url) {
        try {
          const source = await this.sampleLoader.playSample(
            config.url,
            this.settings.getSoundEffectsVolume(config.volume != null ? config.volume : 1.0)
          );
          if (source) return;
        } catch (error) {
          console.warn('Failed to play power-up sample:', error);
        }
      }
    }
  }

  /** Negative power-up: uses `Powerdown14.ogg` when available, else procedural. */
  async _tryPlayPowerDownSampleThenOscillator() {
    if (!this.settings.isSoundEffectsEnabled() || !this.isInitialized) return;

    if (this.sampleLoader && typeof getSampleConfig === 'function') {
      const config = getSampleConfig('powerupNegative');
      if (config && config.url) {
        try {
          const source = await this.sampleLoader.playSample(
            config.url,
            this.settings.getSoundEffectsVolume(config.volume != null ? config.volume : 1.0)
          );
          if (source) return;
        } catch (error) {
          console.warn('Failed to play power-down sample, using oscillator fallback:', error);
        }
      }
    }

    this.soundEffects.playPowerUpCollect(false, this.settings);
  }

  /** Enemy hit: uses `8-bit Sound Effects Pack 001/Hit 4.wav` when available, else procedural. */
  async _tryPlayEnemyHitSampleThenOscillator() {
    if (!this.settings.isSoundEffectsEnabled() || !this.isInitialized) return;

    if (this.sampleLoader && typeof getSampleConfig === 'function') {
      const config = getSampleConfig('enemyHit');
      if (config && config.url) {
        try {
          const source = await this.sampleLoader.playSample(
            config.url,
            this.settings.getSoundEffectsVolume(config.volume != null ? config.volume : 1.0)
          );
          if (source) return;
        } catch (error) {
          console.warn('Failed to play enemy hit sample, using oscillator fallback:', error);
        }
      }
    }

    this.soundEffects.playSound('enemyHit', 1.0, this.settings);
  }

  /** Enemy destroyed: uses `Explosion6.ogg` when available, else procedural. */
  async _tryPlayEnemyDestroyedSampleThenOscillator() {
    if (!this.settings.isSoundEffectsEnabled() || !this.isInitialized) return;

    if (this.sampleLoader && typeof getSampleConfig === 'function') {
      const config = getSampleConfig('enemyDestroyed');
      if (config && config.url) {
        try {
          const source = await this.sampleLoader.playSample(
            config.url,
            this.settings.getSoundEffectsVolume(config.volume != null ? config.volume : 1.0)
          );
          if (source) return;
        } catch (error) {
          console.warn('Failed to play enemy destroyed sample, using oscillator fallback:', error);
        }
      }
    }

    this.soundEffects.playSound('enemyDestroyed', 1.0, this.settings);
  }

  /** Boss hit: uses `Hit 2.wav` when available, else procedural. */
  async _tryPlayBossHitSampleThenOscillator() {
    if (!this.settings.isSoundEffectsEnabled() || !this.isInitialized) return;

    if (this.sampleLoader && typeof getSampleConfig === 'function') {
      const config = getSampleConfig('bossHit');
      if (config && config.url) {
        try {
          const source = await this.sampleLoader.playSample(
            config.url,
            this.settings.getSoundEffectsVolume(config.volume != null ? config.volume : 1.0)
          );
          if (source) return;
        } catch (error) {
          console.warn('Failed to play boss hit sample, using oscillator fallback:', error);
        }
      }
    }

    this.soundEffects.playSound('bossHit', 1.0, this.settings);
  }

  /** Player hit: uses `Hit 1.wav` when available, else procedural. */
  async _tryPlayPlayerHitSampleThenOscillator() {
    if (!this.settings.isSoundEffectsEnabled() || !this.isInitialized) return;

    if (this.sampleLoader && typeof getSampleConfig === 'function') {
      const config = getSampleConfig('playerHit');
      if (config && config.url) {
        try {
          const source = await this.sampleLoader.playSample(
            config.url,
            this.settings.getSoundEffectsVolume(config.volume != null ? config.volume : 1.0)
          );
          if (source) return;
        } catch (error) {
          console.warn('Failed to play player hit sample, using oscillator fallback:', error);
        }
      }
    }

    this.soundEffects.playSound('playerHit', 1.0, this.settings);
  }
  
  playBossSpawn() {
    this.soundEffects.playBossSpawn(this.settings);
  }
  
  async playBossDestroyed(useSample = true) {
    if (useSample && this.sampleLoader && typeof getSampleConfig === 'function') {
      const config = getSampleConfig('bossDestroyed');
      if (config) {
        try {
          const source = await this.sampleLoader.playSample(
            config.url,
            this.settings.getSoundEffectsVolume(config.volume)
          );
          if (source) {
            return; // Sample played successfully
          }
        } catch (error) {
          console.warn('Failed to play boss destroyed sample, falling back:', error);
        }
        
        // Fallback based on config
        if (config.fallback === 'buffer' && this.bufferGenerator) {
          const buffer = this.bufferGenerator.generateExplosionBuffer(1.5);
          this.bufferGenerator.playBuffer(buffer, this.settings.getSoundEffectsVolume(config.volume));
          return;
        }
      }
    }
    
    // Fallback to oscillator-based boss destroyed
    this.soundEffects.playBossDestroyed(this.settings);
  }
  
  async playGameOver(useSample = false) {
    this.stopBackgroundMusic();
    if (useSample && this.sampleLoader && typeof getSampleConfig === 'function') {
      const config = getSampleConfig('gameOver');
      if (config) {
        try {
          const source = await this.sampleLoader.playSample(
            config.url,
            this.settings.getSoundEffectsVolume(config.volume)
          );
          if (source) {
            return; // Sample played successfully
          }
        } catch (error) {
          console.warn('Failed to play game over sample, falling back:', error);
        }
        
        // Fallback based on config
        if (config.fallback === 'buffer' && this.bufferGenerator) {
          const buffer = this.bufferGenerator.generateGameOverBuffer();
          this.bufferGenerator.playBuffer(buffer, this.settings.getSoundEffectsVolume(config.volume));
          return;
        }
      }
    }
    
    // Fallback to oscillator-based game over
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
  // Idempotent init: avoid multiple AudioManager instances leaving old HTMLAudioElements playing.
  if (gameAudio) {
    return gameAudio;
  }

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
  return gameAudio;
}

// Export the global instance for external access
function getGameAudio() {
  return gameAudio;
}

// Initialize audio after scripts are loaded (not on DOMContentLoaded)
// Audio will be initialized when menu scripts load (see lazy-loader.js)
// This ensures gameSettings and other dependencies are available
