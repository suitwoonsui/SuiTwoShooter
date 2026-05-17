import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler } from '@/lib/api/api-handler';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
import { getPlatformBackendUrl } from '@/lib/services/platform/client/platform-client';
import {
  getOrLoadStoreCatalogPayload,
  getOrLoadTournamentsPublicList,
  getOrLoadGameConfigResponse,
  getOrLoadNormalizedMilestoneDefinitions,
  getOrLoadLeaderboardResponse,
  getPublicBootstrapCacheDiagnostics,
  PUBLIC_LEADERBOARD_BOOTSTRAP_LIMIT,
} from '@/lib/cache/public-nonuser-data-cache';

let bootstrapInFlight: Promise<Record<string, unknown>> | null = null;

async function loadBootstrapSlice<T>(
  label: string,
  loader: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await loader();
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    PlatformLogger.error(`[BOOTSTRAP] ${label} load failed`, { message });
    return fallback;
  }
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const GET = withApiHandler(
  async (_request: NextRequest) => {
    if (bootstrapInFlight) {
      return bootstrapInFlight;
    }

    bootstrapInFlight = (async () => {
      const {
        storeServedFromCache,
        tournamentsServedFromCache,
        gameConfigServedFromCache,
        milestonesServedFromCache,
        leaderboardServedFromCache,
      } = getPublicBootstrapCacheDiagnostics();

      const [
        storeData,
        tournamentsData,
        gameConfigData,
        normalizedMilestones,
        leaderboardData,
      ] = await Promise.all([
        loadBootstrapSlice('store', () => getOrLoadStoreCatalogPayload(), {
          success: false,
          error: 'Store catalog unavailable',
        } as Record<string, unknown>),
        loadBootstrapSlice('tournaments', () => getOrLoadTournamentsPublicList('activeAndUpcoming'), {
          success: false,
          tournaments: [],
          error: 'Tournaments unavailable',
        } as { success: boolean; tournaments: unknown[]; error?: string }),
        loadBootstrapSlice('gameConfig', () => getOrLoadGameConfigResponse(), {
          success: false,
          error: 'Game config unavailable',
        } as Record<string, unknown>),
        loadBootstrapSlice('milestones', () => getOrLoadNormalizedMilestoneDefinitions(undefined), {}),
        loadBootstrapSlice(
          'leaderboard',
          () =>
            getOrLoadLeaderboardResponse({
              limit: PUBLIC_LEADERBOARD_BOOTSTRAP_LIMIT,
              useMock: false,
            }),
          { success: false, error: 'Leaderboard unavailable' } as Record<string, unknown>
        ),
      ]);

      const milestonesData = {
        success: true,
        definitions: normalizedMilestones,
        fullDefinitions: normalizedMilestones,
        cacheCleared: false,
      };

      let tournamentsPayload = tournamentsData;
      if (
        storeData &&
        (storeData as { success?: boolean }).success === true &&
        (!tournamentsPayload || tournamentsPayload.success !== true)
      ) {
        PlatformLogger.warn('[BOOTSTRAP] Tournaments fetch did not succeed; using empty list so menu is not blocked', {
          hadPayload: tournamentsPayload != null,
        });
        tournamentsPayload = { success: true, tournaments: [] };
      }

      const blocking = {
        store: Boolean((storeData as { success?: boolean } | null)?.success),
        tournaments: Boolean(tournamentsPayload?.success),
      };
      const nonBlocking = {
        milestones: Boolean((milestonesData as { success?: boolean }).success),
        leaderboard: Boolean((leaderboardData as { success?: boolean }).success),
        gameConfig: Boolean((gameConfigData as { success?: boolean }).success),
      };
      const ready = blocking.store && blocking.tournaments;

      PlatformLogger.info('[BOOTSTRAP] Menu bootstrap collected', {
        platformBackendUrl: getPlatformBackendUrl() || '(unset)',
        milestonesOk: nonBlocking.milestones,
        storeOk: blocking.store,
        tournamentsOk: blocking.tournaments,
        leaderboardOk: nonBlocking.leaderboard,
        gameConfigOk: nonBlocking.gameConfig,
        ready,
        storeError: blocking.store ? undefined : (storeData as { error?: string })?.error,
        storeServedFromCache,
        tournamentsServedFromCache,
        gameConfigServedFromCache,
        milestonesServedFromCache,
        leaderboardServedFromCache,
      });

      const storeError =
        blocking.store ? undefined : String((storeData as { error?: string })?.error || 'Store catalog unavailable');
      const tournamentsError =
        blocking.tournaments
          ? undefined
          : String((tournamentsPayload as { error?: string })?.error || 'Tournaments unavailable');

      return {
        success: true,
        ready,
        readiness: {
          blocking,
          nonBlocking,
          errors: {
            store: storeError,
            tournaments: tournamentsError,
          },
        },
        milestones: milestonesData,
        store: storeData,
        tournaments: tournamentsPayload,
        leaderboard: leaderboardData,
        gameConfig: gameConfigData,
      };
    })();

    try {
      return await bootstrapInFlight;
    } finally {
      bootstrapInFlight = null;
    }
  },
  { logRequest: false }
);
