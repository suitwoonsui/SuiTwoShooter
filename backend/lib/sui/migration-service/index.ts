// Migration service facade - provides backward compatibility with the old MigrationService class
// while delegating to focused service classes
import { AdminWalletService } from '../admin-wallet-service';
import { InventoryMigrationService } from './inventory-migration';
import { StatsMigrationService } from './stats-migration';
import { GamePassMigrationService } from './game-pass-migration';

/**
 * MigrationService - Facade for all migration operations
 * Maintains backward compatibility with existing code while delegating to focused services
 */
export class MigrationService {
  private inventoryService: InventoryMigrationService;
  private statsService: StatsMigrationService;
  private gamePassService: GamePassMigrationService;

  constructor(adminWallet: AdminWalletService) {
    this.inventoryService = new InventoryMigrationService(adminWallet);
    this.statsService = new StatsMigrationService(adminWallet);
    this.gamePassService = new GamePassMigrationService(adminWallet);
  }

  // Inventory migration methods
  async readOldInventory(
    oldPackageId: string,
    oldStoreObjectId: string,
    playerAddress: string
  ) {
    return this.inventoryService.readOldInventory(oldPackageId, oldStoreObjectId, playerAddress);
  }

  async getAllWalletsWithInventory(oldStoreObjectId: string) {
    return this.inventoryService.getAllWalletsWithInventory(oldStoreObjectId);
  }

  async migratePlayerInventory(
    playerAddress: string,
    oldPackageId: string,
    oldStoreObjectId: string
  ) {
    return this.inventoryService.migratePlayerInventory(playerAddress, oldPackageId, oldStoreObjectId);
  }

  // Stats migration methods
  async readOldPlayerStats(
    oldPackageId: string,
    oldStatsRegistryId: string,
    playerAddress: string
  ) {
    return this.statsService.readOldPlayerStats(oldPackageId, oldStatsRegistryId, playerAddress);
  }

  async getAllWalletsWithStats(
    oldPackageId: string,
    oldStatsRegistryId: string
  ) {
    return this.statsService.getAllWalletsWithStats(oldPackageId, oldStatsRegistryId);
  }

  async getAllPlayersWithStats() {
    return this.statsService.getAllPlayersWithStats();
  }

  async clearPlayerStats(playerAddress: string) {
    return this.statsService.clearPlayerStats(playerAddress);
  }

  async clearAllPlayerStats() {
    return this.statsService.clearAllPlayerStats();
  }

  async queryOldPlayerEvents(oldPackageId: string, playerAddress: string) {
    return this.statsService.queryOldPlayerEvents(oldPackageId, playerAddress);
  }

  async migrateAllGameSessions(playerAddress: string, oldPackageId: string) {
    return this.statsService.migrateAllGameSessions(playerAddress, oldPackageId);
  }

  async migratePlayerStats(
    playerAddress: string,
    oldPackageId: string,
    oldStatsRegistryId: string,
    migrateIndividualSessions: boolean = true
  ) {
    return this.statsService.migratePlayerStats(
      playerAddress,
      oldPackageId,
      oldStatsRegistryId,
      migrateIndividualSessions
    );
  }

  // Game pass migration methods
  async readOldGamePass(
    oldPackageId: string,
    oldGamePassSystemId: string,
    playerAddress: string
  ) {
    return this.gamePassService.readOldGamePass(oldPackageId, oldGamePassSystemId, playerAddress);
  }

  async getAllWalletsWithGamePasses(
    oldPackageId: string,
    oldGamePassSystemId: string
  ) {
    return this.gamePassService.getAllWalletsWithGamePasses(oldPackageId, oldGamePassSystemId);
  }

  async migrateGamePass(
    playerAddress: string,
    oldPackageId: string,
    oldGamePassSystemId: string
  ) {
    return this.gamePassService.migrateGamePass(playerAddress, oldPackageId, oldGamePassSystemId);
  }
}

// Export individual services for direct use if needed
export { InventoryMigrationService } from './inventory-migration';
export { StatsMigrationService } from './stats-migration';
export { GamePassMigrationService } from './game-pass-migration';
export { TournamentMigrationService } from './tournament-migration';

