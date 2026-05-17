// ==========================================
// Background drift repair: sync Insignia tier from badge tier
// POST /api/insignia/[address]/sync-tier
// Intended to be called AFTER the login loading screen, as a background task.
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler, getAddressParam } from '@/lib/api/api-handler';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { PlatformValidators } from '@/lib/services/platform/validators/platform-validators';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { buildPlatformCallOptions } from '@/lib/services/platform/client/platform-client';
import { getBadgeService } from '@/lib/services/badge/core/badge-service';
import { ensureInsigniaTierMatchesBadge } from '@/lib/services/insignia/insignia-sync';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(
  async (request: NextRequest, context: { params: Promise<{ address: string }> }) => {
    const playerAddress = await getAddressParam(context.params);
    if (!playerAddress) {
      throw new PlatformError(PlatformErrorCode.INVALID_ADDRESS, 'Address parameter is required');
    }
    PlatformValidators.validateAddress(playerAddress);

    const options = buildPlatformCallOptions(request, undefined);

    const badgeService = getBadgeService();
    const badgeRow = await badgeService.getBadge(playerAddress);
    if (!badgeRow?.badgeId) {
      PlatformLogger.info('Background Insignia tier sync skipped (no badge)', { playerAddress });
      return { success: true as const, hasBadge: false as const, repaired: false as const };
    }
    const tier = Number.isFinite(badgeRow.tier) ? badgeRow.tier : 0;

    PlatformLogger.info('Background Insignia tier sync requested', { playerAddress, tier });
    const res = await ensureInsigniaTierMatchesBadge(playerAddress, tier, { ...options, throwOnError: false });
    PlatformLogger.info('Background Insignia tier sync completed', {
      playerAddress,
      tier,
      success: res.success === true,
      repaired: res.repaired === true,
      ...(res.error ? { error: res.error } : {}),
    });
    return {
      success: res.success === true,
      hasBadge: true as const,
      badgeTier: tier,
      repaired: res.repaired === true,
      ...(res.error ? { error: res.error } : {}),
    };
  },
  { logRequest: true }
);

