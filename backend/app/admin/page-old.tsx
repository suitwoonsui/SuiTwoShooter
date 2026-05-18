'use client';

import { useState, useEffect } from 'react';
import { getApiBaseUrl } from '@/lib/services/config/base-url/api-base-url';

type Tab = 'items' | 'badges' | 'migration' | 'tournaments' | 'sound-test';
type MigrationSubType = 'inventory' | 'stats' | 'game-pass';
type TournamentWizardStep = 'name' | 'category' | 'schedule' | 'entry' | 'review';

// Helper function to get full API URL
// Uses localhost when running locally, otherwise uses configured base URL
const getApiUrl = (path: string): string => {
  const baseUrl = getApiBaseUrl();
  console.log('[ADMIN-PAGE] getApiUrl called:', { path, baseUrl, envVar: process.env.NEXT_PUBLIC_API_BASE_URL });
  
  // Remove leading slash from path if baseUrl is provided (to avoid double slashes)
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  // Use localhost when running locally, otherwise use configured base URL
  let finalBaseUrl: string;
  if (typeof window !== 'undefined') {
    // Client-side: check if we're on localhost
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalhost) {
      finalBaseUrl = 'http://localhost:3000';
    } else if (baseUrl && !baseUrl.includes('localhost')) {
      finalBaseUrl = baseUrl;
    } else {
      // Fallback to Vercel URL only if not localhost and no baseUrl configured
      finalBaseUrl = 'https://sui-two-shooter-backend-sui-integra.vercel.app';
    }
  } else {
    // Server-side: use baseUrl or fallback
    finalBaseUrl = baseUrl || 'http://localhost:3000';
  }
  
  const fullUrl = `${finalBaseUrl}/${cleanPath}`;
  console.log('[ADMIN-PAGE] Final URL:', fullUrl);
  return fullUrl;
};

