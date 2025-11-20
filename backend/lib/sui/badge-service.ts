// ==========================================
// Badge Service - Manages badge minting and tier updates
// ==========================================

import { Transaction } from '@mysten/sui/transactions';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { getConfig } from '@/config/config';
import { getAdminWalletService } from './admin-wallet-service';
import { getBadgeRetryQueue } from './badge-retry-queue';
import * as fs from 'fs';
import * as path from 'path';

/**
 * BadgeService - Manages badge operations (minting, tier updates, queries)
 */
export class BadgeService {
  private adminWallet: ReturnType<typeof getAdminWalletService>;
  private config: ReturnType<typeof getConfig>;
  private imageCache: Map<string, Uint8Array> = new Map(); // Cache for badge images

  constructor() {
    this.config = getConfig();
    this.adminWallet = getAdminWalletService();
    
    if (!this.config.contracts.badgeRegistry) {
      console.warn('⚠️ BadgeRegistry object ID not configured. Badge operations will fail.');
    }
  }

  /**
   * Get Sui client for current network
   */
  private getClient(): SuiClient {
    return this.config.sui.network === 'testnet'
      ? this.adminWallet.getTestnetClient()
      : this.adminWallet.getMainnetClient();
  }

  /**
   * Load badge image from file system
   * Falls back to placeholder if image file doesn't exist
   */
  private async loadBadgeImage(tier: number): Promise<Uint8Array> {
    // Check cache first
    const cacheKey = `tier_${tier}`;
    if (this.imageCache.has(cacheKey)) {
      return this.imageCache.get(cacheKey)!;
    }

    // Tier names for file lookup
    const tierNames = ['starter', 'common', 'uncommon', 'rare', 'epic', 'legendary'];
    const tierName = tierNames[tier] || 'starter';
    
    // Try to load actual image file
    const imagePath = path.join(process.cwd(), 'public', 'badges', `${tierName}.webp`);
    
    try {
      if (fs.existsSync(imagePath)) {
        const imageData = fs.readFileSync(imagePath);
        this.imageCache.set(cacheKey, imageData);
        console.log(`✅ Loaded badge image for tier ${tier} (${tierName})`);
        return imageData;
      }
    } catch (error) {
      console.warn(`⚠️ Failed to load badge image for tier ${tier}:`, error);
    }

    // Fall back to placeholder image
    console.log(`📦 Using placeholder image for tier ${tier} (${tierName})`);
    return this.createPlaceholderImage(tier);
  }

