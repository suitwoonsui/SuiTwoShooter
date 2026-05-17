// ==========================================
// SOUND TEST SYSTEM (EXACT COPY FROM HTML)
// ==========================================

// Sound Test Functions
// Store sound test click-outside handler
let _soundTestClickOutsideHandler = null;

// ==========================================
// ASSET MUSIC TEST (FILES IN assets/Music/)
// ==========================================
let _assetMusicAudioEl = null;
/** @type {string | null} relPath of the track playing in the sound-test asset player (for loudness trim). */
let _assetMusicTestRelPath = null;

let _assetSfxAudioEl = null;
let _assetSfxFilterTimer = null;
let _assetSfxFillToken = 0;

/** Same filenames as MusicManager shipped tracks — trim comes from `getGameAudio().music.musicLoudnessTrim`. */
function _loudnessTrimForAssetTestRelPath(relPath) {
  const base = String(relPath).replace(/\\/g, '/').split('/').pop();
  const roleByFile = {
    'cave themeb4.ogg': 'menu',
    'as_fast_as_you_can_2.31_low.ogg': 'gameplay',
    'fearme31.ogg': 'boss',
  };
  const role = roleByFile[base];
  if (!role) return 1;
  try {
    const ga = typeof getGameAudio === 'function' ? getGameAudio() : null;
    const t = ga && ga.music && ga.music.musicLoudnessTrim && ga.music.musicLoudnessTrim[role];
    return typeof t === 'number' ? t : 1;
  } catch (_) {
    return 1;
  }
}

