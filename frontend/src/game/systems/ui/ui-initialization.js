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

const MENU_BOOTSTRAP_MAX_ATTEMPTS = 12;
const MENU_BOOTSTRAP_RETRY_DELAY_MS = 750;
/**
 * Browser-side freshness window for game config slices reused after menu bootstrap (same order of magnitude as server cache).
 * Server source of truth: `PUBLIC_GAME_CONFIG_TTL_MS` in `apps/shooter-game/backend/lib/cache/public-nonuser-data-cache.ts`
 * (optional host override: env `PUBLIC_DATA_GAME_CONFIG_TTL_MS`). Values need not match exactly — different layers.
 */
const GAME_CONFIG_BOOTSTRAP_TTL_MS = 6 * 60 * 60 * 1000;
/**
 * Browser-side freshness for store catalog **items/offers** (`StoreDataSources`, prefetch, store-item-loader).
 * Spot conversion uses `GET /api/prices/tokens` via `ensureStoreTokenPrices`, not this TTL.
 * Server merged catalog TTL: `PUBLIC_STORE_CATALOG_TTL_MS` in `apps/shooter-game/backend/lib/cache/public-nonuser-data-cache.ts` (optional host override: `PUBLIC_DATA_STORE_CATALOG_TTL_MS`).
 * Catalog is not cached under `apiRequestCache` store keys — only this module + `StoreDataSources` state.
 */
const STORE_CATALOG_CACHE_TTL_MS = 60 * 60 * 1000;

if (typeof window !== 'undefined') {
  window.STORE_CATALOG_CACHE_TTL_MS = STORE_CATALOG_CACHE_TTL_MS;
}

