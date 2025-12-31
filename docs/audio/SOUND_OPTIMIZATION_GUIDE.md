# Sound Optimization Guide - Samples vs Programmatic

## Sound Priority Analysis

### ✅ **Keep Programmatic (Oscillators)**
These work well with oscillators and benefit from being dynamic:

1. **UI Sounds** - `menuClick`, `menuHover`
   - Simple, frequent, low impact
   - Current approach is perfect

2. **Simple Feedback** - `shoot`, `enemyHit`
   - Quick, frequent sounds
   - Current approach works well

3. **Procedural Sounds** - `coinCollect` (your jingle)
   - Dynamic, can vary
   - Audio buffers would enhance this (see below)

### 🎯 **Consider Audio Buffers** (Enhanced Programmatic)
More complex but still programmatic - better quality than oscillators:

1. **Explosions** - `playExplosion()`, `bossDestroyed`
   - Current: Simple oscillator sequence
   - Better: Audio buffer with noise + filters

2. **Impacts** - `playerHit`, `enemyDestroyed`
   - Current: Single oscillator
   - Better: Layered buffer with multiple frequencies

3. **Game State** - `gameOver`, `levelUp`
   - Current: Single oscillator
   - Better: Complex buffer with multiple layers

### 📦 **Consider Audio Samples** (Pre-recorded)
High-impact moments that would benefit from realistic sounds:

1. **Boss Destroyed** - `bossDestroyed`
   - High impact, infrequent
   - Sample would add dramatic weight

2. **Game Over** - `gameOver`
   - Emotional moment
   - Sample could add gravitas

3. **Large Explosions** - `playExplosion()` for bosses
   - Major events
   - Sample would be more impactful

**Note**: Samples require file storage. For a Neo-Tokyo themed game, audio buffers might be a better middle ground.

## Audio Buffer Generation Examples

### Enhanced Explosion Using Audio Buffer

```javascript
function generateExplosionBuffer(audioContext) {
  const sampleRate = audioContext.sampleRate;
  const duration = 0.5; // 500ms
  const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
  const data = buffer.getChannelData(0);
  
  for (let i = 0; i < buffer.length; i++) {
    const t = i / sampleRate;
    
    // Multiple frequency components for rich explosion
    const freq1 = 200 * Math.exp(-t * 4); // Low rumble
    const freq2 = 400 * Math.exp(-t * 6); // Mid crack
    const freq3 = 800 * Math.exp(-t * 8); // High pop
    
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
  
  return buffer;
}

function playEnhancedExplosion() {
  const gameAudio = getGameAudio();
  if (!gameAudio || !gameAudio.isInitialized) return;
  
  const audioContext = gameAudio.audioContext.audioContext;
  const buffer = generateExplosionBuffer(audioContext);
  
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  
  const gainNode = audioContext.createGain();
  gainNode.gain.setValueAtTime(
    gameAudio.settings.getSoundEffectsVolume(1.0),
    audioContext.currentTime
  );
  
  source.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  source.start();
}
```

### Enhanced Impact Sound Using Audio Buffer

```javascript
function generateImpactBuffer(audioContext, intensity = 1.0) {
  const sampleRate = audioContext.sampleRate;
  const duration = 0.15;
  const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
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
  
  return buffer;
}
```

### Enhanced Coin Collect (Your Jingle) Using Audio Buffer

```javascript
function generateCoinJingleBuffer(audioContext) {
  const sampleRate = audioContext.sampleRate;
  const duration = 0.18; // Match your current jingle duration
  const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
  const data = buffer.getChannelData(0);
  
  // Your current notes: C6 (1047Hz) and E6→G6 (1319→1568Hz)
  const note1Freq = 1047; // C6
  const note2StartFreq = 1319; // E6
  const note2EndFreq = 1568; // G6
  
  const note1Start = 0;
  const note1End = 0.07;
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
  
  return buffer;
}
```

## Integration Strategy

### Option 1: Hybrid Approach (Recommended)
- Keep oscillators for: UI, simple feedback
- Use audio buffers for: Explosions, impacts, complex effects
- Consider samples for: Boss destroyed, game over (if file size allows)

### Option 2: Full Audio Buffer Migration
- Convert all sounds to audio buffers
- More consistent quality
- Slightly more code complexity

### Option 3: Keep Current + Add Samples
- Keep current system as-is
- Add 2-3 key samples for high-impact moments
- Requires file storage/CDN

## Implementation Example

Add to `audio-context.js`:

```javascript
// Cache generated buffers for performance
bufferCache = {};

generateSoundBuffer(soundType, params = {}) {
  const cacheKey = `${soundType}_${JSON.stringify(params)}`;
  if (this.bufferCache[cacheKey]) {
    return this.bufferCache[cacheKey];
  }
  
  let buffer;
  switch(soundType) {
    case 'explosion':
      buffer = this.generateExplosionBuffer(params.intensity || 1.0);
      break;
    case 'impact':
      buffer = this.generateImpactBuffer(params.intensity || 1.0);
      break;
    case 'coinJingle':
      buffer = this.generateCoinJingleBuffer();
      break;
    // ... more types
  }
  
  this.bufferCache[cacheKey] = buffer;
  return buffer;
}
```

## File Size Comparison

- **Oscillators**: 0 bytes (generated on-the-fly)
- **Audio Buffers**: ~0 bytes (generated on-the-fly, cached)
- **Samples (WAV)**: ~50-200KB per sound (realistic explosion ~100KB)

## Recommendation

For your Neo-Tokyo shooter game:
1. **Keep oscillators** for UI and simple feedback
2. **Use audio buffers** for explosions, impacts, and complex effects
3. **Consider 1-2 samples** for boss destroyed and game over (if you want maximum impact)

This gives you the best balance of quality, file size, and flexibility.
