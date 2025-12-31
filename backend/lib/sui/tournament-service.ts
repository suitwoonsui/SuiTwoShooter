// ==========================================
// Tournament Service - Handles tournament blockchain operations
// ==========================================

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { getConfig } from '@/config/config';
import { getAdminWalletService } from './admin-wallet-service';
import { BadgeLogger } from './badge-logger';
import { createPaymentTransactionBuilder, PaymentToken } from './payment-transaction-builder';
import { priceConverter } from '../services/price-converter';
import { calculateRewardCost, calculateTotalPayment, TournamentRewardConfig as RewardCostConfig } from '../services/reward-cost-calculator';
import { checkBalanceBeforeTransaction } from './balance-checker';

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
export class TournamentService {
  private client: SuiClient;
  private config: ReturnType<typeof getConfig>;
  private adminWallet: ReturnType<typeof getAdminWalletService>;
  
  // Cache for active tournaments to reduce RPC calls
  private _activeTournamentsCache: Tournament[] | null = null;
  private _activeTournamentsCacheTimestamp: number = 0;
  private readonly _activeTournamentsCacheTTL = 30000; // 30 seconds

  constructor() {
    this.config = getConfig();
    
    // Initialize Sui client
    const network = this.config.sui.network;
    const rpcUrl = network === 'testnet' 
      ? getFullnodeUrl('testnet')
      : network === 'mainnet'
      ? getFullnodeUrl('mainnet')
      : this.config.sui.rpcUrl;

    this.client = new SuiClient({ url: rpcUrl });
    this.adminWallet = getAdminWalletService();
  }

