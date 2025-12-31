// ==========================================
// Store Service - Handles premium store blockchain operations
// ==========================================

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { getConfig } from '@/config/config';
import { getAdminWalletService } from './admin-wallet-service';
import { checkPlayerTokenBalanceForPurchase } from './balance-checker';
import { StoreLogger } from './store-logger';

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
    
    StoreLogger.info(`StoreService initialized for ${network}`);
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
        StoreLogger.warn('Premium store contract not configured. Returning empty inventory.');
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
        StoreLogger.warn('Premium store object ID not configured. Returning empty inventory.');
        return {
          success: true,
          inventory: {},
        };
      }

      StoreLogger.inventory(`Querying inventory for ${playerAddress}`);

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
          StoreLogger.debug('Direct query failed, trying getDynamicFields...');
          const allFields = await this.client.getDynamicFields({
            parentId: storeObjectId,
          });
          
          // Find the field with matching address
          const matchingField = allFields.data.find(
            (field: any) => field.name?.type === 'address' && field.name?.value === playerAddress
          );
          
          if (!matchingField) {
            StoreLogger.inventory('No inventory found for player (first time player)');
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
        if (!fieldData || !('content' in fieldData) || !fieldData.content) {
          StoreLogger.inventory('No inventory found for player (first time player)');
          return {
            success: true,
            inventory: {},
          };
        }

        // Parse the PlayerInventory object
        const inventoryData = fieldData.content as any;
        if (!inventoryData || inventoryData.fields === undefined) {
          StoreLogger.warn('Invalid inventory object structure');
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

        StoreLogger.inventory('Inventory loaded', filteredInventory);
        
        return {
          success: true,
          inventory: filteredInventory,
        };
      } catch (error) {
        // If dynamic field doesn't exist, player has no inventory yet
        if (error instanceof Error && error.message.includes('not found')) {
          StoreLogger.inventory('No inventory found for player (first time player)');
          return {
            success: true,
            inventory: {},
          };
        }
        
        StoreLogger.error('Error querying dynamic field', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error querying inventory',
        };
      }
    } catch (error) {
      StoreLogger.error('Error querying inventory', error);
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

      StoreLogger.purchase('Building transaction', {
        playerAddress,
        itemCount: items.length,
        paymentToken,
        totalAmount: totalTokenAmount
      });

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

      // Check player balance before building transaction
      // Player needs: gas (SUI) + payment token amount
      const gasEstimate = this.config.sui.gasBudget;
      const gasWithBuffer = Math.round(gasEstimate * 1.15);
      
      // Get token type ID based on payment token
      let paymentTokenType: string;
      let tokenDecimals: number;
      
      if (paymentToken === 'SUI') {
        paymentTokenType = 'SUI';
        tokenDecimals = 9; // SUI has 9 decimals
      } else if (paymentToken === 'MEWS') {
        paymentTokenType = this.config.token.mewsTokenTypeId || '';
        // MEWS mainnet uses 6 decimals, testnet uses 9 decimals
        tokenDecimals = this.config.sui.network === 'testnet' ? 9 : 6;
        if (!paymentTokenType || paymentTokenType === '0x...') {
          return {
            success: false,
            error: 'MEWS token type ID not configured',
          };
        }
      } else if (paymentToken === 'USDC') {
        paymentTokenType = this.config.token.usdcTokenTypeId || '';
        tokenDecimals = 6; // USDC has 6 decimals
        if (!paymentTokenType || paymentTokenType === '') {
          return {
            success: false,
            error: 'USDC token type ID not configured. Please set USDC_TOKEN_TYPE_ID_TESTNET or USDC_TOKEN_TYPE_ID_MAINNET in environment variables.',
          };
        }
      } else {
        return {
          success: false,
          error: `Invalid payment token: ${paymentToken}`,
        };
      }

      await checkPlayerTokenBalanceForPurchase({
        client: this.client,
        walletAddress: playerAddress,
        gasBudget: gasWithBuffer,
        paymentTokenType,
        paymentAmount: totalTokenAmount,
        tokenDecimals,
        context: 'store purchase',
      });

      // Handle payment coin preparation
      let paymentCoin: any = null;
      
      if (paymentToken === 'SUI') {
        // For SUI, split from gas coin
        const paymentAmountBigInt = BigInt(totalTokenAmount);
        paymentCoin = txb.splitCoins(txb.gas, [paymentAmountBigInt]);
      } else {
        // For MEWS/USDC, get player's coins and prepare payment
        try {
          const coins = await this.client.getCoins({
            owner: playerAddress,
            coinType: paymentTokenType,
          });
          
          if (!coins.data || coins.data.length === 0) {
            return {
              success: false,
              error: `No ${paymentToken} coins found. Please ensure you have ${paymentToken} in your wallet.`,
            };
          }
          
          // Check if any single coin has sufficient balance
          const paymentAmountBigInt = BigInt(totalTokenAmount);
          const coinWithEnoughBalance = coins.data.find(
            coin => BigInt(coin.balance) >= paymentAmountBigInt
          );
          
          if (coinWithEnoughBalance) {
            // Use a single coin that has enough balance - no merge needed
            paymentCoin = txb.object(coinWithEnoughBalance.coinObjectId);
          } else if (coins.data.length === 1) {
            // Only one coin exists (will fail at execution if insufficient)
            paymentCoin = txb.object(coins.data[0].coinObjectId);
          } else {
            // Multiple coins and none has enough alone - merge them
            const coinObjects = coins.data.map(coin => txb.object(coin.coinObjectId));
            const mergedCoin = txb.mergeCoins(coinObjects[0], coinObjects.slice(1));
            paymentCoin = mergedCoin;
          }
          
          // Split the payment amount from the coin
          paymentCoin = txb.splitCoins(paymentCoin, [paymentAmountBigInt]);
        } catch (error) {
          StoreLogger.error(`Error getting ${paymentToken} coins`, error);
          return {
            success: false,
            error: `Failed to get ${paymentToken} coins: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      }

      // Calculate payment amounts for each item
      // We need to ensure the total matches exactly to avoid "UnusedValueWithoutDrop" errors
      const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
      const totalPaymentBigInt = BigInt(totalTokenAmount);
      const paymentPerItem = totalPaymentBigInt / BigInt(totalItems);
      const remainder = totalPaymentBigInt % BigInt(totalItems);

      // For each item, split the payment coin and call purchase_item()
      // We split coins one at a time, and the remaining balance in paymentCoin will be handled
      // The contract accepts a Coin<T> parameter so wallet can display the payment amount
      // Contract signature: purchase_item<T>(store, clock, player, item_type, item_level, quantity, payment_token, admin_address, payment)
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const itemType = itemTypeMap[item.itemId];
        
        if (itemType === undefined) {
          return {
            success: false,
            error: `Unknown item ID: ${item.itemId}`,
          };
        }

        // Calculate payment amount for this item
        // Add remainder to the last item to ensure we use the exact total
        let itemPaymentAmount = paymentPerItem * BigInt(item.quantity);
        if (i === items.length - 1 && remainder > 0n) {
          itemPaymentAmount += remainder;
        }
        
        // Split the payment coin for this specific item
        // This allows wallet to display the payment amount for each purchase_item call
        // After each split, paymentCoin is reduced by the split amount
        const itemPaymentCoin = txb.splitCoins(paymentCoin, [itemPaymentAmount]);

        // Call purchase_item with Coin parameter (wallet will display the amount)
        if (paymentToken === 'SUI') {
          txb.moveCall({
            target: `${packageId}::premium_store::purchase_item`,
            typeArguments: ['0x2::sui::SUI'],
            arguments: [
              txb.object(storeObjectId),
              txb.object('0x6'), // Clock object (standard Sui Clock)
              txb.pure.address(playerAddress),
              txb.pure.u8(itemType),
              txb.pure.u8(item.level),
              txb.pure.u64(item.quantity),
              txb.pure.u8(paymentTokenValue),
              txb.pure.address(this.adminWallet.getAddress()), // Admin address to receive payment
              itemPaymentCoin, // Payment coin - wallet will display this amount
            ],
          });
        } else if (paymentToken === 'MEWS') {
          txb.moveCall({
            target: `${packageId}::premium_store::purchase_item`,
            typeArguments: [this.config.token.mewsTokenTypeId],
            arguments: [
              txb.object(storeObjectId),
              txb.object('0x6'),
              txb.pure.address(playerAddress),
              txb.pure.u8(itemType),
              txb.pure.u8(item.level),
              txb.pure.u64(item.quantity),
              txb.pure.u8(paymentTokenValue),
              txb.pure.address(this.adminWallet.getAddress()),
              itemPaymentCoin,
            ],
          });
        } else if (paymentToken === 'USDC') {
          txb.moveCall({
            target: `${packageId}::premium_store::purchase_item`,
            typeArguments: [this.config.token.usdcTokenTypeId],
            arguments: [
              txb.object(storeObjectId),
              txb.object('0x6'),
              txb.pure.address(playerAddress),
              txb.pure.u8(itemType),
              txb.pure.u8(item.level),
              txb.pure.u64(item.quantity),
              txb.pure.u8(paymentTokenValue),
              txb.pure.address(this.adminWallet.getAddress()),
              itemPaymentCoin,
            ],
          });
        }
      }

      // After all splits, transfer any remaining balance in paymentCoin back to the player
      // This ensures we don't have an "UnusedValueWithoutDrop" error
      // The paymentCoin should have 0 balance if calculations are correct, but we handle it anyway
      txb.transferObjects([paymentCoin], playerAddress);

      // Set sender (required for building transaction, even if not signing)
      txb.setSender(playerAddress);

      // Set gas budget (already calculated above)
      txb.setGasBudget(gasWithBuffer);

      // Build transaction (don't sign - frontend will sign)
      const transactionBytes = await txb.build({ client: this.client });

      StoreLogger.purchase('Transaction built successfully', {
        gasEstimate: gasWithBuffer,
        gasEstimateSUI: (gasWithBuffer / 1_000_000_000).toFixed(4)
      });

      return {
        success: true,
        transaction: Buffer.from(transactionBytes).toString('base64'),
        gasEstimate: gasWithBuffer.toString(),
      };
    } catch (error) {
      StoreLogger.error('Error building transaction', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Build merge transaction
   * Player merges items (3x L1 → 1x L2, 3x L2 → 1x L3, or 9x L1 → 1x L3)
   * 
   * @param playerAddress - Player's wallet address
   * @param itemType - Item type ('extraLives', 'forceField', etc.)
   * @param sourceLevel - Source level (1 or 2)
   * @param targetLevel - Target level (2 or 3, or 3 for hyper merge)
   * @param paymentToken - Payment token ('SUI', 'MEWS', or 'USDC')
   * @param totalTokenAmount - Total amount in token (with decimals)
   * @param isHyperMerge - If true, performs L1→L3 direct merge (9 items)
   * @returns Unsigned transaction bytes
   */
  async buildMergeTransaction(
    playerAddress: string,
    itemType: string,
    sourceLevel: number,
    targetLevel: number,
    paymentToken: 'SUI' | 'MEWS' | 'USDC',
    totalTokenAmount: string,
    isHyperMerge: boolean = false
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

      // Validate totalTokenAmount is a valid number string
      if (!totalTokenAmount || totalTokenAmount === 'NaN' || isNaN(parseFloat(totalTokenAmount)) || parseFloat(totalTokenAmount) <= 0) {
        return {
          success: false,
          error: `Invalid token amount: ${totalTokenAmount}. Please try again or contact support.`,
        };
      }

      // Validate merge path
      if (!((sourceLevel === 1 && targetLevel === 2) || 
            (sourceLevel === 2 && targetLevel === 3) || 
            (sourceLevel === 1 && targetLevel === 3 && isHyperMerge))) {
        return {
          success: false,
          error: 'Invalid merge path. Must be L1→L2, L2→L3, or L1→L3 (hyper merge)',
        };
      }

      const contractAddress = this.config.contracts.premiumStore;
      
      if (!contractAddress || contractAddress === '' || contractAddress === '0x...') {
        return {
          success: false,
          error: 'Premium store contract not configured',
        };
      }

      // Parse package ID from contract address
      const packageId = contractAddress.includes('::') 
        ? contractAddress.split('::')[0]
        : contractAddress;

      // Get store object ID
      const storeObjectId = this.config.contracts.premiumStoreObject;
      
      if (!storeObjectId || storeObjectId === '' || storeObjectId === '0x...') {
        return {
          success: false,
          error: 'Premium store object ID not configured',
        };
      }

      StoreLogger.purchase('Building merge transaction', {
        playerAddress,
        itemType,
        sourceLevel,
        targetLevel,
        isHyperMerge,
        paymentToken,
        totalAmount: totalTokenAmount
      });

      // Build transaction
      const txb = new Transaction();

      // Convert item type to contract item type (u8)
      const itemTypeMap: Record<string, number> = {
        'extraLives': 0,
        'forceField': 1,
        'orbLevel': 2,
        'slowTime': 3,
        'destroyAll': 4,
        'bossKillShot': 5,
        'coinTractorBeam': 6,
      };

      const contractItemType = itemTypeMap[itemType];
      if (contractItemType === undefined) {
        return {
          success: false,
          error: `Invalid item type: ${itemType}`,
        };
      }

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

      // Check player balance
      const gasEstimate = this.config.sui.gasBudget;
      const gasWithBuffer = Math.round(gasEstimate * 1.5); // 1.5x buffer for merge operations
      
      // Get token type ID and decimals
      let paymentTokenType: string;
      let tokenDecimals: number;
      
      if (paymentToken === 'SUI') {
        paymentTokenType = 'SUI';
        tokenDecimals = 9;
      } else if (paymentToken === 'MEWS') {
        paymentTokenType = this.config.token.mewsTokenTypeId || '';
        tokenDecimals = this.config.sui.network === 'testnet' ? 9 : 6;
        if (!paymentTokenType || paymentTokenType === '0x...') {
          return {
            success: false,
            error: 'MEWS token type not configured',
          };
        }
      } else { // USDC
        paymentTokenType = this.config.token.usdcTokenTypeId || '';
        tokenDecimals = 6; // USDC uses 6 decimals
        if (!paymentTokenType || paymentTokenType === '0x...') {
          return {
            success: false,
            error: 'USDC token type not configured',
          };
        }
      }

      // Check balance (throws BadgeError if insufficient)
      await checkPlayerTokenBalanceForPurchase({
        client: this.client,
        walletAddress: playerAddress,
        gasBudget: gasWithBuffer,
        paymentTokenType,
        paymentAmount: totalTokenAmount,
        tokenDecimals,
        context: 'merge transaction',
      });

      // Prepare payment coin
      let paymentCoin: any = null;
      
      if (paymentToken === 'SUI') {
        // For SUI, split from gas coin
        const paymentAmountBigInt = BigInt(totalTokenAmount);
        paymentCoin = txb.splitCoins(txb.gas, [paymentAmountBigInt]);
      } else {
        // For MEWS/USDC, get player's coins and prepare payment
        try {
          const coins = await this.client.getCoins({
            owner: playerAddress,
            coinType: paymentTokenType,
          });
          
          if (!coins.data || coins.data.length === 0) {
            return {
              success: false,
              error: `No ${paymentToken} coins found. Please ensure you have ${paymentToken} in your wallet.`,
            };
          }
          
          const paymentAmountBigInt = BigInt(totalTokenAmount);
          const coinWithEnoughBalance = coins.data.find(coin => BigInt(coin.balance) >= paymentAmountBigInt);
          
          let coinToSplit;
          if (coinWithEnoughBalance) {
            coinToSplit = txb.object(coinWithEnoughBalance.coinObjectId);
          } else if (coins.data.length === 1) {
            coinToSplit = txb.object(coins.data[0].coinObjectId);
          } else {
            const coinObjects = coins.data.map(coin => txb.object(coin.coinObjectId));
            coinToSplit = txb.mergeCoins(coinObjects[0], coinObjects.slice(1));
          }
          
          paymentCoin = txb.splitCoins(coinToSplit, [paymentAmountBigInt]);
        } catch (error) {
          StoreLogger.error('Error preparing payment coin', error);
          return {
            success: false,
            error: `Failed to prepare payment coin: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      }

      // Call merge_items function
      // Note: Assuming player-facing merge function exists (similar to purchase_item)
      // If contract requires admin_cap, this will need to be adjusted
      if (paymentToken === 'SUI') {
        txb.moveCall({
          target: `${packageId}::premium_store::merge_items`,
          typeArguments: ['0x2::sui::SUI'],
          arguments: [
            txb.object(storeObjectId),
            txb.object('0x6'), // Clock
            txb.pure.address(playerAddress),
            txb.pure.u8(contractItemType),
            txb.pure.u8(sourceLevel),
            txb.pure.u8(targetLevel),
            txb.pure.u8(paymentTokenValue),
            txb.pure.address(this.adminWallet.getAddress()),
            paymentCoin,
          ],
        });
      } else if (paymentToken === 'MEWS') {
        txb.moveCall({
          target: `${packageId}::premium_store::merge_items`,
          typeArguments: [paymentTokenType],
          arguments: [
            txb.object(storeObjectId),
            txb.object('0x6'), // Clock
            txb.pure.address(playerAddress),
            txb.pure.u8(contractItemType),
            txb.pure.u8(sourceLevel),
            txb.pure.u8(targetLevel),
            txb.pure.u8(paymentTokenValue),
            txb.pure.address(this.adminWallet.getAddress()),
            paymentCoin,
          ],
        });
      } else if (paymentToken === 'USDC') {
        txb.moveCall({
          target: `${packageId}::premium_store::merge_items`,
          typeArguments: [paymentTokenType],
          arguments: [
            txb.object(storeObjectId),
            txb.object('0x6'), // Clock
            txb.pure.address(playerAddress),
            txb.pure.u8(contractItemType),
            txb.pure.u8(sourceLevel),
            txb.pure.u8(targetLevel),
            txb.pure.u8(paymentTokenValue),
            txb.pure.address(this.adminWallet.getAddress()),
            paymentCoin,
          ],
        });
      }

      // Note: paymentCoin is consumed by merge_items, so we don't transfer it back

      // Set sender
      txb.setSender(playerAddress);

      // Set gas budget
      txb.setGasBudget(gasWithBuffer);

      // Build transaction (don't sign - frontend will sign)
      const transactionBytes = await txb.build({ client: this.client });

      StoreLogger.purchase('Merge transaction built successfully', {
        gasEstimate: gasWithBuffer,
        gasEstimateSUI: (gasWithBuffer / 1_000_000_000).toFixed(4)
      });

      return {
        success: true,
        transaction: Buffer.from(transactionBytes).toString('base64'),
        gasEstimate: gasWithBuffer.toString(),
      };
    } catch (error) {
      StoreLogger.error('Error building merge transaction', error);
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
    StoreLogger.info('consumeItems called', { playerAddress, items });
    
    try {
      // Validate inputs
      if (!playerAddress || !playerAddress.startsWith('0x') || playerAddress.length !== 66) {
        StoreLogger.error('Invalid player address format');
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
      
      StoreLogger.debug('Admin capability object ID', { adminCapabilityObjectId: adminCapabilityObjectId || 'NOT SET' });
      
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
          StoreLogger.error(`Admin capability object not found: ${adminCapabilityObjectId}`);
          return {
            success: false,
            error: `Admin capability object not found: ${adminCapabilityObjectId}. Please verify the object ID is correct.`,
          };
        }

        const objectType = adminCapObject.data?.type || 'unknown';
        StoreLogger.debug('Admin capability object type', { objectType });
        
        // Check if it's the correct type
        if (!objectType.includes('premium_store::AdminCapability')) {
          StoreLogger.error(`Wrong admin capability type! Expected: premium_store::AdminCapability, Got: ${objectType}`);
          return {
            success: false,
            error: `Wrong admin capability type! The object at ${adminCapabilityObjectId} is of type ${objectType}, but expected premium_store::AdminCapability. Please use the premium_store admin capability, not the score_submission admin capability.`,
          };
        }

        // Extract package ID from admin capability object type
        // Format: <package_id>::premium_store::AdminCapability
        const adminCapPackageId = objectType.split('::')[0];
        StoreLogger.debug('Admin capability package ID', { adminCapPackageId });
        
        // Use the package ID from the admin capability object (they must match)
        if (adminCapPackageId !== packageId) {
          StoreLogger.warn('Package ID mismatch', {
            contractPackageId: packageId,
            adminCapPackageId,
            action: 'Using admin capability package ID for transaction'
          });
          // Use the package ID from the admin capability
          packageId = adminCapPackageId;
        }
      } catch (error) {
        StoreLogger.error('Error verifying admin capability', error);
        // Continue anyway - the transaction will fail with a clearer error if it's wrong
      }

      // Get store object ID
      const storeObjectId = this.config.contracts.premiumStoreObject;
      
      StoreLogger.debug('Store object ID', { storeObjectId: storeObjectId || 'NOT SET' });
      
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
          StoreLogger.error(`PremiumStore object not found: ${storeObjectId}`);
          return {
            success: false,
            error: `PremiumStore object not found: ${storeObjectId}. Please verify the object ID is correct.`,
          };
        }

        const storeObjectType = storeObject.data?.type || 'unknown';
        StoreLogger.debug('PremiumStore object type', { storeObjectType });
        
        // Extract package ID from PremiumStore object type
        // Format: <package_id>::premium_store::PremiumStore
        const storePackageId = storeObjectType.split('::')[0];
        StoreLogger.debug('PremiumStore package ID', { storePackageId });
        
        // Use the package ID from the PremiumStore object (must match)
        if (storePackageId !== packageId) {
          StoreLogger.warn('Package ID mismatch', {
            configPackageId: packageId,
            storePackageId,
            action: 'Using PremiumStore package ID for transaction'
          });
          // Use the package ID from the PremiumStore object
          packageId = storePackageId;
        }
      } catch (error) {
        StoreLogger.error('Error verifying PremiumStore object', error);
        // Continue anyway - the transaction will fail with a clearer error if it's wrong
      }
      
      StoreLogger.debug('Package ID (final)', { packageId });

      StoreLogger.info('Consuming items', { playerAddress, itemCount: items.length });

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
      StoreLogger.debug('Pre-checking inventory');
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

        const currentQuantity = inventoryCheck.inventory?.[inventoryKey] || 0;
        StoreLogger.debug(`Inventory check: ${item.itemId} level ${item.level}`, {
          have: currentQuantity,
          need: item.quantity
        });
        
        if (currentQuantity < item.quantity) {
          return {
            success: false,
            error: `Insufficient quantity: Have ${currentQuantity} ${inventoryKey}, need ${item.quantity}`,
          };
        }
      }
      StoreLogger.info('Inventory check passed');
      
      // IMPORTANT: Re-check inventory right before building transaction to avoid race conditions
      // The inventory might have been consumed between the pre-check and transaction execution
      StoreLogger.debug('Final inventory check before transaction');
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
          
          if (!inventoryKey) {
            return {
              success: false,
              error: `Invalid item ID: ${item.itemId}`,
            };
          }
          const finalQuantity = finalInventoryCheck.inventory?.[inventoryKey] || 0;
          StoreLogger.debug(`Final inventory check: ${inventoryKey}`, { quantity: finalQuantity });
          
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
          StoreLogger.debug('Building transaction for item', {
            itemId: item.itemId,
            itemType,
            level: item.level,
            quantity: item.quantity,
            packageId,
            adminCapability: adminCapabilityObjectId,
            storeObjectId,
            playerAddress
          });

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

      // Check wallet balance before building transaction (only once, before retry loop)
      const { checkBalanceBeforeTransaction } = await import('./balance-checker');
      await checkBalanceBeforeTransaction({
        client,
        walletAddress: this.adminWallet.getAddress(),
        gasBudget: this.config.sui.gasBudget,
        context: 'consume items',
      });

      let result;
      let retries = 3;
      let lastError: Error | null = null;

      while (retries > 0) {
        try {
          StoreLogger.transaction(`Signing transaction with admin wallet (attempt ${4 - retries}/3)`);
          
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
            StoreLogger.warn(`Object locked by another transaction. Waiting ${waitTime}ms before retry`, {
              attemptsRemaining: retries - 1
            });
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
        // CRITICAL: Wait for transaction to be finalized
        // This prevents the coin from staying locked
        try {
          StoreLogger.transaction('Waiting for transaction to finalize...', {
            digest: result.digest,
          });

          await this.client.waitForTransaction({
            digest: result.digest,
            options: {
              showEffects: true,
            },
            timeout: 60_000, // 60 second timeout
          });

          // Verify transaction actually succeeded
          const txStatus = await this.client.getTransactionBlock({
            digest: result.digest,
            options: { showEffects: true },
          });

          if (txStatus.effects?.status?.status !== 'success') {
            throw new Error(
              `Transaction ${result.digest} did not succeed: ${txStatus.effects?.status?.error || 'Unknown error'}`
            );
          }

          StoreLogger.transaction('Transaction finalized and verified', {
            digest: result.digest,
          });
        } catch (waitError) {
          // This is a CRITICAL error - don't continue!
          const errorMsg = waitError instanceof Error ? waitError.message : 'Unknown error';
          throw new Error(
            `Transaction ${result.digest} did not finalize: ${errorMsg}. ` +
            `Cannot proceed as coin may still be locked.`
          );
        }

        StoreLogger.transaction('Items consumed successfully', {
          digest: result.digest,
          gasPaidBy: `Admin wallet (${this.adminWallet.getAddress()})`
        });

        return {
          success: true,
          digest: result.digest,
        };
      } else {
        // Log detailed error information
        const errorDetails = result.effects?.status?.error;
        StoreLogger.error('Transaction failed', {
          errorDetails: JSON.stringify(errorDetails, null, 2),
          effects: JSON.stringify(result.effects, null, 2)
        });
        
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
          } else if (typeof errorDetails === 'object' && errorDetails !== null && 'code' in errorDetails) {
            const errorObj = errorDetails as { code?: unknown; message?: unknown };
            errorMessage = `Error code ${errorObj.code}: ${errorObj.message || 'See contract for details'}`;
          } else {
            errorMessage = JSON.stringify(errorDetails);
          }
        }
        
        throw new Error(`Transaction failed: ${errorMessage}`);
      }
    } catch (error) {
      StoreLogger.error('Error consuming items', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Admin function to add items to a player's inventory
   * Used for: testing, promotions, refunds, corrections
   * 
   * @param playerAddress - Player wallet address
   * @param items - Array of items to add
   * @returns Transaction result
   */
  async adminAddItems(
    playerAddress: string,
    items: Array<{ itemId: string; level: number; quantity: number }>
  ): Promise<{
    success: boolean;
    digest?: string;
    error?: string;
  }> {
    try {
      StoreLogger.info('Adding items to inventory', { playerAddress, items });

      // Get contract configuration
      const packageId = this.config.contracts.premiumStore;
      const storeObjectId = this.config.contracts.premiumStoreObject;
      const premiumStoreAdminCapability = this.config.contracts.premiumStoreAdminCapability;

      if (!packageId || !storeObjectId) {
        return {
          success: false,
          error: 'Premium store contract not configured',
        };
      }

      const adminCapabilityObjectId = premiumStoreAdminCapability;

      if (!adminCapabilityObjectId || adminCapabilityObjectId === '' || adminCapabilityObjectId === '0x...') {
        return {
          success: false,
          error: 'Premium store admin capability not configured',
        };
      }

      // Validate items
      const itemTypeMap: Record<string, number> = {
        extraLives: 0,
        forceField: 1,
        orbLevel: 2,
        slowTime: 3,
        destroyAll: 4,
        bossKillShot: 5,
        coinTractorBeam: 6,
      };

      // Build transaction
      const txb = new Transaction();

      // Add each item
      for (const item of items) {
        const itemType = itemTypeMap[item.itemId];
        if (itemType === undefined) {
          return {
            success: false,
            error: `Unknown item ID: ${item.itemId}`,
          };
        }

        // Validate item levels
        if ((item.itemId === 'destroyAll' || item.itemId === 'bossKillShot') && item.level !== 1) {
          return {
            success: false,
            error: `${item.itemId} is a single-level item and must have level 1, got level ${item.level}`,
          };
        }
        if (item.itemId !== 'destroyAll' && item.itemId !== 'bossKillShot') {
          if (item.level < 1 || item.level > 3) {
            return {
              success: false,
              error: `Invalid level for ${item.itemId}: ${item.level}. Must be between 1 and 3.`,
            };
          }
        }

        StoreLogger.debug('Adding item', {
          itemId: item.itemId,
          level: item.level,
          quantity: item.quantity
        });

        txb.moveCall({
          target: `${packageId}::premium_store::admin_add_items`,
          arguments: [
            txb.object(adminCapabilityObjectId), // Admin capability
            txb.object(storeObjectId),            // PremiumStore
            txb.object('0x6'),                    // Clock object
            txb.pure.address(playerAddress),      // player address
            txb.pure.u8(itemType),               // item_type
            txb.pure.u8(item.level),              // item_level
            txb.pure.u64(item.quantity),         // quantity
          ],
        });
      }

      // Set gas budget
      txb.setGasBudget(this.config.sui.gasBudget);

      // Check wallet balance before building transaction
      const network = this.config.sui.network;
      const client = network === 'testnet' 
        ? this.adminWallet.getTestnetClient()
        : this.adminWallet.getMainnetClient();

      const { checkBalanceBeforeTransaction } = await import('./balance-checker');
      await checkBalanceBeforeTransaction({
        client,
        walletAddress: this.adminWallet.getAddress(),
        gasBudget: this.config.sui.gasBudget,
        context: 'admin add items',
      });

      // Sign and execute with admin wallet
      StoreLogger.transaction('Signing transaction with admin wallet');

      const result = await client.signAndExecuteTransaction({
        signer: this.adminWallet.getKeypair(),
        transaction: txb,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      // Check if transaction succeeded
      if (result.effects?.status?.status === 'success') {
        StoreLogger.transaction('Items added successfully', {
          digest: result.digest,
          gasPaidBy: `Admin wallet (${this.adminWallet.getAddress()})`
        });

        return {
          success: true,
          digest: result.digest,
        };
      } else {
        const errorDetails = result.effects?.status?.error;
        StoreLogger.error('Transaction failed', { errorDetails: JSON.stringify(errorDetails, null, 2) });
        
        let errorMessage = 'Unknown error';
        if (errorDetails) {
          if (typeof errorDetails === 'string') {
            errorMessage = errorDetails;
          } else {
            errorMessage = JSON.stringify(errorDetails);
          }
        }
        
        return {
          success: false,
          error: `Transaction failed: ${errorMessage}`,
        };
      }
    } catch (error) {
      StoreLogger.error('Error adding items', error);
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
      StoreLogger.error('Error verifying transaction', error);
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

