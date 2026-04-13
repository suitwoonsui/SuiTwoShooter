// ==========================================
// BADGE SERVICE - Frontend badge operations
// ==========================================

/**
 * Badge Service - Handles badge queries, minting, and updates
 */

// Cache for badge data (keyed by address)
let badgeCache = {
  data: null,
  address: null, // Track which address the cache is for
  timestamp: 0,
  cacheDuration: 30 * 60 * 1000, // 30 minutes cache (badges rarely change)
};
// In-flight request dedupe by address to avoid duplicate badge fetches
// when multiple UI systems ask for badge state at the same time.
const badgeInFlightByAddress = new Map();

// Short-lived full response for includePendingUpgrade=1 (not persisted; avoids duplicate Hydroscope-backed work after prefetch).
let badgePuCache = { address: null, data: null, timestamp: 0, ttlMs: 120000 };

const BADGE_CACHE_VERSION = 1;
function badgeStorageKey(address) {
  return `badgeCache:v${BADGE_CACHE_VERSION}:${String(address || '').toLowerCase()}`;
}

function loadBadgeFromStorage(address, now) {
  try {
    const raw = window?.localStorage?.getItem(badgeStorageKey(address));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.data || typeof parsed.at !== 'number') return null;
    if ((now - parsed.at) > badgeCache.cacheDuration) return null;
    return { data: parsed.data, at: parsed.at };
  } catch {
    return null;
  }
}

function saveBadgeToStorage(address, data, at) {
  try {
    window?.localStorage?.setItem(badgeStorageKey(address), JSON.stringify({ data, at }));
  } catch {
    // Ignore storage failures (quota, disabled, etc).
  }
}

/**
 * Get API base URL - routes to correct backend based on endpoint
 */
