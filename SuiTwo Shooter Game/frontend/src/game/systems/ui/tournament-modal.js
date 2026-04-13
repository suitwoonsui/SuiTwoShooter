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
    
    <div class="tournament-main-split">
      <div class="tournament-main-column">
        <!-- Active Tournaments Tab Content -->
        <div class="tournament-tab-content active" id="tournamentTabContentActive">
          <div class="tournament-active-filter" id="tournamentActiveFilter">
            <button type="button" class="tournament-filter-btn active" data-status="all" aria-pressed="true">All</button>
            <button type="button" class="tournament-filter-btn" data-status="upcoming" aria-pressed="false">Upcoming</button>
            <button type="button" class="tournament-filter-btn" data-status="active" aria-pressed="false">Active</button>
          </div>
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
      </div>
      <aside class="tournament-details-aside" aria-label="Tournament details">
        <div class="tournament-details-sticky">
          <h3 class="tournament-details-heading">Details</h3>
          <div id="tournamentDetailsPanel" class="tournament-details-panel-inner">
            <p class="tournament-details-placeholder">Select a tournament to see details.</p>
          </div>
        </div>
      </aside>
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

  // Filter buttons (All / Upcoming / Active) for the Active tab
  const filterContainer = document.getElementById('tournamentActiveFilter');
  if (filterContainer) {
    filterContainer.addEventListener('click', function(e) {
      const btn = e.target && e.target.closest('.tournament-filter-btn');
      if (!btn) return;
      filterContainer.querySelectorAll('.tournament-filter-btn').forEach(function(b) {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      loadActiveTournaments();
    });
  }

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

  // Optional warm for My tab; merged list is ensured inside loadActiveTournaments (await + dedupe).
  if (typeof window !== 'undefined' && typeof window.prefetchMyTournamentsIfStale === 'function') {
    window.prefetchMyTournamentsIfStale();
  }
  if (typeof window !== 'undefined' && typeof window.prefetchBadgeIfStale === 'function') {
    window.prefetchBadgeIfStale();
  }

  // Load active tournaments (shared menu-panel loading overlay)
  if (typeof MenuPanelLoading !== 'undefined' && MenuPanelLoading.show) {
    MenuPanelLoading.show('Loading tournaments... Please wait');
  }
  try {
    await loadActiveTournaments();
  } finally {
    if (typeof MenuPanelLoading !== 'undefined' && MenuPanelLoading.hide) {
      MenuPanelLoading.hide();
    }
  }
  
  // Restart menu music if background music is enabled (tournament menu should have menu music)
  if (typeof startMenuMusic === 'function' && typeof gameSettings !== 'undefined' && gameSettings.backgroundMusic) {
    startMenuMusic();
  }
}

// Assign to window immediately after function declaration to prevent race conditions
if (typeof window !== 'undefined') {
  window.showTournaments = showTournaments;

  // Reload tournament lists (same as preload: invalidate cache then load active + my)
  window.reloadTournamentLists = function reloadTournamentLists() {
    window.__prefetchedTournaments = null;
    window.__prefetchedMyTournaments = null;
    loadActiveTournaments();
    loadMyTournaments();
  };

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
    
    if (ticketCount === null) {
      throw new Error('Could not get ticket count. Please try again.');
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
  
  clearTournamentDetailsPanel();

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

function getTournamentsPrefetchTtlMs() {
  return (typeof window !== 'undefined' && window.TOURNAMENTS_PREFETCH_TTL_MS) ? window.TOURNAMENTS_PREFETCH_TTL_MS : (2 * 60 * 1000);
}

/**
 * Use bootstrap/prefetch list only when TTL is valid and wallet matches cache semantics
 * (anonymous list vs player-enriched list).
 */
function canUseTournamentListPrefetch(prefetched, walletAddress) {
  if (!prefetched || prefetched.success === false || !Array.isArray(prefetched.tournaments)) return false;
  if (!prefetched.at || (Date.now() - prefetched.at) >= getTournamentsPrefetchTtlMs()) return false;
  var cur = walletAddress ? String(walletAddress) : '';
  var prefAddr =
    prefetched.playerAddress != null && prefetched.playerAddress !== ''
      ? String(prefetched.playerAddress)
      : '';
  if (prefAddr && cur && cur !== prefAddr) return false;
  if (prefAddr && !cur) return false;
  // Allow anonymous bootstrap-prefetched lists (prefAddr empty) even when a wallet is connected.
  // We'll render instantly from this list and then upgrade to player-enriched data in background.
  return true;
}

function cloneTournamentsShallow(tournaments) {
  return (tournaments || []).map(function (t) {
    return t && typeof t === 'object' ? Object.assign({}, t) : t;
  });
}

function getPrefetchedEnteredTournamentIdSet() {
  try {
    const pf = typeof window !== 'undefined' ? window.__prefetchedMyTournaments : null;
    if (!pf || pf.success === false || !Array.isArray(pf.tournaments)) return null;
    const s = new Set();
    pf.tournaments.forEach(function (t) {
      if (!t || typeof t !== 'object') return;
      const id = t.objectId || t.id;
      if (typeof id === 'string' && id) s.add(id);
    });
    return s;
  } catch (_) {
    return null;
  }
}

function getCachedTicketCountForTournamentUI(walletAddress) {
  try {
    if (window.GamePassDisplay && typeof window.GamePassDisplay.getStatus === 'function') {
      const st = window.GamePassDisplay.getStatus();
      if (st && typeof st.tickets === 'number' && Number.isFinite(st.tickets)) return st.tickets;
    }
    const pf = window._preloadedGamePassStatus && walletAddress ? window._preloadedGamePassStatus[walletAddress] : null;
    const t = pf && typeof pf.ticketCount === 'number' ? pf.ticketCount : null;
    if (t != null && Number.isFinite(t)) return t;
  } catch (_) {}
  return null;
}

function applyTimeDerivedStatus(tournaments, now) {
  (tournaments || []).forEach(function (t) {
    if (t && typeof t.startTime === 'number' && typeof t.endTime === 'number') {
      if (now < t.startTime) t.status = 'upcoming';
      else if (now <= t.endTime) t.status = 'active';
      else t.status = 'ended';
    }
  });
}

function filterActiveTabTournaments(tournaments, statusParam, now) {
  applyTimeDerivedStatus(tournaments, now);
  return (tournaments || []).filter(function (t) {
    if (!t) return false;
    if (t.status === 'ended') return false;
    if (statusParam === 'upcoming') return t.status === 'upcoming';
    if (statusParam === 'active') return t.status === 'active';
    return t.status === 'upcoming' || t.status === 'active';
  });
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

  var API_BASE_URL = getTournamentApiBaseUrl();

  var filterEl = document.getElementById('tournamentActiveFilter');
  var activeBtn = filterEl && filterEl.querySelector('.tournament-filter-btn.active');
  var statusParam = (activeBtn && activeBtn.getAttribute('data-status')) || 'all';

  // Render instantly from warm/bootstrap-prefetched list; upgrade in background.
  if (typeof window !== 'undefined' && typeof window.prefetchTournamentsIfStale === 'function') {
    try {
      void window.prefetchTournamentsIfStale();
    } catch (_) {}
  }

  var prefetched = typeof window !== 'undefined' ? window.__prefetchedTournaments : null;
  var walletAddress = getWalletAddressForTournaments();

  if (canUseTournamentListPrefetch(prefetched, walletAddress)) {
    loadingEl.style.display = 'none';
    var ticketCount = (prefetched.playerTicketCount != null) ? prefetched.playerTicketCount : null;
    if (ticketCount == null && walletAddress) ticketCount = getCachedTicketCountForTournamentUI(walletAddress);
    if (ticketCount == null) ticketCount = 0;
    var nowPrefetched = Date.now();
    var visiblePrefetchedTournaments = filterActiveTabTournaments(cloneTournamentsShallow(prefetched.tournaments), statusParam, nowPrefetched);

    if (!visiblePrefetchedTournaments.length) {
      emptyEl.style.display = 'block';
      var emptyMsgPf = 'No active tournaments at the moment.';
      if (statusParam === 'upcoming') emptyMsgPf = 'No upcoming tournaments.';
      else if (statusParam === 'active') emptyMsgPf = 'No active tournaments right now.';
      emptyEl.innerHTML = '<p>' + emptyMsgPf + '</p>';
      return;
    }
    listEl.innerHTML = '';
    visiblePrefetchedTournaments.forEach(function (tournament) {
      // If we have a wallet but only an anonymous tournaments list, synthesize minimal playerData from caches
      // so the details panel can choose Purchase vs Enter immediately.
      if (tournament && typeof tournament === 'object' && !tournament.playerData && walletAddress) {
        const enteredSet = getPrefetchedEnteredTournamentIdSet();
        const hasEntered = enteredSet ? enteredSet.has(tournament.objectId) : false;
        const fee = Number(tournament.entryFeeTickets || 0);
        const hasEnoughTickets = typeof ticketCount === 'number' ? ticketCount >= fee : false;
        tournament.playerData = { hasEntered, hasEnoughTickets };
      }
      var card = createTournamentCard(tournament, ticketCount);
      listEl.appendChild(card);
    });
    listEl.style.display = 'grid';
    updateTournamentWalletUI();
    return;
  }

  try {
    var params = new URLSearchParams();
    if (walletAddress) params.set('playerAddress', walletAddress);
    if (statusParam && statusParam !== 'all') params.set('status', statusParam);
    var url = API_BASE_URL + '/tournaments' + (params.toString() ? '?' + params.toString() : '');

    var response = await fetch(url);

    if (!response.ok) {
      throw new Error('Failed to load tournaments: ' + response.status);
    }

    var result = await response.json();

    loadingEl.style.display = 'none';

    if (!result.success || !result.tournaments || result.tournaments.length === 0) {
      if (typeof window !== 'undefined' && result.success && (!statusParam || statusParam === 'all')) {
        window.__prefetchedTournaments = {
          success: true,
          tournaments: [],
          at: Date.now(),
          playerAddress: walletAddress || null,
          playerTicketCount: result.playerTicketCount,
        };
      }
      emptyEl.style.display = 'block';
      var emptyMsg = 'No active tournaments at the moment.';
      if (statusParam === 'upcoming') emptyMsg = 'No upcoming tournaments.';
      else if (statusParam === 'active') emptyMsg = 'No active tournaments right now.';
      emptyEl.innerHTML = '<p>' + emptyMsg + '</p>';
      return;
    }

    // Only cache merged list (no status= query); subset responses would break All / filter-from-cache.
    if (typeof window !== 'undefined' && (!statusParam || statusParam === 'all')) {
      window.__prefetchedTournaments = {
        success: true,
        tournaments: result.tournaments,
        at: Date.now(),
        playerAddress: walletAddress || null,
        playerTicketCount: result.playerTicketCount,
      };
    }

    var now = Date.now();
    var visibleTournaments = filterActiveTabTournaments(cloneTournamentsShallow(result.tournaments), statusParam, now);

    if (!visibleTournaments.length) {
      emptyEl.style.display = 'block';
      var emptyMsg2 = 'No active tournaments at the moment.';
      if (statusParam === 'upcoming') emptyMsg2 = 'No upcoming tournaments.';
      else if (statusParam === 'active') emptyMsg2 = 'No active tournaments right now.';
      emptyEl.innerHTML = '<p>' + emptyMsg2 + '</p>';
      return;
    }

    listEl.innerHTML = '';
    visibleTournaments.forEach(function (tournament) {
      var card = createTournamentCard(tournament, result.playerTicketCount);
      listEl.appendChild(card);
    });

    listEl.style.display = 'grid';

    updateTournamentWalletUI();
  } catch (error) {
    log.error('TOURNAMENT MODAL', 'Error loading tournaments', error);
    loadingEl.style.display = 'none';
    emptyEl.style.display = 'block';
    emptyEl.innerHTML = '<p>Error loading tournaments: ' + error.message + '</p>';
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

  var walletAddress = (typeof getWalletAddress === 'function' && getWalletAddress()) ||
    (window.walletAPIInstance && window.walletAPIInstance.isConnected() && window.walletAPIInstance.getAddress());

  if (!walletAddress) {
    loadingEl.style.display = 'none';
    emptyEl.style.display = 'block';
    emptyEl.innerHTML = '<p>Please connect your wallet to view your tournaments.</p>';
    return;
  }

  var API_BASE_URL = getTournamentApiBaseUrl();

  if (typeof window !== 'undefined' && typeof window.prefetchMyTournamentsIfStale === 'function') {
    try {
      await window.prefetchMyTournamentsIfStale();
    } catch (_) {}
  }

  var ttl = getTournamentsPrefetchTtlMs();
  var prefetched = typeof window !== 'undefined' ? window.__prefetchedMyTournaments : null;
  var usePrefetched =
    prefetched &&
    prefetched.success !== false &&
    prefetched.address === walletAddress &&
    prefetched.at &&
    Date.now() - prefetched.at < ttl;

  if (usePrefetched) {
    loadingEl.style.display = 'none';
    var ticketCount = (prefetched.playerTicketCount != null) ? prefetched.playerTicketCount : 0;
    if (!prefetched.tournaments || !prefetched.tournaments.length) {
      emptyEl.style.display = 'block';
      emptyEl.innerHTML = '<p>You haven\'t entered any tournaments yet.</p>';
      updateTournamentWalletUI();
      return;
    }
    listEl.innerHTML = '';
    prefetched.tournaments.forEach(function (tournament) {
      var card = createTournamentCard(tournament, ticketCount);
      listEl.appendChild(card);
    });
    listEl.style.display = 'grid';
    updateTournamentWalletUI();
    return;
  }

  try {
    var url = API_BASE_URL + '/tournaments/my-tournaments?playerAddress=' + encodeURIComponent(walletAddress);

    var response = await fetch(url);

    if (!response.ok) {
      throw new Error('Failed to load my tournaments: ' + response.status);
    }

    var result = await response.json();

    loadingEl.style.display = 'none';

    if (!result.success || !result.tournaments || result.tournaments.length === 0) {
      if (typeof window !== 'undefined') {
        window.__prefetchedMyTournaments = {
          success: true,
          tournaments: [],
          address: walletAddress,
          at: Date.now(),
          playerTicketCount: result.playerTicketCount != null ? result.playerTicketCount : 0,
        };
      }
      emptyEl.style.display = 'block';
      emptyEl.innerHTML = '<p>You haven\'t entered any tournaments yet.</p>';
      updateTournamentWalletUI();
      return;
    }

    if (typeof window !== 'undefined') {
      window.__prefetchedMyTournaments = {
        success: true,
        tournaments: result.tournaments,
        address: walletAddress,
        at: Date.now(),
        playerTicketCount: result.playerTicketCount,
      };
    }

    listEl.innerHTML = '';
    result.tournaments.forEach(function (tournament) {
      var card = createTournamentCard(tournament, result.playerTicketCount);
      listEl.appendChild(card);
    });

    listEl.style.display = 'grid';

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
    const API_BASE_URL = window.GameApi ? window.GameApi.getBaseUrl() : (window.GAME_CONFIG?.GAME_BACKEND_URL || window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3001/api');
    
    // Get wallet address if available (optional for past tournaments)
    const walletAddress = getWalletAddressForTournaments();
    const pastUrl = walletAddress 
      ? `${API_BASE_URL}/tournaments/past?playerAddress=${encodeURIComponent(walletAddress)}`
      : `${API_BASE_URL}/tournaments/past`;
    
    // Also fetch the unified tournaments list so we can treat
    // time-ended tournaments as past even if Station hasn't moved them yet.
    const activeUrl = `${API_BASE_URL}/tournaments`;
    
    const [pastResponse, activeResponse] = await Promise.all([
      fetch(pastUrl),
      fetch(activeUrl).catch(() => null),
    ]);
    
    if (!pastResponse.ok) {
      throw new Error(`Failed to load past tournaments: ${pastResponse.status}`);
    }
    
    const pastResult = await pastResponse.json();
    const activeResult = activeResponse && activeResponse.ok ? await activeResponse.json() : null;
    
    loadingEl.style.display = 'none';
    
    const endedMap = new Map();
    const now = Date.now();
    
    // 1) Tournaments explicitly returned by /tournaments/past (platform past table)
    if (pastResult.success && Array.isArray(pastResult.tournaments)) {
      pastResult.tournaments.forEach(function (t) {
        if (t && t.objectId) {
          // Ensure status is ended
          t.status = 'ended';
          endedMap.set(t.objectId, t);
        }
      });
    }
    
    // 2) Tournaments from /tournaments whose time window has ended
    if (activeResult && activeResult.success && Array.isArray(activeResult.tournaments)) {
      activeResult.tournaments.forEach(function (t) {
        if (!t || !t.objectId || typeof t.startTime !== 'number' || typeof t.endTime !== 'number') return;
        var status;
        if (now < t.startTime) status = 'upcoming';
        else if (now <= t.endTime) status = 'active';
        else status = 'ended';
        if (status === 'ended' && !endedMap.has(t.objectId)) {
          t.status = 'ended';
          endedMap.set(t.objectId, t);
        }
      });
    }
    
    const endedTournaments = Array.from(endedMap.values()).sort(function (a, b) {
      return (b.endTime || 0) - (a.endTime || 0);
    });
    
    if (!endedTournaments.length) {
      emptyEl.style.display = 'block';
      if (walletAddress && window.PlayerInventoryCache?.refreshAfterRewardBackground) {
        window.PlayerInventoryCache.refreshAfterRewardBackground(walletAddress);
      }
      return;
    }
    
    listEl.innerHTML = '';
    endedTournaments.forEach(function (tournament) {
      const card = createTournamentCard(tournament, pastResult.playerTicketCount);
      listEl.appendChild(card);
    });
    
    listEl.style.display = 'grid';
    
    // Update wallet UI after loading tournaments (in case ticket count changed)
    if (walletAddress) {
      updateTournamentWalletUI();
      if (window.PlayerInventoryCache?.refreshAfterRewardBackground) {
        window.PlayerInventoryCache.refreshAfterRewardBackground(walletAddress);
      }
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

var TOURNAMENT_ITEM_NAME_MAP = {
  orb_level: 'Orb Level',
  force_field: 'Force Field',
  extra_lives: 'Extra Lives',
  slow_time: 'Slow Time',
  coin_tractor_beam: 'Coin Tractor',
  destroy_all: 'Destroy All',
  boss_kill_shot: 'Boss Kill Shot',
  random: 'Random L1 Item',
};

function getDefaultRewardConfigForTournamentDisplay() {
  const itemRewards = {
    1: [
      { itemId: 'destroy_all', level: 1, quantity: 1 },
      { itemId: 'boss_kill_shot', level: 1, quantity: 1 },
      { itemId: 'random', level: 1, quantity: 1 },
    ],
    2: [
      { itemId: 'boss_kill_shot', level: 1, quantity: 1 },
      { itemId: 'random', level: 1, quantity: 1 },
    ],
    3: [
      { itemId: 'destroy_all', level: 1, quantity: 1 },
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
    itemRewards,
  };
}

function getItemDisplayNameForTournamentReward(itemId) {
  return TOURNAMENT_ITEM_NAME_MAP[itemId] || itemId;
}

function renderTournamentRewardsSectionHTML(tournament) {
  let rewardConfig = tournament.rewardConfig;
  const isDefault = !rewardConfig || !rewardConfig.itemRewards || Object.keys(rewardConfig.itemRewards).length === 0;
  if (isDefault) {
    rewardConfig = getDefaultRewardConfigForTournamentDisplay();
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
                  ${Array.isArray(items) ? items.map((item) => `
                    <span class="tournament-reward-item" title="${getItemDisplayNameForTournamentReward(item.itemId)} Level ${item.level} x${item.quantity}">
                      <span class="tournament-reward-item-name">${getItemDisplayNameForTournamentReward(item.itemId)}</span>
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

function formatScoreForTournamentCategory(value, category) {
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

/**
 * Markup for the details column (≈1/3) when a tournament card is selected.
 */
function buildTournamentDetailsPanelHTML(tournament, playerTicketCount = null) {
  const category = TOURNAMENT_CATEGORIES[tournament.category] || TOURNAMENT_CATEGORIES.highestScore;
  const prizePoolUSD = (tournament.prizePoolUSDCents / 100).toFixed(2);
  const timeInfo = formatTimeRemaining(tournament);
  const playerData = tournament.playerData || null;
  const walletAddress = getWalletAddressForTournaments();
  const enteredSet = walletAddress ? getPrefetchedEnteredTournamentIdSet() : null;
  const hasEnteredDerived =
    playerData && typeof playerData.hasEntered === 'boolean'
      ? playerData.hasEntered
      : (enteredSet ? enteredSet.has(tournament.objectId) : false);
  const ticketCountForCalc =
    typeof playerTicketCount === 'number' && Number.isFinite(playerTicketCount)
      ? playerTicketCount
      : (walletAddress ? getCachedTicketCountForTournamentUI(walletAddress) : null);
  const hasEnoughTicketsDerived =
    playerData && typeof playerData.hasEnoughTickets === 'boolean'
      ? playerData.hasEnoughTickets
      : (typeof ticketCountForCalc === 'number'
          ? ticketCountForCalc >= Number(tournament.entryFeeTickets || 0)
          : null);

  return `
    <div class="tournament-details-card">
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
                      ${formatScoreForTournamentCategory(playerData.score, tournament.category)}
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
              <span class="tournament-time-label">Starts:</span>
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
          ${renderTournamentRewardsSectionHTML(tournament)}
        </div>
        <div class="tournament-actions-card">
          <button type="button" class="menu-btn" onclick="viewTournamentLeaderboard('${tournament.objectId}')">
            <span class="btn-icon">🏆</span> View Leaderboard
          </button>
          ${tournament.status === 'active' ? `
            ${hasEnoughTicketsDerived === false ? `
              <button type="button" class="menu-btn primary" onclick="openTicketShop()" title="Purchase tournament tickets">
                <span class="btn-icon">🛒</span> Purchase Ticket
              </button>
            ` : `
              <div class="tournament-action-buttons">
                <button type="button" class="menu-btn primary"
                        onclick="prepareTournamentThenOpenStore('${tournament.objectId}')"
                        title="Opens the gold tournament loadout (inventory, items, bundles). Tap Start game there to play; or use main menu Start Game if you returned to the menu first.">
                  <span class="btn-icon">🎫</span> ${hasEnteredDerived ? 'Play Again' : 'Enter Tournament'}
                </button>
                <button type="button" class="menu-btn secondary tournament-test-btn"
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
}

function clearTournamentDetailsPanel() {
  const panel = document.getElementById('tournamentDetailsPanel');
  if (!panel) return;
  panel.innerHTML = '<p class="tournament-details-placeholder">Select a tournament to see details.</p>';
  document.querySelectorAll('.tournament-card.tournament-card-details-selected').forEach(function (c) {
    c.classList.remove('tournament-card-details-selected');
  });
}

function showTournamentDetailsInPanel(tournament, playerTicketCount, cardElement) {
  const panel = document.getElementById('tournamentDetailsPanel');
  if (!panel) return;
  panel.innerHTML = buildTournamentDetailsPanelHTML(tournament, playerTicketCount);
  try {
    if (typeof window !== 'undefined') {
      window.__selectedTournamentObjectId = tournament && tournament.objectId ? String(tournament.objectId) : null;
    }
  } catch (_) {}
  document.querySelectorAll('.tournament-card.tournament-card-details-selected').forEach(function (c) {
    c.classList.remove('tournament-card-details-selected');
  });
  if (cardElement) {
    cardElement.classList.add('tournament-card-details-selected');
  }

  // Background refresh per-player entry state (short TTL + SWR) so button state stays correct after use.
  try {
    const walletAddress = getWalletAddressForTournaments();
    if (walletAddress && tournament && tournament.objectId && window.apiRequestCache?.get) {
      void refreshTournamentEntryStateSWR(String(tournament.objectId), String(walletAddress), playerTicketCount);
    }
  } catch (_) {}
}

function getTournamentApiBaseUrl() {
  return window.GameApi ? window.GameApi.getBaseUrl() : ((window.GAME_CONFIG && (window.GAME_CONFIG.GAME_BACKEND_URL || window.GAME_CONFIG.API_BASE_URL)) || 'http://localhost:3001/api');
}

function tournamentEntryCacheKey(tournamentObjectId, playerAddress) {
  return `tournamentEntry:${playerAddress}:${tournamentObjectId}`;
}

function applyEntryStateToTournament(tournament, entryState, playerTicketCountOverride) {
  if (!tournament || typeof tournament !== 'object' || !entryState || typeof entryState !== 'object') return tournament;
  const ticketCount =
    typeof playerTicketCountOverride === 'number' && Number.isFinite(playerTicketCountOverride)
      ? playerTicketCountOverride
      : (typeof entryState.ticketCount === 'number' ? entryState.ticketCount : null);
  const merged = Object.assign({}, tournament);
  merged.playerData = Object.assign({}, merged.playerData || {}, {
    hasEntered: !!entryState.hasEntered,
    rank: entryState.rank ?? null,
    score: entryState.score ?? 0,
    totalParticipants: entryState.totalParticipants ?? merged.participants,
    ticketCount: ticketCount != null ? ticketCount : (merged.playerData ? merged.playerData.ticketCount : undefined),
    hasEnoughTickets: typeof entryState.hasEnoughTickets === 'boolean'
      ? entryState.hasEnoughTickets
      : (ticketCount != null ? ticketCount >= Number(merged.entryFeeTickets || 0) : (merged.playerData ? merged.playerData.hasEnoughTickets : false)),
  });
  return merged;
}

async function refreshTournamentEntryStateSWR(tournamentObjectId, playerAddress, playerTicketCountHint) {
  const API_BASE_URL = getTournamentApiBaseUrl();
  const key = tournamentEntryCacheKey(tournamentObjectId, playerAddress);

  const fetcher = async () => {
    const url = `${API_BASE_URL}/tournaments/entry-state?playerAddress=${encodeURIComponent(playerAddress)}&tournamentObjectId=${encodeURIComponent(tournamentObjectId)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load tournament entry state: ${res.status}`);
    const json = await res.json();
    if (!json || json.success === false) throw new Error(json?.error || 'Failed to load tournament entry state');
    return json;
  };

  const data = await window.apiRequestCache.get(key, fetcher, {
    ttl: 15000,
    walletAddress: playerAddress,
    staleWhileRevalidate: true,
  });

  const entryState = data && data.entryState ? data.entryState : null;
  if (!entryState) return;

  // Patch prefetched list objects in-place so future renders pick up the corrected playerData.
  try {
    const pf = window.__prefetchedTournaments;
    if (pf && Array.isArray(pf.tournaments)) {
      pf.tournaments = pf.tournaments.map(function (t) {
        if (!t || t.objectId !== tournamentObjectId) return t;
        return applyEntryStateToTournament(t, entryState, playerTicketCountHint);
      });
    }
    const my = window.__prefetchedMyTournaments;
    if (my && Array.isArray(my.tournaments)) {
      my.tournaments = my.tournaments.map(function (t) {
        if (!t || t.objectId !== tournamentObjectId) return t;
        return applyEntryStateToTournament(t, entryState, playerTicketCountHint);
      });
    }
  } catch (_) {}

  // If this tournament is currently selected in the details panel, re-render it.
  try {
    if (String(window.__selectedTournamentObjectId || '') === String(tournamentObjectId)) {
      const panel = document.getElementById('tournamentDetailsPanel');
      if (!panel) return;
      // Find latest tournament object from prefetched cache (preferred), fallback to existing selected payload.
      let latest = null;
      const pf = window.__prefetchedTournaments;
      if (pf && Array.isArray(pf.tournaments)) {
        latest = pf.tournaments.find(function (t) { return t && t.objectId === tournamentObjectId; }) || null;
      }
      if (!latest) latest = { objectId: tournamentObjectId, playerData: entryState };
      panel.innerHTML = buildTournamentDetailsPanelHTML(latest, playerTicketCountHint);
    }
  } catch (_) {}
}

/**
 * Create tournament card element
 */
function createTournamentCard(tournament, playerTicketCount = null) {
  const category = TOURNAMENT_CATEGORIES[tournament.category] || TOURNAMENT_CATEGORIES.highestScore;
  const prizePoolUSD = (tournament.prizePoolUSDCents / 100).toFixed(2);
  const playerData = tournament.playerData || null;

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
      <div class="tournament-card-expand-hint">Click for details</div>
    </div>
  `;

  const condensedView = card.querySelector('.tournament-card-condensed-view');
  if (condensedView) {
    condensedView.addEventListener('click', function (e) {
      if (e.target.closest('button') || e.target.closest('a')) {
        return;
      }
      showTournamentDetailsInPanel(tournament, playerTicketCount, card);
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
    // Always go through the game backend proxy (it carries corridor identity to platform).
    let API_BASE_URL = window.GameApi ? window.GameApi.getBaseUrl() : ((window.GAME_CONFIG && (window.GAME_CONFIG.GAME_BACKEND_URL || window.GAME_CONFIG.API_BASE_URL)) || 'http://localhost:3001/api');
    API_BASE_URL = (API_BASE_URL || '').replace(/\/?$/, '');
    if (API_BASE_URL && !/\/api$/.test(API_BASE_URL)) API_BASE_URL = API_BASE_URL + '/api';
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
      // Don't throw hard errors for expected empty-state / not-found behavior.
      if (response.status === 404) {
        alert('No leaderboard yet (tournament not found).');
        return;
      }
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
      // Expected when no events/tournaments are set up yet.
      alert(result.error || 'No leaderboard yet.');
      return;
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
 * Legacy no-ops: details render in the right-hand panel (showTournamentDetailsInPanel).
 */
function expandTournamentCard(_tournamentObjectId) {}

function shrinkTournamentCard(_tournamentObjectId) {}

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
 * Simplified tournament flow: verify ticket count, remember tournament, open tournament-entry loadout
 * (Inventory + Items + Bundles + payment; no Game Pass or Tournament Tickets tabs).
 * Ticket is consumed when the player taps Start game (same path as main-menu Start Game).
 */
async function prepareTournamentThenOpenStore(tournamentObjectId) {
  log.debug('TOURNAMENT MODAL', 'prepareTournamentThenOpenStore', { tournamentObjectId });

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

  if (!tournamentObjectId) {
    alert('Select a tournament from the list first.');
    return;
  }

  try {
    const API_BASE_URL = window.GameApi
      ? window.GameApi.getBaseUrl()
      : window.GAME_CONFIG?.GAME_BACKEND_URL || window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3001/api';

    const tournamentResponse = await fetch(`${API_BASE_URL}/tournaments/${tournamentObjectId}`);
    if (!tournamentResponse.ok) {
      throw new Error('Failed to load tournament details');
    }
    const tournamentResult = await tournamentResponse.json();
    if (!tournamentResult.success || !tournamentResult.tournament) {
      throw new Error('Tournament not found');
    }
    const tournament = tournamentResult.tournament;

    const now = Date.now();
    const gracePeriodEnd = tournament.endTime + 60 * 60 * 1000;
    if (now > gracePeriodEnd) {
      alert('This tournament has ended. Score submission is no longer available.');
      return;
    }

    const gamePassBase =
      (window.GAME_CONFIG?.getBackendUrl && window.GAME_CONFIG.getBackendUrl('/api/game-pass/')) ||
      (window.GameApi
        ? window.GameApi.getBaseUrl()
        : window.GAME_CONFIG?.GAME_BACKEND_URL || window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3001/api');
    let hasTickets = false;
    try {
      const gamePassResponse = await fetch(`${gamePassBase}/game-pass/${walletAddress}?contract=new`);
      if (gamePassResponse.ok) {
        const gamePassResult = await gamePassResponse.json();
        hasTickets =
          gamePassResult.success && (gamePassResult.ticketCount ?? 0) >= (tournament.entryFeeTickets ?? 1);
      }
    } catch (e) {
      log.error('TOURNAMENT MODAL', 'Ticket check failed', e);
    }
    if (!hasTickets) {
      alert(
        `You need at least ${tournament.entryFeeTickets ?? 1} tournament ticket${
          (tournament.entryFeeTickets ?? 1) !== 1 ? 's' : ''
        } to enter. Use Purchase Ticket or the Store Tickets tab, then try again.`
      );
      return;
    }

    if (window.TournamentContext && typeof window.TournamentContext.set === 'function') {
      window.TournamentContext.set({
        isTournamentMode: true,
        awaitingStartGameFromMenu: true,
        tournamentObjectId: tournament.objectId,
        tournamentName: tournament.name,
        tournamentCategory: tournament.category,
        tournamentEntryFeeTickets: tournament.entryFeeTickets,
        tournamentEndTime: tournament.endTime,
        tournamentStatus: tournament.status,
      });
    }

    hideTournaments();

    if (typeof showStore === 'function') {
      await showStore('tournament-entry');
    } else if (typeof StoreService !== 'undefined' && StoreService.show) {
      await StoreService.show('tournament-entry');
    } else {
      alert(
        'Loadout screen could not be opened.\n\nUse the main menu Store to manage inventory, then try entering the tournament again.'
      );
    }
  } catch (error) {
    log.error('TOURNAMENT MODAL', 'prepareTournamentThenOpenStore failed', error);
    alert(`Could not prepare tournament: ${error.message || 'Unknown error'}`);
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
    const API_BASE_URL = window.GameApi ? window.GameApi.getBaseUrl() : (window.GAME_CONFIG?.GAME_BACKEND_URL || window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3001/api');
    
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
      log.error('TOURNAMENT MODAL', 'GameService.startTournamentGameTest not available', {
        hasGameService: !!window.GameService,
        hasMethod: window.GameService ? typeof window.GameService.startTournamentGameTest : 'N/A',
      });
      throw new Error('Tournament game start not available. Please refresh and try again.');
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
    const API_BASE_URL = window.GameApi ? window.GameApi.getBaseUrl() : (window.GAME_CONFIG?.GAME_BACKEND_URL || window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3001/api');
    
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
      log.error('TOURNAMENT MODAL', 'GameService.startTournamentGame not available', {
        hasGameService: !!window.GameService,
        hasMethod: window.GameService ? typeof window.GameService.startTournamentGame : 'N/A',
      });
      alert('Tournament game start not available. Please refresh the page and try again.');
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
  
  void prepareTournamentThenOpenStore(tournamentObjectId);
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
 * Refresh tournaments
 */
async function refreshTournaments() {
  log.debug('TOURNAMENT MODAL', 'Refreshing tournaments');
  if (typeof window !== 'undefined') {
    window.__prefetchedTournaments = null;
    window.__prefetchedMyTournaments = null;
  }

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
    // Get wallet address before showing menu (needed for badge refresh)
    let walletAddress = null;
    if (typeof window !== 'undefined') {
      if (window.walletAPIInstance && window.walletAPIInstance.isConnected && window.walletAPIInstance.isConnected()) {
        walletAddress = window.walletAPIInstance.getAddress();
      } else if (typeof GameDataState !== 'undefined' && GameDataState.walletAddress) {
        walletAddress = GameDataState.walletAddress;
      }
    }
    
    if (typeof MenuService !== 'undefined' && MenuService.show) {
      // MenuService.show() is async, so we need to wait for it to complete
      MenuService.show({ fromMenuPanel: true }).then(() => {
        // Refresh badge display to check for upgrades after menu is shown
        // This ensures upgrade check happens after MenuService's onReturnToMenu() completes
        if (walletAddress && typeof window.loadMenuBadgeDisplay === 'function') {
          // Small delay to ensure menu is fully visible and MenuService's badge refresh completes
          setTimeout(async () => {
            try {
              await window.loadMenuBadgeDisplay(walletAddress);
            } catch (error) {
              log.warn('TOURNAMENT MODAL', 'Error refreshing badge display after returning to menu', error);
            }
          }, 200);
        }
      }).catch(err => {
        log.warn('TOURNAMENT MODAL', 'Error showing menu', err);
        // Fallback: still try to refresh badge even if menu show failed
        if (walletAddress && typeof window.loadMenuBadgeDisplay === 'function') {
          setTimeout(async () => {
            try {
              await window.loadMenuBadgeDisplay(walletAddress);
            } catch (error) {
              log.warn('TOURNAMENT MODAL', 'Error refreshing badge display after returning to menu', error);
            }
          }, 200);
        }
      });
    } else {
      const mainMenu = document.getElementById('mainMenuOverlay');
      if (mainMenu) {
        mainMenu.classList.add('main-menu-overlay-visible');
        mainMenu.classList.remove('main-menu-overlay-hidden');
      }
      
      // Refresh badge display if wallet is connected
      if (walletAddress && typeof window.loadMenuBadgeDisplay === 'function') {
        // Small delay to ensure menu is visible before refreshing badge
        setTimeout(async () => {
          try {
            await window.loadMenuBadgeDisplay(walletAddress);
          } catch (error) {
            log.warn('TOURNAMENT MODAL', 'Error refreshing badge display after returning to menu', error);
          }
        }, 200);
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
window.startTournamentGame = startTournamentGame;
window.startTournamentGameTest = startTournamentGameTest;
window.prepareTournamentThenOpenStore = prepareTournamentThenOpenStore;
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
    const p = originalOnWalletConnected
      ? Promise.resolve(originalOnWalletConnected(address))
      : Promise.resolve();
    return p.finally(() => {
      const tournamentModal = document.getElementById('tournamentModal');
      if (tournamentModal && tournamentModal.classList.contains('tournament-modal-visible')) {
        updateTournamentWalletUI();
        refreshTournaments();
      }
    });
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

