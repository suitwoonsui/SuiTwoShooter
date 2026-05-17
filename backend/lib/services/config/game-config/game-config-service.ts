// ==========================================
// Game Config Service - Handles game configuration blockchain operations
// When gameConfigRegistry is not set, config is read from platform app-config API.
// ==========================================

import { getConfig } from '@/config/config';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { fetchPlatformAppConfig } from '@/lib/services/platform/app-config/platform-app-config';

export interface PackConfig {
  packType: number;
  priceUsdCents: number;
  games: number;
  name: string;
  description: string;
}

export interface BadgeConfig {
  storeDiscounts: number[]; // [standard, common, uncommon, rare, epic, legendary]
  gameplayDiscounts: number[]; // [standard, common, uncommon, rare, epic, legendary]
  thresholds: number[]; // [common, uncommon, rare, epic, legendary] - games required
  /** From Helm (on-chain); omitted when not set on chain. */
  mintingFeeUsdCents?: number;
  /** From Helm key badge_upgrade_fee; omitted when not set. */
  upgradeFeeUsdCents?: number;
  version: number;
}

export interface TicketBundleConfig {
  packType: number; // on-chain pack_type (10+), used for update/delete
  quantity: number;
  priceUsdCents: number;
  name: string;
  description: string;
}

export interface GameConfig {
  version: number;
  /** Stockroom SKU map (source-of-truth for store pricing). */
  storeSkus: Record<string, unknown>;
  badgeConfig?: BadgeConfig;
  minTokenBalance?: number; // Minimum token balance required to play (in smallest unit with 6 decimals for mainnet, 9 for testnet)
  /** Tournament creation fee — app fee in USD cents. From Helm (regatta_creation_fee). Undefined when not set. */
  tournamentCreationFeeUsdCents?: number;
  /** Optional token-denominated tournament fee source from Helm. */
  tournamentCreationFeeToken?: 'SUI' | 'MEWS' | 'USDC';
  tournamentCreationFeeTokenAmount?: number;
  /** When 'none', registry is not configured; when 'registry', config was read from chain; when 'platform', from platform app-config API. */
  configSource?: 'none' | 'registry' | 'platform';
}

/** Message when game config is not available (Corridor: platform app-config required). */
export const GAME_CONFIG_NOT_INITIALIZED_MESSAGE =
  'Game config requires platform app-config (Corridor). Set PLATFORM_APP_CONFIG_URL, ECOSYSTEM_ID, APP_ID, and CORRIDOR_CAPABILITY_OBJECT_ID_TESTNET in game backend config/contracts.<network>.json, then initialize from the admin panel.';

/**
 * GameConfigService - Game config from platform app-config only (Corridor).
 * getConfig() returns platform config when PLATFORM_APP_CONFIG_URL, ECOSYSTEM_ID, APP_ID are set; otherwise fails with GAME_CONFIG_NOT_INITIALIZED_MESSAGE.
 */
export class GameConfigService {
  private config: ReturnType<typeof getConfig>;
  // Cache for config to reduce RPC calls
  private _configCache: GameConfig | null = null;
  private _configCacheTimestamp: number = 0;
  private readonly _configCacheTTL = 60000; // 1 minute

  constructor() {
    this.config = getConfig();
    PlatformLogger.info('GameConfigService initialized (platform app-config only)');
  }

  /**
   * Get game config from platform (Stockroom + Helm + Aquifer). Single source: fetchPlatformAppConfig.
   */
  private async getConfigFromPlatform(): Promise<{
    success: boolean;
    config?: GameConfig;
    error?: string;
  }> {
    try {
      const platformConfig = await fetchPlatformAppConfig();
      if (!platformConfig) {
        return { success: false, error: 'Platform app-config failed or unavailable' };
      }
      const storeSkus = platformConfig.stockroomOffers ?? {};
      const version = Object.keys(storeSkus).length > 0 ? 1 : 0;
      return {
        success: true,
        config: {
          storeSkus,
          version,
          minTokenBalance: platformConfig.minTokenBalance,
          badgeConfig: platformConfig.badgeConfig,
          tournamentCreationFeeUsdCents: platformConfig.tournamentCreationFeeUsdCents,
          tournamentCreationFeeToken: platformConfig.tournamentCreationFeeToken,
          tournamentCreationFeeTokenAmount: platformConfig.tournamentCreationFeeTokenAmount,
          configSource: 'platform',
        },
      };
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e);
      PlatformLogger.warn('getConfigFromPlatform error', { error: err });
      return { success: false, error: err };
    }
  }

  /**
   * Get the full game config from platform app-config or blockchain.
   * V2: When platform is configured (URL + ecosystem + app), use platform only (no chain fallback).
   */
  async getConfig(): Promise<{
    success: boolean;
    config?: GameConfig;
    error?: string;
  }> {
    try {
      const platformResult = await this.getConfigFromPlatform();
      if (platformResult.success && platformResult.config) {
        return { success: true, config: platformResult.config };
      }
      return {
        success: false,
        error: platformResult.error || 'Platform app-config failed',
      };

    } catch (error: any) {
      PlatformLogger.error('📦 [GAME_CONFIG] Error loading config', {
        error: error.message,
        stack: error.stack,
      });
      return {
        success: false,
        error: error.message || 'Failed to load game config',
      };
    }
  }

  /**
   * Invalidate the config cache
   */
  invalidateCache(): void {
    this._configCache = null;
    this._configCacheTimestamp = 0;
    PlatformLogger.debug('📦 [GAME_CONFIG] Cache invalidated');
  }
}

// Singleton instance
let gameConfigServiceInstance: GameConfigService | null = null;

/**
 * Get the GameConfigService singleton instance
 */
export function getGameConfigService(): GameConfigService {
  if (!gameConfigServiceInstance) {
    gameConfigServiceInstance = new GameConfigService();
  }
  return gameConfigServiceInstance;
}