function getApiBaseUrl(endpoint = '/api/badges/') {
  // Use getBackendUrl helper if available, otherwise fallback to API_BASE_URL
  if (window.GAME_CONFIG?.getBackendUrl) {
    return window.GAME_CONFIG.getBackendUrl(endpoint);
  }
  // Frontend should always talk to the game backend.
  return window.GameApi ? window.GameApi.getBaseUrl() : (window.GAME_CONFIG?.GAME_BACKEND_URL || window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3001/api');
}

/**
 * Get player address
 */
function getPlayerAddress() {
  if (window.walletAPIInstance && window.walletAPIInstance.isConnected()) {
    return window.walletAPIInstance.getAddress();
  }
  return null;
}

/**
 * Query player's badge
 * @param {string} playerAddress - Player's wallet address (optional, uses connected wallet if not provided)
 * @returns {Promise<Object>} Badge data or null if no badge
 */
async function getBadge(playerAddress = null, options = {}) {
  const address = playerAddress || getPlayerAddress();
  if (!address) {
    return {
      success: false,
      error: 'Wallet not connected',
    };
  }
  const bypassCache = Boolean(options && options.bypassCache);
  const includePendingUpgrade = Boolean(options && options.includePendingUpgrade);

  // Check cache (only use if it's for the same address)
  const now = Date.now();
  if (!bypassCache && includePendingUpgrade && badgePuCache.address === address && badgePuCache.data && (now - badgePuCache.timestamp) < badgePuCache.ttlMs) {
    console.log('📋 [BADGE] Using in-memory PU badge cache for address:', address);
    return badgePuCache.data;
  }
  if (!bypassCache && !includePendingUpgrade && badgeCache.data && badgeCache.address === address && (now - badgeCache.timestamp) < badgeCache.cacheDuration) {
    console.log('📋 [BADGE] Using cached badge data for address:', address);
    return badgeCache.data;
  }

  // Check persistent cache (localStorage) for fast, cross-refresh loads.
  if (!bypassCache && !includePendingUpgrade) {
    const stored = loadBadgeFromStorage(address, now);
    if (stored?.data) {
      badgeCache.data = stored.data;
      badgeCache.address = address;
      badgeCache.timestamp = stored.at;
      console.log('📋 [BADGE] Using stored badge data for address:', address);
      return stored.data;
    }
  }
  
  // If cache is for a different address, clear it
  if (badgeCache.address && badgeCache.address !== address) {
    console.log('📋 [BADGE] Cache is for different address, clearing cache');
    clearBadgeCache({ address: badgeCache.address });
  }

  const inFlightKey = includePendingUpgrade ? `${address}\0pu` : address;
  if (!bypassCache) {
    const inFlight = badgeInFlightByAddress.get(inFlightKey);
    if (inFlight) return inFlight;
  }

  const requestPromise = (async () => {
    const API_BASE_URL = getApiBaseUrl('/api/badges/');
    const qs = includePendingUpgrade ? '?includePendingUpgrade=1' : '';
    const response = await fetch(`${API_BASE_URL}/badges/${address}${qs}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return {
        success: false,
        error: errorData.error || `HTTP ${response.status}`,
      };
    }

    const data = await response.json();

    // Persist badge display fields only (pendingUpgrade is session-specific / short-lived).
    const cachePayload =
      includePendingUpgrade && data && typeof data === 'object'
        ? (() => {
            const { pendingUpgrade: _pu, ...rest } = data;
            return rest;
          })()
        : data;

    badgeCache.data = cachePayload;
    badgeCache.address = address;
    badgeCache.timestamp = now;
    saveBadgeToStorage(address, cachePayload, now);

    if (includePendingUpgrade && data && typeof data === 'object') {
      badgePuCache = { address, data, timestamp: now, ttlMs: badgePuCache.ttlMs };
    }

    return data;
  })().catch((error) => {
    console.error('❌ [BADGE] Error fetching badge:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch badge',
    };
  }).finally(() => {
    if (!bypassCache) {
      badgeInFlightByAddress.delete(inFlightKey);
    }
  });

  if (!bypassCache) {
    badgeInFlightByAddress.set(inFlightKey, requestPromise);
  }

  return requestPromise;
}

// Badge migration removed (upgradable contracts). Keep a stable API for any legacy callers.
async function checkBadgeMigration() {
  return { success: true, needsMigration: false, message: 'Badge migration is no longer supported' };
}

/**
 * Check if player has a badge
 * @param {string} playerAddress - Player's wallet address (optional)
 * @returns {Promise<boolean>} True if player has badge
 */
async function hasBadge(playerAddress = null) {
  const result = await getBadge(playerAddress);
  return result.success && result.hasBadge === true;
}

/** Game backend API root (same pattern as store-purchase-flow). */
function getBadgeBackendRoot() {
  if (window.GAME_CONFIG?.getBackendUrl) {
    return window.GAME_CONFIG.getBackendUrl('/api/badges/').replace(/\/badges\/?$/, '');
  }
  return window.GameApi ? window.GameApi.getBaseUrl() : (window.GAME_CONFIG?.GAME_BACKEND_URL || window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3001/api');
}

function getTokenPricesSnapshot() {
  let prices = null;
  let pricesTimestamp = null;
  if (typeof StoreService !== 'undefined' && StoreService.getState) {
    const s = StoreService.getState();
    prices = s.tokenPrices;
    pricesTimestamp = s.tokenPricesTimestamp;
  } else if (typeof getStoreState === 'function') {
    const s = getStoreState();
    prices = s?.tokenPrices;
    pricesTimestamp = s?.tokenPricesTimestamp;
  }
  return { prices, pricesTimestamp };
}

async function pollPaymentConfirmed(paymentDigest, maxAttempts = 30) {
  const root = getBadgeBackendRoot();
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try {
      const res = await fetch(`${root}/store/transaction/${paymentDigest}`);
      if (res.ok) {
        const j = await res.json();
        if (j.confirmed) return true;
      }
    } catch (_) {
      /* ignore */
    }
  }
  return false;
}

/**
 * Build Shipyard mint tx: optional Channel game-fee payment (player → game admin), then POST .../mint/fulfill.
 * @param {Object} [options]
 * @param {string} [options.paymentToken] - SUI | MEWS | USDC when Helm minting fee is set (default SUI)
 */
async function buildMintBadgeTransaction(options = {}) {
  const address = getPlayerAddress();
  if (!address) {
    return {
      success: false,
      error: 'Wallet not connected. Please connect your wallet first.',
    };
  }

  if (!window.walletAPIInstance) {
    return {
      success: false,
      error: 'Wallet API not initialized. Please wait for wallet module to load.',
    };
  }

  const paymentToken = (options.paymentToken || 'SUI').toUpperCase();
  const root = getBadgeBackendRoot();
  const { prices, pricesTimestamp } = getTokenPricesSnapshot();

  try {
    console.log('🔨 [BADGE] Mint: purchase step (game fee via Channel if configured)...');
    const purchaseRes = await fetch(`${root}/badges/mint/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerAddress: address,
        paymentToken,
        prices,
        pricesTimestamp,
      }),
    });

    if (!purchaseRes.ok) {
      const err = await purchaseRes.json().catch(() => ({}));
      return {
        success: false,
        error: err.error || err.message || `HTTP ${purchaseRes.status}`,
      };
    }

    const purchaseData = await purchaseRes.json();
    if (!purchaseData.success) {
      return {
        success: false,
        error: purchaseData.error || purchaseData.message || 'Mint purchase step failed',
      };
    }

    let paymentDigest = null;
    if (purchaseData.requiresPayment && purchaseData.transaction) {
      console.log('🔨 [BADGE] Signing game fee payment (Channel)...');
      const payResult = await window.walletAPIInstance.signAndExecuteTransaction(purchaseData.transaction);
      if (!payResult.success) {
        return { success: false, error: payResult.error || 'Payment transaction failed' };
      }
      paymentDigest = payResult.digest;
      const confirmed = await pollPaymentConfirmed(paymentDigest);
      if (!confirmed) {
        return {
          success: false,
          error:
            'Payment not confirmed in time. If it succeeded on-chain, wait and try mint again (fulfill step only).',
        };
      }
    }

    console.log('🔨 [BADGE] Mint: fulfill step (Shipyard mint tx)...');
    const fulfillRes = await fetch(`${root}/badges/mint/fulfill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerAddress: address,
        ...(paymentDigest ? { paymentDigest } : {}),
      }),
    });

    if (!fulfillRes.ok) {
      const err = await fulfillRes.json().catch(() => ({}));
      return {
        success: false,
        error: err.error || err.message || `HTTP ${fulfillRes.status}`,
      };
    }

    const fulfillData = await fulfillRes.json();
    if (!fulfillData.success || !fulfillData.transaction) {
      return {
        success: false,
        error: fulfillData.error || fulfillData.message || 'Failed to build mint transaction',
      };
    }

    console.log('✅ [BADGE] Shipyard mint transaction ready for wallet signature');
    return { success: true, transaction: fulfillData.transaction };
  } catch (error) {
    console.error('❌ [BADGE] Error in mint flow:', error);
    return {
      success: false,
      error: error.message || 'Failed to build mint transaction',
    };
  }
}

/**
 * Check if player has a pending badge tier upgrade
 * @param {string} playerAddress - Player's wallet address (optional)
 * @returns {Promise<Object>} Upgrade data if upgrade is pending
 */
async function checkPendingUpgrade(playerAddress = null) {
  const address = playerAddress || getPlayerAddress();
  if (!address) {
    return {
      success: false,
      hasPendingUpgrade: false,
      error: 'Wallet not connected',
    };
  }

  try {
    const API_BASE_URL = getApiBaseUrl('/api/badges/');
    const response = await fetch(`${API_BASE_URL}/badges/${address}/check-upgrade`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return {
        success: false,
        hasPendingUpgrade: false,
        error: errorData.error || `HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('❌ [BADGE] Error checking pending upgrade:', error);
    return {
      success: false,
      hasPendingUpgrade: false,
      error: error.message || 'Failed to check pending upgrade',
    };
  }
}