const ASSET_MUSIC_TRACKS = [
  { label: '2010 June HypnoticChill 17', relPath: '2010_June_HypnoticChill_17.mp3' },
  { label: 'Cleyton RX - Underwater', relPath: 'Cleyton RX - Underwater.mp3' },
  { label: 'Epic Boss Battle (Looping) (Alt)', relPath: 'Juhani Junkala - Epic Boss Battle [Seamlessly Looping] (1).wav' },
  { label: 'Epic Boss Battle (Looping)', relPath: 'Juhani Junkala - Epic Boss Battle [Seamlessly Looping].wav' },
  { label: 'Midnight', relPath: 'Midnight.mp3' },
  { label: 'Morning Attack', relPath: 'MorningAttack.mp3' },
  { label: 'Trem Loading loop', relPath: 'TremLoadingloopl.wav' },
  { label: 'As fast as you can (low)', relPath: 'as_fast_as_you_can_2.31_low.ogg' },
  { label: 'b423b42', relPath: 'b423b42.wav' },
  { label: 'Boss battle - star run', relPath: 'boss battle - star run.mp3' },
  { label: 'Boss 2', relPath: 'boss2.mp3' },
  { label: 'Boss battle 10 (metal)', relPath: 'boss_battle_10_metal.wav' },
  { label: 'Boss battle 8 (metal loop)', relPath: 'boss_battle_8_metal_loop.wav' },
  { label: 'Boss battle 9 (metal loop)', relPath: 'boss_battle_9_metal_loop.wav' },
  { label: 'Cave theme b4', relPath: 'cave themeb4.ogg' },
  { label: 'Eyeless', relPath: 'eyeless.wav' },
  { label: 'Fearme 31', relPath: 'fearme31.ogg' },
  { label: 'Fearus', relPath: 'fearus.ogg' },
  { label: 'Omega droid - airborne', relPath: 'omega_droid-airborne.wav' },
  { label: 'Omega droid - airborne (with wind)', relPath: 'omega_droid-airborne_with_wind.wav' },
  { label: 'Partysector (4 channels mix normalized)', relPath: 'partysector4channelsmixnormalized.ogg' },
  { label: 'Partysector (stop for a moment 2)', relPath: 'partysectorstopforamoment2.ogg' },
  { label: 'Song 21', relPath: 'song21.mp3' },
  { label: 'Tecno hydronium', relPath: 'tecno_hydronium.ogg' },
  { label: 'Tense drive', relPath: 'tense_drive.mp3' },
  { label: 'The hex 09', relPath: 'the hex 09.wav' },
  { label: 'Unchained destiny (loop)', relPath: 'unchained_destiny_loop.wav' },
  { label: 'Vivid existence (Original Mix)', relPath: 'vivid existence (Original Mix).mp3' },
  { label: 'Zombie main music', relPath: 'zombie main music.ogg' },

  // GameLoops pack
  { label: 'GameLoops - 80s Retro 1', relPath: 'GameLoops/80sRetro_1.wav' },
  { label: 'GameLoops - 8Bit 1', relPath: 'GameLoops/8Bit_1.wav' },
  { label: 'GameLoops - 8Bit 2', relPath: 'GameLoops/8Bit_2.wav' },
  { label: 'GameLoops - 8Bit 3', relPath: 'GameLoops/8Bit_3.wav' },
  { label: 'GameLoops - 8Bit 4', relPath: 'GameLoops/8Bit_4.wav' },
  { label: 'GameLoops - Chillstep 1', relPath: 'GameLoops/Chillstep_1.wav' },
  { label: 'GameLoops - Chillstep 2', relPath: 'GameLoops/Chillstep_2.wav' },
  { label: 'GameLoops - DarkDnB 1', relPath: 'GameLoops/DarkDnB_1.wav' },
  { label: 'GameLoops - DarkDnB 2', relPath: 'GameLoops/DarkDnB_2.wav' },
  { label: 'GameLoops - DarkDnB 3', relPath: 'GameLoops/DarkDnB_3.wav' },
  { label: 'GameLoops - DarkDnB 4', relPath: 'GameLoops/DarkDnB_4.wav' },
  { label: 'GameLoops - DarkDnB 5', relPath: 'GameLoops/DarkDnB_5.wav' },
  { label: 'GameLoops - DirtyElectroHouse 1', relPath: 'GameLoops/DirtyElectroHouse_1.wav' },
  { label: 'GameLoops - DirtyElectroHouse 2', relPath: 'GameLoops/DirtyElectroHouse_2.wav' },
  { label: 'GameLoops - DirtyElectroHouse 3', relPath: 'GameLoops/DirtyElectroHouse_3.wav' },
  { label: 'GameLoops - DirtyElectroHouse 4', relPath: 'GameLoops/DirtyElectroHouse_4.wav' },
  { label: 'GameLoops - DirtyElectroHouse 5', relPath: 'GameLoops/DirtyElectroHouse_5.wav' },
  { label: 'GameLoops - DnB 1', relPath: 'GameLoops/DnB_1.wav' },
  { label: 'GameLoops - EDM 1', relPath: 'GameLoops/EDM_1.wav' },
  { label: 'GameLoops - EDM 2', relPath: 'GameLoops/EDM_2.wav' },
  { label: 'GameLoops - Formant 1', relPath: 'GameLoops/Formant_1.wav' },
  { label: 'GameLoops - Formant 2', relPath: 'GameLoops/Formant_2.wav' },
  { label: 'GameLoops - FutureAmbient 1', relPath: 'GameLoops/FutureAmbient_1.wav' },
  { label: 'GameLoops - FutureAmbient 2', relPath: 'GameLoops/FutureAmbient_2.wav' },
  { label: 'GameLoops - FutureAmbient 3', relPath: 'GameLoops/FutureAmbient_3.wav' },
  { label: 'GameLoops - FutureAmbient 4', relPath: 'GameLoops/FutureAmbient_4.wav' },
  { label: 'GameLoops - HipHopNoir 1', relPath: 'GameLoops/HipHopNoir_1.wav' },
  { label: 'GameLoops - House 1', relPath: 'GameLoops/House_1.wav' },
  { label: 'GameLoops - MelodicHouse 1', relPath: 'GameLoops/MelodicHouse_1.wav' },
  { label: 'GameLoops - MelodicHouse 2', relPath: 'GameLoops/MelodicHouse_2.wav' },
  { label: 'GameLoops - MelodicHouse 3', relPath: 'GameLoops/MelodicHouse_3.wav' },
  { label: 'GameLoops - MelodicHouse 4', relPath: 'GameLoops/MelodicHouse_4.wav' },
  { label: 'GameLoops - MelodicHouse 5', relPath: 'GameLoops/MelodicHouse_5.wav' },

  // krank_music pack
  { label: 'krank - industry atmo', relPath: 'krank_music/krank_music/industry/atmo.ogg' },
  { label: 'krank - menu industry', relPath: 'krank_music/krank_music/menu/industry.ogg' },
  { label: 'krank - menu space', relPath: 'krank_music/krank_music/menu/space.ogg' },
  { label: 'krank - menu summer', relPath: 'krank_music/krank_music/menu/summer.ogg' },
  { label: 'krank - menu water', relPath: 'krank_music/krank_music/menu/water.ogg' },
  { label: 'krank - space atmo', relPath: 'krank_music/krank_music/space/atmo.ogg' },
  { label: 'krank - summer atmo', relPath: 'krank_music/krank_music/summer/atmo.ogg' },
  { label: 'krank - water atmo', relPath: 'krank_music/krank_music/water/atmo.ogg' },

  // Other packs
  { label: 'Observing The Star', relPath: 'ObservingTheStar/ObservingTheStar.ogg' },
  { label: 'WeltHerrscherer Theme 1', relPath: 'WeltHerrschererTheme1/WeltHerrschererTheme1.ogg' },
];

