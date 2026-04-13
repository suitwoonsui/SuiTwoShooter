// ==========================================
// LEADERBOARD SCORE SUBMISSION - Score Submission Flow
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

log.info('LEADERBOARD SCORE SUBMISSION', 'Leaderboard score submission module loaded');

/** After on-chain score write: bust stats + leaderboard caches so menu and board pick up changes immediately. */
function afterScoreRecordedOnChain() {
  try {
    if (typeof window.invalidateMenuStatsCacheForConnectedWallet === 'function') {
      window.invalidateMenuStatsCacheForConnectedWallet();
    }
    if (window.apiRequestCache?.invalidateByPattern) {
      window.apiRequestCache.invalidateByPattern('leaderboard:');
    }
    // Tournament entry/rank/score are per-player mutable; refresh on score submission.
    try {
      const walletAddress = window.walletAPIInstance?.isConnected?.() ? window.walletAPIInstance.getAddress() : null;
      const tid = window.gameState?.tournamentObjectId || window.game?.tournamentObjectId || null;
      if (walletAddress && tid && window.apiRequestCache?.invalidateByPattern) {
        window.apiRequestCache.invalidateByPattern(`tournamentEntry:${walletAddress}:`);
      }
      // Tournament lists are separately TTL cached in window.__prefetchedTournaments / __prefetchedMyTournaments.
      // Bust them so the next render/refetch reflects updated hasEntered/rank/score.
      if (typeof window !== 'undefined' && tid) {
        window.__prefetchedTournaments = null;
        window.__prefetchedMyTournaments = null;
      }
    } catch (_) {}
    try {
      delete window.__prefetchedLeaderboard;
    } catch (_) {
      /* ignore */
    }
  } catch (_) {
    /* ignore */
  }
}

/**
 * Show name input modal (always shown after game over - all scores are tracked)
 * @param {number} score - Final game score
 */
function showNameInput(score) {
    log.debug('LEADERBOARD SCORE', 'showNameInput() called for score', score);
  
  // Check if game was in demo mode - don't show name input modal
  const game = typeof window !== 'undefined' && window.game ? window.game : null;
  const gameState = typeof window !== 'undefined' && window.gameState ? window.gameState : null;
  const isDemoMode = (game && game.isDemoMode) || (gameState && gameState.isDemoMode);
  
  if (isDemoMode) {
    log.debug('LEADERBOARD SCORE', 'Name input modal blocked - game was in demo mode');
    // Skip showing the modal and go directly to appropriate screen
    void returnToAppropriateScreen();
    return;
  }
  
  if (!window.LeaderboardService) {
    log.warn('LEADERBOARD SCORE', 'LeaderboardService not available');
    return;
  }
  
  // Store score in service
  window.LeaderboardService.setCurrentGameScore(score);
  document.getElementById('finalScoreDisplay').textContent = score.toLocaleString();
  
  // IMPORTANT: Ensure settings panel is hidden when showing name input
  const settingsPanel = document.getElementById('settingsPanel');
  if (settingsPanel && settingsPanel.classList.contains('settings-panel-visible')) {
    log.debug('LEADERBOARD SCORE', 'Hiding settings panel before showing name input modal');
    if (typeof hideSettings === 'function') {
      hideSettings();
    } else {
      settingsPanel.classList.add('settings-panel-hidden');
      settingsPanel.classList.remove('settings-panel-visible');
      log.debug('LEADERBOARD SCORE', 'Settings panel HIDDEN');
    }
  }
  
  const nameInputModal = document.getElementById('nameInputModal');
  if (nameInputModal) {
    const wasVisible = nameInputModal.classList.contains('name-input-modal-visible');
    const wasHidden = nameInputModal.classList.contains('name-input-modal-hidden');
    log.debug('LEADERBOARD SCORE', 'Name input modal state', { wasVisible, wasHidden });
    nameInputModal.classList.add('name-input-modal-visible');
    nameInputModal.classList.remove('name-input-modal-hidden');
    log.debug('LEADERBOARD SCORE', 'Name input modal SHOWN');
  }
  
  // Hide the game-container when modal appears
  const gameContainer = document.querySelector('.game-container');
  if (gameContainer) {
    const wasVisible = gameContainer.classList.contains('game-container-visible');
    const wasHidden = gameContainer.classList.contains('game-container-hidden');
    log.debug('LEADERBOARD SCORE', 'Game container state', { wasVisible, wasHidden });
    gameContainer.classList.add('game-container-hidden');
    gameContainer.classList.remove('game-container-visible');
    log.debug('LEADERBOARD SCORE', 'Game container HIDDEN');
  }
  
  document.getElementById('playerNameInput').focus();
  
  // Attach event listeners to buttons for better mobile support
  // Use event delegation on the modal content to handle both click and touch events
  const nameInputContent = nameInputModal.querySelector('.name-input-content');
  if (nameInputContent) {
    // Remove any existing listeners by cloning
    const buttons = nameInputContent.querySelectorAll('button');
    buttons.forEach(button => {
      const clonedButton = button.cloneNode(true);
      button.replaceWith(clonedButton);
      
      // Check which button this is and attach appropriate listener
      if (clonedButton.textContent.trim() === 'Skip' || clonedButton.getAttribute('onclick')?.includes('skipSave')) {
        // Remove onclick attribute to prevent double-firing (we use event listener instead)
        clonedButton.removeAttribute('onclick');
        clonedButton.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          log.debug('LEADERBOARD SCORE', 'Skip button clicked via event listener');
          skipSave();
        });
        clonedButton.addEventListener('touchstart', (e) => {
          e.preventDefault();
          e.stopPropagation();
          log.debug('LEADERBOARD SCORE', 'Skip button touched via event listener');
          skipSave();
        }, { passive: false });
        log.debug('LEADERBOARD SCORE', 'Skip button event listeners attached');
      } else if (clonedButton.textContent.trim() === 'Save Score' || clonedButton.getAttribute('onclick')?.includes('saveScore')) {
        // Remove onclick attribute to prevent double-firing (we use event listener instead)
        clonedButton.removeAttribute('onclick');
        clonedButton.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          log.debug('LEADERBOARD SCORE', 'Save button clicked via event listener');
          saveScore();
        });
        clonedButton.addEventListener('touchstart', (e) => {
          e.preventDefault();
          e.stopPropagation();
          log.debug('LEADERBOARD SCORE', 'Save button touched via event listener');
          saveScore();
        }, { passive: false });
        log.debug('LEADERBOARD SCORE', 'Save button event listeners attached');
      }
    });
  }
  
  // Play achievement sound
  if (typeof playAchievementSound === 'function') {
    playAchievementSound();
  }
}

