// ==========================================
// LEADERBOARD SYSTEM (EXACT COPY FROM HTML)
// ==========================================

// Leaderboard management
let leaderboard = JSON.parse(localStorage.getItem('gameLeaderboard')) || [];
let currentGameScore = 0; // Global variable to store score

// Display leaderboard
function displayLeaderboard() {
  const list = document.getElementById('leaderboardList');
  list.innerHTML = '';
  
  // Sort by descending score and take top 10
  const sortedScores = leaderboard.sort((a, b) => b.score - a.score).slice(0, 10);
  
  if (sortedScores.length === 0) {
    list.innerHTML = '<li style="text-align: center; color: #888; padding: 20px;">No scores yet!<br>Be the first to play!</li>';
    return;
  }
  
  sortedScores.forEach((entry, index) => {
    const li = document.createElement('li');
    li.className = 'leaderboard-item';
    li.innerHTML = `
      <div style="display: flex; align-items: center;">
        <div class="rank">${index + 1}</div>
        <div class="player-name">${entry.name}</div>
      </div>
      <div class="player-score">${entry.score.toLocaleString()}</div>
    `;
    list.appendChild(li);
  });
}

// Check if score deserves to be saved
function shouldSaveScore(score) {
  return leaderboard.length < 10 || score > (leaderboard.sort((a, b) => b.score - a.score)[9]?.score || 0);
}

// Show name input modal
function showNameInput(score) {
  console.log('🔵 [VISIBILITY] showNameInput() called for score:', score);
  currentGameScore = score; // Store score
  document.getElementById('finalScoreDisplay').textContent = score.toLocaleString();
  
  // IMPORTANT: Ensure settings panel is hidden when showing name input
  const settingsPanel = document.getElementById('settingsPanel');
  if (settingsPanel && settingsPanel.classList.contains('settings-panel-visible')) {
    console.log('🔵 [VISIBILITY] Hiding settings panel before showing name input modal');
    if (typeof hideSettings === 'function') {
      hideSettings();
    } else {
      settingsPanel.classList.add('settings-panel-hidden');
      settingsPanel.classList.remove('settings-panel-visible');
      console.log('🔵 [VISIBILITY] Settings panel HIDDEN');
    }
  }
  
  const nameInputModal = document.getElementById('nameInputModal');
  if (nameInputModal) {
    const wasVisible = nameInputModal.classList.contains('name-input-modal-visible');
    const wasHidden = nameInputModal.classList.contains('name-input-modal-hidden');
    console.log('🔵 [VISIBILITY] Name input modal - was visible:', wasVisible, 'was hidden:', wasHidden);
    nameInputModal.classList.add('name-input-modal-visible');
    nameInputModal.classList.remove('name-input-modal-hidden');
    console.log('🔵 [VISIBILITY] Name input modal SHOWN');
  }
  
  // Hide the game-container when modal appears
  const gameContainer = document.querySelector('.game-container');
  if (gameContainer) {
    const wasVisible = gameContainer.classList.contains('game-container-visible');
    const wasHidden = gameContainer.classList.contains('game-container-hidden');
    console.log('🔵 [VISIBILITY] Game container - was visible:', wasVisible, 'was hidden:', wasHidden);
    gameContainer.classList.add('game-container-hidden');
    gameContainer.classList.remove('game-container-visible');
    console.log('🔵 [VISIBILITY] Game container HIDDEN');
  }
  
  document.getElementById('playerNameInput').focus();
  
  // Attach event listeners to buttons for better mobile support
  // Use event delegation on the modal content to handle both click and touch events
  const nameInputContent = nameInputModal.querySelector('.name-input-content');
  if (nameInputContent) {
    // Remove any existing listeners by cloning
    const buttons = nameInputContent.querySelectorAll('button');
    buttons.forEach(button => {
      const clonedButton = button.cloneNode(true);
      button.replaceWith(clonedButton);
      
      // Check which button this is and attach appropriate listener
      if (clonedButton.textContent.trim() === 'Skip' || clonedButton.getAttribute('onclick')?.includes('skipSave')) {
        clonedButton.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('🟡 [UI FLOW] Skip button clicked via event listener');
          skipSave();
        });
        clonedButton.addEventListener('touchstart', (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('🟡 [UI FLOW] Skip button touched via event listener');
          skipSave();
        }, { passive: false });
        console.log('🔵 [VISIBILITY] Skip button event listeners attached');
      } else if (clonedButton.textContent.trim() === 'Save Score' || clonedButton.getAttribute('onclick')?.includes('saveScore')) {
        clonedButton.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('🟣 [UI FLOW] Save button clicked via event listener');
          saveScore();
        });
        clonedButton.addEventListener('touchstart', (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('🟣 [UI FLOW] Save button touched via event listener');
          saveScore();
        }, { passive: false });
        console.log('🔵 [VISIBILITY] Save button event listeners attached');
      }
    });
  }
  
  // Play achievement sound for new high score
  if (typeof playAchievementSound === 'function') {
    playAchievementSound();
  }
}

