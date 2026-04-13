// ==========================================
// UI INITIALIZATION (EXACT COPY FROM HTML)
// ==========================================

// Use FrontendLogger if available, fallback to console
// Use var to allow redeclaration when multiple scripts are loaded
var log = (typeof window !== 'undefined' && window.FrontendLogger) 
  ? {
      debug: (cat, msg, data) => window.FrontendLogger.debug(cat, msg, data),
      info: (cat, msg, data) => window.FrontendLogger.info(cat, msg, data),
      warn: (cat, msg, data) => window.FrontendLogger.warn(cat, msg, data),
      error: (cat, msg, data) => window.FrontendLogger.error(cat, msg, data),
    }
  : {
      debug: () => {},
      info: (cat, msg, data) => console.log(`[${cat}] ${msg}`, data || ''),
      warn: (cat, msg, data) => console.warn(`[${cat}] ${msg}`, data || ''),
      error: (cat, msg, data) => console.error(`[${cat}] ${msg}`, data || ''),
    };

// Global click event listener (removed verbose logging)
document.addEventListener('click', function(e) {
  // Click tracking removed - was too verbose
}, true); // Use capture phase to catch events early

// Keyboard shortcuts for menu
document.addEventListener('keydown', function(e) {
  const gameState = (typeof window !== 'undefined' && window.gameState) ? window.gameState : null;
  if (gameState && gameState.isMenuVisible) {
    if (e.code === 'Escape') {
      e.preventDefault();
      // Close any open panels
      hideSettings();
      hideInstructions();
    }
  }
});

// Removed loadUIImages() - images now load normally via HTML
// No need for dynamic image creation

// Initialize menu on page load - wait for CSS to load first
function initializeUI() {
  // Initializing UI - ensuring start screen is visible
  
  // CRITICAL: Hide everything else FIRST, then show front page
  // This ensures start screen is the ONLY visible thing on page load
  
  // CRITICAL: Hide ALL panels/modals first
  const settingsPanel = document.getElementById('settingsPanel');
  if (settingsPanel) {
    settingsPanel.classList.remove('settings-panel-visible');
    settingsPanel.classList.add('settings-panel-hidden');
    // Settings panel hidden on init
  }
  
  const instructionsPanel = document.getElementById('instructionsPanel');
  if (instructionsPanel) {
    instructionsPanel.classList.remove('instructions-panel-visible');
    instructionsPanel.classList.add('instructions-panel-hidden');
    // Instructions panel hidden on init
  }
  
  const nameInputModal = document.getElementById('nameInputModal');
  if (nameInputModal) {
    nameInputModal.classList.remove('name-input-modal-visible');
    nameInputModal.classList.add('name-input-modal-hidden');
    // Name input modal hidden on init
  }
  
  // Hide main menu and game container (backup style - class-based)
  const mainMenu = document.getElementById('mainMenuOverlay');
  if (mainMenu) {
    mainMenu.classList.remove('main-menu-overlay-visible');
    mainMenu.classList.add('main-menu-overlay-hidden');
  }
  
  const gameContainer = document.querySelector('.game-container');
  if (gameContainer) {
    gameContainer.classList.add('game-container-hidden');
    gameContainer.classList.remove('game-container-visible');
  }
  
  // NOW show front page (start screen) - this should be the ONLY visible thing
  const frontPage = document.getElementById('frontPage');
  if (frontPage) {
    // Front page should already be visible via CSS class in HTML
    frontPage.classList.add('front-page-overlay-visible');
    frontPage.classList.remove('front-page-overlay-hidden');
    // Front page (START SCREEN) visible
  } else {
    log.error('UI INIT', 'Front page element not found!');
  }
  
  // Images will load normally when their containers become visible
  // No need to preload them
  
  // Load game data if available (from game-state-manager.js)
  // This happens AFTER UI is set up so it doesn't block the start screen
  if (typeof loadGameData === 'function') {
    loadGameData();
  } else {
    // This is expected - game-state-manager.js may not be loaded yet during early initialization
    // It will be loaded by lazy-loader and loadGameData will be called later
    log.debug('UI INIT', 'loadGameData not available yet - game-state-manager.js may not be loaded yet (this is expected)');
    // Continue anyway - this is not critical for UI initialization
  }
  
  // Ensure game state is correct - game should NOT be running
  if (typeof gameState !== 'undefined') {
    gameState.isMenuVisible = false; // Front page is showing, not menu
    gameState.isGameRunning = false;
    gameState.isPaused = false;
    gameState.isGameOver = false;
    // Game state reset - waiting for user interaction
  }
  
  // Initialize front page handler - THIS IS CRITICAL
  initializeFrontPage();
}