/**
 * Save score - CORRECTED VERSION with blockchain submission
 */
async function saveScore() {
  log.debug('LEADERBOARD SCORE', 'saveScore() called');
  
  const name = document.getElementById('playerNameInput').value.trim();
  log.debug('LEADERBOARD SCORE', 'Player name', name);
  
  // Prevent double-submission
  if (saveScore._submitting) {
    log.debug('LEADERBOARD SCORE', 'saveScore() already in progress, ignoring duplicate call');
    return;
  }
  
  if (!name) {
    alert('Please enter your name!');
    // Don't return - close modal anyway, but don't submit
    hideNameInput();
    returnToAppropriateScreen();
    return;
  }
  
  // Mark as submitting to prevent duplicate calls
  saveScore._submitting = true;
  
  // Show loading modal while saving score
  // Use LoadingManager if available, otherwise fallback to showLoadingModal
  if (typeof LoadingManager !== 'undefined' && LoadingManager.show) {
    LoadingManager.show('Saving score... Please wait');
  } else if (typeof showLoadingModal === 'function') {
    showLoadingModal('Saving score... Please wait', 'saveScoreLoadingModal');
  } else {
    log.warn('LEADERBOARD SCORE', 'Loading modal functions not available');
  }
  
  try {
    if (!window.LeaderboardService) {
      throw new Error('LeaderboardService not available');
    }
    
    const state = window.LeaderboardService.getState();
    const score = state.currentGameScore;
    log.debug("Saving score:", score, "for player:", name); // Debug
    
    // Add new score to localStorage first (for immediate UI feedback)
    window.LeaderboardService.addLocalScore(name, score);
    
    // Update display immediately (with error handling)
    try {
      if (typeof window.displayLeaderboard === 'function') {
        window.displayLeaderboard();
      }
      if (typeof window.displayLeaderboardModal === 'function') {
        window.displayLeaderboardModal(); // Also update modal if it's open
      }
    } catch (error) {
      log.warn('LEADERBOARD SCORE', 'Error updating leaderboard display', error);
      // Continue anyway - don't block score saving
    }
    
    // Play success sound
    if (typeof playSuccessSound === 'function') {
      playSuccessSound();
    }
    
    // Close name input modal (but keep loading modal visible)
    hideNameInput();
    
    // Use currentGameStats only (no fallback object). Only session ID fallback allowed.
    const rawStats = state.currentGameStats;
    const statsToSubmit = rawStats
      ? {
          ...rawStats,
          sessionId: rawStats.sessionId ?? window.game?.sessionId ?? null,
          anchorSessionId:
            rawStats.anchorSessionId ??
            window.game?.anchorSessionId ??
            window.gameState?.anchorSessionId ??
            window.__tournamentAnchorSessionId ??
            null,
        }
      : null;

    // Submit to blockchain if wallet is connected and we have stats (no fallback for missing stats)
    if (statsToSubmit &&
        typeof window.submitScoreToBlockchain === 'function' && 
        window.walletAPIInstance && 
        window.walletAPIInstance.isConnected()) {
      
      log.debug('LEADERBOARD SCORE', 'Submitting game stats to blockchain', statsToSubmit);
      
      try {
        // Update loading message for blockchain submission
        // CRITICAL: Ensure loading modal is still visible and update message
        log.debug('LEADERBOARD SCORE', 'Updating loading modal message to "Saving score to blockchain..."');
        if (typeof LoadingManager !== 'undefined' && LoadingManager.update) {
          // Check if loading modal is currently showing
          if (!LoadingManager.isShowing()) {
            log.warn('LEADERBOARD SCORE', 'Loading modal not showing, re-showing it...');
            LoadingManager.show('Saving score to blockchain... Please wait');
          } else {
            LoadingManager.update('Saving score to blockchain... Please wait');
          }
        } else if (typeof updateLoadingModalMessage === 'function') {
          updateLoadingModalMessage('Saving score to blockchain... Please wait', 'saveScoreLoadingModal');
        } else {
          // Fallback: Re-show loading modal if update function not available
          log.warn('LEADERBOARD SCORE', 'LoadingManager.update not available, using fallback show');
          if (typeof LoadingManager !== 'undefined' && LoadingManager.show) {
            LoadingManager.show('Saving score to blockchain... Please wait');
          } else if (typeof showLoadingModal === 'function') {
            showLoadingModal('Saving score to blockchain... Please wait', 'saveScoreLoadingModal');
          }
        }
        
        // Wait for blockchain submission to complete
        const result = await window.submitScoreToBlockchain(statsToSubmit, name || '');
        
        if (result.success) {
          log.info('LEADERBOARD SCORE', 'Score submitted successfully!', result.digest);
          // Milestones/eligibility only change after a game is recorded; invalidate and refresh in background.
          try {
            if (typeof window.invalidateMilestoneProgressCaches === 'function') {
              window.invalidateMilestoneProgressCaches();
            }
            if (typeof window.prefetchMilestoneProgress === 'function') {
              window.prefetchMilestoneProgress();
            }
            if (typeof window.updateClaimCountBadge === 'function') {
              void window.updateClaimCountBadge(null, true);
            }
          } catch (_) {}
          afterScoreRecordedOnChain();
          // Show success toast
          if (typeof window.showToast === 'function') {
            window.showToast('Score saved to blockchain!', 'success');
          }
        } else {
          log.warn('LEADERBOARD SCORE', 'Score submission failed', result.error);
          // Show error toast
          if (typeof window.showToast === 'function') {
            window.showToast('Failed to save score to blockchain. Your score was saved locally.', 'error');
          }
        }
      } catch (error) {
        log.error('LEADERBOARD SCORE', 'Error submitting score', error);
        // Show error toast
        if (typeof window.showToast === 'function') {
          window.showToast('Error saving score. Please try again later.', 'error');
        }
      }
    } else {
      log.debug('LEADERBOARD SCORE', 'Skipping blockchain submission', {
        hasStats: !!statsToSubmit,
        hasSubmitFunction: typeof window.submitScoreToBlockchain === 'function',
        hasWalletAPI: !!window.walletAPIInstance,
        isConnected: window.walletAPIInstance?.isConnected()
      });
    }
    
    // CRITICAL: Hide loading modal BEFORE showing main menu
    // This ensures the loading modal is visible during blockchain submission
    if (typeof LoadingManager !== 'undefined' && LoadingManager.hide) {
      LoadingManager.hide();
    } else if (typeof hideLoadingModal === 'function') {
      hideLoadingModal('saveScoreLoadingModal');
    }
    
    // Return to appropriate screen AFTER loading modal is hidden
    returnToAppropriateScreen();
    
  } catch (error) {
    log.error('LEADERBOARD SCORE', 'Error saving score', error);
    // Hide loading modal even on error
    if (typeof LoadingManager !== 'undefined' && LoadingManager.hide) {
      LoadingManager.hide();
    } else if (typeof hideLoadingModal === 'function') {
      hideLoadingModal('saveScoreLoadingModal');
    }
    // Show error message
    alert('Error saving score. Please try again.');
    returnToAppropriateScreen();
  } finally {
    // Reset submission flag after a delay to allow for async operations
    setTimeout(() => {
      saveScore._submitting = false;
    }, 1000);
  }
}

