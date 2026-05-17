// ==========================================
// LAZY LOADER - Loads game scripts only when needed
// ==========================================
// This ensures only the start screen loads initially

/**
 * Scripts needed just for the main menu (load when "Enter Game" is clicked)
 * These are minimal - only what's needed to display and interact with the menu
 */
const MENU_SCRIPTS = [
  // Frontend Logger (load first - needed by all modules)
  'src/game/systems/core/frontend-logger.js',

  // Stats cache for menu + milestone prefetch (peekFresh); skipped if game scripts already loaded it
  'src/game/systems/core/api-request-cache.js',
  // Single API surface helper (frontend → game backend)
  'src/game/systems/core/game-api.js',
  // Credits / tickets: load right after game-api so GamePassService + GamePassDisplay exist before game-service init().
  'src/game/systems/ui/game-pass-service.js',
  'src/game/systems/ui/game-pass-display.js',
  // Tournament golden-path context
  'src/game/systems/core/tournament-context.js',
  // Central stats read surface (badge + menu share one implementation)
  'src/game/systems/ui/stats-service.js',
  
  // Core state management (needed for menu stats)
  'src/game/systems/core/game-state-manager.js',
  
  // Force field rendering utility (needed for how-to-play modal previews)
  'src/game/rendering/player/force-field-rendering.js',
  
  // Menu Service (NEW - handles menu visibility and panel coordination)
  'src/game/systems/ui/menu-service.js',
  
  // Wallet Service (NEW - handles wallet connection, disconnection, UI updates)
  'src/game/systems/ui/wallet-service.js',
  
  // Game Service (NEW - handles game lifecycle: start, stop, readiness)
  'src/game/systems/ui/game-service.js',

  // Store surface rules — must load before store-service / store-wallet (prep-context checks)
  'src/game/systems/ui/store-context-rules.js',
  
  // Store Service (NEW - handles store modal and purchase management)
  'src/game/systems/ui/store-service.js',
  
  // Token Balance Utils (NEW - consolidated token balance fetching)
  'src/game/systems/ui/token-balance-utils.js',     // Token balance utilities (MEWS, SUI, USDC)
  
  // Store Modules (NEW - extracted from store-ui.js)
  'src/game/systems/ui/store-utils.js',              // Price/formatting utilities
  'src/game/systems/ui/store-offer-utils.js',        // Shared offerId + price resolution (cart + cards + tabs)
  'src/game/systems/ui/store-data-sources.js',       // Game-config + token prices (single read path)
  'src/game/systems/ui/store-item-loader.js',        // Item loading from backend
  'src/game/systems/ui/store-item-rendering.js',     // Item card rendering
  'src/game/systems/ui/player-inventory-cache.js',   // Player inventory cache for menu + store (15m TTL)
  'src/game/systems/ui/store-inventory.js',          // Inventory management
  'src/game/systems/ui/store-wallet-connection.js',  // Wallet connection modal
  'src/game/systems/ui/store-purchase-flow.js',      // Purchase transaction flow
  'src/game/systems/ui/store-modal.js',              // Modal creation and management
  'src/game/systems/ui/store-item-selection.js',     // Item selection management
  'src/game/systems/ui/store-ui-updates.js',        // UI update functions
  
  'src/game/systems/ui/end-demo-modal.js',           // End Demo modal
  'src/game/systems/ui/store-game-pass-tab.js',      // Game Pass tab in store
  'src/game/systems/ui/store-tournament-tickets-tab.js', // Tournament Tickets tab in store
  'src/game/systems/ui/store-bundles-tab.js',        // Bundles tab in store
  'src/game/systems/ui/store-inventory-tab.js',      // Inventory tab in store
  
  // Leaderboard Service (NEW - handles leaderboard state management)
  'src/game/systems/ui/leaderboard-service.js',
  
  // Leaderboard Modules (NEW - extracted from leaderboard-system.js)
  'src/game/systems/ui/leaderboard-formatting.js',     // Formatting utilities
  'src/game/systems/ui/leaderboard-categories.js',     // Category management
  'src/game/systems/ui/leaderboard-pagination.js',     // Pagination logic
  'src/game/systems/ui/leaderboard-data.js',           // Blockchain data fetching
  'src/game/systems/ui/leaderboard-score-submission.js', // Score submission flow

  // Achievements BEFORE leaderboard-modal: modal calls addMilestoneProgressToLeaderboard on open;
  // menu scripts load in parallel so execution order is not guaranteed unless this file lists deps first.
  'src/game/systems/ui/achievement-popup.js',          // Achievement popup modal
  'src/game/systems/ui/achievement-progress.js',     // Milestone tabs for leaderboard modal

  'src/game/systems/ui/leaderboard-modal.js',          // Modal creation and display
  'src/game/systems/ui/leaderboard-ui.js',             // Main coordination
  
  // Tournament System (NEW - Weekly Tournament System)
  'src/game/systems/ui/tournament-modal.js',           // Tournament modal and UI
  'src/game/systems/ui/tournament-creation-modal.js',  // Tournament creation wizard
  
  // How to Play Modal (NEW - enhanced instructions with tabs and accordions)
  'src/game/systems/ui/how-to-play-content-generator.js',
  'src/game/systems/ui/how-to-play-modal.js',
  
  // Menu UI system (wallet integration setup, delegates to services)
  'src/game/systems/ui/menu-system.js',
  'src/game/systems/ui/settings-management.js',
  // Sound test: manifest of files under assets/sounds (generated; load before sound-test-system)
  'src/game/data/asset-sfx-manifest.js',
  'src/game/systems/ui/sound-test-system.js',
  'src/game/systems/ui/store-ui.js',                   // Main store UI coordination
  'src/game/systems/ui/toast-notifications.js',
  'src/game/systems/ui/loading-modal.js',
  'src/game/systems/ui/menu-panel-loading.js',
  
  // Store/inventory (needed for store menu)
  'src/game/systems/store/item-catalog.js',
  'src/game/systems/store/item-consumption.js',
  
  // Badge UI Service (NEW - handles badge UI state management)
  'src/game/systems/ui/badge-ui-service.js',
  
  // Badge UI Modules (NEW - extracted from badge-ui.js)
  'src/game/systems/ui/badge-ui-utils.js',          // Utility functions
  'src/game/systems/ui/badge-ui-display.js',       // Badge display rendering
  'src/game/systems/ui/badge-ui-modals.js',         // Modal creation and display
  'src/game/systems/ui/badge-ui-mint.js',          // Badge minting flow
  'src/game/systems/ui/badge-ui-upgrade.js',       // Badge upgrade flow
  // (removed) badge migration flow (upgradable contracts)
  
  // Blockchain/badges (needed for badge display and leaderboard)
  'src/game/blockchain/badge-service.js',
  'src/game/blockchain/score-submission.js',
  
  // Data flow management (needed for menu data loading)
  'src/game/systems/ui/game-data-state.js',
  'src/game/systems/ui/loading-manager.js',
  
  // Game Data Flow loaders before service so window.warmPlayerSessionOnBackend exists before connect load runs
  'src/game/systems/ui/game-data-flow-loaders.js',     // Data loading operations

  // Game Data Flow Modules must load BEFORE the service (service calls window.displayBadge / modal handlers).
  'src/game/systems/ui/game-data-flow-badge.js',      // Badge handling and display
  'src/game/systems/ui/game-data-flow-ui.js',         // UI updates
  'src/game/systems/ui/game-data-flow-modals.js',      // Modal management
  'src/game/systems/ui/game-data-flow-wallet.js',     // Wallet event handling

  // Game Data Flow Service (NEW - handles state management and main coordination)
  'src/game/systems/ui/game-data-flow-service.js',

  // (moved) Game Data Flow modules above service to avoid race conditions.
  // (removed) legacy delegation modules (leaderboard-system.js, badge-ui.js, game-data-flow.js)
  
  // Audio system (needed for menu sounds and background music)
  'src/game/audio/core/audio-context.js',
  'src/game/audio/settings/audio-settings.js',
  'src/game/audio/music/music-patterns.js',
  'src/game/audio/music/music-composer.js',
  'src/game/audio/music/music-manager.js',
  'src/game/audio/effects/sound-effects.js',
  'src/game/audio/utils/audio-buffer-generator.js',  // Audio buffer generator (optional enhancement)
  'src/game/audio/utils/audio-sample-loader.js',     // Audio sample loader (for pre-recorded files)
  'src/game/audio/utils/audio-sample-config.js',    // Audio sample configuration
  'src/game/audio/audio-manager.js',
  'src/game/audio/audio-integration.js',
];

