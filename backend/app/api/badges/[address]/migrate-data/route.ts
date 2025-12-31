// ==========================================
// Badge Migration Data API
// ==========================================
// Returns old badge data for migration if player has an old badge

import { NextRequest } from 'next/server';
import { getBadgeService } from '@/lib/sui/badge-service';
import { handleCorsPreflight } from '@/lib/cors';
import { BadgeLogger } from '@/lib/sui/badge-logger';
import { withApiHandler, getAddressParam } from '@/lib/api/api-handler';
import { BadgeError, BadgeErrorCode } from '@/lib/sui/badge-errors';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const GET = withApiHandler(
  async (
    request: NextRequest,
    context: { params: Promise<{ address: string }> }
  ) => {
    const address = await getAddressParam(context.params);

    BadgeLogger.info('Checking for old badge', { address });

    const badgeService = getBadgeService();
    
    // Check if player has badge in new contract
    // First check registry, then verify the badge object actually exists
    // (Registry entry might exist even if badge was burned)
    BadgeLogger.debug('Step 1: Checking if player has badge in new contract registry', { address });
    const hasNewBadgeRegistry = await badgeService.hasBadge(address);
    BadgeLogger.debug('hasNewBadgeRegistry result', { address, hasNewBadgeRegistry });
    
    if (hasNewBadgeRegistry) {
      // Registry says player has badge - verify the badge object actually exists
      BadgeLogger.debug('Registry shows badge exists, verifying badge object', { address });
      const newBadge = await badgeService.getBadge(address);
      
      if (newBadge && newBadge.badgeId) {
        // Badge object exists and is valid - no migration needed
        BadgeLogger.info('Player has valid badge in new contract, no migration needed', {
          address,
          badgeId: newBadge.badgeId,
        });
        return {
          success: true,
          needsMigration: false,
          message: 'Player already has badge in new contract',
        };
      } else {
        // Registry entry exists but badge object doesn't (was burned)
        // This is an orphaned registry entry - clean it up automatically
        BadgeLogger.warn('Registry entry exists but badge object not found (orphaned entry), cleaning up', { address });
        try {
          const cleanupResult = await badgeService.adminCleanupOrphanedEntry(address);
          if (cleanupResult.success) {
            BadgeLogger.info('Orphaned registry entry cleaned up successfully', { address });
          } else {
            BadgeLogger.warn('Failed to clean up orphaned entry', {
              address,
              error: cleanupResult.error,
            });
            // Continue anyway - will check for old badge
          }
        } catch (error) {
          BadgeLogger.warn('Error cleaning up orphaned entry', { error, address });
          // Continue anyway - will check for old badge
        }
        // Proceed to check for old badge after cleanup
        BadgeLogger.debug('Proceeding to check for old badge', { address });
      }
    } else {
      BadgeLogger.debug('No badge found in new contract registry, proceeding to check for old badge', { address });
    }

    // Check for old badge
    // Get old contract IDs from environment
    BadgeLogger.debug('Step 2: Checking for old badge', { address });
    const oldPackageId = process.env.OLD_GAME_SCORE_CONTRACT_TESTNET || process.env.OLD_GAME_SCORE_CONTRACT;
    const oldRegistryId = process.env.OLD_BADGE_REGISTRY_OBJECT_ID_TESTNET || process.env.OLD_BADGE_REGISTRY_OBJECT_ID;

    BadgeLogger.debug('Old contract config', {
      address,
      oldPackageId: oldPackageId ? `${oldPackageId.substring(0, 10)}...` : 'NOT SET',
      oldRegistryId: oldRegistryId ? `${oldRegistryId.substring(0, 10)}...` : 'NOT SET',
    });

    if (!oldPackageId || !oldRegistryId) {
      // Old contract IDs not configured, can't check for old badges
      BadgeLogger.warn('Old contract IDs not configured - cannot check for old badges', { address });
      return {
        success: true,
        needsMigration: false,
        message: 'Old contract IDs not configured',
      };
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
    BadgeLogger.debug('Step 3: Querying events from old contract', {
      address,
      packageId: oldPackageId.substring(0, 10) + '...',
    });
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

    BadgeLogger.debug('Found events from old contract', {
      address,
      eventCount: events.data.length,
    });

    // Find the most recent badge for this player
    // Filter by owner address in the event data
    let oldBadgeId = null;
    for (const event of events.data) {
      if (event.parsedJson) {
        const eventData = event.parsedJson as any;
        // Check if this event is for the requested address
        if (eventData.owner === address && eventData.badge_id) {
          oldBadgeId = eventData.badge_id;
          BadgeLogger.info('Found old badge ID in events', { address, oldBadgeId });
          break;
        }
      }
    }

    if (!oldBadgeId) {
      // No old badge found
      BadgeLogger.debug('No old badge found in events', { address });
      return {
        success: true,
        needsMigration: false,
        message: 'No old badge found',
      };
    }

    // Read old badge data
    BadgeLogger.debug('Step 4: Reading old badge object', { address, oldBadgeId });
    try {
      const badgeObject = await client.getObject({
        id: oldBadgeId,
        options: {
          showType: true,
          showContent: true,
          showOwner: true,
        },
      });

      BadgeLogger.debug('Badge object read result', {
        address,
        oldBadgeId,
        hasData: !!badgeObject.data,
        hasContent: !!badgeObject.data?.content,
        type: badgeObject.data?.type,
        error: badgeObject.error,
      });

      if (!badgeObject.data || !badgeObject.data.content) {
        BadgeLogger.warn('Old badge object not found (was burned/deleted)', { address, oldBadgeId });
        // Badge was burned - nothing to migrate
        // Event history will always show the badge was minted, but if the object is gone,
        // there's nothing to migrate
        return {
          success: true,
          needsMigration: false,
          message: 'Old badge was burned - nothing to migrate',
        };
      }

      const type = badgeObject.data.type || '';
      if (!type.includes('badge_system::EarlySupporterBadge')) {
        return {
          success: true,
          needsMigration: false,
          message: 'Object is not a badge',
        };
      }

      const fields = (badgeObject.data.content as any).fields;
      if (!fields) {
        return {
          success: true,
          needsMigration: false,
          message: 'Badge has no fields',
        };
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

      BadgeLogger.info('Found old badge for migration', {
        address,
        badgeId: oldBadgeId,
        tier: oldTier,
        gamesPlayed: oldGamesPlayed,
        mintDate: oldMintDate,
        imageUrl,
      });

      return {
        success: true,
        needsMigration: true,
        migrationData: {
          oldBadgeId,
          oldTier,
          oldGamesPlayed,
          oldMintDate,
          imageUrl, // Return URL instead of image data
        },
      };
    } catch (error) {
      BadgeLogger.error('Error reading old badge', { error, address, oldBadgeId });
      throw new Error(error instanceof Error ? error.message : 'Failed to read old badge');
    }
  }
);

