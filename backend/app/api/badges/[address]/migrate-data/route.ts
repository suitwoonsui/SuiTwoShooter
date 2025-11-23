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
    const hasNewBadge = await badgeService.hasBadge(address);
    
    if (hasNewBadge) {
      // Player already has badge in new contract, no migration needed
      return NextResponse.json(
        {
          success: true,
          needsMigration: false,
          message: 'Player already has badge in new contract',
        },
        { headers: corsHeaders }
      );
    }

    // Check for old badge
    // Get old contract IDs from environment
    const oldPackageId = process.env.OLD_GAME_SCORE_CONTRACT_TESTNET || process.env.OLD_GAME_SCORE_CONTRACT;
    const oldRegistryId = process.env.OLD_BADGE_REGISTRY_OBJECT_ID_TESTNET || process.env.OLD_BADGE_REGISTRY_OBJECT_ID;

    if (!oldPackageId || !oldRegistryId) {
      // Old contract IDs not configured, can't check for old badges
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
    const events = await client.queryEvents({
      query: {
        MoveModule: {
          package: oldPackageId,
          module: 'badge_system',
        },
      },
      filter: {
        Sender: address,
      },
      limit: 10,
      order: 'descending',
    });

    // Find the most recent badge for this player
    let oldBadgeId = null;
    for (const event of events.data) {
      if (event.parsedJson) {
        const eventData = event.parsedJson as any;
        if (eventData.owner === address && eventData.badge_id) {
          oldBadgeId = eventData.badge_id;
          break;
        }
      }
    }

    if (!oldBadgeId) {
      // No old badge found
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
    try {
      const badgeObject = await client.getObject({
        id: oldBadgeId,
        options: {
          showType: true,
          showContent: true,
          showOwner: true,
        },
      });

      if (!badgeObject.data || !badgeObject.data.content) {
        return NextResponse.json(
          {
            success: true,
            needsMigration: false,
            message: 'Old badge object not found',
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
      
      // Extract image data
      let imageData: number[] = [];
      if (fields.image_data) {
        if (Array.isArray(fields.image_data)) {
          imageData = fields.image_data;
        } else if (typeof fields.image_data === 'string') {
          // If it's a hex string, convert it
          const hex = fields.image_data.replace('0x', '');
          imageData = hex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || [];
        }
      }

      // If no image data, load default tier image
      if (imageData.length === 0) {
        const imageBuffer = await badgeService.loadBadgeImage(oldTier);
        imageData = Array.from(imageBuffer);
      }

      console.log(`✅ [BADGE MIGRATION] Found old badge for ${address}:`, {
        badgeId: oldBadgeId,
        tier: oldTier,
        gamesPlayed: oldGamesPlayed,
        mintDate: oldMintDate,
        imageDataSize: imageData.length,
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
            imageData,
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