function sleepUi(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Game backend API root (shared by initializeUI and the Enter-button handler in initializeFrontPage). */
function getGameApiBase() {
  if (typeof window === 'undefined') return 'http://localhost:3001/api';
  if (window.GameApi && typeof window.GameApi.getBaseUrl === 'function') return window.GameApi.getBaseUrl();
  const cfg = window.GAME_CONFIG;
  if (!cfg) return 'http://localhost:3001/api';
  return cfg.GAME_BACKEND_URL || cfg.API_BASE_URL || 'http://localhost:3001/api';
}

function setStartScreenProgress(visible, percent) {
  const container = document.getElementById('startScreenProgress');
  const fill = document.getElementById('startScreenProgressFill');
  if (!container || !fill) return;
  if (visible) {
    container.classList.add('start-screen-progress-visible');
    const bounded = Math.max(0, Math.min(100, Number(percent) || 0));
    fill.style.width = `${bounded}%`;
  } else {
    container.classList.remove('start-screen-progress-visible');
    fill.style.width = '0%';
  }
}

/**
 * While a long async step runs (e.g. menu bootstrap), creep the bar from `fromPct` toward `capPct`
 * so the UI does not look frozen. Call the returned stopper in `finally` when the work completes.
 */
function startStartScreenProgressCreep(fromPct, capPct, opts) {
  const stepMs = (opts && opts.stepMs) || 380;
  const step = (opts && opts.step) || 1.1;
  let current = Math.min(capPct, fromPct);
  const id = setInterval(() => {
    current = Math.min(capPct, current + step);
    setStartScreenProgress(true, Math.round(current * 10) / 10);
    if (current >= capPct) clearInterval(id);
  }, stepMs);
  return function stopStartScreenProgressCreep() {
    clearInterval(id);
  };
}

/**
 * Menu bootstrap always includes milestone definitions (non-blocking on server). Apply to window
 * cache on any successful JSON body so Enter/menu is not blocked on store/tournaments readiness.
 */
function applyMilestoneDefinitionsFromBootstrapIfPresent(bootstrapData, now) {
  if (typeof window === 'undefined' || !bootstrapData) return;
  const defData = bootstrapData.milestones;
  if (!defData || defData.success !== true) return;
  const defs = defData.definitions ?? defData.fullDefinitions;
  if (defs && typeof defs === 'object') {
    window.__prefetchedMilestoneDefinitions = defs;
    window.__prefetchedMilestoneDefinitionsTimestamp = now;
    if (typeof window.__syncMilestoneDefinitionsFromBootstrapCache === 'function') {
      window.__syncMilestoneDefinitionsFromBootstrapCache();
    }
  }
}

/**
 * Normalize leaderboard payload into the shape the modal consumes.
 * - Source API (`GET /api/leaderboard`) returns `{ leaderboard, byStat? }`
 * - Modal fast-path expects `window.__prefetchedLeaderboard.byStat`
 */
function buildLeaderboardByStatFromList(list) {
  if (!Array.isArray(list)) return null;
  // Defensive clone so sorts don't mutate original.
  const base = list.slice();
  const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  const desc = (field) => base.slice().sort((a, b) => num(b?.[field]) - num(a?.[field]));
  return {
    bestScore: desc('score'),
    bestDistance: desc('distance'),
    bestBossesDefeated: desc('bossesDefeated'),
    bestEnemiesDefeated: desc('enemiesDefeated'),
    bestCoins: desc('coins'),
    bestCoinStreak: desc('longestCoinStreak'),
  };
}

function applyMenuBootstrapPrefetchData(bootstrapData, now) {
  if (typeof window !== 'undefined') {
    window.GAME_CONFIG_BOOTSTRAP_TTL_MS = GAME_CONFIG_BOOTSTRAP_TTL_MS;
  }
  const storeData = bootstrapData?.store || null;
  const tournamentsData = bootstrapData?.tournaments || null;
  const leaderboardData = bootstrapData?.leaderboard || null;
  const gameConfigData = bootstrapData?.gameConfig || null;

  applyMilestoneDefinitionsFromBootstrapIfPresent(bootstrapData, now);
  if (storeData && storeData.success) {
    const itemCount = Array.isArray(storeData.items) ? storeData.items.length : 0;
    const offerKeys =
      storeData.offers && typeof storeData.offers === 'object' ? Object.keys(storeData.offers).length : 0;
    // Menu bootstrap includes GET /api/store/catalog (Provisions items + Stockroom offers). Warm StoreDataSources
    // and store state even when items[] is empty but offers exist (bundles/packs live in offers).
    if (itemCount > 0 || offerKeys > 0) {
      let itemsForPrefetch = Array.isArray(storeData.items) ? storeData.items : [];
      if (
        typeof window !== 'undefined' &&
        window.StoreDataSources &&
        typeof window.StoreDataSources.mergeBundlesIntoStoreItems === 'function'
      ) {
        itemsForPrefetch = window.StoreDataSources.mergeBundlesIntoStoreItems(itemsForPrefetch, storeData);
      }
      window.__prefetchedStoreItems =
        itemCount > 0 || itemsForPrefetch.length > 0
          ? { success: true, items: itemsForPrefetch, at: now }
          : { success: true, items: [], at: now };
      window.__prefetchedStoreCatalog = { ...storeData, at: now };
    }
  }
  // Store tabs derive packs/bundles from /api/store/catalog; game-config still supplies badge thresholds/discounts/fees + min balance.
  if (gameConfigData && gameConfigData.success === true && gameConfigData.config) {
    window.__prefetchedGameConfig = { response: gameConfigData, at: now };
  }
  if (tournamentsData && tournamentsData.success && Array.isArray(tournamentsData.tournaments)) {
    window.__prefetchedTournaments = {
      success: true,
      tournaments: tournamentsData.tournaments,
      at: now,
      playerAddress: null,
      playerTicketCount: tournamentsData.playerTicketCount,
    };
  } else {
    window.__prefetchedTournaments = { success: true, tournaments: [], at: now, playerAddress: null };
  }
  // After bootstrap store catalog and tournaments: prefetch "My tournaments" if wallet is connected
  if (typeof window.prefetchMyTournamentsIfStale === 'function') {
    window.prefetchMyTournamentsIfStale();
  }
  if (typeof window.prefetchBadgeIfStale === 'function') {
    window.prefetchBadgeIfStale();
  }

  // Refresh user balances (credits + tournament tickets) on main menu load if wallet is connected.
  // Non-blocking: store/UI can render while this hydrates in background.
  try {
    const address = (window.getWalletAddress && typeof window.getWalletAddress === 'function' && window.getWalletAddress()) ||
      (window.walletAPIInstance && window.walletAPIInstance.isConnected() && window.walletAPIInstance.getAddress());
    if (address && window.GamePassService && typeof window.GamePassService.getGamePassStatus === 'function') {
      window.GamePassService.getGamePassStatus(address, true)
        .then((status) => {
          if (!window._preloadedGamePassStatus) window._preloadedGamePassStatus = {};
          window._preloadedGamePassStatus[address] = status;
        })
        .catch(() => {});
    }
  } catch (_) {}

  if (leaderboardData && leaderboardData.success) {
    const list = Array.isArray(leaderboardData.leaderboard) ? leaderboardData.leaderboard : [];
    const byStat =
      leaderboardData.byStat && typeof leaderboardData.byStat === 'object' && !Array.isArray(leaderboardData.byStat)
        ? leaderboardData.byStat
        : buildLeaderboardByStatFromList(list);
    window.__prefetchedLeaderboard = {
      success: true,
      // Keep `leaderboard` for older callers, but ensure `byStat` exists for modal fast-path.
      leaderboard: list,
      byStat: byStat || null,
      at: now,
      limit: leaderboardData.limit,
    };
  } else {
    window.__prefetchedLeaderboard = { success: true, leaderboard: [], byStat: null, at: now };
  }
}

function beginMenuBootstrapPrefetch(gameApiBase, forceRefresh) {
  const hadTerminalFailure =
    window.__menuBootstrapState?.status === 'error' && window.__menuBootstrapState?.ready !== true;
  if (!forceRefresh && !hadTerminalFailure && window.__menuBootstrapPromise) {
    return window.__menuBootstrapPromise;
  }

  window.__menuBootstrapState = {
    status: 'loading',
    at: Date.now(),
    attempts: forceRefresh ? ((window.__menuBootstrapState?.attempts || 0) + 1) : (window.__menuBootstrapState?.attempts || 1),
    ready: false,
    data: null,
    error: null,
  };

  window.__menuBootstrapPromise = fetch(`${gameApiBase}/menu/bootstrap?ts=${Date.now()}`, { cache: 'no-store' })
    .then((res) => res.ok ? res.json() : null)
    .catch(() => null)
    .then((bootstrapData) => {
      const now = Date.now();
      applyMilestoneDefinitionsFromBootstrapIfPresent(bootstrapData, now);
      const readiness = bootstrapData?.readiness?.blocking || {};
      const ready = Boolean(
        bootstrapData?.ready === true ||
        (readiness.store === true && readiness.tournaments === true)
      );
      if (!bootstrapData?.success || !ready) {
        const reason = bootstrapData?.success
          ? 'Blocking bootstrap dependencies are not ready yet'
          : 'Menu bootstrap failed';
        window.__menuBootstrapState = {
          status: 'error',
          at: now,
          attempts: window.__menuBootstrapState?.attempts || 1,
          ready: false,
          data: bootstrapData || null,
          error: reason,
        };
        return window.__menuBootstrapState;
      }

      applyMenuBootstrapPrefetchData(bootstrapData, now);
      window.__menuBootstrapState = {
        status: 'ready',
        at: now,
        attempts: window.__menuBootstrapState?.attempts || 1,
        ready: true,
        data: bootstrapData,
        error: null,
      };
      return window.__menuBootstrapState;
    })
    .catch((err) => {
      window.__menuBootstrapState = {
        status: 'error',
        at: Date.now(),
        attempts: window.__menuBootstrapState?.attempts || 1,
        ready: false,
        data: null,
        error: err instanceof Error ? err.message : String(err || 'Menu bootstrap failed'),
      };
      return window.__menuBootstrapState;
    });

  return window.__menuBootstrapPromise;
}

async function ensureMenuBootstrapReady(gameApiBase, enterBtn) {
  for (let attempt = 1; attempt <= MENU_BOOTSTRAP_MAX_ATTEMPTS; attempt++) {
    // One HTTP call loads catalog, tournaments, milestones, leaderboard, and game config in parallel;
    // the button can’t know sub-task order client-side—show a single accurate label for this step.
    if (enterBtn) {
      enterBtn.textContent =
        attempt > 1
          ? `Fetching menu data… (retry ${attempt}/${MENU_BOOTSTRAP_MAX_ATTEMPTS})`
          : 'Fetching menu data…';
    }

    setStartScreenProgress(true, Math.min(95, 68 + attempt * 2));
    const state = await beginMenuBootstrapPrefetch(gameApiBase, attempt > 1);

    if (state && state.ready) {
      if (enterBtn) enterBtn.textContent = 'Almost ready…';
      return state;
    }

    if (enterBtn) {
      enterBtn.textContent = `Couldn’t load menu data (retry ${attempt}/${MENU_BOOTSTRAP_MAX_ATTEMPTS})`;
    }
    if (attempt < MENU_BOOTSTRAP_MAX_ATTEMPTS) {
      await sleepUi(MENU_BOOTSTRAP_RETRY_DELAY_MS);
    }
  }
  throw new Error(window.__menuBootstrapState?.error || 'Menu bootstrap did not complete');
}

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
  
  // Prefetch static/catalog data (game-only) so Store and Milestones load fast later
  const gameApiBase = getGameApiBase();

  // Leaderboard: short TTL for new submissions. Tournaments change less often — longer prefetch TTL.
  var LEADERBOARD_PREFETCH_TTL_MS = 30 * 1000;
  var TOURNAMENTS_PREFETCH_TTL_MS = 2 * 60 * 1000;
  if (typeof window !== 'undefined') {
    window.LEADERBOARD_PREFETCH_TTL_MS = LEADERBOARD_PREFETCH_TTL_MS;
    window.TOURNAMENTS_PREFETCH_TTL_MS = TOURNAMENTS_PREFETCH_TTL_MS;

    /** One in-flight merged-list fetch per (base, wallet key); menu + modal share it to avoid duplicate GETs. */
    var tournamentsListPrefetchInFlight = null;
    var tournamentsListPrefetchInflightKey = null;
    var myTournamentsPrefetchInFlight = null;
    var myTournamentsPrefetchInflightKey = null;

    window.prefetchTournamentsIfStale = function prefetchTournamentsIfStale() {
      const base = (window.GAME_CONFIG && (window.GAME_CONFIG.GAME_BACKEND_URL || window.GAME_CONFIG.API_BASE_URL)) || gameApiBase;
      const ttl = window.TOURNAMENTS_PREFETCH_TTL_MS || 120000;
      const prev = window.__prefetchedTournaments;
      const address =
        (window.getWalletAddress && typeof window.getWalletAddress === 'function' && window.getWalletAddress()) ||
        (window.walletAPIInstance && window.walletAPIInstance.isConnected() && window.walletAPIInstance.getAddress()) ||
        null;
      const addrKey = address ? String(address) : '';
      const prevAddr =
        prev && prev.playerAddress != null && prev.playerAddress !== '' ? String(prev.playerAddress) : '';
      if (
        prev &&
        prev.success !== false &&
        prev.at &&
        Date.now() - prev.at < ttl &&
        prevAddr === addrKey
      ) {
        return Promise.resolve();
      }
      const inflightKey = String(base) + '\0' + addrKey;
      if (tournamentsListPrefetchInFlight && tournamentsListPrefetchInflightKey === inflightKey) {
        return tournamentsListPrefetchInFlight;
      }
      const qs = address ? '?playerAddress=' + encodeURIComponent(address) : '';
      const url = base + '/tournaments' + qs;
      var p = fetch(url)
        .then(function (res) {
          return res.ok ? res.json() : null;
        })
        .then(function (data) {
          if (data && data.success && Array.isArray(data.tournaments)) {
            window.__prefetchedTournaments = {
              success: true,
              tournaments: data.tournaments,
              at: Date.now(),
              playerAddress: address || null,
              playerTicketCount: data.playerTicketCount,
            };
          } else {
            window.__prefetchedTournaments = {
              success: true,
              tournaments: [],
              at: Date.now(),
              playerAddress: address || null,
            };
          }
        })
        .catch(function () {
          window.__prefetchedTournaments = {
            success: false,
            tournaments: [],
            at: Date.now(),
            playerAddress: address || null,
          };
        })
        .finally(function () {
          if (tournamentsListPrefetchInFlight === p) {
            tournamentsListPrefetchInFlight = null;
            tournamentsListPrefetchInflightKey = null;
          }
        });
      tournamentsListPrefetchInflightKey = inflightKey;
      tournamentsListPrefetchInFlight = p;
      return p;
    };
    window.prefetchMyTournamentsIfStale = function prefetchMyTournamentsIfStale() {
      const address = (window.getWalletAddress && typeof window.getWalletAddress === 'function' && window.getWalletAddress()) ||
        (window.walletAPIInstance && window.walletAPIInstance.isConnected() && window.walletAPIInstance.getAddress());
      if (!address) return Promise.resolve();
      const base = (window.GAME_CONFIG && (window.GAME_CONFIG.GAME_BACKEND_URL || window.GAME_CONFIG.API_BASE_URL)) || gameApiBase;
      const ttl = window.TOURNAMENTS_PREFETCH_TTL_MS || 120000;
      const prev = window.__prefetchedMyTournaments;
      if (
        prev &&
        prev.success !== false &&
        prev.address === address &&
        prev.at &&
        Date.now() - prev.at < ttl
      ) {
        return Promise.resolve();
      }
      const inflightKey = String(base) + '\0' + String(address);
      if (myTournamentsPrefetchInFlight && myTournamentsPrefetchInflightKey === inflightKey) {
        return myTournamentsPrefetchInFlight;
      }
      var p = fetch(base + '/tournaments/my-tournaments?playerAddress=' + encodeURIComponent(address))
        .then(function (res) {
          return res.ok ? res.json() : null;
        })
        .then(function (data) {
          if (data && data.success && Array.isArray(data.tournaments)) {
            window.__prefetchedMyTournaments = {
              success: true,
              tournaments: data.tournaments,
              address: address,
              at: Date.now(),
              playerTicketCount: data.playerTicketCount,
            };
          } else {
            window.__prefetchedMyTournaments = {
              success: true,
              tournaments: [],
              address: address,
              at: Date.now(),
              playerTicketCount: 0,
            };
          }
        })
        .catch(function () {
          window.__prefetchedMyTournaments = {
            success: false,
            tournaments: [],
            address: address,
            at: Date.now(),
          };
        })
        .finally(function () {
          if (myTournamentsPrefetchInFlight === p) {
            myTournamentsPrefetchInFlight = null;
            myTournamentsPrefetchInflightKey = null;
          }
        });
      myTournamentsPrefetchInflightKey = inflightKey;
      myTournamentsPrefetchInFlight = p;
      return p;
    };
    /** Non-blocking: warm badge + pending-upgrade (same query as loadBadge / menu flow). Deduped in BadgeService in-flight + PU cache. */
    window.prefetchBadgeIfStale = function prefetchBadgeIfStale() {
      const addr = (window.getWalletAddress && typeof window.getWalletAddress === 'function' && window.getWalletAddress()) ||
        (window.walletAPIInstance && window.walletAPIInstance.isConnected() && window.walletAPIInstance.getAddress());
      if (!addr) return;
      const zero = '0x0000000000000000000000000000000000000000000000000000000000000000';
      if (addr === zero || String(addr).toLowerCase() === zero) return;
      if (!window.BadgeService || typeof window.BadgeService.getBadge !== 'function') return;
      window.BadgeService.getBadge(addr, { includePendingUpgrade: true }).catch(function () {});
    };
    window.prefetchLeaderboardIfStale = function prefetchLeaderboardIfStale() {
      var base = (window.GAME_CONFIG && (window.GAME_CONFIG.GAME_BACKEND_URL || window.GAME_CONFIG.API_BASE_URL)) || gameApiBase;
      var ttl = window.LEADERBOARD_PREFETCH_TTL_MS || 30000;
      var prev = window.__prefetchedLeaderboard;
      if (prev && prev.at && (Date.now() - prev.at) < ttl && prev.byStat) return;
      var useMock = window.GAME_CONFIG && window.GAME_CONFIG.USE_MOCK_LEADERBOARD === true;
      // Backend hard-caps to 200; keep it consistent to avoid wasted work.
      var limit = 200;
      var mockParam = useMock ? '&mock=true' : '';
      fetch(base + '/leaderboard?limit=' + limit + mockParam)
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (data) {
          if (data && data.success && Array.isArray(data.leaderboard)) {
            var list = data.leaderboard;
            var byStat =
              data.byStat && typeof data.byStat === 'object' && !Array.isArray(data.byStat)
                ? data.byStat
                : buildLeaderboardByStatFromList(list);
            window.__prefetchedLeaderboard = { success: true, leaderboard: list, byStat: byStat || null, at: Date.now(), limit: data.limit };
          } else {
            window.__prefetchedLeaderboard = { success: true, leaderboard: [], byStat: null, at: Date.now() };
          }
        })
        .catch(function () {
          window.__prefetchedLeaderboard = { success: false, leaderboard: [], byStat: null, at: Date.now() };
        });
    };
  }

  // Kick bootstrap prefetch early; Enter flow will gate on readiness before opening the main menu.
  beginMenuBootstrapPrefetch(gameApiBase).catch(() => {});

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
    newBtn.textContent = 'Preparing…';
    setStartScreenProgress(true, 10);
    
    // CRITICAL: Wait for CSS to load before showing menu
    log.debug('UI INIT', 'Ensuring CSS is loaded before showing menu...');
    log.debug('UI INIT', 'CSSLoader available', typeof window.CSSLoader !== 'undefined');
    log.debug('UI INIT', 'CSSLoader.isLoaded', window.CSSLoader?.isLoaded);
    
    // Wait for CSSLoader to become available (it's loaded by loadDeferredScripts)
    let attempts = 0;
    while (attempts < 40 && typeof window.CSSLoader === 'undefined') {
      if (attempts === 0) newBtn.textContent = 'Waiting for style loader…';
      await new Promise(resolve => setTimeout(resolve, 50));
      attempts++;
    }
    
    // If CSSLoader is available but not initialized, initialize it
    if (typeof window.CSSLoader !== 'undefined' && typeof window.CSSLoader.init === 'function') {
      if (!window.CSSLoader.isLoaded) {
        log.debug('UI INIT', 'CSS not loaded yet, initializing CSS loader now...');
        newBtn.textContent = 'Loading styles…';
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
    setStartScreenProgress(true, 25);
    
    // Load only menu scripts (much faster - only ~17 scripts instead of 77)
    if (typeof window.loadMenuScripts === 'function') {
      try {
        log.debug('UI INIT', 'Loading menu scripts (needed for main menu)...');
        log.debug('UI INIT', 'Menu scripts to load', window.MENU_SCRIPTS?.length || 'unknown');
        newBtn.textContent = 'Loading menu scripts…';
        const startTime = performance.now();
        await window.loadMenuScripts();
        setStartScreenProgress(true, 45);
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
    setStartScreenProgress(true, 55);
    
    // CRITICAL: Wait for wallet API to be ready before showing menu
    log.debug('UI INIT', 'Waiting for wallet API to be ready...');
    // In-app wallet adapter / UI loading — not the user connecting a wallet yet
    newBtn.textContent = 'Loading wallet support…';
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
      if (walletAttempts % 4 === 0) {
        setStartScreenProgress(true, Math.min(64, 55 + Math.floor(walletAttempts / 10)));
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
    setStartScreenProgress(true, 65);

    // Block menu transition until store catalog + tournaments are ready (bootstrap polls until both succeed).
    try {
      setStartScreenProgress(true, 66);
      const stopCreep = startStartScreenProgressCreep(66, 93, { stepMs: 400, step: 1.15 });
      try {
        await ensureMenuBootstrapReady(getGameApiBase(), newBtn);
      } finally {
        stopCreep();
      }
      setStartScreenProgress(true, 100);
      log.debug('UI INIT', 'Menu bootstrap ready');
    } catch (bootstrapErr) {
      log.error('UI INIT', 'Menu bootstrap not ready; keeping start screen visible', bootstrapErr);
      setStartScreenProgress(false, 0);
      newBtn.disabled = false;
      newBtn.textContent = 'Retry Loading';
      return;
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
    // `resumeAudioContext` was a legacy name; the current audio system uses AudioManager.resumeContext().
    try {
      if (typeof getGameAudio === 'function') {
        const a = getGameAudio();
        if (a && typeof a.resumeContext === 'function') a.resumeContext();
      }
    } catch (_) {}
    // Menu music starts when the menu is shown (MenuService.show is the single source of truth).
    
    // Re-enable button
    newBtn.disabled = false;
    newBtn.textContent = '🎮 Enter Game';
    setStartScreenProgress(false, 0);
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

  // Game Pass / store footer credits & tickets: styled in store-inventory-ui.css (loaded by CSSLoader with shared CSS).
}
