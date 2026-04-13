// Tournament Migration API endpoint — migration is deprecated; requests are forwarded to the platform API.
import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import {
  MigrationApiUnavailableError,
  migrationApiMigrateTournament,
  migrationApiGetTournamentIds,
  migrationApiReadOldTournament,
  migrationApiRestoreDataForMigratedTournament,
} from '@/lib/services/migration/migration-api-client';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(
  async (request: NextRequest) => {
    PlatformLogger.info('Received POST request to /api/tournaments/migrate');
    
    const body = await getRequestBody<{ 
      tournamentId: number; 
      oldTournamentRegistryId?: string; 
      oldTournamentAdminCapId?: string;
    }>(request);
    PlatformLogger.debug('Request body', { body });
    
    const { tournamentId, oldTournamentRegistryId, oldTournamentAdminCapId } = body;

    // Validate required fields
    if (tournamentId === undefined || tournamentId === null) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        'tournamentId is required'
      );
    }

    if (typeof tournamentId !== 'number' || tournamentId < 0) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        'tournamentId must be a valid non-negative number'
      );
    }

    // Use old tournament registry IDs from request body, or fall back to environment variables
    // Check TESTNET versions first, then fall back to non-testnet versions
    const finalOldTournamentRegistryId = oldTournamentRegistryId || process.env.OLD_TOURNAMENT_REGISTRY_OBJECT_ID_TESTNET || process.env.OLD_TOURNAMENT_REGISTRY_OBJECT_ID;
    const finalOldTournamentAdminCapId = oldTournamentAdminCapId || process.env.OLD_TOURNAMENT_ADMIN_CAP_ID_TESTNET || process.env.OLD_TOURNAMENT_ADMIN_CAP_ID;

    if (!finalOldTournamentRegistryId) {
      throw new Error('oldTournamentRegistryId is required. Provide it in the request body or set OLD_TOURNAMENT_REGISTRY_OBJECT_ID_TESTNET (or OLD_TOURNAMENT_REGISTRY_OBJECT_ID) environment variable.');
    }

    const oldPackageId = process.env.OLD_GAME_SCORE_CONTRACT_TESTNET ||
                         process.env.OLD_GAME_SCORE_PACKAGE_ID ||
                         process.env.OLD_GAME_SCORE_CONTRACT || '';

    if (!oldPackageId) {
      throw new Error('Old package ID not configured. Set OLD_GAME_SCORE_CONTRACT_TESTNET or OLD_GAME_SCORE_PACKAGE_ID (migration will move to platform).');
    }

    PlatformLogger.info('Migrating tournament via platform API', {
      tournamentId,
      oldTournamentRegistryId: finalOldTournamentRegistryId,
      oldTournamentAdminCapId: finalOldTournamentAdminCapId,
      oldPackageId,
    });

    try {
      const result = await migrationApiMigrateTournament({
        tournamentId,
        oldTournamentRegistryId: finalOldTournamentRegistryId,
        oldTournamentAdminCapId: finalOldTournamentAdminCapId || undefined,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to migrate tournament');
      }

      PlatformLogger.info('Tournament migrated successfully', {
        tournamentId,
        digest: result.digest,
      });

      return {
        success: true,
        digest: result.digest,
        tournamentId,
        message: result.message || 'Tournament migrated successfully to new system',
      };
    } catch (err) {
      if (err instanceof MigrationApiUnavailableError) {
        throw new PlatformError(PlatformErrorCode.SERVICE_UNAVAILABLE, err.message);
      }
      throw err;
    }
  }
);

