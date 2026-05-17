// ==========================================
// Game Config Admin API - Tournament Ticket Bundle (Corridor only: platform Helm)
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { verifyApiKey, getAdminIdentifier } from '@/lib/auth';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { getGameConfigService } from '@/lib/services/config/game-config/game-config-service';
import { isPlatformAppConfigEnabled, platformSetPack, fetchPlatformAppConfig } from '@/lib/services/platform/app-config/platform-app-config';

function resolvedTicketPackType(packType: number | undefined, quantity: number): number {
  if (typeof packType === 'number' && packType >= 10) return packType;
  return 10 + quantity;
}

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * POST /api/game-config/admin/ticket-bundle
 * Add a new tournament ticket bundle (assigns next available pack_type >= 10).
 */
export const POST = withApiHandler(async (req: NextRequest) => {
    throw new PlatformError(
      PlatformErrorCode.INVALID_INPUT,
      'Deprecated: packType-based ticket bundles are removed. Stockroom is the source of truth. Use Stockroom bundle offers (offers table, type 1) instead.'
    );
    const hasApiKey = verifyApiKey(req);
    const body = await getRequestBody<{
      quantity: number;
      priceUsdCents: number;
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

    if (!body.quantity || body.quantity <= 0) {
      throw new PlatformError(PlatformErrorCode.INVALID_INPUT, 'quantity must be a positive number');
    }
    if (!body.priceUsdCents || body.priceUsdCents <= 0) {
      throw new PlatformError(PlatformErrorCode.INVALID_INPUT, 'priceUsdCents must be a positive number');
    }
    if (!body.name || typeof body.name !== 'string') {
      throw new PlatformError(PlatformErrorCode.INVALID_INPUT, 'name must be a non-empty string');
    }
    if (typeof body.description !== 'string') {
      throw new PlatformError(PlatformErrorCode.INVALID_INPUT, 'description must be a string');
    }

    if (!isPlatformAppConfigEnabled()) {
      throw new PlatformError(
        PlatformErrorCode.CONFIG_MISSING,
        'Ticket bundle uses Corridor only (platform Helm). Set PLATFORM_APP_CONFIG_URL (or PLATFORM_BACKEND_URL) and CORRIDOR_CAPABILITY_OBJECT_ID_TESTNET (or _MAINNET) in game backend config/contracts.<network>.json.'
      );
    }

    const platformConfig = await fetchPlatformAppConfig();
    const ticketPackTypes = (platformConfig?.ticketBundles ?? []).map(b => b.packType);
    const nextPackType = ticketPackTypes.length > 0 ? Math.max(...ticketPackTypes) + 1 : 10;
    if (nextPackType > 255) {
      throw new PlatformError(PlatformErrorCode.INVALID_INPUT, 'Maximum number of ticket bundles reached.');
    }
    const result = await platformSetPack({
      packType: nextPackType,
      priceUsdCents: body.priceUsdCents,
      games: body.quantity,
      name: body.name,
      description: body.description,
      provisionItemKey: 'tickets',
    });
    if (!result.success) {
      throw new PlatformError(PlatformErrorCode.UNKNOWN_ERROR, result.error || 'Platform set ticket bundle failed');
    }
    getGameConfigService().invalidateCache();
    PlatformLogger.info('Ticket bundle added via platform (Corridor)', { packType: nextPackType, quantity: body.quantity, digest: result.digest });
    return {
      success: true,
      message: `Ticket bundle (${body.quantity} tickets) added.`,
      digest: result.digest,
      packType: nextPackType,
    };
  });

/**
 * PUT /api/game-config/admin/ticket-bundle
 * Update tournament ticket bundle configuration (pack_type 10+).
 * Send packType when editing an existing bundle so the correct on-chain entry is updated.
 * 
 * Request body:
 * {
 *   packType?: number (required when editing - use value from config),
 *   quantity: number,
 *   priceUsdCents: number,
 *   name: string,
 *   description: string,
 *   adminWalletAddress?: string
 * }
 */
export const PUT = withApiHandler(async (req: NextRequest) => {
    throw new PlatformError(
      PlatformErrorCode.INVALID_INPUT,
      'Deprecated: packType-based ticket bundles are removed. Stockroom is the source of truth. Update SKUs via Stockroom endpoints instead.'
    );
    const hasApiKey = verifyApiKey(req);
    
    const body = await getRequestBody<{
      packType?: number;
      quantity: number;
      priceUsdCents: number;
      name: string;
      description: string;
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
    if (!body.quantity || body.quantity <= 0) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_INPUT,
        'quantity must be a positive number'
      );
    }

    // Use provided packType when editing; otherwise fall back to 10 + quantity for backward compat
    const packType = resolvedTicketPackType(body.packType, body.quantity);

    if (!body.priceUsdCents || body.priceUsdCents <= 0) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_INPUT,
        'priceUsdCents must be a positive number'
      );
    }

    if (!body.name || typeof body.name !== 'string') {
      throw new PlatformError(
        PlatformErrorCode.INVALID_INPUT,
        'name must be a non-empty string'
      );
    }

    PlatformLogger.info('Admin ticket bundle update request', {
      adminId,
      quantity: body.quantity,
      packType,
      priceUsdCents: body.priceUsdCents,
    });

    if (!isPlatformAppConfigEnabled()) {
      throw new PlatformError(
        PlatformErrorCode.CONFIG_MISSING,
        'Ticket bundle uses Corridor only (platform Helm). Set PLATFORM_APP_CONFIG_URL (or PLATFORM_BACKEND_URL) and CORRIDOR_CAPABILITY_OBJECT_ID_TESTNET (or _MAINNET) in game backend config/contracts.<network>.json.'
      );
    }

    const result = await platformSetPack({
      packType,
      priceUsdCents: body.priceUsdCents,
      games: body.quantity,
      name: body.name,
      description: body.description,
      provisionItemKey: 'tickets',
    });
    if (!result.success) {
      throw new PlatformError(PlatformErrorCode.UNKNOWN_ERROR, result.error || 'Platform update ticket bundle failed');
    }
    const gameConfigService = getGameConfigService();
    gameConfigService.invalidateCache();
    PlatformLogger.info('Ticket bundle config updated via platform (Corridor)', { quantity: body.quantity, digest: result.digest });
    return {
      success: true,
      message: `Ticket bundle ${body.quantity} updated successfully`,
      digest: result.digest,
    };
  });
