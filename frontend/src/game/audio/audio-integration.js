// ==========================================
// AUDIO INTEGRATION - COMPATIBILITY LAYER FOR MAIN GAME
// ==========================================

// Audio integration functions for the main game
function playShootSound() {
  const gameAudio = getGameAudio();
  if (gameAudio) {
    // Create magical orb launch sound - simpler approach
    if (gameAudio.settings.isSoundEffectsEnabled() && gameAudio.isInitialized) {
      gameAudio.resumeContext();
      
      // Create a magical "pew" sound with frequency sweep
      const startFreq = 600;
      const endFreq = 400;
      const duration = 0.12;
      
      const { oscillator, gainNode } = gameAudio.audioContext.createOscillator(startFreq, 'sine');
      if (!oscillator) return;
      
      // Frequency sweep from high to low (like energy dissipating)
      oscillator.frequency.setValueAtTime(startFreq, gameAudio.audioContext.getCurrentTime());
      oscillator.frequency.exponentialRampToValueAtTime(endFreq, gameAudio.audioContext.getCurrentTime() + duration);
      
      // Volume envelope - quick attack, quick decay
      const finalVolume = gameAudio.settings.getSoundEffectsVolume(0.4);
      gainNode.gain.setValueAtTime(0, gameAudio.audioContext.getCurrentTime());
      gainNode.gain.linearRampToValueAtTime(finalVolume, gameAudio.audioContext.getCurrentTime() + 0.01); // Quick attack
      gainNode.gain.exponentialRampToValueAtTime(0.01, gameAudio.audioContext.getCurrentTime() + duration);
      
      oscillator.start(gameAudio.audioContext.getCurrentTime());
      oscillator.stop(gameAudio.audioContext.getCurrentTime() + duration);
    }
  }
}

function playEnemyHitSound() {
  console.log('🔊 [AUDIO] playEnemyHitSound() called');
  const gameAudio = getGameAudio();
  if (gameAudio) {
    console.log('🔊 [AUDIO] gameAudio found, calling playEnemyHit()');
    if (typeof gameAudio.playEnemyHit === 'function') {
      gameAudio.playEnemyHit();
    } else {
      gameAudio.playSound('enemyHit');
    }
  } else {
    console.warn('🔊 [AUDIO] playEnemyHitSound: gameAudio not available');
  }
}

function playEnemyDestroyedSound() {
  const gameAudio = getGameAudio();
  if (gameAudio) {
    if (typeof gameAudio.playEnemyDestroyed === 'function') {
      gameAudio.playEnemyDestroyed();
    } else {
      gameAudio.playSound('enemyDestroyed');
    }
  }
}