// GET endpoint to fetch all tournament IDs from old registry
export const GET = withApiHandler(
  async (request: NextRequest) => {
    PlatformLogger.info('Received GET request to /api/tournaments/migrate (list tournaments)');
    
    const { searchParams } = new URL(request.url);
    const oldTournamentRegistryId = searchParams.get('oldTournamentRegistryId');
    const action = searchParams.get('action'); // 'restore' to restore data for a tournament

    // Handle read action
    if (action === 'read') {
      const oldTournamentId = searchParams.get('tournamentId') || searchParams.get('oldTournamentId');

      if (!oldTournamentId) {
        throw new Error('tournamentId is required for read action');
      }

      const sourcePackageId = searchParams.get('oldPackageId') || searchParams.get('sourcePackageId'); // Optional: specify which package to read from
      
      // Use specified source package, or fall back to OLD package
      // For tournaments 12 and 13, use 2025-12-23 package where the data actually is
      const oldPackageId = sourcePackageId || 
                           process.env.OLD_GAME_SCORE_CONTRACT_TESTNET || 
                           process.env.OLD_GAME_SCORE_PACKAGE_ID || 
                           process.env.OLD_GAME_SCORE_CONTRACT || '';

      const finalOldTournamentRegistryId = oldTournamentRegistryId || 
                                           process.env.OLD_TOURNAMENT_REGISTRY_OBJECT_ID_TESTNET || 
                                           process.env.OLD_TOURNAMENT_REGISTRY_OBJECT_ID;

      if (!oldPackageId) {
        throw new Error('Old package ID is required for read action (or specify oldPackageId/sourcePackageId query param)');
      }

      PlatformLogger.info('Reading old tournament data via platform API', {
        oldTournamentId: Number(oldTournamentId),
        sourcePackageId: oldPackageId,
        hasRegistryId: !!finalOldTournamentRegistryId,
      });

      try {
        const result = await migrationApiReadOldTournament({
          tournamentId: Number(oldTournamentId),
          oldPackageId,
          oldTournamentRegistryId: finalOldTournamentRegistryId || undefined,
        });

        if (!result.success) {
          throw new Error(result.error || 'Failed to read old tournament data');
        }

        return {
          success: true,
          tournament: result.tournament,
        };
      } catch (err) {
        if (err instanceof MigrationApiUnavailableError) {
          throw new PlatformError(
            PlatformErrorCode.SERVICE_UNAVAILABLE,
            err.message,
            410
          );
        }
        throw err;
      }
    }

    // Handle restore action
    if (action === 'restore') {
      const oldTournamentId = searchParams.get('oldTournamentId');
      const newTournamentId = searchParams.get('newTournamentId');
      const sourcePackageId = searchParams.get('sourcePackageId'); // Optional: specify which package to read from

      if (!oldTournamentId) {
        throw new Error('oldTournamentId is required for restore action');
      }

      // Use specified source package, or fall back to OLD package
      // For tournaments 12 and 13, use 2025-12-23 package where the data actually is
      const oldPackageId = sourcePackageId || 
                           process.env.OLD_GAME_SCORE_CONTRACT_TESTNET || 
                           process.env.OLD_GAME_SCORE_PACKAGE_ID || 
                           process.env.OLD_GAME_SCORE_CONTRACT || '';

      const finalOldTournamentRegistryId = oldTournamentRegistryId || 
                                           process.env.OLD_TOURNAMENT_REGISTRY_OBJECT_ID_TESTNET || 
                                           process.env.OLD_TOURNAMENT_REGISTRY_OBJECT_ID;

      if (!oldPackageId) {
        throw new Error('Old package ID is required for restore action (or specify sourcePackageId)');
      }

      PlatformLogger.info('Restoring data for migrated tournament via platform API', {
        oldTournamentId: Number(oldTournamentId),
        newTournamentId: newTournamentId ? Number(newTournamentId) : null,
        sourcePackageId: oldPackageId,
      });

      try {
        const result = await migrationApiRestoreDataForMigratedTournament({
          oldTournamentId: Number(oldTournamentId),
          newTournamentId: newTournamentId ? Number(newTournamentId) : null,
          oldPackageId,
          oldTournamentRegistryId: finalOldTournamentRegistryId || undefined,
        });

        if (!result.success) {
          throw new Error(result.error || 'Failed to restore tournament data');
        }

        return {
          success: true,
          message: result.message || 'Tournament data restored successfully',
          digests: result.digests || [],
          newTournamentId: result.newTournamentId,
        };
      } catch (err) {
        if (err instanceof MigrationApiUnavailableError) {
          throw new PlatformError(
            PlatformErrorCode.SERVICE_UNAVAILABLE,
            err.message,
            410
          );
        }
        throw err;
      }
    }

    // Default: list tournaments
    // Use old tournament registry ID from query param or fall back to environment variable
    // Check TESTNET versions first, then fall back to non-testnet versions
    const finalOldTournamentRegistryId = oldTournamentRegistryId || process.env.OLD_TOURNAMENT_REGISTRY_OBJECT_ID_TESTNET || process.env.OLD_TOURNAMENT_REGISTRY_OBJECT_ID;

    if (!finalOldTournamentRegistryId) {
      throw new Error('oldTournamentRegistryId is required. Provide it as a query parameter or set OLD_TOURNAMENT_REGISTRY_OBJECT_ID_TESTNET (or OLD_TOURNAMENT_REGISTRY_OBJECT_ID) environment variable.');
    }

    const oldPackageId = process.env.OLD_GAME_SCORE_CONTRACT_TESTNET ||
                         process.env.OLD_GAME_SCORE_PACKAGE_ID ||
                         process.env.OLD_GAME_SCORE_CONTRACT || '';

    if (!oldPackageId) {
      throw new Error('Old package ID not configured. Set OLD_GAME_SCORE_CONTRACT_TESTNET or OLD_GAME_SCORE_PACKAGE_ID (migration will move to platform).');
    }

    PlatformLogger.info('Discovering tournaments via platform API', {
      oldTournamentRegistryId: finalOldTournamentRegistryId,
      oldPackageId,
    });

    try {
      const result = await migrationApiGetTournamentIds({
        oldTournamentRegistryId: finalOldTournamentRegistryId,
        oldPackageId,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to discover tournaments');
      }

      PlatformLogger.info('Found tournaments in old registry', {
        count: result.tournamentIds?.length || 0,
        oldTournamentRegistryId: finalOldTournamentRegistryId,
      });

      return {
        success: true,
        tournamentIds: result.tournamentIds || [],
        count: result.tournamentIds?.length || 0,
      };
    } catch (err) {
      if (err instanceof MigrationApiUnavailableError) {
        throw new PlatformError(PlatformErrorCode.SERVICE_UNAVAILABLE, err.message);
      }
      throw err;
    }
  }
);


