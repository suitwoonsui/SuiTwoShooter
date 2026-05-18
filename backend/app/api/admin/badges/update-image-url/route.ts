// ==========================================
// POST /api/admin/badges/update-image-url
// Builds Shipyard metadata upgrade tx for the badge owner; owner must sign (sender = player).
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { assertGameAdminServerConfigured } from '@/lib/auth';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { PlatformValidators } from '@/lib/services/platform/validators/platform-validators';
import { getBadgeService } from '@/lib/services/badge/core/badge-service';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const POST = withApiHandler(
  async (request: NextRequest) => {
    assertGameAdminServerConfigured();

    const body = await getRequestBody<{
      playerAddress: string;
      adminWalletAddress?: string;
      imageUrl?: string;
    }>(request);

    const adminWallet = getAdminWalletService();
    const expectedAdminAddress = adminWallet.getAddress().toLowerCase();
    const providedAdminAddress = body?.adminWalletAddress?.toLowerCase();

    if (!providedAdminAddress || providedAdminAddress !== expectedAdminAddress) {
      PlatformLogger.warn('Admin badges update-image: wallet verification failed', {
        expected: expectedAdminAddress,
        provided: providedAdminAddress || 'none',
      });
      throw new PlatformError(
        PlatformErrorCode.UNAUTHORIZED,
        'Unauthorized. adminWalletAddress must match the game admin wallet.'
      );
    }

    const playerAddress = body?.playerAddress?.trim() ?? '';
    if (!playerAddress.startsWith('0x')) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        'playerAddress is required (0x...)'
      );
    }
    PlatformValidators.validateAddress(playerAddress);

    PlatformLogger.info('Admin badges: build update image URL tx', { playerAddress });
    const badgeService = getBadgeService();
    const result = await badgeService.updateBadgeImageUrl(playerAddress, body?.imageUrl?.trim() || undefined);

    if (!result.success || !result.transaction) {
      return {
        success: false,
        error: result.error ?? 'Failed to build badge image upgrade transaction',
        message: result.error,
      };
    }

    return {
      success: true,
      requiresPlayerSignature: true,
      message:
        'Upgrade transaction built. The badge owner must sign and submit it with their wallet (same flow as in-game badge upgrade).',
      transaction: result.transaction,
    };
  },
  { logRequest: true }
);
