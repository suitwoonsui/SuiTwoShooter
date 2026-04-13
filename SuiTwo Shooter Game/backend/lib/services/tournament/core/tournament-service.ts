// ==========================================
// Tournament Service - Handles tournament operations (platform-primary)
// ==========================================
// Create, enter, submit score, leaderboard, list: platform only via HTTP API (tournament/station).
// Events follow the platform’s three-table model: **Upcoming**, **Active**, **Ended** (past).
// We list upcoming (getUpcomingEvents), active (getActiveEvents), and past (getPastEvents); move-to-past uses Channel station-move-event-to-past.

import { Transaction } from '@mysten/sui/transactions';
import { getConfig } from '@/config/config';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { PaymentToken } from '@/lib/services/wallet/payments/payment-transaction-builder';
import { priceConverter } from '@/lib/services/payments/converter/price-converter';
import { calculateRewardCost, calculateTotalPayment, TournamentRewardConfig as RewardCostConfig } from '@/lib/services/tournament/cost/reward-cost-calculator';
import { checkBalanceBeforeTransaction } from '@/lib/services/wallet/balance/balance-checker';
import { callPlatformBackend, getEcosystemIdFromEnv, getAppIdFromEnv, getCorridorAdminCapabilityObjectIdFromEnv, getCorridorCapabilityObjectIdFromEnv, platformTournamentClient, platformGamePassClient, platformEventsClient, platformTxClient, buildBatchViaChannel, buildPlatformCallOptions, signAndExecuteSigned, type CallPlatformBackendOptions } from '@/lib/services/platform/client/platform-client';

import { getGameConfigService } from '@/lib/services/config/game-config/game-config-service';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';

// Tournament category constants (matching Move contract)
const CATEGORY_TOTAL_COINS = 0;
const CATEGORY_LONGEST_STREAK = 1;
const CATEGORY_HIGHEST_SCORE = 2;
const CATEGORY_LONGEST_DISTANCE = 3;
const CATEGORY_MOST_BOSSES = 4;
const CATEGORY_MOST_ENEMIES = 5;

// Distribution status constants (matching Move contract)
export const DISTRIBUTION_PENDING = 0;           // Not yet distributed
export const DISTRIBUTION_COMPLETED = 1;         // Rewards distributed to players
export const DISTRIBUTION_NO_PARTICIPANTS = 2;   // No participants to distribute to
export const DISTRIBUTION_NO_REWARDS = 3;        // No rewards configured/available

// Helper to check if distribution is done (any status > 0)
export function isDistributionComplete(status: number | undefined): boolean {
  return status !== undefined && status > 0;
}

// Get human-readable distribution status
export function getDistributionStatusLabel(status: number | undefined): string {
  switch (status) {
    case DISTRIBUTION_PENDING: return 'Pending';
    case DISTRIBUTION_COMPLETED: return 'Distributed';
    case DISTRIBUTION_NO_PARTICIPANTS: return 'No Participants';
    case DISTRIBUTION_NO_REWARDS: return 'No Rewards';
    default: return 'Unknown';
  }
}

export interface Tournament {
  tournamentId: number;
  name: string;
  category: 'totalCoins' | 'longestStreak' | 'highestScore' | 'longestDistance' | 'mostBosses' | 'mostEnemies';
  startTime: number;
  endTime: number;
  entryFeeTickets: number;  // Number of tournament tickets required (typically 1)
  /** Value per ticket in USD cents; when a user enters, this × entryFeeTickets is added to the pool. */
  ticketValueUSDCents?: number;
  prizePoolUSDCents: number;  // Total prize pool in USD (cents, sum of ticket USD values + starting ante)
  participants: number;
  status: 'upcoming' | 'active' | 'ended';
  createdAt: number;
  objectId: string;  // Sui object ID
  distributionStatus?: number;  // 0=pending, 1=distributed, 2=no_participants, 3=no_rewards
  rewardsDistributed?: boolean;  // Convenience: true if distributionStatus > 0 (for backwards compat)
  
  // NEW FIELDS
  rewardConfig?: RewardCostConfig | null; // Custom reward configuration (null = default rewards)
  startingAnteUSDCents?: number;  // Starting ante (creator's contribution to prize pool)
  rewardToken?: 'SUI' | 'MEWS' | 'USDC';  // Token type used for reward distribution
  createdBy?: string;              // Tournament creator address
  creationFeePaid?: number;        // Creation fee paid (in USD cents, 0 for admin-created)
  creatorRewardUSDCents?: number;  // Creator reward amount (calculated at tournament end)
  creatorRewardPaid?: boolean;      // Whether creator reward has been paid
  hasCustomRewards?: boolean;      // Convenience flag: true if rewardConfig is not null
  /** Pool vault object ID for this tournament (when useVaultPool was used at create). */
  poolVaultId?: string;
  /** Pool vault on-chain balance (raw token units, e.g. MIST for SUI). */
  poolVaultBalanceRaw?: string;
  /** Full Move coin type for pool vault (e.g. 0x2::sui::SUI). */
  poolVaultCoinTypeId?: string;
}

export interface LeaderboardEntry {
  rank: number;
  playerAddress: string;
  playerName?: string;  // Optional player name (if provided)
  value: number;  // Score/value for this category
  displayValue: string;  // Formatted for display
}

export interface TournamentEntry {
  ticketId: number;
  ticketValueUSDCents: number;
  enteredAt: number;
}

/**
 * TournamentService - Handles tournament-related blockchain operations
 */
/** Creation fee in USD cents for player-created tournaments ($5.00). Used for creator reward and mapping from platform events. */
const PLAYER_CREATION_FEE_USD_CENTS = 500;

export class TournamentService {
  private config: ReturnType<typeof getConfig>;
  private _adminWallet: ReturnType<typeof getAdminWalletService> | null = null;

  // Cache for active tournaments to reduce RPC calls
  private _activeTournamentsCache: Tournament[] | null = null;
  private _activeTournamentsCacheTimestamp: number = 0;
  private readonly _activeTournamentsCacheTTL = 120000; // 2 minutes (Tide also warms listing after each cycle)
  // Coalesce platform station reads to avoid duplicate concurrent calls.
  private _inFlightEventFetches: Map<string, Promise<{ success: boolean; events?: any[]; error?: string }>> = new Map();

  constructor() {
    this.config = getConfig();
    // Tournament create/enter/submit/list/leaderboard go through platform backend API only (platformEventsClient, platformTournamentClient).
  }

  /**
   * Wallet from platform GET api/station/:id/entries. Station returns `participantAddress`;
   * older code paths assumed `participant` / `playerAddress` only — without this, every row looked "empty".
   */
  private addressFromStationEventEntry(entry: {
    participantAddress?: string;
    participant?: string;
    address?: string;
    playerAddress?: string;
    entryData?: Record<string, unknown>;
  }): string {
    const raw =
      entry.participantAddress ??
      entry.participant ??
      entry.address ??
      entry.playerAddress ??
      entry.entryData?.['participant'];
    return typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  }

  /**
   * Lazy getter for admin wallet (only needed for backward compatibility)
   * Tournament operations now go through platform backend API
   */
  private get adminWallet(): ReturnType<typeof getAdminWalletService> {
    if (!this._adminWallet) {
      try {
        this._adminWallet = getAdminWalletService();
      } catch (error) {
        // If admin wallet is not available, that's okay for new tournament operations
        // Only old tournament operations need it
        throw new Error('Admin wallet not available. Tournament operations should use platform backend API. If you need to access old tournaments, set GAME_WALLET_PRIVATE_KEY in .env');
      }
    }
    return this._adminWallet;
  }

  /**
   * Convert item ID string to u8 (matching Move contract constants)
   */
  private itemIdToU8(itemId: string): number {
    const itemIdMap: Record<string, number> = {
      'orb_level': 0,
      'force_field': 1,
      'extra_lives': 2,
      'slow_time': 3,
      'coin_tractor_beam': 4,
      'destroy_all': 5,
      'boss_kill_shot': 6,
      'random': 255, // Special value - resolved to random L1 item at distribution time
    };
    
    const value = itemIdMap[itemId];
    if (value === undefined) {
      PlatformLogger.warn('🏆 [TOURNAMENT CREATE] Unknown item ID, defaulting to 0', { itemId });
      return 0;
    }
    return value;
  }

  /**
   * App registry is managed by the platform. Tournament create via platform API will fail with a clear error if registry is missing.
   * This helper is kept for callers that check before create; we do not call platform for registry (platform owns that).
   */
  private async getOrCreateAppRegistry(_appId: string): Promise<{ success: boolean; registryId?: string; error?: string }> {
    return {
      success: false,
      error: 'App registry is managed by the platform. Create tournaments via the platform API; it will create the registry when needed.',
    };
  }

  // Cache for default reward config
  private _defaultRewardConfigCache: {
    config: {
      rewardDepth: number;
      poolDepth: number;
      poolDistribution: number[];
      poolSource: number;
      itemRewards: Record<number, Array<{ itemId: string; level: number; quantity: number }>>;
    } | null;
    timestamp: number;
  } = { config: null, timestamp: 0 };
  private readonly _defaultRewardConfigCacheTTL = 60000; // 1 minute

  /** Message shown when default rewards are not set on-chain (used for consistent API responses). */
  static readonly DEFAULT_REWARDS_NOT_SET_MESSAGE =
    'Default rewards have not been set on-chain. Please initialize default rewards from the admin panel (Tournaments → Default Rewards → Initialize to blockchain) first.';