// Save score - CORRECTED VERSION
function saveScore() {
  console.log('🟣 [UI FLOW] saveScore() called');
  console.trace('🟣 [UI FLOW] saveScore() stack trace');
  
  const name = document.getElementById('playerNameInput').value.trim();
  console.log('🟣 [UI FLOW] Player name:', name);
  
  if (!name) {
    alert('Please enter your name!');
    // Don't return - close modal anyway
  } else {
    // Use currentGameScore directly instead of parsing display
    const score = currentGameScore;
    console.log("Saving score:", score, "for player:", name); // Debug
    
    // Add new score
    leaderboard.push({ name, score, date: new Date().toLocaleDateString() });
    
    // Sort and keep only top 10
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, 10);
    
    // Save to localStorage
    localStorage.setItem('gameLeaderboard', JSON.stringify(leaderboard));
    
    // Play success sound for high score
    if (typeof playSuccessSound === 'function') {
      playSuccessSound();
    }
    
    // Update display
    displayLeaderboard();
    displayLeaderboardModal(); // Also update modal if it's open
  }
  
  // Close modal (whether name was entered or not)
  hideNameInput();
  
  // Show main menu immediately after saving
  showMainMenu();
}

// Skip save
function skipSave() {
  console.log('🟡 [UI FLOW] skipSave() called');
  console.trace('🟡 [UI FLOW] skipSave() stack trace');
  
  hideNameInput();
  
  // Show main menu immediately after skipping
  showMainMenu();
}

// Hide modal
function hideNameInput() {
  console.log('🔵 [VISIBILITY] hideNameInput() called');
  console.trace('🔵 [VISIBILITY] hideNameInput() stack trace');
  
  const nameInputModal = document.getElementById('nameInputModal');
  console.log('🔵 [VISIBILITY] Name input modal element:', nameInputModal);
  
  if (nameInputModal) {
    const hadVisible = nameInputModal.classList.contains('name-input-modal-visible');
    const hadHidden = nameInputModal.classList.contains('name-input-modal-hidden');
    console.log('🔵 [VISIBILITY] Name input modal - was visible:', hadVisible, 'was hidden:', hadHidden);
    
    nameInputModal.classList.add('name-input-modal-hidden');
    nameInputModal.classList.remove('name-input-modal-visible');
    console.log('🔵 [VISIBILITY] Name input modal HIDDEN');
  } else {
    console.warn('🔵 [VISIBILITY] Name input modal element not found!');
  }
  
  const playerInput = document.getElementById('playerNameInput');
  if (playerInput) {
    playerInput.value = '';
  }
  
  // Check settings panel state
  const settingsPanel = document.getElementById('settingsPanel');
  if (settingsPanel) {
    const hasVisible = settingsPanel.classList.contains('settings-panel-visible');
    const hasHidden = settingsPanel.classList.contains('settings-panel-hidden');
    console.log('🔵 [VISIBILITY] Settings panel state check - visible:', hasVisible, 'hidden:', hasHidden);
    if (hasVisible) {
      console.warn('🔵 [VISIBILITY] ⚠️ Settings panel is visible during hideNameInput()!');
    }
  }
  
  // Restore game-container visibility (even if hidden, it's the correct state)
  // The menu will handle showing/hiding appropriately
}