/**
 * Build upgrade badge transaction: optional game fee (Helm badge_upgrade_fee), then Shipyard upgrade tx.
 * @param {string} badgeId
 * @param {number} newTier
 * @param {string} sessionId
 * @param {Object} [options]
 * @param {string} [options.paymentToken] - SUI | MEWS | USDC when upgrade fee is set
 */
async function buildUpgradeBadgeTransaction(badgeId, newTier, sessionId, options = {}) {
  const address = getPlayerAddress();
  if (!address) {
    return {
      success: false,
      error: 'Wallet not connected. Please connect your wallet first.',
    };
  }

  if (!window.walletAPIInstance) {
    return {
      success: false,
      error: 'Wallet API not initialized. Please wait for wallet module to load.',
    };
  }

  if (!badgeId) {
    return {
      success: false,
      error: 'Badge ID is required',
    };
  }

  if (newTier === undefined || newTier === null) {
    return {
      success: false,
      error: 'New tier is required',
    };
  }

  const paymentToken = (options.paymentToken || 'SUI').toUpperCase();
  const root = getBadgeBackendRoot();
  const { prices, pricesTimestamp } = getTokenPricesSnapshot();

  try {
    console.log('🔨 [BADGE] Upgrade: purchase step (game fee via Channel if configured)...');
    const purchaseRes = await fetch(`${root}/badges/upgrade/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerAddress: address,
        paymentToken,
        prices,
        pricesTimestamp,
      }),
    });

    if (!purchaseRes.ok) {
      const err = await purchaseRes.json().catch(() => ({}));
      return {
        success: false,
        error: err.error || err.message || `HTTP ${purchaseRes.status}`,
      };
    }

    const purchaseData = await purchaseRes.json();
    if (!purchaseData.success) {
      return {
        success: false,
        error: purchaseData.error || purchaseData.message || 'Upgrade purchase step failed',
      };
    }

    let paymentDigest = null;
    if (purchaseData.requiresPayment && purchaseData.transaction) {
      const payResult = await window.walletAPIInstance.signAndExecuteTransaction(purchaseData.transaction);
      if (!payResult.success) {
        return { success: false, error: payResult.error || 'Upgrade payment transaction failed' };
      }
      paymentDigest = payResult.digest;
      const confirmed = await pollPaymentConfirmed(paymentDigest);
      if (!confirmed) {
        return {
          success: false,
          error:
            'Payment not confirmed in time. If it succeeded on-chain, wait and try upgrade again.',
        };
      }
    }

    console.log('🔨 [BADGE] Upgrade: fulfill step (Shipyard upgrade tx)...');
    const fulfillRes = await fetch(`${root}/badges/upgrade/fulfill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerAddress: address,
        badgeId,
        newTier,
        sessionId: sessionId || '',
        ...(paymentDigest ? { paymentDigest } : {}),
      }),
    });

    if (!fulfillRes.ok) {
      const err = await fulfillRes.json().catch(() => ({}));
      return {
        success: false,
        error: err.error || err.message || `HTTP ${fulfillRes.status}`,
      };
    }

    const fulfillData = await fulfillRes.json();
    if (!fulfillData.success || !fulfillData.transaction) {
      return {
        success: false,
        error: fulfillData.error || fulfillData.message || 'Failed to build upgrade transaction',
      };
    }

    console.log('✅ [BADGE] Shipyard upgrade transaction ready for wallet signature');
    return { success: true, transaction: fulfillData.transaction };
  } catch (error) {
    console.error('❌ [BADGE] Error building upgrade transaction:', error);
    return {
      success: false,
      error: error.message || 'Failed to build upgrade transaction',
    };
  }
}

