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
 * Menu scripts load in parallel; this file may run before achievement-progress.js.
 * Real logic is registered as __switchMilestoneTabImpl when that module finishes.
 */
(function initMilestoneTabForwarding() {
  if (typeof window.switchMilestoneTab === 'function') return;

  if (window.__milestoneTabForwarderInstalled) return;
  window.__milestoneTabForwarderInstalled = true;

  let pendingTab = null;
  let pendingSubTab = null;

  window.switchMilestoneTab = function switchMilestoneTabForward(tab) {
    if (typeof window.__switchMilestoneTabImpl === 'function') {
      return window.__switchMilestoneTabImpl(tab);
    }
    pendingTab = tab;
  };

  window.switchMilestoneSubTab = function switchMilestoneSubTabForward(subTab) {
    if (typeof window.__switchMilestoneSubTabImpl === 'function') {
      return window.__switchMilestoneSubTabImpl(subTab);
    }
    pendingSubTab = subTab;
  };

  window.__bindMilestoneTabImplementations = function __bindMilestoneTabImplementations() {
    if (typeof window.__switchMilestoneTabImpl !== 'function') return;

    if (pendingTab !== null) {
      const t = pendingTab;
      pendingTab = null;
      pendingSubTab = null;
      window.__switchMilestoneTabImpl(t);
      return;
    }

    if (pendingSubTab !== null && typeof window.__switchMilestoneSubTabImpl === 'function') {
      const s = pendingSubTab;
      pendingSubTab = null;
      window.__switchMilestoneSubTabImpl(s);
    }
  };
})();

/**
 * Toggle Leaderboard vs Milestones panels in the DOM immediately so the UI updates even if
 * achievement-progress handlers throw or load order left __switchMilestoneTabImpl unset briefly.
 */
function applyLeaderboardModalMainTabDOM(tab) {
  const m = document.getElementById('leaderboardModal');
  if (!m) return;
  const lb = m.querySelector('.leaderboard');
  if (!lb) return;
  const isLeaderboard = tab === 'leaderboard';

  lb.querySelectorAll('.leaderboard-split-tabs .milestone-tab').forEach((b) => {
    const active =
      (isLeaderboard && b.id === 'milestoneTabLeaderboard') ||
      (!isLeaderboard && b.id === 'milestoneTabMilestones');
    b.classList.toggle('active', active);
    b.setAttribute('aria-selected', active ? 'true' : 'false');
  });

  Array.from(lb.children).forEach((panel) => {
    if (!panel.classList || !panel.classList.contains('milestone-tab-content')) return;
    const active =
      (isLeaderboard && panel.id === 'milestoneTabContentLeaderboard') ||
      (!isLeaderboard && panel.id === 'milestoneTabContentMilestones');
    panel.classList.toggle('active', active);
  });

  if (isLeaderboard && window.LeaderboardService && typeof window.LeaderboardService.getCurrentCategory === 'function') {
    const titleEl = document.getElementById('leaderboardCategoryTitle');
    if (titleEl) {
      const cat = window.LeaderboardService.getCurrentCategory();
      titleEl.textContent = `${cat.icon} ${cat.name}`;
    }
    const statHead = document.getElementById('leaderboardColumnHeaderStat');
    if (statHead) {
      const cat = window.LeaderboardService.getCurrentCategory();
      statHead.textContent = cat.name;
    }
  }
}

/**
 * Prefer achievement-progress impl for sub-tab + loadMilestoneProgress; DOM swap always runs first.
 */
function invokeSwitchMilestoneTab(tab) {
  applyLeaderboardModalMainTabDOM(tab);

  if (typeof window.__bindMilestoneTabImplementations === 'function') {
    window.__bindMilestoneTabImplementations();
  }

  const run =
    typeof window.__switchMilestoneTabImpl === 'function'
      ? window.__switchMilestoneTabImpl
      : typeof window.switchMilestoneTab === 'function'
        ? window.switchMilestoneTab
        : null;

  if (run) {
    try {
      run(tab);
    } catch (err) {
      log.error('LEADERBOARD MODAL', 'switchMilestoneTab threw', err);
      if (tab === 'milestones') {
        fallbackLoadMilestonePanel();
      }
    }
    return;
  }

  log.warn(
    'LEADERBOARD MODAL',
    'No switchMilestoneTab impl — using DOM + direct milestone load if available'
  );
  if (tab === 'milestones') {
    fallbackLoadMilestonePanel();
  }
}

