// ==========================================
// Admin Page - Sound Test Tab Component
// ==========================================

'use client';

import { useState, useEffect } from 'react';

export function SoundTestTab() {
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [audioStats, setAudioStats] = useState<any>(null);

  // Load audio scripts dynamically
  useEffect(() => {
    if (audioLoaded) return;

    const loadAudioScripts = async () => {
      // Check if audio system is already loaded
      // Check for getGameAudio function which is exposed by audio-integration.js
      const audioAlreadyLoaded = typeof window !== 'undefined' && 
        typeof (window as any).getGameAudio === 'function';

      if (audioAlreadyLoaded) {
        console.log('✅ Audio system already loaded, skipping script loading');
        setAudioLoaded(true);
        return;
      }

      // Check if any audio scripts are already in the DOM (even with different cache-buster)
      const audioScriptPaths = [
        '/src/game/audio/core/audio-context.js',
        '/src/game/audio/settings/audio-settings.js',
        '/src/game/audio/music/music-patterns.js',
        '/src/game/audio/music/music-composer.js',
        '/src/game/audio/music/music-manager.js',
        '/src/game/audio/effects/sound-effects.js',
        '/src/game/audio/audio-manager.js',
        '/src/game/audio/audio-integration.js',
      ];

      const scriptsAlreadyInDOM = audioScriptPaths.some(basePath => {
        return Array.from(document.querySelectorAll('script[src]')).some(
          (s) => (s as HTMLScriptElement).src.includes(basePath)
        );
      });

      if (scriptsAlreadyInDOM) {
        console.log('✅ Audio scripts already in DOM, waiting for initialization...');
        // Wait a bit and check if audio system becomes available
        let attempts = 0;
        const checkInterval = setInterval(() => {
          attempts++;
          if (typeof (window as any).getGameAudio === 'function') {
            clearInterval(checkInterval);
            setAudioLoaded(true);
          } else if (attempts > 10) {
            clearInterval(checkInterval);
            setAudioError('Audio scripts loaded but system not initialized');
          }
        }, 500);
        return;
      }

      // Audio scripts are now in the Next.js public directory
      // Files are accessible at /src/game/audio/... from the public folder
      // Add cache-busting query parameter to ensure latest version loads
      const cacheBuster = `?v=${Date.now()}`;
      const scripts = [
        `/src/game/audio/core/audio-context.js${cacheBuster}`,
        `/src/game/audio/settings/audio-settings.js${cacheBuster}`,
        `/src/game/audio/music/music-patterns.js${cacheBuster}`,
        `/src/game/audio/music/music-composer.js${cacheBuster}`,
        `/src/game/audio/music/music-manager.js${cacheBuster}`,
        `/src/game/audio/effects/sound-effects.js${cacheBuster}`,
        `/src/game/audio/audio-manager.js${cacheBuster}`,
        `/src/game/audio/audio-integration.js${cacheBuster}`,
      ];

      try {
        for (const src of scripts) {
          await new Promise<void>((resolve, reject) => {
            // Extract base path without cache-buster for checking
            const basePath = src.split('?')[0];
            
            // Check if script is already loaded (by base path, ignoring cache-buster)
            const existingScript = Array.from(document.querySelectorAll('script[src]')).find(
              (s) => (s as HTMLScriptElement).src.includes(basePath)
            ) as HTMLScriptElement | undefined;
            
            // If script already exists, skip loading it (don't reload to avoid duplicate declarations)
            if (existingScript) {
              console.log(`⏭️ Script already loaded: ${basePath}, skipping`);
              resolve();
              return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load ${src}`));
            document.head.appendChild(script);
          });
        }

        // Wait a bit for initialization
        await new Promise(resolve => setTimeout(resolve, 500));

        // Check if audio system is available
        if (typeof window !== 'undefined' && (window as any).getGameAudio) {
          const gameAudio = (window as any).getGameAudio();
          if (gameAudio) {
            setAudioLoaded(true);
          } else {
            // Try to initialize
            if (typeof (window as any).initGameAudio === 'function') {
              (window as any).initGameAudio();
              await new Promise(resolve => setTimeout(resolve, 500));
              if ((window as any).getGameAudio()) {
                setAudioLoaded(true);
              } else {
                setAudioError('Audio system loaded but initialization failed');
              }
            } else {
              setAudioError('Audio system loaded but getGameAudio() is not available');
            }
          }
        } else {
          setAudioError('Audio system not found after loading scripts');
        }
      } catch (error) {
        console.error('Error loading audio scripts:', error);
        setAudioError(error instanceof Error ? error.message : 'Unknown error loading audio scripts');
      }
    };

    loadAudioScripts();
  }, [audioLoaded]);

  const playTestSound = () => {
    if (typeof window !== 'undefined' && (window as any).getGameAudio) {
      const gameAudio = (window as any).getGameAudio();
      if (gameAudio && gameAudio.playSound) {
        gameAudio.playSound('shoot');
      }
    }
  };

  const getAudioStats = () => {
    if (typeof window !== 'undefined' && (window as any).getGameAudio) {
      const gameAudio = (window as any).getGameAudio();
      if (gameAudio && gameAudio.getStats) {
        const stats = gameAudio.getStats();
        setAudioStats(stats);
      } else {
        setAudioStats({ error: 'getStats() not available' });
      }
    } else {
      setAudioStats({ error: 'Audio system not available' });
    }
  };

  return (
    <div style={{ padding: '1.5rem', backgroundColor: '#f5f5f5', borderRadius: '8px', border: '1px solid #ccc' }}>
      <h2 style={{ marginBottom: '1rem' }}>🔊 Audio System Test</h2>
      
      {!audioLoaded && !audioError && (
        <div style={{ padding: '1rem', backgroundColor: '#fff3cd', borderRadius: '4px', marginBottom: '1rem' }}>
          <p>Loading audio system...</p>
        </div>
      )}

      {audioError && (
        <div style={{ padding: '1rem', backgroundColor: '#f8d7da', borderRadius: '4px', marginBottom: '1rem', color: '#721c24' }}>
          <strong>Error:</strong> {audioError}
        </div>
      )}

      {audioLoaded && (
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <button
              type="button"
              onClick={playTestSound}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                marginRight: '1rem',
              }}
            >
              Play Test Sound
            </button>
            <button
              type="button"
              onClick={getAudioStats}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Get Audio Stats
            </button>
          </div>

          {audioStats && (
            <div style={{ padding: '1rem', backgroundColor: '#e3f2fd', borderRadius: '4px', marginTop: '1rem' }}>
              <strong>Audio Stats:</strong>
              <pre style={{ marginTop: '0.5rem', fontSize: '0.9rem', overflow: 'auto' }}>
                {JSON.stringify(audioStats, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