// Handle Enter key in input
document.getElementById('playerNameInput').addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    saveScore();
  }
});

// Function called by game on game over
function onGameOver(finalScore) {
  console.log("🎮 [GAME OVER] Game Over - Final Score:", finalScore); // Debug
  
  // Update game stats
  if (finalScore > gameStats.bestScore) {
    gameStats.bestScore = finalScore;
    saveGameData();
  }
  
  // Ensure game container is visible so game over screen can render
  const gameContainer = document.querySelector('.game-container');
  if (gameContainer) {
    const wasVisible = gameContainer.classList.contains('game-container-visible');
    const wasHidden = gameContainer.classList.contains('game-container-hidden');
    console.log('🎮 [GAME OVER] Game container state - visible:', wasVisible, 'hidden:', wasHidden);
    
    // Make sure game container is visible for game over screen
    if (wasHidden) {
      gameContainer.classList.add('game-container-visible');
      gameContainer.classList.remove('game-container-hidden');
      console.log('🎮 [GAME OVER] Game container made VISIBLE for game over screen');
    }
  }
  
  // Wait a minimum time for game over screen to be visible, then wait for user interaction
  const minGameOverDisplayTime = 500; // Minimum 500ms to see game over screen
  const gameOverStartTime = Date.now();
  let hasProceeded = false; // Flag to ensure we only proceed once
  
  console.log('🎮 [GAME OVER] Game over screen should now be visible');
  console.log('🎮 [GAME OVER] Waiting minimum', minGameOverDisplayTime, 'ms before accepting user input...');
  
  // Function to actually proceed after delays
  function actuallyProceed() {
    if (hasProceeded) {
      console.log('🎮 [GAME OVER] Already proceeded - ignoring duplicate call');
      return;
    }
    hasProceeded = true;
    
    console.log('🎮 [GAME OVER] Minimum display time passed - proceeding');
    
    // Stop game loop - we're moving to name input modal or main menu
    if (typeof game !== 'undefined') {
      game.gameRunning = false;
      game.gameOver = false; // Clear game over flag to stop rendering
      console.log('🎮 [GAME OVER] Game loop stopped - transitioning to next screen');
    }
    
    // Remove the event listeners (must match the options used when adding)
    document.removeEventListener('click', handleInteraction, { capture: true });
    document.removeEventListener('keydown', handleInteraction, { capture: true });
    document.removeEventListener('touchstart', handleInteraction, { capture: true });
    
    // Small delay to let the click/keypress finish processing
    setTimeout(() => {
      if (shouldSaveScore(finalScore)) {
        console.log('🎮 [GAME OVER] High score detected - showing name input modal');
        showNameInput(finalScore);
      } else {
        console.log('🎮 [GAME OVER] No high score - showing main menu');
        // If no high score, show main menu
        showMainMenu();
      }
    }, 100);
  }
  
  // Event handler that checks timing
  function handleInteraction(e) {
    const elapsed = Date.now() - gameOverStartTime;
    console.log('🎮 [GAME OVER] User interaction detected:', e.type, '- elapsed:', elapsed, 'ms');
    
    // Stop propagation to prevent other handlers from interfering
    e.stopPropagation();
    
    // Check if minimum display time has passed
    if (elapsed < minGameOverDisplayTime) {
      const remaining = minGameOverDisplayTime - elapsed;
      console.log('🎮 [GAME OVER] Too early! Waiting', remaining, 'ms more for game over screen to be visible...');
      
      // Wait for the remaining time, then proceed
      setTimeout(() => {
        actuallyProceed();
      }, remaining);
      return; // Don't proceed yet
    } else {
      // Minimum time has passed, proceed immediately
      actuallyProceed();
    }
  }
  
  // Add event listeners for click, keypress, and touch
  // Don't use once: true since we handle timing manually
  document.addEventListener('click', handleInteraction, { capture: true });
  document.addEventListener('keydown', handleInteraction, { capture: true });
  document.addEventListener('touchstart', handleInteraction, { capture: true });
  
  console.log('🎮 [GAME OVER] Event listeners added - waiting for user input');
}

