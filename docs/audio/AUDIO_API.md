# Audio API Documentation

## Overview

The SuiTwo Shooter Game uses a comprehensive audio system built on the Web Audio API. The system provides a clean interface for game systems to trigger sound effects and background music without directly interacting with the underlying audio implementation.

## Architecture

- **`game-audio.js`** - Core audio manager with Web Audio API implementation
- **Wrapper Functions** - Clean API surface for game systems
- **Consistent Pattern** - All systems use the same calling pattern with error handling

## Available Sound Functions

### Player Actions

#### `playShootSound()`
- **Purpose**: Plays when player fires a projectile
- **Usage**: Called in `player-projectiles.js` when creating projectiles
- **Sound**: Magical "pew" sound with frequency sweep (600Hz → 400Hz)
- **Example**:
```javascript
if (typeof playShootSound === 'function') {
  playShootSound();
}
```

#### `playPlayerHitSound()`
- **Purpose**: Plays when player takes damage
- **Usage**: Called in collision systems when player is hit
- **Sound**: Low-frequency impact sound (200Hz, 0.3s duration)
- **Example**:
```javascript
if (typeof playPlayerHitSound === 'function') {
  playPlayerHitSound();
}
```

### Enemy Interactions

#### `playEnemyHitSound()`
- **Purpose**: Plays when enemy is hit by projectile
- **Usage**: Called in `main.js` when projectile hits enemy
- **Sound**: Sawtooth wave impact (400Hz, 0.15s duration)

#### `playEnemyDestroyedSound()`
- **Purpose**: Plays when enemy is destroyed
- **Usage**: Called in `main.js` when enemy HP reaches zero
- **Sound**: Triangle wave destruction (200Hz, 0.3s duration)

### Collectibles

#### `playCoinCollectSound()`
- **Purpose**: Plays when player collects a coin
- **Usage**: Called in `collectibles.js` when coin is collected
- **Sound**: High-frequency chime (1000Hz, 0.1s duration)

#### `playPowerUpSound(isPositive)`
- **Purpose**: Plays when player collects powerup or powerdown
- **Usage**: Called in `collectibles.js` for both powerups and powerdowns
- **Parameters**:
  - `isPositive` (boolean): `true` for powerup bonus, `false` for powerdown
- **Sounds**:
  - Powerup: Rising sine wave (600Hz, 0.2s duration)
  - Powerdown: Low square wave (300Hz, 0.25s duration)
- **Example**:
```javascript
if (typeof playPowerUpSound === 'function') {
  playPowerUpSound(true);  // For powerup bonus
  playPowerUpSound(false); // For powerdown
}
```

### Boss Mechanics

#### `playBossSpawnSound()`
- **Purpose**: Plays when boss appears
- **Usage**: Called in `bosses.js` when boss is created
- **Sound**: Deep sawtooth wave (150Hz, 0.5s duration)

#### `playBossHitSound()`
- **Purpose**: Plays when boss is hit by projectile
- **Usage**: Called in `main.js` when projectile hits boss
- **Sound**: Triangle wave impact (250Hz, 0.2s duration)

#### `playBossDestroyedSound()`
- **Purpose**: Plays when boss is defeated
- **Usage**: Called in `main.js` when boss HP reaches zero
- **Sound**: Complex explosion sequence followed by destruction sound

### Force Field System

#### `playForceFieldSound()`
- **Purpose**: Plays when force field activates (5 coin streak)
- **Usage**: Called in `collectibles.js` when force field level 1 activates
- **Sound**: Methodical startup sequence (400Hz → 1000Hz over 1s)

#### `playForceFieldPowerUpSound()`
- **Purpose**: Plays when force field upgrades (10 coin streak)
- **Usage**: Called in `collectibles.js` when force field upgrades to level 2
- **Sound**: Ascending sequence (200Hz → 800Hz over 1.2s)

