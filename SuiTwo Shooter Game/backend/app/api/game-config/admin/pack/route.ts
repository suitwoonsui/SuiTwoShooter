// ==========================================
// Game Config Admin API - Add or remove pack (Corridor only: platform Helm)
// ==========================================
// POST: Add a credit pack (packType 0-9)
// DELETE: Remove a pack by packType (query: packType=)

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { verifyApiKey } from '@/lib/auth';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { getGameConfigService } from '@/lib/services/config/game-config/game-config-service';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { isPlatformAppConfigEnabled, platformSetPack, platformRemovePack } from '@/lib/services/platform/app-config/platform-app-config';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/** POST: Add a credit pack (pack_type 0-9). Uses platform when PLATFORM_APP_CONFIG_URL is set. */
export const POST = withApiHandler(async (req: NextRequest) => {
    throw new PlatformError(
      PlatformErrorCode.INVALID_INPUT,
      'Deprecated: packType-based packs are removed. Stockroom is the source of truth. Use Stockroom admin endpoints (item listing / bundle offer) instead.'
    );
    const hasApiKey = verifyApiKey(req);
    const body = await getRequestBody<{
      packType: number;
      priceUsdCents: number;
      games: number;
      name: string;
      description: string;
      adminWalletAddress?: string;
    }>(req);

    if (!hasApiKey) {
      const adminWallet = getAdminWalletService();
      const expected = adminWallet.getAddress().toLowerCase();
      const provided = body.adminWalletAddress?.toLowerCase();
      if (!provided || provided !== expected) {
        throw new PlatformError(PlatformErrorCode.UNAUTHORIZED, 'Unauthorized. Admin wallet or API key required.');
      }
    }

    if (body.packType < 0 || body.packType > 9) {
      throw new PlatformError(PlatformErrorCode.INVALID_INPUT, 'packType must be 0-9 for credit packs.');
    }
    if (!body.priceUsdCents || body.priceUsdCents <= 0) {
      throw new PlatformError(PlatformErrorCode.INVALID_INPUT, 'priceUsdCents must be a positive number.');
    }
    if (!body.games || body.games <= 0) {
      throw new PlatformError(PlatformErrorCode.INVALID_INPUT, 'games must be a positive number.');
    }
    if (!body.name || typeof body.name !== 'string') {
      throw new PlatformError(PlatformErrorCode.INVALID_INPUT, 'name must be a non-empty string.');
    }
    if (typeof body.description !== 'string') {
      throw new PlatformError(PlatformErrorCode.INVALID_INPUT, 'description must be a string.');
    }

    if (!isPlatformAppConfigEnabled()) {
      throw new PlatformError(
        PlatformErrorCode.CONFIG_MISSING,
        'Pack config uses Corridor only (platform Helm). Set PLATFORM_APP_CONFIG_URL (or PLATFORM_BACKEND_URL) and CORRIDOR_CAPABILITY_OBJECT_ID_TESTNET (or _MAINNET) in game backend config/contracts.<network>.json.'
      );
    }

    const result = await platformSetPack({
      packType: body.packType,
      priceUsdCents: body.priceUsdCents,
      games: body.games,
      name: body.name,
      description: body.description,
      provisionItemKey: 'credits',
    });
    if (!result.success) {
      throw new PlatformError(PlatformErrorCode.UNKNOWN_ERROR, result.error || 'Platform set pack failed');
    }
    getGameConfigService().invalidateCache();
    PlatformLogger.info('Credit pack added via platform (Corridor)', { packType: body.packType, digest: result.digest });
    return {
      success: true,
      message: `Credit pack (type ${body.packType}) added.`,
      digest: result.digest,
    };
  });

/** DELETE: Remove a pack by packType (0-9 credit, 10+ ticket bundle). Uses platform when enabled. Query: packType= */
export const DELETE = withApiHandler(async (req: NextRequest) => {
    throw new PlatformError(
      PlatformErrorCode.INVALID_INPUT,
      'Deprecated: packType-based packs are removed. Stockroom is the source of truth. Remove SKUs via Stockroom admin endpoints instead.'
    );
    const hasApiKey = verifyApiKey(req);
    const { searchParams } = new URL(req.url);
    const packTypeParam = searchParams.get('packType');
    const packType = parseInt(packTypeParam ?? '', 10);
    const adminWalletAddress = searchParams.get('adminWalletAddress');

    if (!hasApiKey) {
      const adminWallet = getAdminWalletService();
      const expected = adminWallet.getAddress().toLowerCase();
      const provided = adminWalletAddress?.toLowerCase();
      if (!provided || provided !== expected) {
        throw new PlatformError(PlatformErrorCode.UNAUTHORIZED, 'Unauthorized. Admin wallet or API key required.');
      }
    }

    if (Number.isNaN(packType) || packType < 0 || packType > 255) {
      throw new PlatformError(PlatformErrorCode.INVALID_INPUT, 'Query packType must be a number 0-255.');
    }

    if (!isPlatformAppConfigEnabled()) {
      throw new PlatformError(
        PlatformErrorCode.CONFIG_MISSING,
        'Pack config uses Corridor only (platform Helm). Set PLATFORM_APP_CONFIG_URL (or PLATFORM_BACKEND_URL) and CORRIDOR_CAPABILITY_OBJECT_ID_TESTNET (or _MAINNET) in game backend config/contracts.<network>.json.'
      );
    }

    const result = await platformRemovePack(packType);
    if (!result.success) {
      throw new PlatformError(PlatformErrorCode.UNKNOWN_ERROR, result.error || 'Platform remove pack failed');
    }
    getGameConfigService().invalidateCache();
    PlatformLogger.info('Pack removed via platform (Corridor)', { packType, digest: result.digest });
    return {
      success: true,
      message: `Pack type ${packType} removed.`,
      digest: result.digest,
    };
  });
