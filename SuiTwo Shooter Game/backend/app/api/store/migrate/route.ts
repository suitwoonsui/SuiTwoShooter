// Migration API endpoint
// Migration is deprecated; requests are forwarded to the platform migration API.
import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { getConfig } from '@/config/config';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { PlatformValidators } from '@/lib/services/platform/validators/platform-validators';
import {
  MigrationApiUnavailableError,
  migrationApiMigratePlayerInventory,
  migrationApiGetWalletsWithInventory,
} from '@/lib/services/migration/migration-api-client';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(
  async (request: NextRequest) => {
    PlatformLogger.info('Received POST request to /api/store/migrate');

    const body = await getRequestBody<{
      playerAddress: string;
      oldPackageId?: string;
      oldStoreObjectId?: string;
    }>(request);
    PlatformLogger.debug('Request body', { body });

    const { playerAddress, oldPackageId, oldStoreObjectId } = body;
    const config = getConfig();

    if (!playerAddress) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        'playerAddress is required'
      );
    }

    PlatformValidators.validateAddress(playerAddress);

    const finalOldPackageId = oldPackageId || config.contracts.oldPremiumStorePackageId;
    const finalOldStoreObjectId = oldStoreObjectId || config.contracts.oldPremiumStoreObjectId;

    if (!finalOldPackageId) {
      throw new Error(
        'oldPackageId is required. Provide it in the request body or set OLD_PREMIUM_STORE_PACKAGE_ID environment variable.'
      );
    }

    if (!finalOldStoreObjectId) {
      throw new Error(
        'oldStoreObjectId is required. Provide it in the request body or set OLD_PREMIUM_STORE_OBJECT_ID environment variable.'
      );
    }

    PlatformLogger.info('Migrating inventory via platform API', {
      playerAddress,
      oldPackageId: finalOldPackageId,
      oldStoreObjectId: finalOldStoreObjectId,
    });

    try {
      const result = await migrationApiMigratePlayerInventory({
        playerAddress,
        oldPackageId: finalOldPackageId,
        oldStoreObjectId: finalOldStoreObjectId,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to migrate inventory');
      }

      PlatformLogger.info('Inventory migrated successfully', {
        playerAddress,
        digest: result.digest,
      });

      return {
        success: true,
        digest: result.digest,
        playerAddress,
        message: result.message || 'Inventory migrated successfully to new store',
      };
    } catch (err) {
      if (err instanceof MigrationApiUnavailableError) {
        throw new PlatformError(PlatformErrorCode.SERVICE_UNAVAILABLE, err.message);
      }
      throw err;
    }
  }
);

// GET endpoint to fetch all wallets with inventory
export const GET = withApiHandler(
  async (request: NextRequest) => {
    PlatformLogger.info('Received GET request to /api/store/migrate (list wallets)');

    const { searchParams } = new URL(request.url);
    const oldStoreObjectId = searchParams.get('oldStoreObjectId');
    const config = getConfig();

    const finalOldStoreObjectId = oldStoreObjectId || config.contracts.oldPremiumStoreObjectId;

    if (!finalOldStoreObjectId) {
      throw new Error(
        'oldStoreObjectId is required. Provide it as a query parameter or set OLD_PREMIUM_STORE_OBJECT_ID environment variable.'
      );
    }

    PlatformLogger.info('Fetching wallets with inventory via platform API', {
      oldStoreObjectId: finalOldStoreObjectId,
    });

    try {
      const result = await migrationApiGetWalletsWithInventory({
        oldStoreObjectId: finalOldStoreObjectId,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch wallets with inventory');
      }

      PlatformLogger.info('Found wallets with inventory', {
        count: result.wallets?.length || 0,
        oldStoreObjectId: finalOldStoreObjectId,
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
