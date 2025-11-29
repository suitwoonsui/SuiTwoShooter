// ==========================================
// Badge Transactions - Transaction building for badge operations
// ==========================================

import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { BadgeLogger } from '../badge-logger';
import { BadgeError, BadgeErrorCode } from '../badge-errors';
import { BadgeValidators } from '../badge-validators';
import { validateAndSanitizeImage } from '../badge-image-validator';

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
        const txbCreate = new Transaction();
        const imageDataObj = txbCreate.moveCall({
          target: `${config.contracts.gameScore}::badge_system::create_image_data_small`,
          arguments: [
            txbCreate.pure.vector('u8', Array.from(imageData)),
          ],
        });
        txbCreate.transferObjects([imageDataObj], this.dependencies.getAdminWallet().getAddress());
        txbCreate.setGasBudget(config.sui.gasBudget);

        const resultCreate = await client.signAndExecuteTransaction({
          signer: this.dependencies.getAdminWallet().getKeypair(),
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
   * Build mint badge transaction (legacy - builds on backend)
   */
  async buildMintBadgeTransaction(
    playerAddress: string,
    paymentCoinId?: string
  ): Promise<{
    success: boolean;
    transaction?: string;
    gasEstimate?: string;
    error?: string;
  }> {
    try {
      BadgeValidators.validateAddress(playerAddress);
      if (paymentCoinId) {
        BadgeValidators.validatePaymentCoinId(paymentCoinId);
      }

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
      });
      
      // Verify shared objects exist (batched for performance)
      try {
        const [registryObj, statsObj] = await Promise.all([
          client.getObject({
            id: registryId!,
            options: { showType: true, showOwner: true },
          }),
          client.getObject({
            id: statsRegistryId!,
            options: { showType: true, showOwner: true },
          }),
        ]);
        
        BadgeLogger.debug('Shared objects verified', {
          registryExists: !!registryObj.data,
          statsExists: !!statsObj.data,
        });
      } catch (objError) {
        BadgeLogger.warn('Failed to verify shared objects', objError);
      }

      if (!packageId || !registryId || !statsRegistryId) {
        throw new BadgeError(
          BadgeErrorCode.CONFIG_MISSING,
          'Missing contract configuration'
        );
      }

      // Check if player already has badge
      try {
        const hasBadgeRegistry = await this.dependencies.hasBadge(playerAddress);
        
        if (hasBadgeRegistry) {
          const existingBadge = await this.dependencies.getBadge(playerAddress);
          
          if (existingBadge && existingBadge.badgeId) {
            throw new BadgeError(
              BadgeErrorCode.BADGE_ALREADY_EXISTS,
              'Player already has a badge. Minting is not needed.'
            );
          } else {
            // Orphaned entry - clean it up
            BadgeLogger.warn('Orphaned registry entry detected, cleaning up');
            try {
              const cleanupResult = await this.dependencies.adminCleanupOrphanedEntry(playerAddress);
              if (cleanupResult.success) {
                BadgeLogger.info('Orphaned entry cleaned up');
              }
            } catch (cleanupError) {
              BadgeLogger.warn('Error cleaning up orphaned entry', cleanupError);
            }
          }
        }
      } catch (checkError) {
        if (checkError instanceof BadgeError) {
          throw checkError;
        }
        BadgeLogger.warn('Error checking for existing badge (non-fatal)', checkError);
      }

      const imageUrl = this.dependencies.getBadgeImageUrl(0);
      BadgeLogger.debug('Badge image URL', { imageUrl });

      const txb = new Transaction();
      const paymentAmount = BigInt(100_000_000);
      const splitPaymentCoin = txb.splitCoins(txb.gas, [paymentAmount]);
      
      txb.moveCall({
        target: `${packageId}::badge_system::mint_badge`,
        arguments: [
          txb.object(registryId),
          txb.object(statsRegistryId),
          txb.object(clockId),
          splitPaymentCoin,
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
        
        const firstResult = testResult.results?.[0] as any;
        const error = firstResult?.error as string | undefined;
        
        if (error) {
          throw new BadgeError(
            BadgeErrorCode.TRANSACTION_BUILD_FAILED,
            `Transaction validation failed: ${error}`
          );
        }
      } catch (testError) {
        if (testError instanceof BadgeError) {
          throw testError;
        }
        BadgeLogger.warn('devInspectTransactionBlock test failed (non-fatal)', testError);
      }
      
      const transactionBytes = await txb.build({ client });
      
      BadgeLogger.info('Transaction built successfully', { playerAddress });
      
      return {
        success: true,
        transaction: Buffer.from(transactionBytes).toString('base64'),
        gasEstimate: config.sui.gasBudget.toString(),
      };
    } catch (error) {
      const badgeError = BadgeError.fromUnknown(error, 'Error building mint transaction');
      BadgeLogger.error('Error building transaction', badgeError);
      return {
        success: false,
        error: badgeError.message,
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

      const sessionIdBytes = Array.from(new TextEncoder().encode(sessionId));

      const txb = new Transaction();
      const paymentAmount = BigInt(100_000_000);
      const splitPaymentCoin = txb.splitCoins(txb.gas, [paymentAmount]);
      
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
   * Check if badge tier should be updated and build transaction if needed
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
        // Create directly in a single transaction
        const client = this.dependencies.getClient();
        const txbCreate = new Transaction();
        const imageDataObj = txbCreate.moveCall({
          target: `${config.contracts.gameScore}::badge_system::create_image_data_small`,
          arguments: [
            txbCreate.pure.vector('u8', Array.from(imageData)),
          ],
        });
        txbCreate.transferObjects([imageDataObj], this.dependencies.getAdminWallet().getAddress());
        txbCreate.setGasBudget(config.sui.gasBudget);

        const resultCreate = await client.signAndExecuteTransaction({
          signer: this.dependencies.getAdminWallet().getKeypair(),
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

