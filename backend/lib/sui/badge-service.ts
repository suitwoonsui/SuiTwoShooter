// ==========================================
// Badge Service - Manages badge minting and tier updates
// ==========================================

import { Transaction } from '@mysten/sui/transactions';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { getConfig } from '@/config/config';
import { getAdminWalletService } from './admin-wallet-service';
import { getBadgeRetryQueue } from './badge-retry-queue';
import { validateAndSanitizeImage, getImageInfo } from './badge-image-validator';
import { BadgeLogger } from './badge-logger';
import { BadgeError, BadgeErrorCode } from './badge-errors';
import { BadgeValidators } from './badge-validators';
import { getBadgeImageCache } from './badge-image-cache';
import { getBadgeRequestCache } from './badge-request-cache';
import { calculateTierFromGames, getDiscounts } from './badge-service/badge-utilities';
import { BadgeQueries } from './badge-service/badge-queries';
import { BadgeImages } from './badge-service/badge-images';
import { BadgeTransactions } from './badge-service/badge-transactions';
import * as fs from 'fs';
import * as path from 'path';

/**
 * BadgeService - Manages badge operations (minting, tier updates, queries)
 */
export class BadgeService {
  private adminWallet: ReturnType<typeof getAdminWalletService>;
  private config: ReturnType<typeof getConfig>;
  private imageCache = getBadgeImageCache(); // Improved cache with TTL and size limits
  private requestCache = getBadgeRequestCache(); // Request-level cache for badge data
  private badgeQueries: BadgeQueries;
  private badgeImages: BadgeImages;
  private badgeTransactions: BadgeTransactions;

  constructor() {
    this.config = getConfig();
    this.adminWallet = getAdminWalletService();
    
    if (!this.config.contracts.badgeRegistry) {
      BadgeLogger.warn('BadgeRegistry object ID not configured. Badge operations will fail.');
    }

    // Initialize badge queries module
    this.badgeQueries = new BadgeQueries({
      getClient: () => this.getClient(),
      getConfig: () => this.config,
      getAdminWalletAddress: () => this.adminWallet.getAddress(),
      getBadgeImageUrl: (tier: number) => this.getBadgeImageUrl(tier),
    });

    // Initialize badge images module
    this.badgeImages = new BadgeImages({
      getClient: () => this.getClient(),
      getConfig: () => this.config,
      getAdminWallet: () => this.adminWallet,
    });

    // Initialize badge transactions module
    this.badgeTransactions = new BadgeTransactions({
      getClient: () => this.getClient(),
      getConfig: () => this.config,
      getAdminWallet: () => this.adminWallet,
      hasBadge: (playerAddress: string) => this.hasBadge(playerAddress),
      getBadge: (playerAddress: string) => this.getBadge(playerAddress),
      loadBadgeImage: (tier: number) => this.loadBadgeImage(tier),
      getBadgeImageUrl: (tier: number) => this.getBadgeImageUrl(tier),
      createImageDataObjectChunked: (imageData: Uint8Array, chunkSize?: number) => 
        this.createImageDataObjectChunked(imageData, chunkSize),
      adminCleanupOrphanedEntry: (playerAddress: string) => this.adminCleanupOrphanedEntry(playerAddress),
      calculateTierFromGames: (gamesPlayed: number) => this.calculateTierFromGames(gamesPlayed),
      invalidateCache: (playerAddress: string) => this.invalidateCache(playerAddress),
      addToRetryQueue: (playerAddress: string, sessionId: string, error: string) => {
        const retryQueue = getBadgeRetryQueue();
        retryQueue.addToQueue(playerAddress, sessionId, error);
      },
    });
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
    return this.badgeImages.loadBadgeImage(tier);
  }

  /**
   * Get static image URL for a badge tier
   */
  public getBadgeImageUrl(tier: number): string {
    return this.badgeImages.getBadgeImageUrl(tier);
  }

  /**
   * Create BadgeImageData object using chunked upload pattern
   */
  private async createImageDataObjectChunked(
    imageData: Uint8Array,
    chunkSize: number = 14 * 1024
  ): Promise<string> {
    return this.badgeImages.createImageDataObjectChunked(imageData, chunkSize);
  }

  /**
   * Invalidate cache for a player address
   */
  private invalidateCache(playerAddress: string): void {
    this.requestCache.invalidate(playerAddress);
  }

  /**
   * Check if player has a badge in OLD contract
   */
  async hasBadgeOldContract(playerAddress: string): Promise<boolean> {
    // Get old contract IDs from environment
    const oldPackageId = process.env.OLD_GAME_SCORE_CONTRACT_TESTNET || process.env.OLD_GAME_SCORE_CONTRACT;
    const oldRegistryId = process.env.OLD_BADGE_REGISTRY_OBJECT_ID_TESTNET || process.env.OLD_BADGE_REGISTRY_OBJECT_ID;

    BadgeLogger.debug('Checking OLD contract for badge', {
      oldPackageId: oldPackageId ? oldPackageId.substring(0, 10) + '...' : 'NOT SET',
      oldRegistryId: oldRegistryId ? oldRegistryId.substring(0, 10) + '...' : 'NOT SET',
    });

    if (!oldPackageId || !oldRegistryId) {
      BadgeLogger.warn('Old contract IDs not configured');
      return false;
    }

    try {
      const client = this.getClient();
      const packageId = oldPackageId.split('::')[0]; // Extract package ID if full path provided
      
      BadgeLogger.debug('Using old contract', {
        package: packageId.substring(0, 10) + '...',
        registry: oldRegistryId.substring(0, 10) + '...',
      });
      
      // Use devInspectTransactionBlock to call view function
      const tx = new Transaction();
      tx.moveCall({
        target: `${packageId}::badge_system::has_badge`,
        arguments: [
          tx.object(oldRegistryId),
          tx.pure.address(playerAddress),
        ],
      });

      const result = await client.devInspectTransactionBlock({
        transactionBlock: tx,
        sender: this.adminWallet.getAddress(),
      });

      if (result.results && result.results.length > 0) {
        const firstResult = result.results[0];
        const returnValue = firstResult.returnValues?.[0] as any;
        
        if (returnValue) {
          // Parse the actual value (same pattern as new contract)
          let actualValue: any = null;
          
          // Strategy: Check returnValue[0][0] (most common pattern)
          if (Array.isArray(returnValue[0]) && returnValue[0].length > 0) {
            actualValue = returnValue[0][0];
          } else if (returnValue[1] === "0" || returnValue[1] === "1" || returnValue[1] === 0 || returnValue[1] === 1) {
            actualValue = returnValue[1];
          }
          
          const hasBadge = actualValue === "1" || actualValue === 1 || actualValue === true;
          BadgeLogger.debug('Old contract badge lookup result', { hasBadge, actualValue });
          return hasBadge;
        }
      }

      BadgeLogger.debug('No badge found in old contract - returning false');
      return false;
    } catch (error) {
      BadgeLogger.error('Error checking old contract badge', error);
      return false;
    }
  }

  /**
   * Get badge from OLD contract
   */
  async getBadgeOldContract(playerAddress: string): Promise<{
    badgeId: string;
    tier: number;
    gamesPlayed: number;
    mintDate: number;
    lastUpdated: number;
    imageUrl?: string;
  } | null> {
    // Get old contract IDs from environment
    const oldPackageId = process.env.OLD_GAME_SCORE_CONTRACT_TESTNET || process.env.OLD_GAME_SCORE_CONTRACT;
    const oldRegistryId = process.env.OLD_BADGE_REGISTRY_OBJECT_ID_TESTNET || process.env.OLD_BADGE_REGISTRY_OBJECT_ID;

    if (!oldPackageId || !oldRegistryId) {
      BadgeLogger.warn('Old contract IDs not configured');
      return null;
    }

    try {
      const client = this.getClient();
      const packageId = oldPackageId.split('::')[0]; // Extract package ID if full path provided

      // First check if player has badge
      const hasBadge = await this.hasBadgeOldContract(playerAddress);
      if (!hasBadge) {
        return null;
      }

      // Get badge ID from registry
      const tx1 = new Transaction();
      tx1.moveCall({
        target: `${packageId}::badge_system::get_badge_id`,
        arguments: [
          tx1.object(oldRegistryId),
          tx1.pure.address(playerAddress),
        ],
      });

      const result1 = await client.devInspectTransactionBlock({
        transactionBlock: tx1,
        sender: this.adminWallet.getAddress(),
      });

      if (!result1.results || result1.results.length === 0) {
        return null;
      }

      const badgeIdReturn = result1.results[0].returnValues;
      if (!badgeIdReturn || badgeIdReturn.length === 0) {
        return null;
      }

      // Extract badge ID (same pattern as new contract)
      const returnValue = badgeIdReturn[0] as any;
      let badgeId: string | null = null;
      
      if (Array.isArray(returnValue) && Array.isArray(returnValue[0]) && returnValue[0].length === 32) {
        // Convert byte array to hex string
        const bytes = returnValue[0] as number[];
        badgeId = '0x' + bytes.map(b => b.toString(16).padStart(2, '0')).join('');
      } else if (typeof returnValue[1] === 'string' && returnValue[1].startsWith('0x')) {
        // Already a hex string
        badgeId = returnValue[1];
      }
      
      if (!badgeId) {
        BadgeLogger.warn('Could not extract badge ID from return value', { returnValue });
        return null;
      }

      // Get badge data
      const tx2 = new Transaction();
      tx2.moveCall({
        target: `${packageId}::badge_system::get_badge_data`,
        arguments: [tx2.object(badgeId)],
      });

      const result2 = await client.devInspectTransactionBlock({
        transactionBlock: tx2,
        sender: this.adminWallet.getAddress(),
      });

      if (!result2.results || result2.results.length === 0) {
        return null;
      }

      const badgeDataReturn = result2.results[0].returnValues;
      if (!badgeDataReturn || badgeDataReturn.length < 4) {
        return null;
      }

      // Extract badge data: (tier: u8, games_played: u64, mint_date: u64, last_updated: u64)
      const tier = Number(badgeDataReturn[0][1]);
      const gamesPlayed = Number(badgeDataReturn[1][1]);
      const mintDate = Number(badgeDataReturn[2][1]);
      const lastUpdated = Number(badgeDataReturn[3][1]);

      // Try to get image URL
      let imageUrl: string | undefined;
      try {
        const tx3 = new Transaction();
        tx3.moveCall({
          target: `${packageId}::badge_system::get_badge_image_url`,
          arguments: [tx3.object(badgeId)],
        });

        const result3 = await client.devInspectTransactionBlock({
          transactionBlock: tx3,
          sender: this.adminWallet.getAddress(),
        });

        if (result3.results && result3.results.length > 0) {
          const imageUrlReturn = result3.results[0].returnValues;
          if (imageUrlReturn && imageUrlReturn.length > 0) {
            imageUrl = imageUrlReturn[0][1] as string;
          }
        }
      } catch (error) {
        // Image URL is optional, continue without it
        BadgeLogger.warn('Could not get image URL from old contract', error);
      }

      return {
        badgeId,
        tier,
        gamesPlayed,
        mintDate,
        lastUpdated,
        imageUrl,
      };
    } catch (error) {
      BadgeLogger.error('Error getting old contract badge', error);
      return null;
    }
  }

