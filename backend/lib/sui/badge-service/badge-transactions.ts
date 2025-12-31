// ==========================================
// Badge Transactions - Transaction building for badge operations
// ==========================================

import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { BadgeLogger } from '../badge-logger';
import { BadgeError, BadgeErrorCode } from '../badge-errors';
import { BadgeValidators } from '../badge-validators';
import { validateAndSanitizeImage } from '../badge-image-validator';
import { checkBalanceBeforeTransaction, checkPlayerBalanceForTransaction } from '../balance-checker';

/**
 * Dependencies needed for badge transactions
 */
export interface BadgeTransactionsDependencies {
  getClient: () => SuiClient;
  getConfig: () => {
    contracts: {
      badgeRegistry?: string;
      gameScore: string;
      statisticsRegistry?: string;
    };
    sui: {
      gasBudget: number;
      network: string;
    };
  };
  getAdminWallet: () => {
    getAddress: () => string;
    getKeypair: () => any;
  };
  hasBadge: (playerAddress: string) => Promise<boolean>;
  getBadge: (playerAddress: string) => Promise<any>;
  loadBadgeImage: (tier: number) => Promise<Uint8Array>;
  getBadgeImageUrl: (tier: number) => string;
  createImageDataObjectChunked: (imageData: Uint8Array, chunkSize?: number) => Promise<string>;
  adminCleanupOrphanedEntry: (playerAddress: string) => Promise<{ success: boolean; error?: string }>;
  calculateTierFromGames: (gamesPlayed: number) => number;
  invalidateCache?: (playerAddress: string) => void;
  addToRetryQueue?: (playerAddress: string, sessionId: string, error: string) => void;
}

/**
 * Badge Transactions Module
 * Handles all transaction building operations (mint, upgrade, migrate, check update)
 */
export class BadgeTransactions {
  private dependencies: BadgeTransactionsDependencies;

  constructor(dependencies: BadgeTransactionsDependencies) {
    this.dependencies = dependencies;
  }

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
    const config = this.dependencies.getConfig();
    
    if (!config.contracts.badgeRegistry) {
      return {
        success: false,
        error: 'BadgeRegistry object ID not configured',
      };
    }

