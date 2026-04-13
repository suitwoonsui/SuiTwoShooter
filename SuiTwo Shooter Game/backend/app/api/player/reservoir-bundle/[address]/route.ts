// ==========================================
// GET /api/player/reservoir-bundle/[address]
// One round-trip from browser: parallel platform reservoir + ticket-units + holdings
// (credits, tournament tickets, store inventory). Use for store open or prefetch.
// ==========================================

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler, getAddressParam } from '@/lib/api/api-handler';
import {
  buildPlatformCallOptions,
  fetchReservoirBundleFromPlatform,
  mergeTicketUnitsIntoReservoirStatus,
} from '@/lib/services/platform/client/platform-client';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000000000000000000000000000';

type ReservoirBundleResponse = {
  success: true;
  gamePass: {
    success: true;
    hasPass: boolean;
    gamesRemaining: number;
    isActive: boolean;
    packType?: number;
    ticketCount: number;
  };
  inventory: Record<string, number>;
};

type CacheEntry = { at: number; data: ReservoirBundleResponse };

function readTtlMs(envName: string, fallback: number): number {
  const raw = process.env[envName];
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// Player inventory + pass status can change, but not multiple times per second.
// Cache on the game side to avoid repeated platform/chain reads during menu/store flows.
const PLAYER_RESERVOIR_BUNDLE_TTL_MS = readTtlMs('PLAYER_RESERVOIR_BUNDLE_CACHE_TTL_MS', 30_000);
const bundleCacheByKey = new Map<string, CacheEntry>();
const bundleInFlightByKey = new Map<string, Promise<ReservoirBundleResponse>>();

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export const GET = withApiHandler(
  async (request: NextRequest, context: { params: Promise<{ address: string }> }) => {
    const address = await getAddressParam(context.params);
    if (address === ZERO_ADDRESS || address?.toLowerCase() === ZERO_ADDRESS) {
      return {
        success: true,
        gamePass: {
          success: true,
          hasPass: false,
          gamesRemaining: 0,
          isActive: false,
          ticketCount: 0,
        },
        inventory: {},
      };
    }

    const contract = new URL(request.url).searchParams.get('contract') || 'new';
    const url = new URL(request.url);
    const forceRefresh = url.searchParams.has('_refresh');
    const platformOptions = buildPlatformCallOptions(request, undefined, { contract });
    const capKey = (platformOptions.corridorCapabilityObjectId || '').trim();
    const cacheKey = `${address.toLowerCase()}|${contract}|${capKey}`;

    if (forceRefresh) {
      bundleCacheByKey.delete(cacheKey);
      bundleInFlightByKey.delete(cacheKey);
    } else {
      const hit = bundleCacheByKey.get(cacheKey);
      if (hit && Date.now() - hit.at < PLAYER_RESERVOIR_BUNDLE_TTL_MS) {
        return hit.data;
      }
      const inflight = bundleInFlightByKey.get(cacheKey);
      if (inflight) return inflight;
    }

    const promise = (async (): Promise<ReservoirBundleResponse> => {
      const { reservoir: status, ticketUnits, holdings } = await fetchReservoirBundleFromPlatform(address, {
        ...platformOptions,
        includeHoldings: true,
      });

      if (!status.success) {
        throw new Error(status.error || 'Failed to load reservoir bundle');
      }

      if (status.gamesRemaining === undefined && typeof status.balance === 'number') {
        status.gamesRemaining = status.balance;
      }
      mergeTicketUnitsIntoReservoirStatus(status, ticketUnits);
      if (status.ticketCount === undefined && typeof status.itemCount === 'number') {
        status.ticketCount = status.itemCount;
      }

      const data: ReservoirBundleResponse = {
        success: true,
        gamePass: {
          success: true,
          hasPass: status.hasPass || false,
          gamesRemaining: status.gamesRemaining || 0,
          isActive: status.isActive || false,
          packType: status.packType,
          ticketCount: status.ticketCount || 0,
        },
        inventory: holdings?.success ? holdings.inventory ?? {} : {},
      };
      bundleCacheByKey.set(cacheKey, { at: Date.now(), data });
      return data;
    })().finally(() => {
      bundleInFlightByKey.delete(cacheKey);
    });

    bundleInFlightByKey.set(cacheKey, promise);
    return promise;
  }
);
