// ==========================================
// TOURNAMENT MODAL - Tournament Display and Entry
// ==========================================

// Use FrontendLogger if available, fallback to console
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

log.info('TOURNAMENT MODAL', 'Tournament modal module loaded');

// Tournament category display info
// Use var to allow redeclaration when multiple scripts are loaded in the same global scope
var TOURNAMENT_CATEGORIES = window.TOURNAMENT_CATEGORIES || {
  totalCoins: { name: 'Total Coins', icon: '🪙', description: 'Most coins collected' },
  longestStreak: { name: 'Longest Streak', icon: '🔥', description: 'Longest coin streak' },
  highestScore: { name: 'Highest Score', icon: '⭐', description: 'Highest game score' },
  longestDistance: { name: 'Longest Distance', icon: '📏', description: 'Farthest distance traveled' },
  mostBosses: { name: 'Most Bosses', icon: '👹', description: 'Most bosses defeated' },
  mostEnemies: { name: 'Most Enemies', icon: '💀', description: 'Most enemies defeated' },
};
// Expose to window for sharing between modules
if (typeof window !== 'undefined') {
  window.TOURNAMENT_CATEGORIES = TOURNAMENT_CATEGORIES;
}

/**
 * Show tournament modal
 */
async function showTournaments() {
  log.debug('TOURNAMENT MODAL', 'showTournaments() called');
  
  // Close game if it's running (hide game container, stop game loop, etc.)
  if (typeof window.GameService !== 'undefined' && typeof window.GameService.closeGame === 'function') {
    log.debug('TOURNAMENT MODAL', 'Closing game before showing tournament modal');
    window.GameService.closeGame();
  } else {
    // Fallback: manually hide game container
    const gameContainer = document.querySelector('.game-container');
    if (gameContainer) {
      gameContainer.classList.add('game-container-hidden');
      gameContainer.classList.remove('game-container-visible');
      log.debug('TOURNAMENT MODAL', 'Game container hidden (fallback)');
    }
    
    // Stop game loop
    const gameState = typeof window !== 'undefined' && window.gameState ? window.gameState : null;
    if (gameState) {
      gameState.gameRunning = false;
      gameState.gameOver = false;
    }
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
  
  // Create tournament modal
  const viewportContainer = document.querySelector('.viewport-container');
  if (!viewportContainer) {
    console.error('❌ [TOURNAMENT MODAL] Viewport container not found!');
    return;
  }
  
  // Remove existing tournament modal if present
  const existingModal = document.getElementById('tournamentModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  const tournamentModal = document.createElement('div');
  tournamentModal.className = 'tournament-modal tournament-modal-visible';
  tournamentModal.setAttribute('id', 'tournamentModal');
  
  const tournamentContent = document.createElement('div');
  tournamentContent.className = 'tournament';
  
  tournamentContent.innerHTML = `
    <!-- Tournament Header -->
    <div class="tournament-header">
      <h2>🏆 Tournaments</h2>
      <!-- Wallet Connection Section -->
      <div class="tournament-wallet-section" id="tournamentWalletSection">
        <div class="tournament-wallet-connect" id="tournamentWalletConnect" style="display: none;">
          <button class="menu-btn primary" onclick="connectWalletForTournaments()">
            <span class="btn-icon">🔗</span> Connect Wallet
          </button>
        </div>
        <div class="tournament-wallet-connected" id="tournamentWalletConnected" style="display: none;">
          <div class="tournament-wallet-info">
            <span class="tournament-wallet-address" id="tournamentWalletAddress"></span>
            <button class="menu-btn small" onclick="disconnectWalletForTournaments()" title="Disconnect">
              <span class="btn-icon">✕</span>
            </button>
          </div>
          <div class="tournament-tickets-display" id="tournamentTicketsDisplay" style="display: none;">
            <span class="tournament-tickets-label">🎫 Tickets:</span>
            <span class="tournament-tickets-value" id="tournamentTicketsValue">0</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Tournament Tabs -->
    <div class="tournament-tabs" id="tournamentTabs">
      <button class="tournament-tab active" onclick="switchTournamentTab('active')" id="tournamentTabActive">Active</button>
      <button class="tournament-tab" onclick="switchTournamentTab('my')" id="tournamentTabMy">My Tournaments</button>
      <button class="tournament-tab" onclick="switchTournamentTab('past')" id="tournamentTabPast">Past</button>
    </div>
    
    <!-- Active Tournaments Tab Content -->
    <div class="tournament-tab-content active" id="tournamentTabContentActive">
      <div class="tournament-loading" id="tournamentLoadingActive">
        <p>Loading tournaments...</p>
      </div>
      <div class="tournament-list" id="tournamentListActive" style="display: none;">
        <!-- Tournament cards will be added here -->
      </div>
      <div class="tournament-empty" id="tournamentEmptyActive" style="display: none;">
        <p>No active tournaments at the moment.</p>
      </div>
    </div>
    
    <!-- My Tournaments Tab Content -->
    <div class="tournament-tab-content" id="tournamentTabContentMy" style="display: none;">
      <div class="tournament-loading" id="tournamentLoadingMy">
        <p>Loading your tournaments...</p>
      </div>
      <div class="tournament-list" id="tournamentListMy" style="display: none;">
        <!-- Tournament cards will be added here -->
      </div>
      <div class="tournament-empty" id="tournamentEmptyMy" style="display: none;">
        <p>You haven't entered any tournaments yet.</p>
      </div>
    </div>
    
    <!-- Past Tournaments Tab Content -->
    <div class="tournament-tab-content" id="tournamentTabContentPast" style="display: none;">
      <div class="tournament-loading" id="tournamentLoadingPast">
        <p>Loading past tournaments...</p>
      </div>
      <div class="tournament-list" id="tournamentListPast" style="display: none;">
        <!-- Tournament cards will be added here -->
      </div>
      <div class="tournament-empty" id="tournamentEmptyPast" style="display: none;">
        <p>No past tournaments available.</p>
      </div>
    </div>
    
    <!-- Actions -->
    <div class="tournament-actions">
      <button class="menu-btn" id="tournamentRefreshBtn" onclick="refreshTournaments()">
        <span class="btn-icon">🔄</span> Refresh
      </button>
      <button class="menu-btn primary" id="tournamentCreateBtn" onclick="handleCreateTournamentClick()" style="background: #4CAF50;">
        <span class="btn-icon">➕</span> Create Tournament
      </button>
      <button class="menu-btn primary" onclick="hideTournaments()">
        <span class="btn-icon">←</span> Back to Menu
      </button>
    </div>
  `;
  
  tournamentModal.appendChild(tournamentContent);
  viewportContainer.appendChild(tournamentModal);
  
  // Attach event listener to Create Tournament button as fallback
  const createBtn = document.getElementById('tournamentCreateBtn');
  if (createBtn) {
    createBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      handleCreateTournamentClick();
    });
  }
  
  // Update wallet connection UI
  updateTournamentWalletUI();
  
  // Load active tournaments
  await loadActiveTournaments();
  
  // Restart menu music if background music is enabled (tournament menu should have menu music)
  if (typeof startMenuMusic === 'function' && typeof gameSettings !== 'undefined' && gameSettings.backgroundMusic) {
    startMenuMusic();
  }
}

// Assign to window immediately after function declaration to prevent race conditions
if (typeof window !== 'undefined') {
  window.showTournaments = showTournaments;
  
  // Handle Create Tournament button click
  window.handleCreateTournamentClick = function() {
    if (typeof showTournamentCreation === 'function') {
      showTournamentCreation();
    } else {
      log.warn('TOURNAMENT MODAL', 'showTournamentCreation not available');
      alert('Tournament creation is loading. Please try again in a moment.');
    }
  };
}

