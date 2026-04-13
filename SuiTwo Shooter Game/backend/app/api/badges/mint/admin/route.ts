// ==========================================
// Badge mint — break-glass: game admin signs; soulbound NFT recipient = admin wallet (payer/owner).
// Body playerAddress is optional metadata (grant_target_player) when different from admin.
// Use POST /badges/mint/purchase + /fulfill for normal player flow (recipient = player).
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { getBadgeService } from '@/lib/services/badge/core/badge-service';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(
  async (request: NextRequest) => {
    const body = await getRequestBody<{ playerAddress: string; tier?: number }>(request);
    const playerAddress = body?.playerAddress?.trim() ?? '';
    if (!playerAddress.startsWith('0x')) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        'playerAddress is required and must be a valid Sui address (0x...)'
      );
    }
    const tier = typeof body?.tier === 'number' && Number.isInteger(body.tier) ? body.tier : 0;

    PlatformLogger.info('Badge mint admin: admin wallet signs Shipyard mint', { playerAddress, tier });
    const badgeService = getBadgeService();
    const result = await badgeService.executeMintBadgeAsAdmin(playerAddress, tier);

    if (!result.success) {
      return {
        success: false,
        error: result.error ?? 'Admin mint failed',
        message: result.error,
      };
    }
    if (!result.digest) {
      return {
        success: false,
        error: 'No digest returned',
        message: 'No digest returned',
      };
    }
    return { success: true, digest: result.digest };
  },
  { logRequest: true }
);
