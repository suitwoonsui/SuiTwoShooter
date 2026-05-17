// ==========================================
// Migration API Client
// Calls platform backend migration APIs over HTTP. Migration is deprecated in-game;
// when used, it must go through the platform API (no in-process platform migration code).
// If the platform does not expose these endpoints (404/410/501), calls throw MigrationApiUnavailableError.
// ==========================================

import { callPlatformBackend, buildPlatformCallOptions } from '@/lib/services/platform/client/platform-client';

/** Thrown when platform migration API is not available (404/410/501). */
export class MigrationApiUnavailableError extends Error {
  constructor(
    message: string = 'Migration is deprecated. Use the platform migration API when available.',
    public readonly status?: number
  ) {
    super(message);
    this.name = 'MigrationApiUnavailableError';
  }
}

function isUnavailableStatus(status: number): boolean {
  return status === 404 || status === 410 || status === 501;
}

async function callMigrationApi<T>(
  path: string,
  options: RequestInit & { body?: string } = {}
): Promise<T> {
  try {
    const opts = buildPlatformCallOptions(undefined, undefined, options as any);
    return await callPlatformBackend<T>(path, {
      ...opts,
      method: options.method || 'GET',
      body: options.body,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const statusMatch = msg.match(/\b(404|410|501)\b/);
    const status = statusMatch ? parseInt(statusMatch[1], 10) : undefined;
    if (status !== undefined && isUnavailableStatus(status)) {
      throw new MigrationApiUnavailableError(
        'Migration is deprecated. Use the platform migration API when available.',
        status
      );
    }
    throw err;
  }
}

// --- Scores (stats) migration ---

export type MigratePlayerStatsBody = {
  playerAddress: string;
  oldPackageId?: string;
  oldStatsRegistryId?: string;
};

export type MigratePlayerStatsResult = {
  success: boolean;
  digest?: string;
  playerAddress?: string;
  message?: string;
  error?: string;
};

export async function migrationApiMigratePlayerStats(
  body: MigratePlayerStatsBody,
  options?: { corridorCapabilityObjectId?: string }
): Promise<MigratePlayerStatsResult> {
  return callMigrationApi<MigratePlayerStatsResult>('api/migration/scores', {
    method: 'POST',
    body: JSON.stringify(body),
    ...options,
  });
}

export type GetWalletsWithStatsParams = {
  oldStatsRegistryId?: string;
  oldPackageId?: string;
};

export type GetWalletsWithStatsResult = {
  success: boolean;
  wallets?: string[];
  count?: number;
  error?: string;
};

export async function migrationApiGetWalletsWithStats(
  params: GetWalletsWithStatsParams,
  options?: { corridorCapabilityObjectId?: string }
): Promise<GetWalletsWithStatsResult> {
  const q = new URLSearchParams();
  if (params.oldStatsRegistryId) q.set('oldStatsRegistryId', params.oldStatsRegistryId);
  if (params.oldPackageId) q.set('oldPackageId', params.oldPackageId);
  const path = `api/migration/scores?${q.toString()}`;
  return callMigrationApi<GetWalletsWithStatsResult>(path, { method: 'GET', ...options });
}

export type ClearStatsParams = {
  playerAddress?: string;
  clearAll?: boolean;
};

export type ClearStatsResult = {
  success: boolean;
  message?: string;
  playersCleared?: number;
  digest?: string;
  digests?: string[];
  errors?: string[];
  error?: string;
};

export async function migrationApiClearStats(
  params: ClearStatsParams,
  options?: { corridorCapabilityObjectId?: string }
): Promise<ClearStatsResult> {
  const q = new URLSearchParams();
  if (params.playerAddress) q.set('playerAddress', params.playerAddress);
  if (params.clearAll) q.set('clearAll', 'true');
  const path = `api/migration/scores?${q.toString()}`;
  return callMigrationApi<ClearStatsResult>(path, { method: 'DELETE', ...options });
}

// --- Inventory migration ---

export type MigratePlayerInventoryBody = {
  playerAddress: string;
  oldPackageId?: string;
  oldStoreObjectId?: string;
};

export type MigratePlayerInventoryResult = {
  success: boolean;
  digest?: string;
  playerAddress?: string;
  message?: string;
  error?: string;
};

export async function migrationApiMigratePlayerInventory(
  body: MigratePlayerInventoryBody,
  options?: { corridorCapabilityObjectId?: string }
): Promise<MigratePlayerInventoryResult> {
  return callMigrationApi<MigratePlayerInventoryResult>('api/migration/inventory', {
    method: 'POST',
    body: JSON.stringify(body),
    ...options,
  });
}

export type GetWalletsWithInventoryParams = {
  oldStoreObjectId?: string;
};

export type GetWalletsWithInventoryResult = {
  success: boolean;
  wallets?: string[];
  count?: number;
  error?: string;
};

export async function migrationApiGetWalletsWithInventory(
  params: GetWalletsWithInventoryParams,
  options?: { corridorCapabilityObjectId?: string }
): Promise<GetWalletsWithInventoryResult> {
  const q = new URLSearchParams();
  if (params.oldStoreObjectId) q.set('oldStoreObjectId', params.oldStoreObjectId);
  const path = `api/migration/inventory?${q.toString()}`;
  return callMigrationApi<GetWalletsWithInventoryResult>(path, { method: 'GET', ...options });
}

// --- Milestones migration ---

export type MigrateMilestonesBody = {
  adminWalletAddress: string;
  oldPackageId?: string;
  oldRegistryId?: string;
  oldAdminCapId?: string;
  migrateDefinitions?: boolean;
  migratePlayerClaims?: boolean;
  playerAddress?: string;
  force?: boolean;
};

export type MigrateMilestonesResult = {
  success: boolean;
  message?: string;
  results?: {
    definitions?: { success: boolean; migrated?: number; skipped?: number; errors?: unknown[]; error?: string };
    playerClaims?: { success: boolean; migrated?: number; errors?: unknown[]; error?: string };
  };
  error?: string;
};

export async function migrationApiMigrateMilestones(
  body: MigrateMilestonesBody,
  options?: { corridorCapabilityObjectId?: string }
): Promise<MigrateMilestonesResult> {
  return callMigrationApi<MigrateMilestonesResult>('api/migration/milestones', {
    method: 'POST',
    body: JSON.stringify(body),
    ...options,
  });
}

export type GetMilestoneWalletsParams = {
  oldPackageId?: string;
  oldRegistryId?: string;
};

export type GetMilestoneWalletsResult = {
  success: boolean;
  wallets?: string[];
  count?: number;
  error?: string;
};

export async function migrationApiGetMilestoneWallets(
  params: GetMilestoneWalletsParams,
  options?: { corridorCapabilityObjectId?: string }
): Promise<GetMilestoneWalletsResult> {
  const q = new URLSearchParams();
  if (params.oldPackageId) q.set('oldPackageId', params.oldPackageId);
  if (params.oldRegistryId) q.set('oldRegistryId', params.oldRegistryId);
  const path = `api/migration/milestones?${q.toString()}`;
  return callMigrationApi<GetMilestoneWalletsResult>(path, { method: 'GET', ...options });
}

export type ReadOldPlayerClaimedMilestonesParams = {
  oldPackageId: string;
  oldRegistryId: string;
  playerAddress?: string;
};

export type ClaimedCategory = Record<string, number[]>;
export type OldPlayerClaimed = { player: string; categories: ClaimedCategory };

export type ReadOldPlayerClaimedMilestonesResult = {
  success: boolean;
  claimed?: OldPlayerClaimed[];
  error?: string;
};

export async function migrationApiReadOldPlayerClaimedMilestones(
  params: ReadOldPlayerClaimedMilestonesParams,
  options?: { corridorCapabilityObjectId?: string }
): Promise<ReadOldPlayerClaimedMilestonesResult> {
  const q = new URLSearchParams();
  q.set('oldPackageId', params.oldPackageId);
  q.set('oldRegistryId', params.oldRegistryId);
  if (params.playerAddress) q.set('playerAddress', params.playerAddress);
  const path = `api/migration/milestones/claimed?${q.toString()}`;
  return callMigrationApi<ReadOldPlayerClaimedMilestonesResult>(path, { method: 'GET', ...options });
}

// --- Tournaments migration ---

export type MigrateTournamentBody = {
  tournamentId: number;
  oldTournamentRegistryId?: string;
  oldTournamentAdminCapId?: string;
};

export type MigrateTournamentResult = {
  success: boolean;
  digest?: string;
  tournamentId?: number;
  message?: string;
  error?: string;
};

export async function migrationApiMigrateTournament(
  body: MigrateTournamentBody,
  options?: { corridorCapabilityObjectId?: string }
): Promise<MigrateTournamentResult> {
  return callMigrationApi<MigrateTournamentResult>('api/migration/tournaments', {
    method: 'POST',
    body: JSON.stringify(body),
    ...options,
  });
}

export type GetTournamentIdsParams = {
  oldTournamentRegistryId?: string;
  oldPackageId?: string;
};

export type GetTournamentIdsResult = {
  success: boolean;
  tournamentIds?: number[];
  count?: number;
  error?: string;
};

export async function migrationApiGetTournamentIds(
  params: GetTournamentIdsParams,
  options?: { corridorCapabilityObjectId?: string }
): Promise<GetTournamentIdsResult> {
  const q = new URLSearchParams();
  if (params.oldTournamentRegistryId) q.set('oldTournamentRegistryId', params.oldTournamentRegistryId);
  if (params.oldPackageId) q.set('oldPackageId', params.oldPackageId);
  const path = `api/migration/tournaments?${q.toString()}`;
  return callMigrationApi<GetTournamentIdsResult>(path, { method: 'GET', ...options });
}

export type ReadOldTournamentParams = {
  tournamentId: string | number;
  oldPackageId?: string;
  oldTournamentRegistryId?: string;
};

export type ReadOldTournamentResult = {
  success: boolean;
  tournament?: unknown;
  error?: string;
};

export async function migrationApiReadOldTournament(
  params: ReadOldTournamentParams,
  options?: { corridorCapabilityObjectId?: string }
): Promise<ReadOldTournamentResult> {
  const q = new URLSearchParams();
  q.set('action', 'read');
  q.set('tournamentId', String(params.tournamentId));
  if (params.oldPackageId) q.set('oldPackageId', params.oldPackageId);
  if (params.oldTournamentRegistryId) q.set('oldTournamentRegistryId', params.oldTournamentRegistryId);
  const path = `api/migration/tournaments?${q.toString()}`;
  return callMigrationApi<ReadOldTournamentResult>(path, { method: 'GET', ...options });
}

export type RestoreDataForMigratedTournamentParams = {
  oldTournamentId: number;
  newTournamentId?: number | null;
  oldPackageId?: string;
  oldTournamentRegistryId?: string;
};

export type RestoreDataForMigratedTournamentResult = {
  success: boolean;
  message?: string;
  digests?: string[];
  newTournamentId?: number;
  error?: string;
};

export async function migrationApiRestoreDataForMigratedTournament(
  params: RestoreDataForMigratedTournamentParams,
  options?: { corridorCapabilityObjectId?: string }
): Promise<RestoreDataForMigratedTournamentResult> {
  const q = new URLSearchParams();
  q.set('action', 'restore');
  q.set('oldTournamentId', String(params.oldTournamentId));
  if (params.newTournamentId != null) q.set('newTournamentId', String(params.newTournamentId));
  if (params.oldPackageId) q.set('sourcePackageId', params.oldPackageId);
  if (params.oldTournamentRegistryId) q.set('oldTournamentRegistryId', params.oldTournamentRegistryId);
  const path = `api/migration/tournaments?${q.toString()}`;
  return callMigrationApi<RestoreDataForMigratedTournamentResult>(path, { method: 'GET', ...options });
}
