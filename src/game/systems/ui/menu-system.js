// ==========================================
// MENU SYSTEM (EXACT COPY FROM HTML)
// ==========================================

// Close game completely - stop engine and free resources
function closeGame() {
  console.log('Closing game completely');
  
  // Stop game engine
  if (typeof game !== 'undefined') {
    game.gameRunning = false;
    game.gameOver = false;
    game.paused = false;
    
    // Clear game arrays to free memory
    if (game.projectiles) game.projectiles = [];
    if (game.enemyProjectiles) game.enemyProjectiles = [];
    if (game.bossProjectiles) game.bossProjectiles = [];
    if (game.particles) game.particles = [];
    if (game.tiles) game.tiles = [];
    
    // Reset game state
    game.speed = 0;
    game.bossActive = false;
    game.bossWarning = false;
    game.boss = null;
  }
  
  // Stop all audio
  if (typeof stopBackgroundMusic === 'function') {
    stopBackgroundMusic();
  }
  if (typeof stopGameplayMusic === 'function') {
    stopGameplayMusic();
  }
  
  // Hide game container
  const gameContainer = document.querySelector('.game-container');
  if (gameContainer) {
    gameContainer.classList.add('game-container-hidden');
    gameContainer.classList.remove('game-container-visible');
  }
}

// Main menu functions
function startGame() {
  console.log('🎮 startGame() called');
  console.log('📊 Current gameState:', {
    isMenuVisible: gameState.isMenuVisible,
    isGameRunning: gameState.isGameRunning,
    isPaused: gameState.isPaused,
    isGameOver: gameState.isGameOver
  });
  
  // Initialize game if not already initialized
  if (typeof window.initializeGame === 'function') {
    console.log('🎯 Calling initializeGame()');
    window.initializeGame();
  } else {
    console.error('❌ initializeGame is not a function!');
  }
  
  gameState.isMenuVisible = false;
  gameState.isGameRunning = true;
  gameState.isPaused = false;
  gameState.isGameOver = false;
  
  console.log('✅ GameState updated:', {
    isMenuVisible: gameState.isMenuVisible,
    isGameRunning: gameState.isGameRunning
  });
  
  // Hide main menu
  const mainMenu = document.getElementById('mainMenuOverlay');
  if (mainMenu) {
    mainMenu.classList.add('main-menu-overlay-hidden');
    mainMenu.classList.remove('main-menu-overlay-visible');
    console.log('👁️ Main menu hidden');
  }
  
  // Show game container
  const gameContainer = document.querySelector('.game-container');
  if (gameContainer) {
    gameContainer.classList.add('game-container-visible');
    gameContainer.classList.remove('game-container-hidden');
    console.log('👁️ Game container shown');
    console.log('📐 Game container computed style:', {
      display: window.getComputedStyle(gameContainer).display,
      width: window.getComputedStyle(gameContainer).width,
      height: window.getComputedStyle(gameContainer).height,
      visible: gameContainer.classList.contains('game-container-visible'),
      hidden: gameContainer.classList.contains('game-container-hidden')
    });
  }
  
  // Reinitialize responsive canvas system for current screen size
  if (typeof ResponsiveCanvas !== 'undefined' && ResponsiveCanvas.isInitialized) {
    ResponsiveCanvas.setupResponsiveSizing();
    console.log('📐 Canvas resized for current screen size');
  }
  
  // Start the game
  if (typeof restart === 'function') {
    console.log('🔄 Calling restart()');
    restart();
  } else {
    console.error('❌ restart is not a function!');
  }
  
  // Stop menu music and start gameplay music (only if enabled)
  if (typeof stopBackgroundMusic === 'function') {
    stopBackgroundMusic(); // Stop menu music
  }
  if (typeof startGameplayMusic === 'function' && gameSettings.backgroundMusic) {
    startGameplayMusic(); // Start gameplay music
  }
  
  // Update games played counter
  gameStats.gamesPlayed++;
  saveGameData();
}