  /**
   * Check if player has a badge
   */
  async hasBadge(playerAddress: string): Promise<boolean> {
    return this.badgeQueries.hasBadge(playerAddress);
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
    imageUrl?: string;
  } | null> {
    return this.badgeQueries.getBadge(playerAddress);
  }

  /**
   * Build mint badge transaction for player to sign
   * Returns transaction data that frontend can use to build and sign
   * NOTE: This function creates the BadgeImageData object server-side using chunked upload
   * The frontend receives the object ID to use in the transaction
   */
  /**
   * Get mint badge transaction data (for frontend to build)
   */
  async getMintBadgeTransactionData(
    playerAddress: string,
    paymentCoinId: string
  ): Promise<{
    success: boolean;
    transactionData?: {
      packageId: string;
      module: string;
      function: string;
      arguments: {
        badgeRegistry: string;
        statsRegistry: string;
        clock: string;
        paymentCoinId: string;
        paymentAmount: string;
        imageDataObjectId: string;
      };
      gasBudget: number;
    };
    error?: string;
  }> {
    return this.badgeTransactions.getMintBadgeTransactionData(playerAddress, paymentCoinId);
  }


  /**
   * Build migrate badge transaction for player to sign
   * Uses migrate_badge() function which preserves old tier, games played, and mint date
   * NO payment required (free migration)
   * Returns base64 transaction string for frontend to sign
   * 
   * NOTE: The old badge must be manually deleted by the player after migration.
   * The migrate_badge() function cannot burn the old badge (soulbound NFTs).
   * 
   * @param playerAddress - Player's wallet address
   * @param oldTier - Tier from old badge (0-5)
   * @param oldGamesPlayed - Games played from old badge
   * @param oldMintDate - Original mint date from old badge
   */
  async buildMigrateBadgeTransaction(
    playerAddress: string,
    oldTier: number,
    oldGamesPlayed: number,
    oldMintDate: number
  ): Promise<{
    success: boolean;
    transaction?: string;
    gasEstimate?: string;
    error?: string;
  }> {
    return this.badgeTransactions.buildMigrateBadgeTransaction(playerAddress, oldTier, oldGamesPlayed, oldMintDate);
  }

  /**
   * Build upgrade badge transaction (similar to buildMintBadgeTransaction)
   * Returns base64 transaction string for frontend to sign
   * 
   * @param playerAddress - Player's wallet address
   * @param badgeId - Badge object ID to upgrade
   * @param newTier - New tier number
   * @param sessionId - Session ID for idempotency
   */
  async buildUpgradeBadgeTransaction(
    playerAddress: string,
    badgeId: string,
    newTier: number,
    sessionId: string
  ): Promise<{
    success: boolean;
    transaction?: string;
    gasEstimate?: string;
    error?: string;
  }> {
    return this.badgeTransactions.buildUpgradeBadgeTransaction(playerAddress, badgeId, newTier, sessionId);
  }

  /**
   * Check if badge tier upgrade is available (read-only, no transaction building)
   * This is used by the /check-upgrade endpoint to determine if an upgrade is available
   * without requiring gas or building transaction data.
   */
  async checkBadgeUpgrade(
    playerAddress: string
  ): Promise<{
    success: boolean;
    hasPendingUpgrade: boolean;
    newTier?: number;
    badgeId?: string;
    error?: string;
  }> {
    return this.badgeTransactions.checkBadgeUpgrade(playerAddress);
  }

