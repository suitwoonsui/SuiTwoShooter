// ==========================================
// TOURNAMENT CREATION MODAL
// Multi-step wizard for creating tournaments
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

  log.info('TOURNAMENT CREATION', 'Tournament creation modal module loaded');

  // Expose loadAndRenderDefaultRewardsPreview to window for inline script access
  if (typeof window !== 'undefined') {
    window.loadAndRenderDefaultRewardsPreview = loadAndRenderDefaultRewardsPreview;
  }

// Tournament categories
// Use var to allow redeclaration when multiple scripts are loaded in the same global scope
// Check if already defined (e.g., by tournament-modal.js)
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

// Available items for rewards
const AVAILABLE_ITEMS = [
  { id: 'random', name: 'Random L1 Item', levels: [1], special: false }, // Resolved at distribution time
  { id: 'orb_level', name: 'Orb Level', levels: [1, 2, 3] },
  { id: 'force_field', name: 'Force Field', levels: [1, 2, 3] },
  { id: 'extra_lives', name: 'Extra Lives', levels: [1, 2, 3] },
  { id: 'slow_time', name: 'Slow Time', levels: [1, 2, 3] },
  { id: 'coin_tractor_beam', name: 'Coin Tractor Beam', levels: [1, 2, 3] },
  { id: 'destroy_all', name: 'Destroy All Enemies', levels: [], special: true },
  { id: 'boss_kill_shot', name: 'Boss Kill Shot', levels: [], special: true },
];

// Wizard state
let wizardState = {
  currentStep: 1,
  totalSteps: 7,
  tournamentData: {
    name: '',
    category: null,
    startTime: null,
    endTime: null,
    entryFeeTickets: 1,
    rewardConfig: null, // null = default, or TournamentRewardConfig object
    startingAnteUSDCents: 0,
    startingAnteToken: 'SUI', // User-selected token for ante input/quote display
    paymentToken: 'SUI',
  },
  rewardCost: null,
  badgeDiscount: 0,
  randomItemLevel: 1, // Default level for randomized items (1, 2, or 3)
  loading: false,
  error: null,
  /** Preloaded when modal opens so Rewards step shows immediately */
  defaultRewardConfigForDisplay: null,
  /** Token prices for ante/payment conversion (sui, mews, usdc in USD) */
  prices: null,
  decimals: null,
  /** Ante input mode: 'usd' = enter dollars, 'token' = enter token amount */
  anteInputMode: 'usd',
};

/** Last time we showed the "connect wallet" alert (ms). Used to show only one reminder even if button fires multiple times. */
var _lastConnectWalletAlertAt = 0;
var _CONNECT_WALLET_ALERT_THROTTLE_MS = 2000;

/**
 * Show tournament creation modal
 */
async function showTournamentCreation() {
  log.info('TOURNAMENT CREATION', 'showTournamentCreation() called');
  
  // Check wallet connection — single reminder only (throttled so one alert even on double/triple click)
  const walletAddress = getWalletAddress();
  if (!walletAddress) {
    const now = typeof Date.now === 'function' ? Date.now() : 0;
    if (now - _lastConnectWalletAlertAt >= _CONNECT_WALLET_ALERT_THROTTLE_MS) {
      _lastConnectWalletAlertAt = now;
      alert('Please connect your wallet to create a tournament.');
    }
    return;
  }

  // Reset wizard state
  wizardState = {
    currentStep: 1,
    totalSteps: 7,
    tournamentData: {
      name: '',
      category: null,
      startTime: null,
      endTime: null,
      entryFeeTickets: 1,
      rewardConfig: null,
      startingAnteUSDCents: 0,
      startingAnteToken: 'SUI',
      paymentToken: 'SUI',
    },
    rewardCost: null,
    badgeDiscount: 0,
    randomItemLevel: 1, // Default level for randomized items
    loading: false,
    error: null,
    defaultRewardConfigForDisplay: null,
    prices: null,
    decimals: null,
    anteInputMode: 'usd',
  };

  // Load badge discount and preload default rewards (so Rewards step is ready when user reaches it)
  await loadBadgeDiscount(walletAddress);
  getDefaultRewardConfigForDisplay().then((config) => {
    wizardState.defaultRewardConfigForDisplay = config;
    log.info('TOURNAMENT CREATION', 'Default rewards preloaded');
  }).catch((err) => {
    log.warn('TOURNAMENT CREATION', 'Default rewards preload failed (will load on Rewards step)', err);
  });

  // Create modal
  const viewportContainer = document.querySelector('.viewport-container');
  if (!viewportContainer) {
    console.error('❌ [TOURNAMENT CREATION] Viewport container not found!');
    return;
  }

  // Remove existing modal if present
  const existingModal = document.getElementById('tournamentCreationModal');
  if (existingModal) {
    existingModal.remove();
  }

  const modal = document.createElement('div');
  modal.className = 'tournament-creation-modal tournament-creation-modal-visible';
  modal.setAttribute('id', 'tournamentCreationModal');

  modal.innerHTML = createModalHTML();
  viewportContainer.appendChild(modal);

  // Render initial step
  renderStep(1);

  // Attach event listeners
  attachEventListeners();
}

// Expose to window immediately after function declaration to prevent race conditions
if (typeof window !== 'undefined') {
  window.showTournamentCreation = showTournamentCreation;
}

/**
 * Create modal HTML structure
 */
function createModalHTML() {
  return `
    <div class="tournament-creation-content">
      <!-- Header -->
      <div class="tournament-creation-header">
        <h2>🏆 Create Tournament</h2>
        <button class="tournament-creation-close" onclick="closeTournamentCreation()">×</button>
      </div>

      <!-- Progress Bar -->
      <div class="tournament-creation-progress">
        ${Array.from({ length: wizardState.totalSteps }, (_, i) => `
          <div class="progress-step ${i + 1 === wizardState.currentStep ? 'active' : ''} ${i + 1 < wizardState.currentStep ? 'completed' : ''}">
            <div class="progress-step-number">${i + 1}</div>
            <div class="progress-step-label">${getStepLabel(i + 1)}</div>
          </div>
        `).join('')}
      </div>

      <!-- Step Content -->
      <div class="tournament-creation-step-content" id="tournamentCreationStepContent">
        <!-- Step content will be rendered here -->
      </div>

      <!-- Error Message -->
      <div class="tournament-creation-error" id="tournamentCreationError" style="display: none;"></div>

      <!-- Item Selector Modal -->
      <div class="item-selector-modal" id="itemSelectorModal" style="display: none;">
        <div class="item-selector-overlay" onclick="closeItemSelector()"></div>
        <div class="item-selector-content">
          <div class="item-selector-header">
            <h3>Add Reward Item</h3>
            <button class="item-selector-close" onclick="closeItemSelector()">×</button>
          </div>
          <div class="item-selector-body">
            <div class="item-selector-field">
              <label>Item:</label>
              <select id="itemSelectorItem" class="tournament-creation-input">
                <option value="">Select an item...</option>
                ${AVAILABLE_ITEMS.map(item => `
                  <option value="${item.id}">${item.name}</option>
                `).join('')}
              </select>
            </div>
            <div class="item-selector-field">
              <label>Level:</label>
              <select id="itemSelectorLevel" class="tournament-creation-input" disabled>
                <option value="">Select item first...</option>
              </select>
            </div>
            <div class="item-selector-field">
              <label>Quantity:</label>
              <input type="number" id="itemSelectorQuantity" class="tournament-creation-input" min="1" value="1" />
            </div>
          </div>
          <div class="item-selector-footer">
            <button class="tournament-creation-btn secondary" onclick="closeItemSelector()">Cancel</button>
            <button class="tournament-creation-btn primary" onclick="confirmAddItem()" id="confirmAddItemBtn" disabled>Add Item</button>
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <div class="tournament-creation-navigation">
        <button class="tournament-creation-btn secondary" id="tournamentCreationBackBtn" onclick="tournamentCreationPreviousStep()" style="display: none;">
          ← Back
        </button>
        <button class="tournament-creation-btn primary" id="tournamentCreationNextBtn" onclick="tournamentCreationNextStep()">
          Next →
        </button>
      </div>
    </div>
  `;
}

/**
 * Get step label
 */
function getStepLabel(step) {
  const labels = {
    1: 'Name',
    2: 'Category',
    3: 'Schedule',
    4: 'Entry Fee',
    5: 'Ante',
    6: 'Rewards',
    7: 'Review',
  };
  return labels[step] || `Step ${step}`;
}

