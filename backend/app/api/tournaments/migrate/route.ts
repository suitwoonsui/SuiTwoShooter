// Tournament Migration API endpoint
import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { adminWalletService } from '@/lib/sui/admin-wallet-service';
import { TournamentMigrationService } from '@/lib/sui/migration-service';
import { BadgeLogger } from '@/lib/sui/badge-logger';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { BadgeError, BadgeErrorCode } from '@/lib/sui/badge-errors';
import { getConfig } from '@/config/config';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(
  async (request: NextRequest) => {
    BadgeLogger.info('Received POST request to /api/tournaments/migrate');
    
    const body = await getRequestBody<{ 
      tournamentId: number; 
      oldTournamentRegistryId?: string; 
      oldTournamentAdminCapId?: string;
    }>(request);
    BadgeLogger.debug('Request body', { body });
    
    const { tournamentId, oldTournamentRegistryId, oldTournamentAdminCapId } = body;

    // Validate required fields
    if (tournamentId === undefined || tournamentId === null) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'tournamentId is required'
      );
    }

    if (typeof tournamentId !== 'number' || tournamentId < 0) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
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

    // Get old package ID from environment variable or use current package ID as fallback
    const config = getConfig();
    const oldPackageId = process.env.OLD_GAME_SCORE_CONTRACT_TESTNET || 
                         process.env.OLD_GAME_SCORE_PACKAGE_ID || 
                         process.env.OLD_GAME_SCORE_CONTRACT ||
                         (config.contracts.gameScore?.includes('::')
                           ? config.contracts.gameScore.split('::')[0]
                           : config.contracts.gameScore || '');

    if (!oldPackageId) {
      throw new Error('Old package ID not configured. Please set OLD_GAME_SCORE_CONTRACT_TESTNET (or OLD_GAME_SCORE_PACKAGE_ID) environment variable.');
    }

    BadgeLogger.info('Migrating tournament', {
      tournamentId,
      oldTournamentRegistryId: finalOldTournamentRegistryId,
      oldTournamentAdminCapId: finalOldTournamentAdminCapId,
      oldPackageId,
      registryIdSource: oldTournamentRegistryId ? 'request' : 'environment',
      adminCapSource: oldTournamentAdminCapId ? 'request' : 'environment',
    });

    // Create migration service and migrate
    const migrationService = new TournamentMigrationService(adminWalletService);
    const result = await migrationService.migrateTournament(
      tournamentId,
      oldPackageId,
      finalOldTournamentRegistryId,
      finalOldTournamentAdminCapId || ''
    );

    if (!result.success) {
      throw new Error(result.error || 'Failed to migrate tournament');
    }

    BadgeLogger.info('Tournament migrated successfully', {
      tournamentId,
      digest: result.digest,
    });

    return {
      success: true,
      digest: result.digest,
      tournamentId,
      message: 'Tournament migrated successfully to new system',
    };
  }
);

// GET endpoint to fetch all tournament IDs from old registry
export const GET = withApiHandler(
  async (request: NextRequest) => {
    BadgeLogger.info('Received GET request to /api/tournaments/migrate (list tournaments)');
    
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

      BadgeLogger.info('Reading old tournament data', {
        oldTournamentId: Number(oldTournamentId),
        sourcePackageId: oldPackageId,
        hasRegistryId: !!finalOldTournamentRegistryId,
      });

      const migrationService = new TournamentMigrationService(adminWalletService);
      const result = await migrationService.readOldTournament(
        oldPackageId,
        finalOldTournamentRegistryId || '', // Allow empty - will reconstruct from events
        Number(oldTournamentId)
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to read old tournament data');
      }

      return {
        success: true,
        tournament: result.tournament,
      };
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

      BadgeLogger.info('Restoring data for migrated tournament', {
        oldTournamentId: Number(oldTournamentId),
        newTournamentId: newTournamentId ? Number(newTournamentId) : null,
        sourcePackageId: oldPackageId,
        sourceRegistryId: finalOldTournamentRegistryId || 'N/A (will use events only)',
      });

      const migrationService = new TournamentMigrationService(adminWalletService);
      const result = await migrationService.restoreDataForMigratedTournament(
        Number(oldTournamentId),
        newTournamentId ? Number(newTournamentId) : null,
        oldPackageId,
        finalOldTournamentRegistryId || '' // Allow empty registry - will reconstruct from events
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to restore tournament data');
      }

      return {
        success: true,
        message: 'Tournament data restored successfully',
        digests: result.digests || [],
        newTournamentId: result.newTournamentId,
      };
    }

    // Default: list tournaments
    // Use old tournament registry ID from query param or fall back to environment variable
    // Check TESTNET versions first, then fall back to non-testnet versions
    const finalOldTournamentRegistryId = oldTournamentRegistryId || process.env.OLD_TOURNAMENT_REGISTRY_OBJECT_ID_TESTNET || process.env.OLD_TOURNAMENT_REGISTRY_OBJECT_ID;

    if (!finalOldTournamentRegistryId) {
      throw new Error('oldTournamentRegistryId is required. Provide it as a query parameter or set OLD_TOURNAMENT_REGISTRY_OBJECT_ID_TESTNET (or OLD_TOURNAMENT_REGISTRY_OBJECT_ID) environment variable.');
    }

    // Get old package ID from environment variable or use current package ID as fallback
    const config = getConfig();
    const oldPackageId = process.env.OLD_GAME_SCORE_CONTRACT_TESTNET || 
                         process.env.OLD_GAME_SCORE_PACKAGE_ID || 
                         process.env.OLD_GAME_SCORE_CONTRACT ||
                         (config.contracts.gameScore?.includes('::')
                           ? config.contracts.gameScore.split('::')[0]
                           : config.contracts.gameScore || '');

    if (!oldPackageId) {
      throw new Error('Old package ID not configured. Please set OLD_GAME_SCORE_CONTRACT_TESTNET (or OLD_GAME_SCORE_PACKAGE_ID) environment variable.');
    }

    BadgeLogger.info('Discovering tournaments', {
      oldTournamentRegistryId: finalOldTournamentRegistryId,
      oldPackageId,
      source: oldTournamentRegistryId ? 'query' : 'environment',
    });

    // Create migration service and get tournament IDs
    const migrationService = new TournamentMigrationService(adminWalletService);
    const result = await migrationService.getAllTournamentIds(oldPackageId, finalOldTournamentRegistryId);

    if (!result.success) {
      throw new Error(result.error || 'Failed to discover tournaments');
    }

    BadgeLogger.info('Found tournaments in old registry', {
      count: result.tournamentIds?.length || 0,
      oldTournamentRegistryId: finalOldTournamentRegistryId,
    });

    return {
      success: true,
      tournamentIds: result.tournamentIds || [],
      count: result.tournamentIds?.length || 0,
    };
  }
);

