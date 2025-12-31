# Enhanced Sound System - Advanced Sound Generation

The audio system now supports multiple ways to generate sounds with much more variety and character.

## New Capabilities

### 1. **Noise Generators**
Generate white, pink, or brown noise for explosions, impacts, and atmospheric effects.

```javascript
const gameAudio = getGameAudio();
const audioContext = gameAudio.audioContext.audioContext;

// Create white noise (harsh, full spectrum)
const whiteNoise = audioContext.createNoiseGenerator('white');

// Create pink noise (softer, more natural)
const pinkNoise = audioContext.createNoiseGenerator('pink');

// Create brown noise (deep rumble, very smooth)
const brownNoise = audioContext.createNoiseGenerator('brown');
```

### 2. **Audio Filters**
Shape sounds with low-pass, high-pass, band-pass, and notch filters.

```javascript
// Low-pass filter (muffled, warm sound)
const lowPass = audioContext.createFilter('lowpass', 1000, 1);

// High-pass filter (bright, cutting sound)
const highPass = audioContext.createFilter('highpass', 500, 1);

// Band-pass filter (focused frequency range)
const bandPass = audioContext.createFilter('bandpass', 800, 5);

// Notch filter (removes specific frequency)
const notch = audioContext.createFilter('notch', 1000, 10);
```

### 3. **Delay/Echo Effects**
Add spatial depth and echo to sounds.

```javascript
const delay = audioContext.createDelay(0.3, 0.3); // 0.3s delay, 30% feedback
```

### 4. **Distortion**
Add grit, character, and intensity to sounds.

```javascript
const distortion = audioContext.createDistortion(50); // Amount: 0-100
```

### 5. **Custom Waveforms**
Create unique waveforms from mathematical functions.

```javascript
// Create a custom waveform
const customWave = audioContext.createCustomWaveform((phase) => {
  // Return a value between -1 and 1
  return Math.sin(phase * 2 * Math.PI) * 0.5 + 
         Math.sin(phase * 4 * Math.PI) * 0.3;
});
```

### 6. **Complex Sound Builder**
Combine multiple techniques for rich, layered sounds.

```javascript
const complexSound = audioContext.createComplexSound({
  oscillators: [
    {
      frequency: 440,
      type: 'sine',
      volume: 0.5,
      startTime: 0,
      duration: 0.2,
      frequencyRamp: { to: 880, duration: 0.2 }
    },
    {
      frequency: 660,
      type: 'triangle',
      volume: 0.3,
      startTime: 0.1,
      duration: 0.15
    }
  ],
  noise: {
    type: 'white',
    volume: 0.1,
    duration: 0.05
  },
  filters: [
    {
      type: 'lowpass',
      frequency: 2000,
      Q: 2,
      frequencyRamp: { to: 500, duration: 0.2 }
    }
  ],
  delay: {
    delayTime: 0.2,
    feedback: 0.2
  },
  distortion: {
    amount: 30
  },
  masterVolume: 0.8
});
```

## Example Sound Effects

### Enhanced Explosion Sound
```javascript
function playEnhancedExplosion() {
  const gameAudio = getGameAudio();
  if (!gameAudio || !gameAudio.isInitialized) return;
  
  const audioContext = gameAudio.audioContext.audioContext;
  const currentTime = audioContext.currentTime;
  
  // Use complex sound builder for rich explosion
  audioContext.createComplexSound({
    oscillators: [
      { frequency: 200, type: 'sawtooth', volume: 0.8, startTime: 0, duration: 0.3 },
      { frequency: 150, type: 'square', volume: 0.6, startTime: 0, duration: 0.4 },
      { frequency: 100, type: 'triangle', volume: 0.4, startTime: 0, duration: 0.5 }
    ],
    noise: { type: 'white', volume: 0.3, duration: 0.2 },
    filters: [
      { type: 'lowpass', frequency: 2000, Q: 1, frequencyRamp: { to: 200, duration: 0.5 } }
    ],
    distortion: { amount: 40 },
    masterVolume: gameAudio.settings.getSoundEffectsVolume(1.0)
  });
}
```

### Metallic Impact Sound
```javascript
function playMetallicImpact() {
  const gameAudio = getGameAudio();
  if (!gameAudio || !gameAudio.isInitialized) return;
  
  const audioContext = gameAudio.audioContext.audioContext;
  const currentTime = audioContext.currentTime;
  
  // Sharp, metallic sound with high frequencies
  audioContext.createComplexSound({
    oscillators: [
      { frequency: 2000, type: 'square', volume: 0.6, startTime: 0, duration: 0.05 },
      { frequency: 3000, type: 'triangle', volume: 0.4, startTime: 0, duration: 0.08 }
    ],
    filters: [
      { type: 'bandpass', frequency: 2500, Q: 5 }
    ],
    delay: { delayTime: 0.1, feedback: 0.1 },
    masterVolume: gameAudio.settings.getSoundEffectsVolume(0.8)
  });
}
```

### Sci-Fi Power-Up Sound
```javascript
function playSciFiPowerUp() {
  const gameAudio = getGameAudio();
  if (!gameAudio || !gameAudio.isInitialized) return;
  
  const audioContext = gameAudio.audioContext.audioContext;
  
  // Ascending frequency sweep with filter
  audioContext.createComplexSound({
    oscillators: [
      {
        frequency: 400,
        type: 'sine',
        volume: 0.7,
        startTime: 0,
        duration: 0.5,
        frequencyRamp: { to: 1200, duration: 0.5 }
      }
    ],
    filters: [
      {
        type: 'lowpass',
        frequency: 2000,
        Q: 2,
        frequencyRamp: { to: 4000, duration: 0.5 }
      }
    ],
    masterVolume: gameAudio.settings.getSoundEffectsVolume(0.9)
  });
}
```

### Rumble/Shake Effect
```javascript
function playRumble() {
  const gameAudio = getGameAudio();
  if (!gameAudio || !gameAudio.isInitialized) return;
  
  const audioContext = gameAudio.audioContext.audioContext;
  const currentTime = audioContext.currentTime;
  
  // Deep brown noise with low-pass filter
  const noiseGen = audioContext.createNoiseGenerator('brown');
  const filter = audioContext.createFilter('lowpass', 200, 1);
  const gain = audioContext.createGain();
  
  noiseGen.source.connect(gain);
  gain.connect(filter);
  filter.connect(audioContext.destination);
  
  gain.gain.setValueAtTime(0, currentTime);
  gain.gain.linearRampToValueAtTime(0.3, currentTime + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.5);
  
  noiseGen.source.start(currentTime);
  noiseGen.source.stop(currentTime + 0.5);
}
```

## Integration with Existing System

All new methods are available through the `audioContext` object:

```javascript
const gameAudio = getGameAudio();
const audioContext = gameAudio.audioContext.audioContext; // Get the raw Web Audio API context

// Use any of the new methods
const noise = audioContext.createNoiseGenerator('pink');
const filter = audioContext.createFilter('lowpass', 1000);
const complex = audioContext.createComplexSound({ /* config */ });
```

## Performance Considerations

- Noise generators create buffers that are cached and reused
- Complex sounds with many oscillators may impact performance
- Filters and effects add minimal overhead
- The system still enforces the 8 concurrent sound limit

## Next Steps

1. Replace simple sounds with enhanced versions using filters and effects
2. Add noise layers to explosion and impact sounds
3. Use delay/echo for spatial effects
4. Experiment with custom waveforms for unique character
5. Combine techniques for signature game sounds