  /**
   * Create a simple placeholder image for testing
   * Returns a minimal WebP image (1x1 pixel, transparent)
   * In production, replace with actual badge images
   */
  private createPlaceholderImage(tier: number): Uint8Array {
    // Minimal WebP image: 1x1 pixel, transparent
    // This is a valid WebP file that can be replaced later
    // WebP header for a minimal lossless image
    const placeholder = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, // RIFF
      0x1A, 0x00, 0x00, 0x00, // Size (will be updated)
      0x57, 0x45, 0x42, 0x50, // WEBP
      0x56, 0x50, 0x38, 0x20, // VP8 
      0x0A, 0x00, 0x00, 0x00, // Size
      0x00, 0x00, 0x00, 0x00, // Flags
      0x00, 0x00, 0x00, 0x00, // Width/Height (1x1)
      0x00, 0x00, 0x00, 0x00, // Data
    ]);
    
    // Cache placeholder
    this.imageCache.set(`tier_${tier}`, placeholder);
    return placeholder;
  }

  /**
   * Convert image bytes to hex string for Move vector<u8>
   */
  private imageToHex(imageData: Uint8Array): string {
    return Array.from(imageData)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Check if player has a badge
   */
  async hasBadge(playerAddress: string): Promise<boolean> {
    if (!this.config.contracts.badgeRegistry) {
      throw new Error('BadgeRegistry object ID not configured');
    }

    try {
      const client = this.getClient();
      
      // Use devInspectTransactionBlock to call view function
      const tx = new Transaction();
      tx.moveCall({
        target: `${this.config.contracts.gameScore}::badge_system::has_badge`,
        arguments: [
          tx.object(this.config.contracts.badgeRegistry),
          tx.pure.address(playerAddress),
        ],
      });

      const result = await client.devInspectTransactionBlock({
        transactionBlock: tx,
        sender: this.adminWallet.getAddress(),
      });

      if (result.results && result.results.length > 0) {
        const returnValue = result.results[0].returnValues?.[0];
        if (returnValue) {
          // Parse return value (boolean as u8: 0 = false, 1 = true)
          // returnValue[1] is a string, so we check for string '1' or convert to number
          const value = returnValue[1];
          const hasBadge = String(value) === '1' || Number(value) === 1;
          return Boolean(hasBadge);
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking if player has badge:', error);
      throw error;
    }
  }

  /**
   * Get player's badge data
   */
  async getBadge(playerAddress: string): Promise<{
    badgeId: string | null;
    tier: number;
    gamesPlayed: number;
    mintDate: number;
    lastUpdated: number;
  } | null> {
    if (!this.config.contracts.badgeRegistry) {
      throw new Error('BadgeRegistry object ID not configured');
    }

    try {
      // First check if player has badge
      const hasBadge = await this.hasBadge(playerAddress);
      if (!hasBadge) {
        return null;
      }

      const client = this.getClient();
      
      // Get badge ID from registry
      const tx1 = new Transaction();
      tx1.moveCall({
        target: `${this.config.contracts.gameScore}::badge_system::get_badge_id`,
        arguments: [
          tx1.object(this.config.contracts.badgeRegistry),
          tx1.pure.address(playerAddress),
        ],
      });

      const result1 = await client.devInspectTransactionBlock({
        transactionBlock: tx1,
        sender: this.adminWallet.getAddress(),
      });

      if (!result1.results || !result1.results[0].returnValues?.[0]) {
        return null;
      }

      const badgeId = result1.results[0].returnValues[0][1] as string;

      // Get badge data
      const tx2 = new Transaction();
      tx2.moveCall({
        target: `${this.config.contracts.gameScore}::badge_system::get_badge_data`,
        arguments: [tx2.object(badgeId)],
      });

      const result2 = await client.devInspectTransactionBlock({
        transactionBlock: tx2,
        sender: this.adminWallet.getAddress(),
      });

      if (!result2.results || !result2.results[0].returnValues) {
        return null;
      }

      const returnValues = result2.results[0].returnValues;
      return {
        badgeId,
        tier: Number(returnValues[1][1]),
        gamesPlayed: Number(returnValues[2][1]),
        mintDate: Number(returnValues[3][1]),
        lastUpdated: Number(returnValues[4][1]),
      };
    } catch (error) {
      console.error('Error getting badge data:', error);
      throw error;
    }
  }

  /**
   * Build mint badge transaction for player to sign
   * Returns transaction data that frontend can use to build and sign
   */
  async buildMintBadgeTransaction(
    playerAddress: string,
    paymentCoinId: string // Player's payment coin (SUI) for minting fee
  ): Promise<{
    success: boolean;
    transactionData?: {
      packageId: string;
      module: string;
      function: string;
      arguments: any[];
      imageData: Uint8Array;
    };
    error?: string;
  }> {
    if (!this.config.contracts.badgeRegistry) {
      return {
        success: false,
        error: 'BadgeRegistry object ID not configured',
      };
    }

    try {
      // Check if player already has badge
      const hasBadge = await this.hasBadge(playerAddress);
      if (hasBadge) {
        return {
          success: false,
          error: 'Player already has a badge',
        };
      }

      // Load Starter tier badge image
      const imageData = await this.loadBadgeImage(0); // Tier 0 = Starter

      // Get StatisticsRegistry object ID from config
      const statsRegistryId = this.config.contracts.statisticsRegistry;
      if (!statsRegistryId || statsRegistryId.trim() === '') {
        return {
          success: false,
          error: 'StatisticsRegistry object ID not configured. Please set STATISTICS_REGISTRY_OBJECT_ID_TESTNET (or STATISTICS_REGISTRY_OBJECT_ID) environment variable in Vercel.',
        };
      }

      // Get Clock object (shared object)
      // Note: Clock is a well-known shared object, we can reference it directly
      const clockId = '0x6'; // Sui Clock object ID (well-known shared object)

      // Return transaction data for frontend to build and sign
      return {
        success: true,
        transactionData: {
          packageId: this.config.contracts.gameScore,
          module: 'badge_system',
          function: 'mint_badge',
          arguments: [
            this.config.contracts.badgeRegistry,
            statsRegistryId,
            clockId,
            paymentCoinId,
            Array.from(imageData), // Image data as array for vector<u8>
          ],
          imageData, // Also return raw image data if needed
        },
      };
    } catch (error) {
      console.error('Error minting badge:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check if badge tier should be updated and build transaction if needed
   * Returns transaction data if tier upgrade is needed
   * 
   * @param playerAddress - Player's wallet address
   * @param sessionId - Session ID for idempotency
   * @param addToRetryQueue - If true, add to retry queue on failure (default: true)
   */
  async checkAndBuildBadgeUpdate(
    playerAddress: string,
    sessionId: string,
    addToRetryQueue: boolean = true
  ): Promise<{
    success: boolean;
    tierUpgraded: boolean;
    newTier?: number;
    transactionData?: {
      packageId: string;
      module: string;
      function: string;
      arguments: any[];
      badgeId: string;
      imageData: Uint8Array;
    };
    error?: string;
  }> {
    if (!this.config.contracts.badgeRegistry) {
      return {
        success: false,
        tierUpgraded: false,
        error: 'BadgeRegistry object ID not configured',
      };
    }

    try {
      // Get current badge
      const badge = await this.getBadge(playerAddress);
      if (!badge) {
        return {
          success: false,
          tierUpgraded: false,
          error: 'Player does not have a badge',
        };
      }

      // Get player stats to check current games_played
      const statsRegistryId = this.config.contracts.statisticsRegistry;
      if (!statsRegistryId) {
        return {
          success: false,
          tierUpgraded: false,
          error: 'StatisticsRegistry object ID not configured',
        };
      }

      const client = this.getClient();
      
      // Query PlayerStats to get total_games
      const tx1 = new Transaction();
      tx1.moveCall({
        target: `${this.config.contracts.gameScore}::score_submission::get_player_stats`,
        arguments: [
          tx1.object(statsRegistryId),
          tx1.pure.address(playerAddress),
        ],
      });

      const result1 = await client.devInspectTransactionBlock({
        transactionBlock: tx1,
        sender: this.adminWallet.getAddress(),
      });

      if (!result1.results || !result1.results[0].returnValues) {
        return {
          success: false,
          tierUpgraded: false,
          error: 'Failed to get player stats',
        };
      }

      const returnValues = result1.results[0].returnValues;
      const hasStatsValue = returnValues[0][1];
      const hasStats = String(hasStatsValue) === '1' || Number(hasStatsValue) === 1;
      const totalGames = hasStats ? Number(returnValues[1][1]) : 0;

      // Calculate new tier
      const newTier = this.calculateTierFromGames(totalGames);
      const currentTier = badge.tier;

      // If tier didn't increase, no update needed
      if (newTier <= currentTier) {
        return {
          success: true,
          tierUpgraded: false,
        };
      }

      // Tier increased - need to update badge
      // Load new tier's badge image
      const imageData = await this.loadBadgeImage(newTier);

      // Get Clock object (shared object)
      const clockId = '0x6'; // Sui Clock object ID (well-known shared object)

      // Convert session ID to bytes
      const sessionIdBytes = Array.from(new TextEncoder().encode(sessionId));

      // Return transaction data for frontend to build and sign
      return {
        success: true,
        tierUpgraded: true,
        newTier,
        transactionData: {
          packageId: this.config.contracts.gameScore,
          module: 'badge_system',
          function: 'update_badge_tier',
          arguments: [
            badge.badgeId!,
            this.config.contracts.badgeRegistry,
            this.config.contracts.statisticsRegistry,
            clockId,
            sessionIdBytes, // Session ID as vector<u8>
            Array.from(imageData), // Image data as array for vector<u8>
          ],
          badgeId: badge.badgeId!,
          imageData,
        },
      };
    } catch (error) {
      console.error('Error updating badge tier:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Add to retry queue if enabled
      if (addToRetryQueue) {
        const retryQueue = getBadgeRetryQueue();
        retryQueue.addToQueue(playerAddress, sessionId, errorMessage);
      }
      
      return {
        success: false,
        tierUpgraded: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Calculate badge tier from games played
   * Public method for external use (e.g., reconciliation)
   */
  public calculateTierFromGames(gamesPlayed: number): number {
    if (gamesPlayed >= 150) return 5; // Legendary
    if (gamesPlayed >= 76) return 4;  // Epic
    if (gamesPlayed >= 36) return 3;  // Rare
    if (gamesPlayed >= 16) return 2;  // Uncommon
    if (gamesPlayed >= 6) return 1;   // Common
    return 0; // Starter
  }

  /**
   * Admin function: Mint badge for a player (for testing)
   * @param playerAddress - Player's wallet address
   * @param tier - Badge tier (0-5)
   * @returns Transaction result
   */
  async adminMintBadge(
    playerAddress: string,
    tier: number
  ): Promise<{
    success: boolean;
    digest?: string;
    error?: string;
  }> {
    if (!this.config.contracts.badgeRegistry || this.config.contracts.badgeRegistry.trim() === '') {
      return {
        success: false,
        error: 'BadgeRegistry object ID not configured. Please set BADGE_REGISTRY_OBJECT_ID_TESTNET (or BADGE_REGISTRY_OBJECT_ID) environment variable in Vercel.',
      };
    }

    // Validate tier
    if (tier < 0 || tier > 5) {
      return {
        success: false,
        error: 'Invalid tier. Must be 0-5',
      };
    }

    try {
      const client = this.getClient();
      const registryObjectId = this.config.contracts.badgeRegistry;
      const statsRegistryObjectId = this.config.contracts.statisticsRegistry;
      const adminCapabilityObjectId = this.config.contracts.adminCapability;
      const packageId = this.config.contracts.gameScore;

      // Validate all required object IDs
      if (!registryObjectId || registryObjectId.trim() === '') {
        return {
          success: false,
          error: 'BadgeRegistry object ID is missing. Please set BADGE_REGISTRY_OBJECT_ID_TESTNET in Vercel environment variables.',
        };
      }
      if (!statsRegistryObjectId || statsRegistryObjectId.trim() === '') {
        return {
          success: false,
          error: 'StatisticsRegistry object ID is missing. Please set STATISTICS_REGISTRY_OBJECT_ID_TESTNET in Vercel environment variables.',
        };
      }
      if (!adminCapabilityObjectId || adminCapabilityObjectId.trim() === '') {
        return {
          success: false,
          error: 'AdminCapability object ID is missing. Please set ADMIN_CAPABILITY_OBJECT_ID_TESTNET in Vercel environment variables.',
        };
      }
      if (!packageId || packageId.trim() === '') {
        return {
          success: false,
          error: 'Game Score package ID is missing. Please set GAME_SCORE_CONTRACT_TESTNET in Vercel environment variables.',
        };
      }

      // Load badge image for the tier
      const imageData = await this.loadBadgeImage(tier);

      // Build transaction
      const txb = new Transaction();

      txb.moveCall({
        target: `${packageId}::badge_system::admin_mint_badge`,
        arguments: [
          txb.object(adminCapabilityObjectId),  // Admin capability
          txb.object(registryObjectId),         // Badge registry
          txb.object(statsRegistryObjectId),     // Statistics registry
          txb.object('0x6'),                     // Clock
          txb.pure.address(playerAddress),      // Player address
          txb.pure.u8(tier),                    // Tier
          txb.pure.vector('u8', Array.from(imageData)), // Image data
        ],
      });

      txb.setGasBudget(this.config.sui.gasBudget);

      console.log(`🔧 [ADMIN BADGE] Minting badge for ${playerAddress}, tier: ${tier}`);

      // Sign and execute with admin wallet
      const keypair = this.adminWallet.getKeypair();
      
      const result = await client.signAndExecuteTransaction({
        signer: keypair,
        transaction: txb,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      // Check if transaction succeeded
      if (result.effects?.status?.status === 'success') {
        console.log(`✅ [ADMIN BADGE] Badge minted successfully: ${result.digest}`);
        return {
          success: true,
          digest: result.digest,
        };
      } else {
        return {
          success: false,
          error: result.effects?.status?.error || 'Transaction failed',
        };
      }
    } catch (error) {
      console.error('❌ [ADMIN BADGE] Error minting badge:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Admin function: Burn (delete) a badge (for testing)
   * @param badgeId - Badge object ID to burn
   * @returns Transaction result
   */
  async adminBurnBadge(
    badgeId: string
  ): Promise<{
    success: boolean;
    digest?: string;
    error?: string;
  }> {
    if (!this.config.contracts.badgeRegistry) {
      return {
        success: false,
        error: 'BadgeRegistry object ID not configured',
      };
    }

    // Validate badge ID format (must be a valid Sui object ID)
    if (!badgeId || !badgeId.startsWith('0x') || badgeId.length !== 66) {
      return {
        success: false,
        error: 'Invalid badge ID format. Must be a valid Sui object ID (0x followed by 64 hex characters). Note: This should be the badge object ID, not a wallet address.',
      };
    }

    try {
      const client = this.getClient();
      const registryObjectId = this.config.contracts.badgeRegistry;
      const adminCapabilityObjectId = this.config.contracts.adminCapability;
      const packageId = this.config.contracts.gameScore;
      const adminAddress = this.adminWallet.getAddress();

      // Verify the badge exists and is owned by the admin wallet
      try {
        const badgeObject = await client.getObject({
          id: badgeId,
          options: {
            showType: true,
            showOwner: true,
          },
        });

        if (!badgeObject.data) {
          return {
            success: false,
            error: `Badge object ${badgeId} does not exist. Please verify the badge ID is correct.`,
          };
        }

        // Check if it's actually a badge
        const badgeType = badgeObject.data.type;
        if (!badgeType || !badgeType.includes('badge_system::EarlySupporterBadge')) {
          return {
            success: false,
            error: `Object ${badgeId} is not a badge. Expected type: badge_system::EarlySupporterBadge, got: ${badgeType || 'unknown'}`,
          };
        }

        // Check ownership - badge must be owned by admin wallet
        const owner = badgeObject.data.owner;
        if (owner && typeof owner === 'object' && 'AddressOwner' in owner) {
          const ownerAddress = owner.AddressOwner.toLowerCase();
          if (ownerAddress !== adminAddress.toLowerCase()) {
            return {
              success: false,
              error: `Badge is not owned by admin wallet. Badge owner: ${ownerAddress}, Admin wallet: ${adminAddress}. Badges are soulbound and cannot be transferred, so the badge must be minted to the admin wallet to be burned.`,
            };
          }
        } else {
          return {
            success: false,
            error: `Badge ownership is not an address owner. Badges must be owned by the admin wallet to be burned.`,
          };
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
          return {
            success: false,
            error: `Badge object ${badgeId} does not exist. Please verify the badge ID is correct.`,
          };
        }
        throw error; // Re-throw if it's a different error
      }

      // Build transaction
      const txb = new Transaction();

      txb.moveCall({
        target: `${packageId}::badge_system::admin_burn_badge`,
        arguments: [
          txb.object(adminCapabilityObjectId),  // Admin capability
          txb.object(registryObjectId),         // Badge registry
          txb.object(badgeId),                   // Badge to burn (must be in admin wallet)
        ],
      });

      txb.setGasBudget(this.config.sui.gasBudget);

      console.log(`🔧 [ADMIN BADGE] Burning badge: ${badgeId}`);

      // Sign and execute with admin wallet
      const keypair = this.adminWallet.getKeypair();
      
      const result = await client.signAndExecuteTransaction({
        signer: keypair,
        transaction: txb,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      // Check if transaction succeeded
      if (result.effects?.status?.status === 'success') {
        console.log(`✅ [ADMIN BADGE] Badge burned successfully: ${result.digest}`);
        return {
          success: true,
          digest: result.digest,
        };
      } else {
        return {
          success: false,
          error: result.effects?.status?.error || 'Transaction failed',
        };
      }
    } catch (error) {
      console.error('❌ [ADMIN BADGE] Error burning badge:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get discount percentages for a tier
   */
  getDiscounts(tier: number): {
    store: number;
    gameplay: number;
  } {
    const discounts = [
      { store: 0, gameplay: 0 },    // Starter
      { store: 5, gameplay: 0 },     // Common
      { store: 10, gameplay: 5 },    // Uncommon
      { store: 15, gameplay: 10 },   // Rare
      { store: 20, gameplay: 15 },   // Epic
      { store: 25, gameplay: 20 },   // Legendary
    ];
    return discounts[tier] || discounts[0];
  }
}

// Singleton instance
let badgeServiceInstance: BadgeService | null = null;

export function getBadgeService(): BadgeService {
  if (!badgeServiceInstance) {
    badgeServiceInstance = new BadgeService();
  }
  return badgeServiceInstance;
}

export const badgeService = getBadgeService();
export default badgeService;

