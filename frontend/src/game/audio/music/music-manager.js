// ==========================================
// MUSIC MANAGER - BACKGROUND MUSIC AND THEMES
// ==========================================

/**
 * Per-role loudness trim: multiplied with the user's background music level, then clamped to [0, 1].
 * HTMLMediaElement volume cannot exceed 1, so this mainly attenuates louder masters to match quieter ones.
 * Tune by ear, or measure integrated loudness (e.g. LUFS) in a DAW and convert to a linear ratio.
 */
const DEFAULT_MUSIC_LOUDNESS_TRIM = Object.freeze({
  menu: 1,
  gameplay: 1,
  boss: 1,
});

class MusicManager {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.patterns = new MusicPatterns();
    this.composer = new MusicComposer(audioContext);

    /** @type {{ menu: number, gameplay: number, boss: number }} */
    this.musicLoudnessTrim = { ...DEFAULT_MUSIC_LOUDNESS_TRIM };

    // Disable procedural (synth) music globally. Asset tracks only.
    this.enableProceduralMusic = false;

    // Asset-based boss music (pre-made track)
    this.bossMusicAssetRelUrl = 'assets/Music/fearme31.ogg';
    this._bossMusicEl = null;

    // Asset-based regular gameplay music (pre-made track)
    this.gameplayMusicAssetRelUrl = 'assets/Music/as_fast_as_you_can_2.31_low.ogg';
    this._gameplayMusicEl = null;

    // Asset-based menu music (pre-made track)
    this.menuMusicAssetRelUrl = 'assets/Music/GameLoops/Chillstep_2.wav';
    this._menuMusicEl = null;
    
    // Current music state
    this.musicState = {
      currentPattern: 'melody',
      patternIndex: 0,
      layerIndex: 0,
      isPlaying: false,
      isBossMusic: false,
      tempo: 120 // BPM
    };
    
    // Procedural scheduler: track ALL timeouts so we can stop cleanly when switching music modes.
    this.musicTimeout = null; // last scheduled (legacy)
    this._musicTimeouts = new Set(); // all active timeouts
    