    try {
      const client = this.dependencies.getClient();
      
      // Validate payment coin if provided
      if (paymentCoinId && paymentCoinId.trim() !== '') {
        try {
          const coinObject = await client.getObject({
            id: paymentCoinId,
            options: { showType: true, showContent: true },
          });
          
          if (!coinObject.data) {
            return {
              success: false,
              error: 'Payment coin not found',
            };
          }
          
          const coinType = coinObject.data.type;
          if (!coinType || !coinType.includes('0x2::sui::SUI')) {
            return {
              success: false,
              error: 'Invalid payment coin type. Badge minting requires SUI coins only.',
            };
          }
        } catch (error) {
          BadgeLogger.error('Error validating payment coin', error);
          return {
            success: false,
            error: 'Failed to validate payment coin. Please ensure you are using a SUI coin.',
          };
        }
      }

      // Check if player already has badge
      const hasBadge = await this.dependencies.hasBadge(playerAddress);
      if (hasBadge) {
        return {
          success: false,
          error: 'Player already has a badge',
        };
      }

      // Load Standard tier badge image
      const imageData = await this.dependencies.loadBadgeImage(0);

      // Create BadgeImageData object
      const CHUNK_THRESHOLD = 14 * 1024;
      let imageDataObjectId: string;
      
      if (imageData.length > CHUNK_THRESHOLD) {
        BadgeLogger.debug('Using chunked upload for image', { size: imageData.length });
        imageDataObjectId = await this.dependencies.createImageDataObjectChunked(imageData);
      } else {
        BadgeLogger.debug('Using direct upload for image', { size: imageData.length });
        
        // Check wallet balance before building transaction
        const adminWallet = this.dependencies.getAdminWallet();
        const adminAddress = adminWallet.getAddress();
        await checkBalanceBeforeTransaction({
          client,
          walletAddress: adminAddress,
          gasBudget: config.sui.gasBudget,
          context: 'mint badge (direct upload)',
        });
        
        const txbCreate = new Transaction();
        const imageDataObj = txbCreate.moveCall({
          target: `${config.contracts.gameScore}::badge_system::create_image_data_small`,
          arguments: [
            txbCreate.pure.vector('u8', Array.from(imageData)),
          ],
        });
        txbCreate.transferObjects([imageDataObj], adminAddress);
        txbCreate.setGasBudget(config.sui.gasBudget);

        const resultCreate = await client.signAndExecuteTransaction({
          signer: adminWallet.getKeypair(),
          transaction: txbCreate,
          options: {
            showEffects: true,
            showObjectChanges: true,
          },
        });

        if (resultCreate.effects?.status?.status !== 'success') {
          throw new BadgeError(
            BadgeErrorCode.TRANSACTION_FAILED,
            `Failed to create BadgeImageData object: ${resultCreate.effects?.status?.error || 'Unknown error'}`
          );
        }

        const createdObjects = resultCreate.objectChanges?.filter(
          (change: any) => change.type === 'created' && change.objectType?.includes('BadgeImageData')
        );
        
        if (!createdObjects || createdObjects.length === 0) {
          throw new BadgeError(
            BadgeErrorCode.TRANSACTION_FAILED,
            'Failed to get BadgeImageData object ID from transaction'
          );
        }

        imageDataObjectId = (createdObjects[0] as any).objectId;
      }

      const statsRegistryId = config.contracts.statisticsRegistry;
      if (!statsRegistryId || statsRegistryId.trim() === '') {
        return {
          success: false,
          error: 'StatisticsRegistry object ID not configured.',
        };
      }

      const clockId = '0x6';
      const packageId = config.contracts.gameScore.split('::')[0];
      const paymentAmount = BigInt(100_000_000);
      const gasEstimate = config.sui.gasBudget;
      const gasWithBuffer = Math.round(gasEstimate * 1.15);

      return {
        success: true,
        transactionData: {
          packageId,
          module: 'badge_system',
          function: 'mint_badge',
          arguments: {
            badgeRegistry: config.contracts.badgeRegistry!,
            statsRegistry: statsRegistryId,
            clock: clockId,
            paymentCoinId: paymentCoinId || '',
            paymentAmount: paymentAmount.toString(),
            imageDataObjectId,
          },
          gasBudget: gasWithBuffer,
        },
      };
    } catch (error) {
      BadgeLogger.error('Error getting mint badge transaction data', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }


  /**
   * Build upgrade badge transaction
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
    try {
      BadgeValidators.validateAddress(playerAddress);
      BadgeValidators.validateBadgeId(badgeId);
      BadgeValidators.validateTier(newTier);
      BadgeValidators.validateSessionId(sessionId);

      const client = this.dependencies.getClient();
      const config = this.dependencies.getConfig();
      const packageId = config.contracts.gameScore.split('::')[0];
      const registryId = config.contracts.badgeRegistry;
      const statsRegistryId = config.contracts.statisticsRegistry;
      const clockId = '0x6';

      if (!packageId || !registryId || !statsRegistryId) {
        throw new BadgeError(
          BadgeErrorCode.CONFIG_MISSING,
          'Missing contract configuration'
        );
      }

      const imageUrl = this.dependencies.getBadgeImageUrl(newTier);
      BadgeLogger.debug('Badge image URL for tier', { newTier, imageUrl });

      // Check player balance before building transaction
      // Player needs: gas + payment amount (100_000_000 = 0.1 SUI)
      const paymentAmount = 100_000_000; // 0.1 SUI
      await checkPlayerBalanceForTransaction({
        client,
        walletAddress: playerAddress,
        gasBudget: config.sui.gasBudget,
        paymentAmount: paymentAmount,
        context: 'upgrade badge',
      });

      const sessionIdBytes = Array.from(new TextEncoder().encode(sessionId));

      const txb = new Transaction();
      const paymentAmountBigInt = BigInt(paymentAmount);
      const splitPaymentCoin = txb.splitCoins(txb.gas, [paymentAmountBigInt]);
      
      txb.moveCall({
        target: `${packageId}::badge_system::update_badge_tier`,
        arguments: [
          txb.object(badgeId),
          txb.object(registryId),
          txb.object(statsRegistryId),
          txb.object(clockId),
          txb.pure.vector('u8', sessionIdBytes),
          splitPaymentCoin,
          txb.pure.string(imageUrl),
        ],
      });
      
      txb.setSender(playerAddress);
      txb.setGasBudget(config.sui.gasBudget);
      
      // Test transaction
      try {
        await client.devInspectTransactionBlock({
          sender: playerAddress,
          transactionBlock: txb,
        });
        BadgeLogger.debug('devInspectTransactionBlock succeeded');
      } catch (testError) {
        const errorMessage = testError instanceof Error ? testError.message : String(testError);
        BadgeLogger.error('devInspectTransactionBlock failed', { error: errorMessage });
        
        if (errorMessage.includes('Incorrect number of arguments')) {
          throw new BadgeError(
            BadgeErrorCode.CONFIG_INVALID,
            'Deployed contract does not have payment parameter. Please redeploy the contract with the updated signature.'
          );
        }
      }
      
      const transactionBytes = await txb.build({ client });
      
      BadgeLogger.info('Transaction built successfully', { playerAddress, badgeId, newTier });
      
      return {
        success: true,
        transaction: Buffer.from(transactionBytes).toString('base64'),
        gasEstimate: config.sui.gasBudget.toString(),
      };
    } catch (error) {
      const badgeError = BadgeError.fromUnknown(error, 'Error building upgrade transaction');
      BadgeLogger.error('Error building transaction', badgeError);
      return {
        success: false,
        error: badgeError.message,
      };
    }
  }

  /**
   * Build migrate badge transaction
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
    try {
      const client = this.dependencies.getClient();
      const config = this.dependencies.getConfig();
      const packageId = config.contracts.gameScore.split('::')[0];
      const registryId = config.contracts.badgeRegistry;
      const statsRegistryId = config.contracts.statisticsRegistry;
      const clockId = '0x6';

      BadgeLogger.debug('Contract configuration', {
        packageId,
        registryId,
        statsRegistryId,
        clockId,
        playerAddress,
        oldTier,
        oldGamesPlayed,
        oldMintDate,
      });

      if (!packageId || !registryId || !statsRegistryId) {
        return {
          success: false,
          error: 'Missing contract configuration',
        };
      }

      // CRITICAL: Verify BadgeRegistry is from the same package as the function
      try {
        const registryObj = await client.getObject({
          id: registryId,
          options: { showType: true, showContent: false },
        });
        
        if (registryObj.error) {
          BadgeLogger.error('BadgeRegistry object not found', {
            registryId,
            error: registryObj.error,
          });
          return {
            success: false,
            error: `BadgeRegistry object not found: ${registryId}. Please verify BADGE_REGISTRY_OBJECT_ID_TESTNET is correct.`,
          };
        }

        const registryType = registryObj.data?.type || 'unknown';
        const registryPackageId = registryType.split('::')[0];
        
        BadgeLogger.debug('BadgeRegistry verification', {
          registryId,
          registryType,
          registryPackageId,
          expectedPackageId: packageId,
        });

        if (registryPackageId !== packageId) {
          return {
            success: false,
            error: `Package ID mismatch! The BadgeRegistry is from package ${registryPackageId}, but the migrate_badge function is from package ${packageId}. They must match. Please ensure BADGE_REGISTRY_OBJECT_ID_TESTNET is from the new package (${packageId}).`,
          };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        BadgeLogger.error('Could not verify BadgeRegistry object', { errorMessage });
        return {
          success: false,
          error: `Failed to verify BadgeRegistry object: ${errorMessage}. Please check that BADGE_REGISTRY_OBJECT_ID_TESTNET is correct.`,
        };
      }

      // CRITICAL: Verify StatisticsRegistry is from the same package as the function
      try {
        const statsRegistryObj = await client.getObject({
          id: statsRegistryId,
          options: { showType: true, showContent: false },
        });
        
        if (statsRegistryObj.error) {
          BadgeLogger.error('StatisticsRegistry object not found', {
            statsRegistryId,
            error: statsRegistryObj.error,
          });
          return {
            success: false,
            error: `StatisticsRegistry object not found: ${statsRegistryId}. Please verify STATISTICS_REGISTRY_OBJECT_ID_TESTNET is correct.`,
          };
        }

        const statsRegistryType = statsRegistryObj.data?.type || 'unknown';
        const statsRegistryPackageId = statsRegistryType.split('::')[0];
        
        BadgeLogger.debug('StatisticsRegistry verification', {
          statsRegistryId,
          statsRegistryType,
          statsRegistryPackageId,
          expectedPackageId: packageId,
        });

        if (statsRegistryPackageId !== packageId) {
          return {
            success: false,
            error: `Package ID mismatch! The StatisticsRegistry is from package ${statsRegistryPackageId}, but the migrate_badge function is from package ${packageId}. They must match. Please ensure STATISTICS_REGISTRY_OBJECT_ID_TESTNET is from the new package (${packageId}).`,
          };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        BadgeLogger.error('Could not verify StatisticsRegistry object', { errorMessage });
        return {
          success: false,
          error: `Failed to verify StatisticsRegistry object: ${errorMessage}. Please check that STATISTICS_REGISTRY_OBJECT_ID_TESTNET is correct.`,
        };
      }

      if (oldTier < 0 || oldTier > 5) {
        return {
          success: false,
          error: `Invalid tier: ${oldTier}. Must be between 0 and 5`,
        };
      }

      const imageUrl = this.dependencies.getBadgeImageUrl(oldTier);
      
      if (!imageUrl || typeof imageUrl !== 'string' || (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://'))) {
        return {
          success: false,
          error: `Invalid image URL: ${imageUrl}. Must be a valid HTTP/HTTPS URL.`,
        };
      }

      // Check if player already has badge
      try {
        const hasNewBadgeRegistry = await this.dependencies.hasBadge(playerAddress);
        
        if (hasNewBadgeRegistry) {
          const newBadge = await this.dependencies.getBadge(playerAddress);
          
          if (newBadge && newBadge.badgeId) {
            return {
              success: false,
              error: 'Player already has a badge in the new contract. Migration is not needed.',
            };
          } else {
            // Orphaned entry - clean it up
            try {
              const cleanupResult = await this.dependencies.adminCleanupOrphanedEntry(playerAddress);
              if (cleanupResult.success) {
                BadgeLogger.info('Orphaned entry cleaned up, proceeding with migration');
              }
            } catch (cleanupError) {
              BadgeLogger.warn('Error cleaning up orphaned entry', cleanupError);
            }
          }
        }
      } catch (checkError) {
        BadgeLogger.warn('Error checking for existing badge (non-fatal)', checkError);
      }

      const txb = new Transaction();
      
      txb.moveCall({
        target: `${packageId}::badge_system::migrate_badge`,
        arguments: [
          txb.object(registryId),
          txb.object(statsRegistryId),
          txb.object(clockId),
          txb.pure.u8(oldTier),
          txb.pure.u64(oldGamesPlayed),
          txb.pure.u64(oldMintDate),
          txb.pure.string(imageUrl),
        ],
      });
      
      txb.setSender(playerAddress);
      txb.setGasBudget(config.sui.gasBudget);
      
      // Test transaction
      try {
        const testResult = await client.devInspectTransactionBlock({
          sender: playerAddress,
          transactionBlock: txb,
        });
        BadgeLogger.debug('devInspectTransactionBlock succeeded');
      } catch (testError) {
        BadgeLogger.warn('devInspectTransactionBlock test failed (non-fatal)', testError);
      }
      
      const transactionBytes = await txb.build({ client });
      
      BadgeLogger.info('Migration transaction built successfully', { playerAddress });
      
      return {
        success: true,
        transaction: Buffer.from(transactionBytes).toString('base64'),
        gasEstimate: config.sui.gasBudget.toString(),
      };
    } catch (error) {
      BadgeLogger.error('Error building migrate transaction', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
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
    try {
      BadgeValidators.validateAddress(playerAddress);

      const config = this.dependencies.getConfig();
      const statsRegistryId = config.contracts.statisticsRegistry;

      if (!statsRegistryId) {
        return {
          success: false,
          hasPendingUpgrade: false,
          error: 'StatisticsRegistry object ID not configured',
        };
      }

      const client = this.dependencies.getClient();
      
      // Get player stats (read-only query, no gas needed)
      const tx1 = new Transaction();
      tx1.moveCall({
        target: `${config.contracts.gameScore}::score_submission::get_player_stats`,
        arguments: [
          tx1.object(statsRegistryId),
          tx1.pure.address(playerAddress),
        ],
      });

      const result1 = await client.devInspectTransactionBlock({
        transactionBlock: tx1,
        sender: this.dependencies.getAdminWallet().getAddress(),
      });

      if (!result1.results || !result1.results[0].returnValues) {
        return {
          success: false,
          hasPendingUpgrade: false,
          error: 'Failed to get player stats',
        };
      }

      const returnValues = result1.results[0].returnValues;
      
      // Parse hasStats
      const hasStatsByteArray = Array.isArray(returnValues[0]) && Array.isArray(returnValues[0][0]) 
        ? returnValues[0][0] 
        : [];
      const hasStats = Array.isArray(hasStatsByteArray) && hasStatsByteArray.length > 0 && hasStatsByteArray[0] === 1;
      
      // Parse totalGames
      const parseU64FromBytes = (byteArray: number[]): number => {
        if (!Array.isArray(byteArray) || byteArray.length !== 8) {
          return 0;
        }
        let value = 0;
        for (let i = 0; i < 8; i++) {
          value += byteArray[i] * Math.pow(256, i);
        }
        return value;
      };
      
      const totalGamesByteArray = Array.isArray(returnValues[1]) && Array.isArray(returnValues[1][0]) && returnValues[1][0].length === 8
        ? returnValues[1][0] as number[]
        : [];
      const totalGames = parseU64FromBytes(totalGamesByteArray);
      
      if (!hasStats || totalGames === 0) {
        return {
          success: true,
          hasPendingUpgrade: false,
        };
      }

      // Get current badge (read-only query)
      const currentBadge = await this.dependencies.getBadge(playerAddress);
      
      if (!currentBadge || !currentBadge.badgeId) {
        return {
          success: true,
          hasPendingUpgrade: false,
        };
      }

      // Calculate new tier based on games played
      const newTier = this.dependencies.calculateTierFromGames(totalGames);
      
      // Check if upgrade is needed
      if (newTier <= currentBadge.tier) {
        return {
          success: true,
          hasPendingUpgrade: false,
        };
      }

      // Upgrade is available - return info without building transaction
      return {
        success: true,
        hasPendingUpgrade: true,
        newTier: newTier,
        badgeId: currentBadge.badgeId,
      };
    } catch (error) {
      BadgeLogger.error('Error checking badge upgrade', error);
      return {
        success: false,
        hasPendingUpgrade: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
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
    try {
      BadgeValidators.validateAddress(playerAddress);
      BadgeValidators.validateSessionId(sessionId);

      const config = this.dependencies.getConfig();
      const statsRegistryId = config.contracts.statisticsRegistry;

      if (!statsRegistryId) {
        return {
          success: false,
          tierUpgraded: false,
          error: 'StatisticsRegistry object ID not configured',
        };
      }

      const client = this.dependencies.getClient();
      
      // Get player stats
      const tx1 = new Transaction();
      tx1.moveCall({
        target: `${config.contracts.gameScore}::score_submission::get_player_stats`,
        arguments: [
          tx1.object(statsRegistryId),
          tx1.pure.address(playerAddress),
        ],
      });

      const result1 = await client.devInspectTransactionBlock({
        transactionBlock: tx1,
        sender: this.dependencies.getAdminWallet().getAddress(),
      });

      if (!result1.results || !result1.results[0].returnValues) {
        return {
          success: false,
          tierUpgraded: false,
          error: 'Failed to get player stats',
        };
      }

      const returnValues = result1.results[0].returnValues;
      
      // Parse hasStats
      const hasStatsByteArray = Array.isArray(returnValues[0]) && Array.isArray(returnValues[0][0]) 
        ? returnValues[0][0] 
        : [];
      const hasStats = Array.isArray(hasStatsByteArray) && hasStatsByteArray.length > 0 && hasStatsByteArray[0] === 1;
      
      // Parse totalGames
      const parseU64FromBytes = (byteArray: number[]): number => {
        if (!Array.isArray(byteArray) || byteArray.length !== 8) {
          return 0;
        }
        let value = 0;
        for (let i = 0; i < 8; i++) {
          value += byteArray[i] * Math.pow(256, i);
        }
        return value;
      };
      
      const totalGamesByteArray = Array.isArray(returnValues[1]) && Array.isArray(returnValues[1][0]) && returnValues[1][0].length === 8
        ? returnValues[1][0] as number[]
        : [];
      const totalGames = parseU64FromBytes(totalGamesByteArray);
      
      if (!hasStats || totalGames === 0) {
        return {
          success: true,
          tierUpgraded: false,
        };
      }

      // Get current badge
      const currentBadge = await this.dependencies.getBadge(playerAddress);
      
      if (!currentBadge || !currentBadge.badgeId) {
        return {
          success: true,
          tierUpgraded: false,
        };
      }

      // Calculate new tier
      const newTier = this.dependencies.calculateTierFromGames(totalGames);
      
      if (newTier <= currentBadge.tier) {
        return {
          success: true,
          tierUpgraded: false,
        };
      }

      // Load image for new tier
      const imageData = await this.dependencies.loadBadgeImage(newTier);
      
      // Additional validation before building transaction (double-check)
      try {
        validateAndSanitizeImage(imageData);
      } catch (validationError) {
        BadgeLogger.error('Image validation failed after load', validationError);
        throw new BadgeError(
          BadgeErrorCode.IMAGE_VALIDATION_FAILED,
          `Invalid badge image for tier ${newTier}: ${validationError instanceof Error ? validationError.message : 'Unknown error'}`
        );
      }

      // Create BadgeImageData object using chunked upload (if >14KB) or direct (if ≤14KB)
      const CHUNK_THRESHOLD = 14 * 1024; // 14KB
      let imageDataObjectId: string;
      
      if (imageData.length > CHUNK_THRESHOLD) {
        BadgeLogger.debug('Image size requires chunked upload', {
          imageSize: imageData.length,
          threshold: CHUNK_THRESHOLD,
        });
        imageDataObjectId = await this.dependencies.createImageDataObjectChunked(imageData);
      } else {
        BadgeLogger.debug('Image size allows direct upload', {
          imageSize: imageData.length,
          threshold: CHUNK_THRESHOLD,
        });
        
        // Check wallet balance before building transaction
        const client = this.dependencies.getClient();
        const adminWallet = this.dependencies.getAdminWallet();
        const adminAddress = adminWallet.getAddress();
        await checkBalanceBeforeTransaction({
          client,
          walletAddress: adminAddress,
          gasBudget: config.sui.gasBudget,
          context: 'upgrade badge (direct upload)',
        });
        
        // Create directly in a single transaction
        const txbCreate = new Transaction();
        const imageDataObj = txbCreate.moveCall({
          target: `${config.contracts.gameScore}::badge_system::create_image_data_small`,
          arguments: [
            txbCreate.pure.vector('u8', Array.from(imageData)),
          ],
        });
        txbCreate.transferObjects([imageDataObj], adminAddress);
        txbCreate.setGasBudget(config.sui.gasBudget);

        const resultCreate = await client.signAndExecuteTransaction({
          signer: adminWallet.getKeypair(),
          transaction: txbCreate,
          options: {
            showEffects: true,
            showObjectChanges: true,
          },
        });

        if (resultCreate.effects?.status?.status !== 'success') {
          throw new BadgeError(
            BadgeErrorCode.TRANSACTION_FAILED,
            `Failed to create BadgeImageData object: ${resultCreate.effects?.status?.error || 'Unknown error'}`
          );
        }

        const createdObjects = resultCreate.objectChanges?.filter(
          (change: any) => change.type === 'created' && change.objectType?.includes('BadgeImageData')
        );
        
        if (!createdObjects || createdObjects.length === 0) {
          throw new BadgeError(
            BadgeErrorCode.TRANSACTION_FAILED,
            'Failed to get BadgeImageData object ID from transaction'
          );
        }

        imageDataObjectId = (createdObjects[0] as any).objectId;
        BadgeLogger.debug('Created BadgeImageData object', { imageDataObjectId });
      }

      // Get Clock object (shared object)
      const clockId = '0x6'; // Sui Clock object ID (well-known shared object)

      // Convert session ID to bytes
      const sessionIdBytes = Array.from(new TextEncoder().encode(sessionId));

      const packageId = config.contracts.gameScore.split('::')[0];

      // Invalidate cache if badge was updated
      if (this.dependencies.invalidateCache) {
        this.dependencies.invalidateCache(playerAddress);
        BadgeLogger.debug('Invalidated badge cache after tier upgrade', { playerAddress });
      }

      return {
        success: true,
        tierUpgraded: true,
        newTier,
        transactionData: {
          packageId: config.contracts.gameScore,
          module: 'badge_system',
          function: 'update_badge_tier',
          arguments: [
            currentBadge.badgeId,
            config.contracts.badgeRegistry!,
            config.contracts.statisticsRegistry!,
            clockId,
            sessionIdBytes, // Session ID as vector<u8>
            imageDataObjectId, // Pre-populated BadgeImageData object ID
          ],
          badgeId: currentBadge.badgeId,
          imageData,
        },
      };
    } catch (error) {
      const badgeError = BadgeError.fromUnknown(error, 'Error checking badge update');
      BadgeLogger.error('Error checking badge update', badgeError);
      
      // Add to retry queue if enabled
      if (addToRetryQueue && this.dependencies.addToRetryQueue) {
        this.dependencies.addToRetryQueue(playerAddress, sessionId, badgeError.message);
      }
      
      return {
        success: false,
        tierUpgraded: false,
        error: badgeError.message,
      };
    }
  }
}

