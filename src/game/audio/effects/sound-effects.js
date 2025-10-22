// ==========================================
// SOUND EFFECTS MANAGER - INDIVIDUAL SOUND EFFECTS AND SEQUENCES
// ==========================================

class SoundEffectsManager {
  constructor(audioContext) {
    this.audioContext = audioContext;
    
    // Enhanced sound effect definitions with improved audio design
    this.soundEffects = {
      // Player actions - more magical and satisfying
      shoot: { frequency: 450, duration: 0.1, type: 'sine', volume: 1.0 },
      playerHit: { frequency: 180, duration: 0.4, type: 'square', volume: .4 },
      
      // Enemy interactions - more impactful and varied
      enemyHit: { frequency: 300, duration: 0.08, type: 'triangle', volume: 0.6 },
      enemyDestroyed: { frequency: 120, duration: 0.4, type: 'sawtooth', volume: 0.2 },
      
      // Collectibles - more rewarding and distinct
      powerupCollect: { frequency: 700, duration: 0.15, type: 'sine', volume: 0.9 },
      powerupNegative: { frequency: 250, duration: 0.3, type: 'square', volume: .3 },
      coinCollect: { frequency: 900, duration: 0.4, type: 'sine', volume: 0.6 },
      
      // Boss encounters - more dramatic and intimidating
      bossHit: { frequency: 200, duration: 0.25, type: 'triangle', volume: 1.0 },
      bossDestroyed: { frequency: 80, duration: 1.2, type: 'sawtooth', volume: 1.0 },
      
      // Game state - more emotional impact
      gameOver: { frequency: 150, duration: 1.5, type: 'square', volume: 1.0 },
      levelUp: { frequency: 900, duration: 0.4, type: 'sine', volume: 0.8 },
      
      // Force field system - more sci-fi and methodical
      forceFieldActivate: { frequency: 400, duration: 1.5, type: 'square', volume: 2.2 },
      forceFieldPowerUp: { frequency: 600, duration: 1.2, type: 'sine', volume: 1.4 },
      forceFieldPowerDown: { frequency: 400, duration: 1.0, type: 'triangle', volume: 1.0 },
      forceFieldDestroyed: { frequency: 150, duration: 1.5, type: 'square', volume: 0.4 },
      
      // UI and feedback sounds
      menuClick: { frequency: 600, duration: 0.05, type: 'sine', volume: 0.6 },
      menuHover: { frequency: 700, duration: 0.03, type: 'sine', volume: 0.4 },
      achievement: { frequency: 800, duration: 0.3, type: 'sine', volume: 0.8 },
      warning: { frequency: 400, duration: 0.2, type: 'square', volume: 1.0 },
      success: { frequency: 900, duration: 0.2, type: 'sine', volume: 0.8 }
    };
  }
  
  // Play a sound effect with performance optimizations
  playSound(soundName, volume = 1.0, settings) {
    if (!settings.isSoundEffectsEnabled() || !this.audioContext.isInitialized) return;
    
    // Performance check: limit concurrent sounds
    if (!this.audioContext.canPlaySound()) {
      console.warn('Max concurrent sounds reached, skipping:', soundName);
      return;
    }
    
    const soundDef = this.soundEffects[soundName];
    if (!soundDef) {
      console.warn(`Sound effect '${soundName}' not found`);
      return;
    }
    
    this.audioContext.resume();
    this.audioContext.incrementActiveSounds();
    
    const { oscillator, gainNode } = this.audioContext.createOscillator(soundDef.frequency, soundDef.type);
    if (!oscillator) {
      this.audioContext.decrementActiveSounds();
      return;
    }
    
    // Set volume with master volume control and sound-specific compensation
    const soundVolume = soundDef.volume || 1.0;
    const finalVolume = settings.getSoundEffectsVolume(volume * soundVolume);
    gainNode.gain.setValueAtTime(finalVolume, this.audioContext.getCurrentTime());
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.getCurrentTime() + soundDef.duration);
    
    // Play the sound
    oscillator.start(this.audioContext.getCurrentTime());
    oscillator.stop(this.audioContext.getCurrentTime() + soundDef.duration);
    
