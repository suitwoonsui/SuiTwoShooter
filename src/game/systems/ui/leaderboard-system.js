// ==========================================
// LEADERBOARD SYSTEM (EXACT COPY FROM HTML)
// ==========================================

// Leaderboard management
let leaderboard = JSON.parse(localStorage.getItem('gameLeaderboard')) || [];
let currentGameScore = 0; // Global variable to store score

// ==========================================
// BLOCKCHAIN LEADERBOARD CAROUSEL
// ==========================================

// Category definitions
const leaderboardCategories = [
  { id: 'score', name: 'Overall Score', icon: '🏆', primaryField: 'score' },
  { id: 'distance', name: 'Distance Traveled', icon: '📏', primaryField: 'distance' },
  { id: 'bosses', name: 'Bosses Defeated', icon: '👹', primaryField: 'bossesDefeated' },
  { id: 'enemies', name: 'Enemies Defeated', icon: '💀', primaryField: 'enemiesDefeated' },
  { id: 'coins', name: 'Coins Collected', icon: '💰', primaryField: 'coins' },
  { id: 'streak', name: 'Longest Coin Streak', icon: '🔥', primaryField: 'longestCoinStreak' }
];

// Current category index
let currentCategoryIndex = 0;

// Current leaderboard data (loaded from blockchain)
let currentLeaderboardData = [];

// Loading state
let isLoadingLeaderboard = false;

// Pagination state
let itemsPerPage = 20; // Show 20 items at a time
let displayedItemsCount = 0; // How many items are currently displayed
let currentWalletAddress = null; // Current user's wallet address
let currentWalletRank = null; // Current wallet's rank (if not in top displayed)
let currentWalletEntry = null; // Current wallet's best entry

// Display leaderboard
function displayLeaderboard() {
  const list = document.getElementById('leaderboardList');
  if (!list) {
    console.warn('⚠️ [LEADERBOARD] leaderboardList element not found, skipping display');
    return;
  }
  
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

// Show name input modal (always shown after game over - all scores are tracked)
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
        // Remove onclick attribute to prevent double-firing (we use event listener instead)
        clonedButton.removeAttribute('onclick');
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
  
    // Play achievement sound
  if (typeof playAchievementSound === 'function') {
    playAchievementSound();
  }
}