function playCoinCollectSound() {
  const gameAudio = getGameAudio();
  if (!gameAudio || !gameAudio.settings.isSoundEffectsEnabled() || !gameAudio.isInitialized) return;
  
  gameAudio.resumeContext();
  
  // Access the actual Web Audio API context (not the wrapper)
  const audioContext = gameAudio.audioContext.audioContext;
  if (!audioContext) return;
  
  const currentTime = audioContext.currentTime;
  
  // Create a coin jingle - quick sequence of notes like coins clinking together
  // Note 1: First coin hit (quick, bright) - DISABLED FOR TESTING
  // const note1 = audioContext.createOscillator();
  // const gain1 = audioContext.createGain();
  // note1.type = 'triangle'; // Softer than square, but still has character
  // note1.frequency.setValueAtTime(880, currentTime); // A5
  // gain1.gain.setValueAtTime(0, currentTime);
  // gain1.gain.linearRampToValueAtTime(gameAudio.settings.getSoundEffectsVolume(0.25), currentTime + 0.01);
  // gain1.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.08);
  // note1.connect(gain1);
  // gain1.connect(audioContext.destination);
  // note1.start(currentTime);
  // note1.stop(currentTime + 0.08);
  
  // Note 2: Second coin (slightly delayed, different pitch)
  const note2 = audioContext.createOscillator();
  const gain2 = audioContext.createGain();
  note2.type = 'triangle';
  note2.frequency.setValueAtTime(1047, currentTime + 0.05); // C6 - higher
  gain2.gain.setValueAtTime(0, currentTime + 0.05);
  gain2.gain.linearRampToValueAtTime(gameAudio.settings.getSoundEffectsVolume(0.22), currentTime + 0.06);
  gain2.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.12);
  note2.connect(gain2);
  gain2.connect(audioContext.destination);
  note2.start(currentTime + 0.05);
  note2.stop(currentTime + 0.12);
  
  // Note 3: Third coin (completes the jingle, high pitch that goes even higher)
  const note3 = audioContext.createOscillator();
  const gain3 = audioContext.createGain();
  note3.type = 'triangle';
  note3.frequency.setValueAtTime(1319, currentTime + 0.1); // E6 - high pitch
  note3.frequency.exponentialRampToValueAtTime(1568, currentTime + 0.18); // G6 - even higher!
  gain3.gain.setValueAtTime(0, currentTime + 0.1);
  gain3.gain.linearRampToValueAtTime(gameAudio.settings.getSoundEffectsVolume(0.2), currentTime + 0.11);
  gain3.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.18);
  note3.connect(gain3);
  gain3.connect(audioContext.destination);
  note3.start(currentTime + 0.1);
  note3.stop(currentTime + 0.18);
  
  // Track active sounds
  gameAudio.audioContext.incrementActiveSounds();
  setTimeout(() => {
    gameAudio.audioContext.decrementActiveSounds();
  }, 180);
}

function playPowerUpSound(isPositive) {
  const gameAudio = getGameAudio();
  if (gameAudio) gameAudio.playPowerUpCollect(isPositive);
}

function playBossHitSound() {
  const gameAudio = getGameAudio();
  if (gameAudio) {
    if (typeof gameAudio.playBossHit === 'function') {
      gameAudio.playBossHit();
    } else {
      gameAudio.playSound('bossHit');
    }
  }
}

function playBossDestroyedSound() {
  const gameAudio = getGameAudio();
  if (gameAudio) gameAudio.playBossDestroyed();
}

function playGameOverSound() {
  const gameAudio = getGameAudio();
  if (gameAudio) gameAudio.playGameOver();
}

function playLevelUpSound() {
  const gameAudio = getGameAudio();
  if (gameAudio) gameAudio.playLevelUp();
}

function playForceFieldSound() {
  const gameAudio = getGameAudio();
  if (gameAudio) gameAudio.playForceFieldActivate();
}

function playForceFieldPowerUpSound() {
  const gameAudio = getGameAudio();
  if (gameAudio) gameAudio.playForceFieldPowerUp();
}

function playForceFieldPowerDownSound() {
  const gameAudio = getGameAudio();
  if (gameAudio) gameAudio.playForceFieldPowerDown();
}

function playForceFieldDestroyedSound() {
  const gameAudio = getGameAudio();
  if (gameAudio) gameAudio.playForceFieldDestroyed();
}

// UI and feedback audio functions
function playMenuClickSound() {
  const gameAudio = getGameAudio();
  if (gameAudio) gameAudio.playSound('menuClick');
}

function playMenuHoverSound() {
  const gameAudio = getGameAudio();
  if (gameAudio) gameAudio.playSound('menuHover');
}

function playAchievementSound() {
  const gameAudio = getGameAudio();
  if (gameAudio) gameAudio.playSound('achievement');
}

function playWarningSound() {
  const gameAudio = getGameAudio();
  if (gameAudio) gameAudio.playSound('warning');
}

function playSuccessSound() {
  const gameAudio = getGameAudio();
  if (gameAudio) gameAudio.playSound('success');
}

