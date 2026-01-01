// ==========================================
// LEADERBOARD MODAL - Modal Creation and Display
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

log.info('LEADERBOARD MODAL', 'Leaderboard modal module loaded');

/**
 * Show leaderboard modal
 */
async function showLeaderboard() {
  log.debug('LEADERBOARD MODAL', 'showLeaderboard() called');
  
  if (!window.LeaderboardService) {
    log.warn('LEADERBOARD MODAL', 'LeaderboardService not available');
    return;
  }
  
  // Hide main menu
  if (typeof MenuService !== 'undefined' && MenuService.hide) {
    MenuService.hide();
  } else {
    const mainMenu = document.getElementById('mainMenuOverlay');
    if (mainMenu) {
      mainMenu.classList.add('main-menu-overlay-hidden');
      mainMenu.classList.remove('main-menu-overlay-visible');
    }
  }
  
  // Create leaderboard modal using dedicated leaderboard-modal class
  // Append to viewport-container like other panels (settings, instructions, sound-test)
  const viewportContainer = document.querySelector('.viewport-container');
  if (!viewportContainer) {
    console.error('❌ [LEADERBOARD MODAL] Viewport container not found!');
    return;
  }
  
  const leaderboardModal = document.createElement('div');
  leaderboardModal.className = 'leaderboard-modal leaderboard-modal-visible';
  leaderboardModal.setAttribute('id', 'leaderboardModal');
  
  const leaderboardContent = document.createElement('div');
  leaderboardContent.className = 'leaderboard';
  
  // Get current category
  const currentCategory = window.LeaderboardService.getCurrentCategory();
  
  leaderboardContent.innerHTML = `
    <!-- Main Header (shows "Leaderboard" or "Milestones") -->
    <div class="leaderboard-header">
      <h2 id="leaderboardMainTitle">🏆 Leaderboard</h2>
    </div>
    
    <!-- Carousel Navigation -->
    <div class="leaderboard-carousel">
      <button class="carousel-arrow carousel-arrow-left" id="leaderboardPrevBtn" onclick="leaderboardPrevCategory()" aria-label="Previous category">
        <span class="btn-icon">←</span>
      </button>
      
      <!-- Leaderboard List Container -->
      <div class="leaderboard-list-container">
        <!-- Category Title (displayed above the list) -->
        <div class="leaderboard-category-title" id="leaderboardCategoryTitle">
          <h3>${currentCategory.icon} ${currentCategory.name}</h3>
        </div>
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
  
  // Add milestone progress tabs to leaderboard
  if (typeof addMilestoneProgressToLeaderboard === 'function') {
    addMilestoneProgressToLeaderboard();
  }
  
  // Update badge counts after modal is set up (force refresh to get latest count)
  if (typeof updateLeaderboardClaimBadge === 'function') {
    setTimeout(async () => {
      await updateLeaderboardClaimBadge(null, true);
    }, 100);
  }
  
  // Setup click-outside handler to close leaderboard
  const handleClickOutside = (event) => {
    // Only process if leaderboard modal is actually visible
    if (!leaderboardModal.classList.contains('leaderboard-modal-visible')) {
      return; // Modal is not visible, ignore this event
    }
    
    // Don't close if click is on achievement popup (user is claiming rewards)
    const achievementPopup = document.getElementById('achievementPopup');
    if (achievementPopup && achievementPopup.contains(event.target)) {
      log.debug('🟠 [LEADERBOARD MODAL] Click was on achievement popup - not closing leaderboard');
      return;
    }
    
    // Check if click is outside the modal
    if (!leaderboardModal.contains(event.target)) {
      log.debug('🟠 [LEADERBOARD MODAL] Click was outside leaderboard modal - closing');
      hideLeaderboard();
      document.removeEventListener('click', handleClickOutside);
    }
  };
  
  // Use setTimeout to avoid immediate firing
  setTimeout(() => {
    log.debug('🟠 [LEADERBOARD MODAL] Adding click outside listener');
    document.addEventListener('click', handleClickOutside);
  }, 0);
  
  // Show loading modal while fetching leaderboard
  if (typeof showLoadingModal === 'function') {
    showLoadingModal('Loading leaderboard... Please wait', 'leaderboardLoadingModal');
  }
  
  try {
    // Fetch leaderboard data from blockchain
    if (typeof window.fetchBlockchainLeaderboard === 'function') {
      await window.fetchBlockchainLeaderboard();
    }
    
    // Display leaderboard in modal
    if (typeof displayLeaderboardModal === 'function') {
      displayLeaderboardModal();
    }
  } finally {
    // Hide loading modal when leaderboard is loaded
    if (typeof hideLoadingModal === 'function') {
      hideLoadingModal('leaderboardLoadingModal');
    }
    
    // Update badge counts after leaderboard is fully loaded (force refresh to get latest count)
    if (typeof updateLeaderboardClaimBadge === 'function') {
      setTimeout(async () => {
        await updateLeaderboardClaimBadge(null, true);
      }, 200);
    }
  }
}

/**
 * Hide leaderboard modal
 */
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
  
  // Show main menu again after closing leaderboard
  if (typeof MenuService !== 'undefined' && MenuService.show) {
    MenuService.show();
  } else {
    // Fallback: manual show
    const mainMenu = document.getElementById('mainMenuOverlay');
    if (mainMenu) {
      mainMenu.classList.add('main-menu-overlay-visible');
      mainMenu.classList.remove('main-menu-overlay-hidden');
    }
  }
}

/**
 * Display leaderboard modal content
 */
function displayLeaderboardModal() {
  if (!window.LeaderboardService) {
    log.warn('LEADERBOARD MODAL', 'LeaderboardService not available');
    return;
  }
  
  const list = document.getElementById('modalLeaderboardList');
  if (!list) return;
  
  const state = window.LeaderboardService.getState();
  
  // Get current wallet address
  if (window.walletAPIInstance && window.walletAPIInstance.isConnected()) {
    window.LeaderboardService.setWalletAddress(window.walletAPIInstance.getAddress());
  } else {
    window.LeaderboardService.setWalletAddress(null);
  }
  
  // Get current category
  const currentCategory = window.LeaderboardService.getCurrentCategory();
  const primaryField = currentCategory.primaryField;
  
  // Update category title (above the list)
  const categoryTitleElement = document.getElementById('leaderboardCategoryTitle');
  if (categoryTitleElement) {
    const h3 = categoryTitleElement.querySelector('h3');
    if (h3) {
      h3.textContent = `${currentCategory.icon} ${currentCategory.name}`;
    } else {
      categoryTitleElement.innerHTML = `<h3>${currentCategory.icon} ${currentCategory.name}</h3>`;
    }
  }
  
  // Use blockchain data
  const dataToDisplay = state.currentLeaderboardData;
  
  if (dataToDisplay.length === 0) {
    list.innerHTML = '';
    const li = document.createElement('li');
    li.className = 'leaderboard-item';
    li.style.textAlign = 'center';
    li.style.color = '#888';
    li.style.padding = '20px';
    li.innerHTML = '📭 No scores submitted yet!<br><span style="font-size: 0.9em;">Be the first to play and submit a score!</span>';
    list.appendChild(li);
    window.LeaderboardService.setWalletRank(null, null);
    if (typeof window.updateLoadMoreButton === 'function') {
      window.updateLoadMoreButton();
    }
    return;
  }
  
  // Sort by current category's primary field (descending) - sort ALL data first
  const sortedData = [...dataToDisplay].sort((a, b) => {
    const aValue = a[primaryField] || 0;
    const bValue = b[primaryField] || 0;
    return bValue - aValue;
  });
  
  // Find current wallet's rank and entry (from all sorted data)
  let currentWalletRank = null;
  let currentWalletEntry = null;
  const currentWalletAddress = state.currentWalletAddress;
  
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
  
  // Store wallet rank and entry in service
  window.LeaderboardService.setWalletRank(currentWalletRank, currentWalletEntry);
  
  // Display items up to current displayedItemsCount
  const itemsToDisplay = sortedData.slice(0, state.displayedItemsCount || state.itemsPerPage);
  
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
    addressDiv.textContent = window.formatAddress ? window.formatAddress(currentWalletAddress) : currentWalletAddress;
    addressDiv.style.fontWeight = 'bold';
    
    const nameDiv = document.createElement('div');
    nameDiv.className = 'leaderboard-name';
    nameDiv.textContent = window.formatPlayerName ? window.formatPlayerName(currentWalletEntry) : '';
    
    const statDiv = document.createElement('div');
    statDiv.className = 'leaderboard-stat';
    const statValue = currentWalletEntry[primaryField] || 0;
    statDiv.textContent = window.formatStatValue ? window.formatStatValue(statValue, primaryField) : statValue;
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
    addressDiv.textContent = window.formatAddress ? window.formatAddress(entryAddress) : entryAddress;
    
    // Name (shown if provided, empty if not)
    const nameDiv = document.createElement('div');
    nameDiv.className = 'leaderboard-name';
    nameDiv.textContent = window.formatPlayerName ? window.formatPlayerName(entry) : '';
    
    // Primary stat (score for current category)
    const statDiv = document.createElement('div');
    statDiv.className = 'leaderboard-stat';
    const statValue = entry[primaryField] || 0;
    statDiv.textContent = window.formatStatValue ? window.formatStatValue(statValue, primaryField) : statValue;
    
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
  
  // Update load more button
  if (typeof window.updateLoadMoreButton === 'function') {
    window.updateLoadMoreButton(sortedData.length);
  }
}

// Expose globally
if (typeof window !== 'undefined') {
  window.showLeaderboard = showLeaderboard;
  window.hideLeaderboard = hideLeaderboard;
  window.displayLeaderboardModal = displayLeaderboardModal;
}

