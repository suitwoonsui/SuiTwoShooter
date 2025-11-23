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

      console.log(`🔍 [MIGRATION] Fetching all wallets with inventory from old store...`);
      
      // Get all dynamic fields from the old store
      const allFields = await client.getDynamicFields({
        parentId: oldStoreObjectId,
      });

      console.log(`📋 [MIGRATION] Found ${allFields.data.length} dynamic fields (inventories)`);

      // Extract wallet addresses from dynamic field names
      const wallets: string[] = [];
      for (const field of allFields.data) {
        // Dynamic field name should be of type 'address'
        if (field.name?.type === 'address' && field.name?.value) {
          // Type assertion: when type is 'address', value is a string
          wallets.push(String(field.name.value));
        }
      }

      console.log(`✅ [MIGRATION] Found ${wallets.length} wallets with inventory`);

      return {
        success: true,
        wallets,
      };
    } catch (error) {
      console.error('❌ [MIGRATION] Error fetching wallets with inventory:', error);
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

      if (!newStoreObjectId || !adminCapabilityObjectId || adminCapabilityObjectId === '') {
        return {
          success: false,
          error: `New store not configured. Missing: ${!newStoreObjectId ? 'PREMIUM_STORE_OBJECT_ID_TESTNET' : ''} ${!adminCapabilityObjectId || adminCapabilityObjectId === '' ? 'PREMIUM_STORE_ADMIN_CAPABILITY_OBJECT_ID_TESTNET' : ''}`,
        };
      }

      // Verify the admin capability object exists and is the correct type
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
          console.error(`❌ [MIGRATION] Admin capability object not found: ${adminCapabilityObjectId}`);
          return {
            success: false,
            error: `Admin capability object not found: ${adminCapabilityObjectId}. Please verify PREMIUM_STORE_ADMIN_CAPABILITY_OBJECT_ID_TESTNET is correct.`,
          };
        }

        const objectType = adminCapObject.data?.type || 'unknown';
        const owner = adminCapObject.data?.owner;
        
        // Extract package ID from admin capability type
        const adminCapPackageId = objectType.split('::')[0];
        
        console.log(`🔍 [MIGRATION] Admin capability object type: ${objectType}`);
        console.log(`🔍 [MIGRATION] Admin capability package ID: ${adminCapPackageId}`);
        console.log(`🔍 [MIGRATION] New store package ID: ${newPackageId}`);
        console.log(`🔍 [MIGRATION] Admin capability owner: ${JSON.stringify(owner)}`);
        console.log(`🔍 [MIGRATION] Admin wallet address: ${this.adminWallet.getAddress()}`);

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
        console.error('❌ [MIGRATION] Could not verify admin capability object:', errorMessage);
        return {
          success: false,
          error: `Failed to verify admin capability object: ${errorMessage}. Please check that PREMIUM_STORE_ADMIN_CAPABILITY_OBJECT_ID_TESTNET is correct.`,
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

  /**
   * Read player statistics from old StatisticsRegistry
   */
  async readOldPlayerStats(
    oldPackageId: string,
    oldStatsRegistryId: string,
    playerAddress: string
  ): Promise<{
    success: boolean;
    stats?: {
      total_games: number;
      best_score: number;
      best_distance: number;
      best_coins: number;
      best_bosses_defeated: number;
      best_enemies_defeated: number;
      best_coin_streak: number;
      total_score: number;
      total_distance: number;
      total_coins: number;
      total_bosses_defeated: number;
      total_enemies_defeated: number;
      total_coin_streak: number;
      first_game_date: number;
      last_game_date: number;
    };
    error?: string;
  }> {
    try {
      const network = this.config.sui.network;
      const client = network === 'testnet' 
        ? this.adminWallet.getTestnetClient()
        : this.adminWallet.getMainnetClient();

      console.log(`🔍 [SCORE MIGRATION] Querying old stats for ${playerAddress}...`);
      
      const { Transaction } = await import('@mysten/sui/transactions');
      const tx = new Transaction();
      tx.moveCall({
        target: `${oldPackageId}::score_submission::get_player_stats`,
        arguments: [
          tx.object(oldStatsRegistryId),
          tx.pure.address(playerAddress),
        ],
      });

      const result = await client.devInspectTransactionBlock({
        transactionBlock: tx,
        sender: this.adminWallet.getAddress(),
      });

      if (!result.results || !result.results[0].returnValues) {
        return {
          success: false,
          error: 'Failed to get player stats from old registry',
        };
      }

      const returnValues = result.results[0].returnValues;
      const hasStats = String(returnValues[0][1]) === '1' || Number(returnValues[0][1]) === 1;

      if (!hasStats) {
        return {
          success: false,
          error: 'Player has no stats in old registry',
        };
      }

      // Parse all stats fields
      const stats = {
        total_games: Number(returnValues[1][1]),
        best_score: Number(returnValues[2][1]),
        best_distance: Number(returnValues[3][1]),
        best_coins: Number(returnValues[4][1]),
        best_bosses_defeated: Number(returnValues[5][1]),
        best_enemies_defeated: Number(returnValues[6][1]),
        best_coin_streak: Number(returnValues[7][1]),
        total_score: Number(returnValues[8][1]),
        total_distance: Number(returnValues[9][1]),
        total_coins: Number(returnValues[10][1]),
        total_bosses_defeated: Number(returnValues[11][1]),
        total_enemies_defeated: Number(returnValues[12][1]),
        total_coin_streak: Number(returnValues[13][1]),
        first_game_date: Number(returnValues[14][1]),
        last_game_date: Number(returnValues[15][1]),
      };

      console.log(`✅ [SCORE MIGRATION] Successfully read stats from old registry`);

      return {
        success: true,
        stats,
      };
    } catch (error) {
      console.error('❌ [SCORE MIGRATION] Error reading old stats:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get all wallet addresses that have statistics in the old StatisticsRegistry
   * Note: Sui Tables don't support direct enumeration, so we need to query events or use a different approach
   * For now, this function will return an error suggesting manual input or event-based discovery
   */
  async getAllWalletsWithStats(
    oldPackageId: string,
    oldStatsRegistryId: string
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

      console.log(`🔍 [SCORE MIGRATION] Attempting to discover wallets with stats from old registry...`);
      
      // Sui Tables don't support enumeration directly
      // We can try to query ScoreSubmitted events to find all players who have submitted scores
      // This is the most reliable way to discover wallets with stats
      
      try {
        // Query ScoreSubmitted events from the old package
        // These events are emitted when scores are submitted, so all players with stats should have events
        // Note: filter property is no longer supported, using query instead
        const events = await client.queryEvents({
          query: {
            MoveModule: {
              package: oldPackageId,
              module: 'score_submission',
            },
          },
          limit: 1000, // Adjust as needed
        });

        console.log(`📋 [SCORE MIGRATION] Found ${events.data.length} events`);

        // Extract unique player addresses from events
        const walletsSet = new Set<string>();
        for (const event of events.data) {
          if (event.parsedJson && typeof event.parsedJson === 'object') {
            const player = (event.parsedJson as any).player;
            if (player && typeof player === 'string' && player.startsWith('0x')) {
              walletsSet.add(player);
            }
          }
        }

        const wallets = Array.from(walletsSet);
        console.log(`✅ [SCORE MIGRATION] Found ${wallets.length} unique wallets with stats (from events)`);

        return {
          success: true,
          wallets,
        };
      } catch (eventError) {
        console.warn('⚠️ [SCORE MIGRATION] Event-based discovery failed, trying alternative method...');
        console.warn(`   Error: ${eventError instanceof Error ? eventError.message : String(eventError)}`);
        
        // Alternative: Try to get dynamic fields (in case the registry structure is different)
        try {
          const allFields = await client.getDynamicFields({
            parentId: oldStatsRegistryId,
          });

          console.log(`📋 [SCORE MIGRATION] Found ${allFields.data.length} dynamic fields`);

          const wallets: string[] = [];
          for (const field of allFields.data) {
            if (field.name?.type === 'address' && field.name?.value) {
              wallets.push(String(field.name.value));
            }
          }

          if (wallets.length > 0) {
            console.log(`✅ [SCORE MIGRATION] Found ${wallets.length} wallets with stats (from dynamic fields)`);
            return {
              success: true,
              wallets,
            };
          }
        } catch (dynamicFieldError) {
          console.warn('⚠️ [SCORE MIGRATION] Dynamic field discovery also failed');
        }

        // If both methods fail, return an error with helpful message
        return {
          success: false,
          error: 'Unable to automatically discover wallets. Sui Tables do not support enumeration. Please use Single or Batch mode to manually specify wallet addresses, or ensure ScoreSubmitted events are available from the old contract.',
        };
      }
    } catch (error) {
      console.error('❌ [SCORE MIGRATION] Error fetching wallets with stats:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Migrate player statistics from old StatisticsRegistry to new StatisticsRegistry
   */
  async migratePlayerStats(
    playerAddress: string,
    oldPackageId: string,
    oldStatsRegistryId: string
  ): Promise<{
    success: boolean;
    digest?: string;
    error?: string;
  }> {
    try {
      // 1. Read stats from old registry
      console.log(`🔄 [SCORE MIGRATION] Reading stats from old registry for ${playerAddress}...`);
      const oldStats = await this.readOldPlayerStats(oldPackageId, oldStatsRegistryId, playerAddress);
      
      if (!oldStats.success || !oldStats.stats) {
        return {
          success: false,
          error: oldStats.error || 'Failed to read old stats',
        };
      }

      const stats = oldStats.stats;
      console.log(`📊 [SCORE MIGRATION] Old stats:`, stats);

      // Check if there are any stats to migrate
      if (stats.total_games === 0 && stats.best_score === 0) {
        return {
          success: false,
          error: 'No stats to migrate (player has no games recorded)',
        };
      }

      // 2. Get new registry configuration
      const newPackageId = this.config.contracts.gameScore.includes('::')
        ? this.config.contracts.gameScore.split('::')[0]
        : this.config.contracts.gameScore;
      const newStatsRegistryId = this.config.contracts.statisticsRegistry;
      const adminCapabilityObjectId = this.config.contracts.adminCapability;

      if (!newStatsRegistryId || !adminCapabilityObjectId || adminCapabilityObjectId === '') {
        return {
          success: false,
          error: `New statistics registry not configured. Missing: ${!newStatsRegistryId ? 'STATISTICS_REGISTRY_OBJECT_ID_TESTNET' : ''} ${!adminCapabilityObjectId || adminCapabilityObjectId === '' ? 'ADMIN_CAPABILITY_OBJECT_ID_TESTNET' : ''}`,
        };
      }

      // Verify the admin capability object exists
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
          console.error(`❌ [SCORE MIGRATION] Admin capability object not found: ${adminCapabilityObjectId}`);
          return {
            success: false,
            error: `Admin capability object not found: ${adminCapabilityObjectId}. Please verify ADMIN_CAPABILITY_OBJECT_ID_TESTNET is correct.`,
          };
        }

        const objectType = adminCapObject.data?.type || 'unknown';
        
        // Verify it's the correct type (score_submission::AdminCapability)
        if (!objectType.includes('score_submission::AdminCapability')) {
          return {
            success: false,
            error: `Wrong admin capability type! The object at ${adminCapabilityObjectId} is of type ${objectType}, but expected score_submission::AdminCapability. Please use the score_submission admin capability.`,
          };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('❌ [SCORE MIGRATION] Could not verify admin capability object:', errorMessage);
        return {
          success: false,
          error: `Failed to verify admin capability object: ${errorMessage}. Please check that ADMIN_CAPABILITY_OBJECT_ID_TESTNET is correct.`,
        };
      }

      // 3. Build migration transaction
      console.log(`🔄 [SCORE MIGRATION] Building migration transaction...`);
      const { Transaction } = await import('@mysten/sui/transactions');
      const txb = new Transaction();

      txb.moveCall({
        target: `${newPackageId}::score_submission::migrate_player_stats`,
        arguments: [
          txb.object(adminCapabilityObjectId),
          txb.object(oldStatsRegistryId), // Old registry (read-only)
          txb.object(newStatsRegistryId), // New registry (mutable)
          txb.pure.address(playerAddress),
        ],
      });

      txb.setGasBudget(this.config.sui.gasBudget);

      // 4. Sign and execute with admin wallet
      console.log(`🔐 [SCORE MIGRATION] Signing and executing migration transaction...`);
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
        console.log(`✅ [SCORE MIGRATION] Stats migrated successfully!`);
        console.log(`   Transaction Digest: ${result.digest}`);
        return {
          success: true,
          digest: result.digest,
        };
      } else {
        const error = result.effects?.status?.error || 'Unknown error';
        console.error(`❌ [SCORE MIGRATION] Migration failed:`, error);
        return {
          success: false,
          error: `Migration failed: ${error}`,
        };
      }
    } catch (error) {
      console.error('❌ [SCORE MIGRATION] Error migrating stats:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