  /**
   * Convert item ID string to u8 (matching Move contract constants)
   */
  private itemIdToU8(itemId: string): number {
    const itemIdMap: Record<string, number> = {
      'orbLevel': 0,
      'forceField': 1,
      'extraLives': 2,
      'slowTime': 3,
      'coinTractorBeam': 4,
      'destroyAll': 5,
      'bossKillShot': 6,
      'random': 255, // Special value - resolved to random L1 item at distribution time
    };
    
    const value = itemIdMap[itemId];
    if (value === undefined) {
      BadgeLogger.warn('🏆 [TOURNAMENT CREATE] Unknown item ID, defaulting to 0', { itemId });
      return 0;
    }
    return value;
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

  /**
   * Get default reward config structure
   * Loads from admin-configured defaults (stored in file) or uses system defaults
   */
  private async getDefaultRewardConfig(): Promise<{
    rewardDepth: number;
    poolDepth: number;
    poolDistribution: number[];
    poolSource: number;
    itemRewards: Record<number, Array<{ itemId: string; level: number; quantity: number }>>;
  }> {
    // Check cache
    const now = Date.now();
    if (this._defaultRewardConfigCache.config && 
        (now - this._defaultRewardConfigCache.timestamp) < this._defaultRewardConfigCacheTTL) {
      return this._defaultRewardConfigCache.config;
    }

    try {
      // Try to load from admin-configured defaults
      const configUrl = process.env.API_BASE_URL || 'http://localhost:3000';
      const response = await fetch(`${configUrl}/api/admin/tournaments/default-rewards`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.config) {
          // Cache the config
          this._defaultRewardConfigCache = {
            config: data.config,
            timestamp: now,
          };
          BadgeLogger.info('⚙️ [DEFAULT REWARDS] Loaded admin-configured default rewards');
          return data.config;
        }
      }
    } catch (error) {
      BadgeLogger.warn('⚙️ [DEFAULT REWARDS] Failed to load admin-configured defaults, using system defaults', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Fall back to system defaults based on documented reward structure
    // 1st: Destroy All + Boss Kill Shot + Random L1
    // 2nd: Boss Kill Shot + Random L1
    // 3rd: Destroy All + Random L1
    // 4th-10th: Random L1 each
    // "random" is resolved at distribution time to a random basic L1 item
    const itemRewards: Record<number, Array<{ itemId: string; level: number; quantity: number }>> = {
      1: [
        { itemId: 'destroyAll', level: 1, quantity: 1 },
        { itemId: 'bossKillShot', level: 1, quantity: 1 },
        { itemId: 'random', level: 1, quantity: 1 },
      ],
      2: [
        { itemId: 'bossKillShot', level: 1, quantity: 1 },
        { itemId: 'random', level: 1, quantity: 1 },
      ],
      3: [
        { itemId: 'destroyAll', level: 1, quantity: 1 },
        { itemId: 'random', level: 1, quantity: 1 },
      ],
      4: [{ itemId: 'random', level: 1, quantity: 1 }],
      5: [{ itemId: 'random', level: 1, quantity: 1 }],
      6: [{ itemId: 'random', level: 1, quantity: 1 }],
      7: [{ itemId: 'random', level: 1, quantity: 1 }],
      8: [{ itemId: 'random', level: 1, quantity: 1 }],
      9: [{ itemId: 'random', level: 1, quantity: 1 }],
      10: [{ itemId: 'random', level: 1, quantity: 1 }],
    };

    const systemDefaults = {
      rewardDepth: 10,
      poolDepth: 3,
      poolDistribution: [50, 30, 20],
      poolSource: 0, // Prize Pool
      itemRewards,
    };

    // Cache system defaults
    this._defaultRewardConfigCache = {
      config: systemDefaults,
      timestamp: now,
    };

    BadgeLogger.info('⚙️ [DEFAULT REWARDS] Using system default rewards');
    return systemDefaults;
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
   * Get tournament registry object ID
   */
  private getTournamentRegistryId(): string {
    return this.config.contracts.tournamentRegistry || '';
  }

  /**
   * Get tournament admin capability object ID
   */
  private getTournamentAdminCapId(): string {
    return this.config.contracts.tournamentAdminCap || '';
  }

  /**
   * Get package ID
   * Tournaments are in the same package as the game score contract
   */
  private getPackageId(): string {
    const contractAddress = this.config.contracts.gameScore || '';
    if (!contractAddress) {
      throw new Error('Game score contract not configured');
    }
    return contractAddress.includes('::') 
      ? contractAddress.split('::')[0]
      : contractAddress;
  }

  /**
   * Get game pass system object ID
   */
  private getGamePassSystemId(): string {
    return this.config.contracts.gamePassSystem || '';
  }

  /**
   * Create a new tournament (admin-only)
   * Supports custom rewards and starting ante
   */
  async createTournament(config: {
    name: string;
    category: Tournament['category'];
    startTime: number;  // Unix timestamp (milliseconds)
    endTime: number;    // Unix timestamp (milliseconds)
    entryFeeTickets: number;   // Number of tournament tickets required (typically 1)
    rewardConfig?: RewardCostConfig | null;  // Optional custom reward config (null = default rewards)
    startingAnteUSDCents?: number;  // Optional starting ante (default: 0)
    rewardToken?: 'SUI' | 'MEWS' | 'USDC';  // Token type for reward distribution (default: MEWS)
  }): Promise<{ success: boolean; tournament?: Tournament; error?: string }> {
    try {
      const packageId = this.getPackageId();
      const registryId = this.getTournamentRegistryId();
      const adminCapId = this.getTournamentAdminCapId();

      if (!registryId || !adminCapId) {
        return {
          success: false,
          error: 'Tournament registry or admin capability not configured',
        };
      }

      // Get the appropriate client based on network
      const client = this.config.sui.network === 'testnet'
        ? this.adminWallet.getTestnetClient()
        : this.adminWallet.getMainnetClient();

      // Tournament creation is a complex operation, use higher gas budget
      // Base gas budget + extra for reward config operations
      const baseGasBudget = this.config.sui.gasBudget;
      const hasCustomRewards = config.rewardConfig && Object.keys(config.rewardConfig.itemRewards || {}).length > 0;
      const gasBudget = hasCustomRewards 
        ? Math.max(baseGasBudget * 3, baseGasBudget + 20_000_000) // 3x base or base + 0.02 SUI for custom rewards
        : Math.max(baseGasBudget * 2, baseGasBudget + 10_000_000); // 2x base or base + 0.01 SUI for default rewards

      // Check admin wallet balance before building transaction
      try {
        await checkBalanceBeforeTransaction({
          client,
          walletAddress: this.adminWallet.getAddress(),
          gasBudget,
          buffer: 100_000_000, // 0.1 SUI buffer
          context: 'create tournament',
        });
      } catch (error: any) {
        BadgeLogger.error('🏆 [TOURNAMENT CREATE] Insufficient balance for gas', {
          error: error.message,
          gasBudget,
          requiredSUI: (gasBudget / 1_000_000_000).toFixed(4),
        });
        return {
          success: false,
          error: error.message || `Insufficient SUI balance. Tournament creation requires approximately ${(gasBudget / 1_000_000_000).toFixed(4)} SUI for gas fees. Please ensure the admin wallet has sufficient SUI balance.`,
        };
      }

      // Build transaction
      const txb = new Transaction();
      
      // Convert name to vector<u8>
      const nameBytes = new TextEncoder().encode(config.name);
      
      // Debug: Log the name being encoded
      BadgeLogger.info('🏆 [TOURNAMENT CREATE] Encoding tournament name', {
        originalName: config.name,
        nameLength: config.name.length,
        encodedBytes: Array.from(nameBytes),
        encodedLength: nameBytes.length,
      });
      
      // Prepare reward config
      const startingAnteUSDCents = config.startingAnteUSDCents || 0;
      
      // Check if custom reward config is provided
      if (config.rewardConfig && Object.keys(config.rewardConfig.itemRewards || {}).length > 0) {
        // Use helper function that accepts reward config components separately
        // Convert itemRewards from Record<number, ItemReward[]> to parallel vectors
        const itemRewards = config.rewardConfig.itemRewards;
        const ranks: number[] = [];
        const itemIds: number[] = [];
        const levels: number[] = [];
        const quantities: number[] = [];
        
        // Convert itemRewards to parallel vectors
        // itemRewards can be Map<number, ItemReward[]> or Record<number, ItemReward[]>
        const itemRewardsRecord = itemRewards instanceof Map 
          ? Object.fromEntries(itemRewards)
          : itemRewards;
        
        // Sort by rank to ensure items for same rank are consecutive
        const sortedRanks = Object.keys(itemRewardsRecord)
          .map(Number)
          .sort((a, b) => a - b);
        
        for (const rank of sortedRanks) {
          const items = itemRewardsRecord[rank] || [];
          for (const item of items) {
            ranks.push(rank);
            itemIds.push(this.itemIdToU8(item.itemId));
            levels.push(item.level);
            quantities.push(item.quantity);
          }
        }
        
        // Validate pool distribution
        const poolDistribution = config.rewardConfig.poolDistribution || [];
        if (poolDistribution.length !== config.rewardConfig.poolDepth) {
          return {
            success: false,
            error: `Pool distribution length (${poolDistribution.length}) must match pool depth (${config.rewardConfig.poolDepth})`,
          };
        }
        
        BadgeLogger.info('🏆 [TOURNAMENT CREATE] Creating tournament with custom rewards', {
          rewardDepth: config.rewardConfig.rewardDepth,
          poolDepth: config.rewardConfig.poolDepth,
          itemCount: ranks.length,
          ranksCount: sortedRanks.length,
        });
        
        txb.moveCall({
          target: `${packageId}::tournaments::create_tournament_with_custom_rewards`,
          arguments: [
            txb.object(registryId),
            txb.object(adminCapId),
            txb.pure.vector('u8', Array.from(nameBytes)),
            txb.pure.u8(this.categoryToU8(config.category)),
            txb.pure.u64(config.startTime),
            txb.pure.u64(config.endTime),
            txb.pure.u64(config.entryFeeTickets),
            txb.pure.u8(config.rewardConfig.rewardDepth),
            txb.pure.u8(config.rewardConfig.poolDepth),
            txb.pure.vector('u64', poolDistribution),
            txb.pure.u8(config.rewardConfig.poolSource || 0),
            txb.pure.vector('u8', ranks),
            txb.pure.vector('u8', itemIds),
            txb.pure.vector('u8', levels),
            txb.pure.vector('u64', quantities),
            txb.pure.u64(startingAnteUSDCents),
            txb.object('0x6'), // Clock
          ],
        });
      } else {
        // Use default reward config (stored on-chain same as custom rewards)
        const defaultConfig = await this.getDefaultRewardConfig();
        
        // Convert itemRewards to parallel vectors
        const ranks: number[] = [];
        const itemIds: number[] = [];
        const levels: number[] = [];
        const quantities: number[] = [];
        
        const sortedRanks = Object.keys(defaultConfig.itemRewards)
          .map(Number)
          .sort((a, b) => a - b);
        
        for (const rank of sortedRanks) {
          const items = defaultConfig.itemRewards[rank] || [];
          for (const item of items) {
            ranks.push(rank);
            itemIds.push(this.itemIdToU8(item.itemId));
            levels.push(item.level);
            quantities.push(item.quantity);
          }
        }
        
        BadgeLogger.info('🏆 [TOURNAMENT CREATE] Creating tournament with default rewards (stored on-chain)', {
          rewardDepth: defaultConfig.rewardDepth,
          poolDepth: defaultConfig.poolDepth,
          itemCount: ranks.length,
        });
        
        txb.moveCall({
          target: `${packageId}::tournaments::create_tournament_default_rewards`,
          arguments: [
            txb.object(registryId),
            txb.object(adminCapId),
            txb.pure.vector('u8', Array.from(nameBytes)),
            txb.pure.u8(this.categoryToU8(config.category)),
            txb.pure.u64(config.startTime),
            txb.pure.u64(config.endTime),
            txb.pure.u64(config.entryFeeTickets),
            txb.pure.u8(defaultConfig.rewardDepth),
            txb.pure.u8(defaultConfig.poolDepth),
            txb.pure.vector('u64', defaultConfig.poolDistribution),
            txb.pure.u8(defaultConfig.poolSource),
            txb.pure.vector('u8', ranks),
            txb.pure.vector('u8', itemIds),
            txb.pure.vector('u8', levels),
            txb.pure.vector('u64', quantities),
            txb.pure.u64(startingAnteUSDCents),
            txb.object('0x6'), // Clock
          ],
        });
      }

      // Set sender (admin wallet)
      txb.setSender(this.adminWallet.getAddress());

      // Set gas budget (already calculated above with appropriate buffer)
      txb.setGasBudget(gasBudget);
      
      BadgeLogger.info('🏆 [TOURNAMENT CREATE] Gas budget set', {
        gasBudget,
        gasBudgetSUI: (gasBudget / 1_000_000_000).toFixed(4),
        hasCustomRewards,
      });

      // Build transaction
      const transactionBytes = await txb.build({ client });

      // Sign and execute with admin wallet
      const result = await client.signAndExecuteTransaction({
        signer: this.adminWallet.getKeypair(),
        transaction: transactionBytes,
        options: {
          showEffects: true,
          showEvents: true,
          showObjectChanges: true,
        },
      });
      
      // Check if transaction succeeded
      const txStatus = result.effects?.status?.status;
      if (txStatus === 'failure' || result.effects?.status?.error) {
        const errorMessage = result.effects?.status?.error || 'Transaction failed';
        const isGasError = errorMessage.includes('InsufficientGas') || errorMessage.includes('insufficient gas');
        
        BadgeLogger.error('🏆 [TOURNAMENT CREATE] Transaction failed', {
          txDigest: result.digest,
          error: errorMessage,
          isGasError,
          gasBudget,
          gasBudgetSUI: (gasBudget / 1_000_000_000).toFixed(4),
        });
        
        let userFriendlyError = `Tournament creation transaction failed: ${errorMessage}`;
        if (isGasError) {
          userFriendlyError = `Insufficient gas for tournament creation. The transaction requires approximately ${(gasBudget / 1_000_000_000).toFixed(4)} SUI for gas fees, but the admin wallet does not have enough SUI. Please ensure the admin wallet has at least ${((gasBudget + 100_000_000) / 1_000_000_000).toFixed(4)} SUI (gas + buffer).`;
        }
        
        return {
          success: false,
          error: userFriendlyError,
        };
      }
      
      BadgeLogger.info('🏆 [TOURNAMENT CREATE] Transaction executed successfully', {
        txDigest: result.digest,
        status: txStatus,
      });
      
      // Try to extract tournament from transaction result first
      let tournament: Tournament | undefined = this.extractTournamentFromTransactionResult(result);
      
      // If not found in result, query for the created tournament object
      // Tournament is created as a shared object, so we need to find it from events
      // Add retry logic to wait for transaction indexing
      if (!tournament) {
        const maxRetries = 5;
        
        for (let retryCount = 0; retryCount < maxRetries; retryCount++) {
          if (retryCount > 0) {
            // Wait before retry (transaction might not be indexed yet)
            const waitTime = 1000 * retryCount; // 1s, 2s, 3s, 4s, 5s
            BadgeLogger.info('🏆 [TOURNAMENT CREATE] Waiting for transaction to be indexed', {
              txDigest: result.digest,
              retryCount,
              waitTime,
            });
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
          
          tournament = await this.findTournamentFromEvents(result.digest);
          
      if (tournament) {
            BadgeLogger.info('🏆 [TOURNAMENT CREATE] Tournament found from events', {
              txDigest: result.digest,
              tournamentId: tournament.tournamentId,
              retryCount,
            });
            break;
          }
          
          if (retryCount < maxRetries - 1) {
            BadgeLogger.warn('🏆 [TOURNAMENT CREATE] Tournament not found yet, will retry', {
              txDigest: result.digest,
              retryCount: retryCount + 1,
              maxRetries,
            });
          }
        }
      }
      
      if (!tournament) {
        BadgeLogger.error('🏆 [TOURNAMENT CREATE] Tournament not found after all retries', {
          txDigest: result.digest,
          maxRetries: 5,
        });
        return {
          success: false,
          error: `Tournament transaction was submitted (${result.digest}) but tournament could not be found after retries. The tournament may have been created but is not yet indexed. Please check the transaction on Sui Explorer.`,
        };
      }
      
      // Add reward token to tournament (not stored in contract, but needed for reward distribution)
      tournament.rewardToken = config.rewardToken || 'MEWS';
      
      // Clear cache so the new tournament appears in listings immediately
      this.clearActiveTournamentsCache();
      
      return {
        success: true,
        tournament,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Extract tournament from transaction result directly
   * This avoids needing to query the transaction again
   */
  private extractTournamentFromTransactionResult(result: any): Tournament | undefined {
    try {
      // Find TournamentCreated event
      const createdEvent = result.events?.find((e: any) => 
        e.type?.includes('TournamentCreated')
      );

      if (!createdEvent) return undefined;

      // Find the tournament object from object changes
      const tournamentObject = result.objectChanges?.find((change: any) =>
        change.type === 'created' && 
        change.objectType?.includes('Tournament')
      );

      if (!tournamentObject) return undefined;

      // Parse tournament data
      const eventData = createdEvent.parsedJson as any;
      
      // Decode name from bytes
      const decodedName = new TextDecoder().decode(new Uint8Array(eventData.name));
      
      // Debug: Log the decoded name
      BadgeLogger.info('🏆 [TOURNAMENT CREATE] Extracted tournament from transaction result', {
        tournamentId: Number(eventData.tournament_id),
        decodedName,
        objectId: tournamentObject.objectId,
      });
      
      return {
        tournamentId: Number(eventData.tournament_id),
        name: decodedName,
        category: this.u8ToCategory(Number(eventData.category)),
        startTime: Number(eventData.start_time),
        endTime: Number(eventData.end_time),
        entryFeeTickets: Number(eventData.entry_fee_tickets),
        prizePoolUSDCents: 0, // Starts at 0
        participants: 0,
        status: 'upcoming',
        createdAt: Number(eventData.timestamp),
        objectId: tournamentObject.objectId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      BadgeLogger.warn('Error extracting tournament from transaction result', {
        error: errorMessage,
      });
      return undefined;
    }
  }

  /**
   * Find tournament object from transaction events
   * Handles rate limiting gracefully
   */
  private async findTournamentFromEvents(txDigest: string): Promise<Tournament | undefined> {
    try {
      const tx = await this.client.getTransactionBlock({
        digest: txDigest,
        options: {
          showEvents: true,
          showObjectChanges: true,
        },
      });

      // Find TournamentCreated event
      const createdEvent = tx.events?.find((e: any) => 
        e.type?.includes('TournamentCreated')
      );

      if (!createdEvent) return undefined;

      // Find the tournament object from object changes
      const tournamentObject = tx.objectChanges?.find((change: any) =>
        change &&
        'type' in change &&
        'objectId' in change &&
        'objectType' in change &&
        change.type === 'created' && 
        change.objectType?.includes('Tournament')
      ) as { objectId: string; type: string; objectType: string } | undefined;

      if (!tournamentObject || !tournamentObject.objectId) return undefined;

      // Parse tournament data
      const eventData = createdEvent.parsedJson as any;
      
      // Decode name from bytes
      const decodedName = new TextDecoder().decode(new Uint8Array(eventData.name));
      
      // Debug: Log the decoded name
      BadgeLogger.info('🏆 [TOURNAMENT CREATE] Decoded tournament name from event', {
        tournamentId: Number(eventData.tournament_id),
        decodedName,
        nameBytes: eventData.name,
      });
      
      return {
        tournamentId: Number(eventData.tournament_id),
        name: decodedName,
        category: this.u8ToCategory(Number(eventData.category)),
        startTime: Number(eventData.start_time),
        endTime: Number(eventData.end_time),
        entryFeeTickets: Number(eventData.entry_fee_tickets),
        prizePoolUSDCents: 0, // Starts at 0
        participants: 0,
        status: 'upcoming',
        createdAt: Number(eventData.timestamp),
        objectId: tournamentObject.objectId,
      };
    } catch (error) {
      // Check if it's a rate limit error
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests')) {
        BadgeLogger.warn('Rate limited when finding tournament from events', {
          txDigest,
          error: errorMessage,
        });
        // Return undefined to skip this tournament rather than failing completely
        return undefined;
      }
      
      BadgeLogger.error('Error finding tournament from events', {
        txDigest,
        error: errorMessage,
      });
      return undefined;
    }
  }

  /**
   * Get tournament by object ID
   */
  async getTournament(objectId: string): Promise<{ success: boolean; tournament?: Tournament; error?: string }> {
    try {
      const obj = await this.client.getObject({
        id: objectId,
        options: {
          showContent: true,
          showType: true,
        },
      });

      if (!obj.data || obj.error) {
        return {
          success: false,
          error: 'Tournament not found',
        };
      }

      const content = obj.data.content as any;
      const fields = content.fields;

      const now = Date.now();
      const startTime = Number(fields.start_time);
      const endTime = Number(fields.end_time);
      
      let status: 'upcoming' | 'active' | 'ended';
      if (now < startTime) {
        status = 'upcoming';
      } else if (now <= endTime) {
        status = 'active';
      } else {
        status = 'ended';
      }

      // Get participant count from participants table
      // Note: Table size isn't directly queryable, so we'll estimate or query events
      const participants = await this.getParticipantCount(objectId);

      // Decode name from bytes
      const decodedName = new TextDecoder().decode(new Uint8Array(fields.name));
      
      // Debug: Log the decoded name when reading tournament
      BadgeLogger.info('🏆 [TOURNAMENT GET] Decoded tournament name from object', {
        tournamentId: Number(fields.tournament_id),
        objectId,
        decodedName,
        nameBytes: fields.name,
      });

      // Read new fields (may not exist for old tournaments)
      const startingAnteUSDCents = fields.starting_ante_usd_cents !== undefined 
        ? Number(fields.starting_ante_usd_cents) 
        : 0;
      const createdBy = fields.created_by || '';
      const creationFeePaid = fields.creation_fee_paid !== undefined 
        ? Number(fields.creation_fee_paid) 
        : 0;
      const creatorRewardUSDCents = fields.creator_reward_usd_cents !== undefined 
        ? Number(fields.creator_reward_usd_cents) 
        : 0;
      const creatorRewardPaid = fields.creator_reward_paid !== undefined 
        ? Boolean(fields.creator_reward_paid) 
        : false;
      
      // Deserialize reward_config (Option<TournamentRewardConfig>)
      let rewardConfig: any = null;
      const hasCustomRewards = fields.reward_config !== undefined && fields.reward_config !== null;
      
      if (hasCustomRewards) {
        try {
          // Option<TournamentRewardConfig> is represented as an object with fields
          // Check if it's a Some variant (has fields) or None (null)
          const rewardConfigData = fields.reward_config;
          
          // In Sui, Option is represented as either null or an object
          // If it's an object, it should have the TournamentRewardConfig fields
          if (rewardConfigData && typeof rewardConfigData === 'object' && 'fields' in rewardConfigData) {
            const configFields = (rewardConfigData as any).fields;
            
            // Deserialize TournamentRewardConfig fields
            const rewardDepth = configFields.reward_depth !== undefined ? Number(configFields.reward_depth) : 3;
            const poolDepth = configFields.pool_depth !== undefined ? Number(configFields.pool_depth) : 3;
            const poolDistribution = configFields.pool_distribution || [];
            const poolSource = configFields.pool_source !== undefined ? Number(configFields.pool_source) : 0;
            
            // item_rewards is a Table<u8, vector<ItemReward>>
            // Tables in Sui are stored as separate objects with dynamic fields
            const itemRewardsTableId = configFields.item_rewards;
            const itemRewards: Record<number, Array<{ itemId: string; level: number; quantity: number }>> = {};
            
            if (itemRewardsTableId && typeof itemRewardsTableId === 'object') {
              try {
                // Get the table object ID
                // The table can be stored as an object reference or directly as an ID
                let tableObjectId: string;
                if (typeof itemRewardsTableId === 'string') {
                  tableObjectId = itemRewardsTableId;
                } else if (itemRewardsTableId.fields?.id) {
                  tableObjectId = typeof itemRewardsTableId.fields.id === 'string' 
                    ? itemRewardsTableId.fields.id 
                    : itemRewardsTableId.fields.id.id || itemRewardsTableId.fields.id;
                } else if ((itemRewardsTableId as any).id) {
                  tableObjectId = (itemRewardsTableId as any).id;
                } else {
                  BadgeLogger.warn('Could not extract table object ID from item_rewards', {
                    itemRewardsTableId,
                  });
                  throw new Error('Invalid table object ID format');
                }
                
                BadgeLogger.debug('Deserializing item_rewards table', {
                  tableObjectId,
                });
                
                // Query dynamic fields of the table
                const dynamicFields = await this.client.getDynamicFields({
                  parentId: tableObjectId,
                });
                
                BadgeLogger.debug('Found dynamic fields in item_rewards table', {
                  tableObjectId,
                  count: dynamicFields.data.length,
                });
                
                // Process each dynamic field (rank -> items)
                for (const field of dynamicFields.data) {
                  try {
                    // Extract rank from the name field (it's a u8)
                    const rankKey = field.name;
                    let rank: number = 0;
                    
                    // The name field format varies - handle different cases
                    if (rankKey) {
                      if (typeof rankKey === 'object') {
                        // Handle object format: { type: 'u8', value: '1' } or { value: 1 }
                        if ('value' in rankKey) {
                          rank = Number(rankKey.value);
                        } else if ((rankKey as any).type === 'u8' && (rankKey as any).bcs !== undefined) {
                          // Handle BCS-encoded u8
                          rank = Number((rankKey as any).bcs || 0);
                        } else {
                          // Try to find any numeric value in the object
                          const values = Object.values(rankKey);
                          for (const val of values) {
                            if (typeof val === 'number' || (typeof val === 'string' && !isNaN(Number(val)))) {
                              rank = Number(val);
                              break;
                            }
                          }
                        }
                      } else if (typeof rankKey === 'string') {
                        rank = parseInt(rankKey, 10) || 0;
                      } else if (typeof rankKey === 'number') {
                        rank = rankKey;
                      }
                    }
                    
                    if (rank === 0 && rankKey != null && (typeof rankKey === 'object' || (typeof rankKey !== 'number' && rankKey !== '0'))) {
                      BadgeLogger.warn('Could not extract rank from field name', {
                        rankKey,
                        fieldName: field.name,
                      });
                      continue;
                    }
                    
                    // Get the value object (contains vector<ItemReward>)
                    const fieldObject = await this.client.getObject({
                      id: field.objectId,
                      options: { showContent: true },
                    });
                    
                    if (!fieldObject.data?.content) {
                      BadgeLogger.warn('Field object has no content', {
                        rank,
                        objectId: field.objectId,
                      });
                      continue;
                    }
                    
                    const fieldContent = fieldObject.data.content as any;
                    
                    // The vector<ItemReward> is stored in the value field
                    // It can be in different formats depending on Sui's serialization
                    let itemsArray: any[] = [];
                    
                    if (fieldContent.fields) {
                      // Try different possible field names for the vector
                      itemsArray = fieldContent.fields.value || 
                                  fieldContent.fields.contents || 
                                  fieldContent.fields.items ||
                                  fieldContent.fields.vec ||
                                  [];
                      
                      // If it's not an array, it might be a wrapped object
                      if (!Array.isArray(itemsArray) && typeof itemsArray === 'object' && itemsArray !== null) {
                        const itemsObj = itemsArray as any;
                        itemsArray = itemsObj.fields?.contents || 
                                   itemsObj.fields?.value || 
                                   itemsObj.contents ||
                                   itemsObj.value ||
                                   [];
                      }
                    } else if (Array.isArray(fieldContent)) {
                      itemsArray = fieldContent;
                    }
                    
                    // Ensure it's an array
                    if (!Array.isArray(itemsArray)) {
                      BadgeLogger.warn('Items is not an array', {
                        rank,
                        itemsType: typeof itemsArray,
                        items: itemsArray,
                      });
                      continue;
                    }
                    
                    BadgeLogger.debug('Deserializing items for rank', {
                      rank,
                      itemsCount: itemsArray.length,
                    });
                    
                    // Deserialize ItemReward vector
                    const itemRewardsList: Array<{ itemId: string; level: number; quantity: number }> = [];
                    
                    for (const item of itemsArray) {
                      if (!item || typeof item !== 'object') {
                        continue;
                      }
                      
                      // ItemReward structure: item_id (u8), level (u8), quantity (u64)
                      // Note: The field name is item_id, not item_type
                      const itemFields = item.fields || item;
                      
                      const itemIdNum = itemFields.item_id !== undefined 
                        ? Number(itemFields.item_id) 
                        : (itemFields.item_type !== undefined ? Number(itemFields.item_type) : 0);
                      const level = itemFields.level !== undefined ? Number(itemFields.level) : 1;
                      const quantity = itemFields.quantity !== undefined ? Number(itemFields.quantity) : 1;
                      
                      // Map item type number to itemId string
                      const itemTypeMap: Record<number, string> = {
                        0: 'orbLevel',
                        1: 'forceField',
                        2: 'extraLives',
                        3: 'slowTime',
                        4: 'coinTractorBeam',
                        5: 'destroyAll',
                        6: 'bossKillShot',
                        255: 'random', // Special value - resolved to random L1 item at distribution time
                      };
                      
                      const itemId = itemTypeMap[itemIdNum] || 'orbLevel';
                      
                      itemRewardsList.push({ itemId, level, quantity });
                      
                      BadgeLogger.debug('Deserialized item reward', {
                        rank,
                        itemId,
                        level,
                        quantity,
                      });
                    }
                    
                    if (itemRewardsList.length > 0) {
                      itemRewards[rank] = itemRewardsList;
                      BadgeLogger.debug('Added item rewards for rank', {
                        rank,
                        itemCount: itemRewardsList.length,
                      });
                    }
                  } catch (fieldError) {
                    BadgeLogger.warn('Failed to deserialize item reward field', {
                      field: field.name,
                      objectId: field.objectId,
                      error: fieldError instanceof Error ? fieldError.message : 'Unknown error',
                      stack: fieldError instanceof Error ? fieldError.stack : undefined,
                    });
                  }
                }
                
                BadgeLogger.info('Deserialized item_rewards table', {
                  tableObjectId,
                  ranksCount: Object.keys(itemRewards).length,
                  totalItems: Object.values(itemRewards).reduce((sum, items) => sum + items.length, 0),
                });
              } catch (tableError) {
                BadgeLogger.error('Failed to deserialize item_rewards table', {
                  error: tableError instanceof Error ? tableError.message : 'Unknown error',
                  stack: tableError instanceof Error ? tableError.stack : undefined,
                  itemRewardsTableId,
                });
              }
            }
            
            rewardConfig = {
              rewardDepth,
              poolDepth,
              poolDistribution: Array.isArray(poolDistribution) 
                ? poolDistribution.map((v: any) => Number(v))
                : (poolDistribution.fields?.contents || []).map((v: any) => Number(v)),
              poolSource,
              itemRewards,
            };
          }
        } catch (error) {
          BadgeLogger.warn('Failed to deserialize reward_config', {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          // Continue with null rewardConfig if deserialization fails
        }
      }

      return {
        success: true,
        tournament: {
          tournamentId: Number(fields.tournament_id),
          name: decodedName,
          category: this.u8ToCategory(Number(fields.category)),
          startTime: Number(fields.start_time),
          endTime: Number(fields.end_time),
          entryFeeTickets: Number(fields.entry_fee_tickets),
          prizePoolUSDCents: Number(fields.prize_pool_usd_cents),
          participants,
          status,
          createdAt: Number(fields.created_at),
          objectId,
          distributionStatus: Number(fields.distribution_status ?? 0),
          rewardsDistributed: Number(fields.distribution_status ?? 0) > 0, // Backwards compat
          
          // NEW FIELDS
          rewardConfig,
          startingAnteUSDCents,
          createdBy,
          creationFeePaid,
          creatorRewardUSDCents,
          creatorRewardPaid,
          hasCustomRewards,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get participant count for a tournament
   * Reads directly from the participants table for better performance and reliability
   * Falls back to event-based reading if table reading fails
   * NOTE: This does NOT call getTournament() to avoid circular dependency
   */
  private async getParticipantCount(tournamentObjectId: string): Promise<number> {
    try {
      // Get tournament object to access participants table
      const obj = await this.client.getObject({
        id: tournamentObjectId,
        options: {
          showContent: true,
        },
      });

      if (!obj.data || obj.error) {
        BadgeLogger.warn('Could not read tournament object for participant count', {
          tournamentObjectId,
          error: obj.error,
        });
        return 0;
      }

      const content = obj.data.content as any;
      const fields = content.fields;
      const tournamentId = Number(fields.tournament_id);

      // Try reading from participants table first (preferred method)
      try {
        const participantsTableId = fields.participants?.fields?.id?.id || null;

        if (participantsTableId) {
          BadgeLogger.debug('Reading participant count from table', {
            tournamentObjectId,
            tournamentId,
            participantsTableId,
          });

          const participantFields = await this.client.getDynamicFields({
            parentId: participantsTableId,
            limit: 1000, // Should be enough for most tournaments
          });

          const count = participantFields.data.length;

          BadgeLogger.debug('Successfully read participant count from table', {
            tournamentObjectId,
            tournamentId,
            count,
          });

          return count;
        } else {
          BadgeLogger.warn('No participants table found, falling back to events', {
            tournamentObjectId,
            tournamentId,
            hasParticipantsField: !!fields.participants,
          });
        }
      } catch (tableError) {
        BadgeLogger.warn('Error reading participants table, falling back to events', {
          tournamentObjectId,
          tournamentId,
          error: tableError instanceof Error ? tableError.message : String(tableError),
        });
        // Fall through to event-based reading
      }

      // Fallback: Query TournamentEntered events (legacy method)
      BadgeLogger.debug('Reading participant count from events (fallback)', {
        tournamentObjectId,
        tournamentId,
      });

      const events = await this.client.queryEvents({
        query: {
          MoveModule: {
            package: this.getPackageId(),
            module: 'tournaments',
          },
        },
        limit: 1000,
      });

      const participantSet = new Set<string>();

      // Filter for TournamentEntered events for this tournament
      for (const event of events.data) {
        if (event.type?.includes('TournamentEntered')) {
          const eventData = event.parsedJson as any;
          if (Number(eventData.tournament_id) === tournamentId) {
            const player = eventData.player as string;
            participantSet.add(player);
          }
        }
      }

      BadgeLogger.debug('Read participant count from events (fallback)', {
        tournamentObjectId,
        tournamentId,
        count: participantSet.size,
      });

      return participantSet.size;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests')) {
        BadgeLogger.warn('Rate limited when getting participant count', {
          tournamentObjectId,
          error: errorMessage,
        });
        // Return 0 on rate limit rather than failing
        return 0;
      }
      
      BadgeLogger.error('Error getting participant count', {
        tournamentObjectId,
        error: errorMessage,
      });
      return 0;
    }
  }

  /**
   * Get all tournaments a player has entered
   * Returns array of tournament IDs (numeric) the player has entered
   */
  async getPlayerEnteredTournaments(
    playerAddress: string
  ): Promise<{ success: boolean; tournamentIds?: number[]; error?: string }> {
    try {
      // Query TournamentEntered events for this player
      const events = await this.client.queryEvents({
        query: {
          MoveModule: {
            package: this.getPackageId(),
            module: 'tournaments',
          },
        },
        limit: 1000,
      });

      const tournamentIds = new Set<number>();

      // Collect all tournament IDs the player has entered
      for (const event of events.data) {
        if (event.type?.includes('TournamentEntered')) {
          const eventData = event.parsedJson as any;
          if ((eventData.player as string).toLowerCase() === playerAddress.toLowerCase()) {
            const tournamentId = Number(eventData.tournament_id);
            if (!isNaN(tournamentId)) {
              tournamentIds.add(tournamentId);
            }
          }
        }
      }

      return {
        success: true,
        tournamentIds: Array.from(tournamentIds),
      };
    } catch (error) {
      BadgeLogger.error('Error getting player entered tournaments', {
        playerAddress,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check if a player is a participant in a tournament
   * Uses TournamentEntered events to verify participation
   * Also validates that the tournamentObjectId matches the tournament the player entered
   */
  async isPlayerParticipant(
    tournamentObjectId: string,
    playerAddress: string
  ): Promise<{ success: boolean; isParticipant: boolean; error?: string; enteredTournamentIds?: number[] }> {
    try {
      // Get tournament ID from tournament object
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

    // Get all tournaments the player has entered
    const enteredTournaments = await this.getPlayerEnteredTournaments(playerAddress);
    const enteredTournamentIds = enteredTournaments.tournamentIds || [];

    BadgeLogger.info('🏆 [PARTICIPANT CHECK] Verifying tournament participation', {
      tournamentObjectId,
      tournamentId,
      tournamentName,
      playerAddress,
      enteredTournamentIds,
      checkingIfEntered: enteredTournamentIds.includes(tournamentId),
    });

    // Check if player has entered this specific tournament
    const isParticipant = enteredTournamentIds.includes(tournamentId);

    if (isParticipant) {
      BadgeLogger.info('✅ [PARTICIPANT CHECK] Player IS tournament participant', {
        tournamentObjectId,
        tournamentId,
        tournamentName,
        playerAddress,
      });
      return {
        success: true,
        isParticipant: true,
        enteredTournamentIds,
      };
    } else {
      BadgeLogger.warn('❌ [PARTICIPANT CHECK] Player is NOT tournament participant', {
        tournamentObjectId,
        tournamentId,
        tournamentName,
        playerAddress,
        enteredTournamentIds,
        message: `Player has entered tournaments: [${enteredTournamentIds.join(', ')}], but trying to submit to tournament ${tournamentId}`,
      });
      return {
        success: true,
        isParticipant: false,
        enteredTournamentIds,
      };
    }
  } catch (error) {
    BadgeLogger.error('Error checking player participation', {
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
   * Queries active_tournaments table directly for better performance
   * Uses caching to reduce RPC calls and handle rate limits gracefully
   */
  async getActiveTournaments(forceRefresh = false): Promise<Tournament[]> {
    // Check cache first
    if (!forceRefresh && this._activeTournamentsCache && this._activeTournamentsCacheTimestamp) {
      const cacheAge = Date.now() - this._activeTournamentsCacheTimestamp;
      if (cacheAge < this._activeTournamentsCacheTTL) {
        BadgeLogger.debug('Returning cached active tournaments', {
          count: this._activeTournamentsCache.length,
          cacheAge,
        });
        return this._activeTournamentsCache;
      }
    }

    try {
      const registryId = this.getTournamentRegistryId();
      if (!registryId) {
        throw new Error('Tournament registry not configured');
      }

      // Read the registry object to get the active_tournaments table ID
      const registryObj = await this.client.getObject({
        id: registryId,
        options: { showContent: true },
      });

      if (!registryObj.data?.content) {
        throw new Error('Failed to read TournamentRegistry object');
      }

      const registryFields = (registryObj.data.content as any).fields;
      const activeTournamentsTableId = registryFields?.active_tournaments?.fields?.id?.id;

      if (!activeTournamentsTableId) {
        BadgeLogger.warn('Active tournaments table not found in registry');
        return [];
      }

      // Query all dynamic fields from active_tournaments table
      const dynamicFields = await this.client.getDynamicFields({
        parentId: activeTournamentsTableId,
        limit: 100, // Should be enough for active tournaments
      });

      BadgeLogger.debug('Found active tournaments in table', {
        count: dynamicFields.data.length,
      });

      const tournaments: Tournament[] = [];

      // Process each tournament ID and fetch the tournament object
      const tournamentPromises = dynamicFields.data.map(async (field) => {
        try {
          // Extract tournament ID from field name
          const tournamentId = typeof field.name === 'object' && 'value' in field.name
            ? Number(field.name.value)
            : Number(field.name);

          // Get tournament object ID from the table entry
          // For Table<u64, ID>, the value stored is the tournament object ID
          // Try field.objectId first (sometimes it's the tournament ID directly)
          // Otherwise, use getDynamicFieldObject to get the value
          let tournamentObjectId: string | null = null;

          try {
            // First, try using getDynamicFieldObject to get the actual value
            const fieldName = typeof field.name === 'object' && 'value' in field.name
              ? { type: 'u64', value: String(tournamentId) }
              : { type: 'u64', value: String(tournamentId) };

            const dynamicFieldObj = await this.client.getDynamicFieldObject({
              parentId: activeTournamentsTableId,
              name: fieldName,
            });

            if (dynamicFieldObj.data?.objectId) {
              // Check if the field object ID is the tournament itself
              // or if we need to read the field object's content
              const fieldObj = await this.client.getObject({
                id: dynamicFieldObj.data.objectId,
                options: { showContent: true, showType: true },
              });

              // If the field object type contains "Tournament", it's the tournament itself
              if (fieldObj.data?.type?.includes('Tournament')) {
                tournamentObjectId = dynamicFieldObj.data.objectId;
              } else if (fieldObj.data?.content) {
                // Otherwise, the value might be in the content
                const content = fieldObj.data.content as any;
                if (content.fields?.value) {
                  tournamentObjectId = content.fields.value;
                } else if (content.fields?.id) {
                  tournamentObjectId = typeof content.fields.id === 'string'
                    ? content.fields.id
                    : content.fields.id.id || content.fields.id;
                } else {
                  // Fallback: use the field object ID (might be the tournament ID)
                  tournamentObjectId = dynamicFieldObj.data.objectId;
                }
              } else {
                // Fallback: use the field object ID
                tournamentObjectId = dynamicFieldObj.data.objectId;
              }
            }
          } catch (fieldError) {
            // If getDynamicFieldObject fails, try field.objectId as fallback
            BadgeLogger.debug('getDynamicFieldObject failed, trying field.objectId', {
              tournamentId,
              error: fieldError instanceof Error ? fieldError.message : 'Unknown error',
            });
            tournamentObjectId = field.objectId;
          }

          if (!tournamentObjectId) {
            BadgeLogger.warn('Could not get tournament object ID from dynamic field', {
              tournamentId,
            });
            return null;
          }

          // Fetch full tournament data
          const tournamentResult = await this.getTournament(tournamentObjectId);
          if (tournamentResult.success && tournamentResult.tournament) {
            return tournamentResult.tournament;
          }
          return null;
        } catch (error) {
          BadgeLogger.warn('Error processing active tournament', {
            fieldName: field.name,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          return null;
        }
      });

      const results = await Promise.allSettled(tournamentPromises);
      
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          tournaments.push(result.value);
        }
      }

      // Sort by start time (upcoming first, then active)
      tournaments.sort((a, b) => {
        // Upcoming tournaments first
        if (a.status === 'upcoming' && b.status !== 'upcoming') return -1;
        if (b.status === 'upcoming' && a.status !== 'upcoming') return 1;
        // Then by start time
        return a.startTime - b.startTime;
      });

      // Update cache
      this._activeTournamentsCache = tournaments;
      this._activeTournamentsCacheTimestamp = Date.now();

      BadgeLogger.info('Loaded active tournaments from table', {
        count: tournaments.length,
        cached: true,
      });

      return tournaments;
    } catch (error) {
      // If we have cached data, return it even if expired
      if (this._activeTournamentsCache) {
        BadgeLogger.warn('Error getting active tournaments, returning stale cache', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        return this._activeTournamentsCache;
      }
      
      BadgeLogger.error('Error getting active tournaments and no cache available', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }
  
  /**
   * Clear the active tournaments cache (useful after creating a new tournament)
   */
  clearActiveTournamentsCache() {
    this._activeTournamentsCache = null;
    this._activeTournamentsCacheTimestamp = 0;
    BadgeLogger.debug('Cleared active tournaments cache');
  }

  /**
   * Get past tournaments (ended tournaments)
   * Returns tournaments that have ended (endTime <= now)
   * Queries past_tournaments table directly for better performance
   */
  async getPastTournaments(limit: number = 50): Promise<Tournament[]> {
    try {
      const registryId = this.getTournamentRegistryId();
      if (!registryId) {
        throw new Error('Tournament registry not configured');
      }

      // Read the registry object to get the past_tournaments table ID
      const registryObj = await this.client.getObject({
        id: registryId,
        options: { showContent: true },
      });

      if (!registryObj.data?.content) {
        throw new Error('Failed to read TournamentRegistry object');
      }

      const registryFields = (registryObj.data.content as any).fields;
      const pastTournamentsTableId = registryFields?.past_tournaments?.fields?.id?.id;

      if (!pastTournamentsTableId) {
        BadgeLogger.warn('Past tournaments table not found in registry');
        return [];
      }

      // Query dynamic fields from past_tournaments table
      const dynamicFields = await this.client.getDynamicFields({
        parentId: pastTournamentsTableId,
        limit: limit,
      });

      BadgeLogger.debug('Found past tournaments in table', {
        count: dynamicFields.data.length,
      });

      const tournaments: Tournament[] = [];

      // Process each tournament ID and fetch the tournament object
      const tournamentPromises = dynamicFields.data.map(async (field) => {
        try {
          // Extract tournament ID from field name
          const tournamentId = typeof field.name === 'object' && 'value' in field.name
            ? Number(field.name.value)
            : Number(field.name);

          // Get tournament object ID from the table entry
          // For Table<u64, ID>, the value stored is the tournament object ID
          // Try field.objectId first (sometimes it's the tournament ID directly)
          // Otherwise, use getDynamicFieldObject to get the value
          let tournamentObjectId: string | null = null;

          try {
            // First, try using getDynamicFieldObject to get the actual value
            const fieldName = typeof field.name === 'object' && 'value' in field.name
              ? { type: 'u64', value: String(tournamentId) }
              : { type: 'u64', value: String(tournamentId) };

            const dynamicFieldObj = await this.client.getDynamicFieldObject({
              parentId: pastTournamentsTableId,
              name: fieldName,
            });

            if (dynamicFieldObj.data?.objectId) {
              // Check if the field object ID is the tournament itself
              // or if we need to read the field object's content
              const fieldObj = await this.client.getObject({
                id: dynamicFieldObj.data.objectId,
                options: { showContent: true, showType: true },
              });

              // If the field object type contains "Tournament", it's the tournament itself
              if (fieldObj.data?.type?.includes('Tournament')) {
                tournamentObjectId = dynamicFieldObj.data.objectId;
              } else if (fieldObj.data?.content) {
                // Otherwise, the value might be in the content
                const content = fieldObj.data.content as any;
                if (content.fields?.value) {
                  tournamentObjectId = content.fields.value;
                } else if (content.fields?.id) {
                  tournamentObjectId = typeof content.fields.id === 'string'
                    ? content.fields.id
                    : content.fields.id.id || content.fields.id;
                } else {
                  // Fallback: use the field object ID (might be the tournament ID)
                  tournamentObjectId = dynamicFieldObj.data.objectId;
                }
              } else {
                // Fallback: use the field object ID
                tournamentObjectId = dynamicFieldObj.data.objectId;
              }
            }
          } catch (fieldError) {
            // If getDynamicFieldObject fails, try field.objectId as fallback
            BadgeLogger.debug('getDynamicFieldObject failed, trying field.objectId', {
              tournamentId,
              error: fieldError instanceof Error ? fieldError.message : 'Unknown error',
            });
            tournamentObjectId = field.objectId;
          }

          if (!tournamentObjectId) {
            BadgeLogger.warn('Could not get tournament object ID from dynamic field', {
              tournamentId,
            });
            return null;
          }

          // Fetch full tournament data
          const tournamentResult = await this.getTournament(tournamentObjectId);
          if (tournamentResult.success && tournamentResult.tournament) {
            return tournamentResult.tournament;
          }
          return null;
        } catch (error) {
          BadgeLogger.warn('Error processing past tournament', {
            fieldName: field.name,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          return null;
        }
      });

      const results = await Promise.allSettled(tournamentPromises);
      
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          tournaments.push(result.value);
        }
      }

      // Sort by end time (most recent first)
      tournaments.sort((a, b) => b.endTime - a.endTime);

      BadgeLogger.info('Loaded past tournaments from table', {
        count: tournaments.length,
      });

      return tournaments;
    } catch (error) {
      BadgeLogger.error('Error getting past tournaments', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Move tournament from active_tournaments to past_tournaments
   * Called when tournament grace period ends or rewards are distributed
   * Idempotent: can be called multiple times safely
   */
  async moveTournamentToPast(tournamentId: number): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const config = getConfig();
      const packageId = this.getPackageId();
      const adminCapId = config.contracts.tournamentAdminCap;
      const registryId = config.contracts.tournamentRegistry;

      if (!packageId || !adminCapId || !registryId) {
        return {
          success: false,
          error: 'Tournament contract addresses not configured',
        };
      }

      // Get tournament object ID first
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

      const adminWallet = getAdminWalletService();
      const network = config.sui.network;
      const client = network === 'testnet'
        ? adminWallet.getTestnetClient()
        : adminWallet.getMainnetClient();

      const { Transaction } = await import('@mysten/sui/transactions');
      const { executeTransactionWithFinalization } = await import('./transaction-helpers');

      const txb = new Transaction();
      txb.setSender(adminWallet.getAddress());

      // Call move_tournament_to_past
      txb.moveCall({
        target: `${packageId}::tournaments::move_tournament_to_past`,
        arguments: [
          txb.object(registryId),
          txb.object(tournament.objectId),
          txb.object(adminCapId),
          txb.object('0x6'), // Clock
        ],
      });

      txb.setGasBudget(config.sui.gasBudget || 10_000_000);

      const result = await executeTransactionWithFinalization(
        client,
        adminWallet.getKeypair(),
        txb,
        {
          logger: {
            info: (msg, data) => BadgeLogger.info(`🏆 [TOURNAMENT SERVICE] ${msg}`, data),
            warn: (msg, data) => BadgeLogger.warn(`🏆 [TOURNAMENT SERVICE] ${msg}`, data),
            error: (msg, data) => BadgeLogger.error(`🏆 [TOURNAMENT SERVICE] ${msg}`, data),
          },
        }
      );

      // Verify transaction succeeded
      if (result.effects?.status?.status === 'success') {
        BadgeLogger.info('🏆 [TOURNAMENT SERVICE] Tournament moved to past table', {
          tournamentId,
          digest: result.digest,
        });
        return {
          success: true,
        };
      } else {
        const errorMsg = result.effects?.status?.error || 'Transaction did not succeed';
        BadgeLogger.error('🏆 [TOURNAMENT SERVICE] Failed to move tournament to past', {
          tournamentId,
          error: errorMsg,
        });
        return {
          success: false,
          error: `Failed to move tournament: ${errorMsg}`,
        };
      }
    } catch (error) {
      BadgeLogger.error('🏆 [TOURNAMENT SERVICE] Error moving tournament to past', {
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
   * Get tournaments by their IDs (including past tournaments)
   * Used for "My Tournaments" to get all tournaments a player has entered
   */
  async getTournamentsByIds(tournamentIds: number[]): Promise<Tournament[]> {
    if (tournamentIds.length === 0) {
      return [];
    }

    try {
      // Query TournamentCreated events
      const events = await this.client.queryEvents({
        query: {
          MoveModule: {
            package: this.getPackageId(),
            module: 'tournaments',
          },
        },
        limit: 1000,
        order: 'descending',
      });

      const tournamentIdSet = new Set(tournamentIds);
      const tournaments: Tournament[] = [];

      // Process events and get tournament objects
      const tournamentPromises = events.data
        .filter((event: any) => event.type?.includes('TournamentCreated'))
        .map(async (event: any) => {
          try {
            const eventData = event.parsedJson as any;
            const eventTournamentId = Number(eventData.tournament_id);
            
            // Only process tournaments the player has entered
            if (!tournamentIdSet.has(eventTournamentId)) {
              return null;
            }

            let tournament: Tournament | undefined;
            
            // Check if event data contains object ID
            if (eventData && eventData.tournament_object_id) {
              const objectId = eventData.tournament_object_id;
              const fullTournament = await this.getTournament(objectId);
              if (fullTournament.success && fullTournament.tournament) {
                tournament = fullTournament.tournament;
              }
            } else {
              // Fall back to finding from transaction
              tournament = await this.findTournamentFromEvents(event.id.txDigest);
              if (tournament) {
                const fullTournament = await this.getTournament(tournament.objectId);
                if (fullTournament.success && fullTournament.tournament) {
                  tournament = fullTournament.tournament;
                }
              }
            }
            
            return tournament || null;
          } catch (error) {
            BadgeLogger.warn('Error processing tournament event for my tournaments', {
              txDigest: event.id?.txDigest,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
            return null;
          }
        });

      const results = await Promise.allSettled(tournamentPromises);
      
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          tournaments.push(result.value);
        }
      }

      // Sort by end time (most recent first)
      tournaments.sort((a, b) => b.endTime - a.endTime);

      return tournaments;
    } catch (error) {
      BadgeLogger.error('Error getting tournaments by IDs', {
        tournamentIds,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Enter tournament for a player (admin wallet pays gas)
   * This provides smooth UX where admin pays for gas fees
   */
  async enterTournamentForPlayer(
    playerAddress: string,
    tournamentObjectId: string,
    ticketId: number
  ): Promise<{ success: boolean; transactionDigest?: string; error?: string }> {
    try {
      BadgeLogger.info('🏆 [TOURNAMENT ENTRY] Starting tournament entry', {
        playerAddress,
        tournamentObjectId,
        ticketId,
      });

      const packageId = this.getPackageId();
      const gamePassSystemId = this.getGamePassSystemId();
      const adminCapId = this.getTournamentAdminCapId();

      if (!gamePassSystemId) {
        BadgeLogger.error('🏆 [TOURNAMENT ENTRY] Game pass system not configured');
        return {
          success: false,
          error: 'Game pass system not configured',
        };
      }

      if (!adminCapId) {
        BadgeLogger.error('🏆 [TOURNAMENT ENTRY] Tournament admin capability not configured');
        return {
          success: false,
          error: 'Tournament admin capability not configured',
        };
      }

      BadgeLogger.info('🏆 [TOURNAMENT ENTRY] Configuration verified', {
        packageId,
        gamePassSystemId,
        adminCapId,
      });

      // Get the appropriate client based on network
      const client = this.config.sui.network === 'testnet'
        ? this.adminWallet.getTestnetClient()
        : this.adminWallet.getMainnetClient();

      const txb = new Transaction();

      // Use admin function to enter tournament for player
      // This will:
      // 1. Call consume_tournament_ticket() to remove ticket from GamePass
      // 2. Add player to tournament.participants table
      // 3. Initialize leaderboard entry with score 0
      // 4. Emit TournamentEntered event
      txb.moveCall({
        target: `${packageId}::tournaments::enter_tournament_for_user`,
        arguments: [
          txb.object(adminCapId),
          txb.object(tournamentObjectId),
          txb.object(gamePassSystemId),
          txb.pure.address(playerAddress),
          txb.pure.u64(ticketId),
          txb.object('0x6'), // Clock
        ],
      });

      // Set sender (admin wallet)
      txb.setSender(this.adminWallet.getAddress());

      // Set gas budget
      txb.setGasBudget(this.config.sui.gasBudget);

      BadgeLogger.info('🏆 [TOURNAMENT ENTRY] Transaction built, signing and executing...');

      // Build transaction
      const transactionBytes = await txb.build({ client });

      // Sign and execute with admin wallet
      const result = await client.signAndExecuteTransaction({
        signer: this.adminWallet.getKeypair(),
        transaction: transactionBytes,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      BadgeLogger.info('🏆 [TOURNAMENT ENTRY] Transaction executed', {
        transactionDigest: result.digest,
        hasEffects: !!result.effects,
        hasEvents: !!result.events,
        eventsCount: result.events?.length || 0,
      });

      // Check for TournamentEntered event
      const enteredEvent = result.events?.find((e: any) => 
        e.type?.includes('TournamentEntered')
      );

      if (enteredEvent) {
        const eventData = enteredEvent.parsedJson as any;
        BadgeLogger.info('🏆 [TOURNAMENT ENTRY] TournamentEntered event found', {
          tournamentId: eventData.tournament_id,
          player: eventData.player,
          ticketId: eventData.ticket_id,
          ticketValueUsdCents: eventData.ticket_value_usd_cents,
          timestamp: eventData.timestamp,
        });
      } else {
        BadgeLogger.warn('🏆 [TOURNAMENT ENTRY] No TournamentEntered event found in transaction', {
          transactionDigest: result.digest,
          events: result.events?.map((e: any) => e.type),
        });
      }

      // CRITICAL: Check if transaction actually succeeded
      const transactionStatus = result.effects?.status?.status;
      const isSuccess = transactionStatus === 'success';
      
      BadgeLogger.info('🏆 [TOURNAMENT ENTRY] Transaction status check', {
        transactionDigest: result.digest,
        status: transactionStatus,
        isSuccess,
      });
      
      if (!isSuccess) {
        // Transaction failed - extract error information
        const errorStatus = result.effects?.status;
        let errorMessage = `Transaction failed with status: ${transactionStatus}`;
        
        if (errorStatus && typeof errorStatus === 'object' && 'error' in errorStatus) {
          const errorInfo = (errorStatus as any).error;
          errorMessage = typeof errorInfo === 'string' 
            ? errorInfo 
            : `Transaction error: ${JSON.stringify(errorInfo)}`;
        }
        
        BadgeLogger.error('🏆 [TOURNAMENT ENTRY] Transaction failed', {
          transactionDigest: result.digest,
          status: transactionStatus,
          errorStatus,
          errorMessage,
          effects: JSON.stringify(result.effects),
        });
        
        return {
          success: false,
          error: errorMessage,
          transactionDigest: result.digest, // Still return digest for debugging
        };
      }

      // Check for Move abort errors in effects
      if (result.effects?.status && typeof result.effects.status === 'object' && 'error' in result.effects.status) {
        const errorInfo = (result.effects.status as any).error;
        BadgeLogger.error('🏆 [TOURNAMENT ENTRY] Transaction aborted', {
          transactionDigest: result.digest,
          errorInfo,
        });
        return {
          success: false,
          error: `Transaction aborted: ${JSON.stringify(errorInfo)}`,
          transactionDigest: result.digest,
        };
      }

      // Verify ticket was consumed by checking if ticket count decreased
      // (This is a sanity check - the event is the source of truth)
      BadgeLogger.info('🏆 [TOURNAMENT ENTRY] Transaction succeeded - ticket consumed and player entered', {
        transactionDigest: result.digest,
        playerAddress,
        tournamentObjectId,
        ticketId,
        hasEnteredEvent: !!enteredEvent,
      });

      return {
        success: true,
        transactionDigest: result.digest,
      };
    } catch (error) {
      BadgeLogger.error('🏆 [TOURNAMENT ENTRY] Exception during tournament entry', {
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
   * Update tournament score (executes transaction)
   * Accepts all game stats but only tracks category value in leaderboard
   */
  async updateTournamentScore(
    tournamentObjectId: string,
    playerAddress: string,
    playerName: string,  // Player name (for leaderboard display)
    category: Tournament['category'],
    categoryValue: number,  // Value for the tournament category
    scoreData: {
      score: number;
      distance: number;
      coins: number;
      bossesDefeated: number;
      enemiesDefeated: number;
      longestCoinStreak: number;
    }
  ): Promise<{ success: boolean; digest?: string; error?: string }> {
    try {
      const packageId = this.getPackageId();
      const adminCapId = this.getTournamentAdminCapId();

      if (!adminCapId) {
        return {
          success: false,
          error: 'Tournament admin capability not configured',
        };
      }

      // Get the appropriate client based on network
      const client = this.config.sui.network === 'testnet'
        ? this.adminWallet.getTestnetClient()
        : this.adminWallet.getMainnetClient();

      const txb = new Transaction();

      // Convert player name to vector<u8> (bytes)
      const nameBytes = new TextEncoder().encode(playerName || '');

      txb.moveCall({
        target: `${packageId}::tournaments::update_tournament_score`,
        arguments: [
          txb.object(adminCapId),
          txb.object(tournamentObjectId),
          txb.pure.address(playerAddress),
          txb.pure.vector('u8', nameBytes),  // Player name as vector<u8>
          txb.pure.u64(categoryValue),  // Category value (for leaderboard)
          txb.pure.u64(scoreData.score),
          txb.pure.u64(scoreData.distance),
          txb.pure.u64(scoreData.coins),
          txb.pure.u64(scoreData.bossesDefeated),
          txb.pure.u64(scoreData.enemiesDefeated),
          txb.pure.u64(scoreData.longestCoinStreak),
          txb.object('0x6'), // Clock
        ],
      });

      // Set sender (admin wallet)
      txb.setSender(this.adminWallet.getAddress());

      // Set gas budget
      txb.setGasBudget(this.config.sui.gasBudget);

      // Build transaction
      const transactionBytes = await txb.build({ client });

      // Sign and execute with admin wallet
      const result = await client.signAndExecuteTransaction({
        signer: this.adminWallet.getKeypair(),
        transaction: transactionBytes,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      // Check for TournamentScoreUpdated event
      const scoreUpdatedEvent = result.events?.find((e: any) => 
        e.type?.includes('TournamentScoreUpdated')
      );

      if (scoreUpdatedEvent) {
        const eventData = scoreUpdatedEvent.parsedJson as any;
        BadgeLogger.info('🏆 [TOURNAMENT SCORE] TournamentScoreUpdated event emitted', {
          transactionDigest: result.digest,
          tournamentId: eventData.tournament_id,
          tournamentObjectId,
          player: eventData.player,
          playerAddress,
          category: eventData.category,
          categoryValue,
          value: eventData.value,
          scoreData,
          fullEventData: eventData,
          allEvents: result.events?.map((e: any) => ({ type: e.type, parsedJson: e.parsedJson })),
        });
      } else {
        BadgeLogger.warn('🏆 [TOURNAMENT SCORE] No TournamentScoreUpdated event found in transaction', {
          transactionDigest: result.digest,
          tournamentObjectId,
          playerAddress,
          categoryValue,
          events: result.events?.map((e: any) => e.type),
          allEvents: result.events?.map((e: any) => ({ type: e.type, parsedJson: e.parsedJson })),
        });
      }

      return {
        success: true,
        digest: result.digest,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Build transaction to update tournament score (deprecated - use updateTournamentScore instead)
   * @deprecated Use updateTournamentScore() instead
   */
  async buildUpdateScoreTransaction(
    tournamentObjectId: string,
    playerAddress: string,
    value: number
  ): Promise<{ success: boolean; transaction?: string; error?: string }> {
    // For backward compatibility, extract category from tournament
    const tournament = await this.getTournament(tournamentObjectId);
    if (!tournament.success || !tournament.tournament) {
      return {
        success: false,
        error: 'Tournament not found',
      };
    }

    // Create minimal scoreData (backward compatibility)
    const scoreData = {
      score: tournament.tournament?.category === 'highestScore' ? value : 0,
      distance: tournament.tournament?.category === 'longestDistance' ? value : 0,
      coins: tournament.tournament?.category === 'totalCoins' ? value : 0,
      bossesDefeated: tournament.tournament?.category === 'mostBosses' ? value : 0,
      enemiesDefeated: tournament.tournament?.category === 'mostEnemies' ? value : 0,
      longestCoinStreak: tournament.tournament?.category === 'longestStreak' ? value : 0,
    };

    const result = await this.updateTournamentScore(
      tournamentObjectId,
      playerAddress,
      '',  // Empty player name for backward compatibility (deprecated function)
      tournament.tournament.category,
      value,
      scoreData
    );

    return {
      success: result.success,
      transaction: result.digest,
      error: result.error,
    };
  }

  /**
   * Get tournament leaderboard
   * Queries TournamentScoreUpdated events and reconstructs leaderboard
   */
  async getTournamentLeaderboard(
    tournamentObjectId: string,
    limit: number = 100
  ): Promise<{ success: boolean; leaderboard?: LeaderboardEntry[]; error?: string }> {
    try {
      BadgeLogger.info('🏆 [LEADERBOARD SERVICE] Starting leaderboard fetch', {
        tournamentObjectId,
        limit,
      });

      // Get tournament ID from tournament object
      const tournament = await this.getTournament(tournamentObjectId);
      if (!tournament.success || !tournament.tournament) {
        BadgeLogger.error('🏆 [LEADERBOARD SERVICE] Tournament not found', {
          tournamentObjectId,
          error: tournament.error,
        });
        return {
          success: false,
          error: 'Tournament not found',
        };
      }

      const tournamentId = tournament.tournament.tournamentId;
      const tournamentName = tournament.tournament.name;
      const tournamentCategory = tournament.tournament.category;

      BadgeLogger.info('🏆 [LEADERBOARD SERVICE] Tournament details', {
        tournamentObjectId,
        tournamentId,
        tournamentName,
        category: tournamentCategory,
      });

      // Try reading from leaderboard table first (preferred method)
      let scoreMap = new Map<string, number>();
      let nameMap = new Map<string, string>();
      let statsMap = new Map<string, {
        score: number;
        distance: number;
        coins: number;
        bossesDefeated: number;
        enemiesDefeated: number;
        longestCoinStreak: number;
        timestamp: number;
      }>();
      let useTableReading = false;

      try {
        // Get tournament object to access leaderboard table
        const tournamentObj = await this.client.getObject({
          id: tournamentObjectId,
          options: { showContent: true },
        });

        if (tournamentObj.data?.content) {
          const fields = (tournamentObj.data.content as any).fields;
          const leaderboardTableId = fields.leaderboard?.fields?.id?.id || null;

          if (leaderboardTableId) {
            BadgeLogger.info('🏆 [LEADERBOARD SERVICE] Reading leaderboard from table', {
              tournamentObjectId,
              tournamentId,
              leaderboardTableId,
            });

            const leaderboardFields = await this.client.getDynamicFields({
              parentId: leaderboardTableId,
              limit: limit * 2, // Get more than needed for sorting
            });

            BadgeLogger.debug('🏆 [LEADERBOARD SERVICE] Found leaderboard entries in table', {
              tournamentObjectId,
              tournamentId,
              count: leaderboardFields.data.length,
            });

            // Read each player's score from the table
            for (const field of leaderboardFields.data) {
              try {
                // Extract player address from field name
                const playerAddress = typeof field.name === 'object' && 'value' in field.name
                  ? String(field.name.value)
                  : String(field.name);

                // Read the LeaderboardEntry (value + player_name) using getDynamicFieldObject
                // This is more reliable than getObject for dynamic field values
                let entryFields: any = {};
                try {
                  const dynamicFieldObj = await this.client.getDynamicFieldObject({
                    parentId: leaderboardTableId,
                    name: field.name,
                  });
                  
                  if (dynamicFieldObj.data?.content) {
                    const content = dynamicFieldObj.data.content as any;
                    // LeaderboardEntry is stored directly in the dynamic field
                    // Structure can vary:
                    // 1. { fields: { value: u64, player_name: vector<u8> } }
                    // 2. { value: { fields: { value: u64, player_name: vector<u8> } } }
                    // 3. { value: u64, player_name: vector<u8> } (direct struct fields)
                    // 4. The LeaderboardEntry struct itself might be wrapped
                    
                    BadgeLogger.debug('🏆 [LEADERBOARD SERVICE] getDynamicFieldObject content structure', {
                      tournamentObjectId,
                      tournamentId,
                      playerAddress,
                      contentType: dynamicFieldObj.data.type,
                      contentKeys: Object.keys(content),
                      hasFields: !!content.fields,
                      hasValue: !!content.value,
                      contentStructure: JSON.stringify(content, null, 2).substring(0, 500),
                    });
                    
                    // Sui structs are typically returned as: { fields: { field1: value1, field2: value2 } }
                    // For LeaderboardEntry: { fields: { value: u64, player_name: vector<u8> } }
                    if (content.fields) {
                      entryFields = content.fields;
                    } else if (content.value?.fields) {
                      entryFields = content.value.fields;
                    } else if (content.value && typeof content.value === 'object') {
                      // Check if content.value is the LeaderboardEntry struct itself
                      if ('value' in content.value || 'player_name' in content.value) {
                        entryFields = content.value;
                      } else if (content.value.fields) {
                        entryFields = content.value.fields;
                      } else {
                        entryFields = content.value;
                      }
                    } else if ('value' in content || 'player_name' in content) {
                      // Struct fields directly in content (unlikely but possible)
                      entryFields = content;
                    } else {
                      entryFields = {};
                    }
                  }
                } catch (dynamicFieldError) {
                  // Fallback to direct object read if getDynamicFieldObject fails
                  BadgeLogger.debug('🏆 [LEADERBOARD SERVICE] getDynamicFieldObject failed, trying direct object read', {
                    tournamentObjectId,
                    tournamentId,
                    playerAddress,
                    error: dynamicFieldError instanceof Error ? dynamicFieldError.message : String(dynamicFieldError),
                  });
                  
                  const entryObj = await this.client.getObject({
                    id: field.objectId,
                    options: { showContent: true },
                  });
                  
                  if (entryObj.data?.content) {
                    const content = entryObj.data.content as any;
                    // LeaderboardEntry structure: { fields: { value: u64, player_name: vector<u8> } }
                    // When reading directly via getObject, the struct fields are in content.fields
                    if (content.fields) {
                      entryFields = content.fields;
                    } else if (content.value?.fields) {
                      entryFields = content.value.fields;
                    } else if (content.value && typeof content.value === 'object') {
                      if ('value' in content.value || 'player_name' in content.value) {
                        entryFields = content.value;
                      } else if (content.value.fields) {
                        entryFields = content.value.fields;
                      } else {
                        entryFields = content.value;
                      }
                    } else if ('value' in content || 'player_name' in content) {
                      entryFields = content;
                    } else {
                      entryFields = {};
                    }
                    
                    BadgeLogger.debug('🏆 [LEADERBOARD SERVICE] getObject (direct) content structure', {
                      tournamentObjectId,
                      tournamentId,
                      playerAddress,
                      objectType: entryObj.data.type,
                      contentKeys: Object.keys(content),
                      hasFields: !!content.fields,
                      fieldsKeys: content.fields ? Object.keys(content.fields) : [],
                      fieldsValue: content.fields?.value,
                      contentStructure: JSON.stringify(content, null, 2).substring(0, 500),
                    });
                  }
                }

                // Handle different response structures
                let score = 0;
                let playerName = '';
                
                if (entryFields) {
                  // Try to extract score from various possible structures
                  // LeaderboardEntry has: { value: u64, player_name: vector<u8> }
                  // Note: Sui u64 values are often returned as strings to avoid JS precision issues
                  // Structure can be:
                  // 1. entryFields.value (direct u64)
                  // 2. entryFields.fields.value (struct fields)
                  // 3. entryFields.value.fields.value (nested LeaderboardEntry object)
                  let rawValue: any = undefined;
                  
                  // Try direct access first (most common case)
                  if (entryFields.value !== undefined && entryFields.value !== null) {
                    // Check if value is a primitive (number/string) or an object
                    if (typeof entryFields.value === 'object' && entryFields.value !== null) {
                      // It's an object - check if it has fields.value (nested LeaderboardEntry)
                      if (entryFields.value.fields?.value !== undefined && entryFields.value.fields.value !== null) {
                        rawValue = entryFields.value.fields.value;
                      } else if (entryFields.value.value !== undefined && entryFields.value.value !== null) {
                        rawValue = entryFields.value.value;
                      }
                    } else {
                      // It's a primitive value
                      rawValue = entryFields.value;
                    }
                  } else if (entryFields.fields?.value !== undefined && entryFields.fields.value !== null) {
                    rawValue = entryFields.fields.value;
                  } else if (typeof entryFields === 'object' && 'value' in entryFields) {
                    rawValue = (entryFields as any).value;
                  }
                  
                  // Log if we couldn't find the value
                  if (rawValue === undefined && entryFields && Object.keys(entryFields).length > 0) {
                    BadgeLogger.debug('🏆 [LEADERBOARD SERVICE] Value not found in expected locations', {
                      tournamentObjectId,
                      tournamentId,
                      playerAddress,
                      entryFieldsKeys: Object.keys(entryFields),
                      entryFieldsHasValue: 'value' in entryFields,
                      entryFieldsValue: entryFields.value,
                      entryFieldsStructure: JSON.stringify(entryFields, null, 2).substring(0, 300),
                    });
                  }
                  
                  // Convert to number, handling both string and number formats
                  if (rawValue !== undefined && rawValue !== null) {
                    if (typeof rawValue === 'string') {
                      // Handle string representation of number
                      const parsed = parseInt(rawValue, 10);
                      score = isNaN(parsed) ? 0 : parsed;
                    } else if (typeof rawValue === 'number') {
                      score = isNaN(rawValue) ? 0 : rawValue;
                    } else if (typeof rawValue === 'bigint') {
                      score = Number(rawValue);
                    } else {
                      // Try to convert anyway
                      score = Number(rawValue);
                      if (isNaN(score)) {
                        score = 0;
                        BadgeLogger.warn('🏆 [LEADERBOARD SERVICE] Could not parse score value', {
                          tournamentObjectId,
                          tournamentId,
                          playerAddress,
                          rawValue,
                          rawValueType: typeof rawValue,
                          entryFieldsKeys: Object.keys(entryFields),
                        });
                      }
                    }
                  }
                  
                  // Extract player name from LeaderboardEntry
                  // Structure can be:
                  // 1. entryFields.player_name (direct)
                  // 2. entryFields.fields.player_name (struct fields)
                  // 3. entryFields.value.fields.player_name (nested LeaderboardEntry object)
                  let nameSource: any = undefined;
                  if (entryFields.player_name) {
                    nameSource = entryFields.player_name;
                  } else if (entryFields.fields?.player_name) {
                    nameSource = entryFields.fields.player_name;
                  } else if (entryFields.value?.fields?.player_name) {
                    nameSource = entryFields.value.fields.player_name;
                  } else if (entryFields.value?.player_name) {
                    nameSource = entryFields.value.player_name;
                  }
                  
                  if (nameSource) {
                    if (Array.isArray(nameSource)) {
                      const uint8Array = new Uint8Array(nameSource);
                      playerName = new TextDecoder().decode(uint8Array).trim();
                    } else if (typeof nameSource === 'string') {
                      playerName = nameSource.trim();
                    }
                  }
                  
                  // Always log the structure for debugging (especially if score is 0 or NaN)
                  if (score === 0 || isNaN(score)) {
                    BadgeLogger.warn('🏆 [LEADERBOARD SERVICE] Score extraction issue - logging full structure', {
                      tournamentObjectId,
                      tournamentId,
                      playerAddress,
                      extractedScore: score,
                      rawValue: rawValue,
                      rawValueType: typeof rawValue,
                      entryFieldsKeys: entryFields ? Object.keys(entryFields) : [],
                      entryFieldsStructure: entryFields ? JSON.stringify(entryFields, null, 2).substring(0, 1000) : 'null',
                    });
                  }
                }

                // Always include entries, even with score 0 (participants who haven't submitted scores yet)
                // This ensures participants are shown in the leaderboard even before they submit scores
                scoreMap.set(playerAddress, score);
                if (playerName) {
                  nameMap.set(playerAddress.toLowerCase(), playerName);
                }
                
                // Always log the extraction result for debugging
                BadgeLogger.info('🏆 [LEADERBOARD SERVICE] Read leaderboard entry from table', {
                  tournamentObjectId,
                  tournamentId,
                  playerAddress,
                  extractedScore: score,
                  hasName: !!playerName,
                  playerName: playerName || '(none)',
                  entryFieldsKeys: entryFields ? Object.keys(entryFields) : [],
                  entryFieldsHasValue: entryFields ? 'value' in entryFields : false,
                  entryFieldsValue: entryFields?.value,
                  entryFieldsValueType: typeof entryFields?.value,
                  entryFieldsStructure: entryFields ? JSON.stringify(entryFields, null, 2).substring(0, 800) : 'null',
                });
              } catch (fieldError) {
                BadgeLogger.debug('🏆 [LEADERBOARD SERVICE] Error reading leaderboard entry', {
                  tournamentObjectId,
                  tournamentId,
                  fieldName: field.name,
                  error: fieldError instanceof Error ? fieldError.message : String(fieldError),
                });
              }
            }

            if (scoreMap.size > 0) {
              useTableReading = true;
              BadgeLogger.info('🏆 [LEADERBOARD SERVICE] Successfully read leaderboard from table', {
                tournamentObjectId,
                tournamentId,
                entryCount: scoreMap.size,
              });
            } else {
              BadgeLogger.info('🏆 [LEADERBOARD SERVICE] Leaderboard table is empty (no scores yet)', {
                tournamentObjectId,
                tournamentId,
              });
              useTableReading = true; // Still mark as using table reading, just empty
            }
          } else {
            BadgeLogger.warn('🏆 [LEADERBOARD SERVICE] No leaderboard table found in tournament object', {
              tournamentObjectId,
              tournamentId,
              hasLeaderboardField: !!fields.leaderboard,
            });
            // Return empty leaderboard if table doesn't exist
            return {
              success: true,
              leaderboard: [],
            };
          }
        }
      } catch (tableError) {
        BadgeLogger.error('🏆 [LEADERBOARD SERVICE] Error reading leaderboard table from on-chain data', {
          tournamentObjectId,
          tournamentId,
          error: tableError instanceof Error ? tableError.message : String(tableError),
          stack: tableError instanceof Error ? tableError.stack : undefined,
        });
        return {
          success: false,
          error: `Failed to read leaderboard from on-chain table: ${tableError instanceof Error ? tableError.message : 'Unknown error'}`,
        };
      }

      // Only use table reading - no event fallback
      // If table reading failed, return error
      if (!useTableReading) {
        BadgeLogger.error('🏆 [LEADERBOARD SERVICE] Failed to read leaderboard from on-chain table', {
          tournamentObjectId,
          tournamentId,
          tournamentName,
        });
        return {
          success: false,
          error: 'Failed to read leaderboard from on-chain table. Tournament may not have any scores yet.',
        };
      }

      BadgeLogger.info('🏆 [LEADERBOARD SERVICE] Table reading summary', {
        tournamentObjectId,
        tournamentId,
        tournamentName,
        uniquePlayersInScoreMap: scoreMap.size,
        playerNamesFound: nameMap.size,
      });
      
      BadgeLogger.info('🏆 [LEADERBOARD SERVICE] Score map summary', {
        tournamentObjectId,
        tournamentId,
        tournamentName,
        category: tournamentCategory,
        uniquePlayers: scoreMap.size,
        scoreMapEntries: Array.from(scoreMap.entries()).map(([addr, val]) => {
          const stats = statsMap.get(addr);
          return {
            playerAddress: addr,
            value: val,
            stats: stats || null,
            timestampDate: stats?.timestamp ? new Date(Number(stats.timestamp)).toISOString() : null,
          };
        }),
        tieBreakingNote: `Tie-breaking: Players with the same ${tournamentCategory} value are ranked by category-specific secondary and tertiary stats`,
      });

      // Category-specific tie-breaking function
      const getTieBreaker = (category: Tournament['category']) => {
        return (a: { value: number; stats?: { score: number; distance: number; coins: number; bossesDefeated: number; enemiesDefeated: number; longestCoinStreak: number; timestamp: number } }, 
                b: { value: number; stats?: { score: number; distance: number; coins: number; bossesDefeated: number; enemiesDefeated: number; longestCoinStreak: number; timestamp: number } }) => {
          const statsA = a.stats || { score: 0, distance: 0, coins: 0, bossesDefeated: 0, enemiesDefeated: 0, longestCoinStreak: 0, timestamp: Infinity };
          const statsB = b.stats || { score: 0, distance: 0, coins: 0, bossesDefeated: 0, enemiesDefeated: 0, longestCoinStreak: 0, timestamp: Infinity };
          
          switch (category) {
            case 'longestStreak':
              // Primary: longest_coin_streak (already compared in value), Secondary: coins, Tertiary: score
              // Note: value === longest_coin_streak for this category, so we only compare secondary/tertiary
              if (statsA.coins !== statsB.coins) {
                return statsB.coins - statsA.coins;
              }
              if (statsA.score !== statsB.score) {
                return statsB.score - statsA.score;
              }
              // Final tie-breaker: timestamp (earliest wins)
              return statsA.timestamp - statsB.timestamp;
              
            case 'totalCoins':
              // Primary: coins (already compared in value), Secondary: score, Tertiary: distance
              if (statsA.score !== statsB.score) {
                return statsB.score - statsA.score;
              }
              if (statsA.distance !== statsB.distance) {
                return statsB.distance - statsA.distance;
              }
              // Final tie-breaker: timestamp (earliest wins)
              return statsA.timestamp - statsB.timestamp;
              
            case 'highestScore':
              // Primary: score (already compared in value), Secondary: coins, Tertiary: distance
              if (statsA.coins !== statsB.coins) {
                return statsB.coins - statsA.coins;
              }
              if (statsA.distance !== statsB.distance) {
                return statsB.distance - statsA.distance;
              }
              // Final tie-breaker: timestamp (earliest wins)
              return statsA.timestamp - statsB.timestamp;
              
            case 'longestDistance':
              // Primary: distance (already compared in value), Secondary: score, Tertiary: enemies_defeated
              if (statsA.score !== statsB.score) {
                return statsB.score - statsA.score;
              }
              if (statsA.enemiesDefeated !== statsB.enemiesDefeated) {
                return statsB.enemiesDefeated - statsA.enemiesDefeated;
              }
              // Final tie-breaker: timestamp (earliest wins)
              return statsA.timestamp - statsB.timestamp;
              
            case 'mostBosses':
              // Primary: bosses_defeated (already compared in value), Secondary: score, Tertiary: enemies_defeated
              if (statsA.score !== statsB.score) {
                return statsB.score - statsA.score;
              }
              if (statsA.enemiesDefeated !== statsB.enemiesDefeated) {
                return statsB.enemiesDefeated - statsA.enemiesDefeated;
              }
              // Final tie-breaker: timestamp (earliest wins)
              return statsA.timestamp - statsB.timestamp;
              
            case 'mostEnemies':
              // Primary: enemies_defeated (already compared in value), Secondary: score, Tertiary: bosses_defeated
              if (statsA.score !== statsB.score) {
                return statsB.score - statsA.score;
              }
              if (statsA.bossesDefeated !== statsB.bossesDefeated) {
                return statsB.bossesDefeated - statsA.bossesDefeated;
              }
              // Final tie-breaker: timestamp (earliest wins)
              return statsA.timestamp - statsB.timestamp;
              
            default:
              // Fallback: timestamp (earliest wins)
              return statsA.timestamp - statsB.timestamp;
          }
        };
      };
      
      // Convert to leaderboard entries with stats
      const entriesWithStats = Array.from(scoreMap.entries())
        .map(([playerAddress, value]) => ({
          rank: 0, // Will be set after sorting
          playerAddress,
          value,
          displayValue: value.toLocaleString(),
          stats: statsMap.get(playerAddress),
        }));
      
      // Check for ties before sorting
      const valueCounts = new Map<number, number>();
      entriesWithStats.forEach(entry => {
        valueCounts.set(entry.value, (valueCounts.get(entry.value) || 0) + 1);
      });
      const ties = Array.from(valueCounts.entries())
        .filter(([value, count]) => count > 1)
        .map(([value, count]) => ({ value, count }));
      
      if (ties.length > 0) {
        BadgeLogger.info('🏆 [LEADERBOARD SERVICE] Ties detected - will use category-specific tie-breaking', {
          tournamentObjectId,
          tournamentId,
          tournamentName,
          category: tournamentCategory,
          ties: ties.map(t => ({
            score: t.value,
            playersWithThisScore: t.count,
            tieBreakingStrategy: this.getTieBreakingStrategyDescription(tournament?.tournament?.category || 'highestScore'),
          })),
        });
      }
      
      // Sort with category-specific tie-breaking
      const tieBreaker = getTieBreaker(tournamentCategory);
      const entries: LeaderboardEntry[] = entriesWithStats
        .sort((a, b) => {
          // Primary sort: by category value (descending - higher values first)
          if (b.value !== a.value) {
            return b.value - a.value;
          }
          // Tie-breaker: category-specific secondary and tertiary stats
          return tieBreaker(a, b);
        })
        .slice(0, limit)
        .map((entry, index) => {
          // Remove stats from final entry (not needed in response)
          const { stats, ...entryWithoutStats } = entry;
          return {
            ...entryWithoutStats,
            rank: index + 1,
          };
        });

      BadgeLogger.info('🏆 [LEADERBOARD SERVICE] Player name extraction summary', {
        tournamentObjectId,
        tournamentId,
        tournamentName,
        totalNamesExtracted: nameMap.size,
        nameMapEntries: Array.from(nameMap.entries()).map(([addr, name]) => ({
          playerAddress: addr,
          playerName: name,
        })),
        playersWithoutNames: entries.filter(e => !nameMap.has(e.playerAddress.toLowerCase())).map(e => e.playerAddress),
        note: 'Player names are now extracted directly from TournamentScoreUpdated events, ensuring names match the tournament game submissions.',
      });

      // Add player names to entries
      const entriesWithNames = entries.map(entry => ({
        ...entry,
        playerName: nameMap.get(entry.playerAddress.toLowerCase()),
      }));

      BadgeLogger.info('🏆 [LEADERBOARD SERVICE] Final leaderboard with names', {
        tournamentObjectId,
        tournamentId,
        tournamentName,
        totalEntries: entriesWithNames.length,
        entriesWithNames: entriesWithNames.map(e => ({
          rank: e.rank,
          playerAddress: e.playerAddress,
          playerName: e.playerName || '(no name)',
          value: e.value,
          displayValue: e.displayValue,
        })),
      });

      return {
        success: true,
        leaderboard: entriesWithNames,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
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
   * Build tournament creation transaction for user (with payment)
   * Uses PaymentTransactionBuilder for consistent payment handling
   * 
   * @param config - Tournament configuration
   * @param paymentConfig - Payment configuration (USD amounts and token type)
   * @returns Unsigned transaction bytes (base64 encoded) for frontend to sign
   */
  async buildTournamentCreationTransaction(
    config: {
      name: string;
      category: Tournament['category'];
      startTime: number;  // Unix timestamp (milliseconds)
      endTime: number;    // Unix timestamp (milliseconds)
      entryFeeTickets: number;
      rewardConfig?: RewardCostConfig | null;
      startingAnteUSDCents: number;
      creationFeeUSDCents: number;
      rewardCostUSDCents: number; // Cost of custom rewards (0 if using default)
    },
    paymentConfig: {
      playerAddress: string;
      paymentToken: PaymentToken;
    }
  ): Promise<{
    success: boolean;
    transaction?: string; // Base64 encoded transaction bytes
    gasEstimate?: string;
    error?: string;
  }> {
    try {
      const packageId = this.getPackageId();
      const registryId = this.getTournamentRegistryId();

      if (!registryId) {
        return {
          success: false,
          error: 'Tournament registry not configured',
        };
      }

      // Calculate total payment in USD
      const totalUSD = (
        config.creationFeeUSDCents +
        config.startingAnteUSDCents +
        config.rewardCostUSDCents
      ) / 100; // Convert cents to dollars

      // Convert USD to tokens
      const tokenConversion = await priceConverter.convertUSDToToken(
        totalUSD,
        paymentConfig.paymentToken
      );

      if (!tokenConversion.success || !tokenConversion.tokenAmount) {
        return {
          success: false,
          error: tokenConversion.error || 'Failed to convert USD to tokens',
        };
      }

      // Get admin wallet address for payment recipient
      const adminAddress = this.adminWallet.getAddress();

      // Create payment transaction builder
      const paymentBuilder = createPaymentTransactionBuilder(this.client);

      // Convert name to vector<u8>
      const nameBytes = new TextEncoder().encode(config.name);

      // Pre-fetch default reward config if needed (for when custom rewards are not provided)
      let defaultRewardConfig: Awaited<ReturnType<typeof this.getDefaultRewardConfig>> | null = null;
      const hasCustomRewards = config.rewardConfig && Object.keys(config.rewardConfig.itemRewards || {}).length > 0;
      if (!hasCustomRewards) {
        defaultRewardConfig = await this.getDefaultRewardConfig();
      }

      // Calculate gas budget for tournament creation
      // Tournament creation is complex - involves creating Table and storing item rewards
      // Default rewards: 14 items (3 for rank 1, 2 for rank 2, 2 for rank 3, 1 each for ranks 4-10)
      // Custom rewards: variable number of items
      // Use higher gas budget: 50M MIST (0.05 SUI) for tournament creation
      const tournamentCreationGasBudget = 50_000_000; // 0.05 SUI - enough for complex Table operations

      // Build transaction with payment + contract call
      const result = await paymentBuilder.buildPaymentTransaction({
        paymentConfig: {
          playerAddress: paymentConfig.playerAddress,
          paymentToken: paymentConfig.paymentToken,
          totalTokenAmount: tokenConversion.tokenAmount,
          recipientAddress: adminAddress,
          context: 'tournament creation',
        },
        gasBudget: tournamentCreationGasBudget,
        customCalls: (txb, paymentCoin) => {
          // Note: The contract doesn't accept payment as a parameter
          // Payment is transferred by the payment builder to recipientAddress (admin)
          // The contract just records the creation_fee_paid amount (in USD cents)
          // DO NOT transfer paymentCoin here - the builder handles that

          // Check if custom reward config is provided (hasCustomRewards was checked before callback)
          if (hasCustomRewards && config.rewardConfig) {
            // Use helper function that accepts reward config components separately
            // Convert itemRewards from Record<number, ItemReward[]> to parallel vectors
            const itemRewards = config.rewardConfig.itemRewards;
            const ranks: number[] = [];
            const itemIds: number[] = [];
            const levels: number[] = [];
            const quantities: number[] = [];
            
            // Convert itemRewards to parallel vectors
            const itemRewardsRecord = itemRewards instanceof Map 
              ? Object.fromEntries(itemRewards)
              : itemRewards;
            
            // Sort by rank to ensure items for same rank are consecutive
            const sortedRanks = Object.keys(itemRewardsRecord)
              .map(Number)
              .sort((a, b) => a - b);
            
            for (const rank of sortedRanks) {
              const items = itemRewardsRecord[rank] || [];
              for (const item of items) {
                ranks.push(rank);
                itemIds.push(this.itemIdToU8(item.itemId));
                levels.push(item.level);
                quantities.push(item.quantity);
              }
            }
            
            // Validate pool distribution
            const poolDistribution = config.rewardConfig.poolDistribution || [];
            if (poolDistribution.length !== config.rewardConfig.poolDepth) {
              throw new Error(`Pool distribution length (${poolDistribution.length}) must match pool depth (${config.rewardConfig.poolDepth})`);
            }
            
            BadgeLogger.info('🏆 [TOURNAMENT CREATE] Creating user tournament with custom rewards', {
              rewardDepth: config.rewardConfig.rewardDepth,
              poolDepth: config.rewardConfig.poolDepth,
              itemCount: ranks.length,
              ranksCount: sortedRanks.length,
            });
            
            txb.moveCall({
              target: `${packageId}::tournaments::create_tournament_for_user_with_custom_rewards`,
              arguments: [
                txb.object(registryId),
                txb.pure.vector('u8', Array.from(nameBytes)),
                txb.pure.u8(this.categoryToU8(config.category)),
                txb.pure.u64(config.startTime),
                txb.pure.u64(config.endTime),
                txb.pure.u64(config.entryFeeTickets),
                txb.pure.u8(config.rewardConfig.rewardDepth),
                txb.pure.u8(config.rewardConfig.poolDepth),
                txb.pure.vector('u64', poolDistribution),
                txb.pure.u8(config.rewardConfig.poolSource || 0),
                txb.pure.vector('u8', ranks),
                txb.pure.vector('u8', itemIds),
                txb.pure.vector('u8', levels),
                txb.pure.vector('u64', quantities),
                txb.pure.u64(config.startingAnteUSDCents),
                txb.pure.u64(config.creationFeeUSDCents),
                txb.object('0x6'), // Clock
              ],
            });
          } else {
            // Use default reward config (stored on-chain same as custom rewards)
            // defaultRewardConfig was pre-fetched before this callback
            if (!defaultRewardConfig) {
              throw new Error('Default reward config not loaded');
            }
            
            // Convert itemRewards to parallel vectors
            const ranks: number[] = [];
            const itemIds: number[] = [];
            const levels: number[] = [];
            const quantities: number[] = [];
            
            const sortedRanks = Object.keys(defaultRewardConfig.itemRewards)
              .map(Number)
              .sort((a, b) => a - b);
            
            for (const rank of sortedRanks) {
              const items = defaultRewardConfig.itemRewards[rank] || [];
              for (const item of items) {
                ranks.push(rank);
                itemIds.push(this.itemIdToU8(item.itemId));
                levels.push(item.level);
                quantities.push(item.quantity);
              }
            }
            
            BadgeLogger.info('🏆 [TOURNAMENT CREATE] Creating user tournament with default rewards (stored on-chain)', {
              rewardDepth: defaultRewardConfig.rewardDepth,
              poolDepth: defaultRewardConfig.poolDepth,
              itemCount: ranks.length,
            });
            
            txb.moveCall({
              target: `${packageId}::tournaments::create_tournament_for_user_default_rewards`,
              arguments: [
                txb.object(registryId),
                txb.pure.vector('u8', Array.from(nameBytes)),
                txb.pure.u8(this.categoryToU8(config.category)),
                txb.pure.u64(config.startTime),
                txb.pure.u64(config.endTime),
                txb.pure.u64(config.entryFeeTickets),
                txb.pure.u8(defaultRewardConfig.rewardDepth),
                txb.pure.u8(defaultRewardConfig.poolDepth),
                txb.pure.vector('u64', defaultRewardConfig.poolDistribution),
                txb.pure.u8(defaultRewardConfig.poolSource || 0),
                txb.pure.vector('u8', ranks),
                txb.pure.vector('u8', itemIds),
                txb.pure.vector('u8', levels),
                txb.pure.vector('u64', quantities),
                txb.pure.u64(config.startingAnteUSDCents),
                txb.pure.u64(config.creationFeeUSDCents),
                txb.object('0x6'), // Clock
              ],
            });
          }
        },
      });

      if (result.success) {
        BadgeLogger.info('🏆 [TOURNAMENT CREATE] Transaction built successfully', {
          playerAddress: paymentConfig.playerAddress,
          tournamentName: config.name,
          totalUSD,
          paymentToken: paymentConfig.paymentToken,
          tokenAmount: tokenConversion.tokenAmount,
          gasEstimate: result.gasEstimate,
        });
      }

      return result;
    } catch (error) {
      BadgeLogger.error('🏆 [TOURNAMENT CREATE] Error building transaction', {
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

      // Get total participant count
      const totalParticipants = await this.getParticipantCount(tournamentObjectId);

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

