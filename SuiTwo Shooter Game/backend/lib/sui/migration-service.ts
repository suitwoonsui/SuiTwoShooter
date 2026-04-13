/**
 * Compatibility shim.
 *
 * The shooter backend has moved to platform-backed services for most operations.
 * This class exists so legacy API routes compile and can be incrementally rewired.
 */
export class MigrationService {
  // Accept any admin wallet type (legacy routes pass the admin wallet service instance).
  constructor(_adminWallet: unknown) {}

  async migratePlayerStats(
    _playerAddress: string,
    _oldPackageId: string,
    _oldStatsRegistryId: string
  ): Promise<{ success: boolean; digest?: string; error?: string }> {
    return { success: false, error: 'MigrationService not implemented in this deployment' };
  }

  async getAllWalletsWithStats(
    _oldPackageId: string,
    _oldStatsRegistryId: string
  ): Promise<{ success: boolean; wallets?: string[]; error?: string }> {
    return { success: false, error: 'MigrationService not implemented in this deployment' };
  }

  async migratePlayerInventory(
    _playerAddress: string,
    _oldPackageId: string,
    _oldStoreObjectId: string
  ): Promise<{ success: boolean; digest?: string; error?: string }> {
    return { success: false, error: 'MigrationService not implemented in this deployment' };
  }

  async getAllWalletsWithInventory(
    _oldStoreObjectId: string
  ): Promise<{ success: boolean; wallets?: string[]; error?: string }> {
    return { success: false, error: 'MigrationService not implemented in this deployment' };
  }

  async clearAllPlayerStats(): Promise<{
    success: boolean;
    playersCleared?: number;
    digests?: string[];
    errors?: string[];
    error?: string;
  }> {
    return { success: false, error: 'MigrationService not implemented in this deployment' };
  }

  async clearPlayerStats(
    _playerAddress: string
  ): Promise<{ success: boolean; digest?: string; error?: string }> {
    return { success: false, error: 'MigrationService not implemented in this deployment' };
  }
}

// Legacy naming used by tournament migration routes.
export class TournamentMigrationService extends MigrationService {
  async migrateTournament(
    _tournamentId: number,
    _oldPackageId: string,
    _oldTournamentRegistryId: string,
    _oldTournamentAdminCapId: string
  ): Promise<{ success: boolean; digest?: string; error?: string }> {
    return { success: false, error: 'TournamentMigrationService not implemented in this deployment' };
  }

  async readOldTournament(
    _oldPackageId: string,
    _oldTournamentRegistryId: string,
    _oldTournamentId: number
  ): Promise<{ success: boolean; tournament?: unknown; error?: string }> {
    return { success: false, error: 'TournamentMigrationService not implemented in this deployment' };
  }

  async restoreDataForMigratedTournament(
    _oldTournamentId: number,
    _newTournamentId: number | null,
    _oldPackageId: string,
    _oldTournamentRegistryId: string
  ): Promise<{ success: boolean; digests?: string[]; newTournamentId?: number; error?: string }> {
    return { success: false, error: 'TournamentMigrationService not implemented in this deployment' };
  }

  async getAllTournamentIds(
    _oldPackageId: string,
    _oldTournamentRegistryId: string
  ): Promise<{ success: boolean; tournamentIds?: number[]; error?: string }> {
    return { success: false, error: 'TournamentMigrationService not implemented in this deployment' };
  }
}