  /**
   * Get default reward config from on-chain only.
   * The backend file is only used for initializing (pushing to chain); tournament creation must use on-chain config.
   * Throws PlatformError(CONFIG_MISSING) if not set on-chain so the creator is informed to initialize first.
   */
  private async getDefaultRewardConfig(options?: CallPlatformBackendOptions): Promise<{
    rewardDepth: number;
    poolDepth: number;
    poolDistribution: number[];
    poolSource: number;
    itemRewards: Record<number, Array<{ itemId: string; level: number; quantity: number }>>;
  }> {
    const now = Date.now();
    if (this._defaultRewardConfigCache.config &&
        (now - this._defaultRewardConfigCache.timestamp) < this._defaultRewardConfigCacheTTL) {
      return this._defaultRewardConfigCache.config;
    }

    try {
      const appId = getAppIdFromEnv() || '';
      const path = appId ? `api/regatta/default-sustain-config?appId=${encodeURIComponent(appId)}` : 'api/regatta/default-sustain-config';
      const result = await callPlatformBackend<{
        success?: boolean;
        rewardConfig?: Record<string, unknown>;
        source?: string;
      }>(path, {
        method: 'GET',
      });
      if (result?.success && result.source === 'chain' && result.rewardConfig && typeof result.rewardConfig === 'object') {
        const r = result.rewardConfig;
        const hasContent = typeof r.rewardDepth === 'number' ||
          (r.itemRewards && typeof r.itemRewards === 'object' && Object.keys(r.itemRewards).length > 0);
        if (hasContent) {
          const config = {
            rewardDepth: typeof r.rewardDepth === 'number' ? r.rewardDepth : 10,
            poolDepth: typeof r.poolDepth === 'number' ? r.poolDepth : 3,
            poolDistribution: Array.isArray(r.poolDistribution) ? r.poolDistribution : [50, 30, 20],
            poolSource: typeof r.poolSource === 'number' ? r.poolSource : 0,
            itemRewards: r.itemRewards && typeof r.itemRewards === 'object'
              ? (r.itemRewards as Record<number, Array<{ itemId: string; level: number; quantity: number }>>)
              : {},
          };
          this._defaultRewardConfigCache = { config, timestamp: now };
          PlatformLogger.info('⚙️ [DEFAULT REWARDS] Using on-chain default rewards for tournament creation');
          return config;
        }
      }
    } catch (e) {
      PlatformLogger.warn('⚙️ [DEFAULT REWARDS] On-chain default not available', {
        error: e instanceof Error ? e.message : 'Unknown',
      });
    }

    throw new PlatformError(
      PlatformErrorCode.CONFIG_MISSING,
      TournamentService.DEFAULT_REWARDS_NOT_SET_MESSAGE
    );
  }

  /**
   * Convert category string to u8 value
   */
  private categoryToU8(category: Tournament['category']): number {
    const map: Record<string, number> = {
      'totalCoins': CATEGORY_TOTAL_COINS,
      'longestStreak': CATEGORY_LONGEST_STREAK,
      'highestScore': CATEGORY_HIGHEST_SCORE,
      'longestDistance': CATEGORY_LONGEST_DISTANCE,
      'mostBosses': CATEGORY_MOST_BOSSES,
      'mostEnemies': CATEGORY_MOST_ENEMIES,
    };
    return map[category] ?? CATEGORY_HIGHEST_SCORE;
  }

  /**
   * Convert u8 category to string
   */
  private u8ToCategory(categoryU8: number): Tournament['category'] {
    const map: Record<number, Tournament['category']> = {
      [CATEGORY_TOTAL_COINS]: 'totalCoins',
      [CATEGORY_LONGEST_STREAK]: 'longestStreak',
      [CATEGORY_HIGHEST_SCORE]: 'highestScore',
      [CATEGORY_LONGEST_DISTANCE]: 'longestDistance',
      [CATEGORY_MOST_BOSSES]: 'mostBosses',
      [CATEGORY_MOST_ENEMIES]: 'mostEnemies',
    };
    return map[categoryU8] ?? 'highestScore';
  }

  /**
   * Get tournament and vault fees from the platform (on-chain lookup, MIST).
   * Gas is determined by the platform via Channel dry-run when building the create transaction; the game does not fetch gas.
   */
  private async getPlatformFees(
    options?: CallPlatformBackendOptions
  ): Promise<{ tournamentCreationFeeMist: number; vaultCreationFeeMist: number } | null> {
    try {
      const [tournamentRes, vaultRes] = await Promise.all([
        platformTournamentClient.getTournamentFee(options),
        platformTournamentClient.getVaultFee(options),
      ]);
      if (!tournamentRes.success || typeof tournamentRes.tournamentCreationFeeMist !== 'number' || tournamentRes.tournamentCreationFeeMist < 0) return null;
      if (!vaultRes.success || typeof vaultRes.vaultCreationFeeMist !== 'number' || vaultRes.vaultCreationFeeMist < 0) return null;
      return {
        tournamentCreationFeeMist: tournamentRes.tournamentCreationFeeMist,
        vaultCreationFeeMist: vaultRes.vaultCreationFeeMist,
      };
    } catch {
      return null;
    }
  }

  private static readonly SUI_COIN_TYPE = '0x2::sui::SUI';
  private static readonly CLOCK_OBJECT_ID = '0x6';