function _assetMusicUrlFromRelPath(relPath) {
  // Assets are served relative to the game root.
  // Encode each path segment so spaces/brackets work in URLs.
  const segs = String(relPath).split('/').map((s) => encodeURIComponent(s));
  return `assets/Music/${segs.join('/')}`;
}

function playAssetMusic(relPath, opts) {
  // Avoid overlap: stop any current menu/gameplay/boss music before starting an asset track
  if (typeof stopBackgroundMusic === 'function') {
    stopBackgroundMusic();
  }

  try {
    const audio = typeof getGameAudio === 'function' ? getGameAudio() : null;
    // Make sure the WebAudio context is resumed so browser audio policy is satisfied.
    if (audio && typeof audio.resumeContext === 'function') audio.resumeContext();
  } catch (_) {}

  const url = _assetMusicUrlFromRelPath(relPath);
  _assetMusicTestRelPath = relPath;

  // Stop previous track
  if (_assetMusicAudioEl) {
    try {
      _assetMusicAudioEl.pause();
      _assetMusicAudioEl.currentTime = 0;
    } catch (_) {}
    _assetMusicAudioEl = null;
  }

  const el = new Audio(url);
  el.loop = opts && typeof opts.loop === 'boolean' ? opts.loop : true;
  let baseVol = 0.8;
  if (opts && typeof opts.volume === 'number') {
    baseVol = opts.volume;
  } else {
    try {
      const ga = typeof getGameAudio === 'function' ? getGameAudio() : null;
      if (ga && ga.settings && typeof ga.settings.getBackgroundMusicVolume === 'function') {
        baseVol = ga.settings.getBackgroundMusicVolume(1.0);
      }
    } catch (_) {}
  }
  const trim = _loudnessTrimForAssetTestRelPath(relPath);
  el.volume = Math.max(0, Math.min(1, baseVol * trim));
  el.preload = 'auto';
  _assetMusicAudioEl = el;

  el.play().catch((err) => {
    console.warn('Failed to play asset music:', { url, err });
    alert(`Failed to play music file:\n${url}\n\n${err && err.message ? err.message : String(err)}`);
  });
}

