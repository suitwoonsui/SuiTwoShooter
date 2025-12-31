# Audio Samples Setup Guide

## Overview

The game now supports **pre-recorded audio files** (WAV/MP3/OGG) for realistic sounds. The system automatically falls back to synthesized sounds (buffers or oscillators) if audio files aren't found.

## How It Works

1. **Try Sample First** - Attempts to load and play the audio file
2. **Fallback to Buffer** - If sample fails and config says `fallback: 'buffer'`, uses audio buffer generator
3. **Fallback to Oscillator** - If sample fails and config says `fallback: 'oscillator'`, uses simple oscillator

## Setting Up Audio Files

### Step 1: Create Sounds Directory

Create a directory for your audio files:
```
assets/sounds/
```

### Step 2: Add Audio Files

Place your audio files in the `assets/sounds/` directory. Recommended files:

- `explosion.wav` - Regular explosion sound
- `explosion-large.wav` - Large/boss explosion
- `impact.wav` - Impact/hit sound
- `impact-heavy.wav` - Heavy impact
- `boss-destroyed.wav` - Boss destruction
- `game-over.wav` - Game over sound

**File Format Recommendations:**
- **WAV** - Best quality, larger file size (~100-200KB per sound)
- **OGG** - Good compression, smaller file size (~30-80KB per sound)
- **MP3** - Good compression, widely supported (~40-100KB per sound)

### Step 3: Configure Sample Paths

Edit `src/game/audio/utils/audio-sample-config.js` to match your file paths:

```javascript
const AUDIO_SAMPLE_CONFIG = {
  explosion: {
    url: 'assets/sounds/explosion.wav',  // Update this path
    fallback: 'buffer',
    volume: 1.0
  },
  // ... more samples
};
```

### Step 4: Test

1. Open Sound Test panel
2. Go to "🎵 Audio Samples" section
3. Click "Preload All Samples" to load files
4. Test individual samples

## File Size Guidelines

For a Neo-Tokyo themed game, keep samples small:

- **Explosions**: 50-150KB (0.5-1.5 seconds)
- **Impacts**: 20-50KB (0.1-0.3 seconds)
- **Game Over**: 100-200KB (1-2 seconds)

**Total recommended**: Keep under 500KB for all samples combined.

## Where to Get Audio Files

### Free Resources:
- **Freesound.org** - Free sound effects (requires attribution)
- **OpenGameArt.org** - Free game assets
- **Zapsplat.com** - Free sounds (requires free account)
- **Mixkit.co** - Free sound effects

### Search Terms:
- "explosion sound effect"
- "impact hit sound"
- "game over sound"
- "boss defeat sound"

## Testing Without Files

The system works even without audio files! It will:
1. Try to load the sample
2. If file not found, automatically fall back to:
   - Buffer generator (if `fallback: 'buffer'`)
   - Oscillator (if `fallback: 'oscillator'`)

So you can test the system immediately - it will use synthesized sounds until you add real files.

## Hybrid System Benefits

- **No files needed** - Works with synthesized sounds
- **Add files later** - Drop in audio files when ready
- **Automatic fallback** - Never fails, always plays something
- **Best of both worlds** - Realistic samples + programmatic sounds

## Example: Adding a New Sample

1. **Add file**: Place `my-sound.wav` in `assets/sounds/`

2. **Add config** in `audio-sample-config.js`:
```javascript
mySound: {
  url: 'assets/sounds/my-sound.wav',
  fallback: 'buffer',
  volume: 0.8
}
```

3. **Use in code**:
```javascript
const gameAudio = getGameAudio();
await gameAudio.sampleLoader.playSample('assets/sounds/my-sound.wav', 0.8);
```

Or use the config:
```javascript
const config = getSampleConfig('mySound');
await gameAudio.sampleLoader.playSample(config.url, config.volume);
```

## Performance Tips

1. **Preload samples** - Call `preloadAllSamples()` at game start
2. **Keep files small** - Compress audio files
3. **Use OGG** - Best compression for web
4. **Limit samples** - Only use for high-impact moments

## Current Configuration

See `src/game/audio/utils/audio-sample-config.js` for all configured samples.
