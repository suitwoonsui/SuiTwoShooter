// ==========================================
// Badge Images - Image loading and management
// ==========================================

import * as fs from 'fs';
import * as path from 'path';
import { BadgeLogger } from '../badge-logger';
import { BadgeError, BadgeErrorCode } from '../badge-errors';
import { getBadgeImageCache } from '../badge-image-cache';
import { validateAndSanitizeImage, getImageInfo } from '../badge-image-validator';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

/**
 * Dependencies needed for badge images
 */
export interface BadgeImagesDependencies {
  getClient: () => SuiClient;
  getConfig: () => {
    contracts: {
      gameScore: string;
    };
    sui: {
      gasBudget: number;
    };
    server: {
      apiBaseUrl: string;
    };
  };
  getAdminWallet: () => {
    getAddress: () => string;
    getKeypair: () => any;
  };
}

/**
 * Badge Images Module
 * Handles all badge image operations (loading, URLs, chunked upload)
 */
export class BadgeImages {
  private dependencies: BadgeImagesDependencies;
  private imageCache = getBadgeImageCache();

  constructor(dependencies: BadgeImagesDependencies) {
    this.dependencies = dependencies;
  }

  /**
   * Load badge image from file system
   * Falls back to placeholder if image file doesn't exist
   */
  async loadBadgeImage(tier: number): Promise<Uint8Array> {
    // Check cache first (now with TTL support)
    const cached = this.imageCache.get(tier);
    if (cached) {
      return cached;
    }

    // Tier names for file lookup
    const tierNames = ['standard', 'common', 'uncommon', 'rare', 'epic', 'legendary'];
    const tierName = tierNames[tier] || 'standard';
    
    // Try to load actual image file
    const imagePath = path.join(process.cwd(), 'public', 'badges', `${tierName}.webp`);
    
    try {
      if (fs.existsSync(imagePath)) {
        const imageData = fs.readFileSync(imagePath);
        
        // Validate image data before caching
        try {
          const validatedImage = validateAndSanitizeImage(imageData);
          const imageInfo = getImageInfo(validatedImage);
          BadgeLogger.info(`Loaded and validated badge image for tier ${tier} (${tierName})`, {
            size: `${imageInfo.sizeKB}KB`,
            format: imageInfo.format,
            dimensions: imageInfo.width && imageInfo.height ? `${imageInfo.width}x${imageInfo.height}` : 'unknown',
          });
          
          this.imageCache.set(tier, validatedImage);
          return validatedImage;
        } catch (validationError) {
          BadgeLogger.error(`Image validation failed for tier ${tier} (${tierName})`, validationError);
          throw new BadgeError(
            BadgeErrorCode.IMAGE_VALIDATION_FAILED,
            `Invalid badge image file for tier ${tier}: ${validationError instanceof Error ? validationError.message : 'Unknown validation error'}`,
            { tier, tierName, validationError }
          );
        }
      }
    } catch (error) {
      BadgeLogger.warn(`Failed to load badge image for tier ${tier}`, error);
      throw error; // Re-throw to trigger fallback to placeholder
    }

    // Fall back to placeholder image
    BadgeLogger.info(`Using placeholder image for tier ${tier} (${tierName})`);
    return this.createPlaceholderImage(tier);
  }

