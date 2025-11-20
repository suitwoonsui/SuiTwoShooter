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

    console.log(`🔍 [BADGE LOOKUP] Checking if player has badge. Address: ${playerAddress}`);
    console.log(`🔍 [BADGE LOOKUP] BadgeRegistry ID: ${this.config.contracts.badgeRegistry}`);
    console.log(`🔍 [BADGE LOOKUP] Package ID: ${this.config.contracts.gameScore}`);

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

      console.log(`🔍 [BADGE LOOKUP] Calling has_badge with sender: ${this.adminWallet.getAddress()}`);

      const result = await client.devInspectTransactionBlock({
        transactionBlock: tx,
        sender: this.adminWallet.getAddress(),
      });

      console.log(`🔍 [BADGE LOOKUP] devInspect completed`);
      console.log(`🔍 [BADGE LOOKUP] Full result structure:`, JSON.stringify({
        hasResults: !!result.results,
        resultsLength: result.results?.length || 0,
        results: result.results?.map((r, idx) => ({
          index: idx,
          returnValues: r.returnValues?.length || 0,
          returnValuesDetails: r.returnValues?.map((rv, rvIdx) => ({
            index: rvIdx,
            type: rv[0],
            value: rv[1],
            valueType: typeof rv[1],
          })) || [],
          mutableReferenceOutputs: r.mutableReferenceOutputs?.length || 0,
        })) || [],
      }, null, 2));

      if (result.results && result.results.length > 0) {
        console.log(`🔍 [BADGE LOOKUP] Found ${result.results.length} result(s)`);
        const firstResult = result.results[0];
        console.log(`🔍 [BADGE LOOKUP] First result details:`);
        console.log(`   - returnValues length: ${firstResult.returnValues?.length || 0}`);
        console.log(`   - mutableReferenceOutputs length: ${firstResult.mutableReferenceOutputs?.length || 0}`);
        console.log(`   - returnValuesMut length: ${firstResult.returnValuesMut?.length || 0}`);
        
        const returnValue = firstResult.returnValues?.[0];
        if (returnValue) {
          console.log(`🔍 [BADGE LOOKUP] Found return value:`);
          console.log(`   - Type: ${returnValue[0]}`);
          console.log(`   - Value: ${returnValue[1]}`);
          console.log(`   - Value type: ${typeof returnValue[1]}`);
          console.log(`   - Value as string: "${String(returnValue[1])}"`);
          console.log(`   - Value as number: ${Number(returnValue[1])}`);
          
          // Parse return value (boolean as u8: 0 = false, 1 = true)
          // returnValue[1] is a string, so we check for string '1' or convert to number
          const value = returnValue[1];
          const stringCheck = String(value) === '1';
          const numberCheck = Number(value) === 1;
          const hasBadge = stringCheck || numberCheck;
          
          console.log(`🔍 [BADGE LOOKUP] Parsing logic:`);
          console.log(`   - String(value) === '1': ${stringCheck}`);
          console.log(`   - Number(value) === 1: ${numberCheck}`);
          console.log(`   - Combined: ${hasBadge}`);
          console.log(`   - Boolean conversion: ${Boolean(hasBadge)}`);
          console.log(`🔍 [BADGE LOOKUP] Final result: ${Boolean(hasBadge)}`);
          
          return Boolean(hasBadge);
        } else {
          console.log(`🔍 [BADGE LOOKUP] No return value in first result`);
          console.log(`🔍 [BADGE LOOKUP] returnValues array:`, firstResult.returnValues);
          console.log(`🔍 [BADGE LOOKUP] returnValues[0]:`, firstResult.returnValues?.[0]);
        }
      } else {
        console.log(`🔍 [BADGE LOOKUP] No results returned from devInspect`);
        console.log(`🔍 [BADGE LOOKUP] result.results:`, result.results);
      }

      console.log(`🔍 [BADGE LOOKUP] No badge found - returning false`);
      return false;
    } catch (error) {
      console.error('❌ [BADGE LOOKUP] Error checking if player has badge:', error);
      console.error('❌ [BADGE LOOKUP] Error details:', error instanceof Error ? error.message : String(error));
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

    console.log(`🔍 [BADGE LOOKUP] Getting badge data for: ${playerAddress}`);

    try {
      // First check if player has badge
      const hasBadge = await this.hasBadge(playerAddress);
      console.log(`🔍 [BADGE LOOKUP] hasBadge result: ${hasBadge}`);
      if (!hasBadge) {
        console.log(`🔍 [BADGE LOOKUP] Player does not have badge, returning null`);
        return null;
      }

      const client = this.getClient();
      
      // Get badge ID from registry
      console.log(`🔍 [BADGE LOOKUP] Calling get_badge_id...`);
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

      console.log(`🔍 [BADGE LOOKUP] get_badge_id devInspect completed`);
      console.log(`🔍 [BADGE LOOKUP] Full get_badge_id result:`, JSON.stringify({
        hasResults: !!result1.results,
        resultsLength: result1.results?.length || 0,
        results: result1.results?.map((r, idx) => ({
          index: idx,
          returnValues: r.returnValues?.length || 0,
          returnValuesDetails: r.returnValues?.map((rv, rvIdx) => ({
            index: rvIdx,
            type: rv[0],
            value: rv[1],
            valueType: typeof rv[1],
          })) || [],
        })) || [],
      }, null, 2));

      if (!result1.results || !result1.results[0].returnValues?.[0]) {
        console.log(`🔍 [BADGE LOOKUP] No badge ID returned from get_badge_id`);
        console.log(`🔍 [BADGE LOOKUP] result1.results:`, result1.results);
        console.log(`🔍 [BADGE LOOKUP] result1.results[0]:`, result1.results?.[0]);
        console.log(`🔍 [BADGE LOOKUP] result1.results[0].returnValues:`, result1.results?.[0]?.returnValues);
        console.log(`🔍 [BADGE LOOKUP] result1.results[0].returnValues[0]:`, result1.results?.[0]?.returnValues?.[0]);
        return null;
      }

      const badgeId = result1.results[0].returnValues[0][1] as string;
      console.log(`🔍 [BADGE LOOKUP] Badge ID extracted: ${badgeId}`);
      console.log(`🔍 [BADGE LOOKUP] Badge ID type: ${typeof badgeId}`);
      console.log(`🔍 [BADGE LOOKUP] Badge ID length: ${badgeId?.length || 0}`);

      // Get badge data
      console.log(`🔍 [BADGE LOOKUP] Calling get_badge_data for badge ID: ${badgeId}...`);
      const tx2 = new Transaction();
      tx2.moveCall({
        target: `${this.config.contracts.gameScore}::badge_system::get_badge_data`,
        arguments: [tx2.object(badgeId)],
      });

      const result2 = await client.devInspectTransactionBlock({
        transactionBlock: tx2,
        sender: this.adminWallet.getAddress(),
      });

      console.log(`🔍 [BADGE LOOKUP] get_badge_data devInspect completed`);
      console.log(`🔍 [BADGE LOOKUP] Full get_badge_data result:`, JSON.stringify({
        hasResults: !!result2.results,
        resultsLength: result2.results?.length || 0,
        results: result2.results?.map((r, idx) => ({
          index: idx,
          returnValues: r.returnValues?.length || 0,
          returnValuesDetails: r.returnValues?.map((rv, rvIdx) => ({
            index: rvIdx,
            type: rv[0],
            value: rv[1],
            valueType: typeof rv[1],
          })) || [],
        })) || [],
      }, null, 2));

      if (!result2.results || !result2.results[0].returnValues) {
        console.log(`🔍 [BADGE LOOKUP] No badge data returned from get_badge_data`);
        console.log(`🔍 [BADGE LOOKUP] result2.results:`, result2.results);
        console.log(`🔍 [BADGE LOOKUP] result2.results[0]:`, result2.results?.[0]);
        console.log(`🔍 [BADGE LOOKUP] result2.results[0].returnValues:`, result2.results?.[0]?.returnValues);
        return null;
      }

      const returnValues = result2.results[0].returnValues;
      console.log(`🔍 [BADGE LOOKUP] Parsing badge data from returnValues:`);
      console.log(`   - returnValues length: ${returnValues.length}`);
      console.log(`   - returnValues[0]:`, returnValues[0]);
      console.log(`   - returnValues[1]:`, returnValues[1], `(tier)`);
      console.log(`   - returnValues[2]:`, returnValues[2], `(gamesPlayed)`);
      console.log(`   - returnValues[3]:`, returnValues[3], `(mintDate)`);
      console.log(`   - returnValues[4]:`, returnValues[4], `(lastUpdated)`);
      
      const badgeData = {
        badgeId,
        tier: Number(returnValues[1][1]),
        gamesPlayed: Number(returnValues[2][1]),
        mintDate: Number(returnValues[3][1]),
        lastUpdated: Number(returnValues[4][1]),
      };
      
      console.log(`🔍 [BADGE LOOKUP] Parsed badge data:`, JSON.stringify(badgeData, null, 2));
      console.log(`🔍 [BADGE LOOKUP] Badge data validation:`);
      console.log(`   - badgeId valid: ${!!badgeData.badgeId && badgeData.badgeId.length === 66}`);
      console.log(`   - tier valid: ${badgeData.tier >= 0 && badgeData.tier <= 5}`);
      console.log(`   - gamesPlayed: ${badgeData.gamesPlayed}`);
      console.log(`   - mintDate: ${badgeData.mintDate} (${new Date(badgeData.mintDate).toISOString()})`);
      console.log(`   - lastUpdated: ${badgeData.lastUpdated} (${new Date(badgeData.lastUpdated).toISOString()})`);
      
      return badgeData;
    } catch (error) {
      console.error('❌ [BADGE LOOKUP] Error getting badge data:', error);
      console.error('❌ [BADGE LOOKUP] Error details:', error instanceof Error ? error.message : String(error));
      if (error instanceof Error && error.stack) {
        console.error('❌ [BADGE LOOKUP] Stack trace:', error.stack);
      }
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
    console.log(`\n🎯 [ADMIN MINT] ========== STARTING ADMIN MINT BADGE ==========`);
    console.log(`🎯 [ADMIN MINT] Parameters:`);
    console.log(`   - playerAddress: ${playerAddress}`);
    console.log(`   - tier: ${tier}`);
    console.log(`   - timestamp: ${new Date().toISOString()}`);

    // Step 1: Validate BadgeRegistry configuration
    console.log(`\n📋 [ADMIN MINT] Step 1: Validating BadgeRegistry configuration...`);
    if (!this.config.contracts.badgeRegistry || this.config.contracts.badgeRegistry.trim() === '') {
      console.error(`❌ [ADMIN MINT] BadgeRegistry not configured`);
      return {
        success: false,
        error: 'BadgeRegistry object ID not configured. Please set BADGE_REGISTRY_OBJECT_ID_TESTNET (or BADGE_REGISTRY_OBJECT_ID) environment variable in Vercel.',
      };
    }
    console.log(`✅ [ADMIN MINT] BadgeRegistry configured: ${this.config.contracts.badgeRegistry}`);

    // Step 2: Validate tier
    console.log(`\n📋 [ADMIN MINT] Step 2: Validating tier...`);
    if (tier < 0 || tier > 5) {
      console.error(`❌ [ADMIN MINT] Invalid tier: ${tier} (must be 0-5)`);
      return {
        success: false,
        error: 'Invalid tier. Must be 0-5',
      };
    }
    console.log(`✅ [ADMIN MINT] Tier valid: ${tier}`);

    try {
      // Step 3: Get client and configuration
      console.log(`\n📋 [ADMIN MINT] Step 3: Getting Sui client and configuration...`);
      const client = this.getClient();
      const registryObjectId = this.config.contracts.badgeRegistry;
      const statsRegistryObjectId = this.config.contracts.statisticsRegistry;
      const adminCapabilityObjectId = this.config.contracts.adminCapability;
      const packageId = this.config.contracts.gameScore;
      
      console.log(`📋 [ADMIN MINT] Configuration values:`);
      console.log(`   - registryObjectId: ${registryObjectId}`);
      console.log(`   - statsRegistryObjectId: ${statsRegistryObjectId}`);
      console.log(`   - adminCapabilityObjectId: ${adminCapabilityObjectId}`);
      console.log(`   - packageId: ${packageId}`);
      console.log(`   - network: ${this.config.sui.network}`);
      console.log(`   - adminWallet address: ${this.adminWallet.getAddress()}`);

      // Step 4: Validate all required object IDs
      console.log(`\n📋 [ADMIN MINT] Step 4: Validating all required object IDs...`);
      if (!registryObjectId || registryObjectId.trim() === '') {
        console.error(`❌ [ADMIN MINT] BadgeRegistry object ID is missing`);
        return {
          success: false,
          error: 'BadgeRegistry object ID is missing. Please set BADGE_REGISTRY_OBJECT_ID_TESTNET in Vercel environment variables.',
        };
      }
      console.log(`✅ [ADMIN MINT] BadgeRegistry object ID: ${registryObjectId}`);
      
      if (!statsRegistryObjectId || statsRegistryObjectId.trim() === '') {
        console.error(`❌ [ADMIN MINT] StatisticsRegistry object ID is missing`);
        return {
          success: false,
          error: 'StatisticsRegistry object ID is missing. Please set STATISTICS_REGISTRY_OBJECT_ID_TESTNET in Vercel environment variables.',
        };
      }
      console.log(`✅ [ADMIN MINT] StatisticsRegistry object ID: ${statsRegistryObjectId}`);
      
      if (!adminCapabilityObjectId || adminCapabilityObjectId.trim() === '') {
        console.error(`❌ [ADMIN MINT] AdminCapability object ID is missing`);
        return {
          success: false,
          error: 'AdminCapability object ID is missing. Please set ADMIN_CAPABILITY_OBJECT_ID_TESTNET in Vercel environment variables.',
        };
      }
      console.log(`✅ [ADMIN MINT] AdminCapability object ID: ${adminCapabilityObjectId}`);
      
      if (!packageId || packageId.trim() === '') {
        console.error(`❌ [ADMIN MINT] Game Score package ID is missing`);
        return {
          success: false,
          error: 'Game Score package ID is missing. Please set GAME_SCORE_CONTRACT_TESTNET in Vercel environment variables.',
        };
      }
      console.log(`✅ [ADMIN MINT] Game Score package ID: ${packageId}`);
      console.log(`✅ [ADMIN MINT] All object IDs validated successfully`);

      // Step 5: Check if player already has a badge in the registry
      // This uses the same hasBadge function that the lookup uses
      console.log(`\n📋 [ADMIN MINT] Step 5: Checking if player already has badge...`);
      console.log(`📋 [ADMIN MINT] Calling hasBadge('${playerAddress}')...`);
      console.log(`📋 [ADMIN MINT] Using same function as lookup - should return same result`);
      
      const hasBadge = await this.hasBadge(playerAddress);
      
      console.log(`\n📋 [ADMIN MINT] hasBadge() returned: ${hasBadge}`);
      console.log(`📋 [ADMIN MINT] Type: ${typeof hasBadge}, Value: ${hasBadge}`);
      
      if (hasBadge) {
        console.log(`\n⚠️ [ADMIN MINT] Player HAS a badge - cannot mint another one`);
        console.log(`⚠️ [ADMIN MINT] Attempting to get badge details for error message...`);
        
        // Try to get the badge to provide more details in the error message
        let badgeInfo = '';
        try {
          console.log(`📋 [ADMIN MINT] Calling getBadge('${playerAddress}')...`);
          const badge = await this.getBadge(playerAddress);
          console.log(`📋 [ADMIN MINT] getBadge() returned:`, badge ? `Found badge` : 'null');
          
          if (badge && badge.badgeId) {
            badgeInfo = ` Badge ID: ${badge.badgeId}, Tier: ${badge.tier}.`;
            console.log(`📋 [ADMIN MINT] Badge details:`, JSON.stringify(badge, null, 2));
          } else {
            console.log(`⚠️ [ADMIN MINT] getBadge returned null or no badgeId - this is inconsistent with hasBadge=true`);
          }
        } catch (error) {
          // Ignore errors getting badge details - just use the hasBadge result
          console.warn(`⚠️ [ADMIN MINT] Error getting badge details:`, error);
          console.warn(`⚠️ [ADMIN MINT] Error type: ${error instanceof Error ? error.constructor.name : typeof error}`);
          console.warn(`⚠️ [ADMIN MINT] Error message: ${error instanceof Error ? error.message : String(error)}`);
        }
        
        console.error(`❌ [ADMIN MINT] MINT FAILED: Player already has badge`);
        return {
          success: false,
          error: `Player already has a badge in the registry.${badgeInfo} Please burn the existing badge first if you want to mint a new one.`,
        };
      }
      
      console.log(`\n✅ [ADMIN MINT] Player does NOT have badge - proceeding with mint...`);

      // Step 6: Load badge image for the tier
      console.log(`\n📋 [ADMIN MINT] Step 6: Loading badge image for tier ${tier}...`);
      const imageData = await this.loadBadgeImage(tier);
      console.log(`✅ [ADMIN MINT] Badge image loaded: ${imageData.length} bytes`);

      // Step 7: Build transaction
      console.log(`\n📋 [ADMIN MINT] Step 7: Building transaction...`);
      const txb = new Transaction();

      const moveCallTarget = `${packageId}::badge_system::admin_mint_badge`;
      console.log(`📋 [ADMIN MINT] Move call target: ${moveCallTarget}`);
      console.log(`📋 [ADMIN MINT] Transaction arguments:`);
      console.log(`   - adminCapability: ${adminCapabilityObjectId}`);
      console.log(`   - registry: ${registryObjectId}`);
      console.log(`   - statsRegistry: ${statsRegistryObjectId}`);
      console.log(`   - clock: 0x6`);
      console.log(`   - player: ${playerAddress}`);
      console.log(`   - tier: ${tier}`);
      console.log(`   - imageData: ${imageData.length} bytes`);

      txb.moveCall({
        target: moveCallTarget,
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
      console.log(`✅ [ADMIN MINT] Transaction built with gas budget: ${this.config.sui.gasBudget}`);

      // Step 8: Sign and execute transaction
      console.log(`\n📋 [ADMIN MINT] Step 8: Signing and executing transaction...`);
      console.log(`📋 [ADMIN MINT] Signer: ${this.adminWallet.getAddress()}`);
      
      const keypair = this.adminWallet.getKeypair();
      
      console.log(`📋 [ADMIN MINT] Calling signAndExecuteTransaction...`);
      const result = await client.signAndExecuteTransaction({
        signer: keypair,
        transaction: txb,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      console.log(`📋 [ADMIN MINT] Transaction executed`);
      console.log(`📋 [ADMIN MINT] Transaction digest: ${result.digest}`);
      console.log(`📋 [ADMIN MINT] Transaction status:`, result.effects?.status?.status);
      console.log(`📋 [ADMIN MINT] Transaction effects:`, JSON.stringify(result.effects, null, 2));

      // Step 9: Check if transaction succeeded
      console.log(`\n📋 [ADMIN MINT] Step 9: Checking transaction result...`);
      if (result.effects?.status?.status === 'success') {
        console.log(`\n✅ [ADMIN MINT] ========== MINT SUCCESSFUL ==========`);
        console.log(`✅ [ADMIN MINT] Badge minted successfully`);
        console.log(`✅ [ADMIN MINT] Transaction digest: ${result.digest}`);
        console.log(`✅ [ADMIN MINT] Player: ${playerAddress}`);
        console.log(`✅ [ADMIN MINT] Tier: ${tier}`);
        console.log(`✅ [ADMIN MINT] ========================================\n`);
        
        return {
          success: true,
          digest: result.digest,
        };
      } else {
        const errorMsg = result.effects?.status?.error || 'Transaction failed';
        console.error(`\n❌ [ADMIN MINT] ========== MINT FAILED ==========`);
        console.error(`❌ [ADMIN MINT] Transaction status: ${result.effects?.status?.status}`);
        console.error(`❌ [ADMIN MINT] Error: ${errorMsg}`);
        console.error(`❌ [ADMIN MINT] Transaction digest: ${result.digest}`);
        console.error(`❌ [ADMIN MINT] =====================================\n`);
        
        return {
          success: false,
          error: errorMsg,
        };
      }
    } catch (error) {
      console.error(`\n❌ [ADMIN MINT] ========== MINT ERROR ==========`);
      console.error(`❌ [ADMIN MINT] Exception caught during mint process`);
      console.error(`❌ [ADMIN MINT] Error type: ${error instanceof Error ? error.constructor.name : typeof error}`);
      console.error(`❌ [ADMIN MINT] Error message: ${error instanceof Error ? error.message : String(error)}`);
      if (error instanceof Error && error.stack) {
        console.error(`❌ [ADMIN MINT] Stack trace:`, error.stack);
      }
      console.error(`❌ [ADMIN MINT] Player: ${playerAddress}`);
      console.error(`❌ [ADMIN MINT] Tier: ${tier}`);
      console.error(`❌ [ADMIN MINT] ===================================\n`);
      
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

      console.log(`🧹 [ADMIN BADGE] Cleaning up orphaned registry entry for ${playerAddress}`);

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
        console.log(`✅ [ADMIN BADGE] Orphaned entry cleaned up successfully: ${result.digest}`);
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
      console.error('❌ [ADMIN BADGE] Error cleaning up orphaned entry:', error);
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
        console.log(`🔍 [ADMIN BADGE] Checking badge ownership. Badge ID: ${badgeId}, Owner:`, JSON.stringify(owner), `Admin: ${adminAddress}`);
        
        if (owner && typeof owner === 'object' && 'AddressOwner' in owner) {
          const ownerAddress = owner.AddressOwner.toLowerCase();
          const adminAddressLower = adminAddress.toLowerCase();
          
          console.log(`🔍 [ADMIN BADGE] Owner address: ${ownerAddress}, Admin address: ${adminAddressLower}, Match: ${ownerAddress === adminAddressLower}`);
          
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
          console.log(`⚠️ [ADMIN BADGE] Badge ownership format unexpected:`, owner);
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