/**
 * Render current step
 */
function renderStep(step) {
  wizardState.currentStep = step;
  const stepContent = document.getElementById('tournamentCreationStepContent');
  if (!stepContent) return;

  // Update progress bar
  updateProgressBar();

  // Update navigation buttons
  updateNavigationButtons();

  // Render step content
  switch (step) {
    case 1:
      stepContent.innerHTML = renderStep1Name();
      break;
    case 2:
      stepContent.innerHTML = renderStep2Category();
      break;
    case 3:
      stepContent.innerHTML = renderStep3Schedule();
      break;
    case 4:
      stepContent.innerHTML = renderStep4EntryFee();
      break;
    case 5:
      stepContent.innerHTML = renderStep6Ante();
      break;
    case 6:
      stepContent.innerHTML = renderStep5Rewards();
      // Load default rewards preview if default mode is selected
      setTimeout(() => {
        loadAndRenderDefaultRewardsPreview();
      }, 100);
      break;
    case 7:
      stepContent.innerHTML = renderStep7Review();
      break;
    default:
      stepContent.innerHTML = '<p>Unknown step</p>';
  }

  // Re-attach event listeners for this step
  attachStepEventListeners(step);
}

/**
 * Step 1: Tournament Name
 */
function renderStep1Name() {
  return `
    <div class="tournament-creation-step">
      <h3>Tournament Name</h3>
      <p>Choose a name for your tournament</p>
      <input 
        type="text" 
        id="tournamentNameInput" 
        class="tournament-creation-input" 
        placeholder="e.g., Weekly High Score Challenge"
        value="${wizardState.tournamentData.name}"
        maxlength="100"
      />
      <p class="tournament-creation-hint">Maximum 100 characters</p>
    </div>
  `;
}

/**
 * Step 2: Category
 */
