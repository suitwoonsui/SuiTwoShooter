// ==========================================
// MUSIC COMPOSER - MUSIC COMPOSITION AND PLAYBACK LOGIC
// ==========================================

class MusicComposer {
  constructor(audioContext) {
    this.audioContext = audioContext;
  }
  
  // Play note with specified parameters
  playNote(note, duration, startTime, layer = 'melody', instrument = 'auto', settings, patterns) {
    const frequency = patterns.noteToFrequency(note);
    
    // Select instrument based on layer or override
    let waveType = 'sine';
    if (instrument === 'auto') {
      switch(layer) {
        case 'melody': waveType = 'triangle'; break;  // Soft, melodic
        case 'bass': waveType = 'sawtooth'; break;   // Deep, rich bass
        case 'harmony': waveType = 'square'; break;   // Hollow, supporting
      }
    } else {
      waveType = instrument;
    }
    
    const { oscillator, gainNode } = this.audioContext.createOscillator(frequency, waveType);
    
    if (!oscillator) return;
    
    // Different volumes for different layers and instruments
    let volume = 0.1;
    switch(layer) {
      case 'melody': 
        volume = waveType === 'sawtooth' ? 0.08 : 0.12; // Reduce sawtooth melody volume
        break;
      case 'bass': 
        volume = waveType === 'sawtooth' ? 0.05 : 0.08; // Reduce sawtooth bass volume
        break;
      case 'harmony': 
        volume = waveType === 'sawtooth' ? 0.04 : 0.06; // Reduce sawtooth harmony volume
        break;
    }
    
    const finalVolume = settings.getBackgroundMusicVolume(volume);
    gainNode.gain.setValueAtTime(finalVolume, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
    
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  }
  
  // Play layer (melody, bass, or harmony)
  playLayer(layerName, musicState, settings, patterns) {
    // Choose pattern based on boss music state or current theme
    let patternKey;
    if (musicState.isBossMusic) {
      patternKey = `boss${layerName.charAt(0).toUpperCase() + layerName.slice(1)}`;
    } else {
      // Use current theme's patterns
      patternKey = musicState.currentPatterns ? musicState.currentPatterns[layerName] : layerName;
    }
    const pattern = patterns.getPattern(patternKey);
    const currentTime = this.audioContext.getCurrentTime();
    let noteTime = currentTime;
    
    console.log(`Music - playing layer: ${layerName}, patternKey: ${patternKey}, pattern exists:`, !!pattern);
    
    if (!pattern || pattern.length === 0) {
      console.warn(`Pattern not found: ${patternKey}`);
      return currentTime;
    }
    
    pattern.forEach(note => {
      this.playNote(note.note, note.duration, noteTime, layerName, 'auto', settings, patterns);
      noteTime += note.duration;
    });
    
    return noteTime;
  }
  
  // Menu music composition (gentle, minimal)
  playMenuComposition(musicState, settings, patterns) {
    if (!musicState.isPlaying) return;
    
    const playComposition = () => {
      if (!musicState.isPlaying) return;
      
      const currentTime = this.audioContext.getCurrentTime();
      
      // Play melody only (ultra-minimal menu music)
      const melodyEndTime = this.playLayer('melody', musicState, settings, patterns);
      
      // Schedule next composition
      const maxEndTime = melodyEndTime;
      musicState.setMusicTimeout(() => {
        if (musicState.isPlaying) {
          playComposition();
        }
      }, (maxEndTime - currentTime) * 1000);
    };
    
    playComposition();
  }
  
  // Gameplay music composition (full layers)
  playGameplayComposition(musicState, settings, patterns) {
    if (!musicState.isPlaying) return;
    
    const playComposition = () => {
      if (!musicState.isPlaying) return;
      
      const currentTime = this.audioContext.getCurrentTime();
      
      // Play all layers simultaneously
      const melodyEndTime = this.playLayer('melody', musicState, settings, patterns);
      const bassEndTime = this.playLayer('bass', musicState, settings, patterns);
      const harmonyEndTime = this.playLayer('harmony', musicState, settings, patterns);
      
      // Schedule next composition
      const maxEndTime = Math.max(melodyEndTime, bassEndTime, harmonyEndTime);
      musicState.setMusicTimeout(() => {
        if (musicState.isPlaying) {
          playComposition();
        }
      }, (maxEndTime - currentTime) * 1000);
    };
    
    playComposition();
  }
  
  // Boss music composition (aggressive, dramatic)
  playBossComposition(musicState, settings, patterns) {
    if (!musicState.isPlaying) return;
    
    const playComposition = () => {
      if (!musicState.isPlaying) return;
      
      const currentTime = this.audioContext.getCurrentTime();
      
      // Play all boss layers simultaneously
      const melodyEndTime = this.playLayer('melody', musicState, settings, patterns);
      const bassEndTime = this.playLayer('bass', musicState, settings, patterns);
      const harmonyEndTime = this.playLayer('harmony', musicState, settings, patterns);
      
      // Schedule next composition
      const maxEndTime = Math.max(melodyEndTime, bassEndTime, harmonyEndTime);
      musicState.setMusicTimeout(() => {
        if (musicState.isPlaying && musicState.isBossMusic) {
          playComposition();
        }
      }, (maxEndTime - currentTime) * 1000);
    };
    
    playComposition();
  }
  
  // Regular music composition (standard gameplay)
  playRegularComposition(musicState, settings, patterns) {
    if (!musicState.isPlaying) return;
    
    const playComposition = () => {
      if (!musicState.isPlaying) return;
      
      const currentTime = this.audioContext.getCurrentTime();
      
      // Play all regular layers simultaneously
      const melodyEndTime = this.playLayer('melody', musicState, settings, patterns);
      const bassEndTime = this.playLayer('bass', musicState, settings, patterns);
      const harmonyEndTime = this.playLayer('harmony', musicState, settings, patterns);
      
      // Schedule next composition
      const maxEndTime = Math.max(melodyEndTime, bassEndTime, harmonyEndTime);
      musicState.setMusicTimeout(() => {
        if (musicState.isPlaying && !musicState.isBossMusic) {
          playComposition();
        }
      }, (maxEndTime - currentTime) * 1000);
    };
    
    playComposition();
  }
  
  // Test menu themes with minimal sound (melody only)
  playMenuThemeTest(musicState, settings, patterns, themeNumber) {
    if (!musicState.isPlaying) return;
    
    const playComposition = () => {
      if (!musicState.isPlaying) return;
      
      const currentTime = this.audioContext.getCurrentTime();
      
      // Play melody and harmony (gentle menu theme test)
      const melodyEndTime = this.playLayer('melody', musicState, settings, patterns);
      const harmonyEndTime = this.playLayer('harmony', musicState, settings, patterns);
      
      // Schedule next composition
      const maxEndTime = Math.max(melodyEndTime, harmonyEndTime);
      musicState.setMusicTimeout(() => {
        if (musicState.isPlaying) {
          playComposition();
        }
      }, (maxEndTime - currentTime) * 1000);
    };
    
    playComposition();
  }
  
  // Test specific instrument
  testInstrument(musicState, settings, patterns, instrumentType) {
    if (!musicState.isPlaying) return;
    
    const playLayer = (layerName) => {
      // Use current theme's patterns
      const patternKey = musicState.currentPatterns ? musicState.currentPatterns[layerName] : layerName;
      const pattern = patterns.getPattern(patternKey);
      const currentTime = this.audioContext.getCurrentTime();
      
      if (!pattern || pattern.length === 0) return currentTime;
      
      let startTime = currentTime;
      pattern.forEach(note => {
        this.playNote(note.note, note.duration, startTime, layerName, instrumentType, settings, patterns);
        startTime += note.duration;
      });
      
      return startTime;
    };
    
    // Play all layers with the specified instrument
    const melodyEndTime = playLayer('melody');
    const bassEndTime = playLayer('bass');
    const harmonyEndTime = playLayer('harmony');
    
    const maxEndTime = Math.max(melodyEndTime, bassEndTime, harmonyEndTime);
    
    // Schedule next loop
    musicState.setMusicTimeout(() => {
      if (musicState.isPlaying) {
        this.testInstrument(musicState, settings, patterns, instrumentType);
      }
    }, (maxEndTime - this.audioContext.getCurrentTime()) * 1000);
    
    console.log(`Testing instrument: ${instrumentType}`);
  }
}
