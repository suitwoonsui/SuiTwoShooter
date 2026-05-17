// ==========================================
// API - Get Achievement Progress
// ==========================================
// Returns player stats, claimed milestones, and eligible (claimable) milestones

import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { withApiHandler } from '@/lib/api/api-handler';
import { getAchievementService } from '@/lib/services/achievements/core/achievement-service';
import { buildPlatformCallOptions, invalidatePlayerStatsCacheForAddress } from '@/lib/services/platform/client/platform-client';
import { getClaimedMilestoneIdsFromAnchorWithDebug } from '@/lib/services/achievements/milestones/milestones-service';
import { getAdminWalletService } from '@/lib/services/wallet/admin/admin-wallet-service';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

const EMPTY_STATS = {
  totalGames: 0,
  bestScore: 0,
  bestDistance: 0,
  bestCoins: 0,
  bestBossesDefeated: 0,
  bestEnemiesDefeated: 0,
  bestCoinStreak: 0,
  totalScore: 0,
  totalDistance: 0,
  totalCoins: 0,
  totalBossesDefeated: 0,
  totalEnemiesDefeated: 0,
};

const progressInflightByAddress = new Map<string, Promise<any>>();
const progressCacheByAddress = new Map<string, { at: number; value: any }>();
const PROGRESS_CACHE_TTL_MS = 15_000;

export const GET = withApiHandler(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const playerAddress = searchParams.get('address');
    const debug = searchParams.get('debug') === '1';
    const refresh = searchParams.get('refresh') === '1' || searchParams.get('refresh') === 'true';

    if (!playerAddress) {
      throw new Error('Player address is required');
    }

    const achievementService = getAchievementService();
    const platformOptions = buildPlatformCallOptions(request, undefined);

    // Avoid caching debug responses (they do extra work and are not used in hot paths).
    const cacheKey = playerAddress.toLowerCase();
    if (!debug && !refresh) {
      const cached = progressCacheByAddress.get(cacheKey);
      if (cached && Date.now() - cached.at < PROGRESS_CACHE_TTL_MS) {
        return cached.value;
      }
      const inflight = progressInflightByAddress.get(cacheKey);
      if (inflight) {
        return await inflight;
      }
    }

    if (refresh && !debug) {
      // Explicit refresh semantics:
      // - clear per-player claimed milestone ids (Wake marks) cache
      // - clear per-player stats cache (Hydroscope aggregates) so progress can reflect newest data
      achievementService.clearClaimedMilestonesCache(playerAddress);
      invalidatePlayerStatsCacheForAddress(playerAddress);
    }

    const run = async () => {
      const statsResult = await achievementService.getPlayerStats(playerAddress, platformOptions);
      const claimedIdsResult = debug
        ? null
        : await achievementService.getClaimedMilestoneIds(playerAddress);

      if (!statsResult.success || !statsResult.stats) {
        return {
          success: true,
          stats: EMPTY_STATS,
          claimedIds: [],
          eligible: [],
          eligibleCount: 0,
        };
      }

    let claimedIds: number[] = [];
    let claimsVerified = true;
    let claimsError: string | undefined;
    let debugClaims: any = undefined;

    if (debug) {
      // Use debug variant: show exactly what Anchor claims were fetched and what milestoneIds were derived.
      const adminWallet = getAdminWalletService();
      const result = await getClaimedMilestoneIdsFromAnchorWithDebug(playerAddress, {
        submittedByAddress: adminWallet.getAddress(),
      });
      claimedIds = result.ids.map((id) => parseInt(String(id), 10)).filter((n) => !Number.isNaN(n));
      debugClaims = result.debug;
    } else {
      // If we can't verify claimed milestones (Anchor read failure), do NOT show anything as claimable.
      // Otherwise we risk offering a "Claim" button for already-claimed milestones after a restart.
      if (!claimedIdsResult || !claimedIdsResult.success) {
        claimsVerified = false;
        claimsError = claimedIdsResult?.error || 'Failed to load claimed milestone IDs';
      } else {
        claimedIds = claimedIdsResult.claimedIds || [];
      }
    }

      if (!claimsVerified) {
        return {
          success: true,
          stats: statsResult.stats,
          claimedIds: [],
          eligible: [],
          eligibleCount: 0,
          claimsVerified: false,
          claimsError,
        };
      }

    const eligibleResult = await achievementService.getEligibleAchievements(playerAddress, {
      stats: statsResult.stats,
      claimedIds,
    });
    const eligible = eligibleResult.success ? eligibleResult.eligible : [];

    // Debug-only: achievements progress can be polled often during menu loads.
    if (process.env.DEBUG_ACHIEVEMENTS === 'true') {
      console.log('🔍 [PROGRESS API] Detailed milestone data for', playerAddress);
      console.log('🔍 [PROGRESS API] Claimed IDs:', claimedIds);
      console.log('🔍 [PROGRESS API] Claimed IDs count:', claimedIds.length);
      console.log('🔍 [PROGRESS API] Eligible milestones count:', eligible.length);
      console.log(
        '🔍 [PROGRESS API] Eligible milestones:',
        eligible.map((e) => ({
          category: e.category,
          milestoneId: e.milestoneId,
          threshold: e.threshold,
        }))
      );
    }

      return {
        success: true,
        stats: statsResult.stats,
        claimedIds: claimedIds, // Stable milestone IDs (source of truth)
        eligible: eligible,
        eligibleCount: eligible.length,
        claimsVerified: true,
        ...(debug ? { debug: { claims: debugClaims, claimedIds } } : {}),
      };
    };

    if (debug || refresh) {
      return await run();
    }

    const p = run()
      .then((val) => {
        progressCacheByAddress.set(cacheKey, { at: Date.now(), value: val });
        return val;
      })
      .finally(() => {
        progressInflightByAddress.delete(cacheKey);
      });
    progressInflightByAddress.set(cacheKey, p);
    return await p;
  }
);


