// ==========================================
// Badge Check Upgrade API Route
// GET /api/badges/[address]/check-upgrade
// Returns whether the player has a pending tier upgrade (read-only, no tx).
// Uses tier config from platform Helm + Hydroscope stats + current badge tier.
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { PlatformValidators } from '@/lib/services/platform/validators/platform-validators';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { withApiHandler, getAddressParam } from '@/lib/api/api-handler';
import { getBadgeService } from '@/lib/services/badge/core/badge-service';

export async function OPTIONS(
  _request: NextRequest,
  context: { params: Promise<{ address: string }> }
) {
  return handleCorsPreflight(_request);
}

export const GET = withApiHandler(
  async (
    _request: NextRequest,
    context: { params: Promise<{ address: string }> }
  ) => {
    const playerAddress = await getAddressParam(context.params);
    if (!playerAddress) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        'Address parameter is required'
      );
    }
    PlatformValidators.validateAddress(playerAddress);
    const badgeService = getBadgeService();
    const result = await badgeService.checkBadgeUpgrade(playerAddress);
    if (!result.success) {
      return {
        success: false,
        canUpgrade: false,
        hasPendingUpgrade: false,
        error: result.error,
      };
    }
    return {
      success: true,
      canUpgrade: result.hasPendingUpgrade,
      hasPendingUpgrade: result.hasPendingUpgrade,
      newTier: result.newTier,
      badgeId: result.badgeId,
      message: result.hasPendingUpgrade
        ? `Tier upgrade available to tier ${result.newTier}. Use POST /api/badges/upgrade to build upgrade tx.`
        : undefined,
    };
  },
  { logRequest: true }
);
