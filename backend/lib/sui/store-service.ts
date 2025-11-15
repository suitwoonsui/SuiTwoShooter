// ==========================================
// Store Service - Handles premium store blockchain operations
// ==========================================

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { getConfig } from '@/config/config';
import { getAdminWalletService } from './admin-wallet-service';

/**
 * StoreService - Handles store-related blockchain operations
 * - Query player inventory
 * - Build purchase transactions
 * - Consume items (admin wallet)
 */
export class StoreService {
  private client: SuiClient;
  private config: ReturnType<typeof getConfig>;
  private adminWallet: ReturnType<typeof getAdminWalletService>;

  constructor() {
    this.config = getConfig();
    
    // Initialize Sui client
    const network = this.config.sui.network;
    const rpcUrl = network === 'testnet' 
      ? getFullnodeUrl('testnet')
      : network === 'mainnet'
      ? getFullnodeUrl('mainnet')
      : this.config.sui.rpcUrl;

    this.client = new SuiClient({ url: rpcUrl });
    this.adminWallet = getAdminWalletService();
    
    console.log(`✅ StoreService initialized for ${network}`);
  }

  /**
   * Get player's inventory from blockchain
   * Queries PlayerInventory object for the given address
   * 
   * @param playerAddress - Wallet address to query
   * @returns Inventory object with item counts
   */
  async getInventory(playerAddress: string): Promise<{
    success: boolean;
    inventory?: Record<string, number>;
    error?: string;
  }> {
    try {
      // Validate address format
      if (!playerAddress || !playerAddress.startsWith('0x') || playerAddress.length !== 66) {
        return {
          success: false,
          error: 'Invalid player address format',
        };
      }

      const contractAddress = this.config.contracts.premiumStore;
      
      if (!contractAddress || contractAddress === '' || contractAddress === '0x...') {
        // Contract not deployed yet - return empty inventory
        console.warn('⚠️ Premium store contract not configured. Returning empty inventory.');
        return {
          success: true,
          inventory: {},
        };
      }

      // Parse package ID from contract address
      const packageId = contractAddress.includes('::') 
        ? contractAddress.split('::')[0]
        : contractAddress;

      // Get PremiumStore object ID
      const storeObjectId = this.config.contracts.premiumStoreObject;
      
      if (!storeObjectId || storeObjectId === '' || storeObjectId === '0x...') {
        console.warn('⚠️ Premium store object ID not configured. Returning empty inventory.');
        return {
          success: true,
          inventory: {},
        };
      }

      console.log(`📦 [INVENTORY] Querying inventory for ${playerAddress}`);

      // Query the dynamic object field directly
      // The PlayerInventory is stored as a dynamic field on PremiumStore with key = player address
      try {
        // First, try to get the dynamic field object directly
        // The name format for address type: { type: 'address', value: address }
        const dynamicFieldName = {
          type: 'address',
          value: playerAddress,
        };

        let dynamicField;
        try {
          // Try getDynamicFieldObject first (returns the object directly)
          dynamicField = await this.client.getDynamicFieldObject({
            parentId: storeObjectId,
            name: dynamicFieldName,
          });
        } catch (directError) {
          // If direct query fails, try listing all dynamic fields and finding the one we need
          console.log('⚠️ [INVENTORY] Direct query failed, trying getDynamicFields...');
          const allFields = await this.client.getDynamicFields({
            parentId: storeObjectId,
          });
          
          // Find the field with matching address
          const matchingField = allFields.data.find(
            (field: any) => field.name?.type === 'address' && field.name?.value === playerAddress
          );
          
          if (!matchingField) {
            console.log('📦 [INVENTORY] No inventory found for player (first time player)');
            return {
              success: true,
              inventory: {},
            };
          }
          
          // Get the actual PlayerInventory object
          dynamicField = await this.client.getObject({
            id: matchingField.objectId,
            options: { showContent: true },
          });
        }

        // Check if the field exists
        // getDynamicFieldObject returns { data: { content: {...} } }
        // getObject returns { data: { content: {...} } }
        // Both should have the same structure
        const fieldData = dynamicField.data || dynamicField;
        if (!fieldData || !fieldData.content) {
          console.log('📦 [INVENTORY] No inventory found for player (first time player)');
          return {
            success: true,
            inventory: {},
          };
        }

        // Parse the PlayerInventory object
        const inventoryData = fieldData.content as any;
        if (!inventoryData || inventoryData.fields === undefined) {
          console.warn('⚠️ [INVENTORY] Invalid inventory object structure');
          return {
            success: true,
            inventory: {},
          };
        }

        // Map the Move struct fields to our inventory format
        // Contract fields: extra_lives_level_1, force_field_level_1, etc.
        // Our format: extraLives_1, forceField_1, etc.
        const inventory: Record<string, number> = {};

        // Extra Lives
        if (inventoryData.fields.extra_lives_level_1) inventory['extraLives_1'] = Number(inventoryData.fields.extra_lives_level_1);
        if (inventoryData.fields.extra_lives_level_2) inventory['extraLives_2'] = Number(inventoryData.fields.extra_lives_level_2);
        if (inventoryData.fields.extra_lives_level_3) inventory['extraLives_3'] = Number(inventoryData.fields.extra_lives_level_3);

        // Force Field
        if (inventoryData.fields.force_field_level_1) inventory['forceField_1'] = Number(inventoryData.fields.force_field_level_1);
        if (inventoryData.fields.force_field_level_2) inventory['forceField_2'] = Number(inventoryData.fields.force_field_level_2);
        if (inventoryData.fields.force_field_level_3) inventory['forceField_3'] = Number(inventoryData.fields.force_field_level_3);

        // Orb Level
        if (inventoryData.fields.orb_level_1) inventory['orbLevel_1'] = Number(inventoryData.fields.orb_level_1);
        if (inventoryData.fields.orb_level_2) inventory['orbLevel_2'] = Number(inventoryData.fields.orb_level_2);
        if (inventoryData.fields.orb_level_3) inventory['orbLevel_3'] = Number(inventoryData.fields.orb_level_3);

        // Slow Time
        if (inventoryData.fields.slow_time_level_1) inventory['slowTime_1'] = Number(inventoryData.fields.slow_time_level_1);
        if (inventoryData.fields.slow_time_level_2) inventory['slowTime_2'] = Number(inventoryData.fields.slow_time_level_2);
        if (inventoryData.fields.slow_time_level_3) inventory['slowTime_3'] = Number(inventoryData.fields.slow_time_level_3);

        // Destroy All (single level)
        if (inventoryData.fields.destroy_all_enemies) inventory['destroyAll_1'] = Number(inventoryData.fields.destroy_all_enemies);

        // Boss Kill Shot (single level)
        if (inventoryData.fields.boss_kill_shot) inventory['bossKillShot_1'] = Number(inventoryData.fields.boss_kill_shot);

        // Coin Tractor Beam
        if (inventoryData.fields.coin_tractor_beam_level_1) inventory['coinTractorBeam_1'] = Number(inventoryData.fields.coin_tractor_beam_level_1);
        if (inventoryData.fields.coin_tractor_beam_level_2) inventory['coinTractorBeam_2'] = Number(inventoryData.fields.coin_tractor_beam_level_2);
        if (inventoryData.fields.coin_tractor_beam_level_3) inventory['coinTractorBeam_3'] = Number(inventoryData.fields.coin_tractor_beam_level_3);

        // Filter out zero counts (cleaner output)
        const filteredInventory: Record<string, number> = {};
        for (const [key, value] of Object.entries(inventory)) {
          if (value > 0) {
            filteredInventory[key] = value;
          }
        }

        console.log(`✅ [INVENTORY] Inventory loaded:`, filteredInventory);
        
        return {
          success: true,
          inventory: filteredInventory,
        };
      } catch (error) {
        // If dynamic field doesn't exist, player has no inventory yet
        if (error instanceof Error && error.message.includes('not found')) {
          console.log('📦 [INVENTORY] No inventory found for player (first time player)');
          return {
            success: true,
            inventory: {},
          };
        }
        
        console.error('❌ [INVENTORY] Error querying dynamic field:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error querying inventory',
        };
      }
    } catch (error) {
      console.error('❌ [INVENTORY] Error querying inventory:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Build purchase transaction
   * Creates an unsigned transaction that includes:
   * 1. Payment transfer (player pays)
   * 2. purchase_item() call
   * 
   * @param playerAddress - Player's wallet address
   * @param items - Array of items to purchase
   * @param paymentToken - Token to pay with ('SUI', 'MEWS', or 'USDC')
   * @param totalTokenAmount - Total amount in token (with decimals)
   * @returns Unsigned transaction bytes
   */
  async buildPurchaseTransaction(
    playerAddress: string,
    items: Array<{ itemId: string; level: number; quantity: number }>,
    paymentToken: 'SUI' | 'MEWS' | 'USDC',
    totalTokenAmount: string
  ): Promise<{
    success: boolean;
    transaction?: string; // Serialized transaction bytes (base64)
    gasEstimate?: string;
    error?: string;
  }> {
    try {
      // Validate inputs
      if (!playerAddress || !playerAddress.startsWith('0x') || playerAddress.length !== 66) {
        return {
          success: false,
          error: 'Invalid player address format',
        };
      }

      if (!items || items.length === 0) {
        return {
          success: false,
          error: 'No items specified',
        };
      }

      const contractAddress = this.config.contracts.premiumStore;
      
      if (!contractAddress || contractAddress === '' || contractAddress === '0x...') {
        return {
          success: false,
          error: 'Premium store contract not configured. Please set PREMIUM_STORE_CONTRACT environment variable.',
        };
      }

      // Parse package ID from contract address
      const packageId = contractAddress.includes('::') 
        ? contractAddress.split('::')[0]
        : contractAddress;

      // Get store object ID from config (will be set after contract deployment)
      const storeObjectId = this.config.contracts.premiumStoreObject;
      
      if (!storeObjectId || storeObjectId === '' || storeObjectId === '0x...') {
        return {
          success: false,
          error: 'Premium store object ID not configured. Please set PREMIUM_STORE_OBJECT_ID environment variable after contract deployment.',
        };
      }

      console.log(`🛒 [PURCHASE] Building transaction for ${playerAddress}`);
      console.log(`   Items: ${items.length}`);
      console.log(`   Payment token: ${paymentToken}`);
      console.log(`   Total amount: ${totalTokenAmount}`);

      // Build transaction
      const txb = new Transaction();

      // Convert item IDs to contract item types (u8)
      // This mapping will need to match the contract's item type enum
      const itemTypeMap: Record<string, number> = {
        'extraLives': 0,
        'forceField': 1,
        'orbLevel': 2,
        'slowTime': 3,
        'destroyAll': 4,
        'bossKillShot': 5,
        'coinTractorBeam': 6,
      };

      // Convert payment token to u8
      const paymentTokenMap: Record<string, number> = {
        'SUI': 0,
        'MEWS': 1,
        'USDC': 2,
      };
      const paymentTokenValue = paymentTokenMap[paymentToken];
      
      if (paymentTokenValue === undefined) {
        return {
          success: false,
          error: `Invalid payment token: ${paymentToken}`,
        };
      }

      // Calculate payment per item (split total amount across all items)
      const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
      const paymentPerItem = BigInt(totalTokenAmount) / BigInt(totalItems);

      // For each item, call purchase_item()
      // The contract accepts quantity parameter, so we call it once per item type/level
      for (const item of items) {
        const itemType = itemTypeMap[item.itemId];
        
        if (itemType === undefined) {
          return {
            success: false,
            error: `Unknown item ID: ${item.itemId}`,
          };
        }

        // Call purchase_item once with quantity parameter
        // Contract signature: purchase_item(store, clock, player, item_type, item_level, quantity, amount_paid, payment_token)
        txb.moveCall({
          target: `${packageId}::premium_store::purchase_item`,
          arguments: [
            txb.object(storeObjectId),
            txb.object('0x6'), // Clock object (standard Sui Clock)
            txb.pure.address(playerAddress),
            txb.pure.u8(itemType),
            txb.pure.u8(item.level),
            txb.pure.u64(item.quantity),
            txb.pure.u64(paymentPerItem * BigInt(item.quantity)), // Total payment for this item
            txb.pure.u8(paymentTokenValue),
          ],
        });
      }

      // Handle payment transfer
      // The payment token transfer needs to happen before the purchase_item calls
      // We'll need to split coins from the player's gas/payment token balance
      
      // For SUI: Use gas coin
      // For MEWS/USDC: Need to transfer from player's token balance
      // This is complex - the frontend will need to handle the payment transfer
      // For now, we'll build the purchase calls and let the frontend handle payment
      
      // TODO: Add payment transfer logic based on payment token type
      // For SUI: txb.splitCoins(txb.gas, [totalTokenAmount])
      // For MEWS/USDC: Need to transfer from player's coin objects

      // Set sender (required for building transaction, even if not signing)
      txb.setSender(playerAddress);

      // Estimate gas (add 15% buffer as per discussion)
      const gasEstimate = this.config.sui.gasBudget;
      const gasWithBuffer = Math.round(gasEstimate * 1.15);
      txb.setGasBudget(gasWithBuffer);

      // Build transaction (don't sign - frontend will sign)
      const transactionBytes = await txb.build({ client: this.client });

      console.log('✅ [PURCHASE] Transaction built successfully');
      console.log(`   Gas estimate: ${gasWithBuffer} MIST (${(gasWithBuffer / 1_000_000_000).toFixed(4)} SUI)`);

      return {
        success: true,
        transaction: Buffer.from(transactionBytes).toString('base64'),
        gasEstimate: gasWithBuffer.toString(),
      };
    } catch (error) {
      console.error('❌ [PURCHASE] Error building transaction:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Consume items from inventory (admin wallet)
   * Called when player starts a game and uses purchased items
   * 
   * @param playerAddress - Player's wallet address
   * @param items - Array of items to consume
   * @returns Transaction digest
   */
  async consumeItems(
    playerAddress: string,
    items: Array<{ itemId: string; level: number; quantity: number }>
  ): Promise<{
    success: boolean;
    digest?: string;
    error?: string;
  }> {
    console.log('🍽️ [STORE SERVICE] consumeItems called');
    console.log(`   Player: ${playerAddress}`);
    console.log(`   Items: ${JSON.stringify(items)}`);
    
    try {
      // Validate inputs
      if (!playerAddress || !playerAddress.startsWith('0x') || playerAddress.length !== 66) {
        console.error('❌ [STORE SERVICE] Invalid player address format');
        return {
          success: false,
          error: 'Invalid player address format',
        };
      }

      if (!items || items.length === 0) {
        return {
          success: false,
          error: 'No items specified',
        };
      }

      const contractAddress = this.config.contracts.premiumStore;
      
      if (!contractAddress || contractAddress === '' || contractAddress === '0x...') {
        return {
          success: false,
          error: 'Premium store contract not configured',
        };
      }

      // Parse package ID (will be updated if admin capability is from different package)
      let packageId = contractAddress.includes('::') 
        ? contractAddress.split('::')[0]
        : contractAddress;

      // Get admin capability for premium store (MUST be separate from score submission)
      // Note: premium_store::AdminCapability is a different type than score_submission::AdminCapability
      const adminCapabilityObjectId = this.config.contracts.premiumStoreAdminCapability;
      
      console.log(`🍽️ [STORE SERVICE] Admin capability object ID: ${adminCapabilityObjectId || 'NOT SET'}`);
      
      if (!adminCapabilityObjectId || adminCapabilityObjectId === '' || adminCapabilityObjectId === '0x...') {
        return {
          success: false,
          error: 'Premium store admin capability not configured. Please set PREMIUM_STORE_ADMIN_CAPABILITY_OBJECT_ID_TESTNET (or PREMIUM_STORE_ADMIN_CAPABILITY_OBJECT_ID_MAINNET for mainnet) environment variable. This is different from the score submission admin capability.',
        };
      }

      // Verify the admin capability object type
      try {
        const network = this.config.sui.network;
        const client = network === 'testnet' 
          ? this.adminWallet.getTestnetClient()
          : this.adminWallet.getMainnetClient();
        
        const adminCapObject = await client.getObject({
          id: adminCapabilityObjectId,
          options: { showType: true },
        });

        if (adminCapObject.error) {
          console.error(`❌ [STORE SERVICE] Admin capability object not found: ${adminCapabilityObjectId}`);
          return {
            success: false,
            error: `Admin capability object not found: ${adminCapabilityObjectId}. Please verify the object ID is correct.`,
          };
        }

        const objectType = adminCapObject.data?.type || 'unknown';
        console.log(`🍽️ [STORE SERVICE] Admin capability object type: ${objectType}`);
        
        // Check if it's the correct type
        if (!objectType.includes('premium_store::AdminCapability')) {
          console.error(`❌ [STORE SERVICE] Wrong admin capability type! Expected: premium_store::AdminCapability, Got: ${objectType}`);
          return {
            success: false,
            error: `Wrong admin capability type! The object at ${adminCapabilityObjectId} is of type ${objectType}, but expected premium_store::AdminCapability. Please use the premium_store admin capability, not the score_submission admin capability.`,
          };
        }

        // Extract package ID from admin capability object type
        // Format: <package_id>::premium_store::AdminCapability
        const adminCapPackageId = objectType.split('::')[0];
        console.log(`🍽️ [STORE SERVICE] Admin capability package ID: ${adminCapPackageId}`);
        
        // Use the package ID from the admin capability object (they must match)
        if (adminCapPackageId !== packageId) {
          console.warn(`⚠️ [STORE SERVICE] Package ID mismatch!`);
          console.warn(`   Contract package ID: ${packageId}`);
          console.warn(`   Admin capability package ID: ${adminCapPackageId}`);
          console.warn(`   Using admin capability package ID for transaction...`);
          // Use the package ID from the admin capability
          packageId = adminCapPackageId;
        }
      } catch (error) {
        console.error('❌ [STORE SERVICE] Error verifying admin capability:', error);
        // Continue anyway - the transaction will fail with a clearer error if it's wrong
      }

      // Get store object ID
      const storeObjectId = this.config.contracts.premiumStoreObject;
      
      console.log(`🍽️ [STORE SERVICE] Store object ID: ${storeObjectId || 'NOT SET'}`);
      
      if (!storeObjectId || storeObjectId === '' || storeObjectId === '0x...') {
        return {
          success: false,
          error: 'Premium store object ID not configured',
        };
      }

      // Verify the PremiumStore object and get its package ID
      // This ensures we use the correct package that the store was deployed with
      try {
        const network = this.config.sui.network;
        const client = network === 'testnet' 
          ? this.adminWallet.getTestnetClient()
          : this.adminWallet.getMainnetClient();
        
        const storeObject = await client.getObject({
          id: storeObjectId,
          options: { showType: true },
        });

        if (storeObject.error) {
          console.error(`❌ [STORE SERVICE] PremiumStore object not found: ${storeObjectId}`);
          return {
            success: false,
            error: `PremiumStore object not found: ${storeObjectId}. Please verify the object ID is correct.`,
          };
        }

        const storeObjectType = storeObject.data?.type || 'unknown';
        console.log(`🍽️ [STORE SERVICE] PremiumStore object type: ${storeObjectType}`);
        
        // Extract package ID from PremiumStore object type
        // Format: <package_id>::premium_store::PremiumStore
        const storePackageId = storeObjectType.split('::')[0];
        console.log(`🍽️ [STORE SERVICE] PremiumStore package ID: ${storePackageId}`);
        
        // Use the package ID from the PremiumStore object (must match)
        if (storePackageId !== packageId) {
          console.warn(`⚠️ [STORE SERVICE] Package ID mismatch!`);
          console.warn(`   Config package ID: ${packageId}`);
          console.warn(`   PremiumStore package ID: ${storePackageId}`);
          console.warn(`   Using PremiumStore package ID for transaction...`);
          // Use the package ID from the PremiumStore object
          packageId = storePackageId;
        }
      } catch (error) {
        console.error('❌ [STORE SERVICE] Error verifying PremiumStore object:', error);
        // Continue anyway - the transaction will fail with a clearer error if it's wrong
      }
      
      console.log(`🍽️ [STORE SERVICE] Package ID (final): ${packageId}`);

      console.log(`🍽️ [CONSUME] Consuming items for ${playerAddress}`);
      console.log(`   Items: ${items.length}`);

      // Item type mapping (needed for pre-check and transaction)
      const itemTypeMap: Record<string, number> = {
        'extraLives': 0,
        'forceField': 1,
        'orbLevel': 2,
        'slowTime': 3,
        'destroyAll': 4,
        'bossKillShot': 5,
        'coinTractorBeam': 6,
      };

      // Validate item levels before processing
      for (const item of items) {
        // Single-level items (destroyAll, bossKillShot) should have level 1
        if ((item.itemId === 'destroyAll' || item.itemId === 'bossKillShot') && item.level !== 1) {
          return {
            success: false,
            error: `${item.itemId} is a single-level item and must have level 1, got level ${item.level}`,
          };
        }
        // Multi-level items must have level 1-3
        if (item.itemId !== 'destroyAll' && item.itemId !== 'bossKillShot') {
          if (item.level < 1 || item.level > 3) {
            return {
              success: false,
              error: `Invalid level for ${item.itemId}: ${item.level}. Must be between 1 and 3.`,
            };
          }
        }
      }

      // Pre-check: Verify inventory before building transaction
      console.log('🔍 [CONSUME] Pre-checking inventory...');
      const inventoryCheck = await this.getInventory(playerAddress);
      if (!inventoryCheck.success) {
        return {
          success: false,
          error: `Failed to check inventory: ${inventoryCheck.error}`,
        };
      }

      // Check if player has sufficient quantity for each item
      for (const item of items) {
        const itemType = itemTypeMap[item.itemId];
        if (itemType === undefined) {
          return {
            success: false,
            error: `Unknown item ID: ${item.itemId}`,
          };
        }

        const inventoryKey = item.itemId === 'extraLives' ? `extraLives_${item.level}` :
                            item.itemId === 'forceField' ? `forceField_${item.level}` :
                            item.itemId === 'orbLevel' ? `orbLevel_${item.level}` :
                            item.itemId === 'slowTime' ? `slowTime_${item.level}` :
                            item.itemId === 'destroyAll' ? 'destroyAll_1' :
                            item.itemId === 'bossKillShot' ? 'bossKillShot_1' :
                            item.itemId === 'coinTractorBeam' ? `coinTractorBeam_${item.level}` : null;

        if (!inventoryKey) {
          return {
            success: false,
            error: `Invalid item ID: ${item.itemId}`,
          };
        }

        const currentQuantity = inventoryCheck.inventory[inventoryKey] || 0;
        console.log(`   📦 ${item.itemId} level ${item.level}: Have ${currentQuantity}, Need ${item.quantity}`);
        
        if (currentQuantity < item.quantity) {
          return {
            success: false,
            error: `Insufficient quantity: Have ${currentQuantity} ${inventoryKey}, need ${item.quantity}`,
          };
        }
      }
      console.log('✅ [CONSUME] Inventory check passed');
      
      // IMPORTANT: Re-check inventory right before building transaction to avoid race conditions
      // The inventory might have been consumed between the pre-check and transaction execution
      console.log('🔍 [CONSUME] Final inventory check before transaction...');
      const finalInventoryCheck = await this.getInventory(playerAddress);
      if (finalInventoryCheck.success) {
        for (const item of items) {
          const inventoryKey = item.itemId === 'extraLives' ? `extraLives_${item.level}` :
                              item.itemId === 'forceField' ? `forceField_${item.level}` :
                              item.itemId === 'orbLevel' ? `orbLevel_${item.level}` :
                              item.itemId === 'slowTime' ? `slowTime_${item.level}` :
                              item.itemId === 'destroyAll' ? 'destroyAll_1' :
                              item.itemId === 'bossKillShot' ? 'bossKillShot_1' :
                              item.itemId === 'coinTractorBeam' ? `coinTractorBeam_${item.level}` : null;
          
          const finalQuantity = finalInventoryCheck.inventory[inventoryKey] || 0;
          console.log(`   📦 Final check: ${inventoryKey} = ${finalQuantity}`);
          
          if (finalQuantity < item.quantity) {
            return {
              success: false,
              error: `Item was consumed between checks: ${inventoryKey} now has ${finalQuantity}, need ${item.quantity}. Please try again.`,
            };
          }
        }
      }

      // Helper function to build transaction (needed for retry logic)
      const buildTransaction = () => {
        const txb = new Transaction();

        // Call consume_item() for each item
        // Contract signature: consume_item(admin_cap, store, clock, player, item_type, item_level, quantity, ctx)
        for (const item of items) {
          const itemType = itemTypeMap[item.itemId];
          
          if (itemType === undefined) {
            throw new Error(`Unknown item ID: ${item.itemId}`);
          }

          // Log transaction arguments for debugging
          console.log(`🔧 [CONSUME] Building transaction for item:`);
          console.log(`   itemId: ${item.itemId}`);
          console.log(`   itemType: ${itemType} (from map)`);
          console.log(`   level: ${item.level}`);
          console.log(`   quantity: ${item.quantity}`);
          console.log(`   packageId: ${packageId}`);
          console.log(`   adminCapability: ${adminCapabilityObjectId}`);
          console.log(`   storeObjectId: ${storeObjectId}`);
          console.log(`   playerAddress: ${playerAddress}`);

          // Call consume_item once with quantity parameter (not loop)
          txb.moveCall({
            target: `${packageId}::premium_store::consume_item`,
            arguments: [
              txb.object(adminCapabilityObjectId), // Admin capability
              txb.object(storeObjectId),            // PremiumStore
              txb.object('0x6'),                    // Clock object (standard Sui Clock)
              txb.pure.address(playerAddress),      // player address
              txb.pure.u8(itemType),               // item_type
              txb.pure.u8(item.level),             // item_level
              txb.pure.u64(item.quantity),         // quantity
            ],
          });
        }

        // Set gas budget
        txb.setGasBudget(this.config.sui.gasBudget);
        
        return txb;
      };

      // Sign and execute with admin wallet (admin pays gas)
      // Retry logic for handling object lock conflicts
      const network = this.config.sui.network;
      const client = network === 'testnet' 
        ? this.adminWallet.getTestnetClient()
        : this.adminWallet.getMainnetClient();

      let result;
      let retries = 3;
      let lastError: Error | null = null;

      while (retries > 0) {
        try {
          console.log(`🔐 [CONSUME] Signing transaction with admin wallet... (${4 - retries}/3 attempts)`);
          
          // Build fresh transaction for each attempt (gets fresh object versions)
          const txb = buildTransaction();
          
          result = await client.signAndExecuteTransaction({
            signer: this.adminWallet.getKeypair(),
            transaction: txb,
            options: {
              showEffects: true,
              showEvents: true,
            },
          });
          
          // Success! Break out of retry loop
          break;
        } catch (error: any) {
          lastError = error;
          
          // Check if this is an "object already locked" error
          const errorMessage = error?.message || '';
          const isLockError = errorMessage.includes('already locked') || 
                             errorMessage.includes('not available for consumption');
          
          if (isLockError && retries > 1) {
            // Wait with exponential backoff before retrying
            const waitTime = Math.pow(2, 3 - retries) * 500; // 500ms, 1000ms, 2000ms
            console.log(`⚠️ [CONSUME] Object locked by another transaction. Waiting ${waitTime}ms before retry... (${retries - 1} attempts remaining)`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            retries--;
            continue;
          } else {
            // Not a lock error, or out of retries - throw immediately
            throw error;
          }
        }
      }

      if (!result) {
        throw lastError || new Error('Transaction failed after retries');
      }

      // Check if transaction succeeded
      if (result.effects?.status?.status === 'success') {
        console.log('✅ [CONSUME] Items consumed successfully!');
        console.log(`   Transaction Digest: ${result.digest}`);
        console.log(`   Gas paid by: Admin wallet (${this.adminWallet.getAddress()})`);

        return {
          success: true,
          digest: result.digest,
        };
      } else {
        // Log detailed error information
        const errorDetails = result.effects?.status?.error;
        console.error('❌ [CONSUME] Transaction failed with details:', JSON.stringify(errorDetails, null, 2));
        console.error('❌ [CONSUME] Full effects:', JSON.stringify(result.effects, null, 2));
        
        // Try to extract error code if it's an assertion failure
        // Move abort errors have format: "MoveAbort(Location, code)"
        let errorMessage = 'Unknown error';
        if (errorDetails) {
          if (typeof errorDetails === 'string') {
            errorMessage = errorDetails;
            // Try to parse MoveAbort error code
            const abortMatch = errorDetails.match(/MoveAbort\([^,]+,\s*(\d+)\)/);
            if (abortMatch) {
              const abortCode = parseInt(abortMatch[1]);
              const errorDescriptions: Record<number, string> = {
                1: 'Invalid item type',
                2: 'Invalid item level (must be 1-3)',
                3: 'Quantity must be positive',
                4: 'Inventory not found',
                5: 'Insufficient quantity',
              };
              errorMessage = `Move abort code ${abortCode}: ${errorDescriptions[abortCode] || 'Unknown error'}`;
            }
          } else if (errorDetails.code) {
            errorMessage = `Error code ${errorDetails.code}: ${errorDetails.message || 'See contract for details'}`;
          } else {
            errorMessage = JSON.stringify(errorDetails);
          }
        }
        
        throw new Error(`Transaction failed: ${errorMessage}`);
      }
    } catch (error) {
      console.error('❌ [CONSUME] Error consuming items:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Verify transaction status
   * 
   * @param transactionDigest - Transaction digest to verify
   * @returns Transaction status and effects
   */
  async verifyTransaction(transactionDigest: string): Promise<{
    success: boolean;
    exists?: boolean;
    confirmed?: boolean;
    error?: string;
  }> {
    try {
      const tx = await this.client.getTransactionBlock({
        digest: transactionDigest,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      const success = tx.effects?.status?.status === 'success';
      
      return {
        success: true,
        exists: true,
        confirmed: success,
      };
    } catch (error) {
      console.error('❌ [VERIFY] Error verifying transaction:', error);
      return {
        success: false,
        exists: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export singleton instance
export const storeService = new StoreService();
export default storeService;

