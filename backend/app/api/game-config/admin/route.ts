// ==========================================
// Game Config Admin API - Update game configuration on-chain
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { verifyApiKey, getAdminIdentifier } from '@/lib/auth';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { withApiHandler, getRequestBody } from '@/lib/api/api-handler';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { getGameConfigService, GAME_CONFIG_NOT_INITIALIZED_MESSAGE } from '@/lib/services/config/game-config/game-config-service';
import type { BadgeConfig } from '@/lib/services/config/game-config/game-config-service';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';
import { getConfig } from '@/config/config';
import { isPlatformAppConfigEnabled, platformSetPack, platformSetConfigKey, platformSetBadgeDiscountsThresholds, platformSetBadgeMintingFee, platformSetTournamentCreationFee } from '@/lib/services/platform/app-config/platform-app-config';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * GET /api/game-config/admin
 * Get current game config (same as public endpoint, but with admin context)
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
      config: result.config,
    };
  }
);

/**
 * PUT /api/game-config/admin/pack
 * Update pack configuration on-chain
 * 
 * Request body:
 * {
 *   packType: number (0 = single game, 1-4 = credit packs),
 *   priceUsdCents: number,
 *   games: number,
 *   name: string,
 *   description: string,
 *   adminWalletAddress?: string
 * }
 */
export const PUT = withApiHandler(async (req: NextRequest) => {
    throw new PlatformError(
      PlatformErrorCode.INVALID_INPUT,
      'Deprecated: packType-based game-config admin writes are removed. Stockroom is the source of truth. Use Stockroom admin endpoints for pricing.'
    );
    // Require admin authentication
    const hasApiKey = verifyApiKey(req);
    
    const body = await getRequestBody<{
      packType: number;
      priceUsdCents: number;
      games: number;
      name: string;
      description: string;
      adminWalletAddress?: string;
    }>(req);

    // If no API key, verify admin wallet address
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

    // Validate input (0 = single game, 1-4 = credit packs)
    if (typeof body.packType !== 'number' || body.packType < 0 || body.packType > 4) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_INPUT,
        'packType must be 0 (single game) or between 1 and 4'
      );
    }

    if (!body.priceUsdCents || body.priceUsdCents <= 0) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_INPUT,
        'priceUsdCents must be a positive number'
      );
    }

    if (!body.games || body.games <= 0) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_INPUT,
        'games must be a positive number'
      );
    }

    if (!body.name || typeof body.name !== 'string') {
      throw new PlatformError(
        PlatformErrorCode.INVALID_INPUT,
        'name must be a non-empty string'
      );
    }

    if (!body.description || typeof body.description !== 'string') {
      throw new PlatformError(
        PlatformErrorCode.INVALID_INPUT,
        'description must be a non-empty string'
      );
    }

    PlatformLogger.info('Admin pack config update request', {
      adminId,
      packType: body.packType,
      priceUsdCents: body.priceUsdCents,
      games: body.games,
    });

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
    const gameConfigService = getGameConfigService();
    gameConfigService.invalidateCache();
    PlatformLogger.info('Pack config updated via platform (Corridor)', { packType: body.packType, digest: result.digest });
    return {
      success: true,
      message: `Pack ${body.packType} config updated successfully`,
      digest: result.digest,
    };
  });

/**
 * POST /api/game-config/admin/badge-discounts
 * Update badge discount configuration on-chain
 * 
 * Request body:
 * {
 *   storeDiscounts: number[] (6 values: [standard, common, uncommon, rare, epic, legendary]),
 *   gameplayDiscounts: number[] (6 values: [standard, common, uncommon, rare, epic, legendary]),
 *   adminWalletAddress?: string
 * }
 */
