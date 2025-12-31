// ==========================================
// Achievement Service
// ==========================================
// Handles milestone checking, reward distribution, and on-chain claim tracking

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { getAdminWalletService } from './admin-wallet-service';
import { getConfig } from '../../config/config';
import { BadgeLogger } from './badge-logger';
import { StoreService } from './store-service';
import { GamePassService } from './game-pass-service';
import { executeTransactionWithFinalization } from './transaction-helpers';

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
  private client: SuiClient;
  private storeService: StoreService;
  private gamePassService: GamePassService;
  private config: ReturnType<typeof getConfig>;
  private adminWallet = getAdminWalletService();

  // Cache for on-chain milestone definitions (refreshed periodically)
  private milestoneDefinitionsCache: Record<string, MilestoneDefinition[]> | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  
  // Request deduplication: if a fetch is in progress, queue other requests
  private fetchPromise: Promise<Record<string, MilestoneDefinition[]>> | null = null;

  // Cache for claimed milestone IDs per player
  private claimedMilestonesCache: Map<string, { ids: number[]; timestamp: number }> = new Map();
  private readonly CLAIMED_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

  // Milestone definitions (from MONETIZATION_STRATEGY.md) - kept as fallback
  private milestoneDefinitionsFallback: Record<string, MilestoneDefinition[]> = {
    gamesPlayed: [
      { threshold: 5, credits: 1, items: [{ itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'orbLevel', level: 1, quantity: 1 }] },
      { threshold: 15, credits: 2, items: [{ itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'forceField', level: 1, quantity: 1 }, { itemId: 'orbLevel', level: 1, quantity: 1 }] },
      { threshold: 35, credits: 3, items: [{ itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'forceField', level: 1, quantity: 1 }, { itemId: 'orbLevel', level: 1, quantity: 1 }, { itemId: 'coinTractorBeam', level: 1, quantity: 1 }] },
      { threshold: 75, credits: 5, items: [{ itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'forceField', level: 1, quantity: 1 }, { itemId: 'orbLevel', level: 2, quantity: 1 }, { itemId: 'slowTime', level: 1, quantity: 1 }, { itemId: 'coinTractorBeam', level: 1, quantity: 1 }] },
      { threshold: 150, credits: 10, items: [{ itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'forceField', level: 2, quantity: 1 }, { itemId: 'orbLevel', level: 2, quantity: 1 }, { itemId: 'slowTime', level: 1, quantity: 1 }, { itemId: 'coinTractorBeam', level: 1, quantity: 1 }, { itemId: 'destroyAll', level: 1, quantity: 1 }] },
      { threshold: 300, credits: 15, items: [{ itemId: 'extraLives', level: 2, quantity: 1 }, { itemId: 'forceField', level: 2, quantity: 1 }, { itemId: 'orbLevel', level: 3, quantity: 1 }, { itemId: 'slowTime', level: 1, quantity: 1 }, { itemId: 'coinTractorBeam', level: 2, quantity: 1 }, { itemId: 'destroyAll', level: 1, quantity: 1 }] },
      { threshold: 500, credits: 20, items: [{ itemId: 'extraLives', level: 3, quantity: 1 }, { itemId: 'forceField', level: 3, quantity: 1 }, { itemId: 'orbLevel', level: 3, quantity: 1 }, { itemId: 'slowTime', level: 3, quantity: 1 }, { itemId: 'coinTractorBeam', level: 3, quantity: 1 }, { itemId: 'destroyAll', level: 1, quantity: 1 }, { itemId: 'bossKillShot', level: 1, quantity: 1 }] },
    ],
    bossesPerGame: [
      { threshold: 2, credits: 0, items: [{ itemId: 'orbLevel', level: 1, quantity: 1 }] },
      { threshold: 4, credits: 1, items: [{ itemId: 'orbLevel', level: 1, quantity: 1 }, { itemId: 'forceField', level: 1, quantity: 1 }] },
      { threshold: 6, credits: 2, items: [{ itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'orbLevel', level: 1, quantity: 1 }, { itemId: 'forceField', level: 1, quantity: 1 }] },
      { threshold: 8, credits: 3, items: [{ itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'forceField', level: 1, quantity: 1 }, { itemId: 'orbLevel', level: 2, quantity: 1 }] },
      { threshold: 10, credits: 5, items: [{ itemId: 'extraLives', level: 2, quantity: 1 }, { itemId: 'forceField', level: 2, quantity: 1 }, { itemId: 'orbLevel', level: 2, quantity: 1 }, { itemId: 'bossKillShot', level: 1, quantity: 1 }] },
      { threshold: 12, credits: 8, items: [{ itemId: 'extraLives', level: 2, quantity: 1 }, { itemId: 'forceField', level: 2, quantity: 1 }, { itemId: 'orbLevel', level: 3, quantity: 1 }, { itemId: 'bossKillShot', level: 1, quantity: 1 }] },
    ],
    bossesCumulative: [
      { threshold: 5, credits: 1, items: [{ itemId: 'extraLives', level: 1, quantity: 1 }] },
      { threshold: 10, credits: 1, items: [{ itemId: 'forceField', level: 1, quantity: 1 }, { itemId: 'orbLevel', level: 1, quantity: 1 }] },
      { threshold: 25, credits: 2, items: [{ itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'forceField', level: 1, quantity: 1 }, { itemId: 'orbLevel', level: 1, quantity: 1 }] },
      { threshold: 50, credits: 3, items: [{ itemId: 'extraLives', level: 2, quantity: 1 }, { itemId: 'forceField', level: 2, quantity: 1 }, { itemId: 'orbLevel', level: 2, quantity: 1 }] },
      { threshold: 100, credits: 5, items: [{ itemId: 'extraLives', level: 2, quantity: 1 }, { itemId: 'forceField', level: 2, quantity: 1 }, { itemId: 'orbLevel', level: 2, quantity: 1 }, { itemId: 'bossKillShot', level: 1, quantity: 1 }] },
      { threshold: 200, credits: 8, items: [{ itemId: 'extraLives', level: 2, quantity: 1 }, { itemId: 'forceField', level: 2, quantity: 1 }, { itemId: 'orbLevel', level: 3, quantity: 1 }, { itemId: 'bossKillShot', level: 1, quantity: 1 }] },
      { threshold: 500, credits: 10, items: [{ itemId: 'extraLives', level: 3, quantity: 1 }, { itemId: 'forceField', level: 3, quantity: 1 }, { itemId: 'orbLevel', level: 3, quantity: 1 }, { itemId: 'bossKillShot', level: 1, quantity: 1 }] },
    ],
    // Add other categories... (continuing in next part due to length)
    scorePerGame: [
      { threshold: 10000, credits: 0, items: [{ itemId: 'orbLevel', level: 1, quantity: 1 }] },
      { threshold: 25000, credits: 1, items: [{ itemId: 'orbLevel', level: 1, quantity: 1 }, { itemId: 'forceField', level: 1, quantity: 1 }] },
      { threshold: 50000, credits: 1, items: [{ itemId: 'orbLevel', level: 2, quantity: 1 }, { itemId: 'forceField', level: 1, quantity: 1 }, { itemId: 'extraLives', level: 1, quantity: 1 }] },
      { threshold: 100000, credits: 2, items: [{ itemId: 'orbLevel', level: 2, quantity: 1 }, { itemId: 'forceField', level: 1, quantity: 1 }, { itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'slowTime', level: 1, quantity: 1 }] },
      { threshold: 150000, credits: 3, items: [{ itemId: 'orbLevel', level: 2, quantity: 1 }, { itemId: 'forceField', level: 2, quantity: 1 }, { itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'slowTime', level: 1, quantity: 1 }] },
      { threshold: 200000, credits: 5, items: [{ itemId: 'orbLevel', level: 3, quantity: 1 }, { itemId: 'forceField', level: 2, quantity: 1 }, { itemId: 'extraLives', level: 2, quantity: 1 }, { itemId: 'slowTime', level: 2, quantity: 1 }, { itemId: 'destroyAll', level: 1, quantity: 1 }] },
    ],
    scoreCumulative: [
      { threshold: 50000, credits: 0, items: [{ itemId: 'orbLevel', level: 1, quantity: 1 }] },
      { threshold: 100000, credits: 1, items: [{ itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'orbLevel', level: 1, quantity: 1 }] },
      { threshold: 250000, credits: 1, items: [{ itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'forceField', level: 1, quantity: 1 }, { itemId: 'orbLevel', level: 1, quantity: 1 }] },
      { threshold: 500000, credits: 2, items: [{ itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'forceField', level: 1, quantity: 1 }, { itemId: 'orbLevel', level: 2, quantity: 1 }, { itemId: 'slowTime', level: 1, quantity: 1 }] },
      { threshold: 1000000, credits: 3, items: [{ itemId: 'extraLives', level: 2, quantity: 1 }, { itemId: 'forceField', level: 2, quantity: 1 }, { itemId: 'orbLevel', level: 2, quantity: 1 }, { itemId: 'slowTime', level: 1, quantity: 1 }] },
      { threshold: 2500000, credits: 5, items: [{ itemId: 'extraLives', level: 2, quantity: 1 }, { itemId: 'forceField', level: 2, quantity: 1 }, { itemId: 'orbLevel', level: 2, quantity: 1 }, { itemId: 'slowTime', level: 2, quantity: 1 }] },
      { threshold: 5000000, credits: 10, items: [{ itemId: 'extraLives', level: 2, quantity: 1 }, { itemId: 'forceField', level: 2, quantity: 1 }, { itemId: 'orbLevel', level: 3, quantity: 1 }, { itemId: 'slowTime', level: 2, quantity: 1 }, { itemId: 'destroyAll', level: 1, quantity: 1 }] },
    ],
    distancePerGame: [
      { threshold: 5000, credits: 0, items: [{ itemId: 'orbLevel', level: 1, quantity: 1 }] },
      { threshold: 10000, credits: 0, items: [{ itemId: 'orbLevel', level: 1, quantity: 1 }, { itemId: 'forceField', level: 1, quantity: 1 }] },
      { threshold: 15000, credits: 1, items: [{ itemId: 'orbLevel', level: 1, quantity: 1 }, { itemId: 'forceField', level: 1, quantity: 1 }, { itemId: 'extraLives', level: 1, quantity: 1 }] },
      { threshold: 25000, credits: 2, items: [{ itemId: 'orbLevel', level: 2, quantity: 1 }, { itemId: 'forceField', level: 1, quantity: 1 }, { itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'slowTime', level: 1, quantity: 1 }] },
      { threshold: 40000, credits: 3, items: [{ itemId: 'orbLevel', level: 2, quantity: 1 }, { itemId: 'forceField', level: 2, quantity: 1 }, { itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'slowTime', level: 1, quantity: 1 }] },
      { threshold: 60000, credits: 5, items: [{ itemId: 'orbLevel', level: 3, quantity: 1 }, { itemId: 'forceField', level: 3, quantity: 1 }, { itemId: 'extraLives', level: 2, quantity: 1 }, { itemId: 'slowTime', level: 2, quantity: 1 }, { itemId: 'destroyAll', level: 1, quantity: 1 }] },
    ],
    distanceCumulative: [
      { threshold: 25000, credits: 0, items: [{ itemId: 'orbLevel', level: 1, quantity: 1 }] },
      { threshold: 50000, credits: 1, items: [{ itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'orbLevel', level: 1, quantity: 1 }] },
      { threshold: 100000, credits: 1, items: [{ itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'forceField', level: 1, quantity: 1 }, { itemId: 'orbLevel', level: 1, quantity: 1 }] },
      { threshold: 250000, credits: 2, items: [{ itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'forceField', level: 1, quantity: 1 }, { itemId: 'orbLevel', level: 1, quantity: 1 }, { itemId: 'slowTime', level: 1, quantity: 1 }] },
      { threshold: 500000, credits: 3, items: [{ itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'forceField', level: 1, quantity: 1 }, { itemId: 'orbLevel', level: 2, quantity: 1 }, { itemId: 'slowTime', level: 1, quantity: 1 }] },
      { threshold: 1000000, credits: 5, items: [{ itemId: 'extraLives', level: 2, quantity: 1 }, { itemId: 'forceField', level: 2, quantity: 1 }, { itemId: 'orbLevel', level: 2, quantity: 1 }, { itemId: 'slowTime', level: 2, quantity: 1 }] },
      { threshold: 2500000, credits: 10, items: [{ itemId: 'extraLives', level: 3, quantity: 1 }, { itemId: 'forceField', level: 3, quantity: 1 }, { itemId: 'orbLevel', level: 3, quantity: 1 }, { itemId: 'slowTime', level: 3, quantity: 1 }, { itemId: 'destroyAll', level: 1, quantity: 1 }] },
    ],
    coinsPerGame: [
      { threshold: 25, credits: 0, items: [{ itemId: 'forceField', level: 1, quantity: 1 }] },
      { threshold: 50, credits: 0, items: [{ itemId: 'forceField', level: 1, quantity: 1 }, { itemId: 'coinTractorBeam', level: 1, quantity: 1 }] },
      { threshold: 75, credits: 1, items: [{ itemId: 'forceField', level: 1, quantity: 1 }, { itemId: 'coinTractorBeam', level: 1, quantity: 1 }, { itemId: 'extraLives', level: 1, quantity: 1 }] },
      { threshold: 100, credits: 2, items: [{ itemId: 'forceField', level: 2, quantity: 1 }, { itemId: 'coinTractorBeam', level: 1, quantity: 1 }, { itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'slowTime', level: 1, quantity: 1 }] },
      { threshold: 125, credits: 3, items: [{ itemId: 'forceField', level: 2, quantity: 1 }, { itemId: 'coinTractorBeam', level: 2, quantity: 1 }, { itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'slowTime', level: 1, quantity: 1 }] },
      { threshold: 150, credits: 5, items: [{ itemId: 'forceField', level: 3, quantity: 1 }, { itemId: 'coinTractorBeam', level: 3, quantity: 1 }, { itemId: 'extraLives', level: 2, quantity: 1 }, { itemId: 'slowTime', level: 2, quantity: 1 }] },
    ],
    coinsCumulative: [
      { threshold: 250, credits: 0, items: [{ itemId: 'forceField', level: 1, quantity: 1 }] },
      { threshold: 500, credits: 1, items: [{ itemId: 'forceField', level: 1, quantity: 1 }, { itemId: 'coinTractorBeam', level: 1, quantity: 1 }] },
      { threshold: 1000, credits: 1, items: [{ itemId: 'forceField', level: 1, quantity: 1 }, { itemId: 'coinTractorBeam', level: 1, quantity: 1 }, { itemId: 'extraLives', level: 1, quantity: 1 }] },
      { threshold: 2500, credits: 1, items: [{ itemId: 'forceField', level: 1, quantity: 1 }, { itemId: 'coinTractorBeam', level: 1, quantity: 1 }, { itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'slowTime', level: 1, quantity: 1 }] },
      { threshold: 5000, credits: 2, items: [{ itemId: 'forceField', level: 2, quantity: 1 }, { itemId: 'coinTractorBeam', level: 1, quantity: 1 }, { itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'slowTime', level: 1, quantity: 1 }] },
      { threshold: 10000, credits: 3, items: [{ itemId: 'forceField', level: 2, quantity: 1 }, { itemId: 'coinTractorBeam', level: 2, quantity: 1 }, { itemId: 'extraLives', level: 2, quantity: 1 }, { itemId: 'slowTime', level: 1, quantity: 1 }] },
      { threshold: 25000, credits: 10, items: [{ itemId: 'forceField', level: 3, quantity: 1 }, { itemId: 'coinTractorBeam', level: 3, quantity: 1 }, { itemId: 'extraLives', level: 3, quantity: 1 }, { itemId: 'slowTime', level: 3, quantity: 1 }] },
    ],
    enemiesPerGame: [
      { threshold: 25, credits: 0, items: [{ itemId: 'orbLevel', level: 1, quantity: 1 }] },
      { threshold: 50, credits: 0, items: [{ itemId: 'orbLevel', level: 1, quantity: 1 }, { itemId: 'forceField', level: 1, quantity: 1 }] },
      { threshold: 100, credits: 1, items: [{ itemId: 'orbLevel', level: 1, quantity: 1 }, { itemId: 'forceField', level: 1, quantity: 1 }, { itemId: 'extraLives', level: 1, quantity: 1 }] },
      { threshold: 250, credits: 2, items: [{ itemId: 'orbLevel', level: 1, quantity: 1 }, { itemId: 'forceField', level: 1, quantity: 1 }, { itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'destroyAll', level: 1, quantity: 1 }, { itemId: 'slowTime', level: 1, quantity: 1 }] },
      { threshold: 400, credits: 3, items: [{ itemId: 'orbLevel', level: 2, quantity: 1 }, { itemId: 'forceField', level: 2, quantity: 1 }, { itemId: 'extraLives', level: 2, quantity: 1 }, { itemId: 'destroyAll', level: 1, quantity: 1 }, { itemId: 'slowTime', level: 2, quantity: 1 }] },
      { threshold: 500, credits: 5, items: [{ itemId: 'orbLevel', level: 3, quantity: 1 }, { itemId: 'forceField', level: 3, quantity: 1 }, { itemId: 'extraLives', level: 2, quantity: 1 }, { itemId: 'destroyAll', level: 1, quantity: 1 }, { itemId: 'slowTime', level: 3, quantity: 1 }] },
    ],
    enemiesCumulative: [
      { threshold: 100, credits: 0, items: [{ itemId: 'orbLevel', level: 1, quantity: 1 }] },
      { threshold: 250, credits: 1, items: [{ itemId: 'orbLevel', level: 1, quantity: 1 }] },
      { threshold: 500, credits: 1, items: [{ itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'orbLevel', level: 1, quantity: 1 }] },
      { threshold: 1000, credits: 2, items: [{ itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'forceField', level: 1, quantity: 1 }, { itemId: 'orbLevel', level: 1, quantity: 1 }] },
      { threshold: 2500, credits: 2, items: [{ itemId: 'extraLives', level: 1, quantity: 1 }, { itemId: 'forceField', level: 1, quantity: 1 }, { itemId: 'orbLevel', level: 2, quantity: 1 }, { itemId: 'destroyAll', level: 1, quantity: 1 }] },
      { threshold: 5000, credits: 3, items: [{ itemId: 'extraLives', level: 2, quantity: 1 }, { itemId: 'forceField', level: 2, quantity: 1 }, { itemId: 'orbLevel', level: 2, quantity: 1 }, { itemId: 'destroyAll', level: 1, quantity: 1 }, { itemId: 'slowTime', level: 1, quantity: 1 }] },
      { threshold: 10000, credits: 5, items: [{ itemId: 'extraLives', level: 3, quantity: 1 }, { itemId: 'forceField', level: 3, quantity: 1 }, { itemId: 'orbLevel', level: 3, quantity: 1 }, { itemId: 'destroyAll', level: 1, quantity: 1 }, { itemId: 'slowTime', level: 3, quantity: 1 }] },
    ],
    coinStreak: [
      { threshold: 10, credits: 0, items: [{ itemId: 'forceField', level: 1, quantity: 1 }] },
      { threshold: 20, credits: 0, items: [{ itemId: 'forceField', level: 1, quantity: 1 }, { itemId: 'coinTractorBeam', level: 1, quantity: 1 }] },
      { threshold: 30, credits: 1, items: [{ itemId: 'forceField', level: 2, quantity: 1 }, { itemId: 'coinTractorBeam', level: 1, quantity: 1 }] },
      { threshold: 40, credits: 2, items: [{ itemId: 'forceField', level: 2, quantity: 1 }, { itemId: 'coinTractorBeam', level: 2, quantity: 1 }] },
      { threshold: 50, credits: 3, items: [{ itemId: 'forceField', level: 3, quantity: 1 }, { itemId: 'coinTractorBeam', level: 3, quantity: 1 }] },
    ],
  };

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

  constructor() {
    this.config = getConfig();
    const network = this.config.sui.network;
    const rpcUrl = network === 'testnet'
      ? getFullnodeUrl('testnet')
      : network === 'mainnet'
      ? getFullnodeUrl('mainnet')
      : this.config.sui.rpcUrl;
    this.client = new SuiClient({ url: rpcUrl });
    this.storeService = new StoreService();
    this.gamePassService = new GamePassService();
  }

  /**
   * Get milestone definitions from on-chain (with caching)
   * Public method for API access
   */
  async getMilestoneDefinitions(): Promise<Record<string, MilestoneDefinition[]>> {
    // Check cache
    const now = Date.now();
    if (this.milestoneDefinitionsCache && (now - this.cacheTimestamp) < this.CACHE_TTL) {
      BadgeLogger.debug('Returning cached milestone definitions');
      return this.milestoneDefinitionsCache;
    }
    
    // If a fetch is already in progress, wait for it instead of starting a new one
    if (this.fetchPromise) {
      BadgeLogger.debug('Milestone definitions fetch already in progress, waiting for existing request');
      return this.fetchPromise;
    }
    
    // Start a new fetch
    this.fetchPromise = this._fetchMilestoneDefinitions();
    
    try {
      const result = await this.fetchPromise;
      return result;
    } finally {
      // Clear the promise so new requests can start
      this.fetchPromise = null;
    }
  }
  
  private async _fetchMilestoneDefinitions(): Promise<Record<string, MilestoneDefinition[]>> {
    const now = Date.now();
    
    try {
      const registryId = this.config.contracts.achievementRegistry;
      if (!registryId) {
        BadgeLogger.error('Achievement registry not configured. Milestone definitions must be initialized on-chain.');
        throw new Error('Achievement registry not configured. Please initialize milestone definitions or migrate from old contract.');
      }

      const packageId = this.config.contracts.gameScore?.split('::')[0] || this.config.contracts.gameScore;
      if (!packageId) {
        BadgeLogger.error('Game score package not configured. Milestone definitions must be initialized on-chain.');
        throw new Error('Game score package not configured. Please initialize milestone definitions or migrate from old contract.');
      }

      const senderAddress = this.adminWallet.getAddress();
      const definitions: Record<string, MilestoneDefinition[]> = {};

      // Fetch definitions for each category
      for (const [categoryName, categoryCode] of Object.entries(this.categoryCodes)) {
        try {
          // First, get all milestone levels for this category
          const txb = new Transaction();
          txb.setSender(senderAddress);
          txb.moveCall({
            target: `${packageId}::achievement_system::get_all_milestone_levels_for_category`,
            arguments: [
              txb.object(registryId),
              txb.pure.u8(categoryCode),
            ],
          });

          const levelsResult = await this.client.devInspectTransactionBlock({
            sender: senderAddress,
            transactionBlock: txb,
          });

          // Parse milestone levels
          let milestoneLevels: number[] = [];
          if (levelsResult.results && levelsResult.results[0] && 'returnValues' in levelsResult.results[0]) {
            const returnValues = levelsResult.results[0].returnValues;
            if (returnValues && returnValues.length > 0) {
              const val = returnValues[0];
              
              // Sui return values can be in different formats:
              // 1. [base64String, "type"] - tuple format
              // 2. [[byteArray], "type"] - nested array format  
              // 3. base64String - direct string
              // 4. [byteArray] - direct array
              
              let byteArray: number[] | null = null;
              
              if (Array.isArray(val)) {
                if (val.length === 2) {
                  // Format: [bytes, "type"] or [[byteArray], "type"]
                  const bytesVal = val[0];
                  if (Array.isArray(bytesVal)) {
                    // Format: [[byteArray], "type"]
                    byteArray = bytesVal as number[];
                  } else if (typeof bytesVal === 'string') {
                    // Format: [base64String, "type"]
                    try {
                      const buffer = Buffer.from(bytesVal, 'base64');
                      byteArray = Array.from(buffer);
                    } catch (e) {
                      BadgeLogger.debug(`Failed to parse base64 for ${categoryName}: ${e instanceof Error ? e.message : 'Unknown'}`);
                      continue;
                    }
                  }
                } else if (val.length > 0 && typeof val[0] === 'number') {
                  // Format: [byteArray] - direct array of numbers
                  // Check that all elements are numbers (not a tuple)
                  if (val.every((item: unknown) => typeof item === 'number')) {
                    byteArray = val as unknown as number[];
                  }
                }
              } else if (typeof val === 'string') {
                // Format: base64String
                try {
                  const buffer = Buffer.from(val, 'base64');
                  byteArray = Array.from(buffer);
                } catch (e) {
                  BadgeLogger.debug(`Failed to parse base64 string for ${categoryName}: ${e instanceof Error ? e.message : 'Unknown'}`);
                  continue;
                }
              }
              
              if (byteArray && byteArray.length > 0) {
                // Vector<u8> format in BCS: first byte is length (uleb128 or u8), followed by u8 values
                // For small vectors, length is typically a single u8
                const length = byteArray[0];
                if (length > 0 && length <= 255 && byteArray.length >= length + 1) {
                  for (let i = 0; i < length; i++) {
                    milestoneLevels.push(byteArray[1 + i]);
                  }
                } else {
                  BadgeLogger.debug(`Invalid vector length for ${categoryName}: length=${length}, arrayLength=${byteArray.length}`);
                }
              } else {
                BadgeLogger.debug(`Could not extract byte array for ${categoryName}, val type: ${typeof val}, isArray: ${Array.isArray(val)}`);
              }
            }
          }

          if (milestoneLevels.length === 0) {
            BadgeLogger.warn(`No milestone levels found in category_milestone_levels table for ${categoryName}, attempting to discover milestones by querying directly`);
            // The category_milestone_levels table may be empty, but milestones might still exist
            // Try querying common levels (1-20) to discover what exists
            const discoveredLevels: number[] = [];
            const discoveredDefinitions: MilestoneDefinition[] = [];
            let querySuccessCount = 0;
            let queryErrorCount = 0;
            let existsFalseCount = 0;
            
            for (let testLevel = 1; testLevel <= 20; testLevel++) { // Increased to 20 to find more milestones
              try {
                const testTxb = new Transaction();
                testTxb.setSender(senderAddress);
                testTxb.moveCall({
                  target: `${packageId}::achievement_system::get_milestone_definition_full`,
                  arguments: [
                    testTxb.object(registryId),
                    testTxb.pure.u8(categoryCode),
                    testTxb.pure.u8(testLevel),
                  ],
                });

                BadgeLogger.info(`Discovery query for ${categoryName} level ${testLevel}`, {
                  packageId,
                  registryId,
                  categoryCode,
                  categoryName,
                  testLevel,
                  queryTarget: `${packageId}::achievement_system::get_milestone_definition_full`,
                });

                const testResult = await this.client.devInspectTransactionBlock({
                  sender: senderAddress,
                  transactionBlock: testTxb,
                });

                if (testResult && testResult.results && testResult.results[0] && 'returnValues' in testResult.results[0]) {
                  const returnValues = testResult.results[0].returnValues;
                  // Updated to handle new return signature: (exists, milestone_id, threshold, credits, items)
                  if (returnValues && returnValues.length >= 5) {
                    const extractBytes = (val: unknown): number[] | string | null => {
                      if (Array.isArray(val)) {
                        if (val.length === 2) {
                          const bytesVal = val[0];
                          if (Array.isArray(bytesVal)) {
                            return bytesVal as number[];
                          } else if (typeof bytesVal === 'string') {
                            return bytesVal;
                          }
                        } else if (val.length > 0 && typeof val[0] === 'number') {
                          if ((val as unknown[]).every((item: unknown) => typeof item === 'number')) {
                            return val as number[];
                          }
                        }
                      } else if (typeof val === 'string') {
                        return val;
                      }
                      return null;
                    };
                    
                    // Parse exists value - match verification script logic
                    const existsVal = returnValues[0];
                    let existsBytes: string | number[] | null = null;
                    
                    // Handle different return value formats (matching verify-milestones-onchain.ts)
                    if (Array.isArray(existsVal) && existsVal.length === 2) {
                      // Format: [bytes, "type"]
                      const bytesVal = existsVal[0];
                      if (typeof bytesVal === 'string') {
                        existsBytes = bytesVal; // base64 string
                      } else if (Array.isArray(bytesVal)) {
                        existsBytes = bytesVal as number[]; // byte array
                      }
                    } else if (typeof existsVal === 'string') {
                      existsBytes = existsVal; // base64 string
                    } else if (Array.isArray(existsVal)) {
                      existsBytes = existsVal as unknown as number[]; // byte array
                    }
                    
                    // Parse boolean (matching verify-milestones-onchain.ts logic)
                    let exists = false;
                    if (typeof existsBytes === 'string') {
                      // Base64 string format - bool is 0x00 for false, 0x01 for true
                      try {
                        const buffer = Buffer.from(existsBytes, 'base64');
                        exists = buffer.length > 0 && buffer[0] === 1;
                      } catch (e) {
                        BadgeLogger.warn(`Failed to parse existsBytes as base64 for ${categoryName} level ${testLevel}: ${e instanceof Error ? e.message : 'Unknown'}`);
                        exists = false;
                      }
                    } else if (Array.isArray(existsBytes)) {
                      // Array format
                      exists = existsBytes.length > 0 && existsBytes[0] === 1;
                    }
                    
                    querySuccessCount++;
                    
                    BadgeLogger.info(`Discovery query for ${categoryName} level ${testLevel}: exists=${exists}`, {
                      returnValuesLength: returnValues.length,
                      expectedLength: 5,
                      hasMilestoneId: returnValues.length >= 5,
                      existsValType: typeof existsVal,
                      existsValIsArray: Array.isArray(existsVal),
                      existsBytesType: typeof existsBytes,
                      existsBytesIsArray: Array.isArray(existsBytes),
                      existsBytesPreview: Array.isArray(existsBytes) ? existsBytes.slice(0, 5) : String(existsBytes).substring(0, 50),
                      rawExistsVal: JSON.stringify(existsVal).substring(0, 100),
                    });
                    
                    if (!exists) {
                      existsFalseCount++;
                    }
                    
                    if (exists) {
                      discoveredLevels.push(testLevel);
                      // NEW SIGNATURE: (exists, milestone_id, threshold, credits, items)
                      const milestoneIdBytes = extractBytes(returnValues[1]);
                      const thresholdBytes = extractBytes(returnValues[2]);
                      const creditsBytes = extractBytes(returnValues[3]);
                      const itemsBytes = extractBytes(returnValues[4]);
                      
                      const milestoneId = milestoneIdBytes ? Number(this.parseU64FromBytes(milestoneIdBytes)) : undefined;
                      const threshold = this.parseU64FromBytes(thresholdBytes);
                      const credits = this.parseU64FromBytes(creditsBytes);
                      const items = this.parseItemRewardsVector(itemsBytes, packageId);

                      discoveredDefinitions.push({
                        milestoneId,
                        threshold,
                        credits,
                        items,
                        level: testLevel,
                      });
                      
                      BadgeLogger.info(`Discovered milestone for ${categoryName}: level ${testLevel}, milestoneId=${milestoneId}, threshold=${threshold}, credits=${credits}, items=${items.length}`);
                    }
                  } else {
                    BadgeLogger.warn(`Discovery query for ${categoryName} level ${testLevel} returned insufficient return values: ${returnValues?.length || 0} (expected 5 for new contract signature)`);
                  }
                } else {
                  BadgeLogger.warn(`Discovery query for ${categoryName} level ${testLevel} returned no results`, {
                    hasResults: !!testResult?.results,
                    resultsLength: testResult?.results?.length || 0,
                    firstResultHasReturnValues: testResult?.results?.[0] && 'returnValues' in testResult.results[0],
                  });
                }
                
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 50));
              } catch (error) {
                queryErrorCount++;
                // Log the error to understand why discovery is failing
                const errorMsg = error instanceof Error ? error.message : String(error);
                // Log all errors to see what's happening
                BadgeLogger.warn(`Discovery query error for ${categoryName} level ${testLevel}: ${errorMsg}`);
                // Continue to next level
                continue;
              }
            }
            
            BadgeLogger.info(`Discovery summary for ${categoryName}`, {
              totalQueries: 20,
              successfulQueries: querySuccessCount,
              errors: queryErrorCount,
              existsFalse: existsFalseCount,
              milestonesFound: discoveredDefinitions.length,
              discoveredLevels,
            });
            
            if (discoveredDefinitions.length > 0) {
              // Sort by threshold and use discovered definitions
              discoveredDefinitions.sort((a, b) => a.threshold - b.threshold);
              definitions[categoryName] = discoveredDefinitions;
              BadgeLogger.info(`Discovered ${discoveredDefinitions.length} milestones for ${categoryName} by direct query`, {
                levels: discoveredLevels,
              });
            } else {
              BadgeLogger.warn(`No milestones discovered for ${categoryName} by direct query`, {
                querySuccessCount,
                queryErrorCount,
                existsFalseCount,
              });
              // Don't use fallback - fail gracefully
              definitions[categoryName] = [];
              BadgeLogger.warn(`Category ${categoryName} has no milestone definitions on-chain. Please initialize or migrate milestones.`);
            }
            continue;
          }

          // Fetch all definitions for this category in a single batch call
          let categoryDefinitions: MilestoneDefinition[] = [];
          
          if (milestoneLevels.length > 0) {
            // Retry logic for rate limiting (429 errors)
            let retries = 3;
            let batchResult: any = null;
            
            while (retries > 0) {
              try {
                const txb2 = new Transaction();
                txb2.setSender(senderAddress);
                txb2.moveCall({
                  target: `${packageId}::achievement_system::get_milestone_definitions_for_category`,
                  arguments: [
                    txb2.object(registryId),
                    txb2.pure.u8(categoryCode),
                    txb2.pure('vector<u8>', milestoneLevels), // Pass all levels at once
                  ],
                });

                batchResult = await this.client.devInspectTransactionBlock({
                  sender: senderAddress,
                  transactionBlock: txb2,
                });
                
                // Success - break out of retry loop
                break;
              } catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                
                // Check for rate limiting (429)
                if (errorMsg.includes('429') || errorMsg.includes('rate limit') || errorMsg.includes('Unexpected status code: 429')) {
                  retries--;
                  if (retries > 0) {
                    // Exponential backoff: wait 1s, 2s, 4s
                    const waitTime = Math.pow(2, 3 - retries) * 1000;
                    BadgeLogger.warn(`Rate limited (429) fetching batch definitions for ${categoryName}, retrying in ${waitTime}ms... (${retries} attempts remaining)`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    continue;
                  } else {
                    BadgeLogger.warn(`Failed to fetch batch milestone definitions for ${categoryName} after retries`, {
                      error: errorMsg,
                    });
                    break; // Give up after retries
                  }
                } else {
                  // Not a rate limit error - don't retry
                  throw error;
                }
              }
            }
            
            // Parse batch result
            if (batchResult && batchResult.results && batchResult.results[0] && 'returnValues' in batchResult.results[0]) {
              const returnValues = batchResult.results[0].returnValues;
              if (returnValues && returnValues.length > 0) {
                try {
                  // The function returns vector<MilestoneDefinition>
                  // Each MilestoneDefinition contains: threshold (u64), credits (u64), items (vector<ItemReward>)
                  // We need to parse the vector structure
                  
                  const extractBytes = (val: unknown): number[] | string | null => {
                    if (Array.isArray(val)) {
                      if (val.length === 2) {
                        const bytesVal = val[0];
                        if (Array.isArray(bytesVal)) {
                          return bytesVal as number[];
                        } else if (typeof bytesVal === 'string') {
                          return bytesVal;
                        }
                      } else if (val.length > 0 && typeof val[0] === 'number') {
                        if ((val as unknown[]).every((item: unknown) => typeof item === 'number')) {
                          return val as number[];
                        }
                      }
                    } else if (typeof val === 'string') {
                      return val;
                    }
                    return null;
                  };
                  
                  // Parse the vector<MilestoneDefinition> return value
                  // Note: devInspectTransactionBlock may return vectors in different formats
                  // We'll try to parse it, but fallback to individual fetches if it fails
                  const vectorBytes = extractBytes(returnValues[0]);
                  if (vectorBytes) {
                    let buffer: Buffer;
                    if (typeof vectorBytes === 'string') {
                      buffer = Buffer.from(vectorBytes, 'base64');
                    } else {
                      buffer = Buffer.from(vectorBytes);
                    }
                    
                    // Parse ULEB128 vector length
                    let offset = 0;
                    let vectorLength = 0;
                    let lengthBytes = 0;
                    
                    if (buffer.length > 0) {
                      // ULEB128 decoding: read bytes until we find one with MSB = 0
                      let shift = 0;
                      while (lengthBytes < 5 && offset < buffer.length) {
                        const byte = buffer.readUInt8(offset);
                        lengthBytes++;
                        vectorLength = vectorLength | ((byte & 0x7f) << shift);
                        offset++;
                        if ((byte & 0x80) === 0) break; // MSB is 0, we're done
                        shift += 7;
                      }
                      
                      if (lengthBytes === 0 || vectorLength === 0) {
                        // If parsing failed, try simple u8 length (for small vectors)
                        offset = 0;
                        vectorLength = buffer.length > 0 ? buffer.readUInt8(0) : 0;
                        offset = 1;
                      }
                    }
                    
                    // Parse each MilestoneDefinition in the vector
                    // NEW MilestoneDefinition structure: milestone_id (u64), milestone_level (u8), category (u8), threshold (u64), credits (u64), items (vector<ItemReward>)
                    // ItemReward structure: item_id (u8), level (u8), quantity (u64)
                    
                    for (let i = 0; i < vectorLength && i < milestoneLevels.length; i++) {
                      // Use the level from milestoneLevels array as fallback
                      let parsedLevel = milestoneLevels[i];
                      
                      // Parse milestone_id (u64, 8 bytes, little-endian) - NEW FIELD
                      if (offset + 8 > buffer.length) break;
                      const milestoneId = Number(buffer.readBigUInt64LE(offset));
                      offset += 8;
                      
                      // Parse milestone_level (u8, 1 byte)
                      if (offset + 1 > buffer.length) break;
                      parsedLevel = buffer.readUInt8(offset);
                      offset += 1;
                      
                      // Parse category (u8, 1 byte) - we already know this, but need to read it
                      if (offset + 1 > buffer.length) break;
                      const parsedCategory = buffer.readUInt8(offset);
                      offset += 1;
                      
                      // Parse threshold (u64, 8 bytes, little-endian)
                      if (offset + 8 > buffer.length) break;
                      const threshold = Number(buffer.readBigUInt64LE(offset));
                      offset += 8;
                      
                      // Parse credits (u64, 8 bytes, little-endian)
                      if (offset + 8 > buffer.length) break;
                      const credits = Number(buffer.readBigUInt64LE(offset));
                      offset += 8;
                      
                      // Parse items vector<ItemReward> (ULEB128 length)
                      if (offset >= buffer.length) break;
                      let itemsLength = 0;
                      let itemsLengthBytes = 0;
                      let itemsOffset = offset;
                      let itemsShift = 0;
                      
                      while (itemsLengthBytes < 5 && itemsOffset < buffer.length) {
                        const byte = buffer.readUInt8(itemsOffset);
                        itemsLengthBytes++;
                        itemsLength = itemsLength | ((byte & 0x7f) << itemsShift);
                        itemsOffset++;
                        if ((byte & 0x80) === 0) break;
                        itemsShift += 7;
                      }
                      
                      // If ULEB128 parsing failed, try simple u8
                      if (itemsLengthBytes === 0 || itemsLength === 0) {
                        itemsLength = buffer.length > offset ? buffer.readUInt8(offset) : 0;
                        itemsOffset = offset + 1;
                      }
                      
                      offset = itemsOffset;
                      
                      const items: Array<{ itemId: string; level: number; quantity: number }> = [];
                      for (let j = 0; j < itemsLength; j++) {
                        if (offset + 10 > buffer.length) break; // item_id (1) + item_level (1) + quantity (8)
                        
                        const itemIdU8 = buffer.readUInt8(offset);
                        offset += 1;
                        const itemLevel = buffer.readUInt8(offset);
                        offset += 1;
                        const quantity = Number(buffer.readBigUInt64LE(offset));
                        offset += 8;
                        
                        // Map u8 item ID to string
                        const itemIdMap: Record<number, string> = {
                          0: 'orbLevel',
                          1: 'forceField',
                          2: 'extraLives',
                          3: 'slowTime',
                          4: 'coinTractorBeam',
                          5: 'destroyAll',
                          6: 'bossKillShot',
                        };
                        
                        const itemId = itemIdMap[itemIdU8] || `unknown_${itemIdU8}`;
                        items.push({ itemId, level: itemLevel, quantity });
                      }
                      
                      categoryDefinitions.push({
                        milestoneId,
                        threshold,
                        credits,
                        items,
                        level: parsedLevel, // Use the parsed level from the struct
                      });
                    }
                  }
                } catch (error) {
                  const errorMsg = error instanceof Error ? error.message : String(error);
                  BadgeLogger.warn(`Failed to parse batch milestone definitions for ${categoryName}`, {
                    error: errorMsg,
                  });
                  // Clear categoryDefinitions so fallback logic runs
                  categoryDefinitions = [];
                  // Continue to fallback logic below
                }
              }
            }
            
            // Fallback: if batch fetch failed or parsing failed, fetch individually
            if (categoryDefinitions.length === 0 && milestoneLevels.length > 0) {
              BadgeLogger.debug(`Batch fetch failed or returned empty, falling back to individual fetches for ${categoryName}`, {
                milestoneLevelsCount: milestoneLevels.length,
              });
              for (const level of milestoneLevels) {
                try {
                  const txb2 = new Transaction();
                  txb2.setSender(senderAddress);
                  txb2.moveCall({
                    target: `${packageId}::achievement_system::get_milestone_definition_full`,
                    arguments: [
                      txb2.object(registryId),
                      txb2.pure.u8(categoryCode),
                      txb2.pure.u8(level),
                    ],
                  });

                  const defResult = await this.client.devInspectTransactionBlock({
                    sender: senderAddress,
                    transactionBlock: txb2,
                  });

                  // Parse milestone definition
                  if (defResult && defResult.results && defResult.results[0] && 'returnValues' in defResult.results[0]) {
                    const returnValues = defResult.results[0].returnValues;
                    if (returnValues && returnValues.length >= 5) {
                      const extractBytes = (val: unknown): number[] | string | null => {
                        if (Array.isArray(val)) {
                          if (val.length === 2) {
                            const bytesVal = val[0];
                            if (Array.isArray(bytesVal)) {
                              return bytesVal as number[];
                            } else if (typeof bytesVal === 'string') {
                              return bytesVal;
                            }
                          } else if (val.length > 0 && typeof val[0] === 'number') {
                            if ((val as unknown[]).every((item: unknown) => typeof item === 'number')) {
                              return val as number[];
                            }
                          }
                        } else if (typeof val === 'string') {
                          return val;
                        }
                        return null;
                      };
                      
                      const existsBytes = extractBytes(returnValues[0]);
                      const milestoneIdBytes = extractBytes(returnValues[1]);
                      const thresholdBytes = extractBytes(returnValues[2]);
                      const creditsBytes = extractBytes(returnValues[3]);
                      const itemsBytes = extractBytes(returnValues[4]);
                      
                      const exists = this.parseBoolFromBytes(existsBytes);
                      if (!exists) continue;

                      const milestoneId = milestoneIdBytes ? Number(this.parseU64FromBytes(milestoneIdBytes)) : undefined;
                      const threshold = this.parseU64FromBytes(thresholdBytes);
                      const credits = this.parseU64FromBytes(creditsBytes);
                      const items = this.parseItemRewardsVector(itemsBytes, packageId);

                      categoryDefinitions.push({
                        milestoneId,
                        threshold,
                        credits,
                        items,
                        level,
                      });
                    }
                  }
                } catch (error) {
                  BadgeLogger.warn(`Failed to fetch milestone definition for ${categoryName} level ${level}`, {
                    error: error instanceof Error ? error.message : 'Unknown error',
                  });
                }
                
                // Small delay between fetches to help avoid rate limiting
                if (level !== milestoneLevels[milestoneLevels.length - 1]) {
                  await new Promise(resolve => setTimeout(resolve, 100));
                }
              }
            }
          }

          // Sort by threshold (ascending)
          categoryDefinitions.sort((a, b) => a.threshold - b.threshold);
          
          // Fail gracefully if no definitions found
          if (categoryDefinitions.length === 0) {
            BadgeLogger.warn(`No milestone definitions found for category ${categoryName} on-chain. Please initialize or migrate milestones.`);
            definitions[categoryName] = [];
          } else {
            definitions[categoryName] = categoryDefinitions;
          }

        } catch (error) {
          BadgeLogger.error(`Failed to fetch milestone definitions for category ${categoryName}`, {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          // Fail gracefully - don't use fallback
          definitions[categoryName] = [];
          BadgeLogger.warn(`Category ${categoryName} will have no milestone definitions. Please initialize or migrate milestones.`);
        }
      }

      // Verification: Compare fetched data with expected fallback definitions
      const fallbackDefs = this.milestoneDefinitionsFallback;
      const verificationResults: Record<string, { fetched: number; expected: number; matches: number; mismatches: Array<{ level: number; issue: string }> }> = {};
      
      for (const [categoryName, expectedDefs] of Object.entries(fallbackDefs)) {
        const fetchedDefs = definitions[categoryName] || [];
        const mismatches: Array<{ level: number; issue: string }> = [];
        
        // Check if we have the expected number of milestones
        if (fetchedDefs.length !== expectedDefs.length) {
          mismatches.push({
            level: -1,
            issue: `Count mismatch: fetched ${fetchedDefs.length}, expected ${expectedDefs.length}`,
          });
        }
        
        // Compare each milestone
        for (let i = 0; i < Math.min(fetchedDefs.length, expectedDefs.length); i++) {
          const fetched = fetchedDefs[i];
          const expected = expectedDefs[i];
          const level = fetched.level || (i + 1);
          
          if (fetched.threshold !== expected.threshold) {
            mismatches.push({
              level,
              issue: `Threshold mismatch: fetched ${fetched.threshold}, expected ${expected.threshold}`,
            });
          }
          
          if (fetched.credits !== expected.credits) {
            mismatches.push({
              level,
              issue: `Credits mismatch: fetched ${fetched.credits}, expected ${expected.credits}`,
            });
          }
          
          // Compare items (simplified - just count and first item)
          if (fetched.items.length !== expected.items.length) {
            mismatches.push({
              level,
              issue: `Items count mismatch: fetched ${fetched.items.length}, expected ${expected.items.length}`,
            });
          }
        }
        
        const matches = expectedDefs.length - mismatches.length;
        verificationResults[categoryName] = {
          fetched: fetchedDefs.length,
          expected: expectedDefs.length,
          matches,
          mismatches,
        };
        
        if (mismatches.length > 0) {
          BadgeLogger.warn(`Milestone verification mismatch for ${categoryName}`, {
            fetched: fetchedDefs.length,
            expected: expectedDefs.length,
            mismatches: mismatches.slice(0, 5), // Log first 5 mismatches
            totalMismatches: mismatches.length,
          });
        }
      }
      
      // Update cache
      this.milestoneDefinitionsCache = definitions;
      this.cacheTimestamp = now;

      BadgeLogger.debug('Milestone definitions fetched from on-chain', {
        categoryCount: Object.keys(definitions).length,
        totalMilestones: Object.values(definitions).reduce((sum, defs) => sum + defs.length, 0),
        verification: {
          totalCategories: Object.keys(verificationResults).length,
          categoriesWithMismatches: Object.values(verificationResults).filter(r => r.mismatches.length > 0).length,
          totalMismatches: Object.values(verificationResults).reduce((sum, r) => sum + r.mismatches.length, 0),
        },
      });

      return definitions;
    } catch (error) {
      BadgeLogger.error('Failed to fetch milestone definitions from on-chain', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(
        'Failed to fetch milestone definitions from on-chain. ' +
        'Please initialize milestone definitions (factory default) or migrate from old contract. ' +
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
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
          0: 'orbLevel',
          1: 'forceField',
          2: 'extraLives',
          3: 'slowTime',
          4: 'coinTractorBeam',
          5: 'destroyAll',
          6: 'bossKillShot',
        };

        items.push({
          itemId: itemIdMap[itemId] || 'orbLevel',
          level,
          quantity: Number(quantity),
        });

        offset += 10; // 1 + 1 + 8 = 10 bytes per ItemReward
      }
    } catch (error) {
      BadgeLogger.warn('Failed to parse ItemReward vector', {
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
   * Get player statistics from blockchain
   */
  async getPlayerStats(playerAddress: string): Promise<{
    success: boolean;
    stats?: PlayerStats;
    error?: string;
  }> {
    try {
      const statsRegistryId = this.config.contracts.statisticsRegistry;
      if (!statsRegistryId) {
        return {
          success: false,
          error: 'Statistics registry not configured',
        };
      }

      // Query PlayerStats from StatisticsRegistry
      const statsObject = await this.client.getObject({
        id: statsRegistryId,
        options: { showContent: true },
      });

      if (!statsObject.data || !('content' in statsObject.data)) {
        return {
          success: false,
          error: 'Statistics registry not found',
        };
      }

      // Get player stats from the table
      // Note: We need to query the table for the player's stats
      // The table structure is: Table<address, PlayerStats>
      // We'll use devInspectTransactionBlock to query it
      const packageId = this.config.contracts.gameScore?.split('::')[0] || this.config.contracts.gameScore;
      
      const senderAddress = this.adminWallet.getAddress();
      
      const txb = new Transaction();
      txb.setSender(senderAddress);
      txb.moveCall({
        target: `${packageId}::score_submission::get_player_stats`,
        arguments: [
          txb.object(statsRegistryId),
          txb.pure.address(playerAddress),
        ],
      });

      // Use devInspectTransactionBlock to read the stats
      const result = await this.client.devInspectTransactionBlock({
        sender: senderAddress,
        transactionBlock: txb,
      });

      if (result.results && result.results[0] && 'returnValues' in result.results[0]) {
        const returnValues = result.results[0].returnValues;
        if (returnValues && returnValues.length >= 16) {
          // Parse the PlayerStats return values
          // Format: (has_stats, total_games, best_score, best_distance, best_coins, best_bosses_defeated, best_enemies_defeated, best_coin_streak, total_score, total_distance, total_coins, total_bosses_defeated, total_enemies_defeated, total_coin_streak, first_game_date, last_game_date)
          // Each returnValue is a tuple [bytes (array or base64 string), type (string)]
          
          // Helper to extract bytes from return value
          const extractBytes = (val: unknown): number[] | null => {
            if (!Array.isArray(val) || val.length !== 2) return null;
            const [data, type] = val;
            // data can be an array of numbers (bytes) or a base64 string
            if (Array.isArray(data)) {
              return data as number[];
            } else if (typeof data === 'string') {
              // Base64 decode if it's a string
              try {
                const decoded = Buffer.from(data, 'base64');
                return Array.from(decoded);
              } catch {
                return null;
              }
            }
            return null;
          };

          // Parse bool from bytes
          const parseBoolFromBytes = (bytes: number[] | null): boolean => {
            if (!bytes || bytes.length === 0) return false;
            return bytes[0] === 1;
          };

          // Parse u64 from bytes (little-endian)
          const parseU64FromBytes = (bytes: number[] | null): number => {
            if (!bytes || bytes.length < 8) return 0;
            let value = 0;
            for (let i = 0; i < 8; i++) {
              value += (bytes[i] || 0) * Math.pow(256, i);
            }
            return value;
          };

          const hasStatsBytes = extractBytes(returnValues[0]);
          const hasStats = parseBoolFromBytes(hasStatsBytes);
          
          if (!hasStats) {
            // Player has no stats yet
            return {
              success: true,
              stats: {
                totalGames: 0,
                bestScore: 0,
                bestDistance: 0,
                bestCoins: 0,
                bestBossesDefeated: 0,
                bestEnemiesDefeated: 0,
                bestCoinStreak: 0,
                totalScore: 0,
                totalDistance: 0,
                totalCoins: 0,
                totalBossesDefeated: 0,
                totalEnemiesDefeated: 0,
              },
            };
          }

          const stats: PlayerStats = {
            totalGames: parseU64FromBytes(extractBytes(returnValues[1])),
            bestScore: parseU64FromBytes(extractBytes(returnValues[2])),
            bestDistance: parseU64FromBytes(extractBytes(returnValues[3])),
            bestCoins: parseU64FromBytes(extractBytes(returnValues[4])),
            bestBossesDefeated: parseU64FromBytes(extractBytes(returnValues[5])),
            bestEnemiesDefeated: parseU64FromBytes(extractBytes(returnValues[6])),
            bestCoinStreak: parseU64FromBytes(extractBytes(returnValues[7])),
            totalScore: parseU64FromBytes(extractBytes(returnValues[8])),
            totalDistance: parseU64FromBytes(extractBytes(returnValues[9])),
            totalCoins: parseU64FromBytes(extractBytes(returnValues[10])),
            totalBossesDefeated: parseU64FromBytes(extractBytes(returnValues[11])),
            totalEnemiesDefeated: parseU64FromBytes(extractBytes(returnValues[12])),
          };

          BadgeLogger.debug('Player stats fetched', {
            playerAddress,
            totalGames: stats.totalGames,
            bestScore: stats.bestScore,
            totalScore: stats.totalScore,
            bestCoins: stats.bestCoins,
            totalCoins: stats.totalCoins,
            bestBossesDefeated: stats.bestBossesDefeated,
            totalBossesDefeated: stats.totalBossesDefeated,
          });

          return { success: true, stats };
        }
      }

      // If no stats found, return default stats
      return {
        success: true,
        stats: {
          totalGames: 0,
          bestScore: 0,
          bestDistance: 0,
          bestCoins: 0,
          bestBossesDefeated: 0,
          bestEnemiesDefeated: 0,
          bestCoinStreak: 0,
          totalScore: 0,
          totalDistance: 0,
          totalCoins: 0,
          totalBossesDefeated: 0,
          totalEnemiesDefeated: 0,
        },
      };
    } catch (error) {
      BadgeLogger.error('Error getting player stats', {
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
    BadgeLogger.debug('Cleared claimed milestones cache', { playerAddress });
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

      const registryId = this.config.contracts.achievementRegistry;
      if (!registryId) {
        return {
          success: false,
          error: 'Achievement registry not configured',
        };
      }

      const packageId = this.config.contracts.gameScore?.split('::')[0] || this.config.contracts.gameScore;
      const senderAddress = this.adminWallet.getAddress();
      
      const txb = new Transaction();
      txb.setSender(senderAddress);
      txb.moveCall({
        target: `${packageId}::achievement_system::get_claimed_milestone_ids_for_player`,
        arguments: [
          txb.object(registryId),
          txb.pure.address(playerAddress),
        ],
      });

      const result = await this.client.devInspectTransactionBlock({
        sender: senderAddress,
        transactionBlock: txb,
      });

      // EXTENSIVE LOGGING - Raw result
      console.log('🔍 [CLAIMED IDs] Raw devInspect result:', {
        playerAddress,
        hasResults: !!result.results,
        resultsLength: result.results?.length || 0,
        firstResult: result.results?.[0] ? {
          hasReturnValues: 'returnValues' in result.results[0],
          returnValuesLength: ('returnValues' in result.results[0]) ? result.results[0].returnValues?.length : 0,
          returnValues: ('returnValues' in result.results[0]) ? result.results[0].returnValues : undefined,
        } : undefined,
      });

      const claimedIds: number[] = [];

      if (result.results && result.results[0] && 'returnValues' in result.results[0]) {
        const returnValues = result.results[0].returnValues;
        console.log('🔍 [CLAIMED IDs] Processing returnValues:', {
          playerAddress,
          returnValuesLength: returnValues?.length || 0,
          returnValues: returnValues,
        });
        
        if (returnValues && returnValues.length > 0) {
          const parsed = returnValues[0];
          console.log('🔍 [CLAIMED IDs] Parsing first return value:', {
            playerAddress,
            parsed,
            isArray: Array.isArray(parsed),
            parsedLength: Array.isArray(parsed) ? parsed.length : 0,
            parsedType: typeof parsed,
          });
          
          // Handle two formats:
          // 1. [string (base64), string (type)] - old format
          // 2. [number[] (byte array), string (type)] - new format
          if (Array.isArray(parsed) && parsed.length === 2) {
            const data = parsed[0];
            const type = parsed[1] as string;
            
            let buffer: Buffer;
            
            if (typeof data === 'string') {
              // Format 1: base64 string
              console.log('🔍 [CLAIMED IDs] Format 1: base64 string');
              buffer = Buffer.from(data, 'base64');
            } else if (Array.isArray(data) && data.every(b => typeof b === 'number')) {
              // Format 2: byte array
              console.log('🔍 [CLAIMED IDs] Format 2: byte array');
              buffer = Buffer.from(data);
            } else {
              console.log('🔍 [CLAIMED IDs] Unexpected data format:', {
                playerAddress,
                dataType: typeof data,
                isArray: Array.isArray(data),
                dataPreview: Array.isArray(data) ? data.slice(0, 20) : data,
              });
              buffer = Buffer.alloc(0);
            }
            
            console.log('🔍 [CLAIMED IDs] Buffer created:', {
              playerAddress,
              bufferLength: buffer.length,
              bufferPreview: Array.from(buffer.slice(0, 20)),
            });
            
            if (type === 'vector<u64>' && buffer.length > 0) {
              // Read vector length (ULEB128 encoded)
              let offset = 0;
              let length = 0;
              let shift = 0;
              while (offset < buffer.length) {
                const byte = buffer.readUInt8(offset);
                length |= (byte & 0x7f) << shift;
                offset++;
                if ((byte & 0x80) === 0) break;
                shift += 7;
              }
              
              console.log('🔍 [CLAIMED IDs] Parsed vector length:', {
                playerAddress,
                length,
                offset,
                bufferRemaining: buffer.length - offset,
              });
              
              // Parse u64 values (8 bytes each, little-endian)
              for (let i = 0; i < length && offset + 8 <= buffer.length; i++) {
                const id = buffer.readBigUInt64LE(offset);
                claimedIds.push(Number(id));
                offset += 8;
              }
              
              console.log('🔍 [CLAIMED IDs] Parsed milestone IDs:', {
                playerAddress,
                count: claimedIds.length,
                ids: claimedIds,
              });
            } else {
              console.log('🔍 [CLAIMED IDs] Wrong type or empty buffer:', {
                playerAddress,
                type,
                bufferLength: buffer.length,
              });
            }
          } else {
            console.log('🔍 [CLAIMED IDs] Return value format unexpected:', {
              playerAddress,
              parsed,
              isArray: Array.isArray(parsed),
              parsedLength: Array.isArray(parsed) ? parsed.length : 0,
              expectedFormat: '[string|number[], string]',
            });
          }
        } else {
          console.log('🔍 [CLAIMED IDs] No return values found');
        }
      } else {
        console.log('🔍 [CLAIMED IDs] No results or returnValues in result');
      }

      // EXTENSIVE LOGGING
      console.log('🔍 [CLAIMED IDs] getClaimedMilestoneIds final result:', {
        playerAddress,
        success: true,
        count: claimedIds.length,
        ids: claimedIds,
        registryId,
        packageId,
      });

      BadgeLogger.debug('Fetched claimed milestone IDs', {
        playerAddress,
        count: claimedIds.length,
        ids: claimedIds.slice(0, 10), // Log first 10 for debugging
      });

      // Cache the result
      this.claimedMilestonesCache.set(playerAddress, {
        ids: claimedIds,
        timestamp: Date.now(),
      });

      return { success: true, claimedIds };
    } catch (error) {
      BadgeLogger.error('Error fetching claimed milestone IDs', {
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
   * Get claimed milestones for a player (by level/threshold - for backward compatibility)
   * @deprecated Use getClaimedMilestoneIds() instead for stable tracking
   */
  async getClaimedMilestones(playerAddress: string): Promise<{
    success: boolean;
    claimed?: Record<string, number[]>;
    error?: string;
  }> {
    try {
      const registryId = this.config.contracts.achievementRegistry;
      if (!registryId) {
        return {
          success: false,
          error: 'Achievement registry not configured',
        };
      }

      // Check if player has PlayerAchievements object
      const packageId = this.config.contracts.gameScore?.split('::')[0] || this.config.contracts.gameScore;
      
      // Query if player achievements exist
      const senderAddress = this.adminWallet.getAddress();
      
      const txb = new Transaction();
      txb.setSender(senderAddress);
      txb.moveCall({
        target: `${packageId}::achievement_system::get_claimed_milestones_for_player`,
        arguments: [
          txb.object(registryId),
          txb.pure.address(playerAddress),
        ],
      });

      const result = await this.client.devInspectTransactionBlock({
        sender: senderAddress,
        transactionBlock: txb,
      });

      // Parse claimed milestones
      const claimed: Record<string, number[]> = {
        gamesPlayed: [],
        bossesPerGame: [],
        bossesCumulative: [],
        scorePerGame: [],
        scoreCumulative: [],
        distancePerGame: [],
        distanceCumulative: [],
        coinsPerGame: [],
        coinsCumulative: [],
        enemiesPerGame: [],
        enemiesCumulative: [],
        coinStreak: [],
      };

      if (result.results && result.results[0] && 'returnValues' in result.results[0]) {
        const returnValues = result.results[0].returnValues;
        // get_claimed_milestones_for_player returns: (bool, vector<u8> x 12)
        // First value is bool (player_achievements_exists), then 12 vectors for each category
        if (returnValues && returnValues.length >= 13) {
          const categoryKeys = Object.keys(claimed);
          const parseReturnValue = (val: unknown): [string, string] | null => {
            if (Array.isArray(val) && val.length === 2 && typeof val[0] === 'string' && typeof val[1] === 'string') {
              return [val[0], val[1]];
            }
            return null;
          };

          // Get milestone definitions to convert levels to thresholds
          const definitions = await this.getMilestoneDefinitions();

          // Skip first return value (bool - player_achievements_exists)
          // Process the 12 category vectors (indices 1-12)
          for (let i = 1; i <= 12 && i < returnValues.length; i++) {
            const categoryIndex = i - 1; // Category index (0-11)
            const parsed = parseReturnValue(returnValues[i]);
            if (parsed) {
              const [bytes, type] = parsed;
              if (type === 'vector<u8>') {
                // Parse vector<u8> (milestone levels)
                const buffer = Buffer.from(bytes, 'base64');
                // Skip vector length (1 byte) and parse u8 values
                const length = buffer.readUInt8(0);
                const milestoneLevels: number[] = [];
                for (let j = 0; j < length; j++) {
                  const offset = 1 + j;
                  if (offset < buffer.length) {
                    const level = buffer.readUInt8(offset);
                    milestoneLevels.push(level);
                  }
                }
                
                // Convert milestone levels to thresholds using definitions
                const categoryKey = categoryKeys[categoryIndex];
                const categoryDefinitions = definitions[categoryKey] || [];
                const thresholds: number[] = [];
                
                BadgeLogger.debug('Converting milestone levels to thresholds', {
                  categoryKey,
                  milestoneLevels,
                  definitionsCount: categoryDefinitions.length,
                  definitionsWithLevel: categoryDefinitions.filter(d => d.level !== undefined).length,
                });
                
                for (const level of milestoneLevels) {
                  // Find the definition with this level
                  let definition = categoryDefinitions.find(d => d.level === level);
                  
                  if (!definition) {
                    // Fallback: if level not found, try to find by index (for backward compatibility)
                    // Note: This assumes definitions are sorted by level (1, 2, 3...)
                    // But they're actually sorted by threshold, so this may not work correctly
                    const defByIndex = categoryDefinitions[level - 1];
                    if (defByIndex) {
                      BadgeLogger.warn('Using index-based fallback for level-to-threshold conversion', {
                        categoryKey,
                        level,
                        threshold: defByIndex.threshold,
                        note: 'Definitions may not be sorted by level',
                      });
                      definition = defByIndex;
                    }
                  }
                  
                  if (definition) {
                    thresholds.push(definition.threshold);
                    BadgeLogger.debug('Converted milestone level to threshold', {
                      categoryKey,
                      level,
                      threshold: definition.threshold,
                    });
                  } else {
                    BadgeLogger.warn('Could not find definition for milestone level', {
                      categoryKey,
                      level,
                      availableLevels: categoryDefinitions.map(d => d.level).filter(l => l !== undefined),
                    });
                  }
                }
                
                claimed[categoryKey] = thresholds;
              }
            }
          }
        }
      }

      return { success: true, claimed };
    } catch (error) {
      // If player has no achievements yet, return empty
      return {
        success: true,
        claimed: {
          gamesPlayed: [],
          bossesPerGame: [],
          bossesCumulative: [],
          scorePerGame: [],
          scoreCumulative: [],
          distancePerGame: [],
          distanceCumulative: [],
          coinsPerGame: [],
          coinsCumulative: [],
          enemiesPerGame: [],
          enemiesCumulative: [],
          coinStreak: [],
        },
      };
    }
  }

  /**
   * Get all eligible (claimable) achievements for a player
   * Does NOT claim them - just returns what's available to claim
   */
  async getEligibleAchievements(playerAddress: string): Promise<{
    success: boolean;
    eligible: EligibleAchievement[];
    error?: string;
  }> {
    try {
      // Get player stats
      const statsResult = await this.getPlayerStats(playerAddress);
      if (!statsResult.success || !statsResult.stats) {
        return {
          success: false,
          eligible: [],
          error: statsResult.error || 'Failed to get player stats',
        };
      }

      const stats = statsResult.stats;

      // Get claimed milestone IDs (stable IDs, not levels)
      const claimedIdsResult = await this.getClaimedMilestoneIds(playerAddress);
      const claimedIds = claimedIdsResult.claimedIds || [];
      
      // EXTENSIVE LOGGING
      console.log('🔍 [ELIGIBLE] getEligibleAchievements called for', playerAddress);
      console.log('🔍 [ELIGIBLE] Claimed IDs result:', {
        success: claimedIdsResult.success,
        claimedIds: claimedIds,
        count: claimedIds.length,
        error: claimedIdsResult.error,
      });
      console.log('🔍 [ELIGIBLE] Player stats:', stats);
      
      BadgeLogger.debug('Checking eligible achievements', {
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

      // EXTENSIVE LOGGING - Final eligible array
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

      return {
        success: true,
        eligible,
      };
    } catch (error) {
      BadgeLogger.error('Error checking achievements', {
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
      BadgeLogger.error('Error claiming milestone by ID', {
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
    rewardsDistributed?: boolean; // Whether credits/items were successfully distributed
    rewardsError?: string; // Error message if rewards distribution failed
    error?: string;
  }> {
    try {
      // First verify the milestone is actually eligible
      const eligibleResult = await this.getEligibleAchievements(playerAddress);
      if (!eligibleResult.success) {
        return {
          success: false,
          error: eligibleResult.error || 'Failed to check eligibility',
        };
      }

      // Find the requested milestone in eligible list
      const milestone = eligibleResult.eligible.find(
        e => e.category === category && e.threshold === threshold
      );

      if (!milestone) {
        return {
          success: false,
          error: 'Milestone not eligible for claiming. It may have already been claimed or you have not reached the threshold.',
        };
      }

      // Distribute rewards (admin-paid: credits and items)
      // Note: We do this BEFORE building the transaction so rewards are already given
      // even if the user doesn't complete the on-chain claim
      // If admin wallet fails (e.g., no gas), we still proceed with the transaction
      let rewardsDistributed = true;
      let rewardsError: string | undefined = undefined;

      if (milestone.credits > 0) {
        try {
          await this.addCreditsToPlayer(playerAddress, milestone.credits);
        } catch (error) {
          rewardsDistributed = false;
          rewardsError = error instanceof Error ? error.message : 'Unknown error';
          BadgeLogger.warn('Failed to add credits (admin wallet may be out of gas), continuing with transaction', {
            playerAddress,
            credits: milestone.credits,
            error: rewardsError,
          });
        }
      }

      if (milestone.items && milestone.items.length > 0) {
        try {
          await this.addItemsToInventory(playerAddress, milestone.items);
        } catch (error) {
          rewardsDistributed = false;
          const itemError = error instanceof Error ? error.message : 'Unknown error';
          rewardsError = rewardsError ? `${rewardsError}; Items: ${itemError}` : `Items: ${itemError}`;
          BadgeLogger.warn('Failed to add items (admin wallet may be out of gas), continuing with transaction', {
            playerAddress,
            itemCount: milestone.items.length,
            error: itemError,
          });
        }
      }

      // Mark milestone as claimed on-chain (admin wallet signs and pays for gas)
      await this.buildMilestoneClaimTransaction(
        playerAddress,
        milestone.categoryCode,
        threshold
      );

      // Clear cache after successful claim to ensure fresh data on next fetch
      console.log('🔍 [CLAIM] Milestone claim completed, cache should be refreshed on next fetch', {
        playerAddress,
        category,
        threshold,
        milestoneId: milestone.milestoneId,
      });

      BadgeLogger.info('Milestone claim completed', {
        playerAddress,
        category,
        threshold,
        milestoneId: milestone.milestoneId,
        credits: milestone.credits,
        itemCount: milestone.items.length,
        rewardsDistributed,
        rewardsError: rewardsError || undefined,
      });

      return {
        success: true,
        claimed: milestone,
        rewardsDistributed, // Indicate if rewards were successfully distributed
        rewardsError, // Include error message if rewards failed
      };
    } catch (error) {
      BadgeLogger.error('Error claiming single milestone', {
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

      // First verify all milestones are actually eligible
      const eligibleResult = await this.getEligibleAchievements(playerAddress);
      if (!eligibleResult.success) {
        return {
          success: false,
          claimed: [],
          error: eligibleResult.error || 'Failed to check eligibility',
        };
      }

      // Filter to only eligible milestones
      const eligibleMilestones: EligibleAchievement[] = [];
      for (const requested of milestones) {
        const eligible = eligibleResult.eligible.find(
          e => e.category === requested.category && e.threshold === requested.threshold
        );
        if (eligible) {
          eligibleMilestones.push(eligible);
        } else {
          BadgeLogger.warn('Milestone not eligible for batch claim, skipping', {
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

      // Distribute all rewards first (before on-chain claim)
      let rewardsDistributed = true;
      let rewardsError: string | undefined = undefined;
      let totalCredits = 0;
      const allItems: Array<{ itemId: string; level: number; quantity: number }> = [];

      for (const milestone of eligibleMilestones) {
        totalCredits += milestone.credits;
        if (milestone.items) {
          allItems.push(...milestone.items);
        }
      }

      // Add all credits at once
      if (totalCredits > 0) {
        try {
          await this.addCreditsToPlayer(playerAddress, totalCredits);
        } catch (error) {
          rewardsDistributed = false;
          rewardsError = error instanceof Error ? error.message : 'Unknown error';
          BadgeLogger.warn('Failed to add credits in batch claim (admin wallet may be out of gas), continuing with transaction', {
            playerAddress,
            credits: totalCredits,
            error: rewardsError,
          });
        }
      }

      // Add all items at once
      if (allItems.length > 0) {
        try {
          await this.addItemsToInventory(playerAddress, allItems);
        } catch (error) {
          rewardsDistributed = false;
          const itemError = error instanceof Error ? error.message : 'Unknown error';
          rewardsError = rewardsError ? `${rewardsError}; Items: ${itemError}` : `Items: ${itemError}`;
          BadgeLogger.warn('Failed to add items in batch claim (admin wallet may be out of gas), continuing with transaction', {
            playerAddress,
            itemCount: allItems.length,
            error: itemError,
          });
        }
      }

      // Build batch transaction to claim all milestones on-chain
      const packageId = this.config.contracts.gameScore?.split('::')[0] || this.config.contracts.gameScore;
      const registryId = this.config.contracts.achievementRegistry;
      const adminCapId = this.config.contracts.achievementAdminCap;

      if (!packageId || !registryId || !adminCapId) {
        throw new Error('Achievement system contract not configured');
      }

      const client = this.config.sui.network === 'testnet'
        ? this.adminWallet.getTestnetClient()
        : this.adminWallet.getMainnetClient();

      // Fetch fresh registry object version to avoid stale data
      try {
        const registryObject = await client.getObject({
          id: registryId,
          options: {
            showType: true,
            showOwner: true,
          },
        });
        console.log('🔍 [BATCH CLAIM] Fetched fresh registry object version:', {
          registryId,
          version: registryObject.data?.version,
          digest: registryObject.data?.digest,
        });
      } catch (error) {
        console.log('🔍 [BATCH CLAIM] Could not fetch registry object version:', error);
      }

      const txb = new Transaction();
      txb.setSender(this.adminWallet.getAddress());

      // Get milestone definitions to convert thresholds to levels
      const definitions = await this.getMilestoneDefinitions();

      // Add all claim_milestone calls to the transaction
      for (const milestone of eligibleMilestones) {
        const categoryName = milestone.category;
        const categoryCode = this.categoryCodes[categoryName];
        if (!categoryCode) {
          BadgeLogger.warn('Invalid category in batch claim, skipping', { category: categoryName });
          continue;
        }

        const categoryDefinitions = definitions[categoryName] || [];
        const definition = categoryDefinitions.find(d => d.threshold === milestone.threshold);
        
        if (!definition) {
          BadgeLogger.warn('Milestone definition not found in batch claim, skipping', {
            category: categoryName,
            threshold: milestone.threshold,
          });
          continue;
        }

        const milestoneLevel = definition.level !== undefined
          ? definition.level
          : categoryDefinitions.findIndex(d => d.threshold === milestone.threshold) + 1;

        if (milestoneLevel < 1 || milestoneLevel > 255) {
          BadgeLogger.warn('Invalid milestone level in batch claim, skipping', {
            category: categoryName,
            threshold: milestone.threshold,
            milestoneLevel,
          });
          continue;
        }

        // EXTENSIVE LOGGING - What we're claiming
        console.log('🔍 [BATCH CLAIM] Adding claim_milestone call to transaction:', {
          playerAddress,
          category: categoryName,
          categoryCode,
          threshold: milestone.threshold,
          milestoneLevel,
          expectedMilestoneId: definition.milestoneId,
          registryId,
          packageId,
        });

        txb.moveCall({
          target: `${packageId}::achievement_system::claim_milestone`,
          arguments: [
            txb.object(adminCapId),
            txb.object(registryId),
            txb.pure.address(playerAddress),
            txb.pure.u8(categoryCode),
            txb.pure.u8(milestoneLevel),
            txb.object('0x6'), // Clock
          ],
        });
      }

      // Calculate gas budget based on number of milestones (more milestones = more gas)
      const gasMultiplier = Math.min(Math.max(2, Math.ceil(eligibleMilestones.length / 2)), 10);
      const gasBudget = (this.config.sui.gasBudget || 10_000_000) * gasMultiplier;
      txb.setGasBudget(gasBudget);

      BadgeLogger.info('Executing batch milestone claim transaction', {
        playerAddress,
        milestoneCount: eligibleMilestones.length,
        gasBudget,
        gasMultiplier,
      });

      // Execute batch transaction
      const result = await executeTransactionWithFinalization(
        client,
        this.adminWallet.getKeypair(),
        txb,
        {
          logger: {
            info: (msg, data) => BadgeLogger.info(msg, data),
            warn: (msg, data) => BadgeLogger.warn(msg, data),
            error: (msg, data) => BadgeLogger.error(msg, data),
          },
        }
      );

      // EXTENSIVE LOGGING - Batch claim completed
      console.log('🔍 [BATCH CLAIM] Batch milestone claim transaction completed:', {
        playerAddress,
        milestoneCount: eligibleMilestones.length,
        digest: result.digest,
        success: true,
      });

      // Query events to verify what milestone_ids were actually stored
      try {
        // Wait a moment for events to be indexed
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const events = await client.queryEvents({
          query: {
            MoveModule: {
              package: packageId,
              module: 'achievement_system',
            },
          },
          limit: 20,
          order: 'descending',
        });
        
        const claimEvents = events.data.filter((e: any) => {
          const eventType = e.type || '';
          return eventType.includes('AchievementClaimed');
        });
        
        if (claimEvents.length > 0) {
          const latestEvents = claimEvents.slice(0, 10).map((e: any) => {
            const parsed = e.parsedJson as any;
            return {
              milestoneId: parsed?.milestone_id,
              category: parsed?.category,
              level: parsed?.milestone_level,
              threshold: parsed?.threshold,
            };
          });
          
          // Filter to only events for this player
          const playerEvents = latestEvents.filter((e: any) => {
            // We can't filter by player from events easily, so we'll check all
            return true;
          });
          
          console.log('🔍 [BATCH CLAIM] Latest claim events (up to 10):', {
            playerAddress,
            eventCount: Math.min(claimEvents.length, 10),
            events: latestEvents,
          });
          
          // Now verify what the table actually returns
          console.log('🔍 [BATCH CLAIM] Verifying claimed_milestone_ids table after claim...');
          await new Promise(resolve => setTimeout(resolve, 2000)); // Additional delay for table update
          const claimedIdsResult = await this.getClaimedMilestoneIds(playerAddress);
          
          const expectedIds = eligibleMilestones.map(m => {
            const def = definitions[m.category]?.find(d => d.threshold === m.threshold);
            return def?.milestoneId;
          }).filter((id): id is number => id !== undefined);
          
          console.log('🔍 [BATCH CLAIM] Table lookup result after claim:', {
            playerAddress,
            success: claimedIdsResult.success,
            claimedIds: claimedIdsResult.claimedIds || [],
            expectedIds,
            eventMilestoneIds: latestEvents.map(e => Number(e.milestoneId)),
            tableHasExpectedIds: expectedIds.every(id => claimedIdsResult.claimedIds?.includes(id)),
            discrepancy: {
              missingFromTable: expectedIds.filter(id => !claimedIdsResult.claimedIds?.includes(id)),
              unexpectedInTable: claimedIdsResult.claimedIds?.filter(id => !expectedIds.includes(id) && !latestEvents.some(e => Number(e.milestoneId) === id)),
            },
          });
        }
      } catch (eventError) {
        console.log('🔍 [BATCH CLAIM] Could not query events or verify table:', eventError);
      }

      BadgeLogger.info('Batch milestone claim completed', {
        playerAddress,
        milestoneCount: eligibleMilestones.length,
        totalCredits,
        totalItems: allItems.length,
        rewardsDistributed,
        rewardsError: rewardsError || undefined,
        digest: result.digest,
      });

      return {
        success: true,
        claimed: eligibleMilestones,
        rewardsDistributed,
        rewardsError,
      };
    } catch (error) {
      BadgeLogger.error('Error claiming batch milestones', {
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
      console.log(`🔍 [CHECK CATEGORY] No definitions for category: ${category}`);
      return [];
    }

    const eligible: EligibleAchievement[] = [];
    const claimedIdsSet = new Set(claimedMilestoneIds);

    console.log(`🔍 [CHECK CATEGORY] Checking category: ${category}`);
    console.log(`🔍 [CHECK CATEGORY] Current value: ${currentValue}`);
    console.log(`🔍 [CHECK CATEGORY] Claimed milestone IDs:`, Array.from(claimedIdsSet));
    console.log(`🔍 [CHECK CATEGORY] Category definitions count: ${categoryDefinitions.length}`);

    for (const definition of categoryDefinitions) {
      const reached = currentValue >= definition.threshold;
      const hasMilestoneId = definition.milestoneId !== undefined && definition.milestoneId !== null;
      const isClaimed = hasMilestoneId && definition.milestoneId !== undefined 
        ? claimedIdsSet.has(definition.milestoneId) 
        : false;

      console.log(`🔍 [CHECK CATEGORY] Definition:`, {
        category,
        threshold: definition.threshold,
        milestoneId: definition.milestoneId,
        reached,
        hasMilestoneId,
        isClaimed,
      });

      // Check if player has reached threshold
      if (reached) {
        // Check if already claimed by milestone_id (stable ID, not threshold/level)
        if (hasMilestoneId && !isClaimed && definition.milestoneId !== undefined) {
          console.log(`✅ [CHECK CATEGORY] Adding eligible milestone:`, {
            category,
            milestoneId: definition.milestoneId,
            threshold: definition.threshold,
          });
          eligible.push({
            category,
            categoryCode: this.categoryCodes[category] || 0,
            milestoneId: definition.milestoneId,
            threshold: definition.threshold,
            credits: definition.credits,
            items: definition.items,
          });
        } else if (hasMilestoneId && isClaimed) {
          console.log(`❌ [CHECK CATEGORY] Milestone already claimed:`, {
            category,
            milestoneId: definition.milestoneId,
            threshold: definition.threshold,
          });
        } else if (!hasMilestoneId) {
          // Fallback: if milestone_id is missing, log warning but still check by threshold
          // This should not happen with new milestones, but supports legacy data
          console.log(`⚠️ [CHECK CATEGORY] Milestone definition missing milestone_id:`, {
            category,
            threshold: definition.threshold,
          });
          BadgeLogger.warn('Milestone definition missing milestone_id, using threshold check', {
            category,
            threshold: definition.threshold,
          });
        }
      } else {
        console.log(`⏳ [CHECK CATEGORY] Milestone not reached yet:`, {
          category,
          threshold: definition.threshold,
          currentValue,
        });
      }
    }

    console.log(`🔍 [CHECK CATEGORY] Final eligible count for ${category}: ${eligible.length}`);
    return eligible;
  }

  /**
   * Claim an achievement (distribute rewards + mark as claimed on-chain)
   * @deprecated Use claimSingleMilestone instead, which builds user-signed transactions
   */
  private async claimAchievement(
    playerAddress: string,
    achievement: EligibleAchievement
  ): Promise<void> {
    // 1. Add credits to GamePass
    if (achievement.credits > 0) {
      await this.addCreditsToPlayer(playerAddress, achievement.credits);
    }

    // 2. Add items to inventory
    if (achievement.items && achievement.items.length > 0) {
      await this.addItemsToInventory(playerAddress, achievement.items);
    }

    // 3. Mark as claimed on-chain (admin-paid - deprecated)
    await this.markMilestoneClaimed(
      playerAddress,
      achievement.categoryCode,
      achievement.threshold
    );
  }

  /**
   * Mark milestone as claimed on-chain (admin wallet signs and pays for gas)
   * NOTE: Cannot have user sign because admin capability is owned by admin wallet
   * In Sui, transactions using owned objects must be signed by the owner
   * 
   * NOTE: The contract function currently has `abort 999` (not implemented)
   * This function will attempt to call it, but if it fails with abort 999,
   * we'll skip the on-chain claim and just track it off-chain
   */
  async buildMilestoneClaimTransaction(
    playerAddress: string,
    category: number,
    threshold: number
  ): Promise<void> {
    // Declare variables outside try block for catch block access
    let categoryName: string | undefined;
    let categoryDefinitions: MilestoneDefinition[] = [];
    let definition: MilestoneDefinition | undefined;
    let milestoneLevel: number | undefined;
    
    try {
      const packageId = this.config.contracts.gameScore?.split('::')[0] || this.config.contracts.gameScore;
      const registryId = this.config.contracts.achievementRegistry;
      const adminCapId = this.config.contracts.achievementAdminCap;

      if (!packageId || !registryId || !adminCapId) {
        throw new Error('Achievement system contract not configured');
      }

      // Convert threshold to milestone level by looking up in definitions
      const definitions = await this.getMilestoneDefinitions();
      categoryName = Object.keys(this.categoryCodes).find(
        key => this.categoryCodes[key] === category
      );
      
      if (!categoryName) {
        throw new Error(`Invalid category code: ${category}`);
      }

      categoryDefinitions = definitions[categoryName] || [];
      definition = categoryDefinitions.find(d => d.threshold === threshold);
      
      if (!definition) {
        throw new Error(`Milestone with threshold ${threshold} not found for category ${categoryName}`);
      }

      // Use the milestone level from the definition (or fallback to index-based)
      milestoneLevel = definition.level !== undefined 
        ? definition.level 
        : categoryDefinitions.findIndex(d => d.threshold === threshold) + 1;

      if (milestoneLevel < 1 || milestoneLevel > 255) {
        BadgeLogger.error('Invalid milestone level calculated', {
          playerAddress,
          category,
          categoryName,
          threshold,
          milestoneLevel,
          definitionLevel: definition.level,
          fallbackIndex: categoryDefinitions.findIndex(d => d.threshold === threshold),
          allDefinitions: categoryDefinitions.map(d => ({ threshold: d.threshold, level: d.level })),
        });
        throw new Error(`Invalid milestone level: ${milestoneLevel}`);
      }

      // Log what we're about to claim for debugging
      BadgeLogger.info('Preparing to claim milestone on-chain', {
        playerAddress,
        category,
        categoryName,
        threshold,
        milestoneLevel,
        definitionLevel: definition.level,
        allCategoryLevels: categoryDefinitions.map(d => ({ threshold: d.threshold, level: d.level })),
      });

      const client = this.config.sui.network === 'testnet'
        ? this.adminWallet.getTestnetClient()
        : this.adminWallet.getMainnetClient();

      // Verify milestone exists on-chain and get available levels for better error messages
      // First, get the definitions we already have (they should have levels if they exist on-chain)
      const allDefinitions = await this.getMilestoneDefinitions();
      const frontendDefs = allDefinitions[categoryName] || [];
      const frontendLevels = frontendDefs.map(d => d.level).filter((l): l is number => l !== undefined);
      
      // If we have a definition with the correct threshold and level, use that level
      const matchingDef = frontendDefs.find(d => d.threshold === threshold);
      if (matchingDef && matchingDef.level !== undefined) {
        milestoneLevel = matchingDef.level;
        BadgeLogger.info('Using milestone level from frontend definitions', {
          category,
          categoryName,
          threshold,
          milestoneLevel,
          frontendLevels,
        });
      } else if (frontendDefs.length === 0) {
        // No definitions found - fail gracefully
        throw new Error(
          `No milestone definitions found for category ${categoryName} on-chain. ` +
          'Please initialize milestone definitions (factory default) or migrate from old contract.'
        );
      }
      
      let onChainLevels: number[] = [];
      try {
        // Query on-chain levels directly
        const levelsTxb = new Transaction();
        levelsTxb.setSender(this.adminWallet.getAddress());
        levelsTxb.moveCall({
          target: `${packageId}::achievement_system::get_all_milestone_levels_for_category`,
          arguments: [
            levelsTxb.object(registryId),
            levelsTxb.pure.u8(category),
          ],
        });

        const levelsResult = await client.devInspectTransactionBlock({
          sender: this.adminWallet.getAddress(),
          transactionBlock: levelsTxb,
        });

        BadgeLogger.info('Raw milestone levels query result', {
          category,
          categoryName,
          hasResults: !!levelsResult.results,
          resultsLength: levelsResult.results?.length || 0,
          firstResultType: levelsResult.results?.[0] ? Object.keys(levelsResult.results[0]) : [],
          hasReturnValues: levelsResult.results?.[0] && 'returnValues' in levelsResult.results[0],
          rawResult: JSON.stringify(levelsResult.results?.[0] || {}).substring(0, 500),
        });

        // Parse milestone levels (same logic as _fetchMilestoneDefinitions)
        if (levelsResult.results && levelsResult.results[0] && 'returnValues' in levelsResult.results[0]) {
          const returnValues = levelsResult.results[0].returnValues;
          BadgeLogger.info('Parsing milestone levels return values', {
            category,
            categoryName,
            returnValuesLength: returnValues?.length || 0,
            firstValueType: returnValues?.[0] ? typeof returnValues[0] : 'undefined',
            firstValueIsArray: Array.isArray(returnValues?.[0]),
            firstValueLength: Array.isArray(returnValues?.[0]) ? returnValues[0].length : undefined,
            firstValuePreview: Array.isArray(returnValues?.[0]) 
              ? JSON.stringify(returnValues[0]).substring(0, 200)
              : String(returnValues?.[0]).substring(0, 200),
          });
          
          if (returnValues && returnValues.length > 0) {
            const val = returnValues[0];
            
            // Sui return values can be in different formats:
            // 1. [base64String, "type"] - tuple format
            // 2. [[byteArray], "type"] - nested array format  
            // 3. base64String - direct string
            // 4. [byteArray] - direct array
            
            let byteArray: number[] | null = null;
            
            if (Array.isArray(val)) {
              if (val.length === 2) {
                // Format: [bytes, "type"] or [[byteArray], "type"]
                const bytesVal = val[0];
                if (Array.isArray(bytesVal)) {
                  // Format: [[byteArray], "type"]
                  byteArray = bytesVal as number[];
                } else if (typeof bytesVal === 'string') {
                  // Format: [base64String, "type"]
                  try {
                    const buffer = Buffer.from(bytesVal, 'base64');
                    byteArray = Array.from(buffer);
                  } catch (e) {
                    BadgeLogger.debug(`Failed to parse base64 for category ${category}: ${e instanceof Error ? e.message : 'Unknown'}`);
                  }
                }
              } else if (val.length > 0 && typeof val[0] === 'number') {
                // Format: [byteArray] - direct array of numbers
                if (val.every((item: unknown) => typeof item === 'number')) {
                  byteArray = val as unknown as number[];
                }
              }
            } else if (typeof val === 'string') {
              // Format: base64String
              try {
                const buffer = Buffer.from(val, 'base64');
                byteArray = Array.from(buffer);
              } catch (e) {
                BadgeLogger.debug(`Failed to parse base64 string for category ${category}: ${e instanceof Error ? e.message : 'Unknown'}`);
              }
            }
            
            if (byteArray && byteArray.length > 0) {
              BadgeLogger.info('Extracted byte array for milestone levels', {
                category,
                categoryName,
                byteArrayLength: byteArray.length,
                firstBytes: byteArray.slice(0, 10),
              });
              
              // Vector<u8> format in BCS: first byte is length (uleb128 or u8), followed by u8 values
              // For small vectors, length is typically a single u8
              const length = byteArray[0];
              if (length > 0 && length <= 255 && byteArray.length >= length + 1) {
                for (let i = 0; i < length; i++) {
                  const level = byteArray[1 + i];
                  if (level > 0) {
                    onChainLevels.push(level);
                  }
                }
                BadgeLogger.info('Parsed milestone levels from byte array', {
                  category,
                  categoryName,
                  length,
                  levels: onChainLevels,
                });
              } else {
                BadgeLogger.debug(`Invalid vector length for category ${category}: length=${length}, arrayLength=${byteArray.length}`);
              }
            } else {
              BadgeLogger.warn('No byte array extracted for milestone levels', {
                category,
                categoryName,
                valType: typeof val,
                valIsArray: Array.isArray(val),
                valLength: Array.isArray(val) ? val.length : undefined,
                valPreview: JSON.stringify(val).substring(0, 500),
              });
            }
          }
        }
        
        BadgeLogger.info('Queried milestone levels from on-chain', {
          category,
          categoryName,
          onChainLevels,
          count: onChainLevels.length,
          frontendLevels,
          frontendLevelsCount: frontendLevels.length,
        });
        
        // If on-chain query returned empty but we have frontend definitions with levels,
        // use the frontend levels as a fallback (they came from on-chain originally)
        if (onChainLevels.length === 0 && frontendLevels.length > 0) {
          BadgeLogger.warn('On-chain levels query returned empty, but frontend has levels - using frontend levels for verification', {
            category,
            categoryName,
            frontendLevels,
            note: 'This may indicate the category_milestone_levels table is out of sync, but milestones exist in milestone_definitions. Will verify specific milestone directly.',
          });
          onChainLevels = [...frontendLevels];
        }
        
        // If we still have no levels, try querying the specific milestone to see if it exists
        if (onChainLevels.length === 0 && milestoneLevel > 0) {
          BadgeLogger.info('No levels found from query, verifying specific milestone directly', {
            category,
            categoryName,
            milestoneLevel,
            threshold,
          });
          // We'll verify the specific milestone in the next step anyway
        }
      } catch (verifyError) {
        BadgeLogger.warn('Error during milestone levels query - using frontend levels as fallback', {
          category,
          categoryName,
          error: verifyError instanceof Error ? verifyError.message : String(verifyError),
          frontendLevels,
        });
        // Use frontend levels as fallback if query fails
        if (frontendLevels.length > 0) {
          onChainLevels = [...frontendLevels];
        }
      }

      // Now verify the specific milestone exists
      try {
        const verifyTxb = new Transaction();
        verifyTxb.setSender(this.adminWallet.getAddress());
        verifyTxb.moveCall({
          target: `${packageId}::achievement_system::get_milestone_definition_full`,
          arguments: [
            verifyTxb.object(registryId),
            verifyTxb.pure.u8(category),
            verifyTxb.pure.u8(milestoneLevel),
          ],
        });

        const verifyResult = await client.devInspectTransactionBlock({
          sender: this.adminWallet.getAddress(),
          transactionBlock: verifyTxb,
        });

        if (verifyResult.results && verifyResult.results[0] && 'returnValues' in verifyResult.results[0]) {
          const returnValues = verifyResult.results[0].returnValues;
          if (returnValues && returnValues.length > 0) {
            // Parse (exists: bool, threshold: u64, credits: u64, items: vector<ItemReward>)
            const existsBytes = returnValues[0][0] as number[];
            const exists = existsBytes && existsBytes.length > 0 && existsBytes[0] === 1;
            
            if (!exists) {
              // Milestone doesn't exist on-chain - fail gracefully
              // Check if milestone exists in our frontend definitions
              const frontendDef = frontendDefs.find(d => d.level === milestoneLevel && d.threshold === threshold) ||
                                  frontendDefs.find(d => d.threshold === threshold);
              
              if (frontendDef) {
                // If we found a definition with matching threshold, use its level if available
                if (frontendDef.level !== undefined && frontendDef.level !== milestoneLevel) {
                  BadgeLogger.warn('Milestone level mismatch - using level from frontend definition', {
                    playerAddress,
                    category,
                    categoryName,
                    threshold,
                    requestedLevel: milestoneLevel,
                    frontendLevel: frontendDef.level,
                    note: 'Updating milestoneLevel to match frontend definition',
                  });
                  milestoneLevel = frontendDef.level;
                }
                
                // Even though it exists in definitions, on-chain query says it doesn't exist
                BadgeLogger.error('Milestone verification query returned false - milestone does not exist on-chain', {
                  playerAddress,
                  category,
                  categoryName,
                  threshold,
                  milestoneLevel,
                  frontendDefLevel: frontendDef.level,
                  frontendDefThreshold: frontendDef.threshold,
                  onChainLevels,
                  frontendLevels,
                });
                throw new Error(
                  `Milestone with threshold ${threshold} (level ${milestoneLevel}) does not exist on-chain for category ${categoryName}. ` +
                  'Please initialize milestone definitions or migrate from old contract.'
                );
              } else {
                // Milestone doesn't exist in definitions either
                const thresholdMatch = frontendDefs.find(d => d.threshold === threshold);
                const levelMatch = frontendDefs.find(d => d.level === milestoneLevel);
                
                BadgeLogger.error('Milestone does not exist in frontend definitions', {
                  playerAddress,
                  category,
                  categoryName,
                  threshold,
                  milestoneLevel,
                  onChainLevels,
                  frontendLevels,
                  thresholdMatchFound: !!thresholdMatch,
                  thresholdMatchLevel: thresholdMatch?.level,
                  levelMatchFound: !!levelMatch,
                  levelMatchThreshold: levelMatch?.threshold,
                  allFrontendDefs: frontendDefs.map(d => ({ threshold: d.threshold, level: d.level })),
                });
                throw new Error(
                  `Milestone with threshold ${threshold} not found in definitions for category ${categoryName}. ` +
                  `Available definitions: ${frontendDefs.map(d => `Level ${d.level || '?'} (threshold ${d.threshold})`).join(', ') || 'none'}. ` +
                  'Please initialize milestone definitions or migrate from old contract.'
                );
              }
            } else {
              // Milestone exists on-chain
              BadgeLogger.info('Milestone verified to exist on-chain', {
                playerAddress,
                category,
                categoryName,
                threshold,
                milestoneLevel,
              });
            }
          } else {
            // No return values - fail gracefully
            BadgeLogger.warn('Milestone verification query returned no results', {
              playerAddress,
              category,
              categoryName,
              threshold,
              milestoneLevel,
            });
            throw new Error(
              `Failed to verify milestone existence: No return values from query. ` +
              'Please initialize milestone definitions or migrate from old contract.'
            );
          }
        } else {
          // No results from query - fail gracefully
          BadgeLogger.warn('Milestone verification query returned no results', {
            playerAddress,
            category,
            categoryName,
            threshold,
            milestoneLevel,
          });
          throw new Error(
            `Failed to verify milestone existence: Query returned no results. ` +
            'Please initialize milestone definitions or migrate from old contract.'
          );
        }
      } catch (verifySpecificError) {
        // Check if this is our custom "does not exist" error - if so, re-throw it
        if (verifySpecificError instanceof Error && verifySpecificError.message.includes('does not exist on-chain')) {
          throw verifySpecificError;
        }
        
        // For other errors, check if milestone exists in frontend definitions
        const frontendDef = frontendDefs.find(d => d.level === milestoneLevel && d.threshold === threshold);
        if (frontendDef) {
          BadgeLogger.warn('Milestone verification query failed, but milestone exists in frontend definitions - proceeding', {
            error: verifySpecificError instanceof Error ? verifySpecificError.message : String(verifySpecificError),
            category,
            categoryName,
            milestoneLevel,
            threshold,
            onChainLevels,
            frontendLevels,
            note: 'Proceeding with claim - milestone exists in definitions',
          });
          // Don't throw - milestone exists in definitions, proceed
        } else {
          BadgeLogger.error('Failed to verify milestone and not found in frontend definitions', {
            error: verifySpecificError instanceof Error ? verifySpecificError.message : String(verifySpecificError),
            category,
            categoryName,
            milestoneLevel,
            threshold,
            onChainLevels,
            frontendLevels,
          });
          throw new Error(`Failed to verify milestone existence: ${verifySpecificError instanceof Error ? verifySpecificError.message : String(verifySpecificError)}`);
        }
      }

      // NOTE: Cannot have user sign transaction with admin-owned objects
      // Admin capability is owned by admin wallet, so admin must sign
      // We'll execute the transaction with admin wallet (admin pays for gas)
      const txb = new Transaction();
      txb.moveCall({
        target: `${packageId}::achievement_system::claim_milestone`,
        arguments: [
          txb.object(adminCapId),
          txb.object(registryId),
          txb.pure.address(playerAddress),
          txb.pure.u8(category),
          txb.pure.u8(milestoneLevel),
          txb.object('0x6'), // Clock
        ],
      });

      // Set sender to admin wallet (must sign since admin capability is owned by admin)
      txb.setSender(this.adminWallet.getAddress());
      
      // Set gas budget (estimate ~0.01 SUI for milestone claim)
      const gasEstimate = this.config.sui.gasBudget || 10_000_000; // 0.01 SUI default
      txb.setGasBudget(gasEstimate);

      // Execute transaction with admin wallet (admin pays for gas)
      // This is required because admin capability is owned by admin wallet
      const result = await executeTransactionWithFinalization(
        client,
        this.adminWallet.getKeypair(),
        txb,
        {
          logger: {
            info: (msg, data) => BadgeLogger.info(msg, data),
            warn: (msg, data) => BadgeLogger.warn(msg, data),
            error: (msg, data) => BadgeLogger.error(msg, data),
          },
        }
      );

      BadgeLogger.info('Milestone marked as claimed on-chain', {
        playerAddress,
        category,
        categoryName,
        threshold,
        milestoneLevel,
        digest: result.digest,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      // Check if it's a milestone not found error
      if (errorMsg.includes('MoveAbort') && errorMsg.includes(', 1)')) {
        // Abort code 1 = E_MILESTONE_NOT_FOUND
        BadgeLogger.error('Milestone not found on-chain (E_MILESTONE_NOT_FOUND)', {
          playerAddress,
          category,
          categoryName: categoryName || `category_${category}`,
          threshold,
          milestoneLevel: milestoneLevel || 'unknown',
          definitionLevel: definition?.level,
          availableLevels: categoryDefinitions.map(d => ({ threshold: d.threshold, level: d.level })),
          error: errorMsg,
        });
        throw new Error(`Milestone not found on-chain. Category: ${categoryName || `category_${category}`}, Threshold: ${threshold}, Level: ${milestoneLevel || 'unknown'}. Available milestones: ${categoryDefinitions.map(d => `Level ${d.level || '?'} (threshold ${d.threshold})`).join(', ') || 'none'}`);
      }
      
      BadgeLogger.error('Error marking milestone as claimed on-chain', {
        playerAddress,
        category,
        categoryName: categoryName || `category_${category}`,
        threshold,
        milestoneLevel: milestoneLevel || 'unknown',
        error: errorMsg,
      });
      throw error;
    }
  }

  /**
   * Add credits to player's GamePass
   */
  private async addCreditsToPlayer(playerAddress: string, credits: number): Promise<void> {
    try {
      const packageId = this.config.contracts.gamePass?.split('::')[0] || this.config.contracts.gamePass;
      const systemObjectId = this.config.contracts.gamePassSystem;
      const adminCapId = this.config.contracts.premiumStoreAdminCapability;

      if (!packageId || !systemObjectId || !adminCapId) {
        throw new Error('Game pass contract not configured');
      }

      const client = this.config.sui.network === 'testnet'
        ? this.adminWallet.getTestnetClient()
        : this.adminWallet.getMainnetClient();

      const txb = new Transaction();
      txb.moveCall({
        target: `${packageId}::game_pass::add_free_credits`,
        arguments: [
          txb.object(adminCapId),
          txb.object(systemObjectId),
          txb.pure.address(playerAddress),
          txb.pure.u64(credits),
          txb.object('0x6'), // Clock
        ],
      });

      txb.setSender(this.adminWallet.getAddress());
      txb.setGasBudget(this.config.sui.gasBudget);

      const result = await executeTransactionWithFinalization(
        client,
        this.adminWallet.getKeypair(),
        txb,
        {
          logger: {
            info: (msg, data) => BadgeLogger.info(msg, data),
            warn: (msg, data) => BadgeLogger.warn(msg, data),
            error: (msg, data) => BadgeLogger.error(msg, data),
          },
        }
      );

      BadgeLogger.info('Credits added to player', {
        playerAddress,
        credits,
        digest: result.digest,
      });
    } catch (error) {
      BadgeLogger.error('Error adding credits to player', {
        playerAddress,
        credits,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Add items to player's inventory
   */
  private async addItemsToInventory(
    playerAddress: string,
    items: Array<{ itemId: string; level: number; quantity: number }>
  ): Promise<void> {
    try {
      const result = await this.storeService.adminAddItems(playerAddress, items);
      if (!result.success) {
        throw new Error(result.error || 'Failed to add items');
      }

      BadgeLogger.info('Items added to player inventory', {
        playerAddress,
        itemCount: items.length,
        digest: result.digest,
      });
    } catch (error) {
      BadgeLogger.error('Error adding items to inventory', {
        playerAddress,
        items,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Mark milestone as claimed on-chain
   */
  private async markMilestoneClaimed(
    playerAddress: string,
    category: number,
    threshold: number
  ): Promise<void> {
    try {
      const packageId = this.config.contracts.gameScore?.split('::')[0] || this.config.contracts.gameScore;
      const registryId = this.config.contracts.achievementRegistry;
      const adminCapId = this.config.contracts.achievementAdminCap;

      if (!packageId || !registryId || !adminCapId) {
        throw new Error('Achievement system contract not configured');
      }

      // Convert threshold to milestone level by looking up in definitions
      const definitions = await this.getMilestoneDefinitions();
      const categoryName = Object.keys(this.categoryCodes).find(
        key => this.categoryCodes[key] === category
      );
      
      if (!categoryName) {
        throw new Error(`Invalid category code: ${category}`);
      }

      const categoryDefinitions = definitions[categoryName] || [];
      const definition = categoryDefinitions.find(d => d.threshold === threshold);
      
      if (!definition) {
        throw new Error(`Milestone with threshold ${threshold} not found for category ${categoryName}`);
      }

      // Use the milestone level from the definition (or fallback to index-based)
      const milestoneLevel = definition.level !== undefined 
        ? definition.level 
        : categoryDefinitions.findIndex(d => d.threshold === threshold) + 1;

      if (milestoneLevel < 1 || milestoneLevel > 255) {
        throw new Error(`Invalid milestone level: ${milestoneLevel}`);
      }

      const client = this.config.sui.network === 'testnet'
        ? this.adminWallet.getTestnetClient()
        : this.adminWallet.getMainnetClient();

      const txb = new Transaction();
      txb.moveCall({
        target: `${packageId}::achievement_system::claim_milestone`,
        arguments: [
          txb.object(adminCapId),
          txb.object(registryId),
          txb.pure.address(playerAddress),
          txb.pure.u8(category),
          txb.pure.u8(milestoneLevel), // Use milestone level (u8), not threshold
          txb.object('0x6'), // Clock
        ],
      });

      txb.setSender(this.adminWallet.getAddress());
      txb.setGasBudget(this.config.sui.gasBudget);

      const result = await executeTransactionWithFinalization(
        client,
        this.adminWallet.getKeypair(),
        txb,
        {
          logger: {
            info: (msg, data) => BadgeLogger.info(msg, data),
            warn: (msg, data) => BadgeLogger.warn(msg, data),
            error: (msg, data) => BadgeLogger.error(msg, data),
          },
        }
      );

      // EXTENSIVE LOGGING - Claim transaction result
      console.log('🔍 [CLAIM TRANSACTION] Milestone claim transaction completed:', {
        playerAddress,
        category,
        categoryName,
        threshold,
        milestoneLevel,
        expectedMilestoneId: definition.milestoneId,
        digest: result.digest,
        success: true,
      });

      // Query events to verify what milestone_id was actually stored
      try {
        const client = this.config.sui.network === 'testnet'
          ? this.adminWallet.getTestnetClient()
          : this.adminWallet.getMainnetClient();
        
        // Wait a moment for events to be indexed
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const events = await client.queryEvents({
          query: {
            MoveModule: {
              package: packageId,
              module: 'achievement_system',
            },
          },
          limit: 10,
          order: 'descending',
        });
        
        const claimEvents = events.data.filter((e: any) => {
          const eventType = e.type || '';
          return eventType.includes('AchievementClaimed');
        });
        
        if (claimEvents.length > 0) {
          const latestEvent = claimEvents[0];
          const parsedEvent = latestEvent.parsedJson as any;
          console.log('🔍 [CLAIM TRANSACTION] Latest claim event:', {
            playerAddress,
            eventMilestoneId: parsedEvent?.milestone_id,
            eventCategory: parsedEvent?.category,
            eventLevel: parsedEvent?.milestone_level,
            eventThreshold: parsedEvent?.threshold,
            expectedMilestoneId: definition.milestoneId,
            match: parsedEvent?.milestone_id === definition.milestoneId,
          });
        }
      } catch (eventError) {
        console.log('🔍 [CLAIM TRANSACTION] Could not query events:', eventError);
      }

      BadgeLogger.info('Milestone marked as claimed', {
        playerAddress,
        category,
        categoryName,
        threshold,
        milestoneLevel,
        expectedMilestoneId: definition.milestoneId,
        digest: result.digest,
      });
    } catch (error) {
      BadgeLogger.error('Error marking milestone as claimed', {
        playerAddress,
        category,
        threshold,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Unclaim a milestone for a player (admin-only)
   */
  /**
   * Unclaim a milestone by milestoneId (preferred method - uses new claimed_milestone_ids table)
   */
  async unclaimMilestoneById(
    playerAddress: string,
    milestoneId: number
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const registryId = this.config.contracts.achievementRegistry;
      const adminCapId = this.config.contracts.achievementAdminCap;
      
      if (!registryId || !adminCapId) {
        return {
          success: false,
          error: 'Achievement registry or admin capability not configured',
        };
      }

      const packageId = this.config.contracts.gameScore?.split('::')[0] || this.config.contracts.gameScore;
      const client = this.config.sui.network === 'testnet'
        ? this.adminWallet.getTestnetClient()
        : this.adminWallet.getMainnetClient();

      const txb = new Transaction();
      txb.setSender(this.adminWallet.getAddress());
      txb.moveCall({
        target: `${packageId}::achievement_system::unclaim_milestone_by_id`,
        arguments: [
          txb.object(adminCapId),
          txb.object(registryId),
          txb.pure.address(playerAddress),
          txb.pure.u64(milestoneId),
          txb.object('0x6'), // Clock
        ],
      });

      txb.setGasBudget(this.config.sui.gasBudget || 10_000_000);

      const result = await executeTransactionWithFinalization(
        client,
        this.adminWallet.getKeypair(),
        txb,
        {
          logger: {
            info: (msg, data) => BadgeLogger.info(msg, data),
            warn: (msg, data) => BadgeLogger.warn(msg, data),
            error: (msg, data) => BadgeLogger.error(msg, data),
          },
        }
      );

      BadgeLogger.info('Milestone unclaimed by ID', {
        playerAddress,
        milestoneId,
        digest: result.digest,
      });

      // Clear cache
      this.clearClaimedMilestonesCache(playerAddress);

      return { success: true };
    } catch (error) {
      BadgeLogger.error('Error unclaiming milestone by ID', {
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
   * Unclaim a milestone (legacy method - uses category and milestoneLevel)
   * @deprecated Use unclaimMilestoneById instead
   */
  async unclaimMilestone(
    playerAddress: string,
    category: number,
    milestoneLevel: number
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const registryId = this.config.contracts.achievementRegistry;
      const adminCapId = this.config.contracts.achievementAdminCap;
      
      if (!registryId || !adminCapId) {
        return {
          success: false,
          error: 'Achievement registry or admin capability not configured',
        };
      }

      const packageId = this.config.contracts.gameScore?.split('::')[0] || this.config.contracts.gameScore;
      const client = this.config.sui.network === 'testnet'
        ? this.adminWallet.getTestnetClient()
        : this.adminWallet.getMainnetClient();

      const txb = new Transaction();
      txb.moveCall({
        target: `${packageId}::achievement_system::unclaim_milestone`,
        arguments: [
          txb.object(adminCapId),
          txb.object(registryId),
          txb.pure.address(playerAddress),
          txb.pure.u8(category),
          txb.pure.u8(milestoneLevel),
          txb.object('0x6'), // Clock
        ],
      });

      txb.setSender(this.adminWallet.getAddress());
      txb.setGasBudget(this.config.sui.gasBudget || 10_000_000);

      const result = await executeTransactionWithFinalization(
        client,
        this.adminWallet.getKeypair(),
        txb,
        {
          logger: {
            info: (msg, data) => BadgeLogger.info(msg, data),
            warn: (msg, data) => BadgeLogger.warn(msg, data),
            error: (msg, data) => BadgeLogger.error(msg, data),
          },
        }
      );

      BadgeLogger.info('Milestone unclaimed', {
        playerAddress,
        category,
        milestoneLevel,
        digest: result.digest,
      });

      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      BadgeLogger.error('Error unclaiming milestone', {
        playerAddress,
        category,
        milestoneLevel,
        error: errorMsg,
      });
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Get user milestone progress and claimed milestones (admin view)
   */
  async getUserMilestoneData(playerAddress: string): Promise<{
    success: boolean;
    stats?: PlayerStats;
    claimed?: number[]; // Claimed milestone IDs
    eligible?: EligibleAchievement[];
    error?: string;
  }> {
    try {
      // Get player stats
      const statsResult = await this.getPlayerStats(playerAddress);
      if (!statsResult.success || !statsResult.stats) {
        return {
          success: false,
          error: statsResult.error || 'Failed to get player stats',
        };
      }

      // Get claimed milestone IDs
      const claimedResult = await this.getClaimedMilestoneIds(playerAddress);
      if (!claimedResult.success) {
        return {
          success: false,
          error: claimedResult.error || 'Failed to get claimed milestones',
        };
      }

      // Get eligible milestones
      const eligibleResult = await this.getEligibleAchievements(playerAddress);
      if (!eligibleResult.success) {
        return {
          success: false,
          error: eligibleResult.error || 'Failed to get eligible milestones',
        };
      }

      return {
        success: true,
        stats: statsResult.stats,
        claimed: claimedResult.claimedIds || [],
        eligible: eligibleResult.eligible || [],
      };
    } catch (error) {
      BadgeLogger.error('Error getting user milestone data', {
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

export function getAchievementService(): AchievementService {
  if (!achievementServiceInstance) {
    achievementServiceInstance = new AchievementService();
  }
  return achievementServiceInstance;
}

