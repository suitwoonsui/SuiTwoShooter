// ==========================================
// Achievement Service (REWARD TRIGGER)
// Achievements are a reward trigger: when threshold is met in a category, we distribute credits + items
// via platform rewards core only (no local fallback). Handles milestone checking, reward distribution,
// and on-chain claim tracking.
// ==========================================

import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { getConfig } from '@/config/config';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import {
  getEcosystemIdFromEnv,
  getAppIdFromEnv,
  buildBatchViaChannel,
  platformStatsClient,
  platformGameScoreClient,
  platformTxClient,
  getSonarClient,
  getCorridorCapabilityObjectIdFromEnv,
  getCorridorAdminCapabilityObjectIdFromEnv,
  type CallPlatformBackendOptions,
} from '@/lib/services/platform/client/platform-client';
import {
  getClaimedMilestoneIdsFromWake,
  recordClaimed,
  isWakeMilestoneMarked,
} from '@/lib/services/achievements/milestones/milestones-service';
import {
  buildMilestoneWakeCompleteClaimStats,
  buildMilestoneWakeRevokeStats,
} from '@/lib/services/achievements/milestones/milestone-wake-mark-payload';
import {
  getOrLoadNormalizedMilestoneDefinitions,
  invalidateMilestoneDefinitionsPublicCache,
} from '@/lib/cache/public-nonuser-data-cache';
import type { NormalizedMilestoneDefinitions } from '@/lib/services/achievements/milestones/milestone-definitions-public-load';

// Milestone definitions from MONETIZATION_STRATEGY.md
export interface MilestoneDefinition {
  milestoneId?: number; // Stable unique identifier (never changes)
  threshold: number;
  credits: number;
  items: Array<{ itemId: string; level: number; quantity: number }>;
  level?: number; // Optional: actual on-chain level number
}

export interface MilestoneCategory {
  [key: string]: MilestoneDefinition[];
}

export interface MilestoneDefinitionsWithLevels {
  definitions: Record<string, MilestoneDefinition[]>;
  levelMapping: Record<string, number[]>; // category -> array of actual level numbers (index matches definitions array)
}

export interface PlayerStats {
  totalGames: number;
  bestScore: number;
  bestDistance: number;
  bestCoins: number;
  bestBossesDefeated: number;
  bestEnemiesDefeated: number;
  bestCoinStreak: number;
  totalScore: number;
  totalDistance: number;
  totalCoins: number;
  totalBossesDefeated: number;
  totalEnemiesDefeated: number;
}

export interface EligibleAchievement {
  category: string;
  categoryCode: number;
  milestoneId?: number; // Stable unique identifier
  threshold: number;
  credits: number;
  items: Array<{ itemId: string; level: number; quantity: number }>;
}

export class AchievementService {
  private _readClient: ReturnType<typeof getSonarClient>;
  private config: ReturnType<typeof getConfig>;
  private adminWallet = getAdminWalletService();

  // Milestone definitions: shared public cache (see @/lib/cache/public-nonuser-data-cache).

  // Cache for claimed milestone IDs per player
  private claimedMilestonesCache: Map<string, { ids: number[]; timestamp: number }> = new Map();
  private readonly CLAIMED_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

  // Definitions come from platform Aquifer only (admin page â†’ Aquifer). No fallback/legacy.

  // Category code mapping
  private categoryCodes: Record<string, number> = {
    gamesPlayed: 1,
    bossesPerGame: 2,
    bossesCumulative: 3,
    scorePerGame: 4,
    scoreCumulative: 5,
    distancePerGame: 6,
    distanceCumulative: 7,
    coinsPerGame: 8,
    coinsCumulative: 9,
    enemiesPerGame: 10,
    enemiesCumulative: 11,
    coinStreak: 12,
  };

  /** Map category name to platform stats metric (for platform milestones claim). */
  private categoryToMetric(category: string): string {
    const m: Record<string, string> = {
      gamesPlayed: 'totalGames',
      bossesPerGame: 'bestBossesDefeated',
      bossesCumulative: 'totalBossesDefeated',
      scorePerGame: 'bestScore',
      scoreCumulative: 'totalScore',
      distancePerGame: 'bestDistance',
      distanceCumulative: 'totalDistance',
      coinsPerGame: 'bestCoins',
      coinsCumulative: 'totalCoins',
      enemiesPerGame: 'bestEnemiesDefeated',
      enemiesCumulative: 'totalEnemiesDefeated',
      coinStreak: 'bestCoinStreak',
    };
    return m[category] ?? 'totalGames';
  }