export const POST = withApiHandler(async (req: NextRequest) => {
    const hasApiKey = verifyApiKey(req);
    const body = await getRequestBody<{
      type: 'badge-discounts' | 'badge-thresholds' | 'badge-minting-fee' | 'tournament-creation-fee';
      storeDiscounts?: number[];
      gameplayDiscounts?: number[];
      thresholds?: number[];
      mintingFeeUsdCents?: number;
      tournamentCreationFeeUsdCents?: number;
      tournamentCreationFeeMode?: 'usd' | 'token';
      tournamentCreationFeeToken?: 'SUI' | 'MEWS' | 'USDC';
      tournamentCreationFeeTokenAmount?: number;
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

    if (!isPlatformAppConfigEnabled()) {
      throw new PlatformError(
        PlatformErrorCode.CONFIG_MISSING,
        'Badge config uses platform app-config (Corridor). Set PLATFORM_BACKEND_URL (or PLATFORM_APP_CONFIG_URL) and CORRIDOR_CAPABILITY_OBJECT_ID_TESTNET (or _MAINNET) in game backend config/contracts.<network>.json.'
      );
    }

    const gameConfigService = getGameConfigService();
    const current = await gameConfigService.getConfig();
    const existingBadge: BadgeConfig = current.success && current.config?.badgeConfig
      ? current.config.badgeConfig
      : {
          storeDiscounts: [0, 5, 10, 15, 20, 25],
          gameplayDiscounts: [0, 0, 5, 10, 15, 20],
          thresholds: [5, 15, 35, 75, 150],
          version: 1,
        };

    let merged: BadgeConfig = { ...existingBadge };

    if (body.type === 'badge-discounts') {
      if (!body.storeDiscounts || !body.gameplayDiscounts) {
        throw new PlatformError(
          PlatformErrorCode.INVALID_INPUT,
          'storeDiscounts and gameplayDiscounts are required'
        );
      }
      if (body.storeDiscounts.length !== 6 || body.gameplayDiscounts.length !== 6) {
        throw new PlatformError(
          PlatformErrorCode.INVALID_INPUT,
          'Discount arrays must have exactly 6 values'
        );
      }
      merged = { ...merged, storeDiscounts: body.storeDiscounts, gameplayDiscounts: body.gameplayDiscounts };
    } else if (body.type === 'badge-thresholds') {
      if (!body.thresholds || body.thresholds.length !== 5) {
        throw new PlatformError(
          PlatformErrorCode.INVALID_INPUT,
          'thresholds must be an array of 5 values'
        );
      }
      merged = { ...merged, thresholds: body.thresholds };
    } else if (body.type === 'badge-minting-fee') {
      if (!body.mintingFeeUsdCents || body.mintingFeeUsdCents <= 0) {
        throw new PlatformError(
          PlatformErrorCode.INVALID_INPUT,
          'mintingFeeUsdCents must be a positive number'
        );
      }
      merged = { ...merged, mintingFeeUsdCents: body.mintingFeeUsdCents };
    } else if (body.type !== 'tournament-creation-fee') {
      throw new PlatformError(
        PlatformErrorCode.INVALID_INPUT,
        'Invalid type. Must be badge-discounts, badge-thresholds, badge-minting-fee, or tournament-creation-fee'
      );
    }

    let result: { success: boolean; digest?: string; error?: string };
    if (body.type === 'tournament-creation-fee') {
      const mode = body.tournamentCreationFeeMode === 'token' ? 'token' : 'usd';
      if (mode === 'token') {
        const token = body.tournamentCreationFeeToken;
        const tokenAmount = body.tournamentCreationFeeTokenAmount;
        if (!token || (token !== 'SUI' && token !== 'MEWS' && token !== 'USDC')) {
          throw new PlatformError(
            PlatformErrorCode.INVALID_INPUT,
            'tournamentCreationFeeToken must be one of SUI, MEWS, or USDC'
          );
        }
        if (typeof tokenAmount !== 'number' || tokenAmount < 0) {
          throw new PlatformError(
            PlatformErrorCode.INVALID_INPUT,
            'tournamentCreationFeeTokenAmount must be a non-negative number'
          );
        }
        result = await platformSetTournamentCreationFee({
          mode: 'token',
          tournamentCreationFeeToken: token,
          tournamentCreationFeeTokenAmount: tokenAmount,
        });
      } else {
        if (body.tournamentCreationFeeUsdCents == null || body.tournamentCreationFeeUsdCents < 0) {
          throw new PlatformError(
            PlatformErrorCode.INVALID_INPUT,
            'tournamentCreationFeeUsdCents must be a non-negative number'
          );
        }
        result = await platformSetTournamentCreationFee({
          mode: 'usd',
          tournamentCreationFeeUsdCents: Math.round(body.tournamentCreationFeeUsdCents),
        });
      }
    } else if (body.type === 'badge-minting-fee') {
      const cents = merged.mintingFeeUsdCents ?? body.mintingFeeUsdCents;
      if (typeof cents !== 'number' || cents <= 0) {
        throw new PlatformError(
          PlatformErrorCode.INVALID_INPUT,
          'mintingFeeUsdCents must be a positive number'
        );
      }
      result = await platformSetBadgeMintingFee(cents);
    } else {
      result = await platformSetBadgeDiscountsThresholds({
        storeDiscounts: merged.storeDiscounts,
        gameplayDiscounts: merged.gameplayDiscounts,
        thresholds: merged.thresholds,
        version: merged.version ?? 1,
      });
    }

    if (!result.success) {
      PlatformLogger.error('Failed to update badge config on platform', { error: result.error, type: body.type });
      throw new PlatformError(PlatformErrorCode.UNKNOWN_ERROR, result.error || 'Failed to set badge config on platform.');
    }

    gameConfigService.invalidateCache();
    PlatformLogger.info('Game config updated (badge or tournament creation fee)', { type: body.type, digest: result.digest });

    return {
      success: true,
      message: body.type === 'tournament-creation-fee' ? 'Tournament creation fee updated successfully' : `Badge ${body.type} updated successfully`,
      digest: result.digest,
    };
  });
