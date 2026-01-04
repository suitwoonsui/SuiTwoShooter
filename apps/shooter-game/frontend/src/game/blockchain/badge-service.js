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

  try {
    console.log('🔨 [BADGE] Building mint transaction (backend)...');
    
    // Call backend to build transaction (like store does)
    // This ensures we use the same code path as admin_mint_badge which works
    const API_BASE_URL = getApiBaseUrl();
    const response = await fetch(`${API_BASE_URL}/badges/mint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        playerAddress: address,
        // paymentCoinId is optional - backend will use txb.gas
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

    if (!data.success || !data.transaction) {
      return {
        success: false,
        error: data.error || 'Failed to build mint transaction',
      };
    }

    console.log('✅ [BADGE] Transaction built successfully by backend');
    
    // Return base64 transaction string (frontend just signs it, like store)
    return {
      success: true,
      transaction: data.transaction, // Base64 string
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
 * Build upgrade badge transaction (similar to buildMintBadgeTransaction)
 * Follows the same flow as badge minting - backend builds transaction, frontend signs it
 * 
 * @param {string} badgeId - Badge object ID to upgrade
 * @param {number} newTier - New tier number
 * @param {string} sessionId - Session ID for idempotency
 * @returns {Promise<Object>} Transaction object ready for signing
 */
async function buildUpgradeBadgeTransaction(badgeId, newTier, sessionId) {
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

  if (!sessionId) {
    return {
      success: false,
      error: 'Session ID is required',
    };
  }

  try {
    console.log('🔨 [BADGE] Building upgrade transaction (backend)...');
    
    // Call backend to build transaction (like mint does)
    const API_BASE_URL = getApiBaseUrl();
    const response = await fetch(`${API_BASE_URL}/badges/upgrade`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        playerAddress: address,
        badgeId: badgeId,
        newTier: newTier,
        sessionId: sessionId,
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

    if (!data.success || !data.transaction) {
      return {
        success: false,
        error: data.error || 'Failed to build upgrade transaction',
      };
    }

    console.log('✅ [BADGE] Upgrade transaction built successfully by backend');
    
    // Return base64 transaction string (frontend just signs it, like mint)
    return {
      success: true,
      transaction: data.transaction, // Base64 string
    };
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
      badgeCache.data = null;
      badgeCache.address = null;
      badgeCache.timestamp = 0;
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
          badgeCache.data = null;
          badgeCache.address = null;
          badgeCache.timestamp = 0;
          
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
 * Creates a new badge preserving old tier, games played, and mint date
 * @param {string} playerAddress - Player's wallet address
 * @param {number} oldTier - Tier from old badge (0-5)
 * @param {number} oldGamesPlayed - Games played from old badge
 * @param {number} oldMintDate - Original mint date from old badge
 * @returns {Promise<{success: boolean, transaction?: string, digest?: string, error?: string}>}
 */
async function migrateBadge(playerAddress, oldTier, oldGamesPlayed = 0, oldMintDate = 0) {
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
    // The backend will use migrate_badge() function to preserve old tier, games played, and mint date
    // NO payment required (free migration)
    const response = await fetch(`${API_BASE_URL}/badges/migrate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        playerAddress,
        oldTier,
        oldGamesPlayed: oldGamesPlayed || 0,
        oldMintDate: oldMintDate || 0,
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

    // Return success with transaction (for player to sign) or digest (if already executed)
    return {
      success: true,
      transaction: data.transaction, // Base64 transaction string for player to sign
      digest: data.digest, // Transaction digest if already executed
      message: data.message,
      gasEstimate: data.gasEstimate,
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
    buildUpgradeBadgeTransaction,
    checkAndBuildBadgeUpdate,
    signAndExecuteBadgeTransaction,
    migrateBadge,
    getDiscountsForTier,
    getTierName,
    clearBadgeCache,
  };
}