/**
 * Scripts needed only when the game actually starts (load when "Start Game" is clicked)
 * These include all game logic, rendering, audio, images, etc.
 */
const GAME_SCRIPTS = [
  // Security system
  'game-security.js',
  // Replay recorder (for score verification - must load before game init/update)
  'src/game/blockchain/replay-recorder.js',
  
  // Game State and Core
  'src/game/systems/core/game-state.js',
  'src/game/systems/core/api-request-cache.js', // Load early for API caching
  'src/game/systems/core/smart-polling.js', // Load early for polling utility
  'src/game/systems/core/image-preloader.js', // Load before image files
  'src/game/systems/core/game-image-registry.js', // Load after image-preloader
  'src/game/systems/core/game-preloader.js', // Load after image-registry (pre-calculates dimensions)
  'src/game/systems/core/transition-asset-manager.js', // Load before game loop (handles transition asset loading)
  'src/game/systems/core/game-loop.js', // Load before main.js (main.js uses GameLoop)
  'src/game/systems/core/game-update.js', // Load before main.js (main.js uses GameUpdate)
  'src/game/systems/input/game-input.js', // Load before main.js (main.js uses GameInput)
  'src/game/systems/core/game-lifecycle.js', // Load before main.js (main.js uses GameLifecycle)
  'src/game/main.js',
  'src/game/systems/core/game-initialization.js',
  
  // Game Systems
  'src/game/systems/player/player.js',
  'src/game/systems/bosses/bosses.js',
  'src/game/systems/projectiles/player-projectiles.js',
  'src/game/systems/projectiles/enemy-projectiles.js',
  'src/game/systems/projectiles/boss-projectiles.js',
  'src/game/systems/collision/collision.js',
  'src/game/systems/tiles/tiles.js',
  'src/game/systems/core/scoring.js',
  'src/game/systems/collectibles/collectibles.js',
  'src/game/systems/enemies/enemy-stats.js',
  'src/game/systems/enemies/enemy-behavior.js',
  'src/game/systems/effects/effects.js',
  
  // Image loading (only needed when game starts)
  'src/game/rendering/background-images.js',
  'src/game/rendering/player/player-images.js',
  'src/game/rendering/ui/life-images.js',
  'src/game/rendering/collectibles/collectible-images.js',
  'src/game/rendering/enemies/enemy-images.js',
  'src/game/rendering/bosses/boss-images.js',
  'src/game/rendering/projectiles/projectile-images.js',
  'src/game/rendering/effects/particle.js',
  // 'src/utils/helpers.js', // Removed - content was moved to other files
  'src/game/shared/sprite-metrics.js',
  
  // Rendering modules (only needed when game starts)
  'src/game/rendering/ui/ui-rendering.js',
  'src/game/rendering/ui/game-state-rendering.js',
  'src/game/rendering/ui/lives-rendering.js',
  'src/game/rendering/background-rendering.js',
  'src/game/rendering/player/player-rendering.js',
  'src/game/rendering/projectiles/player-projectile-rendering.js',
  'src/game/rendering/projectiles/enemy-projectile-rendering.js',
  'src/game/rendering/projectiles/boss-projectile-rendering.js',
  'src/game/rendering/enemies/enemy-rendering.js',
  'src/game/rendering/collectibles/collectibles-rendering.js',
  'src/game/rendering/bosses/boss-rendering.js',
  'src/game/rendering/effects/effects-rendering.js',
  'src/game/rendering/main-rendering.js',
  
  // Mobile/Device modules (only needed when game starts)
  'src/game/systems/device/device-config.js',
  'src/game/systems/device/device-monitoring.js',
  'src/game/shared/mobile-utils.js',
  'src/game/rendering/responsive/canvas-manager.js',
  'src/game/rendering/responsive/viewport-manager.js',
  'src/game/rendering/responsive/mobile-ui.js',
  'src/game/systems/input/touch-input.js',
  
  // Consumables (only needed when game starts)
  'src/game/systems/consumables/consumable-system.js',
  'src/game/systems/consumables/coin-tractor-beam.js',
  'src/game/systems/consumables/slow-time.js',
  'src/game/systems/consumables/destroy-all.js',
  'src/game/systems/consumables/boss-kill-shot.js',
];

