// ==========================================
// GET /api/game-config payload — shared for route, public cache, and menu bootstrap.
// ==========================================

import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { fetchPlatformAppConfig, isPlatformAppConfigEnabled } from '@/lib/services/platform/app-config/platform-app-config';

export async function loadGameConfigApiResponse(): Promise<Record<string, unknown>> {
  if (!isPlatformAppConfigEnabled()) {
    return {
      success: false,
      error:
        'Game config requires platform in Corridor mode. Set a platform URL (API_BASE_URL or PLATFORM_BACKEND_URL or PLATFORM_APP_CONFIG_URL) and CORRIDOR_CAPABILITY_OBJECT_ID_TESTNET (or _MAINNET).',
    };
  }
  const platformConfig = await fetchPlatformAppConfig();
  if (!platformConfig) {
    return {
      success: false,
      error: 'Game config temporarily unavailable. Please try again later.',
    };
  }
  PlatformLogger.debug('Game config from platform', {
    stockroomSkuCount: Object.keys(platformConfig.stockroomOffers ?? {}).length,
    platformDebug: platformConfig.platformDebug,
  });
  const response: Record<string, unknown> = {
    success: true,
    config: {
      storeSkus: platformConfig.stockroomOffers ?? {},
      version: Object.keys(platformConfig.stockroomOffers ?? {}).length > 0 ? 1 : 0,
      ...(Array.isArray(platformConfig.packs) && platformConfig.packs.length > 0 && { packs: platformConfig.packs }),
      ...(Array.isArray(platformConfig.ticketBundles) &&
        platformConfig.ticketBundles.length > 0 && { ticketBundles: platformConfig.ticketBundles }),
      ...(platformConfig.minTokenBalance !== undefined && { minTokenBalance: platformConfig.minTokenBalance }),
      ...(platformConfig.badgeConfig && { badgeConfig: platformConfig.badgeConfig }),
      ...(platformConfig.tournamentCreationFeeUsdCents !== undefined && {
        tournamentCreationFeeUsdCents: platformConfig.tournamentCreationFeeUsdCents,
      }),
      ...(platformConfig.tournamentCreationFeeToken !== undefined && {
        tournamentCreationFeeToken: platformConfig.tournamentCreationFeeToken,
      }),
      ...(platformConfig.tournamentCreationFeeTokenAmount !== undefined && {
        tournamentCreationFeeTokenAmount: platformConfig.tournamentCreationFeeTokenAmount,
      }),
      configSource: platformConfig.configSource,
    },
  };
  if (platformConfig.platformDebug) response.platformDebug = platformConfig.platformDebug;
  return response;
}
