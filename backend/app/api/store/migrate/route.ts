// Migration API endpoint
import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { adminWalletService } from '@/lib/sui/admin-wallet-service';
import { MigrationService } from '@/lib/sui/migration-service';
import { getConfig } from '@/config/config';
import { BadgeLogger } from '@/lib/sui/badge-logger';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { BadgeError, BadgeErrorCode } from '@/lib/sui/badge-errors';
import { BadgeValidators } from '@/lib/sui/badge-validators';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(
  async (request: NextRequest) => {
    BadgeLogger.info('Received POST request to /api/store/migrate');
    
    const body = await getRequestBody<{ 
      playerAddress: string; 
      oldPackageId?: string; 
      oldStoreObjectId?: string;
    }>(request);
    BadgeLogger.debug('Request body', { body });
    
    const { playerAddress, oldPackageId, oldStoreObjectId } = body;
    const config = getConfig();

    // Validate required fields
    if (!playerAddress) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'playerAddress is required'
      );
    }

    BadgeValidators.validateAddress(playerAddress);

    // Use old store IDs from request body, or fall back to environment variables
    const finalOldPackageId = oldPackageId || config.contracts.oldPremiumStorePackageId;
    const finalOldStoreObjectId = oldStoreObjectId || config.contracts.oldPremiumStoreObjectId;

    if (!finalOldPackageId) {
      throw new Error('oldPackageId is required. Provide it in the request body or set OLD_PREMIUM_STORE_PACKAGE_ID environment variable.');
    }

    if (!finalOldStoreObjectId) {
      throw new Error('oldStoreObjectId is required. Provide it in the request body or set OLD_PREMIUM_STORE_OBJECT_ID environment variable.');
    }

    BadgeLogger.info('Migrating inventory', {
      playerAddress,
      oldPackageId: finalOldPackageId,
      oldStoreObjectId: finalOldStoreObjectId,
      packageIdSource: oldPackageId ? 'request' : 'environment',
      storeObjectIdSource: oldStoreObjectId ? 'request' : 'environment',
    });

    // Create migration service and migrate
    const migrationService = new MigrationService(adminWalletService);
    const result = await migrationService.migratePlayerInventory(
      playerAddress,
      finalOldPackageId,
      finalOldStoreObjectId
    );

    if (!result.success) {
      throw new Error(result.error || 'Failed to migrate inventory');
    }

    BadgeLogger.info('Inventory migrated successfully', {
      playerAddress,
      digest: result.digest,
    });

    return {
      success: true,
      digest: result.digest,
      playerAddress,
      message: 'Inventory migrated successfully to new store',
    };
  }
);

// GET endpoint to fetch all wallets with inventory
export const GET = withApiHandler(
  async (request: NextRequest) => {
    BadgeLogger.info('Received GET request to /api/store/migrate (list wallets)');
    
    const { searchParams } = new URL(request.url);
    const oldStoreObjectId = searchParams.get('oldStoreObjectId');
    const config = getConfig();

    // Use old store ID from query param or fall back to environment variable
    const finalOldStoreObjectId = oldStoreObjectId || config.contracts.oldPremiumStoreObjectId;

    if (!finalOldStoreObjectId) {
      throw new Error('oldStoreObjectId is required. Provide it as a query parameter or set OLD_PREMIUM_STORE_OBJECT_ID environment variable.');
    }

    BadgeLogger.info('Fetching wallets with inventory from old store', {
      oldStoreObjectId: finalOldStoreObjectId,
    });

    // Create migration service and get wallets
    const migrationService = new MigrationService(adminWalletService);
    const result = await migrationService.getAllWalletsWithInventory(finalOldStoreObjectId);

    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch wallets with inventory');
    }

    BadgeLogger.info('Found wallets with inventory', {
      count: result.wallets?.length || 0,
      oldStoreObjectId: finalOldStoreObjectId,
    });

    return {
      success: true,
      wallets: result.wallets || [],
      count: result.wallets?.length || 0,
    };
  }
);

