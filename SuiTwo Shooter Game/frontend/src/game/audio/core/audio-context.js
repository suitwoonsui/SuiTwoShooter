// ==========================================
// AUDIO CONTEXT MANAGER - WEB AUDIO API MANAGEMENT
// ==========================================

class AudioContextManager {
  constructor() {
    this.audioContext = null;
    this.isInitialized = false;
    
    // Performance optimization: cache oscillators
    this.oscillatorCache = [];
    this.maxCacheSize = 10;
    
    // Performance optimization: limit concurrent sounds
    this.maxConcurrentSounds = 8;
    this.activeSounds = 0;
    
    // Track active oscillators for immediate stopping
    this.activeOscillators = new Set();
  }
  
  // Initialize audio context
  init() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.isInitialized = true;
      console.log('✓ Audio context initialized');
    } catch (error) {
      console.warn('⚠ Audio not supported:', error);
      this.isInitialized = false;
    }
  }
  
  // Resume audio context (required for user interaction)
  resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }
  
  // Create oscillator for sound generation
  createOscillator(frequency, type = 'sine') {
    if (!this.isInitialized) return null;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    // Track active oscillators for immediate stopping
    this.activeOscillators.add(oscillator);
    
    // Clean up when oscillator stops
    oscillator.addEventListener('ended', () => {
      this.activeOscillators.delete(oscillator);
    });
    
    return { oscillator, gainNode };
  }
  
  // Create a noise generator (white, pink, or brown noise)
  createNoiseGenerator(type = 'white') {
    if (!this.isInitialized) return null;
    
    const bufferSize = this.audioContext.sampleRate * 2;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const output = buffer.getChannelData(0);
    
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      let white = Math.random() * 2 - 1;
      
      if (type === 'pink') {
        // Pink noise filtering
        white *= 0.5;
        lastOut = 0.99886 * lastOut + white * 0.0555179;
        output[i] = lastOut;
      } else if (type === 'brown') {
        // Brown noise (red noise) filtering
        white *= 0.25;
        lastOut = (lastOut + (0.02 * white)) / 1.02;
        output[i] = lastOut * 3.5;
      } else {
        // White noise
        output[i] = white;
      }
    }
    
    const noiseSource = this.audioContext.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;
    
    const gainNode = this.audioContext.createGain();
    noiseSource.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    return { source: noiseSource, gainNode };
  }
  
  // Create a filter (low-pass, high-pass, band-pass, notch)
  createFilter(type = 'lowpass', frequency = 1000, Q = 1) {
    if (!this.isInitialized) return null;
    
    const filter = this.audioContext.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    filter.Q.setValueAtTime(Q, this.audioContext.currentTime);
    
    return filter;
  }
  
  // Create a delay/echo effect
  createDelay(delayTime = 0.3, feedback = 0.3) {
    if (!this.isInitialized) return null;
    
    const delay = this.audioContext.createDelay(1.0);
    delay.delayTime.setValueAtTime(delayTime, this.audioContext.currentTime);
    
    const feedbackGain = this.audioContext.createGain();
    feedbackGain.gain.setValueAtTime(feedback, this.audioContext.currentTime);
    
    // Create feedback loop
    delay.connect(feedbackGain);
    feedbackGain.connect(delay);
    
    return { delay, feedbackGain };
  }
  
  // Create a distortion effect
  createDistortion(amount = 50) {
    if (!this.isInitialized) return null;
    
    const distortion = this.audioContext.createWaveShaper();
    const curve = new Float32Array(this.audioContext.sampleRate);
    const deg = Math.PI / 180;
    
    for (let i = 0; i < this.audioContext.sampleRate; i++) {
      const x = (i * 2) / this.audioContext.sampleRate - 1;
      curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
    }
    
    distortion.curve = curve;
    distortion.oversample = '4x';
    
    return distortion;
  }
  
  // Create a custom waveform from a function
  createCustomWaveform(waveFunction, sampleRate = 4096) {
    if (!this.isInitialized) return null;
    
    const real = new Float32Array(sampleRate);
    const imag = new Float32Array(sampleRate);
    
    for (let i = 0; i < sampleRate; i++) {
      const value = waveFunction(i / sampleRate);
      real[i] = value;
      imag[i] = 0;
    }
    
    const customWave = this.audioContext.createPeriodicWave(real, imag);
    return customWave;
  }
  
  // Create a complex sound with multiple oscillators, filters, and effects
  createComplexSound(config) {
    if (!this.isInitialized) return null;
    
    const {
      oscillators = [], // Array of {frequency, type, volume, startTime, duration}
      filters = [], // Array of {type, frequency, Q, applyTo}
      noise = null, // {type, volume, duration}
      delay = null, // {delayTime, feedback}
      distortion = null, // {amount}
      masterVolume = 1.0
    } = config;
    
    const masterGain = this.audioContext.createGain();
    masterGain.gain.setValueAtTime(masterVolume, this.audioContext.currentTime);
    
    const nodes = [];
    const currentTime = this.audioContext.currentTime;
    
    // Create oscillators
    oscillators.forEach(oscConfig => {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      
      osc.type = oscConfig.type || 'sine';
      osc.frequency.setValueAtTime(oscConfig.frequency, currentTime + (oscConfig.startTime || 0));
      
      if (oscConfig.frequencyRamp) {
        osc.frequency.exponentialRampToValueAtTime(
          oscConfig.frequencyRamp.to,
          currentTime + (oscConfig.startTime || 0) + oscConfig.frequencyRamp.duration
        );
      }
      
      gain.gain.setValueAtTime(0, currentTime + (oscConfig.startTime || 0));
      gain.gain.linearRampToValueAtTime(
        oscConfig.volume || 1.0,
        currentTime + (oscConfig.startTime || 0) + 0.01
      );
      gain.gain.exponentialRampToValueAtTime(
        0.01,
        currentTime + (oscConfig.startTime || 0) + (oscConfig.duration || 0.1)
      );
      
      osc.connect(gain);
      gain.connect(masterGain);
      
      osc.start(currentTime + (oscConfig.startTime || 0));
      osc.stop(currentTime + (oscConfig.startTime || 0) + (oscConfig.duration || 0.1));
      
      this.activeOscillators.add(osc);
      osc.addEventListener('ended', () => {
        this.activeOscillators.delete(osc);
      });
      
      nodes.push({ oscillator: osc, gain });
    });
    
    // Create noise generator if specified
    if (noise) {
      const noiseGen = this.createNoiseGenerator(noise.type || 'white');
      const noiseGain = noiseGen.gainNode;
      
      noiseGain.gain.setValueAtTime(0, currentTime);
      noiseGain.gain.linearRampToValueAtTime(noise.volume || 0.1, currentTime + 0.01);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, currentTime + (noise.duration || 0.1));
      
      noiseGen.source.connect(noiseGain);
      noiseGain.connect(masterGain);
      
      noiseGen.source.start(currentTime);
      noiseGen.source.stop(currentTime + (noise.duration || 0.1));
    }
    
    // Apply filters
    let output = masterGain;
    filters.forEach(filterConfig => {
      const filter = this.createFilter(
        filterConfig.type || 'lowpass',
        filterConfig.frequency || 1000,
        filterConfig.Q || 1
      );
      
      if (filterConfig.frequencyRamp) {
        filter.frequency.exponentialRampToValueAtTime(
          filterConfig.frequencyRamp.to,
          currentTime + filterConfig.frequencyRamp.duration
        );
      }
      
      output.disconnect();
      output.connect(filter);
      output = filter;
    });
    
    // Apply delay if specified
    if (delay) {
      const delayEffect = this.createDelay(delay.delayTime || 0.3, delay.feedback || 0.3);
      output.disconnect();
      output.connect(delayEffect.delay);
      delayEffect.delay.connect(masterGain);
      output = delayEffect.delay;
    }
    
    // Apply distortion if specified
    if (distortion) {
      const distortionEffect = this.createDistortion(distortion.amount || 50);
      output.disconnect();
      output.connect(distortionEffect);
      output = distortionEffect;
    }
    
    // Connect final output
    output.connect(this.audioContext.destination);
    
    return { nodes, masterGain, cleanup: () => {
      nodes.forEach(node => {
        try {
          node.oscillator.stop();
          node.oscillator.disconnect();
        } catch (e) {}
      });
    }};
  }
  
  // Check if we can play more sounds (performance limit)
  canPlaySound() {
    return this.activeSounds < this.maxConcurrentSounds;
  }
  
  // Increment active sound counter
  incrementActiveSounds() {
    this.activeSounds++;
  }
  
  // Decrement active sound counter
  decrementActiveSounds() {
    this.activeSounds = Math.max(0, this.activeSounds - 1);
  }
  
  // Stop all active oscillators immediately
  stopAllOscillators() {
    this.activeOscillators.forEach(oscillator => {
      try {
        oscillator.stop();
        oscillator.disconnect();
      } catch (e) {
        // Oscillator might already be stopped
      }
    });
    this.activeOscillators.clear();
  }
  
  // Get current time for scheduling
  getCurrentTime() {
    return this.audioContext ? this.audioContext.currentTime : 0;
  }
  
  // Get audio context state
  getState() {
    return this.audioContext ? this.audioContext.state : 'not initialized';
  }
  
  // Get statistics for debugging
  getStats() {
    return {
      isInitialized: this.isInitialized,
      state: this.getState(),
      activeSounds: this.activeSounds,
      maxConcurrentSounds: this.maxConcurrentSounds,
      oscillatorCacheSize: this.oscillatorCache.length,
      maxCacheSize: this.maxCacheSize,
      activeOscillators: this.activeOscillators.size
    };
  }
  
  // Clean up resources
  cleanup() {
    this.stopAllOscillators();
    this.activeSounds = 0;
    this.oscillatorCache = [];
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}
