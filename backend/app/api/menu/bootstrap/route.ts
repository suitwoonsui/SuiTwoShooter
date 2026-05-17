import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler } from '@/lib/api/api-handler';
import { PlatformLogger } from '@/lib/services/platform/logging/platform-logger';
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
        getOrLoadStoreCatalogPayload() as Promise<Record<string, unknown>>,
        getOrLoadTournamentsPublicList('activeAndUpcoming'),
        getOrLoadGameConfigResponse(),
        getOrLoadNormalizedMilestoneDefinitions(undefined),
        getOrLoadLeaderboardResponse({
          limit: PUBLIC_LEADERBOARD_BOOTSTRAP_LIMIT,
          useMock: false,
        }),
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
        milestonesOk: nonBlocking.milestones,
        storeOk: blocking.store,
        tournamentsOk: blocking.tournaments,
        leaderboardOk: nonBlocking.leaderboard,
        gameConfigOk: nonBlocking.gameConfig,
        ready,
        storeServedFromCache,
        tournamentsServedFromCache,
        gameConfigServedFromCache,
        milestonesServedFromCache,
        leaderboardServedFromCache,
      });

      return {
        success: true,
        ready,
        readiness: {
          blocking,
          nonBlocking,
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
