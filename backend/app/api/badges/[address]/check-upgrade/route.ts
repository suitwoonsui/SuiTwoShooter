// ==========================================
// Badge Upgrade Check API Route
// ==========================================

import { NextRequest } from 'next/server';
import { getBadgeService } from '@/lib/sui/badge-service';
import { handleCorsPreflight } from '@/lib/cors';
import { BadgeValidators } from '@/lib/sui/badge-validators';
import { BadgeError, BadgeErrorCode } from '@/lib/sui/badge-errors';
import { BadgeLogger } from '@/lib/sui/badge-logger';
import { withApiHandler, getAddressParam } from '@/lib/api/api-handler';

/**
 * GET /api/badges/[address]/check-upgrade
 * Check if player has a pending badge tier upgrade
 * 
 * This is a read-only check that doesn't require gas or build transaction data.
 * If an upgrade is available, the frontend should call /api/badges/upgrade to build the transaction.
 * 
 * Returns:
 * {
 *   success: boolean,
 *   hasPendingUpgrade: boolean,
 *   newTier?: number,
 *   badgeId?: string,
 *   error?: string
 * }
 * 
 * Note: Frontend must call /api/badges/upgrade to build transaction if hasPendingUpgrade is true
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
    const address = await getAddressParam(context.params);

    BadgeLogger.info('Badge upgrade check request received', { address });

    const badgeService = getBadgeService();
    
    // Get current badge
    const badge = await badgeService.getBadge(address);
    if (!badge) {
      return {
        success: true,
        hasPendingUpgrade: false,
      };
    }

    // Check if upgrade is available (read-only, no transaction building)
    // This doesn't require gas and won't fail if admin wallet has no SUI
    const upgradeCheck = await badgeService.checkBadgeUpgrade(address);

    if (!upgradeCheck.success) {
      throw new BadgeError(
        BadgeErrorCode.BLOCKCHAIN_QUERY_FAILED,
        upgradeCheck.error || 'Failed to check badge upgrade'
      );
    }

    // Return upgrade info - frontend will call /api/badges/upgrade to build transaction
    return {
      success: true,
      hasPendingUpgrade: upgradeCheck.hasPendingUpgrade,
      newTier: upgradeCheck.newTier,
      badgeId: upgradeCheck.badgeId,
      // Don't return transactionData - frontend will build it when user clicks upgrade
    };
  },
  {
    logRequest: true,
  }
);

