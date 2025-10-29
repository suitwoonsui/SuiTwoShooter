// ==========================================
// SOUND TEST SYSTEM (EXACT COPY FROM HTML)
// ==========================================

// Sound Test Functions
function showSoundTest() {
  const soundTestPanel = document.getElementById('soundTestPanel');
  if (soundTestPanel) {
    soundTestPanel.classList.add('sound-test-panel-visible');
    soundTestPanel.classList.remove('sound-test-panel-hidden');
    
    // Close panel when clicking outside
    const handleClickOutside = (event) => {
      if (!soundTestPanel.contains(event.target)) {
        hideSoundTest();
        document.removeEventListener('click', handleClickOutside);
      }
    };
    // Use setTimeout to avoid immediate firing
    setTimeout(() => document.addEventListener('click', handleClickOutside), 0);
    
    // Initialize audio system if not already done
    if (typeof initGameAudio === 'function' && !gameAudio) {
      initGameAudio();
    }
    // Stop any playing background music when entering sound test
    if (typeof stopBackgroundMusic === 'function') {
      stopBackgroundMusic();
    }
  }
}

function hideSoundTest() {
  const soundTestPanel = document.getElementById('soundTestPanel');
  if (soundTestPanel) {
    soundTestPanel.classList.add('sound-test-panel-hidden');
    soundTestPanel.classList.remove('sound-test-panel-visible');
  }
}

function testSound(soundName) {
  if (gameAudio) {
    // Special case for shoot sound - use the new magical sound
    if (soundName === 'shoot') {
      playShootSound(); // Use the new magical orb launch sound
    } else {
      gameAudio.playSound(soundName);
    }
  } else {
    console.log(`Testing sound: ${soundName}`);
  }
}

function testForceFieldSound(type) {
  if (gameAudio) {
    switch(type) {
      case 'activate':
        gameAudio.playForceFieldActivate();
        break;
      case 'powerUp':
        gameAudio.playForceFieldPowerUp();
        break;
      case 'powerDown':
        gameAudio.playForceFieldPowerDown();
        break;
      case 'destroyed':
        gameAudio.playForceFieldDestroyed();
        break;
    }
  } else {
    console.log(`Testing force field sound: ${type}`);
  }
}

function testSequence(type) {
  if (gameAudio) {
    switch(type) {
      case 'ascending':
        gameAudio.playAscendingSequence();
        break;
      case 'descending':
        gameAudio.playDescendingSequence();
        break;
      case 'destruction':
        gameAudio.playDestructionSequence();
        break;
    }
  } else {
    console.log(`Testing sequence: ${type}`);
  }
}

function testGameplayMusic() {
  if (gameAudio) {
    gameAudio.playGameplayMusic();
  } else {
    console.log('Testing gameplay music');
  }
}

function testBossMusic() {
  if (gameAudio) {
    gameAudio.playBossMusic();
  } else {
    console.log('Testing boss music');
  }
}

function showAudioStats() {
  if (gameAudio) {
    const stats = gameAudio.getAudioStats();
    console.log('Audio System Stats:', stats);
    alert(`Audio System Stats:\n\n` +
          `Initialized: ${stats.isInitialized}\n` +
          `Master Volume: ${Math.round(stats.masterVolume * 100)}%\n` +
          `Sound Effects: ${stats.soundEffectsEnabled ? 'ON' : 'OFF'}\n` +
          `Background Music: ${stats.backgroundMusicEnabled ? 'ON' : 'OFF'}\n` +
          `Active Sounds: ${stats.activeSounds}/${stats.maxConcurrentSounds}\n` +
          `Audio Context: ${stats.audioContextState}`);
  } else {
    alert('Audio system not initialized');
  }
}

function testAllSounds() {
  if (gameAudio) {
    const soundNames = Object.keys(gameAudio.soundEffects);
    let delay = 0;
    
    soundNames.forEach(soundName => {
      setTimeout(() => {
        gameAudio.playSound(soundName);
      }, delay);
      delay += 200; // 200ms between each sound
    });
    
    console.log(`Testing ${soundNames.length} sounds with ${delay}ms total duration`);
  } else {
    console.log('Audio system not initialized');
  }
}

function stopBackgroundMusic() {
  if (gameAudio) {
    gameAudio.stopBackgroundMusic();
  } else {
    console.log('Stopping background music');
  }
}