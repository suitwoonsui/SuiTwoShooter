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
  cacheDuration: 60000, // 1 minute cache
};

/**
 * Get API base URL
 */
function getApiBaseUrl() {
  return window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3000/api';
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
async function getBadge(playerAddress = null) {
  const address = playerAddress || getPlayerAddress();
  if (!address) {
    return {
      success: false,
      error: 'Wallet not connected',
    };
  }

  // Check cache (only use if it's for the same address)
  const now = Date.now();
  if (badgeCache.data && badgeCache.address === address && (now - badgeCache.timestamp) < badgeCache.cacheDuration) {
    console.log('📋 [BADGE] Using cached badge data for address:', address);
    return badgeCache.data;
  }
  
  // If cache is for a different address, clear it
  if (badgeCache.address && badgeCache.address !== address) {
    console.log('📋 [BADGE] Cache is for different address, clearing cache');
    badgeCache.data = null;
    badgeCache.address = null;
    badgeCache.timestamp = 0;
  }

  try {
    const API_BASE_URL = getApiBaseUrl();
    const response = await fetch(`${API_BASE_URL}/badges/${address}`, {
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
    
    // Update cache with address
    badgeCache.data = data;
    badgeCache.address = address;
    badgeCache.timestamp = now;

    return data;
  } catch (error) {
    console.error('❌ [BADGE] Error fetching badge:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch badge',
    };
  }
}

/**
 * Check if player needs to migrate their badge
 * @param {string} playerAddress - Player's wallet address (optional)
 * @returns {Promise<Object>} Migration data if migration needed, null otherwise
 */
async function checkBadgeMigration(playerAddress = null) {
  const address = playerAddress || getPlayerAddress();
  if (!address) {
    return {
      success: false,
      error: 'Wallet not connected',
    };
  }

  try {
    const API_BASE_URL = getApiBaseUrl();
    const response = await fetch(`${API_BASE_URL}/badges/${address}/migrate-data`, {
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
    return data;
  } catch (error) {
    console.error('❌ [BADGE] Error checking migration:', error);
    return {
      success: false,
      error: error.message || 'Failed to check migration',
    };
  }
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

/**
 * Build mint badge transaction (fully client-side, no backend needed)
 * 
 * Flow:
 * 1. Wallet module finds a coin with sufficient balance (≥0.1 SUI)
 * 2. Estimates gas budget (0.01 SUI)
 * 3. Calculates fee = 0.1 SUI - gas
 * 4. Splits fee from coin, uses remainder for gas
 * 5. Builds transaction with contract addresses from config
 * 
 * @returns {Promise<Object>} Transaction object ready for signing
 */
async function buildMintBadgeTransaction() {
  const address = getPlayerAddress();
  if (!address) {
    return {
      success: false,
      error: 'Wallet not connected. Please connect your wallet first.',
    };
  }

  // Validate wallet API is available
  if (!window.walletAPIInstance) {
    return {
      success: false,
      error: 'Wallet API not initialized. Please wait for wallet module to load.',
    };
  }

  if (!window.walletAPIInstance.buildBadgeMintTransaction) {
    return {
      success: false,
      error: 'Badge minting not supported. Please update your wallet module.',
    };
  }

  // Validate contract config is loaded
  if (!window.GAME_CONFIG?.CONTRACTS) {
    return {
      success: false,
      error: 'Contract configuration not loaded. Please refresh the page.',
    };
  }

  try {
    console.log('🔨 [BADGE] Building mint transaction (client-side)...');
    
    const buildResult = await window.walletAPIInstance.buildBadgeMintTransaction(address);

    if (!buildResult.success) {
      return buildResult;
    }

    console.log('✅ [BADGE] Transaction built successfully');
    
    return {
      success: true,
      transaction: buildResult.transaction,
    };
  } catch (error) {
    console.error('❌ [BADGE] Error building mint transaction:', error);
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
    const API_BASE_URL = getApiBaseUrl();
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
 * Check and build badge update transaction
 * @param {string} sessionId - Session ID from score submission
 * @returns {Promise<Object>} Transaction data if tier upgrade needed
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
    const API_BASE_URL = getApiBaseUrl();
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
  console.log('🚀 [BADGE] Transaction object:', {
    isObject: transaction && typeof transaction === 'object',
    hasKind: transaction && 'kind' in transaction,
    hasBlockData: transaction && 'blockData' in transaction,
    constructor: transaction?.constructor?.name,
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
      
      // Wait a moment for the transaction to be indexed, then verify badge was minted
      console.log('⏳ [BADGE] Waiting 2 seconds for transaction to be indexed...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('✅ [BADGE] Indexing wait complete');
      
      // Verify badge was actually minted by querying the chain
      const playerAddress = getPlayerAddress();
      console.log('🔍 [BADGE] Verifying badge on-chain for address:', playerAddress);
      
      if (playerAddress) {
        console.log('📡 [BADGE] Querying badge from blockchain...');
        const badge = await getBadge(playerAddress);
        
        console.log('📋 [BADGE] Badge query result:', {
          found: !!badge,
          badgeId: badge?.badgeId,
          tier: badge?.tier,
          gamesPlayed: badge?.gamesPlayed,
          mintDate: badge?.mintDate,
        });
        
        if (badge && badge.badgeId) {
          console.log('✅ [BADGE] ========== BADGE VERIFIED ON-CHAIN ==========');
          console.log('✅ [BADGE] Badge ID:', badge.badgeId);
          console.log('✅ [BADGE] Badge tier:', badge.tier);
          console.log('✅ [BADGE] Games played:', badge.gamesPlayed);
          console.log('✅ [BADGE] Mint date:', badge.mintDate);
        } else {
          console.warn('⚠️ [BADGE] ========== BADGE NOT FOUND ==========');
          console.warn('⚠️ [BADGE] Transaction succeeded but badge not found on-chain');
          console.warn('⚠️ [BADGE] This may be due to:');
          console.warn('⚠️ [BADGE]   1. Transaction not yet indexed (wait a few seconds)');
          console.warn('⚠️ [BADGE]   2. Badge query endpoint issue');
          console.warn('⚠️ [BADGE]   3. Transaction succeeded but badge creation failed');
          console.warn('⚠️ [BADGE] Transaction digest:', result.digest);
        }
      } else {
        console.warn('⚠️ [BADGE] Cannot verify badge: player address not available');
      }
      
      // Clear cache to force refresh
      console.log('🗑️ [BADGE] Clearing badge cache...');
      badgeCache.data = null;
      badgeCache.timestamp = 0;
      console.log('✅ [BADGE] Badge cache cleared');
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
 * Get discount percentages for a tier
 * @param {number} tier - Badge tier (0-5)
 * @returns {Object} Discount percentages {store: number, gameplay: number}
 */
function getDiscountsForTier(tier) {
  const discounts = [
    { store: 0, gameplay: 0 },    // Standard
    { store: 5, gameplay: 0 },     // Common
    { store: 10, gameplay: 5 },    // Uncommon
    { store: 15, gameplay: 10 },   // Rare
    { store: 20, gameplay: 15 },   // Epic
    { store: 25, gameplay: 20 },   // Legendary
  ];
  return discounts[tier] || discounts[0];
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
function clearBadgeCache() {
  badgeCache.data = null;
  badgeCache.address = null;
  badgeCache.timestamp = 0;
}

/**
 * Build migration transaction for player to sign
 * @param {string} oldBadgeId - Object ID of the old badge (optional - if provided, will attempt to delete it)
 * @param {number} oldTier - Tier from old badge
 * @param {number} oldGamesPlayed - Games played from old badge
 * @param {number} oldMintDate - Original mint date from old badge
 * @param {string} imageUrl - URL to badge image (or null to construct from tier)
 * @param {string} oldPackageId - Package ID of the old badge contract (optional - if provided, will attempt to delete old badge)
 * @returns {Promise<Object>} Transaction data (base64 string)
 */
/**
 * Migrate badge from old system to new system
 * Creates a new badge at the same tier - the backend handles everything
 * @param {string} playerAddress - Player's wallet address
 * @param {number} oldTier - Tier from old badge (0-5)
 * @returns {Promise<{success: boolean, digest?: string, error?: string}>}
 */
async function migrateBadge(playerAddress, oldTier) {
  try {
    // Validate inputs
    if (!playerAddress || typeof playerAddress !== 'string' || !playerAddress.startsWith('0x')) {
      return {
        success: false,
        error: 'Invalid player address',
      };
    }

    if (oldTier === undefined || oldTier === null || typeof oldTier !== 'number' || oldTier < 0 || oldTier > 5) {
      return {
        success: false,
        error: 'Invalid tier. Must be a number between 0 and 5',
      };
    }

    // Get API base URL
    const API_BASE_URL = getApiBaseUrl();
    
    // Call backend API to migrate badge
    // The backend will use adminMintBadge to create a new badge at the same tier
    // The new badge will use the current system's image URL generation automatically
    const response = await fetch(`${API_BASE_URL}/badges/migrate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        playerAddress,
        oldTier,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return {
        success: false,
        error: errorData.error || `HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    
    if (!data.success) {
      return {
        success: false,
        error: data.error || 'Failed to migrate badge',
      };
    }

    // Return success with transaction digest
    return {
      success: true,
      digest: data.digest,
      message: data.message,
    };
  } catch (error) {
    console.error('❌ [BADGE] Error migrating badge:', error);
    return {
      success: false,
      error: error.message || 'Failed to migrate badge',
    };
  }
}

// Export functions
if (typeof window !== 'undefined') {
  window.BadgeService = {
    getBadge,
    hasBadge,
    checkBadgeMigration,
    checkPendingUpgrade,
    buildMintBadgeTransaction,
    checkAndBuildBadgeUpdate,
    signAndExecuteBadgeTransaction,
    migrateBadge,
    getDiscountsForTier,
    getTierName,
    clearBadgeCache,
  };
}