/**
 * Skip save
 */
async function skipSave() {
  log.debug('LEADERBOARD SCORE', 'skipSave() called');
  
  // Prevent double-execution
  if (skipSave._processing) {
    log.debug('LEADERBOARD SCORE', 'skipSave() already in progress, ignoring duplicate call');
    return;
  }
  skipSave._processing = true;
  
  hideNameInput();
  
  // Show loading modal while saving score (same as saveScore flow)
  // Use LoadingManager if available, otherwise fallback to showLoadingModal
  if (typeof LoadingManager !== 'undefined' && LoadingManager.show) {
    LoadingManager.show('Saving score... Please wait');
  } else if (typeof showLoadingModal === 'function') {
    showLoadingModal('Saving score... Please wait', 'saveScoreLoadingModal');
  } else {
    log.warn('LEADERBOARD SCORE', 'Loading modal functions not available');
  }
  
  if (!window.LeaderboardService) {
    log.warn('LEADERBOARD SCORE', 'LeaderboardService not available');
    return;
  }
  
  const state = window.LeaderboardService.getState();
  
  // Use currentGameStats only (no fallback object). Only session ID fallback allowed.
  const rawStats = state.currentGameStats;
  const statsToSubmit = rawStats
    ? {
        ...rawStats,
        sessionId: rawStats.sessionId ?? window.game?.sessionId ?? null,
        anchorSessionId: rawStats.anchorSessionId ?? window.game?.anchorSessionId ?? window.gameState?.anchorSessionId ?? null,
      }
    : null;

  try {
    if (statsToSubmit &&
        typeof window.submitScoreToBlockchain === 'function' && 
        window.walletAPIInstance && 
        window.walletAPIInstance.isConnected()) {
      
      log.debug('LEADERBOARD SCORE', 'Submitting game stats to blockchain (skipped name)', statsToSubmit);
      
      // Update loading message for blockchain submission
      log.debug('LEADERBOARD SCORE', 'Updating loading modal message to "Saving score to blockchain..."');
      if (typeof LoadingManager !== 'undefined' && LoadingManager.update) {
        // Check if loading modal is currently showing
        if (!LoadingManager.isShowing()) {
          log.warn('LEADERBOARD SCORE', 'Loading modal not showing, re-showing it...');
          LoadingManager.show('Saving score to blockchain... Please wait');
        } else {
          LoadingManager.update('Saving score to blockchain... Please wait');
        }
      } else if (typeof updateLoadingModalMessage === 'function') {
        updateLoadingModalMessage('Saving score to blockchain... Please wait', 'saveScoreLoadingModal');
      } else {
        // Fallback: Re-show loading modal if update function not available
        log.warn('LEADERBOARD SCORE', 'LoadingManager.update not available, using fallback show');
        if (typeof LoadingManager !== 'undefined' && LoadingManager.show) {
          LoadingManager.show('Saving score to blockchain... Please wait');
        } else if (typeof showLoadingModal === 'function') {
          showLoadingModal('Saving score to blockchain... Please wait', 'saveScoreLoadingModal');
        }
      }
      
      // Wait for blockchain submission to complete (same as saveScore flow)
      const result = await window.submitScoreToBlockchain(statsToSubmit, ''); // Empty name when skipped
      
      if (result.success) {
        log.info('LEADERBOARD SCORE', 'Score submitted successfully!', result.digest);
        // Milestones/eligibility only change after a game is recorded; invalidate and refresh in background.
        try {
          if (typeof window.invalidateMilestoneProgressCaches === 'function') {
            window.invalidateMilestoneProgressCaches();
          }
          if (typeof window.prefetchMilestoneProgress === 'function') {
            window.prefetchMilestoneProgress();
          }
          if (typeof window.updateClaimCountBadge === 'function') {
            void window.updateClaimCountBadge(null, true);
          }
        } catch (_) {}
        afterScoreRecordedOnChain();
        // Show success toast
        if (typeof window.showToast === 'function') {
          window.showToast('Score saved to blockchain!', 'success');
        }
      } else {
        log.warn('LEADERBOARD SCORE', 'Score submission failed', result.error);
        // Show error toast
        if (typeof window.showToast === 'function') {
          window.showToast('Failed to save score to blockchain. Your score was saved locally.', 'error');
        }
      }
    } else {
      log.debug('LEADERBOARD SCORE', 'Skipping blockchain submission (skip)', {
        hasStats: !!statsToSubmit,
        hasSubmitFunction: typeof window.submitScoreToBlockchain === 'function',
        hasWalletAPI: !!window.walletAPIInstance,
        isConnected: window.walletAPIInstance?.isConnected()
      });
    }
  } catch (error) {
    log.error('LEADERBOARD SCORE', 'Error submitting score', error);
    // Show error toast
    if (typeof window.showToast === 'function') {
      window.showToast('Error saving score. Please try again later.', 'error');
    }
  } finally {
    // Hide loading modal and show main menu after saving is complete (same as saveScore flow)
    if (typeof LoadingManager !== 'undefined' && LoadingManager.hide) {
      LoadingManager.hide();
    } else if (typeof hideLoadingModal === 'function') {
      hideLoadingModal('saveScoreLoadingModal');
    }
    
    // Reset processing flag after a short delay to allow UI updates
    setTimeout(() => {
      skipSave._processing = false;
    }, 1000);
    
    // Return to appropriate screen AFTER loading modal is hidden
    returnToAppropriateScreen();
  }
}

