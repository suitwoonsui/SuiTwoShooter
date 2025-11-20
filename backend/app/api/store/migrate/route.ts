// Migration API endpoint
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
  
  console.log('🔄 [MIGRATION API] Received POST request to /api/store/migrate');
  
  try {
    const body = await request.json();
    console.log('🔄 [MIGRATION API] Request body:', JSON.stringify(body, null, 2));
    
    const { playerAddress, oldPackageId, oldStoreObjectId } = body;
    const config = getConfig();

    // Validate required fields
    if (!playerAddress) {
      console.error('❌ [MIGRATION API] Missing playerAddress');
      return NextResponse.json(
        { success: false, error: 'playerAddress is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Use old store IDs from request body, or fall back to environment variables
    const finalOldPackageId = oldPackageId || config.contracts.oldPremiumStorePackageId;
    const finalOldStoreObjectId = oldStoreObjectId || config.contracts.oldPremiumStoreObjectId;

    if (!finalOldPackageId) {
      console.error('❌ [MIGRATION API] Missing oldPackageId (not provided in request and not in environment variables)');
      return NextResponse.json(
        { 
          success: false, 
          error: 'oldPackageId is required. Provide it in the request body or set OLD_PREMIUM_STORE_PACKAGE_ID environment variable.' 
        },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!finalOldStoreObjectId) {
      console.error('❌ [MIGRATION API] Missing oldStoreObjectId (not provided in request and not in environment variables)');
      return NextResponse.json(
        { 
          success: false, 
          error: 'oldStoreObjectId is required. Provide it in the request body or set OLD_PREMIUM_STORE_OBJECT_ID environment variable.' 
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

    console.log(`🔄 [MIGRATION API] Migrating inventory for ${playerAddress}`);
    console.log(`   Old Package: ${finalOldPackageId}${oldPackageId ? '' : ' (from environment)'}`);
    console.log(`   Old Store: ${finalOldStoreObjectId}${oldStoreObjectId ? '' : ' (from environment)'}`);

    // Create migration service and migrate
    const migrationService = new MigrationService(adminWalletService);
    const result = await migrationService.migratePlayerInventory(
      playerAddress,
      finalOldPackageId,
      finalOldStoreObjectId
    );

    if (!result.success) {
      console.error('❌ [MIGRATION API] Migration failed:', result.error);
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to migrate inventory',
        },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('✅ [MIGRATION API] Inventory migrated successfully');

    return NextResponse.json(
      {
        success: true,
        digest: result.digest,
        playerAddress,
        message: 'Inventory migrated successfully to new store',
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('❌ [MIGRATION API] Error in migrate endpoint:', error);
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

// GET endpoint to fetch all wallets with inventory
export async function GET(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);
  
  console.log('🔍 [MIGRATION API] Received GET request to /api/store/migrate (list wallets)');
  
  try {
    const { searchParams } = new URL(request.url);
    const oldStoreObjectId = searchParams.get('oldStoreObjectId');
    const config = getConfig();

    // Use old store ID from query param or fall back to environment variable
    const finalOldStoreObjectId = oldStoreObjectId || config.contracts.oldPremiumStoreObjectId;

    if (!finalOldStoreObjectId) {
      console.error('❌ [MIGRATION API] Missing oldStoreObjectId');
      return NextResponse.json(
        { 
          success: false, 
          error: 'oldStoreObjectId is required. Provide it as a query parameter or set OLD_PREMIUM_STORE_OBJECT_ID environment variable.' 
        },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`🔍 [MIGRATION API] Fetching wallets with inventory from old store: ${finalOldStoreObjectId}`);

    // Create migration service and get wallets
    const migrationService = new MigrationService(adminWalletService);
    const result = await migrationService.getAllWalletsWithInventory(finalOldStoreObjectId);

    if (!result.success) {
      console.error('❌ [MIGRATION API] Failed to fetch wallets:', result.error);
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to fetch wallets with inventory',
        },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log(`✅ [MIGRATION API] Found ${result.wallets?.length || 0} wallets with inventory`);

    return NextResponse.json(
      {
        success: true,
        wallets: result.wallets || [],
        count: result.wallets?.length || 0,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('❌ [MIGRATION API] Error in GET migrate endpoint:', error);
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