// Front Page Handler - ensure it only runs once
let frontPageInitialized = false;

function initializeFrontPage() {
  if (frontPageInitialized) {
    log.warn('UI INIT', 'Front page already initialized, skipping');
    return;
  }
  frontPageInitialized = true;
  
  // Initializing front page handler
  
  const frontPage = document.getElementById('frontPage');
  const enterGameBtn = document.getElementById('enterGameBtn');
  
  log.debug('UI INIT', 'Front Page element', frontPage);
  log.debug('UI INIT', 'Enter Game Button element', enterGameBtn);
  
  if (!enterGameBtn) {
    log.error('UI INIT', 'Enter Game Button not found!');
    return;
  }
  
  // IMPORTANT: Remove any existing listeners first (if any somehow got attached)
  const newBtn = enterGameBtn.cloneNode(true);
  enterGameBtn.parentNode.replaceChild(newBtn, enterGameBtn);
  
  // Now attach the listener to the fresh button
  newBtn.addEventListener('click', async function(e) {
    e.preventDefault();
    e.stopPropagation();
    // Enter Game button clicked - loading game scripts
    
    // Disable button to prevent multiple clicks
    newBtn.disabled = true;
    newBtn.textContent = 'Loading...';
    
    // CRITICAL: Wait for CSS to load before showing menu
    log.debug('UI INIT', 'Ensuring CSS is loaded before showing menu...');
    log.debug('UI INIT', 'CSSLoader available', typeof window.CSSLoader !== 'undefined');
    log.debug('UI INIT', 'CSSLoader.isLoaded', window.CSSLoader?.isLoaded);
    
    // Wait for CSSLoader to become available (it's loaded by loadDeferredScripts)
    let attempts = 0;
    while (attempts < 40 && typeof window.CSSLoader === 'undefined') {
      await new Promise(resolve => setTimeout(resolve, 50));
      attempts++;
    }
    
    // If CSSLoader is available but not initialized, initialize it
    if (typeof window.CSSLoader !== 'undefined' && typeof window.CSSLoader.init === 'function') {
      if (!window.CSSLoader.isLoaded) {
        log.debug('UI INIT', 'CSS not loaded yet, initializing CSS loader now...');
        try {
          await window.CSSLoader.init();
          // CSS loaded successfully
        } catch (error) {
          log.error('UI INIT', 'Error loading CSS', error);
        }
      } else {
        // CSS already loaded
      }
    } else {
      log.error('UI INIT', 'CSSLoader not available after waiting - menu may not display correctly');
    }
    
    // Wait a moment for styles to cascade and apply
    // Optimized: 200ms → 100ms (CSS transitions are usually faster)
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Load only menu scripts (much faster - only ~17 scripts instead of 77)
    if (typeof window.loadMenuScripts === 'function') {
      try {
        log.debug('UI INIT', 'Loading menu scripts (needed for main menu)...');
        log.debug('UI INIT', 'Menu scripts to load', window.MENU_SCRIPTS?.length || 'unknown');
        const startTime = performance.now();
        await window.loadMenuScripts();
        const loadTime = performance.now() - startTime;
        // All menu scripts loaded
        log.debug('UI INIT', 'Loaded menu scripts count', window.MENU_SCRIPTS?.length || 'unknown');
      } catch (error) {
        log.error('UI INIT', 'Error loading menu scripts', error);
        // Continue anyway - some scripts might have loaded
      }
    } else {
      log.warn('UI INIT', 'loadMenuScripts not available - scripts may not load');
      log.debug('UI INIT', 'window.loadMenuScripts type', typeof window.loadMenuScripts);
    }
    
    // Wait a moment for scripts to initialize
    // Optimized: 100ms → 50ms (script initialization is usually faster)
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // CRITICAL: Wait for wallet API to be ready before showing menu
    log.debug('UI INIT', 'Waiting for wallet API to be ready...');
    let walletReady = false;
    let walletAttempts = 0;
    const maxWalletAttempts = 100; // 10 seconds max wait (100 * 100ms)
    
    while (!walletReady && walletAttempts < maxWalletAttempts) {
      // Check if WalletService is initialized and walletAPIInstance is ready
      if (typeof WalletService !== 'undefined' && WalletService._initialized) {
        // Check if walletAPIInstance exists (it's set during WalletService.initialize())
        if (window.walletAPIInstance) {
          walletReady = true;
          log.debug('UI INIT', 'Wallet API is ready');
          break;
        }
      }
      
      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
      walletAttempts++;
    }
    
    if (!walletReady) {
      log.warn('UI INIT', 'Wallet API not ready after waiting, proceeding anyway (wallet may initialize later)');
    } else {
      log.debug('UI INIT', 'Wallet API ready, proceeding to show menu');
    }
    
    // Hide the front page - use CSS classes only
    if (frontPage) {
      log.debug('UI INIT', 'Hiding front page...');
      frontPage.classList.remove('front-page-overlay-visible');
      frontPage.classList.add('front-page-overlay-hidden');
      // Front page hidden
    } else {
      log.error('UI INIT', 'Front page element not found!');
    }
    
    // Make absolutely sure game container is hidden
    const gameContainer = document.querySelector('.game-container');
    if (gameContainer) {
      gameContainer.classList.add('game-container-hidden');
      gameContainer.classList.remove('game-container-visible');
      // Game container hidden
    }
    
    // CRITICAL: Check panel states BEFORE showing main menu
    log.debug('UI INIT', 'Checking panel states before showMainMenu...');
    const settingsPanel = document.getElementById('settingsPanel');
    const instructionsPanel = document.getElementById('instructionsPanel');
    const nameInputModal = document.getElementById('nameInputModal');
    
    // Force hide all panels BEFORE showing main menu
    // Force hiding all panels
    if (settingsPanel) {
      settingsPanel.classList.remove('settings-panel-visible');
      settingsPanel.classList.add('settings-panel-hidden');
      settingsPanel.style.display = 'none';
      log.debug('UI INIT', 'Settings panel force hidden');
    }
    
    if (instructionsPanel) {
      instructionsPanel.classList.remove('instructions-panel-visible');
      instructionsPanel.classList.add('instructions-panel-hidden');
      instructionsPanel.style.display = 'none';
      // Instructions panel force hidden
    }
    
    if (nameInputModal) {
      nameInputModal.classList.remove('name-input-modal-visible');
      nameInputModal.classList.add('name-input-modal-hidden');
      nameInputModal.style.display = 'none';
      // Name input modal force hidden
    }
    
    // Show the main menu using the proper function (it will hide all panels/modals)
    if (typeof showMainMenu === 'function') {
      log.debug('UI INIT', 'Calling showMainMenu() function...');
      showMainMenu();
      // showMainMenu() completed
      
      // Verify main menu is actually visible
      const mainMenu = document.getElementById('mainMenuOverlay');
      if (mainMenu) {
        const finalStyle = window.getComputedStyle(mainMenu);
        
        // If still not visible, force it with !important to override any CSS
        if (finalStyle.display === 'none' || finalStyle.visibility === 'hidden') {
          log.warn('UI INIT', 'Main menu is still hidden! Forcing visibility...');
          mainMenu.style.setProperty('display', 'flex', 'important');
          mainMenu.style.setProperty('visibility', 'visible', 'important');
          mainMenu.style.setProperty('opacity', '1', 'important');
          
          // Also ensure menu content is visible
          const menuContent = mainMenu.querySelector('.main-menu-content');
          if (menuContent) {
            menuContent.style.setProperty('opacity', '1', 'important');
            menuContent.style.setProperty('visibility', 'visible', 'important');
          }
        }
      }
    } else {
      log.error('UI INIT', 'showMainMenu() function not available!');
      // Fallback: manually show menu (backup style - class-based)
      const mainMenu = document.getElementById('mainMenuOverlay');
      if (mainMenu) {
        mainMenu.classList.remove('main-menu-overlay-hidden');
        mainMenu.classList.add('main-menu-overlay-visible');
        mainMenu.style.display = 'flex';
        mainMenu.style.visibility = 'visible';
      }
    }
    
    // Viewport container should already be visible (it contains the main menu)
    // No action needed - CSS handles it
    // Viewport container visible
    
    // Resume audio context and start menu music (after scripts load)
    if (typeof resumeAudioContext === 'function') {
      resumeAudioContext();
    }
    if (typeof startMenuMusic === 'function' && typeof gameSettings !== 'undefined' && gameSettings.backgroundMusic) {
      startMenuMusic();
    }
    
    // Re-enable button
    newBtn.disabled = false;
    newBtn.textContent = '🎮 Enter Game';
  });
  
  log.debug('UI INIT', 'Front page button event listener attached - user MUST click to proceed');
}

