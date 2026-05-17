// Score Migration API endpoint — migration is deprecated; requests are forwarded to the platform API.
import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { PlatformValidators } from '@/lib/services/platform/validators/platform-validators';
import {
  MigrationApiUnavailableError,
  migrationApiMigratePlayerStats,
  migrationApiGetWalletsWithStats,
  migrationApiClearStats,
} from '@/lib/services/migration/migration-api-client';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(
  async (request: NextRequest) => {
    PlatformLogger.info('Received POST request to /api/scores/migrate');
    
    const body = await getRequestBody<{ 
      playerAddress: string; 
      oldPackageId?: string; 
      oldStatsRegistryId?: string;
    }>(request);
    PlatformLogger.debug('Request body', { body });
    
    const { playerAddress, oldPackageId, oldStatsRegistryId } = body;

    // Validate required fields
    if (!playerAddress) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        'playerAddress is required'
      );
    }

    PlatformValidators.validateAddress(playerAddress);

    // Use old stats registry IDs from request body, or fall back to environment variables
    // Check TESTNET versions first, then fall back to non-testnet versions
    const finalOldPackageId = oldPackageId || process.env.OLD_GAME_SCORE_CONTRACT_TESTNET || process.env.OLD_GAME_SCORE_PACKAGE_ID || process.env.OLD_GAME_SCORE_CONTRACT;
    const finalOldStatsRegistryId = oldStatsRegistryId || process.env.OLD_STATISTICS_REGISTRY_OBJECT_ID_TESTNET || process.env.OLD_STATISTICS_REGISTRY_OBJECT_ID;

    if (!finalOldPackageId) {
      throw new Error('oldPackageId is required. Provide it in the request body or set OLD_GAME_SCORE_CONTRACT_TESTNET (or OLD_GAME_SCORE_PACKAGE_ID) environment variable.');
    }

    if (!finalOldStatsRegistryId) {
      throw new Error('oldStatsRegistryId is required. Provide it in the request body or set OLD_STATISTICS_REGISTRY_OBJECT_ID_TESTNET (or OLD_STATISTICS_REGISTRY_OBJECT_ID) environment variable.');
    }

    PlatformLogger.info('Migrating stats via platform API', {
      playerAddress,
      oldPackageId: finalOldPackageId,
      oldStatsRegistryId: finalOldStatsRegistryId,
    });

    try {
      const result = await migrationApiMigratePlayerStats({
        playerAddress,
        oldPackageId: finalOldPackageId,
        oldStatsRegistryId: finalOldStatsRegistryId,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to migrate stats');
      }

      PlatformLogger.info('Stats migrated successfully', {
        playerAddress,
        digest: result.digest,
      });

      return {
        success: true,
        digest: result.digest,
        playerAddress,
        message: result.message || 'Player statistics migrated successfully to new registry',
      };
    } catch (err) {
      if (err instanceof MigrationApiUnavailableError) {
        throw new PlatformError(PlatformErrorCode.SERVICE_UNAVAILABLE, err.message);
      }
      throw err;
    }
  }
);

// GET endpoint to fetch all wallets with statistics
export const GET = withApiHandler(
  async (request: NextRequest) => {
    PlatformLogger.info('Received GET request to /api/scores/migrate (list wallets)');
    
    const { searchParams } = new URL(request.url);
    const oldStatsRegistryId = searchParams.get('oldStatsRegistryId');
    const oldPackageId = searchParams.get('oldPackageId');

    // Use old stats registry ID from query param or fall back to environment variable
    // Check TESTNET versions first, then fall back to non-testnet versions
    const finalOldStatsRegistryId = oldStatsRegistryId || process.env.OLD_STATISTICS_REGISTRY_OBJECT_ID_TESTNET || process.env.OLD_STATISTICS_REGISTRY_OBJECT_ID;
    const finalOldPackageId = oldPackageId || process.env.OLD_GAME_SCORE_CONTRACT_TESTNET || process.env.OLD_GAME_SCORE_PACKAGE_ID || process.env.OLD_GAME_SCORE_CONTRACT;

    if (!finalOldStatsRegistryId) {
      throw new Error('oldStatsRegistryId is required. Provide it as a query parameter or set OLD_STATISTICS_REGISTRY_OBJECT_ID_TESTNET (or OLD_STATISTICS_REGISTRY_OBJECT_ID) environment variable.');
    }

    if (!finalOldPackageId) {
      throw new Error('oldPackageId is required. Provide it as a query parameter or set OLD_GAME_SCORE_CONTRACT_TESTNET (or OLD_GAME_SCORE_PACKAGE_ID) environment variable.');
    }

    PlatformLogger.info('Fetching wallets with stats via platform API', {
      oldStatsRegistryId: finalOldStatsRegistryId,
      oldPackageId: finalOldPackageId,
    });

    try {
      const result = await migrationApiGetWalletsWithStats({
        oldStatsRegistryId: finalOldStatsRegistryId,
        oldPackageId: finalOldPackageId,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch wallets with stats');
      }

      PlatformLogger.info('Found wallets with stats', {
        count: result.wallets?.length || 0,
        oldStatsRegistryId: finalOldStatsRegistryId,
      });

      return {
        success: true,
        wallets: result.wallets || [],
        count: result.wallets?.length || 0,
      };
    } catch (err) {
      if (err instanceof MigrationApiUnavailableError) {
        throw new PlatformError(PlatformErrorCode.SERVICE_UNAVAILABLE, err.message);
      }
      throw err;
    }
  }
);

// DELETE endpoint to clear player stats
export const DELETE = withApiHandler(
  async (request: NextRequest) => {
    PlatformLogger.info('Received DELETE request to /api/scores/migrate (clear stats)');

    const { searchParams } = new URL(request.url);
    const playerAddress = searchParams.get('playerAddress');
    const clearAll = searchParams.get('clearAll') === 'true';

    try {
      if (clearAll) {
        PlatformLogger.info('Clearing all player stats via platform API');
        const result = await migrationApiClearStats({ clearAll: true });

        if (!result.success) {
          throw new Error(result.error || 'Failed to clear all player stats');
        }

        PlatformLogger.info('All stats cleared successfully', {
          playersCleared: result.playersCleared,
          errors: result.errors?.length || 0,
        });

        return {
          success: true,
          message: result.message || `Cleared stats for ${result.playersCleared ?? 0} player(s)`,
          playersCleared: result.playersCleared,
          digests: result.digests,
          errors: result.errors,
        };
      }

      if (!playerAddress) {
        throw new Error('playerAddress is required as a query parameter (or use clearAll=true)');
      }

      PlatformValidators.validateAddress(playerAddress);

      PlatformLogger.info('Clearing stats via platform API', { playerAddress });

      const result = await migrationApiClearStats({ playerAddress });

      if (!result.success) {
        throw new Error(result.error || 'Failed to clear player stats');
      }

      PlatformLogger.info('Stats cleared successfully', {
        playerAddress,
        digest: result.digest,
      });

      return {
        success: true,
        message: 'Player stats cleared successfully',
        digest: result.digest,
        playerAddress,
      };
    } catch (err) {
      if (err instanceof MigrationApiUnavailableError) {
        throw new PlatformError(PlatformErrorCode.SERVICE_UNAVAILABLE, err.message);
      }
      throw err;
    }
  }
);