// Enhanced player hit sound
function playPlayerHitSound() {
  const gameAudio = getGameAudio();
  if (gameAudio) {
    if (typeof gameAudio.playPlayerHit === 'function') {
      gameAudio.playPlayerHit();
    } else {
      gameAudio.playSound('playerHit');
    }
  }
}

// Wrapper functions for easy access
function startMenuMusic() {
  const gameAudio = getGameAudio();
  if (gameAudio) {
    gameAudio.resumeContext();
    gameAudio.playMenuMusic();
  }
}

function startGameplayMusic() {
  const gameAudio = getGameAudio();
  if (gameAudio) {
    gameAudio.resumeContext();
    gameAudio.playGameplayMusic();
  }
}

function stopBackgroundMusic() {
  const gameAudio = getGameAudio();
  if (gameAudio) gameAudio.stopBackgroundMusic();
}

function startBossMusic() {
  const gameAudio = getGameAudio();
  if (gameAudio) gameAudio.playBossMusic();
}

// Unified "stop everything" helper (menu/gameplay/boss + asset-test music if present).
function stopAllMusic() {
  try {
    stopBackgroundMusic();
  } catch (_) {}
  try {
    if (typeof window !== 'undefined' && typeof window.stopAssetMusic === 'function') {
      window.stopAssetMusic();
    }
  } catch (_) {}
}

// Resume gameplay music after boss defeat (with pause)
function resumeGameplayMusic() {
  console.log('🎵 resumeGameplayMusic() called');
  const gameAudio = getGameAudio();
  if (gameAudio) {
    console.log('🔍 Resume debug info:', {
      backgroundMusicEnabled: gameAudio.settings.isBackgroundMusicEnabled(),
      isInitialized: gameAudio.isInitialized,
      musicState: gameAudio.music.musicState
    });
    
    gameAudio.music.resumeGameplayMusic(gameAudio.settings);
  } else {
    console.log('❌ resumeGameplayMusic called but gameAudio not available');
  }
}

// Settings integration
function updateAudioSettings() {
  const gameAudio = getGameAudio();
  if (gameAudio && typeof gameSettings !== 'undefined') {
    gameAudio.setMasterVolume(gameSettings.masterVolume / 100);
    gameAudio.setSoundEffectsVolume(gameSettings.soundEffectsVolume / 100);
    gameAudio.setBackgroundMusicVolume(gameSettings.backgroundMusicVolume / 100);
    gameAudio.setSoundEffectsEnabled(gameSettings.soundEffects);
    gameAudio.setBackgroundMusicEnabled(gameSettings.backgroundMusic);
    if (gameSettings.backgroundMusic === false && typeof window !== 'undefined' && typeof window.stopAllMusic === 'function') {
      window.stopAllMusic();
    }
    if (typeof window !== 'undefined' && typeof window.syncAssetMusicWithSettings === 'function') {
      window.syncAssetMusicWithSettings();
    }
    if (typeof window !== 'undefined' && typeof window.syncAssetSfxWithSettings === 'function') {
      window.syncAssetSfxWithSettings();
    }
  }
}

// Additional audio functions for testing and debugging
function testTheme(themeNumber) {
  const gameAudio = getGameAudio();
  if (gameAudio) gameAudio.music.testTheme(themeNumber, gameAudio.settings);
}

function testInstrument(instrumentType) {
  const gameAudio = getGameAudio();
  if (gameAudio) gameAudio.music.testInstrument(instrumentType, gameAudio.settings);
}

// Make additional functions globally available
window.testTheme = testTheme;
window.testInstrument = testInstrument;
window.stopAllMusic = stopAllMusic;
window.playMenuHoverSound = playMenuHoverSound;
window.playMenuClickSound = playMenuClickSound;
window.playEnemyHitSound = playEnemyHitSound;
window.playEnemyDestroyedSound = playEnemyDestroyedSound;
window.playCoinCollectSound = playCoinCollectSound;
window.playShootSound = playShootSound;
