// Migration service for transferring items from old PremiumStore to new PremiumStore
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { AdminWalletService } from './admin-wallet-service';
import { getConfig } from '@/config/config';

export class MigrationService {
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
      console.log(`🔍 [MIGRATION] Querying old inventory for ${playerAddress}...`);
      
      const dynamicFieldName = {
        type: 'address',
        value: playerAddress,
      };

      let inventoryObj;
      try {
        // Try getDynamicFieldObject first (returns the object directly)
        console.log(`🔍 [MIGRATION] Trying direct dynamic field query...`);
        const dynamicField = await client.getDynamicFieldObject({
          parentId: oldStoreObjectId,
          name: dynamicFieldName,
        });

        if (dynamicField.error || !dynamicField.data) {
          throw new Error('Direct query returned error or no data');
        }

        // Get the PlayerInventory object ID from the dynamic field
        const inventoryObjectId = dynamicField.data.objectId;
        console.log(`📦 [MIGRATION] Found inventory object ID: ${inventoryObjectId}`);
        
        inventoryObj = await client.getObject({
          id: inventoryObjectId,
          options: { showContent: true },
        });
      } catch (directError) {
        // If direct query fails, try listing all dynamic fields and finding the one we need
        console.log('⚠️ [MIGRATION] Direct query failed, trying getDynamicFields...');
        console.log(`   Error: ${directError instanceof Error ? directError.message : String(directError)}`);
        
        const allFields = await client.getDynamicFields({
          parentId: oldStoreObjectId,
        });
        
        console.log(`📋 [MIGRATION] Found ${allFields.data.length} dynamic fields`);
        
        // Find the field with matching address
        const matchingField = allFields.data.find(
          (field: any) => field.name?.type === 'address' && field.name?.value === playerAddress
        );
        
        if (!matchingField) {
          console.log('📦 [MIGRATION] No inventory found for player in old store');
          return {
            success: false,
            error: 'Inventory not found in old store',
          };
        }
        
        console.log(`📦 [MIGRATION] Found matching field: ${matchingField.objectId}`);
        
        // Get the actual PlayerInventory object
        inventoryObj = await client.getObject({
          id: matchingField.objectId,
          options: { showContent: true },
        });
      }

      if (inventoryObj.error || !inventoryObj.data?.content) {
        console.error('❌ [MIGRATION] Failed to read inventory object');
        console.error(`   Error: ${inventoryObj.error || 'No content'}`);
        return {
          success: false,
          error: 'Failed to read inventory object',
        };
      }

      // Parse the inventory data
      const content = inventoryObj.data.content as any;
      const fields = content.fields as any;

      console.log(`📦 [MIGRATION] Successfully read inventory from old store`);

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
      console.error('❌ [MIGRATION] Error reading old inventory:', error);
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
      console.log(`🔄 [MIGRATION] Reading inventory from old store for ${playerAddress}...`);
      const oldInventory = await this.readOldInventory(oldPackageId, oldStoreObjectId, playerAddress);
      
      if (!oldInventory.success || !oldInventory.inventory) {
        return {
          success: false,
          error: oldInventory.error || 'Failed to read old inventory',
        };
      }

      const inv = oldInventory.inventory;
      console.log(`📦 [MIGRATION] Old inventory:`, inv);

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

      if (!newStoreObjectId || !adminCapabilityObjectId) {
        return {
          success: false,
          error: 'New store not configured',
        };
      }

      // 3. Build migration transaction
      console.log(`🔄 [MIGRATION] Building migration transaction...`);
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

      // 4. Sign and execute with admin wallet
      console.log(`🔐 [MIGRATION] Signing and executing migration transaction...`);
      const network = this.config.sui.network;
      const client = network === 'testnet' 
        ? this.adminWallet.getTestnetClient()
        : this.adminWallet.getMainnetClient();

      const result = await client.signAndExecuteTransaction({
        signer: this.adminWallet.getKeypair(),
        transaction: txb,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      if (result.effects?.status?.status === 'success') {
        console.log(`✅ [MIGRATION] Inventory migrated successfully!`);
        console.log(`   Transaction Digest: ${result.digest}`);
        return {
          success: true,
          digest: result.digest,
        };
      } else {
        const error = result.effects?.status?.error || 'Unknown error';
        console.error(`❌ [MIGRATION] Migration failed:`, error);
        return {
          success: false,
          error: `Migration failed: ${error}`,
        };
      }
    } catch (error) {
      console.error('❌ [MIGRATION] Error migrating inventory:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

