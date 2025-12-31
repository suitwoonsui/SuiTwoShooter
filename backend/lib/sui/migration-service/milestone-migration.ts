// Milestone migration service for transferring milestone data from old AchievementRegistry to new AchievementRegistry
import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { AdminWalletService } from '../admin-wallet-service';
import { getConfig } from '@/config/config';
import { BadgeLogger } from '../badge-logger';
import { executeTransactionWithFinalization } from '../transaction-helpers';

interface MilestoneDefinition {
  milestone_level: number;
  category: number;
  threshold: bigint;
  credits: bigint;
  items: Array<{
    item_id: number;
    level: number;
    quantity: bigint;
  }>;
}

interface PlayerClaimedMilestones {
  player: string;
  categories: Record<number, number[]>; // category -> milestone levels
}

export class MilestoneMigrationService {
  private adminWallet: AdminWalletService;
  private config: ReturnType<typeof getConfig>;

  constructor(adminWallet: AdminWalletService) {
    this.adminWallet = adminWallet;
    this.config = getConfig();
  }

  /**
   * Read all milestone definitions from old contract
   */
  async readOldMilestoneDefinitions(
    oldPackageId: string,
    oldRegistryId: string
  ): Promise<{
    success: boolean;
    definitions?: Record<number, MilestoneDefinition[]>; // category -> definitions
    error?: string;
  }> {
    try {
      const network = this.config.sui.network;
      const client = network === 'testnet'
        ? this.adminWallet.getTestnetClient()
        : this.adminWallet.getMainnetClient();

      BadgeLogger.info('Reading milestone definitions from old contract', {
        oldPackageId,
        oldRegistryId,
      });

      const definitions: Record<number, MilestoneDefinition[]> = {};
      const categoryCodes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]; // All 12 categories

      // For each category, get all milestone levels, then read each definition
      for (const category of categoryCodes) {
        try {
          // Get all milestone levels for this category
          const levelsTxb = new Transaction();
          levelsTxb.setSender(this.adminWallet.getAddress());
          levelsTxb.moveCall({
            target: `${oldPackageId}::achievement_system::get_all_milestone_levels_for_category`,
            arguments: [
              levelsTxb.object(oldRegistryId),
              levelsTxb.pure.u8(category),
            ],
          });

          const levelsResult = await client.devInspectTransactionBlock({
            sender: this.adminWallet.getAddress(),
            transactionBlock: levelsTxb,
          });

          const milestoneLevels: number[] = [];
          if (levelsResult.results && levelsResult.results[0] && 'returnValues' in levelsResult.results[0]) {
            const returnValues = levelsResult.results[0].returnValues;
            if (returnValues && returnValues.length > 0) {
              const val = returnValues[0];
              let byteArray: number[] | null = null;

              if (Array.isArray(val)) {
                if (val.length === 2 && Array.isArray(val[0])) {
                  byteArray = val[0] as number[];
                } else if (typeof val[0] === 'string') {
                  byteArray = Array.from(Buffer.from(val[0], 'base64'));
                }
              }

              if (byteArray && byteArray.length > 0) {
                const length = byteArray[0];
                for (let i = 1; i <= length && i < byteArray.length; i++) {
                  milestoneLevels.push(byteArray[i]);
                }
              }
            }
          }

          if (milestoneLevels.length === 0) {
            BadgeLogger.debug(`No milestone levels found for category ${category} in old contract`);
            definitions[category] = [];
            continue;
          }

          // Read each milestone definition
          const categoryDefinitions: MilestoneDefinition[] = [];
          for (const level of milestoneLevels) {
            try {
              const defTxb = new Transaction();
              defTxb.setSender(this.adminWallet.getAddress());
              defTxb.moveCall({
                target: `${oldPackageId}::achievement_system::get_milestone_definition_full`,
                arguments: [
                  defTxb.object(oldRegistryId),
                  defTxb.pure.u8(category),
                  defTxb.pure.u8(level),
                ],
              });

              const defResult = await client.devInspectTransactionBlock({
                sender: this.adminWallet.getAddress(),
                transactionBlock: defTxb,
              });

              if (defResult.results && defResult.results[0] && 'returnValues' in defResult.results[0]) {
                const returnValues = defResult.results[0].returnValues;
                
                // Check if old contract returns 4 values (old format) or 5 values (new format with milestone_id)
                // Old format: (bool, u64, u64, vector<ItemReward>) = (exists, threshold, credits, items)
                // New format: (bool, u64, u64, u64, vector<ItemReward>) = (exists, milestone_id, threshold, credits, items)
                if (returnValues && returnValues.length >= 4) {
                  const existsBytes = this.extractBytes(returnValues[0]);
                  const exists = this.parseBoolFromBytes(existsBytes);
                  if (!exists) continue;

                  let thresholdBytes: number[] | string | null;
                  let creditsBytes: number[] | string | null;
                  let itemsBytes: number[] | string | null;

                  if (returnValues.length >= 5) {
                    // New format: 5 return values (includes milestone_id)
                    // Skip milestone_id (returnValues[1]) - we don't need it for migration
                    thresholdBytes = this.extractBytes(returnValues[2]);
                    creditsBytes = this.extractBytes(returnValues[3]);
                    itemsBytes = this.extractBytes(returnValues[4]);
                  } else {
                    // Old format: 4 return values (no milestone_id)
                    thresholdBytes = this.extractBytes(returnValues[1]);
                    creditsBytes = this.extractBytes(returnValues[2]);
                    itemsBytes = this.extractBytes(returnValues[3]);
                  }

                  const threshold = this.parseU64FromBytes(thresholdBytes);
                  const credits = this.parseU64FromBytes(creditsBytes);
                  const items = this.parseItemRewardsVector(itemsBytes);

                  categoryDefinitions.push({
                    milestone_level: level,
                    category,
                    threshold,
                    credits,
                    items,
                  });
                }
              }

              // Small delay to avoid rate limiting
              await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
              BadgeLogger.warn(`Failed to read milestone definition for category ${category} level ${level}`, {
                error: error instanceof Error ? error.message : 'Unknown error',
              });
            }
          }

          definitions[category] = categoryDefinitions;
          BadgeLogger.info(`Read ${categoryDefinitions.length} milestone definitions for category ${category}`);

        } catch (error) {
          BadgeLogger.warn(`Failed to read milestone definitions for category ${category}`, {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          definitions[category] = [];
        }
      }

      const totalDefinitions = Object.values(definitions).reduce((sum, defs) => sum + defs.length, 0);
      BadgeLogger.info(`Read ${totalDefinitions} total milestone definitions from old contract`);

      return {
        success: true,
        definitions,
      };
    } catch (error) {
      BadgeLogger.error('Error reading old milestone definitions', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Read all player claimed milestones from old contract
   */
  async readOldPlayerClaimedMilestones(
    oldPackageId: string,
    oldRegistryId: string,
    playerAddress?: string // If provided, only read for this player; otherwise read all
  ): Promise<{
    success: boolean;
    claimed?: PlayerClaimedMilestones[];
    error?: string;
  }> {
    try {
      const network = this.config.sui.network;
      const client = network === 'testnet'
        ? this.adminWallet.getTestnetClient()
        : this.adminWallet.getMainnetClient();

      BadgeLogger.info('Reading player claimed milestones from old contract', {
        oldPackageId,
        oldRegistryId,
        playerAddress: playerAddress || 'all players',
      });

      // Query AchievementClaimed events to find all players who have claimed milestones
      const events = await client.queryEvents({
        query: {
          MoveModule: {
            package: oldPackageId,
            module: 'achievement_system',
          },
        },
        limit: 1000,
        order: 'descending',
      });

      const playerClaims: Map<string, Record<number, Set<number>>> = new Map(); // player -> category -> Set<levels>

      for (const event of events.data) {
        if (event.type?.includes('AchievementClaimed')) {
          try {
            const eventData = event.parsedJson as any;
            const player = eventData.player as string;
            const category = Number(eventData.category);
            const milestoneLevel = Number(eventData.milestone_level);

            if (playerAddress && player.toLowerCase() !== playerAddress.toLowerCase()) {
              continue; // Skip if filtering by player
            }

            if (!playerClaims.has(player)) {
              playerClaims.set(player, {});
            }

            const playerCategories = playerClaims.get(player)!;
            if (!playerCategories[category]) {
              playerCategories[category] = new Set();
            }

            playerCategories[category].add(milestoneLevel);
          } catch (error) {
            BadgeLogger.debug('Error parsing AchievementClaimed event', { error });
            continue;
          }
        }
      }

      // Convert to array format
      const claimed: PlayerClaimedMilestones[] = [];
      for (const [player, categories] of playerClaims.entries()) {
        const categoriesArray: Record<number, number[]> = {};
        for (const [category, levels] of Object.entries(categories)) {
          categoriesArray[Number(category)] = Array.from(levels);
        }
        claimed.push({
          player,
          categories: categoriesArray,
        });
      }

      BadgeLogger.info(`Found ${claimed.length} players with claimed milestones in old contract`);

      return {
        success: true,
        claimed,
      };
    } catch (error) {
      BadgeLogger.error('Error reading old player claimed milestones', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Migrate milestone definitions from old contract to new contract
   */
  async migrateMilestoneDefinitions(
    oldPackageId: string,
    oldRegistryId: string,
    newPackageId: string,
    newRegistryId: string,
    newAdminCapId: string,
    force?: boolean // Force migration even if milestones already exist
  ): Promise<{
    success: boolean;
    migrated?: number;
    skipped?: number;
    errors?: Array<{ category: number; level: number; error: string }>;
    error?: string;
  }> {
    try {
      // Read old definitions
      const readResult = await this.readOldMilestoneDefinitions(oldPackageId, oldRegistryId);
      if (!readResult.success || !readResult.definitions) {
        return {
          success: false,
          error: readResult.error || 'Failed to read old milestone definitions',
        };
      }

      const network = this.config.sui.network;
      const client = network === 'testnet'
        ? this.adminWallet.getTestnetClient()
        : this.adminWallet.getMainnetClient();

      // Check existing milestones in new contract
      const existingLevels: Record<number, Set<number>> = {};
      if (!force) {
        for (const category of Object.keys(readResult.definitions).map(Number)) {
          try {
            const levelsTxb = new Transaction();
            levelsTxb.setSender(this.adminWallet.getAddress());
            levelsTxb.moveCall({
              target: `${newPackageId}::achievement_system::get_all_milestone_levels_for_category`,
              arguments: [
                levelsTxb.object(newRegistryId),
                levelsTxb.pure.u8(category),
              ],
            });

            const levelsResult = await client.devInspectTransactionBlock({
              sender: this.adminWallet.getAddress(),
              transactionBlock: levelsTxb,
            });

            const levels = new Set<number>();
            if (levelsResult.results && levelsResult.results[0] && 'returnValues' in levelsResult.results[0]) {
              const returnValues = levelsResult.results[0].returnValues;
              if (returnValues && returnValues.length > 0) {
                const val = returnValues[0];
                let byteArray: number[] | null = null;

                if (Array.isArray(val)) {
                  if (val.length === 2 && Array.isArray(val[0])) {
                    byteArray = val[0] as number[];
                  } else if (typeof val[0] === 'string') {
                    byteArray = Array.from(Buffer.from(val[0], 'base64'));
                  }
                }

                if (byteArray && byteArray.length > 0) {
                  const length = byteArray[0];
                  for (let i = 1; i <= length && i < byteArray.length; i++) {
                    levels.add(byteArray[i]);
                  }
                }
              }
            }

            existingLevels[category] = levels;
          } catch (error) {
            BadgeLogger.warn(`Failed to check existing levels for category ${category}`, { error });
            existingLevels[category] = new Set();
          }
        }
      }

      // Migrate definitions by category (batch per category)
      let totalMigrated = 0;
      let totalSkipped = 0;
      const errors: Array<{ category: number; level: number; error: string }> = [];

      for (const [categoryStr, definitions] of Object.entries(readResult.definitions)) {
        const category = Number(categoryStr);
        const existing = existingLevels[category] || new Set();

        // Filter out existing milestones unless force is true
        const toMigrate = force
          ? definitions
          : definitions.filter(def => !existing.has(def.milestone_level));

        if (toMigrate.length === 0) {
          totalSkipped += definitions.length;
          continue;
        }

        // Build batch transaction for this category
        const txb = new Transaction();
        txb.setSender(this.adminWallet.getAddress());

        for (const def of toMigrate) {
          const itemIds: number[] = [];
          const itemLevels: number[] = [];
          const itemQuantities: bigint[] = [];

          for (const item of def.items) {
            itemIds.push(item.item_id);
            itemLevels.push(item.level);
            itemQuantities.push(item.quantity);
          }

          txb.moveCall({
            target: `${newPackageId}::achievement_system::add_milestone_definition_entry`,
            arguments: [
              txb.object(newAdminCapId),
              txb.object(newRegistryId),
              txb.pure.u8(category),
              txb.pure.u8(def.milestone_level),
              txb.pure.u64(def.threshold),
              txb.pure.u64(def.credits),
              txb.pure('vector<u8>', itemIds),
              txb.pure('vector<u8>', itemLevels),
              txb.pure('vector<u64>', itemQuantities),
              txb.object('0x6'), // Clock
            ],
          });
        }

        try {
          const result = await executeTransactionWithFinalization(
            client,
            this.adminWallet.getKeypair(),
            txb,
            {
              logger: {
                info: (msg, data) => BadgeLogger.info(msg, data),
                warn: (msg, data) => BadgeLogger.warn(msg, data),
                error: (msg, data) => BadgeLogger.error(msg, data),
              },
            }
          );

          totalMigrated += toMigrate.length;
          totalSkipped += definitions.length - toMigrate.length;

          BadgeLogger.info(`Migrated ${toMigrate.length} milestone definitions for category ${category}`, {
            digest: result.digest,
          });

          // Small delay between categories
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          BadgeLogger.error(`Failed to migrate milestone definitions for category ${category}`, {
            error: errorMsg,
          });

          for (const def of toMigrate) {
            errors.push({
              category,
              level: def.milestone_level,
              error: errorMsg,
            });
          }
        }
      }

      return {
        success: errors.length === 0,
        migrated: totalMigrated,
        skipped: totalSkipped,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      BadgeLogger.error('Error migrating milestone definitions', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Migrate player claimed milestones from old contract to new contract
   */
  async migratePlayerClaimedMilestones(
    oldPackageId: string,
    oldRegistryId: string,
    newPackageId: string,
    newRegistryId: string,
    newAdminCapId: string,
    playerAddress?: string // If provided, only migrate for this player
  ): Promise<{
    success: boolean;
    migrated?: number;
    errors?: Array<{ player: string; category: number; level: number; error: string }>;
    error?: string;
  }> {
    try {
      // Read old claimed milestones
      const readResult = await this.readOldPlayerClaimedMilestones(
        oldPackageId,
        oldRegistryId,
        playerAddress
      );

      if (!readResult.success || !readResult.claimed) {
        return {
          success: false,
          error: readResult.error || 'Failed to read old player claimed milestones',
        };
      }

      const network = this.config.sui.network;
      const client = network === 'testnet'
        ? this.adminWallet.getTestnetClient()
        : this.adminWallet.getMainnetClient();

      let totalMigrated = 0;
      const errors: Array<{ player: string; category: number; level: number; error: string }> = [];

      // Migrate each player's claimed milestones
      for (const playerClaim of readResult.claimed) {
        // Build transaction for this player (batch all their claims)
        const txb = new Transaction();
        txb.setSender(this.adminWallet.getAddress());

        for (const [categoryStr, levels] of Object.entries(playerClaim.categories)) {
          const category = Number(categoryStr);
          for (const level of levels) {
            txb.moveCall({
              target: `${newPackageId}::achievement_system::claim_milestone`,
              arguments: [
                txb.object(newAdminCapId),
                txb.object(newRegistryId),
                txb.pure.address(playerClaim.player),
                txb.pure.u8(category),
                txb.pure.u8(level),
                txb.object('0x6'), // Clock
              ],
            });
          }
        }

        try {
          const result = await executeTransactionWithFinalization(
            client,
            this.adminWallet.getKeypair(),
            txb,
            {
              logger: {
                info: (msg, data) => BadgeLogger.info(msg, data),
                warn: (msg, data) => BadgeLogger.warn(msg, data),
                error: (msg, data) => BadgeLogger.error(msg, data),
              },
            }
          );

          const claimCount = Object.values(playerClaim.categories).reduce((sum, levels) => sum + levels.length, 0);
          totalMigrated += claimCount;

          BadgeLogger.info(`Migrated ${claimCount} claimed milestones for player ${playerClaim.player}`, {
            digest: result.digest,
          });

          // Small delay between players
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          BadgeLogger.error(`Failed to migrate claimed milestones for player ${playerClaim.player}`, {
            error: errorMsg,
          });

          for (const [categoryStr, levels] of Object.entries(playerClaim.categories)) {
            const category = Number(categoryStr);
            for (const level of levels) {
              errors.push({
                player: playerClaim.player,
                category,
                level,
                error: errorMsg,
              });
            }
          }
        }
      }

      return {
        success: errors.length === 0,
        migrated: totalMigrated,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      BadgeLogger.error('Error migrating player claimed milestones', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Helper methods for parsing
  private extractBytes(val: unknown): number[] | string | null {
    if (Array.isArray(val)) {
      if (val.length === 2) {
        const bytesVal = val[0];
        if (Array.isArray(bytesVal)) {
          return bytesVal as number[];
        } else if (typeof bytesVal === 'string') {
          return bytesVal;
        }
      } else if (val.length > 0 && typeof val[0] === 'number') {
        return val as number[];
      }
    } else if (typeof val === 'string') {
      return val;
    }
    return null;
  }

  private parseBoolFromBytes(bytes: number[] | string | null): boolean {
    if (!bytes) return false;
    if (typeof bytes === 'string') {
      const buffer = Buffer.from(bytes, 'base64');
      return buffer.length > 0 && buffer[0] !== 0;
    }
    if (Array.isArray(bytes)) {
      return bytes.length > 0 && bytes[0] !== 0;
    }
    return false;
  }

  private parseU64FromBytes(bytes: number[] | string | null): bigint {
    if (!bytes) return BigInt(0);
    
    let byteArray: number[];
    if (typeof bytes === 'string') {
      byteArray = Array.from(Buffer.from(bytes, 'base64'));
    } else {
      byteArray = bytes;
    }

    if (byteArray.length < 8) return BigInt(0);

    let value = BigInt(0);
    for (let i = 0; i < 8; i++) {
      value = value | (BigInt(byteArray[i]) << BigInt(i * 8));
    }
    return value;
  }

  private parseItemRewardsVector(bytes: number[] | string | null): Array<{
    item_id: number;
    level: number;
    quantity: bigint;
  }> {
    const items: Array<{ item_id: number; level: number; quantity: bigint }> = [];

    if (!bytes) return items;

    let byteArray: number[];
    if (typeof bytes === 'string') {
      byteArray = Array.from(Buffer.from(bytes, 'base64'));
    } else if (Array.isArray(bytes)) {
      byteArray = bytes;
    } else {
      return items;
    }

    if (byteArray.length === 0) return items;

    // Parse vector length (ULEB128 or u8)
    let offset = 0;
    let length = 0;
    let lengthBytes = 0;

    // Try ULEB128 first
    while (lengthBytes < 5 && offset < byteArray.length) {
      const byte = byteArray[offset];
      lengthBytes++;
      length = length | ((byte & 0x7f) << (lengthBytes - 1) * 7);
      offset++;
      if ((byte & 0x80) === 0) break;
    }

    // If ULEB128 failed, try simple u8
    if (lengthBytes === 0 || length === 0) {
      length = byteArray.length > 0 ? byteArray[0] : 0;
      offset = 1;
    }

    // Parse items
    for (let i = 0; i < length && offset + 10 <= byteArray.length; i++) {
      const itemId = byteArray[offset];
      offset += 1;
      const level = byteArray[offset];
      offset += 1;

      // Parse quantity (u64, little-endian)
      let quantity = BigInt(0);
      for (let j = 0; j < 8; j++) {
        quantity = quantity | (BigInt(byteArray[offset + j]) << BigInt(j * 8));
      }
      offset += 8;

      items.push({ item_id: itemId, level, quantity });
    }

    return items;
  }
}

