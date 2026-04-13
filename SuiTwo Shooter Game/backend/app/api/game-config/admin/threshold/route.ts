// ==========================================
// Game Config Admin API - Update Game Play Threshold (Corridor platform only)
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { verifyApiKey, getAdminIdentifier } from '@/lib/auth';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { getGameConfigService, GAME_CONFIG_NOT_INITIALIZED_MESSAGE } from '@/lib/services/config/game-config/game-config-service';
import { isPlatformAppConfigEnabled, platformSetMinTokenBalance } from '@/lib/services/platform/app-config/platform-app-config';
import { getMEWSDecimals } from '@/lib/services/payments/converter/price-converter';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * GET /api/game-config/admin/threshold
 * Get current game play threshold from on-chain config. Fails if game config not initialized on-chain.
 */
export const GET = withApiHandler(
  async (request: NextRequest) => {
    const gameConfigService = getGameConfigService();
    const result = await gameConfigService.getConfig();

    if (!result.success) {
      const isNotInitialized = result.error === GAME_CONFIG_NOT_INITIALIZED_MESSAGE;
      throw new PlatformError(
        isNotInitialized ? PlatformErrorCode.CONFIG_MISSING : PlatformErrorCode.UNKNOWN_ERROR,
        result.error || 'Failed to load game config'
      );
    }

    return {
      success: true,
      configured: true,
      minTokenBalance: result.config?.minTokenBalance ?? 0,
    };
  }
);

/**
 * PUT /api/game-config/admin/threshold
 * Update game play threshold via platform app-config (Corridor only). Key: minTokenBalance.
 *
 * Request body:
 * {
 *   minTokenBalance: number (in smallest unit with 6 decimals for mainnet, 9 for testnet),
 *   adminWalletAddress?: string
 * }
 */
export const PUT = withApiHandler(async (req: NextRequest) => {
    if (!isPlatformAppConfigEnabled()) {
      throw new PlatformError(
        PlatformErrorCode.CONFIG_MISSING,
        'Platform app-config required (Corridor). Set PLATFORM_APP_CONFIG_URL (or PLATFORM_BACKEND_URL) and CORRIDOR_CAPABILITY_OBJECT_ID_TESTNET (or _MAINNET) in game backend config/contracts.<network>.json.'
      );
    }

    const hasApiKey = verifyApiKey(req);
    const body = await getRequestBody<{
      minTokenBalance: number;
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

    if (typeof body.minTokenBalance !== 'number' || body.minTokenBalance < 0) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_INPUT,
        'minTokenBalance must be a non-negative number'
      );
    }

    const mewsDecimals = getMEWSDecimals();
    const divisor = Math.pow(10, mewsDecimals);
    PlatformLogger.info('Admin threshold update (Corridor platform)', {
      adminId: getAdminIdentifier(req),
      minTokenBalance: body.minTokenBalance,
      formatted: `${(body.minTokenBalance / divisor).toLocaleString()} $MEWS`,
    });

    const result = await platformSetMinTokenBalance(body.minTokenBalance);
    if (!result.success) {
      throw new PlatformError(
        PlatformErrorCode.UNKNOWN_ERROR,
        result.error || 'Failed to update min token balance'
      );
    }

    const gameConfigService = getGameConfigService();
    gameConfigService.invalidateCache();

    return {
      success: true,
      message: `Min token balance updated successfully to ${(body.minTokenBalance / divisor).toLocaleString()} $MEWS`,
      digest: result.digest,
      minTokenBalance: body.minTokenBalance,
    };
  });
