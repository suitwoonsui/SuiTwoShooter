// Game Pass Migration API endpoint
import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { adminWalletService } from '@/lib/sui/admin-wallet-service';
import { MigrationService } from '@/lib/sui/migration-service';
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
    BadgeLogger.info('Received POST request to /api/game-pass/migrate');
    
    const body = await getRequestBody<{ 
      playerAddress: string; 
      oldPackageId?: string; 
      oldGamePassSystemId?: string;
    }>(request);
    BadgeLogger.debug('Request body', { body });
    
    const { playerAddress, oldPackageId, oldGamePassSystemId } = body;

    // Validate required fields
    if (!playerAddress) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'playerAddress is required'
      );
    }

    BadgeValidators.validateAddress(playerAddress);

    // Use old game pass system IDs from request body, or fall back to environment variables
    // Check TESTNET versions first, then fall back to non-testnet versions
    const finalOldPackageId = oldPackageId || process.env.OLD_GAME_SCORE_CONTRACT_TESTNET || process.env.OLD_GAME_SCORE_PACKAGE_ID || process.env.OLD_GAME_SCORE_CONTRACT;
    const finalOldGamePassSystemId = oldGamePassSystemId || process.env.OLD_GAME_PASS_SYSTEM_OBJECT_ID_TESTNET || process.env.OLD_GAME_PASS_SYSTEM_OBJECT_ID;

    if (!finalOldPackageId) {
      throw new Error('oldPackageId is required. Provide it in the request body or set OLD_GAME_SCORE_CONTRACT_TESTNET (or OLD_GAME_SCORE_PACKAGE_ID) environment variable.');
    }

    if (!finalOldGamePassSystemId) {
      throw new Error('oldGamePassSystemId is required. Provide it in the request body or set OLD_GAME_PASS_SYSTEM_OBJECT_ID_TESTNET (or OLD_GAME_PASS_SYSTEM_OBJECT_ID) environment variable.');
    }

    BadgeLogger.info('Migrating game pass', {
      playerAddress,
      oldPackageId: finalOldPackageId,
      oldGamePassSystemId: finalOldGamePassSystemId,
      packageIdSource: oldPackageId ? 'request' : 'environment',
      gamePassSystemSource: oldGamePassSystemId ? 'request' : 'environment',
    });

    // Create migration service and migrate
    const migrationService = new MigrationService(adminWalletService);
    const result = await migrationService.migrateGamePass(
      playerAddress,
      finalOldPackageId,
      finalOldGamePassSystemId
    );

    if (!result.success) {
      throw new Error(result.error || 'Failed to migrate game pass');
    }

    BadgeLogger.info('Game pass migrated successfully', {
      playerAddress,
      digest: result.digest,
    });

    return {
      success: true,
      digest: result.digest,
      playerAddress,
      message: 'Player game pass migrated successfully to new system',
    };
  }
);

// GET endpoint to fetch all wallets with game passes
export const GET = withApiHandler(
  async (request: NextRequest) => {
    BadgeLogger.info('Received GET request to /api/game-pass/migrate (list wallets)');
    
    const { searchParams } = new URL(request.url);
    const oldGamePassSystemId = searchParams.get('oldGamePassSystemId');
    const oldPackageId = searchParams.get('oldPackageId');

    // Use old game pass system ID from query param or fall back to environment variable
    // Check TESTNET versions first, then fall back to non-testnet versions
    const finalOldGamePassSystemId = oldGamePassSystemId || process.env.OLD_GAME_PASS_SYSTEM_OBJECT_ID_TESTNET || process.env.OLD_GAME_PASS_SYSTEM_OBJECT_ID;
    const finalOldPackageId = oldPackageId || process.env.OLD_GAME_SCORE_CONTRACT_TESTNET || process.env.OLD_GAME_SCORE_PACKAGE_ID || process.env.OLD_GAME_SCORE_CONTRACT;

    if (!finalOldGamePassSystemId) {
      throw new Error('oldGamePassSystemId is required. Provide it as a query parameter or set OLD_GAME_PASS_SYSTEM_OBJECT_ID_TESTNET (or OLD_GAME_PASS_SYSTEM_OBJECT_ID) environment variable.');
    }

    if (!finalOldPackageId) {
      throw new Error('oldPackageId is required. Provide it as a query parameter or set OLD_GAME_SCORE_CONTRACT_TESTNET (or OLD_GAME_SCORE_PACKAGE_ID) environment variable.');
    }

    BadgeLogger.info('Fetching wallets with game passes from old system', {
      oldGamePassSystemId: finalOldGamePassSystemId,
      oldPackageId: finalOldPackageId,
    });

    // Create migration service and get wallets
    const migrationService = new MigrationService(adminWalletService);
    const result = await migrationService.getAllWalletsWithGamePasses(finalOldPackageId, finalOldGamePassSystemId);

    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch wallets with game passes');
    }

    BadgeLogger.info('Found wallets with game passes', {
      count: result.wallets?.length || 0,
      oldGamePassSystemId: finalOldGamePassSystemId,
    });

    return {
      success: true,
      wallets: result.wallets || [],
      count: result.wallets?.length || 0,
    };
  }
);

