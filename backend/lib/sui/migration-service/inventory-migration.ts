// Inventory migration service for transferring items from old PremiumStore to new PremiumStore
import { Transaction } from '@mysten/sui/transactions';
import { AdminWalletService } from '../admin-wallet-service';
import { getConfig } from '@/config/config';
import { MigrationLogger } from '../migration-logger';

export class InventoryMigrationService {
  private adminWallet: AdminWalletService;
  private config: ReturnType<typeof getConfig>;

  constructor(adminWallet: AdminWalletService) {
    this.adminWallet = adminWallet;
    this.config = getConfig();
  }

  /**
   * Read inventory from old PremiumStore
   * Uses the old package ID to query the old store
   */
  async readOldInventory(
    oldPackageId: string,
    oldStoreObjectId: string,
    playerAddress: string
  ): Promise<{
    success: boolean;
    inventory?: {
      extra_lives_level_1: number;
      extra_lives_level_2: number;
      extra_lives_level_3: number;
      force_field_level_1: number;
      force_field_level_2: number;
      force_field_level_3: number;
      orb_level_1: number;
      orb_level_2: number;
      orb_level_3: number;
      slow_time_level_1: number;
      slow_time_level_2: number;
      slow_time_level_3: number;
      destroy_all_enemies: number;
      boss_kill_shot: number;
      coin_tractor_beam_level_1: number;
      coin_tractor_beam_level_2: number;
      coin_tractor_beam_level_3: number;
    };
    error?: string;
  }> {
    try {
      const network = this.config.sui.network;
      const client = network === 'testnet' 
        ? this.adminWallet.getTestnetClient()
        : this.adminWallet.getMainnetClient();

      // Query the PlayerInventory object directly from the old store
      // Use the same robust approach as store-service.ts
      MigrationLogger.inventory(`Querying old inventory for ${playerAddress}`);
      
      const dynamicFieldName = {
        type: 'address',
        value: playerAddress,
      };

      let inventoryObj;
      try {
        // Try getDynamicFieldObject first (returns the object directly)
        MigrationLogger.debug('Trying direct dynamic field query');
        const dynamicField = await client.getDynamicFieldObject({
          parentId: oldStoreObjectId,
          name: dynamicFieldName,
        });

        if (dynamicField.error || !dynamicField.data) {
          throw new Error('Direct query returned error or no data');
        }

        // Get the PlayerInventory object ID from the dynamic field
        const inventoryObjectId = dynamicField.data.objectId;
        MigrationLogger.debug('Found inventory object ID', { inventoryObjectId });
        
        inventoryObj = await client.getObject({
          id: inventoryObjectId,
          options: { showContent: true },
        });
      } catch (directError) {
        // If direct query fails, try listing all dynamic fields and finding the one we need
        MigrationLogger.debug('Direct query failed, trying getDynamicFields', {
          error: directError instanceof Error ? directError.message : String(directError)
        });
        
        const allFields = await client.getDynamicFields({
          parentId: oldStoreObjectId,
        });
        
        MigrationLogger.debug(`Found ${allFields.data.length} dynamic fields`);
        
        // Find the field with matching address
        const matchingField = allFields.data.find(
          (field: any) => field.name?.type === 'address' && field.name?.value === playerAddress
        );
        
        if (!matchingField) {
          MigrationLogger.inventory('No inventory found for player in old store');
          return {
            success: false,
            error: 'Inventory not found in old store',
          };
        }

        MigrationLogger.debug('Found matching field', { objectId: matchingField.objectId });
        
        // Get the actual PlayerInventory object
        inventoryObj = await client.getObject({
          id: matchingField.objectId,
          options: { showContent: true },
        });
      }

      if (inventoryObj.error || !inventoryObj.data?.content) {
        MigrationLogger.error('Failed to read inventory object', {
          error: inventoryObj.error || 'No content'
        });
        return {
          success: false,
          error: 'Failed to read inventory object',
        };
      }

      // Parse the inventory data
      const content = inventoryObj.data.content as any;
      const fields = content.fields as any;

      MigrationLogger.inventory('Successfully read inventory from old store');

      return {
        success: true,
        inventory: {
          extra_lives_level_1: parseInt(fields.extra_lives_level_1 || '0'),
          extra_lives_level_2: parseInt(fields.extra_lives_level_2 || '0'),
          extra_lives_level_3: parseInt(fields.extra_lives_level_3 || '0'),
          force_field_level_1: parseInt(fields.force_field_level_1 || '0'),
          force_field_level_2: parseInt(fields.force_field_level_2 || '0'),
          force_field_level_3: parseInt(fields.force_field_level_3 || '0'),
          orb_level_1: parseInt(fields.orb_level_1 || '0'),
          orb_level_2: parseInt(fields.orb_level_2 || '0'),
          orb_level_3: parseInt(fields.orb_level_3 || '0'),
          slow_time_level_1: parseInt(fields.slow_time_level_1 || '0'),
          slow_time_level_2: parseInt(fields.slow_time_level_2 || '0'),
          slow_time_level_3: parseInt(fields.slow_time_level_3 || '0'),
          destroy_all_enemies: parseInt(fields.destroy_all_enemies || '0'),
          boss_kill_shot: parseInt(fields.boss_kill_shot || '0'),
          coin_tractor_beam_level_1: parseInt(fields.coin_tractor_beam_level_1 || '0'),
          coin_tractor_beam_level_2: parseInt(fields.coin_tractor_beam_level_2 || '0'),
          coin_tractor_beam_level_3: parseInt(fields.coin_tractor_beam_level_3 || '0'),
        },
      };
    } catch (error) {
      MigrationLogger.error('Error reading old inventory', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get all wallet addresses that have inventory in the old store
   */
  async getAllWalletsWithInventory(
    oldStoreObjectId: string
  ): Promise<{
    success: boolean;
    wallets?: string[];
    error?: string;
  }> {
    try {
      const network = this.config.sui.network;
      const client = network === 'testnet' 
        ? this.adminWallet.getTestnetClient()
        : this.adminWallet.getMainnetClient();

      MigrationLogger.info('Fetching all wallets with inventory from old store');
      
      // Get all dynamic fields from the old store
      const allFields = await client.getDynamicFields({
        parentId: oldStoreObjectId,
      });

      MigrationLogger.debug(`Found ${allFields.data.length} dynamic fields (inventories)`);

      // Extract wallet addresses from dynamic field names
      const wallets: string[] = [];
      for (const field of allFields.data) {
        // Dynamic field name should be of type 'address'
        if (field.name?.type === 'address' && field.name?.value) {
          // Type assertion: when type is 'address', value is a string
          wallets.push(String(field.name.value));
        }
      }

      MigrationLogger.info(`Found ${wallets.length} wallets with inventory`);

      return {
        success: true,
        wallets,
      };
    } catch (error) {
      MigrationLogger.error('Error fetching wallets with inventory', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Migrate player inventory from old store to new store
   */
  async migratePlayerInventory(
    playerAddress: string,
    oldPackageId: string,
    oldStoreObjectId: string
  ): Promise<{
    success: boolean;
    digest?: string;
    error?: string;
  }> {
    try {
      // 1. Read inventory from old store
      MigrationLogger.inventory(`Reading inventory from old store for ${playerAddress}`);
      const oldInventory = await this.readOldInventory(oldPackageId, oldStoreObjectId, playerAddress);
      
      if (!oldInventory.success || !oldInventory.inventory) {
        return {
          success: false,
          error: oldInventory.error || 'Failed to read old inventory',
        };
      }

      const inv = oldInventory.inventory;
      MigrationLogger.inventory('Old inventory', inv);

      // Check if there are any items to migrate
      const totalItems = inv.extra_lives_level_1 + inv.extra_lives_level_2 + inv.extra_lives_level_3 +
                        inv.force_field_level_1 + inv.force_field_level_2 + inv.force_field_level_3 +
                        inv.orb_level_1 + inv.orb_level_2 + inv.orb_level_3 +
                        inv.slow_time_level_1 + inv.slow_time_level_2 + inv.slow_time_level_3 +
                        inv.destroy_all_enemies + inv.boss_kill_shot +
                        inv.coin_tractor_beam_level_1 + inv.coin_tractor_beam_level_2 + inv.coin_tractor_beam_level_3;

      if (totalItems === 0) {
        return {
          success: false,
          error: 'No items to migrate',
        };
      }

      // 2. Get new store configuration
      const newPackageId = this.config.contracts.premiumStore.includes('::')
        ? this.config.contracts.premiumStore.split('::')[0]
        : this.config.contracts.premiumStore;
      const newStoreObjectId = this.config.contracts.premiumStoreObject;
      const adminCapabilityObjectId = this.config.contracts.premiumStoreAdminCapability;

      if (!newStoreObjectId || !adminCapabilityObjectId || adminCapabilityObjectId === '') {
        return {
          success: false,
          error: `New store not configured. Missing: ${!newStoreObjectId ? 'PREMIUM_STORE_OBJECT_ID_TESTNET' : ''} ${!adminCapabilityObjectId || adminCapabilityObjectId === '' ? 'PREMIUM_STORE_ADMIN_CAPABILITY_OBJECT_ID_TESTNET' : ''}`,
        };
      }

      // Verify the admin capability object exists and is the correct type
      const network = this.config.sui.network;
      const client = network === 'testnet' 
        ? this.adminWallet.getTestnetClient()
        : this.adminWallet.getMainnetClient();
      
      try {
        const adminCapObject = await client.getObject({
          id: adminCapabilityObjectId,
          options: { showType: true },
        });

        if (adminCapObject.error) {
          MigrationLogger.error(`Admin capability object not found: ${adminCapabilityObjectId}`);
          return {
            success: false,
            error: `Admin capability object not found: ${adminCapabilityObjectId}. Please verify PREMIUM_STORE_ADMIN_CAPABILITY_OBJECT_ID_TESTNET is correct.`,
          };
        }

        const objectType = adminCapObject.data?.type || 'unknown';
        const owner = adminCapObject.data?.owner;
        
        // Extract package ID from admin capability type
        const adminCapPackageId = objectType.split('::')[0];
        
        MigrationLogger.debug('Admin capability verification', {
          objectType,
          adminCapPackageId,
          newPackageId,
          owner: JSON.stringify(owner),
          adminWalletAddress: this.adminWallet.getAddress()
        });

        // Verify it's the correct type (premium_store::AdminCapability, not score_submission::AdminCapability)
        if (!objectType.includes('premium_store::AdminCapability')) {
          return {
            success: false,
            error: `Wrong admin capability type! The object at ${adminCapabilityObjectId} is of type ${objectType}, but expected premium_store::AdminCapability. Please use the premium_store admin capability, not the score_submission admin capability.`,
          };
        }

        // CRITICAL: Verify the admin capability is from the same package as the new store
        if (adminCapPackageId !== newPackageId) {
          return {
            success: false,
            error: `Package ID mismatch! The admin capability is from package ${adminCapPackageId}, but the new store is from package ${newPackageId}. They must match. Please ensure PREMIUM_STORE_CONTRACT_TESTNET matches the package that created the admin capability, or use an admin capability from the correct package.`,
          };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        MigrationLogger.error('Could not verify admin capability object', { errorMessage });
        return {
          success: false,
          error: `Failed to verify admin capability object: ${errorMessage}. Please check that PREMIUM_STORE_ADMIN_CAPABILITY_OBJECT_ID_TESTNET is correct.`,
        };
      }

      // 3. Build migration transaction
      MigrationLogger.transaction('Building migration transaction');
      const txb = new Transaction();

      txb.moveCall({
        target: `${newPackageId}::premium_store::migrate_player_inventory`,
        arguments: [
          txb.object(adminCapabilityObjectId),
          txb.object(newStoreObjectId),
          txb.object('0x6'), // Clock
          txb.pure.address(playerAddress),
          // Extra Lives
          txb.pure.u64(inv.extra_lives_level_1),
          txb.pure.u64(inv.extra_lives_level_2),
          txb.pure.u64(inv.extra_lives_level_3),
          // Force Field
          txb.pure.u64(inv.force_field_level_1),
          txb.pure.u64(inv.force_field_level_2),
          txb.pure.u64(inv.force_field_level_3),
          // Orb Level
          txb.pure.u64(inv.orb_level_1),
          txb.pure.u64(inv.orb_level_2),
          txb.pure.u64(inv.orb_level_3),
          // Slow Time
          txb.pure.u64(inv.slow_time_level_1),
          txb.pure.u64(inv.slow_time_level_2),
          txb.pure.u64(inv.slow_time_level_3),
          // Single-level items
          txb.pure.u64(inv.destroy_all_enemies),
          txb.pure.u64(inv.boss_kill_shot),
          // Coin Tractor Beam
          txb.pure.u64(inv.coin_tractor_beam_level_1),
          txb.pure.u64(inv.coin_tractor_beam_level_2),
          txb.pure.u64(inv.coin_tractor_beam_level_3),
        ],
      });

      txb.setGasBudget(this.config.sui.gasBudget);

      // Check wallet balance before building transaction
      const { checkBalanceBeforeTransaction } = await import('../balance-checker');
      await checkBalanceBeforeTransaction({
        client,
        walletAddress: this.adminWallet.getAddress(),
        gasBudget: this.config.sui.gasBudget,
        context: 'migrate player inventory',
      });

      // 4. Sign and execute with admin wallet
      MigrationLogger.transaction('Signing and executing migration transaction');

      const result = await client.signAndExecuteTransaction({
        signer: this.adminWallet.getKeypair(),
        transaction: txb,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      if (result.effects?.status?.status === 'success') {
        MigrationLogger.transaction('Inventory migrated successfully', {
          digest: result.digest
        });
        return {
          success: true,
          digest: result.digest,
        };
      } else {
        const error = result.effects?.status?.error || 'Unknown error';
        MigrationLogger.error('Migration failed', error);
        return {
          success: false,
          error: `Migration failed: ${error}`,
        };
      }
    } catch (error) {
      MigrationLogger.error('Error migrating inventory', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

