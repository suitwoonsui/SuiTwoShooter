/**
 * Score Submission Module
 * Handles blockchain transaction signing and submission for game scores
 */

// Contract configuration - will be set after deployment
let GAME_CONTRACT_PACKAGE_ID = null; // Set after testnet deployment
const GAME_CONTRACT_MODULE = 'score_submission';
const GAME_CONTRACT_FUNCTION = 'submit_game_session';

// Clock object ID - Sui framework provides this
// Standard Clock object ID in Sui: '0x6'
const SUI_CLOCK_OBJECT_ID = '0x6';

/**
 * Validate game stats before submission
 * @param {Object} gameStats - Game statistics to validate
 * @returns {{valid: boolean, error?: string}}
 */
function validateGameStats(gameStats) {
  if (!gameStats || typeof gameStats !== 'object') {
    return { valid: false, error: 'Invalid game stats: must be an object' };
  }
  
  const requiredFields = ['score', 'distance', 'coins', 'bossesDefeated', 'enemiesDefeated', 'longestCoinStreak'];
  for (const field of requiredFields) {
    if (gameStats[field] === undefined || gameStats[field] === null) {
      return { valid: false, error: `Missing required field: ${field}` };
    }
    if (typeof gameStats[field] !== 'number' || isNaN(gameStats[field]) || gameStats[field] < 0) {
      return { valid: false, error: `Invalid ${field}: must be a non-negative number` };
    }
  }
  
  // Validate logical constraints
  if (gameStats.longestCoinStreak > gameStats.coins) {
    return { valid: false, error: 'Longest coin streak cannot exceed coins collected' };
  }
  
  if (gameStats.distance < 35) {
    return { valid: false, error: 'Distance too low (minimum 35 required)' };
  }
  
  if (gameStats.coins > 1000) {
    return { valid: false, error: 'Coin count too high (maximum 1000 allowed)' };
  }
  
  return { valid: true };
}

/**
 * Submit game score to blockchain via backend
 * Admin wallet signs and pays gas fees
 * @param {Object} gameStats - Game statistics
 * @param {number} gameStats.score - Total score
 * @param {number} gameStats.distance - Distance traveled
 * @param {number} gameStats.coins - Coins collected
 * @param {number} gameStats.bossesDefeated - Bosses defeated
 * @param {number} gameStats.enemiesDefeated - Enemies defeated
 * @param {number} gameStats.longestCoinStreak - Longest coin streak
 * @param {string} gameStats.sessionId - Unique session ID
 * @param {string} playerName - Optional player name (empty string if skipped)
 * @returns {Promise<Object>} Transaction result
 */
async function submitScoreToBlockchain(gameStats, playerName = '') {
  console.log('📝 [BLOCKCHAIN] Submitting score via backend:', gameStats, 'Name:', playerName || '(empty)');

  // Validate stats before submission
  const validation = validateGameStats(gameStats);
  if (!validation.valid) {
    console.error('❌ [BLOCKCHAIN] Stats validation failed:', validation.error);
    return {
      success: false,
      error: validation.error || 'Invalid game stats'
    };
  }

  // Check wallet connection
  if (!window.walletAPIInstance || !window.walletAPIInstance.isConnected()) {
    return {
      success: false,
      error: 'Wallet not connected. Please connect your wallet first.'
    };
  }

  const playerAddress = window.walletAPIInstance.getAddress();
  if (!playerAddress) {
    return {
      success: false,
      error: 'No wallet address available'
    };
  }

  try {
    // Get API base URL (from config or default)
    // Note: process.env is not available in browser, use window config or default
    const API_BASE_URL = window.GAME_CONFIG?.API_BASE_URL || 
                         'http://localhost:3000/api';

    console.log(`📤 [BLOCKCHAIN] Sending score data to backend: ${API_BASE_URL}/scores/submit`);

    // Send score data to backend
    const response = await fetch(`${API_BASE_URL}/scores/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        playerAddress,  // User's wallet address
        playerName: playerName || '',  // Player name (empty if skipped)
        sessionId: gameStats.sessionId || null,  // Session ID
        scoreData: {
          score: Math.round(gameStats.score || 0),
          distance: Math.round(gameStats.distance || 0),  // Round to integer for Move contract
          coins: Math.round(gameStats.coins || 0),
          bossesDefeated: Math.round(gameStats.bossesDefeated || 0),
          enemiesDefeated: Math.round(gameStats.enemiesDefeated || 0),
          longestCoinStreak: Math.round(gameStats.longestCoinStreak || 0)
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `HTTP error! status: ${response.status}` }));
      throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ [BLOCKCHAIN] Score submitted successfully!', {
        digest: result.digest,
        playerAddress: result.playerAddress,
        gasPaidBy: result.gasPaidBy
      });
      
      return {
        success: true,
        digest: result.digest,
        playerAddress: result.playerAddress,
        gasPaidBy: result.gasPaidBy,
        message: result.message
      };
    } else {
      throw new Error(result.error || 'Score submission failed');
    }
  } catch (error) {
    console.error('❌ [BLOCKCHAIN] Error submitting score:', error);
    return {
      success: false,
      error: error.message || 'Failed to submit score to blockchain'
    };
  }
}

/**
 * Set contract package ID (called after deployment)
 * @param {string} packageId - Contract package ID
 */
function setContractPackageId(packageId) {
  GAME_CONTRACT_PACKAGE_ID = packageId;
  console.log('✅ [BLOCKCHAIN] Contract package ID set:', packageId);
}

/**
 * Get contract package ID
 * @returns {string|null} Package ID or null if not set
 */
function getContractPackageId() {
  return GAME_CONTRACT_PACKAGE_ID;
}

// Export for use (as window properties, not ES module)
if (typeof window !== 'undefined') {
  window.submitScoreToBlockchain = submitScoreToBlockchain;
  window.setContractPackageId = setContractPackageId;
  window.getContractPackageId = getContractPackageId;
}