// Save score - CORRECTED VERSION with blockchain submission
async function saveScore() {
  console.log('🟣 [UI FLOW] saveScore() called');
  console.trace('🟣 [UI FLOW] saveScore() stack trace');
  
  const name = document.getElementById('playerNameInput').value.trim();
  console.log('🟣 [UI FLOW] Player name:', name);
  
  // Prevent double-submission
  if (saveScore._submitting) {
    console.log('🟣 [UI FLOW] saveScore() already in progress, ignoring duplicate call');
    return;
  }
  
  if (!name) {
    alert('Please enter your name!');
    // Don't return - close modal anyway, but don't submit
    hideNameInput();
    showMainMenu();
    return;
  }
  
  // Mark as submitting to prevent duplicate calls
  saveScore._submitting = true;
  
  try {
    // Use currentGameScore directly instead of parsing display
    const score = currentGameScore;
    console.log("Saving score:", score, "for player:", name); // Debug
    
    // Add new score to localStorage first (for immediate UI feedback)
    leaderboard.push({ name, score, date: new Date().toLocaleDateString() });
    
    // Sort and keep only top 10
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, 10);
    
    // Save to localStorage
    localStorage.setItem('gameLeaderboard', JSON.stringify(leaderboard));
    
    // Update display immediately (with error handling)
    try {
    displayLeaderboard();
    displayLeaderboardModal(); // Also update modal if it's open
    } catch (error) {
      console.warn('⚠️ [LEADERBOARD] Error updating leaderboard display:', error);
      // Continue anyway - don't block score saving
    }
    
    // Play success sound
    if (typeof playSuccessSound === 'function') {
      playSuccessSound();
    }
    
    // Close modal immediately after saving to localStorage
    // Don't wait for blockchain submission
    hideNameInput();
    showMainMenu();
    
    // Submit to blockchain if wallet is connected and contract is deployed
    // Do this AFTER closing the modal so user isn't blocked
    // Use currentGameStats if available, otherwise fallback to reading from window.game
    const statsToSubmit = currentGameStats || {
      score: score,
      distance: window.game?.distance || 0,
      coins: window.game?.coins || 0,
      bossesDefeated: window.game?.bossesDefeated || 0,
      enemiesDefeated: window.game?.enemiesDefeated || 0,
      longestCoinStreak: window.game?.forceField?.maxStreak || 0,
      sessionId: window.game?.sessionId || null
    };
    
    if (typeof window.submitScoreToBlockchain === 'function' && 
        window.walletAPIInstance && 
        window.walletAPIInstance.isConnected()) {
      
      console.log('📝 [BLOCKCHAIN] Submitting game stats to blockchain:', statsToSubmit);
      
      // Submit in background (don't block UI)
      window.submitScoreToBlockchain(statsToSubmit, name || '')
        .then(result => {
          if (result.success) {
            console.log('✅ [BLOCKCHAIN] Score submitted successfully!', result.digest);
            // Show success toast (optional, can be silent)
            if (typeof window.showToast === 'function') {
              window.showToast('Score saved to blockchain!', 'success');
            }
          } else {
            console.warn('⚠️ [BLOCKCHAIN] Score submission failed:', result.error);
            // Show error toast
            if (typeof window.showToast === 'function') {
              window.showToast('Failed to save score to blockchain. Your score was saved locally.', 'error');
          }
          }
        })
        .catch(error => {
          console.error('❌ [BLOCKCHAIN] Error submitting score:', error);
          // Show error toast
          if (typeof window.showToast === 'function') {
            window.showToast('Error saving score. Please try again later.', 'error');
        }
        });
    } else {
      console.log('📝 [BLOCKCHAIN] Skipping blockchain submission:', {
        hasSubmitFunction: typeof window.submitScoreToBlockchain === 'function',
        hasWalletAPI: !!window.walletAPIInstance,
        isConnected: window.walletAPIInstance?.isConnected()
      });
    }
  } finally {
    // Reset submission flag after a delay to allow for async operations
    setTimeout(() => {
      saveScore._submitting = false;
    }, 1000);
  }
}