/**
 * Return to appropriate screen (tournament or main menu) based on game context
 */
function returnToAppropriateScreen() {
  // Game-over reconciliation: if gameplay consumed consumables, we mark a pending refetch.
  // Refresh in the background on the game-over screen (do not block returning to menu).
  if (typeof window !== 'undefined' && window.PlayerInventoryCache?.runPendingGameOverRefetchIfAny) {
    void window.PlayerInventoryCache.runPendingGameOverRefetchIfAny();
  }

  const game = typeof window !== 'undefined' && window.game ? window.game : null;
  const gameState = typeof window !== 'undefined' && window.gameState ? window.gameState : null;
  const uiGameState = typeof window !== 'undefined' && window.uiGameState ? window.uiGameState : null;
  
  const shouldReturnToTournament = (game && game.returnToTournament) || 
                                   (gameState && gameState.returnToTournament) ||
                                   (uiGameState && uiGameState.returnToTournament);
  
  if (shouldReturnToTournament) {
    log.debug('LEADERBOARD SCORE', 'Returning to tournament screen');
    
    // Close the game first (hide game container, stop game loop, etc.)
    if (typeof window.GameService !== 'undefined' && typeof window.GameService.closeGame === 'function') {
      log.debug('LEADERBOARD SCORE', 'Closing game before returning to tournament');
      window.GameService.closeGame();
    } else {
      // Fallback: manually hide game container
      const gameContainer = document.querySelector('.game-container');
      if (gameContainer) {
        gameContainer.classList.add('game-container-hidden');
        gameContainer.classList.remove('game-container-visible');
        log.debug('LEADERBOARD SCORE', 'Game container hidden (fallback)');
      }
      
      // Stop game loop
      if (gameState) {
        gameState.gameRunning = false;
        gameState.gameOver = false;
      }
    }
    
    // Clear return flag
    if (game) game.returnToTournament = false;
    if (gameState) gameState.returnToTournament = false;
    if (uiGameState) uiGameState.returnToTournament = false;
    
    // Show tournament screen
    if (typeof showTournaments === 'function') {
      showTournaments();
    } else {
      log.warn('LEADERBOARD SCORE', 'showTournaments not available, falling back to main menu');
      if (typeof showMainMenu === 'function') {
        showMainMenu({ afterGame: true });
      } else if (typeof MenuService !== 'undefined' && MenuService.show) {
        MenuService.show({ afterGame: true });
      }
    }

    const tournamentWallet =
      (typeof window.getWalletAddress === 'function' && window.getWalletAddress()) ||
      (window.walletAPIInstance &&
        window.walletAPIInstance.isConnected &&
        window.walletAPIInstance.isConnected() &&
        window.walletAPIInstance.getAddress?.()) ||
      null;
    if (tournamentWallet && window.PlayerInventoryCache?.refreshAfterRewardBackground) {
      window.PlayerInventoryCache.refreshAfterRewardBackground(tournamentWallet);
    }
  } else {
    // Return to main menu
    if (typeof showMainMenu === 'function') {
      showMainMenu({ afterGame: true });
    } else if (typeof MenuService !== 'undefined' && MenuService.show) {
      MenuService.show({ afterGame: true });
    }
  }
}