    // Clean up after sound finishes
    setTimeout(() => {
      this.audioContext.decrementActiveSounds();
    }, soundDef.duration * 1000);
  }
  
  // Play multiple sounds in sequence (for complex effects)
  playSoundSequence(sounds, settings) {
    if (!settings.isSoundEffectsEnabled() || !this.audioContext.isInitialized) return;
    
    let currentTime = this.audioContext.getCurrentTime();
    
    sounds.forEach(sound => {
      const { oscillator, gainNode } = this.audioContext.createOscillator(sound.frequency, sound.type);
      if (!oscillator) return;
      
      const finalVolume = settings.getSoundEffectsVolume(sound.volume || 1.0);
      gainNode.gain.setValueAtTime(finalVolume, currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + sound.duration);
      
      oscillator.start(currentTime);
      oscillator.stop(currentTime + sound.duration);
      
      currentTime += sound.duration;
    });
  }
  
  // Play explosion effect (multiple frequencies)
  playExplosion(settings) {
    if (!settings.isSoundEffectsEnabled() || !this.audioContext.isInitialized) return;
    
    const explosionSounds = [
      { frequency: 200, duration: 0.3, type: 'sawtooth', volume: 0.8 },
      { frequency: 150, duration: 0.4, type: 'square', volume: 0.6 },
      { frequency: 100, duration: 0.5, type: 'triangle', volume: 0.4 }
    ];
    
    this.playSoundSequence(explosionSounds, settings);
  }
  
  // Play power-up collection effect
  playPowerUpCollect(isPositive = true, settings) {
    if (isPositive) {
      this.playSound('powerupCollect', 1.0, settings);
    } else {
      this.playSound('powerupNegative', 1.0, settings);
    }
  }
  
  // Play boss-related sounds
  playBossSpawn(settings) {
    this.playSound('bossSpawn', 1.0, settings);
  }
  
  playBossDestroyed(settings) {
    this.playExplosion(settings);
    setTimeout(() => this.playSound('bossDestroyed', 1.0, settings), 300);
  }
  
  // Play game state sounds
  playGameOver(settings) {
    this.playSound('gameOver', 1.0, settings);
  }
  
  playLevelUp(settings) {
    this.playSound('levelUp', 1.0, settings);
  }
  
  // Play force field activation (gentle sci-fi startup sequence)
  playForceFieldActivate(settings) {
    if (!settings.isSoundEffectsEnabled() || !this.audioContext.isInitialized) return;
    
    this.audioContext.resume();
    const steps = 4;
    const duration = 1.5;
    const stepDuration = duration / steps;
    const startFreq = 250;
    const endFreq = 450;
    const freqStep = (endFreq - startFreq) / (steps - 1);
    
    for (let i = 0; i < steps; i++) {
      const frequency = startFreq + (freqStep * i);
      const startTime = this.audioContext.getCurrentTime() + (stepDuration * i);
      
      // Use only sine waves for gentle, smooth sound
      const { oscillator, gainNode } = this.audioContext.createOscillator(frequency, 'sine');
      if (!oscillator) continue;
      
      // Much more prominent volume increase - similar to power down
      const volumeMultiplier = 0.4 + (i * 0.2); // 0.4, 0.6, 0.8, 1.0 - much louder
      const noteDuration = stepDuration * 0.8; // Shorter notes so they don't overlap
      
      const finalVolume = settings.getSoundEffectsVolume(volumeMultiplier);
      gainNode.gain.setValueAtTime(finalVolume, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + noteDuration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + noteDuration);
    }
  }
  
  // Play force field power up (enhanced upgrade sequence)
  playForceFieldPowerUp(settings) {
    if (!settings.isSoundEffectsEnabled() || !this.audioContext.isInitialized) return;
    
    this.audioContext.resume();
    const steps = 6;
    const duration = 1.2;
    const stepDuration = duration / steps;
    const startFreq = 200;
    const endFreq = 600;
    const freqStep = (endFreq - startFreq) / (steps - 1);
    
    for (let i = 0; i < steps; i++) {
      const frequency = startFreq + (freqStep * i);
      const startTime = this.audioContext.getCurrentTime() + (stepDuration * i);
      
      // Use sine wave for smoother, less harsh sound
      const { oscillator, gainNode } = this.audioContext.createOscillator(frequency, 'sine');
      if (!oscillator) continue;
      
      // Much more prominent volume - peaks higher like power down
      const volumeMultiplier = 0.5 + Math.sin((i / steps) * Math.PI) * 0.5; // 0.5 to 1.0 peak - much louder
      const noteDuration = stepDuration + (i * 0.03);
      
      const finalVolume = settings.getSoundEffectsVolume(volumeMultiplier);
      gainNode.gain.setValueAtTime(finalVolume, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + noteDuration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + noteDuration);
    }
  }
  
  // Play force field power down (enhanced damage sequence)
  playForceFieldPowerDown(settings) {
    if (!settings.isSoundEffectsEnabled() || !this.audioContext.isInitialized) return;
    
    this.audioContext.resume();
    const steps = 6;
    const duration = 1.0;
    const stepDuration = duration / steps;
    const startFreq = 600;
    const endFreq = 200;
    const freqStep = (endFreq - startFreq) / (steps - 1);
    
    for (let i = 0; i < steps; i++) {
      const frequency = startFreq + (freqStep * i);
      const startTime = this.audioContext.getCurrentTime() + (stepDuration * i);
      
      // Use triangle wave for smoother, more ominous descent
      const { oscillator, gainNode } = this.audioContext.createOscillator(frequency, 'triangle');
      if (!oscillator) continue;
      
      // Increased volume for better audibility - starts higher and decreases less dramatically
      const volumeMultiplier = 0.35 - (i * 0.04); // 0.35, 0.31, 0.27, 0.23, 0.19, 0.15
      const noteDuration = stepDuration + (i * 0.05);
      
      const finalVolume = settings.getSoundEffectsVolume(volumeMultiplier);
      gainNode.gain.setValueAtTime(finalVolume, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + noteDuration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + noteDuration);
    }
  }
  
  // Play force field destroyed (enhanced catastrophic failure sequence)
  playForceFieldDestroyed(settings) {
    if (!settings.isSoundEffectsEnabled() || !this.audioContext.isInitialized) return;
    
    this.audioContext.resume();
    const steps = 4;
    const duration = 1.5;
    const stepDuration = duration / steps;
    const startFreq = 400;
    const endFreq = 80;
    const freqStep = (endFreq - startFreq) / (steps - 1);
    
    for (let i = 0; i < steps; i++) {
      const frequency = startFreq + (freqStep * i);
      const startTime = this.audioContext.getCurrentTime() + (stepDuration * i);
      
      // Use square wave for harsh, mechanical failure sound
      const { oscillator, gainNode } = this.audioContext.createOscillator(frequency, 'square');
      if (!oscillator) continue;
      
      // Volume increases dramatically for catastrophic effect
      const volumeMultiplier = 0.2 + (i * 0.2); // 0.2, 0.4, 0.6, 0.8
      const noteDuration = stepDuration + (i * 0.05);
      
      const finalVolume = settings.getSoundEffectsVolume(volumeMultiplier);
      gainNode.gain.setValueAtTime(finalVolume, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + noteDuration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + noteDuration);
    }
    
    // Add a final low-frequency rumble for impact
    setTimeout(() => {
      const { oscillator, gainNode } = this.audioContext.createOscillator(60, 'square');
      if (oscillator) {
        const finalVolume = settings.getSoundEffectsVolume(0.3);
        gainNode.gain.setValueAtTime(finalVolume, this.audioContext.getCurrentTime());
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.getCurrentTime() + 0.3);
        
        oscillator.start(this.audioContext.getCurrentTime());
        oscillator.stop(this.audioContext.getCurrentTime() + 0.3);
      }
    }, duration * 1000);
  }
  
  // Get statistics for debugging
  getStats() {
    return {
      soundEffectsCount: Object.keys(this.soundEffects).length,
      activeSounds: this.audioContext.activeSounds,
      maxConcurrentSounds: this.audioContext.maxConcurrentSounds
    };
  }
}
