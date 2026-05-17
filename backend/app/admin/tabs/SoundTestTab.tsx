// ==========================================
// Admin Page - Sound Test Tab Component
// Copied from game frontend (index.html sound test panel + sound-test-system.js)
// Uses admin theme (dark/light) for readability.
// ==========================================

'use client';

import { useState, useEffect } from 'react';
import { AdminStyles } from '../types';

interface SoundTestTabProps {
  styles: AdminStyles;
}

export function SoundTestTab({ styles }: SoundTestTabProps) {
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [audioStats, setAudioStats] = useState<Record<string, unknown> | null>(null);
  const [assetMusicNowPlaying, setAssetMusicNowPlaying] = useState<string | null>(null);
  const [assetMusicEl, setAssetMusicEl] = useState<HTMLAudioElement | null>(null);

  const assetMusicTracks: Array<{ label: string; relPath: string }> = [
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
    { label: 'krank - industry atmo', relPath: 'krank_music/krank_music/industry/atmo.ogg' },
    { label: 'krank - menu industry', relPath: 'krank_music/krank_music/menu/industry.ogg' },
    { label: 'krank - menu space', relPath: 'krank_music/krank_music/menu/space.ogg' },
    { label: 'krank - menu summer', relPath: 'krank_music/krank_music/menu/summer.ogg' },
    { label: 'krank - menu water', relPath: 'krank_music/krank_music/menu/water.ogg' },
    { label: 'krank - space atmo', relPath: 'krank_music/krank_music/space/atmo.ogg' },
    { label: 'krank - summer atmo', relPath: 'krank_music/krank_music/summer/atmo.ogg' },
    { label: 'krank - water atmo', relPath: 'krank_music/krank_music/water/atmo.ogg' },
    { label: 'Observing The Star', relPath: 'ObservingTheStar/ObservingTheStar.ogg' },
    { label: 'WeltHerrscherer Theme 1', relPath: 'WeltHerrschererTheme1/WeltHerrschererTheme1.ogg' },
  ];

  // Script list: core + utils (buffer/sample) before audio-manager so classes are defined
  const scriptPaths = [
    '/src/game/audio/core/audio-context.js',
    '/src/game/audio/settings/audio-settings.js',
    '/src/game/audio/music/music-patterns.js',
    '/src/game/audio/music/music-composer.js',
    '/src/game/audio/music/music-manager.js',
    '/src/game/audio/effects/sound-effects.js',
    '/src/game/audio/utils/audio-buffer-generator.js',
    '/src/game/audio/utils/audio-sample-loader.js',
    '/src/game/audio/utils/audio-sample-config.js',
    '/src/game/audio/audio-manager.js',
    '/src/game/audio/audio-integration.js',
  ];

  useEffect(() => {
    if (audioLoaded) return;

    const loadAudioScripts = async () => {
      const win = typeof window !== 'undefined' ? (window as any) : null;
      if (win && typeof win.getGameAudio === 'function') {
        setAudioLoaded(true);
        return;
      }

      // Admin runs on backend (e.g. :3001); audio scripts live on game frontend (e.g. :8000).
      // Use NEXT_PUBLIC_GAME_FRONTEND_URL if set, else localhost:8000 in dev, else same origin.
      const audioBaseUrl =
        typeof window !== 'undefined'
          ? (process.env.NEXT_PUBLIC_GAME_FRONTEND_URL ||
            (window.location.hostname === 'localhost' ? 'http://localhost:8000' : window.location.origin))
          : '';

      const scriptUrl = (path: string) => `${audioBaseUrl.replace(/\/$/, '')}${path}`;

      const scriptsWithCorrectOrigin = () =>
        scriptPaths.every((basePath) => {
          const fullUrl = scriptUrl(basePath);
          return Array.from(document.querySelectorAll('script[src]')).some(
            (s) => (s as HTMLScriptElement).src.replace(/\?.*/, '') === fullUrl
          );
        });

      const removeFailedAudioScripts = () => {
        scriptPaths.forEach((basePath) => {
          const scripts = document.querySelectorAll('script[src]');
          scripts.forEach((s) => {
            const src = (s as HTMLScriptElement).src;
            if (src.includes(basePath)) s.remove();
          });
        });
      };

      // If scripts are in DOM but from wrong origin (e.g. backend URL), remove and reload from frontend
      const anyAudioScriptInDOM = scriptPaths.some((basePath) =>
        Array.from(document.querySelectorAll('script[src]')).some((s) =>
          (s as HTMLScriptElement).src.includes(basePath)
        )
      );
      if (anyAudioScriptInDOM && !scriptsWithCorrectOrigin()) {
        removeFailedAudioScripts();
      }

      const alreadyInDOM = anyAudioScriptInDOM && scriptsWithCorrectOrigin();
      if (alreadyInDOM) {
        let attempts = 0;
        const id = setInterval(() => {
          attempts++;
          if (typeof (window as any).getGameAudio === 'function') {
            clearInterval(id);
            setAudioLoaded(true);
          } else if (attempts > 10) {
            clearInterval(id);
            removeFailedAudioScripts();
            setAudioError('Audio scripts in DOM but system not initialized. Retry by refreshing the tab.');
          }
        }, 500);
        return;
      }

      const cacheBuster = `?v=${Date.now()}`;
      try {
        for (const basePath of scriptPaths) {
          const fullUrl = scriptUrl(basePath);
          const existing = Array.from(document.querySelectorAll('script[src]')).find(
            (s) => (s as HTMLScriptElement).src.replace(/\?.*/, '') === fullUrl
          ) as HTMLScriptElement | undefined;
          if (existing) continue;

          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = fullUrl + cacheBuster;
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load ${fullUrl}`));
            document.head.appendChild(script);
          });
        }

        await new Promise((r) => setTimeout(r, 500));

        if (typeof (window as any).getGameAudio === 'function') {
          const gameAudio = (window as any).getGameAudio();
          if (gameAudio) setAudioLoaded(true);
          else if (typeof (window as any).initGameAudio === 'function') {
            (window as any).initGameAudio();
            await new Promise((r) => setTimeout(r, 500));
            if ((window as any).getGameAudio()) setAudioLoaded(true);
            else setAudioError('Audio initialized but getGameAudio() not available');
          } else setAudioError('getGameAudio() not available');
        } else setAudioError('Audio system not found after loading scripts');
      } catch (err) {
        setAudioError(
          err instanceof Error
            ? err.message
            : 'Failed to load audio scripts. Is the game frontend running? (e.g. http://localhost:8000)'
        );
      }
    };

    loadAudioScripts();
  }, [audioLoaded]);

  useEffect(() => {
    return () => {
      // Cleanup any HTMLAudioElement we created for asset-music tests
      if (assetMusicEl) {
        try {
          assetMusicEl.pause();
          assetMusicEl.currentTime = 0;
        } catch (_) {}
      }
    };
  }, [assetMusicEl]);

  const getGameAudio = () => {
    if (typeof window !== 'undefined' && (window as any).getGameAudio) {
      return (window as any).getGameAudio();
    }
    return null;
  };

  const testSound = (soundName: string) => {
    const audio = getGameAudio();
    if (!audio?.playSound) {
      return;
    }
    if (soundName === 'shoot' && typeof (window as any).playShootSound === 'function') {
      (window as any).playShootSound();
    } else if (soundName === 'coinCollect' && typeof (window as any).playCoinCollectSound === 'function') {
      (window as any).playCoinCollectSound();
    } else {
      audio.playSound(soundName);
    }
  };

  const testForceFieldSound = (type: 'activate' | 'powerUp' | 'powerDown' | 'destroyed') => {
    const audio = getGameAudio();
    if (!audio) return;
    switch (type) {
      case 'activate':
        if (typeof audio.playForceFieldActivate === 'function') audio.playForceFieldActivate();
        break;
      case 'powerUp':
        if (typeof audio.playForceFieldPowerUp === 'function') audio.playForceFieldPowerUp();
        break;
      case 'powerDown':
        if (typeof audio.playForceFieldPowerDown === 'function') audio.playForceFieldPowerDown();
        break;
      case 'destroyed':
        if (typeof audio.playForceFieldDestroyed === 'function') audio.playForceFieldDestroyed();
        break;
    }
  };

  const testSequence = (type: 'ascending' | 'descending' | 'destruction') => {
    const audio = getGameAudio();
    if (!audio) return;
    switch (type) {
      case 'ascending':
        if (typeof audio.playAscendingSequence === 'function') audio.playAscendingSequence();
        break;
      case 'descending':
        if (typeof audio.playDescendingSequence === 'function') audio.playDescendingSequence();
        break;
      case 'destruction':
        if (typeof audio.playDestructionSequence === 'function') audio.playDestructionSequence();
        break;
    }
  };

  const testGameplayMusic = () => {
    const audio = getGameAudio();
    if (audio && typeof audio.playGameplayMusic === 'function') audio.playGameplayMusic();
  };

  const testBossMusic = () => {
    const audio = getGameAudio();
    if (audio && typeof audio.playBossMusic === 'function') audio.playBossMusic();
  };

  const stopBackgroundMusic = () => {
    const audio = getGameAudio();
    if (audio && typeof audio.stopBackgroundMusic === 'function') audio.stopBackgroundMusic();
  };

  const testTheme = (n: number) => {
    const audio = getGameAudio();
    if (audio && typeof audio.testTheme === 'function') audio.testTheme(n);
  };

  const testInstrument = (instrument: string) => {
    const audio = getGameAudio();
    if (audio && typeof audio.testInstrument === 'function') audio.testInstrument(instrument);
  };

  const testBufferSound = (type: string) => {
    const audio = getGameAudio();
    if (!audio?.bufferGenerator) {
      return;
    }
    const generator = audio.bufferGenerator;
    const volume = audio.settings?.getSoundEffectsVolume?.(1) ?? 1;
    switch (type) {
      case 'explosion': {
        const buf = generator.generateExplosionBuffer?.(1);
        if (buf) generator.playBuffer?.(buf, volume);
        break;
      }
      case 'explosionIntense': {
        const buf = generator.generateExplosionBuffer?.(1.5);
        if (buf) generator.playBuffer?.(buf, volume);
        break;
      }
      case 'impact': {
        const buf = generator.generateImpactBuffer?.(1);
        if (buf) generator.playBuffer?.(buf, volume);
        break;
      }
      case 'impactHeavy': {
        const buf = generator.generateImpactBuffer?.(1.5);
        if (buf) generator.playBuffer?.(buf, volume);
        break;
      }
      case 'coinJingle': {
        const buf = generator.generateCoinJingleBuffer?.();
        if (buf) generator.playBuffer?.(buf, volume * 0.6);
        break;
      }
      case 'gameOver': {
        const buf = generator.generateGameOverBuffer?.();
        if (buf) generator.playBuffer?.(buf, volume);
        break;
      }
    }
  };

  const testSampleSound = async (sampleName: string) => {
    const audio = getGameAudio();
    const getSampleConfig = typeof (window as any).getSampleConfig === 'function' ? (window as any).getSampleConfig : null;
    if (!audio?.sampleLoader || !getSampleConfig) {
      return;
    }
    const config = getSampleConfig(sampleName);
    if (!config) return;
    const volume = audio.settings?.getSoundEffectsVolume?.(config.volume) ?? config.volume ?? 1;
    try {
      await audio.sampleLoader.playSample?.(config.url, volume);
    } catch (e) {
      console.warn('Sample play failed:', e);
    }
  };

  const preloadAllSamples = async () => {
    const audio = getGameAudio();
    const getAllSampleUrls = typeof (window as any).getAllSampleUrls === 'function' ? (window as any).getAllSampleUrls : null;
    if (!audio?.sampleLoader?.preloadSamples || !getAllSampleUrls) {
      return;
    }
    const urls = getAllSampleUrls();
    try {
      await audio.sampleLoader.preloadSamples(urls);
      const stats = audio.sampleLoader.getCacheStats?.() ?? {};
      setAudioStats((s) => ({ ...s, samplePreload: { loaded: urls.length, ...stats } }));
    } catch (e) {
      console.warn('Preload failed:', e);
    }
  };

  const showAudioStats = () => {
    const audio = getGameAudio();
    if (audio && typeof audio.getAudioStats === 'function') {
      setAudioStats(audio.getAudioStats());
    }
  };

  const testAllSounds = () => {
    const audio = getGameAudio();
    if (!audio?.soundEffects || typeof audio.playSound !== 'function') return;
    const names = Object.keys(audio.soundEffects);
    names.forEach((name, i) => {
      setTimeout(() => audio.playSound(name), i * 200);
    });
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: '2rem',
    padding: '1rem',
    backgroundColor: styles.bgSecondary,
    color: styles.text,
    border: `1px solid ${styles.border}`,
    borderRadius: '8px',
  };
  const soundButtonStyle: React.CSSProperties = {
    padding: '0.75rem 1rem',
    margin: '0.25rem',
    backgroundColor: styles.buttonSuccess,
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem',
  };
  const primaryButtonStyle: React.CSSProperties = { ...styles.button, margin: '0.25rem' };

  const getAudioBaseUrl = () => {
    if (typeof window === 'undefined') return '';
    return (
      (process.env.NEXT_PUBLIC_GAME_FRONTEND_URL as string | undefined) ||
      (window.location.hostname === 'localhost' ? 'http://localhost:8000' : window.location.origin)
    );
  };

  const buildAssetMusicUrl = (relPath: string) => {
    const base = getAudioBaseUrl().replace(/\/$/, '');
    const segs = String(relPath)
      .split('/')
      .map((s) => encodeURIComponent(s))
      .join('/');
    return `${base}/assets/Music/${segs}`;
  };

  const playAssetMusic = async (track: { label: string; relPath: string }) => {
    // Stop procedural background music to avoid overlap
    stopBackgroundMusic();

    // Stop prior asset-music audio element
    if (assetMusicEl) {
      try {
        assetMusicEl.pause();
        assetMusicEl.currentTime = 0;
      } catch (_) {}
      setAssetMusicEl(null);
    }

    // Resume WebAudio context too (some browsers are picky about audio policy)
    try {
      const audio = getGameAudio();
      if (audio && typeof audio.resumeContext === 'function') audio.resumeContext();
    } catch (_) {}

    const url = buildAssetMusicUrl(track.relPath);
    const el = new Audio(url);
    el.loop = true;
    el.volume = 0.8;
    el.preload = 'auto';
    setAssetMusicNowPlaying(track.label);
    setAssetMusicEl(el);

    try {
      await el.play();
    } catch (e) {
      console.warn('Failed to play asset music:', e);
      setAssetMusicNowPlaying(null);
    }
  };

  const stopAssetMusic = () => {
    if (!assetMusicEl) return;
    try {
      assetMusicEl.pause();
      assetMusicEl.currentTime = 0;
    } catch (_) {}
    setAssetMusicEl(null);
    setAssetMusicNowPlaying(null);
  };

  if (!audioLoaded && !audioError) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: styles.text }}>
        <p>Loading audio system...</p>
      </div>
    );
  }

  if (audioError) {
    return (
      <div style={{ padding: '2rem', backgroundColor: styles.bgError, borderRadius: '8px', color: styles.text, border: `1px solid ${styles.border}` }}>
        <strong>Error loading audio system</strong>
        <p>{audioError}</p>
        <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: styles.textSecondary }}>
          The sound test loads scripts from the game frontend (e.g. <code style={{ background: styles.bgTertiary, padding: '0.1em 0.3em', borderRadius: 4 }}>http://localhost:8000</code> when admin is on 3001). Start the frontend with <code style={{ background: styles.bgTertiary, padding: '0.1em 0.3em', borderRadius: 4 }}>npm run dev:all</code> or open the Sound Test tab again after the frontend is running.
        </p>
        <button type="button" onClick={() => { setAudioError(null); setAudioLoaded(false); }} style={{ ...primaryButtonStyle, marginTop: '1rem' }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ padding: '1rem', backgroundColor: styles.bgInfo, color: styles.text, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
        <strong>Sound Test</strong>
        <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: styles.text }}>
          Same as the game frontend: test all game sounds and music.
        </p>
      </div>

      <div style={sectionStyle}>
        <h3 style={{ marginTop: 0, color: styles.heading }}>Game Sounds</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button style={soundButtonStyle} onClick={() => testSound('shoot')}>Shoot</button>
          <button style={soundButtonStyle} onClick={() => testSound('enemyHit')}>Enemy Hit</button>
          <button style={soundButtonStyle} onClick={() => testSound('enemyDestroyed')}>Enemy Destroyed</button>
          <button style={soundButtonStyle} onClick={() => testSound('coinCollect')}>Coin Collect</button>
          <button style={soundButtonStyle} onClick={() => testSound('powerupCollect')}>Power Up</button>
          <button style={soundButtonStyle} onClick={() => testSound('powerupNegative')}>Power Down</button>
          <button style={soundButtonStyle} onClick={() => testSound('bossHit')}>Boss Hit</button>
          <button style={soundButtonStyle} onClick={() => testSound('bossDestroyed')}>Boss Destroyed</button>
          <button style={soundButtonStyle} onClick={() => testSound('gameOver')}>Game Over</button>
          <button style={soundButtonStyle} onClick={() => testSound('levelUp')}>Level Up</button>
          <button style={soundButtonStyle} onClick={() => testSound('playerHit')}>Player Hit</button>
        </div>
      </div>

      <div style={sectionStyle}>
        <h3 style={{ marginTop: 0, color: styles.heading }}>Force Field Sounds</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button style={soundButtonStyle} onClick={() => testForceFieldSound('activate')}>Force Field Activate</button>
          <button style={soundButtonStyle} onClick={() => testForceFieldSound('powerUp')}>Force Field Power Up</button>
          <button style={soundButtonStyle} onClick={() => testForceFieldSound('powerDown')}>Force Field Power Down</button>
          <button style={soundButtonStyle} onClick={() => testForceFieldSound('destroyed')}>Force Field Destroyed</button>
        </div>
      </div>

      <div style={sectionStyle}>
        <h3 style={{ marginTop: 0, color: styles.heading }}>Musical Sequences</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button style={soundButtonStyle} onClick={() => testSequence('ascending')}>Ascending Sequence</button>
          <button style={soundButtonStyle} onClick={() => testSequence('descending')}>Descending Sequence</button>
          <button style={soundButtonStyle} onClick={() => testSequence('destruction')}>Destruction Sequence</button>
        </div>
      </div>

      <div style={sectionStyle}>
        <h3 style={{ marginTop: 0, color: styles.heading }}>Gameplay Music</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button style={soundButtonStyle} onClick={testGameplayMusic}>Play Gameplay Music</button>
          <button style={soundButtonStyle} onClick={testBossMusic}>Play Boss Music</button>
          <button style={soundButtonStyle} onClick={stopBackgroundMusic}>Stop Music</button>
        </div>
        <h4 style={{ marginTop: '1.5rem', color: styles.heading }}>Theme Testing</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <button key={n} style={soundButtonStyle} onClick={() => testTheme(n)}>Theme {n}</button>
          ))}
        </div>
        <h4 style={{ marginTop: '1rem', color: styles.heading }}>Menu Themes (Soothing)</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {[9, 10, 11, 12].map((n) => (
            <button key={n} style={soundButtonStyle} onClick={() => testTheme(n)}>Theme {n}</button>
          ))}
        </div>
        <h4 style={{ marginTop: '1rem', color: styles.heading }}>Instrument Testing</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {['sine', 'square', 'sawtooth', 'triangle'].map((inst) => (
            <button key={inst} style={soundButtonStyle} onClick={() => testInstrument(inst)}>{inst}</button>
          ))}
        </div>
      </div>

      <div style={sectionStyle}>
        <h3 style={{ marginTop: 0, color: styles.heading }}>UI &amp; Feedback Sounds</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button style={soundButtonStyle} onClick={() => testSound('menuClick')}>Menu Click</button>
          <button style={soundButtonStyle} onClick={() => testSound('menuHover')}>Menu Hover</button>
          <button style={soundButtonStyle} onClick={() => testSound('achievement')}>Achievement</button>
          <button style={soundButtonStyle} onClick={() => testSound('warning')}>Warning</button>
          <button style={soundButtonStyle} onClick={() => testSound('success')}>Success</button>
        </div>
      </div>

      <div style={sectionStyle}>
        <h3 style={{ marginTop: 0, color: styles.heading }}>Audio Buffer Generator (Enhanced Sounds)</h3>
        <p style={{ fontSize: '0.9em', color: styles.textSecondary, marginBottom: 10 }}>
          Pre-computed buffers for richer sounds.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button style={soundButtonStyle} onClick={() => testBufferSound('explosion')}>Enhanced Explosion</button>
          <button style={soundButtonStyle} onClick={() => testBufferSound('explosionIntense')}>Intense Explosion</button>
          <button style={soundButtonStyle} onClick={() => testBufferSound('impact')}>Enhanced Impact</button>
          <button style={soundButtonStyle} onClick={() => testBufferSound('impactHeavy')}>Heavy Impact</button>
          <button style={soundButtonStyle} onClick={() => testBufferSound('coinJingle')}>Coin Jingle (Buffer)</button>
          <button style={soundButtonStyle} onClick={() => testBufferSound('gameOver')}>Game Over (Buffer)</button>
        </div>
      </div>

      <div style={sectionStyle}>
        <h3 style={{ marginTop: 0, color: styles.heading }}>Audio Samples (Pre-recorded)</h3>
        <p style={{ fontSize: '0.9em', color: styles.textSecondary, marginBottom: 10 }}>
          From audio files; fallback to buffers if missing.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button style={soundButtonStyle} onClick={() => testSampleSound('explosion')}>Explosion (Sample)</button>
          <button style={soundButtonStyle} onClick={() => testSampleSound('explosionLarge')}>Large Explosion (Sample)</button>
          <button style={soundButtonStyle} onClick={() => testSampleSound('impact')}>Impact (Sample)</button>
          <button style={soundButtonStyle} onClick={() => testSampleSound('impactHeavy')}>Heavy Impact (Sample)</button>
          <button style={soundButtonStyle} onClick={() => testSampleSound('bossDestroyed')}>Boss Destroyed (Sample)</button>
          <button style={soundButtonStyle} onClick={() => testSampleSound('gameOver')}>Game Over (Sample)</button>
        </div>
        <div style={{ marginTop: 10 }}>
          <button style={soundButtonStyle} onClick={preloadAllSamples}>Preload All Samples</button>
        </div>
      </div>

      <div style={sectionStyle}>
        <h3 style={{ marginTop: 0, color: styles.heading }}>Audio Debug</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button style={primaryButtonStyle} onClick={showAudioStats}>Audio Stats</button>
          <button style={primaryButtonStyle} onClick={testAllSounds}>Test All Sounds</button>
        </div>
        {audioStats && (
          <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: styles.bgSuccess, color: styles.text, borderRadius: 4, fontSize: '0.9rem', border: `1px solid ${styles.border}` }}>
            <strong>Audio Stats</strong>
            <pre style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap', color: styles.text }}>
              {JSON.stringify(audioStats, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <div style={sectionStyle}>
        <h3 style={{ marginTop: 0, color: styles.heading }}>Asset Music (New)</h3>
        <p style={{ fontSize: '0.9em', color: styles.textSecondary, marginBottom: 10 }}>
          Plays pre-made files from <code style={{ background: styles.bgTertiary, padding: '0.1em 0.3em', borderRadius: 4 }}>assets/Music/</code> on the game frontend.
        </p>
        {assetMusicNowPlaying && (
          <div style={{ marginBottom: 10, fontSize: '0.9em', color: styles.text }}>
            Now playing: <strong>{assetMusicNowPlaying}</strong>
          </div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {assetMusicTracks.map((t) => (
            <button key={t.relPath} style={soundButtonStyle} onClick={() => playAssetMusic(t)}>
              🎵 {t.label}
            </button>
          ))}
          <button style={{ ...soundButtonStyle, backgroundColor: styles.buttonDanger }} onClick={stopAssetMusic}>
            ⏹ Stop Asset Music
          </button>
        </div>
      </div>
    </div>
  );
}