  /**
   * Check if badge tier should be updated and build transaction if needed
   * This is used when actually performing the upgrade (requires gas)
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
    return this.badgeTransactions.checkAndBuildBadgeUpdate(playerAddress, sessionId, addToRetryQueue);
  }

  /**
   * Calculate badge tier from games played
   * Public method for external use (e.g., reconciliation)
   */
  public calculateTierFromGames(gamesPlayed: number): number {
    return calculateTierFromGames(gamesPlayed);
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
    transaction?: string; // Serialized transaction bytes (base64) for player to sign
    digest?: string; // Not used anymore - transaction must be signed by player
    error?: string;
    note?: string;
  }> {
    BadgeLogger.info('Starting admin mint badge', {
      playerAddress,
      tier,
      timestamp: new Date().toISOString(),
    });

    // Validate input
    BadgeValidators.validateAddress(playerAddress);
    BadgeValidators.validateTier(tier);

    // Step 1: Validate BadgeRegistry configuration
    if (!this.config.contracts.badgeRegistry || this.config.contracts.badgeRegistry.trim() === '') {
      throw new BadgeError(
        BadgeErrorCode.CONFIG_MISSING,
        'BadgeRegistry object ID not configured. Please set BADGE_REGISTRY_OBJECT_ID_TESTNET (or BADGE_REGISTRY_OBJECT_ID) environment variable.'
      );
    }
    BadgeLogger.debug('BadgeRegistry configured', {
      registryId: this.config.contracts.badgeRegistry,
    });

    try {
      // Step 3: Get client and configuration
      BadgeLogger.debug('Getting Sui client and configuration for admin mint');
      const client = this.getClient();
      const registryObjectId = this.config.contracts.badgeRegistry;
      const statsRegistryObjectId = this.config.contracts.statisticsRegistry;
      const adminCapabilityObjectId = this.config.contracts.adminCapability;
      const packageId = this.config.contracts.gameScore;
      
      BadgeLogger.debug('Admin mint configuration', {
        registryObjectId,
        statsRegistryObjectId,
        adminCapabilityObjectId,
        packageId,
        network: this.config.sui.network,
        adminWalletAddress: this.adminWallet.getAddress(),
      });

      // Step 4: Validate all required object IDs
      BadgeLogger.debug('Validating all required object IDs');
      if (!registryObjectId || registryObjectId.trim() === '') {
        BadgeLogger.error('BadgeRegistry object ID is missing');
        return {
          success: false,
          error: 'BadgeRegistry object ID is missing. Please set BADGE_REGISTRY_OBJECT_ID_TESTNET in Vercel environment variables.',
        };
      }
      BadgeLogger.debug('BadgeRegistry object ID validated', { registryObjectId });
      
      if (!statsRegistryObjectId || statsRegistryObjectId.trim() === '') {
        BadgeLogger.error('StatisticsRegistry object ID is missing');
        return {
          success: false,
          error: 'StatisticsRegistry object ID is missing. Please set STATISTICS_REGISTRY_OBJECT_ID_TESTNET in Vercel environment variables.',
        };
      }
      BadgeLogger.debug('StatisticsRegistry object ID validated', { statsRegistryObjectId });
      
      if (!adminCapabilityObjectId || adminCapabilityObjectId.trim() === '') {
        BadgeLogger.error('AdminCapability object ID is missing');
        return {
          success: false,
          error: 'AdminCapability object ID is missing. Please set ADMIN_CAPABILITY_OBJECT_ID_TESTNET in Vercel environment variables.',
        };
      }
      BadgeLogger.debug('AdminCapability object ID validated', { adminCapabilityObjectId });
      
      if (!packageId || packageId.trim() === '') {
        BadgeLogger.error('Game Score package ID is missing');
        return {
          success: false,
          error: 'Game Score package ID is missing. Please set GAME_SCORE_CONTRACT_TESTNET in Vercel environment variables.',
        };
      }
      BadgeLogger.debug('All object IDs validated successfully');

      // Step 5: Check if player already has a badge in the registry
      // This uses the same hasBadge function that the lookup uses
      BadgeLogger.debug('Checking if player already has badge', { playerAddress });
      
      const hasBadge = await this.hasBadge(playerAddress);
      
      BadgeLogger.debug('hasBadge check result', { hasBadge, playerAddress });
      
      if (hasBadge) {
        BadgeLogger.warn('Player already has badge - cannot mint another one', { playerAddress });
        
        // Try to get the badge to provide more details in the error message
        let badgeInfo = '';
        try {
          const badge = await this.getBadge(playerAddress);
          BadgeLogger.debug('Retrieved badge details for error message', { 
            playerAddress, 
            hasBadge: !!badge,
            badgeId: badge?.badgeId 
          });
          
          if (badge && badge.badgeId) {
            badgeInfo = ` Badge ID: ${badge.badgeId}, Tier: ${badge.tier}.`;
            BadgeLogger.debug('Badge details', badge);
          } else {
            BadgeLogger.warn('getBadge returned null or no badgeId - inconsistent with hasBadge=true', { playerAddress });
          }
        } catch (error) {
          // Ignore errors getting badge details - just use the hasBadge result
          BadgeLogger.warn('Error getting badge details for error message', error);
        }
        
        BadgeLogger.error('Admin mint failed - player already has badge', { playerAddress });
        return {
          success: false,
          error: `Player already has a badge in the registry.${badgeInfo} Please burn the existing badge first if you want to mint a new one.`,
        };
      }
      
      BadgeLogger.debug('Player does not have badge - proceeding with mint', { playerAddress });

      // Step 6: Get badge image URL for the tier
      BadgeLogger.debug('Getting badge image URL for tier', { tier });
      const imageUrl = this.getBadgeImageUrl(tier);
      BadgeLogger.debug('Badge image URL retrieved', { tier, imageUrl });

      // Step 7: Build mint transaction using admin_mint_badge function
      // This creates the badge in admin's wallet (for testing/admin purposes)
      // Admin signs and executes - no player signature needed
      BadgeLogger.debug('Building mint transaction using admin_mint_badge', {
        playerAddress,
        tier,
        note: 'Admin signs and executes - badge created in admin wallet',
      });
      
      const txb = new Transaction();

      const moveCallTarget = `${packageId}::badge_system::admin_mint_badge`;
      BadgeLogger.debug('Transaction details', {
        moveCallTarget,
        adminCapability: adminCapabilityObjectId,
        registry: registryObjectId,
        statsRegistry: statsRegistryObjectId,
        clock: '0x6',
        player: playerAddress,
        tier,
        imageUrl,
      });

      // Build move call - using admin_mint_badge function
      // Function signature: admin_mint_badge(admin_cap, registry, stats_registry, clock, player, tier, image_url, ctx)
      txb.moveCall({
        target: moveCallTarget,
        arguments: [
          txb.object(adminCapabilityObjectId),        // admin_cap: &AdminCapability
          txb.object(registryObjectId),                // registry: &mut BadgeRegistry (shared object)
          txb.object(statsRegistryObjectId),          // stats_registry: &StatisticsRegistry (shared object)
          txb.object('0x6'),                          // clock: &Clock (shared system object)
          txb.pure.address(playerAddress),            // player: address
          txb.pure.u8(tier),                          // tier: u8
          txb.pure.string(imageUrl),                  // image_url: String
        ],
      });

      txb.setGasBudget(this.config.sui.gasBudget);
      
      // Check wallet balance before building transaction
      const { checkBalanceBeforeTransaction } = await import('./balance-checker');
      await checkBalanceBeforeTransaction({
        client,
        walletAddress: this.adminWallet.getAddress(),
        gasBudget: this.config.sui.gasBudget,
        context: 'admin mint badge',
      });
      
      // Sign and execute with admin wallet (no player signature needed)
      BadgeLogger.debug('Signing and executing transaction with admin wallet');
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
        BadgeLogger.info('Badge minted successfully', {
          playerAddress,
          tier,
          digest: result.digest,
        });
        return {
          success: true,
          digest: result.digest,
          note: `Badge minted at tier ${tier} in admin wallet. Badge metadata owner: ${playerAddress}`,
        };
      } else {
        const errorMsg = result.effects?.status?.error || 'Transaction failed';
        BadgeLogger.error('Admin mint transaction failed', {
          playerAddress,
          tier,
          error: errorMsg,
        });
        return {
          success: false,
          error: errorMsg,
        };
      }
    } catch (error) {
      BadgeLogger.error('Admin mint error - exception caught during mint process', {
        error,
        playerAddress,
        tier,
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Admin function: Clean up orphaned registry entry
   * Removes registry entry if badge object doesn't exist
   * @param playerAddress - Player address to clean up
   * @returns Transaction result
   */
  async adminCleanupOrphanedEntry(
    playerAddress: string
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

    if (!this.config.contracts.adminCapability) {
      return {
        success: false,
        error: 'AdminCapability object ID not configured',
      };
    }

    try {
      const client = this.getClient();
      const registryObjectId = this.config.contracts.badgeRegistry;
      const adminCapabilityObjectId = this.config.contracts.adminCapability;
      const packageId = this.config.contracts.gameScore;

      // Build transaction
      const txb = new Transaction();

      txb.moveCall({
        target: `${packageId}::badge_system::admin_cleanup_orphaned_entry`,
        arguments: [
          txb.object(adminCapabilityObjectId),  // Admin capability
          txb.object(registryObjectId),         // Badge registry
          txb.pure.address(playerAddress),       // Player address
        ],
      });

      txb.setGasBudget(this.config.sui.gasBudget);

      BadgeLogger.info('Cleaning up orphaned registry entry', { playerAddress });

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
        BadgeLogger.info('Orphaned entry cleaned up successfully', {
          playerAddress,
          digest: result.digest,
        });
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
      BadgeLogger.error('Error cleaning up orphaned entry', { error, playerAddress });
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
        BadgeLogger.debug('Checking badge ownership', {
          badgeId,
          owner: JSON.stringify(owner),
          adminAddress,
        });
        
        if (owner && typeof owner === 'object' && 'AddressOwner' in owner) {
          const ownerAddress = owner.AddressOwner.toLowerCase();
          const adminAddressLower = adminAddress.toLowerCase();
          
          BadgeLogger.debug('Badge ownership check', {
            ownerAddress,
            adminAddress: adminAddressLower,
            match: ownerAddress === adminAddressLower,
          });
          
          if (ownerAddress !== adminAddressLower) {
            // Try to get the badge's metadata owner (the player it was minted for)
            let metadataOwner = 'unknown';
            try {
              const badgeContent = badgeObject.data.content;
              if (badgeContent && 'fields' in badgeContent && badgeContent.fields && 'owner' in badgeContent.fields) {
                metadataOwner = String(badgeContent.fields.owner);
              }
            } catch (e) {
              // Ignore errors getting metadata
            }
            
            return {
              success: false,
              error: `Badge is not owned by admin wallet. Object owner: ${ownerAddress}, Admin wallet: ${adminAddress}. Badge metadata owner (player): ${metadataOwner}. Badges are soulbound and cannot be transferred. To burn a badge, it must be in the admin wallet. If this badge was minted via admin_mint_badge, it should be in the admin wallet. If it was minted normally by the player, it cannot be burned by admin.`,
            };
          }
        } else {
          BadgeLogger.warn('Badge ownership format unexpected', { owner, badgeId });
          return {
            success: false,
            error: `Badge ownership is not an address owner. Owner type: ${typeof owner}, Value: ${JSON.stringify(owner)}. Badges must be owned by the admin wallet to be burned.`,
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

      BadgeLogger.info('Burning badge', { badgeId });

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
        BadgeLogger.info('Badge burned successfully', {
          badgeId,
          digest: result.digest,
        });
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
      BadgeLogger.error('Error burning badge', { error, badgeId });
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
    return getDiscounts(tier);
  }

  /**
   * Find all required objects from old package
   * Queries the blockchain to find BadgeRegistry, AdminCapability, and StatisticsRegistry from the old package
   */
  async findOldContractObjects(): Promise<{
    success: boolean;
    registryId?: string;
    adminCapabilityId?: string;
    statisticsRegistryId?: string;
    error?: string;
  }> {
    try {
      const oldPackageId = process.env.OLD_GAME_SCORE_CONTRACT_TESTNET || process.env.OLD_GAME_SCORE_CONTRACT;
      
      if (!oldPackageId) {
        return {
          success: false,
          error: 'Old contract package ID not configured',
        };
      }

      const client = this.getClient();
      const packageId = oldPackageId.split('::')[0];

      BadgeLogger.debug('Searching for objects from old package', { packageId });
      
      // First, check if we already have IDs configured in env
      const envRegistryId = process.env.OLD_BADGE_REGISTRY_OBJECT_ID_TESTNET || process.env.OLD_BADGE_REGISTRY_OBJECT_ID;
      const envAdminCapId = process.env.OLD_ADMIN_CAPABILITY_OBJECT_ID_TESTNET || process.env.OLD_ADMIN_CAPABILITY_OBJECT_ID;
      const envStatsRegId = process.env.OLD_STATISTICS_REGISTRY_OBJECT_ID_TESTNET || process.env.OLD_STATISTICS_REGISTRY_OBJECT_ID;
      
      const results = {
        registryId: null as string | null,
        adminCapabilityId: null as string | null,
        statisticsRegistryId: null as string | null,
      };
      
      // Verify and use env-configured IDs if they're from the correct package
      if (envAdminCapId) {
        try {
          const obj = await client.getObject({ id: envAdminCapId, options: { showType: true } });
          if (obj.data?.type && obj.data.type.includes(packageId)) {
            results.adminCapabilityId = envAdminCapId;
            BadgeLogger.debug('Using AdminCapability from env', { adminCapabilityId: envAdminCapId });
          }
        } catch (e) {
          BadgeLogger.warn('Could not verify env AdminCapability', e);
        }
      }
      
      if (envStatsRegId) {
        try {
          const obj = await client.getObject({ id: envStatsRegId, options: { showType: true } });
          if (obj.data?.type && obj.data.type.includes(packageId)) {
            results.statisticsRegistryId = envStatsRegId;
            BadgeLogger.debug('Using StatisticsRegistry from env', { statisticsRegistryId: envStatsRegId });
          }
        } catch (e) {
          BadgeLogger.warn('Could not verify env StatisticsRegistry', e);
        }
      }
      
      if (envRegistryId) {
        try {
          const obj = await client.getObject({ id: envRegistryId, options: { showType: true } });
          if (obj.data?.type && obj.data.type.includes(packageId)) {
            results.registryId = envRegistryId;
            BadgeLogger.debug('Using BadgeRegistry from env', { registryId: envRegistryId });
          } else if (obj.data?.type) {
            const objPackage = obj.data.type.split('::')[0];
            BadgeLogger.warn('Env BadgeRegistry package mismatch', {
              envPackage: objPackage,
              expectedPackage: packageId,
            });
          }
        } catch (e) {
          BadgeLogger.warn('Could not verify env BadgeRegistry', e);
        }
      }

      // Query events from the old package to find object creations
      const events = await client.queryEvents({
        query: {
          MoveModule: {
            package: packageId,
            module: 'badge_system',
          },
        },
        limit: 100,
        order: 'descending',
      });

      // Also query score_submission module events for AdminCapability and StatisticsRegistry
      const scoreEvents = await client.queryEvents({
        query: {
          MoveModule: {
            package: packageId,
            module: 'score_submission',
          },
        },
        limit: 100,
        order: 'descending',
      });

      // Combine events
      const allEvents = [...events.data, ...scoreEvents.data];

      // Look through transactions for object creations
      for (const event of allEvents) {
        try {
          const tx = await client.getTransactionBlock({
            digest: event.id.txDigest,
            options: {
              showObjectChanges: true,
              showEvents: true,
            },
          });

          if (tx.objectChanges) {
            for (const change of tx.objectChanges) {
              if (change.type === 'created' && change.objectType) {
                // Check for BadgeRegistry
                if (change.objectType.includes('BadgeRegistry') && change.objectType.includes(packageId)) {
                  if (!results.registryId) {
                    results.registryId = change.objectId;
                    BadgeLogger.debug('Found BadgeRegistry via events', { registryId: change.objectId });
                  }
                }
                // Check for AdminCapability
                if (change.objectType.includes('AdminCapability') && change.objectType.includes(packageId)) {
                  if (!results.adminCapabilityId) {
                    results.adminCapabilityId = change.objectId;
                    BadgeLogger.debug('Found AdminCapability via events', { adminCapabilityId: change.objectId });
                  }
                }
                // Check for StatisticsRegistry
                if (change.objectType.includes('StatisticsRegistry') && change.objectType.includes(packageId)) {
                  if (!results.statisticsRegistryId) {
                    results.statisticsRegistryId = change.objectId;
                    BadgeLogger.debug('Found StatisticsRegistry via events', { statisticsRegistryId: change.objectId });
                  }
                }
              }
            }
          }
        } catch (txError) {
          // Continue to next event
          continue;
        }
      }

      // If we didn't find all objects through events, try direct object queries
      if (!results.registryId || !results.adminCapabilityId || !results.statisticsRegistryId) {
        BadgeLogger.debug('Some objects not found via events, trying direct queries', {
          hasRegistry: !!results.registryId,
          hasAdminCap: !!results.adminCapabilityId,
          hasStatsReg: !!results.statisticsRegistryId,
        });
        
        // Try to find BadgeRegistry by querying objects of that type
        if (!results.registryId) {
          try {
            const registryType = `${packageId}::badge_system::BadgeRegistry`;
            const objects = await client.getOwnedObjects({
              owner: '0x0000000000000000000000000000000000000000000000000000000000000000', // System address for shared objects
              filter: { StructType: registryType },
              options: { showType: true },
              limit: 10,
            });
            
            // Note: queryObjects doesn't exist in Sui SDK
            // Shared objects must be found via events or known object IDs
          } catch (err) {
            BadgeLogger.warn('Error querying BadgeRegistry', err);
          }
        }
        
        // Try to find AdminCapability
        // Note: queryObjects doesn't exist in Sui SDK - AdminCapability must be found via events or known object IDs
        if (!results.adminCapabilityId) {
          BadgeLogger.debug('AdminCapability not found via events - cannot query directly');
        }
        
        // Try to find StatisticsRegistry
        // Note: queryObjects doesn't exist in Sui SDK - StatisticsRegistry must be found via events or known object IDs
        if (!results.statisticsRegistryId) {
          BadgeLogger.debug('StatisticsRegistry not found via events - cannot query directly');
        }
      }

      if (results.registryId && results.adminCapabilityId && results.statisticsRegistryId) {
        return {
          success: true,
          registryId: results.registryId,
          adminCapabilityId: results.adminCapabilityId,
          statisticsRegistryId: results.statisticsRegistryId,
        };
      } else {
        return {
          success: false,
          error: `Could not find all required objects. Found: Registry=${!!results.registryId}, AdminCapability=${!!results.adminCapabilityId}, StatisticsRegistry=${!!results.statisticsRegistryId}. Package ID: ${packageId}`,
        };
      }
    } catch (error: any) {
      BadgeLogger.error('Error finding old contract objects', error);
      return {
        success: false,
        error: error.message || 'Failed to find old contract objects',
      };
    }
  }

  /**
   * Find BadgeRegistry object ID from old package
   * Queries the blockchain to find the actual BadgeRegistry object from the old package
   */
  async findOldBadgeRegistry(): Promise<{
    success: boolean;
    registryId?: string;
    registryType?: string;
    error?: string;
  }> {
    try {
      const oldPackageId = process.env.OLD_GAME_SCORE_CONTRACT_TESTNET || process.env.OLD_GAME_SCORE_CONTRACT;
      
      if (!oldPackageId) {
        return {
          success: false,
          error: 'Old contract package ID not configured',
        };
      }

      const client = this.getClient();
      const packageId = oldPackageId.split('::')[0];

      BadgeLogger.debug('Searching for BadgeRegistry from old package', { packageId });
      
      // Query for BadgeRegistry objects by type
      const expectedType = `${packageId}::badge_system::BadgeRegistry`;
      
      try {
        // Try to query objects of this type
        const objects = await client.getOwnedObjects({
          owner: '0x0000000000000000000000000000000000000000000000000000000000000000', // This won't work for shared objects
          filter: {
            StructType: expectedType,
          },
          options: {
            showType: true,
            showOwner: true,
          },
          limit: 10,
        });

        if (objects.data && objects.data.length > 0) {
          // Check if any are shared objects
          const sharedRegistry = objects.data.find(obj => 
            obj.data?.owner && typeof obj.data.owner === 'object' && 'Shared' in obj.data.owner
          );
          
          if (sharedRegistry) {
            BadgeLogger.debug('Found shared BadgeRegistry', {
              registryId: sharedRegistry.data?.objectId,
              registryType: sharedRegistry.data?.type || expectedType,
            });
            return {
              success: true,
              registryId: sharedRegistry.data?.objectId,
              registryType: sharedRegistry.data?.type || expectedType,
            };
          }
        }
      } catch (queryError) {
        BadgeLogger.debug('Query by type failed, trying alternative method');
      }

      // Alternative: Query events from initialize_badge_registry
      // Look for BadgeRegistry creation events
      BadgeLogger.debug('Querying events for BadgeRegistry creation');
      
      // Query all events from the old package's badge_system module
      const events = await client.queryEvents({
        query: {
          MoveModule: {
            package: packageId,
            module: 'badge_system',
          },
        },
        limit: 100,
        order: 'descending',
      });

      // Look through object changes in transactions that created BadgeRegistry
      for (const event of events.data) {
        try {
          const tx = await client.getTransactionBlock({
            digest: event.id.txDigest,
            options: {
              showObjectChanges: true,
              showEvents: true,
            },
          });

          if (tx.objectChanges) {
            for (const change of tx.objectChanges) {
              if (change.type === 'created' && 
                  change.objectType && 
                  change.objectType.includes('BadgeRegistry') &&
                  change.objectType.includes(packageId)) {
                BadgeLogger.debug('Found BadgeRegistry in transaction', {
                  transactionDigest: event.id.txDigest,
                  registryId: change.objectId,
                  registryType: change.objectType,
                });
                
                return {
                  success: true,
                  registryId: change.objectId,
                  registryType: change.objectType,
                };
              }
            }
          }
        } catch (txError) {
          // Continue to next event
          continue;
        }
      }

      return {
        success: false,
        error: 'Could not find BadgeRegistry object from old package. It may not have been initialized, or the package ID is incorrect.',
      };
    } catch (error: any) {
      BadgeLogger.error('Error finding old BadgeRegistry', error);
      return {
        success: false,
        error: error.message || 'Failed to find old BadgeRegistry',
      };
    }
  }

  /**
   * Verify old contract configuration
   * Checks that all old contract environment variables are set correctly
   */
  async verifyOldContractConfig(): Promise<{
    success: boolean;
    config?: {
      oldPackageId: string;
      oldRegistryId: string;
      oldAdminCapabilityId: string;
      oldStatsRegistryId: string;
    };
    issues?: Array<{ field: string; issue: string }>;
    error?: string;
  }> {
    try {
      const oldPackageId = process.env.OLD_GAME_SCORE_CONTRACT_TESTNET || process.env.OLD_GAME_SCORE_CONTRACT;
      const oldRegistryId = process.env.OLD_BADGE_REGISTRY_OBJECT_ID_TESTNET || process.env.OLD_BADGE_REGISTRY_OBJECT_ID;
      const oldAdminCapabilityId = process.env.OLD_ADMIN_CAPABILITY_OBJECT_ID_TESTNET || process.env.OLD_ADMIN_CAPABILITY_OBJECT_ID;
      const oldStatsRegistryId = process.env.OLD_STATISTICS_REGISTRY_OBJECT_ID_TESTNET || process.env.OLD_STATISTICS_REGISTRY_OBJECT_ID;

      const issues: Array<{ field: string; issue: string }> = [];
      const config: any = {};

      // Check if all required variables are set
      const EXPECTED_OLD_PACKAGE = '0x66b58fb2066e41c32152148ad35ad54fe95c2d079a797199f301443725fda34b';
      
      if (!oldPackageId) {
        issues.push({ field: 'OLD_GAME_SCORE_CONTRACT_TESTNET', issue: 'Not set' });
      } else {
        config.oldPackageId = oldPackageId;
        
        // Verify it matches the expected old package for badge operations
        if (oldPackageId !== EXPECTED_OLD_PACKAGE) {
          issues.push({
            field: 'OLD_GAME_SCORE_CONTRACT_TESTNET',
            issue: `Expected ${EXPECTED_OLD_PACKAGE} (actual old package for badges), but got ${oldPackageId}`,
          });
        }
      }

      if (!oldRegistryId) {
        issues.push({ field: 'OLD_BADGE_REGISTRY_OBJECT_ID_TESTNET', issue: 'Not set' });
      } else {
        config.oldRegistryId = oldRegistryId;
      }

      if (!oldAdminCapabilityId) {
        issues.push({ field: 'OLD_ADMIN_CAPABILITY_OBJECT_ID_TESTNET', issue: 'Not set' });
      } else {
        config.oldAdminCapabilityId = oldAdminCapabilityId;
      }

      if (!oldStatsRegistryId) {
        issues.push({ field: 'OLD_STATISTICS_REGISTRY_OBJECT_ID_TESTNET', issue: 'Not set (will use new contract stats registry as fallback)' });
        config.oldStatsRegistryId = 'NOT SET';
      } else {
        config.oldStatsRegistryId = oldStatsRegistryId;
      }

      // If all required are set, verify they're from the correct package
      if (oldPackageId && oldRegistryId && oldAdminCapabilityId) {
        const client = this.getClient();
        const packageId = oldPackageId.split('::')[0];

        try {
          // Verify registry
          const registryObj = await client.getObject({
            id: oldRegistryId,
            options: { showType: true },
          });

          if (registryObj.data?.type) {
            const registryPackage = registryObj.data.type.split('::')[0];
            if (registryPackage !== packageId) {
              issues.push({
                field: 'OLD_BADGE_REGISTRY_OBJECT_ID_TESTNET',
                issue: `Registry is from package ${registryPackage}, but OLD_GAME_SCORE_CONTRACT_TESTNET is ${packageId}`,
              });
            }
          }

          // Verify admin capability
          const adminCapObj = await client.getObject({
            id: oldAdminCapabilityId,
            options: { showType: true },
          });

          if (adminCapObj.data?.type) {
            const adminCapPackage = adminCapObj.data.type.split('::')[0];
            if (adminCapPackage !== packageId) {
              issues.push({
                field: 'OLD_ADMIN_CAPABILITY_OBJECT_ID_TESTNET',
                issue: `AdminCapability is from package ${adminCapPackage}, but OLD_GAME_SCORE_CONTRACT_TESTNET is ${packageId}`,
              });
            }
          }

          // Verify stats registry if set
          if (oldStatsRegistryId) {
            const statsRegObj = await client.getObject({
              id: oldStatsRegistryId,
              options: { showType: true },
            });

            if (statsRegObj.data?.type) {
              const statsRegPackage = statsRegObj.data.type.split('::')[0];
              if (statsRegPackage !== packageId) {
                issues.push({
                  field: 'OLD_STATISTICS_REGISTRY_OBJECT_ID_TESTNET',
                  issue: `StatisticsRegistry is from package ${statsRegPackage}, but OLD_GAME_SCORE_CONTRACT_TESTNET is ${packageId}`,
                });
              }
            }
          }
        } catch (verifyError: any) {
          issues.push({
            field: 'VERIFICATION',
            issue: `Failed to verify objects on blockchain: ${verifyError.message}`,
          });
        }
      }

      if (issues.length > 0) {
        return {
          success: false,
          config: config as any,
          issues,
        };
      }

      return {
        success: true,
        config: config as any,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to verify configuration',
      };
    }
  }

  /**
   * Get package deployment information to determine deployment order
   * Checks package publish date and object creation times
   */
  async getPackageDeploymentInfo(packageId: string): Promise<{
    success: boolean;
    packageId?: string;
    publishDate?: number;
    publishTransaction?: string;
    error?: string;
  }> {
    try {
      const client = this.getClient();
      
      BadgeLogger.debug('Getting deployment info for package', { packageId });
      
      // Get package object to find publish transaction
      const packageObj = await client.getObject({
        id: packageId,
        options: {
          showType: true,
          showOwner: true,
          showPreviousTransaction: true,
        },
      });
      
      if (!packageObj.data) {
        return {
          success: false,
          error: `Package ${packageId} not found`,
        };
      }
      
      // Get the publish transaction
      const publishTx = packageObj.data.previousTransaction;
      
      if (publishTx) {
        // Get transaction details to find timestamp
        const txDetails = await client.getTransactionBlock({
          digest: publishTx,
          options: {
            showEffects: true,
            showEvents: true,
          },
        });
        
        const timestamp = txDetails.timestampMs;
        
        BadgeLogger.debug('Package deployment info', {
          packageId: packageId.substring(0, 10) + '...',
          publishTransaction: publishTx,
          publishDate: timestamp ? new Date(Number(timestamp)).toISOString() : 'unknown',
          timestamp,
        });
        
        return {
          success: true,
          packageId,
          publishDate: timestamp ? Number(timestamp) : undefined,
          publishTransaction: publishTx,
        };
      }
      
      return {
        success: true,
        packageId,
      };
    } catch (error: any) {
      BadgeLogger.error('Error getting package deployment info', error);
      return {
        success: false,
        error: error.message || 'Failed to get package info',
      };
    }
  }

  /**
   * Compare package deployment dates to determine which is older
   */
  async comparePackageAges(packageId1: string, packageId2: string): Promise<{
    success: boolean;
    older?: string;
    newer?: string;
    package1Date?: number;
    package2Date?: number;
    error?: string;
  }> {
    try {
      const info1 = await this.getPackageDeploymentInfo(packageId1);
      const info2 = await this.getPackageDeploymentInfo(packageId2);
      
      if (!info1.success || !info2.success) {
        return {
          success: false,
          error: `Failed to get package info: ${info1.error || info2.error}`,
        };
      }
      
      if (info1.publishDate && info2.publishDate) {
        const older = info1.publishDate < info2.publishDate ? packageId1 : packageId2;
        const newer = info1.publishDate < info2.publishDate ? packageId2 : packageId1;
        
        BadgeLogger.debug('Package comparison', {
          package1: packageId1.substring(0, 10) + '...',
          package1Date: new Date(info1.publishDate).toISOString(),
          package2: packageId2.substring(0, 10) + '...',
          package2Date: new Date(info2.publishDate).toISOString(),
          older: older.substring(0, 10) + '...',
          newer: newer.substring(0, 10) + '...',
        });
        
        return {
          success: true,
          older,
          newer,
          package1Date: info1.publishDate,
          package2Date: info2.publishDate,
        };
      }
      
      return {
        success: false,
        error: 'Could not determine package ages - missing publish dates',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to compare packages',
      };
    }
  }

  /**
   * Verify environment configuration matches expected values
   * Checks that all old contract objects are from the correct package
   */
  async verifyEnvironmentConfig(): Promise<{
    success: boolean;
    config?: {
      oldPackageId: string;
      oldRegistryId: string;
      oldAdminCapabilityId: string;
      oldStatsRegistryId: string;
      registryPackage?: string;
      adminCapPackage?: string;
      statsRegPackage?: string;
      allFromCorrectPackage?: boolean;
    };
    errors?: string[];
    warnings?: string[];
  }> {
    try {
      const oldPackageId = process.env.OLD_GAME_SCORE_CONTRACT_TESTNET || process.env.OLD_GAME_SCORE_CONTRACT;
      const oldRegistryId = process.env.OLD_BADGE_REGISTRY_OBJECT_ID_TESTNET || process.env.OLD_BADGE_REGISTRY_OBJECT_ID;
      const oldAdminCapabilityId = process.env.OLD_ADMIN_CAPABILITY_OBJECT_ID_TESTNET || process.env.OLD_ADMIN_CAPABILITY_OBJECT_ID;
      const oldStatsRegistryId = process.env.OLD_STATISTICS_REGISTRY_OBJECT_ID_TESTNET || process.env.OLD_STATISTICS_REGISTRY_OBJECT_ID;

      const errors: string[] = [];
      const warnings: string[] = [];

      if (!oldPackageId) {
        errors.push('OLD_GAME_SCORE_CONTRACT_TESTNET is not set');
      }
      if (!oldRegistryId) {
        errors.push('OLD_BADGE_REGISTRY_OBJECT_ID_TESTNET is not set');
      }
      if (!oldAdminCapabilityId) {
        errors.push('OLD_ADMIN_CAPABILITY_OBJECT_ID_TESTNET is not set');
      }
      if (!oldStatsRegistryId) {
        warnings.push('OLD_STATISTICS_REGISTRY_OBJECT_ID_TESTNET is not set (will use new contract stats registry)');
      }

      if (errors.length > 0) {
        return {
          success: false,
          errors,
        };
      }

      // At this point, oldPackageId is guaranteed to be defined due to the check above
      const packageId = oldPackageId!.split('::')[0];
      const client = this.getClient();

      // Verify all objects exist and are from the correct package
      // At this point, oldRegistryId and oldAdminCapabilityId are guaranteed to be defined due to checks above
      const registryObj = await client.getObject({
        id: oldRegistryId!,
        options: { showType: true },
      });
      
      const adminCapObj = await client.getObject({
        id: oldAdminCapabilityId!,
        options: { showType: true },
      });
      
      const statsRegObj = oldStatsRegistryId ? await client.getObject({
        id: oldStatsRegistryId,
        options: { showType: true },
      }) : null;

      const registryPackage = registryObj.data?.type?.split('::')[0];
      const adminCapPackage = adminCapObj.data?.type?.split('::')[0];
      const statsRegPackage = statsRegObj?.data?.type?.split('::')[0];

      // Check if all are from the correct package
      const allFromCorrectPackage = 
        registryPackage === packageId &&
        adminCapPackage === packageId &&
        (!statsRegPackage || statsRegPackage === packageId);

      if (registryPackage !== packageId) {
        errors.push(`BadgeRegistry (${oldRegistryId}) is from package ${registryPackage}, but expected ${packageId}`);
      }
      if (adminCapPackage !== packageId) {
        errors.push(`AdminCapability (${oldAdminCapabilityId}) is from package ${adminCapPackage}, but expected ${packageId}`);
      }
      if (statsRegPackage && statsRegPackage !== packageId) {
        errors.push(`StatisticsRegistry (${oldStatsRegistryId}) is from package ${statsRegPackage}, but expected ${packageId}`);
      }

      return {
        success: errors.length === 0,
        config: {
          oldPackageId: packageId,
          oldRegistryId: oldRegistryId!,
          oldAdminCapabilityId: oldAdminCapabilityId!,
          oldStatsRegistryId: oldStatsRegistryId || 'NOT SET',
          registryPackage,
          adminCapPackage,
          statsRegPackage,
          allFromCorrectPackage,
        },
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error: any) {
      return {
        success: false,
        errors: [error.message || 'Failed to verify configuration'],
      };
    }
  }

  /**
   * Inspect old contract to find available functions
   * This helps us discover what admin functions exist on the old contract
   */
  async inspectOldContractFunctions(): Promise<{
    success: boolean;
    functions?: Array<{ 
      name: string; 
      visibility: string; 
      isEntry: boolean;
      parameters?: any[];
      returnTypes?: any[];
    }>;
    error?: string;
  }> {
    try {
      const oldPackageId = process.env.OLD_GAME_SCORE_CONTRACT_TESTNET || process.env.OLD_GAME_SCORE_CONTRACT;
      
      if (!oldPackageId) {
        return {
          success: false,
          error: 'Old contract package ID not configured',
        };
      }

      const client = this.getClient();
      const packageId = oldPackageId.split('::')[0]; // Extract package ID if full path provided

      BadgeLogger.debug('Inspecting old contract package', { packageId });
      
      // Get package information
      const packageInfo = await client.getNormalizedMoveModule({
        package: packageId,
        module: 'badge_system',
      });

      BadgeLogger.debug('Package info retrieved', { packageId, packageInfo });

      // Extract functions with their signatures
      const functions: Array<{ 
        name: string; 
        visibility: string; 
        isEntry: boolean;
        parameters?: any[];
        returnTypes?: any[];
      }> = [];
      
      // Check exposed functions (public entry functions)
      if (packageInfo.exposedFunctions) {
        for (const [funcName, funcInfo] of Object.entries(packageInfo.exposedFunctions)) {
          functions.push({
            name: funcName,
            visibility: funcInfo.visibility || 'unknown',
            isEntry: funcInfo.isEntry || false,
            parameters: funcInfo.parameters || [],
            returnTypes: funcInfo.return || [],
          });
        }
      }

      // Note: packageInfo.functions doesn't exist in SuiMoveNormalizedModule type
      // We only have access to exposedFunctions via the normalized module API

      BadgeLogger.debug('Found functions in old contract', {
        packageId,
        functionCount: functions.length,
        functions: functions.map(f => ({
          name: f.name,
          visibility: f.visibility,
          isEntry: f.isEntry,
          parameters: f.parameters?.map((p: any) => p.type || 'unknown') || [],
        })),
      });

      // Filter for admin-related functions
      const adminFunctions = functions.filter(f => 
        f.name.toLowerCase().includes('admin') || 
        f.name.toLowerCase().includes('mint')
      );
      
      if (adminFunctions.length > 0) {
        BadgeLogger.debug('Admin/Mint-related functions found', {
          packageId,
          adminFunctions: adminFunctions.map(f => ({
            name: f.name,
            parameters: f.parameters?.map((p: any) => p.type || 'unknown') || [],
          })),
        });
      }

      return {
        success: true,
        functions,
      };
    } catch (error: any) {
      BadgeLogger.error('Error inspecting old contract', error);
      return {
        success: false,
        error: error.message || 'Failed to inspect contract',
      };
    }
  }

  /**
   * Admin mint badge on OLD contract
   * Uses admin_mint_badge function - admin signs and executes directly
   * Badge is created in admin's wallet (for testing)
   * 
   * @param playerAddress - Player's wallet address (metadata owner)
   * @param tier - Desired tier (0-5)
   * @returns Transaction digest
   */
  async adminMintBadgeOldContract(
    playerAddress: string,
    tier: number
  ): Promise<{
    success: boolean;
    digest?: string; // Transaction digest (executed by admin)
    error?: string;
    note?: string;
  }> {
    try {
      // Get old contract IDs from environment
      const oldPackageId = process.env.OLD_GAME_SCORE_CONTRACT_TESTNET || process.env.OLD_GAME_SCORE_CONTRACT;
      const oldRegistryId = process.env.OLD_BADGE_REGISTRY_OBJECT_ID_TESTNET || process.env.OLD_BADGE_REGISTRY_OBJECT_ID;
      const oldStatsRegistryId = process.env.OLD_STATISTICS_REGISTRY_OBJECT_ID_TESTNET || process.env.OLD_STATISTICS_REGISTRY_OBJECT_ID;
      
      // Debug: Log what we're reading from environment
      BadgeLogger.debug('Environment variable debug for old contract', {
        OLD_GAME_SCORE_CONTRACT_TESTNET: process.env.OLD_GAME_SCORE_CONTRACT_TESTNET || 'NOT SET',
        OLD_GAME_SCORE_CONTRACT: process.env.OLD_GAME_SCORE_CONTRACT || 'NOT SET',
        resolvedOldPackageId: oldPackageId || 'NOT SET',
        OLD_BADGE_REGISTRY_OBJECT_ID_TESTNET: process.env.OLD_BADGE_REGISTRY_OBJECT_ID_TESTNET || 'NOT SET',
        OLD_ADMIN_CAPABILITY_OBJECT_ID_TESTNET: process.env.OLD_ADMIN_CAPABILITY_OBJECT_ID_TESTNET || 'NOT SET',
        OLD_STATISTICS_REGISTRY_OBJECT_ID_TESTNET: process.env.OLD_STATISTICS_REGISTRY_OBJECT_ID_TESTNET || 'NOT SET',
        NODE_ENV: process.env.NODE_ENV || 'NOT SET',
      });

      if (!oldPackageId || !oldRegistryId) {
        return {
          success: false,
          error: 'Old contract IDs not configured. Please set OLD_GAME_SCORE_CONTRACT_TESTNET and OLD_BADGE_REGISTRY_OBJECT_ID_TESTNET in environment variables.',
        };
      }

      if (!oldStatsRegistryId) {
        BadgeLogger.warn('OLD_STATISTICS_REGISTRY_OBJECT_ID not configured. Using new contract stats registry as fallback.');
      }

      // Get old admin capability
      const oldAdminCapabilityId = process.env.OLD_ADMIN_CAPABILITY_OBJECT_ID_TESTNET || process.env.OLD_ADMIN_CAPABILITY_OBJECT_ID;
      
      if (!oldAdminCapabilityId) {
        return {
          success: false,
          error: 'Old admin capability not configured. Please set OLD_ADMIN_CAPABILITY_OBJECT_ID_TESTNET in environment variables.',
        };
      }

      BadgeLogger.info('Building badge mint transaction for OLD contract', {
        playerAddress,
        tier,
        oldPackageId: oldPackageId.substring(0, 10) + '...',
        oldRegistryId: oldRegistryId.substring(0, 10) + '...',
        oldAdminCapabilityId: oldAdminCapabilityId.substring(0, 10) + '...',
      });

      // Get badge image URL based on tier
      const imageUrl = this.getBadgeImageUrl(tier);
      BadgeLogger.debug('Badge image URL', { tier, imageUrl });

      // Extract package ID - use the exact package ID from environment variable
      // (Should be 0x66b58fb2... for badge operations)
      let packageId = oldPackageId;
      if (packageId.includes('::')) {
        packageId = packageId.split('::')[0];
      }
      
      BadgeLogger.debug('Using package ID for old contract', {
        packageId,
        note: 'All types (AdminCapability, BadgeRegistry, StatisticsRegistry) must be from this package',
      });

      // Use old stats registry if configured, otherwise use new one as fallback
      const statsRegistryToUse = oldStatsRegistryId || this.config.contracts.statisticsRegistry;
      
      if (!statsRegistryToUse) {
        return {
          success: false,
          error: 'Statistics registry not configured. Please set OLD_STATISTICS_REGISTRY_OBJECT_ID_TESTNET or ensure new contract statistics registry is configured.',
        };
      }

      BadgeLogger.debug('Using stats registry', {
        statsRegistryId: statsRegistryToUse.substring(0, 10) + '...',
        isOldContract: !!oldStatsRegistryId,
      });

      // Verify all old contract objects are configured and accessible
      const oldObjects = {
        packageId: oldPackageId,
        registryId: oldRegistryId,
        statsRegistryId: oldStatsRegistryId || 'NOT SET (using new contract)',
        adminCapabilityId: oldAdminCapabilityId,
      };
      
      BadgeLogger.debug('Old contract configuration', {
        packageId: oldObjects.packageId ? `${oldObjects.packageId.substring(0, 10)}...` : 'NOT SET',
        registryId: oldObjects.registryId ? `${oldObjects.registryId.substring(0, 10)}...` : 'NOT SET',
        statsRegistryId: typeof oldObjects.statsRegistryId === 'string' && oldObjects.statsRegistryId.startsWith('0x') 
          ? `${oldObjects.statsRegistryId.substring(0, 10)}...` 
          : oldObjects.statsRegistryId,
        adminCapabilityId: oldObjects.adminCapabilityId ? `${oldObjects.adminCapabilityId.substring(0, 10)}...` : 'NOT SET',
      });

      const client = this.getClient();
      const keypair = this.adminWallet.getKeypair();

      // Verify all objects are from the correct package
      // The old contract expects all types from the package specified in OLD_GAME_SCORE_CONTRACT_TESTNET
      BadgeLogger.debug('Verifying all objects are from correct package');
      try {
        const registryObj = await client.getObject({
          id: oldRegistryId,
          options: { showType: true, showOwner: true },
        });
        
        const adminCapObj = await client.getObject({
          id: oldAdminCapabilityId,
          options: { showType: true },
        });
        
        const statsRegObj = await client.getObject({
          id: statsRegistryToUse,
          options: { showType: true },
        });
        
        BadgeLogger.debug('Object types retrieved', {
          registryType: registryObj.data?.type,
          adminCapType: adminCapObj.data?.type,
          statsRegType: statsRegObj.data?.type,
          expectedPackage: packageId,
        });
        
        // Check if registry object exists
        if (!registryObj.data) {
          // Check if the ID is actually a package ID (common mistake)
          if (oldRegistryId === packageId || oldRegistryId === oldPackageId) {
            return {
              success: false,
              error: `Invalid registry ID: OLD_BADGE_REGISTRY_OBJECT_ID_TESTNET is set to a package ID (${oldRegistryId}), not a registry object ID. Please set it to the actual BadgeRegistry object ID from package ${packageId}.`,
            };
          }
          return {
            success: false,
            error: `Old registry object ${oldRegistryId} does not exist`,
          };
        }
        
        // Check if registry type is valid (not 'package')
        if (!registryObj.data.type || registryObj.data.type === 'package' || !registryObj.data.type.includes('BadgeRegistry')) {
          BadgeLogger.error('Invalid registry object', {
            registryId: oldRegistryId,
            registryType: registryObj.data?.type || 'undefined',
            note: 'This appears to be a package ID, not a BadgeRegistry object ID',
          });
          
          return {
            success: false,
            error: `Invalid registry object: OLD_BADGE_REGISTRY_OBJECT_ID_TESTNET (${oldRegistryId}) is not a BadgeRegistry object. It appears to be a package ID or wrong object type. Please set it to the actual BadgeRegistry object ID from package ${packageId}. You need to find the BadgeRegistry object that was created when the old contract was initialized.`,
          };
        }
        
        // Check if registry type matches expected package
        if (registryObj.data.type && !registryObj.data.type.includes(packageId)) {
          const registryPackage = registryObj.data.type.split('::')[0];
          BadgeLogger.error('Package mismatch for registry', {
            registryPackage,
            expectedPackage: packageId,
            registryType: registryObj.data.type,
            registryId: oldRegistryId.substring(0, 10) + '...',
            solution: `Update OLD_GAME_SCORE_CONTRACT_TESTNET in .env to: ${registryPackage}`,
          });
          
          return {
            success: false,
            error: `Package mismatch: The badge registry (${oldRegistryId.substring(0, 10)}...) is from package ${registryPackage}, but OLD_GAME_SCORE_CONTRACT_TESTNET is set to ${packageId}. Please update OLD_GAME_SCORE_CONTRACT_TESTNET in your .env file to ${registryPackage} to match the registry's package.`,
          };
        }
        
        // Check if AdminCapability is from the correct package
        if (adminCapObj.data?.type && !adminCapObj.data.type.includes(packageId)) {
          const adminCapPackage = adminCapObj.data.type.split('::')[0];
          const registryPackage = registryObj.data.type.split('::')[0];
          
          BadgeLogger.error('Admin capability package mismatch', {
            adminCapPackage,
            registryPackage,
            expectedPackage: packageId,
            adminCapType: adminCapObj.data.type,
          });
          
          // If registry package is different from packageId, suggest updating packageId
          if (registryPackage !== packageId) {
            BadgeLogger.error('Solution for package mismatch', {
              solution: `Update OLD_GAME_SCORE_CONTRACT_TESTNET to ${registryPackage}`,
              note: 'Then find AdminCapability and StatisticsRegistry from package ' + registryPackage,
            });
            return {
              success: false,
              error: `Package mismatch: The badge registry is from package ${registryPackage}, but OLD_GAME_SCORE_CONTRACT_TESTNET is set to ${packageId}. The admin capability is from ${adminCapPackage}. Please update OLD_GAME_SCORE_CONTRACT_TESTNET to ${registryPackage} and ensure all objects (registry, admin capability, stats registry) are from package ${registryPackage}.`,
            };
          }
          
          return {
            success: false,
            error: `Package mismatch: The old admin capability (${oldAdminCapabilityId.substring(0, 10)}...) is from package ${adminCapPackage}, but the registry is from package ${registryPackage}. All objects must be from the same package. Please update OLD_ADMIN_CAPABILITY_OBJECT_ID_TESTNET to point to an AdminCapability from package ${registryPackage}.`,
          };
        }
        
        // Check if StatisticsRegistry is from the correct package
        if (statsRegObj.data?.type && !statsRegObj.data.type.includes(packageId)) {
          const statsRegPackage = statsRegObj.data.type.split('::')[0];
          const registryPackage = registryObj.data.type.split('::')[0];
          
          BadgeLogger.error('Statistics registry package mismatch', {
            statsRegPackage,
            registryPackage,
            expectedPackage: packageId,
            statsRegType: statsRegObj.data.type,
          });
          
          // If registry package is different from packageId, suggest updating packageId
          if (registryPackage !== packageId) {
            BadgeLogger.error('Solution for package mismatch', {
              solution: `Update OLD_GAME_SCORE_CONTRACT_TESTNET to ${registryPackage}`,
              note: 'Then find StatisticsRegistry from package ' + registryPackage,
            });
            return {
              success: false,
              error: `Package mismatch: The badge registry is from package ${registryPackage}, but OLD_GAME_SCORE_CONTRACT_TESTNET is set to ${packageId}. The statistics registry is from ${statsRegPackage}. Please update OLD_GAME_SCORE_CONTRACT_TESTNET to ${registryPackage} and ensure all objects (registry, admin capability, stats registry) are from package ${registryPackage}.`,
            };
          }
          
          return {
            success: false,
            error: `Package mismatch: The old statistics registry (${statsRegistryToUse.substring(0, 10)}...) is from package ${statsRegPackage}, but the registry is from package ${registryPackage}. All objects must be from the same package. Please update OLD_STATISTICS_REGISTRY_OBJECT_ID_TESTNET to point to a StatisticsRegistry from package ${registryPackage}.`,
          };
        }
        
        // Check if it's a shared object
        if (!registryObj.data.owner || typeof registryObj.data.owner !== 'object' || !('Shared' in registryObj.data.owner)) {
          BadgeLogger.warn('Old registry may not be a shared object', {
            owner: registryObj.data.owner,
          });
        }
      } catch (objError: any) {
        BadgeLogger.error('Failed to verify objects', objError);
        return {
          success: false,
          error: `Failed to verify objects: ${objError.message}`,
        };
      }

      // Based on inspection, admin_mint_badge exists with this signature:
      // admin_mint_badge(
      //   admin_cap: &AdminCapability,
      //   registry: &mut BadgeRegistry,
      //   stats_registry: &StatisticsRegistry,
      //   clock: &Clock,
      //   player: address,
      //   tier: u8,
      //   image_url: String,
      //   ctx: &mut TxContext
      // )
      // All types must be from the package specified in OLD_GAME_SCORE_CONTRACT_TESTNET
      
      // Build the transaction directly (function exists, signature matches)
      BadgeLogger.debug('Building transaction with admin_mint_badge', {
        packageId,
        note: 'Function signature verified from inspection',
      });
      
      const txb = new Transaction();
      txb.moveCall({
        target: `${packageId}::badge_system::admin_mint_badge`,
        arguments: [
          txb.object(oldAdminCapabilityId),        // admin_cap: &AdminCapability (arg 0)
          txb.object(oldRegistryId),              // registry: &mut BadgeRegistry (arg 1)
          txb.object(statsRegistryToUse),         // stats_registry: &StatisticsRegistry (arg 2)
          txb.object('0x6'),                      // clock: &Clock (arg 3)
          txb.pure.address(playerAddress),         // player: address (arg 4)
          txb.pure.u8(tier),                      // tier: u8 (arg 5)
          txb.pure.string(imageUrl),              // image_url: String (arg 6)
        ],
      });

      txb.setGasBudget(this.config.sui.gasBudget);
      
      // Sign and execute with admin wallet (no player signature needed)
      BadgeLogger.info('Signing and executing transaction with admin wallet', {
        playerAddress,
        tier,
        packageId,
      });
      
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
        BadgeLogger.info('Badge minted successfully on old contract', {
          playerAddress,
          tier,
          digest: result.digest,
        });
        return {
          success: true,
          digest: result.digest,
          note: `Badge minted at tier ${tier} in admin wallet on old contract. Badge metadata owner: ${playerAddress}`,
        };
      } else {
        const errorMsg = result.effects?.status?.error || 'Transaction failed';
        BadgeLogger.error('Transaction failed', {
          playerAddress,
          tier,
          error: errorMsg,
        });
        return {
          success: false,
          error: errorMsg,
        };
      }
    } catch (error) {
      BadgeLogger.error('Error building transaction', { error, playerAddress, tier });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Admin function: Clean up orphaned registry entry on OLD contract
   * Removes registry entry if badge object doesn't exist
   * @param playerAddress - Player address to clean up
   * @returns Transaction result
   */
  async adminCleanupOrphanedEntryOldContract(
    playerAddress: string
  ): Promise<{
    success: boolean;
    digest?: string;
    error?: string;
  }> {
    // Get old contract IDs from environment
    const oldPackageId = process.env.OLD_GAME_SCORE_CONTRACT_TESTNET || process.env.OLD_GAME_SCORE_CONTRACT;
    const oldRegistryId = process.env.OLD_BADGE_REGISTRY_OBJECT_ID_TESTNET || process.env.OLD_BADGE_REGISTRY_OBJECT_ID;
    const oldAdminCapabilityId = process.env.OLD_ADMIN_CAPABILITY_OBJECT_ID_TESTNET || process.env.OLD_ADMIN_CAPABILITY_OBJECT_ID;

    if (!oldPackageId || !oldRegistryId) {
      return {
        success: false,
        error: 'Old contract IDs not configured. Please set OLD_GAME_SCORE_CONTRACT_TESTNET and OLD_BADGE_REGISTRY_OBJECT_ID_TESTNET in environment variables.',
      };
    }

    if (!oldAdminCapabilityId) {
      return {
        success: false,
        error: 'Old admin capability not configured. Please set OLD_ADMIN_CAPABILITY_OBJECT_ID_TESTNET in environment variables.',
      };
    }

    try {
      const client = this.getClient();
      const packageId = oldPackageId.split('::')[0]; // Extract package ID if full path provided

      // Build transaction
      const txb = new Transaction();

      txb.moveCall({
        target: `${packageId}::badge_system::admin_cleanup_orphaned_entry`,
        arguments: [
          txb.object(oldAdminCapabilityId),  // Admin capability
          txb.object(oldRegistryId),         // Badge registry
          txb.pure.address(playerAddress),   // Player address
        ],
      });

      txb.setGasBudget(this.config.sui.gasBudget);

      BadgeLogger.info('Cleaning up orphaned registry entry on old contract', { playerAddress });

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
        BadgeLogger.info('Orphaned entry cleaned up successfully on old contract', {
          playerAddress,
          digest: result.digest,
        });
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
      BadgeLogger.error('Error cleaning up orphaned entry on old contract', { error, playerAddress });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Admin function: Burn (delete) a badge on OLD contract (for testing)
   * @param badgeId - Badge object ID to burn
   * @returns Transaction result
   */
  async adminBurnBadgeOldContract(
    badgeId: string
  ): Promise<{
    success: boolean;
    digest?: string;
    error?: string;
  }> {
    // Get old contract IDs from environment
    const oldPackageId = process.env.OLD_GAME_SCORE_CONTRACT_TESTNET || process.env.OLD_GAME_SCORE_CONTRACT;
    const oldRegistryId = process.env.OLD_BADGE_REGISTRY_OBJECT_ID_TESTNET || process.env.OLD_BADGE_REGISTRY_OBJECT_ID;
    const oldAdminCapabilityId = process.env.OLD_ADMIN_CAPABILITY_OBJECT_ID_TESTNET || process.env.OLD_ADMIN_CAPABILITY_OBJECT_ID;

    if (!oldPackageId || !oldRegistryId) {
      return {
        success: false,
        error: 'Old contract IDs not configured. Please set OLD_GAME_SCORE_CONTRACT_TESTNET and OLD_BADGE_REGISTRY_OBJECT_ID_TESTNET in environment variables.',
      };
    }

    if (!oldAdminCapabilityId) {
      return {
        success: false,
        error: 'Old admin capability not configured. Please set OLD_ADMIN_CAPABILITY_OBJECT_ID_TESTNET in environment variables.',
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
      const packageId = oldPackageId.split('::')[0]; // Extract package ID if full path provided
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

        // Check if it's actually a badge (old contract might have different type name)
        const badgeType = badgeObject.data.type;
        if (!badgeType || (!badgeType.includes('badge_system::EarlySupporterBadge') && !badgeType.includes('badge'))) {
          return {
            success: false,
            error: `Object ${badgeId} may not be a badge. Expected type containing 'badge', got: ${badgeType || 'unknown'}`,
          };
        }

        // Check ownership - badge must be owned by admin wallet
        const owner = badgeObject.data.owner;
        BadgeLogger.debug('Checking badge ownership on old contract', {
          badgeId,
          owner: JSON.stringify(owner),
          adminAddress,
        });
        
        if (owner && typeof owner === 'object' && 'AddressOwner' in owner) {
          const ownerAddress = owner.AddressOwner.toLowerCase();
          const adminAddressLower = adminAddress.toLowerCase();
          
          BadgeLogger.debug('Badge ownership check on old contract', {
            ownerAddress,
            adminAddress: adminAddressLower,
            match: ownerAddress === adminAddressLower,
          });
          
          if (ownerAddress !== adminAddressLower) {
            // Try to get the badge's metadata owner (the player it was minted for)
            let metadataOwner = 'unknown';
            try {
              const badgeContent = badgeObject.data.content;
              if (badgeContent && 'fields' in badgeContent && badgeContent.fields && 'owner' in badgeContent.fields) {
                metadataOwner = String(badgeContent.fields.owner);
              }
            } catch (e) {
              // Ignore errors getting metadata
            }
            
            return {
              success: false,
              error: `Badge is not owned by admin wallet. Object owner: ${ownerAddress}, Admin wallet: ${adminAddress}. Badge metadata owner (player): ${metadataOwner}. Badges are soulbound and cannot be transferred. To burn a badge, it must be in the admin wallet.`,
            };
          }
        } else {
          BadgeLogger.warn('Badge ownership format unexpected on old contract', { owner, badgeId });
          return {
            success: false,
            error: `Badge ownership is not an address owner. Owner type: ${typeof owner}, Value: ${JSON.stringify(owner)}. Badges must be owned by the admin wallet to be burned.`,
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
          txb.object(oldAdminCapabilityId),  // Admin capability
          txb.object(oldRegistryId),         // Badge registry
          txb.object(badgeId),               // Badge to burn (must be in admin wallet)
        ],
      });

      txb.setGasBudget(this.config.sui.gasBudget);

      BadgeLogger.info('Burning badge on old contract', { badgeId });

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
        BadgeLogger.info('Badge burned successfully on old contract', {
          badgeId,
          digest: result.digest,
        });
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
      BadgeLogger.error('Error burning badge on old contract', { error, badgeId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update badge image URL for wallet display
   * Updates the badge's image field with a URL pointing to the static image file
   * @param playerAddress - Player's wallet address
   * @param imageUrl - URL to the badge image (optional, will construct from tier if not provided)
   * @returns Success status
   */
  async updateBadgeImageUrl(
    playerAddress: string,
    imageUrl?: string
  ): Promise<{ success: boolean; error?: string }> {
    let badgeId: string | undefined;
    try {
      const client = this.getClient();
      const packageId = this.config.contracts.gameScore;
      const keypair = this.adminWallet.getKeypair();

      // Get badge to verify it exists and get badge ID and tier
      const badge = await this.getBadge(playerAddress);
      if (!badge || !badge.badgeId) {
        return {
          success: false,
          error: 'Player does not have a badge',
        };
      }
      badgeId = badge.badgeId;

      // Construct image URL if not provided
      // Use the static file URL based on tier
      const url = imageUrl || this.getBadgeImageUrl(badge.tier);

      BadgeLogger.info('Updating badge image URL', {
        playerAddress,
        badgeId,
        imageUrl: url,
      });

      const txb = new Transaction();

      // Get the badge object
      const badgeObj = txb.object(badgeId);

      txb.moveCall({
        target: `${packageId}::badge_system::update_badge_image_url`,
        arguments: [
          badgeObj,
          txb.object('0x6'), // Clock
          txb.pure.string(url),
        ],
      });

      txb.setGasBudget(this.config.sui.gasBudget);

      const result = await client.signAndExecuteTransaction({
        signer: keypair,
        transaction: txb,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      if (result.effects?.status?.status === 'success') {
        BadgeLogger.info('Successfully updated badge image URL', {
          playerAddress,
          badgeId,
          imageUrl: url,
          digest: result.digest,
        });
        return { success: true };
      } else {
        const errorMsg = result.effects?.status?.error || 'Unknown error';
        BadgeLogger.error('Failed to update badge image URL', {
          playerAddress,
          badgeId,
          error: errorMsg,
        });
        return {
          success: false,
          error: errorMsg,
        };
      }
    } catch (error) {
      BadgeLogger.error('Error updating badge image URL', { error, playerAddress, badgeId: badgeId || 'unknown' });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
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

