// ==========================================
// GAME DATA FLOW SERVICE - State Management and Main Coordination
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

/** High-resolution clock for connect-load profiling (falls back to Date.now). */
function _connectTimingNow() {
  return typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now();
}

/**
 * Wrap a parallel leg promise: logs duration and writes connectTiming[key] when settled.
 */
function wrapConnectLoadLeg(legLabel, connectTiming, timingKey, promise) {
  const t0 = _connectTimingNow();
  return Promise.resolve(promise).finally(function () {
    const ms = Math.round(_connectTimingNow() - t0);
    if (connectTiming && timingKey) connectTiming[timingKey] = ms;
    log.info('FLOW SERVICE', '[CONNECT-TIMING] parallel leg settled', { leg: legLabel, durationMs: ms });
  });
}

function getGameApiBase() {
  try {
    if (typeof window !== 'undefined' && window.GAME_CONFIG?.getBackendUrl) {
      return window.GAME_CONFIG.getBackendUrl('/api').replace(/\/?$/, '');
    }
  } catch (_) {}
  return window.GameApi ? window.GameApi.getBaseUrl() : (window.GAME_CONFIG?.GAME_BACKEND_URL || window.GAME_CONFIG?.API_BASE_URL || 'http://localhost:3001/api');
}

/**
 * Fire-and-forget background drift repair for Insignia tier after login loading UI is dismissed.
 * MUST NOT block the loading modal.
 */
function scheduleBackgroundInsigniaTierSync(walletAddress) {
  try {
    const addr = (walletAddress || '').trim();
    if (!addr || !addr.startsWith('0x') || addr.length !== 66) return;
    const API_BASE = getGameApiBase();
    // Defer so UI has already hidden the loading modal.
    setTimeout(function () {
      fetch(`${API_BASE}/insignia/${addr}/sync-tier`, { method: 'POST' })
        .then((r) => (r.ok ? r.json() : r.json().catch(() => null)))
        .then((data) => {
          log.info('FLOW SERVICE', 'Background Insignia sync finished', { address: addr, success: data?.success, repaired: data?.repaired });
        })
        .catch((err) => {
          log.warn('FLOW SERVICE', 'Background Insignia sync failed (non-blocking)', err?.message || String(err));
        });
    }, 0);
  } catch (_) {}
}