// Sound Test Tab Component
function SoundTestTab() {
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [audioStats, setAudioStats] = useState<any>(null);

  // Load audio scripts dynamically
  useEffect(() => {
    if (audioLoaded) return;

    const loadAudioScripts = async () => {
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
            if (existingScript) {
              // Remove old script and reload with new cache-buster
              existingScript.remove();
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
              setTimeout(() => {
                const audio = (window as any).getGameAudio();
                if (audio) {
                  setAudioLoaded(true);
                } else {
                  setAudioError('Audio system initialized but not available');
                }
              }, 500);
            } else {
              setAudioError('Audio initialization function not found');
            }
          }
        } else {
          setAudioError('Audio system not available. Make sure the game audio scripts are accessible.');
        }
      } catch (error) {
        setAudioError(error instanceof Error ? error.message : 'Failed to load audio scripts');
      }
    };

    loadAudioScripts();
  }, [audioLoaded]);

  const getGameAudio = () => {
    if (typeof window !== 'undefined' && (window as any).getGameAudio) {
      return (window as any).getGameAudio();
    }
    return null;
  };

  const testSound = (soundName: string) => {
    const audio = getGameAudio();
    if (audio && typeof audio.playSound === 'function') {
      if (soundName === 'shoot') {
        // Special case for shoot sound
        if (typeof (window as any).playShootSound === 'function') {
          (window as any).playShootSound();
        } else {
          audio.playSound(soundName);
        }
      } else {
        audio.playSound(soundName);
      }
    } else {
      alert(`Audio system not loaded. Please wait for scripts to load.`);
    }
  };

  const testForceFieldSound = (type: string) => {
    const audio = getGameAudio();
    if (audio) {
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
    }
  };

  const testSequence = (type: string) => {
    const audio = getGameAudio();
    if (audio) {
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
    }
  };

  const testGameplayMusic = () => {
    const audio = getGameAudio();
    if (audio && typeof audio.playGameplayMusic === 'function') {
      audio.playGameplayMusic();
    }
  };

  const testBossMusic = () => {
    const audio = getGameAudio();
    if (audio && typeof audio.playBossMusic === 'function') {
      audio.playBossMusic();
    }
  };

  const stopBackgroundMusic = () => {
    const audio = getGameAudio();
    if (audio && typeof audio.stopBackgroundMusic === 'function') {
      audio.stopBackgroundMusic();
    }
  };

  const testTheme = (themeNumber: number) => {
    const audio = getGameAudio();
    if (audio && typeof audio.testTheme === 'function') {
      audio.testTheme(themeNumber);
    }
  };

  const testInstrument = (instrument: string) => {
    const audio = getGameAudio();
    if (audio && typeof audio.testInstrument === 'function') {
      audio.testInstrument(instrument);
    }
  };

  const showAudioStats = () => {
    const audio = getGameAudio();
    if (audio && typeof audio.getAudioStats === 'function') {
      const stats = audio.getAudioStats();
      setAudioStats(stats);
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
  };

  const testAllSounds = () => {
    const audio = getGameAudio();
    if (audio && audio.soundEffects) {
      const soundNames = Object.keys(audio.soundEffects);
      let delay = 0;
      
      soundNames.forEach(soundName => {
        setTimeout(() => {
          audio.playSound(soundName);
        }, delay);
        delay += 200;
      });
      
      alert(`Testing ${soundNames.length} sounds with ${delay}ms total duration`);
    } else {
      alert('Audio system not initialized (audio scripts not loaded yet)');
    }
  };

  const buttonStyle: React.CSSProperties = {
    padding: '0.75rem 1rem',
    margin: '0.25rem',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem',
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: '2rem',
    padding: '1rem',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
  };

  if (!audioLoaded && !audioError) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading audio system...</p>
      </div>
    );
  }

  if (audioError) {
    return (
      <div style={{ padding: '2rem', backgroundColor: '#f8d7da', borderRadius: '8px', color: '#721c24' }}>
        <strong>❌ Error loading audio system:</strong>
        <p>{audioError}</p>
        <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
          Note: The sound test requires access to the game's audio scripts. Make sure the game files are accessible from this page.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ padding: '1rem', backgroundColor: '#e3f2fd', borderRadius: '4px' }}>
        <strong>🔊 Sound Test</strong>
        <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
          Test all game sounds and music. Audio system is loaded and ready.
        </p>
      </div>

      <div style={sectionStyle}>
        <h3 style={{ marginTop: 0 }}>🎵 Game Sounds</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button style={buttonStyle} onClick={() => testSound('shoot')}>🔫 Shoot</button>
          <button style={buttonStyle} onClick={() => testSound('enemyHit')}>💥 Enemy Hit</button>
          <button style={buttonStyle} onClick={() => testSound('enemyDestroyed')}>💀 Enemy Destroyed</button>
          <button style={buttonStyle} onClick={() => testSound('coinCollect')}>🪙 Coin Collect</button>
          <button style={buttonStyle} onClick={() => testSound('powerupCollect')}>⚡ Power Up</button>
          <button style={buttonStyle} onClick={() => testSound('powerupNegative')}>⚠️ Power Down</button>
          <button style={buttonStyle} onClick={() => testSound('bossHit')}>🎯 Boss Hit</button>
          <button style={buttonStyle} onClick={() => testSound('bossDestroyed')}>💀 Boss Destroyed</button>
          <button style={buttonStyle} onClick={() => testSound('gameOver')}>💀 Game Over</button>
          <button style={buttonStyle} onClick={() => testSound('levelUp')}>📈 Level Up</button>
          <button style={buttonStyle} onClick={() => testSound('playerHit')}>💢 Player Hit</button>
        </div>
      </div>

      <div style={sectionStyle}>
        <h3 style={{ marginTop: 0 }}>🛡️ Force Field Sounds</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button style={buttonStyle} onClick={() => testForceFieldSound('activate')}>🟢 Force Field Activate</button>
          <button style={buttonStyle} onClick={() => testForceFieldSound('powerUp')}>🔵 Force Field Power Up</button>
          <button style={buttonStyle} onClick={() => testForceFieldSound('powerDown')}>🟡 Force Field Power Down</button>
          <button style={buttonStyle} onClick={() => testForceFieldSound('destroyed')}>🔴 Force Field Destroyed</button>
        </div>
      </div>

      <div style={sectionStyle}>
        <h3 style={{ marginTop: 0 }}>🎼 Musical Sequences</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button style={buttonStyle} onClick={() => testSequence('ascending')}>📈 Ascending Sequence</button>
          <button style={buttonStyle} onClick={() => testSequence('descending')}>📉 Descending Sequence</button>
          <button style={buttonStyle} onClick={() => testSequence('destruction')}>💥 Destruction Sequence</button>
        </div>
      </div>

      <div style={sectionStyle}>
        <h3 style={{ marginTop: 0 }}>🎵 Gameplay Music</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button style={buttonStyle} onClick={testGameplayMusic}>🎶 Play Gameplay Music</button>
          <button style={buttonStyle} onClick={testBossMusic}>👹 Play Boss Music</button>
          <button style={buttonStyle} onClick={stopBackgroundMusic}>⏹️ Stop Music</button>
        </div>

        <h4 style={{ marginTop: '1.5rem' }}>🎵 Theme Testing</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button style={buttonStyle} onClick={() => testTheme(1)}>🌌 Theme 1: Atmospheric</button>
          <button style={buttonStyle} onClick={() => testTheme(2)}>⚡ Theme 2: Driving Action</button>
          <button style={buttonStyle} onClick={() => testTheme(3)}>🔇 Theme 3: Minimalist</button>
          <button style={buttonStyle} onClick={() => testTheme(4)}>🌃 Theme 4: Neo-Tokyo Cyberpunk</button>
          <button style={buttonStyle} onClick={() => testTheme(5)}>🚀 Theme 5: Action Packed</button>
          <button style={buttonStyle} onClick={() => testTheme(6)}>🎖️ Theme 6: Militaristic</button>
          <button style={buttonStyle} onClick={() => testTheme(7)}>⚡ Theme 7: High Energy</button>
          <button style={buttonStyle} onClick={() => testTheme(8)}>💥 Theme 8: Aggressive</button>
        </div>

        <h4 style={{ marginTop: '1.5rem' }}>🌙 Menu Themes (Soothing)</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button style={buttonStyle} onClick={() => testTheme(9)}>🌸 Theme 9: Gentle Ambient</button>
          <button style={buttonStyle} onClick={() => testTheme(10)}>🕊️ Theme 10: Peaceful Melody</button>
          <button style={buttonStyle} onClick={() => testTheme(11)}>✨ Theme 11: Soft Harmony</button>
          <button style={buttonStyle} onClick={() => testTheme(12)}>🌌 Theme 12: Tranquil Space</button>
        </div>

        <h4 style={{ marginTop: '1.5rem' }}>🎼 Instrument Testing</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button style={buttonStyle} onClick={() => testInstrument('sine')}>🔔 Sine Wave (Pure)</button>
          <button style={buttonStyle} onClick={() => testInstrument('square')}>📦 Square Wave (Digital)</button>
          <button style={buttonStyle} onClick={() => testInstrument('sawtooth')}>🔺 Sawtooth Wave (Buzzy)</button>
          <button style={buttonStyle} onClick={() => testInstrument('triangle')}>🔺 Triangle Wave (Soft)</button>
        </div>
      </div>

      <div style={sectionStyle}>
        <h3 style={{ marginTop: 0 }}>🎮 UI & Feedback Sounds</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button style={buttonStyle} onClick={() => testSound('menuClick')}>🖱️ Menu Click</button>
          <button style={buttonStyle} onClick={() => testSound('menuHover')}>👆 Menu Hover</button>
          <button style={buttonStyle} onClick={() => testSound('achievement')}>🏆 Achievement</button>
          <button style={buttonStyle} onClick={() => testSound('warning')}>⚠️ Warning</button>
          <button style={buttonStyle} onClick={() => testSound('success')}>✅ Success</button>
        </div>
      </div>

      <div style={sectionStyle}>
        <h3 style={{ marginTop: 0 }}>🔧 Audio Debug</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button style={buttonStyle} onClick={showAudioStats}>📊 Audio Stats</button>
          <button style={buttonStyle} onClick={testAllSounds}>🎵 Test All Sounds</button>
        </div>
        {audioStats && (
          <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#e8f5e9', borderRadius: '4px', fontSize: '0.9rem' }}>
            <strong>Audio Stats:</strong>
            <pre style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(audioStats, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('items');
  // Start with false to avoid hydration mismatch - will be updated in useEffect
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [migrationSubType, setMigrationSubType] = useState<MigrationSubType>('inventory');
  
  // Shared wallet state
  const [adminAddress, setAdminAddress] = useState<string | null>(null);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);

  // Items state
  const [playerAddress, setPlayerAddress] = useState('');
  const [items, setItems] = useState<Array<{ itemId: string; level: number; quantity: number }>>([
    { itemId: 'extra_lives', level: 1, quantity: 1 }
  ]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsResult, setItemsResult] = useState<{ success: boolean; message?: string; error?: string; digest?: string } | null>(null);

  // Badges state
  const [badgeAction, setBadgeAction] = useState<'mint' | 'burn' | 'cleanup' | 'update-image'>('mint');
  const [badgeContract, setBadgeContract] = useState<'new' | 'old'>('new');
  const [badgePlayerAddress, setBadgePlayerAddress] = useState('');
  const [tier, setTier] = useState<number>(0);
  const [badgeId, setBadgeId] = useState('');
  const [badgesLoading, setBadgesLoading] = useState(false);
  const [badgesResult, setBadgesResult] = useState<{ success: boolean; message?: string; error?: string; digest?: string } | null>(null);
  const [lookupAddress, setLookupAddress] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<{ badgeId?: string; error?: string } | null>(null);
  
  // Update image URL state
  const [updateImageAddress, setUpdateImageAddress] = useState('');
  const [updateImageLoading, setUpdateImageLoading] = useState(false);
  const [updateImageResult, setUpdateImageResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);

  // Migration state
  const [migrationMode, setMigrationMode] = useState<'single' | 'batch' | 'auto'>('auto');
  const [migrationAddress, setMigrationAddress] = useState('');
  const [migrationAddresses, setMigrationAddresses] = useState('');
  const [oldPackageId, setOldPackageId] = useState('');
  const [oldStoreObjectId, setOldStoreObjectId] = useState('');
  const [migrationLoading, setMigrationLoading] = useState(false);
  const [migrationResults, setMigrationResults] = useState<Array<{ address: string; success: boolean; digest?: string; error?: string }>>([]);
  const [migrationProgress, setMigrationProgress] = useState<{ current: number; total: number } | null>(null);
  const [discoveredWallets, setDiscoveredWallets] = useState<string[]>([]);
  const [discoveringWallets, setDiscoveringWallets] = useState(false);

  // Score Migration state
  const [scoreMigrationMode, setScoreMigrationMode] = useState<'single' | 'batch' | 'auto'>('auto');
  const [scoreMigrationAddress, setScoreMigrationAddress] = useState('');
  const [scoreMigrationAddresses, setScoreMigrationAddresses] = useState('');
  const [oldScorePackageId, setOldScorePackageId] = useState('');
  const [oldStatsRegistryId, setOldStatsRegistryId] = useState('');
  const [scoreMigrationLoading, setScoreMigrationLoading] = useState(false);
  const [scoreMigrationResults, setScoreMigrationResults] = useState<Array<{ address: string; success: boolean; digest?: string; error?: string }>>([]);
  const [scoreMigrationProgress, setScoreMigrationProgress] = useState<{ current: number; total: number } | null>(null);
  const [discoveredScoreWallets, setDiscoveredScoreWallets] = useState<string[]>([]);
  const [discoveringScoreWallets, setDiscoveringScoreWallets] = useState(false);

  // Game Pass Migration state
  const [gamePassMigrationMode, setGamePassMigrationMode] = useState<'single' | 'batch' | 'auto'>('auto');
  const [gamePassMigrationAddress, setGamePassMigrationAddress] = useState('');
  const [gamePassMigrationAddresses, setGamePassMigrationAddresses] = useState('');
  const [oldGamePassPackageId, setOldGamePassPackageId] = useState('');
  const [oldGamePassSystemId, setOldGamePassSystemId] = useState('');
  const [gamePassMigrationLoading, setGamePassMigrationLoading] = useState(false);
  const [gamePassMigrationResults, setGamePassMigrationResults] = useState<Array<{ address: string; success: boolean; digest?: string; error?: string }>>([]);
  const [gamePassMigrationProgress, setGamePassMigrationProgress] = useState<{ current: number; total: number } | null>(null);
  const [discoveredGamePassWallets, setDiscoveredGamePassWallets] = useState<string[]>([]);
  const [discoveringGamePassWallets, setDiscoveringGamePassWallets] = useState(false);

  // Clear Stats state
  const [clearStatsAddress, setClearStatsAddress] = useState('');
  const [clearStatsLoading, setClearStatsLoading] = useState(false);
  const [clearStatsResult, setClearStatsResult] = useState<{ success: boolean; digest?: string; error?: string } | null>(null);

  // Tournament Creation Wizard state
  const [wizardStep, setWizardStep] = useState<TournamentWizardStep>('name');
  const [tournamentName, setTournamentName] = useState('');
  const [tournamentCategory, setTournamentCategory] = useState<'totalCoins' | 'longestStreak' | 'highestScore' | 'longestDistance' | 'mostBosses' | 'mostEnemies'>('highestScore');
  const [tournamentStartDate, setTournamentStartDate] = useState('');
  const [tournamentStartTime, setTournamentStartTime] = useState('');
  const [tournamentEndDate, setTournamentEndDate] = useState('');
  const [tournamentEndTime, setTournamentEndTime] = useState('');
  const [entryFeeTickets, setEntryFeeTickets] = useState<number>(1);
  const [tournamentCreating, setTournamentCreating] = useState(false);
  const [tournamentResult, setTournamentResult] = useState<{ success: boolean; tournament?: any; error?: string } | null>(null);

  // Tournament Migration state (for future use)
  const [tournamentMigrationMode, setTournamentMigrationMode] = useState<'single' | 'batch' | 'auto'>('single');
  const [tournamentMigrationAddress, setTournamentMigrationAddress] = useState('');
  const [tournamentMigrationAddresses, setTournamentMigrationAddresses] = useState('');
  const [tournamentMigrationLoading, setTournamentMigrationLoading] = useState(false);
  const [tournamentMigrationResults, setTournamentMigrationResults] = useState<Array<{ address: string; success: boolean; digest?: string; error?: string }>>([]);

  const itemTypes = [
    { id: 'extra_lives', name: 'Extra Lives', levels: [1, 2, 3] },
    { id: 'force_field', name: 'Force Field', levels: [1, 2, 3] },
    { id: 'orb_level', name: 'Orb Level', levels: [1, 2, 3] },
    { id: 'slow_time', name: 'Slow Time', levels: [1, 2, 3] },
    { id: 'destroy_all', name: 'Destroy All Enemies', levels: [] },
    { id: 'boss_kill_shot', name: 'Boss Kill Shot', levels: [] },
    { id: 'coin_tractor_beam', name: 'Coin Tractor Beam', levels: [1, 2, 3] },
  ];

  const tierNames = [
    'Starter (0)',
    'Common (1)',
    'Uncommon (2)',
    'Rare (3)',
    'Epic (4)',
    'Legendary (5)',
  ];

  // Load dark mode preference from localStorage after hydration (prevents hydration mismatch)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('adminDarkMode');
      if (saved === 'true') {
        setDarkMode(true);
      }
    }
  }, []);

  // Load wallet API script and initialize
  useEffect(() => {
    let scriptLoaded = false;
    let checkInterval: NodeJS.Timeout | null = null;

    const loadWalletAPI = async () => {
      // Check if already loaded
      if (window.walletAPIInstance) {
        console.log('✅ Wallet API already loaded');
        return;
      }

      // Check if script is already in the DOM
      if (document.querySelector('script[src*="wallet-api"]')) {
        console.log('✅ Wallet script already in DOM, waiting for initialization...');
        // Wait for initialization
        checkInterval = setInterval(() => {
          if (window.walletAPIInstance) {
            clearInterval(checkInterval!);
            console.log('✅ Wallet API initialized after script load');
          }
        }, 500);
        return;
      }

      // Load the wallet script
      try {
        // Get network and wallet module URL from config
        const configResponse = await fetch(getApiUrl('api/config'));
        const config = await configResponse.json();
        const network = config.network || 'testnet';
        const walletModuleUrl = config.walletModuleUrl || 'http://localhost:3000/wallet-api.umd.cjs'; // Platform only

        // Create and load script
        const script = document.createElement('script');
        script.src = walletModuleUrl;
        script.async = true;
        
        script.onload = async () => {
          console.log('✅ Wallet script loaded');
          
          // Initialize wallet API
          if (typeof window.WalletAPI !== 'undefined') {
            try {
              if (typeof window.WalletAPI.initialize === 'function') {
                const api = await window.WalletAPI.initialize({ network });
                window.walletAPIInstance = api;
                console.log('✅ Wallet API initialized:', api);
              } else {
                console.error('❌ WalletAPI.initialize is not a function');
              }
            } catch (error) {
              console.error('❌ Failed to initialize wallet API:', error);
            }
          } else {
            console.error('❌ WalletAPI not found after script load');
          }
        };

        script.onerror = () => {
          console.error('❌ Failed to load wallet script from:', walletModuleUrl);
          setWalletError('Failed to load wallet module. Please ensure the wallet module is accessible.');
        };

        document.head.appendChild(script);
        scriptLoaded = true;
      } catch (error) {
        console.error('❌ Error loading wallet API:', error);
        setWalletError('Failed to load wallet API. Please refresh the page.');
      }
    };

    // Load admin address
    fetch(getApiUrl('api/admin/verify-wallet'))
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setAdminAddress(data.adminAddress.toLowerCase());
        }
      })
      .catch(err => console.error('Failed to load admin address:', err));

    // Load wallet API
    loadWalletAPI();

    // Check if wallet is already connected
    const checkWallet = setInterval(() => {
      if (window.walletAPIInstance) {
        clearInterval(checkWallet);
        if (window.walletAPIInstance.isConnected()) {
          const address = window.walletAPIInstance.getAddress();
          if (address) {
            setConnectedAddress(address.toLowerCase());
          }
        }
      }
    }, 500);

    return () => {
      clearInterval(checkWallet);
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, []);

  const connectWallet = async () => {
    setWalletError(null);
    
    // Try to initialize if WalletAPI is available but not initialized
    if (!window.walletAPIInstance && window.WalletAPI && typeof window.WalletAPI.initialize === 'function') {
      try {
        const configResponse = await fetch(getApiUrl('api/config'));
        const config = await configResponse.json();
        const network = config.network || 'testnet';
        const api = await window.WalletAPI.initialize({ network });
        window.walletAPIInstance = api;
        console.log('✅ Wallet API initialized on connect');
      } catch (error) {
        console.error('❌ Failed to initialize wallet API:', error);
        setWalletError('Failed to initialize wallet API. Please refresh the page.');
        return;
      }
    }
    
    if (!window.walletAPIInstance) {
      setWalletError('Wallet API not loaded. Please refresh the page and ensure the wallet module is accessible.');
      return;
    }

    try {
      const result = await window.walletAPIInstance.connect();
      
      if (result.success && result.address) {
        const address = result.address.toLowerCase();
        setConnectedAddress(address);
        
        if (address === adminAddress) {
          setWalletError(null);
        } else {
          setWalletError(`Wrong wallet! Please connect the admin wallet.`);
          await window.walletAPIInstance.disconnect();
          setConnectedAddress(null);
        }
      } else {
        setWalletError(result.error || 'Failed to connect wallet');
      }
    } catch (error) {
      setWalletError(error instanceof Error ? error.message : 'Error connecting wallet');
    }
  };

  const disconnectWallet = async () => {
    if (window.walletAPIInstance && window.walletAPIInstance.isConnected()) {
      await window.walletAPIInstance.disconnect();
    }
    setConnectedAddress(null);
    setWalletError(null);
  };

  // Dark mode toggle
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('adminDarkMode', String(newDarkMode));
    }
  };

  // Dark mode style helper
  const getDarkModeStyles = () => {
    if (!darkMode) {
      return {
        bg: '#ffffff',
        bgSecondary: '#f9f9f9',
        bgTertiary: '#f5f5f5',
        bgInfo: '#e3f2fd',
        bgSuccess: '#d4edda',
        bgWarning: '#fff3cd',
        bgError: '#f8d7da',
        text: '#000000',
        textSecondary: '#666666',
        textSuccess: '#155724',
        textError: '#721c24',
        border: '#ccc',
        borderSuccess: '#c3e6cb',
        borderError: '#f5c6cb',
        inputBg: '#ffffff',
        buttonPrimary: '#2196F3',
        buttonSuccess: '#4CAF50',
        buttonDanger: '#f44336',
        buttonDisabled: '#ccc',
      };
    } else {
      return {
        bg: '#1a1a1a',
        bgSecondary: '#2d2d2d',
        bgTertiary: '#3a3a3a',
        bgInfo: '#1e3a5f',
        bgSuccess: '#1e4620',
        bgWarning: '#5a4a1a',
        bgError: '#5a1e1e',
        text: '#e0e0e0',
        textSecondary: '#b0b0b0',
        textSuccess: '#81c784',
        textError: '#e57373',
        border: '#555555',
        borderSuccess: '#4caf50',
        borderError: '#f44336',
        inputBg: '#2d2d2d',
        buttonPrimary: '#2196F3',
        buttonSuccess: '#4CAF50',
        buttonDanger: '#f44336',
        buttonDisabled: '#555555',
      };
    }
  };

  const styles = getDarkModeStyles();

  const isAdminWalletConnected = connectedAddress === adminAddress;

  // Items functions
  const addItem = () => {
    setItems([...items, { itemId: 'extra_lives', level: 1, quantity: 1 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    const item = newItems[index];
    
    if (field === 'level' || field === 'quantity') {
      (item as any)[field] = parseInt(value) || 1;
    } else if (field === 'itemId') {
      item.itemId = value;
    } else {
      (item as any)[field] = value;
    }
    setItems(newItems);
  };

  const handleItemsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setItemsLoading(true);
    setItemsResult(null);

    try {
      if (!isAdminWalletConnected || connectedAddress !== adminAddress) {
        setItemsResult({
          success: false,
          error: 'Admin wallet not connected. Please connect the admin wallet.',
        });
        setItemsLoading(false);
        return;
      }

      const response = await fetch(getApiUrl('api/admin/add-items'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerAddress,
          items,
          adminWalletAddress: connectedAddress,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setItemsResult({
          success: true,
          message: data.message,
          digest: data.digest,
        });
        setPlayerAddress('');
        setItems([{ itemId: 'extra_lives', level: 1, quantity: 1 }]);
      } else {
        setItemsResult({
          success: false,
          error: data.error || 'Failed to add items',
        });
      }
    } catch (error) {
      setItemsResult({
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      });
    } finally {
      setItemsLoading(false);
    }
  };

  // Migration functions
  const handleDiscoverWallets = async () => {
    setDiscoveringWallets(true);
    setDiscoveredWallets([]);

    try {
      if (!isAdminWalletConnected || connectedAddress !== adminAddress) {
        alert('Admin wallet not connected. Please connect the admin wallet.');
        setDiscoveringWallets(false);
        return;
      }

      const oldStoreId = oldStoreObjectId || undefined;
      const queryParam = oldStoreId ? `?oldStoreObjectId=${encodeURIComponent(oldStoreId)}` : '';
      
      const response = await fetch(`${getApiUrl('api/store/migrate')}${queryParam}`);
      const data = await response.json();

      if (response.ok && data.success && data.wallets) {
        setDiscoveredWallets(data.wallets);
        if (data.wallets.length === 0) {
          alert('No wallets with inventory found in the old store.');
        }
      } else {
        alert(data.error || 'Failed to discover wallets');
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Network error');
    } finally {
      setDiscoveringWallets(false);
    }
  };

  const handleMigrationSubmit = async () => {
    setMigrationLoading(true);
    setMigrationResults([]);
    setMigrationProgress(null);

    try {
      if (!isAdminWalletConnected || connectedAddress !== adminAddress) {
        setMigrationResults([{
          address: 'N/A',
          success: false,
          error: 'Admin wallet not connected. Please connect the admin wallet.',
        }]);
        setMigrationLoading(false);
        return;
      }

      let addresses: string[] = [];
      
      if (migrationMode === 'auto') {
        addresses = discoveredWallets;
      } else if (migrationMode === 'single') {
        addresses = [migrationAddress.trim()];
      } else {
        addresses = migrationAddresses
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0 && line.startsWith('0x'));
      }

      if (addresses.length === 0) {
        setMigrationResults([{
          address: 'N/A',
          success: false,
          error: 'No valid addresses provided',
        }]);
        setMigrationLoading(false);
        return;
      }

      setMigrationProgress({ current: 0, total: addresses.length });
      const results: Array<{ address: string; success: boolean; digest?: string; error?: string }> = [];

      for (let i = 0; i < addresses.length; i++) {
        const address = addresses[i];
        setMigrationProgress({ current: i, total: addresses.length });

        try {
          const response = await fetch(getApiUrl('api/store/migrate'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              playerAddress: address,
              ...(oldPackageId && { oldPackageId }),
              ...(oldStoreObjectId && { oldStoreObjectId }),
            }),
          });

          const data = await response.json();

          if (response.ok && data.success) {
            results.push({
              address,
              success: true,
              digest: data.digest,
            });
          } else {
            results.push({
              address,
              success: false,
              error: data.error || 'Migration failed',
            });
          }
        } catch (error) {
          results.push({
            address,
            success: false,
            error: error instanceof Error ? error.message : 'Network error',
          });
        }

        // Update results as we go
        setMigrationResults([...results]);
      }

      setMigrationProgress({ current: addresses.length, total: addresses.length });
      setMigrationResults(results);

      // Clear form on success
      if (migrationMode === 'single') {
        setMigrationAddress('');
      } else {
        setMigrationAddresses('');
      }
    } catch (error) {
      setMigrationResults([{
        address: 'N/A',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }]);
    } finally {
      setMigrationLoading(false);
      setMigrationProgress(null);
    }
  };

  // Clear Stats function
  const handleClearStats = async (clearAll: boolean = false) => {
    if (!clearAll && !clearStatsAddress.trim()) {
      alert('Please enter a player address');
      return;
    }

    if (!isAdminWalletConnected || connectedAddress !== adminAddress) {
      alert('Admin wallet not connected. Please connect the admin wallet.');
      return;
    }

    const confirmMessage = clearAll
      ? `⚠️ WARNING: This will permanently delete ALL statistics for ALL players in the registry!\n\nThis action cannot be undone. Are you absolutely sure you want to continue?`
      : `⚠️ WARNING: This will permanently delete all statistics for ${clearStatsAddress.trim()}\n\nThis action cannot be undone. Are you sure you want to continue?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setClearStatsLoading(true);
    setClearStatsResult(null);

    try {
      const url = clearAll
        ? `${getApiUrl('api/scores/migrate')}?clearAll=true`
        : `${getApiUrl('api/scores/migrate')}?playerAddress=${encodeURIComponent(clearStatsAddress.trim())}`;

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (clearAll) {
          setClearStatsResult({
            success: true,
            digest: data.digests?.[0], // Show first digest
          });
        } else {
          setClearStatsResult({
            success: true,
            digest: data.digest,
          });
          setClearStatsAddress(''); // Clear form on success
        }
      } else {
        setClearStatsResult({
          success: false,
          error: data.error || 'Failed to clear stats',
        });
      }
    } catch (error) {
      setClearStatsResult({
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      });
    } finally {
      setClearStatsLoading(false);
    }
  };

  // Score Migration functions
  const handleDiscoverScoreWallets = async () => {
    setDiscoveringScoreWallets(true);
    setDiscoveredScoreWallets([]);

    try {
      if (!isAdminWalletConnected || connectedAddress !== adminAddress) {
        alert('Admin wallet not connected. Please connect the admin wallet.');
        setDiscoveringScoreWallets(false);
        return;
      }

      const oldStatsId = oldStatsRegistryId || undefined;
      const oldPkgId = oldScorePackageId || undefined;
      const queryParams = new URLSearchParams();
      if (oldStatsId) queryParams.append('oldStatsRegistryId', oldStatsId);
      if (oldPkgId) queryParams.append('oldPackageId', oldPkgId);
      const queryString = queryParams.toString();
      
      const response = await fetch(`${getApiUrl('api/scores/migrate')}${queryString ? `?${queryString}` : ''}`);
      const data = await response.json();

      if (response.ok && data.success && data.wallets) {
        setDiscoveredScoreWallets(data.wallets);
        if (data.wallets.length === 0) {
          alert('No wallets with statistics found in the old registry.');
        }
      } else {
        alert(data.error || 'Failed to discover wallets');
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Network error');
    } finally {
      setDiscoveringScoreWallets(false);
    }
  };

  const handleScoreMigrationSubmit = async () => {
    setScoreMigrationLoading(true);
    setScoreMigrationResults([]);
    setScoreMigrationProgress(null);

    try {
      if (!isAdminWalletConnected || connectedAddress !== adminAddress) {
        setScoreMigrationResults([{
          address: 'N/A',
          success: false,
          error: 'Admin wallet not connected. Please connect the admin wallet.',
        }]);
        setScoreMigrationLoading(false);
        return;
      }

      let addresses: string[] = [];
      
      if (scoreMigrationMode === 'auto') {
        addresses = discoveredScoreWallets;
      } else if (scoreMigrationMode === 'single') {
        addresses = [scoreMigrationAddress.trim()];
      } else {
        addresses = scoreMigrationAddresses
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0 && line.startsWith('0x'));
      }

      if (addresses.length === 0) {
        setScoreMigrationResults([{
          address: 'N/A',
          success: false,
          error: 'No valid addresses provided',
        }]);
        setScoreMigrationLoading(false);
        return;
      }

      setScoreMigrationProgress({ current: 0, total: addresses.length });
      const results: Array<{ address: string; success: boolean; digest?: string; error?: string }> = [];

      for (let i = 0; i < addresses.length; i++) {
        const address = addresses[i];
        setScoreMigrationProgress({ current: i, total: addresses.length });

        try {
          const response = await fetch(getApiUrl('api/scores/migrate'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              playerAddress: address,
              ...(oldScorePackageId && { oldPackageId: oldScorePackageId }),
              ...(oldStatsRegistryId && { oldStatsRegistryId }),
            }),
          });

          const data = await response.json();

          if (response.ok && data.success) {
            results.push({
              address,
              success: true,
              digest: data.digest,
            });
          } else {
            results.push({
              address,
              success: false,
              error: data.error || 'Migration failed',
            });
          }
        } catch (error) {
          results.push({
            address,
            success: false,
            error: error instanceof Error ? error.message : 'Network error',
          });
        }

        // Update results as we go
        setScoreMigrationResults([...results]);
      }

      setScoreMigrationProgress({ current: addresses.length, total: addresses.length });
      setScoreMigrationResults(results);

      // Clear form on success
      if (scoreMigrationMode === 'single') {
        setScoreMigrationAddress('');
      } else {
        setScoreMigrationAddresses('');
      }
    } catch (error) {
      setScoreMigrationResults([{
        address: 'N/A',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }]);
    } finally {
      setScoreMigrationLoading(false);
      setScoreMigrationProgress(null);
    }
  };

  // Game Pass Migration functions
  const handleDiscoverGamePassWallets = async () => {
    setDiscoveringGamePassWallets(true);
    setDiscoveredGamePassWallets([]);

    try {
      if (!isAdminWalletConnected || connectedAddress !== adminAddress) {
        alert('Admin wallet not connected. Please connect the admin wallet.');
        setDiscoveringGamePassWallets(false);
        return;
      }

      const oldSystemId = oldGamePassSystemId || undefined;
      const oldPkgId = oldGamePassPackageId || undefined;
      const queryParams = new URLSearchParams();
      if (oldSystemId) queryParams.append('oldGamePassSystemId', oldSystemId);
      if (oldPkgId) queryParams.append('oldPackageId', oldPkgId);
      const queryString = queryParams.toString();
      
      const response = await fetch(`${getApiUrl('api/game-pass/migrate')}${queryString ? `?${queryString}` : ''}`);
      const data = await response.json();

      if (response.ok && data.success && data.wallets) {
        setDiscoveredGamePassWallets(data.wallets);
        if (data.wallets.length === 0) {
          alert('No wallets with game passes found in the old system.');
        }
      } else {
        alert(data.error || 'Failed to discover wallets');
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Network error');
    } finally {
      setDiscoveringGamePassWallets(false);
    }
  };

  const handleGamePassMigrationSubmit = async () => {
    setGamePassMigrationLoading(true);
    setGamePassMigrationResults([]);
    setGamePassMigrationProgress(null);

    try {
      if (!isAdminWalletConnected || connectedAddress !== adminAddress) {
        setGamePassMigrationResults([{
          address: 'N/A',
          success: false,
          error: 'Admin wallet not connected. Please connect the admin wallet.',
        }]);
        setGamePassMigrationLoading(false);
        return;
      }

      let addresses: string[] = [];
      
      if (gamePassMigrationMode === 'auto') {
        addresses = discoveredGamePassWallets;
      } else if (gamePassMigrationMode === 'single') {
        addresses = [gamePassMigrationAddress.trim()];
      } else {
        addresses = gamePassMigrationAddresses
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0 && line.startsWith('0x'));
      }

      if (addresses.length === 0) {
        setGamePassMigrationResults([{
          address: 'N/A',
          success: false,
          error: 'No valid addresses provided',
        }]);
        setGamePassMigrationLoading(false);
        return;
      }

      setGamePassMigrationProgress({ current: 0, total: addresses.length });
      const results: Array<{ address: string; success: boolean; digest?: string; error?: string }> = [];

      for (let i = 0; i < addresses.length; i++) {
        const address = addresses[i];
        setGamePassMigrationProgress({ current: i, total: addresses.length });

        try {
          const response = await fetch(getApiUrl('api/game-pass/migrate'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              playerAddress: address,
              ...(oldGamePassPackageId && { oldPackageId: oldGamePassPackageId }),
              ...(oldGamePassSystemId && { oldGamePassSystemId }),
            }),
          });

          const data = await response.json();

          if (response.ok && data.success) {
            results.push({
              address,
              success: true,
              digest: data.digest,
            });
          } else {
            results.push({
              address,
              success: false,
              error: data.error || 'Migration failed',
            });
          }
        } catch (error) {
          results.push({
            address,
            success: false,
            error: error instanceof Error ? error.message : 'Network error',
          });
        }

        // Update results as we go
        setGamePassMigrationResults([...results]);
      }

      setGamePassMigrationProgress({ current: addresses.length, total: addresses.length });
      setGamePassMigrationResults(results);

      // Clear form on success
      if (gamePassMigrationMode === 'single') {
        setGamePassMigrationAddress('');
      } else {
        setGamePassMigrationAddresses('');
      }
    } catch (error) {
      setGamePassMigrationResults([{
        address: 'N/A',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }]);
    } finally {
      setGamePassMigrationLoading(false);
      setGamePassMigrationProgress(null);
    }
  };

  // Badge lookup function
  const handleBadgeLookup = async () => {
    // IMPORTANT: These logs appear in the BROWSER console, not the server console!
    // Open your browser's Developer Tools (F12) and check the Console tab
    console.log(`\n🔍 [FRONTEND LOOKUP] ========== BADGE LOOKUP CLICKED ==========`);
    console.log(`🔍 [FRONTEND LOOKUP] ⚠️ NOTE: Check BROWSER console (F12), not server console!`);
    console.log(`🔍 [FRONTEND LOOKUP] Timestamp: ${new Date().toISOString()}`);
    console.log(`🔍 [FRONTEND LOOKUP] Lookup address: ${lookupAddress}`);
    console.log(`🔍 [FRONTEND LOOKUP] Badge action: ${badgeAction}`);
    
    // Also show an alert to confirm the function is being called
    // (You can remove this after confirming it works)
    if (typeof window !== 'undefined') {
      console.log(`🔍 [FRONTEND LOOKUP] Window object available - this is client-side code`);
    }
    
    setLookupLoading(true);
    setLookupResult(null);
    console.log(`🔍 [FRONTEND LOOKUP] Set loading state to true`);

    try {
      // Step 1: Validate address format
      console.log(`\n🔍 [FRONTEND LOOKUP] Step 1: Validating address format...`);
      console.log(`   - lookupAddress: ${lookupAddress}`);
      console.log(`   - Starts with 0x: ${lookupAddress?.startsWith('0x') || false}`);
      console.log(`   - Length: ${lookupAddress?.length || 0} (expected 66)`);
      
      if (!lookupAddress || !lookupAddress.startsWith('0x') || lookupAddress.length !== 66) {
        console.error(`❌ [FRONTEND LOOKUP] Invalid address format`);
        setLookupResult({
          error: 'Invalid address format. Must be a valid Sui address (0x followed by 64 hex characters)',
        });
        setLookupLoading(false);
        return;
      }
      console.log(`✅ [FRONTEND LOOKUP] Address format valid`);

      // Step 2: Call API
      console.log(`\n🔍 [FRONTEND LOOKUP] Step 2: Calling API...`);
      const apiUrl = getApiUrl(`api/badges/${lookupAddress}?contract=${badgeContract}`);
      console.log(`🔍 [FRONTEND LOOKUP] API URL: ${apiUrl}`);
      console.log(`🔍 [FRONTEND LOOKUP] Making fetch request...`);
      
      const response = await fetch(apiUrl);
      console.log(`🔍 [FRONTEND LOOKUP] Response received`);
      console.log(`   - Status: ${response.status}`);
      console.log(`   - Status text: ${response.statusText}`);
      console.log(`   - OK: ${response.ok}`);

      // Step 3: Parse response
      console.log(`\n🔍 [FRONTEND LOOKUP] Step 3: Parsing response...`);
      const data = await response.json();
      console.log(`🔍 [FRONTEND LOOKUP] Response data:`, JSON.stringify(data, null, 2));

      // Step 4: Process result
      console.log(`\n🔍 [FRONTEND LOOKUP] Step 4: Processing result...`);
      if (response.ok && data.success && data.hasBadge && data.badge) {
        console.log(`✅ [FRONTEND LOOKUP] Badge found!`);
        console.log(`   - Badge ID: ${data.badge.badgeId}`);
        console.log(`   - Tier: ${data.badge.tier}`);
        console.log(`   - Games played: ${data.badge.gamesPlayed}`);
        
        setLookupResult({
          badgeId: data.badge.badgeId,
        });
        
        // Auto-fill the badge ID if in burn mode
        if (badgeAction === 'burn') {
          console.log(`🔍 [FRONTEND LOOKUP] Auto-filling badge ID in burn mode`);
          setBadgeId(data.badge.badgeId);
        }
        
        console.log(`✅ [FRONTEND LOOKUP] ========== LOOKUP SUCCESS ==========\n`);
      } else {
        console.log(`⚠️ [FRONTEND LOOKUP] Badge not found or error`);
        console.log(`   - response.ok: ${response.ok}`);
        console.log(`   - data.success: ${data.success}`);
        console.log(`   - data.hasBadge: ${data.hasBadge}`);
        console.log(`   - data.badge: ${data.badge ? 'exists' : 'null'}`);
        console.log(`   - data.error: ${data.error || 'none'}`);
        
        const errorMsg = data.error || (data.hasBadge === false ? 'Player does not have a badge' : 'Failed to lookup badge');
        console.log(`🔍 [FRONTEND LOOKUP] Setting error: ${errorMsg}`);
        
        setLookupResult({
          error: errorMsg,
        });
        
        console.log(`⚠️ [FRONTEND LOOKUP] ========== LOOKUP FAILED ==========\n`);
      }
    } catch (error) {
      console.error(`\n❌ [FRONTEND LOOKUP] ========== EXCEPTION ==========`);
      console.error(`❌ [FRONTEND LOOKUP] Error type: ${error instanceof Error ? error.constructor.name : typeof error}`);
      console.error(`❌ [FRONTEND LOOKUP] Error message: ${error instanceof Error ? error.message : String(error)}`);
      if (error instanceof Error && error.stack) {
        console.error(`❌ [FRONTEND LOOKUP] Stack trace:`, error.stack);
      }
      console.error(`❌ [FRONTEND LOOKUP] ===================================\n`);
      
      setLookupResult({
        error: error instanceof Error ? error.message : 'Network error',
      });
    } finally {
      console.log(`🔍 [FRONTEND LOOKUP] Setting loading state to false`);
      setLookupLoading(false);
    }
  };

  // Badges functions
  const handleUpdateImageUrl = async () => {
    if (!updateImageAddress || !updateImageAddress.startsWith('0x') || updateImageAddress.length !== 66) {
      setUpdateImageResult({
        success: false,
        error: 'Invalid player address format',
      });
      return;
    }

    setUpdateImageLoading(true);
    setUpdateImageResult(null);

    try {
      const response = await fetch(getApiUrl('api/admin/badges/update-image-url'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerAddress: updateImageAddress,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setUpdateImageResult({
          success: true,
          message: data.message || 'Badge image URL updated successfully',
        });
        setUpdateImageAddress('');
      } else {
        setUpdateImageResult({
          success: false,
          error: data.error || 'Failed to update badge image URL',
        });
      }
    } catch (error) {
      setUpdateImageResult({
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      });
    } finally {
      setUpdateImageLoading(false);
    }
  };

  const handleBadgesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBadgesLoading(true);
    setBadgesResult(null);

    try {
      if (!isAdminWalletConnected || connectedAddress !== adminAddress) {
        setBadgesResult({
          success: false,
          error: 'Admin wallet not connected. Please connect the admin wallet.',
        });
        setBadgesLoading(false);
        return;
      }

      const response = await fetch(getApiUrl('api/admin/badges'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: badgeAction,
          contract: badgeContract,
          ...(badgeAction === 'mint' || badgeAction === 'cleanup' ? { playerAddress: badgePlayerAddress } : {}),
          ...(badgeAction === 'mint' ? { tier } : {}),
          ...(badgeAction === 'burn' ? { badgeId } : {}),
          adminWalletAddress: connectedAddress,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setBadgesResult({
          success: true,
          message: data.message,
          digest: data.digest,
        });
        if (badgeAction === 'mint' || badgeAction === 'cleanup') {
          setBadgePlayerAddress('');
          if (badgeAction === 'mint') {
            setTier(0);
          }
        } else {
          setBadgeId('');
        }
      } else {
        setBadgesResult({
          success: false,
          error: data.error || 'Operation failed',
        });
      }
    } catch (error) {
      setBadgesResult({
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      });
    } finally {
      setBadgesLoading(false);
    }
  };

  // Apply dark mode to body and html
  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    body.style.backgroundColor = styles.bg;
    body.style.color = styles.text;
    html.style.backgroundColor = styles.bg;
    html.style.color = styles.text;
    return () => {
      body.style.backgroundColor = '';
      body.style.color = '';
      html.style.backgroundColor = '';
      html.style.color = '';
    };
  }, [darkMode, styles]);

  return (
    <div style={{ 
      minHeight: '100vh',
      backgroundColor: styles.bg,
      color: styles.text,
      transition: 'background-color 0.3s, color 0.3s'
    }}>
      <div style={{ 
        padding: '2rem', 
        maxWidth: '1000px', 
        margin: '0 auto', 
        fontFamily: 'system-ui'
      }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0 }}>🔐 Admin Dashboard</h1>
        <button
          type="button"
          onClick={toggleDarkMode}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: darkMode ? styles.bgTertiary : styles.bgSecondary,
            color: styles.text,
            border: `1px solid ${styles.border}`,
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: 'bold',
          }}
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {darkMode ? '☀️ Light' : '🌙 Dark'}
        </button>
      </div>

      {/* Wallet Connection Section */}
      <div style={{ marginBottom: '2rem', padding: '1rem', background: styles.bgSecondary, borderRadius: '8px', border: `1px solid ${styles.border}` }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
          Admin Wallet:
        </label>
        
        {!isAdminWalletConnected ? (
          <div>
            <p style={{ marginBottom: '0.5rem' }}>🔒 Connect your admin wallet to continue</p>
            <button
              type="button"
              onClick={connectWallet}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Connect Wallet
            </button>
            {walletError && (
              <div style={{ marginTop: '0.5rem', color: '#721c24' }}>
                <strong>❌ Error:</strong> {walletError}
              </div>
            )}
          </div>
        ) : (
          <div>
            <p style={{ marginBottom: '0.5rem' }}>
              <strong>✅ Wallet Connected:</strong> {connectedAddress?.substring(0, 10)}...{connectedAddress?.substring(connectedAddress.length - 8)}
            </p>
            <button
              type="button"
              onClick={disconnectWallet}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>

      {!isAdminWalletConnected && (
        <div style={{ padding: '1rem', background: styles.bgWarning, borderRadius: '4px', marginBottom: '2rem', border: `1px solid ${styles.border}` }}>
          <strong>⚠️ Admin wallet required:</strong> Please connect the admin wallet to access admin functions.
        </div>
      )}

      {/* Tab Navigation */}
      <div style={{ marginBottom: '2rem', borderBottom: `2px solid ${styles.border}` }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setActiveTab('items')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: activeTab === 'items' ? styles.buttonPrimary : 'transparent',
              color: activeTab === 'items' ? 'white' : styles.text,
              border: 'none',
              borderBottom: activeTab === 'items' ? `3px solid ${styles.buttonPrimary}` : '3px solid transparent',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '1rem',
            }}
          >
            🎁 Add Items
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('badges')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: activeTab === 'badges' ? styles.buttonPrimary : 'transparent',
              color: activeTab === 'badges' ? 'white' : styles.text,
              border: 'none',
              borderBottom: activeTab === 'badges' ? `3px solid ${styles.buttonPrimary}` : '3px solid transparent',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '1rem',
            }}
          >
            🎖️ Badge Management
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('migration')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: activeTab === 'migration' ? styles.buttonPrimary : 'transparent',
              color: activeTab === 'migration' ? 'white' : styles.text,
              border: 'none',
              borderBottom: activeTab === 'migration' ? `3px solid ${styles.buttonPrimary}` : '3px solid transparent',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '1rem',
            }}
          >
            🔄 Migration
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tournaments')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: activeTab === 'tournaments' ? styles.buttonPrimary : 'transparent',
              color: activeTab === 'tournaments' ? 'white' : styles.text,
              border: 'none',
              borderBottom: activeTab === 'tournaments' ? `3px solid ${styles.buttonPrimary}` : '3px solid transparent',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '1rem',
            }}
          >
            🏆 Tournaments
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sound-test')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: activeTab === 'sound-test' ? styles.buttonPrimary : 'transparent',
              color: activeTab === 'sound-test' ? 'white' : styles.text,
              border: 'none',
              borderBottom: activeTab === 'sound-test' ? `3px solid ${styles.buttonPrimary}` : '3px solid transparent',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '1rem',
            }}
          >
            🔊 Sound Test
          </button>
        </div>
      </div>

      {/* Items Tab */}
      {activeTab === 'items' && (
        <form onSubmit={handleItemsSubmit} style={{ display: isAdminWalletConnected ? 'flex' : 'none', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Player Address:
            </label>
            <input
              type="text"
              value={playerAddress}
              onChange={(e) => setPlayerAddress(e.target.value)}
              placeholder="0x..."
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '1rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ fontWeight: 'bold' }}>Items to Add:</label>
              <button
                type="button"
                onClick={addItem}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                + Add Item
              </button>
            </div>

            {items.map((item, index) => (
              <div
                key={index}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr auto',
                  gap: '0.5rem',
                  marginBottom: '0.5rem',
                  padding: '1rem',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '4px',
                }}
              >
                <select
                  value={item.itemId}
                  onChange={(e) => updateItem(index, 'itemId', e.target.value)}
                  style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
                >
                  {itemTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>

                <select
                  value={item.level}
                  onChange={(e) => updateItem(index, 'level', e.target.value)}
                  style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
                >
                  {itemTypes.find((t) => t.id === item.itemId)?.levels.map((level) => (
                    <option key={level} value={level}>
                      Level {level}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                  min="1"
                  style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
                />

                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    style={{
                      padding: '0.5rem',
                      backgroundColor: '#f44336',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={itemsLoading || !playerAddress || items.length === 0 || !isAdminWalletConnected}
            style={{
              padding: '1rem',
              fontSize: '1.1rem',
              backgroundColor: itemsLoading || !isAdminWalletConnected ? '#ccc' : '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: itemsLoading || !isAdminWalletConnected ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
            }}
          >
            {itemsLoading ? 'Adding Items...' : 'Add Items to Inventory'}
          </button>
        </form>
      )}

      {/* Badges Tab */}
      {activeTab === 'badges' && (
        <form onSubmit={handleBadgesSubmit} style={{ display: isAdminWalletConnected ? 'flex' : 'none', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Action Selector */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Action:
            </label>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  value="mint"
                  checked={badgeAction === 'mint'}
                  onChange={(e) => setBadgeAction(e.target.value as 'mint' | 'burn' | 'cleanup' | 'update-image')}
                  style={{ marginRight: '0.5rem' }}
                />
                Mint Badge
              </label>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  value="burn"
                  checked={badgeAction === 'burn'}
                  onChange={(e) => setBadgeAction(e.target.value as 'mint' | 'burn' | 'cleanup' | 'update-image')}
                  style={{ marginRight: '0.5rem' }}
                />
                Burn Badge
              </label>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  value="cleanup"
                  checked={badgeAction === 'cleanup'}
                  onChange={(e) => setBadgeAction(e.target.value as 'mint' | 'burn' | 'cleanup' | 'update-image')}
                  style={{ marginRight: '0.5rem' }}
                />
                Cleanup Orphaned Entry
              </label>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  value="update-image"
                  checked={badgeAction === 'update-image'}
                  onChange={(e) => setBadgeAction(e.target.value as 'mint' | 'burn' | 'cleanup' | 'update-image')}
                  style={{ marginRight: '0.5rem' }}
                />
                Update Image URL
              </label>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Contract:
            </label>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  value="new"
                  checked={badgeContract === 'new'}
                  onChange={(e) => {
                    setBadgeContract(e.target.value as 'new' | 'old');
                    setLookupResult(null); // Clear lookup result when switching contracts
                    setBadgeId(''); // Clear badge ID when switching contracts
                  }}
                  style={{ marginRight: '0.5rem' }}
                />
                New Contract
              </label>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  value="old"
                  checked={badgeContract === 'old'}
                  onChange={(e) => {
                    setBadgeContract(e.target.value as 'new' | 'old');
                    setLookupResult(null); // Clear lookup result when switching contracts
                    setBadgeId(''); // Clear badge ID when switching contracts
                  }}
                  style={{ marginRight: '0.5rem' }}
                />
                Old Contract
              </label>
            </div>
            {badgeContract === 'old' && (
              <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#666', fontStyle: 'italic' }}>
                ⚠️ Make sure OLD_GAME_SCORE_CONTRACT_TESTNET and OLD_BADGE_REGISTRY_OBJECT_ID_TESTNET are configured in environment variables.
              </p>
            )}
          </div>

          {badgeAction === 'update-image' ? (
            <div style={{ padding: '1.5rem', background: '#f0f7ff', borderRadius: '8px', border: '1px solid #b3d9ff' }}>
              <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>🖼️ Update Badge Image URL</h3>
              <p style={{ marginBottom: '1rem', color: '#666', fontSize: '0.9rem' }}>
                Update a badge's image URL to point to the correct static file. This is useful for fixing badges that were minted with localhost URLs.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Player Address:
                  </label>
                  <input
                    type="text"
                    value={updateImageAddress}
                    onChange={(e) => setUpdateImageAddress(e.target.value)}
                    placeholder="0x..."
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      fontSize: '1rem',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                    }}
                  />
                </div>
                
                <button
                  type="button"
                  onClick={handleUpdateImageUrl}
                  disabled={updateImageLoading || !updateImageAddress}
                  style={{
                    padding: '0.75rem 1.5rem',
                    fontSize: '1rem',
                    backgroundColor: updateImageLoading || !updateImageAddress ? '#ccc' : '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: updateImageLoading || !updateImageAddress ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold',
                  }}
                >
                  {updateImageLoading ? 'Updating...' : 'Update Image URL'}
                </button>
              </div>

              {updateImageResult && (
                <div
                  style={{
                    marginTop: '1rem',
                    padding: '1rem',
                    borderRadius: '4px',
                    backgroundColor: updateImageResult.success ? '#d4edda' : '#f8d7da',
                    color: updateImageResult.success ? '#155724' : '#721c24',
                    border: `1px solid ${updateImageResult.success ? '#c3e6cb' : '#f5c6cb'}`,
                  }}
                >
                  {updateImageResult.success ? (
                    <div>
                      <strong>✅ Success!</strong>
                      <p>{updateImageResult.message}</p>
                    </div>
                  ) : (
                    <div>
                      <strong>❌ Error:</strong>
                      <p>{updateImageResult.error}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : badgeAction === 'cleanup' ? (
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Player Address:
              </label>
              <input
                type="text"
                value={badgePlayerAddress}
                onChange={(e) => setBadgePlayerAddress(e.target.value)}
                placeholder="0x..."
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '1rem',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                }}
              />
              <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
                Removes orphaned registry entry if badge object doesn't exist. Useful for cleaning up after badge deletion.
              </p>
            </div>
          ) : badgeAction === 'mint' ? (
            <>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Player Address:
                </label>
                <input
                  type="text"
                  value={badgePlayerAddress}
                  onChange={(e) => setBadgePlayerAddress(e.target.value)}
                  placeholder="0x..."
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    fontSize: '1rem',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Badge Tier:
                </label>
                <select
                  value={tier}
                  onChange={(e) => setTier(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    fontSize: '1rem',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                  }}
                >
                  {tierNames.map((name, index) => (
                    <option key={index} value={index}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <div>
              <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#e3f2fd', borderRadius: '4px' }}>
                <strong>🔍 Lookup Badge ID by Player Address:</strong>
                <p style={{ marginTop: '0.5rem', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#666', fontStyle: 'italic' }}>
                  Querying: <strong>{badgeContract === 'old' ? 'OLD' : 'NEW'} Contract</strong>
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <input
                    type="text"
                    value={lookupAddress}
                    onChange={(e) => setLookupAddress(e.target.value)}
                    placeholder="Enter player address (0x...)"
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      fontSize: '0.9rem',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleBadgeLookup}
                    disabled={lookupLoading || !lookupAddress}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: lookupLoading || !lookupAddress ? '#ccc' : '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: lookupLoading || !lookupAddress ? 'not-allowed' : 'pointer',
                      fontSize: '0.9rem',
                    }}
                  >
                    {lookupLoading ? 'Looking up...' : 'Lookup'}
                  </button>
                </div>
                {lookupResult && (
                  <div style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: lookupResult.badgeId ? '#d4edda' : '#f8d7da', borderRadius: '4px', fontSize: '0.9rem' }}>
                    {lookupResult.badgeId ? (
                      <div>
                        <strong>✅ Badge ID:</strong> <code style={{ backgroundColor: 'rgba(0,0,0,0.1)', padding: '0.2rem 0.4rem', borderRadius: '3px' }}>{lookupResult.badgeId}</code>
                      </div>
                    ) : (
                      <div>
                        <strong>❌ Error:</strong> {lookupResult.error}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Badge ID:
              </label>
              <input
                type="text"
                value={badgeId}
                onChange={(e) => setBadgeId(e.target.value)}
                placeholder="0x... (or use lookup above)"
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '1rem',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                }}
              />
              <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
                ⚠️ Note: Badge must be in admin wallet to burn (badges are soulbound and cannot be transferred). Use the lookup above to find the badge ID for a player address.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={badgesLoading || !isAdminWalletConnected || (badgeAction === 'mint' || badgeAction === 'cleanup' ? !badgePlayerAddress : badgeAction === 'burn' ? !badgeId : false)}
            style={{
              padding: '1rem',
              fontSize: '1.1rem',
              backgroundColor: badgesLoading || !isAdminWalletConnected ? '#ccc' : (badgeAction === 'mint' ? '#2196F3' : badgeAction === 'burn' ? '#f44336' : '#FF9800'),
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: badgesLoading || !isAdminWalletConnected ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              display: badgeAction === 'update-image' ? 'none' : 'block',
            }}
          >
            {badgesLoading 
              ? (badgeAction === 'mint' ? 'Minting Badge...' : badgeAction === 'burn' ? 'Burning Badge...' : 'Cleaning up...')
              : (badgeAction === 'mint' ? 'Mint Badge' : badgeAction === 'burn' ? 'Burn Badge' : 'Cleanup Orphaned Entry')}
          </button>
        </form>
      )}

      {/* Migration Tab - Consolidated */}
      {activeTab === 'migration' && (
        <div style={{ display: isAdminWalletConnected ? 'flex' : 'none', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Migration Type Selector */}
          <div style={{ padding: '1rem', backgroundColor: styles.bgSecondary, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
              Migration Type:
            </label>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: styles.text }}>
                <input
                  type="radio"
                  value="inventory"
                  checked={migrationSubType === 'inventory'}
                  onChange={(e) => setMigrationSubType(e.target.value as MigrationSubType)}
                  style={{ marginRight: '0.5rem' }}
                />
                🎁 Inventory Migration
              </label>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: styles.text }}>
                <input
                  type="radio"
                  value="stats"
                  checked={migrationSubType === 'stats'}
                  onChange={(e) => setMigrationSubType(e.target.value as MigrationSubType)}
                  style={{ marginRight: '0.5rem' }}
                />
                📊 Stats Migration
              </label>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: styles.text }}>
                <input
                  type="radio"
                  value="game-pass"
                  checked={migrationSubType === 'game-pass'}
                  onChange={(e) => setMigrationSubType(e.target.value as MigrationSubType)}
                  style={{ marginRight: '0.5rem' }}
                />
                🎫 Game Pass Migration
              </label>
            </div>
          </div>

          {/* Inventory Migration Section */}
          {migrationSubType === 'inventory' && (
            <>
              <div style={{ padding: '1rem', backgroundColor: styles.bgInfo, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
                <strong style={{ color: styles.text }}>📋 Inventory Migration Instructions:</strong>
                <ul style={{ marginTop: '0.5rem', marginLeft: '1.5rem', fontSize: '0.9rem', color: styles.textSecondary }}>
              <li>Migrate player inventories from the old PremiumStore to the new PremiumStore</li>
              <li>Single mode: Migrate one wallet at a time</li>
              <li>Batch mode: Migrate multiple wallets (one address per line)</li>
              <li>Old store IDs can be left empty to use environment defaults</li>
            </ul>
          </div>

          {/* Migration Mode Selector */}
          <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
              Migration Mode:
            </label>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: styles.text }}>
                <input
                  type="radio"
                  value="auto"
                  checked={migrationMode === 'auto'}
                  onChange={(e) => setMigrationMode(e.target.value as 'single' | 'batch' | 'auto')}
                  style={{ marginRight: '0.5rem' }}
                />
                Auto (Discover All Wallets)
              </label>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: styles.text }}>
                <input
                  type="radio"
                  value="single"
                  checked={migrationMode === 'single'}
                  onChange={(e) => setMigrationMode(e.target.value as 'single' | 'batch' | 'auto')}
                  style={{ marginRight: '0.5rem' }}
                />
                Single Wallet
              </label>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: styles.text }}>
                <input
                  type="radio"
                  value="batch"
                  checked={migrationMode === 'batch'}
                  onChange={(e) => setMigrationMode(e.target.value as 'single' | 'batch' | 'auto')}
                  style={{ marginRight: '0.5rem' }}
                />
                Batch (Manual List)
              </label>
            </div>
          </div>

          {/* Old Store Configuration */}
              <div style={{ padding: '1rem', backgroundColor: styles.bgTertiary, borderRadius: '4px', marginBottom: '1rem', border: `1px solid ${styles.border}` }}>
                <strong style={{ color: styles.text }}>📋 Old Store Configuration:</strong>
                <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: styles.textSecondary }}>
              These fields are optional. If left empty, the system will use environment variables:
                  <br />• <code style={{ backgroundColor: styles.bgSecondary, padding: '0.2rem 0.4rem', borderRadius: '3px' }}>OLD_PREMIUM_STORE_PACKAGE_ID</code> (for Package ID)
                  <br />• <code style={{ backgroundColor: styles.bgSecondary, padding: '0.2rem 0.4rem', borderRadius: '3px' }}>OLD_PREMIUM_STORE_OBJECT_ID</code> (for Object ID)
            </p>
          </div>

          <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
                  Old Store Package ID (optional - uses <code style={{ backgroundColor: styles.bgSecondary, padding: '0.2rem 0.4rem', borderRadius: '3px' }}>OLD_PREMIUM_STORE_PACKAGE_ID</code> if empty):
            </label>
            <input
              type="text"
              value={oldPackageId}
              onChange={(e) => setOldPackageId(e.target.value)}
              placeholder="Leave empty to use environment variable"
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '1rem',
                    border: `1px solid ${styles.border}`,
                borderRadius: '4px',
                    backgroundColor: styles.inputBg,
                    color: styles.text,
              }}
            />
          </div>

          <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
                  Old Store Object ID (optional - uses <code style={{ backgroundColor: styles.bgSecondary, padding: '0.2rem 0.4rem', borderRadius: '3px' }}>OLD_PREMIUM_STORE_OBJECT_ID</code> if empty):
            </label>
            <input
              type="text"
              value={oldStoreObjectId}
              onChange={(e) => setOldStoreObjectId(e.target.value)}
              placeholder="Leave empty to use environment variable"
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '1rem',
                    border: `1px solid ${styles.border}`,
                borderRadius: '4px',
                    backgroundColor: styles.inputBg,
                    color: styles.text,
              }}
            />
          </div>

          {/* Auto Mode - Discover Wallets */}
          {migrationMode === 'auto' && (
            <div>
                  <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: styles.bgSuccess, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
                    <strong style={{ color: styles.text }}>🔍 Auto Discovery:</strong>
                    <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: styles.textSecondary }}>
                  This mode will automatically discover all wallets that have inventory in the old store by querying the smart contract's dynamic fields.
                </p>
              </div>
              
              {discoveredWallets.length > 0 && (
                    <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: styles.bgTertiary, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
                      <strong style={{ color: styles.text }}>✅ Discovered {discoveredWallets.length} wallet(s) with inventory:</strong>
                      <div style={{ marginTop: '0.5rem', maxHeight: '200px', overflowY: 'auto', fontSize: '0.9rem', fontFamily: 'monospace', color: styles.textSecondary }}>
                    {discoveredWallets.map((wallet, index) => (
                      <div key={index} style={{ padding: '0.25rem 0' }}>
                        {wallet}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleDiscoverWallets}
                disabled={discoveringWallets || !isAdminWalletConnected}
                style={{
                  padding: '0.75rem 1.5rem',
                      backgroundColor: discoveringWallets || !isAdminWalletConnected ? styles.buttonDisabled : styles.buttonSuccess,
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: discoveringWallets || !isAdminWalletConnected ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  marginBottom: '1rem',
                }}
              >
                {discoveringWallets ? 'Discovering...' : '🔍 Discover Wallets with Inventory'}
              </button>
            </div>
          )}

          {/* Single Mode */}
          {migrationMode === 'single' && (
            <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
                Player Address:
              </label>
              <input
                type="text"
                value={migrationAddress}
                onChange={(e) => setMigrationAddress(e.target.value)}
                placeholder="0x..."
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '1rem',
                      border: `1px solid ${styles.border}`,
                  borderRadius: '4px',
                      backgroundColor: styles.inputBg,
                      color: styles.text,
                }}
              />
            </div>
          )}

          {/* Batch Mode */}
          {migrationMode === 'batch' && (
            <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
                Player Addresses (one per line):
              </label>
              <textarea
                value={migrationAddresses}
                onChange={(e) => setMigrationAddresses(e.target.value)}
                placeholder="0x...&#10;0x...&#10;0x..."
                rows={10}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '1rem',
                      border: `1px solid ${styles.border}`,
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                      backgroundColor: styles.inputBg,
                      color: styles.text,
                }}
              />
            </div>
          )}

          {/* Progress Display */}
          {migrationProgress && (
                <div style={{ padding: '1rem', backgroundColor: styles.bgWarning, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
                  <strong style={{ color: styles.text }}>⏳ Migration Progress:</strong>
                  <p style={{ color: styles.text }}>
                Processing {migrationProgress.current} of {migrationProgress.total} wallets...
              </p>
                  <div style={{ width: '100%', backgroundColor: styles.bgTertiary, borderRadius: '4px', height: '20px', marginTop: '0.5rem' }}>
                <div
                  style={{
                    width: `${(migrationProgress.current / migrationProgress.total) * 100}%`,
                        backgroundColor: styles.buttonPrimary,
                    height: '100%',
                    borderRadius: '4px',
                    transition: 'width 0.3s',
                  }}
                />
              </div>
            </div>
          )}

          {/* Results Display */}
          {migrationResults.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
                  <strong style={{ color: styles.text }}>📊 Migration Results:</strong>
                  <div style={{ marginTop: '0.5rem', maxHeight: '400px', overflowY: 'auto', border: `1px solid ${styles.border}`, borderRadius: '4px', padding: '1rem', backgroundColor: styles.bgSecondary }}>
                {migrationResults.map((result, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '0.75rem',
                      marginBottom: '0.5rem',
                          backgroundColor: result.success ? styles.bgSuccess : styles.bgError,
                      borderRadius: '4px',
                      fontSize: '0.9rem',
                          border: `1px solid ${result.success ? styles.borderSuccess : styles.borderError}`,
                    }}
                  >
                        <div style={{ fontWeight: 'bold', marginBottom: '0.25rem', color: styles.text }}>
                      {result.success ? '✅' : '❌'} {result.address.substring(0, 10)}...{result.address.substring(result.address.length - 8)}
                    </div>
                    {result.success && result.digest && (
                          <div style={{ fontSize: '0.85rem', color: styles.textSecondary, marginTop: '0.25rem' }}>
                            Digest: <code style={{ backgroundColor: styles.bgTertiary, padding: '0.2rem 0.4rem', borderRadius: '3px' }}>{result.digest}</code>
                      </div>
                    )}
                    {!result.success && result.error && (
                          <div style={{ fontSize: '0.85rem', color: styles.textError, marginTop: '0.25rem' }}>
                        Error: {result.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleMigrationSubmit}
            disabled={migrationLoading || !isAdminWalletConnected || (migrationMode === 'auto' ? discoveredWallets.length === 0 : migrationMode === 'single' ? !migrationAddress : !migrationAddresses.trim())}
            style={{
              padding: '1rem',
              fontSize: '1.1rem',
                  backgroundColor: migrationLoading || !isAdminWalletConnected ? styles.buttonDisabled : styles.buttonPrimary,
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: migrationLoading || !isAdminWalletConnected ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
            }}
          >
            {migrationLoading 
              ? 'Migrating...' 
              : migrationMode === 'auto' 
                ? `Migrate ${discoveredWallets.length} Inventories` 
                : migrationMode === 'single' 
                  ? 'Migrate Inventory' 
                  : 'Migrate All Inventories'}
          </button>
            </>
      )}

          {/* Stats Migration Section */}
          {migrationSubType === 'stats' && (
            <>
              <div style={{ padding: '1rem', backgroundColor: styles.bgInfo, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
                <strong style={{ color: styles.text }}>📋 Stats Migration Instructions:</strong>
                <ul style={{ marginTop: '0.5rem', marginLeft: '1.5rem', fontSize: '0.9rem', color: styles.textSecondary }}>
              <li>Migrate player statistics from the old StatisticsRegistry to the new StatisticsRegistry</li>
              <li>Single mode: Migrate one wallet at a time</li>
              <li>Batch mode: Migrate multiple wallets (one address per line)</li>
              <li>Auto mode: Discover all wallets with stats and migrate them</li>
              <li>Old registry IDs can be left empty to use environment defaults</li>
              <li><strong>Note:</strong> Stats are merged (bests take maximum, totals are summed)</li>
            </ul>
          </div>

          {/* Migration Mode Selector */}
          <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
              Migration Mode:
            </label>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: styles.text }}>
                <input
                  type="radio"
                  value="auto"
                  checked={scoreMigrationMode === 'auto'}
                  onChange={(e) => setScoreMigrationMode(e.target.value as 'single' | 'batch' | 'auto')}
                  style={{ marginRight: '0.5rem' }}
                />
                Auto (Discover All Wallets)
              </label>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: styles.text }}>
                <input
                  type="radio"
                  value="single"
                  checked={scoreMigrationMode === 'single'}
                  onChange={(e) => setScoreMigrationMode(e.target.value as 'single' | 'batch' | 'auto')}
                  style={{ marginRight: '0.5rem' }}
                />
                Single Wallet
              </label>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: styles.text }}>
                <input
                  type="radio"
                  value="batch"
                  checked={scoreMigrationMode === 'batch'}
                  onChange={(e) => setScoreMigrationMode(e.target.value as 'single' | 'batch' | 'auto')}
                  style={{ marginRight: '0.5rem' }}
                />
                Batch (Manual List)
              </label>
            </div>
          </div>

          {/* Old Stats Registry Configuration */}
              <div style={{ padding: '1rem', backgroundColor: styles.bgTertiary, borderRadius: '4px', marginBottom: '1rem', border: `1px solid ${styles.border}` }}>
                <strong style={{ color: styles.text }}>📋 Old Statistics Registry Configuration:</strong>
                <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: styles.textSecondary }}>
                  These fields are optional. If left empty, the system will use environment variables (checks TESTNET versions first):
                  <br />• <code style={{ backgroundColor: styles.bgSecondary, padding: '0.2rem 0.4rem', borderRadius: '3px' }}>OLD_GAME_SCORE_CONTRACT_TESTNET</code> or <code style={{ backgroundColor: styles.bgSecondary, padding: '0.2rem 0.4rem', borderRadius: '3px' }}>OLD_GAME_SCORE_PACKAGE_ID</code> (for Package ID)
                  <br />• <code style={{ backgroundColor: styles.bgSecondary, padding: '0.2rem 0.4rem', borderRadius: '3px' }}>OLD_STATISTICS_REGISTRY_OBJECT_ID_TESTNET</code> or <code style={{ backgroundColor: styles.bgSecondary, padding: '0.2rem 0.4rem', borderRadius: '3px' }}>OLD_STATISTICS_REGISTRY_OBJECT_ID</code> (for Registry Object ID)
            </p>
          </div>

          <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
                  Old Package ID (optional - uses <code style={{ backgroundColor: styles.bgSecondary, padding: '0.2rem 0.4rem', borderRadius: '3px' }}>OLD_GAME_SCORE_CONTRACT_TESTNET</code> if empty):
            </label>
            <input
              type="text"
              value={oldScorePackageId}
              onChange={(e) => setOldScorePackageId(e.target.value)}
              placeholder="Leave empty to use environment variable"
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '1rem',
                    border: `1px solid ${styles.border}`,
                borderRadius: '4px',
                    backgroundColor: styles.inputBg,
                    color: styles.text,
              }}
            />
          </div>

          <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
                  Old Statistics Registry Object ID (optional - uses <code style={{ backgroundColor: styles.bgSecondary, padding: '0.2rem 0.4rem', borderRadius: '3px' }}>OLD_STATISTICS_REGISTRY_OBJECT_ID_TESTNET</code> if empty):
            </label>
            <input
              type="text"
              value={oldStatsRegistryId}
              onChange={(e) => setOldStatsRegistryId(e.target.value)}
              placeholder="Leave empty to use environment variable"
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '1rem',
                    border: `1px solid ${styles.border}`,
                borderRadius: '4px',
                    backgroundColor: styles.inputBg,
                    color: styles.text,
              }}
            />
          </div>

          {/* Auto Mode - Discover Wallets */}
          {scoreMigrationMode === 'auto' && (
            <div>
                  <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: styles.bgSuccess, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
                    <strong style={{ color: styles.text }}>🔍 Auto Discovery:</strong>
                    <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: styles.textSecondary }}>
                  This mode will automatically discover all wallets that have statistics in the old StatisticsRegistry by querying the registry's dynamic fields.
                </p>
              </div>
              
              {discoveredScoreWallets.length > 0 && (
                    <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: styles.bgTertiary, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
                      <strong style={{ color: styles.text }}>✅ Discovered {discoveredScoreWallets.length} wallet(s) with statistics:</strong>
                      <div style={{ marginTop: '0.5rem', maxHeight: '200px', overflowY: 'auto', fontSize: '0.9rem', fontFamily: 'monospace', color: styles.textSecondary }}>
                    {discoveredScoreWallets.map((wallet, index) => (
                      <div key={index} style={{ padding: '0.25rem 0' }}>
                        {wallet}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleDiscoverScoreWallets}
                disabled={discoveringScoreWallets || !isAdminWalletConnected}
                style={{
                  padding: '0.75rem 1.5rem',
                      backgroundColor: discoveringScoreWallets || !isAdminWalletConnected ? styles.buttonDisabled : styles.buttonSuccess,
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: discoveringScoreWallets || !isAdminWalletConnected ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  marginBottom: '1rem',
                }}
              >
                {discoveringScoreWallets ? 'Discovering...' : '🔍 Discover Wallets with Statistics'}
              </button>
            </div>
          )}

          {/* Single Mode */}
          {scoreMigrationMode === 'single' && (
            <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
                Player Address:
              </label>
              <input
                type="text"
                value={scoreMigrationAddress}
                onChange={(e) => setScoreMigrationAddress(e.target.value)}
                placeholder="0x..."
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '1rem',
                      border: `1px solid ${styles.border}`,
                  borderRadius: '4px',
                      backgroundColor: styles.inputBg,
                      color: styles.text,
                }}
              />
            </div>
          )}

          {/* Batch Mode */}
          {scoreMigrationMode === 'batch' && (
            <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
                Player Addresses (one per line):
              </label>
              <textarea
                value={scoreMigrationAddresses}
                onChange={(e) => setScoreMigrationAddresses(e.target.value)}
                placeholder="0x...&#10;0x...&#10;0x..."
                rows={10}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '1rem',
                      border: `1px solid ${styles.border}`,
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                      backgroundColor: styles.inputBg,
                      color: styles.text,
                }}
              />
            </div>
          )}

          {/* Progress Display */}
          {scoreMigrationProgress && (
                <div style={{ padding: '1rem', backgroundColor: styles.bgWarning, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
                  <strong style={{ color: styles.text }}>⏳ Migration Progress:</strong>
                  <p style={{ color: styles.text }}>
                Processing {scoreMigrationProgress.current} of {scoreMigrationProgress.total} wallets...
              </p>
                  <div style={{ width: '100%', backgroundColor: styles.bgTertiary, borderRadius: '4px', height: '20px', marginTop: '0.5rem' }}>
                <div
                  style={{
                    width: `${(scoreMigrationProgress.current / scoreMigrationProgress.total) * 100}%`,
                        backgroundColor: styles.buttonPrimary,
                    height: '100%',
                    borderRadius: '4px',
                    transition: 'width 0.3s',
                  }}
                />
              </div>
            </div>
          )}

          {/* Results Display */}
          {scoreMigrationResults.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
                  <strong style={{ color: styles.text }}>📊 Migration Results:</strong>
                  <div style={{ marginTop: '0.5rem', maxHeight: '400px', overflowY: 'auto', border: `1px solid ${styles.border}`, borderRadius: '4px', padding: '1rem', backgroundColor: styles.bgSecondary }}>
                {scoreMigrationResults.map((result, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '0.75rem',
                      marginBottom: '0.5rem',
                          backgroundColor: result.success ? styles.bgSuccess : styles.bgError,
                      borderRadius: '4px',
                      fontSize: '0.9rem',
                          border: `1px solid ${result.success ? styles.borderSuccess : styles.borderError}`,
                    }}
                  >
                        <div style={{ fontWeight: 'bold', marginBottom: '0.25rem', color: styles.text }}>
                      {result.success ? '✅' : '❌'} {result.address.substring(0, 10)}...{result.address.substring(result.address.length - 8)}
                    </div>
                    {result.success && result.digest && (
                          <div style={{ fontSize: '0.85rem', color: styles.textSecondary, marginTop: '0.25rem' }}>
                            Digest: <code style={{ backgroundColor: styles.bgTertiary, padding: '0.2rem 0.4rem', borderRadius: '3px' }}>{result.digest}</code>
                      </div>
                    )}
                    {!result.success && result.error && (
                          <div style={{ fontSize: '0.85rem', color: styles.textError, marginTop: '0.25rem' }}>
                        Error: {result.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <button
            type="button"
            onClick={handleScoreMigrationSubmit}
            disabled={scoreMigrationLoading || !isAdminWalletConnected || (scoreMigrationMode === 'auto' ? discoveredScoreWallets.length === 0 : scoreMigrationMode === 'single' ? !scoreMigrationAddress : !scoreMigrationAddresses.trim())}
            style={{
              padding: '1rem',
              fontSize: '1.1rem',
                  backgroundColor: scoreMigrationLoading || !isAdminWalletConnected ? styles.buttonDisabled : styles.buttonPrimary,
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: scoreMigrationLoading || !isAdminWalletConnected ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
                flex: '1',
                minWidth: '200px',
            }}
          >
            {scoreMigrationLoading 
              ? 'Migrating...' 
              : scoreMigrationMode === 'auto' 
                ? `Migrate ${discoveredScoreWallets.length} Statistics` 
                : scoreMigrationMode === 'single' 
                  ? 'Migrate Statistics' 
                  : 'Migrate All Statistics'}
          </button>
          </div>

          {/* Clear Stats Section */}
          <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: styles.bgWarning, borderRadius: '4px', border: `2px solid ${styles.borderError}` }}>
            <strong style={{ color: styles.textError }}>⚠️ Clear Player Statistics</strong>
            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: styles.textSecondary }}>
              This will permanently delete all statistics for a player. Use this to reset stats before re-migrating.
              <br /><strong style={{ color: styles.textError }}>WARNING: This action cannot be undone!</strong>
            </p>

            <div style={{ marginTop: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
                Player Address to Clear:
              </label>
              <input
                type="text"
                value={clearStatsAddress}
                onChange={(e) => setClearStatsAddress(e.target.value)}
                placeholder="0x..."
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '1rem',
                  border: `1px solid ${styles.border}`,
                  borderRadius: '4px',
                  backgroundColor: styles.inputBg,
                  color: styles.text,
                }}
              />
            </div>

            {clearStatsResult && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: clearStatsResult.success ? styles.bgSuccess : styles.bgError, borderRadius: '4px', border: `1px solid ${clearStatsResult.success ? styles.borderSuccess : styles.borderError}` }}>
                <div style={{ fontWeight: 'bold', marginBottom: '0.25rem', color: styles.text }}>
                  {clearStatsResult.success ? '✅ Stats Cleared Successfully' : '❌ Failed to Clear Stats'}
                </div>
                {clearStatsResult.success && clearStatsResult.digest && (
                  <div style={{ fontSize: '0.85rem', color: styles.textSecondary, marginTop: '0.25rem' }}>
                    Digest: <code style={{ backgroundColor: styles.bgTertiary, padding: '0.2rem 0.4rem', borderRadius: '3px' }}>{clearStatsResult.digest}</code>
                  </div>
                )}
                {!clearStatsResult.success && clearStatsResult.error && (
                  <div style={{ fontSize: '0.85rem', color: styles.textError, marginTop: '0.25rem' }}>
                    Error: {clearStatsResult.error}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
              <button
                type="button"
                onClick={() => handleClearStats(false)}
                disabled={clearStatsLoading || !isAdminWalletConnected || !clearStatsAddress.trim()}
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  backgroundColor: clearStatsLoading || !isAdminWalletConnected || !clearStatsAddress.trim() ? styles.buttonDisabled : styles.buttonDanger,
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: clearStatsLoading || !isAdminWalletConnected || !clearStatsAddress.trim() ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  flex: '1',
                  minWidth: '200px',
                }}
              >
                {clearStatsLoading ? 'Clearing...' : '🗑️ Clear Player Statistics'}
              </button>
              <button
                type="button"
                onClick={() => handleClearStats(true)}
                disabled={clearStatsLoading || !isAdminWalletConnected}
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  backgroundColor: clearStatsLoading || !isAdminWalletConnected ? styles.buttonDisabled : styles.buttonDanger,
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: clearStatsLoading || !isAdminWalletConnected ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  flex: '1',
                  minWidth: '200px',
                }}
              >
                {clearStatsLoading ? 'Clearing All...' : '🗑️ Clear ALL Player Statistics'}
              </button>
            </div>
          </div>
            </>
          )}

          {/* Game Pass Migration Section */}
          {migrationSubType === 'game-pass' && (
            <>
              <div style={{ padding: '1rem', backgroundColor: styles.bgInfo, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
                <strong style={{ color: styles.text }}>📋 Game Pass Migration Instructions:</strong>
                <ul style={{ marginTop: '0.5rem', marginLeft: '1.5rem', fontSize: '0.9rem', color: styles.textSecondary }}>
                  <li>Migrate player game passes from the old GamePassSystem to the new GamePassSystem</li>
                  <li>Single mode: Migrate one wallet at a time</li>
                  <li>Batch mode: Migrate multiple wallets (one address per line)</li>
                  <li>Auto mode: Discover all wallets with game passes and migrate them</li>
                  <li>Old system IDs can be left empty to use environment defaults</li>
                  <li><strong>Note:</strong> Game passes are merged (games are added, tickets are preserved)</li>
                </ul>
              </div>

              {/* Migration Mode Selector */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
                  Migration Mode:
                </label>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: styles.text }}>
                    <input
                      type="radio"
                      value="auto"
                      checked={gamePassMigrationMode === 'auto'}
                      onChange={(e) => setGamePassMigrationMode(e.target.value as 'single' | 'batch' | 'auto')}
                      style={{ marginRight: '0.5rem' }}
                    />
                    Auto (Discover All Wallets)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: styles.text }}>
                    <input
                      type="radio"
                      value="single"
                      checked={gamePassMigrationMode === 'single'}
                      onChange={(e) => setGamePassMigrationMode(e.target.value as 'single' | 'batch' | 'auto')}
                      style={{ marginRight: '0.5rem' }}
                    />
                    Single Wallet
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: styles.text }}>
                    <input
                      type="radio"
                      value="batch"
                      checked={gamePassMigrationMode === 'batch'}
                      onChange={(e) => setGamePassMigrationMode(e.target.value as 'single' | 'batch' | 'auto')}
                      style={{ marginRight: '0.5rem' }}
                    />
                    Batch (Manual List)
                  </label>
                </div>
              </div>

              {/* Old Game Pass System Configuration */}
              <div style={{ padding: '1rem', backgroundColor: styles.bgTertiary, borderRadius: '4px', marginBottom: '1rem', border: `1px solid ${styles.border}` }}>
                <strong style={{ color: styles.text }}>📋 Old Game Pass System Configuration:</strong>
                <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: styles.textSecondary }}>
                  These fields are optional. If left empty, the system will use environment variables (checks TESTNET versions first):
                  <br />• <code style={{ backgroundColor: styles.bgSecondary, padding: '0.2rem 0.4rem', borderRadius: '3px' }}>OLD_GAME_SCORE_CONTRACT_TESTNET</code> or <code style={{ backgroundColor: styles.bgSecondary, padding: '0.2rem 0.4rem', borderRadius: '3px' }}>OLD_GAME_SCORE_PACKAGE_ID</code> (for Package ID)
                  <br />• <code style={{ backgroundColor: styles.bgSecondary, padding: '0.2rem 0.4rem', borderRadius: '3px' }}>OLD_GAME_PASS_SYSTEM_OBJECT_ID_TESTNET</code> or <code style={{ backgroundColor: styles.bgSecondary, padding: '0.2rem 0.4rem', borderRadius: '3px' }}>OLD_GAME_PASS_SYSTEM_OBJECT_ID</code> (for System Object ID)
                </p>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
                  Old Package ID (optional - uses <code style={{ backgroundColor: styles.bgSecondary, padding: '0.2rem 0.4rem', borderRadius: '3px' }}>OLD_GAME_SCORE_CONTRACT_TESTNET</code> if empty):
                </label>
                <input
                  type="text"
                  value={oldGamePassPackageId}
                  onChange={(e) => setOldGamePassPackageId(e.target.value)}
                  placeholder="Leave empty to use environment variable"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    fontSize: '1rem',
                    border: `1px solid ${styles.border}`,
                    borderRadius: '4px',
                    backgroundColor: styles.inputBg,
                    color: styles.text,
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
                  Old Game Pass System Object ID (optional - uses <code style={{ backgroundColor: styles.bgSecondary, padding: '0.2rem 0.4rem', borderRadius: '3px' }}>OLD_GAME_PASS_SYSTEM_OBJECT_ID_TESTNET</code> if empty):
                </label>
                <input
                  type="text"
                  value={oldGamePassSystemId}
                  onChange={(e) => setOldGamePassSystemId(e.target.value)}
                  placeholder="Leave empty to use environment variable"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    fontSize: '1rem',
                    border: `1px solid ${styles.border}`,
                    borderRadius: '4px',
                    backgroundColor: styles.inputBg,
                    color: styles.text,
                  }}
                />
              </div>

              {/* Auto Mode - Discover Wallets */}
              {gamePassMigrationMode === 'auto' && (
                <div>
                  <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: styles.bgSuccess, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
                    <strong style={{ color: styles.text }}>🔍 Auto Discovery:</strong>
                    <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: styles.textSecondary }}>
                      This mode will automatically discover all wallets that have game passes in the old GamePassSystem by querying the system's dynamic fields.
                    </p>
                  </div>
                  
                  {discoveredGamePassWallets.length > 0 && (
                    <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: styles.bgTertiary, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
                      <strong style={{ color: styles.text }}>✅ Discovered {discoveredGamePassWallets.length} wallet(s) with game passes:</strong>
                      <div style={{ marginTop: '0.5rem', maxHeight: '200px', overflowY: 'auto', fontSize: '0.9rem', fontFamily: 'monospace', color: styles.textSecondary }}>
                        {discoveredGamePassWallets.map((wallet, index) => (
                          <div key={index} style={{ padding: '0.25rem 0' }}>
                            {wallet}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleDiscoverGamePassWallets}
                    disabled={discoveringGamePassWallets || !isAdminWalletConnected}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: discoveringGamePassWallets || !isAdminWalletConnected ? styles.buttonDisabled : styles.buttonSuccess,
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: discoveringGamePassWallets || !isAdminWalletConnected ? 'not-allowed' : 'pointer',
                      fontWeight: 'bold',
                      marginBottom: '1rem',
                    }}
                  >
                    {discoveringGamePassWallets ? 'Discovering...' : '🔍 Discover Wallets with Game Passes'}
                  </button>
                </div>
              )}

              {/* Single Mode */}
              {gamePassMigrationMode === 'single' && (
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
                    Player Address:
                  </label>
                  <input
                    type="text"
                    value={gamePassMigrationAddress}
                    onChange={(e) => setGamePassMigrationAddress(e.target.value)}
                    placeholder="0x..."
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      fontSize: '1rem',
                      border: `1px solid ${styles.border}`,
                      borderRadius: '4px',
                      backgroundColor: styles.inputBg,
                      color: styles.text,
                    }}
                  />
                </div>
              )}

              {/* Batch Mode */}
              {gamePassMigrationMode === 'batch' && (
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
                    Player Addresses (one per line):
                  </label>
                  <textarea
                    value={gamePassMigrationAddresses}
                    onChange={(e) => setGamePassMigrationAddresses(e.target.value)}
                    placeholder="0x...&#10;0x...&#10;0x..."
                    rows={10}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      fontSize: '1rem',
                      border: `1px solid ${styles.border}`,
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                      backgroundColor: styles.inputBg,
                      color: styles.text,
                    }}
                  />
                </div>
              )}

              {/* Progress Display */}
              {gamePassMigrationProgress && (
                <div style={{ padding: '1rem', backgroundColor: styles.bgWarning, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
                  <strong style={{ color: styles.text }}>⏳ Migration Progress:</strong>
                  <p style={{ color: styles.text }}>
                    Processing {gamePassMigrationProgress.current} of {gamePassMigrationProgress.total} wallets...
                  </p>
                  <div style={{ width: '100%', backgroundColor: styles.bgTertiary, borderRadius: '4px', height: '20px', marginTop: '0.5rem' }}>
                    <div
                      style={{
                        width: `${(gamePassMigrationProgress.current / gamePassMigrationProgress.total) * 100}%`,
                        backgroundColor: styles.buttonPrimary,
                        height: '100%',
                        borderRadius: '4px',
                        transition: 'width 0.3s',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Results Display */}
              {gamePassMigrationResults.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <strong style={{ color: styles.text }}>📊 Migration Results:</strong>
                  <div style={{ marginTop: '0.5rem', maxHeight: '400px', overflowY: 'auto', border: `1px solid ${styles.border}`, borderRadius: '4px', padding: '1rem', backgroundColor: styles.bgSecondary }}>
                    {gamePassMigrationResults.map((result, index) => (
                      <div
                        key={index}
                        style={{
                          padding: '0.75rem',
                          marginBottom: '0.5rem',
                          backgroundColor: result.success ? styles.bgSuccess : styles.bgError,
                          borderRadius: '4px',
                          fontSize: '0.9rem',
                          border: `1px solid ${result.success ? styles.borderSuccess : styles.borderError}`,
                        }}
                      >
                        <div style={{ fontWeight: 'bold', marginBottom: '0.25rem', color: styles.text }}>
                          {result.success ? '✅' : '❌'} {result.address.substring(0, 10)}...{result.address.substring(result.address.length - 8)}
                        </div>
                        {result.success && result.digest && (
                          <div style={{ fontSize: '0.85rem', color: styles.textSecondary, marginTop: '0.25rem' }}>
                            Digest: <code style={{ backgroundColor: styles.bgTertiary, padding: '0.2rem 0.4rem', borderRadius: '3px' }}>{result.digest}</code>
                          </div>
                        )}
                        {!result.success && result.error && (
                          <div style={{ fontSize: '0.85rem', color: styles.textError, marginTop: '0.25rem' }}>
                            Error: {result.error}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleGamePassMigrationSubmit}
                disabled={gamePassMigrationLoading || !isAdminWalletConnected || (gamePassMigrationMode === 'auto' ? discoveredGamePassWallets.length === 0 : gamePassMigrationMode === 'single' ? !gamePassMigrationAddress : !gamePassMigrationAddresses.trim())}
                style={{
                  padding: '1rem',
                  fontSize: '1.1rem',
                  backgroundColor: gamePassMigrationLoading || !isAdminWalletConnected ? styles.buttonDisabled : styles.buttonPrimary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: gamePassMigrationLoading || !isAdminWalletConnected ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                }}
              >
                {gamePassMigrationLoading 
                  ? 'Migrating...' 
                  : gamePassMigrationMode === 'auto' 
                    ? `Migrate ${discoveredGamePassWallets.length} Game Passes` 
                    : gamePassMigrationMode === 'single' 
                      ? 'Migrate Game Pass' 
                      : 'Migrate All Game Passes'}
              </button>
            </>
          )}
        </div>
      )}

      {/* Tournaments Tab */}
      {activeTab === 'tournaments' && (
        <div style={{ display: isAdminWalletConnected ? 'flex' : 'none', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Tournament Creation Wizard */}
          <div style={{ padding: '1.5rem', backgroundColor: styles.bgSecondary, borderRadius: '8px', border: `1px solid ${styles.border}` }}>
            <h2 style={{ marginBottom: '1.5rem', color: styles.text, fontSize: '1.5rem' }}>🏆 Create Tournament</h2>
            
            {/* Wizard Steps Indicator */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', position: 'relative' }}>
              {(['name', 'category', 'schedule', 'entry', 'review'] as TournamentWizardStep[]).map((step, index) => {
                const stepNames = { name: 'Name', category: 'Category', schedule: 'Schedule', entry: 'Entry Fee', review: 'Review' };
                const stepIndex = (['name', 'category', 'schedule', 'entry', 'review'] as TournamentWizardStep[]).indexOf(wizardStep);
                const isActive = step === wizardStep;
                const isCompleted = stepIndex > index;
                
                return (
                  <div key={step} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: isActive ? styles.buttonPrimary : isCompleted ? '#4CAF50' : styles.bgTertiary,
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        marginBottom: '0.5rem',
                        border: `2px solid ${isActive ? styles.buttonPrimary : isCompleted ? '#4CAF50' : styles.border}`,
                      }}
                    >
                      {isCompleted ? '✓' : index + 1}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: isActive ? styles.text : styles.textSecondary, textAlign: 'center' }}>
                      {stepNames[step]}
                    </div>
                    {index < 4 && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '20px',
                          left: '50%',
                          width: '100%',
                          height: '2px',
                          backgroundColor: stepIndex > index ? '#4CAF50' : styles.border,
                          zIndex: -1,
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Step 1: Tournament Name */}
            {wizardStep === 'name' && (
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
                  Tournament Name:
                </label>
                <input
                  type="text"
                  value={tournamentName}
                  onChange={(e) => setTournamentName(e.target.value)}
                  placeholder="e.g., Weekly High Score Challenge"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    fontSize: '1rem',
                    border: `1px solid ${styles.border}`,
                    borderRadius: '4px',
                    backgroundColor: styles.inputBg,
                    color: styles.text,
                  }}
                />
                <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: styles.textSecondary }}>
                  Choose a descriptive name for your tournament
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setWizardStep('category')}
                    disabled={!tournamentName.trim()}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: !tournamentName.trim() ? styles.buttonDisabled : styles.buttonPrimary,
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: !tournamentName.trim() ? 'not-allowed' : 'pointer',
                      fontWeight: 'bold',
                    }}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Category */}
            {wizardStep === 'category' && (
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
                  Tournament Category:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                  {[
                    { value: 'highestScore', label: 'Highest Score', icon: '🎯' },
                    { value: 'totalCoins', label: 'Total Coins', icon: '💰' },
                    { value: 'longestStreak', label: 'Longest Streak', icon: '🔥' },
                    { value: 'longestDistance', label: 'Longest Distance', icon: '📏' },
                    { value: 'mostBosses', label: 'Most Bosses', icon: '👹' },
                    { value: 'mostEnemies', label: 'Most Enemies', icon: '💀' },
                  ].map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setTournamentCategory(cat.value as any)}
                      style={{
                        padding: '1rem',
                        backgroundColor: tournamentCategory === cat.value ? styles.buttonPrimary : styles.bgTertiary,
                        color: tournamentCategory === cat.value ? 'white' : styles.text,
                        border: `2px solid ${tournamentCategory === cat.value ? styles.buttonPrimary : styles.border}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      <span style={{ fontSize: '2rem' }}>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setWizardStep('name')}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: styles.bgTertiary,
                      color: styles.text,
                      border: `1px solid ${styles.border}`,
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                    }}
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setWizardStep('schedule')}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: styles.buttonPrimary,
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                    }}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Schedule */}
            {wizardStep === 'schedule' && (
              <div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
                    Start Date & Time:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.5rem' }}>
                    <input
                      type="date"
                      value={tournamentStartDate}
                      onChange={(e) => setTournamentStartDate(e.target.value)}
                      style={{
                        padding: '0.75rem',
                        fontSize: '1rem',
                        border: `1px solid ${styles.border}`,
                        borderRadius: '4px',
                        backgroundColor: styles.inputBg,
                        color: styles.text,
                      }}
                    />
                    <input
                      type="time"
                      value={tournamentStartTime}
                      onChange={(e) => setTournamentStartTime(e.target.value)}
                      style={{
                        padding: '0.75rem',
                        fontSize: '1rem',
                        border: `1px solid ${styles.border}`,
                        borderRadius: '4px',
                        backgroundColor: styles.inputBg,
                        color: styles.text,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
                    End Date & Time:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.5rem' }}>
                    <input
                      type="date"
                      value={tournamentEndDate}
                      onChange={(e) => setTournamentEndDate(e.target.value)}
                      style={{
                        padding: '0.75rem',
                        fontSize: '1rem',
                        border: `1px solid ${styles.border}`,
                        borderRadius: '4px',
                        backgroundColor: styles.inputBg,
                        color: styles.text,
                      }}
                    />
                    <input
                      type="time"
                      value={tournamentEndTime}
                      onChange={(e) => setTournamentEndTime(e.target.value)}
                      style={{
                        padding: '0.75rem',
                        fontSize: '1rem',
                        border: `1px solid ${styles.border}`,
                        borderRadius: '4px',
                        backgroundColor: styles.inputBg,
                        color: styles.text,
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setWizardStep('category')}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: styles.bgTertiary,
                      color: styles.text,
                      border: `1px solid ${styles.border}`,
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                    }}
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (tournamentStartDate && tournamentStartTime && tournamentEndDate && tournamentEndTime) {
                        const start = new Date(`${tournamentStartDate}T${tournamentStartTime}`);
                        const end = new Date(`${tournamentEndDate}T${tournamentEndTime}`);
                        if (end > start) {
                          setWizardStep('entry');
                        } else {
                          alert('End time must be after start time');
                        }
                      } else {
                        alert('Please fill in all date and time fields');
                      }
                    }}
                    disabled={!tournamentStartDate || !tournamentStartTime || !tournamentEndDate || !tournamentEndTime}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: (!tournamentStartDate || !tournamentStartTime || !tournamentEndDate || !tournamentEndTime) ? styles.buttonDisabled : styles.buttonPrimary,
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: (!tournamentStartDate || !tournamentStartTime || !tournamentEndDate || !tournamentEndTime) ? 'not-allowed' : 'pointer',
                      fontWeight: 'bold',
                    }}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Entry Fee */}
            {wizardStep === 'entry' && (
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: styles.text }}>
                  Entry Fee (Tournament Tickets):
                </label>
                <input
                  type="number"
                  min="1"
                  value={entryFeeTickets}
                  onChange={(e) => setEntryFeeTickets(parseInt(e.target.value) || 1)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    fontSize: '1rem',
                    border: `1px solid ${styles.border}`,
                    borderRadius: '4px',
                    backgroundColor: styles.inputBg,
                    color: styles.text,
                  }}
                />
                <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: styles.textSecondary }}>
                  Number of tournament tickets required to enter. Typically 1 ticket.
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setWizardStep('schedule')}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: styles.bgTertiary,
                      color: styles.text,
                      border: `1px solid ${styles.border}`,
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                    }}
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setWizardStep('review')}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: styles.buttonPrimary,
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                    }}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}

            {/* Step 5: Review */}
            {wizardStep === 'review' && (
              <div>
                <h3 style={{ marginBottom: '1rem', color: styles.text }}>Review Tournament Details</h3>
                <div style={{ padding: '1rem', backgroundColor: styles.bgTertiary, borderRadius: '4px', marginBottom: '1rem', border: `1px solid ${styles.border}` }}>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <strong style={{ color: styles.text }}>Name:</strong>
                    <div style={{ color: styles.textSecondary, marginTop: '0.25rem' }}>{tournamentName}</div>
                  </div>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <strong style={{ color: styles.text }}>Category:</strong>
                    <div style={{ color: styles.textSecondary, marginTop: '0.25rem' }}>
                      {tournamentCategory === 'highestScore' && '🎯 Highest Score'}
                      {tournamentCategory === 'totalCoins' && '💰 Total Coins'}
                      {tournamentCategory === 'longestStreak' && '🔥 Longest Streak'}
                      {tournamentCategory === 'longestDistance' && '📏 Longest Distance'}
                      {tournamentCategory === 'mostBosses' && '👹 Most Bosses'}
                      {tournamentCategory === 'mostEnemies' && '💀 Most Enemies'}
                    </div>
                  </div>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <strong style={{ color: styles.text }}>Start:</strong>
                    <div style={{ color: styles.textSecondary, marginTop: '0.25rem' }}>
                      {tournamentStartDate && tournamentStartTime && new Date(`${tournamentStartDate}T${tournamentStartTime}`).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <strong style={{ color: styles.text }}>End:</strong>
                    <div style={{ color: styles.textSecondary, marginTop: '0.25rem' }}>
                      {tournamentEndDate && tournamentEndTime && new Date(`${tournamentEndDate}T${tournamentEndTime}`).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <strong style={{ color: styles.text }}>Entry Fee:</strong>
                    <div style={{ color: styles.textSecondary, marginTop: '0.25rem' }}>{entryFeeTickets} tournament ticket(s)</div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setWizardStep('entry')}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: styles.bgTertiary,
                      color: styles.text,
                      border: `1px solid ${styles.border}`,
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                    }}
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!connectedAddress) {
                        alert('Please connect your wallet first');
                        return;
                      }

                      const start = new Date(`${tournamentStartDate}T${tournamentStartTime}`);
                      const end = new Date(`${tournamentEndDate}T${tournamentEndTime}`);
                      
                      setTournamentCreating(true);
                      setTournamentResult(null);

                      try {
                        const response = await fetch(getApiUrl('api/admin/tournaments/create'), {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            name: tournamentName,
                            category: tournamentCategory,
                            startTime: start.getTime(),
                            endTime: end.getTime(),
                            entryFeeTickets,
                            adminWalletAddress: connectedAddress,
                          }),
                        });

                        const data = await response.json();
                        
                        if (data.success) {
                          setTournamentResult({ success: true, tournament: data.tournament });
                          // Reset wizard
                          setWizardStep('name');
                          setTournamentName('');
                          setTournamentStartDate('');
                          setTournamentStartTime('');
                          setTournamentEndDate('');
                          setTournamentEndTime('');
                          setEntryFeeTickets(1);
                        } else {
                          setTournamentResult({ success: false, error: data.error || 'Failed to create tournament' });
                        }
                      } catch (error) {
                        setTournamentResult({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
                      } finally {
                        setTournamentCreating(false);
                      }
                    }}
                    disabled={tournamentCreating || !isAdminWalletConnected}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: tournamentCreating || !isAdminWalletConnected ? styles.buttonDisabled : '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: tournamentCreating || !isAdminWalletConnected ? 'not-allowed' : 'pointer',
                      fontWeight: 'bold',
                    }}
                  >
                    {tournamentCreating ? 'Creating...' : 'Create Tournament'}
                  </button>
                </div>
              </div>
            )}

            {/* Tournament Creation Result */}
            {tournamentResult && (
              <div
                style={{
                  marginTop: '1.5rem',
                  padding: '1rem',
                  borderRadius: '4px',
                  backgroundColor: tournamentResult.success ? styles.bgSuccess : styles.bgError,
                  border: `1px solid ${tournamentResult.success ? styles.borderSuccess : styles.borderError}`,
                }}
              >
                {tournamentResult.success ? (
                  <div>
                    <strong style={{ color: styles.text }}>✅ Tournament Created Successfully!</strong>
                    {tournamentResult.tournament && (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: styles.textSecondary }}>
                        <div>Tournament ID: {tournamentResult.tournament.tournamentId}</div>
                        <div>Object ID: {tournamentResult.tournament.objectId?.substring(0, 20)}...</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <strong style={{ color: styles.text }}>❌ Error:</strong>
                    <div style={{ marginTop: '0.5rem', color: styles.textError }}>{tournamentResult.error}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tournament Migration Section */}
          <div style={{ padding: '1.5rem', backgroundColor: styles.bgSecondary, borderRadius: '8px', border: `1px solid ${styles.border}` }}>
            <h2 style={{ marginBottom: '1rem', color: styles.text, fontSize: '1.5rem' }}>🔄 Tournament Migration</h2>
            <div style={{ padding: '1rem', backgroundColor: styles.bgInfo, borderRadius: '4px', border: `1px solid ${styles.border}` }}>
              <strong style={{ color: styles.text }}>📋 Note:</strong>
              <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: styles.textSecondary }}>
                Tournament migration functionality is available for future use. Since tournaments are a new feature,
                there is currently no data to migrate. This section will be expanded when migration capabilities are needed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sound Test Tab */}
      {activeTab === 'sound-test' && (
        <SoundTestTab />
      )}

      {/* Results Display */}
      {(itemsResult || badgesResult) && activeTab !== 'migration' && activeTab !== 'sound-test' && (
        <div
          style={{
            marginTop: '2rem',
            padding: '1rem',
            borderRadius: '4px',
            backgroundColor: (activeTab === 'items' ? itemsResult : badgesResult)?.success ? '#d4edda' : '#f8d7da',
            color: (activeTab === 'items' ? itemsResult : badgesResult)?.success ? '#155724' : '#721c24',
            border: `1px solid ${(activeTab === 'items' ? itemsResult : badgesResult)?.success ? '#c3e6cb' : '#f5c6cb'}`,
          }}
        >
          {(activeTab === 'items' ? itemsResult : badgesResult)?.success ? (
            <div>
              <strong>✅ Success!</strong>
              <p>{(activeTab === 'items' ? itemsResult : badgesResult)?.message}</p>
              {(activeTab === 'items' ? itemsResult : badgesResult)?.digest && (
                <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  Transaction: <code style={{ backgroundColor: 'rgba(0,0,0,0.1)', padding: '0.2rem 0.4rem', borderRadius: '3px' }}>{(activeTab === 'items' ? itemsResult : badgesResult)?.digest}</code>
                </p>
              )}
            </div>
          ) : (
            <div>
              <strong>❌ Error:</strong>
              <p>{(activeTab === 'items' ? itemsResult : badgesResult)?.error}</p>
            </div>
          )}
        </div>
      )}

        <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: styles.bgWarning, borderRadius: '4px', fontSize: '0.9rem', border: `1px solid ${styles.border}` }}>
          <strong style={{ color: styles.text }}>🔒 Security:</strong> This page requires:
          <ul style={{ marginTop: '0.5rem', marginLeft: '1.5rem', color: styles.textSecondary }}>
          <li>Admin wallet connection (verified on frontend and backend)</li>
          <li>Server-side API key authentication</li>
          <li>Wallet address verification before allowing operations</li>
        </ul>
        {activeTab === 'badges' && (
            <p style={{ marginTop: '0.5rem', color: styles.textSecondary }}>
            <strong>⚠️ Testing Only:</strong> These functions are for testing purposes. In production, players mint their own badges.
          </p>
        )}
        </div>
      </div>
    </div>
  );
}