// Skip save
function skipSave() {
  console.log('🟡 [UI FLOW] skipSave() called');
  console.trace('🟡 [UI FLOW] skipSave() stack trace');
  
  hideNameInput();
  
  // Show main menu immediately after skipping
    showMainMenu();
  
  // Submit to blockchain if wallet is connected (even when skipping name entry)
  // Use currentGameStats if available, otherwise fallback to reading from window.game
  const statsToSubmit = currentGameStats || {
    score: currentGameScore || 0,
    distance: window.game?.distance || 0,
    coins: window.game?.coins || 0,
    bossesDefeated: window.game?.bossesDefeated || 0,
    enemiesDefeated: window.game?.enemiesDefeated || 0,
    longestCoinStreak: window.game?.forceField?.maxStreak || 0,
    sessionId: window.game?.sessionId || null
  };
  
  if (typeof window.submitScoreToBlockchain === 'function' && 
      window.walletAPIInstance && 
      window.walletAPIInstance.isConnected()) {
    
    console.log('📝 [BLOCKCHAIN] Submitting game stats to blockchain (skipped name):', statsToSubmit);
    
    // Submit in background (don't block UI)
    window.submitScoreToBlockchain(statsToSubmit, '') // Empty name when skipped
      .then(result => {
        if (result.success) {
          console.log('✅ [BLOCKCHAIN] Score submitted successfully!', result.digest);
          // Show success toast (optional, can be silent)
          if (typeof window.showToast === 'function') {
            window.showToast('Score saved to blockchain!', 'success');
          }
        } else {
          console.warn('⚠️ [BLOCKCHAIN] Score submission failed:', result.error);
          // Show error toast
          if (typeof window.showToast === 'function') {
            window.showToast('Failed to save score to blockchain. Your score was saved locally.', 'error');
          }
        }
      })
      .catch(error => {
        console.error('❌ [BLOCKCHAIN] Error submitting score:', error);
        // Show error toast
        if (typeof window.showToast === 'function') {
          window.showToast('Error saving score. Please try again later.', 'error');
        }
      });
  } else {
    console.log('📝 [BLOCKCHAIN] Skipping blockchain submission (skip):', {
      hasSubmitFunction: typeof window.submitScoreToBlockchain === 'function',
      hasWalletAPI: !!window.walletAPIInstance,
      isConnected: window.walletAPIInstance?.isConnected()
    });
  }
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

// Store game stats from game over (for use in saveScore)
let currentGameStats = null;

// Function called by game on game over
function onGameOver(gameStatsOrScore) {
  // Handle both old format (just score) and new format (stats object)
  let finalScore;
  if (typeof gameStatsOrScore === 'object' && gameStatsOrScore !== null) {
    // New format: stats object
    currentGameStats = gameStatsOrScore;
    finalScore = gameStatsOrScore.score;
    console.log("🎮 [GAME OVER] Game Over - Stats object received:", gameStatsOrScore);
  } else {
    // Old format: just score (backward compatibility)
    finalScore = gameStatsOrScore;
    currentGameStats = {
      score: finalScore,
      distance: window.game?.distance || 0,
      coins: window.game?.coins || 0,
      bossesDefeated: window.game?.bossesDefeated || 0,
      enemiesDefeated: window.game?.enemiesDefeated || 0,
      longestCoinStreak: window.game?.forceField?.maxStreak || 0,
      sessionId: window.game?.sessionId || null
    };
    console.log("🎮 [GAME OVER] Game Over - Score only (legacy):", finalScore);
  }
  
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
    // Always show name input modal - all scores are tracked and submitted
    console.log('🎮 [GAME OVER] Showing name input modal for score:', finalScore);
      showNameInput(finalScore);
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

async function showLeaderboard() {
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
  
  // Get current category
  const currentCategory = leaderboardCategories[currentCategoryIndex];
  
  leaderboardContent.innerHTML = `
    <!-- Category Title -->
    <div class="leaderboard-header">
      <h2 id="leaderboardCategoryTitle">${currentCategory.icon} ${currentCategory.name}</h2>
    </div>
    
    <!-- Carousel Navigation -->
    <div class="leaderboard-carousel">
      <button class="carousel-arrow carousel-arrow-left" id="leaderboardPrevBtn" onclick="leaderboardPrevCategory()" aria-label="Previous category">
        <span class="btn-icon">←</span>
      </button>
      
      <!-- Leaderboard List Container -->
      <div class="leaderboard-list-container">
        <ul class="leaderboard-list" id="modalLeaderboardList">
          <!-- Entries will be added dynamically here -->
        </ul>
      </div>
      
      <button class="carousel-arrow carousel-arrow-right" id="leaderboardNextBtn" onclick="leaderboardNextCategory()" aria-label="Next category">
        <span class="btn-icon">→</span>
      </button>
    </div>
    
    <!-- Load More Button -->
    <div class="leaderboard-load-more-container" id="leaderboardLoadMoreContainer" style="display: none;">
      <button class="menu-btn" id="leaderboardLoadMoreBtn" onclick="loadMoreLeaderboard()">
        <span class="btn-icon">⬇️</span> Load More
      </button>
    </div>
    
    <!-- Actions -->
    <div class="leaderboard-actions">
      <button class="menu-btn" id="leaderboardRefreshBtn" onclick="refreshLeaderboard()">
        <span class="btn-icon">🔄</span> Refresh
      </button>
      <button class="menu-btn primary" onclick="hideLeaderboard()">
        <span class="btn-icon">←</span> Back to Menu
      </button>
    </div>
  `;
  
  leaderboardModal.appendChild(leaderboardContent);
  viewportContainer.appendChild(leaderboardModal);
  
  // Fetch leaderboard data from blockchain
  await fetchBlockchainLeaderboard();
  
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
  
  // Get current wallet address
  if (window.walletAPIInstance && window.walletAPIInstance.isConnected()) {
    currentWalletAddress = window.walletAPIInstance.getAddress();
  } else {
    currentWalletAddress = null;
  }
  
  // Get current category
  const currentCategory = leaderboardCategories[currentCategoryIndex];
  const primaryField = currentCategory.primaryField;
  
  // Update category title
  const titleElement = document.getElementById('leaderboardCategoryTitle');
  if (titleElement) {
    titleElement.textContent = `${currentCategory.icon} ${currentCategory.name}`;
  }
  
  // Use blockchain data
  const dataToDisplay = currentLeaderboardData;
  
  if (dataToDisplay.length === 0) {
    list.innerHTML = '';
    const li = document.createElement('li');
    li.className = 'leaderboard-item';
    li.style.textAlign = 'center';
    li.style.color = '#888';
    li.style.padding = '20px';
    li.innerHTML = '📭 No scores submitted yet!<br><span style="font-size: 0.9em;">Be the first to play and submit a score!</span>';
    list.appendChild(li);
    displayedItemsCount = 0;
    currentWalletRank = null;
    currentWalletEntry = null;
    updateLoadMoreButton();
    return;
  }
  
  // Sort by current category's primary field (descending) - sort ALL data first
  const sortedData = [...dataToDisplay].sort((a, b) => {
    const aValue = a[primaryField] || 0;
    const bValue = b[primaryField] || 0;
    return bValue - aValue;
  });
  
  // Find current wallet's rank and entry (from all sorted data)
  currentWalletRank = null;
  currentWalletEntry = null;
  if (currentWalletAddress) {
    // Find wallet's best entry for current category
    const walletEntries = sortedData.filter(entry => {
      const entryAddress = entry.walletAddress || entry.playerAddress || '';
      return entryAddress.toLowerCase() === currentWalletAddress.toLowerCase();
    });
    
    if (walletEntries.length > 0) {
      // Get the best entry for this category (first in sorted list is best)
      currentWalletEntry = walletEntries[0];
      // Find rank by finding the first entry with this value (handles ties correctly)
      const bestValue = currentWalletEntry[primaryField] || 0;
      // Find the rank - count how many entries have a better value, then add 1
      currentWalletRank = sortedData.findIndex(entry => {
        const entryValue = entry[primaryField] || 0;
        return entryValue <= bestValue; // Find first entry <= bestValue (will be the wallet's entry or a tie)
      }) + 1; // +1 because findIndex is 0-based, rank is 1-based
      
      // If multiple entries have the same value, all get the same rank (the first rank)
      // This is correct behavior for leaderboards
    }
  }
  
  // Display items up to current displayedItemsCount
  const itemsToDisplay = sortedData.slice(0, displayedItemsCount || itemsPerPage);
  
  // Clear list
  list.innerHTML = '';
  
  // Check if current wallet is in displayed items
  let walletInDisplayedList = false;
  if (currentWalletAddress && currentWalletEntry) {
    walletInDisplayedList = itemsToDisplay.some(entry => {
      const entryAddress = entry.walletAddress || entry.playerAddress || '';
      return entryAddress.toLowerCase() === currentWalletAddress.toLowerCase() &&
             entry[primaryField] === currentWalletEntry[primaryField];
    });
  }
  
  // Always show "Your Rank" section at the top if wallet has a rank
  if (currentWalletAddress && currentWalletEntry && currentWalletRank) {
    const yourRankLi = document.createElement('li');
    yourRankLi.className = 'leaderboard-item leaderboard-item-your-rank';
    
    // Different styling if wallet is already in displayed list vs not
    if (walletInDisplayedList) {
      // If already in list, use a more subtle style to avoid redundancy
      yourRankLi.style.backgroundColor = 'rgba(255, 200, 100, 0.1)';
      yourRankLi.style.borderTop = '2px solid #ffc864';
      yourRankLi.style.borderBottom = '2px solid #ffc864';
      yourRankLi.style.marginBottom = '10px';
      yourRankLi.style.paddingTop = '15px';
      yourRankLi.style.paddingBottom = '15px';
    } else {
      // If not in list, use more prominent styling
      yourRankLi.style.backgroundColor = 'rgba(255, 200, 100, 0.15)';
      yourRankLi.style.borderTop = '2px solid #ffc864';
      yourRankLi.style.borderBottom = '2px solid #ffc864';
      yourRankLi.style.marginBottom = '10px';
      yourRankLi.style.paddingTop = '15px';
      yourRankLi.style.paddingBottom = '15px';
    }
    
    const rankDiv = document.createElement('div');
    rankDiv.className = 'leaderboard-rank';
    rankDiv.textContent = currentWalletRank;
    rankDiv.style.fontWeight = 'bold';
    rankDiv.style.color = '#ffc864';
    
    const addressDiv = document.createElement('div');
    addressDiv.className = 'leaderboard-address';
    addressDiv.textContent = formatAddress(currentWalletAddress);
    addressDiv.style.fontWeight = 'bold';
    
    const nameDiv = document.createElement('div');
    nameDiv.className = 'leaderboard-name';
    nameDiv.textContent = formatPlayerName(currentWalletEntry);
    
    const statDiv = document.createElement('div');
    statDiv.className = 'leaderboard-stat';
    const statValue = currentWalletEntry[primaryField] || 0;
    statDiv.textContent = formatStatValue(statValue, primaryField);
    statDiv.style.fontWeight = 'bold';
    
    const mainFlex = document.createElement('div');
    mainFlex.className = 'leaderboard-main-flex';
    mainFlex.appendChild(rankDiv);
    mainFlex.appendChild(addressDiv);
    mainFlex.appendChild(nameDiv);
    
    const labelDiv = document.createElement('div');
    labelDiv.style.fontSize = '0.85em';
    labelDiv.style.color = '#ffc864';
    labelDiv.style.marginBottom = '5px';
    labelDiv.textContent = '👤 Your Rank';
    
    yourRankLi.appendChild(labelDiv);
    yourRankLi.appendChild(mainFlex);
    yourRankLi.appendChild(statDiv);
    
    list.appendChild(yourRankLi);
  }
  
  // Display leaderboard items
  itemsToDisplay.forEach((entry, displayIndex) => {
    const li = document.createElement('li');
    const entryAddress = entry.walletAddress || entry.playerAddress || '';
    const isCurrentWallet = currentWalletAddress && 
                            entryAddress.toLowerCase() === currentWalletAddress.toLowerCase();
    
    // Highlight current wallet
    if (isCurrentWallet) {
      li.className = 'leaderboard-item leaderboard-item-current-wallet';
      li.style.backgroundColor = 'rgba(100, 200, 255, 0.15)';
      li.style.borderLeft = '3px solid #64c8ff';
    } else {
      li.className = 'leaderboard-item';
    }
    
    // Rank (global rank in sorted data, 1-based)
    const globalRank = displayIndex + 1;
    const rankDiv = document.createElement('div');
    rankDiv.className = 'leaderboard-rank';
    rankDiv.textContent = globalRank;
    
    // Address (always shown, truncated)
    const addressDiv = document.createElement('div');
    addressDiv.className = 'leaderboard-address';
    addressDiv.textContent = formatAddress(entryAddress);
    
    // Name (shown if provided, empty if not)
    const nameDiv = document.createElement('div');
    nameDiv.className = 'leaderboard-name';
    nameDiv.textContent = formatPlayerName(entry);
    
    // Primary stat (score for current category)
    const statDiv = document.createElement('div');
    statDiv.className = 'leaderboard-stat';
    const statValue = entry[primaryField] || 0;
    statDiv.textContent = formatStatValue(statValue, primaryField);
    
    // Main flex container
    const mainFlex = document.createElement('div');
    mainFlex.className = 'leaderboard-main-flex';
    mainFlex.appendChild(rankDiv);
    mainFlex.appendChild(addressDiv);
    mainFlex.appendChild(nameDiv);
    
    li.appendChild(mainFlex);
    li.appendChild(statDiv);
    list.appendChild(li);
  });
  
  // Update displayed count
  displayedItemsCount = itemsToDisplay.length;
  
  // Update load more button
  updateLoadMoreButton(sortedData.length);
}

// Format wallet address (truncate)
function formatAddress(address) {
  if (!address || address.length < 10) return address || '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Format player name (return if provided, empty string if not)
function formatPlayerName(entry) {
  if (entry.playerName && entry.playerName.trim() !== '') {
    return entry.playerName;
  }
  return '';
}

// Format stat value based on category
function formatStatValue(value, field) {
  if (value === undefined || value === null) return '0';
  
  switch (field) {
    case 'distance':
      return `${Math.round(value).toLocaleString()}m`;
    case 'score':
    case 'coins':
    case 'bossesDefeated':
    case 'enemiesDefeated':
    case 'longestCoinStreak':
      return Math.round(value).toLocaleString();
    default:
      return value.toLocaleString();
  }
}

// Navigate to next category
function leaderboardNextCategory() {
  currentCategoryIndex = (currentCategoryIndex + 1) % leaderboardCategories.length;
  displayedItemsCount = itemsPerPage; // Reset pagination when changing category
  displayLeaderboardModal();
}

// Navigate to previous category
function leaderboardPrevCategory() {
  currentCategoryIndex = (currentCategoryIndex - 1 + leaderboardCategories.length) % leaderboardCategories.length;
  displayedItemsCount = itemsPerPage; // Reset pagination when changing category
  displayLeaderboardModal();
}

// Load more leaderboard items
function loadMoreLeaderboard() {
  displayedItemsCount += itemsPerPage;
  displayLeaderboardModal();
}

// Update load more button visibility
function updateLoadMoreButton(totalItems = 0) {
  const loadMoreContainer = document.getElementById('leaderboardLoadMoreContainer');
  const loadMoreBtn = document.getElementById('leaderboardLoadMoreBtn');
  
  if (!loadMoreContainer || !loadMoreBtn) return;
  
  // Show button if there are more items to display
  if (displayedItemsCount < totalItems) {
    loadMoreContainer.style.display = 'flex'; // Use flex to maintain centering
    loadMoreBtn.disabled = false;
    loadMoreBtn.innerHTML = `<span class="btn-icon">⬇️</span> Load More (${totalItems - displayedItemsCount} remaining)`;
  } else {
    loadMoreContainer.style.display = 'none';
  }
}

// Fetch leaderboard data from blockchain API
async function fetchBlockchainLeaderboard(limit = null) {
  // Use 200 for mock mode testing, 1000 for production
  if (limit === null) {
    const useMock = window.GAME_CONFIG?.USE_MOCK_LEADERBOARD === true || 
                    new URLSearchParams(window.location.search).get('mock') === 'true';
    limit = useMock ? 200 : 1000;
  }
  if (isLoadingLeaderboard) {
    console.log('🔄 [LEADERBOARD] Already loading, skipping duplicate request');
    return;
  }
  
  isLoadingLeaderboard = true;
  const list = document.getElementById('modalLeaderboardList');
  
  // Show loading state
  if (list) {
    list.innerHTML = '<li class="leaderboard-item" style="text-align: center; color: #888; padding: 20px;"><span class="btn-icon">⏳</span> Loading leaderboard...</li>';
  }
  
  try {
    // Get API base URL (from config or default)
    const API_BASE_URL = window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3000/api';
    
    // Check for mock mode (for testing)
    const useMock = window.GAME_CONFIG?.USE_MOCK_LEADERBOARD === true || 
                    new URLSearchParams(window.location.search).get('mock') === 'true';
    const mockParam = useMock ? '&mock=true' : '';
    
    console.log(`📤 [LEADERBOARD] Fetching leaderboard from: ${API_BASE_URL}/leaderboard?limit=${limit}${mockParam ? ' (MOCK MODE)' : ''}`);
    
    const response = await fetch(`${API_BASE_URL}/leaderboard?limit=${limit}${mockParam}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `HTTP error! status: ${response.status}` }));
      throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    // Log network info for verification
    if (result.network) {
      console.log(`🌐 [LEADERBOARD] Backend network: ${result.network}${result.chainId ? ` (Chain ID: ${result.chainId})` : ''}`);
      if (result.network !== 'testnet') {
        console.warn(`⚠️ [LEADERBOARD] WARNING: Backend is using ${result.network}, not testnet!`);
      }
    }
    
    if (result.leaderboard && Array.isArray(result.leaderboard)) {
      currentLeaderboardData = result.leaderboard;
      console.log(`✅ [LEADERBOARD] Loaded ${currentLeaderboardData.length} entries from blockchain`);
      
      // Reset pagination when fetching new data
      displayedItemsCount = itemsPerPage;
      
      // Update display
      displayLeaderboardModal();
    } else {
      console.warn('⚠️ [LEADERBOARD] Invalid response format:', result);
      // Clear data and show empty state
      currentLeaderboardData = [];
      displayLeaderboardModal();
    }
  } catch (error) {
    console.error('❌ [LEADERBOARD] Error fetching leaderboard:', error);
    
    // Determine error type
    const isConnectionError = error.message.includes('Failed to fetch') || 
                               error.message.includes('NetworkError') ||
                               error.message.includes('Network request failed') ||
                               error.message.includes('fetch');
    
    // Show appropriate error message
    if (list) {
      if (isConnectionError) {
        list.innerHTML = `
          <li class="leaderboard-item" style="text-align: center; color: #ff6b6b; padding: 20px;">
            <div style="font-size: 1.2em; margin-bottom: 10px;">🔌 Unable to connect to blockchain</div>
            <div style="font-size: 0.9em; margin-top: 10px; color: #888;">Please check your connection and try again.</div>
            <div style="font-size: 0.8em; margin-top: 10px; color: #666;">You can click the refresh button to retry.</div>
          </li>
        `;
      } else {
        list.innerHTML = `
          <li class="leaderboard-item" style="text-align: center; color: #ff6b6b; padding: 20px;">
            <div style="font-size: 1.2em; margin-bottom: 10px;">⚠️ Failed to load leaderboard</div>
            <div style="font-size: 0.9em; margin-top: 10px; color: #888;">${error.message || 'Unknown error'}</div>
            <div style="font-size: 0.8em; margin-top: 10px; color: #666;">You can click the refresh button to retry.</div>
          </li>
        `;
      }
    }
    
    // Clear data on error
    currentLeaderboardData = [];
  } finally {
    isLoadingLeaderboard = false;
  }
}

// Refresh leaderboard (fetch from blockchain)
async function refreshLeaderboard() {
  console.log('🔄 [LEADERBOARD] Refreshing leaderboard...');
  
  const refreshBtn = document.getElementById('leaderboardRefreshBtn');
  if (refreshBtn) {
    const originalText = refreshBtn.innerHTML;
    refreshBtn.innerHTML = '<span class="btn-icon">⏳</span> Loading...';
    refreshBtn.disabled = true;
    
    try {
      await fetchBlockchainLeaderboard();
    } finally {
      // Reset button state
      refreshBtn.innerHTML = originalText;
      refreshBtn.disabled = false;
    }
  } else {
    // If button not found, just fetch directly
    await fetchBlockchainLeaderboard();
  }
}

// Make functions globally accessible for onclick handlers
if (typeof window !== 'undefined') {
  window.leaderboardNextCategory = leaderboardNextCategory;
  window.leaderboardPrevCategory = leaderboardPrevCategory;
  window.refreshLeaderboard = refreshLeaderboard;
  window.fetchBlockchainLeaderboard = fetchBlockchainLeaderboard;
  window.loadMoreLeaderboard = loadMoreLeaderboard;
}
