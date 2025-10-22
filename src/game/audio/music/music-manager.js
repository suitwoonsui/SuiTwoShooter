// ==========================================
// MUSIC MANAGER - BACKGROUND MUSIC AND THEMES
// ==========================================

class MusicManager {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.patterns = new MusicPatterns();
    this.composer = new MusicComposer(audioContext);
    
    // Current music state
    this.musicState = {
      currentPattern: 'melody',
      patternIndex: 0,
      layerIndex: 0,
      isPlaying: false,
      isBossMusic: false,
      tempo: 120 // BPM
    };
    
    this.musicTimeout = null;
    
    // Initialize music state with timeout method
    this.initializeMusicState();
  }
  
  // Initialize theme
  initializeTheme() {
    if (this.audioContext.isInitialized) {
      this.setTheme(5); // Default to Theme 5 (Action Packed)
    }
  }
  
  // Theme switching methods
  setTheme(themeNumber) {
    if (!this.audioContext.isInitialized) return;
    
    const theme = this.patterns.getTheme(themeNumber);
    if (theme) {
      // Store the current theme's patterns in the musicState for reference
      this.musicState.currentTheme = themeNumber;
      this.musicState.currentPatterns = theme;
      console.log(`Switched to Theme ${themeNumber}`);
    }
  }
  
  // Menu music - plays in menus, settings, etc.
  playMenuMusic(settings) {
    if (!this.audioContext.isInitialized || !settings.isBackgroundMusicEnabled()) return;
    
    this.stopBackgroundMusic();
    this.audioContext.resume();
    
    this.musicState.isPlaying = true;
    this.musicState.patternIndex = 0;
    this.musicState.layerIndex = 0;
    this.musicState.isBossMusic = false;
    
    // Use Theme 12 (Tranquil Space) for menu music
    this.setTheme(12);
    
    this.composer.playMenuComposition(this.musicState, settings, this.patterns);
  }

  // Gameplay music - plays during actual gameplay
  playGameplayMusic(settings) {
    console.log('🎵 playGameplayMusic() called');
    if (!this.audioContext.isInitialized || !settings.isBackgroundMusicEnabled()) {
      console.log('❌ Gameplay music blocked:', {
        isInitialized: this.audioContext.isInitialized,
        backgroundMusicEnabled: settings.isBackgroundMusicEnabled()
      });
      return;
    }
    
    // Always ensure Theme 5 is set for regular gameplay
    this.setTheme(5); // Default to Theme 5 (Action Packed)
    
    this.stopBackgroundMusic();
    this.audioContext.resume();
    
    this.musicState.isPlaying = true;
    this.musicState.patternIndex = 0;
    this.musicState.layerIndex = 0;
    this.musicState.isBossMusic = false;
    
    this.composer.playGameplayComposition(this.musicState, settings, this.patterns);
  }

  // Play boss music
  playBossMusic(settings) {
    console.log('🎵 playBossMusic() called');
    console.log('🔍 Debug info:', {
      isInitialized: this.audioContext.isInitialized,
      backgroundMusicEnabled: settings.isBackgroundMusicEnabled(),
      audioContextState: this.audioContext.getState(),
      gameSettings: typeof gameSettings !== 'undefined' ? {
        backgroundMusic: gameSettings.backgroundMusic,
        masterVolume: gameSettings.masterVolume
      } : 'gameSettings not available'
    });
    
    if (!this.audioContext.isInitialized) {
      console.log('❌ Boss music blocked - audio not initialized');
      return;
    }
    
    // Force enable background music for boss music (boss music should always play)
    if (!settings.isBackgroundMusicEnabled()) {
      console.log('⚠️ Background music disabled, but enabling for boss music');
      settings.setBackgroundMusicEnabled(true);
    }
    
    // Always ensure Theme 5 is set for regular gameplay
    this.setTheme(5); // Default to Theme 5 (Action Packed)
    
    this.stopBackgroundMusic();
    this.audioContext.resume();
    
    this.musicState.isPlaying = true;
    this.musicState.patternIndex = 0;
    this.musicState.layerIndex = 0;
    this.musicState.isBossMusic = true;
    
    console.log('🎵 Boss music state set, scheduling composition...');
    
    // Add a dramatic pause before boss music starts
    setTimeout(() => {
      if (this.musicState.isPlaying && this.musicState.isBossMusic) {
        console.log('🎵 Starting boss composition...');
        this.composer.playBossComposition(this.musicState, settings, this.patterns);
      } else {
        console.log('❌ Boss composition blocked - state changed');
      }
    }, 800); // 0.8 second pause
  }

  // Stop background music immediately
  stopBackgroundMusic() {
    // Stop the music by setting the playing flag
    this.musicState.isPlaying = false;
    
    // Clear any pending timeouts that might restart the music
    if (this.musicTimeout) {
      clearTimeout(this.musicTimeout);
      this.musicTimeout = null;
    }
    
    // Stop all active oscillators immediately
    this.audioContext.stopAllOscillators();
  }
  
  // Test specific theme
  testTheme(themeNumber, settings) {
    if (!this.audioContext.isInitialized) return;
    
    this.stopBackgroundMusic();
    this.setTheme(themeNumber);
    this.audioContext.resume();
    
    this.musicState.isPlaying = true;
    this.musicState.patternIndex = 0;
    this.musicState.layerIndex = 0;
    this.musicState.isBossMusic = false;
    
    // Use minimal sound for menu themes (9-12), full sound for gameplay themes (1-8)
    if (themeNumber >= 9 && themeNumber <= 12) {
      this.composer.playMenuThemeTest(this.musicState, settings, this.patterns, themeNumber);
    } else {
      this.composer.playRegularComposition(this.musicState, settings, this.patterns);
    }
  }
  
  // Test specific instrument
  testInstrument(instrumentType, settings) {
    if (!this.audioContext.isInitialized) return;
    
    this.stopBackgroundMusic();
    this.audioContext.resume();
    
    this.musicState.isPlaying = true;
    this.musicState.patternIndex = 0;
    this.musicState.layerIndex = 0;
    this.musicState.isBossMusic = false;
    
    this.composer.testInstrument(this.musicState, settings, this.patterns, instrumentType);
  }
  
  // Resume gameplay music after boss defeat (with pause)
  resumeGameplayMusic(settings) {
    console.log('🎵 resumeGameplayMusic() called');
    if (this.audioContext.isInitialized) {
      console.log('🔍 Resume debug info:', {
        backgroundMusicEnabled: settings.isBackgroundMusicEnabled(),
        isInitialized: this.audioContext.isInitialized,
        musicState: this.musicState
      });
      
      this.stopBackgroundMusic();
      this.audioContext.resume();
      
      // Ensure background music is enabled for gameplay
      if (!settings.isBackgroundMusicEnabled()) {
        console.log('⚠️ Enabling background music for gameplay');
        settings.setBackgroundMusicEnabled(true);
      }
      
      this.musicState.isPlaying = true;
      this.musicState.patternIndex = 0;
      this.musicState.layerIndex = 0;
      this.musicState.isBossMusic = false;
      
      console.log('🎵 Scheduling gameplay music restart...');
      
      // Add a brief pause before gameplay music resumes
      setTimeout(() => {
        if (this.musicState.isPlaying && !this.musicState.isBossMusic) {
          console.log('🎵 Starting gameplay music after victory pause');
          this.playGameplayMusic(settings);
        } else {
          console.log('❌ Gameplay music blocked - state changed');
        }
      }, 600); // 0.6 second pause
    } else {
      console.log('❌ resumeGameplayMusic called but audioContext not available');
    }
  }
  
  // Set music timeout for composition scheduling
  setMusicTimeout(callback, delay) {
    this.musicTimeout = setTimeout(callback, delay);
  }
  
  // Add setMusicTimeout method to musicState for composer access
  initializeMusicState() {
    this.musicState.setMusicTimeout = (callback, delay) => {
      this.setMusicTimeout(callback, delay);
    };
  }
  
  // Get statistics for debugging
  getStats() {
    return {
      isPlaying: this.musicState.isPlaying,
      isBossMusic: this.musicState.isBossMusic,
      currentTheme: this.musicState.currentTheme,
      tempo: this.musicState.tempo,
      hasTimeout: !!this.musicTimeout
    };
  }
}