function stopAssetMusic() {
  if (!_assetMusicAudioEl) return;
  try {
    _assetMusicAudioEl.pause();
    _assetMusicAudioEl.currentTime = 0;
  } catch (_) {}
  _assetMusicAudioEl = null;
  _assetMusicTestRelPath = null;
}

function stopAllMusic() {
  try {
    stopAssetMusic();
  } catch (_) {}
  try {
    if (typeof stopBackgroundMusic === 'function') stopBackgroundMusic();
  } catch (_) {}
}

// Keep the asset-music test player in sync with current settings (volume + enabled).
function syncAssetMusicWithSettings() {
  const audio = typeof getGameAudio === 'function' ? getGameAudio() : null;
  if (!_assetMusicAudioEl || !audio || !audio.settings) return;
  try {
    const enabled = typeof audio.settings.isBackgroundMusicEnabled === 'function' ? audio.settings.isBackgroundMusicEnabled() : true;
    if (!enabled) {
      stopAssetMusic();
      return;
    }
    if (typeof audio.settings.getBackgroundMusicVolume === 'function') {
      const base = audio.settings.getBackgroundMusicVolume(1.0);
      const trim = _assetMusicTestRelPath ? _loudnessTrimForAssetTestRelPath(_assetMusicTestRelPath) : 1;
      _assetMusicAudioEl.volume = Math.max(0, Math.min(1, base * trim));
    }
  } catch (_) {}
}

function _renderAssetMusicButtonsIfPresent() {
  const container = document.getElementById('assetMusicButtons');
  if (!container) return;

  // Avoid duplicating buttons if showSoundTest is opened multiple times.
  if (container.dataset && container.dataset.rendered === 'true') return;
  if (container.dataset) container.dataset.rendered = 'true';

  // Clear placeholder content
  container.innerHTML = '';

  ASSET_MUSIC_TRACKS.forEach((t) => {
    const btn = document.createElement('button');
    btn.className = 'sound-btn';
    btn.type = 'button';
    btn.textContent = `🎵 ${t.label}`;
    // Hover tooltip shows full name (especially helpful on small screens)
    btn.title = t.label;
    btn.onclick = () => playAssetMusic(t.relPath);
    container.appendChild(btn);
  });
}

function _assetSfxUrlFromRelPath(relPath) {
  const segs = String(relPath).split('/').map((s) => encodeURIComponent(s));
  return `assets/sounds/${segs.join('/')}`;
}

function _getAssetSfxTrackList() {
  if (typeof window !== 'undefined' && Array.isArray(window.ASSET_SFX_TRACKS)) {
    return window.ASSET_SFX_TRACKS;
  }
  if (typeof ASSET_SFX_TRACKS !== 'undefined' && Array.isArray(ASSET_SFX_TRACKS)) {
    return ASSET_SFX_TRACKS;
  }
  return [];
}

function playAssetSfx(relPath) {
  const audio = typeof getGameAudio === 'function' ? getGameAudio() : null;
  if (!audio || !audio.settings) {
    console.warn('playAssetSfx: audio not ready');
    return;
  }
  if (!audio.settings.isSoundEffectsEnabled()) {
    return;
  }
  try {
    if (typeof audio.resumeContext === 'function') {
      audio.resumeContext();
    }
  } catch (_) {}

  if (_assetSfxAudioEl) {
    try {
      _assetSfxAudioEl.pause();
      _assetSfxAudioEl.currentTime = 0;
    } catch (_) {}
    _assetSfxAudioEl = null;
  }

  const url = _assetSfxUrlFromRelPath(relPath);
  const el = new Audio(url);
  el.preload = 'auto';
  el.volume = Math.max(0, Math.min(1, audio.settings.getSoundEffectsVolume(1.0)));
  _assetSfxAudioEl = el;

  el.play().catch((err) => {
    console.warn('playAssetSfx failed', relPath, err);
    alert(`Failed to play:\n${relPath}\n\n${err && err.message ? err.message : String(err)}`);
    _assetSfxAudioEl = null;
  });
}

