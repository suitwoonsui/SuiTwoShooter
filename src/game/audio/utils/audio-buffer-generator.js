// ==========================================
// AUDIO BUFFER GENERATOR - Enhanced Sound Generation
// ==========================================

/**
 * Audio Buffer Generator - Creates more complex sounds using pre-computed audio buffers
 * This provides better quality than simple oscillators while remaining programmatic
 */

class AudioBufferGenerator {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.bufferCache = {};
  }

  /**
   * Generate an explosion sound buffer
   * @param {number} intensity - Intensity multiplier (0.5 to 2.0)
   * @returns {AudioBuffer}
   */
  generateExplosionBuffer(intensity = 1.0) {
    const cacheKey = `explosion_${intensity}`;
    if (this.bufferCache[cacheKey]) {
      return this.bufferCache[cacheKey];
    }

    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.5;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;

      // Multiple frequency components for rich explosion
      const freq1 = 200 * intensity * Math.exp(-t * 4); // Low rumble
      const freq2 = 400 * intensity * Math.exp(-t * 6); // Mid crack
      const freq3 = 800 * intensity * Math.exp(-t * 8); // High pop

      // White noise component (filtered)
      const noise = (Math.random() * 2 - 1) * Math.exp(-t * 10);

      // Combine all components
      const wave1 = Math.sin(2 * Math.PI * freq1 * t) * 0.4;
      const wave2 = Math.sin(2 * Math.PI * freq2 * t) * 0.3;
      const wave3 = Math.sin(2 * Math.PI * freq3 * t) * 0.2;

      // Exponential decay envelope
      const envelope = Math.exp(-t * 5);

      data[i] = (wave1 + wave2 + wave3 + noise * 0.3) * envelope;
    }

    this.bufferCache[cacheKey] = buffer;
    return buffer;
  }

  /**
   * Generate an impact/hit sound buffer
   * @param {number} intensity - Intensity multiplier (0.5 to 2.0)
   * @returns {AudioBuffer}
   */
  generateImpactBuffer(intensity = 1.0) {
    const cacheKey = `impact_${intensity}`;
    if (this.bufferCache[cacheKey]) {
      return this.bufferCache[cacheKey];
    }

    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.15;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;

      // Sharp attack with quick decay
      const attackFreq = 800 * intensity;
      const decayFreq = 200 * intensity;
      const frequency = attackFreq * Math.exp(-t * 20) + decayFreq;

      // Mix of square and sine for punch
      const square = Math.sign(Math.sin(2 * Math.PI * frequency * t)) * 0.6;
      const sine = Math.sin(2 * Math.PI * frequency * t) * 0.4;

      // Quick attack, fast decay envelope
      const envelope = Math.exp(-t * 15);

      data[i] = (square + sine) * envelope * intensity;
    }

    this.bufferCache[cacheKey] = buffer;
    return buffer;
  }

  /**
   * Generate a coin jingle buffer (enhanced version of your current jingle)
   * @returns {AudioBuffer}
   */
  generateCoinJingleBuffer() {
    const cacheKey = 'coinJingle';
    if (this.bufferCache[cacheKey]) {
      return this.bufferCache[cacheKey];
    }

    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.18; // Match your current jingle duration
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    // Your current notes: C6 (1047Hz) and E6→G6 (1319→1568Hz)
    const note1Freq = 1047; // C6
    const note2StartFreq = 1319; // E6
    const note2EndFreq = 1568; // G6

    const note1Start = 0.05; // Note 2 starts at 0.05s (matching your current setup)
    const note1End = 0.12;
    const note2Start = 0.1;
    const note2End = 0.18;

    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      let sample = 0;

      // Note 1: C6 (triangle wave for softer sound)
      if (t >= note1Start && t < note1End) {
        const note1T = (t - note1Start) / (note1End - note1Start);
        const phase = note1Freq * t;
        // Triangle wave approximation
        const triangle = 2 * Math.abs(2 * (phase % 1) - 1) - 1;
        const envelope = Math.exp(-note1T * 8);
        sample += triangle * 0.22 * envelope;
      }

      // Note 2: E6→G6 with upward pitch
      if (t >= note2Start && t < note2End) {
        const note2T = (t - note2Start) / (note2End - note2Start);
        const currentFreq = note2StartFreq + (note2EndFreq - note2StartFreq) * note2T;
        const phase = currentFreq * t;
        const triangle = 2 * Math.abs(2 * (phase % 1) - 1) - 1;
        const envelope = Math.exp(-note2T * 6);
        sample += triangle * 0.2 * envelope;
      }

      data[i] = sample;
    }

    this.bufferCache[cacheKey] = buffer;
    return buffer;
  }

  /**
   * Generate a game over sound buffer
   * @returns {AudioBuffer}
   */
  generateGameOverBuffer() {
    const cacheKey = 'gameOver';
    if (this.bufferCache[cacheKey]) {
      return this.bufferCache[cacheKey];
    }

    const sampleRate = this.audioContext.sampleRate;
    const duration = 1.5;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;

      // Descending frequency for dramatic effect
      const startFreq = 300;
      const endFreq = 80;
      const frequency = startFreq * Math.exp(-t * 1.5) + endFreq;

      // Square wave for harsh, dramatic sound
      const square = Math.sign(Math.sin(2 * Math.PI * frequency * t));

      // Slow decay envelope
      const envelope = Math.exp(-t * 0.8);

      data[i] = square * 0.6 * envelope;
    }

    this.bufferCache[cacheKey] = buffer;
    return buffer;
  }

  /**
   * Play a sound from a generated buffer
   * @param {AudioBuffer} buffer - The audio buffer to play
   * @param {number} volume - Volume level (0.0 to 1.0)
   * @param {number} playbackRate - Playback speed (1.0 = normal)
   * @returns {AudioBufferSourceNode}
   */
  playBuffer(buffer, volume = 1.0, playbackRate = 1.0) {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      console.warn('Audio context not available or closed');
      return null;
    }

    // Resume audio context if suspended (required for user interaction)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = playbackRate;

    const gainNode = this.audioContext.createGain();
    const currentTime = this.audioContext.currentTime;
    gainNode.gain.setValueAtTime(volume, currentTime);

    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    source.start(currentTime);
    return source;
  }

  /**
   * Clear the buffer cache (useful for memory management)
   */
  clearCache() {
    this.bufferCache = {};
  }
}
