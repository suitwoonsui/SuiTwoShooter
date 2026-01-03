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
  
  // Core state management (needed for menu stats)
  'src/game/systems/core/game-state-manager.js',
  
  // Menu Service (NEW - handles menu visibility and panel coordination)
  'src/game/systems/ui/menu-service.js',
  
  // Wallet Service (NEW - handles wallet connection, disconnection, UI updates)
  'src/game/systems/ui/wallet-service.js',
  
  // Game Service (NEW - handles game lifecycle: start, stop, readiness)
  'src/game/systems/ui/game-service.js',
  
  // Store Service (NEW - handles store modal and purchase management)
  'src/game/systems/ui/store-service.js',
  
  // Token Balance Utils (NEW - consolidated token balance fetching)
  'src/game/systems/ui/token-balance-utils.js',     // Token balance utilities (MEWS, SUI, USDC)
  
  // Store Modules (NEW - extracted from store-ui.js)
  'src/game/systems/ui/store-utils.js',              // Price/formatting utilities
  'src/game/systems/ui/store-item-loader.js',        // Item loading from backend
  'src/game/systems/ui/store-item-rendering.js',     // Item card rendering
  'src/game/systems/ui/store-inventory.js',          // Inventory management
  'src/game/systems/ui/store-wallet-connection.js',  // Wallet connection modal
  'src/game/systems/ui/store-purchase-flow.js',      // Purchase transaction flow
  'src/game/systems/ui/store-modal.js',              // Modal creation and management
  'src/game/systems/ui/store-item-selection.js',     // Item selection management
  'src/game/systems/ui/store-ui-updates.js',        // UI update functions
  
  // Game Pass System (NEW - Phase 1 monetization)
  'src/game/systems/ui/game-pass-service.js',        // Game pass API integration
  'src/game/systems/ui/game-pass-display.js',        // Credit display component
  'src/game/systems/ui/end-demo-modal.js',           // End Demo modal
  'src/game/systems/ui/store-game-pass-tab.js',      // Game Pass tab in store
  'src/game/systems/ui/store-tournament-tickets-tab.js', // Tournament Tickets tab in store
  'src/game/systems/ui/store-inventory-tab.js',      // Inventory tab in store
  
  // Leaderboard Service (NEW - handles leaderboard state management)
  'src/game/systems/ui/leaderboard-service.js',
  
  // Leaderboard Modules (NEW - extracted from leaderboard-system.js)
  'src/game/systems/ui/leaderboard-formatting.js',     // Formatting utilities
  'src/game/systems/ui/leaderboard-local.js',          // Local leaderboard (localStorage)
  'src/game/systems/ui/leaderboard-categories.js',     // Category management
  'src/game/systems/ui/leaderboard-pagination.js',     // Pagination logic
  'src/game/systems/ui/leaderboard-data.js',           // Blockchain data fetching
  'src/game/systems/ui/leaderboard-score-submission.js', // Score submission flow
  'src/game/systems/ui/leaderboard-modal.js',          // Modal creation and display
  'src/game/systems/ui/leaderboard-ui.js',             // Main coordination
  
  // Achievement System (NEW - milestone rewards)
  'src/game/systems/ui/achievement-popup.js',          // Achievement popup modal
  'src/game/systems/ui/achievement-progress.js',       // Milestone progress tabs
  
  // Tournament System (NEW - Weekly Tournament System)
  'src/game/systems/ui/tournament-modal.js',           // Tournament modal and UI
  'src/game/systems/ui/tournament-creation-modal.js',  // Tournament creation wizard
  
  // How to Play Modal (NEW - enhanced instructions with tabs and accordions)
  'src/game/systems/ui/how-to-play-content-generator.js',
  'src/game/systems/ui/how-to-play-modal.js',
  
  // Menu UI system (wallet integration setup, delegates to services)
  'src/game/systems/ui/menu-system.js',
  'src/game/systems/ui/settings-management.js',
  'src/game/systems/ui/sound-test-system.js',
  'src/game/systems/ui/leaderboard-system.js',         // Legacy - delegates to new modules
  'src/game/systems/ui/store-ui.js',                   // Main store UI coordination
  'src/game/systems/ui/toast-notifications.js',
  'src/game/systems/ui/loading-modal.js',
  
  // Store/inventory (needed for store menu)
  'src/game/systems/store/item-catalog.js',
  'src/game/systems/store/inventory-manager.js',
  'src/game/systems/store/item-consumption.js',
  
  // Badge UI Service (NEW - handles badge UI state management)
  'src/game/systems/ui/badge-ui-service.js',
  
  // Badge UI Modules (NEW - extracted from badge-ui.js)
  'src/game/systems/ui/badge-ui-utils.js',          // Utility functions
  'src/game/systems/ui/badge-ui-display.js',       // Badge display rendering
  'src/game/systems/ui/badge-ui-modals.js',         // Modal creation and display
  'src/game/systems/ui/badge-ui-mint.js',          // Badge minting flow
  'src/game/systems/ui/badge-ui-upgrade.js',       // Badge upgrade flow
  'src/game/systems/ui/badge-ui-migration.js',     // Badge migration flow
  
  // Blockchain/badges (needed for badge display and leaderboard)
  'src/game/blockchain/badge-service.js',
  'src/game/blockchain/score-submission.js',
  'src/game/systems/ui/badge-ui.js',                // Legacy - delegates to new modules
  
  // Data flow management (needed for menu data loading)
  'src/game/systems/ui/game-data-state.js',
  'src/game/systems/ui/loading-manager.js',
  
  // Game Data Flow Service (NEW - handles state management and main coordination)
  'src/game/systems/ui/game-data-flow-service.js',
  
  // Game Data Flow Modules (NEW - extracted from game-data-flow.js)
  'src/game/systems/ui/game-data-flow-loaders.js',     // Data loading operations
  'src/game/systems/ui/game-data-flow-badge.js',      // Badge handling and display
  'src/game/systems/ui/game-data-flow-ui.js',         // UI updates
  'src/game/systems/ui/game-data-flow-modals.js',      // Modal management
  'src/game/systems/ui/game-data-flow-wallet.js',     // Wallet event handling
  'src/game/systems/ui/game-data-flow.js',            // Legacy - delegates to new modules
  
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
  'src/utils/helpers.js',
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
 * Check if a script is already loaded
 */
function isScriptLoaded(src) {
  const scripts = document.querySelectorAll('script[src]');
  for (let script of scripts) {
    if (script.src.includes(src) || script.getAttribute('src') === src) {
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
                await WalletService.initialize();
                console.log('✅ Wallet integration initialized');
              } catch (error) {
                console.error('❌ Failed to initialize wallet integration:', error);
              }
            } else if (typeof initializeWalletIntegration === 'function') {
              console.log('🔗 Initializing wallet integration (fallback)...');
              try {
                await initializeWalletIntegration();
                console.log('✅ Wallet integration initialized (fallback)');
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
      const walletModuleUrl = window.GAME_CONFIG?.WALLET_MODULE_URL || 'wallet-module/dist/wallet-api.umd.cjs';
      console.log('📦 Loading wallet module from:', walletModuleUrl);
      
      const walletScript = document.createElement('script');
      walletScript.src = walletModuleUrl;
      walletScript.onload = function() {
        console.log('✅ Wallet bundle loaded');
        // Don't initialize here - let WalletService.initialize() handle it after all scripts load
        // This ensures all dependencies are available
      };
      walletScript.onerror = () => {
        console.error('❌ Failed to load wallet module');
      };
      document.head.appendChild(walletScript);
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
      script.src = src;
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