// Wait for CSS to load before initializing UI
// This prevents race conditions where UI code runs before CSS styles are available
// Initialize UI immediately - critical CSS is already inlined in HTML
// No need to wait for CSS loader since start screen CSS is inlined
document.addEventListener('DOMContentLoaded', function() {
  log.info('UI INIT', 'DOMContentLoaded - Initializing UI immediately (critical CSS is inlined)');
  initializeUI();
  
  // Load deferred scripts after start screen is visible
  // Optimized: 100ms → 50ms (scripts can load faster)
  setTimeout(() => {
    loadDeferredScripts();
  }, 50);
});

/**
 * Load scripts that are not needed for the start screen
 * These can load after the start screen is visible
 */
function loadDeferredScripts() {
  log.debug('UI INIT', 'Loading deferred scripts (device detection, CSS loader, etc.)...');
  
  // Load device detection
  const deviceScript = document.createElement('script');
  deviceScript.src = 'src/game/systems/device/device-detection.js';
  deviceScript.onload = () => {
    log.debug('UI INIT', 'Device detection loaded');
    
    // Load landscape orientation immediately after device detection
    const landscapeScript = document.createElement('script');
    landscapeScript.src = 'src/game/systems/device/landscape-orientation.js';
    landscapeScript.onload = () => {
      log.debug('UI INIT', 'Landscape orientation loaded');
      
      // Initialize landscape orientation immediately
      if (typeof LandscapeOrientation !== 'undefined' && typeof LandscapeOrientation.initialize === 'function') {
        log.info('UI INIT', 'Initializing landscape orientation enforcement...');
        try {
          LandscapeOrientation.initialize();
          log.info('UI INIT', '✅ Landscape orientation enforcement initialized');
        } catch (error) {
          log.error('UI INIT', 'Failed to initialize landscape orientation', error);
        }
      } else {
        log.warn('UI INIT', 'LandscapeOrientation not available after script load');
      }
      
      // After landscape orientation, load CSS loader
      loadCSSLoader();
    };
    landscapeScript.onerror = () => {
      log.error('UI INIT', 'Failed to load landscape orientation script');
      // Continue anyway - load CSS loader
      loadCSSLoader();
    };
    document.head.appendChild(landscapeScript);
  };
  deviceScript.onerror = () => {
    log.error('UI INIT', 'Failed to load device detection script');
    // Continue anyway - load CSS loader
    loadCSSLoader();
  };
  document.head.appendChild(deviceScript);
  
  // Note: API and contract configs are already loaded in index.html
  // No need to load them again here - they're loaded before this script runs
}