  constructor() {
    try {
      PlatformLogger.debug('Initializing AchievementService...');
    this.config = getConfig();
    this._readClient = getSonarClient();
    PlatformLogger.debug('AchievementService initialized successfully');
    } catch (error) {
      PlatformLogger.error('Error in AchievementService constructor', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error; // Re-throw to let caller handle
    }
  }

  private static debugEnabled(): boolean {
    return process.env.DEBUG_ACHIEVEMENTS === 'true';
  }

  /** Clear cached Aquifer milestone definitions (call after admin updates definitions). */
  clearMilestoneDefinitionsCache(): void {
    invalidateMilestoneDefinitionsPublicCache();
  }

  /**
   * Get milestone definitions from platform Aquifer (shared public cache with HTTP route + bootstrap).
   */
  async getMilestoneDefinitions(): Promise<Record<string, MilestoneDefinition[]>> {
    const normalized = await getOrLoadNormalizedMilestoneDefinitions(undefined);
    return this.mapNormalizedMilestoneDefinitionsToService(normalized);
  }

  private mapNormalizedMilestoneDefinitionsToService(
    normalized: NormalizedMilestoneDefinitions
  ): Record<string, MilestoneDefinition[]> {
    const out: Record<string, MilestoneDefinition[]> = {};
    for (const [category, list] of Object.entries(normalized)) {
      out[category] = (list ?? []).map((m, i) => ({
        milestoneId: m.milestoneId as number,
        threshold: m.threshold,
        credits: m.credits,
        items: m.items ?? [],
        level: i + 1,
      }));
    }
    return out;
  }
  
  /** Definitions and claimed-state reads/writes use platform only (Aquifer + Wake/Hydroscope). */
  private usePlatformMilestones(): boolean {
    return true;
  }

  /**
   * Parse ItemReward vector from return value
   */
  private parseItemRewardsVector(bytes: unknown, packageId: string): Array<{ itemId: string; level: number; quantity: number }> {
    const items: Array<{ itemId: string; level: number; quantity: number }> = [];
    
    try {
      let byteArray: number[] | null = null;
      
      // Extract byte array from different formats
      if (Array.isArray(bytes)) {
        if (bytes.length === 1 && Array.isArray(bytes[0])) {
          // Format: [[byteArray], "type"]
          byteArray = bytes[0] as number[];
        } else if (bytes.length > 0 && typeof bytes[0] === 'number') {
          // Format: [byteArray] (direct)
          byteArray = bytes as number[];
        } else if (bytes.length === 2 && typeof bytes[0] === 'string') {
          // Format: [base64String, "type"]
          try {
            const buffer = Buffer.from(bytes[0] as string, 'base64');
            byteArray = Array.from(buffer);
          } catch {
            return items;
          }
        }
      } else if (typeof bytes === 'string') {
        // Format: base64String
        try {
          const buffer = Buffer.from(bytes, 'base64');
          byteArray = Array.from(buffer);
        } catch {
          return items;
        }
      }
      
      if (!byteArray || byteArray.length === 0) {
        return items;
      }
      
      // Vector format: length (1 byte) + items
      const length = byteArray[0];
      if (length === 0 || byteArray.length < 1 + length * 10) {
        return items;
      }
      
      let offset = 1;
      
      // ItemReward struct: item_id (u8, 1 byte) + level (u8, 1 byte) + quantity (u64, 8 bytes, little-endian)
      for (let i = 0; i < length; i++) {
        if (offset + 10 > byteArray.length) break;

        const itemId = byteArray[offset];
        const level = byteArray[offset + 1];
        
        // Parse quantity (u64, little-endian)
        let quantity = BigInt(0);
        for (let j = 0; j < 8; j++) {
          quantity = quantity | (BigInt(byteArray[offset + 2 + j]) << BigInt(j * 8));
        }

        // Map item_id back to string
        const itemIdMap: Record<number, string> = {
          0: 'orb_level',
          1: 'force_field',
          2: 'extra_lives',
          3: 'slow_time',
          4: 'coin_tractor_beam',
          5: 'destroy_all',
          6: 'boss_kill_shot',
        };

        items.push({
          itemId: itemIdMap[itemId] || 'orb_level',
          level,
          quantity: Number(quantity),
        });

        offset += 10; // 1 + 1 + 8 = 10 bytes per ItemReward
      }
    } catch (error) {
      PlatformLogger.warn('Failed to parse ItemReward vector', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return items;
  }

  /**
   * Parse boolean from bytes
   */
  private parseBoolFromBytes(bytes: unknown): boolean {
    if (Array.isArray(bytes)) {
      // Format: [byteArray] or [[byteArray], "type"]
      const byteArray = bytes.length === 1 && Array.isArray(bytes[0]) ? bytes[0] : bytes;
      if (Array.isArray(byteArray) && byteArray.length > 0) {
        return byteArray[0] === 1;
      }
      return false;
    }
    if (typeof bytes === 'string') {
      // Base64 string format
      try {
        const buffer = Buffer.from(bytes, 'base64');
        return buffer.length > 0 && buffer[0] === 1;
      } catch {
        return false;
      }
    }
    return false;
  }

  /**
   * Parse u64 from bytes (Sui uses little-endian)
   */
  private parseU64FromBytes(bytes: unknown): number {
    let byteArray: number[] | null = null;
    
    if (Array.isArray(bytes)) {
      // Format: [byteArray] or [[byteArray], "type"]
      if (bytes.length === 1 && Array.isArray(bytes[0])) {
        // Format: [[byteArray], "type"]
        byteArray = bytes[0] as number[];
      } else if (bytes.length > 0 && typeof bytes[0] === 'number') {
        // Format: [byteArray] (direct)
        byteArray = bytes as number[];
      }
    } else if (typeof bytes === 'string') {
      // Base64 string format
      try {
        const buffer = Buffer.from(bytes, 'base64');
        byteArray = Array.from(buffer);
      } catch {
        return 0;
      }
    }
    
    if (!byteArray || byteArray.length < 8) {
      return 0;
    }
    
    // Sui uses little-endian: bytes[0] is least significant byte
    let value = BigInt(0);
    for (let i = 0; i < 8; i++) {
      value = value | (BigInt(byteArray[i]) << BigInt(i * 8));
    }
    return Number(value);
  }

  /**
   * Get player statistics from platform only. No legacy chain path.
   * Pass the same platformOptions as GET /api/stats and /api/badges (buildPlatformCallOptions(request))
   * so Hydroscope reads share getPlayerStats in-flight dedupe + TTL cache on platformGameScoreClient.
   */
  async getPlayerStats(
    playerAddress: string,
    platformOptions?: CallPlatformBackendOptions
  ): Promise<{
    success: boolean;
    stats?: PlayerStats;
    error?: string;
  }> {
    const opts = platformOptions ?? {};
    try {
      const chainRes = await platformGameScoreClient.getPlayerStats(playerAddress, opts);
      if (chainRes.success && chainRes.totalGames != null) {
        const stats: PlayerStats = {
            totalGames: chainRes.totalGames ?? 0,
            bestScore: chainRes.bestScore ?? 0,
            bestDistance: chainRes.bestDistance ?? 0,
            bestCoins: chainRes.bestCoins ?? 0,
            bestBossesDefeated: chainRes.bestBossesDefeated ?? 0,
            bestEnemiesDefeated: chainRes.bestEnemiesDefeated ?? 0,
            bestCoinStreak: chainRes.bestCoinStreak ?? 0,
            totalScore: chainRes.totalScore ?? 0,
            totalDistance: chainRes.totalDistance ?? 0,
            totalCoins: chainRes.totalCoins ?? 0,
            totalBossesDefeated: chainRes.totalBossesDefeated ?? 0,
            totalEnemiesDefeated: chainRes.totalEnemiesDefeated ?? 0,
        };
        return { success: true, stats };
      }

      if (this.usePlatformMilestones()) {
        const res = await platformStatsClient.getStats(playerAddress, opts);
        if (!res.success) {
          return { success: false, error: res.error ?? 'Failed to get stats from platform' };
        }
        const raw = res.stats ?? {};
        const stats: PlayerStats = {
          totalGames: (raw.totalGames as number) ?? 0,
          bestScore: (raw.bestScore as number) ?? 0,
          bestDistance: (raw.bestDistance as number) ?? 0,
          bestCoins: (raw.bestCoins as number) ?? 0,
          bestBossesDefeated: (raw.bestBossesDefeated as number) ?? 0,
          bestEnemiesDefeated: (raw.bestEnemiesDefeated as number) ?? 0,
          bestCoinStreak: (raw.bestCoinStreak as number) ?? 0,
          totalScore: (raw.totalScore as number) ?? 0,
          totalDistance: (raw.totalDistance as number) ?? 0,
          totalCoins: (raw.totalCoins as number) ?? 0,
          totalBossesDefeated: (raw.totalBossesDefeated as number) ?? 0,
          totalEnemiesDefeated: (raw.totalEnemiesDefeated as number) ?? 0,
        };
        return { success: true, stats };
      }

      return {
        success: false,
        error: 'Player stats require platform (chain or stored).',
      };
    } catch (error) {
      PlatformLogger.error('Error getting player stats', {
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
   * Parse u64 from return value
   */
  private parseU64(returnValue: [string, string]): number {
    try {
      const [bytes, type] = returnValue;
      if (type !== 'u64') return 0;
      
      // Convert bytes (base64) to number
      const buffer = Buffer.from(bytes, 'base64');
      // Read as big-endian u64
      const value = buffer.readBigUInt64BE(0);
      return Number(value);
    } catch {
      return 0;
    }
  }

  /**
   * Parse bool from return value
   */
  private parseBool(returnValue: [string, string]): boolean {
    try {
      const [bytes, type] = returnValue;
      if (type !== 'bool') return false;
      
      // Bool is a single byte: 0x00 = false, 0x01 = true
      const buffer = Buffer.from(bytes, 'base64');
      return buffer[0] === 1;
    } catch {
      return false;
    }
  }

  /**
   * Clear cached claimed milestone IDs for a player
   */
  clearClaimedMilestonesCache(playerAddress: string): void {
    this.claimedMilestonesCache.delete(playerAddress);
    PlatformLogger.debug('Cleared claimed milestones cache', { playerAddress });
  }

  private collectAllMilestoneDefinitionIds(definitions: Record<string, MilestoneDefinition[]>): number[] {
    const set = new Set<number>();
    for (const arr of Object.values(definitions)) {
      if (!Array.isArray(arr)) continue;
      for (const d of arr) {
        const id = d?.milestoneId;
        if (typeof id === 'number' && Number.isFinite(id) && id > 0) set.add(id);
      }
    }
    return Array.from(set);
  }

  /** Baseline claimed milestone IDs from Wake (before merging a new claim into cache). */
  private async snapshotWakeClaimedBaseline(playerAddress: string): Promise<number[]> {
    if (!this.usePlatformMilestones()) return [];
    const definitions = await this.getMilestoneDefinitions();
    const allIds = this.collectAllMilestoneDefinitionIds(definitions);
    if (allIds.length === 0) return [];
    return getClaimedMilestoneIdsFromWake(playerAddress, allIds, undefined);
  }

  /**
   * Submit Wake rows (stats and/or marks) for a player via Channel (`hydroscope-submit-stats`).
   */
  private async submitWakeStatsBatch(
    playerAddress: string,
    stats: Record<string, number>
  ): Promise<{ success: boolean; skipped?: boolean; error?: string; digest?: string }> {
    const keys = Object.keys(stats);
    if (keys.length === 0) return { success: true };
    const corridorCapId = getCorridorCapabilityObjectIdFromEnv();
    if (!corridorCapId || !corridorCapId.startsWith('0x')) {
      return { success: false, skipped: true, error: 'CORRIDOR_CAPABILITY_OBJECT_ID not set' };
    }
    const sender = this.adminWallet.getAddress();
    const sessionId = `mwake:${Date.now()}:${Math.random().toString(36).slice(2, 12)}`;
    const execOpts: CallPlatformBackendOptions = {
      identityFromCapOnly: true,
      corridorCapabilityObjectId: corridorCapId,
    };
    try {
      const buildRes = await buildBatchViaChannel(
        {
          operations: [
            {
              operationId: 'hydroscope-submit-stats',
              params: {
                address: playerAddress,
                stats: { ...stats },
                sessionId,
                corridorCapabilityObjectId: corridorCapId,
                senderAddress: sender,
              },
            },
          ],
        },
        execOpts
      );
      if (!buildRes.success || !buildRes.transactions?.length) {
        return {
          success: false,
          error: buildRes.errors?.join('; ') ?? buildRes.error ?? 'Wake mark build failed',
        };
      }
      const txBytes = buildRes.transactions[0];
      const signed = await this.adminWallet.getKeypair().signTransaction(Buffer.from(txBytes, 'base64'));
      const sig =
        typeof signed === 'object' && signed !== null && 'signature' in signed
          ? (signed as { signature: string }).signature
          : String(signed);
      const result = await platformTxClient.executeSigned(
        { transactionBytesBase64: txBytes, signature: sig },
        execOpts
      );
      if (result.success) {
        PlatformLogger.info('Wake mark(s) submitted', { playerAddress, keys });
        return { success: true, digest: result.digest };
      }
      return { success: false, error: result.error ?? 'Wake mark execute failed' };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      PlatformLogger.error('Wake mark submit error', { playerAddress, error: msg });
      return { success: false, error: msg };
    }
  }

  /**
   * One Channel PTB: optional Sustain reward distribution only (no Anchor).
   * Wake rows (in a follow-up tx) store payout digest in the same linkage fields used for tx correlation.
   */
  private async submitMilestoneClaimCompositeBatch(
    playerAddress: string,
    milestones: EligibleAchievement[],
    totalCredits: number,
    allItems: Array<{ itemId: string; level: number; quantity: number }>,
    hasRewards: boolean
  ): Promise<{
    success: boolean;
    error?: string;
    digest?: string;
    sessionId?: number;
    claimIds: number[];
  }> {
    const validMilestones = milestones.filter((m) => {
      const mid = Number(m.milestoneId ?? 0);
      return Number.isFinite(mid) && mid >= 1;
    });
    if (validMilestones.length === 0) {
      return { success: false, error: 'No milestones with valid milestoneId', claimIds: [] };
    }

    if (!hasRewards) {
      return { success: true, digest: undefined, sessionId: undefined, claimIds: [] };
    }

    const corridorCapId = getCorridorCapabilityObjectIdFromEnv();
    if (!corridorCapId?.startsWith('0x')) {
      return { success: false, error: 'CORRIDOR_CAPABILITY_OBJECT_ID not set', claimIds: [] };
    }

    const adminCapId = getCorridorAdminCapabilityObjectIdFromEnv();
    if (!adminCapId?.trim().startsWith('0x')) {
      return {
        success: false,
        error:
          'Milestone reward payout requires CORRIDOR_ADMIN_CAP_OBJECT_ID (or _TESTNET/_MAINNET). Sustain in composite uses CorridorAdminCap.',
        claimIds: [],
      };
    }

    const admin = this.adminWallet.getAddress();
    const execOpts: CallPlatformBackendOptions = {
      identityFromCapOnly: true,
      corridorCapabilityObjectId: corridorCapId,
    };

    const steps: Array<{ op: string; params: Record<string, unknown> }> = [
      {
        op: 'sustain-build-distribute',
        params: {
          rewards: [
            {
              recipientAddress: playerAddress,
              credits: totalCredits > 0 ? totalCredits : undefined,
              items: allItems.length ? allItems : undefined,
            },
          ],
          adminWalletAddress: admin,
          source: 'achievement:claim:batch',
        },
      },
    ];

    try {
      const buildRes = await buildBatchViaChannel(
        {
          operations: [
            {
              operationId: 'channel-composite-ptb',
              params: {
                signerAddress: admin,
                gasBudget: 120_000_000,
                steps,
              },
            },
          ],
        },
        execOpts
      );
      if (!buildRes.success || !buildRes.transactions?.length) {
        return {
          success: false,
          error: buildRes.errors?.join('; ') ?? buildRes.error ?? 'channel-composite-ptb build failed',
          claimIds: [],
        };
      }
      const txBytes = buildRes.transactions[0]!;
      const signed = await this.adminWallet.getKeypair().signTransaction(Buffer.from(txBytes, 'base64'));
      const sig =
        typeof signed === 'object' && signed !== null && 'signature' in signed
          ? (signed as { signature: string }).signature
          : String(signed);
      const result = await platformTxClient.executeSigned(
        { transactionBytesBase64: txBytes, signature: sig },
        execOpts
      );
      if (!result.success) {
        return { success: false, error: result.error ?? 'channel-composite-ptb execute failed', claimIds: [] };
      }
      return {
        success: true,
        digest: result.digest,
        sessionId: undefined,
        claimIds: [],
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      PlatformLogger.error('Milestone channel-composite-ptb error', { playerAddress, error: msg });
      return { success: false, error: msg, claimIds: [] };
    }
  }

  /**
   * Get claimed milestone IDs for a player (stable IDs, not levels)
   * This is the preferred method since milestone_ids are stable even when levels are reorganized
   */
  async getClaimedMilestoneIds(playerAddress: string): Promise<{
    success: boolean;
    claimedIds?: number[];
    error?: string;
  }> {
    try {
      // Check cache first
      const cached = this.claimedMilestonesCache.get(playerAddress);
      if (cached && (Date.now() - cached.timestamp) < this.CLAIMED_CACHE_TTL) {
        return {
          success: true,
          claimedIds: cached.ids,
        };
      }

      if (this.usePlatformMilestones()) {
        const definitions = await this.getMilestoneDefinitions();
        const allIds = this.collectAllMilestoneDefinitionIds(definitions);
        const claimedIds = await getClaimedMilestoneIdsFromWake(playerAddress, allIds, undefined);
        this.claimedMilestonesCache.set(playerAddress, { ids: claimedIds, timestamp: Date.now() });
        return { success: true, claimedIds };
      }

      return {
        success: false,
        error: 'Claims require platform (Wake/Hydroscope). Configure PLATFORM_BACKEND_URL and corridor.',
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { success: false, error: msg };
    }
  }

  /**
   * Get all eligible (claimable) achievements for a player
   * Does NOT claim them - just returns what's available to claim
   * @param preloaded When set (e.g. from GET /achievements/progress), skips duplicate stats + claims fetches.
   */
  async getEligibleAchievements(
    playerAddress: string,
    preloaded?: { stats: PlayerStats; claimedIds: number[] }
  ): Promise<{
    success: boolean;
    eligible: EligibleAchievement[];
    error?: string;
  }> {
    try {
      let stats: PlayerStats;
      let claimedIds: number[];

      if (preloaded?.stats && Array.isArray(preloaded.claimedIds)) {
        stats = preloaded.stats;
        claimedIds = preloaded.claimedIds;
      } else {
        const statsResult = await this.getPlayerStats(playerAddress);
        if (!statsResult.success || !statsResult.stats) {
          return {
            success: false,
            eligible: [],
            error: statsResult.error || 'Failed to get player stats',
          };
        }
        stats = statsResult.stats;

        const claimedIdsResult = await this.getClaimedMilestoneIds(playerAddress);
        claimedIds = claimedIdsResult.claimedIds || [];
      }
      
      // Debug-only (these endpoints are polled frequently during menu/store flows)
      if (AchievementService.debugEnabled()) {
        console.log('🔍 [ELIGIBLE] getEligibleAchievements called for', playerAddress);
        console.log('🔍 [ELIGIBLE] Claimed IDs result:', {
          preloaded: Boolean(preloaded),
          claimedIds: claimedIds,
          count: claimedIds.length,
        });
        console.log('🔍 [ELIGIBLE] Player stats:', stats);
      }
      
      PlatformLogger.debug('Checking eligible achievements', {
        playerAddress,
        claimedIdsCount: claimedIds.length,
        claimedIds: claimedIds.slice(0, 10), // Log first 10 for debugging
      });

      // Fetch milestone definitions once (will use cache if available)
      const definitions = await this.getMilestoneDefinitions();

      // Check each category for eligible achievements
      const eligible: EligibleAchievement[] = [];

      // Games Played
      eligible.push(...(await this.checkCategory('gamesPlayed', stats.totalGames, claimedIds, definitions)));

      // Bosses Per Game
      eligible.push(...(await this.checkCategory('bossesPerGame', stats.bestBossesDefeated, claimedIds, definitions)));

      // Bosses Cumulative
      eligible.push(...(await this.checkCategory('bossesCumulative', stats.totalBossesDefeated, claimedIds, definitions)));

      // Score Per Game
      eligible.push(...(await this.checkCategory('scorePerGame', stats.bestScore, claimedIds, definitions)));

      // Score Cumulative
      eligible.push(...(await this.checkCategory('scoreCumulative', stats.totalScore, claimedIds, definitions)));

      // Distance Per Game
      eligible.push(...(await this.checkCategory('distancePerGame', stats.bestDistance, claimedIds, definitions)));

      // Distance Cumulative
      eligible.push(...(await this.checkCategory('distanceCumulative', stats.totalDistance, claimedIds, definitions)));

      // Coins Per Game
      eligible.push(...(await this.checkCategory('coinsPerGame', stats.bestCoins, claimedIds, definitions)));

      // Coins Cumulative
      eligible.push(...(await this.checkCategory('coinsCumulative', stats.totalCoins, claimedIds, definitions)));

      // Enemies Per Game
      eligible.push(...(await this.checkCategory('enemiesPerGame', stats.bestEnemiesDefeated, claimedIds, definitions)));

      // Enemies Cumulative
      eligible.push(...(await this.checkCategory('enemiesCumulative', stats.totalEnemiesDefeated, claimedIds, definitions)));

      // Coin Streak
      eligible.push(...(await this.checkCategory('coinStreak', stats.bestCoinStreak, claimedIds, definitions)));

      if (AchievementService.debugEnabled()) {
        console.log('🔍 [ELIGIBLE] Final eligible achievements:', {
          playerAddress,
          totalEligible: eligible.length,
          eligibleByCategory: eligible.reduce((acc, e) => {
            if (!acc[e.category]) acc[e.category] = [];
            acc[e.category].push({
              milestoneId: e.milestoneId,
              threshold: e.threshold,
            });
            return acc;
          }, {} as Record<string, Array<{ milestoneId?: number; threshold: number }>>),
        });
      }

      return {
        success: true,
        eligible,
      };
    } catch (error) {
      PlatformLogger.error('Error checking achievements', {
        playerAddress,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        eligible: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Claim a milestone by milestoneId (stable ID)
   * Looks up the milestone definition and claims it
   */
  async claimMilestoneById(
    playerAddress: string,
    milestoneId: number
  ): Promise<{
    success: boolean;
    claimed?: EligibleAchievement;
    rewardsDistributed?: boolean;
    rewardsError?: string;
    error?: string;
  }> {
    try {
      // Get milestone definitions to find the one with this milestoneId
      const definitions = await this.getMilestoneDefinitions();
      
      // Search all categories for the milestone with this ID
      let foundDefinition: MilestoneDefinition | null = null;
      let foundCategory: string | null = null;
      
      for (const [category, categoryDefinitions] of Object.entries(definitions)) {
        const definition = categoryDefinitions.find(d => d.milestoneId === milestoneId);
        if (definition) {
          foundDefinition = definition;
          foundCategory = category;
          break;
        }
      }
      
      if (!foundDefinition || !foundCategory) {
        return {
          success: false,
          error: `Milestone with ID ${milestoneId} not found in definitions`,
        };
      }
      
      // Use the existing claimSingleMilestone method
      return await this.claimSingleMilestone(
        playerAddress,
        foundCategory,
        foundDefinition.threshold
      );
    } catch (error) {
      PlatformLogger.error('Error claiming milestone by ID', {
        playerAddress,
        milestoneId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Claim a single milestone reward
   * Called when user clicks "Claim" button in the UI
   */
  async claimSingleMilestone(
    playerAddress: string,
    category: string,
    threshold: number
  ): Promise<{
    success: boolean;
    claimed?: EligibleAchievement;
    rewardsDistributed?: boolean;
    rewardsError?: string;
    /** Wake primary row written (state=1 + metadata) after payout when applicable. */
    wakeMarkWritten?: boolean;
    wakeMarkError?: string;
    /** Digest of the Wake `submit_wake_stats` tx that wrote the mark row. */
    wakePrimaryDigest?: string;
    /** Reward payout execute digest when credits/items were distributed (also packed into Wake `digest_b*`). */
    wakeLinkageDigest?: string;
    error?: string;
  }> {
    try {
      const eligibleResult = await this.getEligibleAchievements(playerAddress);
      if (!eligibleResult.success) {
        return {
          success: false,
          error: eligibleResult.error || 'Failed to check eligibility',
        };
      }

      const milestone = eligibleResult.eligible.find(
        e => e.category === category && e.threshold === threshold
      );

      if (!milestone) {
        return {
          success: false,
          error: 'Milestone not eligible for claiming. It may have already been claimed or you have not reached the threshold.',
        };
      }

      const claimMid = Number(milestone.milestoneId ?? 0);
      if (!Number.isFinite(claimMid) || claimMid < 1) {
        return { success: false, error: 'Invalid milestone id' };
      }

      if (await isWakeMilestoneMarked(playerAddress, claimMid, undefined)) {
        return {
          success: true,
          claimed: milestone,
          rewardsDistributed: false,
          wakeMarkWritten: true,
        };
      }

      if (!this.usePlatformMilestones()) {
        return {
          success: false,
          error: 'Milestone claim requires platform. Set PLATFORM_BACKEND_URL, ECOSYSTEM_ID, and APP_ID.',
        };
      }

      const baselineClaimedIds = await this.snapshotWakeClaimedBaseline(playerAddress);
      const adminAddr = this.adminWallet.getAddress();

      recordClaimed(getEcosystemIdFromEnv(), getAppIdFromEnv(), playerAddress, String(milestone.milestoneId ?? 0));

      const rewardsError: string | undefined = undefined;
      const hasRewards = milestone.credits > 0 || (milestone.items && milestone.items.length > 0);
      let payoutDigest: string | undefined;
      if (hasRewards) {
        const composite = await this.submitMilestoneClaimCompositeBatch(
          playerAddress,
          [milestone],
          milestone.credits,
          milestone.items ?? [],
          true
        );
        if (!composite.success) {
          PlatformLogger.warn('Achievement Sustain payout composite failed (no Wake row written yet)', {
            playerAddress,
            error: composite.error,
          });
          return {
            success: false,
            error:
              composite.error ??
              'Reward payout failed. Ensure platform is reachable, API key is set, and channel-composite-ptb is available.',
            wakeMarkWritten: false,
          };
        }
        PlatformLogger.info('Achievement Sustain payout completed', {
          playerAddress,
          credits: milestone.credits,
          itemCount: milestone.items?.length ?? 0,
          digest: composite.digest,
        });
        payoutDigest = composite.digest;
      }

      const completeWake = buildMilestoneWakeCompleteClaimStats({
        milestoneId: claimMid,
        playerAddress,
        lastActorAddress: adminAddr,
        credits: milestone.credits,
        items: milestone.items ?? [],
        linkageDigest: payoutDigest,
      });
      const wakeRes = await this.submitWakeStatsBatch(playerAddress, completeWake);
      if (!wakeRes.success) {
        this.claimedMilestonesCache.set(playerAddress, { ids: baselineClaimedIds, timestamp: Date.now() });
        return {
          success: false,
          error: wakeRes.error ?? 'Wake claim row failed',
          wakeMarkWritten: false,
          wakeMarkError: wakeRes.error,
          rewardsDistributed: hasRewards,
          wakeLinkageDigest: payoutDigest,
        };
      }

      const next = Array.from(new Set([...baselineClaimedIds, claimMid]));
      this.claimedMilestonesCache.set(playerAddress, { ids: next, timestamp: Date.now() });

      PlatformLogger.info('Milestone claim completed', {
        playerAddress,
        category,
        threshold,
        milestoneId: milestone.milestoneId,
        credits: milestone.credits,
        itemCount: milestone.items.length,
        rewardsDistributed: hasRewards,
        payoutDigest: payoutDigest ?? null,
      });

      return {
        success: true,
        claimed: milestone,
        rewardsDistributed: hasRewards,
        rewardsError,
        wakeMarkWritten: true,
        wakePrimaryDigest: wakeRes.digest,
        wakeLinkageDigest: payoutDigest,
      };
    } catch (error) {
      PlatformLogger.error('Error claiming single milestone', {
        playerAddress,
        category,
        threshold,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Claim multiple milestones in a single batch transaction
   * More efficient than claiming one by one
   */
  async claimBatchMilestones(
    playerAddress: string,
    milestones: Array<{ category: string; threshold: number }>
  ): Promise<{
    success: boolean;
    claimed: EligibleAchievement[];
    rewardsDistributed?: boolean;
    rewardsError?: string;
    wakeMarkWritten?: boolean;
    wakeMarkError?: string;
    wakePrimaryDigest?: string;
    wakeLinkageDigest?: string;
    error?: string;
  }> {
    try {
      if (!milestones || milestones.length === 0) {
        return {
          success: false,
          claimed: [],
          error: 'No milestones provided for batch claim',
        };
      }

      const eligibleResult = await this.getEligibleAchievements(playerAddress);
      if (!eligibleResult.success) {
        return {
          success: false,
          claimed: [],
          error: eligibleResult.error || 'Failed to check eligibility',
        };
      }

      const eligibleMilestones: EligibleAchievement[] = [];
      for (const requested of milestones) {
        const eligible = eligibleResult.eligible.find(
          e => e.category === requested.category && e.threshold === requested.threshold
        );
        if (eligible) {
          eligibleMilestones.push(eligible);
        } else {
          PlatformLogger.warn('Milestone not eligible for batch claim, skipping', {
            playerAddress,
            category: requested.category,
            threshold: requested.threshold,
          });
        }
      }

      if (eligibleMilestones.length === 0) {
        return {
          success: false,
          claimed: [],
          error: 'No eligible milestones found in batch',
        };
      }

      const toClaim: EligibleAchievement[] = [];
      for (const m of eligibleMilestones) {
        const mid = Number(m.milestoneId ?? 0);
        if (!Number.isFinite(mid) || mid < 1) continue;
        if (!(await isWakeMilestoneMarked(playerAddress, mid, undefined))) toClaim.push(m);
      }

      if (toClaim.length === 0) {
        return {
          success: true,
          claimed: eligibleMilestones,
          rewardsDistributed: false,
          wakeMarkWritten: true,
        };
      }

      if (!this.usePlatformMilestones()) {
        return {
          success: false,
          claimed: [],
          error: 'Milestone claim requires platform. Set PLATFORM_BACKEND_URL, ECOSYSTEM_ID, and APP_ID.',
        };
      }

      const baselineClaimedIds = await this.snapshotWakeClaimedBaseline(playerAddress);
      const adminAddr = this.adminWallet.getAddress();

      for (const m of toClaim) {
        recordClaimed(getEcosystemIdFromEnv(), getAppIdFromEnv(), playerAddress, String(m.milestoneId ?? 0));
      }

      let totalCredits = 0;
      const allItems: Array<{ itemId: string; level: number; quantity: number }> = [];
      for (const milestone of toClaim) {
        totalCredits += milestone.credits;
        if (milestone.items) {
          allItems.push(...milestone.items);
        }
      }

      const hasRewards = totalCredits > 0 || allItems.length > 0;
      const validToClaim = toClaim.filter((m) => {
        const mid = Number(m.milestoneId ?? 0);
        return Number.isFinite(mid) && mid >= 1;
      });
      if (validToClaim.length === 0) {
        this.claimedMilestonesCache.set(playerAddress, { ids: baselineClaimedIds, timestamp: Date.now() });
        return {
          success: false,
          claimed: [],
          error: 'No milestones with valid milestoneId in batch',
          wakeMarkWritten: false,
        };
      }

      const composite = await this.submitMilestoneClaimCompositeBatch(
        playerAddress,
        validToClaim,
        totalCredits,
        allItems,
        hasRewards
      );
      if (!composite.success) {
        this.claimedMilestonesCache.set(playerAddress, { ids: baselineClaimedIds, timestamp: Date.now() });
        return {
          success: false,
          claimed: [],
          error:
            composite.error ??
            'Milestone composite failed. Ensure platform is reachable, API key is set, and channel-composite-ptb is available.',
          wakeMarkWritten: false,
        };
      }
      if (hasRewards) {
        PlatformLogger.info('Batch achievement Sustain payout completed', {
          playerAddress,
          credits: totalCredits,
          itemCount: allItems.length,
          digest: composite.digest,
        });
      }

      const rewardsDistributed = hasRewards;
      const rewardsError: string | undefined = undefined;
      const payoutDigest = hasRewards ? composite.digest : undefined;

      const completeWake: Record<string, number> = {};
      for (const m of toClaim) {
        const mid = Number(m.milestoneId ?? 0);
        if (!Number.isFinite(mid) || mid < 1) continue;
        Object.assign(
          completeWake,
          buildMilestoneWakeCompleteClaimStats({
            milestoneId: mid,
            playerAddress,
            lastActorAddress: adminAddr,
            credits: m.credits,
            items: m.items ?? [],
            linkageDigest: payoutDigest,
          })
        );
      }

      const wakeOnce = await this.submitWakeStatsBatch(playerAddress, completeWake);
      if (!wakeOnce.success) {
        this.claimedMilestonesCache.set(playerAddress, { ids: baselineClaimedIds, timestamp: Date.now() });
        return {
          success: false,
          claimed: [],
          error: wakeOnce.error ?? 'Wake batch claim rows failed',
          wakeMarkWritten: false,
          wakeMarkError: wakeOnce.error,
          rewardsDistributed: hasRewards,
        };
      }

      const newlyClaimed = toClaim
        .map((m) => Number(m.milestoneId ?? 0))
        .filter((n) => Number.isFinite(n) && n > 0);
      const next = Array.from(new Set([...baselineClaimedIds, ...newlyClaimed]));
      this.claimedMilestonesCache.set(playerAddress, { ids: next, timestamp: Date.now() });

      PlatformLogger.info('Batch milestone claim completed', {
        playerAddress,
        milestoneCount: toClaim.length,
        totalCredits,
        totalItems: allItems.length,
        rewardsDistributed,
      });

      return {
        success: true,
        claimed: toClaim,
        rewardsDistributed,
        rewardsError,
        wakeMarkWritten: true,
        wakePrimaryDigest: wakeOnce.digest,
        wakeLinkageDigest: payoutDigest,
      };
    } catch (error) {
      PlatformLogger.error('Error claiming batch milestones', {
        playerAddress,
        milestoneCount: milestones.length,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        claimed: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * @deprecated Use getEligibleAchievements() instead. This method is kept for backwards compatibility.
   * Check all categories for eligible achievements and auto-claim them
   */
  async checkAndClaimAchievements(playerAddress: string): Promise<{
    success: boolean;
    claimed: EligibleAchievement[];
    error?: string;
  }> {
    // For backwards compatibility, just return eligible without claiming
    const result = await this.getEligibleAchievements(playerAddress);
    return {
      success: result.success,
      claimed: result.eligible, // Return eligible as "claimed" for backwards compat
      error: result.error,
    };
  }

  /**
   * Check a specific category for eligible achievements
   */
  private async checkCategory(
    category: string,
    currentValue: number,
    claimedMilestoneIds: number[],
    definitions: Record<string, MilestoneDefinition[]>
  ): Promise<EligibleAchievement[]> {
    const categoryDefinitions = definitions[category];
    if (!categoryDefinitions) {
      if (AchievementService.debugEnabled()) {
        console.log(`[CHECK CATEGORY] No definitions for category: ${category}`);
      }
      return [];
    }

    const eligible: EligibleAchievement[] = [];
    const claimedIdsSet = new Set(claimedMilestoneIds);

    if (AchievementService.debugEnabled()) {
      console.log(`[CHECK CATEGORY] Checking category: ${category}`);
      console.log(`[CHECK CATEGORY] Current value: ${currentValue}`);
      console.log(`[CHECK CATEGORY] Claimed milestone IDs:`, Array.from(claimedIdsSet));
      console.log(`[CHECK CATEGORY] Category definitions count: ${categoryDefinitions.length}`);
    }

    for (const definition of categoryDefinitions) {
      const reached = currentValue >= definition.threshold;
      const hasMilestoneId = definition.milestoneId !== undefined && definition.milestoneId !== null;
      const isClaimed = hasMilestoneId && definition.milestoneId !== undefined 
        ? claimedIdsSet.has(definition.milestoneId) 
        : false;

      if (AchievementService.debugEnabled()) {
        console.log(`[CHECK CATEGORY] Definition:`, {
          category,
          threshold: definition.threshold,
          milestoneId: definition.milestoneId,
          reached,
          hasMilestoneId,
          isClaimed,
        });
      }

      // Check if player has reached threshold
      if (reached) {
        // Check if already claimed by milestone_id (stable ID, not threshold/level)
        if (hasMilestoneId && !isClaimed && definition.milestoneId !== undefined) {
          if (AchievementService.debugEnabled()) {
            console.log(`✅ [CHECK CATEGORY] Adding eligible milestone:`, {
              category,
              milestoneId: definition.milestoneId,
              threshold: definition.threshold,
            });
          }
          eligible.push({
            category,
            categoryCode: this.categoryCodes[category] || 0,
            milestoneId: definition.milestoneId,
            threshold: definition.threshold,
            credits: definition.credits,
            items: definition.items,
          });
        } else if (hasMilestoneId && isClaimed) {
          if (AchievementService.debugEnabled()) {
            console.log(`❌ [CHECK CATEGORY] Milestone already claimed:`, {
              category,
              milestoneId: definition.milestoneId,
              threshold: definition.threshold,
            });
          }
        } else if (!hasMilestoneId) {
          // Fallback: if milestone_id is missing, log warning but still check by threshold
          // This should not happen with new milestones, but supports legacy data
          if (AchievementService.debugEnabled()) {
            console.log(`⚠️ [CHECK CATEGORY] Milestone definition missing milestone_id:`, {
              category,
              threshold: definition.threshold,
            });
          }
          PlatformLogger.warn('Milestone definition missing milestone_id, using threshold check', {
            category,
            threshold: definition.threshold,
          });
        }
      } else {
        if (AchievementService.debugEnabled()) {
          console.log(`⏳ [CHECK CATEGORY] Milestone not reached yet:`, {
            category,
            threshold: definition.threshold,
            currentValue,
          });
        }
      }
    }

    if (AchievementService.debugEnabled()) {
      console.log(`[CHECK CATEGORY] Final eligible count for ${category}: ${eligible.length}`);
    }
    return eligible;
  }

  /** @removed buildMilestoneClaimTransaction — claim flow uses Channel; payouts use channel-composite-ptb (Sustain only) when applicable. */

  /**
   * Unclaim by milestoneId: sets Wake mark row state=0 and clears linkage scalars.
   */
  async unclaimMilestoneById(
    playerAddress: string,
    milestoneId: number
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      if (!Number.isFinite(milestoneId) || milestoneId < 1) {
        return { success: false, error: 'Invalid milestone id' };
      }
      const wakeRes = await this.submitWakeStatsBatch(playerAddress, buildMilestoneWakeRevokeStats(milestoneId));
      if (!wakeRes.success) {
        return {
          success: false,
          error: wakeRes.error ?? 'Failed to clear Wake mark',
        };
      }

      PlatformLogger.info('Unclaimed (Wake mark cleared)', {
        playerAddress,
        milestoneId,
        digest: wakeRes.digest,
      });

      this.clearClaimedMilestonesCache(playerAddress);
      return { success: true };
    } catch (error) {
      PlatformLogger.error('Error unclaiming milestone by ID', {
        playerAddress,
        milestoneId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get user milestone progress and claimed milestones (admin view)
   */
  async getUserMilestoneData(
    playerAddress: string,
    platformOptions?: CallPlatformBackendOptions
  ): Promise<{
    success: boolean;
    stats?: PlayerStats;
    claimed?: number[]; // Claimed milestone IDs
    eligible?: EligibleAchievement[];
    error?: string;
  }> {
    try {
      const [statsResult, claimedResult] = await Promise.all([
        this.getPlayerStats(playerAddress, platformOptions),
        this.getClaimedMilestoneIds(playerAddress),
      ]);
      if (!statsResult.success || !statsResult.stats) {
        return {
          success: false,
          error: statsResult.error || 'Failed to get player stats',
        };
      }

      if (!claimedResult.success) {
        return {
          success: false,
          error: claimedResult.error || 'Failed to get claimed milestones',
        };
      }

      const claimedIds = claimedResult.claimedIds || [];
      const eligibleResult = await this.getEligibleAchievements(playerAddress, {
        stats: statsResult.stats,
        claimedIds,
      });
      if (!eligibleResult.success) {
        return {
          success: false,
          error: eligibleResult.error || 'Failed to get eligible milestones',
        };
      }

      return {
        success: true,
        stats: statsResult.stats,
        claimed: claimedIds,
        eligible: eligibleResult.eligible || [],
      };
    } catch (error) {
      PlatformLogger.error('Error getting user milestone data', {
        playerAddress,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Singleton instance
let achievementServiceInstance: AchievementService | null = null;
let initializationError: Error | null = null;

export function getAchievementService(): AchievementService {
  if (!achievementServiceInstance) {
    try {
    achievementServiceInstance = new AchievementService();
      initializationError = null; // Clear any previous errors
    } catch (error) {
      initializationError = error instanceof Error ? error : new Error(String(error));
      PlatformLogger.error('Failed to initialize AchievementService', {
        error: initializationError.message,
        stack: initializationError.stack,
      });
      throw new Error(`Failed to initialize AchievementService: ${initializationError.message}`);
    }
  }
  return achievementServiceInstance;
}