/**
 * Update wallet connection UI in tournament modal
 */
function updateTournamentWalletUI() {
  const walletConnectEl = document.getElementById('tournamentWalletConnect');
  const walletConnectedEl = document.getElementById('tournamentWalletConnected');
  const walletAddressEl = document.getElementById('tournamentWalletAddress');
  const ticketsDisplayEl = document.getElementById('tournamentTicketsDisplay');
  const ticketsValueEl = document.getElementById('tournamentTicketsValue');
  
  if (!walletConnectEl || !walletConnectedEl || !walletAddressEl) {
    return;
  }
  
  // Get wallet address
  const walletAddress = getWalletAddressForTournaments();
  
  if (walletAddress) {
    // Wallet connected
    walletConnectEl.style.display = 'none';
    walletConnectedEl.style.display = 'block';
    
    // Format and display address
    if (window.walletAPIInstance && typeof window.walletAPIInstance.formatAddress === 'function') {
      walletAddressEl.textContent = window.walletAPIInstance.formatAddress(walletAddress);
    } else {
      // Fallback: show first 6 and last 4 characters
      walletAddressEl.textContent = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
    }
    
    // Load and display ticket count
    loadTournamentTicketCount(walletAddress);
  } else {
    // Wallet not connected
    walletConnectEl.style.display = 'block';
    walletConnectedEl.style.display = 'none';
    if (ticketsDisplayEl) {
      ticketsDisplayEl.style.display = 'none';
    }
  }
}

/**
 * Load and display ticket count for tournaments
 * Uses cached data from GamePassDisplay or GamePassService to avoid redundant API calls
 */
async function loadTournamentTicketCount(walletAddress) {
  const ticketsDisplayEl = document.getElementById('tournamentTicketsDisplay');
  const ticketsValueEl = document.getElementById('tournamentTicketsValue');
  
  if (!ticketsDisplayEl || !ticketsValueEl || !walletAddress) {
    return;
  }
  
  try {
    let ticketCount = null;
    
    // Priority 1: Try to get from GamePassDisplay cache (most efficient, no API call)
    if (window.GamePassDisplay && typeof window.GamePassDisplay.getStatus === 'function') {
      const cachedStatus = window.GamePassDisplay.getStatus();
      if (cachedStatus && cachedStatus.tickets !== undefined) {
        ticketCount = cachedStatus.tickets;
        log.debug('TOURNAMENT MODAL', 'Using cached ticket count from GamePassDisplay', { ticketCount });
      }
    }
    
    // Priority 2: Try to get from GamePassService cache (has 30s TTL, may avoid API call)
    if (ticketCount === null && window.GamePassService && typeof window.GamePassService.getGamePassStatus === 'function') {
      try {
        const status = await window.GamePassService.getGamePassStatus(walletAddress, false); // Use cache if available
        if (status.success && status.ticketCount !== undefined) {
          ticketCount = status.ticketCount;
          log.debug('TOURNAMENT MODAL', 'Using ticket count from GamePassService', { ticketCount, fromCache: true });
        }
      } catch (serviceError) {
        log.warn('TOURNAMENT MODAL', 'GamePassService.getGamePassStatus failed, will try direct API', serviceError);
      }
    }
    
    // Priority 3: Fallback to direct API call (only if cache is unavailable)
    if (ticketCount === null) {
      log.debug('TOURNAMENT MODAL', 'Cache unavailable, making direct API call for ticket count');
      const API_BASE_URL = window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3000/api';
      const response = await fetch(`${API_BASE_URL}/game-pass/${walletAddress}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load game pass: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.ticketCount !== undefined) {
        ticketCount = result.ticketCount;
        log.debug('TOURNAMENT MODAL', 'Got ticket count from direct API call', { ticketCount });
      } else {
        throw new Error(result.error || 'Failed to get ticket count from API');
      }
    }
    
    // Update UI with ticket count
    if (ticketCount !== null && ticketCount !== undefined) {
      ticketsValueEl.textContent = ticketCount.toLocaleString();
      ticketsDisplayEl.style.display = 'flex';
    } else {
      ticketsDisplayEl.style.display = 'none';
    }
  } catch (error) {
    log.error('TOURNAMENT MODAL', 'Error loading ticket count', error);
    // Don't hide the display on error - show 0 or keep previous value
    // This prevents flickering when rate limited
    if (ticketsValueEl) {
      ticketsValueEl.textContent = '0';
    }
    ticketsDisplayEl.style.display = 'none';
  }
}

/**
 * Connect wallet for tournaments
 */
async function connectWalletForTournaments() {
  log.debug('TOURNAMENT MODAL', 'Connecting wallet for tournaments');
  
  if (typeof handleConnectWallet === 'function') {
    await handleConnectWallet();
    // Update UI after connection
    updateTournamentWalletUI();
    // Refresh tournaments to get player-specific data
    await refreshTournaments();
  } else {
    alert('Wallet connection not available. Please connect your wallet from the main menu.');
  }
}

/**
 * Disconnect wallet for tournaments
 */
function disconnectWalletForTournaments() {
  log.debug('TOURNAMENT MODAL', 'Disconnecting wallet for tournaments');
  
  if (typeof handleDisconnectWallet === 'function') {
    handleDisconnectWallet();
    // Update UI after disconnection
    updateTournamentWalletUI();
    // Refresh tournaments to remove player-specific data
    refreshTournaments();
  } else {
    alert('Wallet disconnection not available.');
  }
}

/**
 * Switch tournament tab
 */
function switchTournamentTab(tabName) {
  log.debug('TOURNAMENT MODAL', `Switching to tab: ${tabName}`);
  
  // Update tab buttons
  const tabs = ['active', 'my', 'past'];
  tabs.forEach(tab => {
    const tabBtn = document.getElementById(`tournamentTab${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
    const tabContent = document.getElementById(`tournamentTabContent${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
    
    if (tabBtn) {
      if (tab === tabName) {
        tabBtn.classList.add('active');
      } else {
        tabBtn.classList.remove('active');
      }
    }
    
    if (tabContent) {
      if (tab === tabName) {
        tabContent.style.display = 'block';
        tabContent.classList.add('active');
      } else {
        tabContent.style.display = 'none';
        tabContent.classList.remove('active');
      }
    }
  });
  
  // Load data for selected tab
  if (tabName === 'active') {
    loadActiveTournaments();
  } else if (tabName === 'my') {
    loadMyTournaments();
  } else if (tabName === 'past') {
    loadPastTournaments();
  }
}

/**
 * Get wallet address for tournament queries
 */
function getWalletAddressForTournaments() {
  if (typeof window !== 'undefined' && window.getWalletAddress && typeof window.getWalletAddress === 'function') {
    return window.getWalletAddress();
  } else if (window.walletAPIInstance && window.walletAPIInstance.isConnected()) {
    return window.walletAPIInstance.getAddress();
  }
  return null;
}

/**
 * Load active tournaments
 */
async function loadActiveTournaments() {
  log.debug('TOURNAMENT MODAL', 'Loading active tournaments');
  
  const loadingEl = document.getElementById('tournamentLoadingActive');
  const listEl = document.getElementById('tournamentListActive');
  const emptyEl = document.getElementById('tournamentEmptyActive');
  
  if (!loadingEl || !listEl || !emptyEl) {
    log.error('TOURNAMENT MODAL', 'Tournament elements not found');
    return;
  }
  
  loadingEl.style.display = 'block';
  listEl.style.display = 'none';
  emptyEl.style.display = 'none';
  
  try {
    const API_BASE_URL = window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3000/api';
    
    // Get wallet address if available
    const walletAddress = getWalletAddressForTournaments();
    const url = walletAddress 
      ? `${API_BASE_URL}/tournaments?playerAddress=${encodeURIComponent(walletAddress)}`
      : `${API_BASE_URL}/tournaments`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to load tournaments: ${response.status}`);
    }
    
    const result = await response.json();
    
    loadingEl.style.display = 'none';
    
    if (!result.success || !result.tournaments || result.tournaments.length === 0) {
      emptyEl.style.display = 'block';
      return;
    }
    
    listEl.innerHTML = '';
    result.tournaments.forEach(tournament => {
      const card = createTournamentCard(tournament, result.playerTicketCount);
      listEl.appendChild(card);
    });
    
    listEl.style.display = 'grid';
    
    // Update wallet UI after loading tournaments (in case ticket count changed)
    updateTournamentWalletUI();
  } catch (error) {
    log.error('TOURNAMENT MODAL', 'Error loading tournaments', error);
    loadingEl.style.display = 'none';
    emptyEl.style.display = 'block';
    emptyEl.innerHTML = `<p>Error loading tournaments: ${error.message}</p>`;
  }
}

/**
 * Load my tournaments
 */
async function loadMyTournaments() {
  log.debug('TOURNAMENT MODAL', 'Loading my tournaments');
  
  const loadingEl = document.getElementById('tournamentLoadingMy');
  const listEl = document.getElementById('tournamentListMy');
  const emptyEl = document.getElementById('tournamentEmptyMy');
  
  if (!loadingEl || !listEl || !emptyEl) {
    return;
  }
  
  loadingEl.style.display = 'block';
  listEl.style.display = 'none';
  emptyEl.style.display = 'none';
  
  // Get wallet address
  let walletAddress = null;
  if (typeof getWalletAddress === 'function') {
    walletAddress = getWalletAddress();
  } else if (window.walletAPIInstance && window.walletAPIInstance.isConnected()) {
    walletAddress = window.walletAPIInstance.getAddress();
  }
  
  if (!walletAddress) {
    loadingEl.style.display = 'none';
    emptyEl.style.display = 'block';
    emptyEl.innerHTML = '<p>Please connect your wallet to view your tournaments.</p>';
    return;
  }
  
  try {
    const API_BASE_URL = window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3000/api';
    const url = `${API_BASE_URL}/tournaments/my-tournaments?playerAddress=${encodeURIComponent(walletAddress)}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to load my tournaments: ${response.status}`);
    }
    
    const result = await response.json();
    
    loadingEl.style.display = 'none';
    
    if (!result.success || !result.tournaments || result.tournaments.length === 0) {
      emptyEl.style.display = 'block';
      return;
    }
    
    listEl.innerHTML = '';
    result.tournaments.forEach(tournament => {
      const card = createTournamentCard(tournament, result.playerTicketCount);
      listEl.appendChild(card);
    });
    
    listEl.style.display = 'grid';
    
    // Update wallet UI after loading tournaments (in case ticket count changed)
    updateTournamentWalletUI();
  } catch (error) {
    log.error('TOURNAMENT MODAL', 'Error loading my tournaments', error);
    loadingEl.style.display = 'none';
    emptyEl.style.display = 'block';
    emptyEl.innerHTML = `<p>Error loading your tournaments: ${error.message}</p>`;
  }
}