  /**
   * Create a new tournament (admin-created flow only).
   * Admin pays gas/vault/tournament fees and optional starting ante; admin wallet holds CorridorAdminCap and signs vault create (Glacier).
   * For user-created tournaments (user pays), use a separate flow when implemented — do not use this method.
   * Supports custom rewards and starting ante. Uses platform tournament API.
   */
  async createTournament(
    config: {
      name: string;
      category: Tournament['category'];
      startTime: number;  // Unix timestamp (milliseconds)
      endTime: number;    // Unix timestamp (milliseconds)
      entryFeeTickets: number;   // Number of tournament tickets required (typically 1)
      /** Value per ticket in USD cents; when a user enters, this × entryFeeTickets is added to the pool. Required by platform; default 100 ($1). */
      ticketValueUSDCents?: number;
      /** Competition type (e.g. 'all-vs-all'). Required by platform; default 'all-vs-all'. */
      competitionType?: string;
      /** 'individual' or 'team'. Required by platform; default 'individual'. */
      participationMode?: 'individual' | 'team';
      rewardConfig?: RewardCostConfig | null;  // Optional custom reward config (null = default rewards)
      startingAnteUSDCents?: number;  // Optional starting ante (default: 0)
      /** Optional: raw token amount to deposit into pool vault at create (e.g. MIST). When set with rewardTokenTypeId, vault is funded. */
      startingAnteAmountRaw?: string;
      rewardToken?: 'SUI' | 'MEWS' | 'USDC';  // Token type for reward distribution (default: MEWS)
      /** Full Move coin type for pool vault (e.g. 0x2::sui::SUI). When set, a vault is created. */
      rewardTokenTypeId?: string;
      createdBy?: string;  // Tournament creator address (default: admin wallet)
      createdByApiKey?: string;  // Optional API key for creator tracking
    },
    options?: CallPlatformBackendOptions
  ): Promise<{ success: boolean; tournament?: Tournament; error?: string }> {
    try {
      // Use platform identity from env (APP_ID); same as inventory and game config
      const appId = getAppIdFromEnv() || this.config.server.appId || '';

      // Build tournament metadata
      const startingAnteUSDCents = config.startingAnteUSDCents || 0;
      const rewardToken = config.rewardToken || 'MEWS';
      // Full Move coin type for pool vault (so platform creates vault and we can add ante for SUI/MEWS/USDC)
      const mewsType = this.config.token?.mewsTokenTypeId?.trim();
      const usdcType = this.config.token?.usdcTokenTypeId?.trim();
      const rewardTokenTypeId =
        config.rewardTokenTypeId?.trim() ||
        (rewardToken === 'SUI'
          ? '0x2::sui::SUI'
          : rewardToken === 'MEWS' && mewsType
            ? mewsType
            : rewardToken === 'USDC' && usdcType
              ? usdcType
              : undefined);

      // Get default reward config if not provided (on-chain only; throws if not set)
      let rewardConfig = config.rewardConfig;
      if (!rewardConfig || Object.keys(rewardConfig.itemRewards || {}).length === 0) {
        rewardConfig = await this.getDefaultRewardConfig(options);
      }
      // Ensure we never read .poolDistribution etc on undefined (fallback if getDefaultRewardConfig failed)
      const rc = rewardConfig && typeof rewardConfig === 'object' ? rewardConfig : null;
      const safeRewardConfig = {
        rewardDepth: typeof rc?.rewardDepth === 'number' ? rc.rewardDepth : 10,
        poolDepth: typeof rc?.poolDepth === 'number' ? rc.poolDepth : 3,
        poolDistribution: Array.isArray(rc?.poolDistribution) ? rc.poolDistribution : [50, 30, 20],
        poolSource: typeof rc?.poolSource === 'number' ? rc.poolSource : 0,
        itemRewards: rc?.itemRewards && typeof rc.itemRewards === 'object' ? rc.itemRewards : {},
      };

      const tournamentMetadata = {
        category: this.categoryToU8(config.category),
        categoryLabel: config.category,
        entryFeeTickets: config.entryFeeTickets,
        startingAnteUSDCents,
        rewardToken,
        rewardConfig: safeRewardConfig,
      };

      PlatformLogger.info('🏆 [TOURNAMENT CREATE] Creating tournament via platform backend API', {
        name: config.name,
        category: config.category,
        appId,
      });

      // Get fees from platform (on-chain). Gas is determined by the platform via Channel dry-run when it builds the create transaction.
      const fees = await this.getPlatformFees(options);
      if (!fees) {
        return {
          success: false,
          error: 'Could not get tournament and vault fees from platform. Ensure platform is reachable and fees are configured.',
        };
      }
      PlatformLogger.info('🏆 [TOURNAMENT CREATE] Got fees from platform; platform will build create tx via Channel (gas from dry-run)', {
        tournamentCreationFeeMist: fees.tournamentCreationFeeMist,
        vaultCreationFeeMist: fees.vaultCreationFeeMist,
      });

      // Admin-created flow: admin wallet is creator, vault signer, and ante payer. User-created tournaments use a different flow (user pays).
      // Create tournament via platform backend API (SaaS pattern).
      // When admin pays for vault+ante: phase 1 returns vault tx; admin signs; phase 2 sends signed tx and platform creates event (create_vault_with_coin).
      const createdBy = config.createdBy?.trim() || this.adminWallet.getAddress();
      const appAdminAddress = this.adminWallet.getAddress(); // Admin-created only: app admin holds CorridorAdminCap and signs vault create (Glacier). User-created flow uses user as payer, different path.
      const hasAnte = (startingAnteUSDCents > 0) || (config.startingAnteAmountRaw?.trim() && BigInt(config.startingAnteAmountRaw.trim()) > 0n);
      // When no ante, still send rewardTokenTypeId so platform creates an empty vault (pool funded by ticket entries).
      // Vault pool (Glacier), admin-created only: platform needs appAdminAddress and X-Corridor-Admin-Capability-Object-Id to return create_vault tx for admin to sign.
      const regattaOptions: CallPlatformBackendOptions = {
        ...options,
        corridorAdminCapabilityObjectId: options?.corridorAdminCapabilityObjectId ?? getCorridorAdminCapabilityObjectIdFromEnv(),
      };
      const competitionType = (config.competitionType?.trim() || 'all-vs-all');
      const participationMode = config.participationMode === 'team' ? 'team' : 'individual';
      let createParams: Parameters<typeof platformTournamentClient.createTournament>[0] = {
        name: config.name,
        category: config.category,
        competitionType,
        startTime: config.startTime,
        endTime: config.endTime,
        entryFeeTickets: config.entryFeeTickets,
        ticketValueUSDCents: config.ticketValueUSDCents ?? 100,
        participationMode,
        startingAnteUSDCents,
        startingAnteAmountRaw: config.startingAnteAmountRaw,
        rewardToken,
        rewardTokenTypeId,
        rewardConfig: tournamentMetadata.rewardConfig,
        createdBy,
        createdByApiKey: config.createdByApiKey,
        appAdminAddress,
        ...(hasAnte ? { senderAddress: appAdminAddress } : {}),
        // Fee amounts from platform so platform uses them when building the create transaction (gas comes from Channel dry-run).
        tournamentCreationFeeMist: fees.tournamentCreationFeeMist,
        vaultCreationFeeMist: fees.vaultCreationFeeMist,
      };
      let createResult = await platformTournamentClient.createTournament(createParams, regattaOptions);

      PlatformLogger.info('🏆 [TOURNAMENT CREATE] Platform createTournament response', {
        name: config.name,
        success: createResult.success,
        phase: createResult.phase ?? null,
        hasTransaction: Boolean(createResult.transaction),
        hasTournament: Boolean(createResult.tournament),
        error: createResult.error ?? null,
      });

      // Phases: Option A single PTB (sign_tournament_create) → tournament; or legacy: transfer_ante → vault → create_event_corridor → tournament.
      while (createResult.success && createResult.transaction && !createResult.tournament) {
        const txBytes = Buffer.from(createResult.transaction, 'base64');
        const signed = await this.adminWallet.getKeypair().signTransaction(txBytes);
        const isVaultPhase = createResult.phase === 'create_vault_with_coin' || createResult.phase === 'create_vault';
        const isEventCorridorPhase = createResult.phase === 'create_event_corridor';
        const isOptionASignPhase = createResult.phase === 'sign_tournament_create';
        const noGasPayment = { signedGasPaymentTransactionBlock: undefined, gasPaymentSignature: undefined };
        if (isVaultPhase) {
          createParams = {
            ...createParams,
            vaultTransactionBlock: createResult.transaction,
            vaultPartialSignature: signed.signature,
            // Important: the CorridorAdminCap is consumed/mutated by the vault tx. Any previously-built
            // create-event tx would now reference a stale version and fail with "not available for consumption".
            signedCreateEventTransactionBlock: undefined,
            createEventSignature: undefined,
            ...noGasPayment,
          };
        } else if (isEventCorridorPhase || isOptionASignPhase) {
          createParams = {
            ...createParams,
            // Platform returns vaultId alongside create_event_corridor so it can be sent back on the follow-up request.
            vaultId: (createResult as { vaultId?: string }).vaultId ?? (createParams as any).vaultId,
            signedCreateEventTransactionBlock: createResult.transaction,
            createEventSignature: signed.signature,
            // Prevent accidental reuse of other signed tx payloads across phases.
            vaultTransactionBlock: undefined,
            vaultPartialSignature: undefined,
            signedTransactionBlock: undefined,
            signature: undefined,
            ...noGasPayment,
          };
        } else {
          createParams = {
            ...createParams,
            signedTransactionBlock: createResult.transaction,
            signature: signed.signature,
            // Prevent accidental reuse of stale phase payloads.
            vaultTransactionBlock: undefined,
            vaultPartialSignature: undefined,
            signedCreateEventTransactionBlock: undefined,
            createEventSignature: undefined,
            ...noGasPayment,
          };
        }
        PlatformLogger.info('🏆 [TOURNAMENT CREATE] Signing and resubmitting to platform', {
          name: config.name,
          phase: createResult.phase,
        });
        createResult = await platformTournamentClient.createTournament(createParams, regattaOptions);
        PlatformLogger.info('🏆 [TOURNAMENT CREATE] Platform createTournament response (after sign)', {
          name: config.name,
          success: createResult.success,
          phase: createResult.phase ?? null,
          hasTournament: Boolean(createResult.tournament),
          error: createResult.error ?? null,
        });
      }

      if (!createResult.success || !createResult.tournament) {
        const errorMessage =
          createResult.error ||
          (createResult.phase === 'sign_tournament_create' && !createResult.transaction
            ? 'Platform returned sign_tournament_create but no transaction to sign. Check platform logs.'
            : 'Failed to create tournament');
        PlatformLogger.error('🏆 [TOURNAMENT CREATE] Create failed', {
          name: config.name,
          phase: createResult.phase ?? null,
          platformError: createResult.error ?? null,
          returnedError: errorMessage,
        });
        return {
          success: false,
          error: errorMessage,
        };
      }

      const tournamentResponse = createResult.tournament;

      // Map platform response to Tournament interface
      const mappedTournament: Tournament = {
        tournamentId: tournamentResponse.tournamentId,
        name: tournamentResponse.name,
        category: tournamentResponse.category,
        startTime: tournamentResponse.startTime,
        endTime: tournamentResponse.endTime,
        entryFeeTickets: tournamentResponse.entryFeeTickets,
        ticketValueUSDCents: tournamentResponse.ticketValueUSDCents ?? config.ticketValueUSDCents ?? 100,
        prizePoolUSDCents: tournamentResponse.prizePoolUSDCents || startingAnteUSDCents,
        participants: tournamentResponse.participants || 0,
        status: tournamentResponse.status,
        createdAt: tournamentResponse.createdAt,
        objectId: tournamentResponse.objectId,
        rewardConfig: config.rewardConfig || null,
        startingAnteUSDCents: tournamentResponse.startingAnteUSDCents || startingAnteUSDCents,
        rewardToken: tournamentResponse.rewardToken || rewardToken,
        createdBy: tournamentResponse.createdBy,
        creationFeePaid: 0, // Admin-created: no creation fee paid by creator
        creatorRewardUSDCents: 0,
        creatorRewardPaid: false,
        hasCustomRewards: !!(config.rewardConfig && Object.keys(config.rewardConfig.itemRewards || {}).length > 0),
        poolVaultId: tournamentResponse.poolVaultId,
        poolVaultBalanceRaw: tournamentResponse.poolVaultBalanceRaw,
        poolVaultCoinTypeId: tournamentResponse.poolVaultCoinTypeId,
      };

      // Clear cache so the new tournament appears in listings immediately
      this.clearActiveTournamentsCache();

      PlatformLogger.info('🏆 [TOURNAMENT CREATE] Tournament created successfully', {
        tournamentId: mappedTournament.tournamentId,
        objectId: mappedTournament.objectId,
        name: mappedTournament.name,
      });

      return {
        success: true,
        tournament: mappedTournament,
      };
    } catch (error) {
      PlatformLogger.error('🏆 [TOURNAMENT CREATE] Error creating tournament', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get tournament by object ID
   * Uses platform EventService to read event data
   */
  async getTournament(objectId: string): Promise<{ success: boolean; tournament?: Tournament; error?: string }> {
    try {
      const eventResult = await platformEventsClient.getEvent(objectId);
      
      if (eventResult.success && eventResult.event) {
        const event = eventResult.event;
        
        // Verify this is a tournament event
        if (Number((event as any)?.type) !== 0) { // EVENT_TYPE_TOURNAMENT = 0
          return {
            success: false,
            error: 'Object is not a tournament event',
          };
        }

        // Parse tournament metadata
        const metadata = event.metadata || {};
        const categoryU8 = metadata.category ?? 2; // Default to highestScore
        const category = this.u8ToCategory(categoryU8);
        const entryFeeTickets = metadata.entryFeeTickets ?? 1;
        const startingAnteUSDCents = metadata.startingAnteUSDCents ?? 0;
        const rewardToken = metadata.rewardToken || 'MEWS';
        const rewardConfig = metadata.rewardConfig || null;
        const hasCustomRewards = !!(rewardConfig && Object.keys(rewardConfig.itemRewards || {}).length > 0);

        // Prize pool from platform event metadata (game reads only from platform)
        const prizePoolUSDCents =
          metadata.prizePoolUSDCents !== undefined
            ? Number(metadata.prizePoolUSDCents)
            : startingAnteUSDCents;
        if (prizePoolUSDCents === startingAnteUSDCents && metadata.prizePoolUSDCents === undefined) {
          PlatformLogger.debug('Prize pool not in metadata, using starting ante only', {
            eventObjectId: objectId,
            startingAnteUSDCents,
          });
        }

        // Determine status
        const now = Date.now();
        let status: 'upcoming' | 'active' | 'ended';
        if (now < event.startTime) {
          status = 'upcoming';
        } else if (now <= event.endTime) {
          status = 'active';
        } else {
          status = 'ended';
        }

        PlatformLogger.info('🏆 [TOURNAMENT GET] Tournament retrieved via platform service', {
          tournamentId: event.eventId,
          objectId,
          name: event.name,
          category,
          participants: event.participantCount,
        });

        const poolVaultId = event.poolVault?.vaultId ?? (metadata.vaultId && typeof metadata.vaultId === 'string' ? metadata.vaultId : undefined);
        const poolVaultBalanceRaw = event.poolVault?.balanceRaw != null ? String(event.poolVault.balanceRaw) : (metadata.poolVaultBalanceRaw != null ? String(metadata.poolVaultBalanceRaw) : undefined);
        const poolVaultCoinTypeId = event.poolVault?.coinTypeId ?? (metadata.poolVaultCoinTypeId && typeof metadata.poolVaultCoinTypeId === 'string' ? metadata.poolVaultCoinTypeId : undefined);
        const ticketValueUSDCents = metadata.ticketValueUSDCents != null ? Number(metadata.ticketValueUSDCents) : undefined;
        const tournament: Tournament = {
          tournamentId: event.eventId,
          name: event.name,
          category,
          startTime: event.startTime,
          endTime: event.endTime,
          entryFeeTickets,
          ticketValueUSDCents,
          prizePoolUSDCents,
          participants: event.participantCount,
          status,
          createdAt: event.createdAt,
          objectId: event.objectId,
          rewardConfig,
          startingAnteUSDCents,
          rewardToken,
          createdBy: event.createdBy,
          creationFeePaid: event.createdBy && event.createdBy !== this.adminWallet.getAddress() ? PLAYER_CREATION_FEE_USD_CENTS : 0,
          creatorRewardUSDCents: 0,
          creatorRewardPaid: false,
          hasCustomRewards,
          poolVaultId,
          poolVaultBalanceRaw,
          poolVaultCoinTypeId,
        };

        return {
          success: true,
          tournament,
        };
      }

      // Platform-only: no chain fallback
      return {
        success: false,
        error: eventResult.error || 'Tournament not found',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get all tournaments a player has entered (platform only).
   * Returns tournament IDs (numeric) and object IDs so callers can fetch details via platform (getTournament(objectId)) without querying game contract events.
   */
  async getPlayerEnteredTournaments(
    playerAddress: string,
    options?: CallPlatformBackendOptions
  ): Promise<{ success: boolean; tournamentIds?: number[]; objectIds?: string[]; error?: string }> {
    try {
      const appId = getAppIdFromEnv() || this.config.server.appId || '';

      const eventsResult = await this.getEventsWithDedupe('active', options);

      if (!eventsResult.success || !eventsResult.events) {
        const err = eventsResult.error || 'Failed to get active events from platform';
        PlatformLogger.warn('getPlayerEnteredTournaments: platform events failed', { playerAddress, error: err });
        return { success: false, error: err };
      }

      const tournamentIds: number[] = [];
      const objectIds: string[] = [];
      const tournamentEvents = eventsResult.events.filter((e: { type?: number }) => e.type === 0);

      for (const event of tournamentEvents) {
        try {
          const entryKey = `entries:${event.objectId}`;
          const entriesResult = await this.getEventEntriesWithDedupe(entryKey, event.objectId, options);
          if (entriesResult.success && Array.isArray(entriesResult.entries)) {
            const playerLower = playerAddress.toLowerCase();
            const hasEntry = (entriesResult.entries as Array<Record<string, unknown>>).some((entry) => {
              const addr = this.addressFromStationEventEntry(
                entry as {
                  participantAddress?: string;
                  participant?: string;
                  address?: string;
                  playerAddress?: string;
                  entryData?: Record<string, unknown>;
                }
              );
              return addr.length > 0 && addr === playerLower;
            });
            if (hasEntry) {
              tournamentIds.push(event.eventId);
              objectIds.push(event.objectId);
            }
          }
        } catch (entryError) {
          PlatformLogger.warn('Error checking player entry for event', {
            eventId: event.eventId,
            playerAddress,
            error: entryError instanceof Error ? entryError.message : 'Unknown error',
          });
        }
      }

      PlatformLogger.info('🏆 [PLAYER ENTERED] Found tournaments player has entered', {
        playerAddress,
        tournamentIds,
        count: tournamentIds.length,
      });

      return {
        success: true,
        tournamentIds,
        objectIds,
      };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      PlatformLogger.error('Error getting player entered tournaments', { playerAddress, error: errMsg });
      return { success: false, error: errMsg };
    }
  }

  /**
   * Get full tournament details by object IDs (platform only).
   * Used by My Tournaments so we do not query Sonar by game package.
   */
  async getTournamentsByObjectIds(objectIds: string[]): Promise<Tournament[]> {
    if (objectIds.length === 0) return [];
    const results = await Promise.allSettled(objectIds.map((id) => this.getTournament(id)));
    const tournaments: Tournament[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.success && result.value.tournament) {
        tournaments.push(result.value.tournament);
      }
    }
    tournaments.sort((a, b) => b.endTime - a.endTime);
    return tournaments;
  }

  /**
   * Check if a player is a participant in a tournament
   * Uses this event's Station entries (GET api/station/:id/entries) — authoritative vs ticket burn alone.
   */
  async isPlayerParticipant(
    tournamentObjectId: string,
    playerAddress: string
  ): Promise<{ success: boolean; isParticipant: boolean; error?: string; enteredTournamentIds?: number[] }> {
    try {
      const tournament = await this.getTournament(tournamentObjectId);
      if (!tournament.success || !tournament.tournament) {
        return {
          success: false,
          isParticipant: false,
          error: 'Tournament not found',
        };
      }

      const tournamentId = tournament.tournament.tournamentId;
      const tournamentName = tournament.tournament.name;
      const playerLower = playerAddress.trim().toLowerCase();

      const entryKey = `entries:${tournamentObjectId}`;
      const entriesResult = await this.getEventEntriesWithDedupe(entryKey, tournamentObjectId);

      if (!entriesResult.success) {
        PlatformLogger.warn('🏆 [PARTICIPANT CHECK] Failed to load entries for event', {
          tournamentObjectId,
          tournamentId,
          playerAddress,
          error: entriesResult.error,
        });
        return {
          success: false,
          isParticipant: false,
          error: entriesResult.error || 'Failed to load tournament entries',
        };
      }

      const rows = entriesResult.entries ?? [];
      const isParticipant = rows.some((entry) => this.addressFromStationEventEntry(entry) === playerLower);

      let enteredTournamentIds: number[] = [];
      if (isParticipant) {
        enteredTournamentIds = [tournamentId];
      } else {
        const entered = await this.getPlayerEnteredTournaments(playerAddress);
        enteredTournamentIds = entered.tournamentIds ?? [];
      }

      if (isParticipant) {
        PlatformLogger.info('✅ [PARTICIPANT CHECK] Player IS tournament participant (matched Station entry row)', {
          tournamentObjectId,
          tournamentId,
          tournamentName,
          playerAddress,
          entryRowCount: rows.length,
        });
      } else {
        PlatformLogger.warn('❌ [PARTICIPANT CHECK] Player is NOT tournament participant', {
          tournamentObjectId,
          tournamentId,
          tournamentName,
          playerAddress,
          entryRowCount: rows.length,
          enteredTournamentIds,
        });
      }

      return {
        success: true,
        isParticipant,
        enteredTournamentIds,
      };
    } catch (error) {
      PlatformLogger.error('Error checking player participation', {
        tournamentObjectId,
        playerAddress,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        isParticipant: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get active and upcoming tournaments
   * Returns tournaments that are either currently active or upcoming (not yet started)
   * Uses platform EventService to query active events
   * Uses caching to reduce RPC calls and handle rate limits gracefully
   */
  async getActiveTournaments(forceRefresh = false): Promise<Tournament[]> {
    // Check cache first
    if (!forceRefresh && this._activeTournamentsCache && this._activeTournamentsCacheTimestamp) {
      const cacheAge = Date.now() - this._activeTournamentsCacheTimestamp;
      if (cacheAge < this._activeTournamentsCacheTTL) {
        PlatformLogger.debug('Returning cached active tournaments', {
          count: this._activeTournamentsCache.length,
          cacheAge,
        });
        return this._activeTournamentsCache;
      }
    }

    try {
      const appId = getAppIdFromEnv() || this.config.server.appId || '';

      // Station has separate upcoming vs active tables. Query both explicitly and merge.
      const [upcomingRes, activeRes] = await Promise.all([
        this.getEventsWithDedupe('upcoming'),
        this.getEventsWithDedupe('active'),
      ]);

      if (!upcomingRes.success || !activeRes.success) {
        const err = upcomingRes.error || activeRes.error || 'Failed to get events';
        PlatformLogger.warn('Failed to get upcoming/active events from platform service', { error: err });
        throw new PlatformError(PlatformErrorCode.PLATFORM_ERROR, err);
      }
      const upcomingTournaments = this.mapStationEventsToTournaments(upcomingRes.events ?? [], 'upcoming');
      const activeTournaments = this.mapStationEventsToTournaments(activeRes.events ?? [], 'active');
      const tournaments = [...upcomingTournaments, ...activeTournaments];

      // Update cache
      this._activeTournamentsCache = tournaments;
      this._activeTournamentsCacheTimestamp = Date.now();

      PlatformLogger.info('🏆 [TOURNAMENT GET ACTIVE] Retrieved active tournaments via platform service', {
        count: tournaments.length,
        appId,
      });

      return tournaments;
    } catch (error) {
      PlatformLogger.error('Error getting active tournaments', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Full platform wiring: no fallback to legacy game contract tables.
      throw error;
    }
  }

  /**
   * Map Station API events (type 0 = tournament) to Tournament[].
   * Used by getActiveTournaments, getUpcomingTournaments, and getActiveTournamentsOnly.
   */
  private mapStationEventsToTournaments(events: any[], assumedStatus?: 'upcoming' | 'active' | 'ended'): Tournament[] {
    const tournamentEvents = (events || []).filter((e: any) => Number((e as any)?.type) === 0); // EVENT_TYPE_TOURNAMENT = 0
    return tournamentEvents.map((event: any) => {
      const metadata = event.metadata || {};
      const categoryU8 = metadata.category ?? 2;
      const category = this.u8ToCategory(categoryU8);
      const entryFeeTickets = metadata.entryFeeTickets ?? 1;
      const startingAnteUSDCents = metadata.startingAnteUSDCents ?? 0;
      const rewardToken = metadata.rewardToken || 'MEWS';
      const rewardConfig = metadata.rewardConfig || null;
      const hasCustomRewards = !!(rewardConfig && Object.keys(rewardConfig.itemRewards || {}).length > 0);
      // IMPORTANT: Station has explicit tables (upcoming_events, active_events, past_events_*).
      // Prefer the table-driven classification (caller passes assumedStatus) over time-based self-filtering.
      const status: 'upcoming' | 'active' | 'ended' =
        assumedStatus ??
        (event?.statusLabel === 'upcoming' ? 'upcoming' : event?.statusLabel === 'active' ? 'active' : 'ended');
      const poolVaultId = event.poolVault?.vaultId ?? (metadata.vaultId && typeof metadata.vaultId === 'string' ? metadata.vaultId : undefined);
      const poolVaultBalanceRaw = event.poolVault?.balanceRaw != null ? String(event.poolVault.balanceRaw) : (metadata.poolVaultBalanceRaw != null ? String(metadata.poolVaultBalanceRaw) : undefined);
      const poolVaultCoinTypeId = event.poolVault?.coinTypeId ?? (metadata.poolVaultCoinTypeId && typeof metadata.poolVaultCoinTypeId === 'string' ? metadata.poolVaultCoinTypeId : undefined);
      const distributionStatus = event.rewardsDistributed === true ? DISTRIBUTION_COMPLETED : DISTRIBUTION_PENDING;
      return {
        tournamentId: event.eventId,
        name: event.name,
        category,
        startTime: event.startTime,
        endTime: event.endTime,
        entryFeeTickets,
        prizePoolUSDCents: startingAnteUSDCents,
        participants: event.participantCount,
        status,
        createdAt: event.createdAt,
        objectId: event.objectId,
        distributionStatus,
        rewardsDistributed: event.rewardsDistributed === true,
        rewardConfig,
        startingAnteUSDCents,
        rewardToken,
        createdBy: event.createdBy,
        creationFeePaid: event.createdBy && event.createdBy !== this.adminWallet.getAddress() ? PLAYER_CREATION_FEE_USD_CENTS : 0,
        creatorRewardUSDCents: 0,
        creatorRewardPaid: false,
        hasCustomRewards,
        poolVaultId,
        poolVaultBalanceRaw,
        poolVaultCoinTypeId,
      };
    });
  }

  /**
   * Get upcoming tournaments only (Station upcoming_events table).
   */
  async getUpcomingTournaments(_forceRefresh = false): Promise<Tournament[]> {
    const res = await this.getEventsWithDedupe('upcoming');
    if (!res.success) {
      throw new PlatformError(PlatformErrorCode.PLATFORM_ERROR, res.error ?? 'Failed to get upcoming events');
    }
    const tournaments = this.mapStationEventsToTournaments(res.events ?? [], 'upcoming');
    PlatformLogger.info('🏆 [TOURNAMENT GET UPCOMING] Retrieved upcoming tournaments via platform', { count: tournaments.length });
    return tournaments;
  }

  /**
   * Get active tournaments only (Station active_events table).
   */
  async getActiveTournamentsOnly(_forceRefresh = false): Promise<Tournament[]> {
    const res = await this.getEventsWithDedupe('active');
    if (!res.success) {
      throw new PlatformError(PlatformErrorCode.PLATFORM_ERROR, res.error ?? 'Failed to get active events');
    }
    const tournaments = this.mapStationEventsToTournaments(res.events ?? [], 'active');
    PlatformLogger.info('🏆 [TOURNAMENT GET ACTIVE ONLY] Retrieved active tournaments via platform', { count: tournaments.length });
    return tournaments;
  }

  /**
   * Clear the active tournaments cache (useful after creating a new tournament)
   */
  clearActiveTournamentsCache() {
    this._activeTournamentsCache = null;
    this._activeTournamentsCacheTimestamp = 0;
    PlatformLogger.debug('Cleared active tournaments cache');
  }

  private async getEventsWithDedupe(
    status: 'upcoming' | 'active',
    options?: CallPlatformBackendOptions
  ): Promise<{ success: boolean; events?: any[]; error?: string }> {
    const key = `events:${status}`;
    const inFlight = this._inFlightEventFetches.get(key);
    if (inFlight) return inFlight;
    const request = (status === 'upcoming'
      ? platformEventsClient.getUpcomingEvents(options)
      : platformEventsClient.getActiveEvents(options))
      .finally(() => {
        this._inFlightEventFetches.delete(key);
      });
    this._inFlightEventFetches.set(key, request);
    return request;
  }

  private async getEventEntriesWithDedupe(
    dedupeKey: string,
    eventObjectId: string,
    options?: CallPlatformBackendOptions
  ): Promise<{ success: boolean; entries?: Array<{ participantAddress?: string; enteredAt?: number; entryData?: Record<string, unknown>; participant?: string }>; error?: string }> {
    const inFlight = this._inFlightEventFetches.get(dedupeKey);
    if (inFlight) {
      const reused = await inFlight;
      return reused as unknown as { success: boolean; entries?: Array<{ participantAddress?: string; enteredAt?: number; entryData?: Record<string, unknown>; participant?: string }>; error?: string };
    }
    const request = platformEventsClient.getEventEntries(eventObjectId, options)
      .finally(() => {
        this._inFlightEventFetches.delete(dedupeKey);
      });
    this._inFlightEventFetches.set(dedupeKey, request as unknown as Promise<{ success: boolean; events?: any[]; error?: string }>);
    return request;
  }

  /**
   * Get past tournaments (ended tournaments).
   * Uses platform past_events only; Tide move-to-past keeps the platform in sync.
   */
  async getPastTournaments(limit: number = 50): Promise<Tournament[]> {
    try {
      const appId = getAppIdFromEnv() || this.config.server.appId || '';

      const mapToTournaments = (events: any[]): Tournament[] => {
        const tournamentEvents = (events || []).filter((e: any) => Number((e as any)?.type) === 0);
        return tournamentEvents.map((event: any) => {
          const metadata = event.metadata || {};
          const categoryU8 = metadata.category ?? 2;
          const category = this.u8ToCategory(categoryU8);
          const entryFeeTickets = metadata.entryFeeTickets ?? 1;
          const startingAnteUSDCents = metadata.startingAnteUSDCents ?? 0;
          const rewardToken = metadata.rewardToken || 'MEWS';
          const rewardConfig = metadata.rewardConfig || null;
          const hasCustomRewards = !!(rewardConfig && Object.keys(rewardConfig.itemRewards || {}).length > 0);
          const poolVaultId = event.poolVault?.vaultId ?? (metadata.vaultId && typeof metadata.vaultId === 'string' ? metadata.vaultId : undefined);
          const poolVaultBalanceRaw = event.poolVault?.balanceRaw != null ? String(event.poolVault.balanceRaw) : (metadata.poolVaultBalanceRaw != null ? String(metadata.poolVaultBalanceRaw) : undefined);
          const poolVaultCoinTypeId = event.poolVault?.coinTypeId ?? (metadata.poolVaultCoinTypeId && typeof metadata.poolVaultCoinTypeId === 'string' ? metadata.poolVaultCoinTypeId : undefined);
          const distributionStatus = event.rewardsDistributed === true ? DISTRIBUTION_COMPLETED : DISTRIBUTION_PENDING;
          return {
            tournamentId: event.eventId,
            name: event.name,
            category,
            startTime: event.startTime,
            endTime: event.endTime,
            entryFeeTickets,
            prizePoolUSDCents: startingAnteUSDCents,
            participants: event.participantCount,
            status: 'ended' as const,
            createdAt: event.createdAt,
            objectId: event.objectId,
            distributionStatus,
            rewardsDistributed: event.rewardsDistributed === true,
            rewardConfig,
            startingAnteUSDCents,
            rewardToken,
            createdBy: event.createdBy,
            creationFeePaid: event.createdBy && event.createdBy !== this.adminWallet.getAddress() ? PLAYER_CREATION_FEE_USD_CENTS : 0,
            creatorRewardUSDCents: 0,
            creatorRewardPaid: false,
            hasCustomRewards,
            poolVaultId,
            poolVaultBalanceRaw,
            poolVaultCoinTypeId,
          };
        });
      };

      const pastResult = await platformEventsClient.getPastEvents(limit);
      const pastList: Tournament[] = pastResult.success && Array.isArray(pastResult.events)
        ? mapToTournaments(pastResult.events)
        : [];

      pastList.sort((a, b) => b.endTime - a.endTime);
      const capped = pastList.slice(0, limit);
      PlatformLogger.info('🏆 [TOURNAMENT GET PAST] Retrieved past tournaments via platform', {
        count: capped.length,
        appId,
      });
      return capped;
    } catch (error) {
      PlatformLogger.error('Error getting past tournaments', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Move tournament (Station event) to past via platform Channel.
   * Uses station-move-event-to-past; no game-built tx.
   */
  async moveTournamentToPast(tournamentId: number): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const corridorAdminCapId = getCorridorAdminCapabilityObjectIdFromEnv();
      if (!corridorAdminCapId?.startsWith('0x')) {
        return {
          success: false,
          error: 'Corridor admin capability not configured (required for station-move-event-to-past)',
        };
      }

      const activeTournaments = await this.getActiveTournaments(true);
      const pastTournaments = await this.getPastTournaments(1000);
      const allTournaments = [...activeTournaments, ...pastTournaments];

      const tournament = allTournaments.find((t: any) => t.tournamentId === tournamentId);
      if (!tournament || !tournament.objectId) {
        return {
          success: false,
          error: `Tournament ${tournamentId} not found`,
        };
      }

      const buildRes = await buildBatchViaChannel(
        {
          operations: [
            {
              operationId: 'station-move-event-to-past',
              params: {
                eventId: tournament.objectId,
                corridorAdminCapId,
              },
            },
          ],
        },
        { corridorAdminCapabilityObjectId: corridorAdminCapId }
      );

      if (!buildRes.success || !buildRes.transactions?.length) {
        const err = buildRes.errors?.[0] ?? buildRes.error ?? 'Channel station-move-event-to-past failed';
        PlatformLogger.error('🏆 [TOURNAMENT SERVICE] Failed to build move-to-past tx', { tournamentId, error: err });
        return { success: false, error: err };
      }

      const adminWallet = getAdminWalletService();
      const txBase64 = buildRes.transactions[0];
      const signed = await adminWallet.getKeypair().signTransaction(Buffer.from(txBase64, 'base64'));
      const execRes = await platformTxClient.executeSigned(
        { transactionBytesBase64: txBase64, signature: signed.signature },
        { corridorAdminCapabilityObjectId: corridorAdminCapId }
      );

      if (!execRes.success) {
        PlatformLogger.error('🏆 [TOURNAMENT SERVICE] Failed to move tournament to past', {
          tournamentId,
          error: execRes.error,
        });
        return { success: false, error: execRes.error ?? 'Execute failed' };
      }

      this.clearActiveTournamentsCache();
      PlatformLogger.info('🏆 [TOURNAMENT SERVICE] Tournament moved to past via Channel', {
        tournamentId,
        digest: execRes.digest,
      });
      return { success: true };
    } catch (error) {
      PlatformLogger.error('🏆 [TOURNAMENT SERVICE] Error moving tournament to past', {
        tournamentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Enter tournament for a player (admin wallet pays gas)
   * This provides smooth UX where admin pays for gas fees
   * Uses platform tournament extension service
   */
  async enterTournamentForPlayer(
    playerAddress: string,
    tournamentObjectId: string,
    ticketId: number,
    appId?: string,
    options?: CallPlatformBackendOptions
  ): Promise<{ success: boolean; transactionDigest?: string; error?: string }> {
    try {
      PlatformLogger.info('🏆 [TOURNAMENT ENTRY] Starting tournament entry via platform backend API', {
        playerAddress,
        tournamentObjectId,
        ticketId,
        appId: appId || this.config.server.appId,
      });

      // Ticket value comes from Reservoir (by ticket ID). Fetch before enter — the ticket is consumed on enter.
      let ticketValueCents = 100;
      const ticketUnitsRes = await platformGamePassClient.getAvailableTicketUnits(playerAddress, options);
      if (ticketUnitsRes.success && Array.isArray(ticketUnitsRes.tickets)) {
        const ticket = ticketUnitsRes.tickets.find((u) => u.ticketId === ticketId);
        if (ticket != null && typeof ticket.valuePaidUsdCents === 'number' && ticket.valuePaidUsdCents >= 0) {
          ticketValueCents = ticket.valuePaidUsdCents;
        }
      }

      // Enter tournament via platform backend API (SaaS pattern)
      const result = await platformTournamentClient.enterTournament(
        { tournamentObjectId, playerAddress, ticketId },
        options
      );

      if (!result.success) {
        PlatformLogger.error('🏆 [TOURNAMENT ENTRY] Failed to enter tournament', {
          playerAddress,
          tournamentObjectId,
          ticketId,
          error: result.error,
        });
        return {
          success: false,
          error: result.error || 'Failed to enter tournament',
        };
      }

      // Add ticket value (from Reservoir) to the vault and record on-chain per participant.
      const tournamentResult = await this.getTournament(tournamentObjectId);
      if (tournamentResult.success && tournamentResult.tournament?.poolVaultId && tournamentResult.tournament.poolVaultCoinTypeId && tournamentResult.tournament.rewardToken) {
        const t = tournamentResult.tournament;
        // Use tournament default if we didn't find the ticket (e.g. race or missing metadata).
        const cents = ticketValueCents !== 100 ? ticketValueCents : (t.ticketValueUSDCents ?? 100);
        const totalCents = cents * t.entryFeeTickets;
        const usdDollars = totalCents / 100;
        const conversion = await priceConverter.convertUSDToToken(usdDollars, t.rewardToken ?? 'SUI');
        const corridorAdminCapId = (options as CallPlatformBackendOptions)?.corridorAdminCapabilityObjectId ?? getCorridorAdminCapabilityObjectIdFromEnv();
        if (conversion.success && conversion.tokenAmount && BigInt(conversion.tokenAmount) > 0n && corridorAdminCapId?.startsWith('0x')) {
          try {
            const { buildBatchViaChannel, platformTxClient } = await import('@/lib/services/platform/client/platform-client');
            const addToPoolBuild = await buildBatchViaChannel(
              {
                operations: [
                  {
                    operationId: 'events-add-to-pool',
                    params: {
                      eventId: tournamentObjectId,
                      amountRaw: conversion.tokenAmount,
                      coinTypeId: t.poolVaultCoinTypeId,
                      senderAddress: this.adminWallet.getAddress(),
                      participantAddress: playerAddress,
                      corridorAdminCapId,
                    },
                  },
                ],
              },
              options
            );
            if (addToPoolBuild.success && addToPoolBuild.transactions?.[0]) {
              const txBase64 = addToPoolBuild.transactions[0];
              const txBytes = Buffer.from(txBase64, 'base64');
              const signed = await this.adminWallet.getKeypair().signTransaction(txBytes);
              const execRes = await platformTxClient.executeSigned(
                { transactionBytesBase64: txBase64, signature: signed.signature },
                options
              );
              if (execRes.success) {
                PlatformLogger.info('🏆 [TOURNAMENT ENTRY] Ticket value added to pool', {
                  tournamentObjectId,
                  amountRaw: conversion.tokenAmount,
                  digest: execRes.digest,
                });
              } else {
                PlatformLogger.warn('🏆 [TOURNAMENT ENTRY] Add to pool failed (entry still succeeded)', {
                  tournamentObjectId,
                  error: execRes.error,
                });
              }
            } else {
              PlatformLogger.warn('🏆 [TOURNAMENT ENTRY] Add to pool build failed (entry still succeeded)', {
                tournamentObjectId,
                error: addToPoolBuild.errors?.[0] ?? addToPoolBuild.error,
              });
            }
          } catch (poolErr) {
            PlatformLogger.warn('🏆 [TOURNAMENT ENTRY] Add to pool error (entry still succeeded)', {
              tournamentObjectId,
              error: poolErr instanceof Error ? poolErr.message : String(poolErr),
            });
          }
        } else if (!corridorAdminCapId?.startsWith('0x')) {
          PlatformLogger.warn('🏆 [TOURNAMENT ENTRY] Skipping add-to-pool: corridor admin cap not configured');
        }
      }

      PlatformLogger.info('🏆 [TOURNAMENT ENTRY] Tournament entry successful', {
        playerAddress,
        tournamentObjectId,
        ticketId,
        transactionDigest: result.digest,
      });

      return {
        success: true,
        transactionDigest: result.digest,
      };
    } catch (error) {
      PlatformLogger.error('🏆 [TOURNAMENT ENTRY] Exception during tournament entry', {
        playerAddress,
        tournamentObjectId,
        ticketId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get tournament leaderboard
   * Uses platform EventService to read submissions from event
   */
  async getTournamentLeaderboard(
    tournamentObjectId: string,
    limit: number = 100
  ): Promise<{ success: boolean; leaderboard?: LeaderboardEntry[]; error?: string }> {
    try {
      PlatformLogger.info('🏆 [LEADERBOARD SERVICE] Starting leaderboard fetch via platform service', {
        tournamentObjectId,
        limit,
      });

      // Get tournament to extract category
      const tournament = await this.getTournament(tournamentObjectId);
      if (!tournament.success || !tournament.tournament) {
        PlatformLogger.error('🏆 [LEADERBOARD SERVICE] Tournament not found', {
          tournamentObjectId,
          error: tournament.error,
        });
        return {
          success: false,
          error: 'Tournament not found',
        };
      }

      const tournamentCategory = tournament.tournament.category;
      const tournamentId = tournament.tournament.tournamentId;
      const tournamentName = tournament.tournament.name;

      PlatformLogger.info('🏆 [LEADERBOARD SERVICE] Tournament details', {
        tournamentObjectId,
        tournamentId,
        tournamentName,
        category: tournamentCategory,
      });

      // Try to get submissions from event service (new platform system)
      const submissionsResult = await platformEventsClient.getSubmissions(tournamentObjectId);
      
      if (submissionsResult.success && submissionsResult.submissions) {
        PlatformLogger.info('🏆 [LEADERBOARD SERVICE] Reading leaderboard from event submissions', {
          tournamentObjectId,
          tournamentId,
          submissionCount: submissionsResult.submissions.length,
        });

        // Parse submissions and build leaderboard
        const submissionMap = new Map<string, {
          value: number;
          playerName: string;
          submission: any;
          submittedAt: number;
        }>();

        for (const submission of submissionsResult.submissions) {
          try {
            const submissionData = submission.submissionData;
            if (!submissionData || typeof submissionData !== 'object') {
              continue;
            }

            // Extract category value based on tournament category
            let categoryValue = 0;
            const categoryMap: Record<string, keyof typeof submissionData> = {
              'totalCoins': 'coins',
              'longestStreak': 'longestCoinStreak',
              'highestScore': 'score',
              'longestDistance': 'distance',
              'mostBosses': 'bossesDefeated',
              'mostEnemies': 'enemiesDefeated',
            };

            const valueKey = categoryMap[tournamentCategory];
            if (valueKey && submissionData[valueKey] !== undefined) {
              categoryValue = Number(submissionData[valueKey]) || 0;
            } else if (submissionData.value !== undefined) {
              // Regatta submit-score always includes `value` (category value). Some clients omit the
              // denormalized fields (score/distance/coins/...) and only send `value`.
              categoryValue = Number(submissionData.value) || 0;
            }

            const playerName = typeof submissionData.playerName === 'string' ? submissionData.playerName : '';
            const existing = submissionMap.get(submission.participant.toLowerCase());

            // Debug: log the first few submissions so we can confirm on-chain payload shape.
            if (submissionMap.size < 3) {
              PlatformLogger.info('🏆 [LEADERBOARD SERVICE] Submission sample', {
                tournamentObjectId,
                participant: submission.participant,
                tournamentCategory,
                valueKey,
                categoryValue,
                raw: {
                  value: (submissionData as any).value,
                  score: (submissionData as any).score,
                  distance: (submissionData as any).distance,
                  coins: (submissionData as any).coins,
                  bossesDefeated: (submissionData as any).bossesDefeated,
                  enemiesDefeated: (submissionData as any).enemiesDefeated,
                  longestCoinStreak: (submissionData as any).longestCoinStreak,
                  keys: Object.keys(submissionData as Record<string, unknown>).slice(0, 30),
                },
              });
            }

            // Keep the best submission (highest value for this category)
            if (!existing || categoryValue > existing.value) {
              submissionMap.set(submission.participant.toLowerCase(), {
                value: categoryValue,
                playerName,
                submission: submissionData,
                submittedAt: submission.submittedAt ?? 0,
              });
            }
          } catch (parseError) {
            PlatformLogger.warn('Failed to parse submission data', {
              tournamentObjectId,
              participant: submission.participant,
              error: parseError instanceof Error ? parseError.message : 'Unknown error',
            });
          }
        }

        // Convert to leaderboard entries and sort (include submission for tie-breaking only)
        const withSubmission = Array.from(submissionMap.entries())
          .map(([address, data]) => ({
            rank: 0,
            playerAddress: address,
            playerName: data.playerName || undefined,
            value: data.value,
            displayValue: this.formatCategoryValue(tournamentCategory, data.value),
            submission: data.submission as Record<string, unknown>,
          }))
          .sort((a, b) => {
            if (b.value !== a.value) return b.value - a.value;
            return this.tieBreakSubmissions(tournamentCategory, a.submission || {}, b.submission || {});
          });
        const leaderboardEntries: LeaderboardEntry[] = withSubmission
          .map((entry, index) => ({
            rank: index + 1,
            playerAddress: entry.playerAddress,
            playerName: entry.playerName,
            value: entry.value,
            displayValue: entry.displayValue,
          }))
          .slice(0, limit);

        PlatformLogger.info('🏆 [LEADERBOARD SERVICE] Leaderboard built from event submissions', {
          tournamentObjectId,
          tournamentId,
          entryCount: leaderboardEntries.length,
        });

        return {
          success: true,
          leaderboard: leaderboardEntries,
        };
      }

      // Platform-only: no chain fallback
      return {
        success: false,
        error: submissionsResult.error || 'Failed to get leaderboard from platform',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Format category value for display
   */
  private formatCategoryValue(category: Tournament['category'], value: number): string {
    return value.toLocaleString();
  }

  /**
   * Tie-break submissions based on category
   */
  private tieBreakSubmissions(
    category: Tournament['category'],
    submissionA: Record<string, any>,
    submissionB: Record<string, any>
  ): number {
    const getStat = (submission: Record<string, any>, key: string): number => {
      return Number(submission[key]) || 0;
    };

    switch (category) {
      case 'longestStreak':
        // Primary: longestCoinStreak (already compared), Secondary: coins, Tertiary: score
        const coinsA = getStat(submissionA, 'coins');
        const coinsB = getStat(submissionB, 'coins');
        if (coinsB !== coinsA) return coinsB - coinsA;
        const scoreA = getStat(submissionA, 'score');
        const scoreB = getStat(submissionB, 'score');
        return scoreB - scoreA;

      case 'totalCoins':
        // Primary: coins (already compared), Secondary: score, Tertiary: distance
        const scoreA2 = getStat(submissionA, 'score');
        const scoreB2 = getStat(submissionB, 'score');
        if (scoreB2 !== scoreA2) return scoreB2 - scoreA2;
        const distA = getStat(submissionA, 'distance');
        const distB = getStat(submissionB, 'distance');
        return distB - distA;

      case 'highestScore':
        // Primary: score (already compared), Secondary: coins, Tertiary: distance
        const coinsA3 = getStat(submissionA, 'coins');
        const coinsB3 = getStat(submissionB, 'coins');
        if (coinsB3 !== coinsA3) return coinsB3 - coinsA3;
        const distA2 = getStat(submissionA, 'distance');
        const distB2 = getStat(submissionB, 'distance');
        return distB2 - distA2;

      case 'longestDistance':
        // Primary: distance (already compared), Secondary: score, Tertiary: enemiesDefeated
        const scoreA3 = getStat(submissionA, 'score');
        const scoreB3 = getStat(submissionB, 'score');
        if (scoreB3 !== scoreA3) return scoreB3 - scoreA3;
        const enemiesA = getStat(submissionA, 'enemiesDefeated');
        const enemiesB = getStat(submissionB, 'enemiesDefeated');
        return enemiesB - enemiesA;

      case 'mostBosses':
        // Primary: bossesDefeated (already compared), Secondary: score, Tertiary: enemiesDefeated
        const scoreA4 = getStat(submissionA, 'score');
        const scoreB4 = getStat(submissionB, 'score');
        if (scoreB4 !== scoreA4) return scoreB4 - scoreA4;
        const enemiesA2 = getStat(submissionA, 'enemiesDefeated');
        const enemiesB2 = getStat(submissionB, 'enemiesDefeated');
        return enemiesB2 - enemiesA2;

      case 'mostEnemies':
        // Primary: enemiesDefeated (already compared), Secondary: score, Tertiary: bossesDefeated
        const scoreA5 = getStat(submissionA, 'score');
        const scoreB5 = getStat(submissionB, 'score');
        if (scoreB5 !== scoreA5) return scoreB5 - scoreA5;
        const bossesA = getStat(submissionA, 'bossesDefeated');
        const bossesB = getStat(submissionB, 'bossesDefeated');
        return bossesB - bossesA;

      default:
        return 0;
    }
  }

  /**
   * Get tie-breaking strategy description for a category
   */
  private getTieBreakingStrategyDescription(category: Tournament['category']): string {
    switch (category) {
      case 'longestStreak':
        return 'Primary: longest_coin_streak, Secondary: total_coins, Tertiary: score';
      case 'totalCoins':
        return 'Primary: coins, Secondary: score, Tertiary: distance';
      case 'highestScore':
        return 'Primary: score, Secondary: coins, Tertiary: distance';
      case 'longestDistance':
        return 'Primary: distance, Secondary: score, Tertiary: enemies_defeated';
      case 'mostBosses':
        return 'Primary: bosses_defeated, Secondary: score, Tertiary: enemies_defeated';
      case 'mostEnemies':
        return 'Primary: enemies_defeated, Secondary: score, Tertiary: bosses_defeated';
      default:
        return 'Primary: category value, Secondary: timestamp (earliest wins)';
    }
  }

  /**
   * Create tournament via platform Channel: build (regatta-create-tournament-by-user) + sign with app cap + execute via channel.
   * Uses the application's CorridorCap and admin wallet; transaction is submitted through the channel (POST /api/channel/execute).
   * createdBy is set to playerAddress for attribution; the app pays gas and fees.
   *
   * @param config - name, category, startTime, endTime, entryFeeTickets, rewardConfig?, startingAnteUSDCents, startingAnteToken?
   * @param paymentConfig - playerAddress (used as createdBy), paymentToken (for creation fee / ante token)
   * @returns success, digest, appCreationFeeUsdCents; no transaction bytes (execution is server-side via channel)
   */
  async createTournamentViaPlatformChannel(
    config: {
      name: string;
      category: Tournament['category'];
      startTime: number;
      endTime: number;
      entryFeeTickets: number;
      rewardConfig?: RewardCostConfig | null;
      startingAnteUSDCents: number;
      startingAnteToken?: PaymentToken;
    },
    paymentConfig: {
      playerAddress: string;
      paymentToken: PaymentToken;
    }
  ): Promise<{
    success: boolean;
    digest?: string;
    appCreationFeeUsdCents?: number;
    error?: string;
  }> {
    const appCapId = getCorridorCapabilityObjectIdFromEnv();
    if (!appCapId?.startsWith('0x')) {
      return { success: false, error: 'Application CorridorCap not configured (CORRIDOR_CAPABILITY_OBJECT_ID_*).' };
    }
    const senderAddress = this.adminWallet.getAddress();
    try {
      // Product rule: players can pay app fees in any supported token, but tournament vault/reward
      // token is always MEWS in game-created flow.
      const anteToken: PaymentToken = 'MEWS';
      const anteUSD = config.startingAnteUSDCents / 100;
      const tokenConversion = await priceConverter.convertUSDToToken(anteUSD, anteToken);
      if (!tokenConversion.success || !tokenConversion.tokenAmount) {
        return {
          success: false,
          error: tokenConversion.error || 'Failed to convert ante USD to token amount',
        };
      }
      const startingAnteAmountRaw = tokenConversion.tokenAmount;

      let rewardConfigForPlatform: {
        rewardDepth: number;
        poolDepth: number;
        poolDistribution: number[];
        poolSource: number;
        itemRewards: Record<string | number, unknown>;
      };
      const hasCustomRewards = config.rewardConfig && Object.keys(config.rewardConfig.itemRewards || {}).length > 0;
      if (hasCustomRewards && config.rewardConfig) {
        const ir = config.rewardConfig.itemRewards;
        const itemRewards = ir instanceof Map ? Object.fromEntries(ir) : (ir ?? {});
        rewardConfigForPlatform = {
          rewardDepth: config.rewardConfig.rewardDepth,
          poolDepth: config.rewardConfig.poolDepth,
          poolDistribution: config.rewardConfig.poolDistribution ?? [50, 30, 20],
          poolSource: config.rewardConfig.poolSource ?? 0,
          itemRewards,
        };
      } else {
        const defaultRewardConfig = await this.getDefaultRewardConfig();
        rewardConfigForPlatform = {
          rewardDepth: defaultRewardConfig.rewardDepth,
          poolDepth: defaultRewardConfig.poolDepth,
          poolDistribution: defaultRewardConfig.poolDistribution,
          poolSource: defaultRewardConfig.poolSource,
          itemRewards: defaultRewardConfig.itemRewards ?? {},
        };
      }

      const rewardToken: PaymentToken = 'MEWS';
      const categoryNumber = this.categoryToU8(config.category);
      const opts = buildPlatformCallOptions();

      const gameConfigResult = await getGameConfigService().getConfig();
      const appCreationFeeUsdCents =
        gameConfigResult.success && gameConfigResult.config?.tournamentCreationFeeUsdCents != null
          ? gameConfigResult.config.tournamentCreationFeeUsdCents
          : PLAYER_CREATION_FEE_USD_CENTS;

      // Use CorridorCap path (by_cap) for tournament create: platform calls create_tournament_event_corridor_by_cap
      // and create_glacier_vault_by_cap. Do not send corridorAdminCapabilityObjectId here to avoid TypeMismatch
      // on arg 0 (admin-cap path still fails despite cap type matching package; by_cap works with same signer).
      const createOpParams = {
        senderAddress,
        corridorCapabilityObjectId: appCapId,
        name: config.name.trim(),
        category: categoryNumber,
        categoryLabel: config.category,
        startTime: config.startTime,
        endTime: config.endTime,
        entryFeeTickets: config.entryFeeTickets,
        ticketValueUSDCents: 100,
        startingAnteUSDCents: config.startingAnteUSDCents,
        startingAnteAmountRaw,
        rewardToken,
        rewardConfig: rewardConfigForPlatform,
        createdBy: paymentConfig.playerAddress,
        competitionType: 'all-vs-all',
        participationMode: 'individual',
        appCreationFeeUSDCents: appCreationFeeUsdCents,
        appPaymentAddress: senderAddress,
        appCreationFeeToken: paymentConfig.paymentToken,
      };

      let buildRes = await buildBatchViaChannel(
        {
          operations: [{ operationId: 'regatta-create-tournament-by-user', params: createOpParams }],
        },
        opts
      );

      if (!buildRes.success) {
        const errMsg = buildRes.error ?? buildRes.errors?.[0] ?? '';
        if (typeof errMsg === 'string' && errMsg.includes('Fragmented wallet')) {
          const mergeBuild = await buildBatchViaChannel(
            {
              operations: [{ operationId: 'merge-sui-coins', params: { senderAddress } }],
            },
            opts
          );
          if (mergeBuild.success && mergeBuild.transactions?.[0]) {
            const mergeExec = await signAndExecuteSigned({
              keypair: this.adminWallet.getKeypair(),
              transactionBytesBase64: mergeBuild.transactions[0],
              options: opts,
            });
            if (mergeExec.success) {
              buildRes = await buildBatchViaChannel(
                {
                  operations: [{ operationId: 'regatta-create-tournament-by-user', params: createOpParams }],
                },
                opts
              );
            }
          }
        }
      }

      if (!buildRes.success) {
        return {
          success: false,
          error: buildRes.error ?? buildRes.errors?.[0] ?? 'Platform build failed',
        };
      }
      const transaction = buildRes.transactions?.[0];
      if (!transaction) {
        return {
          success: false,
          error: buildRes.errors?.[0] ?? 'No transaction returned from platform',
        };
      }

      const execRes = await signAndExecuteSigned({
        keypair: this.adminWallet.getKeypair(),
        transactionBytesBase64: transaction,
        options: opts,
      });

      if (!execRes.success) {
        return {
          success: false,
          error: execRes.error ?? 'Channel execute failed',
          appCreationFeeUsdCents,
        };
      }
      PlatformLogger.info('🏆 [TOURNAMENT CREATE] Tournament created via channel', {
        digest: execRes.digest,
        createdBy: paymentConfig.playerAddress,
        tournamentName: config.name,
      });
      return {
        success: true,
        digest: execRes.digest,
        appCreationFeeUsdCents,
      };
    } catch (error) {
      PlatformLogger.error('🏆 [TOURNAMENT CREATE] Channel create error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get player's rank in tournament
   * First checks if player is a participant, then gets their leaderboard rank
   */
  async getPlayerRank(
    tournamentObjectId: string,
    playerAddress: string
  ): Promise<{ success: boolean; rank?: number | null; value?: number; totalParticipants?: number; error?: string }> {
    try {
      // First, verify player is a participant
      const participationCheck = await this.isPlayerParticipant(tournamentObjectId, playerAddress);
      
      if (!participationCheck.success) {
        return {
          success: false,
          error: participationCheck.error || 'Failed to check participation',
        };
      }

      if (!participationCheck.isParticipant) {
        // Player is not a participant - return null rank
        return {
          success: true,
          rank: null,
          value: 0,
          totalParticipants: 0,
        };
      }

      // Player is a participant - get their leaderboard rank
      const leaderboardResult = await this.getTournamentLeaderboard(tournamentObjectId, 1000);
      
      if (!leaderboardResult.success || !leaderboardResult.leaderboard) {
        // Player is a participant but hasn't submitted a score yet
        // Return success with null rank (they're entered but have no score)
        return {
          success: true,
          rank: null,
          value: 0,
          totalParticipants: leaderboardResult.leaderboard?.length || 0,
        };
      }

      const leaderboard = leaderboardResult.leaderboard;
      const playerEntry = leaderboard.find(
        entry => entry.playerAddress.toLowerCase() === playerAddress.toLowerCase()
      );

      // Total participants from platform event (game gets data only from platform)
      const tournamentResult = await this.getTournament(tournamentObjectId);
      const totalParticipants =
        tournamentResult.success && tournamentResult.tournament?.participants != null
          ? tournamentResult.tournament.participants
          : leaderboard.length;

      return {
        success: true,
        rank: playerEntry?.rank ?? null, // null if they haven't submitted a score yet
        value: playerEntry?.value ?? 0,
        totalParticipants: totalParticipants > 0 ? totalParticipants : leaderboard.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Singleton instance
let tournamentServiceInstance: TournamentService | null = null;

export function getTournamentService(): TournamentService {
  if (!tournamentServiceInstance) {
    tournamentServiceInstance = new TournamentService();
  }
  return tournamentServiceInstance;
}