// Legacy: Keep DEFERRED_SCRIPTS for backwards compatibility
// But prefer using MENU_SCRIPTS and GAME_SCRIPTS separately
const DEFERRED_SCRIPTS = [...MENU_SCRIPTS, ...GAME_SCRIPTS];

let menuScriptsLoaded = false;
let menuScriptsLoading = false;
let gameScriptsLoaded = false;
let gameScriptsLoading = false;

/**
 * Cache busting for menu/game scripts.
 * Some local servers (and some browsers) aggressively cache `script` responses.
 * We want a fresh copy after rebuilds/edits without requiring devtools "disable cache".
 */
function getScriptCacheBustValue() {
  try {
    if (typeof window !== 'undefined') {
      if (!window.__SCRIPT_CACHE_BUST_V) {
        window.__SCRIPT_CACHE_BUST_V = String(Date.now());
      }
      return window.__SCRIPT_CACHE_BUST_V;
    }
  } catch (_) {}
  return String(Date.now());
}

function normalizeScriptSrc(u) {
  try {
    // Strip query/hash for comparisons (we add ?v=...).
    return String(u || '').split('#')[0].split('?')[0];
  } catch (_) {
    return String(u || '');
  }
}

function withCacheBust(src) {
  // Only add for relative/local script paths (our `src/...` entries).
  if (!src || typeof src !== 'string') return src;
  if (!src.startsWith('src/')) return src;
  const v = getScriptCacheBustValue();
  const sep = src.includes('?') ? '&' : '?';
  return `${src}${sep}v=${encodeURIComponent(v)}`;
}

