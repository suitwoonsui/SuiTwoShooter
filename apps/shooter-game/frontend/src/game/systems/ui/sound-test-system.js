// ==========================================
// SOUND TEST SYSTEM (EXACT COPY FROM HTML)
// ==========================================

// Sound Test Functions
// Store sound test click-outside handler
let _soundTestClickOutsideHandler = null;

function showSoundTest() {
  // Hide main menu first
  if (typeof MenuService !== 'undefined' && MenuService.hide) {
    MenuService.hide();
  }
  
  // Remove any existing click-outside handlers from other panels
  // (This is a workaround since we can't access the menu-system handlers directly)
  // The menu-system handlers will be removed when those panels are opened
  
  const soundTestPanel = document.getElementById('soundTestPanel');
  if (soundTestPanel) {
    soundTestPanel.classList.add('sound-test-panel-visible');
    soundTestPanel.classList.remove('sound-test-panel-hidden');
    
    // Remove old handler if it exists
    if (_soundTestClickOutsideHandler) {
      document.removeEventListener('click', _soundTestClickOutsideHandler);
      _soundTestClickOutsideHandler = null;
    }
    
    // Close panel when clicking outside
    const handleClickOutside = (event) => {
      // Only process if sound test panel is actually visible
      if (!soundTestPanel.classList.contains('sound-test-panel-visible')) {
        return; // Panel is not visible, ignore this event
      }
      
      if (!soundTestPanel.contains(event.target)) {
        hideSoundTest();
        document.removeEventListener('click', handleClickOutside);
        _soundTestClickOutsideHandler = null;
      }
    };
    
    // Store handler
    _soundTestClickOutsideHandler = handleClickOutside;
    
    // Use setTimeout to avoid immediate firing
    setTimeout(() => {
      console.log('🟠 [SOUND TEST] Adding click outside listener');
      document.addEventListener('click', handleClickOutside);
    }, 0);
    
    // Initialize audio system if not already done
    const audio = typeof gameAudio !== 'undefined' ? gameAudio : (typeof window.gameAudio !== 'undefined' ? window.gameAudio : null);
    if (typeof initGameAudio === 'function' && !audio) {
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
    
    // Show main menu again after closing sound test
    if (typeof MenuService !== 'undefined' && MenuService.show) {
      MenuService.show();
    }
  }
}

function testSound(soundName) {
  const audio = typeof gameAudio !== 'undefined' ? gameAudio : (typeof window.gameAudio !== 'undefined' ? window.gameAudio : null);
  if (audio) {
    // Special case for shoot sound - use the new magical sound
    if (soundName === 'shoot') {
      playShootSound(); // Use the new magical orb launch sound
    } else if (soundName === 'coinCollect') {
      // Special case for coin collect - use the new layered sound
      if (typeof playCoinCollectSound === 'function') {
        playCoinCollectSound();
      } else {
        audio.playSound(soundName); // Fallback to old sound
      }
    } else {
      audio.playSound(soundName);
    }
  } else {
    console.log(`Testing sound: ${soundName} (audio system not loaded yet)`);
  }
}

function testForceFieldSound(type) {
  const audio = typeof gameAudio !== 'undefined' ? gameAudio : (typeof window.gameAudio !== 'undefined' ? window.gameAudio : null);
  if (audio) {
    switch(type) {
      case 'activate':
        audio.playForceFieldActivate();
        break;
      case 'powerUp':
        audio.playForceFieldPowerUp();
        break;
      case 'powerDown':
        audio.playForceFieldPowerDown();
        break;
      case 'destroyed':
        audio.playForceFieldDestroyed();
        break;
    }
  } else {
    console.log(`Testing force field sound: ${type} (audio system not loaded yet)`);
  }
}

function testSequence(type) {
  const audio = typeof gameAudio !== 'undefined' ? gameAudio : (typeof window.gameAudio !== 'undefined' ? window.gameAudio : null);
  if (audio) {
    switch(type) {
      case 'ascending':
        audio.playAscendingSequence();
        break;
      case 'descending':
        audio.playDescendingSequence();
        break;
      case 'destruction':
        audio.playDestructionSequence();
        break;
    }
  } else {
    console.log(`Testing sequence: ${type} (audio system not loaded yet)`);
  }
}

function testGameplayMusic() {
  const audio = typeof gameAudio !== 'undefined' ? gameAudio : (typeof window.gameAudio !== 'undefined' ? window.gameAudio : null);
  if (audio) {
    audio.playGameplayMusic();
  } else {
    console.log('Testing gameplay music (audio system not loaded yet)');
  }
}

function testBossMusic() {
  const audio = typeof gameAudio !== 'undefined' ? gameAudio : (typeof window.gameAudio !== 'undefined' ? window.gameAudio : null);
  if (audio) {
    audio.playBossMusic();
  } else {
    console.log('Testing boss music (audio system not loaded yet)');
  }
}

function showAudioStats() {
  const audio = typeof gameAudio !== 'undefined' ? gameAudio : (typeof window.gameAudio !== 'undefined' ? window.gameAudio : null);
  if (audio) {
    const stats = audio.getAudioStats();
    console.log('Audio System Stats:', stats);
    alert(`Audio System Stats:\n\n` +
          `Initialized: ${stats.isInitialized}\n` +
          `Master Volume: ${Math.round(stats.masterVolume * 100)}%\n` +
          `Sound Effects: ${stats.soundEffectsEnabled ? 'ON' : 'OFF'}\n` +
          `Background Music: ${stats.backgroundMusicEnabled ? 'ON' : 'OFF'}\n` +
          `Active Sounds: ${stats.activeSounds}/${stats.maxConcurrentSounds}\n` +
          `Audio Context: ${stats.audioContextState}`);
  } else {
    alert('Audio system not initialized. Audio scripts are loaded when you start the game.');
  }
}

function testAllSounds() {
  const audio = typeof gameAudio !== 'undefined' ? gameAudio : (typeof window.gameAudio !== 'undefined' ? window.gameAudio : null);
  if (audio) {
    const soundNames = Object.keys(audio.soundEffects);
    let delay = 0;
    
    soundNames.forEach(soundName => {
      setTimeout(() => {
        audio.playSound(soundName);
      }, delay);
      delay += 200; // 200ms between each sound
    });
    
    console.log(`Testing ${soundNames.length} sounds with ${delay}ms total duration`);
  } else {
    console.log('Audio system not initialized (audio scripts not loaded yet)');
  }
}

// Buffer Generator Test Functions
function testBufferSound(type) {
  const audio = typeof gameAudio !== 'undefined' ? gameAudio : (typeof window.gameAudio !== 'undefined' ? window.gameAudio : null);
  if (!audio || !audio.bufferGenerator) {
    console.warn('Buffer generator not available. Make sure audio-buffer-generator.js is loaded.');
    alert('Buffer generator not available.\n\nMake sure the audio-buffer-generator.js file is loaded in your HTML.');
    return;
  }

  const generator = audio.bufferGenerator;
  const volume = audio.settings.getSoundEffectsVolume(1.0);
  
  // Debug info
  console.log('🔊 [BUFFER TEST]', {
    type,
    volume,
    audioContextState: generator.audioContext?.state,
    bufferGenerator: !!generator
  });

  switch(type) {
    case 'explosion':
      const explosionBuffer = generator.generateExplosionBuffer(1.0);
      const explosionSource = generator.playBuffer(explosionBuffer, volume);
      console.log('🔊 Testing: Enhanced Explosion (Buffer)', { buffer: !!explosionBuffer, source: !!explosionSource });
      break;
    case 'explosionIntense':
      const intenseBuffer = generator.generateExplosionBuffer(1.5);
      const intenseSource = generator.playBuffer(intenseBuffer, volume);
      console.log('🔊 Testing: Intense Explosion (Buffer)', { buffer: !!intenseBuffer, source: !!intenseSource });
      break;
    case 'impact':
      const impactBuffer = generator.generateImpactBuffer(1.0);
      const impactSource = generator.playBuffer(impactBuffer, volume);
      console.log('🔊 Testing: Enhanced Impact (Buffer)', { buffer: !!impactBuffer, source: !!impactSource });
      break;
    case 'impactHeavy':
      const heavyBuffer = generator.generateImpactBuffer(1.5);
      const heavySource = generator.playBuffer(heavyBuffer, volume);
      console.log('🔊 Testing: Heavy Impact (Buffer)', { buffer: !!heavyBuffer, source: !!heavySource });
      break;
    case 'coinJingle':
      const coinBuffer = generator.generateCoinJingleBuffer();
      const coinSource = generator.playBuffer(coinBuffer, volume * 0.6);
      console.log('🔊 Testing: Coin Jingle (Buffer)', { buffer: !!coinBuffer, source: !!coinSource });
      break;
    case 'gameOver':
      const gameOverBuffer = generator.generateGameOverBuffer();
      const gameOverSource = generator.playBuffer(gameOverBuffer, volume);
      console.log('🔊 Testing: Game Over (Buffer)', { buffer: !!gameOverBuffer, source: !!gameOverSource });
      break;
    default:
      console.warn('Unknown buffer sound type:', type);
  }
}

// Audio Sample Test Functions
async function testSampleSound(sampleName) {
  const audio = typeof gameAudio !== 'undefined' ? gameAudio : (typeof window.gameAudio !== 'undefined' ? window.gameAudio : null);
  if (!audio || !audio.sampleLoader) {
    console.warn('Sample loader not available. Make sure audio-sample-loader.js is loaded.');
    alert('Sample loader not available.\n\nMake sure the audio-sample-loader.js file is loaded in your HTML.');
    return;
  }

  if (!audio.sampleLoader || typeof getSampleConfig !== 'function') {
    console.warn('Sample config not available. Make sure audio-sample-config.js is loaded.');
    alert('Sample config not available.\n\nMake sure the audio-sample-config.js file is loaded.');
    return;
  }

  const config = getSampleConfig(sampleName);
  if (!config) {
    console.warn(`Sample config not found for: ${sampleName}`);
    alert(`Sample configuration not found for: ${sampleName}\n\nAdd it to audio-sample-config.js`);
    return;
  }

  const loader = audio.sampleLoader;
  const volume = audio.settings.getSoundEffectsVolume(config.volume);

  console.log('🔊 [SAMPLE TEST]', {
    sampleName,
    url: config.url,
    volume,
    fallback: config.fallback,
    isLoaded: loader.isSampleLoaded(config.url)
  });

  try {
    const source = await loader.playSample(config.url, volume);
    if (source) {
      console.log('✅ Sample played successfully');
    } else {
      console.warn('⚠️ Sample play returned null, trying fallback');
      // Try fallback
      if (config.fallback === 'buffer' && audio.bufferGenerator) {
        console.log('🔄 Falling back to buffer generator');
        // Use appropriate buffer generator method
        if (sampleName === 'explosion' || sampleName === 'explosionLarge') {
          const buffer = audio.bufferGenerator.generateExplosionBuffer(sampleName === 'explosionLarge' ? 1.5 : 1.0);
          audio.bufferGenerator.playBuffer(buffer, volume);
        } else if (sampleName === 'impact' || sampleName === 'impactHeavy') {
          const buffer = audio.bufferGenerator.generateImpactBuffer(sampleName === 'impactHeavy' ? 1.5 : 1.0);
          audio.bufferGenerator.playBuffer(buffer, volume);
        } else if (sampleName === 'gameOver') {
          const buffer = audio.bufferGenerator.generateGameOverBuffer();
          audio.bufferGenerator.playBuffer(buffer, volume);
        }
      } else {
        console.warn('⚠️ No fallback available or fallback type not supported');
      }
    }
  } catch (error) {
    console.error('❌ Failed to play sample:', error);
    alert(`Failed to load/play sample: ${config.url}\n\nError: ${error.message}\n\nMake sure the audio file exists at that path.`);
  }
}

// Preload all samples
async function preloadAllSamples() {
  const audio = typeof gameAudio !== 'undefined' ? gameAudio : (typeof window.gameAudio !== 'undefined' ? window.gameAudio : null);
  if (!audio || !audio.sampleLoader || typeof getAllSampleUrls !== 'function') {
    console.warn('Sample loader or config not available');
    return;
  }

  const urls = getAllSampleUrls();
  console.log(`🔄 Preloading ${urls.length} audio samples...`);
  
  try {
    const results = await audio.sampleLoader.preloadSamples(urls);
    const loaded = Object.keys(results).length;
    const stats = audio.sampleLoader.getCacheStats();
    console.log(`✅ Preloaded ${loaded}/${urls.length} samples`, stats);
    alert(`Preloaded ${loaded}/${urls.length} audio samples\n\nTotal size: ${stats.totalSizeKB}KB`);
  } catch (error) {
    console.error('Failed to preload samples:', error);
    alert(`Failed to preload samples: ${error.message}`);
  }
}

function stopBackgroundMusic() {
  // Check if gameAudio is available (only after audio scripts load)
  const audio = typeof gameAudio !== 'undefined' ? gameAudio : (typeof window.gameAudio !== 'undefined' ? window.gameAudio : null);
  if (audio && typeof audio.stopBackgroundMusic === 'function') {
    audio.stopBackgroundMusic();
  } else {
    console.log('Stopping background music (audio system not loaded yet)');
  }
}

// Stub functions for menu hover sounds (will be replaced when audio-integration.js loads)
// These are safe to call even when audio system isn't loaded yet
// We define these immediately so they're available when HTML onmouseover fires
(function() {
  // Only define if not already defined (audio-integration.js will define them when it loads)
  if (typeof window.playMenuHoverSound === 'undefined') {
    window.playMenuHoverSound = function() {
      // Stub - will be replaced by audio-integration.js when it loads
      // Check if real function is available (from audio-integration.js in GAME_SCRIPTS)
      if (typeof getGameAudio === 'function') {
        const gameAudio = getGameAudio();
        if (gameAudio && typeof gameAudio.playSound === 'function') {
          gameAudio.playSound('menuHover');
        }
      }
      // If audio not loaded yet, silently do nothing (no error)
    };
  }

  if (typeof window.playMenuClickSound === 'undefined') {
    window.playMenuClickSound = function() {
      // Stub - will be replaced by audio-integration.js when it loads
      if (typeof getGameAudio === 'function') {
        const gameAudio = getGameAudio();
        if (gameAudio && typeof gameAudio.playSound === 'function') {
          gameAudio.playSound('menuClick');
        }
      }
      // If audio not loaded yet, silently do nothing (no error)
    };
  }
})();

// Expose functions globally for HTML onclick handlers
if (typeof window !== 'undefined') {
  window.showSoundTest = showSoundTest;
  window.hideSoundTest = hideSoundTest;
  window.testSound = testSound;
  window.testAllSounds = testAllSounds;
  window.testBufferSound = testBufferSound;
  window.testSampleSound = testSampleSound;
  window.preloadAllSamples = preloadAllSamples;
  window.stopBackgroundMusic = stopBackgroundMusic;
}