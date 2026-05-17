// ==========================================
// Public Milestone Definitions API Route
// Uses platform api/aquifer/definitions (via platformMilestonesClient).
// Definitions are cached in @/lib/cache/public-nonuser-data-cache (shared with bootstrap + AchievementService).
// Use ?clearCache=true when definitions are updated (e.g. admin).

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler } from '@/lib/api/api-handler';
import { PlatformError, PlatformErrorCode } from '@/lib/services/platform/errors/platform-errors';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import {
  getOrLoadNormalizedMilestoneDefinitions,
  invalidateMilestoneDefinitionsPublicCache,
} from '@/lib/cache/public-nonuser-data-cache';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const GET = withApiHandler(async (request: NextRequest) => {
  const url = new URL(request.url);
  const clearCache = url.searchParams.get('clearCache') === 'true';
  if (clearCache) {
    invalidateMilestoneDefinitionsPublicCache();
  }

  const msg = 'Milestone definitions temporarily unavailable. Please try again later.';
  try {
    const definitions = await getOrLoadNormalizedMilestoneDefinitions(request, {
      forceRefresh: clearCache,
    });
    PlatformLogger.debug(
      clearCache
        ? 'Milestone definitions reloaded after cache clear'
        : 'Milestone definitions from public cache / platform'
    );
    return {
      success: true,
      definitions,
      fullDefinitions: definitions,
      cacheCleared: clearCache,
    };
  } catch (e) {
    if (e instanceof PlatformError) throw e;
    PlatformLogger.warn('Platform milestone definitions failed', { error: String(e) });
    throw new PlatformError(PlatformErrorCode.PLATFORM_ERROR, msg);
  }
});