function showLeaderboard() {
  console.log('🏆 showLeaderboard() called');
  // Hide main menu
  const mainMenu = document.getElementById('mainMenuOverlay');
  if (mainMenu) {
    mainMenu.classList.add('main-menu-overlay-hidden');
    mainMenu.classList.remove('main-menu-overlay-visible');
  }
  
  // Create leaderboard modal using dedicated leaderboard-modal class
  // Append to viewport-container like other panels (settings, instructions, sound-test)
  const viewportContainer = document.querySelector('.viewport-container');
  if (!viewportContainer) {
    console.error('❌ [LEADERBOARD] Viewport container not found!');
    return;
  }
  
  const leaderboardModal = document.createElement('div');
  leaderboardModal.className = 'leaderboard-modal leaderboard-modal-visible';
  leaderboardModal.setAttribute('id', 'leaderboardModal');
  
  const leaderboardContent = document.createElement('div');
  leaderboardContent.className = 'leaderboard';
  
  leaderboardContent.innerHTML = `
    <h2>🏆 Leaderboard</h2>
    <ul class="leaderboard-list" id="modalLeaderboardList">
      <!-- Scores will be added dynamically here -->
    </ul>
    <button class="menu-btn primary" onclick="hideLeaderboard()">
      <span class="btn-icon">←</span> Back to Menu
    </button>
  `;
  
  leaderboardModal.appendChild(leaderboardContent);
  viewportContainer.appendChild(leaderboardModal);
  
  // Display leaderboard in modal
  displayLeaderboardModal();
}

function hideLeaderboard() {
  const leaderboardModal = document.getElementById('leaderboardModal');
  if (leaderboardModal) {
    leaderboardModal.classList.remove('leaderboard-modal-visible');
    leaderboardModal.classList.add('leaderboard-modal-hidden');
    // Remove from DOM after animation
    setTimeout(() => {
      leaderboardModal.remove();
    }, 300);
  }
  
  const mainMenu = document.getElementById('mainMenuOverlay');
  if (mainMenu) {
    mainMenu.classList.add('main-menu-overlay-visible');
    mainMenu.classList.remove('main-menu-overlay-hidden');
  }
}

function displayLeaderboardModal() {
  const list = document.getElementById('modalLeaderboardList');
  if (!list) return;
  
  list.innerHTML = '';
  
  // Sort by descending score and take top 10
  const sortedScores = leaderboard.sort((a, b) => b.score - a.score).slice(0, 10);
  
  if (sortedScores.length === 0) {
    const li = document.createElement('li');
    li.className = 'leaderboard-item';
    li.style.textAlign = 'center';
    li.style.color = '#888';
    li.style.padding = '20px';
    li.innerHTML = 'No scores yet!<br>Be the first to play!';
    list.appendChild(li);
    return;
  }
  
  sortedScores.forEach((entry, index) => {
    const li = document.createElement('li');
    li.className = 'leaderboard-item';
    
    // Create rank div
    const rankDiv = document.createElement('div');
    rankDiv.className = 'rank';
    rankDiv.textContent = index + 1;
    
    // Create name div
    const nameDiv = document.createElement('div');
    nameDiv.className = 'player-name';
    nameDiv.textContent = entry.name;
    
    // Create score div
    const scoreDiv = document.createElement('div');
    scoreDiv.className = 'player-score';
    scoreDiv.textContent = entry.score.toLocaleString();
    
    // Create flex container
    const flexContainer = document.createElement('div');
    flexContainer.className = 'flex-container';
    flexContainer.appendChild(rankDiv);
    flexContainer.appendChild(nameDiv);
    
    li.appendChild(flexContainer);
    li.appendChild(scoreDiv);
    list.appendChild(li);
  });
}
