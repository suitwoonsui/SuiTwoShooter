// ==========================================
// POST /api/admin/badges — mint (Shipyard, admin-signed), burn/cleanup stubs
// Proxied from admin UI; verifies connected wallet matches game admin.
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
      action: 'mint' | 'burn' | 'cleanup' | 'update-image';
      contract?: 'new' | 'old';
      playerAddress?: string;
      tier?: number;
      badgeId?: string;
      adminWalletAddress: string;
    }>(request);

    const adminWallet = getAdminWalletService();
    const expectedAdminAddress = adminWallet.getAddress().toLowerCase();
    const providedAdminAddress = body?.adminWalletAddress?.toLowerCase();

    if (!providedAdminAddress || providedAdminAddress !== expectedAdminAddress) {
      PlatformLogger.warn('Admin badges: wallet verification failed', {
        expected: expectedAdminAddress,
        provided: providedAdminAddress || 'none',
      });
      throw new PlatformError(
        PlatformErrorCode.UNAUTHORIZED,
        'Unauthorized. Admin wallet verification failed. Please connect the correct admin wallet.'
      );
    }

    const action = body?.action;
    if (action === 'update-image') {
      throw new PlatformError(
        PlatformErrorCode.INVALID_INPUT,
        'Use POST /api/admin/badges/update-image-url for image URL updates.'
      );
    }

    if (!action || !['mint', 'burn', 'cleanup'].includes(action)) {
      throw new PlatformError(PlatformErrorCode.INVALID_INPUT, 'action must be mint, burn, or cleanup');
    }

    const contract = body.contract ?? 'new';
    if (contract === 'old') {
      throw new PlatformError(
        PlatformErrorCode.INVALID_INPUT,
        'Old on-chain badge contract is not supported for admin mint/burn/cleanup. Use Shipyard (new) only.'
      );
    }

    const badgeService = getBadgeService();

    if (action === 'mint') {
      const playerAddress = body.playerAddress?.trim() ?? '';
      if (!playerAddress.startsWith('0x')) {
        throw new PlatformError(
          PlatformErrorCode.INVALID_ADDRESS,
          'playerAddress is required for mint (0x...)'
        );
      }
      PlatformValidators.validateAddress(playerAddress);
      const tier = typeof body.tier === 'number' && Number.isInteger(body.tier) ? body.tier : 0;
      PlatformValidators.validateTier(tier);

      PlatformLogger.info('Admin badges: mint', { playerAddress, tier });
      const result = await badgeService.executeMintBadgeAsAdmin(playerAddress, tier);
      if (!result.success || !result.digest) {
        return {
          success: false,
          error: result.error ?? 'Admin mint failed',
          message: result.error,
        };
      }
      return {
        success: true,
        digest: result.digest,
        message: `Badge minted to game admin wallet (tier ${tier}).${
          playerAddress.toLowerCase() !== adminWallet.getAddress().toLowerCase()
            ? ` Grant target (metadata): ${playerAddress}.`
            : ''
        }`,
      };
    }

    if (action === 'cleanup') {
      const playerAddress = body.playerAddress?.trim() ?? '';
      if (!playerAddress.startsWith('0x')) {
        throw new PlatformError(
          PlatformErrorCode.INVALID_ADDRESS,
          'playerAddress is required for cleanup (0x...)'
        );
      }
      PlatformValidators.validateAddress(playerAddress);
      const result = await badgeService.adminCleanupOrphanedEntry(playerAddress);
      return {
        success: result.success,
        digest: result.digest,
        message: result.success ? 'Cleanup completed.' : undefined,
        error: result.error,
      };
    }

    // burn
    const badgeId = body.badgeId?.trim() ?? '';
    if (!badgeId.startsWith('0x')) {
      throw new PlatformError(PlatformErrorCode.INVALID_INPUT, 'badgeId is required for burn (0x...)');
    }
    const result = await badgeService.adminBurnBadge(badgeId);
    return {
      success: result.success,
      digest: result.digest,
      message: result.success ? 'Burn completed.' : undefined,
      error: result.error,
    };
  },
  { logRequest: true }
);
