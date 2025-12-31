// ==========================================
// Admin Milestone Migration API Route
// ==========================================
// POST: Migrate milestone data from old contract to new contract
// Migrates: milestone definitions + player claimed milestones

import { NextRequest, NextResponse } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { getAdminWalletService } from '@/lib/sui/admin-wallet-service';
import { BadgeError, BadgeErrorCode } from '@/lib/sui/badge-errors';
import { BadgeLogger } from '@/lib/sui/badge-logger';
import { getConfig } from '@/config/config';
import { MilestoneMigrationService } from '@/lib/sui/migration-service/milestone-migration';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

// GET: Discover wallets with milestone claims from old contract
export const GET = withApiHandler(
  async (request: NextRequest) => {
    BadgeLogger.info('Received GET request to /api/admin/milestones/migrate (list wallets)');
    
    const { searchParams } = new URL(request.url);
    const oldPackageId = searchParams.get('oldPackageId');
    const oldRegistryId = searchParams.get('oldRegistryId');

    const config = getConfig();
    
    // Use old contract addresses from query params or fall back to config
    const finalOldPackageId = oldPackageId || config.contracts.oldAchievementPackageId;
    const finalOldRegistryId = oldRegistryId || config.contracts.oldAchievementRegistryId;

    if (!finalOldPackageId || !finalOldRegistryId) {
      throw new BadgeError(
        BadgeErrorCode.CONFIG_MISSING,
        'Old contract addresses not provided. Provide oldPackageId and oldRegistryId as query parameters, or set OLD_ACHIEVEMENT_PACKAGE_ID and OLD_ACHIEVEMENT_REGISTRY_OBJECT_ID in environment variables.'
      );
    }

    BadgeLogger.info('Fetching wallets with milestone claims from old system', {
      oldPackageId: finalOldPackageId,
      oldRegistryId: finalOldRegistryId,
    });

    // Create migration service and get wallets
    const adminWallet = getAdminWalletService();
    const migrationService = new MilestoneMigrationService(adminWallet);
    const result = await migrationService.readOldPlayerClaimedMilestones(
      finalOldPackageId,
      finalOldRegistryId
    );

    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch wallets with milestone claims');
    }

    // Extract unique wallet addresses from the claimed milestones
    const wallets = result.claimed?.map(claim => claim.player) || [];
    const uniqueWallets = Array.from(new Set(wallets));

    BadgeLogger.info('Found wallets with milestone claims', {
      count: uniqueWallets.length,
      oldPackageId: finalOldPackageId,
      oldRegistryId: finalOldRegistryId,
    });

    return NextResponse.json({
      success: true,
      wallets: uniqueWallets,
      count: uniqueWallets.length,
    });
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
    const adminWallet = getAdminWalletService();
    const expectedAdminAddress = adminWallet.getAddress().toLowerCase();
    const providedAdminAddress = adminWalletAddress?.toLowerCase();

    if (!providedAdminAddress || providedAdminAddress !== expectedAdminAddress) {
      throw new BadgeError(
        BadgeErrorCode.UNAUTHORIZED,
        'Unauthorized. Admin wallet verification failed.'
      );
    }

    const config = getConfig();
    
    // Get old contract addresses (from request or config)
    const finalOldPackageId = oldPackageId || config.contracts.oldAchievementPackageId;
    const finalOldRegistryId = oldRegistryId || config.contracts.oldAchievementRegistryId;
    const finalOldAdminCapId = oldAdminCapId || config.contracts.oldAchievementAdminCapId;

    if (!finalOldPackageId || !finalOldRegistryId) {
      throw new BadgeError(
        BadgeErrorCode.CONFIG_MISSING,
        'Old contract addresses not provided. Please provide oldPackageId and oldRegistryId in request, or set OLD_ACHIEVEMENT_PACKAGE_ID and OLD_ACHIEVEMENT_REGISTRY_OBJECT_ID in environment variables.'
      );
    }

    // Get new contract addresses
    const newPackageId = config.contracts.gameScore?.split('::')[0] || config.contracts.gameScore;
    const newRegistryId = config.contracts.achievementRegistry;
    const newAdminCapId = config.contracts.achievementAdminCap;

    if (!newPackageId || !newRegistryId || !newAdminCapId) {
      throw new BadgeError(
        BadgeErrorCode.CONFIG_MISSING,
        'New contract addresses not configured. Please check environment variables.'
      );
    }

    const migrationService = new MilestoneMigrationService(adminWallet);

    const results: {
      definitions?: {
        success: boolean;
        migrated?: number;
        skipped?: number;
        errors?: Array<{ category: number; level: number; error: string }>;
        error?: string;
      };
      playerClaims?: {
        success: boolean;
        migrated?: number;
        errors?: Array<{ player: string; category: number; level: number; error: string }>;
        error?: string;
      };
    } = {};

    // Migrate milestone definitions
    if (migrateDefinitions) {
      BadgeLogger.info('Starting milestone definitions migration', {
        oldPackageId: finalOldPackageId,
        oldRegistryId: finalOldRegistryId,
        newPackageId,
        newRegistryId,
        force,
      });

      const defResult = await migrationService.migrateMilestoneDefinitions(
        finalOldPackageId,
        finalOldRegistryId,
        newPackageId,
        newRegistryId,
        newAdminCapId,
        force
      );

      results.definitions = defResult;

      BadgeLogger.info('Milestone definitions migration completed', {
        success: defResult.success,
        migrated: defResult.migrated,
        skipped: defResult.skipped,
        errors: defResult.errors?.length || 0,
      });
    }

    // Migrate player claimed milestones
    if (migratePlayerClaims) {
      BadgeLogger.info('Starting player claimed milestones migration', {
        oldPackageId: finalOldPackageId,
        oldRegistryId: finalOldRegistryId,
        newPackageId,
        newRegistryId,
        playerAddress: playerAddress || 'all players',
      });

      const claimsResult = await migrationService.migratePlayerClaimedMilestones(
        finalOldPackageId,
        finalOldRegistryId,
        newPackageId,
        newRegistryId,
        newAdminCapId,
        playerAddress
      );

      results.playerClaims = claimsResult;

      BadgeLogger.info('Player claimed milestones migration completed', {
        success: claimsResult.success,
        migrated: claimsResult.migrated,
        errors: claimsResult.errors?.length || 0,
      });
    }

    const overallSuccess = 
      (!migrateDefinitions || results.definitions?.success !== false) &&
      (!migratePlayerClaims || results.playerClaims?.success !== false);

    return NextResponse.json({
      success: overallSuccess,
      message: overallSuccess
        ? 'Migration completed successfully'
        : 'Migration completed with errors',
      results,
    });
  }
);