    // Initialize music state with timeout method
    this.initializeMusicState();
  }

  _safeSetElVolume(el, volume) {
    if (!el) return;
    try {
      el.volume = Math.max(0, Math.min(1, Number(volume) || 0));
    } catch (_) {}
  }

  /** User BGM level × per-track trim, clamped to [0, 1]. */
  _elementBgmVolume(settings, role) {
    const base =
      settings && typeof settings.getBackgroundMusicVolume === 'function' ? settings.getBackgroundMusicVolume(1.0) : 1.0;
    const trim = this.musicLoudnessTrim && typeof this.musicLoudnessTrim[role] === 'number' ? this.musicLoudnessTrim[role] : 1;
    return Math.max(0, Math.min(1, base * trim));
  }

  // Apply latest settings to any active asset tracks (volume + enabled state)
  applySettings(settings) {
    if (!settings) return;
    const enabled =
      typeof settings.isBackgroundMusicEnabled === 'function' ? settings.isBackgroundMusicEnabled() : !!settings.backgroundMusicEnabled;
    if (!enabled) {
      this.stopBackgroundMusic();
      return;
    }
    this._safeSetElVolume(this._menuMusicEl, this._elementBgmVolume(settings, 'menu'));
    this._safeSetElVolume(this._gameplayMusicEl, this._elementBgmVolume(settings, 'gameplay'));
    this._safeSetElVolume(this._bossMusicEl, this._elementBgmVolume(settings, 'boss'));
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

    // Replace any previous menu element
    try {
      if (this._menuMusicEl) {
        this._menuMusicEl.pause();
        this._menuMusicEl.currentTime = 0;
      }
    } catch (_) {}

    const el = new Audio(this.menuMusicAssetRelUrl);
    el.loop = true;
    el.preload = 'auto';
    el.volume = this._elementBgmVolume(settings, 'menu');
    this._menuMusicEl = el;

    el.play().catch((err) => {
      console.warn('Failed to play menu music asset:', err);
      this._menuMusicEl = null;
    });
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

    // Stop any prior music (procedural + asset-based)
    this.stopBackgroundMusic();
    this.audioContext.resume();

    this.musicState.isPlaying = true;
    this.musicState.patternIndex = 0;
    this.musicState.layerIndex = 0;
    this.musicState.isBossMusic = false;

    // Replace any previous gameplay element
    try {
      if (this._gameplayMusicEl) {
        this._gameplayMusicEl.pause();
        this._gameplayMusicEl.currentTime = 0;
      }
    } catch (_) {}

    const el = new Audio(this.gameplayMusicAssetRelUrl);
    el.loop = true;
    el.preload = 'auto';
    el.volume = this._elementBgmVolume(settings, 'gameplay');
    this._gameplayMusicEl = el;

    el.play().catch((err) => {
      console.warn('Failed to play gameplay music asset:', err);
      this._gameplayMusicEl = null;
    });
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
    
    // Check if music is enabled - respect user's preference
    if (!settings.isBackgroundMusicEnabled()) {
      console.log('⚠️ Boss music blocked - background music is disabled');
      return;
    }

    // Stop any procedural background music first
    this.stopBackgroundMusic();

    // Resume audio context (policy) then play asset track as boss music
    this.audioContext.resume();

    // Mark state as "boss music" for callers/debug, even though playback is asset-based
    this.musicState.isPlaying = true;
    this.musicState.patternIndex = 0;
    this.musicState.layerIndex = 0;
    this.musicState.isBossMusic = true;

    // Build/replace the audio element
    try {
      if (this._bossMusicEl) {
        this._bossMusicEl.pause();
        this._bossMusicEl.currentTime = 0;
      }
    } catch (_) {}

    const el = new Audio(this.bossMusicAssetRelUrl);
    el.loop = true;
    el.preload = 'auto';
    el.volume = this._elementBgmVolume(settings, 'boss');
    this._bossMusicEl = el;

    // Small dramatic pause before starting
    setTimeout(() => {
      if (!this.musicState.isPlaying || !this.musicState.isBossMusic) return;
      el.play().catch((err) => {
        console.warn('Failed to play boss music asset:', err);
        this._bossMusicEl = null;
      });
    }, 800);
  }

  // Stop background music immediately
  stopBackgroundMusic() {
    // Stop the music by setting the playing flag
    this.musicState.isPlaying = false;
    
    // Clear any pending timeouts that might restart procedural music
    if (this.musicTimeout) {
      clearTimeout(this.musicTimeout);
      this.musicTimeout = null;
    }
    if (this._musicTimeouts && this._musicTimeouts.size) {
      this._musicTimeouts.forEach((id) => clearTimeout(id));
      this._musicTimeouts.clear();
    }
    
    // Stop all active oscillators immediately
    this.audioContext.stopAllOscillators();

    // Stop any asset-based boss music element
    if (this._bossMusicEl) {
      try {
        this._bossMusicEl.pause();
        this._bossMusicEl.currentTime = 0;
      } catch (_) {}
      this._bossMusicEl = null;
    }

    // Stop any asset-based gameplay music element
    if (this._gameplayMusicEl) {
      try {
        this._gameplayMusicEl.pause();
        this._gameplayMusicEl.currentTime = 0;
      } catch (_) {}
      this._gameplayMusicEl = null;
    }

    // Stop any asset-based menu music element
    if (this._menuMusicEl) {
      try {
        this._menuMusicEl.pause();
        this._menuMusicEl.currentTime = 0;
      } catch (_) {}
      this._menuMusicEl = null;
    }
  }
  
  // Test specific theme
  testTheme(themeNumber, settings) {
    if (!this.audioContext.isInitialized) return;
    if (!this.enableProceduralMusic) {
      console.warn('Procedural theme testing is disabled (asset-only music).');
      return;
    }
    
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
    if (!this.enableProceduralMusic) {
      console.warn('Procedural instrument testing is disabled (asset-only music).');
      return;
    }
    
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
      
      // Respect user's background music setting; do not auto-enable
      if (!settings.isBackgroundMusicEnabled()) {
        console.log('❌ Resume blocked - background music is disabled by settings');
        return;
      }

      this.stopBackgroundMusic();
      this.audioContext.resume();
      
      this.musicState.isPlaying = true;
      this.musicState.patternIndex = 0;
      this.musicState.layerIndex = 0;
      this.musicState.isBossMusic = false;
      
      console.log('🎵 Scheduling gameplay music restart...');
      
      // Add a brief pause before gameplay music resumes
      setTimeout(() => {
        if (this.musicState.isPlaying && !this.musicState.isBossMusic) {
          console.log('🎵 Starting gameplay music after victory pause');
          // Asset-only gameplay music
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
    const id = setTimeout(() => {
      try {
        callback();
      } finally {
        if (this._musicTimeouts) this._musicTimeouts.delete(id);
        if (this.musicTimeout === id) this.musicTimeout = null;
      }
    }, delay);
    this.musicTimeout = id;
    if (this._musicTimeouts) this._musicTimeouts.add(id);
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