/**
 * Check if a script is already loaded
 */
function isScriptLoaded(src) {
  const scripts = document.querySelectorAll('script[src]');
  const want = normalizeScriptSrc(src);
  for (let script of scripts) {
    const have = normalizeScriptSrc(script.getAttribute('src') || script.src);
    if (have === want) {
      return true;
    }
  }
  return false;
}

/**
 * Load scripts needed for the main menu
 * Called when user clicks "Enter Game"
 * @returns {Promise} Resolves when menu scripts are loaded
 */
function loadMenuScripts() {
  if (menuScriptsLoaded) {
    console.log('✅ Menu scripts already loaded');
    return Promise.resolve();
  }
  
  if (menuScriptsLoading) {
    console.log('⏳ Menu scripts already loading...');
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (menuScriptsLoaded) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }
  
  menuScriptsLoading = true;
  console.log('📦 Loading menu scripts...');
  console.log(`📋 Total menu scripts to load: ${MENU_SCRIPTS.length}`);
  const loadStartTime = performance.now();
  
  return loadScripts(MENU_SCRIPTS, 'menu').then(() => {
    menuScriptsLoaded = true;
    menuScriptsLoading = false;
    const totalLoadTime = performance.now() - loadStartTime;
    console.log(`✅ All menu scripts loaded in ${totalLoadTime.toFixed(2)}ms`);
  });
}

/**
 * Load scripts needed for the actual game
 * Called when user clicks "Start Game"
 * @returns {Promise} Resolves when game scripts are loaded
 */
