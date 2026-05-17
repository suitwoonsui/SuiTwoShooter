// ==========================================
// Game Config Admin API - Update Single Game Purchase Price
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { verifyApiKey, getAdminIdentifier } from '@/lib/auth';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { getGameConfigService } from '@/lib/services/config/game-config/game-config-service';
import { isPlatformAppConfigEnabled, platformSetPack } from '@/lib/services/platform/app-config/platform-app-config';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * PUT /api/game-config/admin/single-game
 * Update single game purchase price (pack_type 0)
 * 
 * Request body:
 * {
 *   priceUsdCents: number (price in USD cents, e.g., 10 = $0.10),
 *   name?: string (default: "Single Game"),
 *   description?: string (default: "Pay-per-game - Purchase one credit"),
 *   adminWalletAddress?: string
 * }
 */
export const PUT = withApiHandler(async (req: NextRequest) => {
    const hasApiKey = verifyApiKey(req);
    
    const body = await getRequestBody<{
      priceUsdCents: number;
      name?: string;
      description?: string;
      adminWalletAddress?: string;
    }>(req);

    if (!hasApiKey) {
      const adminWallet = getAdminWalletService();
      const expectedAdminAddress = adminWallet.getAddress().toLowerCase();
      const providedAdminAddress = body.adminWalletAddress?.toLowerCase();

      if (!providedAdminAddress || providedAdminAddress !== expectedAdminAddress) {
        throw new PlatformError(
          PlatformErrorCode.UNAUTHORIZED,
          'Unauthorized. Valid API key or admin wallet address required.'
        );
      }
    }

    const adminId = getAdminIdentifier(req);

    // Validate input
    if (typeof body.priceUsdCents !== 'number' || body.priceUsdCents <= 0) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_INPUT,
        'priceUsdCents must be a positive number'
      );
    }

    const name = body.name || 'Single Game';
    const description = body.description || 'Pay-per-game - Purchase one credit';

    PlatformLogger.info('Admin single game price update request', {
      adminId,
      priceUsdCents: body.priceUsdCents,
      formatted: `$${(body.priceUsdCents / 100).toFixed(2)}`,
      name,
      description,
    });

    if (!isPlatformAppConfigEnabled()) {
      throw new PlatformError(
        PlatformErrorCode.CONFIG_MISSING,
        'Game config uses Corridor only (platform Helm). Set PLATFORM_APP_CONFIG_URL (or PLATFORM_BACKEND_URL) and CORRIDOR_CAPABILITY_OBJECT_ID_TESTNET (or _MAINNET) in game backend config/contracts.<network>.json.'
      );
    }

    const result = await platformSetPack({
      packType: 0,
      priceUsdCents: body.priceUsdCents,
      games: 1,
      name,
      description,
      provisionItemKey: 'credits',
    });
    if (!result.success) {
      throw new PlatformError(PlatformErrorCode.UNKNOWN_ERROR, result.error || 'Platform set pack failed');
    }
    getGameConfigService().invalidateCache();
    return {
      success: true,
      message: `Single game price updated successfully to $${(body.priceUsdCents / 100).toFixed(2)}`,
      digest: result.digest,
    };
  });
