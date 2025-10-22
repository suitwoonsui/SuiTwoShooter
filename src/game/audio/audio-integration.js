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
  const gameAudio = getGameAudio();
  if (gameAudio) gameAudio.playSound('enemyHit');
}

function playEnemyDestroyedSound() {
  const gameAudio = getGameAudio();
  if (gameAudio) gameAudio.playSound('enemyDestroyed');
}

function playCoinCollectSound() {
  const gameAudio = getGameAudio();
  if (gameAudio) gameAudio.playSound('coinCollect');
}

function playPowerUpSound(isPositive) {
  const gameAudio = getGameAudio();
  if (gameAudio) gameAudio.playPowerUpCollect(isPositive);
}

function playBossHitSound() {
  const gameAudio = getGameAudio();
  if (gameAudio) gameAudio.playSound('bossHit');
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
  if (gameAudio) gameAudio.playSound('playerHit');
}

// Wrapper functions for easy access
function startMenuMusic() {
  const gameAudio = getGameAudio();
  if (gameAudio) gameAudio.playMenuMusic();
}

function startGameplayMusic() {
  const gameAudio = getGameAudio();
  if (gameAudio) gameAudio.playGameplayMusic();
}

function stopBackgroundMusic() {
  const gameAudio = getGameAudio();
  if (gameAudio) gameAudio.stopBackgroundMusic();
}

function startBossMusic() {
  const gameAudio = getGameAudio();
  if (gameAudio) gameAudio.playBossMusic();
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
