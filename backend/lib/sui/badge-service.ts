// ==========================================
// Badge Service - Manages badge minting and tier updates
// ==========================================

import { Transaction } from '@mysten/sui/transactions';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { getConfig } from '@/config/config';
import { getAdminWalletService } from './admin-wallet-service';
import { getBadgeRetryQueue } from './badge-retry-queue';
import { validateAndSanitizeImage, getImageInfo } from './badge-image-validator';
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
          console.log(`✅ Loaded and validated badge image for tier ${tier} (${tierName}):`, {
            size: `${imageInfo.sizeKB}KB`,
            format: imageInfo.format,
            dimensions: imageInfo.width && imageInfo.height ? `${imageInfo.width}x${imageInfo.height}` : 'unknown',
          });
          
          this.imageCache.set(cacheKey, validatedImage);
          return validatedImage;
        } catch (validationError) {
          console.error(`❌ Image validation failed for tier ${tier} (${tierName}):`, validationError);
          throw new Error(`Invalid badge image file for tier ${tier}: ${validationError instanceof Error ? validationError.message : 'Unknown validation error'}`);
        }
      }
    } catch (error) {
      console.warn(`⚠️ Failed to load badge image for tier ${tier}:`, error);
      throw error; // Re-throw to trigger fallback to placeholder
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
   * Get static image URL for a badge tier
   * Maps tier to the corresponding static file in public/Badges/
   * @param tier - Badge tier (0-5)
   * @returns Full URL to the badge image (e.g., "http://localhost:3000/Badges/Common.webp")
   */
  public getBadgeImageUrl(tier: number): string {
    const tierNames = ['Standard', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
    const tierName = tierNames[tier] || 'Standard';
    const baseUrl = this.config.server.apiBaseUrl;
    console.log(`🖼️ [BADGE IMAGE URL] Config apiBaseUrl: ${baseUrl}`);
    console.log(`🖼️ [BADGE IMAGE URL] Environment check - VERCEL: ${process.env.VERCEL}, VERCEL_URL: ${process.env.VERCEL_URL}, NODE_ENV: ${process.env.NODE_ENV}`);
    const imageUrl = `${baseUrl}/Badges/${tierName}.webp`;
    console.log(`🖼️ [BADGE IMAGE URL] Final image URL: ${imageUrl}`);
    return imageUrl;
  }

  /**
   * Create BadgeImageData object using chunked upload pattern
   * This bypasses the 16KB pure argument limit by uploading in chunks
   * @param imageData - Full image data to upload
   * @param chunkSize - Size of each chunk in bytes (default: 14KB for safety)
   * @returns Object ID of the created BadgeImageData object
   */
  private async createImageDataObjectChunked(
    imageData: Uint8Array,
    chunkSize: number = 14 * 1024 // 14KB chunks (safely under 16KB limit)
  ): Promise<string> {
    const client = this.getClient();
    const packageId = this.config.contracts.gameScore;
    const keypair = this.adminWallet.getKeypair();

    console.log(`📦 [CHUNKED UPLOAD] Starting chunked upload for ${imageData.length} bytes`);
    console.log(`📦 [CHUNKED UPLOAD] Chunk size: ${chunkSize} bytes`);
    
    // Calculate chunks
    const totalChunks = Math.ceil(imageData.length / chunkSize);
    console.log(`📦 [CHUNKED UPLOAD] Will upload ${totalChunks} chunk(s) in a single batched transaction`);
    
    // Build a single transaction that:
    // 1. Creates empty BadgeImageData object
    // 2. Appends all chunks sequentially
    // 3. Transfers the object to admin wallet
    // This reduces 5 transactions to just 1!
    const txb = new Transaction();
    
    // Step 1: Create empty BadgeImageData object
    console.log(`📦 [CHUNKED UPLOAD] Creating empty BadgeImageData object and batching all chunks...`);
    const imageDataObj = txb.moveCall({
      target: `${packageId}::badge_system::create_empty_image_data`,
      arguments: [],
    });
    
    // Step 2: Append all chunks in the same transaction
    // Each append will modify the object sequentially within this transaction
    // IMPORTANT: Do this BEFORE transferring, so we can reference the object
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, imageData.length);
      const chunk = imageData.slice(start, end);
      
      console.log(`📦 [CHUNKED UPLOAD] Adding chunk ${i + 1}/${totalChunks} (${chunk.length} bytes) to batch...`);
      
      // Use the object reference from the create call
      // In Sui, we can reference the object created earlier in the same transaction
      txb.moveCall({
        target: `${packageId}::badge_system::append_image_chunk`,
        arguments: [
          imageDataObj, // Reference the object created above
          txb.pure.vector('u8', Array.from(chunk)),
        ],
      });
    }
    
    // Step 3: Transfer the object to admin wallet (after all chunks are appended)
    txb.transferObjects([imageDataObj], this.adminWallet.getAddress());
    
    // Set gas budget - need higher budget for batched transaction with multiple chunks
    // Each append operation modifies the object (storage cost) and processes data (computation cost)
    // Base budget + (chunk count * per-chunk overhead) + (total data size * per-byte cost)
    const totalDataSize = imageData.length;
    // More generous calculation: 300M base + 150M per chunk + 5000 per byte
    // This accounts for object modifications, storage costs, and computation
    const batchedGasBudget = Math.max(
      this.config.sui.gasBudget,
      300_000_000 + (totalChunks * 150_000_000) + (totalDataSize * 5000) // 300M base + 150M per chunk + 5000 per byte
    );
    console.log(`📦 [CHUNKED UPLOAD] Using gas budget: ${batchedGasBudget} MIST (${(batchedGasBudget / 1_000_000_000).toFixed(4)} SUI) for batched transaction`);
    txb.setGasBudget(batchedGasBudget);
    
    // Check wallet balance
    const address = this.adminWallet.getAddress();
    const balance = await client.getBalance({ owner: address });
    const balanceInSUI = BigInt(balance.totalBalance) / BigInt(1_000_000_000);
    console.log(`📦 [CHUNKED UPLOAD] Wallet balance: ${balanceInSUI.toString()} SUI (${balance.totalBalance} MIST)`);
    
    // Verify wallet has sufficient balance
    const requiredBalance = BigInt(batchedGasBudget) + BigInt(100_000_000); // Add 100M buffer
    if (BigInt(balance.totalBalance) < requiredBalance) {
      throw new Error(`Insufficient wallet balance. Need ${(Number(requiredBalance) / 1_000_000_000).toFixed(4)} SUI, have ${balanceInSUI.toString()} SUI`);
    }
    
    // Execute the batched transaction
    console.log(`📦 [CHUNKED UPLOAD] Executing batched transaction (create + ${totalChunks} chunks)...`);
    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: txb,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });

    if (result.effects?.status?.status !== 'success') {
      throw new Error(`Failed to create and upload chunks in batched transaction: ${result.effects?.status?.error || 'Unknown error'}`);
    }

    // Extract the object ID from the transaction effects
    const createdObjects = result.objectChanges?.filter(
      (change: any) => change.type === 'created' && change.objectType?.includes('BadgeImageData')
    );
    
    if (!createdObjects || createdObjects.length === 0) {
      throw new Error('Failed to get BadgeImageData object ID from batched transaction');
    }

    const imageDataObjectId = (createdObjects[0] as any).objectId;
    console.log(`✅ [CHUNKED UPLOAD] Created BadgeImageData object and uploaded all ${totalChunks} chunks in a single transaction!`);
    console.log(`✅ [CHUNKED UPLOAD] Object ID: ${imageDataObjectId}`);
    
    // Wait for transaction to be committed
    await client.waitForTransaction({
      digest: result.digest,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });
    console.log(`✅ [CHUNKED UPLOAD] Transaction committed, object is ready`);

    return imageDataObjectId;
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
      console.log(`🔍 [BADGE LOOKUP] Raw result object:`, result);
      console.log(`🔍 [BADGE LOOKUP] result.results:`, result.results);
      if (result.results && result.results.length > 0) {
        console.log(`🔍 [BADGE LOOKUP] First result:`, result.results[0]);
        console.log(`🔍 [BADGE LOOKUP] First result returnValues:`, result.results[0].returnValues);
        if (result.results[0].returnValues && result.results[0].returnValues.length > 0) {
          console.log(`🔍 [BADGE LOOKUP] First returnValue:`, result.results[0].returnValues[0]);
          console.log(`🔍 [BADGE LOOKUP] First returnValue stringified:`, JSON.stringify(result.results[0].returnValues[0], null, 2));
        }
      }
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
            fullReturnValue: rv, // Include full return value for inspection
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
        
        const returnValue = firstResult.returnValues?.[0] as any;
        if (returnValue) {
          console.log(`🔍 [BADGE LOOKUP] Found return value:`);
          console.log(`   - Full returnValue:`, JSON.stringify(returnValue, null, 2));
          console.log(`   - returnValue is array: ${Array.isArray(returnValue)}`);
          console.log(`   - returnValue length: ${Array.isArray(returnValue) ? returnValue.length : 'N/A'}`);
          
          // Based on the pattern found in gamePass.ts, the structure might be:
          // returnValue = [typeArray, value] where typeArray = [typeCode]
          // But if returnValue[1] is "bool" (type name), the actual value might be nested
          
          let actualValue: any = null;
          
          // Strategy 1: Check if returnValue[1] is the actual value (should be "0", "1", true, false)
          const value1 = returnValue[1];
          if (value1 === "0" || value1 === "1" || value1 === 0 || value1 === 1 || value1 === true || value1 === false) {
            actualValue = value1;
            console.log(`🔍 [BADGE LOOKUP] Strategy 1: Found value in returnValue[1]: ${actualValue}`);
          }
          // Strategy 2: Check if returnValue[0] is an array and contains the value
          else if (Array.isArray(returnValue[0])) {
            // returnValue[0] might be [typeCode] or [typeCode, value]
            if (returnValue[0].length > 1) {
              // Check if second element is the value
              const possibleValue = returnValue[0][1];
              if (possibleValue === "0" || possibleValue === "1" || possibleValue === 0 || possibleValue === 1 || possibleValue === true || possibleValue === false) {
                actualValue = possibleValue;
                console.log(`🔍 [BADGE LOOKUP] Strategy 2: Found value in returnValue[0][1]: ${actualValue}`);
              }
            }
            // Check if first element of nested array is the value (unlikely but possible)
            if (actualValue === null && returnValue[0].length > 0) {
              const possibleValue = returnValue[0][0];
              if (possibleValue === "0" || possibleValue === "1" || possibleValue === 0 || possibleValue === 1 || possibleValue === true || possibleValue === false) {
                actualValue = possibleValue;
                console.log(`🔍 [BADGE LOOKUP] Strategy 3: Found value in returnValue[0][0]: ${actualValue}`);
              }
            }
          }
          // Strategy 4: Check if there's a third element
          else if (Array.isArray(returnValue) && returnValue.length > 2) {
            const possibleValue = returnValue[2];
            if (possibleValue === "0" || possibleValue === "1" || possibleValue === 0 || possibleValue === 1 || possibleValue === true || possibleValue === false) {
              actualValue = possibleValue;
              console.log(`🔍 [BADGE LOOKUP] Strategy 4: Found value in returnValue[2]: ${actualValue}`);
            }
          }
          
          // If we still haven't found the value, check all elements
          if (actualValue === null && Array.isArray(returnValue)) {
            console.log(`🔍 [BADGE LOOKUP] Strategy 5: Searching all elements for boolean value...`);
            for (let i = 0; i < returnValue.length; i++) {
              const item = returnValue[i];
              // Skip type arrays and type names
              if (item === "bool" || (Array.isArray(item) && item.length === 1 && item[0] === 1)) {
                continue;
              }
              // Check if this is a boolean value
              if (item === "0" || item === "1" || item === 0 || item === 1 || item === true || item === false) {
                actualValue = item;
                console.log(`🔍 [BADGE LOOKUP] Strategy 5: Found value at index ${i}: ${actualValue}`);
                break;
              }
            }
          }
          
          // Parse the actual value
          let hasBadge = false;
          if (actualValue !== null && actualValue !== undefined) {
            if (actualValue === "1" || actualValue === 1 || actualValue === true) {
              hasBadge = true;
            } else if (actualValue === "0" || actualValue === 0 || actualValue === false) {
              hasBadge = false;
            }
            console.log(`🔍 [BADGE LOOKUP] Parsed value: ${hasBadge} (from ${actualValue})`);
          } else {
            console.error(`❌ [BADGE LOOKUP] Could not find actual boolean value in returnValue`);
            console.error(`❌ [BADGE LOOKUP] returnValue structure:`, JSON.stringify(returnValue, null, 2));
            // Default to false if we can't parse
            hasBadge = false;
          }
          
          console.log(`🔍 [BADGE LOOKUP] Final result: ${hasBadge}`);
          
          return hasBadge;
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
    imageUrl?: string;
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

      const returnValue = result1.results[0].returnValues[0] as any;
      console.log(`🔍 [BADGE LOOKUP] Raw returnValue from get_badge_id:`, JSON.stringify(returnValue, null, 2));
      console.log(`🔍 [BADGE LOOKUP] returnValue type: ${typeof returnValue}`);
      console.log(`🔍 [BADGE LOOKUP] returnValue is array: ${Array.isArray(returnValue)}`);
      console.log(`🔍 [BADGE LOOKUP] returnValue length: ${Array.isArray(returnValue) ? returnValue.length : 'N/A'}`);
      if (Array.isArray(returnValue) && returnValue.length > 0) {
        console.log(`🔍 [BADGE LOOKUP] returnValue[0]:`, returnValue[0]);
        console.log(`🔍 [BADGE LOOKUP] returnValue[0] type: ${typeof returnValue[0]}`);
        console.log(`🔍 [BADGE LOOKUP] returnValue[0] is array: ${Array.isArray(returnValue[0])}`);
        console.log(`🔍 [BADGE LOOKUP] returnValue[0] length: ${Array.isArray(returnValue[0]) ? returnValue[0].length : 'N/A'}`);
        if (returnValue.length > 1) {
          console.log(`🔍 [BADGE LOOKUP] returnValue[1]:`, returnValue[1]);
          console.log(`🔍 [BADGE LOOKUP] returnValue[1] type: ${typeof returnValue[1]}`);
        }
      }
      
      // The returnValue structure is [typeArray, typeNameString]
      // typeArray contains the BCS-encoded object ID bytes (32 bytes)
      // typeNameString is like "0x2::object::ID"
      // We need to extract the actual object ID from the type array
      let badgeId: string | null = null;
      
      if (Array.isArray(returnValue) && Array.isArray(returnValue[0]) && returnValue[0].length === 32) {
        // Convert byte array to hex string
        const bytes = returnValue[0] as number[];
        console.log(`🔍 [BADGE LOOKUP] Converting ${bytes.length} bytes to hex string...`);
        const hexString = bytes.map(byte => {
          const hex = byte.toString(16).padStart(2, '0');
          return hex;
        }).join('');
        badgeId = `0x${hexString}`;
        console.log(`🔍 [BADGE LOOKUP] ✅ Extracted badge ID from type array: ${badgeId}`);
        console.log(`🔍 [BADGE LOOKUP] Badge ID length: ${badgeId.length} (expected 66)`);
      } else if (Array.isArray(returnValue) && typeof returnValue[1] === 'string' && returnValue[1].startsWith('0x') && returnValue[1].length === 66) {
        // Fallback: if the value is already a valid object ID hex string, use it
        badgeId = returnValue[1];
        console.log(`🔍 [BADGE LOOKUP] ✅ Using badge ID from value string: ${badgeId}`);
      } else {
        console.error(`❌ [BADGE LOOKUP] Could not extract badge ID from returnValue`);
        console.error(`❌ [BADGE LOOKUP] returnValue structure:`, JSON.stringify(returnValue, null, 2));
        console.error(`❌ [BADGE LOOKUP] returnValue[0]:`, returnValue[0]);
        console.error(`❌ [BADGE LOOKUP] returnValue[0] is array: ${Array.isArray(returnValue[0])}`);
        console.error(`❌ [BADGE LOOKUP] returnValue[0] length: ${Array.isArray(returnValue[0]) ? returnValue[0].length : 'N/A'}`);
        if (Array.isArray(returnValue) && returnValue.length > 1) {
          console.error(`❌ [BADGE LOOKUP] returnValue[1]:`, returnValue[1]);
        }
        return null;
      }
      
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
      
      // Helper function to parse u64 from byte array (little-endian)
      const parseU64 = (byteArray: number[]): number => {
        if (!Array.isArray(byteArray) || byteArray.length !== 8) {
          console.error(`❌ [BADGE LOOKUP] Invalid u64 byte array:`, byteArray);
          return 0;
        }
        // Convert little-endian byte array to number
        let value = 0;
        for (let i = 0; i < 8; i++) {
          value += byteArray[i] * Math.pow(256, i);
        }
        return value;
      };
      
      // Parse tier (u8) - first element of the array
      const tierValue = Array.isArray(returnValues[1][0]) && returnValues[1][0].length > 0
        ? returnValues[1][0][0]
        : 0;
      
      // Parse u64 values (gamesPlayed, mintDate, lastUpdated)
      const gamesPlayedValue = Array.isArray(returnValues[2][0]) && returnValues[2][0].length === 8
        ? parseU64(returnValues[2][0] as number[])
        : 0;
      
      const mintDateValue = Array.isArray(returnValues[3][0]) && returnValues[3][0].length === 8
        ? parseU64(returnValues[3][0] as number[])
        : 0;
      
      const lastUpdatedValue = Array.isArray(returnValues[4][0]) && returnValues[4][0].length === 8
        ? parseU64(returnValues[4][0] as number[])
        : 0;
      
      // Get badge image URL
      console.log(`🔍 [BADGE LOOKUP] Fetching badge image URL...`);
      const tx3 = new Transaction();
      tx3.moveCall({
        target: `${this.config.contracts.gameScore}::badge_system::get_badge_image_url`,
        arguments: [tx3.object(badgeId)],
      });

      const result3 = await client.devInspectTransactionBlock({
        transactionBlock: tx3,
        sender: this.adminWallet.getAddress(),
      });

      let imageUrl: string | undefined;
      if (result3.results && result3.results[0]?.returnValues?.[0]) {
        const imageReturnValue = result3.results[0].returnValues[0] as any;
        console.log(`🔍 [BADGE LOOKUP] Raw image return value:`, JSON.stringify(imageReturnValue, null, 2));
        
        // The return value is a String, which comes as [byteArray, typeString]
        // Format: [[76, 104, 116, ...], "0x1::string::String"]
        if (Array.isArray(imageReturnValue) && imageReturnValue.length >= 2) {
          const byteArray = imageReturnValue[0];
          const typeString = imageReturnValue[1];
          
          // Check if first element is a byte array (array of numbers)
          if (Array.isArray(byteArray) && byteArray.length > 0 && typeof byteArray[0] === 'number') {
            // Convert byte array to string
            const potentialUrl = String.fromCharCode(...byteArray);
            if (potentialUrl.startsWith('http://') || potentialUrl.startsWith('https://')) {
              imageUrl = potentialUrl;
              console.log(`🔍 [BADGE LOOKUP] Image URL fetched from byte array: ${imageUrl}`);
            } else {
              console.warn(`⚠️ [BADGE LOOKUP] Converted string is not a valid URL:`, potentialUrl);
            }
          } else if (typeof byteArray === 'string' && (byteArray.startsWith('http://') || byteArray.startsWith('https://'))) {
            // Sometimes it might already be a string
            imageUrl = byteArray;
            console.log(`🔍 [BADGE LOOKUP] Image URL fetched from string: ${imageUrl}`);
          } else {
            console.warn(`⚠️ [BADGE LOOKUP] Unexpected byte array format:`, typeof byteArray, byteArray);
          }
        } else if (typeof imageReturnValue === 'string') {
          // Direct string value
          if (imageReturnValue.startsWith('http://') || imageReturnValue.startsWith('https://')) {
            imageUrl = imageReturnValue;
            console.log(`🔍 [BADGE LOOKUP] Image URL fetched (direct string): ${imageUrl}`);
          } else {
            console.warn(`⚠️ [BADGE LOOKUP] String value is not a valid URL:`, imageReturnValue);
          }
        } else {
          console.warn(`⚠️ [BADGE LOOKUP] Unexpected return value format:`, typeof imageReturnValue, imageReturnValue);
        }
      }
      
      // Fallback: If imageUrl is not valid, construct from tier
      if (!imageUrl || !imageUrl.startsWith('http')) {
        console.log(`🔍 [BADGE LOOKUP] Image URL not found or invalid, constructing from tier ${tierValue}`);
        imageUrl = this.getBadgeImageUrl(Number(tierValue));
        console.log(`🔍 [BADGE LOOKUP] Constructed image URL: ${imageUrl}`);
      }

      const badgeData = {
        badgeId,
        tier: Number(tierValue),
        gamesPlayed: gamesPlayedValue,
        mintDate: mintDateValue,
        lastUpdated: lastUpdatedValue,
        imageUrl,
      };
      
      console.log(`🔍 [BADGE LOOKUP] Parsed badge data:`, JSON.stringify({
        ...badgeData,
        imageUrl: imageUrl || 'none',
      }, null, 2));
      console.log(`🔍 [BADGE LOOKUP] Badge data validation:`);
      console.log(`   - badgeId valid: ${!!badgeData.badgeId && badgeData.badgeId.length === 66}`);
      console.log(`   - tier valid: ${badgeData.tier >= 0 && badgeData.tier <= 5}`);
      console.log(`   - gamesPlayed: ${badgeData.gamesPlayed}`);
      console.log(`   - imageUrl: ${imageUrl || 'none'}`);
      
      // Only convert to Date if the value is valid
      if (badgeData.mintDate > 0) {
        console.log(`   - mintDate: ${badgeData.mintDate} (${new Date(badgeData.mintDate).toISOString()})`);
      } else {
        console.log(`   - mintDate: ${badgeData.mintDate} (invalid/zero)`);
      }
      
      if (badgeData.lastUpdated > 0) {
        console.log(`   - lastUpdated: ${badgeData.lastUpdated} (${new Date(badgeData.lastUpdated).toISOString()})`);
      } else {
        console.log(`   - lastUpdated: ${badgeData.lastUpdated} (invalid/zero)`);
      }
      
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
   * NOTE: This function creates the BadgeImageData object server-side using chunked upload
   * The frontend receives the object ID to use in the transaction
   */
  async buildMintBadgeTransaction(
    playerAddress: string,
    paymentCoinId: string // Player's payment coin (SUI) for minting fee
  ): Promise<{
    success: boolean;
    transaction?: string; // Serialized transaction bytes (base64)
    gasEstimate?: string;
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

      // Load Standard tier badge image
      const imageData = await this.loadBadgeImage(0); // Tier 0 = Standard

      // Create BadgeImageData object using chunked upload (if >14KB) or direct (if ≤14KB)
      const CHUNK_THRESHOLD = 14 * 1024; // 14KB
      let imageDataObjectId: string;
      
      if (imageData.length > CHUNK_THRESHOLD) {
        console.log(`📦 [MINT BUILD] Image is ${imageData.length} bytes (>${CHUNK_THRESHOLD} bytes), using chunked upload...`);
        imageDataObjectId = await this.createImageDataObjectChunked(imageData);
      } else {
        console.log(`📦 [MINT BUILD] Image is ${imageData.length} bytes (≤${CHUNK_THRESHOLD} bytes), using direct upload...`);
        // Create directly in a single transaction
        const client = this.getClient();
        const txbCreate = new Transaction();
        const imageDataObj = txbCreate.moveCall({
          target: `${this.config.contracts.gameScore}::badge_system::create_image_data_small`,
          arguments: [
            txbCreate.pure.vector('u8', Array.from(imageData)),
          ],
        });
        txbCreate.transferObjects([imageDataObj], this.adminWallet.getAddress());
        txbCreate.setGasBudget(this.config.sui.gasBudget);

        const resultCreate = await client.signAndExecuteTransaction({
          signer: this.adminWallet.getKeypair(),
          transaction: txbCreate,
          options: {
            showEffects: true,
            showObjectChanges: true,
          },
        });

        if (resultCreate.effects?.status?.status !== 'success') {
          throw new Error(`Failed to create BadgeImageData object: ${resultCreate.effects?.status?.error || 'Unknown error'}`);
        }

        const createdObjects = resultCreate.objectChanges?.filter(
          (change: any) => change.type === 'created' && change.objectType?.includes('BadgeImageData')
        );
        
        if (!createdObjects || createdObjects.length === 0) {
          throw new Error('Failed to get BadgeImageData object ID from transaction');
        }

        imageDataObjectId = (createdObjects[0] as any).objectId;
        console.log(`✅ [MINT BUILD] Created BadgeImageData object: ${imageDataObjectId}`);
      }

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

      // Build transaction
      const txb = new Transaction();
      
      // Call mint_badge function
      txb.moveCall({
        target: `${this.config.contracts.gameScore}::badge_system::mint_badge`,
        arguments: [
          txb.object(this.config.contracts.badgeRegistry),
          txb.object(statsRegistryId),
          txb.object(clockId),
          txb.object(paymentCoinId),
          txb.object(imageDataObjectId), // Pre-populated BadgeImageData object
        ],
      });

      // Set sender (required for building transaction, even if not signing)
      txb.setSender(playerAddress);

      // Estimate gas (add 15% buffer)
      const gasEstimate = this.config.sui.gasBudget;
      const gasWithBuffer = Math.round(gasEstimate * 1.15);
      txb.setGasBudget(gasWithBuffer);

      // Build transaction (don't sign - frontend will sign)
      const client = this.getClient();
      const transactionBytes = await txb.build({ client });

      console.log('✅ [MINT BUILD] Transaction built successfully');
      console.log(`   Gas estimate: ${gasWithBuffer} MIST (${(gasWithBuffer / 1_000_000_000).toFixed(4)} SUI)`);

      return {
        success: true,
        transaction: Buffer.from(transactionBytes).toString('base64'),
        gasEstimate: gasWithBuffer.toString(),
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
      // Load new tier's badge image (validated during load)
      const imageData = await this.loadBadgeImage(newTier);
      
      // Additional validation before building transaction (double-check)
      try {
        validateAndSanitizeImage(imageData);
      } catch (validationError) {
        console.error('❌ [BADGE UPDATE] Image validation failed after load:', validationError);
        throw new Error(`Invalid badge image for tier ${newTier}: ${validationError instanceof Error ? validationError.message : 'Unknown error'}`);
      }

      // Create BadgeImageData object using chunked upload (if >14KB) or direct (if ≤14KB)
      const CHUNK_THRESHOLD = 14 * 1024; // 14KB
      let imageDataObjectId: string;
      
      if (imageData.length > CHUNK_THRESHOLD) {
        console.log(`📦 [BADGE UPDATE] Image is ${imageData.length} bytes (>${CHUNK_THRESHOLD} bytes), using chunked upload...`);
        imageDataObjectId = await this.createImageDataObjectChunked(imageData);
      } else {
        console.log(`📦 [BADGE UPDATE] Image is ${imageData.length} bytes (≤${CHUNK_THRESHOLD} bytes), using direct upload...`);
        // Create directly in a single transaction
        const client = this.getClient();
        const txbCreate = new Transaction();
        const imageDataObj = txbCreate.moveCall({
          target: `${this.config.contracts.gameScore}::badge_system::create_image_data_small`,
          arguments: [
            txbCreate.pure.vector('u8', Array.from(imageData)),
          ],
        });
        txbCreate.transferObjects([imageDataObj], this.adminWallet.getAddress());
        txbCreate.setGasBudget(this.config.sui.gasBudget);

        const resultCreate = await client.signAndExecuteTransaction({
          signer: this.adminWallet.getKeypair(),
          transaction: txbCreate,
          options: {
            showEffects: true,
            showObjectChanges: true,
          },
        });

        if (resultCreate.effects?.status?.status !== 'success') {
          throw new Error(`Failed to create BadgeImageData object: ${resultCreate.effects?.status?.error || 'Unknown error'}`);
        }

        const createdObjects = resultCreate.objectChanges?.filter(
          (change: any) => change.type === 'created' && change.objectType?.includes('BadgeImageData')
        );
        
        if (!createdObjects || createdObjects.length === 0) {
          throw new Error('Failed to get BadgeImageData object ID from transaction');
        }

        imageDataObjectId = (createdObjects[0] as any).objectId;
        console.log(`✅ [BADGE UPDATE] Created BadgeImageData object: ${imageDataObjectId}`);
      }

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
            imageDataObjectId, // Pre-populated BadgeImageData object ID
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

      // Step 6: Get badge image URL for the tier
      console.log(`\n📋 [ADMIN MINT] Step 6: Getting badge image URL for tier ${tier}...`);
      const imageUrl = this.getBadgeImageUrl(tier);
      console.log(`✅ [ADMIN MINT] Badge image URL: ${imageUrl}`);

      // Step 7: Build mint transaction
      console.log(`\n📋 [ADMIN MINT] Step 7: Building mint transaction...`);
      
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
      console.log(`   - imageUrl: ${imageUrl}`);

      txb.moveCall({
        target: moveCallTarget,
        arguments: [
          txb.object(adminCapabilityObjectId),  // Admin capability
          txb.object(registryObjectId),         // Badge registry
          txb.object(statsRegistryObjectId),     // Statistics registry
          txb.object('0x6'),                     // Clock
          txb.pure.address(playerAddress),      // Player address
          txb.pure.u8(tier),                    // Tier
          txb.pure.string(imageUrl),           // URL to static badge image
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
        console.log(`✅ [ADMIN MINT] Image URL: ${imageUrl}`);
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
      { store: 0, gameplay: 0 },    // Standard
      { store: 5, gameplay: 0 },     // Common
      { store: 10, gameplay: 5 },    // Uncommon
      { store: 15, gameplay: 10 },   // Rare
      { store: 20, gameplay: 15 },   // Epic
      { store: 25, gameplay: 20 },   // Legendary
    ];
    return discounts[tier] || discounts[0];
  }

  /**
   * Build migration transaction for player to sign
   * This allows players to migrate their badge from old contract to new contract
   * Player must provide old badge data and old badge object ID
   * The old badge will be burned (deleted) after the new badge is created
   * The player address is determined from the transaction signer
   * Player pays gas fees for creating new badge + deleting old badge
   * NOTE: This function creates the BadgeImageData object server-side using chunked upload
   * 
   * @param oldBadgeId - Object ID of the old badge to be burned
   * @param oldTier - Tier from old badge
   * @param oldGamesPlayed - Games played from old badge
   * @param oldMintDate - Original mint date from old badge
   * @param imageData - Badge image data (WebP bytes)
   */
  async buildMigrateBadgeTransaction(
    oldBadgeId: string,
    oldTier: number,
    oldGamesPlayed: number,
    oldMintDate: number,
    imageUrl: string,
    oldPackageId?: string
  ): Promise<Transaction> {
    if (!this.config.contracts.badgeRegistry || !this.config.contracts.statisticsRegistry) {
      throw new Error('BadgeRegistry or StatisticsRegistry not configured');
    }

    // Validate image URL format
    if (!imageUrl || typeof imageUrl !== 'string' || (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://'))) {
      throw new Error('Invalid image URL. Must be a valid HTTP/HTTPS URL.');
    }

    // Get old package ID from parameter or environment
    const finalOldPackageId = oldPackageId || 
      process.env.OLD_GAME_SCORE_CONTRACT_TESTNET || 
      process.env.OLD_GAME_SCORE_CONTRACT;

    console.log(`✅ [MIGRATION] Building migration transaction with image URL: ${imageUrl}`);
    if (finalOldPackageId) {
      console.log(`✅ [MIGRATION] Old package ID: ${finalOldPackageId}`);
      console.log(`✅ [MIGRATION] Old badge ID: ${oldBadgeId}`);
    }

    const txb = new Transaction();
    
    // STEP 1: Migrate badge (create new badge)
    // This must succeed before we delete the old badge
    txb.moveCall({
      target: `${this.config.contracts.gameScore}::badge_system::migrate_badge`,
      arguments: [
        txb.object(this.config.contracts.badgeRegistry),
        txb.object(this.config.contracts.statisticsRegistry),
        txb.object('0x6'), // Clock object (well-known shared object)
        txb.pure.u8(oldTier),
        txb.pure.u64(oldGamesPlayed),
        txb.pure.u64(oldMintDate),
        txb.pure.string(imageUrl), // Image URL string (not BadgeImageData object)
      ],
    });

    // STEP 2: Delete old badge (if old package ID and badge ID are provided)
    // This is done atomically in the same transaction - if migration fails, deletion won't happen
    // If deletion fails, the entire transaction fails (atomic)
    // 
    // NOTE: This assumes the old badge module has a public delete function.
    // Common function names: delete_badge(badge) or burn_badge(badge)
    // The function must take the badge object as an argument (player owns it, so they can pass it)
    // 
    // If the old module doesn't have such a function, this will fail at transaction build time.
    // In that case, the migration will need to be done without deletion, and the player
    // will need to manually delete the old badge.
    if (finalOldPackageId && oldBadgeId) {
      // Try to call delete_badge from the old package
      // This is the most common pattern for deleting soulbound NFTs
      // The function signature should be: public entry fun delete_badge(badge: OldBadge)
      txb.moveCall({
        target: `${finalOldPackageId}::badge_system::delete_badge`,
        arguments: [
          txb.object(oldBadgeId), // Old badge object (player owns it, so they can pass it)
        ],
      });
      console.log(`✅ [MIGRATION] Added delete_badge call to transaction`);
      console.log(`   Old package: ${finalOldPackageId}`);
      console.log(`   Old badge ID: ${oldBadgeId}`);
      console.log(`   ⚠️  If delete_badge doesn't exist in old package, transaction will fail at build time`);
    } else {
      console.log(`ℹ️ [MIGRATION] Old package ID or badge ID not provided. Old badge deletion skipped.`);
      console.log(`ℹ️ [MIGRATION] Player will need to manually delete the old badge.`);
    }

    txb.setGasBudget(this.config.sui.gasBudget * 2); // Increase gas budget for two operations

    return txb;
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
      const badgeId = badge.badgeId;

      // Construct image URL if not provided
      // Use the static file URL based on tier
      const url = imageUrl || this.getBadgeImageUrl(badge.tier);

      console.log(`🖼️ [UPDATE IMAGE URL] Updating badge image URL for ${playerAddress}`);
      console.log(`🖼️ [UPDATE IMAGE URL] Badge ID: ${badgeId}`);
      console.log(`🖼️ [UPDATE IMAGE URL] Image URL: ${url}`);

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
        console.log(`✅ [UPDATE IMAGE URL] Successfully updated badge image URL`);
        console.log(`✅ [UPDATE IMAGE URL] Transaction digest: ${result.digest}`);
        return { success: true };
      } else {
        const errorMsg = result.effects?.status?.error || 'Unknown error';
        console.error(`❌ [UPDATE IMAGE URL] Failed to update badge image URL: ${errorMsg}`);
        return {
          success: false,
          error: errorMsg,
        };
      }
    } catch (error) {
      console.error(`❌ [UPDATE IMAGE URL] Error updating badge image URL:`, error);
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