function showSettings() {
  console.log('🟠 [UI FLOW] showSettings() called');
  console.trace('🟠 [UI FLOW] showSettings() stack trace');
  
  // Check if name input modal is visible - it shouldn't trigger settings
  const nameInputModal = document.getElementById('nameInputModal');
  if (nameInputModal && nameInputModal.classList.contains('name-input-modal-visible')) {
    console.error('🟠 [UI FLOW] ⚠️⚠️⚠️ ERROR: showSettings() called while name input modal is visible! This should not happen!');
    console.trace('🟠 [UI FLOW] ERROR STACK TRACE');
    return; // Prevent opening settings if name input modal is showing
  }
  
  const settingsPanel = document.getElementById('settingsPanel');
  console.log('🟠 [UI FLOW] Settings panel element:', settingsPanel);
  
  if (settingsPanel) {
    const wasVisible = settingsPanel.classList.contains('settings-panel-visible');
    const wasHidden = settingsPanel.classList.contains('settings-panel-hidden');
    console.log('🟠 [VISIBILITY] Settings panel - was visible:', wasVisible, 'was hidden:', wasHidden);
    
    settingsPanel.classList.add('settings-panel-visible');
    settingsPanel.classList.remove('settings-panel-hidden');
    console.log('🟠 [VISIBILITY] Settings panel SHOWN');
    
    // Close panel when clicking outside
    const handleClickOutside = (event) => {
      const target = event.target;
      console.log('🟠 [UI FLOW] Click outside handler triggered', {
        target: target,
        targetTag: target.tagName,
        targetOnClick: target.getAttribute('onclick'),
        isInsideSettings: settingsPanel.contains(target)
      });
      
      // IMPORTANT: Don't close settings if clicking on name input modal
      const nameInputModal = document.getElementById('nameInputModal');
      if (nameInputModal && nameInputModal.contains(target)) {
        console.log('🟠 [UI FLOW] Click is in name input modal - ignoring click outside handler');
        return; // Don't process this click for settings panel
      }
      
      if (!settingsPanel.contains(target)) {
        console.log('🟠 [UI FLOW] Click was outside settings panel - hiding');
        hideSettings();
        document.removeEventListener('click', handleClickOutside);
      } else {
        console.log('🟠 [UI FLOW] Click was inside settings panel - keeping open');
      }
    };
    // Use setTimeout to avoid immediate firing
    setTimeout(() => {
      console.log('🟠 [UI FLOW] Adding click outside listener');
      document.addEventListener('click', handleClickOutside);
    }, 0);
    
    loadSettingsToUI();
  } else {
    console.warn('🟠 [UI FLOW] Settings panel element not found!');
  }
}

function hideSettings() {
  console.log('🔴 [UI FLOW] hideSettings() called');
  console.trace('🔴 [UI FLOW] hideSettings() stack trace');
  
  const settingsPanel = document.getElementById('settingsPanel');
  console.log('🔴 [UI FLOW] Settings panel element:', settingsPanel);
  
  if (settingsPanel) {
    const wasVisible = settingsPanel.classList.contains('settings-panel-visible');
    const wasHidden = settingsPanel.classList.contains('settings-panel-hidden');
    console.log('🔴 [VISIBILITY] Settings panel - was visible:', wasVisible, 'was hidden:', wasHidden);
    
    settingsPanel.classList.add('settings-panel-hidden');
    settingsPanel.classList.remove('settings-panel-visible');
    console.log('🔴 [VISIBILITY] Settings panel HIDDEN');
  } else {
    console.warn('🔴 [UI FLOW] Settings panel element not found!');
  }
}

function showInstructions() {
  const instructionsPanel = document.getElementById('instructionsPanel');
  if (instructionsPanel) {
    instructionsPanel.classList.add('instructions-panel-visible');
    instructionsPanel.classList.remove('instructions-panel-hidden');
    
    // Close panel when clicking outside
    const handleClickOutside = (event) => {
      if (!instructionsPanel.contains(event.target)) {
        hideInstructions();
        document.removeEventListener('click', handleClickOutside);
      }
    };
    // Use setTimeout to avoid immediate firing
    setTimeout(() => document.addEventListener('click', handleClickOutside), 0);
  }
}

function hideInstructions() {
  const instructionsPanel = document.getElementById('instructionsPanel');
  if (instructionsPanel) {
    instructionsPanel.classList.add('instructions-panel-hidden');
    instructionsPanel.classList.remove('instructions-panel-visible');
  }
}

// Game over handling
function onGameOverMenu(finalScore) {
  gameState.isGameRunning = false;
  gameState.isGameOver = true;
  
  // Update best score
  if (finalScore > gameStats.bestScore) {
    gameStats.bestScore = finalScore;
    saveGameData();
  }
  
  // Show main menu after a delay
  setTimeout(() => {
    showMainMenu();
  }, 3000);
}

function showMainMenu() {
  console.log('🟢 [UI FLOW] showMainMenu() called');
  console.trace('🟢 [UI FLOW] showMainMenu() stack trace');
  
  gameState.isMenuVisible = true;
  gameState.isGameRunning = false;
  gameState.isPaused = false;
  gameState.isGameOver = false;
  
  const mainMenu = document.getElementById('mainMenuOverlay');
  console.log('🟢 [UI FLOW] Main menu element:', mainMenu);
  
  if (mainMenu) {
    const hadVisible = mainMenu.classList.contains('main-menu-overlay-visible');
    const hadHidden = mainMenu.classList.contains('main-menu-overlay-hidden');
    console.log('🟢 [UI FLOW] Main menu current state - visible:', hadVisible, 'hidden:', hadHidden);
    
    mainMenu.classList.add('main-menu-overlay-visible');
    mainMenu.classList.remove('main-menu-overlay-hidden');
    console.log('🟢 [UI FLOW] Main menu shown');
  } else {
    console.warn('🟢 [UI FLOW] Main menu element not found!');
  }
  
  // Check settings panel state when showing main menu
  const settingsPanel = document.getElementById('settingsPanel');
  if (settingsPanel) {
    const hasVisible = settingsPanel.classList.contains('settings-panel-visible');
    const hasHidden = settingsPanel.classList.contains('settings-panel-hidden');
    console.log('🟢 [UI FLOW] Settings panel state check - visible:', hasVisible, 'hidden:', hasHidden);
    if (hasVisible) {
      console.warn('🟢 [UI FLOW] ⚠️ Settings panel is visible during showMainMenu()!');
    }
  }
  
  // Close game completely when returning to menu
  closeGame();
  
  updateMenuStats();
}