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

  // Check if game was in demo mode - prevent score submission
  const game = typeof window !== 'undefined' && window.game ? window.game : null;
  const gameState = typeof window !== 'undefined' && window.gameState ? window.gameState : null;
  const isDemoMode = (game && game.isDemoMode) || (gameState && gameState.isDemoMode);
  
  if (isDemoMode) {
    console.warn('⚠️ [BLOCKCHAIN] Score submission blocked - game was in demo mode');
    return {
      success: false,
      error: 'Cannot submit scores from demo mode. Please purchase credits to save your score.'
    };
  }

  // Check if this is a tournament game
  // Try multiple sources to find tournament state
  let isTournamentMode = false;
  let tournamentObjectId = null;
  let tournamentCategory = null;

  // Golden-path: TournamentContext is the single source of truth.
  try {
    const ctx =
      (typeof window !== 'undefined' && window.TournamentContext && typeof window.TournamentContext.load === 'function')
        ? window.TournamentContext.load()
        : null;
    if (ctx && ctx.isTournamentMode && typeof ctx.tournamentObjectId === 'string' && ctx.tournamentObjectId.startsWith('0x')) {
      isTournamentMode = true;
      tournamentObjectId = ctx.tournamentObjectId;
      tournamentCategory = ctx.tournamentCategory || null;
    }
  } catch (_) {}
  
  // Priority 1: window.game (most direct access)
  if (game && game.isTournamentMode) {
    isTournamentMode = game.isTournamentMode;
    tournamentObjectId = game.tournamentObjectId;
    tournamentCategory = game.tournamentCategory;
  }
  // Priority 2: gameState (window.gameState)
  else if (gameState && gameState.isTournamentMode) {
    isTournamentMode = gameState.isTournamentMode;
    tournamentObjectId = gameState.tournamentObjectId;
    tournamentCategory = gameState.tournamentCategory;
  }
  // Priority 3: window.gameState directly (in case game/gameState references are stale)
  else if (typeof window !== 'undefined' && window.gameState && window.gameState.isTournamentMode) {
    isTournamentMode = window.gameState.isTournamentMode;
    tournamentObjectId = window.gameState.tournamentObjectId;
    tournamentCategory = window.gameState.tournamentCategory;
  }
  // Priority 4: window.game directly (in case it's different from gameState)
  else if (typeof window !== 'undefined' && window.game && window.game.isTournamentMode) {
    isTournamentMode = window.game.isTournamentMode;
    tournamentObjectId = window.game.tournamentObjectId;
    tournamentCategory = window.game.tournamentCategory;
  }
  
  // Debug logging for tournament mode detection
  console.log('🏆 [SCORE SUBMISSION] Tournament mode check', {
    isTournamentMode,
    tournamentObjectId,
    tournamentCategory,
    gameIsTournamentMode: game?.isTournamentMode,
    gameTournamentObjectId: game?.tournamentObjectId,
    gameStateIsTournamentMode: gameState?.isTournamentMode,
    gameStateTournamentObjectId: gameState?.tournamentObjectId,
    windowGameIsTournamentMode: typeof window !== 'undefined' && window.game ? window.game.isTournamentMode : 'N/A',
    windowGameTournamentObjectId: typeof window !== 'undefined' && window.game ? window.game.tournamentObjectId : 'N/A',
    windowGameStateIsTournamentMode: typeof window !== 'undefined' && window.gameState ? window.gameState.isTournamentMode : 'N/A',
    windowGameStateTournamentObjectId: typeof window !== 'undefined' && window.gameState ? window.gameState.tournamentObjectId : 'N/A',
  });

  // Replay is required; server computes score from it
  const replay = (typeof window !== 'undefined' && window.ReplayRecorder && typeof window.ReplayRecorder.getReplay === 'function')
    ? window.ReplayRecorder.getReplay()
    : null;
  if (!replay || !Array.isArray(replay.events) || replay.events.length === 0) {
    console.error('❌ [BLOCKCHAIN] No replay available. Ensure ReplayRecorder ran for this run.');
    return {
      success: false,
      error: 'No replay data. Score submission requires replay events from this run.'
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
    // Score submit and tournament submit are implemented on the game backend (proxies platform as needed).
    const API_BASE_URL = (window.GameApi ? window.GameApi.getBaseUrl() : (window.GAME_CONFIG?.GAME_BACKEND_URL || window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3001/api')).replace(/\/?$/, '');

    // Route to tournament endpoint if tournament mode
    if (isTournamentMode && tournamentObjectId) {
      // Validate tournamentObjectId is present and valid format (Sui object ID)
      if (!tournamentObjectId || typeof tournamentObjectId !== 'string' || tournamentObjectId.length < 10) {
        console.error('❌ [TOURNAMENT] Invalid tournamentObjectId, falling back to regular game submission', {
          tournamentObjectId,
          isTournamentMode,
        });
        // Fall through to regular game submission
      } else {
        console.log(`🏆 [TOURNAMENT] Submitting tournament score to SPECIFIC tournament`, {
          tournamentObjectId,
          tournamentCategory,
          playerAddress,
          playerName: playerName || '(not provided)',
          replayEventCount: replay.events.length,
          endpoint: `${API_BASE_URL}/tournaments/${tournamentObjectId}/submit-score`,
          note: 'Score computed from replay on server',
        });

      // Tournament submit requires sessionId (Anchor session ID).
      // Prefer the stats payload, but fall back to the tournament session persisted on window/game state.
      const ctx = (typeof window !== 'undefined' && window.TournamentContext && typeof window.TournamentContext.load === 'function')
        ? window.TournamentContext.load()
        : null;
      const sessionId =
        (typeof gameStats.anchorSessionId === 'number' && gameStats.anchorSessionId >= 1)
          ? gameStats.anchorSessionId
          : (ctx && typeof ctx.anchorSessionId === 'number' && ctx.anchorSessionId >= 1)
          ? ctx.anchorSessionId
          : (typeof window !== 'undefined' && typeof window.__tournamentAnchorSessionId === 'number' && window.__tournamentAnchorSessionId >= 1)
          ? window.__tournamentAnchorSessionId
          : (typeof window !== 'undefined' && window.game && typeof window.game.anchorSessionId === 'number' && window.game.anchorSessionId >= 1)
          ? window.game.anchorSessionId
          : (typeof window !== 'undefined' && window.gameState && typeof window.gameState.anchorSessionId === 'number' && window.gameState.anchorSessionId >= 1)
          ? window.gameState.anchorSessionId
          : null;
      if (sessionId == null) {
        throw new Error(
          'No tournament session. Start the tournament from the tournament menu so a session is created; if session creation failed, you cannot submit.'
        );
      }

      const clientRequestId =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `fe-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      const response = await fetch(`${API_BASE_URL}/tournaments/${tournamentObjectId}/submit-score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Id': clientRequestId,
        },
        body: JSON.stringify({
          playerAddress,
          sessionId,
          replay: { version: replay.version, events: replay.events },
          playerName: playerName || '',
        }),
      });

      const serverRequestId =
        response.headers.get('x-request-id') || response.headers.get('X-Request-Id') || null;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP error! status: ${response.status}` }));
        console.error('❌ [TOURNAMENT] submit-score HTTP error', {
          clientRequestId,
          serverRequestId,
          sessionId,
          tournamentObjectId,
          status: response.status,
        });
        throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
        if (result.success) {
          console.log('✅ [TOURNAMENT] Tournament score submitted successfully to CORRECT tournament!', {
            clientRequestId,
            serverRequestId: serverRequestId || clientRequestId,
            sessionId,
            digest: result.digest,
            tournamentId: result.tournamentId,
            tournamentName: result.tournamentName,
            category: result.category,
            categoryValue: result.categoryValue,
            playerAddress: result.playerAddress,
            tournamentObjectId,
            note: 'Score was validated and submitted to the tournament the player entered',
          });
          
          return {
            success: true,
            digest: result.digest,
            playerAddress: result.playerAddress,
            gasPaidBy: result.gasPaidBy,
            message: result.message,
            isTournament: true,
            tournamentId: result.tournamentId,
            tournamentName: result.tournamentName,
            category: result.category,
            categoryValue: result.categoryValue,
          };
        } else {
          console.error('❌ [TOURNAMENT] Tournament score submission failed:', result.error, {
            clientRequestId,
            serverRequestId,
            sessionId,
            tournamentObjectId,
          });
          throw new Error(result.error || 'Tournament score submission failed');
        }
      }
    } else {
      // Log why tournament submission was skipped
      console.log('⚠️ [SCORE SUBMISSION] Skipping tournament submission - routing to regular game', {
        isTournamentMode,
        tournamentObjectId,
        reason: !isTournamentMode ? 'Not in tournament mode' : !tournamentObjectId ? 'No tournament object ID' : 'Unknown',
      });
    }

    // Regular game score submission (server computes score from replay). Session ID must be set by the game.
    if (gameStats.sessionId == null || String(gameStats.sessionId).trim() === '') {
      console.error('❌ [BLOCKCHAIN] Missing game session ID');
      return {
        success: false,
        error: 'Game session ID is required. Please start a new game and try again.'
      };
    }
    const gameSessionId = String(gameStats.sessionId);
    console.log(`📤 [BLOCKCHAIN] Sending replay to backend: ${API_BASE_URL}/scores/submit`, { eventCount: replay.events.length, sessionId: gameSessionId });

    const response = await fetch(`${API_BASE_URL}/scores/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        playerAddress,
        playerName: playerName || '',
        sessionId: gameSessionId,
        replay: { version: replay.version, events: replay.events },
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
        gasPaidBy: result.gasPaidBy,
        sessionId: result.sessionId,
        badge: result.badge
      });
      
      // Log detailed badge info for debugging
      if (result.badge) {
        console.log('🎖️ [BADGE] ========== BADGE INFO FROM SCORE SUBMISSION ==========');
        console.log('🎖️ [BADGE] Badge object:', JSON.stringify(result.badge, null, 2));
        console.log('🎖️ [BADGE] canMint:', result.badge.canMint);
        console.log('🎖️ [BADGE] hasBadge:', result.badge.hasBadge);
        console.log('🎖️ [BADGE] tierUpgraded:', result.badge.tierUpgraded);
        console.log('🎖️ [BADGE] newTier:', result.badge.newTier);
        console.log('🎖️ [BADGE] error:', result.badge.error);
        console.log('🎖️ [BADGE] ====================================================');
      } else {
        console.warn('⚠️ [BADGE] No badge info in score submission response');
      }
      
      // Handle badge operations if present
      if (result.badge) {
        if (result.badge.canMint) {
          // First game - show minting modal
          console.log('🎖️ [BADGE] Player can mint badge');
          // Show minting modal after a short delay (let game over screen be visible)
          setTimeout(() => {
            if (window.BadgeUI && window.BadgeUI.showBadgeMintingModal) {
              window.BadgeUI.showBadgeMintingModal();
            }
          }, 1000);
        } else if (result.badge.tierUpgraded) {
          // Tier upgraded - show upgrade notification
          console.log('🎖️ [BADGE] Badge tier upgraded to:', result.badge.newTier);
          console.log('🎖️ [BADGE] Full badge upgrade info:', result.badge);
          // Show upgrade modal after a short delay
          setTimeout(async () => {
            if (window.BadgeUI && window.BadgeUI.showTierUpgradeModal) {
              try {
                // Get current badge to get badgeId
                const badgeData = await window.BadgeService.getBadge();
                if (!badgeData.success || !badgeData.badge || !badgeData.badge.badgeId) {
                  console.warn('⚠️ [BADGE] Failed to get badge data for upgrade');
                  return;
                }
                
                // Use sessionId from the score submission result (passed from backend)
                // The backend uses the sessionId from the score submission, ensuring idempotency
                const sessionId = result.sessionId || gameStats.sessionId || `session_${Date.now()}`;
                const oldTier = badgeData.badge.tier - 1; // Previous tier (before upgrade)
                const newTier = result.badge.newTier;
                
                console.log('🎖️ [BADGE] Showing upgrade modal with:', {
                  oldTier,
                  newTier,
                  badgeId: badgeData.badge.badgeId,
                  sessionId
                });
                
                // Show upgrade modal with new flow (badgeId, newTier, sessionId)
                window.BadgeUI.showTierUpgradeModal({
                  oldTier: oldTier,
                  newTier: newTier,
                  newTierName: window.BadgeService.getTierName(newTier),
                  badgeId: badgeData.badge.badgeId,
                  sessionId: sessionId,
                });
              } catch (error) {
                console.error('❌ [BADGE] Error showing tier upgrade modal:', error);
              }
            }
          }, 1000);
        }
      }
      
      // Check for eligible achievements after successful score submission
      try {
        if (window.walletAPIInstance && window.walletAPIInstance.isConnected()) {
          const address = window.walletAPIInstance.getAddress();
          if (address) {
            // Check achievements asynchronously (don't block score submission)
            checkAchievementsAsync(address);
          }
        }
      } catch (achievementError) {
        console.warn('⚠️ [ACHIEVEMENT] Error checking achievements:', achievementError);
        // Don't fail score submission if achievement check fails
      }
      
      return {
        success: true,
        digest: result.digest,
        playerAddress: result.playerAddress,
        gasPaidBy: result.gasPaidBy,
        message: result.message,
        badge: result.badge // Include badge info in return value
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
  /**
 * Check achievements asynchronously after score submission
 * NOTE: This no longer auto-claims. It just notifies the player that rewards are available.
 */
async function checkAchievementsAsync(playerAddress) {
  try {
    console.log('🏆 [ACHIEVEMENT] Checking for eligible achievements...');
    
    // Get API base URL from config
    const API_BASE_URL = String(
      window.GameApi ? window.GameApi.getBaseUrl() : (window.GAME_CONFIG?.GAME_BACKEND_URL || window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3001/api')
    ).replace(/\/?$/, '');
    const response = await fetch(`${API_BASE_URL}/achievements/check?address=${playerAddress}`);
    if (!response.ok) {
      throw new Error(`Failed to check achievements: ${response.statusText}`);
    }
    
    const data = await response.json();
    // Note: The API now returns 'eligible' instead of 'claimed' since we don't auto-claim
    const eligibleAchievements = data.eligible || data.claimed || [];
    
    if (data.success && eligibleAchievements.length > 0) {
      console.log('🎁 [ACHIEVEMENT] Milestone rewards available!', { count: eligibleAchievements.length });
      
      // Update the badge on the Leaderboard button
      if (typeof window.updateClaimCountBadge === 'function') {
        window.updateClaimCountBadge(eligibleAchievements.length);
      }
      
      // Show a notification that rewards are available to claim
      // This is a non-blocking notification, not the full popup
      if (typeof window.showMilestoneNotification === 'function') {
        window.showMilestoneNotification(eligibleAchievements.length);
      }
    } else {
      console.log('ℹ️ [ACHIEVEMENT] No new milestones reached');
      
      // Still update badge (may have unclaimed from previous sessions)
      if (typeof window.updateClaimCountBadge === 'function') {
        window.updateClaimCountBadge();
      }
    }
  } catch (error) {
    console.warn('⚠️ [ACHIEVEMENT] Error checking achievements:', error);
    // Silently fail - don't interrupt user flow
  }
}

window.submitScoreToBlockchain = submitScoreToBlockchain;
  window.setContractPackageId = setContractPackageId;
  window.getContractPackageId = getContractPackageId;
  window.checkAchievementsAsync = checkAchievementsAsync;
}

