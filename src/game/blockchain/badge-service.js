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
 * Get SUI coins from wallet and select/merge for payment
 * Uses backend API to avoid importing @mysten/sui/client in frontend
 * @param {number} requiredAmountMist - Required amount in MIST (1 SUI = 1,000,000,000 MIST)
 * @returns {Promise<Object>} Coin ID or error
 */
async function getPaymentCoin(requiredAmountMist) {
  const address = getPlayerAddress();
  if (!address) {
    return {
      success: false,
      error: 'Wallet not connected',
    };
  }

  try {
    // Call backend API to get payment coin
    const API_BASE_URL = getApiBaseUrl();
    const response = await fetch(
      `${API_BASE_URL}/badges/payment-coin?address=${encodeURIComponent(address)}&requiredAmount=${requiredAmountMist}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

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
    console.error('❌ [BADGE] Error getting payment coin:', error);
    return {
      success: false,
      error: error.message || 'Failed to get payment coin',
    };
  }
}

/**
 * Calculate required SUI amount for minting fee ($0.10 dollar-pegged)
 * @returns {Promise<Object>} Required amount in MIST
 */
async function calculateMintingFee() {
  try {
    // Get current SUI price (simplified - in production, use a price oracle)
    // For now, we'll use a conservative estimate or fetch from an API
    const API_BASE_URL = getApiBaseUrl();
    
    // Try to get price from backend price converter
    try {
      const response = await fetch(`${API_BASE_URL.replace('/api', '')}/api/tokens/balance/${getPlayerAddress()}`);
      // If that doesn't work, use a default
    } catch (e) {
      // Ignore
    }

    // Default: Assume $1.00 per SUI (conservative)
    // $0.10 / $1.00 = 0.1 SUI = 100,000,000 MIST
    // But we'll use a higher amount to account for price fluctuations
    // Use 0.15 SUI = 150,000,000 MIST as a safe default
    const defaultAmountMist = 150_000_000; // 0.15 SUI (covers price up to $1.50/SUI)

    // In production, you'd fetch current SUI price and calculate:
    // const suiPrice = await getCurrentSuiPrice(); // e.g., $1.20
    // const requiredSui = 0.10 / suiPrice; // e.g., 0.0833 SUI
    // const requiredMist = Math.ceil(requiredSui * 1_000_000_000);

    return {
      success: true,
      amountMist: defaultAmountMist,
      amountSui: defaultAmountMist / 1_000_000_000,
    };
  } catch (error) {
    console.error('❌ [BADGE] Error calculating minting fee:', error);
    // Fallback to default
    return {
      success: true,
      amountMist: 150_000_000, // 0.15 SUI
      amountSui: 0.15,
    };
  }
}

/**
 * Build mint badge transaction
 * @param {string} paymentCoinId - Player's payment coin ID (SUI coin for minting fee)
 * @returns {Promise<Object>} Transaction data for signing
 */
async function buildMintBadgeTransaction(paymentCoinId) {
  const address = getPlayerAddress();
  if (!address) {
    return {
      success: false,
      error: 'Wallet not connected',
    };
  }

  if (!paymentCoinId) {
    return {
      success: false,
      error: 'Payment coin ID is required',
    };
  }

  try {
    const API_BASE_URL = getApiBaseUrl();
    const response = await fetch(`${API_BASE_URL}/badges/mint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        playerAddress: address,
        paymentCoinId: paymentCoinId,
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
    return data;
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

  // Handle legacy transactionData object format
  if (transaction && typeof transaction === 'object' && !(transaction instanceof Uint8Array)) {
    return {
      success: false,
      error: 'Legacy transaction format no longer supported. Please use the new API.',
    };
  }

  if (!transaction || (typeof transaction !== 'string' && !(transaction instanceof Uint8Array))) {
    return {
      success: false,
      error: 'Invalid transaction data. Expected base64 string or Uint8Array.',
    };
  }

  try {
    // Pass base64 transaction string directly to wallet API
    // The wallet API will handle deserialization
    const result = await window.walletAPIInstance.signAndExecuteTransaction(transaction);

    if (result.success) {
      console.log('✅ [BADGE] Transaction executed:', result.digest);
      // Clear cache to force refresh
      badgeCache.data = null;
      badgeCache.timestamp = 0;
    }

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
    getPaymentCoin,
    calculateMintingFee,
  };
}

