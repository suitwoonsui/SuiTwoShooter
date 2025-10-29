// ==========================================
// UI INITIALIZATION (EXACT COPY FROM HTML)
// ==========================================

// Global click event listener to track all clicks
document.addEventListener('click', function(e) {
  const target = e.target;
  const targetTag = target.tagName;
  const targetId = target.id;
  const targetClass = target.className;
  const targetOnClick = target.getAttribute('onclick');
  
  console.log('🎯 [CLICK TRACKING] Global click detected:', {
    tag: targetTag,
    id: targetId,
    class: targetClass,
    onclick: targetOnClick,
    textContent: target.textContent ? target.textContent.trim().substring(0, 30) : 'N/A',
    element: target
  });
  
  // Check if clicked element is inside name input modal
  const nameInputModal = document.getElementById('nameInputModal');
  const isInsideNameModal = nameInputModal && nameInputModal.contains(target);
  
  console.log('🎯 [CLICK TRACKING] Name input modal check:', {
    modalExists: !!nameInputModal,
    isInside: isInsideNameModal,
    modalVisible: nameInputModal ? nameInputModal.classList.contains('name-input-modal-visible') : 'N/A',
    modalHidden: nameInputModal ? nameInputModal.classList.contains('name-input-modal-hidden') : 'N/A'
  });
  
  if (isInsideNameModal) {
    console.log('🎯 [CLICK TRACKING] ✅ Click is INSIDE name input modal');
    
    // Check if it's the Skip button
    if (targetOnClick && targetOnClick.includes('skipSave')) {
      console.log('🎯 [CLICK TRACKING] ✅✅✅ Skip button clicked! onclick attribute:', targetOnClick);
    } else if (targetTag === 'BUTTON' && target.textContent.trim().toLowerCase() === 'skip') {
      console.log('🎯 [CLICK TRACKING] ✅✅✅ Skip button clicked (by text content)!');
      console.log('🎯 [CLICK TRACKING] ⚠️ But onclick attribute missing or wrong:', targetOnClick);
    }
    
    // Check if it's the Save Score button
    if (targetOnClick && targetOnClick.includes('saveScore')) {
      console.log('🎯 [CLICK TRACKING] ✅✅✅ Save Score button clicked! onclick attribute:', targetOnClick);
    }
  } else {
    console.log('🎯 [CLICK TRACKING] Click is OUTSIDE name input modal');
  }
  
  // Check if clicked element is inside settings panel
  const settingsPanel = document.getElementById('settingsPanel');
  if (settingsPanel && settingsPanel.contains(target)) {
    console.log('🎯 [CLICK TRACKING] Click is INSIDE settings panel');
  }
  
  // Check event path/bubbling
  console.log('🎯 [CLICK TRACKING] Event path:', e.composedPath().map(el => ({
    tag: el.tagName,
    id: el.id,
    class: el.className
  })));
}, true); // Use capture phase to catch events early

// Keyboard shortcuts for menu
document.addEventListener('keydown', function(e) {
  if (gameState.isMenuVisible) {
    if (e.code === 'Escape') {
      e.preventDefault();
      // Close any open panels
      hideSettings();
      hideInstructions();
    }
  }
});

// Initialize menu on page load - wait for CSS to load first
function initializeUI() {
  loadGameData();
  
  // CRITICAL: Ensure front page is visible and stays visible
  const frontPage = document.getElementById('frontPage');
  if (frontPage) {
    frontPage.classList.add('front-page-overlay-visible');
    frontPage.classList.remove('front-page-overlay-hidden');
    console.log('✅ Front page explicitly set to visible');
  }
  
  // Hide main menu initially (front page should be visible first)
  const mainMenu = document.getElementById('mainMenuOverlay');
  if (mainMenu) {
    mainMenu.classList.add('main-menu-overlay-hidden');
    mainMenu.classList.remove('main-menu-overlay-visible');
    console.log('✅ Main menu explicitly hidden');
  }
  
  // Close game completely initially (game should be closed until start)
  // IMPORTANT: Don't call closeGame() if it might affect the front page
  const gameContainer = document.querySelector('.game-container');
  if (gameContainer) {
    gameContainer.classList.add('game-container-hidden');
    gameContainer.classList.remove('game-container-visible');
    console.log('✅ Game container explicitly hidden');
  }
  
  // Ensure game state is correct - game should NOT be running
  if (typeof gameState !== 'undefined') {
    gameState.isMenuVisible = false; // Front page is showing, not menu
    gameState.isGameRunning = false;
    gameState.isPaused = false;
    gameState.isGameOver = false;
    console.log('✅ Game state reset - waiting for user interaction');
  }
  
  // Initialize front page handler
  initializeFrontPage();
}