/**
 * Check and build badge update transaction
 * @param {string} sessionId - Session ID from score submission
 * @returns {Promise<Object>} Transaction data if tier upgrade needed
 * @deprecated Use checkPendingUpgrade + buildUpgradeBadgeTransaction instead
 */
async function checkAndBuildBadgeUpdate(sessionId) {
  const address = getPlayerAddress();
  if (!address) {
    return {
      success: false,
      tierUpgraded: false,
      error: 'Wallet not connected',
    };
  }

  if (!sessionId) {
    return {
      success: false,
      tierUpgraded: false,
      error: 'Session ID is required',
    };
  }

  try {
    const API_BASE_URL = getApiBaseUrl('/api/badges/');
    const response = await fetch(`${API_BASE_URL}/badges/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        playerAddress: address,
        sessionId: sessionId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return {
        success: false,
        tierUpgraded: false,
        error: errorData.error || `HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('❌ [BADGE] Error checking badge update:', error);
    return {
      success: false,
      tierUpgraded: false,
      error: error.message || 'Failed to check badge update',
    };
  }
}

/**
 * Sign and execute badge transaction
 * @param {string|Object} transaction - Serialized transaction bytes (base64 string) or legacy transactionData object
 * @returns {Promise<Object>} Transaction result
 */
async function signAndExecuteBadgeTransaction(transaction) {
  if (!window.walletAPIInstance || !window.walletAPIInstance.isConnected()) {
    return {
      success: false,
      error: 'Wallet not connected',
    };
  }

  if (!transaction) {
    return {
      success: false,
      error: 'Transaction is required',
    };
  }

  console.log('🚀 [BADGE] ========== EXECUTING TRANSACTION ==========');
  console.log('🚀 [BADGE] Transaction type:', typeof transaction);
  // Safe check: only use 'in' operator on objects, never on strings
  const isObject = transaction && typeof transaction === 'object' && transaction !== null;
  console.log('🚀 [BADGE] Transaction details:', {
    isString: typeof transaction === 'string',
    isObject: isObject,
    hasKind: isObject ? ('kind' in transaction) : false,
    hasBlockData: isObject ? ('blockData' in transaction) : false,
    constructor: transaction?.constructor?.name,
    length: typeof transaction === 'string' ? transaction.length : 'N/A',
  });
  
  try {
    // Pass Transaction object directly to wallet API
    // The wallet API accepts Transaction objects, base64 strings, or Uint8Array
    console.log('⏳ [BADGE] Calling wallet API signAndExecuteTransaction...');
    const result = await window.walletAPIInstance.signAndExecuteTransaction(transaction);

    console.log('📥 [BADGE] Transaction result received:', {
      success: result.success,
      digest: result.digest,
      hasEffects: !!result.effects,
      hasEvents: !!result.events,
      error: result.error,
    });

    if (result.success) {
      console.log('✅ [BADGE] Transaction executed successfully');
      console.log('✅ [BADGE] Transaction digest:', result.digest);
      
      // The wallet module already verified the transaction succeeded
      // It handles undefined status by checking for digest + effects + no error
      // We should trust its determination
      const effectsStatus = result.effects?.status?.status;
      console.log('🔍 [BADGE] Checking transaction effects status:', effectsStatus);
      
      // Only treat as failure if status is explicitly 'failure'
      // If status is undefined but wallet module says success, trust it
      if (effectsStatus === 'failure') {
        const error = result.effects?.status?.error || 'Transaction failed on-chain';
        console.error('❌ [BADGE] ========== TRANSACTION FAILED ON-CHAIN ==========');
        console.error('❌ [BADGE] Digest:', result.digest);
        console.error('❌ [BADGE] Error:', error);
        console.error('❌ [BADGE] Full effects:', JSON.stringify(result.effects, null, 2));
        return {
          success: false,
          digest: result.digest,
          error: error,
          effects: result.effects
        };
      }
      
      // If status is undefined, wallet module already verified success
      // (it checks for digest + effects + no error)
      if (effectsStatus === undefined) {
        console.log('✅ [BADGE] Transaction status undefined - wallet module verified success (has digest + effects + no error)');
      }
      
      console.log('✅ [BADGE] Transaction confirmed on-chain');
      console.log('📊 [BADGE] Transaction effects summary:', {
        status: result.effects?.status?.status,
        gasUsed: result.effects?.gasUsed,
        objectChanges: result.objectChanges?.length || 0,
        events: result.events?.length || 0,
      });
      
      // Clear cache BEFORE waiting/verifying to ensure fresh data
      console.log('🗑️ [BADGE] Clearing badge cache before verification...');
      clearBadgeCache({ address: getPlayerAddress() });
      console.log('✅ [BADGE] Badge cache cleared');
      
      // Wait a moment for the transaction to be indexed, then verify badge was updated
      console.log('⏳ [BADGE] Waiting 3 seconds for transaction to be indexed...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      console.log('✅ [BADGE] Indexing wait complete');
      
      // Verify badge was actually updated by querying the chain (with retries)
      // We need to check that the tier actually changed, not just that the badge exists
      const playerAddress = getPlayerAddress();
      console.log('🔍 [BADGE] Verifying badge upgrade on-chain for address:', playerAddress);
      
      // Get the expected new tier from the transaction data
      // The upgrade transaction should have updated the tier, so we need to verify it changed
      // For now, we'll just verify the badge exists and is queryable
      // The actual tier verification would require passing the expected tier to this function
      
      if (playerAddress) {
        // Retry verification up to 5 times with increasing delays (indexing can be slow)
        let badge = null;
        const maxRetries = 5;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
          if (attempt > 0) {
            const delay = 2000 * attempt; // 2s, 4s, 6s, 8s delays
            console.log(`⏳ [BADGE] Verification attempt ${attempt + 1}/${maxRetries}, waiting ${delay}ms for indexing...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          
          // Clear cache before each attempt to ensure fresh query
          clearBadgeCache({ address: playerAddress });
          
          console.log(`📡 [BADGE] Querying badge from blockchain (attempt ${attempt + 1}/${maxRetries})...`);
          const badgeResponse = await getBadge(playerAddress);
          
          // getBadge returns API response: {success, hasBadge, badge: {badgeId, tier, ...}}
          const badgeData = badgeResponse?.badge;
          
          console.log(`📋 [BADGE] Badge query result (attempt ${attempt + 1}):`, {
            found: !!badgeResponse,
            hasBadge: badgeResponse?.hasBadge,
            badgeId: badgeData?.badgeId,
            tier: badgeData?.tier,
            gamesPlayed: badgeData?.gamesPlayed,
            mintDate: badgeData?.mintDate,
          });
          
          if (badgeResponse && badgeResponse.success && badgeResponse.hasBadge && badgeData && badgeData.badgeId) {
            console.log('✅ [BADGE] ========== BADGE VERIFIED ON-CHAIN ==========');
            console.log('✅ [BADGE] Badge ID:', badgeData.badgeId);
            console.log('✅ [BADGE] Badge tier:', badgeData.tier);
            console.log('✅ [BADGE] Games played:', badgeData.gamesPlayed);
            console.log('✅ [BADGE] Mint date:', badgeData.mintDate);
            badge = badgeData; // Store the badge data for later use
            // Note: We verify the badge exists, but tier update may take longer to index
            // The badge will be refreshed on next load, and tier should be updated by then
            break; // Success, exit retry loop
          } else if (attempt < maxRetries - 1) {
            console.warn(`⚠️ [BADGE] Badge not found yet (attempt ${attempt + 1}/${maxRetries}), will retry...`);
          }
        }
        
        if (!badge || !badge.badgeId) {
          console.warn('⚠️ [BADGE] ========== BADGE NOT FOUND AFTER RETRIES ==========');
          console.warn('⚠️ [BADGE] Transaction succeeded but badge verification failed after all retries');
          console.warn('⚠️ [BADGE] This may be due to:');
          console.warn('⚠️ [BADGE]   1. Transaction not yet indexed (may take longer)');
          console.warn('⚠️ [BADGE]   2. Badge query endpoint issue');
          console.warn('⚠️ [BADGE]   3. Transaction succeeded but badge update failed');
          console.warn('⚠️ [BADGE] Transaction digest:', result.digest);
          console.warn('⚠️ [BADGE] Badge will be refreshed on next load');
          // Still return success since transaction executed - verification failure is non-critical
          // The badge will be updated on-chain, just not immediately queryable
        } else {
          // Badge found, but tier might not be updated yet due to indexing delay
          // Log a warning if tier is still 0 (assuming upgrade was to tier 1+)
          if (badge.tier === 0) {
            console.warn('⚠️ [BADGE] Badge found but tier is still 0 - upgrade may not be indexed yet');
            console.warn('⚠️ [BADGE] The badge will refresh on next load and should show the updated tier');
          }
        }
      } else {
        console.warn('⚠️ [BADGE] Cannot verify badge: player address not available');
      }
    } else {
      console.error('❌ [BADGE] Transaction execution failed:', result.error);
    }

    console.log('🚀 [BADGE] ========== TRANSACTION EXECUTION COMPLETE ==========');
    return result;
  } catch (error) {
    console.error('❌ [BADGE] Error executing transaction:', error);
    return {
      success: false,
      error: error.message || 'Failed to execute transaction',
    };
  }
}

/**
 * Get tier name
 * @param {number} tier - Badge tier (0-5)
 * @returns {string} Tier name
 */
function getTierName(tier) {
  const tierNames = [
    'Standard',
    'Common',
    'Uncommon',
    'Rare',
    'Epic',
    'Legendary',
  ];
  return tierNames[tier] || 'Unknown';
}

/**
 * Clear badge cache
 */
function clearBadgeCache(options = {}) {
  const address = options.address || badgeCache.address;
  if (address) {
    try {
      window?.localStorage?.removeItem(badgeStorageKey(address));
    } catch {
      // ignore
    }
  }
  badgeCache.data = null;
  badgeCache.address = null;
  badgeCache.timestamp = 0;
  badgePuCache = { address: null, data: null, timestamp: 0, ttlMs: badgePuCache.ttlMs };
}

// Export functions
if (typeof window !== 'undefined') {
  window.BadgeService = {
    getBadge,
    hasBadge,
    checkBadgeMigration,
    checkPendingUpgrade,
    buildMintBadgeTransaction,
    buildUpgradeBadgeTransaction,
    checkAndBuildBadgeUpdate,
    signAndExecuteBadgeTransaction,
    getTierName,
    clearBadgeCache,
  };
}

