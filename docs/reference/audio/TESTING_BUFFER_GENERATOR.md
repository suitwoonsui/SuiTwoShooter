# Testing the Audio Buffer Generator

## Quick Start

1. **Load the game** - The buffer generator script is automatically loaded when you enter the game
2. **Open Sound Test Panel** - Click "Sound Test" button on the main menu
3. **Find the Buffer Generator Section** - Scroll down to "🎚️ Audio Buffer Generator (Enhanced Sounds)"
4. **Click any button** to test the sounds!

## Available Test Sounds

- **💥 Enhanced Explosion** - Rich explosion with multiple frequency layers and noise
- **💣 Intense Explosion** - Same explosion but 1.5x intensity
- **⚡ Enhanced Impact** - Sharp impact sound with mixed waveforms
- **🔨 Heavy Impact** - Same impact but 1.5x intensity
- **🪙 Coin Jingle (Buffer)** - Your coin collect sound as an audio buffer
- **💀 Game Over (Buffer)** - Dramatic game over sound

## Troubleshooting

### "Buffer generator not available" Error

If you see this error, it means the `audio-buffer-generator.js` file isn't loaded. Check:

1. **File exists**: Make sure `src/game/audio/utils/audio-buffer-generator.js` exists
2. **Script loaded**: Check browser console for any script loading errors
3. **Load order**: The buffer generator must load before `audio-manager.js`

### No Sound Playing

1. **Check audio settings**: Make sure sound effects are enabled
2. **Check console**: Look for any JavaScript errors
3. **Check volume**: Make sure master volume and sound effects volume are up

## Manual Testing (Console)

You can also test directly from the browser console:

```javascript
// Get the audio manager
const gameAudio = getGameAudio();

// Check if buffer generator is available
console.log('Buffer generator:', gameAudio.bufferGenerator);

// Test an explosion
if (gameAudio.bufferGenerator) {
  const buffer = gameAudio.bufferGenerator.generateExplosionBuffer(1.0);
  const volume = gameAudio.settings.getSoundEffectsVolume(1.0);
  gameAudio.bufferGenerator.playBuffer(buffer, volume);
}
```

## Comparing Sounds

To compare oscillator vs buffer sounds:

1. **Test oscillator version**: Click "💀 Enemy Destroyed" in "Game Sounds" section
2. **Test buffer version**: Click "💥 Enhanced Explosion" in "Buffer Generator" section
3. **Listen for differences**: Buffer version should sound richer and more complex

## Next Steps

Once you've tested and like the buffer sounds, you can:

1. Replace existing sounds with buffer versions
2. Use buffers for new sounds
3. Mix and match (oscillators for simple sounds, buffers for complex ones)

See `SOUND_OPTIMIZATION_GUIDE.md` for implementation details.