#### `playForceFieldPowerDownSound()`
- **Purpose**: Plays when force field takes damage
- **Usage**: Called in collision systems when force field is hit
- **Sound**: Descending sequence (600Hz → 150Hz over 0.8s)

#### `playForceFieldDestroyedSound()`
- **Purpose**: Plays when force field is completely destroyed
- **Usage**: Called in collision systems when force field HP reaches zero
- **Sound**: Dramatic destruction sequence (300Hz → 80Hz over 1.5s)

### Game State Sounds

#### `playGameOverSound()`
- **Purpose**: Plays when game ends
- **Usage**: Called in `main.js` when game over condition is met
- **Sound**: Low square wave (200Hz, 1s duration)
- **Note**: Also stops background music

#### `playLevelUpSound()`
- **Purpose**: Plays when player levels up (future feature)
- **Usage**: Reserved for future level progression system
- **Sound**: Rising sine wave (800Hz, 0.3s duration)

### Background Music

#### `startBackgroundMusic()`
- **Purpose**: Starts the background music loop
- **Usage**: Called when game starts or music is enabled
- **Sound**: Simple melody pattern (C4-E4-G4-C5-G4-E4-C4)

#### `stopBackgroundMusic()`
- **Purpose**: Stops the background music
- **Usage**: Called when game ends or music is disabled
- **Note**: Automatically called by `playGameOverSound()`

## Integration Pattern

All game systems should use this consistent pattern:

```javascript
// Check if audio function exists before calling
if (typeof playSomeSound === 'function') {
  playSomeSound();
}
```

This pattern ensures:
- **Graceful degradation** if audio system fails to load
- **No errors** if audio functions are undefined
- **Consistent behavior** across all systems

## Audio Settings Integration

The audio system integrates with game settings:

```javascript
// Settings are automatically loaded from gameSettings object
gameAudio.setMasterVolume(gameSettings.masterVolume / 100);
gameAudio.setSoundEffectsEnabled(gameSettings.soundEffects);
gameAudio.setBackgroundMusicEnabled(gameSettings.backgroundMusic);
```

## Sound Effect Definitions

All sound effects are defined in `game-audio.js` with these properties:
- **frequency**: Base frequency in Hz
- **duration**: Sound length in seconds
- **type**: Wave type ('sine', 'square', 'sawtooth', 'triangle')
- **volume**: Volume multiplier (0.0 - 2.0)

## Advanced Features

### Complex Sound Sequences
Some sounds use multiple frequencies for richer effects:
- **Explosions**: Multiple overlapping frequencies
- **Force field activation**: Methodical startup sequence
- **Boss destruction**: Explosion followed by destruction sound

### Volume Management
- **Master volume**: Controls overall audio level
- **Sound-specific volume**: Individual volume compensation per sound
- **Background music**: Lower volume (10% of master) to avoid overpowering effects

## Error Handling

The audio system includes comprehensive error handling:
- **Web Audio API support**: Graceful fallback if not supported
- **Audio context suspension**: Automatic resume on user interaction
- **Missing sound definitions**: Warning logged, no errors thrown
- **Function existence checks**: All systems check function availability

## Future Extensions

The audio system is designed for easy extension:
- **New sound effects**: Add to `soundEffects` object in `GameAudioManager`
- **New wrapper functions**: Follow existing naming pattern
- **Complex sequences**: Use `playSoundSequence()` for multi-part sounds
- **Music variations**: Extend `musicPattern` array for different melodies

## Troubleshooting

### Common Issues
1. **No sound**: Check if `gameAudio.isInitialized` is true
2. **Missing sounds**: Verify function name matches wrapper function
3. **Volume issues**: Check `gameSettings.masterVolume` and individual sound volumes
4. **Browser compatibility**: Ensure Web Audio API is supported

### Debug Information
The audio system logs initialization status:
- `✓ Audio system initialized` - Success
- `⚠ Audio not supported` - Web Audio API not available
- `✓ Game audio system ready` - Full system ready
