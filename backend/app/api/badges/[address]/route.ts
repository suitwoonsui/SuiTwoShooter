// ==========================================
// Badge Query API Route
// ==========================================

import { NextRequest } from 'next/server';
import { getBadgeService } from '@/lib/sui/badge-service';
import { handleCorsPreflight } from '@/lib/cors';
import { BadgeValidators } from '@/lib/sui/badge-validators';
import { BadgeError, BadgeErrorCode } from '@/lib/sui/badge-errors';
import { BadgeLogger } from '@/lib/sui/badge-logger';
import { withApiHandler, getAddressParam } from '@/lib/api/api-handler';

/**
 * GET /api/badges/[address]
 * Query player's badge information
 * 
 * Query params:
 *   ?contract=new|old  (default: new)
 * 
 * Returns:
 * {
 *   success: boolean,
 *   hasBadge: boolean,
 *   badge?: {
 *     badgeId: string,
 *     tier: number,
 *     gamesPlayed: number,
 *     mintDate: number,
 *     lastUpdated: number,
 *     discounts: {
 *       store: number,
 *       gameplay: number
 *     }
 *   }
 * }
 */

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const GET = withApiHandler(
  async (
    request: NextRequest,
    context: { params: Promise<{ address: string }> }
  ) => {
    // Extract and validate address parameter
    const playerAddress = await getAddressParam(context.params);
    
    // Check for contract query parameter
    const { searchParams } = new URL(request.url);
    const contract = searchParams.get('contract') || 'new'; // Default to 'new'
    const useOldContract = contract === 'old';
    
    BadgeLogger.debug('Badge query request', {
      playerAddress,
      contract,
      useOldContract,
    });

    // Validate address format using BadgeValidators
    if (!playerAddress) {
      throw new BadgeError(
        BadgeErrorCode.INVALID_ADDRESS,
        'Address parameter is required'
      );
    }
    BadgeValidators.validateAddress(playerAddress);

    // Get badge service
    const badgeService = getBadgeService();
    
    // Check if player has badge (in selected contract)
    BadgeLogger.debug('Checking if player has badge', { playerAddress, contract });
    
    const hasBadge = useOldContract
      ? await badgeService.hasBadgeOldContract(playerAddress)
      : await badgeService.hasBadge(playerAddress);
    
    BadgeLogger.debug('hasBadge check result', { hasBadge, playerAddress, contract });
    
    if (!hasBadge) {
      BadgeLogger.debug('Player does not have badge', { playerAddress, contract });
      return {
        success: true,
        hasBadge: false,
      };
    }

    // Get badge data (from selected contract)
    BadgeLogger.debug('Player has badge - getting badge data', { playerAddress, contract });
    
    const badge = useOldContract
      ? await badgeService.getBadgeOldContract(playerAddress)
      : await badgeService.getBadge(playerAddress);
    
    BadgeLogger.debug('getBadge result', { 
      playerAddress, 
      hasBadge: !!badge,
      badgeId: badge?.badgeId,
      tier: badge?.tier,
    });
    
    if (!badge) {
      BadgeLogger.warn('Inconsistent state - hasBadge=true but getBadge returned null', {
        playerAddress,
        contract,
        note: 'This might indicate an orphaned registry entry',
      });
      return {
        success: true,
        hasBadge: false,
      };
    }

    // Get discounts for tier
    const discounts = badgeService.getDiscounts(badge.tier);
    BadgeLogger.debug('Retrieved badge with discounts', {
      playerAddress,
      tier: badge.tier,
      discounts,
    });

    // Return success response
    return {
      success: true,
      hasBadge: true,
      badge: {
        badgeId: badge.badgeId,
        tier: badge.tier,
        gamesPlayed: badge.gamesPlayed,
        mintDate: badge.mintDate,
        lastUpdated: badge.lastUpdated,
        imageUrl: badge.imageUrl,
        discounts,
      },
    };
  },
  {
    logRequest: true,
  }
);

