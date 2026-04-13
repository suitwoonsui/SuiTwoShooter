// ==========================================
// Badge Query API Route
// ==========================================

import { NextRequest } from 'next/server';
import { getDiscounts } from '@/lib/services/badge/utilities/badge-utilities';
import { getGameConfigService } from '@/lib/services/config/game-config/game-config-service';
import { handleCorsPreflight } from '@/lib/cors';
import { PlatformValidators } from '@/lib/services/platform/validators/platform-validators';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { withApiHandler, getAddressParam } from '@/lib/api/api-handler';
import {
  getHasSoulboundBadge,
  buildPlatformCallOptions,
  badgeConfigToBadgeTierConfig,
  platformGameScoreClient,
} from '@/lib/services/platform/client/platform-client';
import { getBadgeService } from '@/lib/services/badge/core/badge-service';

/**
 * GET /api/badges/[address]
 * Query player's badge information
 * 
 * Query params:
 *   ?contract=new|old  (default: new)
 *   ?includePendingUpgrade=1 — when player has a badge, also run upgrade eligibility (same logic as GET .../check-upgrade) in this request to avoid a second round trip.
 * 
 * Returns:
 * {
 *   success: boolean,
 *   hasBadge: boolean,
 *   badge?: {
 *     badgeId: string,
 *     tier: number,
 *     gamesPlayed: number,
 *     mintDate: number,
 *     lastUpdated: number,
 *     discounts: {
 *       store: number,
 *       gameplay: number
 *     }
 *   }
 * }
 */

// Handle CORS preflight
export async function OPTIONS(
  request: NextRequest,
  context: { params: Promise<{ address: string }> }
) {
  return handleCorsPreflight(request);
}

export const GET = withApiHandler(
  async (
    request: NextRequest,
    context: { params: Promise<{ address: string }> }
  ) => {
    // Extract and validate address parameter
    const playerAddress = await getAddressParam(context.params);
    
    PlatformLogger.debug('Badge query request', { playerAddress });

    // Validate address format using PlatformValidators
    if (!playerAddress) {
      throw new PlatformError(
        PlatformErrorCode.INVALID_ADDRESS,
        'Address parameter is required'
      );
    }
    PlatformValidators.validateAddress(playerAddress);

    // Shipyard: only Corridor + API key; platform derives ecosystem/app from the cap
    const platformOptions = buildPlatformCallOptions(request, undefined);
    let platformResult: Awaited<ReturnType<typeof getHasSoulboundBadge>>;
    try {
      platformResult = await getHasSoulboundBadge(playerAddress, platformOptions);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('BADGE_COLLECTION_NAME') || msg.includes('required') || msg.includes('env')) {
        PlatformLogger.warn('Badge config missing (e.g. BADGE_COLLECTION_NAME); returning hasBadge: false', { playerAddress });
        return { success: true, hasBadge: false };
      }
      throw err;
    }
    if (!platformResult.success) {
      const errMsg = platformResult.error ?? '';
      if (errMsg.includes('BADGE_COLLECTION_NAME') || errMsg.includes('required') || errMsg.includes('env') || errMsg.includes('500')) {
        PlatformLogger.warn('Badge config/platform error; returning hasBadge: false', { playerAddress, error: errMsg });
        return { success: true, hasBadge: false };
      }
      throw new PlatformError(
        PlatformErrorCode.UNKNOWN_ERROR,
        errMsg || 'Failed to check badge from platform'
      );
    }
    const hasBadge = platformResult.hasBadge ?? false;
    PlatformLogger.debug('hasBadge from platform', { hasBadge, playerAddress, badgeId: platformResult.badgeId });

    if (!hasBadge) {
      return { success: true, hasBadge: false };
    }

    const includePu =
      request.nextUrl.searchParams.get('includePendingUpgrade') === '1' ||
      request.nextUrl.searchParams.get('includePendingUpgrade') === 'true';

    const badgeService = getBadgeService();
    const platformBadgeId = (platformResult.badgeId || '').trim();
    // Parallel: game config, Sonar tier (reuse Shipyard badgeId), and — when upgrade check is needed — Hydroscope games (no duplicate inside checkBadgeUpgrade).
    const statsOptions = { ...platformOptions };
    const [gameConfigRes, chainBadge, hydroscopeStats] = await Promise.all([
      getGameConfigService().getConfig(),
      badgeService.getBadge(
        playerAddress,
        platformBadgeId
          ? {
              shipyardResult: {
                success: platformResult.success,
                hasBadge: platformResult.hasBadge === true,
                badgeId: platformBadgeId,
              },
            }
          : undefined
      ),
      includePu
        ? platformGameScoreClient.getPlayerStats(playerAddress, statsOptions).catch((err) => {
            PlatformLogger.warn('Hydroscope stats fetch failed; upgrade check will retry stats internally', {
              playerAddress,
              error: err instanceof Error ? err.message : String(err),
            });
            return null;
          })
        : Promise.resolve(null),
    ]);
    const badgeConfig = gameConfigRes.config?.badgeConfig;

    if (!chainBadge?.badgeId) {
      PlatformLogger.warn('hasBadge from platform but could not resolve chain badge row', { playerAddress });
      return { success: true, hasBadge: false };
    }

    const badgeId = (platformResult.badgeId || chainBadge.badgeId).trim();
    let tier = Number.isFinite(chainBadge.tier) ? chainBadge.tier : 0;
    let discounts = getDiscounts(tier, badgeConfig);

    if (!includePu) {
      return {
        success: true as const,
        hasBadge: true as const,
        badge: {
          badgeId,
          tier,
          gamesPlayed: chainBadge?.gamesPlayed ?? 0,
          mintDate: chainBadge?.mintDate ?? 0,
          lastUpdated: chainBadge?.lastUpdated ?? 0,
          discounts,
        },
      };
    }

    const totalGamesHint =
      hydroscopeStats && hydroscopeStats.success === true && typeof hydroscopeStats.totalGames === 'number'
        ? hydroscopeStats.totalGames
        : undefined;

    const upgrade = await badgeService.checkBadgeUpgrade(playerAddress, {
      preloadedBadgeRow: { badgeId, tier },
      preloadedBadgeTierConfig: badgeConfigToBadgeTierConfig(badgeConfig),
      ...(totalGamesHint !== undefined ? { totalGames: totalGamesHint } : {}),
    });
    const tierForBody = upgrade.currentTier ?? tier;
    discounts = getDiscounts(tierForBody, badgeConfig);
    const base = {
      success: true as const,
      hasBadge: true as const,
      badge: {
        badgeId,
        tier: tierForBody,
        gamesPlayed: chainBadge?.gamesPlayed ?? 0,
        mintDate: chainBadge?.mintDate ?? 0,
        lastUpdated: chainBadge?.lastUpdated ?? 0,
        discounts,
      },
    };

    return {
      ...base,
      pendingUpgrade: {
        success: upgrade.success,
        hasPendingUpgrade: upgrade.hasPendingUpgrade,
        newTier: upgrade.newTier,
        badgeId: upgrade.badgeId,
        ...(upgrade.error ? { error: upgrade.error } : {}),
      },
    };
  },
  {
    logRequest: true,
  }
);