function loadGameScripts() {
  if (gameScriptsLoaded) {
    console.log('✅ Game scripts already loaded');
    return Promise.resolve();
  }
  
  if (gameScriptsLoading) {
    console.log('⏳ Game scripts already loading...');
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (gameScriptsLoaded) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }
  
  gameScriptsLoading = true;
  console.log('📦 Loading game scripts...');
  console.log(`📋 Total game scripts to load: ${GAME_SCRIPTS.length}`);
  const loadStartTime = performance.now();
  
  return loadScripts(GAME_SCRIPTS, 'game').then(() => {
    gameScriptsLoaded = true;
    gameScriptsLoading = false;
    const totalLoadTime = performance.now() - loadStartTime;
    console.log(`✅ All game scripts loaded in ${totalLoadTime.toFixed(2)}ms`);
  });
}

/**
 * Generic script loader
 * @param {string[]} scripts - Array of script paths to load
 * @param {string} type - Type of scripts ('menu' or 'game') for logging
 * @returns {Promise} Resolves when all scripts are loaded
 */
function loadScripts(scripts, type = 'scripts') {
  const loadStartTime = performance.now();
  
  return new Promise((resolve, reject) => {
    let loadedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    const totalScripts = scripts.length;
    
    function onScriptLoad() {
      loadedCount++;
      if (loadedCount + errorCount + skippedCount === totalScripts) {
        if (errorCount > 0) {
          console.warn(`⚠️ ${errorCount} ${type} scripts failed to load, but continuing...`);
        }
        if (skippedCount > 0) {
          console.log(`⏭️ ${skippedCount} ${type} scripts already loaded, skipped`);
        }
        const totalLoadTime = performance.now() - loadStartTime;
        console.log(`✅ All ${type} scripts loaded in ${totalLoadTime.toFixed(2)}ms`);
        console.log(`📊 Summary: ${loadedCount} loaded, ${skippedCount} skipped, ${errorCount} errors out of ${totalScripts} total`);
        
        // Log what's available on window after loading (only for menu scripts)
        if (type === 'menu') {
          console.log('🔍 Checking global functions after menu script load...');
          const importantFunctions = ['showMainMenu', 'handleConnectWallet', 'loadGameData', 'showSettings', 'showInstructions', 'showStore', 'showLeaderboard', 'showTournaments'];
          importantFunctions.forEach(funcName => {
            if (typeof window[funcName] === 'function') {
              console.log(`  ✅ ${funcName} is available`);
            } else {
              console.warn(`  ⚠️ ${funcName} is NOT available (type: ${typeof window[funcName]})`);
            }
          });

          // Ensure local settings/stats are loaded once the menu scripts are available.
          // ui-initialization may run before game-state-manager.js is loaded, so it can miss this.
          try {
            if (typeof loadGameData === 'function') {
              loadGameData();
            }
          } catch (e) {
            console.warn('⚠️ loadGameData() failed:', e);
          }
          
          // Initialize audio system after menu scripts load
          setTimeout(() => {
            if (typeof initGameAudio === 'function') {
              console.log('🎵 Initializing audio system...');
              initGameAudio();
              console.log('✅ Audio system initialized');
            } else {
              console.warn('⚠️ initGameAudio function not available - audio scripts may not have loaded');
            }
          }, 100);
          
          // Initialize wallet integration after menu scripts load
          setTimeout(async () => {
            if (typeof WalletService !== 'undefined' && WalletService.initialize) {
              console.log('🔗 Initializing wallet integration...');
              try {
                const ok = await WalletService.initialize();
                if (ok && typeof window.WalletAPI !== 'undefined' && window.walletAPIInstance) {
                  console.log('✅ Wallet integration initialized');
                } else {
                  console.warn('⚠️ Wallet integration not ready (WalletAPI missing)', {
                    hasWalletAPI: typeof window.WalletAPI !== 'undefined',
                    hasWalletAPIInstance: !!window.walletAPIInstance,
                  });
                }
              } catch (error) {
                console.error('❌ Failed to initialize wallet integration:', error);
              }
            } else if (typeof initializeWalletIntegration === 'function') {
              console.log('🔗 Initializing wallet integration (fallback)...');
              try {
                await initializeWalletIntegration();
                if (typeof window.WalletAPI !== 'undefined' && window.walletAPIInstance) {
                  console.log('✅ Wallet integration initialized (fallback)');
                } else {
                  console.warn('⚠️ Wallet integration not ready (fallback)', {
                    hasWalletAPI: typeof window.WalletAPI !== 'undefined',
                    hasWalletAPIInstance: !!window.walletAPIInstance,
                  });
                }
              } catch (error) {
                console.error('❌ Failed to initialize wallet integration (fallback):', error);
              }
            } else {
              console.warn('⚠️ WalletService and initializeWalletIntegration not available - wallet scripts may not have loaded');
            }
          }, 200); // Wait a bit longer for wallet module to load
          
        }
        
        // Initialize responsive canvas system after game scripts load
        if (type === 'game') {
          setTimeout(() => {
            if (typeof ResponsiveCanvas !== 'undefined' && typeof ViewportManager !== 'undefined') {
              const canvas = document.getElementById('gameCanvas');
              if (canvas) {
                ResponsiveCanvas.initialize(canvas);
                ViewportManager.initialize();
                
                if (typeof TouchInput !== 'undefined') {
                  TouchInput.initialize(canvas);
                }
                
                if (typeof MobileUI !== 'undefined') {
                  MobileUI.initialize();
                }
                
                console.log('📐 Responsive canvas system initialized');
              }
            }
          }, 100);
        }
        
        resolve();
      }
    }
    
    function onScriptError(src) {
      errorCount++;
      console.error(`❌ Failed to load ${type} script: ${src}`);
      onScriptLoad(); // Still count it so we can continue
    }
    
    // Load wallet module separately (only for menu scripts)
    // Note: WalletService.initialize() will be called after all menu scripts load
    if (type === 'menu') {
      const resolveWalletBaseUrl = async () => {
        const configured = window.GAME_CONFIG?.WALLET_MODULE_URL;

        const apiBase = window.GAME_CONFIG?.API_BASE_URL;
        const hostname = typeof window !== 'undefined' && window.location ? window.location.hostname : '';
        const isLocalhost =
          hostname === 'localhost' ||
          hostname === '127.0.0.1' ||
          hostname === '0.0.0.0' ||
          hostname.startsWith('192.168.') ||
          hostname.startsWith('10.');

        // Production: game backend resolves wallet URL from PLATFORM_BACKEND_URL (never localhost).
        if (!isLocalhost && apiBase) {
          try {
            const u = new URL(String(apiBase), window.location.origin);
            const path = u.pathname.replace(/\/+$/, '');
            const configPath = path.endsWith('/api') ? `${path}/config` : '/api/config';
            const configUrl = `${u.origin}${configPath}?source=wallet-loader`;
            const resp = await fetch(configUrl, { method: 'GET', cache: 'no-store' });
            if (resp.ok) {
              const json = await resp.json();
              if (json?.success === true && typeof json.walletModuleUrl === 'string' && json.walletModuleUrl.length > 0) {
                return json.walletModuleUrl;
              }
            }
            console.error('❌ [WALLET] Game /api/config did not return walletModuleUrl', {
              status: resp.status,
              apiBase,
            });
          } catch (e) {
            console.error('❌ [WALLET] Failed to fetch game /api/config', e);
          }
        }

        if (configured && !String(configured).includes('your-base-backend.vercel.app') && !String(configured).includes('localhost')) {
          return configured;
        }

        if (isLocalhost) {
          return 'http://localhost:3000/wallet-api.umd.cjs';
        }

        throw new Error('Wallet module URL unavailable. Set PLATFORM_BACKEND_URL on the game backend and redeploy.');
      };

      const withWalletCacheBust = (baseUrl) => {
        // Add a cache-buster to prevent sticky "downloaded as attachment / wrong MIME" caching from earlier runs.
        try {
          const u = new URL(baseUrl, window.location.origin);
          u.searchParams.set('v', String(Date.now()));
          return u.toString();
        } catch (_) {
          const sep = String(baseUrl).includes('?') ? '&' : '?';
          return `${baseUrl}${sep}v=${Date.now()}`;
        }
      };

      const loadWalletBundleOnce = (walletModuleUrl, attempt) =>
        new Promise((resolveWallet) => {
          const walletScript = document.createElement('script');
          walletScript.src = walletModuleUrl;
          walletScript.async = true;
          walletScript.dataset.walletBundle = 'true';
          walletScript.dataset.walletAttempt = String(attempt);

          walletScript.onload = function () {
            console.log('✅ Wallet bundle loaded', {
              attempt,
              hasWalletAPI: typeof window.WalletAPI !== 'undefined',
              walletApiType: typeof window.WalletAPI,
            });
            if (typeof window.WalletAPI === 'undefined') {
              console.error('❌ WalletAPI global missing after loading wallet module', { walletModuleUrl, attempt });
            }
            resolveWallet({ ok: true });
          };

          walletScript.onerror = function (e) {
            console.error('❌ Failed to load wallet module', {
              walletModuleUrl,
              attempt,
              eventType: e && e.type,
            });
            resolveWallet({ ok: false });
          };

          document.head.appendChild(walletScript);
        });

      // Best-effort: retry once if load fails or WalletAPI didn't materialize.
      (async () => {
        try {
          const baseUrl = await resolveWalletBaseUrl();
          const walletModuleUrl = withWalletCacheBust(baseUrl);
          console.log('📦 Loading wallet module from:', walletModuleUrl, { baseUrl });

          const r1 = await loadWalletBundleOnce(walletModuleUrl, 1);
          if (typeof window.WalletAPI !== 'undefined') return;
          if (!r1.ok || typeof window.WalletAPI === 'undefined') {
            console.warn('⚠️ Wallet bundle retrying (WalletAPI still missing)', {
              hasWalletAPI: typeof window.WalletAPI !== 'undefined',
            });
            const retryUrl = withWalletCacheBust(baseUrl);
            await loadWalletBundleOnce(retryUrl, 2);
          }
        } catch (walletErr) {
          console.error('❌ [WALLET] Could not resolve wallet module URL', walletErr);
        }
      })();
    }
    
    // Load all scripts (skip if already loaded)
    scripts.forEach((src, index) => {
      if (isScriptLoaded(src)) {
        skippedCount++;
        console.log(`⏭️ [${index + 1}/${totalScripts}] Skipped (already loaded): ${src}`);
        onScriptLoad(); // Count as loaded
        return;
      }
      
      const scriptLoadStart = performance.now();
      console.log(`📥 [${index + 1}/${totalScripts}] Loading: ${src}`);
      
      const script = document.createElement('script');
      script.src = withCacheBust(src);
      script.onload = () => {
        const loadTime = performance.now() - scriptLoadStart;
        const scriptName = src.split('/').pop().replace('.js', '');
        console.log(`✅ [${index + 1}/${totalScripts}] Loaded: ${src} (${loadTime.toFixed(2)}ms)`);
        console.log(`   📦 Script "${scriptName}" loaded`);
        onScriptLoad();
      };
      script.onerror = () => {
        const loadTime = performance.now() - scriptLoadStart;
        console.error(`❌ [${index + 1}/${totalScripts}] Failed: ${src} (${loadTime.toFixed(2)}ms)`);
        onScriptError(src);
      };
      document.head.appendChild(script);
    });
  });
}

// Export for use
if (typeof window !== 'undefined') {
  window.loadMenuScripts = loadMenuScripts;
  window.loadGameScripts = loadGameScripts;
  // Legacy: Keep loadGameScripts as alias that loads both (for backwards compatibility)
  window.loadAllScripts = async function() {
    await loadMenuScripts();
    await loadGameScripts();
  };
  // For backwards compatibility, make loadGameScripts load menu scripts first
  const originalLoadGameScripts = loadGameScripts;
  window.loadGameScripts = async function() {
    if (!menuScriptsLoaded) {
      await loadMenuScripts();
    }
    return originalLoadGameScripts();
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    loadMenuScripts, 
    loadGameScripts, 
    MENU_SCRIPTS, 
    GAME_SCRIPTS, 
    DEFERRED_SCRIPTS 
  };
}