/**
 * Hide modal
 */
function hideNameInput() {
  log.debug('LEADERBOARD SCORE', 'hideNameInput() called');
  
  const nameInputModal = document.getElementById('nameInputModal');
  log.debug('LEADERBOARD SCORE', 'Name input modal element', nameInputModal);
  
  if (nameInputModal) {
    const hadVisible = nameInputModal.classList.contains('name-input-modal-visible');
    const hadHidden = nameInputModal.classList.contains('name-input-modal-hidden');
    log.debug('LEADERBOARD SCORE', 'Name input modal state', { hadVisible, hadHidden });
    
    nameInputModal.classList.add('name-input-modal-hidden');
    nameInputModal.classList.remove('name-input-modal-visible');
    log.debug('LEADERBOARD SCORE', 'Name input modal HIDDEN');
  } else {
    log.warn('LEADERBOARD SCORE', 'Name input modal element not found!');
  }
  
  const playerInput = document.getElementById('playerNameInput');
  if (playerInput) {
    playerInput.value = '';
  }
  
  // Check settings panel state
  const settingsPanel = document.getElementById('settingsPanel');
  if (settingsPanel) {
    const hasVisible = settingsPanel.classList.contains('settings-panel-visible');
    const hasHidden = settingsPanel.classList.contains('settings-panel-hidden');
    log.debug('LEADERBOARD SCORE', 'Settings panel state check', { hasVisible, hasHidden });
    if (hasVisible) {
      log.warn('LEADERBOARD SCORE', 'Settings panel is visible during hideNameInput()!');
    }
  }
  
  // Restore game-container visibility (even if hidden, it's the correct state)
  // The menu will handle showing/hiding appropriately
}