function stopAssetSfx() {
  if (!_assetSfxAudioEl) return;
  try {
    _assetSfxAudioEl.pause();
    _assetSfxAudioEl.currentTime = 0;
  } catch (_) {}
  _assetSfxAudioEl = null;
}

function syncAssetSfxWithSettings() {
  const audio = typeof getGameAudio === 'function' ? getGameAudio() : null;
  if (!_assetSfxAudioEl || !audio || !audio.settings) return;
  try {
    if (!audio.settings.isSoundEffectsEnabled()) {
      stopAssetSfx();
      return;
    }
    _assetSfxAudioEl.volume = Math.max(0, Math.min(1, audio.settings.getSoundEffectsVolume(1.0)));
  } catch (_) {}
}

function _refillAssetSfxButtons(container, filterInput, countEl) {
  const token = ++_assetSfxFillToken;
  const q = (filterInput && filterInput.value ? filterInput.value : '').trim().toLowerCase();
  const all = _getAssetSfxTrackList();
  const tracks = q
    ? all.filter(
        (t) =>
          (t.relPath && t.relPath.toLowerCase().includes(q)) ||
          (t.label && String(t.label).toLowerCase().includes(q))
      )
    : all;

  if (countEl) {
    if (!all.length) {
      countEl.textContent =
        'No manifest loaded. Ensure asset-sfx-manifest.js is in the lazy script list and run npm run generate:asset-sfx-manifest.';
    } else {
      countEl.textContent = `${tracks.length} file(s)${q ? ' (filtered)' : ''}`;
    }
  }

  container.innerHTML = '';
  let i = 0;

  function chunk() {
    if (token !== _assetSfxFillToken) return;
    if (i >= tracks.length) return;
    const frag = document.createDocumentFragment();
    const end = Math.min(i + 64, tracks.length);
    for (; i < end; i++) {
      const t = tracks[i];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sound-btn';
      btn.textContent = `🔊 ${t.label}`;
      btn.title = t.relPath;
      const rp = t.relPath;
      btn.onclick = () => playAssetSfx(rp);
      frag.appendChild(btn);
    }
    container.appendChild(frag);
    if (i < tracks.length && token === _assetSfxFillToken) {
      requestAnimationFrame(chunk);
    }
  }

  chunk();
}

function _setupAssetSfxSectionIfPresent() {
  const container = document.getElementById('assetSfxButtons');
  const filterInput = document.getElementById('assetSfxFilter');
  const countEl = document.getElementById('assetSfxCount');
  if (!container || !filterInput) return;

  function scheduleRefill() {
    if (_assetSfxFilterTimer) clearTimeout(_assetSfxFilterTimer);
    _assetSfxFilterTimer = setTimeout(() => {
      _assetSfxFilterTimer = null;
      _refillAssetSfxButtons(container, filterInput, countEl);
    }, 140);
  }

  if (!filterInput.dataset.assetSfxBound) {
    filterInput.dataset.assetSfxBound = 'true';
    filterInput.addEventListener('input', scheduleRefill);
  }
  scheduleRefill();
}

function showSoundTest() {
  // Hide main menu first
  if (typeof MenuService !== 'undefined' && MenuService.hide) {
    MenuService.hide();
  }

  if (typeof MenuPanelLoading !== 'undefined' && MenuPanelLoading.show) {
    MenuPanelLoading.show('Loading sound test... Please wait');
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
    const audio = typeof getGameAudio === 'function' ? getGameAudio() : null;
    if (typeof initGameAudio === 'function' && !audio) {
      initGameAudio();
    }
    // Stop ALL music (menu/gameplay/boss + asset-test) when entering sound test
    stopAllMusic();

    // Render asset-music list (if the HTML section exists)
    _renderAssetMusicButtonsIfPresent();
    _setupAssetSfxSectionIfPresent();
  }

  if (typeof MenuPanelLoading !== 'undefined' && MenuPanelLoading.hide) {
    MenuPanelLoading.hide();
  }
}