  /**
   * Create a simple placeholder image for testing
   * Returns a minimal WebP image (1x1 pixel, transparent)
   */
  private createPlaceholderImage(tier: number): Uint8Array {
    // Minimal WebP image: 1x1 pixel, transparent
    const placeholder = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, // RIFF
      0x1A, 0x00, 0x00, 0x00, // Size
      0x57, 0x45, 0x42, 0x50, // WEBP
      0x56, 0x50, 0x38, 0x20, // VP8 
      0x0A, 0x00, 0x00, 0x00, // Size
      0x00, 0x00, 0x00, 0x00, // Flags
      0x00, 0x00, 0x00, 0x00, // Width/Height (1x1)
      0x00, 0x00, 0x00, 0x00, // Data
    ]);
    
    // Cache placeholder
    this.imageCache.set(tier, placeholder);
    return placeholder;
  }

  /**
   * Get static image URL for a badge tier
   */
  getBadgeImageUrl(tier: number): string {
    const tierNames = ['Standard', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
    const tierName = tierNames[tier] || 'Standard';
    const baseUrl = this.dependencies.getConfig().server.apiBaseUrl;
    BadgeLogger.debug('Getting badge image URL', {
      tier,
      tierName,
      baseUrl,
    });
    const imageUrl = `${baseUrl}/Badges/${tierName}.webp`;
    BadgeLogger.debug('Final image URL', { imageUrl });
    return imageUrl;
  }

  /**
   * Create BadgeImageData object using chunked upload pattern
   * This bypasses the 16KB pure argument limit by uploading in chunks
   */
  async createImageDataObjectChunked(
    imageData: Uint8Array,
    chunkSize: number = 14 * 1024 // 14KB chunks (safely under 16KB limit)
  ): Promise<string> {
    const client = this.dependencies.getClient();
    const config = this.dependencies.getConfig();
    const packageId = config.contracts.gameScore;
    const adminWallet = this.dependencies.getAdminWallet();
    const keypair = adminWallet.getKeypair();

    BadgeLogger.debug('Starting chunked upload', {
      imageSize: imageData.length,
      chunkSize,
    });
    
    // Calculate chunks
    const totalChunks = Math.ceil(imageData.length / chunkSize);
    BadgeLogger.debug('Chunk calculation', { totalChunks });
    
    // Build a single transaction that:
    // 1. Creates empty BadgeImageData object
    // 2. Appends all chunks sequentially
    // 3. Transfers the object to admin wallet
    const txb = new Transaction();
    
    // Step 1: Create empty BadgeImageData object
    const imageDataObj = txb.moveCall({
      target: `${packageId}::badge_system::create_empty_image_data`,
      arguments: [],
    });
    
    // Step 2: Append all chunks in the same transaction
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, imageData.length);
      const chunk = imageData.slice(start, end);
      
      BadgeLogger.debug('Adding chunk to batch', {
        chunkNumber: i + 1,
        totalChunks,
        chunkSize: chunk.length,
      });
      
      txb.moveCall({
        target: `${packageId}::badge_system::append_image_chunk`,
        arguments: [
          imageDataObj,
          txb.pure.vector('u8', Array.from(chunk)),
        ],
      });
    }
    
    // Step 3: Transfer the object to admin wallet
    txb.transferObjects([imageDataObj], adminWallet.getAddress());
    
    // Set gas budget - need higher budget for batched transaction
    const totalDataSize = imageData.length;
    const batchedGasBudget = Math.max(
      config.sui.gasBudget,
      300_000_000 + (totalChunks * 150_000_000) + (totalDataSize * 5000)
    );
    BadgeLogger.debug('Gas budget calculation', {
      batchedGasBudget,
      totalChunks,
      totalDataSize,
    });
    txb.setGasBudget(batchedGasBudget);
    
    // Check wallet balance
    const address = adminWallet.getAddress();
    const balance = await client.getBalance({ owner: address });
    const balanceInSUI = BigInt(balance.totalBalance) / BigInt(1_000_000_000);
    BadgeLogger.debug('Wallet balance check', {
      balance: balanceInSUI.toString(),
      required: (batchedGasBudget / 1_000_000_000).toFixed(4),
    });
    
    // Verify wallet has sufficient balance
    const requiredBalance = BigInt(batchedGasBudget) + BigInt(100_000_000);
    if (BigInt(balance.totalBalance) < requiredBalance) {
      throw new BadgeError(
        BadgeErrorCode.INSUFFICIENT_BALANCE,
        `Insufficient wallet balance. Need ${(Number(requiredBalance) / 1_000_000_000).toFixed(4)} SUI, have ${balanceInSUI.toString()} SUI`
      );
    }
    
    // Execute the batched transaction
    BadgeLogger.info('Executing batched transaction', { totalChunks });
    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: txb,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });

    if (result.effects?.status?.status !== 'success') {
      throw new BadgeError(
        BadgeErrorCode.TRANSACTION_FAILED,
        `Failed to create and upload chunks: ${result.effects?.status?.error || 'Unknown error'}`
      );
    }

    // Extract the object ID from the transaction effects
    const createdObjects = result.objectChanges?.filter(
      (change: any) => change.type === 'created' && change.objectType?.includes('BadgeImageData')
    );
    
    if (!createdObjects || createdObjects.length === 0) {
      throw new BadgeError(
        BadgeErrorCode.TRANSACTION_FAILED,
        'Failed to get BadgeImageData object ID from batched transaction'
      );
    }

    const imageDataObjectId = (createdObjects[0] as any).objectId;
    BadgeLogger.info('Created BadgeImageData object with chunks', {
      objectId: imageDataObjectId,
      totalChunks,
    });
    
    // Wait for transaction to be committed
    await client.waitForTransaction({
      digest: result.digest,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });
    BadgeLogger.debug('Transaction committed, object is ready');

    return imageDataObjectId;
  }
}

