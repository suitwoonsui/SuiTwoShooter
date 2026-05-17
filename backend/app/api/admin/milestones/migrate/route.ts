// ==========================================
// Admin Milestone Migration API Route
// ==========================================
// POST: Migrate milestone data from old contract to new contract (via platform API).
// GET: List wallets with milestone claims (via platform API).
// Migration is deprecated in-game; requests are forwarded to the platform API.

import { NextRequest, NextResponse } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { getConfig } from '@/config/config';
import {
  MigrationApiUnavailableError,
  migrationApiGetMilestoneWallets,
  migrationApiMigrateMilestones,
} from '@/lib/services/migration/migration-api-client';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

// GET: Discover wallets with milestone claims from old contract
export const GET = withApiHandler(
  async (request: NextRequest) => {
    PlatformLogger.info('Received GET request to /api/admin/milestones/migrate (list wallets)');
    
    const { searchParams } = new URL(request.url);
    const oldPackageId = searchParams.get('oldPackageId');
    const oldRegistryId = searchParams.get('oldRegistryId');

    const config = getConfig();
    
    // Use old contract addresses from query params or fall back to config
    const finalOldPackageId = oldPackageId || config.contracts.oldAchievementPackageId;
    const finalOldRegistryId = oldRegistryId || config.contracts.oldAchievementRegistryId;

    if (!finalOldPackageId || !finalOldRegistryId) {
      throw new PlatformError(
        PlatformErrorCode.CONFIG_MISSING,
        'Old contract addresses not provided. Provide oldPackageId and oldRegistryId as query parameters, or set OLD_ACHIEVEMENT_PACKAGE_ID and OLD_ACHIEVEMENT_REGISTRY_OBJECT_ID in environment variables.'
      );
    }

    PlatformLogger.info('Fetching wallets with milestone claims via platform API', {
      oldPackageId: finalOldPackageId,
      oldRegistryId: finalOldRegistryId,
    });

    try {
      const result = await migrationApiGetMilestoneWallets({
        oldPackageId: finalOldPackageId,
        oldRegistryId: finalOldRegistryId,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch wallets with milestone claims');
      }

      const uniqueWallets = result.wallets || [];

      PlatformLogger.info('Found wallets with milestone claims', {
        count: uniqueWallets.length,
        oldPackageId: finalOldPackageId,
        oldRegistryId: finalOldRegistryId,
      });

      return NextResponse.json({
        success: true,
        wallets: uniqueWallets,
        count: uniqueWallets.length,
      });
    } catch (err) {
      if (err instanceof MigrationApiUnavailableError) {
        throw new PlatformError(PlatformErrorCode.SERVICE_UNAVAILABLE, err.message);
      }
      throw err;
    }
  }
);

// POST: Migrate milestones from old contract to new contract
export const POST = withApiHandler(
  async (request: NextRequest) => {
    const body = await getRequestBody<{
      adminWalletAddress: string;
      oldPackageId?: string; // Optional - uses config if not provided
      oldRegistryId?: string; // Optional - uses config if not provided
      oldAdminCapId?: string; // Optional - uses config if not provided
      migrateDefinitions?: boolean; // Default: true
      migratePlayerClaims?: boolean; // Default: true
      playerAddress?: string; // Optional - if provided, only migrate claims for this player
      force?: boolean; // Force migration even if milestones exist
    }>(request);

    const {
      adminWalletAddress,
      oldPackageId,
      oldRegistryId,
      oldAdminCapId,
      migrateDefinitions = true,
      migratePlayerClaims = true,
      playerAddress,
      force = false,
    } = body;

    // Verify admin wallet address
    const expectedAdminAddress = getAdminWalletService().getAddress().toLowerCase();
    const providedAdminAddress = adminWalletAddress?.toLowerCase();

    if (!providedAdminAddress || providedAdminAddress !== expectedAdminAddress) {
      throw new PlatformError(
        PlatformErrorCode.UNAUTHORIZED,
        'Unauthorized. Admin wallet verification failed.'
      );
    }

    const config = getConfig();
    
    // Get old contract addresses (from request or config)
    const finalOldPackageId = oldPackageId || config.contracts.oldAchievementPackageId;
    const finalOldRegistryId = oldRegistryId || config.contracts.oldAchievementRegistryId;
    const finalOldAdminCapId = oldAdminCapId || config.contracts.oldAchievementAdminCapId;

    if (!finalOldPackageId || !finalOldRegistryId) {
      throw new PlatformError(
        PlatformErrorCode.CONFIG_MISSING,
        'Old contract addresses not provided. Please provide oldPackageId and oldRegistryId in request, or set OLD_ACHIEVEMENT_PACKAGE_ID and OLD_ACHIEVEMENT_REGISTRY_OBJECT_ID in environment variables.'
      );
    }

    try {
      const result = await migrationApiMigrateMilestones({
        adminWalletAddress: body.adminWalletAddress,
        oldPackageId: finalOldPackageId,
        oldRegistryId: finalOldRegistryId,
        oldAdminCapId: finalOldAdminCapId,
        migrateDefinitions,
        migratePlayerClaims,
        playerAddress,
        force,
      });

      const overallSuccess = result.success;

      return NextResponse.json({
        success: overallSuccess,
        message: result.message ?? (overallSuccess
          ? 'Migration completed successfully'
          : 'Migration completed with errors'),
        results: result.results,
      });
    } catch (err) {
      if (err instanceof MigrationApiUnavailableError) {
        throw new PlatformError(PlatformErrorCode.SERVICE_UNAVAILABLE, err.message);
      }
      throw err;
    }
  }
);