/**
 * Load past tournaments
 */
async function loadPastTournaments() {
  log.debug('TOURNAMENT MODAL', 'Loading past tournaments');
  
  const loadingEl = document.getElementById('tournamentLoadingPast');
  const listEl = document.getElementById('tournamentListPast');
  const emptyEl = document.getElementById('tournamentEmptyPast');
  
  if (!loadingEl || !listEl || !emptyEl) {
    return;
  }
  
  loadingEl.style.display = 'block';
  listEl.style.display = 'none';
  emptyEl.style.display = 'none';
  
  try {
    const API_BASE_URL = window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3000/api';
    
    // Get wallet address if available (optional for past tournaments)
    const walletAddress = getWalletAddressForTournaments();
    const url = walletAddress 
      ? `${API_BASE_URL}/tournaments/past?playerAddress=${encodeURIComponent(walletAddress)}`
      : `${API_BASE_URL}/tournaments/past`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to load past tournaments: ${response.status}`);
    }
    
    const result = await response.json();
    
    loadingEl.style.display = 'none';
    
    if (!result.success || !result.tournaments || result.tournaments.length === 0) {
      emptyEl.style.display = 'block';
      return;
    }
    
    listEl.innerHTML = '';
    result.tournaments.forEach(tournament => {
      const card = createTournamentCard(tournament, result.playerTicketCount);
      listEl.appendChild(card);
    });
    
    listEl.style.display = 'grid';
    
    // Update wallet UI after loading tournaments (in case ticket count changed)
    if (walletAddress) {
      updateTournamentWalletUI();
    }
  } catch (error) {
    log.error('TOURNAMENT MODAL', 'Error loading past tournaments', error);
    loadingEl.style.display = 'none';
    emptyEl.style.display = 'block';
    emptyEl.innerHTML = `<p>Error loading past tournaments: ${error.message}</p>`;
  }
}

/**
 * Format timestamp to readable date/time
 */
function formatDateTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format time remaining or time until start
 */
function formatTimeRemaining(tournament) {
  const now = Date.now();
  const startTime = tournament.startTime;
  const endTime = tournament.endTime;
  
  if (tournament.status === 'upcoming') {
    const timeUntilStart = startTime - now;
    if (timeUntilStart < 0) return 'Starting soon...';
    
    const days = Math.floor(timeUntilStart / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeUntilStart % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeUntilStart % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return `Starts in ${days} day${days !== 1 ? 's' : ''} ${hours} hour${hours !== 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `Starts in ${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else {
      return `Starts in ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
  } else if (tournament.status === 'active') {
    const timeRemaining = endTime - now;
    if (timeRemaining < 0) return 'Ending soon...';
    
    const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return `${days} day${days !== 1 ? 's' : ''} ${hours} hour${hours !== 1 ? 's' : ''} remaining`;
    } else if (hours > 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''} remaining`;
    } else {
      return `${minutes} minute${minutes !== 1 ? 's' : ''} remaining`;
    }
  } else {
    return 'Ended';
  }
}

/**
 * Create tournament card element
 */
function createTournamentCard(tournament, playerTicketCount = null) {
  const category = TOURNAMENT_CATEGORIES[tournament.category] || TOURNAMENT_CATEGORIES.highestScore;
  const prizePoolUSD = (tournament.prizePoolUSDCents / 100).toFixed(2);
  const timeInfo = formatTimeRemaining(tournament);
  const playerData = tournament.playerData || null;
  
  // Map item IDs to user-friendly names
  const itemNameMap = {
    'orbLevel': 'Orb Level',
    'forceField': 'Force Field',
    'extraLives': 'Extra Lives',
    'slowTime': 'Slow Time',
    'coinTractorBeam': 'Coin Tractor',
    'destroyAll': 'Destroy All',
    'bossKillShot': 'Boss Kill Shot',
    'random': 'Random L1 Item', // Resolved at distribution time
  };
  
  /**
   * Get items that have 3 levels (exclude special items)
   */
  function getRandomizableItems() {
    // Items with 3 levels: orbLevel, forceField, extraLives, slowTime, coinTractorBeam
    return ['orbLevel', 'forceField', 'extraLives', 'slowTime', 'coinTractorBeam'];
  }

  /**
   * Generate default reward config for display purposes
   * Based on the default reward system: ranks 1-10 get items, top 3 also get tokens
   */
  function getDefaultRewardConfig() {
    // Use the documented default reward structure
    // "random" is resolved at distribution time, not at display time
    const itemRewards = {
      1: [
        { itemId: 'destroyAll', level: 1, quantity: 1 },
        { itemId: 'bossKillShot', level: 1, quantity: 1 },
        { itemId: 'random', level: 1, quantity: 1 },
      ],
      2: [
        { itemId: 'bossKillShot', level: 1, quantity: 1 },
        { itemId: 'random', level: 1, quantity: 1 },
      ],
      3: [
        { itemId: 'destroyAll', level: 1, quantity: 1 },
        { itemId: 'random', level: 1, quantity: 1 },
      ],
      4: [{ itemId: 'random', level: 1, quantity: 1 }],
      5: [{ itemId: 'random', level: 1, quantity: 1 }],
      6: [{ itemId: 'random', level: 1, quantity: 1 }],
      7: [{ itemId: 'random', level: 1, quantity: 1 }],
      8: [{ itemId: 'random', level: 1, quantity: 1 }],
      9: [{ itemId: 'random', level: 1, quantity: 1 }],
      10: [{ itemId: 'random', level: 1, quantity: 1 }],
    };
    
    return {
      rewardDepth: 10,
      poolDepth: 3,
      poolDistribution: [50, 30, 20],
      itemRewards
    };
  }

  /**
   * Render tournament rewards section (handles both default and custom rewards)
   */
  function renderTournamentRewards(tournament) {
    // Get reward config (custom or default)
    let rewardConfig = tournament.rewardConfig;
    const isDefault = !rewardConfig || !rewardConfig.itemRewards || Object.keys(rewardConfig.itemRewards).length === 0;
    
    if (isDefault) {
      rewardConfig = getDefaultRewardConfig();
    }
    
    if (!rewardConfig || !rewardConfig.itemRewards || Object.keys(rewardConfig.itemRewards).length === 0) {
      return '';
    }

    return `
      <div class="tournament-rewards-section">
        <div class="tournament-rewards-header">
          <span class="tournament-rewards-label">🎁 Rewards</span>
          ${isDefault ? '<span class="tournament-rewards-default-badge">Default</span>' : '<span class="tournament-rewards-custom-badge">Custom</span>'}
        </div>
        <div class="tournament-rewards-list">
          ${Object.entries(rewardConfig.itemRewards)
            .sort(([rankA], [rankB]) => Number(rankA) - Number(rankB))
            .map(([rank, items]) => `
              <div class="tournament-reward-row">
                <span class="tournament-reward-rank-label">#${rank}</span>
                <div class="tournament-reward-items">
                  ${Array.isArray(items) ? items.map((item, idx) => `
                    <span class="tournament-reward-item" title="${getItemDisplayName(item.itemId)} Level ${item.level} x${item.quantity}">
                      <span class="tournament-reward-item-name">${getItemDisplayName(item.itemId)}</span>
                      ${item.level ? `<span class="tournament-reward-item-level">Lv${item.level}</span>` : ''}
                      ${item.quantity > 1 ? `<span class="tournament-reward-item-quantity">×${item.quantity}</span>` : ''}
                    </span>
                  `).join('') : ''}
                </div>
              </div>
            `).join('')}
        </div>
        ${rewardConfig.rewardDepth ? `
          <div class="tournament-rewards-info">
            <span class="tournament-rewards-info-text">
              Top ${rewardConfig.rewardDepth} players receive item rewards
              ${rewardConfig.poolDepth ? ` • Top ${rewardConfig.poolDepth} players receive token rewards` : ''}
            </span>
          </div>
        ` : ''}
      </div>
    `;
  }

  function getItemDisplayName(itemId) {
    return itemNameMap[itemId] || itemId;
  }
  
  // Format score based on category
  function formatScore(value, category) {
    if (!value || value === 0) return '0';
    switch (category) {
      case 'totalCoins':
      case 'highestScore':
      case 'longestDistance':
      case 'mostBosses':
      case 'mostEnemies':
        return value.toLocaleString();
      case 'longestStreak':
        return value.toString();
      default:
        return value.toLocaleString();
    }
  }
  
  const card = document.createElement('div');
  card.className = 'tournament-card tournament-card-condensed';
  card.setAttribute('data-tournament-id', tournament.objectId);
  card.innerHTML = `
    <div class="tournament-card-condensed-view">
      <div class="tournament-card-condensed-header">
        <div class="tournament-card-condensed-title">
          <span class="tournament-card-icon">${category.icon}</span>
          <h4>${tournament.name}</h4>
        </div>
        <span class="tournament-status tournament-status-${tournament.status}">${tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}</span>
      </div>
      <div class="tournament-card-condensed-info">
        <div class="tournament-card-condensed-prize">$${prizePoolUSD}</div>
        <div class="tournament-card-condensed-stats">
          <div class="tournament-card-condensed-participants">${tournament.participants} players</div>
          ${playerData && playerData.hasEntered ? `
            <div class="tournament-card-condensed-rank">Rank: #${playerData.rank || '?'}</div>
          ` : ''}
        </div>
      </div>
      <div class="tournament-card-expand-hint">Click to expand</div>
    </div>
    <div class="tournament-card-expanded-view" style="display: none;">
      <div class="tournament-card-expand-controls">
        <button class="tournament-card-shrink-btn" onclick="shrinkTournamentCard('${tournament.objectId}')" title="Shrink card">
          <span>−</span>
        </button>
      </div>
      <div class="tournament-card-header">
        <div class="tournament-card-title">
          <h3>${category.icon} ${tournament.name}</h3>
          <span class="tournament-id">#${tournament.tournamentId}</span>
        </div>
        <span class="tournament-status tournament-status-${tournament.status}">${tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}</span>
      </div>
      <div class="tournament-card-body">
      <div class="tournament-info">
        <div class="tournament-info-row">
          <div class="tournament-info-item">
            <span class="tournament-info-label">Category:</span>
            <span class="tournament-info-value">${category.icon} ${category.name}</span>
          </div>
          <div class="tournament-info-item">
            <span class="tournament-info-label">Entry Fee:</span>
            <span class="tournament-info-value">${tournament.entryFeeTickets} ticket${tournament.entryFeeTickets !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div class="tournament-info-row">
          <div class="tournament-info-item">
            <span class="tournament-info-label">Prize Pool:</span>
            <span class="tournament-info-value prize-pool">$${prizePoolUSD}</span>
          </div>
          <div class="tournament-info-item">
            <span class="tournament-info-label">Participants:</span>
            <span class="tournament-info-value">${tournament.participants}</span>
          </div>
        </div>
        ${playerData ? `
          <div class="tournament-player-info">
            <div class="tournament-player-header">
              <span class="tournament-player-label">👤 Your Status</span>
            </div>
            <div class="tournament-player-row">
              <div class="tournament-player-item">
                <span class="tournament-player-label-small">Tickets:</span>
                <span class="tournament-player-value ${playerData.hasEnoughTickets ? 'tournament-player-value-success' : 'tournament-player-value-warning'}">
                  ${playerTicketCount !== null ? playerTicketCount : '?'} / ${tournament.entryFeeTickets}
                </span>
              </div>
              ${playerData.hasEntered ? `
                <div class="tournament-player-item">
                  <span class="tournament-player-label-small">Rank:</span>
                  <span class="tournament-player-value tournament-player-value-rank">
                    ${playerData.rank ? `#${playerData.rank}` : 'Unranked'} / ${playerData.totalParticipants}
                  </span>
                </div>
                <div class="tournament-player-item">
                  <span class="tournament-player-label-small">Score:</span>
                  <span class="tournament-player-value tournament-player-value-score">
                    ${formatScore(playerData.score, tournament.category)}
                  </span>
                </div>
              ` : `
                <div class="tournament-player-item">
                  <span class="tournament-player-label-small">Status:</span>
                  <span class="tournament-player-value tournament-player-value-not-entered">Not Entered</span>
                </div>
              `}
            </div>
          </div>
        ` : ''}
        <div class="tournament-time-info">
          <div class="tournament-time-item">
            <span class="tournament-time-label">${tournament.status === 'upcoming' ? 'Starts:' : tournament.status === 'active' ? 'Started:' : 'Started:'}</span>
            <span class="tournament-time-value">${formatDateTime(tournament.startTime)}</span>
          </div>
          <div class="tournament-time-item">
            <span class="tournament-time-label">${tournament.status === 'upcoming' ? 'Ends:' : tournament.status === 'active' ? 'Ends:' : 'Ended:'}</span>
            <span class="tournament-time-value">${formatDateTime(tournament.endTime)}</span>
          </div>
          ${timeInfo ? `
            <div class="tournament-time-remaining">
              <span class="tournament-time-remaining-label">${tournament.status === 'upcoming' ? '⏰' : tournament.status === 'active' ? '⏳' : ''}</span>
              <span class="tournament-time-remaining-value">${timeInfo}</span>
            </div>
          ` : ''}
        </div>
        ${renderTournamentRewards(tournament)}
      </div>
      <div class="tournament-actions-card">
        <button class="menu-btn" onclick="viewTournamentLeaderboard('${tournament.objectId}')">
          <span class="btn-icon">🏆</span> View Leaderboard
        </button>
        ${tournament.status === 'active' || tournament.status === 'upcoming' ? `
          ${playerData && !playerData.hasEnoughTickets ? `
            <button class="menu-btn primary" onclick="openTicketShop()" title="Purchase tournament tickets">
              <span class="btn-icon">🛒</span> Purchase Ticket
            </button>
          ` : `
            <div class="tournament-action-buttons">
              <button class="menu-btn primary" 
                      onclick="startTournamentGame('${tournament.objectId}')"
                      title="${playerData && playerData.hasEntered ? 'Play another game for this tournament' : 'Enter and start playing'}">
                <span class="btn-icon">🎫</span> ${playerData && playerData.hasEntered ? 'Play Again' : tournament.status === 'upcoming' ? 'Enter (Upcoming)' : 'Enter Tournament'}
              </button>
              <button class="menu-btn secondary tournament-test-btn" 
                      onclick="startTournamentGameTest('${tournament.objectId}')"
                      title="Start tournament game in test mode (bypasses balance requirement)">
                <span class="btn-icon">🧪</span> Test
              </button>
            </div>
          `}
        ` : ''}
      </div>
      </div>
    </div>
  `;
  
  // Add click handler to expand card (only for condensed view)
  const condensedView = card.querySelector('.tournament-card-condensed-view');
  if (condensedView) {
    condensedView.addEventListener('click', function(e) {
      // Don't expand if clicking on buttons or links
      if (e.target.closest('button') || e.target.closest('a')) {
        return;
      }
      expandTournamentCard(tournament.objectId);
    });
  }
  
  return card;
}

/**
 * View tournament leaderboard
 */
async function viewTournamentLeaderboard(tournamentObjectId) {
  log.debug('TOURNAMENT MODAL', `Viewing tournament leaderboard: ${tournamentObjectId}`);
  console.log('🏆 [FRONTEND] Requesting tournament leaderboard', {
    tournamentObjectId,
    timestamp: new Date().toISOString(),
  });
  
  try {
    const API_BASE_URL = window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3000/api';
    const url = `${API_BASE_URL}/tournaments/${tournamentObjectId}/leaderboard?limit=100`;
    console.log('🏆 [FRONTEND] Fetching leaderboard from URL', { url });
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('🏆 [FRONTEND] Leaderboard API error response', {
        tournamentObjectId,
        status: response.status,
        statusText: response.statusText,
        errorText,
      });
      throw new Error(`Failed to load leaderboard: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    console.log('🏆 [FRONTEND] Leaderboard API response received', {
      tournamentObjectId,
      success: result.success,
      tournamentId: result.tournament?.tournamentId,
      tournamentName: result.tournament?.name,
      leaderboardEntries: result.leaderboard?.length || 0,
      limit: result.limit,
      leaderboard: result.leaderboard?.map((e, i) => ({
        rank: e.rank,
        playerAddress: e.playerAddress,
        playerName: e.playerName || '(no name)',
        value: e.value,
        displayValue: e.displayValue,
      })) || [],
    });
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to load leaderboard');
    }
    
    showTournamentLeaderboardModal(result.tournament, result.leaderboard || []);
    
    console.log('🏆 [FRONTEND] Leaderboard modal displayed', {
      tournamentObjectId,
      tournamentName: result.tournament?.name,
      entriesDisplayed: result.leaderboard?.length || 0,
    });
  } catch (error) {
    console.error('🏆 [FRONTEND] Error loading leaderboard', {
      tournamentObjectId,
      error: error.message,
      errorStack: error.stack,
    });
    log.error('TOURNAMENT MODAL', 'Error loading leaderboard', error);
    alert(`Failed to load leaderboard: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Show tournament leaderboard modal
 */
function showTournamentLeaderboardModal(tournament, leaderboard) {
  const viewportContainer = document.querySelector('.viewport-container');
  if (!viewportContainer) {
    log.error('TOURNAMENT MODAL', 'Viewport container not found');
    return;
  }
  
  // Remove existing leaderboard modal if present
  const existingModal = document.getElementById('tournamentLeaderboardModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  const category = TOURNAMENT_CATEGORIES[tournament.category] || { name: tournament.category, icon: '🏆', description: '' };
  
  const modal = document.createElement('div');
  modal.className = 'tournament-leaderboard-modal tournament-leaderboard-modal-visible';
  modal.setAttribute('id', 'tournamentLeaderboardModal');
  
  // Format score helper (local to this function)
  function formatScoreForLeaderboard(value, category) {
    if (!value || value === 0) return '0';
    switch (category) {
      case 'totalCoins':
      case 'highestScore':
      case 'longestDistance':
      case 'mostBosses':
      case 'mostEnemies':
        return value.toLocaleString();
      case 'longestStreak':
        return value.toString();
      default:
        return value.toLocaleString();
    }
  }
  
  // Format leaderboard entries
  const leaderboardRows = leaderboard.length > 0
    ? leaderboard.map((entry, index) => {
        const rank = entry.rank || (index + 1);
        const displayValue = entry.displayValue || formatScoreForLeaderboard(entry.value, tournament.category);
        const address = entry.playerAddress || '';
        const formattedAddress = address.length > 10 
          ? `${address.slice(0, 6)}...${address.slice(-4)}`
          : address;
        const playerName = entry.playerName && entry.playerName.trim() !== '' 
          ? entry.playerName.trim() 
          : '';
        
        return `
          <tr class="tournament-leaderboard-row">
            <td class="tournament-leaderboard-rank">#${rank}</td>
            <td class="tournament-leaderboard-address">
              ${playerName ? `<span class="tournament-leaderboard-name">${playerName}</span><span class="tournament-leaderboard-separator"> • </span><span class="tournament-leaderboard-address-small">${formattedAddress}</span>` : formattedAddress}
            </td>
            <td class="tournament-leaderboard-score">${displayValue}</td>
          </tr>
        `;
      }).join('')
    : '<tr><td colspan="3" class="tournament-leaderboard-empty">No scores yet. Be the first to submit a score!</td></tr>';
  
  modal.innerHTML = `
    <div class="tournament-leaderboard-content">
      <div class="tournament-leaderboard-header">
        <h2>🏆 ${tournament.name}</h2>
        <button class="tournament-leaderboard-close" onclick="closeTournamentLeaderboard()">
          <span>✕</span>
        </button>
      </div>
      
      <div class="tournament-leaderboard-info">
        <div class="tournament-leaderboard-info-item">
          <span class="tournament-leaderboard-info-label">Category:</span>
          <span class="tournament-leaderboard-info-value">${category.icon} ${category.name}</span>
        </div>
        <div class="tournament-leaderboard-info-item">
          <span class="tournament-leaderboard-info-label">Participants:</span>
          <span class="tournament-leaderboard-info-value">${tournament.participants || leaderboard.length}</span>
        </div>
        <div class="tournament-leaderboard-info-item">
          <span class="tournament-leaderboard-info-label">Prize Pool:</span>
          <span class="tournament-leaderboard-info-value">$${(tournament.prizePoolUSDCents / 100).toFixed(2)}</span>
        </div>
      </div>
      
      <div class="tournament-leaderboard-table-container">
        <table class="tournament-leaderboard-table">
          <thead>
            <tr>
              <th class="tournament-leaderboard-th-rank">Rank</th>
              <th class="tournament-leaderboard-th-address">Player</th>
              <th class="tournament-leaderboard-th-score">${category.name}</th>
            </tr>
          </thead>
          <tbody>
            ${leaderboardRows}
          </tbody>
        </table>
      </div>
      
      <div class="tournament-leaderboard-actions">
        <button class="menu-btn" onclick="closeTournamentLeaderboard()">
          <span class="btn-icon">←</span> Close
        </button>
      </div>
    </div>
  `;
  
  viewportContainer.appendChild(modal);
}

/**
 * Expand tournament card to show full details
 */
function expandTournamentCard(tournamentObjectId) {
  const card = document.querySelector(`[data-tournament-id="${tournamentObjectId}"]`);
  if (!card) return;
  
  card.classList.remove('tournament-card-condensed');
  card.classList.add('tournament-card-expanded');
  
  const condensedView = card.querySelector('.tournament-card-condensed-view');
  const expandedView = card.querySelector('.tournament-card-expanded-view');
  
  if (condensedView) condensedView.style.display = 'none';
  if (expandedView) expandedView.style.display = 'block';
}

/**
 * Shrink tournament card back to condensed view
 */
function shrinkTournamentCard(tournamentObjectId) {
  const card = document.querySelector(`[data-tournament-id="${tournamentObjectId}"]`);
  if (!card) return;
  
  card.classList.remove('tournament-card-expanded');
  card.classList.add('tournament-card-condensed');
  
  const condensedView = card.querySelector('.tournament-card-condensed-view');
  const expandedView = card.querySelector('.tournament-card-expanded-view');
  
  if (condensedView) condensedView.style.display = 'block';
  if (expandedView) expandedView.style.display = 'none';
}

/**
 * Close tournament leaderboard modal
 */
function closeTournamentLeaderboard() {
  const modal = document.getElementById('tournamentLeaderboardModal');
  if (modal) {
    modal.classList.remove('tournament-leaderboard-modal-visible');
    modal.classList.add('tournament-leaderboard-modal-hidden');
    setTimeout(() => {
      modal.remove();
    }, 300);
  }
}

// Export functions to window for onclick handlers
if (typeof window !== 'undefined') {
  window.viewTournamentLeaderboard = viewTournamentLeaderboard;
  window.closeTournamentLeaderboard = closeTournamentLeaderboard;
  window.expandTournamentCard = expandTournamentCard;
  window.shrinkTournamentCard = shrinkTournamentCard;
}

/**
 * Open ticket shop (store modal with tickets tab)
 */
function openTicketShop() {
  log.debug('TOURNAMENT MODAL', 'Opening ticket shop');
  
  // Hide tournament modal
  hideTournaments();
  
  // Open store modal (if available)
  if (typeof showStore === 'function') {
    showStore('tickets'); // Open to tickets tab
  } else if (typeof StoreService !== 'undefined' && StoreService.show) {
    StoreService.show('tickets');
  } else {
    alert('Store not available. Please purchase tickets from the main menu.');
  }
}

/**
 * Start tournament game in test mode (bypasses balance check)
 * Checks for multiple active tournaments and shows selection if needed
 */
async function startTournamentGameTest(tournamentObjectId = null) {
  log.debug('TOURNAMENT MODAL', `Starting tournament game (test mode): ${tournamentObjectId || 'selection needed'}`);
  
  // Get wallet address
  let walletAddress = null;
  if (typeof getWalletAddress === 'function') {
    walletAddress = getWalletAddress();
  } else if (window.walletAPIInstance && window.walletAPIInstance.isConnected()) {
    walletAddress = window.walletAPIInstance.getAddress();
  }
  
  if (!walletAddress) {
    alert('Please connect your wallet to enter tournaments.');
    return;
  }
  
  try {
    const API_BASE_URL = window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3000/api';
    
    // If tournamentObjectId not provided, check for multiple active tournaments
    if (!tournamentObjectId) {
      const tournamentsResponse = await fetch(`${API_BASE_URL}/tournaments?playerAddress=${encodeURIComponent(walletAddress)}`);
      
      if (!tournamentsResponse.ok) {
        throw new Error('Failed to load tournaments');
      }
      
      const tournamentsResult = await tournamentsResponse.json();
      
      if (!tournamentsResult.success || !tournamentsResult.tournaments) {
        throw new Error('No tournaments available');
      }
      
      // Filter to active tournaments
      const activeTournaments = tournamentsResult.tournaments.filter(t => 
        (t.status === 'active' || t.status === 'upcoming')
      );
      
      if (activeTournaments.length === 0) {
        alert('No active tournaments available.');
        return;
      }
      
      if (activeTournaments.length === 1) {
        // Only one tournament, use it
        tournamentObjectId = activeTournaments[0].objectId;
      } else {
        // Multiple tournaments - show selection UI
        tournamentObjectId = await showTournamentSelection(activeTournaments);
        if (!tournamentObjectId) {
          // User cancelled selection
          return;
        }
      }
    }
    
    // Get tournament details
    const tournamentResponse = await fetch(`${API_BASE_URL}/tournaments/${tournamentObjectId}`);
    
    if (!tournamentResponse.ok) {
      throw new Error('Failed to load tournament details');
    }
    
    const tournamentResult = await tournamentResponse.json();
    
    if (!tournamentResult.success || !tournamentResult.tournament) {
      throw new Error('Tournament not found');
    }
    
    const tournament = tournamentResult.tournament;
    
    // Check if tournament is still active (or within grace period)
    const now = Date.now();
    const gracePeriodEnd = tournament.endTime + (60 * 60 * 1000); // 1 hour grace period
    if (now > gracePeriodEnd) {
      alert('This tournament has ended. Score submission is no longer available.');
      return;
    }
    
    // Don't hide tournament modal completely - keep it in background so we can return to it
    // Just hide it visually so the game can start, but don't show main menu
    const tournamentModal = document.getElementById('tournamentModal');
    if (tournamentModal) {
      tournamentModal.classList.remove('tournament-modal-visible');
      tournamentModal.classList.add('tournament-modal-hidden');
      // Don't remove from DOM - we'll return to it after game ends
    }
    
    // Ensure main menu is hidden (don't show it when starting tournament game)
    const mainMenu = document.getElementById('mainMenuOverlay');
    if (mainMenu) {
      mainMenu.classList.remove('main-menu-overlay-visible');
      mainMenu.classList.add('main-menu-overlay-hidden');
    }
    
    // Start game with tournament context (test mode)
    // Ensure GameService is available and initialized
    if (!window.GameService) {
      log.error('TOURNAMENT MODAL', 'GameService not available on window object');
      alert('Game service not loaded. Please refresh the page and try again.');
      return;
    }
    
    // Initialize if needed
    if (typeof window.GameService.init === 'function' && !window.GameService._initialized) {
      log.debug('TOURNAMENT MODAL', 'Initializing GameService before tournament test start');
      await window.GameService.init();
    }
    
    if (typeof window.GameService.startTournamentGameTest === 'function') {
      await window.GameService.startTournamentGameTest(tournament);
    } else {
      // Fallback: use regular startTournamentGame
      log.error('TOURNAMENT MODAL', 'GameService.startTournamentGameTest not available', {
        hasGameService: !!window.GameService,
        hasMethod: window.GameService ? typeof window.GameService.startTournamentGameTest : 'N/A',
        gameServiceKeys: window.GameService ? Object.keys(window.GameService).slice(0, 20) : [],
        hasStartTournamentGame: window.GameService ? typeof window.GameService.startTournamentGame : 'N/A',
      });
      // Try regular startTournamentGame as fallback
      await startTournamentGame(tournamentObjectId);
    }
  } catch (error) {
    log.error('TOURNAMENT MODAL', 'Error starting tournament game (test mode)', error);
    alert(`Error starting tournament game: ${error.message}`);
  }
}

/**
 * Start tournament game (matches credit game flow)
 * Checks for multiple active tournaments and shows selection if needed
 */
async function startTournamentGame(tournamentObjectId = null) {
  log.debug('TOURNAMENT MODAL', `Starting tournament game: ${tournamentObjectId || 'selection needed'}`);
  
  // Get wallet address
  let walletAddress = null;
  if (typeof getWalletAddress === 'function') {
    walletAddress = getWalletAddress();
  } else if (window.walletAPIInstance && window.walletAPIInstance.isConnected()) {
    walletAddress = window.walletAPIInstance.getAddress();
  }
  
  if (!walletAddress) {
    alert('Please connect your wallet to enter tournaments.');
    return;
  }
  
  try {
    const API_BASE_URL = window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3000/api';
    
    // If tournamentObjectId not provided, check for multiple active tournaments
    if (!tournamentObjectId) {
      const tournamentsResponse = await fetch(`${API_BASE_URL}/tournaments?playerAddress=${encodeURIComponent(walletAddress)}`);
      
      if (!tournamentsResponse.ok) {
        throw new Error('Failed to load tournaments');
      }
      
      const tournamentsResult = await tournamentsResponse.json();
      
      if (!tournamentsResult.success || !tournamentsResult.tournaments) {
        throw new Error('No tournaments available');
      }
      
      // Filter to active tournaments where player has entered
      const activeEnteredTournaments = tournamentsResult.tournaments.filter(t => 
        (t.status === 'active' || t.status === 'upcoming') && 
        t.playerData && 
        t.playerData.hasEntered
      );
      
      if (activeEnteredTournaments.length === 0) {
        alert('You are not entered in any active tournaments.');
        return;
      }
      
      if (activeEnteredTournaments.length === 1) {
        // Only one tournament, use it
        tournamentObjectId = activeEnteredTournaments[0].objectId;
      } else {
        // Multiple tournaments - show selection UI
        tournamentObjectId = await showTournamentSelection(activeEnteredTournaments);
        if (!tournamentObjectId) {
          // User cancelled selection
          return;
        }
      }
    }
    
    // Get tournament details
    const tournamentResponse = await fetch(`${API_BASE_URL}/tournaments/${tournamentObjectId}`);
    
    if (!tournamentResponse.ok) {
      throw new Error('Failed to load tournament details');
    }
    
    const tournamentResult = await tournamentResponse.json();
    
    if (!tournamentResult.success || !tournamentResult.tournament) {
      throw new Error('Tournament not found');
    }
    
    const tournament = tournamentResult.tournament;
    
    // Check if tournament is still active (or within grace period)
    const now = Date.now();
    const gracePeriodEnd = tournament.endTime + (60 * 60 * 1000); // 1 hour grace period
    if (now > gracePeriodEnd) {
      alert('This tournament has ended. Score submission is no longer available.');
      return;
    }
    
    // Don't hide tournament modal completely - keep it in background so we can return to it
    // Just hide it visually so the game can start, but don't show main menu
    const tournamentModal = document.getElementById('tournamentModal');
    if (tournamentModal) {
      tournamentModal.classList.remove('tournament-modal-visible');
      tournamentModal.classList.add('tournament-modal-hidden');
      // Don't remove from DOM - we'll return to it after game ends
    }
    
    // Ensure main menu is hidden (don't show it when starting tournament game)
    const mainMenu = document.getElementById('mainMenuOverlay');
    if (mainMenu) {
      mainMenu.classList.remove('main-menu-overlay-visible');
      mainMenu.classList.add('main-menu-overlay-hidden');
    }
    
    // Start game with tournament context
    // Ensure GameService is available and initialized
    if (!window.GameService) {
      log.error('TOURNAMENT MODAL', 'GameService not available on window object');
      alert('Game service not loaded. Please refresh the page and try again.');
      return;
    }
    
    // Initialize if needed
    if (typeof window.GameService.init === 'function' && !window.GameService._initialized) {
      log.debug('TOURNAMENT MODAL', 'Initializing GameService before tournament start');
      await window.GameService.init();
    }
    
    if (typeof window.GameService.startTournamentGame === 'function') {
      await window.GameService.startTournamentGame(tournament);
    } else {
      // Fallback: use regular startGame with tournament context
      log.error('TOURNAMENT MODAL', 'GameService.startTournamentGame not available', {
        hasGameService: !!window.GameService,
        hasMethod: window.GameService ? typeof window.GameService.startTournamentGame : 'N/A',
        gameServiceKeys: window.GameService ? Object.keys(window.GameService).slice(0, 20) : [],
        hasStartGame: window.GameService ? typeof window.GameService.startGame : 'N/A',
      });
      alert('Tournament game start not available. Please refresh the page and try again.');
      // Restore tournament modal visibility
      if (tournamentModal) {
        tournamentModal.classList.remove('tournament-modal-hidden');
        tournamentModal.classList.add('tournament-modal-visible');
      }
    }
  } catch (error) {
    log.error('TOURNAMENT MODAL', 'Error starting tournament game', error);
    alert(`Error starting tournament game: ${error.message}`);
    // Restore tournament modal visibility on error
    const tournamentModal = document.getElementById('tournamentModal');
    if (tournamentModal) {
      tournamentModal.classList.remove('tournament-modal-hidden');
      tournamentModal.classList.add('tournament-modal-visible');
    }
  }
}

/**
 * Show tournament selection UI when player has multiple active tournaments
 * @param {Array} tournaments - Array of tournament objects
 * @returns {Promise<string|null>} Selected tournament objectId or null if cancelled
 */
function showTournamentSelection(tournaments) {
  return new Promise((resolve) => {
    log.debug('TOURNAMENT MODAL', 'Showing tournament selection', tournaments.length);
    
    const viewportContainer = document.querySelector('.viewport-container');
    if (!viewportContainer) {
      log.error('TOURNAMENT MODAL', 'Viewport container not found');
      resolve(null);
      return;
    }
    
    // Create selection modal
    const modal = document.createElement('div');
    modal.className = 'tournament-selection-modal tournament-modal-visible';
    modal.setAttribute('id', 'tournamentSelectionModal');
    
    const category = TOURNAMENT_CATEGORIES;
    
    modal.innerHTML = `
      <div class="tournament-selection-content">
        <div class="tournament-selection-header">
          <h2>🏆 Select Tournament</h2>
          <p class="tournament-selection-subtitle">You are entered in multiple active tournaments. Choose which one to play:</p>
        </div>
        
        <div class="tournament-selection-list">
          ${tournaments.map(tournament => {
            const cat = category[tournament.category] || category.highestScore;
            return `
              <div class="tournament-selection-card" onclick="selectTournamentForGame('${tournament.objectId}')">
                <div class="tournament-selection-card-header">
                  <h3>${cat.icon} ${tournament.name}</h3>
                  <span class="tournament-selection-status tournament-selection-status-${tournament.status}">
                    ${tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}
                  </span>
                </div>
                <div class="tournament-selection-card-body">
                  <div class="tournament-selection-info">
                    <span class="tournament-selection-category">${cat.icon} ${cat.name}</span>
                    ${tournament.playerData && tournament.playerData.rank ? `
                      <span class="tournament-selection-rank">Rank: #${tournament.playerData.rank}</span>
                    ` : ''}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        
        <div class="tournament-selection-actions">
          <button class="menu-btn" onclick="cancelTournamentSelection()">
            <span class="btn-icon">←</span> Cancel
          </button>
        </div>
      </div>
    `;
    
    viewportContainer.appendChild(modal);
    
    // Store resolve function
    window._tournamentSelectionResolve = resolve;
  });
}

/**
 * Select tournament for game
 */
function selectTournamentForGame(tournamentObjectId) {
  if (window._tournamentSelectionResolve) {
    window._tournamentSelectionResolve(tournamentObjectId);
    window._tournamentSelectionResolve = null;
  }
  
  // Remove selection modal
  const modal = document.getElementById('tournamentSelectionModal');
  if (modal) {
    modal.remove();
  }
  
  // Start game with selected tournament
  startTournamentGame(tournamentObjectId);
}

/**
 * Cancel tournament selection
 */
function cancelTournamentSelection() {
  if (window._tournamentSelectionResolve) {
    window._tournamentSelectionResolve(null);
    window._tournamentSelectionResolve = null;
  }
  
  // Remove selection modal
  const modal = document.getElementById('tournamentSelectionModal');
  if (modal) {
    modal.remove();
  }
}

/**
 * Enter tournament (legacy function - kept for backward compatibility)
 * @deprecated Use startTournamentGame() instead
 */
async function enterTournament(tournamentObjectId) {
  log.warn('TOURNAMENT MODAL', 'enterTournament() is deprecated, use startTournamentGame() instead');
  await startTournamentGame(tournamentObjectId);
}

/**
 * Refresh tournaments
 */
async function refreshTournaments() {
  log.debug('TOURNAMENT MODAL', 'Refreshing tournaments');
  
  const activeTab = document.querySelector('.tournament-tab.active');
  if (activeTab) {
    const tabName = activeTab.id.replace('tournamentTab', '').toLowerCase();
    switchTournamentTab(tabName);
  } else {
    await loadActiveTournaments();
  }
}

/**
 * View tournament details
 * @param {string|number} tournamentId - The tournament ID to view
 */
function viewTournamentDetails(tournamentId) {
  log.debug('TOURNAMENT MODAL', 'viewTournamentDetails called', { tournamentId });
  
  // Find the tournament in cached data and show details
  const tournament = cachedActiveTournaments?.find(t => t.id === tournamentId || t.tournamentId === tournamentId);
  if (tournament) {
    log.info('TOURNAMENT MODAL', 'Showing details for tournament', { name: tournament.name, id: tournamentId });
    // For now, switch to the appropriate tab where the tournament is listed
    // Future: could show a detailed view modal
    showTournaments();
  } else {
    log.warn('TOURNAMENT MODAL', 'Tournament not found in cache', { tournamentId });
  }
}

/**
 * Hide tournament modal
 * @param {boolean} showMainMenuAfter - Whether to show main menu after hiding (default: true)
 */
function hideTournaments(showMainMenuAfter = true) {
  const tournamentModal = document.getElementById('tournamentModal');
  if (tournamentModal) {
    tournamentModal.classList.remove('tournament-modal-visible');
    tournamentModal.classList.add('tournament-modal-hidden');
    
    if (showMainMenuAfter) {
      // Only remove from DOM if we're showing main menu
      setTimeout(() => {
        tournamentModal.remove();
      }, 300);
    }
    // If not showing main menu, keep modal in DOM for later return
  }
  
  // Show main menu only if requested
  if (showMainMenuAfter) {
    if (typeof MenuService !== 'undefined' && MenuService.show) {
      MenuService.show();
    } else {
      const mainMenu = document.getElementById('mainMenuOverlay');
      if (mainMenu) {
        mainMenu.classList.add('main-menu-overlay-visible');
        mainMenu.classList.remove('main-menu-overlay-hidden');
      }
    }
  }
}

// Make functions globally available
// Use safety check and ensure immediate assignment to prevent race conditions
if (typeof window !== 'undefined') {
  // Assign immediately to prevent race conditions with button clicks
window.showTournaments = showTournaments;
window.hideTournaments = hideTournaments;
window.switchTournamentTab = switchTournamentTab;
window.viewTournamentDetails = viewTournamentDetails;
window.enterTournament = enterTournament; // Deprecated, but kept for backward compatibility
window.startTournamentGame = startTournamentGame;
window.startTournamentGameTest = startTournamentGameTest;
window.openTicketShop = openTicketShop;
window.selectTournamentForGame = selectTournamentForGame;
window.cancelTournamentSelection = cancelTournamentSelection;
window.refreshTournaments = refreshTournaments;
  
  log.debug('TOURNAMENT MODAL', 'Global functions exposed to window object');
}
window.connectWalletForTournaments = connectWalletForTournaments;
window.disconnectWalletForTournaments = disconnectWalletForTournaments;

// Listen for wallet connection/disconnection events
if (typeof window !== 'undefined') {
  // Hook into existing wallet event handlers
  const originalOnWalletConnected = window.onWalletConnected;
  const originalOnWalletDisconnected = window.onWalletDisconnected;
  
  // Wrap existing handlers to also update tournament UI
  window.onWalletConnected = function(address) {
    if (originalOnWalletConnected) {
      originalOnWalletConnected(address);
    }
    // Update tournament wallet UI if modal is open
    const tournamentModal = document.getElementById('tournamentModal');
    if (tournamentModal && tournamentModal.classList.contains('tournament-modal-visible')) {
      updateTournamentWalletUI();
      refreshTournaments();
    }
  };
  
  window.onWalletDisconnected = function() {
    if (originalOnWalletDisconnected) {
      originalOnWalletDisconnected();
    }
    // Update tournament wallet UI if modal is open
    const tournamentModal = document.getElementById('tournamentModal');
    if (tournamentModal && tournamentModal.classList.contains('tournament-modal-visible')) {
      updateTournamentWalletUI();
      refreshTournaments();
    }
  };
}