// Front Page Handler - ensure it only runs once
let frontPageInitialized = false;

function initializeFrontPage() {
  if (frontPageInitialized) {
    console.warn('⚠️ Front page already initialized, skipping');
    return;
  }
  frontPageInitialized = true;
  
  console.log('🎬 UI Initialization: Initializing front page handler');
  
  const frontPage = document.getElementById('frontPage');
  const enterGameBtn = document.getElementById('enterGameBtn');
  
  console.log('📄 Front Page element:', frontPage);
  console.log('🔘 Enter Game Button element:', enterGameBtn);
  
  if (!enterGameBtn) {
    console.error('❌ Enter Game Button not found!');
    return;
  }
  
  // IMPORTANT: Remove any existing listeners first (if any somehow got attached)
  const newBtn = enterGameBtn.cloneNode(true);
  enterGameBtn.parentNode.replaceChild(newBtn, enterGameBtn);
  
  // Now attach the listener to the fresh button
  newBtn.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    console.log('🎮 Enter Game button clicked! (PREVENTING DEFAULT)');
    
    // Hide the front page
    if (frontPage) {
      console.log('👁️ Hiding front page...');
      frontPage.classList.remove('front-page-overlay-visible');
      frontPage.classList.add('front-page-overlay-hidden');
      console.log('✅ Front page hidden');
    } else {
      console.error('❌ Front page element not found!');
    }
    
    // Make absolutely sure game container is hidden
    const gameContainer = document.querySelector('.game-container');
    if (gameContainer) {
      gameContainer.classList.add('game-container-hidden');
      gameContainer.classList.remove('game-container-visible');
      console.log('✅ Game container hidden');
    }
    
    // Show the main menu
    const mainMenu = document.getElementById('mainMenuOverlay');
    console.log('📋 Main menu element:', mainMenu);
    if (mainMenu) {
      console.log('👁️ Showing main menu...');
      mainMenu.classList.remove('main-menu-overlay-hidden');
      mainMenu.classList.add('main-menu-overlay-visible');
      console.log('✅ Main menu shown');
    } else {
      console.error('❌ Main menu element not found!');
    }
    
    // Resume audio context and start menu music
    if (typeof resumeAudioContext === 'function') {
      resumeAudioContext();
    }
    if (typeof startMenuMusic === 'function' && gameSettings.backgroundMusic) {
      startMenuMusic();
    }
  });
  
  console.log('✅ Front page button event listener attached - user MUST click to proceed');
}

// Wait for CSS to load before initializing UI
// This prevents race conditions where UI code runs before CSS styles are available
document.addEventListener('DOMContentLoaded', function() {
  // Check if CSS is already loaded (check for CSSLoader.isLoaded flag)
  if (window.CSSLoader && window.CSSLoader.isLoaded) {
    console.log('🎬 CSS already loaded - initializing UI immediately');
    initializeUI();
  } else {
    console.log('🎬 Waiting for CSS to load before initializing UI...');
    // Wait for CSS to load
    window.addEventListener('cssLoaded', function() {
      console.log('🎬 CSS loaded - initializing UI');
      initializeUI();
    }, { once: true });
    
    // Fallback: if CSS doesn't signal loaded within 3 seconds, proceed anyway
    setTimeout(() => {
      if (!window.CSSLoader || !window.CSSLoader.isLoaded) {
        console.warn('⚠️ CSS load timeout - initializing UI anyway');
        initializeUI();
      }
    }, 3000);
  }
});