function fallbackLoadMilestonePanel() {
  const sub = window._currentMilestoneSubTab || 'per-game';
  const runSub = window.__switchMilestoneSubTabImpl || window.switchMilestoneSubTab;
  if (typeof runSub === 'function') {
    try {
      runSub(sub);
    } catch (e) {
      log.error('LEADERBOARD MODAL', 'switchMilestoneSubTab threw', e);
      if (typeof window.loadMilestoneProgress === 'function') {
        window.loadMilestoneProgress(sub);
      }
    }
  } else if (typeof window.loadMilestoneProgress === 'function') {
    window.loadMilestoneProgress(sub);
  }
}

function invokeSwitchMilestoneSubTab(subTab) {
  if (typeof window.__bindMilestoneTabImplementations === 'function') {
    window.__bindMilestoneTabImplementations();
  }
  const run =
    typeof window.__switchMilestoneSubTabImpl === 'function'
      ? window.__switchMilestoneSubTabImpl
      : typeof window.switchMilestoneSubTab === 'function'
        ? window.switchMilestoneSubTab
        : null;
  if (run) run(subTab);
}

/**
 * Delegated clicks on .leaderboard so taps on inner spans/icons still hit; avoids capture/stopPropagation issues.
 */
function wireLeaderboardModalTabControls(modalEl) {
  const root = modalEl.querySelector('.leaderboard');
  if (!root) {
    log.warn('LEADERBOARD MODAL', 'No .leaderboard root for tab delegation');
    return;
  }
  root.addEventListener('click', (e) => {
    // Main Leaderboard | Milestones uses inline onclick (window.onLeaderboardModalMainTab) for reliability

    const subBtn = e.target.closest('[data-lb-subtab]');
    if (subBtn && modalEl.contains(subBtn)) {
      const v = subBtn.getAttribute('data-lb-subtab');
      if (v === 'per-game' || v === 'cumulative') {
        e.preventDefault();
        invokeSwitchMilestoneSubTab(v);
      }
      return;
    }

    const refreshBtn = e.target.closest('#milestoneRefreshBtn');
    if (refreshBtn && modalEl.contains(refreshBtn) && typeof window.refreshMilestoneProgress === 'function') {
      e.preventDefault();
      window.refreshMilestoneProgress();
    }
  });
}

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
    <!-- Title row: Leaderboard | Milestones split (active = blue, inactive = black) -->
    <div class="leaderboard-header leaderboard-title-split">
      <div id="leaderboardMilestoneTabs" class="leaderboard-milestone-tabs leaderboard-milestone-tabs--split" role="tablist" aria-label="Leaderboard views">
        <div class="leaderboard-split-tabs">
          <button type="button" class="milestone-tab active" id="milestoneTabLeaderboard" role="tab" aria-selected="true" onclick="window.onLeaderboardModalMainTabClick&&window.onLeaderboardModalMainTabClick('leaderboard')">
            <span class="tab-icon">🏆</span> Leaderboard
          </button>
          <button type="button" class="milestone-tab" id="milestoneTabMilestones" role="tab" aria-selected="false" onclick="window.onLeaderboardModalMainTabClick&&window.onLeaderboardModalMainTabClick('milestones')">
            <span class="tab-icon">⭐</span> Milestones
            <span class="milestone-tab-claim-count-badge" id="milestonesTabClaimCountBadge" style="display: none;">0</span>
          </button>
        </div>
      </div>
    </div>

    <div id="milestoneTabContentLeaderboard" class="milestone-tab-content active">
      <div class="leaderboard-carousel">
        <button class="carousel-arrow carousel-arrow-left" id="leaderboardPrevBtn" onclick="leaderboardPrevCategory()" aria-label="Previous category">
          <span class="btn-icon">←</span>
        </button>
        <div class="leaderboard-list-container">
          <!-- Category sits in the center column only (above the list), not between arrows -->
          <div class="leaderboard-category-row leaderboard-category-row--in-panel" id="leaderboardCategoryRow">
            <div class="leaderboard-category-heading" id="leaderboardCategoryTitle" role="heading" aria-level="2">${currentCategory.icon} ${currentCategory.name}</div>
          </div>
          <div class="leaderboard-column-headers" role="row" aria-label="Column headings">
            <div class="leaderboard-main-flex leaderboard-column-headers-main">
              <div class="leaderboard-rank leaderboard-col-head">#</div>
              <div class="leaderboard-address leaderboard-col-head">Address</div>
              <div class="leaderboard-name leaderboard-col-head">Name</div>
            </div>
            <div class="leaderboard-stat leaderboard-col-head" id="leaderboardColumnHeaderStat">${currentCategory.name}</div>
          </div>
          <ul class="leaderboard-list" id="modalLeaderboardList">
          </ul>
        </div>
        <button class="carousel-arrow carousel-arrow-right" id="leaderboardNextBtn" onclick="leaderboardNextCategory()" aria-label="Next category">
          <span class="btn-icon">→</span>
        </button>
      </div>
      <div class="leaderboard-load-more-container" id="leaderboardLoadMoreContainer" style="display: none;">
        <button class="menu-btn" id="leaderboardLoadMoreBtn" onclick="loadMoreLeaderboard()">
          <span class="btn-icon">⬇️</span> Load More
        </button>
      </div>
      <div class="leaderboard-actions">
        <button class="menu-btn" id="leaderboardRefreshBtn" onclick="refreshLeaderboard()">
          <span class="btn-icon">🔄</span> Refresh
        </button>
        <button class="menu-btn primary" onclick="hideLeaderboard()">
          <span class="btn-icon">←</span> Back to Menu
        </button>
      </div>
    </div>

    <div id="milestoneTabContentMilestones" class="milestone-tab-content">
      <div class="milestone-sub-tabs">
        <button type="button" class="milestone-sub-tab active" id="milestoneSubTabPerGame" data-lb-subtab="per-game">
          <span class="tab-icon">⭐</span> Per Game
        </button>
        <button type="button" class="milestone-sub-tab" id="milestoneSubTabCumulative" data-lb-subtab="cumulative">
          <span class="tab-icon">📊</span> Cumulative
        </button>
      </div>
      <div class="milestone-claim-all-bar" id="milestoneClaimAllBar" style="display: none;">
        <button type="button" class="milestone-claim-all-btn menu-btn primary" id="milestoneClaimAllBtn" onclick="return claimAllMilestoneRewards(event)">
          <span class="btn-icon">🎁</span> Claim all
        </button>
      </div>
      <div class="milestone-sub-tab-content active" id="milestoneSubTabContentPerGame">
        <div class="milestone-progress-container">
          <div class="milestone-loading" id="milestoneLoadingPerGame">
            <p>Loading milestone progress...</p>
          </div>
          <div class="milestone-list" id="milestoneListPerGame" style="display: none;"></div>
        </div>
      </div>
      <div class="milestone-sub-tab-content" id="milestoneSubTabContentCumulative">
        <div class="milestone-progress-container">
          <div class="milestone-loading" id="milestoneLoadingCumulative">
            <p>Loading milestone progress...</p>
          </div>
          <div class="milestone-list" id="milestoneListCumulative" style="display: none;"></div>
        </div>
      </div>
      <div class="leaderboard-actions">
        <button type="button" class="menu-btn" id="milestoneRefreshBtn">
          <span class="btn-icon">🔄</span> Refresh
        </button>
        <button class="menu-btn primary" onclick="hideLeaderboard()">
          <span class="btn-icon">←</span> Back to Menu
        </button>
      </div>
    </div>
  `;
  
  leaderboardModal.appendChild(leaderboardContent);
  viewportContainer.appendChild(leaderboardModal);

  wireLeaderboardModalTabControls(leaderboardModal);
  if (typeof window.__bindMilestoneTabImplementations === 'function') {
    window.__bindMilestoneTabImplementations();
  }

  // Refresh claim-count badge on Milestones tab (DOM is prebuilt above; addMilestoneProgressToLeaderboard is a no-op for structure)
  if (typeof window.addMilestoneProgressToLeaderboard === 'function') {
    window.addMilestoneProgressToLeaderboard();
  }

  // Definitions normally come from menu bootstrap; network fallback only if cache missing/stale
  const mdAt = typeof window.__prefetchedMilestoneDefinitionsTimestamp === 'number' ? window.__prefetchedMilestoneDefinitionsTimestamp : 0;
  const mdDefs = window.__prefetchedMilestoneDefinitions;
  const mdTtl = 24 * 60 * 60 * 1000;
  const defsFresh = !!(mdDefs && mdAt && Date.now() - mdAt < mdTtl);
  if (!defsFresh && typeof window.prefetchMilestoneDefinitions === 'function') {
    window.prefetchMilestoneDefinitions();
  }
  
  // Update badge counts after modal is set up (force refresh to get latest count)
  if (typeof updateClaimCountBadge === 'function') {
    setTimeout(async () => {
      await updateClaimCountBadge(null, true);
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
  
  // If we already prefetched leaderboard during menu bootstrap, render instantly.
  const prefetched = window.__prefetchedLeaderboard;
  const hasPrefetchedList = prefetched && prefetched.success === true && Array.isArray(prefetched.leaderboard);
  const hasPrefetchedByStat = prefetched && prefetched.success === true && prefetched.byStat && typeof prefetched.byStat === 'object';
  const ttlMs =
    (typeof window !== 'undefined' && window.LEADERBOARD_PREFETCH_TTL_MS) ? window.LEADERBOARD_PREFETCH_TTL_MS : 30000;
  const prefetchedFresh = Boolean(prefetched && prefetched.at && (Date.now() - prefetched.at) < ttlMs);
  if (hasPrefetchedList) {
    try {
      window.LeaderboardService.setLeaderboardData(prefetched.leaderboard);
      if (hasPrefetchedByStat && window.LeaderboardService.setLeaderboardByStat) {
        window.LeaderboardService.setLeaderboardByStat(prefetched.byStat);
      }
      if (typeof displayLeaderboardModal === 'function') {
        displayLeaderboardModal();
      }
    } catch (_) {}
  } else if (hasPrefetchedByStat && window.LeaderboardService && window.LeaderboardService.setLeaderboardByStat) {
    // byStat is enough to render the modal instantly (leaderboard-data uses byStat fast-path).
    try {
      window.LeaderboardService.setLeaderboardByStat(prefetched.byStat);
      if (typeof displayLeaderboardModal === 'function') {
        displayLeaderboardModal();
      }
    } catch (_) {}
  } else if (typeof MenuPanelLoading !== 'undefined' && MenuPanelLoading.show) {
    // Only show a blocking loader when we have nothing to display yet.
    MenuPanelLoading.show('Loading leaderboard... Please wait');
  }

  // Only refresh on open when we have no prefetched data, or it’s stale.
  // If it’s fresh, opening the modal should produce *zero* network calls.
  if (prefetchedFresh && (hasPrefetchedList || hasPrefetchedByStat)) {
    return;
  }

  void (async () => {
    try {
      if (typeof window.fetchBlockchainLeaderboard === 'function') {
        await window.fetchBlockchainLeaderboard(200);
      }
      if (typeof displayLeaderboardModal === 'function') {
        displayLeaderboardModal();
      }
    } finally {
      if (!hasPrefetchedList && typeof MenuPanelLoading !== 'undefined' && MenuPanelLoading.hide) {
        MenuPanelLoading.hide();
      }
      if (typeof updateClaimCountBadge === 'function') {
        setTimeout(async () => {
          await updateClaimCountBadge(null, true);
        }, 200);
      }
    }
  })();
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
    MenuService.show({ fromMenuPanel: true });
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
  console.log('📋 [LEADERBOARD MODAL] displayLeaderboardModal() called');
  
  if (!window.LeaderboardService) {
    log.warn('LEADERBOARD MODAL', 'LeaderboardService not available');
    return;
  }
  
  const list = document.getElementById('modalLeaderboardList');
  if (!list) {
    console.warn('📋 [LEADERBOARD MODAL] List element not found');
    return;
  }
  
  const state = window.LeaderboardService.getState();
  console.log('📋 [LEADERBOARD MODAL] Current state:', state);
  console.log('📋 [LEADERBOARD MODAL] Leaderboard data length:', state.currentLeaderboardData?.length || 0);
  console.log('📋 [LEADERBOARD MODAL] First entry (if any):', state.currentLeaderboardData?.[0] || null);
  
  // Get current wallet address
  if (window.walletAPIInstance && window.walletAPIInstance.isConnected()) {
    window.LeaderboardService.setWalletAddress(window.walletAPIInstance.getAddress());
  } else {
    window.LeaderboardService.setWalletAddress(null);
  }
  
  // Get current category
  const currentCategory = window.LeaderboardService.getCurrentCategory();
  const primaryField = currentCategory.primaryField;
  console.log('📋 [LEADERBOARD MODAL] Current category:', currentCategory);
  console.log('📋 [LEADERBOARD MODAL] Primary field:', primaryField);
  
  // Category label above carousel (inside leaderboard tab panel)
  const categoryTitleElement = document.getElementById('leaderboardCategoryTitle');
  if (categoryTitleElement) {
    categoryTitleElement.textContent = `${currentCategory.icon} ${currentCategory.name}`;
  }
  const columnStatHead = document.getElementById('leaderboardColumnHeaderStat');
  if (columnStatHead) {
    columnStatHead.textContent = currentCategory.name;
  }
  
  // Use blockchain data
  const dataToDisplay = state.currentLeaderboardData;
  console.log('📋 [LEADERBOARD MODAL] Data to display length:', dataToDisplay?.length || 0);
  
  if (!dataToDisplay || dataToDisplay.length === 0) {
    console.warn('📋 [LEADERBOARD MODAL] ⚠️ No leaderboard data available!');
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
  /** Inline onclick on split tabs — always defined before modal innerHTML can reference it */
  window.onLeaderboardModalMainTabClick = function onLeaderboardModalMainTabClick(tab) {
    invokeSwitchMilestoneTab(tab);
  };
  window.onLeaderboardModalSubTabClick = function onLeaderboardModalSubTabClick(sub) {
    invokeSwitchMilestoneSubTab(sub);
  };
}