function renderStep2Category() {
  const categories = Object.entries(TOURNAMENT_CATEGORIES);
  return `
    <div class="tournament-creation-step">
      <h3>Tournament Category</h3>
      <p>Select what players will compete for</p>
      <div class="tournament-creation-category-grid">
        ${categories.map(([key, cat]) => `
          <div 
            class="tournament-creation-category-card ${wizardState.tournamentData.category === key ? 'selected' : ''}"
            data-category="${key}"
            onclick="selectTournamentCategory('${key}')"
          >
            <div class="category-icon">${cat.icon}</div>
            <div class="category-name">${cat.name}</div>
            <div class="category-description">${cat.description}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

/**
 * Step 3: Schedule
 */
function renderStep3Schedule() {
  const now = new Date();
  const defaultStart = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
  const defaultEnd = new Date(defaultStart.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days later

  const formatDateTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  return `
    <div class="tournament-creation-step">
      <h3>Tournament Schedule</h3>
      <p>Set when your tournament starts and ends</p>
      <div class="tournament-creation-schedule">
        <div class="schedule-field">
          <label>Start Time</label>
          <input 
            type="datetime-local" 
            id="tournamentStartTimeInput" 
            class="tournament-creation-input"
            value="${formatDateTime(wizardState.tournamentData.startTime || defaultStart)}"
            min="${formatDateTime(now)}"
          />
        </div>
        <div class="schedule-field">
          <label>End Time</label>
          <input 
            type="datetime-local" 
            id="tournamentEndTimeInput" 
            class="tournament-creation-input"
            value="${formatDateTime(wizardState.tournamentData.endTime || defaultEnd)}"
            min="${formatDateTime(now)}"
          />
        </div>
      </div>
      <p class="tournament-creation-hint">Tournament must start in the future and end after it starts</p>
    </div>
  `;
}

/**
 * Step 4: Entry Fee
 */
function renderStep4EntryFee() {
  return `
    <div class="tournament-creation-step">
      <h3>Entry Fee</h3>
      <p>How many tournament tickets are required to enter?</p>
      <input 
        type="number" 
        id="tournamentEntryFeeInput" 
        class="tournament-creation-input" 
        min="1"
        value="${wizardState.tournamentData.entryFeeTickets}"
      />
      <p class="tournament-creation-hint">Players need this many tournament tickets to enter</p>
    </div>
  `;
}

/**
 * Step 5: Rewards Configuration
 */
function renderStep5Rewards() {
  // Default mode: rewardConfig exists but was initialized from defaults (editable)
  // Custom mode: rewardConfig exists and was manually configured
  // We track this with a flag, but for now, if rewardConfig exists, it's editable
  const useDefault = wizardState.tournamentData.rewardConfig === null || 
                     (wizardState.tournamentData.rewardConfig && 
                      wizardState.tournamentData.rewardConfig._isDefault !== false);
  
  return `
    <div class="tournament-creation-step">
      <h3>Reward Configuration</h3>
      <p>Choose default rewards or configure custom rewards</p>
      
      <div class="tournament-creation-reward-choice">
        <div class="reward-choice-card ${useDefault ? 'selected' : ''}" onclick="selectDefaultRewards()">
          <h4>Use Default Rewards</h4>
          <p>Standard tournament reward system (set by admin):</p>
          <ul>
            <li>Top 3: MEWS tokens (50%, 30%, 20%)</li>
            <li>Top 10: Items (rank-based)</li>
            <li>No additional cost</li>
            <li>Cannot be customized by users</li>
          </ul>
        </div>
        
        <div class="reward-choice-card ${!useDefault ? 'selected' : ''}" onclick="selectCustomRewards()">
          <h4>Configure Custom Rewards</h4>
          <p>Full control over rewards:</p>
          <ul>
            <li>Set reward depth</li>
            <li>Configure items per rank</li>
            <li>Set pool rewards</li>
            <li>Payment required for rewards</li>
          </ul>
        </div>
      </div>

      ${useDefault ? `
        <div id="defaultRewardsPreview" style="margin-top: 20px; padding: 1rem; background: rgba(0, 0, 0, 0.3); border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.1);">
          <h4 style="margin-top: 0; color: #d4af37;">Default Rewards Preview</h4>
          <p style="color: #ccc; font-size: 0.9em; margin-bottom: 1rem;">
            These are the default rewards configured by administrators. You cannot edit them.
          </p>
          <div class="default-rewards-content" id="defaultRewardsContent">
            ${wizardState.defaultRewardConfigForDisplay
              ? renderItemRewardsByRank(wizardState.defaultRewardConfigForDisplay.itemRewards, wizardState.defaultRewardConfigForDisplay.rewardDepth, true)
              : '<div style="color: #ccc; text-align: center; padding: 1rem;">Loading default rewards...</div>'}
          </div>
        </div>
      ` : `
        <div id="customRewardsConfig" style="display: block; margin-top: 20px;">
          ${renderCustomRewardsConfig(false)}
        </div>
      `}
    </div>
  `;
}

/**
 * Get items that have 3 levels (exclude special items)
 */
function getRandomizableItems() {
  return AVAILABLE_ITEMS
    .filter(item => item.levels && item.levels.length === 3)
    .map(item => item.id);
}

/**
 * Generate default reward config structure for display
 * Fetches from admin-configured defaults or uses system defaults
 */
async function getDefaultRewardConfigForDisplay() {
  try {
    // Try to fetch admin-configured defaults (from game backend).
    const rawBase =
      (window.GameApi && typeof window.GameApi.getBaseUrl === 'function'
        ? window.GameApi.getBaseUrl()
        : (window.GAME_CONFIG?.GAME_BACKEND_URL || window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3001'));

    // Frontend must call the game backend, which exposes API routes under `/api/...`.
    // Normalize so we always hit `/api/admin/...` (not `/admin/...`).
    const base = String(rawBase || '').replace(/\/+$/, '');
    const apiBase = /\/api$/i.test(base) ? base : `${base}/api`;
    const response = await fetch(`${apiBase}/admin/tournaments/default-sustain-config`);
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.config) {
        return data.config;
      }
    }
  } catch (error) {
    log.warn('TOURNAMENT CREATION', 'Failed to fetch admin-configured defaults, using system defaults', error);
  }
  
  // Fall back to system defaults
  // Use the documented default reward structure
  // "random" is resolved at distribution time, not at display time
  const itemRewards = {
    1: [
      { itemId: 'destroy_all', quantity: 1 },
      { itemId: 'boss_kill_shot', quantity: 1 },
      { itemId: 'random', level: 1, quantity: 1 },
    ],
    2: [
      { itemId: 'boss_kill_shot', quantity: 1 },
      { itemId: 'random', level: 1, quantity: 1 },
    ],
    3: [
      { itemId: 'destroy_all', quantity: 1 },
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
    poolSource: 0,
    itemRewards
  };
}

/**
 * Render custom rewards configuration
 * @param isDefaultMode - If true, this is default rewards mode (read-only for users)
 */
function renderCustomRewardsConfig(isDefaultMode = false) {
  // Default mode should not show this - it shows preview instead
  // This is only for custom rewards
  const config = wizardState.tournamentData.rewardConfig || {
    rewardDepth: 10,
    poolDepth: 3,
    poolDistribution: [50, 30, 20],
    poolSource: 0,
    itemRewards: {},
  };

  return `
    <div class="custom-rewards-config">
      <div class="reward-config-section">
        <label>Reward Depth (how many players get items)</label>
        <input 
          type="number" 
          id="rewardDepthInput" 
          class="tournament-creation-input" 
          min="1" 
          max="255"
          value="${config.rewardDepth}"
          onchange="updateRewardDepth(this.value)"
        />
      </div>

      <div class="reward-config-section">
        <label>Pool Depth (how many players get MEWS tokens)</label>
        <input 
          type="number" 
          id="poolDepthInput" 
          class="tournament-creation-input" 
          min="1" 
          max="255"
          value="${config.poolDepth}"
          onchange="updatePoolDepth(this.value)"
        />
      </div>

      <div class="reward-config-section">
        <label>Pool Distribution (%)</label>
        <div id="poolDistributionInputs">
          ${config.poolDistribution.map((pct, idx) => `
            <input 
              type="number" 
              class="tournament-creation-input pool-dist-input" 
              min="0" 
              max="100"
              value="${pct}"
              data-rank="${idx + 1}"
              onchange="updatePoolDistribution(${idx + 1}, this.value)"
            />
          `).join('')}
        </div>
        <p class="tournament-creation-hint">Must sum to 100%</p>
      </div>

      <div class="reward-config-section">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <label>Item Rewards (per rank)</label>
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <label style="font-size: 0.875rem; color: #ccc;">Random Level:</label>
            <select 
              id="randomItemLevelSelect" 
              class="tournament-creation-input" 
              style="padding: 0.25rem 0.5rem; font-size: 0.875rem; width: auto;"
            >
              <option value="1" ${wizardState.randomItemLevel === 1 ? 'selected' : ''}>Level 1</option>
              <option value="2" ${wizardState.randomItemLevel === 2 ? 'selected' : ''}>Level 2</option>
              <option value="3" ${wizardState.randomItemLevel === 3 ? 'selected' : ''}>Level 3</option>
            </select>
            <button 
              type="button" 
              class="randomize-items-btn" 
              onclick="randomizeAllItems()"
              style="padding: 0.25rem 0.75rem; font-size: 0.875rem; background: #4a5568; color: #fff; border: 1px solid #718096; border-radius: 4px; cursor: pointer;"
            >
              🎲 Randomize All Items
            </button>
          </div>
        </div>
        <div id="itemRewardsConfig">
          ${renderItemRewardsByRank(config.itemRewards || {}, config.rewardDepth)}
        </div>
      </div>

      ${wizardState.rewardCost ? `
        <div class="reward-cost-display">
          <h4>Reward Cost</h4>
          <p>Base Cost: $${wizardState.rewardCost.baseCost.toFixed(2)}</p>
          <p>Special Items: $${wizardState.rewardCost.specialItemCost.toFixed(2)}</p>
          <p>Level 2+: $${wizardState.rewardCost.level2PlusCost.toFixed(2)}</p>
          <p><strong>Total: $${wizardState.rewardCost.totalCost.toFixed(2)}</strong></p>
          <p>Discount: ${wizardState.rewardCost.discountApplied}% base + ${wizardState.rewardCost.badgeDiscountApplied}% badge</p>
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Render default rewards preview
 * Note: This is async but called from template string, so we'll use a placeholder
 * and update it after render
 */
function renderDefaultRewardsPreview() {
  // Return placeholder - will be updated by async function
  return '<div class="default-rewards-loading">Loading default rewards...</div>';
}

/**
 * Load and render default rewards preview (async).
 * Uses preloaded config from wizardState.defaultRewardConfigForDisplay when available.
 */
async function loadAndRenderDefaultRewardsPreview() {
  const previewDiv = document.getElementById('defaultRewardsPreview');
  if (!previewDiv) return;
  
  const configDiv = previewDiv.querySelector('.default-rewards-content');
  if (!configDiv) return;
  
  if (wizardState.defaultRewardConfigForDisplay) {
    configDiv.innerHTML = renderItemRewardsByRank(
      wizardState.defaultRewardConfigForDisplay.itemRewards,
      wizardState.defaultRewardConfigForDisplay.rewardDepth,
      true
    );
    return;
  }
  
  try {
    const defaultConfig = await getDefaultRewardConfigForDisplay();
    wizardState.defaultRewardConfigForDisplay = defaultConfig;
    configDiv.innerHTML = renderItemRewardsByRank(defaultConfig.itemRewards, defaultConfig.rewardDepth, true);
  } catch (error) {
    log.error('TOURNAMENT CREATION', 'Failed to load default rewards preview', error);
    configDiv.innerHTML = '<div style="color: #ff6b6b;">Failed to load default rewards preview</div>';
  }
}

/**
 * Render item rewards by rank
 */
function renderItemRewardsByRank(itemRewards, rewardDepth, isReadOnly = false) {
  let html = '';
  for (let rank = 1; rank <= rewardDepth; rank++) {
    const items = itemRewards[rank] || [];
    html += `
      <div class="rank-rewards" data-rank="${rank}">
        <h5>Rank ${rank} Rewards</h5>
        <div class="rank-items">
          ${items.map((item, idx) => `
            <span class="item-tag">
              ${getItemDisplayName(item.itemId)} L${item.level} x${item.quantity}
              ${!isReadOnly ? `<button onclick="removeItemFromRank(${rank}, ${idx})">×</button>` : ''}
            </span>
          `).join('')}
          ${!isReadOnly ? `
            <button class="add-item-btn" onclick="showItemSelector(${rank})">+ Add Item</button>
            <button class="add-random-item-btn" onclick="addRandomItemToRank(${rank})" style="margin-left: 0.5rem; padding: 0.25rem 0.5rem; font-size: 0.875rem; background: #4a5568; color: #fff; border: 1px solid #718096; border-radius: 4px; cursor: pointer;">
              🎲 Add Random Item
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }
  return html;
}

/**
 * Get item display name
 */
function getItemDisplayName(itemId) {
  const item = AVAILABLE_ITEMS.find(i => i.id === itemId);
  return item ? item.name : itemId;
}

/**
 * Fetch token prices for ante/payment conversion
 */
async function fetchTournamentPrices() {
  if (wizardState.prices && wizardState.decimals) return;
  try {
    // Always use the game backend as the API surface; it proxies platform calls as needed.
    const API_BASE_URL = window.GameApi ? window.GameApi.getBaseUrl() : (window.GAME_CONFIG?.GAME_BACKEND_URL || window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3001/api');
    const res = await fetch(`${API_BASE_URL}/prices/tokens`);
    const data = await res.json();
    if (data.success && data.prices) {
      wizardState.prices = data.prices;
      wizardState.decimals = data.decimals || { SUI: 9, MEWS: 6, USDC: 6 };
    }
  } catch (e) {
    log.warn('TOURNAMENT CREATION', 'Failed to fetch prices', e);
  }
}

/**
 * Convert USD cents to human token amount for display
 */
function usdCentsToTokenHuman(usdCents, token) {
  if (!wizardState.prices || !wizardState.decimals) return null;
  const price = token === 'SUI' ? wizardState.prices.sui : token === 'MEWS' ? wizardState.prices.mews : wizardState.prices.usdc;
  const dec = wizardState.decimals[token] || 9;
  if (!price || price <= 0) return null;
  const human = (usdCents / 100) / price;
  return human;
}

/**
 * Convert human token amount to USD cents
 */
function tokenHumanToUsdCents(tokenHuman, token) {
  if (!wizardState.prices || !wizardState.decimals) return 0;
  const price = token === 'SUI' ? wizardState.prices.sui : token === 'MEWS' ? wizardState.prices.mews : wizardState.prices.usdc;
  if (!price || price <= 0) return 0;
  return Math.round(tokenHuman * price * 100);
}

/**
 * Format token amount for display
 */
function formatTokenDisplay(human, token) {
  if (human == null || human === 0) return '0';
  const dec = token === 'SUI' ? 6 : token === 'USDC' ? 2 : 4;
  return Number(human).toFixed(dec);
}

/**
 * Step 6: Starting Ante
 */
function renderStep6Ante() {
  const anteCents = wizardState.tournamentData.startingAnteUSDCents || 0;
  const anteUSD = anteCents / 100;
  const anteToken = wizardState.tournamentData.startingAnteToken || 'SUI';
  const mode = wizardState.anteInputMode || 'usd';
  const tokenHuman = usdCentsToTokenHuman(anteCents, anteToken);
  const tokenDisplay = tokenHuman != null ? formatTokenDisplay(tokenHuman, anteToken) : '—';
  return `
    <div class="tournament-creation-step">
      <h3>Starting Prize Pool Contribution</h3>
      <p>Add to the prize pool (optional). Enter amount in <strong>$ USD</strong> or <strong>token amount</strong>.</p>
      <div class="tournament-creation-ante-row">
        <div class="tournament-creation-ante-amount-field">
          <label class="tournament-creation-ante-label">Enter amount in</label>
          <div class="tournament-creation-ante-mode" style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
            <label style="display: flex; align-items: center; gap: 0.35rem; cursor: pointer; color: #ccc;">
              <input type="radio" name="anteMode" value="usd" ${mode === 'usd' ? 'checked' : ''} />
              <span>$ USD</span>
            </label>
            <label style="display: flex; align-items: center; gap: 0.35rem; cursor: pointer; color: #ccc;">
              <input type="radio" name="anteMode" value="token" ${mode === 'token' ? 'checked' : ''} />
              <span>Token amount</span>
            </label>
          </div>
          ${mode === 'usd' ? `
            <input type="number" id="tournamentAnteInput" class="tournament-creation-input" min="0" step="0.01" placeholder="0.00" value="${anteUSD > 0 ? anteUSD.toFixed(2) : ''}" aria-label="Ante in US dollars" />
            <p class="tournament-creation-hint" id="anteConversionLine">${anteCents > 0 && tokenDisplay !== '—' ? `≈ ${tokenDisplay} ${anteToken}` : ''}</p>
          ` : `
            <input type="number" id="tournamentAnteTokenInput" class="tournament-creation-input" min="0" step="0.000001" placeholder="0" value="${tokenHuman > 0 ? String(tokenHuman) : ''}" aria-label="Ante in token amount" />
            <p class="tournament-creation-hint" id="anteConversionLine">${anteCents > 0 ? `≈ $${anteUSD.toFixed(2)} USD` : ''}</p>
          `}
        </div>
        <div class="tournament-creation-ante-token-field">
          <label for="tournamentAnteTokenSelect" class="tournament-creation-ante-label">Input token</label>
          <select id="tournamentAnteTokenSelect" class="tournament-creation-input tournament-creation-ante-token-select" aria-label="Token used to quote ante value">
            <option value="SUI" ${anteToken === 'SUI' ? 'selected' : ''}>SUI</option>
            <option value="MEWS" ${anteToken === 'MEWS' ? 'selected' : ''}>MEWS</option>
            <option value="USDC" ${anteToken === 'USDC' ? 'selected' : ''}>USDC</option>
          </select>
        </div>
      </div>
      <p class="tournament-creation-hint">
        This ante is separate from the creation fee. Ante goes into the prize pool vault; creation fee ($5.00) goes to operations and does not enter the prize pool.
      </p>
      ${anteCents > 0 ? `
        <p class="tournament-creation-hint" style="margin-top: 0.5rem; font-style: italic;">
          <strong>Important:</strong> Ante payment is converted to <strong>MEWS</strong> for pool vault deposit, regardless of payment token.
        </p>
      ` : ''}
    </div>
  `;
}

/**
 * Format payment line with USD and token conversion for display
 */
function formatPaymentLineUsdAndToken(usdCents, token) {
  const usd = (usdCents / 100).toFixed(2);
  if (!wizardState.prices || !token) return `$${usd}`;
  const human = usdCentsToTokenHuman(usdCents, token);
  if (human == null) return `$${usd}`;
  return `$${usd} (≈ ${formatTokenDisplay(human, token)} ${token})`;
}

/**
 * Whether user selected custom rewards (reward cost applies). Default rewards have no cost.
 */
function isCustomRewards() {
  const r = wizardState.tournamentData.rewardConfig;
  return r != null && r._isDefault === false;
}

/**
 * Step 7: Review & Payment
 */
function renderStep7Review() {
  const totalPayment = calculateTotalPayment();
  const category = TOURNAMENT_CATEGORIES[wizardState.tournamentData.category];
  const creationFeeCents = 500; // $5.00
  const anteCents = wizardState.tournamentData.startingAnteUSDCents || 0;
  const paymentToken = wizardState.tournamentData.paymentToken || 'SUI';
  const anteToken = 'MEWS';
  const creationFeeLine = formatPaymentLineUsdAndToken(creationFeeCents, paymentToken);
  const anteLine = anteCents > 0 ? formatPaymentLineUsdAndToken(anteCents, anteToken) : '$0.00';
  const customRewards = isCustomRewards();
  const rewardCostCents = customRewards && wizardState.rewardCost ? Math.round(wizardState.rewardCost.totalCost * 100) : 0;
  const rewardCostLine = rewardCostCents > 0 ? formatPaymentLineUsdAndToken(rewardCostCents, paymentToken) : null;
  const paymentInTokenCents = creationFeeCents + rewardCostCents;
  const paymentInTokenHuman = wizardState.prices && paymentInTokenCents > 0 ? usdCentsToTokenHuman(paymentInTokenCents, paymentToken) : null;
  const paymentInTokenDisplay = paymentInTokenHuman != null ? formatTokenDisplay(paymentInTokenHuman, paymentToken) : null;
  
  return `
    <div class="tournament-creation-step">
      <h3>Review & Payment</h3>
      
      <div class="review-section">
        <h4>Tournament Details</h4>
        <p><strong>Name:</strong> ${wizardState.tournamentData.name}</p>
        <p><strong>Category:</strong> ${category ? category.icon + ' ' + category.name : 'N/A'}</p>
        <p><strong>Start:</strong> ${formatDateTime(wizardState.tournamentData.startTime)}</p>
        <p><strong>End:</strong> ${formatDateTime(wizardState.tournamentData.endTime)}</p>
        <p><strong>Entry Fee:</strong> ${wizardState.tournamentData.entryFeeTickets} ticket(s)</p>
        <p><strong>Starting Ante:</strong> ${anteCents > 0 ? formatPaymentLineUsdAndToken(anteCents, anteToken) : '$0.00'}</p>
      </div>

      <div class="review-section">
        <h4>Payment Summary</h4>
        <p>Creation Fee: ${creationFeeLine} <span style="color: #888;">(pay in selected token below)</span></p>
        <p>Starting Ante: ${anteLine} <span style="color: #888;">(deposited to vault as MEWS)</span></p>
        ${rewardCostLine != null ? `<p>Reward Cost (custom): ${rewardCostLine}</p>` : '<p>Reward Cost: $0.00 <span style="color: #888;">(default rewards — no cost)</span></p>'}
        <p><strong>Total: $${totalPayment.toFixed(2)}</strong></p>
      </div>

      <div class="review-section">
        <label>Creation fee &amp; rewards payment token</label>
        <select id="paymentTokenSelect" class="tournament-creation-input">
          <option value="SUI" ${paymentToken === 'SUI' ? 'selected' : ''}>SUI</option>
          <option value="MEWS" ${paymentToken === 'MEWS' ? 'selected' : ''}>MEWS</option>
          <option value="USDC" ${paymentToken === 'USDC' ? 'selected' : ''}>USDC</option>
        </select>
        ${paymentInTokenDisplay != null ? `
          <p class="tournament-creation-hint" style="margin-top: 0.5rem; color: #d4af37;">
            You will pay: <strong>${paymentInTokenDisplay} ${paymentToken}</strong> ($${(paymentInTokenCents / 100).toFixed(2)} USD) for creation fee${rewardCostCents > 0 ? ' and custom rewards' : ''}.
          </p>
        ` : `
          <p class="tournament-creation-hint" style="margin-top: 0.25rem;">Token used to pay the creation fee${customRewards && rewardCostCents > 0 ? ' and custom reward cost' : ''}. Ante is always funded to the vault in MEWS.</p>
        `}
        <div id="paymentTokenBalance" class="payment-token-balance" style="margin-top: 0.5em; font-size: 0.9em; color: #d4af37;">
          <span class="balance-loading" style="display: none;">Loading balance...</span>
          <span class="balance-amount" style="display: none;"></span>
          <span class="balance-error" style="display: none; color: #ff6b6b;"></span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Calculate total payment (creation fee + ante + custom reward cost only; default rewards = $0)
 */
function calculateTotalPayment() {
  const creationFee = 5.00;
  const startingAnte = wizardState.tournamentData.startingAnteUSDCents / 100;
  const rewardCost = isCustomRewards() && wizardState.rewardCost ? wizardState.rewardCost.totalCost : 0;
  return creationFee + startingAnte + rewardCost;
}

/**
 * Format date/time for display
 */
function formatDateTime(timestamp) {
  if (!timestamp) return 'Not set';
  const date = new Date(timestamp);
  return date.toLocaleString();
}

/**
 * Update progress bar
 */
function updateProgressBar() {
  const steps = document.querySelectorAll('.progress-step');
  steps.forEach((step, idx) => {
    const stepNum = idx + 1;
    step.classList.remove('active', 'completed');
    if (stepNum === wizardState.currentStep) {
      step.classList.add('active');
    } else if (stepNum < wizardState.currentStep) {
      step.classList.add('completed');
    }
  });
}

/**
 * Update navigation buttons
 */
function updateNavigationButtons() {
  const backBtn = document.getElementById('tournamentCreationBackBtn');
  const nextBtn = document.getElementById('tournamentCreationNextBtn');

  if (backBtn) {
    backBtn.style.display = wizardState.currentStep > 1 ? 'block' : 'none';
  }

  if (nextBtn) {
    if (wizardState.currentStep === wizardState.totalSteps) {
      nextBtn.textContent = 'Pay & Create Tournament';
      nextBtn.onclick = handleCreateTournament;
    } else {
      nextBtn.textContent = 'Next →';
      nextBtn.onclick = tournamentCreationNextStep;
    }
  }
}

/**
 * Attach event listeners
 */
function attachEventListeners() {
  // Close button
  const closeBtn = document.querySelector('.tournament-creation-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeTournamentCreation);
  }
}

/**
 * Attach step-specific event listeners
 */
function attachStepEventListeners(step) {
  switch (step) {
    case 1:
      const nameInput = document.getElementById('tournamentNameInput');
      if (nameInput) {
        nameInput.addEventListener('input', (e) => {
          wizardState.tournamentData.name = e.target.value;
        });
      }
      break;
    case 3:
      const startInput = document.getElementById('tournamentStartTimeInput');
      const endInput = document.getElementById('tournamentEndTimeInput');
      if (startInput) {
        startInput.addEventListener('change', (e) => {
          wizardState.tournamentData.startTime = new Date(e.target.value).getTime();
        });
      }
      if (endInput) {
        endInput.addEventListener('change', (e) => {
          wizardState.tournamentData.endTime = new Date(e.target.value).getTime();
        });
      }
      break;
    case 4:
      const entryFeeInput = document.getElementById('tournamentEntryFeeInput');
      if (entryFeeInput) {
        entryFeeInput.addEventListener('change', (e) => {
          wizardState.tournamentData.entryFeeTickets = parseInt(e.target.value) || 1;
        });
      }
      break;
    case 5: {
      // Ante step: fetch prices only once; re-render only when prices first arrive (avoids infinite loop)
      const hadPrices = !!(wizardState.prices && wizardState.decimals);
      fetchTournamentPrices().then(() => {
        if (wizardState.currentStep === 5 && !hadPrices) renderStep(5);
      });
      const anteModeRadios = document.querySelectorAll('input[name="anteMode"]');
      anteModeRadios.forEach((radio) => {
        radio.addEventListener('change', (e) => {
          wizardState.anteInputMode = e.target.value;
          renderStep(5);
        });
      });
      const anteInputUsd = document.getElementById('tournamentAnteInput');
      if (anteInputUsd) {
        const updateFromUsd = () => {
          const value = parseFloat(anteInputUsd.value) || 0;
          wizardState.tournamentData.startingAnteUSDCents = Math.round(value * 100);
          renderStep(5);
        };
        anteInputUsd.addEventListener('input', updateFromUsd);
        anteInputUsd.addEventListener('change', updateFromUsd);
      }
      const anteInputToken = document.getElementById('tournamentAnteTokenInput');
      if (anteInputToken) {
        const updateFromToken = () => {
          const tokenSelect = document.getElementById('tournamentAnteTokenSelect');
          const token = tokenSelect ? tokenSelect.value : wizardState.tournamentData.startingAnteToken || 'SUI';
          const human = parseFloat(anteInputToken.value) || 0;
          wizardState.tournamentData.startingAnteUSDCents = tokenHumanToUsdCents(human, token);
          renderStep(5);
        };
        anteInputToken.addEventListener('input', updateFromToken);
        anteInputToken.addEventListener('change', updateFromToken);
      }
      const anteTokenSelect = document.getElementById('tournamentAnteTokenSelect');
      if (anteTokenSelect) {
        anteTokenSelect.addEventListener('change', (e) => {
          wizardState.tournamentData.startingAnteToken = e.target.value;
          renderStep(5);
        });
      }
      break;
    }
    case 7: {
      const hadPricesReview = !!(wizardState.prices && wizardState.decimals);
      fetchTournamentPrices().then(() => {
        if (wizardState.currentStep === 7 && !hadPricesReview) renderStep(7);
      });
      const paymentTokenSelect = document.getElementById('paymentTokenSelect');
      if (paymentTokenSelect) {
        // Load balance for initially selected token
        updatePaymentTokenBalance(wizardState.tournamentData.paymentToken);
        
        paymentTokenSelect.addEventListener('change', (e) => {
          wizardState.tournamentData.paymentToken = e.target.value;
          updatePaymentTokenBalance(e.target.value);
          renderStep(7);
        });
      }
      break;
    }
  }
}

/**
 * Update payment token balance display
 * Uses testnet for balance checks (same as payments)
 */
async function updatePaymentTokenBalance(paymentToken) {
  const balanceContainer = document.getElementById('paymentTokenBalance');
  if (!balanceContainer) return;
  
  const loadingEl = balanceContainer.querySelector('.balance-loading');
  const amountEl = balanceContainer.querySelector('.balance-amount');
  const errorEl = balanceContainer.querySelector('.balance-error');
  
  // Hide all states
  if (loadingEl) loadingEl.style.display = 'none';
  if (amountEl) amountEl.style.display = 'none';
  if (errorEl) errorEl.style.display = 'none';
  
  const walletAddress = getWalletAddress();
  if (!walletAddress) {
    if (errorEl) {
      errorEl.textContent = 'Wallet not connected';
      errorEl.style.display = 'block';
    }
    return;
  }
  
  // Show loading
  if (loadingEl) loadingEl.style.display = 'block';
  
  try {
    // Use testnet for balance checks (same network as payments)
    const network = 'testnet';
    let balanceResult = null;
    
    if (paymentToken === 'SUI') {
      if (window.walletAPIInstance && typeof window.walletAPIInstance.checkSUIBalance === 'function') {
        balanceResult = await window.walletAPIInstance.checkSUIBalance(walletAddress, network);
      }
    } else if (paymentToken === 'MEWS') {
      if (window.walletAPIInstance && typeof window.walletAPIInstance.checkMEWSBalance === 'function') {
        balanceResult = await window.walletAPIInstance.checkMEWSBalance(walletAddress, network);
      }
    } else if (paymentToken === 'USDC') {
      // Try to use token-balance-utils if available
      if (typeof window.fetchUsdcBalance === 'function') {
        balanceResult = await window.fetchUsdcBalance(walletAddress, network);
      } else if (window.walletAPIInstance && typeof window.walletAPIInstance.checkUSDCBalance === 'function') {
        balanceResult = await window.walletAPIInstance.checkUSDCBalance(walletAddress, network);
      }
    }
    
    // Hide loading
    if (loadingEl) loadingEl.style.display = 'none';
    
    if (balanceResult && balanceResult.success) {
      // Format balance for display
      let formattedBalance = '0';
      if (paymentToken === 'SUI') {
        formattedBalance = balanceResult.balanceInSUI !== undefined 
          ? balanceResult.balanceInSUI.toFixed(4)
          : (balanceResult.formattedBalance || '0');
      } else if (paymentToken === 'MEWS') {
        formattedBalance = balanceResult.formattedBalance || '0';
      } else if (paymentToken === 'USDC') {
        formattedBalance = balanceResult.formattedBalance || '0';
      }
      
      if (amountEl) {
        amountEl.textContent = `Balance: ${formattedBalance} ${paymentToken}`;
        amountEl.style.display = 'block';
      }
    } else {
      const errorMsg = balanceResult?.error || 'Failed to load balance';
      if (errorEl) {
        errorEl.textContent = errorMsg;
        errorEl.style.display = 'block';
      }
    }
  } catch (error) {
    // Hide loading
    if (loadingEl) loadingEl.style.display = 'none';
    
    if (errorEl) {
      errorEl.textContent = `Error: ${error.message || 'Unknown error'}`;
      errorEl.style.display = 'block';
    }
    log.error('TOURNAMENT CREATION', 'Error loading payment token balance', error);
  }
}

/**
 * Load badge discount
 */
async function loadBadgeDiscount(walletAddress) {
  try {
    const API_BASE_URL = window.GameApi ? window.GameApi.getBaseUrl() : (window.GAME_CONFIG?.GAME_BACKEND_URL || window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3001/api');
    const response = await fetch(`${API_BASE_URL}/badges/${walletAddress}`);
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.badge) {
        // Get discount from badge tier
        const tier = data.badge.tier || 'none';
        const discounts = {
          none: 0,
          bronze: 5,
          silver: 10,
          gold: 15,
          platinum: 20,
          legendary: 25,
        };
        wizardState.badgeDiscount = discounts[tier] || 0;
        log.info('TOURNAMENT CREATION', 'Badge discount loaded', { tier, discount: wizardState.badgeDiscount });
      }
    }
  } catch (error) {
    log.error('TOURNAMENT CREATION', 'Failed to load badge discount', error);
  }
}

/**
 * Calculate reward cost
 */
async function calculateRewardCost() {
  if (!wizardState.tournamentData.rewardConfig) {
    wizardState.rewardCost = null;
    return;
  }

  try {
    const API_BASE_URL = window.GameApi ? window.GameApi.getBaseUrl() : (window.GAME_CONFIG?.GAME_BACKEND_URL || window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3001/api');
    const walletAddress = getWalletAddress();
    
    const response = await fetch(`${API_BASE_URL}/tournaments/calculate-reward-cost`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rewardConfig: wizardState.tournamentData.rewardConfig,
        playerAddress: walletAddress,
        badgeDiscount: wizardState.badgeDiscount,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.cost) {
        wizardState.rewardCost = data.cost;
        log.info('TOURNAMENT CREATION', 'Reward cost calculated', wizardState.rewardCost);
      }
    }
  } catch (error) {
    log.error('TOURNAMENT CREATION', 'Failed to calculate reward cost', error);
  }
}

/**
 * Get wallet address
 */
function getWalletAddress() {
  if (typeof window !== 'undefined' && window.walletAddress) {
    return window.walletAddress;
  }
  if (typeof window !== 'undefined' && window.WalletService && window.WalletService.getAddress) {
    return window.WalletService.getAddress();
  }
  return null;
}

/**
 * Navigation functions (exposed globally)
 */
window.tournamentCreationNextStep = async function() {
  // Validate current step
  if (!validateCurrentStep()) {
    return;
  }

  // Save current step data before moving to next step
  saveCurrentStepData();

  // Special handling for step 6 (rewards)
  if (wizardState.currentStep === 6 && wizardState.tournamentData.rewardConfig) {
    await calculateRewardCost();
  }

  if (wizardState.currentStep < wizardState.totalSteps) {
    renderStep(wizardState.currentStep + 1);
  }
};

/**
 * Save data from current step before navigation
 */
function saveCurrentStepData() {
  switch (wizardState.currentStep) {
    case 5: {
      const anteTokenSelect = document.getElementById('tournamentAnteTokenSelect');
      if (anteTokenSelect) wizardState.tournamentData.startingAnteToken = anteTokenSelect.value || 'SUI';
      const mode = wizardState.anteInputMode || 'usd';
      const token = wizardState.tournamentData.startingAnteToken || 'SUI';
      if (mode === 'usd') {
        const anteInput = document.getElementById('tournamentAnteInput');
        if (anteInput) {
          const value = parseFloat(anteInput.value) || 0;
          wizardState.tournamentData.startingAnteUSDCents = Math.round(value * 100);
        }
      } else {
        const anteTokenInput = document.getElementById('tournamentAnteTokenInput');
        if (anteTokenInput) {
          const human = parseFloat(anteTokenInput.value) || 0;
          wizardState.tournamentData.startingAnteUSDCents = tokenHumanToUsdCents(human, token);
        }
      }
      break;
    }
    // Add other steps as needed
  }
}

window.tournamentCreationPreviousStep = function() {
  // Save current step data before going back
  saveCurrentStepData();
  
  if (wizardState.currentStep > 1) {
    renderStep(wizardState.currentStep - 1);
  }
};

/**
 * Validate current step
 */
function validateCurrentStep() {
  const data = wizardState.tournamentData;
  
  switch (wizardState.currentStep) {
    case 1:
      if (!data.name || data.name.trim().length === 0) {
        showError('Please enter a tournament name');
        return false;
      }
      if (data.name.length > 100) {
        showError('Tournament name must be 100 characters or less');
        return false;
      }
      break;
    case 2:
      if (!data.category) {
        showError('Please select a tournament category');
        return false;
      }
      break;
    case 3:
      if (!data.startTime || !data.endTime) {
        showError('Please set both start and end times');
        return false;
      }
      if (data.endTime <= data.startTime) {
        showError('End time must be after start time');
        return false;
      }
      if (data.startTime <= Date.now()) {
        showError('Start time must be in the future');
        return false;
      }
      break;
    case 4:
      if (!data.entryFeeTickets || data.entryFeeTickets < 1) {
        showError('Entry fee must be at least 1 ticket');
        return false;
      }
      break;
    case 5:
      if (data.startingAnteUSDCents < 0) {
        showError('Starting ante cannot be negative');
        return false;
      }
      break;
    case 6:
      // Validation handled in reward config
      break;
    case 7:
      // Final validation
      break;
  }

  hideError();
  return true;
}

/**
 * Show error message
 */
function showError(message) {
  wizardState.error = message;
  const errorDiv = document.getElementById('tournamentCreationError');
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
  }
}

/**
 * Hide error message
 */
function hideError() {
  wizardState.error = null;
  const errorDiv = document.getElementById('tournamentCreationError');
  if (errorDiv) {
    errorDiv.style.display = 'none';
  }
}

/**
 * Select category
 */
window.selectTournamentCategory = function(category) {
  wizardState.tournamentData.category = category;
  renderStep(2); // Re-render to update selection
};

/**
 * Select default rewards
 */
window.selectDefaultRewards = function() {
  // Set rewardConfig to null to indicate default rewards (not editable by users)
  wizardState.tournamentData.rewardConfig = null;
  wizardState.rewardCost = null;
  renderStep(6);
  
  // Load and render default rewards preview after a short delay to ensure DOM is ready
  setTimeout(() => {
    loadAndRenderDefaultRewardsPreview();
  }, 100);
};

/**
 * Select custom rewards
 */
window.selectCustomRewards = function() {
  if (!wizardState.tournamentData.rewardConfig) {
    wizardState.tournamentData.rewardConfig = {
      rewardDepth: 10,
      poolDepth: 3,
      poolDistribution: [50, 30, 20],
      poolSource: 0,
      itemRewards: {},
      _isDefault: false, // Mark as custom
    };
  } else {
    // Mark existing config as custom (no longer default)
    wizardState.tournamentData.rewardConfig._isDefault = false;
  }
  renderStep(6);
};

/**
 * Update reward depth
 */
window.updateRewardDepth = function(depth) {
  if (!wizardState.tournamentData.rewardConfig) return;
  wizardState.tournamentData.rewardConfig.rewardDepth = parseInt(depth) || 10;
  renderStep(6);
};

/**
 * Update pool depth
 */
window.updatePoolDepth = function(depth) {
  if (!wizardState.tournamentData.rewardConfig) return;
  const newDepth = parseInt(depth) || 3;
  wizardState.tournamentData.rewardConfig.poolDepth = newDepth;
  
  // Adjust pool distribution array
  const currentDist = wizardState.tournamentData.rewardConfig.poolDistribution || [];
  if (newDepth > currentDist.length) {
    // Add default percentages
    const defaultPct = Math.floor(100 / newDepth);
    const remainder = 100 - (defaultPct * newDepth);
    wizardState.tournamentData.rewardConfig.poolDistribution = Array.from({ length: newDepth }, (_, i) => 
      i === 0 ? defaultPct + remainder : defaultPct
    );
  } else if (newDepth < currentDist.length) {
    // Remove excess
    wizardState.tournamentData.rewardConfig.poolDistribution = currentDist.slice(0, newDepth);
    // Re-normalize to 100%
    const sum = wizardState.tournamentData.rewardConfig.poolDistribution.reduce((a, b) => a + b, 0);
    wizardState.tournamentData.rewardConfig.poolDistribution = wizardState.tournamentData.rewardConfig.poolDistribution.map(p => 
      Math.round((p / sum) * 100)
    );
  }
  
  renderStep(6);
};

/**
 * Update pool distribution
 */
window.updatePoolDistribution = function(rank, value) {
  if (!wizardState.tournamentData.rewardConfig) return;
  const idx = rank - 1;
  wizardState.tournamentData.rewardConfig.poolDistribution[idx] = parseInt(value) || 0;
  renderStep(6);
};

// Store current rank for item selector
let currentItemSelectorRank = null;

/**
 * Show item selector modal
 */
window.showItemSelector = function(rank) {
  currentItemSelectorRank = rank;
  const modal = document.getElementById('itemSelectorModal');
  if (!modal) return;
  
  // Reset form
  const itemSelect = document.getElementById('itemSelectorItem');
  const levelSelect = document.getElementById('itemSelectorLevel');
  const quantityInput = document.getElementById('itemSelectorQuantity');
  const confirmBtn = document.getElementById('confirmAddItemBtn');
  
  if (itemSelect) itemSelect.value = '';
  if (levelSelect) {
    levelSelect.innerHTML = '<option value="">Select item first...</option>';
    levelSelect.disabled = true;
  }
  if (quantityInput) quantityInput.value = '1';
  if (confirmBtn) confirmBtn.disabled = true;
  
  // Show modal
  modal.style.display = 'flex';
  
  // Attach event listeners
  if (itemSelect) {
    itemSelect.onchange = function() {
      updateLevelOptions();
      updateConfirmButton();
    };
  }
  if (levelSelect) {
    levelSelect.onchange = updateConfirmButton;
  }
  if (quantityInput) {
    quantityInput.oninput = updateConfirmButton;
  }
};

/**
 * Update level options based on selected item
 */
function updateLevelOptions() {
  const itemSelect = document.getElementById('itemSelectorItem');
  const levelSelect = document.getElementById('itemSelectorLevel');
  
  if (!itemSelect || !levelSelect) return;
  
  const selectedItemId = itemSelect.value;
  if (!selectedItemId) {
    levelSelect.innerHTML = '<option value="">Select item first...</option>';
    levelSelect.disabled = true;
    return;
  }
  
  const item = AVAILABLE_ITEMS.find(i => i.id === selectedItemId);
  if (!item) {
    levelSelect.innerHTML = '<option value="">Select item first...</option>';
    levelSelect.disabled = true;
    return;
  }
  
  // Populate level options
  levelSelect.innerHTML = item.levels.map(level => 
    `<option value="${level}">Level ${level}</option>`
  ).join('');
  levelSelect.disabled = false;
}

/**
 * Update confirm button state
 */
function updateConfirmButton() {
  const itemSelect = document.getElementById('itemSelectorItem');
  const levelSelect = document.getElementById('itemSelectorLevel');
  const quantityInput = document.getElementById('itemSelectorQuantity');
  const confirmBtn = document.getElementById('confirmAddItemBtn');
  
  if (!confirmBtn) return;
  
  const hasItem = itemSelect && itemSelect.value;
  const hasLevel = levelSelect && levelSelect.value && !levelSelect.disabled;
  const hasQuantity = quantityInput && quantityInput.value && parseInt(quantityInput.value) > 0;
  
  confirmBtn.disabled = !(hasItem && hasLevel && hasQuantity);
}

/**
 * Close item selector modal
 */
window.closeItemSelector = function() {
  const modal = document.getElementById('itemSelectorModal');
  if (modal) {
    modal.style.display = 'none';
  }
  currentItemSelectorRank = null;
};

/**
 * Confirm and add item
 */
window.confirmAddItem = function() {
  if (currentItemSelectorRank === null) return;
  
  const itemSelect = document.getElementById('itemSelectorItem');
  const levelSelect = document.getElementById('itemSelectorLevel');
  const quantityInput = document.getElementById('itemSelectorQuantity');
  
  if (!itemSelect || !levelSelect || !quantityInput) return;
  
  const itemId = itemSelect.value;
  const level = parseInt(levelSelect.value);
  const quantity = parseInt(quantityInput.value);
  
  if (!itemId || !level || !quantity || quantity < 1) return;
  
  if (!wizardState.tournamentData.rewardConfig) return;
  if (!wizardState.tournamentData.rewardConfig.itemRewards) {
    wizardState.tournamentData.rewardConfig.itemRewards = {};
  }
  if (!wizardState.tournamentData.rewardConfig.itemRewards[currentItemSelectorRank]) {
    wizardState.tournamentData.rewardConfig.itemRewards[currentItemSelectorRank] = [];
  }
  
  wizardState.tournamentData.rewardConfig.itemRewards[currentItemSelectorRank].push({
    itemId,
    level,
    quantity,
  });
  
  closeItemSelector();
  renderStep(6);
  calculateRewardCost();
};

/**
 * Remove item from rank
 */
window.removeItemFromRank = function(rank, index) {
  if (!wizardState.tournamentData.rewardConfig || !wizardState.tournamentData.rewardConfig.itemRewards) return;
  if (wizardState.tournamentData.rewardConfig.itemRewards[rank]) {
    wizardState.tournamentData.rewardConfig.itemRewards[rank].splice(index, 1);
    renderStep(6);
    calculateRewardCost();
  }
};

/**
 * Add a random item to a specific rank
 */
window.addRandomItemToRank = function(rank) {
  if (!wizardState.tournamentData.rewardConfig) return;
  
  // Get the selected level from the dropdown
  const levelSelect = document.getElementById('randomItemLevelSelect');
  const selectedLevel = levelSelect ? parseInt(levelSelect.value) : wizardState.randomItemLevel || 1;
  
  // Update wizard state with selected level
  wizardState.randomItemLevel = selectedLevel;
  
  // Get items that have 3 levels (exclude special items)
  const randomItems = getRandomizableItems();
  const randomItem = randomItems[Math.floor(Math.random() * randomItems.length)];
  
  // Initialize itemRewards if needed
  if (!wizardState.tournamentData.rewardConfig.itemRewards) {
    wizardState.tournamentData.rewardConfig.itemRewards = {};
  }
  if (!wizardState.tournamentData.rewardConfig.itemRewards[rank]) {
    wizardState.tournamentData.rewardConfig.itemRewards[rank] = [];
  }
  
  // Add the random item
  wizardState.tournamentData.rewardConfig.itemRewards[rank].push({
    itemId: randomItem,
    level: selectedLevel,
    quantity: 1,
  });
  
  renderStep(6);
  calculateRewardCost();
};

/**
 * Randomize all items in custom rewards
 */
window.randomizeAllItems = function() {
  if (!wizardState.tournamentData.rewardConfig) return;
  
  // Get the selected level from the dropdown
  const levelSelect = document.getElementById('randomItemLevelSelect');
  const selectedLevel = levelSelect ? parseInt(levelSelect.value) : wizardState.randomItemLevel || 1;
  
  // Update wizard state with selected level
  wizardState.randomItemLevel = selectedLevel;
  
  // Get items that have 3 levels (exclude special items)
  const randomItems = getRandomizableItems();
  const getRandomItem = () => randomItems[Math.floor(Math.random() * randomItems.length)];
  
  const rewardDepth = wizardState.tournamentData.rewardConfig.rewardDepth || 10;
  const itemRewards = {};
  
  // Generate random items for each rank (all ranks get random items only)
  for (let rank = 1; rank <= rewardDepth; rank++) {
    // All ranks get random items at the selected level
    itemRewards[rank] = [
      { itemId: getRandomItem(), level: selectedLevel, quantity: 1 }
    ];
  }
  
  wizardState.tournamentData.rewardConfig.itemRewards = itemRewards;
  renderStep(6);
  calculateRewardCost();
};

/**
 * Handle tournament creation
 */
async function handleCreateTournament() {
  if (!validateCurrentStep()) {
    return;
  }

  const nextBtn = document.getElementById('tournamentCreationNextBtn');
  const originalText = nextBtn ? nextBtn.textContent : 'Pay & Create Tournament';
  if (nextBtn) {
    nextBtn.textContent = 'Processing…';
    nextBtn.classList.add('tournament-creation-btn-loading');
    nextBtn.disabled = true;
  }

  wizardState.loading = true;
  hideError();

  try {
    const API_BASE_URL = window.GameApi ? window.GameApi.getBaseUrl() : (window.GAME_CONFIG?.GAME_BACKEND_URL || window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3001/api');
    const walletAddress = getWalletAddress();

    if (!walletAddress) {
      showError('Please connect your wallet');
      wizardState.loading = false;
      return;
    }

    // Calculate final reward cost if needed
    if (wizardState.tournamentData.rewardConfig && !wizardState.rewardCost) {
      await calculateRewardCost();
    }

    // Build tournament creation request
    // NOTE: Backend uses its configured network (testnet) for payments, just like the store
    // No need to pass network - backend will use testnet MEWS for balance checks
    const requestBody = {
      name: wizardState.tournamentData.name,
      category: wizardState.tournamentData.category,
      startTime: wizardState.tournamentData.startTime,
      endTime: wizardState.tournamentData.endTime,
      entryFeeTickets: wizardState.tournamentData.entryFeeTickets,
      rewardConfig: wizardState.tournamentData.rewardConfig,
      startingAnteUSDCents: wizardState.tournamentData.startingAnteUSDCents,
      startingAnteToken: 'MEWS',
      paymentToken: wizardState.tournamentData.paymentToken,
      playerAddress: walletAddress,
      badgeDiscount: wizardState.badgeDiscount,
    };

    log.info('TOURNAMENT CREATION', 'Creating tournament', requestBody);

    // Step 1: Build player payment via backend (player approves creation + ante + custom rewards)
    const buildPaymentBody = {
      playerAddress: walletAddress,
      paymentToken: wizardState.tournamentData.paymentToken,
      startingAnteUSDCents: wizardState.tournamentData.startingAnteUSDCents || 0,
      rewardConfig: wizardState.tournamentData.rewardConfig || null,
      badgeDiscount: wizardState.badgeDiscount,
    };

    log.info('TOURNAMENT CREATION', 'Building payment', buildPaymentBody);

    const buildPaymentResponse = await fetch(`${API_BASE_URL}/tournaments/build-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPaymentBody),
    });

    if (!buildPaymentResponse.ok) {
      const errorData = await buildPaymentResponse.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to build tournament payment: ${buildPaymentResponse.status}`);
    }

    const buildPaymentData = await buildPaymentResponse.json();
    if (!buildPaymentData.success) {
      throw new Error(buildPaymentData.error || 'Failed to build tournament payment');
    }

    // If payment is required, ask player to sign and execute the transaction
    if (buildPaymentData.requiresPayment && buildPaymentData.transactionBytesBase64) {
      log.info('TOURNAMENT CREATION', 'Signing payment transaction', {
        paymentToken: buildPaymentData.paymentToken,
        payment: buildPaymentData.payment,
      });
      await signAndExecuteTransaction(buildPaymentData.transactionBytesBase64);
    } else {
      log.info('TOURNAMENT CREATION', 'No payment required for tournament creation', {
        payment: buildPaymentData.payment,
      });
    }

    // Step 2: Call backend create route (admin signs via Channel; no further player signing)
    const response = await fetch(`${API_BASE_URL}/tournaments/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to create tournament: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success || !data.digest) {
      throw new Error(data.error || 'Failed to create tournament');
    }

    log.info('TOURNAMENT CREATION', 'Tournament created via channel', { digest: data.digest });

    // Reload tournament list the same way as preload (invalidate cache + load)
    if (typeof window !== 'undefined' && typeof window.reloadTournamentLists === 'function') {
      window.__prefetchedTournaments = null;
      window.__prefetchedMyTournaments = null;
      setTimeout(() => {
        window.reloadTournamentLists();
      }, 1500);
    }

    wizardState.creationSuccess = true;
    showSuccessMessage(data);

  } catch (error) {
    log.error('TOURNAMENT CREATION', 'Failed to create tournament', error);
    showError(error.message || 'Failed to create tournament');
  } finally {
    wizardState.loading = false;
    if (nextBtn) {
      nextBtn.textContent = originalText;
      nextBtn.classList.remove('tournament-creation-btn-loading');
      nextBtn.disabled = false;
    }
  }
}

/**
 * Sign and execute transaction
 */
async function signAndExecuteTransaction(transactionBytes, gasEstimate) {
  // Use walletAPIInstance (same pattern as store purchase flow)
  if (typeof window !== 'undefined' && window.walletAPIInstance && window.walletAPIInstance.signAndExecuteTransaction) {
    log.info('TOURNAMENT CREATION', 'Signing transaction with walletAPIInstance');
    const result = await window.walletAPIInstance.signAndExecuteTransaction(transactionBytes);
    
    if (result && result.digest) {
      log.info('TOURNAMENT CREATION', 'Transaction signed successfully', { digest: result.digest });
      return result;
    } else {
      throw new Error('Transaction failed: ' + (result?.error || 'Unknown error'));
    }
  }
  
  // Fallback: use WalletService if available
  if (typeof window !== 'undefined' && window.WalletService && window.WalletService.signAndExecuteTransaction) {
    log.info('TOURNAMENT CREATION', 'Signing transaction with WalletService');
    return await window.WalletService.signAndExecuteTransaction(transactionBytes, gasEstimate);
  }
  
  // Fallback: use Sui wallet adapter if available
  if (typeof window !== 'undefined' && window.suiWallet) {
    log.info('TOURNAMENT CREATION', 'Signing transaction with suiWallet');
    const txBytes = Uint8Array.from(atob(transactionBytes), c => c.charCodeAt(0));
    const result = await window.suiWallet.signAndExecuteTransaction({
      transaction: txBytes,
      options: {
        showEffects: true,
        showEvents: true,
      },
    });
    return result;
  }

  throw new Error('Wallet service not available. Please connect your wallet.');
}

/**
 * Show success message
 */
function showSuccessMessage(data) {
  const stepContent = document.getElementById('tournamentCreationStepContent');
  if (stepContent) {
    const digestLine = data.digest
      ? `<p><strong>Transaction:</strong> <code class="tournament-creation-digest">${data.digest.slice(0, 16)}...</code></p>`
      : '';
    stepContent.innerHTML = `
      <div class="tournament-creation-success">
        <h3>✅ Tournament Created!</h3>
        <p>Your tournament has been created successfully!</p>
        <p><strong>Name:</strong> ${wizardState.tournamentData.name}</p>
        <p><strong>Total Paid:</strong> $${data.payment?.totalUSD?.toFixed(2) || '0.00'}</p>
        ${digestLine}
        <div class="tournament-creation-success-actions">
          <button class="tournament-creation-btn primary" onclick="closeTournamentCreation()">Close</button>
        </div>
      </div>
    `;
  }

  // Hide navigation buttons
  const nextBtn = document.getElementById('tournamentCreationNextBtn');
  const backBtn = document.getElementById('tournamentCreationBackBtn');
  if (nextBtn) nextBtn.style.display = 'none';
  if (backBtn) backBtn.style.display = 'none';
}

/**
 * Close tournament creation modal
 */
window.closeTournamentCreation = function() {
  if (wizardState.creationSuccess && typeof window.reloadTournamentLists === 'function') {
    window.__prefetchedTournaments = null;
    window.__prefetchedMyTournaments = null;
    window.reloadTournamentLists();
    wizardState.creationSuccess = false;
  }
  const modal = document.getElementById('tournamentCreationModal');
  if (modal) {
    modal.remove();
  }
};

// Export for use in other modules (also set immediately after function declaration to prevent race conditions)
if (typeof window !== 'undefined') {
  // Function is already assigned above, but ensure it's set here too for consistency
  if (!window.showTournamentCreation) {
    window.showTournamentCreation = showTournamentCreation;
  }
  window.TournamentCreationModal = {
    show: showTournamentCreation,
    close: closeTournamentCreation,
  };
}

