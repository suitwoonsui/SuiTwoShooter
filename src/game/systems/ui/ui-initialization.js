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

// Initialize menu on page load
document.addEventListener('DOMContentLoaded', function() {
  loadGameData();
  
  // Hide main menu initially (front page should be visible first)
  const mainMenu = document.getElementById('mainMenuOverlay');
  if (mainMenu) {
    mainMenu.classList.add('main-menu-overlay-hidden');
    mainMenu.classList.remove('main-menu-overlay-visible');
  }
  
  // Close game completely initially (game should be closed until start)
  if (typeof closeGame === 'function') {
    closeGame();
  } else {
    // Fallback: just hide game container
    const gameContainer = document.querySelector('.game-container');
    if (gameContainer) {
      gameContainer.classList.add('game-container-hidden');
      gameContainer.classList.remove('game-container-visible');
    }
  }
});

// Front Page Handler
document.addEventListener('DOMContentLoaded', function() {
  console.log('🎬 UI Initialization: DOMContentLoaded fired');
  
  const frontPage = document.getElementById('frontPage');
  const enterGameBtn = document.getElementById('enterGameBtn');
  
  console.log('📄 Front Page element:', frontPage);
  console.log('🔘 Enter Game Button element:', enterGameBtn);
  
  if (!enterGameBtn) {
    console.error('❌ Enter Game Button not found!');
    return;
  }
  
  enterGameBtn.addEventListener('click', function() {
    console.log('🎮 Enter Game button clicked!');
    
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
    if (typeof gameAudio !== 'undefined' && gameAudio && gameAudio.audioContext) {
      console.log('🔊 Resuming audio context...');
      gameAudio.resumeContext();
      setTimeout(() => {
        if (typeof gameSettings !== 'undefined' && gameSettings && gameSettings.backgroundMusic) {
          if (typeof startMenuMusic === 'function') {
            console.log('🎵 Starting menu music...');
            startMenuMusic();
          }
        }
      }, 100);
    } else {
      console.log('⚠️ Audio not available or not initialized');
    }
  });
  
  console.log('✅ Enter Game button event listener attached');
});