/**
 * Load CSS loader after device detection
 */
function loadCSSLoader() {
  const cssLoaderScript = document.createElement('script');
  cssLoaderScript.src = 'src/game/systems/device/css-loader.js';
  cssLoaderScript.onload = async () => {
    log.debug('UI INIT', 'CSS loader script loaded');
    
    // Wait for the script to fully execute (window.CSSLoader is set at the end of the script)
    // Check multiple times in case there's a timing issue
    let attempts = 0;
    while (attempts < 10 && typeof window.CSSLoader === 'undefined') {
      await new Promise(resolve => setTimeout(resolve, 10));
      attempts++;
    }
    
    // Initialize CSS loader (it will load remaining CSS)
    if (window.CSSLoader && typeof window.CSSLoader.init === 'function') {
      try {
        log.debug('UI INIT', 'Initializing CSS loader...');
        await window.CSSLoader.init();
        log.info('UI INIT', 'CSS loader initialized successfully');
      } catch (err) {
        log.error('UI INIT', 'CSS loading failed', err);
      }
    } else {
      log.error('UI INIT', 'CSSLoader object not found after script load');
      log.debug('UI INIT', 'window.CSSLoader type', typeof window.CSSLoader);
    }
  };
  cssLoaderScript.onerror = () => {
    log.error('UI INIT', 'Failed to load CSS loader script');
  };
  document.head.appendChild(cssLoaderScript);
  
  // Load footer loader
  const footerScript = document.createElement('script');
  footerScript.src = 'src/game/systems/device/footer-loader.js';
  document.head.appendChild(footerScript);
  
  // Load badge and loading modal styles (non-critical)
  const badgeStyles = document.createElement('link');
  badgeStyles.rel = 'stylesheet';
  badgeStyles.href = 'src/game/rendering/ui/badge-styles.css';
  document.head.appendChild(badgeStyles);
  
  const loadingStyles = document.createElement('link');
  loadingStyles.rel = 'stylesheet';
  loadingStyles.href = 'src/game/rendering/ui/loading-modal.css';
  document.head.appendChild(loadingStyles);
  
  // Game Pass styles (non-critical)
  const gamePassStyles = document.createElement('link');
  gamePassStyles.rel = 'stylesheet';
  gamePassStyles.href = 'src/game/rendering/ui/game-pass-styles.css';
  document.head.appendChild(gamePassStyles);
}
