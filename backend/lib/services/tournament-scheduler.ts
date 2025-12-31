// ==========================================
// TOURNAMENT SCHEDULER SERVICE
// ==========================================
// Automatically schedules reward distribution for tournaments
// when their grace period ends

// Simple logger for scheduler (not using BadgeLogger to avoid [BADGE] prefix)
const SchedulerLogger = {
  info: (message: string, data?: any) => {
    console.log(`[SCHEDULER] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`[SCHEDULER WARN] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  error: (message: string, data?: any) => {
    console.error(`[SCHEDULER ERROR] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  debug: (message: string, data?: any) => {
    if (process.env.DEBUG_SCHEDULER === 'true') {
      console.log(`[SCHEDULER DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
  },
};

// Distribution status constants (matching Move contract)
export const DISTRIBUTION_PENDING = 0;           // Not yet distributed
export const DISTRIBUTION_COMPLETED = 1;         // Rewards distributed to players
export const DISTRIBUTION_NO_PARTICIPANTS = 2;   // No participants to distribute to
export const DISTRIBUTION_NO_REWARDS = 3;        // No rewards configured/available

// Grace period in milliseconds (1 hour)
const GRACE_PERIOD_MS = 60 * 60 * 1000;

// Store for scheduled timeouts
const scheduledJobs: Map<number, NodeJS.Timeout> = new Map();

// Periodic check interval
let periodicCheckInterval: NodeJS.Timeout | null = null;

// How often to check for new tournaments (15 minutes - just a backup since we have direct notification)
const PERIODIC_CHECK_INTERVAL_MS = 15 * 60 * 1000;

// Flag to track if scheduler is initialized
let isInitialized = false;

// Transaction queue for serializing blockchain operations
const processingQueue: Array<{ tournamentId: number; objectId: string }> = [];
let isProcessingQueue = false;

// Delay between sequential transactions (5 seconds - simple approach)
const TX_STAGGER_DELAY_MS = 5_000;

/**
 * Tournament Scheduler Service
 * Handles automatic scheduling of reward distribution
 */
export const TournamentScheduler = {
  /**
   * Add a tournament to the processing queue
   * Ensures tournaments are processed sequentially to avoid object lock conflicts
   */
  queueDistribution(tournamentId: number, objectId: string): void {
    // Don't add duplicates
    if (processingQueue.some(item => item.tournamentId === tournamentId)) {
      SchedulerLogger.debug('⏰ Tournament already in queue', { tournamentId });
      return;
    }

    processingQueue.push({ tournamentId, objectId });
    SchedulerLogger.info('⏰ Added tournament to processing queue', {
      tournamentId,
      queueLength: processingQueue.length,
    });

    // Start processing if not already running
    this.processQueue();
  },

  /**
   * Process the queue sequentially
   * Only one tournament is processed at a time to avoid object lock conflicts
   */
  async processQueue(): Promise<void> {
    if (isProcessingQueue) {
      return; // Already processing
    }

    isProcessingQueue = true;

    while (processingQueue.length > 0) {
      const item = processingQueue.shift();
      if (!item) break;

      SchedulerLogger.info('⏰ Processing tournament from queue', {
        tournamentId: item.tournamentId,
        remainingInQueue: processingQueue.length,
      });

      try {
        await this.distributeRewards(item.tournamentId, item.objectId);
      } catch (error) {
        SchedulerLogger.error('⏰ Error processing queued tournament', {
          tournamentId: item.tournamentId,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      // Wait before processing next item to ensure object locks are released
      if (processingQueue.length > 0) {
        SchedulerLogger.debug('⏰ Waiting before processing next tournament', {
          delayMs: TX_STAGGER_DELAY_MS,
        });
        await new Promise(resolve => setTimeout(resolve, TX_STAGGER_DELAY_MS));
      }
    }

    isProcessingQueue = false;
  },

  /**
   * Initialize the scheduler
   * Call this on server startup to reschedule pending tournaments
   */
  async initialize(): Promise<void> {
    if (isInitialized) {
      SchedulerLogger.debug('⏰ Already initialized, skipping');
      return;
    }

    SchedulerLogger.info('⏰ Initializing tournament scheduler...');

    try {
      // Dynamically import to avoid circular dependencies
      const { getTournamentService } = await import('../sui/tournament-service');
      const tournamentService = getTournamentService();

      // Get all tournaments (active + past that need distribution)
      let tournaments: any[] = [];
      try {
        const activeTournaments = await tournamentService.getActiveTournaments();
        const pastTournaments = await tournamentService.getPastTournaments(100);
        tournaments = [...activeTournaments, ...pastTournaments];
      } catch (err) {
        SchedulerLogger.warn('⏰ Failed to load tournaments for scheduling', {
          error: err instanceof Error ? err.message : String(err),
        });
        isInitialized = true;
        return;
      }

      if (tournaments.length === 0) {
        SchedulerLogger.info('⏰ No tournaments found');
        isInitialized = true;
        this.startPeriodicCheck();
        return;
      }

      const now = Date.now();
      let scheduledCount = 0;
      let immediateCount = 0;

      for (const tournament of tournaments) {
        // Skip if distribution already complete (status > 0)
        if ((tournament.distributionStatus ?? 0) > 0) {
          continue;
        }

        const distributionTime = tournament.endTime + GRACE_PERIOD_MS;

        if (distributionTime <= now) {
          // Grace period already passed - add to processing queue
          SchedulerLogger.info('⏰ Tournament grace period already passed, adding to queue', {
            tournamentId: tournament.tournamentId,
            name: tournament.name,
            endTime: new Date(tournament.endTime).toISOString(),
            gracePeriodEnd: new Date(distributionTime).toISOString(),
          });
          
          // Add to sequential processing queue
          this.queueDistribution(tournament.tournamentId, tournament.objectId);
          immediateCount++;
        } else {
          // Schedule for future distribution
          this.scheduleDistribution(
            tournament.tournamentId,
            tournament.objectId,
            tournament.endTime,
            tournament.name
          );
          scheduledCount++;
        }
      }

      SchedulerLogger.info('⏰ Initialization complete', {
        totalTournaments: tournaments.length,
        scheduledForFuture: scheduledCount,
        immediateDistribution: immediateCount,
        alreadyDistributed: tournaments.filter((t: any) => (t.distributionStatus ?? 0) > 0).length,
      });

      // Start periodic check for new tournaments
      this.startPeriodicCheck();

      isInitialized = true;
    } catch (error) {
      SchedulerLogger.error('⏰ Error during initialization', error);
      isInitialized = true; // Mark as initialized to prevent retry loops
    }
  },

  /**
   * Start periodic check for new tournaments
   * This catches any tournaments created after server startup
   */
  startPeriodicCheck(): void {
    if (periodicCheckInterval) {
      return; // Already running
    }

    SchedulerLogger.info('⏰ Starting periodic check for new tournaments', {
      intervalMs: PERIODIC_CHECK_INTERVAL_MS,
      intervalHuman: this.formatDuration(PERIODIC_CHECK_INTERVAL_MS),
    });

    periodicCheckInterval = setInterval(async () => {
      await this.checkForNewTournaments();
      await this.moveEndedTournamentsToPast();
      await this.checkAdminReserves();
    }, PERIODIC_CHECK_INTERVAL_MS);
  },

  /**
   * Check for new tournaments that need scheduling
   */
  async checkForNewTournaments(): Promise<void> {
    try {
      const { getTournamentService } = await import('../sui/tournament-service');
      const tournamentService = getTournamentService();

      // Get all tournaments (active + past)
      const activeTournaments = await tournamentService.getActiveTournaments();
      const pastTournaments = await tournamentService.getPastTournaments(100);
      const tournaments = [...activeTournaments, ...pastTournaments];

      if (tournaments.length === 0) {
        return;
      }

      const now = Date.now();
      let newlyScheduled = 0;

      for (const tournament of tournaments) {
        // Skip if already distributed (status > 0) or already scheduled
        if ((tournament.distributionStatus ?? 0) > 0 || scheduledJobs.has(tournament.tournamentId)) {
          continue;
        }

        const distributionTime = tournament.endTime + GRACE_PERIOD_MS;

        if (distributionTime <= now) {
          // Grace period passed - add to queue
          SchedulerLogger.info('⏰ Found unprocessed tournament past grace period, adding to queue', {
            tournamentId: tournament.tournamentId,
            name: tournament.name,
          });
          
          this.queueDistribution(tournament.tournamentId, tournament.objectId);
        } else {
          // Schedule for future
          this.scheduleDistribution(
            tournament.tournamentId,
            tournament.objectId,
            tournament.endTime,
            tournament.name
          );
          newlyScheduled++;
        }
      }

      if (newlyScheduled > 0) {
        SchedulerLogger.info('⏰ Periodic check found new tournaments to schedule', {
          newlyScheduled,
        });
      }
    } catch (error) {
      SchedulerLogger.error('⏰ Error during periodic check', error);
    }
  },

  /**
   * Move ended tournaments from active_tournaments to past_tournaments
   * Called periodically to maintain the two-table structure
   */
  async moveEndedTournamentsToPast(): Promise<void> {
    try {
      const { getTournamentService } = await import('../sui/tournament-service');
      const tournamentService = getTournamentService();

      // Get only active tournaments (past tournaments are already moved)
      const activeTournaments = await tournamentService.getActiveTournaments(true); // Force refresh
      const now = Date.now();
      const GRACE_PERIOD_MS = 3600000; // 1 hour

      let movedCount = 0;
      let errorCount = 0;

      for (const tournament of activeTournaments) {
        const gracePeriodEnd = tournament.endTime + GRACE_PERIOD_MS;
        
        // Move if grace period has passed OR rewards have been distributed
        if (gracePeriodEnd <= now || (tournament.distributionStatus ?? 0) > 0) {
          try {
            const result = await tournamentService.moveTournamentToPast(tournament.tournamentId);
            if (result.success) {
              movedCount++;
              SchedulerLogger.info('⏰ Moved tournament to past table', {
                tournamentId: tournament.tournamentId,
                name: tournament.name,
                reason: (tournament.distributionStatus ?? 0) > 0 ? 'rewards_distributed' : 'grace_period_ended',
              });
            } else {
              errorCount++;
              SchedulerLogger.warn('⏰ Failed to move tournament to past', {
                tournamentId: tournament.tournamentId,
                name: tournament.name,
                error: result.error,
              });
            }
          } catch (error) {
            errorCount++;
            SchedulerLogger.error('⏰ Error moving tournament to past', {
              tournamentId: tournament.tournamentId,
              name: tournament.name,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      }

      if (movedCount > 0 || errorCount > 0) {
        SchedulerLogger.info('⏰ Tournament migration check completed', {
          movedCount,
          errorCount,
          checkedCount: activeTournaments.length,
        });
      }
    } catch (error) {
      SchedulerLogger.error('⏰ Error during tournament migration check', error);
    }
  },

  /**
   * Schedule reward distribution for a tournament
   * Call this when a new tournament is created
   */
  scheduleDistribution(
    tournamentId: number,
    tournamentObjectId: string,
    endTime: number,
    tournamentName?: string
  ): void {
    // Cancel any existing schedule for this tournament
    this.cancelSchedule(tournamentId);

    const distributionTime = endTime + GRACE_PERIOD_MS;
    const now = Date.now();
    const delay = distributionTime - now;

    if (delay <= 0) {
      // Already past distribution time - add to queue
      SchedulerLogger.info('⏰ Distribution time already passed, adding to queue', {
        tournamentId,
        tournamentName,
      });
      
      this.queueDistribution(tournamentId, tournamentObjectId);
      return;
    }

    // Schedule for future - use queue when it fires to avoid conflicts
    const timeout = setTimeout(() => {
      this.queueDistribution(tournamentId, tournamentObjectId);
    }, delay);

    scheduledJobs.set(tournamentId, timeout);

    const distributionDate = new Date(distributionTime);
    SchedulerLogger.info('⏰ Scheduled reward distribution', {
      tournamentId,
      tournamentName,
      endTime: new Date(endTime).toISOString(),
      distributionTime: distributionDate.toISOString(),
      delayMs: delay,
      delayHuman: this.formatDuration(delay),
    });
  },

  /**
   * Cancel a scheduled distribution
   */
  cancelSchedule(tournamentId: number): void {
    const existing = scheduledJobs.get(tournamentId);
    if (existing) {
      clearTimeout(existing);
      scheduledJobs.delete(tournamentId);
      SchedulerLogger.debug('⏰ Cancelled existing schedule', { tournamentId });
    }
  },

  /**
   * Distribute rewards for a tournament
   */
  async distributeRewards(tournamentId: number, tournamentObjectId: string): Promise<void> {
    SchedulerLogger.info('⏰ Starting automatic reward distribution', {
      tournamentId,
      tournamentObjectId,
    });

    // Remove from scheduled jobs
    scheduledJobs.delete(tournamentId);

    try {
      // Dynamically import to avoid circular dependencies
      const { getTournamentService } = await import('../sui/tournament-service');
      const { getRewardsService } = await import('../sui/rewards-service');

      const tournamentService = getTournamentService();
      const rewardsService = getRewardsService();

      // Get tournament details (fresh from chain)
      const tournamentResult = await tournamentService.getTournament(tournamentObjectId);
      if (!tournamentResult.success || !tournamentResult.tournament) {
        SchedulerLogger.error('⏰ Failed to get tournament for distribution', {
          tournamentId,
          error: tournamentResult.error,
        });
        return;
      }

      const tournament = tournamentResult.tournament;

      // Check if already distributed (status > 0)
      if ((tournament.distributionStatus ?? 0) > 0) {
        SchedulerLogger.info('⏰ Rewards already distributed, skipping', {
          tournamentId,
          tournamentName: tournament.name,
          distributionStatus: tournament.distributionStatus,
        });
        return;
      }

      // Get leaderboard
      const leaderboardResult = await tournamentService.getTournamentLeaderboard(
        tournamentObjectId,
        10 // Top 10
      );

      if (!leaderboardResult.success || !leaderboardResult.leaderboard) {
        SchedulerLogger.error('⏰ Failed to get leaderboard for distribution', {
          tournamentId,
          error: leaderboardResult.error,
        });
        return;
      }

      const leaderboard = leaderboardResult.leaderboard;

      if (leaderboard.length === 0) {
        SchedulerLogger.warn('⏰ No players in leaderboard, marking with NO_PARTICIPANTS status', {
          tournamentId,
          tournamentName: tournament.name,
        });
        
        // Mark tournament with NO_PARTICIPANTS status
        // This prevents the scheduler from retrying indefinitely
        try {
          await this.setDistributionStatus(tournamentObjectId, DISTRIBUTION_NO_PARTICIPANTS);
          SchedulerLogger.info('⏰ ✅ Marked empty tournament with NO_PARTICIPANTS status', {
            tournamentId,
            tournamentName: tournament.name,
            status: DISTRIBUTION_NO_PARTICIPANTS,
          });
        } catch (markErr) {
          const errorMsg = markErr instanceof Error ? markErr.message : String(markErr);
          // If it's a skip error (old transaction locks), just warn - will retry later
          if (errorMsg === 'SKIP_RETRY_LATER') {
            SchedulerLogger.warn('⏰ Tournament locked by old transactions - will retry later', {
              tournamentId,
            });
          } else {
            SchedulerLogger.error('⏰ Failed to set distribution status for empty tournament', {
              tournamentId,
              error: errorMsg,
            });
          }
        }
        return;
      }

      // Calculate rewards
      const distributions = await rewardsService.calculateTournamentRewards(
        tournament.prizePoolUSDCents,
        leaderboard.map((entry, index) => ({
          rank: index + 1,
          playerAddress: entry.playerAddress,
          playerName: entry.playerName,
          value: entry.value,
        })),
        tournament.participants,
        tournament.rewardConfig || null,
        tournament.rewardToken || 'MEWS'
      );

      // Distribute rewards
      const distributionResult = await rewardsService.distributeTournamentRewards(
        tournamentId,
        distributions
      );

      if (distributionResult.success) {
        SchedulerLogger.info('⏰ ✅ Automatic reward distribution successful', {
          tournamentId,
          tournamentName: tournament.name,
          distributionCount: distributions.length,
          digest: distributionResult.digest,
        });

        // CRITICAL: Update distribution status on contract to prevent duplicate distributions
        try {
          await this.setDistributionStatus(tournamentObjectId, DISTRIBUTION_COMPLETED);
          SchedulerLogger.info('⏰ ✅ Distribution status updated on contract', {
            tournamentId,
            tournamentName: tournament.name,
            status: DISTRIBUTION_COMPLETED,
          });
        } catch (statusError) {
          const errorMsg = statusError instanceof Error ? statusError.message : String(statusError);
          // If it's a skip error (old transaction locks), just warn - will retry later
          if (errorMsg === 'SKIP_RETRY_LATER') {
            SchedulerLogger.warn('⏰ Tournament locked by old transactions - status update will retry later', {
              tournamentId,
              tournamentName: tournament.name,
            });
          } else {
            SchedulerLogger.error('⏰ ❌ CRITICAL: Failed to update distribution status - this may allow duplicate distributions', {
              tournamentId,
              tournamentName: tournament.name,
              error: errorMsg,
              stack: statusError instanceof Error ? statusError.stack : undefined,
            });
            // Throw error to prevent scheduler from considering this complete
            throw new Error(`Failed to update distribution status: ${errorMsg}. Rewards were distributed but status was not updated.`);
          }
        }

        // Move tournament to past table after successful reward distribution
        try {
          const moveResult = await tournamentService.moveTournamentToPast(tournamentId);
          if (moveResult.success) {
            SchedulerLogger.info('⏰ ✅ Tournament moved to past table', {
              tournamentId,
              tournamentName: tournament.name,
            });
          } else {
            // Non-critical - log but don't fail
            SchedulerLogger.warn('⏰ Failed to move tournament to past (non-critical)', {
              tournamentId,
              tournamentName: tournament.name,
              error: moveResult.error,
            });
          }
        } catch (moveError) {
          // Non-critical - log but don't fail
          SchedulerLogger.warn('⏰ Error moving tournament to past (non-critical)', {
            tournamentId,
            tournamentName: tournament.name,
            error: moveError instanceof Error ? moveError.message : 'Unknown error',
          });
        }
      } else {
        SchedulerLogger.error('⏰ ❌ Automatic reward distribution failed', {
          tournamentId,
          tournamentName: tournament.name,
          error: distributionResult.error,
        });
      }
    } catch (error) {
      SchedulerLogger.error('⏰ Error during automatic distribution', {
        tournamentId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },

  /**
   * Get status of all scheduled jobs and processing queue
   */
  getStatus(): { 
    scheduledCount: number; 
    tournamentIds: number[]; 
    queueLength: number;
    queuedTournamentIds: number[];
    isProcessingQueue: boolean;
  } {
    return {
      scheduledCount: scheduledJobs.size,
      tournamentIds: Array.from(scheduledJobs.keys()),
      queueLength: processingQueue.length,
      queuedTournamentIds: processingQueue.map(item => item.tournamentId),
      isProcessingQueue: isProcessingQueue,
    };
  },

  /**
   * Format duration for human-readable output
   */
  formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  },

  /**
   * Check if scheduler is initialized
   */
  isReady(): boolean {
    return isInitialized;
  },

  /**
   * Set distribution status for a tournament
   * Uses the admin_set_distribution_status contract function
   * @param tournamentObjectId - The tournament object ID
   * @param status - Distribution status code (0=pending, 1=distributed, 2=no_participants, 3=no_rewards)
   */
  async setDistributionStatus(tournamentObjectId: string, status: number): Promise<void> {
    // Use batch function for single item
    await this.setDistributionStatusBatch([{ tournamentObjectId, status }]);
  },

  /**
   * Set distribution status for multiple tournaments in a SINGLE transaction
   * This is more efficient than separate transactions since the AdminCap is an owned object
   * that can only be used by one transaction at a time
   * @param updates - Array of tournament updates
   */
  async setDistributionStatusBatch(updates: Array<{ tournamentObjectId: string; status: number }>): Promise<void> {
    if (updates.length === 0) return;

    const { Transaction } = await import('@mysten/sui/transactions');
    const { getAdminWalletService } = await import('../sui/admin-wallet-service');
    const { getConfig } = await import('@/config/config');
    const { executeTransactionWithFinalization } = await import('../sui/transaction-helpers');

    const adminWallet = getAdminWalletService();
    const config = getConfig();
    const client = config.sui.network === 'testnet'
      ? adminWallet.getTestnetClient()
      : adminWallet.getMainnetClient();

    // Get contract addresses from config
    const packageId = config.contracts.gameScore?.split('::')[0] || '';
    const adminCapId = config.contracts.tournamentAdminCap || '';

    if (!packageId || !adminCapId) {
      throw new Error('Tournament contract addresses not configured');
    }

    // Build transaction - just the Move calls, gas selection is automatic
    const txb = new Transaction();
    txb.setSender(adminWallet.getAddress());
    txb.setGasBudget(config.sui.gasBudget * Math.min(updates.length, 10));

    // Add all status updates to the same transaction
    for (const update of updates) {
      txb.moveCall({
        target: `${packageId}::tournaments::admin_set_distribution_status`,
        arguments: [
          txb.object(update.tournamentObjectId),
          txb.object(adminCapId),
          txb.pure.u8(update.status),
        ],
      });
    }

    SchedulerLogger.info('⏰ Executing batch status update', {
      count: updates.length,
      tournamentIds: updates.map(u => u.tournamentObjectId.substring(0, 10) + '...'),
    });

    // Execute with helper - try once, skip if old transaction locks
    try {
      await executeTransactionWithFinalization(
        client,
        adminWallet.getKeypair(),
        txb,
        {
          retries: 1, // Only try once - if it fails, check if it's an old lock
          logger: {
            info: (msg, data) => SchedulerLogger.info(`⏰ ${msg}`, data),
            warn: (msg, data) => SchedulerLogger.warn(`⏰ ${msg}`, data),
            error: (msg, data) => SchedulerLogger.error(`⏰ ${msg}`, data),
          },
        }
      );

      SchedulerLogger.info('⏰ Batch status update successful', {
        count: updates.length,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      // If it's a lock error from old pruned transactions, skip - will retry later
      if (errorMsg.includes('already locked') && errorMsg.includes('TransactionDigest')) {
        SchedulerLogger.warn('⏰ Tournament objects locked by old transactions - will retry later', {
          error: errorMsg.substring(0, 200),
        });
        throw new Error('SKIP_RETRY_LATER');
      }
      
      // Re-throw other errors
      throw error;
    }
  },

  /**
   * Check admin wallet reserves and log warnings if low
   * Runs alongside the periodic tournament check
   */
  async checkAdminReserves(): Promise<void> {
    try {
      const { getAdminWalletService } = await import('../sui/admin-wallet-service');
      const { getConfig } = await import('@/config/config');

      const adminWallet = getAdminWalletService();
      const config = getConfig();
      const client = config.sui.network === 'testnet'
        ? adminWallet.getTestnetClient()
        : adminWallet.getMainnetClient();
      const address = adminWallet.getAddress();

      // Minimum thresholds (in raw units)
      const MIN_SUI = BigInt(1_000_000_000); // 1 SUI
      const MIN_MEWS = BigInt(100_000_000_000); // 100 MEWS

      // Check SUI balance
      const suiCoins = await client.getCoins({
        owner: address,
        coinType: '0x2::sui::SUI',
      });
      const suiBalance = suiCoins.data.reduce(
        (sum, coin) => sum + BigInt(coin.balance),
        BigInt(0)
      );

      if (suiBalance < MIN_SUI) {
        SchedulerLogger.warn('⚠️ [RESERVES] Low SUI balance in admin wallet!', {
          balance: suiBalance.toString(),
          balanceFormatted: `${Number(suiBalance) / 1e9} SUI`,
          minimum: `${Number(MIN_SUI) / 1e9} SUI`,
          address,
        });
      }

      // Check MEWS balance
      const mewsTokenTypeId = config.token.mewsTokenTypeId;
      if (mewsTokenTypeId) {
        const mewsCoins = await client.getCoins({
          owner: address,
          coinType: mewsTokenTypeId,
        });
        const mewsBalance = mewsCoins.data.reduce(
          (sum, coin) => sum + BigInt(coin.balance),
          BigInt(0)
        );

        if (mewsBalance < MIN_MEWS) {
          SchedulerLogger.warn('⚠️ [RESERVES] Low MEWS balance in admin wallet!', {
            balance: mewsBalance.toString(),
            balanceFormatted: `${Number(mewsBalance) / 1e9} MEWS`,
            minimum: `${Number(MIN_MEWS) / 1e9} MEWS`,
            address,
          });
        }
      }
    } catch (error) {
      SchedulerLogger.error('⏰ Error checking admin reserves', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
};

// Export singleton instance
export const getTournamentScheduler = () => TournamentScheduler;