/**
 * Handle Enter key in input
 */
const playerNameInput = document.getElementById('playerNameInput');
if (playerNameInput) {
  playerNameInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      saveScore();
    }
  });
}

/**
 * Function called by game on game over
 * @param {Object|number} gameStatsOrScore - Game stats object or score number
 */
function onGameOver(gameStatsOrScore) {
  if (!window.LeaderboardService) {
    log.warn('LEADERBOARD SCORE', 'LeaderboardService not available');
    return;
  }

  if (typeof window.invalidateMenuStatsCacheForConnectedWallet === 'function') {
    window.invalidateMenuStatsCacheForConnectedWallet();
  }
  
  // Require the new format (stats object). The legacy score-only callback was removed.
  if (typeof gameStatsOrScore !== 'object' || gameStatsOrScore === null) {
    log.error('LEADERBOARD SCORE', 'Game Over - invalid stats payload (expected object)', {
      receivedType: typeof gameStatsOrScore,
    });
    return;
  }

  window.LeaderboardService.setCurrentGameStats(gameStatsOrScore);
  const finalScore = gameStatsOrScore.score;
  log.debug('LEADERBOARD SCORE', 'Game Over - Stats object received', gameStatsOrScore);
  
  // Update game stats
  if (finalScore > gameStats.bestScore) {
    gameStats.bestScore = finalScore;
    saveGameData();
  }
  
  // Ensure game container is visible so game over screen can render
  const gameContainer = document.querySelector('.game-container');
  if (gameContainer) {
    const wasVisible = gameContainer.classList.contains('game-container-visible');
    const wasHidden = gameContainer.classList.contains('game-container-hidden');
    log.debug('LEADERBOARD SCORE', 'Game container state', { wasVisible, wasHidden });
    
    // Make sure game container is visible for game over screen
    if (wasHidden) {
      gameContainer.classList.add('game-container-visible');
      gameContainer.classList.remove('game-container-hidden');
      log.debug('LEADERBOARD SCORE', 'Game container made VISIBLE for game over screen');
    }
  }
  
  // Wait a minimum time for game over screen to be visible, then wait for user interaction
  const minGameOverDisplayTime = 500; // Minimum 500ms to see game over screen
  const gameOverStartTime = Date.now();
  let hasProceeded = false; // Flag to ensure we only proceed once
  
  log.debug('LEADERBOARD SCORE', 'Game over screen should now be visible');
  log.debug('LEADERBOARD SCORE', 'Waiting minimum time before accepting user input', minGameOverDisplayTime);
  
  // Function to actually proceed after delays
  function actuallyProceed() {
    if (hasProceeded) {
      log.debug('LEADERBOARD SCORE', 'Already proceeded - ignoring duplicate call');
      return;
    }
    hasProceeded = true;
    
    log.debug('LEADERBOARD SCORE', 'Minimum display time passed - proceeding');
    
    // Stop game loop - we're moving to name input modal or main menu
    if (typeof game !== 'undefined') {
      game.gameRunning = false;
      game.gameOver = false; // Clear game over flag to stop rendering
      log.debug('LEADERBOARD SCORE', 'Game loop stopped - transitioning to next screen');
    }
    
    // Remove the event listeners (must match the options used when adding)
    document.removeEventListener('click', handleInteraction, { capture: true });
    document.removeEventListener('keydown', handleInteraction, { capture: true });
    document.removeEventListener('touchstart', handleInteraction, { capture: true });
    
    // Small delay to let the click/keypress finish processing
    setTimeout(() => {
      // Check if game was in demo mode - don't show name input modal
      const game = typeof window !== 'undefined' && window.game ? window.game : null;
      const gameState = typeof window !== 'undefined' && window.gameState ? window.gameState : null;
      const isDemoMode = (game && game.isDemoMode) || (gameState && gameState.isDemoMode);
      
      if (isDemoMode) {
        log.debug('LEADERBOARD SCORE', 'Skipping name input modal - game was in demo mode');
        // Go directly to appropriate screen
        void returnToAppropriateScreen();
        return;
      }
      
      // Always show name input modal - all scores are tracked and submitted (only if not demo mode)
      log.debug('LEADERBOARD SCORE', 'Showing name input modal for score', finalScore);
      showNameInput(finalScore);
    }, 100);
  }
  
  // Event handler that checks timing
  function handleInteraction(e) {
    const elapsed = Date.now() - gameOverStartTime;
    log.debug('LEADERBOARD SCORE', 'User interaction detected', { type: e.type, elapsed });
    
    // Stop propagation to prevent other handlers from interfering
    e.stopPropagation();
    
    // Check if minimum display time has passed
    if (elapsed < minGameOverDisplayTime) {
      const remaining = minGameOverDisplayTime - elapsed;
      log.debug('LEADERBOARD SCORE', 'Too early! Waiting more for game over screen to be visible', remaining);
      
      // Wait for the remaining time, then proceed
      setTimeout(() => {
        actuallyProceed();
      }, remaining);
      return; // Don't proceed yet
    } else {
      // Minimum time has passed, proceed immediately
      actuallyProceed();
    }
  }
  
  // Add event listeners for click, keypress, and touch
  // Don't use once: true since we handle timing manually
  document.addEventListener('click', handleInteraction, { capture: true });
  document.addEventListener('keydown', handleInteraction, { capture: true });
  document.addEventListener('touchstart', handleInteraction, { capture: true });
  
  log.debug('LEADERBOARD SCORE', 'Event listeners added - waiting for user input');
}

// Expose globally
if (typeof window !== 'undefined') {
  window.showNameInput = showNameInput;
  window.saveScore = saveScore;
  window.skipSave = skipSave;
  window.hideNameInput = hideNameInput;
  window.onGameOver = onGameOver;
}

