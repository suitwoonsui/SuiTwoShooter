// Score Migration API endpoint
import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '../../../../../../../base/backend/lib/cors';
import { adminWalletService } from '../../../../../../../backend/lib/sui/admin-wallet-service';
import { MigrationService } from '../../../../../../../backend/lib/sui/migration-service';
import { getConfig } from '../../../../../../../base/backend/config/config';
import { BadgeLogger } from '../../../../../../../base/backend/lib/sui/badge-logger';
import { withApiHandler, getRequestBody } from '../../../../../../../base/backend/lib/api/api-handler';
import { BadgeError, BadgeErrorCode } from '../../../../../../../base/backend/lib/sui/badge-errors';
import { BadgeValidators } from '../../../../../../../backend/lib/sui/badge-validators';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(
  async (request: NextRequest) => {
    BadgeLogger.info('Received POST request to /api/scores/migrate');
    
    const body = await getRequestBody<{ 
      playerAddress: string; 
      oldPackageId?: string; 
      oldStatsRegistryId?: string;
    }>(request);
    BadgeLogger.debug('Request body', { body });
    
    const { playerAddress, oldPackageId, oldStatsRegistryId } = body;

    // Validate required fields
    if (!playerAddress) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'playerAddress is required'
      );
    }

    BadgeValidators.validateAddress(playerAddress);

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

    BadgeLogger.info('Migrating stats', {
      playerAddress,
      oldPackageId: finalOldPackageId,
      oldStatsRegistryId: finalOldStatsRegistryId,
      packageIdSource: oldPackageId ? 'request' : 'environment',
      statsRegistrySource: oldStatsRegistryId ? 'request' : 'environment',
    });

    // Create migration service and migrate
    const migrationService = new MigrationService(adminWalletService);
    const result = await migrationService.migratePlayerStats(
      playerAddress,
      finalOldPackageId,
      finalOldStatsRegistryId
    );

    if (!result.success) {
      throw new Error(result.error || 'Failed to migrate stats');
    }

    BadgeLogger.info('Stats migrated successfully', {
      playerAddress,
      digest: result.digest,
    });

    return {
      success: true,
      digest: result.digest,
      playerAddress,
      message: 'Player statistics migrated successfully to new registry',
    };
  }
);

// GET endpoint to fetch all wallets with statistics
export const GET = withApiHandler(
  async (request: NextRequest) => {
    BadgeLogger.info('Received GET request to /api/scores/migrate (list wallets)');
    
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

    BadgeLogger.info('Fetching wallets with stats from old registry', {
      oldStatsRegistryId: finalOldStatsRegistryId,
      oldPackageId: finalOldPackageId,
    });

    // Create migration service and get wallets
    const migrationService = new MigrationService(adminWalletService);
    const result = await migrationService.getAllWalletsWithStats(finalOldPackageId, finalOldStatsRegistryId);

    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch wallets with stats');
    }

    BadgeLogger.info('Found wallets with stats', {
      count: result.wallets?.length || 0,
      oldStatsRegistryId: finalOldStatsRegistryId,
    });

    return {
      success: true,
      wallets: result.wallets || [],
      count: result.wallets?.length || 0,
    };
  }
);

// DELETE endpoint to clear player stats
export const DELETE = withApiHandler(
  async (request: NextRequest) => {
    BadgeLogger.info('Received DELETE request to /api/scores/migrate (clear stats)');
    
    const { searchParams } = new URL(request.url);
    const playerAddress = searchParams.get('playerAddress');
    const clearAll = searchParams.get('clearAll') === 'true';

    // Create migration service
    const migrationService = new MigrationService(adminWalletService);

    if (clearAll) {
      // Clear all players' stats
      BadgeLogger.info('Clearing all player stats');

      const result = await migrationService.clearAllPlayerStats();

      if (!result.success) {
        throw new Error(result.error || 'Failed to clear all player stats');
      }

      BadgeLogger.info('All stats cleared successfully', {
        playersCleared: result.playersCleared,
        errors: result.errors?.length || 0,
      });

      return {
        success: true,
        message: `Cleared stats for ${result.playersCleared} player(s)`,
        playersCleared: result.playersCleared,
        digests: result.digests,
        errors: result.errors,
      };
    } else {
      // Clear single player's stats
      if (!playerAddress) {
        throw new Error('playerAddress is required as a query parameter (or use clearAll=true)');
      }

      BadgeValidators.validateAddress(playerAddress);

      BadgeLogger.info('Clearing stats', {
        playerAddress,
      });

      const result = await migrationService.clearPlayerStats(playerAddress);

      if (!result.success) {
        throw new Error(result.error || 'Failed to clear player stats');
      }

      BadgeLogger.info('Stats cleared successfully', {
        playerAddress,
        digest: result.digest,
      });

      return {
        success: true,
        message: 'Player stats cleared successfully',
        digest: result.digest,
        playerAddress,
      };
    }
  }
);

