// ==========================================
// Badge Migration Data API
// ==========================================
// Returns old badge data for migration if player has an old badge

import { NextRequest, NextResponse } from 'next/server';
import { getBadgeService } from '@/lib/sui/badge-service';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const corsHeaders = getCorsHeaders(request);
  
  try {
    const { address } = await params;
    
    if (!address || !address.startsWith('0x') || address.length !== 66) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid address format',
        },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`🔄 [BADGE MIGRATION] Checking for old badge: ${address}`);

    const badgeService = getBadgeService();
    
    // Check if player has badge in new contract
    // First check registry, then verify the badge object actually exists
    // (Registry entry might exist even if badge was burned)
    console.log(`🔍 [BADGE MIGRATION] Step 1: Checking if player has badge in new contract registry...`);
    const hasNewBadgeRegistry = await badgeService.hasBadge(address);
    console.log(`🔍 [BADGE MIGRATION] hasNewBadgeRegistry result: ${hasNewBadgeRegistry}`);
    
    if (hasNewBadgeRegistry) {
      // Registry says player has badge - verify the badge object actually exists
      console.log(`🔄 [BADGE MIGRATION] Registry shows badge exists, verifying badge object...`);
      const newBadge = await badgeService.getBadge(address);
      
      if (newBadge && newBadge.badgeId) {
        // Badge object exists and is valid - no migration needed
        console.log(`✅ [BADGE MIGRATION] Player has valid badge in new contract (ID: ${newBadge.badgeId}), no migration needed`);
        return NextResponse.json(
          {
            success: true,
            needsMigration: false,
            message: 'Player already has badge in new contract',
          },
          { headers: corsHeaders }
        );
      } else {
        // Registry entry exists but badge object doesn't (was burned)
        // This is an orphaned registry entry - clean it up automatically
        console.log(`⚠️ [BADGE MIGRATION] Registry entry exists but badge object not found (orphaned entry), cleaning up...`);
        try {
          const cleanupResult = await badgeService.adminCleanupOrphanedEntry(address);
          if (cleanupResult.success) {
            console.log(`✅ [BADGE MIGRATION] Orphaned registry entry cleaned up successfully`);
          } else {
            console.warn(`⚠️ [BADGE MIGRATION] Failed to clean up orphaned entry: ${cleanupResult.error}`);
            // Continue anyway - will check for old badge
          }
        } catch (error) {
          console.warn(`⚠️ [BADGE MIGRATION] Error cleaning up orphaned entry:`, error);
          // Continue anyway - will check for old badge
        }
        // Proceed to check for old badge after cleanup
        console.log(`🔄 [BADGE MIGRATION] Proceeding to check for old badge...`);
      }
    } else {
      console.log(`ℹ️ [BADGE MIGRATION] No badge found in new contract registry, proceeding to check for old badge...`);
    }

    // Check for old badge
    // Get old contract IDs from environment
    console.log(`🔍 [BADGE MIGRATION] Step 2: Checking for old badge...`);
    const oldPackageId = process.env.OLD_GAME_SCORE_CONTRACT_TESTNET || process.env.OLD_GAME_SCORE_CONTRACT;
    const oldRegistryId = process.env.OLD_BADGE_REGISTRY_OBJECT_ID_TESTNET || process.env.OLD_BADGE_REGISTRY_OBJECT_ID;

    console.log(`🔍 [BADGE MIGRATION] Old contract config:`, {
      oldPackageId: oldPackageId ? `${oldPackageId.substring(0, 10)}...` : 'NOT SET',
      oldRegistryId: oldRegistryId ? `${oldRegistryId.substring(0, 10)}...` : 'NOT SET',
    });

    if (!oldPackageId || !oldRegistryId) {
      // Old contract IDs not configured, can't check for old badges
      console.log(`⚠️ [BADGE MIGRATION] Old contract IDs not configured - cannot check for old badges`);
      return NextResponse.json(
        {
          success: true,
          needsMigration: false,
          message: 'Old contract IDs not configured',
        },
        { headers: corsHeaders }
      );
    }

    // Try to find old badge
    const { SuiClient, getFullnodeUrl } = await import('@mysten/sui/client');
    const { getConfig } = await import('@/config/config');
    const config = getConfig();
    const client = new SuiClient({
      url: getFullnodeUrl(config.sui.network as 'testnet' | 'mainnet' | 'devnet'),
    });

    // Query BadgeMinted events from old contract to find badge ID
    // Note: Filter by sender is no longer supported in queryEvents, so we fetch and filter manually
    console.log(`🔍 [BADGE MIGRATION] Step 3: Querying events from old contract (package: ${oldPackageId.substring(0, 10)}...)...`);
    const events = await client.queryEvents({
      query: {
        MoveModule: {
          package: oldPackageId,
          module: 'badge_system',
        },
      },
      limit: 50, // Fetch more events to increase chance of finding the badge
      order: 'descending',
    });

    console.log(`🔍 [BADGE MIGRATION] Found ${events.data.length} events from old contract`);

    // Find the most recent badge for this player
    // Filter by owner address in the event data
    let oldBadgeId = null;
    for (const event of events.data) {
      if (event.parsedJson) {
        const eventData = event.parsedJson as any;
        // Check if this event is for the requested address
        if (eventData.owner === address && eventData.badge_id) {
          oldBadgeId = eventData.badge_id;
          console.log(`✅ [BADGE MIGRATION] Found old badge ID in events: ${oldBadgeId}`);
          break;
        }
      }
    }

    if (!oldBadgeId) {
      // No old badge found
      console.log(`ℹ️ [BADGE MIGRATION] No old badge found in events for address ${address}`);
      return NextResponse.json(
        {
          success: true,
          needsMigration: false,
          message: 'No old badge found',
        },
        { headers: corsHeaders }
      );
    }

    // Read old badge data
    console.log(`🔍 [BADGE MIGRATION] Step 4: Reading old badge object (ID: ${oldBadgeId})...`);
    try {
      const badgeObject = await client.getObject({
        id: oldBadgeId,
        options: {
          showType: true,
          showContent: true,
          showOwner: true,
        },
      });

      console.log(`🔍 [BADGE MIGRATION] Badge object read result:`, {
        hasData: !!badgeObject.data,
        hasContent: !!badgeObject.data?.content,
        type: badgeObject.data?.type,
        error: badgeObject.error,
      });

      if (!badgeObject.data || !badgeObject.data.content) {
        console.log(`⚠️ [BADGE MIGRATION] Old badge object not found (was burned/deleted)`);
        // Badge was burned - nothing to migrate
        // Event history will always show the badge was minted, but if the object is gone,
        // there's nothing to migrate
        return NextResponse.json(
          {
            success: true,
            needsMigration: false,
            message: 'Old badge was burned - nothing to migrate',
          },
          { headers: corsHeaders }
        );
      }

      const type = badgeObject.data.type || '';
      if (!type.includes('badge_system::EarlySupporterBadge')) {
        return NextResponse.json(
          {
            success: true,
            needsMigration: false,
            message: 'Object is not a badge',
          },
          { headers: corsHeaders }
        );
      }

      const fields = (badgeObject.data.content as any).fields;
      if (!fields) {
        return NextResponse.json(
          {
            success: true,
            needsMigration: false,
            message: 'Badge has no fields',
          },
          { headers: corsHeaders }
        );
      }

      // Extract badge data
      const oldTier = parseInt(fields.tier || '0', 10);
      const oldGamesPlayed = parseInt(fields.games_played || '0', 10);
      const oldMintDate = parseInt(fields.mint_date || '0', 10);
      
      // Construct image URL based on tier (new system uses static URLs)
      const { getConfig } = await import('@/config/config');
      const config = getConfig();
      const tierNames = ['Standard', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
      const tierName = tierNames[oldTier] || 'Standard';
      const imageUrl = `${config.server.apiBaseUrl}/Badges/${tierName}.webp`;

      console.log(`✅ [BADGE MIGRATION] Found old badge for ${address}:`, {
        badgeId: oldBadgeId,
        tier: oldTier,
        gamesPlayed: oldGamesPlayed,
        mintDate: oldMintDate,
        imageUrl,
      });

      return NextResponse.json(
        {
          success: true,
          needsMigration: true,
          migrationData: {
            oldBadgeId,
            oldTier,
            oldGamesPlayed,
            oldMintDate,
            imageUrl, // Return URL instead of image data
          },
        },
        { headers: corsHeaders }
      );
    } catch (error) {
      console.error('❌ [BADGE MIGRATION] Error reading old badge:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to read old badge',
        },
        { status: 500, headers: corsHeaders }
      );
    }
  } catch (error) {
    console.error('❌ [BADGE MIGRATION] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