const GameDataFlowService = {
  // Track in-flight loads to prevent duplicates
  _activeLoads: new Map(), // Map<address, Promise>
  
  // Track last processed wallet event to prevent duplicate processing
  _lastProcessedEvent: null, // { type, address, timestamp }
  _eventDebounceMs: 500, // Ignore duplicate events within 500ms
  
  /**
   * Check if we should process this wallet event (deduplication)
   * @private
   */
  _shouldProcessEvent(event) {
    const now = Date.now();
    const eventKey = `${event.type}_${event.address || 'null'}`;
    
    if (this._lastProcessedEvent) {
      const lastKey = `${this._lastProcessedEvent.type}_${this._lastProcessedEvent.address || 'null'}`;
      const timeSinceLastEvent = now - this._lastProcessedEvent.timestamp;
      
      // If same event within debounce window, skip it
      if (eventKey === lastKey && timeSinceLastEvent < this._eventDebounceMs) {
        log.debug('FLOW SERVICE', `Duplicate wallet event detected (${timeSinceLastEvent}ms ago) - skipping`, event);
        return false;
      }
    }
    
    // Record this event
    this._lastProcessedEvent = {
      type: event.type,
      address: event.address,
      timestamp: now
    };
    
    return true;
  },
  
  /**
   * Clear active loads (for cleanup/testing)
   */
  clearActiveLoads() {
    this._activeLoads.clear();
  },
  
  /**
   * Check if there's an active load for an address
   */
  hasActiveLoad(address) {
    return this._activeLoads.has(address);
  },
  
  /**
   * Get active load promise for an address
   */
  getActiveLoad(address) {
    return this._activeLoads.get(address);
  },
  
  /**
   * Set active load promise for an address
   */
  setActiveLoad(address, promise) {
    this._activeLoads.set(address, promise);
  },
  
  /**
   * Remove active load for an address
   */
  removeActiveLoad(address) {
    this._activeLoads.delete(address);
  },
  
  /**
   * Main entry point for loading game data
   * @param {string} walletAddress - Wallet address to load data for
   * @param {Object} options - Options { skipBalance?: boolean, skipBadge?: boolean, force?: boolean, checkBadgeUpgrade?: boolean }
   *   checkBadgeUpgrade: when true, may call the badge upgrade API and show the upgrade modal (wallet login or after-game return only).
   * @returns {Promise<void>}
   */
  async load(walletAddress, options = {}) {
    if (!walletAddress) {
      log.warn('FLOW SERVICE', 'No wallet address provided');
      return;
    }
    
    // Check if there's already an active load for this address
    if (this.hasActiveLoad(walletAddress)) {
      log.debug('FLOW SERVICE', 'Load already in progress for this address - waiting for existing load to complete');
      try {
        await this.getActiveLoad(walletAddress);
        log.debug('FLOW SERVICE', 'Existing load completed');
      } catch (error) {
        log.error('FLOW SERVICE', 'Existing load failed', error);
      }
      return;
    }
    
    log.debug('FLOW SERVICE', 'Loading game data', { walletAddress, options });
    
    // Check if we can load
    if (!GameDataState.canLoad()) {
      log.debug('FLOW SERVICE', 'Cannot load - waiting for conditions', {
        isLoading: GameDataState.isLoading,
        badgeModalVisible: GameDataState.badgeModalVisible,
        walletAddress: GameDataState.walletAddress
      });
      // If badge modal is visible, don't show loading modal - wait for modal to close
      // If already loading, don't show another loading modal
      return;
    }
    
    // Check if already loaded for this address (BEFORE showing loading modal)
    // When `force` is true, we intentionally refresh menu data and show the same loader used on wallet connect.
    if (!options.force && GameDataState.isLoadedForAddress(walletAddress)) {
      log.debug('FLOW SERVICE', 'Already loaded for this address');
      if (typeof window.scheduleMilestoneProgressPrefetchAfterLoadingUi === 'function') {
        window.scheduleMilestoneProgressPrefetchAfterLoadingUi();
      }
      return; // No need to show loading modal
    }
    
    // Check if badge is loaded but display is hidden (e.g., after returning from game)
    // Do this BEFORE showing loading modal
    if (!options.force && GameDataState.isBadgeLoadedButHidden(walletAddress)) {
      log.debug('FLOW SERVICE', 'Badge loaded but display hidden - making visible');
      if (typeof window.showBadgeDisplay === 'function') {
        window.showBadgeDisplay();
      }
      GameDataState.markDataLoaded();
      
      // Sync readiness state to local gameReadinessState (for backward compatibility)
      if (typeof gameReadinessState !== 'undefined') {
        const readiness = GameDataState.getReadinessState();
        gameReadinessState.dataLoaded = readiness.dataLoaded;
      }
      
      if (typeof updateGameReadiness === 'function') {
        updateGameReadiness();
      }
      if (typeof window.scheduleMilestoneProgressPrefetchAfterLoadingUi === 'function') {
        window.scheduleMilestoneProgressPrefetchAfterLoadingUi();
      }
      return; // No need to show loading modal
    }
    
    // Check for badge modals BEFORE showing loading modal
    if (typeof window.isBadgeModalVisible === 'function' && window.isBadgeModalVisible()) {
      log.debug('FLOW SERVICE', 'Badge modal is visible - waiting for it to close before loading');
      return; // Don't show loading modal while badge modal is visible
    }
    
    // All checks passed - now show loading modal
    // This ensures we only show it when we actually need to load
    // The loading modal will stay visible during all async operations (balance check, badge fetch, etc.)
    LoadingManager.show('Loading game data... Please wait');
    
    // Create load promise and track it
    // The loading modal will remain visible throughout _performLoad() which contains all async operations
    const loadPromise = this._performLoad(walletAddress, options);
    this.setActiveLoad(walletAddress, loadPromise);
    
    try {
      // Await the load - loading modal stays visible during this entire async operation
      await loadPromise;
    } finally {
      // Remove from active loads when done
      this.removeActiveLoad(walletAddress);
    }
  },
  
  /**
   * Internal method to perform the actual load
   * @private
   */
  async _performLoad(walletAddress, options) {
    // Set loading state
    GameDataState.setLoading(true);
    GameDataState.setWalletAddress(walletAddress);
    
    // Clear badge display if wallet address changed (wallet switch)
    if (GameDataState.lastLoadedAddress && GameDataState.lastLoadedAddress !== walletAddress) {
      log.debug('FLOW SERVICE', 'Wallet address changed - clearing previous badge display');
      const badgeDisplay = document.getElementById('menuBadgeDisplay');
      if (badgeDisplay) {
        badgeDisplay.style.display = 'none';
        badgeDisplay.innerHTML = ''; // Clear old badge HTML
      }
      GameDataState.setBadge(null);
      GameDataState.setBadgeDisplayVisible(false);
    }
    
    // Double-check for badge modals (should have been checked in load(), but safety check)
    if (typeof window.isBadgeModalVisible === 'function' && window.isBadgeModalVisible()) {
      log.debug('FLOW SERVICE', 'Badge modal is visible in _performLoad - hiding loading modal and returning');
      LoadingManager.hide(); // Hide loading modal that was shown in load()
      GameDataState.setLoading(false);
      try {
        if (walletAddress && typeof window.prefetchBadge === 'function') {
          window.prefetchBadge(walletAddress);
        }
        if (typeof window.scheduleMilestoneProgressPrefetchAfterLoadingUi === 'function') {
          window.scheduleMilestoneProgressPrefetchAfterLoadingUi();
        } else if (typeof window.prefetchMilestoneProgress === 'function') {
          queueMicrotask(() => window.prefetchMilestoneProgress());
        }
      } catch (_) {}
      return; // Don't load while badge modal is visible
    }
    
    try {
      // Loading modal should already be shown in load() before _performLoad is called
      // Only show it here if it's not already visible (safety check)
      if (!LoadingManager.isVisible) {
        log.warn('FLOW SERVICE', 'Loading modal not visible - showing it now (should have been shown in load())');
        LoadingManager.show('Loading game data... Please wait');
      }
      
      // ==========================================
      // ASYNC OPERATIONS START - Loading modal is visible
      // ==========================================
      // Modal stays up until stats, game pass, and badge all settle (Promise.allSettled below).
      const connectTiming = {
        startedAt: Date.now(),
        walletAddressShort: walletAddress ? String(walletAddress).slice(0, 12) + '…' : '',
      };
      const parallelStart = _connectTimingNow();

      LoadingManager.update('Loading your stats, credits, and profile...');
      if (typeof window.warmPlayerSessionOnBackend === 'function') {
        await window.warmPlayerSessionOnBackend(walletAddress, { forceRefresh: options.force === true });
      }
      const statsP = wrapConnectLoadLeg(
        'stats',
        connectTiming,
        'statsMs',
        typeof window.loadStats === 'function'
          ? window.loadStats(walletAddress, {
              updateLoadingMessage: false,
              forceRefresh: options.force === true,
            })
          : Promise.resolve(null)
      );
      const prefetch = window.__gamePassPrefetch && window.__gamePassPrefetch.address === walletAddress
        ? window.__gamePassPrefetch
        : null;
      if (prefetch) {
        try {
          delete window.__gamePassPrefetch;
        } catch (_) {}
      }
      const gamePassP = wrapConnectLoadLeg(
        'gamePass',
        connectTiming,
        'gamePassMs',
        prefetch
          ? prefetch.promise.then((result) => {
              if (result && result.success && window.GamePassDisplay) {
                window.GamePassDisplay.updateMainMenuDisplay(result.credits ?? 0, result.ticketCount ?? 0);
                if (typeof GameService !== 'undefined' && GameService.updateStartButtonText) {
                  GameService.updateStartButtonText((result.credits ?? 0) > 0).catch(() => {});
                }
              }
              return result;
            }).catch(err => {
              log.warn('FLOW SERVICE', 'Game pass prefetch failed, falling back to refresh', err);
              return (window.GamePassDisplay && window.GamePassDisplay.refresh(walletAddress, true, false)).catch(e => {
                log.warn('FLOW SERVICE', 'Game pass credits load failed (non-critical)', e);
                return null;
              });
            })
          : (window.GamePassDisplay && typeof window.GamePassDisplay.refresh === 'function')
            ? window.GamePassDisplay.refresh(walletAddress, true, false).catch(err => {
                log.warn('FLOW SERVICE', 'Game pass credits load failed (non-critical)', err);
                return null;
              })
            : Promise.resolve(null)
      );
      const badgeP = wrapConnectLoadLeg(
        'badge',
        connectTiming,
        'badgeMs',
        options.skipBadge ? Promise.resolve(null) : (typeof window.loadBadge === 'function' ? window.loadBadge(walletAddress) : Promise.resolve(null))
      );

      const runDeferredBalance = () => {
        if (options.skipBalance || typeof window.loadBalance !== 'function') {
          return Promise.resolve();
        }
        return (async () => {
          try {
            const result = await window.loadBalance(walletAddress, { silent: true });
            if (result) {
              GameDataState.setBalance(result);
              if (typeof window.updateBalanceUIFromFlow === 'function') {
                window.updateBalanceUIFromFlow(result);
              }
            }
          } catch (balanceErr) {
            log.error('FLOW SERVICE', 'Deferred balance load failed', balanceErr);
          }
          if (typeof updateGameReadiness === 'function') {
            updateGameReadiness();
          }
        })();
      };

      const parallelResults = await Promise.allSettled([statsP, gamePassP, badgeP]);
      const statsResult = parallelResults[0];
      const gamePassResult = parallelResults[1];
      const badgeResult = parallelResults[2];
      connectTiming.parallelWallMs = Math.round(_connectTimingNow() - parallelStart);
      connectTiming.legOutcome = {
        stats: statsResult.status,
        gamePass: gamePassResult.status,
        badge: badgeResult.status,
      };
      log.info('FLOW SERVICE', '[CONNECT-TIMING] parallel phase complete (stats + gamePass + badge)', {
        wallClockMs: connectTiming.parallelWallMs,
        statsMs: connectTiming.statsMs,
        gamePassMs: connectTiming.gamePassMs,
        badgeMs: connectTiming.badgeMs,
        legOutcome: connectTiming.legOutcome,
        addressShort: connectTiming.walletAddressShort,
      });
      try {
        if (typeof window !== 'undefined') window.__lastConnectLoadTiming = connectTiming;
      } catch (_) {}
      if (statsResult.status === 'rejected') {
        log.warn('FLOW SERVICE', 'Stats load failed', statsResult.reason);
      }
      if (gamePassResult.status === 'rejected') {
        log.warn('FLOW SERVICE', 'Game pass load failed', gamePassResult.reason);
      }

      const postParallelStart = _connectTimingNow();

      /** Open mint modal after loading UI hides (handleNoBadge only adds menu chip; modal must be scheduled here). */
      let autoShowMintModalAfterLoad = false;

      // Handle badge result (loadBadge never throws; returns { success, hasBadge } or we get rejected if something else threw)
      let badgeData = null;
      if (badgeResult.status === 'fulfilled' && badgeResult.value) {
        badgeData = badgeResult.value;
      } else if (badgeResult.status === 'rejected') {
        log.error('FLOW SERVICE', 'Badge load failed', badgeResult.reason);
        // Treat failed load like no badge: clear display and allow game to proceed
        if (typeof window.handleNoBadge === 'function') {
          const noBadgeRes = await window.handleNoBadge(walletAddress);
          if (noBadgeRes?.autoShowMintModal) autoShowMintModalAfterLoad = true;
        } else {
          GameDataState.setBadge(null);
          GameDataState.setBadgeDisplayVisible(false);
          GameDataState.markDataLoaded();
        }
      }

      if (badgeData) {
        if (badgeData.success && badgeData.hasBadge && badgeData.badge) {
          const upgradeHandled = typeof window.handlePendingUpgrade === 'function'
            ? await window.handlePendingUpgrade(walletAddress, badgeData, {
                checkBadgeUpgrade: options.checkBadgeUpgrade === true,
              })
            : false;
          if (upgradeHandled) {
            connectTiming.badgeUiMs = Math.round(_connectTimingNow() - postParallelStart);
            connectTiming.totalToHideMs = Math.round(_connectTimingNow() - parallelStart);
            connectTiming.closedFor = 'pendingUpgradeModal';
            log.info('FLOW SERVICE', '[CONNECT-TIMING] loader closed for upgrade modal', {
              badgeUiMs: connectTiming.badgeUiMs,
              totalToHideMs: connectTiming.totalToHideMs,
              parallelWallMs: connectTiming.parallelWallMs,
            });
            try {
              if (typeof window !== 'undefined') window.__lastConnectLoadTiming = connectTiming;
            } catch (_) {}
            GameDataState.setLoading(false);
            void runDeferredBalance();
            return;
          }
          GameDataState.setBadge(badgeData);
          GameDataState.markDataLoaded();
          if (typeof window.displayBadge === 'function') {
            void window.displayBadge(badgeData).catch((err) => {
              log.warn('FLOW SERVICE', 'displayBadge failed (non-blocking)', err);
            });
          }
        } else {
          // User has no badge or API returned success: false – clear display and proceed
          if (typeof window.handleNoBadge === 'function') {
            const noBadgeRes = await window.handleNoBadge(walletAddress);
            if (noBadgeRes?.autoShowMintModal) autoShowMintModalAfterLoad = true;
          } else {
            GameDataState.setBadge(null);
            GameDataState.setBadgeDisplayVisible(false);
            GameDataState.markDataLoaded();
          }
        }
      }

      connectTiming.badgeUiMs = Math.round(_connectTimingNow() - postParallelStart);
      log.info('FLOW SERVICE', '[CONNECT-TIMING] post-parallel (badge handlers / display)', {
        durationMs: connectTiming.badgeUiMs,
      });
      connectTiming.totalToHideMs = Math.round(_connectTimingNow() - parallelStart);
      try {
        if (typeof window !== 'undefined') window.__lastConnectLoadTiming = connectTiming;
      } catch (_) {}

      // Sync readiness and hide loading modal once essentials (stats, game pass, badge) are done
      if (typeof gameReadinessState !== 'undefined') {
        const readiness = GameDataState.getReadinessState();
        gameReadinessState.dataLoaded = readiness.dataLoaded;
      }
      LoadingManager.hide();
      if (typeof updateGameReadiness === 'function') {
        updateGameReadiness();
      }

      // Background-only: after the loading UI is hidden, ensure Insignia tier matches badge tier.
      // This should never slow login, and logs will confirm build/execute on the backend.
      scheduleBackgroundInsigniaTierSync(walletAddress);

      if (
        autoShowMintModalAfterLoad &&
        typeof window.showBadgeMintingModal === 'function' &&
        !(typeof GameDataState !== 'undefined' && GameDataState.shouldSkipAutoMintModal && GameDataState.shouldSkipAutoMintModal())
      ) {
        const mintModalDelayMs = 450;
        setTimeout(() => {
          if (typeof window.isBadgeModalVisible === 'function' && window.isBadgeModalVisible()) {
            return;
          }
          if (typeof GameDataState !== 'undefined' && GameDataState.shouldSkipAutoMintModal && GameDataState.shouldSkipAutoMintModal()) {
            return;
          }
          void window.showBadgeMintingModal();
        }, mintModalDelayMs);
      }

      void runDeferredBalance();

      if (typeof window.prefetchPlayerInventoryReservoir === 'function' && walletAddress) {
        window.prefetchPlayerInventoryReservoir(walletAddress);
      }

      // Warm store token balances after menu load (non-blocking).
      try {
        if (window.TokenBalanceUtils?.prefetchTokenBalancesIfStale) {
          window.TokenBalanceUtils.prefetchTokenBalancesIfStale(walletAddress, 'testnet', ['mews', 'sui']);
        }
      } catch (_) {}

      if (typeof updateGameReadiness === 'function') {
        updateGameReadiness();
      }

    } catch (error) {
      log.error('FLOW SERVICE', 'Error loading game data', error);
      // Hide loading modal on error
      LoadingManager.hide();
      // Still sync state and update readiness even on error (so buttons can be disabled)
      if (typeof gameReadinessState !== 'undefined') {
        const readiness = GameDataState.getReadinessState();
        gameReadinessState.dataLoaded = readiness.dataLoaded;
      }
      if (typeof updateGameReadiness === 'function') {
        updateGameReadiness();
      }
      throw error;
    } finally {
      GameDataState.setLoading(false);
      // Ensure loading modal is hidden even if there was an early return
      // (e.g., upgrade modal shown, badge modal visible, etc.)
      if (LoadingManager.isVisible) {
        LoadingManager.hide();
      }
      try {
        if (walletAddress && typeof window.prefetchBadge === 'function') {
          window.prefetchBadge(walletAddress);
        }
        if (typeof window.scheduleMilestoneProgressPrefetchAfterLoadingUi === 'function') {
          window.scheduleMilestoneProgressPrefetchAfterLoadingUi();
        } else if (typeof window.prefetchMilestoneProgress === 'function') {
          queueMicrotask(() => window.prefetchMilestoneProgress());
        }
      } catch (_) {}
    }
  }
};

// Expose globally
if (typeof window !== 'undefined') {
  window.GameDataFlowService = GameDataFlowService;
}

      