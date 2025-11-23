// Score Migration API endpoint
import { NextRequest, NextResponse } from 'next/server';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';
import { adminWalletService } from '@/lib/sui/admin-wallet-service';
import { MigrationService } from '@/lib/sui/migration-service';
import { getConfig } from '@/config/config';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);
  
  console.log('🔄 [SCORE MIGRATION API] Received POST request to /api/scores/migrate');
  
  try {
    const body = await request.json();
    console.log('🔄 [SCORE MIGRATION API] Request body:', JSON.stringify(body, null, 2));
    
    const { playerAddress, oldPackageId, oldStatsRegistryId } = body;
    const config = getConfig();

    // Validate required fields
    if (!playerAddress) {
      console.error('❌ [SCORE MIGRATION API] Missing playerAddress');
      return NextResponse.json(
        { success: false, error: 'playerAddress is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Use old stats registry IDs from request body, or fall back to environment variables
    const finalOldPackageId = oldPackageId || config.contracts.oldGameScorePackageId;
    const finalOldStatsRegistryId = oldStatsRegistryId || config.contracts.oldStatisticsRegistryId;

    if (!finalOldPackageId) {
      console.error('❌ [SCORE MIGRATION API] Missing oldPackageId (not provided in request and not in environment variables)');
      return NextResponse.json(
        { 
          success: false, 
          error: 'oldPackageId is required. Provide it in the request body or set OLD_GAME_SCORE_PACKAGE_ID environment variable.' 
        },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!finalOldStatsRegistryId) {
      console.error('❌ [SCORE MIGRATION API] Missing oldStatsRegistryId (not provided in request and not in environment variables)');
      return NextResponse.json(
        { 
          success: false, 
          error: 'oldStatsRegistryId is required. Provide it in the request body or set OLD_STATISTICS_REGISTRY_OBJECT_ID environment variable.' 
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate player address format
    if (!playerAddress.startsWith('0x') || playerAddress.length !== 66) {
      return NextResponse.json(
        { success: false, error: 'Invalid player address format' },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`🔄 [SCORE MIGRATION API] Migrating stats for ${playerAddress}`);
    console.log(`   Old Package: ${finalOldPackageId}${oldPackageId ? '' : ' (from environment)'}`);
    console.log(`   Old Stats Registry: ${finalOldStatsRegistryId}${oldStatsRegistryId ? '' : ' (from environment)'}`);

    // Create migration service and migrate
    const migrationService = new MigrationService(adminWalletService);
    const result = await migrationService.migratePlayerStats(
      playerAddress,
      finalOldPackageId,
      finalOldStatsRegistryId
    );

    if (!result.success) {
      console.error('❌ [SCORE MIGRATION API] Migration failed:', result.error);
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to migrate stats',
        },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('✅ [SCORE MIGRATION API] Stats migrated successfully');

    return NextResponse.json(
      {
        success: true,
        digest: result.digest,
        playerAddress,
        message: 'Player statistics migrated successfully to new registry',
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('❌ [SCORE MIGRATION API] Error in migrate endpoint:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
    }
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

// GET endpoint to fetch all wallets with statistics
export async function GET(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);
  
  console.log('🔍 [SCORE MIGRATION API] Received GET request to /api/scores/migrate (list wallets)');
  
  try {
    const { searchParams } = new URL(request.url);
    const oldStatsRegistryId = searchParams.get('oldStatsRegistryId');
    const oldPackageId = searchParams.get('oldPackageId');
    const config = getConfig();

    // Use old stats registry ID from query param or fall back to environment variable
    const finalOldStatsRegistryId = oldStatsRegistryId || config.contracts.oldStatisticsRegistryId;
    const finalOldPackageId = oldPackageId || config.contracts.oldGameScorePackageId;

    if (!finalOldStatsRegistryId) {
      console.error('❌ [SCORE MIGRATION API] Missing oldStatsRegistryId');
      return NextResponse.json(
        { 
          success: false, 
          error: 'oldStatsRegistryId is required. Provide it as a query parameter or set OLD_STATISTICS_REGISTRY_OBJECT_ID environment variable.' 
        },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!finalOldPackageId) {
      console.error('❌ [SCORE MIGRATION API] Missing oldPackageId');
      return NextResponse.json(
        { 
          success: false, 
          error: 'oldPackageId is required. Provide it as a query parameter or set OLD_GAME_SCORE_PACKAGE_ID environment variable.' 
        },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`🔍 [SCORE MIGRATION API] Fetching wallets with stats from old registry: ${finalOldStatsRegistryId}`);

    // Create migration service and get wallets
    const migrationService = new MigrationService(adminWalletService);
    const result = await migrationService.getAllWalletsWithStats(finalOldPackageId, finalOldStatsRegistryId);

    if (!result.success) {
      console.error('❌ [SCORE MIGRATION API] Failed to fetch wallets:', result.error);
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to fetch wallets with stats',
        },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log(`✅ [SCORE MIGRATION API] Found ${result.wallets?.length || 0} wallets with stats`);

    return NextResponse.json(
      {
        success: true,
        wallets: result.wallets || [],
        count: result.wallets?.length || 0,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('❌ [SCORE MIGRATION API] Error in GET migrate endpoint:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
    }
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

