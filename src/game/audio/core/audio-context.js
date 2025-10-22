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