function hideSoundTest() {
  const soundTestPanel = document.getElementById('soundTestPanel');
  if (soundTestPanel) {
    soundTestPanel.classList.add('sound-test-panel-hidden');
    soundTestPanel.classList.remove('sound-test-panel-visible');

    // Stop any music or currently-playing WebAudio sounds when exiting sound test.
    try {
      if (typeof window !== 'undefined' && typeof window.stopAllMusic === 'function') {
        window.stopAllMusic();
      } else {
        stopAllMusic();
      }
    } catch (_) {}
    try {
      stopAssetSfx();
    } catch (_) {}
    try {
      const audio = typeof getGameAudio === 'function' ? getGameAudio() : null;
      if (audio && audio.audioContext && typeof audio.audioContext.stopAllOscillators === 'function') {
        audio.audioContext.stopAllOscillators();
      }
    } catch (_) {}
    
    // Show main menu again after closing sound test
    if (typeof MenuService !== 'undefined' && MenuService.show) {
      MenuService.show({ fromMenuPanel: true });
    }
  }
}

function testSound(soundName) {
  const audio = typeof getGameAudio === 'function' ? getGameAudio() : null;
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
    } else if (soundName === 'enemyHit' && typeof audio.playEnemyHit === 'function') {
      audio.playEnemyHit();
    } else if (soundName === 'enemyDestroyed' && typeof audio.playEnemyDestroyed === 'function') {
      audio.playEnemyDestroyed();
    } else if (soundName === 'bossHit' && typeof audio.playBossHit === 'function') {
      audio.playBossHit();
    } else if (soundName === 'playerHit' && typeof audio.playPlayerHit === 'function') {
      audio.playPlayerHit();
    } else if (soundName === 'powerupCollect' || soundName === 'powerupNegative') {
      audio.playPowerUpCollect(soundName === 'powerupCollect');
    } else {
      audio.playSound(soundName);
    }
  } else {
    console.log(`Testing sound: ${soundName} (audio system not loaded yet)`);
  }
}

function testForceFieldSound(type) {
  const audio = typeof getGameAudio === 'function' ? getGameAudio() : null;
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
  const audio = typeof getGameAudio === 'function' ? getGameAudio() : null;
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
  const audio = typeof getGameAudio === 'function' ? getGameAudio() : null;
  if (audio) {
    // Avoid overlap: stop any asset-music test track before starting background music
    stopAssetMusic();
    audio.playGameplayMusic();
  } else {
    console.log('Testing gameplay music (audio system not loaded yet)');
  }
}

function testBossMusic() {
  const audio = typeof getGameAudio === 'function' ? getGameAudio() : null;
  if (audio) {
    // Avoid overlap: stop any asset-music test track before starting boss music
    stopAssetMusic();
    audio.playBossMusic();
  } else {
    console.log('Testing boss music (audio system not loaded yet)');
  }
}

function showAudioStats() {
  const audio = typeof getGameAudio === 'function' ? getGameAudio() : null;
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
  const audio = typeof getGameAudio === 'function' ? getGameAudio() : null;
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
  const audio = typeof getGameAudio === 'function' ? getGameAudio() : null;
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
  const audio = typeof getGameAudio === 'function' ? getGameAudio() : null;
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
  const audio = typeof getGameAudio === 'function' ? getGameAudio() : null;
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
  const audio = typeof getGameAudio === 'function' ? getGameAudio() : null;
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
  window.playAssetMusic = playAssetMusic;
  window.stopAssetMusic = stopAssetMusic;
  window.stopAllMusic = stopAllMusic;
  window.syncAssetMusicWithSettings = syncAssetMusicWithSettings;
  window.playAssetSfx = playAssetSfx;
  window.stopAssetSfx = stopAssetSfx;
  window.syncAssetSfxWithSettings = syncAssetSfxWithSettings;
}